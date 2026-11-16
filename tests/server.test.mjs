// Attacks gas/Code.gs the way a curious student with the browser console could, on a fake Sheet.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from './fake-gas.mjs';

const OWNER = 'teacher@school.test';
const OTHER = 'other.teacher@school.test';
const ARI = 'ari@school.test';
const BEA = 'bea@school.test';
const ZED = 'zed@school.test';
const STRANGER = 'stranger@school.test';

const person = (id, fullName, emailAddress) => ({ userId: id, profile: { name: { fullName }, emailAddress } });

function setup(classroom = {}) {
  const server = createServer({ owner: OWNER, classroom });
  const teacher = server.as(OWNER);
  const cls = teacher('createClass', 'Period 3');
  teacher('addStudents', cls.id, [`Ari M, ${ARI}`, `Bea T <${BEA}>`]);
  // A second teacher is added the way a person would: a row in the Teachers tab.
  server.sheets.get('Teachers').appendRow([OTHER, 'Other', '2026-01-01']);
  const other = server.as(OTHER);
  const clsB = other('createClass', 'Other class');
  other('addStudents', clsB.id, [ZED]);
  const ari = server.as(ARI);
  const bea = server.as(BEA);
  const zed = server.as(ZED);
  const ids = Object.fromEntries(teacher('listStudents', cls.id).map((s) => [s.email, s.id]));
  ari('saveWork', 'l1', { answers: { guess: { place: { pencil: 'no' } } }, reflection: 'ARI SECRET REFLECTION' });
  const beaWork = bea('submitWork', 'l1', { answers: { guess: { note: 'BEA ANSWER' } }, reflection: 'BEA REFLECTION', done_count: 6, done_total: 6 });
  teacher('saveGrade', beaWork.id, { scores: { jobs: 4, hardsoft: 3, reflect: 2 }, feedback: 'PRIVATE FEEDBACK', status: 'approved' });
  return { server, teacher, other, ari, bea, zed, cls, clsB, ids, beaWork };
}
const denied = (fn, msg) => assert.throws(fn, msg);

test('only the two entry points can be called from a browser', () => {
  const { server } = setup();
  assert.deepEqual(server.publicFunctions().sort(), ['api', 'doGet']);
});

test('someone on no roster, or signed out, gets no access and no data', () => {
  const { server, cls } = setup();
  for (const who of [STRANGER, '']) {
    assert.equal(server.as(who)('session').role, null);
    for (const m of ['classBoard', 'myWorks', 'listClasses', 'saveWork', 'getWorkFull']) denied(() => server.as(who)(m, cls.id), /access/);
  }
});

test('the deploying teacher becomes a teacher automatically, and email case does not matter', () => {
  const { server } = setup();
  assert.equal(server.as('TEACHER@school.test')('session').role, 'teacher');
  assert.equal(server.as('ARI@SCHOOL.TEST')('session').role, 'student');
});

test('the browser cannot claim to be someone else', () => {
  const { server, ids } = setup();
  // Extra arguments and fields naming another person are ignored: identity comes from Google.
  const ari = server.as(ARI);
  const w = ari('saveWork', 'l2', { answers: {}, student_id: ids[BEA], email: BEA, role: 'teacher' });
  assert.equal(w.student_id, ids[ARI]);
  assert.equal(server.raw(ARI, 'session', [{ email: OWNER }]).data.role, 'student');
});

