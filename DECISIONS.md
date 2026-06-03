# Architecture Decision Record

Decisions locked for the initial release of Shares Manager. Each entry notes the
choice, the rationale, and the main alternative considered.

---

## D1 — Web framework: **FastAPI**
- **Choice:** FastAPI for both the JSON API and server-rendered pages.
- **Rationale:** First-class Pydantic v2 integration, automatic OpenAPI docs,
  async support, and strong typing fit the data-validation-heavy nature of a
  share register. One framework serves both API consumers and the admin UI.
- **Alternative:** Flask — simpler but lacks built-in validation/OpenAPI and
  would need more glue.

## D2 — UI approach: **Server-rendered Jinja2 + HTMX**
- **Choice:** Server-side templates with HTMX for partial updates; no separate
  SPA build.
- **Rationale:** This is an internal admin tool with form-driven CRUD. HTMX
  gives interactive UX (inline edits, filtered ledger tables) without the
  overhead of a JS framework, build pipeline, or separate deploy.
- **Alternative:** React/Vue SPA — more capable but unjustified complexity for
  v1; the REST API remains available if a SPA is added later.

## D3 — PDF certificates: **WeasyPrint**
- **Choice:** WeasyPrint, rendering an HTML/CSS certificate template to PDF.
- **Rationale:** Certificates are designed as styled HTML, reusing the same
  templating engine (Jinja2) as the UI. Easier to design and iterate than
  imperative drawing.
- **Alternative:** ReportLab — more control over precise layout but slower to
  author; revisit only if WeasyPrint's CSS rendering proves limiting.

## D4 — Tenancy: **Single-tenant, role-based access**
- **Choice:** One operating organization (e.g. a company secretary / firm)
  managing many client companies. Access controlled by roles, not tenant
  isolation.
- **Roles:** `admin` (full read/write, user management) and `viewer`
  (read-only reports and ledger).
- **Rationale:** Matches the described use case (one operator capturing multiple
  companies). Avoids row-level tenant scoping complexity in v1.
- **Alternative:** Multi-tenant with org isolation — deferred; the schema keeps
  companies as the top-level grouping so this can be layered on later.

## D5 — Share granularity: **Integer shares only**
- **Choice:** Quantities are non-negative integers; no fractional shares.
- **Rationale:** Standard for share certificates and registers. Simplifies
  ledger arithmetic and reconciliation invariants.
- **Alternative:** Decimal/fractional shares — out of scope; can be introduced
  by widening quantity columns and validation if ever required.

## D6 — Audit logging: **Ledger + lightweight action audit**
- **Choice:** The append-only `LedgerEntry` table is the authoritative record of
  share movements. A separate, lightweight `AuditLog` captures non-ledger
  mutations (company/share-type/shareholder edits, logins, certificate voids)
  with actor, timestamp, entity, and action.
- **Rationale:** The ledger covers the financially significant events; a thin
  audit log gives traceability for the rest without over-engineering.
- **Alternative:** Full event-sourcing — unnecessary for v1.

## D7 — Dependency management & tooling: **uv + pyproject.toml**
- **Choice:** `uv` for environment and dependency management; `ruff` (lint +
  format), `mypy` (types), `pytest` (tests), `pre-commit` hooks.
- **Rationale:** `uv` is fast and reproducible with a single lockfile; `ruff`
  consolidates linting and formatting.
- **Alternative:** Poetry — solid but slower; Black-separate-from-Ruff — extra
  tool with no benefit over Ruff's formatter.

## D8 — Database: **SQLite (dev) / PostgreSQL (prod)** via SQLAlchemy + Alembic
- **Choice:** SQLAlchemy 2.x ORM, Alembic migrations, SQLite locally and
  PostgreSQL in production.
- **Rationale:** Zero-setup local dev, production-grade concurrency and
  constraints in prod. Same models/migrations across both.

## D9 — Authentication: **Session-based with secure cookies**
- **Choice:** Server-side sessions with HTTP-only secure cookies; passwords
  hashed with `passlib` (bcrypt).
- **Rationale:** Fits the server-rendered UI; avoids token storage/refresh
  complexity of JWT for a single-tenant admin tool.
- **Alternative:** JWT — better for a decoupled SPA/mobile client; revisit if
  the API gains external consumers.
