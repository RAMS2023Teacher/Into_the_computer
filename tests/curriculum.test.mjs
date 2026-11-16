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

test('every lesson fits a 30 to 40 minute class, and its steps add up', () => {
  for (const l of LESSONS) {
    assert.ok(l.mins >= 30 && l.mins <= 40, `${l.id} is ${l.mins} minutes`);
    for (const track of tracksOf(l)) {
      const sum = stepsFor(l, track).reduce((a, s) => a + s.mins, 0) + l.finishMins;
      assert.equal(sum, l.mins, `${l.id} ${track}: steps and finishing add to ${sum}, not ${l.mins}`);
    }
  }
});

test('the project is one class period, with no leftover days', () => {
  const p = LESSONS.find((l) => l.tracks);
  assert.equal(p.periods, undefined);
  for (const s of allSteps(p)) assert.equal(s.day, undefined, `${s.id} still has a day`);
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
  const purpose = LESSONS.flatMap(allSteps).find((s) => s.id === 'purpose').activity;
  assert.equal(isDone(purpose, { pick: 'gaming', text: 'my friend' }), false);
  assert.equal(isDone(purpose, { pick: 'gaming', text: 'My cousin who plays new games every weekend' }), true);
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

test('the $3,000 budget forces trade-offs, but every purpose has a build that fits', () => {
  assert.equal(BUDGET, 3000);
  const best = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.many ? c.options.map((o) => o.id) : [...c.options].sort((a, b) => b.price - a.price)[0].id]));
  assert.ok(buildTotal(best) > BUDGET, 'the best of everything should not fit');
  const builds = {
    gaming: { cpu: 'r7-9800x3d', ram: 'ram-32', storage: 'ssd-2', graphics: 'rtx-5070', board: 'b650', power: 'rm650e', case: 'h5-flow', screen: 'monitor-27', extras: ['keys', 'speakers'] },
    school: { cpu: 'i3-14100', ram: 'ram-8', storage: 'ssd-1', graphics: 'gpu-none', board: 'b760m', power: 'battery', case: 'case-laptop', screen: 'screen-laptop', extras: ['camera', 'mic', 'speakers'] },
    video: { cpu: 'r9-9950x', ram: 'ram-32', storage: 'ssd-4', graphics: 'rtx-5060', board: 'b650', power: 'rm650e', case: 'h5-flow', screen: 'monitor-27', extras: ['keys', 'speakers'] },
    rover: { cpu: 'r5-9600x', ram: 'ram-16', storage: 'ssd-1', graphics: 'gpu-none', board: 'b650i', power: 'solar', case: 'case-rugged', screen: 'screen-none', extras: ['camera', 'sensors', 'gps', 'motors', 'wifi'] },
    pets: { cpu: 'r5-9600x', ram: 'ram-8', storage: 'ssd-1', graphics: 'gpu-none', board: 'b650i', power: 'rm650e', case: 'nr200p', screen: 'pi-touch', extras: ['camera', 'sensors', 'motors', 'wifi'] },
  };
  for (const p of PURPOSES.filter((x) => x.id !== 'own')) {
    const b = builds[p.id];
    assert.ok(b, `no sample build for ${p.id}`);
    assert.deepEqual(missingParts(b), [], p.id);
    assert.deepEqual(buildProblems(b), [], p.id);
    assert.ok(buildTotal(b) <= BUDGET, `${p.id} costs ${buildTotal(b)}`);
  }
  // The rules a real build follows.
  assert.ok(buildProblems({ graphics: 'rtx-5080', power: 'rm650e' }).length > 0, '5080 needs 850 W');
  assert.ok(buildProblems({ cpu: 'i3-14100', board: 'b650' }).length > 0, 'Intel CPU on an AMD board');
  assert.ok(buildProblems({ cpu: 'r5-9600x', board: 'b760m' }).length > 0, 'AMD CPU on an Intel board');
  assert.ok(buildProblems({ case: 'nr200p', board: 'b650' }).length > 0, 'mini case with a full-size board');
  // Every part has a real price, and every option id is unique.
  const ids = CATEGORIES.flatMap((c) => c.options.map((o) => o.id));
  assert.equal(new Set(ids).size, ids.length);
  for (const c of CATEGORIES) for (const o of c.options) assert.ok(Number.isInteger(o.price) && o.price >= 0, o.id);
});

test('every computer from history has a kid-friendly website and a Wikipedia page', () => {
  assert.ok(HISTORY.length >= 10);
  for (const c of HISTORY) {
    assert.equal(c.links.length, 2, c.id);
    assert.ok(c.links[0].kids && c.links[0].url.startsWith('https://kids.kiddle.co/'), `${c.id}: Kiddle first`);
    assert.ok(c.links[1].url.startsWith('https://en.wikipedia.org/wiki/'), `${c.id}: then Wikipedia`);
  }
});

test('sentence frames fill in the chosen computer and need every blank', () => {
  const l5 = LESSONS.find((l) => l.id === 'l5');
  const facts = stepsFor(l5, 'history').find((s) => s.id === 'facts').activity;
  const ctx = { answers: { pick: { pick: 'eniac' } } };
  const half = { blanks: { 'who-0': 'J. Presper Eckert and John Mauchly' } };
  assert.equal(isDone(facts, half, ctx), false);
  const lines = summaryOf(facts, half, ctx);
  assert.ok(lines[0].startsWith('The ENIAC was made by [J. Presper Eckert and John Mauchly] in [____]'), lines[0]);
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

test('Learn screens stay short: up to 3 facts, each 20 words or fewer, each with a picture', () => {
  let count = 0;
  for (const l of LESSONS) {
    for (const s of allSteps(l)) {
      if (!s.learn) continue;
      count++;
      assert.ok(s.learn.length >= 1 && s.learn.length <= 3, `${l.id}/${s.id} has ${s.learn.length} facts`);
      for (const f of s.learn) {
        assert.ok(f.icon, `${l.id}/${s.id} fact needs a picture`);
        assert.ok(wordCount(f.text) <= 20, `${l.id}/${s.id}: "${f.text}" has ${wordCount(f.text)} words`);
      }
    }
  }
  assert.ok(count >= 15, 'most steps that ask students to apply new ideas teach them first');
});

test('the facts check questions rely on are taught before the question', () => {
  // Each pair: a check question, and words that must appear on an earlier Learn screen, card, or instruction.
  const taught = [
    ['l3', 'Why is a game copied into RAM before it runs?', 'faster'],
    ['l3', 'You type a story, and the power goes out before you save. Where was it?', 'wiped'],
    ['l4', 'How many different values can one byte hold?', '256'],
    ['l4', 'How does a computer store a letter like A?', 'number'],
    ['l4', 'About how many megabytes are in one gigabyte?', '1,000 MB'],
    ['l4', 'Why do photos and songs use different file types?', 'different kind of content'],
    ['l1', 'A touchscreen does which two jobs?', 'two jobs'],
  ];
  for (const [id, q, words] of taught) {
    const l = LESSONS.find((x) => x.id === id);
    const check = l.checks.find((c) => c.q === q);
    assert.ok(check, q);
    const upTo = l.steps.findIndex((s) => s.id === check.after);
    const before = l.steps.slice(0, upTo + 1).map((s) => [s.say, ...(s.learn || []).map((f) => f.text), ...((s.activity.cards || []).map((c) => c.text))].join(' ')).join(' ');
    assert.ok(before.includes(words), `"${q}" needs "${words}" taught first`);
  }
});
