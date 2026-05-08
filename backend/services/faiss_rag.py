from __future__ import annotations

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
    chunk_size: int = 1200  # characters
    chunk_overlap: int = 200  # characters
    top_k: int = 5
    embedding_model: str = "text-embedding-3-small"


_CONFIG = FAISSRAGConfig()
_INDEX: faiss.Index | None = None
_CHUNKS: list[str] = []
_DIM: int | None = None


class RetrievedChunk(TypedDict):
    text: str
    score: float


def _l2_normalize(v: np.ndarray) -> np.ndarray:
    """L2-normalize vectors row-wise (in-place safe)."""
    norms = np.linalg.norm(v, axis=1, keepdims=True)
    norms[norms == 0] = 1.0
    return v / norms


def build_index(text: str) -> None:
    """
    Build/overwrite an in-memory FAISS index for the given document text.
    """
    global _INDEX, _CHUNKS, _DIM

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

    _INDEX = index
    _CHUNKS = chunks
    _DIM = dim


def retrieve(question: str, *, top_k: int | None = None) -> list[str]:
    """
    Retrieve top-k relevant chunks from the current FAISS index.
    """
    if _INDEX is None or _DIM is None or not _CHUNKS:
        raise FAISSRAGError("FAISS index not initialized. Upload/index a document first.")

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
    k = max(1, min(k, len(_CHUNKS)))  # clamp to index size

    _, idxs = _INDEX.search(q, k)
    indices = [int(i) for i in idxs[0] if int(i) >= 0]
    return [_CHUNKS[i] for i in indices]


def retrieve_with_scores(question: str, *, top_k: int | None = None) -> list[RetrievedChunk]:
    """
    Retrieve top-k relevant chunks plus similarity scores.

    Scores are cosine similarities mapped to [0, 1] via (cos + 1) / 2.
    """
    if _INDEX is None or _DIM is None or not _CHUNKS:
        raise FAISSRAGError("FAISS index not initialized. Upload/index a document first.")

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
    k = max(1, min(k, len(_CHUNKS)))

    scores, idxs = _INDEX.search(q, k)
    out: list[RetrievedChunk] = []
    for score, idx in zip(scores[0], idxs[0], strict=False):
        i = int(idx)
        if i < 0:
            continue
        # Map cosine similarity [-1, 1] to [0, 1]
        mapped = float((float(score) + 1.0) / 2.0)
        if mapped < 0.0:
            mapped = 0.0
        if mapped > 1.0:
            mapped = 1.0
        out.append({"text": _CHUNKS[i], "score": mapped})
    return out

