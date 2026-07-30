import os
import uuid

os.environ.setdefault("DATABASE_URL", "sqlite://")
os.environ.setdefault("SECRET_KEY", "test-secret-key-at-least-32-bytes-long")

import jwt
import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from pydantic import ValidationError
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.routes.organizations import manageable_organization
from app.core.config import Settings, get_settings
from app.core.database import Base, get_db
from app.core.security import create_access_token
from app.main import app
from app.models.user import Organization, OrganizationMember, User


engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
connection = engine.raw_connection()
connection.create_function("gen_random_uuid", 0, lambda: uuid.uuid4().hex)
connection.close()
TestingSession = sessionmaker(bind=engine)
Base.metadata.create_all(engine)


def override_get_db():
    db = TestingSession()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


def test_catalog_rejects_path_traversal():
    response = client.get(
        "/api/v1/catalogs/..%5C..%5C..%5Cfrontend-mobile%5Cpackage"
    )

    assert response.status_code == 404
    assert "sport-mobile" not in response.text


def test_global_user_collection_is_not_exposed():
    assert client.get("/api/v1/users").status_code == 404
    assert (
        client.post(
            "/api/v1/users",
            json={"email": "victim@example.com"},
        ).status_code
        == 404
    )


def test_development_login_is_disabled_by_default():
    response = client.post("/api/v1/auth/development-login")

    assert response.status_code == 404


def test_cookie_auth_rejects_untrusted_origin():
    client.cookies.set(
        "refresh_token",
        "x" * 64,
        path="/api/v1/auth",
    )
    response = client.post(
        "/api/v1/auth/refresh",
        json={},
        headers={"Origin": "https://attacker.example"},
    )
    client.cookies.clear()

    assert response.status_code == 403
    assert response.json()["detail"]["code"] == "UNTRUSTED_ORIGIN"


def test_validation_errors_do_not_reflect_credentials():
    response = client.post(
        "/api/v1/auth/google",
        json={"credential": "sensitive"},
    )

    assert response.status_code == 422
    assert "sensitive" not in response.text


def test_request_size_limit_rejects_oversized_body():
    response = client.post(
        "/api/v1/auth/google",
        content=b"x" * (get_settings().max_request_size_bytes + 1),
        headers={"Content-Type": "application/json"},
    )

    assert response.status_code == 413
    assert response.json()["detail"]["code"] == "REQUEST_TOO_LARGE"


def test_security_headers_are_present():
    response = client.get("/health")

    assert response.headers["x-content-type-options"] == "nosniff"
    assert response.headers["x-frame-options"] == "DENY"
    assert response.headers["referrer-policy"] == "no-referrer"


def test_access_tokens_have_required_boundary_claims():
    user = User(id=uuid.uuid4(), email="claims@example.com")
    settings = get_settings()
    token = create_access_token(user)

    claims = jwt.decode(
        token,
        settings.secret_key,
        algorithms=["HS256"],
        audience=settings.jwt_audience,
        issuer=settings.jwt_issuer,
    )

    assert claims["sub"] == str(user.id)
    assert claims["type"] == "access"
    assert claims["iat"]
    assert claims["jti"]


def test_regular_organization_member_cannot_manage_data():
    db = TestingSession()
    try:
        owner = User(id=uuid.uuid4(), email="owner@example.com")
        member = User(id=uuid.uuid4(), email="member@example.com")
        admin = User(id=uuid.uuid4(), email="admin@example.com")
        organization = Organization(
            id=uuid.uuid4(),
            owner_user_id=owner.id,
            name="Protected organization",
            slug=f"protected-{uuid.uuid4().hex}",
        )
        db.add_all(
            [
                owner,
                member,
                admin,
                organization,
                OrganizationMember(
                    organization_id=organization.id,
                    user_id=owner.id,
                    role="ADMIN",
                ),
                OrganizationMember(
                    organization_id=organization.id,
                    user_id=member.id,
                    role="MEMBER",
                ),
                OrganizationMember(
                    organization_id=organization.id,
                    user_id=admin.id,
                    role="ADMIN",
                ),
            ]
        )
        db.commit()

        with pytest.raises(HTTPException) as denied:
            manageable_organization(organization.id, member, db)
        assert denied.value.status_code == 403
        assert manageable_organization(organization.id, admin, db).id == organization.id
    finally:
        db.close()


def test_production_configuration_rejects_weak_defaults():
    with pytest.raises(ValidationError):
        Settings(
            _env_file=None,
            environment="production",
            secret_key="local-development-only-change-me",
            database_url="postgresql://sport:change_me@db/sport",
        )


def test_production_configuration_accepts_explicit_security_settings():
    settings = Settings(
        _env_file=None,
        environment="production",
        secret_key="A9v!m2Qz#7Lp$4Xk@8Wd%3Nr&6Ts*1Hy",
        database_url="postgresql://sport:strong-value@db/sport",
        cookie_secure=True,
        cors_origins=["https://app.example.com"],
        allowed_hosts=["api.example.com"],
        rate_limit_storage_uri="redis://redis:6379/0",
    )

    assert settings.environment == "production"
