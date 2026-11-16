// The 3D models page: preview every model, see where it is used, and switch any off for everyone.
import { h, toast, attempt } from '../ui.js';
import { app, refreshSession, render } from '../main.js';
import { MODELS, LICENSE } from '../curriculum/models.js';
import { LESSONS, allSteps } from '../curriculum/lessons.js';
import { CATEGORIES, HISTORY } from '../curriculum/catalog.js';
import { openModel, creditLine } from './model3d.js';

/** Where each model shows up, so a teacher knows what switching it off affects. */
function usedIn(key) {
  const out = [];
  for (const l of LESSONS) {
    for (const s of allSteps(l)) {
      const a = s.activity;
      const hit = s.model === key || (s.models || []).includes(key)
        || (a.cards || []).some((c) => c.model === key)
        || (Array.isArray(a.options) && a.options.some((o) => o.model === key))
        || (a.categories || []).some((id) => CATEGORIES.find((c) => c.id === id)?.model === key);
      if (hit) out.push(`Lesson ${l.n}: ${s.title}`);
    }
  }
  if (HISTORY.some((c) => c.model === key) && !out.some((x) => x.includes('Pick a computer'))) out.push('Lesson 5: Pick a computer');
  return [...new Set(out)];
}

export async function viewModels() {
  const off = new Set(app.session.settings?.models_off || []);
  const owner = app.session.is_owner;
  const save = async (next) => {
    if (await attempt(() => app.store.setModelsOff([...next]))) { await refreshSession(); toast('Saved. Students see the change next time they open a page.'); render(); }
  };
  return h('div.stack',
    h('div', h('h1', '3D models'), h('p.muted', `Students can open these with "See it in 3D." Each one loads from Sketchfab only when a student presses the button, and the credit shows under every model. Most are shared under ${LICENSE.name}, which allows use with credit.`)),
    !owner && h('p.warn', 'Only the teacher who set up the app can switch models on or off.'),
    h('p.small.muted', 'Preview each one before class. If your school blocks Sketchfab, students see a note instead and every lesson still works.'),
    h('div.model-grid', Object.entries(MODELS).map(([key, m]) => h('article.card.stack.model-card', { class: off.has(key) ? 'off' : '' },
      h('h2', m.shows),
      creditLine(key),
      h('p.small', h('strong', 'Used in: '), usedIn(key).join('; ') || 'Not used in a lesson'),
      h('div.row',
        h('button.btn.small', { onclick: () => openModel(key) }, '🧊 Preview'),
        owner && h('label.check', h('input', { type: 'checkbox', checked: !off.has(key), onchange: (e) => { const next = new Set(off); if (e.target.checked) next.delete(key); else next.add(key); save(next); } }), h('span', 'Show to students')))))),
  );
}
