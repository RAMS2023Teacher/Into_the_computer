// Packs the app into the only kinds of file Apps Script accepts: .gs and .html.
// Run: npm run build. The result in dist/ is what goes into the Apps Script project.
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { mkdirSync, readFileSync, rmSync, statSync, writeFileSync, readdirSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const path = (p) => new URL(p, root);
const read = (p) => readFileSync(path(p), 'utf8');

/** Browser files the server also runs: "export" is removed and they are added to the end of Code.gs. */
export const SHARED_FILES = ['js/shared/links.js'];

// Apps Script rewrites inline JavaScript on its way to the browser, and that broke Pixel Trail's
// bundle. So the code ships as base64 text, which nothing rewrites, and a short loader in plain
// ES5 decodes it and runs it. Every file must also start as HTML, or Apps Script rejects it.
const b64 = (t) => Buffer.from(t, 'utf8').toString('base64');
const LOADER = `<script>
(function () {
  try {
    var b = atob(document.getElementById('app-src').textContent.replace(/\\s+/g, ''));
    var u = new Uint8Array(b.length);
    for (var i = 0; i < b.length; i++) u[i] = b.charCodeAt(i);
    var s = document.createElement('script');
    s.textContent = new TextDecoder().decode(u);
    document.body.appendChild(s);
  } catch (e) {
    window.dispatchEvent(new ErrorEvent('error', { message: 'The app code could not be unpacked: ' + e.message }));
  }
})();
</script>
`;

export async function buildDist({ quiet = false } = {}) {
  rmSync(path('dist'), { recursive: true, force: true });
  mkdirSync(path('dist'));
  const app = await build({
    entryPoints: [fileURLToPath(path('js/main.js'))],
    bundle: true, minify: true, format: 'iife', write: false, target: 'es2020', legalComments: 'none',
  });
  const css = await build({ stdin: { contents: read('css/app.css'), loader: 'css' }, minify: true, write: false });
  writeFileSync(path('dist/App.html'), `<script type="text/plain" id="app-src" data-encoding="base64">${b64(app.outputFiles[0].text)}</script>\n${LOADER}`);
  writeFileSync(path('dist/Styles.html'), `<style>${css.outputFiles[0].text}</style>\n`);
  writeFileSync(path('dist/Index.html'), read('gas/Index.html'));
  const shared = SHARED_FILES.map((f) => `\n// ---- ${f} (shared with the browser) ----\n${read(f).replace(/^export /gm, '')}`).join('\n');
  writeFileSync(path('dist/Code.gs'), `${read('gas/Code.gs')}${shared}`);
  writeFileSync(path('dist/appsscript.json'), read('gas/appsscript.json'));
  if (!quiet) for (const f of readdirSync(path('dist'))) console.log(`${String(Math.round(statSync(path(`dist/${f}`)).size / 1024)).padStart(6)} KB  dist/${f}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await buildDist();
