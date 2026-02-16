"""Alembic environment configuration."""
from logging.config import fileConfig
import sys
from pathlib import Path

from sqlalchemy import engine_from_config, pool, create_engine
from alembic import context

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from infrastructure.config.settings import get_settings
from infrastructure.persistence.database import Base

# Import all models to register them with Base
from infrastructure.persistence.models import StreamSessionModel  # noqa: F401

config = context.config

# Get database URL from settings (not using set_main_option due to % encoding issues)
settings = get_settings()
DATABASE_URL = settings.database_url

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    context.configure(
        url=DATABASE_URL,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    # Create engine directly with the URL to avoid configparser % issues
    connectable = create_engine(DATABASE_URL, poolclass=pool.NullPool)

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
