// The class display: what a teacher projects while students work.
// Everything here is safe to show the room: no scores, feedback, approvals, or emails.
import { h, fill, clear, modal, toast, attempt } from '../ui.js';
import { app, go } from '../main.js';
import { readButton } from '../settings.js';
import { LESSONS, getLesson, stepsFor } from '../curriculum/lessons.js';
import { alignmentFor, coverage, standardByCode } from '../curriculum/alignment.js';
import { shortCode } from '../curriculum/standards.js';
import { recentAchievements, statsFor, nextLessonFor } from '../game/rules.js';
import { avatarURL, defaultAvatar } from '../game/avatar.js';

const todayKey = () => new Date().toLocaleDateString('en-CA');
const emptyPlan = () => ({ day: todayKey(), question: '', focus: '', standards: [], timer_end: '' });
/** A saved plan only counts on the day it was made. */
const currentPlan = (saved) => (saved && saved.day === todayKey() ? { ...emptyPlan(), ...saved } : emptyPlan());
const sameDay = (iso) => !!iso && new Date(iso).toLocaleDateString('en-CA') === todayKey();

/** The lesson a student is on: their next one, or the last lesson once they're finished. */
export const standingOn = (s) => nextLessonFor(statsFor(s).done) || LESSONS[LESSONS.length - 1].id;

/** Lessons students are on right now, most common first. */
export function lessonsInUse(board) {
  const counts = new Map();
  for (const s of board) { const id = standingOn(s); counts.set(id, (counts.get(id) || 0) + 1); }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([id, n]) => ({ id, n }));
}

