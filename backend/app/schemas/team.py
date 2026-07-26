from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class TeamCreate(BaseModel):
    name: str = Field(min_length=1, max_length=150)


class TeamMemberAdd(BaseModel):
    nickname: str = Field(min_length=3, max_length=30)


class TeamMemberRead(BaseModel):
    id: UUID
    nickname: str


class TeamRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    owner_user_id: UUID
    members: list[TeamMemberRead]
