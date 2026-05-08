from __future__ import annotations

import os

from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker


def _sqlite_url() -> str:
    """Return the configured SQLite URL (defaults to local `./app.db`)."""
    return os.getenv("DATABASE_URL", "sqlite:///./app.db")


engine = create_engine(
    _sqlite_url(),
    connect_args={"check_same_thread": False},
    future=True,
)

SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False, future=True)


class Base(DeclarativeBase):
    """SQLAlchemy declarative base."""
    pass


# app/db/database.py refactor
def init_db() -> None:
    from app.db import models  # noqa: F401
    Base.metadata.create_all(bind=engine)

    with engine.begin() as conn:
        cols = conn.execute(text("PRAGMA table_info(documents)")).fetchall()
        existing = {row[1] for row in cols}

        if "raw_text" not in existing:
            conn.execute(text("ALTER TABLE documents ADD COLUMN raw_text TEXT NOT NULL DEFAULT ''"))
        if "structured_data" not in existing:
            conn.execute(text("ALTER TABLE documents ADD COLUMN structured_data JSON"))
        
        # ADD THIS BLOCK for the new doc_type field
        if "doc_type" not in existing:
            conn.execute(text("ALTER TABLE documents ADD COLUMN doc_type TEXT NOT NULL DEFAULT 'unknown'"))