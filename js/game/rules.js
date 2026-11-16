// XP, ranks, and badges. All worked out from what a student turned in, never stored, so changing a
// rule here updates every student. Grades are deliberately NOT an input: everything here is
// visible to classmates, and grades must stay private. Not even approval counts.
import { LESSONS } from '../curriculum/lessons.js';

export const XP = { submit: 50, submitPartial: 25, stretch: 10, award: 25 };

// Named after sizes of data, smallest to biggest. Five lessons with every stretch goal is 400 XP,
// so the top rank needs a badge or two from the teacher.
export const RANKS = [
  { name: 'Bit', xp: 0 },
  { name: 'Nibble', xp: 50 },
  { name: 'Byte', xp: 125 },
  { name: 'Kilobyte', xp: 200 },
  { name: 'Megabyte', xp: 300 },
  { name: 'Gigabyte', xp: 425 },
];

const did = (id) => (r) => r.done.has(id);
export const BADGES = [
  { id: 'power-on', icon: '🔌', name: 'Powered On', desc: 'Finished lesson 1', earned: did('l1') },
  { id: 'case-cracker', icon: '🪛', name: 'Case Cracker', desc: 'Finished lesson 2', earned: did('l2') },
  { id: 'signal', icon: '⚡', name: 'Signal Tracker', desc: 'Finished lesson 3', earned: did('l3') },
  { id: 'binary', icon: '🔢', name: 'Binary Boss', desc: 'Finished lesson 4', earned: did('l4') },
  { id: 'designer', icon: '🛠️', name: 'Computer Designer', desc: 'Turned in a computer design', earned: (r) => r.tracks.has('design') },
  { id: 'historian', icon: '📜', name: 'Computer Historian', desc: 'Turned in a history report', earned: (r) => r.tracks.has('history') },
  { id: 'extra-mile', icon: '🥾', name: 'Extra Mile', desc: 'Finished 3 stretch goals', earned: (r) => r.stretch >= 3 },
  { id: 'all-in', icon: '🏆', name: 'All In', desc: 'Finished all five lessons', earned: (r) => LESSONS.every((l) => r.done.has(l.id)) },
];

/** Badges only a teacher can give, for things the app can't see. */
export const TEACHER_BADGES = [
  { id: 'helper', icon: '🤝', name: 'Helping Hand', desc: 'Helped a classmate' },
  { id: 'fixer', icon: '🔧', name: 'Fix-It Pro', desc: 'Solved a tricky problem' },
  { id: 'curious', icon: '❓', name: 'Great Question', desc: 'Asked a question that made us think' },
  { id: 'teamwork', icon: '🧩', name: 'Team Player', desc: 'Worked well with a partner' },
  { id: 'creative', icon: '✨', name: 'Bright Idea', desc: 'Did something creative and surprising' },
];

export const badgeById = (id) => BADGES.find((b) => b.id === id) || TEACHER_BADGES.find((b) => b.id === id);

/** Turn a student's class-board row into XP, rank, and badges. */
export function statsFor(s) {
  const works = (s && s.works) || [];
  const turnedIn = works.filter((w) => w.done);
  const done = new Set(turnedIn.map((w) => w.lesson_id));
  const tracks = new Set(turnedIn.filter((w) => w.lesson_id === 'l5' && w.track).map((w) => w.track));
  let xp = 0;
  let stretch = 0;
  for (const w of turnedIn) {
    xp += w.all_done ? XP.submit : XP.submitPartial;
    const n = Math.min(w.stretch_done || 0, 3);
    xp += n * XP.stretch;
    stretch += n;
  }
  const awards = (s && s.awards) || [];
  xp += awards.length * XP.award;
  const record = { done, tracks, stretch };
  const earned = BADGES.filter((b) => b.earned(record)).map((b) => b.id);
  let rankIndex = 0;
  RANKS.forEach((r, i) => { if (xp >= r.xp) rankIndex = i; });
  const rank = RANKS[rankIndex];
  const next = RANKS[rankIndex + 1] || null;
  return {
    xp, rank, rankIndex, next, done, stretch,
    badges: [...new Set([...earned, ...awards.map((a) => a.badge_id)])],
    toNext: next ? (xp - rank.xp) / (next.xp - rank.xp) : 1,
  };
}

/** Recent wins across a class, newest first: badges and ranks, replayed in the order work came in. */
export function recentAchievements(board, days = 7) {
  const cutoff = Date.now() - days * 86400000;
  const events = [];
  for (const s of board) {
    const add = (when, icon, text) => {
      const time = Date.parse(when);
      if (time >= cutoff) events.push({ student_id: s.id, name: s.display_name, avatar: s.avatar, time, icon, text });
    };
    const turnedIn = (s.works || []).filter((w) => w.done && w.submitted_at).sort((a, b) => a.submitted_at.localeCompare(b.submitted_at));
    let before = statsFor({ works: [], awards: [] });
    turnedIn.forEach((w, i) => {
      const now = statsFor({ works: turnedIn.slice(0, i + 1), awards: [] });
      for (const id of now.badges.filter((b) => !before.badges.includes(b))) add(w.submitted_at, badgeById(id).icon, `earned ${badgeById(id).name}`);
      if (now.rankIndex > before.rankIndex) add(w.submitted_at, '⬆️', `reached ${now.rank.name}`);
      before = now;
    });
    for (const a of s.awards || []) if (a.created_at && badgeById(a.badge_id)) add(a.created_at, badgeById(a.badge_id).icon, `earned ${badgeById(a.badge_id).name}`);
  }
  return events.sort((a, b) => b.time - a.time);
}

/** The lesson a student should do next: the first one not turned in. Null when all are done. */
export function nextLessonFor(done) {
  const l = LESSONS.find((x) => !done.has(x.id));
  return l ? l.id : null;
}
/** A student may open a lesson they have turned in, or the next one. */
export const canOpen = (lessonId, done) => done.has(lessonId) || nextLessonFor(done) === lessonId;
