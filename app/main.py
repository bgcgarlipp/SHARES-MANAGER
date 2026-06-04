"""FastAPI application entrypoint."""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from starlette.middleware.sessions import SessionMiddleware

from app.bootstrap import init_db
from app.config import get_settings
from app.routers import (
    auth,
    certificates,
    companies,
    ledger,
    pages,
    reports,
    share_types,
    shareholders,
    shares,
    ui,
)

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title=settings.app_name, version="0.1.0", lifespan=lifespan)
app.add_middleware(SessionMiddleware, secret_key=settings.secret_key)

# API routers
app.include_router(auth.router)
app.include_router(companies.router)
app.include_router(share_types.router)
app.include_router(shareholders.router)
app.include_router(shares.router)
app.include_router(certificates.router)
app.include_router(ledger.router)
app.include_router(reports.router)

# UI pages and HTMX handlers
app.include_router(pages.router)
app.include_router(ui.router)


@app.get("/health", tags=["meta"])
def health() -> dict[str, str]:
    return {"status": "ok"}
