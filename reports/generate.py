#!/usr/bin/env python3
"""EOCNS report CLI — used by GitHub Actions and local runs."""
from __future__ import annotations
import argparse, json, sys
from pathlib import Path

# Ensure reports/ is on path
sys.path.insert(0, str(Path(__file__).resolve().parent))

BUILDERS = {
    "daily_qa": ("daily_qa", "build_daily_qa_pdf"),
    "weekly_qa": ("weekly_qa", "build_weekly_qa_pdf"),
    "monthly_qa": ("monthly_qa", "build_monthly_qa_pdf"),
    "lecturer_hours": ("lecturer_hours", "build_lecturer_hours_pdf"),
    "student_register": ("student_register", "build_student_register_pdf"),
    "hostel": ("hostel", "build_hostel_pdf"),
    "remedial_weekly": ("remedial", "build_remedial_weekly_pdf"),
    "remedial_summary": ("remedial", "build_remedial_summary_pdf"),
}


def main():
    ap = argparse.ArgumentParser(description="EOCNS professional report generator")
    ap.add_argument(
        "--type",
        required=True,
        choices=sorted(BUILDERS.keys()),
        help="Report type",
    )
    ap.add_argument("--payload", required=True, help="JSON payload path")
    ap.add_argument("-o", "--output", required=True, help="Output PDF path")
    args = ap.parse_args()

    payload = json.loads(Path(args.payload).read_text(encoding="utf-8"))
    payload["report_type"] = args.type

    mod_name, fn_name = BUILDERS[args.type]
    mod = __import__(mod_name)
    builder = getattr(mod, fn_name)
    data = builder(payload)
    Path(args.output).write_bytes(data)
    print(f"OK {args.type} → {args.output} ({len(data)} bytes)")


if __name__ == "__main__":
    main()
