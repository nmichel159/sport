import re
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_active_user
from app.models.user import (
    Organization,
    OrganizationEvent,
    OrganizationEventMatch,
    OrganizationEventRegistration,
    OrganizationMember,
    Team,
    TournamentFormat,
    User,
)
from app.schemas.organization import (
    BracketParticipantRead,
    EventBracketRead,
    EventCreate,
    EventMatchRead,
    EventMatchScoreUpdate,
    EventRead,
    EventRegistrationCreate,
    EventRegistrationRead,
    OrganizationCreate,
    OrganizationMemberAdd,
    OrganizationMemberRead,
    OrganizationRead,
    TournamentFormatRead,
)
from app.services.brackets import single_elimination_layout

router = APIRouter(prefix="/organizations", tags=["organizations"])


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
    return EventRead(
        id=event.id,
        name=event.name,
        sport=event.sport,
        participation_type=event.participation_type,
        format_id=event.format_id,
        format_code=tournament_format.code if tournament_format else None,
        format_name=tournament_format.name if tournament_format else None,
        event_date=event.event_date,
        location=event.location,
        fee=event.fee,
        description=event.description,
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


def manageable_event(
    organization_id: uuid.UUID,
    event_id: uuid.UUID,
    user: User,
    db: Session,
) -> tuple[Organization, OrganizationEvent]:
    organization = accessible_organization(organization_id, user, db)
    event = db.get(OrganizationEvent, event_id)
    if not event or event.organization_id != organization.id:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND, detail={"code": "EVENT_NOT_FOUND"}
        )
    if (
        event.created_by_user_id != user.id
        and organization.owner_user_id != user.id
    ):
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            detail={"code": "EVENT_MANAGER_REQUIRED"},
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
    if match.position % 2 == 0:
        following.participant_a_registration_id = None
    else:
        following.participant_b_registration_id = None


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


@router.get("/events/{event_id}/bracket", response_model=EventBracketRead)
def read_participant_event_bracket(
    event_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_active_user),
):
    return bracket_read(event_bracket_viewer(event_id, user, db), db)


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
    organization = accessible_organization(organization_id, user, db)
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
    db.add(
        OrganizationEvent(
            organization_id=organization.id,
            created_by_user_id=user.id,
            name=name,
            sport=sport,
            participation_type=payload.participation_type,
            format_id=tournament_format.id,
            event_date=payload.event_date,
            location=(payload.location or "").strip() or None,
            fee=payload.fee,
            description=(payload.description or "").strip() or None,
        )
    )
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
    if (
        event.format_id != tournament_format.id
        and db.scalar(
            select(OrganizationEventMatch.id).where(
                OrganizationEventMatch.event_id == event.id
            )
        )
    ):
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            detail={"code": "EVENT_FORMAT_LOCKED"},
        )
    event.name = name
    event.sport = sport
    event.participation_type = payload.participation_type
    event.format_id = tournament_format.id
    event.event_date = payload.event_date
    event.location = (payload.location or "").strip() or None
    event.fee = payload.fee
    event.description = (payload.description or "").strip() or None
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
    db.commit()
    return bracket_read(event, db)


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
