from fastapi import APIRouter

from app.api.routes import users

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(users.router)
