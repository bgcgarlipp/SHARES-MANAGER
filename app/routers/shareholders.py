"""Shareholder CRUD API."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, require_admin
from app.models import Shareholder, User
from app.schemas.schemas import ShareholderCreate, ShareholderRead, ShareholderUpdate
from app.services import audit

router = APIRouter(prefix="/api/shareholders", tags=["shareholders"])


@router.get("", response_model=list[ShareholderRead])
def list_shareholders(
    q: str | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    stmt = select(Shareholder).order_by(Shareholder.name)
    if q:
        like = f"%{q}%"
        stmt = stmt.where(
            or_(Shareholder.name.ilike(like), Shareholder.identifier.ilike(like))
        )
    return db.scalars(stmt).all()


@router.post("", response_model=ShareholderRead, status_code=status.HTTP_201_CREATED)
def create_shareholder(
    payload: ShareholderCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
):
    data = payload.model_dump()
    if data.get("email") is not None:
        data["email"] = str(data["email"])
    shareholder = Shareholder(**data)
    db.add(shareholder)
    db.flush()
    audit.record(
        db, actor=user.email, action="create", entity_type="shareholder", entity_id=shareholder.id
    )
    db.commit()
    db.refresh(shareholder)
    return shareholder


@router.get("/{shareholder_id}", response_model=ShareholderRead)
def get_shareholder(
    shareholder_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)
):
    shareholder = db.get(Shareholder, shareholder_id)
    if shareholder is None:
        raise HTTPException(status_code=404, detail="Shareholder not found")
    return shareholder


@router.put("/{shareholder_id}", response_model=ShareholderRead)
def update_shareholder(
    shareholder_id: int,
    payload: ShareholderUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
):
    shareholder = db.get(Shareholder, shareholder_id)
    if shareholder is None:
        raise HTTPException(status_code=404, detail="Shareholder not found")
    data = payload.model_dump()
    if data.get("email") is not None:
        data["email"] = str(data["email"])
    for key, value in data.items():
        setattr(shareholder, key, value)
    audit.record(
        db, actor=user.email, action="update", entity_type="shareholder", entity_id=shareholder.id
    )
    db.commit()
    db.refresh(shareholder)
    return shareholder


@router.delete("/{shareholder_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_shareholder(
    shareholder_id: int, db: Session = Depends(get_db), user: User = Depends(require_admin)
):
    shareholder = db.get(Shareholder, shareholder_id)
    if shareholder is None:
        raise HTTPException(status_code=404, detail="Shareholder not found")
    db.delete(shareholder)
    audit.record(
        db, actor=user.email, action="delete", entity_type="shareholder", entity_id=shareholder_id
    )
    db.commit()
