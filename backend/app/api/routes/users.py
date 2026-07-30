from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_active_user
from app.schemas.user import OnboardingComplete, UserRead, UserSettingsUpdate
from app.services.catalogs import get_catalog

router = APIRouter(prefix="/users", tags=["users"])


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
    nickname = payload.nickname.strip().lower()
    if not first_name or not last_name or len(first_name) > 100 or len(last_name) > 100 or not 3 <= len(nickname) <= 30 or not nickname.replace("_", "").replace("-", "").isalnum() or payload.gender not in {"male", "female", "other", "prefer_not_to_say"} or payload.preferred_language not in {"sk", "en"}:
        raise HTTPException(status_code=422, detail={"code": "INVALID_ONBOARDING"})
    from sqlalchemy import select
    from app.models.user import User
    existing = db.scalar(select(User).where(User.nickname == nickname, User.id != user.id))
    if existing:
        raise HTTPException(status_code=409, detail={"code": "NICKNAME_TAKEN"})
    _, schools = get_catalog("schools")
    _, district_cities = get_catalog("district-cities")
    if not any(item["code"] == payload.school_code for item in schools) or not any(item["name"] == payload.district_city for item in district_cities):
        raise HTTPException(status_code=422, detail={"code": "INVALID_CATALOG_SELECTION"})
    user.first_name = first_name
    user.last_name = last_name
    user.birth_date = payload.birth_date
    user.gender = payload.gender
    user.display_name = f"{first_name} {last_name}"
    user.nickname = nickname
    user.school_code = payload.school_code
    user.district_city = payload.district_city
    user.preferred_language = payload.preferred_language
    user.onboarding_completed = True
    db.commit(); db.refresh(user)
    return user
