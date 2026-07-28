"""Create idempotent demo players for local development.

Run inside the backend container with: ``python scripts/seed_demo_users.py``.
They are real user rows, so their unique nicknames can immediately be used when
adding players to a team.  The script never changes an existing account.
"""
from datetime import date
from pathlib import Path
import sys

# ``python scripts/seed_demo_users.py`` sets sys.path to /app/scripts.
# Add the backend root so the application package is importable in Docker.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import select, text

from app.core.database import SessionLocal
from app.models.user import AuthIdentity, Organization, OrganizationEvent, OrganizationEventRegistration, OrganizationMember, Team, TeamMember, TournamentFormat, User
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
]

NORO_GOOGLE_SUBJECT = "112593596799709738455"


def school_for_city(schools: list[dict[str, object]], city: str) -> str:
    return next(str(school["code"]) for school in schools if city.casefold() in str(school["municipality"]).casefold())


def main() -> None:
    _, schools = get_catalog("schools")
    db = SessionLocal()
    try:
        added = 0
        for email, nickname, first_name, last_name, birth_date, gender, city in PLAYERS:
            if db.scalar(select(User).where(User.email == email)):
                continue
            db.add(User(email=email, email_verified=True, nickname=nickname, first_name=first_name, last_name=last_name, birth_date=birth_date, gender=gender, display_name=f"{first_name} {last_name}", school_code=school_for_city(schools, city), district_city=city, onboarding_completed=True))
            added += 1
        db.commit()
        users = {user.email: user for user in db.scalars(select(User).where(User.email.in_([player[0] for player in PLAYERS]))).all()}
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
        print(f"Created {added} demo players, Sára's organization, and Noro's five-player bracket event.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
