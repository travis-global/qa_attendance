#!/usr/bin/env python3
"""EOCNS Weekly QA Compliance Report (ReportLab)."""
from __future__ import annotations
import argparse, json, sys
from datetime import datetime
from pathlib import Path
from io import BytesIO

sys.path.insert(0, str(Path(__file__).resolve().parent))
from letterhead import (
    build_letterhead, signature_block, make_doc, section_bar, meta_grid,
    data_table, kpi_row, spacer, gold_rule, style,
    CONTENT_W, NAVY, GOLD, GREEN, RED, MUTED, DARK, LIGHT, AMBER,
)
from reportlab.platypus import Paragraph, Spacer, Table, TableStyle, KeepTogether
from reportlab.lib.enums import TA_CENTER
from reportlab.lib import colors


def _pct(n, d):
    if not d:
        return 0.0
    return round(100.0 * float(n) / float(d), 1)


def _status_color(pct):
    if pct >= 90:
        return GREEN
    if pct >= 75:
        return NAVY
    if pct >= 60:
        return GOLD
    return RED


def build_weekly_qa_pdf(payload: dict) -> bytes:
    officer = (payload.get("officer_name") or "QA Officer").strip()
    class_label = payload.get("class_label") or payload.get("classKey") or "—"
    start = payload.get("start") or payload.get("week_start") or ""
    end = payload.get("end") or payload.get("week_end") or ""
    period = payload.get("period_label") or f"{start} → {end}"
    dept = payload.get("department") or "Nursing Sciences"
    course_rows = payload.get("course_rows") or payload.get("courses") or []
    lecturers = payload.get("lecturer_hours") or payload.get("lecturers") or []
    absentees = payload.get("chronic_absentees") or payload.get("absentees") or []
    totals = payload.get("totals") or {}
    amendments = payload.get("amendments") or []
    glossary = payload.get("glossary") or []

    scheduled = int(totals.get("scheduled") or totals.get("planned") or len(course_rows) or 0)
    held = int(totals.get("held") or totals.get("delivered") or 0)
    cancelled = int(totals.get("cancelled") or max(0, scheduled - held))
    compliance = float(totals.get("compliance_pct") or _pct(held, scheduled))
    avg_att = float(totals.get("avg_attendance_pct") or totals.get("attendance_pct") or 0)

    buf = BytesIO()
    title = f"Weekly QA Report — {class_label}"
    doc, canvas_factory = make_doc(buf, officer, title)
    story = []
    build_letterhead(story, "Weekly Quality Assurance Report", subtitle=f"{class_label} · {dept}", period_line=f"Period: {period}",
    )
    story.append(spacer(8))
    story.append(meta_grid([
        ("Programme / Level", class_label),
        ("Reporting period", period),
        ("Department", dept),
        ("Generated", datetime.now().strftime("%d %b %Y %H:%M")),
        ("Issuing officer", officer),
        ("Scheduled sessions", str(scheduled)),
    ]))
    story.append(spacer(10))
    story.append(kpi_row([
        ("Scheduled", str(scheduled), NAVY),
        ("Held", str(held), GREEN),
        ("Cancelled / Missed", str(cancelled), RED if cancelled else NAVY),
        ("Compliance", f"{compliance:.1f}%", _status_color(compliance)),
        ("Avg attendance", f"{avg_att:.1f}%", _status_color(avg_att)),
    ]))
    story.append(spacer(12))

    # Course compliance table
    story.append(section_bar("Course delivery & attendance"))
    story.append(spacer(6))
    headers = ["#", "Course", "Lecturer", "Planned", "Held", "Compliance", "Avg att. %", "Status"]
    body = []
    for i, r in enumerate(course_rows, 1):
        planned = int(r.get("planned") or r.get("scheduled") or 0)
        did = int(r.get("held") or r.get("delivered") or 0)
        comp = float(r.get("compliance_pct") or _pct(did, planned))
        att = float(r.get("attendance_pct") or r.get("avg_attendance") or 0)
        st = r.get("status") or ("Excellent" if comp >= 90 else "Good" if comp >= 75 else "At risk" if comp >= 60 else "Critical")
        body.append([
            str(i),
            r.get("course") or r.get("code") or "—",
            r.get("lecturer") or r.get("lecturer_name") or "—",
            str(planned), str(did), f"{comp:.0f}%", f"{att:.1f}%", st,
        ])
    if body:
        story.append(data_table(headers, body))
    else:
        story.append(Paragraph("No course rows in payload.", style(fontSize=9, textColor=MUTED)))

    story.append(spacer(12))
    story.append(section_bar("Lecturer contact hours (this week)"))
    story.append(spacer(6))
    if lecturers:
        h2 = ["#", "Lecturer", "Courses", "Hours planned", "Hours held", "Variance"]
        b2 = []
        for i, L in enumerate(lecturers, 1):
            hp = float(L.get("hours_planned") or L.get("planned_hours") or 0)
            hh = float(L.get("hours_held") or L.get("held_hours") or 0)
            b2.append([
                str(i), L.get("name") or "—", L.get("courses") or L.get("course") or "—",
                f"{hp:.1f}", f"{hh:.1f}", f"{hh - hp:+.1f}",
            ])
        story.append(data_table(h2, b2))
    else:
        story.append(Paragraph("No lecturer hour rows supplied.", style(fontSize=9, textColor=MUTED)))

    story.append(spacer(12))
    story.append(section_bar("Students requiring attention"))
    story.append(spacer(6))
    if absentees:
        h3 = ["#", "Name", "Reg. No", "Sessions missed", "Attendance %", "Note"]
        b3 = []
        for i, a in enumerate(absentees, 1):
            b3.append([
                str(i), a.get("name") or "—", a.get("regNo") or a.get("reg_no") or "—",
                str(a.get("missed") or a.get("absent") or "—"),
                f"{float(a.get('attendance_pct') or 0):.1f}%",
                a.get("note") or "",
            ])
        story.append(data_table(h3, b3))
    else:
        story.append(Paragraph("No chronic absentees flagged for this week.", style(fontSize=9, textColor=GREEN)))

    if amendments:
        story.append(spacer(12))
        story.append(section_bar("Master-list amendments in period"))
        story.append(spacer(6))
        for a in amendments[:40]:
            story.append(Paragraph(
                f"• <b>{a.get('ref') or a.get('REF') or '—'}</b> — {a.get('summary') or a.get('reason') or a.get('action') or ''}"
                f" <font color='#64748B'>({a.get('at') or a.get('date') or ''})</font>",
                style(fontSize=8.5),
            ))

    story.append(spacer(10))
    story.append(section_bar("Glossary"))
    story.append(spacer(4))
    terms = glossary or [
        ("Compliance", "Held sessions ÷ scheduled sessions × 100 for the reporting week."),
        ("Avg attendance", "Mean of (present ÷ registered) across held sessions in the week."),
        ("At risk / Critical", "Compliance or attendance below institutional thresholds (75% / 60%)."),
        ("Variance (hours)", "Hours held minus hours planned for the lecturer in this week."),
    ]
    for term, meaning in terms:
        story.append(Paragraph(f"<b>{term}:</b> {meaning}", style(fontSize=8.5, textColor=DARK)))

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
    Path(args.output).write_bytes(build_weekly_qa_pdf(payload))
    print("OK", args.output)
