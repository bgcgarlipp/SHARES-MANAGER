"""Context builders shared by full-page and HTMX-partial handlers."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Company, LedgerEntry, ShareCertificate, Shareholder, ShareType
from app.services import holdings


def company_body_context(db: Session, company: Company) -> dict:
    """Everything mutable on the company page: capital, holdings, certs, ledger."""
    share_types = db.scalars(
        select(ShareType).where(ShareType.company_id == company.id).order_by(ShareType.code)
    ).all()
    capital = []
    for st in share_types:
        issued = holdings.issued_for_share_type(db, st.id)
        available = None if st.authorized_shares is None else st.authorized_shares - issued
        capital.append({"st": st, "issued": issued, "available": available})

    company_holdings = holdings.holdings_for_company(db, company.id)

    certificates = db.scalars(
        select(ShareCertificate)
        .where(ShareCertificate.company_id == company.id)
        .order_by(ShareCertificate.id.desc())
    ).all()

    ledger = db.scalars(
        select(LedgerEntry)
        .where(LedgerEntry.company_id == company.id)
        .order_by(LedgerEntry.effective_date, LedgerEntry.id)
    ).all()

    shareholders = db.scalars(select(Shareholder).order_by(Shareholder.name)).all()

    return {
        "company": company,
        "share_types": share_types,
        "capital": capital,
        "holdings": company_holdings,
        "certificates": certificates,
        "ledger": ledger,
        "shareholders": shareholders,
    }


def shareholders_context(db: Session, q: str | None = None) -> dict:
    stmt = select(Shareholder).order_by(Shareholder.name)
    if q:
        like = f"%{q}%"
        from sqlalchemy import or_

        stmt = stmt.where(
            or_(Shareholder.name.ilike(like), Shareholder.identifier.ilike(like))
        )
    return {"shareholders": db.scalars(stmt).all(), "q": q or ""}


def companies_context(db: Session) -> dict:
    companies = db.scalars(select(Company).order_by(Company.name)).all()
    shareholder_count = len(db.scalars(select(Shareholder)).all())
    return {"companies": companies, "shareholder_count": shareholder_count}
