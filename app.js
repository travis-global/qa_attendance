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
}
document.querySelectorAll("[data-view]").forEach((el) => {
  el.addEventListener("click", (e) => { e.preventDefault(); showView(el.dataset.view); });
});
document.querySelectorAll("[data-goto]").forEach((el) => {
  el.addEventListener("click", () => showView(el.dataset.goto));
});
const DB_NAME = "eocns_attendance";
const DB_VERSION = 1;
let db = null;
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => { db = req.result; resolve(db); };
    req.onupgradeneeded = (e) => {
      const database = e.target.result;
      if (!database.objectStoreNames.contains("students")) {
        const store = database.createObjectStore("students", { keyPath: "id" });
        store.createIndex("regNo", "regNo", { unique: true });
      }
      if (!database.objectStoreNames.contains("lecturers")) database.createObjectStore("lecturers", { keyPath: "id" });
      if (!database.objectStoreNames.contains("sessions")) database.createObjectStore("sessions", { keyPath: "id" });
      if (!database.objectStoreNames.contains("audit")) {
        const audit = database.createObjectStore("audit", { keyPath: "id", autoIncrement: true });
        audit.createIndex("ref", "ref", { unique: true });
      }
      if (!database.objectStoreNames.contains("meta")) database.createObjectStore("meta", { keyPath: "key" });
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
  const tbody = document.getElementById("studentsTableBody");
  const empty = document.getElementById("studentsEmpty");
  const countEl = document.getElementById("studentsCount");
  if (!tbody) return;
  const search = (document.getElementById("studentSearch")?.value || "").toLowerCase().trim();
  const progFilter = document.getElementById("filterProgramme")?.value || "";
  const levelFilter = document.getElementById("filterLevel")?.value || "";
  let list = studentsCache;
  if (search) list = list.filter(s => s.name.toLowerCase().includes(search) || (s.regNo || "").toLowerCase().includes(search));
  if (progFilter) list = list.filter(s => s.programme === progFilter);
  if (levelFilter) list = list.filter(s => String(s.level) === levelFilter);
  if (countEl) countEl.textContent = list.length + " student" + (list.length !== 1 ? "s" : "");
  if (list.length === 0) { tbody.innerHTML = ""; if (empty) empty.hidden = false; return; }
  if (empty) empty.hidden = true;
  tbody.innerHTML = list.map(s => {
    const isTemp = !s.regNo || String(s.regNo).startsWith("TMP-EOCNS/");
    return "<tr data-id=\"" + s.id + "\"><td><div class=\"cell-main\">" + escapeHtml(s.name) + "</div></td>" +
      "<td><span class=\"badge " + (isTemp ? "badge--amber" : "badge--teal") + "\">" + escapeHtml(s.regNo || "-") + "</span>" + (isTemp ? "<div class=\"cell-sub\">Temporary</div>" : "") + "</td>" +
      "<td>" + escapeHtml(s.programme || "-") + "</td><td>" + (s.level ? s.level + " Level" : "-") + "</td>" +
      "<td>" + escapeHtml(s.hostel || "-") + "</td>" +
      "<td><span class=\"badge " + (s.status === "Active" ? "badge--green" : "badge--muted") + "\">" + escapeHtml(s.status || "Active") + "</span></td>" +
      "<td class=\"actions-cell\"><button class=\"icon-btn-sm\" data-action=\"edit\" data-id=\"" + s.id + "\">Edit</button></td></tr>";
  }).join("");
  tbody.querySelectorAll("[data-action=edit]").forEach(btn => btn.addEventListener("click", () => openStudentForm(btn.dataset.id)));
}
function openStudentForm(id) {
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
  const search = (document.getElementById("lecturerSearch")?.value || "").toLowerCase().trim();
  let list = lecturersCache;
  if (search) list = list.filter(l => l.name.toLowerCase().includes(search) || (l.staffId || "").toLowerCase().includes(search));
  if (countEl) countEl.textContent = list.length + " lecturer" + (list.length !== 1 ? "s" : "");
  if (list.length === 0) { tbody.innerHTML = ""; if (empty) empty.hidden = false; return; }
  if (empty) empty.hidden = true;
  tbody.innerHTML = list.map(l => "<tr><td><div class=\"cell-main\">" + escapeHtml(l.name) + "</div></td><td>" + escapeHtml(l.staffId || "-") + "</td><td>" + escapeHtml((l.courses || []).join(", ") || "-") + "</td><td>" + escapeHtml(l.phone || "-") + "</td><td><span class=\"badge " + (l.status === "Active" ? "badge--green" : "badge--muted") + "\">" + escapeHtml(l.status || "Active") + "</span></td><td></td></tr>").join("");
}
function openLecturerForm() {
  document.getElementById("lecturerForm").reset();
  document.getElementById("lecturerModalTitle").textContent = "Add Lecturer";
  document.getElementById("lecturerModal").hidden = false;
  document.getElementById("lecturerName").focus();
}
async function saveLecturer(e) {
  e.preventDefault();
  const name = document.getElementById("lecturerName").value.trim();
  if (!name) { alert("Name is required"); return; }
  const staffId = document.getElementById("lecturerStaffId").value.trim();
  const phone = document.getElementById("lecturerPhone").value.trim();
  const courses = document.getElementById("lecturerCourses").value.split(",").map(c => c.trim()).filter(Boolean);
  const status = document.getElementById("lecturerStatus").value || "Active";
  const now = new Date().toISOString();
  const lec = { id: generateId("lec"), name, staffId, phone, courses, status, createdAt: now, updatedAt: now };
  await writeAudit({ action: "create", entity: "lecturers", entityId: lec.id, reason: "New lecturer registration", details: { lec } });
  await put("lecturers", lec);
  document.getElementById("lecturerModal").hidden = true;
  await renderLecturersTable();
  refreshDashboardStats();
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
    container.innerHTML = sessions.map(s => "<div class=\"card\" style=\"margin-bottom:12px\"><div class=\"card__body\"><strong>" + escapeHtml(s.name) + "</strong><div class=\"cell-sub\">" + escapeHtml((s.programmes || []).join(", ")) + " · Levels: " + ((s.levels || []).join(", ") || "-") + "</div><span class=\"badge " + (s.status === "Active" ? "badge--green" : "badge--muted") + "\">" + escapeHtml(s.status) + "</span></div></div>").join("");
  }
}
function openSessionForm() {
  document.getElementById("sessionForm").reset();
  document.getElementById("sessionModalTitle").textContent = "New Academic Session";
  document.getElementById("sessionModal").hidden = false;
  document.getElementById("sessionName").focus();
}
async function saveSession(e) {
  e.preventDefault();
  const name = document.getElementById("sessionName").value.trim();
  if (!name) { alert("Session name is required"); return; }
  const startDate = document.getElementById("sessionStart").value;
  const endDate = document.getElementById("sessionEnd").value;
  const status = document.getElementById("sessionStatus").value || "Active";
  const programmes = Array.from(document.getElementById("sessionProgrammes").selectedOptions).map(o => o.value);
  const levels = Array.from(document.querySelectorAll('input[name="sessionLevel"]:checked')).map(cb => Number(cb.value));
  const now = new Date().toISOString();
  const session = { id: generateId("ses"), name, startDate: startDate || null, endDate: endDate || null, programmes, levels, status, createdAt: now, updatedAt: now };
  await writeAudit({ action: "create", entity: "sessions", entityId: session.id, reason: "New academic session", details: { session } });
  await put("sessions", session);
  document.getElementById("sessionModal").hidden = true;
  await renderSessionsList();
  refreshDashboardStats();
}
async function renderAuditLog() {
  const list = await getAll("audit");
  list.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  const container = document.getElementById("auditList");
  if (!container) return;
  if (!list.length) { container.innerHTML = "<p>No audit entries yet.</p>"; return; }
  container.innerHTML = list.map(entry => {
    const sourceLabel = entry.source === "official-letter" ? "<span class=\"badge badge--teal\" style=\"margin-left:6px\">Official Letter</span>" : "<span class=\"badge badge--muted\" style=\"margin-left:6px\">System</span>";
    return "<div class=\"audit-item\"><div class=\"audit-item__ref\">" + escapeHtml(entry.ref) + "</div><div class=\"audit-item__body\"><div class=\"audit-item__action\"><span class=\"badge badge--" + (entry.action === "create" ? "green" : "amber") + "\">" + escapeHtml(entry.action) + "</span> <strong>" + escapeHtml(entry.entity) + "</strong>" + sourceLabel + "</div><div class=\"audit-item__reason\">" + escapeHtml(entry.reason || "-") + "</div><div class=\"audit-item__meta\">" + formatDate(entry.timestamp) + " · " + escapeHtml(entry.user || "System") + "</div></div></div>";
  }).join("");
}
async function refreshDashboardStats() {
  if (!db) return;
  const students = await getAll("students");
  const lecturers = await getAll("lecturers");
  const sessions = await getAll("sessions");
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set("statStudents", students.length || "0");
  set("statLecturers", lecturers.length || "0");
  set("statSessions", sessions.filter(s => s.status === "Active").length || "0");
}


