#!/usr/bin/env python3
"""
EOCNS Daily QA / Lecture Report Generator
Professional PDF with institutional letterhead, officer attribution, and audit footer.

Input JSON schema (stdin or --payload path):
{
  "report_type": "daily_qa",
  "officer_name": "Fortunatus A. Fayeofori",
  "class_label": "100 Level Nursing",
  "department": "100 Level Nursing Department",
  "session": "2025/2026 Session",
  "report_date": "2026-09-11",
  "schedule": [
    {"sn": 1, "title": "Practicum", "code": "PRAC", "start": "1:00 PM", "end": "3:10 PM", "remark": ""}
  ],
  "courses": [
    {
      "code": "PRAC",
      "title": "Practicum",
      "lecturer": "Ms. Theresa Ezeude",
      "topic": "Revision",
      "date": "11th September, 2026",
      "time": "1:00 PM - 3:10 PM",
      "objectives": "",
      "summary": "",
      "remarks": "",
      "absent": [{"serial": "2", "name": "Nnachi Anya Nnachi"}, ...]
    }
  ],
  "totals": {"registered": 170, "present": 72, "absent": 98}
}
"""
from __future__ import annotations
import argparse, json, sys, io
from datetime import datetime
from pathlib import Path

from reportlab.platypus import Paragraph, Spacer, PageBreak, KeepTogether
from reportlab.lib.units import cm
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY

# allow running from repo root or reports/
sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from letterhead import (
    build_letterhead, signature_block, make_doc, section_bar, meta_grid,
    data_table, absent_table, kpi_row, spacer, gold_rule, navy_rule, style,
    CONTENT_W, NAVY, GOLD, GREEN, RED, MUTED, DARK, LIGHT,
)


def fmt_long_date(iso_or_text: str) -> str:
    if not iso_or_text:
        return "—"
    try:
        d = datetime.strptime(iso_or_text[:10], "%Y-%m-%d")
        # 11th September, 2026
        day = d.day
        suf = "th" if 11 <= day <= 13 else {1: "st", 2: "nd", 3: "rd"}.get(day % 10, "th")
        return f"{day}{suf} {d.strftime('%B, %Y')}"
    except Exception:
        return iso_or_text


