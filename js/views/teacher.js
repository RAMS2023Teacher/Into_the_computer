// Teacher screens: classes, a class's progress, gradebook, roster, and the lesson list.
import { h, fill, clear, toast, attempt, modal, confirmBox, download, md } from '../ui.js';
import { app, go, render } from '../main.js';
import { LESSONS, stepsFor, getLesson } from '../curriculum/lessons.js';
import { statsFor, TEACHER_BADGES, badgeById } from '../game/rules.js';
import { avatarURL, defaultAvatar } from '../game/avatar.js';
import { openImport, classroomTab } from './classroom.js';
import { standardChips } from './lesson.js';
import { badgeChip } from './student.js';

export async function viewTeacherHome() {
  const classes = await app.store.listClasses();
  const name = h('input', { required: true, maxlength: 80, placeholder: 'Period 3', 'aria-label': 'New class name' });
  const owner = app.session.is_owner;
  return h('div.stack',
    h('div.row.between', h('h1', 'Your classes'), owner && h('button.btn', { onclick: () => openImport(render) }, 'Import from Google Classroom')),
    classes.length
      ? h('div.class-grid', classes.map((c) => h('a.card.class-card', { href: `#/class/${c.id}` }, h('h2', c.name), c.linked && h('p.small.muted', 'Linked to Google Classroom'))))
      : h('p.muted', 'No classes yet. Import one from Google Classroom, or make one below.'),
    h('form.card.row.add-class', {
      onsubmit: async (e) => {
        e.preventDefault();
        const c = await attempt(() => app.store.createClass(name.value.trim()));
        if (c) go(`/class/${c.id}`);
      },
    }, name, h('button.btn.primary', { type: 'submit' }, 'Create class')),
    h('section.card.stack',
      h('h2', 'How it works'),
      h('ol.howto',
        h('li', 'Import a class from Google Classroom, or make one and paste in names and school emails.'),
        h('li', 'Share this page\'s link with students. Their school Google account signs them in.'),
        h('li', 'Students work through five lessons, one step at a time. They keep going after they submit.'),
        h('li', 'Submitted work lands in your review queue. Score the rubric, write feedback, and approve it or send it back.'),
        h('li', 'Make assignments in Classroom ahead of time, then send all approved grades with one button.'),
        h('li', 'Press "Project this class" for a display to put on the board. It never shows scores.')),
    ),
  );
}

const STATUS_TEXT = { in_progress: 'Working', submitted: 'To review', approved: 'Approved', returned: 'Sent back' };

/** One cell of the progress grid: where a student is in one lesson. */
function progressCell(w, lesson) {
  if (!w) return h('td.cell.none', '');
  const steps = stepsFor(lesson, w.track).length;
  if (w.status === 'in_progress') return h('td.cell.working', { title: `Working: step ${Math.min(w.step_at + 1, steps)} of ${steps}` }, `${Math.min(w.step_at + 1, steps)}/${steps}`);
  const label = w.grade ? `${w.grade.total}/${w.grade.max_total}` : '●';
  return h('td.cell', { class: w.status, title: `${STATUS_TEXT[w.status]}${w.track ? ` (${lesson.tracks[w.track].label})` : ''}` },
    h('a', { href: `#/review/${w.id}`, 'aria-label': `${lesson.title}: ${STATUS_TEXT[w.status]}` }, w.track === 'design' ? '🛠️ ' : w.track === 'history' ? '📜 ' : '', label));
}

function legend() {
  return h('div.legend',
    h('span', h('i.key.working'), 'Working (step reached)'), h('span', h('i.key.submitted'), 'To review'), h('span', h('i.key.approved'), 'Approved'), h('span', h('i.key.returned'), 'Sent back'),
    h('span.muted', '🛠️ design project · 📜 history report'));
}

