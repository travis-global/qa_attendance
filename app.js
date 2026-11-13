/* EOCNS build v95 — outer bare report refs removed */
(() => {
"use strict";
// Safe stubs so early event wiring never throws ReferenceError (real impls overwrite later)
if (typeof window.closeStudentFullRecord !== "function") {
  window.closeStudentFullRecord = function() {
    var m = document.getElementById("studentFullRecordModal");
    if (!m) return;
    m.hidden = true; m.setAttribute("hidden", ""); m.style.display = "none";
  };
}
if (typeof window.openStudentFullRecord !== "function") {
  window.openStudentFullRecord = function(id) {
    console.warn("openStudentFullRecord not ready yet", id);
  };
}
if (typeof window.generateStudentRegisterReport !== "function") {
  window.generateStudentRegisterReport = async function() {
    alert("Student register report is still loading. Wait 2 seconds and try again, or hard-refresh.");
  };
}
const THEME_KEY = "eocns-theme";
function getPreferredTheme() {
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem(THEME_KEY, theme);
}
applyTheme(getPreferredTheme());
document.getElementById("themeToggle")?.addEventListener("click", () => {
  applyTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark");
});
const sidebar = document.getElementById("sidebar");
document.getElementById("sidebarToggle")?.addEventListener("click", () => sidebar?.classList.toggle("is-open"));
document.querySelectorAll(".nav-item").forEach((item) => {
  item.addEventListener("click", () => { if (window.innerWidth <= 860) sidebar?.classList.remove("is-open"); });
});
const titles = {
  dashboard: { title: "Dashboard", subtitle: "Eastern Oak College of Nursing Sciences" },
  students: { title: "Students", subtitle: "Master registry · passport profile & full record" },
  discipline: { title: "Discipline", subtitle: "Student Affairs disciplinary register" },
  pending: { title: "Pending registrations", subtitle: "Student self-service queue · approve to master list" },
  lecturers: { title: "Lecturers", subtitle: "Staff & course assignments" },
  hostel: { title: "Hostel Attendance", subtitle: "Gate log to boarding fee reports" },
  sessions: { title: "Academic Sessions", subtitle: "Programmes, levels and timetables" },
  "timetable-board": { title: "Timetable board", subtitle: "Weekly teaching grid" },
  "qa-daily": { title: "Daily QA", subtitle: "Lecture compliance" },
  "qa-weekly": { title: "Weekly QA", subtitle: "Weekly teaching compliance" },
  "qa-monthly": { title: "Monthly QA", subtitle: "Full monthly quality assurance" },
  remedial: { title: "Remedial System", subtitle: "Make-up and remedial teaching logs" },
  "lecturer-hours": { title: "Lecturer contract hours", subtitle: "Contracted vs delivered hours" },
  reports: { title: "Reports and Export", subtitle: "Attendance sheets, PDFs and CSV" },
  audit: { title: "Audit Log", subtitle: "Every change with REF/EOCNS/QA" },
  settings: { title: "Settings", subtitle: "Roles, letterhead and system preferences" },
};
/** Views anyone may open without officer PIN (login lives under Settings). */
var PUBLIC_VIEWS = { dashboard: true, settings: true };

/** Everything else is officer-only (logging, master lists, QA, reports, remedial, hostel, …). */
function isOfficerOnlyView(viewId) {
  return !PUBLIC_VIEWS[viewId];
}

function openOfficerLoginGate(targetView) {
  var gate = document.getElementById("officerLoginGate");
  if (gate) {
    gate.hidden = false;
    gate.setAttribute("data-target-view", targetView || "");
    var nameEl = document.getElementById("officerGateViewName");
    if (nameEl) {
      var meta = titles[targetView] || { title: targetView || "this section" };
      nameEl.textContent = meta.title || targetView || "this section";
    }
    var pin = document.getElementById("officerGatePin");
    if (pin) { pin.value = ""; setTimeout(function() { try { pin.focus(); } catch (_) {} }, 50); }
  }
  // Always send viewers to a safe public surface
  try {
    document.querySelectorAll(".nav-item").forEach(function(el) {
      el.classList.toggle("active", el.dataset.view === "dashboard");
    });
    document.querySelectorAll(".view").forEach(function(el) {
      el.classList.toggle("active", el.id === "view-dashboard");
    });
    var titleEl = document.getElementById("pageTitle");
    var subEl = document.getElementById("pageSubtitle");
    if (titleEl) titleEl.textContent = (titles.dashboard && titles.dashboard.title) || "Dashboard";
    if (subEl) subEl.textContent = (titles.dashboard && titles.dashboard.subtitle) || "";
  } catch (_) {}
}

function closeOfficerLoginGate() {
  var gate = document.getElementById("officerLoginGate");
  if (gate) { gate.hidden = true; gate.removeAttribute("data-target-view"); }
}

function tryOfficerGateLogin() {
  var pin = (document.getElementById("officerGatePin") && document.getElementById("officerGatePin").value || "").trim();
  var err = document.getElementById("officerGateError");
  var expected = (typeof APP_CONFIG !== "undefined" && APP_CONFIG && APP_CONFIG.qaPin) || "EOCNS-QA";
  if (!pin) {
    if (err) { err.hidden = false; err.textContent = "Enter the QA officer PIN."; }
    return;
  }
  if (pin !== expected) {
    if (err) { err.hidden = false; err.textContent = "Incorrect PIN. Access remains locked."; }
    return;
  }
  var nameInput = document.getElementById("officerGateName");
  var officerName = (nameInput && nameInput.value || "").trim();
  if (!officerName) officerName = ensureQaOfficerName("");
  if (!officerName) {
    if (err) { err.hidden = false; err.textContent = "Enter your full name for the audit trail."; }
    return;
  }
  if (err) err.hidden = true;
  setQaOfficer(true, officerName);
  var gate = document.getElementById("officerLoginGate");
  var target = (gate && gate.getAttribute("data-target-view")) || "dashboard";
  closeOfficerLoginGate();
  showView(target);
}

function showView(viewId) {
  if (isOfficerOnlyView(viewId) && !isQaOfficer()) {
    openOfficerLoginGate(viewId);
    return;
  }
  closeOfficerLoginGate();
  document.querySelectorAll(".nav-item").forEach((el) => el.classList.toggle("active", el.dataset.view === viewId));
  document.querySelectorAll(".view").forEach((el) => el.classList.toggle("active", el.id === "view-" + viewId));
  const meta = titles[viewId] || { title: "EOCNS", subtitle: "" };
  const titleEl = document.getElementById("pageTitle");
  const subEl = document.getElementById("pageSubtitle");
  if (titleEl) titleEl.textContent = meta.title;
  if (subEl) subEl.textContent = meta.subtitle;
  try { sessionStorage.setItem("eocns-last-view", viewId); } catch (_) {}
  if (viewId === "students") { renderStudentsTable(); try { renderCsvReviewQueue(); } catch (_) {} }
  if (viewId === "discipline") renderDisciplineTable();
  if (viewId === "pending") renderPendingRegistrations({ fromRepo: false });
  if (viewId === "lecturers") renderLecturersTable();
  if (viewId === "remedial") showRemTab("setup");
  if (viewId === "lecturer-hours") {
    var m = document.getElementById("lecturerHoursMonth");
    if (m && !m.value) m.value = new Date().toISOString().slice(0, 7);
    fillLecturerHoursSemesters();
  }
  if (viewId === "sessions") renderSessionsList();
  if (viewId === "dashboard") refreshDashboardStats();
  if (viewId === "audit") renderAuditLog();
  if (viewId === "hostel") { initHostelView(); renderHostelRoster(); try { renderBioQueues(); } catch (_) {} try { renderHostelConflicts(); } catch (_) {} }
  if (viewId === "timetable-board") { if (typeof window.renderTimetableBoard === "function") window.renderTimetableBoard(); else if (typeof renderTimetableBoard === "function") renderTimetableBoard(); }
  if (viewId === "qa-daily") renderQaDaily();
  if (viewId === "qa-weekly") initQaWeeklyView();
  if (viewId === "qa-monthly") initQaMonthlyView();
  if (viewId === "settings") { renderProgrammesLevels(); renderCoursesTable(); renderTimetableEditor(); }
  if (viewId === "reports") renderReportsView();
  if (viewId === "attendance") { fillProgrammeLevelSelects(); }
  if (viewId === "audit") renderAuditLog();
}
document.querySelectorAll("[data-view]").forEach((el) => {
  el.addEventListener("click", (e) => { e.preventDefault(); showView(el.dataset.view); });
});
document.querySelectorAll("[data-goto]").forEach((el) => {
  el.addEventListener("click", () => showView(el.dataset.goto));
});

var EOCNS_DIRTY = false;
function persistSyncMeta(key, value) {
  try { if (typeof db !== "undefined" && db) put("meta", { key: key, value: value, at: new Date().toISOString() }).catch(function() {}); } catch (_) {}
}
function markDirty(reason) {
  EOCNS_DIRTY = true;
  persistSyncMeta("dirty", true);
  try {
    var el = document.getElementById("dirtyBanner");
    if (el) { el.hidden = false; el.textContent = "Unsaved local changes" + (reason ? " (" + reason + ")" : "") + " — Publish to repository in Settings before you leave, or you may lose work on another device."; }
  } catch (_) {}
}
function clearDirty() {
  EOCNS_DIRTY = false;
  persistSyncMeta("dirty", false);
  persistSyncMeta("lastPublishAt", new Date().toISOString());
  try {
    var el = document.getElementById("dirtyBanner");
    if (el) el.hidden = true;
  } catch (_) {}
}
window.addEventListener("beforeunload", function(e) {
  if (!EOCNS_DIRTY) return;
  e.preventDefault();
  e.returnValue = "You have changes that are not published to the repository. Leave anyway?";
  return e.returnValue;
});

const DB_NAME = "eocns_attendance";
const DB_VERSION = 11;
let db = null;

async function resetLocalDatabase() {
  try {
    if (db) { try { db.close(); } catch (_) {} db = null; }
    await new Promise(function(resolve, reject) {
      var r = indexedDB.deleteDatabase(DB_NAME);
      r.onsuccess = function() { resolve(); };
      r.onerror = function() { reject(r.error); };
      r.onblocked = function() { reject(new Error("Close other tabs of this site, then try again.")); };
    });
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
}

function openDB() {
  return new Promise((resolve, reject) => {
    let settled = false;
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => {
      if (settled) return;
      settled = true;
      reject(req.error || new Error("IndexedDB open failed"));
    };
    req.onsuccess = () => {
      if (settled) return;
      settled = true;
      db = req.result;
      db.onversionchange = function() {
        try { db.close(); } catch (_) {}
      };
      resolve(db);
    };
    req.onblocked = () => {
      console.warn("IndexedDB upgrade blocked — close other tabs of this site and reload.");
    };
    req.onupgradeneeded = (e) => {
      const database = e.target.result;
      try {
        if (!database.objectStoreNames.contains("students")) {
          const store = database.createObjectStore("students", { keyPath: "id" });
          // non-unique: many TMP/blank reg numbers are allowed
          store.createIndex("regNo", "regNo", { unique: false });
        }
        if (!database.objectStoreNames.contains("lecturers")) database.createObjectStore("lecturers", { keyPath: "id" });
        if (!database.objectStoreNames.contains("sessions")) database.createObjectStore("sessions", { keyPath: "id" });
        if (!database.objectStoreNames.contains("audit")) {
          const audit = database.createObjectStore("audit", { keyPath: "id", autoIncrement: true });
          audit.createIndex("ref", "ref", { unique: false });
        }
        if (!database.objectStoreNames.contains("meta")) database.createObjectStore("meta", { keyPath: "key" });
        if (!database.objectStoreNames.contains("qa_entries")) {
          const qa = database.createObjectStore("qa_entries", { keyPath: "id" });
          qa.createIndex("date", "date", { unique: false });
          qa.createIndex("classKey", "classKey", { unique: false });
        }
        if (!database.objectStoreNames.contains("programmes")) database.createObjectStore("programmes", { keyPath: "id" });
        if (!database.objectStoreNames.contains("levels")) database.createObjectStore("levels", { keyPath: "id" });
        if (!database.objectStoreNames.contains("courses")) database.createObjectStore("courses", { keyPath: "code" });
        if (!database.objectStoreNames.contains("attendance")) {
          const att = database.createObjectStore("attendance", { keyPath: "id" });
          att.createIndex("date", "date", { unique: false });
          att.createIndex("classKey", "classKey", { unique: false });
        }
        if (!database.objectStoreNames.contains("hostel_runs")) {
          database.createObjectStore("hostel_runs", { keyPath: "id" });
        }
        if (!database.objectStoreNames.contains("biometric_pending")) {
          database.createObjectStore("biometric_pending", { keyPath: "id" });
        }
        if (!database.objectStoreNames.contains("remedial")) {
          database.createObjectStore("remedial", { keyPath: "id" });
        }
        if (!database.objectStoreNames.contains("remedial_meta")) database.createObjectStore("remedial_meta", { keyPath: "key" });
        if (!database.objectStoreNames.contains("remedial_enrolment")) database.createObjectStore("remedial_enrolment", { keyPath: "id" });
        if (!database.objectStoreNames.contains("remedial_assignments")) database.createObjectStore("remedial_assignments", { keyPath: "id" });
        if (!database.objectStoreNames.contains("remedial_timetable")) database.createObjectStore("remedial_timetable", { keyPath: "key" });
        if (!database.objectStoreNames.contains("remedial_logs")) database.createObjectStore("remedial_logs", { keyPath: "id" });
        if (!database.objectStoreNames.contains("discipline")) database.createObjectStore("discipline", { keyPath: "id" });
        if (!database.objectStoreNames.contains("pending_students")) database.createObjectStore("pending_students", { keyPath: "id" });

      } catch (upgradeErr) {
        console.error("onupgradeneeded", upgradeErr);
        throw upgradeErr;
      }
    };
  });
}
function tx(storeName, mode) {
  if (!db) throw new Error("Database not ready");
  return db.transaction(storeName, mode || "readonly").objectStore(storeName);
}
function getAll(storeName) {
  return new Promise((resolve, reject) => {
    const req = tx(storeName).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}
function del(storeName, key) {
  return new Promise(function(resolve, reject) {
    var t = db.transaction(storeName, "readwrite");
    t.objectStore(storeName).delete(key);
    t.oncomplete = function() { resolve(); };
    t.onerror = function() { reject(t.error); };
  });
}
function put(storeName, value) {
  return new Promise((resolve, reject) => {
    const req = tx(storeName, "readwrite").put(value);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function nextRefNumber() {
  const store = tx("meta", "readwrite");
  return new Promise((resolve, reject) => {
    const req = store.get("refCounter");
    req.onsuccess = () => {
      let counter = (req.result && req.result.value) || 1000;
      counter += 1;
      store.put({ key: "refCounter", value: counter }).onsuccess = () => resolve(counter);
    };
    req.onerror = () => reject(req.error);
  });
}
async function writeAudit(opts) {
  let ref = (opts.externalRef || "").trim();
  if (!ref) {
    const num = await nextRefNumber();
    ref = "REF/EOCNS/QA/" + String(num).padStart(4, "0");
  }
  var when = new Date();
  var timestamp = when.toISOString();
  var officer = (opts.officer || opts.user || "").trim();
  if (!officer && typeof getQaOfficerName === "function") officer = getQaOfficerName();
  if (!officer) officer = "QA Officer (name not recorded at sign-in)";
  await put("audit", {
    ref: ref,
    action: opts.action,
    entity: opts.entity,
    entityId: opts.entityId,
    reason: opts.reason || "",
    details: opts.details || {},
    timestamp: timestamp,
    at: timestamp,
    createdAt: timestamp,
    // Human-readable local time for audit tables
    whenLocal: when.toLocaleString("en-GB", {
      weekday: "short", year: "numeric", month: "short", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false
    }),
    user: officer,
    officer: officer,
    source: opts.externalRef ? "official-letter" : "system",
  });
  return ref;
}
let studentsCache = [];
const PROGRAMME_CODES = { Nursing: "GNS", Midwifery: "MID" };
function getProgrammeCode(p) {
  if (PROGRAMME_CODES[p]) return PROGRAMME_CODES[p];
  try {
    var hit = (typeof PROGRAMMES_CACHE !== "undefined" && PROGRAMMES_CACHE || []).find(function(x) { return x.name === p; });
    if (hit && hit.code) return hit.code;
  } catch (_) {}
  return p ? String(p).replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase() : "GEN";
}
// Keeps Nursing/Midwifery as before, but no longer turns every other programme (e.g. Public Health) into Nursing.
function normalizeProgramme(p) {
  var t = String(p || "").trim();
  if (!t || /^(general\s+)?nursing$|^gns$/i.test(t)) return "Nursing";
  if (/^midwifery$|^mid$/i.test(t)) return "Midwifery";
  return t;
}

/** Temporary reg numbers (TMP-… / TEMP-…) sort after permanent ones. */
function isTempRegNo(reg) {
  var r = String(reg || "").trim().toUpperCase();
  if (!r) return true; // blank treated as temporary / last
  return r.indexOf("TMP-") === 0 || r.indexOf("TEMP-") === 0 || r.indexOf("TMP/") === 0 ||
    r.indexOf("TEMPORARY") === 0 || /\bTMP\b/.test(r);
}

/** Sort key for reg numbers: permanent first (natural), then temporary. */
function compareStudentsByRegNo(a, b) {
  var ra = String(a.regNo || a.reg_no || "").trim();
  var rb = String(b.regNo || b.reg_no || "").trim();
  var ta = isTempRegNo(ra);
  var tb = isTempRegNo(rb);
  if (ta !== tb) return ta ? 1 : -1; // permanent before temporary
  // natural-ish: split digits and text
  var na = ra.toUpperCase();
  var nb = rb.toUpperCase();
  if (na && nb && na !== nb) {
    var pa = na.match(/(\d+|\D+)/g) || [na];
    var pb = nb.match(/(\d+|\D+)/g) || [nb];
    var n = Math.max(pa.length, pb.length);
    for (var i = 0; i < n; i++) {
      var xa = pa[i] || "";
      var xb = pb[i] || "";
      var da = /^\d+$/.test(xa);
      var db = /^\d+$/.test(xb);
      if (da && db) {
        var diff = parseInt(xa, 10) - parseInt(xb, 10);
        if (diff) return diff;
      } else {
        var c = xa.localeCompare(xb);
        if (c) return c;
      }
    }
  } else if (na !== nb) {
    return na.localeCompare(nb);
  }
  return String(a.name || "").localeCompare(String(b.name || ""));
}

async function generateTempRegNo(programme) {
  const year = String(new Date().getFullYear()).slice(-2);
  const code = getProgrammeCode(programme);
  const students = await getAll("students");
  const prefix = "TMP-EOCNS/" + year + "/";
  const suffix = "/" + code;
  let maxNum = 0;
  for (const s of students) {
    const reg = s.regNo || "";
    if (reg.startsWith(prefix) && reg.endsWith(suffix)) {
      const num = parseInt(reg.slice(prefix.length, reg.length - suffix.length), 10);
      if (!isNaN(num) && num > maxNum) maxNum = num;
    }
  }
  return "TMP-EOCNS/" + year + "/" + String(Math.min(maxNum + 1, 1000)).padStart(4, "0") + "/" + code;
}
async function generateStaffId() {
  const list = await getAll("lecturers");
  const year = new Date().getFullYear();
  const prefix = "EOCNS/STF/" + year + "/";
  let max = 0;
  const used = {};
  list.forEach(function(l) {
    const sid = l.staffId || "";
    used[normStaffId(sid)] = true;
    if (sid.indexOf(prefix) === 0) {
      const n = parseInt(sid.slice(prefix.length), 10);
      if (!isNaN(n) && n > max) max = n;
    }
  });
  let cand;
  do { max += 1; cand = prefix + String(max).padStart(4, "0"); } while (used[normStaffId(cand)]);
  return cand;
}

function generateId(prefix) {
  return prefix + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
function escapeHtml(str) {
  const map = { "&": "&" + "amp;", "<": "&" + "lt;", ">": "&" + "gt;", '"': "&" + "quot;", "'": "&#39;" };
  return String(str ?? "").replace(/[&<>"']/g, c => map[c]);
}
function formatDate(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
async function loadStudents() {
  studentsCache = await studentsForActiveSession();
  return studentsCache;
}
async function renderStudentsTable() {
  await loadStudents();
  await fillProgrammeLevelSelects();
  const tbody = document.getElementById("studentsTableBody");
  const empty = document.getElementById("studentsEmpty");
  const countEl = document.getElementById("studentsCount");
  if (!tbody) return;
  const search = (document.getElementById("studentSearch") && document.getElementById("studentSearch").value || "").toLowerCase().trim();
  const fProg = (document.getElementById("filterProgramme") && document.getElementById("filterProgramme").value) || "";
  const fLevel = (document.getElementById("filterLevel") && document.getElementById("filterLevel").value) || "";
  let list = studentsCache.slice();
  if (search) list = list.filter(function(s) {
    return (s.name || "").toLowerCase().indexOf(search) >= 0 || (s.regNo || "").toLowerCase().indexOf(search) >= 0;
  });
  if (fProg) list = list.filter(function(s) { return String(s.programme || "") === fProg; });
  if (fLevel) list = list.filter(function(s) { return String(s.level || "") === String(fLevel); });
  if (countEl) countEl.textContent = list.length + " student" + (list.length !== 1 ? "s" : "");
  if (!list.length) {
    tbody.innerHTML = "";
    if (empty) empty.hidden = false;
    return;
  }
  if (empty) empty.hidden = true;
  tbody.innerHTML = list.map(function(s) {
    var id = s.id;
    var cb = isQaOfficer()
      ? ('<td class="qa-edit-only"><input type="checkbox" class="stu-select" value="' + id + '" /></td>')
      : '<td class="qa-edit-only"></td>';
    // View is always available (not qa-edit-only)
    var actions = '<button type="button" class="icon-btn-sm" data-profile-stu="' + id + '" title="Open DSA full record">View</button>';
    if (isQaOfficer()) {
      actions += ' <button type="button" class="icon-btn-sm qa-edit-only" data-edit-stu="' + id + '">Edit</button>' +
        ' <button type="button" class="icon-btn-sm qa-edit-only" data-del-stu="' + id + '">Del</button>';
    }
    return "<tr data-stu-id=\"" + id + "\">" + cb +
      "<td><div class=\"cell-main\" data-profile-stu=\"" + id + "\" style=\"cursor:pointer\" title=\"Open DSA full record\">" + escapeHtml(String(s.name || "").toUpperCase()) + "</div></td>" +
      "<td>" + escapeHtml(s.regNo || "—") + "</td>" +
      "<td>" + escapeHtml(s.programme || "—") + "</td>" +
      "<td>" + escapeHtml(String(s.level || "—")) + "</td>" +
      "<td>" + escapeHtml(s.hostel || "—") + "</td>" +
      "<td><span class=\"badge " + (s.status === "Active" ? "badge--green" : "badge--muted") + "\">" +
      escapeHtml(s.status || "Active") + "</span></td>" +
      "<td>" + actions + "</td></tr>";
  }).join("");

  tbody.querySelectorAll("[data-profile-stu]").forEach(function(btn) {
    btn.addEventListener("click", function(e) {
      e.preventDefault();
      e.stopPropagation();
      var sid = btn.getAttribute("data-profile-stu");
      if (typeof openStudentFullRecord === "function") openStudentFullRecord(sid);
      else if (typeof openStudentProfile === "function") openStudentProfile(sid);
    });
  });
  tbody.querySelectorAll("[data-edit-stu]").forEach(function(btn) {
    btn.addEventListener("click", function() { openStudentForm(btn.getAttribute("data-edit-stu")); });
  });
  tbody.querySelectorAll("[data-del-stu]").forEach(function(btn) {
    btn.addEventListener("click", function() { deleteStudentById(btn.getAttribute("data-del-stu")); });
  });
  tbody.querySelectorAll(".stu-select").forEach(function(cb) {
    cb.addEventListener("change", updateBulkSelectedCount);
  });
  try { updateBulkSelectedCount(); } catch (_) {}
}

function updateBulkSelectedCount() {
  var n = document.querySelectorAll(".stu-select:checked").length;
  var el = document.getElementById("bulkSelectedCount");
  if (el) el.textContent = n + " selected";
}
async function bulkMoveStudents() {
  if (!isQaOfficer()) return;
  var ids = Array.from(document.querySelectorAll(".stu-select:checked")).map(function(el) { return el.value; });
  if (!ids.length) { alert("Select one or more students first."); return; }
  var prog = (document.getElementById("bulkProgramme") && document.getElementById("bulkProgramme").value) || "";
  var level = (document.getElementById("bulkLevel") && document.getElementById("bulkLevel").value) || "";
  if (!prog && !level) { alert("Choose a target programme and/or level."); return; }
  if (!confirm("Move " + ids.length + " student(s)? Past attendance and QA logs keep their historical programme/level; only the student master record changes.")) return;
  var now = new Date().toISOString();
  for (var i = 0; i < ids.length; i++) {
    var s = studentsCache.find(function(x) { return x.id === ids[i]; });
    if (!s) continue;
    var before = { programme: s.programme, level: s.level };
    if (prog) s.programme = prog;
    if (level) s.level = level;
    s.updatedAt = now;
    await put("students", s);
    await writeAudit({
      action: "update",
      entity: "students",
      entityId: s.id,
      reason: "Programme/level move (upgrade or transfer)",
      details: { before: before, after: { programme: s.programme, level: s.level }, regNo: s.regNo, name: s.name }
    });
  }
  await renderStudentsTable();
  alert("Updated " + ids.length + " student record(s). Historical logs are unchanged.");
}
async function bulkDeactivateStudents() {
  if (!isQaOfficer()) return;
  var ids = Array.from(document.querySelectorAll(".stu-select:checked")).map(function(el) { return el.value; });
  if (!ids.length) { alert("Select students to remove from the active group."); return; }
  if (!confirm("Mark " + ids.length + " student(s) as Inactive? They remain in the register for audit integrity.")) return;
  var now = new Date().toISOString();
  for (var i = 0; i < ids.length; i++) {
    var s = studentsCache.find(function(x) { return x.id === ids[i]; });
    if (!s) continue;
    s.status = "Inactive";
    s.updatedAt = now;
    await put("students", s);
    await writeAudit({ action: "update", entity: "students", entityId: s.id, reason: "Removed from active group (status Inactive)", details: { name: s.name, regNo: s.regNo } });
  }
  await renderStudentsTable();
}

async function openStudentForm(id) {
  if (!isQaOfficer()) { alert("Sign in as QA Officer in Settings to add or edit records."); return; }
  await fillProgrammeLevelSelects();
  const modal = document.getElementById("studentModal");
  if (!modal) { alert("Student form is missing from the page. Hard-refresh and try again."); return; }
  document.getElementById("studentForm").reset();
  document.getElementById("studentId").value = "";
  document.getElementById("auditReason").value = "";
  document.getElementById("auditRef").value = "REF/EOCNS/QA/";
  if (document.getElementById("studentPhotoDataUrl")) document.getElementById("studentPhotoDataUrl").value = "";
  if (document.getElementById("studentPhotoPreview")) document.getElementById("studentPhotoPreview").innerHTML = "—";
  if (document.getElementById("studentPhotoInput")) document.getElementById("studentPhotoInput").value = "";
  const showAudit = !!id;
  ["auditReasonGroup", "auditRefGroup"].forEach(gid => {
    const el = document.getElementById(gid);
    if (el) { el.hidden = !showAudit; el.style.display = showAudit ? "" : "none"; }
  });
  if (id) {
    // Prefer cache, fall back to full store (session filter can hide a row from cache)
    var s = (studentsCache || []).find(function(x) { return x.id === id; });
    if (!s) {
      try {
        var all = await getAll("students");
        s = (all || []).find(function(x) { return x.id === id; });
      } catch (_) {}
    }
    if (!s) { alert("Could not load that student record. Refresh the Students list and try again."); return; }
    document.getElementById("studentModalTitle").textContent = "Edit Student";
    document.getElementById("studentId").value = s.id;
    document.getElementById("studentName").value = s.name || "";
    document.getElementById("studentRegNo").value = s.regNo || "";
    // Ensure programme/level options exist even if master catalogue drifted
    var progEl = document.getElementById("studentProgramme");
    var lvlEl = document.getElementById("studentLevel");
    var progVal = s.programme || "";
    var lvlVal = s.level != null && s.level !== "" ? String(s.level) : "";
    if (progEl && progVal) {
      var hasP = Array.prototype.some.call(progEl.options, function(o) { return o.value === progVal; });
      if (!hasP) {
        var op = document.createElement("option");
        op.value = progVal; op.textContent = progVal;
        progEl.appendChild(op);
      }
      progEl.value = progVal;
    }
    if (lvlEl && lvlVal) {
      var hasL = Array.prototype.some.call(lvlEl.options, function(o) { return String(o.value) === lvlVal; });
      if (!hasL) {
        var ol = document.createElement("option");
        ol.value = lvlVal; ol.textContent = lvlVal;
        lvlEl.appendChild(ol);
      }
      lvlEl.value = lvlVal;
    }
    document.getElementById("studentGender").value = s.gender || "";
    var hostEl = document.getElementById("studentHostel");
    if (hostEl) {
      var hv = s.hostel || "";
      if (hv && !Array.prototype.some.call(hostEl.options, function(o) { return o.value === hv; })) {
        var oh = document.createElement("option");
        oh.value = hv; oh.textContent = hv;
        hostEl.appendChild(oh);
      }
      hostEl.value = hv;
    }
    document.getElementById("studentStatus").value = s.status || "Active";
    document.getElementById("studentPhone").value = s.phone || "";
    if (s.photoDataUrl) {
      if (document.getElementById("studentPhotoDataUrl")) document.getElementById("studentPhotoDataUrl").value = s.photoDataUrl;
      if (document.getElementById("studentPhotoPreview")) {
        document.getElementById("studentPhotoPreview").innerHTML = '<img src="' + s.photoDataUrl + '" alt="" style="width:100%;height:100%;object-fit:cover" />';
      }
    }
  } else {
    document.getElementById("studentModalTitle").textContent = "Add Student";
  }
  modal.hidden = false;
  try { document.getElementById("studentName").focus(); } catch (_) {}
}
function closeStudentForm() { document.getElementById("studentModal").hidden = true; }
async function saveStudent(e) {
  if (e && e.preventDefault) e.preventDefault();
  try {
    const id = (document.getElementById("studentId") && document.getElementById("studentId").value || "").trim() || null;
    const name = (document.getElementById("studentName") && document.getElementById("studentName").value || "").trim();
    let regNo = (document.getElementById("studentRegNo") && document.getElementById("studentRegNo").value || "").trim();
    const programme = (document.getElementById("studentProgramme") && document.getElementById("studentProgramme").value || "").trim();
    const level = (document.getElementById("studentLevel") && document.getElementById("studentLevel").value || "").trim();
    const gender = (document.getElementById("studentGender") && document.getElementById("studentGender").value || "").trim();
    const hostel = (document.getElementById("studentHostel") && document.getElementById("studentHostel").value || "").trim();
    const status = (document.getElementById("studentStatus") && document.getElementById("studentStatus").value) || "Active";
    const phone = (document.getElementById("studentPhone") && document.getElementById("studentPhone").value || "").trim();
    const photoDataUrl = (document.getElementById("studentPhotoDataUrl") && document.getElementById("studentPhotoDataUrl").value) || "";
    const reason = (document.getElementById("auditReason") && document.getElementById("auditReason").value || "").trim();
    let officialRef = (document.getElementById("auditRef") && document.getElementById("auditRef").value || "").trim();

    if (!isQaOfficer()) { alert("Sign in as QA Officer to create or update student records."); return; }
    if (!name) { alert("Student name is required."); return; }
    if (!programme) { alert("Programme is required. Choose a programme from the list (or add it under Settings / catalogue)."); return; }
    if (!level) { alert("Level is required."); return; }

    if (id) {
      if (!reason) { alert("A reason is required when editing master data."); return; }
      if (!officialRef || officialRef === "REF/EOCNS/QA/") {
        alert("Enter the full Official Reference Number (e.g. REF/EOCNS/QA/0042).");
        return;
      }
      // Allow officers to type the number after the prefix; normalise common forms
      if (!/^REF\/EOCNS\/QA\//i.test(officialRef)) {
        if (/^\d+$/.test(officialRef)) officialRef = "REF/EOCNS/QA/" + officialRef.padStart(4, "0");
        else {
          alert("Reference Number should start with REF/EOCNS/QA/");
          return;
        }
      }
    }

    if (!regNo) regNo = await generateTempRegNo(programme || "Nursing");

    // Conflict check against full store (not only session-filtered cache)
    var allStudents = [];
    try { allStudents = await getAll("students"); } catch (_) { allStudents = studentsCache || []; }
    const regKey = String(regNo).trim().toLowerCase();
    const conflict = (allStudents || []).find(function(s) {
      return s && s.id !== id && String(s.regNo || "").trim().toLowerCase() === regKey;
    });
    if (conflict) { alert("Registration number already used by " + (conflict.name || conflict.regNo)); return; }

    const now = new Date().toISOString();
    var levelNum = level;
    if (level !== "" && !isNaN(Number(level))) levelNum = Number(level);

    if (id) {
      var existing = (allStudents || []).find(function(s) { return s.id === id; });
      if (!existing) existing = (studentsCache || []).find(function(s) { return s.id === id; });
      if (!existing) {
        alert("Original student record not found in the database. The list may be out of date — refresh, then try again.");
        return;
      }
      var student = Object.assign({}, existing, {
        id: existing.id || id,
        name: name,
        regNo: regNo,
        programme: programme,
        level: levelNum,
        gender: gender,
        hostel: hostel,
        status: status,
        phone: phone,
        photoDataUrl: photoDataUrl || existing.photoDataUrl || "",
        updatedAt: now
      });
      if (photoDataUrl) student.photoUpdatedAt = now;
      // Audit without full photo blobs (avoids IndexedDB failures on large passports)
      var beforeSlim = Object.assign({}, existing);
      var afterSlim = Object.assign({}, student);
      delete beforeSlim.photoDataUrl;
      delete afterSlim.photoDataUrl;
      await writeAudit({
        action: "update",
        entity: "students",
        entityId: id,
        reason: reason,
        details: {
          before: beforeSlim,
          after: afterSlim,
          photoChanged: !!(photoDataUrl && photoDataUrl !== (existing.photoDataUrl || ""))
        },
        externalRef: officialRef
      });
      await put("students", student);
    } else {
      var studentNew = {
        id: generateId("stu"),
        name: name,
        regNo: regNo,
        programme: programme,
        level: levelNum,
        gender: gender,
        hostel: hostel,
        status: status,
        phone: phone,
        photoDataUrl: photoDataUrl || "",
        createdAt: now,
        updatedAt: now
      };
      if (photoDataUrl) studentNew.photoUpdatedAt = now;
      var createSlim = Object.assign({}, studentNew);
      delete createSlim.photoDataUrl;
      await writeAudit({
        action: "create",
        entity: "students",
        entityId: studentNew.id,
        reason: "New student registration",
        details: { student: createSlim }
      });
      await put("students", studentNew);
    }
    closeStudentForm();
    markDirty(id ? "student update" : "student create");
    await renderStudentsTable();
    try { refreshDashboardStats(); } catch (_) {}
  } catch (err) {
    console.error("saveStudent", err);
    alert("Could not save student: " + (err && err.message ? err.message : String(err)));
  }
}

let lecturersCache = [];
async function loadLecturers() {
  lecturersCache = await getAll("lecturers");
  lecturersCache.sort((a, b) => a.name.localeCompare(b.name));
  return lecturersCache;
}
// Lecturers without sessionIds are legacy rows: treated as available in every session.
function lecturerInSession(l, sessionId) {
  if (!sessionId) return true;
  var ids = l.sessionIds;
  if (!ids || !ids.length) return true;
  return ids.indexOf(sessionId) >= 0;
}
function lecturersForActiveSession() {
  var sid = ACTIVE_SESSION && ACTIVE_SESSION.id;
  return (lecturersCache || []).filter(function(l) { return lecturerInSession(l, sid); });
}
function formatLecturerSessions(l, sessions) {
  var ids = l.sessionIds || [];
  if (!ids.length) return "All sessions";
  return ids.map(function(id) {
    var s = (sessions || []).find(function(x) { return x.id === id; });
    return s ? s.name : null;
  }).filter(Boolean).join(", ") || "—";
}
async function renderLecturerSessionBox(selectedIds, isNew) {
  var box = document.getElementById("lecturerSessionsBox");
  if (!box) return;
  var sessions = await getAll("sessions");
  await loadActiveSession();
  var sel = (selectedIds || []).slice();
  if (isNew && !sel.length && ACTIVE_SESSION) sel = [ACTIVE_SESSION.id];
  box.innerHTML = sessions.map(function(s) {
    var checked = sel.indexOf(s.id) >= 0 ? " checked" : "";
    return '<label class="chip"><input type="checkbox" name="lecturerSession" value="' + escapeHtml(s.id) + '"' + checked + "> " + escapeHtml(s.name) + "</label>";
  }).join(" ") || '<span class="muted-note">No sessions yet — create one under Sessions.</span>';
}
async function renderLecturersTable() {
  await loadLecturers();
  var allSessions = await getAll("sessions");
  var q = ((document.getElementById("lecturerSearch") && document.getElementById("lecturerSearch").value) || "").toLowerCase().trim();
  var list = lecturersCache.filter(function(l) {
    if (!q) return true;
    var blob = (l.name || "") + " " + (l.staffId || "") + " " + formatLecturerAssignments(l);
    return blob.toLowerCase().indexOf(q) >= 0;
  });
  var tbody = document.getElementById("lecturersTableBody");
  if (!tbody) return;
  var emptyEl = document.getElementById("lecturersEmpty");
  if (emptyEl) emptyEl.hidden = list.length > 0;
  tbody.innerHTML = list.map(function(l) {
    var ch = l.contractHoursPerSemester != null && l.contractHoursPerSemester !== "" ? l.contractHoursPerSemester
      : (l.contractHoursPerMonth ? l.contractHoursPerMonth + " /mo (old)" : "—");
    var actions = isQaOfficer()
      ? ('<button type="button" class="icon-btn-sm" data-edit-lec="' + l.id + '">Edit</button> <button type="button" class="icon-btn-sm" data-del-lec="' + l.id + '">Del</button>')
      : "";
    return "<tr><td>" + escapeHtml(l.name) + "</td><td>" + escapeHtml(l.staffId || "") + "</td><td>" +
      escapeHtml(formatLecturerAssignments(l)) + "</td><td>" + escapeHtml(formatLecturerSessions(l, allSessions)) + "</td><td>" + escapeHtml(String(ch)) + "</td><td>" +
      escapeHtml(l.phone || "") + "</td><td>" + escapeHtml(l.status || "Active") +
      "</td><td class=\"qa-edit-only\">" + actions + "</td></tr>";
  }).join("");
  tbody.querySelectorAll("[data-edit-lec]").forEach(function(btn) {
    btn.addEventListener("click", function() { openLecturerForm(btn.getAttribute("data-edit-lec")); });
  });
  tbody.querySelectorAll("[data-del-lec]").forEach(function(btn) {
    btn.addEventListener("click", function() { deleteLecturer(btn.getAttribute("data-del-lec")); });
  });
  var count = document.getElementById("lecturersCount");
  if (count) count.textContent = list.length + " lecturers";
}

function formatLecturerAssignments(l) {
  var rows = l.assignments || [];
  if (rows.length) {
    return rows.map(function(a) {
      var bits = [a.code || a.course].filter(Boolean);
      if (a.programme) bits.push(a.programme);
      if (a.level) bits.push("L" + a.level);
      return bits.join(" · ");
    }).join("; ");
  }
  return (l.courses || []).join(", ") || "—";
}

function collectLecturerAssignmentsFromForm() {
  var wrap = document.getElementById("lecturerAssignRows");
  if (!wrap) return [];
  var rows = [];
  wrap.querySelectorAll(".lec-assign-row").forEach(function(row) {
    var code = (row.querySelector("[data-la=code]") && row.querySelector("[data-la=code]").value || "").trim();
    if (!code) return;
    rows.push({
      code: code,
      programme: (row.querySelector("[data-la=programme]") && row.querySelector("[data-la=programme]").value || "").trim(),
      level: (row.querySelector("[data-la=level]") && row.querySelector("[data-la=level]").value || "").trim(),
      hours: Number(row.querySelector("[data-la=hours]") && row.querySelector("[data-la=hours]").value) || null
    });
  });
  return rows;
}

async function addLecturerAssignRow(prefill) {
  prefill = prefill || {};
  var wrap = document.getElementById("lecturerAssignRows");
  if (!wrap) return;
  await loadActiveSession();
  var progs = (ACTIVE_SESSION && ACTIVE_SESSION.programmes) || [];
  try {
    var allP = await getAll("programmes");
    if (allP && allP.length) progs = allP.map(function(p) { return p.name || p.id; });
  } catch (_) {}
  var levels = (ACTIVE_SESSION && ACTIVE_SESSION.levels) || [];
  try {
    var allL = await getAll("levels");
    if (allL && allL.length) levels = allL.map(function(l) { return String(l.value != null ? l.value : l.name); });
  } catch (_) {}
  var progOpts = '<option value="">Programme</option>' + progs.map(function(p) {
    return '<option value="' + escapeHtml(p) + '"' + (prefill.programme === p ? " selected" : "") + ">" + escapeHtml(p) + "</option>";
  }).join("");
  var lvlOpts = '<option value="">Level</option>' + levels.map(function(l) {
    return '<option value="' + escapeHtml(String(l)) + '"' + (String(prefill.level) === String(l) ? " selected" : "") + ">" + escapeHtml(String(l)) + "</option>";
  }).join("");
  var div = document.createElement("div");
  div.className = "lec-assign-row";
  div.innerHTML =
    '<label class="field" style="margin:0"><span class="field__label">Course code</span><input type="text" data-la="code" placeholder="e.g. NUS 121" value="' + escapeHtml(prefill.code || prefill.course || "") + '" /></label>' +
    '<label class="field" style="margin:0"><span class="field__label">Programme</span><select data-la="programme">' + progOpts + '</select></label>' +
    '<label class="field" style="margin:0"><span class="field__label">Level</span><select data-la="level">' + lvlOpts + '</select></label>' +
    '<label class="field" style="margin:0"><span class="field__label">Hrs</span><input type="number" data-la="hours" min="0" step="0.5" value="' + (prefill.hours != null ? prefill.hours : "") + '" /></label>' +
    '<button type="button" class="icon-btn-sm lec-assign-del" title="Remove">×</button>';
  wrap.appendChild(div);
  div.querySelector(".lec-assign-del").addEventListener("click", function() { div.remove(); });
}

async function openLecturerForm(id) {
  if (!isQaOfficer()) { alert("Sign in as QA Officer to manage lecturers."); return; }
  document.getElementById("lecturerForm").reset();
  document.getElementById("lecturerId").value = id || "";
  document.getElementById("lecturerModalTitle").textContent = id ? "Edit lecturer" : "Add lecturer";
  var wrap = document.getElementById("lecturerAssignRows");
  if (wrap) wrap.innerHTML = "";
  if (!id) {
    document.getElementById("lecturerStaffId").value = await generateStaffId();
    await addLecturerAssignRow({});
    await renderLecturerSessionBox([], true);
  } else {
    await loadLecturers();
    var l = lecturersCache.find(function(x) { return x.id === id; });
    if (l) {
      document.getElementById("lecturerName").value = l.name || "";
      document.getElementById("lecturerStaffId").value = l.staffId || "";
      document.getElementById("lecturerPhone").value = l.phone || "";
      document.getElementById("lecturerContractHours").value = l.contractHoursPerSemester != null ? l.contractHoursPerSemester : "";
      document.getElementById("lecturerContractHours").placeholder = (l.contractHoursPerSemester == null && l.contractHoursPerMonth) ? ("Was " + l.contractHoursPerMonth + " h/month — enter hours per semester") : "";
      document.getElementById("lecturerStatus").value = l.status || "Active";
      var assigns = l.assignments && l.assignments.length ? l.assignments : (l.courses || []).map(function(c) { return { code: c }; });
      if (!assigns.length) assigns = [{}];
      for (var i = 0; i < assigns.length; i++) await addLecturerAssignRow(assigns[i]);
      var sessAll = await getAll("sessions");
      // legacy lecturer (no sessionIds) = all sessions, so pre-check them all
      await renderLecturerSessionBox((l.sessionIds && l.sessionIds.length) ? l.sessionIds : sessAll.map(function(s) { return s.id; }), false);
    }
  }
  document.getElementById("lecturerModal").hidden = false;
}
async function saveLecturer(e) {
  e.preventDefault();
  try { return await saveLecturerImpl(); }
  catch (err) { console.error("saveLecturer", err); alert("Could not save lecturer: " + (err && err.message ? err.message : err)); }
}
async function saveLecturerImpl() {
  if (!isQaOfficer()) return;
  var id = document.getElementById("lecturerId").value || null;
  var name = document.getElementById("lecturerName").value.trim();
  if (!name) return;
  var ref = "";
  if (id) {
    ref = prompt("Official REF for this lecturer change (required):", "REF/EOCNS/QA/");
    if (!ref || !String(ref).trim()) { alert("REF is required for edits."); return; }
    ref = String(ref).trim();
  }
  var assignments = collectLecturerAssignmentsFromForm();
  // use the catalogue's spelling of each code, and drop repeated rows
  await loadCoursesCache();
  var seenAssign = {};
  assignments = assignments.map(function(a) {
    var c = COURSES_CACHE.find(function(x) { return normCourseCode(x.code) === normCourseCode(a.code); });
    if (c) a.code = c.code;
    return a;
  }).filter(function(a) {
    var k = normCourseCode(a.code) + "|" + (a.programme || "") + "|" + (a.level || "");
    if (seenAssign[k]) return false;
    seenAssign[k] = true; return true;
  });
  var courses = assignments.map(function(a) { return a.code; }).filter(Boolean);
  // legacy field also kept for older views
  var legacy = (document.getElementById("lecturerCourses") && document.getElementById("lecturerCourses").value || "").split(",").map(function(c) { return c.trim(); }).filter(Boolean);
  if (!courses.length && legacy.length) courses = legacy;
  var sessionIds = Array.from(document.querySelectorAll('input[name="lecturerSession"]:checked')).map(function(el) { return el.value; });
  var contractRaw = document.getElementById("lecturerContractHours").value;
  var contractHours = contractRaw === "" ? null : Number(contractRaw);
  var now = new Date().toISOString();
  await loadLecturers();
  var staffId = document.getElementById("lecturerStaffId").value.trim() || await generateStaffId();
  var staffClash = lecturersCache.find(function(x) { return x.id !== id && normStaffId(x.staffId) === normStaffId(staffId); });
  if (staffClash) { alert("Staff ID " + staffId + " already belongs to " + staffClash.name + ". Staff IDs must be unique."); return; }
  var nameClash = lecturersCache.find(function(x) { return x.id !== id && normPersonName(x.name) === normPersonName(name); });
  if (nameClash) { alert("A lecturer named " + nameClash.name + " (" + (nameClash.staffId || "no staff ID") + ") is already registered. Lecture logs match lecturers by name, so add a middle name or initial to tell them apart."); return; }
  var prevLec = id ? lecturersCache.find(function(x) { return x.id === id; }) : null;
  var lec = {
    id: id || ("lec_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)),
    name: name,
    staffId: staffId,
    phone: document.getElementById("lecturerPhone").value.trim(),
    courses: courses,
    assignments: assignments,
    sessionIds: sessionIds,
    contractHoursPerSemester: contractHours,
    status: document.getElementById("lecturerStatus").value || "Active",
    updatedAt: now
  };
  if (!id) lec.createdAt = now;
  else {
    var prev = prevLec;
    if (prev && prev.createdAt) lec.createdAt = prev.createdAt;
    // keep an old monthly figure only until a per-semester figure is entered
    if (contractHours == null && prev && prev.contractHoursPerMonth) lec.contractHoursPerMonth = prev.contractHoursPerMonth;
  }
  await put("lecturers", lec);
  await writeAudit({
    action: id ? "update" : "create",
    entity: "lecturers",
    entityId: lec.id,
    externalRef: ref || undefined,
    reason: id ? ("Lecturer updated · " + assignments.length + " course assignment(s)") : "Lecturer created",
    details: { name: name, contractHoursPerSemester: contractHours, courses: courses, assignments: assignments, sessionIds: sessionIds }
  });
  markDirty("lecturers");
  document.getElementById("lecturerModal").hidden = true;
  await renderLecturersTable();
  refreshDashboardStats();
}
async function deleteLecturer(id) {
  if (!isQaOfficer()) return;
  if (!confirm("Remove this lecturer from the register?")) return;
  await del("lecturers", id);
  await writeAudit({ action: "delete", entity: "lecturers", entityId: id, reason: "Lecturer removed" });
  markDirty("lecturers");
  await renderLecturersTable();
  refreshDashboardStats();
}

async function fillProgrammeLevelSelects() {
  PROGRAMMES_CACHE = await getAll("programmes");
  LEVELS_CACHE = await getAll("levels");
  var progOpts = PROGRAMMES_CACHE.map(function(p) {
    return '<option value="' + escapeHtml(p.name) + '">' + escapeHtml(p.name) + "</option>";
  }).join("");
  var lvlOpts = LEVELS_CACHE.map(function(l) {
    var v = l.value != null ? l.value : l.name;
    return '<option value="' + escapeHtml(String(v)) + '">' + escapeHtml(l.name) + "</option>";
  }).join("");
  ["studentProgramme", "filterProgramme", "bulkProgramme", "attProgramme"].forEach(function(id) {
    var el = document.getElementById(id);
    if (!el) return;
    var cur = el.value;
    var first = el.options[0] ? el.options[0].outerHTML : '<option value="">—</option>';
    el.innerHTML = first + progOpts;
    if (cur) el.value = cur;
  });
  ["studentLevel", "filterLevel", "bulkLevel", "attLevel"].forEach(function(id) {
    var el = document.getElementById(id);
    if (!el) return;
    var cur = el.value;
    var first = el.options[0] ? el.options[0].outerHTML : '<option value="">—</option>';
    el.innerHTML = first + lvlOpts;
    if (cur) el.value = cur;
  });
}
function renderSessionChipBoxes(selectedProgrammes, selectedLevels) {
  selectedProgrammes = selectedProgrammes || [];
  selectedLevels = selectedLevels || [];
  var pbox = document.getElementById("sessionProgrammesBox");
  var lbox = document.getElementById("sessionLevelsBox");
  if (pbox) {
    pbox.innerHTML = PROGRAMMES_CACHE.map(function(p) {
      var checked = selectedProgrammes.indexOf(p.name) >= 0 ? " checked" : "";
      return '<label class="chip"><input type="checkbox" name="sessionProgramme" value="' + escapeHtml(p.name) + '"' + checked + "> " + escapeHtml(p.name) + "</label>";
    }).join(" ") || '<span class="muted-note">No programmes yet — add one below.</span>';
  }
  if (lbox) {
    lbox.innerHTML = LEVELS_CACHE.map(function(l) {
      var v = String(l.value != null ? l.value : l.name);
      var checked = selectedLevels.map(String).indexOf(v) >= 0 || selectedLevels.indexOf(l.name) >= 0 ? " checked" : "";
      return '<label class="chip"><input type="checkbox" name="sessionLevel" value="' + escapeHtml(v) + '"' + checked + "> " + escapeHtml(l.name) + "</label>";
    }).join(" ") || '<span class="muted-note">No levels yet — add one below.</span>';
  }
}

async function renderSessionsList() {
  const sessions = await getAll("sessions");
  const sessLecturers = await getAll("lecturers");
  const container = document.getElementById("sessionsList");
  const empty = document.getElementById("sessionsEmpty");
  const countEl = document.getElementById("sessionsCount");
  if (countEl) countEl.textContent = sessions.length + " session" + (sessions.length !== 1 ? "s" : "");
  if (!sessions.length) { if (container) container.innerHTML = ""; if (empty) empty.hidden = false; return; }
  if (empty) empty.hidden = true;
  if (container) {
    container.innerHTML = sessions.map(function(s) {
      var actions = isQaOfficer()
        ? ('<div style="margin-top:8px" class="qa-edit-only"><button type="button" class="btn btn--ghost btn--sm" data-edit-sess="' + s.id + '">Edit</button> <button type="button" class="btn btn--ghost btn--sm" data-del-sess="' + s.id + '">Delete</button></div>')
        : "";
      return "<div class=\"card\" style=\"margin-bottom:12px\"><div class=\"card__body\"><strong>" + escapeHtml(s.name) +
        "</strong> <span class=\"badge " + (s.status === "Active" ? "badge--green" : "badge--muted") + "\">" + escapeHtml(s.status || "") + "</span>" +
        "<div class=\"cell-sub\">" + escapeHtml((s.programmes || []).join(", ") || "—") + " · Levels: " + escapeHtml((s.levels || []).join(", ") || "—") +
        (s.startDate ? " · Started " + escapeHtml(s.startDate) : "") + "</div>" +
        "<div class=\"cell-sub\">Semesters: " + escapeHtml(sessionSemesters(s).map(function(x) { return x.name + ((x.startDate || x.endDate) ? " (" + (x.startDate || "?") + " → " + (x.endDate || "?") + ")" : ""); }).join(" · ")) + "</div>" +
        "<div class=\"cell-sub\">Lecturers: " + escapeHtml(sessLecturers.filter(function(l) { return lecturerInSession(l, s.id); }).map(function(l) { return l.name; }).join(", ") || "—") + "</div>" + actions + "</div></div>";
    }).join("");
    container.querySelectorAll("[data-edit-sess]").forEach(function(btn) {
      btn.addEventListener("click", function() { openSessionForm(btn.getAttribute("data-edit-sess")); });
    });
    container.querySelectorAll("[data-del-sess]").forEach(function(btn) {
      btn.addEventListener("click", function() { deleteSession(btn.getAttribute("data-del-sess")); });
    });
  }
}
async function openSessionForm(id) {
  if (!isQaOfficer()) { alert("Sign in as QA Officer to manage sessions."); return; }
  PROGRAMMES_CACHE = await getAll("programmes");
  LEVELS_CACHE = await getAll("levels");
  document.getElementById("sessionForm").reset();
  document.getElementById("sessionId").value = id || "";
  var selectedP = [], selectedL = [];
  if (id) {
    var sessions = await getAll("sessions");
    var s = sessions.find(function(x) { return x.id === id; });
    if (s) {
      document.getElementById("sessionModalTitle").textContent = "Edit Session";
      document.getElementById("sessionName").value = s.name || "";
      document.getElementById("sessionStart").value = s.startDate || "";
      document.getElementById("sessionStatus").value = s.status || "Active";
      selectedP = s.programmes || [];
      selectedL = s.levels || [];
      fillSessionSemesterRows(sessionSemesters(s));
    }
  } else {
    document.getElementById("sessionModalTitle").textContent = "New Academic Session";
    fillSessionSemesterRows(null);
  }
  renderSessionChipBoxes(selectedP, selectedL);
  document.getElementById("sessionModal").hidden = false;
  document.getElementById("sessionName").focus();
}
async function saveSession(e) {
  e.preventDefault();
  if (!isQaOfficer()) return;
  var name = document.getElementById("sessionName").value.trim();
  if (!name) { alert("Session name is required"); return; }
  var startDate = document.getElementById("sessionStart").value || "";
  var status = document.getElementById("sessionStatus").value || "Active";
  var programmes = Array.from(document.querySelectorAll('input[name="sessionProgramme"]:checked')).map(function(el) { return el.value; });
  var levels = Array.from(document.querySelectorAll('input[name="sessionLevel"]:checked')).map(function(el) { return el.value; });
  var now = new Date().toISOString();
  var id = document.getElementById("sessionId").value;
  var semesters = collectSessionSemesters(id || "sess_pending");
  var semErr = validateSessionSemesters(semesters);
  if (semErr) { alert(semErr); return; }
  if (id) {
    // do not orphan logged records by deleting a semester that already has data
    var oldSess = (await getAll("sessions")).find(function(x) { return x.id === id; });
    var keepIds = {}; semesters.forEach(function(s) { keepIds[s.id] = true; });
    var dropped = sessionSemesters(oldSess).filter(function(s) { return !keepIds[s.id]; });
    if (dropped.length) {
      var used = (await getAll("qa_entries")).filter(function(en) { return dropped.some(function(s) { return semesterIdOfRecord(en) === s.id; }); });
      if (used.length) { alert("Cannot remove \"" + dropped[0].name + "\": " + used.length + " logged lecture(s) belong to it."); return; }
    }
  }
  var sess;
  if (id) {
    var all = await getAll("sessions");
    sess = all.find(function(x) { return x.id === id; }) || { id: id };
    sess = Object.assign({}, sess, { name: name, startDate: startDate, status: status, programmes: programmes, levels: levels, semesters: semesters, updatedAt: now });
    // drop endDate if present
    delete sess.endDate;
    await writeAudit({ action: "update", entity: "sessions", entityId: id, reason: "Session updated", details: { name: name } });
  } else {
    var newId = generateId("sess");
    semesters.forEach(function(s) { if (/^sess_pending_s/.test(s.id)) s.id = s.id.replace("sess_pending", newId); });
    sess = { id: newId, name: name, startDate: startDate, status: status, programmes: programmes, levels: levels, semesters: semesters, createdAt: now, updatedAt: now };
    await writeAudit({ action: "create", entity: "sessions", entityId: sess.id, reason: "New academic session", details: { name: name } });
  }
  await put("sessions", sess);
  // Session roster is derived from master students by programme/level — no duplicate table
  try {
    var prevActive = ACTIVE_SESSION;
    ACTIVE_SESSION = sess;
    var roster = await studentsForActiveSession();
    ACTIVE_SESSION = prevActive;
    await writeAudit({ action: id ? "update" : "create", entity: "sessions", entityId: sess.id, reason: "Session saved · " + roster.length + " master students match programmes/levels", details: { programmes: programmes, levels: levels, rosterCount: roster.length } });
  } catch (_) {}
  document.getElementById("sessionModal").hidden = true;
  markDirty("session");
  if (sess.status === "Active") {
    try { localStorage.setItem(ACTIVE_SESSION_KEY, sess.id); } catch (_) {}
  }
  await refreshSessionChrome();
  await renderSessionsList();
  refreshDashboardStats();
  alert("Session saved. Master list students matching these programmes/levels are in scope (" + (ACTIVE_SESSION && ACTIVE_SESSION.id === sess.id ? (await studentsForActiveSession()).length + " students" : "select this session in the top bar") + ").");
}
async function deleteSession(id) {
  if (!isQaOfficer()) return;
  if (!confirm("Delete this session?")) return;
  await del("sessions", id);
  await writeAudit({ action: "delete", entity: "sessions", entityId: id, reason: "Session deleted" });
  await renderSessionsList();
  refreshDashboardStats();
}
async function renderAuditLog() {
  var denied = document.getElementById("auditDeniedCard");
  var officer = document.getElementById("auditOfficerCard");
  if (!isQaOfficer()) {
    if (denied) denied.hidden = false;
    if (officer) officer.hidden = true;
    return;
  }
  if (denied) denied.hidden = true;
  if (officer) officer.hidden = false;
  var list = await getAll("audit");
  list = (list || []).slice();
  list.sort(function(a, b) {
    return String(b.timestamp || b.at || b.createdAt || "").localeCompare(String(a.timestamp || a.at || a.createdAt || ""));
  });
  var fromD = (document.getElementById("auditFilterFrom") && document.getElementById("auditFilterFrom").value) || "";
  var toD = (document.getElementById("auditFilterTo") && document.getElementById("auditFilterTo").value) || "";
  var ent = (document.getElementById("auditFilterEntity") && document.getElementById("auditFilterEntity").value) || "";
  var act = (document.getElementById("auditFilterAction") && document.getElementById("auditFilterAction").value) || "";
  var whoQ = (document.getElementById("auditFilterOfficer") && document.getElementById("auditFilterOfficer").value || "").toLowerCase().trim();
  var q = (document.getElementById("auditFilterSearch") && document.getElementById("auditFilterSearch").value || "").toLowerCase().trim();
  var filtered = list.filter(function(a) {
    if (!a) return false;
    var iso = String(a.timestamp || a.at || a.createdAt || "");
    var day = iso.slice(0, 10);
    if (fromD && day && day < fromD) return false;
    if (toD && day && day > toD) return false;
    if (fromD && !day) return false;
    if (ent && String(a.entity || "") !== ent && String(a.entity || "").indexOf(ent) !== 0) return false;
    if (act && String(a.action || "").toLowerCase() !== act.toLowerCase()) return false;
    if (whoQ) {
      var who = String(a.officer || a.user || "").toLowerCase();
      if (who.indexOf(whoQ) < 0) return false;
    }
    if (q) {
      var blob = (String(a.reason || "") + " " + String(a.ref || "") + " " + String(a.entityId || "") + " " + String(a.entity || "") + " " + JSON.stringify(a.details || {})).toLowerCase();
      if (blob.indexOf(q) < 0) return false;
    }
    return true;
  });
  var summary = document.getElementById("auditFilterSummary");
  if (summary) {
    summary.textContent = "Showing " + filtered.length + " of " + list.length + " audit entries" +
      (fromD || toD ? (" · dates " + (fromD || "…") + " → " + (toD || "…")) : "") +
      (ent ? (" · entity " + ent) : "") +
      (act ? (" · action " + act) : "") + ".";
  }
  var el = document.getElementById("auditList");
  if (!el) return;
  if (!filtered.length) {
    el.innerHTML = "<p class=\"muted-note\">No audit entries match these filters.</p>";
    return;
  }
  el.innerHTML = "<div style=\"overflow-x:auto\"><table class=\"data-table\"><thead><tr><th>When (exact)</th><th>Action</th><th>Entity</th><th>Reason / REF</th><th>Who (officer)</th></tr></thead><tbody>" +
    filtered.slice(0, 500).map(function(a) {
      var when = a.whenLocal || "";
      if (!when) {
        var iso = a.timestamp || a.at || a.createdAt || "";
        if (iso) {
          try {
            when = new Date(iso).toLocaleString("en-GB", {
              weekday: "short", year: "numeric", month: "short", day: "2-digit",
              hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false
            });
          } catch (_) { when = String(iso).replace("T", " ").slice(0, 19); }
        } else when = "—";
      }
      var who = a.officer || a.user || "—";
      var reason = (a.reason || "—") + (a.ref ? (" · " + a.ref) : "");
      return "<tr><td style=\"white-space:nowrap\">" + escapeHtml(when) +
        "</td><td>" + escapeHtml(a.action || "") +
        "</td><td>" + escapeHtml((a.entity || "") + (a.entityId ? (" · " + a.entityId) : "")) +
        "</td><td>" + escapeHtml(reason) +
        "</td><td>" + escapeHtml(who) + "</td></tr>";
    }).join("") + "</tbody></table></div>";
}

async function refreshDashboardStats() {
  try {
    var students = await getAll("students");
    var lecturers = await getAll("lecturers");
    var sessions = await getAll("sessions");
    var qa = await getAll("qa_entries");
    var att = await getAll("attendance");
    var courses = await getAll("courses");
    var activeStudents = students.filter(function(s) { return !s.status || s.status === "Active"; }).length;
    var activeSessions = sessions.filter(function(s) { return s.status === "Active"; }).length;
    var set = function(id, n) {
      var el = document.getElementById(id);
      if (el) el.textContent = String(n);
    };
    set("statStudents", activeStudents);
    set("statLecturers", lecturers.length);
    set("statSessions", activeSessions);
    set("statQaLogs", qa.length);
    set("statAttendance", att.length);
    set("statCourses", courses.length);
    set("statHostels", "2");
    // status items
    var statusBox = document.querySelector(".status-list") || document.getElementById("dashboardStatus");
    // hero status line if present
    var sessLabel = document.getElementById("dashActiveSession");
    if (sessLabel) {
      var a = sessions.find(function(s) { return s.status === "Active"; });
      sessLabel.textContent = a ? a.name : "No active session";
    }
  } catch (e) {
    console.warn("dashboard stats", e);
  }
}


// =========================================================
// OFFICIAL STUDENT SEED (college registers)
// =========================================================
let OFFICIAL_STUDENTS = [];
async function loadOfficialStudentsSeed() {
  if (OFFICIAL_STUDENTS.length) return OFFICIAL_STUDENTS;
  try {
    const res = await fetch("data/students.json?v=8");
    if (!res.ok) throw new Error("HTTP " + res.status);
    OFFICIAL_STUDENTS = await res.json();
  } catch (e) {
    console.warn("Could not load data/students.json", e);
    OFFICIAL_STUDENTS = [];
  }
  return OFFICIAL_STUDENTS;
}

async function seedOfficialStudents() {
  if (!db) { alert("Database not ready yet."); return; }
  await loadOfficialStudentsSeed();
  if (!OFFICIAL_STUDENTS.length) {
    alert("Could not load the official student list. Check that data/students.json is on the site.");
    return;
  }
  const existing = await getAll("students");
  if (existing.length > 0) {
    const ok = confirm(
      "There are already " + existing.length + " students.\\n\\n" +
      "Loading the official list will ADD any missing names (existing records stay).\\n\\nContinue?"
    );
    if (!ok) return;
  }
  const byReg = new Set(existing.map(s => (s.regNo || "").toUpperCase()));
  const byName = new Set(existing.map(s => (s.name || "").toLowerCase().trim()));
  let added = 0;
  const now = new Date().toISOString();
  for (const s of OFFICIAL_STUDENTS) {
    const reg = (s.regNo || "").toUpperCase();
    const nameKey = (s.name || "").toLowerCase().trim();
    if (byReg.has(reg) || byName.has(nameKey)) continue;
    const student = {
      id: "stu_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      name: s.name,
      regNo: s.regNo,
      programme: normalizeProgramme(s.programme),
      level: String(s.level),
      gender: "",
      hostel: "",
      status: "Active",
      phone: "",
      serial: s.serial,
      createdAt: now,
      updatedAt: now,
    };
    await put("students", student);
    byReg.add(reg);
    byName.add(nameKey);
    added++;
  }
  if (added > 0) {
    await writeAudit({
      action: "create",
      entity: "students",
      entityId: "bulk-seed",
      reason: "Loaded official class list (" + added + " new records)",
      details: { added },
    });
  }
  alert(added === 0
    ? "All official students are already in the database."
    : "Added " + added + " students from the official registers.");
  await renderStudentsTable();
  refreshDashboardStats();
}

// =========================================================
// HOSTEL MODULE — gate log → boarding fee absentees report
// =========================================================
let hostelParsedRows = null;

function initHostelView() {
  const startEl = document.getElementById("hostelStartDate");
  const endEl = document.getElementById("hostelEndDate");
  if (startEl && !startEl.value) {
    const today = new Date();
    const first = new Date(today.getFullYear(), today.getMonth(), 1);
    startEl.value = toInputDateHostel(first);
    endEl.value = toInputDateHostel(today);
  }
}

function toInputDateHostel(d) {
  const pad = n => String(n).padStart(2, "0");
  return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
}

function setHostelStatus(msg, kind) {
  const el = document.getElementById("hostelStatus");
  if (!el) return;
  el.textContent = msg || "";
  el.style.color = kind === "err" ? "#b91c1c" : kind === "ok" ? "#047857" : "";
}

function showHostelFileCheck(msg, kind) {
  const el = document.getElementById("hostelFileCheck");
  if (!el) return;
  el.hidden = !msg;
  el.textContent = msg || "";
  el.style.color = kind === "err" ? "#b91c1c" : "#047857";
}

function handleHostelFile(file) {
  setHostelStatus("", "");
  const results = document.getElementById("hostelResults");
  if (results) results.hidden = true;
  showHostelFileCheck("Reading the file…", "ok");
  const reader = new FileReader();
  reader.onerror = () => showHostelFileCheck("Could not open that file.", "err");
  reader.onload = (e) => {
    try {
      if (typeof XLSX === "undefined") {
        showHostelFileCheck("Excel library failed to load. Refresh the page.", "err");
        return;
      }
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array", cellDates: true });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: true });
      const validation = validateHostelHeaders(rows);
      if (!validation.ok) {
        hostelParsedRows = null;
        showHostelFileCheck(validation.message, "err");
        return;
      }
      hostelParsedRows = rows;
      const count = countHostelStudents(rows, validation.headerIndex);
      showHostelFileCheck('Ready — "' + file.name + '". About ' + count + " students found. Building editable preview…", "ok");
      try { previewHostelFromGate(); } catch (pe) { console.warn("auto preview", pe); }
    } catch (err) {
      console.error(err);
      hostelParsedRows = null;
      showHostelFileCheck("Could not read that file. Use the original gate export.", "err");
    }
  };
  reader.readAsArrayBuffer(file);
}

function validateHostelHeaders(rows) {
  const required = ["Department", "Name", "No.", "Date/Time", "Status", "Location ID"];
  if (!rows.length) return { ok: false, message: "That file looks empty." };
  const headerIndex = {};
  rows[0].forEach((v, i) => {
    const k = String(v).trim();
    if (k) headerIndex[k] = i;
  });
  const missing = required.filter(c => !(c in headerIndex));
  if (missing.length) {
    return {
      ok: false,
      message: "Missing columns: " + missing.map(m => '"' + m + '"').join(", ") + ". Upload the original gate export.",
    };
  }
  return { ok: true, headerIndex };
}

function countHostelStudents(rows, headerIndex) {
  const nameCol = headerIndex["Name"];
  const noCol = headerIndex["No."];
  const seen = new Set();
  for (let r = 1; r < rows.length; r++) {
    const name = rows[r][nameCol];
    const no = rows[r][noCol];
    if (name && no !== "") seen.add(String(no).trim());
  }
  return seen.size;
}

function parseInputDateHostel(value) {
  if (!value) return null;
  const parts = value.split("-").map(Number);
  if (parts.length < 3) return null;
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function dateOnlyHostel(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function toDateKeyHostel(d) {
  const pad = n => String(n).padStart(2, "0");
  return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
}

function normalizeStudentIdHostel(raw) {
  if (typeof raw === "number") return Number.isInteger(raw) ? String(raw) : String(raw);
  return String(raw).trim();
}

function parseAttendanceDateHostel(raw) {
  if (raw instanceof Date && !isNaN(raw)) return dateOnlyHostel(raw);
  if (typeof raw === "number") {
    const parsed = XLSX.SSF ? XLSX.SSF.parse_date_code(raw) : null;
    if (parsed) return dateOnlyHostel(new Date(parsed.y, parsed.m - 1, parsed.d));
    return null;
  }
  const text = String(raw).trim();
  if (!text) return null;
  const m = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})[, ]+(\d{1,2}):(\d{2}):(\d{2})\s*(AM|PM)?$/i);
  if (m) return dateOnlyHostel(new Date(Number(m[3]), Number(m[1]) - 1, Number(m[2])));
  const generic = new Date(text);
  if (!isNaN(generic)) return dateOnlyHostel(generic);
  return null;
}

/** Map ZKTeco Location ID cell → 1, 2, or null. */
function parseHostelLocationId(raw) {
  if (raw === "" || raw == null) return null;
  if (typeof raw === "number" && isFinite(raw)) {
    var n = Math.round(raw);
    if (n === 1 || n === 2) return n;
  }
  var t = String(raw).trim();
  if (!t) return null;
  if (/^1$/.test(t) || /^0*1$/.test(t)) return 1;
  if (/^2$/.test(t) || /^0*2$/.test(t)) return 2;
  // Common export variants: "Location 1", "H1", "Hostel 1", device codes ending in 1/2
  var m = t.match(/(?:^|[^0-9])([12])(?:[^0-9]|$)/);
  if (m) return Number(m[1]);
  var low = t.toLowerCase();
  if (low.indexOf("hostel 1") >= 0 || low.indexOf("hostel1") >= 0 || /\bh1\b/.test(low)) return 1;
  if (low.indexOf("hostel 2") >= 0 || low.indexOf("hostel2") >= 0 || /\bh2\b/.test(low)) return 2;
  return null;
}

/**
 * Hostel resolution for a period:
 * 1) Majority Location ID on C/IN punches in range (1 → hostel1Name, 2 → hostel2Name)
 * 2) Else student master list hostel
 * 3) Else Unassigned
 * Master list is still used for name/reg matching. Conflicts (machine vs master) are flagged.
 */
async function computeHostelAttendance(rows, startDate, endDate, hostel1Name, hostel2Name) {
  const headerIndex = {};
  rows[0].forEach((v, i) => {
    const k = String(v).trim();
    if (k) headerIndex[k] = i;
  });
  const nameCol = headerIndex["Name"];
  const noCol = headerIndex["No."];
  const dateCol = headerIndex["Date/Time"];
  const statusCol = headerIndex["Status"];
  const locCol = headerIndex["Location ID"];
  const h1 = hostel1Name || "Hostel 1";
  const h2 = hostel2Name || "Hostel 2";
  const master = await getAll("students");
  function normName(n) {
    return String(n || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  }
  const byNo = {};
  const byName = {};
  var byAlias = {};
  master.forEach(function(s) {
    if (s.serial) byNo[String(s.serial).trim()] = s;
    if (s.regNo) byNo[String(s.regNo).trim().toUpperCase()] = s;
    const nn = normName(s.name);
    if (nn) byName[nn] = s;
    (s.bioAliases || []).forEach(function(a) {
      var an = normName(a);
      if (an) byAlias[an] = s;
    });
  });
  function resolveMaster(name, studentId) {
    if (studentId && byNo[String(studentId).trim()]) return byNo[String(studentId).trim()];
    if (studentId && byNo[String(studentId).trim().toUpperCase()]) return byNo[String(studentId).trim().toUpperCase()];
    const nn = normName(name);
    if (nn && byName[nn]) return byName[nn];
    // alias from biometric import (machine spelling → site student)
    if (nn && byAlias && byAlias[nn]) return byAlias[nn];
    return null;
  }
  const students = {};
  const attendance = {};
  const locVotes = {}; // studentId -> { "1": n, "2": n }
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const rawName = row[nameCol];
    const studentIdRaw = row[noCol];
    if (!rawName || studentIdRaw === "" || studentIdRaw == null) continue;
    const name = String(rawName).trim();
    const studentId = normalizeStudentIdHostel(studentIdRaw);
    const masterStu = resolveMaster(name, studentId);
    if (!(studentId in students)) {
      students[studentId] = {
        name: masterStu ? masterStu.name : name,
        hostel: "Unassigned",
        hostelSource: "pending",
        regNo: masterStu ? (masterStu.regNo || "") : "",
        programme: masterStu ? (masterStu.programme || "") : "",
        level: masterStu ? (masterStu.level || "") : "",
        masterId: masterStu ? masterStu.id : null,
        masterHostel: masterStu && masterStu.hostel ? String(masterStu.hostel).trim() : "",
        matched: !!masterStu,
        locationIdMajority: null,
        locationVotes: { "1": 0, "2": 0 },
        hostelConflict: false
      };
      attendance[studentId] = new Set();
      locVotes[studentId] = { "1": 0, "2": 0 };
    }
    const rawDate = row[dateCol];
    if (rawDate === "" || rawDate == null) continue;
    const attendanceDate = parseAttendanceDateHostel(rawDate);
    if (!attendanceDate) continue;
    if (attendanceDate < startDate || attendanceDate > endDate) continue;
    const status = String(row[statusCol] || "").trim().toUpperCase();
    if (status === "C/IN") {
      attendance[studentId].add(toDateKeyHostel(attendanceDate));
      if (locCol != null) {
        var lid = parseHostelLocationId(row[locCol]);
        if (lid === 1 || lid === 2) locVotes[studentId][String(lid)]++;
      }
    }
  }
  function hostelIsBlank(h) {
    var t = String(h || "").trim().toLowerCase();
    if (!t) return true;
    if (t === "—" || t === "-" || t === "n/a" || t === "na") return true;
    if (t.indexOf("unassigned") >= 0) return true;
    if (t === "none" || t === "null" || t === "undefined") return true;
    return false;
  }

  // Master registry is authoritative. Location ID is diagnostic only.
  var autoHostelAssigned = 0;
  var sidsResolve = Object.keys(students);
  for (var ri = 0; ri < sidsResolve.length; ri++) {
    var sid = sidsResolve[ri], st = students[sid], v = locVotes[sid] || { "1": 0, "2": 0 };
    st.locationVotes = { "1": v["1"], "2": v["2"] };
    var maj = v["1"] > v["2"] ? 1 : (v["2"] > v["1"] ? 2 : null);
    st.locationIdMajority = maj;
    st.gateHostel = maj === 1 ? h1 : (maj === 2 ? h2 : "");
    st.hostel = st.masterHostel && !hostelIsBlank(st.masterHostel) ? st.masterHostel : "Unassigned";
    st.hostelSource = st.masterHostel && !hostelIsBlank(st.masterHostel) ? "master_list" : "unassigned";
    st.hostelConflict = !!(st.gateHostel && st.masterHostel && !hostelIsBlank(st.masterHostel) && st.gateHostel !== st.masterHostel);
  }

  // Record mismatches for investigation, but do not suppress linked students.
  try {
    var existingConf = await getAll("biometric_pending"), confKeys = {};
    (existingConf || []).forEach(function(q) {
      if (q && q.status === "hostel_conflict" && q.machineNo) confKeys[String(q.machineNo).trim()] = true;
    });
    for (var ci = 0; ci < sidsResolve.length; ci++) {
      var csid = sidsResolve[ci], cst = students[csid];
      if (!cst || !cst.hostelConflict || confKeys[String(csid).trim()]) continue;
      await put("biometric_pending", {
        id: "hconf_" + Date.now().toString(36) + "_" + ci, kind: "hostel_conflict", status: "hostel_conflict",
        machineNo: String(csid).trim(), machineName: cst.name || "", studentName: cst.name || "",
        studentId: cst.masterId || null, regNo: cst.regNo || "", masterHostel: cst.masterHostel || "",
        gateHostel: cst.gateHostel || "", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
      });
    }
  } catch (e) { console.warn("hostel conflict queue", e); }

  // Only unmatched identities are excluded; conflict queue entries never exclude master-linked students.
  var pendingNos = {};
  try {
    var qlist = await getAll("biometric_pending");
    (qlist || []).forEach(function(q) {
      if (!q || q.status === "linked" || q.status === "hostel_conflict") return;
      if (q.machineNo != null && String(q.machineNo).trim()) pendingNos[String(q.machineNo).trim()] = true;
    });
  } catch (_) {}
  var excludedPending = [];
  Object.keys(students).forEach(function(sid) {
    var st = students[sid], key = String(sid).trim();
    var linked = !!(st && st.matched && st.masterId);
    if (byNo[key]) linked = true;
    if (st && st.regNo && byNo[String(st.regNo).trim().toUpperCase()]) linked = true;
    if (pendingNos[key] && !(st && st.matched && st.masterId)) linked = false;
    if (!linked) {
      excludedPending.push({ machineNo:key, name:(st && st.name)||"", reason:pendingNos[key]?"awaiting officer identity review":"not linked to master list" });
      delete students[sid]; delete attendance[sid];
    }
  });



  const dates = [];
  const cursor = new Date(startDate);
  while (cursor <= endDate) {
    dates.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return {
    students: students,
    attendance: attendance,
    dates: dates,
    hostel1Name: h1,
    hostel2Name: h2,
    excludedPending: excludedPending,
    autoHostelAssigned: autoHostelAssigned || 0
  };
}

function ordinalSuffixHostel(n) {
  const v = n % 100;
  if (v >= 11 && v <= 13) return "th";
  switch (n % 10) {
    case 1: return "st";
    case 2: return "nd";
    case 3: return "rd";
    default: return "th";
  }
}

const MONTH_NAMES_HOSTEL = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function buildDayHeadersHostel(dates) {
  const months = new Set(dates.map(d => d.getMonth()));
  const spansMonths = months.size > 1;
  return dates.map(d => {
    const label = d.getDate() + ordinalSuffixHostel(d.getDate());
    return spansMonths ? label + " " + MONTH_NAMES_HOSTEL[d.getMonth()].slice(0, 3) : label;
  });
}

function buildAbsenteeRowsHostel(students, attendance, dates, rate) {
  const rows = [];
  Object.keys(students).forEach(function(id) {
    const meta = students[id], present = attendance[id] || new Set();
    const dayMarks = dates.map(function(d) { return present && present.has && present.has(toDateKeyHostel(d)) ? "P" : "A"; });
    const absentDays = dayMarks.filter(function(m) { return m === "A"; }).length;
    if (!absentDays) return;
    rows.push({ id:id, name:meta.name||"", hostel:meta.hostel||"", regNo:meta.regNo||"",
      programme:meta.programme||"", level:meta.level||"", dayMarks:dayMarks,
      absentDays:absentDays, fine:absentDays*rate });
  });
  rows.sort(function(a,b){return String(a.name||"").localeCompare(String(b.name||""));});
  return rows;
}

function formatNairaHostel(n) {
  return "₦" + Math.round(n).toLocaleString("en-NG");
}

function buildOutputBaseNameHostel(startDate, endDate) {
  const sameMonth = startDate.getMonth() === endDate.getMonth() && startDate.getFullYear() === endDate.getFullYear();
  const startLabel = (startDate.getDate() + ordinalSuffixHostel(startDate.getDate())).toUpperCase();
  const endLabel = (endDate.getDate() + ordinalSuffixHostel(endDate.getDate())).toUpperCase();
  if (sameMonth) {
    return "HOSTEL_ABSENTEES_" + startLabel + "_-_" + endLabel + "_" + MONTH_NAMES_HOSTEL[startDate.getMonth()].toUpperCase() + "_" + endDate.getFullYear();
  }
  return "HOSTEL_ABSENTEES_" + startLabel + "_" + MONTH_NAMES_HOSTEL[startDate.getMonth()].toUpperCase() + "_-_" + endLabel + "_" + MONTH_NAMES_HOSTEL[endDate.getMonth()].toUpperCase() + "_" + endDate.getFullYear();
}

function renderHostelPreview(absentees, dayHeaders, rate) {
  const table = document.getElementById("hostelPreviewTable");
  if (!table) return;
  window.__hostelPreviewRate = rate; window.__hostelPreviewDayHeaders = dayHeaders || [];
  const thead = table.querySelector("thead"), tbody = table.querySelector("tbody");
  thead.innerHTML = "<tr><th>Name</th><th>Hostel</th>" + (dayHeaders||[]).map(h=>"<th>"+escapeHtml(h)+"</th>").join("") + "<th>Days</th><th>Fine (₦)</th><th></th></tr>";
  tbody.innerHTML = (absentees||[]).map(function(r,idx) {
    var days = (r.dayMarks||[]).map(function(m,di) {
      var raw=String(m==null?"":m).trim().toUpperCase(), v=(raw==="A"||raw==="X")?"A":"P";
      return '<td style="text-align:center;padding:2px"><input data-hp-day="'+di+'" value="'+v+'" maxlength="1" title="P=present; A=absent" style="width:2rem;text-align:center;text-transform:uppercase;padding:4px" /></td>';
    }).join("");
    return '<tr data-hp-idx="'+idx+'" data-hp-student-id="'+escapeHtml(r.id||"")+'" data-hp-regno="'+escapeHtml(r.regNo||"")+'" data-hp-programme="'+escapeHtml(r.programme||"")+'" data-hp-level="'+escapeHtml(r.level||"")+'">' +
      '<td><input data-hp-name type="text" value="'+escapeHtml(r.name||"")+'" style="min-width:140px;width:100%" /></td>' +
      '<td><input data-hp-hostel type="text" value="'+escapeHtml(r.hostel||"")+'" style="min-width:90px;width:100%" /></td>'+days+
      '<td data-hp-days style="text-align:center">'+(Number(r.absentDays)||0)+'</td>' +
      '<td><input data-hp-fine type="number" min="0" step="500" value="'+(Number(r.fine)||0)+'" style="width:6rem" readonly /></td>' +
      '<td><button type="button" class="btn btn--ghost btn--sm" data-hp-remove="'+idx+'">Remove</button></td></tr>';
  }).join("");
  tbody.querySelectorAll("[data-hp-remove]").forEach(function(btn){btn.addEventListener("click",function(){var tr=btn.closest("tr");if(tr)tr.remove();recalculateHostelPreviewFromDom();});});
  tbody.querySelectorAll("[data-hp-day]").forEach(function(inp){inp.addEventListener("change",function(){var v=String(inp.value||"").trim().toUpperCase();inp.value=(v==="A"||v==="X")?"A":"P";recalculateHostelPreviewFromDom();});});
  var total=(absentees||[]).reduce(function(sum,r){return sum+(Number(r.absentDays)||0)*Number(rate||0);},0);
  var sum=document.getElementById("hostelSummary");
  if(sum)sum.textContent=(absentees||[]).length+" absentee row(s) · Rate ₦"+Number(rate||0).toLocaleString("en-NG")+"/day · Total fine "+formatNairaHostel(total)+" — P = present, A = absent. Fine is automatic.";
  document.getElementById("hostelResults").hidden=false;
}

/** Read editable preview table → absentee row objects */


function collectHostelPreviewFromDom() {
  var table=document.getElementById("hostelPreviewTable"); if(!table)return [];
  var rate=Number(window.__hostelPreviewRate)||Number((document.getElementById("hostelRate")&&document.getElementById("hostelRate").value)||0)||0;
  var rows=[];
  table.querySelectorAll("tbody tr").forEach(function(tr){
    var nameEl=tr.querySelector("[data-hp-name]"),hostEl=tr.querySelector("[data-hp-hostel]"),marks=[];
    tr.querySelectorAll("[data-hp-day]").forEach(function(inp){var v=String(inp.value==null?"":inp.value).trim().toUpperCase();marks.push(v==="A"||v==="X"?"A":"P");});
    var absent=marks.filter(function(m){return m==="A";}).length;
    rows.push({id:tr.getAttribute("data-hp-student-id")||"",name:nameEl?nameEl.value.trim():"",
      hostel:hostEl?hostEl.value.trim():"",regNo:tr.getAttribute("data-hp-regno")||"",
      programme:tr.getAttribute("data-hp-programme")||"",level:tr.getAttribute("data-hp-level")||"",
      dayMarks:marks,absentDays:absent,fine:absent*rate});
  });
  return rows;
}

function recalculateHostelPreviewFromDom() {
  var rate=Number((document.getElementById("hostelRate")&&document.getElementById("hostelRate").value)||window.__hostelPreviewRate||0)||0;
  window.__hostelPreviewRate=rate;
  var table=document.getElementById("hostelPreviewTable");if(!table)return [];
  var total=0,n=0;
  table.querySelectorAll("tbody tr").forEach(function(tr){
    n++;var absent=0;
    tr.querySelectorAll("[data-hp-day]").forEach(function(inp){var v=String(inp.value==null?"":inp.value).trim().toUpperCase();if(v==="A"||v==="X"){inp.value="A";absent++;}else inp.value="P";});
    var days=tr.querySelector("[data-hp-days]");if(days)days.textContent=String(absent);
    var fine=absent*rate,fe=tr.querySelector("[data-hp-fine]");if(fe)fe.value=String(fine);total+=fine;
  });
  var sum=document.getElementById("hostelSummary");
  if(sum)sum.textContent=n+" row(s) · Rate ₦"+rate.toLocaleString("en-NG")+"/day · Total fine "+formatNairaHostel(total)+" (calculated from A marks)";
  return collectHostelPreviewFromDom();
}

async function previewHostelFromGate() {
  if (!hostelParsedRows || !hostelParsedRows.length) {
    setHostelStatus("Upload a gate export first.", "error");
    return null;
  }
  if (!isQaOfficer()) {
    setHostelStatus("Sign in as QA Officer to preview and edit hostel data.", "error");
    return null;
  }
  var startDate = document.getElementById("hostelStartDate") && document.getElementById("hostelStartDate").value;
  var endDate = document.getElementById("hostelEndDate") && document.getElementById("hostelEndDate").value;
  var rate = Number(document.getElementById("hostelRate") && document.getElementById("hostelRate").value) || 0;
  var hostel1Name = (document.getElementById("hostel1Name") && document.getElementById("hostel1Name").value) || "Hostel 1";
  var hostel2Name = (document.getElementById("hostel2Name") && document.getElementById("hostel2Name").value) || "Hostel 2";
  if (!startDate || !endDate) {
    setHostelStatus("Set start and end dates for the period.", "error");
    return null;
  }
  setHostelStatus("Computing attendance from gate data…", "");
  try {
    var result = await computeHostelAttendance(hostelParsedRows, startDate, endDate, hostel1Name, hostel2Name);
    var dayHeaders = buildDayHeadersHostel(result.dates);
    var absentees = buildAbsenteeRowsHostel(result.students, result.attendance, result.dates, rate);
    // Include present-only students optionally? User asked edit absentees/names — keep absentees + allow add row
    renderHostelPreview(absentees, dayHeaders, rate);
    window.__lastHostelReport = {
      absentees: absentees,
      dayHeaders: dayHeaders,
      rate: rate,
      startDate: startDate,
      endDate: endDate,
      students: result.students,
      dates: result.dates,
      result: result
    };
    setHostelStatus("Preview ready — edit names, days (P/A), then Confirm & download.", "ok");
    return result;
  } catch (err) {
    console.error(err);
    setHostelStatus("Preview failed: " + (err.message || String(err)), "error");
    return null;
  }
}

function addHostelPreviewRow() {
  var table = document.getElementById("hostelPreviewTable");
  if (!table) return;
  var headers = window.__hostelPreviewDayHeaders || [];
  var tbody = table.querySelector("tbody");
  if (!tbody) return;
  var days = headers.map(function(_, di) {
    return '<td style="text-align:center;padding:2px"><input data-hp-day="' + di + '" value="P" maxlength="1" title="P=present; A=absent" style="width:2rem;text-align:center;text-transform:uppercase;padding:4px" /></td>';
  }).join("");
  var tr = document.createElement("tr");
  tr.innerHTML = '<td><input data-hp-name type="text" value="" placeholder="FULL NAME" style="min-width:140px;width:100%" /></td>' +
    '<td><input data-hp-hostel type="text" value="" placeholder="Hostel" style="min-width:90px;width:100%" /></td>' +
    days +
    '<td data-hp-days style="text-align:center">0</td>' +
    '<td><input data-hp-fine type="number" min="0" step="500" value="0" style="width:6rem" /></td>' +
    '<td><button type="button" class="btn btn--ghost btn--sm" data-hp-remove="x">Remove</button></td>';
  tbody.appendChild(tr);
  tr.querySelector("[data-hp-remove]").addEventListener("click", function() {
    tr.remove();
    recalculateHostelPreviewFromDom();
  });
}

function downloadHostelWorkbook(absentees, dayHeaders, filename) {
  const header = ["Name", "Hostel"].concat(dayHeaders).concat(["Days Absent", "Total Fine (₦)"]);
  const data = [header];
  absentees.forEach(r => {
    data.push([r.name, r.hostel].concat(r.dayMarks).concat([r.absentDays, r.fine]));
  });
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Hostel Absentees");
  XLSX.writeFile(wb, filename);
}


/** List saved hostel runs (master sheet) — newest first. */
async function renderHostelRunsMaster() {
  var body = document.getElementById("hostelRunsBody");
  var countEl = document.getElementById("hostelRunsCount");
  if (!body) return;
  var runs = [];
  try { runs = await getAll("hostel_runs"); } catch (_) { runs = []; }
  runs = (runs || []).slice().sort(function(a, b) {
    return String(b.createdAt || b.updatedAt || "").localeCompare(String(a.createdAt || a.updatedAt || ""));
  });
  if (countEl) countEl.textContent = runs.length + " run" + (runs.length === 1 ? "" : "s");
  if (!runs.length) {
    body.innerHTML = '<tr><td colspan="7" class="muted-note">No hostel runs saved yet. Generate a report from a gate export to create the first master record.</td></tr>';
    return;
  }
  body.innerHTML = runs.map(function(r) {
    var period = (r.start || "?") + " → " + (r.end || "?");
    var amendN = (r.amendments && r.amendments.length) || 0;
    return '<tr data-hr-id="' + escapeHtml(r.id) + '">' +
      '<td>' + escapeHtml(period) + '</td>' +
      '<td>' + escapeHtml(String(r.studentCount != null ? r.studentCount : (r.matrix ? r.matrix.length : "—"))) + '</td>' +
      '<td>' + escapeHtml(String(r.absenteeCount != null ? r.absenteeCount : (r.rows ? r.rows.length : "—"))) + '</td>' +
      '<td>₦' + Number(r.totalFine || 0).toLocaleString("en-NG") + '</td>' +
      '<td>' + escapeHtml((r.createdAt || "").slice(0, 16).replace("T", " ")) + '</td>' +
      '<td>' + (amendN ? (amendN + " edit(s)") : "—") + '</td>' +
      '<td class="qa-edit-only" style="white-space:nowrap">' +
        '<button type="button" class="btn btn--ghost btn--sm" data-hr-view="' + escapeHtml(r.id) + '">View</button> ' +
        '<button type="button" class="btn btn--ghost btn--sm" data-hr-edit="' + escapeHtml(r.id) + '">Edit</button>' +
      '</td></tr>';
  }).join("");
  body.querySelectorAll("[data-hr-view]").forEach(function(btn) {
    btn.addEventListener("click", function() { openHostelRunViewer(btn.getAttribute("data-hr-view"), false); });
  });
  body.querySelectorAll("[data-hr-edit]").forEach(function(btn) {
    btn.addEventListener("click", function() {
      if (!isQaOfficer()) { alert("Sign in as QA Officer to edit the hostel master sheet."); return; }
      openHostelRunViewer(btn.getAttribute("data-hr-edit"), true);
    });
  });
}

async function openHostelRunViewer(id, editable) {
  var runs = await getAll("hostel_runs");
  var run = (runs || []).find(function(r) { return r.id === id; });
  if (!run) { alert("Hostel run not found."); return; }
  window.__hostelEditRun = run;
  window.__hostelEditMode = !!editable;
  var modal = document.getElementById("hostelRunModal");
  var title = document.getElementById("hostelRunModalTitle");
  var meta = document.getElementById("hostelRunModalMeta");
  var tableWrap = document.getElementById("hostelRunModalTable");
  var amendBox = document.getElementById("hostelRunAmendBlock");
  if (title) title.textContent = (editable ? "Edit" : "View") + " hostel run · " + (run.start || "") + " → " + (run.end || "");
  if (meta) {
    meta.innerHTML = "<p class='muted-note' style='margin:0 0 8px'><strong>Rate:</strong> ₦" + Number(run.rate || 0).toLocaleString("en-NG") +
      "/day · <strong>Absentees:</strong> " + (run.absenteeCount || 0) +
      " · <strong>Total fine:</strong> ₦" + Number(run.totalFine || 0).toLocaleString("en-NG") +
      " · <strong>Students:</strong> " + (run.studentCount || (run.matrix && run.matrix.length) || "—") +
      "</p>";
  }
  var headers = run.dayHeaders || (run.dateKeys || []).map(function(k) { return k.slice(8); });
  var rowsSrc = (run.matrix && run.matrix.length) ? run.matrix : (run.rows || []);
  // Absentees-only fallback for older runs
  var show = rowsSrc;
  var head = "<tr><th>#</th><th>Name</th><th>Reg. No</th><th>Hostel</th>" +
    headers.map(function(h) { return "<th>" + escapeHtml(String(h)) + "</th>"; }).join("") +
    "<th>Days</th><th>Fine (₦)</th></tr>";
  var body = show.map(function(r, i) {
    var marks = r.dayMarks || [];
    var markCells = headers.map(function(_, di) {
      var rawMark = marks[di];
      var m = (String(rawMark == null ? "" : rawMark).trim().toUpperCase() === "A" || String(rawMark == null ? "" : rawMark).trim().toUpperCase() === "X") ? "A" : "P";
      if (editable) {
        return '<td><select data-hr-mark="' + i + ':' + di + '" class="hr-mark-sel">' +
          '<option value="P"' + (m === "P" ? " selected" : "") + '>P</option>' +
          '<option value="A"' + (m === "A" ? " selected" : "") + '>A</option>' +
          '</select></td>';
      }
      return "<td>" + escapeHtml(m) + "</td>";
    }).join("");
    return "<tr><td>" + (i + 1) + "</td><td>" + escapeHtml(r.name || "") + "</td><td>" + escapeHtml(r.regNo || "") +
      "</td><td>" + escapeHtml(r.hostel || "") + "</td>" + markCells +
      "<td data-hr-days='" + i + "'>" + (r.absentDays != null ? r.absentDays : "—") + "</td>" +
      "<td data-hr-fine='" + i + "'>" + Number(r.fine || 0).toLocaleString("en-NG") + "</td></tr>";
  }).join("");
  if (tableWrap) tableWrap.innerHTML = "<div style='overflow:auto;max-height:50vh'><table class='data-table' id='hostelRunEditTable'><thead>" + head + "</thead><tbody>" + body + "</tbody></table></div>";
  if (amendBox) {
    amendBox.hidden = !editable;
    var refEl = document.getElementById("hostelRunEditRef");
    var reasonEl = document.getElementById("hostelRunEditReason");
    if (refEl) refEl.value = "";
    if (reasonEl) reasonEl.value = "";
  }
  var hist = document.getElementById("hostelRunAmendmentsList");
  if (hist) {
    var am = run.amendments || [];
    hist.innerHTML = am.length ? am.map(function(a) {
      return "<li><strong>" + escapeHtml(a.ref || "") + "</strong> — " + escapeHtml(a.reason || "") +
        " <span class='muted-note'>(" + escapeHtml((a.at || "").slice(0, 16).replace("T", " ")) + (a.by ? " · " + escapeHtml(a.by) : "") + ")</span></li>";
    }).join("") : "<li class='muted-note'>No amendments yet.</li>";
  }
  var saveBtn = document.getElementById("btnSaveHostelRunEdit");
  if (saveBtn) saveBtn.hidden = !editable;
  if (modal) modal.hidden = false;

  if (editable && tableWrap) {
    tableWrap.querySelectorAll("select.hr-mark-sel").forEach(function(sel) {
      sel.addEventListener("change", function() {
        recalcHostelRunEditPreview();
      });
    });
  }
}

function recalcHostelRunEditPreview() {
  var run = window.__hostelEditRun;
  if (!run) return;
  var rate = Number(run.rate || 0);
  var table = document.getElementById("hostelRunEditTable");
  if (!table) return;
  var rowsSrc = (run.matrix && run.matrix.length) ? run.matrix : (run.rows || []);
  var nDays = (run.dayHeaders || run.dateKeys || []).length;
  rowsSrc.forEach(function(r, i) {
    var absent = 0;
    for (var di = 0; di < nDays; di++) {
      var sel = table.querySelector('select[data-hr-mark="' + i + ':' + di + '"]');
      var oldMark = (r.dayMarks || [])[di];
      var m = sel ? sel.value : ((String(oldMark == null ? "" : oldMark).trim().toUpperCase() === "A" || String(oldMark == null ? "" : oldMark).trim().toUpperCase() === "X") ? "A" : "P");
      if (m === "A") absent++;
    }
    var daysEl = table.querySelector('[data-hr-days="' + i + '"]');
    var fineEl = table.querySelector('[data-hr-fine="' + i + '"]');
    if (daysEl) daysEl.textContent = String(absent);
    if (fineEl) fineEl.textContent = (absent * rate).toLocaleString("en-NG");
  });
}

async function saveHostelRunEdit() {
  if (!isQaOfficer()) { alert("Sign in as QA Officer to edit."); return; }
  var run = window.__hostelEditRun;
  if (!run) return;
  var ref = (document.getElementById("hostelRunEditRef") && document.getElementById("hostelRunEditRef").value || "").trim();
  var reason = (document.getElementById("hostelRunEditReason") && document.getElementById("hostelRunEditReason").value || "").trim();
  if (!ref) { alert("Official REF is required to edit the hostel master sheet."); return; }
  if (!reason) { alert("Reason for change is required."); return; }
  var table = document.getElementById("hostelRunEditTable");
  var rate = Number(run.rate || 0);
  var nDays = (run.dayHeaders || run.dateKeys || []).length;
  var rowsSrc = (run.matrix && run.matrix.length) ? run.matrix : (run.rows || []);
  var changes = [];
  rowsSrc.forEach(function(r, i) {
    var marks = [];
    var absent = 0;
    for (var di = 0; di < nDays; di++) {
      var sel = table && table.querySelector('select[data-hr-mark="' + i + ':' + di + '"]');
      var oldPrev = (r.dayMarks || [])[di];
      var prev = (String(oldPrev == null ? "" : oldPrev).trim().toUpperCase() === "A" || String(oldPrev == null ? "" : oldPrev).trim().toUpperCase() === "X") ? "A" : "P";
      var m = sel ? sel.value : prev;
      marks.push(m);
      if (m === "A") absent++;
      if (sel && m !== prev) {
        changes.push({ student: r.name || r.regNo || ("#" + i), dayIndex: di, from: prev, to: m });
      }
    }
    r.dayMarks = marks;
    r.absentDays = absent;
    r.fine = absent * rate;
  });
  if (run.matrix && run.matrix.length) run.matrix = rowsSrc;
  // rebuild absentees rows
  run.rows = rowsSrc.filter(function(r) { return (r.absentDays || 0) > 0; }).map(function(r) {
    return { name: r.name, hostel: r.hostel, regNo: r.regNo || "", absentDays: r.absentDays, fine: r.fine, programme: r.programme || "", level: r.level || "", dayMarks: r.dayMarks || [] };
  });
  run.absenteeCount = run.rows.length;
  run.totalFine = run.rows.reduce(function(s, r) { return s + Number(r.fine || 0); }, 0);
  run.studentCount = rowsSrc.length;
  run.updatedAt = new Date().toISOString();
  if (!run.amendments) run.amendments = [];
  run.amendments.push({
    ref: ref,
    reason: reason,
    at: run.updatedAt,
    by: "QA Officer",
    changes: changes.slice(0, 200)
  });
  await put("hostel_runs", run);
  try {
    await writeAudit({
      action: "update",
      entity: "hostel_runs",
      entityId: run.id,
      reason: reason,
      details: { ref: ref, start: run.start, end: run.end, changeCount: changes.length, absenteeCount: run.absenteeCount, totalFine: run.totalFine }
    });
  } catch (_) {}
  markDirty("hostel run edit");
  alert("Hostel master sheet updated under " + ref + ". Publish so other devices see the change.");
  closeHostelRunModal();
  await renderHostelRunsMaster();
}

function closeHostelRunModal() {
  var modal = document.getElementById("hostelRunModal");
  if (modal) modal.hidden = true;
  window.__hostelEditRun = null;
  window.__hostelEditMode = false;
}



async function finalizeHostelReportFromPreview() {
  if(!isQaOfficer()){setHostelStatus("Sign in as QA Officer.","error");return;}
  var rows=recalculateHostelPreviewFromDom();
  if(!rows.length){setHostelStatus("Preview is empty. Upload gate data or add rows first.","error");return;}
  var rate=Number(window.__hostelPreviewRate)||Number((document.getElementById("hostelRate")&&document.getElementById("hostelRate").value)||0)||0;
  var dayHeaders=window.__hostelPreviewDayHeaders||[],last=window.__lastHostelReport||{},result=last.result||null;
  var dateKeys=(result&&result.dates?result.dates:[]).map(function(d){return toDateKeyHostel(d);});
  if(!dateKeys.length){
    var sd=parseInputDateHostel(document.getElementById("hostelStartDate")&&document.getElementById("hostelStartDate").value);
    var ed=parseInputDateHostel(document.getElementById("hostelEndDate")&&document.getElementById("hostelEndDate").value);
    if(sd&&ed&&ed>=sd)for(var d=new Date(sd);d<=ed;d.setDate(d.getDate()+1))dateKeys.push(toDateKeyHostel(new Date(d)));
  }
  if(!dateKeys.length){setHostelStatus("Report dates could not be resolved. Generate the report again.","error");return;}
  var matrix=[];
  if(result&&result.students)Object.keys(result.students).forEach(function(sid){
    var meta=result.students[sid]||{},present=result.attendance&&result.attendance[sid]?result.attendance[sid]:new Set();
    var marks=dateKeys.map(function(k){return present&&present.has&&present.has(k)?"P":"A";}),abs=marks.filter(function(m){return m==="A";}).length;
    matrix.push({studentId:sid,name:meta.name||"",regNo:meta.regNo||"",hostel:meta.hostel||"",programme:meta.programme||"",level:meta.level||"",dayMarks:marks,absentDays:abs,fine:abs*rate});
  });
  // A row removed from the absentee preview is intentionally removed from
  // this run's liability schedule, while the other present-only matrix rows stay.
  var previewedIds = {}, originallyPreviewedIds = {};
  rows.forEach(function(edit){ if(edit.id) previewedIds[String(edit.id)] = true; });
  (last.absentees || []).forEach(function(original){ if(original.id) originallyPreviewedIds[String(original.id)] = true; });
  if (matrix.length && Object.keys(originallyPreviewedIds).length) {
    matrix = matrix.filter(function(m) {
      return !originallyPreviewedIds[String(m.studentId)] || !!previewedIds[String(m.studentId)];
    });
  }
  rows.forEach(function(edit){
    var target=matrix.find(function(m){return edit.id&&String(m.studentId)===String(edit.id);});
    if(!target&&edit.regNo)target=matrix.find(function(m){return String(m.regNo||"").toLowerCase()===String(edit.regNo).toLowerCase();});
    if(!target&&edit.name)target=matrix.find(function(m){return String(m.name||"").trim().toLowerCase()===edit.name.trim().toLowerCase();});
    if(target){target.name=edit.name||target.name;target.hostel=edit.hostel||target.hostel;target.dayMarks=edit.dayMarks.slice();target.absentDays=edit.absentDays;target.fine=edit.fine;}
    else matrix.push({studentId:edit.id||"",name:edit.name,regNo:edit.regNo||"",hostel:edit.hostel||"",programme:edit.programme||"",level:edit.level||"",dayMarks:edit.dayMarks.slice(),absentDays:edit.absentDays,fine:edit.fine});
  });
  matrix.sort(function(a,b){var h=String(a.hostel||"").localeCompare(String(b.hostel||""));return h||String(a.name||"").localeCompare(String(b.name||""));});
  var absentees=matrix.filter(function(r){return(Number(r.absentDays)||0)>0;}).map(function(r){return{id:r.studentId||"",name:r.name,hostel:r.hostel,regNo:r.regNo||"",programme:r.programme||"",level:r.level||"",dayMarks:r.dayMarks,absentDays:r.absentDays,fine:r.absentDays*rate};});
  var start=dateKeys[0],end=dateKeys[dateKeys.length-1],total=absentees.reduce(function(sum,r){return sum+r.fine;},0);
  var run={id:"hr_"+Date.now().toString(36),createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),
    start:start,end:end,rate:rate,dateKeys:dateKeys,dayHeaders:dayHeaders,absenteeCount:absentees.length,totalFine:total,
    studentCount:matrix.length,rows:absentees.map(function(r){return{studentId:r.id,name:r.name,hostel:r.hostel,regNo:r.regNo||"",absentDays:r.absentDays,fine:r.fine,programme:r.programme||"",level:r.level||"",dayMarks:r.dayMarks||[]};}),
    matrix:matrix,amendments:[],edited:true,note:"Officer-edited preview. P=present; A=absent. Hostel assignment follows the master student record.",source:"gate_export_edited"};
  try{
    stampSessionFields(run);await put("hostel_runs",run);
    await writeAudit({action:"create",entity:"hostel_runs",entityId:run.id,reason:"Hostel report finalized from editable preview",
      details:{start:start,end:end,rate:rate,absenteeCount:absentees.length,totalFine:total,studentCount:matrix.length,edited:true}});
    markDirty("hostel_runs");await renderHostelRunsMaster();
    downloadHostelWorkbook(absentees,dayHeaders,"EOCNS_Hostel_Absentees_"+start+"_to_"+end+".xlsx");
    setHostelStatus("Final report downloaded and saved ("+absentees.length+" absentees; "+matrix.length+" students in the full attendance matrix). Publish when ready so other devices receive this run.","ok");
  }catch(err){console.error(err);setHostelStatus("Finalization failed: "+(err.message||String(err)),"error");}
}



async function generateHostelReport() {
  if (!isQaOfficer()) { openOfficerLoginGate("hostel"); return; }

  const statusEl = document.getElementById("hostelStatus");
  if (!hostelParsedRows) {
    setHostelStatus("Upload a gate export first.", "error");
    return;
  }
  const startDate = parseInputDateHostel(document.getElementById("hostelStartDate").value);
  const endDate = parseInputDateHostel(document.getElementById("hostelEndDate").value);
  if (!startDate || !endDate || endDate < startDate) {
    setHostelStatus("Choose a valid start and end date.", "error");
    return;
  }
  const rate = Number(document.getElementById("hostelRate").value) || 0;
  const hostel1Name = (document.getElementById("hostel1Name") && document.getElementById("hostel1Name").value) || "Hostel 1";
  const hostel2Name = (document.getElementById("hostel2Name") && document.getElementById("hostel2Name").value) || "Hostel 2";
  try {
    const result = await computeHostelAttendance(hostelParsedRows, startDate, endDate, hostel1Name, hostel2Name);
    try { await queueUnmatchedFromHostelResult(result, hostel1Name, hostel2Name); } catch (e) { console.warn("hostel unmatched queue", e); }
    if (result.autoHostelAssigned) {
      try { markDirty("auto hostel assign"); } catch (_) {}
      try { if (typeof renderHostelRoster === "function") renderHostelRoster(); } catch (_) {}
      try { if (typeof renderStudentsTable === "function") renderStudentsTable(); } catch (_) {}
    }
    var excludedN = (result.excludedPending && result.excludedPending.length) || 0;
    if (excludedN && statusEl) {
      /* status finalized later; stash for message */
      result._excludedN = excludedN;
    }

    const dayHeaders = buildDayHeadersHostel(result.dates);
    const absentees = buildAbsenteeRowsHostel(result.students, result.attendance, result.dates, rate);
    renderHostelPreview(absentees, dayHeaders, rate);
    window.__lastHostelReport = { absentees: absentees, dayHeaders: dayHeaders, rate: rate, startDate: startDate, endDate: endDate, students: result.students, dates: result.dates, result: result };
    // Persist full master run (editable by QA with REF; published to data/hostel_runs.json)
    var dateKeys = (result.dates || []).map(function(d) { return toDateKeyHostel(d); });
    var matrix = [];
    Object.keys(result.students || {}).forEach(function(sid) {
      var meta = result.students[sid] || {};
      var presentSet = result.attendance[sid] || new Set();
      var dayMarks = dateKeys.map(function(k) { return presentSet.has ? (presentSet.has(k) ? "P" : "A") : (presentSet[k] ? "P" : "A"); });
      // presentSet may be a Set
      if (presentSet && typeof presentSet.has === "function") {
        dayMarks = dateKeys.map(function(k) { return presentSet.has(k) ? "P" : "A"; });
      }
      var absentDays = dayMarks.filter(function(m) { return m === "A"; }).length;
      matrix.push({
        studentId: sid,
        name: meta.name || "",
        regNo: meta.regNo || "",
        hostel: meta.hostel || "",
        programme: meta.programme || "",
        level: meta.level || "",
        dayMarks: dayMarks,
        absentDays: absentDays,
        fine: absentDays * rate
      });
    });
    matrix.sort(function(a, b) {
      var ha = String(a.hostel || "");
      var hb = String(b.hostel || "");
      if (ha !== hb) return ha.localeCompare(hb);
      return String(a.name || "").localeCompare(String(b.name || ""));
    });
    const run = {
      id: "hr_" + Date.now().toString(36),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      start: toDateKeyHostel(startDate),
      end: toDateKeyHostel(endDate),
      rate: rate,
      dateKeys: dateKeys,
      dayHeaders: dayHeaders,
      absenteeCount: absentees.length,
      totalFine: absentees.reduce(function(s, r) { return s + r.fine; }, 0),
      studentCount: matrix.length,
      rows: absentees.map(function(r) {
        return { name: r.name, hostel: r.hostel, regNo: r.regNo || "", absentDays: r.absentDays, fine: r.fine, programme: r.programme || "", level: r.level || "", dayMarks: r.dayMarks || [] };
      }),
      matrix: matrix,
      amendments: [],
      note: "Master student record used for hostel classification; Location ID is diagnostic only.",
      source: "gate_export"
    };
    stampSessionFields(run);
    await put("hostel_runs", run);
    try {
      await writeAudit({
        action: "create",
        entity: "hostel_runs",
        entityId: run.id,
        reason: "Hostel attendance run generated from gate export",
        details: { start: run.start, end: run.end, rate: run.rate, absenteeCount: run.absenteeCount, totalFine: run.totalFine, studentCount: run.studentCount }
      });
    } catch (audErr) { console.warn("hostel audit", audErr); }
    markDirty("hostel report");
    var locN = 0, mastN = 0, confN = 0, unN = 0;
    Object.keys(result.students || {}).forEach(function(sid) {
      var st = result.students[sid];
      if (st.hostelSource === "location_id") locN++;
      else if (st.hostelSource === "master_list") mastN++;
      else unN++;
      if (st.hostelConflict) confN++;
    });
    var exN = (result._excludedN || (result.excludedPending && result.excludedPending.length) || 0);
    setHostelStatus(
      "Report ready · " + absentees.length + " absentees · master-list hostel assignments " + mastN +
      " · unassigned " + unN +
      (confN ? (" · " + confN + " machine≠master conflicts") : "") +
      (exN ? (" · " + exN + " unreviewed machine user(s) held out until linked") : "") +
      " · saved to master sheet (Publish to keep on all devices).",
      "ok"
    );
    renderProfessionalHostelPreview(absentees, dayHeaders, rate, startDate, endDate);
    try { await renderHostelRunsMaster(); } catch (_) {}
  } catch (err) {
    console.error(err);
    setHostelStatus("Failed: " + (err.message || String(err)), "error");
  }
}


openDB().then(async () => {
  console.log("EOCNS Attendance System ready");
  try {
  // Independent local DB: hydrate only if empty; pull from repo only when remote changed
  try { await hydrateAllFromRepoIfEmpty(); } catch (e) { console.warn("hydrate", e); }
  try {
    var syncRes = await syncFromRepoIfClean();
    if (syncRes && syncRes.pulled && syncRes.pulled.length) {
      console.info("EOCNS repo updates pulled:", syncRes.pulled);
    }
  } catch (e) { console.warn("repo sync", e); }
  try { startSmartRepoWatch(); } catch (e) { console.warn("smart watch", e); }
  showView(sessionStorage.getItem("eocns-last-view") || "dashboard");
  try { refreshDashboardStats(); } catch (e) { console.warn("stats", e); }
  initQaOfficerUI();
  try { initBiometricMapUI(); } catch (e) { console.warn("biometric ui", e); }
  try { initHostelTrainUI(); } catch (e) { console.warn("hostel train ui", e); }

  document.getElementById("btnRefreshPending")?.addEventListener("click", function() { renderPendingRegistrations({ fromRepo: true }); });
  document.getElementById("btnClosePendingReview")?.addEventListener("click", closePendingReview);
  document.getElementById("pendingReviewBackdrop")?.addEventListener("click", closePendingReview);
  document.getElementById("btnPendingApprove")?.addEventListener("click", function() {
    if (typeof window.approvePendingStudent === "function") window.approvePendingStudent(window.__pendingReviewId);
    else alert("Approve is not ready yet. Hard-refresh the page.");
  });
  document.getElementById("btnPendingReject")?.addEventListener("click", function() {
    if (typeof window.rejectPendingStudent === "function") window.rejectPendingStudent(window.__pendingReviewId);
    else alert("Reject is not ready yet. Hard-refresh the page.");
  });
  document.getElementById("btnConfirmPendingReject")?.addEventListener("click", function() {
    if (typeof window.confirmRejectPendingStudent === "function") window.confirmRejectPendingStudent();
  });
  document.getElementById("btnCancelPendingReject")?.addEventListener("click", function() {
    if (typeof window.closePendingRejectModal === "function") window.closePendingRejectModal();
  });
  document.getElementById("btnClosePendingRejectModal")?.addEventListener("click", function() {
    if (typeof window.closePendingRejectModal === "function") window.closePendingRejectModal();
  });
  document.getElementById("pendingRejectBackdrop")?.addEventListener("click", function() {
    if (typeof window.closePendingRejectModal === "function") window.closePendingRejectModal();
  });



  document.getElementById("btnProfilePhoto") && document.getElementById("btnProfilePhoto").addEventListener("click", function() {
    document.getElementById("profilePhotoInput") && document.getElementById("profilePhotoInput").click();
  });
  document.getElementById("profilePhotoInput") && document.getElementById("profilePhotoInput").addEventListener("change", function(e) {
    var f = e.target.files && e.target.files[0];
    if (f) handleProfilePhotoUpload(f);
    e.target.value = "";
  });
  document.getElementById("btnProfileFullRecord") && document.getElementById("btnProfileFullRecord").addEventListener("click", function() {
    var fn = window.openStudentFullRecord || (typeof openStudentFullRecord === "function" ? openStudentFullRecord : null);
    if (fn) fn(window.__profileStudentId);
  });
  function _bindCloseFullRecord() {
    if (typeof window.closeStudentFullRecord === "function") window.closeStudentFullRecord();
    else if (typeof closeStudentFullRecord === "function") closeStudentFullRecord();
  }
  document.getElementById("btnCloseFullRecord") && document.getElementById("btnCloseFullRecord").addEventListener("click", _bindCloseFullRecord);
  document.getElementById("btnCloseFullRecord2") && document.getElementById("btnCloseFullRecord2").addEventListener("click", _bindCloseFullRecord);
  document.getElementById("studentFullRecordBackdrop") && document.getElementById("studentFullRecordBackdrop").addEventListener("click", _bindCloseFullRecord);
  document.getElementById("btnPrintStudentSummary") && document.getElementById("btnPrintStudentSummary").addEventListener("click", function() {
    if (typeof window.printStudentSummary === "function") window.printStudentSummary();
    else if (typeof printStudentSummary === "function") printStudentSummary();
  });

  document.getElementById("btnPrintStudentDiscipline") && document.getElementById("btnPrintStudentDiscipline").addEventListener("click", function() {
    printStudentSectionReport(window.__fullRecordStudentId, "discipline");
  });
  document.getElementById("btnPrintStudentHostel") && document.getElementById("btnPrintStudentHostel").addEventListener("click", function() {
    printStudentSectionReport(window.__fullRecordStudentId, "hostel");
  });
  document.getElementById("btnPrintStudentClass") && document.getElementById("btnPrintStudentClass").addEventListener("click", function() {
    printStudentSectionReport(window.__fullRecordStudentId, "class");
  });

  document.getElementById("btnAddDiscipline") && document.getElementById("btnAddDiscipline").addEventListener("click", function() { openDisciplineForm(null); });
  document.getElementById("disciplineForm") && document.getElementById("disciplineForm").addEventListener("submit", saveDisciplineCase);
  document.getElementById("btnCloseDiscipline") && document.getElementById("btnCloseDiscipline").addEventListener("click", closeDisciplineForm);
  document.getElementById("btnCancelDiscipline") && document.getElementById("btnCancelDiscipline").addEventListener("click", closeDisciplineForm);
  document.getElementById("disciplineModalBackdrop") && document.getElementById("disciplineModalBackdrop").addEventListener("click", closeDisciplineForm);
  document.getElementById("btnPrintDiscRegister") && document.getElementById("btnPrintDiscRegister").addEventListener("click", printDisciplineRegister);
  ["discFilterSubject","discFilterStatus","discSearch"].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) { el.addEventListener("change", renderDisciplineTable); el.addEventListener("input", renderDisciplineTable); }
  });

  try { bindStudentProfileCloseHandlers(); } catch (_) {}
  document.getElementById("globalSemesterSelect")?.addEventListener("change", function() { setActiveSemesterId(this.value); });
  document.getElementById("btnSessionAddSemester")?.addEventListener("click", function() { addSessionSemesterRow({}); });
  document.getElementById("globalSessionSelect")?.addEventListener("change", function() {
    setActiveSessionId(this.value);
  });
  try { await refreshSessionChrome(); } catch (e) { console.warn("session chrome", e); }
  document.getElementById("btnAddStudent")?.addEventListener("click", () => openStudentForm());

  document.getElementById("studentPhotoInput")?.addEventListener("change", async function(e) {
    var f = e.target.files && e.target.files[0];
    if (!f) return;
    try {
      var dataUrl = await compressPassportImage(f, 480, 0.72);
      if (document.getElementById("studentPhotoDataUrl")) document.getElementById("studentPhotoDataUrl").value = dataUrl;
      if (document.getElementById("studentPhotoPreview")) document.getElementById("studentPhotoPreview").innerHTML = '<img src="' + dataUrl + '" alt="" style="width:100%;height:100%;object-fit:cover" />';
    } catch (err) {
      alert("Could not process photo: " + (err.message || String(err)));
    }
  });
  document.getElementById("btnClearStudentPhoto")?.addEventListener("click", function() {
    if (document.getElementById("studentPhotoDataUrl")) document.getElementById("studentPhotoDataUrl").value = "";
    if (document.getElementById("studentPhotoPreview")) document.getElementById("studentPhotoPreview").innerHTML = "—";
    if (document.getElementById("studentPhotoInput")) document.getElementById("studentPhotoInput").value = "";
  });

  document.getElementById("studentForm")?.addEventListener("submit", saveStudent);
  document.getElementById("btnCancelStudent")?.addEventListener("click", closeStudentForm);
  document.getElementById("btnCancelStudent2")?.addEventListener("click", closeStudentForm);
  document.getElementById("studentModalBackdrop")?.addEventListener("click", closeStudentForm);
  ["studentSearch", "filterProgramme", "filterLevel"].forEach(id => {
    document.getElementById(id)?.addEventListener("input", renderStudentsTable);
    document.getElementById(id)?.addEventListener("change", renderStudentsTable);
  });
  document.getElementById("btnAddLecturer")?.addEventListener("click", () => openLecturerForm(null));
  document.getElementById("btnAddLecturerAssign")?.addEventListener("click", function() { addLecturerAssignRow({}); });
  document.getElementById("lecturerForm")?.addEventListener("submit", saveLecturer);
  document.getElementById("lecturerSearch")?.addEventListener("input", renderLecturersTable);
  document.getElementById("lecturerModalBackdrop")?.addEventListener("click", () => { document.getElementById("lecturerModal").hidden = true; });
  document.getElementById("btnAddSession")?.addEventListener("click", () => openSessionForm(null));
  document.getElementById("btnSessionAddProgramme")?.addEventListener("click", async () => { await addProgrammePrompt(); PROGRAMMES_CACHE = await getAll("programmes"); renderSessionChipBoxes(Array.from(document.querySelectorAll('input[name="sessionProgramme"]:checked')).map(el => el.value), Array.from(document.querySelectorAll('input[name="sessionLevel"]:checked')).map(el => el.value)); await fillProgrammeLevelSelects(); });
  document.getElementById("btnSessionAddLevel")?.addEventListener("click", async () => { await addLevelPrompt(); LEVELS_CACHE = await getAll("levels"); renderSessionChipBoxes(Array.from(document.querySelectorAll('input[name="sessionProgramme"]:checked')).map(el => el.value), Array.from(document.querySelectorAll('input[name="sessionLevel"]:checked')).map(el => el.value)); await fillProgrammeLevelSelects(); });
  document.getElementById("btnBulkMove")?.addEventListener("click", bulkMoveStudents);
  document.getElementById("btnBulkDeactivate")?.addEventListener("click", bulkDeactivateStudents);
  document.getElementById("btnBulkDeleteStudents")?.addEventListener("click", function() { deleteSelectedStudents(); });
  document.getElementById("filterProgramme")?.addEventListener("change", renderStudentsTable);
  document.getElementById("filterLevel")?.addEventListener("change", renderStudentsTable);
  document.getElementById("selectAllStudents")?.addEventListener("change", function(e) {
    document.querySelectorAll(".stu-select").forEach(function(cb) { cb.checked = e.target.checked; });
    updateBulkSelectedCount();
  });
  document.getElementById("sessionForm")?.addEventListener("submit", saveSession);
  document.getElementById("sessionModalBackdrop")?.addEventListener("click", () => { document.getElementById("sessionModal").hidden = true; });

  document.getElementById("btnSeedStudents")?.addEventListener("click", seedOfficialStudents);

  const hostelDropzone = document.getElementById("hostelDropzone");
  const hostelFileInput = document.getElementById("hostelFileInput");
  hostelDropzone?.addEventListener("click", () => hostelFileInput?.click());
  hostelDropzone?.addEventListener("dragover", (e) => { e.preventDefault(); hostelDropzone.classList.add("is-dragover"); });
  hostelDropzone?.addEventListener("dragleave", () => hostelDropzone.classList.remove("is-dragover"));
  hostelDropzone?.addEventListener("drop", (e) => {
    e.preventDefault();
    hostelDropzone.classList.remove("is-dragover");
    if (e.dataTransfer.files && e.dataTransfer.files[0]) handleHostelFile(e.dataTransfer.files[0]);
  });
  hostelFileInput?.addEventListener("change", () => {
    if (hostelFileInput.files && hostelFileInput.files[0]) handleHostelFile(hostelFileInput.files[0]);
  });
  document.getElementById("btnGenerateHostel")?.addEventListener("click", function() {
    previewHostelFromGate().then(function(r) {
      if (!r) return;
      setHostelStatus("Preview updated. Review/edit the table, then click Confirm edits & download report.", "ok");
    });
  });
  document.getElementById("btnHostelRecalcPreview")?.addEventListener("click", function() {
    recalculateHostelPreviewFromDom();
    setHostelStatus("Fines recalculated from day marks.", "ok");
  });
  document.getElementById("btnHostelFinalizeReport")?.addEventListener("click", function() {
    finalizeHostelReportFromPreview();
  });
  document.getElementById("btnHostelAddPreviewRow")?.addEventListener("click", addHostelPreviewRow);
  document.getElementById("btnClearHostel")?.addEventListener("click", () => {
    hostelParsedRows = null;
    if (hostelFileInput) hostelFileInput.value = "";
    showHostelFileCheck("", "");
    setHostelStatus("", "");
    const results = document.getElementById("hostelResults");
    if (results) results.hidden = true;
  });

  document.getElementById("btnRefreshHostelRuns")?.addEventListener("click", function() { renderHostelRunsMaster(); });
  document.getElementById("btnCloseHostelRunModal")?.addEventListener("click", closeHostelRunModal);
  document.getElementById("btnCancelHostelRunEdit")?.addEventListener("click", closeHostelRunModal);
  document.getElementById("btnSaveHostelRunEdit")?.addEventListener("click", function() { saveHostelRunEdit(); });
  document.getElementById("hostelRunModalBackdrop")?.addEventListener("click", closeHostelRunModal);


  // QA module
  seedQaDatalists();
  const todayStr = (function() { var d = new Date(); return d.toISOString().slice(0, 10); })();
async function renderHostelRoster() {
  var body = document.getElementById("hostelRosterBody");
  if (!body) return;
  var pf = document.getElementById("hostelRosterProgramme");
  var lf = document.getElementById("hostelRosterLevel");
  try {
    if (typeof fillProgrammeLevelSelects === "function") await fillProgrammeLevelSelects();
  } catch (_) {}
  var prog = (pf && pf.value) || "";
  var level = (lf && lf.value) || "";
  var hostelF = (document.getElementById("hostelRosterFilter") && document.getElementById("hostelRosterFilter").value) || "";
  var linkF = (document.getElementById("hostelRosterLinkFilter") && document.getElementById("hostelRosterLinkFilter").value) || "";
  var all = await getAll("students");
  var list = (all || []).filter(function(s) {
    if (s.status && String(s.status) !== "Active") return false;
    if (prog && String(s.programme || "") !== prog) return false;
    if (level && String(s.level || "") !== String(level)) return false;
    var hasSerial = !!(s.serial && String(s.serial).trim());
    if (linkF === "linked" && !hasSerial) return false;
    if (linkF === "unlinked" && hasSerial) return false;
    if (hostelF) {
      var h = String(s.hostel || "").toLowerCase();
      if (hostelF === "unassigned") {
        if (h && h.indexOf("unassigned") < 0) return false;
        if (!h) { /* keep */ }
        else if (h.indexOf("unassigned") < 0) return false;
      } else if (h.indexOf(String(hostelF).toLowerCase()) < 0) return false;
    }
    return true;
  });
  // Machine ID first priority, then reg no, then name
  list.sort(function(a, b) {
    var sa = String(a.serial || "");
    var sb = String(b.serial || "");
    if (sa && !sb) return -1;
    if (!sa && sb) return 1;
    if (sa && sb) {
      var c = sa.localeCompare(sb, undefined, { numeric: true });
      if (c) return c;
    }
    var ra = String(a.regNo || ""), rb = String(b.regNo || "");
    if (ra && rb) {
      var c2 = ra.localeCompare(rb, undefined, { numeric: true });
      if (c2) return c2;
    }
    return String(a.name || "").localeCompare(String(b.name || ""));
  });
  if (!list.length) {
    body.innerHTML = '<tr><td colspan="8" class="muted-note">No students match filters.</td></tr>';
    return;
  }
  var linkedN = 0, unlinkedN = 0;
  body.innerHTML = list.map(function(s) {
    var hasSerial = !!(s.serial && String(s.serial).trim());
    if (hasSerial) linkedN++; else unlinkedN++;
    var mid = hasSerial
      ? ("<strong style=\"font-size:1.05em\">" + escapeHtml(String(s.serial).trim()) + "</strong>")
      : '<span class="muted-note">—</span>';
    var status = hasSerial
      ? '<span style="color:#15803d;font-weight:600">Linked</span>'
      : '<span style="color:#b45309;font-weight:600">Not linked</span>';
    var actions = "—";
    if (isQaOfficer()) {
      if (hasSerial) {
        actions = '<button type="button" class="btn btn--ghost btn--sm" data-hostel-unlink="' + escapeHtml(s.id) + '">Unlink</button>';
      } else {
        actions = '<button type="button" class="btn btn--primary btn--sm" data-hostel-link="' + escapeHtml(s.id) + '">Link ID…</button>';
      }
    }
    return "<tr>" +
      "<td>" + mid + "</td>" +
      "<td>" + status + "</td>" +
      "<td>" + escapeHtml(s.regNo || "—") + "</td>" +
      "<td>" + escapeHtml(s.name || "") + "</td>" +
      "<td>" + escapeHtml(s.programme || "") + "</td>" +
      "<td>" + escapeHtml(String(s.level || "")) + "</td>" +
      "<td>" + escapeHtml(s.hostel || "—") + "</td>" +
      '<td class="qa-edit-only">' + actions + "</td></tr>";
  }).join("");
  var note = document.getElementById("hostelRosterNote");
  if (note) note.textContent = "Showing " + list.length + " · Linked " + linkedN + " · Not linked " + unlinkedN;
  document.querySelectorAll("[data-hostel-unlink]").forEach(function(btn) {
    btn.onclick = function() { bioUnlinkStudentSerial(btn.getAttribute("data-hostel-unlink")); };
  });
  document.querySelectorAll("[data-hostel-link]").forEach(function(btn) {
    btn.onclick = function() { bioManualLinkPrompt(btn.getAttribute("data-hostel-link")); };
  });
}

async function renderHostelConflicts() {
  var body = document.getElementById("hostelConflictBody");
  var countEl = document.getElementById("hostelConflictCount");
  if (!body) return;
  var list = [];
  try { list = await getAll("biometric_pending"); } catch (_) {}
  list = (list || []).filter(function(x) { return x && x.status === "hostel_conflict"; });
  if (countEl) countEl.textContent = "Conflicts: " + list.length + (list.length ? " (held off fee reports)" : " — none");
  if (!list.length) {
    body.innerHTML = '<tr><td colspan="5" class="muted-note">No location conflicts.</td></tr>';
    return;
  }
  body.innerHTML = list.map(function(row) {
    return "<tr>" +
      "<td><strong>" + escapeHtml(row.machineNo || "") + "</strong></td>" +
      "<td>" + escapeHtml(row.studentName || row.machineName || "") +
        (row.regNo ? (" · " + escapeHtml(row.regNo)) : "") + "</td>" +
      "<td>" + escapeHtml(row.masterHostel || "—") + "</td>" +
      "<td>" + escapeHtml(row.gateHostel || "") + "</td>" +
      '<td class="qa-edit-only">' +
        (isQaOfficer() ? (
          '<button type="button" class="btn btn--primary btn--sm" data-hc-keep="' + escapeHtml(row.id) + '">Keep master</button> ' +
          '<button type="button" class="btn btn--ghost btn--sm" data-hc-accept="' + escapeHtml(row.id) + '">Accept gate</button> ' +
          '<button type="button" class="btn btn--ghost btn--sm" data-hc-discard="' + escapeHtml(row.id) + '">Dismiss</button>'
        ) : "—") +
      "</td></tr>";
  }).join("");
  document.querySelectorAll("[data-hc-keep]").forEach(function(btn) {
    btn.onclick = async function() {
      var row = (await getAll("biometric_pending")).find(function(x) { return x.id === btn.getAttribute("data-hc-keep"); });
      if (!row) return;
      // keep master hostel; clear conflict flag only
      await del("biometric_pending", row.id);
      markDirty("hostel conflict keep");
      await renderHostelConflicts();
    };
  });
  document.querySelectorAll("[data-hc-accept]").forEach(function(btn) {
    btn.onclick = async function() {
      var row = (await getAll("biometric_pending")).find(function(x) { return x.id === btn.getAttribute("data-hc-accept"); });
      if (!row || !row.studentId) return;
      var all = await getAll("students");
      var s = all.find(function(x) { return x.id === row.studentId; });
      if (!s) return;
      var before = s.hostel || "";
      s.hostel = row.gateHostel || s.hostel;
      s.hostelSource = "gate_conflict_accept";
      s.updatedAt = new Date().toISOString();
      await put("students", s);
      try {
        await writeAudit({
          action: "update",
          entity: "students",
          entityId: s.id,
          reason: "Accepted gate Location ID hostel over master",
          details: { hostelBefore: before, hostelAfter: s.hostel, machineNo: row.machineNo }
        });
      } catch (_) {}
      await del("biometric_pending", row.id);
      markDirty("hostel conflict accept");
      await renderHostelConflicts();
      try { await renderHostelRoster(); } catch (_) {}
    };
  });
  document.querySelectorAll("[data-hc-discard]").forEach(function(btn) {
    btn.onclick = async function() {
      await del("biometric_pending", btn.getAttribute("data-hc-discard"));
      markDirty("hostel conflict dismiss");
      await renderHostelConflicts();
    };
  });
}



function svgPie(slices, size) {
  size = size || 160;
  var total = slices.reduce(function(s, x) { return s + x.value; }, 0) || 1;
  var cx = size / 2, cy = size / 2, r = size / 2 - 4;
  var angle = -Math.PI / 2;
  var paths = [];
  slices.forEach(function(sl) {
    var a = (sl.value / total) * Math.PI * 2;
    var x1 = cx + r * Math.cos(angle);
    var y1 = cy + r * Math.sin(angle);
    angle += a;
    var x2 = cx + r * Math.cos(angle);
    var y2 = cy + r * Math.sin(angle);
    var large = a > Math.PI ? 1 : 0;
    paths.push('<path d="M ' + cx + ' ' + cy + ' L ' + x1 + ' ' + y1 + ' A ' + r + ' ' + r + ' 0 ' + large + ' 1 ' + x2 + ' ' + y2 + ' Z" fill="' + sl.color + '"><title>' + sl.label + ': ' + sl.value + '</title></path>');
  });
  return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '">' + paths.join("") + '</svg>';
}

function svgBars(items, width, height) {
  width = width || 320; height = height || 140;
  var max = Math.max.apply(null, items.map(function(i) { return i.value; }).concat([1]));
  var gap = 8;
  var barW = (width - gap * (items.length + 1)) / items.length;
  var bars = items.map(function(it, i) {
    var h = Math.round((it.value / max) * (height - 28));
    var x = gap + i * (barW + gap);
    var y = height - 20 - h;
    return '<rect x="' + x + '" y="' + y + '" width="' + barW + '" height="' + h + '" fill="' + (it.color || "#0d9488") + '" rx="3"/>' +
      '<text x="' + (x + barW / 2) + '" y="' + (height - 6) + '" text-anchor="middle" font-size="10" fill="#334">' + it.label + '</text>' +
      '<text x="' + (x + barW / 2) + '" y="' + (y - 4) + '" text-anchor="middle" font-size="10" fill="#111">' + it.value + '</text>';
  }).join("");
  return '<svg width="' + width + '" height="' + height + '" viewBox="0 0 ' + width + ' ' + height + '">' + bars + '</svg>';
}

function renderProfessionalHostelPreview(absentees, dayHeaders, rate, startDate, endDate) {
  var host = document.getElementById("hostelResults");
  if (!host) return;
  var byHostel = {};
  absentees.forEach(function(r) {
    byHostel[r.hostel] = byHostel[r.hostel] || { count: 0, fine: 0 };
    byHostel[r.hostel].count += 1;
    byHostel[r.hostel].fine += r.fine;
  });
  var totalFine = absentees.reduce(function(s, r) { return s + r.fine; }, 0);
  var colors = ["#0d9488", "#1d4ed8", "#b45309", "#be123c", "#6d28d9"];
  var pieSlices = Object.keys(byHostel).map(function(k, i) {
    return { label: k, value: byHostel[k].count, color: colors[i % colors.length] };
  });
  var barItems = Object.keys(byHostel).map(function(k, i) {
    return { label: k.replace("Hostel ", "H"), value: Math.round(byHostel[k].fine), color: colors[i % colors.length] };
  });
  var period = toDateKeyHostel(startDate) + " → " + toDateKeyHostel(endDate);
  var summaryHtml =
    '<div class="pro-report" style="margin-top:16px">' +
    '<h3 style="margin:0 0 8px">Executive summary — Hostel boarding fee</h3>' +
    '<p style="margin:0 0 12px;line-height:1.5">Period <strong>' + period + '</strong>. Rate <strong>' + formatNairaHostel(rate) + '</strong> per absent night. ' +
    '<strong>' + absentees.length + '</strong> students incurred charges totalling <strong>' + formatNairaHostel(totalFine) + '</strong>. ' +
    'Hostel labels follow the master student record; gate Location ID is diagnostic only and never overrides the master list.</p>' +
    '<div style="display:flex;flex-wrap:wrap;gap:24px;align-items:center;margin-bottom:16px">' +
    '<div><div class="muted-note">Absentees by hostel</div>' + svgPie(pieSlices, 150) + '</div>' +
    '<div><div class="muted-note">Fines by hostel (₦)</div>' + svgBars(barItems, 280, 130) + '</div></div>' +
    '<button type="button" class="btn btn--primary" id="btnPrintHostelPack">Print professional hostel pack</button>' +
    '</div>';
  var existing = host.querySelector(".pro-report");
  if (existing) existing.remove();
  host.insertAdjacentHTML("beforeend", summaryHtml);
  document.getElementById("btnPrintHostelPack") && document.getElementById("btnPrintHostelPack").addEventListener("click", function() {
    printHostelProfessionalPack(absentees, dayHeaders, rate, startDate, endDate, pieSlices, barItems);
  });
}

function printHostelProfessionalPack(absentees, dayHeaders, rate, startDate, endDate, pieSlices, barItems) {
  var totalFine = absentees.reduce(function(s, r) { return s + r.fine; }, 0);
  var period = toDateKeyHostel(startDate) + " to " + toDateKeyHostel(endDate);
  var rows = absentees.map(function(r, i) {
    return "<tr><td>" + (i + 1) + "</td><td>" + r.name + "</td><td>" + (r.regNo || "") + "</td><td>" + r.hostel +
      "</td><td>" + r.absentDays + "</td><td>" + formatNairaHostel(r.fine) + "</td></tr>";
  }).join("");
  var w = window.open("", "_blank");
  if (!w) return;
  w.document.write("<!DOCTYPE html><html><head><title>EOCNS Hostel Boarding Fee Report</title><style>" +
    "body{font-family:Georgia,'Times New Roman',serif;color:#111;padding:28px;max-width:900px;margin:0 auto}" +
    "h1{color:#1B3A6B;text-align:center;margin-bottom:4px;font-size:1.35rem}" +
    ".sub{text-align:center;color:#555;margin-bottom:20px;font-size:13px}" +
    "h2{color:#1B3A6B;font-size:1.05rem;border-bottom:2px solid #1B3A6B;padding-bottom:4px;margin-top:28px}" +
    "table{width:100%;border-collapse:collapse;font-size:12px;margin-top:10px}" +
    "th{background:#1B3A6B;color:#fff;padding:7px 8px;text-align:left} td{border:1px solid #ccc;padding:6px 8px}" +
    "tr:nth-child(even) td{background:#f5f7fb}" +
    ".kpi{display:flex;gap:12px;flex-wrap:wrap;margin:16px 0}" +
    ".kpi div{flex:1;min-width:120px;background:#f0f9f8;border:1px solid #99e6df;border-radius:8px;padding:12px;text-align:center}" +
    ".kpi strong{display:block;font-size:1.25rem;color:#0f766e}" +
    "p.narrative{line-height:1.55;font-size:13px}" +
    "@media print{body{padding:12px}}</style></head><body>" +
    "<h1>Eastern Oak College of Nursing Sciences</h1>" +
    "<div class=\"sub\">Hostel Boarding Fee / Absentee Report · Official QA Pack</div>" +
    "<h2>1. Executive summary</h2>" +
    "<p class=\"narrative\">This report covers <strong>" + period + "</strong> at a charge of <strong>" + formatNairaHostel(rate) +
    "</strong> per absent night. <strong>" + absentees.length + "</strong> students were absent on one or more nights, generating a combined liability of <strong>" +
    formatNairaHostel(totalFine) + "</strong>. Hostel placement follows the master student record. Biometric Location ID is diagnostic only and does not override master hostel assignment. Gate/master discrepancies are recorded for review; they do not override the master assignment. Historical published runs remain unchanged if a student is later moved between hostels.</p>" +
    "<div class=\"kpi\"><div><strong>" + absentees.length + "</strong>Absentees</div>" +
    "<div><strong>" + formatNairaHostel(totalFine) + "</strong>Total due</div>" +
    "<div><strong>" + formatNairaHostel(rate) + "</strong>Daily rate</div></div>" +
    "<h2>2. Distribution</h2>" +
    "<div style=\"display:flex;gap:24px;flex-wrap:wrap;align-items:center\">" + svgPie(pieSlices, 160) + svgBars(barItems, 300, 140) + "</div>" +
    "<h2>3. Student liability schedule</h2>" +
    "<table><thead><tr><th>#</th><th>Name</th><th>Reg. No</th><th>Hostel (master)</th><th>Days</th><th>Amount</th></tr></thead><tbody>" +
    rows + "</tbody></table>" +
    "<h2>4. Certification</h2>" +
    "<p class=\"narrative\">Prepared via the EOCNS QA Attendance System. Master student record used for hostel classification; Location ID retained for diagnostics only.</p>" +
    "<p style=\"margin-top:36px\">QA Officer: ______________________ &nbsp;&nbsp; Date: ______________</p>" +
    "</body></html>");
  w.document.close();
  setTimeout(function() { w.print(); }, 350);
}

async function printFullQaPack() {
  var entries = window.__lastReportEntries;
  if (!entries || !entries.length) {
    // build from filters
    await renderReportsView();
    entries = window.__lastReportEntries || [];
  }
  if (!entries.length) { alert("No lecture logs in the selected range. Set From/To and filter first."); return; }
  var held = entries.filter(function(e) { return e.status === "Held"; }).length;
  var missed = entries.filter(function(e) { return e.status === "Missed"; }).length;
  var partial = entries.filter(function(e) { return e.status === "Partial"; }).length;
  var other = entries.length - held - missed - partial;
  var pie = [
    { label: "Held", value: held, color: "#0d9488" },
    { label: "Missed", value: missed, color: "#be123c" },
    { label: "Partial", value: partial, color: "#b45309" },
    { label: "Other", value: other, color: "#64748b" }
  ].filter(function(x) { return x.value > 0; });
  var byCourse = {};
  entries.forEach(function(e) {
    var c = e.course || "Unknown";
    byCourse[c] = byCourse[c] || { held: 0, total: 0 };
    byCourse[c].total += 1;
    if (e.status === "Held") byCourse[c].held += 1;
  });
  var bars = Object.keys(byCourse).slice(0, 8).map(function(c) {
    return { label: c.slice(0, 8), value: byCourse[c].held, color: "#1d4ed8" };
  });
  var compliance = entries.length ? Math.round((held / entries.length) * 100) : 0;
  var blocks = entries.map(function(e, i) {
    return "<tr><td>" + (i + 1) + "</td><td>" + (e.date || "") + "</td><td>" + (e.course || "") + "</td><td>" + (e.lecturer || "") +
      "</td><td>" + (e.status || "") + "</td><td>" + (e.topic || "—") + "</td></tr>";
  }).join("");
  var w = window.open("", "_blank");
  if (!w) return;
  w.document.write("<!DOCTYPE html><html><head><title>EOCNS QA Lecture Compliance Pack</title><style>" +
    "body{font-family:Georgia,serif;color:#111;padding:28px;max-width:920px;margin:0 auto}" +
    "h1{color:#1B3A6B;text-align:center;font-size:1.35rem;margin-bottom:4px}" +
    ".sub{text-align:center;color:#555;margin-bottom:18px;font-size:13px}" +
    "h2{color:#1B3A6B;font-size:1.05rem;border-bottom:2px solid #1B3A6B;padding-bottom:4px;margin-top:26px}" +
    "table{width:100%;border-collapse:collapse;font-size:12px} th{background:#1B3A6B;color:#fff;padding:7px} td{border:1px solid #ccc;padding:6px}" +
    "tr:nth-child(even) td{background:#f5f7fb} p{line-height:1.55;font-size:13px}" +
    ".kpi{display:flex;gap:10px;flex-wrap:wrap}.kpi div{flex:1;min-width:110px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:10px;text-align:center}" +
    ".kpi strong{display:block;font-size:1.2rem;color:#1d4ed8}" +
    "</style></head><body>" +
    "<h1>Eastern Oak College of Nursing Sciences</h1>" +
    "<div class=\"sub\">Quality Assurance · Lecture Compliance Pack</div>" +
    "<h2>1. Executive summary</h2>" +
    "<p>This pack consolidates <strong>" + entries.length + "</strong> lecture log entries. Delivery compliance (status Held) stands at <strong>" +
    compliance + "%</strong> (" + held + " held, " + missed + " missed, " + partial + " partial). Charts below summarise status mix and held sessions by course. Detailed logs follow for audit and filing.</p>" +
    "<div class=\"kpi\"><div><strong>" + entries.length + "</strong>Logs</div><div><strong>" + compliance + "%</strong>Held rate</div>" +
    "<div><strong>" + missed + "</strong>Missed</div></div>" +
    "<h2>2. Status mix & course delivery</h2>" +
    "<div style=\"display:flex;gap:20px;flex-wrap:wrap;align-items:center\">" + svgPie(pie, 150) + svgBars(bars, 320, 140) + "</div>" +
    "<h2>3. Lecture log register</h2>" +
    "<table><thead><tr><th>#</th><th>Date</th><th>Course</th><th>Lecturer</th><th>Status</th><th>Topic</th></tr></thead><tbody>" +
    blocks + "</tbody></table>" +
    "<h2>4. Certification</h2><p>Generated by the EOCNS QA Attendance System for internal quality review.</p>" +
    "<p style=\"margin-top:32px\">QA Officer: ______________________ &nbsp;&nbsp; Date: ______________</p>" +
    "</body></html>");
  w.document.close();
  setTimeout(function() { w.print(); }, 350);
}

async function renderTimetableBoard() {
  window.renderTimetableBoard = renderTimetableBoard;
  await ensureTimetables();
  var key = (document.getElementById("ttBoardClass") && document.getElementById("ttBoardClass").value) || "100_nursing";
  var tt = TIMETABLES_CACHE[key] || { slots: [] };
  var days = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  var byDay = { 0: [], 1: [], 2: [], 3: [], 4: [] };
  (tt.slots || []).forEach(function(s) {
    var d = Number(s.weekday);
    if (byDay[d]) byDay[d].push(s);
  });
  var cols = days.map(function(name, d) {
    var cells = (byDay[d] || []).map(function(s) {
      return '<button type="button" class="tt-slot" data-tt-code="' + escapeHtml(s.code || "") + '" data-tt-start="' + escapeHtml(s.start || "") + '">' +
        '<strong>' + escapeHtml(s.code || "?") + '</strong><span>' + escapeHtml((s.start || "") + "–" + (s.end || "")) + '</span></button>';
    }).join("") || '<span class="muted-note">—</span>';
    return '<div class="tt-col"><div class="tt-col-h">' + name + '</div>' + cells + '</div>';
  }).join("");
  var board = document.getElementById("timetableBoard");
  if (board) board.innerHTML = '<div class="card__body"><div class="tt-grid">' + cols + '</div></div>';
  board && board.querySelectorAll(".tt-slot").forEach(function(btn) {
    btn.addEventListener("click", async function() {
      if (!isQaOfficer()) { alert("Sign in as QA Officer to log from the board."); return; }
      await openQaEntryForm(null);
      document.getElementById("qaEntryClass").value = key;
      var code = btn.getAttribute("data-tt-code");
      var start = btn.getAttribute("data-tt-start");
      var courseSel = document.getElementById("qaEntryCourse");
      if (courseSel && code) {
        for (var i = 0; i < courseSel.options.length; i++) {
          if (courseSel.options[i].value.indexOf(code) === 0) { courseSel.selectedIndex = i; break; }
        }
      }
      if (start && document.getElementById("qaEntryStart")) document.getElementById("qaEntryStart").value = start.length === 4 ? ("0" + start) : start;
      calcQaDurationMinutes();
    });
  });
}

async function importStudentsCsv(file, options) {
  if (!isQaOfficer()) {
    alert("Sign in as QA Officer to import students.");
    return;
  }
  if (!file) {
    alert("Choose a CSV file.");
    return;
  }
  options = options || {};
  var defaultProgramme = String(options.programme || "").trim();
  var defaultLevel = String(options.level || "").trim();
  var fillMode = options.fillMode || "defaults"; // defaults | force | csv_only

  var text = await file.text();
  // Strip BOM
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
  var lines = text.split(/\r?\n/).filter(function(l) { return l.trim(); });
  if (lines.length < 2) { alert("CSV needs a header row and at least one data row."); return; }

  function splitCsv(line) {
    var out = [], cur = "", q = false;
    for (var i = 0; i < line.length; i++) {
      var ch = line[i];
      if (ch === '"') {
        if (q && line[i + 1] === '"') { cur += '"'; i++; continue; }
        q = !q; continue;
      }
      if (ch === "," && !q) { out.push(cur.trim()); cur = ""; continue; }
      cur += ch;
    }
    out.push(cur.trim());
    return out;
  }
  function normHeader(h) {
    return String(h || "").toLowerCase()
      .replace(/^\ufeff/, "")
      .replace(/\./g, "")
      .replace(/_/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
  function idx(headers, names) {
    for (var i = 0; i < names.length; i++) {
      var want = normHeader(names[i]);
      var j = headers.indexOf(want);
      if (j >= 0) return j;
    }
    // soft contains match
    for (var i2 = 0; i2 < names.length; i2++) {
      var w = normHeader(names[i2]);
      for (var h = 0; h < headers.length; h++) {
        if (headers[h] === w || headers[h].indexOf(w) >= 0 || w.indexOf(headers[h]) >= 0) return h;
      }
    }
    return -1;
  }
  async function photoFromCell(raw) {
    if (!raw) return "";
    var v = String(raw).trim();
    if (!v) return "";
    if (/^data:image\//i.test(v)) {
      try {
        var blob = await (await fetch(v)).blob();
        var f = new File([blob], "p.jpg", { type: blob.type || "image/jpeg" });
        if (typeof compressPassportImage === "function") return await compressPassportImage(f, 480, 0.72);
        return v.length < 220000 ? v : "";
      } catch (_) { return v.length < 220000 ? v : ""; }
    }
    if (/^https?:\/\//i.test(v)) {
      try {
        var res = await fetch(v, { mode: "cors" });
        if (!res.ok) return "";
        var blob2 = await res.blob();
        var f2 = new File([blob2], "p.jpg", { type: blob2.type || "image/jpeg" });
        if (typeof compressPassportImage === "function") return await compressPassportImage(f2, 480, 0.72);
        return "";
      } catch (err) {
        console.warn("photo url failed", v, err);
        return "";
      }
    }
    return "";
  }
  function pickProgLevel(csvProg, csvLevel) {
    var programme = "", level = "";
    if (fillMode === "force") {
      programme = defaultProgramme || csvProg || "";
      level = defaultLevel || csvLevel || "";
    } else if (fillMode === "csv_only") {
      programme = csvProg || "";
      level = csvLevel || "";
    } else {
      // defaults: CSV wins when present, else form defaults
      programme = csvProg || defaultProgramme || "";
      level = csvLevel || defaultLevel || "";
    }
    return { programme: programme, level: level };
  }

  var headers = splitCsv(lines[0]).map(normHeader);
  var iName = idx(headers, [
    "name", "names", "full name", "names of students", "student name",
    "student names", "fullname of student", "candidate name"
  ]);
  var iReg = idx(headers, [
    "regno", "reg no", "reg number", "registration number", "reg",
    "registration no", "matric no", "matric number"
  ]);
  var iProg = idx(headers, ["programme", "program", "department", "course of study"]);
  var iLevel = idx(headers, ["level", "class level", "year"]);
  var iHostel = idx(headers, ["hostel", "hall", "residence"]);
  var iGender = idx(headers, ["gender", "sex"]);
  var iPhone = idx(headers, ["phone", "mobile", "tel", "telephone"]);
  var iPhoto = idx(headers, [
    "photo", "photo url", "photourl", "image", "image url", "passport",
    "passport url", "photo_url", "image_url"
  ]);
  var iSerial = idx(headers, ["serial", "machine no", "machine id", "user id", "biometric id", "no"]);

  if (iName < 0) {
    alert("CSV must include a Name column (Name, Names, Full name, Student name, …).\nHeaders found: " + headers.join(", "));
    return;
  }

  var added = 0, skippedDup = 0, skippedEmpty = 0, photos = 0, failedPhoto = 0, reviewN = 0;
  var existing = await getAll("students");
  var regSet = {};
  existing.forEach(function(s) {
    if (s.regNo) regSet[String(s.regNo).trim().toLowerCase()] = true;
  });

  for (var r = 1; r < lines.length; r++) {
    var cols = splitCsv(lines[r]);
    var name = (cols[iName] || "").trim();
    if (!name) { skippedEmpty++; continue; }
    var regNo = iReg >= 0 ? String(cols[iReg] || "").trim() : "";
    var csvProg = iProg >= 0 ? String(cols[iProg] || "").trim() : "";
    var csvLevel = iLevel >= 0 ? String(cols[iLevel] || "").trim() : "";
    if (/^mid/i.test(csvProg)) csvProg = "Midwifery";
    else if (/^nurs/i.test(csvProg)) csvProg = "Nursing";
    var pl = pickProgLevel(csvProg, csvLevel);
    var programme = pl.programme;
    if (/^mid/i.test(programme)) programme = "Midwifery";
    else if (/^nurs/i.test(programme)) programme = "Nursing";
    var levelRaw = pl.level;
    var level = levelRaw;
    if (level !== "" && !isNaN(Number(String(level).replace(/[^\d]/g, "")))) {
      level = Number(String(level).replace(/[^\d]/g, ""));
    }
    var gender = iGender >= 0 ? String(cols[iGender] || "").trim() : "";
    var hostel = iHostel >= 0 ? String(cols[iHostel] || "").trim() : "";
    var phone = iPhone >= 0 ? String(cols[iPhone] || "").trim() : "";
    var serial = iSerial >= 0 ? String(cols[iSerial] || "").trim() : "";

    // --- discrepancy / already-present detection ---
    var byReg = regNo ? existing.find(function(s) {
      return String(s.regNo || "").trim().toLowerCase() === regNo.toLowerCase();
    }) : null;
    var nameMatches = [];
    existing.forEach(function(s) {
      var sc = (typeof bioNameScore === "function") ? bioNameScore(name, s.name || "") : 0;
      if (sc >= 0.82) nameMatches.push({ studentId: s.id, name: s.name, regNo: s.regNo || "", score: Math.round(sc * 1000) / 10, serial: s.serial || "" });
    });
    nameMatches.sort(function(a, b) { return b.score - a.score; });

    if (byReg) {
      var sameName = (typeof bioNameScore === "function")
        ? bioNameScore(name, byReg.name || "") >= 0.85
        : String(name).toLowerCase() === String(byReg.name || "").toLowerCase();
      if (sameName) {
        skippedDup++; // exact presence
        continue;
      }
      // same reg, different name → review queue
      await put("biometric_pending", {
        id: "csv_" + Date.now().toString(36) + "_" + r,
        kind: "csv",
        status: "csv_review",
        csvName: name,
        csvRegNo: regNo,
        csvProgramme: programme,
        csvLevel: level,
        csvGender: gender,
        csvHostel: hostel,
        csvPhone: phone,
        machineName: name,
        machineNo: regNo,
        note: "Same reg no on master but name differs (CSV: " + name + " · Master: " + (byReg.name || "") + ")",
        suggestions: [{ studentId: byReg.id, name: byReg.name, regNo: byReg.regNo || "", score: 100 }].concat(nameMatches.slice(0, 3)),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      reviewN++;
      continue;
    }
    if (!regNo && nameMatches.length && nameMatches[0].score >= 90) {
      await put("biometric_pending", {
        id: "csv_" + Date.now().toString(36) + "_" + r,
        kind: "csv",
        status: "csv_review",
        csvName: name,
        csvRegNo: "",
        csvProgramme: programme,
        csvLevel: level,
        csvGender: gender,
        csvHostel: hostel,
        csvPhone: phone,
        machineName: name,
        machineNo: "",
        note: "No reg in CSV; strong name match on master — confirm before adding duplicate",
        suggestions: nameMatches.slice(0, 5),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      reviewN++;
      continue;
    }
    if (regNo && nameMatches.length && nameMatches[0].score >= 90 &&
        String(nameMatches[0].regNo || "").toLowerCase() !== regNo.toLowerCase()) {
      await put("biometric_pending", {
        id: "csv_" + Date.now().toString(36) + "_" + r,
        kind: "csv",
        status: "csv_review",
        csvName: name,
        csvRegNo: regNo,
        csvProgramme: programme,
        csvLevel: level,
        csvGender: gender,
        csvHostel: hostel,
        csvPhone: phone,
        machineName: name,
        machineNo: regNo,
        note: "Name matches master but reg no differs (CSV: " + regNo + " · Master: " + (nameMatches[0].regNo || "—") + ")",
        suggestions: nameMatches.slice(0, 5),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      reviewN++;
      continue;
    }

    var photoDataUrl = "";
    if (iPhoto >= 0 && cols[iPhoto]) {
      photoDataUrl = await photoFromCell(cols[iPhoto]);
      if (photoDataUrl) photos++; else failedPhoto++;
    }
    var now = new Date().toISOString();
    var rec = {
      id: "stu_" + Date.now().toString(36) + "_" + r,
      name: name,
      regNo: regNo,
      programme: programme,
      level: level,
      hostel: hostel,
      gender: gender,
      phone: phone,
      serial: serial,
      photoDataUrl: photoDataUrl || "",
      status: "Active",
      createdAt: now,
      updatedAt: now
    };
    if (photoDataUrl) rec.photoUpdatedAt = now;
    await put("students", rec);
    if (regNo) regSet[regNo.toLowerCase()] = true;
    existing.push(rec);
    added++;
  }

  try {
    await writeAudit({
      action: "create",
      entity: "students",
      entityId: "csv_import",
      reason: "Imported " + added + " students from CSV" +
        (defaultProgramme || defaultLevel ? (" · defaults " + (defaultProgramme || "—") + " / " + (defaultLevel || "—")) : ""),
      details: { added: added, skippedDup: skippedDup, skippedEmpty: skippedEmpty, photos: photos, fileName: file.name || "" }
    });
  } catch (_) {}
  markDirty("student import");
  try { await renderStudentsTable(); } catch (_) {}
  try { refreshDashboardStats(); } catch (_) {}
  try { await renderCsvReviewQueue(); } catch (_) {}

  var msg = "Imported " + added + " student(s).";
  if (skippedDup) msg += " Skipped " + skippedDup + " exact duplicate(s).";
  if (reviewN) msg += " " + reviewN + " row(s) sent to CSV review queue (name/reg mismatch).";
  if (skippedEmpty) msg += " Skipped " + skippedEmpty + " empty name row(s).";
  if (iPhoto >= 0) msg += " Passports loaded " + photos + (failedPhoto ? (" · failed " + failedPhoto) : "") + ".";
  if (defaultProgramme || defaultLevel) {
    msg += " Defaults: " + (defaultProgramme || "(programme from CSV)") + " / " + (defaultLevel || "(level from CSV)") + ".";
  }
  msg += " Publish when ready so other devices see them.";
  alert(msg);
}

async function openStudentCsvImportModal() {
  if (!isQaOfficer()) {
    if (typeof openOfficerLoginGate === "function") openOfficerLoginGate("students");
    else alert("Sign in as QA Officer to import students.");
    return;
  }
  try { await fillProgrammeLevelSelects(); } catch (_) {}
  var prog = document.getElementById("csvImportProgramme");
  var lvl = document.getElementById("csvImportLevel");
  var srcP = document.getElementById("studentProgramme") || document.getElementById("filterProgramme");
  var srcL = document.getElementById("studentLevel") || document.getElementById("filterLevel");
  if (prog && srcP) {
    var keep = prog.value;
    prog.innerHTML = '<option value="">— Use CSV / leave blank —</option>' +
      Array.prototype.slice.call(srcP.options).filter(function(o) { return o.value; }).map(function(o) {
        return '<option value="' + o.value.replace(/"/g, "&quot;") + '">' + o.textContent + "</option>";
      }).join("");
    if (keep) prog.value = keep;
  }
  if (lvl && srcL) {
    var keepL = lvl.value;
    lvl.innerHTML = '<option value="">— Use CSV / leave blank —</option>' +
      Array.prototype.slice.call(srcL.options).filter(function(o) { return o.value; }).map(function(o) {
        return '<option value="' + o.value.replace(/"/g, "&quot;") + '">' + o.textContent + "</option>";
      }).join("");
    // ensure 100/200 style options exist
    if (!lvl.querySelector('option[value="100"]')) {
      [["100", "100 Level"], ["200", "200 Level"], ["300", "300 Level"]].forEach(function(pair) {
        var o = document.createElement("option");
        o.value = pair[0]; o.textContent = pair[1];
        lvl.appendChild(o);
      });
    }
    if (keepL) lvl.value = keepL;
  }
  var fileIn = document.getElementById("csvImportFileInput");
  if (fileIn) fileIn.value = "";
  var modal = document.getElementById("studentCsvImportModal");
  if (modal) modal.hidden = false;
}

function closeStudentCsvImportModal() {
  var modal = document.getElementById("studentCsvImportModal");
  if (modal) modal.hidden = true;
}

async function confirmStudentCsvImport() {
  var fileIn = document.getElementById("csvImportFileInput");
  var file = fileIn && fileIn.files && fileIn.files[0];
  if (!file) {
    alert("Choose a CSV file first.");
    return;
  }
  var programme = (document.getElementById("csvImportProgramme") && document.getElementById("csvImportProgramme").value) || "";
  var level = (document.getElementById("csvImportLevel") && document.getElementById("csvImportLevel").value) || "";
  var fillMode = (document.getElementById("csvImportFillMode") && document.getElementById("csvImportFillMode").value) || "defaults";
  closeStudentCsvImportModal();
  try {
    await importStudentsCsv(file, { programme: programme, level: level, fillMode: fillMode });
  } catch (err) {
    console.error(err);
    alert("Import failed: " + (err && err.message ? err.message : String(err)));
  }
}




async function exportFullSnapshot() {
  if (!isQaOfficer()) return;
  var snap = {
    exportedAt: new Date().toISOString(),
    students: shapeStudentsForRepo(await getAll("students")),
    lecturers: await getAll("lecturers"),
    sessions: await getAll("sessions"),
    qa_entries: await getAll("qa_entries"),
    audit: await getAll("audit"),
    programmes: await getAll("programmes"),
    levels: await getAll("levels"),
    courses: await getAll("courses"),
    attendance: await getAll("attendance"),
    hostel_runs: await getAll("hostel_runs"),
    remedial: await getAll("remedial"),
    timetables: TIMETABLES_CACHE || {}
  };
  downloadJsonReport("EOCNS_Snapshot_" + new Date().toISOString().slice(0, 10) + ".json", snap);
}

async function importFullSnapshot(file) {
  if (!isQaOfficer()) { alert("Sign in as QA Officer to import a snapshot."); return; }
  if (!file) return;
  if (!confirm("Import snapshot? This overwrites local master data with the file contents. Publish afterwards to update the repository.")) return;
  var text;
  try { text = await file.text(); } catch (e) { alert("Could not read file."); return; }
  var snap;
  try { snap = JSON.parse(text); } catch (e) { alert("Invalid JSON. Use an EOCNS snapshot or full backup file."); return; }
  // Support full backup v2 shape: { format: "eocns-full-backup", data: { students: [...] } }
  if (snap && snap.format === "eocns-full-backup" && snap.data) {
    try {
      await restoreFullBackupFromFile(file);
    } catch (err) {
      alert("Full backup restore failed: " + (err && err.message ? err.message : String(err)));
    }
    return;
  }
  // Also accept { data: { students: ... } } without format tag
  if (snap && snap.data && (snap.data.students || snap.data.lecturers) && !snap.students) {
    snap = snap.data;
  }
  async function replaceStore(name, rows) {
    if (!Array.isArray(rows)) return 0;
    var existing = await getAll(name);
    for (var i = 0; i < existing.length; i++) {
      var key = existing[i].id != null ? existing[i].id : (existing[i].code != null ? existing[i].code : existing[i].key);
      if (key != null) {
        try { await del(name, key); } catch (_) {}
      }
    }
    var n = 0;
    for (var j = 0; j < rows.length; j++) {
      try {
        var row = rows[j];
        if (name === "students") row = studentFromRepo(row);
        await put(name, row);
        n++;
      } catch (err) { console.warn("import", name, err); }
    }
    return n;
  }
  var counts = {};
  try {
    if (snap.students) counts.students = await replaceStore("students", snap.students);
    if (snap.lecturers) counts.lecturers = await replaceStore("lecturers", snap.lecturers);
    if (snap.sessions) counts.sessions = await replaceStore("sessions", snap.sessions);
    if (snap.qa_entries) counts.qa_entries = await replaceStore("qa_entries", snap.qa_entries);
    if (snap.audit) counts.audit = await replaceStore("audit", snap.audit);
    if (snap.programmes) counts.programmes = await replaceStore("programmes", snap.programmes);
    if (snap.levels) counts.levels = await replaceStore("levels", snap.levels);
    if (snap.courses) counts.courses = await replaceStore("courses", snap.courses);
    if (snap.attendance) counts.attendance = await replaceStore("attendance", snap.attendance);
    if (snap.hostel_runs) counts.hostel_runs = await replaceStore("hostel_runs", snap.hostel_runs);
    if (snap.remedial) counts.remedial = await replaceStore("remedial", snap.remedial);
    if (snap.discipline) counts.discipline = await replaceStore("discipline", snap.discipline);
    if (snap.pending_students) counts.pending_students = await replaceStore("pending_students", snap.pending_students);
    if (snap.timetables) TIMETABLES_CACHE = snap.timetables;
  } catch (err) {
    alert("Import failed part-way: " + (err && err.message ? err.message : String(err)));
    return;
  }
  markDirty("snapshot import");
  try { await renderStudentsTable(); } catch (_) {}
  try { await renderLecturersTable(); } catch (_) {}
  try { refreshDashboardStats(); } catch (_) {}
  var msg = "Snapshot loaded · students " + (counts.students || 0) +
    " · lecturers " + (counts.lecturers || 0) +
    " · QA entries " + (counts.qa_entries || 0) +
    ". Publish to repository to make it permanent on GitHub.";
  alert(msg);
}
try {
  window.exportFullSnapshot = exportFullSnapshot;
  window.importFullSnapshot = importFullSnapshot;
} catch (_) {}






/* ═══ EOCNS professional report design system ═══ */
var EOCNS_REPORT_LOGO = "assets/eocns-logo.png";
var EOCNS_SCHOOL = {
  name: "Eastern Oak College of Nursing Sciences",
  address: "12 Udensi Ugorji Street, Aguogboriga, Abakaliki, Ebonyi State, Nigeria",
  phones: "0810 082 8004 · 0903 082 9076",
  email: "info@easternoak.org",
  motto: "Knowledge, Integrity & Compassion",
  dept: "QUALITY ASSURANCE DEPARTMENT"
};

function eocnsReportStyles() {
  return [
    "@page{size:A4;margin:14mm 14mm 16mm 14mm}",
    "body{font-family:'Segoe UI',system-ui,-apple-system,sans-serif;color:#0f172a;margin:0;padding:0;line-height:1.45;font-size:12.5px}",
    ".sheet{max-width:190mm;margin:0 auto;padding:8px 4px 24px}",
    ".lh{display:flex;align-items:center;gap:14px;margin-bottom:6px}",
    ".lh img{width:64px;height:64px;object-fit:contain}",
    ".lh-text{flex:1;text-align:center}",
    ".lh-text .school{font-size:15px;font-weight:700;color:#1B3A6B;letter-spacing:0.02em;margin:0}",
    ".lh-text .addr{font-size:10px;color:#64748b;margin:2px 0 0}",
    ".lh-text .motto{font-size:10px;color:#B8860B;font-style:italic;margin:2px 0 0}",
    ".dept-line{text-align:center;font-weight:700;font-size:11px;color:#B8860B;letter-spacing:0.06em;margin:6px 0 4px}",
    ".rule-navy{height:3px;background:#1B3A6B;border:0;margin:4px 0}",
    ".rule-gold{height:1.5px;background:#B8860B;border:0;margin:4px 0 12px}",
    "h1.rtitle{color:#1B3A6B;text-align:center;margin:6px 0 2px;font-size:20px;letter-spacing:0.03em}",
    ".rsub{text-align:center;color:#B8860B;font-weight:600;font-size:12px;margin:0}",
    ".rperiod{text-align:center;color:#64748b;font-size:11px;margin:4px 0 0}",
    "h2.sec{color:#1B3A6B;font-size:11px;margin:18px 0 8px;padding:8px 12px;background:#D6E4F0;border-left:4px solid #1B3A6B;letter-spacing:0.04em}",
    "table.data{width:100%;border-collapse:collapse;font-size:11.5px;margin-top:6px}",
    "table.data th{background:#1B3A6B;color:#fff;padding:7px 8px;text-align:left;font-weight:600}",
    "table.data td{border:1px solid #cbd5e1;padding:6px 8px;vertical-align:top}",
    "table.data tr:nth-child(even) td{background:#F0F4FA}",
    "table.absent th{background:#B91C1C}",
    "table.absent td:first-child{color:#B91C1C;font-weight:700;text-align:center;width:48px}",
    "table.absent tr:nth-child(even) td{background:#FEF2F2}",
    ".kpi{display:flex;gap:0;margin:10px 0;border:1px solid #1B3A6B}",
    ".kpi>div{flex:1;text-align:center;padding:12px 8px;border-right:1px solid #cbd5e1}",
    ".kpi>div:last-child{border-right:0}",
    ".kpi .lab{font-size:10px;font-weight:700;color:#1B3A6B;text-transform:uppercase;letter-spacing:0.04em}",
    ".kpi .val{font-size:22px;font-weight:700;line-height:1.2;margin-top:4px}",
    ".kpi .present{background:#D1FAE5}.kpi .present .val{color:#1B7A3D}",
    ".kpi .absent{background:#FEE2E2}.kpi .absent .val{color:#B91C1C}",
    ".meta{margin:8px 0 12px}",
    ".meta-row{display:grid;grid-template-columns:130px 1fr;gap:4px 10px;font-size:12px;margin:3px 0}",
    ".meta-row b{color:#1B3A6B}",
    ".muted{color:#64748b;font-style:italic}",
    ".sig{display:flex;justify-content:space-between;gap:24px;margin-top:36px;page-break-inside:avoid}",
    ".sig .col{flex:1}",
    ".sig .lab{font-size:10px;color:#64748b;font-weight:700;margin-bottom:28px}",
    ".sig .line{border-top:1px solid #0f172a;padding-top:6px;margin-top:4px}",
    ".sig .name{font-weight:700;color:#1B3A6B;font-size:12px}",
    ".sig .role{font-size:10px;color:#64748b}",
    ".page-foot{margin-top:28px;padding-top:8px;border-top:1px solid #B8860B;font-size:9px;color:#64748b;display:flex;justify-content:space-between}",
    "@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact} .no-print{display:none!important}}"
  ].join("");
}

function reportLetterheadHtml(title, subtitle, periodLine) {
  var S = EOCNS_SCHOOL;
  return (
    '<div class="lh">' +
      '<img src="' + EOCNS_REPORT_LOGO + '" alt="EOCNS logo" onerror="this.style.display=\'none\'"/>' +
      '<div class="lh-text">' +
        '<p class="school">' + escapeHtml(S.name.toUpperCase()) + '</p>' +
        '<p class="addr">' + escapeHtml(S.address) + '</p>' +
        '<p class="addr">' + escapeHtml(S.phones) + ' · ' + escapeHtml(S.email) + '</p>' +
        '<p class="motto">' + escapeHtml(S.motto) + '</p>' +
      '</div>' +
    '</div>' +
    '<hr class="rule-navy"/>' +
    '<div class="dept-line">' + escapeHtml(S.dept) + '</div>' +
    '<h1 class="rtitle">' + escapeHtml(title) + '</h1>' +
    (subtitle ? '<p class="rsub">' + escapeHtml(subtitle) + '</p>' : '') +
    (periodLine ? '<p class="rperiod">' + escapeHtml(periodLine) + '</p>' : '') +
    '<hr class="rule-gold"/>'
  );
}

function reportSignatureHtml(officerName) {
  var gen = new Date().toLocaleString();
  var name = (officerName || "").trim() || "QA Officer";
  return (
    '<div class="sig">' +
      '<div class="col"><div class="lab">Prepared &amp; Released by</div>' +
        '<div class="line"><div class="name">' + escapeHtml(name) + '</div>' +
        '<div class="role">Quality Assurance Officer</div>' +
        '<div class="role">Generated: ' + escapeHtml(gen) + '</div></div></div>' +
      '<div class="col"><div class="lab">For official use</div>' +
        '<div class="line"><div class="name">Head, Quality Assurance</div>' +
        '<div class="role">Date / Stamp</div></div></div>' +
    '</div>' +
    '<div class="page-foot"><span>EOCNS · QUALITY ASSURANCE DEPARTMENT · Confidential</span>' +
    '<span>Released by: ' + escapeHtml(name) + '</span></div>'
  );
}

function promptOfficerAndFormat(defaultTitle) {
  return new Promise(function(resolve) {
    // Officer name is requested every time — never stored for reuse (audit integrity).
    var officer = prompt("Enter the full name of the officer generating/releasing this report:\n(Required — will appear on the report and in the audit trail)", "");
    if (officer == null) { resolve(null); return; }
    officer = String(officer).trim();
    if (!officer) { alert("Officer name is required for every report."); resolve(null); return; }
    var fmt = prompt("Output format — type PDF or WORD (default PDF):", "PDF");
    if (fmt == null) { resolve(null); return; }
    fmt = String(fmt).trim().toLowerCase();
    if (fmt.indexOf("w") === 0) fmt = "word";
    else fmt = "pdf";
    resolve({ officer: officer, format: fmt, title: defaultTitle || "Report" });
  });
}

/** Pull audit rows that touch entities in a date window (for amendment footnotes). */
async function collectReportAmendments(opts) {
  opts = opts || {};
  var from = opts.from || "";
  var to = opts.to || "";
  var entities = opts.entities || ["qa_entries", "students", "lecturers", "timetables", "remedial", "remedial_enrolment", "remedial_logs", "attendance"];
  var rows = [];
  try {
    var audit = await getAll("audit");
    audit.forEach(function(a) {
      if (!a) return;
      var ent = String(a.entity || "");
      if (entities.length && entities.indexOf(ent) < 0) return;
      var at = String(a.at || a.createdAt || a.date || "");
      var day = at.slice(0, 10);
      if (from && day && day < from) return;
      if (to && day && day > to) return;
      if (String(a.action || "") === "create" && !a.externalRef && !a.reason) return;
      rows.push(a);
    });
  } catch (_) {}
  rows.sort(function(a, b) {
    return String(b.at || b.createdAt || "").localeCompare(String(a.at || a.createdAt || ""));
  });
  return rows.slice(0, 40);
}

function reportAmendmentsHtml(rows, officerName) {
  var officer = String(officerName || "").trim() || "the QA officer who released this report";
  if (!rows || !rows.length) {
    return "<div class='amend-footer' style='margin-top:22px;padding:12px 14px;border-top:1px solid #cbd5e1;font-size:11px;line-height:1.45;color:#334155'>" +
      "<strong>Data-change notice:</strong> No audited master-data or log changes were recorded for the window used in this report. " +
      "For clarifications, meet <strong>" + escapeHtml(officer) + "</strong> (Quality Assurance).</div>";
  }
  var n = rows.length;
  var times = rows.map(function(a) {
    return String(a.at || a.timestamp || a.createdAt || a.date || "").slice(0, 10);
  }).filter(function(d) { return d && d.length >= 8; }).sort();
  var fromD = times.length ? times[0] : "";
  var toD = times.length ? times[times.length - 1] : "";
  var entitySet = {};
  rows.forEach(function(a) {
    var e = String(a.entity || "records").replace(/_/g, " ");
    if (e) entitySet[e] = true;
  });
  var entities = Object.keys(entitySet);
  var entityPhrase = entities.length ? entities.join(", ") : "institutional records";
  var rangePhrase = "";
  if (fromD && toD && fromD === toD) rangePhrase = " on <strong>" + escapeHtml(fromD) + "</strong>";
  else if (fromD && toD) rangePhrase = " between <strong>" + escapeHtml(fromD) + "</strong> and <strong>" + escapeHtml(toD) + "</strong>";
  else if (fromD || toD) rangePhrase = " in the period around <strong>" + escapeHtml(fromD || toD) + "</strong>";
  else rangePhrase = " in the reporting window";
  var changeWord = n === 1 ? "change has" : "changes have";
  return "<div class='amend-footer' style='margin-top:22px;padding:12px 14px;border-top:1px solid #cbd5e1;font-size:11px;line-height:1.5;color:#334155'>" +
    "<strong>Data-change notice:</strong> <strong>" + n + "</strong> audited " + changeWord + " been recorded affecting " +
    escapeHtml(entityPhrase) + rangePhrase + ". " +
    "Detailed line-by-line history is held in the system Audit Log. " +
    "For clarifications, meet <strong>" + escapeHtml(officer) + "</strong> (Quality Assurance Department).</div>";
}




function reportGlossaryHtml(extraItems) {
  var items = [
    ["Scheduled", "Contact sessions expected from the official timetable for the selected class and dates (weekends/excluded days omitted)."],
    ["Delivered / Held", "Sessions logged by QA as held or partially held."],
    ["Missed", "Timetable slots with no matching held log in the period."],
    ["Compliance %", "Delivered ÷ Scheduled × 100. Values above 100% mean extra sessions beyond the timetable (over-delivery)."],
    ["At risk (<75%)", "Students whose attendance rate for the period is below 75%."],
    ["Critical (<50%)", "Students below 50% attendance — priority follow-up."],
    ["Perfect (100%)", "Present for every countable session in the window."],
    ["Tentative / UNDEFINED", "Appeared on attendance material but not on the official enrolment list — pending verification."]
  ].concat(extraItems || []);
  var lis = items.map(function(pair) {
    return "<li><b>" + escapeHtml(pair[0]) + ":</b> " + escapeHtml(pair[1]) + "</li>";
  }).join("");
  return "<h2 class='sec'>How to read this report</h2><ul style='font-size:11.5px;line-height:1.55;margin:6px 0 12px 18px'>" + lis + "</ul>";
}

function svgDonut(pct, size, label) {
  size = size || 140;
  pct = Math.max(0, Math.min(100, Number(pct) || 0));
  var r = size / 2 - 12;
  var c = 2 * Math.PI * r;
  var dash = (pct / 100) * c;
  var col = pct >= 80 ? "#1B7A3D" : pct >= 60 ? "#B8860B" : "#B91C1C";
  return "<svg width='" + size + "' height='" + size + "' viewBox='0 0 " + size + " " + size + "' role='img'>" +
    "<circle cx='" + (size/2) + "' cy='" + (size/2) + "' r='" + r + "' fill='none' stroke='#E2E8F0' stroke-width='14'/>" +
    "<circle cx='" + (size/2) + "' cy='" + (size/2) + "' r='" + r + "' fill='none' stroke='" + col + "' stroke-width='14' " +
    "stroke-dasharray='" + dash + " " + (c - dash) + "' stroke-linecap='round' transform='rotate(-90 " + (size/2) + " " + (size/2) + ")'/>" +
    "<text x='50%' y='48%' text-anchor='middle' font-size='22' font-weight='700' fill='#1B3A6B'>" + pct.toFixed(1) + "%</text>" +
    "<text x='50%' y='62%' text-anchor='middle' font-size='10' fill='#64748b'>" + escapeHtml(label || "Compliance") + "</text></svg>";
}

function svgHBarRows(rows, maxW) {
  // rows: [{label, value, max}] value is percent 0-100+
  maxW = maxW || 320;
  if (!rows || !rows.length) return "";
  var h = rows.length * 28 + 10;
  var bars = rows.map(function(r, i) {
    var pct = Number(r.value) || 0;
    var w = Math.min(maxW - 120, Math.max(2, (Math.min(pct, 150) / 150) * (maxW - 120)));
    var col = pct >= 100 ? "#1d4ed8" : pct >= 80 ? "#1B7A3D" : pct >= 50 ? "#B8860B" : "#B91C1C";
    var y = 8 + i * 28;
    return "<text x='0' y='" + (y + 12) + "' font-size='10' fill='#334155'>" + escapeHtml(String(r.label).slice(0, 28)) + "</text>" +
      "<rect x='120' y='" + y + "' width='" + (maxW - 120) + "' height='14' fill='#F1F5F9' rx='3'/>" +
      "<rect x='120' y='" + y + "' width='" + w + "' height='14' fill='" + col + "' rx='3'/>" +
      "<text x='" + (maxW + 6) + "' y='" + (y + 12) + "' font-size='10' font-weight='600' fill='#1B3A6B'>" + pct.toFixed(0) + "%</text>";
  }).join("");
  return "<svg width='" + (maxW + 50) + "' height='" + h + "' xmlns='http://www.w3.org/2000/svg'>" + bars + "</svg>";
}


function openReportWindow(title, bodyHtml, officer, format) {
  var w = window.open("", "_blank");
  if (!w) { alert("Pop-up blocked. Allow pop-ups for this site to view reports."); return; }
  var html = "<!DOCTYPE html><html><head><meta charset='utf-8'/><title>" + escapeHtml(title) + "</title><style>" +
    eocnsReportStyles() + "</style></head><body><div class='sheet'>" + bodyHtml + reportSignatureHtml(officer) +
    "</div>" +
    "<div class='no-print' style='text-align:center;margin:16px'><button onclick='window.print()' style='padding:10px 18px;font-size:14px;cursor:pointer'>Print / Save as PDF</button></div>" +
    "</body></html>";
  w.document.write(html);
  w.document.close();
  if (format === "pdf") {
    setTimeout(function() { try { w.print(); } catch (_) {} }, 500);
  }
  // Word: user can open HTML in Word, or we download .doc
  if (format === "word") {
    try {
      var blob = new Blob(["\ufeff", html], { type: "application/msword" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = (title || "EOCNS_Report").replace(/[^\w\-]+/g, "_") + ".doc";
      a.click();
      setTimeout(function() { URL.revokeObjectURL(a.href); }, 2000);
    } catch (e) { console.warn(e); }
  }
  try {
    writeAudit({
      action: "create", entity: "report", entityId: "report_" + Date.now().toString(36),
      reason: "Generated report: " + title,
      details: { officer: officer, format: format || "pdf" }
    });
  } catch (_) {}
}




  // Expose report design helpers for generators defined outside this boot block
  try {
    window.eocnsReportStyles = eocnsReportStyles;
    window.reportLetterheadHtml = reportLetterheadHtml;
    window.reportSignatureHtml = reportSignatureHtml;
    window.promptOfficerAndFormat = promptOfficerAndFormat;
    window.collectReportAmendments = collectReportAmendments;
    window.reportAmendmentsHtml = reportAmendmentsHtml;
    window.reportGlossaryHtml = reportGlossaryHtml;
    window.svgDonut = svgDonut;
    window.svgHBarRows = svgHBarRows;
    window.openReportWindow = openReportWindow;
  } catch (e) { console.warn("report helper bind", e); }

function classLabelFromKey(key) {
  var m = String(key || "").match(/^(\d+)_(.+)$/);
  if (!m) return String(key || "CLASS").replace(/_/g, " ").toUpperCase();
  return m[1] + " LEVEL " + m[2].replace(/_/g, " ").toUpperCase() + " DEPARTMENT";
}

function formatTimeNice(t) {
  if (!t) return "";
  var m = String(t).match(/^(\d{1,2}):(\d{2})/);
  if (!m) return t;
  var h = Number(m[1]), min = m[2], ap = h >= 12 ? "PM" : "AM";
  var h12 = h % 12; if (!h12) h12 = 12;
  return h12 + ":" + min + " " + ap;
}

function formatDateLong(iso) {
  if (!iso) return "";
  var d = new Date(iso + "T12:00:00");
  if (isNaN(d)) return iso;
  var days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  var months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  return d.getDate() + (d.getDate()===1||d.getDate()===21||d.getDate()===31?"st":d.getDate()===2||d.getDate()===22?"nd":d.getDate()===3||d.getDate()===23?"rd":"th") + " " + months[d.getMonth()] + ", " + d.getFullYear();
}

async function printDailyLectureReport() {
  // bound to window at end of definition for boot listeners

  var meta = await promptOfficerAndFormat("Today's Lecture(s) Report");
  if (!meta) return;
  var date = (document.getElementById("qaDailyDate") && document.getElementById("qaDailyDate").value) || "";
  var classKey = (document.getElementById("qaDailyClass") && document.getElementById("qaDailyClass").value) || "";
  if (!classKey) {
    var prog = (document.getElementById("qaDailyProgramme") && document.getElementById("qaDailyProgramme").value) || "";
    var level = (document.getElementById("qaDailyLevel") && document.getElementById("qaDailyLevel").value) || "";
    if (prog && level && typeof makeClassKey === "function") classKey = makeClassKey(prog, level);
  }
  if (!classKey) classKey = "100_nursing";
  if (!date) { alert("Choose a date on Daily QA first."); return; }
  await ensureTimetables();
  var tt = TIMETABLES_CACHE[classKey] || { slots: [] };
  var weekday = (new Date(date + "T12:00:00").getDay() + 6) % 7;
  var slots = (tt.slots || []).filter(function(s) { return Number(s.weekday) === weekday; });
  var entries = (await getQaEntries()).filter(function(e) { return e.date === date && (e.classKey === classKey || !e.classKey); });
  var sessionName = "Academic Session";
  try {
    var sessions = await getAll("sessions");
    var active = sessions.find(function(s) { return s.status === "Active"; }) || sessions[0];
    if (active) sessionName = active.name || sessionName;
  } catch (_) {}
  var students = await getAll("students");
  function resolveAbsent(list) {
    if (!list || !list.length) return [];
    return list.map(function(a) {
      if (a && typeof a === "object") {
        return { sn: a.serial || a.sn || "", name: a.name || "" };
      }
      var sn = String(a).trim();
      var found = students.find(function(s) {
        return String(s.serial) === sn || String(s.regNo) === sn || (s.name && s.name.toLowerCase() === sn.toLowerCase());
      });
      return { sn: found ? (found.serial || sn) : sn, name: found ? found.name : sn };
    });
  }
  var classLabel = (typeof classLabelFromKey === "function" ? classLabelFromKey(classKey) : classKey);
  var dept = classLabel;
  var period = classLabel + " · " + sessionName + " · " + formatDateLong(date);

  function statusRemark(st) {
    var s = String(st || "").trim();
    if (!s) return "Did not hold";
    if (s.toLowerCase() === "held") return "Held";
    if (s.toLowerCase() === "partial") return "Did not hold (partial)";
    if (s.toLowerCase() === "missed") return "Did not hold";
    return "Did not hold (" + s + ")";
  }
  function entryForSlot(slot) {
    var code = String(slot.code || slot.courseCode || "").trim().toLowerCase();
    var title = String(slot.title || slot.course || "").trim().toLowerCase();
    var found = null;
    entries.forEach(function(e) {
      var c = String(e.course || "").trim().toLowerCase();
      if (code && c.indexOf(code) >= 0) found = e;
      else if (title && (c === title || c.indexOf(title) >= 0 || title.indexOf(c) >= 0)) found = e;
    });
    return found;
  }
  var scheduleRows = slots.map(function(s, i) {
    var ent = entryForSlot(s);
    var remark = ent ? statusRemark(ent.status) : "Did not hold";
    return "<tr><td style='text-align:center'>" + (i + 1) + "</td><td>" + escapeHtml(s.title || s.course || "") +
      "</td><td>" + escapeHtml(s.code || s.courseCode || "") + "</td><td>" + escapeHtml(formatTimeNice(s.start)) +
      "</td><td>" + escapeHtml(formatTimeNice(s.end)) + "</td><td>" + escapeHtml(remark) + "</td></tr>";
  }).join("");
  if (!scheduleRows && entries.length) {
    scheduleRows = entries.map(function(e, i) {
      return "<tr><td style='text-align:center'>" + (i + 1) + "</td><td>" + escapeHtml(e.course || "") +
        "</td><td></td><td>" + escapeHtml(formatTimeNice(e.start)) + "</td><td>" + escapeHtml(formatTimeNice(e.end)) +
        "</td><td>" + escapeHtml(statusRemark(e.status)) + "</td></tr>";
    }).join("");
  }

  var body = reportLetterheadHtml("Today's Lecture(s) Report", dept, period);
  body += "<h2 class='sec'>Course Schedule / Timetable</h2>";
  body += "<table class='data'><thead><tr><th>S/N</th><th>Course Title</th><th>Code</th><th>Start</th><th>End</th><th>Remark</th></tr></thead><tbody>" +
    (scheduleRows || "<tr><td colspan='6' class='muted'>No timetable slots for this weekday.</td></tr>") + "</tbody></table>";

  var allAbsentMap = {};
  var courseBlocks = "";
  // Only status === Held is expanded as a full lecture report. All others = Did not hold.
  var heldEntries = entries.filter(function(e) {
    return String(e.status || "").trim().toLowerCase() === "held";
  });
  var notHeldEntries = entries.filter(function(e) {
    return String(e.status || "").trim().toLowerCase() !== "held";
  });

  heldEntries.forEach(function(e, idx) {
    var absentList = resolveAbsent(e.absentDetails && e.absentDetails.length ? e.absentDetails : e.absent);
    absentList.forEach(function(a) {
      var k = String(a.sn) + "|" + String(a.name);
      allAbsentMap[k] = a;
    });
    var timeStr = (formatTimeNice(e.start) || "") + (e.end ? " – " + formatTimeNice(e.end) : "");
    courseBlocks += reportLetterheadHtml("Today's Lecture(s) Report", "Course " + (idx + 1) + " of " + heldEntries.length, period);
    courseBlocks += "<h2 class='sec'>Course " + (idx + 1) + " Information</h2>";
    courseBlocks += "<div class='meta'>" +
      "<div class='meta-row'><b>Course</b><span>" + escapeHtml(e.course || "—") + "</span></div>" +
      "<div class='meta-row'><b>Lecturer</b><span>" + escapeHtml(e.lecturer || "—") + "</span></div>" +
      "<div class='meta-row'><b>Topic</b><span>" + escapeHtml(e.topic || "—") + "</span></div>" +
      "<div class='meta-row'><b>Date</b><span>" + escapeHtml(formatDateLong(e.date || date)) + "</span></div>" +
      "<div class='meta-row'><b>Time</b><span>" + escapeHtml(timeStr || "—") + "</span></div>" +
      "<div class='meta-row'><b>Status</b><span>" + escapeHtml(e.status || "—") + "</span></div>" +
      "</div>";
    courseBlocks += "<h2 class='sec'>Learning Objectives</h2><p class='" + (e.objectives ? "" : "muted") + "'>" +
      (e.objectives ? escapeHtml(e.objectives).replace(/\n/g, "<br/>") : "Not recorded for this lecture.") + "</p>";
    courseBlocks += "<h2 class='sec'>Lecture Summary</h2><p class='" + ((e.lectureSummary || e.summary) ? "" : "muted") + "'>" +
      (e.lectureSummary || e.summary ? escapeHtml(e.lectureSummary || e.summary).replace(/\n/g, "<br/>") : "Not recorded for this lecture.") + "</p>";
    if (e.remark) courseBlocks += "<p><b>Remarks:</b> " + escapeHtml(e.remark) + "</p>";
    courseBlocks += "<h2 class='sec'>Absent Students (" + absentList.length + ")</h2>";
    if (absentList.length) {
      courseBlocks += "<table class='data absent'><thead><tr><th>S/N</th><th>Full Name</th></tr></thead><tbody>" +
        absentList.map(function(a) {
          return "<tr><td>" + escapeHtml(a.sn) + "</td><td>" + escapeHtml(a.name) + "</td></tr>";
        }).join("") + "</tbody></table>";
    } else {
      courseBlocks += "<p style='color:#1B7A3D;font-weight:600'>Full attendance — no absentees recorded.</p>";
    }
    if (idx < heldEntries.length - 1) courseBlocks += "<div style='page-break-after:always'></div>";
  });

  if (typeof notHeldEntries !== "undefined" && notHeldEntries.length) {
    courseBlocks += "<h2 class='sec'>Lectures that did not hold</h2>";
    courseBlocks += "<p class='narrative'>Only lectures with status <strong>Held</strong> receive a full course report. The sessions below are recorded as <strong>Did not hold</strong>.</p>";
    courseBlocks += "<table class='data'><thead><tr><th>S/N</th><th>Course</th><th>Lecturer</th><th>Logged status</th><th>Remark</th></tr></thead><tbody>";
    notHeldEntries.forEach(function(e, i) {
      courseBlocks += "<tr><td style='text-align:center'>" + (i + 1) + "</td><td>" + escapeHtml(e.course || "—") +
        "</td><td>" + escapeHtml(e.lecturer || "—") + "</td><td>" + escapeHtml(e.status || "—") +
        "</td><td>Did not hold</td></tr>";
    });
    courseBlocks += "</tbody></table>";
  }


  if (courseBlocks) {
    body += "<div style='page-break-after:always'></div>" + courseBlocks;
  }

  // Consolidated
  var consol = Object.keys(allAbsentMap).map(function(k) { return allAbsentMap[k]; });
  consol.sort(function(a, b) {
    var na = parseInt(a.sn, 10), nb = parseInt(b.sn, 10);
    if (!isNaN(na) && !isNaN(nb)) return na - nb;
    return String(a.name).localeCompare(String(b.name));
  });
  var registered = students.filter(function(s) {
    if (s.status && String(s.status).toLowerCase() === "inactive") return false;
    // best-effort class filter
    return true;
  }).length;
  // Prefer class-scoped student count if possible
  try {
    var scoped = students.filter(function(s) {
      if (s.status && String(s.status).toLowerCase() === "inactive") return false;
      var prog = (document.getElementById("qaDailyProgramme") && document.getElementById("qaDailyProgramme").value) || "";
      var level = (document.getElementById("qaDailyLevel") && document.getElementById("qaDailyLevel").value) || "";
      if (prog && s.programme && String(s.programme).toLowerCase().indexOf(String(prog).toLowerCase().slice(0, 4)) < 0) return false;
      if (level && String(s.level) !== String(level) && String(s.level) !== String(level).replace(/\D/g, "")) return false;
      return true;
    });
    if (scoped.length) registered = scoped.length;
  } catch (_) {}
  var absentN = consol.length;
  var presentN = Math.max(0, registered - absentN);

  body += "<div style='page-break-before:always'></div>";
  body += reportLetterheadHtml("Consolidated Attendance Report", dept, period);
  body += "<h2 class='sec'>Attendance Summary</h2>";
  body += "<div class='kpi'><div><div class='lab'>Total Registered</div><div class='val' style='color:#1B3A6B'>" + registered +
    "</div></div><div class='present'><div class='lab'>Present</div><div class='val'>" + presentN +
    "</div></div><div class='absent'><div class='lab'>Absent</div><div class='val'>" + absentN + "</div></div></div>";
  if (registered) {
    var rate = Math.round((presentN / registered) * 1000) / 10;
    body += "<p class='rperiod'>Class attendance rate: <b>" + rate + "%</b> · " + heldEntries.length + " lecture session(s) on record.</p>";
  }
  body += "<h2 class='sec'>Consolidated Absent Students List (" + consol.length + ")</h2>";
  if (consol.length) {
    body += "<table class='data absent'><thead><tr><th>S/N</th><th>Full Name</th></tr></thead><tbody>" +
      consol.map(function(a) {
        return "<tr><td>" + escapeHtml(a.sn) + "</td><td>" + escapeHtml(a.name) + "</td></tr>";
      }).join("") + "</tbody></table>";
  } else {
    body += "<p style='color:#1B7A3D;font-weight:600'>No absentees across recorded lectures.</p>";
  }

  openReportWindow("EOCNS Daily Lecture Report — " + date, body, meta.officer, meta.format);
}
window.printDailyLectureReport = printDailyLectureReport;



async function printWeeklyProfessionalPack(payload) {
  var meta = await promptOfficerAndFormat("Weekly QA Report");
  if (!meta) return;
  var p = payload || window.__weeklyQaPayload;
  if (!p) { alert("Build the weekly report first (Generate weekly report)."); return; }
  var compliance = p.scheduled ? Math.round((p.delivered / p.scheduled) * 1000) / 10 : 0;
  var courseRows = (p.courseRows || []).map(function(r) {
    var st = String(r.status || "");
    var stColor = st.indexOf("Fully Delivered") >= 0 ? "#1B7A3D" : st.indexOf("Did not hold") >= 0 || st.indexOf("Missed") >= 0 ? "#B91C1C" : st.indexOf("Partial") >= 0 ? "#B8860B" : st.indexOf("Over") >= 0 ? "#1d4ed8" : "#64748b";
    return "<tr><td><b>" + escapeHtml(r.course) + "</b></td><td>" + escapeHtml(r.lecturers || r.lecturer || "—") +
      "</td><td style='text-align:center'>" + r.scheduled + "</td><td style='text-align:center;color:#1B7A3D;font-weight:600'>" + r.delivered +
      "</td><td style='text-align:center;color:#B91C1C;font-weight:600'>" + (r.missed || "—") +
      "</td><td style='text-align:center'>" + escapeHtml(String(r.hrs || r.hrsDel || "—")) +
      "</td><td style='color:" + stColor + ";font-weight:600'>" + escapeHtml(st) +
      "</td><td style='text-align:center;font-weight:700'>" + (r.pct != null ? r.pct + "%" : "—") + "</td></tr>";
  }).join("");
  var dayRows = (p.dayRows || []).map(function(r) {
    return "<tr><td>" + escapeHtml(r.date) + "</td><td>" + escapeHtml(r.day || "") + "</td><td><b>" + escapeHtml(r.course) +
      "</b></td><td>" + escapeHtml(r.lecturer || "") + "</td><td>" + escapeHtml(r.topic || "") +
      "</td><td>" + escapeHtml(r.time || "") + "</td><td>" + escapeHtml(String(r.hrs || "")) + "</td></tr>";
  }).join("");
  var barRows = (p.courseRows || []).filter(function(r) { return r.pct != null && r.scheduled > 0; }).map(function(r) {
    return { label: String(r.course).slice(0, 24), value: Number(r.pct) || 0 };
  });
  var amendments = await collectReportAmendments({ from: p.start, to: p.end, entities: ["qa_entries", "timetables", "lecturers", "students"] });
  var period = (p.periodLabel || ((p.start || "") + " – " + (p.end || "")));
  var body = reportLetterheadHtml(
    "EOCNS QA Report — Weekly",
    "Staff Teaching Commitment & Lecture Attendance",
    (typeof classLabelFromKey === "function" ? classLabelFromKey(p.classKey) : p.classKey) + " · " + period
  );
  body += "<h2 class='sec'>Weekly Summary</h2>";
  body += "<div class='kpi'>" +
    "<div><div class='lab'>Scheduled</div><div class='val' style='color:#1B3A6B'>" + p.scheduled + "</div></div>" +
    "<div class='present'><div class='lab'>Delivered</div><div class='val'>" + p.delivered + "</div></div>" +
    "<div class='absent'><div class='lab'>Missed</div><div class='val'>" + p.missed + "</div></div>" +
    "<div><div class='lab'>Compliance</div><div class='val' style='color:" + (compliance >= 80 ? "#1B7A3D" : compliance >= 60 ? "#B8860B" : "#B91C1C") + "'>" + compliance + "%</div></div>" +
    "</div>";
  body += "<p style='font-size:12px;margin:10px 0'>Teaching delivery for this window stands at <b>" + compliance + "%</b> (" +
    p.delivered + " of " + p.scheduled + " scheduled contact sessions logged as held). " +
    (p.missed ? (p.missed + " session(s) were missed and should be rescheduled or explained in audit.") : "No missed sessions were recorded.") + "</p>";
  body += "<div style='display:flex;flex-wrap:wrap;gap:20px;align-items:center;margin:12px 0 8px'>" +
    svgDonut(compliance, 150, "Week rate") +
    "<div style='flex:1;min-width:240px'>" + svgHBarRows(barRows.slice(0, 10), 340) + "</div></div>";
  body += "<h2 class='sec'>Course Compliance</h2>";
  body += "<table class='data'><thead><tr><th>Course</th><th>Lecturer(s)</th><th>Sched</th><th>Deliv</th><th>Missed</th><th>Hrs</th><th>Status</th><th>%</th></tr></thead><tbody>" +
    (courseRows || "<tr><td colspan='8'>No course data.</td></tr>") + "</tbody></table>";
  if (dayRows) {
    body += "<h2 class='sec'>Day-by-day breakdown</h2>";
    body += "<table class='data'><thead><tr><th>Date</th><th>Day</th><th>Course</th><th>Lecturer</th><th>Topic</th><th>Time</th><th>Hrs</th></tr></thead><tbody>" +
      dayRows + "</tbody></table>";
  }
  body += reportGlossaryHtml([
    ["Status: Fully Delivered", "All scheduled slots for that course were logged as held."],
    ["Status: Over-Delivered", "More held sessions than the timetable scheduled for the window."],
    ["Status: Not in Timetable", "A held log exists for a course/slot not on the official timetable."]
  ]);
  body += reportAmendmentsHtml(amendments, (typeof meta !== "undefined" && meta && meta.officer) || (typeof officer !== "undefined" && officer) || "");
  openReportWindow("EOCNS Weekly QA — " + period, body, meta.officer, meta.format);
}
window.printWeeklyProfessionalPack = printWeeklyProfessionalPack;




async function printMonthlyProfessionalPack(payload) {
  var meta = await promptOfficerAndFormat("Monthly QA / Attendance Report");
  if (!meta) return;
  var p = payload || window.__monthlyQaPayload;
  if (!p) { alert("Build the monthly report first."); return; }
  var courseRows = (p.courseRows || []).map(function(r) {
    return "<tr><td>" + escapeHtml(r.course) + "</td><td style='text-align:center'>" + r.scheduled +
      "</td><td style='text-align:center'>" + r.held + "</td><td style='text-align:center'>" + r.missed +
      "</td><td style='text-align:center;font-weight:700'>" + r.rate + "%</td></tr>";
  }).join("");
  var amendments = await collectReportAmendments({ from: p.start, to: p.end, entities: ["qa_entries", "students", "timetables", "lecturers"] });
  var period = p.monthLabel || ((p.start || "") + " – " + (p.end || ""));
  var body = reportLetterheadHtml(
    "EOCNS — Student Attendance & Monthly QA Report",
    "Monthly Lecture Attendance Analysis & Compliance Report",
    (typeof classLabelFromKey === "function" ? classLabelFromKey(p.classKey) : p.classKey) + " · " + period
  );
  body += "<h2 class='sec'>Executive Summary</h2>";
  body += "<div class='kpi'>" +
    "<div><div class='lab'>Registered</div><div class='val' style='color:#1B3A6B'>" + (p.registered != null ? p.registered : "—") + "</div></div>" +
    "<div><div class='lab'>Lecture days</div><div class='val' style='color:#1B3A6B'>" + (p.lectureDays != null ? p.lectureDays : p.scheduled || "—") + "</div></div>" +
    "<div><div class='lab'>Avg attendance</div><div class='val' style='color:#B8860B'>" + (p.avgAtt != null ? p.avgAtt : p.rate) + "%</div></div>" +
    "<div class='absent'><div class='lab'>At risk (&lt;75%)</div><div class='val'>" + (p.atRisk != null ? p.atRisk : "—") + "</div></div>" +
    "<div class='absent'><div class='lab'>Critical (&lt;50%)</div><div class='val'>" + (p.critical != null ? p.critical : "—") + "</div></div>" +
    "</div>";
  body += "<div style='display:flex;flex-wrap:wrap;gap:16px;align-items:center;margin:12px 0'>" +
    svgDonut(Number(p.rate || p.avgAtt || 0), 150, "Period rate") +
    "<div style='flex:1;min-width:220px;font-size:12px'>" +
    (p.perfectNote ? ("<p><b>Perfect attendance:</b> " + escapeHtml(p.perfectNote) + "</p>") : "") +
    "<p>Delivery compliance (lectures held vs scheduled): <b>" + (p.rate != null ? p.rate : "—") + "%</b>. " +
    "Scheduled " + (p.scheduled || "—") + " · Delivered " + (p.delivered || "—") + " · Missed " + (p.missed || "—") + ".</p></div></div>";
  body += "<h2 class='sec'>Course performance</h2>";
  body += "<table class='data'><thead><tr><th>Course</th><th>Scheduled</th><th>Held</th><th>Missed</th><th>Rate</th></tr></thead><tbody>" +
    (courseRows || "<tr><td colspan='5'>No data</td></tr>") + "</tbody></table>";
  body += reportGlossaryHtml();
  body += reportAmendmentsHtml(amendments, (typeof meta !== "undefined" && meta && meta.officer) || (typeof officer !== "undefined" && officer) || "");
  openReportWindow("EOCNS Monthly QA — " + period, body, meta.officer, meta.format);
}
window.printMonthlyProfessionalPack = printMonthlyProfessionalPack;





function downloadAttendanceAsWord() {
  var root = document.getElementById("attendancePrintRoot");
  if (!root) { alert("Build a sheet first (programme + level)."); return; }
  var prog = (document.getElementById("attProgramme") && document.getElementById("attProgramme").value) || "";
  var level = (document.getElementById("attLevel") && document.getElementById("attLevel").value) || "";
  var htmlContent = root.innerHTML;
  // Word-compatible HTML document (opens editable in Microsoft Word / Google Docs / LibreOffice)
  var doc =
    "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>" +
    "<head><meta charset='utf-8'><title>EOCNS Attendance Sheet</title>" +
    "<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View></w:WordDocument></xml><![endif]-->" +
    "<style>" +
    "body{font-family:Arial,Helvetica,sans-serif;font-size:11pt;color:#000}" +
    "h1, .att-sheet-title{font-size:14pt;text-align:center;text-transform:uppercase;margin:0 0 12pt}" +
    "table{border-collapse:collapse;width:100%}" +
    "th,td{border:1px solid #000;padding:6pt 4pt;vertical-align:middle}" +
    "th{background:#f0f0f0;font-weight:bold;text-align:center}" +
    ".att-sn{width:40px;text-align:center}" +
    ".att-mark-cell{height:22pt;width:70px}" +
    ".att-sig-line{margin:10pt 0;font-size:10pt}" +
    "</style></head><body>" + htmlContent + "</body></html>";
  var blob = new Blob(["\ufeff", doc], { type: "application/msword" });
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  var safe = (prog + "_L" + level).replace(/[^\w\-]+/g, "_");
  a.href = url;
  a.download = "EOCNS_Attendance_" + safe + ".doc";
  document.body.appendChild(a);
  a.click();
  setTimeout(function() { URL.revokeObjectURL(url); a.remove(); }, 500);
}

async function fillRemedialSelects() {
  await seedQaDatalists();
  var cSel = document.getElementById("remedialCourse");
  var lSel = document.getElementById("remedialLecturer");
  if (cSel) {
    var opts = '<option value="">— Select —</option>';
    (COURSES_CACHE || []).forEach(function(c) {
      var label = c.code + (c.name ? (" — " + c.name) : "");
      opts += '<option value="' + escapeHtml(label) + '">' + escapeHtml(label) + '</option>';
    });
    cSel.innerHTML = opts;
  }
  if (lSel) {
    await loadLecturers();
    var optsL = '<option value="">— Select —</option>';
    await loadActiveSession();
    lecturersForActiveSession().filter(function(l) { return !l.status || l.status === "Active"; }).forEach(function(l) {
      optsL += '<option value="' + escapeHtml(l.name) + '">' + escapeHtml(l.name) + '</option>';
    });
    lSel.innerHTML = optsL;
  }
}

// ========== REMEDIAL CLASS SYSTEM (standalone) ==========
var REM_META = { sessionId: "", programmes: [], levels: [] };
var REM_TT = { slots: [] };

async function loadRemMeta() {
  try {
    var rows = await getAll("remedial_meta");
    if (rows[0] && rows[0].value) REM_META = rows[0].value;
  } catch (_) {}
  if (!REM_META.programmes) REM_META.programmes = [];
  if (!REM_META.levels) REM_META.levels = [];
  return REM_META;
}
async function saveRemMeta() {
  await put("remedial_meta", { key: "main", value: REM_META });
  markDirty("remedial meta");
}
async function loadRemTt() {
  try {
    var rows = await getAll("remedial_timetable");
    if (rows[0] && rows[0].value) REM_TT = rows[0].value;
  } catch (_) {}
  if (!REM_TT.slots) REM_TT.slots = [];
  return REM_TT;
}
async function saveRemTt() {
  await put("remedial_timetable", { key: "main", value: REM_TT });
  markDirty("remedial timetable");
}

function showRemTab(tab) {
  document.querySelectorAll(".rem-tab").forEach(function(b) {
    b.classList.toggle("active", b.getAttribute("data-rem-tab") === tab);
  });
  ["setup","enrolment","timetable","logging","weekly","summary"].forEach(function(t) {
    var el = document.getElementById("remPanel-" + t);
    if (el) el.hidden = t !== tab;
  });
  if (tab === "setup") renderRemSetup();
  if (tab === "enrolment") renderRemEnrolment();
  if (tab === "timetable") { renderRemAssignments(); renderRemTimetable(); }
  if (tab === "logging") fillRemLogCourses();
}

async function renderRemSetup() {
  await loadRemMeta();
  var pl = document.getElementById("remProgrammesList");
  var ll = document.getElementById("remLevelsList");
  if (pl) pl.innerHTML = (REM_META.programmes || []).map(function(p) {
    return "<li>" + escapeHtml(p.name) + (isQaOfficer() ? ' <button type="button" class="icon-btn-sm" data-del-rem-prog="' + escapeHtml(p.id) + '">Del</button>' : "") + "</li>";
  }).join("") || "<li>None yet</li>";
  if (ll) ll.innerHTML = (REM_META.levels || []).map(function(p) {
    return "<li>" + escapeHtml(p.name) + (isQaOfficer() ? ' <button type="button" class="icon-btn-sm" data-del-rem-lvl="' + escapeHtml(p.id) + '">Del</button>' : "") + "</li>";
  }).join("") || "<li>None yet</li>";
  pl && pl.querySelectorAll("[data-del-rem-prog]").forEach(function(btn) {
    btn.addEventListener("click", async function() {
      if (!isQaOfficer()) return;
      REM_META.programmes = REM_META.programmes.filter(function(p) { return p.id !== btn.getAttribute("data-del-rem-prog"); });
      await saveRemMeta(); renderRemSetup();
    });
  });
  ll && ll.querySelectorAll("[data-del-rem-lvl]").forEach(function(btn) {
    btn.addEventListener("click", async function() {
      if (!isQaOfficer()) return;
      REM_META.levels = REM_META.levels.filter(function(p) { return p.id !== btn.getAttribute("data-del-rem-lvl"); });
      await saveRemMeta(); renderRemSetup();
    });
  });
  var sessions = await getAll("sessions");
  var sel = document.getElementById("remActiveSession");
  if (sel) {
    sel.innerHTML = '<option value="">— Select session —</option>' + sessions.map(function(s) {
      return '<option value="' + escapeHtml(s.id) + '"' + (REM_META.sessionId === s.id ? " selected" : "") + ">" + escapeHtml(s.name) + "</option>";
    }).join("");
  }
}

async function renderRemEnrolment() {
  await loadRemMeta();
  var progSel = document.getElementById("remEnrFilterProg");
  var lvlSel = document.getElementById("remEnrFilterLevel");
  if (progSel) {
    progSel.innerHTML = '<option value="">All programmes</option>' + (REM_META.programmes || []).map(function(p) {
      return '<option value="' + escapeHtml(p.name) + '">' + escapeHtml(p.name) + "</option>";
    }).join("");
  }
  if (lvlSel) {
    lvlSel.innerHTML = '<option value="">All levels</option>' + (REM_META.levels || []).map(function(p) {
      return '<option value="' + escapeHtml(p.name) + '">' + escapeHtml(p.name) + "</option>";
    }).join("");
  }
  var fp = (progSel && progSel.value) || "";
  var fl = (lvlSel && lvlSel.value) || "";
  var list = await getAll("remedial_enrolment");
  list = list.filter(function(s) {
    if (fp && s.programme !== fp) return false;
    if (fl && s.level !== fl) return false;
    return true;
  }).sort(function(a, b) { return String(a.name).localeCompare(String(b.name)); });
  var body = document.getElementById("remEnrolmentBody");
  var empty = document.getElementById("remEnrolmentEmpty");
  if (!body) return;
  if (!list.length) {
    body.innerHTML = "";
    if (empty) empty.hidden = false;
    return;
  }
  if (empty) empty.hidden = true;
  body.innerHTML = list.map(function(s) {
    var actions = isQaOfficer() ? ('<button type="button" class="icon-btn-sm" data-edit-renr="' + s.id + '">Edit</button> <button type="button" class="icon-btn-sm" data-del-renr="' + s.id + '">Del</button>') : "";
    return "<tr><td>" + escapeHtml(s.name) + "</td><td>" + escapeHtml(s.matric) + "</td><td>" + escapeHtml(s.programme || "") +
      "</td><td>" + escapeHtml(s.level || "") + "</td><td>" + escapeHtml((s.courses || []).join(", ")) +
      "</td><td class=\"qa-edit-only\">" + actions + "</td></tr>";
  }).join("");
  body.querySelectorAll("[data-edit-renr]").forEach(function(btn) {
    btn.addEventListener("click", function() { openRemEnrolForm(btn.getAttribute("data-edit-renr")); });
  });
  body.querySelectorAll("[data-del-renr]").forEach(function(btn) {
    btn.addEventListener("click", function() { deleteRemEnrol(btn.getAttribute("data-del-renr")); });
  });
}

async function openRemEnrolForm(id) {
  if (!isQaOfficer()) return;
  await loadRemMeta();
  document.getElementById("remEnrolForm").reset();
  document.getElementById("remEnrolId").value = id || "";
  var ps = document.getElementById("remEnrolProg");
  var ls = document.getElementById("remEnrolLevel");
  ps.innerHTML = (REM_META.programmes || []).map(function(p) { return '<option value="' + escapeHtml(p.name) + '">' + escapeHtml(p.name) + "</option>"; }).join("") || '<option value="">—</option>';
  ls.innerHTML = (REM_META.levels || []).map(function(p) { return '<option value="' + escapeHtml(p.name) + '">' + escapeHtml(p.name) + "</option>"; }).join("") || '<option value="">—</option>';
  if (id) {
    var list = await getAll("remedial_enrolment");
    var s = list.find(function(x) { return x.id === id; });
    if (s) {
      document.getElementById("remEnrolName").value = s.name || "";
      document.getElementById("remEnrolMatric").value = s.matric || "";
      document.getElementById("remEnrolProg").value = s.programme || "";
      document.getElementById("remEnrolLevel").value = s.level || "";
      document.getElementById("remEnrolCourses").value = (s.courses || []).join(", ");
      document.getElementById("remEnrolRef").value = s.ref || "";
    }
  }
  document.getElementById("remEnrolModal").hidden = false;
}

async function saveRemEnrol(e) {
  e.preventDefault();
  if (!isQaOfficer()) return;
  var ref = (document.getElementById("remEnrolRef").value || "").trim();
  if (!ref) { alert("REF required"); return; }
  var id = document.getElementById("remEnrolId").value || null;
  var courses = document.getElementById("remEnrolCourses").value.split(",").map(function(c) { return c.trim(); }).filter(Boolean);
  var rec = {
    id: id || ("renr_" + Date.now().toString(36)),
    name: document.getElementById("remEnrolName").value.trim(),
    matric: document.getElementById("remEnrolMatric").value.trim(),
    programme: document.getElementById("remEnrolProg").value,
    level: document.getElementById("remEnrolLevel").value,
    courses: courses,
    ref: ref,
    updatedAt: new Date().toISOString()
  };
  stampSessionFields(rec);
  await put("remedial_enrolment", rec);
  await writeAudit({ action: id ? "update" : "create", entity: "remedial_enrolment", entityId: rec.id, externalRef: ref, reason: "Remedial enrolment", details: { name: rec.name, courses: courses } });
  markDirty("remedial enrolment");
  document.getElementById("remEnrolModal").hidden = true;
  await renderRemEnrolment();
}

async function deleteRemEnrol(id) {
  if (!isQaOfficer()) return;
  var ref = prompt("REF to delete enrolment:", "REF/EOCNS/QA/");
  if (!ref) return;
  await del("remedial_enrolment", id);
  await writeAudit({ action: "delete", entity: "remedial_enrolment", entityId: id, externalRef: String(ref).trim(), reason: "Remedial enrolment removed" });
  markDirty("remedial enrolment");
  await renderRemEnrolment();
}

async function renderRemAssignments() {
  var list = await getAll("remedial_assignments");
  var body = document.getElementById("remAssignBody");
  if (!body) return;
  body.innerHTML = list.length ? list.map(function(a) {
    var del = isQaOfficer() ? '<button type="button" class="icon-btn-sm" data-del-rass="' + a.id + '">Del</button>' : "";
    return "<tr><td>" + escapeHtml(a.code) + "</td><td>" + escapeHtml(a.title || "") + "</td><td>" + escapeHtml(a.lecturer || "") +
      "</td><td>" + escapeHtml(String(a.hours != null ? a.hours : 2)) + "</td><td class=\"qa-edit-only\">" + del + "</td></tr>";
  }).join("") : "<tr><td colspan=\"5\">No assignments</td></tr>";
  body.querySelectorAll("[data-del-rass]").forEach(function(btn) {
    btn.addEventListener("click", async function() {
      if (!isQaOfficer()) return;
      await del("remedial_assignments", btn.getAttribute("data-del-rass"));
      markDirty("remedial assignments");
      renderRemAssignments(); fillRemLogCourses();
    });
  });
}

async function renderRemTimetable() {
  await loadRemTt();
  var body = document.getElementById("remTtBody");
  if (!body) return;
  body.innerHTML = (REM_TT.slots || []).map(function(s, idx) {
    return "<tr><td>" + s.weekday + "</td><td>" + escapeHtml(s.code || "") + "</td><td>" + escapeHtml(s.start || "") +
      "</td><td>" + escapeHtml(s.end || "") + "</td><td>" + (s.hours != null ? s.hours : 2) +
      "</td><td class=\"qa-edit-only\"><button type=\"button\" class=\"icon-btn-sm\" data-del-rtt=\"" + idx + "\">Del</button></td></tr>";
  }).join("") || "<tr><td colspan=\"6\">No slots</td></tr>";
  body.querySelectorAll("[data-del-rtt]").forEach(function(btn) {
    btn.addEventListener("click", async function() {
      if (!isQaOfficer()) return;
      REM_TT.slots.splice(Number(btn.getAttribute("data-del-rtt")), 1);
      await saveRemTt(); renderRemTimetable();
    });
  });
}

async function fillRemLogCourses() {
  var assigns = await getAll("remedial_assignments");
  var sel = document.getElementById("remLogCourse");
  if (!sel) return;
  sel.innerHTML = '<option value="">— Select —</option>' + assigns.map(function(a) {
    return '<option value="' + escapeHtml(a.code) + '">' + escapeHtml(a.code + (a.title ? " — " + a.title : "")) + "</option>";
  }).join("");
}

async function loadRemLogSheet() {
  var date = document.getElementById("remLogDate").value;
  var code = document.getElementById("remLogCourse").value;
  if (!date || !code) { alert("Date and course required"); return; }
  var enrolled = (await getAll("remedial_enrolment")).filter(function(s) {
    return (s.courses || []).some(function(c) { return String(c).toUpperCase().indexOf(code.toUpperCase()) >= 0 || code.toUpperCase().indexOf(String(c).toUpperCase()) >= 0; });
  });
  var logs = await getAll("remedial_logs");
  var existing = logs.find(function(l) { return l.date === date && l.courseCode === code; });
  var marks = (existing && existing.marks) || {};
  var assigns = await getAll("remedial_assignments");
  var asg = assigns.find(function(a) { return a.code === code; }) || {};
  window.__remLogMeta = { date: date, courseCode: code, lecturer: asg.lecturer || "", hours: asg.hours != null ? asg.hours : 2, studentIds: enrolled.map(function(s) { return s.id; }) };
  var sheet = document.getElementById("remLogSheet");
  if (!sheet) return;
  if (!enrolled.length) {
    sheet.innerHTML = '<div class="card__body"><p>No students enrolled for ' + escapeHtml(code) + '.</p></div>';
    return;
  }
  sheet.innerHTML = '<div class="card__body"><p><strong>' + escapeHtml(code) + '</strong> · ' + escapeHtml(asg.lecturer || "Lecturer TBA") +
    ' · ' + enrolled.length + ' enrolled</p><table class="data-table"><thead><tr><th>#</th><th>Name</th><th>Matric</th><th>P</th><th>A</th></tr></thead><tbody>' +
    enrolled.map(function(s, i) {
      var m = marks[s.id] || "";
      return "<tr><td>" + (i + 1) + "</td><td>" + escapeHtml(s.name) + "</td><td>" + escapeHtml(s.matric) +
        '</td><td><input type="radio" name="rem-' + s.id + '" value="P"' + (m === "P" ? " checked" : "") +
        '/></td><td><input type="radio" name="rem-' + s.id + '" value="A"' + (m === "A" ? " checked" : "") + "/></td></tr>";
    }).join("") + "</tbody></table></div>";
}

async function saveRemLog() {
  if (!isQaOfficer()) return;
  var meta = window.__remLogMeta;
  if (!meta) { alert("Load a sheet first"); return; }
  var ref = prompt("Official REF for this remedial lecture log:", "REF/EOCNS/QA/");
  if (!ref || !String(ref).trim()) return;
  var marks = {};
  (meta.studentIds || []).forEach(function(id) {
    var el = document.querySelector('input[name="rem-' + id + '"]:checked');
    if (el) marks[id] = el.value;
  });
  var logs = await getAll("remedial_logs");
  var prev = logs.find(function(l) { return l.date === meta.date && l.courseCode === meta.courseCode; });
  var rec = {
    id: prev ? prev.id : ("rlog_" + Date.now().toString(36)),
    date: meta.date,
    courseCode: meta.courseCode,
    lecturer: meta.lecturer,
    hours: meta.hours,
    marks: marks,
    status: "Held",
    ref: String(ref).trim(),
    updatedAt: new Date().toISOString()
  };
  stampSessionFields(rec);
  await put("remedial_logs", rec);
  await writeAudit({ action: prev ? "update" : "create", entity: "remedial_logs", entityId: rec.id, externalRef: rec.ref, reason: "Remedial lecture attendance log", details: { date: meta.date, course: meta.courseCode } });
  markDirty("remedial logs");
  alert("Remedial lecture log saved.");
}

function parseExcludeDates(raw) {
  return String(raw || "").split(/[,;\s]+/).map(function(s) { return s.trim(); }).filter(Boolean);
}

async function computeRemWeekly(start, end, excluded) {
  var enrolled = await getAll("remedial_enrolment");
  var logs = await getAll("remedial_logs");
  var assigns = await getAll("remedial_assignments");
  await loadRemTt();
  var days = [];
  var c = new Date(start + "T12:00:00");
  var e = new Date(end + "T12:00:00");
  while (c <= e) {
    var iso = c.toISOString().slice(0, 10);
    if (excluded.indexOf(iso) < 0) days.push(iso);
    c.setDate(c.getDate() + 1);
  }
  // course days from logs in range
  var logsIn = logs.filter(function(l) { return l.date >= start && l.date <= end && excluded.indexOf(l.date) < 0; });
  // per student course-specific attendance
  var studentRows = enrolled.map(function(s) {
    var courses = s.courses || [];
    var possible = 0, present = 0;
    logsIn.forEach(function(l) {
      var match = courses.some(function(c) {
        return String(c).toUpperCase().indexOf(String(l.courseCode).toUpperCase()) >= 0 ||
          String(l.courseCode).toUpperCase().indexOf(String(c).toUpperCase()) >= 0;
      });
      if (!match) return;
      possible += 1;
      if (l.marks && l.marks[s.id] === "P") present += 1;
    });
    var pct = possible ? Math.round((present / possible) * 1000) / 10 : null;
    return { name: s.name, matric: s.matric, programme: s.programme, level: s.level, courses: courses, present: present, possible: possible, pct: pct };
  });
  // lecturer hours
  var lecMap = {};
  assigns.forEach(function(a) {
    lecMap[a.lecturer || "Unassigned"] = lecMap[a.lecturer || "Unassigned"] || { lecturer: a.lecturer || "Unassigned", courses: [], taught: 0, missed: 0 };
    if (a.code) lecMap[a.lecturer || "Unassigned"].courses.push(a.code);
  });
  logsIn.forEach(function(l) {
    var key = l.lecturer || "Unassigned";
    lecMap[key] = lecMap[key] || { lecturer: key, courses: [], taught: 0, missed: 0 };
    if (l.status === "Missed") lecMap[key].missed += Number(l.hours) || 0;
    else lecMap[key].taught += Number(l.hours) || 0;
  });
  var confirmed = studentRows.filter(function(s) { return s.possible > 0 || (s.courses && s.courses.length); });
  var withPct = confirmed.filter(function(s) { return s.pct != null; });
  var avg = withPct.length ? Math.round((withPct.reduce(function(a, s) { return a + s.pct; }, 0) / withPct.length) * 10) / 10 : 0;
  var zero = withPct.filter(function(s) { return s.pct === 0; }).length;
  var perfect = withPct.filter(function(s) { return s.pct === 100; });
  return {
    start: start, end: end, excluded: excluded, lectureDays: days.length,
    registered: enrolled.length, avg: avg, zero: zero, perfect: perfect,
    studentRows: studentRows, lecturerRows: Object.keys(lecMap).map(function(k) { return lecMap[k]; }),
    logsIn: logsIn
  };
}

async function buildRemWeekly() {
  var start = document.getElementById("remWeekStart").value;
  var end = document.getElementById("remWeekEnd").value;
  var excluded = parseExcludeDates(document.getElementById("remWeekExclude").value);
  if (!start || !end) { alert("Start and end dates required"); return; }
  var data = await computeRemWeekly(start, end, excluded);
  window.__remWeekly = data;
  var el = document.getElementById("remWeeklyResult");
  if (!el) return;
  el.innerHTML = '<div class="pro-report"><h3>Weekly remedial analysis</h3>' +
    '<div class="stats-grid">' +
    '<div class="stat-card"><div class="stat-card__body"><span class="stat-card__value">' + data.registered + '</span><span class="stat-card__label">Registered</span></div></div>' +
    '<div class="stat-card"><div class="stat-card__body"><span class="stat-card__value">' + data.lectureDays + '</span><span class="stat-card__label">Lecture days</span></div></div>' +
    '<div class="stat-card"><div class="stat-card__body"><span class="stat-card__value">' + data.avg + '%</span><span class="stat-card__label">Avg attendance</span></div></div>' +
    '<div class="stat-card"><div class="stat-card__body"><span class="stat-card__value">' + data.zero + '</span><span class="stat-card__label">Zero att.</span></div></div>' +
    '</div><p class="muted-note">Course-specific rates use the official enrolment list. Print for the full professional pack.</p></div>';
}

async function printRemWeeklyPack() {
  var meta = await promptOfficerAndFormat("Remedial Weekly Report");
  if (!meta) return;
  var d = window.__remWeekly;
  if (!d) { alert("Build the remedial weekly analysis first."); return; }
  var lecRows = (d.lecturerRows || []).map(function(r) {
    return "<tr><td>" + escapeHtml(r.lecturer) + "</td><td>" + escapeHtml((r.courses || []).join(", ")) +
      "</td><td>" + escapeHtml(String(r.presentDays || r.present || "—")) +
      "</td><td style='color:#B91C1C'>" + escapeHtml(String(r.absentDays || r.absent || "—")) +
      "</td><td>" + escapeHtml(String(r.taught != null ? r.taught + "h" : r.hrsTaught || "—")) +
      "</td><td style='color:#B91C1C'>" + escapeHtml(String(r.missed != null ? r.missed + "h" : r.hrsMissed || "—")) + "</td></tr>";
  }).join("");
  var stuBlocks = "";
  (d.byProgramme || []).forEach(function(pg) {
    var rows = (pg.students || []).map(function(s, i) {
      var pct = s.pct != null ? s.pct : s.rate;
      var col = pct >= 80 ? "#1B7A3D" : pct >= 50 ? "#B8860B" : "#B91C1C";
      return "<tr><td>" + (i + 1) + "</td><td>" + escapeHtml(s.name) + "</td><td>" + escapeHtml(s.regNo || s.matric || "") +
        "</td><td>" + escapeHtml((s.courses || s.enrolled || []).join ? (s.courses || s.enrolled).join(", ") : (s.courses || "")) +
        "</td><td style='text-align:center'>" + escapeHtml(String(s.sess || s.sessions || "")) +
        "</td><td style='text-align:center;font-weight:700;color:" + col + "'>" + (pct != null ? pct + "%" : "—") + "</td></tr>";
    }).join("");
    stuBlocks += "<h2 class='sec'>Student attendance — " + escapeHtml(pg.name || pg.programme || "Programme") + " (course-specific)</h2>";
    stuBlocks += "<p style='font-size:11px;color:#64748b'>Sessions = present course-days ÷ course-days scheduled for that student's enrolled remedial courses only.</p>";
    stuBlocks += "<table class='data'><thead><tr><th>#</th><th>Name</th><th>Matric</th><th>Enrolled courses</th><th>Sess. P/Poss</th><th>%</th></tr></thead><tbody>" +
      (rows || "<tr><td colspan='6'>No students</td></tr>") + "</tbody></table>";
    if (pg.footer) stuBlocks += "<p style='font-size:11px'>" + escapeHtml(pg.footer) + "</p>";
  });
  if (!stuBlocks && d.studentRows) {
    var rows = d.studentRows.map(function(s, i) {
      var pct = s.pct != null ? s.pct : 0;
      var col = pct >= 80 ? "#1B7A3D" : pct >= 50 ? "#B8860B" : "#B91C1C";
      return "<tr><td>" + (i + 1) + "</td><td>" + escapeHtml(s.name) + "</td><td>" + escapeHtml(s.regNo || "") +
        "</td><td style='text-align:center;color:" + col + ";font-weight:700'>" + pct + "%</td></tr>";
    }).join("");
    stuBlocks = "<h2 class='sec'>Student attendance (course-specific)</h2><table class='data'><thead><tr><th>#</th><th>Name</th><th>Matric</th><th>%</th></tr></thead><tbody>" + rows + "</tbody></table>";
  }
  var tentRows = (d.tentative || []).map(function(t, i) {
    return "<tr><td>" + (i + 1) + "</td><td>" + escapeHtml(t.name) + "</td><td>" + escapeHtml(t.regNo || "") +
      "</td><td>" + escapeHtml(String(t.days || "")) + "</td><td style='color:#7c3aed;font-weight:600'>TENTATIVE – UNDEFINED</td></tr>";
  }).join("");
  var amendments = await collectReportAmendments({ from: d.start, to: d.end, entities: ["remedial", "remedial_enrolment", "remedial_logs", "remedial_assignments", "students"] });
  var period = (d.start || "") + " – " + (d.end || "");
  var body = reportLetterheadHtml(
    "EOCNS Quality Assurance Report — Remedial Classes",
    "Course-Specific Student & Lecturer Attendance Analysis",
    period + (d.weekLabel ? " · " + d.weekLabel : "")
  );
  body += "<h2 class='sec'>Executive Summary</h2>";
  body += "<div class='kpi'>" +
    "<div><div class='lab'>Registered</div><div class='val' style='color:#1B3A6B'>" + (d.registered || 0) + "</div></div>" +
    "<div><div class='lab'>Lecture days</div><div class='val' style='color:#1B3A6B'>" + (d.lectureDays || 0) + "</div></div>" +
    "<div><div class='lab'>Avg attendance</div><div class='val' style='color:#B8860B'>" + (d.avg != null ? d.avg : "—") + "%</div></div>" +
    "<div class='absent'><div class='lab'>Zero att. (0%)</div><div class='val'>" + (d.zero || 0) + "</div></div>" +
    "<div><div class='lab'>Tentative</div><div class='val' style='color:#7c3aed'>" + (d.tentativeCount != null ? d.tentativeCount : (d.tentative || []).length) + "</div></div>" +
    "</div>";
  if (d.perfectNames) body += "<p style='font-size:12px'><b>Perfect (100%):</b> " + escapeHtml(d.perfectNames) + "</p>";
  body += "<p style='font-size:11px;color:#64748b'><b>Method:</b> Attendance % is calculated only against the specific courses each student is enrolled in (official Remedial Enrolment List). Presence is counted only on days when those enrolled courses were taught.</p>";
  body += "<div style='margin:10px 0'>" + svgDonut(Number(d.avg || 0), 140, "Avg att.") + "</div>";
  body += "<h2 class='sec'>Lecturer attendance &amp; hours</h2>";
  body += "<table class='data'><thead><tr><th>Lecturer</th><th>Courses</th><th>Present days</th><th>Absent</th><th>Hrs taught</th><th>Hrs missed</th></tr></thead><tbody>" +
    (lecRows || "<tr><td colspan='6'>No lecturer logs</td></tr>") + "</tbody></table>";
  body += stuBlocks;
  if (tentRows) {
    body += "<h2 class='sec'>Tentative records (not on official enrolment list)</h2>";
    body += "<p style='font-size:11px;color:#64748b'>Appeared on attendance sheets but not on Enrolment List — courses marked UNDEFINED. Pending QA verification.</p>";
    body += "<table class='data'><thead><tr><th>#</th><th>Name</th><th>Matric</th><th>Days present</th><th>Status</th></tr></thead><tbody>" + tentRows + "</tbody></table>";
  }
  body += reportGlossaryHtml([
    ["Course-specific %", "Only remedial courses on the student's enrolment list count toward possible sessions."],
    ["Hrs missed", "Contracted or timetable hours not covered by a remedial lecture log."]
  ]);
  body += reportAmendmentsHtml(amendments, (typeof meta !== "undefined" && meta && meta.officer) || (typeof officer !== "undefined" && officer) || "");
  openReportWindow("EOCNS Remedial Weekly — " + period, body, meta.officer, meta.format);
}
window.printRemWeeklyPack = printRemWeeklyPack;



async function buildRemSummary() {
  var start = document.getElementById("remSumStart").value;
  var end = document.getElementById("remSumEnd").value;
  if (!start || !end) { alert("Period required"); return; }
  // treat whole period as one analysis for summary (aggregate)
  var data = await computeRemWeekly(start, end, []);
  // status bands
  data.studentRows.forEach(function(s) {
    var p = s.pct;
    s.status = p == null ? "—" : p >= 80 ? "Excellent" : p >= 65 ? "Good" : p >= 40 ? "At Risk" : "Critical";
  });
  window.__remSummary = data;
  var el = document.getElementById("remSummaryResult");
  if (el) el.innerHTML = '<div class="pro-report"><h3>Summary ready</h3><p class="muted-note">' + data.registered + ' enrolled · avg ' + data.avg + '% · Print summary pack for full tables.</p></div>';
}

async function printRemSummaryPack() {
  var meta = await promptOfficerAndFormat("Remedial Summary Report");
  if (!meta) return;
  var d = window.__remSummary;
  if (!d) { alert("Build remedial summary first."); return; }
  var lecRows = (d.lecturerRows || []).map(function(r) {
    return "<tr><td>" + escapeHtml(r.lecturer) + "</td><td>" + escapeHtml((r.courses || []).join(", ")) +
      "</td><td>" + (r.taught != null ? r.taught + "h" : "—") + "</td><td>" + (r.missed != null ? r.missed + "h" : "—") + "</td></tr>";
  }).join("");
  var tables = "";
  var byProg = {};
  (d.studentRows || []).forEach(function(s) {
    var p = s.programme || "Other";
    byProg[p] = byProg[p] || [];
    byProg[p].push(s);
  });
  Object.keys(byProg).forEach(function(p) {
    byProg[p].sort(function(a, b) { return (b.pct || 0) - (a.pct || 0); });
    var rows = byProg[p].map(function(s, i) {
      var pct = s.pct != null ? s.pct : 0;
      var col = pct >= 80 ? "#1B7A3D" : pct >= 50 ? "#B8860B" : "#B91C1C";
      var status = pct >= 80 ? "Excellent" : pct >= 65 ? "Good" : pct >= 40 ? "At risk" : "Critical";
      return "<tr><td>" + (i + 1) + "</td><td>" + escapeHtml(s.name) + "</td><td>" + escapeHtml(s.regNo || "") +
        "</td><td style='text-align:center;color:" + col + ";font-weight:700'>" + pct + "%</td><td>" + status + "</td></tr>";
    }).join("");
    tables += "<h2 class='sec'>" + escapeHtml(p) + "</h2><table class='data'><thead><tr><th>#</th><th>Name</th><th>Matric</th><th>Avg %</th><th>Band</th></tr></thead><tbody>" + rows + "</tbody></table>";
  });
  var amendments = await collectReportAmendments({ from: d.start, to: d.end, entities: ["remedial", "remedial_enrolment", "remedial_logs", "students"] });
  var period = (d.start || "") + " – " + (d.end || "");
  var body = reportLetterheadHtml(
    "EOCNS Quality Assurance Report — Remedial Summary",
    "Comprehensive Student & Lecturer Performance",
    period
  );
  body += "<h2 class='sec'>Executive overview</h2>";
  body += "<div class='kpi'>" +
    "<div><div class='lab'>Registered</div><div class='val' style='color:#1B3A6B'>" + (d.registered || 0) + "</div></div>" +
    "<div><div class='lab'>Avg attendance</div><div class='val' style='color:#B8860B'>" + (d.avg != null ? d.avg : "—") + "%</div></div>" +
    "<div class='absent'><div class='lab'>Zero att.</div><div class='val'>" + (d.zero || 0) + "</div></div>" +
    "</div>";
  body += "<div style='margin:8px 0'>" + svgDonut(Number(d.avg || 0), 140, "Period avg") + "</div>";
  body += tables;
  body += "<h2 class='sec'>Lecturer hours — period combined</h2>";
  body += "<table class='data'><thead><tr><th>Lecturer</th><th>Courses</th><th>Hrs taught</th><th>Hrs missed</th></tr></thead><tbody>" +
    (lecRows || "<tr><td colspan='4'>No logs</td></tr>") + "</tbody></table>";
  body += reportGlossaryHtml([
    ["Excellent / Good / At risk / Critical", "Bands at ≥80%, ≥65%, ≥40%, and below 40% average course-specific attendance."]
  ]);
  body += reportAmendmentsHtml(amendments, (typeof meta !== "undefined" && meta && meta.officer) || (typeof officer !== "undefined" && officer) || "");
  openReportWindow("EOCNS Remedial Summary — " + period, body, meta.officer, meta.format);
}
window.printRemSummaryPack = printRemSummaryPack;



// legacy stubs so old listeners don't crash
async function renderRemedialTable() { showRemTab("setup"); }
async function openRemedialForm() { showRemTab("logging"); }
function closeRemedialForm() {}
async function saveRemedial(e) { if (e && e.preventDefault) e.preventDefault(); }
async function deleteRemedial() {}


// Ensure QA print packs include amendment transparency footer
(function() {
  function withAmendFooter(html) {
    var foot = "";
    try { foot = amendmentFooterHtml(window.__lastQaReportEntries || []); } catch (_) {}
    if (!foot) return html;
    if (html.indexOf("</body>") >= 0) return html.replace("</body>", foot + "</body>");
    return html + foot;
  }
  var _open = window.open;
  // soft: patch known print functions if defined later - already have amendmentFooterHtml on remedial

// ========== Student photo + full record + Discipline (DSA) ==========
function compressPassportImage(file, maxSide, quality) {
  maxSide = maxSide || 480;
  quality = quality || 0.72;
  return new Promise(function(resolve, reject) {
    var url = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function() {
      var w = img.width, h = img.height;
      var scale = Math.min(1, maxSide / Math.max(w, h));
      var cw = Math.max(1, Math.round(w * scale));
      var ch = Math.max(1, Math.round(h * scale));
      var canvas = document.createElement("canvas");
      canvas.width = cw; canvas.height = ch;
      var ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, cw, ch);
      URL.revokeObjectURL(url);
      var dataUrl = canvas.toDataURL("image/jpeg", quality);
      // second pass if still large (>120KB)
      if (dataUrl.length > 160000) {
        dataUrl = canvas.toDataURL("image/jpeg", 0.55);
      }
      resolve(dataUrl);
    };
    img.onerror = function() { URL.revokeObjectURL(url); reject(new Error("Could not read image")); };
    img.src = url;
  });
}

async function saveStudentPassport(studentId, dataUrl) {
  var all = await getAll("students");
  var s = all.find(function(x) { return x.id === studentId; });
  if (!s) throw new Error("Student not found");
  s.photoDataUrl = dataUrl;
  s.photoUpdatedAt = new Date().toISOString();
  await put("students", s);
  markDirty("student photo");
  await writeAudit({
    action: "update", entity: "students", entityId: studentId,
    reason: "Passport photograph updated (auto-compressed)",
    details: { bytesApprox: dataUrl.length }
  });
  return s;
}

async function openStudentProfile(id) {
  var all = await getAll("students");
  var s = all.find(function(x) { return x.id === id; });
  if (!s) return;
  window.__profileStudentId = id;
  document.getElementById("studentProfileTitle").textContent = s.name || "Student";
  var rem = [];
  try {
    rem = (await getAll("remedial_enrolment")).filter(function(r) {
      return r.matric === s.regNo || (r.name && s.name && r.name.toLowerCase() === s.name.toLowerCase());
    });
  } catch (_) {}
  var disc = [];
  try {
    disc = (await getAll("discipline")).filter(function(d) {
      return d.subjectId === s.id || (d.subjectRef && s.regNo && d.subjectRef === s.regNo) ||
        (d.name && s.name && d.name.toLowerCase() === s.name.toLowerCase());
    });
  } catch (_) {}
  var initials = (s.name || "?").split(/\s+/).map(function(p) { return p[0]; }).join("").slice(0, 2).toUpperCase();
  var photoHtml = s.photoDataUrl
    ? '<div class="passport-frame"><img src="' + s.photoDataUrl + '" alt="Passport" /></div>'
    : '<div class="passport-frame" title="No photo">' + escapeHtml(initials) + "</div>";
  var body = document.getElementById("studentProfileBody");
  body.innerHTML =
    '<div class="profile-layout">' + photoHtml +
    '<div class="profile-meta">' +
    "<p><strong>Reg. No:</strong> " + escapeHtml(s.regNo || "—") + "</p>" +
    "<p><strong>Programme / Level:</strong> " + escapeHtml(s.programme || "—") + " · " + escapeHtml(String(s.level || "—")) + "</p>" +
    "<p><strong>Hostel:</strong> " + escapeHtml(s.hostel || "—") + "</p>" +
    "<p><strong>Status:</strong> " + escapeHtml(s.status || "Active") + "</p>" +
    "<p><strong>Gender / Phone:</strong> " + escapeHtml(s.gender || "—") + " · " + escapeHtml(s.phone || "—") + "</p>" +
    "<p><strong>Active session:</strong> " + (ACTIVE_SESSION ? escapeHtml(ACTIVE_SESSION.name) + semesterSuffixHtml() : "—") + "</p>" +
    "<p><strong>Remedial:</strong> " + (rem.length ? rem.map(function(r) { return escapeHtml((r.courses || r.courseCodes || []).join(", ") || "enrolled"); }).join(" | ") : "None on file") + "</p>" +
    "<p><strong>Discipline cases:</strong> " + (disc.length ? disc.length + " on file" : "None on file") + "</p>" +
    "<p class=\"muted-note\">Open <strong>Full record</strong> for hostel runs, class attendance, QA absences, remedial logs and audit — with section and full reports.</p>" +
    "</div></div>";
  var drawer = document.getElementById("studentProfileDrawer");
  if (drawer) {
    drawer.hidden = false;
    drawer.removeAttribute("hidden");
    drawer.style.display = "";
  }
  bindStudentProfileCloseHandlers();
}

async function handleProfilePhotoUpload(file) {
  if (!isQaOfficer()) { alert("Sign in as QA Officer to set passport photos."); return; }
  var id = window.__profileStudentId;
  if (!id || !file) return;
  try {
    var dataUrl = await compressPassportImage(file, 480, 0.72);
    await saveStudentPassport(id, dataUrl);
    await openStudentProfile(id);
    alert("Passport photo saved (automatically compressed for clean storage). Publish when ready.");
  } catch (err) {
    alert("Photo failed: " + (err.message || String(err)));
  }
}


function studentRecordMatchKeys(s) {
  return {
    id: s && s.id ? String(s.id) : "",
    reg: s && s.regNo ? String(s.regNo).trim().toUpperCase() : "",
    serial: s && s.serial ? String(s.serial).trim() : "",
    name: s && s.name ? String(s.name).trim().toLowerCase() : ""
  };
}

function rowMatchesStudent(row, keys) {
  if (!row || !keys) return false;
  if (keys.id && (row.studentId === keys.id || row.subjectId === keys.id || row.id === keys.id)) return true;
  if (keys.reg) {
    var r = String(row.regNo || row.matric || row.subjectRef || row.reg || "").trim().toUpperCase();
    if (r && r === keys.reg) return true;
  }
  if (keys.serial) {
    var ser = String(row.serial || row.machineNo || row.sn || "").trim();
    if (ser && ser === keys.serial) return true;
  }
  if (keys.name && row.name && String(row.name).trim().toLowerCase() === keys.name) return true;
  return false;
}

async function buildStudentFullRecord(id) {
  var all = await getAll("students");
  var s = all.find(function(x) { return x.id === id; });
  if (!s) return null;
  var keys = studentRecordMatchKeys(s);

  // QA lecture absences
  var qa = [];
  try { qa = await getAll("qa_entries"); } catch (_) { qa = []; }
  var absents = [];
  (qa || []).forEach(function(e) {
    var hit = false;
    if (Array.isArray(e.absentDetails)) {
      hit = e.absentDetails.some(function(d) {
        return d.id === s.id || (keys.reg && d.regNo && String(d.regNo).toUpperCase() === keys.reg) ||
          (keys.name && d.name && String(d.name).toLowerCase() === keys.name);
      });
    }
    if (!hit && Array.isArray(e.absent)) {
      hit = e.absent.some(function(a) {
        var t = String(a).toLowerCase();
        return (keys.name && t.indexOf(keys.name) >= 0) || (keys.reg && t.indexOf(keys.reg.toLowerCase()) >= 0);
      });
    }
    if (hit) absents.push(e);
  });
  absents.sort(function(a, b) { return String(b.date || "").localeCompare(String(a.date || "")); });

  // Class attendance sheets (per day/course mark)
  var classAtt = [];
  try {
    var sheets = await getAll("attendance");
    (sheets || []).forEach(function(sheet) {
      if (!sheet || !sheet.marks) return;
      var mark = null;
      if (sheet.marks[s.id] != null) mark = sheet.marks[s.id];
      else if (keys.reg && sheet.marks[keys.reg] != null) mark = sheet.marks[keys.reg];
      else {
        Object.keys(sheet.marks).forEach(function(mid) {
          if (mark != null) return;
          if (keys.reg && String(mid).toUpperCase() === keys.reg) mark = sheet.marks[mid];
        });
      }
      if (mark == null) return;
      classAtt.push({
        date: sheet.date || "",
        course: sheet.course || "",
        programme: sheet.programme || "",
        level: sheet.level || "",
        mark: mark,
        sheetId: sheet.id
      });
    });
  } catch (_) {}
  classAtt.sort(function(a, b) { return String(b.date || "").localeCompare(String(a.date || "")); });

  // Hostel runs — matrix keyed by machine ID / serial
  var hostel = [];
  try {
    var runs = await getAll("hostel_runs");
    (runs || []).forEach(function(run) {
      if (!run) return;
      var matrix = run.matrix || run.attendance || {};
      var studentMeta = run.students || run.roster || {};
      var matchKey = null;
      if (keys.serial && matrix[keys.serial] != null) matchKey = keys.serial;
      if (!matchKey && keys.serial && studentMeta[keys.serial]) matchKey = keys.serial;
      if (!matchKey) {
        Object.keys(studentMeta).forEach(function(k) {
          if (matchKey) return;
          var meta = studentMeta[k] || {};
          if (rowMatchesStudent(meta, keys) || (keys.serial && k === keys.serial)) matchKey = k;
        });
      }
      if (!matchKey && keys.reg) {
        Object.keys(matrix).forEach(function(k) {
          if (matchKey) return;
          var meta = studentMeta[k] || {};
          if (String(meta.regNo || "").toUpperCase() === keys.reg) matchKey = k;
        });
      }
      if (!matchKey) return;
      var days = matrix[matchKey];
      var present = 0, absent = 0, dayList = [];
      if (days && typeof days === "object") {
        if (Array.isArray(days)) {
          days.forEach(function(d) {
            dayList.push(d);
            if (d === "P" || d === true || d === "present") present++;
            else absent++;
          });
        } else {
          Object.keys(days).forEach(function(dk) {
            var v = days[dk];
            dayList.push(dk + ":" + v);
            if (v === "P" || v === true || v === "present" || v === 1) present++;
            else if (v === "A" || v === false || v === "absent" || v === 0) absent++;
          });
        }
      }
      var fine = 0;
      try {
        if (run.fines && run.fines[matchKey] != null) fine = Number(run.fines[matchKey]) || 0;
      } catch (_) {}
      hostel.push({
        runId: run.id,
        label: run.label || run.title || ((run.startDate || "") + " → " + (run.endDate || "")),
        startDate: run.startDate || "",
        endDate: run.endDate || "",
        machineNo: matchKey,
        present: present,
        absent: absent,
        fine: fine,
        hostelName: (studentMeta[matchKey] && studentMeta[matchKey].hostel) || s.hostel || "",
        amendments: (run.amendments || []).filter(function(a) {
          return rowMatchesStudent(a, keys) || (a && String(a.machineNo || a.serial || "") === String(matchKey));
        })
      });
    });
  } catch (_) {}
  hostel.sort(function(a, b) { return String(b.startDate || "").localeCompare(String(a.startDate || "")); });

  // Remedial enrolment + logs
  var rem = [];
  try {
    rem = (await getAll("remedial_enrolment")).filter(function(r) { return rowMatchesStudent(r, keys) || (r.matric && keys.reg && String(r.matric).toUpperCase() === keys.reg); });
  } catch (_) {}
  var remLogs = [];
  try {
    var logs = await getAll("remedial_logs");
    (logs || []).forEach(function(log) {
      if (!log) return;
      if (rowMatchesStudent(log, keys)) { remLogs.push(log); return; }
      if (log.marks && (log.marks[s.id] != null || (keys.reg && log.marks[keys.reg] != null))) {
        remLogs.push({
          date: log.date || "",
          course: log.course || log.code || "",
          mark: log.marks[s.id] != null ? log.marks[s.id] : log.marks[keys.reg],
          sessionName: log.sessionName || ""
        });
      }
      if (Array.isArray(log.presentIds) && log.presentIds.indexOf(s.id) >= 0) {
        remLogs.push({ date: log.date || "", course: log.course || log.code || "", mark: "P", sessionName: log.sessionName || "" });
      }
      if (Array.isArray(log.absentDetails) && log.absentDetails.some(function(d) { return rowMatchesStudent(d, keys); })) {
        remLogs.push({ date: log.date || "", course: log.course || log.code || "", mark: "A", sessionName: log.sessionName || "" });
      }
    });
  } catch (_) {}

  // Discipline
  var disc = [];
  try {
    disc = (await getAll("discipline")).filter(function(d) { return rowMatchesStudent(d, keys); });
  } catch (_) {}
  disc.sort(function(a, b) { return String(b.date || "").localeCompare(String(a.date || "")); });

  // Audit
  var audit = [];
  try {
    audit = (await getAll("audit")).filter(function(a) {
      if (!a) return false;
      if (a.entityId === s.id) return true;
      if (a.details && rowMatchesStudent(a.details, keys)) return true;
      return false;
    }).slice(0, 50);
  } catch (_) {}

  return {
    student: s,
    absents: absents,
    classAttendance: classAtt,
    hostel: hostel,
    remedial: rem,
    remedialLogs: remLogs,
    discipline: disc,
    audit: audit
  };
}

async function openStudentFullRecord(id) {
  id = id || window.__profileStudentId;
  if (!id) return;
  var data = await buildStudentFullRecord(id);
  if (!data) return;
  var s = data.student;
  document.getElementById("studentFullRecordTitle").textContent = "DSA full record — " + (s.name || "");
  var photo = s.photoDataUrl
    ? '<div class="passport-frame" style="margin-bottom:12px"><img src="' + s.photoDataUrl + '" alt="" /></div>'
    : "";
  function section(title, count, inner, reportKey) {
    var badge = count != null ? " (" + count + ")" : "";
    var btn = reportKey
      ? ' <button type="button" class="btn btn--ghost btn--sm qa-edit-only" data-stu-report="' + reportKey + '">Report</button>'
      : "";
    return '<div class="record-section" style="margin-top:14px;padding-top:12px;border-top:1px solid var(--border)">' +
      "<h4 style=\"margin:0 0 8px;display:flex;align-items:center;gap:8px;flex-wrap:wrap\">" + title + badge + btn + "</h4>" +
      inner + "</div>";
  }
  function none() { return '<p class="muted-note" style="margin:0">None on file</p>'; }
  function tableWrap(head, rows) {
    if (!rows) return none();
    return '<div class="table-scroll" style="max-height:220px;overflow:auto"><table class="data-table"><thead><tr>' + head +
      "</tr></thead><tbody>" + rows + "</tbody></table></div>";
  }

  var discRows = data.discipline.length ? data.discipline.map(function(d) {
    return "<tr><td>" + escapeHtml(d.date || "") + "</td><td>" + escapeHtml(d.type || "") + "</td><td>" +
      escapeHtml(d.status || "") + "</td><td>" + escapeHtml(d.ref || "") + "</td><td>" + escapeHtml(d.summary || d.details || "") + "</td></tr>";
  }).join("") : "";

  var hostRows = data.hostel.length ? data.hostel.map(function(h) {
    return "<tr><td>" + escapeHtml(h.label || "") + "</td><td>" + escapeHtml(String(h.machineNo || "—")) +
      "</td><td>" + h.present + "</td><td>" + h.absent + "</td><td>" + (h.fine ? ("₦" + h.fine) : "—") + "</td></tr>";
  }).join("") : "";

  var classRows = data.classAttendance.length ? data.classAttendance.slice(0, 100).map(function(c) {
    return "<tr><td>" + escapeHtml(c.date || "") + "</td><td>" + escapeHtml(c.course || "") +
      "</td><td>" + escapeHtml(String(c.mark)) + "</td><td>" + escapeHtml(c.programme || "") + " " + escapeHtml(String(c.level || "")) + "</td></tr>";
  }).join("") : "";

  var absRows = data.absents.length ? data.absents.map(function(e) {
    return "<tr><td>" + escapeHtml(e.date || "") + "</td><td>" + escapeHtml(e.course || "") +
      "</td><td>" + escapeHtml(e.status || "") + "</td><td>" + escapeHtml(e.classKey || "") + "</td></tr>";
  }).join("") : "";

  var remInner = "";
  if (!data.remedial.length && !data.remedialLogs.length) remInner = none();
  else {
    remInner = "";
    if (data.remedial.length) {
      remInner += "<p style=\"margin:0 0 6px\"><strong>Enrolment:</strong> " + data.remedial.map(function(r) {
        return escapeHtml((r.courses || r.courseCodes || []).join(", ") || "enrolled");
      }).join(" · ") + "</p>";
    }
    if (data.remedialLogs.length) {
      remInner += tableWrap("<th>Date</th><th>Course</th><th>Mark</th>", data.remedialLogs.slice(0, 50).map(function(l) {
        return "<tr><td>" + escapeHtml(l.date || "") + "</td><td>" + escapeHtml(l.course || "") +
          "</td><td>" + escapeHtml(String(l.mark || "")) + "</td></tr>";
      }).join(""));
    }
  }

  var auditRows = data.audit.length ? data.audit.map(function(a) {
    return "<tr><td>" + escapeHtml(a.at || a.timestamp || a.createdAt || "") + "</td><td>" +
      escapeHtml(a.action || "") + "</td><td>" + escapeHtml(a.user || a.officer || "") +
      "</td><td>" + escapeHtml(a.reason || "") + "</td></tr>";
  }).join("") : "";

  var body = document.getElementById("studentFullRecordBody");
  body.innerHTML = photo +
    "<p style=\"margin:0 0 8px\"><strong>" + escapeHtml(s.name) + "</strong><br/>" +
    "Reg: " + escapeHtml(s.regNo || "—") + " · Machine ID: " + escapeHtml(s.serial || "—") + "<br/>" +
    escapeHtml(s.programme || "") + " · Level " + escapeHtml(String(s.level || "")) +
    " · Hostel: " + escapeHtml(s.hostel || "—") + " · Status: " + escapeHtml(s.status || "Active") + "</p>" +
    '<p class="muted-note" style="margin:0 0 8px">Sections pull every stored hostel, class, discipline, remedial and audit touch for this student. Generate a section report or the full dossier.</p>' +
    section("1. Disciplinary cases", data.discipline.length, tableWrap("<th>Date</th><th>Type</th><th>Status</th><th>REF</th><th>Notes</th>", discRows), "discipline") +
    section("2. Hostel attendance runs", data.hostel.length, tableWrap("<th>Run</th><th>Machine ID</th><th>Present</th><th>Absent</th><th>Fine</th>", hostRows), "hostel") +
    section("3. Class attendance sheets", data.classAttendance.length, tableWrap("<th>Date</th><th>Course</th><th>Mark</th><th>Class</th>", classRows), "class") +
    section("4. QA lecture absences", data.absents.length, tableWrap("<th>Date</th><th>Course</th><th>Status</th><th>Class</th>", absRows), "absences") +
    section("5. Remedial", (data.remedial.length + data.remedialLogs.length), remInner, "remedial") +
    section("6. Audit trail", data.audit.length, tableWrap("<th>When</th><th>Action</th><th>Who</th><th>Reason</th>", auditRows), "audit");

  body.querySelectorAll("[data-stu-report]").forEach(function(btn) {
    btn.addEventListener("click", function() {
      printStudentSectionReport(id, btn.getAttribute("data-stu-report"));
    });
  });

  window.__fullRecordStudentId = id;
  var modal = document.getElementById("studentFullRecordModal");
  if (modal) { modal.hidden = false; modal.removeAttribute("hidden"); modal.style.display = ""; }
}

function closeStudentFullRecord() {
  var m = document.getElementById("studentFullRecordModal");
  if (!m) return;
  m.hidden = true; m.setAttribute("hidden", ""); m.style.display = "none";
}
window.closeStudentFullRecord = closeStudentFullRecord;
if (typeof openStudentFullRecord === "function") window.openStudentFullRecord = openStudentFullRecord;
if (typeof printStudentSummary === "function") window.printStudentSummary = printStudentSummary;
if (typeof printStudentSectionReport === "function") window.printStudentSectionReport = printStudentSectionReport;

function studentDossierStyles() {
  return "body{font-family:Segoe UI,system-ui,sans-serif;color:#0f172a;padding:24px;max-width:900px;margin:0 auto}" +
    "h1{font-size:1.25rem;margin:0 0 6px}h2{font-size:1.05rem;margin:18px 0 8px;border-bottom:2px solid #0d9488;padding-bottom:4px}" +
    "table{border-collapse:collapse;width:100%;font-size:0.85rem}th,td{border:1px solid #cbd5e1;padding:6px 8px;text-align:left}" +
    "th{background:#f1f5f9}.muted{color:#64748b;font-size:0.82rem}.kpi{display:inline-block;margin:4px 8px 4px 0;padding:6px 10px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0}";
}

async function printStudentSectionReport(id, section) {
  id = id || window.__fullRecordStudentId || window.__profileStudentId;
  if (!id) return;
  var data = await buildStudentFullRecord(id);
  if (!data) return;
  var s = data.student;
  var titleMap = {
    discipline: "Disciplinary cases",
    hostel: "Hostel attendance",
    class: "Class attendance",
    absences: "QA lecture absences",
    remedial: "Remedial",
    audit: "Audit trail",
    full: "Full student dossier"
  };
  var title = titleMap[section] || "Student report";
  var body = "";
  body += "<h1>EOCNS — " + title + "</h1>";
  body += "<p class=\"muted\">Quality Assurance / Student Affairs · Generated " + new Date().toLocaleString() + "</p>";
  body += "<p><strong>" + escapeHtml(s.name || "") + "</strong><br/>Reg: " + escapeHtml(s.regNo || "—") +
    " · Machine ID: " + escapeHtml(s.serial || "—") + "<br/>" +
    escapeHtml(s.programme || "") + " · Level " + escapeHtml(String(s.level || "")) +
    " · Hostel: " + escapeHtml(s.hostel || "—") + "</p>";

  function addTable(headers, rowsHtml) {
    if (!rowsHtml) return "<p class=\"muted\">None on file.</p>";
    return "<table><thead><tr>" + headers.map(function(h) { return "<th>" + h + "</th>"; }).join("") +
      "</tr></thead><tbody>" + rowsHtml + "</tbody></table>";
  }

  if (section === "discipline" || section === "full") {
    body += "<h2>Disciplinary cases (" + data.discipline.length + ")</h2>";
    body += addTable(["Date", "Type", "Status", "REF", "Notes"], data.discipline.map(function(d) {
      return "<tr><td>" + escapeHtml(d.date || "") + "</td><td>" + escapeHtml(d.type || "") + "</td><td>" +
        escapeHtml(d.status || "") + "</td><td>" + escapeHtml(d.ref || "") + "</td><td>" +
        escapeHtml(d.summary || d.details || "") + "</td></tr>";
    }).join(""));
  }
  if (section === "hostel" || section === "full") {
    body += "<h2>Hostel attendance runs (" + data.hostel.length + ")</h2>";
    body += addTable(["Run", "Machine ID", "Present", "Absent", "Fine"], data.hostel.map(function(h) {
      return "<tr><td>" + escapeHtml(h.label || "") + "</td><td>" + escapeHtml(String(h.machineNo || "")) +
        "</td><td>" + h.present + "</td><td>" + h.absent + "</td><td>" + (h.fine ? ("NGN " + h.fine) : "—") + "</td></tr>";
    }).join(""));
  }
  if (section === "class" || section === "full") {
    body += "<h2>Class attendance sheets (" + data.classAttendance.length + ")</h2>";
    body += addTable(["Date", "Course", "Mark", "Class"], data.classAttendance.map(function(c) {
      return "<tr><td>" + escapeHtml(c.date || "") + "</td><td>" + escapeHtml(c.course || "") +
        "</td><td>" + escapeHtml(String(c.mark)) + "</td><td>" + escapeHtml(c.programme || "") + " " +
        escapeHtml(String(c.level || "")) + "</td></tr>";
    }).join(""));
  }
  if (section === "absences" || section === "full") {
    body += "<h2>QA lecture absences (" + data.absents.length + ")</h2>";
    body += addTable(["Date", "Course", "Status", "Class"], data.absents.map(function(e) {
      return "<tr><td>" + escapeHtml(e.date || "") + "</td><td>" + escapeHtml(e.course || "") +
        "</td><td>" + escapeHtml(e.status || "") + "</td><td>" + escapeHtml(e.classKey || "") + "</td></tr>";
    }).join(""));
  }
  if (section === "remedial" || section === "full") {
    body += "<h2>Remedial</h2>";
    if (data.remedial.length) {
      body += "<p><strong>Enrolment:</strong> " + data.remedial.map(function(r) {
        return escapeHtml((r.courses || r.courseCodes || []).join(", ") || "enrolled");
      }).join(" · ") + "</p>";
    } else body += "<p class=\"muted\">No remedial enrolment on file.</p>";
    body += addTable(["Date", "Course", "Mark"], data.remedialLogs.map(function(l) {
      return "<tr><td>" + escapeHtml(l.date || "") + "</td><td>" + escapeHtml(l.course || "") +
        "</td><td>" + escapeHtml(String(l.mark || "")) + "</td></tr>";
    }).join(""));
  }
  if (section === "audit" || section === "full") {
    body += "<h2>Audit trail (" + data.audit.length + ")</h2>";
    body += addTable(["When", "Action", "Who", "Reason"], data.audit.map(function(a) {
      return "<tr><td>" + escapeHtml(a.at || a.timestamp || a.createdAt || "") + "</td><td>" +
        escapeHtml(a.action || "") + "</td><td>" + escapeHtml(a.user || a.officer || "") +
        "</td><td>" + escapeHtml(a.reason || "") + "</td></tr>";
    }).join(""));
  }

  if (section === "full") {
    body += "<h2>Summary counts</h2>";
    body += "<div class=\"kpi\">Discipline: <strong>" + data.discipline.length + "</strong></div>";
    body += "<div class=\"kpi\">Hostel runs: <strong>" + data.hostel.length + "</strong></div>";
    body += "<div class=\"kpi\">Class marks: <strong>" + data.classAttendance.length + "</strong></div>";
    body += "<div class=\"kpi\">QA absences: <strong>" + data.absents.length + "</strong></div>";
    body += "<div class=\"kpi\">Remedial logs: <strong>" + data.remedialLogs.length + "</strong></div>";
  }

  var w = window.open("", "_blank");
  if (!w) return;
  w.document.write("<!DOCTYPE html><html><head><title>" + title + " — " + escapeHtml(s.name || "") +
    "</title><style>" + studentDossierStyles() + "</style></head><body>" + body +
    "<p class=\"muted\">Eastern Oak College of Nursing Sciences · Confidential student affairs record</p></body></html>");
  w.document.close();
  setTimeout(function() { w.print(); }, 350);
}

async function printStudentSummary() {
  var id = window.__fullRecordStudentId || window.__profileStudentId;
  if (!id) return;
  await printStudentSectionReport(id, "full");
}

async function renderDisciplineTable() {
  var tbody = document.getElementById("disciplineTableBody");
  if (!tbody) return;
  if (!isQaOfficer()) {
    tbody.innerHTML = "<tr><td colspan=\"7\">Sign in as QA Officer to view and manage the disciplinary register.</td></tr>";
    return;
  }
  var list = await getAll("discipline");
  var sub = (document.getElementById("discFilterSubject") && document.getElementById("discFilterSubject").value) || "";
  var st = (document.getElementById("discFilterStatus") && document.getElementById("discFilterStatus").value) || "";
  var q = ((document.getElementById("discSearch") && document.getElementById("discSearch").value) || "").toLowerCase().trim();
  list = list.filter(function(d) {
    if (sub && d.subjectType !== sub) return false;
    if (st && d.status !== st) return false;
    if (q) {
      var blob = ((d.name || "") + " " + (d.ref || "") + " " + (d.summary || "") + " " + (d.subjectRef || "")).toLowerCase();
      if (blob.indexOf(q) < 0) return false;
    }
    return true;
  });
  list.sort(function(a, b) { return String(b.date || "").localeCompare(String(a.date || "")); });
  var count = document.getElementById("discCount");
  if (count) count.textContent = list.length + " case" + (list.length !== 1 ? "s" : "");
  tbody.innerHTML = list.length ? list.map(function(d) {
    return "<tr><td>" + escapeHtml(d.date || "—") + "</td><td>" + escapeHtml(d.subjectType || "") +
      "</td><td>" + escapeHtml(d.name || "—") + "</td><td>" + escapeHtml(d.type || "—") +
      "</td><td>" + escapeHtml(d.status || "—") + "</td><td>" + escapeHtml(d.ref || "—") +
      '</td><td class="qa-edit-only"><button type="button" class="icon-btn-sm" data-edit-disc="' + d.id + '">Edit</button> ' +
      '<button type="button" class="icon-btn-sm" data-del-disc="' + d.id + '">Del</button></td></tr>';
  }).join("") : "<tr><td colspan=\"7\">No cases match filters.</td></tr>";
  tbody.querySelectorAll("[data-edit-disc]").forEach(function(btn) {
    btn.addEventListener("click", function() { openDisciplineForm(btn.getAttribute("data-edit-disc")); });
  });
  tbody.querySelectorAll("[data-del-disc]").forEach(function(btn) {
    btn.addEventListener("click", function() { deleteDisciplineCase(btn.getAttribute("data-del-disc")); });
  });
}

async function openDisciplineForm(id) {
  if (!isQaOfficer()) return;
  document.getElementById("disciplineForm").reset();
  document.getElementById("discId").value = id || "";
  document.getElementById("disciplineModalTitle").textContent = id ? "Edit disciplinary case" : "New disciplinary case";
  // datalist names
  var dl = document.getElementById("discNameList");
  if (dl) {
    var students = await getAll("students");
    var lecturers = await getAll("lecturers");
    dl.innerHTML = students.map(function(s) { return '<option value="' + escapeHtml(s.name) + '">'; }).join("") +
      lecturers.map(function(l) { return '<option value="' + escapeHtml(l.name) + '">'; }).join("");
  }
  if (id) {
    var all = await getAll("discipline");
    var d = all.find(function(x) { return x.id === id; });
    if (d) {
      document.getElementById("discSubjectType").value = d.subjectType || "student";
      document.getElementById("discDate").value = d.date || "";
      document.getElementById("discName").value = d.name || "";
      document.getElementById("discSubjectRef").value = d.subjectRef || "";
      document.getElementById("discSubjectId").value = d.subjectId || "";
      document.getElementById("discType").value = d.type || "Written warning";
      document.getElementById("discStatus").value = d.status || "Open";
      document.getElementById("discSummary").value = d.summary || "";
      document.getElementById("discOutcome").value = d.outcome || "";
      document.getElementById("discRef").value = d.ref || "";
    }
  } else {
    document.getElementById("discDate").value = new Date().toISOString().slice(0, 10);
  }
  var m = document.getElementById("disciplineModal");
  if (m) { m.hidden = false; m.removeAttribute("hidden"); m.style.display = ""; }
}

function closeDisciplineForm() {
  var m = document.getElementById("disciplineModal");
  if (!m) return;
  m.hidden = true; m.setAttribute("hidden", ""); m.style.display = "none";
}

async function saveDisciplineCase(e) {
  e.preventDefault();
  if (!isQaOfficer()) return;
  var id = (document.getElementById("discId").value || "").trim() || null;
  var ref = (document.getElementById("discRef").value || "").trim();
  var name = (document.getElementById("discName").value || "").trim();
  var summary = (document.getElementById("discSummary").value || "").trim();
  if (!ref || !name || !summary) { alert("Name, summary and official REF are required."); return; }
  var now = new Date().toISOString();
  var rec = {
    id: id || ("disc_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)),
    subjectType: document.getElementById("discSubjectType").value || "student",
    date: document.getElementById("discDate").value,
    name: name,
    subjectRef: (document.getElementById("discSubjectRef").value || "").trim(),
    subjectId: (document.getElementById("discSubjectId").value || "").trim(),
    type: document.getElementById("discType").value,
    status: document.getElementById("discStatus").value,
    summary: summary,
    outcome: (document.getElementById("discOutcome").value || "").trim(),
    ref: ref,
    updatedAt: now
  };
  if (!id) rec.createdAt = now;
  stampSessionFields(rec);
  await put("discipline", rec);
  await writeAudit({
    action: id ? "update" : "create",
    entity: "discipline",
    entityId: rec.id,
    externalRef: ref,
    reason: id ? "Disciplinary case updated" : "Disciplinary case opened",
    details: { name: name, subjectType: rec.subjectType, type: rec.type, status: rec.status }
  });
  markDirty("discipline");
  closeDisciplineForm();
  await renderDisciplineTable();
}

async function deleteDisciplineCase(id) {
  if (!isQaOfficer()) return;
  var ref = prompt("Official REF to delete this case:", "REF/EOCNS/DSA/");
  if (!ref || !String(ref).trim()) return;
  if (!confirm("Delete this disciplinary case?")) return;
  await del("discipline", id);
  await writeAudit({ action: "delete", entity: "discipline", entityId: id, externalRef: String(ref).trim(), reason: "Disciplinary case deleted" });
  markDirty("discipline");
  await renderDisciplineTable();
}

async function printDisciplineRegister() {
  if (!isQaOfficer()) return;
  var list = await getAll("discipline");
  list.sort(function(a, b) { return String(b.date || "").localeCompare(String(a.date || "")); });
  var w = window.open("", "_blank");
  if (!w) return;
  var rows = list.map(function(d, i) {
    return "<tr><td>" + (i + 1) + "</td><td>" + escapeHtml(d.date || "") + "</td><td>" + escapeHtml(d.subjectType || "") +
      "</td><td>" + escapeHtml(d.name || "") + "</td><td>" + escapeHtml(d.type || "") + "</td><td>" +
      escapeHtml(d.status || "") + "</td><td>" + escapeHtml(d.ref || "") + "</td></tr>";
  }).join("");
  w.document.write("<!DOCTYPE html><html><head><title>Discipline register</title><style>body{font-family:Georgia,serif;padding:24px}table{border-collapse:collapse;width:100%;font-size:0.9rem}th,td{border:1px solid #ccc;padding:6px;text-align:left}h1{color:#0d9488}</style></head><body>" +
    "<h1>EOCNS Disciplinary Register</h1>" +
    (ACTIVE_SESSION ? "<p>Session: " + escapeHtml(ACTIVE_SESSION.name) + semesterSuffixHtml() + "</p>" : "") +
    "<table><thead><tr><th>#</th><th>Date</th><th>Subject</th><th>Name</th><th>Type</th><th>Status</th><th>REF</th></tr></thead><tbody>" +
    (rows || "<tr><td colspan=7>No cases</td></tr>") + "</tbody></table>" +
    "<p style=\"margin-top:16px;font-size:0.85rem;color:#64748b\">Generated " + new Date().toLocaleString() + " · Officer-only register</p></body></html>");
  w.document.close();
  setTimeout(function() { w.print(); }, 300);
}


// ===== Pending student registrations (self-service queue) =====
async function refreshPendingFromRepo() {
  try {
    var list = await fetchRepoJson(DATA_FILES.pending_students + "?t=" + Date.now());
    if (!Array.isArray(list)) list = [];
    var existing = await getAll("pending_students");
    for (var i = 0; i < existing.length; i++) {
      try { await del("pending_students", existing[i].id); } catch (_) {}
    }
    for (var j = 0; j < list.length; j++) {
      try { await put("pending_students", list[j]); } catch (_) {}
    }
    return list;
  } catch (err) {
    console.warn("pending hydrate", err);
    return getAll("pending_students");
  }
}

async function renderPendingRegistrations() {
  var tbody = document.getElementById("pendingTableBody");
  if (!tbody) return;
  if (!isQaOfficer()) {
    tbody.innerHTML = "<tr><td colspan=\"7\">Sign in as QA Officer to review student self-registrations.</td></tr>";
    return;
  }
  await refreshPendingFromRepo();
  var list = (await getAll("pending_students")).filter(function(p) { return !p.status || p.status === "pending"; });
  list.sort(function(a, b) { return String(b.submittedAt || "").localeCompare(String(a.submittedAt || "")); });
  var count = document.getElementById("pendingCount");
  if (count) count.textContent = list.length + " pending";
  if (!list.length) {
    tbody.innerHTML = "<tr><td colspan=\"7\">No pending registrations. Share the student form: <code>register.html</code></td></tr>";
    return;
  }
  tbody.innerHTML = list.map(function(p) {
    var thumb = p.photoDataUrl
      ? '<img src="' + p.photoDataUrl + '" alt="" style="width:40px;height:50px;object-fit:cover;border-radius:4px;border:1px solid #cbd5e1" />'
      : "—";
    return "<tr><td>" + thumb + "</td><td>" + escapeHtml(p.name || "") +
      "</td><td>" + escapeHtml(p.regNo || "") + "</td><td>" + escapeHtml(p.programme || "") + " / " + escapeHtml(String(p.level || "")) +
      "</td><td>" + escapeHtml(p.email || "") + "</td><td>" + escapeHtml((p.submittedAt || "").slice(0, 16).replace("T", " ")) +
      '</td><td class="qa-edit-only">' +
      '<button type="button" class="icon-btn-sm" data-pend-view="' + p.id + '">Review</button> ' +
      '<button type="button" class="icon-btn-sm" data-pend-ok="' + p.id + '">Approve</button> ' +
      '<button type="button" class="icon-btn-sm" data-pend-no="' + p.id + '">Reject</button></td></tr>';
  }).join("");
  tbody.querySelectorAll("[data-pend-view]").forEach(function(btn) {
    btn.addEventListener("click", function() { if (window.openPendingReview) window.openPendingReview(btn.getAttribute("data-pend-view")); });
  });
  tbody.querySelectorAll("[data-pend-ok]").forEach(function(btn) {
    btn.addEventListener("click", function() { if (window.approvePendingStudent) window.approvePendingStudent(btn.getAttribute("data-pend-ok")); });
  });
  tbody.querySelectorAll("[data-pend-no]").forEach(function(btn) {
    btn.addEventListener("click", function() { if (window.rejectPendingStudent) window.rejectPendingStudent(btn.getAttribute("data-pend-no")); });
  });
}

async function openPendingReview(id) {
  var list = await getAll("pending_students");
  var p = list.find(function(x) { return x.id === id; });
  if (!p) return;
  var photo = p.photoDataUrl ? '<div class="passport-frame"><img src="' + p.photoDataUrl + '" alt="" /></div>' : "";
  var html = '<div class="profile-layout">' + photo + '<div class="profile-meta">' +
    "<p><strong>" + escapeHtml(p.name) + "</strong></p>" +
    "<p>Reg: " + escapeHtml(p.regNo || "—") + "</p>" +
    "<p>Email: " + escapeHtml(p.email || "—") + "</p>" +
    "<p>" + escapeHtml(p.programme || "") + " · Level " + escapeHtml(String(p.level || "")) + "</p>" +
    "<p>Gender: " + escapeHtml(p.gender || "—") + " · Phone: " + escapeHtml(p.phone || "—") + "</p>" +
    "<p>Hostel: " + escapeHtml(p.hostel || "—") + "</p>" +
    "<p class=\"muted-note\">Submitted " + escapeHtml(p.submittedAt || "") + "</p></div></div>";
  var body = document.getElementById("pendingReviewBody");
  if (body) body.innerHTML = html;
  window.__pendingReviewId = id;
  window.__pendingRejectId = id;
  var m = document.getElementById("pendingReviewModal");
  if (m) { m.hidden = false; m.removeAttribute("hidden"); m.style.display = ""; }
}

function closePendingReview() {
  var m = document.getElementById("pendingReviewModal");
  if (!m) return;
  m.hidden = true; m.setAttribute("hidden", ""); m.style.display = "none";
}

async function approvePendingStudent(id) {
  if (!isQaOfficer()) return;
  id = id || window.__pendingReviewId;
  if (!id) return;
  var pin = prompt("Enter officer PIN to approve this registration onto the master list:");
  if (pin == null) return;
  if (String(pin).trim() !== String((APP_CONFIG && APP_CONFIG.qaPin) || "EOCNS-QA")) {
    alert("Incorrect PIN. Not approved.");
    return;
  }
  var list = await getAll("pending_students");
  var p = list.find(function(x) { return x.id === id; });
  if (!p) return;
  var students = await getAll("students");
  if (students.some(function(s) { return s.regNo && p.regNo && String(s.regNo).toLowerCase() === String(p.regNo).toLowerCase(); })) {
    alert("Reg. No already exists on master list. Reject or correct this submission.");
    return;
  }
  var now = new Date().toISOString();
  var student = {
    id: generateId("stu"),
    name: p.name,
    regNo: p.regNo,
    programme: p.programme,
    level: p.level,
    gender: p.gender || "",
    phone: p.phone || "",
    hostel: p.hostel || "",
    photoDataUrl: p.photoDataUrl || "",
    status: "Active",
    email: p.email || "",
    createdAt: now,
    updatedAt: now,
    source: "self_registration",
    pendingId: p.id
  };
  if (student.photoDataUrl) student.photoUpdatedAt = now;
  await put("students", student);
  await del("pending_students", id);
  // rewrite pending file list locally
  var left = (await getAll("pending_students")).filter(function(x) { return x.id !== id; });
  await writeAudit({
    action: "create",
    entity: "students",
    entityId: student.id,
    reason: "Approved self-registration " + (p.regNo || ""),
    details: { pendingId: id, email: p.email }
  });
  markDirty("pending approve");
  closePendingReview();
  await renderPendingRegistrations();
  await renderStudentsTable();
  try {
    await publishPendingListToRepo("Approve registration — update pending list");
  } catch (err) {
    console.warn(err);
  }
  alert("Approved onto master list and removed from pending. Publish full data when convenient so students.json is on the repository.");
}



async function rejectPendingStudent(id) {
  /* bound to window below */
  try {
    if (!isQaOfficer()) {
      alert("Sign in as QA Officer under Settings before rejecting registrations.");
      return;
    }
    id = id || window.__pendingReviewId || window.__pendingRejectId;
    if (!id) {
      alert("No pending registration selected. Use Reject on a row or open Review first.");
      return;
    }
    window.__pendingRejectId = id;
    var list = await getAll("pending_students");
    var p = list.find(function(x) { return x.id === id; });
    if (!p) {
      // try refresh from repo once
      try { await refreshPendingFromRepo(); } catch (_) {}
      list = await getAll("pending_students");
      p = list.find(function(x) { return x.id === id; });
    }
    if (!p) {
      alert("Submission not found. It may already have been removed. Refreshing list…");
      await renderPendingRegistrations();
      return;
    }
    var sum = document.getElementById("pendingRejectSummary");
    if (sum) {
      sum.textContent = (p.name || "Applicant") + " · " + (p.regNo || "no reg") + " · " + (p.email || "");
    }
    var reasonEl = document.getElementById("pendingRejectReason");
    if (reasonEl) reasonEl.value = "Passport photo or details need correction. Applicant may resubmit via the registration page.";
    var pinEl = document.getElementById("pendingRejectPin");
    if (pinEl) pinEl.value = "";
    var m = document.getElementById("pendingRejectModal");
    if (m) {
      m.hidden = false;
      m.removeAttribute("hidden");
      m.style.display = "";
    } else {
      // fallback prompts
      await confirmRejectPendingStudent(id, null, null);
    }
  } catch (err) {
    console.error(err);
    alert("Could not open reject dialog: " + (err.message || String(err)));
  }
}

function closePendingRejectModal() {
  var m = document.getElementById("pendingRejectModal");
  if (!m) return;
  m.hidden = true;
  m.setAttribute("hidden", "");
  m.style.display = "none";
}

async function confirmRejectPendingStudent(forcedId, forcedReason, forcedPin) {
  try {
    if (!isQaOfficer()) {
      alert("Sign in as QA Officer under Settings before rejecting registrations.");
      return;
    }
    var id = forcedId || window.__pendingRejectId || window.__pendingReviewId;
    if (!id) { alert("No submission selected."); return; }
    var reason = forcedReason;
    if (reason == null) {
      reason = (document.getElementById("pendingRejectReason") && document.getElementById("pendingRejectReason").value || "").trim();
    }
    if (!reason) { alert("A reason is required."); return; }
    var pin = forcedPin;
    if (pin == null) {
      pin = (document.getElementById("pendingRejectPin") && document.getElementById("pendingRejectPin").value || "").trim();
    }
    if (!pin) { alert("Officer PIN is required."); return; }
    var expected = String((APP_CONFIG && APP_CONFIG.qaPin) || "EOCNS-QA").trim();
    if (String(pin).trim() !== expected) {
      alert("Incorrect PIN. Submission was not rejected.");
      return;
    }

    var list = await getAll("pending_students");
    var p = list.find(function(x) { return x.id === id; });
    if (!p) {
      alert("Submission not found (already removed?).");
      closePendingRejectModal();
      await renderPendingRegistrations();
      return;
    }

    try { await del("pending_students", id); } catch (err) {
      alert("Failed to delete locally: " + (err.message || err));
      return;
    }

    try {
      await writeAudit({
        action: "delete",
        entity: "pending_students",
        entityId: id,
        reason: "Rejected self-registration: " + reason,
        details: { email: p.email, regNo: p.regNo, name: p.name, notify: "manual_only" }
      });
    } catch (_) {}
    markDirty("pending reject");
    closePendingRejectModal();
    closePendingReview();
    await renderPendingRegistrations();

    try {
      await publishPendingListToRepo("Reject registration " + (p.regNo || id) + " — remove from pending list");
      alert("Rejected and removed from the pending list (synced to repository).\nReason logged in audit.");
    } catch (err) {
      console.error(err);
      alert("Removed from local pending list, but repository sync failed:\n" + (err.message || err) + "\n\nUse Settings → Publish when online so it stays removed.");
    }
  } catch (err) {
    console.error(err);
    alert("Reject failed: " + (err.message || String(err)));
  }
}



async function publishPendingListToRepo(message) {
  var workerUrl = (APP_CONFIG && APP_CONFIG.publishWorkerUrl || "").trim();
  var key = (APP_CONFIG && APP_CONFIG.publishWorkerKey || "").trim();
  if (!workerUrl) throw new Error("publishWorkerUrl missing in config");
  var list = await getAll("pending_students");
  // only keep pending or all remaining records
  list = list.filter(function(p) { return p && p.id; });
  var files = {};
  files[DATA_FILES.pending_students] = JSON.stringify(list, null, 2);
  var headers = { "Content-Type": "application/json" };
  if (key) headers["X-EOCNS-Key"] = key;
  var res = await fetch(workerUrl.replace(/\/$/, ""), {
    method: "POST",
    headers: headers,
    body: JSON.stringify({
      action: "publish",
      publishKey: key,
      message: message || "Update pending student registrations",
      files: files
    })
  });
  var body = {};
  try { body = await res.json(); } catch (_) {}
  if (!res.ok) throw new Error(body.error || ("Worker HTTP " + res.status));
  return body;
}






})();

async function printQaPackWithAmendments(title, bodyHtml) {
  var w = window.open("", "_blank");
  if (!w) return;
  var html = "<!DOCTYPE html><html><head><title>" + title + "</title><style>" + eocnsReportStyles() + "</style></head><body>" +
    bodyHtml + amendmentFooterHtml(window.__lastQaReportEntries || []) + "</body></html>";
  w.document.write(html);
  w.document.close();
  setTimeout(function() { w.print(); }, 350);
}


// ========== Student photo + full record + Discipline (DSA) ==========
function compressPassportImage(file, maxSide, quality) {
  maxSide = maxSide || 480;
  quality = quality || 0.72;
  return new Promise(function(resolve, reject) {
    var url = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function() {
      var w = img.width, h = img.height;
      var scale = Math.min(1, maxSide / Math.max(w, h));
      var cw = Math.max(1, Math.round(w * scale));
      var ch = Math.max(1, Math.round(h * scale));
      var canvas = document.createElement("canvas");
      canvas.width = cw; canvas.height = ch;
      var ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, cw, ch);
      URL.revokeObjectURL(url);
      var dataUrl = canvas.toDataURL("image/jpeg", quality);
      // second pass if still large (>120KB)
      if (dataUrl.length > 160000) {
        dataUrl = canvas.toDataURL("image/jpeg", 0.55);
      }
      resolve(dataUrl);
    };
    img.onerror = function() { URL.revokeObjectURL(url); reject(new Error("Could not read image")); };
    img.src = url;
  });
}

async function saveStudentPassport(studentId, dataUrl) {
  var all = await getAll("students");
  var s = all.find(function(x) { return x.id === studentId; });
  if (!s) throw new Error("Student not found");
  s.photoDataUrl = dataUrl;
  s.photoUpdatedAt = new Date().toISOString();
  await put("students", s);
  markDirty("student photo");
  await writeAudit({
    action: "update", entity: "students", entityId: studentId,
    reason: "Passport photograph updated (auto-compressed)",
    details: { bytesApprox: dataUrl.length }
  });
  return s;
}

async function openStudentProfile(id) {
  var all = await getAll("students");
  var s = all.find(function(x) { return x.id === id; });
  if (!s) return;
  window.__profileStudentId = id;
  document.getElementById("studentProfileTitle").textContent = s.name || "Student";
  var rem = [];
  try {
    rem = (await getAll("remedial_enrolment")).filter(function(r) {
      return r.matric === s.regNo || (r.name && s.name && r.name.toLowerCase() === s.name.toLowerCase());
    });
  } catch (_) {}
  var disc = [];
  try {
    disc = (await getAll("discipline")).filter(function(d) {
      return d.subjectId === s.id || (d.subjectRef && s.regNo && d.subjectRef === s.regNo) ||
        (d.name && s.name && d.name.toLowerCase() === s.name.toLowerCase());
    });
  } catch (_) {}
  var initials = (s.name || "?").split(/\s+/).map(function(p) { return p[0]; }).join("").slice(0, 2).toUpperCase();
  var photoHtml = s.photoDataUrl
    ? '<div class="passport-frame"><img src="' + s.photoDataUrl + '" alt="Passport" /></div>'
    : '<div class="passport-frame" title="No photo">' + escapeHtml(initials) + "</div>";
  var body = document.getElementById("studentProfileBody");
  body.innerHTML =
    '<div class="profile-layout">' + photoHtml +
    '<div class="profile-meta">' +
    "<p><strong>Reg. No:</strong> " + escapeHtml(s.regNo || "—") + "</p>" +
    "<p><strong>Programme / Level:</strong> " + escapeHtml(s.programme || "—") + " · " + escapeHtml(String(s.level || "—")) + "</p>" +
    "<p><strong>Hostel:</strong> " + escapeHtml(s.hostel || "—") + "</p>" +
    "<p><strong>Status:</strong> " + escapeHtml(s.status || "Active") + "</p>" +
    "<p><strong>Gender / Phone:</strong> " + escapeHtml(s.gender || "—") + " · " + escapeHtml(s.phone || "—") + "</p>" +
    "<p><strong>Active session:</strong> " + (ACTIVE_SESSION ? escapeHtml(ACTIVE_SESSION.name) + semesterSuffixHtml() : "—") + "</p>" +
    "<p><strong>Remedial:</strong> " + (rem.length ? rem.map(function(r) { return escapeHtml((r.courses || r.courseCodes || []).join(", ") || "enrolled"); }).join(" | ") : "None on file") + "</p>" +
    "<p><strong>Discipline cases:</strong> " + (disc.length ? disc.length + " on file" : "None on file") + "</p>" +
    "</div></div>";
  var drawer = document.getElementById("studentProfileDrawer");
  if (drawer) {
    drawer.hidden = false;
    drawer.removeAttribute("hidden");
    drawer.style.display = "";
  }
  bindStudentProfileCloseHandlers();
}

async function handleProfilePhotoUpload(file) {
  if (!isQaOfficer()) { alert("Sign in as QA Officer to set passport photos."); return; }
  var id = window.__profileStudentId;
  if (!id || !file) return;
  try {
    var dataUrl = await compressPassportImage(file, 480, 0.72);
    await saveStudentPassport(id, dataUrl);
    await openStudentProfile(id);
    alert("Passport photo saved (automatically compressed for clean storage). Publish when ready.");
  } catch (err) {
    alert("Photo failed: " + (err.message || String(err)));
  }
}


// [single buildStudentFullRecord — DSA dossier version kept above]



// [kept single DSA openStudentFullRecord above]


async function renderDisciplineTable() {
  var tbody = document.getElementById("disciplineTableBody");
  if (!tbody) return;
  if (!isQaOfficer()) {
    tbody.innerHTML = "<tr><td colspan=\"7\">Sign in as QA Officer to view and manage the disciplinary register.</td></tr>";
    return;
  }
  var list = await getAll("discipline");
  var sub = (document.getElementById("discFilterSubject") && document.getElementById("discFilterSubject").value) || "";
  var st = (document.getElementById("discFilterStatus") && document.getElementById("discFilterStatus").value) || "";
  var q = ((document.getElementById("discSearch") && document.getElementById("discSearch").value) || "").toLowerCase().trim();
  list = list.filter(function(d) {
    if (sub && d.subjectType !== sub) return false;
    if (st && d.status !== st) return false;
    if (q) {
      var blob = ((d.name || "") + " " + (d.ref || "") + " " + (d.summary || "") + " " + (d.subjectRef || "")).toLowerCase();
      if (blob.indexOf(q) < 0) return false;
    }
    return true;
  });
  list.sort(function(a, b) { return String(b.date || "").localeCompare(String(a.date || "")); });
  var count = document.getElementById("discCount");
  if (count) count.textContent = list.length + " case" + (list.length !== 1 ? "s" : "");
  tbody.innerHTML = list.length ? list.map(function(d) {
    return "<tr><td>" + escapeHtml(d.date || "—") + "</td><td>" + escapeHtml(d.subjectType || "") +
      "</td><td>" + escapeHtml(d.name || "—") + "</td><td>" + escapeHtml(d.type || "—") +
      "</td><td>" + escapeHtml(d.status || "—") + "</td><td>" + escapeHtml(d.ref || "—") +
      '</td><td class="qa-edit-only"><button type="button" class="icon-btn-sm" data-edit-disc="' + d.id + '">Edit</button> ' +
      '<button type="button" class="icon-btn-sm" data-del-disc="' + d.id + '">Del</button></td></tr>';
  }).join("") : "<tr><td colspan=\"7\">No cases match filters.</td></tr>";
  tbody.querySelectorAll("[data-edit-disc]").forEach(function(btn) {
    btn.addEventListener("click", function() { openDisciplineForm(btn.getAttribute("data-edit-disc")); });
  });
  tbody.querySelectorAll("[data-del-disc]").forEach(function(btn) {
    btn.addEventListener("click", function() { deleteDisciplineCase(btn.getAttribute("data-del-disc")); });
  });
}

async function openDisciplineForm(id) {
  if (!isQaOfficer()) return;
  document.getElementById("disciplineForm").reset();
  document.getElementById("discId").value = id || "";
  document.getElementById("disciplineModalTitle").textContent = id ? "Edit disciplinary case" : "New disciplinary case";
  // datalist names
  var dl = document.getElementById("discNameList");
  if (dl) {
    var students = await getAll("students");
    var lecturers = await getAll("lecturers");
    dl.innerHTML = students.map(function(s) { return '<option value="' + escapeHtml(s.name) + '">'; }).join("") +
      lecturers.map(function(l) { return '<option value="' + escapeHtml(l.name) + '">'; }).join("");
  }
  if (id) {
    var all = await getAll("discipline");
    var d = all.find(function(x) { return x.id === id; });
    if (d) {
      document.getElementById("discSubjectType").value = d.subjectType || "student";
      document.getElementById("discDate").value = d.date || "";
      document.getElementById("discName").value = d.name || "";
      document.getElementById("discSubjectRef").value = d.subjectRef || "";
      document.getElementById("discSubjectId").value = d.subjectId || "";
      document.getElementById("discType").value = d.type || "Written warning";
      document.getElementById("discStatus").value = d.status || "Open";
      document.getElementById("discSummary").value = d.summary || "";
      document.getElementById("discOutcome").value = d.outcome || "";
      document.getElementById("discRef").value = d.ref || "";
    }
  } else {
    document.getElementById("discDate").value = new Date().toISOString().slice(0, 10);
  }
  var m = document.getElementById("disciplineModal");
  if (m) { m.hidden = false; m.removeAttribute("hidden"); m.style.display = ""; }
}

function closeDisciplineForm() {
  var m = document.getElementById("disciplineModal");
  if (!m) return;
  m.hidden = true; m.setAttribute("hidden", ""); m.style.display = "none";
}

async function saveDisciplineCase(e) {
  e.preventDefault();
  if (!isQaOfficer()) return;
  var id = (document.getElementById("discId").value || "").trim() || null;
  var ref = (document.getElementById("discRef").value || "").trim();
  var name = (document.getElementById("discName").value || "").trim();
  var summary = (document.getElementById("discSummary").value || "").trim();
  if (!ref || !name || !summary) { alert("Name, summary and official REF are required."); return; }
  var now = new Date().toISOString();
  var rec = {
    id: id || ("disc_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)),
    subjectType: document.getElementById("discSubjectType").value || "student",
    date: document.getElementById("discDate").value,
    name: name,
    subjectRef: (document.getElementById("discSubjectRef").value || "").trim(),
    subjectId: (document.getElementById("discSubjectId").value || "").trim(),
    type: document.getElementById("discType").value,
    status: document.getElementById("discStatus").value,
    summary: summary,
    outcome: (document.getElementById("discOutcome").value || "").trim(),
    ref: ref,
    updatedAt: now
  };
  if (!id) rec.createdAt = now;
  stampSessionFields(rec);
  await put("discipline", rec);
  await writeAudit({
    action: id ? "update" : "create",
    entity: "discipline",
    entityId: rec.id,
    externalRef: ref,
    reason: id ? "Disciplinary case updated" : "Disciplinary case opened",
    details: { name: name, subjectType: rec.subjectType, type: rec.type, status: rec.status }
  });
  markDirty("discipline");
  closeDisciplineForm();
  await renderDisciplineTable();
}

async function deleteDisciplineCase(id) {
  if (!isQaOfficer()) return;
  var ref = prompt("Official REF to delete this case:", "REF/EOCNS/DSA/");
  if (!ref || !String(ref).trim()) return;
  if (!confirm("Delete this disciplinary case?")) return;
  await del("discipline", id);
  await writeAudit({ action: "delete", entity: "discipline", entityId: id, externalRef: String(ref).trim(), reason: "Disciplinary case deleted" });
  markDirty("discipline");
  await renderDisciplineTable();
}

async function printDisciplineRegister() {
  if (!isQaOfficer()) return;
  var list = await getAll("discipline");
  list.sort(function(a, b) { return String(b.date || "").localeCompare(String(a.date || "")); });
  var w = window.open("", "_blank");
  if (!w) return;
  var rows = list.map(function(d, i) {
    return "<tr><td>" + (i + 1) + "</td><td>" + escapeHtml(d.date || "") + "</td><td>" + escapeHtml(d.subjectType || "") +
      "</td><td>" + escapeHtml(d.name || "") + "</td><td>" + escapeHtml(d.type || "") + "</td><td>" +
      escapeHtml(d.status || "") + "</td><td>" + escapeHtml(d.ref || "") + "</td></tr>";
  }).join("");
  w.document.write("<!DOCTYPE html><html><head><title>Discipline register</title><style>body{font-family:Georgia,serif;padding:24px}table{border-collapse:collapse;width:100%;font-size:0.9rem}th,td{border:1px solid #ccc;padding:6px;text-align:left}h1{color:#0d9488}</style></head><body>" +
    "<h1>EOCNS Disciplinary Register</h1>" +
    (ACTIVE_SESSION ? "<p>Session: " + escapeHtml(ACTIVE_SESSION.name) + semesterSuffixHtml() + "</p>" : "") +
    "<table><thead><tr><th>#</th><th>Date</th><th>Subject</th><th>Name</th><th>Type</th><th>Status</th><th>REF</th></tr></thead><tbody>" +
    (rows || "<tr><td colspan=7>No cases</td></tr>") + "</tbody></table>" +
    "<p style=\"margin-top:16px;font-size:0.85rem;color:#64748b\">Generated " + new Date().toLocaleString() + " · Officer-only register</p></body></html>");
  w.document.close();
  setTimeout(function() { w.print(); }, 300);
}


// ===== Pending student registrations (self-service queue) =====
async function refreshPendingFromRepo() {
  try {
    var list = await fetchRepoJson(DATA_FILES.pending_students + "?t=" + Date.now());
    if (!Array.isArray(list)) list = [];
    var existing = await getAll("pending_students");
    for (var i = 0; i < existing.length; i++) {
      try { await del("pending_students", existing[i].id); } catch (_) {}
    }
    for (var j = 0; j < list.length; j++) {
      try { await put("pending_students", list[j]); } catch (_) {}
    }
    return list;
  } catch (err) {
    console.warn("pending hydrate", err);
    return getAll("pending_students");
  }
}

async function renderPendingRegistrations() {
  var tbody = document.getElementById("pendingTableBody");
  if (!tbody) return;
  if (!isQaOfficer()) {
    tbody.innerHTML = "<tr><td colspan=\"7\">Sign in as QA Officer to review student self-registrations.</td></tr>";
    return;
  }
  await refreshPendingFromRepo();
  var list = (await getAll("pending_students")).filter(function(p) { return !p.status || p.status === "pending"; });
  list.sort(function(a, b) { return String(b.submittedAt || "").localeCompare(String(a.submittedAt || "")); });
  var count = document.getElementById("pendingCount");
  if (count) count.textContent = list.length + " pending";
  if (!list.length) {
    tbody.innerHTML = "<tr><td colspan=\"7\">No pending registrations. Share the student form: <code>register.html</code></td></tr>";
    return;
  }
  tbody.innerHTML = list.map(function(p) {
    var thumb = p.photoDataUrl
      ? '<img src="' + p.photoDataUrl + '" alt="" style="width:40px;height:50px;object-fit:cover;border-radius:4px;border:1px solid #cbd5e1" />'
      : "—";
    return "<tr><td>" + thumb + "</td><td>" + escapeHtml(p.name || "") +
      "</td><td>" + escapeHtml(p.regNo || "") + "</td><td>" + escapeHtml(p.programme || "") + " / " + escapeHtml(String(p.level || "")) +
      "</td><td>" + escapeHtml(p.email || "") + "</td><td>" + escapeHtml((p.submittedAt || "").slice(0, 16).replace("T", " ")) +
      '</td><td class="qa-edit-only">' +
      '<button type="button" class="icon-btn-sm" data-pend-view="' + p.id + '">Review</button> ' +
      '<button type="button" class="icon-btn-sm" data-pend-ok="' + p.id + '">Approve</button> ' +
      '<button type="button" class="icon-btn-sm" data-pend-no="' + p.id + '">Reject</button></td></tr>';
  }).join("");
  tbody.querySelectorAll("[data-pend-view]").forEach(function(btn) {
    btn.addEventListener("click", function() { if (window.openPendingReview) window.openPendingReview(btn.getAttribute("data-pend-view")); });
  });
  tbody.querySelectorAll("[data-pend-ok]").forEach(function(btn) {
    btn.addEventListener("click", function() { if (window.approvePendingStudent) window.approvePendingStudent(btn.getAttribute("data-pend-ok")); });
  });
  tbody.querySelectorAll("[data-pend-no]").forEach(function(btn) {
    btn.addEventListener("click", function() { if (window.rejectPendingStudent) window.rejectPendingStudent(btn.getAttribute("data-pend-no")); });
  });
}

async function openPendingReview(id) {
  var list = await getAll("pending_students");
  var p = list.find(function(x) { return x.id === id; });
  if (!p) return;
  var photo = p.photoDataUrl ? '<div class="passport-frame"><img src="' + p.photoDataUrl + '" alt="" /></div>' : "";
  var html = '<div class="profile-layout">' + photo + '<div class="profile-meta">' +
    "<p><strong>" + escapeHtml(p.name) + "</strong></p>" +
    "<p>Reg: " + escapeHtml(p.regNo || "—") + "</p>" +
    "<p>Email: " + escapeHtml(p.email || "—") + "</p>" +
    "<p>" + escapeHtml(p.programme || "") + " · Level " + escapeHtml(String(p.level || "")) + "</p>" +
    "<p>Gender: " + escapeHtml(p.gender || "—") + " · Phone: " + escapeHtml(p.phone || "—") + "</p>" +
    "<p>Hostel: " + escapeHtml(p.hostel || "—") + "</p>" +
    "<p class=\"muted-note\">Submitted " + escapeHtml(p.submittedAt || "") + "</p></div></div>";
  var body = document.getElementById("pendingReviewBody");
  if (body) body.innerHTML = html;
  window.__pendingReviewId = id;
  var m = document.getElementById("pendingReviewModal");
  if (m) { m.hidden = false; m.removeAttribute("hidden"); m.style.display = ""; }
}

function closePendingReview() {
  var m = document.getElementById("pendingReviewModal");
  if (!m) return;
  m.hidden = true; m.setAttribute("hidden", ""); m.style.display = "none";
}

async function approvePendingStudent(id) {
  if (!isQaOfficer()) return;
  id = id || window.__pendingReviewId;
  if (!id) return;
  var pin = prompt("Enter officer PIN to approve this registration onto the master list:");
  if (pin == null) return;
  if (String(pin).trim() !== String((APP_CONFIG && APP_CONFIG.qaPin) || "EOCNS-QA")) {
    alert("Incorrect PIN. Not approved.");
    return;
  }
  var list = await getAll("pending_students");
  var p = list.find(function(x) { return x.id === id; });
  if (!p) return;
  var students = await getAll("students");
  if (students.some(function(s) { return s.regNo && p.regNo && String(s.regNo).toLowerCase() === String(p.regNo).toLowerCase(); })) {
    alert("Reg. No already exists on master list. Reject or correct this submission.");
    return;
  }
  var now = new Date().toISOString();
  var student = {
    id: generateId("stu"),
    name: p.name,
    regNo: p.regNo,
    programme: p.programme,
    level: p.level,
    gender: p.gender || "",
    phone: p.phone || "",
    hostel: p.hostel || "",
    photoDataUrl: p.photoDataUrl || "",
    status: "Active",
    email: p.email || "",
    createdAt: now,
    updatedAt: now,
    source: "self_registration",
    pendingId: p.id
  };
  if (student.photoDataUrl) student.photoUpdatedAt = now;
  await put("students", student);
  await del("pending_students", id);
  // rewrite pending file list locally
  var left = (await getAll("pending_students")).filter(function(x) { return x.id !== id; });
  await writeAudit({
    action: "create",
    entity: "students",
    entityId: student.id,
    reason: "Approved self-registration " + (p.regNo || ""),
    details: { pendingId: id, email: p.email }
  });
  markDirty("pending approve");
  closePendingReview();
  await renderPendingRegistrations();
  await renderStudentsTable();
  try {
    await publishPendingListToRepo("Approve registration — update pending list");
  } catch (err) {
    console.warn(err);
  }
  alert("Approved onto master list and removed from pending. Publish full data when convenient so students.json is on the repository.");
}


async function publishPendingListToRepo(message) {
  var workerUrl = (APP_CONFIG && APP_CONFIG.publishWorkerUrl || "").trim();
  var key = (APP_CONFIG && APP_CONFIG.publishWorkerKey || "").trim();
  if (!workerUrl) throw new Error("publishWorkerUrl missing in config");
  var list = await getAll("pending_students");
  // only keep pending or all remaining records
  list = list.filter(function(p) { return p && p.id; });
  var files = {};
  files[DATA_FILES.pending_students] = JSON.stringify(list, null, 2);
  var headers = { "Content-Type": "application/json" };
  if (key) headers["X-EOCNS-Key"] = key;
  var res = await fetch(workerUrl.replace(/\/$/, ""), {
    method: "POST",
    headers: headers,
    body: JSON.stringify({
      action: "publish",
      publishKey: key,
      message: message || "Update pending student registrations",
      files: files
    })
  });
  var body = {};
  try { body = await res.json(); } catch (_) {}
  if (!res.ok) throw new Error(body.error || ("Worker HTTP " + res.status));
  return body;
}

  if (document.getElementById("qaDailyDate") && !document.getElementById("qaDailyDate").value) {
    document.getElementById("qaDailyDate").value = todayStr;
  }
  document.getElementById("btnAddQaEntry") && document.getElementById("btnAddQaEntry").addEventListener("click", function() { openQaEntryForm(); });
  document.getElementById("qaEntryForm") && document.getElementById("qaEntryForm").addEventListener("submit", saveQaEntry);
  document.getElementById("btnCancelQaEntry") && document.getElementById("btnCancelQaEntry").addEventListener("click", closeQaEntryForm);
  document.getElementById("btnCancelQaEntry2") && document.getElementById("btnCancelQaEntry2").addEventListener("click", closeQaEntryForm);
  document.getElementById("qaEntryModalBackdrop") && document.getElementById("qaEntryModalBackdrop").addEventListener("click", closeQaEntryForm);
  document.getElementById("btnFilterQaDaily") && document.getElementById("btnFilterQaDaily").addEventListener("click", renderQaDaily);
  document.getElementById("qaDailyDate") && document.getElementById("qaDailyDate").addEventListener("change", renderQaDaily);
  document.getElementById("qaDailyClass") && document.getElementById("qaDailyClass").addEventListener("change", renderQaDaily);
  document.getElementById("btnBuildWeeklyQa") && document.getElementById("btnBuildWeeklyQa").addEventListener("click", buildWeeklyQaReport);
  document.getElementById("btnPrintWeeklyQa") && document.getElementById("btnPrintWeeklyQa").addEventListener("click", function() {
    if (typeof window.printWeeklyProfessionalPack === "function") return window.printWeeklyProfessionalPack();
    alert("Build the weekly report first. If this persists, hard-refresh (Ctrl+Shift+R).");
  });
  document.getElementById("btnPrintMonthlyQa") && document.getElementById("btnPrintMonthlyQa").addEventListener("click", function() {
    if (typeof window.printMonthlyProfessionalPack === "function") return window.printMonthlyProfessionalPack();
    alert("Build the monthly report first. If this persists, hard-refresh (Ctrl+Shift+R).");
  });

  document.getElementById("btnDownloadWeeklyQa") && document.getElementById("btnDownloadWeeklyQa").addEventListener("click", function() {
    if (typeof window.printWeeklyProfessionalPack === "function") return window.printWeeklyProfessionalPack();
    alert("Build the weekly report first, then download/print.");
  });
  document.getElementById("btnDownloadMonthlyQa") && document.getElementById("btnDownloadMonthlyQa").addEventListener("click", function() {
    if (typeof window.printMonthlyProfessionalPack === "function") return window.printMonthlyProfessionalPack();
    alert("Build the monthly report first, then download/print.");
  });
  document.getElementById("btnPrintHandoverPack") && document.getElementById("btnPrintHandoverPack").addEventListener("click", function() {
    if (typeof printOfficerHandoverSheet === "function") printOfficerHandoverSheet();
    else if (typeof window.printOfficerHandoverSheet === "function") window.printOfficerHandoverSheet();
    else alert("Handover sheet not ready — hard-refresh.");
  });
  function closeRemedialModal() {
    var m = document.getElementById("remedialModal");
    if (!m) return;
    m.hidden = true; m.setAttribute("hidden", ""); m.style.display = "none";
  }
  document.getElementById("btnCloseRemedial") && document.getElementById("btnCloseRemedial").addEventListener("click", closeRemedialModal);
  document.getElementById("btnCancelRemedial") && document.getElementById("btnCancelRemedial").addEventListener("click", closeRemedialModal);
  document.getElementById("remedialForm") && document.getElementById("remedialForm").addEventListener("submit", function(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (typeof saveRemLog === "function") return saveRemLog(e);
    if (typeof saveRemedial === "function") return saveRemedial(e);
    alert("Use the Remedial Logging tab sheet to save attendance.");
  });

  document.getElementById("btnGenerateStudentRegister")?.addEventListener("click", function() {
    var fn = null;
    try { if (typeof generateStudentRegisterReport === "function") fn = generateStudentRegisterReport; } catch (_) {}
    if (!fn && typeof window.generateStudentRegisterReport === "function") fn = window.generateStudentRegisterReport;
    if (!fn) { alert("Register report not ready — hard-refresh (Ctrl+Shift+R)."); return; }
    try { window.generateStudentRegisterReport = fn; } catch (_) {}
    Promise.resolve(fn()).catch(function(err) {
      console.error(err);
      alert("Register report failed: " + (err && err.message ? err.message : String(err)));
    });
  });
  try { if (typeof generateStudentRegisterReport === "function") window.generateStudentRegisterReport = generateStudentRegisterReport; } catch (_) {}
  document.getElementById("btnGenerateHostelReportDash")?.addEventListener("click", function() { if (typeof window.generateHostelDistributionReport === "function") window.generateHostelDistributionReport(); else alert("Hostel report not ready — hard-refresh."); });
  document.getElementById("btnGenerateHostelReport")?.addEventListener("click", function() { if (typeof window.generateHostelDistributionReport === "function") window.generateHostelDistributionReport(); else alert("Hostel report not ready — hard-refresh."); });

  
  // Report API on window — assignments happen next to each function definition; this only wires clicks safely
  try { /* report functions attach themselves to window when defined */ } catch (bindRepErr) { console.warn("report bind", bindRepErr); }

document.getElementById("btnPrintDailyReport") && document.getElementById("btnPrintDailyReport").addEventListener("click", function() {
    if (typeof window.printDailyLectureReport === "function") return window.printDailyLectureReport();
    alert("Daily report is still loading. Hard-refresh the page (Ctrl+Shift+R).");
  });
  document.getElementById("btnBuildMonthlyQa") && document.getElementById("btnBuildMonthlyQa").addEventListener("click", buildMonthlyQaReport);
  document.getElementById("btnAddProgramme") && document.getElementById("btnAddProgramme").addEventListener("click", addProgrammePrompt);
  document.getElementById("btnAddLevel") && document.getElementById("btnAddLevel").addEventListener("click", addLevelPrompt);
  document.getElementById("btnFilterReports") && document.getElementById("btnFilterReports").addEventListener("click", renderReportsView);
  document.getElementById("btnExportLectureLogs") && document.getElementById("btnExportLectureLogs").addEventListener("click", exportLectureLogs);
  document.getElementById("btnDownloadFilteredReports") && document.getElementById("btnDownloadFilteredReports").addEventListener("click", exportLectureLogs);
  document.getElementById("btnPrintLectureReport") && document.getElementById("btnPrintLectureReport").addEventListener("click", printLectureReport);
  document.getElementById("btnBuildAttendance") && document.getElementById("btnBuildAttendance").addEventListener("click", buildAttendanceSheet);
  document.getElementById("btnSaveAttendance") && document.getElementById("btnSaveAttendance").addEventListener("click", saveAttendanceSheet);
  document.getElementById("btnPrintAttendance") && document.getElementById("btnPrintAttendance").addEventListener("click", printAttendanceSheet);
  document.getElementById("btnDownloadAttendanceDocx") && document.getElementById("btnDownloadAttendanceDocx").addEventListener("click", downloadAttendanceAsWord);
  document.querySelectorAll(".rem-tab").forEach(function(btn) {
    btn.addEventListener("click", function() { showRemTab(btn.getAttribute("data-rem-tab")); });
  });
  document.getElementById("btnRemAddProgramme") && document.getElementById("btnRemAddProgramme").addEventListener("click", async function() {
    if (!isQaOfficer()) return;
    var name = prompt("Remedial programme name (e.g. General Nursing)");
    if (!name) return;
    await loadRemMeta();
    REM_META.programmes.push({ id: "rp_" + Date.now().toString(36), name: name.trim() });
    await saveRemMeta(); renderRemSetup();
  });
  document.getElementById("btnRemAddLevel") && document.getElementById("btnRemAddLevel").addEventListener("click", async function() {
    if (!isQaOfficer()) return;
    var name = prompt("Remedial level name (e.g. 200 Level)");
    if (!name) return;
    await loadRemMeta();
    REM_META.levels.push({ id: "rl_" + Date.now().toString(36), name: name.trim() });
    await saveRemMeta(); renderRemSetup();
  });
  document.getElementById("btnRemSaveSession") && document.getElementById("btnRemSaveSession").addEventListener("click", async function() {
    if (!isQaOfficer()) return;
    await loadRemMeta();
    REM_META.sessionId = document.getElementById("remActiveSession").value;
    await saveRemMeta();
    alert("Remedial session link saved. Publish when ready.");
  });
  document.getElementById("btnRemAddEnrolment") && document.getElementById("btnRemAddEnrolment").addEventListener("click", function() { openRemEnrolForm(null); });
  document.getElementById("remEnrolForm") && document.getElementById("remEnrolForm").addEventListener("submit", saveRemEnrol);
  document.getElementById("btnCancelRemEnrol") && document.getElementById("btnCancelRemEnrol").addEventListener("click", function() { document.getElementById("remEnrolModal").hidden = true; });
  document.getElementById("btnCloseRemEnrol") && document.getElementById("btnCloseRemEnrol").addEventListener("click", function() { document.getElementById("remEnrolModal").hidden = true; });
  document.getElementById("remEnrolModalBackdrop") && document.getElementById("remEnrolModalBackdrop").addEventListener("click", function() { document.getElementById("remEnrolModal").hidden = true; });
  document.getElementById("remEnrFilterProg") && document.getElementById("remEnrFilterProg").addEventListener("change", renderRemEnrolment);
  document.getElementById("remEnrFilterLevel") && document.getElementById("remEnrFilterLevel").addEventListener("change", renderRemEnrolment);
  document.getElementById("btnRemAddAssignment") && document.getElementById("btnRemAddAssignment").addEventListener("click", async function() {
    if (!isQaOfficer()) return;
    var code = prompt("Course code"); if (!code) return;
    var title = prompt("Course title", "") || "";
    var lecturer = prompt("Lecturer name"); if (!lecturer) return;
    var hours = Number(prompt("Hours per slot", "2")) || 2;
    await put("remedial_assignments", { id: "ra_" + Date.now().toString(36), code: code.trim(), title: title.trim(), lecturer: lecturer.trim(), hours: hours });
    markDirty("remedial assignments");
    renderRemAssignments(); fillRemLogCourses();
  });
  document.getElementById("btnRemAddSlot") && document.getElementById("btnRemAddSlot").addEventListener("click", async function() {
    if (!isQaOfficer()) return;
    await loadRemTt();
    var weekday = Number(prompt("Weekday 0=Mon … 4=Fri", "0"));
    var code = prompt("Course code"); if (!code) return;
    var start = prompt("Start HH:MM", "08:00") || "08:00";
    var end = prompt("End HH:MM", "10:00") || "10:00";
    var hours = Number(prompt("Hours", "2")) || 2;
    REM_TT.slots.push({ weekday: weekday, code: code.trim(), start: start, end: end, hours: hours });
    await saveRemTt(); renderRemTimetable();
  });
  document.getElementById("btnRemLoadLogSheet") && document.getElementById("btnRemLoadLogSheet").addEventListener("click", loadRemLogSheet);
  document.getElementById("btnRemSaveLog") && document.getElementById("btnRemSaveLog").addEventListener("click", saveRemLog);
  document.getElementById("btnRemBuildWeekly") && document.getElementById("btnRemBuildWeekly").addEventListener("click", buildRemWeekly);
  document.getElementById("btnRemPrintWeekly") && document.getElementById("btnRemPrintWeekly").addEventListener("click", printRemWeeklyPack);
  document.getElementById("btnRemBuildSummary") && document.getElementById("btnRemBuildSummary").addEventListener("click", buildRemSummary);
  document.getElementById("btnRemPrintSummary") && document.getElementById("btnRemPrintSummary").addEventListener("click", printRemSummaryPack);
  document.getElementById("btnBuildLecturerHours") && document.getElementById("btnBuildLecturerHours").addEventListener("click", buildLecturerHoursReport);
  document.getElementById("btnPrintLecturerHours") && document.getElementById("btnPrintLecturerHours").addEventListener("click", printLecturerHoursPack);
  document.getElementById("btnAddCourse") && document.getElementById("btnAddCourse").addEventListener("click", addCoursePrompt);
  document.getElementById("btnAddTimetableSlot") && document.getElementById("btnAddTimetableSlot").addEventListener("click", addTimetableSlot);
  document.getElementById("btnSaveTimetable") && document.getElementById("btnSaveTimetable").addEventListener("click", saveTimetableLocal);
  document.getElementById("ttClassKey") && document.getElementById("ttClassKey").addEventListener("change", renderTimetableEditor);
  document.getElementById("btnDownloadAudit") && document.getElementById("btnDownloadAudit").addEventListener("click", downloadAuditJson);
  document.getElementById("btnAuditApplyFilters") && document.getElementById("btnAuditApplyFilters").addEventListener("click", function() { renderAuditLog(); });
  document.getElementById("btnAuditClearFilters") && document.getElementById("btnAuditClearFilters").addEventListener("click", function() {
    ["auditFilterFrom","auditFilterTo","auditFilterEntity","auditFilterAction","auditFilterOfficer","auditFilterSearch"].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) el.value = "";
    });
    renderAuditLog();
  });
  ["auditFilterFrom","auditFilterTo","auditFilterEntity","auditFilterAction"].forEach(function(id) {
    var el = document.getElementById(id);
    if (el && !el.__auditWired) {
      el.__auditWired = true;
      el.addEventListener("change", function() { renderAuditLog(); });
    }
  });
  ["auditFilterOfficer","auditFilterSearch"].forEach(function(id) {
    var el = document.getElementById(id);
    if (el && !el.__auditWired) {
      el.__auditWired = true;
      el.addEventListener("keydown", function(ev) { if (ev.key === "Enter") renderAuditLog(); });
    }
  });
  document.getElementById("btnPrintFullQaPack") && document.getElementById("btnPrintFullQaPack").addEventListener("click", printFullQaPack);
  document.getElementById("btnExportSnapshot") && document.getElementById("btnExportSnapshot").addEventListener("click", function() {
    if (typeof window.exportFullSnapshot === "function") window.exportFullSnapshot();
    else if (typeof exportFullSnapshot === "function") exportFullSnapshot();
    else alert("Snapshot export is still loading. Hard-refresh, then try again.");
  });
  document.getElementById("btnImportSnapshot") && document.getElementById("btnImportSnapshot").addEventListener("click", function() {
    document.getElementById("snapshotFileInput") && document.getElementById("snapshotFileInput").click();
  });

  document.getElementById("btnFullBackupDownload") && document.getElementById("btnFullBackupDownload").addEventListener("click", function() {
    if (typeof downloadFullBackup === "function") downloadFullBackup();
  });
  document.getElementById("btnFullBackupRestore") && document.getElementById("btnFullBackupRestore").addEventListener("click", function() {
    var inp = document.getElementById("fullBackupFileInput");
    if (inp) inp.click();
  });
  document.getElementById("fullBackupFileInput") && document.getElementById("fullBackupFileInput").addEventListener("change", function(e) {
    if (e.target.files && e.target.files[0] && typeof restoreFullBackupFromFile === "function") {
      restoreFullBackupFromFile(e.target.files[0]);
      e.target.value = "";
    }
  });
  document.getElementById("snapshotFileInput") && document.getElementById("snapshotFileInput").addEventListener("change", function(e) {
    if (e.target.files && e.target.files[0]) {
      var imp = window.importFullSnapshot || (typeof importFullSnapshot === "function" ? importFullSnapshot : null);
      if (imp) imp(e.target.files[0]);
      else alert("Snapshot import is still loading. Hard-refresh, then try again.");
    }
    e.target.value = "";
  });
    document.getElementById("btnImportStudentsCsv") && document.getElementById("btnImportStudentsCsv").addEventListener("click", function() {
    openStudentCsvImportModal();
  });
  document.getElementById("studentsCsvInput") && document.getElementById("studentsCsvInput").addEventListener("change", function(e) {
    // legacy hidden input — open modal instead if still triggered
    if (e.target.files && e.target.files[0]) {
      importStudentsCsv(e.target.files[0], {});
      e.target.value = "";
    }
  });
  document.getElementById("btnCloseStudentCsvImport") && document.getElementById("btnCloseStudentCsvImport").addEventListener("click", closeStudentCsvImportModal);
  document.getElementById("btnCancelStudentCsvImport") && document.getElementById("btnCancelStudentCsvImport").addEventListener("click", closeStudentCsvImportModal);
  document.getElementById("studentCsvImportBackdrop") && document.getElementById("studentCsvImportBackdrop").addEventListener("click", closeStudentCsvImportModal);
  document.getElementById("btnConfirmStudentCsvImport") && document.getElementById("btnConfirmStudentCsvImport").addEventListener("click", function() {
    confirmStudentCsvImport();
  });
  document.getElementById("btnRefreshHostelRoster") && document.getElementById("btnRefreshHostelRoster").addEventListener("click", renderHostelRoster);
  document.getElementById("hostelRosterFilter") && document.getElementById("hostelRosterFilter").addEventListener("change", renderHostelRoster);
  document.getElementById("hostelRosterProgramme") && document.getElementById("hostelRosterProgramme").addEventListener("change", renderHostelRoster);
  document.getElementById("hostelRosterLevel") && document.getElementById("hostelRosterLevel").addEventListener("change", renderHostelRoster);
  if (typeof renderTimetableBoard === "function") window.renderTimetableBoard = renderTimetableBoard;
  document.getElementById("btnRenderTtBoard") && document.getElementById("btnRenderTtBoard").addEventListener("click", function() {
    if (typeof window.renderTimetableBoard === "function") window.renderTimetableBoard();
    else if (typeof renderTimetableBoard === "function") renderTimetableBoard();
  });
  document.getElementById("qaEntryStart") && document.getElementById("qaEntryStart").addEventListener("change", calcQaDurationMinutes);
  document.getElementById("qaEntryEnd") && document.getElementById("qaEntryEnd").addEventListener("change", calcQaDurationMinutes);
  document.getElementById("qaEntryStart") && document.getElementById("qaEntryStart").addEventListener("input", calcQaDurationMinutes);
  document.getElementById("qaEntryEnd") && document.getElementById("qaEntryEnd").addEventListener("input", calcQaDurationMinutes);

  } catch (bootErr) {
    console.error("post-db boot", bootErr);
    alert("App loaded the database but a startup step failed.\n\nCause: " + (bootErr && bootErr.message ? bootErr.message : String(bootErr)) + "\n\nCheck the browser console (F12) for details. You can still try Settings → Publish after reload.");
  }
}).catch(err => {
  console.error("EOCNS boot error", err);
  var msg = (err && err.message) ? err.message : String(err || "unknown error");
  var hint = "";
  if (/QuotaExceeded|quota/i.test(msg)) hint = " Storage is full. Free space or clear site data for this origin.";
  else if (/blocked|version/i.test(msg)) hint = " Close other tabs of this site, then reload.";
  else if (/IndexedDB|IDB|database/i.test(msg)) hint = " Try clearing site data for travis-global.github.io (Application → Storage → Clear) then reload.";
  else hint = " If this keeps happening: DevTools → Application → IndexedDB → delete eocns_attendance → reload.";
  var offer = window.confirm("Startup problem.\n\nCause: " + msg + "\n\nWhat to try:" + hint + "\n\nClick OK to clear the local database and reload (repo data will re-load). Click Cancel to stay.");
  if (offer) {
    resetLocalDatabase().then(function(ok) {
      if (ok) location.reload();
      else alert("Could not clear database. Close other tabs of this site and try again.");
    });
  }
});

// =========================================================
// REPO PERSISTENCE + QA OFFICER GATE
// Master list: data/students.json in the repository
// =========================================================
const QA_PIN_KEY = "eocns-qa-session";
const QA_OFFICER_NAME_KEY = "eocns-qa-officer-name";
/* PIN from APP_CONFIG.qaPin / data/config.json */
const REPO_OWNER = "travis-global";
const REPO_NAME = "qa_attendance";
const DATA_FILES = {
  students: "data/students.json",
  lecturers: "data/lecturers.json",
  sessions: "data/sessions.json",
  qa_entries: "data/qa_entries.json",
  audit: "data/audit.json",
  programmes: "data/programmes.json",
  levels: "data/levels.json",
  courses: "data/courses.json",
  timetables: "data/timetables.json",
  attendance: "data/attendance.json",
  hostel_runs: "data/hostel_runs.json",
  biometric_pending: "data/biometric_pending.json",
  remedial: "data/remedial.json",
  remedial_meta: "data/remedial_meta.json",
  remedial_enrolment: "data/remedial_enrolment.json",
  remedial_assignments: "data/remedial_assignments.json",
  remedial_timetable: "data/remedial_timetable.json",
  remedial_logs: "data/remedial_logs.json",
  config: "data/config.json",
  discipline: "data/discipline.json",
  pending_students: "data/pending_students.json",
};

// ========== ACTIVE ACADEMIC SESSION CONTEXT ==========
var ACTIVE_SESSION_KEY = "eocns_active_session_id";
var ACTIVE_SESSION = null; // full session object or null

function normalizeToken(s) {
  return String(s || "").toLowerCase().replace(/level/gi, "").replace(/[^a-z0-9]/g, "").trim();
}
function programmeMatches(studentProg, sessionProgs) {
  if (!sessionProgs || !sessionProgs.length) return true;
  var sp = normalizeToken(studentProg);
  return sessionProgs.some(function(p) {
    var np = normalizeToken(p);
    return sp === np || sp.indexOf(np) >= 0 || np.indexOf(sp) >= 0;
  });
}
function levelMatches(studentLevel, sessionLevels) {
  if (!sessionLevels || !sessionLevels.length) return true;
  var sl = normalizeToken(studentLevel);
  return sessionLevels.some(function(l) {
    var nl = normalizeToken(l);
    return sl === nl || sl.indexOf(nl) >= 0 || nl.indexOf(sl) >= 0;
  });
}

async function loadActiveSession() {
  var id = null;
  try { id = localStorage.getItem(ACTIVE_SESSION_KEY); } catch (_) {}
  var sessions = await getAll("sessions");
  if (id) ACTIVE_SESSION = sessions.find(function(s) { return s.id === id; }) || null;
  if (!ACTIVE_SESSION) {
    ACTIVE_SESSION = sessions.find(function(s) { return s.status === "Active"; }) || sessions[0] || null;
    if (ACTIVE_SESSION) {
      try { localStorage.setItem(ACTIVE_SESSION_KEY, ACTIVE_SESSION.id); } catch (_) {}
    }
  }
  computeActiveSemester();
  return ACTIVE_SESSION;
}

// ================= SEMESTERS (a session has any number of semesters) =================
var ACTIVE_SEMESTER = null;
var ACTIVE_SEMESTER_KEY = "eocns-active-semester";

// Sessions saved before semesters existed get two virtual ones (1st/2nd) until the session is next saved.
function sessionSemesters(sess) {
  sess = sess || ACTIVE_SESSION;
  if (!sess) return [];
  if (Array.isArray(sess.semesters) && sess.semesters.length) return sess.semesters;
  return [
    { id: sess.id + "_s1", name: "1st Semester", startDate: sess.startDate || "", endDate: "", virtual: true },
    { id: sess.id + "_s2", name: "2nd Semester", startDate: "", endDate: "", virtual: true }
  ];
}
function semesterForDate(dateIso, sess) {
  var sems = sessionSemesters(sess);
  if (!dateIso || !sems.length) return null;
  var hit = sems.filter(function(s) { return s.startDate && s.startDate <= dateIso && (!s.endDate || dateIso <= s.endDate); });
  if (!hit.length) return null;
  hit.sort(function(x, y) { return String(x.startDate).localeCompare(String(y.startDate)); });
  return hit[hit.length - 1];
}
function computeActiveSemester() {
  ACTIVE_SEMESTER = null;
  if (!ACTIVE_SESSION) return null;
  var sems = sessionSemesters(ACTIVE_SESSION);
  if (!sems.length) return null;
  var saved = "";
  try { saved = localStorage.getItem(ACTIVE_SEMESTER_KEY + ":" + ACTIVE_SESSION.id) || ""; } catch (_) {}
  ACTIVE_SEMESTER = sems.find(function(s) { return s.id === saved; }) || null;
  if (!ACTIVE_SEMESTER) ACTIVE_SEMESTER = semesterForDate(new Date().toISOString().slice(0, 10), ACTIVE_SESSION) || sems[0];
  return ACTIVE_SEMESTER;
}
async function setActiveSemesterId(id) {
  if (ACTIVE_SESSION) { try { localStorage.setItem(ACTIVE_SEMESTER_KEY + ":" + ACTIVE_SESSION.id, id || ""); } catch (_) {} }
  computeActiveSemester();
  await refreshSessionChrome();
  try { var active = document.querySelector(".nav-item.active"); if (active) active.click(); } catch (_) {}
  try { refreshDashboardStats(); } catch (_) {}
  showToast(ACTIVE_SEMESTER ? ("Working in: " + ACTIVE_SEMESTER.name) : "No semester selected");
}
// Which semester does a saved record belong to? (stamped id, else by its date, else the first semester)
function semesterIdOfRecord(rec) {
  if (rec && rec.semesterId) return rec.semesterId;
  var s = semesterForDate(rec && (rec.date || (rec.createdAt || "").slice(0, 10)));
  if (s) return s.id;
  var all = sessionSemesters();
  return all.length ? all[0].id : "";
}
function entryInActiveSemester(rec) {
  if (!ACTIVE_SEMESTER) return true;
  return semesterIdOfRecord(rec) === ACTIVE_SEMESTER.id;
}
function semesterSuffixHtml() {
  return ACTIVE_SEMESTER ? (" · Semester: " + escapeHtml(ACTIVE_SEMESTER.name)) : "";
}
function semesterSelectOptions(selectedId) {
  return sessionSemesters().map(function(s) {
    var rng = (s.startDate || s.endDate) ? (" (" + (s.startDate || "?") + " → " + (s.endDate || "?") + ")") : "";
    return '<option value="' + escapeHtml(s.id) + '"' + (s.id === selectedId ? " selected" : "") + ">" + escapeHtml(s.name + rng) + "</option>";
  }).join("");
}

// ---- session form: semester rows ----
function addSessionSemesterRow(sem) {
  var box = document.getElementById("sessionSemestersBox");
  if (!box) return;
  sem = sem || {};
  var row = document.createElement("div");
  row.className = "sem-row";
  row.style.cssText = "display:grid;grid-template-columns:1.4fr 1fr 1fr auto;gap:6px;margin-bottom:6px;align-items:center";
  row.innerHTML = '<input type="hidden" data-sem="id" value="' + escapeHtml(sem.id || "") + '" />' +
    '<input type="text" data-sem="name" placeholder="e.g. 1st Semester" value="' + escapeHtml(sem.name || "") + '" />' +
    '<input type="date" data-sem="start" title="Starts" value="' + escapeHtml(sem.startDate || "") + '" />' +
    '<input type="date" data-sem="end" title="Ends" value="' + escapeHtml(sem.endDate || "") + '" />' +
    '<button type="button" class="btn btn--ghost btn--sm" title="Remove semester">×</button>';
  row.querySelector("button").addEventListener("click", function() { row.remove(); });
  box.appendChild(row);
}
function fillSessionSemesterRows(list) {
  var box = document.getElementById("sessionSemestersBox");
  if (!box) return;
  box.innerHTML = "";
  (list && list.length ? list : [{ name: "1st Semester" }, { name: "2nd Semester" }]).forEach(addSessionSemesterRow);
}
function collectSessionSemesters(sessId) {
  var rows = Array.from(document.querySelectorAll("#sessionSemestersBox .sem-row")).map(function(r) {
    var g = function(k) { var el = r.querySelector('[data-sem="' + k + '"]'); return el ? el.value.trim() : ""; };
    return { id: g("id"), name: g("name"), startDate: g("start"), endDate: g("end") };
  }).filter(function(s) { return s.name || s.startDate || s.endDate; });
  var used = {};
  rows.forEach(function(s) { if (s.id) used[s.id] = true; });
  rows.forEach(function(s) {
    if (s.id) return;
    var n = 1; while (used[sessId + "_s" + n]) n++;
    s.id = sessId + "_s" + n; used[s.id] = true;
  });
  return rows;
}
function validateSessionSemesters(rows) {
  if (!rows.length) return "Add at least one semester (e.g. 1st Semester).";
  var names = {};
  for (var i = 0; i < rows.length; i++) {
    var s = rows[i];
    if (!s.name) return "Every semester needs a name.";
    var k = s.name.toLowerCase();
    if (names[k]) return 'Two semesters are both called "' + s.name + '".';
    names[k] = true;
    if (s.startDate && s.endDate && s.endDate < s.startDate) return s.name + ": end date is before its start date.";
  }
  var dated = rows.filter(function(s) { return s.startDate && s.endDate; }).sort(function(x, y) { return x.startDate.localeCompare(y.startDate); });
  for (var j = 1; j < dated.length; j++) {
    if (dated[j].startDate <= dated[j - 1].endDate) return dated[j - 1].name + " and " + dated[j].name + " overlap.";
  }
  return "";
}

// ================= LECTURER HOURS: contract per SEMESTER, monthly share from the timetable =================
function r1(n) { return Math.round((Number(n) || 0) * 10) / 10; }
function slotDurationHours(s) {
  var h = Number(s && s.hours);
  if (h > 0) return h;
  var p = String(s && s.start || "").split(":"), q = String(s && s.end || "").split(":");
  if (p.length < 2 || q.length < 2) return 0;
  var m = (Number(q[0]) * 60 + Number(q[1])) - (Number(p[0]) * 60 + Number(p[1]));
  return m > 0 ? m / 60 : 0;
}
function countWeekdayInRange(fromIso, toIso, weekday) {
  if (!fromIso || !toIso || toIso < fromIso) return 0;
  var d = new Date(fromIso + "T00:00:00"), end = new Date(toIso + "T00:00:00"), n = 0;
  while (d <= end) { if ((d.getDay() + 6) % 7 === Number(weekday)) n++; d.setDate(d.getDate() + 1); }
  return n;
}
function monthBoundsIso(monthVal) {
  var y = Number(monthVal.slice(0, 4)), m = Number(monthVal.slice(5, 7));
  var last = new Date(y, m, 0).getDate();
  return { first: monthVal + "-01", last: monthVal + "-" + String(last).padStart(2, "0") };
}
// A lecturer's weekly teaching slots, found by matching assigned course codes to the timetables.
function lecturerWeeklySlots(l) {
  var assigns = (l.assignments && l.assignments.length) ? l.assignments : (l.courses || []).map(function(c) { return { code: c }; });
  var tts = TIMETABLES_CACHE || {};
  var out = [], seen = {};
  assigns.forEach(function(a) {
    var want = normCourseCode(a.code);
    if (!want) return;
    var keys = (a.programme && a.level) ? [makeClassKey(a.level, a.programme)] : Object.keys(tts);
    keys.forEach(function(k) {
      ((tts[k] || {}).slots || []).forEach(function(s) {
        if (normCourseCode(s.code) !== want) return;
        var id = [k, s.weekday, s.start, s.code].join("|");
        if (seen[id]) return;
        seen[id] = true;
        out.push({ classKey: k, code: s.code, weekday: Number(s.weekday), hours: slotDurationHours(s) });
      });
    });
  });
  return out;
}
function scheduledHoursInRange(slots, fromIso, toIso) {
  var t = 0;
  slots.forEach(function(s) { t += s.hours * countWeekdayInRange(fromIso, toIso, s.weekday); });
  return r1(t);
}
function weekKeyOf(iso) {
  var d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}
async function fillLecturerHoursSemesters() {
  await loadActiveSession();
  var sel = document.getElementById("lecturerHoursSemester");
  if (!sel) return;
  var prev = sel.value;
  sel.innerHTML = semesterSelectOptions(prev || (ACTIVE_SEMESTER && ACTIVE_SEMESTER.id));
}

async function buildLecturerHoursReport() {
  await loadActiveSession();
  await ensureTimetables();
  await loadLecturers();
  await fillLecturerHoursSemesters();
  var semSel = document.getElementById("lecturerHoursSemester");
  var sem = sessionSemesters().find(function(s) { return semSel && s.id === semSel.value; }) || ACTIVE_SEMESTER;
  if (!sem) { alert("There is no semester yet. Create or edit a session and add its semesters first."); return; }
  var monthVal = (document.getElementById("lecturerHoursMonth") && document.getElementById("lecturerHoursMonth").value) || "";
  var notes = [];
  var mb = monthVal ? monthBoundsIso(monthVal) : null;
  if (mb && ((sem.endDate && mb.first > sem.endDate) || (sem.startDate && mb.last < sem.startDate))) {
    notes.push("The chosen month is outside " + sem.name + " (" + (sem.startDate || "?") + " → " + (sem.endDate || "?") + "), so nothing is scheduled in it.");
  }
  var qa = (await getQaEntries({ allSemesters: true })).filter(function(e) { return semesterIdOfRecord(e) === sem.id && e.status !== "Missed"; });
  var haveSemDates = !!(sem.startDate && sem.endDate);
  if (monthVal && !haveSemDates) notes.push("Set the start and end date of " + sem.name + " (Sessions → Edit) so each month's share of the contract can be worked out. Until then monthly targets show —.");
  var sid = ACTIVE_SESSION && ACTIVE_SESSION.id;
  var rows = lecturersCache.filter(function(l) { return (!l.status || l.status === "Active") && lecturerInSession(l, sid); }).map(function(l) {
    var contract = Number(l.contractHoursPerSemester) || 0;
    var legacyMonthly = Number(l.contractHoursPerMonth) || 0;
    var slots = lecturerWeeklySlots(l);
    var mine = qa.filter(function(e) { return (e.lecturer || "") === l.name; });
    var hrs = function(list) { return r1(list.reduce(function(t, e) { return t + (Number(e.duration) || 0); }, 0) / 60); };
    var row = { name: l.name, staffId: l.staffId || "", contract: contract };
    if (!monthVal) {
      row.scheduled = haveSemDates ? scheduledHoursInRange(slots, sem.startDate, sem.endDate) : null;
      row.delivered = hrs(mine);
      row.variance = contract ? r1(row.delivered - contract) : null;
      row.pct = contract ? Math.round(row.delivered / contract * 100) : null;
      row.status = !contract ? "No contract set" : (row.delivered >= contract ? "Met / over" : "Below contract");
    } else {
      var from = (sem.startDate && sem.startDate > mb.first) ? sem.startDate : mb.first;
      var to = (sem.endDate && sem.endDate < mb.last) ? sem.endDate : mb.last;
      row.schedMonth = scheduledHoursInRange(slots, from, to);
      var schedSem = haveSemDates ? scheduledHoursInRange(slots, sem.startDate, sem.endDate) : 0;
      row.target = (contract > 0 && schedSem > 0) ? r1(contract * row.schedMonth / schedSem) : (!contract && legacyMonthly ? legacyMonthly : null);
      var inMonth = mine.filter(function(e) { return String(e.date || "").slice(0, 7) === monthVal; });
      row.delivered = hrs(inMonth);
      var wk = {}; inMonth.forEach(function(e) { wk[weekKeyOf(e.date)] = 1; });
      row.weeks = Object.keys(wk).length;
      row.toDate = hrs(mine.filter(function(e) { return String(e.date || "") <= mb.last; }));
      row.variance = row.target != null ? r1(row.delivered - row.target) : null;
      row.status = (!contract && !legacyMonthly) ? "No contract set" : (row.target == null ? "Set semester dates" : (row.variance >= 0 ? "Met / over" : "Below target"));
    }
    return row;
  });
  window.__lecturerHoursPayload = {
    mode: monthVal ? "month" : "semester", month: monthVal,
    session: ACTIVE_SESSION ? ACTIVE_SESSION.name : "", semester: sem.name,
    semesterRange: (sem.startDate || "?") + " → " + (sem.endDate || "?"), rows: rows, notes: notes
  };
  var body = document.getElementById("lecturerHoursResult");
  if (body) body.innerHTML = '<div class="card__body">' + lecturerHoursTableHtml(window.__lecturerHoursPayload, true) + "</div>";
}

function lecturerHoursTableHtml(p, forScreen) {
  var dash = function(v) { return v == null ? "—" : v; };
  var head, rows;
  if (p.mode === "month") {
    head = "<th>Lecturer</th><th>Staff ID</th><th>Contract / semester</th><th>Scheduled this month (h)</th><th>Target this month (h)</th><th>Delivered (h)</th><th>Weeks taught</th><th>Variance</th><th>Delivered to date (h)</th><th>Status</th>";
    rows = p.rows.map(function(r) {
      return "<tr><td>" + escapeHtml(r.name) + "</td><td>" + escapeHtml(r.staffId) + "</td><td>" + r.contract + "</td><td>" + r.schedMonth + "</td><td>" + dash(r.target) +
        "</td><td>" + r.delivered + "</td><td>" + r.weeks + "</td><td>" + dash(r.variance) + "</td><td>" + r.toDate + "</td><td>" + escapeHtml(r.status) + "</td></tr>";
    }).join("");
  } else {
    head = "<th>Lecturer</th><th>Staff ID</th><th>Contract / semester (h)</th><th>Scheduled in semester (h)</th><th>Delivered to date (h)</th><th>Variance</th><th>% of contract</th><th>Status</th>";
    rows = p.rows.map(function(r) {
      return "<tr><td>" + escapeHtml(r.name) + "</td><td>" + escapeHtml(r.staffId) + "</td><td>" + r.contract + "</td><td>" + dash(r.scheduled) + "</td><td>" + r.delivered +
        "</td><td>" + dash(r.variance) + "</td><td>" + (r.pct == null ? "—" : r.pct + "%") + "</td><td>" + escapeHtml(r.status) + "</td></tr>";
    }).join("");
  }
  var intro = "<p class=\"muted-note\"><strong>" + escapeHtml(p.session) + " · " + escapeHtml(p.semester) + "</strong> (" + escapeHtml(p.semesterRange) + ")" + (p.month ? " · Month: " + escapeHtml(p.month) : " · Whole semester") +
    " — regular lecture logs only (Held/Partial); remedial hours are reported separately.</p>" +
    (p.mode === "month" ? "<p class=\"muted-note\">Target this month = semester contract × (the lecturer's scheduled hours in this month ÷ their scheduled hours in the whole semester), counted from the timetable on the actual dates.</p>" : "") +
    p.notes.map(function(n) { return "<p class=\"muted-note\" style=\"color:#b45309\">" + escapeHtml(n) + "</p>"; }).join("");
  return intro + '<table class="data-table"><thead><tr>' + head + "</tr></thead><tbody>" + (rows || '<tr><td colspan="10">No lecturers in this session.</td></tr>') + "</tbody></table>";
}

function printLecturerHoursPack() {
  var p = window.__lecturerHoursPayload;
  if (!p) { alert("Build the report first."); return; }
  var w = window.open("", "_blank");
  if (!w) return;
  w.document.write("<!DOCTYPE html><html><head><title>Lecturer Contract Hours</title><style>" +
    (typeof eocnsReportStyles === "function" ? eocnsReportStyles() : "body{font-family:Georgia,serif;padding:24px} table{border-collapse:collapse;width:100%} th,td{border:1px solid #ccc;padding:6px}") +
    "</style></head><body>" +
    "<h1>EOCNS LECTURER HOURS REPORT<span class=\"gold\">" + escapeHtml(p.semester) + " · " + escapeHtml(p.session) + (p.month ? " · " + escapeHtml(p.month) : " · Whole semester") + "</span></h1>" +
    "<hr class=\"rule\"/>" + lecturerHoursTableHtml(p, false) +
    "<div class=\"footer\">Eastern Oak College of Nursing Sciences · Generated " + new Date().toLocaleString() + "</div></body></html>");
  w.document.close();
  setTimeout(function() { w.print(); }, 300);
}

function showToast(msg, ms) {
  try {
    var t = document.getElementById("appToast");
    if (!t) {
      t = document.createElement("div"); t.id = "appToast"; t.setAttribute("role", "status");
      t.style.cssText = "position:fixed;left:50%;bottom:24px;transform:translateX(-50%);max-width:90vw;padding:10px 16px;border-radius:10px;background:#1f2937;color:#fff;font-size:14px;z-index:9999;box-shadow:0 6px 20px rgba(0,0,0,.25);transition:opacity .25s;opacity:0;pointer-events:none";
      document.body.appendChild(t);
    }
    t.textContent = msg; t.style.opacity = "1";
    clearTimeout(t._h); t._h = setTimeout(function() { t.style.opacity = "0"; }, ms || 2600);
  } catch (_) {}
}

async function setActiveSessionId(id) {
  try { localStorage.setItem(ACTIVE_SESSION_KEY, id || ""); } catch (_) {}
  await loadActiveSession();
  await refreshSessionChrome();
  // re-render current view lightly
  try {
    var active = document.querySelector(".nav-item.active");
    if (active) active.click();
  } catch (_) {}
  try { refreshDashboardStats(); } catch (_) {}
  showToast(ACTIVE_SESSION ? ("Working in session: " + ACTIVE_SESSION.name) : "No session selected");
}

async function refreshSessionChrome() {
  await loadActiveSession();
  var sessions = await getAll("sessions");
  var sel = document.getElementById("globalSessionSelect");
  if (sel) {
    sel.innerHTML = '<option value="">— Select session —</option>' + sessions.map(function(s) {
      return '<option value="' + escapeHtml(s.id) + '"' + (ACTIVE_SESSION && ACTIVE_SESSION.id === s.id ? " selected" : "") + ">" +
        escapeHtml(s.name) + (s.status ? " (" + s.status + ")" : "") + "</option>";
    }).join("");
  }
  var semSel = document.getElementById("globalSemesterSelect");
  if (semSel) {
    semSel.innerHTML = ACTIVE_SESSION ? semesterSelectOptions(ACTIVE_SEMESTER && ACTIVE_SEMESTER.id) : '<option value="">—</option>';
    semSel.disabled = !ACTIVE_SESSION;
  }
  var banner = document.getElementById("sessionContextBanner");
  var title = document.getElementById("sessionContextTitle");
  var detail = document.getElementById("sessionContextDetail");
  if (!ACTIVE_SESSION) {
    if (banner) banner.hidden = false;
    if (title) title.textContent = "No active academic session";
    if (detail) detail.textContent = "Create or select a session in the top bar. Students, logs and reports are scoped to the session programmes & levels.";
    return;
  }
  if (banner) banner.hidden = false;
  if (title) title.textContent = ACTIVE_SESSION.name + (ACTIVE_SEMESTER ? " · " + ACTIVE_SEMESTER.name : "");
  var roster = await studentsForActiveSession();
  if (detail) {
    detail.textContent = "Programmes: " + (ACTIVE_SESSION.programmes || []).join(", ") +
      " · Levels: " + (ACTIVE_SESSION.levels || []).join(", ") +
      " · Master students in scope: " + roster.length +
      (ACTIVE_SESSION.startDate ? (" · From " + ACTIVE_SESSION.startDate) : "");
  }
}

/** Master-list students automatically in scope for the active session (programme + level). */
async function studentsForActiveSession() {
  await loadActiveSession();
  var all = await getAll("students");
  if (!ACTIVE_SESSION) return all.slice();
  var progs = ACTIVE_SESSION.programmes || [];
  var levels = ACTIVE_SESSION.levels || [];
  return all.filter(function(st) {
    if (st.status && String(st.status) !== "Active") return false;
    var regU = String(st.regNo || "").toUpperCase().replace(/\s+/g, "");
    // Retired cohort must never appear in session rosters / attendance
    if (regU.indexOf("EOCNS/200") === 0) return false;
    return programmeMatches(st.programme, progs) && levelMatches(st.level, levels);
  });
}

function requireActiveSession(actionLabel) {
  if (ACTIVE_SESSION && ACTIVE_SESSION.id) return true;
  alert((actionLabel || "This action") + " needs an active academic session. Select one in the top bar (or create it under Sessions).");
  return false;
}

function stampSessionFields(obj) {
  if (!obj) obj = {};
  if (ACTIVE_SESSION) {
    if (!obj.sessionId) {
      obj.sessionId = ACTIVE_SESSION.id;
      obj.sessionName = ACTIVE_SESSION.name;
    }
    if (!obj.semesterId) {
      // a record dated inside a semester belongs to it; otherwise the semester being worked in
      var sem = semesterForDate(obj.date) || ACTIVE_SEMESTER;
      if (sem) { obj.semesterId = sem.id; obj.semesterName = sem.name; }
    }
  }
  return obj;
}

function entryInActiveSession(entry) {
  if (!ACTIVE_SESSION) return true;
  if (entry.sessionId) return entry.sessionId === ACTIVE_SESSION.id;
  // legacy rows: keep if date is on/after session start
  if (ACTIVE_SESSION.startDate && entry.date && entry.date < ACTIVE_SESSION.startDate) return false;
  return true;
}

let APP_CONFIG = { qaPin: "EOCNS-QA" };
let TIMETABLES_CACHE = null;
let COURSES_CACHE = [];
let PROGRAMMES_CACHE = [];
let LEVELS_CACHE = [];


function isQaOfficer() {
  try { return sessionStorage.getItem(QA_PIN_KEY) === "1"; } catch (_) { return false; }
}

function getQaOfficerName() {
  try {
    return (sessionStorage.getItem(QA_OFFICER_NAME_KEY) || "").trim();
  } catch (_) { return ""; }
}

/** Require a real officer display name for the session (used on every audit row). */
function ensureQaOfficerName(existingHint) {
  var current = getQaOfficerName() || (existingHint || "").trim();
  var name = current;
  if (!name) {
    name = prompt("Enter your full name as QA Officer (recorded on every audit entry):", "");
  }
  name = (name || "").trim();
  if (!name) return null;
  try { sessionStorage.setItem(QA_OFFICER_NAME_KEY, name); } catch (_) {}
  return name;
}

function setQaOfficer(on, officerName) {
  try {
    if (on) {
      sessionStorage.setItem(QA_PIN_KEY, "1");
      if (officerName && String(officerName).trim()) {
        sessionStorage.setItem(QA_OFFICER_NAME_KEY, String(officerName).trim());
      }
    } else {
      sessionStorage.removeItem(QA_PIN_KEY);
      sessionStorage.removeItem(QA_OFFICER_NAME_KEY);
    }
  } catch (_) {}
  document.body.classList.toggle("role-officer", !!on);
  document.body.classList.toggle("role-viewer", !on);
  updateQaOfficerUI();
  try { if (typeof renderAuditLog === "function") renderAuditLog(); } catch (_) {}
}

function updateQaOfficerUI() {
  const loggedIn = isQaOfficer();
  const out = document.getElementById("qaAuthLoggedOut");
  const inn = document.getElementById("qaAuthLoggedIn");
  if (out) out.hidden = loggedIn;
  if (inn) inn.hidden = !loggedIn;
  var nameEl = document.getElementById("qaSignedInOfficerName");
  if (nameEl) nameEl.textContent = loggedIn ? (getQaOfficerName() || "—") : "—";
  var vb = document.getElementById("viewerModeBanner");
  if (vb) vb.hidden = !!loggedIn;
  document.body.classList.toggle("role-officer", !!loggedIn);
  document.body.classList.toggle("role-viewer", !loggedIn);
  document.querySelectorAll(".nav-item--officer").forEach(function(el) {
    el.classList.toggle("is-locked", !loggedIn);
    el.setAttribute("title", loggedIn ? "" : "QA Officer sign-in required");
  });
  // If signed out while on a protected view, bounce to dashboard
  if (!loggedIn) {
    var active = document.querySelector(".view.active");
    var vid = active && active.id ? active.id.replace(/^view-/, "") : "";
    if (vid && isOfficerOnlyView(vid)) {
      try { showView("dashboard"); } catch (_) {}
    }
  }
}


async function changeQaOfficerPin() {
  var status = document.getElementById("changePinStatus");
  function setStatus(msg, ok) {
    if (!status) return;
    status.hidden = false;
    status.textContent = msg;
    status.style.color = ok ? "#0f766e" : "#b91c1c";
  }
  var current = (document.getElementById("changePinCurrent") && document.getElementById("changePinCurrent").value || "").trim();
  var neu = (document.getElementById("changePinNew") && document.getElementById("changePinNew").value || "").trim();
  var conf = (document.getElementById("changePinConfirm") && document.getElementById("changePinConfirm").value || "").trim();
  var expected = (APP_CONFIG && APP_CONFIG.qaPin) || "EOCNS-QA";
  if (!current) { setStatus("Enter the current PIN."); return; }
  if (current !== expected) {
    setStatus("Current PIN is incorrect. PIN was not changed.");
    return;
  }
  if (!neu || neu.length < 4) {
    setStatus("New PIN must be at least 4 characters.");
    return;
  }
  if (neu !== conf) {
    setStatus("New PIN and confirmation do not match.");
    return;
  }
  if (neu === current) {
    setStatus("New PIN is the same as the current PIN.");
    return;
  }
  if (!confirm("Update the QA officer PIN in the repository now? Other devices will use the new PIN after they refresh.")) return;

  // Refresh worker URL/key from repo config if possible (do not overwrite qaPin yet)
  var workerUrl = (APP_CONFIG.publishWorkerUrl || "").trim();
  var pubKey = (APP_CONFIG.publishWorkerKey || "").trim();
  try {
    var remoteCfg = await fetchRepoJson(DATA_FILES.config + "?t=" + Date.now());
    if (remoteCfg && remoteCfg.publishWorkerUrl) workerUrl = String(remoteCfg.publishWorkerUrl).trim();
    if (remoteCfg && remoteCfg.publishWorkerKey) pubKey = String(remoteCfg.publishWorkerKey).trim();
  } catch (_) {}

  if (!workerUrl) {
    setStatus("publishWorkerUrl is missing in config. Cannot update the repository.");
    return;
  }

  // Build next config — only apply locally AFTER successful push
  var nextConfig = Object.assign({}, APP_CONFIG, {
    qaPin: neu,
    qaPinNote: "Officer password. Rotated " + new Date().toISOString().slice(0, 10) + ".",
    qaPinUpdatedAt: new Date().toISOString(),
    publishWorkerUrl: workerUrl,
    publishWorkerKey: pubKey
  });

  setStatus("Updating data/config.json via publish worker…");
  try {
    var files = {};
    files[DATA_FILES.config] = JSON.stringify(nextConfig, null, 2);
    // Same headers as normal Publish (CORS allows X-EOCNS-Key)
    var headers = { "Content-Type": "application/json" };
    if (pubKey) headers["X-EOCNS-Key"] = pubKey;

    var res = await fetch(workerUrl.replace(/\/$/, ""), {
      method: "POST",
      headers: headers,
      body: JSON.stringify({
        message: "chore: rotate QA officer PIN",
        publishKey: pubKey,
        files: files
      })
    });
    var body = {};
    try { body = await res.json(); } catch (_) {}
    if (!res.ok) {
      var detail = body.error || body.message || res.statusText || ("HTTP " + res.status);
      if (/Path not allowed/i.test(detail)) {
        detail += " — Redeploy the Cloudflare Worker with the latest code (config.json must be on the allow-list).";
      }
      if (/Unauthorized|401/i.test(detail)) {
        detail += " — PUBLISH_KEY on the worker must match publishWorkerKey in config.";
      }
      setStatus("Repository update failed: " + detail + " PIN was NOT changed.");
      return;
    }
    // Success: apply locally
    APP_CONFIG = nextConfig;
    ["changePinCurrent", "changePinNew", "changePinConfirm"].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) el.value = "";
    });
    if (!isQaOfficer()) setQaOfficer(true);
    try {
      await writeAudit({
        action: "update",
        entity: "config",
        entityId: "qaPin",
        reason: "QA officer PIN rotated",
        details: { rotatedAt: APP_CONFIG.qaPinUpdatedAt }
      });
    } catch (_) {}
    setStatus("PIN updated in the repository (data/config.json). Use the new PIN on all devices after refresh. Keep it confidential.", true);
  } catch (err) {
    console.error(err);
    var msg = (err && err.message) ? err.message : String(err);
    var hint = "";
    if (/Failed to fetch|NetworkError|CORS|Load failed/i.test(msg)) {
      hint = " Browser could not reach the Worker (URL, offline, or CORS). Confirm publishWorkerUrl and that the worker is deployed. PIN was NOT changed.";
    }
    setStatus("Could not update repository: " + msg + "." + hint);
  }
}


function initQaOfficerUI() {
  setQaOfficer(isQaOfficer());
  updateQaOfficerUI();
  document.getElementById("btnOfficerGateLogin")?.addEventListener("click", function() { tryOfficerGateLogin(); });
  document.getElementById("btnBannerGoSettings")?.addEventListener("click", function() { showView("settings"); });
  document.getElementById("btnOfficerGateCancel")?.addEventListener("click", function() { closeOfficerLoginGate(); showView("dashboard"); });
  document.getElementById("officerGatePin")?.addEventListener("keydown", function(e) {
    if (e.key === "Enter") { e.preventDefault(); tryOfficerGateLogin(); }
  });
    document.getElementById("btnQaLogin")?.addEventListener("click", () => {
    const pin = (document.getElementById("qaPinInput")?.value || "").trim();
    const err = document.getElementById("qaAuthError");
    if (pin === (APP_CONFIG.qaPin || "EOCNS-QA")) {
      var officerName = (document.getElementById("qaOfficerNameInput") && document.getElementById("qaOfficerNameInput").value || "").trim();
      if (!officerName) {
        officerName = ensureQaOfficerName("");
      }
      if (!officerName) {
        if (err) { err.hidden = false; err.textContent = "Enter your full name — it is recorded on every audit entry."; }
        return;
      }
      setQaOfficer(true, officerName);
      if (err) err.hidden = true;
      if (document.getElementById("qaPinInput")) document.getElementById("qaPinInput").value = "";
      var nameEl = document.getElementById("qaSignedInOfficerName");
      if (nameEl) nameEl.textContent = officerName;
    } else {
      if (err) { err.hidden = false; err.textContent = "Incorrect PIN."; }
    }
  });
  document.getElementById("btnChangeQaPin")?.addEventListener("click", () => { changeQaOfficerPin(); });
  document.getElementById("btnQaLogout")?.addEventListener("click", () => {
    setQaOfficer(false);
    const panel = document.getElementById("qaTokenPanel");
    if (panel) panel.hidden = true;
  });
  document.getElementById("btnExportStudents")?.addEventListener("click", function() {
    if (typeof window.exportFullSnapshot === "function") window.exportFullSnapshot();
    else alert("Snapshot export is still loading. Hard-refresh the page, then try again.");
  });
  document.getElementById("btnPublishAll")?.addEventListener("click", () => {
    if (!isQaOfficer()) return;
    const panel = document.getElementById("qaTokenPanel");
    if (panel) panel.hidden = false;
    var btn = document.getElementById("btnConfirmPublish");
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Confirm publish all";
      btn.style.opacity = "";
      btn.style.cursor = "";
    }
    var pinEl = document.getElementById("qaPublishPin");
    if (pinEl) { pinEl.disabled = false; pinEl.focus(); }
    var detail = document.getElementById("qaPublishStatusDetail");
    if (detail) { detail.hidden = false; detail.textContent = "Enter PIN, then Confirm. The button will lock until this publish finishes."; }
    var st = document.getElementById("qaPublishStatus");
    if (st) st.textContent = "Ready to publish — enter PIN and confirm.";
  });
  document.getElementById("btnConfirmPublish")?.addEventListener("click", publishAllToRepo);
  document.getElementById("btnReloadFromRepo")?.addEventListener("click", async () => {
    await reloadAllFromRepo(true);
  });
}

async function fetchRepoJson(path) {
  const res = await fetch(path + "?v=" + Date.now(), { cache: "no-store" });
  if (!res.ok) throw new Error("HTTP " + res.status + " for " + path);
  return res.json();
}

async function clearStore(storeName) {
  return new Promise((resolve, reject) => {
    const t = db.transaction(storeName, "readwrite");
    t.objectStore(storeName).clear();
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
}

async function putMany(storeName, rows) {
  for (const row of rows) {
    await put(storeName, row);
  }
}

function shapeStudentsForRepo(students) {
  return students.slice().sort((a, b) => String(a.name).localeCompare(String(b.name))).map(s => {
    var row = {
      serial: s.serial || "",
      name: s.name,
      programme: normalizeProgramme(s.programme) === "Nursing" ? "General Nursing" : normalizeProgramme(s.programme),
      level: Number(s.level) || (s.programme === "Midwifery" ? 200 : 100),
      code: getProgrammeCode(normalizeProgramme(s.programme)),
      regNo: s.regNo || "",
      hostel: s.hostel || "",
      status: s.status || "Active",
      gender: s.gender || "",
      phone: s.phone || "",
      email: s.email || "",
      id: s.id || ""
    };
    if (s.photoDataUrl) row.photoDataUrl = s.photoDataUrl;
    if (s.photoUpdatedAt) row.photoUpdatedAt = s.photoUpdatedAt;
    return row;
  });
}

function studentFromRepo(s) {
  const now = new Date().toISOString();
  var row = {
    id: s.id || ("stu_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7)),
    name: s.name,
    regNo: s.regNo || "",
    programme: normalizeProgramme(s.programme),
    level: String(s.level || ""),
    gender: s.gender || "",
    hostel: s.hostel || "",
    status: s.status || "Active",
    phone: s.phone || "",
    email: s.email || "",
    serial: s.serial || "",
    createdAt: s.createdAt || now,
    updatedAt: s.updatedAt || now
  };
  if (s.photoDataUrl) {
    row.photoDataUrl = s.photoDataUrl;
    row.photoUpdatedAt = s.photoUpdatedAt || now;
  }
  return row;
}

async function hydrateAllFromRepoIfEmpty() {
  var loaded = [];
  async function fillIfEmpty(store, path, label) {
    try {
      var existing = await getAll(store);
      if (existing.length) return existing.length;
      var rows = await fetchRepoJson(path);
      if (Array.isArray(rows) && rows.length) {
        if (store === "students") {
          for (var i = 0; i < rows.length; i++) await put("students", studentFromRepo(rows[i]));
        } else {
          await putMany(store, rows);
        }
        loaded.push(label + " (" + rows.length + ")");
        return rows.length;
      }
    } catch (e) { console.warn(store + " hydrate", e); }
    return 0;
  }
  var nStu = await fillIfEmpty("students", DATA_FILES.students, "students");
  await fillIfEmpty("lecturers", DATA_FILES.lecturers, "lecturers");
  await fillIfEmpty("sessions", DATA_FILES.sessions, "sessions");
  await fillIfEmpty("qa_entries", DATA_FILES.qa_entries, "lecture logs");
  await fillIfEmpty("audit", DATA_FILES.audit, "audit");
  try { await fillIfEmpty("discipline", DATA_FILES.discipline, "discipline"); } catch (_) {}
  try { await fillIfEmpty("pending_students", DATA_FILES.pending_students, "pending registrations"); } catch (_) {}
  await fillIfEmpty("programmes", DATA_FILES.programmes, "programmes");
  await fillIfEmpty("levels", DATA_FILES.levels, "levels");
  await fillIfEmpty("courses", DATA_FILES.courses, "courses");
  await fillIfEmpty("attendance", DATA_FILES.attendance, "attendance");
  await fillIfEmpty("hostel_runs", DATA_FILES.hostel_runs, "hostel runs");
  try { await fillIfEmpty("biometric_pending", DATA_FILES.biometric_pending, "biometric pending"); } catch (_) {}
  await fillIfEmpty("remedial", DATA_FILES.remedial, "remedial");
  await fillIfEmpty("remedial_enrolment", DATA_FILES.remedial_enrolment, "remedial enrolment");
  await fillIfEmpty("remedial_assignments", DATA_FILES.remedial_assignments, "remedial assignments");
  await fillIfEmpty("remedial_logs", DATA_FILES.remedial_logs, "remedial logs");
  try {
    var meta = await fetchRepoJson(DATA_FILES.remedial_meta);
    if (meta) await put("remedial_meta", { key: "main", value: meta });
  } catch (_) {}
  try {
    var rtt = await fetchRepoJson(DATA_FILES.remedial_timetable);
    if (rtt) await put("remedial_timetable", { key: "main", value: rtt });
  } catch (_) {}
  try { APP_CONFIG = await fetchRepoJson(DATA_FILES.config); } catch (e) { console.warn("config", e); }
  try { TIMETABLES_CACHE = await fetchRepoJson(DATA_FILES.timetables); } catch (e) { TIMETABLES_CACHE = {}; }
  PROGRAMMES_CACHE = await getAll("programmes");
  LEVELS_CACHE = await getAll("levels");
  COURSES_CACHE = await getAll("courses");
  // Always refresh student cache for UI
  try { await loadStudents(); } catch (_) {}
  var totalStu = (await getAll("students")).length;
  var banner = document.getElementById("masterLoadBanner");
  if (banner) {
    if (loaded.length) {
      banner.hidden = false;
      banner.textContent = "Master data loaded automatically from the repository: " + loaded.join(", ") + ". Total students on this device: " + totalStu + ".";
      setTimeout(function() { banner.hidden = true; }, 12000);
    } else if (totalStu > 0) {
      banner.hidden = false;
      banner.textContent = "Master list ready (" + totalStu + " students). Data was already on this device — no manual “Load official list” needed.";
      setTimeout(function() { banner.hidden = true; }, 7000);
    } else {
      banner.hidden = false;
      banner.textContent = "No students in the repository master yet. Add students or use Reload master list after publishing a list.";
      setTimeout(function() { banner.hidden = true; }, 10000);
    }
  }
  return { loaded: loaded, totalStu: totalStu };
}

// ================= KEEP THIS BROWSER IN STEP WITH THE REPOSITORY =================
// Rule: repository data replaces local data only when this browser has NO unpublished changes.
var SYNC_STORES = [
  ["students", "students"], ["lecturers", "lecturers"], ["sessions", "sessions"], ["qa_entries", "qa_entries"],
  ["audit", "audit"], ["discipline", "discipline"], ["pending_students", "pending_students"],
  ["programmes", "programmes"], ["levels", "levels"], ["courses", "courses"], ["attendance", "attendance"],
  ["hostel_runs", "hostel_runs"], ["biometric_pending", "biometric_pending"], ["remedial", "remedial"], ["remedial_enrolment", "remedial_enrolment"],
  ["remedial_assignments", "remedial_assignments"], ["remedial_logs", "remedial_logs"]
];
function textFingerprint(t) {
  var h = 5381;
  for (var i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) | 0;
  return t.length + ":" + (h >>> 0).toString(36);
}
async function fetchRepoText(path) {
  var res = await fetch(path + "?v=" + Date.now(), { cache: "no-store" });
  if (!res.ok) throw new Error("HTTP " + res.status + " for " + path);
  return res.text();
}
async function replaceStoreFromRepoRows(store, rows) {
  await clearStore(store);   // only ever called after the repo file was fetched and parsed successfully
  for (var i = 0; i < rows.length; i++) await put(store, store === "students" ? studentFromRepo(rows[i]) : rows[i]);
}
async function refreshCachesAfterSync() {
  try { PROGRAMMES_CACHE = await getAll("programmes"); LEVELS_CACHE = await getAll("levels"); } catch (_) {}
  try { await loadCoursesCache(); } catch (_) {}
  try { await loadStudents(); } catch (_) {}
  try { await loadLecturers(); } catch (_) {}
  try { await refreshSessionChrome(); } catch (_) {}
  try { await fillSessionClassSelectors(); } catch (_) {}
  try { var active = document.querySelector(".nav-item.active"); if (active) active.click(); } catch (_) {}
  try { refreshDashboardStats(); } catch (_) {}
}

/**
 * FORCE repository as sole truth: replace every synced store from GitHub,
 * clear dirty flags, and verify local counts/fingerprints match the fetched repo payloads.
 * Called on every page load/reload so Device A and Device B always see the same data.
 */
/**
 * Explicit full replace from repository (Settings → Reload). Not used on ordinary refresh.
 */
async function forceSyncFromRepository() {
  var changed = [], failed = [], counts = {};
  for (var i = 0; i < SYNC_STORES.length; i++) {
    var store = SYNC_STORES[i][0];
    var path = DATA_FILES[SYNC_STORES[i][1]];
    if (!path) continue;
    try {
      var text = await fetchRepoText(path + (path.indexOf("?") >= 0 ? "&" : "?") + "t=" + Date.now());
      var rows = JSON.parse(text);
      if (!Array.isArray(rows)) throw new Error("not a list");
      await replaceStoreFromRepoRows(store, rows);
      await put("meta", { key: "repoFp:" + store, value: textFingerprint(text) });
      counts[store] = rows.length;
      changed.push(store);
    } catch (e) {
      console.warn("force repo sync", store, e);
      failed.push(store);
    }
  }
  try { TIMETABLES_CACHE = await fetchRepoJson(DATA_FILES.timetables + "?t=" + Date.now()); } catch (_) {}
  try { APP_CONFIG = await fetchRepoJson(DATA_FILES.config + "?t=" + Date.now()); } catch (_) {}
  try {
    var meta = await fetchRepoJson(DATA_FILES.remedial_meta + "?t=" + Date.now());
    if (meta) await put("remedial_meta", { key: "main", value: meta });
  } catch (_) {}
  try {
    var rtt = await fetchRepoJson(DATA_FILES.remedial_timetable + "?t=" + Date.now());
    if (rtt) await put("remedial_timetable", { key: "main", value: rtt });
  } catch (_) {}
  EOCNS_DIRTY = false;
  try { clearDirty(); } catch (_) {}
  try { await put("meta", { key: "dirty", value: false }); } catch (_) {}
  try { await refreshCachesAfterSync(); } catch (_) {}
  return { forced: true, changed: changed, failed: failed, counts: counts };
}

/**
 * Independent local DB:
 * - If this browser has unpublished changes → keep local, do not overwrite from repo
 * - If local store empty → fill from repo
 * - If repo fingerprint unchanged → leave local alone (no wipe, no flicker)
 * - If repo changed for a store → pull only that store
 */

/** True when local has officer edits not yet published. */
function hasUnpublishedLocalChanges() {
  if (EOCNS_DIRTY) return true;
  try {
    // meta dirty checked async by callers via getAll when needed
  } catch (_) {}
  return false;
}

/**
 * Smart background sync: if local has no new unpublished work, pull any repo changes.
 * Runs on tab focus and on a quiet interval so officers never need hard-refresh.
 */
var __eocnsSmartSyncTimer = null;
var __eocnsSmartSyncBusy = false;
var __eocnsLastSmartSync = 0;

async function smartAutoSyncFromRepo(reason) {
  if (__eocnsSmartSyncBusy) return;
  if (EOCNS_DIRTY) return;
  var now = Date.now();
  // throttle: at most once per 20s unless publish just finished
  if (reason !== "post-publish" && reason !== "boot" && (now - __eocnsLastSmartSync) < 20000) return;
  __eocnsSmartSyncBusy = true;
  try {
    var metaRows = await getAll("meta"), dirtyMeta = false;
    metaRows.forEach(function(r) { if (r.key === "dirty" && r.value === true) dirtyMeta = true; });
    if (dirtyMeta) { EOCNS_DIRTY = true; return; }
    var res = await syncFromRepoIfClean();
    __eocnsLastSmartSync = Date.now();
    if (res && res.pulled && res.pulled.length) {
      console.info("EOCNS auto-sync (" + (reason || "timer") + "):", res.pulled);
      try { await refreshCachesAfterSync(); } catch (_) {}
      try {
        var active = document.querySelector(".view.active");
        var vid = active && active.id ? active.id.replace(/^view-/, "") : "";
        if (vid && typeof showView === "function") showView(vid);
      } catch (_) {}
    }
  } catch (e) {
    console.warn("smart auto-sync", e);
  } finally {
    __eocnsSmartSyncBusy = false;
  }
}

function startSmartRepoWatch() {
  if (__eocnsSmartSyncTimer) return;
  document.addEventListener("visibilitychange", function() {
    if (document.visibilityState === "visible") smartAutoSyncFromRepo("focus");
  });
  window.addEventListener("focus", function() { smartAutoSyncFromRepo("focus"); });
  // Quiet poll: only pulls when repo changed and local is clean
  __eocnsSmartSyncTimer = setInterval(function() {
    if (document.visibilityState === "visible") smartAutoSyncFromRepo("interval");
  }, 45000);
}


async function syncFromRepoIfClean() {
  var metaRows = await getAll("meta"), m = {};
  metaRows.forEach(function(r) { m[r.key] = r.value; });
  if (m.dirty === true || EOCNS_DIRTY) {
    EOCNS_DIRTY = true;
    var b = document.getElementById("dirtyBanner");
    if (b) {
      b.hidden = false;
      b.style.background = "";
      b.textContent = "This browser has unpublished changes — local data is kept. Publish when ready, or use Settings → Reload from repository to discard local edits.";
    }
    return { skipped: "unpublished changes", pulled: [] };
  }

  var pulled = [];
  var failed = [];
  var unchanged = [];

  for (var i = 0; i < SYNC_STORES.length; i++) {
    var store = SYNC_STORES[i][0], path = DATA_FILES[SYNC_STORES[i][1]];
    if (!path) continue;
    try {
      var localNow = [];
      try { localNow = await getAll(store); } catch (_) {}
      var text = await fetchRepoText(path + (path.indexOf("?") >= 0 ? "&" : "?") + "t=" + Date.now());
      var rows = JSON.parse(text);
      if (!Array.isArray(rows)) throw new Error("not a list");
      var fp = textFingerprint(text);
      var prevFp = m["repoFp:" + store];

      // Empty local → hydrate
      if (!localNow.length) {
        if (rows.length) {
          await replaceStoreFromRepoRows(store, rows);
          await put("meta", { key: "repoFp:" + store, value: fp });
          pulled.push(store + "(empty→repo)");
        } else {
          unchanged.push(store);
        }
        continue;
      }

      // Same fingerprint as last successful sync → leave local independent
      if (prevFp && prevFp === fp) {
        unchanged.push(store);
        continue;
      }

      // Repo changed (or first fingerprint) → update this store only
      await replaceStoreFromRepoRows(store, rows);
      await put("meta", { key: "repoFp:" + store, value: fp });
      pulled.push(store);
    } catch (e) {
      console.warn("repo sync", store, e);
      failed.push(store);
    }
  }

  try {
    var ttText = await fetchRepoText(DATA_FILES.timetables + "?t=" + Date.now());
    var ttFp = textFingerprint(ttText);
    if (m["repoFp:timetables"] !== ttFp) {
      TIMETABLES_CACHE = JSON.parse(ttText);
      await put("meta", { key: "repoFp:timetables", value: ttFp });
      pulled.push("timetables");
    } else if (!TIMETABLES_CACHE) {
      try { TIMETABLES_CACHE = JSON.parse(ttText); } catch (_) {}
    }
  } catch (_) {}
  try { APP_CONFIG = await fetchRepoJson(DATA_FILES.config + "?t=" + Date.now()); } catch (_) {}
  try {
    var meta = await fetchRepoJson(DATA_FILES.remedial_meta + "?t=" + Date.now());
    if (meta) await put("remedial_meta", { key: "main", value: meta });
  } catch (_) {}
  try {
    var rtt = await fetchRepoJson(DATA_FILES.remedial_timetable + "?t=" + Date.now());
    if (rtt) await put("remedial_timetable", { key: "main", value: rtt });
  } catch (_) {}

  var banner = document.getElementById("dirtyBanner");
  if (banner) {
    if (pulled.length) {
      banner.hidden = false;
      banner.style.background = "";
      banner.textContent = "Repository updates applied: " + pulled.join(", ") + ". Local data otherwise unchanged.";
      setTimeout(function() {
        try {
          if (banner && /Repository updates applied/.test(banner.textContent || "")) banner.hidden = true;
        } catch (_) {}
      }, 6000);
    } else {
      // Stay quiet on ordinary refresh — independence
      banner.hidden = true;
    }
  }

  if (pulled.length) {
    try { await refreshCachesAfterSync(); } catch (_) {}
  }

  return { skipped: false, pulled: pulled, unchanged: unchanged, failed: failed };
}





async function reloadAllFromRepo(force) {
  if (force && !confirm("Replace ALL local data with the repository files?\n\nAnything not yet published from this browser will be lost.")) return;
  var status = document.getElementById("qaPublishStatus");
  if (status) status.textContent = "Reloading from repository…";
  var done = [], failed = [];
  try {
    for (var i = 0; i < SYNC_STORES.length; i++) {
      var store = SYNC_STORES[i][0], path = DATA_FILES[SYNC_STORES[i][1]];
      if (!path) continue;
      try {
        var text = await fetchRepoText(path);     // fetch + parse first, so a failure never wipes local data
        var rows = JSON.parse(text);
        if (!Array.isArray(rows)) throw new Error("not a list");
        await replaceStoreFromRepoRows(store, rows);
        await put("meta", { key: "repoFp:" + store, value: textFingerprint(text) });
        done.push(store);
        if (store === "students") { try { OFFICIAL_STUDENTS = rows; } catch (_) {} }
      } catch (e) { console.warn(path, e); failed.push(store); }
    }
    try {
      var meta = await fetchRepoJson(DATA_FILES.remedial_meta); if (meta) await put("remedial_meta", { key: "main", value: meta });
      var rtt = await fetchRepoJson(DATA_FILES.remedial_timetable); if (rtt) await put("remedial_timetable", { key: "main", value: rtt });
    } catch (_) {}
    try { TIMETABLES_CACHE = await fetchRepoJson(DATA_FILES.timetables); } catch (_) {}
    clearDirty();
    await refreshCachesAfterSync();
    await renderStudentsTable(); await renderLecturersTable(); await renderSessionsList(); await renderAuditLog();
    var msg = "Reloaded " + done.length + " data sets from the repository." + (failed.length ? " Could not load: " + failed.join(", ") + " (kept as they were)." : "");
    if (status) status.textContent = msg;
    if (force) alert(msg);
  } catch (err) {
    console.error(err);
    if (status) status.textContent = "Reload failed: " + (err.message || String(err));
    if (force) alert("Reload failed: " + (err.message || String(err)));
  }
}

async function githubPutFile(token, path, contentText, message) {
  const url = "https://api.github.com/repos/" + REPO_OWNER + "/" + REPO_NAME + "/contents/" + path;
  let sha = null;
  const getRes = await fetch(url, {
    headers: { Authorization: "Bearer " + token, Accept: "application/vnd.github+json" },
  });
  if (getRes.ok) {
    const meta = await getRes.json();
    sha = meta.sha;
  }
  const body = {
    message: message,
    content: btoa(unescape(encodeURIComponent(contentText))),
    branch: "main",
  };
  if (sha) body.sha = sha;
  const putRes = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: "Bearer " + token,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!putRes.ok) {
    const errText = await putRes.text();
    throw new Error(path + " → " + putRes.status + " " + errText.slice(0, 180));
  }
  return putRes.json();
}



/** Prefer newer record by updatedAt/createdAt; keep all ids from both sides. */
function recordMergeKey(r) {
  if (!r || typeof r !== "object") return null;
  if (r.id != null && String(r.id).trim() !== "") return String(r.id).trim();
  if (r.code != null && String(r.code).trim() !== "") return "code:" + String(r.code).trim();
  if (r.key != null && String(r.key).trim() !== "") return "key:" + String(r.key).trim();
  if (r.regNo != null && String(r.regNo).trim() !== "") return "reg:" + String(r.regNo).trim().toUpperCase();
  return null;
}

function mergeRecordsById(localRows, remoteRows) {
  var map = {};
  function ts(r) {
    return String((r && (r.updatedAt || r.createdAt || r.timestamp || r.at)) || "");
  }
  function ingest(rows) {
    (rows || []).forEach(function(r) {
      var id = recordMergeKey(r);
      if (!id) return;
      var row = r;
      // courses/programmes stored by code — give them a stable id so merges never drop them
      if ((row.id == null || row.id === "") && row.code != null) {
        try { row = Object.assign({}, row, { id: String(row.code).trim() }); } catch (_) {}
      }
      if (!map[id] || ts(row) >= ts(map[id])) map[id] = row;
    });
  }
  ingest(remoteRows);
  ingest(localRows);
  return Object.keys(map).map(function(k) { return map[k]; });
}

async function fetchRemoteList(path) {
  try {
    var rows = await fetchRepoJson(path + "?t=" + Date.now());
    return Array.isArray(rows) ? rows : [];
  } catch (_) {
    return [];
  }
}

async function fetchRemoteTextFresh(path) {
  try {
    return await fetchRepoText(path + (path.indexOf("?") >= 0 ? "&" : "?") + "t=" + Date.now());
  } catch (_) {
    try { return await fetchRepoText(path); } catch (e2) { return null; }
  }
}

/**
 * Build publish payload for one JSON list store.
 * - Merges local+remote (no data loss across devices)
 * - Skips upload when content is unchanged (delta publish)
 * - Never publishes empty over non-empty remote
 */
async function safePublishJson(path, localRows, label) {
  var local = Array.isArray(localRows) ? localRows : [];
  var remoteText = null;
  var remote = [];
  try {
    remoteText = await fetchRemoteTextFresh(path);
    if (remoteText) {
      var rem = JSON.parse(remoteText);
      if (Array.isArray(rem)) remote = rem;
    }
  } catch (_) { remote = []; remoteText = null; }
  var remoteLen = remote.length;

  if (local.length === 0 && remoteLen > 0) {
    console.warn("publish guard: skipped empty", label, "remote has", remoteLen);
    return {
      skipped: true,
      unchanged: true,
      reason: "local empty, remote has " + remoteLen + " " + label,
      remoteLen: remoteLen,
      merged: remote,
      body: null
    };
  }

  var MERGE = {
    students: 1, lecturers: 1, sessions: 1, qa_entries: 1, audit: 1,
    discipline: 1, pending_students: 1, programmes: 1, levels: 1, courses: 1,
    attendance: 1, hostel_runs: 1, biometric_pending: 1, remedial: 1,
    remedial_enrolment: 1, remedial_assignments: 1, remedial_logs: 1
  };
  // Master catalogues (courses/programmes/levels): never replace with a thinner list
  // without an explicit typed approval. Merge by code/id so nothing is dropped silently.
  var CATALOGUE = { courses: 1, programmes: 1, levels: 1 };
  var ROSTER = { students: 1, lecturers: 1, sessions: 1 };

  var merged = local;
  if (ROSTER[label] && local.length > 0) {
    merged = local; // officer roster on this device is intentional source after edits
  } else if (MERGE[label] && remoteLen) {
    merged = mergeRecordsById(local, remote);
  }

  // HARD GUARDS — bulk erase protection
  if (merged.length === 0 && remoteLen > 0) {
    console.warn("publish guard: refused empty publish for", label, "remote has", remoteLen);
    return {
      skipped: true,
      unchanged: true,
      reason: "refused empty publish over " + remoteLen + " remote " + label,
      remoteLen: remoteLen,
      merged: remote,
      body: null
    };
  }
  // Catalogue shrink (courses etc.): keep remote if local/merge is drastically smaller
  if (CATALOGUE[label] && remoteLen > 0 && merged.length < remoteLen) {
    // Prefer union (already merged) — if still smaller, something wrong; refuse shrink
    if (merged.length < Math.max(1, Math.floor(remoteLen * 0.85))) {
      var ok = false;
      try {
        ok = window.confirm(
          "BULK ERASE WARNING\n\n" +
          label + ": local/merged has " + merged.length + " rows but repository has " + remoteLen + ".\n\n" +
          "Publishing would REMOVE data.\n\n" +
          "OK = still publish this smaller list (type approval).\nCancel = keep repository data (recommended)."
        );
      } catch (_) { ok = false; }
      if (!ok) {
        return {
          skipped: true,
          unchanged: true,
          reason: "refused bulk shrink of " + label + " (" + merged.length + " < " + remoteLen + ")",
          remoteLen: remoteLen,
          publishedLen: remoteLen,
          merged: remote,
          body: null
        };
      }
    }
  }
  // Any store: refuse wiping more than half without confirm
  if (remoteLen >= 5 && merged.length * 2 < remoteLen) {
    var ok2 = false;
    try {
      ok2 = window.confirm(
        "BULK ERASE WARNING\n\n" +
        label + " would drop from " + remoteLen + " to " + merged.length + " records.\n\n" +
        "OK = approve this bulk removal.\nCancel = skip this file and keep repository data."
      );
    } catch (_) { ok2 = false; }
    if (!ok2) {
      return {
        skipped: true,
        unchanged: true,
        reason: "refused bulk erase of " + label,
        remoteLen: remoteLen,
        merged: remote,
        body: null
      };
    }
  }

  var body = JSON.stringify(merged, null, 2);
  var fp = textFingerprint(body);
  var remoteFp = remoteText != null ? textFingerprint(remoteText) : null;
  if (remoteFp && fp === remoteFp) {
    return {
      skipped: true,
      unchanged: true,
      reason: "unchanged",
      remoteLen: remoteLen,
      publishedLen: merged.length,
      merged: merged,
      body: null,
      fingerprint: fp
    };
  }
  return {
    skipped: false,
    unchanged: false,
    body: body,
    merged: merged,
    localLen: local.length,
    remoteLen: remoteLen,
    publishedLen: merged.length,
    fingerprint: fp
  };
}

/** Poll raw repo until file fingerprint matches expected (or attempts exhausted). */
async function verifyRepoFile(path, expectedFp, attempts, delayMs) {
  attempts = attempts || 8;
  delayMs = delayMs || 2000;
  for (var i = 0; i < attempts; i++) {
    if (i) await new Promise(function(r) { setTimeout(r, delayMs); });
    var text = await fetchRemoteTextFresh(path);
    if (text != null && textFingerprint(text) === expectedFp) return true;
  }
  return false;
}

async function publishAllToRepo() {
  if (!isQaOfficer()) return;
  var pin = (document.getElementById("qaPublishPin") && document.getElementById("qaPublishPin").value || "").trim();
  var status = document.getElementById("qaPublishStatus");
  var detail = document.getElementById("qaPublishStatusDetail");
  var btnConfirm = document.getElementById("btnConfirmPublish");
  var btnPublish = document.getElementById("btnPublishAll");
  function setSt(msg) {
    if (status) status.textContent = msg;
    if (detail) {
      detail.hidden = false;
      detail.textContent = msg;
    }
  }
  function setPublishBusy(busy) {
    if (btnConfirm) {
      btnConfirm.disabled = !!busy;
      btnConfirm.textContent = busy ? "Publishing… please wait" : "Confirm publish all";
      btnConfirm.style.opacity = busy ? "0.65" : "";
      btnConfirm.style.cursor = busy ? "not-allowed" : "";
    }
    if (btnPublish) btnPublish.disabled = !!busy;
    var pinEl = document.getElementById("qaPublishPin");
    if (pinEl) pinEl.disabled = !!busy;
  }
  if (!pin || pin !== (APP_CONFIG.qaPin || "EOCNS-QA")) {
    setSt("Incorrect officer PIN. Confirm was not started.");
    return;
  }
  // Disable confirm immediately so the officer cannot double-submit
  setPublishBusy(true);
  setSt("PIN accepted. Publish started — do not close this tab. Preparing merge + delta…");
  try {
    try { APP_CONFIG = await fetchRepoJson(DATA_FILES.config + "?t=" + Date.now()); } catch (_) {}
    var workerUrl = (APP_CONFIG && APP_CONFIG.publishWorkerUrl || "").trim();
    if (!workerUrl) {
      setSt("Set publishWorkerUrl in data/config.json to your Cloudflare Worker URL, then reload.");
      setPublishBusy(false);
      return;
    }
    var key = (APP_CONFIG && APP_CONFIG.publishWorkerKey || "").trim();
    if (!key) {
      setPublishBusy(false);
      throw new Error("publishWorkerKey missing in data/config.json");
    }

    setSt("Step 1/4 — Preparing institutional publish (merge + delta)…");
    var files = {};
    var skipped = [];
    var unchanged = [];
    var expectedFp = {};
    var mergedLocal = {};

    async function putFile(path, rows, label) {
      var r = await safePublishJson(path, rows, label);
      if (r.merged) mergedLocal[label] = r.merged;
      if (r.skipped || r.unchanged) {
        if (r.reason === "unchanged") unchanged.push(label);
        else skipped.push(label + " (" + (r.reason || "skipped") + ")");
        // Keep local union even when not uploading
        if (r.merged && Array.isArray(r.merged) && (label === "qa_entries" || label === "students" || label === "audit" || label === "lecturers" || label === "sessions")) {
          try {
            await replaceStoreFromRepoRows(label, label === "students" ? r.merged.map(studentFromRepo) : r.merged);
          } catch (_) {}
        }
        return;
      }
      files[path] = r.body;
      expectedFp[path] = r.fingerprint;
      if (r.merged && Array.isArray(r.merged) && (label === "qa_entries" || label === "students" || label === "audit" || label === "lecturers" || label === "sessions")) {
        try {
          await replaceStoreFromRepoRows(label, label === "students" ? r.merged.map(studentFromRepo) : r.merged);
        } catch (e) { console.warn("local merge write", label, e); }
      }
    }

    await putFile(DATA_FILES.students, shapeStudentsForRepo(await getAll("students")), "students");
    await putFile(DATA_FILES.lecturers, await getAll("lecturers"), "lecturers");
    await putFile(DATA_FILES.sessions, await getAll("sessions"), "sessions");
    await putFile(DATA_FILES.qa_entries, await getAll("qa_entries"), "qa_entries");
    await putFile(DATA_FILES.audit, await getAll("audit"), "audit");
    try { await putFile(DATA_FILES.discipline, await getAll("discipline"), "discipline"); } catch (_) {}
    try { await putFile(DATA_FILES.pending_students, await getAll("pending_students"), "pending_students"); } catch (_) {}
    await putFile(DATA_FILES.programmes, await getAll("programmes"), "programmes");
    await putFile(DATA_FILES.levels, await getAll("levels"), "levels");
    await putFile(DATA_FILES.courses, await getAll("courses"), "courses");
    try {
      if (TIMETABLES_CACHE && typeof TIMETABLES_CACHE === "object" && Object.keys(TIMETABLES_CACHE).length) {
        var ttBody = JSON.stringify(TIMETABLES_CACHE, null, 2);
        var ttRemote = await fetchRemoteTextFresh(DATA_FILES.timetables);
        if (!ttRemote || textFingerprint(ttBody) !== textFingerprint(ttRemote)) {
          files[DATA_FILES.timetables] = ttBody;
          expectedFp[DATA_FILES.timetables] = textFingerprint(ttBody);
        } else unchanged.push("timetables");
      }
    } catch (_) {}
    try { await putFile(DATA_FILES.attendance, await getAll("attendance"), "attendance"); } catch (_) {}
    try { await putFile(DATA_FILES.hostel_runs, await getAll("hostel_runs"), "hostel_runs"); } catch (_) {}
    try { await putFile(DATA_FILES.biometric_pending, await getAll("biometric_pending"), "biometric_pending"); } catch (_) {}
    try { await putFile(DATA_FILES.remedial, await getAll("remedial"), "remedial"); } catch (_) {}
    try { await putFile(DATA_FILES.remedial_enrolment, await getAll("remedial_enrolment"), "remedial_enrolment"); } catch (_) {}
    try { await putFile(DATA_FILES.remedial_assignments, await getAll("remedial_assignments"), "remedial_assignments"); } catch (_) {}
    try { await putFile(DATA_FILES.remedial_logs, await getAll("remedial_logs"), "remedial_logs"); } catch (_) {}
    try {
      var rmeta = await getAll("remedial_meta");
      var metaVal = (rmeta[0] && (rmeta[0].value !== undefined ? rmeta[0].value : rmeta[0])) || {};
      if (metaVal && typeof metaVal === "object") {
        var mb = JSON.stringify(metaVal, null, 2);
        var mr = await fetchRemoteTextFresh(DATA_FILES.remedial_meta);
        if (!mr || textFingerprint(mb) !== textFingerprint(mr)) {
          files[DATA_FILES.remedial_meta] = mb;
          expectedFp[DATA_FILES.remedial_meta] = textFingerprint(mb);
        } else unchanged.push("remedial_meta");
      }
    } catch (_) {}
    try {
      var rt = await getAll("remedial_timetable");
      var ttVal = (rt[0] && rt[0].value) || (rt[0] || { slots: [] });
      var rtb = JSON.stringify(ttVal, null, 2);
      var rtr = await fetchRemoteTextFresh(DATA_FILES.remedial_timetable);
      if (!rtr || textFingerprint(rtb) !== textFingerprint(rtr)) {
        files[DATA_FILES.remedial_timetable] = rtb;
        expectedFp[DATA_FILES.remedial_timetable] = textFingerprint(rtb);
      } else unchanged.push("remedial_timetable");
    } catch (_) {}

    var fileKeys = Object.keys(files);
    if (!fileKeys.length) {
      EOCNS_DIRTY = false;
      clearDirty();
      try { await put("meta", { key: "dirty", value: false }); } catch (_) {}
      setSt("Nothing new to publish — repository already has the same data (" +
        (unchanged.length ? unchanged.join(", ") : "all stores") +
        "). Local marked clean; refresh will load from repository.");
      return;
    }

    setSt("Uploading " + fileKeys.length + " changed file(s) to GitHub (skipped " +
      unchanged.length + " unchanged)…");

    var headers = { "Content-Type": "application/json", "X-EOCNS-Key": key };
    var res = await fetch(workerUrl.replace(/\/$/, ""), {
      method: "POST",
      headers: headers,
      body: JSON.stringify({
        action: "publish",
        message: "EOCNS institutional publish (delta)",
        files: files
      })
    });
    var bodyText = await res.text();
    var body;
    try { body = JSON.parse(bodyText); } catch (_) { body = { raw: bodyText }; }
    if (!res.ok) {
      var msg = (body && body.error) ? body.error : (bodyText || res.statusText || String(res.status));
      if (res.status === 401) {
        msg += " — Check publishWorkerKey vs Worker PUBLISH_KEY secret.";
      }
      throw new Error(msg);
    }

    setSt("Worker accepted " + ((body.updated && body.updated.length) || fileKeys.length) +
      " file(s). Verifying repository before locking…");

    var verified = [];
    var failedVerify = [];
    for (var pi = 0; pi < fileKeys.length; pi++) {
      var pth = fileKeys[pi];
      var ok = await verifyRepoFile(pth, expectedFp[pth], 10, 2000);
      if (ok) verified.push(pth);
      else failedVerify.push(pth);
    }

    if (failedVerify.length) {
      // Do NOT wipe — institutional lock requires full verification
      EOCNS_DIRTY = true;
      try { await put("meta", { key: "dirty", value: true }); } catch (_) {}
      setSt("Publish sent but verification incomplete for: " + failedVerify.join(", ") +
        ". Local data KEPT. Wait 30s and Publish again. Nothing was wiped.");
      setPublishBusy(false);
      return;
    }

    // LOCKED SUCCESS: repo matches what we published
    EOCNS_DIRTY = false;
    clearDirty();
    try { await put("meta", { key: "dirty", value: false }); } catch (_) {}
    try { await put("meta", { key: "lastPublishAt", value: new Date().toISOString() }); } catch (_) {}
    try { await put("meta", { key: "lastPublishFiles", value: verified }); } catch (_) {}

    setSt("Verified on GitHub (" + verified.length + " file(s)). Locking local as published — no refresh needed…");

    try {
      // Mark local as identical to what we just published (smart: distinguish clean vs new local later)
      var pathToStore = {};
      for (var si = 0; si < SYNC_STORES.length; si++) {
        pathToStore[DATA_FILES[SYNC_STORES[si][1]]] = SYNC_STORES[si][0];
      }
      for (var pi2 = 0; pi2 < verified.length; pi2++) {
        var vp = verified[pi2];
        var stName = pathToStore[vp];
        if (stName && expectedFp[vp]) {
          await put("meta", { key: "repoFp:" + stName, value: expectedFp[vp] });
        }
      }
      // Fingerprint remaining local stores so next auto-sync knows baseline
      for (var si2 = 0; si2 < SYNC_STORES.length; si2++) {
        var sn = SYNC_STORES[si2][0];
        try {
          var rowsNow = await getAll(sn);
          var bodyNow = JSON.stringify(sn === "students" && typeof shapeStudentsForRepo === "function"
            ? shapeStudentsForRepo(rowsNow) : rowsNow, null, 2);
          await put("meta", { key: "repoFp:" + sn, value: textFingerprint(bodyNow) });
        } catch (_) {}
      }
      EOCNS_DIRTY = false;
      clearDirty();
      try { await put("meta", { key: "dirty", value: false }); } catch (_) {}
      try { await put("meta", { key: "lastPublishAt", value: new Date().toISOString() }); } catch (_) {}
      try { await refreshCachesAfterSync(); } catch (_) {}
      try { __eocnsLastSmartSync = 0; } catch (_) {}
      setSt("Published and locked. Local data matches the repository (" + verified.length +
        " file(s) updated; " + unchanged.length + " unchanged). No hard refresh needed — the system stays ready. Other open devices update automatically when focused.");
    } catch (postErr) {
      console.warn("post-publish lock", postErr);
      setSt("Published and verified on GitHub. Local kept. " + (postErr.message || postErr));
    }

    setPublishBusy(false);
    var panel = document.getElementById("qaTokenPanel");
    if (panel) panel.hidden = true;
    if (document.getElementById("qaPublishPin")) {
      document.getElementById("qaPublishPin").value = "";
      document.getElementById("qaPublishPin").disabled = false;
    }
  } catch (err) {
    console.error("publish error", err);
    var msg = (err && err.message) ? err.message : String(err || "unknown");
    var note = "";
    if (/Unauthorized|401|PUBLISH_KEY/i.test(msg)) {
      note = " Cause: publishWorkerKey does not match Worker secret PUBLISH_KEY.";
    } else if (/Failed to fetch|NetworkError|CORS|Load failed/i.test(msg)) {
      note = " Cause: cannot reach publish Worker URL.";
    } else if (/GITHUB_TOKEN|not configured/i.test(msg)) {
      note = " Cause: Worker missing GITHUB_TOKEN secret.";
    } else {
      note = " See browser console (F12) for detail.";
    }
    setSt("Publish failed: " + msg + note + " Confirm is enabled again — fix the issue and retry.");
    setPublishBusy(false);
  }
}

// Keep legacy seed loader pointing at repo students file
// =========================================================
// QA LECTURE COMPLIANCE (Daily / Weekly / Monthly)
// =========================================================
const QA_COURSES = [
  "NUS 121 — Human Anatomy II", "NUS 122 — Human Physiology II", "NUS 124 — Human Nutrition",
  "NUR 125 — Pharmacology I", "NUR 121 — Foundations Of Nursing II", "NUR 122 — Primary Health Care (PHC) I",
  "EED 126 — Intro. To Entrepreneurship", "PRAC — Practicum", "PSY — Developmental Psychology",
  "FNS 201 — Fundamentals of Nursing IV", "MSN 201 — Medical Surgical Nursing III",
  "RH 201 — Reproductive Health II", "PHARM 201 — Pharmacology III", "CH 201 — Community Health I",
  "RES 201 — Research and Statistics", "MWP 201 — Midwifery Practice", "CM 201 — Community Midwifery",
  "INF 201 — Infant I", "ANP 201 — Anatomy and Physiology", "TUT — Tutorial"
];
const QA_LECTURERS_SEED = [
  "Mr. John Agbo", "Dr. Jacinta Obinma", "Mrs. Anthonia Arua", "Mrs. Beatrice Ojinkama",
  "Dr. Ogbuinya Eda", "Ms. Theresa Ezeude", "Mrs. Patience Ekeh", "Dr. Eugene Otu",
  "Dr. Perpetual Eze", "Mr. Obasi Chukwu", "Dr. Aaron Nwedu", "Mr. Sabastine",
  "Mrs. Onovo Beatrice", "Mrs. Jennifer Amrasawore", "Barr. Mrs. Chukwu Felicia",
  "Ms. Udu Divine-Favour", "Ms. Mbah Anthonet Ezzineamaka", "Ms. Aneke Uchechukwu",
  "Mr. Simon Udu", "Mr. Sunday Taiwo"
];

async function seedQaDatalists() {
  try {
    COURSES_CACHE = await getAll("courses");
  } catch (_) { COURSES_CACHE = COURSES_CACHE || []; }
  try {
    await loadLecturers();
  } catch (_) {}
  var courseSel = document.getElementById("qaEntryCourse");
  var lecSel = document.getElementById("qaEntryLecturer");
  if (courseSel) {
    var cur = courseSel.value;
    var opts = '<option value="">— Select course —</option>';
    (COURSES_CACHE || []).slice().sort(function(a, b) { return String(a.code).localeCompare(String(b.code)); }).forEach(function(c) {
      var label = c.code + (c.name ? (" — " + c.name) : "");
      opts += '<option value="' + escapeHtml(label) + '">' + escapeHtml(label) + '</option>';
    });
    courseSel.innerHTML = opts;
    if (cur) courseSel.value = cur;
  }
  if (lecSel) {
    var curL = lecSel.value;
    var optsL = '<option value="">— Select lecturer —</option>';
    await loadActiveSession();
    lecturersForActiveSession().filter(function(l) { return !l.status || l.status === "Active"; })
      .slice().sort(function(a, b) { return String(a.name).localeCompare(String(b.name)); })
      .forEach(function(l) {
        optsL += '<option value="' + escapeHtml(l.name) + '">' + escapeHtml(l.name) + (l.staffId ? (" (" + escapeHtml(l.staffId) + ")") : "") + '</option>';
      });
    lecSel.innerHTML = optsL;
    if (curL) lecSel.value = curL;
  }
  // legacy datalists if present
  var dlC = document.getElementById("qaCourseList");
  var dlL = document.getElementById("qaLecturerList");
  if (dlC) {
    dlC.innerHTML = (COURSES_CACHE || []).map(function(c) {
      return '<option value="' + escapeHtml(c.code + (c.name ? (" — " + c.name) : "")) + '">';
    }).join("");
  }
  if (dlL) {
    dlL.innerHTML = (lecturersCache || []).map(function(l) {
      return '<option value="' + escapeHtml(l.name) + '">';
    }).join("");
  }
}
function calcQaDurationMinutes() {
  var s = document.getElementById("qaEntryStart") && document.getElementById("qaEntryStart").value;
  var e = document.getElementById("qaEntryEnd") && document.getElementById("qaEntryEnd").value;
  var out = document.getElementById("qaEntryDuration");
  if (!out) return;
  if (!s || !e) { out.value = ""; return; }
  var ps = s.split(":").map(Number);
  var pe = e.split(":").map(Number);
  var startM = ps[0] * 60 + (ps[1] || 0);
  var endM = pe[0] * 60 + (pe[1] || 0);
  var diff = endM - startM;
  if (diff < 0) diff += 24 * 60; // overnight rare
  out.value = String(diff);
}


async function getQaEntries(opts) {
  var all = await getAll("qa_entries");
  await loadActiveSession();
  var filtered = all.filter(entryInActiveSession);
  if (!(opts && opts.allSemesters)) filtered = filtered.filter(entryInActiveSemester);
  window.__lastQaReportEntries = filtered;
  return filtered;
}


// ===== Absent student picker (master list by programme + level) =====
var QA_ABSENT_SELECTED = new Set(); // keys: student id
var QA_ABSENT_ROSTER = []; // [{id, name, regNo, serial}]

function classKeyToProgrammeLevel(classKey) {
  // e.g. 100_nursing, 200_midwifery
  var ck = String(classKey || "");
  var level = "";
  var prog = "";
  var m = ck.match(/^(\d+)/);
  if (m) level = m[1];
  var slug = ck.replace(/^\d+_?/, "");
  try {
    var known = (typeof PROGRAMMES_CACHE !== "undefined" && PROGRAMMES_CACHE || []).find(function(p) { return programmeSlug(p.name) === slug; });
    if (known) return { programme: known.name, level: level };
  } catch (_) {}
  if (slug && !/nursing|midwifery|gns|mid/i.test(slug)) {
    return { programme: slug.replace(/_/g, " ").replace(/\b\w/g, function(c) { return c.toUpperCase(); }), level: level };
  }
  if (/nursing/i.test(ck)) prog = "Nursing";
  else if (/midwifery/i.test(ck)) prog = "Midwifery";
  else if (/gns/i.test(ck)) prog = "General Nursing";
  else if (/mid/i.test(ck)) prog = "Midwifery";
  return { programme: prog, level: level };
}

async function loadQaAbsentRoster(classKey) {
  var pl = classKeyToProgrammeLevel(classKey);
  var all = await getAll("students");
  // Prefer active session filter then programme/level
  var list = all.filter(function(s) {
    if (s.status && s.status !== "Active") return false;
    var okP = true, okL = true;
    if (pl.programme) {
      var sp = String(s.programme || "").toLowerCase();
      var pp = pl.programme.toLowerCase();
      okP = sp === pp || sp.indexOf(pp) >= 0 || pp.indexOf(sp) >= 0 ||
        (pp.indexOf("nurs") >= 0 && sp.indexOf("nurs") >= 0) ||
        (pp.indexOf("mid") >= 0 && sp.indexOf("mid") >= 0);
    }
    if (pl.level) {
      var sl = String(s.level || "").replace(/level/ig, "").trim();
      okL = sl === String(pl.level) || sl.indexOf(String(pl.level)) >= 0;
    }
    return okP && okL;
  });
  // permanent reg nos first, temporary (TMP-…) last; within group by reg no
  list.sort(compareStudentsByRegNo);
  QA_ABSENT_ROSTER = list.map(function(s, i) {
    return { id: s.id, name: s.name || "", regNo: s.regNo || "", serial: s.serial != null ? String(s.serial) : String(i + 1) };
  });
  return QA_ABSENT_ROSTER;
}

function renderQaAbsentList(query) {
  var q = String(query || "").toLowerCase().trim();
  var listEl = document.getElementById("qaAbsentStudentList");
  if (!listEl) return;
  var rows = QA_ABSENT_ROSTER.filter(function(s) {
    if (!q) return true;
    return (s.name || "").toLowerCase().indexOf(q) >= 0 ||
      (s.regNo || "").toLowerCase().indexOf(q) >= 0 ||
      (s.serial || "").indexOf(q) >= 0;
  });
  if (!rows.length) {
    listEl.innerHTML = '<div style="padding:12px;color:var(--muted,#64748b);font-size:0.85rem;text-align:center">' +
      (QA_ABSENT_ROSTER.length ? "No match" : "No students in master list for this programme/level") + "</div>";
    return;
  }
  listEl.innerHTML = rows.map(function(s) {
    var sel = QA_ABSENT_SELECTED.has(s.id);
    return '<div class="qa-student-option' + (sel ? " selected" : "") + '" data-abs-id="' + escapeHtml(s.id) + '">' +
      '<input type="checkbox"' + (sel ? " checked" : "") + ' />' +
      '<span class="qa-student-sn">' + escapeHtml(s.serial || "") + '</span>' +
      '<span>' + escapeHtml(s.name) + (s.regNo ? ' <span class="cell-sub">' + escapeHtml(s.regNo) + "</span>" : "") + "</span></div>";
  }).join("");
  listEl.querySelectorAll(".qa-student-option").forEach(function(row) {
    row.addEventListener("click", function(ev) {
      var id = row.getAttribute("data-abs-id");
      toggleQaAbsent(id);
      ev.preventDefault();
    });
  });
}



/** Mark all (filtered) students present — removes them from the absent set. */
function markAllQaPresent() {
  var q = String((document.getElementById("qaAbsentSearch") && document.getElementById("qaAbsentSearch").value) || "").toLowerCase().trim();
  var rows = QA_ABSENT_ROSTER.filter(function(s) {
    if (!q) return true;
    return (s.name || "").toLowerCase().indexOf(q) >= 0 ||
      (s.regNo || "").toLowerCase().indexOf(q) >= 0 ||
      (s.serial || "").indexOf(q) >= 0;
  });
  if (!q) {
    QA_ABSENT_SELECTED = new Set();
  } else {
    rows.forEach(function(s) { QA_ABSENT_SELECTED.delete(s.id); });
  }
  renderQaAbsentList(q);
  renderQaAbsentTags();
  syncQaAbsentHidden();
}

/** Mark all (filtered) students absent. Click individual rows afterward to set some back to present. */
function markAllQaAbsent() {
  selectAllQaAbsent();
}

function selectAllQaAbsent() {
  var q = String((document.getElementById("qaAbsentSearch") && document.getElementById("qaAbsentSearch").value) || "").toLowerCase().trim();
  var rows = QA_ABSENT_ROSTER.filter(function(s) {
    if (!q) return true;
    return (s.name || "").toLowerCase().indexOf(q) >= 0 ||
      (s.regNo || "").toLowerCase().indexOf(q) >= 0 ||
      (s.serial || "").indexOf(q) >= 0;
  });
  rows.forEach(function(s) { QA_ABSENT_SELECTED.add(s.id); });
  renderQaAbsentList(q);
  renderQaAbsentTags();
  syncQaAbsentHidden();
}

function clearAllQaAbsent() {
  QA_ABSENT_SELECTED = new Set();
  renderQaAbsentList((document.getElementById("qaAbsentSearch") && document.getElementById("qaAbsentSearch").value) || "");
  renderQaAbsentTags();
  syncQaAbsentHidden();
}

function toggleQaAbsent(id) {
  if (QA_ABSENT_SELECTED.has(id)) QA_ABSENT_SELECTED.delete(id);
  else QA_ABSENT_SELECTED.add(id);
  renderQaAbsentList((document.getElementById("qaAbsentSearch") && document.getElementById("qaAbsentSearch").value) || "");
  renderQaAbsentTags();
  syncQaAbsentHidden();
}

function renderQaAbsentTags() {
  var tags = document.getElementById("qaAbsentTags");
  if (!tags) return;
  var selected = QA_ABSENT_ROSTER.filter(function(s) { return QA_ABSENT_SELECTED.has(s.id); });
  if (!selected.length) {
    tags.innerHTML = '<span class="muted-note" style="font-size:0.8rem">No absentees marked</span>';
    return;
  }
  tags.innerHTML = selected.map(function(s) {
    return '<span class="absent-tag"><span>' + escapeHtml(s.serial ? s.serial + ". " : "") + escapeHtml(s.name) +
      '</span><button type="button" data-abs-remove="' + escapeHtml(s.id) + '" aria-label="Remove">×</button></span>';
  }).join("");
  tags.querySelectorAll("[data-abs-remove]").forEach(function(btn) {
    btn.addEventListener("click", function(e) {
      e.preventDefault();
      toggleQaAbsent(btn.getAttribute("data-abs-remove"));
    });
  });
}

function syncQaAbsentHidden() {
  var selected = QA_ABSENT_ROSTER.filter(function(s) { return QA_ABSENT_SELECTED.has(s.id); });
  // store as names (and serials) for report compatibility
  var val = selected.map(function(s) {
    return (s.serial ? s.serial + ". " : "") + s.name + (s.regNo ? " (" + s.regNo + ")" : "");
  }).join(", ");
  var hid = document.getElementById("qaEntryAbsent");
  if (hid) hid.value = val;
  window.__qaAbsentPayload = selected.map(function(s) {
    return { id: s.id, name: s.name, regNo: s.regNo, serial: s.serial };
  });
}

async function initQaAbsentPicker(classKey, preselected) {
  QA_ABSENT_SELECTED = new Set();
  await loadQaAbsentRoster(classKey);
  if (Array.isArray(preselected) && preselected.length) {
    // match by name, regNo, serial, or id
    preselected.forEach(function(raw) {
      var t = String(raw || "").toLowerCase().trim();
      QA_ABSENT_ROSTER.forEach(function(s) {
        if (s.id === raw || String(s.serial) === String(raw) ||
            (s.name && t.indexOf(s.name.toLowerCase()) >= 0) ||
            (s.regNo && t.indexOf(String(s.regNo).toLowerCase()) >= 0) ||
            t === String(s.serial).toLowerCase()) {
          QA_ABSENT_SELECTED.add(s.id);
        }
      });
    });
  }
  var search = document.getElementById("qaAbsentSearch");
  var btnPresent = document.getElementById("btnQaAllPresent");
  var btnAbsent = document.getElementById("btnQaAllAbsent") || document.getElementById("btnQaAbsentSelectAll");
  var btnClr = document.getElementById("btnQaAbsentClearAll");
  if (btnPresent && !btnPresent._wired) {
    btnPresent._wired = true;
    btnPresent.addEventListener("click", function(e) { e.preventDefault(); markAllQaPresent(); });
  }
  if (btnAbsent && !btnAbsent._wired) {
    btnAbsent._wired = true;
    btnAbsent.addEventListener("click", function(e) { e.preventDefault(); markAllQaAbsent(); });
  }
  if (btnClr && !btnClr._wired) {
    btnClr._wired = true;
    btnClr.addEventListener("click", function(e) { e.preventDefault(); markAllQaPresent(); });
  }

  if (search) {
    search.value = "";
    search.oninput = function() { renderQaAbsentList(search.value); };
  }
  renderQaAbsentList("");
  renderQaAbsentTags();
  syncQaAbsentHidden();
}

async function openQaEntryForm(id) {
  if (!isQaOfficer()) { alert("Sign in as QA Officer to log or edit lectures."); return; }
  if (!requireActiveSession("Lecture logging")) return;
  await seedQaDatalists();
  var form = document.getElementById("qaEntryForm");
  if (form) form.reset();
  // Normalise id: click handlers sometimes pass Event; only real string ids mean "edit"
  if (id && typeof id === "object") id = null;
  if (id != null) id = String(id).trim() || null;
  document.getElementById("qaEntryId").value = id || "";
  var amend = document.getElementById("qaEntryAmendBlock");
  var isEdit = !!id;
  if (amend) {
    amend.hidden = !isEdit;
    if (!isEdit) {
      amend.setAttribute("hidden", "");
      amend.style.display = "none";
      if (document.getElementById("qaEntryEditRef")) {
        document.getElementById("qaEntryEditRef").value = "";
        document.getElementById("qaEntryEditRef").required = false;
      }
      if (document.getElementById("qaEntryEditReason")) {
        document.getElementById("qaEntryEditReason").value = "";
        document.getElementById("qaEntryEditReason").required = false;
      }
    } else {
      amend.removeAttribute("hidden");
      amend.style.display = "";
      if (document.getElementById("qaEntryEditRef")) document.getElementById("qaEntryEditRef").required = true;
      if (document.getElementById("qaEntryEditReason")) document.getElementById("qaEntryEditReason").required = true;
    }
  }
  var saveBtn = document.getElementById("qaEntrySaveBtn");
  if (saveBtn) saveBtn.textContent = isEdit ? "Save changes to master sheet" : "Save entry";
  var dailyDate = document.getElementById("qaDailyDate") && document.getElementById("qaDailyDate").value;
  var dailyClass = document.getElementById("qaDailyClass") && document.getElementById("qaDailyClass").value;
  document.getElementById("qaEntryDate").value = dailyDate || new Date().toISOString().slice(0, 10);
  if (dailyClass) document.getElementById("qaEntryClass").value = dailyClass;
  document.getElementById("qaEntryModalTitle").textContent = id ? "Edit lecture log (active session)" : "Log lecture";
  if (id) {
    var all = await getAll("qa_entries");
    var ent = all.find(function(x) { return x.id === id; });
    if (ent) {
      document.getElementById("qaEntryDate").value = ent.date || "";
      document.getElementById("qaEntryClass").value = ent.classKey || "";
      await seedQaDatalists();
      var courseSel = document.getElementById("qaEntryCourse");
      var lecSel = document.getElementById("qaEntryLecturer");
      if (courseSel && ent.course) {
        if (![].some.call(courseSel.options, function(o) { return o.value === ent.course; })) {
          var o = document.createElement("option"); o.value = ent.course; o.textContent = ent.course; courseSel.appendChild(o);
        }
        courseSel.value = ent.course;
      }
      if (lecSel && ent.lecturer) {
        if (![].some.call(lecSel.options, function(o) { return o.value === ent.lecturer; })) {
          var o2 = document.createElement("option"); o2.value = ent.lecturer; o2.textContent = ent.lecturer; lecSel.appendChild(o2);
        }
        lecSel.value = ent.lecturer;
      }
      document.getElementById("qaEntryStart").value = ent.start || "";
      document.getElementById("qaEntryEnd").value = ent.end || "";
      document.getElementById("qaEntryStatus").value = ent.status || "Held";
      document.getElementById("qaEntryDuration").value = ent.duration != null ? ent.duration : "";
      if (document.getElementById("qaEntryTopic")) document.getElementById("qaEntryTopic").value = ent.topic || "";
      if (document.getElementById("qaEntryObjectives")) document.getElementById("qaEntryObjectives").value = ent.objectives || "";
      if (document.getElementById("qaEntrySummary")) document.getElementById("qaEntrySummary").value = ent.lectureSummary || ent.summary || "";
      if (document.getElementById("qaEntryAssignment")) document.getElementById("qaEntryAssignment").value = ent.assignment || "";
      if (document.getElementById("qaEntryRemark")) document.getElementById("qaEntryRemark").value = ent.remark || "";
      if (document.getElementById("qaEntryAbsent")) document.getElementById("qaEntryAbsent").value = Array.isArray(ent.absent) ? ent.absent.join(", ") : (ent.absent || "");
      if (document.getElementById("qaEntryEditRef")) document.getElementById("qaEntryEditRef").value = "";
      if (document.getElementById("qaEntryEditReason")) document.getElementById("qaEntryEditReason").value = "";
    }
  }
  var classForAbsent = document.getElementById("qaEntryClass") && document.getElementById("qaEntryClass").value;
  var preAbs = [];
  if (id) {
    var allE = await getAll("qa_entries");
    var ent2 = allE.find(function(x) { return x.id === id; });
    if (ent2) {
      if (Array.isArray(ent2.absentDetails) && ent2.absentDetails.length) {
        preAbs = ent2.absentDetails.map(function(d) { return d.id || d.name || d.regNo; });
      } else if (Array.isArray(ent2.absent)) preAbs = ent2.absent;
      else if (ent2.absent) preAbs = String(ent2.absent).split(/[,;\n]+/);
    }
  }
  try { await initQaAbsentPicker(classForAbsent, preAbs); } catch (err) { console.warn("absent picker", err); }
  // refresh roster when class changes
  var classSel = document.getElementById("qaEntryClass");
  if (classSel && !classSel._absentBound) {
    classSel.addEventListener("change", function() {
      initQaAbsentPicker(classSel.value, Array.from(QA_ABSENT_SELECTED));
    });
    classSel._absentBound = true;
  }
  calcQaDurationMinutes();
  document.getElementById("qaEntryModal").hidden = false;
}

function closeQaEntryForm() {
  const modal = document.getElementById("qaEntryModal");
  if (modal) modal.hidden = true;
}


function collectAmendmentsFromEntries(entries) {
  var notes = [];
  (entries || []).forEach(function(e) {
    (e.amendments || []).forEach(function(a) {
      notes.push({
        course: e.course || "",
        date: e.date || "",
        at: a.at || a.dateLabel || "",
        dateLabel: a.dateLabel || (a.at ? new Date(a.at).toLocaleString() : ""),
        ref: a.ref || e.lastAmendedRef || "",
        reason: a.reason || e.lastAmendedReason || "",
        officer: a.officer || "QA Officer"
      });
    });
  });
  return notes;
}

function amendmentFooterHtml(entries) {
  var notes = collectAmendmentsFromEntries(entries);
  if (!notes.length) return "";
  var lines = notes.map(function(n, i) {
    return (i + 1) + ". " + (n.date ? n.date + " · " : "") + (n.course ? n.course + " · " : "") +
      "Changed by " + (n.officer || "QA Officer") + " on " + (n.dateLabel || n.at || "—") +
      (n.ref ? (" · REF " + n.ref) : "") +
      (n.reason ? (" — " + n.reason) : "");
  }).join("<br/>");
  return "<div class=\"amend-footer\" style=\"margin-top:18px;padding:10px 12px;border:1px solid #cbd5e1;border-radius:6px;background:#f8fafc;font-size:0.82rem;color:#475569\">" +
    "<strong style=\"color:#0f766e\">Record amendments (transparency)</strong><br/>" +
    "The following lecture log(s) in this report range were edited after first save. Values shown are the current master-sheet values." +
    "<br/><br/>" + lines + "</div>";
}

async function saveQaEntry(e) {
  e.preventDefault();
  if (!isQaOfficer()) { alert("Sign in as QA Officer to log lectures."); return; }
  if (!requireActiveSession("Lecture logging")) return;
  calcQaDurationMinutes();
  var id = (document.getElementById("qaEntryId") && document.getElementById("qaEntryId").value || "").trim() || null;
  var date = document.getElementById("qaEntryDate").value;
  var classKey = document.getElementById("qaEntryClass").value;
  var course = document.getElementById("qaEntryCourse").value.trim();
  var lecturer = document.getElementById("qaEntryLecturer").value.trim();
  var status = document.getElementById("qaEntryStatus").value;
  var start = (document.getElementById("qaEntryStart") && document.getElementById("qaEntryStart").value) || "";
  var end = (document.getElementById("qaEntryEnd") && document.getElementById("qaEntryEnd").value) || "";
  var duration = Number(document.getElementById("qaEntryDuration").value) || null;
  var topic = (document.getElementById("qaEntryTopic") && document.getElementById("qaEntryTopic").value.trim()) || "";
  var objectives = (document.getElementById("qaEntryObjectives") && document.getElementById("qaEntryObjectives").value.trim()) || "";
  var summary = (document.getElementById("qaEntrySummary") && document.getElementById("qaEntrySummary").value.trim()) || "";
  var assignment = (document.getElementById("qaEntryAssignment") && document.getElementById("qaEntryAssignment").value.trim()) || "";
  var remark = (document.getElementById("qaEntryRemark") && document.getElementById("qaEntryRemark").value.trim()) || "";
  syncQaAbsentHidden();
  var absentDetails = window.__qaAbsentPayload || [];
  var absent = absentDetails.length
    ? absentDetails.map(function(d) { return (d.serial ? d.serial + ". " : "") + d.name; })
    : ((document.getElementById("qaEntryAbsent") && document.getElementById("qaEntryAbsent").value.trim()) || "").split(/[,;\n]+/).map(function(s) { return s.trim(); }).filter(Boolean);
  if (!date || !course || !lecturer || !start || !end) {
    alert("Date, course, lecturer, start time and end time are required.");
    return;
  }
  var editRef = "";
  var editReason = "";
  var existing = null;
  if (id) {
    editRef = (document.getElementById("qaEntryEditRef") && document.getElementById("qaEntryEditRef").value || "").trim();
    editReason = (document.getElementById("qaEntryEditReason") && document.getElementById("qaEntryEditReason").value || "").trim();
    if (!editRef) { alert("Official REF is required to edit a saved lecture log."); return; }
    if (!editReason) { alert("A reason is required to edit a saved lecture log."); return; }
    var all = await getAll("qa_entries");
    existing = all.find(function(x) { return x.id === id; }) || null;
  }
  var now = new Date().toISOString();
  var entry = {
    id: id || ("qa_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)),
    date: date, classKey: classKey, course: course, lecturer: lecturer, status: status,
    duration: duration, start: start, end: end, topic: topic, objectives: objectives,
    lectureSummary: summary, assignment: assignment, remark: remark, absent: absent, absentDetails: absentDetails, updatedAt: now
  };
  if (!id) {
    entry.createdAt = now;
    entry.amendments = [];
  } else {
    entry.createdAt = (existing && existing.createdAt) || now;
    entry.amendments = (existing && Array.isArray(existing.amendments)) ? existing.amendments.slice() : [];
    entry.amendments.push({
      at: now,
      dateLabel: new Date(now).toLocaleString(),
      ref: editRef,
      reason: editReason,
      officer: "QA Officer",
      before: existing ? {
        status: existing.status, lecturer: existing.lecturer, course: existing.course,
        start: existing.start, end: existing.end, duration: existing.duration, topic: existing.topic
      } : null
    });
    entry.lastAmendedAt = now;
    entry.lastAmendedRef = editRef;
    entry.lastAmendedReason = editReason;
  }
  stampSessionFields(entry);
  await put("qa_entries", entry);
  await writeAudit({
    action: id ? "update" : "create",
    entity: "qa_entries",
    entityId: entry.id,
    externalRef: id ? editRef : undefined,
    reason: id ? editReason : "Lecture logged",
    details: { date: date, course: course, status: status, classKey: classKey, amended: !!id }
  });
  markDirty("qa_entries");
  document.getElementById("qaEntryModal").hidden = true;
  try { await renderQaDaily(); } catch (_) {}
  try { refreshDashboardStats(); } catch (_) {}
  if (id) alert("Lecture log updated on the master sheet. Publish when ready so other devices see the change.");
}

async function deleteQaEntry(id) {
  if (!confirm("Delete this QA entry?")) return;
  await new Promise((resolve, reject) => {
    const t = db.transaction("qa_entries", "readwrite");
    t.objectStore("qa_entries").delete(id);
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
  await writeAudit({ action: "update", entity: "qa_entries", entityId: id, reason: "Deleted QA entry", details: {} });
  await renderQaDaily();
}


function courseName(code) {
  const c = COURSES_CACHE.find(function(x) { return x.code === code; });
  return c ? (code + " — " + c.name) : code;
}
function weekdayOfDate(dateStr) {
  const d = new Date(dateStr + "T12:00:00");
  const wd = d.getDay();
  return wd === 0 ? 6 : wd - 1;
}
function downloadJsonReport(filename, payload) {
  if (!isQaOfficer()) { alert("Sign in as QA Officer to download."); return; }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}
async function renderReportsView() {
  var from = (document.getElementById("reportFrom") && document.getElementById("reportFrom").value) || "";
  var to = (document.getElementById("reportTo") && document.getElementById("reportTo").value) || "";
  var classKey = (document.getElementById("reportClass") && document.getElementById("reportClass").value) || "";
  var entries = await getQaEntries();
  entries = entries.filter(function(e) {
    if (from && e.date < from) return false;
    if (to && e.date > to) return false;
    if (classKey && e.classKey !== classKey) return false;
    return true;
  });
  entries.sort(function(a, b) { return (b.date || "").localeCompare(a.date || ""); });
  var tbody = document.getElementById("reportsTableBody");
  var empty = document.getElementById("reportsEmpty");
  if (!tbody) return;
  if (!entries.length) {
    tbody.innerHTML = "";
    if (empty) empty.hidden = false;
    return;
  }
  if (empty) empty.hidden = true;
  tbody.innerHTML = entries.map(function(e) {
    var time = [e.start, e.end].filter(Boolean).join("–") || "—";
    var absent = Array.isArray(e.absent) ? e.absent.join(", ") : (e.absent || "—");
    return "<tr><td>" + escapeHtml(e.date || "") + "</td><td>" + escapeHtml(e.classKey || "") +
      "</td><td>" + escapeHtml(e.course || "") + "</td><td>" + escapeHtml(e.lecturer || "") +
      "</td><td>" + escapeHtml(time) + "</td><td>" + escapeHtml(e.status || "") +
      "</td><td>" + escapeHtml(e.topic || "—") + "</td><td>" + escapeHtml(absent || "—") + "</td></tr>";
  }).join("");
  window.__lastReportEntries = entries;
}
async function exportLectureLogs() {
  if (!isQaOfficer()) { alert("Sign in as QA Officer to export."); return; }
  var entries = window.__lastReportEntries || await getQaEntries();
  downloadJsonReport("EOCNS_LectureLogs_" + new Date().toISOString().slice(0, 10) + ".json", {
    exportedAt: new Date().toISOString(),
    source: "EOCNS master QA entries",
    count: entries.length,
    entries: entries
  });
}

async function renderProgrammesLevels() {
  PROGRAMMES_CACHE = await getAll("programmes");
  LEVELS_CACHE = await getAll("levels");
  const pl = document.getElementById("programmesList");
  const ll = document.getElementById("levelsList");
  if (pl) pl.innerHTML = PROGRAMMES_CACHE.length ? PROGRAMMES_CACHE.map(function(p) {
    return "<li>" + escapeHtml(p.name) + " (" + escapeHtml(p.code || "") + ")</li>";
  }).join("") : "<li>None yet</li>";
  if (ll) ll.innerHTML = LEVELS_CACHE.length ? LEVELS_CACHE.map(function(l) {
    return "<li>" + escapeHtml(l.name) + "</li>";
  }).join("") : "<li>None yet</li>";
}
async function addProgrammePrompt() {
  if (!isQaOfficer()) return;
  const name = prompt("Programme name (e.g. Nursing)");
  if (!name) return;
  const code = prompt("Short code (e.g. GNS)", name.slice(0, 3).toUpperCase()) || "";
  await put("programmes", { id: "prog_" + Date.now().toString(36), name: name.trim(), code: code.trim(), status: "Active" });
  await writeAudit({ action: "create", entity: "programmes", entityId: name, reason: "New programme " + name });
  await renderProgrammesLevels();
  await fillProgrammeLevelSelects();
}
async function addLevelPrompt() {
  if (!isQaOfficer()) return;
  const name = prompt("Level name (e.g. 100 Level)");
  if (!name) return;
  const value = Number(prompt("Numeric value", "100")) || 0;
  await put("levels", { id: "lvl_" + Date.now().toString(36), name: name.trim(), value: value, status: "Active" });
  await writeAudit({ action: "create", entity: "levels", entityId: name, reason: "New level " + name });
  await renderProgrammesLevels();
  await fillProgrammeLevelSelects();
}

async function renderQaDaily() {
  const dateEl = document.getElementById("qaDailyDate");
  const classEl = document.getElementById("qaDailyClass");
  if (!dateEl) return;
  if (!dateEl.value) dateEl.value = new Date().toISOString().slice(0, 10);
  const date = dateEl.value;
  const classKey = classEl && classEl.value ? classEl.value : "100_nursing";
  const tts = await ensureTimetables();
  const tt = tts[classKey] || { slots: [] };
  const wd = weekdayOfDate(date);
  const slots = (tt.slots || []).filter(function(s) { return s.weekday === wd; });
  let entries = await getQaEntries();
  entries = entries.filter(function(e) { return e.date === date && e.classKey === classKey; });
  const tbody = document.getElementById("qaDailyTableBody");
  const empty = document.getElementById("qaDailyEmpty");
  const stats = document.getElementById("qaDailyStats");
  const dl = document.getElementById("btnDownloadDailyQa");
  if (!tbody) return;
  if (wd > 4 && slots.length === 0) {
    tbody.innerHTML = "";
    if (empty) { empty.hidden = false; empty.innerHTML = "<h3>Weekend</h3><p>No timetable slots (Mon–Fri only).</p>"; }
    if (stats) stats.hidden = true;
    if (dl) dl.hidden = true;
    return;
  }
  function findEntry(slot) {
    return entries.find(function(e) {
      return e.course && (e.course.indexOf(slot.code) === 0 || e.course.indexOf(slot.code + " ") >= 0);
    });
  }
  var scheduled = slots.length, held = 0, missed = 0;
  var rows = slots.map(function(slot) {
    var ent = findEntry(slot);
    var status = ent ? ent.status : "Pending";
    if (status === "Held" || status === "Partial") held++;
    if (status === "Missed") missed++;
    var badge = status === "Held" ? "badge--green" : status === "Missed" ? "badge--amber" : "badge--muted";
    var lecturer = ent ? (ent.lecturer || "—") : "—";
    var mins = ent && ent.duration != null ? ent.duration : "—";
    var reportBtn = (ent && ent.id && isQaOfficer())
      ? (' <button type="button" class="icon-btn-sm" data-report-qa="' + escapeHtml(ent.id) + '">Report</button>')
      : "";
    var editCell = isQaOfficer()
      ? ('<td class="qa-edit-only"><button type="button" class="icon-btn-sm" data-log-slot="' + escapeHtml(slot.code) + '|' + escapeHtml(slot.start) + '">Log</button>' + reportBtn + '</td>')
      : '<td class="qa-edit-only"></td>';
    return "<tr><td>" + escapeHtml(slot.start + "–" + slot.end) + "</td><td>" + escapeHtml(courseName(slot.code)) +
      "</td><td>" + slot.hours + "</td><td><span class=\"badge " + badge + "\">" + escapeHtml(status) + "</span></td><td>" +
      escapeHtml(lecturer) + "</td><td>" + mins + "</td>" + (isQaOfficer() && ent
        ? ('<td class="qa-edit-only"><button type="button" class="icon-btn-sm" data-edit-qa="' + ent.id + '">Edit</button> ' +
           '<button type="button" class="icon-btn-sm" data-report-qa="' + escapeHtml(ent.id) + '">Report</button></td>')
        : editCell) + "</tr>";
  });
  entries.forEach(function(e) {
    var onTt = slots.some(function(s) { return e.course && e.course.indexOf(s.code) >= 0; });
    if (onTt) return;
    if (e.status === "Held" || e.status === "Partial") held++;
    if (e.status === "Missed") missed++;
    var badge = e.status === "Held" ? "badge--green" : e.status === "Missed" ? "badge--amber" : "badge--muted";
    rows.push("<tr><td>—</td><td>" + escapeHtml(e.course) + " <span class=\"cell-sub\">extra</span></td><td>—</td><td><span class=\"badge " + badge + "\">" +
      escapeHtml(e.status) + "</span></td><td>" + escapeHtml(e.lecturer || "—") + "</td><td>" + (e.duration != null ? e.duration : "—") +
      '</td><td class="qa-edit-only">' + (isQaOfficer() ? ('<button type="button" class="icon-btn-sm" data-edit-qa="' + e.id + '">Edit</button>') : "") + "</td></tr>");
  });
  if (!rows.length) {
    tbody.innerHTML = "";
    if (empty) { empty.hidden = false; empty.innerHTML = "<h3>No slots</h3><p>No timetable for this class/day.</p>"; }
    if (stats) stats.hidden = true;
    return;
  }
  if (empty) empty.hidden = true;
  tbody.innerHTML = rows.join("");
  tbody.querySelectorAll("[data-edit-qa]").forEach(function(btn) {
    btn.addEventListener("click", function() { openQaEntryForm(btn.getAttribute("data-edit-qa")); });
  });
  tbody.querySelectorAll("[data-log-slot]").forEach(function(btn) {
    btn.addEventListener("click", async function() {
      var parts = btn.getAttribute("data-log-slot").split("|");
      await openQaEntryForm(null);
      document.getElementById("qaEntryDate").value = date;
      document.getElementById("qaEntryClass").value = classKey;
      var label = courseName(parts[0]);
      var courseSel = document.getElementById("qaEntryCourse");
      if (courseSel) {
        var found = false;
        for (var i = 0; i < courseSel.options.length; i++) {
          if (courseSel.options[i].value.indexOf(parts[0]) === 0 || courseSel.options[i].value === label) {
            courseSel.selectedIndex = i; found = true; break;
          }
        }
        if (!found) {
          var o = document.createElement("option"); o.value = label; o.textContent = label; courseSel.appendChild(o); courseSel.value = label;
        }
      }
      if (parts[1] && document.getElementById("qaEntryStart")) {
        // timetable may be HH:MM already
        var st = parts[1];
        if (/^\d{1,2}:\d{2}$/.test(st)) document.getElementById("qaEntryStart").value = st.length === 4 ? ("0" + st) : st;
      }
      calcQaDurationMinutes();
    });
  });
  tbody.querySelectorAll("[data-report-qa]").forEach(function(btn) {
    btn.addEventListener("click", async function() {
      var id = btn.getAttribute("data-report-qa");
      var all = await getQaEntries();
      var entry = all.find(function(x) { return x.id === id; });
      if (entry) printSingleLectureReport(entry);
    });
  });
  if (stats) {
    stats.hidden = false;
    var rate = scheduled ? Math.round((held / scheduled) * 100) : 0;
    stats.innerHTML = "<div class=\"stat-card\"><div class=\"stat-card__body\"><span class=\"stat-card__value\">" + scheduled + "</span><span class=\"stat-card__label\">Scheduled</span></div></div>" +
      "<div class=\"stat-card\"><div class=\"stat-card__body\"><span class=\"stat-card__value\">" + held + "</span><span class=\"stat-card__label\">Held / Partial</span></div></div>" +
      "<div class=\"stat-card\"><div class=\"stat-card__body\"><span class=\"stat-card__value\">" + missed + "</span><span class=\"stat-card__label\">Missed</span></div></div>" +
      "<div class=\"stat-card\"><div class=\"stat-card__body\"><span class=\"stat-card__value\">" + rate + "%</span><span class=\"stat-card__label\">Day rate</span></div></div>";
  }
  if (dl) {
    dl.hidden = !isQaOfficer();
    dl.onclick = function() {
      downloadJsonReport("QA_Daily_" + date + "_" + classKey + ".json", { date: date, classKey: classKey, scheduled: scheduled, held: held, missed: missed, entries: entries });
    };
  }
}

function mondayOf(d) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  return x;
}

function initQaWeeklyView() {
  const el = document.getElementById("qaWeekStart");
  if (el && !el.value) {
    const mon = mondayOf(new Date());
    el.value = mon.toISOString().slice(0, 10);
  }
}

function initQaMonthlyView() {
  const el = document.getElementById("qaMonthInput");
  if (el && !el.value) {
    const d = new Date();
    el.value = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
  }
}

async function buildWeeklyQaReport() {
  await ensureTimetables();
  var start = (document.getElementById("qaWeekStart") && document.getElementById("qaWeekStart").value) || "";
  var end = (document.getElementById("qaWeekEnd") && document.getElementById("qaWeekEnd").value) || "";
  var classKey = (document.getElementById("qaWeekClass") && document.getElementById("qaWeekClass").value) || "100_nursing";
  var excludeRaw = (document.getElementById("qaWeekExclude") && document.getElementById("qaWeekExclude").value) || "";
  var excluded = excludeRaw.split(/[,;\s]+/).map(function(s) { return s.trim(); }).filter(Boolean);
  if (!start || !end) { alert("Choose week start and end dates."); return; }
  var tt = TIMETABLES_CACHE[classKey] || { slots: [] };
  var slots = tt.slots || [];
  var scheduled = 0;
  var cursor = new Date(start + "T12:00:00");
  var endD = new Date(end + "T12:00:00");
  while (cursor <= endD) {
    var iso = cursor.toISOString().slice(0, 10);
    if (excluded.indexOf(iso) < 0) {
      var wd = (cursor.getDay() + 6) % 7;
      scheduled += slots.filter(function(s) { return Number(s.weekday) === wd; }).length;
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  var entries = (await getQaEntries()).filter(function(e) {
    return e.classKey === classKey && e.date >= start && e.date <= end && excluded.indexOf(e.date) < 0;
  });
  var delivered = entries.filter(function(e) { return e.status === "Held" || e.status === "Partial"; }).length;
  var missed = entries.filter(function(e) { return e.status === "Missed"; }).length;
  if (!entries.length && scheduled) missed = Math.max(0, scheduled - delivered);
  var byCourse = {};
  slots.forEach(function(s) {
    byCourse[s.code] = byCourse[s.code] || { course: s.code, lecturer: "", sched: 0, deliv: 0, missed: 0, hrs: 0 };
  });
  cursor = new Date(start + "T12:00:00");
  while (cursor <= endD) {
    var iso2 = cursor.toISOString().slice(0, 10);
    if (excluded.indexOf(iso2) < 0) {
      var wd2 = (cursor.getDay() + 6) % 7;
      slots.filter(function(s) { return Number(s.weekday) === wd2; }).forEach(function(s) {
        byCourse[s.code] = byCourse[s.code] || { course: s.code, lecturer: "", sched: 0, deliv: 0, missed: 0, hrs: 0 };
        byCourse[s.code].sched += 1;
      });
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  entries.forEach(function(e) {
    var code = (e.course || "").split("—")[0].trim() || e.course || "Other";
    byCourse[code] = byCourse[code] || { course: code, lecturer: "", sched: 0, deliv: 0, missed: 0, hrs: 0 };
    if (e.lecturer) byCourse[code].lecturer = e.lecturer;
    if (e.status === "Held" || e.status === "Partial") {
      byCourse[code].deliv += 1;
      byCourse[code].hrs += (Number(e.duration) || 0) / 60;
    }
    if (e.status === "Missed") byCourse[code].missed += 1;
  });
  var courseRows = Object.keys(byCourse).map(function(k) {
    var r = byCourse[k];
    var pct = r.sched ? Math.round((r.deliv / r.sched) * 1000) / 10 : (r.deliv ? "—" : "0");
    var status = r.sched === 0 && r.deliv ? "Not in Timetable" : (r.missed === 0 && r.deliv >= r.sched && r.sched ? "Fully Delivered" : (r.deliv === 0 && r.sched ? "Fully Missed" : "Partial"));
    return { course: r.course, lecturer: r.lecturer || "—", sched: r.sched, deliv: r.deliv, missed: r.missed, hrs: (Math.round(r.hrs * 10) / 10) + "h", status: status, pct: pct === "—" ? "—" : (pct + "%") };
  });
  var dayNames = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  var dayRows = entries.slice().sort(function(a, b) { return String(a.date).localeCompare(String(b.date)); }).map(function(e) {
    var d = new Date(e.date + "T12:00:00");
    return {
      date: e.date,
      day: dayNames[(d.getDay() + 6) % 7],
      course: e.course || "",
      lecturer: e.lecturer || "",
      topic: e.topic || "",
      time: formatTimeNice(e.start) + " – " + formatTimeNice(e.end),
      hrs: e.duration != null ? (Math.round((Number(e.duration) / 60) * 10) / 10) + "h" : ""
    };
  });
  var rate = scheduled ? Math.round((delivered / scheduled) * 1000) / 10 : 0;
  var out = document.getElementById("qaWeeklyResult");
  if (out) {
    out.innerHTML = "<div class=\"pro-report\"><h3 style=\"margin:0 0 8px\">Weekly summary</h3>" +
      "<div class=\"stats-grid\" style=\"margin-bottom:12px\">" +
      "<div class=\"stat-card\"><div class=\"stat-card__body\"><span class=\"stat-card__value\">" + scheduled + "</span><span class=\"stat-card__label\">Scheduled</span></div></div>" +
      "<div class=\"stat-card\"><div class=\"stat-card__body\"><span class=\"stat-card__value\">" + delivered + "</span><span class=\"stat-card__label\">Delivered</span></div></div>" +
      "<div class=\"stat-card\"><div class=\"stat-card__body\"><span class=\"stat-card__value\">" + missed + "</span><span class=\"stat-card__label\">Missed</span></div></div>" +
      "<div class=\"stat-card\"><div class=\"stat-card__body\"><span class=\"stat-card__value\">" + rate + "%</span><span class=\"stat-card__label\">Compliance</span></div></div></div>" +
      "<p class=\"muted-note\">Click <strong>Print weekly pack</strong> for the full professional report (course table, charts, day-by-day).</p></div>";
  }
  window.__weeklyQaPayload = {
    classKey: classKey,
    periodLabel: "Week: " + start + " to " + end,
    excluded: excluded.join(", ") || "None",
    scheduled: scheduled,
    delivered: delivered,
    missed: missed,
    courseRows: courseRows,
    dayRows: dayRows
  };
}

async function buildMonthlyQaReport() {
  await ensureTimetables();
  var monthVal = (document.getElementById("qaMonth") && document.getElementById("qaMonth").value) || "";
  var classKey = (document.getElementById("qaMonthClass") && document.getElementById("qaMonthClass").value) || "100_nursing";
  if (!monthVal) { alert("Choose a month."); return; }
  var entries = (await getQaEntries()).filter(function(e) {
    return e.classKey === classKey && String(e.date || "").slice(0, 7) === monthVal;
  });
  var tt = TIMETABLES_CACHE[classKey] || { slots: [] };
  // Approximate scheduled: count weekdays in month × slots per weekday
  var y = Number(monthVal.slice(0, 4)), m = Number(monthVal.slice(5, 7)) - 1;
  var scheduled = 0;
  var d = new Date(y, m, 1);
  while (d.getMonth() === m) {
    var wd = (d.getDay() + 6) % 7;
    if (wd < 5) scheduled += (tt.slots || []).filter(function(s) { return Number(s.weekday) === wd; }).length;
    d.setDate(d.getDate() + 1);
  }
  var delivered = entries.filter(function(e) { return e.status === "Held" || e.status === "Partial"; }).length;
  var missed = entries.filter(function(e) { return e.status === "Missed"; }).length;
  var rate = scheduled ? Math.round((delivered / scheduled) * 1000) / 10 : (entries.length ? Math.round((delivered / entries.length) * 1000) / 10 : 0);
  var byCourse = {};
  entries.forEach(function(e) {
    var c = e.course || "Other";
    byCourse[c] = byCourse[c] || { course: c, scheduled: 0, held: 0, missed: 0 };
    if (e.status === "Held" || e.status === "Partial") byCourse[c].held += 1;
    if (e.status === "Missed") byCourse[c].missed += 1;
  });
  var courseRows = Object.keys(byCourse).map(function(k) {
    var r = byCourse[k];
    var t = r.held + r.missed;
    return { course: r.course, scheduled: t, held: r.held, missed: r.missed, rate: t ? Math.round((r.held / t) * 1000) / 10 : 0 };
  });
  var out = document.getElementById("qaMonthlyResult");
  if (out) {
    out.innerHTML = "<div class=\"pro-report\"><h3 style=\"margin:0 0 8px\">Monthly summary</h3>" +
      "<div class=\"stats-grid\">" +
      "<div class=\"stat-card\"><div class=\"stat-card__body\"><span class=\"stat-card__value\">" + scheduled + "</span><span class=\"stat-card__label\">Scheduled (est.)</span></div></div>" +
      "<div class=\"stat-card\"><div class=\"stat-card__body\"><span class=\"stat-card__value\">" + delivered + "</span><span class=\"stat-card__label\">Delivered</span></div></div>" +
      "<div class=\"stat-card\"><div class=\"stat-card__body\"><span class=\"stat-card__value\">" + missed + "</span><span class=\"stat-card__label\">Missed</span></div></div>" +
      "<div class=\"stat-card\"><div class=\"stat-card__body\"><span class=\"stat-card__value\">" + rate + "%</span><span class=\"stat-card__label\">Compliance</span></div></div></div>" +
      "<p class=\"muted-note\">Use <strong>Print monthly pack</strong> for the full professional board report.</p></div>";
  }
  window.__monthlyQaPayload = {
    classKey: classKey,
    monthLabel: monthVal,
    scheduled: scheduled,
    delivered: delivered,
    missed: missed,
    rate: rate,
    courseRows: courseRows
  };
}



async function buildAttendanceSheet() {
  if (!isQaOfficer()) { openOfficerLoginGate("attendance"); return; }

  await loadStudents();
  await fillProgrammeLevelSelects();
  var prog = (document.getElementById("attProgramme") && document.getElementById("attProgramme").value) || "";
  var level = (document.getElementById("attLevel") && document.getElementById("attLevel").value) || "";
  if (!prog || !level) {
    alert("Select both programme and level to build the sheet.");
    return;
  }
  var sessionLabel = (document.getElementById("attSessionLabel") && document.getElementById("attSessionLabel").value.trim()) || "";
  if (!sessionLabel) {
    try {
      var sessions = await getAll("sessions");
      var active = sessions.find(function(s) { return s.status === "Active"; });
      if (active && active.name) sessionLabel = active.name;
    } catch (_) {}
  }
  if (!sessionLabel) sessionLabel = new Date().getFullYear() + "/" + (new Date().getFullYear() + 1) + " SESSION";

  var colCount = Number(document.getElementById("attCourseCols") && document.getElementById("attCourseCols").value) || 4;
  if (colCount < 1) colCount = 1;
  if (colCount > 12) colCount = 12;

  var list = studentsCache.filter(function(s) {
    if (s.status && s.status !== "Active") return false;
    if (String(s.programme || "") !== prog) return false;
    if (String(s.level || "") !== String(level)) return false;
    return true;
  }).sort(function(a, b) { return String(a.name).localeCompare(String(b.name)); });

  var title = document.getElementById("attendanceSheetTitle");
  if (title) title.textContent = "Attendance sheet — " + prog + " · Level " + level;

  var body = document.getElementById("attendanceSheetBody");
  if (!body) return;
  if (!list.length) {
    body.innerHTML = "<div class=\"empty-state\"><h3>No students</h3><p>No active students in this programme and level.</p></div>";
    return;
  }

  var dept = String(prog).toUpperCase() + " DEPARTMENT";
  var lvlLabel = String(level) + " LVL";
  var headTitle = "EOCNS ATTENDANCE FOR " + dept + " " + lvlLabel + " - " + sessionLabel;

  var courseHeaders = "";
  for (var c = 0; c < colCount; c++) {
    courseHeaders += "<th class=\"att-course-col\">COURSE CODE</th>";
  }

  var rows = list.map(function(s, i) {
    var cells = "";
    for (var c = 0; c < colCount; c++) cells += "<td class=\"att-mark-cell\"></td>";
    var regNote = s.regNo ? (" <span class=\"att-reg\">" + escapeHtml(s.regNo) + (isTempRegNo(s.regNo) ? " · temp" : "") + "</span>") : "";
    return "<tr><td class=\"att-sn\">" + (i + 1) + "</td><td class=\"att-name\">" + escapeHtml(s.name) + regNote + "</td>" + cells + "</tr>";
  }).join("");

  var sigLines = "";
  for (var s = 0; s < Math.max(4, colCount); s++) {
    sigLines += "<p class=\"att-sig-line\"><strong>LECTURERS NAME, COURSE AND SIGNATURE</strong>……………………………………………………………………………………</p>";
  }

  body.innerHTML =
    "<div class=\"print-report att-sheet-official\" id=\"attendancePrintRoot\">" +
    "<h1 class=\"att-sheet-title\">" + escapeHtml(headTitle) + "</h1>" +
    "<p class=\"att-sheet-date\"><strong>DATE:</strong> ________________________</p>" +
    "<table class=\"att-sheet-table\">" +
    "<thead><tr><th class=\"att-sn\">S/N</th><th class=\"att-name\">NAMES OF STUDENTS</th>" + courseHeaders + "</tr></thead>" +
    "<tbody>" + rows + "</tbody></table>" +
    "<div class=\"att-sig-block\">" + sigLines + "</div>" +
    "</div>";
}
function printAttendanceSheet() {
  if (!isQaOfficer()) { openOfficerLoginGate("attendance"); return; }

  var root = document.getElementById("attendancePrintRoot");
  if (!root) { alert("Build a sheet first (programme + level)."); return; }
  window.print();
}
function printLectureReport() {
  if (!isQaOfficer()) { alert("Sign in as QA Officer to print reports."); return; }
  var entries = window.__lastReportEntries || [];
  if (!entries.length) { alert("Build a filtered report first."); return; }
  var w = window.open("", "_blank");
  if (!w) { alert("Allow pop-ups to print."); return; }
  var rows = entries.map(function(e) {
    return "<tr><td>" + (e.date || "") + "</td><td>" + (e.course || "") + "</td><td>" + (e.lecturer || "") +
      "</td><td>" + [e.start, e.end].filter(Boolean).join("–") + "</td><td>" + (e.status || "") +
      "</td><td>" + (e.topic || "") + "</td><td>" + (Array.isArray(e.absent) ? e.absent.join(", ") : "") + "</td></tr>";
  }).join("");
  w.document.write("<!DOCTYPE html><html><head><title>EOCNS Lecture Report</title><style>" +
    "body{font-family:Georgia,serif;color:#1a1a2e;padding:24px} h1{color:#1B3A6B;text-align:center}" +
    "table{width:100%;border-collapse:collapse;font-size:12px} th,td{border:1px solid #999;padding:6px;text-align:left}" +
    "th{background:#1B3A6B;color:#fff} .sub{text-align:center;color:#555;margin-bottom:16px}</style></head><body>" +
    "<h1>EOCNS Lecture Report</h1><div class=\"sub\">Master log · " + entries.length + " entries · " + new Date().toLocaleString() + "</div>" +
    "<table><thead><tr><th>Date</th><th>Course</th><th>Lecturer</th><th>Time</th><th>Status</th><th>Topic</th><th>Absent</th></tr></thead><tbody>" +
    rows + "</tbody></table></body></html>");
  w.document.close();
  w.focus();
  w.print();
}
async function downloadAuditJson() {
  if (!isQaOfficer()) return;
  var list = await getAll("audit");
  downloadJsonReport("EOCNS_Audit_" + new Date().toISOString().slice(0, 10) + ".json", { exportedAt: new Date().toISOString(), entries: list });
}


var WEEKDAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function printSingleLectureReport(entry) {
  if (!isQaOfficer()) { alert("Sign in as QA Officer to print."); return; }
  if (!entry) return;
  window.__lastReportEntries = [entry];
  printLectureReport();
}


async function saveAttendanceSheet() {
  if (!isQaOfficer()) { alert("Sign in as QA Officer to save attendance."); return; }
  var meta = window.__attSheetMeta;
  if (!meta) { alert("Build a sheet first."); return; }
  var marks = {};
  (meta.studentIds || []).forEach(function(id) {
    var el = document.querySelector('input[name="att-' + id + '"]:checked');
    if (el) marks[id] = el.value;
  });
  var now = new Date().toISOString();
  var all = await getAll("attendance");
  var prev = all.find(function(r) { return r.sheetKey === meta.sheetKey; });
  var rec = {
    id: prev ? prev.id : ("att_" + Date.now().toString(36)),
    sheetKey: meta.sheetKey,
    date: meta.date,
    programme: meta.programme,
    level: meta.level,
    course: meta.course,
    marks: marks,
    updatedAt: now,
    createdAt: prev ? prev.createdAt : now
  };
  stampSessionFields(rec);
  await put("attendance", rec);
  await writeAudit({ action: prev ? "update" : "create", entity: "attendance", entityId: rec.id, reason: "Class attendance saved", details: { date: meta.date, course: meta.course, count: Object.keys(marks).length } });
  markDirty("attendance");
  alert("Attendance saved. Publish to repository when ready.");
}



// renderHostelRoster defined once above


// [deduped] second svgPie/svgBars removed


/* renderProfessionalHostelPreview: primary definition earlier */






/* printDailyLectureReport defined once */



/* printWeeklyProfessionalPack defined once */



/* printMonthlyProfessionalPack defined once */








// [deduped] Second REMEDIAL CLASS SYSTEM copy removed.
// ===== Full backup / restore, student delete, profile, handover =====
async function collectFullBackupPayload() {
  await loadActiveSession();
  var stores = ["students","lecturers","sessions","qa_entries","audit","programmes","levels","courses","attendance","hostel_runs","remedial","remedial_enrolment","remedial_assignments","remedial_logs","discipline","pending_students"];
  var data = {};
  var counts = {};
  for (var i = 0; i < stores.length; i++) {
    var name = stores[i];
    try {
      data[name] = await getAll(name);
      counts[name] = Array.isArray(data[name]) ? data[name].length : 0;
    } catch (_) {
      data[name] = [];
      counts[name] = 0;
    }
  }
  try {
    var rm = await getAll("remedial_meta");
    data.remedial_meta = (rm[0] && rm[0].value) || { sessionId: "", programmes: [], levels: [] };
  } catch (_) { data.remedial_meta = {}; }
  try {
    var rt = await getAll("remedial_timetable");
    data.remedial_timetable = (rt[0] && rt[0].value) || { slots: [] };
  } catch (_) { data.remedial_timetable = { slots: [] }; }
  data.timetables = TIMETABLES_CACHE || {};
  data.config = Object.assign({}, APP_CONFIG || {});
  var photoCount = 0;
  (data.students || []).forEach(function(s) { if (s && s.photoDataUrl) photoCount++; });
  counts.studentPassports = photoCount;
  counts.discipline = (data.discipline || []).length;
  return {
    format: "eocns-full-backup",
    version: 2,
    features: {
      discipline: true,
      studentPassports: true,
      remedial: true,
      hostel: true,
      sessionScope: true,
      audit: true
    },
    exportedAt: new Date().toISOString(),
    activeSessionId: ACTIVE_SESSION && ACTIVE_SESSION.id || null,
    site: "https://travis-global.github.io/qa_attendance/",
    counts: counts,
    data: data
  };
}

async function downloadFullBackup() {
  if (!isQaOfficer()) { alert("Sign in as QA Officer to download a full backup."); return; }
  var payload = await collectFullBackupPayload();
  var blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  var a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "EOCNS_full_backup_v2_" + new Date().toISOString().slice(0, 10) + ".json";
  document.body.appendChild(a); a.click();
  setTimeout(function() { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  try {
    await writeAudit({
      action: "export",
      entity: "backup",
      entityId: "full",
      reason: "Full system backup downloaded (v2)",
      details: { counts: payload.counts, features: payload.features }
    });
  } catch (_) {}
  var st = document.getElementById("fullBackupStatus");
  if (st) {
    st.hidden = false;
    st.textContent = "Backup v2 downloaded · includes discipline, passports, QA, remedial, sessions, audit. Store offline securely.";
    st.style.color = "#0f766e";
  }
}

async function restoreFullBackupFromFile(file) {
  if (!isQaOfficer()) return;
  if (!file) return;
  if (!confirm("Restore will overwrite local data with the backup file (students + photos, discipline, QA, remedial, sessions, etc.). Publish afterwards so the repository matches. Continue?")) return;
  var text = await file.text();
  var payload;
  try { payload = JSON.parse(text); } catch (e) { alert("Invalid JSON file."); return; }
  var data = payload.data || payload;
  if (!data || typeof data !== "object") { alert("Backup file has no data payload."); return; }

  async function clearStore(store) {
    try {
      var existing = await getAll(store);
      for (var i = 0; i < existing.length; i++) {
        var key = existing[i].id != null ? existing[i].id : existing[i].key;
        try { await del(store, key); } catch (_) {}
      }
    } catch (_) {}
  }
  async function rep(store, rows) {
    if (!Array.isArray(rows)) return 0;
    await clearStore(store);
    var n = 0;
    for (var j = 0; j < rows.length; j++) {
      try { await put(store, rows[j]); n++; } catch (err) { console.warn(store, err); }
    }
    return n;
  }

  var listStores = ["students","lecturers","sessions","qa_entries","audit","programmes","levels","courses","attendance","hostel_runs","remedial","remedial_enrolment","remedial_assignments","remedial_logs","discipline","pending_students"];
  var restored = {};
  for (var i = 0; i < listStores.length; i++) {
    var sn = listStores[i];
    if (data[sn] != null) restored[sn] = await rep(sn, data[sn]);
  }
  if (data.remedial_meta) {
    await clearStore("remedial_meta");
    await put("remedial_meta", { key: "main", value: data.remedial_meta });
    restored.remedial_meta = 1;
  }
  if (data.remedial_timetable) {
    await clearStore("remedial_timetable");
    await put("remedial_timetable", { key: "main", value: data.remedial_timetable });
    restored.remedial_timetable = 1;
  }
  if (data.timetables) {
    TIMETABLES_CACHE = data.timetables;
    restored.timetables = 1;
  }
  if (data.config && typeof data.config === "object") {
    APP_CONFIG = Object.assign({}, APP_CONFIG, data.config);
    restored.config = 1;
  }
  if (payload.activeSessionId) {
    try { localStorage.setItem(ACTIVE_SESSION_KEY, payload.activeSessionId); } catch (_) {}
  }
  markDirty("full restore v" + (payload.version || "?"));
  try {
    await writeAudit({
      action: "import",
      entity: "backup",
      entityId: "full",
      reason: "Full system restore from backup file",
      details: {
        exportedAt: payload.exportedAt,
        backupVersion: payload.version,
        features: payload.features || {},
        restored: restored
      }
    });
  } catch (_) {}
  await refreshSessionChrome();
  try { await renderStudentsTable(); } catch (_) {}
  try { await renderDisciplineTable(); } catch (_) {}
  try { await renderLecturersTable(); } catch (_) {}
  try { refreshDashboardStats(); } catch (_) {}
  var photoN = 0;
  try {
    (await getAll("students")).forEach(function(s) { if (s.photoDataUrl) photoN++; });
  } catch (_) {}
  var discN = restored.discipline || 0;
  var st = document.getElementById("fullBackupStatus");
  var msg = "Restore complete · students " + (restored.students || 0) +
    " (passports " + photoN + ") · discipline " + discN +
    " · QA " + (restored.qa_entries || 0) +
    ". Publish to repository when ready.";
  if (st) { st.hidden = false; st.textContent = msg; st.style.color = "#0f766e"; }
  alert(msg);
}

async function deleteStudentById(id) {
  if (!isQaOfficer()) return;
  var ref = prompt("Official REF to delete this student:", "REF/EOCNS/QA/");
  if (!ref || !String(ref).trim()) return;
  var reason = prompt("Reason for deletion:", "Removed from master list");
  if (!reason || !String(reason).trim()) return;
  if (!confirm("Permanently delete this student from the master list?")) return;
  var list = await getAll("students");
  var s = list.find(function(x) { return x.id === id; });
  await del("students", id);
  await writeAudit({
    action: "delete",
    entity: "students",
    entityId: id,
    externalRef: String(ref).trim(),
    reason: String(reason).trim(),
    details: { name: s && s.name, regNo: s && s.regNo }
  });
  markDirty("student delete");
  await renderStudentsTable();
}

async function deleteSelectedStudents() {
  if (!isQaOfficer()) { alert("Sign in as QA Officer to delete students."); return; }
  var ids = Array.prototype.map.call(document.querySelectorAll(".stu-select:checked"), function(el) { return el.value; }).filter(Boolean);
  if (!ids.length) { alert("Select at least one student."); return; }
  var ref = prompt("Official REF for bulk delete of " + ids.length + " student(s):", "REF/EOCNS/QA/");
  if (ref == null) return;
  ref = String(ref).trim();
  if (!ref) { alert("REF is required for bulk delete."); return; }
  var reason = prompt("Reason for bulk deletion:", "Bulk removal from master list");
  if (reason == null) return;
  reason = String(reason).trim();
  if (!reason) { alert("A reason is required."); return; }
  if (!confirm("Permanently delete " + ids.length + " student(s) from the master list? This cannot be undone except via backup restore.")) return;
  var all = await getAll("students");
  var byId = {};
  all.forEach(function(s) { byId[s.id] = s; });
  var deleted = 0;
  for (var i = 0; i < ids.length; i++) {
    var sid = ids[i];
    var s = byId[sid];
    try {
      await del("students", sid);
      deleted++;
      await writeAudit({
        action: "delete",
        entity: "students",
        entityId: sid,
        externalRef: ref,
        reason: reason + " (bulk)",
        details: { name: s && s.name, regNo: s && s.regNo }
      });
    } catch (err) {
      console.warn("delete failed", sid, err);
    }
  }
  markDirty("student bulk delete");
  var selAll = document.getElementById("selectAllStudents");
  if (selAll) selAll.checked = false;
  await renderStudentsTable();
  try { refreshDashboardStats(); } catch (_) {}
  alert("Deleted " + deleted + " student(s). Publish when ready.");
}


async function openStudentProfile_PLACEHOLDER(id) { /* replaced */ }



function closeStudentProfile() {
  var el = document.getElementById("studentProfileDrawer");
  if (!el) return;
  el.hidden = true;
  el.setAttribute("hidden", "");
  el.style.display = "none";
}

function bindStudentProfileCloseHandlers() {
  if (window.__profileCloseBound) return;
  window.__profileCloseBound = true;
  function wire(id, fn) {
    var n = document.getElementById(id);
    if (n) n.addEventListener("click", function(e) { e.preventDefault(); e.stopPropagation(); fn(); });
  }
  wire("btnCloseStudentProfile", closeStudentProfile);
  wire("btnCloseStudentProfile2", closeStudentProfile);
  wire("studentProfileBackdrop", closeStudentProfile);
  document.addEventListener("keydown", function(e) {
    if (e.key === "Escape") {
      var d = document.getElementById("studentProfileDrawer");
      if (d && !d.hidden) closeStudentProfile();
    }
  });
  var edit = document.getElementById("btnProfileEdit");
  if (edit) edit.addEventListener("click", function() {
    if (window.__profileStudentId) { closeStudentProfile(); openStudentForm(window.__profileStudentId); }
  });
  var del = document.getElementById("btnProfileDelete");
  if (del) del.addEventListener("click", function() {
    if (window.__profileStudentId) { closeStudentProfile(); deleteStudentById(window.__profileStudentId); }
  });
}


function sessionCoverHtml() {
  if (!ACTIVE_SESSION) return "<div class=\"sub\">No active session selected</div>";
  return "<div class=\"sub\"><strong>Academic session:</strong> " + escapeHtml(ACTIVE_SESSION.name) + (ACTIVE_SEMESTER ? " · <strong>Semester:</strong> " + escapeHtml(ACTIVE_SEMESTER.name) : "") +
    (ACTIVE_SESSION.startDate ? (" · From " + escapeHtml(ACTIVE_SESSION.startDate)) : "") +
    "<br/><strong>Programmes:</strong> " + escapeHtml((ACTIVE_SESSION.programmes || []).join(", ")) +
    " · <strong>Levels:</strong> " + escapeHtml((ACTIVE_SESSION.levels || []).join(", ")) + "</div>";
}

function printOfficerHandoverSheet() {
  var w = window.open("", "_blank");
  if (!w) return;
  w.document.write("<!DOCTYPE html><html><head><title>Officer Handover</title><style>body{font-family:Georgia,serif;max-width:720px;margin:24px auto;padding:12px;color:#0f172a}h1{color:#0d9488;font-size:1.4rem}li{margin:6px 0}.box{border:1px solid #cbd5e1;padding:12px;border-radius:8px;background:#f8fafc}</style></head><body>" +
    "<h1>EOCNS QA System — Quick Officer Handover</h1>" +
    "<p>Live site: https://travis-global.github.io/qa_attendance/</p>" +
    "<div class=\"box\"><ol>" +
    "<li>Open Settings → sign in with the officer PIN.</li>" +
    "<li>Top bar → select the correct <b>Active session</b>.</li>" +
    "<li>Students / Lecturers: maintain master lists (edits need REF when prompted).</li>" +
    "<li>Daily QA → log lectures; Weekly/Monthly → build &amp; print packs.</li>" +
    "<li>After major changes → Settings → Publish all data to repository.</li>" +
    "<li>Weekly: Download full backup and store offline.</li>" +
    "<li>Full manuals: Settings → Documentation &amp; handover (PDF package).</li>" +
    "</ol></div>" +
    "<p>Developer (service year): Fortunatus Alolote Fayeofori</p>" +
    "</body></html>");
  w.document.close();
  setTimeout(function() { w.print(); }, 300);
}



// [deduped] Third DSA photo/discipline copy removed
// ===== Pending list: definitive remove-after-decision (overrides earlier copies) =====
// ===== TOP-LEVEL pending registration API (must stay at IIFE root) =====
async function removePendingRecordCompletely(id) {
  if (!id) return;
  try { await del("pending_students", id); } catch (_) {}
  try {
    var left = await getAll("pending_students");
    for (var i = 0; i < left.length; i++) {
      if (left[i] && left[i].id === id) {
        try { await del("pending_students", id); } catch (_) {}
      }
    }
  } catch (_) {}
}

async function publishPendingListToRepo(message) {
  var workerUrl = (APP_CONFIG && APP_CONFIG.publishWorkerUrl || "").trim();
  var key = (APP_CONFIG && APP_CONFIG.publishWorkerKey || "").trim();
  if (!workerUrl) throw new Error("publishWorkerUrl missing in config");
  var list = await getAll("pending_students");
  list = (list || []).filter(function(p) { return p && p.id; });
  var files = {};
  files[DATA_FILES.pending_students] = JSON.stringify(list, null, 2);
  var headers = { "Content-Type": "application/json" };
  if (key) headers["X-EOCNS-Key"] = key;
  var res = await fetch(workerUrl.replace(/\/$/, ""), {
    method: "POST",
    headers: headers,
    body: JSON.stringify({ action: "publish", publishKey: key, message: message || "Update pending student registrations", files: files })
  });
  var body = {};
  try { body = await res.json(); } catch (_) {}
  if (!res.ok) throw new Error(body.error || ("Worker HTTP " + res.status));
  return body;
}

async function refreshPendingFromRepo() {
  try {
    var list = await fetchRepoJson(DATA_FILES.pending_students + "?t=" + Date.now());
    if (!Array.isArray(list)) list = [];
    var existing = await getAll("pending_students");
    for (var i = 0; i < existing.length; i++) {
      try { await del("pending_students", existing[i].id); } catch (_) {}
    }
    for (var j = 0; j < list.length; j++) {
      try { await put("pending_students", list[j]); } catch (_) {}
    }
    return list;
  } catch (err) {
    console.warn("pending hydrate", err);
    return getAll("pending_students");
  }
}

async function renderPendingRegistrations(opts) {
  opts = opts || {};
  var tbody = document.getElementById("pendingTableBody");
  if (!tbody) return;
  if (!isQaOfficer()) {
    tbody.innerHTML = "<tr><td colspan=\"7\">Sign in as QA Officer to review student self-registrations.</td></tr>";
    return;
  }
  if (opts.fromRepo) {
    try { await refreshPendingFromRepo(); } catch (err) { console.warn(err); }
  }
  var list = (await getAll("pending_students") || []).filter(function(p) {
    return p && p.id && (!p.status || p.status === "pending");
  });
  list.sort(function(a, b) { return String(b.submittedAt || "").localeCompare(String(a.submittedAt || "")); });
  var count = document.getElementById("pendingCount");
  if (count) count.textContent = list.length + " pending";
  if (!list.length) {
    tbody.innerHTML = "<tr><td colspan=\"7\">No pending registrations. Share: <code>register.html</code></td></tr>";
    return;
  }
  tbody.innerHTML = list.map(function(p) {
    var thumb = p.photoDataUrl
      ? '<img src="' + p.photoDataUrl + '" alt="" style="width:40px;height:50px;object-fit:cover;border-radius:4px;border:1px solid #cbd5e1" />'
      : "—";
    return "<tr><td>" + thumb + "</td><td>" + escapeHtml(p.name || "") + "</td><td>" + escapeHtml(p.regNo || "") +
      "</td><td>" + escapeHtml(p.programme || "") + " / " + escapeHtml(String(p.level || "")) +
      "</td><td>" + escapeHtml(p.email || "") + "</td><td>" + escapeHtml((p.submittedAt || "").slice(0, 16).replace("T", " ")) +
      '</td><td class="qa-edit-only">' +
      '<button type="button" class="icon-btn-sm" data-pend-view="' + p.id + '">Review</button> ' +
      '<button type="button" class="icon-btn-sm" data-pend-ok="' + p.id + '">Approve</button> ' +
      '<button type="button" class="icon-btn-sm" data-pend-no="' + p.id + '">Reject</button></td></tr>';
  }).join("");
  tbody.querySelectorAll("[data-pend-view]").forEach(function(btn) {
    btn.addEventListener("click", function() { window.openPendingReview(btn.getAttribute("data-pend-view")); });
  });
  tbody.querySelectorAll("[data-pend-ok]").forEach(function(btn) {
    btn.addEventListener("click", function() { window.approvePendingStudent(btn.getAttribute("data-pend-ok")); });
  });
  tbody.querySelectorAll("[data-pend-no]").forEach(function(btn) {
    btn.addEventListener("click", function() { window.rejectPendingStudent(btn.getAttribute("data-pend-no")); });
  });
}

async function openPendingReview(id) {
  var list = await getAll("pending_students");
  var p = list.find(function(x) { return x.id === id; });
  if (!p) return;
  window.__pendingReviewId = id;
  window.__pendingRejectId = id;
  var photo = p.photoDataUrl ? '<div class="passport-frame"><img src="' + p.photoDataUrl + '" alt="" /></div>' : "";
  var body = document.getElementById("pendingReviewBody");
  if (body) {
    body.innerHTML = '<div class="profile-layout">' + photo + '<div class="profile-meta">' +
      "<p><strong>" + escapeHtml(p.name) + "</strong></p>" +
      "<p>Reg: " + escapeHtml(p.regNo || "—") + "</p>" +
      "<p>Email: " + escapeHtml(p.email || "—") + "</p>" +
      "<p>" + escapeHtml(p.programme || "") + " · Level " + escapeHtml(String(p.level || "")) + "</p>" +
      "<p>Gender: " + escapeHtml(p.gender || "—") + " · Phone: " + escapeHtml(p.phone || "—") + "</p>" +
      "<p>Hostel: " + escapeHtml(p.hostel || "—") + "</p></div></div>";
  }
  var m = document.getElementById("pendingReviewModal");
  if (m) { m.hidden = false; m.removeAttribute("hidden"); m.style.display = ""; }
}

function closePendingReview() {
  var m = document.getElementById("pendingReviewModal");
  if (!m) return;
  m.hidden = true; m.setAttribute("hidden", ""); m.style.display = "none";
}

function closePendingRejectModal() {
  var m = document.getElementById("pendingRejectModal");
  if (!m) return;
  m.hidden = true; m.setAttribute("hidden", ""); m.style.display = "none";
}

async function rejectPendingStudent(id) {
  try {
    if (!isQaOfficer()) { alert("Sign in as QA Officer under Settings before rejecting."); return; }
    id = id || window.__pendingReviewId || window.__pendingRejectId;
    if (!id) { alert("No pending registration selected."); return; }
    window.__pendingRejectId = id;
    var list = await getAll("pending_students");
    var p = list.find(function(x) { return x.id === id; });
    if (!p) {
      alert("Submission not found. Refreshing list…");
      await renderPendingRegistrations({ fromRepo: false });
      return;
    }
    var sum = document.getElementById("pendingRejectSummary");
    if (sum) sum.textContent = (p.name || "Applicant") + " · " + (p.regNo || "") + " · " + (p.email || "");
    var reasonEl = document.getElementById("pendingRejectReason");
    if (reasonEl) reasonEl.value = "Passport photo or details need correction. Applicant may resubmit via the registration page.";
    var pinEl = document.getElementById("pendingRejectPin");
    if (pinEl) pinEl.value = "";
    var m = document.getElementById("pendingRejectModal");
    if (m) { m.hidden = false; m.removeAttribute("hidden"); m.style.display = ""; }
    else await confirmRejectPendingStudent(id, null, null);
  } catch (err) {
    console.error(err);
    alert("Could not open reject dialog: " + (err.message || String(err)));
  }
}

async function confirmRejectPendingStudent(forcedId, forcedReason, forcedPin) {
  try {
    if (!isQaOfficer()) { alert("Sign in as QA Officer first."); return; }
    var id = forcedId || window.__pendingRejectId || window.__pendingReviewId;
    if (!id) { alert("No submission selected."); return; }
    var reason = forcedReason != null ? forcedReason : ((document.getElementById("pendingRejectReason") && document.getElementById("pendingRejectReason").value) || "").trim();
    if (!reason) { alert("A reason is required."); return; }
    var pin = forcedPin != null ? forcedPin : ((document.getElementById("pendingRejectPin") && document.getElementById("pendingRejectPin").value) || "").trim();
    if (!pin) { alert("Officer PIN is required."); return; }
    if (String(pin).trim() !== String((APP_CONFIG && APP_CONFIG.qaPin) || "EOCNS-QA").trim()) {
      alert("Incorrect PIN. Submission was not rejected.");
      return;
    }
    var list = await getAll("pending_students");
    var p = list.find(function(x) { return x.id === id; });
    if (!p) {
      alert("Submission not found (already removed?).");
      closePendingRejectModal();
      await renderPendingRegistrations({ fromRepo: false });
      return;
    }
    await removePendingRecordCompletely(id);
    try {
      await writeAudit({
        action: "delete", entity: "pending_students", entityId: id,
        reason: "Rejected self-registration: " + reason,
        details: { email: p.email, regNo: p.regNo, name: p.name, notify: "manual_only" }
      });
    } catch (_) {}
    markDirty("pending reject");
    closePendingRejectModal();
    closePendingReview();
    await renderPendingRegistrations({ fromRepo: false });
    try {
      await publishPendingListToRepo("Reject " + (p.regNo || id) + " — remove from pending list");
      alert("Rejected and removed from the pending list (synced).");
    } catch (err) {
      alert("Removed locally, but repository sync failed:\n" + (err.message || err) + "\nPublish from Settings when you can.");
    }
  } catch (err) {
    console.error(err);
    alert("Reject failed: " + (err.message || String(err)));
  }
}

async function approvePendingStudent(id) {
  try {
    if (!isQaOfficer()) { alert("Sign in as QA Officer first."); return; }
    id = id || window.__pendingReviewId;
    if (!id) { alert("No registration selected."); return; }
    var pin = prompt("Enter officer PIN to approve this registration onto the master list:");
    if (pin == null) return;
    if (String(pin).trim() !== String((APP_CONFIG && APP_CONFIG.qaPin) || "EOCNS-QA").trim()) {
      alert("Incorrect PIN. Not approved.");
      return;
    }
    var list = await getAll("pending_students");
    var p = list.find(function(x) { return x.id === id; });
    if (!p) { alert("Submission not found."); await renderPendingRegistrations(); return; }
    var students = await getAll("students");
    if (students.some(function(s) { return s.regNo && p.regNo && String(s.regNo).toLowerCase() === String(p.regNo).toLowerCase(); })) {
      alert("Reg. No already exists on master list.");
      return;
    }
    var now = new Date().toISOString();
    var student = {
      id: generateId("stu"), name: p.name, regNo: p.regNo, programme: p.programme, level: p.level,
      gender: p.gender || "", phone: p.phone || "", hostel: p.hostel || "", photoDataUrl: p.photoDataUrl || "",
      status: "Active", email: p.email || "", createdAt: now, updatedAt: now, source: "self_registration", pendingId: p.id
    };
    if (student.photoDataUrl) student.photoUpdatedAt = now;
    await put("students", student);
    await removePendingRecordCompletely(id);
    await writeAudit({
      action: "create", entity: "students", entityId: student.id,
      reason: "Approved self-registration " + (p.regNo || ""),
      details: { pendingId: id, email: p.email }
    });
    markDirty("pending approve");
    closePendingReview();
    await renderPendingRegistrations({ fromRepo: false });
    try { await renderStudentsTable(); } catch (_) {}
    try {
      await publishPendingListToRepo("Approve " + (p.regNo || id) + " — remove from pending list");
    } catch (err) {
      alert("Approved and removed locally, but pending list could not sync:\n" + (err.message || err));
      return;
    }
    alert("Approved onto the master list and removed from pending (synced). Publish full data when ready for students.json.");
  } catch (err) {
    console.error(err);
    alert("Approve failed: " + (err.message || String(err)));
  }
}

window.removePendingRecordCompletely = removePendingRecordCompletely;
window.publishPendingListToRepo = publishPendingListToRepo;
window.refreshPendingFromRepo = refreshPendingFromRepo;
window.renderPendingRegistrations = renderPendingRegistrations;
window.openPendingReview = openPendingReview;
window.closePendingReview = closePendingReview;
window.closePendingRejectModal = closePendingRejectModal;
window.rejectPendingStudent = rejectPendingStudent;
window.confirmRejectPendingStudent = confirmRejectPendingStudent;
window.approvePendingStudent = approvePendingStudent;


// ===== Session-based class keys (programme × level) — no dummy classes =====
function programmeSlug(name) {
  var n = String(name || "").toLowerCase().trim();
  if (/midwif/.test(n)) return "midwifery";
  if (/nurs/.test(n)) return "nursing";
  if (/public/.test(n)) return "public_health";
  return n.replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "general";
}

function makeClassKey(level, programme) {
  var lv = String(level || "").replace(/level/ig, "").trim() || "100";
  return lv + "_" + programmeSlug(programme);
}



async function sessionProgrammeLevelOptions() {
  await loadActiveSession();
  var progs = [];
  var levels = [];
  if (ACTIVE_SESSION) {
    progs = (ACTIVE_SESSION.programmes || []).slice();
    levels = (ACTIVE_SESSION.levels || []).map(String);
  }
  if (!progs.length) {
    try {
      var allP = await getAll("programmes");
      progs = allP.filter(function(p) { return !p.status || p.status === "Active"; }).map(function(p) { return p.name; });
    } catch (_) {}
  }
  if (!levels.length) {
    try {
      var allL = await getAll("levels");
      levels = allL.filter(function(l) { return !l.status || l.status === "Active"; }).map(function(l) {
        return String(l.value != null ? l.value : String(l.name || "").replace(/level/ig, "").trim());
      });
    } catch (_) {}
  }
  return { programmes: progs, levels: levels };
}

function fillSelectOptions(sel, items, placeholder) {
  if (!sel) return;
  var cur = sel.value;
  sel.innerHTML = '<option value="">' + (placeholder || "—") + "</option>" +
    items.map(function(it) {
      return '<option value="' + escapeHtml(String(it)) + '">' + escapeHtml(String(it)) + "</option>";
    }).join("");
  if (cur && items.map(String).indexOf(String(cur)) >= 0) sel.value = cur;
}


// ---- Class (programme x level) lists built from the active session, not hardcoded ----
function classPrettyLabel(key) {
  var m = String(key || "").match(/^(\d+)_(.+)$/);
  if (!m) return String(key || "—");
  return m[1] + " Level " + m[2].replace(/_/g, " ").replace(/\b\w/g, function(c) { return c.toUpperCase(); });
}
async function classKeyOptions() {
  var opts = await sessionProgrammeLevelOptions();
  var seen = {}, list = [];
  function add(k, label) { if (!k || seen[k]) return; seen[k] = 1; list.push({ key: k, label: label || classPrettyLabel(k) }); }
  opts.levels.slice().sort(function(a, b) { return Number(a) - Number(b); }).forEach(function(l) {
    opts.programmes.forEach(function(p) { add(makeClassKey(l, p), l + " Level " + p); });
  });
  // keep any class already used by saved data selectable, so old records stay editable
  try { (await getAll("qa_entries")).forEach(function(e) { add(e.classKey); }); } catch (_) {}
  try { (await getAll("courses")).forEach(function(c) { (c.classKeys || []).forEach(function(k) { add(k); }); }); } catch (_) {}
  return list;
}
async function fillClassKeySelects() {
  var list = await classKeyOptions();
  ["qaWeekClass", "qaMonthClass", "qaEntryClass", "reportClass", "remedialClass"].forEach(function(id) {
    var sel = document.getElementById(id);
    if (!sel) return;
    var prev = sel.value;
    var placeholder = sel.options.length && sel.options[0].value === "" ? sel.options[0].outerHTML : "";
    sel.innerHTML = placeholder + list.map(function(o) { return '<option value="' + escapeHtml(o.key) + '">' + escapeHtml(o.label) + "</option>"; }).join("");
    if (prev && list.some(function(o) { return o.key === prev; })) sel.value = prev;
  });
}

async function fillSessionClassSelectors() {
  var opts = await sessionProgrammeLevelOptions();
  fillSelectOptions(document.getElementById("ttBoardProgramme"), opts.programmes, "Programme");
  fillSelectOptions(document.getElementById("ttBoardLevel"), opts.levels, "Level");
  fillSelectOptions(document.getElementById("qaDailyProgramme"), opts.programmes, "Programme");
  fillSelectOptions(document.getElementById("qaDailyLevel"), opts.levels, "Level");
  fillSelectOptions(document.getElementById("ttEditProgramme"), opts.programmes, "Programme");
  fillSelectOptions(document.getElementById("ttEditLevel"), opts.levels, "Level");
  // defaults: prefer Nursing + 100 when available
  function prefer(selId, preferVal) {
    var s = document.getElementById(selId);
    if (!s || s.value) return;
    for (var i = 0; i < s.options.length; i++) {
      if (String(s.options[i].value).toLowerCase() === String(preferVal).toLowerCase()) {
        s.selectedIndex = i; break;
      }
    }
  }
  prefer("ttBoardProgramme", "Nursing");
  prefer("ttBoardLevel", "100");
  prefer("qaDailyProgramme", "Nursing");
  prefer("qaDailyLevel", "100");
  prefer("ttEditProgramme", "Nursing");
  prefer("ttEditLevel", "100");
  syncClassKeyFromPair("ttBoardProgramme", "ttBoardLevel", "ttBoardClass");
  syncClassKeyFromPair("qaDailyProgramme", "qaDailyLevel", "qaDailyClass");
  syncClassKeyFromPair("ttEditProgramme", "ttEditLevel", "ttClassKey");
  try { await fillClassKeySelects(); } catch (e) { console.warn("class lists", e); }
}

function syncClassKeyFromPair(progId, levelId, hiddenId) {
  var p = document.getElementById(progId);
  var l = document.getElementById(levelId);
  var h = document.getElementById(hiddenId);
  if (!h) return;
  var prog = p && p.value;
  var lvl = l && l.value;
  if (prog && lvl) h.value = makeClassKey(lvl, prog);
}

async function ensureTimetables() {
  if (!TIMETABLES_CACHE || typeof TIMETABLES_CACHE !== "object") {
    try { TIMETABLES_CACHE = await fetchRepoJson(DATA_FILES.timetables); } catch (_) { TIMETABLES_CACHE = {}; }
  }
  if (!TIMETABLES_CACHE || typeof TIMETABLES_CACHE !== "object") TIMETABLES_CACHE = {};
  // never invent dummy class grids — only keys present in data
  return TIMETABLES_CACHE;
}

// Wire programme/level → class key
(function wireSessionClassSelects() {
  function bind(progId, levelId, hiddenId, onChange) {
    ["change", "input"].forEach(function(ev) {
      var p = document.getElementById(progId);
      var l = document.getElementById(levelId);
      if (p) p.addEventListener(ev, function() {
        syncClassKeyFromPair(progId, levelId, hiddenId);
        if (typeof onChange === "function") onChange();
      });
      if (l) l.addEventListener(ev, function() {
        syncClassKeyFromPair(progId, levelId, hiddenId);
        if (typeof onChange === "function") onChange();
      });
    });
  }
  bind("ttBoardProgramme", "ttBoardLevel", "ttBoardClass", function() {
    if (typeof renderTimetableBoard === "function") try { renderTimetableBoard(); } catch (_) {}
  });
  bind("qaDailyProgramme", "qaDailyLevel", "qaDailyClass", function() {
    if (typeof renderQaDaily === "function") try { renderQaDaily(); } catch (_) {}
  });
  bind("ttEditProgramme", "ttEditLevel", "ttClassKey", function() {
    if (typeof loadTimetableEditor === "function") try { loadTimetableEditor(); } catch (_) {}
    else if (typeof renderTimetableEditor === "function") try { renderTimetableEditor(); } catch (_) {}
  });
})();

// After session chrome refresh, refill class selectors
var _prevRefreshSessionChrome = typeof refreshSessionChrome === "function" ? refreshSessionChrome : null;
if (_prevRefreshSessionChrome) {
  refreshSessionChrome = async function() {
    await _prevRefreshSessionChrome.apply(this, arguments);
    try { await fillSessionClassSelectors(); } catch (_) {}
  };
}

// Boot fill when DOM ready path already ran — also call once
setTimeout(function() {
  try { if (typeof fillSessionClassSelectors === "function") fillSessionClassSelectors(); } catch (e) { console.warn("class selectors", e); }
}, 800);
// Final safety: never leave pending handlers undefined
try {
  if (typeof rejectPendingStudent === "function") window.rejectPendingStudent = rejectPendingStudent;
  if (typeof confirmRejectPendingStudent === "function") window.confirmRejectPendingStudent = confirmRejectPendingStudent;
  if (typeof approvePendingStudent === "function") window.approvePendingStudent = approvePendingStudent;
  if (typeof renderPendingRegistrations === "function") window.renderPendingRegistrations = renderPendingRegistrations;
  if (typeof openPendingReview === "function") window.openPendingReview = openPendingReview;
} catch (e) { console.warn("pending bind", e); }


window.makeClassKey = makeClassKey;
window.classLabelFromKey = classLabelFromKey;
window.fillSessionClassSelectors = fillSessionClassSelectors;
window.ensureTimetables = ensureTimetables;


// ===== Courses catalogue CRUD + timetable course checklist =====
function openCourseForm(code) {
  if (!isQaOfficer()) { alert("Sign in as QA Officer to manage courses."); return; }
  var form = document.getElementById("courseForm");
  if (form) form.reset();
  document.getElementById("courseEditOriginalCode").value = code || "";
  document.getElementById("courseModalTitle").textContent = code ? "Edit course" : "Add course";
  if (code) {
    var c = (COURSES_CACHE || []).find(function(x) { return x.code === code; });
    if (c) {
      document.getElementById("courseCode").value = c.code || "";
      document.getElementById("courseName").value = c.name || "";
      document.getElementById("courseClassKeys").value = Array.isArray(c.classKeys) ? c.classKeys.join(", ") : "";
    }
  }
  var m = document.getElementById("courseModal");
  if (m) { m.hidden = false; m.removeAttribute("hidden"); m.style.display = ""; }
}

function closeCourseForm() {
  var m = document.getElementById("courseModal");
  if (!m) return;
  m.hidden = true; m.setAttribute("hidden", ""); m.style.display = "none";
}

async function saveCourseForm(e) {
  if (e && e.preventDefault) e.preventDefault();
  if (!isQaOfficer()) return;
  var original = (document.getElementById("courseEditOriginalCode").value || "").trim();
  var code = (document.getElementById("courseCode").value || "").trim();
  var name = (document.getElementById("courseName").value || "").trim();
  var keysRaw = (document.getElementById("courseClassKeys").value || "").trim();
  if (!code || !name) { alert("Course code and title are required."); return; }
  await loadCoursesCache();
  var clash = COURSES_CACHE.find(function(c) {
    return normCourseCode(c.code) === normCourseCode(code) && normCourseCode(c.code) !== normCourseCode(original);
  });
  if (clash) { alert("Course code " + code + " is already in the catalogue (" + clash.code + " — " + (clash.name || "") + "). Course codes must be unique."); return; }
  var sameTitle = COURSES_CACHE.find(function(c) { return normTitle(c.name) === normTitle(name) && normCourseCode(c.code) !== normCourseCode(original || code); });
  if (sameTitle && !confirm('A course titled "' + sameTitle.name + '" already exists as ' + sameTitle.code + ". Add " + code + " with the same title anyway?")) return;
  var classKeys = keysRaw ? keysRaw.split(",").map(function(s) { return s.trim(); }).filter(Boolean) : [];
  if (original && original !== code) {
    try { await del("courses", original); } catch (_) {}
  }
  var rec = { code: code, name: name, classKeys: classKeys };
  await put("courses", rec);
  await writeAudit({
    action: original ? "update" : "create",
    entity: "courses",
    entityId: code,
    reason: original ? ("Course updated (" + original + " → " + code + ")") : ("Course added: " + code)
  });
  markDirty("courses");
  closeCourseForm();
  await renderCoursesTable();
  if (typeof seedQaDatalists === "function") try { seedQaDatalists(); } catch (_) {}
  try { await renderTimetableEditor(); } catch (_) {}
  alert("Course saved. Publish when ready so the catalogue stays on the repository.");
}

async function deleteCourse(code) {
  if (!isQaOfficer()) return;
  if (!confirm("Remove course " + code + " from the catalogue?\nTimetable slots that still use this code will show as unknown until changed.")) return;
  await del("courses", code);
  await writeAudit({ action: "delete", entity: "courses", entityId: code, reason: "Course removed from catalogue" });
  markDirty("courses");
  await renderCoursesTable();
  if (typeof seedQaDatalists === "function") try { seedQaDatalists(); } catch (_) {}
  try { await renderTimetableEditor(); } catch (_) {}
}

async function addCoursePrompt() {
  openCourseForm(null);
}

// Wire course modal once
(function wireCourseUi() {
  var addBtn = document.getElementById("btnAddCourse");
  if (addBtn && !addBtn.__courseWired) {
    addBtn.__courseWired = true;
    addBtn.addEventListener("click", function() { openCourseForm(null); });
  }
  var form = document.getElementById("courseForm");
  if (form && !form.__courseWired) {
    form.__courseWired = true;
    form.addEventListener("submit", saveCourseForm);
  }
  ["btnCloseCourseModal", "btnCancelCourse", "courseModalBackdrop"].forEach(function(id) {
    var el = document.getElementById(id);
    if (el && !el.__courseWired) {
      el.__courseWired = true;
      el.addEventListener("click", closeCourseForm);
    }
  });
})();

window.renderCoursesTable = renderCoursesTable;
window.openCourseForm = openCourseForm;
window.saveCourseForm = saveCourseForm;
window.deleteCourse = deleteCourse;
window.addCoursePrompt = addCoursePrompt;
window.ensureCourseInCatalogue = ensureCourseInCatalogue;
window.renderTimetableEditor = renderTimetableEditor;
window.addTimetableSlot = addTimetableSlot;
window.saveTimetableLocal = saveTimetableLocal;
window.loadCoursesCache = loadCoursesCache;


// ===== Courses checklist for timetable + catalogue CRUD (final) =====
// ================= UNIQUENESS: course codes, staff IDs, lecturer names =================
function normCourseCode(c) { return String(c || "").toUpperCase().replace(/[^A-Z0-9]/g, ""); }
function normTitle(t) { return String(t || "").toLowerCase().replace(/\s+/g, " ").trim(); }
function normStaffId(s) { return String(s || "").toUpperCase().replace(/\s+/g, ""); }
function normPersonName(s) { return String(s || "").toLowerCase().replace(/\s+/g, " ").trim(); }
// NUS 121 / nus121 / NUS-121 are the same course. Duplicates found in saved data are merged (class keys combined).
function mergeDuplicateCourses(list) {
  var seen = {}, kept = [], dropped = [];
  (list || []).forEach(function(c) {
    var k = normCourseCode(c.code);
    if (!k) { kept.push(c); return; }
    if (!seen[k]) { seen[k] = Object.assign({}, c, { classKeys: (c.classKeys || []).slice() }); kept.push(seen[k]); return; }
    (c.classKeys || []).forEach(function(x) { if (seen[k].classKeys.indexOf(x) < 0) seen[k].classKeys.push(x); });
    if (!seen[k].name && c.name) seen[k].name = c.name;
    dropped.push(c.code);
  });
  return { kept: kept, dropped: dropped };
}

async function loadCoursesCache() {
  try {
    COURSES_CACHE = await getAll("courses");
  } catch (_) {
    COURSES_CACHE = COURSES_CACHE || [];
  }
  COURSES_CACHE = (COURSES_CACHE || []).slice().sort(function(a, b) {
    return String(a.code || "").localeCompare(String(b.code || ""));
  });
  var mergedCourses = mergeDuplicateCourses(COURSES_CACHE);
  if (mergedCourses.dropped.length) {
    var before = COURSES_CACHE;
    COURSES_CACHE = mergedCourses.kept;
    if (isQaOfficer()) {
      try {
        for (var di = 0; di < mergedCourses.dropped.length; di++) await del("courses", mergedCourses.dropped[di]);
        for (var ki = 0; ki < COURSES_CACHE.length; ki++) await put("courses", COURSES_CACHE[ki]);
        markDirty("courses");
        showToast("Merged " + mergedCourses.dropped.length + " duplicate course code(s): " + mergedCourses.dropped.join(", "), 5000);
      } catch (e) { COURSES_CACHE = before; console.warn("course merge", e); }
    }
  }
  return COURSES_CACHE;
}

function courseOptionsHtml(selectedCode, classKey) {
  var list = COURSES_CACHE || [];
  var preferred = list;
  if (classKey) {
    var tagged = list.filter(function(c) {
      return Array.isArray(c.classKeys) && c.classKeys.indexOf(classKey) >= 0;
    });
    if (tagged.length) preferred = tagged.concat(list.filter(function(c) {
      return !Array.isArray(c.classKeys) || c.classKeys.indexOf(classKey) < 0;
    }));
  }
  var opts = '<option value="">— Select course —</option>';
  preferred.forEach(function(c) {
    var sel = String(c.code) === String(selectedCode) ? " selected" : "";
    opts += '<option value="' + escapeHtml(c.code) + '"' + sel + ">" +
      escapeHtml(c.code) + " — " + escapeHtml(c.name || "") + "</option>";
  });
  // keep unknown existing slot code visible
  if (selectedCode && !list.some(function(c) { return String(c.code) === String(selectedCode); })) {
    opts += '<option value="' + escapeHtml(selectedCode) + '" selected>' + escapeHtml(selectedCode) + " (not in catalogue)</option>";
  }
  opts += '<option value="__other__">+ Other / new course…</option>';
  return opts;
}

async function ensureCourseInCatalogue(code, suggestedName) {
  code = String(code || "").trim();
  if (!code) return { ok: false, cancelled: true };
  await loadCoursesCache();
  var existing = COURSES_CACHE.find(function(c) { return normCourseCode(c.code) === normCourseCode(code); });
  if (existing) return { ok: true, course: existing, created: false };
  if (!isQaOfficer()) {
    alert('Course "' + code + '" is not in the catalogue. Sign in as QA Officer to add it, or pick an existing course.');
    return { ok: false, cancelled: true };
  }
  var add = confirm(
    'Course "' + code + '" is not in the official catalogue.\n\n' +
    "OK = add this course to the catalogue now\n" +
    "Cancel = stop and choose an existing course"
  );
  if (!add) return { ok: false, cancelled: true };
  var title = prompt("Official title for " + code + ":", suggestedName || "");
  if (title == null) return { ok: false, cancelled: true };
  title = String(title).trim();
  if (!title) {
    alert("A course title is required.");
    return { ok: false, cancelled: true };
  }
  var classKey = (document.getElementById("ttClassKey") && document.getElementById("ttClassKey").value) || "";
  var rec = { code: code, name: title, classKeys: classKey ? [classKey] : [] };
  await put("courses", rec);
  await writeAudit({ action: "create", entity: "courses", entityId: code, reason: "Course added when used in timetable: " + code });
  markDirty("courses");
  await loadCoursesCache();
  try { await renderCoursesTable(); } catch (_) {}
  try { if (typeof seedQaDatalists === "function") seedQaDatalists(); } catch (_) {}
  return { ok: true, course: rec, created: true };
}

async function renderCoursesTable() {
  await loadCoursesCache();
  var tbody = document.getElementById("coursesTableBody");
  if (!tbody) return;
  var sc = document.getElementById("statCourses");
  if (sc) sc.textContent = String(COURSES_CACHE.length);
  if (!COURSES_CACHE.length) {
    tbody.innerHTML = '<tr><td colspan="4">No courses yet. Officers: use + Add course.</td></tr>';
    return;
  }
  tbody.innerHTML = COURSES_CACHE.map(function(c) {
    var keys = Array.isArray(c.classKeys) ? c.classKeys.join(", ") : "";
    var actions = isQaOfficer()
      ? ('<button type="button" class="icon-btn-sm" data-edit-course="' + escapeHtml(c.code) + '">Edit</button> ' +
         '<button type="button" class="icon-btn-sm" data-del-course="' + escapeHtml(c.code) + '">Del</button>')
      : "";
    return "<tr><td><strong>" + escapeHtml(c.code) + "</strong></td><td>" + escapeHtml(c.name || "—") +
      '</td><td class="muted-note">' + escapeHtml(keys || "—") + '</td><td class="qa-edit-only">' + actions + "</td></tr>";
  }).join("");
  tbody.querySelectorAll("[data-edit-course]").forEach(function(btn) {
    btn.addEventListener("click", function() { openCourseForm(btn.getAttribute("data-edit-course")); });
  });
  tbody.querySelectorAll("[data-del-course]").forEach(function(btn) {
    btn.addEventListener("click", function() { deleteCourse(btn.getAttribute("data-del-course")); });
  });
}

async function renderTimetableEditor() {
  await ensureTimetables();
  await loadCoursesCache();
  try {
    if (typeof syncClassKeyFromPair === "function") {
      syncClassKeyFromPair("ttEditProgramme", "ttEditLevel", "ttClassKey");
    }
  } catch (_) {}
  var key = (document.getElementById("ttClassKey") && document.getElementById("ttClassKey").value) || "100_nursing";
  var tt = TIMETABLES_CACHE[key] || { class_name: classLabelFromKey ? classLabelFromKey(key) : key, slots: [] };
  if (!tt.slots) tt.slots = [];
  TIMETABLES_CACHE[key] = tt;
  var tbody = document.getElementById("timetableSlotsBody");
  if (!tbody) return;
  if (!tt.slots.length) {
    tbody.innerHTML = '<tr><td colspan="6">No slots — add one. Course column is a checklist from the catalogue.</td></tr>';
    return;
  }
  tbody.innerHTML = tt.slots.map(function(s, idx) {
    return "<tr>" +
      '<td><input type="number" min="0" max="6" data-tt-field="weekday" data-tt-i="' + idx + '" value="' + (s.weekday != null ? s.weekday : 0) + '" style="width:56px" title="0=Mon … 4=Fri" /></td>' +
      '<td><select data-tt-field="code" data-tt-i="' + idx + '" style="min-width:200px">' + courseOptionsHtml(s.code || "", key) + "</select></td>" +
      '<td><input type="time" data-tt-field="start" data-tt-i="' + idx + '" value="' + escapeHtml(s.start || "08:00") + '" /></td>' +
      '<td><input type="time" data-tt-field="end" data-tt-i="' + idx + '" value="' + escapeHtml(s.end || "10:00") + '" /></td>' +
      '<td><input type="number" min="0" step="0.5" data-tt-field="hours" data-tt-i="' + idx + '" value="' + (s.hours != null ? s.hours : 2) + '" style="width:64px" /></td>' +
      '<td class="qa-edit-only"><button type="button" class="icon-btn-sm" data-tt-del="' + idx + '">Del</button></td></tr>';
  }).join("");

  tbody.querySelectorAll("[data-tt-field]").forEach(function(inp) {
    inp.addEventListener("change", async function() {
      if (!isQaOfficer() && inp.tagName === "SELECT") return;
      var i = Number(inp.getAttribute("data-tt-i"));
      var f = inp.getAttribute("data-tt-field");
      var key2 = (document.getElementById("ttClassKey") && document.getElementById("ttClassKey").value) || "100_nursing";
      if (!TIMETABLES_CACHE[key2]) TIMETABLES_CACHE[key2] = { slots: [] };
      var slot = TIMETABLES_CACHE[key2].slots[i];
      if (!slot) return;
      if (f === "code") {
        var val = inp.value;
        if (val === "__other__") {
          var newCode = prompt("Enter new course code (e.g. NUS 118):", "");
          if (!newCode || !String(newCode).trim()) {
            inp.value = slot.code || "";
            return;
          }
          newCode = String(newCode).trim();
          var res = await ensureCourseInCatalogue(newCode, "");
          if (!res.ok) {
            inp.value = slot.code || "";
            return;
          }
          slot.code = res.course.code;
          markDirty("timetable");
          renderTimetableEditor();
          return;
        }
        if (val && !(COURSES_CACHE || []).some(function(c) { return c.code === val; })) {
          var res2 = await ensureCourseInCatalogue(val, "");
          if (!res2.ok) {
            inp.value = slot.code || "";
            return;
          }
        }
        slot.code = val;
      } else if (f === "weekday" || f === "hours") {
        slot[f] = Number(inp.value);
      } else {
        slot[f] = String(inp.value || "").trim();
      }
      // auto hours from start/end if both time
      if (f === "start" || f === "end") {
        var st = slot.start || "", en = slot.end || "";
        if (/^\d{1,2}:\d{2}$/.test(st) && /^\d{1,2}:\d{2}$/.test(en)) {
          var a = st.split(":").map(Number), b = en.split(":").map(Number);
          var mins = (b[0] * 60 + b[1]) - (a[0] * 60 + a[1]);
          if (mins > 0) {
            slot.hours = Math.round((mins / 60) * 2) / 2;
            var hoursInp = tbody.querySelector('[data-tt-field="hours"][data-tt-i="' + i + '"]');
            if (hoursInp) hoursInp.value = slot.hours;
          }
        }
      }
      markDirty("timetable");
    });
  });
  tbody.querySelectorAll("[data-tt-del]").forEach(function(btn) {
    btn.addEventListener("click", function() {
      if (!isQaOfficer()) return;
      var key2 = (document.getElementById("ttClassKey") && document.getElementById("ttClassKey").value) || "100_nursing";
      var i = Number(btn.getAttribute("data-tt-del"));
      if (!TIMETABLES_CACHE[key2] || !TIMETABLES_CACHE[key2].slots) return;
      TIMETABLES_CACHE[key2].slots.splice(i, 1);
      markDirty("timetable");
      renderTimetableEditor();
    });
  });
}

function addTimetableSlot() {
  if (!isQaOfficer()) return;
  try {
    if (typeof syncClassKeyFromPair === "function") syncClassKeyFromPair("ttEditProgramme", "ttEditLevel", "ttClassKey");
  } catch (_) {}
  var key = (document.getElementById("ttClassKey") && document.getElementById("ttClassKey").value) || "100_nursing";
  if (!TIMETABLES_CACHE) TIMETABLES_CACHE = {};
  if (!TIMETABLES_CACHE[key]) TIMETABLES_CACHE[key] = { class_name: key, slots: [] };
  if (!TIMETABLES_CACHE[key].slots) TIMETABLES_CACHE[key].slots = [];
  TIMETABLES_CACHE[key].slots.push({ weekday: 0, code: "", start: "08:00", end: "10:00", hours: 2 });
  markDirty("timetable");
  renderTimetableEditor();
}

async function saveTimetableLocal() {
  if (!isQaOfficer()) { alert("Sign in as QA Officer to save timetables."); return; }
  try {
    if (typeof syncClassKeyFromPair === "function") syncClassKeyFromPair("ttEditProgramme", "ttEditLevel", "ttClassKey");
  } catch (_) {}
  var key = (document.getElementById("ttClassKey") && document.getElementById("ttClassKey").value) || "100_nursing";
  var tt = TIMETABLES_CACHE && TIMETABLES_CACHE[key];
  if (!tt || !tt.slots) { alert("No timetable data for this programme/level."); return; }
  await loadCoursesCache();
  for (var i = 0; i < tt.slots.length; i++) {
    var code = String(tt.slots[i].code || "").trim();
    if (!code) {
      alert("Slot " + (i + 1) + " has no course selected. Choose from the list or remove the slot.");
      return;
    }
    var res = await ensureCourseInCatalogue(code, "");
    if (!res.ok) return;
  }
  await writeAudit({ action: "update", entity: "timetables", entityId: key, reason: "Timetable saved for " + key });
  markDirty("timetable");
  alert("Timetable saved for " + key + ".\nPublish all data so data/timetables.json is updated on the repository.");
}

window.loadCoursesCache = loadCoursesCache;
window.ensureCourseInCatalogue = ensureCourseInCatalogue;
window.renderCoursesTable = renderCoursesTable;
window.renderTimetableEditor = renderTimetableEditor;
window.addTimetableSlot = addTimetableSlot;
window.saveTimetableLocal = saveTimetableLocal;



/** Full student register — institutional snapshot */
async function generateStudentRegisterReport() {
  // Apply the same filters as the Students table (search / programme / level)
  var search = (document.getElementById("studentSearch") && document.getElementById("studentSearch").value || "").toLowerCase().trim();
  var fProg = (document.getElementById("filterProgramme") && document.getElementById("filterProgramme").value) || "";
  var fLevel = (document.getElementById("filterLevel") && document.getElementById("filterLevel").value) || "";

  var officer = prompt("Enter the full name of the officer generating this student register report:", "");
  if (officer == null) return;
  officer = String(officer).trim();
  if (!officer) { alert("Officer name is required."); return; }
  var fmt = prompt("Output format — type PDF, WORD or CSV (default PDF):", "PDF");
  if (fmt == null) return;
  fmt = String(fmt).trim().toLowerCase();
  if (fmt.indexOf("c") === 0) fmt = "csv";
  else if (fmt.indexOf("w") === 0) fmt = "word";
  else fmt = "pdf";

  var students = await getAll("students");
  students = (students || []).slice();
  if (search) {
    students = students.filter(function(s) {
      return String(s.name || "").toLowerCase().indexOf(search) >= 0 ||
        String(s.regNo || "").toLowerCase().indexOf(search) >= 0;
    });
  }
  if (fProg) students = students.filter(function(s) { return String(s.programme || "") === fProg; });
  if (fLevel) students = students.filter(function(s) { return String(s.level || "") === String(fLevel); });

  students.sort(function(a, b) {
    return String(a.name || "").toUpperCase().localeCompare(String(b.name || "").toUpperCase());
  });

  function aaName(n) { return String(n || "").trim().toUpperCase(); }
  function genderLabel(g) {
    var t = String(g || "").trim();
    if (!t) return "—";
    var l = t.toLowerCase();
    if (l.indexOf("f") === 0) return "Female";
    if (l.indexOf("m") === 0) return "Male";
    return t;
  }

  var filterNote = [];
  if (fProg) filterNote.push("Programme: " + fProg);
  if (fLevel) filterNote.push("Level: " + fLevel);
  if (search) filterNote.push("Search: " + search);
  var filterLine = filterNote.length ? filterNote.join(" · ") : "All students (no filter)";

  if (fmt === "csv") {
    var lines = ["S/N,Name,Reg No,Gender,Programme,Level,Hostel,Status"];
    students.forEach(function(s, i) {
      function q(v) {
        var t = String(v == null ? "" : v).replace(/"/g, '""');
        return '"' + t + '"';
      }
      lines.push([
        i + 1,
        q(aaName(s.name)),
        q(s.regNo || ""),
        q(genderLabel(s.gender)),
        q(s.programme || ""),
        q(s.level || ""),
        q(s.hostel || ""),
        q(s.status || "Active")
      ].join(","));
    });
    var blob = new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "EOCNS_Student_Register_" + new Date().toISOString().slice(0, 10) + ".csv";
    document.body.appendChild(a);
    a.click();
    setTimeout(function() { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
    try {
      writeAudit({
        action: "create", entity: "report", entityId: "report_" + Date.now().toString(36),
        reason: "Generated student register CSV",
        details: { officer: officer, format: "csv", count: students.length, filter: filterLine }
      });
    } catch (_) {}
    alert("CSV downloaded for " + students.length + " student(s).\n" + filterLine);
    return;
  }

  var byProg = {};
  students.forEach(function(s) {
    var k = (s.programme || "Unspecified") + " · L" + (s.level || "?");
    byProg[k] = byProg[k] || [];
    byProg[k].push(s);
  });
  var active = students.filter(function(s) { return !s.status || String(s.status).toLowerCase() === "active"; }).length;
  var female = students.filter(function(s) { return String(s.gender || "").toLowerCase().indexOf("f") === 0; }).length;
  var male = students.filter(function(s) { return String(s.gender || "").toLowerCase().indexOf("m") === 0; }).length;
  var amendments = [];
  try {
    if (typeof collectReportAmendments === "function") {
      amendments = await collectReportAmendments({ entities: ["students"] });
    }
  } catch (_) {}

  var letterhead = (typeof reportLetterheadHtml === "function")
    ? reportLetterheadHtml("Student Master Register", "Filtered institutional roll — name, registration number & gender", "Snapshot as at " + new Date().toLocaleString())
    : "<h1>Student Master Register</h1>";
  var body = letterhead;
  body += "<p style='font-size:12px;color:#475569'><strong>Filter applied:</strong> " + escapeHtml(filterLine) +
    " · <strong>Officer:</strong> " + escapeHtml(officer) + "</p>";
  body += "<h2 class='sec'>Register snapshot</h2>";
  body += "<div class='kpi'>" +
    "<div><div class='lab'>Students in report</div><div class='val' style='color:#1B3A6B'>" + students.length + "</div></div>" +
    "<div class='present'><div class='lab'>Active</div><div class='val'>" + active + "</div></div>" +
    "<div><div class='lab'>Female</div><div class='val' style='color:#1B3A6B'>" + female + "</div></div>" +
    "<div><div class='lab'>Male</div><div class='val' style='color:#1B3A6B'>" + male + "</div></div>" +
    "</div>";
  if (typeof svgDonut === "function" && students.length) {
    var genPct = Math.round((female / students.length) * 1000) / 10;
    body += "<div style='display:flex;gap:16px;flex-wrap:wrap;align-items:center'>" + svgDonut(genPct, 130, "% female") +
      "<p style='font-size:12px;max-width:360px'>Names shown in uppercase (AA). Core columns: Name, Reg. No, Gender.</p></div>";
  }
  Object.keys(byProg).sort().forEach(function(k) {
    var rows = byProg[k].map(function(s, i) {
      return "<tr><td>" + (i + 1) + "</td><td>" + escapeHtml(aaName(s.name)) + "</td><td>" + escapeHtml(s.regNo || "") +
        "</td><td>" + escapeHtml(genderLabel(s.gender)) +
        "</td><td>" + escapeHtml(s.hostel || "") + "</td><td>" + escapeHtml(s.status || "Active") + "</td></tr>";
    }).join("");
    body += "<h2 class='sec'>" + escapeHtml(k) + " <span style='font-weight:500;color:#64748b'>(" + byProg[k].length + ")</span></h2>";
    body += "<table class='data'><thead><tr><th>#</th><th>Name</th><th>Reg. No</th><th>Gender</th><th>Hostel</th><th>Status</th></tr></thead><tbody>" + rows + "</tbody></table>";
  });
  if (!students.length) {
    body += "<p class='muted'>No students match the current filters.</p>";
  }
  if (typeof reportGlossaryHtml === "function") {
    body += reportGlossaryHtml([
      ["Name", "Shown in uppercase (AA) for uniformity on official registers."],
      ["Reg. No", "Official registration / matriculation number."],
      ["Gender", "As recorded on the master list."]
    ]);
  }
  if (typeof reportAmendmentsHtml === "function") body += reportAmendmentsHtml(amendments, (typeof meta !== "undefined" && meta && meta.officer) || (typeof officer !== "undefined" && officer) || "");

  var openWin = window.openReportWindow || (typeof openReportWindow === "function" ? openReportWindow : null);
  if (openWin) openWin("EOCNS Student Master Register", body, officer, fmt);
  else {
    var w = window.open("", "_blank");
    if (w) {
      w.document.write("<!DOCTYPE html><html><head><title>Student Register</title></head><body>" + body + "</body></html>");
      w.document.close();
      if (fmt === "pdf") setTimeout(function() { try { w.print(); } catch (_) {} }, 400);
    }
  }
}
window.generateStudentRegisterReport = generateStudentRegisterReport;
try {
  var _btnReg = document.getElementById("btnGenerateStudentRegister");
  if (_btnReg && !_btnReg.__regReportBound) {
    _btnReg.__regReportBound = true;
    _btnReg.addEventListener("click", function() {
      Promise.resolve(window.generateStudentRegisterReport()).catch(function(err) {
        console.error(err);
        alert("Register report failed: " + (err && err.message ? err.message : String(err)));
      });
    });
  }
} catch (_) {}

/** Hostel occupancy & distribution report */
async function generateHostelDistributionReport() {
  if (typeof isQaOfficer === "function" && !isQaOfficer()) {
    if (typeof openOfficerLoginGate === "function") openOfficerLoginGate("hostel");
    else alert("Sign in as QA Officer to generate the hostel distribution report.");
    return;
  }
  var promptFn = window.promptOfficerAndFormat || (typeof promptOfficerAndFormat === "function" ? promptOfficerAndFormat : null);
  var letterhead = window.reportLetterheadHtml || (typeof reportLetterheadHtml === "function" ? reportLetterheadHtml : null);
  var openWin = window.openReportWindow || (typeof openReportWindow === "function" ? openReportWindow : null);
  var glossary = window.reportGlossaryHtml || (typeof reportGlossaryHtml === "function" ? reportGlossaryHtml : function() { return ""; });
  var amendmentsHtml = window.reportAmendmentsHtml || (typeof reportAmendmentsHtml === "function" ? reportAmendmentsHtml : function() { return ""; });
  var collectAmd = window.collectReportAmendments || (typeof collectReportAmendments === "function" ? collectReportAmendments : async function() { return []; });
  var bars = window.svgHBarRows || (typeof svgHBarRows === "function" ? svgHBarRows : function() { return ""; });
  var donut = window.svgDonut || (typeof svgDonut === "function" ? svgDonut : function() { return ""; });
  if (!promptFn || !letterhead || !openWin) {
    alert("Report engine is still loading. Hard-refresh the page (Ctrl+Shift+R), sign in as QA Officer, then try again.");
    return;
  }
  var meta = await promptFn("Hostel Distribution Report");
  if (!meta) return;

  var students = (await getAll("students")).filter(function(s) {
    return !s.status || String(s.status).toLowerCase() === "active";
  });
  if (!students.length) {
    alert("No active students on the master list. Load or publish students first.");
    return;
  }

  var byHostel = {};
  var byProgramme = {};
  var unassigned = 0;
  students.forEach(function(s) {
    var h = (s.hostel || "").trim() || "Unassigned";
    if (h === "Unassigned") unassigned++;
    byHostel[h] = byHostel[h] || [];
    byHostel[h].push(s);
    var p = (s.programme || "—").trim() || "—";
    byProgramme[p] = (byProgramme[p] || 0) + 1;
  });
  var hostels = Object.keys(byHostel).sort(function(a, b) {
    if (a === "Unassigned") return 1;
    if (b === "Unassigned") return -1;
    return a.localeCompare(b);
  });

  var barPct = hostels.map(function(h) {
    var n = byHostel[h].length;
    return { label: h + " (" + n + ")", value: students.length ? (n / students.length) * 100 : 0 };
  });
  var largest = hostels.filter(function(h) { return h !== "Unassigned"; }).sort(function(a, b) {
    return byHostel[b].length - byHostel[a].length;
  })[0] || "—";
  var largestN = largest !== "—" ? byHostel[largest].length : 0;
  var coverage = students.length ? Math.round(((students.length - unassigned) / students.length) * 1000) / 10 : 0;

  var amendments = [];
  try { amendments = await collectAmd({ entities: ["students"] }); } catch (_) {}

  var body = letterhead(
    "Hostel Distribution Report",
    "QUALITY ASSURANCE DEPARTMENT · Master register snapshot",
    "As at " + new Date().toLocaleString() + " · Active students only"
  );

  body += "<h2 class='sec'>Executive overview</h2>";
  body += "<div class='kpi'>" +
    "<div><div class='lab'>Active students</div><div class='val' style='color:#1B3A6B'>" + students.length + "</div></div>" +
    "<div><div class='lab'>Hostel groups</div><div class='val' style='color:#1B3A6B'>" + hostels.filter(function(h){return h!=="Unassigned";}).length + "</div></div>" +
    "<div><div class='lab'>Assignment coverage</div><div class='val' style='color:" + (coverage >= 90 ? "#1B7A3D" : "#B8860B") + "'>" + coverage + "%</div></div>" +
    "<div class='absent'><div class='lab'>Unassigned</div><div class='val'>" + unassigned + "</div></div>" +
    "</div>";

  body += "<p class='narrative'>This pack is a <strong>master-list distribution</strong> (where students are recorded as living), not a biometric gate absentee run. " +
    "Gate / Location ID logic applies only when you <em>Generate &amp; download report</em> from an uploaded ZKTeco file. " +
    "Largest assigned group: <strong>" + escapeHtml(largest) + "</strong> (" + largestN + ").</p>";

  body += "<h2 class='sec'>Share by hostel</h2>";
  if (students.length) {
    var assignedPct = coverage;
    body += "<div style='display:flex;flex-wrap:wrap;gap:20px;align-items:center;justify-content:center;margin:12px 0 8px'>" +
      donut(assignedPct, 120, "Assigned") + bars(barPct, 340) + "</div>";
  } else {
    body += bars(barPct, 360);
  }

  body += "<h2 class='sec'>Programme mix (active)</h2>";
  var progRows = Object.keys(byProgramme).sort().map(function(p) {
    return { label: p + " (" + byProgramme[p] + ")", value: students.length ? (byProgramme[p] / students.length) * 100 : 0 };
  });
  body += bars(progRows, 360);

  hostels.forEach(function(h) {
    var list = byHostel[h].slice();
    if (typeof compareStudentsByRegNo === "function") list.sort(compareStudentsByRegNo);
    else list.sort(function(a, b) { return String(a.regNo || "").localeCompare(String(b.regNo || "")) || String(a.name || "").localeCompare(String(b.name || "")); });
    var rows = list.map(function(s, i) {
      var reg = s.regNo || "";
      var temp = (typeof isTempRegNo === "function" && isTempRegNo(reg)) ? " <span class='cell-sub'>temp</span>" : "";
      return "<tr><td>" + (i + 1) + "</td><td>" + escapeHtml(s.name || "") + "</td><td>" + escapeHtml(reg) + temp +
        "</td><td>" + escapeHtml(s.programme || "") + "</td><td>" + escapeHtml(String(s.level || "")) +
        "</td><td>" + escapeHtml(s.gender || "") + "</td></tr>";
    }).join("");
    body += "<h2 class='sec'>" + escapeHtml(h) + " — " + list.length + " student(s)</h2>";
    body += "<table class='data'><thead><tr><th>#</th><th>Name</th><th>Reg. No</th><th>Programme</th><th>Level</th><th>Gender</th></tr></thead><tbody>" +
      (rows || "<tr><td colspan='6'>No students</td></tr>") + "</tbody></table>";
  });

  body += glossary([
    ["Hostel assignment (this report)", "Taken from the student master list field at the moment of generation."],
    ["Unassigned", "Active students with a blank hostel on the master list."],
    ["Coverage", "Share of active students with a non-blank hostel field."],
    ["Gate / Location ID report", "Separate action: upload ZKTeco export then “Generate & download report” — that run uses majority Location ID for hostel labels."],
    ["Temporary reg", "TMP-… numbers sort after permanent registration numbers in each table."]
  ]);
  body += amendmentsHtml(amendments);
  openWin("EOCNS Hostel Distribution Report", body, meta.officer, meta.format);
}
window.generateHostelDistributionReport = generateHostelDistributionReport;

window.generateHostelDistributionReport = generateHostelDistributionReport;



// =========================================================
// BIOMETRIC DEVICE USER IMPORT + NAME MATCH → serial link
// Site official name is never overwritten by machine spelling.
// =========================================================

function bioNormTokens(name) {
  var raw = String(name || "").toLowerCase()
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!raw) return [];
  return raw.split(" ").filter(function(t) { return t.length; });
}

/** Expand glued tokens using candidate dictionary (site name parts). */
function bioExpandAgainst(machineTokens, siteTokens) {
  var out = [];
  machineTokens.forEach(function(t) {
    if (siteTokens.indexOf(t) >= 0) { out.push(t); return; }
    // try split glued word into consecutive site tokens
    var rest = t;
    var parts = [];
    var guard = 0;
    while (rest && guard++ < 8) {
      var hit = null;
      for (var i = 0; i < siteTokens.length; i++) {
        var st = siteTokens[i];
        if (st.length >= 2 && rest.indexOf(st) === 0) {
          if (!hit || st.length > hit.length) hit = st;
        }
      }
      if (hit) { parts.push(hit); rest = rest.slice(hit.length); }
      else break;
    }
    if (parts.length && !rest) parts.forEach(function(p) { out.push(p); });
    else out.push(t);
  });
  return out;
}

/** Score 0–1: order-insensitive token match with initial support. */
function bioNameScore(machineName, siteName) {
  var a = bioNormTokens(machineName);
  var b = bioNormTokens(siteName);
  if (!a.length || !b.length) return 0;
  a = bioExpandAgainst(a, b);
  // Exact normalized equality
  if (a.join(" ") === b.join(" ")) return 1;
  var used = {};
  var hits = 0;
  var weight = 0;
  a.forEach(function(ta) {
    var best = 0;
    var bestJ = -1;
    for (var j = 0; j < b.length; j++) {
      if (used[j]) continue;
      var tb = b[j];
      var s = 0;
      if (ta === tb) s = 1;
      else if (ta.length === 1 && tb.charAt(0) === ta) s = 0.72;
      else if (tb.length === 1 && ta.charAt(0) === tb) s = 0.72;
      else if (ta.length > 1 && tb.length > 1 && (tb.indexOf(ta) === 0 || ta.indexOf(tb) === 0)) s = 0.8;
      if (s > best) { best = s; bestJ = j; }
    }
    if (bestJ >= 0 && best > 0) {
      used[bestJ] = true;
      hits += best;
    }
    weight += 1;
  });
  // Penalize large length mismatch slightly
  var lenPen = Math.abs(a.length - b.length) * 0.04;
  var score = weight ? (hits / Math.max(a.length, b.length)) : 0;
  score = Math.max(0, score - lenPen);
  return Math.min(1, score);
}

function bioParseUserRows(rows) {
  if (!rows || !rows.length) return { ok: false, message: "Empty file.", users: [] };
  var header = rows[0].map(function(c) { return String(c == null ? "" : c).trim(); });
  var idx = {};
  header.forEach(function(h, i) {
    var k = h.toLowerCase();
    idx[k] = i;
  });
  function findCol(cands) {
    for (var i = 0; i < cands.length; i++) {
      if (idx[cands[i]] != null) return idx[cands[i]];
    }
    // partial
    for (var h in idx) {
      for (var j = 0; j < cands.length; j++) {
        if (h.indexOf(cands[j]) >= 0) return idx[h];
      }
    }
    return null;
  }
  var nameCol = findCol(["name", "user name", "username", "employee name", "person name"]);
  var noCol = findCol(["no.", "no", "user id", "userid", "id", "enrollment id", "enroll id", "badge", "pin"]);
  if (nameCol == null || noCol == null) {
    return {
      ok: false,
      message: "Need columns for User ID/No. and Name. Found: " + header.filter(Boolean).join(", "),
      users: []
    };
  }
  var users = [];
  var seen = {};
  for (var r = 1; r < rows.length; r++) {
    var row = rows[r] || [];
    var name = String(row[nameCol] == null ? "" : row[nameCol]).trim();
    var no = row[noCol];
    if (no == null || no === "") continue;
    no = String(no).trim();
    if (!name || !no) continue;
    if (seen[no]) continue;
    seen[no] = true;
    users.push({ machineNo: no, machineName: name });
  }
  return { ok: true, users: users, message: users.length + " device users read." };
}

async function bioLoadSheetFile(file) {
  return new Promise(function(resolve, reject) {
    var reader = new FileReader();
    reader.onerror = function() { reject(new Error("Could not read file")); };
    reader.onload = function(e) {
      try {
        if (typeof XLSX === "undefined") {
          reject(new Error("Excel library not loaded — refresh the page"));
          return;
        }
        var data = new Uint8Array(e.target.result);
        var wb = XLSX.read(data, { type: "array" });
        var sheet = wb.Sheets[wb.SheetNames[0]];
        var rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
        resolve(rows);
      } catch (err) { reject(err); }
    };
    reader.readAsArrayBuffer(file);
  });
}

async function bioRankMatches(machineName, students) {
  var scored = [];
  for (var i = 0; i < students.length; i++) {
    var s = students[i];
    var sc = bioNameScore(machineName, s.name || "");
    if (sc <= 0) continue;
    scored.push({
      studentId: s.id,
      name: s.name,
      regNo: s.regNo || "",
      serial: s.serial || "",
      programme: s.programme || "",
      level: s.level,
      score: sc
    });
  }
  scored.sort(function(a, b) { return b.score - a.score; });
  return scored;
}

async function bioLinkStudentSerial(studentId, machineNo, machineName, deviceLabel, score, mode) {
  var all = await getAll("students");
  var s = all.find(function(x) { return x.id === studentId; });
  if (!s) throw new Error("Student not found");
  // conflict: another student already has this serial
  var clash = all.find(function(x) {
    return x.id !== studentId && String(x.serial || "").trim() === String(machineNo).trim();
  });
  if (clash) {
    throw new Error("Machine No. " + machineNo + " already linked to " + (clash.name || clash.regNo));
  }
  var beforeSerial = s.serial || "";
  s.serial = String(machineNo).trim();
  s.updatedAt = new Date().toISOString();
  // optional alias for future matching — do not change official name
  if (!s.bioAliases) s.bioAliases = [];
  var mn = String(machineName || "").trim();
  if (mn && s.bioAliases.indexOf(mn) < 0) s.bioAliases.push(mn);
  if (deviceLabel) s.bioDeviceLabel = deviceLabel;
  // If site has no hostel yet, use device/hostel tag from the machine link
  var hostelBlank = function(h) {
    var t = String(h || "").trim().toLowerCase();
    return !t || t.indexOf("unassigned") >= 0 || t === "—" || t === "-" || t === "n/a" || t === "none";
  };
  var beforeHostel = s.hostel || "";
  if (hostelBlank(s.hostel) && deviceLabel) {
    var dl = String(deviceLabel);
    if (/hostel\s*1/i.test(dl) || dl === "1") s.hostel = "Hostel 1";
    else if (/hostel\s*2/i.test(dl) || dl === "2") s.hostel = "Hostel 2";
    else if (/hostel/i.test(dl)) s.hostel = dl.trim();
    if (!hostelBlank(s.hostel) && s.hostel !== beforeHostel) {
      s.hostelSource = "machine_link";
    }
  }
  await put("students", s);
  try {
    await writeAudit({
      action: "update",
      entity: "students",
      entityId: s.id,
      reason: "Biometric machine ID linked (" + (mode || "match") + ")",
      details: {
        serialBefore: beforeSerial,
        serialAfter: s.serial,
        machineName: mn,
        deviceLabel: deviceLabel || "",
        score: score != null ? score : null,
        siteNameKept: s.name
      }
    });
  } catch (_) {}
  return s;
}

async function bioImportAndMatch() {
  if (!isQaOfficer()) { openOfficerLoginGate("hostel"); return; }
  var fileInput = document.getElementById("bioUserFile");
  var status = document.getElementById("bioImportStatus");
  var file = fileInput && fileInput.files && fileInput.files[0];
  if (!file) {
    if (status) status.textContent = "Choose a device user export file first.";
    return;
  }
  var deviceLabel = (document.getElementById("bioDeviceLabel") && document.getElementById("bioDeviceLabel").value) || "Hostel 1";
  if (status) status.textContent = "Reading device users…";
  try {
    var rows = await bioLoadSheetFile(file);
    var parsed = bioParseUserRows(rows);
    if (!parsed.ok) {
      if (status) status.textContent = parsed.message;
      return;
    }
    var students = await getAll("students");
    students = (students || []).filter(function(s) {
      return !s.status || String(s.status).toLowerCase() === "active";
    });
    var AUTO_MIN = 0.85;
    var AUTO_GAP = 0.12;
    var CLARIFY_MIN = 0.55;
    var autoN = 0, clarifyN = 0, unlinkedN = 0, skipN = 0, conflictN = 0;
    // clear previous pending for this device optional — keep all devices' pools
    for (var u = 0; u < parsed.users.length; u++) {
      var user = parsed.users[u];
      // already linked?
      var already = students.find(function(s) {
        return String(s.serial || "").trim() === String(user.machineNo).trim();
      });
      if (already) { skipN++; continue; }
      var ranked = await bioRankMatches(user.machineName, students);
      var best = ranked[0];
      var second = ranked[1];
      var bestScore = best ? best.score : 0;
      var secondScore = second ? second.score : 0;
      var uniqueStrong = best && bestScore >= AUTO_MIN && (bestScore - secondScore) >= AUTO_GAP;
      // also reject if best already has different serial that isn't empty? allow overwrite only if empty serial
      if (uniqueStrong && best.serial && String(best.serial).trim() && String(best.serial).trim() !== String(user.machineNo).trim()) {
        // student already has another machine id — send to clarify
        uniqueStrong = false;
      }
      if (uniqueStrong) {
        try {
          await bioLinkStudentSerial(best.studentId, user.machineNo, user.machineName, deviceLabel, bestScore, "auto");
          autoN++;
          // refresh local students list serial
          var st = students.find(function(s) { return s.id === best.studentId; });
          if (st) st.serial = String(user.machineNo).trim();
        } catch (err) {
          conflictN++;
          await put("biometric_pending", {
            id: "bio_" + Date.now().toString(36) + "_" + u,
            machineNo: user.machineNo,
            machineName: user.machineName,
            deviceLabel: deviceLabel,
            status: "conflict",
            note: err.message || String(err),
            suggestions: ranked.slice(0, 5),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        }
        continue;
      }
      if (best && bestScore >= CLARIFY_MIN) {
        clarifyN++;
        await put("biometric_pending", {
          id: "bio_" + Date.now().toString(36) + "_" + u,
          machineNo: user.machineNo,
          machineName: user.machineName,
          deviceLabel: deviceLabel,
          status: "clarify",
          suggestions: ranked.slice(0, 5).map(function(r) {
            return { studentId: r.studentId, name: r.name, regNo: r.regNo, score: Math.round(r.score * 1000) / 10, serial: r.serial };
          }),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      } else {
        unlinkedN++;
        await put("biometric_pending", {
          id: "bio_" + Date.now().toString(36) + "_" + u,
          machineNo: user.machineNo,
          machineName: user.machineName,
          deviceLabel: deviceLabel,
          status: "unlinked",
          suggestions: ranked.slice(0, 3).map(function(r) {
            return { studentId: r.studentId, name: r.name, regNo: r.regNo, score: Math.round(r.score * 1000) / 10 };
          }),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
    }
    markDirty("biometric import");
    if (status) {
      status.textContent = "Done · auto-linked " + autoN + " · clarify " + clarifyN +
        " · unlinked pool " + unlinkedN + " · already linked " + skipN +
        (conflictN ? (" · conflicts " + conflictN) : "") +
        ". Official site names were not changed. Publish when ready.";
    }
    var sum = document.getElementById("bioImportSummary");
    if (sum) {
      sum.hidden = false;
      sum.innerHTML =
        '<div class="bio-kpi"><div class="lab">Auto-linked</div><div class="val">' + autoN + '</div></div>' +
        '<div class="bio-kpi"><div class="lab">Clarify</div><div class="val">' + clarifyN + '</div></div>' +
        '<div class="bio-kpi"><div class="lab">Unlinked</div><div class="val">' + unlinkedN + '</div></div>' +
        '<div class="bio-kpi"><div class="lab">Already OK</div><div class="val">' + skipN + '</div></div>';
    }
    await renderBioQueues();
    try { await renderStudentsTable(); } catch (_) {}
  } catch (err) {
    console.error(err);
    if (status) status.textContent = "Import failed: " + (err.message || String(err));
  }
}

async function renderBioQueues() {
  var clarifyBody = document.getElementById("bioClarifyBody");
  var unlinkedBody = document.getElementById("bioUnlinkedBody");
  var countEl = document.getElementById("bioClarifyCount");
  var list = [];
  try { list = await getAll("biometric_pending"); } catch (_) { list = []; }
  list = (list || []).filter(function(x) { return x && x.status !== "linked"; });
  var clarify = list.filter(function(x) {
    return x.status === "clarify" || x.status === "conflict" || x.kind === "train";
  }).filter(function(x) {
    return x.status === "clarify" || x.status === "conflict";
  });
  var unlinked = list.filter(function(x) { return x.status === "unlinked"; });
  if (countEl) {
    countEl.textContent = clarify.length
      ? ("Clarify queue: " + clarify.length + " waiting")
      : "Clarify queue: 0 — all clear";
  }
  if (clarifyBody) {
    if (!clarify.length) {
      clarifyBody.innerHTML = '<tr><td colspan="5" class="muted-note">No rows waiting. Queue is clear.</td></tr>';
    } else {
      clarifyBody.innerHTML = clarify.map(function(row) {
        var best = (row.suggestions || [])[0];
        var bestTxt = best
          ? (escapeHtml(best.name || "") + " · " + escapeHtml(best.regNo || "—") +
             (best.score != null ? (" · " + best.score + "%") : ""))
          : '<span class="muted-note">No auto match</span>';
        return '<tr>' +
          '<td><strong>' + escapeHtml(row.machineNo || "") + '</strong></td>' +
          '<td>' + escapeHtml(row.machineName || "") + '</td>' +
          '<td>' + escapeHtml(row.deviceLabel || "") + '</td>' +
          '<td>' + bestTxt + '</td>' +
          '<td class="qa-edit-only">' +
            (isQaOfficer() ? (
              '<button type="button" class="btn btn--primary btn--sm" data-bio-review="' + escapeHtml(row.id) + '">Review &amp; link</button> ' +
              '<button type="button" class="btn btn--ghost btn--sm" data-bio-to-unlinked="' + escapeHtml(row.id) + '">Pool</button> ' +
              '<button type="button" class="btn btn--ghost btn--sm" data-bio-discard="' + escapeHtml(row.id) + '">Discard</button>'
            ) : "—") +
          '</td></tr>';
      }).join("");
    }
  }
  if (unlinkedBody) {
    if (!unlinked.length) {
      unlinkedBody.innerHTML = '<tr><td colspan="5" class="muted-note">Pool empty.</td></tr>';
    } else {
      unlinkedBody.innerHTML = unlinked.map(function(row) {
        return '<tr>' +
          '<td><strong>' + escapeHtml(row.machineNo || "") + '</strong></td>' +
          '<td>' + escapeHtml(row.machineName || "") + '</td>' +
          '<td>' + escapeHtml(row.deviceLabel || "") + '</td>' +
          '<td class="muted-note">' + escapeHtml(row.note || "Awaiting create / manual link") + '</td>' +
          '<td class="qa-edit-only">' +
            (isQaOfficer() ? (
              '<button type="button" class="btn btn--primary btn--sm" data-bio-review="' + escapeHtml(row.id) + '">Link to master…</button> ' +
              '<button type="button" class="btn btn--ghost btn--sm" data-bio-create="' + escapeHtml(row.id) + '">Create student</button> ' +
              '<button type="button" class="btn btn--ghost btn--sm" data-bio-discard="' + escapeHtml(row.id) + '">Discard</button>'
            ) : "—") +
          '</td></tr>';
      }).join("");
    }
  }
  document.querySelectorAll("[data-bio-review]").forEach(function(btn) {
    btn.addEventListener("click", function() {
      openBioClarifyModal(btn.getAttribute("data-bio-review"));
    });
  });
  document.querySelectorAll("[data-bio-to-unlinked]").forEach(function(btn) {
    btn.addEventListener("click", async function() {
      var pid = btn.getAttribute("data-bio-to-unlinked");
      var pending = (await getAll("biometric_pending")).find(function(x) { return x.id === pid; });
      if (!pending) return;
      pending.status = "unlinked";
      pending.updatedAt = new Date().toISOString();
      await put("biometric_pending", pending);
      markDirty("biometric pool");
      await renderBioQueues();
    });
  });
  document.querySelectorAll("[data-bio-discard]").forEach(function(btn) {
    btn.addEventListener("click", async function() {
      if (!confirm("Discard this device user from the queue?")) return;
      await del("biometric_pending", btn.getAttribute("data-bio-discard"));
      markDirty("biometric discard");
      await renderBioQueues();
    });
  });
  document.querySelectorAll("[data-bio-create]").forEach(function(btn) {
    btn.addEventListener("click", function() {
      openBioCreateStudentModal(btn.getAttribute("data-bio-create"));
    });
  });
  try { await renderHostelConflicts(); } catch (_) {}
}

async function openBioClarifyModal(pendingId) {
  if (!isQaOfficer()) { openOfficerLoginGate("hostel"); return; }
  var pending = (await getAll("biometric_pending")).find(function(x) { return x.id === pendingId; });
  if (!pending) { alert("Queue item not found."); return; }
  document.getElementById("bioClarifyPendingId").value = pendingId;
  document.getElementById("bioClarifySelectedStu").value = "";
  var info = document.getElementById("bioClarifyMachineInfo");
  if (info) {
    info.innerHTML = "<strong>Machine ID:</strong> " + escapeHtml(pending.machineNo || "") +
      " &nbsp;|&nbsp; <strong>Machine name:</strong> " + escapeHtml(pending.machineName || "") +
      " &nbsp;|&nbsp; <strong>Device:</strong> " + escapeHtml(pending.deviceLabel || "—");
  }
  var box = document.getElementById("bioClarifySuggestions");
  var sug = (pending.suggestions || []).slice(0, 8);
  if (!box) return;
  if (!sug.length) {
    box.innerHTML = '<p class="muted-note" style="margin:0">No automatic suggestions — search the master list below.</p>';
  } else {
    box.innerHTML = sug.map(function(s, idx) {
      var checked = idx === 0 ? " checked" : "";
      if (idx === 0) {
        document.getElementById("bioClarifySelectedStu").value = s.studentId;
      }
      return '<label style="display:flex;gap:8px;align-items:flex-start;padding:6px 4px;cursor:pointer;border-bottom:1px solid var(--border)">' +
        '<input type="radio" name="bioClarifyPick" value="' + escapeHtml(s.studentId) + '"' + checked + ' />' +
        '<span><strong>' + escapeHtml(s.name || "") + '</strong><br>' +
        '<span class="muted-note">' + escapeHtml(s.regNo || "—") +
        (s.serial ? (" · ID " + escapeHtml(s.serial)) : "") +
        (s.score != null ? (" · " + s.score + "% match") : "") +
        '</span></span></label>';
    }).join("");
    box.querySelectorAll('input[name="bioClarifyPick"]').forEach(function(inp) {
      inp.addEventListener("change", function() {
        document.getElementById("bioClarifySelectedStu").value = inp.value;
      });
    });
  }
  var searchInp = document.getElementById("bioClarifySearch");
  if (searchInp) {
    searchInp.value = "";
    searchInp.oninput = function() { bioClarifyRunSearch(searchInp.value); };
  }
  var res = document.getElementById("bioClarifySearchResults");
  if (res) res.innerHTML = "";
  var modal = document.getElementById("bioClarifyModal");
  if (modal) modal.hidden = false;
}

function closeBioClarifyModal() {
  var modal = document.getElementById("bioClarifyModal");
  if (modal) modal.hidden = true;
}

async function bioClarifyRunSearch(q) {
  var res = document.getElementById("bioClarifySearchResults");
  if (!res) return;
  q = String(q || "").trim().toLowerCase();
  if (q.length < 2) { res.innerHTML = ""; return; }
  var all = await getAll("students");
  var hits = (all || []).filter(function(s) {
    if (s.status && String(s.status) !== "Active") return false;
    var name = String(s.name || "").toLowerCase();
    var reg = String(s.regNo || "").toLowerCase();
    var serial = String(s.serial || "").toLowerCase();
    return name.indexOf(q) >= 0 || reg.indexOf(q) >= 0 || serial.indexOf(q) >= 0;
  }).slice(0, 20);
  if (!hits.length) {
    res.innerHTML = '<p class="muted-note">No master students match.</p>';
    return;
  }
  res.innerHTML = hits.map(function(s) {
    return '<label style="display:flex;gap:8px;align-items:flex-start;padding:6px 4px;cursor:pointer;border-bottom:1px solid var(--border)">' +
      '<input type="radio" name="bioClarifyPick" value="' + escapeHtml(s.id) + '" />' +
      '<span><strong>' + escapeHtml(s.name || "") + '</strong><br>' +
      '<span class="muted-note">' + escapeHtml(s.regNo || "—") +
      (s.serial ? (" · ID " + escapeHtml(s.serial)) : "") +
      " · " + escapeHtml(s.programme || "") + " L" + escapeHtml(String(s.level || "")) +
      '</span></span></label>';
  }).join("");
  res.querySelectorAll('input[name="bioClarifyPick"]').forEach(function(inp) {
    inp.addEventListener("change", function() {
      document.getElementById("bioClarifySelectedStu").value = inp.value;
      // uncheck suggestion radios in other box
      document.querySelectorAll('#bioClarifySuggestions input[name="bioClarifyPick"]').forEach(function(r) {
        r.checked = false;
      });
    });
  });
}

async function confirmBioClarifyLink() {
  var pid = document.getElementById("bioClarifyPendingId") && document.getElementById("bioClarifyPendingId").value;
  var sid = document.getElementById("bioClarifySelectedStu") && document.getElementById("bioClarifySelectedStu").value;
  // also check checked radio
  var checked = document.querySelector('#bioClarifyModal input[name="bioClarifyPick"]:checked');
  if (checked) sid = checked.value;
  if (!pid || !sid) { alert("Select a master student first (suggestion or search)."); return; }
  var pending = (await getAll("biometric_pending")).find(function(x) { return x.id === pid; });
  if (!pending) { alert("Queue item gone."); closeBioClarifyModal(); return; }
  try {
    await bioLinkStudentSerial(sid, pending.machineNo, pending.machineName, pending.deviceLabel, null, "manual");
    await del("biometric_pending", pid);
    markDirty("biometric link");
    closeBioClarifyModal();
    await renderBioQueues();
    try { await renderHostelRoster(); } catch (_) {}
    try { await renderStudentsTable(); } catch (_) {}
  } catch (err) {
    alert(err.message || String(err));
  }
}

async function bioUnlinkStudentSerial(studentId) {
  if (!isQaOfficer()) return;
  var all = await getAll("students");
  var s = all.find(function(x) { return x.id === studentId; });
  if (!s) throw new Error("Student not found");
  var before = s.serial || "";
  if (!before) { alert("No machine ID linked on this student."); return; }
  if (!confirm("Unlink machine ID " + before + " from " + (s.name || "") + "?\n\nGate matching will treat them as unmatched until linked again.")) return;
  s.serial = "";
  s.updatedAt = new Date().toISOString();
  await put("students", s);
  try {
    await writeAudit({
      action: "update",
      entity: "students",
      entityId: s.id,
      reason: "Unlinked biometric machine ID",
      details: { serialBefore: before, name: s.name, regNo: s.regNo }
    });
  } catch (_) {}
  markDirty("biometric unlink");
  try { await renderHostelRoster(); } catch (_) {}
  try { await renderStudentsTable(); } catch (_) {}
  alert("Unlinked machine ID " + before + ".");
}

async function bioManualLinkPrompt(studentId) {
  if (!isQaOfficer()) return;
  var machineNo = prompt("Enter machine User ID / No. to link to this student:");
  if (machineNo == null) return;
  machineNo = String(machineNo).trim();
  if (!machineNo) return;
  var all = await getAll("students");
  var s = all.find(function(x) { return x.id === studentId; });
  if (!s) return;
  try {
    await bioLinkStudentSerial(studentId, machineNo, s.name || "", s.hostel || "", null, "roster");
    markDirty("biometric link");
    try { await renderHostelRoster(); } catch (_) {}
    alert("Linked machine ID " + machineNo + " → " + (s.name || ""));
  } catch (err) {
    alert(err.message || String(err));
  }
}

async function openBioCreateStudentModal(pendingId) {
  if (!isQaOfficer()) return;
  var pending = (await getAll("biometric_pending")).find(function(x) { return x.id === pendingId; });
  if (!pending) return;
  await fillProgrammeLevelSelects();
  // copy options into bio selects
  ["bioCreateProgramme", "bioCreateLevel"].forEach(function(id) {
    var el = document.getElementById(id);
    var srcId = id === "bioCreateProgramme" ? "studentProgramme" : "studentLevel";
    var src = document.getElementById(srcId);
    if (el && src) el.innerHTML = src.innerHTML;
  });
  document.getElementById("bioCreatePendingId").value = pendingId;
  document.getElementById("bioCreateName").value = pending.machineName || "";
  document.getElementById("bioCreateMachineName").value = pending.machineName || "";
  document.getElementById("bioCreateSerial").value = pending.machineNo || "";
  document.getElementById("bioCreateRegNo").value = "";
  if (pending.deviceLabel && document.getElementById("bioCreateHostel")) {
    var h = document.getElementById("bioCreateHostel");
    if (pending.deviceLabel.indexOf("1") >= 0) h.value = "Hostel 1";
    else if (pending.deviceLabel.indexOf("2") >= 0) h.value = "Hostel 2";
  }
  document.getElementById("bioCreateStudentModal").hidden = false;
}

function closeBioCreateStudentModal() {
  var m = document.getElementById("bioCreateStudentModal");
  if (m) m.hidden = true;
}

async function confirmBioCreateStudent() {
  if (!isQaOfficer()) return;
  var pendingId = document.getElementById("bioCreatePendingId").value;
  var name = (document.getElementById("bioCreateName").value || "").trim();
  var serial = (document.getElementById("bioCreateSerial").value || "").trim();
  var regNo = (document.getElementById("bioCreateRegNo").value || "").trim();
  var programme = (document.getElementById("bioCreateProgramme").value || "").trim();
  var level = (document.getElementById("bioCreateLevel").value || "").trim();
  var hostel = (document.getElementById("bioCreateHostel").value || "").trim();
  var gender = (document.getElementById("bioCreateGender").value || "").trim();
  if (!name) { alert("Official site name is required."); return; }
  if (!serial) { alert("Machine No. / serial is required."); return; }
  if (!programme || !level) { alert("Programme and level are required."); return; }
  var all = await getAll("students");
  if (all.find(function(s) { return String(s.serial || "").trim() === serial; })) {
    alert("That machine No. is already linked to another student.");
    return;
  }
  if (!regNo) regNo = await generateTempRegNo(programme);
  if (all.find(function(s) { return String(s.regNo || "").toLowerCase() === regNo.toLowerCase(); })) {
    alert("Registration number already in use.");
    return;
  }
  var now = new Date().toISOString();
  var student = {
    id: generateId("stu"),
    name: name,
    regNo: regNo,
    serial: serial,
    programme: programme,
    level: level !== "" && !isNaN(Number(level)) ? Number(level) : level,
    gender: gender,
    hostel: hostel,
    status: "Active",
    phone: "",
    photoDataUrl: "",
    bioAliases: [],
    createdAt: now,
    updatedAt: now
  };
  var pending = (await getAll("biometric_pending")).find(function(x) { return x.id === pendingId; });
  if (pending && pending.machineName && pending.machineName !== name) {
    student.bioAliases = [pending.machineName];
  }
  await put("students", student);
  try {
    await writeAudit({
      action: "create",
      entity: "students",
      entityId: student.id,
      reason: "Created from biometric device user",
      details: { serial: serial, machineName: pending && pending.machineName, siteName: name }
    });
  } catch (_) {}
  if (pendingId) {
    try { await del("biometric_pending", pendingId); } catch (_) {}
  }
  markDirty("biometric create student");
  closeBioCreateStudentModal();
  await renderBioQueues();
  try { await renderStudentsTable(); } catch (_) {}
  alert("Student created on the master list with serial " + serial + ". Site name: " + name);
}


// =========================================================
// HOSTEL TRAIN — learn machine No./name/location only (no report)
// =========================================================

function hostelFieldIsBlank(h) {
  var t = String(h || "").trim().toLowerCase();
  if (!t) return true;
  if (t === "—" || t === "-" || t === "n/a" || t === "na" || t === "none") return true;
  if (t.indexOf("unassigned") >= 0) return true;
  return false;
}

function hostelFromLocationId(lid, h1, h2) {
  var n = String(lid == null ? "" : lid).trim();
  if (n === "1") return h1 || "Hostel 1";
  if (n === "2") return h2 || "Hostel 2";
  return "";
}

/**
 * Train master list from a gate/hostel export:
 * - unique machine users (No. + Name)
 * - majority Location ID → hostel if student hostel blank
 * - strong unique name match → write serial (site name kept)
 * - ambiguous → biometric_pending clarify queue
 */
async function trainHostelFromExport(file, options) {
  if (!isQaOfficer()) { openOfficerLoginGate("hostel"); return; }
  options = options || {};
  var statusEl = document.getElementById("hostelTrainStatus");
  var sumEl = document.getElementById("hostelTrainSummary");
  function setSt(t) { if (statusEl) statusEl.textContent = t; }
  if (!file) { setSt("Choose a gate/hostel export file."); return; }

  setSt("Reading export…");
  var rows;
  try {
    if (typeof bioLoadSheetFile === "function") rows = await bioLoadSheetFile(file);
    else {
      // fallback XLSX
      rows = await new Promise(function(resolve, reject) {
        var reader = new FileReader();
        reader.onerror = function() { reject(new Error("Could not read file")); };
        reader.onload = function(e) {
          try {
            var data = new Uint8Array(e.target.result);
            var wb = XLSX.read(data, { type: "array" });
            var sheet = wb.Sheets[wb.SheetNames[0]];
            resolve(XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }));
          } catch (err) { reject(err); }
        };
        reader.readAsArrayBuffer(file);
      });
    }
  } catch (e) {
    setSt("Could not read file: " + (e.message || e));
    return;
  }
  if (!rows || rows.length < 2) { setSt("File has no data rows."); return; }

  var headerIndex = {};
  (rows[0] || []).forEach(function(v, i) {
    var k = String(v == null ? "" : v).trim();
    if (k) headerIndex[k] = i;
  });
  // flexible header lookup
  function col() {
    var names = Array.prototype.slice.call(arguments);
    for (var i = 0; i < names.length; i++) {
      if (headerIndex[names[i]] != null) return headerIndex[names[i]];
    }
    var keys = Object.keys(headerIndex);
    for (var j = 0; j < names.length; j++) {
      var want = String(names[j]).toLowerCase();
      for (var k = 0; k < keys.length; k++) {
        if (String(keys[k]).toLowerCase().indexOf(want) >= 0) return headerIndex[keys[k]];
      }
    }
    return null;
  }
  var nameCol = col("Name", "name", "User Name");
  var noCol = col("No.", "No", "User ID", "ID", "Enroll ID");
  var locCol = col("Location ID", "LocationID", "Location");
  if (nameCol == null || noCol == null) {
    setSt("Need Name and No. (User ID) columns. Found: " + Object.keys(headerIndex).join(", "));
    return;
  }

  var h1 = (document.getElementById("hostel1Name") && document.getElementById("hostel1Name").value) || "Hostel 1";
  var h2 = (document.getElementById("hostel2Name") && document.getElementById("hostel2Name").value) || "Hostel 2";
  var devicePref = options.deviceLabel || (document.getElementById("hostelTrainDevice") && document.getElementById("hostelTrainDevice").value) || "";

  // Aggregate unique machine users
  var users = {}; // no -> { name, votes: {1:n,2:n}, punches }
  for (var r = 1; r < rows.length; r++) {
    var row = rows[r] || [];
    var name = String(row[nameCol] == null ? "" : row[nameCol]).trim();
    var noRaw = row[noCol];
    if (!name || noRaw == null || noRaw === "") continue;
    var no = String(typeof normalizeStudentIdHostel === "function" ? normalizeStudentIdHostel(noRaw) : noRaw).trim();
    if (!no) continue;
    if (!users[no]) users[no] = { machineNo: no, machineName: name, votes: { "1": 0, "2": 0 }, punches: 0 };
    // prefer longer name if machine varies
    if (name.length > users[no].machineName.length) users[no].machineName = name;
    users[no].punches++;
    if (locCol != null) {
      var lid = String(row[locCol] == null ? "" : row[locCol]).trim();
      if (lid === "1" || lid === "2") users[no].votes[lid] = (users[no].votes[lid] || 0) + 1;
    }
  }
  var list = Object.keys(users).map(function(k) { return users[k]; });
  if (!list.length) { setSt("No machine users found in file."); return; }

  setSt("Training on " + list.length + " unique machine user(s)…");

  var master = await getAll("students");
  master = (master || []).filter(function(s) {
    return !s.status || String(s.status).toLowerCase() === "active";
  });
  var bySerial = {};
  master.forEach(function(s) {
    if (s.serial) bySerial[String(s.serial).trim()] = s;
  });

  var AUTO_MIN = 0.85, AUTO_GAP = 0.12, CLARIFY_MIN = 0.55;
  var autoLink = 0, hostelSet = 0, already = 0, clarify = 0, unlinked = 0, conflicts = 0;

  var existingQ = await getAll("biometric_pending");
  var openKeys = {};
  (existingQ || []).forEach(function(q) {
    if (q && q.status !== "linked" && q.machineNo) openKeys[String(q.machineNo).trim()] = true;
  });

  for (var i = 0; i < list.length; i++) {
    var u = list[i];
    var maj = null;
    if (u.votes["1"] > u.votes["2"]) maj = "1";
    else if (u.votes["2"] > u.votes["1"]) maj = "2";
    var hostelGuess = maj ? hostelFromLocationId(maj, h1, h2) : (devicePref || "");

    var linkedStu = bySerial[u.machineNo];
    if (linkedStu) {
      already++;
      // fill blank hostel only
      if (hostelGuess && hostelFieldIsBlank(linkedStu.hostel)) {
        var before = linkedStu.hostel || "";
        linkedStu.hostel = hostelGuess;
        linkedStu.hostelSource = "train_location_id";
        linkedStu.updatedAt = new Date().toISOString();
        await put("students", linkedStu);
        hostelSet++;
        try {
          await writeAudit({
            action: "update",
            entity: "students",
            entityId: linkedStu.id,
            reason: "Train: assigned blank hostel from gate Location ID",
            details: { hostelBefore: before, hostelAfter: hostelGuess, machineNo: u.machineNo }
          });
        } catch (_) {}
      }
      continue;
    }

    // rank by name
    var ranked = [];
    for (var m = 0; m < master.length; m++) {
      var s = master[m];
      var sc = typeof bioNameScore === "function" ? bioNameScore(u.machineName, s.name || "") : 0;
      if (sc <= 0) continue;
      ranked.push({
        studentId: s.id,
        name: s.name,
        regNo: s.regNo || "",
        serial: s.serial || "",
        score: sc
      });
    }
    ranked.sort(function(a, b) { return b.score - a.score; });
    var best = ranked[0], second = ranked[1];
    var bestScore = best ? best.score : 0;
    var secondScore = second ? second.score : 0;
    var uniqueStrong = best && bestScore >= AUTO_MIN && (bestScore - secondScore) >= AUTO_GAP;
    if (uniqueStrong && best.serial && String(best.serial).trim() && String(best.serial).trim() !== u.machineNo) {
      uniqueStrong = false; // already has different machine id
    }

    if (uniqueStrong) {
      try {
        await bioLinkStudentSerial(best.studentId, u.machineNo, u.machineName, hostelGuess || devicePref || "Gate train", bestScore, "train");
        // bioLink may set hostel from deviceLabel; ensure Location ID hostel if still blank
        var all2 = await getAll("students");
        var st2 = all2.find(function(x) { return x.id === best.studentId; });
        if (st2 && hostelGuess && hostelFieldIsBlank(st2.hostel)) {
          st2.hostel = hostelGuess;
          st2.hostelSource = "train_location_id";
          st2.updatedAt = new Date().toISOString();
          await put("students", st2);
          hostelSet++;
        }
        bySerial[u.machineNo] = st2 || { id: best.studentId };
        // refresh master serial map entry
        for (var mx = 0; mx < master.length; mx++) {
          if (master[mx].id === best.studentId) {
            master[mx].serial = u.machineNo;
            if (hostelGuess && hostelFieldIsBlank(master[mx].hostel)) master[mx].hostel = hostelGuess;
            break;
          }
        }
        autoLink++;
      } catch (err) {
        conflicts++;
        if (!openKeys[u.machineNo]) {
          await put("biometric_pending", {
            id: "train_" + Date.now().toString(36) + "_" + i,
            kind: "train",
            machineNo: u.machineNo,
            machineName: u.machineName,
            deviceLabel: hostelGuess || devicePref || "Gate train",
            status: "conflict",
            note: err.message || String(err),
            suggestions: ranked.slice(0, 5).map(function(r) {
              return { studentId: r.studentId, name: r.name, regNo: r.regNo, score: Math.round(r.score * 1000) / 10, serial: r.serial };
            }),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
          openKeys[u.machineNo] = true;
        }
      }
      continue;
    }

    if (best && bestScore >= CLARIFY_MIN) {
      clarify++;
      if (!openKeys[u.machineNo]) {
        await put("biometric_pending", {
          id: "train_" + Date.now().toString(36) + "_" + i,
          kind: "train",
          machineNo: u.machineNo,
          machineName: u.machineName,
          deviceLabel: hostelGuess || devicePref || "Gate train",
          status: "clarify",
          suggestions: ranked.slice(0, 5).map(function(r) {
            return { studentId: r.studentId, name: r.name, regNo: r.regNo, score: Math.round(r.score * 1000) / 10, serial: r.serial };
          }),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        openKeys[u.machineNo] = true;
      }
    } else {
      unlinked++;
      if (!openKeys[u.machineNo]) {
        await put("biometric_pending", {
          id: "train_" + Date.now().toString(36) + "_" + i,
          kind: "train",
          machineNo: u.machineNo,
          machineName: u.machineName,
          deviceLabel: hostelGuess || devicePref || "Gate train",
          status: "unlinked",
          suggestions: ranked.slice(0, 3).map(function(r) {
            return { studentId: r.studentId, name: r.name, regNo: r.regNo, score: Math.round(r.score * 1000) / 10 };
          }),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        openKeys[u.machineNo] = true;
      }
    }
  }

  markDirty("hostel train");
  try { await renderBioQueues(); } catch (_) {}
  try { if (typeof renderHostelRoster === "function") await renderHostelRoster(); } catch (_) {}
  try { if (typeof renderStudentsTable === "function") await renderStudentsTable(); } catch (_) {}

  setSt("Train complete · machine users " + list.length +
    " · already linked " + already +
    " · auto-linked " + autoLink +
    " · hostel filled " + hostelSet +
    " · clarify " + clarify +
    " · unlinked pool " + unlinked +
    (conflicts ? (" · conflicts " + conflicts) : "") +
    ". Publish when ready. Use Batch review for remaining names.");

  if (sumEl) {
    sumEl.hidden = false;
    sumEl.innerHTML =
      '<div class="bio-kpi"><div class="lab">Machine users</div><div class="val">' + list.length + '</div></div>' +
      '<div class="bio-kpi"><div class="lab">Auto-linked</div><div class="val">' + autoLink + '</div></div>' +
      '<div class="bio-kpi"><div class="lab">Hostel filled</div><div class="val">' + hostelSet + '</div></div>' +
      '<div class="bio-kpi"><div class="lab">Clarify</div><div class="val">' + clarify + '</div></div>' +
      '<div class="bio-kpi"><div class="lab">Unlinked</div><div class="val">' + unlinked + '</div></div>' +
      '<div class="bio-kpi"><div class="lab">Already OK</div><div class="val">' + already + '</div></div>';
  }
}

function initHostelTrainUI() {
  document.getElementById("btnHostelTrain")?.addEventListener("click", async function() {
    var inp = document.getElementById("hostelTrainFile");
    var file = inp && inp.files && inp.files[0];
    try {
      await trainHostelFromExport(file, {
        deviceLabel: (document.getElementById("hostelTrainDevice") && document.getElementById("hostelTrainDevice").value) || ""
      });
    } catch (e) {
      console.error(e);
      var st = document.getElementById("hostelTrainStatus");
      if (st) st.textContent = "Train failed: " + (e.message || e);
    }
  });
  document.getElementById("btnHostelTrainBatch")?.addEventListener("click", function() {
    if (typeof startMatchQueueBatch === "function") startMatchQueueBatch("clarify");
    else alert("Batch review not ready — hard-refresh once.");
  });
}

function initBiometricMapUI() {
  document.getElementById("btnBioImportMatch")?.addEventListener("click", function() { bioImportAndMatch(); });
  document.getElementById("btnBioRefreshQueues")?.addEventListener("click", function() { renderBioQueues(); try { renderCsvReviewQueue(); } catch (_) {} });
  document.getElementById("btnBioBatchClarify")?.addEventListener("click", function() { startMatchQueueBatch("clarify"); });

  document.getElementById("btnCloseBioClarify")?.addEventListener("click", closeBioClarifyModal);
  document.getElementById("bioClarifyBackdrop")?.addEventListener("click", closeBioClarifyModal);
  document.getElementById("btnBioClarifyCancel")?.addEventListener("click", closeBioClarifyModal);
  document.getElementById("btnBioClarifyLink")?.addEventListener("click", function() { confirmBioClarifyLink(); });
  document.getElementById("btnBioClarifyPool")?.addEventListener("click", async function() {
    var pid = document.getElementById("bioClarifyPendingId") && document.getElementById("bioClarifyPendingId").value;
    if (!pid) return;
    var pending = (await getAll("biometric_pending")).find(function(x) { return x.id === pid; });
    if (!pending) return;
    pending.status = "unlinked";
    pending.updatedAt = new Date().toISOString();
    await put("biometric_pending", pending);
    markDirty("biometric pool");
    closeBioClarifyModal();
    await renderBioQueues();
  });
  document.getElementById("btnRefreshHostelConflicts")?.addEventListener("click", function() { renderHostelConflicts(); });

  document.getElementById("btnBioBatchUnlinked")?.addEventListener("click", function() { startMatchQueueBatch("unlinked"); });
  document.getElementById("btnCsvReviewBatch")?.addEventListener("click", function() { startMatchQueueBatch("csv"); });
  document.getElementById("btnCsvReviewRefresh")?.addEventListener("click", function() { renderCsvReviewQueue(); });
  try { renderCsvReviewQueue(); } catch (_) {}
  document.getElementById("btnCloseBioCreate")?.addEventListener("click", closeBioCreateStudentModal);
  document.getElementById("btnCancelBioCreate")?.addEventListener("click", closeBioCreateStudentModal);
  document.getElementById("bioCreateStudentBackdrop")?.addEventListener("click", closeBioCreateStudentModal);
  document.getElementById("btnConfirmBioCreate")?.addEventListener("click", function() { confirmBioCreateStudent(); });
  try { renderBioQueues(); } catch (_) {}
}


// =========================================================
// MATCH QUEUE — hostel unmatched + CSV discrepancies (persistent)
// =========================================================

async function queueUnmatchedFromHostelResult(result, hostel1Name, hostel2Name) {
  // Prefer excludedPending (people held off the report); fall back to scanning students map
  var candidates = [];
  if (result && result.excludedPending && result.excludedPending.length) {
    result.excludedPending.forEach(function(ex) {
      candidates.push({ machineNo: String(ex.machineNo || "").trim(), name: ex.name || "" });
    });
  } else if (result && result.students) {
    Object.keys(result.students).forEach(function(sid) {
      var st = result.students[sid];
      if (st && st.matched && st.masterId) return;
      candidates.push({ machineNo: String(sid).trim(), name: (st && st.name) || "" });
    });
  }
  if (!candidates.length) return;
  var master = await getAll("students");
  var bySerial = {};
  master.forEach(function(s) {
    if (s.serial) bySerial[String(s.serial).trim()] = s;
  });
  var existingQ = await getAll("biometric_pending");
  var openKeys = {};
  (existingQ || []).forEach(function(q) {
    if (q && q.status !== "linked" && q.machineNo) openKeys[String(q.machineNo).trim()] = true;
  });
  var added = 0;
  for (var i = 0; i < candidates.length; i++) {
    var machineNo = candidates[i].machineNo;
    var stName = candidates[i].name || "";
    if (!machineNo) continue;
    if (bySerial[machineNo]) continue;
    if (openKeys[machineNo]) continue;
    var ranked = [];
    try {
      master.forEach(function(s) {
        var sc = (typeof bioNameScore === "function") ? bioNameScore(stName, s.name || "") : 0;
        if (sc >= 0.45) {
          ranked.push({
            studentId: s.id,
            name: s.name,
            regNo: s.regNo || "",
            serial: s.serial || "",
            score: Math.round(sc * 1000) / 10
          });
        }
      });
      ranked.sort(function(a, b) { return b.score - a.score; });
    } catch (_) {}
    var status = ranked.length && ranked[0].score >= 55 ? "clarify" : "unlinked";
    await put("biometric_pending", {
      id: "bio_h_" + Date.now().toString(36) + "_" + machineNo + "_" + i,
      kind: "hostel",
      machineNo: machineNo,
      machineName: stName,
      deviceLabel: hostel1Name || "Gate export",
      status: status,
      suggestions: ranked.slice(0, 5),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    openKeys[machineNo] = true;
    added++;
  }
  if (added > 0) {
    markDirty("hostel unmatched queue");
    try { await renderBioQueues(); } catch (_) {}
    setTimeout(function() {
      if (isQaOfficer() && confirm(
        added + " machine user(s) are NOT on this hostel report until you review and link them.\n\n" +
        "They are held in the match queue. After you link someone, Generate again to include them.\n\n" +
        "Open batch review now?"
      )) {
        try { showView("hostel"); } catch (_) {}
        var card = document.getElementById("biometricMapCard");
        if (card) card.scrollIntoView({ behavior: "smooth", block: "start" });
        try { startMatchQueueBatch("clarify"); } catch (_) {}
      }
    }, 400);
  }
}

/**
 * Walk pending clarify items one-by-one with confirm dialogs.
 * mode: "clarify" | "unlinked" | "csv"
 */
async function startMatchQueueBatch(mode) {
  if (!isQaOfficer()) { openOfficerLoginGate("hostel"); return; }
  var list = await getAll("biometric_pending");
  list = (list || []).filter(function(x) {
    if (!x || x.status === "linked") return false;
    if (mode === "csv") return x.kind === "csv" || x.status === "csv_review";
    if (mode === "unlinked") return x.status === "unlinked";
    return x.status === "clarify" || x.status === "conflict" || x.status === "csv_review";
  });
  if (!list.length) {
    alert("No items waiting in this queue.");
    return;
  }
  var linked = 0, skipped = 0, toPool = 0;
  for (var i = 0; i < list.length; i++) {
    var row = list[i];
    var sug = row.suggestions || [];
    var msg = "Item " + (i + 1) + " of " + list.length + "\n\n";
    if (row.kind === "csv") {
      msg += "CSV import review\n";
      msg += "CSV name: " + (row.csvName || row.machineName || "") + "\n";
      msg += "CSV reg: " + (row.csvRegNo || "") + "\n";
      msg += "Issue: " + (row.note || "possible match already on master") + "\n\n";
    } else {
      msg += "Machine No.: " + (row.machineNo || "") + "\n";
      msg += "Machine name: " + (row.machineName || "") + "\n";
      msg += "Device: " + (row.deviceLabel || "") + "\n\n";
    }
    if (sug.length) {
      msg += "Suggested master records:\n";
      sug.slice(0, 5).forEach(function(s, idx) {
        msg += "  " + (idx + 1) + ") " + (s.name || "") + " · " + (s.regNo || "—") +
          (s.score != null ? (" · " + s.score + "%") : "") + "\n";
      });
      msg += "\nOK = link to suggestion #1\nCancel = skip for now";
      var go = confirm(msg);
      if (!go) { skipped++; continue; }
      try {
        if (row.kind === "csv") {
          await applyCsvReviewLink(row, sug[0]);
        } else {
          await bioLinkStudentSerial(sug[0].studentId, row.machineNo, row.machineName, row.deviceLabel, (sug[0].score || 0) / 100, "batch");
          await del("biometric_pending", row.id);
        }
        linked++;
      } catch (err) {
        alert(err.message || String(err));
        skipped++;
      }
    } else {
      msg += "No automatic suggestion.\n\nOK = move to unlinked pool / keep for later\nCancel = skip";
      if (confirm(msg)) {
        row.status = "unlinked";
        row.updatedAt = new Date().toISOString();
        await put("biometric_pending", row);
        toPool++;
      } else skipped++;
    }
  }
  markDirty("match queue batch");
  try { await renderBioQueues(); } catch (_) {}
  try { await renderCsvReviewQueue(); } catch (_) {}
  var leftClarify = 0, leftUnlinked = 0;
  try {
    var left = await getAll("biometric_pending");
    (left || []).forEach(function(x) {
      if (!x || x.status === "linked") return;
      if (x.status === "clarify" || x.status === "conflict") leftClarify++;
      if (x.status === "unlinked") leftUnlinked++;
    });
  } catch (_) {}
  alert(
    "Batch done.\nLinked: " + linked +
    "\nMoved to pool: " + toPool +
    "\nSkipped: " + skipped +
    "\n\nStill waiting — Clarify: " + leftClarify +
    " · Unlinked pool: " + leftUnlinked +
    (leftClarify + leftUnlinked === 0 ? "\n\nAll clear — no names left to review." : "")
  );
}

async function applyCsvReviewLink(row, suggestion) {
  // Link means: keep master student, optionally update empty fields from CSV; do not create duplicate
  var all = await getAll("students");
  var s = all.find(function(x) { return x.id === suggestion.studentId; });
  if (!s) throw new Error("Master student not found");
  var before = { name: s.name, regNo: s.regNo, programme: s.programme, level: s.level };
  // Only fill blanks from CSV unless officer already confirmed
  if (row.csvRegNo && !s.regNo) s.regNo = row.csvRegNo;
  if (row.csvProgramme && !s.programme) s.programme = row.csvProgramme;
  if (row.csvLevel != null && row.csvLevel !== "" && (s.level == null || s.level === "")) s.level = row.csvLevel;
  if (row.csvGender && !s.gender) s.gender = row.csvGender;
  if (row.csvHostel && !s.hostel) s.hostel = row.csvHostel;
  s.updatedAt = new Date().toISOString();
  await put("students", s);
  try {
    await writeAudit({
      action: "update",
      entity: "students",
      entityId: s.id,
      reason: "CSV import review — confirmed existing student (no duplicate)",
      details: { before: before, csvName: row.csvName, csvRegNo: row.csvRegNo }
    });
  } catch (_) {}
  await del("biometric_pending", row.id);
}

async function renderCsvReviewQueue() {
  var body = document.getElementById("csvReviewBody");
  if (!body) return;
  var list = [];
  try { list = await getAll("biometric_pending"); } catch (_) {}
  list = (list || []).filter(function(x) {
    return x && (x.kind === "csv" || x.status === "csv_review");
  });
  if (!list.length) {
    body.innerHTML = '<tr><td colspan="5" class="muted-note">No CSV discrepancies pending.</td></tr>';
    return;
  }
  body.innerHTML = list.map(function(row) {
    var sug = (row.suggestions || []).slice(0, 3).map(function(s) {
      return escapeHtml(s.name || "") + " · " + escapeHtml(s.regNo || "—") +
        (s.score != null ? (" (" + s.score + "%)") : "");
    }).join("<br>") || "—";
    return "<tr>" +
      "<td>" + escapeHtml(row.csvName || row.machineName || "") + "</td>" +
      "<td>" + escapeHtml(row.csvRegNo || "") + "</td>" +
      "<td>" + escapeHtml(row.note || "") + "</td>" +
      "<td>" + sug + "</td>" +
      "<td class=\"qa-edit-only\">" +
        (isQaOfficer() ? (
          '<button type="button" class="btn btn--primary btn--sm" data-csv-confirm="' + escapeHtml(row.id) + '">Confirm link</button> ' +
          '<button type="button" class="btn btn--ghost btn--sm" data-csv-add="' + escapeHtml(row.id) + '">Add as new</button> ' +
          '<button type="button" class="btn btn--ghost btn--sm" data-csv-discard="' + escapeHtml(row.id) + '">Discard</button>'
        ) : "—") +
      "</td></tr>";
  }).join("");

  document.querySelectorAll("[data-csv-confirm]").forEach(function(btn) {
    btn.onclick = async function() {
      var id = btn.getAttribute("data-csv-confirm");
      var row = (await getAll("biometric_pending")).find(function(x) { return x.id === id; });
      if (!row || !(row.suggestions || []).length) { alert("No suggestion to link."); return; }
      try {
        await applyCsvReviewLink(row, row.suggestions[0]);
        markDirty("csv review link");
        await renderCsvReviewQueue();
        try { await renderStudentsTable(); } catch (_) {}
      } catch (e) { alert(e.message || String(e)); }
    };
  });
  document.querySelectorAll("[data-csv-add]").forEach(function(btn) {
    btn.onclick = async function() {
      var id = btn.getAttribute("data-csv-add");
      var row = (await getAll("biometric_pending")).find(function(x) { return x.id === id; });
      if (!row) return;
      if (!confirm("Add as a NEW student card from this CSV row?")) return;
      var now = new Date().toISOString();
      var regNo = row.csvRegNo || "";
      if (regNo) {
        var all = await getAll("students");
        if (all.some(function(s) { return String(s.regNo || "").toLowerCase() === regNo.toLowerCase(); })) {
          alert("That reg no already exists — use Confirm link instead.");
          return;
        }
      }
      if (!regNo) {
        try { regNo = await generateTempRegNo(row.csvProgramme || "Nursing"); } catch (_) { regNo = "TMP-" + Date.now(); }
      }
      var rec = {
        id: generateId("stu"),
        name: row.csvName || row.machineName || "Unknown",
        regNo: regNo,
        programme: row.csvProgramme || "",
        level: row.csvLevel != null ? row.csvLevel : "",
        gender: row.csvGender || "",
        hostel: row.csvHostel || "",
        phone: row.csvPhone || "",
        status: "Active",
        createdAt: now,
        updatedAt: now
      };
      await put("students", rec);
      try {
        await writeAudit({
          action: "create",
          entity: "students",
          entityId: rec.id,
          reason: "Created from CSV discrepancy queue as new student",
          details: { csvName: row.csvName, csvRegNo: row.csvRegNo }
        });
      } catch (_) {}
      await del("biometric_pending", id);
      markDirty("csv review create");
      await renderCsvReviewQueue();
      try { await renderStudentsTable(); } catch (_) {}
    };
  });
  document.querySelectorAll("[data-csv-discard]").forEach(function(btn) {
    btn.onclick = async function() {
      if (!confirm("Discard this CSV review item?")) return;
      await del("biometric_pending", btn.getAttribute("data-csv-discard"));
      markDirty("csv review discard");
      await renderCsvReviewQueue();
    };
  });
}

// Report generators bind to window inside openDB boot (where they are defined).

})();
