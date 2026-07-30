from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware

from app.api.router import api_router
from app.api.routes.health import router as health_router
from app.core.config import get_settings
from app.core.middleware import (
    RequestSizeLimitMiddleware,
    SecurityHeadersMiddleware,
)
from app.core.rate_limit import limiter

settings = get_settings()
production = settings.environment == "production"
app = FastAPI(
    title=settings.project_name,
    docs_url=None if production else "/docs",
    redoc_url=None if production else "/redoc",
    openapi_url=None if production else "/openapi.json",
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)
app.add_middleware(
    RequestSizeLimitMiddleware,
    max_bytes=settings.max_request_size_bytes,
)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=settings.allowed_hosts,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "If-None-Match"],
    expose_headers=["ETag"],
)
app.include_router(health_router)
app.include_router(api_router)


@app.exception_handler(RequestValidationError)
async def validation_error_handler(_: Request, exc: RequestValidationError):
    errors = [
        {
            key: value
            for key, value in error.items()
            if key not in {"ctx", "input"}
        }
        for error in exc.errors()
    ]
    return JSONResponse(status_code=422, content={"detail": errors})
