# Shares Manager — Build Specification

A Python web application for managing share capital across multiple companies:
capture companies, define share types, allocate shares to shareholders, issue
share certificates, and maintain an auditable share ledger.

> **Status:** Implemented. The application in `app/` covers Phases 0–10:
> full API, HTMX management UI, share ledger, PDF certificates, reporting,
> Docker/compose with migrate-on-deploy, and CI. Run `pytest` (24 tests,
> ~82% coverage), `ruff check .`, and `mypy app` — all green.
> See [`README.md`](./README.md) for quick start.

---

## 1. Overview

### 1.1 Goal
Provide a web-based system where an administrator can:
- Register and manage multiple **companies**.
- Define one or more **share types** (classes) per company (e.g. Ordinary, Preferred).
- Capture **shareholders** (individuals or entities).
- **Issue / allocate** shares to shareholders, generating **share certificates**.
- Record every movement (issue, transfer, cancellation) in an immutable **share ledger**.
- Report on capitalization, ownership percentages, and certificate status.

### 1.2 Non-Goals (initial release)
- No payment processing or banking integration.
- No statutory filing/submission to regulators.
- No multi-currency valuation engine (store nominal value + currency only).

---

## 2. Tech Stack

| Concern            | Choice                                            |
|--------------------|---------------------------------------------------|
| Language           | Python 3.11+                                       |
| Web framework      | FastAPI (REST API + server-rendered pages)         |
| UI                 | Jinja2 templates + HTMX (no separate SPA)          |
| ORM                | SQLAlchemy 2.x                                      |
| Migrations         | Alembic                                            |
| Database           | SQLite (dev) / PostgreSQL (prod)                   |
| Validation         | Pydantic v2                                         |
| Auth               | Session-based (secure cookies); passwords hashed via passlib (bcrypt) |
| PDF certificates   | WeasyPrint (HTML/CSS → PDF)                         |
| Testing            | pytest, pytest-cov, httpx test client              |
| Packaging / deps   | uv + pyproject.toml                                 |
| Lint / format      | ruff (lint + format) + mypy                         |
| Containerization   | Docker + docker-compose                            |

> All stack choices are locked. Rationale and alternatives are recorded in
> [`DECISIONS.md`](./DECISIONS.md).

---

## 3. Data Model

### 3.1 Entities

**Company**
- `id` (PK)
- `name`, `registration_number`, `incorporation_date`, `jurisdiction`
- `authorized_capital` (optional), `currency`
- `created_at`, `updated_at`

**ShareType** (share class)
- `id` (PK), `company_id` (FK → Company)
- `name` (e.g. "Ordinary A"), `code`
- `nominal_value`, `currency`
- `voting_rights` (bool/ratio), `dividend_rights` (text/ratio)
- `authorized_shares` (max issuable for this class, nullable)
- Unique constraint: (`company_id`, `code`)

**Shareholder**
- `id` (PK)
- `type` (individual | entity)
- `full_name` / `entity_name`, `identifier` (ID/passport/reg no.)
- `email`, `address`, `contact`
- `created_at`, `updated_at`
- A shareholder may hold shares in many companies.

**ShareAllocation / Holding**
- Derived/aggregate view of how many shares of each ShareType a Shareholder holds.
- May be materialized or computed from ledger entries.

**ShareCertificate**
- `id` (PK), `company_id` (FK), `share_type_id` (FK), `shareholder_id` (FK)
- `certificate_number` (unique per company)
- `quantity`, `issue_date`
- `status` (issued | transferred | cancelled | reissued)
- `parent_certificate_id` (nullable, for splits/transfers/reissues)
- `pdf_path` / generated artifact reference

**LedgerEntry** (append-only)
- `id` (PK), `company_id` (FK), `share_type_id` (FK)
- `shareholder_id` (FK), `certificate_id` (nullable FK)
- `entry_type` (ISSUE | TRANSFER_IN | TRANSFER_OUT | CANCEL)
- `quantity` (signed or with direction), `effective_date`
- `reference` (free text / source doc)
- `created_at`, `created_by`
- **Immutable**: corrections are made via reversing entries, never edits.

