// Into the Computer server. Runs as the teacher who deployed it and stores everything in a Google Sheet.
//
// Security model: students never touch the Sheet. Every request goes through api(), which works out
// who is asking from their Google sign-in (never from anything the browser sends) and only runs
// what that role is allowed to do. Functions ending in _ can't be called from the browser.

const CELL_CHUNK = 45000; // A Sheets cell holds at most 50,000 characters.
const WORK_CELLS = 3;
const MAX_WORK_CHARS = CELL_CHUNK * WORK_CELLS;

const LESSON_IDS = ['l1', 'l2', 'l3', 'l4', 'l5'];
const TRACKS = ['design', 'history'];
const RUBRIC_ROWS = 3; // Every lesson's rubric has three rows, each scored 1 to 4.
const MAX_STEP = 30;

const chunkCols_ = (n) => Array.from({ length: n }, (_, i) => `data${i + 1}`);
// Once a teacher's Sheet holds real work, a new Works field goes in WORK_TAIL, after the data
// columns, so existing rows keep their columns. metaWorks_ reads it with one extra range.
const WORK_TAIL = [];
const WORK_META = ['id', 'student_id', 'lesson_id', 'status', 'track', 'step_at', 'stretch_done', 'reflection', 'done_count', 'done_total', 'quiz_right', 'quiz_total', 'all_done', 'link', 'submitted_at', 'updated_at'];

const SCHEMA = {
  Teachers: ['email', 'display_name', 'created_at'],
  Classes: ['id', 'teacher_email', 'name', 'created_at'],
  Students: ['id', 'class_id', 'email', 'display_name', 'avatar', 'created_at', 'google_id'],
  // One row per student per lesson. The answers to each activity are JSON in the data columns.
  Works: [...WORK_META, ...chunkCols_(WORK_CELLS), ...WORK_TAIL],
  Grades: ['work_id', 'scores', 'total', 'max_total', 'feedback', 'graded_at'],
  Awards: ['id', 'student_id', 'badge_id', 'note', 'created_at'],
  // One row per lesson per class: the Classroom assignment this app made for it.
  GradeSync: ['class_id', 'lesson_id', 'coursework_id', 'link', 'due', 'pushed_at', 'sent', 'title', 'points'],
  Daily: ['class_id', 'plan', 'updated_at'],
  Links: ['class_id', 'course_id', 'course_name', 'synced_at'],
  Settings: ['key', 'value', 'updated_at'],
};
const NUMBERS = new Set(['step_at', 'stretch_done', 'done_count', 'done_total', 'quiz_right', 'quiz_total', 'total', 'max_total', 'points']);
const BOOLEANS = new Set(['all_done']);
const OBJECTS = new Set(['avatar', 'scores', 'plan', 'sent', 'value']);

// Web page ----------------------------------------------------------------------------------------

