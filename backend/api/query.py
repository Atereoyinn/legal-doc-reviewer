from __future__ import annotations

import logging
import os

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from openai import AsyncOpenAI

from backend.api.auth import require_api_key
from backend.api.limiter import limiter
from backend.services.faiss_rag import FAISSRAGError, retrieve_with_scores

router = APIRouter()
logger = logging.getLogger(__name__)


class QueryRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=1000)
    doc_id: int | None = None


class QueryResponse(BaseModel):
    answer: str
    sources: list[dict[str, object]] = []


@router.post("/query", response_model=QueryResponse, dependencies=[Depends(require_api_key)])
@limiter.limit("20/minute")
async def query_document(request: Request, payload: QueryRequest) -> QueryResponse:
    try:
        sources = retrieve_with_scores(payload.question, payload.doc_id, top_k=3)
    except FAISSRAGError as e:
        logger.info("FAISS retrieval failed: %s", e)
        raise HTTPException(status_code=400, detail="No document indexed. Please upload a document first.")
    except Exception:
        logger.exception("Unexpected error retrieving context")
        raise HTTPException(status_code=500, detail="Unexpected error retrieving context.")

    if not sources:
        return QueryResponse(answer="I don't know based on the provided document.", sources=[])

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=502, detail="Service configuration error.")

    model = os.getenv("OPENAI_CHAT_MODEL", "gpt-3.5-turbo")
    client = AsyncOpenAI(api_key=api_key)

    context = "\n\n---\n\n".join(
        f"CHUNK {i+1} (score={s['score']:.2f}):\n{s['text']}" for i, s in enumerate(sources)
    )

    system = (
        "You are a legal document Q&A assistant.\n"
        "Answer the user's question using ONLY the provided document context.\n"
        "If the answer is not in the context, say: \"I don't know based on the provided document.\"\n"
        "Be concise and do not add facts not present in the context."
    )
    user = (
        "DOCUMENT CONTEXT (use this as the only source of truth):\n"
        "-----\n"
        f"{context}\n"
        "-----\n\n"
        f"Question: {payload.question}"
    )

    try:
        resp = await client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            temperature=0,
        )
    except Exception:
        logger.exception("OpenAI request failed")
        raise HTTPException(status_code=502, detail="AI service request failed.")

    answer = (resp.choices[0].message.content or "").strip()
    if not answer:
        answer = "I don't know based on the provided document."
    return QueryResponse(answer=answer, sources=sources)
