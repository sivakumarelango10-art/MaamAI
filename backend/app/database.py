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
    connect_args = {"connect_timeout": 5}
    # PostgreSQL configuration tuned for serverless & Supabase poolers
    # pool_pre_ping prevents dead connection errors on severed idle sockets
    # pool_recycle ensures stale connections are periodically reconnected
    engine = create_engine(
        db_url,
        pool_pre_ping=True,
        pool_recycle=300,
        pool_size=5,
        max_overflow=2,
        connect_args=connect_args,
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
    In development SQLite, checks for legacy columns and creates tables locally.
    In production PostgreSQL, schema is managed strictly via explicit Alembic migrations;
    serverless cold starts MUST NOT perform schema inspection, create_all, or DDL.
    """
    if settings.ENVIRONMENT.lower() == "production":
        # Production schema is managed via Alembic migrations. Never run DDL on cold starts.
        return

    if settings.get_database_url().startswith("sqlite"):
        try:
            inspector = inspect(engine)
            if "briefings" in inspector.get_table_names():
                columns = [c["name"] for c in inspector.get_columns("briefings")]
                if "user_id" not in columns:
                    Base.metadata.drop_all(bind=engine)
            Base.metadata.create_all(bind=engine)
        except Exception as e:
            import logging
            logging.getLogger("uvicorn.error").warning("Development SQLite init skipped: %s", e)
