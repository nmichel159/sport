"""Token and session helpers. Refresh tokens are opaque and only stored hashed."""
from datetime import datetime, timedelta, timezone
import hashlib
import secrets
import uuid

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import get_db
from app.models.user import User

bearer = HTTPBearer(auto_error=False)


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def new_refresh_token() -> str:
    return secrets.token_urlsafe(48)


def hash_refresh_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def create_access_token(user: User) -> str:
    settings = get_settings()
    return jwt.encode({"sub": str(user.id), "exp": utcnow() + timedelta(minutes=settings.access_token_expire_minutes), "type": "access"}, settings.secret_key, algorithm="HS256")


def get_current_user(credentials: HTTPAuthorizationCredentials | None = Depends(bearer), db: Session = Depends(get_db)) -> User:
    if not credentials:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail={"code": "AUTH_REQUIRED"}, headers={"WWW-Authenticate": "Bearer"})
    try:
        claims = jwt.decode(credentials.credentials, get_settings().secret_key, algorithms=["HS256"])
        if claims.get("type") != "access":
            raise ValueError
        user = db.scalar(select(User).where(User.id == uuid.UUID(claims["sub"])))
    except Exception:
        user = None
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail={"code": "INVALID_ACCESS_TOKEN"}, headers={"WWW-Authenticate": "Bearer"})
    return user


def get_current_active_user(user: User = Depends(get_current_user)) -> User:
    if user.account_status != "ACTIVE":
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail={"code": "ACCOUNT_INACTIVE"})
    return user
