// App shell and router.
import { h, clear, attempt, toast } from './ui.js';
import { createStore } from './data/store.js';
import { avatarURL, defaultAvatar } from './game/avatar.js';
import { viewNoAccess } from './views/auth.js';
import { viewHome, viewCharacter, viewClassmates, SessionEnded } from './views/student.js';
import { viewLesson } from './views/lesson.js';
import { viewTeacherHome, viewClass, viewLessons } from './views/teacher.js';
import { viewReview } from './views/review.js';
import { viewStandards } from './views/standards.js';
import { viewDisplay } from './views/display.js';
import { viewModels } from './views/models.js';
import { applySettings, openSettings } from './settings.js';

export const app = { store: createStore(), session: null, cleanup: null };
export const go = (hash) => { location.hash = hash; };

const STUDENT_ROUTES = [
  [/^\/$/, viewHome], [/^\/character$/, viewCharacter], [/^\/class$/, viewClassmates], [/^\/standards$/, viewStandards],
  [/^\/lesson\/(l\d)$/, viewLesson],
];
const TEACHER_ROUTES = [
  [/^\/$/, viewTeacherHome], [/^\/class\/([\w-]+)(?:\/(\w+))?$/, viewClass], [/^\/review\/([\w-]+)$/, viewReview],
  [/^\/display\/([\w-]+)$/, viewDisplay], [/^\/lessons$/, viewLessons], [/^\/standards$/, viewStandards], [/^\/models$/, viewModels],
  [/^\/lesson\/(l\d)(?:\/(\w+))?$/, viewLesson],
];

function topbar() {
  const s = app.session;
  const hash = location.hash.slice(1) || '/';
  const link = (href, label) => h('a.nav', { href: `#${href}`, 'aria-current': (href === '/' ? hash === '/' : hash.startsWith(href)) ? 'page' : null }, label);
  const links = s.role === 'student'
    ? [link('/', 'Home'), link('/class', 'My class'), link('/character', 'Character'), link('/standards', 'Standards')]
    : [link('/', 'Classes'), link('/lessons', 'Lessons'), link('/standards', 'Standards'), link('/models', '3D models')];
  const who = s.role === 'student'
    ? [h('img.mini-av', { src: avatarURL(s.student.avatar || defaultAvatar(s.student.id), 2), alt: '' }), s.student.display_name]
    : [s.teacher.display_name];
  return h('header.topbar',
    h('a.brand', { href: '#/' }, h('span.brand-chip', { 'aria-hidden': 'true' }), 'Into the Computer'),
    h('nav.navs', { 'aria-label': 'Main' }, links),
    h('div.who', h('button.btn.small', { onclick: openSettings }, 'Display'), who),
  );
}

let renderToken = 0;

export async function render() {
  const token = ++renderToken;
  if (app.cleanup) { const c = app.cleanup; app.cleanup = null; await attempt(c); }
  const root = document.getElementById('app');
  const path = location.hash.slice(1) || '/';

  if (!app.session) {
    clear(root).append(viewNoAccess());
    return;
  }

  const routes = app.session.role === 'student' ? STUDENT_ROUTES : TEACHER_ROUTES;
  let match = null;
  let view = null;
  for (const [re, fn] of routes) {
    const m = path.match(re);
    if (m) { match = m; view = fn; break; }
  }
  if (!view) { go('/'); return; }

  const main = h('main.page', { id: 'main' }, h('p.muted', 'Loading...'));
  clear(root).append(h('a.skip', { href: '#main', onclick: (e) => { e.preventDefault(); main.focus(); } }, 'Skip to content'), topbar(), main);
  main.setAttribute('tabindex', '-1');
  try {
    const content = await view(main, ...match.slice(1));
    if (token !== renderToken) return;
    if (content) clear(main).append(content);
  } catch (e) {
    if (e instanceof SessionEnded) {
      app.session = null;
      render();
      return;
    }
    console.error(e);
    if (token === renderToken) clear(main).append(h('div.card.stack', h('h2', 'That page could not load.'), h('p', e.message), h('p', h('a', { href: '#/' }, 'Go back home'))));
  }
}

/** Refresh the signed-in user's cached details after a profile change. */
export async function refreshSession() {
  app.store.forget();
  app.session = await app.store.session();
}

window.addEventListener('hashchange', render);

// Handle in-app links here, so they always stay inside the frame Apps Script serves the app in.
document.addEventListener('click', (e) => {
  const a = e.target.closest?.('a[href^="#"]');
  if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey) return;
  e.preventDefault();
  location.hash = a.getAttribute('href');
});

applySettings();

(async function start() {
  window.__itcBooted = true; // Index.html's startup check reads these two.
  document.getElementById('app').append(h('p.muted.boot', 'Loading Into the Computer...'));
  try {
    app.session = await app.store.session();
  } catch (e) {
    // Shown on the page instead of a blank screen, with the reason.
    clear(document.getElementById('app')).append(h('div.card.stack.boot', h('h2', 'Into the Computer could not start.'), h('p', e.message), h('p.muted.small', 'Reload to try again. If it keeps happening, copy this message for your teacher.')));
    window.__itcStarted = true;
    return;
  }
  await render();
  window.__itcStarted = true;
})();

export { toast };