function doGet() {
  return HtmlService.createTemplateFromFile('Index').evaluate()
    .setTitle('Into the Computer')
    // The tab icon can only be a link to an image: Google's laptop emoji, from the same servers as the fonts.
    .setFaviconUrl('https://fonts.gstatic.com/s/e/notoemoji/latest/1f4bb/512.png')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function include_(name) {
  return HtmlService.createHtmlOutputFromFile(name).getContent();
}

// The only door in --------------------------------------------------------------------------------

function api(method, argsJson) {
  try {
    const me = whoAmI_();
    const routes = me.role === 'teacher' ? TEACHER_ROUTES : me.role === 'student' ? STUDENT_ROUTES : {};
    if (method === 'batch') return reply_(runBatch_(me, routes, JSON.parse(argsJson || '[]')[0]));
    return reply_(route_(me, routes, method, JSON.parse(argsJson || '[]')));
  } catch (e) {
    console.error(`${method}: ${e && e.stack}`);
    return JSON.stringify({ ok: false, error: String((e && e.message) || e) });
  }
}

function route_(me, routes, method, args) {
  if (method === 'session') return sessionFor_(me);
  if (!Object.prototype.hasOwnProperty.call(routes, method)) throw new Error('You do not have access to that.');
  if (!Array.isArray(args)) throw new Error('Bad request.');
  return routes[method](me, ...args);
}

/** Several calls in one trip, since each trip costs about a second. Each still goes through route_. */
function runBatch_(me, routes, calls) {
  if (!Array.isArray(calls) || calls.length > 12) throw new Error('Too many requests at once.');
  return calls.map((c) => {
    const method = Array.isArray(c) ? String(c[0]) : '';
    try {
      if (method === 'batch') throw new Error('You do not have access to that.');
      const data = route_(me, routes, method, c[1]);
      return { ok: true, data: data === undefined ? null : data };
    } catch (e) {
      console.error(`${method}: ${e && e.stack}`);
      return { ok: false, error: String((e && e.message) || e) };
    }
  });
}

const reply_ = (data) => JSON.stringify({ ok: true, data: data === undefined ? null : data });

function whoAmI_() {
  const email = String(Session.getActiveUser().getEmail() || '').trim().toLowerCase();
  if (!email) return { role: null, email: '' };
  const owner = ownerEmail_();
  let teacher = rows_('Teachers').find((t) => t.email === email);
  if (!teacher && email === owner) {
    teacher = { email, display_name: email.split('@')[0], created_at: now_() };
    withLock_(() => { if (!rows_('Teachers').some((t) => t.email === email)) insert_('Teachers', teacher); });
  }
  if (teacher) return { role: 'teacher', email, teacher };
  const student = rows_('Students').find((s) => s.email === email);
  if (student) return { role: 'student', email, student };
  return { role: null, email };
}

function sessionFor_(me) {
  const settings = { models_off: modelsOff_() };
  if (me.role === 'teacher') return { role: 'teacher', teacher: { id: me.email, display_name: me.teacher.display_name }, is_owner: me.email === ownerEmail_(), settings };
  if (me.role === 'student') {
    const cls = rows_('Classes').find((c) => c.id === me.student.class_id);
    return { role: 'student', student: publicStudent_(me.student), class: cls ? { id: cls.id, name: cls.name } : null, settings };
  }
  return { role: null, email: me.email };
}

// Storage -----------------------------------------------------------------------------------------

let spreadsheet_ = null;

/** Uses the Sheet this script is attached to, or else creates one and remembers it. */
function db_() {
  if (spreadsheet_) return spreadsheet_;
  spreadsheet_ = SpreadsheetApp.getActiveSpreadsheet();
  if (spreadsheet_) return spreadsheet_;
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('DATA_SHEET_ID');
  if (id) {
    spreadsheet_ = SpreadsheetApp.openById(id);
  } else {
    spreadsheet_ = SpreadsheetApp.create('Into the Computer Data');
    props.setProperty('DATA_SHEET_ID', spreadsheet_.getId());
  }
  return spreadsheet_;
}

function sheet_(name) {
  const ss = db_();
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    const cols = SCHEMA[name];
    // Plain text format stops Sheets from turning student text into dates or formulas.
    sh.getRange(1, 1, 1000, cols.length).setNumberFormat('@');
    sh.getRange(1, 1, 1, cols.length).setValues([cols]);
    sh.setFrozenRows(1);
  }
  return sh;
}

/** Text starting with these could run as a formula if a teacher ever re-pastes the Sheet. */
const encText_ = (s) => (/^[=+\-@'~]/.test(s) ? `~${s}` : s);
const decText_ = (s) => (s.charAt(0) === '~' ? s.slice(1) : s);

function encode_(field, value) {
  if (value === null || value === undefined) return '';
  if (OBJECTS.has(field)) return encText_(JSON.stringify(value));
  return encText_(String(value));
}

function decode_(field, cell) {
  const s = decText_(String(cell));
  if (BOOLEANS.has(field)) return s === 'true';
  if (NUMBERS.has(field)) return s === '' ? 0 : Number(s);
  if (OBJECTS.has(field)) return s === '' ? null : JSON.parse(s);
  if (s === '' && field === 'submitted_at') return null;
  return s;
}

/** Read a table. Pass `cols` to read just the first few columns and skip the heavy answer cells. */
function rows_(name, cols) {
  const sh = sheet_(name);
  const fields = (cols || SCHEMA[name]);
  const last = sh.getLastRow();
  if (last < 2) return [];
  return sh.getRange(2, 1, last - 1, fields.length).getValues().map((vals, i) => {
    const o = { _row: i + 2 };
    fields.forEach((f, c) => { o[f] = f.startsWith('data') ? String(vals[c]) : decode_(f, vals[c]); });
    return o;
  });
}

const toCells_ = (name, obj) => SCHEMA[name].map((f) => (f.startsWith('data') && obj[f] !== undefined ? obj[f] : encode_(f, obj[f])));
const insert_ = (name, obj) => sheet_(name).appendRow(toCells_(name, obj));

function update_(name, row) {
  const cols = SCHEMA[name];
  sheet_(name).getRange(row._row, 1, 1, cols.length).setValues([toCells_(name, row)]);
}

function readRow_(name, rowNumber) {
  const fields = SCHEMA[name];
  const vals = sheet_(name).getRange(rowNumber, 1, 1, fields.length).getValues()[0];
  const o = { _row: rowNumber };
  fields.forEach((f, c) => { o[f] = f.startsWith('data') ? String(vals[c]) : decode_(f, vals[c]); });
  return o;
}

/** Delete bottom-up so earlier row numbers stay valid. */
function deleteRows_(name, predicate, cols) {
  const sh = sheet_(name);
  rows_(name, cols || SCHEMA[name].slice(0, 3)).filter(predicate).map((r) => r._row).sort((a, b) => b - a).forEach((r) => sh.deleteRow(r));
}

/** Split long text across cells, and join it back. Each piece is marked so it can't act as a formula. */
function packChunks_(target, text, count) {
  for (let i = 0; i < count; i++) {
    const part = text.slice(i * CELL_CHUNK, (i + 1) * CELL_CHUNK);
    target[`data${i + 1}`] = part ? `~${part}` : '';
  }
}
function unpackChunks_(row, count) {
  let out = '';
  for (let i = 0; i < count; i++) out += decText_(row[`data${i + 1}`] || '');
  return out;
}

function withLock_(fn) {
  const lock = LockService.getScriptLock();
  const asked = Date.now();
  try {
    lock.waitLock(20000);
  } catch (_) {
    console.warn('LOCK_TIMEOUT: waited 20 s for a turn to save');
    throw new Error('The class is saving a lot right now. Trying again soon.');
  }
  // Shows in Apps Script's Executions log, so a pilot can see saves queuing up before they fail.
  const waited = Date.now() - asked;
  if (waited > 3000) console.warn(`LOCK_SLOW: waited ${waited} ms for a turn to save`);
  try {
    const result = fn();
    SpreadsheetApp.flush();
    return result;
  } finally {
    lock.releaseLock();
  }
}

const now_ = () => new Date().toISOString();
const uuid_ = () => Utilities.getUuid();
const text_ = (v, max) => String(v === null || v === undefined ? '' : v).slice(0, max);
const clampInt_ = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(Number(v) || 0)));
const ownerEmail_ = () => String(Session.getEffectiveUser().getEmail() || '').trim().toLowerCase();

