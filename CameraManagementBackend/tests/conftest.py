"""
Pytest configuration and fixtures for Camera Management tests.
Uses SQLite in-memory for fast, isolated integration tests.
"""
import pytest
from typing import Generator
from uuid import UUID, uuid4
from unittest.mock import patch

from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

# --- Monkey-patch database module BEFORE importing app/models ---
import infrastructure.persistence.database as _db_mod

# StaticPool ensures all connections share the same in-memory database
_test_engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)


@event.listens_for(_test_engine, "connect")
def _set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


# Replace the module-level engine so that Base.metadata.create_all inside
# init_db() targets SQLite instead of the production Postgres.
_db_mod.engine = _test_engine
_db_mod.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=_test_engine)

# Now import app (which imports models, registering them with Base)
from main import app  # noqa: E402
from infrastructure.persistence.database import Base, get_db  # noqa: E402
from api.dependencies.auth_deps import get_current_user, CurrentUser  # noqa: E402
from infrastructure.persistence.models import (  # noqa: E402, F401
    CameraModel,
    CameraAccessModel,
    CameraHealthModel,
    ZoneModel,
)

TEST_USER_ID = UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")
TEST_USER_EMAIL = "testuser@example.com"

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=_test_engine)


@pytest.fixture(scope="function")
def db_session() -> Generator[Session, None, None]:
    """Create a fresh database for each test."""
    Base.metadata.create_all(bind=_test_engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=_test_engine)


@pytest.fixture(scope="function")
def client(db_session: Session) -> Generator[TestClient, None, None]:
    """Create a test client with DB and auth overrides."""

    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    async def override_get_current_user():
        return CurrentUser(id=TEST_USER_ID, email=TEST_USER_EMAIL, token="test-token")

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()


@pytest.fixture
def seed_camera(db_session: Session):
    """Insert a camera owned by TEST_USER and return its id."""
    camera_id = uuid4()
    camera = CameraModel(
        id=camera_id,
        owner_user_id=TEST_USER_ID,
        name="Test Cam",
        description=None,
        stream_url="rtsp://example.com/stream",
        protocol="RTSP",
        username=None,
        password=None,
        resolution="1080p",
        fps=30,
        encoding="H.264",
        status="online",
        camera_type="indoor",
        is_active=True,
    )
    db_session.add(camera)
    db_session.commit()
    return camera_id
