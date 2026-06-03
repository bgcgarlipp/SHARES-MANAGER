"""Server-rendered HTML pages (Jinja2 + HTMX)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Form, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.context import companies_context, company_body_context, shareholders_context
from app.database import get_db
from app.deps import get_optional_user
from app.models import Company, User
from app.security import verify_password
from app.templating import render, templates

router = APIRouter(tags=["pages"], include_in_schema=False)


def _require_login(user: User | None) -> RedirectResponse | None:
    if user is None:
        return RedirectResponse(url="/login", status_code=303)
    return None


@router.get("/login", response_class=HTMLResponse)
def login_page(request: Request):
    return render(request, "login.html", {"error": None})


@router.post("/login", response_class=HTMLResponse)
def login_submit(
    request: Request,
    email: str = Form(...),
    password: str = Form(...),
    db: Session = Depends(get_db),
):
    user = db.scalar(select(User).where(User.email == email))
    if user is None or not verify_password(password, user.hashed_password):
        return render(request, "login.html", {"error": "Invalid credentials"}, status_code=401)
    request.session["user_id"] = user.id
    return RedirectResponse(url="/", status_code=303)


@router.get("/logout")
def logout_page(request: Request):
    request.session.clear()
    return RedirectResponse(url="/login", status_code=303)


@router.get("/", response_class=HTMLResponse)
def dashboard(
    request: Request, db: Session = Depends(get_db), user: User | None = Depends(get_optional_user)
):
    if (redirect := _require_login(user)) is not None:
        return redirect
    return render(request, "dashboard.html", {"user": user, **companies_context(db)})


@router.get("/companies/{company_id}", response_class=HTMLResponse)
def company_detail(
    company_id: int,
    request: Request,
    db: Session = Depends(get_db),
    user: User | None = Depends(get_optional_user),
):
    if (redirect := _require_login(user)) is not None:
        return redirect
    company = db.get(Company, company_id)
    if company is None:
        return HTMLResponse("Company not found", status_code=404)
    ctx = company_body_context(db, company)
    return render(request, "company.html", {"user": user, **ctx})


@router.get("/shareholders", response_class=HTMLResponse)
def shareholders_page(
    request: Request, db: Session = Depends(get_db), user: User | None = Depends(get_optional_user)
):
    if (redirect := _require_login(user)) is not None:
        return redirect
    return render(request, "shareholders.html", {"user": user, **shareholders_context(db)})


# Re-export for any legacy imports.
__all__ = ["router", "templates"]
