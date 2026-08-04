import re
import hashlib
import uuid
from datetime import datetime, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, or_, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_active_user
from app.models.user import (
    Organization,
    OrganizationEvent,
    OrganizationEventCategory,
    OrganizationEventGroup,
    OrganizationEventGroupMatch,
    OrganizationEventGroupMatchScorer,
    OrganizationEventGroupMember,
    OrganizationEventGroupStage,
    OrganizationEventMatch,
    OrganizationEventMatchScorer,
    OrganizationEventRegistration,
    OrganizationMember,
    Team,
    TeamMember,
    TournamentFormat,
    User,
)
from app.schemas.organization import (
    BracketParticipantRead,
    EventBracketRead,
    EventCategoryRead,
    EventCreate,
    EventGroupRead,
    EventGroupStageRead,
    GroupMatchRead,
    GroupParticipantRead,
    GroupStageCreate,
    GroupStandingRead,
    MatchResultPlayerRead,
    MatchResultRead,
    MatchResultScorerRead,
    MatchResultUpdate,
    EventMatchRead,
    EventMatchScoreUpdate,
    EventRead,
    EventRegistrationCreate,
    EventRegistrationRead,
    OrganizationCreate,
    OrganizationMemberAdd,
    OrganizationMemberRead,
    OrganizationRead,
    ParticipatingEventsRead,
    ParticipatingEventsVersionRead,
    TournamentFormatRead,
)
from app.services.brackets import (
    balanced_round_robin_groups,
    rank_group,
    round_robin_pairs,
    seeded_single_elimination_layout,
    select_group_qualifiers,
    single_elimination_layout,
)
from app.services.tournament_revision import bump_tournament_revision

router = APIRouter(prefix="/organizations", tags=["organizations"])

GOAL_SPORTS = {"Futbal", "Florbal"}
TEAM_SPORTS = GOAL_SPORTS | {
    "Basketbal 3x3",
    "Volejbal",
    "3x3sportgames",
}


def registration_rows(event_id: uuid.UUID, db: Session):
    return db.execute(
        select(
            OrganizationEventRegistration,
            User.nickname,
            User.display_name,
            Team.name,
        )
        .outerjoin(User, OrganizationEventRegistration.user_id == User.id)
        .outerjoin(Team, OrganizationEventRegistration.team_id == Team.id)
        .where(OrganizationEventRegistration.event_id == event_id)
        .order_by(OrganizationEventRegistration.registered_at)
    ).all()


def registration_name(row) -> str:
    return row[3] or row[2] or row[1] or "Hráč"


def organization_read(organization: Organization, db: Session) -> OrganizationRead:
    members = db.execute(
        select(User.id, User.nickname, OrganizationMember.role)
        .join(OrganizationMember, OrganizationMember.user_id == User.id)
        .where(OrganizationMember.organization_id == organization.id)
        .order_by(OrganizationMember.joined_at)
    ).all()
    events = db.scalars(
        select(OrganizationEvent)
        .where(OrganizationEvent.organization_id == organization.id)
        .order_by(OrganizationEvent.created_at.desc())
    ).all()
    return OrganizationRead(
        id=organization.id,
        name=organization.name,
        owner_user_id=organization.owner_user_id,
        members=[
            OrganizationMemberRead(
                id=row.id,
                nickname=row.nickname or "bez-nicku",
                role=row.role,
            )
            for row in members
        ],
        events=[event_read(event, db) for event in events],
    )


def event_read(event: OrganizationEvent, db: Session) -> EventRead:
    tournament_format = (
        db.get(TournamentFormat, event.format_id) if event.format_id else None
    )
    categories = db.scalars(
        select(OrganizationEventCategory)
        .where(OrganizationEventCategory.event_id == event.id)
        .order_by(OrganizationEventCategory.created_at)
    ).all()
    return EventRead(
        id=event.id,
        invite_token=event.invite_token,
        name=event.name,
        event_type=event.event_type,
        sport=event.sport,
        participation_type=event.participation_type,
        format_id=event.format_id,
        format_code=tournament_format.code if tournament_format else None,
        format_name=tournament_format.name if tournament_format else None,
        event_date=event.event_date,
        event_time=event.event_time,
        region=event.region,
        city_id=event.city_id,
        city=event.city,
        venue=event.venue,
        cover_image_url=event.cover_image_url,
        registration_open=event.registration_open,
        xp_points=event.xp_points,
        location=event.location,
        fee=event.fee,
        description=event.description,
        categories=[
            EventCategoryRead(
                id=category.id,
                age_group=category.age_group,
                team_format=category.team_format,
                gender_category=category.gender_category,
                fee=category.fee,
                capacity=category.capacity,
            )
            for category in categories
        ],
        registrations=[
            EventRegistrationRead(
                id=row[0].id,
                user_id=row[0].user_id,
                team_id=row[0].team_id,
                name=registration_name(row),
                type="TEAM" if row[0].team_id else "INDIVIDUAL",
            )
            for row in registration_rows(event.id, db)
        ],
    )


def accessible_organization(
    organization_id: uuid.UUID, user: User, db: Session
) -> Organization:
    organization = db.scalar(
        select(Organization)
        .join(OrganizationMember)
        .where(
            Organization.id == organization_id,
            OrganizationMember.user_id == user.id,
            Organization.is_active.is_(True),
        )
    )
    if not organization:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            detail={"code": "ORGANIZATION_NOT_FOUND"},
        )
    return organization


def manageable_organization(
    organization_id: uuid.UUID, user: User, db: Session
) -> Organization:
    organization = accessible_organization(organization_id, user, db)
    membership = db.get(
        OrganizationMember,
        {"organization_id": organization.id, "user_id": user.id},
    )
    if (
        organization.owner_user_id != user.id
        and (not membership or membership.role != "ADMIN")
    ):
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            detail={"code": "ORGANIZATION_MANAGER_REQUIRED"},
        )
    return organization


