from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
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

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize and migrate SQLite tables on startup
    init_and_migrate_db()
    
    # Only seed demo accounts in development/demo mode; NEVER in production
    if settings.ENVIRONMENT.lower() != "production":
        db = SessionLocal()
        try:
            seed_database(db, force=False)
        finally:
            db.close()
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
