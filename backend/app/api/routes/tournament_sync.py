"""Atomic synchronization of tournament state calculated by a client device."""

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.api.routes.organizations import (
    bracket_read,
    event_read,
    group_stage_read,
    manageable_event,
    match_players,
    match_result_read,
    registration_name,
    registration_rows,
)
from app.core.database import get_db
from app.core.security import get_current_active_user
from app.models.user import (
    OrganizationEvent,
    OrganizationEventGroup,
    OrganizationEventGroupMatch,
    OrganizationEventGroupMatchScorer,
    OrganizationEventGroupMember,
    OrganizationEventGroupStage,
    OrganizationEventMatch,
    OrganizationEventMatchScorer,
    OrganizationEventRegistration,
    TeamMember,
    TournamentFormat,
    User,
)
from app.schemas.organization import (
    MatchResultUpdate,
    TournamentPlayerRead,
    TournamentRegistrationRead,
    TournamentRevisionRead,
    TournamentStateRead,
    TournamentStateUpdate,
)
from app.services.tournament_revision import bump_tournament_revision


router = APIRouter(prefix="/organizations", tags=["tournament-sync"])


def _revision(event: OrganizationEvent) -> TournamentRevisionRead:
    return TournamentRevisionRead(
        event_id=event.id,
        revision=event.tournament_revision or 0,
        updated_at=event.tournament_updated_at
        or event.created_at
        or datetime.now(timezone.utc),
    )


def _registration_players(
    registration: OrganizationEventRegistration,
    db: Session,
) -> list[TournamentPlayerRead]:
    if registration.team_id:
        rows = db.execute(
            select(User.id, User.nickname, User.display_name)
            .join(TeamMember, TeamMember.user_id == User.id)
            .where(TeamMember.team_id == registration.team_id)
            .order_by(User.nickname, User.display_name, User.id)
        ).all()
    elif registration.user_id:
        rows = db.execute(
            select(User.id, User.nickname, User.display_name).where(
                User.id == registration.user_id
            )
        ).all()
    else:
        rows = []
    return [
        TournamentPlayerRead(
            id=row.id,
            name=row.nickname or row.display_name or "HrÃ¡Ä",
        )
        for row in rows
    ]


def tournament_state_read(
    event: OrganizationEvent,
    db: Session,
) -> TournamentStateRead:
    rows = registration_rows(event.id, db)
    registrations = [
        TournamentRegistrationRead(
            id=row[0].id,
            user_id=row[0].user_id,
            team_id=row[0].team_id,
            name=registration_name(row),
            type="TEAM" if row[0].team_id else "INDIVIDUAL",
            players=_registration_players(row[0], db),
        )
        for row in rows
    ]
    bracket = bracket_read(event, db)
    group_stage = group_stage_read(event, db)
    details = []
    bracket_matches = db.scalars(
        select(OrganizationEventMatch).where(
            OrganizationEventMatch.event_id == event.id,
            OrganizationEventMatch.participant_a_registration_id.is_not(None),
            OrganizationEventMatch.participant_b_registration_id.is_not(None),
            OrganizationEventMatch.score_a.is_not(None),
            OrganizationEventMatch.score_b.is_not(None),
        )
    ).all()
    for match in bracket_matches:
        details.append(match_result_read(event, match, "BRACKET", db))
    group_matches = db.scalars(
        select(OrganizationEventGroupMatch)
        .join(
            OrganizationEventGroup,
            OrganizationEventGroup.id == OrganizationEventGroupMatch.group_id,
        )
        .where(
            OrganizationEventGroup.event_id == event.id,
            OrganizationEventGroupMatch.score_a.is_not(None),
            OrganizationEventGroupMatch.score_b.is_not(None),
        )
    ).all()
    for match in group_matches:
        details.append(match_result_read(event, match, "GROUP", db))
    revision = _revision(event)
    return TournamentStateRead(
        **revision.model_dump(),
        event=event_read(event, db),
        registrations=registrations,
        bracket=bracket,
        group_stage=group_stage,
        match_details=details,
    )