def manageable_event(
    organization_id: uuid.UUID,
    event_id: uuid.UUID,
    user: User,
    db: Session,
) -> tuple[Organization, OrganizationEvent]:
    organization = manageable_organization(organization_id, user, db)
    event = db.get(OrganizationEvent, event_id)
    if not event or event.organization_id != organization.id:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND, detail={"code": "EVENT_NOT_FOUND"}
        )
    return organization, event


def event_bracket_viewer(
    event_id: uuid.UUID, user: User, db: Session
) -> OrganizationEvent:
    event = db.get(OrganizationEvent, event_id)
    if not event:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND, detail={"code": "EVENT_NOT_FOUND"}
        )
    is_individual_participant = db.scalar(
        select(OrganizationEventRegistration.id).where(
            OrganizationEventRegistration.event_id == event.id,
            OrganizationEventRegistration.user_id == user.id,
        )
    )
    is_team_owner_participant = db.scalar(
        select(OrganizationEventRegistration.id)
        .join(Team, Team.id == OrganizationEventRegistration.team_id)
        .where(
            OrganizationEventRegistration.event_id == event.id,
            Team.owner_user_id == user.id,
        )
    )
    if not is_individual_participant and not is_team_owner_participant:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            detail={"code": "EVENT_PARTICIPANT_REQUIRED"},
        )
    return event


def selected_format(
    format_id: uuid.UUID | None, db: Session
) -> TournamentFormat:
    tournament_format = (
        db.get(TournamentFormat, format_id)
        if format_id
        else db.scalar(
            select(TournamentFormat).where(
                TournamentFormat.code == "SINGLE_ELIMINATION",
                TournamentFormat.is_active.is_(True),
            )
        )
    )
    if not tournament_format or not tournament_format.is_active:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "INVALID_EVENT_FORMAT"},
        )
    return tournament_format


def bracket_read(event: OrganizationEvent, db: Session) -> EventBracketRead:
    matches = db.scalars(
        select(OrganizationEventMatch)
        .where(OrganizationEventMatch.event_id == event.id)
        .order_by(
            OrganizationEventMatch.round_number,
            OrganizationEventMatch.position,
        )
    ).all()
    names = {
        row[0].id: registration_name(row)
        for row in registration_rows(event.id, db)
    }

    def participant(
        registration_id: uuid.UUID | None,
    ) -> BracketParticipantRead | None:
        if not registration_id:
            return None
        return BracketParticipantRead(
            registration_id=registration_id,
            name=names.get(registration_id, "Účastník"),
        )

    return EventBracketRead(
        event_id=event.id,
        generated=bool(matches),
        round_count=max(
            (match.round_number for match in matches), default=0
        ),
        matches=[
            EventMatchRead(
                id=match.id,
                round_number=match.round_number,
                position=match.position,
                participant_a=participant(
                    match.participant_a_registration_id
                ),
                participant_b=participant(
                    match.participant_b_registration_id
                ),
                score_a=match.score_a,
                score_b=match.score_b,
                winner_registration_id=match.winner_registration_id,
                is_bye=(
                    match.round_number == 1
                    and bool(match.participant_a_registration_id)
                    != bool(match.participant_b_registration_id)
                ),
            )
            for match in matches
        ],
    )


def group_stage_for_event(
    event_id: uuid.UUID, db: Session
) -> OrganizationEventGroupStage | None:
    return db.scalar(
        select(OrganizationEventGroupStage).where(
            OrganizationEventGroupStage.event_id == event_id
        )
    )


def require_group_format(
    event: OrganizationEvent, db: Session
) -> TournamentFormat:
    tournament_format = (
        db.get(TournamentFormat, event.format_id) if event.format_id else None
    )
    if (
        not tournament_format
        or tournament_format.code != "GROUPS_THEN_ELIMINATION"
    ):
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "GROUPS_THEN_ELIMINATION_REQUIRED"},
        )
    return tournament_format


def group_stage_read(
    event: OrganizationEvent, db: Session
) -> EventGroupStageRead:
    stage = group_stage_for_event(event.id, db)
    if not stage:
        return EventGroupStageRead(
            event_id=event.id,
            generated=False,
            locked=False,
            locked_at=None,
            group_count=0,
            advancing_count=0,
            completed_matches=0,
            total_matches=0,
            groups=[],
        )

    groups = list(
        db.scalars(
            select(OrganizationEventGroup)
            .where(OrganizationEventGroup.event_id == event.id)
            .order_by(OrganizationEventGroup.position)
        ).all()
    )
    names = {
        row[0].id: registration_name(row)
        for row in registration_rows(event.id, db)
    }
    completed_matches = 0
    total_matches = 0
    group_reads: list[EventGroupRead] = []

    def participant(registration_id: uuid.UUID) -> GroupParticipantRead:
        return GroupParticipantRead(
            registration_id=registration_id,
            name=names.get(registration_id, "Účastník"),
        )

    for group in groups:
        members = list(
            db.scalars(
                select(OrganizationEventGroupMember)
                .where(OrganizationEventGroupMember.group_id == group.id)
                .order_by(OrganizationEventGroupMember.seed_position)
            ).all()
        )
        matches = list(
            db.scalars(
                select(OrganizationEventGroupMatch)
                .where(OrganizationEventGroupMatch.group_id == group.id)
                .order_by(OrganizationEventGroupMatch.position)
            ).all()
        )
        completed = [
            (
                match.participant_a_registration_id,
                match.participant_b_registration_id,
                match.score_a,
                match.score_b,
            )
            for match in matches
            if match.score_a is not None and match.score_b is not None
        ]
        ranked = rank_group(
            [member.registration_id for member in members],
            completed,
        )
        member_by_registration = {
            member.registration_id: member for member in members
        }
        completed_matches += len(completed)
        total_matches += len(matches)
        group_reads.append(
            EventGroupRead(
                id=group.id,
                position=group.position,
                name=group.name,
                participants=[
                    participant(member.registration_id) for member in members
                ],
                standings=[
                    GroupStandingRead(
                        rank=index + 1,
                        participant=participant(standing.participant),
                        played=standing.played,
                        wins=standing.wins,
                        draws=standing.draws,
                        losses=standing.losses,
                        score_for=standing.score_for,
                        score_against=standing.score_against,
                        score_difference=standing.score_difference,
                        points=standing.points,
                        qualified=(
                            member_by_registration[
                                standing.participant
                            ].qualified_seed
                            is not None
                        ),
                        qualified_seed=member_by_registration[
                            standing.participant
                        ].qualified_seed,
                    )
                    for index, standing in enumerate(ranked)
                ],
                matches=[
                    GroupMatchRead(
                        id=match.id,
                        position=match.position,
                        participant_a=participant(
                            match.participant_a_registration_id
                        ),
                        participant_b=participant(
                            match.participant_b_registration_id
                        ),
                        score_a=match.score_a,
                        score_b=match.score_b,
                        winner_registration_id=match.winner_registration_id,
                    )
                    for match in matches
                ],
            )
        )

    return EventGroupStageRead(
        event_id=event.id,
        generated=True,
        locked=stage.locked_at is not None,
        locked_at=stage.locked_at,
        group_count=stage.group_count,
        advancing_count=stage.advancing_count,
        completed_matches=completed_matches,
        total_matches=total_matches,
        groups=group_reads,
    )


