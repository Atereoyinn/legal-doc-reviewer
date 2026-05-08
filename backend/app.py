from contextlib import asynccontextmanager
from fastapi import FastAPI

from backend.api.documents import router as documents_router
from backend.api.query import router as query_router
from backend.api.upload import router as upload_router
from backend.db.database import init_db

from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware 

load_dotenv()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Handles startup and shutdown events.
    """
    # Actions to run on startup
    init_db()
    yield
    # Actions to run on shutdown (if any) can go here


def create_app() -> FastAPI:
    app = FastAPI(
        title="AI-Powered Legal Document Processing API",
        lifespan=lifespan
    )

    # ADD CORS MIDDLEWARE
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"], # In production, replace "*" with your specific frontend URL
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    app.include_router(upload_router)
    app.include_router(query_router)
    app.include_router(documents_router)

    return app


app = create_app()