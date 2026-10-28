# EOCNS Attendance & QA System

Live: https://travis-global.github.io/qa_attendance/

## Roles
- **Viewer (anyone):** read-only
- **QA Officer:** edit, log lectures, download reports, publish to repo  
  PIN is in `data/config.json` (`qaPin`). Change it in the repo and reload.

## Persistence (`data/`)
students, lecturers, sessions, programmes, levels, courses, timetables, qa_entries, audit, config

## QA workflow (matches college analysers)
- **Daily:** timetable slots for the day → Log Held/Missed/Partial → day rate + download
- **Weekly:** scheduled vs delivered vs missed by course, day-by-day, compliance %, download
- **Monthly:** course + lecturer rates against timetable, download

Hard-refresh: Ctrl+Shift+R
