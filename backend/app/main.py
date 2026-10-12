import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError
from app.config import settings
from app.database import engine, Base, SessionLocal, init_and_migrate_db
from app.seed_data import seed_database
from app.routers import (
    auth,
    oauth,
    health,
    briefing,
    emails,
    drafts,
    calendar,
    tasks,
    activity,
    settings as settings_router,
)

logger = logging.getLogger("uvicorn.error")

def _log_startup_diagnostics():
    """Log presence and validity of configuration without printing any secrets."""
    is_prod = settings.ENVIRONMENT.lower() == "production"
    db_configured = bool(settings.DATABASE_URL)
    db_dialect = "sqlite" if settings.get_database_url().startswith("sqlite") else "postgresql"
    jwt_configured = bool(settings.JWT_SECRET_KEY)
    fernet_configured = bool(settings.OAUTH_TOKEN_ENCRYPTION_KEY)
    google_client_id_configured = bool(
        settings.GOOGLE_CLIENT_ID and not settings.GOOGLE_CLIENT_ID.startswith("placeholder")
    )
    google_secret_configured = bool(
        settings.GOOGLE_CLIENT_SECRET and not settings.GOOGLE_CLIENT_SECRET.startswith("placeholder")
    )

    logger.info(
        "MaamAI Startup Diagnostics: env=%s, db_configured=%s, db_dialect=%s, "
        "jwt_key_set=%s, fernet_key_set=%s, google_client_id_set=%s, google_secret_set=%s",
        settings.ENVIRONMENT,
        db_configured,
        db_dialect,
        jwt_configured,
        fernet_configured,
        google_client_id_configured,
        google_secret_configured,
    )

@asynccontextmanager
async def lifespan(app: FastAPI):
    _log_startup_diagnostics()
    # In development SQLite, initialize tables non-destructively.
    # In production, schema is managed strictly via Alembic; cold starts never run DDL.
    if settings.ENVIRONMENT.lower() != "production":
        try:
            init_and_migrate_db()
        except Exception as e:
            logger.warning("Development database initialization warning: %s", e)
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="MaamAI - Multi-User Executive AI Assistant for Academic Staff",
    lifespan=lifespan,
)

# HTTP Security Headers Middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), camera=(), microphone=()"
    if settings.ENVIRONMENT.lower() == "production":
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response

# CORS Middleware with restricted origin list
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)

# Database Error Handling (Fail-safe 503 rather than 500 crash)
@app.exception_handler(SQLAlchemyError)
async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError):
    logger.error("Database connectivity error while serving %s: %s", request.url.path, exc)
    return JSONResponse(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        content={"detail": "Database service is temporarily unavailable. Please try again shortly."},
    )

# Include Routers under /api
app.include_router(health.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(oauth.router, prefix="/api")
app.include_router(briefing.router, prefix="/api")
app.include_router(emails.router, prefix="/api")
app.include_router(drafts.router, prefix="/api")
app.include_router(calendar.router, prefix="/api")
app.include_router(tasks.router, prefix="/api")
app.include_router(activity.router, prefix="/api")
app.include_router(settings_router.router, prefix="/api")

@app.get("/")
@app.get("/api")
def root():
    return {
        "app": "MaamAI Backend",
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "docs_url": "/docs" if settings.ENVIRONMENT.lower() != "production" else None,
        "health_check": "/api/health",
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
