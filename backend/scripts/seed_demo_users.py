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

from sqlalchemy import select

from app.core.database import SessionLocal
from app.models.user import User
from app.services.catalogs import get_catalog


PLAYERS = [
    ("adam.kovac@example.test", "adam_3x3", "Adam", "Kováč", date(2005, 3, 14), "male", "Bratislava"),
    ("nina.horvathova@example.test", "nina_hoops", "Nina", "Horváthová", date(2006, 8, 2), "female", "Košice"),
    ("matej.novak@example.test", "matej_jump", "Matej", "Novák", date(2004, 11, 25), "male", "Žilina"),
    ("sara.kralova@example.test", "sara_ball", "Sára", "Kráľová", date(2007, 1, 19), "female", "Nitra"),
    ("jakub.varga@example.test", "jako_33", "Jakub", "Varga", date(2005, 6, 8), "male", "Prešov"),
    ("lea.malikova@example.test", "lea_sport", "Lea", "Malíková", date(2006, 9, 30), "female", "Trnava"),
]


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
        print(f"Created {added} demo players.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