test('a student cannot use any teacher action', () => {
  const { ari, cls, ids, beaWork } = setup();
  for (const [m, args] of [
    ['listClasses', []], ['getClass', [cls.id]], ['listStudents', [cls.id]], ['classWork', [cls.id]], ['getWorkFull', [beaWork.id]],
    ['saveGrade', [beaWork.id, { status: 'approved', scores: { a: 4, b: 4, c: 4 } }]], ['reopenWork', [beaWork.id]], ['giveAward', [ids[ARI], 'helper', '']],
    ['removeAward', [ids[BEA], 'helper']], ['addStudents', [cls.id, ['x@school.test']]], ['removeStudent', [ids[BEA]]], ['renameStudent', [ids[ARI], 'Boss']],
    ['deleteClass', [cls.id]], ['saveClassPlan', [cls.id, {}]], ['setModelsOff', [['desktop']]], ['listGoogleCourses', []], ['pushGrades', [cls.id]],
    ['createAssignments', [cls.id, [], {}]], ['gradeSyncStatus', [cls.id]],
  ]) denied(() => ari(m, ...args), /access/, m);
});

test('a student only ever receives their own work, answers, and grades', () => {
  const { ari, bea } = setup();
  const mine = ari('myWorks');
  assert.equal(mine.length, 1);
  assert.equal(mine[0].reflection, 'ARI SECRET REFLECTION');
  assert.equal(mine[0].grade, null);
  const text = JSON.stringify(ari('myWorks'));
  for (const secret of ['BEA', 'PRIVATE FEEDBACK']) assert.ok(!text.includes(secret), secret);
  assert.equal(bea('myWorks')[0].grade.feedback, 'PRIVATE FEEDBACK');
});

test('the class board shows progress but no answers, reflections, links, grades, approvals, or emails', () => {
  const { ari, bea, cls } = setup();
  bea('submitWork', 'l5', { track: 'history', link: 'https://docs.google.com/document/d/SECRETDOC/edit', answers: {} });
  const board = ari('classBoard', cls.id);
  const text = JSON.stringify(board);
  for (const secret of ['BEA ANSWER', 'ARI SECRET', 'PRIVATE FEEDBACK', 'BEA REFLECTION', '@school.test', 'SECRETDOC', 'approved', 'scores', '"status"']) assert.ok(!text.includes(secret), secret);
  assert.ok(text.includes('Bea T'));
  const bw = board.find((b) => b.display_name === 'Bea T').works.find((w) => w.lesson_id === 'l1');
  assert.equal(bw.done, true);
});

test('a student cannot see another class', () => {
  const { zed, cls } = setup();
  denied(() => zed('classBoard', cls.id), /not your class/);
});

test('a teacher cannot see or change another teacher\'s class', () => {
  const { other, cls, ids, beaWork } = setup();
  for (const [m, args] of [
    ['getClass', [cls.id]], ['listStudents', [cls.id]], ['classBoard', [cls.id]], ['classWork', [cls.id]], ['getWorkFull', [beaWork.id]],
    ['saveGrade', [beaWork.id, { status: 'returned' }]], ['reopenWork', [beaWork.id]], ['removeStudent', [ids[ARI]]], ['renameStudent', [ids[ARI], 'x']],
    ['deleteClass', [cls.id]], ['renameClass', [cls.id, 'x']], ['addStudents', [cls.id, ['x@school.test']]], ['giveAward', [ids[ARI], 'helper', '']],
    ['getClassPlan', [cls.id]], ['saveClassPlan', [cls.id, {}]],
  ]) denied(() => other(m, ...args), /not your class/, m);
  assert.equal(other('listClasses').length, 1);
});

test('only the deploying teacher can use Google Classroom or change the 3D models', () => {
  const { other, clsB } = setup();
  denied(() => other('listGoogleCourses'), /Only the teacher who set up/);
  denied(() => other('gradeSyncStatus', clsB.id), /Only the teacher who set up/);
  denied(() => other('pushGrades', clsB.id), /Only the teacher who set up/);
  denied(() => other('setModelsOff', ['desktop']), /Only the teacher who set up/);
  assert.equal(other('session').is_owner, false);
});

