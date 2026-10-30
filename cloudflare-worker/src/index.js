/**
 * EOCNS publish worker
 * - Holds GitHub PAT in Worker secret GITHUB_TOKEN (never sent to the browser)
 * - Page verifies officer PIN client-side, then POSTs file payloads here
 * - Worker commits data/*.json via GitHub Contents API
 *
 * Optional: set PUBLISH_KEY secret; client must send header X-EOCNS-Key
 */
const ALLOWED_PATHS = new Set([
  "data/students.json",
  "data/lecturers.json",
  "data/sessions.json",
  "data/qa_entries.json",
  "data/audit.json",
  "data/programmes.json",
  "data/levels.json",
  "data/courses.json",
  "data/timetables.json",
  "data/attendance.json",
  "data/hostel_runs.json",
  "data/remedial.json",
  "data/remedial_logs.json",
  "data/remedial_timetable.json",
  "data/remedial_assignments.json",
  "data/remedial_enrolment.json",
  "data/remedial_meta.json",
  "data/config.json",
  "data/discipline.json",
]);

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-EOCNS-Key, X-Publish-Key",
    "Access-Control-Max-Age": "86400",
  };
}

async function githubPutFile(env, path, contentText, message) {
  const owner = env.REPO_OWNER || "travis-global";
  const repo = env.REPO_NAME || "qa_attendance";
  const branch = env.REPO_BRANCH || "main";
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
  const headers = {
    Authorization: `Bearer ${env.GITHUB_TOKEN}`,
    Accept: "application/vnd.github+json",
    "User-Agent": "eocns-publish-worker",
    "Content-Type": "application/json",
  };

  let sha = null;
  const getRes = await fetch(url + `?ref=${branch}`, { headers });
  if (getRes.ok) {
    const meta = await getRes.json();
    sha = meta.sha;
  }

  // UTF-8 safe base64
  const bytes = new TextEncoder().encode(contentText);
  let binary = "";
  bytes.forEach((b) => { binary += String.fromCharCode(b); });
  const content = btoa(binary);

  const body = { message, content, branch };
  if (sha) body.sha = sha;

  const putRes = await fetch(url, {
    method: "PUT",
    headers,
    body: JSON.stringify(body),
  });
  if (!putRes.ok) {
    const errText = await putRes.text();
    throw new Error(`${path} → ${putRes.status} ${errText.slice(0, 240)}`);
  }
  return putRes.json();
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "*";
    const cors = corsHeaders(origin);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "POST only" }), {
        status: 405,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    if (!env.GITHUB_TOKEN) {
      return new Response(JSON.stringify({ error: "GITHUB_TOKEN secret not configured on worker" }), {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    let payload;
    try {
      payload = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Optional shared key (Worker secret PUBLISH_KEY) — header or body.publishKey
    if (env.PUBLISH_KEY) {
      const key =
        request.headers.get("X-EOCNS-Key") ||
        request.headers.get("X-Publish-Key") ||
        (payload && payload.publishKey) ||
        "";
      if (key !== env.PUBLISH_KEY) {
        return new Response(
          JSON.stringify({
            error:
              "Unauthorized: PUBLISH_KEY mismatch. Re-run: npx wrangler secret put PUBLISH_KEY and set the same value in data/config.json publishWorkerKey",
          }),
          {
            status: 401,
            headers: { ...cors, "Content-Type": "application/json" },
          }
        );
      }
    }

    const files = payload && payload.files;
    if (!files || typeof files !== "object") {
      return new Response(JSON.stringify({ error: "Body must include files: { path: contentString }" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const messageBase = payload.message || "Update data via EOCNS QA System";
    const results = [];
    try {
      for (const [path, contentText] of Object.entries(files)) {
        if (!ALLOWED_PATHS.has(path)) {
          throw new Error(`Path not allowed: ${path}`);
        }
        if (typeof contentText !== "string") {
          throw new Error(`Content for ${path} must be a string`);
        }
        await githubPutFile(env, path, contentText, `${messageBase}: ${path}`);
        results.push(path);
      }
      return new Response(JSON.stringify({ ok: true, updated: results }), {
        status: 200,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message || String(err) }), {
        status: 502,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
  },
};
