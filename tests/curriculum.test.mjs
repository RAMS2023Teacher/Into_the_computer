// Checks the lessons as data: timing, word limits, check questions, activities, standards, and models.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { LESSONS, LESSON_IDS, stepsFor, allSteps, checksFor, rubricFor, stretchFor } from '../js/curriculum/lessons.js';
import { STANDARDS } from '../js/curriculum/standards.js';
import { ALIGNMENT, alignmentFor } from '../js/curriculum/alignment.js';
import { MODELS } from '../js/curriculum/models.js';
import { CATEGORIES, BUDGET, PURPOSES, HISTORY, buildTotal, buildProblems, missingParts } from '../js/curriculum/catalog.js';
import { CASE_SPOTS } from '../js/curriculum/pictures.js';
import { citationText, mlaDate, sourceMissing } from '../js/curriculum/mla.js';
import { TYPES, isDone, solve, initialState, summaryOf, words, loadSeconds, SPEED_START } from '../js/activities/logic.js';
import { cleanLink_ } from '../js/shared/links.js';
import { RANKS, BADGES, TEACHER_BADGES, statsFor, XP } from '../js/game/rules.js';
import { unlockables, SLOTS } from '../js/game/avatar.js';

const wordCount = (t) => String(t).trim().split(/\s+/).filter(Boolean).length;
const tracksOf = (l) => (l.tracks ? Object.keys(l.tracks) : ['']);

test('there are five lessons, in order, and the server knows the same ids', () => {
  assert.deepEqual(LESSON_IDS, ['l1', 'l2', 'l3', 'l4', 'l5']);
  LESSONS.forEach((l, i) => assert.equal(l.n, i + 1));
  const code = readFileSync(new URL('../gas/Code.gs', import.meta.url), 'utf8');
  assert.match(code, /const LESSON_IDS = \['l1', 'l2', 'l3', 'l4', 'l5'\];/);
  assert.match(code, /const TRACKS = \['design', 'history'\];/);
});

test('lessons 1 to 4 each fit a 30 to 40 minute class, and their steps add up', () => {
  for (const l of LESSONS.filter((x) => !x.tracks)) {
    assert.ok(l.mins >= 30 && l.mins <= 40, `${l.id} is ${l.mins} minutes`);
    const sum = l.steps.reduce((a, s) => a + s.mins, 0) + l.finishMins;
    assert.equal(sum, l.mins, `${l.id}: steps and finishing add to ${sum}, not ${l.mins}`);
  }
});

test('the project is three class periods, and each day of each track adds up to one period', () => {
  const p = LESSONS.find((l) => l.tracks);
  assert.equal(p.periods, 3);
  const period = p.mins / p.periods;
  assert.ok(period >= 30 && period <= 40);
  for (const [name, t] of Object.entries(p.tracks)) {
    for (const day of [1, 2, 3]) {
      const steps = [p.choose, ...t.steps].filter((s) => s.day === day);
      assert.ok(steps.length, `${name} has no day ${day}`);
      const sum = steps.reduce((a, s) => a + s.mins, 0) + (day === 3 ? p.finishMins : 0);
      assert.equal(sum, period, `${name}, day ${day}: ${sum} minutes, not ${period}`);
    }
    const days = t.steps.map((s) => s.day);
    assert.deepEqual(days, [...days].sort(), `${name}: days must run in order`);
  }
});

test('every instruction is 26 words or fewer, and every step has an explanation under "Why?"', () => {
  for (const l of LESSONS) {
    for (const s of allSteps(l)) {
      assert.ok(wordCount(s.say) <= 26, `${l.id}/${s.id} instruction has ${wordCount(s.say)} words: ${s.say}`);
      assert.ok(s.why && s.why.length > 20, `${l.id}/${s.id} needs a Why`);
      assert.ok(s.title && s.mins > 0, `${l.id}/${s.id} needs a title and minutes`);
    }
  }
});