test('a student cannot approve their own work or forge fields', () => {
  const { ari, teacher, cls } = setup();
  const w = ari('saveWork', 'l2', { answers: {}, status: 'approved', submitted_at: '2020-01-01', stretch_done: 99, step_at: 9999, done_count: 50, done_total: 6, quiz_right: 9, quiz_total: 4, track: 'design' });
  assert.equal(w.status, 'in_progress');
  assert.equal(w.submitted_at, null);
  assert.equal(w.stretch_done, 3);
  assert.equal(w.step_at, 30);
  assert.equal(w.done_count, 6);
  assert.equal(w.quiz_right, 4);
  assert.equal(w.track, '', 'only the project has tracks');
  assert.equal(ari('saveWork', 'l5', { answers: {}, track: 'hacking' }).track, '');
  assert.equal(ari('saveWork', 'l5', { answers: {}, track: 'history' }).track, 'history');
  const all = teacher('classWork', cls.id).filter((x) => x.lesson_id === 'l2');
  assert.equal(all.length, 1);
  denied(() => ari('saveWork', 'l9', {}), /Unknown lesson/);
  denied(() => ari('saveWork', '../Grades', {}), /Unknown lesson/);
});

test('approved work is locked until the teacher reopens it, and students keep moving either way', () => {
  const { bea, teacher, beaWork } = setup();
  denied(() => bea('saveWork', 'l1', { answers: {} }), /locked/);
  denied(() => bea('submitWork', 'l1', { answers: {} }), /locked/);
  bea('saveWork', 'l2', { answers: {} });
  teacher('reopenWork', beaWork.id);
  assert.equal(bea('saveWork', 'l1', { answers: {} }).status, 'returned');
  assert.equal(bea('submitWork', 'l1', { answers: {} }).status, 'submitted');
});

test('the server works out rubric totals itself, and approval needs every row scored', () => {
  const { ari, teacher, cls } = setup();
  const w = ari('submitWork', 'l1', { answers: {} });
  denied(() => teacher('saveGrade', w.id, { status: 'approved', scores: { jobs: 4 } }), /Score each row/);
  // A score outside 1 to 4 doesn't count, so this row is missing.
  denied(() => teacher('saveGrade', w.id, { status: 'approved', scores: { jobs: 9, hardsoft: 4, reflect: 4 } }), /Score each row/);
  teacher('saveGrade', w.id, { status: 'approved', scores: { jobs: 4, hardsoft: 4, reflect: 4, extra: 4 }, total: 999, max_total: 1 });
  const g = teacher('classWork', cls.id).find((x) => x.id === w.id).grade;
  assert.equal(g.max_total, 12);
  assert.equal(g.total, 12);
  assert.equal(Object.keys(g.scores).length, 3);
  denied(() => teacher('saveGrade', w.id, { status: 'in_progress' }), /Unknown status/);
});

test('a lesson can\'t be graded before it is submitted', () => {
  const { teacher, cls } = setup();
  const ariWork = teacher('classWork', cls.id).find((w) => w.status === 'in_progress');
  denied(() => teacher('saveGrade', ariWork.id, { status: 'returned' }), /not been submitted/);
});

test('text that could act as a formula is stored safely', () => {
  const { server, ari, teacher, cls, ids } = setup();
  ari('saveWork', 'l3', { answers: { x: '=IMPORTXML("http://evil")' }, reflection: '=HYPERLINK("http://evil","click")' });
  teacher('renameStudent', ids[ARI], '+SUM(A1)');
  teacher('saveClassPlan', cls.id, { question: '@everyone', focus: '-1+1' });
  for (const sheet of server.sheets.values()) for (const row of sheet.grid) for (const cell of row) assert.ok(!/^[=+\-@]/.test(String(cell)), `${sheet.name}: ${cell}`);
  assert.equal(ari('myWorks').find((w) => w.lesson_id === 'l3').reflection, '=HYPERLINK("http://evil","click")');
  assert.equal(teacher('listStudents', cls.id).find((s) => s.id === ids[ARI]).display_name, '+SUM(A1)');
});

