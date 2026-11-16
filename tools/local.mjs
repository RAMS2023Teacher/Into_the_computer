// Runs Into the Computer on your own computer, the way Apps Script would: the packed dist/ files,
// with the real server code (gas/Code.gs) behind them on a pretend Sheet full of sample students.
// Open http://localhost:8080 and pick who to sign in as. The pretend Sheet is saved in .local/ so
// your changes survive a restart; "Start over" on the first page brings back the sample data.
import { createServer as createHttp } from 'node:http';
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { createServer } from '../tests/fake-gas.mjs';
import { buildDist } from './build.mjs';
import { OWNER, classroom, seed } from './sample.mjs';

const PORT = Number(process.env.PORT || 8080);
const SAVE = new URL('../.local/sheet.json', import.meta.url);
const OTHER_TEACHER = 'colleague@school.test';

let server;
function start(fresh) {
  const sheets = !fresh && existsSync(SAVE) ? JSON.parse(readFileSync(SAVE, 'utf8')) : null;
  server = createServer({ owner: OWNER, codeFile: '../dist/Code.gs', htmlDir: '../dist', classroom: classroom(), sheets });
  if (!sheets) seed(server);
  save();
}
function save() {
  mkdirSync(new URL('../.local/', import.meta.url), { recursive: true });
  writeFileSync(SAVE, JSON.stringify(server.dump()));
}

await buildDist({ quiet: true });
start(false);

const dist = (f) => readFileSync(new URL(`../dist/${f}`, import.meta.url), 'utf8');
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** Do what HtmlService does with Index.html's template tags, and stand in for google.script.run. */
function renderIndex(email) {
  const shim = `<script>
window.google = { script: { run: (function make(ok, fail) {
  return new Proxy({}, { get(_, name) {
    if (name === 'withSuccessHandler') return (f) => make(f, fail);
    if (name === 'withFailureHandler') return (f) => make(ok, f);
    return (...args) => fetch('/api?as=' + encodeURIComponent(${JSON.stringify(email)}), { method: 'POST', body: JSON.stringify({ name, args }) })
      .then((r) => r.text()).then((t) => ok && ok(t)).catch((e) => fail && fail(e));
  } });
})() } };
</script>`;
  return dist('Index.html').replace(/<\?!= include_\('(\w+)'\) \?>/g, (_, f) => dist(`${f}.html`)).replace('<head>', `<head><title>Into the Computer</title>${shim}`);
}

function chooser() {
  const t = server.as(OWNER);
  const classes = t('listClasses');
  const people = classes.flatMap((c) => t('listStudents', c.id).map((s) => ({ ...s, cls: c.name })));
  const link = (email, label, note = '') => `<li><a href="/as/${encodeURIComponent(email)}">${esc(label)}</a> <span>${esc(note)}</span></li>`;
  return `<!doctype html><meta charset="utf-8"><title>Into the Computer: sign in</title>
<style>body{font:17px system-ui;max-width:680px;margin:40px auto;padding:0 16px;color:#22304a;background:#f4f7fb}a{font-weight:700}li{margin:6px 0}span{color:#5b6b85;font-size:.9em}button{font:inherit;padding:6px 12px}</style>
<h1>Into the Computer</h1>
<p>This runs the real app and server on a pretend Google Sheet. Pick who to be. Open a second browser window to be two people at once.</p>
<h2>Teachers</h2><ul>${link(OWNER, 'Teacher (set up the app)', 'can use Google Classroom')}${link(OTHER_TEACHER, 'Another teacher', 'only after you add them to the Teachers tab, so this shows the "not on a list" page')}</ul>
<h2>Students</h2><ul>${people.map((p) => link(p.email, p.display_name, p.cls)).join('')}${link('stranger@school.test', 'Someone not on any roster')}</ul>
<form method="post" action="/reset"><button>Start over with the sample data</button></form>`;
}

createHttp((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/api' && req.method === 'POST') {
    let body = '';
    req.on('data', (d) => { body += d; });
    req.on('end', () => {
      const { name, args } = JSON.parse(body);
      if (name !== 'api') { res.writeHead(404).end(); return; }
      // Like Apps Script, each call costs a moment, so slow pages show up here too.
      const out = JSON.stringify(server.raw(url.searchParams.get('as') || '', args[0], JSON.parse(args[1] || '[]')));
      save();
      setTimeout(() => res.end(out), 250);
    });
    return;
  }
  if (url.pathname === '/reset' && req.method === 'POST') {
    rmSync(SAVE, { force: true });
    start(true);
    res.writeHead(303, { Location: '/' }).end();
    return;
  }
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  if (url.pathname === '/app') {
    buildDist({ quiet: true }).then(() => res.end(renderIndex(url.searchParams.get('as') || '')), (e) => res.end(`<pre>${esc(e.message)}</pre>`));
    return;
  }
  const as = url.pathname.match(/^\/as\/(.+)$/);
  if (as) {
    const email = decodeURIComponent(as[1]);
    // The same sandbox flags Google gives web apps, so frame problems show up here too.
    res.end(`<!doctype html><meta charset="utf-8"><title>Into the Computer (${esc(email)})</title><style>html,body,iframe{margin:0;width:100%;height:100%;border:0}</style>
<iframe sandbox="allow-downloads allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts allow-top-navigation-by-user-activation" allow="autoplay; fullscreen; xr-spatial-tracking" src="/app?as=${encodeURIComponent(email)}"></iframe>`);
    return;
  }
  res.end(chooser());
}).listen(PORT, () => console.log(`Into the Computer is running: open http://localhost:${PORT}`));
