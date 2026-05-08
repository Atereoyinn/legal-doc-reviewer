from __future__ import annotations

from typing import Final


def chunk_text(
    text: str,
    *,
    chunk_size: int,
    chunk_overlap: int,
    min_break_ratio: float = 0.6,
) -> list[str]:
    """
    Chunk text into overlapping windows (character-based) with a best-effort attempt
    to avoid breaking in the middle of words.

    This function is intentionally simple and deterministic to keep retrieval behavior
    stable across runs.
    """
    cleaned = " ".join(text.split())
    if not cleaned:
        return []

    if chunk_overlap >= chunk_size:
        raise ValueError("chunk_overlap must be smaller than chunk_size.")

    # If we can find a whitespace boundary after this position, we prefer it.
    min_break_pos: Final[int] = int(chunk_size * min_break_ratio)

    chunks: list[str] = []
    start = 0
    n = len(cleaned)
    while start < n:
        end = min(start + chunk_size, n)
        if end < n:
            last_space = cleaned.rfind(" ", start, end)
            if last_space > start + min_break_pos:
                end = last_space

        chunk = cleaned[start:end].strip()
        if chunk:
            chunks.append(chunk)

        # Move forward but keep overlap.
        start = max(end - chunk_overlap, end)
        if start >= n:
            break

    return chunks