test('only safe report links are stored', () => {
  const { ari } = setup();
  assert.equal(ari('saveWork', 'l5', { answers: {}, link: 'javascript:alert(1)' }).link, '');
  assert.equal(ari('saveWork', 'l5', { answers: {}, link: 'https://evil.example/x' }).link, '');
  assert.equal(ari('saveWork', 'l5', { answers: {}, link: 'https://docs.google.com/presentation/d/abc/edit' }).link, 'https://docs.google.com/presentation/d/abc/edit');
});

test('a student\'s character can only hold simple values', () => {
  const { ari } = setup();
  const s = ari('updateProfile', { avatar: { hat: 'cap', skin: 2, evil: '<img src=x onerror=alert(1)>', 'bad key!': 'x' } });
  assert.deepEqual(s.avatar, { hat: 'cap', skin: 2 });
  denied(() => ari('updateProfile', { avatar: 'x'.repeat(5000) }), /could not be saved/);
  assert.equal(ari('updateProfile', { class_id: 'other', display_name: 'Boss' }).display_name, 'Ari M', 'only the character can change');
});

test('huge saves are refused instead of breaking the Sheet', () => {
  const { ari } = setup();
  denied(() => ari('saveWork', 'l5', { answers: { notes: 'x'.repeat(200000) } }), /too big/);
  // Long but allowed answers are split across cells, each under the 50,000 character limit.
  const w = ari('saveWork', 'l5', { answers: { notes: 'y'.repeat(100000) } });
  assert.equal(w.answers.notes.length, 100000);
  assert.equal(ari('myWorks').find((x) => x.lesson_id === 'l5').answers.notes.length, 100000);
});

test('batches can\'t be nested or oversized, and each call in one is still checked', () => {
  const { server, cls } = setup();
  const r = server.raw(ARI, 'batch', [[['myWorks', []], ['listClasses', []], ['batch', [[]]], ['classBoard', [cls.id]]]]);
  assert.equal(r.ok, true);
  assert.deepEqual(r.data.map((x) => x.ok), [true, false, false, true]);
  assert.equal(server.raw(ARI, 'batch', [Array(13).fill(['myWorks', []])]).ok, false);
  assert.equal(server.raw(ARI, 'batch', ['not a list']).ok, false);
});

test('a teacher can give and remove badges, which add XP, and notes are kept short', () => {
  const { teacher, ari, cls, ids } = setup();
  teacher('giveAward', ids[ARI], 'helper', 'x'.repeat(500));
  const row = ari('classBoard', cls.id).find((b) => b.id === ids[ARI]);
  assert.equal(row.awards[0].note.length, 140);
  teacher('removeAward', ids[ARI], 'helper');
  assert.equal(ari('classBoard', cls.id).find((b) => b.id === ids[ARI]).awards.length, 0);
  denied(() => teacher('giveAward', ids[ARI], '<script>', ''), /Unknown badge/);
});

test('removing a student or a class removes their work and grades too', () => {
  const { server, teacher, cls, ids } = setup();
  teacher('giveAward', ids[BEA], 'helper', '');
  teacher('removeStudent', ids[BEA]);
  const works = server.sheets.get('Works').grid.slice(1);
  assert.ok(!works.some((r) => r[1] === ids[BEA]));
  assert.equal(server.sheets.get('Grades').grid.length, 1);
  assert.equal(server.sheets.get('Awards').grid.length, 1);
  teacher('deleteClass', cls.id);
  assert.equal(teacher('listClasses').length, 0);
  assert.equal(server.sheets.get('Works').grid.length, 1);
});

test('the 3D model switch stores only model names, and students see it in their session', () => {
  const { teacher, ari } = setup();
  assert.deepEqual(teacher('setModelsOff', ['desktop', 'BAD NAME', '<x>', 'pi']), ['desktop', 'pi']);
  assert.deepEqual(ari('session').settings.models_off, ['desktop', 'pi']);
});

