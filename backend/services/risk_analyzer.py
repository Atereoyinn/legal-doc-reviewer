from __future__ import annotations

from typing import Any, TypedDict


class RiskAnalysis(TypedDict):
    missing_fields: list[str]
    flags: list[str]


# Define required fields and validation rules per document type
DOCUMENT_TYPE_RULES = {
    "property_sale": {
        "required_fields": ["buyer_name", "seller_name", "property_address", "purchase_price", "completion_date"],
        "numeric_ranges": {
            "purchase_price": {"min": 10_000, "max": 10_000_000},
        },
    },
    "tenancy": {
        "required_fields": ["tenant_name", "landlord", "rent", "property_address"],
        "numeric_ranges": {
            "rent": {"min": 100, "max": 100_000},
            "deposit": {"min": 100, "max": 1_000_000},
        },
    },
    "employment": {
        "required_fields": ["employee_name", "employer", "position"],
        "numeric_ranges": {
            "salary": {"min": 15_000, "max": 10_000_000},
        },
    },
    "nda": {
        "required_fields": ["party1", "party2", "effective_date"],
        "numeric_ranges": {},
    },
}


def analyze_risks(structured: dict[str, Any], doc_type: str) -> RiskAnalysis:
    """
    Deterministic, rule-based checks over extracted structured fields.
    
    Rules are specific to the document type:
    - Flag missing required fields for that type
    - Flag numeric fields if they fall outside realistic ranges
    - Flag missing important dates
    """
    rules = DOCUMENT_TYPE_RULES.get(doc_type, {})
    required_fields = rules.get("required_fields", [])
    numeric_ranges = rules.get("numeric_ranges", {})

    missing_fields: list[str] = []
    for key in required_fields:
        v = structured.get(key)
        if v is None:
            missing_fields.append(key)
        elif isinstance(v, str) and not v.strip():
            missing_fields.append(key)

    flags: list[str] = []

    # Check for missing required fields
    if missing_fields:
        flags.append(f"Missing required fields: {', '.join(missing_fields)}.")

    # Validate numeric ranges
    for field_name, range_info in numeric_ranges.items():
        value = structured.get(field_name)
        if value is None:
            # Only flag as missing if it's in the required fields; otherwise skip
            if field_name not in required_fields:
                continue
            flags.append(f"Missing {field_name}.")
        else:
            try:
                num_value = float(value)
                min_val = range_info.get("min")
                max_val = range_info.get("max")
                
                if min_val is not None and num_value < min_val:
                    flags.append(f"{field_name} appears unrealistically low (< {min_val}).")
                elif max_val is not None and num_value > max_val:
                    flags.append(f"{field_name} appears unrealistically high (> {max_val}).")
            except (TypeError, ValueError):
                flags.append(f"{field_name} is not a valid number.")

    return {"missing_fields": missing_fields, "flags": flags}


