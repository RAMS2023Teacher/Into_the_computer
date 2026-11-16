// "See it in 3D": a Sketchfab model in a pop-up, loaded only when asked for, with its credit.
import { h, modal } from '../ui.js';
import { app } from '../main.js';
import { MODELS, LICENSE, embedUrl, pageUrl } from '../curriculum/models.js';

/** Models the teacher has switched off on the 3D models page. */
export const modelOn = (key) => !!MODELS[key] && !((app.session?.settings?.models_off) || []).includes(key);

export function creditLine(key) {
  const m = MODELS[key];
  return h('p.model-credit',
    '3D model: ', h('a', { href: pageUrl(key), target: '_blank', rel: 'noopener noreferrer' }, `"${m.name}"`),
    ` by ${m.author}, `, h('a', { href: LICENSE.url, target: '_blank', rel: 'noopener noreferrer' }, LICENSE.name), ', on Sketchfab.');
}

export function openModel(key) {
  const m = MODELS[key];
  if (!m) return;
  modal((close) => {
    const frame = h('iframe.model-frame', {
      title: `3D model: ${m.shows}`, src: embedUrl(key), allow: 'autoplay; fullscreen; xr-spatial-tracking', allowfullscreen: true, loading: 'eager',
      referrerpolicy: 'strict-origin-when-cross-origin',
    });
    const slow = h('p.muted.small.model-slow', 'Loading the 3D model... If nothing appears, your school network may block Sketchfab. The lesson works without it.');
    frame.addEventListener('load', () => slow.remove());
    return h('div.stack',
      h('h2', m.shows),
      h('p.muted.small', 'Drag to spin it. Scroll or pinch to zoom.'),
      h('div.model-box', frame), slow, creditLine(key),
      h('div.row.end', h('button.btn.primary', { onclick: close }, 'Close')));
  }, { wide: true });
}

/** A "See it in 3D" button, or nothing if that model is switched off. */
export function modelButton(key, label = 'See it in 3D') {
  if (!modelOn(key)) return null;
  return h('button.btn.small.model-btn', { type: 'button', onclick: () => openModel(key), title: MODELS[key].shows }, '🧊 ', label);
}