// =========================================================
// OFFICIAL STUDENT SEED (college registers)
// =========================================================
let OFFICIAL_STUDENTS = [];
async function loadOfficialStudentsSeed() {
  if (OFFICIAL_STUDENTS.length) return OFFICIAL_STUDENTS;
  try {
    const res = await fetch("data/students.json?v=6");
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
  try { await hydrateStudentsFromRepoIfEmpty(); } catch (e) { console.warn(e); }
  showView(sessionStorage.getItem("eocns-last-view") || "dashboard");
  refreshDashboardStats();
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
  document.getElementById("btnAddLecturer")?.addEventListener("click", () => openLecturerForm());
  document.getElementById("lecturerForm")?.addEventListener("submit", saveLecturer);
  document.getElementById("lecturerSearch")?.addEventListener("input", renderLecturersTable);
  document.getElementById("lecturerModalBackdrop")?.addEventListener("click", () => { document.getElementById("lecturerModal").hidden = true; });
  document.getElementById("btnAddSession")?.addEventListener("click", () => openSessionForm());
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
}).catch(err => {
  console.error(err);
  alert("Could not initialise the local database.");
});

// =========================================================
// REPO PERSISTENCE + QA OFFICER GATE
// Master list: data/students.json in the repository
// =========================================================
const QA_PIN_KEY = "eocns-qa-session";
// Default PIN for first use — change in Settings later if needed
const QA_DEFAULT_PIN = "EOCNS-QA";