**User** (admin/operator)
- `id`, `email`, `hashed_password`, `role`, `is_active`

### 3.2 Invariants
- Total issued shares per ShareType ≤ `authorized_shares` (if set).
- A transfer creates paired ledger entries (out from sender, in to receiver) that net to zero.
- Certificate `quantity` must match sum of its originating ledger entries.
- Ledger is the source of truth; holdings are always reconcilable from it.

---

## 4. Task Breakdown

> Each task is independently committable. Suggested ordering top-to-bottom.

### Phase 0 — Project Setup
- [x] **T0.1** Initialize project: `pyproject.toml`, dependency manager, virtualenv.
- [x] **T0.2** Configure ruff/black/mypy and pre-commit hooks.
- [x] **T0.3** Add `README.md`, `DECISIONS.md`, `.gitignore`, `.env.example`.
- [x] **T0.4** Set up app skeleton (entrypoint, config loader, logging).
- [x] **T0.5** Add Docker + docker-compose (app + Postgres) and a `Makefile`/task runner.

### Phase 1 — Foundation
- [x] **T1.1** Configure SQLAlchemy engine/session + Alembic.
- [x] **T1.2** Implement DB models for all entities in §3.1.
- [x] **T1.3** Create initial Alembic migration.
- [x] **T1.4** Implement Pydantic schemas (create/read/update) per entity.
- [x] **T1.5** Seed script with sample company, share types, shareholders.

### Phase 2 — Authentication & Authorization
- [x] **T2.1** User model + password hashing + login/logout.
- [x] **T2.2** Session/JWT middleware and route protection.
- [x] **T2.3** Roles (admin vs read-only) and permission checks.

### Phase 3 — Company Management
- [x] **T3.1** CRUD endpoints for companies.
- [x] **T3.2** Company list + detail views (UI).
- [x] **T3.3** Validation (unique registration number, required fields).

### Phase 4 — Share Types
- [x] **T4.1** CRUD endpoints for share types scoped to a company.
- [x] **T4.2** Enforce authorized-shares ceiling and unique code per company.
- [x] **T4.3** UI for managing share classes within a company. *(HTMX add/delete
  forms on the company page, swapping in updated capital tables.)*

### Phase 5 — Shareholders
- [x] **T5.1** CRUD endpoints for shareholders.
- [x] **T5.2** Search/filter shareholders; link to holdings.
- [x] **T5.3** UI for shareholder management. *(HTMX add/delete forms plus live
  search on the shareholders page.)*

### Phase 6 — Share Issuance & Ledger
- [x] **T6.1** Issue-shares service: validate capacity, write ledger ISSUE entry, create certificate.
- [x] **T6.2** Transfer-shares service: paired TRANSFER_OUT/TRANSFER_IN entries + certificate reissue.
- [x] **T6.3** Cancel/forfeit shares: CANCEL ledger entry + certificate status update.
- [x] **T6.4** Holdings computation/reconciliation from ledger.
- [x] **T6.5** Ledger view (per company, per shareholder, per share type) with filters and running balance.
- [x] **T6.6** Guard against edits to ledger entries (append-only enforcement).
  *(append-only by design: no update/delete endpoints exist; corrections are
  reversing entries. A DB-trigger hard-guard is an optional hardening step.)*

### Phase 7 — Share Certificates
- [x] **T7.1** Certificate numbering scheme (sequential per company).
- [x] **T7.2** PDF certificate template (company name, holder, class, quantity, cert no., date, signatures).
- [x] **T7.3** Generate & download certificate PDF; store artifact reference.
- [x] **T7.4** Reissue/void certificate flow tied to transfers/cancellations.

