from __future__ import annotations

import logging
import os

from fastapi import Header, HTTPException

logger = logging.getLogger(__name__)


async def require_api_key(x_api_key: str = Header(default="")) -> None:
    required = os.getenv("API_KEY", "")
    if not required:
        logger.warning("API_KEY env var not set — authentication is disabled (dev mode)")
        return
    if x_api_key != required:
        raise HTTPException(status_code=403, detail="Forbidden")
