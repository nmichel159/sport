from datetime import date
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
    event_date: date | None = None
    location: str | None = Field(default=None, max_length=180)
    fee: Decimal | None = Field(default=None, ge=0, max_digits=10, decimal_places=2)
    description: str | None = Field(default=None, max_length=2000)


class EventRead(BaseModel):
    id: UUID
    name: str
    sport: str
    participation_type: str
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


class OrganizationRead(BaseModel):
    id: UUID
    name: str
    owner_user_id: UUID
    members: list[OrganizationMemberRead]
    events: list[EventRead]
