from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_active_user
from app.models.user import User

router = APIRouter(prefix="/rankings", tags=["rankings"])

@router.get("")
def rankings(kind: str = Query("players", pattern="^(players|teams)$"), sport: str = "all", db: Session = Depends(get_db), _: User = Depends(get_current_active_user)):
    entity = "u" if kind == "players" else "t"
    xp_table = "player_sport_xp" if kind == "players" else "team_sport_xp"
    join = "users u ON u.id = x.user_id" if kind == "players" else "teams t ON t.id = x.team_id"
    label = "COALESCE(u.nickname, u.display_name, 'hráč')" if kind == "players" else "t.name"
    filter_sql = "" if sport == "all" else "WHERE s.code = :sport"
    rows = db.execute(text(f"SELECT {label} AS name, SUM(x.xp) AS xp, MAX(s.name) FILTER (WHERE s.code = :sport) AS sport_name FROM {xp_table} x JOIN {join} JOIN sports s ON s.id=x.sport_id {filter_sql} GROUP BY {entity}.id, {label} ORDER BY xp DESC, name LIMIT 50"), {"sport": sport}).mappings().all()
    sports = db.execute(text("SELECT code, name FROM sports WHERE is_active ORDER BY name")).mappings().all()
    return {"items": [{"rank": index + 1, "name": row["name"], "xp": int(row["xp"]), "sport": row["sport_name"]} for index, row in enumerate(rows)], "sports": [dict(row) for row in sports]}