test('check questions: 18 words or fewer, three choices, a valid answer, woven between steps', () => {
  for (const l of LESSONS) {
    for (const track of tracksOf(l)) {
      const checks = checksFor(l, track);
      assert.ok(checks.length >= 2, `${l.id} ${track} needs at least two check questions`);
      const ids = stepsFor(l, track).map((s) => s.id);
      for (const c of checks) {
        assert.ok(wordCount(c.q) <= 18, `${l.id}: "${c.q}" has ${wordCount(c.q)} words`);
        assert.equal(c.options.length, 3, `${l.id}: "${c.q}" needs three choices`);
        assert.equal(new Set(c.options).size, 3, `${l.id}: "${c.q}" repeats a choice`);
        assert.ok(Number.isInteger(c.answer) && c.answer >= 0 && c.answer < 3);
        assert.ok(ids.includes(c.after), `${l.id}: check follows unknown step ${c.after}`);
        assert.ok(c.why, `${l.id}: "${c.q}" needs a reason`);
      }
    }
    for (const c of l.checks) assert.ok(allSteps(l).some((s) => s.id === c.after), `${l.id}: ${c.after} is not a step`);
  }
});

test('the right answer is not always in the same place a student could learn to guess', () => {
  const firsts = LESSONS.flatMap((l) => l.checks).filter((c) => c.answer === 0).length;
  // Choices are shown in the order written, so mix them up across the unit.
  assert.ok(firsts / LESSONS.flatMap((l) => l.checks).length <= 0.6, `${firsts} of the check answers are the first choice`);
});

test('each lesson has one big question, a reflection, up to 3 stretch goals, and a 3-row rubric scored 1 to 4', () => {
  for (const l of LESSONS) {
    assert.ok(l.bigQuestion.endsWith('?'), `${l.id} big question`);
    assert.ok(l.reflect && wordCount(l.reflect) <= 26, `${l.id} reflection prompt`);
    for (const track of tracksOf(l)) {
      const stretch = stretchFor(l, track);
      assert.ok(stretch.length >= 1 && stretch.length <= 3, `${l.id} ${track} stretch goals`);
      const rubric = rubricFor(l, track);
      assert.equal(rubric.length, 3, `${l.id} ${track} rubric rows`);
      for (const r of rubric) { assert.equal(r.levels.length, 4); assert.match(r.id, /^[a-z]{1,20}$/); }
    }
  }
});

test('step ids are unique within each lesson', () => {
  for (const l of LESSONS) {
    const ids = allSteps(l).map((s) => s.id);
    assert.equal(new Set(ids).size, ids.length, `${l.id} repeats a step id`);
    assert.ok(!ids.includes('_checks'));
  }
});

test('every activity can be finished, and none is finished before the student starts', () => {
  for (const l of LESSONS) {
    for (const track of tracksOf(l)) {
      const answers = {};
      if (l.tracks) answers.choose = { pick: track };
      for (const s of stepsFor(l, track)) {
        assert.ok(TYPES.includes(s.activity.type), `${l.id}/${s.id}: unknown activity ${s.activity.type}`);
        assert.equal(isDone(s.activity, initialState(s.activity), { answers: {} }), false, `${l.id}/${s.id} is done before starting`);
        assert.equal(isDone(s.activity, undefined, { answers: {} }), false, `${l.id}/${s.id} is done with nothing saved`);
        if (!answers[s.id]) answers[s.id] = solve(s.activity, { answers });
      }
      for (const s of stepsFor(l, track)) {
        assert.ok(isDone(s.activity, answers[s.id], { answers }), `${l.id}/${s.id} (${track}) can't be finished`);
        assert.ok(summaryOf(s.activity, answers[s.id], { answers }).length > 0, `${l.id}/${s.id} needs a teacher summary`);
      }
    }
  }
});

test('graded sorts only finish with every card in the right place', () => {
  for (const l of LESSONS) for (const s of allSteps(l).filter((x) => x.activity.type === 'sort' && x.activity.graded)) {
    const a = s.activity;
    const wrong = { place: Object.fromEntries(a.items.map((it) => [it.id, a.bins.find((b) => b.id !== it.bin).id])) };
    assert.equal(isDone(a, wrong), false, `${l.id}/${s.id}`);
    for (const it of a.items) assert.ok(a.bins.some((b) => b.id === it.bin), `${l.id}/${s.id}: ${it.id} has no box`);
  }
});

