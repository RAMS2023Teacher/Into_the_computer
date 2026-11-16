// A lesson: one step on screen at a time. Each step has one short instruction, an activity, and an
// explanation folded under "Why?". Check questions sit between steps and must be answered to move
// on. The lesson ends with a reflection, optional stretch goals, and Submit.
import { h, fill, clear, md, toast, attempt, modal, confirmBox } from '../ui.js';
import { app, go } from '../main.js';
import { getLesson, stepsFor, checksFor, stretchFor, LESSONS } from '../curriculum/lessons.js';
import { alignmentFor, standardByCode } from '../curriculum/alignment.js';
import { shortCode } from '../curriculum/standards.js';
import { isDone, solve, words } from '../activities/logic.js';
import { renderActivity } from '../activities/ui.js';
import { loadMe, badgeChip } from './student.js';
import { modelButton } from './model3d.js';
import { statsFor, XP, canOpen, nextLessonFor } from '../game/rules.js';
import { getSettings, readButton, speak, stopSpeaking } from '../settings.js';

const CHECKS_KEY = '_checks'; // Where first-try results of check questions are kept in the answers.
const checkKey = (c, i) => `${c.after}-${i}`;
const REFLECT_WORDS = 8;

export function standardChips(lessonId, track) {
  const a = alignmentFor(lessonId, track);
  return h('p.std-codes', a.anchor.map((c) => h('span.std.anchor', { title: standardByCode(c).text }, shortCode(c))), a.support.map((c) => h('span.std', { title: standardByCode(c).text }, shortCode(c))));
}

