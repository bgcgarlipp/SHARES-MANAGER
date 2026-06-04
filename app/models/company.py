"""Company model."""

from __future__ import annotations

from datetime import date
from typing import TYPE_CHECKING

from sqlalchemy import Date, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.mixins import TimestampMixin

if TYPE_CHECKING:
    from app.models.certificate import ShareCertificate
    from app.models.ledger import LedgerEntry
    from app.models.share_type import ShareType


class Company(Base, TimestampMixin):
    __tablename__ = "companies"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    registration_number: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    incorporation_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    jurisdiction: Mapped[str | None] = mapped_column(String(100), nullable=True)
    authorized_capital: Mapped[int | None] = mapped_column(Integer, nullable=True)
    currency: Mapped[str] = mapped_column(String(3), default="USD", nullable=False)

    share_types: Mapped[list[ShareType]] = relationship(
        back_populates="company", cascade="all, delete-orphan"
    )
    certificates: Mapped[list[ShareCertificate]] = relationship(
        back_populates="company", cascade="all, delete-orphan"
    )
    ledger_entries: Mapped[list[LedgerEntry]] = relationship(
        back_populates="company", cascade="all, delete-orphan"
    )