test('activities that need a minimum number of words are not finished by a word or two', () => {
  const write = LESSONS.flatMap(allSteps).find((s) => s.id === 'pitch').activity;
  assert.equal(isDone(write, { text: { pitch: 'good computer' } }), false);
  assert.equal(words('It is fast, and it costs $2,400.'), 7);
});

test('the binary and decoding activities have reachable targets', () => {
  for (const s of LESSONS.flatMap(allSteps).filter((x) => x.activity.type === 'binary')) {
    for (const n of s.activity.targets) assert.ok(n >= 0 && n < 2 ** s.activity.bits, `${s.id}: ${n} needs more than ${s.activity.bits} bits`);
  }
  const decode = LESSONS.flatMap(allSteps).find((x) => x.activity.type === 'decode').activity;
  assert.match(decode.message, /^[A-Z]+$/);
  const pixels = LESSONS.flatMap(allSteps).find((x) => x.activity.type === 'pixels').activity;
  assert.ok(pixels.rows.every((r) => /^[01]+$/.test(r) && r.length === pixels.rows[0].length));
});

test('the speed lab starts slow, and its goal can be reached', () => {
  const lab = LESSONS.flatMap(allSteps).find((x) => x.activity.type === 'speedlab').activity;
  assert.ok(loadSeconds(SPEED_START) >= lab.goal * 2);
  assert.ok(loadSeconds({ cpu: 'fast', ram: '16', storage: 'ssd' }) < lab.goal);
  // An SSD alone helps more than any other single change, which the lesson's check question says.
  const gain = (k, v) => loadSeconds(SPEED_START) - loadSeconds({ ...SPEED_START, [k]: v });
  assert.ok(gain('storage', 'ssd') > gain('cpu', 'fast') && gain('storage', 'ssd') > gain('ram', '16'));
});

test('the case picture has a spot for every part the case activities use', () => {
  for (const s of LESSONS.flatMap(allSteps).filter((x) => x.activity.layout === 'diagram' && x.activity.type === 'sort')) {
    for (const it of s.activity.items) assert.ok(CASE_SPOTS.some((p) => p.id === it.bin), `${s.id}: ${it.bin}`);
    for (const p of s.activity.bins) assert.ok(p.x >= 0 && p.x <= 400 && p.y >= 0 && p.y <= 300);
  }
});

test('the $2,500 budget forces trade-offs, but every purpose has a build that fits', () => {
  const best = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.many ? c.options.map((o) => o.id) : [...c.options].sort((a, b) => b.price - a.price)[0].id]));
  assert.ok(buildTotal(best) > BUDGET, 'the best of everything should not fit');
  const cheap = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.many ? [] : [...c.options].sort((a, b) => a.price - b.price)[0].id]));
  assert.ok(buildTotal(cheap) < BUDGET / 2);
  const builds = {
    gaming: { cpu: 'cpu-fast', ram: 'ram-16', storage: 'ssd-2', graphics: 'gpu-top', board: 'board-basic', power: 'psu-850', case: 'case-tower', screen: 'screen-big', extras: ['keys', 'speakers', 'wifi'] },
    school: { cpu: 'cpu-basic', ram: 'ram-8', storage: 'ssd-1', graphics: 'gpu-none', board: 'board-basic', power: 'battery', case: 'case-laptop', screen: 'screen-laptop', extras: ['keys', 'camera', 'mic', 'speakers', 'wifi'] },
    video: { cpu: 'cpu-super', ram: 'ram-32', storage: 'ssd-4', graphics: 'gpu-mid', board: 'board-pro', power: 'psu-550', case: 'case-tower', screen: 'screen-big', extras: ['keys', 'speakers'] },
    rover: { cpu: 'cpu-fast', ram: 'ram-16', storage: 'ssd-1', graphics: 'gpu-none', board: 'board-tiny', power: 'solar', case: 'case-rugged', screen: 'screen-none', extras: ['camera', 'sensors', 'gps', 'motors', 'wifi'] },
    pets: { cpu: 'cpu-basic', ram: 'ram-8', storage: 'ssd-1', graphics: 'gpu-none', board: 'board-tiny', power: 'psu-550', case: 'case-mini', screen: 'screen-small', extras: ['camera', 'sensors', 'motors', 'wifi'] },
  };
  for (const p of PURPOSES.filter((x) => x.id !== 'own')) {
    const b = builds[p.id];
    assert.ok(b, `no sample build for ${p.id}`);
    assert.deepEqual(missingParts(b), [], p.id);
    assert.deepEqual(buildProblems(b), [], p.id);
    assert.ok(buildTotal(b) <= BUDGET, `${p.id} costs ${buildTotal(b)}`);
  }
  assert.ok(buildProblems({ graphics: 'gpu-top', power: 'psu-550' }).length > 0);
});

