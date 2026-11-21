/**
 * EOCNS publish + student registration worker
 * Secrets: GITHUB_TOKEN, PUBLISH_KEY (officer publish)
 * Optional: RESEND_API_KEY, MAIL_FROM for rejection emails
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
  "data/biometric_pending.json",
  "data/remedial.json",
  "data/remedial_logs.json",
  "data/remedial_timetable.json",
  "data/remedial_assignments.json",
  "data/remedial_enrolment.json",
  "data/remedial_meta.json",
  "data/config.json",
  "data/discipline.json",
  "data/pending_students.json",
  "data/auth_pin.json",
]);

const OWNER = "travis-global";
const REPO = "qa_attendance";
const BRANCH = "main";

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-EOCNS-Key, X-Publish-Key, Authorization",
    "Access-Control-Max-Age": "86400",
  };
}

function json(data, status, cors) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

async function githubGetFile(env, path) {
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}?ref=${BRANCH}`;
  const headers = {
    Authorization: `Bearer ${env.GITHUB_TOKEN}`,
    Accept: "application/vnd.github+json",
    "User-Agent": "eocns-publish-worker",
  };
  const res = await fetch(url, { headers });
  if (res.status === 404) return { sha: null, content: null };
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}`);
  const meta = await res.json();
  const text = meta.content ? atob(meta.content.replace(/\n/g, "")) : "[]";
  return { sha: meta.sha, content: text };
}

async function githubPutFile(env, path, contentText, message, sha) {
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}`;
  const headers = {
    Authorization: `Bearer ${env.GITHUB_TOKEN}`,
    Accept: "application/vnd.github+json",
    "User-Agent": "eocns-publish-worker",
    "Content-Type": "application/json",
  };
  const bytes = new TextEncoder().encode(contentText);
  let binary = "";
  bytes.forEach((b) => { binary += String.fromCharCode(b); });
  const contentB64 = btoa(binary);

  let attemptSha = sha;
  for (let attempt = 0; attempt < 4; attempt++) {
    if (!attemptSha) {
      const cur = await githubGetFile(env, path);
      attemptSha = cur.sha;
    }
    const body = { message, content: contentB64, branch: BRANCH };
    if (attemptSha) body.sha = attemptSha;
    const putRes = await fetch(url, { method: "PUT", headers, body: JSON.stringify(body) });
    if (putRes.ok) return putRes.json();
    const errText = await putRes.text();
    // Concurrent update — refresh SHA and retry
    if (putRes.status === 409 || /sha|conflict/i.test(errText)) {
      const cur = await githubGetFile(env, path);
      attemptSha = cur.sha;
      continue;
    }
    throw new Error(`PUT ${path} → ${putRes.status} ${errText.slice(0, 240)}`);
  }
  throw new Error(`PUT ${path} failed after retries (SHA conflict)`);
}


function checkPublishKey(env, request, payload) {
  // PUBLISH_KEY is optional for deployments that intentionally do not use
  // the shared publish-key layer. When configured, require an exact match.
  const expected = String(env.PUBLISH_KEY || "").trim();
  if (!expected) return true;

  const supplied = String(
    request.headers.get("X-EOCNS-Key") ||
    request.headers.get("X-Publish-Key") ||
    (payload && payload.publishKey) ||
    ""
  ).trim();

  return supplied.length > 0 && supplied === expected;
}


// ===== Optional at-rest encryption (DATA_ENCRYPTION_KEY secret) =====
const SENSITIVE_PATHS = new Set([
  "data/students.json",
  "data/lecturers.json",
  "data/qa_entries.json",
  "data/audit.json",
  "data/discipline.json",
  "data/pending_students.json",
  "data/hostel_runs.json",
  "data/biometric_pending.json",
  "data/attendance.json",
  "data/remedial.json",
  "data/remedial_logs.json",
  "data/remedial_enrolment.json",
  "data/remedial_assignments.json",
  "data/remedial_meta.json",
  "data/remedial_timetable.json",
]);

function encryptionEnabled(env) {
  return !!String(env.DATA_ENCRYPTION_KEY || "").trim();
}

async function deriveAesKey(env) {
  const raw = new TextEncoder().encode(String(env.DATA_ENCRYPTION_KEY || ""));
  const hash = await crypto.subtle.digest("SHA-256", raw);
  return crypto.subtle.importKey("raw", hash, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

function bytesToB64(bytes) {
  let s = "";
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  for (let i = 0; i < arr.length; i++) s += String.fromCharCode(arr[i]);
  return btoa(s);
}

function b64ToBytes(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function looksEncryptedJson(text) {
  if (!text || typeof text !== "string") return false;
  const t = text.trim();
  if (t[0] !== "{") return false;
  try {
    const o = JSON.parse(t);
    return o && o.v === 1 && o.alg === "AES-GCM" && o.iv && o.ct;
  } catch (_) {
    return false;
  }
}

async function encryptPlainText(env, plainText) {
  const key = await deriveAesKey(env);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(plainText)
  );
  return JSON.stringify({
    v: 1,
    alg: "AES-GCM",
    iv: bytesToB64(iv),
    ct: bytesToB64(ct),
  });
}

async function decryptToPlainText(env, maybeEnc) {
  if (!looksEncryptedJson(maybeEnc)) return maybeEnc;
  if (!encryptionEnabled(env)) {
    throw new Error("File is encrypted but DATA_ENCRYPTION_KEY is not set on the Worker");
  }
  const o = JSON.parse(maybeEnc);
  const key = await deriveAesKey(env);
  const iv = b64ToBytes(o.iv);
  const ct = b64ToBytes(o.ct);
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
  return new TextDecoder().decode(pt);
}

async function maybeEncryptForPath(env, path, contentText) {
  if (!encryptionEnabled(env)) return contentText;
  if (!SENSITIVE_PATHS.has(path)) return contentText;
  if (looksEncryptedJson(contentText)) return contentText; // already wrapped
  return encryptPlainText(env, contentText);
}

async function requireSessionOrPublishKey(env, request, payload) {
  const token = String(
    (payload && payload.token) ||
    request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") ||
    ""
  ).trim();
  if (token) {
    const sess = await verifySessionToken(env, token);
    if (sess) return { ok: true, via: "session", officer: sess.officer };
  }
  if (checkPublishKey(env, request, payload || {})) return { ok: true, via: "publish_key" };
  return { ok: false };
}

async function handleGetStore(env, request, payload, cors) {
  const auth = await requireSessionOrPublishKey(env, request, payload);
  if (!auth.ok) {
    return json({ error: "Unauthorized. Sign in as QA officer or supply publish key." }, 401, cors);
  }
  const path = String(payload.path || payload.storePath || "").trim();
  if (!path || !ALLOWED_PATHS.has(path)) {
    return json({ error: "Invalid or disallowed path" }, 400, cors);
  }
  // Never return auth pin hash via generic get for safety? allow only for worker internal - block
  if (path === "data/auth_pin.json") {
    return json({ error: "Forbidden" }, 403, cors);
  }
  if (!env.GITHUB_TOKEN) return json({ error: "GITHUB_TOKEN missing" }, 500, cors);
  const file = await githubGetFile(env, path);
  if (file.content == null) {
    return json({ ok: true, path, data: path.endsWith(".json") ? [] : null, encrypted: false }, 200, cors);
  }
  let plain = file.content;
  let encrypted = false;
  try {
    if (looksEncryptedJson(file.content)) {
      encrypted = true;
      plain = await decryptToPlainText(env, file.content);
    }
  } catch (err) {
    return json({ error: "Decrypt failed: " + (err.message || String(err)) }, 500, cors);
  }
  let data;
  try {
    data = JSON.parse(plain);
  } catch (_) {
    return json({ error: "Store is not valid JSON after decrypt" }, 500, cors);
  }
  return json({ ok: true, path, data, encrypted }, 200, cors);
}

async function handlePublish(env, request, payload, cors) {
  if (!checkPublishKey(env, request, payload)) {
    return json({
      error: "Unauthorized: PUBLISH_KEY mismatch. Set publishWorkerKey in config to match Worker secret PUBLISH_KEY.",
    }, 401, cors);
  }
  const files = payload && payload.files;
  if (!files || typeof files !== "object") {
    return json({ error: "Body must include files: { path: contentString }" }, 400, cors);
  }
  const messageBase = payload.message || "Update data via EOCNS QA System";
  const results = [];
  const encryptedPaths = [];
  for (const [path, contentText] of Object.entries(files)) {
    if (!ALLOWED_PATHS.has(path)) throw new Error(`Path not allowed: ${path}`);
    if (typeof contentText !== "string") throw new Error(`Content for ${path} must be a string`);
    // Never encrypt auth hash file or public config through this path incorrectly
    let toWrite = contentText;
    if (path !== "data/auth_pin.json" && path !== "data/config.json") {
      toWrite = await maybeEncryptForPath(env, path, contentText);
      if (toWrite !== contentText) encryptedPaths.push(path);
    }
    await githubPutFile(env, path, toWrite, `${messageBase}: ${path}`);
    results.push(path);
  }
  return json({ ok: true, updated: results, encrypted: encryptedPaths, encryptionEnabled: encryptionEnabled(env) }, 200, cors);
}

async function handleSubmitPending(env, payload, cors) {
  const s = payload && payload.student;
  if (!s || typeof s !== "object") return json({ error: "Missing student payload" }, 400, cors);
  const name = String(s.name || "").trim();
  const email = String(s.email || "").trim();
  const regNo = String(s.regNo || "").trim();
  if (!name || name.length < 3) return json({ error: "Full name is required" }, 400, cors);
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "Valid email is required" }, 400, cors);
  if (!regNo) return json({ error: "Registration number is required" }, 400, cors);

  // Photo size guard (~150KB data URL)
  if (s.photoDataUrl && String(s.photoDataUrl).length > 220000) {
    return json({ error: "Photo too large after compression. Use a clearer passport crop under 2MB original." }, 400, cors);
  }

  const path = "data/pending_students.json";
  const cur = await githubGetFile(env, path);
  let list = [];
  try { list = JSON.parse(cur.content || "[]"); } catch (_) { list = []; }
  if (!Array.isArray(list)) list = [];

  // uniqueness among pending
  if (list.some((p) => String(p.regNo || "").toLowerCase() === regNo.toLowerCase() && p.status === "pending")) {
    return json({ error: "This registration number already has a pending submission under review." }, 409, cors);
  }

  // uniqueness vs master students.json
  try {
    const master = await githubGetFile(env, "data/students.json");
    const students = JSON.parse(master.content || "[]");
    if (Array.isArray(students) && students.some((st) => String(st.regNo || "").toLowerCase() === regNo.toLowerCase())) {
      return json({ error: "This registration number is already on the official master list. Contact Student Affairs / QA." }, 409, cors);
    }
  } catch (_) {}

  const rec = {
    id: "pend_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    status: "pending",
    submittedAt: new Date().toISOString(),
    name,
    email,
    regNo,
    programme: String(s.programme || "").trim(),
    level: s.level != null ? String(s.level).trim() : "",
    gender: String(s.gender || "").trim(),
    phone: String(s.phone || "").trim(),
    hostel: String(s.hostel || "").trim(),
    photoDataUrl: s.photoDataUrl || "",
  };
  list.unshift(rec);
  // keep last 500
  if (list.length > 500) list = list.slice(0, 500);
  await githubPutFile(env, path, JSON.stringify(list, null, 2), `Student registration pending: ${regNo}`, cur.sha);
  return json({ ok: true, id: rec.id, message: "Submitted for QA / Student Affairs review. You will be contacted if more is needed." }, 200, cors);
}

async function handleRejectEmail(env, request, payload, cors) {
  if (!checkPublishKey(env, request, payload)) {
    return json({ error: "Unauthorized" }, 401, cors);
  }
  const to = String(payload.to || "").trim();
  const studentName = String(payload.studentName || "Applicant").trim();
  const reason = String(payload.reason || "").trim();
  const regNo = String(payload.regNo || "").trim();
  const programme = String(payload.programme || "").trim();
  const level = String(payload.level || "").trim();
  if (!to || !reason) return json({ error: "to and reason required" }, 400, cors);

  const safeReason = reason
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br/>");

  const subject = `Eastern Oak College of Nursing Sciences — Registration review update${regNo ? " (" + regNo + ")" : ""}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Georgia,'Times New Roman',serif;color:#0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1f5f9;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
        <tr>
          <td style="background:linear-gradient(135deg,#0f766e,#0d9488);padding:22px 28px;text-align:center;">
            <div style="font-size:13px;letter-spacing:2px;text-transform:uppercase;color:#ccfbf1;font-family:Arial,sans-serif;">Eastern Oak College of Nursing Sciences</div>
            <div style="font-size:20px;font-weight:700;color:#ffffff;margin-top:8px;font-family:Arial,sans-serif;">Student Registration Desk</div>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 28px 8px;font-size:16px;line-height:1.55;">
            <p style="margin:0 0 14px;">Dear <strong>${studentName}</strong>,</p>
            <p style="margin:0 0 14px;">Thank you for submitting your registration details to <strong>Eastern Oak College of Nursing Sciences</strong>.</p>
            <p style="margin:0 0 14px;">Following review by the Quality Assurance / Student Affairs desk, this submission <strong>could not be approved at this time</strong>.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:0 28px 8px;">
            <table role="presentation" width="100%" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;">
              <tr><td style="padding:14px 16px;font-family:Arial,sans-serif;font-size:13px;color:#475569;">
                ${regNo ? "<div><strong>Registration number:</strong> " + regNo + "</div>" : ""}
                ${programme || level ? "<div><strong>Programme / Level:</strong> " + (programme || "—") + (level ? " · " + level : "") + "</div>" : ""}
              </td></tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 28px;">
            <div style="font-family:Arial,sans-serif;font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#0d9488;margin-bottom:8px;">Reason for this decision</div>
            <div style="background:#fffbeb;border-left:4px solid #b45309;padding:14px 16px;font-size:15px;line-height:1.5;">${safeReason}</div>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 28px 24px;font-size:15px;line-height:1.55;">
            <p style="margin:0 0 14px;">You are welcome to <strong>correct the issue</strong> and submit again through the official student registration page. If you need clarification, please contact the Quality Assurance or Student Affairs office of the College.</p>
            <p style="margin:0 0 6px;">Yours faithfully,</p>
            <p style="margin:0;"><strong>Quality Assurance / Student Affairs Desk</strong><br/>Eastern Oak College of Nursing Sciences</p>
          </td>
        </tr>
        <tr>
          <td style="background:#0f172a;padding:14px 28px;font-family:Arial,sans-serif;font-size:11px;color:#94a3b8;text-align:center;line-height:1.4;">
            This message was sent regarding your registration review. Please do not reply with sensitive credentials.
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  if (!env.RESEND_API_KEY) {
    return json({
      ok: false,
      emailed: false,
      message: "RESEND_API_KEY not configured on worker.",
      mailtoSubject: subject,
      mailtoBody: `Dear ${studentName},\n\nThank you for submitting your registration details to Eastern Oak College of Nursing Sciences.\n\nFollowing review, this submission could not be approved at this time.\n\nReason:\n${reason}\n\nYou may correct the issue and submit again through the official registration page, or contact QA / Student Affairs.\n\nYours faithfully,\nQuality Assurance / Student Affairs Desk\nEastern Oak College of Nursing Sciences`,
    }, 200, cors);
  }

  const from = env.MAIL_FROM || "EOCNS Registry <onboarding@resend.dev>";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: [to], subject, html }),
  });
  if (!res.ok) {
    const t = await res.text();
    return json({ ok: false, emailed: false, error: t.slice(0, 400) }, 502, cors);
  }
  return json({ ok: true, emailed: true }, 200, cors);
}


// ===== Officer auth (PIN lives ONLY as Worker secret OFFICER_PIN) =====
const loginAttempts = new Map();

function clientIp(request) {
  return request.headers.get("CF-Connecting-IP") || request.headers.get("X-Forwarded-For") || "unknown";
}

function rateLimitLogin(ip) {
  const now = Date.now();
  let row = loginAttempts.get(ip);
  if (!row || now > row.reset) {
    row = { n: 0, reset: now + 15 * 60 * 1000 };
    loginAttempts.set(ip, row);
  }
  row.n += 1;
  return row.n <= 8;
}

function b64url(bytes) {
  let s = btoa(String.fromCharCode(...bytes));
  return s.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlFromStr(str) {
  return b64url(new TextEncoder().encode(str));
}

async function hmacSign(secret, msg) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(msg));
  return b64url(new Uint8Array(sig));
}

async function makeSessionToken(env, officer) {
  const secret = env.SESSION_SECRET || env.OFFICER_PIN || env.PUBLISH_KEY || "eocns-dev-session";
  const exp = Date.now() + 12 * 60 * 60 * 1000;
  const payload = b64urlFromStr(JSON.stringify({ v: 1, officer: officer || "QA Officer", exp }));
  const sig = await hmacSign(secret, payload);
  return payload + "." + sig;
}

async function verifySessionToken(env, token) {
  if (!token || String(token).indexOf(".") < 0) return null;
  const secret = env.SESSION_SECRET || env.OFFICER_PIN || env.PUBLISH_KEY || "eocns-dev-session";
  const [payload, sig] = String(token).split(".");
  const expect = await hmacSign(secret, payload);
  if (sig !== expect) return null;
  try {
    let b64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4) b64 += "=";
    const data = JSON.parse(atob(b64));
    if (!data.exp || Date.now() > data.exp) return null;
    return data;
  } catch {
    return null;
  }
}

const AUTH_PIN_PATH = "data/auth_pin.json";
const PBKDF2_ITERS = 120000;

async function pbkdf2Hash(pin, saltB64) {
  const saltBin = atob(saltB64);
  const salt = new Uint8Array(saltBin.length);
  for (let i = 0; i < saltBin.length; i++) salt[i] = saltBin.charCodeAt(i);
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(pin),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt, iterations: PBKDF2_ITERS, hash: "SHA-256" },
    keyMaterial,
    256
  );
  const arr = new Uint8Array(bits);
  let s = "";
  for (let i = 0; i < arr.length; i++) s += String.fromCharCode(arr[i]);
  return btoa(s);
}

function randomSaltB64() {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  let s = "";
  for (let i = 0; i < salt.length; i++) s += String.fromCharCode(salt[i]);
  return btoa(s);
}

async function loadPinRecord(env) {
  if (!env.GITHUB_TOKEN) return { record: null, sha: null };
  const file = await githubGetFile(env, AUTH_PIN_PATH);
  if (!file.content) return { record: null, sha: file.sha };
  try {
    return { record: JSON.parse(file.content), sha: file.sha };
  } catch (_) {
    return { record: null, sha: file.sha };
  }
}

async function pinMatchesRecord(pin, record) {
  if (!record || !record.hash || !record.salt) return false;
  const h = await pbkdf2Hash(pin, record.salt);
  return h === record.hash;
}

/** Hash file first; else bootstrap from Worker secret OFFICER_PIN (one-time until first site change). */
async function checkOfficerPin(env, pin) {
  pin = String(pin || "").trim();
  if (!pin) return { ok: false, via: null };
  const { record } = await loadPinRecord(env);
  if (record && record.hash) {
    const ok = await pinMatchesRecord(pin, record);
    return { ok, via: "hash" };
  }
  const bootstrap = String(env.OFFICER_PIN || "").trim();
  if (bootstrap && pin === bootstrap) return { ok: true, via: "bootstrap" };
  return { ok: false, via: record ? "hash" : "bootstrap" };
}

