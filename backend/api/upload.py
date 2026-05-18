from __future__ import annotations

import logging
import os
import re
from typing import Any

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile
from sqlalchemy.exc import SQLAlchemyError

from backend.api.auth import require_api_key
from backend.api.limiter import limiter
from backend.db.database import SessionLocal
from backend.db.models import Document
from backend.services.faiss_rag import FAISSRAGError, build_index
from backend.services.llm_extractor import LLMExtractionError, extract_structured_fields
from backend.services.pdf_extractor import PDFExtractionError, extract_pdf_text
from backend.services.risk_analyzer import analyze_risks

router = APIRouter()
logger = logging.getLogger(__name__)

MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB
_SAFE_FILENAME_RE = re.compile(r"[^\w\s\-.]")


def _sanitize_filename(raw: str) -> str:
    name = os.path.basename(raw)
    name = _SAFE_FILENAME_RE.sub("", name)
    return name[:255] or "upload.pdf"


@router.post("/upload", dependencies=[Depends(require_api_key)])
@limiter.limit("5/minute")
async def upload_pdf(request: Request, file: UploadFile = File(...)) -> dict[str, Any]:
    if not file:
        raise HTTPException(status_code=400, detail="No file provided.")

    filename = _sanitize_filename(file.filename or "uploaded.pdf")

    if not filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Invalid file type. Only PDF files are accepted.")

    content_type = (file.content_type or "").lower()
    if content_type not in {"application/pdf", "application/x-pdf"}:
        raise HTTPException(status_code=400, detail="Invalid file type. Expected a PDF.")

    try:
        data = await file.read()
    except Exception:
        raise HTTPException(status_code=400, detail="Could not read uploaded file.")

    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File too large. Maximum size is 10 MB.")

    if not data:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    try:
        text = extract_pdf_text(data)
    except PDFExtractionError as e:
        logger.warning("PDF extraction failed for %s: %s", filename, e)
        raise HTTPException(status_code=400, detail="Could not process the uploaded PDF.")
    except Exception:
        logger.exception("Unexpected error extracting PDF text for %s", filename)
        raise HTTPException(status_code=500, detail="Unexpected error while processing PDF.")

    try:
        doc_type, structured = await extract_structured_fields(text)
    except LLMExtractionError as e:
        logger.warning("LLM extraction failed for %s: %s", filename, e)
        raise HTTPException(status_code=502, detail="Failed to extract structured fields from document.")
    except Exception:
        logger.exception("Unexpected error extracting structured fields for %s", filename)
        raise HTTPException(status_code=502, detail="Unexpected error while extracting structured data.")

    risks = analyze_risks(structured, doc_type)

    # Save to DB first to obtain doc_id, then build the FAISS index scoped to that doc.
    db = SessionLocal()
    try:
        doc = Document(
            filename=filename,
            doc_type=doc_type,
            raw_text=text,
            structured_data=structured,
            extracted_json=structured,
        )
        db.add(doc)
        db.commit()
        doc_id = doc.id
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to save document to database.")
    finally:
        db.close()

    try:
        build_index(text, doc_id)
    except FAISSRAGError as e:
        logger.warning("FAISS index build failed for doc %d: %s", doc_id, e)
        raise HTTPException(status_code=502, detail="Failed to index document for retrieval.")
    except Exception:
        logger.exception("Unexpected error building FAISS index for doc %d", doc_id)
        raise HTTPException(status_code=502, detail="Unexpected error while indexing document.")

    return {
        "id": doc_id,
        "filename": filename,
        "doc_type": doc_type,
        "text": text,
        "structured": structured,
        "risks": risks,
        "structured_data": structured,
        "risk_analysis": risks,
    }
