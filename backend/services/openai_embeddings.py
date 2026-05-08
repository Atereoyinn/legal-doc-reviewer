from __future__ import annotations

import os
from typing import Iterable


from openai import OpenAI


class OpenAIEmbeddingsError(RuntimeError):
    """Raised when embedding creation fails."""


def get_openai_client() -> OpenAI:
    """Create a synchronous OpenAI client using `OPENAI_API_KEY`."""
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise OpenAIEmbeddingsError("OPENAI_API_KEY is not set.")
    return OpenAI(api_key=api_key)


def embed_texts(client: OpenAI, *, model: str, texts: Iterable[str]) -> list[list[float]]:
    """
    Embed a list/iterable of texts using OpenAI embeddings.

    Returns vectors in the same order as the provided (non-empty) input texts.
    """
    items = [t for t in texts if t and t.strip()]
    if not items:
        return []

    try:
        resp = client.embeddings.create(model=model, input=items)
    except Exception as e:
        raise OpenAIEmbeddingsError("OpenAI embeddings request failed.") from e

    vectors = [d.embedding for d in resp.data]
    if not vectors:
        raise OpenAIEmbeddingsError("Embeddings API returned no vectors.")
    return vectors

