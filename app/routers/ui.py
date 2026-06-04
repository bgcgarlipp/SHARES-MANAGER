"""HTMX form handlers returning swappable HTML partials (admin-gated)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Form, Request
from fastapi.responses import HTMLResponse
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.context import companies_context, company_body_context, shareholders_context
from app.database import get_db
from app.deps import get_current_user, require_admin
from app.models import (
    Company,
    ShareCertificate,
    Shareholder,
    ShareholderType,
    ShareType,
    User,
)
from app.services import audit, holdings, issuance
from app.services.errors import (
    CapacityExceededError,
    InsufficientSharesError,
    NotFoundError,
)
from app.templating import render

router = APIRouter(prefix="/ui", tags=["ui"], include_in_schema=False)


def _company_body(request: Request, db: Session, company: Company, user: User, error=None):
    ctx = company_body_context(db, company)
    return render(request, "partials/company_body.html", {"user": user, "error": error, **ctx})


def _companies_body(request: Request, db: Session, user: User, error=None):
    return render(
        request, "partials/companies_body.html",
        {"user": user, "error": error, **companies_context(db)},
    )


def _shareholders_body(request: Request, db: Session, user: User, error=None, q=None):
    return render(
        request, "partials/shareholders_body.html",
        {"user": user, "error": error, **shareholders_context(db, q)},
    )


def _opt_int(value: str | None) -> int | None:
    value = (value or "").strip()
    return int(value) if value else None


# ---------------- Companies ----------------
@router.post("/companies", response_class=HTMLResponse)
def create_company(
    request: Request,
    name: str = Form(...),
    registration_number: str = Form(...),
    jurisdiction: str = Form(""),
    currency: str = Form("USD"),
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
):
    company = Company(
        name=name.strip(),
        registration_number=registration_number.strip(),
        jurisdiction=jurisdiction.strip() or None,
        currency=(currency.strip() or "USD")[:3].upper(),
    )
    db.add(company)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        return _companies_body(request, db, user, error="Registration number must be unique.")
    audit.record(db, actor=user.email, action="create", entity_type="company", entity_id=company.id)
    db.commit()
    return _companies_body(request, db, user)


# ---------------- Share types ----------------
@router.post("/companies/{company_id}/share-types", response_class=HTMLResponse)
def create_share_type(
    company_id: int,
    request: Request,
    name: str = Form(...),
    code: str = Form(...),
    nominal_value: str = Form("0"),
    authorized_shares: str = Form(""),
    voting_rights: str | None = Form(None),
    dividend_rights: str = Form(""),
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
):
    company = db.get(Company, company_id)
    if company is None:
        return HTMLResponse("Company not found", status_code=404)
    st = ShareType(
        company_id=company_id,
        name=name.strip(),
        code=code.strip().upper(),
        nominal_value=float(nominal_value or 0),
        currency=company.currency,
        voting_rights=voting_rights is not None,
        dividend_rights=dividend_rights.strip() or None,
        authorized_shares=_opt_int(authorized_shares),
    )
    db.add(st)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        return _company_body(request, db, company, user,
                             error=f"Share class code '{code}' already exists.")
    audit.record(db, actor=user.email, action="create", entity_type="share_type", entity_id=st.id)
    db.commit()
    return _company_body(request, db, company, user)


@router.delete("/share-types/{share_type_id}", response_class=HTMLResponse)
def delete_share_type(
    share_type_id: int,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
):
    st = db.get(ShareType, share_type_id)
    if st is None:
        return HTMLResponse("Share type not found", status_code=404)
    company = db.get(Company, st.company_id)
    if company is None:
        return HTMLResponse("Company not found", status_code=404)
    if holdings.issued_for_share_type(db, share_type_id) > 0:
        return _company_body(request, db, company, user,
                             error="Cannot delete a share class with issued shares.")
    db.delete(st)
    audit.record(db, actor=user.email, action="delete", entity_type="share_type",
                 entity_id=share_type_id)
    db.commit()
    return _company_body(request, db, company, user)


# ---------------- Share operations ----------------
@router.post("/companies/{company_id}/issue", response_class=HTMLResponse)
def issue(
    company_id: int,
    request: Request,
    share_type_id: int = Form(...),
    shareholder_id: int = Form(...),
    quantity: int = Form(...),
    reference: str = Form(""),
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
):
    company = db.get(Company, company_id)
    if company is None:
        return HTMLResponse("Company not found", status_code=404)
    error = None
    try:
        issuance.issue_shares(
            db, share_type_id=share_type_id, shareholder_id=shareholder_id,
            quantity=quantity, reference=reference.strip() or None, actor=user.email,
        )
    except (NotFoundError, CapacityExceededError, ValueError) as exc:
        error = str(exc)
    return _company_body(request, db, company, user, error=error)


@router.post("/companies/{company_id}/transfer", response_class=HTMLResponse)
def transfer(
    company_id: int,
    request: Request,
    share_type_id: int = Form(...),
    from_shareholder_id: int = Form(...),
    to_shareholder_id: int = Form(...),
    quantity: int = Form(...),
    reference: str = Form(""),
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
):
    company = db.get(Company, company_id)
    if company is None:
        return HTMLResponse("Company not found", status_code=404)
    error = None
    try:
        issuance.transfer_shares(
            db, company_id=company_id, share_type_id=share_type_id,
            from_shareholder_id=from_shareholder_id, to_shareholder_id=to_shareholder_id,
            quantity=quantity, reference=reference.strip() or None, actor=user.email,
        )
    except (NotFoundError, InsufficientSharesError, ValueError) as exc:
        error = str(exc)
    return _company_body(request, db, company, user, error=error)


@router.post("/certificates/{certificate_id}/cancel", response_class=HTMLResponse)
def cancel(
    certificate_id: int,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
):
    cert = db.get(ShareCertificate, certificate_id)
    if cert is None:
        return HTMLResponse("Certificate not found", status_code=404)
    company = db.get(Company, cert.company_id)
    if company is None:
        return HTMLResponse("Company not found", status_code=404)
    error = None
    try:
        issuance.cancel_certificate(db, certificate_id=certificate_id, actor=user.email)
    except (NotFoundError, ValueError) as exc:
        error = str(exc)
    return _company_body(request, db, company, user, error=error)


# ---------------- Shareholders ----------------
@router.post("/shareholders", response_class=HTMLResponse)
def create_shareholder(
    request: Request,
    name: str = Form(...),
    type: str = Form("individual"),
    identifier: str = Form(""),
    email: str = Form(""),
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
):
    sh = Shareholder(
        name=name.strip(),
        type=ShareholderType(type),
        identifier=identifier.strip() or None,
        email=email.strip() or None,
    )
    db.add(sh)
    db.flush()
    audit.record(db, actor=user.email, action="create", entity_type="shareholder", entity_id=sh.id)
    db.commit()
    return _shareholders_body(request, db, user)


@router.delete("/shareholders/{shareholder_id}", response_class=HTMLResponse)
def delete_shareholder(
    shareholder_id: int,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
):
    sh = db.get(Shareholder, shareholder_id)
    if sh is None:
        return HTMLResponse("Shareholder not found", status_code=404)
    db.delete(sh)
    audit.record(db, actor=user.email, action="delete", entity_type="shareholder",
                 entity_id=shareholder_id)
    db.commit()
    return _shareholders_body(request, db, user)


@router.get("/shareholders/search", response_class=HTMLResponse)
def search_shareholders(
    request: Request,
    q: str = "",
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return render(
        request, "partials/shareholders_table.html",
        {"user": user, **shareholders_context(db, q)},
    )
