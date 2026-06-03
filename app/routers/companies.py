"""Company CRUD API."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, require_admin
from app.models import Company, User
from app.schemas.schemas import CompanyCreate, CompanyRead, CompanyUpdate
from app.services import audit

router = APIRouter(prefix="/api/companies", tags=["companies"])


@router.get("", response_model=list[CompanyRead])
def list_companies(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return db.scalars(select(Company).order_by(Company.name)).all()


@router.post("", response_model=CompanyRead, status_code=status.HTTP_201_CREATED)
def create_company(
    payload: CompanyCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
):
    company = Company(**payload.model_dump())
    db.add(company)
    try:
        db.flush()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="registration_number must be unique",
        ) from exc
    audit.record(
        db, actor=user.email, action="create", entity_type="company", entity_id=company.id
    )
    db.commit()
    db.refresh(company)
    return company


@router.get("/{company_id}", response_model=CompanyRead)
def get_company(
    company_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)
):
    company = db.get(Company, company_id)
    if company is None:
        raise HTTPException(status_code=404, detail="Company not found")
    return company


@router.put("/{company_id}", response_model=CompanyRead)
def update_company(
    company_id: int,
    payload: CompanyUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
):
    company = db.get(Company, company_id)
    if company is None:
        raise HTTPException(status_code=404, detail="Company not found")
    for key, value in payload.model_dump().items():
        setattr(company, key, value)
    try:
        db.flush()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="registration_number must be unique") from exc
    audit.record(
        db, actor=user.email, action="update", entity_type="company", entity_id=company.id
    )
    db.commit()
    db.refresh(company)
    return company


@router.delete("/{company_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_company(
    company_id: int, db: Session = Depends(get_db), user: User = Depends(require_admin)
):
    company = db.get(Company, company_id)
    if company is None:
        raise HTTPException(status_code=404, detail="Company not found")
    db.delete(company)
    audit.record(db, actor=user.email, action="delete", entity_type="company", entity_id=company_id)
    db.commit()