export async function viewLesson(main, id, previewTrack) {
  const lesson = getLesson(id);
  if (!lesson) throw new Error('That lesson does not exist.');
  const isStudent = app.session.role === 'student';
  const preview = !isStudent;
  let me = null;
  let work = null;
  if (isStudent) {
    me = await loadMe();
    if (!canOpen(id, me.done)) { toast('Finish the lesson before this one first.'); go('/'); return null; }
    work = me.works.find((w) => w.lesson_id === id) || null;
  }
  const approved = work?.status === 'approved';
  const answers = JSON.parse(JSON.stringify(work?.answers || {}));
  if (!answers[CHECKS_KEY]) answers[CHECKS_KEY] = {};
  let track = lesson.tracks ? (work?.track || answers.choose?.pick || previewTrack || '') : '';
  if (lesson.tracks && previewTrack && preview) { track = previewTrack; answers.choose = { pick: track, text: '' }; }
  let reflection = work?.reflection || '';
  let stretchDone = work?.stretch_done || 0;

  let steps = stepsFor(lesson, track);
  let checks = checksFor(lesson, track);
  let flow = [];
  const buildFlow = () => {
    steps = stepsFor(lesson, track);
    checks = checksFor(lesson, track);
    // A step's Learn screen comes first, then the step, then any check questions about it.
    flow = steps.flatMap((step, n) => [...(step.learn ? [{ learn: step, n }] : []), { step, n }, ...checks.map((c, i) => ({ check: c, key: checkKey(c, i) })).filter((x) => x.check.after === step.id)]);
  };
  buildFlow();
  const ctx = { answers };
  const doneSteps = () => steps.filter((s) => isDone(s.activity, answers[s.id], ctx)).length;
  const stepNumberAt = (i) => {
    if (i >= flow.length) return steps.length;
    for (let k = i; k >= 0; k--) if (flow[k].step || flow[k].learn) return flow[k].n;
    return 0;
  };
  // Open where the student left off.
  let furthest = Math.min(Number(work?.step_at) || 0, steps.length);
  let at = furthest >= steps.length && steps.length > 1 ? flow.length : Math.max(0, flow.findIndex((x) => (x.step || x.learn) && x.n === furthest));

  // Saving: at most every 30 seconds while working, and right away when leaving or submitting.
  const status = h('span.save-state', { 'aria-live': 'polite' }, preview ? 'Teacher preview: nothing is saved' : approved ? 'Approved: read only' : 'All saved');
  let dirty = false;
  let timer = null;
  let saving = null;
  const checkStats = () => {
    const keys = checks.map((c, i) => checkKey(c, i));
    const got = keys.filter((k) => answers[CHECKS_KEY][k] !== undefined);
    return { quiz_total: got.length === keys.length ? keys.length : 0, quiz_right: got.filter((k) => answers[CHECKS_KEY][k] === true).length };
  };
  const patch = () => ({
    answers, track, step_at: furthest, stretch_done: stretchDone, reflection,
    done_count: doneSteps(), done_total: steps.length, ...checkStats(),
  });
  async function persist() {
    clearTimeout(timer);
    timer = null;
    if (preview || approved || !dirty) return;
    dirty = false;
    status.textContent = 'Saving...';
    saving = app.store.saveWork(id, patch());
    try {
      work = await saving;
      status.textContent = dirty ? 'Not saved yet' : 'All saved';
      status.classList.remove('bad');
    } catch (e) {
      dirty = true;
      status.textContent = "Couldn't save. Trying again soon.";
      status.classList.add('bad');
      console.error(e);
      timer = setTimeout(persist, app.store.saveEvery); // Try again, so a busy moment can't lose work.
    } finally { saving = null; }
  }
  const markDirty = () => {
    if (preview || approved) return;
    dirty = true;
    status.textContent = 'Not saved yet';
    status.classList.remove('bad');
    if (!timer) timer = setTimeout(persist, app.store.saveEvery);
  };

  // Step pieces -------------------------------------------------------------------------------------
  const dots = h('ol.step-dots', { 'aria-label': 'Steps' });
  const box = h('div.step-body');

  function drawDots() {
    clear(dots);
    let lastDay = null;
    flow.forEach((item, i) => {
      if (item.step && item.step.day && item.step.day !== lastDay) {
        lastDay = item.step.day;
        dots.append(h('li.day-mark', `Day ${lastDay}`));
      }
      const on = i === at;
      const goTo = () => { at = i; drawStep(); };
      if (item.learn) {
        dots.append(h('li', h('button', { class: `learn ${on ? 'on' : ''}`, 'aria-label': `Learn: ${item.learn.title}`, 'aria-current': on ? 'step' : null, title: `Learn: ${item.learn.title}`, onclick: goTo, disabled: !reachable(i) }, '💡')));
        return;
      }
      if (item.check) {
        const ans = answers[CHECKS_KEY][item.key];
        dots.append(h('li', h('button', { class: `quiz ${ans !== undefined ? 'ok' : ''} ${on ? 'on' : ''}`, 'aria-label': 'Check question', 'aria-current': on ? 'step' : null, onclick: goTo, disabled: !reachable(i) }, ans !== undefined ? '✓' : '?')));
        return;
      }
      const ok = isDone(item.step.activity, answers[item.step.id], ctx);
      dots.append(h('li', h('button', { class: `${ok ? 'ok' : ''} ${on ? 'on' : ''}`, 'aria-label': `Step ${item.n + 1}: ${item.step.title}${ok ? ', done' : ''}`, 'aria-current': on ? 'step' : null, title: item.step.title, onclick: goTo, disabled: !reachable(i) }, ok ? '✓' : item.n + 1)));
    });
    if (!lesson.tracks || track) dots.append(h('li', h('button', { class: `finish ${at === flow.length ? 'on' : ''}`, 'aria-label': 'Finish', title: 'Finish', disabled: !reachable(flow.length), onclick: () => { at = flow.length; drawStep(); } }, '★')));
  }
  /** Students can't skip ahead past a check question they haven't answered. */
  function reachable(i) {
    if (preview) return true;
    for (let k = 0; k < i && k < flow.length; k++) if (flow[k].check && answers[CHECKS_KEY][flow[k].key] === undefined) return false;
    if (lesson.tracks && !track && i > 0) return false;
    return true;
  }

  const nav = (canNext, nextLabel = 'Next') => h('div.row.step-nav',
    at > 0 && h('button.btn', { type: 'button', onclick: () => { at--; drawStep(); } }, 'Back'),
    canNext && h('button.btn.primary', { type: 'button', onclick: () => { at++; drawStep(); } }, nextLabel));

  function stepPane(item) {
    const s = item.step;
    if (getSettings().autoRead) speak(s.say);
    const check = h('p.step-check');
    const showCheck = () => {
      const ok = isDone(s.activity, answers[s.id], ctx);
      check.className = `step-check ${ok ? 'ok' : 'wait'}`;
      check.textContent = ok ? '✓ Done' : 'Not done yet';
      return ok;
    };
    const navBox = h('div');
    const drawNav = () => {
      const ok = showCheck();
      // Choosing the project track is the one step that must be done before moving on.
      const mustFinish = s.activity.track && !track;
      fill(navBox, nav(!mustFinish || (ok && track), mustFinish && !ok ? 'Choose first' : 'Next'));
    };
    const env = {
      stepId: s.id, ctx, readOnly: approved,
      onChange: (state) => { answers[s.id] = state; markDirty(); drawNav(); drawDots(); },
      onTrack: (next) => {
        if (track && track !== next) {
          confirmBox('Switch projects?', 'Your work on the other project stays saved, so you can switch back.', 'Switch').then((yes) => { if (yes) { answers.choose = { pick: next, text: '' }; setTrack(next); } });
          return false;
        }
        setTrack(next);
        return true;
      },
    };
    const models = [s.model, ...(s.models || [])].filter(Boolean).map((k) => modelButton(k)).filter(Boolean);
    const activity = renderActivity(s.activity, answers[s.id], env);
    drawNav();
    return h('div.stack',
      h('p.eyebrow', s.day ? `Day ${s.day} · Step ${item.n + 1} of ${steps.length}` : `Step ${item.n + 1} of ${steps.length}`, ` · about ${s.mins} min`),
      h('h2', { tabindex: '-1' }, s.title),
      h('div.step-do', h('div.read-row', md(s.say), readButton(() => s.say))),
      models.length > 0 && h('div.row.models', models),
      activity,
      s.why && h('details.hint.why', h('summary', 'Why?'), h('div.read-row', md(s.why), readButton(() => s.why, 'Read the explanation aloud'))),
      check, navBox);
  }

  function setTrack(next) {
    track = next;
    if (!answers.choose || answers.choose.pick !== next) answers.choose = { pick: next, text: '' };
    buildFlow();
    at = 0;
    markDirty();
    drawHead();
    drawStep();
  }

  /** Facts to know before a step, one screen on their own, read aloud on request. */
  function learnPane(item) {
    const s = item.learn;
    const all = () => s.learn.map((f) => f.text).join(' ');
    if (getSettings().autoRead) speak(all());
    return h('div.stack',
      h('p.eyebrow', `Learn first · Step ${item.n + 1} of ${steps.length}: ${s.title}`),
      h('div.read-row', h('h2', { tabindex: '-1' }, 'Here\'s what to know'), readButton(all, 'Read these facts aloud')),
      h('ul.learn-facts', s.learn.map((f) => h('li', h('span.learn-icon', { 'aria-hidden': 'true' }, f.icon), h('span', f.text)))),
      h('div.row.step-nav',
        at > 0 && h('button.btn', { type: 'button', onclick: () => { at--; drawStep(); } }, 'Back'),
        h('button.btn.primary', { type: 'button', onclick: () => { at++; drawStep(); } }, 'Got it')));
  }

  function checkPane(item) {
    const c = item.check;
    const answered = answers[CHECKS_KEY][item.key] !== undefined;
    let firstTry = !answered;
    const feedback = h('div.quiz-feedback', { 'aria-live': 'polite' });
    const navBox = h('div', nav(answered || preview));
    const buttons = h('div.quiz-options', c.options.map((text, i) => h('button.quiz-option', {
      type: 'button',
      onclick: (e) => {
        if (i === c.answer) {
          e.currentTarget.classList.add('right');
          if (answers[CHECKS_KEY][item.key] === undefined) { answers[CHECKS_KEY][item.key] = firstTry; markDirty(); }
          fill(feedback, h('p.ok', '✓ ', md(c.why)));
          fill(navBox, nav(true));
          drawDots();
        } else {
          firstTry = false;
          e.currentTarget.classList.add('wrong');
          e.currentTarget.disabled = true;
          fill(feedback, h('p.warn', 'Not quite. Try another one.'));
        }
      },
    }, md(text))));
    if (getSettings().autoRead) speak(`${c.q} ${c.options.map((o, i) => `Choice ${i + 1}: ${o}.`).join(' ')}`);
    return h('div.stack',
      h('p.eyebrow', 'Quick check'),
      h('div.read-row', h('h2.quiz-q', { tabindex: '-1' }, c.q), readButton(() => `${c.q} ${c.options.map((o, i) => `Choice ${i + 1}: ${o}.`).join(' ')}`)),
      buttons, feedback,
      answered && h('p.small.muted', 'You answered this one already.'),
      navBox);
  }

  function finishPane() {
    const total = steps.length;
    const done = doneSteps();
    const stretch = stretchFor(lesson, track);
    const counter = h('span.word-count');
    const area = h('textarea', { rows: 4, value: reflection, readOnly: approved, 'aria-label': 'Your reflection' });
    const showCount = () => { const n = words(area.value); counter.textContent = n >= REFLECT_WORDS ? `✓ ${n} words` : `${n} of ${REFLECT_WORDS} words`; counter.className = `word-count ${n >= REFLECT_WORDS ? 'ok' : ''}`; };
    area.addEventListener('input', () => { reflection = area.value; showCount(); markDirty(); });
    showCount();
    const boxes = stretch.map((g, i) => h('label.check', h('input', {
      type: 'checkbox', checked: i < stretchDone, disabled: approved,
      onchange: (e) => { stretchDone = Math.max(0, Math.min(3, stretchDone + (e.target.checked ? 1 : -1))); markDirty(); },
    }), md(g)));
    return h('div.stack',
      h('h2', { tabindex: '-1' }, 'Finish up'),
      h('div.big-q', h('p.eyebrow', 'Big question'), h('div.read-row', h('p', lesson.bigQuestion), readButton(() => lesson.bigQuestion)), h('p.small.muted', 'Think about it. Your class will talk about it together.')),
      h('label.field.word-field', h('span', h('div.read-row', md(lesson.reflect), readButton(() => lesson.reflect))), area, counter),
      stretch.length > 0 && h('details.hint', { open: stretchDone > 0 }, h('summary', `Done early? Stretch goals (+${XP.stretch} XP each)`), h('p.small.muted', 'Tick the ones you finish. Your teacher can see them.'), h('div.stretches', boxes)),
      !preview && h('p', { class: done === total ? 'ok' : 'warn' }, done === total ? `✓ All ${total} activities done.` : `${done} of ${total} activities done.`),
      !preview && !approved && h('button.btn.primary.big', { type: 'button', onclick: submit }, work && work.status !== 'in_progress' ? 'Submit again' : 'Submit lesson'),
      preview && h('p.muted', 'Students submit from here. Nothing is saved in a teacher preview.'),
      nav(false));
  }

  function drawStep() {
    stopSpeaking();
    if (at > flow.length) at = flow.length;
    if (!reachable(at)) { for (let k = 0; k < flow.length; k++) if (!reachable(k + 1)) { at = k; break; } }
    const n = stepNumberAt(at);
    if (n > furthest) { furthest = n; markDirty(); }
    drawDots();
    const item = flow[at];
    fill(box, at >= flow.length ? finishPane() : item.check ? checkPane(item) : item.learn ? learnPane(item) : stepPane(item));
    box.querySelector('h2')?.focus?.();
    window.scrollTo?.({ top: 0 });
  }

  async function submit() {
    const total = steps.length;
    const done = doneSteps();
    if (words(reflection) < REFLECT_WORDS) { toast(`Write your reflection first: at least ${REFLECT_WORDS} words.`, 'error'); return; }
    if (done < total) {
      const sure = await confirmBox('Some activities are not done', `${done} of ${total} activities are done. Your teacher will see that. Submit anyway?`, 'Submit anyway');
      if (!sure) return;
    }
    clearTimeout(timer);
    timer = null;
    if (saving) await saving.catch(() => {});
    const before = statsFor(me.row);
    const saved = await attempt(() => app.store.submitWork(id, patch()));
    if (!saved) return;
    work = saved;
    dirty = false;
    status.textContent = 'Submitted';
    me = await loadMe();
    celebrate(before, me.stats);
    drawStep();
  }

  function celebrate(before, after) {
    const newBadges = after.badges.filter((b) => !before.badges.includes(b));
    const rankedUp = after.rankIndex > before.rankIndex;
    const nextId = nextLessonFor(me.done);
    modal((close) => h('div.stack.celebrate',
      h('p.eyebrow', 'Lesson submitted'),
      after.xp > before.xp ? h('h2', `+${after.xp - before.xp} XP`) : h('h2', 'Sent to your teacher'),
      rankedUp && h('p.rankup', `You are now a ${after.rank.name}!`),
      newBadges.length > 0 && h('div.stack', h('h3', 'New badge!'), h('div.badges', newBadges.map((b) => badgeChip(b)))),
      h('p.small.muted', 'Your teacher will look at it soon. You can keep going now.'),
      h('div.row.end',
        h('a.btn', { href: '#/', onclick: close }, 'Home'),
        nextId && nextId !== id && h('a.btn.primary', { href: `#/lesson/${nextId}`, onclick: close }, 'Next lesson'),
      ),
    ));
  }

  // Page -------------------------------------------------------------------------------------------
  const head = h('header.lesson-head');
  function drawHead() {
    fill(head, 
      h('div.lesson-title',
        h('p.eyebrow', `Lesson ${lesson.n} of ${LESSONS.length} · ${lesson.periods ? `${lesson.periods} class periods` : `${lesson.mins} minutes`}${track ? ` · ${lesson.tracks[track].label}` : ''}`),
        h('h1', lesson.title),
        standardChips(id, track)),
      h('div.row.lesson-actions',
        status,
        preview && lesson.tracks && h('select', { 'aria-label': 'Project to preview', onchange: (e) => go(`/lesson/${id}/${e.target.value}`) },
          h('option', { value: '', selected: !track }, 'Choose a project'), Object.entries(lesson.tracks).map(([k, t]) => h('option', { value: k, selected: track === k }, t.label))),
        preview && h('button.btn', { type: 'button', onclick: () => {
          for (const s of steps) answers[s.id] = solve(s.activity, ctx);
          drawStep();
          toast('Filled in sample answers.');
        } }, 'Fill in sample answers'),
        isStudent && h('a.btn', { href: '#/' }, 'Home')));
  }
  drawHead();
  drawStep();

  const onHide = () => { if (document.visibilityState === 'hidden' && dirty) persist(); };
  const beforeUnload = (e) => { if (dirty) { persist(); e.preventDefault(); e.returnValue = ''; } };
  document.addEventListener('visibilitychange', onHide);
  window.addEventListener('beforeunload', beforeUnload);
  app.cleanup = async () => {
    document.removeEventListener('visibilitychange', onHide);
    window.removeEventListener('beforeunload', beforeUnload);
    stopSpeaking();
    if (dirty) await persist();
  };

  return h('div.lesson',
    head,
    work?.status === 'returned' && h('div.returned', h('strong', 'Your teacher asked for changes. '), work.grade?.feedback || ''),
    approved && h('div.approved', h('strong', 'Approved! '), work.grade?.feedback || '', work.grade ? ` Score: ${work.grade.total} of ${work.grade.max_total}.` : ''),
    h('div.lesson-body',
      h('details.big-q-top', h('summary', '❓ Big question'), h('div.read-row', h('p', lesson.bigQuestion), readButton(() => lesson.bigQuestion))),
      dots, h('section.card.step-card', box)));
}
