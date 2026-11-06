#!/usr/bin/env python3
"""EOCNS report CLI — used by GitHub Actions and local runs."""
from __future__ import annotations
import argparse, json, sys
from pathlib import Path

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--type", required=True, choices=[
        "daily_qa", "weekly_qa", "monthly_qa", "lecturer_hours",
        "student_register", "hostel",
    ])
    ap.add_argument("--payload", required=True, help="JSON payload path")
    ap.add_argument("-o", "--output", required=True, help="Output file path (.pdf)")
    args = ap.parse_args()
    payload = json.loads(Path(args.payload).read_text(encoding="utf-8"))
    payload["report_type"] = args.type

    if args.type == "daily_qa":
        from daily_qa import build_daily_qa_pdf
        data = build_daily_qa_pdf(payload)
    else:
        # Shared letterhead stub for types not yet fully ported
        from daily_qa import build_daily_qa_pdf
        # Reuse shell with a notice page until specialised builders land
        payload.setdefault("schedule", [])
        payload.setdefault("courses", [])
        payload.setdefault("totals", {})
        if args.type != "daily_qa":
            payload["class_label"] = payload.get("class_label") or args.type.replace("_", " ").title()
            payload["department"] = payload.get("department") or "Quality Assurance Department"
        data = build_daily_qa_pdf(payload)

    Path(args.output).write_bytes(data)
    print(f"OK {args.output} {len(data)} bytes")

if __name__ == "__main__":
    main()
