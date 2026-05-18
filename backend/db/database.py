from __future__ import annotations

import os
from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker


def _db_url() -> str:
    return os.getenv("DATABASE_URL", "sqlite:///./app.db")


def _is_sqlite(url: str) -> bool:
    return url.startswith("sqlite")


_url = _db_url()

engine = create_engine(
    _url,
    connect_args={"check_same_thread": False} if _is_sqlite(_url) else {},
    future=True,
)

# Enable WAL mode for SQLite: better concurrent read performance and crash safety.
if _is_sqlite(_url):
    @event.listens_for(engine, "connect")
    def _set_sqlite_wal(dbapi_conn, _record):
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.close()


SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False, future=True)


class Base(DeclarativeBase):
    """SQLAlchemy declarative base for all ORM models."""
    pass


def init_db() -> None:
    """Initialize database schema and run migrations."""
    from backend.db import models  # noqa: F401

    Base.metadata.create_all(bind=engine)
    _migrate_schema()


def _migrate_schema() -> None:
    """Apply schema migrations (add missing columns)."""
    with engine.begin() as conn:
        result = conn.execute(text("PRAGMA table_info(documents)"))
        existing_columns = {row[1] for row in result.fetchall()}

        migrations = [
            ("raw_text", "ALTER TABLE documents ADD COLUMN raw_text TEXT NOT NULL DEFAULT ''"),
            ("structured_data", "ALTER TABLE documents ADD COLUMN structured_data JSON"),
            ("doc_type", "ALTER TABLE documents ADD COLUMN doc_type TEXT NOT NULL DEFAULT 'unknown'"),
        ]

        for col_name, migration_sql in migrations:
            if col_name not in existing_columns:
                conn.execute(text(migration_sql))
