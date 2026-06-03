"""Shareholder model."""

from __future__ import annotations

import enum

from sqlalchemy import Enum, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.mixins import TimestampMixin


class ShareholderType(enum.StrEnum):
    individual = "individual"
    entity = "entity"


class Shareholder(Base, TimestampMixin):
    __tablename__ = "shareholders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    type: Mapped[ShareholderType] = mapped_column(
        Enum(ShareholderType), default=ShareholderType.individual, nullable=False
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    identifier: Mapped[str | None] = mapped_column(String(100), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    address: Mapped[str | None] = mapped_column(String(500), nullable=True)
    contact: Mapped[str | None] = mapped_column(String(100), nullable=True)