async function savePinHash(env, pin, message) {
  if (!env.GITHUB_TOKEN) throw new Error("GITHUB_TOKEN required to store PIN hash");
  const salt = randomSaltB64();
  const hash = await pbkdf2Hash(pin, salt);
  const record = {
    v: 1,
    algo: "PBKDF2-SHA256",
    iterations: PBKDF2_ITERS,
    salt: salt,
    hash: hash,
    updatedAt: new Date().toISOString(),
  };
  const cur = await githubGetFile(env, AUTH_PIN_PATH);
  await githubPutFile(
    env,
    AUTH_PIN_PATH,
    JSON.stringify(record, null, 2),
    message || "EOCNS: update officer PIN hash (plaintext never stored)",
    cur.sha
  );
  return record;
}

async function handleLogin(env, request, payload, cors) {
  const ip = clientIp(request);
  if (!rateLimitLogin(ip)) {
    return json({ error: "Too many login attempts. Try again in 15 minutes." }, 429, cors);
  }
  const pin = String(payload.pin || "").trim();
  const officer = String(payload.officer || payload.name || "QA Officer").trim() || "QA Officer";
  if (!pin) return json({ error: "PIN required." }, 400, cors);

  let checked;
  try {
    checked = await checkOfficerPin(env, pin);
  } catch (err) {
    return json({ error: "Auth check failed: " + (err.message || String(err)) }, 502, cors);
  }

  if (!checked.ok) {
    // Distinguish empty bootstrap for operators
    if (checked.via === "bootstrap" && !String(env.OFFICER_PIN || "").trim()) {
      return json({
        error: "No officer PIN is set. Set Worker secret OFFICER_PIN once, or contact the system admin.",
      }, 503, cors);
    }
    return json({ error: "Incorrect officer PIN." }, 401, cors);
  }

  // Auto-migrate bootstrap secret → hash file so site change-PIN works without wrangler later
  if (checked.via === "bootstrap" && env.GITHUB_TOKEN) {
    try {
      await savePinHash(env, pin, "EOCNS: migrate officer PIN to hashed auth_pin.json");
    } catch (err) {
      // still allow login
      console.log("pin migrate skip", err && err.message);
    }
  }

  const token = await makeSessionToken(env, officer);
  return json({
    ok: true,
    token,
    officer,
    expiresInHours: 12,
    message: "Signed in. Session is valid for about 12 hours.",
  }, 200, cors);
}

