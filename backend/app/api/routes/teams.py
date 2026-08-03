import re
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_active_user
from app.models.user import (
    OrganizationEvent,
    OrganizationEventRegistration,
    Team,
    TeamMember,
    User,
)
from app.schemas.team import TeamCreate, TeamMemberAdd, TeamMemberRead, TeamRead
from app.services.tournament_revision import bump_tournament_revision

router = APIRouter(prefix="/teams", tags=["teams"])


def bump_team_tournaments(team_id: uuid.UUID, db: Session) -> None:
    events = db.scalars(
        select(OrganizationEvent)
        .join(
            OrganizationEventRegistration,
            OrganizationEventRegistration.event_id == OrganizationEvent.id,
        )
        .where(OrganizationEventRegistration.team_id == team_id)
    ).all()
    for event in events:
        bump_tournament_revision(event)


def team_read(team: Team, db: Session) -> TeamRead:
    rows = db.execute(
        select(User.id, User.nickname)
        .join(TeamMember, TeamMember.user_id == User.id)
        .where(TeamMember.team_id == team.id)
        .order_by(TeamMember.joined_at)
    ).all()
    return TeamRead(
        id=team.id,
        name=team.name,
        owner_user_id=team.owner_user_id,
        members=[TeamMemberRead(id=row.id, nickname=row.nickname or "bez-nicku") for row in rows],
    )


def get_accessible_team(team_id: uuid.UUID, user: User, db: Session) -> Team:
    team = db.scalar(
        select(Team).join(TeamMember).where(Team.id == team_id, TeamMember.user_id == user.id, Team.is_active.is_(True))
    )
    if not team:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail={"code": "TEAM_NOT_FOUND"})
    return team


@router.get("/mine", response_model=list[TeamRead])
def read_my_teams(db: Session = Depends(get_db), user: User = Depends(get_current_active_user)):
    teams = db.scalars(
        select(Team).join(TeamMember).where(TeamMember.user_id == user.id, Team.is_active.is_(True)).order_by(Team.created_at.desc())
    ).all()
    return [team_read(team, db) for team in teams]


@router.post("", response_model=TeamRead, status_code=status.HTTP_201_CREATED)
def create_team(payload: TeamCreate, db: Session = Depends(get_db), user: User = Depends(get_current_active_user)):
    name = payload.name.strip()
    if not name:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail={"code": "INVALID_TEAM_NAME"})
    code_base = re.sub(r"[^a-z0-9]", "-", name.lower()).strip("-")[:20] or "team"
    team = Team(name=name, owner_user_id=user.id, team_code=f"{code_base}-{uuid.uuid4().hex[:8]}")
    db.add(team)
    db.flush()
    db.add(TeamMember(team_id=team.id, user_id=user.id))
    db.commit()
    db.refresh(team)
    return team_read(team, db)


@router.post("/{team_id}/members", response_model=TeamRead)
def add_team_member(team_id: uuid.UUID, payload: TeamMemberAdd, db: Session = Depends(get_db), user: User = Depends(get_current_active_user)):
    team = get_accessible_team(team_id, user, db)
    if team.owner_user_id != user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail={"code": "TEAM_OWNER_REQUIRED"})
    nickname = payload.nickname.strip()
    player = db.scalar(select(User).where(User.nickname == nickname))
    if not player:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail={"code": "NICKNAME_NOT_FOUND"})
    if db.get(TeamMember, {"team_id": team.id, "user_id": player.id}):
        raise HTTPException(status.HTTP_409_CONFLICT, detail={"code": "PLAYER_ALREADY_IN_TEAM"})
    db.add(TeamMember(team_id=team.id, user_id=player.id))
    bump_team_tournaments(team.id, db)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, detail={"code": "PLAYER_ALREADY_IN_TEAM"})
    return team_read(team, db)


@router.delete("/{team_id}/members/{member_id}", response_model=TeamRead)
def remove_team_member(team_id: uuid.UUID, member_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(get_current_active_user)):
    team = get_accessible_team(team_id, user, db)
    if team.owner_user_id != user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail={"code": "TEAM_OWNER_REQUIRED"})
    member = db.get(TeamMember, {"team_id": team.id, "user_id": member_id})
    if not member:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail={"code": "MEMBER_NOT_FOUND"})
    if member.user_id == team.owner_user_id:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            detail={"code": "TEAM_OWNER_CANNOT_BE_REMOVED"},
        )
    db.delete(member)
    bump_team_tournaments(team.id, db)
    db.commit()
    return team_read(team, db)
