from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy import DateTime, Integer, String, Text
from sqlalchemy.dialects.sqlite import JSON
from sqlalchemy.orm import Mapped, mapped_column

from backend.db.database import Base


class Document(Base):
    """
    Stores extracted structured data for an uploaded legal document.

    Fields:
        id: Unique document identifier
        filename: Original uploaded filename
        doc_type: Classified document type (property_sale, tenancy, employment, nda)
        raw_text: Full extracted text content from PDF
        structured_data: Extracted structured fields as JSON
        extracted_json: Legacy field (deprecated, kept for backward compatibility)
        created_at: UTC timestamp when document was uploaded
    """

    __tablename__ = "documents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    filename: Mapped[str] = mapped_column(String, nullable=False)
    doc_type: Mapped[str] = mapped_column(String, nullable=False, default="unknown")
    raw_text: Mapped[str] = mapped_column(Text, nullable=False, default="")
    structured_data: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    extracted_json: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
