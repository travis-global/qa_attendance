#!/usr/bin/env python3
"""EOCNS Full Student Register Report (ReportLab)."""
from __future__ import annotations
import argparse, json, sys
from datetime import datetime
from pathlib import Path
from io import BytesIO
from collections import Counter

sys.path.insert(0, str(Path(__file__).resolve().parent))
from letterhead import (
    build_letterhead, signature_block, make_doc, section_bar, meta_grid,
    data_table, kpi_row, spacer, gold_rule, style, NAVY, GOLD, GREEN, RED, MUTED, DARK,
)
from reportlab.platypus import Paragraph


def build_student_register_pdf(payload: dict) -> bytes:
    officer = (payload.get("officer_name") or "QA Officer").strip()
    students = payload.get("students") or []
    filters = payload.get("filters") or {}
    amendments = payload.get("amendments") or []
    session = payload.get("session") or payload.get("session_label") or "—"

    active = [s for s in students if str(s.get("status") or "Active").lower() in ("active", "", "true")]
    by_prog = Counter((s.get("programme") or "—") for s in active)
    by_level = Counter(str(s.get("level") or "—") for s in active)
    by_gender = Counter((s.get("gender") or "—") for s in active)

    buf = BytesIO()
    title = f"Full Student Register — {session}"
    doc, canvas_factory = make_doc(buf, officer, title)
    story = []
    build_letterhead(story, "Full Student Register", subtitle="Master list snapshot for Quality Assurance", period_line=f"Session: {session}",
    )
    story.append(spacer(8))
    filt_txt = ", ".join(f"{k}={v}" for k, v in filters.items() if v) or "None (all active in scope)"
    story.append(meta_grid([
        ("Academic session", session),
        ("Filters applied", filt_txt),
        ("Records in report", str(len(students))),
        ("Active count", str(len(active))),
        ("Issuing officer", officer),
        ("Generated", datetime.now().strftime("%d %b %Y %H:%M")),
    ]))
    story.append(spacer(10))
    story.append(kpi_row([
        ("Total listed", str(len(students)), NAVY),
        ("Active", str(len(active)), GREEN),
        ("Programmes", str(len(by_prog)), NAVY),
        ("Levels", str(len(by_level)), NAVY),
    ]))

    story.append(spacer(12))
    story.append(section_bar("Distribution"))
    story.append(spacer(6))
    dist_rows = []
    for prog, n in sorted(by_prog.items(), key=lambda x: (-x[1], x[0])):
        dist_rows.append([prog, "Programme", str(n)])
    for lvl, n in sorted(by_level.items(), key=lambda x: (-x[1], x[0])):
        dist_rows.append([str(lvl), "Level", str(n)])
    for g, n in sorted(by_gender.items(), key=lambda x: (-x[1], x[0])):
        dist_rows.append([g, "Gender", str(n)])
    if dist_rows:
        story.append(data_table(["Category value", "Dimension", "Count"], dist_rows))

    story.append(spacer(12))
    story.append(section_bar("Student roll"))
    story.append(spacer(6))
    ordered = sorted(students, key=lambda s: (str(s.get("programme") or ""), str(s.get("level") or ""), str(s.get("name") or "")))
    headers = ["#", "Name", "Reg. No", "Programme", "Level", "Gender", "Hostel", "Status"]
    body = []
    for i, s in enumerate(ordered, 1):
        body.append([
            str(i), s.get("name") or "—", s.get("regNo") or s.get("reg_no") or "—",
            s.get("programme") or "—", str(s.get("level") or "—"),
            s.get("gender") or "—", s.get("hostel") or "—", s.get("status") or "Active",
        ])
    if body:
        # chunk tables every 40 rows for readability
        chunk = 45
        for start in range(0, len(body), chunk):
            story.append(data_table(headers, body[start:start + chunk]))
            story.append(spacer(6))
    else:
        story.append(Paragraph("No students in payload.", style(fontSize=9, textColor=MUTED)))

    if amendments:
        story.append(spacer(8))
        story.append(section_bar("Recent master-list amendments"))
        story.append(spacer(4))
        for a in amendments[:40]:
            story.append(Paragraph(f"• <b>{a.get('ref') or '—'}</b> — {a.get('summary') or a.get('reason') or ''}", style(fontSize=8.5)))

    story.append(spacer(10))
    story.append(section_bar("Glossary"))
    story.append(spacer(4))
    for t, m in [
        ("Master list", "Canonical student records stored in the repository (data/students.json)."),
        ("Active", "Students currently enrolled and included in attendance calculations."),
        ("Hostel", "Residential assignment from the master list (not biometric device location)."),
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
    Path(args.output).write_bytes(build_student_register_pdf(payload))
    print("OK", args.output)