def next_match(
    match: OrganizationEventMatch, db: Session
) -> OrganizationEventMatch | None:
    return db.scalar(
        select(OrganizationEventMatch).where(
            OrganizationEventMatch.event_id == match.event_id,
            OrganizationEventMatch.round_number
            == match.round_number + 1,
            OrganizationEventMatch.position == match.position // 2,
        )
    )


def place_winner(
    match: OrganizationEventMatch, winner_id: uuid.UUID, db: Session
) -> None:
    following = next_match(match, db)
    if not following:
        return
    if match.position % 2 == 0:
        following.participant_a_registration_id = winner_id
    else:
        following.participant_b_registration_id = winner_id


def clear_descendant_results(
    match: OrganizationEventMatch, db: Session
) -> None:
    following = next_match(match, db)
    if not following:
        return
    clear_descendant_results(following, db)
    following.score_a = None
    following.score_b = None
    following.winner_registration_id = None
    following.mvp_user_id = None
    db.execute(
        delete(OrganizationEventMatchScorer).where(
            OrganizationEventMatchScorer.match_id == following.id
        )
    )
    if match.position % 2 == 0:
        following.participant_a_registration_id = None
    else:
        following.participant_b_registration_id = None


def match_players(
    registration_ids: tuple[uuid.UUID, uuid.UUID],
    db: Session,
) -> list[MatchResultPlayerRead]:
    result: list[MatchResultPlayerRead] = []
    for side, registration_id in zip(("A", "B"), registration_ids):
        registration = db.get(OrganizationEventRegistration, registration_id)
        if not registration:
            continue
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
        for row in rows:
            result.append(
                MatchResultPlayerRead(
                    id=row.id,
                    name=row.nickname or row.display_name or "Hráč",
                    registration_id=registration_id,
                    side=side,
                )
            )
    return result


def match_result_read(
    event: OrganizationEvent,
    match: OrganizationEventMatch | OrganizationEventGroupMatch,
    kind: str,
    db: Session,
) -> MatchResultRead:
    registration_ids = (
        match.participant_a_registration_id,
        match.participant_b_registration_id,
    )
    if not all(registration_ids):
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "MATCH_NOT_READY"},
        )
    names = {
        row[0].id: registration_name(row)
        for row in registration_rows(event.id, db)
    }
    players = match_players(registration_ids, db)
    player_names = {player.id: player.name for player in players}
    scorer_model = (
        OrganizationEventMatchScorer
        if kind == "BRACKET"
        else OrganizationEventGroupMatchScorer
    )
    scorers = db.scalars(
        select(scorer_model)
        .where(scorer_model.match_id == match.id)
        .order_by(scorer_model.goals.desc(), scorer_model.user_id)
    ).all()
    return MatchResultRead(
        match_id=match.id,
        kind=kind,
        sport=event.sport,
        supports_scorers=event.sport in GOAL_SPORTS,
        supports_mvp=event.sport in TEAM_SPORTS,
        participant_a=BracketParticipantRead(
            registration_id=registration_ids[0],
            name=names.get(registration_ids[0], "Účastník A"),
        ),
        participant_b=BracketParticipantRead(
            registration_id=registration_ids[1],
            name=names.get(registration_ids[1], "Účastník B"),
        ),
        score_a=match.score_a,
        score_b=match.score_b,
        pitch=match.pitch,
        scheduled_start=match.scheduled_start,
        players=players,
        scorers=[
            MatchResultScorerRead(
                user_id=scorer.user_id,
                name=player_names.get(scorer.user_id, "Hráč"),
                goals=scorer.goals,
            )
            for scorer in scorers
        ],
        mvp_user_id=match.mvp_user_id,
    )


