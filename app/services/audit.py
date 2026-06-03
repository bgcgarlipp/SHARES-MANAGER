"""Audit-log helper (decision D6)."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.models import AuditLog


def record(
    db: Session,
    *,
    actor: str | None,
    action: str,
    entity_type: str,
    entity_id: int | None = None,
    summary: str | None = None,
) -> AuditLog:
    entry = AuditLog(
        actor=actor,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        summary=summary,
    )
    db.add(entry)
    return entry