function isQaOfficer() {
  try { return sessionStorage.getItem(QA_PIN_KEY) === "1"; } catch (_) { return false; }
}

function setQaOfficer(on) {
  try {
    if (on) sessionStorage.setItem(QA_PIN_KEY, "1");
    else sessionStorage.removeItem(QA_PIN_KEY);
  } catch (_) {}
  updateQaOfficerUI();
}

function updateQaOfficerUI() {
  const loggedIn = isQaOfficer();
  const out = document.getElementById("qaAuthLoggedOut");
  const inn = document.getElementById("qaAuthLoggedIn");
  if (out) out.hidden = loggedIn;
  if (inn) inn.hidden = !loggedIn;
}

function initQaOfficerUI() {
  updateQaOfficerUI();
  document.getElementById("btnQaLogin")?.addEventListener("click", () => {
    const pin = (document.getElementById("qaPinInput")?.value || "").trim();
    const err = document.getElementById("qaAuthError");
    if (pin === QA_DEFAULT_PIN) {
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
  document.getElementById("btnExportStudents")?.addEventListener("click", exportStudentsJson);
  document.getElementById("btnPublishStudents")?.addEventListener("click", () => {
    if (!isQaOfficer()) return;
    const panel = document.getElementById("qaTokenPanel");
    if (panel) panel.hidden = false;
  });
  document.getElementById("btnConfirmPublish")?.addEventListener("click", publishStudentsToRepo);
  document.getElementById("btnReloadFromRepo")?.addEventListener("click", async () => {
    await reloadStudentsFromRepo(true);
  });
}

async function hydrateStudentsFromRepoIfEmpty() {
  const existing = await getAll("students");
  if (existing.length > 0) return;
  await reloadStudentsFromRepo(false);
}

async function reloadStudentsFromRepo(force) {
  await loadOfficialStudentsSeed();
  if (!OFFICIAL_STUDENTS.length) {
    if (force) alert("Could not load data/students.json from the repository.");
    return;
  }
  const existing = await getAll("students");
  if (existing.length && force) {
    const ok = confirm("Replace local student records with the repository master list (" + OFFICIAL_STUDENTS.length + " names)?");
    if (!ok) return;
    // clear students store
    await new Promise((resolve, reject) => {
      const t = db.transaction("students", "readwrite");
      t.objectStore("students").clear();
      t.oncomplete = () => resolve();
      t.onerror = () => reject(t.error);
    });
  }
  const byName = new Set();
  let added = 0;
  const now = new Date().toISOString();
  for (const s of OFFICIAL_STUDENTS) {
    const nameKey = (s.name || "").toLowerCase().trim();
    if (byName.has(nameKey)) continue;
    byName.add(nameKey);
    await put("students", {
      id: "stu_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      name: s.name,
      regNo: s.regNo || "",
      programme: s.programme === "Midwifery" ? "Midwifery" : "Nursing",
      level: String(s.level || ""),
      gender: "",
      hostel: "",
      status: "Active",
      phone: "",
      serial: s.serial || "",
      createdAt: now,
      updatedAt: now,
    });
    added++;
  }
  if (force || added) {
    await writeAudit({
      action: "create",
      entity: "students",
      entityId: "repo-hydrate",
      reason: "Loaded master list from data/students.json (" + added + " records)",
      details: { added },
    });
  }
  await renderStudentsTable();
  refreshDashboardStats();
  if (force) alert("Loaded " + added + " students from the repository.");
}

async function exportStudentsJson() {
  if (!isQaOfficer()) {
    alert("Sign in as QA Officer in Settings to export.");
    return;
  }
  const students = await getAll("students");
  const payload = {
    exportedAt: new Date().toISOString(),
    source: "EOCNS Attendance System",
    count: students.length,
    students: students.map(s => ({
      name: s.name,
      regNo: s.regNo,
      programme: s.programme,
      level: s.level,
      serial: s.serial || "",
      hostel: s.hostel || "",
      status: s.status || "Active",
    })),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "EOCNS_Students_" + new Date().toISOString().slice(0, 10) + ".json";
  a.click();
}

async function buildRepoStudentsPayload() {
  const students = await getAll("students");
  // Shape matches seed / official list for stable round-trip
  return students
    .slice()
    .sort((a, b) => String(a.name).localeCompare(String(b.name)))
    .map(s => ({
      serial: s.serial || "",
      name: s.name,
      programme: s.programme === "Midwifery" ? "Midwifery" : "General Nursing",
      level: Number(s.level) || (s.programme === "Midwifery" ? 200 : 100),
      code: s.programme === "Midwifery" ? "MID" : "GNS",
      regNo: s.regNo || "",
    }));
}

async function publishStudentsToRepo() {
  if (!isQaOfficer()) return;
  const token = (document.getElementById("qaGithubToken")?.value || "").trim();
  const status = document.getElementById("qaPublishStatus");
  if (!token) {
    if (status) status.textContent = "Paste a fine-grained token with Contents: Read and write on this repository.";
    return;
  }
  if (status) status.textContent = "Publishing to data/students.json…";
  try {
    const payload = await buildRepoStudentsPayload();
    const content = JSON.stringify(payload, null, 2);
    const owner = "travis-global";
    const repo = "qa_attendance";
    const path = "data/students.json";
    // Get current SHA if file exists
    let sha = null;
    const getRes = await fetch("https://api.github.com/repos/" + owner + "/" + repo + "/contents/" + path, {
      headers: { Authorization: "Bearer " + token, Accept: "application/vnd.github+json" },
    });
    if (getRes.ok) {
      const meta = await getRes.json();
      sha = meta.sha;
    }
    const body = {
      message: "Update master student list (" + payload.length + " records) via EOCNS QA System",
      content: btoa(unescape(encodeURIComponent(content))),
      branch: "main",
    };
    if (sha) body.sha = sha;
    const putRes = await fetch("https://api.github.com/repos/" + owner + "/" + repo + "/contents/" + path, {
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
      throw new Error("GitHub API " + putRes.status + ": " + errText.slice(0, 200));
    }
    await writeAudit({
      action: "update",
      entity: "students",
      entityId: "repo-publish",
      reason: "Published " + payload.length + " students to data/students.json",
      details: { count: payload.length },
    });
    if (status) status.textContent = "Published " + payload.length + " students to the repository.";
    const panel = document.getElementById("qaTokenPanel");
    if (panel) panel.hidden = true;
    if (document.getElementById("qaGithubToken")) document.getElementById("qaGithubToken").value = "";
  } catch (err) {
    console.error(err);
    if (status) status.textContent = "Publish failed: " + (err.message || String(err));
  }
}


})();
