"""ShareType CRUD API, scoped to a company."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, require_admin
from app.models import Company, ShareType, User
from app.schemas.schemas import ShareTypeCreate, ShareTypeRead, ShareTypeUpdate
from app.services import audit, holdings

router = APIRouter(prefix="/api", tags=["share-types"])


@router.get("/companies/{company_id}/share-types", response_model=list[ShareTypeRead])
def list_share_types(
    company_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)
):
    if db.get(Company, company_id) is None:
        raise HTTPException(status_code=404, detail="Company not found")
    return db.scalars(
        select(ShareType).where(ShareType.company_id == company_id).order_by(ShareType.code)
    ).all()


@router.post(
    "/companies/{company_id}/share-types",
    response_model=ShareTypeRead,
    status_code=status.HTTP_201_CREATED,
)
def create_share_type(
    company_id: int,
    payload: ShareTypeCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
):
    if db.get(Company, company_id) is None:
        raise HTTPException(status_code=404, detail="Company not found")
    share_type = ShareType(company_id=company_id, **payload.model_dump())
    db.add(share_type)
    try:
        db.flush()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=409, detail="share type code must be unique within the company"
        ) from exc
    audit.record(
        db, actor=user.email, action="create", entity_type="share_type", entity_id=share_type.id
    )
    db.commit()
    db.refresh(share_type)
    return share_type


@router.put("/share-types/{share_type_id}", response_model=ShareTypeRead)
def update_share_type(
    share_type_id: int,
    payload: ShareTypeUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
):
    share_type = db.get(ShareType, share_type_id)
    if share_type is None:
        raise HTTPException(status_code=404, detail="Share type not found")
    # Cannot lower authorized below what's already issued.
    if payload.authorized_shares is not None:
        issued = holdings.issued_for_share_type(db, share_type_id)
        if payload.authorized_shares < issued:
            raise HTTPException(
                status_code=422,
                detail=f"authorized_shares ({payload.authorized_shares}) below issued ({issued})",
            )
    for key, value in payload.model_dump().items():
        setattr(share_type, key, value)
    try:
        db.flush()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="share type code must be unique") from exc
    audit.record(
        db, actor=user.email, action="update", entity_type="share_type", entity_id=share_type.id
    )
    db.commit()
    db.refresh(share_type)
    return share_type


@router.delete("/share-types/{share_type_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_share_type(
    share_type_id: int, db: Session = Depends(get_db), user: User = Depends(require_admin)
):
    share_type = db.get(ShareType, share_type_id)
    if share_type is None:
        raise HTTPException(status_code=404, detail="Share type not found")
    if holdings.issued_for_share_type(db, share_type_id) > 0:
        raise HTTPException(status_code=409, detail="cannot delete a share type with issued shares")
    db.delete(share_type)
    audit.record(
        db, actor=user.email, action="delete", entity_type="share_type", entity_id=share_type_id
    )
    db.commit()