def apply_match_result_details(
    event: OrganizationEvent,
    match: OrganizationEventMatch | OrganizationEventGroupMatch,
    kind: str,
    payload: MatchResultUpdate,
    db: Session,
) -> None:
    players = match_players(
        (
            match.participant_a_registration_id,
            match.participant_b_registration_id,
        ),
        db,
    )
    player_by_id = {player.id: player for player in players}
    scorer_ids = [scorer.user_id for scorer in payload.scorers]
    if len(set(scorer_ids)) != len(scorer_ids):
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "DUPLICATE_SCORER"},
        )
    if any(user_id not in player_by_id for user_id in scorer_ids):
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "SCORER_NOT_IN_MATCH"},
        )
    if payload.mvp_user_id and payload.mvp_user_id not in player_by_id:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "MVP_NOT_IN_MATCH"},
        )
    if event.sport not in GOAL_SPORTS and payload.scorers:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "SCORERS_NOT_SUPPORTED"},
        )
    if event.sport not in TEAM_SPORTS and payload.mvp_user_id:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "MVP_NOT_SUPPORTED"},
        )
    # Goal scorers are optional. When none are supplied, save the final score
    # without attempting to reconcile scorer totals.
    if event.sport in GOAL_SPORTS and payload.scorers:
        goal_totals = {"A": 0, "B": 0}
        for scorer in payload.scorers:
            goal_totals[player_by_id[scorer.user_id].side] += scorer.goals
        if (
            goal_totals["A"] != payload.score_a
            or goal_totals["B"] != payload.score_b
        ):
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={"code": "SCORER_TOTAL_MISMATCH"},
            )

    scorer_model = (
        OrganizationEventMatchScorer
        if kind == "BRACKET"
        else OrganizationEventGroupMatchScorer
    )
    db.execute(delete(scorer_model).where(scorer_model.match_id == match.id))
    for scorer in payload.scorers:
        db.add(
            scorer_model(
                match_id=match.id,
                user_id=scorer.user_id,
                goals=scorer.goals,
            )
        )
    match.pitch = payload.pitch.strip() if payload.pitch else None
    match.scheduled_start = payload.scheduled_start
    match.mvp_user_id = payload.mvp_user_id


def persist_event_bracket(
    event: OrganizationEvent,
    bracket_size: int,
    round_count: int,
    first_round_pairs: list[
        tuple[
            OrganizationEventRegistration,
            OrganizationEventRegistration | None,
        ]
    ],
    db: Session,
) -> None:
    matches: dict[tuple[int, int], OrganizationEventMatch] = {}
    for round_number in range(1, round_count + 1):
        match_count = bracket_size // (2**round_number)
        for position in range(match_count):
            pair = (
                first_round_pairs[position]
                if round_number == 1
                else None
            )
            match = OrganizationEventMatch(
                event_id=event.id,
                round_number=round_number,
                position=position,
                participant_a_registration_id=pair[0].id if pair else None,
                participant_b_registration_id=(
                    pair[1].id if pair and pair[1] else None
                ),
            )
            db.add(match)
            matches[(round_number, position)] = match
    db.flush()

    for position, pair in enumerate(first_round_pairs):
        if pair[1] is None:
            match = matches[(1, position)]
            match.winner_registration_id = pair[0].id
            if round_count > 1:
                following = matches[(2, position // 2)]
                if position % 2 == 0:
                    following.participant_a_registration_id = pair[0].id
                else:
                    following.participant_b_registration_id = pair[0].id


@router.get("/mine", response_model=list[OrganizationRead])
def read_my_organizations(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_active_user),
):
    organizations = db.scalars(
        select(Organization)
        .join(OrganizationMember)
        .where(
            OrganizationMember.user_id == user.id,
            Organization.is_active.is_(True),
        )
        .order_by(Organization.created_at.desc())
    ).all()
    return [
        organization_read(organization, db)
        for organization in organizations
    ]


@router.get("/events", response_model=list[EventRead])
def read_all_events(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_active_user),
):
    events = db.scalars(
        select(OrganizationEvent)
        .join(Organization)
        .where(Organization.is_active.is_(True))
        .order_by(OrganizationEvent.created_at.desc())
    ).all()
    return [event_read(event, db) for event in events]


@router.get("/events/participating", response_model=ParticipatingEventsRead)
def read_participating_events(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_active_user),
):
    """Return events joined by the user directly or through one of their teams."""
    rows = db.execute(
        select(OrganizationEvent, OrganizationEventRegistration)
        .join(
            OrganizationEventRegistration,
            OrganizationEventRegistration.event_id == OrganizationEvent.id,
        )
        .outerjoin(Team, Team.id == OrganizationEventRegistration.team_id)
        .join(Organization, Organization.id == OrganizationEvent.organization_id)
        .where(
            Organization.is_active.is_(True),
            or_(
                OrganizationEventRegistration.user_id == user.id,
                Team.owner_user_id == user.id,
            ),
        )
        .order_by(OrganizationEvent.event_date, OrganizationEvent.event_time)
    ).all()
    events = {event.id: event for event, _ in rows}
    version_source = "|".join(
        sorted(
            f"{event.id}:{event.event_date}:{event.event_time}:{event.tournament_revision}:{registration.registered_at}"
            for event, registration in rows
        )
    )
    return ParticipatingEventsRead(
        version=hashlib.sha256(version_source.encode()).hexdigest()[:16],
        events=[event_read(event, db) for event in events.values()],
    )


@router.get(
    "/events/participating/version",
    response_model=ParticipatingEventsVersionRead,
)
def read_participating_events_version(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_active_user),
):
    rows = db.execute(
        select(OrganizationEvent, OrganizationEventRegistration)
        .join(
            OrganizationEventRegistration,
            OrganizationEventRegistration.event_id == OrganizationEvent.id,
        )
        .outerjoin(Team, Team.id == OrganizationEventRegistration.team_id)
        .join(Organization, Organization.id == OrganizationEvent.organization_id)
        .where(
            Organization.is_active.is_(True),
            or_(
                OrganizationEventRegistration.user_id == user.id,
                Team.owner_user_id == user.id,
            ),
        )
    ).all()
    version_source = "|".join(
        sorted(
            f"{event.id}:{event.event_date}:{event.event_time}:{event.tournament_revision}:{registration.registered_at}"
            for event, registration in rows
        )
    )
    return ParticipatingEventsVersionRead(
        version=hashlib.sha256(version_source.encode()).hexdigest()[:16]
    )


