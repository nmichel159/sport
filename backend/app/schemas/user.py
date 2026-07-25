from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr


class UserCreate(BaseModel):
    email: EmailStr


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: EmailStr
    account_status: str
    email_verified: bool
    display_name: str | None = None
    profile_image_url: str | None = None
    preferred_language: str = "sk"
    onboarding_completed: bool = False
    created_at: datetime
    updated_at: datetime


class UserSettingsUpdate(BaseModel):
    preferred_language: str | None = None
    display_name: str | None = None


class OnboardingComplete(BaseModel):
    display_name: str
    preferred_language: str = "sk"
