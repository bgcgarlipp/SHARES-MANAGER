"""End-to-end API flow and reporting tests."""

from __future__ import annotations


def _bootstrap(admin_client):
    cid = admin_client.post(
        "/api/companies",
        json={"name": "Flow Co", "registration_number": "REG-FLOW", "currency": "USD"},
    ).json()["id"]
    st = admin_client.post(
        f"/api/companies/{cid}/share-types",
        json={"name": "Ordinary", "code": "ORD", "nominal_value": 1.0, "authorized_shares": 500},
    ).json()
    alice = admin_client.post(
        "/api/shareholders", json={"type": "individual", "name": "Alice"}
    ).json()
    bob = admin_client.post(
        "/api/shareholders", json={"type": "entity", "name": "Bob Fund"}
    ).json()
    return cid, st["id"], alice["id"], bob["id"]


def test_full_issue_transfer_report_flow(admin_client):
    cid, st_id, alice_id, bob_id = _bootstrap(admin_client)

    # Issue
    resp = admin_client.post(
        f"/api/companies/{cid}/issue",
        json={"share_type_id": st_id, "shareholder_id": alice_id, "quantity": 300},
    )
    assert resp.status_code == 201, resp.text
    cert_id = resp.json()["id"]

    # Transfer
    resp = admin_client.post(
        "/api/transfers",
        json={
            "company_id": cid, "share_type_id": st_id,
            "from_shareholder_id": alice_id, "to_shareholder_id": bob_id, "quantity": 100,
        },
    )
    assert resp.status_code == 201, resp.text

    # Ledger has 3 entries (ISSUE, TRANSFER_OUT, TRANSFER_IN)
    ledger = admin_client.get(f"/api/companies/{cid}/ledger").json()
    assert len(ledger) == 3

    # Cap table totals and percentages
    cap = admin_client.get(f"/api/companies/{cid}/cap-table").json()
    assert cap["total_issued"] == 300
    pct = {h["shareholder_name"]: h["percentage"] for h in cap["holders"]}
    assert pct["Alice"] == round(200 / 300 * 100, 4)

    # Capital summary
    summary = admin_client.get(f"/api/companies/{cid}/capital-summary").json()
    ord_row = summary["share_types"][0]
    assert ord_row["issued"] == 300
    assert ord_row["available"] == 200

    # Register CSV export
    csv_resp = admin_client.get(f"/api/companies/{cid}/register/export")
    assert csv_resp.status_code == 200
    assert "Shareholder" in csv_resp.text

    # Certificate retrieval + PDF/HTML fallback
    assert admin_client.get(f"/api/certificates/{cert_id}").status_code == 200
    assert admin_client.get(f"/api/certificates/{cert_id}/pdf").status_code == 200


def test_issue_over_capacity_returns_422(admin_client):
    cid, st_id, alice_id, _ = _bootstrap(admin_client)
    resp = admin_client.post(
        f"/api/companies/{cid}/issue",
        json={"share_type_id": st_id, "shareholder_id": alice_id, "quantity": 9999},
    )
    assert resp.status_code == 422


def test_viewer_cannot_mutate(client, db_session):
    from app.models import User, UserRole
    from app.security import hash_password

    db_session.add(
        User(email="viewer@test.local", hashed_password=hash_password("viewer-pass"),
             role=UserRole.viewer, is_active=True)
    )
    db_session.commit()
    client.post("/api/auth/login", json={"email": "viewer@test.local", "password": "viewer-pass"})
    # Viewer can read
    assert client.get("/api/companies").status_code == 200
    # But not create
    resp = client.post(
        "/api/companies", json={"name": "X", "registration_number": "R-V"}
    )
    assert resp.status_code == 403
