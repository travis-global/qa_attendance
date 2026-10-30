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
  "data/remedial.json",
  "data/remedial_logs.json",
  "data/remedial_timetable.json",
  "data/remedial_assignments.json",
  "data/remedial_enrolment.json",
  "data/remedial_meta.json",
  "data/config.json",
  "data/discipline.json",
  "data/pending_students.json",
]);

const OWNER = "travis-global";
const REPO = "qa_attendance";
const BRANCH = "main";

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-EOCNS-Key, X-Publish-Key",
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
  if (!sha) {
    const cur = await githubGetFile(env, path);
    sha = cur.sha;
  }
  const bytes = new TextEncoder().encode(contentText);
  let binary = "";
  bytes.forEach((b) => { binary += String.fromCharCode(b); });
  const body = { message, content: btoa(binary), branch: BRANCH };
  if (sha) body.sha = sha;
  const putRes = await fetch(url, { method: "PUT", headers, body: JSON.stringify(body) });
  if (!putRes.ok) {
    const errText = await putRes.text();
    throw new Error(`${path} → ${putRes.status} ${errText.slice(0, 240)}`);
  }
  return putRes.json();
}

function checkPublishKey(env, request, payload) {
  if (!env.PUBLISH_KEY) return true;
  const key =
    request.headers.get("X-EOCNS-Key") ||
    request.headers.get("X-Publish-Key") ||
    (payload && payload.publishKey) ||
    "";
  return key === env.PUBLISH_KEY;
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
  for (const [path, contentText] of Object.entries(files)) {
    if (!ALLOWED_PATHS.has(path)) throw new Error(`Path not allowed: ${path}`);
    if (typeof contentText !== "string") throw new Error(`Content for ${path} must be a string`);
    await githubPutFile(env, path, contentText, `${messageBase}: ${path}`);
    results.push(path);
  }
  return json({ ok: true, updated: results }, 200, cors);
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

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "*";
    const cors = corsHeaders(origin);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });

    if (request.method === "GET") {
      return json({
        service: "eocns-publish",
        ok: true,
        endpoints: ["publish (POST files)", "submit_pending (POST student)", "reject_email (POST)"],
      }, 200, cors);
    }

    if (request.method !== "POST") return json({ error: "POST only" }, 405, cors);
    if (!env.GITHUB_TOKEN) return json({ error: "GITHUB_TOKEN secret not configured on worker" }, 500, cors);

    let payload;
    try { payload = await request.json(); } catch {
      return json({ error: "Invalid JSON body" }, 400, cors);
    }

    const action = payload.action || (payload.files ? "publish" : (payload.student ? "submit_pending" : "publish"));
    try {
      if (action === "submit_pending") return await handleSubmitPending(env, payload, cors);
      if (action === "reject_email") return await handleRejectEmail(env, request, payload, cors);
      return await handlePublish(env, request, payload, cors);
    } catch (err) {
      return json({ error: err.message || String(err) }, 502, cors);
    }
  },
};