/** For the project, the track most students on it chose. */
function mainTrack(board, lessonId) {
  const counts = new Map();
  for (const s of board) {
    const w = s.works.find((x) => x.lesson_id === lessonId);
    if (w && w.track) counts.set(w.track, (counts.get(w.track) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || 'design';
}

const personChip = (s) => h('div.pj-person', { title: s.display_name }, h('img', { src: avatarURL(s.avatar || defaultAvatar(s.id), 3), alt: '' }), h('span', s.display_name));

/**
 * The lesson most of the class is on, as a row of steps: each student stands at the furthest
 * step they have reached. Students who submit it today cross the finish.
 */
function racePanel(board, lessons, focus) {
  const main = lessons[0];
  if (!main) return h('section.pj-panel.pj-race-panel', h('h2', 'Today'), h('p.pj-sub', 'Nobody is on the class list yet.'));
  const lesson = getLesson(main.id);
  const track = lesson.tracks ? mainTrack(board, lesson.id) : '';
  const steps = stepsFor(lesson, track);
  const last = steps.length - 1;
  const stops = [
    { key: 'start', mark: '▶', label: 'Not started' },
    ...steps.map((st, i) => ({ key: i, mark: String(i + 1), label: st.title, day: st.day })),
    { key: 'finish', mark: '🏁', label: 'Submitted' },
  ];
  const at = new Map(stops.map((st) => [st.key, []]));
  const others = [];
  for (const s of board) {
    const w = s.works.find((x) => x.lesson_id === lesson.id);
    if (standingOn(s) === lesson.id && (!lesson.tracks || !w || !w.track || w.track === track)) {
      if (!w) at.get('start').push(s);
      else if (w.done) at.get('finish').push(s);
      else at.get(Math.min(Number(w.step_at) || 0, last)).push(s);
    } else if (w && w.done && sameDay(w.submitted_at)) at.get('finish').push(s);
    else others.push(s);
  }
  const working = steps.reduce((a, _, i) => a + at.get(i).length, 0);
  const busiest = Math.max(0, ...steps.map((_, i) => at.get(i).length));
  const where = (s) => {
    const id = standingOn(s);
    const w = s.works.find((x) => x.lesson_id === id);
    return `Lesson ${getLesson(id).n}${w && w.track ? ` (${getLesson(id).tracks[w.track].label})` : ''}`;
  };
  return h('section.pj-panel.pj-race-panel',
    h('div.pj-race-head',
      h('h2', `Today: ${lesson.title}${track ? `, ${lesson.tracks[track].label}` : ''}`),
      h('span.pj-sub', `${working} working · ${at.get('finish').length} submitted · ${at.get('start').length} not started`)),
    focus.length > 0 && h('ul.pj-race-focus', focus.map((x) => h('li', x))),
    h('div.pj-race', { style: `grid-template-columns:repeat(${stops.length}, minmax(0, 1fr))` },
      stops.map((st) => {
        const here = at.get(st.key);
        const busy = typeof st.key === 'number' && here.length > 0 && here.length === busiest;
        return h('div.pj-stop', { class: `${typeof st.key === 'number' ? '' : st.key} ${busy ? 'busy' : ''}` },
          h('div.pj-stop-mark', st.mark),
          h('div.pj-stop-label', st.day ? `Day ${st.day}: ${st.label}` : st.label),
          h('div.pj-racers', here.map(personChip)));
      })),
    others.length > 0 && h('div.pj-others', h('strong', 'On other lessons:'),
      others.map((s) => h('span.pj-other', h('img', { src: avatarURL(s.avatar || defaultAvatar(s.id), 2), alt: '' }), `${s.display_name} · ${where(s)}`))),
  );
}

function achievements(board) {
  // At most two per student, so the feed celebrates more of the class.
  const shown = new Map();
  const items = recentAchievements(board).filter((a) => {
    shown.set(a.student_id, (shown.get(a.student_id) || 0) + 1);
    return shown.get(a.student_id) <= 2;
  }).slice(0, 6);
  if (!items.length) return h('p.pj-empty', 'New badges and ranks show up here.');
  return h('ul.pj-feed', items.map((a) => h('li',
    h('img', { src: avatarURL(a.avatar || defaultAvatar(a.student_id), 2), alt: '' }),
    h('span.pj-icon', a.icon),
    h('span', h('strong', a.name), ` ${a.text}`))));
}

function autoStandards(lessons, board) {
  const codes = [];
  for (const { id } of lessons) {
    const l = getLesson(id);
    const a = alignmentFor(id, l.tracks ? mainTrack(board, id) : undefined);
    for (const c of [...a.anchor, ...a.support]) if (!codes.includes(c)) codes.push(c);
    if (codes.length >= 3) break;
  }
  return codes.slice(0, 3);
}

function openSetup(plan, lessons, onSave) {
  const suggested = lessons[0] ? getLesson(lessons[0].id).bigQuestion : '';
  const q = h('textarea', { rows: 2, maxlength: 200, value: plan.question, placeholder: suggested ? `Leave blank to use: ${suggested}` : 'Type a question' });
  const focus = h('textarea', { rows: 3, maxlength: 300, value: plan.focus, placeholder: 'Optional. One item per line, shown above the steps.' });
  const endValue = plan.timer_end ? new Date(plan.timer_end) : null;
  const pad = (n) => String(n).padStart(2, '0');
  const end = h('input', { type: 'time', value: endValue ? `${pad(endValue.getHours())}:${pad(endValue.getMinutes())}` : '' });
  const setIn = (mins) => { const d = new Date(Date.now() + mins * 60000); end.value = `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  const taught = coverage().filter((c) => c.anchor.length || c.support.length);
  const picks = [0, 1, 2].map((i) => h('select', { 'aria-label': `Standard ${i + 1}` },
    h('option', { value: '' }, i === 0 ? 'Automatic' : 'None'),
    taught.map((c) => h('option', { value: c.code, selected: plan.standards[i] === c.code }, `${shortCode(c.code)}: ${c.text.slice(0, 60)}...`))));
  modal((close) => h('form.stack', {
    onsubmit: (e) => {
      e.preventDefault();
      let timer = '';
      if (end.value) {
        const [hh, mm] = end.value.split(':').map(Number);
        const d = new Date();
        d.setHours(hh, mm, 0, 0);
        timer = d.toISOString();
      }
      close();
      onSave({ day: todayKey(), question: q.value.trim(), focus: focus.value.trim(), standards: picks.map((p) => p.value).filter(Boolean), timer_end: timer });
    },
  },
  h('h2', 'Set up today'),
  h('label.field', h('span', 'Work time ends at'), end),
  h('div.row', [10, 20, 30, 40].map((m) => h('button.btn.small', { type: 'button', onclick: () => setIn(m) }, `${m} min from now`))),
  h('label.field', h('span', 'What to work on'), focus),
  h('label.field', h('span', 'Big question'), q),
  h('div.field', h('span', 'Standards for today'), picks),
  h('div.row.end', h('button.btn', { type: 'button', onclick: close }, 'Cancel'), h('button.btn.primary', { type: 'submit' }, 'Save'))));
}

export async function viewDisplay(main, classId) {
  const [cls, firstBoard, savedPlan] = await Promise.all([app.store.getClass(classId), app.store.classBoard(classId), app.store.getClassPlan(classId)]);
  let board = firstBoard;
  let plan = currentPlan(savedPlan);
  const clock = h('div.pj-clock', { 'aria-live': 'off' });
  const panels = h('div.pj-panels');

  const savePlan = async (next) => {
    plan = next;
    draw();
    tick();
    await attempt(() => app.store.saveClassPlan(classId, next));
  };
  function tick() {
    if (!plan.timer_end) {
      fill(clock, h('button.pj-set', { onclick: setup }, 'Set timer'));
      clock.className = 'pj-clock';
      return;
    }
    const left = Math.round((new Date(plan.timer_end).getTime() - Date.now()) / 1000);
    const over = left <= 0;
    const m = Math.floor(Math.max(left, 0) / 60);
    const s = String(Math.max(left, 0) % 60).padStart(2, '0');
    clock.className = `pj-clock ${over ? 'over' : left <= 180 ? 'soon' : ''}`;
    fill(clock, 
      h('div.pj-time', over ? 'Time!' : `${m}:${s}`),
      h('div.pj-time-note', over ? 'Finish your step' : left <= 180 ? 'Almost time' : 'left'),
      h('button.pj-plus', { onclick: () => {
        const base = Math.max(new Date(plan.timer_end).getTime(), Date.now());
        savePlan({ ...plan, timer_end: new Date(base + 300000).toISOString() });
      } }, '+5'),
    );
  }
  function setup() { openSetup(plan, lessonsInUse(board), savePlan); }

  function draw() {
    const lessons = lessonsInUse(board);
    const question = plan.question || (lessons[0] ? getLesson(lessons[0].id).bigQuestion : '');
    const codes = plan.standards.length ? plan.standards : autoStandards(lessons, board);
    const custom = plan.focus.split('\n').map((x) => x.trim()).filter(Boolean).slice(0, 3);
    fill(panels, 
      racePanel(board, lessons, custom),
      h('section.pj-panel.pj-question',
        h('div.read-row', h('h2', 'Big question'), readButton(() => question)),
        question ? h('p.pj-q', question) : h('p.pj-empty', 'Set a question for today.')),
      h('section.pj-panel.pj-feed-panel', h('h2', 'Recent achievements'), achievements(board)),
      h('section.pj-panel.pj-standards', h('h2', 'MA DLCS standards'), h('ul', codes.map((c) => h('li', h('strong', shortCode(c)), ' ', standardByCode(c).text)))),
    );
  }
  draw();
  tick();

  const ticker = setInterval(tick, 1000);
  // One call a minute keeps the display current without using much of the class's quota.
  const poller = setInterval(async () => {
    const fresh = await attempt(() => app.store.classBoard(classId));
    if (fresh) { board = fresh; draw(); }
  }, 60000);
  document.body.classList.add('projecting');
  app.cleanup = () => {
    clearInterval(ticker);
    clearInterval(poller);
    document.body.classList.remove('projecting');
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  };
  const fullScreen = () => {
    if (!document.documentElement.requestFullscreen) { toast('Press F11 for full screen.'); return; }
    document.documentElement.requestFullscreen().catch(() => toast('Press F11 for full screen.'));
  };
  return h('div.pj',
    h('header.pj-head',
      h('div', h('h1', cls.name), h('p', new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }))),
      h('div.pj-controls',
        h('button.btn.small', { onclick: setup }, 'Set up today'),
        h('button.btn.small', { onclick: fullScreen }, 'Full screen'),
        h('button.btn.small', { onclick: () => go(`/class/${classId}`) }, 'Exit')),
      clock),
    panels);
}