// Shared rules ------------------------------------------------------------------------------------

/** What other people and the browser may see about a student. Never their email. */
function publicStudent_(s) {
  return { id: s.id, class_id: s.class_id, display_name: s.display_name, avatar: s.avatar };
}

function ownedClass_(me, classId) {
  const c = rows_('Classes').find((x) => x.id === classId);
  if (!c || c.teacher_email !== me.email) throw new Error('That is not your class.');
  return c;
}

function studentOfTeacher_(me, studentId) {
  const s = rows_('Students').find((x) => x.id === studentId);
  if (!s) throw new Error('That student was not found.');
  ownedClass_(me, s.class_id);
  return s;
}

/** A teacher may view classes they own. A student may view only their own class. */
function canViewClass_(me, classId) {
  if (me.role === 'teacher') ownedClass_(me, classId);
  else if (!me.student || me.student.class_id !== classId) throw new Error('That is not your class.');
}

function metaWorks_() {
  const rows = rows_('Works', WORK_META);
  if (!rows.length || !WORK_TAIL.length) return rows;
  const col = SCHEMA.Works.length - WORK_TAIL.length + 1;
  const tail = sheet_('Works').getRange(2, col, rows.length, WORK_TAIL.length).getValues();
  rows.forEach((r, i) => WORK_TAIL.forEach((f, c) => { r[f] = decode_(f, tail[i][c]); }));
  return rows;
}

const metaOut_ = (w) => { const o = {}; [...WORK_META, ...WORK_TAIL].forEach((f) => { o[f] = w[f]; }); return o; };

function fullWork_(row) {
  const full = readRow_('Works', row._row);
  let doc = {};
  try { doc = JSON.parse(unpackChunks_(full, WORK_CELLS) || '{}'); } catch (_) { doc = {}; }
  return { ...metaOut_(full), answers: doc.answers || {} };
}

const gradeFor_ = (workId, grades) => {
  const g = grades.find((x) => x.work_id === workId);
  if (!g) return null;
  const { _row, ...rest } = g;
  return rest;
};

/**
 * What classmates may see: names, characters, where each student is, and what they turned in.
 * Never answers, reflections, links, grades, feedback, whether work was approved or sent back, or emails.
 */
function classBoard_(me, classId) {
  canViewClass_(me, classId);
  const students = rows_('Students').filter((s) => s.class_id === classId).sort((a, b) => a.display_name.localeCompare(b.display_name));
  const works = metaWorks_();
  const awards = rows_('Awards');
  return students.map((s) => ({
    id: s.id, display_name: s.display_name, avatar: s.avatar,
    works: works.filter((w) => w.student_id === s.id).map((w) => ({
      lesson_id: w.lesson_id, done: w.status !== 'in_progress', track: w.track, step_at: w.step_at,
      stretch_done: w.stretch_done, all_done: w.all_done, submitted_at: w.submitted_at,
    })),
    awards: awards.filter((a) => a.student_id === s.id).map((a) => ({ badge_id: a.badge_id, note: a.note, created_at: a.created_at })),
  }));
}

// Settings ----------------------------------------------------------------------------------------

