// Reviewing one student's lesson: their answers step by step, first-try check results, the
// reflection, and the rubric. Scores and feedback are private to the student.
import { h, fill, clear, toast, attempt, confirmBox, md } from '../ui.js';
import { app } from '../main.js';
import { getLesson, stepsFor, checksFor, rubricFor, stretchFor } from '../curriculum/lessons.js';
import { alignmentFor, standardByCode } from '../curriculum/alignment.js';
import { shortCode } from '../curriculum/standards.js';
import { isDone, summaryOf } from '../activities/logic.js';
import { specSheet } from '../activities/ui.js';

export function standardsBlock(lessonId, track) {
  const a = alignmentFor(lessonId, track);
  const row = (c) => h('li', h('strong', shortCode(c)), ' ', standardByCode(c).text);
  return h('details.std-block', { open: true },
    h('summary', 'MA DLCS standards'),
    a.anchor.length > 0 && h('div', h('h3', 'Assess here'), h('ul.std-list', a.anchor.map(row))),
    a.support.length > 0 && h('div', h('h3', 'Practiced here'), h('ul.std-list', a.support.map(row))),
    a.evidence && h('p.small', h('strong', 'Evidence: '), a.evidence));
}

export async function viewReview(main, workId) {
  const w = await app.store.getWorkFull(workId);
  if (!w) throw new Error('That work was not found.');
  const lesson = getLesson(w.lesson_id);
  const works = await app.store.classWork(w.student.class_id);
  const queue = works.filter((x) => x.status === 'submitted' && x.id !== w.id).sort((a, b) => (a.submitted_at || '').localeCompare(b.submitted_at || ''));
  const back = `#/class/${w.student.class_id}`;
  const nextHref = queue[0] ? `#/review/${queue[0].id}` : back;

  const answers = w.answers || {};
  const ctx = { answers };
  const steps = stepsFor(lesson, w.track);
  const checks = checksFor(lesson, w.track);
  const firstTry = answers._checks || {};
  const rubric = rubricFor(lesson, w.track);
  const scores = { ...(w.grade?.scores || {}) };
  const feedback = h('textarea', { rows: 4, value: w.grade?.feedback || '', 'aria-label': 'Feedback', placeholder: 'Name one thing that went well, and one thing to try next.' });
  const max = rubric.length * 4;
  const total = () => rubric.reduce((a, r) => a + (scores[r.id] || 0), 0);
  const totalEl = h('strong');
  const showTotal = () => { totalEl.textContent = `${total()} of ${max}`; };
  const rubricRows = rubric.map((r) => {
    const row = h('div.levels', { role: 'radiogroup', 'aria-label': r.label });
    const draw = () => fill(row, ...r.levels.map((label, i) => h('button.level', {
      type: 'button', role: 'radio', 'aria-checked': scores[r.id] === i + 1 ? 'true' : 'false',
      onclick: () => { scores[r.id] = i + 1; draw(); showTotal(); },
    }, h('b', i + 1), h('span', label))));
    draw();
    return h('div.stack.tight', h('h3', r.label), row);
  });
  showTotal();

  const finish = async (status) => {
    if (status === 'approved' && rubric.some((r) => !scores[r.id])) { toast('Score each row of the rubric first.', 'error'); return; }
    const ok = await attempt(async () => { await app.store.saveGrade(w.id, { scores, feedback: feedback.value.trim(), status }); return true; });
    if (ok) { toast(status === 'approved' ? 'Approved.' : 'Sent back with your feedback. The student can keep going.'); location.hash = nextHref; }
  };

  const stepList = h('ol.review-steps', steps.map((s) => {
    const ok = isDone(s.activity, answers[s.id], ctx);
    const own = checks.map((c, i) => ({ c, key: `${c.after}-${i}` })).filter((x) => x.c.after === s.id);
    return h('li', { class: ok ? 'ok' : 'warn' },
      h('div.row.between', h('strong', `${ok ? '✓' : '✗'} ${s.title}`), s.day && h('span.small.muted', `Day ${s.day}`)),
      answers[s.id] ? h('ul.small.answer-lines', summaryOf(s.activity, answers[s.id], ctx).map((line) => h('li', line))) : h('p.small.muted', 'Not started'),
      own.map(({ c, key }) => h('p.small.check-line', firstTry[key] === true ? '✓ ' : firstTry[key] === false ? '✗ ' : '· ', `Check: "${c.q}" `, h('em', firstTry[key] === true ? 'right on the first try' : firstTry[key] === false ? 'took more than one try' : 'not answered'))));
  }));
  const stretch = stretchFor(lesson, w.track);

  const page = h('div.review',
    h('div.row.between',
      h('div', h('p.eyebrow', h('a', { href: back }, 'Class')), h('h1', `${w.student.display_name}: ${lesson.title}`),
        h('p.muted', w.track ? `${lesson.tracks[w.track].label} · ` : '', `Status: ${w.status.replace('_', ' ')}`, w.submitted_at ? ` · Submitted ${new Date(w.submitted_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}` : '')),
      h('p', h('a.btn', { href: nextHref }, queue[0] ? `Next to review (${queue.length} left)` : 'Back to class'))),
    h('div.review-grid',
      h('section.stack',
        h('div.row.summary-chips',
          h('span.tag', `${w.done_count} of ${w.done_total} activities done`),
          h('span.tag', w.quiz_total ? `Checks right on the first try: ${w.quiz_right} of ${w.quiz_total}` : 'Checks not all answered'),
          h('span.tag', `Stretch goals: ${w.stretch_done} of ${stretch.length}`)),
        w.track === 'design' && h('section.card.stack', h('h2', 'The design'), specSheet(answers)),
        h('section.card.stack', h('h2', 'Step by step'), stepList),
        h('section.card.stack', h('h2', 'Reflection'), md(lesson.reflect), w.reflection ? h('blockquote', w.reflection) : h('p.muted', 'No reflection written.')),
        stretch.length > 0 && h('section.card.stack', h('h2', 'Stretch goals'), h('p.small.muted', 'Students tick the ones they finished. Look for the work in their answers or ask them.'), h('ol.small', stretch.map((g, i) => h('li', { class: i < w.stretch_done ? 'ok' : 'muted' }, g)))),
      ),
      h('section.card.stack.rubric',
        h('h2', 'Rubric'),
        standardsBlock(w.lesson_id, w.track),
        rubricRows,
        h('p', 'Total: ', totalEl),
        h('label.field', h('span', 'Feedback for the student (only they see it)'), feedback),
        h('div.row',
          h('button.btn.primary', { onclick: () => finish('approved') }, 'Approve'),
          h('button.btn', { onclick: () => finish('returned') }, 'Send back for changes')),
        w.status === 'approved' && h('button.btn.small', { onclick: async () => {
          if (!(await confirmBox('Reopen this lesson?', 'The student will be able to change it and submit again. The score stays until you grade it again.', 'Reopen'))) return;
          if (await attempt(async () => { await app.store.reopenWork(w.id); return true; })) { toast('Reopened.'); location.hash = back; }
        } }, 'Reopen so the student can change it'),
        h('p.small.muted', 'Approved work is locked. Sending it back lets the student change it, and they keep moving either way.'))));
  return page;
}
