from fastapi import APIRouter

from app.api.routes import auth, catalogs, organizations, rankings, teams, tournament_sync, users

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth.router)
api_router.include_router(catalogs.router)
api_router.include_router(users.router)
api_router.include_router(teams.router)
api_router.include_router(organizations.router)
api_router.include_router(tournament_sync.router)
api_router.include_router(rankings.router)