def _invalid(code: str) -> None:
    raise HTTPException(
        status.HTTP_422_UNPROCESSABLE_ENTITY,
        detail={"code": code},
    )


def _validate_score(
    participant_a: uuid.UUID | None,
    participant_b: uuid.UUID | None,
    score_a: int | None,
    score_b: int | None,
    winner: uuid.UUID | None,
    allow_draw: bool,
) -> None:
    if (score_a is None) != (score_b is None):
        _invalid("INCOMPLETE_MATCH_SCORE")
    participants = {item for item in (participant_a, participant_b) if item}
    if winner and winner not in participants:
        _invalid("INVALID_MATCH_WINNER")
    if score_a is None:
        if winner and len(participants) != 1:
            _invalid("WINNER_WITHOUT_SCORE")
        return
    if not participant_a or not participant_b:
        _invalid("SCORE_FOR_INCOMPLETE_MATCH")
    expected = (
        participant_a
        if score_a > score_b
        else participant_b if score_b > score_a else None
    )
    if not allow_draw and expected is None:
        _invalid("DRAW_NOT_ALLOWED")
    if winner != expected:
        _invalid("INVALID_MATCH_WINNER")


def _validate_state(
    event: OrganizationEvent,
    payload: TournamentStateUpdate,
    db: Session,
) -> set[uuid.UUID]:
    if payload.bracket.event_id != event.id or payload.group_stage.event_id != event.id:
        _invalid("TOURNAMENT_EVENT_MISMATCH")
    registrations = set(
        db.scalars(
            select(OrganizationEventRegistration.id).where(
                OrganizationEventRegistration.event_id == event.id
            )
        ).all()
    )
    match_ids: set[uuid.UUID] = set()
    completed_match_ids: set[uuid.UUID] = set()
    bracket_positions: set[tuple[int, int]] = set()
    for match in payload.bracket.matches:
        if match.id in match_ids or (match.round_number, match.position) in bracket_positions:
            _invalid("DUPLICATE_MATCH")
        match_ids.add(match.id)
        bracket_positions.add((match.round_number, match.position))
        side_a = (
            match.participant_a.registration_id if match.participant_a else None
        )
        side_b = (
            match.participant_b.registration_id if match.participant_b else None
        )
        if any(
            item not in registrations
            for item in (side_a, side_b)
            if item is not None
        ):
            _invalid("UNKNOWN_REGISTRATION")
        _validate_score(
            side_a,
            side_b,
            match.score_a,
            match.score_b,
            match.winner_registration_id,
            allow_draw=False,
        )
        if match.score_a is not None:
            completed_match_ids.add(match.id)
    if payload.bracket.generated != bool(payload.bracket.matches):
        _invalid("INVALID_BRACKET_STATE")

    grouped_registrations: list[uuid.UUID] = []
    group_positions: set[int] = set()
    for group in payload.group_stage.groups:
        if group.position in group_positions:
            _invalid("DUPLICATE_GROUP")
        group_positions.add(group.position)
        participant_ids = [item.registration_id for item in group.participants]
        if len(set(participant_ids)) != len(participant_ids):
            _invalid("DUPLICATE_GROUP_PARTICIPANT")
        grouped_registrations.extend(participant_ids)
        expected_pairs = {
            frozenset((participant_ids[first], participant_ids[second]))
            for first in range(len(participant_ids))
            for second in range(first + 1, len(participant_ids))
        }
        actual_pairs: set[frozenset[uuid.UUID]] = set()
        positions: set[int] = set()
        for match in group.matches:
            if match.id in match_ids or match.position in positions:
                _invalid("DUPLICATE_MATCH")
            match_ids.add(match.id)
            positions.add(match.position)
            side_a = match.participant_a.registration_id
            side_b = match.participant_b.registration_id
            if side_a not in participant_ids or side_b not in participant_ids:
                _invalid("GROUP_MATCH_PARTICIPANT_MISMATCH")
            actual_pairs.add(frozenset((side_a, side_b)))
            _validate_score(
                side_a,
                side_b,
                match.score_a,
                match.score_b,
                match.winner_registration_id,
                allow_draw=True,
            )
            if match.score_a is not None:
                completed_match_ids.add(match.id)
        if expected_pairs != actual_pairs:
            _invalid("INVALID_ROUND_ROBIN_MATCHES")
    if payload.group_stage.generated:
        if set(grouped_registrations) != registrations or len(grouped_registrations) != len(registrations):
            _invalid("INVALID_GROUP_PARTITION")
        if payload.group_stage.group_count != len(payload.group_stage.groups):
            _invalid("INVALID_GROUP_COUNT")
        if payload.group_stage.advancing_count > len(registrations):
            _invalid("TOO_MANY_ADVANCING_PARTICIPANTS")
    elif payload.group_stage.groups:
        _invalid("INVALID_GROUP_STATE")
    detail_ids = [detail.match_id for detail in payload.match_details]
    if (
        len(set(detail_ids)) != len(detail_ids)
        or set(detail_ids) != completed_match_ids
    ):
        _invalid("INVALID_MATCH_DETAILS")
    return registrations


