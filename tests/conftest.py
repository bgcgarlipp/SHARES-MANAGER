"""Test fixtures: isolated in-memory DB and authenticated client."""

from __future__ import annotations

import os

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Use an isolated env before importing the app modules.
os.environ["DATABASE_URL"] = "sqlite://"
os.environ["SECRET_KEY"] = "test-secret"
os.environ["ADMIN_EMAIL"] = "admin@test.local"
os.environ["ADMIN_PASSWORD"] = "test-pass-123"

import app.database as database  # noqa: E402

# Single shared in-memory database across the test session.
test_engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
    future=True,
)
TestingSessionLocal = sessionmaker(
    bind=test_engine, autoflush=False, expire_on_commit=False, future=True
)

# Point the app at the test engine/session.
database.engine = test_engine
database.SessionLocal = TestingSessionLocal


def _override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture()
def db_session():
    from app.bootstrap import init_db

    database.Base.metadata.drop_all(bind=test_engine)
    init_db()
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture()
def client(db_session):
    from app.database import get_db
    from app.main import app

    app.dependency_overrides[get_db] = _override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture()
def admin_client(client):
    resp = client.post(
        "/api/auth/login",
        json={"email": "admin@test.local", "password": "test-pass-123"},
    )
    assert resp.status_code == 200, resp.text
    return client