function progressTab(cls, students, board, works) {
  const byKey = new Map(works.map((w) => [`${w.student_id}:${w.lesson_id}`, w]));
  const statsById = new Map(board.map((b) => [b.id, { stats: statsFor(b), row: b }]));
  const queue = works.filter((w) => w.status === 'submitted').sort((a, b) => (a.submitted_at || '').localeCompare(b.submitted_at || ''));
  const nameOf = new Map(students.map((s) => [s.id, s.display_name]));
  return h('div.stack',
    h('section.card.stack',
      h('div.row.between', h('h2', `Waiting for review (${queue.length})`), queue.length > 0 && h('a.btn.primary', { href: `#/review/${queue[0].id}` }, 'Start reviewing')),
      queue.length ? h('ul.queue', queue.slice(0, 10).map((w) => h('li', h('a', { href: `#/review/${w.id}` }, h('strong', nameOf.get(w.student_id)), ` · Lesson ${getLesson(w.lesson_id).n}: ${getLesson(w.lesson_id).title}`, w.all_done ? '' : h('span.warn', ` · ${w.done_count} of ${w.done_total} activities`))))) : h('p.muted', 'All caught up.'),
    ),
    legend(),
    students.length === 0 ? h('p.muted', 'No students yet. Add them on the Roster tab.') : h('div.table-wrap', h('table.gradebook',
      h('thead', h('tr', h('th.sticky', { scope: 'col' }, 'Student'), LESSONS.map((l) => h('th', { scope: 'col', title: l.title }, `L${l.n}`)), h('th', { scope: 'col' }, 'Rank'), h('th', { scope: 'col' }, 'Badges'), h('th', { scope: 'col' }, ''))),
      h('tbody', students.map((s) => {
        const info = statsById.get(s.id) || { stats: statsFor({}), row: { awards: [] } };
        return h('tr',
          h('th.sticky.person', { scope: 'row' }, h('img', { src: avatarURL(s.avatar || defaultAvatar(s.id), 2), alt: '' }), s.display_name),
          LESSONS.map((l) => progressCell(byKey.get(`${s.id}:${l.id}`), l)),
          h('td', `${info.stats.rank.name} · ${info.stats.xp} XP`),
          h('td', h('div.badges.small-badges', info.stats.badges.map((id) => badgeChip(id)))),
          h('td', h('button.btn.small', { onclick: () => awardDialog(s, info.row.awards || []) }, 'Give badge')));
      })),
    )),
  );
}

function awardDialog(student, awards) {
  modal((close) => {
    let chosen = TEACHER_BADGES[0].id;
    const list = h('div.badge-pick');
    const note = h('input', { maxlength: 140, placeholder: 'Optional note. Classmates can see this.', 'aria-label': 'Note' });
    const draw = () => fill(list, ...TEACHER_BADGES.map((b) => h('button.badge', { type: 'button', 'aria-pressed': chosen === b.id ? 'true' : 'false', onclick: () => { chosen = b.id; draw(); } }, h('span.badge-icon', b.icon), h('span', b.name), h('small', b.desc))));
    draw();
    const given = awards.filter((a) => badgeById(a.badge_id));
    return h('div.stack', h('h2', `Give ${student.display_name} a badge`), list, note,
      h('p.small.muted', 'A badge adds 25 XP. Badges never come from grades.'),
      given.length > 0 && h('div.stack.tight', h('h3', 'Already given'), given.map((a) => h('div.row', badgeChip(a.badge_id), a.note && h('span.small', a.note),
        h('button.btn.small', { onclick: async () => { if (await attempt(async () => { await app.store.removeAward(student.id, a.badge_id); return true; })) { toast('Badge removed.'); close(); render(); } } }, 'Remove')))),
      h('div.row.end', h('button.btn', { onclick: close }, 'Cancel'), h('button.btn.primary', {
        onclick: async () => { if (await attempt(async () => { await app.store.giveAward(student.id, chosen, note.value.trim()); return true; })) { toast('Badge given! +25 XP.'); close(); render(); } },
      }, 'Give badge')));
  });
}

const csv = (v) => `"${String(v ?? '').replace(/"/g, '""').replace(/^([=+\-@])/, "'$1")}"`;

function gradesTab(cls, students, works) {
  const byKey = new Map(works.map((w) => [`${w.student_id}:${w.lesson_id}`, w]));
  const exportCsv = () => {
    const header = ['Student', ...LESSONS.flatMap((l) => [`L${l.n} status`, `L${l.n} score`]), 'Total score', 'Total possible'];
    const rows = students.map((s) => {
      const mine = LESSONS.map((l) => byKey.get(`${s.id}:${l.id}`));
      const graded = mine.filter((w) => w?.grade);
      return [s.display_name, ...mine.flatMap((w) => [w ? STATUS_TEXT[w.status] : '', w?.grade ? w.grade.total : '']),
        graded.reduce((a, w) => a + w.grade.total, 0), graded.reduce((a, w) => a + w.grade.max_total, 0)];
    });
    download(`${cls.name}-grades.csv`, [header, ...rows].map((r) => r.map(csv).join(',')).join('\n'), 'text/csv');
  };
  return h('div.stack',
    h('div.row.between', h('p.muted', 'Scores are out of 12: three rubric rows, 1 to 4 each. Only you and each student see them.'), h('button.btn', { onclick: exportCsv }, 'Export CSV')),
    legend(),
    h('div.table-wrap', h('table.gradebook',
      h('thead', h('tr', h('th.sticky', { scope: 'col' }, 'Student'), LESSONS.map((l) => h('th', { scope: 'col' }, `L${l.n}`, h('small', l.title))))),
      h('tbody', students.map((s) => h('tr', h('th.sticky.person', { scope: 'row' }, s.display_name), LESSONS.map((l) => progressCell(byKey.get(`${s.id}:${l.id}`), l))))))),
  );
}

