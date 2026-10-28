# EOCNS Attendance & QA System

Live: https://travis-global.github.io/qa_attendance/

## Publish (Cloudflare Worker)

The GitHub token is **not** stored in the repo or the browser.

1. Deploy `cloudflare-worker/` (see that folder’s README)
2. `npx wrangler secret put GITHUB_TOKEN` (fine-grained PAT, Contents write)
3. Put the worker URL in `data/config.json` → `publishWorkerUrl`
4. Officer: Settings → Publish → confirm PIN → worker commits `data/*.json`

## Roles
- Viewer: read-only; Audit = Access not granted
- QA Officer (PIN in `data/config.json`): edit, download, publish

Hard-refresh: Ctrl+Shift+R
