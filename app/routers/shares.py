"""Share issuance, transfer and cancellation API."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require_admin
from app.models import User
from app.schemas.schemas import (
    CancelCertificate,
    CertificateRead,
    IssueShares,
    TransferShares,
)
from app.services import issuance
from app.services.errors import (
    CapacityExceededError,
    InsufficientSharesError,
    NotFoundError,
)

router = APIRouter(prefix="/api", tags=["shares"])


@router.post("/companies/{company_id}/issue", response_model=CertificateRead, status_code=201)
def issue(
    company_id: int,
    payload: IssueShares,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
):
    try:
        cert = issuance.issue_shares(
            db,
            share_type_id=payload.share_type_id,
            shareholder_id=payload.shareholder_id,
            quantity=payload.quantity,
            issue_date=payload.issue_date,
            reference=payload.reference,
            actor=user.email,
        )
    except NotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except CapacityExceededError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return cert


@router.post("/transfers", response_model=CertificateRead, status_code=201)
def transfer(
    payload: TransferShares,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
):
    try:
        cert = issuance.transfer_shares(
            db,
            company_id=payload.company_id,
            share_type_id=payload.share_type_id,
            from_shareholder_id=payload.from_shareholder_id,
            to_shareholder_id=payload.to_shareholder_id,
            quantity=payload.quantity,
            effective_date=payload.effective_date,
            reference=payload.reference,
            actor=user.email,
        )
    except NotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except InsufficientSharesError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return cert


@router.post("/certificates/{certificate_id}/cancel", response_model=CertificateRead)
def cancel(
    certificate_id: int,
    payload: CancelCertificate,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
):
    try:
        cert = issuance.cancel_certificate(
            db, certificate_id=certificate_id, reference=payload.reference, actor=user.email
        )
    except NotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return cert
