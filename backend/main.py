"""
Deployment entry point for the Legal Document Reviewer API.

Used by Procfile: `gunicorn backend.main:app`
"""

from backend.app import app

__all__ = ["app"]
