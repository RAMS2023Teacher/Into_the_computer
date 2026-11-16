// Google Classroom: import rosters, make named assignments ahead of time, and send approved grades.
// Only the teacher who deployed the app can use this, because it runs with their Google access.
import { h, fill, clear, toast, attempt, modal, confirmBox } from '../ui.js';
import { app } from '../main.js';
import { LESSONS, getLesson } from '../curriculum/lessons.js';

export function openImport(onDone) {
  modal((close) => {
    const body = h('div.stack', h('p.muted', 'Loading your courses...'));
    (async () => {
      const courses = await attempt(() => app.store.listGoogleCourses());
      clear(body);
      if (!courses) { body.append(h('p', 'Google Classroom could not be reached.')); return; }
      if (!courses.length) { body.append(h('p', 'No active courses found.')); return; }
      const picks = courses.map((c) => ({ c, box: h('input', { type: 'checkbox', checked: !c.linked }) }));
      const results = h('div.stack.tight');
      body.append(
        h('div.stack.tight', picks.map(({ c, box }) => h('label.check', box, h('span', c.name, c.section && h('span.muted', ` ${c.section}`), c.linked && h('span.tag', 'Imported'))))),
        h('p.muted.small', 'Names show as first name and last initial. Importing again adds new students and never removes anyone. Nothing in Classroom changes.'),
        results,
        h('div.row.end',
          h('button.btn', { onclick: close }, 'Close'),
          h('button.btn.primary', {
            onclick: async (e) => {
              const ids = picks.filter((p) => p.box.checked).map((p) => p.c.id);
              if (!ids.length) { toast('Choose at least one course.', 'error'); return; }
              e.target.disabled = true;
              e.target.textContent = 'Importing...';
              const out = await attempt(() => app.store.importCourses(ids));
              e.target.disabled = false;
              e.target.textContent = 'Import';
              if (!out) return;
              fill(results, ...out.map((r) => h('div',
                h('p', h('strong', r.name), ` ${r.added} added, ${r.matched} already here`),
                r.skipped.length > 0 && h('details.hint', h('summary', `${r.skipped.length} not added`), h('ul.small', r.skipped.map((x) => h('li', x)))),
                r.gone > 0 && h('p.warn.small', `${r.gone} on this roster are no longer in Classroom. Remove them on the Roster tab if needed.`))));
              onDone();
            },
          }, 'Import')),
      );
    })();
    return h('div.stack', h('h2', 'Import from Google Classroom'), body);
  });
}

const todayText = () => new Date().toLocaleDateString('en-CA');

