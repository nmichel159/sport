import re
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_active_user
from app.models.user import Organization, OrganizationEvent, OrganizationEventRegistration, OrganizationMember, Team, User
from app.schemas.organization import EventCreate, EventRead, EventRegistrationCreate, EventRegistrationRead, OrganizationCreate, OrganizationMemberAdd, OrganizationMemberRead, OrganizationRead

router = APIRouter(prefix="/organizations", tags=["organizations"])


def organization_read(organization: Organization, db: Session) -> OrganizationRead:
    members = db.execute(select(User.id, User.nickname, OrganizationMember.role).join(OrganizationMember, OrganizationMember.user_id == User.id).where(OrganizationMember.organization_id == organization.id).order_by(OrganizationMember.joined_at)).all()
    events = db.scalars(select(OrganizationEvent).where(OrganizationEvent.organization_id == organization.id).order_by(OrganizationEvent.created_at.desc())).all()
    return OrganizationRead(id=organization.id, name=organization.name, owner_user_id=organization.owner_user_id, members=[OrganizationMemberRead(id=row.id, nickname=row.nickname or "bez-nicku", role=row.role) for row in members], events=[event_read(event, db) for event in events])


def event_read(event: OrganizationEvent, db: Session) -> EventRead:
    registrations = db.execute(select(OrganizationEventRegistration, User.nickname, User.display_name, Team.name).outerjoin(User, OrganizationEventRegistration.user_id == User.id).outerjoin(Team, OrganizationEventRegistration.team_id == Team.id).where(OrganizationEventRegistration.event_id == event.id).order_by(OrganizationEventRegistration.registered_at)).all()
    return EventRead(id=event.id, name=event.name, sport=event.sport, participation_type=event.participation_type, event_date=event.event_date, location=event.location, fee=event.fee, description=event.description, registrations=[EventRegistrationRead(id=row[0].id, user_id=row[0].user_id, team_id=row[0].team_id, name=row[3] or row[2] or row[1] or "Hráč", type="TEAM" if row[0].team_id else "INDIVIDUAL") for row in registrations])


def accessible_organization(organization_id: uuid.UUID, user: User, db: Session) -> Organization:
    organization = db.scalar(select(Organization).join(OrganizationMember).where(Organization.id == organization_id, OrganizationMember.user_id == user.id, Organization.is_active.is_(True)))
    if not organization:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail={"code": "ORGANIZATION_NOT_FOUND"})
    return organization


@router.get("/mine", response_model=list[OrganizationRead])
def read_my_organizations(db: Session = Depends(get_db), user: User = Depends(get_current_active_user)):
    organizations = db.scalars(select(Organization).join(OrganizationMember).where(OrganizationMember.user_id == user.id, Organization.is_active.is_(True)).order_by(Organization.created_at.desc())).all()
    return [organization_read(organization, db) for organization in organizations]


@router.get("/events", response_model=list[EventRead])
def read_all_events(db: Session = Depends(get_db), user: User = Depends(get_current_active_user)):
    events = db.scalars(select(OrganizationEvent).join(Organization).where(Organization.is_active.is_(True)).order_by(OrganizationEvent.created_at.desc())).all()
    return [event_read(event, db) for event in events]


@router.get("/events/{event_id}", response_model=EventRead)
def read_event(event_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(get_current_active_user)):
    event = db.get(OrganizationEvent, event_id)
    if not event:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail={"code": "EVENT_NOT_FOUND"})
    return event_read(event, db)


@router.post("/events/{event_id}/registrations", response_model=EventRead, status_code=status.HTTP_201_CREATED)
def register_for_event(event_id: uuid.UUID, payload: EventRegistrationCreate, db: Session = Depends(get_db), user: User = Depends(get_current_active_user)):
    event = db.get(OrganizationEvent, event_id)
    if not event:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail={"code": "EVENT_NOT_FOUND"})
    if event.participation_type == "TEAM":
        if not payload.team_id:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail={"code": "TEAM_REQUIRED"})
        team = db.get(Team, payload.team_id)
        if not team or team.owner_user_id != user.id or not team.is_active:
            raise HTTPException(status.HTTP_403_FORBIDDEN, detail={"code": "TEAM_OWNER_REQUIRED"})
        if db.scalar(select(OrganizationEventRegistration).where(OrganizationEventRegistration.event_id == event.id, OrganizationEventRegistration.team_id == team.id)):
            raise HTTPException(status.HTTP_409_CONFLICT, detail={"code": "TEAM_ALREADY_REGISTERED"})
        db.add(OrganizationEventRegistration(event_id=event.id, team_id=team.id))
    else:
        if db.scalar(select(OrganizationEventRegistration).where(OrganizationEventRegistration.event_id == event.id, OrganizationEventRegistration.user_id == user.id)):
            raise HTTPException(status.HTTP_409_CONFLICT, detail={"code": "USER_ALREADY_REGISTERED"})
        db.add(OrganizationEventRegistration(event_id=event.id, user_id=user.id))
    db.commit()
    return event_read(event, db)


