EOCNS PRE-UPGRADE SNAPSHOT
==========================
Created: 2026-11-13T08:47:27.086506+00:00
Git commit: b3075bc0de98ceaa733ac14b75e92811513403e9
Repo: travis-global/qa_attendance

CONTENTS
- data/                 Exact copy of repository data/*.json at backup time
- live_pages_fetch/     Same files re-downloaded from GitHub Pages (parity check)
- EOCNS_Full_Snapshot.json  Single-file bundle: all stores + manifest
- meta/MANIFEST.json    Counts, SHA-256 per file, parity vs live Pages

RECORD COUNTS
{
  "attendance": 0,
  "audit": 1436,
  "biometric_pending": 26,
  "config": 1,
  "courses": 29,
  "discipline": 0,
  "hostel_runs": 0,
  "lecturers": 23,
  "levels": 3,
  "pending_students": 1,
  "programmes": 3,
  "qa_entries": 31,
  "remedial": 0,
  "remedial_assignments": 0,
  "remedial_enrolment": 0,
  "remedial_logs": 0,
  "remedial_meta": 1,
  "remedial_timetable": 1,
  "sessions": 1,
  "students": 423,
  "timetables": 1
}

LIVE PAGES PARITY (repo data/ vs travis-global.github.io)
{
  "attendance": "match",
  "audit": "match",
  "biometric_pending": "match",
  "config": "match",
  "courses": "match",
  "discipline": "match",
  "hostel_runs": "match",
  "lecturers": "match",
  "levels": "match",
  "pending_students": "match",
  "programmes": "match",
  "qa_entries": "match",
  "remedial": "match",
  "remedial_assignments": "match",
  "remedial_enrolment": "match",
  "remedial_logs": "match",
  "remedial_meta": "match",
  "remedial_timetable": "match",
  "sessions": "match",
  "students": "match",
  "timetables": "match"
}

HOW TO RESTORE (emergency)
1. Prefer restoring via the app Settings → Full backup & restore if the UI accepts this JSON shape.
2. Or copy files from data/ back into the repo data/ folder and commit/push (officer-approved only).
3. Or use EOCNS_Full_Snapshot.json → stores.* programmatically.

SECURITY
Treat this folder/zip as confidential. It is plaintext student and operational data.
Do not post publicly. After the encryption upgrade, keep this as offline recovery only.
