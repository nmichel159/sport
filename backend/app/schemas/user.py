from datetime import date, datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: EmailStr
    account_status: str
    email_verified: bool
    display_name: str | None = None
    nickname: str | None = None
    school_code: str | None = None
    district_city: str | None = None
    first_name: str | None = None
    last_name: str | None = None
    birth_date: date | None = None
    gender: str | None = None
    profile_image_url: str | None = None
    preferred_language: str = "sk"
    onboarding_completed: bool = False
    created_at: datetime
    updated_at: datetime


class UserSettingsUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    preferred_language: Literal["sk", "en"] | None = None
    display_name: str | None = Field(default=None, max_length=255)
    nickname: str | None = Field(default=None, min_length=3, max_length=30)


class OnboardingComplete(BaseModel):
    model_config = ConfigDict(extra="forbid")

    nickname: str = Field(min_length=3, max_length=30)
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    birth_date: date
    gender: Literal["male", "female", "other", "prefer_not_to_say"]
    preferred_language: Literal["sk", "en"] = "sk"
    school_code: str = Field(min_length=1, max_length=20)
    district_city: str = Field(min_length=1, max_length=100)