def build_daily_qa_pdf(payload: dict) -> bytes:
    officer = (payload.get("officer_name") or "").strip() or "QA Officer"
    class_label = payload.get("class_label") or "Class"
    department = payload.get("department") or class_label
    session = payload.get("session") or ""
    report_date = payload.get("report_date") or datetime.now().strftime("%Y-%m-%d")
    schedule = payload.get("schedule") or []
    courses = payload.get("courses") or []
    totals = payload.get("totals") or {}

    registered = int(totals.get("registered") or 0)
    present_n = int(totals.get("present") or 0)
    absent_n = int(totals.get("absent") or 0)

    title = "Today's Lecture(s) Report"
    subtitle = f"{department}"
    period = f"{class_label}  ·  {session}" if session else class_label
    period += f"  ·  {fmt_long_date(report_date)}"

    buf = io.BytesIO()
    doc, canvas_factory = make_doc(buf, officer_name=officer, report_title=title)
    story = []

    build_letterhead(story, title, subtitle=subtitle, period_line=period)

    # ── Schedule ──────────────────────────────────────────
    story.append(section_bar("Course Schedule / Timetable"))
    story.append(spacer(8))
    if schedule:
        rows = []
        for s in schedule:
            rows.append([
                s.get("sn") or len(rows) + 1,
                s.get("title") or "—",
                s.get("code") or "—",
                s.get("start") or "—",
                s.get("end") or "—",
                s.get("remark") or "",
            ])
        story.append(data_table(
            ["S/N", "Course Title", "Code", "Start", "End", "Remark"],
            rows,
            col_widths=[1.2*cm, 5.2*cm, 2.2*cm, 2.4*cm, 2.4*cm, CONTENT_W - 13.4*cm],
        ))
    else:
        story.append(Paragraph("No timetable slots recorded for this date.", style(fontSize=9, textColor=MUTED)))
    story.append(spacer(14))

    # ── Each course ───────────────────────────────────────
    for idx, c in enumerate(courses, start=1):
        if idx > 1:
            story.append(PageBreak())
            build_letterhead(story, title, subtitle=f"Course {idx} of {len(courses)}", period_line=period)

        story.append(section_bar(f"Course {idx} Information"))
        story.append(spacer(8))
        story.append(meta_grid([
            ("Course Code", c.get("code") or "—"),
            ("Course Title", c.get("title") or "—"),
            ("Lecturer", c.get("lecturer") or "—"),
            ("Topic", c.get("topic") or "—"),
            ("Date", c.get("date") or fmt_long_date(report_date)),
            ("Time", c.get("time") or "—"),
        ], cols=1))
        story.append(spacer(10))

        objs = (c.get("objectives") or "").strip()
        story.append(section_bar("Learning Objectives"))
        story.append(spacer(6))
        story.append(Paragraph(objs if objs else "<i>Not recorded for this lecture.</i>", style(fontSize=9, leading=13, alignment=TA_JUSTIFY, textColor=DARK if objs else MUTED)))
        story.append(spacer(10))

        summary = (c.get("summary") or "").strip()
        story.append(section_bar("Lecture Summary"))
        story.append(spacer(6))
        story.append(Paragraph(summary if summary else "<i>Not recorded for this lecture.</i>", style(fontSize=9, leading=13, alignment=TA_JUSTIFY, textColor=DARK if summary else MUTED)))
        if (c.get("remarks") or "").strip():
            story.append(spacer(6))
            story.append(Paragraph(f"<b>Remarks:</b> {c.get('remarks')}", style(fontSize=9, leading=12)))
        story.append(spacer(12))

        absent = c.get("absent") or []
        story.append(section_bar(f"Absent Students ({len(absent)})"))
        story.append(spacer(8))
        if absent:
            rows = [(a.get("serial") or a.get("sn") or "", a.get("name") or "") for a in absent]
            story.append(absent_table(rows))
        else:
            story.append(Paragraph("<b>Full attendance — no absentees recorded.</b>", style(fontSize=9, textColor=GREEN)))

    # ── Consolidated ──────────────────────────────────────
    story.append(PageBreak())
    build_letterhead(story, "Consolidated Attendance Report", subtitle=department, period_line=period)

    story.append(section_bar("Attendance Summary"))
    story.append(spacer(8))
    story.append(kpi_row([
        ("TOTAL REGISTERED", registered or "—", NAVY),
        ("PRESENT", present_n if registered else "—", GREEN),
        ("ABSENT", absent_n if registered else "—", RED),
    ]))
    if registered:
        rate = round(100.0 * present_n / registered, 1) if registered else 0
        story.append(spacer(6))
        story.append(Paragraph(
            f"Class attendance rate for this report: <b>{rate}%</b>  ·  "
            f"{len(courses)} lecture session(s) on record.",
            style(fontSize=9, textColor=MUTED, alignment=TA_CENTER),
        ))
    story.append(spacer(14))

    # Unique consolidated absent list
    seen = set()
    consol = []
    for c in courses:
        for a in (c.get("absent") or []):
            key = str(a.get("serial") or "") + "|" + str(a.get("name") or "")
            if key in seen:
                continue
            seen.add(key)
            consol.append((a.get("serial") or "", a.get("name") or ""))
    consol.sort(key=lambda x: (int(x[0]) if str(x[0]).isdigit() else 9999, str(x[1])))

    story.append(section_bar(f"Consolidated Absent Students List ({len(consol)})"))
    story.append(spacer(8))
    if consol:
        story.append(absent_table(consol))
    else:
        story.append(Paragraph("No absentees across recorded lectures.", style(fontSize=9, textColor=GREEN)))

    story.append(spacer(24))
    story.append(gold_rule())
    story.append(spacer(12))
    story.append(signature_block(officer))

    doc.build(story, canvasmaker=canvas_factory)
    return buf.getvalue()


def main():
    ap = argparse.ArgumentParser(description="EOCNS Daily QA PDF generator")
    ap.add_argument("--payload", help="Path to JSON payload (default: stdin)")
    ap.add_argument("-o", "--output", required=True, help="Output PDF path")
    args = ap.parse_args()
    if args.payload:
        payload = json.loads(Path(args.payload).read_text(encoding="utf-8"))
    else:
        payload = json.load(sys.stdin)
    pdf = build_daily_qa_pdf(payload)
    Path(args.output).write_bytes(pdf)
    print(f"Wrote {args.output} ({len(pdf)} bytes)")


if __name__ == "__main__":
    main()
