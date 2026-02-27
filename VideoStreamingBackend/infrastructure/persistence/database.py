"""Database connection and session management."""
from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, declarative_base, sessionmaker

from infrastructure.config.settings import get_settings

settings = get_settings()

import ssl

_ssl_context = ssl.create_default_context()

engine = create_engine(
    settings.database_url,
    connect_args={"ssl_context": _ssl_context},
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """Dependency to get database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """Initialize database tables."""
    # Import models to register them with Base
    from infrastructure.persistence.models import StreamSessionModel  # noqa: F401
    Base.metadata.create_all(bind=engine)
