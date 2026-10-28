# EOCNS Attendance & QA System

Live: https://travis-global.github.io/qa_attendance/

## Roles
- **Viewer:** all screens read-only. Audit shows **Access not granted**.
- **QA Officer (PIN in `data/config.json`):** edit, log, download, print, publish.

## Publish & GitHub Secrets
GitHub Actions **secrets are not readable from static GitHub Pages JavaScript**.  
Publish flow: sign in with PIN → paste fine-grained token for **this browser session only** → token is never written into the repository.

## Modules
Dashboard · Students (bulk move) · Lecturers · Hostel boarding-fee · Attendance sheets · Sessions · Daily/Weekly/Monthly QA · Reports (JSON + Print/PDF) · Audit (officer only) · Settings

Hard-refresh after deploys: Ctrl+Shift+R