const MODEL_KEY = /^[a-z0-9]{1,20}$/;
function setting_(key) {
  const row = rows_('Settings').find((r) => r.key === key);
  return row ? row.value : null;
}
const modelsOff_ = () => { const v = setting_('models_off'); return Array.isArray(v) ? v.filter((k) => MODEL_KEY.test(String(k))) : []; };

function setModelsOff_(me, list) {
  ownerOnly_(me);
  const clean = (Array.isArray(list) ? list : []).map(String).filter((k) => MODEL_KEY.test(k)).slice(0, 60);
  withLock_(() => {
    const row = rows_('Settings').find((r) => r.key === 'models_off');
    const next = { key: 'models_off', value: clean, updated_at: now_() };
    if (row) update_('Settings', { ...next, _row: row._row });
    else insert_('Settings', next);
  });
  return clean;
}

// Teacher actions ---------------------------------------------------------------------------------

/** Accepts: "Ari M, ari@school.org", "Ari M <ari@school.org>", or just "ari@school.org". */
function parseRosterLine_(line) {
  const m = line.match(/[^\s,<>;]+@[^\s,<>;]+\.[^\s,<>;]+/);
  if (!m) throw new Error(`No email found in: "${line}". Use one per line, like: Ari M, ari@school.org`);
  const email = m[0].toLowerCase();
  const name = line.replace(m[0], '').replace(/[<>,;\t]/g, ' ').trim().replace(/\s+/g, ' ');
  return { email, display_name: text_(name || email.split('@')[0], 60) };
}

function ownerOnly_(me) {
  if (me.role !== 'teacher' || me.email !== ownerEmail_()) throw new Error('Only the teacher who set up this app can do that.');
}

// Google Classroom ---------------------------------------------------------------------------------
// The app runs under the deploying teacher's account, so these calls can see that teacher's courses.
// Other teachers on this deployment must never reach them, so every route here checks ownerOnly_.

function allPages_(fetchPage, key) {
  let items = [];
  let token;
  do {
    const page = fetchPage(token);
    items = items.concat(page[key] || []);
    token = page.nextPageToken;
  } while (token);
  return items;
}

const pageOpts_ = (token, extra) => ({ pageSize: 100, ...(extra || {}), ...(token ? { pageToken: token } : {}) });
const myCourses_ = () => allPages_((t) => Classroom.Courses.list(pageOpts_(t, { teacherId: 'me', courseStates: ['ACTIVE'] })), 'courses');
const courseRoster_ = (id) => allPages_((t) => Classroom.Courses.Students.list(id, pageOpts_(t)), 'students');

/** Classmates see this name, so keep only a last initial. */
function shortName_(fullName) {
  const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return text_(parts[0] || 'Student', 60);
  return text_(`${parts[0]} ${parts[parts.length - 1].charAt(0).toUpperCase()}`, 60);
}

const linkFor_ = (classId) => rows_('Links').find((l) => l.class_id === classId);

/** Bring one course's roster in, adding only what's new. Never removes anyone. */
function applyRoster_(me, course, roster) {
  return withLock_(() => {
    const link = rows_('Links').find((l) => l.course_id === course.id);
    let classId;
    if (link) {
      classId = link.class_id;
      ownedClass_(me, classId);
    } else {
      classId = uuid_();
      insert_('Classes', { id: classId, teacher_email: me.email, name: text_(course.name, 80), created_at: now_() });
      insert_('Links', { class_id: classId, course_id: course.id, course_name: text_(course.name, 120), synced_at: now_() });
    }
    const students = rows_('Students');
    const teachers = new Set(rows_('Teachers').map((t) => t.email));
    const seenIds = new Set();
    const result = { name: course.name, class_id: classId, added: 0, matched: 0, skipped: [], gone: 0 };
    for (const entry of roster) {
      const googleId = String(entry.userId);
      const fullName = entry.profile && entry.profile.name && entry.profile.name.fullName;
      const email = String((entry.profile && entry.profile.emailAddress) || '').trim().toLowerCase();
      seenIds.add(googleId);
      if (!email) { result.skipped.push(`${shortName_(fullName)}: Classroom did not share an email`); continue; }
      if (teachers.has(email)) { result.skipped.push(`${shortName_(fullName)}: is a teacher here`); continue; }
      const existing = students.find((s) => s.email === email);
      if (existing && existing.class_id !== classId) { result.skipped.push(`${existing.display_name}: already in another class here`); continue; }
      if (existing) {
        if (existing.google_id !== googleId) update_('Students', { ...existing, google_id: googleId });
        result.matched++;
      } else {
        insert_('Students', { id: uuid_(), class_id: classId, email, display_name: shortName_(fullName), avatar: null, created_at: now_(), google_id: googleId });
        result.added++;
      }
    }
    result.gone = rows_('Students').filter((s) => s.class_id === classId && s.google_id && !seenIds.has(s.google_id)).length;
    const current = rows_('Links').find((l) => l.class_id === classId);
    update_('Links', { ...current, synced_at: now_() });
    return result;
  });
}