@router.get("/event-formats", response_model=list[TournamentFormatRead])
def read_event_formats(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_active_user),
):
    return db.scalars(
        select(TournamentFormat)
        .where(TournamentFormat.is_active.is_(True))
        .order_by(TournamentFormat.name)
    ).all()


@router.get("/events/{event_id}", response_model=EventRead)
def read_event(
    event_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_active_user),
):
    event = db.get(OrganizationEvent, event_id)
    if not event:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND, detail={"code": "EVENT_NOT_FOUND"}
        )
    return event_read(event, db)


@router.get("/events/invites/{invite_token}", response_model=EventRead)
def read_event_by_invite_token(
    invite_token: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_active_user),
):
    event = db.scalar(
        select(OrganizationEvent)
        .join(Organization, Organization.id == OrganizationEvent.organization_id)
        .where(
            OrganizationEvent.invite_token == invite_token,
            Organization.is_active.is_(True),
        )
    )
    if not event:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND, detail={"code": "INVITE_NOT_FOUND"}
        )
    return event_read(event, db)


@router.get("/events/{event_id}/bracket", response_model=EventBracketRead)
def read_participant_event_bracket(
    event_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_active_user),
):
    return bracket_read(event_bracket_viewer(event_id, user, db), db)


@router.get(
    "/events/{event_id}/group-stage",
    response_model=EventGroupStageRead,
)
def read_participant_event_group_stage(
    event_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_active_user),
):
    event = event_bracket_viewer(event_id, user, db)
    require_group_format(event, db)
    return group_stage_read(event, db)


@router.post(
    "/events/{event_id}/registrations",
    response_model=EventRead,
    status_code=status.HTTP_201_CREATED,
)
def register_for_event(
    event_id: uuid.UUID,
    payload: EventRegistrationCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_active_user),
):
    event = db.get(OrganizationEvent, event_id)
    if not event:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND, detail={"code": "EVENT_NOT_FOUND"}
        )
    if db.scalar(
        select(OrganizationEventMatch.id).where(
            OrganizationEventMatch.event_id == event.id
        )
    ):
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            detail={"code": "EVENT_BRACKET_ALREADY_GENERATED"},
        )
    if group_stage_for_event(event.id, db):
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            detail={"code": "EVENT_GROUP_STAGE_ALREADY_GENERATED"},
        )
    if event.participation_type == "TEAM":
        if not payload.team_id:
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={"code": "TEAM_REQUIRED"},
            )
        team = db.get(Team, payload.team_id)
        if (
            not team
            or team.owner_user_id != user.id
            or not team.is_active
        ):
            raise HTTPException(
                status.HTTP_403_FORBIDDEN,
                detail={"code": "TEAM_OWNER_REQUIRED"},
            )
        if db.scalar(
            select(OrganizationEventRegistration).where(
                OrganizationEventRegistration.event_id == event.id,
                OrganizationEventRegistration.team_id == team.id,
            )
        ):
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                detail={"code": "TEAM_ALREADY_REGISTERED"},
            )
        db.add(
            OrganizationEventRegistration(event_id=event.id, team_id=team.id)
        )
    else:
        if db.scalar(
            select(OrganizationEventRegistration).where(
                OrganizationEventRegistration.event_id == event.id,
                OrganizationEventRegistration.user_id == user.id,
            )
        ):
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                detail={"code": "USER_ALREADY_REGISTERED"},
            )
        db.add(
            OrganizationEventRegistration(event_id=event.id, user_id=user.id)
        )
    bump_tournament_revision(event)
    db.commit()
    return event_read(event, db)


@router.post(
    "", response_model=OrganizationRead, status_code=status.HTTP_201_CREATED
)
def create_organization(
    payload: OrganizationCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_active_user),
):
    name = payload.name.strip()
    if not name:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "INVALID_ORGANIZATION_NAME"},
        )
    slug = (
        f"{re.sub(r'[^a-z0-9]', '-', name.lower()).strip('-')[:30] or 'organizacia'}"
        f"-{uuid.uuid4().hex[:8]}"
    )
    organization = Organization(
        name=name, slug=slug, owner_user_id=user.id
    )
    db.add(organization)
    db.flush()
    db.add(
        OrganizationMember(
            organization_id=organization.id,
            user_id=user.id,
            role="ADMIN",
        )
    )
    db.commit()
    db.refresh(organization)
    return organization_read(organization, db)


@router.post("/{organization_id}/members", response_model=OrganizationRead)
def add_member(
    organization_id: uuid.UUID,
    payload: OrganizationMemberAdd,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_active_user),
):
    organization = accessible_organization(organization_id, user, db)
    if organization.owner_user_id != user.id:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            detail={"code": "ORGANIZATION_OWNER_REQUIRED"},
        )
    player = db.scalar(
        select(User).where(User.nickname == payload.nickname.strip().lower())
    )
    if not player:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            detail={"code": "NICKNAME_NOT_FOUND"},
        )
    if db.get(
        OrganizationMember,
        {"organization_id": organization.id, "user_id": player.id},
    ):
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            detail={"code": "PLAYER_ALREADY_IN_ORGANIZATION"},
        )
    db.add(
        OrganizationMember(
            organization_id=organization.id, user_id=player.id
        )
    )
    db.commit()
    return organization_read(organization, db)


@router.delete(
    "/{organization_id}/members/{member_id}",
    response_model=OrganizationRead,
)
def remove_member(
    organization_id: uuid.UUID,
    member_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_active_user),
):
    organization = accessible_organization(organization_id, user, db)
    if organization.owner_user_id != user.id:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            detail={"code": "ORGANIZATION_OWNER_REQUIRED"},
        )
    member = db.get(
        OrganizationMember,
        {"organization_id": organization.id, "user_id": member_id},
    )
    if not member:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND, detail={"code": "MEMBER_NOT_FOUND"}
        )
    if member.user_id == organization.owner_user_id:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            detail={"code": "ORGANIZATION_OWNER_CANNOT_BE_REMOVED"},
        )
    db.delete(member)
    db.commit()
    return organization_read(organization, db)