async function handleVerifySession(env, payload, cors) {
  const token = String(payload.token || "").trim();
  const data = await verifySessionToken(env, token);
  if (!data) return json({ ok: false, error: "Session expired or invalid." }, 401, cors);
  return json({ ok: true, officer: data.officer, exp: data.exp }, 200, cors);
}

async function handleChangePin(env, request, payload, cors) {
  const current = String(payload.currentPin || "").trim();
  const next = String(payload.newPin || "").trim();
  if (!current || !next) return json({ error: "currentPin and newPin are required." }, 400, cors);
  if (next.length < 6) return json({ error: "New PIN must be at least 6 characters." }, 400, cors);
  if (next === current) return json({ error: "New PIN must differ from the current PIN." }, 400, cors);
  if (!env.GITHUB_TOKEN) return json({ error: "GITHUB_TOKEN not configured on Worker." }, 500, cors);

  let checked;
  try {
    checked = await checkOfficerPin(env, current);
  } catch (err) {
    return json({ error: "Auth check failed: " + (err.message || String(err)) }, 502, cors);
  }
  if (!checked.ok) return json({ error: "Current PIN is incorrect." }, 401, cors);

  try {
    await savePinHash(env, next, "EOCNS: officer PIN changed from site (hash only)");
  } catch (err) {
    return json({ error: "Could not save new PIN: " + (err.message || String(err)) }, 502, cors);
  }

  return json({
    ok: true,
    message: "PIN updated successfully. Use the new PIN on all devices immediately. No Wrangler/deploy step required.",
  }, 200, cors);
}