function rosterTab(cls, students) {
  const names = h('textarea', { rows: 5, placeholder: 'One student per line: name, then school email.\nAri M, ari@yourschool.org\nBea T, bea@yourschool.org', 'aria-label': 'Student names and school emails' });
  return h('div.stack',
    h('form.card.stack', {
      onsubmit: async (e) => {
        e.preventDefault();
        const list = names.value.split('\n').map((x) => x.trim()).filter(Boolean);
        if (!list.length) return;
        const rows = await attempt(() => app.store.addStudents(cls.id, list));
        if (rows) { toast(`Added ${rows.length} student${rows.length === 1 ? '' : 's'}.`); render(); }
      },
    }, h('h2', 'Add students'), names, h('p.muted.small', 'Use first name and last initial. Classmates see names, never emails.'), h('button.btn.primary', { type: 'submit' }, 'Add students')),
    students.length > 0 && h('div.table-wrap', h('table.board',
      h('thead', h('tr', h('th', { scope: 'col' }, 'Student'), h('th', { scope: 'col' }, 'School email'), h('th', { scope: 'col' }, ''))),
      h('tbody', students.map((s) => h('tr',
        h('td.person', h('img', { src: avatarURL(s.avatar || defaultAvatar(s.id), 2), alt: '' }), s.display_name, s.from_classroom && h('span.tag', 'Classroom')),
        h('td.mono', s.email),
        h('td.row.tight-row',
          h('button.btn.small', { onclick: async () => {
            const next = prompt(`New name for ${s.display_name}:`, s.display_name);
            if (next && next.trim() && next.trim() !== s.display_name && await attempt(async () => { await app.store.renameStudent(s.id, next.trim()); return true; })) render();
          } }, 'Rename'),
          h('button.btn.small', { onclick: async () => {
            if (await confirmBox('Remove this student?', `This permanently deletes ${s.display_name}'s work and grades. It cannot be undone.`, 'Delete student', true)) {
              if (await attempt(async () => { await app.store.removeStudent(s.id); return true; })) render();
            }
          } }, 'Remove'))))))),
    h('section.stack.danger-zone', h('div.row',
      h('button.btn.small', { onclick: async () => {
        const next = prompt('New class name:', cls.name);
        if (next && next.trim() && await attempt(async () => { await app.store.renameClass(cls.id, next.trim()); return true; })) render();
      } }, 'Rename class'),
      h('button.btn.small', { onclick: async () => {
        if (await confirmBox('Delete this class?', `This permanently deletes "${cls.name}" with all its students, work, and grades.`, 'Delete class', true)) {
          if (await attempt(async () => { await app.store.deleteClass(cls.id); return true; })) go('/');
        }
      } }, 'Delete class'))),
  );
}

export async function viewClass(main, classId, tabParam) {
  const tab = tabParam || 'progress';
  // Asked for together, so they travel to the server as one trip.
  const [cls, students, board, works] = await Promise.all([app.store.getClass(classId), app.store.listStudents(classId), app.store.classBoard(classId), app.store.classWork(classId)]);
  const waiting = works.filter((w) => w.status === 'submitted').length;
  const link = (id, label) => h('a.tab', { href: `#/class/${classId}/${id}`, role: 'tab', 'aria-selected': tab === id ? 'true' : 'false' }, label);
  const content = tab === 'roster' ? rosterTab(cls, students)
    : tab === 'grades' ? gradesTab(cls, students, works)
      : tab === 'classroom' ? await classroomTab(cls, render)
        : progressTab(cls, students, board, works);
  return h('div.stack',
    h('div.row.between', h('div', h('p.eyebrow', h('a', { href: '#/' }, 'Classes')), h('h1', cls.name)), h('a.btn.primary', { href: `#/display/${classId}` }, 'Project this class')),
    h('div.tabs', { role: 'tablist' }, link('progress', waiting ? `Progress (${waiting} to review)` : 'Progress'), link('grades', 'Gradebook'), link('roster', `Roster (${students.length})`), app.session.is_owner && link('classroom', 'Google Classroom')),
    content,
  );
}

export async function viewLessons() {
  return h('div.stack',
    h('div', h('h1', 'Lessons'), h('p.muted', 'Open a lesson to try it as a student would. Nothing is saved. "Fill in sample answers" shows every activity finished.')),
    h('div.lesson-list', LESSONS.map((l) => h('article.card.lesson-row',
      h('div.row.between', h('h2', `${l.n}. ${l.title}`), h('span.muted', l.periods ? `${l.periods} class periods` : `${l.mins} minutes`)),
      md(l.hook),
      h('p', h('strong', 'Big question: '), l.bigQuestion),
      standardChips(l.id),
      l.tracks
        ? h('div.row', Object.entries(l.tracks).map(([k, t]) => h('a.btn', { href: `#/lesson/${l.id}/${k}` }, `Try: ${t.label}`)))
        : h('details', h('summary', `${l.steps.length} steps`), h('ol.small', l.steps.map((s) => h('li', `${s.title} (${s.mins} min)`)))),
      !l.tracks && h('a.btn', { href: `#/lesson/${l.id}` }, 'Try it')))),
  );
}
