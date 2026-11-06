#!/usr/bin/env python3
"""EOCNS Remedial Weekly & Summary Reports (ReportLab)."""
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


def _pct(n, d):
    return round(100.0 * float(n) / float(d), 1) if d else 0.0


def build_remedial_weekly_pdf(payload: dict) -> bytes:
    officer = (payload.get("officer_name") or "QA Officer").strip()
    week_label = payload.get("week_label") or payload.get("period_label") or "—"
    start = payload.get("start") or ""
    end = payload.get("end") or ""
    courses = payload.get("courses") or payload.get("course_rows") or []
    students = payload.get("students") or []
    totals = payload.get("totals") or {}
    tentative = payload.get("tentative") or payload.get("at_risk") or []
    amendments = payload.get("amendments") or []

    avg = float(totals.get("avg_attendance_pct") or 0)
    enrolled = int(totals.get("enrolled") or len(students) or 0)
    sessions = int(totals.get("sessions") or totals.get("held") or 0)

    buf = BytesIO()
    title = f"Remedial Weekly Report — {week_label}"
    doc, canvas_factory = make_doc(buf, officer, title)
    story = []
    build_letterhead(
        story,
        "Remedial Programme — Weekly Report",
        subtitle="Quality Assurance Department",
        period_line=(f"{week_label} ({start} → {end})" if start else week_label),
    )
    story.append(spacer(8))
    story.append(meta_grid([
        ("Week", week_label),
        ("Date range", f"{start} → {end}" if start else "—"),
        ("Enrolled", str(enrolled)),
        ("Sessions held", str(sessions)),
        ("Issuing officer", officer),
        ("Generated", datetime.now().strftime("%d %b %Y %H:%M")),
    ]))
    story.append(spacer(10))
    story.append(kpi_row([
        ("Enrolled", str(enrolled), NAVY),
        ("Sessions", str(sessions), NAVY),
        ("Avg attendance", f"{avg:.1f}%", GREEN if avg >= 75 else GOLD if avg >= 60 else RED),
        ("Courses", str(len(courses)), NAVY),
        ("Tentative / at risk", str(len(tentative)), RED if tentative else GREEN),
    ]))

    story.append(spacer(12))
    story.append(section_bar("Course-specific attendance"))
    story.append(spacer(6))
    if courses:
        headers = ["#", "Course", "Sessions", "Avg att. %", "Present avg", "Absent avg"]
        body = []
        for i, c in enumerate(courses, 1):
            body.append([
                str(i), c.get("course") or c.get("code") or "—",
                str(c.get("sessions") or c.get("held") or "—"),
                f"{float(c.get('attendance_pct') or 0):.1f}%",
                str(c.get("present_avg") or c.get("present") or "—"),
                str(c.get("absent_avg") or c.get("absent") or "—"),
            ])
        story.append(data_table(headers, body))
    else:
        story.append(Paragraph("No course rows in payload.", style(fontSize=9, textColor=MUTED)))

    if students:
        story.append(spacer(12))
        story.append(section_bar("Student attendance (this week)"))
        story.append(spacer(6))
        headers = ["#", "Name", "Reg. No", "Present", "Absent", "Att. %"]
        body = []
        ordered = sorted(students, key=lambda s: float(s.get("attendance_pct") or 0))
        for i, s in enumerate(ordered, 1):
            body.append([
                str(i), s.get("name") or "—", s.get("regNo") or s.get("reg_no") or "—",
                str(s.get("present") or "—"), str(s.get("absent") or "—"),
                f"{float(s.get('attendance_pct') or 0):.1f}%",
            ])
        story.append(data_table(headers, body))

    if tentative:
        story.append(spacer(12))
        story.append(section_bar("Tentative / follow-up list"))
        story.append(spacer(6))
        headers = ["#", "Name", "Reg. No", "Att. %", "Note"]
        body = [[str(i), t.get("name") or "—", t.get("regNo") or t.get("reg_no") or "—",
                 f"{float(t.get('attendance_pct') or 0):.1f}%", t.get("note") or ""]
                for i, t in enumerate(tentative, 1)]
        story.append(data_table(headers, body))

    if amendments:
        story.append(spacer(12))
        story.append(section_bar("Amendments"))
        story.append(spacer(4))
        for a in amendments[:40]:
            story.append(Paragraph(f"• <b>{a.get('ref') or '—'}</b> — {a.get('summary') or a.get('reason') or ''}", style(fontSize=8.5)))

    story.append(spacer(10))
    story.append(section_bar("Glossary"))
    story.append(spacer(4))
    for t, m in [
        ("Remedial enrolment", "Separate from the main programme roll — own timetable and attendance logs."),
        ("Tentative list", "Students below the remedial attendance threshold who may not qualify without improvement."),
        ("Course-specific attendance", "Attendance computed only for sessions of that remedial course."),
    ]:
        story.append(Paragraph(f"<b>{t}:</b> {m}", style(fontSize=8.5)))

    story.append(spacer(20))
    story.append(gold_rule())
    story.append(spacer(10))
    story.append(signature_block(officer))
    doc.build(story, canvasmaker=canvas_factory)
    return buf.getvalue()


