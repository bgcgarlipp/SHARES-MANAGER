"""Certificate numbering and PDF rendering."""

from __future__ import annotations

from datetime import date

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models import ShareCertificate

settings = get_settings()


def next_certificate_number(db: Session, company_id: int) -> str:
    """Sequential, zero-padded certificate number scoped to a company."""
    count = db.scalar(
        select(func.count(ShareCertificate.id)).where(
            ShareCertificate.company_id == company_id
        )
    )
    return f"C-{(count or 0) + 1:05d}"


def render_certificate_html(cert: ShareCertificate) -> str:
    """Self-contained HTML used both for preview and PDF generation."""
    c = cert
    return f"""<!doctype html>
<html><head><meta charset="utf-8"><style>
  body {{ font-family: Georgia, serif; margin: 0; padding: 40px; }}
  .border {{ border: 6px double #2c3e50; padding: 40px; text-align: center; }}
  h1 {{ font-size: 28px; letter-spacing: 2px; margin-bottom: 0; }}
  .sub {{ color: #555; margin-top: 4px; }}
  .qty {{ font-size: 40px; margin: 24px 0; color: #2c3e50; }}
  table {{ margin: 24px auto; border-collapse: collapse; }}
  td {{ padding: 6px 16px; text-align: left; }}
  .label {{ color: #777; }}
  .sign {{ margin-top: 48px; display: flex; justify-content: space-around; }}
  .sign div {{ border-top: 1px solid #333; width: 200px; padding-top: 6px; }}
</style></head>
<body><div class="border">
  <h1>{c.company.name}</h1>
  <div class="sub">Share Certificate &mdash; {c.certificate_number}</div>
  <div class="qty">{c.quantity:,} shares</div>
  <table>
    <tr><td class="label">Holder</td><td>{c.shareholder.name}</td></tr>
    <tr><td class="label">Share class</td><td>{c.share_type.name} ({c.share_type.code})</td></tr>
    <tr><td class="label">Nominal value</td>
        <td>{c.share_type.currency} {c.share_type.nominal_value} each</td></tr>
    <tr><td class="label">Issue date</td><td>{c.issue_date.isoformat()}</td></tr>
    <tr><td class="label">Status</td><td>{c.status.value}</td></tr>
  </table>
  <div class="sign"><div>Director</div><div>Secretary</div></div>
</div></body></html>"""


def generate_certificate_pdf(cert: ShareCertificate) -> str | None:
    """Render the certificate to a PDF file. Returns the path, or None if the
    optional WeasyPrint dependency is unavailable (HTML is written instead)."""
    html = render_certificate_html(cert)
    out_dir = settings.artifacts_path
    base = out_dir / f"cert_{cert.company_id}_{cert.certificate_number}"
    try:
        from weasyprint import HTML  # type: ignore

        pdf_path = base.with_suffix(".pdf")
        HTML(string=html).write_pdf(str(pdf_path))
        return str(pdf_path)
    except Exception:
        # Fallback: persist HTML so the feature still works without system libs.
        html_path = base.with_suffix(".html")
        html_path.write_text(html, encoding="utf-8")
        return str(html_path)


def _today(value: date | None) -> date:
    return value or date.today()