@router.post("", response_model=OrganizationRead, status_code=status.HTTP_201_CREATED)
def create_organization(payload: OrganizationCreate, db: Session = Depends(get_db), user: User = Depends(get_current_active_user)):
    name = payload.name.strip()
    if not name:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail={"code": "INVALID_ORGANIZATION_NAME"})
    slug = f"{re.sub(r'[^a-z0-9]', '-', name.lower()).strip('-')[:30] or 'organizacia'}-{uuid.uuid4().hex[:8]}"
    organization = Organization(name=name, slug=slug, owner_user_id=user.id)
    db.add(organization); db.flush(); db.add(OrganizationMember(organization_id=organization.id, user_id=user.id, role="ADMIN")); db.commit(); db.refresh(organization)
    return organization_read(organization, db)


@router.post("/{organization_id}/members", response_model=OrganizationRead)
def add_member(organization_id: uuid.UUID, payload: OrganizationMemberAdd, db: Session = Depends(get_db), user: User = Depends(get_current_active_user)):
    organization = accessible_organization(organization_id, user, db)
    if organization.owner_user_id != user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail={"code": "ORGANIZATION_OWNER_REQUIRED"})
    player = db.scalar(select(User).where(User.nickname == payload.nickname.strip().lower()))
    if not player:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail={"code": "NICKNAME_NOT_FOUND"})
    if db.get(OrganizationMember, {"organization_id": organization.id, "user_id": player.id}):
        raise HTTPException(status.HTTP_409_CONFLICT, detail={"code": "PLAYER_ALREADY_IN_ORGANIZATION"})
    db.add(OrganizationMember(organization_id=organization.id, user_id=player.id)); db.commit()
    return organization_read(organization, db)


@router.delete("/{organization_id}/members/{member_id}", response_model=OrganizationRead)
def remove_member(organization_id: uuid.UUID, member_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(get_current_active_user)):
    organization = accessible_organization(organization_id, user, db)
    if organization.owner_user_id != user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail={"code": "ORGANIZATION_OWNER_REQUIRED"})
    member = db.get(OrganizationMember, {"organization_id": organization.id, "user_id": member_id})
    if not member:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail={"code": "MEMBER_NOT_FOUND"})
    db.delete(member); db.commit()
    return organization_read(organization, db)


@router.post("/{organization_id}/events", response_model=OrganizationRead)
def create_event(organization_id: uuid.UUID, payload: EventCreate, db: Session = Depends(get_db), user: User = Depends(get_current_active_user)):
    organization = accessible_organization(organization_id, user, db)
    name = payload.name.strip()
    if not name:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail={"code": "INVALID_EVENT_NAME"})
    sport = payload.sport.strip()
    if not sport:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail={"code": "INVALID_EVENT_SPORT"})
    db.add(OrganizationEvent(organization_id=organization.id, created_by_user_id=user.id, name=name, sport=sport, participation_type=payload.participation_type, event_date=payload.event_date, location=(payload.location or "").strip() or None, fee=payload.fee, description=(payload.description or "").strip() or None)); db.commit()
    return organization_read(organization, db)


@router.put("/{organization_id}/events/{event_id}", response_model=OrganizationRead)
def update_event(organization_id: uuid.UUID, event_id: uuid.UUID, payload: EventCreate, db: Session = Depends(get_db), user: User = Depends(get_current_active_user)):
    organization = accessible_organization(organization_id, user, db)
    event = db.get(OrganizationEvent, event_id)
    if not event or event.organization_id != organization.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail={"code": "EVENT_NOT_FOUND"})
    if event.created_by_user_id != user.id and organization.owner_user_id != user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail={"code": "EVENT_MANAGER_REQUIRED"})
    name, sport = payload.name.strip(), payload.sport.strip()
    if not name or not sport:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail={"code": "INVALID_EVENT_DATA"})
    event.name, event.sport, event.participation_type = name, sport, payload.participation_type
    event.event_date, event.location, event.fee = payload.event_date, (payload.location or "").strip() or None, payload.fee
    event.description = (payload.description or "").strip() or None
    db.commit()
    return organization_read(organization, db)


@router.delete("/{organization_id}/events/{event_id}", response_model=OrganizationRead)
def delete_event(organization_id: uuid.UUID, event_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(get_current_active_user)):
    organization = accessible_organization(organization_id, user, db)
    event = db.get(OrganizationEvent, event_id)
    if not event or event.organization_id != organization.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail={"code": "EVENT_NOT_FOUND"})
    if event.created_by_user_id != user.id and organization.owner_user_id != user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail={"code": "EVENT_MANAGER_REQUIRED"})
    db.delete(event); db.commit()
    return organization_read(organization, db)
