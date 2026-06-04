"""Seed the database with a sample company, share types and shareholders."""

from __future__ import annotations

from datetime import date

from sqlalchemy import select

from app.bootstrap import init_db
from app.database import SessionLocal
from app.models import Company, Shareholder, ShareholderType, ShareType
from app.services import issuance


def run() -> None:
    init_db()
    db = SessionLocal()
    try:
        if db.scalar(select(Company).where(Company.registration_number == "REG-0001")):
            print("Seed data already present; skipping.")
            return

        acme = Company(
            name="Acme Holdings Ltd",
            registration_number="REG-0001",
            incorporation_date=date(2020, 1, 15),
            jurisdiction="UK",
            authorized_capital=1_000_000,
            currency="GBP",
        )
        db.add(acme)
        db.flush()

        ordinary = ShareType(
            company_id=acme.id, name="Ordinary", code="ORD",
            nominal_value=1.0, currency="GBP", voting_rights=True,
            authorized_shares=100_000,
        )
        preferred = ShareType(
            company_id=acme.id, name="Preferred", code="PREF",
            nominal_value=1.0, currency="GBP", voting_rights=False,
            dividend_rights="5% cumulative", authorized_shares=50_000,
        )
        db.add_all([ordinary, preferred])

        alice = Shareholder(type=ShareholderType.individual, name="Alice Founder",
                            identifier="P123456", email="alice@example.com")
        bob = Shareholder(type=ShareholderType.individual, name="Bob Investor",
                          identifier="P654321", email="bob@example.com")
        fund = Shareholder(type=ShareholderType.entity, name="Seed Fund LLC",
                           identifier="REG-FUND-9", email="fund@example.com")
        db.add_all([alice, bob, fund])
        db.commit()

        issuance.issue_shares(db, share_type_id=ordinary.id, shareholder_id=alice.id,
                              quantity=60_000, reference="Founders allotment", actor="seed")
        issuance.issue_shares(db, share_type_id=ordinary.id, shareholder_id=bob.id,
                              quantity=20_000, reference="Seed round", actor="seed")
        issuance.issue_shares(db, share_type_id=preferred.id, shareholder_id=fund.id,
                              quantity=30_000, reference="Preferred round", actor="seed")
        issuance.transfer_shares(db, company_id=acme.id, share_type_id=ordinary.id,
                                 from_shareholder_id=alice.id, to_shareholder_id=fund.id,
                                 quantity=5_000, reference="Secondary sale", actor="seed")

        print("Seeded sample company 'Acme Holdings Ltd' with share types, holders and ledger.")
    finally:
        db.close()


if __name__ == "__main__":
    run()
