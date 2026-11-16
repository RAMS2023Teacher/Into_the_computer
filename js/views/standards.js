// The Standards page: each standard's exact text and the lessons that teach it. For a student, also
// where they stand on it. That uses lesson status only, never scores.
import { h } from '../ui.js';
import { app } from '../main.js';
import { getLesson } from '../curriculum/lessons.js';
import { coverage } from '../curriculum/alignment.js';
import { shortCode } from '../curriculum/standards.js';
import { loadMe } from './student.js';

const lessonName = (key) => {
  const [id, track] = key.split(':');
  const l = getLesson(id);
  return `Lesson ${l.n}${track ? ` (${l.tracks[track].label})` : ''}`;
};

export async function viewStandards() {
  const isStudent = app.session.role === 'student';
  const me = isStudent ? await loadMe() : null;
  const rows = coverage().filter((c) => c.anchor.length || c.support.length);
  const doneKey = (key) => {
    if (!me) return false;
    const [id, track] = key.split(':');
    const w = me.row.works.find((x) => x.lesson_id === id);
    return !!w && w.done && (!track || w.track === track);
  };
  return h('div.stack',
    h('div', h('h1', 'Standards'), h('p.muted', 'Massachusetts Digital Literacy and Computer Science standards for grades 6 to 8, quoted from the 2016 framework. ',
      h('strong', 'Assessed'), ' means the lesson makes work your teacher can grade against the standard. ', h('strong', 'Practiced'), ' means you work on it there.')),
    h('div.std-table', rows.map((c) => h('article.card.std-row',
      h('div.row.between', h('h2', shortCode(c.code)), h('span.small.muted', `${c.strand}: ${c.topic}`)),
      h('p', c.text),
      h('p.small', c.anchor.length > 0 && [h('strong', 'Assessed in: '), c.anchor.map((k) => h('span.tag', { class: doneKey(k) ? 'done' : '' }, doneKey(k) ? `✓ ${lessonName(k)}` : lessonName(k)))],
        c.support.length > 0 && [' ', h('strong', 'Practiced in: '), c.support.map((k) => h('span.tag', { class: doneKey(k) ? 'done' : '' }, doneKey(k) ? `✓ ${lessonName(k)}` : lessonName(k)))]),
    ))),
  );
}
