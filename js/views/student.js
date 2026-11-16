// Student screens: home, the class, and the character maker.
import { h, fill, clear, toast, attempt, modal } from '../ui.js';
import { readButton } from '../settings.js';
import { app, refreshSession } from '../main.js';
import { LESSONS, getLesson } from '../curriculum/lessons.js';
import { statsFor, RANKS, BADGES, TEACHER_BADGES, badgeById, nextLessonFor, XP } from '../game/rules.js';
import { SLOTS, avatarURL, defaultAvatar, isUnlocked, unlockLabel, unlockables, rarityOf, RARITY_NAMES, titleOf, auraColor } from '../game/avatar.js';

// Which unlocked items this student has already seen, so new ones can be celebrated once.
// Kept in this browser only; if storage is blocked, there is simply no celebration.
const seenKey = (id) => `intothecomputer.seen.${id}`;
function readSeen(id) { try { const v = localStorage.getItem(seenKey(id)); return v ? new Set(JSON.parse(v)) : null; } catch (_) { return null; } }
function writeSeen(id, keys) { try { localStorage.setItem(seenKey(id), JSON.stringify([...keys])); } catch (_) { /* fine */ } }
export function freshUnlocks(student, stats) {
  const seen = readSeen(student.id);
  if (!seen) return [];
  return unlockables().filter((u) => isUnlocked(u.unlock, stats) && !seen.has(u.key));
}

/** The sign-in ended while the page was open. */
export class SessionEnded extends Error {}

/** Everything a student screen needs, asked for at once so it travels as one trip. */
export async function loadMe() {
  const known = app.session?.class?.id;
  const [, works, knownBoard] = await Promise.all([refreshSession(), app.store.myWorks(), known ? app.store.classBoard(known) : null]);
  if (app.session?.role !== 'student') throw new SessionEnded();
  const { student, class: cls } = app.session;
  const board = known === cls.id ? knownBoard : await app.store.classBoard(cls.id);
  const row = board.find((b) => b.id === student.id) || { works: [], awards: [] };
  const stats = statsFor(row);
  return { student, cls, works, board, row, done: stats.done, stats };
}

