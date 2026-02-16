"""
Pytest configuration and fixtures.
"""
import pytest
from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from fastapi.testclient import TestClient

from main import app
from infrastructure.persistence.database import Base, get_db
from infrastructure.external.email_sender import MockEmailSender
from infrastructure.config.settings import get_settings

settings = get_settings()

# Use SQLite for testing
TEST_DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False}
)

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db_session() -> Generator[Session, None, None]:
    """
    Create a fresh database session for each test.
    """
    # Create tables
    Base.metadata.create_all(bind=engine)
    
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        # Drop all tables after test
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db_session: Session) -> Generator[TestClient, None, None]:
    """
    Create a test client with database dependency override.
    """
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
def mock_email_sender() -> MockEmailSender:
    """
    Create a mock email sender for testing.
    """
    return MockEmailSender()


@pytest.fixture
def test_user_data() -> dict:
    """
    Sample user data for testing.
    """
    return {
        "email": "test@example.com",
        "username": "testuser",
        "password": "SecurePassword123!"
    }


@pytest.fixture
def weak_password_data() -> dict:
    """
    User data with weak password for testing validation.
    """
    return {
        "email": "test@example.com",
        "username": "testuser",
        "password": "weak"
    }
