#!/usr/bin/env python3
"""EOCNS Lecturer Hours & Compliance Report (ReportLab)."""
from __future__ import annotations
import argparse, json, sys
from datetime import datetime
from pathlib import Path
from io import BytesIO

sys.path.insert(0, str(Path(__file__).resolve().parent))
from letterhead import (
    build_letterhead, signature_block, make_doc, section_bar, meta_grid,
    data_table, kpi_row, spacer, gold_rule, style, NAVY, GOLD, GREEN, RED, MUTED, DARK,
)
from reportlab.platypus import Paragraph


def build_lecturer_hours_pdf(payload: dict) -> bytes:
    officer = (payload.get("officer_name") or "QA Officer").strip()
    period = payload.get("period_label") or payload.get("period") or "—"
    rows = payload.get("lecturers") or payload.get("rows") or []
    totals = payload.get("totals") or {}
    amendments = payload.get("amendments") or []

    planned = float(totals.get("hours_planned") or sum(float(r.get("hours_planned") or r.get("planned") or 0) for r in rows))
    held = float(totals.get("hours_held") or sum(float(r.get("hours_held") or r.get("held") or 0) for r in rows))
    variance = held - planned
    rate = (100.0 * held / planned) if planned else 0.0

    buf = BytesIO()
    title = f"Lecturer Hours & Compliance — {period}"
    doc, canvas_factory = make_doc(buf, officer, title)
    story = []
    build_letterhead(story, "Lecturer Hours & Compliance Report", subtitle="Quality Assurance Department", period_line=f"Period: {period}",
    )
    story.append(spacer(8))
    story.append(meta_grid([
        ("Period", period),
        ("Lecturers listed", str(len(rows))),
        ("Issuing officer", officer),
        ("Generated", datetime.now().strftime("%d %b %Y %H:%M")),
    ]))
    story.append(spacer(10))
    story.append(kpi_row([
        ("Hours planned", f"{planned:.1f}", NAVY),
        ("Hours held", f"{held:.1f}", GREEN if held >= planned else GOLD),
        ("Variance", f"{variance:+.1f}", GREEN if variance >= 0 else RED),
        ("Delivery rate", f"{rate:.1f}%", GREEN if rate >= 90 else GOLD if rate >= 75 else RED),
    ]))
    story.append(spacer(12))
    story.append(section_bar("Lecturer detail"))
    story.append(spacer(6))
    if rows:
        headers = ["#", "Staff ID", "Name", "Courses", "Planned (h)", "Held (h)", "Variance", "Rate %"]
        body = []
        for i, r in enumerate(rows, 1):
            hp = float(r.get("hours_planned") or r.get("planned") or 0)
            hh = float(r.get("hours_held") or r.get("held") or 0)
            rt = (100.0 * hh / hp) if hp else 0.0
            body.append([
                str(i), r.get("staff_id") or r.get("id") or "—", r.get("name") or "—",
                r.get("courses") or r.get("course") or "—",
                f"{hp:.1f}", f"{hh:.1f}", f"{hh - hp:+.1f}", f"{rt:.1f}%",
            ])
        story.append(data_table(headers, body))
    else:
        story.append(Paragraph("No lecturer rows in payload.", style(fontSize=9, textColor=MUTED)))

    if amendments:
        story.append(spacer(12))
        story.append(section_bar("Related master-list amendments"))
        story.append(spacer(6))
        for a in amendments[:40]:
            story.append(Paragraph(f"• <b>{a.get('ref') or '—'}</b> — {a.get('summary') or a.get('reason') or ''}", style(fontSize=8.5)))

    story.append(spacer(10))
    story.append(section_bar("Glossary"))
    story.append(spacer(4))
    for t, m in [
        ("Hours planned", "Contract / timetable contact hours expected in the period."),
        ("Hours held", "Logged lecture duration actually delivered and recorded in QA."),
        ("Variance", "Held − planned. Negative values indicate under-delivery."),
        ("Delivery rate", "Held ÷ planned × 100."),
    ]:
        story.append(Paragraph(f"<b>{t}:</b> {m}", style(fontSize=8.5)))

    story.append(spacer(20))
    story.append(gold_rule())
    story.append(spacer(10))
    story.append(signature_block(officer))
    doc.build(story, canvasmaker=canvas_factory)
    return buf.getvalue()


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--payload")
    ap.add_argument("-o", "--output", required=True)
    args = ap.parse_args()
    payload = json.loads(Path(args.payload).read_text(encoding="utf-8")) if args.payload else json.load(sys.stdin)
    Path(args.output).write_bytes(build_lecturer_hours_pdf(payload))
    print("OK", args.output)