def _clear_tournament_state(event_id: uuid.UUID, db: Session) -> None:
    group_ids = select(OrganizationEventGroup.id).where(
        OrganizationEventGroup.event_id == event_id
    )
    group_match_ids = select(OrganizationEventGroupMatch.id).where(
        OrganizationEventGroupMatch.group_id.in_(group_ids)
    )
    bracket_match_ids = select(OrganizationEventMatch.id).where(
        OrganizationEventMatch.event_id == event_id
    )
    db.execute(
        delete(OrganizationEventGroupMatchScorer).where(
            OrganizationEventGroupMatchScorer.match_id.in_(group_match_ids)
        )
    )
    db.execute(
        delete(OrganizationEventMatchScorer).where(
            OrganizationEventMatchScorer.match_id.in_(bracket_match_ids)
        )
    )
    db.execute(
        delete(OrganizationEventGroupMatch).where(
            OrganizationEventGroupMatch.group_id.in_(group_ids)
        )
    )
    db.execute(
        delete(OrganizationEventGroupMember).where(
            OrganizationEventGroupMember.group_id.in_(group_ids)
        )
    )
    db.execute(
        delete(OrganizationEventGroup).where(
            OrganizationEventGroup.event_id == event_id
        )
    )
    db.execute(
        delete(OrganizationEventGroupStage).where(
            OrganizationEventGroupStage.event_id == event_id
        )
    )
    db.execute(
        delete(OrganizationEventMatch).where(
            OrganizationEventMatch.event_id == event_id
        )
    )


