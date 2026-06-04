"""Share issuance, transfer and cancellation services.

Every share movement writes an immutable ``LedgerEntry``. Certificates are
created/updated alongside, but the ledger remains authoritative.
"""

from __future__ import annotations

from datetime import date

from sqlalchemy.orm import Session

from app.models import (
    CertificateStatus,
    EntryType,
    LedgerEntry,
    ShareCertificate,
    Shareholder,
    ShareType,
)
from app.services import audit, certificates, holdings
from app.services.errors import (
    CapacityExceededError,
    InsufficientSharesError,
    NotFoundError,
)


def _get_share_type(db: Session, share_type_id: int) -> ShareType:
    st = db.get(ShareType, share_type_id)
    if st is None:
        raise NotFoundError(f"Share type {share_type_id} not found")
    return st


def _get_shareholder(db: Session, shareholder_id: int) -> Shareholder:
    sh = db.get(Shareholder, shareholder_id)
    if sh is None:
        raise NotFoundError(f"Shareholder {shareholder_id} not found")
    return sh


def issue_shares(
    db: Session,
    *,
    share_type_id: int,
    shareholder_id: int,
    quantity: int,
    issue_date: date | None = None,
    reference: str | None = None,
    actor: str | None = None,
) -> ShareCertificate:
    """Issue `quantity` new shares to a shareholder, creating a certificate."""
    if quantity <= 0:
        raise ValueError("quantity must be positive")

    share_type = _get_share_type(db, share_type_id)
    _get_shareholder(db, shareholder_id)
    issue_date = issue_date or date.today()

    available = holdings.available_for_share_type(db, share_type)
    if available is not None and quantity > available:
        raise CapacityExceededError(
            f"Issuing {quantity} exceeds available {available} for {share_type.code}"
        )

    cert = ShareCertificate(
        company_id=share_type.company_id,
        share_type_id=share_type.id,
        shareholder_id=shareholder_id,
        certificate_number=certificates.next_certificate_number(db, share_type.company_id),
        quantity=quantity,
        issue_date=issue_date,
        status=CertificateStatus.issued,
    )
    db.add(cert)
    db.flush()  # assign cert.id

    db.add(
        LedgerEntry(
            company_id=share_type.company_id,
            share_type_id=share_type.id,
            shareholder_id=shareholder_id,
            certificate_id=cert.id,
            entry_type=EntryType.ISSUE,
            quantity=quantity,
            effective_date=issue_date,
            reference=reference,
            created_by=actor,
        )
    )

    cert.pdf_path = certificates.generate_certificate_pdf(cert)
    audit.record(
        db,
        actor=actor,
        action="issue",
        entity_type="certificate",
        entity_id=cert.id,
        summary=f"Issued {quantity} {share_type.code} to shareholder {shareholder_id}",
    )
    db.commit()
    db.refresh(cert)
    return cert


def transfer_shares(
    db: Session,
    *,
    company_id: int,
    share_type_id: int,
    from_shareholder_id: int,
    to_shareholder_id: int,
    quantity: int,
    effective_date: date | None = None,
    reference: str | None = None,
    actor: str | None = None,
) -> ShareCertificate:
    """Transfer shares between holders via paired ledger entries that net to zero.

    A new certificate is issued to the receiver; the sender's holding is reduced.
    """
    if quantity <= 0:
        raise ValueError("quantity must be positive")
    if from_shareholder_id == to_shareholder_id:
        raise ValueError("cannot transfer to the same shareholder")

    share_type = _get_share_type(db, share_type_id)
    _get_shareholder(db, from_shareholder_id)
    _get_shareholder(db, to_shareholder_id)
    effective_date = effective_date or date.today()

    balance = holdings.holder_balance(db, share_type_id, from_shareholder_id)
    if quantity > balance:
        raise InsufficientSharesError(
            f"Holder {from_shareholder_id} has {balance} {share_type.code}, "
            f"cannot transfer {quantity}"
        )

    new_cert = ShareCertificate(
        company_id=company_id,
        share_type_id=share_type_id,
        shareholder_id=to_shareholder_id,
        certificate_number=certificates.next_certificate_number(db, company_id),
        quantity=quantity,
        issue_date=effective_date,
        status=CertificateStatus.issued,
    )
    db.add(new_cert)
    db.flush()

    db.add(
        LedgerEntry(
            company_id=company_id,
            share_type_id=share_type_id,
            shareholder_id=from_shareholder_id,
            certificate_id=new_cert.id,
            entry_type=EntryType.TRANSFER_OUT,
            quantity=quantity,
            effective_date=effective_date,
            reference=reference,
            created_by=actor,
        )
    )
    db.add(
        LedgerEntry(
            company_id=company_id,
            share_type_id=share_type_id,
            shareholder_id=to_shareholder_id,
            certificate_id=new_cert.id,
            entry_type=EntryType.TRANSFER_IN,
            quantity=quantity,
            effective_date=effective_date,
            reference=reference,
            created_by=actor,
        )
    )

    new_cert.pdf_path = certificates.generate_certificate_pdf(new_cert)
    audit.record(
        db,
        actor=actor,
        action="transfer",
        entity_type="certificate",
        entity_id=new_cert.id,
        summary=(
            f"Transferred {quantity} {share_type.code} from {from_shareholder_id} "
            f"to {to_shareholder_id}"
        ),
    )
    db.commit()
    db.refresh(new_cert)
    return new_cert


def cancel_certificate(
    db: Session,
    *,
    certificate_id: int,
    reference: str | None = None,
    actor: str | None = None,
) -> ShareCertificate:
    """Cancel a certificate, writing a CANCEL ledger entry for its quantity."""
    cert = db.get(ShareCertificate, certificate_id)
    if cert is None:
        raise NotFoundError(f"Certificate {certificate_id} not found")
    if cert.status == CertificateStatus.cancelled:
        raise ValueError("certificate already cancelled")

    db.add(
        LedgerEntry(
            company_id=cert.company_id,
            share_type_id=cert.share_type_id,
            shareholder_id=cert.shareholder_id,
            certificate_id=cert.id,
            entry_type=EntryType.CANCEL,
            quantity=cert.quantity,
            effective_date=date.today(),
            reference=reference,
            created_by=actor,
        )
    )
    cert.status = CertificateStatus.cancelled
    audit.record(
        db,
        actor=actor,
        action="cancel",
        entity_type="certificate",
        entity_id=cert.id,
        summary=f"Cancelled certificate {cert.certificate_number}",
    )
    db.commit()
    db.refresh(cert)
    return cert