test('MLA citations are built in the right order and format', () => {
  assert.equal(mlaDate('2024-03-05'), '5 Mar. 2024');
  assert.equal(mlaDate('2024-09'), 'Sept. 2024');
  assert.equal(mlaDate('1999'), '1999');
  assert.equal(mlaDate('March 5, 2024'), '5 Mar. 2024');
  assert.equal(mlaDate('3/5/2024'), '5 Mar. 2024');
  assert.equal(mlaDate('June 2021'), 'June 2021');
  assert.equal(mlaDate('sept 9 2019'), '9 Sept. 2019');
  assert.equal(mlaDate('a while ago'), 'a while ago');
  assert.equal(citationText({ type: 'web', first: 'Jane', last: 'Smith', title: 'The ENIAC Story', container: 'Computer History Museum', date: '2024-03-05', url: 'https://www.computerhistory.org/eniac/', accessed: '2026-11-10' }),
    'Smith, Jane. "The ENIAC Story." Computer History Museum, 5 Mar. 2024, www.computerhistory.org/eniac. Accessed 10 Nov. 2026.');
  assert.equal(citationText({ type: 'video', title: 'How ENIAC Worked', container: 'YouTube', publisher: 'Museum Channel', date: '2021-06-01', url: 'https://youtu.be/abc' }),
    '"How ENIAC Worked." YouTube, uploaded by Museum Channel, 1 June 2021, youtu.be/abc.');
  assert.equal(citationText({ type: 'book', first: 'Walter', last: 'Isaacson', title: 'The Innovators', publisher: 'Simon & Schuster', date: '2014' }),
    'Isaacson, Walter. The Innovators. Simon & Schuster, 2014.');
  assert.ok(sourceMissing({ type: 'web', title: 'x' }).length > 0);
  assert.deepEqual(sourceMissing({ type: 'web', title: 'x', container: 'y', url: 'https://a.org/b', check: { who: 'expert', when: 'yes', why: 'teach' } }), []);
});

test('report links must be https links on the allowed sites', () => {
  assert.equal(cleanLink_('https://docs.google.com/document/d/abc/edit'), 'https://docs.google.com/document/d/abc/edit');
  assert.equal(cleanLink_(' https://www.canva.com/design/abc/view '), 'https://www.canva.com/design/abc/view');
  for (const bad of ['javascript:alert(1)', 'http://docs.google.com/x', 'https://evil.example/docs.google.com', 'https://docs.google.com.evil.example/x', 'https://docs.google.com/"><script>', '=HYPERLINK("x")', '', null]) {
    assert.equal(cleanLink_(bad), '', String(bad));
  }
});

test('every standard is quoted exactly from the Massachusetts framework', () => {
  // The framework text as printed, with line breaks joined and page headers removed.
  const raw = readFileSync(new URL('./fixtures/ma-dlcs-6-8.txt', import.meta.url), 'utf8');
  const text = raw.split('\n').filter((line) => !/Massachusetts Curriculum Framework for Digital Literacy|^\s*6-8\s*$/.test(line))
    .map((line) => line.trim()).join('\n').replace(/-\n/g, '-').replace(/\s*\n\s*/g, ' ').replace(/\s+/g, ' ');
  for (const s of STANDARDS) {
    const [, strand, letter, num] = s.code.match(/^6-8\.(\w+)\.([a-e])\.(\d)$/);
    const section = text.slice(text.indexOf(`[6-8.${strand}.${letter}]`));
    assert.ok(section.length > 0, `${s.code}: section not found`);
    const item = section.match(new RegExp(`\\b${num}\\. (.*?)(?= \\d\\. | [A-Z][a-z]+(?: [A-Za-z]+)* \\[6-8| Grades \\d+ to \\d+:|$)`));
    assert.ok(item, `${s.code}: item ${num} not found`);
    assert.equal(s.text, item[1].trim(), `${s.code} must match the framework word for word`);
  }
});

