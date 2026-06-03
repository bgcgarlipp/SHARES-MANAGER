"""Issuance, transfer, cancellation and ledger-invariant tests."""

from __future__ import annotations

import pytest

from app.models import EntryType, LedgerEntry
from app.services import holdings, issuance
from app.services.errors import CapacityExceededError, InsufficientSharesError


@pytest.fixture()
def setup_company(db_session):
    from app.models import Company, Shareholder, ShareholderType, ShareType

    company = Company(name="Acme", registration_number="REG-X", currency="USD")
    db_session.add(company)
    db_session.flush()
    st = ShareType(company_id=company.id, name="Ordinary", code="ORD",
                   nominal_value=1.0, authorized_shares=1000)
    db_session.add(st)
    alice = Shareholder(type=ShareholderType.individual, name="Alice")
    bob = Shareholder(type=ShareholderType.individual, name="Bob")
    db_session.add_all([alice, bob])
    db_session.commit()
    return {"company": company, "st": st, "alice": alice, "bob": bob}


def test_issue_creates_certificate_and_ledger_entry(db_session, setup_company):
    s = setup_company
    cert = issuance.issue_shares(
        db_session, share_type_id=s["st"].id, shareholder_id=s["alice"].id, quantity=100
    )
    assert cert.certificate_number == "C-00001"
    assert cert.quantity == 100
    assert holdings.holder_balance(db_session, s["st"].id, s["alice"].id) == 100
    assert holdings.issued_for_share_type(db_session, s["st"].id) == 100


def test_issue_beyond_authorized_rejected(db_session, setup_company):
    s = setup_company
    with pytest.raises(CapacityExceededError):
        issuance.issue_shares(
            db_session, share_type_id=s["st"].id, shareholder_id=s["alice"].id, quantity=1001
        )


def test_transfer_paired_entries_net_zero(db_session, setup_company):
    s = setup_company
    issuance.issue_shares(
        db_session, share_type_id=s["st"].id, shareholder_id=s["alice"].id, quantity=200
    )
    issuance.transfer_shares(
        db_session, company_id=s["company"].id, share_type_id=s["st"].id,
        from_shareholder_id=s["alice"].id, to_shareholder_id=s["bob"].id, quantity=50,
    )
    assert holdings.holder_balance(db_session, s["st"].id, s["alice"].id) == 150
    assert holdings.holder_balance(db_session, s["st"].id, s["bob"].id) == 50
    # Transfer does not change total issued.
    assert holdings.issued_for_share_type(db_session, s["st"].id) == 200


def test_transfer_insufficient_shares_rejected(db_session, setup_company):
    s = setup_company
    issuance.issue_shares(
        db_session, share_type_id=s["st"].id, shareholder_id=s["alice"].id, quantity=10
    )
    with pytest.raises(InsufficientSharesError):
        issuance.transfer_shares(
            db_session, company_id=s["company"].id, share_type_id=s["st"].id,
            from_shareholder_id=s["alice"].id, to_shareholder_id=s["bob"].id, quantity=50,
        )


def test_cancel_reduces_issued_and_marks_certificate(db_session, setup_company):
    s = setup_company
    cert = issuance.issue_shares(
        db_session, share_type_id=s["st"].id, shareholder_id=s["alice"].id, quantity=100
    )
    issuance.cancel_certificate(db_session, certificate_id=cert.id)
    assert holdings.issued_for_share_type(db_session, s["st"].id) == 0
    assert cert.status.value == "cancelled"


def test_holdings_reconcile_to_ledger(db_session, setup_company):
    s = setup_company
    issuance.issue_shares(
        db_session, share_type_id=s["st"].id, shareholder_id=s["alice"].id, quantity=300
    )
    issuance.transfer_shares(
        db_session, company_id=s["company"].id, share_type_id=s["st"].id,
        from_shareholder_id=s["alice"].id, to_shareholder_id=s["bob"].id, quantity=120,
    )
    # Sum of signed ledger quantities equals sum of holdings.
    entries = db_session.query(LedgerEntry).all()
    ledger_net = sum(e.signed_quantity for e in entries)
    company_holdings = holdings.holdings_for_company(db_session, s["company"].id)
    holdings_net = sum(h.quantity for h in company_holdings)
    assert ledger_net == holdings_net == 300


def test_entry_types_present(db_session, setup_company):
    s = setup_company
    issuance.issue_shares(
        db_session, share_type_id=s["st"].id, shareholder_id=s["alice"].id, quantity=10
    )
    issuance.transfer_shares(
        db_session, company_id=s["company"].id, share_type_id=s["st"].id,
        from_shareholder_id=s["alice"].id, to_shareholder_id=s["bob"].id, quantity=5,
    )
    types = {e.entry_type for e in db_session.query(LedgerEntry).all()}
    assert EntryType.ISSUE in types
    assert EntryType.TRANSFER_OUT in types
    assert EntryType.TRANSFER_IN in types