@router.post("/{organization_id}/events", response_model=OrganizationRead)
def create_event(
    organization_id: uuid.UUID,
    payload: EventCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_active_user),
):
    organization = manageable_organization(organization_id, user, db)
    name, sport = payload.name.strip(), payload.sport.strip()
    if not name:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "INVALID_EVENT_NAME"},
        )
    if not sport:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "INVALID_EVENT_SPORT"},
        )
    tournament_format = selected_format(payload.format_id, db)
    event = OrganizationEvent(
        organization_id=organization.id,
        created_by_user_id=user.id,
        name=name,
        event_type=payload.event_type,
        sport=sport,
        participation_type=payload.participation_type,
        format_id=tournament_format.id,
        event_date=payload.event_date,
        event_time=payload.event_time,
        region=payload.region.strip(),
        city_id=payload.city_id,
        city=(payload.city or "").strip() or None,
        venue=(payload.venue or "").strip() or None,
        cover_image_url=(payload.cover_image_url or "").strip() or None,
        registration_open=True,
        xp_points=None,
        # Keep the legacy summary fields populated for existing discovery UI.
        location=(payload.venue or payload.city or "").strip() or None,
        fee=min((category.fee for category in payload.categories), default=Decimal("0")),
        description=(payload.description or "").strip() or None,
    )
    db.add(event)
    db.flush()
    db.add_all(
        [
            OrganizationEventCategory(
                event_id=event.id,
                age_group=category.age_group,
                team_format=category.team_format,
                gender_category=category.gender_category,
                fee=category.fee,
                capacity=category.capacity,
            )
            for category in payload.categories
        ]
    )
    bump_tournament_revision(event)
    db.commit()
    return organization_read(organization, db)


@router.put(
    "/{organization_id}/events/{event_id}",
    response_model=OrganizationRead,
)
def update_event(
    organization_id: uuid.UUID,
    event_id: uuid.UUID,
    payload: EventCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_active_user),
):
    organization, event = manageable_event(
        organization_id, event_id, user, db
    )
    name, sport = payload.name.strip(), payload.sport.strip()
    if not name or not sport:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "INVALID_EVENT_DATA"},
        )
    tournament_format = selected_format(payload.format_id, db)
    draw_generated = bool(
        db.scalar(
            select(OrganizationEventMatch.id).where(
                OrganizationEventMatch.event_id == event.id
            )
        )
        or group_stage_for_event(event.id, db)
    )
    if draw_generated and event.format_id != tournament_format.id:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            detail={"code": "EVENT_FORMAT_LOCKED"},
        )
    if (
        draw_generated
        and event.participation_type != payload.participation_type
    ):
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            detail={"code": "EVENT_PARTICIPATION_TYPE_LOCKED"},
        )
    event.name = name
    event.event_type = payload.event_type
    event.sport = sport
    event.participation_type = payload.participation_type
    event.format_id = tournament_format.id
    event.event_date = payload.event_date
    event.event_time = payload.event_time
    event.region = payload.region.strip()
    event.city_id = payload.city_id
    event.city = (payload.city or "").strip() or None
    event.venue = (payload.venue or "").strip() or None
    event.cover_image_url = (
        (payload.cover_image_url or "").strip() or None
    )
    event.location = (
        payload.venue or payload.city or ""
    ).strip() or None
    event.fee = min((category.fee for category in payload.categories), default=Decimal("0"))
    event.description = (payload.description or "").strip() or None
    db.execute(
        delete(OrganizationEventCategory).where(
            OrganizationEventCategory.event_id == event.id
        )
    )
    db.add_all(
        [
            OrganizationEventCategory(
                event_id=event.id,
                age_group=category.age_group,
                team_format=category.team_format,
                gender_category=category.gender_category,
                fee=category.fee,
                capacity=category.capacity,
            )
            for category in payload.categories
        ]
    )
    bump_tournament_revision(event)
    db.commit()
    return organization_read(organization, db)


@router.get(
    "/{organization_id}/events/{event_id}/bracket",
    response_model=EventBracketRead,
)
def read_event_bracket(
    organization_id: uuid.UUID,
    event_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_active_user),
):
    _, event = manageable_event(organization_id, event_id, user, db)
    return bracket_read(event, db)


@router.get(
    "/{organization_id}/events/{event_id}/group-stage",
    response_model=EventGroupStageRead,
)
def read_event_group_stage(
    organization_id: uuid.UUID,
    event_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_active_user),
):
    _, event = manageable_event(organization_id, event_id, user, db)
    require_group_format(event, db)
    return group_stage_read(event, db)