export function xpBar(stats) {
  return h('div.xpbar', { role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': Math.round(stats.toNext * 100), 'aria-label': 'Progress to next rank' },
    h('div.xpfill', { style: `width:${Math.round(stats.toNext * 100)}%` }));
}

export function badgeChip(id, note) {
  const b = badgeById(id);
  if (!b) return null;
  return h('div.badge', { title: note ? `${b.desc}. ${note}` : b.desc }, h('span.badge-icon', b.icon), h('span', b.name));
}

/** The five lessons as a row of stops, for home and for the class page. */
export function unitPath(done, current, onClick) {
  return h('ol.unit-path', LESSONS.map((l) => {
    const state = done.has(l.id) ? 'done' : l.id === current ? 'current' : 'later';
    const inner = [h('span.unit-num', state === 'done' ? '✓' : l.n), h('span.unit-name', l.title)];
    return h('li', { class: state }, onClick && state !== 'later' ? h('a', { href: `#/lesson/${l.id}` }, inner) : h('span', inner));
  }));
}

export async function viewHome() {
  const me = await loadMe();
  const { student, works, stats, done, row } = me;
  const nextId = nextLessonFor(done);
  const next = nextId && getLesson(nextId);
  const working = next && works.find((w) => w.lesson_id === nextId);
  const feedback = works.filter((w) => w.grade && w.grade.feedback).sort((a, b) => (b.grade.graded_at || '').localeCompare(a.grade.graded_at || '')).slice(0, 3);
  const returned = works.filter((w) => w.status === 'returned');
  const fresh = freshUnlocks(student, stats);

  const nextCard = next
    ? h('section.card.next',
      h('p.eyebrow', `Lesson ${next.n} of ${LESSONS.length} · ${next.periods ? `${next.periods} class periods` : `about ${next.mins} minutes`}`),
      h('h2', next.title),
      h('div.read-row', h('p', next.hook), readButton(() => `${next.title}. ${next.hook}`)),
      h('a.btn.primary.big', { href: `#/lesson/${nextId}` }, working ? 'Keep going' : 'Start lesson'))
    : h('section.card.next', h('p.eyebrow', 'Unit complete'), h('h2', 'You finished Into the Computer!'), h('p', 'You can open any lesson again to look back at your work.'));

  return h('div.home',
    h('section.card.hero-card',
      h('img.avatar-big', { src: avatarURL(student.avatar || defaultAvatar(student.id), 8), alt: 'Your character' }),
      h('div.hero-info',
        h('h1', student.display_name),
        titleOf(student.avatar) && h('p.char-title', titleOf(student.avatar)),
        h('p.rank', stats.rank.name, h('span.xp', `${stats.xp} XP`)),
        xpBar(stats),
        h('p.muted.small', stats.next ? `${stats.next.xp - stats.xp} XP until ${stats.next.name}` : 'Top rank!'),
        fresh.length > 0
          ? h('a.btn.primary.new-gear', { href: '#/character' }, `🎁 ${fresh.length} new item${fresh.length === 1 ? '' : 's'} to try`)
          : h('a.btn', { href: '#/character' }, 'Customize'),
      ),
    ),
    nextCard,
    h('section.card.stack', h('h2', 'Your path'), unitPath(done, nextId, true)),
    returned.length > 0 && h('section.card.stack.alert', h('h2', 'Your teacher asked for changes'), returned.map((w) => h('a.row.linkrow', { href: `#/lesson/${w.lesson_id}` }, h('strong', getLesson(w.lesson_id).title), h('span', w.grade?.feedback || 'Open it to see what to fix.')))),
    h('section.card.stack',
      h('h2', 'Badges'),
      stats.badges.length ? h('div.badges', stats.badges.map((id) => badgeChip(id, row.awards?.find((a) => a.badge_id === id)?.note))) : h('p.muted', 'Finish your first lesson to earn your first badge.'),
    ),
    feedback.length > 0 && h('section.card.stack', h('h2', 'From your teacher'), h('p.muted.small', 'Only you and your teacher can see this.'),
      feedback.map((w) => h('div.feedback', h('strong', getLesson(w.lesson_id).title), h('p', w.grade.feedback), h('p.muted.small', `Score: ${w.grade.total} of ${w.grade.max_total}`)))),
  );
}

/** Classmates: characters, ranks, badges, and where each person is. Never grades. */
export async function viewClassmates() {
  const me = await loadMe();
  const rows = me.board.map((s) => ({ s, stats: statsFor(s) }));
  return h('div.stack',
    h('div', h('h1', me.cls.name), h('p.muted', 'Everyone in your class, with their rank and badges.')),
    h('div.classmates', rows.map(({ s, stats }) => {
      const nextId = nextLessonFor(stats.done);
      return h('article.card.mate', { class: s.id === me.student.id ? 'me' : '' },
        h('img', { src: avatarURL(s.avatar || defaultAvatar(s.id), 5), alt: '' }),
        h('h2', s.display_name),
        titleOf(s.avatar) && h('p.char-title', titleOf(s.avatar)),
        h('p.rank', stats.rank.name, h('span.xp', `${stats.xp} XP`)),
        h('p.small.muted', nextId ? `On lesson ${getLesson(nextId).n}: ${getLesson(nextId).title}` : 'Finished the unit!'),
        stats.badges.length > 0 && h('div.badges.small-badges', stats.badges.map((id) => badgeChip(id, s.awards?.find((a) => a.badge_id === id)?.note))));
    })),
  );
}

export async function viewCharacter() {
  const me = await loadMe();
  const { student, stats } = me;
  const av = { ...defaultAvatar(student.id), ...(student.avatar || {}) };
  const badgeName = (id) => badgeById(id)?.name || id;
  const all = unlockables();
  const owned = all.filter((u) => isUnlocked(u.unlock, stats));

  // New since last visit: celebrated once, then tagged NEW until tried.
  const seen = readSeen(student.id);
  const fresh = new Set(seen ? owned.filter((u) => !seen.has(u.key)).map((u) => u.key) : []);
  writeSeen(student.id, owned.map((u) => u.key));

  const howToUnlock = (unlock) => {
    if (unlock.xp !== undefined) return `${Math.max(0, unlock.xp - stats.xp)} more XP`;
    const b = badgeById(unlock.badge);
    return b ? `the ${b.name} badge: ${b.desc.toLowerCase()}` : 'a badge';
  };

  const preview = h('img.avatar-big', { alt: 'Your character' });
  const stage = h('div.char-stage', preview, h('span.char-burst', { 'aria-hidden': 'true' }));
  const titleLine = h('p.char-title');
  const updatePreview = () => {
    preview.src = avatarURL(av, 10);
    const glow = auraColor(av);
    stage.className = `char-stage ${glow ? 'glowing' : ''}`;
    stage.style.setProperty('--aura', glow || '#ffffff');
    titleLine.textContent = titleOf(av);
  };
  const save = h('button.btn.primary', {
    onclick: async () => {
      const ok = await attempt(() => app.store.updateProfile({ avatar: { ...av } }));
      if (ok) {
        stage.classList.remove('saved');
        void stage.offsetWidth;
        stage.classList.add('saved');
        await refreshSession();
        toast('Saved! Your classmates can see your new look.');
      }
    },
  }, 'Save my character');

  const xpNext = all.filter((u) => u.unlock.xp !== undefined && !isUnlocked(u.unlock, stats)).sort((a, b) => a.unlock.xp - b.unlock.xp).slice(0, 3);
  const badgeNext = all.filter((u) => u.unlock.badge && !stats.badges.includes(u.unlock.badge)).slice(0, 4);
  const nextCard = h('section.card.stack.char-next',
    h('h2', 'Next unlocks'),
    xpNext.length ? h('ul.next-list', xpNext.map((u) => h('li', { class: `r-${rarityOf(u.unlock)}` },
      h('div.row.between', h('strong', u.name), h('span.rarity', RARITY_NAMES[rarityOf(u.unlock)])),
      h('div.xpbar', h('div.xpfill', { style: `width:${Math.min(100, Math.round((stats.xp / u.unlock.xp) * 100))}%` })),
      h('span.small.muted', `${u.unlock.xp - stats.xp} XP to go`)))) : h('p.muted', 'You have every XP unlock!'),
    badgeNext.length > 0 && h('h3', 'Earn a badge to unlock'),
    badgeNext.length > 0 && h('ul.next-list', badgeNext.map((u) => {
      const b = badgeById(u.unlock.badge);
      return h('li', h('strong', `${b.icon} ${u.name}`), h('span.small', ` ${b.name}: ${b.desc}.`));
    })),
  );

  const paneBox = h('div.stack');
  function drawPanes() {
    fill(paneBox, ...Object.entries(SLOTS).map(([slot, def]) => {
      const box = h('div.options');
      if (def.swatches) {
        (def.order || def.swatches.map((_, i) => i)).forEach((i) => {
          const color = def.swatches[i];
          const lock = def.locks && def.locks[i];
          const open = isUnlocked(lock, stats);
          const isNew = fresh.has(`${slot}:${i}`);
          box.append(h('button.swatch', {
            style: `background:${color}`, class: `${open ? '' : 'locked'} ${isNew ? 'new' : ''}`, 'aria-pressed': av[slot] === i ? 'true' : 'false',
            'aria-label': `${def.label} ${i + 1}${open ? '' : ' (locked)'}`,
            title: open ? '' : `Unlocks at ${unlockLabel(lock, badgeName)}`,
            onclick: () => {
              if (!open) { toast(`🔒 Unlock this with ${howToUnlock(lock)}.`); return; }
              av[slot] = i; fresh.delete(`${slot}:${i}`); updatePreview(); drawPanes();
            },
          }, open ? '' : '🔒'));
        });
      } else {
        Object.entries(def.items).forEach(([id, item]) => {
          const open = isUnlocked(item.unlock, stats);
          const rarity = rarityOf(item.unlock);
          const isNew = fresh.has(`${slot}:${id}`);
          box.append(h('button.item', {
            class: `r-${rarity} ${open ? '' : 'locked'} ${isNew ? 'new' : ''}`, 'aria-pressed': av[slot] === id ? 'true' : 'false',
            'aria-label': `${item.name}${rarity === 'common' ? '' : `, ${RARITY_NAMES[rarity]}`}${open ? '' : ', locked'}`,
            onclick: () => {
              if (!open) { toast(`🔒 ${item.name}: ${howToUnlock(item.unlock)}.`); return; }
              av[slot] = id; fresh.delete(`${slot}:${id}`); updatePreview(); drawPanes();
            },
          }, h('span', item.name),
          rarity !== 'common' && h('small.rarity', RARITY_NAMES[rarity]),
          !open && h('small', `🔒 ${unlockLabel(item.unlock, badgeName)}`),
          isNew && h('span.new-tag', 'NEW')));
        });
      }
      return h('section', h('h2.subhead', def.label), box);
    }));
  }
  updatePreview();
  drawPanes();

  if (fresh.size) {
    const items = all.filter((u) => fresh.has(u.key)).slice(0, 6);
    modal((close) => h('div.stack.unlock-party',
      h('div.confetti', { 'aria-hidden': 'true' }, Array.from({ length: 30 }, (_, k) => h('span', { style: `left:${(k * 37) % 100}%;animation-delay:${(k % 9) * 0.12}s;background:${['#ffd84a', '#ff7a3d', '#5cd3ff', '#6ff0b4', '#c89bff'][k % 5]}` }))),
      h('h2', fresh.size === 1 ? '🎉 New gear unlocked!' : `🎉 ${fresh.size} new items unlocked!`),
      h('div.unlock-grid', items.map((u) => h('div.unlock-card', { class: `r-${rarityOf(u.unlock)}` },
        h('img', { src: avatarURL({ ...av, [u.slot]: u.id }, 4), alt: '' }),
        h('strong', u.name),
        h('span.rarity', RARITY_NAMES[rarityOf(u.unlock)]),
        h('button.btn.small', { onclick: () => { av[u.slot] = u.id; fresh.delete(u.key); updatePreview(); drawPanes(); close(); } }, u.slot === 'title' ? 'Use it' : 'Try it on')))),
      h('div.row.end', h('button.btn.primary', { onclick: close }, 'Awesome!')),
    ));
  }

  const earned = new Set(stats.badges);
  return h('div.character',
    h('div.stack',
      h('section.card.stack.char-preview', stage,
        h('p.char-name', student.display_name), titleLine,
        h('p.rank', stats.rank.name, h('span.xp', `${stats.xp} XP`)), xpBar(stats),
        h('p.small.muted', `${owned.length} of ${all.length} items collected`),
        h('div.row', save)),
      nextCard),
    h('section.card.stack.char-options', h('h1', 'Your character'), h('p.muted', 'Earn XP and badges to unlock more. Tap a locked item to see how.'), paneBox),
    h('section.card.stack.char-ranks', h('h2', 'Ranks'),
      h('ol.ranks', RANKS.map((r, i) => h('li', { class: i === stats.rankIndex ? 'now' : i < stats.rankIndex ? 'past' : '' }, h('span', r.name), h('span.muted', `${r.xp} XP`)))),
      h('h3', 'How to earn XP'),
      h('ul.small',
        h('li', `Submit a lesson with every activity done: ${XP.submit} XP (${XP.submitPartial} if some are not done)`),
        h('li', `Each stretch goal: ${XP.stretch} XP`),
        h('li', `A badge from your teacher: ${XP.award} XP`)),
      h('p.small.muted', 'Grades never change your XP.'),
    ),
    h('section.card.stack.char-badges', h('h2', `Badges (${[...earned].filter((id) => badgeById(id)).length} of ${BADGES.length + TEACHER_BADGES.length})`),
      h('div.badges', [...BADGES, ...TEACHER_BADGES].map((b) => h(`div.badge${earned.has(b.id) ? '' : '.locked'}`, { title: b.desc }, h('span.badge-icon', earned.has(b.id) ? b.icon : '🔒'), h('span', b.name), h('small', b.desc))))),
  );
}
