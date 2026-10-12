from sqlalchemy import create_engine, text, inspect
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import settings

db_url = settings.get_database_url()

if db_url.startswith("sqlite"):
    engine = create_engine(
        db_url,
        connect_args={"check_same_thread": False}
    )
else:
    # PostgreSQL configuration tuned for serverless & Supabase poolers
    # pool_pre_ping prevents dead connection errors on severed idle sockets
    # pool_recycle ensures stale connections are periodically reconnected
    engine = create_engine(
        db_url,
        pool_pre_ping=True,
        pool_recycle=300,
        pool_size=5,
        max_overflow=2,
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def check_db_health() -> dict:
    """Safe database connectivity test without revealing internal connection strings."""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        is_sqlite = settings.get_database_url().startswith("sqlite")
        return {
            "status": "healthy",
            "dialect": "sqlite" if is_sqlite else "postgresql",
        }
    except Exception:
        return {
            "status": "unhealthy",
            "dialect": "unknown",
        }

def init_and_migrate_db():
    """
    Initializes database schema.
    In development SQLite, checks for legacy Phase 1 columns and recreates if needed.
    In production PostgreSQL, ensures schema is not blindly dropped or recreated on every cold start.
    """
    if settings.get_database_url().startswith("sqlite"):
        inspector = inspect(engine)
        if "briefings" in inspector.get_table_names():
            columns = [c["name"] for c in inspector.get_columns("briefings")]
            if "user_id" not in columns:
                if settings.ENVIRONMENT.lower() != "production":
                    Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)
    else:
        # In production PostgreSQL, schema should be managed via Alembic migrations.
        # Provide non-destructive fallback if tables do not exist yet.
        inspector = inspect(engine)
        if "users" not in inspector.get_table_names():
            Base.metadata.create_all(bind=engine)
