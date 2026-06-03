"""Server-rendered HTML pages (Jinja2 + HTMX)."""

from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, Depends, Form, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_optional_user
from app.models import Company, Shareholder, ShareType, User
from app.security import verify_password
from app.services import holdings

TEMPLATES_DIR = Path(__file__).resolve().parent.parent / "templates"
templates = Jinja2Templates(directory=str(TEMPLATES_DIR))

router = APIRouter(tags=["pages"], include_in_schema=False)


def _require_login(request: Request, user: User | None) -> RedirectResponse | None:
    if user is None:
        return RedirectResponse(url="/login", status_code=303)
    return None


@router.get("/login", response_class=HTMLResponse)
def login_page(request: Request):
    return templates.TemplateResponse(request, "login.html", {"error": None})


@router.post("/login", response_class=HTMLResponse)
def login_submit(
    request: Request,
    email: str = Form(...),
    password: str = Form(...),
    db: Session = Depends(get_db),
):
    user = db.scalar(select(User).where(User.email == email))
    if user is None or not verify_password(password, user.hashed_password):
        return templates.TemplateResponse(
            request, "login.html", {"error": "Invalid credentials"}, status_code=401
        )
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
    if (redirect := _require_login(request, user)) is not None:
        return redirect
    companies = db.scalars(select(Company).order_by(Company.name)).all()
    shareholder_count = len(db.scalars(select(Shareholder)).all())
    return templates.TemplateResponse(
        request,
        "dashboard.html",
        {"user": user, "companies": companies, "shareholder_count": shareholder_count},
    )


@router.get("/companies/{company_id}", response_class=HTMLResponse)
def company_detail(
    company_id: int,
    request: Request,
    db: Session = Depends(get_db),
    user: User | None = Depends(get_optional_user),
):
    if (redirect := _require_login(request, user)) is not None:
        return redirect
    company = db.get(Company, company_id)
    if company is None:
        return HTMLResponse("Company not found", status_code=404)
    share_types = db.scalars(
        select(ShareType).where(ShareType.company_id == company_id).order_by(ShareType.code)
    ).all()
    company_holdings = holdings.holdings_for_company(db, company_id)
    capital = []
    for st in share_types:
        issued = holdings.issued_for_share_type(db, st.id)
        available = None if st.authorized_shares is None else st.authorized_shares - issued
        capital.append({"st": st, "issued": issued, "available": available})
    return templates.TemplateResponse(
        request,
        "company.html",
        {
            "user": user,
            "company": company,
            "capital": capital,
            "holdings": company_holdings,
        },
    )


@router.get("/shareholders", response_class=HTMLResponse)
def shareholders_page(
    request: Request, db: Session = Depends(get_db), user: User | None = Depends(get_optional_user)
):
    if (redirect := _require_login(request, user)) is not None:
        return redirect
    people = db.scalars(select(Shareholder).order_by(Shareholder.name)).all()
    return templates.TemplateResponse(
        request, "shareholders.html", {"user": user, "shareholders": people}
    )
