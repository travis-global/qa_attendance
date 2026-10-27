# EOCNS Attendance & QA System

Live: https://travis-global.github.io/qa_attendance/

Pure client-side system for Eastern Oak College of Nursing Sciences — hostel, lecturers, students, sessions, audit.

## Working modules
- **Dashboard** — stats, quick actions, light/dark mode
- **Students** — full CRUD, TMP reg nos, official list (327 names from college registers)
- **Lecturers** — full CRUD
- **Sessions** — academic sessions, programmes, levels
- **Hostel** — gate log (.xls/.xlsx) → boarding-fee absentees report + Excel download
- **Audit Log** — every change with REF/EOCNS/QA/…
- **Backup** — JSON export of all local data (IndexedDB)

## Seed students
On the Students page click **Load official list** to import the 327 names from the college registers (100 Nursing, 200 Nursing, 200 Midwifery). Existing records are kept; only missing names are added.

## Files
| File | Purpose |
|------|---------|
| index.html | UI shell |
| app.js | Application logic |
| style.css | Design system |
| seed-students.json | Official class lists |

Hard-refresh after updates: Ctrl+Shift+R
