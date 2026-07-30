from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import get_db
from app.core.rate_limit import limiter
from app.core.security import (
    create_access_token,
    get_current_active_user,
    hash_refresh_token,
    utcnow,
)
from app.models.user import AuthSession, User
from app.schemas.user import UserRead
from app.services.auth import (
    InvalidGoogleToken,
    authenticate_google,
    create_session,
    rotate_session,
    verify_google_token,
)

router = APIRouter(prefix="/auth", tags=["auth"])
# This is the OAuth token type, not a credential.
TOKEN_TYPE = "bearer"  # nosec B105


class StrictRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")


class GoogleLogin(StrictRequest):
    credential: str = Field(min_length=20, max_length=8192)
    platform: Literal["web", "mobile"] = "web"
    device_name: str | None = Field(default=None, max_length=255)


class RefreshRequest(StrictRequest):
    refresh_token: str | None = Field(
        default=None,
        min_length=32,
        max_length=512,
    )


class AuthResponse(BaseModel):
    access_token: str
    refresh_token: str | None
    token_type: Literal["bearer"] = "bearer"
    user: UserRead


def set_refresh_cookie(response: Response, token: str) -> None:
    settings = get_settings()
    response.set_cookie(
        "refresh_token",
        token,
        httponly=True,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
        max_age=settings.refresh_token_expire_days * 86400,
        path="/api/v1/auth",
    )


def cookie_token(request: Request) -> str | None:
    raw = request.cookies.get("refresh_token")
    if not raw:
        return None
    origin = request.headers.get("origin")
    if not origin or origin not in get_settings().cors_origins:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            detail={"code": "UNTRUSTED_ORIGIN"},
        )
    return raw


@router.post("/google", response_model=AuthResponse)
@limiter.limit("10/minute")
def google_login(
    request: Request,
    payload: GoogleLogin,
    response: Response,
    db: Session = Depends(get_db),
):
    try:
        claims = verify_google_token(payload.credential)
    except InvalidGoogleToken:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            detail={"code": "INVALID_GOOGLE_TOKEN"},
        )
    user = authenticate_google(db, claims)
    if user.account_status != "ACTIVE":
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            detail={"code": "ACCOUNT_INACTIVE"},
        )
    _, refresh = create_session(
        db,
        user,
        payload.device_name,
        payload.platform,
    )
    if payload.platform == "web":
        set_refresh_cookie(response, refresh)
        refresh = None
    return {
        "access_token": create_access_token(user),
        "refresh_token": refresh,
        "token_type": TOKEN_TYPE,
        "user": user,
    }


@router.post("/development-login", response_model=AuthResponse)
@limiter.limit("5/minute")
def development_login(
    request: Request,
    db: Session = Depends(get_db),
):
    """Explicitly enabled local convenience; never available in production."""
    settings = get_settings()
    if (
        settings.environment != "development"
        or not settings.development_login_enabled
    ):
        raise HTTPException(status.HTTP_404_NOT_FOUND)
    user = db.scalar(
        select(User).where(User.email == "norbert.michel@sport.local")
    )
    if not user:
        user = User(
            email="norbert.michel@sport.local",
            email_verified=True,
            display_name="Norbert Michel",
            nickname="norbert_michel",
            onboarding_completed=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    _, refresh = create_session(db, user, "Expo Go", "mobile")
    return {
        "access_token": create_access_token(user),
        "refresh_token": refresh,
        "token_type": TOKEN_TYPE,
        "user": user,
    }


@router.post("/refresh", response_model=AuthResponse)
@limiter.limit("30/minute")
def refresh(
    payload: RefreshRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    raw = payload.refresh_token or cookie_token(request)
    if not raw:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            detail={"code": "AUTH_REQUIRED"},
        )
    result = rotate_session(db, raw)
    if not result:
        response.delete_cookie("refresh_token", path="/api/v1/auth")
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            detail={"code": "INVALID_REFRESH_TOKEN"},
        )
    user, _, next_token = result
    if payload.refresh_token is None:
        set_refresh_cookie(response, next_token)
        next_token = None
    return {
        "access_token": create_access_token(user),
        "refresh_token": next_token,
        "token_type": TOKEN_TYPE,
        "user": user,
    }


@router.get("/me", response_model=UserRead)
def me(user: User = Depends(get_current_active_user)):
    return user


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("30/minute")
def logout(
    payload: RefreshRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    raw = payload.refresh_token or cookie_token(request)
    if raw:
        db.execute(
            update(AuthSession)
            .where(
                AuthSession.refresh_token_hash == hash_refresh_token(raw)
            )
            .values(revoked_at=utcnow())
        )
        db.commit()
    response.delete_cookie("refresh_token", path="/api/v1/auth")


@router.post("/logout-all", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("10/minute")
def logout_all(
    request: Request,
    user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    db.execute(
        update(AuthSession)
        .where(
            AuthSession.user_id == user.id,
            AuthSession.revoked_at.is_(None),
        )
        .values(revoked_at=utcnow())
    )
    db.commit()