### Phase 8 — Reporting & Dashboard
- [x] **T8.1** Cap table per company (holders, classes, quantities, ownership %).
- [x] **T8.2** Authorized vs issued vs available shares summary.
- [x] **T8.3** Shareholder register / statutory register export (CSV/PDF).
- [x] **T8.4** Dashboard with key metrics per company.

### Phase 9 — Quality, Testing & Docs
- [x] **T9.1** Unit tests for services (issuance, transfer, reconciliation, invariants).
- [x] **T9.2** API integration tests (auth, CRUD, error cases).
- [x] **T9.3** Test ledger immutability and authorized-capital enforcement.
- [x] **T9.4** Coverage target ≥ 80%; CI workflow (GitHub Actions) running lint + tests.
- [x] **T9.5** API docs (auto OpenAPI at `/docs`) and usage guide in `README.md`.

### Phase 10 — Deployment (optional/stretch)
- [x] **T10.1** Production config, env management, secrets (`.env`, `Settings`).
- [x] **T10.2** Healthcheck endpoint (`/health`) and migrations on deploy: the
  Docker entrypoint runs `alembic upgrade head` before starting; production sets
  `AUTO_CREATE_TABLES=false` so Alembic owns the schema.
- [x] **T10.3** Deploy guide (Docker / docker-compose in `README.md`).

---

## 5. API Surface (indicative)

```
POST   /auth/login
POST   /auth/logout

GET    /companies            POST /companies
GET    /companies/{id}       PUT  /companies/{id}      DELETE /companies/{id}

GET    /companies/{id}/share-types     POST /companies/{id}/share-types
PUT    /share-types/{id}               DELETE /share-types/{id}

GET    /shareholders          POST /shareholders
GET    /shareholders/{id}     PUT  /shareholders/{id}   DELETE /shareholders/{id}

POST   /companies/{id}/issue            # issue shares -> ledger + certificate
POST   /transfers                       # transfer between shareholders
POST   /certificates/{id}/cancel

GET    /companies/{id}/ledger           # filterable
GET    /companies/{id}/cap-table
GET    /certificates/{id}               GET /certificates/{id}/pdf
GET    /companies/{id}/register/export
```

---

## 6. Acceptance Criteria

1. Can create multiple companies, each with independent share types.
2. Can define share types with nominal value and authorized limits.
3. Can register shareholders and allocate shares to them.
4. Issuing shares produces a ledger entry **and** a downloadable PDF certificate.
5. Transfers and cancellations are reflected accurately in ledger and holdings.
6. Ledger is append-only; holdings always reconcile to the ledger.
7. Authorized-share limits are enforced and violations rejected with clear errors.
8. Cap table and shareholder register reports are correct and exportable.
9. Test suite passes with ≥ 80% coverage; lint and type checks clean.

---

## 7. Resolved Decisions

All initial open questions have been settled — see [`DECISIONS.md`](./DECISIONS.md)
for full rationale.

| # | Question | Decision |
|---|----------|----------|
| D1 | Web framework | **FastAPI** |
| D2 | UI approach | **Jinja2 + HTMX** (server-rendered, no SPA) |
| D3 | PDF library | **WeasyPrint** (HTML/CSS → PDF) |
| D4 | Tenancy / access | **Single-tenant**, role-based (`admin`, `viewer`) |
| D5 | Share granularity | **Integer shares only** (no fractional) |
| D6 | Audit logging | **Ledger** (authoritative) **+ lightweight `AuditLog`** |
| D7 | Deps & tooling | **uv** + ruff + mypy + pytest + pre-commit |
| D8 | Database | **SQLite (dev) / PostgreSQL (prod)** via SQLAlchemy + Alembic |
| D9 | Authentication | **Session-based** secure cookies, bcrypt via passlib |

### Schema impact of D6
Add an **AuditLog** entity for non-ledger mutations:
- `id` (PK), `actor_user_id` (FK → User), `action`, `entity_type`, `entity_id`
- `summary` (text), `created_at`
