// Checks the packed files in dist/ against what real Apps Script needs. Builds first.
import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import vm from 'node:vm';
import { buildDist } from '../tools/build.mjs';
import { METHODS } from '../js/data/store.js';
import { createServer } from './fake-gas.mjs';

const dist = (f) => readFileSync(new URL(`../dist/${f}`, import.meta.url), 'utf8');
before(async () => { await buildDist({ quiet: true }); });

test('dist has exactly the files to paste into Apps Script', () => {
  assert.deepEqual(readdirSync(new URL('../dist/', import.meta.url)).sort(), ['App.html', 'Code.gs', 'Index.html', 'Styles.html', 'appsscript.json']);
});

test('every HTML file starts as HTML, so Apps Script does not reject it as malformed', () => {
  for (const f of ['App.html', 'Index.html', 'Styles.html']) {
    const text = dist(f);
    assert.match(text, /^\s*</, `${f} must start with a tag`);
    const opens = (text.match(/<script\b/g) || []).length;
    const closes = (text.match(/<\/script>/g) || []).length;
    assert.equal(opens, closes, `${f}: every <script> is closed`);
  }
  assert.match(dist('Index.html'), /^<!doctype html>/i);
});

test('the app ships as base64 text with a tiny plain loader, so Apps Script cannot rewrite it', () => {
  const app = dist('App.html');
  const m = app.match(/^<script type="text\/plain" id="app-src" data-encoding="base64">([A-Za-z0-9+/=]+)<\/script>\n<script>([\s\S]*)<\/script>\n$/);
  assert.ok(m, 'App.html is one base64 text block and one loader');
  const loader = m[2];
  assert.ok(loader.length < 1200, 'the loader stays tiny');
  // Plain ES5: no arrow functions, let, const, or template strings that Apps Script might rewrite.
  assert.ok(!/=>|\blet\b|\bconst\b|`/.test(loader), 'the loader is plain ES5');
  const code = Buffer.from(m[1], 'base64').toString('utf8');
  assert.ok(code.includes('Into the Computer'));
  assert.doesNotThrow(() => new vm.Script(code), 'the decoded app parses');
});

test('web fonts load without blocking, and a failed start shows the reason on screen', () => {
  const index = dist('Index.html');
  const fontLinks = index.match(/<link[^>]+fonts\.googleapis\.com\/css2[^>]*>/g);
  assert.ok(fontLinks.length >= 1);
  for (const l of fontLinks) assert.match(l, /media="print" onload="this\.media='all'"/);
  assert.match(index, /addEventListener\('error'/);
  assert.match(index, /addEventListener\('unhandledrejection'/);
  assert.match(index, /taking too long to start/);
  assert.match(index, /<\?!= include_\('Styles'\) \?>/);
  assert.match(index, /<\?!= include_\('App'\) \?>/);
  assert.ok(!/include_\('(P5|ML5)/.test(index));
});

test('Code.gs runs, sets the tab icon with setFaviconUrl, and includes the shared link rules', () => {
  const code = dist('Code.gs');
  assert.match(code, /\.setFaviconUrl\('https:\/\/[^']+\.png'\)/);
  assert.match(code, /function cleanLink_\(/);
  assert.ok(!/^export /m.test(code), 'no module syntax in Code.gs');
  const server = createServer({ codeFile: '../dist/Code.gs', htmlDir: '../dist' });
  assert.deepEqual(server.publicFunctions().sort(), ['api', 'doGet']);
  assert.equal(server.as('teacher@school.test')('session').role, 'teacher');
});

test('appsscript.json runs as the teacher, for the school only, with Classroom', () => {
  const cfg = JSON.parse(dist('appsscript.json'));
  assert.equal(cfg.webapp.executeAs, 'USER_DEPLOYING');
  assert.equal(cfg.webapp.access, 'DOMAIN');
  assert.equal(cfg.runtimeVersion, 'V8');
  assert.ok(cfg.dependencies.enabledAdvancedServices.some((s) => s.userSymbol === 'Classroom'));
  assert.ok(cfg.oauthScopes.includes('https://www.googleapis.com/auth/userinfo.email'));
});

test('every call the browser makes is a server route, and every route is reachable', () => {
  const code = readFileSync(new URL('../gas/Code.gs', import.meta.url), 'utf8');
  const routes = (name) => {
    const body = code.slice(code.indexOf(`const ${name} = {`));
    const block = body.slice(0, body.indexOf('\n};'));
    return [...block.matchAll(/^ {2}(\w+):/gm)].map((m) => m[1]);
  };
  const server = new Set([...routes('TEACHER_ROUTES'), ...routes('STUDENT_ROUTES')]);
  for (const m of METHODS) assert.ok(server.has(m), `${m} is not a server route`);
  for (const r of server) assert.ok(METHODS.includes(r), `${r} is not callable from the browser`);
});
