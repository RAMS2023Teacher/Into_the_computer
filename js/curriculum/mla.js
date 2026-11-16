// Builds MLA 9 citations from the boxes a student fills in. Returns parts so the screen can show the
// container in italics: [{ text, italic }]. citationText() gives the same thing as plain text.
const MONTHS = ['Jan.', 'Feb.', 'Mar.', 'Apr.', 'May', 'June', 'July', 'Aug.', 'Sept.', 'Oct.', 'Nov.', 'Dec.'];

export const SOURCE_TYPES = [
  { id: 'web', label: 'Website or article' },
  { id: 'video', label: 'Video' },
  { id: 'book', label: 'Book' },
];

const MONTH_NAMES = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
const monthNumber = (word) => {
  const w = String(word).toLowerCase().replace(/\.$/, '');
  const i = MONTH_NAMES.findIndex((m) => m === w || (w.length >= 3 && m.startsWith(w)));
  return i < 0 ? 0 : i + 1;
};

/**
 * A date in MLA style: "5 Mar. 2024". Accepts the ways students write dates:
 * 2024-03-05 (from a date picker), 3/5/2024, March 5, 2024, March 2024, or just 2024.
 */
export function mlaDate(value) {
  const s = String(value || '').trim();
  let y = 0;
  let mo = 0;
  let d = 0;
  let m;
  if ((m = s.match(/^(\d{4})(?:-(\d{1,2})(?:-(\d{1,2}))?)?$/))) [y, mo, d] = [m[1], m[2] || 0, m[3] || 0].map(Number);
  else if ((m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/))) [mo, d, y] = [m[1], m[2], m[3]].map(Number);
  else if ((m = s.match(/^([A-Za-z]+)\.?\s+(\d{1,2}),?\s+(\d{4})$/))) [mo, d, y] = [monthNumber(m[1]), Number(m[2]), Number(m[3])];
  else if ((m = s.match(/^(\d{1,2})\s+([A-Za-z]+)\.?,?\s+(\d{4})$/))) [d, mo, y] = [Number(m[1]), monthNumber(m[2]), Number(m[3])];
  else if ((m = s.match(/^([A-Za-z]+)\.?,?\s+(\d{4})$/))) [mo, y] = [monthNumber(m[1]), Number(m[2])];
  else return s;
  const month = MONTHS[mo - 1];
  if (!month) return String(y || s);
  if (!d || d > 31) return `${month} ${y}`;
  return `${d} ${month} ${y}`;
}

const clean = (v) => String(v || '').trim().replace(/\s+/g, ' ');
const stripEnd = (v) => clean(v).replace(/[.,;:]+$/, '');
/** MLA leaves out "https://" and "www." stays. */
export const mlaUrl = (u) => clean(u).replace(/^https?:\/\//i, '').replace(/\/$/, '');

function authorText(src) {
  const first = stripEnd(src.first);
  const last = stripEnd(src.last);
  if (last && first) return `${last}, ${first}`;
  return last || first;
}

/**
 * src: { type, first, last, title, container, publisher, date, url, accessed }
 *   container is the website, channel, or (for books) unused. publisher is optional for websites.
 */
export function citationParts(src) {
  const s = src || {};
  const parts = [];
  const add = (text, italic = false) => { if (text) parts.push({ text, italic }); };
  const author = authorText(s);
  const title = stripEnd(s.title);
  const container = stripEnd(s.container);
  const publisher = stripEnd(s.publisher);
  const date = mlaDate(s.date);
  const url = mlaUrl(s.url);
  if (author) add(`${author}. `);
  if (s.type === 'book') {
    if (title) add(title, true);
    if (title) add('. ');
    const tail = [publisher, date].filter(Boolean).join(', ');
    if (tail) add(`${tail}.`);
    return trimEnd(parts);
  }
  if (title) add(`"${title}." `);
  if (container) { add(container, true); add(', '); }
  if (s.type === 'video' && publisher) add(`uploaded by ${publisher}, `);
  else if (publisher && publisher !== container) add(`${publisher}, `);
  if (date) add(`${date}, `);
  if (url) add(`${url}. `);
  if (s.accessed) add(`Accessed ${mlaDate(s.accessed)}.`);
  return trimEnd(parts);
}

/** End the citation with a period, not a comma. */
function trimEnd(parts) {
  if (!parts.length) return parts;
  const last = parts[parts.length - 1];
  if (last.italic) { parts.push({ text: '.', italic: false }); return parts; }
  last.text = last.text.replace(/[,\s]+$/, '');
  if (!/[.]$/.test(last.text)) last.text += '.';
  return parts;
}

export const citationText = (src) => citationParts(src).map((p) => p.text).join('');

/** What a source still needs before it counts. Empty means it's complete. */
export function sourceMissing(src) {
  const s = src || {};
  const out = [];
  if (!clean(s.title)) out.push('a title');
  if (s.type === 'book') {
    if (!clean(s.publisher)) out.push('the publisher');
    if (!clean(s.date)) out.push('the year');
  } else {
    if (!clean(s.container)) out.push(s.type === 'video' ? 'the website, like YouTube' : 'the website name');
    if (!/^https?:\/\/\S+\.\S+/i.test(clean(s.url))) out.push('the web address (starting with https://)');
  }
  if (!s.check || !s.check.who || !s.check.when || !s.check.why) out.push('the three trust questions');
  return out;
}
