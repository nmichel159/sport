"""Create idempotent demo players for local development.

Run inside the backend container with: ``python scripts/seed_demo_users.py``.
They are real user rows, so their unique nicknames can immediately be used when
adding players to a team.  The script never changes an existing account.
"""
from datetime import date, datetime, timezone
from pathlib import Path
import sys

# ``python scripts/seed_demo_users.py`` sets sys.path to /app/scripts.
# Add the backend root so the application package is importable in Docker.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import select, text

from app.core.database import SessionLocal
from app.models.user import (
    AuthIdentity,
    Organization,
    OrganizationEvent,
    OrganizationEventGroup,
    OrganizationEventGroupMatch,
    OrganizationEventGroupMember,
    OrganizationEventGroupStage,
    OrganizationEventMatch,
    OrganizationEventRegistration,
    OrganizationMember,
    Team,
    TeamMember,
    TournamentFormat,
    User,
)
from app.services.brackets import (
    balanced_round_robin_groups,
    rank_group,
    round_robin_pairs,
    seeded_single_elimination_layout,
    select_group_qualifiers,
)
from app.services.catalogs import get_catalog


PLAYERS = [
    ("noro.michel159@gmail.com", "nick", "Noro", "Micheľ Mich3l", date(1995, 5, 12), "male", "Bratislava"),
    ("norbert.michel@sport.local", "norbert_michel", "Norbert", "Michel", date(1995, 5, 12), "male", "Bratislava"),
    ("adam.kovac@example.test", "adam_3x3", "Adam", "Kováč", date(2005, 3, 14), "male", "Bratislava"),
    ("nina.horvathova@example.test", "nina_hoops", "Nina", "Horváthová", date(2006, 8, 2), "female", "Košice"),
    ("matej.novak@example.test", "matej_jump", "Matej", "Novák", date(2004, 11, 25), "male", "Žilina"),
    ("sara.kralova@example.test", "sara_ball", "Sára", "Kráľová", date(2007, 1, 19), "female", "Nitra"),
    ("jakub.varga@example.test", "jako_33", "Jakub", "Varga", date(2005, 6, 8), "male", "Prešov"),
    ("lea.malikova@example.test", "lea_sport", "Lea", "Malíková", date(2006, 9, 30), "female", "Trnava"),
    ("tomas.benes@example.test", "tomas_goal", "Tomáš", "Beneš", date(2004, 4, 11), "male", "Bratislava"),
    ("ema.sedlakova@example.test", "ema_play", "Ema", "Sedláková", date(2006, 2, 21), "female", "Košice"),
    ("michal.urban@example.test", "miso_fast", "Michal", "Urban", date(2005, 10, 6), "male", "Žilina"),
    ("zuzana.blahova@example.test", "zuzka_team", "Zuzana", "Blahová", date(2007, 7, 17), "female", "Nitra"),
]

NORO_GOOGLE_SUBJECT = "112593596799709738455"
NORO_64_PLAYER_EVENT_NAME = "64-player test bracket"

# Separate player accounts for a complete 64-slot elimination bracket. Keeping
# their identifiers deterministic makes the seed safe to run repeatedly.
BRACKET_64_PLAYERS = [
    (
        f"bracket.player.{number:02d}@example.test",
        f"bracket_player_{number:02d}",
        f"Player {number:02d}",
        "Bracket",
        date(2000 + number % 8, number % 12 + 1, number % 28 + 1),
        "male" if number % 2 else "female",
        "Bratislava",
    )
    for number in range(1, 65)
]
NORO_GROUPS_EVENT_NAME = "Demo – skupiny + pavúk – 12 hráčov"


def school_for_city(schools: list[dict[str, object]], city: str) -> str:
    return next(str(school["code"]) for school in schools if city.casefold() in str(school["municipality"]).casefold())


