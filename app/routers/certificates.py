"""Certificate retrieval and PDF download."""

from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse, HTMLResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import ShareCertificate, User
from app.schemas.schemas import CertificateRead
from app.services import certificates as cert_service

router = APIRouter(prefix="/api/certificates", tags=["certificates"])


@router.get("", response_model=list[CertificateRead])
def list_certificates(
    company_id: int | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    stmt = select(ShareCertificate).order_by(ShareCertificate.id.desc())
    if company_id is not None:
        stmt = stmt.where(ShareCertificate.company_id == company_id)
    return db.scalars(stmt).all()


@router.get("/{certificate_id}", response_model=CertificateRead)
def get_certificate(
    certificate_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)
):
    cert = db.get(ShareCertificate, certificate_id)
    if cert is None:
        raise HTTPException(status_code=404, detail="Certificate not found")
    return cert


@router.get("/{certificate_id}/pdf")
def get_certificate_pdf(
    certificate_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)
):
    cert = db.get(ShareCertificate, certificate_id)
    if cert is None:
        raise HTTPException(status_code=404, detail="Certificate not found")
    # (Re)generate if missing or stale.
    path_str = cert.pdf_path
    if not path_str or not Path(path_str).exists():
        path_str = cert_service.generate_certificate_pdf(cert)
        cert.pdf_path = path_str
        db.commit()
    if not path_str:
        return HTMLResponse(cert_service.render_certificate_html(cert))
    path = Path(path_str)
    if path.suffix == ".pdf":
        return FileResponse(path, media_type="application/pdf", filename=path.name)
    # Fallback rendering when WeasyPrint is unavailable.
    return HTMLResponse(cert_service.render_certificate_html(cert))
