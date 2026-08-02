import os
import uuid
from datetime import date, time
from decimal import Decimal

import pytest
from pydantic import ValidationError
from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

os.environ.setdefault("DATABASE_URL", "sqlite://")
os.environ.setdefault("SECRET_KEY", "test-secret-key-at-least-32-bytes-long")

from app.api.routes.organizations import create_event
from app.core.database import Base
from app.models.user import (
    Organization,
    OrganizationEvent,
    OrganizationEventCategory,
    OrganizationMember,
    TournamentFormat,
    User,
)
from app.schemas.organization import EventCreate


@pytest.fixture()
def event_db():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    connection = engine.raw_connection()
    connection.create_function("gen_random_uuid", 0, lambda: uuid.uuid4().hex)
    connection.close()
    session = sessionmaker(bind=engine)()
    Base.metadata.create_all(engine)
    try:
        yield session
    finally:
        session.close()
        engine.dispose()


def event_payload(**changes):
    payload = {
        "name": "Košický streetball",
        "event_type": "TOURNAMENT",
        "sport": "Basketbal 3x3",
        "participation_type": "TEAM",
        "event_date": date(2026, 8, 15),
        "event_time": time(10, 30),
        "region": "Košický kraj",
        "city_id": "kosice-i",
        "city": "Košice",
        "venue": "Sídlisko Ťahanovce",
        "cover_image_url": "https://images.example/event.jpg",
        "categories": [
            {
                "age_group": "open",
                "team_format": "3v3",
                "gender_category": "mix",
                "fee": Decimal("25.00"),
                "capacity": 16,
            },
            {
                "age_group": "junior",
                "team_format": "3v3",
                "gender_category": "mix",
                "fee": Decimal("10.00"),
                "capacity": 8,
            },
        ],
        "description": "Dve samostatné kategórie.",
    }
    payload.update(changes)
    return EventCreate(**payload)


def test_create_event_persists_form_and_categories_atomically(event_db):
    manager = User(
        id=uuid.uuid4(),
        email="event-manager@example.com",
        nickname="event-manager",
    )
    organization = Organization(
        id=uuid.uuid4(),
        owner_user_id=manager.id,
        name="Event organization",
        slug="event-organization",
    )
    tournament_format = TournamentFormat(
        id=uuid.uuid4(),
        code="SINGLE_ELIMINATION",
        name="Single elimination",
    )
    event_db.add_all(
        [
            manager,
            organization,
            tournament_format,
            OrganizationMember(
                organization_id=organization.id,
                user_id=manager.id,
                role="ADMIN",
            ),
        ]
    )
    event_db.commit()

    result = create_event(
        organization.id,
        event_payload(),
        event_db,
        manager,
    )

    stored = event_db.scalar(select(OrganizationEvent))
    assert stored.event_type == "TOURNAMENT"
    assert stored.event_time == time(10, 30)
    assert stored.region == "Košický kraj"
    assert stored.city == "Košice"
    assert stored.venue == "Sídlisko Ťahanovce"
    assert stored.registration_open is True
    assert stored.xp_points is None
    assert stored.fee == Decimal("10.00")
    assert (
        event_db.scalar(
            select(func.count(OrganizationEventCategory.id))
        )
        == 2
    )
    assert len(result.events[0].categories) == 2
    assert result.events[0].categories[0].age_group == "open"


def test_tournament_requires_time():
    with pytest.raises(ValidationError):
        event_payload(event_time=None)


def test_regional_event_requires_catalog_city():
    with pytest.raises(ValidationError):
        event_payload(city_id=None, city=None)


def test_event_categories_must_be_unique():
    category = event_payload().categories[0].model_dump()
    with pytest.raises(ValidationError):
        event_payload(categories=[category, category])