test('every lesson is aligned to standards that exist, and lesson 5 is aligned for both tracks', () => {
  const codes = new Set(STANDARDS.map((s) => s.code));
  for (const [key, a] of Object.entries(ALIGNMENT)) {
    assert.ok(a.anchor.length > 0, `${key} needs an anchor standard`);
    for (const c of [...a.anchor, ...a.support]) assert.ok(codes.has(c), `${key}: ${c}`);
    assert.ok(a.evidence);
  }
  for (const l of LESSONS) for (const t of tracksOf(l)) assert.ok(alignmentFor(l.id, t || undefined).anchor.length > 0, `${l.id} ${t}`);
  // Mostly Computing Systems and data representation, as the unit is about how computers work.
  const used = new Set(Object.values(ALIGNMENT).flatMap((a) => [...a.anchor, ...a.support]));
  assert.ok([...used].filter((c) => /\.CS\.|\.CT\.c\./.test(c)).length > used.size / 2);
  for (const s of STANDARDS) assert.ok(used.has(s.code), `${s.code} is listed but not used`);
});

test('every 3D model a lesson asks for exists, with a credit, and every listed model is used', () => {
  const used = new Set();
  for (const l of LESSONS) for (const s of allSteps(l)) {
    const a = s.activity;
    [s.model, ...(s.models || []), ...(a.cards || []).map((c) => c.model), ...(Array.isArray(a.options) ? a.options.map((o) => o.model) : []),
      ...(a.categories || []).map((id) => CATEGORIES.find((c) => c.id === id).model)].filter(Boolean).forEach((k) => used.add(k));
  }
  for (const k of used) assert.ok(MODELS[k], `unknown model ${k}`);
  for (const [k, m] of Object.entries(MODELS)) {
    assert.match(m.uid, /^[0-9a-f]{32}$/, k);
    assert.ok(m.name && m.author && m.shows, k);
    assert.match(k, /^[a-z0-9]{1,20}$/, k);
    assert.ok(used.has(k) || HISTORY.some((h) => h.model === k), `${k} is never shown`);
  }
});

test('XP and badges never come from grades, and the unit has a handful of ranks and unlocks', () => {
  const base = { works: [{ lesson_id: 'l1', done: true, all_done: true, stretch_done: 1 }], awards: [] };
  const graded = { works: [{ ...base.works[0], grade: { total: 12 }, status: 'approved', scores: { a: 4 } }], awards: [] };
  assert.deepEqual(statsFor(base), statsFor(graded));
  assert.equal(statsFor(base).xp, XP.submit + XP.stretch);
  assert.ok(RANKS.length >= 4 && RANKS.length <= 8);
  const maxFromLessons = LESSONS.length * (XP.submit + 3 * XP.stretch);
  assert.ok(RANKS[RANKS.length - 1].xp > maxFromLessons - 100 && RANKS[RANKS.length - 1].xp <= maxFromLessons + 2 * XP.award, 'top rank should take the whole unit');
  assert.ok(unlockables().length >= 8 && unlockables().length <= 16, `${unlockables().length} unlocks`);
  const badgeIds = new Set([...BADGES, ...TEACHER_BADGES].map((b) => b.id));
  for (const u of unlockables()) if (u.unlock.badge) assert.ok(badgeIds.has(u.unlock.badge), `${u.name} needs unknown badge ${u.unlock.badge}`);
  for (const b of [...BADGES, ...TEACHER_BADGES]) assert.match(b.id, /^[a-z-]{1,40}$/);
  assert.ok(unlockables().some((u) => TEACHER_BADGES.some((b) => b.id === u.unlock.badge)), 'a badge from the teacher should unlock something');
});

test('skin colors are one set with no locks', () => {
  assert.equal(SLOTS.skin.locks, undefined);
  assert.ok(!unlockables().some((u) => u.slot === 'skin'));
});
