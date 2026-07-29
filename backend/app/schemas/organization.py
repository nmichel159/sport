from datetime import date, datetime
from uuid import UUID

from decimal import Decimal

from pydantic import BaseModel, Field


class OrganizationCreate(BaseModel):
    name: str = Field(min_length=1, max_length=180)


class OrganizationMemberAdd(BaseModel):
    nickname: str = Field(min_length=3, max_length=30)


class OrganizationMemberRead(BaseModel):
    id: UUID
    nickname: str
    role: str


class EventCreate(BaseModel):
    name: str = Field(min_length=1, max_length=180)
    sport: str = Field(min_length=1, max_length=80)
    participation_type: str = Field(pattern="^(TEAM|INDIVIDUAL)$")
    format_id: UUID | None = None
    event_date: date | None = None
    location: str | None = Field(default=None, max_length=180)
    fee: Decimal | None = Field(default=None, ge=0, max_digits=10, decimal_places=2)
    description: str | None = Field(default=None, max_length=2000)


class EventRead(BaseModel):
    id: UUID
    name: str
    sport: str
    participation_type: str
    format_id: UUID | None
    format_code: str | None
    format_name: str | None
    event_date: date | None
    location: str | None
    fee: Decimal | None
    description: str | None
    registrations: list["EventRegistrationRead"] = []


class EventRegistrationCreate(BaseModel):
    team_id: UUID | None = None


class EventRegistrationRead(BaseModel):
    id: UUID
    user_id: UUID | None
    team_id: UUID | None
    name: str
    type: str


class TournamentFormatRead(BaseModel):
    id: UUID
    code: str
    name: str


class BracketParticipantRead(BaseModel):
    registration_id: UUID
    name: str


class EventMatchRead(BaseModel):
    id: UUID
    round_number: int
    position: int
    participant_a: BracketParticipantRead | None
    participant_b: BracketParticipantRead | None
    score_a: int | None
    score_b: int | None
    winner_registration_id: UUID | None
    is_bye: bool


class EventBracketRead(BaseModel):
    event_id: UUID
    generated: bool
    round_count: int
    matches: list[EventMatchRead]


class EventMatchScoreUpdate(BaseModel):
    score_a: int = Field(ge=0)
    score_b: int = Field(ge=0)


class GroupStageCreate(BaseModel):
    group_count: int = Field(ge=1)
    advancing_count: int = Field(ge=2)


class GroupParticipantRead(BaseModel):
    registration_id: UUID
    name: str


class GroupStandingRead(BaseModel):
    rank: int
    participant: GroupParticipantRead
    played: int
    wins: int
    draws: int
    losses: int
    score_for: int
    score_against: int
    score_difference: int
    points: int
    qualified: bool
    qualified_seed: int | None


class GroupMatchRead(BaseModel):
    id: UUID
    position: int
    participant_a: GroupParticipantRead
    participant_b: GroupParticipantRead
    score_a: int | None
    score_b: int | None
    winner_registration_id: UUID | None


class EventGroupRead(BaseModel):
    id: UUID
    position: int
    name: str
    standings: list[GroupStandingRead]
    matches: list[GroupMatchRead]


class EventGroupStageRead(BaseModel):
    event_id: UUID
    generated: bool
    locked: bool
    locked_at: datetime | None
    group_count: int
    advancing_count: int
    completed_matches: int
    total_matches: int
    groups: list[EventGroupRead]


class OrganizationRead(BaseModel):
    id: UUID
    name: str
    owner_user_id: UUID
    members: list[OrganizationMemberRead]
    events: list[EventRead]
