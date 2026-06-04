"""Ledger and holdings API."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import Company, LedgerEntry, User
from app.schemas.schemas import HoldingRead, LedgerEntryRead
from app.services import holdings

router = APIRouter(prefix="/api/companies/{company_id}", tags=["ledger"])


@router.get("/ledger", response_model=list[LedgerEntryRead])
def get_ledger(
    company_id: int,
    share_type_id: int | None = None,
    shareholder_id: int | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    if db.get(Company, company_id) is None:
        raise HTTPException(status_code=404, detail="Company not found")
    stmt = (
        select(LedgerEntry)
        .where(LedgerEntry.company_id == company_id)
        .order_by(LedgerEntry.effective_date, LedgerEntry.id)
    )
    if share_type_id is not None:
        stmt = stmt.where(LedgerEntry.share_type_id == share_type_id)
    if shareholder_id is not None:
        stmt = stmt.where(LedgerEntry.shareholder_id == shareholder_id)
    return db.scalars(stmt).all()


@router.get("/holdings", response_model=list[HoldingRead])
def get_holdings(
    company_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)
):
    if db.get(Company, company_id) is None:
        raise HTTPException(status_code=404, detail="Company not found")
    return holdings.holdings_for_company(db, company_id)
