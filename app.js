/* EOCNS build v56 — report scope fix */
(() => {
"use strict";
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
function showView(viewId) {
  document.querySelectorAll(".nav-item").forEach((el) => el.classList.toggle("active", el.dataset.view === viewId));
  document.querySelectorAll(".view").forEach((el) => el.classList.toggle("active", el.id === "view-" + viewId));
  const meta = titles[viewId] || { title: "EOCNS", subtitle: "" };
  const titleEl = document.getElementById("pageTitle");
  const subEl = document.getElementById("pageSubtitle");
  if (titleEl) titleEl.textContent = meta.title;
  if (subEl) subEl.textContent = meta.subtitle;
  try { sessionStorage.setItem("eocns-last-view", viewId); } catch (_) {}
  if (viewId === "students") renderStudentsTable();
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
  if (viewId === "hostel") { initHostelView(); renderHostelRoster(); }
  if (viewId === "timetable-board") renderTimetableBoard();
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
const DB_VERSION = 10;
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
  await put("audit", {
    ref: ref, action: opts.action, entity: opts.entity, entityId: opts.entityId,
    reason: opts.reason || "", details: opts.details || {},
    timestamp: new Date().toISOString(), user: "QA Officer",
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
    var actions = '<button type="button" class="icon-btn-sm" data-profile-stu="' + id + '">View</button>';
    if (isQaOfficer()) {
      actions += ' <button type="button" class="icon-btn-sm qa-edit-only" data-edit-stu="' + id + '">Edit</button>' +
        ' <button type="button" class="icon-btn-sm qa-edit-only" data-del-stu="' + id + '">Del</button>';
    }
    return "<tr data-stu-id=\"" + id + "\">" + cb +
      "<td><div class=\"cell-main\" data-profile-stu=\"" + id + "\" style=\"cursor:pointer\" title=\"Open profile\">" + escapeHtml(s.name) + "</div></td>" +
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
      openStudentProfile(btn.getAttribute("data-profile-stu"));
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
  document.getElementById("studentForm").reset();
  document.getElementById("studentId").value = "";
  document.getElementById("auditReason").value = "";
  document.getElementById("auditRef").value = "";
  if (document.getElementById("studentPhotoDataUrl")) document.getElementById("studentPhotoDataUrl").value = "";
  if (document.getElementById("studentPhotoPreview")) document.getElementById("studentPhotoPreview").innerHTML = "—";
  if (document.getElementById("studentPhotoInput")) document.getElementById("studentPhotoInput").value = "";
  const showAudit = !!id;
  ["auditReasonGroup", "auditRefGroup"].forEach(gid => {
    const el = document.getElementById(gid);
    if (el) { el.hidden = !showAudit; el.style.display = showAudit ? "" : "none"; }
  });
  if (id) {
    const s = studentsCache.find(x => x.id === id);
    if (!s) return;
    document.getElementById("studentModalTitle").textContent = "Edit Student";
    document.getElementById("studentId").value = s.id;
    document.getElementById("studentName").value = s.name || "";
    document.getElementById("studentRegNo").value = s.regNo || "";
    document.getElementById("studentProgramme").value = s.programme || "";
    document.getElementById("studentLevel").value = s.level || "";
    document.getElementById("studentGender").value = s.gender || "";
    document.getElementById("studentHostel").value = s.hostel || "";
    document.getElementById("studentStatus").value = s.status || "Active";
    document.getElementById("studentPhone").value = s.phone || "";
  } else {
    document.getElementById("studentModalTitle").textContent = "Add Student";
  }
  modal.hidden = false;
  document.getElementById("studentName").focus();
}
function closeStudentForm() { document.getElementById("studentModal").hidden = true; }
async function saveStudent(e) {
  e.preventDefault();
  const id = document.getElementById("studentId").value || null;
  const name = document.getElementById("studentName").value.trim();
  let regNo = document.getElementById("studentRegNo").value.trim();
  const programme = document.getElementById("studentProgramme").value;
  const level = document.getElementById("studentLevel").value;
  const gender = document.getElementById("studentGender").value;
  const hostel = document.getElementById("studentHostel").value.trim();
  const status = document.getElementById("studentStatus").value || "Active";
  const phone = document.getElementById("studentPhone").value.trim();
  const photoDataUrl = (document.getElementById("studentPhotoDataUrl") && document.getElementById("studentPhotoDataUrl").value) || "";
  const reason = document.getElementById("auditReason").value.trim();
  const officialRef = document.getElementById("auditRef").value.trim();
  if (!name) { alert("Student name is required."); return; }
  if (id) {
    if (!reason) { alert("A reason is required when editing master data."); return; }
    if (!officialRef) { alert("Please enter the official Reference Number from the approved letter."); return; }
    if (!/^REF\/EOCNS\/QA\//i.test(officialRef)) { alert("Reference Number should start with REF/EOCNS/QA/"); return; }
  }
  if (!regNo) regNo = await generateTempRegNo(programme);
  const conflict = studentsCache.find(s => s.regNo === regNo && s.id !== id);
  if (conflict) { alert("Registration number already used by " + conflict.name); return; }
  const now = new Date().toISOString();
  if (id) {
    const existing = studentsCache.find(s => s.id === id);
    const student = Object.assign({}, existing, { name, regNo, programme, level: level ? Number(level) : null, gender, hostel, status, phone, photoDataUrl: photoDataUrl || existing.photoDataUrl || "", updatedAt: now });
    if (photoDataUrl) student.photoUpdatedAt = now;
    await writeAudit({ action: "update", entity: "students", entityId: id, reason, details: { before: existing, after: student }, externalRef: officialRef });
    await put("students", student);
  } else {
    const student = { id: generateId("stu"), name, regNo, programme, level: level ? Number(level) : null, gender, hostel, status, phone, photoDataUrl: photoDataUrl || "", createdAt: now, updatedAt: now };
    if (photoDataUrl) student.photoUpdatedAt = now;
    await writeAudit({ action: "create", entity: "students", entityId: student.id, reason: "New student registration", details: { student } });
    await put("students", student);
  }
  closeStudentForm();
  markDirty();
  await renderStudentsTable();
  refreshDashboardStats();
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
  list.sort(function(a, b) { return String(b.at || b.createdAt || "").localeCompare(String(a.at || a.createdAt || "")); });
  var el = document.getElementById("auditList");
  if (!el) return;
  if (!list.length) {
    el.innerHTML = "<p class=\"muted-note\">No audit entries yet.</p>";
    return;
  }
  el.innerHTML = "<table class=\"data-table\"><thead><tr><th>When</th><th>Action</th><th>Entity</th><th>Reason / REF</th><th>By</th></tr></thead><tbody>" +
    list.slice(0, 200).map(function(a) {
      return "<tr><td>" + escapeHtml((a.at || a.createdAt || "").slice(0, 19).replace("T", " ")) +
        "</td><td>" + escapeHtml(a.action || "") + "</td><td>" + escapeHtml((a.entity || "") + " " + (a.entityId || "")) +
        "</td><td>" + escapeHtml(a.reason || a.externalRef || "—") + "</td><td>" + escapeHtml(a.officer || "QA") + "</td></tr>";
    }).join("") + "</tbody></table>";
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
      showHostelFileCheck('Ready — "' + file.name + '". About ' + count + " students found.", "ok");
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
  // Location ID intentionally ignored for hostel placement (machine mixes 1/2).
  const master = await getAll("students");
  function normName(n) {
    return String(n || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  }
  const byNo = {};
  const byName = {};
  master.forEach(function(s) {
    if (s.serial) byNo[String(s.serial).trim()] = s;
    if (s.regNo) byNo[String(s.regNo).trim().toUpperCase()] = s;
    const nn = normName(s.name);
    if (nn) byName[nn] = s;
  });
  function resolveMaster(name, studentId) {
    if (studentId && byNo[String(studentId).trim()]) return byNo[String(studentId).trim()];
    if (studentId && byNo[String(studentId).trim().toUpperCase()]) return byNo[String(studentId).trim().toUpperCase()];
    const nn = normName(name);
    if (nn && byName[nn]) return byName[nn];
    return null;
  }
  const students = {};
  const attendance = {};
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const rawName = row[nameCol];
    const studentIdRaw = row[noCol];
    if (!rawName || studentIdRaw === "" || studentIdRaw == null) continue;
    const name = String(rawName).trim();
    const studentId = normalizeStudentIdHostel(studentIdRaw);
    const masterStu = resolveMaster(name, studentId);
    // Hostel ALWAYS from master list when known
    let hostel = "Unassigned (set on Students master)";
    if (masterStu && masterStu.hostel) hostel = masterStu.hostel;
    else if (masterStu) hostel = "Unassigned (set on Students master)";
    // Do not use machine Location ID for hostel name
    if (!(studentId in students)) {
      students[studentId] = {
        name: masterStu ? masterStu.name : name,
        hostel: hostel,
        regNo: masterStu ? (masterStu.regNo || "") : "",
        programme: masterStu ? (masterStu.programme || "") : "",
        level: masterStu ? (masterStu.level || "") : "",
        masterId: masterStu ? masterStu.id : null,
        matched: !!masterStu
      };
      attendance[studentId] = new Set();
    }
    const rawDate = row[dateCol];
    if (rawDate === "" || rawDate == null) continue;
    const attendanceDate = parseAttendanceDateHostel(rawDate);
    if (!attendanceDate) continue;
    if (attendanceDate < startDate || attendanceDate > endDate) continue;
    const status = String(row[statusCol] || "").trim().toUpperCase();
    if (status === "C/IN") attendance[studentId].add(toDateKeyHostel(attendanceDate));
  }
  const dates = [];
  const cursor = new Date(startDate);
  while (cursor <= endDate) {
    dates.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return { students, attendance, dates };
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
    const meta = students[id];
    const present = attendance[id] || new Set();
    const dayMarks = dates.map(function(d) {
      const key = toDateKeyHostel(d);
      return present.has(key) ? "✓" : "";
    });
    const absentDays = dayMarks.filter(function(m) { return !m; }).length;
    if (absentDays === 0) return;
    rows.push({
      id: id,
      name: meta.name,
      hostel: meta.hostel,
      regNo: meta.regNo || "",
      programme: meta.programme || "",
      level: meta.level || "",
      dayMarks: dayMarks,
      absentDays: absentDays,
      fine: absentDays * rate
    });
  });
  rows.sort(function(a, b) { return a.name.localeCompare(b.name); });
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
  const thead = table.querySelector("thead");
  const tbody = table.querySelector("tbody");
  thead.innerHTML = "<tr><th>Name</th><th>Hostel</th>" + dayHeaders.map(h => "<th>" + escapeHtml(h) + "</th>").join("") + "<th>Days</th><th>Fine</th></tr>";
  tbody.innerHTML = absentees.map(r => {
    return "<tr><td>" + escapeHtml(r.name) + "</td><td>" + escapeHtml(r.hostel) + "</td>" +
      r.dayMarks.map(m => '<td style="text-align:center">' + (m || "·") + "</td>").join("") +
      "<td>" + r.absentDays + "</td><td>" + formatNairaHostel(r.fine) + "</td></tr>";
  }).join("");
  const totalFine = absentees.reduce((s, r) => s + r.fine, 0);
  document.getElementById("hostelSummary").textContent =
    absentees.length + " absentees · Rate ₦" + rate.toLocaleString("en-NG") + "/day · Total fine " + formatNairaHostel(totalFine);
  document.getElementById("hostelResults").hidden = false;
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

async function generateHostelReport() {
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
    const dayHeaders = buildDayHeadersHostel(result.dates);
    const absentees = buildAbsenteeRowsHostel(result.students, result.attendance, result.dates, rate);
    renderHostelPreview(absentees, dayHeaders, rate);
    window.__lastHostelReport = { absentees: absentees, dayHeaders: dayHeaders, rate: rate, startDate: startDate, endDate: endDate, students: result.students, dates: result.dates };
    // Persist run for audit trail (snapshot of hostel at report time)
    const run = {
      id: "hr_" + Date.now().toString(36),
      createdAt: new Date().toISOString(),
      start: toDateKeyHostel(startDate),
      end: toDateKeyHostel(endDate),
      rate: rate,
      absenteeCount: absentees.length,
      totalFine: absentees.reduce(function(s, r) { return s + r.fine; }, 0),
      rows: absentees.map(function(r) {
        return { name: r.name, hostel: r.hostel, regNo: r.regNo || "", absentDays: r.absentDays, fine: r.fine, programme: r.programme || "", level: r.level || "" };
      }),
      note: "Hostel labels taken from student master at generation time. Machine Location ID ignored."
    };
    stampSessionFields(run);
  await put("hostel_runs", run);
    markDirty("hostel report");
    setHostelStatus("Report ready · " + absentees.length + " absentees · master hostels used · saved locally (Publish to keep).", "ok");
    renderProfessionalHostelPreview(absentees, dayHeaders, rate, startDate, endDate);
  } catch (err) {
    console.error(err);
    setHostelStatus("Failed: " + (err.message || String(err)), "error");
  }
}


openDB().then(async () => {
  console.log("EOCNS Attendance System ready");
  try {
  try { await hydrateAllFromRepoIfEmpty(); } catch (e) { console.warn("hydrate", e); }
  try {
    var syncRes = await syncFromRepoIfClean();
    if (syncRes && syncRes.firstRun) console.info("repo sync: first run on this browser — recorded repository versions");
  } catch (e) { console.warn("repo sync", e); }
  showView(sessionStorage.getItem("eocns-last-view") || "dashboard");
  try { refreshDashboardStats(); } catch (e) { console.warn("stats", e); }
  initQaOfficerUI();

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
    openStudentFullRecord(window.__profileStudentId);
  });
  document.getElementById("btnCloseFullRecord") && document.getElementById("btnCloseFullRecord").addEventListener("click", closeStudentFullRecord);
  document.getElementById("btnCloseFullRecord2") && document.getElementById("btnCloseFullRecord2").addEventListener("click", closeStudentFullRecord);
  document.getElementById("studentFullRecordBackdrop") && document.getElementById("studentFullRecordBackdrop").addEventListener("click", closeStudentFullRecord);
  document.getElementById("btnPrintStudentSummary") && document.getElementById("btnPrintStudentSummary").addEventListener("click", printStudentSummary);
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
  document.getElementById("btnGenerateHostel")?.addEventListener("click", generateHostelReport);
  document.getElementById("btnClearHostel")?.addEventListener("click", () => {
    hostelParsedRows = null;
    if (hostelFileInput) hostelFileInput.value = "";
    showHostelFileCheck("", "");
    setHostelStatus("", "");
    const results = document.getElementById("hostelResults");
    if (results) results.hidden = true;
  });

  // QA module
  seedQaDatalists();
  const todayStr = (function() { var d = new Date(); return d.toISOString().slice(0, 10); })();
async function renderHostelRoster() {
  await loadStudents();
  await fillProgrammeLevelSelects();
  // map roster selects
  var pf = document.getElementById("hostelRosterProgramme");
  var lf = document.getElementById("hostelRosterLevel");
  if (pf && pf.options.length <= 1) {
    var ap = document.getElementById("attProgramme");
    if (ap) pf.innerHTML = ap.innerHTML;
  }
  if (lf && lf.options.length <= 1) {
    var al = document.getElementById("attLevel");
    if (al) lf.innerHTML = al.innerHTML;
  }
  var hostelF = (document.getElementById("hostelRosterFilter") && document.getElementById("hostelRosterFilter").value) || "";
  var prog = (pf && pf.value) || "";
  var level = (lf && lf.value) || "";
  var list = studentsCache.filter(function(s) {
    if (s.status && s.status !== "Active") return false;
    if (prog && String(s.programme || "") !== prog) return false;
    if (level && String(s.level || "") !== String(level)) return false;
    var h = (s.hostel || "").trim();
    if (hostelF === "__unset") return !h;
    if (hostelF) return h === hostelF;
    return true;
  }).sort(function(a, b) { return String(a.name).localeCompare(String(b.name)); });
  var body = document.getElementById("hostelRosterBody");
  if (!body) return;
  body.innerHTML = list.length ? list.map(function(s) {
    return "<tr><td>" + escapeHtml(s.name) + "</td><td>" + escapeHtml(s.regNo || "") + "</td><td>" + escapeHtml(s.programme || "") +
      "</td><td>" + escapeHtml(String(s.level || "")) + "</td><td><strong>" + escapeHtml(s.hostel || "—") + "</strong></td></tr>";
  }).join("") : "<tr><td colspan=\"5\">No students match.</td></tr>";
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
    'Hostel labels are taken from the <em>student master list</em> (not the biometric machine), so mixed Location IDs do not mis-assign students.</p>' +
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
    formatNairaHostel(totalFine) + "</strong>. Hostel placement is resolved exclusively from the college student master register so that biometric Location ID errors cannot mis-assign a resident to the wrong hostel. Historical published runs remain unchanged if a student is later moved between hostels.</p>" +
    "<div class=\"kpi\"><div><strong>" + absentees.length + "</strong>Absentees</div>" +
    "<div><strong>" + formatNairaHostel(totalFine) + "</strong>Total due</div>" +
    "<div><strong>" + formatNairaHostel(rate) + "</strong>Daily rate</div></div>" +
    "<h2>2. Distribution</h2>" +
    "<div style=\"display:flex;gap:24px;flex-wrap:wrap;align-items:center\">" + svgPie(pieSlices, 160) + svgBars(barItems, 300, 140) + "</div>" +
    "<h2>3. Student liability schedule</h2>" +
    "<table><thead><tr><th>#</th><th>Name</th><th>Reg. No</th><th>Hostel (master)</th><th>Days</th><th>Amount</th></tr></thead><tbody>" +
    rows + "</tbody></table>" +
    "<h2>4. Certification</h2>" +
    "<p class=\"narrative\">Prepared via the EOCNS QA Attendance System. Machine Location ID was not used for hostel classification.</p>" +
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

async function importStudentsCsv(file) {
  if (!isQaOfficer()) return;
  var text = await file.text();
  var lines = text.split(/\r?\n/).filter(function(l) { return l.trim(); });
  if (lines.length < 2) { alert("CSV needs a header row and data."); return; }
  function splitCsv(line) {
    var out = [], cur = "", q = false;
    for (var i = 0; i < line.length; i++) {
      var ch = line[i];
      if (ch === '"') { q = !q; continue; }
      if (ch === "," && !q) { out.push(cur.trim()); cur = ""; continue; }
      cur += ch;
    }
    out.push(cur.trim());
    return out;
  }
  function idx(headers, names) {
    for (var i = 0; i < names.length; i++) {
      var j = headers.indexOf(names[i]);
      if (j >= 0) return j;
    }
    return -1;
  }
  async function photoFromCell(raw) {
    if (!raw) return "";
    var v = String(raw).trim();
    if (!v) return "";
    // data URL already
    if (/^data:image\//i.test(v)) {
      try {
        // re-compress via image element if possible
        var blob = await (await fetch(v)).blob();
        var f = new File([blob], "p.jpg", { type: blob.type || "image/jpeg" });
        if (typeof compressPassportImage === "function") return await compressPassportImage(f, 480, 0.72);
        return v;
      } catch (_) { return v.length < 220000 ? v : ""; }
    }
    // http(s) URL
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
  var headers = splitCsv(lines[0]).map(function(h) { return h.toLowerCase().replace(/\./g, "").trim(); });
  var iName = idx(headers, ["name", "full name", "names of students", "student name"]);
  var iReg = idx(headers, ["regno", "reg no", "reg no", "registration number", "reg"]);
  var iProg = idx(headers, ["programme", "program", "department"]);
  var iLevel = idx(headers, ["level"]);
  var iHostel = idx(headers, ["hostel"]);
  var iGender = idx(headers, ["gender", "sex"]);
  var iPhone = idx(headers, ["phone", "mobile", "tel"]);
  var iPhoto = idx(headers, ["photo", "photo url", "photourl", "image", "image url", "passport", "passport url", "photo_url", "image_url"]);
  if (iName < 0) { alert("CSV must include a Name column."); return; }
  var added = 0, photos = 0, failedPhoto = 0;
  var existing = await getAll("students");
  var regSet = {};
  existing.forEach(function(s) { if (s.regNo) regSet[String(s.regNo).toLowerCase()] = true; });
  for (var r = 1; r < lines.length; r++) {
    var cols = splitCsv(lines[r]);
    var name = cols[iName];
    if (!name) continue;
    var regNo = iReg >= 0 ? (cols[iReg] || "") : "";
    if (regNo && regSet[String(regNo).toLowerCase()]) {
      continue; // skip duplicate reg
    }
    var photoDataUrl = "";
    if (iPhoto >= 0 && cols[iPhoto]) {
      photoDataUrl = await photoFromCell(cols[iPhoto]);
      if (photoDataUrl) photos++; else failedPhoto++;
    }
    var rec = {
      id: "stu_" + Date.now().toString(36) + r,
      name: name,
      regNo: regNo,
      programme: iProg >= 0 ? (cols[iProg] || "") : "",
      level: iLevel >= 0 ? (cols[iLevel] || "") : "",
      hostel: iHostel >= 0 ? (cols[iHostel] || "") : "",
      gender: iGender >= 0 ? (cols[iGender] || "") : "",
      phone: iPhone >= 0 ? (cols[iPhone] || "") : "",
      photoDataUrl: photoDataUrl,
      status: "Active",
      createdAt: new Date().toISOString()
    };
    if (photoDataUrl) rec.photoUpdatedAt = rec.createdAt;
    await put("students", rec);
    if (regNo) regSet[String(regNo).toLowerCase()] = true;
    added++;
  }
  await writeAudit({ action: "create", entity: "students", entityId: "csv_import", reason: "Imported " + added + " students from CSV (photos " + photos + ")" });
  markDirty("student import");
  await renderStudentsTable();
  alert("Imported " + added + " students" + (iPhoto >= 0 ? (" · passports loaded " + photos + (failedPhoto ? (" · photo failures " + failedPhoto) : "")) : "") + ". Publish when ready.");
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
  if (!isQaOfficer()) return;
  if (!confirm("Import snapshot? This overwrites local master data with the file contents. Publish afterwards to update the repository.")) return;
  var snap = JSON.parse(await file.text());
  async function replaceStore(name, rows) {
    var existing = await getAll(name);
    for (var i = 0; i < existing.length; i++) {
      var key = existing[i].id != null ? existing[i].id : (existing[i].code != null ? existing[i].code : existing[i].key);
      if (key != null) await del(name, key);
    }
    for (var j = 0; j < (rows || []).length; j++) await put(name, rows[j]);
  }
  if (snap.students) await replaceStore("students", snap.students.map(studentFromRepo));
  if (snap.lecturers) await replaceStore("lecturers", snap.lecturers);
  if (snap.sessions) await replaceStore("sessions", snap.sessions);
  if (snap.qa_entries) await replaceStore("qa_entries", snap.qa_entries);
  if (snap.programmes) await replaceStore("programmes", snap.programmes);
  if (snap.levels) await replaceStore("levels", snap.levels);
  if (snap.courses) await replaceStore("courses", snap.courses);
  if (snap.attendance) await replaceStore("attendance", snap.attendance);
  if (snap.hostel_runs) await replaceStore("hostel_runs", snap.hostel_runs);
  if (snap.remedial) await replaceStore("remedial", snap.remedial);
  if (snap.timetables) TIMETABLES_CACHE = snap.timetables;
  markDirty("snapshot import");
  await renderStudentsTable();
  refreshDashboardStats();
  alert("Snapshot loaded into this browser. Publish to repository to make it permanent.");
}




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

function reportAmendmentsHtml(rows) {
  if (!rows || !rows.length) {
    return "<h2 class='sec'>Master-list &amp; log amendments in this window</h2>" +
      "<p class='muted'>No audited edits to master data or lecture logs were recorded for this reporting window.</p>";
  }
  var body = rows.map(function(a, i) {
    var when = a.at || a.createdAt || a.date || "—";
    var ref = a.externalRef || a.ref || "—";
    var who = a.officer || a.by || "—";
    return "<tr><td>" + (i + 1) + "</td><td>" + escapeHtml(String(when).slice(0, 19).replace("T", " ")) +
      "</td><td>" + escapeHtml(String(a.action || "")) + "</td><td>" + escapeHtml(String(a.entity || "")) +
      "</td><td>" + escapeHtml(String(ref)) + "</td><td>" + escapeHtml(String(a.reason || a.details && a.details.reason || "—")) +
      "</td><td>" + escapeHtml(String(who)) + "</td></tr>";
  }).join("");
  return "<h2 class='sec'>Master-list &amp; log amendments in this window</h2>" +
    "<p style='font-size:11px;color:#64748b'>Any create / update / delete on master lists or lecture logs that falls inside the report period is listed automatically from the audit trail. Official REF numbers appear when officers supplied them.</p>" +
    "<table class='data'><thead><tr><th>#</th><th>When</th><th>Action</th><th>Entity</th><th>REF</th><th>Reason</th><th>Officer</th></tr></thead><tbody>" +
    body + "</tbody></table>";
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

  var scheduleRows = slots.map(function(s, i) {
    return "<tr><td style='text-align:center'>" + (i + 1) + "</td><td>" + escapeHtml(s.title || s.course || "") +
      "</td><td>" + escapeHtml(s.code || s.courseCode || "") + "</td><td>" + escapeHtml(formatTimeNice(s.start)) +
      "</td><td>" + escapeHtml(formatTimeNice(s.end)) + "</td><td>" + escapeHtml(s.remark || "") + "</td></tr>";
  }).join("");
  if (!scheduleRows && entries.length) {
    scheduleRows = entries.map(function(e, i) {
      return "<tr><td style='text-align:center'>" + (i + 1) + "</td><td>" + escapeHtml(e.course || "") +
        "</td><td></td><td>" + escapeHtml(formatTimeNice(e.start)) + "</td><td>" + escapeHtml(formatTimeNice(e.end)) +
        "</td><td>" + escapeHtml(e.status || "") + "</td></tr>";
    }).join("");
  }

  var body = reportLetterheadHtml("Today's Lecture(s) Report", dept, period);
  body += "<h2 class='sec'>Course Schedule / Timetable</h2>";
  body += "<table class='data'><thead><tr><th>S/N</th><th>Course Title</th><th>Code</th><th>Start</th><th>End</th><th>Remark</th></tr></thead><tbody>" +
    (scheduleRows || "<tr><td colspan='6' class='muted'>No timetable slots for this weekday.</td></tr>") + "</tbody></table>";

  var allAbsentMap = {};
  var courseBlocks = "";
  var heldEntries = entries.filter(function(e) {
    var st = String(e.status || "").toLowerCase();
    return st === "held" || st === "partial" || st === "delivered" || !st;
  });
  if (!heldEntries.length) heldEntries = entries.slice();

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
    var stColor = st.indexOf("Fully Delivered") >= 0 ? "#1B7A3D" : st.indexOf("Missed") >= 0 ? "#B91C1C" : st.indexOf("Partial") >= 0 ? "#B8860B" : st.indexOf("Over") >= 0 ? "#1d4ed8" : "#64748b";
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
  body += reportAmendmentsHtml(amendments);
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
  body += reportAmendmentsHtml(amendments);
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
  body += reportAmendmentsHtml(amendments);
  openReportWindow("EOCNS Remedial Weekly — " + period, body, meta.officer, meta.format);
}


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
  body += reportAmendmentsHtml(amendments);
  openReportWindow("EOCNS Remedial Summary — " + period, body, meta.officer, meta.format);
}


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

async function buildStudentFullRecord(id) {
  var all = await getAll("students");
  var s = all.find(function(x) { return x.id === id; });
  if (!s) return null;
  var qa = await getAll("qa_entries");
  var absents = [];
  qa.forEach(function(e) {
    var hit = false;
    if (Array.isArray(e.absentDetails)) {
      hit = e.absentDetails.some(function(d) { return d.id === s.id || d.regNo === s.regNo || (d.name && d.name === s.name); });
    }
    if (!hit && Array.isArray(e.absent)) {
      hit = e.absent.some(function(a) {
        var t = String(a).toLowerCase();
        return (s.name && t.indexOf(s.name.toLowerCase()) >= 0) || (s.regNo && t.indexOf(String(s.regNo).toLowerCase()) >= 0);
      });
    }
    if (hit) absents.push(e);
  });
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
  var audit = [];
  try {
    audit = (await getAll("audit")).filter(function(a) {
      return a.entityId === s.id || (a.details && (a.details.regNo === s.regNo || a.details.name === s.name));
    }).slice(0, 40);
  } catch (_) {}
  return { student: s, absents: absents, remedial: rem, discipline: disc, audit: audit };
}

async function openStudentFullRecord(id) {
  id = id || window.__profileStudentId;
  if (!id) return;
  var data = await buildStudentFullRecord(id);
  if (!data) return;
  var s = data.student;
  document.getElementById("studentFullRecordTitle").textContent = "Full record — " + (s.name || "");
  var photo = s.photoDataUrl
    ? '<div class="passport-frame" style="margin-bottom:12px"><img src="' + s.photoDataUrl + '" alt="" /></div>'
    : "";
  function listBlock(title, items, rowFn) {
    if (!items.length) return '<div class="record-section"><h4>' + title + '</h4><p class="muted-note">None on file</p></div>';
    return '<div class="record-section"><h4>' + title + " (" + items.length + ")</h4><ul style=\"padding-left:18px;margin:0\">" +
      items.map(rowFn).join("") + "</ul></div>";
  }
  var body = document.getElementById("studentFullRecordBody");
  body.innerHTML = photo +
    "<p><strong>" + escapeHtml(s.name) + "</strong> · " + escapeHtml(s.regNo || "—") + " · " +
    escapeHtml(s.programme || "") + " " + escapeHtml(String(s.level || "")) + " · Hostel: " + escapeHtml(s.hostel || "—") + "</p>" +
    listBlock("Lecture absences (from QA logs)", data.absents, function(e) {
      return "<li>" + escapeHtml(e.date || "") + " · " + escapeHtml(e.course || "") + " · " + escapeHtml(e.status || "") + "</li>";
    }) +
    listBlock("Remedial enrolment", data.remedial, function(r) {
      return "<li>" + escapeHtml((r.courses || r.courseCodes || []).join(", ") || "enrolled") +
        (r.sessionName ? " · " + escapeHtml(r.sessionName) : "") + "</li>";
    }) +
    listBlock("Disciplinary cases", data.discipline, function(d) {
      return "<li>" + escapeHtml(d.date || "") + " · " + escapeHtml(d.type || "") + " · " +
        escapeHtml(d.status || "") + " · " + escapeHtml(d.ref || "") + "</li>";
    }) +
    listBlock("Recent audit touches", data.audit, function(a) {
      return "<li>" + escapeHtml(a.at || a.createdAt || "") + " · " + escapeHtml(a.action || "") + " · " +
        escapeHtml(a.reason || "") + "</li>";
    });
  window.__fullRecordStudentId = id;
  var m = document.getElementById("studentFullRecordModal");
  if (m) { m.hidden = false; m.removeAttribute("hidden"); m.style.display = ""; }
}

function closeStudentFullRecord() {
  var m = document.getElementById("studentFullRecordModal");
  if (!m) return;
  m.hidden = true; m.setAttribute("hidden", ""); m.style.display = "none";
}

async function printStudentSummary() {
  var id = window.__fullRecordStudentId || window.__profileStudentId;
  if (!id) return;
  var data = await buildStudentFullRecord(id);
  if (!data) return;
  var s = data.student;
  var w = window.open("", "_blank");
  if (!w) return;
  var photo = s.photoDataUrl ? '<img src="' + s.photoDataUrl + '" style="width:90px;height:110px;object-fit:cover;border:1px solid #ccc"/>' : "";
  w.document.write("<!DOCTYPE html><html><head><title>Student summary</title><style>body{font-family:Georgia,serif;padding:24px;color:#0f172a}h1{color:#0d9488;font-size:1.3rem}table{border-collapse:collapse;width:100%;font-size:0.9rem}td,th{border:1px solid #cbd5e1;padding:6px;text-align:left}.muted{color:#64748b;font-size:0.85rem}</style></head><body>" +
    "<h1>EOCNS — Student Affairs summary</h1>" +
    (ACTIVE_SESSION ? "<p class=\"muted\">Session: " + escapeHtml(ACTIVE_SESSION.name) + semesterSuffixHtml() + "</p>" : "") +
    "<div style=\"display:flex;gap:16px\">" + photo + "<div><p><strong>" + escapeHtml(s.name) + "</strong></p>" +
    "<p>Reg: " + escapeHtml(s.regNo || "—") + "<br/>" + escapeHtml(s.programme || "") + " · Level " + escapeHtml(String(s.level || "")) +
    "<br/>Hostel: " + escapeHtml(s.hostel || "—") + "</p></div></div>" +
    "<h3>Disciplinary cases</h3><table><thead><tr><th>Date</th><th>Type</th><th>Status</th><th>REF</th></tr></thead><tbody>" +
    (data.discipline.length ? data.discipline.map(function(d) {
      return "<tr><td>" + escapeHtml(d.date||"") + "</td><td>" + escapeHtml(d.type||"") + "</td><td>" + escapeHtml(d.status||"") + "</td><td>" + escapeHtml(d.ref||"") + "</td></tr>";
    }).join("") : "<tr><td colspan=4>None on file</td></tr>") +
    "</tbody></table>" +
    "<h3>Lecture absences logged</h3><p class=\"muted\">" + data.absents.length + " linked QA absence mark(s)</p>" +
    "<p class=\"muted\">Generated " + new Date().toLocaleString() + " · Officer system summary</p></body></html>");
  w.document.close();
  setTimeout(function() { w.print(); }, 300);
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

async function buildStudentFullRecord(id) {
  var all = await getAll("students");
  var s = all.find(function(x) { return x.id === id; });
  if (!s) return null;
  var qa = await getAll("qa_entries");
  var absents = [];
  qa.forEach(function(e) {
    var hit = false;
    if (Array.isArray(e.absentDetails)) {
      hit = e.absentDetails.some(function(d) { return d.id === s.id || d.regNo === s.regNo || (d.name && d.name === s.name); });
    }
    if (!hit && Array.isArray(e.absent)) {
      hit = e.absent.some(function(a) {
        var t = String(a).toLowerCase();
        return (s.name && t.indexOf(s.name.toLowerCase()) >= 0) || (s.regNo && t.indexOf(String(s.regNo).toLowerCase()) >= 0);
      });
    }
    if (hit) absents.push(e);
  });
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
  var audit = [];
  try {
    audit = (await getAll("audit")).filter(function(a) {
      return a.entityId === s.id || (a.details && (a.details.regNo === s.regNo || a.details.name === s.name));
    }).slice(0, 40);
  } catch (_) {}
  return { student: s, absents: absents, remedial: rem, discipline: disc, audit: audit };
}

async function openStudentFullRecord(id) {
  id = id || window.__profileStudentId;
  if (!id) return;
  var data = await buildStudentFullRecord(id);
  if (!data) return;
  var s = data.student;
  document.getElementById("studentFullRecordTitle").textContent = "Full record — " + (s.name || "");
  var photo = s.photoDataUrl
    ? '<div class="passport-frame" style="margin-bottom:12px"><img src="' + s.photoDataUrl + '" alt="" /></div>'
    : "";
  function listBlock(title, items, rowFn) {
    if (!items.length) return '<div class="record-section"><h4>' + title + '</h4><p class="muted-note">None on file</p></div>';
    return '<div class="record-section"><h4>' + title + " (" + items.length + ")</h4><ul style=\"padding-left:18px;margin:0\">" +
      items.map(rowFn).join("") + "</ul></div>";
  }
  var body = document.getElementById("studentFullRecordBody");
  body.innerHTML = photo +
    "<p><strong>" + escapeHtml(s.name) + "</strong> · " + escapeHtml(s.regNo || "—") + " · " +
    escapeHtml(s.programme || "") + " " + escapeHtml(String(s.level || "")) + " · Hostel: " + escapeHtml(s.hostel || "—") + "</p>" +
    listBlock("Lecture absences (from QA logs)", data.absents, function(e) {
      return "<li>" + escapeHtml(e.date || "") + " · " + escapeHtml(e.course || "") + " · " + escapeHtml(e.status || "") + "</li>";
    }) +
    listBlock("Remedial enrolment", data.remedial, function(r) {
      return "<li>" + escapeHtml((r.courses || r.courseCodes || []).join(", ") || "enrolled") +
        (r.sessionName ? " · " + escapeHtml(r.sessionName) : "") + "</li>";
    }) +
    listBlock("Disciplinary cases", data.discipline, function(d) {
      return "<li>" + escapeHtml(d.date || "") + " · " + escapeHtml(d.type || "") + " · " +
        escapeHtml(d.status || "") + " · " + escapeHtml(d.ref || "") + "</li>";
    }) +
    listBlock("Recent audit touches", data.audit, function(a) {
      return "<li>" + escapeHtml(a.at || a.createdAt || "") + " · " + escapeHtml(a.action || "") + " · " +
        escapeHtml(a.reason || "") + "</li>";
    });
  window.__fullRecordStudentId = id;
  var m = document.getElementById("studentFullRecordModal");
  if (m) { m.hidden = false; m.removeAttribute("hidden"); m.style.display = ""; }
}

function closeStudentFullRecord() {
  var m = document.getElementById("studentFullRecordModal");
  if (!m) return;
  m.hidden = true; m.setAttribute("hidden", ""); m.style.display = "none";
}

async function printStudentSummary() {
  var id = window.__fullRecordStudentId || window.__profileStudentId;
  if (!id) return;
  var data = await buildStudentFullRecord(id);
  if (!data) return;
  var s = data.student;
  var w = window.open("", "_blank");
  if (!w) return;
  var photo = s.photoDataUrl ? '<img src="' + s.photoDataUrl + '" style="width:90px;height:110px;object-fit:cover;border:1px solid #ccc"/>' : "";
  w.document.write("<!DOCTYPE html><html><head><title>Student summary</title><style>body{font-family:Georgia,serif;padding:24px;color:#0f172a}h1{color:#0d9488;font-size:1.3rem}table{border-collapse:collapse;width:100%;font-size:0.9rem}td,th{border:1px solid #cbd5e1;padding:6px;text-align:left}.muted{color:#64748b;font-size:0.85rem}</style></head><body>" +
    "<h1>EOCNS — Student Affairs summary</h1>" +
    (ACTIVE_SESSION ? "<p class=\"muted\">Session: " + escapeHtml(ACTIVE_SESSION.name) + semesterSuffixHtml() + "</p>" : "") +
    "<div style=\"display:flex;gap:16px\">" + photo + "<div><p><strong>" + escapeHtml(s.name) + "</strong></p>" +
    "<p>Reg: " + escapeHtml(s.regNo || "—") + "<br/>" + escapeHtml(s.programme || "") + " · Level " + escapeHtml(String(s.level || "")) +
    "<br/>Hostel: " + escapeHtml(s.hostel || "—") + "</p></div></div>" +
    "<h3>Disciplinary cases</h3><table><thead><tr><th>Date</th><th>Type</th><th>Status</th><th>REF</th></tr></thead><tbody>" +
    (data.discipline.length ? data.discipline.map(function(d) {
      return "<tr><td>" + escapeHtml(d.date||"") + "</td><td>" + escapeHtml(d.type||"") + "</td><td>" + escapeHtml(d.status||"") + "</td><td>" + escapeHtml(d.ref||"") + "</td></tr>";
    }).join("") : "<tr><td colspan=4>None on file</td></tr>") +
    "</tbody></table>" +
    "<h3>Lecture absences logged</h3><p class=\"muted\">" + data.absents.length + " linked QA absence mark(s)</p>" +
    "<p class=\"muted\">Generated " + new Date().toLocaleString() + " · Officer system summary</p></body></html>");
  w.document.close();
  setTimeout(function() { w.print(); }, 300);
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
    if (typeof window.printWeeklyProfessionalPack === "function") window.printWeeklyProfessionalPack();
    else if (typeof window.printWeeklyProfessionalPack === "function") printWeeklyProfessionalPack();
    else alert("Weekly report is still loading. Build the week first, then hard-refresh if needed.");
  });
  document.getElementById("btnPrintMonthlyQa") && document.getElementById("btnPrintMonthlyQa").addEventListener("click", function() {
    if (typeof window.printMonthlyProfessionalPack === "function") window.printMonthlyProfessionalPack();
    else if (typeof window.printMonthlyProfessionalPack === "function") printMonthlyProfessionalPack();
    else alert("Monthly report is still loading. Build the month first, then hard-refresh if needed.");
  });

  document.getElementById("btnGenerateStudentRegister")?.addEventListener("click", function() { generateStudentRegisterReport(); });
  document.getElementById("btnGenerateHostelReportDash")?.addEventListener("click", function() { generateHostelDistributionReport(); });
  document.getElementById("btnGenerateHostelReport")?.addEventListener("click", function() { generateHostelDistributionReport(); });

  
  // Report API on window — assignments happen next to each function definition; this only wires clicks safely
  try { /* report functions attach themselves to window when defined */ } catch (bindRepErr) { console.warn("report bind", bindRepErr); }

document.getElementById("btnPrintDailyReport") && document.getElementById("btnPrintDailyReport").addEventListener("click", function() {
    if (typeof window.printDailyLectureReport === "function") window.printDailyLectureReport();
    else if (typeof window.printDailyLectureReport === "function") printDailyLectureReport();
    else alert("Daily report is still loading. Hard-refresh the page.");
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
  document.getElementById("btnPrintFullQaPack") && document.getElementById("btnPrintFullQaPack").addEventListener("click", printFullQaPack);
  document.getElementById("btnExportSnapshot") && document.getElementById("btnExportSnapshot").addEventListener("click", exportFullSnapshot);
  document.getElementById("btnImportSnapshot") && document.getElementById("btnImportSnapshot").addEventListener("click", function() {
    document.getElementById("snapshotFileInput") && document.getElementById("snapshotFileInput").click();
  });
  document.getElementById("snapshotFileInput") && document.getElementById("snapshotFileInput").addEventListener("change", function(e) {
    if (e.target.files && e.target.files[0]) importFullSnapshot(e.target.files[0]);
    e.target.value = "";
  });
  document.getElementById("btnImportStudentsCsv") && document.getElementById("btnImportStudentsCsv").addEventListener("click", function() {
    document.getElementById("studentsCsvInput") && document.getElementById("studentsCsvInput").click();
  });
  document.getElementById("studentsCsvInput") && document.getElementById("studentsCsvInput").addEventListener("change", function(e) {
    if (e.target.files && e.target.files[0]) importStudentsCsv(e.target.files[0]);
    e.target.value = "";
  });
  document.getElementById("btnRefreshHostelRoster") && document.getElementById("btnRefreshHostelRoster").addEventListener("click", renderHostelRoster);
  document.getElementById("hostelRosterFilter") && document.getElementById("hostelRosterFilter").addEventListener("change", renderHostelRoster);
  document.getElementById("hostelRosterProgramme") && document.getElementById("hostelRosterProgramme").addEventListener("change", renderHostelRoster);
  document.getElementById("hostelRosterLevel") && document.getElementById("hostelRosterLevel").addEventListener("change", renderHostelRoster);
  document.getElementById("btnRenderTtBoard") && document.getElementById("btnRenderTtBoard").addEventListener("click", renderTimetableBoard);
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

function setQaOfficer(on) {
  try {
    if (on) sessionStorage.setItem(QA_PIN_KEY, "1");
    else sessionStorage.removeItem(QA_PIN_KEY);
  } catch (_) {}
  document.body.classList.toggle("role-officer", !!on);
  document.body.classList.toggle("role-viewer", !on);
  updateQaOfficerUI();
  try { renderAuditLog(); } catch (_) {}
}

function updateQaOfficerUI() {
  const loggedIn = isQaOfficer();
  const out = document.getElementById("qaAuthLoggedOut");
  const inn = document.getElementById("qaAuthLoggedIn");
  if (out) out.hidden = loggedIn;
  if (inn) inn.hidden = !loggedIn;
  var vb = document.getElementById("viewerModeBanner");
  if (vb) vb.hidden = !!loggedIn;
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
  document.getElementById("btnQaLogin")?.addEventListener("click", () => {
    const pin = (document.getElementById("qaPinInput")?.value || "").trim();
    const err = document.getElementById("qaAuthError");
    if (pin === (APP_CONFIG.qaPin || "EOCNS-QA")) {
      setQaOfficer(true);
      if (err) err.hidden = true;
      if (document.getElementById("qaPinInput")) document.getElementById("qaPinInput").value = "";
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
  document.getElementById("btnExportStudents")?.addEventListener("click", exportFullSnapshot);
  document.getElementById("btnPublishAll")?.addEventListener("click", () => {
    if (!isQaOfficer()) return;
    const panel = document.getElementById("qaTokenPanel");
    if (panel) panel.hidden = false;
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
  ["hostel_runs", "hostel_runs"], ["remedial", "remedial"], ["remedial_enrolment", "remedial_enrolment"],
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
async function syncFromRepoIfClean() {
  // Repo is the source of truth on every clean load (all devices stay consistent).
  var metaRows = await getAll("meta"), m = {};
  metaRows.forEach(function(r) { m[r.key] = r.value; });
  if (m.dirty === true || EOCNS_DIRTY) {
    EOCNS_DIRTY = true;
    var b = document.getElementById("dirtyBanner");
    if (b) {
      b.hidden = false;
      b.textContent = "This browser has unpublished changes — repository data was NOT loaded over them. Publish (Settings) or use Reload all data from repository to discard.";
    }
    return { skipped: "unpublished changes" };
  }
  // Always pull every store from the repository so Device B sees Device A publishes.
  var changed = [];
  var failed = [];
  for (var i = 0; i < SYNC_STORES.length; i++) {
    var store = SYNC_STORES[i][0], path = DATA_FILES[SYNC_STORES[i][1]];
    if (!path) continue;
    try {
      var text = await fetchRepoText(path);
      var rows = JSON.parse(text);
      if (!Array.isArray(rows)) throw new Error("not a list");
      await replaceStoreFromRepoRows(store, rows);
      await put("meta", { key: "repoFp:" + store, value: textFingerprint(text) });
      changed.push(store);
    } catch (e) {
      console.warn("repo sync", store, e);
      failed.push(store);
    }
  }
  try {
    var meta = await fetchRepoJson(DATA_FILES.remedial_meta);
    if (meta) await put("remedial_meta", { key: "main", value: meta });
  } catch (_) {}
  try {
    var rtt = await fetchRepoJson(DATA_FILES.remedial_timetable);
    if (rtt) await put("remedial_timetable", { key: "main", value: rtt });
  } catch (_) {}
  try {
    TIMETABLES_CACHE = await fetchRepoJson(DATA_FILES.timetables);
  } catch (_) {}
  try {
    APP_CONFIG = await fetchRepoJson(DATA_FILES.config);
  } catch (_) {}
  clearDirty();
  await refreshCachesAfterSync();
  var banner = document.getElementById("masterLoadBanner");
  if (banner) {
    banner.hidden = false;
    banner.textContent = "Loaded from repository (" + changed.length + " data sets)" +
      (failed.length ? ". Could not load: " + failed.join(", ") : ".") +
      " Data is consistent with the published master.";
    setTimeout(function() { banner.hidden = true; }, 10000);
  }
  return { changed: changed, failed: failed };
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

async function publishAllToRepo() {
  if (!isQaOfficer()) return;
  var pin = (document.getElementById("qaPublishPin") && document.getElementById("qaPublishPin").value || "").trim();
  var status = document.getElementById("qaPublishStatus");
  if (!pin || pin !== (APP_CONFIG.qaPin || "EOCNS-QA")) {
    if (status) status.textContent = "Incorrect officer PIN.";
    return;
  }
  try {
    APP_CONFIG = await fetchRepoJson(DATA_FILES.config + "?t=" + Date.now());
  } catch (_) {}
  var workerUrl = (APP_CONFIG && APP_CONFIG.publishWorkerUrl || "").trim();
  if (!workerUrl) {
    if (status) status.textContent = "Set publishWorkerUrl in data/config.json to your Cloudflare Worker URL, then reload.";
    return;
  }
  if (status) status.textContent = "Sending data to publish worker…";
  try {
    var students = shapeStudentsForRepo(await getAll("students"));
    var files = {};
    files[DATA_FILES.students] = JSON.stringify(students, null, 2);
    files[DATA_FILES.lecturers] = JSON.stringify(await getAll("lecturers"), null, 2);
    files[DATA_FILES.sessions] = JSON.stringify(await getAll("sessions"), null, 2);
    files[DATA_FILES.qa_entries] = JSON.stringify(await getAll("qa_entries"), null, 2);
    files[DATA_FILES.audit] = JSON.stringify(await getAll("audit"), null, 2);
    try { files[DATA_FILES.discipline] = JSON.stringify(await getAll("discipline"), null, 2); } catch (_) {}
    try { files[DATA_FILES.pending_students] = JSON.stringify(await getAll("pending_students"), null, 2); } catch (_) {}
    files[DATA_FILES.programmes] = JSON.stringify(await getAll("programmes"), null, 2);
    files[DATA_FILES.levels] = JSON.stringify(await getAll("levels"), null, 2);
    files[DATA_FILES.courses] = JSON.stringify(await getAll("courses"), null, 2);
    if (TIMETABLES_CACHE) files[DATA_FILES.timetables] = JSON.stringify(TIMETABLES_CACHE, null, 2);
    files[DATA_FILES.attendance] = JSON.stringify(await getAll("attendance"), null, 2);
    files[DATA_FILES.hostel_runs] = JSON.stringify(await getAll("hostel_runs"), null, 2);
    files[DATA_FILES.remedial] = JSON.stringify(await getAll("remedial"), null, 2);
    files[DATA_FILES.remedial_enrolment] = JSON.stringify(await getAll("remedial_enrolment"), null, 2);
    files[DATA_FILES.remedial_assignments] = JSON.stringify(await getAll("remedial_assignments"), null, 2);
    files[DATA_FILES.remedial_logs] = JSON.stringify(await getAll("remedial_logs"), null, 2);
    try {
      var rm = await getAll("remedial_meta");
      var metaVal = (rm[0] && rm[0].value) || { sessionId: "", programmes: [], levels: [] };
      files[DATA_FILES.remedial_meta] = JSON.stringify(metaVal, null, 2);
    } catch (_) {}
    try {
      var rt = await getAll("remedial_timetable");
      var ttVal = (rt[0] && rt[0].value) || { slots: [] };
      files[DATA_FILES.remedial_timetable] = JSON.stringify(ttVal, null, 2);
    } catch (_) {}

    var key = (APP_CONFIG.publishWorkerKey || "").trim();
    var headers = { "Content-Type": "application/json" };
    if (key) headers["X-EOCNS-Key"] = key;

    var res = await fetch(workerUrl.replace(/\/$/, ""), {
      method: "POST",
      headers: headers,
      body: JSON.stringify({
        message: "Update master data via EOCNS QA System",
        publishKey: key,
        files: files
      })
    });
    var body = {};
    try { body = await res.json(); } catch (_) {}
    if (!res.ok) {
      var msg = body.error || ("Worker HTTP " + res.status);
      if (res.status === 401) {
        msg += " — On your PC run: cd cloudflare-worker && npx wrangler secret put PUBLISH_KEY  (use exactly the publishWorkerKey from data/config.json), then npx wrangler deploy";
      }
      throw new Error(msg);
    }
    EOCNS_DIRTY = false;
    clearDirty();
    try { await put("meta", { key: "dirty", value: false }); } catch (_) {}
    try { await put("meta", { key: "lastPublishAt", value: new Date().toISOString() }); } catch (_) {}
    if (status) status.textContent = "Published via worker: " + ((body.updated && body.updated.join(", ")) || "ok") + ". Clearing local cache and reloading from repository…";
    // After successful publish: wipe local operational stores and re-read from repo
    // so this browser matches GitHub Pages (Device B sees the same after load/refresh).
    try {
      for (var si = 0; si < SYNC_STORES.length; si++) {
        try { await clearStore(SYNC_STORES[si][0]); } catch (_) {}
      }
      try {
        var metaAll = await getAll("meta");
        for (var mi = 0; mi < metaAll.length; mi++) {
          var mk = metaAll[mi] && metaAll[mi].key;
          if (mk && (String(mk).indexOf("repoFp:") === 0 || mk === "dirty")) {
            try { await del("meta", mk); } catch (_) {}
          }
        }
        await put("meta", { key: "dirty", value: false });
      } catch (_) {}
      TIMETABLES_CACHE = null;
      try { PROGRAMMES_CACHE = null; LEVELS_CACHE = null; } catch (_) {}
      await new Promise(function(r) { setTimeout(r, 3000); });
      var syncOk = false;
      try {
        await syncFromRepoIfClean();
        syncOk = true;
      } catch (e1) {
        console.warn("post-publish sync attempt 1", e1);
        await new Promise(function(r) { setTimeout(r, 2000); });
        try {
          await syncFromRepoIfClean();
          syncOk = true;
        } catch (e2) {
          console.warn("post-publish sync attempt 2", e2);
        }
      }
      if (status) {
        status.textContent = syncOk
          ? "Published and local cache refreshed from repository. Other devices will see this after they load/refresh the site."
          : "Published OK. If lists look empty, hard-refresh this page (GitHub Pages may still be updating).";
      }
    } catch (postErr) {
      console.warn("post-publish reload", postErr);
      if (status) status.textContent = "Published OK, but local reload had an issue: " + (postErr.message || postErr) + ". Hard-refresh this page.";
    }
    var panel = document.getElementById("qaTokenPanel");
    if (panel) panel.hidden = true;
    if (document.getElementById("qaPublishPin")) document.getElementById("qaPublishPin").value = "";
  } catch (err) {
    console.error("publish error", err);
    var msg = (err && err.message) ? err.message : String(err || "unknown");
    var note = "";
    if (/Unauthorized|401|PUBLISH_KEY/i.test(msg)) {
      note = " Cause: publishWorkerKey in data/config.json does not match the Worker secret PUBLISH_KEY (or secret is empty/wrong). Fix: wrangler secret put PUBLISH_KEY with the exact config value, then wrangler deploy.";
    } else if (/Failed to fetch|NetworkError|CORS|Load failed/i.test(msg)) {
      note = " Cause: browser could not reach the Worker URL (wrong publishWorkerUrl, offline, or CORS). Check data/config.json publishWorkerUrl and that the worker is deployed.";
    } else if (/GITHUB_TOKEN|not configured/i.test(msg)) {
      note = " Cause: Worker has no GITHUB_TOKEN secret. Run: npx wrangler secret put GITHUB_TOKEN";
    } else if (/403|404|Contents/i.test(msg)) {
      note = " Cause: GitHub rejected the commit (token scope, repo name, or branch). Token needs Contents Read and write on travis-global/qa_attendance.";
    } else if (/Path not allowed/i.test(msg)) {
      note = " Cause: Worker allow-list is outdated. Pull latest cloudflare-worker and run npx wrangler deploy.";
    } else if (/Incorrect officer PIN/i.test(msg)) {
      note = " Cause: PIN does not match data/config.json qaPin.";
    } else {
      note = " See browser console (F12) for full detail.";
    }
    if (status) status.textContent = "Publish failed: " + msg + note;
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
  // sort by name
  list.sort(function(a, b) { return String(a.name || "").localeCompare(String(b.name || "")); });
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
    return "<tr><td class=\"att-sn\">" + (i + 1) + "</td><td class=\"att-name\">" + escapeHtml(s.name) + "</td>" + cells + "</tr>";
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


async function renderHostelRoster() {
  await loadStudents();
  await fillProgrammeLevelSelects();
  // map roster selects
  var pf = document.getElementById("hostelRosterProgramme");
  var lf = document.getElementById("hostelRosterLevel");
  if (pf && pf.options.length <= 1) {
    var ap = document.getElementById("attProgramme");
    if (ap) pf.innerHTML = ap.innerHTML;
  }
  if (lf && lf.options.length <= 1) {
    var al = document.getElementById("attLevel");
    if (al) lf.innerHTML = al.innerHTML;
  }
  var hostelF = (document.getElementById("hostelRosterFilter") && document.getElementById("hostelRosterFilter").value) || "";
  var prog = (pf && pf.value) || "";
  var level = (lf && lf.value) || "";
  var list = studentsCache.filter(function(s) {
    if (s.status && s.status !== "Active") return false;
    if (prog && String(s.programme || "") !== prog) return false;
    if (level && String(s.level || "") !== String(level)) return false;
    var h = (s.hostel || "").trim();
    if (hostelF === "__unset") return !h;
    if (hostelF) return h === hostelF;
    return true;
  }).sort(function(a, b) { return String(a.name).localeCompare(String(b.name)); });
  var body = document.getElementById("hostelRosterBody");
  if (!body) return;
  body.innerHTML = list.length ? list.map(function(s) {
    return "<tr><td>" + escapeHtml(s.name) + "</td><td>" + escapeHtml(s.regNo || "") + "</td><td>" + escapeHtml(s.programme || "") +
      "</td><td>" + escapeHtml(String(s.level || "")) + "</td><td><strong>" + escapeHtml(s.hostel || "—") + "</strong></td></tr>";
  }).join("") : "<tr><td colspan=\"5\">No students match.</td></tr>";
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
    'Hostel labels are taken from the <em>student master list</em> (not the biometric machine), so mixed Location IDs do not mis-assign students.</p>' +
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
    formatNairaHostel(totalFine) + "</strong>. Hostel placement is resolved exclusively from the college student master register so that biometric Location ID errors cannot mis-assign a resident to the wrong hostel. Historical published runs remain unchanged if a student is later moved between hostels.</p>" +
    "<div class=\"kpi\"><div><strong>" + absentees.length + "</strong>Absentees</div>" +
    "<div><strong>" + formatNairaHostel(totalFine) + "</strong>Total due</div>" +
    "<div><strong>" + formatNairaHostel(rate) + "</strong>Daily rate</div></div>" +
    "<h2>2. Distribution</h2>" +
    "<div style=\"display:flex;gap:24px;flex-wrap:wrap;align-items:center\">" + svgPie(pieSlices, 160) + svgBars(barItems, 300, 140) + "</div>" +
    "<h2>3. Student liability schedule</h2>" +
    "<table><thead><tr><th>#</th><th>Name</th><th>Reg. No</th><th>Hostel (master)</th><th>Days</th><th>Amount</th></tr></thead><tbody>" +
    rows + "</tbody></table>" +
    "<h2>4. Certification</h2>" +
    "<p class=\"narrative\">Prepared via the EOCNS QA Attendance System. Machine Location ID was not used for hostel classification.</p>" +
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

async function importStudentsCsv(file) {
  if (!isQaOfficer()) return;
  var text = await file.text();
  var lines = text.split(/\r?\n/).filter(function(l) { return l.trim(); });
  if (lines.length < 2) { alert("CSV needs a header row and data."); return; }
  function splitCsv(line) {
    var out = [], cur = "", q = false;
    for (var i = 0; i < line.length; i++) {
      var ch = line[i];
      if (ch === '"') { q = !q; continue; }
      if (ch === "," && !q) { out.push(cur.trim()); cur = ""; continue; }
      cur += ch;
    }
    out.push(cur.trim());
    return out;
  }
  var headers = splitCsv(lines[0]).map(function(h) { return h.toLowerCase(); });
  var idx = function(names) {
    for (var i = 0; i < names.length; i++) {
      var j = headers.indexOf(names[i]);
      if (j >= 0) return j;
    }
    return -1;
  };
  var iName = idx(["name", "full name", "names of students", "student name"]);
  var iReg = idx(["regno", "reg no", "reg. no", "registration number", "reg"]);
  var iProg = idx(["programme", "program", "department"]);
  var iLevel = idx(["level"]);
  var iHostel = idx(["hostel"]);
  if (iName < 0) { alert("CSV must include a Name column."); return; }
  var added = 0;
  for (var r = 1; r < lines.length; r++) {
    var cols = splitCsv(lines[r]);
    var name = cols[iName];
    if (!name) continue;
    var rec = {
      id: "stu_" + Date.now().toString(36) + r,
      name: name,
      regNo: iReg >= 0 ? (cols[iReg] || "") : "",
      programme: iProg >= 0 ? (cols[iProg] || "") : "",
      level: iLevel >= 0 ? (cols[iLevel] || "") : "",
      hostel: iHostel >= 0 ? (cols[iHostel] || "") : "",
      status: "Active",
      gender: "",
      phone: "",
      createdAt: new Date().toISOString()
    };
    await put("students", rec);
    added++;
  }
  await writeAudit({ action: "create", entity: "students", entityId: "csv_import", reason: "Imported " + added + " students from CSV" });
  markDirty("student import");
  await renderStudentsTable();
  alert("Imported " + added + " students. Publish when ready.");
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
  if (!isQaOfficer()) return;
  if (!confirm("Import snapshot? This overwrites local master data with the file contents. Publish afterwards to update the repository.")) return;
  var snap = JSON.parse(await file.text());
  async function replaceStore(name, rows) {
    var existing = await getAll(name);
    for (var i = 0; i < existing.length; i++) {
      var key = existing[i].id != null ? existing[i].id : (existing[i].code != null ? existing[i].code : existing[i].key);
      if (key != null) await del(name, key);
    }
    for (var j = 0; j < (rows || []).length; j++) await put(name, rows[j]);
  }
  if (snap.students) await replaceStore("students", snap.students.map(studentFromRepo));
  if (snap.lecturers) await replaceStore("lecturers", snap.lecturers);
  if (snap.sessions) await replaceStore("sessions", snap.sessions);
  if (snap.qa_entries) await replaceStore("qa_entries", snap.qa_entries);
  if (snap.programmes) await replaceStore("programmes", snap.programmes);
  if (snap.levels) await replaceStore("levels", snap.levels);
  if (snap.courses) await replaceStore("courses", snap.courses);
  if (snap.attendance) await replaceStore("attendance", snap.attendance);
  if (snap.hostel_runs) await replaceStore("hostel_runs", snap.hostel_runs);
  if (snap.remedial) await replaceStore("remedial", snap.remedial);
  if (snap.timetables) TIMETABLES_CACHE = snap.timetables;
  markDirty("snapshot import");
  await renderStudentsTable();
  refreshDashboardStats();
  alert("Snapshot loaded into this browser. Publish to repository to make it permanent.");
}




/* eocnsReportStyles defined once above */


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


/* printDailyLectureReport defined once */



/* printWeeklyProfessionalPack defined once */



/* printMonthlyProfessionalPack defined once */



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
    (lecturersCache || []).filter(function(l) { return !l.status || l.status === "Active"; }).forEach(function(l) {
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


/* printRemWeeklyPack once */


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


/* printRemSummaryPack once */


// legacy stubs so old listeners don't crash
async function renderRemedialTable() { showRemTab("setup"); }
async function openRemedialForm() { showRemTab("logging"); }
function closeRemedialForm() {}
async function saveRemedial(e) { if (e && e.preventDefault) e.preventDefault(); }
async function deleteRemedial() {}



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

async function buildStudentFullRecord(id) {
  var all = await getAll("students");
  var s = all.find(function(x) { return x.id === id; });
  if (!s) return null;
  var qa = await getAll("qa_entries");
  var absents = [];
  qa.forEach(function(e) {
    var hit = false;
    if (Array.isArray(e.absentDetails)) {
      hit = e.absentDetails.some(function(d) { return d.id === s.id || d.regNo === s.regNo || (d.name && d.name === s.name); });
    }
    if (!hit && Array.isArray(e.absent)) {
      hit = e.absent.some(function(a) {
        var t = String(a).toLowerCase();
        return (s.name && t.indexOf(s.name.toLowerCase()) >= 0) || (s.regNo && t.indexOf(String(s.regNo).toLowerCase()) >= 0);
      });
    }
    if (hit) absents.push(e);
  });
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
  var audit = [];
  try {
    audit = (await getAll("audit")).filter(function(a) {
      return a.entityId === s.id || (a.details && (a.details.regNo === s.regNo || a.details.name === s.name));
    }).slice(0, 40);
  } catch (_) {}
  return { student: s, absents: absents, remedial: rem, discipline: disc, audit: audit };
}

async function openStudentFullRecord(id) {
  id = id || window.__profileStudentId;
  if (!id) return;
  var data = await buildStudentFullRecord(id);
  if (!data) return;
  var s = data.student;
  document.getElementById("studentFullRecordTitle").textContent = "Full record — " + (s.name || "");
  var photo = s.photoDataUrl
    ? '<div class="passport-frame" style="margin-bottom:12px"><img src="' + s.photoDataUrl + '" alt="" /></div>'
    : "";
  function listBlock(title, items, rowFn) {
    if (!items.length) return '<div class="record-section"><h4>' + title + '</h4><p class="muted-note">None on file</p></div>';
    return '<div class="record-section"><h4>' + title + " (" + items.length + ")</h4><ul style=\"padding-left:18px;margin:0\">" +
      items.map(rowFn).join("") + "</ul></div>";
  }
  var body = document.getElementById("studentFullRecordBody");
  body.innerHTML = photo +
    "<p><strong>" + escapeHtml(s.name) + "</strong> · " + escapeHtml(s.regNo || "—") + " · " +
    escapeHtml(s.programme || "") + " " + escapeHtml(String(s.level || "")) + " · Hostel: " + escapeHtml(s.hostel || "—") + "</p>" +
    listBlock("Lecture absences (from QA logs)", data.absents, function(e) {
      return "<li>" + escapeHtml(e.date || "") + " · " + escapeHtml(e.course || "") + " · " + escapeHtml(e.status || "") + "</li>";
    }) +
    listBlock("Remedial enrolment", data.remedial, function(r) {
      return "<li>" + escapeHtml((r.courses || r.courseCodes || []).join(", ") || "enrolled") +
        (r.sessionName ? " · " + escapeHtml(r.sessionName) : "") + "</li>";
    }) +
    listBlock("Disciplinary cases", data.discipline, function(d) {
      return "<li>" + escapeHtml(d.date || "") + " · " + escapeHtml(d.type || "") + " · " +
        escapeHtml(d.status || "") + " · " + escapeHtml(d.ref || "") + "</li>";
    }) +
    listBlock("Recent audit touches", data.audit, function(a) {
      return "<li>" + escapeHtml(a.at || a.createdAt || "") + " · " + escapeHtml(a.action || "") + " · " +
        escapeHtml(a.reason || "") + "</li>";
    });
  window.__fullRecordStudentId = id;
  var m = document.getElementById("studentFullRecordModal");
  if (m) { m.hidden = false; m.removeAttribute("hidden"); m.style.display = ""; }
}

function closeStudentFullRecord() {
  var m = document.getElementById("studentFullRecordModal");
  if (!m) return;
  m.hidden = true; m.setAttribute("hidden", ""); m.style.display = "none";
}

async function printStudentSummary() {
  var id = window.__fullRecordStudentId || window.__profileStudentId;
  if (!id) return;
  var data = await buildStudentFullRecord(id);
  if (!data) return;
  var s = data.student;
  var w = window.open("", "_blank");
  if (!w) return;
  var photo = s.photoDataUrl ? '<img src="' + s.photoDataUrl + '" style="width:90px;height:110px;object-fit:cover;border:1px solid #ccc"/>' : "";
  w.document.write("<!DOCTYPE html><html><head><title>Student summary</title><style>body{font-family:Georgia,serif;padding:24px;color:#0f172a}h1{color:#0d9488;font-size:1.3rem}table{border-collapse:collapse;width:100%;font-size:0.9rem}td,th{border:1px solid #cbd5e1;padding:6px;text-align:left}.muted{color:#64748b;font-size:0.85rem}</style></head><body>" +
    "<h1>EOCNS — Student Affairs summary</h1>" +
    (ACTIVE_SESSION ? "<p class=\"muted\">Session: " + escapeHtml(ACTIVE_SESSION.name) + semesterSuffixHtml() + "</p>" : "") +
    "<div style=\"display:flex;gap:16px\">" + photo + "<div><p><strong>" + escapeHtml(s.name) + "</strong></p>" +
    "<p>Reg: " + escapeHtml(s.regNo || "—") + "<br/>" + escapeHtml(s.programme || "") + " · Level " + escapeHtml(String(s.level || "")) +
    "<br/>Hostel: " + escapeHtml(s.hostel || "—") + "</p></div></div>" +
    "<h3>Disciplinary cases</h3><table><thead><tr><th>Date</th><th>Type</th><th>Status</th><th>REF</th></tr></thead><tbody>" +
    (data.discipline.length ? data.discipline.map(function(d) {
      return "<tr><td>" + escapeHtml(d.date||"") + "</td><td>" + escapeHtml(d.type||"") + "</td><td>" + escapeHtml(d.status||"") + "</td><td>" + escapeHtml(d.ref||"") + "</td></tr>";
    }).join("") : "<tr><td colspan=4>None on file</td></tr>") +
    "</tbody></table>" +
    "<h3>Lecture absences logged</h3><p class=\"muted\">" + data.absents.length + " linked QA absence mark(s)</p>" +
    "<p class=\"muted\">Generated " + new Date().toLocaleString() + " · Officer system summary</p></body></html>");
  w.document.close();
  setTimeout(function() { w.print(); }, 300);
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

function classLabelFromKey(key) {
  var k = String(key || "");
  var m = k.match(/^(\d+)_(.+)$/);
  if (!m) return k || "—";
  var prog = m[2].replace(/_/g, " ");
  prog = prog.replace(/\b\w/g, function(c) { return c.toUpperCase(); });
  return m[1] + " LEVEL " + prog.toUpperCase();
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
  var meta = await promptOfficerAndFormat("Student Master Register");
  if (!meta) return;
  var students = await getAll("students");
  students = students.slice().sort(function(a, b) {
    return String(a.name || "").localeCompare(String(b.name || ""));
  });
  var byProg = {};
  students.forEach(function(s) {
    var k = (s.programme || "Unspecified") + " · L" + (s.level || "?");
    byProg[k] = byProg[k] || [];
    byProg[k].push(s);
  });
  var active = students.filter(function(s) { return !s.status || String(s.status).toLowerCase() === "active"; }).length;
  var female = students.filter(function(s) { return String(s.gender || "").toLowerCase().indexOf("f") === 0; }).length;
  var male = students.filter(function(s) { return String(s.gender || "").toLowerCase().indexOf("m") === 0; }).length;
  var amendments = await collectReportAmendments({ entities: ["students"] });
  var body = reportLetterheadHtml(
    "Student Master Register",
    "Full institutional roll — programmes, levels & status",
    "Snapshot as at " + new Date().toLocaleString()
  );
  body += "<h2 class='sec'>Register snapshot</h2>";
  body += "<div class='kpi'>" +
    "<div><div class='lab'>Total on roll</div><div class='val' style='color:#1B3A6B'>" + students.length + "</div></div>" +
    "<div class='present'><div class='lab'>Active</div><div class='val'>" + active + "</div></div>" +
    "<div><div class='lab'>Female</div><div class='val' style='color:#1B3A6B'>" + female + "</div></div>" +
    "<div><div class='lab'>Male</div><div class='val' style='color:#1B3A6B'>" + male + "</div></div>" +
    "</div>";
  // gender donut approx
  var genPct = students.length ? Math.round((female / students.length) * 1000) / 10 : 0;
  body += "<div style='display:flex;gap:16px;flex-wrap:wrap;align-items:center'>" + svgDonut(genPct, 130, "% female") +
    "<p style='font-size:12px;max-width:360px'>This register is the master list used for attendance sheets, QA logs and remedial enrolment. Inactive records remain listed for audit but are excluded from operational counts where filters apply.</p></div>";
  Object.keys(byProg).sort().forEach(function(k) {
    var rows = byProg[k].map(function(s, i) {
      return "<tr><td>" + (i + 1) + "</td><td>" + escapeHtml(s.name) + "</td><td>" + escapeHtml(s.regNo || "") +
        "</td><td>" + escapeHtml(s.serial || "") + "</td><td>" + escapeHtml(s.gender || "") +
        "</td><td>" + escapeHtml(s.hostel || "") + "</td><td>" + escapeHtml(s.status || "Active") + "</td></tr>";
    }).join("");
    body += "<h2 class='sec'>" + escapeHtml(k) + " <span style='font-weight:500;color:#64748b'>(" + byProg[k].length + ")</span></h2>";
    body += "<table class='data'><thead><tr><th>#</th><th>Name</th><th>Reg. No</th><th>Serial</th><th>Gender</th><th>Hostel</th><th>Status</th></tr></thead><tbody>" + rows + "</tbody></table>";
  });
  body += reportGlossaryHtml([
    ["Serial", "Class list number used on attendance sheets."],
    ["Active / Inactive", "Inactive students are retained for history but should not appear on new attendance sheets."]
  ]);
  body += reportAmendmentsHtml(amendments);
  openReportWindow("EOCNS Student Master Register", body, meta.officer, meta.format);
}

/** Hostel occupancy & distribution report */
async function generateHostelDistributionReport() {
  var meta = await promptOfficerAndFormat("Hostel Distribution Report");
  if (!meta) return;
  var students = (await getAll("students")).filter(function(s) {
    return !s.status || String(s.status).toLowerCase() === "active";
  });
  var byHostel = {};
  students.forEach(function(s) {
    var h = (s.hostel || "").trim() || "Unassigned";
    byHostel[h] = byHostel[h] || [];
    byHostel[h].push(s);
  });
  var hostels = Object.keys(byHostel).sort();
  var barRows = hostels.map(function(h) {
    return { label: h, value: byHostel[h].length, max: students.length || 1 };
  });
  // convert counts to % of total for bar chart
  var barPct = barRows.map(function(r) {
    return { label: r.label + " (" + r.value + ")", value: students.length ? (r.value / students.length) * 100 : 0 };
  });
  var amendments = await collectReportAmendments({ entities: ["students"] });
  var body = reportLetterheadHtml(
    "Hostel Distribution Report",
    "Active students by hostel assignment (from master list)",
    "Snapshot as at " + new Date().toLocaleString()
  );
  body += "<h2 class='sec'>Overview</h2>";
  body += "<div class='kpi'>" +
    "<div><div class='lab'>Active students</div><div class='val' style='color:#1B3A6B'>" + students.length + "</div></div>" +
    "<div><div class='lab'>Hostel groups</div><div class='val' style='color:#1B3A6B'>" + hostels.length + "</div></div>" +
    "<div class='absent'><div class='lab'>Unassigned</div><div class='val'>" + (byHostel["Unassigned"] || []).length + "</div></div>" +
    "</div>";
  body += "<h2 class='sec'>Share of students by hostel</h2>" + svgHBarRows(barPct, 360);
  hostels.forEach(function(h) {
    var list = byHostel[h].slice().sort(function(a, b) { return String(a.name).localeCompare(String(b.name)); });
    var rows = list.map(function(s, i) {
      return "<tr><td>" + (i + 1) + "</td><td>" + escapeHtml(s.name) + "</td><td>" + escapeHtml(s.regNo || "") +
        "</td><td>" + escapeHtml(s.programme || "") + "</td><td>" + escapeHtml(String(s.level || "")) +
        "</td><td>" + escapeHtml(s.gender || "") + "</td></tr>";
    }).join("");
    body += "<h2 class='sec'>" + escapeHtml(h) + " — " + list.length + " student(s)</h2>";
    body += "<table class='data'><thead><tr><th>#</th><th>Name</th><th>Reg. No</th><th>Programme</th><th>Level</th><th>Gender</th></tr></thead><tbody>" + rows + "</tbody></table>";
  });
  body += reportGlossaryHtml([
    ["Hostel assignment", "Taken from the student master list (not biometric machine location IDs)."],
    ["Unassigned", "Active students with a blank hostel field — update the master list, then republish."]
  ]);
  body += reportAmendmentsHtml(amendments);
  openReportWindow("EOCNS Hostel Report", body, meta.officer, meta.format);
}

window.generateStudentRegisterReport = generateStudentRegisterReport;
window.generateHostelReport = generateHostelReport;
window.generateHostelDistributionReport = generateHostelDistributionReport;
window.printWeeklyProfessionalPack = printWeeklyProfessionalPack;
window.printMonthlyProfessionalPack = printMonthlyProfessionalPack;
window.printRemWeeklyPack = printRemWeeklyPack;
window.printRemSummaryPack = printRemSummaryPack;


// Ensure report generators are globally reachable for boot listeners
try {
  if (typeof window.printDailyLectureReport === "function") window.printDailyLectureReport = printDailyLectureReport;
} catch (_) {}
try {
  if (typeof window.printWeeklyProfessionalPack === "function") window.printWeeklyProfessionalPack = printWeeklyProfessionalPack;
} catch (_) {}
try {
  if (typeof window.printMonthlyProfessionalPack === "function") window.printMonthlyProfessionalPack = printMonthlyProfessionalPack;
} catch (_) {}
try {
  if (typeof window.printRemWeeklyPack === "function") window.printRemWeeklyPack = printRemWeeklyPack;
} catch (_) {}
try {
  if (typeof window.printRemSummaryPack === "function") window.printRemSummaryPack = printRemSummaryPack;
} catch (_) {}
try {
  if (typeof generateStudentRegisterReport === "function") window.generateStudentRegisterReport = generateStudentRegisterReport;
} catch (_) {}
try {
  if (typeof generateHostelDistributionReport === "function") window.generateHostelDistributionReport = generateHostelDistributionReport;
} catch (_) {}

})();
