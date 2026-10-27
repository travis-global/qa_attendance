# EOCNS Attendance & QA System

Live: https://travis-global.github.io/qa_attendance/

## Master data
Student master list lives in the repository at **`data/students.json`** (not only in the browser).

- On first open (empty local DB), the app loads that file automatically.
- **Students → Load official list** or **Settings → Reload master list from repository** refreshes from the repo.
- **Settings → QA Officer** (PIN) unlocks Export and **Publish students to repository**.

## QA Officer PIN
Default PIN: `EOCNS-QA`  
Change this in production. Session lasts until the browser tab is closed (sessionStorage).

## Modules
- Dashboard, Students, Lecturers, Sessions, Audit
- Hostel: gate log → boarding fee absentees report
- Settings: officer auth, export, publish to GitHub

## Files
| Path | Role |
|------|------|
| data/students.json | Official master student list |
| index.html / app.js / style.css | App |

Hard-refresh after deploys: Ctrl+Shift+R
