# EOCNS Professional Report Generators

Python (ReportLab) engines for institutional QA reports. Design system matches the college brand:

- Logo, school name, address, motto
- **QUALITY ASSURANCE DEPARTMENT** issuer line
- Officer name on every page footer + signature block
- Navy `#1B3A6B` · Gold `#B8860B` section bars

## Daily QA (complete)

```bash
pip install reportlab
python3 reports/generate.py --type daily_qa --payload sample.json -o out.pdf
```

## GitHub Action

Workflow: `.github/workflows/generate-report.yml`  
Trigger: `workflow_dispatch` with `report_type`, `payload_json`, `officer_name`.  
Artifact: `eocns-report` (PDF).

## Client site

Daily QA → **Generate daily report** prompts for officer name + PDF/Word, opens a letterheaded pack (logo + department + signature). Same visual language as these Python PDFs.
