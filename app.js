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
document.getElementById("exportDbBtn")?.addEventListener("click", async () => {
  if (!db) return;
  const payload = { exportedAt: new Date().toISOString(), version: 1, students: await getAll("students"), lecturers: await getAll("lecturers"), sessions: await getAll("sessions"), audit: await getAll("audit") };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "EOCNS_Backup_" + new Date().toISOString().slice(0, 10) + ".json";
  a.click();
});
openDB().then(() => {
  console.log("EOCNS Attendance System ready");
  showView(sessionStorage.getItem("eocns-last-view") || "dashboard");
  refreshDashboardStats();
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
}).catch(err => {
  console.error(err);
  alert("Could not initialise the local database.");
});
})();
