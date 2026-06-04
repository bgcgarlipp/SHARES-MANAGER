"""ShareCertificate model."""

from __future__ import annotations

import enum
from datetime import date
from typing import TYPE_CHECKING

from sqlalchemy import Date, Enum, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.mixins import TimestampMixin

if TYPE_CHECKING:
    from app.models.company import Company
    from app.models.share_type import ShareType
    from app.models.shareholder import Shareholder


class CertificateStatus(enum.StrEnum):
    issued = "issued"
    transferred = "transferred"
    cancelled = "cancelled"
    reissued = "reissued"


class ShareCertificate(Base, TimestampMixin):
    __tablename__ = "certificates"
    __table_args__ = (
        UniqueConstraint("company_id", "certificate_number", name="uq_cert_company_number"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    company_id: Mapped[int] = mapped_column(
        ForeignKey("companies.id", ondelete="CASCADE"), nullable=False
    )
    share_type_id: Mapped[int] = mapped_column(ForeignKey("share_types.id"), nullable=False)
    shareholder_id: Mapped[int] = mapped_column(ForeignKey("shareholders.id"), nullable=False)
    certificate_number: Mapped[str] = mapped_column(String(50), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    issue_date: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[CertificateStatus] = mapped_column(
        Enum(CertificateStatus), default=CertificateStatus.issued, nullable=False
    )
    parent_certificate_id: Mapped[int | None] = mapped_column(
        ForeignKey("certificates.id"), nullable=True
    )
    pdf_path: Mapped[str | None] = mapped_column(String(500), nullable=True)

    company: Mapped[Company] = relationship(back_populates="certificates")
    share_type: Mapped[ShareType] = relationship()
    shareholder: Mapped[Shareholder] = relationship()
