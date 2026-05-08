from __future__ import annotations

from typing import Any

from fastapi import APIRouter, File, HTTPException, UploadFile

from sqlalchemy.exc import SQLAlchemyError


from app.db.database import SessionLocal
from app.db.models import Document
from app.services.pdf_extractor import PDFExtractionError, extract_pdf_text
from app.services.faiss_rag import FAISSRAGError, build_index
from app.services.llm_extractor import LLMExtractionError, extract_structured_fields
from app.services.risk_analyzer import analyze_risks

router = APIRouter()


@router.post("/upload")
async def upload_pdf(file: UploadFile = File(...)) -> dict[str, Any]:
    """
    Upload a PDF, extract raw text, index for retrieval, classify document type,
    extract structured fields based on type, run type-specific risk checks,
    and persist the structured extraction to SQLite.
    """
    if not file:
        raise HTTPException(status_code=400, detail="No file provided.")

    filename = file.filename or "uploaded.pdf"

    content_type = (file.content_type or "").lower()
    if content_type not in {"application/pdf", "application/x-pdf"}:
        raise HTTPException(status_code=400, detail="Invalid file type. Expected a PDF.")

    try:
        data = await file.read()
    except Exception:
        raise HTTPException(status_code=400, detail="Could not read uploaded file.")

    if not data:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    try:
        text = extract_pdf_text(data)
    except PDFExtractionError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception:
        raise HTTPException(status_code=500, detail="Unexpected error while processing PDF.")

    # Build/overwrite the in-memory FAISS index for subsequent /query calls.
    try:
        build_index(text)
    except FAISSRAGError as e:
        raise HTTPException(status_code=502, detail=str(e))
    except Exception:
        raise HTTPException(status_code=502, detail="Unexpected error while indexing document for retrieval.")

    # Extract structured fields + classify document type
    try:
        doc_type, structured = await extract_structured_fields(text)
    except LLMExtractionError as e:
        raise HTTPException(status_code=502, detail=str(e))
    except Exception:
        raise HTTPException(status_code=502, detail="Unexpected error while extracting structured data.")

    # Analyze risks using document type-specific rules
    risks = analyze_risks(structured, doc_type)

    # Persist extracted structured JSON + metadata + document type.
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
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to save document to database.")
    finally:
        db.close()

    # Return both legacy and new keys to keep older clients working.
    return {
        "filename": filename,
        "doc_type": doc_type,
        "text": text,
        "structured": structured,
        "risks": risks,
        "structured_data": structured,
        "risk_analysis": risks,
    }

