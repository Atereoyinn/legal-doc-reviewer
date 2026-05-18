import logging
import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from backend.api.documents import router as documents_router
from backend.api.limiter import limiter
from backend.api.query import router as query_router
from backend.api.upload import router as upload_router
from backend.db.database import init_db

load_dotenv()
logger = logging.getLogger(__name__)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        return response


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


def create_app() -> FastAPI:
    app = FastAPI(title="AI-Powered Legal Document Processing API", lifespan=lifespan)

    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    # CORS: never combine wildcard with allow_credentials=True.
    # Set CORS_ORIGINS to your frontend URL(s) in production.
    raw_origins = os.getenv("CORS_ORIGINS", "").strip()
    if raw_origins and raw_origins != "*":
        origins = [o.strip() for o in raw_origins.split(",") if o.strip()]
        use_credentials = True
    else:
        if raw_origins == "*":
            logger.warning(
                "CORS_ORIGINS=* is unsafe in production. "
                "Set CORS_ORIGINS to your exact frontend origin."
            )
        # Dev fallback — no credentials needed without explicit origins
        origins = ["http://localhost:5173", "http://localhost:3000"]
        use_credentials = False

    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=use_credentials,
        allow_methods=["GET", "POST"],
        allow_headers=["Content-Type", "X-API-Key"],
    )
    app.add_middleware(SecurityHeadersMiddleware)

    app.include_router(upload_router)
    app.include_router(query_router)
    app.include_router(documents_router)

    return app


app = create_app()
