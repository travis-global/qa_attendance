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
  students: { title: "Students", subtitle: "Master student registry" },
  lecturers: { title: "Lecturers", subtitle: "Staff & course assignments" },
  hostel: { title: "Hostel Attendance", subtitle: "Gate log to boarding fee reports" },
  sessions: { title: "Academic Sessions", subtitle: "Programmes, levels and timetables" },
  "qa-daily": { title: "Daily QA", subtitle: "Lecture compliance" },
  "qa-weekly": { title: "Weekly QA", subtitle: "Weekly teaching compliance" },
  "qa-monthly": { title: "Monthly QA", subtitle: "Full monthly quality assurance" },
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
  if (viewId === "sessions") renderSessionsList();
  if (viewId === "dashboard") refreshDashboardStats();
  if (viewId === "audit") renderAuditLog();
  if (viewId === "hostel") initHostelView();
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
const DB_VERSION = 5;
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
  studentsCache = await getAll("students");
  studentsCache.sort((a, b) => a.name.localeCompare(b.name));
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
  const tbody = document.getElementById("lecturersTableBody");
  const empty = document.getElementById("lecturersEmpty");
  const countEl = document.getElementById("lecturersCount");
  if (!tbody) return;
  const search = (document.getElementById("lecturerSearch") && document.getElementById("lecturerSearch").value || "").toLowerCase().trim();
  let list = lecturersCache;
  if (search) list = list.filter(function(l) {
    return (l.name || "").toLowerCase().indexOf(search) >= 0 || (l.staffId || "").toLowerCase().indexOf(search) >= 0;
  });
  if (countEl) countEl.textContent = list.length + " lecturer" + (list.length !== 1 ? "s" : "");
  if (!list.length) {
    tbody.innerHTML = "";
    if (empty) empty.hidden = false;
    return;
  }
  if (empty) empty.hidden = true;
  tbody.innerHTML = list.map(function(l) {
    var actions = isQaOfficer()
      ? ('<button type="button" class="icon-btn-sm" data-edit-lec="' + l.id + '">Edit</button> <button type="button" class="icon-btn-sm" data-del-lec="' + l.id + '">Del</button>')
      : "";
    return "<tr><td><div class=\"cell-main\">" + escapeHtml(l.name) + "</div></td><td>" + escapeHtml(l.staffId || "—") +
      "</td><td>" + escapeHtml((l.courses || []).join(", ") || "—") + "</td><td>" + escapeHtml(l.phone || "—") +
      "</td><td><span class=\"badge " + (l.status === "Active" ? "badge--green" : "badge--muted") + "\">" + escapeHtml(l.status || "Active") +
      "</span></td><td class=\"qa-edit-only\">" + actions + "</td></tr>";
  }).join("");
  tbody.querySelectorAll("[data-edit-lec]").forEach(function(btn) {
    btn.addEventListener("click", function() { openLecturerForm(btn.getAttribute("data-edit-lec")); });
  });
  tbody.querySelectorAll("[data-del-lec]").forEach(function(btn) {
    btn.addEventListener("click", function() { deleteLecturer(btn.getAttribute("data-del-lec")); });
  });
}
async function openLecturerForm(id) {
  if (!isQaOfficer()) { alert("Sign in as QA Officer to manage lecturers."); return; }
  document.getElementById("lecturerForm").reset();
  var title = document.getElementById("lecturerModalTitle");
  var staffEl = document.getElementById("lecturerStaffId");
  if (!id) {
    title.textContent = "Add Lecturer";
    staffEl.value = await generateStaffId();
    staffEl.readOnly = true;
  } else {
    title.textContent = "Edit Lecturer";
    await loadLecturers();
    var l = lecturersCache.find(function(x) { return x.id === id; });
    if (!l) return;
    document.getElementById("lecturerName").value = l.name || "";
    staffEl.value = l.staffId || "";
    staffEl.readOnly = true;
    document.getElementById("lecturerPhone").value = l.phone || "";
    document.getElementById("lecturerCourses").value = (l.courses || []).join(", ");
    if (document.getElementById("lecturerStatus")) document.getElementById("lecturerStatus").value = l.status || "Active";
    // stash edit id
    document.getElementById("lecturerForm").dataset.editId = id;
  }
  if (!id) document.getElementById("lecturerForm").dataset.editId = "";
  document.getElementById("lecturerModal").hidden = false;
  document.getElementById("lecturerName").focus();
}
async function saveLecturer(e) {
  e.preventDefault();
  if (!isQaOfficer()) return;
  var name = document.getElementById("lecturerName").value.trim();
  if (!name) { alert("Name is required"); return; }
  var staffId = document.getElementById("lecturerStaffId").value.trim();
  if (!staffId) staffId = await generateStaffId();
  var phone = document.getElementById("lecturerPhone").value.trim();
  var courses = document.getElementById("lecturerCourses").value.split(",").map(function(c) { return c.trim(); }).filter(Boolean);
  var status = (document.getElementById("lecturerStatus") && document.getElementById("lecturerStatus").value) || "Active";
  var now = new Date().toISOString();
  var editId = document.getElementById("lecturerForm").dataset.editId || "";
  var lec;
  if (editId) {
    await loadLecturers();
    lec = lecturersCache.find(function(x) { return x.id === editId; }) || {};
    lec = Object.assign({}, lec, { name: name, staffId: staffId, phone: phone, courses: courses, status: status, updatedAt: now });
    await writeAudit({ action: "update", entity: "lecturers", entityId: lec.id, reason: "Lecturer profile updated", details: { name: name } });
  } else {
    lec = { id: generateId("lec"), name: name, staffId: staffId, phone: phone, courses: courses, status: status, createdAt: now, updatedAt: now };
    await writeAudit({ action: "create", entity: "lecturers", entityId: lec.id, reason: "New lecturer registration", details: { name: name, staffId: staffId } });
  }
  await put("lecturers", lec);
  document.getElementById("lecturerModal").hidden = true;
  markDirty();
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
  document.getElementById("sessionModal").hidden = true;
  markDirty();
  await renderSessionsList();
  refreshDashboardStats();
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

function computeHostelAttendance(rows, startDate, endDate, hostel1Name, hostel2Name) {
  const headerIndex = {};
  rows[0].forEach((v, i) => {
    const k = String(v).trim();
    if (k) headerIndex[k] = i;
  });
  const nameCol = headerIndex["Name"];
  const noCol = headerIndex["No."];
  const dateCol = headerIndex["Date/Time"];
  const statusCol = headerIndex["Status"];
  const locationCol = headerIndex["Location ID"];
  const students = {};
  const attendance = {};
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const rawName = row[nameCol];
    const studentIdRaw = row[noCol];
    if (!rawName || studentIdRaw === "" || studentIdRaw == null) continue;
    const name = String(rawName).trim();
    const studentId = normalizeStudentIdHostel(studentIdRaw);
    const locationRaw = String(row[locationCol] || "").trim();
    let hostel = "Unknown";
    if (locationRaw === "1") hostel = hostel1Name;
    else if (locationRaw === "2") hostel = hostel2Name;
    if (!(studentId in students)) {
      students[studentId] = { name, hostel };
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
  Object.keys(students).sort((a, b) => {
    const na = students[a].name.toLowerCase();
    const nb = students[b].name.toLowerCase();
    return na < nb ? -1 : na > nb ? 1 : 0;
  }).forEach(id => {
    const present = attendance[id] || new Set();
    const dayMarks = dates.map(d => present.has(toDateKeyHostel(d)) ? "" : "A");
    const absentDays = dayMarks.filter(m => m === "A").length;
    if (absentDays === 0) return;
    rows.push({
      id, name: students[id].name, hostel: students[id].hostel,
      dayMarks, absentDays, fine: absentDays * rate,
    });
  });
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
  setHostelStatus("", "");
  if (!hostelParsedRows) {
    setHostelStatus("Please choose a valid attendance file first.", "err");
    return;
  }
  const startDate = parseInputDateHostel(document.getElementById("hostelStartDate").value);
  const endDate = parseInputDateHostel(document.getElementById("hostelEndDate").value);
  if (!startDate || !endDate) {
    setHostelStatus("Please set both a start date and an end date.", "err");
    return;
  }
  if (endDate < startDate) {
    setHostelStatus("End date cannot be before start date.", "err");
    return;
  }
  const rate = Number(document.getElementById("hostelRate").value);
  if (!Number.isFinite(rate) || rate < 0) {
    setHostelStatus("Enter a valid rate per absent day.", "err");
    return;
  }
  const hostel1Name = (document.getElementById("hostel1Name").value || "Hostel 1").trim();
  const hostel2Name = (document.getElementById("hostel2Name").value || "Hostel 2").trim();
  const btn = document.getElementById("btnGenerateHostel");
  btn.disabled = true;
  setHostelStatus("Working…", "");
  try {
    const result = computeHostelAttendance(hostelParsedRows, startDate, endDate, hostel1Name, hostel2Name);
    if (Object.keys(result.students).length === 0) {
      setHostelStatus("No students found in this date range.", "err");
      return;
    }
    const absentees = buildAbsenteeRowsHostel(result.students, result.attendance, result.dates, rate);
    if (absentees.length === 0) {
      setHostelStatus("Nobody was absent in this date range — nothing to report.", "err");
      return;
    }
    const dayHeaders = buildDayHeadersHostel(result.dates);
    renderHostelPreview(absentees, dayHeaders, rate);
    const baseName = buildOutputBaseNameHostel(startDate, endDate);
    downloadHostelWorkbook(absentees, dayHeaders, baseName + ".xlsx");
    setHostelStatus('Done — "' + baseName + '.xlsx" downloaded.', "ok");
  } catch (err) {
    console.error(err);
    setHostelStatus("Something went wrong while building the report.", "err");
  } finally {
    btn.disabled = false;
  }
}


openDB().then(async () => {
  console.log("EOCNS Attendance System ready");
  try {
  try { await hydrateAllFromRepoIfEmpty(); } catch (e) { console.warn("hydrate", e); }
  showView(sessionStorage.getItem("eocns-last-view") || "dashboard");
  try { refreshDashboardStats(); } catch (e) { console.warn("stats", e); }
  initQaOfficerUI();
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
  const todayStr = (function() { var d = new Date(); return d.toISOString().slice(0, 10); })();
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
  document.getElementById("btnAddCourse") && document.getElementById("btnAddCourse").addEventListener("click", addCoursePrompt);
  document.getElementById("btnAddTimetableSlot") && document.getElementById("btnAddTimetableSlot").addEventListener("click", addTimetableSlot);
  document.getElementById("btnSaveTimetable") && document.getElementById("btnSaveTimetable").addEventListener("click", saveTimetableLocal);
  document.getElementById("ttClassKey") && document.getElementById("ttClassKey").addEventListener("change", renderTimetableEditor);
  document.getElementById("btnDownloadAudit") && document.getElementById("btnDownloadAudit").addEventListener("click", downloadAuditJson);
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
  config: "data/config.json",
};
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
  const students = await getAll("students");
  if (students.length === 0) {
    try {
      const rows = await fetchRepoJson(DATA_FILES.students);
      if (Array.isArray(rows) && rows.length) {
        for (const s of rows) await put("students", studentFromRepo(s));
      }
    } catch (e) { console.warn("students hydrate", e); }
  }
  for (const [store, path] of [
    ["lecturers", DATA_FILES.lecturers],
    ["sessions", DATA_FILES.sessions],
    ["qa_entries", DATA_FILES.qa_entries],
    ["audit", DATA_FILES.audit],
    ["programmes", DATA_FILES.programmes],
    ["levels", DATA_FILES.levels],
    ["courses", DATA_FILES.courses],
    ["attendance", DATA_FILES.attendance],
  ]) {
    try {
      const existing = await getAll(store);
      if (existing.length) continue;
      const rows = await fetchRepoJson(path);
      if (Array.isArray(rows) && rows.length) await putMany(store, rows);
    } catch (e) { console.warn(store + " hydrate", e); }
  }
  try { APP_CONFIG = await fetchRepoJson(DATA_FILES.config); } catch (e) { console.warn("config", e); }
  try { TIMETABLES_CACHE = await fetchRepoJson(DATA_FILES.timetables); } catch (e) { TIMETABLES_CACHE = {}; }
  PROGRAMMES_CACHE = await getAll("programmes");
  LEVELS_CACHE = await getAll("levels");
  COURSES_CACHE = await getAll("courses");
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
  try { return await getAll("qa_entries"); }
  catch (_) { return []; }
}

async function openQaEntryForm(id) {
  if (!isQaOfficer()) { alert("Sign in as QA Officer to log lectures."); return; }
  await seedQaDatalists();
  var form = document.getElementById("qaEntryForm");
  if (form) form.reset();
  document.getElementById("qaEntryId").value = id || "";
  var dailyDate = document.getElementById("qaDailyDate") && document.getElementById("qaDailyDate").value;
  var dailyClass = document.getElementById("qaDailyClass") && document.getElementById("qaDailyClass").value;
  document.getElementById("qaEntryDate").value = dailyDate || new Date().toISOString().slice(0, 10);
  if (dailyClass) document.getElementById("qaEntryClass").value = dailyClass;
  document.getElementById("qaEntryModalTitle").textContent = id ? "Edit lecture log" : "Log lecture";
  if (id) {
    var entries = await getQaEntries();
    var ent = entries.find(function(x) { return x.id === id; });
    if (ent) {
      document.getElementById("qaEntryDate").value = ent.date || "";
      document.getElementById("qaEntryClass").value = ent.classKey || "";
      await seedQaDatalists();
      // course/lecturer as option values
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
      if (document.getElementById("qaEntrySummary")) document.getElementById("qaEntrySummary").value = ent.lectureSummary || "";
      if (document.getElementById("qaEntryAssignment")) document.getElementById("qaEntryAssignment").value = ent.assignment || "";
      if (document.getElementById("qaEntryRemark")) document.getElementById("qaEntryRemark").value = ent.remark || "";
      if (document.getElementById("qaEntryAbsent")) document.getElementById("qaEntryAbsent").value = Array.isArray(ent.absent) ? ent.absent.join(", ") : (ent.absent || "");
      calcQaDurationMinutes();
    }
  }
  document.getElementById("qaEntryModal").hidden = false;
}

function closeQaEntryForm() {
  const modal = document.getElementById("qaEntryModal");
  if (modal) modal.hidden = true;
}

async function saveQaEntry(e) {
  e.preventDefault();
  if (!isQaOfficer()) { alert("Sign in as QA Officer to log lectures."); return; }
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
  var now = new Date().toISOString();
  var entry = {
    id: id || ("qa_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)),
    date: date, classKey: classKey, course: course, lecturer: lecturer, status: status,
    duration: duration, start: start, end: end, topic: topic, objectives: objectives,
    lectureSummary: summary, assignment: assignment, remark: remark, absent: absent, updatedAt: now
  };
  if (!id) entry.createdAt = now;
  else {
    var existing = (await getQaEntries()).find(function(x) { return x.id === id; });
    if (existing && existing.createdAt) entry.createdAt = existing.createdAt;
  }
  await put("qa_entries", entry);
  await writeAudit({ action: id ? "update" : "create", entity: "qa_entries", entityId: entry.id, reason: id ? "Lecture log updated" : "Lecture logged", details: { date: date, course: course, status: status, classKey: classKey } });
  markDirty("lecture log");
  document.getElementById("qaEntryModal").hidden = true;
  await renderQaDaily();
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
      escapeHtml(lecturer) + "</td><td>" + mins + "</td>" + editCell + "</tr>";
  });
  entries.forEach(function(e) {
    var onTt = slots.some(function(s) { return e.course && e.course.indexOf(s.code) >= 0; });
    if (onTt) return;
    if (e.status === "Held" || e.status === "Partial") held++;
    if (e.status === "Missed") missed++;
    var badge = e.status === "Held" ? "badge--green" : e.status === "Missed" ? "badge--amber" : "badge--muted";
    rows.push("<tr><td>—</td><td>" + escapeHtml(e.course) + " <span class=\"cell-sub\">extra</span></td><td>—</td><td><span class=\"badge " + badge + "\">" +
      escapeHtml(e.status) + "</span></td><td>" + escapeHtml(e.lecturer || "—") + "</td><td>" + (e.duration != null ? e.duration : "—") +
      "</td><td class=\"qa-edit-only\"></td></tr>");
  });
  if (!rows.length) {
    tbody.innerHTML = "";
    if (empty) { empty.hidden = false; empty.innerHTML = "<h3>No slots</h3><p>No timetable for this class/day.</p>"; }
    if (stats) stats.hidden = true;
    return;
  }
  if (empty) empty.hidden = true;
  tbody.innerHTML = rows.join("");
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
  var startVal = document.getElementById("qaWeekStart") && document.getElementById("qaWeekStart").value;
  var endVal = document.getElementById("qaWeekEnd") && document.getElementById("qaWeekEnd").value;
  if (!startVal || !endVal) { alert("Pick both start and end dates."); return; }
  if (endVal < startVal) { alert("End date must be on or after start date."); return; }
  var classKey = (document.getElementById("qaWeekClass") && document.getElementById("qaWeekClass").value) || "100_nursing";
  var excluded = parseExcludeDates(document.getElementById("qaWeekExclude") && document.getElementById("qaWeekExclude").value);
  var schoolDays = [];
  var cur = new Date(startVal + "T12:00:00");
  var end = new Date(endVal + "T12:00:00");
  while (cur <= end) {
    var iso = cur.toISOString().slice(0, 10);
    var dow = cur.getDay();
    if (dow !== 0 && dow !== 6 && !excluded.has(iso)) schoolDays.push(iso);
    cur.setDate(cur.getDate() + 1);
  }
  var tts = await ensureTimetables();
  var tt = tts[classKey] || { slots: [] };
  var entries = (await getQaEntries()).filter(function(e) { return schoolDays.indexOf(e.date) >= 0 && e.classKey === classKey; });
  var sched = {};
  schoolDays.forEach(function(iso) {
    var wd = weekdayOfDate(iso);
    (tt.slots || []).filter(function(s) { return s.weekday === wd; }).forEach(function(s) {
      sched[s.code] = (sched[s.code] || 0) + 1;
    });
  });
  var delivered = {}, missedMap = {};
  entries.forEach(function(e) {
    var m = (e.course || "").match(/^([A-Z]{2,6}\s*\d{0,3}|PRAC|TUT|PSY|ECA)/i);
    var c = m ? m[1].replace(/\s+/, " ").toUpperCase() : "OTHER";
    if (e.status === "Held" || e.status === "Partial") delivered[c] = (delivered[c] || 0) + 1;
    if (e.status === "Missed") missedMap[c] = (missedMap[c] || 0) + 1;
  });
  var codes = Object.keys(Object.assign({}, sched, delivered, missedMap)).sort();
  var totS = 0, totD = 0, totM = 0;
  var courseRows = codes.map(function(code) {
    var s = sched[code] || 0, d = delivered[code] || 0, m = missedMap[code] || 0;
    totS += s; totD += d; totM += m;
    var status = "Not in Timetable";
    if (s > 0) {
      if (d >= s && m === 0) status = d > s ? "Over-Delivered" : "Fully Delivered";
      else if (d === 0) status = "Fully Missed";
      else status = "Partially Missed";
    }
    var rate = s ? Math.round((Math.min(d, s) / s) * 100) : 0;
    return { code: code, s: s, d: d, m: m, status: status, rate: rate };
  });
  var rate = totS ? Math.round((totD / totS) * 100) : 0;
  var summary = document.getElementById("qaWeeklySummary");
  if (summary) {
    summary.hidden = false;
    summary.innerHTML = "<div class=\"stat-card\"><div class=\"stat-card__body\"><span class=\"stat-card__value\">" + totS + "</span><span class=\"stat-card__label\">Scheduled slots</span></div></div>" +
      "<div class=\"stat-card\"><div class=\"stat-card__body\"><span class=\"stat-card__value\">" + totD + "</span><span class=\"stat-card__label\">Delivered</span></div></div>" +
      "<div class=\"stat-card\"><div class=\"stat-card__body\"><span class=\"stat-card__value\">" + totM + "</span><span class=\"stat-card__label\">Missed logs</span></div></div>" +
      "<div class=\"stat-card\"><div class=\"stat-card__body\"><span class=\"stat-card__value\">" + rate + "%</span><span class=\"stat-card__label\">Compliance</span></div></div>";
  }
  var card = document.getElementById("qaWeeklyCard");
  var dayCard = document.getElementById("qaWeeklyDayCard");
  if (card) card.hidden = false;
  if (dayCard) dayCard.hidden = false;
  var cb = document.getElementById("qaWeeklyCourseBody");
  if (cb) cb.innerHTML = courseRows.map(function(r) {
    return "<tr><td>" + escapeHtml(courseName(r.code)) + "</td><td>" + r.s + "</td><td>" + r.d + "</td><td>" + r.m + "</td><td>" + escapeHtml(r.status) + "</td><td>" + r.rate + "%</td></tr>";
  }).join("") || "<tr><td colspan=\"6\">No data.</td></tr>";
  var DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  var tbody = document.getElementById("qaWeeklyTableBody");
  var dayRows = [];
  schoolDays.forEach(function(iso) {
    var wd = weekdayOfDate(iso);
    (tt.slots || []).filter(function(s) { return s.weekday === wd; }).forEach(function(s) {
      var ent = entries.find(function(e) { return e.date === iso && e.course && e.course.indexOf(s.code) >= 0; });
      dayRows.push("<tr><td>" + iso + "</td><td>" + DAYS[wd] + "</td><td>" + escapeHtml(courseName(s.code)) + "</td><td>" + s.hours + "</td><td>" + escapeHtml(ent ? ent.status : "Pending") + "</td><td>" + escapeHtml(ent ? (ent.lecturer || "—") : "—") + "</td></tr>");
    });
  });
  if (tbody) tbody.innerHTML = dayRows.join("") || "<tr><td colspan=\"6\">No school days.</td></tr>";
  var dl = document.getElementById("btnDownloadWeeklyQa");
  if (dl) dl.onclick = function() {
    downloadJsonReport("QA_Weekly_" + startVal + "_to_" + endVal + "_" + classKey + ".json", {
      startDate: startVal, endDate: endVal, classKey: classKey, schoolDays: schoolDays,
      totals: { scheduled: totS, delivered: totD, missed: totM, rate: rate }, courseRows: courseRows, entries: entries
    });
  };
}

async function buildMonthlyQaReport() {
  var monthVal = document.getElementById("qaMonthInput") && document.getElementById("qaMonthInput").value;
  if (!monthVal) { alert("Pick a month."); return; }
  var classKey = (document.getElementById("qaMonthClass") && document.getElementById("qaMonthClass").value) || "100_nursing";
  var excluded = parseExcludeDates(document.getElementById("qaMonthExclude") && document.getElementById("qaMonthExclude").value);
  var parts = monthVal.split("-").map(Number);
  var y = parts[0], m = parts[1];
  var schoolDays = [];
  var dim = new Date(y, m, 0).getDate();
  for (var day = 1; day <= dim; day++) {
    var d = new Date(y, m - 1, day);
    if (d.getDay() === 0 || d.getDay() === 6) continue;
    var iso = d.toISOString().slice(0, 10);
    if (excluded.has(iso)) continue;
    schoolDays.push(iso);
  }
  var tts = await ensureTimetables();
  var tt = tts[classKey] || { slots: [] };
  var entries = (await getQaEntries()).filter(function(e) { return (e.date || "").indexOf(monthVal) === 0 && e.classKey === classKey; });
  var sched = {};
  schoolDays.forEach(function(iso) {
    var wd = weekdayOfDate(iso);
    (tt.slots || []).filter(function(s) { return s.weekday === wd; }).forEach(function(s) {
      sched[s.code] = (sched[s.code] || 0) + 1;
    });
  });
  var delivered = {}, missedMap = {}, byLec = {};
  entries.forEach(function(e) {
    var mcode = (e.course || "").match(/^([A-Z0-9 ]+?)(?:\s*—|$)/i);
    var c = mcode ? mcode[1].trim() : (e.course || "OTHER");
    if (e.status === "Held" || e.status === "Partial") delivered[c] = (delivered[c] || 0) + 1;
    if (e.status === "Missed") missedMap[c] = (missedMap[c] || 0) + 1;
    var lec = e.lecturer || "—";
    if (!byLec[lec]) byLec[lec] = { held: 0, missed: 0 };
    if (e.status === "Missed") byLec[lec].missed++;
    else if (e.status === "Held" || e.status === "Partial") byLec[lec].held++;
  });
  var totS = 0, totD = 0, totM = 0;
  var codes = Object.keys(Object.assign({}, sched, delivered)).sort();
  var courseRows = codes.map(function(code) {
    var s = sched[code] || 0, d = delivered[code] || 0, m = missedMap[code] || 0;
    totS += s; totD += d; totM += m;
    return { code: code, s: s, d: d, m: m, rate: s ? Math.round((Math.min(d, s) / s) * 100) : 0 };
  });
  var rate = totS ? Math.round((totD / totS) * 100) : 0;
  var summary = document.getElementById("qaMonthlySummary");
  if (summary) {
    summary.hidden = false;
    summary.innerHTML = "<div class=\"stat-card\"><div class=\"stat-card__body\"><span class=\"stat-card__value\">" + totS + "</span><span class=\"stat-card__label\">Scheduled</span></div></div>" +
      "<div class=\"stat-card\"><div class=\"stat-card__body\"><span class=\"stat-card__value\">" + totD + "</span><span class=\"stat-card__label\">Delivered</span></div></div>" +
      "<div class=\"stat-card\"><div class=\"stat-card__body\"><span class=\"stat-card__value\">" + totM + "</span><span class=\"stat-card__label\">Missed</span></div></div>" +
      "<div class=\"stat-card\"><div class=\"stat-card__body\"><span class=\"stat-card__value\">" + rate + "%</span><span class=\"stat-card__label\">Compliance</span></div></div>";
  }
  var detail = document.getElementById("qaMonthlyDetail");
  if (detail) detail.hidden = false;
  var cb = document.getElementById("qaMonthCourseBody");
  var lb = document.getElementById("qaMonthLecBody");
  if (cb) cb.innerHTML = courseRows.map(function(r) {
    return "<tr><td>" + escapeHtml(courseName(r.code)) + "</td><td>" + r.s + "</td><td>" + r.d + "</td><td>" + r.m + "</td><td>" + r.rate + "%</td></tr>";
  }).join("") || "<tr><td colspan=\"5\">No data.</td></tr>";
  if (lb) lb.innerHTML = Object.keys(byLec).sort().map(function(name) {
    var h = byLec[name].held, m = byLec[name].missed, t = h + m;
    return "<tr><td>" + escapeHtml(name) + "</td><td>" + h + "</td><td>" + m + "</td><td>" + (t ? Math.round((h / t) * 100) : 0) + "%</td></tr>";
  }).join("") || "<tr><td colspan=\"4\">No data.</td></tr>";
  var dl = document.getElementById("btnDownloadMonthlyQa");
  if (dl) dl.onclick = function() {
    downloadJsonReport("QA_Monthly_" + monthVal + "_" + classKey + ".json", { month: monthVal, classKey: classKey, totals: { scheduled: totS, delivered: totD, missed: totM, rate: rate }, courseRows: courseRows, byLec: byLec, entries: entries });
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

})();