@router.post(
    "/{organization_id}/events/{event_id}/group-stage/generate",
    response_model=EventGroupStageRead,
    status_code=status.HTTP_201_CREATED,
)
def generate_event_group_stage(
    organization_id: uuid.UUID,
    event_id: uuid.UUID,
    payload: GroupStageCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_active_user),
):
    _, event = manageable_event(organization_id, event_id, user, db)
    require_group_format(event, db)
    if group_stage_for_event(event.id, db):
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            detail={"code": "GROUP_STAGE_ALREADY_GENERATED"},
        )
    if db.scalar(
        select(OrganizationEventMatch.id).where(
            OrganizationEventMatch.event_id == event.id
        )
    ):
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            detail={"code": "BRACKET_ALREADY_GENERATED"},
        )

    registrations = list(
        db.scalars(
            select(OrganizationEventRegistration)
            .where(OrganizationEventRegistration.event_id == event.id)
            .order_by(
                OrganizationEventRegistration.registered_at,
                OrganizationEventRegistration.id,
            )
        ).all()
    )
    if payload.advancing_count > len(registrations):
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "TOO_MANY_ADVANCING_PARTICIPANTS"},
        )
    if len(registrations) % payload.group_count:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "UNEQUAL_GROUP_SIZES"},
        )
    if len(registrations) // payload.group_count < 2:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "NOT_ENOUGH_PARTICIPANTS_PER_GROUP"},
        )

    grouped_registrations = balanced_round_robin_groups(
        registrations, payload.group_count, event.id.int
    )
    stage = OrganizationEventGroupStage(
        event_id=event.id,
        group_count=payload.group_count,
        advancing_count=payload.advancing_count,
    )
    db.add(stage)
    db.flush()

    for group_position, grouped in enumerate(grouped_registrations):
        suffix = (
            chr(ord("A") + group_position)
            if group_position < 26
            else str(group_position + 1)
        )
        group = OrganizationEventGroup(
            event_id=event.id,
            position=group_position,
            name=f"Skupina {suffix}",
        )
        db.add(group)
        db.flush()
        for seed_position, registration in enumerate(grouped):
            db.add(
                OrganizationEventGroupMember(
                    group_id=group.id,
                    registration_id=registration.id,
                    seed_position=seed_position,
                )
            )
        for match_position, pair in enumerate(round_robin_pairs(grouped)):
            db.add(
                OrganizationEventGroupMatch(
                    group_id=group.id,
                    position=match_position,
                    participant_a_registration_id=pair[0].id,
                    participant_b_registration_id=pair[1].id,
                )
            )

    bump_tournament_revision(event)
    db.commit()
    return group_stage_read(event, db)


@router.put(
    "/{organization_id}/events/{event_id}/group-stage/matches/{match_id}",
    response_model=EventGroupStageRead,
)
def update_event_group_match_score(
    organization_id: uuid.UUID,
    event_id: uuid.UUID,
    match_id: uuid.UUID,
    payload: EventMatchScoreUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_active_user),
):
    _, event = manageable_event(organization_id, event_id, user, db)
    require_group_format(event, db)
    stage = group_stage_for_event(event.id, db)
    match = db.get(OrganizationEventGroupMatch, match_id)
    group = db.get(OrganizationEventGroup, match.group_id) if match else None
    if not stage or not match or not group or group.event_id != event.id:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            detail={"code": "GROUP_MATCH_NOT_FOUND"},
        )
    if stage.locked_at is not None:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            detail={"code": "GROUP_STAGE_LOCKED"},
        )

    match.score_a = payload.score_a
    match.score_b = payload.score_b
    match.winner_registration_id = (
        match.participant_a_registration_id
        if payload.score_a > payload.score_b
        else (
            match.participant_b_registration_id
            if payload.score_b > payload.score_a
            else None
        )
    )
    bump_tournament_revision(event)
    db.commit()
    return group_stage_read(event, db)


@router.get(
    "/{organization_id}/events/{event_id}/group-stage/matches/{match_id}/result",
    response_model=MatchResultRead,
)
def get_event_group_match_result(
    organization_id: uuid.UUID,
    event_id: uuid.UUID,
    match_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_active_user),
):
    _, event = manageable_event(organization_id, event_id, user, db)
    match = db.get(OrganizationEventGroupMatch, match_id)
    group = db.get(OrganizationEventGroup, match.group_id) if match else None
    if not match or not group or group.event_id != event.id:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            detail={"code": "GROUP_MATCH_NOT_FOUND"},
        )
    return match_result_read(event, match, "GROUP", db)


@router.put(
    "/{organization_id}/events/{event_id}/group-stage/matches/{match_id}/result",
    response_model=MatchResultRead,
)
def update_event_group_match_result(
    organization_id: uuid.UUID,
    event_id: uuid.UUID,
    match_id: uuid.UUID,
    payload: MatchResultUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_active_user),
):
    _, event = manageable_event(organization_id, event_id, user, db)
    match = db.get(OrganizationEventGroupMatch, match_id)
    group = db.get(OrganizationEventGroup, match.group_id) if match else None
    if not match or not group or group.event_id != event.id:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            detail={"code": "GROUP_MATCH_NOT_FOUND"},
        )
    apply_match_result_details(event, match, "GROUP", payload, db)
    update_event_group_match_score(
        organization_id, event_id, match_id, payload, db, user
    )
    return match_result_read(event, match, "GROUP", db)


@router.post(
    "/{organization_id}/events/{event_id}/group-stage/finalize",
    response_model=EventGroupStageRead,
)
def finalize_event_group_stage(
    organization_id: uuid.UUID,
    event_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_active_user),
):
    _, event = manageable_event(organization_id, event_id, user, db)
    require_group_format(event, db)
    stage = group_stage_for_event(event.id, db)
    if not stage:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            detail={"code": "GROUP_STAGE_NOT_GENERATED"},
        )
    if stage.locked_at is not None:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            detail={"code": "GROUP_STAGE_LOCKED"},
        )
    if db.scalar(
        select(OrganizationEventMatch.id).where(
            OrganizationEventMatch.event_id == event.id
        )
    ):
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            detail={"code": "BRACKET_ALREADY_GENERATED"},
        )

    groups = list(
        db.scalars(
            select(OrganizationEventGroup)
            .where(OrganizationEventGroup.event_id == event.id)
            .order_by(OrganizationEventGroup.position)
        ).all()
    )
    ranked_groups = []
    all_members: list[OrganizationEventGroupMember] = []
    for group in groups:
        members = list(
            db.scalars(
                select(OrganizationEventGroupMember)
                .where(OrganizationEventGroupMember.group_id == group.id)
                .order_by(OrganizationEventGroupMember.seed_position)
            ).all()
        )
        matches = list(
            db.scalars(
                select(OrganizationEventGroupMatch)
                .where(OrganizationEventGroupMatch.group_id == group.id)
                .order_by(OrganizationEventGroupMatch.position)
            ).all()
        )
        if any(
            match.score_a is None or match.score_b is None
            for match in matches
        ):
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                detail={"code": "GROUP_RESULTS_INCOMPLETE"},
            )
        all_members.extend(members)
        ranked_groups.append(
            rank_group(
                [member.registration_id for member in members],
                [
                    (
                        match.participant_a_registration_id,
                        match.participant_b_registration_id,
                        match.score_a,
                        match.score_b,
                    )
                    for match in matches
                ],
            )
        )

    qualifiers = select_group_qualifiers(
        ranked_groups, stage.advancing_count
    )
    qualifier_ids = [
        qualifier.participant for qualifier in qualifiers
    ]
    qualification_seed = {
        registration_id: index + 1
        for index, registration_id in enumerate(qualifier_ids)
    }
    for member in all_members:
        member.qualified_seed = qualification_seed.get(member.registration_id)

    registrations = {
        registration.id: registration
        for registration in db.scalars(
            select(OrganizationEventRegistration).where(
                OrganizationEventRegistration.event_id == event.id
            )
        ).all()
    }
    seeded_registrations = [
        registrations[registration_id] for registration_id in qualifier_ids
    ]
    bracket_size, round_count, first_round_pairs = (
        seeded_single_elimination_layout(seeded_registrations)
    )
    persist_event_bracket(
        event,
        bracket_size,
        round_count,
        first_round_pairs,
        db,
    )
    stage.locked_at = datetime.now(timezone.utc)
    bump_tournament_revision(event)
    db.commit()
    return group_stage_read(event, db)


