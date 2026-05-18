from __future__ import annotations

import threading
from dataclasses import dataclass
from typing import Final, TypedDict

import faiss
import numpy as np

from backend.services.openai_embeddings import (
    OpenAIEmbeddingsError,
    embed_texts,
    get_openai_client,
)
from backend.services.text_chunking import chunk_text


class FAISSRAGError(RuntimeError):
    """Raised when FAISS RAG indexing or retrieval fails."""


@dataclass(frozen=True)
class FAISSRAGConfig:
    chunk_size: int = 1200
    chunk_overlap: int = 200
    top_k: int = 5
    embedding_model: str = "text-embedding-3-small"


_CONFIG = FAISSRAGConfig()
_LOCK = threading.Lock()
# Per-document indexes: doc_id -> (index, chunks, dim)
_INDEXES: dict[int, tuple[faiss.Index, list[str], int]] = {}
_LAST_DOC_ID: int | None = None


class RetrievedChunk(TypedDict):
    text: str
    score: float


def _l2_normalize(v: np.ndarray) -> np.ndarray:
    norms = np.linalg.norm(v, axis=1, keepdims=True)
    norms[norms == 0] = 1.0
    return v / norms


def build_index(text: str, doc_id: int) -> None:
    global _LAST_DOC_ID

    if not text or not text.strip():
        raise FAISSRAGError("No text provided to index.")

    chunks = chunk_text(text, chunk_size=_CONFIG.chunk_size, chunk_overlap=_CONFIG.chunk_overlap)
    if not chunks:
        raise FAISSRAGError("Text produced no chunks to index.")

    try:
        client = get_openai_client()
        vectors = embed_texts(client, model=_CONFIG.embedding_model, texts=chunks)
    except OpenAIEmbeddingsError as e:
        raise FAISSRAGError(str(e)) from e

    embeddings = np.array(vectors, dtype="float32")
    if embeddings.size == 0:
        raise FAISSRAGError("No embeddings generated.")
    if embeddings.ndim != 2 or embeddings.shape[0] != len(chunks):
        raise FAISSRAGError("Unexpected embeddings shape returned by API.")

    embeddings = _l2_normalize(embeddings)
    dim = int(embeddings.shape[1])

    # Cosine similarity via inner product on L2-normalized vectors.
    index = faiss.IndexFlatIP(dim)
    index.add(embeddings)

    with _LOCK:
        _INDEXES[doc_id] = (index, chunks, dim)
        _LAST_DOC_ID = doc_id


def _resolve_index(doc_id: int | None) -> tuple[faiss.Index, list[str], int]:
    """Return the index for the given doc_id, or the most recently uploaded one."""
    with _LOCK:
        effective_id = doc_id if doc_id is not None else _LAST_DOC_ID
        if effective_id is None or effective_id not in _INDEXES:
            raise FAISSRAGError("No document index found. Upload a document first.")
        return _INDEXES[effective_id]


def retrieve(question: str, doc_id: int | None = None, *, top_k: int | None = None) -> list[str]:
    index, chunks, dim = _resolve_index(doc_id)

    if not question or not question.strip():
        raise FAISSRAGError("Question is empty.")

    try:
        client = get_openai_client()
        q_vectors = embed_texts(client, model=_CONFIG.embedding_model, texts=[question])
    except OpenAIEmbeddingsError as e:
        raise FAISSRAGError(str(e)) from e

    q = np.array(q_vectors, dtype="float32")
    if q.size == 0:
        raise FAISSRAGError("Failed to embed question.")

    q = _l2_normalize(q)
    k_default: Final[int] = _CONFIG.top_k
    k = int(top_k or k_default)
    k = max(1, min(k, len(chunks)))

    _, idxs = index.search(q, k)
    indices = [int(i) for i in idxs[0] if int(i) >= 0]
    return [chunks[i] for i in indices]


def retrieve_with_scores(
    question: str,
    doc_id: int | None = None,
    *,
    top_k: int | None = None,
) -> list[RetrievedChunk]:
    """Retrieve top-k relevant chunks with cosine similarity scores mapped to [0, 1]."""
    index, chunks, dim = _resolve_index(doc_id)

    if not question or not question.strip():
        raise FAISSRAGError("Question is empty.")

    try:
        client = get_openai_client()
        q_vectors = embed_texts(client, model=_CONFIG.embedding_model, texts=[question])
    except OpenAIEmbeddingsError as e:
        raise FAISSRAGError(str(e)) from e

    q = np.array(q_vectors, dtype="float32")
    if q.size == 0:
        raise FAISSRAGError("Failed to embed question.")

    q = _l2_normalize(q)
    k_default: Final[int] = _CONFIG.top_k
    k = int(top_k or k_default)
    k = max(1, min(k, len(chunks)))

    scores, idxs = index.search(q, k)
    out: list[RetrievedChunk] = []
    for score, idx in zip(scores[0], idxs[0], strict=False):
        i = int(idx)
        if i < 0:
            continue
        mapped = float((float(score) + 1.0) / 2.0)
        mapped = max(0.0, min(1.0, mapped))
        out.append({"text": chunks[i], "score": mapped})
    return out
