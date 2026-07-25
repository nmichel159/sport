from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel
from sqlalchemy import update
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import get_db
from app.core.security import create_access_token, get_current_active_user, hash_refresh_token, utcnow
from app.models.user import AuthSession, User
from app.services.auth import InvalidGoogleToken, authenticate_google, create_session, rotate_session, verify_google_token

router = APIRouter(prefix="/auth", tags=["auth"])

class GoogleLogin(BaseModel): credential: str; platform: str = "web"; device_name: str | None = None
class RefreshRequest(BaseModel): refresh_token: str | None = None

def set_refresh_cookie(response: Response, token: str) -> None:
    s = get_settings(); response.set_cookie("refresh_token", token, httponly=True, secure=s.cookie_secure, samesite=s.cookie_samesite, max_age=s.refresh_token_expire_days * 86400, path="/api/v1/auth")

@router.post("/google")
def google_login(payload: GoogleLogin, response: Response, db: Session = Depends(get_db)):
    try: claims = verify_google_token(payload.credential)
    except InvalidGoogleToken: raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail={"code": "INVALID_GOOGLE_TOKEN"})
    user = authenticate_google(db, claims)
    if user.account_status != "ACTIVE": raise HTTPException(status.HTTP_403_FORBIDDEN, detail={"code": "ACCOUNT_INACTIVE"})
    _, refresh = create_session(db, user, payload.device_name, payload.platform)
    if payload.platform == "web": set_refresh_cookie(response, refresh); refresh = None
    return {"access_token": create_access_token(user), "refresh_token": refresh, "user": user}


@router.post("/development-login")
def development_login(response: Response, db: Session = Depends(get_db)):
    """Local Expo Go convenience only; unavailable outside development."""
    if get_settings().environment != "development":
        raise HTTPException(status.HTTP_404_NOT_FOUND)
    from sqlalchemy import select
    user = db.scalar(select(User).where(User.email == "expo-demo@sport.local"))
    if not user:
        user = User(email="expo-demo@sport.local", email_verified=False, display_name="Expo Tester")
        db.add(user); db.commit(); db.refresh(user)
    _, refresh = create_session(db, user, "Expo Go", "mobile")
    return {"access_token": create_access_token(user), "refresh_token": refresh, "user": user}

@router.post("/refresh")
def refresh(payload: RefreshRequest, request: Request, response: Response, db: Session = Depends(get_db)):
    raw = payload.refresh_token or request.cookies.get("refresh_token")
    if not raw: raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail={"code": "AUTH_REQUIRED"})
    result = rotate_session(db, raw)
    if not result: response.delete_cookie("refresh_token", path="/api/v1/auth"); raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail={"code": "INVALID_REFRESH_TOKEN"})
    user, _, next_token = result
    if payload.refresh_token is None: set_refresh_cookie(response, next_token); next_token = None
    return {"access_token": create_access_token(user), "refresh_token": next_token, "user": user}

@router.get("/me")
def me(user: User = Depends(get_current_active_user)): return user

@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(payload: RefreshRequest, request: Request, response: Response, db: Session = Depends(get_db)):
    raw = payload.refresh_token or request.cookies.get("refresh_token")
    if raw: db.execute(update(AuthSession).where(AuthSession.refresh_token_hash == hash_refresh_token(raw)).values(revoked_at=utcnow())); db.commit()
    response.delete_cookie("refresh_token", path="/api/v1/auth")

@router.post("/logout-all", status_code=status.HTTP_204_NO_CONTENT)
def logout_all(user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    db.execute(update(AuthSession).where(AuthSession.user_id == user.id, AuthSession.revoked_at.is_(None)).values(revoked_at=utcnow())); db.commit()