// Sending grades to Classroom. Google only lets an app grade assignments that app created, so
// Into the Computer makes one assignment per lesson and remembers it in the GradeSync tab.
function dueParts_(date) {
  const [y, m, d] = String(date).split('-').map(Number);
  const at = new Date(y, m - 1, d, 23, 59);
  return { dueDate: { year: at.getUTCFullYear(), month: at.getUTCMonth() + 1, day: at.getUTCDate() }, dueTime: { hours: at.getUTCHours(), minutes: at.getUTCMinutes() } };
}

/** Each student's approved grade for one lesson, scaled to the assignment's points. */
function lessonGrades_(classId, lessonId, points) {
  const students = rows_('Students').filter((s) => s.class_id === classId);
  const grades = rows_('Grades');
  return metaWorks_().filter((w) => w.status === 'approved' && w.lesson_id === lessonId).map((w) => {
    const student = students.find((s) => s.id === w.student_id);
    const grade = student && grades.find((g) => g.work_id === w.id);
    if (!grade) return null;
    return { student, value: Math.round((grade.total / (grade.max_total || 1)) * points * 10) / 10 };
  }).filter(Boolean);
}

function gradeSyncStatus_(me, classId) {
  ownerOnly_(me);
  ownedClass_(me, classId);
  if (!linkFor_(classId)) return { linked: false };
  const syncs = rows_('GradeSync').filter((g) => g.class_id === classId);
  return {
    linked: true,
    items: LESSON_IDS.map((lessonId) => {
      const sync = syncs.find((g) => g.lesson_id === lessonId);
      const points = sync ? Number(sync.points) || 100 : 100;
      const grades = lessonGrades_(classId, lessonId, points);
      const sent = (sync && sync.sent) || {};
      return {
        lesson_id: lessonId, approved: grades.length, synced: !!sync,
        waiting: sync ? grades.filter((g) => sent[g.student.id] !== g.value).length : grades.length,
        title: sync ? sync.title : '', points: sync ? points : null, link: sync ? sync.link : '', due: sync ? sync.due : '',
      };
    }),
  };
}

function appUrl_() {
  try { return String(ScriptApp.getService().getUrl() || ''); } catch (_) { return ''; }
}

