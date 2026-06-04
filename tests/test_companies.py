"""Company and share-type CRUD tests."""

from __future__ import annotations


def _make_company(client, reg="REG-100"):
    return client.post(
        "/api/companies",
        json={"name": "Test Co", "registration_number": reg, "currency": "USD"},
    )


def test_create_and_get_company(admin_client):
    resp = _make_company(admin_client)
    assert resp.status_code == 201
    cid = resp.json()["id"]
    got = admin_client.get(f"/api/companies/{cid}")
    assert got.status_code == 200
    assert got.json()["name"] == "Test Co"


def test_duplicate_registration_number_rejected(admin_client):
    assert _make_company(admin_client, "REG-DUP").status_code == 201
    assert _make_company(admin_client, "REG-DUP").status_code == 409


def test_share_type_unique_code_per_company(admin_client):
    cid = _make_company(admin_client, "REG-ST").json()["id"]
    payload = {"name": "Ordinary", "code": "ORD", "nominal_value": 1.0}
    assert admin_client.post(f"/api/companies/{cid}/share-types", json=payload).status_code == 201
    assert admin_client.post(f"/api/companies/{cid}/share-types", json=payload).status_code == 409


def test_share_type_list_scoped_to_company(admin_client):
    c1 = _make_company(admin_client, "REG-A").json()["id"]
    c2 = _make_company(admin_client, "REG-B").json()["id"]
    admin_client.post(f"/api/companies/{c1}/share-types",
                      json={"name": "Ordinary", "code": "ORD"})
    assert len(admin_client.get(f"/api/companies/{c1}/share-types").json()) == 1
    assert len(admin_client.get(f"/api/companies/{c2}/share-types").json()) == 0
