import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.database import Base, get_db
from app.main import app
from app.seed_data import seed_database
from app.models import User
from app.auth import create_access_token

TEST_SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

test_engine = create_engine(
    TEST_SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=test_engine)
    db = TestingSessionLocal()
    seed_database(db, force=True)
    db.close()
    yield
    Base.metadata.drop_all(bind=test_engine)

@pytest.fixture
def db_session():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()

@pytest.fixture
def user1(db_session):
    return db_session.query(User).filter(User.username == "aris_vance").first()

@pytest.fixture
def user2(db_session):
    return db_session.query(User).filter(User.username == "priya_sharma").first()

@pytest.fixture
def auth_headers_user1(user1):
    token = create_access_token(user_id=user1.id, username=user1.username)
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def auth_headers_user2(user2):
    token = create_access_token(user_id=user2.id, username=user2.username)
    return {"Authorization": f"Bearer {token}"}
