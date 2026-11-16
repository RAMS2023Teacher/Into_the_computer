// Display and reading preferences. These belong to each person's browser, not their account.
import { h, clear, modal, toast } from './ui.js';

const KEY = 'intothecomputer.settings';
const DEFAULTS = { theme: 'auto', textSize: 100, spacing: 'normal', plainHeadings: false, readRate: 1, autoRead: false, motion: true };

let settings = { ...DEFAULTS };
try { settings = { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch (_) { /* private mode: use defaults */ }

const listeners = new Set();
export const getSettings = () => settings;
/** Run fn now and whenever settings change. Returns a function that stops listening. */
export function onSettings(fn) {
  listeners.add(fn);
  fn(settings);
  return () => listeners.delete(fn);
}

export function applySettings() {
  const root = document.documentElement;
  if (settings.theme === 'auto') delete root.dataset.theme; else root.dataset.theme = settings.theme;
  if (settings.motion) delete root.dataset.still; else root.dataset.still = 'true';
  root.dataset.spacing = settings.spacing;
  if (settings.plainHeadings) root.dataset.plainHeadings = 'true'; else delete root.dataset.plainHeadings;
  root.style.setProperty('--ui-scale', settings.textSize / 100);
  listeners.forEach((fn) => fn(settings));
}

function update(patch) {
  settings = { ...settings, ...patch };
  try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch (_) { /* still applies for this visit */ }
  applySettings();
}

// Read aloud ---------------------------------------------------------------------------------------

const canSpeak = () => 'speechSynthesis' in window;
export const stopSpeaking = () => { if (canSpeak()) window.speechSynthesis.cancel(); };

/** Lesson text is written with a few marks. Say it the way a person would. */
export function forSpeech(text) {
  return String(text)
    .replace(/[*`]/g, '')
    .replace(/\bRAM\b/g, 'ram').replace(/\bCPU\b/g, 'C P U').replace(/\bSSD\b/g, 'S S D').replace(/\bOS\b/g, 'O S')
    .replace(/\bKB\b/g, 'kilobytes').replace(/\bMB\b/g, 'megabytes').replace(/\bGB\b/g, 'gigabytes').replace(/\bTB\b/g, 'terabytes')
    .replace(/\s+/g, ' ').trim();
}

export function speak(text) {
  if (!canSpeak()) { toast('Read aloud is not available in this browser.', 'error'); return; }
  stopSpeaking();
  const u = new SpeechSynthesisUtterance(forSpeech(text));
  u.rate = settings.readRate;
  window.speechSynthesis.speak(u);
}

export const readButton = (getText, label = 'Read aloud') => h('button.read-btn', { type: 'button', 'aria-label': label, title: label, onclick: () => speak(getText()) }, '🔊');

// The panel ----------------------------------------------------------------------------------------

function choice(label, key, options) {
  const box = h('div.options', { role: 'radiogroup', 'aria-label': label });
  const draw = () => clear(box).append(...options.map(([value, text]) => h('button.item', {
    type: 'button', role: 'radio', 'aria-checked': settings[key] === value ? 'true' : 'false',
    onclick: () => { update({ [key]: value }); draw(); },
  }, text)));
  draw();
  return h('section.setting', h('h3.subhead', label), box);
}

function toggle(label, key) {
  return h('label.check', h('input', { type: 'checkbox', checked: settings[key], onchange: (e) => update({ [key]: e.target.checked }) }), h('span', label));
}

export function openSettings() {
  modal((close) => h('div.stack.settings',
    h('h2', 'Display'),
    choice('Theme', 'theme', [['auto', 'Match my device'], ['light', 'Light'], ['dark', 'Dark'], ['contrast', 'High contrast']]),
    choice('Text size', 'textSize', [[100, 'Normal'], [115, 'Large'], [130, 'Larger'], [150, 'Largest']]),
    choice('Line spacing', 'spacing', [['normal', 'Normal'], ['wide', 'Wide']]),
    toggle('Use plain headings instead of the pixel font', 'plainHeadings'),
    choice('Reading speed', 'readRate', [[0.75, 'Slow'], [1, 'Normal'], [1.25, 'Fast']]),
    toggle('Read each step aloud automatically', 'autoRead'),
    toggle('Show animations', 'motion'),
    h('div.row.end',
      h('button.btn', { type: 'button', onclick: () => speak('This is how read aloud sounds.') }, 'Test read aloud'),
      h('button.btn.primary', { type: 'button', onclick: close }, 'Done')),
  ));
}
