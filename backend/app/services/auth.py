from datetime import timedelta
import logging
import uuid

from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import hash_refresh_token, new_refresh_token, utcnow
from app.models.user import AuthIdentity, AuthSession, User


class InvalidGoogleToken(Exception): pass


logger = logging.getLogger(__name__)


def verify_google_token(token: str) -> dict:
    settings = get_settings()
    audiences = [x for x in (settings.google_web_client_id, settings.google_android_client_id, settings.google_ios_client_id) if x]
    if not audiences:
        raise InvalidGoogleToken()
    try:
        # Browser and container clocks can differ by a second around token issue
        # time. Keep this narrow so expired tokens remain rejected.
        payload = id_token.verify_oauth2_token(token, google_requests.Request(), audience=None, clock_skew_in_seconds=10)
        if (
            payload.get("aud") not in audiences
            or payload.get("iss")
            not in ("accounts.google.com", "https://accounts.google.com")
            or not payload.get("sub")
            or not payload.get("email")
            or payload.get("email_verified") is not True
        ):
            raise InvalidGoogleToken()
        return payload
    except Exception as exc:
        logger.warning("Google ID token verification failed: %s", exc)
        raise InvalidGoogleToken() from exc


def authenticate_google(db: Session, claims: dict) -> User:
    subject = claims["sub"]
    identity = db.scalar(select(AuthIdentity).where(AuthIdentity.provider == "GOOGLE", AuthIdentity.provider_subject == subject))
    if identity:
        user = db.scalar(select(User).where(User.id == identity.user_id))
    else:
        # A verified Google email may safely claim an existing pre-created or
        # imported profile. The provider subject remains the durable login key.
        user = db.scalar(select(User).where(User.email == claims["email"]))
        if not user:
            user = User(
                email=claims["email"],
                email_verified=True,
                display_name=claims.get("name"),
                profile_image_url=claims.get("picture"),
            )
            db.add(user)
            db.flush()
        db.add(AuthIdentity(user_id=user.id, provider="GOOGLE", provider_subject=subject, provider_email=claims.get("email"), provider_email_verified=bool(claims.get("email_verified"))))
    user.email = claims.get("email", user.email)
    user.email_verified = bool(claims.get("email_verified"))
    user.display_name = claims.get("name") or user.display_name
    user.profile_image_url = claims.get("picture") or user.profile_image_url
    user.last_login_at = utcnow()
    if user.account_status != "ACTIVE":
        db.rollback(); return user
    try:
        db.commit()
    except IntegrityError:
        # Concurrent first logins can race on the unique provider subject.
        # Recover by loading the identity committed by the winning request.
        db.rollback()
        identity = db.scalar(
            select(AuthIdentity).where(
                AuthIdentity.provider == "GOOGLE",
                AuthIdentity.provider_subject == subject,
            )
        )
        if not identity:
            raise
        user = db.get(User, identity.user_id)
        if not user:
            raise
    db.refresh(user)
    return user


def create_session(db: Session, user: User, device_name: str | None, platform: str | None) -> tuple[AuthSession, str]:
    raw = new_refresh_token()
    session = AuthSession(user_id=user.id, session_family_id=uuid.uuid4(), refresh_token_hash=hash_refresh_token(raw), device_name=device_name, platform=platform, expires_at=utcnow() + timedelta(days=get_settings().refresh_token_expire_days))
    db.add(session); db.commit(); db.refresh(session)
    return session, raw


def rotate_session(db: Session, raw: str) -> tuple[User, AuthSession, str] | None:
    session = db.scalar(
        select(AuthSession)
        .where(AuthSession.refresh_token_hash == hash_refresh_token(raw))
        .with_for_update()
    )
    if not session:
        return None
    if session.revoked_at or session.expires_at <= utcnow():
        # A known but already used token means possible theft: revoke its family.
        db.execute(update(AuthSession).where(AuthSession.session_family_id == session.session_family_id).values(revoked_at=utcnow()))
        db.commit(); return None
    user = db.scalar(select(User).where(User.id == session.user_id))
    if not user or user.account_status != "ACTIVE": return None
    session.last_used_at = utcnow()
    session.revoked_at = utcnow(); session.rotated_at = utcnow()
    replacement, replacement_raw = create_session_in_family(db, user, session)
    return user, replacement, replacement_raw


def create_session_in_family(db: Session, user: User, previous: AuthSession) -> tuple[AuthSession, str]:
    raw = new_refresh_token()
    session = AuthSession(user_id=user.id, session_family_id=previous.session_family_id, refresh_token_hash=hash_refresh_token(raw), device_name=previous.device_name, platform=previous.platform, expires_at=previous.expires_at)
    db.add(session); db.commit(); db.refresh(session)
    return session, raw
