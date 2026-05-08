from __future__ import annotations


import fitz  # PyMuPDF


class PDFExtractionError(ValueError):
    """Raised when a PDF cannot be parsed or yields no usable text."""


def extract_pdf_text(pdf_bytes: bytes) -> str:
    """
    Extract all text from a PDF byte-string using PyMuPDF.

    Raises `PDFExtractionError` for invalid PDFs, PDFs with no pages, or PDFs
    without extractable text.
    """
    # Fast sanity check for obvious non-PDF uploads.
    if not pdf_bytes.startswith(b"%PDF"):
        raise PDFExtractionError("Invalid PDF file.")

    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    except Exception as e:
        raise PDFExtractionError("Invalid PDF file.") from e

    try:
        if doc.page_count == 0:
            raise PDFExtractionError("PDF contains no pages.")

        parts: list[str] = []
        for page in doc:
            parts.append(page.get_text("text"))

        text = "\n".join(p.strip() for p in parts if p and p.strip()).strip()
        if not text:
            raise PDFExtractionError("PDF contains no extractable text.")

        return text
    finally:
        doc.close()