def build_remedial_summary_pdf(payload: dict) -> bytes:
    """Multi-week remedial summary."""
    officer = (payload.get("officer_name") or "QA Officer").strip()
    period = payload.get("period_label") or f"{payload.get('start', '')} → {payload.get('end', '')}"
    weeks = payload.get("weeks") or []
    students = payload.get("students") or []
    totals = payload.get("totals") or {}
    amendments = payload.get("amendments") or []

    avg = float(totals.get("avg_attendance_pct") or 0)
    enrolled = int(totals.get("enrolled") or len(students) or 0)

    buf = BytesIO()
    title = f"Remedial Summary — {period}"
    doc, canvas_factory = make_doc(buf, officer, title)
    story = []
    build_letterhead(
        story,
        "Remedial Programme — Summary Report",
        subtitle="Quality Assurance Department",
        period_line=f"Period: {period}",
    )
    story.append(spacer(8))
    story.append(meta_grid([
        ("Period", period),
        ("Weeks covered", str(len(weeks) or totals.get("weeks") or "—")),
        ("Enrolled", str(enrolled)),
        ("Issuing officer", officer),
        ("Generated", datetime.now().strftime("%d %b %Y %H:%M")),
        ("Overall avg attendance", f"{avg:.1f}%"),
    ]))
    story.append(spacer(10))
    story.append(kpi_row([
        ("Enrolled", str(enrolled), NAVY),
        ("Weeks", str(len(weeks) or totals.get("weeks") or 0), NAVY),
        ("Avg attendance", f"{avg:.1f}%", GREEN if avg >= 75 else GOLD if avg >= 60 else RED),
        ("Sessions", str(totals.get("sessions") or 0), NAVY),
    ]))

    if weeks:
        story.append(spacer(12))
        story.append(section_bar("Week-by-week overview"))
        story.append(spacer(6))
        headers = ["Week", "Date range", "Sessions", "Avg att. %"]
        body = [[w.get("label") or w.get("week") or "—",
                 w.get("range") or f"{w.get('start', '')}–{w.get('end', '')}",
                 str(w.get("sessions") or "—"),
                 f"{float(w.get('attendance_pct') or 0):.1f}%"] for w in weeks]
        story.append(data_table(headers, body))

    if students:
        story.append(spacer(12))
        story.append(section_bar("Cumulative student performance"))
        story.append(spacer(6))
        headers = ["#", "Name", "Reg. No", "Present", "Absent", "Att. %", "Outcome note"]
        body = []
        ordered = sorted(students, key=lambda s: float(s.get("attendance_pct") or 0))
        for i, s in enumerate(ordered, 1):
            body.append([
                str(i), s.get("name") or "—", s.get("regNo") or s.get("reg_no") or "—",
                str(s.get("present") or "—"), str(s.get("absent") or "—"),
                f"{float(s.get('attendance_pct') or 0):.1f}%",
                s.get("note") or s.get("outcome") or "",
            ])
        story.append(data_table(headers, body))

    if amendments:
        story.append(spacer(12))
        story.append(section_bar("Amendments in period"))
        story.append(spacer(4))
        for a in amendments[:40]:
            story.append(Paragraph(f"• <b>{a.get('ref') or '—'}</b> — {a.get('summary') or a.get('reason') or ''}", style(fontSize=8.5)))

    story.append(spacer(10))
    story.append(section_bar("Glossary"))
    story.append(spacer(4))
    for t, m in [
        ("Summary period", "Aggregates all remedial weeks between the start and end dates inclusive."),
        ("Outcome note", "QA remark (e.g. cleared, still tentative, withdrawn)."),
        ("Cumulative attendance", "Present ÷ all remedial sessions in the summary window × 100."),
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
    ap.add_argument("--type", choices=["remedial_weekly", "remedial_summary"], default="remedial_weekly")
    ap.add_argument("--payload")
    ap.add_argument("-o", "--output", required=True)
    args = ap.parse_args()
    payload = json.loads(Path(args.payload).read_text(encoding="utf-8")) if args.payload else json.load(sys.stdin)
    fn = build_remedial_weekly_pdf if args.type == "remedial_weekly" else build_remedial_summary_pdf
    Path(args.output).write_bytes(fn(payload))
    print("OK", args.output)
