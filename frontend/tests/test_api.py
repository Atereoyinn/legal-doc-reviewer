from __future__ import annotations

import os
from unittest.mock import AsyncMock, patch

import pytest


@patch("app.api.upload.extract_pdf_text", return_value="Hello world contract text")
@patch("app.api.upload.build_index")
@patch(
    "app.api.upload.extract_structured_fields",
    new_callable=AsyncMock,
    return_value={
        "buyer_name": "Alice",
        "seller_name": "Bob",
        "property_address": "123 Main St",
        "purchase_price": 250000,
        "completion_date": "2026-06-01",
    },
)
@patch(
    "app.api.upload.analyze_risks",
    return_value={"missing_fields": [], "flags": []},
)
def test_upload_persists_and_returns_aliases(
    _analyze,
    _extract,
    _build_index,
    _pdf,
    client: TestClient,
):
    files = {"file": ("test.pdf", b"%PDF-1.4\n%fake\n", "application/pdf")}
    resp = client.post("/upload", files=files)
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["text"] == "Hello world contract text"
    assert data["structured_data"]["buyer_name"] == "Alice"
    assert data["risk_analysis"]["missing_fields"] == []


def test_documents_list_and_detail(client: TestClient):
    # Seed DB directly (avoid LLM/embeddings in this test)
    from app.db.database import SessionLocal
    from app.db.models import Document

    db = SessionLocal()
    try:
        d = Document(
            filename="seed.pdf",
            raw_text="seed text",
            structured_data={"buyer_name": "X"},
            extracted_json={"buyer_name": "X"},
        )
        db.add(d)
        db.commit()
        doc_id = d.id
    finally:
        db.close()

    resp = client.get("/documents")
    assert resp.status_code == 200, resp.text
    docs = resp.json()["documents"]
    assert any(x["id"] == doc_id for x in docs)

    resp2 = client.get(f"/documents/{doc_id}")
    assert resp2.status_code == 200, resp2.text
    detail = resp2.json()
    assert detail["filename"] == "seed.pdf"
    assert detail["raw_text"] == "seed text"
    assert detail["structured_data"]["buyer_name"] == "X"


@patch(
    "app.api.query.retrieve_with_scores",
    return_value=[
        {"text": "Hello world", "score": 0.9},
        {"text": "other", "score": 0.5},
        {"text": "more", "score": 0.4},
    ],
)
@patch("app.api.query.AsyncOpenAI")
def test_query_returns_sources(mock_openai_cls, _retrieve, client: TestClient):
    os.environ["OPENAI_API_KEY"] = "test"

    # Mock OpenAI client used by /query
    mock_client = mock_openai_cls.return_value
    mock_client.chat.completions.create = AsyncMock(
        return_value=type(
            "Resp",
            (),
            {
                "choices": [
                    type(
                        "Choice",
                        (),
                        {
                            "message": type("Msg", (), {"content": "Answer from doc"})(),
                        },
                    )()
                ]
            },
        )()
    )

    resp = client.post("/query", json={"question": "What is this?"})
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["answer"] == "Answer from doc"
    assert isinstance(data["sources"], list)
    assert len(data["sources"]) == 3
    assert set(data["sources"][0].keys()) == {"text", "score"}