def create_persisted_bracket(
    db,
    event: OrganizationEvent,
    registrations: list[OrganizationEventRegistration],
) -> None:
    bracket_size, round_count, first_round_pairs = (
        seeded_single_elimination_layout(registrations)
    )
    matches: dict[tuple[int, int], OrganizationEventMatch] = {}
    for round_number in range(1, round_count + 1):
        match_count = bracket_size // (2**round_number)
        for position in range(match_count):
            pair = (
                first_round_pairs[position]
                if round_number == 1
                else None
            )
            match = OrganizationEventMatch(
                event_id=event.id,
                round_number=round_number,
                position=position,
                participant_a_registration_id=pair[0].id if pair else None,
                participant_b_registration_id=(
                    pair[1].id if pair and pair[1] else None
                ),
            )
            db.add(match)
            matches[(round_number, position)] = match
    db.flush()

    for position, pair in enumerate(first_round_pairs):
        if pair[1] is None:
            match = matches[(1, position)]
            match.winner_registration_id = pair[0].id
            if round_count > 1:
                following = matches[(2, position // 2)]
                if position % 2 == 0:
                    following.participant_a_registration_id = pair[0].id
                else:
                    following.participant_b_registration_id = pair[0].id


def seed_noro_groups_tournament(
    db,
    noro: User,
    users: dict[str, User],
    organization: Organization,
    tournament_format: TournamentFormat,
) -> OrganizationEvent:
    event = db.scalar(
        select(OrganizationEvent).where(
            OrganizationEvent.organization_id == organization.id,
            OrganizationEvent.name == NORO_GROUPS_EVENT_NAME,
        )
    )
    if not event:
        event = OrganizationEvent(
            organization_id=organization.id,
            created_by_user_id=noro.id,
            name=NORO_GROUPS_EVENT_NAME,
            sport="Basketbal",
            participation_type="INDIVIDUAL",
            format_id=tournament_format.id,
            event_date=date(2026, 8, 22),
            location="Bratislava – testovacia hala",
            description=(
                "Hotová ukážka dvojfázového turnaja: 3 skupiny po 4 "
                "hráčoch, odohrané skupiny a 8 postupujúcich v pavúku."
            ),
            fee=0,
        )
        db.add(event)
        db.flush()
    else:
        event.format_id = tournament_format.id

    registrations: list[OrganizationEventRegistration] = []
    for email, *_ in PLAYERS:
        registration = db.scalar(
            select(OrganizationEventRegistration).where(
                OrganizationEventRegistration.event_id == event.id,
                OrganizationEventRegistration.user_id == users[email].id,
            )
        )
        if not registration:
            registration = OrganizationEventRegistration(
                event_id=event.id,
                user_id=users[email].id,
            )
            db.add(registration)
            db.flush()
        registrations.append(registration)

    existing_stage = db.scalar(
        select(OrganizationEventGroupStage).where(
            OrganizationEventGroupStage.event_id == event.id
        )
    )
    if existing_stage:
        return event

    grouped = balanced_round_robin_groups(
        registrations,
        group_count=3,
        seed=event.id.int,
    )
    stage = OrganizationEventGroupStage(
        event_id=event.id,
        group_count=3,
        advancing_count=8,
        locked_at=datetime(2026, 7, 29, 12, 0, tzinfo=timezone.utc),
    )
    db.add(stage)
    db.flush()

    ranked_groups = []
    members: list[OrganizationEventGroupMember] = []
    for group_position, group_registrations in enumerate(grouped):
        group = OrganizationEventGroup(
            event_id=event.id,
            position=group_position,
            name=f"Skupina {chr(ord('A') + group_position)}",
        )
        db.add(group)
        db.flush()

        for seed_position, registration in enumerate(group_registrations):
            member = OrganizationEventGroupMember(
                group_id=group.id,
                registration_id=registration.id,
                seed_position=seed_position,
            )
            db.add(member)
            members.append(member)

        results = []
        for match_position, pair in enumerate(
            round_robin_pairs(group_registrations)
        ):
            score_a = 1 + ((match_position + group_position) % 4)
            score_b = (match_position * 2 + group_position) % 3
            winner_id = (
                pair[0].id
                if score_a > score_b
                else pair[1].id if score_b > score_a else None
            )
            db.add(
                OrganizationEventGroupMatch(
                    group_id=group.id,
                    position=match_position,
                    participant_a_registration_id=pair[0].id,
                    participant_b_registration_id=pair[1].id,
                    score_a=score_a,
                    score_b=score_b,
                    winner_registration_id=winner_id,
                )
            )
            results.append((pair[0].id, pair[1].id, score_a, score_b))
        ranked_groups.append(
            rank_group(
                [registration.id for registration in group_registrations],
                results,
            )
        )

    qualifiers = select_group_qualifiers(ranked_groups, advancing_count=8)
    qualifier_seed = {
        standing.participant: index + 1
        for index, standing in enumerate(qualifiers)
    }
    for member in members:
        member.qualified_seed = qualifier_seed.get(member.registration_id)

    registration_by_id = {
        registration.id: registration for registration in registrations
    }
    create_persisted_bracket(
        db,
        event,
        [
            registration_by_id[standing.participant]
            for standing in qualifiers
        ],
    )
    return event


def seed_noro_64_player_bracket(
    db,
    noro: User,
    users: dict[str, User],
    organization: Organization,
    tournament_format: TournamentFormat,
) -> OrganizationEvent:
    event = db.scalar(
        select(OrganizationEvent).where(
            OrganizationEvent.organization_id == organization.id,
            OrganizationEvent.name == NORO_64_PLAYER_EVENT_NAME,
        )
    )
    if not event:
        event = OrganizationEvent(
            organization_id=organization.id,
            created_by_user_id=noro.id,
            name=NORO_64_PLAYER_EVENT_NAME,
            sport="Basketbal",
            participation_type="INDIVIDUAL",
            format_id=tournament_format.id,
            event_date=date(2026, 8, 23),
            location="Bratislava - test hall",
            description="Demo elimination bracket with 64 players.",
            fee=0,
        )
        db.add(event)
        db.flush()
    else:
        event.format_id = tournament_format.id

    registrations = []
    for email, *_ in BRACKET_64_PLAYERS:
        registration = db.scalar(
            select(OrganizationEventRegistration).where(
                OrganizationEventRegistration.event_id == event.id,
                OrganizationEventRegistration.user_id == users[email].id,
            )
        )
        if not registration:
            registration = OrganizationEventRegistration(
                event_id=event.id,
                user_id=users[email].id,
            )
            db.add(registration)
            db.flush()
        registrations.append(registration)

    if not db.scalar(
        select(OrganizationEventMatch.id).where(
            OrganizationEventMatch.event_id == event.id
        )
    ):
        create_persisted_bracket(db, event, registrations)
    return event


def main() -> None:
    _, schools = get_catalog("schools")
    db = SessionLocal()
    try:
        added = 0
        for email, nickname, first_name, last_name, birth_date, gender, city in (
            PLAYERS + BRACKET_64_PLAYERS
        ):
            if db.scalar(select(User).where(User.email == email)):
                continue
            db.add(User(email=email, email_verified=True, nickname=nickname, first_name=first_name, last_name=last_name, birth_date=birth_date, gender=gender, display_name=f"{first_name} {last_name}", school_code=school_for_city(schools, city), district_city=city, onboarding_completed=True))
            added += 1
        db.commit()
        users = {
            user.email: user
            for user in db.scalars(
                select(User).where(
                    User.email.in_(
                        [player[0] for player in PLAYERS + BRACKET_64_PLAYERS]
                    )
                )
            ).all()
        }
        noro = users["noro.michel159@gmail.com"]
        if not db.scalar(select(AuthIdentity).where(AuthIdentity.provider == "GOOGLE", AuthIdentity.provider_subject == NORO_GOOGLE_SUBJECT)):
            db.add(AuthIdentity(user_id=noro.id, provider="GOOGLE", provider_subject=NORO_GOOGLE_SUBJECT, provider_email=noro.email, provider_email_verified=True))
        sara = users["sara.kralova@example.test"]
        norbert = users["norbert.michel@sport.local"]
        adam = users["adam.kovac@example.test"]

        organization = db.scalar(select(Organization).where(Organization.slug == "sara-ball-3x3"))
        if not organization:
            organization = Organization(name="Sára Ball 3x3", slug="sara-ball-3x3", owner_user_id=sara.id)
            db.add(organization)
            db.flush()
        for user, role in ((sara, "ADMIN"), (norbert, "MEMBER")):
            if not db.get(OrganizationMember, {"organization_id": organization.id, "user_id": user.id}):
                db.add(OrganizationMember(organization_id=organization.id, user_id=user.id, role=role))

        event_specs = [
            ("Letný 3x3 turnaj", "Basketbal", "INDIVIDUAL", date(2026, 8, 15), "Bratislava", "Otvorený letný turnaj 3x3.", 0),
            ("Sára Ball Autumn Cup", "Basketbal", "TEAM", date(2026, 9, 12), "Bratislava", "Tímový turnaj pre školské tímy.", 5),
        ]
        events: dict[str, OrganizationEvent] = {}
        for name, sport, participation_type, event_date, location, description, fee in event_specs:
            event = db.scalar(select(OrganizationEvent).where(OrganizationEvent.organization_id == organization.id, OrganizationEvent.name == name))
            if not event:
                event = OrganizationEvent(organization_id=organization.id, created_by_user_id=sara.id, name=name, sport=sport, participation_type=participation_type, event_date=event_date, location=location, description=description, fee=fee)
                db.add(event)
                db.flush()
            events[name] = event

        registered_event = events["Letný 3x3 turnaj"]
        if not db.scalar(select(OrganizationEventRegistration).where(OrganizationEventRegistration.event_id == registered_event.id, OrganizationEventRegistration.user_id == norbert.id)):
            db.add(OrganizationEventRegistration(event_id=registered_event.id, user_id=norbert.id))

        single_elimination = db.scalar(select(TournamentFormat).where(TournamentFormat.code == "SINGLE_ELIMINATION", TournamentFormat.is_active.is_(True)))
        if not single_elimination:
            raise RuntimeError("The SINGLE_ELIMINATION tournament format is missing.")
        groups_then_elimination = db.scalar(
            select(TournamentFormat).where(
                TournamentFormat.code == "GROUPS_THEN_ELIMINATION",
                TournamentFormat.is_active.is_(True),
            )
        )
        if not groups_then_elimination:
            raise RuntimeError(
                "The GROUPS_THEN_ELIMINATION tournament format is missing."
            )
        noro_organization = db.scalar(select(Organization).where(Organization.slug == "noro-testovaci-pavuk-20260728"))
        if not noro_organization:
            noro_organization = Organization(name="Noro – testovací pavúk", slug="noro-testovaci-pavuk-20260728", owner_user_id=noro.id)
            db.add(noro_organization)
            db.flush()
        if not db.get(OrganizationMember, {"organization_id": noro_organization.id, "user_id": noro.id}):
            db.add(OrganizationMember(organization_id=noro_organization.id, user_id=noro.id, role="ADMIN"))
        noro_event = db.scalar(select(OrganizationEvent).where(OrganizationEvent.organization_id == noro_organization.id, OrganizationEvent.name == "Testovací pavúk – 5 hráčov"))
        if not noro_event:
            noro_event = OrganizationEvent(organization_id=noro_organization.id, created_by_user_id=noro.id, name="Testovací pavúk – 5 hráčov", sport="Basketball", participation_type="INDIVIDUAL", format_id=single_elimination.id, event_date=date(2026, 7, 28), location="Testovacie ihrisko", description="Demo event na overenie generovania vyraďovacieho pavúka.")
            db.add(noro_event)
            db.flush()
        elif noro_event.format_id is None:
            noro_event.format_id = single_elimination.id
        for email in ("adam.kovac@example.test", "nina.horvathova@example.test", "matej.novak@example.test", "sara.kralova@example.test", "jakub.varga@example.test"):
            if not db.scalar(select(OrganizationEventRegistration).where(OrganizationEventRegistration.event_id == noro_event.id, OrganizationEventRegistration.user_id == users[email].id)):
                db.add(OrganizationEventRegistration(event_id=noro_event.id, user_id=users[email].id))

        seed_noro_groups_tournament(
            db,
            noro,
            users,
            noro_organization,
            groups_then_elimination,
        )
        seed_noro_64_player_bracket(
            db,
            noro,
            users,
            noro_organization,
            single_elimination,
        )

        for code, name in (("basketball", "Basketbal"), ("football", "Futbal"), ("floorball", "Florbal")):
            db.execute(text("INSERT INTO sports (code, name) VALUES (:code, :name) ON CONFLICT (code) DO NOTHING"), {"code": code, "name": name})
        db.flush()
        sport_ids = {row.code: row.id for row in db.execute(text("SELECT id, code FROM sports WHERE code IN ('basketball','football','floorball')")).all()}
        teams = [("Bratislava Ballers", "bratislava-ballers", norbert, (norbert, sara, adam)), ("Košice Hoops", "kosice-hoops", nina := users["nina.horvathova@example.test"], (nina, matej := users["matej.novak@example.test"], lea := users["lea.malikova@example.test"])), ("Jump Crew", "jump-crew", users["jakub.varga@example.test"], (users["jakub.varga@example.test"], adam))]
        for team_name, team_code, owner, members in teams:
            team = db.scalar(select(Team).where(Team.team_code == team_code))
            if not team:
                team = Team(name=team_name, team_code=team_code, owner_user_id=owner.id); db.add(team); db.flush()
            for member in members:
                if not db.get(TeamMember, {"team_id": team.id, "user_id": member.id}): db.add(TeamMember(team_id=team.id, user_id=member.id))
            for code, xp in (("basketball", 900 + len(team_name) * 11), ("football", 300 + len(team_name) * 7), ("floorball", 200 + len(team_name) * 5)):
                db.execute(text("INSERT INTO team_sport_xp (team_id, sport_id, xp) VALUES (:team_id, :sport_id, :xp) ON CONFLICT (team_id, sport_id) DO UPDATE SET xp=EXCLUDED.xp"), {"team_id": team.id, "sport_id": sport_ids[code], "xp": xp})
        player_xp = {"norbert.michel@sport.local": (1240, 180, 90), "adam.kovac@example.test": (1160, 420, 160), "nina.horvathova@example.test": (1410, 110, 80), "matej.novak@example.test": (980, 760, 220), "sara.kralova@example.test": (1320, 260, 120), "jakub.varga@example.test": (740, 990, 310), "lea.malikova@example.test": (1090, 350, 680)}
        for email, values in player_xp.items():
            for code, xp in zip(("basketball", "football", "floorball"), values):
                db.execute(text("INSERT INTO player_sport_xp (user_id, sport_id, xp) VALUES (:user_id, :sport_id, :xp) ON CONFLICT (user_id, sport_id) DO UPDATE SET xp=EXCLUDED.xp"), {"user_id": users[email].id, "sport_id": sport_ids[code], "xp": xp})
        db.commit()
        print(
            f"Created {added} demo players, Sára's organization, Noro's "
            "five-player bracket, and Noro's 12-player groups tournament."
        )
    finally:
        db.close()


if __name__ == "__main__":
    main()
