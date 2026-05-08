from __future__ import annotations

import os

import pytest


@pytest.fixture(scope="session")
def _configure_db(tmp_path_factory: pytest.TempPathFactory) -> None:
    """
    Configure a stable SQLite file for the whole test session.

    Important: this must run before `app` modules are imported, since the SQLAlchemy
    engine is created at import-time from `DATABASE_URL`.
    """
    db_dir = tmp_path_factory.mktemp("db")
    db_path = db_dir / "pytest.sqlite"
    os.environ["DATABASE_URL"] = f"sqlite:///{db_path}"


@pytest.fixture(scope="session")
def app(_configure_db):  # noqa: ARG001
    from app.main import app as fastapi_app

    return fastapi_app


@pytest.fixture(scope="session")
def _init_db(app):  # noqa: ARG001
    from app.db.database import init_db

    init_db()


@pytest.fixture()
def client(app, _init_db):  # noqa: ARG001
    from starlette.testclient import TestClient

    with TestClient(app) as c:
        yield c
