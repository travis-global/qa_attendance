# EOCNS Attendance & QA System

Live: https://travis-global.github.io/qa_attendance/

## Persistence (repository is source of truth)

| File | Contents |
|------|----------|
| `data/students.json` | Master student list |
| `data/lecturers.json` | Lecturers |
| `data/sessions.json` | Academic sessions |
| `data/qa_entries.json` | Daily QA lecture logs |
| `data/audit.json` | Full audit trail (REF/EOCNS/QA/…) |

The browser only keeps a **working cache** (IndexedDB) and **session keys** (theme, last view, QA officer session). After any important change, a QA officer must **Publish all data to repository** under Settings.

## QA Officer
- Default PIN: `EOCNS-QA`
- Settings → sign in → Export snapshot or Publish all (requires fine-grained token with Contents: Read and write)
- Token is never written into the repo; it lives only in the current browser session

## Modules
Dashboard · Students · Lecturers · Sessions · Hostel · Daily/Weekly/Monthly QA · Audit · Settings

Hard-refresh after deploys: Ctrl+Shift+R