test('the class display plan only keeps safe values', () => {
  const { teacher, cls } = setup();
  const p = teacher('saveClassPlan', cls.id, { question: 'q'.repeat(500), standards: ['6-8.CS.a.3', 'not a code', '<b>'], timer_end: 'nonsense' });
  assert.equal(p.question.length, 200);
  assert.deepEqual(p.standards, ['6-8.CS.a.3']);
  assert.equal(p.timer_end, '');
});

test('Google Classroom: import a roster, make assignments ahead of time, then send scaled grades', () => {
  const classroom = {
    courses: [{ id: 'gc1', name: 'DL 6', section: 'Block 2' }],
    rosters: { gc1: [person('u1', 'Ava Lopez', 'ava@school.test'), person('u2', 'Ben Tran', 'ben@school.test'), person('u3', 'No Email', '')] },
    madeSubs: { gc1: [{ id: 's1', userId: 'u1' }, { id: 's2', userId: 'u2' }] },
  };
  const { server, teacher } = setup(classroom);
  assert.deepEqual(teacher('listGoogleCourses').map((c) => c.id), ['gc1']);
  const [result] = teacher('importCourses', ['gc1']);
  assert.equal(result.added, 2);
  assert.equal(result.skipped.length, 1);
  const cls = teacher('listClasses').find((c) => c.linked);
  assert.ok(teacher('listStudents', cls.id).every((s) => /^[A-Z][a-z]+ [A-Z]$/.test(s.display_name)), 'names are first name and last initial');
  assert.equal(teacher('importCourses', ['gc1'])[0].added, 0, 'importing again adds nothing new');

  // Assignments made before any grading: named, with points and an optional due date.
  const made = teacher('createAssignments', cls.id, [
    { lesson_id: 'l1', title: 'Lesson 1: What is a computer?', points: 20, due: '2026-12-01' },
    { lesson_id: 'l5', title: 'Final project', points: 50 },
  ], { publish: false });
  assert.equal(made.created, 2);
  assert.equal(classroom.created[0].state, 'DRAFT');
  assert.equal(classroom.created[0].maxPoints, 20);
  assert.ok(classroom.created[0].dueDate);
  assert.equal(teacher('createAssignments', cls.id, [{ lesson_id: 'l1', title: 'Again', points: 20 }], {}).skipped.length, 1);
  denied(() => teacher('createAssignments', cls.id, [{ lesson_id: 'l9', title: 'x', points: 10 }], {}), /Unknown lesson/);

  const ava = server.as('ava@school.test');
  const ben = server.as('ben@school.test');
  const wa = ava('submitWork', 'l1', { answers: {} });
  const wb = ben('submitWork', 'l1', { answers: {} });
  teacher('saveGrade', wa.id, { status: 'approved', scores: { jobs: 4, hardsoft: 4, reflect: 1 } });
  teacher('saveGrade', wb.id, { status: 'returned', scores: { jobs: 2, hardsoft: 2, reflect: 2 } });
  const status = teacher('gradeSyncStatus', cls.id);
  assert.equal(status.items.find((i) => i.lesson_id === 'l1').waiting, 1, 'only approved grades are sent');
  const sent = teacher('pushGrades', cls.id);
  assert.equal(sent.sent, 1);
  assert.equal(classroom.patched[0].assignedGrade, 15, '9 of 12 on a 20-point assignment is 15');
  assert.equal(teacher('pushGrades', cls.id).sent, 0, 'nothing is sent twice');
});

test('the page is served with a title and a tab icon, and students\' answers survive a round trip', () => {
  const { ari } = setup();
  const answers = { sort: { place: { a: 'b' }, misses: 2 }, _checks: { 'jobs-0': true }, write: { text: { pitch: 'Ünïcödé, "quotes", and\nnew lines' } } };
  ari('saveWork', 'l4', { answers });
  assert.deepEqual(ari('myWorks').find((w) => w.lesson_id === 'l4').answers, answers);
});
