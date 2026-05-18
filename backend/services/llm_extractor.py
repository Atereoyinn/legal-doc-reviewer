from __future__ import annotations

import json
import os
from typing import Any

from openai import AsyncOpenAI


class LLMExtractionError(RuntimeError):
    """Raised when the LLM extractor fails or returns invalid output."""

from backend.services import openai_embeddings

DOCUMENT_TYPES = {
    "property_sale": {
        "fields": ["buyer_name", "seller_name", "property_address", "purchase_price", "completion_date"],
        "description": "Property sales agreement or conveyancing document",
    },
    "tenancy": {
        "fields": ["tenant_name", "landlord", "rent", "deposit", "lease_start_date", "lease_end_date", "property_address"],
        "description": "Tenancy or rental agreement",
    },
    "employment": {
        "fields": ["employee_name", "employer", "salary", "start_date", "end_date", "position"],
        "description": "Employment contract or agreement",
    },
    "nda": {
        "fields": ["party1", "party2", "effective_date", "term_length", "confidentiality_period"],
        "description": "Non-Disclosure Agreement",
    },
}


def _as_str_or_none(v: Any) -> str | None:
    if v is None:
        return None
    if isinstance(v, str):
        s = v.strip()
        return s or None
    return None


def _as_float_or_none(v: Any) -> float | None:
    if v is None:
        return None
    if isinstance(v, (int, float)):
        return float(v)
    if isinstance(v, str):
        s = v.strip()
        if not s:
            return None
        cleaned = (
            s.replace(",", "")
            .replace("£", "")
            .replace("$", "")
            .replace("₦", "")
            .replace("€", "")
        ).strip()
        try:
            return float(cleaned)
        except ValueError:
            return None
    return None


def _coerce_output(data: Any, doc_type: str) -> dict[str, Any]:
    if not isinstance(data, dict):
        raise LLMExtractionError("Model output was not a JSON object.")

    expected_fields = DOCUMENT_TYPES.get(doc_type, {}).get("fields", [])
    output: dict[str, Any] = {}

    for field in expected_fields:
        raw_value = data.get(field)
        
        if field in ["purchase_price", "salary", "rent", "deposit", "term_length"]:
            output[field] = _as_float_or_none(raw_value)
        else:
            output[field] = _as_str_or_none(raw_value)
    
    return output


async def classify_document_type(text: str) -> str:
    if not text or not text.strip():
        raise LLMExtractionError("No text provided for classification.")

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise LLMExtractionError("OPENAI_API_KEY is not set.")

    model = os.getenv("OPENAI_CHAT_MODEL", "gpt-3.5-turbo")
    client = AsyncOpenAI(api_key=api_key)

    doc_type_descriptions = "\n".join(
        f"- {doc_type}: {info['description']}"
        for doc_type, info in DOCUMENT_TYPES.items()
    )

    system = (
        "You are a document classifier. Classify the given legal document into ONE of these types:\n"
        f"{doc_type_descriptions}\n\n"
        "Return ONLY a JSON object with a 'type' key containing the document type string.\n"
        "If uncertain, choose the most likely type based on keywords and content."
    )

    user = (
        "Classify the document type from the text below:\n\n"
        "-----\n"
        f"{text[:2000]}\n"
        "-----"
    )

    try:
        resp = await client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            temperature=0,
            response_format={"type": "json_object"},
        )
    except Exception as e:
        raise LLMExtractionError("OpenAI classification request failed.") from e

    content = (resp.choices[0].message.content or "").strip()
    if not content:
        raise LLMExtractionError("Classification model returned empty output.")

    try:
        parsed = json.loads(content)
        doc_type = parsed.get("type", "unknown").lower()
        
        if doc_type not in DOCUMENT_TYPES:
            doc_type = "property_sale"
        
        return doc_type
    except json.JSONDecodeError as e:
        raise LLMExtractionError("Classification model did not return valid JSON.") from e


async def extract_structured_fields(text: str) -> tuple[str, dict[str, Any]]:
    if not text or not text.strip():
        raise LLMExtractionError("No text provided for extraction.")

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise LLMExtractionError("OPENAI_API_KEY is not set.")

    model = os.getenv("OPENAI_CHAT_MODEL", "gpt-3.5-turbo")

    doc_type = await classify_document_type(text)

    expected_fields = DOCUMENT_TYPES[doc_type]["fields"]
    fields_str = ", ".join(expected_fields)

    system = (
        f"You are extracting structured data from a {doc_type} document.\n"
        f"Return ONLY a single JSON object with EXACTLY these keys:\n"
        f"{fields_str}\n"
        "Rules:\n"
        "- If a field is missing/unclear, use null.\n"
        "- Do not guess or hallucinate.\n"
        "- Numeric fields must be numbers or null (no currency symbols).\n"
        "- Date fields must be strings or null (prefer ISO-8601 when possible).\n"
        "- Output must be valid JSON with no extra text."
    )

    user = (
        f"Extract the {doc_type} fields from the document text below.\n\n"
        "Document text:\n"
        "-----\n"
        f"{text}\n"
        "-----"
    )

    client = AsyncOpenAI(api_key=api_key)

    try:
        resp = await client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            temperature=0,
            response_format={"type": "json_object"},
        )
    except Exception as e:
        raise LLMExtractionError("OpenAI extraction request failed.") from e

    content = (resp.choices[0].message.content or "").strip()
    if not content:
        raise LLMExtractionError("Model returned empty output.")

    try:
        parsed = json.loads(content)
    except json.JSONDecodeError as e:
        raise LLMExtractionError("Model did not return valid JSON.") from e

    structured = _coerce_output(parsed, doc_type)
    return doc_type, structured


