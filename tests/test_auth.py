"""Authentication and authorization tests."""

from __future__ import annotations


def test_login_success_and_me(admin_client):
    resp = admin_client.get("/api/auth/me")
    assert resp.status_code == 200
    assert resp.json()["email"] == "admin@test.local"
    assert resp.json()["role"] == "admin"


def test_login_bad_credentials(client):
    resp = client.post(
        "/api/auth/login", json={"email": "admin@test.local", "password": "wrong"}
    )
    assert resp.status_code == 401


def test_protected_route_requires_auth(client):
    resp = client.get("/api/companies")
    assert resp.status_code == 401


def test_logout_clears_session(admin_client):
    assert admin_client.get("/api/auth/me").status_code == 200
    admin_client.post("/api/auth/logout")
    assert admin_client.get("/api/auth/me").status_code == 401
