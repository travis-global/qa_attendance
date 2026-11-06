#!/usr/bin/env python3
"""EOCNS Hostel Distribution / Absentee Report (ReportLab)."""
from __future__ import annotations
import argparse, json, sys
from datetime import datetime
from pathlib import Path
from io import BytesIO
from collections import defaultdict

sys.path.insert(0, str(Path(__file__).resolve().parent))
from letterhead import (
    build_letterhead, signature_block, make_doc, section_bar, meta_grid,
    data_table, kpi_row, spacer, gold_rule, style, NAVY, GOLD, GREEN, RED, MUTED, DARK,
)
from reportlab.platypus import Paragraph


def build_hostel_pdf(payload: dict) -> bytes:
    officer = (payload.get("officer_name") or "QA Officer").strip()
    mode = payload.get("mode") or "distribution"  # distribution | absentees
    students = payload.get("students") or payload.get("rows") or []
    absentees = payload.get("absentees") or []
    period = payload.get("period_label") or payload.get("period") or "—"
    rate = payload.get("fine_rate") or payload.get("rate") or None
    amendments = payload.get("amendments") or []

    by_hostel = defaultdict(list)
    for s in students:
        key = (s.get("hostel") or "").strip() or "Unassigned"
        by_hostel[key].append(s)

    buf = BytesIO()
    title = f"Hostel Report — {mode} — {period}"
    doc, canvas_factory = make_doc(buf, officer, title)
    story = []
    build_letterhead(story, "Hostel Report", subtitle="Quality Assurance Department", period_line=f"Mode: {mode} · {period}",
    )
    story.append(spacer(8))
    story.append(meta_grid([
        ("Report mode", mode),
        ("Period", period),
        ("Students in scope", str(len(students) or len(absentees))),
        ("Hostel groups", str(len(by_hostel))),
        ("Issuing officer", officer),
        ("Generated", datetime.now().strftime("%d %b %Y %H:%M")),
    ]))
    story.append(spacer(10))

    unassigned = len(by_hostel.get("Unassigned", []))
    story.append(kpi_row([
        ("Students", str(len(students) or sum(len(v) for v in by_hostel.values())), NAVY),
        ("Hostel groups", str(len([k for k in by_hostel if k != "Unassigned"])), NAVY),
        ("Unassigned", str(unassigned), RED if unassigned else GREEN),
        ("Absentees listed", str(len(absentees)), GOLD if absentees else NAVY),
    ]))

    if by_hostel:
        story.append(spacer(12))
        story.append(section_bar("Distribution by hostel"))
        story.append(spacer(6))
        dist = [[h, str(len(lst))] for h, lst in sorted(by_hostel.items(), key=lambda x: (-len(x[1]), x[0]))]
        story.append(data_table(["Hostel", "Count"], dist))
        for h, lst in sorted(by_hostel.items(), key=lambda x: (-len(x[1]), x[0])):
            story.append(spacer(8))
            story.append(section_bar(f"{h} — {len(lst)} student(s)"))
            story.append(spacer(4))
            body = []
            for i, s in enumerate(sorted(lst, key=lambda x: str(x.get("name") or "")), 1):
                body.append([
                    str(i), s.get("name") or "—", s.get("regNo") or s.get("reg_no") or "—",
                    s.get("programme") or "—", str(s.get("level") or "—"), s.get("gender") or "—",
                ])
            story.append(data_table(["#", "Name", "Reg. No", "Programme", "Level", "Gender"], body))

    if absentees:
        story.append(spacer(12))
        story.append(section_bar("Hostel absentees / fines"))
        story.append(spacer(6))
        headers = ["#", "Name", "Reg. No", "Hostel", "Absent days", "Fine"]
        body = []
        total_fine = 0.0
        for i, a in enumerate(absentees, 1):
            fine = float(a.get("fine") or 0)
            total_fine += fine
            body.append([
                str(i), a.get("name") or "—", a.get("regNo") or a.get("reg_no") or "—",
                a.get("hostel") or "—", str(a.get("absentDays") or a.get("absent_days") or "—"),
                f"{fine:.2f}",
            ])
        story.append(data_table(headers, body))
        story.append(spacer(4))
        story.append(Paragraph(f"<b>Total fines:</b> {total_fine:.2f}" + (f" (rate {rate}/day)" if rate is not None else ""), style(fontSize=9)))

    if amendments:
        story.append(spacer(12))
        story.append(section_bar("Master-list amendments"))
        story.append(spacer(4))
        for a in amendments[:40]:
            story.append(Paragraph(f"• <b>{a.get('ref') or '—'}</b> — {a.get('summary') or a.get('reason') or ''}", style(fontSize=8.5)))

    story.append(spacer(10))
    story.append(section_bar("Glossary"))
    story.append(spacer(4))
    for t, m in [
        ("Hostel assignment", "Taken from the student master list field — not biometric machine Location ID."),
        ("Unassigned", "Active students with a blank hostel field."),
        ("Fine", "Absent days × configured daily rate (when absentee mode is used)."),
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
    Path(args.output).write_bytes(build_hostel_pdf(payload))
    print("OK", args.output)