export async function classroomTab(cls, reload) {
  const data = await app.store.gradeSyncStatus(cls.id);
  if (!data.linked) {
    return h('section.card.stack', h('h2', 'Not linked to Google Classroom'),
      h('p', 'Import this class from Google Classroom on your Classes page to make assignments and send grades.'),
      h('p.small.muted', 'A class you made by hand can\'t be linked later. Import the Classroom course instead; it brings in the roster.'));
  }
  const status = new Map(data.items.map((i) => [i.lesson_id, i]));
  const picks = [];
  const points = h('input', { type: 'number', min: 1, max: 1000, value: 100, 'aria-label': 'Points for each assignment', style: 'width:6em' });
  const due = h('input', { type: 'date', min: todayText(), 'aria-label': 'Due date (optional)' });
  const publish = h('input', { type: 'checkbox' });
  const create = h('button.btn.primary', { type: 'button' }, 'Create assignments');
  const out = h('div.stack.tight');
  const chosen = () => picks.filter((p) => p.box.checked);
  const drawCreate = () => {
    const n = chosen().length;
    create.disabled = n === 0;
    create.textContent = n ? `Create ${n} assignment${n === 1 ? '' : 's'}` : 'Create assignments';
  };

  const rows = LESSONS.map((l) => {
    const st = status.get(l.id);
    const line = h('div.small.muted', `Lesson ${l.n}${l.periods ? `, ${l.periods} class periods` : ''}`);
    if (st.synced) {
      return h('tr',
        h('td', { 'aria-label': 'In Classroom' }, '✓'),
        h('th', { scope: 'row' }, h('div', st.title), line),
        h('td.num', st.points), h('td', st.due || '—'),
        h('td.num', st.waiting ? h('strong', `${st.waiting} to send`) : st.approved ? 'All sent' : 'None approved yet'),
        h('td', st.link && h('a.small', { href: st.link, target: '_blank', rel: 'noopener noreferrer' }, 'Open ↗')));
    }
    const box = h('input', { type: 'checkbox', checked: true, onchange: drawCreate, 'aria-label': `Choose lesson ${l.n}` });
    const name = h('input', { value: `Into the Computer ${l.n}: ${l.title}`, maxlength: 150, 'aria-label': `Assignment name for lesson ${l.n}`, style: 'width:100%', oninput: () => { box.checked = true; drawCreate(); } });
    picks.push({ lesson: l, box, name });
    return h('tr', h('td', box), h('th', { scope: 'row' }, name, line), h('td.num', ''), h('td', ''), h('td.num', st.approved ? `${st.approved} approved` : ''), h('td', ''));
  });

  create.onclick = async () => {
    const list = chosen();
    if (!list.length) return;
    if (list.some((p) => !p.name.value.trim())) { toast('Every chosen assignment needs a name.', 'error'); return; }
    const sure = await confirmBox(`Create ${list.length} assignment${list.length === 1 ? '' : 's'} in Classroom?`,
      publish.checked ? 'Students will see them right away, and Classroom may notify them.' : 'They are saved as drafts. Students see nothing until you post them in Classroom.', 'Create');
    if (!sure) return;
    create.disabled = true;
    create.textContent = 'Creating...';
    const r = await attempt(() => app.store.createAssignments(cls.id, list.map((p) => ({
      lesson_id: p.lesson.id, title: p.name.value.trim(), points: Number(points.value), due: due.value, description: getLesson(p.lesson.id).hook,
    })), { publish: publish.checked }));
    if (!r) { drawCreate(); return; }
    toast(`Created ${r.created} assignment${r.created === 1 ? '' : 's'} in Classroom.`);
    if (r.skipped.length || r.failed.length) fill(out, ...[...r.skipped, ...r.failed].map((x) => h('p.warn.small', x)));
    else reload();
  };
  drawCreate();

  const waiting = data.items.filter((i) => i.synced).reduce((a, i) => a + i.waiting, 0);
  const sendOut = h('div.stack.tight');
  const send = h('button.btn.primary.big', { type: 'button', disabled: !waiting, onclick: async () => {
    send.disabled = true;
    send.textContent = 'Sending...';
    const r = await attempt(() => app.store.pushGrades(cls.id));
    send.textContent = 'Send grades';
    if (!r) { send.disabled = false; return; }
    toast(`Sent ${r.sent} grade${r.sent === 1 ? '' : 's'} to ${r.assignments} assignment${r.assignments === 1 ? '' : 's'}.`);
    fill(sendOut, ...[...r.skipped, ...r.failed].map((x) => h('p.warn.small', x)));
    if (!r.skipped.length && !r.failed.length) reload();
  } }, waiting ? `Send ${waiting} grade${waiting === 1 ? '' : 's'}` : 'Send grades');

  return h('div.stack',
    h('section.card.stack',
      h('h2', 'Send grades'),
      h('p', 'Sends every approved score that changed, scaled to each assignment\'s points. A score of 9 out of 12 on a 100-point assignment sends 75.'),
      h('div.row', send),
      sendOut,
      h('p.small.muted', 'Students see these grades in Classroom only after you return the work there: select the students and press Return. This app can\'t return work for you.')),
    h('section.card.stack',
      h('h2', 'Assignments'),
      h('div.table-wrap', h('table.board',
        h('thead', h('tr', h('th', { scope: 'col' }, ''), h('th', { scope: 'col' }, 'Assignment name'), h('th.num', { scope: 'col' }, 'Points'), h('th', { scope: 'col' }, 'Due'), h('th.num', { scope: 'col' }, 'Grades'), h('th', { scope: 'col' }, ''))),
        h('tbody', rows))),
      picks.length > 0 && h('div.stack.tight',
        h('div.row', h('label.field.small', h('span', 'Points'), points), h('label.field.small', h('span', 'Due date (optional)'), due)),
        h('label.check', publish, h('span', 'Post them now (leave unticked to save as drafts)')),
        h('div.row', create), out),
      h('p.small.muted', 'Google only lets an app send grades to assignments it made, so make them here, not in Classroom. Each one links back to this app.')),
  );
}
