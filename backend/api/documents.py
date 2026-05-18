from __future__ import annotations

from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Path, Request
from pydantic import BaseModel
from sqlalchemy.exc import SQLAlchemyError

from backend.api.auth import require_api_key
from backend.api.limiter import limiter
from backend.db.database import SessionLocal
from backend.db.models import Document

router = APIRouter()


class DocumentListItem(BaseModel):
    id: int
    filename: str
    created_at: datetime
    doc_type: str | None = None


class DocumentListResponse(BaseModel):
    documents: list[DocumentListItem]


class DocumentDetailResponse(BaseModel):
    id: int
    filename: str
    created_at: datetime
    raw_text: str
    structured_data: dict[str, Any]
    doc_type: str | None = None


@router.get("/documents", response_model=DocumentListResponse, dependencies=[Depends(require_api_key)])
@limiter.limit("30/minute")
def list_documents(request: Request) -> DocumentListResponse:
    db = SessionLocal()
    try:
        rows = db.query(Document).order_by(Document.created_at.desc()).all()
        docs = [
            DocumentListItem(
                id=r.id,
                filename=r.filename,
                created_at=r.created_at,
                doc_type=r.doc_type,
            )
            for r in rows
        ]
        return DocumentListResponse(documents=docs)
    except SQLAlchemyError:
        raise HTTPException(status_code=500, detail="Failed to load documents.")
    finally:
        db.close()


@router.get("/documents/{doc_id}", response_model=DocumentDetailResponse, dependencies=[Depends(require_api_key)])
@limiter.limit("30/minute")
def get_document(request: Request, doc_id: int = Path(..., gt=0)) -> DocumentDetailResponse:
    db = SessionLocal()
    try:
        doc = db.query(Document).filter(Document.id == doc_id).first()
        if doc is None:
            raise HTTPException(status_code=404, detail="Document not found.")

        structured = doc.structured_data or doc.extracted_json or {}
        return DocumentDetailResponse(
            id=doc.id,
            filename=doc.filename,
            created_at=doc.created_at,
            raw_text=doc.raw_text or "",
            structured_data=structured,
            doc_type=doc.doc_type,
        )
    except HTTPException:
        raise
    except SQLAlchemyError:
        raise HTTPException(status_code=500, detail="Failed to load document.")
    finally:
        db.close()
