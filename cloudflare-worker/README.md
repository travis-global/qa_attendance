# EOCNS Publish Worker (Cloudflare)

The browser **never receives** the GitHub token. After the officer PIN is checked on the page, the app POSTs `data/*.json` contents to this worker. The worker uses secret `GITHUB_TOKEN` to commit.

## Deploy

```bash
cd cloudflare-worker
npm i -g wrangler   # if needed
npx wrangler login
npx wrangler deploy
npx wrangler secret put GITHUB_TOKEN
# paste fine-grained PAT: Contents Read+Write on travis-global/qa_attendance

# optional extra lock:
npx wrangler secret put PUBLISH_KEY
```

Copy the worker URL (e.g. `https://eocns-publish.<account>.workers.dev`) into `data/config.json` as `publishWorkerUrl`.

If you set `PUBLISH_KEY`, also set the same value in `data/config.json` as `publishWorkerKey` (this key is not the GitHub token; rotate if leaked).

## Flow

1. Officer signs in (PIN) on the site  
2. Clicks **Publish all data to repository**  
3. Re-enters PIN to confirm  
4. App POSTs files to worker  
5. Worker pushes with `GITHUB_TOKEN`  
