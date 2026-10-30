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
  students: { title: "Students", subtitle: "Master registry · filtered by active session programmes & levels" },
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
  if (viewId === "lecturers") renderLecturersTable();
  if (viewId === "remedial") showRemTab("setup");
  if (viewId === "lecturer-hours") {
    var m = document.getElementById("lecturerHoursMonth");
    if (m && !m.value) m.value = new Date().toISOString().slice(0, 7);
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
function markDirty(reason) {
  EOCNS_DIRTY = true;
  try {
    var el = document.getElementById("dirtyBanner");
    if (el) { el.hidden = false; el.textContent = "Unsaved local changes" + (reason ? " (" + reason + ")" : "") + " — Publish to repository in Settings before you leave, or you may lose work on another device."; }
  } catch (_) {}
}
function clearDirty() {
  EOCNS_DIRTY = false;
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
const DB_VERSION = 8;
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
function getProgrammeCode(p) { return PROGRAMME_CODES[p] || (p ? p.slice(0, 3).toUpperCase() : "GEN"); }
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
  list.forEach(function(l) {
    const sid = l.staffId || "";
    if (sid.indexOf(prefix) === 0) {
      const n = parseInt(sid.slice(prefix.length), 10);
      if (!isNaN(n) && n > max) max = n;
    }
  });
  return prefix + String(max + 1).padStart(4, "0");
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
    var actions = isQaOfficer()
      ? ('<button type="button" class="icon-btn-sm" data-edit-stu="' + s.id + '">Edit</button>')
      : "";
    var cb = isQaOfficer()
      ? ('<td class="qa-edit-only"><input type="checkbox" class="stu-select" value="' + s.id + '" /></td>')
      : '<td class="qa-edit-only"></td>';
    return "<tr>" + cb + "<td><div class=\"cell-main\">" + escapeHtml(s.name) + "</div></td><td>" + escapeHtml(s.regNo || "—") +
      "</td><td>" + escapeHtml(s.programme || "—") + "</td><td>" + escapeHtml(String(s.level || "—")) +
      "</td><td>" + escapeHtml(s.hostel || "—") + "</td><td><span class=\"badge " + (s.status === "Active" ? "badge--green" : "badge--muted") + "\">" +
      escapeHtml(s.status || "Active") + "</span></td><td class=\"qa-edit-only\">" + actions + "</td></tr>";
  }).join("");
  tbody.querySelectorAll("[data-edit-stu]").forEach(function(btn) {
    btn.addEventListener("click", function() { openStudentForm(btn.getAttribute("data-edit-stu")); });
  });
  tbody.querySelectorAll(".stu-select").forEach(function(cb) {
    cb.addEventListener("change", updateBulkSelectedCount);
  });
  updateBulkSelectedCount();
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
    const student = Object.assign({}, existing, { name, regNo, programme, level: level ? Number(level) : null, gender, hostel, status, phone, updatedAt: now });
    await writeAudit({ action: "update", entity: "students", entityId: id, reason, details: { before: existing, after: student }, externalRef: officialRef });
    await put("students", student);
  } else {
    const student = { id: generateId("stu"), name, regNo, programme, level: level ? Number(level) : null, gender, hostel, status, phone, createdAt: now, updatedAt: now };
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
async function renderLecturersTable() {
  await loadLecturers();
  var q = ((document.getElementById("lecturerSearch") && document.getElementById("lecturerSearch").value) || "").toLowerCase().trim();
  var list = lecturersCache.filter(function(l) {
    if (!q) return true;
    var blob = (l.name || "") + " " + (l.staffId || "") + " " + formatLecturerAssignments(l);
    return blob.toLowerCase().indexOf(q) >= 0;
  });
  var tbody = document.getElementById("lecturersTableBody");
  if (!tbody) return;
  tbody.innerHTML = list.map(function(l) {
    var ch = l.contractHoursPerMonth != null && l.contractHoursPerMonth !== "" ? l.contractHoursPerMonth : "—";
    var actions = isQaOfficer()
      ? ('<button type="button" class="icon-btn-sm" data-edit-lec="' + l.id + '">Edit</button> <button type="button" class="icon-btn-sm" data-del-lec="' + l.id + '">Del</button>')
      : "";
    return "<tr><td>" + escapeHtml(l.name) + "</td><td>" + escapeHtml(l.staffId || "") + "</td><td>" +
      escapeHtml(formatLecturerAssignments(l)) + "</td><td>" + escapeHtml(String(ch)) + "</td><td>" +
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
  } else {
    await loadLecturers();
    var l = lecturersCache.find(function(x) { return x.id === id; });
    if (l) {
      document.getElementById("lecturerName").value = l.name || "";
      document.getElementById("lecturerStaffId").value = l.staffId || "";
      document.getElementById("lecturerPhone").value = l.phone || "";
      document.getElementById("lecturerContractHours").value = l.contractHoursPerMonth != null ? l.contractHoursPerMonth : "";
      document.getElementById("lecturerStatus").value = l.status || "Active";
      var assigns = l.assignments && l.assignments.length ? l.assignments : (l.courses || []).map(function(c) { return { code: c }; });
      if (!assigns.length) assigns = [{}];
      for (var i = 0; i < assigns.length; i++) await addLecturerAssignRow(assigns[i]);
    }
  }
  document.getElementById("lecturerModal").hidden = false;
}
async function saveLecturer(e) {
  e.preventDefault();
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
  var courses = assignments.map(function(a) { return a.code; }).filter(Boolean);
  // legacy field also kept for older views
  var legacy = (document.getElementById("lecturerCourses") && document.getElementById("lecturerCourses").value || "").split(",").map(function(c) { return c.trim(); }).filter(Boolean);
  if (!courses.length && legacy.length) courses = legacy;
  var contractRaw = document.getElementById("lecturerContractHours").value;
  var contractHours = contractRaw === "" ? null : Number(contractRaw);
  var now = new Date().toISOString();
  var lec = {
    id: id || ("lec_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)),
    name: name,
    staffId: document.getElementById("lecturerStaffId").value.trim() || await generateStaffId(),
    phone: document.getElementById("lecturerPhone").value.trim(),
    courses: courses,
    assignments: assignments,
    contractHoursPerMonth: contractHours,
    status: document.getElementById("lecturerStatus").value || "Active",
    updatedAt: now
  };
  if (!id) lec.createdAt = now;
  else {
    var prev = lecturersCache.find(function(x) { return x.id === id; });
    if (prev && prev.createdAt) lec.createdAt = prev.createdAt;
  }
  await put("lecturers", lec);
  await writeAudit({
    action: id ? "update" : "create",
    entity: "lecturers",
    entityId: lec.id,
    externalRef: ref || undefined,
    reason: id ? ("Lecturer updated · " + assignments.length + " course assignment(s)") : "Lecturer created",
    details: { name: name, contractHoursPerMonth: contractHours, courses: courses, assignments: assignments }
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
        (s.startDate ? " · Started " + escapeHtml(s.startDate) : "") + "</div>" + actions + "</div></div>";
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
    }
  } else {
    document.getElementById("sessionModalTitle").textContent = "New Academic Session";
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
  var sess;
  if (id) {
    var all = await getAll("sessions");
    sess = all.find(function(x) { return x.id === id; }) || { id: id };
    sess = Object.assign({}, sess, { name: name, startDate: startDate, status: status, programmes: programmes, levels: levels, updatedAt: now });
    // drop endDate if present
    delete sess.endDate;
    await writeAudit({ action: "update", entity: "sessions", entityId: id, reason: "Session updated", details: { name: name } });
  } else {
    sess = { id: generateId("sess"), name: name, startDate: startDate, status: status, programmes: programmes, levels: levels, createdAt: now, updatedAt: now };
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
      programme: s.programme === "Midwifery" ? "Midwifery" : "Nursing",
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
  showView(sessionStorage.getItem("eocns-last-view") || "dashboard");
  try { refreshDashboardStats(); } catch (e) { console.warn("stats", e); }
  initQaOfficerUI();
  document.getElementById("globalSessionSelect")?.addEventListener("change", function() {
    setActiveSessionId(this.value);
  });
  try { await refreshSessionChrome(); } catch (e) { console.warn("session chrome", e); }
  document.getElementById("btnAddStudent")?.addEventListener("click", () => openStudentForm());
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
  const todayStr = (function() { var d = new Date(); return d.toISOString().slice(0, 10); 
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



function eocnsReportStyles() { /* amend-footer supported via amendmentFooterHtml() */
  return "body{font-family:'Segoe UI',system-ui,Georgia,serif;color:#1a1a2e;padding:28px;max-width:960px;margin:0 auto;line-height:1.45}" +
    "h1{color:#1B3A6B;text-align:center;margin:0 0 4px;font-size:1.45rem;letter-spacing:0.02em}" +
    "h1 .gold{color:#c9a227;display:block;font-size:0.95rem;font-weight:600;margin-top:4px}" +
    ".sub{text-align:center;color:#555;margin:0 0 8px;font-size:12px}" +
    ".rule{height:3px;background:linear-gradient(90deg,#1B3A6B,#c9a227,#1B3A6B);border:0;margin:12px 0 20px}" +
    "h2{color:#1B3A6B;font-size:0.95rem;margin:28px 0 10px;padding:8px 12px;background:#e8eef7;border-left:4px solid #1B3A6B}" +
    "table{width:100%;border-collapse:collapse;font-size:12px;margin-top:8px}" +
    "th{background:#1B3A6B;color:#fff;padding:8px;text-align:left;font-weight:600}" +
    "td{border:1px solid #c5cdd8;padding:7px 8px;vertical-align:top}" +
    "tr:nth-child(even) td{background:#f7f9fc}" +
    ".kpi{display:flex;gap:10px;flex-wrap:wrap;margin:12px 0 8px}" +
    ".kpi>div{flex:1;min-width:110px;text-align:center;border:1px solid #c5cdd8;border-radius:8px;padding:12px 8px;background:#fff}" +
    ".kpi strong{display:block;font-size:1.45rem;line-height:1.2}" +
    ".kpi span{font-size:10px;text-transform:uppercase;letter-spacing:0.04em;color:#555}" +
    ".k-sched strong{color:#1B3A6B}.k-del strong{color:#0f766e}.k-miss strong{color:#b91c1c}.k-rate strong{color:#0f766e}" +
    ".meta-grid{display:grid;grid-template-columns:140px 1fr;gap:4px 12px;font-size:13px;margin:8px 0 12px}" +
    ".meta-grid b{color:#334}" +
    ".absent-head th{background:#b91c1c}" +
    ".note{background:#fff8e6;border-left:4px solid #c9a227;padding:8px 12px;font-size:12px;margin:8px 0}" +
    ".charts{display:flex;flex-wrap:wrap;gap:20px;align-items:center;margin:12px 0}" +
    ".footer{margin-top:36px;font-size:12px;color:#555;text-align:center}" +
    "@media print{body{padding:12px} .kpi>div{-webkit-print-color-adjust:exact;print-color-adjust:exact}}";
}

function classLabelFromKey(key) {
  var map = { "100_nursing": "100 LEVEL NURSING DEPARTMENT", "200_nursing": "200 LEVEL NURSING DEPARTMENT", "200_midwifery": "200 LEVEL MIDWIFERY DEPARTMENT" };
  return map[key] || String(key || "CLASS").replace(/_/g, " ").toUpperCase();
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
  var date = (document.getElementById("qaDailyDate") && document.getElementById("qaDailyDate").value) || "";
  var classKey = (document.getElementById("qaDailyClass") && document.getElementById("qaDailyClass").value) || "100_nursing";
  if (!date) { alert("Choose a date on Daily QA first."); return; }
  await ensureTimetables();
  var tt = TIMETABLES_CACHE[classKey] || { slots: [] };
  var weekday = (new Date(date + "T12:00:00").getDay() + 6) % 7; // Mon=0
  var slots = (tt.slots || []).filter(function(s) { return Number(s.weekday) === weekday; });
  var entries = (await getQaEntries()).filter(function(e) { return e.date === date && e.classKey === classKey; });
  var sessionName = "Academic Session";
  try {
    var sessions = await getAll("sessions");
    var active = sessions.find(function(s) { return s.status === "Active"; });
    if (active) sessionName = active.name;
  } catch (_) {}
  var students = await getAll("students");
  function resolveAbsent(list) {
    if (!list || !list.length) return [];
    return list.map(function(a) {
      var sn = String(a).trim();
      var found = students.find(function(s) { return String(s.serial) === sn || String(s.regNo) === sn || (s.name && s.name.toLowerCase() === sn.toLowerCase()); });
      return { sn: found ? (found.serial || sn) : sn, name: found ? found.name : sn };
    });
  }
  var scheduleRows = "";
  var courseBlocks = "";
  var allAbsent = {};
  var used = slots.length ? slots : entries.map(function(e) {
    return { code: (e.course || "").split("—")[0].trim(), start: e.start, end: e.end, hours: e.duration ? e.duration / 60 : 2 };
  });
  used.forEach(function(slot, i) {
    var code = slot.code || "";
    var ent = entries.find(function(e) {
      return (e.course || "").indexOf(code) >= 0 || (e.start && slot.start && e.start === slot.start);
    }) || entries[i];
    var remark = ent ? (ent.status === "Held" ? "Lecture held" : ent.status === "Missed" ? "Lecture missed" : (ent.status || "Logged")) : "Not logged";
    var title = ent ? (ent.course || code) : courseName(code);
    scheduleRows += "<tr><td>" + (i + 1) + "</td><td>" + escapeHtml(String(title).replace(/^[^—]+—\s*/, "") || title) +
      "</td><td>" + escapeHtml(code) + "</td><td>" + formatTimeNice(slot.start || (ent && ent.start)) +
      "</td><td>" + formatTimeNice(slot.end || (ent && ent.end)) + "</td><td>" + escapeHtml(remark) + "</td></tr>";
    if (ent) {
      var abs = resolveAbsent(ent.absent);
      abs.forEach(function(a) { allAbsent[a.sn + "|" + a.name] = a; });
      var obj = (ent.objectives || "").split(/[.;\n]+/).map(function(x) { return x.trim(); }).filter(Boolean);
      courseBlocks += "<h2>COURSE " + (i + 1) + " INFORMATION</h2>" +
        "<div class=\"meta-grid\">" +
        "<b>Course Code:</b><span>" + escapeHtml(code || (ent.course || "")) + "</span>" +
        "<b>Course Title:</b><span>" + escapeHtml(ent.course || title) + "</span>" +
        "<b>Lecturer:</b><span>" + escapeHtml(ent.lecturer || "—") + "</span>" +
        "<b>Topic:</b><span>" + escapeHtml(ent.topic || "—") + "</span>" +
        "<b>Date:</b><span>" + formatDateLong(ent.date) + "</span>" +
        "<b>Time:</b><span>" + formatTimeNice(ent.start) + " – " + formatTimeNice(ent.end) + "</span></div>" +
        "<h2>LEARNING OBJECTIVES</h2><ul>" + (obj.length ? obj.map(function(o) { return "<li>" + escapeHtml(o) + "</li>"; }).join("") : "<li>—</li>") + "</ul>" +
        "<h2>LECTURE SUMMARY</h2><p>" + escapeHtml(ent.lectureSummary || "—") + "</p>" +
        "<h2>ASSIGNMENT</h2><div class=\"note\">" + escapeHtml(ent.assignment || "None was given") + "</div>" +
        "<h2>REMARKS</h2><p>" + escapeHtml(ent.remark || "—") + "</p>" +
        "<h2>ABSENT STUDENTS</h2>" +
        (abs.length ? ("<table><thead class=\"absent-head\"><tr><th>S/N</th><th>Full Name</th></tr></thead><tbody>" +
          abs.map(function(a) { return "<tr><td>" + escapeHtml(String(a.sn)) + "</td><td>" + escapeHtml(a.name) + "</td></tr>"; }).join("") +
          "</tbody></table>") : "<p>None recorded.</p>");
    }
  });
  var absentList = Object.keys(allAbsent).map(function(k) { return allAbsent[k]; });
  var registered = students.filter(function(s) {
    if (s.status && s.status !== "Active") return false;
    // best-effort class filter by level in classKey
    if (classKey.indexOf("100") === 0) return String(s.level) === "100";
    if (classKey.indexOf("200") === 0) return String(s.level) === "200";
    return true;
  }).length;
  var present = Math.max(0, registered - absentList.length);
  var w = window.open("", "_blank");
  if (!w) return;
  w.document.write("<!DOCTYPE html><html><head><title>Today's Lecture Report</title><style>" + eocnsReportStyles() + "</style></head><body>" +
    "<h1>TODAY'S LECTURE(S) REPORT<span class=\"gold\">" + escapeHtml(classLabelFromKey(classKey)) + "</span></h1>" +
    "<div class=\"sub\">" + escapeHtml(classKey.replace(/_.*/, "").toUpperCase() + " Level") + " · " + escapeHtml(sessionName) + " · " + formatDateLong(date) + "</div>" +
    "<hr class=\"rule\"/>" +
    "<h2>COURSE SCHEDULE / TIMETABLE</h2>" +
    "<table><thead><tr><th>S/N</th><th>Course Title</th><th>Course Code</th><th>Start Time</th><th>End Time</th><th>Remark</th></tr></thead><tbody>" +
    (scheduleRows || "<tr><td colspan=\"6\">No timetable slots or logs for this day.</td></tr>") + "</tbody></table>" +
    courseBlocks +
    "<h2>CONSOLIDATED ATTENDANCE REPORT</h2>" +
    "<div class=\"kpi\"><div class=\"k-sched\"><strong>" + registered + "</strong><span>Total registered</span></div>" +
    "<div class=\"k-del\"><strong>" + present + "</strong><span>Present (est.)</span></div>" +
    "<div class=\"k-miss\"><strong>" + absentList.length + "</strong><span>Absent (unique)</span></div></div>" +
    "<h2>CONSOLIDATED ABSENT STUDENTS LIST</h2>" +
    (absentList.length ? ("<table><thead class=\"absent-head\"><tr><th>S/N</th><th>Full Name</th></tr></thead><tbody>" +
      absentList.map(function(a) { return "<tr><td>" + escapeHtml(String(a.sn)) + "</td><td>" + escapeHtml(a.name) + "</td></tr>"; }).join("") +
      "</tbody></table>") : "<p>No absentees recorded in lecture logs for this day.</p>") +
    amendmentFooterHtml(typeof entries !== "undefined" ? entries : (window.__lastQaReportEntries || [])) + "<div class=\"footer\">Eastern Oak College of Nursing Sciences · Generated " + new Date().toLocaleString() + " · EOCNS QA System</div>" +
    "</body></html>");
  w.document.close();
  setTimeout(function() { w.print(); }, 400);
}

function printWeeklyProfessionalPack(payload) {
  var p = payload || window.__weeklyQaPayload;
  if (!p) { alert("Build the weekly report first."); return; }
  var compliance = p.scheduled ? Math.round((p.delivered / p.scheduled) * 1000) / 10 : 0;
  var courseRows = (p.courseRows || []).map(function(r) {
    return "<tr><td>" + escapeHtml(r.course) + "</td><td>" + escapeHtml(r.lecturer) + "</td><td>" + r.sched +
      "</td><td>" + r.deliv + "</td><td>" + r.missed + "</td><td>" + r.hrs + "</td><td>" + escapeHtml(r.status) +
      "</td><td>" + r.pct + "</td></tr>";
  }).join("");
  var dayRows = (p.dayRows || []).map(function(r) {
    return "<tr><td>" + escapeHtml(r.date) + "</td><td>" + escapeHtml(r.day) + "</td><td>" + escapeHtml(r.course) +
      "</td><td>" + escapeHtml(r.lecturer) + "</td><td>" + escapeHtml(r.topic) + "</td><td>" + escapeHtml(r.time) +
      "</td><td>" + escapeHtml(r.hrs) + "</td></tr>";
  }).join("");
  var pie = [
    { label: "Delivered", value: p.delivered, color: "#0f766e" },
    { label: "Missed", value: p.missed, color: "#b91c1c" }
  ].filter(function(x) { return x.value > 0; });
  var bars = (p.courseRows || []).slice(0, 10).map(function(r) {
    return { label: String(r.course).slice(0, 8), value: r.deliv, color: "#1d4ed8" };
  });
  var w = window.open("", "_blank");
  if (!w) return;
  w.document.write("<!DOCTYPE html><html><head><title>EOCNS Weekly QA Report</title><style>" + eocnsReportStyles() + "</style></head><body>" +
    "<h1>EOCNS QA REPORT — WEEKLY<span class=\"gold\">Staff Teaching Commitment &amp; Lecture Attendance</span></h1>" +
    "<div class=\"sub\"><strong>" + escapeHtml(classLabelFromKey(p.classKey)) + "</strong><br/>" +
    escapeHtml(p.periodLabel) + "<br/>Generated: " + new Date().toLocaleString() + " · Excluded: " + escapeHtml(p.excluded || "None") + "</div>" +
    "<hr class=\"rule\"/>" +
    "<h2>WEEKLY SUMMARY</h2>" +
    "<div class=\"kpi\">" +
    "<div class=\"k-sched\"><strong>" + p.scheduled + "</strong><span>Scheduled</span></div>" +
    "<div class=\"k-del\"><strong>" + p.delivered + "</strong><span>Delivered</span></div>" +
    "<div class=\"k-miss\"><strong>" + p.missed + "</strong><span>Missed</span></div>" +
    "<div class=\"k-rate\"><strong>" + compliance + "%</strong><span>Compliance</span></div></div>" +
    "<p>Teaching delivery for this window stands at <strong>" + compliance + "%</strong> " +
    "(" + p.delivered + " of " + p.scheduled + " scheduled contact sessions logged as held). " +
    (p.missed ? (p.missed + " session(s) were missed and should be rescheduled or explained in audit.") : "No missed sessions were recorded.") + "</p>" +
    "<h2>COURSE COMPLIANCE</h2>" +
    "<table><thead><tr><th>Course</th><th>Lecturer(s)</th><th>Sched</th><th>Deliv</th><th>Missed</th><th>Hrs Del</th><th>Status</th><th>%</th></tr></thead><tbody>" +
    (courseRows || "<tr><td colspan=\"8\">No course data.</td></tr>") + "</tbody></table>" +
    "<h2>VISUAL ANALYSIS</h2><div class=\"charts\">" +
    (typeof svgPie === "function" ? svgPie(pie, 160) : "") +
    (typeof svgBars === "function" ? svgBars(bars, 340, 150) : "") + "</div>" +
    "<h2>DAY-BY-DAY BREAKDOWN</h2>" +
    "<table><thead><tr><th>Date</th><th>Day</th><th>Course</th><th>Lecturer</th><th>Topic</th><th>Time</th><th>Hrs</th></tr></thead><tbody>" +
    (dayRows || "<tr><td colspan=\"7\">No lectures logged in range.</td></tr>") + "</tbody></table>" +
    "<div class=\"footer\">— End of Weekly QA Report — · EOCNS QA Attendance System</div></body></html>");
  w.document.close();
  setTimeout(function() { w.print(); }, 400);
}

function printMonthlyProfessionalPack(payload) {
  var p = payload || window.__monthlyQaPayload;
  if (!p) { alert("Build the monthly report first."); return; }
  var w = window.open("", "_blank");
  if (!w) return;
  var courseRows = (p.courseRows || []).map(function(r) {
    return "<tr><td>" + escapeHtml(r.course) + "</td><td>" + r.scheduled + "</td><td>" + r.held + "</td><td>" + r.missed + "</td><td>" + r.rate + "%</td></tr>";
  }).join("");
  var pie = [
    { label: "Held", value: p.delivered, color: "#0f766e" },
    { label: "Missed", value: p.missed, color: "#b91c1c" }
  ].filter(function(x) { return x.value > 0; });
  w.document.write("<!DOCTYPE html><html><head><title>EOCNS Monthly QA Report</title><style>" + eocnsReportStyles() + "</style></head><body>" +
    "<h1>EOCNS — MONTHLY QA REPORT<span class=\"gold\">Lecture Delivery &amp; Compliance Analysis</span></h1>" +
    "<div class=\"sub\"><strong>" + escapeHtml(classLabelFromKey(p.classKey)) + "</strong><br/>Reporting period: " + escapeHtml(p.monthLabel) +
    " · Generated " + new Date().toLocaleString() + "</div><hr class=\"rule\"/>" +
    "<h2>EXECUTIVE SUMMARY</h2>" +
    "<div class=\"kpi\">" +
    "<div class=\"k-sched\"><strong>" + p.scheduled + "</strong><span>Scheduled</span></div>" +
    "<div class=\"k-del\"><strong>" + p.delivered + "</strong><span>Delivered</span></div>" +
    "<div class=\"k-miss\"><strong>" + p.missed + "</strong><span>Missed</span></div>" +
    "<div class=\"k-rate\"><strong>" + p.rate + "%</strong><span>Compliance</span></div></div>" +
    "<p>Over <strong>" + escapeHtml(p.monthLabel) + "</strong>, the class recorded <strong>" + p.rate + "%</strong> delivery compliance. " +
    "This pack is intended for academic board review and continuous quality improvement.</p>" +
    "<h2>COURSE PERFORMANCE</h2>" +
    "<table><thead><tr><th>Course</th><th>Scheduled</th><th>Held</th><th>Missed</th><th>Rate</th></tr></thead><tbody>" +
    (courseRows || "<tr><td colspan=\"5\">No data</td></tr>") + "</tbody></table>" +
    "<h2>VISUAL ANALYSIS</h2><div class=\"charts\">" +
    (typeof svgPie === "function" ? svgPie(pie, 160) : "") + "</div>" +
    "<div class=\"footer\">— End of Monthly QA Report — · Eastern Oak College of Nursing Sciences</div></body></html>");
  w.document.close();
  setTimeout(function() { w.print(); }, 400);
}


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

async function renderRemedialTable() {
  var list = await getAll("remedial");
  list.sort(function(a, b) { return String(b.date || "").localeCompare(String(a.date || "")); });
  var tbody = document.getElementById("remedialTableBody");
  var empty = document.getElementById("remedialEmpty");
  if (!tbody) return;
  if (!list.length) {
    tbody.innerHTML = "";
    if (empty) empty.hidden = false;
    return;
  }
  if (empty) empty.hidden = true;
  tbody.innerHTML = list.map(function(r) {
    var actions = isQaOfficer()
      ? ('<button type="button" class="icon-btn-sm" data-edit-rem="' + r.id + '">Edit</button> <button type="button" class="icon-btn-sm" data-del-rem="' + r.id + '">Del</button>')
      : "";
    return "<tr><td>" + escapeHtml(r.date || "") + "</td><td>" + escapeHtml(r.course || "") +
      "</td><td>" + escapeHtml(r.lecturer || "") + "</td><td>" + escapeHtml(String(r.hours || "")) +
      "</td><td>" + escapeHtml(r.classKey || "") + "</td><td>" + escapeHtml(r.reason || "") +
      "</td><td>" + escapeHtml(r.ref || "") + "</td><td class=\"qa-edit-only\">" + actions + "</td></tr>";
  }).join("");
  tbody.querySelectorAll("[data-edit-rem]").forEach(function(btn) {
    btn.addEventListener("click", function() { openRemedialForm(btn.getAttribute("data-edit-rem")); });
  });
  tbody.querySelectorAll("[data-del-rem]").forEach(function(btn) {
    btn.addEventListener("click", function() { deleteRemedial(btn.getAttribute("data-del-rem")); });
  });
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

async function openRemedialForm(id) {
  if (!isQaOfficer()) { alert("Sign in as QA Officer to log remedial sessions."); return; }
  await fillRemedialSelects();
  document.getElementById("remedialForm").reset();
  document.getElementById("remedialId").value = id || "";
  document.getElementById("remedialModalTitle").textContent = id ? "Edit remedial session" : "Log remedial session";
  if (id) {
    var list = await getAll("remedial");
    var r = list.find(function(x) { return x.id === id; });
    if (r) {
      document.getElementById("remedialDate").value = r.date || "";
      document.getElementById("remedialHours").value = r.hours != null ? r.hours : 2;
      document.getElementById("remedialCourse").value = r.course || "";
      document.getElementById("remedialLecturer").value = r.lecturer || "";
      document.getElementById("remedialClass").value = r.classKey || "100_nursing";
      document.getElementById("remedialReason").value = r.reason || "";
      document.getElementById("remedialRef").value = r.ref || "";
    }
  }
  document.getElementById("remedialModal").hidden = false;
}

function closeRemedialForm() {
  document.getElementById("remedialModal").hidden = true;
}

async function saveRemedial(e) {
  e.preventDefault();
  if (!isQaOfficer()) return;
  var id = document.getElementById("remedialId").value || null;
  var ref = (document.getElementById("remedialRef").value || "").trim();
  if (!ref) { alert("Official REF is required."); return; }
  var now = new Date().toISOString();
  var rec = {
    id: id || ("rem_" + Date.now().toString(36)),
    date: document.getElementById("remedialDate").value,
    hours: Number(document.getElementById("remedialHours").value) || 0,
    course: document.getElementById("remedialCourse").value,
    lecturer: document.getElementById("remedialLecturer").value,
    classKey: document.getElementById("remedialClass").value,
    reason: (document.getElementById("remedialReason").value || "").trim(),
    ref: ref,
    updatedAt: now
  };
  if (!id) rec.createdAt = now;
  await put("remedial", rec);
  await writeAudit({
    action: id ? "update" : "create",
    entity: "remedial",
    entityId: rec.id,
    externalRef: ref,
    reason: id ? "Remedial session updated" : "Remedial session logged",
    details: { date: rec.date, course: rec.course, lecturer: rec.lecturer, hours: rec.hours }
  });
  markDirty("remedial");
  closeRemedialForm();
  await renderRemedialTable();
}

async function deleteRemedial(id) {
  if (!isQaOfficer()) return;
  var ref = prompt("Official REF to delete this remedial record:", "REF/EOCNS/QA/");
  if (!ref || !String(ref).trim()) return;
  if (!confirm("Delete this remedial session?")) return;
  await del("remedial", id);
  await writeAudit({ action: "delete", entity: "remedial", entityId: id, externalRef: String(ref).trim(), reason: "Remedial session deleted" });
  markDirty("remedial");
  await renderRemedialTable();
}

async function buildLecturerHoursReport() {
  var monthVal = (document.getElementById("lecturerHoursMonth") && document.getElementById("lecturerHoursMonth").value) || "";
  if (!monthVal) { alert("Choose a month."); return; }
  await loadLecturers();
  var qa = await getQaEntries();
  var rows = [];
  lecturersCache.filter(function(l) { return !l.status || l.status === "Active"; }).forEach(function(l) {
    var contract = Number(l.contractHoursPerMonth) || 0;
    var deliveredMin = 0;
    qa.forEach(function(e) {
      if (String(e.date || "").slice(0, 7) !== monthVal) return;
      if ((e.lecturer || "") !== l.name) return;
      if (e.status === "Missed") return;
      deliveredMin += Number(e.duration) || 0;
    });
    var delivered = Math.round((deliveredMin / 60) * 10) / 10;
    var variance = Math.round((delivered - contract) * 10) / 10;
    rows.push({
      name: l.name,
      staffId: l.staffId || "",
      contract: contract,
      delivered: delivered,
      variance: variance,
      status: contract <= 0 ? "No contract set" : (variance >= 0 ? "Met / over" : "Below contract")
    });
  });
  window.__lecturerHoursPayload = { month: monthVal, rows: rows };
  var body = document.getElementById("lecturerHoursResult");
  if (!body) return;
  body.innerHTML = '<div class="card__body"><p class="muted-note">Regular lecture logs only — remedial hours are excluded.</p><table class="data-table"><thead><tr><th>Lecturer</th><th>Staff ID</th><th>Contract h/mo</th><th>Delivered (regular logs)</th><th>Variance</th><th>Status</th></tr></thead><tbody>' +
    rows.map(function(r) {
      return "<tr><td>" + escapeHtml(r.name) + "</td><td>" + escapeHtml(r.staffId) + "</td><td>" + r.contract +
        "</td><td>" + r.delivered + "</td><td>" + r.variance + "</td><td>" + escapeHtml(r.status) + "</td></tr>";
    }).join("") + "</tbody></table></div>";
}

function printLecturerHoursPack() {
  var p = window.__lecturerHoursPayload;
  if (!p) { alert("Build the report first."); return; }
  var rows = p.rows.map(function(r, i) {
    return "<tr><td>" + (i + 1) + "</td><td>" + r.name + "</td><td>" + r.staffId + "</td><td>" + r.contract +
      "</td><td>" + r.delivered + "</td><td>" + r.variance + "</td><td>" + r.status + "</td></tr>";
  }).join("");
  var w = window.open("", "_blank");
  if (!w) return;
  w.document.write("<!DOCTYPE html><html><head><title>Lecturer Contract Hours</title><style>" +
    (typeof eocnsReportStyles === "function" ? eocnsReportStyles() : "body{font-family:Georgia,serif;padding:24px} table{border-collapse:collapse;width:100%} th,td{border:1px solid #ccc;padding:6px}") +
    "</style></head><body>" +
    "<h1>EOCNS LECTURER HOURS REPORT<span class=\"gold\">Contract vs regular delivered · " + p.month + "</span></h1>" +
    "<div class=\"sub\">Delivered hours from regular lecture logs only. Remedial system hours are reported separately.</div><hr class=\"rule\"/>" +
    "<table><thead><tr><th>#</th><th>Lecturer</th><th>Staff ID</th><th>Contract</th><th>Delivered</th><th>Variance</th><th>Status</th></tr></thead><tbody>" +
    rows + "</tbody></table>" +
    amendmentFooterHtml(typeof entries !== "undefined" ? entries : (window.__lastQaReportEntries || [])) + "<div class=\"footer\">Eastern Oak College of Nursing Sciences · Generated " + new Date().toLocaleString() + "</div></body></html>");
  w.document.close();
  setTimeout(function() { w.print(); }, 300);
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

function printRemWeeklyPack() {
  var d = window.__remWeekly;
  if (!d) { alert("Build weekly analysis first"); return; }
  var byProg = {};
  d.studentRows.forEach(function(s) {
    var p = s.programme || "Other";
    byProg[p] = byProg[p] || [];
    byProg[p].push(s);
  });
  var progTables = Object.keys(byProg).map(function(p) {
    var rows = byProg[p].map(function(s, i) {
      return "<tr><td>" + (i + 1) + "</td><td>" + escapeHtml(s.name) + "</td><td>" + escapeHtml(s.matric) +
        "</td><td>" + escapeHtml((s.courses || []).join(", ")) + "</td><td>" + s.present + "/" + s.possible +
        "</td><td>" + (s.pct != null ? s.pct + "%" : "—") + "</td></tr>";
    }).join("");
    return "<h2>STUDENT ATTENDANCE — " + escapeHtml(p.toUpperCase()) + " (Course-Specific)</h2>" +
      "<table><thead><tr><th>#</th><th>Name</th><th>Matric</th><th>Enrolled Courses</th><th>Sess. P/Poss</th><th>%</th></tr></thead><tbody>" +
      rows + "</tbody></table>";
  }).join("");
  var lecRows = d.lecturerRows.map(function(r) {
    return "<tr><td>" + escapeHtml(r.lecturer) + "</td><td>" + escapeHtml((r.courses || []).join(", ")) +
      "</td><td>" + r.taught + "h</td><td>" + r.missed + "h</td></tr>";
  }).join("");
  var perfectNames = d.perfect.slice(0, 8).map(function(s) { return s.name; }).join(", ");
  var w = window.open("", "_blank");
  if (!w) return;
  w.document.write("<!DOCTYPE html><html><head><title>Remedial Weekly QA</title><style>" + eocnsReportStyles() +
    ".pill{display:inline-block;padding:10px 14px;margin:4px;border-radius:8px;border:1px solid #c5cdd8;text-align:center;min-width:90px}" +
    ".pill strong{display:block;font-size:1.3rem}</style></head><body>" +
    "<div class=\"sub\">EOCNS Quality Assurance Department · Remedial Classes Report · Confidential</div>" +
    "<h1>EOCNS QUALITY ASSURANCE REPORT<span class=\"gold\">FOR THE REMEDIAL CLASSES</span></h1>" + sessionCoverHtml() +
    "<div class=\"sub\">" + escapeHtml(d.start) + " – " + escapeHtml(d.end) + "<br/>Course-Specific Student &amp; Lecturer Attendance Analysis</div><hr class=\"rule\"/>" +
    "<h2>EXECUTIVE SUMMARY</h2>" +
    "<div class=\"kpi\">" +
    "<div class=\"k-sched\"><strong>" + d.registered + "</strong><span>Registered</span></div>" +
    "<div class=\"k-del\"><strong>" + d.lectureDays + "</strong><span>Lecture days</span></div>" +
    "<div class=\"k-rate\"><strong>" + d.avg + "%</strong><span>Avg attendance</span></div>" +
    "<div class=\"k-miss\"><strong>" + d.zero + "</strong><span>Zero att.</span></div></div>" +
    "<p>Method: Attendance % is calculated only against the specific courses each student is enrolled in (official Remedial Enrolment List). Presence is counted only on days when those enrolled courses were taught.</p>" +
    (perfectNames ? ("<p><strong>" + d.perfect.length + " perfect (100%):</strong> " + escapeHtml(perfectNames) + (d.perfect.length > 8 ? " …" : "") + "</p>") : "") +
    "<h2>LECTURER ATTENDANCE &amp; HOURS</h2>" +
    "<table><thead><tr><th>Lecturer</th><th>Courses</th><th>Hrs Taught</th><th>Hrs Missed</th></tr></thead><tbody>" +
    (lecRows || "<tr><td colspan=\"4\">No logs</td></tr>") + "</tbody></table>" +
    progTables +
    amendmentFooterHtml(d.logsIn || []) + "<div class=\"footer\">Report prepared by Quality Assurance Department · Generated " + new Date().toLocaleString() + "<br/>— End of Report —</div></body></html>");
  w.document.close();
  setTimeout(function() { w.print(); }, 400);
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

function printRemSummaryPack() {
  var d = window.__remSummary;
  if (!d) { alert("Build summary first"); return; }
  var byProg = {};
  d.studentRows.forEach(function(s) {
    var p = s.programme || "Other";
    byProg[p] = byProg[p] || [];
    byProg[p].push(s);
  });
  Object.keys(byProg).forEach(function(p) {
    byProg[p].sort(function(a, b) { return (b.pct || 0) - (a.pct || 0); });
  });
  var tables = Object.keys(byProg).map(function(p) {
    var rows = byProg[p].map(function(s, i) {
      return "<tr><td>" + (i + 1) + "</td><td>" + escapeHtml(s.name) + "</td><td>" + escapeHtml(s.matric) +
        "</td><td>" + (s.pct != null ? s.pct + "%" : "—") + "</td><td>" + escapeHtml(s.status) + "</td></tr>";
    }).join("");
    return "<h2>" + escapeHtml(p.toUpperCase()) + " — AGGREGATE ATTENDANCE</h2>" +
      "<table><thead><tr><th>#</th><th>Name</th><th>Matric</th><th>Avg %</th><th>Status</th></tr></thead><tbody>" + rows + "</tbody></table>";
  }).join("");
  var lecRows = d.lecturerRows.map(function(r) {
    return "<tr><td>" + escapeHtml(r.lecturer) + "</td><td>" + escapeHtml((r.courses || []).join(", ")) +
      "</td><td>" + r.taught + "h</td><td>" + r.missed + "h</td></tr>";
  }).join("");
  var w = window.open("", "_blank");
  if (!w) return;
  w.document.write("<!DOCTYPE html><html><head><title>Remedial Summary</title><style>" + eocnsReportStyles() + "</style></head><body>" +
    "<div class=\"sub\">EOCNS Quality Assurance Department · Remedial Classes Report · Confidential</div>" +
    "<h1>EOCNS QUALITY ASSURANCE REPORT<span class=\"gold\">REMEDIAL CLASSES — COMPREHENSIVE SUMMARY</span></h1>" +
    "<div class=\"sub\">" + escapeHtml(d.start) + " – " + escapeHtml(d.end) + "<br/>Aggregate Student &amp; Lecturer Performance</div><hr class=\"rule\"/>" +
    "<h2>EXECUTIVE OVERVIEW</h2>" +
    "<p>This summary consolidates course-specific attendance for the remedial period. Percentages reflect only the courses each student is required to offer. Lecturer hours are totalled from remedial lecture logs.</p>" +
    tables +
    "<h2>LECTURER HOURS — PERIOD COMBINED</h2>" +
    "<table><thead><tr><th>Lecturer</th><th>Courses</th><th>Hrs Taught</th><th>Hrs Missed</th></tr></thead><tbody>" +
    lecRows + "</tbody></table>" +
    "<div class=\"footer\">Report prepared by Quality Assurance Department · Method: official Remedial Enrolment List<br/>— End of Comprehensive Summary —</div></body></html>");
  w.document.close();
  setTimeout(function() { w.print(); }, 400);
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

})();
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
  document.getElementById("btnPrintWeeklyQa") && document.getElementById("btnPrintWeeklyQa").addEventListener("click", function() { printWeeklyProfessionalPack(); });
  document.getElementById("btnPrintMonthlyQa") && document.getElementById("btnPrintMonthlyQa").addEventListener("click", function() { printMonthlyProfessionalPack(); });
  document.getElementById("btnPrintDailyReport") && document.getElementById("btnPrintDailyReport").addEventListener("click", printDailyLectureReport);
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
  return ACTIVE_SESSION;
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
  if (title) title.textContent = ACTIVE_SESSION.name;
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
    obj.sessionId = ACTIVE_SESSION.id;
    obj.sessionName = ACTIVE_SESSION.name;
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
  return students.slice().sort((a, b) => String(a.name).localeCompare(String(b.name))).map(s => ({
    serial: s.serial || "",
    name: s.name,
    programme: s.programme === "Midwifery" ? "Midwifery" : "General Nursing",
    level: Number(s.level) || (s.programme === "Midwifery" ? 200 : 100),
    code: s.programme === "Midwifery" ? "MID" : "GNS",
    regNo: s.regNo || "",
    hostel: s.hostel || "",
    status: s.status || "Active",
    gender: s.gender || "",
    phone: s.phone || "",
    id: s.id || "",
  }));
}

function studentFromRepo(s) {
  const now = new Date().toISOString();
  return {
    id: s.id || ("stu_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7)),
    name: s.name,
    regNo: s.regNo || "",
    programme: s.programme === "Midwifery" ? "Midwifery" : "Nursing",
    level: String(s.level || ""),
    gender: s.gender || "",
    hostel: s.hostel || "",
    status: s.status || "Active",
    phone: s.phone || "",
    serial: s.serial || "",
    createdAt: s.createdAt || now,
    updatedAt: s.updatedAt || now,
  };
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

async function reloadAllFromRepo(force) {
  if (force && !confirm("Replace ALL local data (students, lecturers, sessions, QA logs, audit) with the repository files?")) return;
  const status = document.getElementById("qaPublishStatus");
  if (status) status.textContent = "Reloading from repository…";
  try {
    for (const store of ["students", "lecturers", "sessions", "qa_entries", "audit"]) {
      await clearStore(store);
    }
    const studentRows = await fetchRepoJson(DATA_FILES.students);
    if (Array.isArray(studentRows)) {
      for (const s of studentRows) await put("students", studentFromRepo(s));
    }
    for (const [store, path] of [
      ["lecturers", DATA_FILES.lecturers],
      ["sessions", DATA_FILES.sessions],
      ["qa_entries", DATA_FILES.qa_entries],
      ["audit", DATA_FILES.audit],
    ]) {
      try {
        const rows = await fetchRepoJson(path);
        if (Array.isArray(rows)) await putMany(store, rows);
      } catch (e) { console.warn(path, e); }
    }
    // keep OFFICIAL_STUDENTS in sync for seed button
    try {
      OFFICIAL_STUDENTS = Array.isArray(studentRows) ? studentRows : [];
    } catch (_) {}
    await renderStudentsTable();
    await renderLecturersTable();
    await renderSessionsList();
    await renderAuditLog();
    refreshDashboardStats();
    if (status) status.textContent = "Reloaded all data from the repository.";
    if (force) alert("Local cache replaced with repository data.");
  } catch (err) {
    console.error(err);
    if (status) status.textContent = "Reload failed: " + (err.message || String(err));
    if (force) alert("Reload failed: " + (err.message || String(err)));
  }
}

async function exportFullSnapshot() {
  if (!isQaOfficer()) {
    alert("Sign in as QA Officer in Settings to export.");
    return;
  }
  const payload = {
    exportedAt: new Date().toISOString(),
    source: "EOCNS Attendance System",
    students: await getAll("students"),
    lecturers: await getAll("lecturers"),
    sessions: await getAll("sessions"),
    qa_entries: await getAll("qa_entries"),
    audit: await getAll("audit"),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "EOCNS_FullSnapshot_" + new Date().toISOString().slice(0, 10) + ".json";
  a.click();
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
    clearDirty();
    if (status) status.textContent = "Published via worker: " + ((body.updated && body.updated.join(", ")) || "ok");
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
    (lecturersCache || []).filter(function(l) { return !l.status || l.status === "Active"; })
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


async function getQaEntries() {
  var all = await getAll("qa_entries");
  await loadActiveSession();
  var filtered = all.filter(entryInActiveSession);
  window.__lastQaReportEntries = filtered;
  return filtered;
}

async function openQaEntryForm(id) {
  if (!isQaOfficer()) { alert("Sign in as QA Officer to log or edit lectures."); return; }
  if (!requireActiveSession("Lecture logging")) return;
  await seedQaDatalists();
  var form = document.getElementById("qaEntryForm");
  if (form) form.reset();
  document.getElementById("qaEntryId").value = id || "";
  var amend = document.getElementById("qaEntryAmendBlock");
  if (amend) amend.hidden = !id;
  var saveBtn = document.getElementById("qaEntrySaveBtn");
  if (saveBtn) saveBtn.textContent = id ? "Save changes to master sheet" : "Save entry";
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
  var id = document.getElementById("qaEntryId").value || null;
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
  var absentRaw = (document.getElementById("qaEntryAbsent") && document.getElementById("qaEntryAbsent").value.trim()) || "";
  var absent = absentRaw ? absentRaw.split(/[,;\n]+/).map(function(s) { return s.trim(); }).filter(Boolean) : [];
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
    lectureSummary: summary, assignment: assignment, remark: remark, absent: absent, updatedAt: now
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


async function ensureTimetables() {
  if (TIMETABLES_CACHE) return TIMETABLES_CACHE;
  try { TIMETABLES_CACHE = await fetchRepoJson(DATA_FILES.timetables); } catch (_) { TIMETABLES_CACHE = {}; }
  return TIMETABLES_CACHE;
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
function parseExcludeDates(text) {
  return new Set((text || "").split(",").map(function(s) { return s.trim(); }).filter(Boolean));
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


async function renderCoursesTable() {
  COURSES_CACHE = await getAll("courses");
  var tbody = document.getElementById("coursesTableBody");
  if (!tbody) return;
  tbody.innerHTML = COURSES_CACHE.length ? COURSES_CACHE.map(function(c) {
    var del = isQaOfficer() ? ('<button type="button" class="icon-btn-sm" data-del-course="' + escapeHtml(c.code) + '">Del</button>') : "";
    return "<tr><td>" + escapeHtml(c.code) + "</td><td>" + escapeHtml(c.name || "") + "</td><td class=\"qa-edit-only\">" + del + "</td></tr>";
  }).join("") : "<tr><td colspan=\"3\">No courses yet</td></tr>";
  tbody.querySelectorAll("[data-del-course]").forEach(function(btn) {
    btn.addEventListener("click", async function() {
      if (!isQaOfficer()) return;
      if (!confirm("Remove course " + btn.getAttribute("data-del-course") + "?")) return;
      await del("courses", btn.getAttribute("data-del-course"));
      await writeAudit({ action: "delete", entity: "courses", entityId: btn.getAttribute("data-del-course"), reason: "Course removed" });
      await renderCoursesTable();
      seedQaDatalists && seedQaDatalists();
    });
  });
}
async function addCoursePrompt() {
  if (!isQaOfficer()) return;
  var code = prompt("Course code (e.g. NUS 121)");
  if (!code) return;
  var name = prompt("Course title", "") || "";
  await put("courses", { code: code.trim(), name: name.trim(), classKeys: [] });
  await writeAudit({ action: "create", entity: "courses", entityId: code.trim(), reason: "New course " + code });
  await renderCoursesTable();
  if (typeof seedQaDatalists === "function") seedQaDatalists();
}


var WEEKDAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

async function renderTimetableEditor() {
  await ensureTimetables();
  var key = (document.getElementById("ttClassKey") && document.getElementById("ttClassKey").value) || "100_nursing";
  var tt = TIMETABLES_CACHE[key] || { class_name: key, slots: [] };
  if (!tt.slots) tt.slots = [];
  TIMETABLES_CACHE[key] = tt;
  var tbody = document.getElementById("timetableSlotsBody");
  if (!tbody) return;
  if (!tt.slots.length) {
    tbody.innerHTML = "<tr><td colspan=\"6\">No slots — add one.</td></tr>";
    return;
  }
  tbody.innerHTML = tt.slots.map(function(s, idx) {
    return "<tr>" +
      "<td><input type=\"number\" min=\"0\" max=\"6\" data-tt-field=\"weekday\" data-tt-i=\"" + idx + "\" value=\"" + (s.weekday != null ? s.weekday : 0) + "\" style=\"width:56px\" /></td>" +
      "<td><input type=\"text\" data-tt-field=\"code\" data-tt-i=\"" + idx + "\" value=\"" + escapeHtml(s.code || "") + "\" style=\"min-width:90px\" /></td>" +
      "<td><input type=\"text\" data-tt-field=\"start\" data-tt-i=\"" + idx + "\" value=\"" + escapeHtml(s.start || "") + "\" style=\"width:80px\" /></td>" +
      "<td><input type=\"text\" data-tt-field=\"end\" data-tt-i=\"" + idx + "\" value=\"" + escapeHtml(s.end || "") + "\" style=\"width:80px\" /></td>" +
      "<td><input type=\"number\" min=\"0\" step=\"0.5\" data-tt-field=\"hours\" data-tt-i=\"" + idx + "\" value=\"" + (s.hours != null ? s.hours : 1) + "\" style=\"width:64px\" /></td>" +
      "<td class=\"qa-edit-only\"><button type=\"button\" class=\"icon-btn-sm\" data-tt-del=\"" + idx + "\">Del</button></td></tr>";
  }).join("");
  tbody.querySelectorAll("[data-tt-field]").forEach(function(inp) {
    inp.addEventListener("change", function() {
      var i = Number(inp.getAttribute("data-tt-i"));
      var f = inp.getAttribute("data-tt-field");
      var key2 = (document.getElementById("ttClassKey") && document.getElementById("ttClassKey").value) || "100_nursing";
      if (!TIMETABLES_CACHE[key2]) TIMETABLES_CACHE[key2] = { slots: [] };
      var slot = TIMETABLES_CACHE[key2].slots[i];
      if (!slot) return;
      if (f === "weekday" || f === "hours") slot[f] = Number(inp.value);
      else slot[f] = inp.value.trim();
    });
  });
  tbody.querySelectorAll("[data-tt-del]").forEach(function(btn) {
    btn.addEventListener("click", function() {
      if (!isQaOfficer()) return;
      var key2 = (document.getElementById("ttClassKey") && document.getElementById("ttClassKey").value) || "100_nursing";
      var i = Number(btn.getAttribute("data-tt-del"));
      TIMETABLES_CACHE[key2].slots.splice(i, 1);
      renderTimetableEditor();
    });
  });
}
function addTimetableSlot() {
  if (!isQaOfficer()) return;
  var key = (document.getElementById("ttClassKey") && document.getElementById("ttClassKey").value) || "100_nursing";
  if (!TIMETABLES_CACHE) TIMETABLES_CACHE = {};
  if (!TIMETABLES_CACHE[key]) TIMETABLES_CACHE[key] = { class_name: key, slots: [] };
  TIMETABLES_CACHE[key].slots.push({ weekday: 0, code: "", start: "08:00", end: "10:00", hours: 2 });
  renderTimetableEditor();
}
async function saveTimetableLocal() {
  if (!isQaOfficer()) return;
  // values already bound on change; ensure read all inputs once more
  var key = (document.getElementById("ttClassKey") && document.getElementById("ttClassKey").value) || "100_nursing";
  await writeAudit({ action: "update", entity: "timetables", entityId: key, reason: "Timetable edited for " + key });
  alert("Timetable saved in this browser. Click Publish all data to write data/timetables.json via the worker.");
}
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



function eocnsReportStyles() {
  return "body{font-family:'Segoe UI',system-ui,Georgia,serif;color:#1a1a2e;padding:28px;max-width:960px;margin:0 auto;line-height:1.45}" +
    "h1{color:#1B3A6B;text-align:center;margin:0 0 4px;font-size:1.45rem;letter-spacing:0.02em}" +
    "h1 .gold{color:#c9a227;display:block;font-size:0.95rem;font-weight:600;margin-top:4px}" +
    ".sub{text-align:center;color:#555;margin:0 0 8px;font-size:12px}" +
    ".rule{height:3px;background:linear-gradient(90deg,#1B3A6B,#c9a227,#1B3A6B);border:0;margin:12px 0 20px}" +
    "h2{color:#1B3A6B;font-size:0.95rem;margin:28px 0 10px;padding:8px 12px;background:#e8eef7;border-left:4px solid #1B3A6B}" +
    "table{width:100%;border-collapse:collapse;font-size:12px;margin-top:8px}" +
    "th{background:#1B3A6B;color:#fff;padding:8px;text-align:left;font-weight:600}" +
    "td{border:1px solid #c5cdd8;padding:7px 8px;vertical-align:top}" +
    "tr:nth-child(even) td{background:#f7f9fc}" +
    ".kpi{display:flex;gap:10px;flex-wrap:wrap;margin:12px 0 8px}" +
    ".kpi>div{flex:1;min-width:110px;text-align:center;border:1px solid #c5cdd8;border-radius:8px;padding:12px 8px;background:#fff}" +
    ".kpi strong{display:block;font-size:1.45rem;line-height:1.2}" +
    ".kpi span{font-size:10px;text-transform:uppercase;letter-spacing:0.04em;color:#555}" +
    ".k-sched strong{color:#1B3A6B}.k-del strong{color:#0f766e}.k-miss strong{color:#b91c1c}.k-rate strong{color:#0f766e}" +
    ".meta-grid{display:grid;grid-template-columns:140px 1fr;gap:4px 12px;font-size:13px;margin:8px 0 12px}" +
    ".meta-grid b{color:#334}" +
    ".absent-head th{background:#b91c1c}" +
    ".note{background:#fff8e6;border-left:4px solid #c9a227;padding:8px 12px;font-size:12px;margin:8px 0}" +
    ".charts{display:flex;flex-wrap:wrap;gap:20px;align-items:center;margin:12px 0}" +
    ".footer{margin-top:36px;font-size:12px;color:#555;text-align:center}" +
    "@media print{body{padding:12px} .kpi>div{-webkit-print-color-adjust:exact;print-color-adjust:exact}}";
}

function classLabelFromKey(key) {
  var map = { "100_nursing": "100 LEVEL NURSING DEPARTMENT", "200_nursing": "200 LEVEL NURSING DEPARTMENT", "200_midwifery": "200 LEVEL MIDWIFERY DEPARTMENT" };
  return map[key] || String(key || "CLASS").replace(/_/g, " ").toUpperCase();
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
  var date = (document.getElementById("qaDailyDate") && document.getElementById("qaDailyDate").value) || "";
  var classKey = (document.getElementById("qaDailyClass") && document.getElementById("qaDailyClass").value) || "100_nursing";
  if (!date) { alert("Choose a date on Daily QA first."); return; }
  await ensureTimetables();
  var tt = TIMETABLES_CACHE[classKey] || { slots: [] };
  var weekday = (new Date(date + "T12:00:00").getDay() + 6) % 7; // Mon=0
  var slots = (tt.slots || []).filter(function(s) { return Number(s.weekday) === weekday; });
  var entries = (await getQaEntries()).filter(function(e) { return e.date === date && e.classKey === classKey; });
  var sessionName = "Academic Session";
  try {
    var sessions = await getAll("sessions");
    var active = sessions.find(function(s) { return s.status === "Active"; });
    if (active) sessionName = active.name;
  } catch (_) {}
  var students = await getAll("students");
  function resolveAbsent(list) {
    if (!list || !list.length) return [];
    return list.map(function(a) {
      var sn = String(a).trim();
      var found = students.find(function(s) { return String(s.serial) === sn || String(s.regNo) === sn || (s.name && s.name.toLowerCase() === sn.toLowerCase()); });
      return { sn: found ? (found.serial || sn) : sn, name: found ? found.name : sn };
    });
  }
  var scheduleRows = "";
  var courseBlocks = "";
  var allAbsent = {};
  var used = slots.length ? slots : entries.map(function(e) {
    return { code: (e.course || "").split("—")[0].trim(), start: e.start, end: e.end, hours: e.duration ? e.duration / 60 : 2 };
  });
  used.forEach(function(slot, i) {
    var code = slot.code || "";
    var ent = entries.find(function(e) {
      return (e.course || "").indexOf(code) >= 0 || (e.start && slot.start && e.start === slot.start);
    }) || entries[i];
    var remark = ent ? (ent.status === "Held" ? "Lecture held" : ent.status === "Missed" ? "Lecture missed" : (ent.status || "Logged")) : "Not logged";
    var title = ent ? (ent.course || code) : courseName(code);
    scheduleRows += "<tr><td>" + (i + 1) + "</td><td>" + escapeHtml(String(title).replace(/^[^—]+—\s*/, "") || title) +
      "</td><td>" + escapeHtml(code) + "</td><td>" + formatTimeNice(slot.start || (ent && ent.start)) +
      "</td><td>" + formatTimeNice(slot.end || (ent && ent.end)) + "</td><td>" + escapeHtml(remark) + "</td></tr>";
    if (ent) {
      var abs = resolveAbsent(ent.absent);
      abs.forEach(function(a) { allAbsent[a.sn + "|" + a.name] = a; });
      var obj = (ent.objectives || "").split(/[.;\n]+/).map(function(x) { return x.trim(); }).filter(Boolean);
      courseBlocks += "<h2>COURSE " + (i + 1) + " INFORMATION</h2>" +
        "<div class=\"meta-grid\">" +
        "<b>Course Code:</b><span>" + escapeHtml(code || (ent.course || "")) + "</span>" +
        "<b>Course Title:</b><span>" + escapeHtml(ent.course || title) + "</span>" +
        "<b>Lecturer:</b><span>" + escapeHtml(ent.lecturer || "—") + "</span>" +
        "<b>Topic:</b><span>" + escapeHtml(ent.topic || "—") + "</span>" +
        "<b>Date:</b><span>" + formatDateLong(ent.date) + "</span>" +
        "<b>Time:</b><span>" + formatTimeNice(ent.start) + " – " + formatTimeNice(ent.end) + "</span></div>" +
        "<h2>LEARNING OBJECTIVES</h2><ul>" + (obj.length ? obj.map(function(o) { return "<li>" + escapeHtml(o) + "</li>"; }).join("") : "<li>—</li>") + "</ul>" +
        "<h2>LECTURE SUMMARY</h2><p>" + escapeHtml(ent.lectureSummary || "—") + "</p>" +
        "<h2>ASSIGNMENT</h2><div class=\"note\">" + escapeHtml(ent.assignment || "None was given") + "</div>" +
        "<h2>REMARKS</h2><p>" + escapeHtml(ent.remark || "—") + "</p>" +
        "<h2>ABSENT STUDENTS</h2>" +
        (abs.length ? ("<table><thead class=\"absent-head\"><tr><th>S/N</th><th>Full Name</th></tr></thead><tbody>" +
          abs.map(function(a) { return "<tr><td>" + escapeHtml(String(a.sn)) + "</td><td>" + escapeHtml(a.name) + "</td></tr>"; }).join("") +
          "</tbody></table>") : "<p>None recorded.</p>");
    }
  });
  var absentList = Object.keys(allAbsent).map(function(k) { return allAbsent[k]; });
  var registered = students.filter(function(s) {
    if (s.status && s.status !== "Active") return false;
    // best-effort class filter by level in classKey
    if (classKey.indexOf("100") === 0) return String(s.level) === "100";
    if (classKey.indexOf("200") === 0) return String(s.level) === "200";
    return true;
  }).length;
  var present = Math.max(0, registered - absentList.length);
  var w = window.open("", "_blank");
  if (!w) return;
  w.document.write("<!DOCTYPE html><html><head><title>Today's Lecture Report</title><style>" + eocnsReportStyles() + "</style></head><body>" +
    "<h1>TODAY'S LECTURE(S) REPORT<span class=\"gold\">" + escapeHtml(classLabelFromKey(classKey)) + "</span></h1>" +
    "<div class=\"sub\">" + escapeHtml(classKey.replace(/_.*/, "").toUpperCase() + " Level") + " · " + escapeHtml(sessionName) + " · " + formatDateLong(date) + "</div>" +
    "<hr class=\"rule\"/>" +
    "<h2>COURSE SCHEDULE / TIMETABLE</h2>" +
    "<table><thead><tr><th>S/N</th><th>Course Title</th><th>Course Code</th><th>Start Time</th><th>End Time</th><th>Remark</th></tr></thead><tbody>" +
    (scheduleRows || "<tr><td colspan=\"6\">No timetable slots or logs for this day.</td></tr>") + "</tbody></table>" +
    courseBlocks +
    "<h2>CONSOLIDATED ATTENDANCE REPORT</h2>" +
    "<div class=\"kpi\"><div class=\"k-sched\"><strong>" + registered + "</strong><span>Total registered</span></div>" +
    "<div class=\"k-del\"><strong>" + present + "</strong><span>Present (est.)</span></div>" +
    "<div class=\"k-miss\"><strong>" + absentList.length + "</strong><span>Absent (unique)</span></div></div>" +
    "<h2>CONSOLIDATED ABSENT STUDENTS LIST</h2>" +
    (absentList.length ? ("<table><thead class=\"absent-head\"><tr><th>S/N</th><th>Full Name</th></tr></thead><tbody>" +
      absentList.map(function(a) { return "<tr><td>" + escapeHtml(String(a.sn)) + "</td><td>" + escapeHtml(a.name) + "</td></tr>"; }).join("") +
      "</tbody></table>") : "<p>No absentees recorded in lecture logs for this day.</p>") +
    amendmentFooterHtml(typeof entries !== "undefined" ? entries : (window.__lastQaReportEntries || [])) + "<div class=\"footer\">Eastern Oak College of Nursing Sciences · Generated " + new Date().toLocaleString() + " · EOCNS QA System</div>" +
    "</body></html>");
  w.document.close();
  setTimeout(function() { w.print(); }, 400);
}

function printWeeklyProfessionalPack(payload) {
  var p = payload || window.__weeklyQaPayload;
  if (!p) { alert("Build the weekly report first."); return; }
  var compliance = p.scheduled ? Math.round((p.delivered / p.scheduled) * 1000) / 10 : 0;
  var courseRows = (p.courseRows || []).map(function(r) {
    return "<tr><td>" + escapeHtml(r.course) + "</td><td>" + escapeHtml(r.lecturer) + "</td><td>" + r.sched +
      "</td><td>" + r.deliv + "</td><td>" + r.missed + "</td><td>" + r.hrs + "</td><td>" + escapeHtml(r.status) +
      "</td><td>" + r.pct + "</td></tr>";
  }).join("");
  var dayRows = (p.dayRows || []).map(function(r) {
    return "<tr><td>" + escapeHtml(r.date) + "</td><td>" + escapeHtml(r.day) + "</td><td>" + escapeHtml(r.course) +
      "</td><td>" + escapeHtml(r.lecturer) + "</td><td>" + escapeHtml(r.topic) + "</td><td>" + escapeHtml(r.time) +
      "</td><td>" + escapeHtml(r.hrs) + "</td></tr>";
  }).join("");
  var pie = [
    { label: "Delivered", value: p.delivered, color: "#0f766e" },
    { label: "Missed", value: p.missed, color: "#b91c1c" }
  ].filter(function(x) { return x.value > 0; });
  var bars = (p.courseRows || []).slice(0, 10).map(function(r) {
    return { label: String(r.course).slice(0, 8), value: r.deliv, color: "#1d4ed8" };
  });
  var w = window.open("", "_blank");
  if (!w) return;
  w.document.write("<!DOCTYPE html><html><head><title>EOCNS Weekly QA Report</title><style>" + eocnsReportStyles() + "</style></head><body>" +
    "<h1>EOCNS QA REPORT — WEEKLY<span class=\"gold\">Staff Teaching Commitment &amp; Lecture Attendance</span></h1>" +
    "<div class=\"sub\"><strong>" + escapeHtml(classLabelFromKey(p.classKey)) + "</strong><br/>" +
    escapeHtml(p.periodLabel) + "<br/>Generated: " + new Date().toLocaleString() + " · Excluded: " + escapeHtml(p.excluded || "None") + "</div>" +
    "<hr class=\"rule\"/>" +
    "<h2>WEEKLY SUMMARY</h2>" +
    "<div class=\"kpi\">" +
    "<div class=\"k-sched\"><strong>" + p.scheduled + "</strong><span>Scheduled</span></div>" +
    "<div class=\"k-del\"><strong>" + p.delivered + "</strong><span>Delivered</span></div>" +
    "<div class=\"k-miss\"><strong>" + p.missed + "</strong><span>Missed</span></div>" +
    "<div class=\"k-rate\"><strong>" + compliance + "%</strong><span>Compliance</span></div></div>" +
    "<p>Teaching delivery for this window stands at <strong>" + compliance + "%</strong> " +
    "(" + p.delivered + " of " + p.scheduled + " scheduled contact sessions logged as held). " +
    (p.missed ? (p.missed + " session(s) were missed and should be rescheduled or explained in audit.") : "No missed sessions were recorded.") + "</p>" +
    "<h2>COURSE COMPLIANCE</h2>" +
    "<table><thead><tr><th>Course</th><th>Lecturer(s)</th><th>Sched</th><th>Deliv</th><th>Missed</th><th>Hrs Del</th><th>Status</th><th>%</th></tr></thead><tbody>" +
    (courseRows || "<tr><td colspan=\"8\">No course data.</td></tr>") + "</tbody></table>" +
    "<h2>VISUAL ANALYSIS</h2><div class=\"charts\">" +
    (typeof svgPie === "function" ? svgPie(pie, 160) : "") +
    (typeof svgBars === "function" ? svgBars(bars, 340, 150) : "") + "</div>" +
    "<h2>DAY-BY-DAY BREAKDOWN</h2>" +
    "<table><thead><tr><th>Date</th><th>Day</th><th>Course</th><th>Lecturer</th><th>Topic</th><th>Time</th><th>Hrs</th></tr></thead><tbody>" +
    (dayRows || "<tr><td colspan=\"7\">No lectures logged in range.</td></tr>") + "</tbody></table>" +
    "<div class=\"footer\">— End of Weekly QA Report — · EOCNS QA Attendance System</div></body></html>");
  w.document.close();
  setTimeout(function() { w.print(); }, 400);
}

function printMonthlyProfessionalPack(payload) {
  var p = payload || window.__monthlyQaPayload;
  if (!p) { alert("Build the monthly report first."); return; }
  var w = window.open("", "_blank");
  if (!w) return;
  var courseRows = (p.courseRows || []).map(function(r) {
    return "<tr><td>" + escapeHtml(r.course) + "</td><td>" + r.scheduled + "</td><td>" + r.held + "</td><td>" + r.missed + "</td><td>" + r.rate + "%</td></tr>";
  }).join("");
  var pie = [
    { label: "Held", value: p.delivered, color: "#0f766e" },
    { label: "Missed", value: p.missed, color: "#b91c1c" }
  ].filter(function(x) { return x.value > 0; });
  w.document.write("<!DOCTYPE html><html><head><title>EOCNS Monthly QA Report</title><style>" + eocnsReportStyles() + "</style></head><body>" +
    "<h1>EOCNS — MONTHLY QA REPORT<span class=\"gold\">Lecture Delivery &amp; Compliance Analysis</span></h1>" +
    "<div class=\"sub\"><strong>" + escapeHtml(classLabelFromKey(p.classKey)) + "</strong><br/>Reporting period: " + escapeHtml(p.monthLabel) +
    " · Generated " + new Date().toLocaleString() + "</div><hr class=\"rule\"/>" +
    "<h2>EXECUTIVE SUMMARY</h2>" +
    "<div class=\"kpi\">" +
    "<div class=\"k-sched\"><strong>" + p.scheduled + "</strong><span>Scheduled</span></div>" +
    "<div class=\"k-del\"><strong>" + p.delivered + "</strong><span>Delivered</span></div>" +
    "<div class=\"k-miss\"><strong>" + p.missed + "</strong><span>Missed</span></div>" +
    "<div class=\"k-rate\"><strong>" + p.rate + "%</strong><span>Compliance</span></div></div>" +
    "<p>Over <strong>" + escapeHtml(p.monthLabel) + "</strong>, the class recorded <strong>" + p.rate + "%</strong> delivery compliance. " +
    "This pack is intended for academic board review and continuous quality improvement.</p>" +
    "<h2>COURSE PERFORMANCE</h2>" +
    "<table><thead><tr><th>Course</th><th>Scheduled</th><th>Held</th><th>Missed</th><th>Rate</th></tr></thead><tbody>" +
    (courseRows || "<tr><td colspan=\"5\">No data</td></tr>") + "</tbody></table>" +
    "<h2>VISUAL ANALYSIS</h2><div class=\"charts\">" +
    (typeof svgPie === "function" ? svgPie(pie, 160) : "") + "</div>" +
    "<div class=\"footer\">— End of Monthly QA Report — · Eastern Oak College of Nursing Sciences</div></body></html>");
  w.document.close();
  setTimeout(function() { w.print(); }, 400);
}


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

async function renderRemedialTable() {
  var list = await getAll("remedial");
  list.sort(function(a, b) { return String(b.date || "").localeCompare(String(a.date || "")); });
  var tbody = document.getElementById("remedialTableBody");
  var empty = document.getElementById("remedialEmpty");
  if (!tbody) return;
  if (!list.length) {
    tbody.innerHTML = "";
    if (empty) empty.hidden = false;
    return;
  }
  if (empty) empty.hidden = true;
  tbody.innerHTML = list.map(function(r) {
    var actions = isQaOfficer()
      ? ('<button type="button" class="icon-btn-sm" data-edit-rem="' + r.id + '">Edit</button> <button type="button" class="icon-btn-sm" data-del-rem="' + r.id + '">Del</button>')
      : "";
    return "<tr><td>" + escapeHtml(r.date || "") + "</td><td>" + escapeHtml(r.course || "") +
      "</td><td>" + escapeHtml(r.lecturer || "") + "</td><td>" + escapeHtml(String(r.hours || "")) +
      "</td><td>" + escapeHtml(r.classKey || "") + "</td><td>" + escapeHtml(r.reason || "") +
      "</td><td>" + escapeHtml(r.ref || "") + "</td><td class=\"qa-edit-only\">" + actions + "</td></tr>";
  }).join("");
  tbody.querySelectorAll("[data-edit-rem]").forEach(function(btn) {
    btn.addEventListener("click", function() { openRemedialForm(btn.getAttribute("data-edit-rem")); });
  });
  tbody.querySelectorAll("[data-del-rem]").forEach(function(btn) {
    btn.addEventListener("click", function() { deleteRemedial(btn.getAttribute("data-del-rem")); });
  });
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

async function openRemedialForm(id) {
  if (!isQaOfficer()) { alert("Sign in as QA Officer to log remedial sessions."); return; }
  await fillRemedialSelects();
  document.getElementById("remedialForm").reset();
  document.getElementById("remedialId").value = id || "";
  document.getElementById("remedialModalTitle").textContent = id ? "Edit remedial session" : "Log remedial session";
  if (id) {
    var list = await getAll("remedial");
    var r = list.find(function(x) { return x.id === id; });
    if (r) {
      document.getElementById("remedialDate").value = r.date || "";
      document.getElementById("remedialHours").value = r.hours != null ? r.hours : 2;
      document.getElementById("remedialCourse").value = r.course || "";
      document.getElementById("remedialLecturer").value = r.lecturer || "";
      document.getElementById("remedialClass").value = r.classKey || "100_nursing";
      document.getElementById("remedialReason").value = r.reason || "";
      document.getElementById("remedialRef").value = r.ref || "";
    }
  }
  document.getElementById("remedialModal").hidden = false;
}

function closeRemedialForm() {
  document.getElementById("remedialModal").hidden = true;
}

async function saveRemedial(e) {
  e.preventDefault();
  if (!isQaOfficer()) return;
  var id = document.getElementById("remedialId").value || null;
  var ref = (document.getElementById("remedialRef").value || "").trim();
  if (!ref) { alert("Official REF is required."); return; }
  var now = new Date().toISOString();
  var rec = {
    id: id || ("rem_" + Date.now().toString(36)),
    date: document.getElementById("remedialDate").value,
    hours: Number(document.getElementById("remedialHours").value) || 0,
    course: document.getElementById("remedialCourse").value,
    lecturer: document.getElementById("remedialLecturer").value,
    classKey: document.getElementById("remedialClass").value,
    reason: (document.getElementById("remedialReason").value || "").trim(),
    ref: ref,
    updatedAt: now
  };
  if (!id) rec.createdAt = now;
  await put("remedial", rec);
  await writeAudit({
    action: id ? "update" : "create",
    entity: "remedial",
    entityId: rec.id,
    externalRef: ref,
    reason: id ? "Remedial session updated" : "Remedial session logged",
    details: { date: rec.date, course: rec.course, lecturer: rec.lecturer, hours: rec.hours }
  });
  markDirty("remedial");
  closeRemedialForm();
  await renderRemedialTable();
}

async function deleteRemedial(id) {
  if (!isQaOfficer()) return;
  var ref = prompt("Official REF to delete this remedial record:", "REF/EOCNS/QA/");
  if (!ref || !String(ref).trim()) return;
  if (!confirm("Delete this remedial session?")) return;
  await del("remedial", id);
  await writeAudit({ action: "delete", entity: "remedial", entityId: id, externalRef: String(ref).trim(), reason: "Remedial session deleted" });
  markDirty("remedial");
  await renderRemedialTable();
}

async function buildLecturerHoursReport() {
  var monthVal = (document.getElementById("lecturerHoursMonth") && document.getElementById("lecturerHoursMonth").value) || "";
  if (!monthVal) { alert("Choose a month."); return; }
  await loadLecturers();
  var qa = await getQaEntries();
  var rem = await getAll("remedial");
  var rows = [];
  lecturersCache.filter(function(l) { return !l.status || l.status === "Active"; }).forEach(function(l) {
    var contract = Number(l.contractHoursPerMonth) || 0;
    var deliveredMin = 0;
    qa.forEach(function(e) {
      if (String(e.date || "").slice(0, 7) !== monthVal) return;
      if ((e.lecturer || "") !== l.name) return;
      if (e.status === "Missed") return;
      deliveredMin += Number(e.duration) || 0;
    });
    var remHours = 0;
    rem.forEach(function(r) {
      if (String(r.date || "").slice(0, 7) !== monthVal) return;
      if ((r.lecturer || "") !== l.name) return;
      remHours += Number(r.hours) || 0;
    });
    var delivered = Math.round((deliveredMin / 60) * 10) / 10 + remHours;
    var variance = Math.round((delivered - contract) * 10) / 10;
    rows.push({
      name: l.name,
      staffId: l.staffId || "",
      contract: contract,
      delivered: delivered,
      remedial: remHours,
      variance: variance,
      status: contract <= 0 ? "No contract set" : (variance >= 0 ? "Met / over" : "Below contract")
    });
  });
  window.__lecturerHoursPayload = { month: monthVal, rows: rows };
  var body = document.getElementById("lecturerHoursResult");
  if (!body) return;
  body.innerHTML = '<div class="card__body"><table class="data-table"><thead><tr><th>Lecturer</th><th>Staff ID</th><th>Contract h/mo</th><th>Delivered (logs+remedial)</th><th>Of which remedial</th><th>Variance</th><th>Status</th></tr></thead><tbody>' +
    rows.map(function(r) {
      return "<tr><td>" + escapeHtml(r.name) + "</td><td>" + escapeHtml(r.staffId) + "</td><td>" + r.contract +
        "</td><td>" + r.delivered + "</td><td>" + r.remedial + "</td><td>" + r.variance + "</td><td>" + escapeHtml(r.status) + "</td></tr>";
    }).join("") + "</tbody></table></div>";
}

function printLecturerHoursPack() {
  var p = window.__lecturerHoursPayload;
  if (!p) { alert("Build the report first."); return; }
  var rows = p.rows.map(function(r, i) {
    return "<tr><td>" + (i + 1) + "</td><td>" + r.name + "</td><td>" + r.staffId + "</td><td>" + r.contract +
      "</td><td>" + r.delivered + "</td><td>" + r.remedial + "</td><td>" + r.variance + "</td><td>" + r.status + "</td></tr>";
  }).join("");
  var w = window.open("", "_blank");
  if (!w) return;
  w.document.write("<!DOCTYPE html><html><head><title>Lecturer Contract Hours</title><style>" +
    (typeof eocnsReportStyles === "function" ? eocnsReportStyles() : "body{font-family:Georgia,serif;padding:24px} table{border-collapse:collapse;width:100%} th,td{border:1px solid #ccc;padding:6px}") +
    "</style></head><body>" +
    "<h1>EOCNS LECTURER HOURS REPORT<span class=\"gold\">Contract vs delivered · " + p.month + "</span></h1>" +
    "<div class=\"sub\">Delivered hours = lecture log durations (Held/Partial) + remedial hours for the month.</div><hr class=\"rule\"/>" +
    "<table><thead><tr><th>#</th><th>Lecturer</th><th>Staff ID</th><th>Contract</th><th>Delivered</th><th>Remedial</th><th>Variance</th><th>Status</th></tr></thead><tbody>" +
    rows + "</tbody></table>" +
    amendmentFooterHtml(typeof entries !== "undefined" ? entries : (window.__lastQaReportEntries || [])) + "<div class=\"footer\">Eastern Oak College of Nursing Sciences · Generated " + new Date().toLocaleString() + "</div></body></html>");
  w.document.close();
  setTimeout(function() { w.print(); }, 300);
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

function printRemWeeklyPack() {
  var d = window.__remWeekly;
  if (!d) { alert("Build weekly analysis first"); return; }
  var byProg = {};
  d.studentRows.forEach(function(s) {
    var p = s.programme || "Other";
    byProg[p] = byProg[p] || [];
    byProg[p].push(s);
  });
  var progTables = Object.keys(byProg).map(function(p) {
    var rows = byProg[p].map(function(s, i) {
      return "<tr><td>" + (i + 1) + "</td><td>" + escapeHtml(s.name) + "</td><td>" + escapeHtml(s.matric) +
        "</td><td>" + escapeHtml((s.courses || []).join(", ")) + "</td><td>" + s.present + "/" + s.possible +
        "</td><td>" + (s.pct != null ? s.pct + "%" : "—") + "</td></tr>";
    }).join("");
    return "<h2>STUDENT ATTENDANCE — " + escapeHtml(p.toUpperCase()) + " (Course-Specific)</h2>" +
      "<table><thead><tr><th>#</th><th>Name</th><th>Matric</th><th>Enrolled Courses</th><th>Sess. P/Poss</th><th>%</th></tr></thead><tbody>" +
      rows + "</tbody></table>";
  }).join("");
  var lecRows = d.lecturerRows.map(function(r) {
    return "<tr><td>" + escapeHtml(r.lecturer) + "</td><td>" + escapeHtml((r.courses || []).join(", ")) +
      "</td><td>" + r.taught + "h</td><td>" + r.missed + "h</td></tr>";
  }).join("");
  var perfectNames = d.perfect.slice(0, 8).map(function(s) { return s.name; }).join(", ");
  var w = window.open("", "_blank");
  if (!w) return;
  w.document.write("<!DOCTYPE html><html><head><title>Remedial Weekly QA</title><style>" + eocnsReportStyles() +
    ".pill{display:inline-block;padding:10px 14px;margin:4px;border-radius:8px;border:1px solid #c5cdd8;text-align:center;min-width:90px}" +
    ".pill strong{display:block;font-size:1.3rem}</style></head><body>" +
    "<div class=\"sub\">EOCNS Quality Assurance Department · Remedial Classes Report · Confidential</div>" +
    "<h1>EOCNS QUALITY ASSURANCE REPORT<span class=\"gold\">FOR THE REMEDIAL CLASSES</span></h1>" + sessionCoverHtml() +
    "<div class=\"sub\">" + escapeHtml(d.start) + " – " + escapeHtml(d.end) + "<br/>Course-Specific Student &amp; Lecturer Attendance Analysis</div><hr class=\"rule\"/>" +
    "<h2>EXECUTIVE SUMMARY</h2>" +
    "<div class=\"kpi\">" +
    "<div class=\"k-sched\"><strong>" + d.registered + "</strong><span>Registered</span></div>" +
    "<div class=\"k-del\"><strong>" + d.lectureDays + "</strong><span>Lecture days</span></div>" +
    "<div class=\"k-rate\"><strong>" + d.avg + "%</strong><span>Avg attendance</span></div>" +
    "<div class=\"k-miss\"><strong>" + d.zero + "</strong><span>Zero att.</span></div></div>" +
    "<p>Method: Attendance % is calculated only against the specific courses each student is enrolled in (official Remedial Enrolment List). Presence is counted only on days when those enrolled courses were taught.</p>" +
    (perfectNames ? ("<p><strong>" + d.perfect.length + " perfect (100%):</strong> " + escapeHtml(perfectNames) + (d.perfect.length > 8 ? " …" : "") + "</p>") : "") +
    "<h2>LECTURER ATTENDANCE &amp; HOURS</h2>" +
    "<table><thead><tr><th>Lecturer</th><th>Courses</th><th>Hrs Taught</th><th>Hrs Missed</th></tr></thead><tbody>" +
    (lecRows || "<tr><td colspan=\"4\">No logs</td></tr>") + "</tbody></table>" +
    progTables +
    amendmentFooterHtml(d.logsIn || []) + "<div class=\"footer\">Report prepared by Quality Assurance Department · Generated " + new Date().toLocaleString() + "<br/>— End of Report —</div></body></html>");
  w.document.close();
  setTimeout(function() { w.print(); }, 400);
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

function printRemSummaryPack() {
  var d = window.__remSummary;
  if (!d) { alert("Build summary first"); return; }
  var byProg = {};
  d.studentRows.forEach(function(s) {
    var p = s.programme || "Other";
    byProg[p] = byProg[p] || [];
    byProg[p].push(s);
  });
  Object.keys(byProg).forEach(function(p) {
    byProg[p].sort(function(a, b) { return (b.pct || 0) - (a.pct || 0); });
  });
  var tables = Object.keys(byProg).map(function(p) {
    var rows = byProg[p].map(function(s, i) {
      return "<tr><td>" + (i + 1) + "</td><td>" + escapeHtml(s.name) + "</td><td>" + escapeHtml(s.matric) +
        "</td><td>" + (s.pct != null ? s.pct + "%" : "—") + "</td><td>" + escapeHtml(s.status) + "</td></tr>";
    }).join("");
    return "<h2>" + escapeHtml(p.toUpperCase()) + " — AGGREGATE ATTENDANCE</h2>" +
      "<table><thead><tr><th>#</th><th>Name</th><th>Matric</th><th>Avg %</th><th>Status</th></tr></thead><tbody>" + rows + "</tbody></table>";
  }).join("");
  var lecRows = d.lecturerRows.map(function(r) {
    return "<tr><td>" + escapeHtml(r.lecturer) + "</td><td>" + escapeHtml((r.courses || []).join(", ")) +
      "</td><td>" + r.taught + "h</td><td>" + r.missed + "h</td></tr>";
  }).join("");
  var w = window.open("", "_blank");
  if (!w) return;
  w.document.write("<!DOCTYPE html><html><head><title>Remedial Summary</title><style>" + eocnsReportStyles() + "</style></head><body>" +
    "<div class=\"sub\">EOCNS Quality Assurance Department · Remedial Classes Report · Confidential</div>" +
    "<h1>EOCNS QUALITY ASSURANCE REPORT<span class=\"gold\">REMEDIAL CLASSES — COMPREHENSIVE SUMMARY</span></h1>" +
    "<div class=\"sub\">" + escapeHtml(d.start) + " – " + escapeHtml(d.end) + "<br/>Aggregate Student &amp; Lecturer Performance</div><hr class=\"rule\"/>" +
    "<h2>EXECUTIVE OVERVIEW</h2>" +
    "<p>This summary consolidates course-specific attendance for the remedial period. Percentages reflect only the courses each student is required to offer. Lecturer hours are totalled from remedial lecture logs.</p>" +
    tables +
    "<h2>LECTURER HOURS — PERIOD COMBINED</h2>" +
    "<table><thead><tr><th>Lecturer</th><th>Courses</th><th>Hrs Taught</th><th>Hrs Missed</th></tr></thead><tbody>" +
    lecRows + "</tbody></table>" +
    "<div class=\"footer\">Report prepared by Quality Assurance Department · Method: official Remedial Enrolment List<br/>— End of Comprehensive Summary —</div></body></html>");
  w.document.close();
  setTimeout(function() { w.print(); }, 400);
}

// legacy stubs so old listeners don't crash
async function renderRemedialTable() { showRemTab("setup"); }
async function openRemedialForm() { showRemTab("logging"); }
function closeRemedialForm() {}
async function saveRemedial(e) { if (e && e.preventDefault) e.preventDefault(); }
async function deleteRemedial() {}



// ===== Full backup / restore, student delete, profile, handover =====
async function collectFullBackupPayload() {
  await loadActiveSession();
  var stores = ["students","lecturers","sessions","qa_entries","audit","programmes","levels","courses","attendance","hostel_runs","remedial","remedial_enrolment","remedial_assignments","remedial_logs"];
  var data = {};
  for (var i = 0; i < stores.length; i++) {
    var name = stores[i];
    try { data[name] = await getAll(name); } catch (_) { data[name] = []; }
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
  // never put secrets that don't belong - publishWorkerKey is already in config by design
  return {
    format: "eocns-full-backup",
    version: 1,
    exportedAt: new Date().toISOString(),
    activeSessionId: ACTIVE_SESSION && ACTIVE_SESSION.id || null,
    site: "https://travis-global.github.io/qa_attendance/",
    data: data
  };
}

async function downloadFullBackup() {
  if (!isQaOfficer()) { alert("Sign in as QA Officer to download a full backup."); return; }
  var payload = await collectFullBackupPayload();
  var blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  var a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "EOCNS_full_backup_" + new Date().toISOString().slice(0, 10) + ".json";
  document.body.appendChild(a); a.click();
  setTimeout(function() { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  try {
    await writeAudit({ action: "export", entity: "backup", entityId: "full", reason: "Full system backup downloaded" });
  } catch (_) {}
  var st = document.getElementById("fullBackupStatus");
  if (st) { st.hidden = false; st.textContent = "Backup downloaded. Store it offline securely."; st.style.color = "#0f766e"; }
}

async function restoreFullBackupFromFile(file) {
  if (!isQaOfficer()) return;
  if (!file) return;
  if (!confirm("Restore will overwrite local data with the backup file. You should Publish afterwards so the repository matches. Continue?")) return;
  var text = await file.text();
  var payload;
  try { payload = JSON.parse(text); } catch (e) { alert("Invalid JSON file."); return; }
  var data = payload.data || payload;
  async function rep(store, rows) {
    if (!Array.isArray(rows)) return;
    // clear + put
    var existing = await getAll(store);
    for (var i = 0; i < existing.length; i++) {
      try { await del(store, existing[i].id != null ? existing[i].id : existing[i].key); } catch (_) {}
    }
    for (var j = 0; j < rows.length; j++) {
      try { await put(store, rows[j]); } catch (err) { console.warn(store, err); }
    }
  }
  var listStores = ["students","lecturers","sessions","qa_entries","audit","programmes","levels","courses","attendance","hostel_runs","remedial","remedial_enrolment","remedial_assignments","remedial_logs"];
  for (var i = 0; i < listStores.length; i++) {
    if (data[listStores[i]]) await rep(listStores[i], data[listStores[i]]);
  }
  if (data.remedial_meta) await put("remedial_meta", { key: "main", value: data.remedial_meta });
  if (data.remedial_timetable) await put("remedial_timetable", { key: "main", value: data.remedial_timetable });
  if (data.timetables) TIMETABLES_CACHE = data.timetables;
  if (data.config && data.config.qaPin) {
    APP_CONFIG = Object.assign({}, APP_CONFIG, data.config);
  }
  markDirty("full restore");
  try {
    await writeAudit({ action: "import", entity: "backup", entityId: "full", reason: "Full system restore from backup file", details: { exportedAt: payload.exportedAt } });
  } catch (_) {}
  await refreshSessionChrome();
  try { await renderStudentsTable(); } catch (_) {}
  var st = document.getElementById("fullBackupStatus");
  if (st) { st.hidden = false; st.textContent = "Restore complete locally. Publish to repository when ready."; st.style.color = "#0f766e"; }
  alert("Restore complete. Publish from Settings so the repository matches this backup.");
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
  if (!isQaOfficer()) return;
  var ids = Array.prototype.map.call(document.querySelectorAll(".stu-select:checked"), function(el) { return el.value; });
  if (!ids.length) { alert("Select at least one student."); return; }
  var ref = prompt("Official REF for bulk delete of " + ids.length + " student(s):", "REF/EOCNS/QA/");
  if (!ref || !String(ref).trim()) return;
  var reason = prompt("Reason for bulk deletion:", "Bulk removal from master list");
  if (!reason || !String(reason).trim()) return;
  if (!confirm("Permanently delete " + ids.length + " student(s)?")) return;
  for (var i = 0; i < ids.length; i++) {
    var list = await getAll("students");
    var s = list.find(function(x) { return x.id === ids[i]; });
    await del("students", ids[i]);
    await writeAudit({
      action: "delete",
      entity: "students",
      entityId: ids[i],
      externalRef: String(ref).trim(),
      reason: String(reason).trim() + " (bulk)",
      details: { name: s && s.name, regNo: s && s.regNo }
    });
  }
  markDirty("student bulk delete");
  await renderStudentsTable();
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
  var body = document.getElementById("studentProfileBody");
  body.innerHTML =
    "<p><strong>Reg. No:</strong> " + escapeHtml(s.regNo || "—") + "</p>" +
    "<p><strong>Programme / Level:</strong> " + escapeHtml(s.programme || "—") + " · " + escapeHtml(String(s.level || "—")) + "</p>" +
    "<p><strong>Hostel:</strong> " + escapeHtml(s.hostel || "—") + "</p>" +
    "<p><strong>Status:</strong> " + escapeHtml(s.status || "Active") + "</p>" +
    "<p><strong>Gender / Phone:</strong> " + escapeHtml(s.gender || "—") + " · " + escapeHtml(s.phone || "—") + "</p>" +
    "<p><strong>Active session scope:</strong> " + (ACTIVE_SESSION ? escapeHtml(ACTIVE_SESSION.name) : "—") + "</p>" +
    "<p><strong>Remedial enrolment:</strong> " + (rem.length ? rem.map(function(r) { return escapeHtml((r.courses || []).join(", ")); }).join(" | ") : "None on file") + "</p>";
  document.getElementById("studentProfileDrawer").hidden = false;
}

function closeStudentProfile() {
  document.getElementById("studentProfileDrawer").hidden = true;
}

function sessionCoverHtml() {
  if (!ACTIVE_SESSION) return "<div class=\"sub\">No active session selected</div>";
  return "<div class=\"sub\"><strong>Academic session:</strong> " + escapeHtml(ACTIVE_SESSION.name) +
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

// Patch student table actions: View + Delete
(function patchStudentRender() {
  var prev = renderStudentsTable;
  if (typeof prev !== "function") return;
  renderStudentsTable = async function() {
    await prev.apply(this, arguments);
    var tbody = document.getElementById("studentsTableBody");
    if (!tbody || !isQaOfficer()) {
      // still allow profile view for viewers via name click if we add data-profile
    }
    if (!tbody) return;
    // Re-bind richer actions on last column
    tbody.querySelectorAll("tr").forEach(function(tr) {
      var cb = tr.querySelector(".stu-select");
      var id = cb && cb.value;
      if (!id) return;
      var act = tr.querySelector("td.qa-edit-only:last-child");
      if (!act) return;
      act.innerHTML =
        '<button type="button" class="icon-btn-sm" data-profile-stu="' + id + '">View</button> ' +
        '<button type="button" class="icon-btn-sm" data-edit-stu="' + id + '">Edit</button> ' +
        '<button type="button" class="icon-btn-sm" data-del-stu="' + id + '">Del</button>';
    });
    tbody.querySelectorAll("[data-profile-stu]").forEach(function(btn) {
      btn.addEventListener("click", function() { openStudentProfile(btn.getAttribute("data-profile-stu")); });
    });
    tbody.querySelectorAll("[data-edit-stu]").forEach(function(btn) {
      btn.addEventListener("click", function() { openStudentForm(btn.getAttribute("data-edit-stu")); });
    });
    tbody.querySelectorAll("[data-del-stu]").forEach(function(btn) {
      btn.addEventListener("click", function() { deleteStudentById(btn.getAttribute("data-del-stu")); });
    });
    // Name click → profile for everyone
    tbody.querySelectorAll("tr").forEach(function(tr) {
      var cb = tr.querySelector(".stu-select");
      var id = cb && cb.value;
      var main = tr.querySelector(".cell-main");
      if (main && id) {
        main.style.cursor = "pointer";
        main.title = "Open profile";
        main.addEventListener("click", function() { openStudentProfile(id); });
      }
    });
  };

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

})();

// Wire UI
document.getElementById("btnFullBackupDownload") && document.getElementById("btnFullBackupDownload").addEventListener("click", downloadFullBackup);
document.getElementById("btnFullBackupRestore") && document.getElementById("btnFullBackupRestore").addEventListener("click", function() {
  document.getElementById("fullBackupFileInput") && document.getElementById("fullBackupFileInput").click();
});
document.getElementById("fullBackupFileInput") && document.getElementById("fullBackupFileInput").addEventListener("change", function(e) {
  var f = e.target.files && e.target.files[0];
  if (f) restoreFullBackupFromFile(f);
  e.target.value = "";
});
document.getElementById("btnBulkDeleteStudents") && document.getElementById("btnBulkDeleteStudents").addEventListener("click", deleteSelectedStudents);
document.getElementById("btnCloseStudentProfile") && document.getElementById("btnCloseStudentProfile").addEventListener("click", closeStudentProfile);
document.getElementById("btnCloseStudentProfile2") && document.getElementById("btnCloseStudentProfile2").addEventListener("click", closeStudentProfile);
document.getElementById("studentProfileBackdrop") && document.getElementById("studentProfileBackdrop").addEventListener("click", closeStudentProfile);
document.getElementById("btnProfileEdit") && document.getElementById("btnProfileEdit").addEventListener("click", function() {
  if (window.__profileStudentId) { closeStudentProfile(); openStudentForm(window.__profileStudentId); }
});
document.getElementById("btnProfileDelete") && document.getElementById("btnProfileDelete").addEventListener("click", function() {
  if (window.__profileStudentId) { closeStudentProfile(); deleteStudentById(window.__profileStudentId); }
});
document.getElementById("btnPrintHandoverPack") && document.getElementById("btnPrintHandoverPack").addEventListener("click", printOfficerHandoverSheet);

// Alias legacy snapshot buttons to full backup
document.getElementById("btnExportSnapshot") && document.getElementById("btnExportSnapshot").addEventListener("click", downloadFullBackup);
document.getElementById("btnExportStudents") && document.getElementById("btnExportStudents").addEventListener("click", downloadFullBackup);


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

})();
