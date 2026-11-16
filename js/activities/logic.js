// What each activity remembers, when it counts as done, and what the teacher sees. No page code
// here, so tests can run every activity: tests/curriculum.test.mjs solves each one with solve()
// and checks that a fresh start is not already done.
//
// Each activity's state is saved as plain JSON in the student's work, keyed by step id.
// ctx = { answers } holds every step's state in the lesson, for activities that build on earlier ones.
import { CATEGORIES, BUDGET, buildTotal, buildProblems, missingParts, optionById, TODAY } from '../curriculum/catalog.js';
import { sourceMissing, citationText } from '../curriculum/mla.js';
import { cleanLink_ } from '../shared/links.js';

export const words = (t) => (String(t || '').match(/[A-Za-z0-9'’$,.-]+/g) || []).filter((w) => /[A-Za-z0-9]/.test(w)).length;
const enough = (t, n) => words(t) >= (n || 1);
const asList = (x) => (Array.isArray(x) ? x : []);
const asObj = (x) => (x && typeof x === 'object' && !Array.isArray(x) ? x : {});

// Speed lab: seconds to load a game, from three parts.
export const SPEED = {
  cpu: { label: 'Processor', options: [{ id: 'slow', label: 'Old CPU', secs: 6 }, { id: 'fast', label: 'New CPU', secs: 3 }] },
  ram: { label: 'Memory (RAM)', options: [{ id: '4', label: '4 GB', secs: 5 }, { id: '8', label: '8 GB', secs: 1 }, { id: '16', label: '16 GB', secs: 0 }] },
  storage: { label: 'Storage', options: [{ id: 'hdd', label: 'Hard drive', secs: 18 }, { id: 'ssd', label: 'SSD', secs: 4 }] },
};
export const SPEED_START = { cpu: 'slow', ram: '4', storage: 'hdd' };
export function loadSeconds(cfg) {
  const c = { ...SPEED_START, ...asObj(cfg) };
  return Object.keys(SPEED).reduce((a, k) => a + ((SPEED[k].options.find((o) => o.id === c[k]) || SPEED[k].options[0]).secs), 0);
}

export const bitsValue = (bits) => asList(bits).reduce((a, b) => a * 2 + (b ? 1 : 0), 0);
export const toBits = (n, size) => Array.from({ length: size }, (_, i) => ((n >> (size - 1 - i)) & 1));
export const LETTERS = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));

/** All the parts a design has picked so far, across its steps. */
export function designPicks(answers) {
  const out = {};
  for (const st of Object.values(asObj(answers))) {
    const picks = asObj(st && st.picks);
    if (!st || Array.isArray(st.picks)) continue;
    for (const c of CATEGORIES) if (picks[c.id] !== undefined) out[c.id] = picks[c.id];
  }
  return out;
}
/** Every source a history report has, in the order entered. */
export function allSources(answers) {
  return Object.entries(asObj(answers)).filter(([, st]) => st && Array.isArray(st.list)).flatMap(([, st]) => st.list).filter(Boolean);
}
const completeSources = (answers) => allSources(answers).filter((s) => !sourceMissing(s).length);

const binsOf = (spec) => asList(spec.bins);
const T = {
  sort: {
    initial: () => ({ place: {}, misses: 0 }),
    isDone: (spec, st) => spec.items.every((it) => asObj(st.place)[it.id] && (!spec.graded || asObj(st.place)[it.id] === it.bin)),
    solve: (spec) => ({ place: Object.fromEntries(spec.items.map((it) => [it.id, spec.graded ? it.bin : binsOf(spec)[0].id])), misses: 0 }),
    summary(spec, st, ctx) {
      const place = asObj(st.place);
      const lines = [];
      if (spec.graded) lines.push(`${Object.keys(place).length} of ${spec.items.length} placed, ${st.misses || 0} wrong tries`);
      else for (const b of binsOf(spec)) lines.push(`${b.label}: ${spec.items.filter((it) => place[it.id] === b.id).map((it) => it.label).join(', ') || 'none'}`);
      if (spec.compareTo) {
        const before = asObj(asObj(asObj(ctx.answers)[spec.compareTo]).place);
        const changed = spec.items.filter((it) => before[it.id] && before[it.id] !== it.bin).map((it) => it.label);
        lines.push(changed.length ? `First guesses that changed: ${changed.join(', ')}` : 'Every first guess was already right');
      }
      return lines;
    },
  },
  explore: {
    initial: () => ({ opened: [] }),
    isDone: (spec, st) => spec.cards.every((c) => asList(st.opened).includes(c.id)),
    solve: (spec) => ({ opened: spec.cards.map((c) => c.id) }),
    summary: (spec, st) => [`Opened ${asList(st.opened).filter((id) => spec.cards.some((c) => c.id === id)).length} of ${spec.cards.length}`],
  },
  order: {
    initial: () => ({ done: [], misses: 0 }),
    isDone: (spec, st) => asList(st.done).length === spec.items.length && spec.items.every((it, i) => st.done[i] === it.id),
    solve: (spec) => ({ done: spec.items.map((it) => it.id), misses: 0 }),
    summary: (spec, st) => [`${asList(st.done).length} of ${spec.items.length} in order, ${st.misses || 0} wrong tries`],
  },
  judge: {
    initial: () => ({ right: [], misses: 0, missed: [] }),
    isDone: (spec, st) => spec.things.every((t) => asList(st.right).includes(t.id)),
    solve: (spec) => ({ right: spec.things.map((t) => t.id), misses: 0, missed: [] }),
    summary: (spec, st) => [`${asList(st.right).length} of ${spec.things.length} judged`, asList(st.missed).length ? `Wrong at first: ${spec.things.filter((t) => st.missed.includes(t.id)).map((t) => t.label).join(', ')}` : 'All right the first time'],
  },
  binary: {
    initial: (spec) => ({ bits: Array(spec.bits).fill(0), hit: 0 }),
    isDone: (spec, st) => (Number(st.hit) || 0) >= spec.targets.length,
    solve: (spec) => ({ bits: toBits(spec.targets[spec.targets.length - 1], spec.bits), hit: spec.targets.length }),
    summary: (spec, st) => [`Made ${Math.min(Number(st.hit) || 0, spec.targets.length)} of ${spec.targets.length} target numbers (${spec.targets.join(', ')})`],
  },
  decode: {
    initial: () => ({ letters: '', initial: { letter: '', bits: Array(8).fill(0) } }),
    isDone(spec, st) {
      if (String(st.letters || '').trim().toUpperCase() !== spec.message) return false;
      if (!spec.initial) return true;
      const ini = asObj(st.initial);
      return LETTERS.includes(ini.letter) && bitsValue(ini.bits) === ini.letter.charCodeAt(0);
    },
    solve: (spec) => ({ letters: spec.message, initial: { letter: 'A', bits: toBits(65, 8) } }),
    summary: (spec, st) => {
      const ini = asObj(st.initial);
      return [`Decoded: "${String(st.letters || '').toUpperCase() || '(nothing yet)'}" (answer: ${spec.message})`,
        spec.initial && ini.letter ? `Initial ${ini.letter} as ${asList(ini.bits).join('')} = ${bitsValue(ini.bits)}${bitsValue(ini.bits) === ini.letter.charCodeAt(0) ? ' ✓' : ` (should be ${ini.letter.charCodeAt(0)})`}` : 'No initial yet'];
    },
  },
  pixels: {
    initial: (spec) => ({ grid: '0'.repeat(spec.rows.join('').length) }),
    isDone: (spec, st) => st.grid === spec.rows.join(''),
    solve: (spec) => ({ grid: spec.rows.join('') }),
    summary: (spec, st) => {
      const want = spec.rows.join('');
      const got = String(st.grid || '');
      const right = [...want].filter((c, i) => got[i] === c).length;
      return [`${right} of ${want.length} pixels match`];
    },
  },
  color: {
    initial: () => ({ rgb: [0, 0, 0], hit: 0 }),
    isDone: (spec, st) => (Number(st.hit) || 0) >= spec.targets.length,
    solve: (spec) => ({ rgb: spec.targets[spec.targets.length - 1].rgb, hit: spec.targets.length }),
    summary: (spec, st) => [`Mixed ${Math.min(Number(st.hit) || 0, spec.targets.length)} of ${spec.targets.length} colors`],
  },
  speedlab: {
    initial: () => ({ cfg: { ...SPEED_START }, tries: [] }),
    isDone: (spec, st) => asList(st.tries).length >= spec.minTries && asList(st.tries).some((t) => loadSeconds(t) < spec.goal),
    solve: (spec) => ({ cfg: { cpu: 'fast', ram: '8', storage: 'ssd' }, tries: [{ ...SPEED_START, storage: 'ssd' }, { cpu: 'fast', ram: '4', storage: 'ssd' }, { cpu: 'fast', ram: '8', storage: 'ssd' }].slice(0, Math.max(3, spec.minTries)) }),
    summary: (spec, st) => {
      const tries = asList(st.tries);
      const best = tries.length ? Math.min(...tries.map(loadSeconds)) : null;
      return [`${tries.length} tries, fastest ${best === null ? 'none' : `${best} seconds`} (goal: under ${spec.goal})`];
    },
  },
  choose: {
    initial: () => ({ pick: '', text: '' }),
    isDone(spec, st) {
      if (!st.pick) return false;
      if (st.pick === 'other') return enough(st.text, 2);
      if (!spec.options.some((o) => o.id === st.pick)) return false;
      return spec.ask ? enough(st.text, spec.ask.minWords) : true;
    },
    solve: (spec) => ({ pick: spec.options[0].id, text: spec.ask ? 'A student in my class who uses it every single day for school.' : '' }),
    summary: (spec, st) => {
      const o = spec.options.find((x) => x.id === st.pick);
      return [`Chose: ${st.pick === 'other' ? `their own: ${st.text || ''}` : o ? o.label : '(nothing yet)'}`, spec.ask && st.pick !== 'other' ? `${spec.ask.label} ${st.text || '(blank)'}` : ''].filter(Boolean);
    },
  },
  pickmany: {
    initial: () => ({ picks: [], text: '' }),
    isDone: (spec, st) => {
      const n = asList(st.picks).filter((id) => spec.options.some((o) => o.id === id)).length;
      return n >= spec.min && n <= spec.max && (!spec.ask || enough(st.text, spec.ask.minWords));
    },
    solve: (spec) => ({ picks: spec.options.slice(0, spec.min).map((o) => o.id), text: 'These matter most because the computer has to do its main job well.' }),
    summary: (spec, st) => [`Picked: ${spec.options.filter((o) => asList(st.picks).includes(o.id)).map((o) => o.label).join(', ') || '(nothing yet)'}`, spec.ask ? `${spec.ask.label} ${st.text || '(blank)'}` : ''].filter(Boolean),
  },
  parts: {
    initial: () => ({ picks: {}, why: {} }),
    isDone: (spec, st) => spec.categories.every((id) => {
      const c = CATEGORIES.find((x) => x.id === id);
      const p = asObj(st.picks)[id];
      const picked = c.many ? asList(p).length > 0 : !!p;
      return picked && enough(asObj(st.why)[id], spec.minWords);
    }),
    solve: (spec) => {
      const firstOk = { cpu: 'cpu-fast', ram: 'ram-16', storage: 'ssd-1', graphics: 'gpu-mid', board: 'board-basic', power: 'psu-550', case: 'case-tower', screen: 'screen-big' };
      const picks = {};
      const why = {};
      for (const id of spec.categories) {
        const c = CATEGORIES.find((x) => x.id === id);
        picks[id] = c.many ? ['keys', 'speakers'] : (firstOk[id] || c.options[0].id);
        why[id] = 'I picked this because it fits what my computer needs to do.';
      }
      return { picks, why };
    },
    summary: (spec, st) => spec.categories.map((id) => {
      const c = CATEGORIES.find((x) => x.id === id);
      const p = asObj(st.picks)[id];
      const names = (c.many ? asList(p) : p ? [p] : []).map((x) => { const o = optionById(x); return o ? `${o.label} ($${o.price})` : x; });
      return `${c.label}: ${names.join(', ') || '(none)'}. Why: ${asObj(st.why)[id] || '(blank)'}`;
    }),
  },
  budget: {
    initial: () => ({ text: '' }),
    isDone: (spec, st, ctx) => {
      const picks = designPicks(ctx && ctx.answers);
      return !missingParts(picks).length && !buildProblems(picks).length && buildTotal(picks) <= BUDGET && enough(st.text, spec.minWords);
    },
    solve: () => ({ text: 'I chose a cheaper CPU so I could afford a graphics card, because pictures matter more for my purpose.' }),
    summary: (spec, st, ctx) => {
      const picks = designPicks(ctx && ctx.answers);
      const total = buildTotal(picks);
      return [`Total: $${total.toLocaleString('en-US')} of $${BUDGET.toLocaleString('en-US')}${total > BUDGET ? ' (over budget)' : ''}`, ...buildProblems(picks).map((p) => `Warning: ${p}`), `Trade-off: ${st.text || '(blank)'}`];
    },
  },
  assemble: {
    initial: () => ({ name: '' }),
    isDone: (spec, st) => String(st.name || '').trim().length >= 2,
    solve: () => ({ name: 'The Thinker 3000' }),
    summary: (spec, st) => [`Named it: ${st.name || '(no name yet)'}`],
  },
  write: {
    initial: () => ({ text: {} }),
    isDone: (spec, st) => spec.prompts.every((p) => enough(asObj(st.text)[p.id], p.minWords)),
    solve: (spec) => ({ text: Object.fromEntries(spec.prompts.map((p) => [p.id, Array(Math.ceil(p.minWords / 6)).fill('This is a sentence about my project.').join(' ')])) }),
    summary: (spec, st) => spec.prompts.map((p) => `${p.label} ${asObj(st.text)[p.id] || '(blank)'}`),
  },
  sources: {
    initial: (spec) => ({ list: Array.from({ length: spec.count }, () => ({ type: 'web' })) }),
    isDone: (spec, st) => asList(st.list).length >= spec.count && asList(st.list).slice(0, spec.count).every((s) => !sourceMissing(s).length),
    solve: (spec) => ({ list: Array.from({ length: spec.count }, (_, i) => ({
      type: 'web', first: 'Ada', last: `Writer${spec.first + i + 1}`, title: `Early Computers, Part ${spec.first + i + 1}`, container: 'Computer History Museum',
      date: '2024-03-05', url: `https://www.computerhistory.org/part${spec.first + i + 1}`, accessed: '2026-11-16', check: { who: 'expert', when: 'yes', why: 'teach' },
    })) }),
    summary: (spec, st) => asList(st.list).map((s, i) => `Source ${spec.first + i + 1}: ${citationText(s) || '(empty)'}${sourceMissing(s).length ? ` [needs ${sourceMissing(s).join(', ')}]` : ''}${s.check ? ` Trust check: made by ${s.check.who || '?'}, current: ${s.check.when || '?'}, purpose: ${s.check.why || '?'}` : ''}`),
  },
  compare: {
    initial: () => ({ then: {} }),
    isDone: (spec, st) => TODAY.rows.every((r) => enough(asObj(st.then)[r.id], 2)),
    solve: () => ({ then: Object.fromEntries(TODAY.rows.map((r) => [r.id, 'It was very different then.'])) }),
    summary: (spec, st) => TODAY.rows.map((r) => `${r.label}: then "${asObj(st.then)[r.id] || ''}", now "${r.now}"`),
  },
  checklist: {
    initial: () => ({ format: '', checked: [] }),
    isDone: (spec, st, ctx) => {
      const own = spec.continues ? asObj(asObj(ctx && ctx.answers)[spec.continues]) : st;
      return !!own.format && spec.items.every((_, i) => asList(own.checked).includes(i));
    },
    solve: (spec) => (spec.continues ? {} : { format: 'docs', checked: spec.items.map((_, i) => i) }),
    summary: (spec, st, ctx) => {
      if (spec.continues) return ['Same checklist as "Make your report"'];
      return [`Format: ${(FORMATS.find((f) => f.id === st.format) || {}).label || '(not chosen)'}`, `Parts done: ${asList(st.checked).length} of ${spec.items.length}`];
    },
  },
  citations: {
    initial: () => ({ added: false }),
    isDone: (spec, st, ctx) => !!st.added && completeSources(ctx && ctx.answers).length >= 3,
    solve: () => ({ added: true }),
    summary: (spec, st, ctx) => [`${completeSources(ctx && ctx.answers).length} complete sources. ${st.added ? 'Says they added them to the report.' : 'Not added to the report yet.'}`],
  },
  link: {
    initial: () => ({ url: '', shared: false }),
    isDone: (spec, st) => !!cleanLink_(st.url) && !!st.shared,
    solve: () => ({ url: 'https://docs.google.com/document/d/example/edit', shared: true }),
    summary: (spec, st) => [cleanLink_(st.url) ? `Link: ${cleanLink_(st.url)}` : 'No link yet', st.shared ? 'Says sharing is set so the teacher can view it' : 'Has not confirmed sharing'],
  },
};

export const FORMATS = [
  { id: 'docs', label: 'Google Docs', emoji: '📄' },
  { id: 'slides', label: 'Google Slides', emoji: '📊' },
  { id: 'canva', label: 'Canva', emoji: '🎨' },
  { id: 'video', label: 'Video', emoji: '🎥' },
];

export const TYPES = Object.keys(T);
const kind = (spec) => {
  const t = T[spec && spec.type];
  if (!t) throw new Error(`Unknown activity: ${spec && spec.type}`);
  return t;
};
export const initialState = (spec) => kind(spec).initial(spec);
/** Saved state may be missing or from an older version, so fill in what an activity expects. */
export const stateOf = (spec, saved) => ({ ...initialState(spec), ...asObj(saved) });
export const isDone = (spec, saved, ctx = {}) => { try { return !!kind(spec).isDone(spec, stateOf(spec, saved), ctx); } catch (_) { return false; } };
export const solve = (spec, ctx = {}) => kind(spec).solve(spec, ctx);
export const summaryOf = (spec, saved, ctx = {}) => { try { return kind(spec).summary(spec, stateOf(spec, saved), ctx); } catch (_) { return ['(could not read this answer)']; } };