@router.post(
    "/{organization_id}/events/{event_id}/bracket/generate",
    response_model=EventBracketRead,
    status_code=status.HTTP_201_CREATED,
)
def generate_event_bracket(
    organization_id: uuid.UUID,
    event_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_active_user),
):
    _, event = manageable_event(organization_id, event_id, user, db)
    tournament_format = (
        db.get(TournamentFormat, event.format_id)
        if event.format_id
        else None
    )
    if (
        not tournament_format
        or tournament_format.code != "SINGLE_ELIMINATION"
    ):
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "SINGLE_ELIMINATION_REQUIRED"},
        )
    if db.scalar(
        select(OrganizationEventMatch.id).where(
            OrganizationEventMatch.event_id == event.id
        )
    ):
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            detail={"code": "BRACKET_ALREADY_GENERATED"},
        )

    registrations = list(
        db.scalars(
            select(OrganizationEventRegistration)
            .where(OrganizationEventRegistration.event_id == event.id)
            .order_by(
                OrganizationEventRegistration.registered_at,
                OrganizationEventRegistration.id,
            )
        ).all()
    )
    if len(registrations) < 2:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "NOT_ENOUGH_PARTICIPANTS"},
        )

    bracket_size, round_count, first_round_pairs = (
        single_elimination_layout(registrations, event.id.int)
    )
    persist_event_bracket(
        event,
        bracket_size,
        round_count,
        first_round_pairs,
        db,
    )
    bump_tournament_revision(event)
    db.commit()
    return bracket_read(event, db)


@router.put(
    "/{organization_id}/events/{event_id}/bracket/matches/{match_id}",
    response_model=EventBracketRead,
)
def update_event_match_score(
    organization_id: uuid.UUID,
    event_id: uuid.UUID,
    match_id: uuid.UUID,
    payload: EventMatchScoreUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_active_user),
):
    _, event = manageable_event(organization_id, event_id, user, db)
    match = db.get(OrganizationEventMatch, match_id)
    if not match or match.event_id != event.id:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND, detail={"code": "MATCH_NOT_FOUND"}
        )
    if (
        not match.participant_a_registration_id
        or not match.participant_b_registration_id
    ):
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "MATCH_NOT_READY"},
        )
    if payload.score_a == payload.score_b:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "DRAW_NOT_ALLOWED"},
        )

    clear_descendant_results(match, db)
    match.score_a = payload.score_a
    match.score_b = payload.score_b
    match.winner_registration_id = (
        match.participant_a_registration_id
        if payload.score_a > payload.score_b
        else match.participant_b_registration_id
    )
    place_winner(match, match.winner_registration_id, db)
    bump_tournament_revision(event)
    db.commit()
    return bracket_read(event, db)


@router.get(
    "/{organization_id}/events/{event_id}/bracket/matches/{match_id}/result",
    response_model=MatchResultRead,
)
def get_event_match_result(
    organization_id: uuid.UUID,
    event_id: uuid.UUID,
    match_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_active_user),
):
    _, event = manageable_event(organization_id, event_id, user, db)
    match = db.get(OrganizationEventMatch, match_id)
    if not match or match.event_id != event.id:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND, detail={"code": "MATCH_NOT_FOUND"}
        )
    return match_result_read(event, match, "BRACKET", db)


@router.put(
    "/{organization_id}/events/{event_id}/bracket/matches/{match_id}/result",
    response_model=MatchResultRead,
)
def update_event_match_result(
    organization_id: uuid.UUID,
    event_id: uuid.UUID,
    match_id: uuid.UUID,
    payload: MatchResultUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_active_user),
):
    _, event = manageable_event(organization_id, event_id, user, db)
    match = db.get(OrganizationEventMatch, match_id)
    if not match or match.event_id != event.id:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND, detail={"code": "MATCH_NOT_FOUND"}
        )
    if (
        not match.participant_a_registration_id
        or not match.participant_b_registration_id
    ):
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "MATCH_NOT_READY"},
        )
    apply_match_result_details(event, match, "BRACKET", payload, db)
    update_event_match_score(
        organization_id, event_id, match_id, payload, db, user
    )
    return match_result_read(event, match, "BRACKET", db)


@router.delete(
    "/{organization_id}/events/{event_id}",
    response_model=OrganizationRead,
)
def delete_event(
    organization_id: uuid.UUID,
    event_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_active_user),
):
    organization, event = manageable_event(
        organization_id, event_id, user, db
    )
    db.delete(event)
    db.commit()
    return organization_read(organization, db)