/** Make named assignments in the linked Classroom course, before or after any grading. */
function createAssignments_(me, classId, items, opts) {
  ownerOnly_(me);
  ownedClass_(me, classId);
  const link = linkFor_(classId);
  if (!link) throw new Error('Import this course from Google Classroom first.');
  if (!Array.isArray(items) || !items.length || items.length > LESSON_IDS.length) throw new Error('Choose the lessons to make assignments for.');
  const publish = !!(opts && opts.publish);
  const url = appUrl_();
  const out = { created: 0, skipped: [], failed: [] };
  items.forEach((it) => {
    const lessonId = String(it && it.lesson_id);
    if (!LESSON_IDS.includes(lessonId)) throw new Error('Unknown lesson.');
    const title = text_(it.title, 150).trim();
    const points = Math.round(Number(it.points));
    const due = String(it.due || '');
    if (!title) { out.failed.push(`${lessonId}: needs a name`); return; }
    if (!(points >= 1 && points <= 1000)) { out.failed.push(`${title}: points must be 1 to 1000`); return; }
    if (due && !/^\d{4}-\d{2}-\d{2}$/.test(due)) { out.failed.push(`${title}: bad due date`); return; }
    if (rows_('GradeSync').some((g) => g.class_id === classId && g.lesson_id === lessonId)) { out.skipped.push(`${title}: already in Classroom`); return; }
    try {
      const body = {
        title, description: text_(it.description, 1000), workType: 'ASSIGNMENT', state: publish ? 'PUBLISHED' : 'DRAFT', maxPoints: points,
        ...(due ? dueParts_(due) : {}),
      };
      if (/^https:\/\//.test(url)) body.materials = [{ link: { url, title: 'Open Into the Computer' } }];
      const created = Classroom.Courses.CourseWork.create(body, link.course_id);
      withLock_(() => insert_('GradeSync', {
        class_id: classId, lesson_id: lessonId, coursework_id: String(created.id), link: created.alternateLink || '', due, pushed_at: '', sent: {}, title, points,
      }));
      out.created++;
    } catch (e) {
      out.failed.push(`${title}: ${text_(e && e.message, 160)}`);
    }
  });
  return out;
}

/** Send every approved grade that changed since the last send, to the assignments already made. */
function pushGrades_(me, classId) {
  ownerOnly_(me);
  ownedClass_(me, classId);
  const link = linkFor_(classId);
  if (!link) throw new Error('Import this course from Google Classroom first.');
  const syncs = rows_('GradeSync').filter((g) => g.class_id === classId);
  const out = { sent: 0, assignments: 0, skipped: [], failed: [] };
  syncs.forEach((sync) => {
    const points = Number(sync.points) || 100;
    const sent = {};
    const before = sync.sent || {};
    const todo = lessonGrades_(classId, sync.lesson_id, points).filter((g) => before[g.student.id] !== g.value);
    if (!todo.length) return;
    out.assignments++;
    let subs;
    try {
      subs = allPages_((t) => Classroom.Courses.CourseWork.StudentSubmissions.list(link.course_id, sync.coursework_id, pageOpts_(t)), 'studentSubmissions');
    } catch (e) {
      out.failed.push(`${sync.title}: ${text_(e && e.message, 160)}`);
      return;
    }
    if (!subs.length) { out.skipped.push(`${sync.title}: no students in it yet. If it is a draft, post it in Classroom first.`); return; }
    todo.forEach(({ student, value }) => {
      if (!student.google_id) { out.skipped.push(`${student.display_name}: not imported from Classroom`); return; }
      const sub = subs.find((x) => String(x.userId) === String(student.google_id));
      if (!sub) { out.skipped.push(`${student.display_name}: not in "${sync.title}"`); return; }
      try {
        Classroom.Courses.CourseWork.StudentSubmissions.patch(
          { draftGrade: value, assignedGrade: value }, link.course_id, sync.coursework_id, sub.id, { updateMask: 'draftGrade,assignedGrade' });
        sent[student.id] = value;
        out.sent++;
      } catch (e) {
        out.failed.push(`${student.display_name}: ${text_(e && e.message, 160)}`);
      }
    });
    withLock_(() => {
      const current = rows_('GradeSync').find((g) => g.class_id === classId && g.lesson_id === sync.lesson_id);
      if (current) update_('GradeSync', { ...current, sent: { ...(current.sent || {}), ...sent }, pushed_at: now_() });
    });
  });
  return out;
}

/** What a teacher set for today's class display. Text is limited, and standards must look like codes. */
function cleanPlan_(p) {
  const when = String(p.timer_end || '');
  return {
    day: text_(p.day, 10),
    question: text_(p.question, 200),
    focus: text_(p.focus, 300),
    standards: (Array.isArray(p.standards) ? p.standards : []).map(String).filter((c) => /^6-8\.[A-Z]+\.[a-e]\.\d$/.test(c)).slice(0, 3),
    timer_end: when && !Number.isNaN(Date.parse(when)) ? new Date(when).toISOString() : '',
  };
}

/** Rubric scores: up to three rows, each a whole number from 1 to 4. The totals are worked out here. */
function cleanScores_(scores) {
  const out = {};
  Object.keys(scores && typeof scores === 'object' ? scores : {}).slice(0, RUBRIC_ROWS).forEach((k) => {
    const v = Math.round(Number(scores[k]));
    if (/^[a-z]{1,20}$/.test(k) && v >= 1 && v <= 4) out[k] = v;
  });
  return out;
}

function removeStudentData_(ids) {
  const workIds = new Set(metaWorks_().filter((w) => ids.has(w.student_id)).map((w) => w.id));
  deleteRows_('Grades', (g) => workIds.has(g.work_id));
  deleteRows_('Works', (w) => ids.has(w.student_id));
  deleteRows_('Awards', (a) => ids.has(a.student_id));
}

const TEACHER_ROUTES = {
  listGoogleCourses: (me) => {
    ownerOnly_(me);
    const linked = new Set(rows_('Links').map((l) => l.course_id));
    return myCourses_().map((c) => ({ id: c.id, name: c.name, section: c.section || '', linked: linked.has(c.id) }));
  },
  importCourses: (me, ids) => {
    ownerOnly_(me);
    const courses = myCourses_();
    return (Array.isArray(ids) ? ids : []).slice(0, 20).map((id) => {
      const course = courses.find((c) => c.id === id);
      if (!course) throw new Error('That course was not found in your Google Classroom.');
      return applyRoster_(me, course, courseRoster_(id));
    });
  },
  gradeSyncStatus: gradeSyncStatus_,
  pushGrades: pushGrades_,
  createAssignments: createAssignments_,
  setModelsOff: setModelsOff_,
  getClassPlan: (me, classId) => {
    ownedClass_(me, classId);
    const row = rows_('Daily').find((d) => d.class_id === classId);
    return row ? row.plan : null;
  },
  saveClassPlan: (me, classId, plan) => withLock_(() => {
    ownedClass_(me, classId);
    const clean = cleanPlan_(plan || {});
    const row = rows_('Daily').find((d) => d.class_id === classId);
    if (row) update_('Daily', { ...row, plan: clean, updated_at: now_() });
    else insert_('Daily', { class_id: classId, plan: clean, updated_at: now_() });
    return clean;
  }),
  listClasses: (me) => rows_('Classes').filter((c) => c.teacher_email === me.email).map(({ _row, ...c }) => ({ ...c, linked: !!linkFor_(c.id) })),
  getClass: (me, id) => { const { _row, ...c } = ownedClass_(me, id); return { ...c, linked: !!linkFor_(id) }; },
  createClass: (me, name) => withLock_(() => {
    const c = { id: uuid_(), teacher_email: me.email, name: text_(name, 80).trim(), created_at: now_() };
    if (!c.name) throw new Error('Give your class a name.');
    insert_('Classes', c);
    return c;
  }),
  renameClass: (me, id, name) => withLock_(() => {
    const c = ownedClass_(me, id);
    const clean = text_(name, 80).trim();
    if (!clean) throw new Error('Give your class a name.');
    update_('Classes', { ...c, name: clean });
  }),
  deleteClass: (me, id) => withLock_(() => {
    ownedClass_(me, id);
    removeStudentData_(new Set(rows_('Students').filter((s) => s.class_id === id).map((s) => s.id)));
    deleteRows_('GradeSync', (g) => g.class_id === id);
    deleteRows_('Daily', (d) => d.class_id === id);
    deleteRows_('Links', (l) => l.class_id === id);
    deleteRows_('Students', (s) => s.class_id === id);
    deleteRows_('Classes', (c) => c.id === id);
  }),
  listStudents: (me, classId) => {
    ownedClass_(me, classId);
    // The teacher sees emails on the roster. Nobody else ever does.
    return rows_('Students').filter((s) => s.class_id === classId).map((s) => ({ ...publicStudent_(s), email: s.email, from_classroom: !!s.google_id }))
      .sort((a, b) => a.display_name.localeCompare(b.display_name));
  },
  addStudents: (me, classId, lines) => withLock_(() => {
    ownedClass_(me, classId);
    const people = (Array.isArray(lines) ? lines : []).slice(0, 200).map((l) => String(l).trim()).filter(Boolean).map(parseRosterLine_);
    const taken = new Set([...rows_('Students').map((s) => s.email), ...rows_('Teachers').map((t) => t.email)]);
    const seen = new Set();
    for (const p of people) {
      if (taken.has(p.email)) throw new Error(`${p.email} is already on a roster or is a teacher. Nothing was added.`);
      if (seen.has(p.email)) throw new Error(`${p.email} is listed twice. Nothing was added.`);
      seen.add(p.email);
    }
    return people.map((p) => {
      const s = { id: uuid_(), class_id: classId, email: p.email, display_name: p.display_name, avatar: null, created_at: now_(), google_id: '' };
      insert_('Students', s);
      return publicStudent_(s);
    });
  }),
  renameStudent: (me, id, name) => withLock_(() => {
    const s = studentOfTeacher_(me, id);
    const clean = text_(name, 60).trim();
    if (!clean) throw new Error('A name is needed.');
    update_('Students', { ...s, display_name: clean });
  }),
  removeStudent: (me, id) => withLock_(() => {
    studentOfTeacher_(me, id);
    removeStudentData_(new Set([id]));
    deleteRows_('Students', (s) => s.id === id);
  }),
  classBoard: classBoard_,
  classWork: (me, classId) => {
    ownedClass_(me, classId);
    const ids = new Set(rows_('Students').filter((s) => s.class_id === classId).map((s) => s.id));
    const grades = rows_('Grades');
    return metaWorks_().filter((w) => ids.has(w.student_id)).map((w) => ({ ...metaOut_(w), grade: gradeFor_(w.id, grades) }));
  },
  getWorkFull: (me, id) => {
    const w = metaWorks_().find((x) => x.id === id);
    if (!w) return null;
    const s = studentOfTeacher_(me, w.student_id);
    return { ...fullWork_(w), grade: gradeFor_(id, rows_('Grades')), student: publicStudent_(s) };
  },
  saveGrade: (me, id, g) => withLock_(() => {
    const meta = metaWorks_().find((x) => x.id === id);
    if (!meta) throw new Error('That work was not found.');
    studentOfTeacher_(me, meta.student_id);
    const status = String(g && g.status);
    if (!['approved', 'returned'].includes(status)) throw new Error('Unknown status.');
    if (meta.status === 'in_progress') throw new Error('This lesson has not been submitted yet.');
    const scores = cleanScores_(g.scores);
    if (status === 'approved' && Object.keys(scores).length < RUBRIC_ROWS) throw new Error('Score each row of the rubric first.');
    const total = Object.values(scores).reduce((a, v) => a + v, 0);
    const row = { work_id: meta.id, scores, total, max_total: RUBRIC_ROWS * 4, feedback: text_(g.feedback, 4000), graded_at: now_() };
    const existing = rows_('Grades').find((x) => x.work_id === meta.id);
    if (existing) update_('Grades', { ...row, _row: existing._row });
    else insert_('Grades', row);
    update_('Works', { ...readRow_('Works', meta._row), status });
  }),
  /** Unlock approved work so the student can change it, without removing the grade. */
  reopenWork: (me, id) => withLock_(() => {
    const meta = metaWorks_().find((x) => x.id === id);
    if (!meta) throw new Error('That work was not found.');
    studentOfTeacher_(me, meta.student_id);
    if (meta.status === 'approved') update_('Works', { ...readRow_('Works', meta._row), status: 'returned' });
  }),
  giveAward: (me, studentId, badgeId, note) => withLock_(() => {
    studentOfTeacher_(me, studentId);
    const badge = text_(badgeId, 40);
    if (!/^[a-z-]{1,40}$/.test(badge)) throw new Error('Unknown badge.');
    deleteRows_('Awards', (a) => a.student_id === studentId && a.badge_id === badge, SCHEMA.Awards);
    insert_('Awards', { id: uuid_(), student_id: studentId, badge_id: badge, note: text_(note, 140), created_at: now_() });
  }),
  removeAward: (me, studentId, badgeId) => withLock_(() => {
    studentOfTeacher_(me, studentId);
    deleteRows_('Awards', (a) => a.student_id === studentId && a.badge_id === String(badgeId), SCHEMA.Awards);
  }),
};

// Student actions: these only ever touch the student making the request ----------------------------

/** One student's save. Fields the browser can't be trusted with (status, who it belongs to) are set here. */
function saveMyWork_(me, lessonId, patch, submit) {
  if (!LESSON_IDS.includes(String(lessonId))) throw new Error('Unknown lesson.');
  const p = patch && typeof patch === 'object' ? patch : {};
  const answers = p.answers && typeof p.answers === 'object' && !Array.isArray(p.answers) ? p.answers : {};
  const docText = JSON.stringify({ answers });
  if (docText.length > MAX_WORK_CHARS) throw new Error('This lesson is too big to save. Try shortening your writing.');
  return withLock_(() => {
    const existing = metaWorks_().find((w) => w.student_id === me.student.id && w.lesson_id === lessonId);
    if (existing && existing.status === 'approved') throw new Error('This lesson was approved, so it is locked. Ask your teacher to reopen it.');
    const total = clampInt_(p.done_total, 0, 60);
    const done = clampInt_(p.done_count, 0, total);
    const quizTotal = clampInt_(p.quiz_total, 0, 20);
    const row = {
      ...(existing || { id: uuid_(), student_id: me.student.id, lesson_id: lessonId, status: 'in_progress', submitted_at: null }),
      track: lessonId === 'l5' && TRACKS.includes(String(p.track)) ? String(p.track) : '',
      // How far through the lesson the student has got, for resuming and for the class display.
      step_at: clampInt_(p.step_at, 0, MAX_STEP),
      stretch_done: clampInt_(p.stretch_done, 0, 3),
      reflection: text_(p.reflection, 4000),
      done_count: done,
      done_total: total,
      quiz_right: clampInt_(p.quiz_right, 0, quizTotal),
      quiz_total: quizTotal,
      all_done: total > 0 && done === total,
      link: cleanLink_(p.link),
      updated_at: now_(),
    };
    if (submit) { row.status = 'submitted'; row.submitted_at = now_(); }
    packChunks_(row, docText, WORK_CELLS);
    if (existing) update_('Works', row);
    else insert_('Works', row);
    return { ...metaOut_(row), answers };
  });
}

const STUDENT_ROUTES = {
  classBoard: classBoard_,
  myWorks: (me) => {
    const grades = rows_('Grades');
    return metaWorks_().filter((w) => w.student_id === me.student.id).map((w) => ({ ...fullWork_(w), grade: gradeFor_(w.id, grades) }));
  },
  saveWork: (me, lessonId, patch) => saveMyWork_(me, lessonId, patch, false),
  submitWork: (me, lessonId, patch) => saveMyWork_(me, lessonId, patch, true),
  updateProfile: (me, patch) => withLock_(() => {
    const s = { ...rows_('Students').find((x) => x.id === me.student.id) };
    if (patch && patch.avatar !== undefined) {
      const av = patch.avatar;
      if (!av || typeof av !== 'object' || Array.isArray(av) || JSON.stringify(av).length > 1000) throw new Error('That character could not be saved.');
      const clean = {};
      Object.keys(av).slice(0, 12).forEach((k) => {
        const v = av[k];
        if (/^[a-zA-Z]{1,12}$/.test(k) && (typeof v === 'number' || /^[a-z0-9-]{0,20}$/.test(String(v)))) clean[k] = typeof v === 'number' ? v : String(v);
      });
      s.avatar = clean;
    }
    update_('Students', s);
    return publicStudent_(s);
  }),
};
