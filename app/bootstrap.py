"""Database bootstrap: create tables and ensure an admin user exists."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import Base, SessionLocal, engine
from app.models import User, UserRole
from app.security import hash_password


def create_tables() -> None:
    # Import models so they register on the metadata before create_all.
    import app.models  # noqa: F401

    Base.metadata.create_all(bind=engine)


def ensure_admin(db: Session | None = None) -> None:
    settings = get_settings()
    own_session = db is None
    db = db or SessionLocal()
    try:
        existing = db.scalar(select(User).where(User.email == settings.admin_email))
        if existing is None:
            db.add(
                User(
                    email=settings.admin_email,
                    hashed_password=hash_password(settings.admin_password),
                    role=UserRole.admin,
                    is_active=True,
                )
            )
            db.commit()
    finally:
        if own_session:
            db.close()


def init_db() -> None:
    create_tables()
    ensure_admin()
