"""ShareType (share class) model."""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, Integer, Numeric, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.mixins import TimestampMixin

if TYPE_CHECKING:
    from app.models.company import Company


class ShareType(Base, TimestampMixin):
    __tablename__ = "share_types"
    __table_args__ = (UniqueConstraint("company_id", "code", name="uq_share_type_company_code"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    company_id: Mapped[int] = mapped_column(
        ForeignKey("companies.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    code: Mapped[str] = mapped_column(String(20), nullable=False)
    nominal_value: Mapped[float] = mapped_column(Numeric(18, 4), default=0, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="USD", nullable=False)
    voting_rights: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    dividend_rights: Mapped[str | None] = mapped_column(String(255), nullable=True)
    authorized_shares: Mapped[int | None] = mapped_column(Integer, nullable=True)

    company: Mapped[Company] = relationship(back_populates="share_types")
