"""Holdings and capacity computations derived from the ledger.

The ledger is the single source of truth; everything here is reconcilable
from ``LedgerEntry`` rows.
"""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import LedgerEntry, Shareholder, ShareType
from app.schemas.schemas import HoldingRead


def issued_for_share_type(db: Session, share_type_id: int) -> int:
    """Total shares currently outstanding for a share type (net of cancellations)."""
    entries = db.scalars(
        select(LedgerEntry).where(LedgerEntry.share_type_id == share_type_id)
    ).all()
    # ISSUE adds, CANCEL removes; transfers net to zero across holders.
    total = sum(
        e.quantity if e.entry_type in LedgerEntry.ADDITIONS else -e.quantity
        for e in entries
    )
    # TRANSFER_IN/OUT net to zero, so the sum equals net issued.
    return total


def available_for_share_type(db: Session, share_type: ShareType) -> int | None:
    """Remaining issuable shares, or None if the class is uncapped."""
    if share_type.authorized_shares is None:
        return None
    return share_type.authorized_shares - issued_for_share_type(db, share_type.id)


def holder_balance(db: Session, share_type_id: int, shareholder_id: int) -> int:
    entries = db.scalars(
        select(LedgerEntry).where(
            LedgerEntry.share_type_id == share_type_id,
            LedgerEntry.shareholder_id == shareholder_id,
        )
    ).all()
    return sum(e.signed_quantity for e in entries)


def holdings_for_company(db: Session, company_id: int) -> list[HoldingRead]:
    """Aggregate non-zero holdings per (shareholder, share type) for a company."""
    entries = db.scalars(
        select(LedgerEntry).where(LedgerEntry.company_id == company_id)
    ).all()

    totals: dict[tuple[int, int], int] = {}
    for e in entries:
        key = (e.shareholder_id, e.share_type_id)
        totals[key] = totals.get(key, 0) + e.signed_quantity

    sh_names: dict[int, str] = {
        row[0]: row[1] for row in db.execute(select(Shareholder.id, Shareholder.name)).all()
    }
    st_names: dict[int, str] = {
        row[0]: row[1] for row in db.execute(select(ShareType.id, ShareType.name)).all()
    }

    result: list[HoldingRead] = []
    for (sh_id, st_id), qty in sorted(totals.items()):
        if qty == 0:
            continue
        result.append(
            HoldingRead(
                shareholder_id=sh_id,
                shareholder_name=sh_names.get(sh_id, "?"),
                share_type_id=st_id,
                share_type_name=st_names.get(st_id, "?"),
                quantity=qty,
            )
        )
    return result
