# Shares Manager

A Python web application for managing share capital across multiple companies:
capture companies, define share types (classes), register shareholders, issue
share certificates, and maintain an auditable, append-only **share ledger**.

See [`SPEC.md`](./SPEC.md) for the full specification and [`DECISIONS.md`](./DECISIONS.md)
for architecture decisions.

## Features

- **Companies** — register and manage multiple companies.
- **Share types** — define classes (Ordinary, Preferred, …) with nominal value,
  voting/dividend rights and an authorized-share ceiling per company.
- **Shareholders** — individuals or entities, searchable.
- **Issuance** — issue shares, automatically generating a share certificate and
  a ledger entry; authorized limits are enforced.
- **Transfers & cancellations** — paired ledger entries that net to zero;
  certificates reissued/voided accordingly.
- **Share ledger** — append-only source of truth; holdings always reconcile to it.
- **Certificates** — downloadable PDF certificates (WeasyPrint; HTML fallback).
- **Reporting** — cap table, authorized-vs-issued capital summary, CSV register export.
- **Auth** — session-based login with `admin` / `viewer` roles.

## Tech stack

FastAPI · SQLAlchemy 2 · Alembic · Pydantic v2 · Jinja2 + HTMX · WeasyPrint ·
pytest. SQLite for dev, PostgreSQL for production.

## Quick start

```bash
# 1. Install (uv recommended)
uv venv --python 3.11
source .venv/bin/activate
uv pip install -e ".[dev]"

# 2. Configure
cp .env.example .env        # edit SECRET_KEY / admin credentials

# 3. Seed sample data (also creates tables + admin user)
python seed.py

# 4. Run
uvicorn app.main:app --reload
```

Open http://localhost:8000 and sign in with the admin credentials from `.env`
(default `admin@example.com` / `admin12345`). Interactive API docs at `/docs`.

## PDF certificates

PDF generation uses WeasyPrint, which needs system libraries (Pango/Cairo).
Install it with `uv pip install -e ".[pdf]"` plus your OS packages. If WeasyPrint
is unavailable, certificates are rendered as HTML instead, so the feature still
works in any environment.

## Database migrations

```bash
alembic revision --autogenerate -m "describe change"
alembic upgrade head
```

For quick local dev the app also creates tables automatically on startup.

## Tests

```bash
pytest                       # run the suite
pytest --cov=app             # with coverage
ruff check . && mypy app     # lint + type-check
```

## Docker

```bash
docker compose up --build    # app + PostgreSQL
```

The container entrypoint runs `alembic upgrade head` before starting, so the
schema is migrated on deploy. In that setup `AUTO_CREATE_TABLES=false` lets
Alembic own the schema (dev defaults to `true` for zero-setup SQLite).
