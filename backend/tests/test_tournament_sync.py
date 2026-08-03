import os
import uuid

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

os.environ.setdefault("DATABASE_URL", "sqlite://")
os.environ.setdefault("SECRET_KEY", "test-secret-key-at-least-32-bytes-long")

from app.api.routes.tournament_sync import (
    synchronize_tournament_state,
    tournament_state_read,
)
from app.core.database import Base
from app.models.user import (
    Organization,
    OrganizationEvent,
    OrganizationEventMatch,
    OrganizationEventMatchScorer,
    OrganizationEventRegistration,
    OrganizationMember,
    TournamentFormat,
    User,
)
from app.schemas.organization import TournamentStateUpdate


@pytest.fixture()
def tournament_db():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    connection = engine.raw_connection()
    connection.create_function("gen_random_uuid", 0, lambda: uuid.uuid4().hex)
    connection.close()
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine)()
    try:
        yield session
    finally:
        session.close()
        engine.dispose()


def test_offline_snapshot_is_atomic_versioned_and_idempotent(tournament_db):
    manager = User(
        id=uuid.uuid4(),
        email="offline-manager@example.com",
        nickname="offline-manager",
    )
    organization = Organization(
        id=uuid.uuid4(),
        owner_user_id=manager.id,
        name="Offline organization",
        slug="offline-organization",
    )
    tournament_format = TournamentFormat(
        id=uuid.uuid4(),
        code="SINGLE_ELIMINATION",
        name="Single elimination",
    )
    event = OrganizationEvent(
        id=uuid.uuid4(),
        organization_id=organization.id,
        created_by_user_id=manager.id,
        name="Offline cup",
        sport="Futbal",
        participation_type="INDIVIDUAL",
        format_id=tournament_format.id,
        tournament_revision=0,
    )
    tournament_db.add_all(
        [
            manager,
            organization,
            tournament_format,
            event,
            OrganizationMember(
                organization_id=organization.id,
                user_id=manager.id,
                role="ADMIN",
            ),
        ]
    )
    players = []
    registrations = []
    for index in range(4):
        player = User(
            id=uuid.uuid4(),
            email=f"offline-player-{index}@example.com",
            nickname=f"offline-player-{index}",
        )
        registration = OrganizationEventRegistration(
            id=uuid.uuid4(),
            event_id=event.id,
            user_id=player.id,
        )
        players.append(player)
        registrations.append(registration)
        tournament_db.add_all([player, registration])
    tournament_db.commit()

    initial = tournament_state_read(event, tournament_db)
    assert initial.revision == 0
    assert len(initial.registrations) == 4
    assert all(len(item.players) == 1 for item in initial.registrations)

    match_ids = [uuid.uuid4() for _ in range(3)]
    participant = lambda index: {
        "registration_id": str(registrations[index].id),
        "name": players[index].nickname,
    }
    mutation_id = uuid.uuid4()
    payload = TournamentStateUpdate.model_validate(
        {
            "base_revision": 0,
            "client_mutation_id": str(mutation_id),
            "bracket": {
                "event_id": str(event.id),
                "generated": True,
                "round_count": 2,
                "matches": [
                    {
                        "id": str(match_ids[0]),
                        "round_number": 1,
                        "position": 0,
                        "participant_a": participant(0),
                        "participant_b": participant(1),
                        "score_a": 2,
                        "score_b": 1,
                        "winner_registration_id": str(registrations[0].id),
                        "is_bye": False,
                    },
                    {
                        "id": str(match_ids[1]),
                        "round_number": 1,
                        "position": 1,
                        "participant_a": participant(2),
                        "participant_b": participant(3),
                        "score_a": None,
                        "score_b": None,
                        "winner_registration_id": None,
                        "is_bye": False,
                    },
                    {
                        "id": str(match_ids[2]),
                        "round_number": 2,
                        "position": 0,
                        "participant_a": participant(0),
                        "participant_b": None,
                        "score_a": None,
                        "score_b": None,
                        "winner_registration_id": None,
                        "is_bye": False,
                    },
                ],
            },
            "group_stage": {
                "event_id": str(event.id),
                "generated": False,
                "locked": False,
                "locked_at": None,
                "group_count": 0,
                "advancing_count": 0,
                "completed_matches": 0,
                "total_matches": 0,
                "groups": [],
            },
            "match_details": [
                {
                    "match_id": str(match_ids[0]),
                    "pitch": "1",
                    "scheduled_start": "10:20",
                    "mvp_user_id": str(players[0].id),
                    "scorers": [
                        {"user_id": str(players[0].id), "goals": 2},
                        {"user_id": str(players[1].id), "goals": 1},
                    ],
                }
            ],
        }
    )

    synchronized = synchronize_tournament_state(
        organization.id,
        event.id,
        payload,
        tournament_db,
        manager,
    )
    assert synchronized.revision == 1
    assert synchronized.bracket.matches[0].id == match_ids[0]
    assert synchronized.match_details[0].pitch == "1"
    assert tournament_db.scalar(
        select(func.count()).select_from(OrganizationEventMatch)
    ) == 3
    assert tournament_db.scalar(
        select(func.count()).select_from(OrganizationEventMatchScorer)
    ) == 2

    retried = synchronize_tournament_state(
        organization.id,
        event.id,
        payload,
        tournament_db,
        manager,
    )
    assert retried.revision == 1

    conflicting = payload.model_copy(
        update={"client_mutation_id": uuid.uuid4()}
    )
    with pytest.raises(HTTPException) as caught:
        synchronize_tournament_state(
            organization.id,
            event.id,
            conflicting,
            tournament_db,
            manager,
        )
    assert caught.value.status_code == 409
    assert caught.value.detail["code"] == "TOURNAMENT_REVISION_CONFLICT"
