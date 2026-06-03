"""Append-only ledger entry model."""

from __future__ import annotations

import enum
from datetime import date
from typing import TYPE_CHECKING

from sqlalchemy import Date, Enum, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.mixins import TimestampMixin

if TYPE_CHECKING:
    from app.models.company import Company
    from app.models.share_type import ShareType
    from app.models.shareholder import Shareholder


class EntryType(enum.StrEnum):
    ISSUE = "ISSUE"
    TRANSFER_IN = "TRANSFER_IN"
    TRANSFER_OUT = "TRANSFER_OUT"
    CANCEL = "CANCEL"


class LedgerEntry(Base, TimestampMixin):
    """Immutable record of a share movement.

    ``quantity`` is always stored as a positive magnitude; direction is implied
    by ``entry_type`` (ISSUE / TRANSFER_IN add, TRANSFER_OUT / CANCEL remove).
    Corrections are made by appending a reversing entry, never by editing.
    """

    __tablename__ = "ledger_entries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    company_id: Mapped[int] = mapped_column(
        ForeignKey("companies.id", ondelete="CASCADE"), nullable=False
    )
    share_type_id: Mapped[int] = mapped_column(ForeignKey("share_types.id"), nullable=False)
    shareholder_id: Mapped[int] = mapped_column(ForeignKey("shareholders.id"), nullable=False)
    certificate_id: Mapped[int | None] = mapped_column(ForeignKey("certificates.id"), nullable=True)
    entry_type: Mapped[EntryType] = mapped_column(Enum(EntryType), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    effective_date: Mapped[date] = mapped_column(Date, nullable=False)
    reference: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_by: Mapped[str | None] = mapped_column(String(255), nullable=True)

    company: Mapped[Company] = relationship(back_populates="ledger_entries")
    share_type: Mapped[ShareType] = relationship()
    shareholder: Mapped[Shareholder] = relationship()

    ADDITIONS = {EntryType.ISSUE, EntryType.TRANSFER_IN}
    SUBTRACTIONS = {EntryType.TRANSFER_OUT, EntryType.CANCEL}

    @property
    def signed_quantity(self) -> int:
        return self.quantity if self.entry_type in self.ADDITIONS else -self.quantity
