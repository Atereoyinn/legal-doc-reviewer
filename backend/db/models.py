from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy import DateTime, Integer, String, Text
from sqlalchemy.dialects.sqlite import JSON
from sqlalchemy.orm import Mapped, mapped_column


from backend.db.database import Base


class Document(Base):
    """Stores extracted structured data for an uploaded document."""
    __tablename__ = "documents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    filename: Mapped[str] = mapped_column(String, nullable=False)
    doc_type: Mapped[str] = mapped_column(String, nullable=False, default="unknown")
    raw_text: Mapped[str] = mapped_column(Text, nullable=False, default="")
    structured_data: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    # Backwards-compatible legacy column (pre-history feature). Kept nullable to
    # avoid breaking existing DBs; new writes should use `structured_data`.
    extracted_json: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

