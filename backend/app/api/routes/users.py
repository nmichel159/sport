from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_active_user
from app.repositories.users import list_users
from app.schemas.user import OnboardingComplete, UserCreate, UserRead, UserSettingsUpdate
from app.services.users import create_user

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=list[UserRead])
def read_users(db: Session = Depends(get_db), _: object = Depends(get_current_active_user)):
    return list_users(db)


@router.post("", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def add_user(payload: UserCreate, db: Session = Depends(get_db), _: object = Depends(get_current_active_user)):
    return create_user(db, payload.email)


@router.patch("/me/settings", response_model=UserRead)
def update_my_settings(payload: UserSettingsUpdate, db: Session = Depends(get_db), user=Depends(get_current_active_user)):
    if payload.preferred_language is not None and payload.preferred_language not in {"sk", "en"}:
        raise HTTPException(status_code=422, detail={"code": "INVALID_LANGUAGE"})
    if payload.preferred_language is not None: user.preferred_language = payload.preferred_language
    if payload.display_name is not None: user.display_name = payload.display_name.strip() or user.display_name
    if payload.nickname is not None:
        nickname = payload.nickname.strip().lower()
        if not 3 <= len(nickname) <= 30 or not nickname.replace("_", "").replace("-", "").isalnum():
            raise HTTPException(status_code=422, detail={"code": "INVALID_NICKNAME"})
        from sqlalchemy import select
        from app.models.user import User
        existing = db.scalar(select(User).where(User.nickname == nickname, User.id != user.id))
        if existing:
            raise HTTPException(status_code=409, detail={"code": "NICKNAME_TAKEN"})
        user.nickname = nickname
    db.commit(); db.refresh(user)
    return user


@router.post("/me/onboarding", response_model=UserRead)
def complete_onboarding(payload: OnboardingComplete, db: Session = Depends(get_db), user=Depends(get_current_active_user)):
    first_name = payload.first_name.strip()
    last_name = payload.last_name.strip()
    if not first_name or not last_name or len(first_name) > 100 or len(last_name) > 100 or payload.gender not in {"male", "female", "other", "prefer_not_to_say"} or payload.preferred_language not in {"sk", "en"}:
        raise HTTPException(status_code=422, detail={"code": "INVALID_ONBOARDING"})
    user.first_name = first_name
    user.last_name = last_name
    user.birth_date = payload.birth_date
    user.gender = payload.gender
    user.display_name = f"{first_name} {last_name}"
    user.preferred_language = payload.preferred_language
    user.onboarding_completed = True
    db.commit(); db.refresh(user)
    return user
