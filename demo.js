/* EOCNS Virtual Practice & Training Mode — standalone demo.js */
(function () {
"use strict";

var IS_DEMO = new URLSearchParams(window.location.search).get("demo") === "1";
var DEMO_DB_NAME = "eocns_attendance_demo";
var DEMO_STORAGE_PREFIX = "eocns_demo__";

if (!IS_DEMO) {
  window.startEocnsDemoMode = function () {
    if (window.EOCNS_DIRTY && !window.confirm("You have unsaved work on this page. Leave it and open Practice Mode? Your real records will remain unchanged.")) return;
    window.location.href = window.location.pathname + "?demo=1";
  };
  function bindDemoLaunchers() {
    document.querySelectorAll("[data-start-demo]").forEach(function (button) {
      if (button.__eocnsDemoBound) return;
      button.__eocnsDemoBound = true;
      button.addEventListener("click", function (event) {
        event.preventDefault();
        window.startEocnsDemoMode();
      });
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bindDemoLaunchers, { once: true });
  else bindDemoLaunchers();
  return;
}

/* -------------------- PART 1: ISOLATED VIRTUAL SANDBOX -------------------- */
var nativeFetch = window.fetch.bind(window);
var demoPin = "123456";
var demoToken = "demo_session_token_v1";
var demoOfficer = "PRACTICE OFFICER";
var demoBeforeUnload = function (event) {
  if (window.__eocnsDemoLeaving) return;
  event.preventDefault();
  event.returnValue = "Practice changes are held in this virtual browser sandbox.";
};
window.__eocnsDemoBeforeUnload = demoBeforeUnload;
window.addEventListener("beforeunload", demoBeforeUnload);

function clone(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}
function isoDaysAgo(days, hour) {
  var d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour == null ? 9 : hour, 0, 0, 0);
  return d.toISOString();
}
function dayKey(date) {
  var d = new Date(date);
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
function makeAvatar(initials, bg) {
  var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><rect width="96" height="96" rx="48" fill="' + bg + '"/><circle cx="48" cy="35" r="17" fill="#fff" opacity=".92"/><path d="M16 88c3-21 15-32 32-32s29 11 32 32" fill="#fff" opacity=".92"/><text x="48" y="91" text-anchor="middle" font-size="1" fill="#fff">' + initials + '</text></svg>';
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}
var students = [
  ["stu_demo_001","CHIAMAKA NWOSU","EOCNS/26/0001/GNS","Nursing",100,"Female","Hostel 1","101"],
  ["stu_demo_002","IFEOMA OKAFOR","EOCNS/26/0002/GNS","Nursing",100,"Female","Hostel 1","102"],
  ["stu_demo_003","BLESSING EZE","EOCNS/26/0003/GNS","Nursing",100,"Female","Hostel 1","103"],
  ["stu_demo_004","AMARACHI OBI","EOCNS/26/0004/GNS","Nursing",200,"Female","Hostel 1","104"],
  ["stu_demo_005","VICTORIA DANIEL","EOCNS/26/0005/GNS","Nursing",200,"Female","Hostel 2","105"],
  ["stu_demo_006","GRACE NWANKWO","EOCNS/26/0006/GNS","Nursing",300,"Female","Hostel 2","106"],
  ["stu_demo_007","CHINENYE OGBONNA","EOCNS/26/0007/GNS","Nursing",300,"Female","Hostel 2","107"],
  ["stu_demo_008","JOYCE EMMANUEL","EOCNS/26/0008/GNS","Nursing",100,"Female","Hostel 2","108"],
  ["stu_demo_009","OLUCHI MADU","EOCNS/26/0009/MID","Midwifery",100,"Female","Hostel 1","109"],
  ["stu_demo_010","RITA NWABUEZE","EOCNS/26/0010/MID","Midwifery",200,"Female","Hostel 1","110"],
  ["stu_demo_011","ESTHER OHAKWE","EOCNS/26/0011/MID","Midwifery",200,"Female","Hostel 2",""],
  ["stu_demo_012","FAITH ONYEKACHI","EOCNS/26/0012/MID","Midwifery",300,"Female","Hostel 2",""]
].map(function (r, i) {
  return { id:r[0], name:r[1], regNo:r[2], programme:r[3], level:String(r[4]), gender:r[5], hostel:r[6], serial:r[7], status:"Active", phone:"+234 80" + String(12345670 + i), email:"practice.student" + (i + 1) + "@example.test", createdAt:isoDaysAgo(100 - i), updatedAt:isoDaysAgo(2), demoRecord:true };
});
var programmes = [{id:"prog_gns",name:"Nursing",code:"GNS",status:"Active"},{id:"prog_mid",name:"Midwifery",code:"MID",status:"Active"}];
var levels = [100,200,300].map(function (n) { return {id:"level_" + n,name:String(n),label:n + " Level",value:String(n),status:"Active"}; });
var courses = [
  ["GNS 101","Fundamentals of Nursing","Nursing",100],
  ["ANP 102","Human Anatomy and Physiology","Nursing",100],
  ["PHA 104","Introduction to Pharmacology","Nursing",100],
  ["MID 201","Principles of Midwifery","Midwifery",200],
  ["CHM 203","Clinical Chemistry","Midwifery",200],
  ["GNS 301","Community Health Nursing","Nursing",300]
].map(function (r) { return {code:r[0],name:r[1],title:r[1],programme:r[2],level:String(r[3]),classKey:r[3] + "_" + r[2].toLowerCase(),status:"Active"}; });
var now = new Date();
var monday = new Date(now); monday.setDate(now.getDate() - ((now.getDay() + 6) % 7)); monday.setHours(0,0,0,0);
function weekdayDate(offset) { var d = new Date(monday); d.setDate(d.getDate() + offset); return dayKey(d); }
var sessions = [{
  id:"session_demo_2026_27", name:"2026/2027 PRACTICE SESSION", label:"2026/2027 PRACTICE SESSION", status:"Active",
  startDate:"2026-09-14", start:"2026-09-14", active:true,
  semesters:[
    {id:"sem_demo_1",name:"1st Semester",label:"1st Semester",startDate:"2026-09-14",endDate:"2027-01-30",start:"2026-09-14",end:"2027-01-30"},
    {id:"sem_demo_2",name:"2nd Semester",label:"2nd Semester",startDate:"2027-02-15",endDate:"2027-06-30",start:"2027-02-15",end:"2027-06-30"}
  ],
  programmes:["Nursing","Midwifery"], levels:["100","200","300"], programmeIds:["prog_gns","prog_mid"], levelIds:["level_100","level_200","level_300"]
}];
var lecturers = [
  {id:"lec_demo_01",name:"DR. NGOZI EZE",staffId:"EOCNS/STAFF/014",phone:"+234 803 555 0101",status:"Active",courses:["GNS 101","GNS 301"],courseAssignments:[{courseCode:"GNS 101",programme:"Nursing",level:"100"},{courseCode:"GNS 301",programme:"Nursing",level:"300"}],sessionIds:["session_demo_2026_27"],sessions:["session_demo_2026_27"],contractHoursPerSemester:72},
  {id:"lec_demo_02",name:"MR. CHUKWUEMEKA OKORO",staffId:"EOCNS/STAFF/021",phone:"+234 806 555 0102",status:"Active",courses:["ANP 102"],courseAssignments:[{courseCode:"ANP 102",programme:"Nursing",level:"100"}],sessionIds:["session_demo_2026_27"],sessions:["session_demo_2026_27"],contractHoursPerSemester:64},
  {id:"lec_demo_03",name:"MRS. IFEYINWA NWABU",staffId:"EOCNS/STAFF/032",phone:"+234 809 555 0103",status:"Active",courses:["PHA 104","MID 201"],courseAssignments:[{courseCode:"PHA 104",programme:"Nursing",level:"100"},{courseCode:"MID 201",programme:"Midwifery",level:"200"}],sessionIds:["session_demo_2026_27"],sessions:["session_demo_2026_27"],contractHoursPerSemester:80},
  {id:"lec_demo_04",name:"DR. EMEKA OBI",staffId:"EOCNS/STAFF/041",phone:"+234 802 555 0104",status:"Active",courses:["CHM 203"],courseAssignments:[{courseCode:"CHM 203",programme:"Midwifery",level:"200"}],sessionIds:["session_demo_2026_27"],sessions:["session_demo_2026_27"],contractHoursPerSemester:60}
];
var qaEntries = [
  {id:"qa_demo_01",date:dayKey(now),classKey:"100_nursing",programme:"Nursing",level:"100",courseCode:"GNS 101",course:"Fundamentals of Nursing",lecturerId:"lec_demo_01",lecturer:"DR. NGOZI EZE",startTime:"09:00",endTime:"11:00",duration:2,status:"Held",topic:"Patient safety",absentStudentIds:["stu_demo_003"],absentStudents:["BLESSING EZE"],sessionId:sessions[0].id,semester:"1st Semester",createdAt:isoDaysAgo(0,11)},
  {id:"qa_demo_02",date:dayKey(now),classKey:"200_midwifery",programme:"Midwifery",level:"200",courseCode:"MID 201",course:"Principles of Midwifery",lecturerId:"lec_demo_03",lecturer:"MRS. IFEYINWA NWABU",startTime:"11:00",endTime:"13:00",duration:2,status:"Partial",topic:"Antenatal assessment",absentStudentIds:["stu_demo_010"],absentStudents:["RITA NWABUEZE"],sessionId:sessions[0].id,semester:"1st Semester",createdAt:isoDaysAgo(0,13)},
  {id:"qa_demo_03",date:weekdayDate(0),classKey:"100_nursing",programme:"Nursing",level:"100",courseCode:"ANP 102",course:"Human Anatomy and Physiology",lecturerId:"lec_demo_02",lecturer:"MR. CHUKWUEMEKA OKORO",startTime:"12:00",endTime:"14:00",duration:2,status:"Held",topic:"Body organisation",absentStudentIds:[],absentStudents:[],sessionId:sessions[0].id,semester:"1st Semester",createdAt:isoDaysAgo(0,14)},
  {id:"qa_demo_04",date:weekdayDate(1),classKey:"100_nursing",programme:"Nursing",level:"100",courseCode:"PHA 104",course:"Introduction to Pharmacology",lecturerId:"lec_demo_03",lecturer:"MRS. IFEYINWA NWABU",startTime:"09:00",endTime:"11:00",duration:2,status:"Missed",topic:"Drug safety",absentStudentIds:["stu_demo_001"],absentStudents:["CHIAMAKA NWOSU"],sessionId:sessions[0].id,semester:"1st Semester",createdAt:isoDaysAgo(1,11)},
  {id:"qa_demo_05",date:weekdayDate(2),classKey:"200_midwifery",programme:"Midwifery",level:"200",courseCode:"CHM 203",course:"Clinical Chemistry",lecturerId:"lec_demo_04",lecturer:"DR. EMEKA OBI",startTime:"10:00",endTime:"12:00",duration:2,status:"Held",topic:"Electrolytes",absentStudentIds:["stu_demo_011"],absentStudents:["ESTHER OHAKWE"],sessionId:sessions[0].id,semester:"1st Semester",createdAt:isoDaysAgo(2,12)},
  {id:"qa_demo_06",date:weekdayDate(3),classKey:"100_nursing",programme:"Nursing",level:"100",courseCode:"GNS 101",course:"Fundamentals of Nursing",lecturerId:"lec_demo_01",lecturer:"DR. NGOZI EZE",startTime:"13:00",endTime:"15:00",duration:2,status:"Held",topic:"Infection prevention",absentStudentIds:[],absentStudents:[],sessionId:sessions[0].id,semester:"1st Semester",createdAt:isoDaysAgo(3,15)}
];
var attendance = [
  {id:"att_demo_01",date:dayKey(now),programme:"Nursing",level:"100",classKey:"100_nursing",sessionId:sessions[0].id,semester:"1st Semester",courseCode:"GNS 101",course:"Fundamentals of Nursing",rows:students.filter(function(s){return s.programme==="Nursing"&&s.level==="100";}).map(function(s){return {studentId:s.id,name:s.name,regNo:s.regNo,status:s.id==="stu_demo_003"?"Absent":"Present",mark:s.id==="stu_demo_003"?"A":"P"};})},
  {id:"att_demo_02",date:weekdayDate(2),programme:"Midwifery",level:"200",classKey:"200_midwifery",sessionId:sessions[0].id,semester:"1st Semester",courseCode:"MID 201",course:"Principles of Midwifery",rows:students.filter(function(s){return s.programme==="Midwifery"&&s.level==="200";}).map(function(s){return {studentId:s.id,name:s.name,regNo:s.regNo,status:"Present",mark:"P"};})}
];
var pendingStudents = [
  {id:"pend_demo_001",name:"NNEKA UMEH",firstName:"Nneka",lastName:"Umeh",regNo:"",programme:"Nursing",level:"100",gender:"Female",hostel:"Hostel 1",phone:"+234 803 777 1001",email:"nneka.practice@example.test",photoDataUrl:makeAvatar("NU","#1B3A6B"),status:"Pending",createdAt:isoDaysAgo(1),submittedAt:isoDaysAgo(1),demoRecord:true},
  {id:"pend_demo_002",name:"ADAOBI NWOKE",firstName:"Adaobi",lastName:"Nwoke",regNo:"",programme:"Midwifery",level:"100",gender:"Female",hostel:"Hostel 2",phone:"+234 806 777 1002",email:"adaobi.practice@example.test",photoDataUrl:makeAvatar("AN","#B8860B"),status:"Pending",createdAt:isoDaysAgo(0),submittedAt:isoDaysAgo(0),demoRecord:true}
];
var hostelDates=[weekdayDate(-4),weekdayDate(-3),weekdayDate(-2),weekdayDate(-1),weekdayDate(0)];
var hostelGateRows=[["Department","Name","No.","Date/Time","Status","Location ID"]];
var hostelGateEvents=[];
hostelDates.forEach(function(date,d){students.slice(0,8).forEach(function(s,i){if((i===2&&d===1)||(i===5&&(d===2||d===3))||(i===7&&d===0))return;var machineNo=s.serial;var stamp=date+" 07:"+String(10+i).padStart(2,"0")+":00";hostelGateRows.push([s.programme.toUpperCase(),s.name,machineNo,stamp,"C/IN","1"]);hostelGateEvents.push({machineNo:machineNo,dateKey:date,locationId:"1",status:"C/IN",name:s.name});});});
hostelGateRows.push(["NURSING","VICTORIA DANIEL","105",hostelDates[4]+" 08:15:00","C/IN","1"]);
hostelGateEvents.push({machineNo:"105",dateKey:hostelDates[4],locationId:"1",status:"C/IN",name:"VICTORIA DANIEL"});
hostelGateRows.push(["VISITOR","UNKNOWN VISITOR","999",hostelDates[2]+" 08:15:00","C/IN","1"]);
hostelGateEvents.push({machineNo:"999",dateKey:hostelDates[2],locationId:"1",status:"C/IN",name:"UNKNOWN VISITOR"});
var hostelMatrix=students.slice(0,8).map(function(s,i){var marks=hostelDates.map(function(_,d){return ((i===2&&d===1)||(i===5&&(d===2||d===3))||(i===7&&d===0))?"A":"P";});var absent=marks.filter(function(m){return m==="A";}).length;return {studentId:s.id,machineNo:s.serial,name:s.name,regNo:s.regNo,hostel:s.hostel,programme:s.programme,level:s.level,dayMarks:marks,absentDays:absent,fine:absent*500};});
var hostelRows=hostelMatrix.filter(function(r){return r.absentDays>0;}).map(function(r){return Object.assign({},r);});
var hostelRun = {
  id:"hostel_run_demo_01",runId:"hostel_run_demo_01",hostel:"Hostel 1",hostelName:"Hostel 1",sourceHostel:"Hostel 1",sourceLocationId:"1",locationId:"1",
  start:hostelDates[0],end:hostelDates[4],startDate:hostelDates[0],endDate:hostelDates[4],dateKeys:hostelDates,coverageDateKeys:hostelDates,
  rate:500,days:5,createdAt:isoDaysAgo(0),updatedAt:isoDaysAgo(0),status:"final",matrix:hostelMatrix,rows:hostelRows,
  gateEvents:hostelGateEvents,gateExportRows:hostelGateRows,amendments:[],sessionId:sessions[0].id,semesterId:"sem_demo_1",
  studentCount:hostelMatrix.length,absenteeCount:hostelRows.length,totalFine:hostelRows.reduce(function(sum,r){return sum+r.fine;},0),summary:{students:hostelMatrix.length,days:5,daysAbsent:hostelRows.reduce(function(sum,r){return sum+r.absentDays;},0),totalFine:hostelRows.reduce(function(sum,r){return sum+r.fine;},0)}
};
var biometricPending = [
  {id:"bio_demo_conflict",type:"hostel_conflict",status:"pending",name:"VICTORIA DANIEL",studentId:"stu_demo_005",serial:"105",masterHostel:"Hostel 2",gateHostel:"Hostel 1",locationId:"1",date:weekdayDate(0),reason:"A student assigned to Hostel 2 recorded a gate entry at Hostel 1.",suggestions:[{studentId:"stu_demo_005",name:"VICTORIA DANIEL",regNo:"EOCNS/26/0005/GNS"}]},
  {id:"bio_demo_clarify",type:"clarify",status:"pending",machineName:"CHINENYE OGBONNA",serial:"107",date:weekdayDate(-1),suggestions:[{studentId:"stu_demo_007",name:"CHINENYE OGBONNA",regNo:"EOCNS/26/0007/GNS"},{studentId:"stu_demo_006",name:"GRACE NWANKWO",regNo:"EOCNS/26/0006/GNS"}]},
  {id:"bio_demo_unlinked",type:"unlinked",status:"pending",machineName:"UNKNOWN VISITOR",serial:"999",date:weekdayDate(0),locationId:"1",suggestions:[]}
];
var discipline = [
  {id:"dsa_demo_001",ref:"REF/EOCNS/DSA/0001",officialRef:"REF/EOCNS/DSA/0001",subjectType:"student",subject:"student",studentId:"stu_demo_003",studentName:"BLESSING EZE",name:"BLESSING EZE",date:isoDaysAgo(12).slice(0,10),type:"Attendance concern",status:"Under review",summary:"Repeated late arrival to a scheduled practical session.",outcome:"Counselling scheduled.",createdAt:isoDaysAgo(12),demoRecord:true},
  {id:"dsa_demo_002",ref:"REF/EOCNS/DSA/0002",officialRef:"REF/EOCNS/DSA/0002",subjectType:"student",subject:"student",studentId:"stu_demo_010",studentName:"RITA NWABUEZE",name:"RITA NWABUEZE",date:isoDaysAgo(5).slice(0,10),type:"Hostel conduct",status:"Open",summary:"A reported hostel rule concern awaiting review.",outcome:"Pending review.",createdAt:isoDaysAgo(5),demoRecord:true}
];
var remedialMeta = {sessionId:sessions[0].id,sessionName:sessions[0].name,active:true,programmes:["Nursing","Midwifery"],levels:["100","200","300"]};
var remedialEnrolment = students.slice(0,3).map(function(s,i){return {id:"rem_enr_demo_0"+(i+1),studentId:s.id,name:s.name,matric:s.regNo,regNo:s.regNo,programme:s.programme,level:s.level,courses:["GNS 101"],status:"Active",ref:"REF/EOCNS/QA/REM/000"+(i+1)};});
var remedialAssignments = [
  {id:"rem_assign_demo_01",courseCode:"GNS 101",course:"Fundamentals of Nursing",programme:"Nursing",level:"100",lecturerId:"lec_demo_01",lecturer:"DR. NGOZI EZE",hours:2},
  {id:"rem_assign_demo_02",courseCode:"ANP 102",course:"Human Anatomy and Physiology",programme:"Nursing",level:"100",lecturerId:"lec_demo_02",lecturer:"MR. CHUKWUEMEKA OKORO",hours:2}
];
var remedialTimetable = [
  {id:"rem_slot_01",day:"Monday",startTime:"14:00",endTime:"16:00",courseCode:"GNS 101",classKey:"100_nursing",lecturerId:"lec_demo_01"},
  {id:"rem_slot_02",day:"Wednesday",startTime:"14:00",endTime:"16:00",courseCode:"ANP 102",classKey:"100_nursing",lecturerId:"lec_demo_02"},
  {id:"rem_slot_03",day:"Friday",startTime:"12:00",endTime:"14:00",courseCode:"MID 201",classKey:"200_midwifery",lecturerId:"lec_demo_03"}
];
var remedialLogs = [
  {id:"rem_log_demo_01",date:weekdayDate(1),courseCode:"GNS 101",classKey:"100_nursing",lecturerId:"lec_demo_01",hours:2,attendance:[{studentId:students[0].id,name:students[0].name,status:"Present",mark:"P"},{studentId:students[1].id,name:students[1].name,status:"Absent",mark:"A"}]},
  {id:"rem_log_demo_02",date:weekdayDate(3),courseCode:"ANP 102",classKey:"100_nursing",lecturerId:"lec_demo_02",hours:2,attendance:[{studentId:students[0].id,name:students[0].name,status:"Present",mark:"P"},{studentId:students[2].id,name:students[2].name,status:"Present",mark:"P"}]}
];
var audit = [
  {id:1,ref:"REF/EOCNS/QA/1001",action:"Student record created",entity:"students",entityId:students[0].id,details:{name:students[0].name},reason:"Practice seed data",timestamp:isoDaysAgo(9),at:isoDaysAgo(9),user:"PRACTICE OFFICER",officer:"PRACTICE OFFICER"},
  {id:2,ref:"REF/EOCNS/QA/1002",action:"Lecture log saved",entity:"qa_entries",entityId:qaEntries[2].id,details:{course:"ANP 102"},reason:"Practice seed data",timestamp:isoDaysAgo(5),at:isoDaysAgo(5),user:"PRACTICE OFFICER",officer:"PRACTICE OFFICER"},
  {id:3,ref:"REF/EOCNS/QA/1003",action:"Hostel report saved",entity:"hostel_runs",entityId:hostelRun.id,details:{hostel:"Hostel 1"},reason:"Practice seed data",timestamp:isoDaysAgo(3),at:isoDaysAgo(3),user:"PRACTICE OFFICER",officer:"PRACTICE OFFICER"},
  {id:4,ref:"REF/EOCNS/QA/1004",action:"Discipline case opened",entity:"discipline",entityId:discipline[0].id,details:{ref:discipline[0].ref},reason:"Practice seed data",timestamp:isoDaysAgo(2),at:isoDaysAgo(2),user:"PRACTICE OFFICER",officer:"PRACTICE OFFICER"},
  {id:5,ref:"REF/EOCNS/QA/1005",action:"Attendance sheet generated",entity:"attendance",entityId:attendance[0].id,details:{course:"GNS 101"},reason:"Practice seed data",timestamp:isoDaysAgo(1),at:isoDaysAgo(1),user:"PRACTICE OFFICER",officer:"PRACTICE OFFICER"}
];
var timetable = {
  "100_nursing":[
    {day:"Monday",startTime:"08:00",endTime:"10:00",courseCode:"GNS 101",lecturerId:"lec_demo_01"},
    {day:"Tuesday",startTime:"10:00",endTime:"12:00",courseCode:"ANP 102",lecturerId:"lec_demo_02"},
    {day:"Wednesday",startTime:"12:00",endTime:"14:00",courseCode:"PHA 104",lecturerId:"lec_demo_03"},
    {day:"Thursday",startTime:"09:00",endTime:"11:00",courseCode:"GNS 101",lecturerId:"lec_demo_01"},
    {day:"Friday",startTime:"11:00",endTime:"13:00",courseCode:"ANP 102",lecturerId:"lec_demo_02"}
  ],
  "200_midwifery":[
    {day:"Monday",startTime:"09:00",endTime:"11:00",courseCode:"MID 201",lecturerId:"lec_demo_03"},
    {day:"Tuesday",startTime:"11:00",endTime:"13:00",courseCode:"CHM 203",lecturerId:"lec_demo_04"},
    {day:"Wednesday",startTime:"09:00",endTime:"11:00",courseCode:"MID 201",lecturerId:"lec_demo_03"},
    {day:"Thursday",startTime:"12:00",endTime:"14:00",courseCode:"CHM 203",lecturerId:"lec_demo_04"},
    {day:"Friday",startTime:"10:00",endTime:"12:00",courseCode:"MID 201",lecturerId:"lec_demo_03"}
  ]
};
var DEMO_CLOUD = {
  "data/config.json":{publishWorkerUrl:"https://eocns-publish.alemfort12.workers.dev",publishWorkerKey:"DEMO-ONLY",demoMode:true},
  "data/programmes.json":programmes,
  "data/levels.json":levels,
  "data/sessions.json":sessions,
  "data/courses.json":courses,
  "data/timetables.json":timetable,
  "data/students.json":students,
  "data/lecturers.json":lecturers,
  "data/qa_entries.json":qaEntries,
  "data/attendance.json":attendance,
  "data/pending_students.json":pendingStudents,
  "data/hostel_runs.json":[hostelRun],
  "data/biometric_pending.json":biometricPending,
  "data/discipline.json":discipline,
  "data/remedial_meta.json":remedialMeta,
  "data/remedial_enrolment.json":remedialEnrolment,
  "data/remedial_assignments.json":remedialAssignments,
  "data/remedial_timetable.json":remedialTimetable,
  "data/remedial_logs.json":remedialLogs,
  "data/remedial.json":remedialLogs,
  "data/audit.json":audit
};
var demoShas = {};
Object.keys(DEMO_CLOUD).forEach(function(path,i){demoShas[path]="demo-sha-" + String(i+1).padStart(4,"0") + "-v1";});
function storageKey(key) {
  key = String(key);
  return key.indexOf("eocns") === 0 && key.indexOf(DEMO_STORAGE_PREFIX) !== 0 ? DEMO_STORAGE_PREFIX + key : key;
}
try {
  ["getItem","setItem","removeItem"].forEach(function (method) {
    var original = Storage.prototype[method];
    Storage.prototype[method] = function (key, value) {
      var args = Array.prototype.slice.call(arguments);
      args[0] = storageKey(key);
      return original.apply(this, args);
    };
  });
} catch (storageError) { console.warn("[Practice] Storage isolation unavailable", storageError); }
try {
  var idbOpen = IDBFactory.prototype.open;
  var idbDelete = IDBFactory.prototype.deleteDatabase;
  IDBFactory.prototype.open = function (name, version) {
    return idbOpen.call(this, name === "eocns_attendance" ? DEMO_DB_NAME : name, version);
  };
  IDBFactory.prototype.deleteDatabase = function (name) {
    return idbDelete.call(this, name === "eocns_attendance" ? DEMO_DB_NAME : name);
  };
} catch (idbError) { console.warn("[Practice] Database isolation unavailable", idbError); }

function jsonResponse(data,status) {
  return new Response(JSON.stringify(data), {status:status || 200,headers:{"Content-Type":"application/json","Cache-Control":"no-store"}});
}
function requestUrl(input) {
  try { return new URL(typeof input === "string" ? input : input.url, window.location.href); } catch (_) { return null; }
}
function isVirtualTarget(input) {
  var url=requestUrl(input);
  if(!url)return false;
  if(/(^|\.)workers\.dev$/i.test(url.hostname)||url.hostname==="api.github.com")return true;
  return /(?:^|\/)data\/[^/?]+\.json$/i.test(url.pathname);
}
async function virtualWorkerAction(payload) {
  var action=payload.action;
  if(action==="login"){
    if(String(payload.pin||"")!==demoPin)return jsonResponse({ok:false,error:"Practice Mode hint: type PIN 123456 to sign in."},401);
    demoOfficer=String(payload.officer||"PRACTICE OFFICER").trim()||"PRACTICE OFFICER";
    return jsonResponse({ok:true,token:demoToken,officer:demoOfficer,expiresInHours:12});
  }
  if(action==="verify_session")return jsonResponse({ok:true,officer:demoOfficer,exp:Date.now()+43200000});
  if(action==="get_manifest")return jsonResponse({ok:true,encryptionEnabled:true,files:clone(demoShas),manifest:{files:clone(demoShas)}});
  if(action==="get_store"){
    var path=String(payload.path||"").replace(/^\/+/,"").split("?")[0];
    if(!Object.prototype.hasOwnProperty.call(DEMO_CLOUD,path))return jsonResponse({ok:false,error:"Practice file not found: "+path},404);
    return jsonResponse({ok:true,path:path,data:clone(DEMO_CLOUD[path]),encrypted:true});
  }
  if(action==="publish"){
    await new Promise(function(resolve){setTimeout(resolve,700);});
    var files=payload.files||{},updated=[];
    Object.keys(files).forEach(function(path){
      path=String(path).replace(/^\/+/,"");
      try{
        var raw=files[path];
        DEMO_CLOUD[path]=typeof raw==="string"?JSON.parse(raw):clone(raw);
        demoShas[path]="demo-sha-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,7);
        updated.push(path);
      }catch(error){console.warn("[Practice] Ignored invalid virtual file",path,error);}
    });
    return jsonResponse({ok:true,updated:updated,encrypted:updated,encryptionEnabled:true});
  }
  if(action==="change_pin"){
    var current=String(payload.currentPin||payload.current||payload.oldPin||payload.pin||"");
    var next=String(payload.newPin||payload.new_pin||"");
    if(current!==demoPin)return jsonResponse({ok:false,error:"The current practice PIN is incorrect."},401);
    if(next.length<6)return jsonResponse({ok:false,error:"Your new practice PIN must contain at least 6 characters."},400);
    demoPin=next;
    return jsonResponse({ok:true,message:"Practice PIN updated in virtual sandbox! (Real College PIN was NOT touched.)"});
  }
  if(action==="reject_email")return jsonResponse({ok:true,emailed:true});
  if(action==="submit_pending"){
    var incoming=clone(payload.student||payload.data||payload.record||payload.pending||payload);
    incoming.id=incoming.id||("pend_demo_"+Date.now());
    incoming.status=incoming.status||"Pending";
    DEMO_CLOUD["data/pending_students.json"].push(incoming);
    demoShas["data/pending_students.json"]="demo-sha-"+Date.now().toString(36);
    return jsonResponse({ok:true,id:incoming.id});
  }
  if(action==="logout"||action==="sign_out")return jsonResponse({ok:true});
  return jsonResponse({ok:true,practice:true,action:action||"unknown"});
}
window.fetch = async function(input,init) {
  if(!isVirtualTarget(input))return nativeFetch(input,init);
  var url=requestUrl(input);
  var method=String((init&&init.method)||(input&&input.method)||"GET").toUpperCase();
  if(url&&/(^|\.)workers\.dev$/i.test(url.hostname)){
    var payload={};
    try{payload=JSON.parse((init&&init.body)||"{}");}catch(_){}
    return virtualWorkerAction(payload);
  }
  if(url&&url.hostname==="api.github.com")return jsonResponse({message:"Practice Mode blocks external repository requests."},200);
  var path=url.pathname.replace(/^\/+/,"");
  var dataPathIndex=path.lastIndexOf("data/");
  if(dataPathIndex>=0)path=path.slice(dataPathIndex);
  if(method==="GET"&&Object.prototype.hasOwnProperty.call(DEMO_CLOUD,path))return jsonResponse(clone(DEMO_CLOUD[path]));
  if(method==="GET"&&/^data\/[^/]+\.json$/i.test(path))return jsonResponse([]);
  return jsonResponse({ok:true,practice:true});
};
window.__EOCNS_DEMO__={cloud:DEMO_CLOUD,clone:clone,getPin:function(){return demoPin;},isDemo:true};

window.exitEocnsDemoMode = async function () {
  window.__eocnsDemoLeaving=true;
  window.onbeforeunload=null;
  window.removeEventListener("beforeunload",demoBeforeUnload);
  try {
    await new Promise(function(resolve){
      var req=indexedDB.deleteDatabase(DEMO_DB_NAME);
      req.onsuccess=req.onerror=req.onblocked=function(){resolve();};
    });
  } catch (_) {}
  ["localStorage","sessionStorage"].forEach(function(name){
    try{
      var store=window[name],keys=[];
      for(var i=0;i<store.length;i++){var k=store.key(i);if(k&&k.indexOf(DEMO_STORAGE_PREFIX)===0)keys.push(k);}
      keys.forEach(function(k){store.removeItem(k);});
    }catch(_){}
  });
  window.location.href=window.location.pathname;
};
window.resetEocnsDemoMode = async function () {
  window.__eocnsDemoLeaving=true;
  try{
    await new Promise(function(resolve){
      var req=indexedDB.deleteDatabase(DEMO_DB_NAME);
      req.onsuccess=req.onerror=req.onblocked=function(){resolve();};
    });
  }catch(_){}
  ["localStorage","sessionStorage"].forEach(function(name){
    try{
      var store=window[name],keys=[];
      for(var i=0;i<store.length;i++){var k=store.key(i);if(k&&k.indexOf(DEMO_STORAGE_PREFIX)===0)keys.push(k);}
      keys.forEach(function(k){store.removeItem(k);});
    }catch(_){}
  });
  window.location.href=window.location.pathname+"?demo=1";
};

/* -------------------- PART 2: ONE-CLICK PRACTICE FILE INJECTORS -------------------- */
function makeButton(label,action) {
  var b=document.createElement("button");
  b.type="button";b.className="btn btn--primary btn--sm eocns-demo-inject";
  b.textContent=label;b.addEventListener("click",action);
  return b;
}
function injectPracticeFiles() {
  var drop=document.getElementById("hostelDropzone"),hostelInput=document.getElementById("hostelFileInput");
  if(drop&&hostelInput&&!document.getElementById("btnDemoGateFile")){
    var gateBtn=makeButton("Load Sample Gate Excel File (Practice)",function(){
      if(!window.XLSX){alert("The spreadsheet tool is still loading. Please wait a moment and try again.");return;}
      var headers=["Department","Name","No.","Date/Time","Status","Location ID"],rows=[];
      var names=[
        ["NURSING","CHIAMAKA NWOSU","101"],["NURSING","IFEOMA OKAFOR","102"],["NURSING","BLESSING EZE","103"],
        ["NURSING","AMARACHI OBI","104"],["NURSING","VICTORIA DANIEL","105"],["NURSING","GRACE NWANKWO","106"],
        ["NURSING","CHINENYE OGBONNA","107"],["NURSING","JOYCE EMMANUEL","108"],["MIDWIFERY","OLUCHI MADU",""]
      ];
      for(var day=4;day>=0;day--){
        var d=new Date();d.setDate(d.getDate()-day);
        names.forEach(function(n,i){
          if((i===2&&day===1)||(i===5&&(day===2||day===3))||(i===7&&day===0))return;
          var stamp=new Date(d);stamp.setHours(7+(i%3),10+(i%40),0,0);
          rows.push([n[0],n[1],n[2],stamp.toLocaleString("en-GB"),"C/IN",i===4?1:1]);
        });
        var conflictDate=new Date(d);conflictDate.setHours(8,15,0,0);
        if(day===0)rows.push(["NURSING","VICTORIA DANIEL","105",conflictDate.toLocaleString("en-GB"),"C/IN",1]);
        if(day===2)rows.push(["VISITOR","UNKNOWN VISITOR","999",conflictDate.toLocaleString("en-GB"),"C/IN",1]);
      }
      var ws=window.XLSX.utils.aoa_to_sheet([headers].concat(rows));
      var wb=window.XLSX.utils.book_new();window.XLSX.utils.book_append_sheet(wb,ws,"Gate Export");
      var bytes=window.XLSX.write(wb,{bookType:"xlsx",type:"array"});
      var file=new File([bytes],"EOCNS-Practice-Gate-Export.xlsx",{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
      var dt=new DataTransfer();dt.items.add(file);hostelInput.files=dt.files;
      hostelInput.dispatchEvent(new Event("change",{bubbles:true}));
    });
    gateBtn.id="btnDemoGateFile";drop.parentNode.insertBefore(gateBtn,drop.nextSibling);
  }
  var csvModal=document.getElementById("studentCsvImportModal"),csvInput=document.getElementById("csvImportFileInput");
  if(csvModal&&csvInput&&!document.getElementById("btnDemoStudentCsv")){
    var csvBtn=makeButton("Load Sample Student CSV (Practice)",function(){
      var lines=[
        "name,regNo,programme,level,gender,hostel,phone",
        "PRECIOUS NWANKWO,EOCNS/26/0091/GNS,Nursing,100,Female,Hostel 1,+2348031110091",
        "DANIELLA EZE,EOCNS/26/0092/GNS,Nursing,100,Female,Hostel 2,+2348031110092",
        "MICHAEL OBI,EOCNS/26/0093/MID,Midwifery,200,Male,Hostel 1,+2348031110093",
        "CHIAMAKA NWOSU,EOCNS/26/0094/GNS,Nursing,100,Female,Hostel 1,+2348031110094"
      ];
      var file=new File([lines.join("\r\n")],"EOCNS-Practice-Students.csv",{type:"text/csv"});
      var dt=new DataTransfer();dt.items.add(file);csvInput.files=dt.files;
      csvInput.dispatchEvent(new Event("change",{bubbles:true}));
    });
    csvBtn.id="btnDemoStudentCsv";
    var anchor=csvModal.querySelector(".modal__body")||csvModal.querySelector(".modal__content")||csvModal;
    anchor.insertBefore(csvBtn,anchor.firstChild);
  }
}

/* -------------------- PART 3: STICKY BANNER -------------------- */
/* -------------------- PART 4: 20-LESSON GUIDED COACH -------------------- */
var lessons = [
  {
    "title": "Welcome to Practice Mode",
    "view": "dashboard",
    "target": "officerLoginGate",
    "what": "You are in the Safe Practice Room — nothing you click here can hurt real school records! If the sign-in box is not open, click 'Take Me There' below. Type your full name, type the practice PIN 123456, and click Sign In.",
    "steps": [
      "Click Take Me There if the sign-in box is not open.",
      "Type your full name in the officer name box.",
      "Type 123456 in the PIN box, then click Sign In."
    ]
  },
  {
    "title": "Getting to Know Your Home Screen",
    "view": "dashboard",
    "target": "view-dashboard",
    "what": "The dashboard is your starting page. It gives you a quick look at students, staff, classes and other school activity.",
    "steps": [
      "Look through the summary cards on the page.",
      "Find the Session and Semester boxes near the top.",
      "Try the Light/Dark theme button.",
      "Find Save Changes Now. It saves only your practice work here."
    ]
  },
  {
    "title": "Finding a Student",
    "view": "students",
    "target": "studentSearch",
    "what": "The Students page is the school's main student list. You can search by a student's name or registration number, then narrow the list by programme or level.",
    "steps": [
      "Click Students in the left menu.",
      "Click the search box and type CHIAMAKA.",
      "Try choosing a Programme and a Level.",
      "Use the page buttons at the bottom to see more names."
    ]
  },
  {
    "title": "Opening a Student's Full Record",
    "view": "students",
    "target": "studentsTableBody",
    "what": "A student's full record brings useful information together, including attendance, hostel details and any student affairs cases.",
    "steps": [
      "Find CHIAMAKA NWOSU in the list and click View.",
      "Look through the different parts of the student record.",
      "Try the search box inside the record.",
      "If you see a report button, open it to see what it contains."
    ]
  },
  {
    "title": "Adding and Editing a Student",
    "view": "students",
    "target": "btnAddStudent",
    "what": "The student form is where you add a new student or correct an existing record. Names are changed to CAPITAL LETTERS automatically.",
    "steps": [
      "Click + Add Student to open the form.",
      "Enter made-up practice details, then choose a programme, level and hostel.",
      "Click Save to add the practice student.",
      "Choose Edit on a sample student and look through the fields."
    ]
  },
  {
    "title": "Adding Many Students at Once",
    "view": "students",
    "target": "btnImportStudentsCsv",
    "what": "You can add several students from one spreadsheet file instead of entering them one at a time. The review page helps you check the names before they are added.",
    "steps": [
      "Click Import CSV.",
      "Choose Load Sample Student CSV (Practice).",
      "Look through the rows and notice the sample name that appears more than once.",
      "Return to the list and try Generate Register Report."
    ]
  },
  {
    "title": "Reviewing New Student Requests",
    "view": "pending",
    "target": "pendingTableBody",
    "what": "New Student Requests shows people who have filled in the online registration form. You can check their details before adding them to the main student list.",
    "steps": [
      "Click New Student Requests, then click Review on an applicant.",
      "Look through the details and photograph.",
      "Click Approve for one practice applicant and enter PIN 123456 if asked.",
      "Review the other applicant, click Reject, give a reason and confirm."
    ]
  },
  {
    "title": "Looking After Lecturer Records",
    "view": "lecturers",
    "target": "btnAddLecturer",
    "what": "The Lecturers page keeps staff details and the courses they teach. It also records each lecturer's teaching hours for each semester.",
    "steps": [
      "Click Lecturers and look through the four sample staff records.",
      "Click + Add Lecturer to open the form.",
      "Find Staff ID, Course Assignment and Contract Hours per Semester.",
      "Close the form without saving."
    ]
  },
  {
    "title": "Understanding Sessions and Semesters",
    "view": "sessions",
    "target": "sessionsList",
    "what": "A school session can have one semester or several semesters. The dates you enter help the school keep teaching and reports in the right period.",
    "steps": [
      "Click School Sessions.",
      "Open 2026/2027 PRACTICE SESSION.",
      "Look at the dates for 1st Semester and 2nd Semester.",
      "Check the programmes and levels included, then close the form."
    ]
  },
  {
    "title": "Setting Up the School",
    "view": "settings",
    "target": "programmesList",
    "what": "Settings is where you manage programmes, levels, courses and class timetables. These details help the other parts of the system work properly.",
    "steps": [
      "Click Settings & PIN.",
      "Find the Programmes and Levels sections.",
      "Scroll down to Courses and look through the sample courses.",
      "Find Timetable Editor and look at its programme and level choices."
    ]
  },
  {
    "title": "Viewing the Weekly Timetable",
    "view": "timetable-board",
    "target": "timetableBoard",
    "what": "The weekly timetable shows which class has a lesson, who is teaching and when it will happen. You can open a lesson to see its details.",
    "steps": [
      "Click Weekly Timetable.",
      "Choose Nursing and 100 Level.",
      "Look through the lessons shown for the week.",
      "Click a lesson to see its details, then close the form without saving."
    ]
  },
  {
    "title": "Checking Today's Lectures",
    "view": "qa-daily",
    "target": "qaDailyTableBody",
    "what": "Today's Lectures helps you record whether each planned class took place, partly took place or was missed. You can also prepare a report for the day.",
    "steps": [
      "Click Today's Lectures and open the day's list.",
      "Open a lesson and look at the Held, Partial and Missed choices.",
      "Save only if you want to try making a practice change.",
      "Click Print Daily Report, enter an Officer Name and choose PDF or Word."
    ]
  },
  {
    "title": "Reading Weekly and Monthly Reports",
    "view": "qa-weekly",
    "target": "btnBuildWeeklyQa",
    "what": "These reports compare the lessons that were planned with the lessons that actually took place. They help you see where teaching is going well and where follow-up may be needed.",
    "steps": [
      "Click Weekly QA Report and choose a date range and class.",
      "Click Build Report and look at the totals.",
      "Open Monthly QA Report and build its report.",
      "Compare the results for the week and the month."
    ]
  },
  {
    "title": "Preparing Class Sign-In Sheets",
    "view": "attendance",
    "target": "btnBuildAttendance",
    "what": "A class sign-in sheet is a list teachers can use to mark who is present or absent. You can print it or download a Word copy.",
    "steps": [
      "Click Class Sign-In Sheets.",
      "Choose Nursing and 100 Level.",
      "Click Build Sheet and look through the student names.",
      "Try Print or Download Word."
    ]
  },
  {
    "title": "Checking Hostel and Gate Records",
    "view": "hostel",
    "target": "hostelDropzone",
    "what": "The Hostel page compares gate machine entries with the school's hostel list. You can check the preview and correct a mark before saving the report.",
    "steps": [
      "Click Hostel & Gate Fees.",
      "Click Load Sample Gate Excel File (Practice).",
      "Find Editable Preview Table and change one A mark to P.",
      "Click Recalculate Preview and see how Days Absent and Fine (₦) change."
    ]
  },
  {
    "title": "Reviewing Hostel Mismatches",
    "view": "hostel",
    "target": "hostelConflictCard",
    "what": "Sometimes a gate entry does not match the hostel list, or the machine cannot clearly identify a student. This page helps you review those cases and check saved hostel reports.",
    "steps": [
      "Open Advanced setup; the page will expand for you.",
      "In Hostel Conflicts, compare Keep master, Accept gate and Dismiss.",
      "Look through Needs Clarification and Unlinked Pool.",
      "Find Master hostel roster and Saved Hostel Reports, then open a sample report."
    ]
  },
  {
    "title": "Recording Student Affairs Cases",
    "view": "discipline",
    "target": "disciplineTableBody",
    "what": "Discipline Cases keeps a record of student affairs concerns and what the school has done about them. A formal case needs an official reference number so it can be found later.",
    "steps": [
      "Click Discipline Cases and look through the two sample cases.",
      "Click New Case and look at the form.",
      "Find the Official REF field and read its note.",
      "Try Print Register."
    ]
  },
  {
    "title": "Getting to Know Remedial Classes",
    "view": "remedial",
    "target": "remPanel-setup",
    "what": "Remedial Classes helps the school arrange extra lessons for students. You can set them up, add students, prepare a timetable and record attendance.",
    "steps": [
      "Click Remedial Classes and look through Setup.",
      "Open Enrolment, then open Timetable.",
      "Open Logging and try marking a student P or A.",
      "Open Weekly report, then Summary."
    ]
  },
  {
    "title": "Checking Lecturer Hours and School Reports",
    "view": "lecturer-hours",
    "target": "btnBuildLecturerHours",
    "what": "The Lecturer Hours page compares each lecturer's semester teaching hours with the hours they are expected to complete. Reports & Downloads and Activity History help you find saved reports and see what has been done.",
    "steps": [
      "Click Lecturer Hours and build the semester report.",
      "Open Reports & Downloads and look through the available files.",
      "Open Activity History and look at the actions, dates and reference numbers.",
      "Click Dashboard to return to the home screen."
    ]
  },
  {
    "title": "Saving Your Work and Finishing the Tour",
    "view": "settings",
    "target": "btnSaveSyncTop",
    "what": "Save Changes Now stores your practice work in the separate practice area. You can also look at backup and PIN options, but none of these practice actions can change real school records.",
    "steps": [
      "Click Save Changes Now and wait for the practice save message.",
      "Open Full Backup & Restore and look at the choices. Do not restore a real school backup.",
      "Find Change QA Officer PIN and look at how the practice PIN can be changed.",
      "When you finish, choose Restart Tour, Practice Freely or Exit to Real School System."
    ]
  }
];

var currentLesson=0,coachVisible=true,lessonMenuOpen=false,dragState=null;
function el(id){return document.getElementById(id);}
function injectStyles(){
  if(el("eocnsDemoStyles"))return;
  var style=document.createElement("style");style.id="eocnsDemoStyles";
  style.textContent=
  "#eocnsDemoBar{position:sticky;top:0;z-index:10000;background:#142d52;color:#fff;display:flex;align-items:center;gap:16px;padding:10px 16px;box-shadow:0 4px 16px #10274633;font:13px/1.35 Inter,Arial,sans-serif}"+
  "#eocnsDemoBar .demo-brand{display:flex;align-items:center;gap:10px;min-width:270px}#eocnsDemoBar .demo-pill{background:#B8860B;color:#fff;padding:6px 9px;border-radius:6px;font-weight:800;letter-spacing:.04em;font-size:11px;white-space:nowrap}"+
  "#eocnsDemoBar .demo-reassure{opacity:.9}#eocnsDemoBar .demo-progress{flex:1;min-width:120px;max-width:260px;margin-left:auto}#eocnsDemoBar .demo-progress-label{display:flex;justify-content:space-between;margin-bottom:5px;font-size:11px}#eocnsDemoBar .demo-track{height:5px;background:#ffffff35;border-radius:8px;overflow:hidden}#eocnsDemoBar .demo-fill{height:100%;background:#d9ae48;transition:width .2s}"+
  "#eocnsDemoBar .demo-actions{display:flex;align-items:center;gap:6px;flex-wrap:wrap}#eocnsDemoBar button{border:1px solid #ffffff55;background:#ffffff12;color:#fff;border-radius:6px;padding:7px 9px;font-weight:650;cursor:pointer;font-size:12px}#eocnsDemoBar button.demo-exit{background:#B8860B;border-color:#B8860B;color:#101d31}"+
  "#eocnsDemoCoach{position:fixed;z-index:10002;right:22px;bottom:20px;width:min(440px,calc(100vw - 32px));max-height:min(78vh,calc(100vh - 96px));display:flex;flex-direction:column;overflow:hidden;pointer-events:auto;background:#fff;color:#172033;border:2px solid #B8860B;border-radius:16px;box-shadow:0 18px 55px #071a3550;font:15px/1.55 Inter,Arial,sans-serif}#eocnsDemoCoach[hidden],#eocnsDemoMenu[hidden]{display:none}"+
  "#eocnsDemoCoach .coach-head{flex:0 0 auto;background:#1B3A6B;color:#fff;padding:14px 16px;display:flex;justify-content:space-between;gap:12px;align-items:center;cursor:grab;user-select:none;touch-action:none}#eocnsDemoCoach .coach-head.is-dragging{cursor:grabbing}#eocnsDemoCoach .coach-kicker{font-size:11px;color:#e9c66e;font-weight:800;text-transform:uppercase;letter-spacing:.08em}#eocnsDemoCoach h3{font-size:17px;line-height:1.3;color:#fff;margin:3px 0 0}#eocnsDemoCoach .coach-body{flex:1 1 auto;min-height:0;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;padding:15px 6px 15px 17px}#eocnsDemoCoach .coach-body p{margin:6px 0 12px}#eocnsDemoCoach .coach-body ol{padding-left:21px;margin:8px 0 16px}#eocnsDemoCoach .coach-body li{padding:3px 0}#eocnsDemoCoach .coach-actions{flex:0 0 auto;display:flex;gap:8px;flex-wrap:wrap;border-top:1px solid #e5eaf1;padding:12px 16px}#eocnsDemoCoach .coach-drag-meta{display:flex;align-items:center;gap:7px;margin-top:5px;font-size:10px;opacity:.78}#eocnsDemoCoach .coach-grip{font-size:15px;letter-spacing:-3px;font-weight:900}"+
  ".eocns-demo-primary{background:#1B3A6B!important;color:#fff!important;border:1px solid #1B3A6B!important}.eocns-demo-gold{background:#B8860B!important;color:#fff!important;border:1px solid #B8860B!important}.eocns-demo-muted{background:#eef2f7!important;color:#1B3A6B!important;border:1px solid #d9e0ea!important}"+
  "#eocnsDemoMenu{position:fixed;z-index:10001;inset:0 0 0 auto;width:min(390px,92vw);background:#fff;color:#172033;box-shadow:-16px 0 40px #071a3540;padding:20px;overflow:auto;font:14px/1.4 Inter,Arial,sans-serif}#eocnsDemoMenu h3{color:#1B3A6B;margin:0 0 12px}#eocnsDemoMenu button{display:block;width:100%;text-align:left;padding:10px 12px;border:0;border-bottom:1px solid #edf0f4;background:#fff;color:#23334c;cursor:pointer}#eocnsDemoMenu button.active{background:#fff7df;color:#1B3A6B;font-weight:800}"+
  ".demo-spotlight{position:relative!important;z-index:9999!important;outline:3px solid #D4A72C!important;outline-offset:5px!important;box-shadow:0 0 0 7px #D4A72C33,0 0 24px #D4A72C99!important;animation:demoPulse 1.6s infinite}@keyframes demoPulse{50%{outline-color:#1B3A6B;box-shadow:0 0 0 9px #1B3A6B20,0 0 28px #D4A72Caa}}"+
  ".eocns-demo-inject{display:inline-flex;margin:10px 0;position:relative;z-index:2}@media(max-width:900px){#eocnsDemoBar{align-items:flex-start;flex-wrap:wrap}#eocnsDemoBar .demo-brand{min-width:0;flex:1 1 100%}#eocnsDemoBar .demo-progress{margin-left:0;max-width:none;flex:1}#eocnsDemoCoach{right:10px;bottom:10px}}";
  document.head.appendChild(style);
}
function createBanner(){
  if(el("eocnsDemoBar"))return;
  var bar=document.createElement("div");bar.id="eocnsDemoBar";
  bar.innerHTML='<div class="demo-brand"><span class="demo-pill">PRACTICE &amp; TRAINING MODE</span><span class="demo-reassure">Safe virtual classroom — nothing you click changes real school records.</span></div><div class="demo-progress"><div class="demo-progress-label"><strong id="demoProgressText">Lesson 1 of 20</strong><span id="demoProgressPct">5%</span></div><div class="demo-track"><div class="demo-fill" id="demoProgressFill" style="width:5%"></div></div></div><div class="demo-actions"><button type="button" id="demoLessonsBtn">All 20 Lessons</button><button type="button" id="demoCoachToggle">Hide Coach</button><button type="button" id="demoResetBtn">Reset Practice</button><button type="button" class="demo-exit" id="demoExitBtn">Exit Practice Mode</button></div>';
  document.body.insertBefore(bar,document.body.firstChild);
  el("demoLessonsBtn").addEventListener("click",toggleLessonMenu);
  el("demoCoachToggle").addEventListener("click",function(){coachVisible=!coachVisible;var c=el("eocnsDemoCoach");if(c)c.hidden=!coachVisible;this.textContent=coachVisible?"Hide Coach":"Show Coach";});
  el("demoResetBtn").addEventListener("click",function(){if(confirm("Reset the practice classroom and restore all sample records?"))window.resetEocnsDemoMode();});
  el("demoExitBtn").addEventListener("click",function(){if(confirm("Exit Practice Mode and return to the real school system? Your real records have not been changed."))window.exitEocnsDemoMode();});
}
function createCoach(){
  if(el("eocnsDemoCoach"))return;
  var card=document.createElement("aside");card.id="eocnsDemoCoach";card.setAttribute("aria-live","polite");
  card.innerHTML='<div class="coach-head" id="demoCoachDrag"><div class="coach-head-copy"><div class="coach-kicker" id="demoCoachKicker">Lesson 1 of 20</div><h3 id="demoCoachTitle">Welcome to Practice Mode</h3><div class="coach-drag-meta"><span class="coach-grip" aria-hidden="true">⋮⋮</span><span>Drag to move</span></div></div><button type="button" id="demoCoachDock" aria-label="Hide coach" style="background:#ffffff20;color:#fff;border:1px solid #ffffff66;border-radius:6px;padding:5px 9px">—</button></div><div id="demoCoachMain" class="coach-main"><div class="coach-body"><strong>What this screen does</strong><p id="demoCoachWhat"></p><strong>Try it now (Hands-On)</strong><ol id="demoCoachSteps"></ol></div><div class="coach-actions"><button type="button" id="demoBack" class="btn eocns-demo-muted btn--sm">← Back</button><button type="button" id="demoTakeMeThere" class="btn eocns-demo-muted btn--sm">Take Me There</button><button type="button" id="demoNext" class="btn eocns-demo-primary btn--sm">Next Lesson →</button><button type="button" id="demoExitTraining" class="btn eocns-demo-gold btn--sm">Exit Training</button></div></div><div id="demoCoachGrad" class="coach-grad" hidden><div class="coach-body"><p>You have reached the end of all 20 guided lessons. You can now explore the EOCNS QA System in the Safe Practice Room.</p><p><strong>Remember:</strong> every practice record, PIN and save stays separate from the real school records.</p></div><div class="coach-actions"><button type="button" id="demoRestartTour" class="btn eocns-demo-primary btn--sm">Restart Tour</button><button type="button" id="demoFreePractice" class="btn eocns-demo-muted btn--sm">Practice Freely</button><button type="button" id="demoGraduateExit" class="btn eocns-demo-gold btn--sm">Exit to Real School System</button></div></div>';
  document.body.appendChild(card);
  el("demoCoachDock").addEventListener("click",function(){coachVisible=false;card.hidden=true;el("demoCoachToggle").textContent="Show Coach";});
  el("demoBack").addEventListener("click",function(){goLesson(currentLesson-1);});
  el("demoNext").addEventListener("click",function(){if(currentLesson===19)showGraduation();else goLesson(currentLesson+1);});
  el("demoExitTraining").addEventListener("click",function(){if(confirm("Leave the guided lessons and continue exploring Practice Mode?")){card.hidden=true;coachVisible=false;el("demoCoachToggle").textContent="Show Coach";}});
  el("demoTakeMeThere").addEventListener("click",function(){takeToLesson(lessons[currentLesson]);});
  makeDraggable(card,el("demoCoachDrag"));
}
function clampCoachPosition(card){
  if(!card||card.hidden)return;
  var rect=card.getBoundingClientRect(),bar=el("eocnsDemoBar");
  var minLeft=8,maxLeft=Math.max(8,window.innerWidth-card.offsetWidth-8);
  var minTop=bar?bar.getBoundingClientRect().bottom+8:8;
  var maxTop=Math.max(minTop,window.innerHeight-card.offsetHeight-8);
  card.style.left=Math.min(maxLeft,Math.max(minLeft,rect.left))+"px";
  card.style.top=Math.min(maxTop,Math.max(minTop,rect.top))+"px";
  card.style.right="auto";card.style.bottom="auto";
}
function makeDraggable(card,handle){
  if(!card||!handle||handle.__eocnsDragBound)return;
  handle.__eocnsDragBound=true;
  handle.style.touchAction="none";handle.style.userSelect="none";handle.style.cursor="grab";
  handle.addEventListener("pointerdown",function(e){
    if(e.target.closest("button"))return;
    if(e.pointerType==="mouse"&&e.button!==0)return;
    var rect=card.getBoundingClientRect();
    if(!card.dataset.dragPositioned){
      card.style.left=rect.left+"px";card.style.top=rect.top+"px";
      card.style.right="auto";card.style.bottom="auto";card.dataset.dragPositioned="1";
    }
    dragState={pointerId:e.pointerId,offsetX:e.clientX-rect.left,offsetY:e.clientY-rect.top};
    handle.classList.add("is-dragging");
    try{handle.setPointerCapture(e.pointerId);}catch(_){}
    e.preventDefault();
  });
  handle.addEventListener("pointermove",function(e){
    if(!dragState||dragState.pointerId!==e.pointerId)return;
    var bar=el("eocnsDemoBar"),minLeft=8,maxLeft=Math.max(8,window.innerWidth-card.offsetWidth-8);
    var barHeight=bar?bar.getBoundingClientRect().bottom:0;
    var minTop=barHeight+8,maxTop=Math.max(minTop,window.innerHeight-card.offsetHeight-8);
    card.style.left=Math.min(maxLeft,Math.max(minLeft,e.clientX-dragState.offsetX))+"px";
    card.style.top=Math.min(maxTop,Math.max(minTop,e.clientY-dragState.offsetY))+"px";
  });
  function stopDrag(e){
    if(!dragState||(e&&dragState.pointerId!==e.pointerId))return;
    dragState=null;handle.classList.remove("is-dragging");clampCoachPosition(card);
  }
  handle.addEventListener("pointerup",stopDrag);
  handle.addEventListener("pointercancel",stopDrag);
  handle.addEventListener("lostpointercapture",stopDrag);
  if(!window.__eocnsCoachResizeBound){
    window.__eocnsCoachResizeBound=true;
    window.addEventListener("resize",function(){clampCoachPosition(el("eocnsDemoCoach"));});
  }
}
function toggleLessonMenu(){
  if(el("eocnsDemoMenu")){el("eocnsDemoMenu").remove();lessonMenuOpen=false;return;}
  var menu=document.createElement("aside");menu.id="eocnsDemoMenu";
  var html='<div style="display:flex;justify-content:space-between;align-items:center"><h3>All 20 Practice Lessons</h3><button type="button" id="demoMenuClose" style="width:auto;border:0;font-size:22px;padding:2px 8px">×</button></div><p style="color:#64748b;font-size:12px">Choose a lesson to jump directly to that part of the system.</p>';
  lessons.forEach(function(l,i){html+='<button type="button" data-lesson="'+i+'" class="'+(i===currentLesson?"active":"")+'">'+String(i+1).padStart(2,"0")+'. '+escapeHtml(l.title)+'</button>';});
  menu.innerHTML=html;document.body.appendChild(menu);lessonMenuOpen=true;
  el("demoMenuClose").addEventListener("click",function(){menu.remove();lessonMenuOpen=false;});
  menu.querySelectorAll("[data-lesson]").forEach(function(b){b.addEventListener("click",function(){menu.remove();lessonMenuOpen=false;goLesson(Number(b.dataset.lesson));});});
}
function escapeHtml(value){return String(value).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});}
function updateProgress(){
  var n=currentLesson+1,p=Math.round(n/lessons.length*100);
  if(el("demoProgressText"))el("demoProgressText").textContent="Lesson "+n+" of 20";
  if(el("demoProgressPct"))el("demoProgressPct").textContent=p+"%";
  if(el("demoProgressFill"))el("demoProgressFill").style.width=p+"%";
}
function clearSpotlight(){document.querySelectorAll(".demo-spotlight").forEach(function(n){n.classList.remove("demo-spotlight");});}
function takeToLesson(lesson){
  if(lesson.view&&typeof window.showView==="function")try{window.showView(lesson.view);}catch(_){}
  else{
    var nav=document.querySelector('[data-view="'+lesson.view+'"]');if(nav)nav.click();
  }
  setTimeout(function(){
    if(lesson.view){var nav=document.querySelector('[data-view="'+lesson.view+'"]');if(nav&&lesson.view!=="dashboard")nav.click();}
    if(currentLesson===0){var signIn=el("btnDashboardOfficerLogin");if(signIn)signIn.click();}
    if(currentLesson===15){
      document.querySelectorAll("#view-hostel details").forEach(function(d){d.open=true;});
    }
    var target=lesson.target&&el(lesson.target);
    if(target){target.scrollIntoView({behavior:"smooth",block:"center"});target.classList.add("demo-spotlight");}
  },250);
}
function renderLesson(){
  var l=lessons[currentLesson],n=currentLesson+1;
  clearSpotlight();
  el("demoCoachMain").hidden=false;el("demoCoachGrad").hidden=true;
  var lessonBody=el("demoCoachMain").querySelector(".coach-body");if(lessonBody)lessonBody.scrollTop=0;
  el("demoCoachKicker").textContent="Lesson "+n+" of 20";
  el("demoCoachTitle").textContent=l.title;
  el("demoCoachWhat").textContent=l.what;
  var list=el("demoCoachSteps");list.innerHTML="";
  l.steps.forEach(function(step){var li=document.createElement("li");li.textContent=step;list.appendChild(li);});
  el("demoBack").disabled=currentLesson===0;
  el("demoBack").style.opacity=currentLesson===0?".45":"1";
  el("demoNext").textContent=currentLesson===19?"Finish Training →":"Next Lesson →";
  updateProgress();
  if(coachVisible)el("eocnsDemoCoach").hidden=false;
  takeToLesson(l);
}
function goLesson(index){
  currentLesson=Math.max(0,Math.min(lessons.length-1,index));
  coachVisible=true;el("eocnsDemoCoach").hidden=false;el("demoCoachToggle").textContent="Hide Coach";
  renderLesson();
}
function showGraduation(){
  var card=el("eocnsDemoCoach");
  el("demoCoachMain").hidden=true;el("demoCoachGrad").hidden=false;
  var graduationBody=el("demoCoachGrad").querySelector(".coach-body");if(graduationBody)graduationBody.scrollTop=0;
  el("demoCoachKicker").textContent="PRACTICE COMPLETE";
  el("demoCoachTitle").textContent="Training Complete!";
  el("demoRestartTour").onclick=function(){goLesson(0);};
  el("demoFreePractice").onclick=function(){card.hidden=true;coachVisible=false;el("demoCoachToggle").textContent="Show Coach";};
  el("demoGraduateExit").onclick=function(){window.exitEocnsDemoMode();};
  currentLesson=19;updateProgress();
}
function initDemoUi(){
  injectStyles();createBanner();createCoach();injectPracticeFiles();goLesson(0);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initDemoUi,{once:true});
else initDemoUi();

})();