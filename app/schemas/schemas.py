"""Pydantic v2 schemas for request validation and serialization."""

from __future__ import annotations

from datetime import date

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.certificate import CertificateStatus
from app.models.ledger import EntryType
from app.models.shareholder import ShareholderType
from app.models.user import UserRole


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ---- Company ----
class CompanyBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    registration_number: str = Field(min_length=1, max_length=100)
    incorporation_date: date | None = None
    jurisdiction: str | None = None
    authorized_capital: int | None = Field(default=None, ge=0)
    currency: str = Field(default="USD", min_length=3, max_length=3)


class CompanyCreate(CompanyBase):
    pass


class CompanyUpdate(CompanyBase):
    pass


class CompanyRead(ORMModel, CompanyBase):
    id: int


# ---- ShareType ----
class ShareTypeBase(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    code: str = Field(min_length=1, max_length=20)
    nominal_value: float = Field(default=0, ge=0)
    currency: str = Field(default="USD", min_length=3, max_length=3)
    voting_rights: bool = True
    dividend_rights: str | None = None
    authorized_shares: int | None = Field(default=None, ge=0)


class ShareTypeCreate(ShareTypeBase):
    pass


class ShareTypeUpdate(ShareTypeBase):
    pass


class ShareTypeRead(ORMModel, ShareTypeBase):
    id: int
    company_id: int


# ---- Shareholder ----
class ShareholderBase(BaseModel):
    type: ShareholderType = ShareholderType.individual
    name: str = Field(min_length=1, max_length=255)
    identifier: str | None = None
    email: EmailStr | None = None
    address: str | None = None
    contact: str | None = None


class ShareholderCreate(ShareholderBase):
    pass


class ShareholderUpdate(ShareholderBase):
    pass


class ShareholderRead(ORMModel, ShareholderBase):
    id: int


# ---- Operations ----
class IssueShares(BaseModel):
    share_type_id: int
    shareholder_id: int
    quantity: int = Field(gt=0)
    issue_date: date | None = None
    reference: str | None = None


class TransferShares(BaseModel):
    company_id: int
    share_type_id: int
    from_shareholder_id: int
    to_shareholder_id: int
    quantity: int = Field(gt=0)
    effective_date: date | None = None
    reference: str | None = None


class CancelCertificate(BaseModel):
    reference: str | None = None


# ---- Reads ----
class CertificateRead(ORMModel):
    id: int
    company_id: int
    share_type_id: int
    shareholder_id: int
    certificate_number: str
    quantity: int
    issue_date: date
    status: CertificateStatus


class LedgerEntryRead(ORMModel):
    id: int
    company_id: int
    share_type_id: int
    shareholder_id: int
    certificate_id: int | None
    entry_type: EntryType
    quantity: int
    effective_date: date
    reference: str | None


class HoldingRead(BaseModel):
    shareholder_id: int
    shareholder_name: str
    share_type_id: int
    share_type_name: str
    quantity: int


# ---- User / auth ----
class UserRead(ORMModel):
    id: int
    email: str
    role: UserRole
    is_active: bool
