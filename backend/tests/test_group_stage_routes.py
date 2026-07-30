import os
import uuid
from datetime import date

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

os.environ.setdefault("DATABASE_URL", "sqlite://")
os.environ.setdefault("SECRET_KEY", "test-secret-key-at-least-32-bytes-long")

from app.api.routes.organizations import (
    finalize_event_group_stage,
    generate_event_group_stage,
    update_event_group_match_score,
)
from app.core.database import Base
from app.models.user import (
    Organization,
    OrganizationEvent,
    OrganizationEventGroup,
    OrganizationEventGroupMatch,
    OrganizationEventGroupMember,
    OrganizationEventGroupStage,
    OrganizationEventMatch,
    OrganizationEventRegistration,
    OrganizationMember,
    TournamentFormat,
    User,
)
from app.schemas.organization import EventMatchScoreUpdate, GroupStageCreate
from scripts.seed_demo_users import (
    NORO_GROUPS_EVENT_NAME,
    seed_noro_groups_tournament,
)


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


def test_group_results_persist_and_lock_when_bracket_is_created(tournament_db):
    manager = User(
        id=uuid.uuid4(),
        email="manager@example.com",
        nickname="manager",
    )
    organization = Organization(
        id=uuid.uuid4(),
        owner_user_id=manager.id,
        name="Test organization",
        slug="test-organization",
    )
    tournament_format = TournamentFormat(
        id=uuid.uuid4(),
        code="GROUPS_THEN_ELIMINATION",
        name="Groups then elimination",
    )
    event = OrganizationEvent(
        id=uuid.uuid4(),
        organization_id=organization.id,
        created_by_user_id=manager.id,
        name="Two-phase event",
        sport="Football",
        participation_type="INDIVIDUAL",
        format_id=tournament_format.id,
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
    for index in range(4):
        player = User(
            id=uuid.uuid4(),
            email=f"player{index}@example.com",
            nickname=f"player{index}",
        )
        tournament_db.add(player)
        tournament_db.add(
            OrganizationEventRegistration(
                id=uuid.uuid4(),
                event_id=event.id,
                user_id=player.id,
            )
        )
    tournament_db.commit()

    generated = generate_event_group_stage(
        organization.id,
        event.id,
        GroupStageCreate(group_count=2, advancing_count=2),
        tournament_db,
        manager,
    )
    assert generated.generated
    assert generated.group_count == 2
    assert generated.total_matches == 2

    matches = list(
        tournament_db.scalars(
            select(OrganizationEventGroupMatch).order_by(
                OrganizationEventGroupMatch.position
            )
        ).all()
    )
    for index, match in enumerate(matches):
        updated = update_event_group_match_score(
            organization.id,
            event.id,
            match.id,
            EventMatchScoreUpdate(score_a=index + 1, score_b=0),
            tournament_db,
            manager,
        )
    assert updated.completed_matches == updated.total_matches

    finalized = finalize_event_group_stage(
        organization.id,
        event.id,
        tournament_db,
        manager,
    )
    assert finalized.locked
    assert sum(
        standing.qualified
        for group in finalized.groups
        for standing in group.standings
    ) == 2
    assert (
        tournament_db.scalar(
            select(OrganizationEventMatch).where(
                OrganizationEventMatch.event_id == event.id
            )
        )
        is not None
    )
    assert (
        len(
            tournament_db.scalars(
                select(OrganizationEventGroupMember).where(
                    OrganizationEventGroupMember.qualified_seed.is_not(None)
                )
            ).all()
        )
        == 2
    )

    with pytest.raises(HTTPException) as caught:
        update_event_group_match_score(
            organization.id,
            event.id,
            matches[0].id,
            EventMatchScoreUpdate(score_a=0, score_b=9),
            tournament_db,
            manager,
        )
    assert caught.value.status_code == 409
    assert caught.value.detail["code"] == "GROUP_STAGE_LOCKED"


def test_noro_demo_seed_creates_complete_groups_and_ready_bracket(
    tournament_db,
):
    noro = User(
        id=uuid.uuid4(),
        email="noro.michel159@gmail.com",
        nickname="nick",
    )
    organization = Organization(
        id=uuid.uuid4(),
        owner_user_id=noro.id,
        name="Noro – testovací pavúk",
        slug="noro-testovaci-pavuk-20260728",
    )
    tournament_format = TournamentFormat(
        id=uuid.uuid4(),
        code="GROUPS_THEN_ELIMINATION",
        name="Groups then elimination",
    )
    tournament_db.add_all([noro, organization, tournament_format])
    users = {noro.email: noro}
    for index in range(11):
        player = User(
            id=uuid.uuid4(),
            email=f"demo{index}@example.test",
            nickname=f"demo{index}",
        )
        users[player.email] = player
        tournament_db.add(player)
    tournament_db.commit()

    import scripts.seed_demo_users as seed_module

    original_players = seed_module.PLAYERS
    seed_module.PLAYERS = [
        (
            user.email,
            user.nickname,
            "Demo",
            "Player",
            date(2000, 1, 1),
            "male",
            "Bratislava",
        )
        for user in users.values()
    ]
    try:
        event = seed_noro_groups_tournament(
            tournament_db,
            noro,
            users,
            organization,
            tournament_format,
        )
        tournament_db.commit()
        seed_noro_groups_tournament(
            tournament_db,
            noro,
            users,
            organization,
            tournament_format,
        )
        tournament_db.commit()
    finally:
        seed_module.PLAYERS = original_players

    assert event.name == NORO_GROUPS_EVENT_NAME
    assert (
        tournament_db.scalar(
            select(func.count(OrganizationEventRegistration.id)).where(
                OrganizationEventRegistration.event_id == event.id
            )
        )
        == 12
    )
    assert (
        tournament_db.scalar(
            select(func.count(OrganizationEventGroup.id)).where(
                OrganizationEventGroup.event_id == event.id
            )
        )
        == 3
    )
    stage = tournament_db.scalar(
        select(OrganizationEventGroupStage).where(
            OrganizationEventGroupStage.event_id == event.id
        )
    )
    assert stage is not None
    assert stage.locked_at is not None
    assert stage.advancing_count == 8
    assert (
        tournament_db.scalar(
            select(func.count(OrganizationEventGroupMatch.id))
            .join(OrganizationEventGroup)
            .where(OrganizationEventGroup.event_id == event.id)
        )
        == 18
    )
    assert (
        tournament_db.scalar(
            select(func.count(OrganizationEventGroupMember.registration_id))
            .join(OrganizationEventGroup)
            .where(
                OrganizationEventGroup.event_id == event.id,
                OrganizationEventGroupMember.qualified_seed.is_not(None),
            )
        )
        == 8
    )
    bracket_matches = list(
        tournament_db.scalars(
            select(OrganizationEventMatch)
            .where(OrganizationEventMatch.event_id == event.id)
            .order_by(
                OrganizationEventMatch.round_number,
                OrganizationEventMatch.position,
            )
        ).all()
    )
    assert len(bracket_matches) == 7
    assert all(
        match.participant_a_registration_id is not None
        and match.participant_b_registration_id is not None
        for match in bracket_matches[:4]
    )