def _persist_state(
    event: OrganizationEvent,
    payload: TournamentStateUpdate,
    db: Session,
) -> None:
    from app.api.routes.organizations import apply_match_result_details

    _clear_tournament_state(event.id, db)
    bracket_matches: dict[uuid.UUID, OrganizationEventMatch] = {}
    group_matches: dict[uuid.UUID, OrganizationEventGroupMatch] = {}
    if payload.group_stage.generated:
        db.add(
            OrganizationEventGroupStage(
                event_id=event.id,
                group_count=payload.group_stage.group_count,
                advancing_count=payload.group_stage.advancing_count,
                locked_at=payload.group_stage.locked_at
                if payload.group_stage.locked
                else None,
            )
        )
        for group in payload.group_stage.groups:
            db.add(
                OrganizationEventGroup(
                    id=group.id,
                    event_id=event.id,
                    position=group.position,
                    name=group.name,
                )
            )
            qualified = {
                standing.participant.registration_id: standing.qualified_seed
                for standing in group.standings
            }
            for seed, participant in enumerate(group.participants):
                db.add(
                    OrganizationEventGroupMember(
                        group_id=group.id,
                        registration_id=participant.registration_id,
                        seed_position=seed,
                        qualified_seed=qualified.get(participant.registration_id),
                    )
                )
            for match in group.matches:
                stored = OrganizationEventGroupMatch(
                    id=match.id,
                    group_id=group.id,
                    position=match.position,
                    participant_a_registration_id=match.participant_a.registration_id,
                    participant_b_registration_id=match.participant_b.registration_id,
                    score_a=match.score_a,
                    score_b=match.score_b,
                    winner_registration_id=match.winner_registration_id,
                )
                db.add(stored)
                group_matches[match.id] = stored
    for match in payload.bracket.matches:
        stored = OrganizationEventMatch(
            id=match.id,
            event_id=event.id,
            round_number=match.round_number,
            position=match.position,
            participant_a_registration_id=(
                match.participant_a.registration_id if match.participant_a else None
            ),
            participant_b_registration_id=(
                match.participant_b.registration_id if match.participant_b else None
            ),
            score_a=match.score_a,
            score_b=match.score_b,
            winner_registration_id=match.winner_registration_id,
        )
        db.add(stored)
        bracket_matches[match.id] = stored
    db.flush()
    for detail in payload.match_details:
        match = bracket_matches.get(detail.match_id) or group_matches.get(detail.match_id)
        if not match or match.score_a is None or match.score_b is None:
            _invalid("DETAIL_FOR_UNFINISHED_MATCH")
        apply_match_result_details(
            event,
            match,
            "BRACKET" if detail.match_id in bracket_matches else "GROUP",
            MatchResultUpdate(
                score_a=match.score_a,
                score_b=match.score_b,
                pitch=detail.pitch,
                scheduled_start=detail.scheduled_start,
                mvp_user_id=detail.mvp_user_id,
                scorers=detail.scorers,
            ),
            db,
        )


@router.get(
    "/{organization_id}/events/{event_id}/tournament-state/revision",
    response_model=TournamentRevisionRead,
)
def read_tournament_revision(
    organization_id: uuid.UUID,
    event_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_active_user),
):
    _, event = manageable_event(organization_id, event_id, user, db)
    return _revision(event)


@router.get(
    "/{organization_id}/events/{event_id}/tournament-state",
    response_model=TournamentStateRead,
)
def read_tournament_state(
    organization_id: uuid.UUID,
    event_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_active_user),
):
    _, event = manageable_event(organization_id, event_id, user, db)
    return tournament_state_read(event, db)


@router.put(
    "/{organization_id}/events/{event_id}/tournament-state",
    response_model=TournamentStateRead,
)
def synchronize_tournament_state(
    organization_id: uuid.UUID,
    event_id: uuid.UUID,
    payload: TournamentStateUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_active_user),
):
    manageable_event(organization_id, event_id, user, db)
    event = db.scalar(
        select(OrganizationEvent)
        .where(OrganizationEvent.id == event_id)
        .with_for_update()
    )
    if not event:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail={"code": "EVENT_NOT_FOUND"})
    if event.last_tournament_mutation_id == payload.client_mutation_id:
        return tournament_state_read(event, db)
    if (event.tournament_revision or 0) != payload.base_revision:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            detail={
                "code": "TOURNAMENT_REVISION_CONFLICT",
                "revision": event.tournament_revision or 0,
            },
        )
    tournament_format = db.get(TournamentFormat, event.format_id) if event.format_id else None
    if not tournament_format:
        _invalid("INVALID_EVENT_FORMAT")
    if (
        tournament_format.code == "SINGLE_ELIMINATION"
        and payload.group_stage.generated
    ):
        _invalid("SINGLE_ELIMINATION_REQUIRED")
    if tournament_format.code == "GROUPS_THEN_ELIMINATION":
        if payload.bracket.generated and not payload.group_stage.locked:
            _invalid("GROUP_STAGE_NOT_FINALIZED")
    elif tournament_format.code != "SINGLE_ELIMINATION":
        _invalid("UNSUPPORTED_OFFLINE_TOURNAMENT_FORMAT")
    _validate_state(event, payload, db)
    _persist_state(event, payload, db)
    bump_tournament_revision(event, payload.client_mutation_id)
    db.commit()
    return tournament_state_read(event, db)
