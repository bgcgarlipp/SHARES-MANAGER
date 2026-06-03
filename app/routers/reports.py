"""Reporting API: cap table, capital summary, register export."""

from __future__ import annotations

import csv
import io

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import Company, ShareType, User
from app.services import holdings

router = APIRouter(prefix="/api/companies/{company_id}", tags=["reports"])


@router.get("/cap-table")
def cap_table(
    company_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)
):
    company = db.get(Company, company_id)
    if company is None:
        raise HTTPException(status_code=404, detail="Company not found")
    rows = holdings.holdings_for_company(db, company_id)
    total = sum(r.quantity for r in rows) or 1
    return {
        "company": company.name,
        "total_issued": sum(r.quantity for r in rows),
        "holders": [
            {
                "shareholder_id": r.shareholder_id,
                "shareholder_name": r.shareholder_name,
                "share_type": r.share_type_name,
                "quantity": r.quantity,
                "percentage": round(r.quantity / total * 100, 4),
            }
            for r in rows
        ],
    }


@router.get("/capital-summary")
def capital_summary(
    company_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)
):
    company = db.get(Company, company_id)
    if company is None:
        raise HTTPException(status_code=404, detail="Company not found")
    share_types = db.scalars(
        select(ShareType).where(ShareType.company_id == company_id)
    ).all()
    summary = []
    for st in share_types:
        issued = holdings.issued_for_share_type(db, st.id)
        available = None if st.authorized_shares is None else st.authorized_shares - issued
        summary.append(
            {
                "share_type": st.name,
                "code": st.code,
                "authorized": st.authorized_shares,
                "issued": issued,
                "available": available,
            }
        )
    return {"company": company.name, "share_types": summary}


@router.get("/register/export")
def export_register(
    company_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)
):
    company = db.get(Company, company_id)
    if company is None:
        raise HTTPException(status_code=404, detail="Company not found")
    rows = holdings.holdings_for_company(db, company_id)

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["Shareholder ID", "Shareholder", "Share Type", "Quantity"])
    for r in rows:
        writer.writerow([r.shareholder_id, r.shareholder_name, r.share_type_name, r.quantity])
    buffer.seek(0)

    filename = f"register_company_{company_id}.csv"
    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
