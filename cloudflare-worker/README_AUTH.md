# EOCNS Worker — Officer auth (Phase 1)

## Secrets (Cloudflare dashboard or wrangler)

```bash
cd cloudflare-worker
npx wrangler secret put GITHUB_TOKEN      # existing
npx wrangler secret put PUBLISH_KEY       # existing publish key
npx wrangler secret put OFFICER_PIN       # universal QA PIN (e.g. current EOCNSQA)
npx wrangler secret put SESSION_SECRET    # long random string for session tokens
```

Deploy:

```bash
npx wrangler deploy
```

## Behaviour

- `POST { "action":"login", "pin":"...", "officer":"Name" }` → `{ token, officer }`
- PIN is **never** read from public `data/config.json` for auth.
- Login rate-limited (~8 attempts / 15 min / IP).
- Session token ~12 hours (HMAC).

## Change PIN

Worker cannot rewrite its own secrets. After verifying current PIN:

```bash
echo -n 'NEW_PIN_HERE' | npx wrangler secret put OFFICER_PIN
```

## Phase 2+

Encryption-at-rest and lazy paged APIs build on this auth token.
