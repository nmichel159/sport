from datetime import date, datetime, time
from uuid import UUID

from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class StrictInput(BaseModel):
    model_config = ConfigDict(extra="forbid")


class OrganizationCreate(StrictInput):
    name: str = Field(min_length=1, max_length=180)


class OrganizationMemberAdd(StrictInput):
    nickname: str = Field(min_length=3, max_length=30)


class OrganizationMemberRead(BaseModel):
    id: UUID
    nickname: str
    role: str


class EventCategoryCreate(StrictInput):
    age_group: Literal["kids", "junior", "open", "veterani"]
    team_format: Literal["1v1", "2v2", "3v3", "3v3g", "4v4", "5v5"]
    gender_category: Literal["muzi", "zeny", "mix"]
    fee: Decimal = Field(ge=0, max_digits=10, decimal_places=2)
    capacity: int = Field(gt=0, le=100_000)


class EventCategoryRead(EventCategoryCreate):
    id: UUID


class EventCreate(StrictInput):
    name: str = Field(min_length=1, max_length=180)
    event_type: Literal["TOURNAMENT", "LEAGUE"] = "TOURNAMENT"
    sport: str = Field(min_length=1, max_length=80)
    participation_type: Literal["TEAM", "INDIVIDUAL"]
    format_id: UUID | None = None
    event_date: date
    event_time: time | None = None
    region: str = Field(min_length=1, max_length=120)
    city_id: str | None = Field(default=None, max_length=120)
    city: str | None = Field(default=None, max_length=120)
    venue: str | None = Field(default=None, max_length=240)
    cover_image_url: str | None = Field(default=None, max_length=2048)
    categories: list[EventCategoryCreate] = Field(min_length=1, max_length=30)
    description: str | None = Field(default=None, max_length=2000)

    @model_validator(mode="after")
    def validate_event_details(self) -> "EventCreate":
        if self.event_type == "TOURNAMENT" and self.event_time is None:
            raise ValueError("Tournament time is required")
        if self.region not in {"Celé Slovensko", "Celé Česko"}:
            if not self.city_id or not self.city:
                raise ValueError("City is required for a regional event")
        category_keys = {
            (item.age_group, item.team_format, item.gender_category)
            for item in self.categories
        }
        if len(category_keys) != len(self.categories):
            raise ValueError("Event categories must be unique")
        return self


class EventRead(BaseModel):
    id: UUID
    name: str
    event_type: str
    sport: str
    participation_type: str
    format_id: UUID | None
    format_code: str | None
    format_name: str | None
    event_date: date | None
    event_time: time | None
    region: str | None
    city_id: str | None
    city: str | None
    venue: str | None
    cover_image_url: str | None
    registration_open: bool
    xp_points: int | None
    location: str | None
    fee: Decimal | None
    description: str | None
    categories: list[EventCategoryRead] = Field(default_factory=list)
    registrations: list["EventRegistrationRead"] = Field(default_factory=list)


class EventRegistrationCreate(StrictInput):
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


class EventMatchScoreUpdate(StrictInput):
    score_a: int = Field(ge=0, le=1_000_000)
    score_b: int = Field(ge=0, le=1_000_000)


class MatchResultPlayerRead(BaseModel):
    id: UUID
    name: str
    registration_id: UUID
    side: str


class MatchResultScorerInput(StrictInput):
    user_id: UUID
    goals: int = Field(ge=1, le=1_000_000)


class MatchResultScorerRead(BaseModel):
    user_id: UUID
    name: str
    goals: int


class MatchResultUpdate(EventMatchScoreUpdate):
    pitch: str | None = Field(default=None, max_length=40)
    scheduled_start: time | None = None
    mvp_user_id: UUID | None = None
    scorers: list[MatchResultScorerInput] = Field(default_factory=list)


class MatchResultRead(BaseModel):
    match_id: UUID
    kind: str
    sport: str
    supports_scorers: bool
    supports_mvp: bool
    participant_a: BracketParticipantRead
    participant_b: BracketParticipantRead
    score_a: int | None
    score_b: int | None
    pitch: str | None
    scheduled_start: time | None
    players: list[MatchResultPlayerRead]
    scorers: list[MatchResultScorerRead]
    mvp_user_id: UUID | None


class GroupStageCreate(StrictInput):
    group_count: int = Field(ge=1, le=64)
    advancing_count: int = Field(ge=2, le=4096)


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
    participants: list[GroupParticipantRead] = Field(default_factory=list)
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


class TournamentPlayerRead(BaseModel):
    id: UUID
    name: str


class TournamentRegistrationRead(EventRegistrationRead):
    players: list[TournamentPlayerRead] = Field(default_factory=list)


class TournamentRevisionRead(BaseModel):
    event_id: UUID
    revision: int
    updated_at: datetime


class TournamentMatchDetailInput(StrictInput):
    match_id: UUID
    pitch: str | None = Field(default=None, max_length=40)
    scheduled_start: time | None = None
    mvp_user_id: UUID | None = None
    scorers: list[MatchResultScorerInput] = Field(default_factory=list)


class TournamentStateRead(TournamentRevisionRead):
    event: EventRead
    registrations: list[TournamentRegistrationRead]
    bracket: EventBracketRead
    group_stage: EventGroupStageRead
    match_details: list[MatchResultRead] = Field(default_factory=list)


class TournamentStateUpdate(StrictInput):
    base_revision: int = Field(ge=0)
    client_mutation_id: UUID
    bracket: EventBracketRead
    group_stage: EventGroupStageRead
    match_details: list[TournamentMatchDetailInput] = Field(default_factory=list)


class OrganizationRead(BaseModel):
    id: UUID
    name: str
    owner_user_id: UUID
    members: list[OrganizationMemberRead]
    events: list[EventRead]
