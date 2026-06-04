"""HTMX management-UI flow tests (form handlers returning partials)."""

from __future__ import annotations


def _login_admin(client):
    assert client.post(
        "/api/auth/login", json={"email": "admin@test.local", "password": "test-pass-123"}
    ).status_code == 200


def test_create_company_via_ui(admin_client):
    resp = admin_client.post(
        "/ui/companies",
        data={"name": "UI Co", "registration_number": "REG-UI", "currency": "USD"},
    )
    assert resp.status_code == 200
    assert "UI Co" in resp.text
    assert 'id="companies-body"' in resp.text


def test_create_company_duplicate_shows_error(admin_client):
    admin_client.post("/ui/companies", data={"name": "A", "registration_number": "REG-D"})
    resp = admin_client.post("/ui/companies", data={"name": "B", "registration_number": "REG-D"})
    assert resp.status_code == 200
    assert "must be unique" in resp.text


def test_share_type_and_issue_flow_via_ui(admin_client):
    admin_client.post("/ui/companies", data={"name": "Flow", "registration_number": "REG-UIF"})
    # Need the company id; fetch from API.
    company_id = admin_client.get("/api/companies").json()[-1]["id"]

    # Add share class
    resp = admin_client.post(
        f"/ui/companies/{company_id}/share-types",
        data={"name": "Ordinary", "code": "ORD", "nominal_value": "1",
              "authorized_shares": "1000", "voting_rights": "on"},
    )
    assert resp.status_code == 200
    assert "ORD" in resp.text
    st_id = admin_client.get(f"/api/companies/{company_id}/share-types").json()[0]["id"]

    # Add shareholder
    admin_client.post("/ui/shareholders", data={"name": "Alice", "type": "individual"})
    sh_id = admin_client.get("/api/shareholders").json()[0]["id"]

    # Issue shares via UI
    resp = admin_client.post(
        f"/ui/companies/{company_id}/issue",
        data={"share_type_id": st_id, "shareholder_id": sh_id, "quantity": "100"},
    )
    assert resp.status_code == 200
    assert "Alice" in resp.text
    assert "C-00001" in resp.text  # certificate appears

    # Over-capacity issue surfaces an error in the partial
    resp = admin_client.post(
        f"/ui/companies/{company_id}/issue",
        data={"share_type_id": st_id, "shareholder_id": sh_id, "quantity": "99999"},
    )
    assert resp.status_code == 200
    assert "exceeds available" in resp.text


def test_shareholder_create_search_delete_via_ui(admin_client):
    admin_client.post("/ui/shareholders", data={"name": "Zara Holder", "type": "entity"})
    # Search
    resp = admin_client.get("/ui/shareholders/search", params={"q": "Zara"})
    assert resp.status_code == 200
    assert "Zara Holder" in resp.text
    # Negative search
    resp = admin_client.get("/ui/shareholders/search", params={"q": "nobody"})
    assert "No shareholders found" in resp.text
    # Delete
    sh_id = admin_client.get("/api/shareholders").json()[0]["id"]
    resp = admin_client.delete(f"/ui/shareholders/{sh_id}")
    assert resp.status_code == 200
    assert "Zara Holder" not in resp.text


def test_ui_mutation_forbidden_for_viewer(client, db_session):
    from app.models import User, UserRole
    from app.security import hash_password

    db_session.add(
        User(email="v@test.local", hashed_password=hash_password("vpass1234"),
             role=UserRole.viewer, is_active=True)
    )
    db_session.commit()
    client.post("/api/auth/login", json={"email": "v@test.local", "password": "vpass1234"})
    resp = client.post("/ui/companies", data={"name": "X", "registration_number": "R-UV"})
    assert resp.status_code == 403


def test_pages_render(admin_client):
    assert admin_client.get("/").status_code == 200
    assert admin_client.get("/shareholders").status_code == 200
