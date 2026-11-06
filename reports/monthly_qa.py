#!/usr/bin/env python3
"""EOCNS Monthly QA / Attendance Analysis Report (ReportLab)."""
from __future__ import annotations
import argparse, json, sys
from datetime import datetime
from pathlib import Path
from io import BytesIO

sys.path.insert(0, str(Path(__file__).resolve().parent))
from letterhead import (
    build_letterhead, signature_block, make_doc, section_bar, meta_grid,
    data_table, kpi_row, spacer, gold_rule, style,
    NAVY, GOLD, GREEN, RED, MUTED, DARK,
)
from reportlab.platypus import Paragraph


def _pct(n, d):
    return round(100.0 * float(n) / float(d), 1) if d else 0.0


def _band(pct):
    if pct >= 90:
        return "Excellent", GREEN
    if pct >= 75:
        return "Good", NAVY
    if pct >= 60:
        return "At risk", GOLD
    return "Critical", RED


def build_monthly_qa_pdf(payload: dict) -> bytes:
    officer = (payload.get("officer_name") or "QA Officer").strip()
    class_label = payload.get("class_label") or "—"
    month = payload.get("month_label") or payload.get("month") or ""
    year = payload.get("year") or ""
    period = payload.get("period_label") or f"{month} {year}".strip()
    dept = payload.get("department") or "Nursing Sciences"
    students = payload.get("students") or payload.get("student_rows") or []
    courses = payload.get("courses") or payload.get("course_rows") or []
    totals = payload.get("totals") or {}
    risk = payload.get("risk_summary") or {}
    amendments = payload.get("amendments") or []

    n_students = int(totals.get("students") or len(students) or 0)
    sessions = int(totals.get("sessions") or totals.get("held") or 0)
    avg_att = float(totals.get("avg_attendance_pct") or 0)
    perfect = int(risk.get("perfect") or totals.get("perfect") or 0)
    at_risk = int(risk.get("at_risk") or 0)
    critical = int(risk.get("critical") or 0)

    buf = BytesIO()
    title = f"Monthly QA Report — {class_label} — {period}"
    doc, canvas_factory = make_doc(buf, officer, title)
    story = []
    build_letterhead(story, "Monthly Quality Assurance Report", subtitle=f"{class_label} · {dept}", period_line=f"Period: {period}",
    )
    story.append(spacer(8))
    story.append(meta_grid([
        ("Class", class_label),
        ("Month", period),
        ("Department", dept),
        ("Sessions analysed", str(sessions)),
        ("Students on roll", str(n_students)),
        ("Issuing officer", officer),
    ]))
    story.append(spacer(10))
    band, bcol = _band(avg_att)
    story.append(kpi_row([
        ("Students", str(n_students), NAVY),
        ("Sessions held", str(sessions), NAVY),
        ("Avg attendance", f"{avg_att:.1f}%", bcol),
        ("Perfect (100%)", str(perfect), GREEN),
        ("At risk", str(at_risk), GOLD),
        ("Critical", str(critical), RED),
    ]))
    story.append(spacer(8))
    story.append(Paragraph(
        f"<b>Overall band:</b> {band}. Thresholds — Excellent ≥90%, Good ≥75%, At risk ≥60%, Critical &lt;60%.",
        style(fontSize=9, textColor=DARK),
    ))

    story.append(spacer(12))
    story.append(section_bar("Course performance"))
    story.append(spacer(6))
    if courses:
        headers = ["#", "Course", "Sessions", "Avg att. %", "Band"]
        body = []
        for i, c in enumerate(courses, 1):
            att = float(c.get("attendance_pct") or c.get("avg_attendance") or 0)
            b, _ = _band(att)
            body.append([str(i), c.get("course") or c.get("code") or "—",
                         str(c.get("sessions") or c.get("held") or "—"), f"{att:.1f}%", b])
        story.append(data_table(headers, body))
    else:
        story.append(Paragraph("No course summary rows in payload.", style(fontSize=9, textColor=MUTED)))

    story.append(spacer(12))
    story.append(section_bar("Student attendance register (ranked)"))
    story.append(spacer(6))
    if students:
        headers = ["#", "Name", "Reg. No", "Present", "Absent", "Att. %", "Band"]
        body = []
        # sort lowest attendance first for risk visibility
        ordered = sorted(students, key=lambda s: float(s.get("attendance_pct") or s.get("pct") or 0))
        for i, s in enumerate(ordered, 1):
            att = float(s.get("attendance_pct") or s.get("pct") or 0)
            b, _ = _band(att)
            body.append([
                str(i), s.get("name") or "—", s.get("regNo") or s.get("reg_no") or "—",
                str(s.get("present") or "—"), str(s.get("absent") or "—"),
                f"{att:.1f}%", b,
            ])
        story.append(data_table(headers, body))
    else:
        story.append(Paragraph("No student rows in payload.", style(fontSize=9, textColor=MUTED)))

    if amendments:
        story.append(spacer(12))
        story.append(section_bar("Master-list amendments this month"))
        story.append(spacer(6))
        for a in amendments[:50]:
            story.append(Paragraph(
                f"• <b>{a.get('ref') or '—'}</b> — {a.get('summary') or a.get('reason') or ''}",
                style(fontSize=8.5),
            ))

    story.append(spacer(10))
    story.append(section_bar("Glossary"))
    story.append(spacer(4))
    for term, meaning in [
        ("Attendance %", "Present count ÷ sessions held for that student × 100."),
        ("Perfect", "Students with 100% attendance in the month."),
        ("At risk", "Attendance between 60% and 74.9%."),
        ("Critical", "Attendance below 60% — requires follow-up."),
        ("Band", "Institutional risk category derived from attendance %."),
    ]:
        story.append(Paragraph(f"<b>{term}:</b> {meaning}", style(fontSize=8.5)))

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
    Path(args.output).write_bytes(build_monthly_qa_pdf(payload))
    print("OK", args.output)