export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "*";
    const cors = corsHeaders(origin);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });

    if (request.method === "GET") {
      return json({
        service: "eocns-publish",
        ok: true,
        auth: "Officer PIN verified by Worker; stored as PBKDF2 hash in data/auth_pin.json (changeable from the site).",
        endpoints: [
          "login (POST action=login)",
          "verify_session (POST action=verify_session)",
          "change_pin (POST action=change_pin — updates hash in repo; no wrangler)",
          "get_store (POST action=get_store — session token; decrypts if needed)",
          "publish (POST files)",
          "submit_pending (POST student)",
          "reject_email (POST)",
        ],
      }, 200, cors);
    }

    if (request.method !== "POST") return json({ error: "POST only" }, 405, cors);

    let payload;
    try { payload = await request.json(); } catch {
      return json({ error: "Invalid JSON body" }, 400, cors);
    }

    const action = payload.action || (payload.files ? "publish" : (payload.student ? "submit_pending" : "publish"));
    try {
      if (action === "login") return await handleLogin(env, request, payload, cors);
      if (action === "verify_session") return await handleVerifySession(env, payload, cors);
      if (action === "change_pin") return await handleChangePin(env, request, payload, cors);
      if (action === "get_store") {
        if (!env.GITHUB_TOKEN) return json({ error: "GITHUB_TOKEN secret not configured on worker" }, 500, cors);
        return await handleGetStore(env, request, payload, cors);
      }
      if (!env.GITHUB_TOKEN) return json({ error: "GITHUB_TOKEN secret not configured on worker" }, 500, cors);
      if (action === "submit_pending") return await handleSubmitPending(env, payload, cors);
      if (action === "reject_email") return await handleRejectEmail(env, request, payload, cors);
      return await handlePublish(env, request, payload, cors);
    } catch (err) {
      return json({ error: err.message || String(err) }, 502, cors);
    }
  },
};
