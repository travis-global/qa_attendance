# EOCNS Professional Report Generators

Python (ReportLab) engines for institutional QA PDFs.

**Brand system** (`letterhead.py`): logo, school name/address, **QUALITY ASSURANCE DEPARTMENT**, officer footer + signature, navy/gold palette.

## Report modules

| Type | Module | Function |
|------|--------|----------|
| `daily_qa` | `daily_qa.py` | `build_daily_qa_pdf` |
| `weekly_qa` | `weekly_qa.py` | `build_weekly_qa_pdf` |
| `monthly_qa` | `monthly_qa.py` | `build_monthly_qa_pdf` |
| `lecturer_hours` | `lecturer_hours.py` | `build_lecturer_hours_pdf` |
| `student_register` | `student_register.py` | `build_student_register_pdf` |
| `hostel` | `hostel.py` | `build_hostel_pdf` |
| `remedial_weekly` | `remedial.py` | `build_remedial_weekly_pdf` |
| `remedial_summary` | `remedial.py` | `build_remedial_summary_pdf` |

## CLI

```bash
pip install reportlab
python3 reports/generate.py --type weekly_qa --payload sample.json -o out.pdf
```

Officer name is **always** taken from the payload field `officer_name` (never stored by the generators).

## GitHub Action

`.github/workflows/generate-report.yml` — `workflow_dispatch` with `report_type`, `payload_json`, `officer_name`.  
Artifact: `eocns-report`.

## Client site

The SPA prints letterheaded HTML packs immediately (officer prompt, charts, glossary, amendments).  
Use this Python package when a true ReportLab PDF artifact is required.
