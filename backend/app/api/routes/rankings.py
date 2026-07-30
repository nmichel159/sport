from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_active_user
from app.models.user import User

router = APIRouter(prefix="/rankings", tags=["rankings"])

PLAYER_RANKINGS = text(
    """
    SELECT COALESCE(u.nickname, u.display_name, 'hráč') AS name,
           SUM(x.xp) AS xp,
           MAX(s.name) FILTER (WHERE s.code = :sport) AS sport_name
    FROM player_sport_xp x
    JOIN users u ON u.id = x.user_id
    JOIN sports s ON s.id = x.sport_id
    WHERE (:include_all OR s.code = :sport)
    GROUP BY u.id, COALESCE(u.nickname, u.display_name, 'hráč')
    ORDER BY xp DESC, name
    LIMIT 50
    """
)

TEAM_RANKINGS = text(
    """
    SELECT t.name AS name,
           SUM(x.xp) AS xp,
           MAX(s.name) FILTER (WHERE s.code = :sport) AS sport_name
    FROM team_sport_xp x
    JOIN teams t ON t.id = x.team_id
    JOIN sports s ON s.id = x.sport_id
    WHERE (:include_all OR s.code = :sport)
    GROUP BY t.id, t.name
    ORDER BY xp DESC, name
    LIMIT 50
    """
)


@router.get("")
def rankings(
    kind: str = Query("players", pattern="^(players|teams)$"),
    sport: str = Query("all", max_length=80),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_active_user),
):
    query = PLAYER_RANKINGS if kind == "players" else TEAM_RANKINGS
    rows = (
        db.execute(query, {"sport": sport, "include_all": sport == "all"})
        .mappings()
        .all()
    )
    sports = (
        db.execute(
            text("SELECT code, name FROM sports WHERE is_active ORDER BY name")
        )
        .mappings()
        .all()
    )
    return {
        "items": [
            {
                "rank": index + 1,
                "name": row["name"],
                "xp": int(row["xp"]),
                "sport": row["sport_name"],
            }
            for index, row in enumerate(rows)
        ],
        "sports": [dict(row) for row in sports],
    }
