// Which links a student may hand in for the history report. This one file runs in the browser and
// on the server: the build strips "export" and adds it to Code.gs. So it can't import anything, and
// its names end in _ so the browser can't call them on Apps Script.

/** Where the report can live. A school using another tool can add its address here. */
export const LINK_HOSTS_ = [
  'docs.google.com', 'drive.google.com', 'sites.google.com',
  'www.canva.com', 'canva.com', 'canva.link',
  'www.youtube.com', 'youtube.com', 'youtu.be',
  'www.wevideo.com', 'watch.screencastify.com',
];

/** A safe https link on an allowed site, or '' if it isn't one. */
export function cleanLink_(raw) {
  const text = String(raw === null || raw === undefined ? '' : raw).trim();
  if (!text || text.length > 600) return '';
  const m = text.match(/^https:\/\/([a-z0-9.-]+)(?::\d+)?(\/[^\s"'<>`]*)?$/i);
  if (!m) return '';
  const host = m[1].toLowerCase();
  if (LINK_HOSTS_.indexOf(host) < 0) return '';
  return `https://${host}${m[2] || '/'}`;
}
