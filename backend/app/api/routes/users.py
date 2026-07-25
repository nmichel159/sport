from fastapi import APIRouter, Depends, status
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
        from fastapi import HTTPException
        raise HTTPException(status_code=422, detail={"code": "INVALID_LANGUAGE"})
    if payload.preferred_language is not None: user.preferred_language = payload.preferred_language
    if payload.display_name is not None: user.display_name = payload.display_name.strip() or user.display_name
    db.commit(); db.refresh(user)
    return user


@router.post("/me/onboarding", response_model=UserRead)
def complete_onboarding(payload: OnboardingComplete, db: Session = Depends(get_db), user=Depends(get_current_active_user)):
    name = payload.display_name.strip()
    if not name or len(name) > 255 or payload.preferred_language not in {"sk", "en"}:
        from fastapi import HTTPException
        raise HTTPException(status_code=422, detail={"code": "INVALID_ONBOARDING"})
    user.display_name = name
    user.preferred_language = payload.preferred_language
    user.onboarding_completed = True
    db.commit(); db.refresh(user)
    return user
