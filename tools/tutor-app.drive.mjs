// Headless-Chrome drive of the tutor-only door: UroStudyHub.min.html?app=tutor (short address tutor.html).
// The same app opened as just the AI Tutor: no Hub, no tab bar, its own name / manifest / icon, the saved
// API keys used as they are, a provider with a saved key connected on open, a file upload starting a lecture.
// Every AI endpoint is stubbed in the page (no keys, no network): requests are recorded on window.__aiReqs.
//
// Run:   node tools/tutor-app.drive.mjs
// Needs: a static server on the repo root (launch config "urostudyhub", or `python3 -m http.server 2043`)
//        and a built UroStudyHub.min.html (`python3 build.py`).
// Env:   BASE=...     server root (default http://localhost:2043)
//        CDN_DIR=...  a node_modules folder holding react@18.2.0, react-dom@18.2.0, @babel/standalone@7.23.9
//                     and katex@0.16.9 (for machines without internet; other external requests get a 404)
//        SHOTS=dir    save screenshots there
//        CHROME=...   a Chrome/Chromium binary instead of Playwright's own
// Prints PASS/FAIL per check; exits 1 when any check fails.
//
// Hooks used: html[data-app="tutor"], [data-ush-header], [data-nav=id] (tab bar), [data-tutor-full] (door: open the
// full app), [data-aipick] (the AI chip), [data-aipick-panel], [data-upload-card] (empty state: pick a file),
// [data-chat-input], [data-chat-msg], [data-chat-sys] (the grey "Loaded…" / "Starting…" lines), [data-lecture-bar],
// [data-lecture-topic].
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
let chromium;
for (const m of ['playwright', 'playwright-core', '@playwright/test']) {
  try { ({ chromium } = require(m)); if (chromium) break; } catch (e) { /* next */ }
}
if (!chromium) { try { ({ chromium } = await import('playwright')); } catch (e) { /* below */ } }
if (!chromium) { console.log('FAIL setup: Playwright not found (npm i -D playwright, or set NODE_PATH)'); process.exit(1); }

const BASE = (process.env.BASE || 'http://localhost:2043').replace(/\/$/, '');
const APP = BASE + '/UroStudyHub.min.html';
const DOOR = APP + '?app=tutor';
const CDN_DIR = process.env.CDN_DIR || '';
const SHOTS = process.env.SHOTS || '';
if (SHOTS) await mkdir(SHOTS, { recursive: true });
const CDN_MAP = [
  [/react\/18\.2\.0\/umd\/react\.production\.min\.js/, 'react/umd/react.production.min.js', 'application/javascript'],
  [/react-dom\/18\.2\.0\/umd\/react-dom\.production\.min\.js/, 'react-dom/umd/react-dom.production.min.js', 'application/javascript'],
  [/babel-standalone\/7\.23\.9\/babel\.min\.js/, '@babel/standalone/babel.min.js', 'application/javascript'],
  [/KaTeX\/0\.16\.9\/katex\.min\.js/, 'katex/dist/katex.min.js', 'application/javascript'],
  [/KaTeX\/0\.16\.9\/katex\.min\.css/, 'katex/dist/katex.min.css', 'text/css'],
];

let nPass = 0, nFail = 0;
function check(name, ok, detail) {
  if (ok) { nPass++; console.log('PASS ' + name + (detail ? '  (' + detail + ')' : '')); }
  else { nFail++; console.log('FAIL ' + name + (detail ? ' — ' + detail : '')); }
  return !!ok;
}
async function block(name, fn) {
  console.log('\n— ' + name);
  try { await fn(); } catch (e) { check(name + ' (step threw)', false, String(e && e.message ? e.message : e).split('\n')[0]); }
}

const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});

// In the page, before any app script: seed storage once, stub every AI endpoint (recording key + body).
function pageInit(seed) {
  try {
    if (!localStorage.getItem('__doorSeeded')) {
      Object.keys(seed).forEach(function (k) { localStorage.setItem(k, seed[k]); });
      localStorage.setItem('__doorSeeded', '1');
    }
  } catch (e) { /* ignore */ }
  window.__aiReqs = [];
  var realFetch = window.fetch.bind(window);
  function json(o) { return Promise.resolve(new Response(JSON.stringify(o), { status: 200, headers: { 'content-type': 'application/json' } })); }
  function hdr(o, name) {
    var h = (o && o.headers) || {};
    if (typeof h.get === 'function') return h.get(name) || '';
    for (var k in h) if (k.toLowerCase() === name) return String(h[k]);
    return '';
  }
  window.fetch = function (u, o) {
    var url = typeof u === 'string' ? u : (u && u.url) || String(u);
    var raw = (o && typeof o.body === 'string') ? o.body : '';
    var body = null;
    try { body = raw ? JSON.parse(raw) : null; } catch (e) { body = null; }
    if (/api\.anthropic\.com\/v1\/messages/.test(url)) {
      window.__aiReqs.push({ prov: 'claude', key: hdr(o, 'x-api-key'), model: body && body.model, raw: raw });
      return json({ content: [{ type: 'text', text: '## Phase 1: Big Picture\n\nStub lecture reply from Claude. Type NEXT to continue.' }], stop_reason: 'end_turn', usage: { input_tokens: 10, output_tokens: 5 } });
    }
    if (/openrouter\.ai\/api\/v1\/models/.test(url)) return json({ data: [] });
    if (/localhost:1234\/v1\/models/.test(url)) return json({ data: [] });
    var m = /(api\.openai\.com|generativelanguage\.googleapis\.com|openrouter\.ai|localhost:1234).*\/chat\/completions/.exec(url);
    if (m) {
      var prov = { 'api.openai.com': 'openai', 'generativelanguage.googleapis.com': 'gemini', 'openrouter.ai': 'openrouter', 'localhost:1234': 'lmstudio' }[m[1]];
      window.__aiReqs.push({ prov: prov, key: hdr(o, 'authorization'), model: body && body.model, raw: raw });
      return json({ choices: [{ message: { content: 'Stub reply from ' + prov + '.' } }], usage: { prompt_tokens: 10, completion_tokens: 5 } });
    }
    return realFetch(u, o);
  };
}

const KNOWN_HARMLESS = [/exceeds the max of 500KB/i, /ERR_CONNECTION_REFUSED/, /localhost:1234/];
// ready: 'door' waits for the tutor-only header, 'hub' for the full app's tab bar
async function open(url, seed, ready, viewport) {
  const ctx = await browser.newContext({ viewport: viewport || { width: 412, height: 860 }, deviceScaleFactor: 1, isMobile: !viewport, hasTouch: !viewport });
  await ctx.addInitScript(pageInit, seed || {});
  if (CDN_DIR) {
    await ctx.route(/^https?:\/\/(?!localhost[:/]|127\.0\.0\.1[:/])/, async (route) => {
      const u = route.request().url();
      for (const [re, f, ct] of CDN_MAP) if (re.test(u)) return route.fulfill({ path: join(CDN_DIR, f), contentType: ct });
      return route.fulfill({ status: 404, body: '' });
    });
  }
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push('Uncaught ' + (e && e.message ? e.message : e)));
  p.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const loc = (msg.location() && msg.location().url) || '';
    const txt = msg.text() + (loc ? ' @ ' + loc : '');
    if (KNOWN_HARMLESS.some((re) => re.test(txt))) return;
    if (CDN_DIR && /Failed to load resource/.test(txt) && loc && !/localhost|127\.0\.0\.1/.test(loc)) return;
    errs.push('console.error ' + txt);
  });
  p.on('dialog', (d) => d.accept().catch(() => {}));
  await p.goto(url);
  await waitReady(p, ready);
  return { ctx, p, errs };
}
async function waitReady(p, ready) {
  await p.waitForFunction((want) => {
    const r = document.getElementById('root');
    if (!r || !r.children.length) return false;
    if (want === 'hub') return [...document.querySelectorAll('button[data-nav]')].some((b) => b.getClientRects().length);
    return [...document.querySelectorAll('h1')].some((h) => h.textContent.trim() === 'Tutor');
  }, ready || 'door', { timeout: 90000 });
  await p.waitForTimeout(500);
}
const errCheck = (label, errs) => { check('no console errors · ' + label, errs.length === 0, errs.slice(0, 3).join(' | ')); errs.length = 0; };
const shot = async (p, name) => { if (SHOTS) await p.screenshot({ path: join(SHOTS, name + '.png') }); };
const reqs = (p) => p.evaluate(() => window.__aiReqs.slice());
const visible = (p, s) => p.locator(s + ':visible').count().then((n) => n > 0);
const chip = (p) => p.locator('[data-aipick]').first().innerText();
const lmSaved = async (p) => JSON.parse((await p.evaluate(() => localStorage.getItem('uroStudyHub_lmSettings'))) || 'null');
async function send(p, text) {
  const n0 = (await reqs(p)).length;
  const inp = p.locator('[data-chat-input]').first();
  await inp.fill(text);
  await inp.press('Enter');
  await p.waitForFunction((n) => window.__aiReqs.length > n, n0, { timeout: 8000 });
  await p.waitForTimeout(300);
  const all = await reqs(p);
  return all[all.length - 1];
}

const PROG = JSON.stringify({ role: 'resident', lastLoginDate: new Date().toISOString().slice(0, 10) });
const LM_CLAUDE = JSON.stringify({ ep: 'http://localhost:1234', model: 'claude-opus-5-5', provider: 'claude', claudeKey: 'sk-ant-door-test', claudeModel: 'claude-opus-5-5' });
const LM_LOCAL_PLUS_ROUTER = JSON.stringify({ ep: 'http://localhost:1234', model: 'qwen3-8b', localModel: 'qwen3-8b', provider: 'lmstudio', openrouterKey: 'sk-or-door-test', openrouterModel: 'deepseek/deepseek-chat' });
const MARK = 'ZEBRAFISH-7731';
const DOC = '# Renal colic notes\n\nA ureteral stone under 5 mm usually passes on its own. ' + MARK + '\n\nAlpha blockers help distal stones pass.\n';

await block('A. The door: just the tutor, own name and icon', async () => {
  const { ctx, p, errs } = await open(DOOR, { uroStudyHub_progress: PROG, uroStudyHub_lmSettings: LM_CLAUDE });
  errCheck('boot', errs);
  const info = await p.evaluate(() => ({
    app: document.documentElement.getAttribute('data-app'),
    title: document.title,
    h1: [...document.querySelectorAll('[data-ush-header] h1')].map((h) => h.textContent.trim()).join('|'),
    manifest: (document.querySelector('link[rel="manifest"]') || {}).getAttribute('href'),
    touch: (document.querySelector('link[rel="apple-touch-icon"]') || { getAttribute() { return ''; } }).getAttribute('href'),
    navBtns: [...document.querySelectorAll('button[data-nav]')].filter((b) => b.getClientRects().length).length,
    back: [...document.querySelectorAll('button[aria-label="Back to Hub"]')].length,
    imp: [...document.querySelectorAll('button[aria-label="Import shared content"]')].length,
    settings: [...document.querySelectorAll('button[aria-label="Settings"]')].filter((b) => b.getClientRects().length).length,
    overflowX: document.documentElement.scrollWidth - window.innerWidth,
    hdrText: (document.querySelector('[data-ush-header]') || {}).textContent || '',
  }));
  check('html is marked data-app="tutor"', info.app === 'tutor', info.app);
  check('page title is Tutor', info.title === 'Tutor', info.title);
  check('header says Tutor', info.h1 === 'Tutor', info.h1);
  check('manifest is the tutor one', info.manifest === 'tutor-manifest.json', info.manifest);
  check('home-screen icon is the tutor one', /icons\/tutor-180\.png$/.test(info.touch), info.touch);
  check('no tab bar', info.navBtns === 0, info.navBtns + ' tab buttons');
  check('no Back to Hub, no Import button', info.back === 0 && info.imp === 0, info.back + ' / ' + info.imp);
  check('Settings (keys) stays in the header', info.settings === 1, String(info.settings));
  check('no XP / coin chips in the header', !/🔥|💰|🪙/.test(info.hdrText), info.hdrText);
  check('nothing wider than the phone screen', info.overflowX <= 0, 'overflow ' + info.overflowX + 'px');
  const mf = await p.evaluate(() => fetch('tutor-manifest.json').then((r) => r.json()));
  check('the manifest starts on the door and has PNG icons', /app=tutor/.test(mf.start_url) && mf.display === 'standalone' && mf.icons.length >= 2 && mf.icons.every((i) => /\.png$/.test(i.src)), mf.start_url);
  const iconsOk = await p.evaluate((list) => Promise.all(list.map((src) => fetch(src).then((r) => r.ok && /image\/png/.test(r.headers.get('content-type') || '')))), [...new Set(mf.icons.map((i) => i.src).concat(['icons/tutor-180.png']))]);
  check('every icon file is served', iconsOk.every(Boolean), JSON.stringify(iconsOk));
  await shot(p, 'a1-door-phone');

  // the typing box sits at the bottom of the window (the column fills the screen without the tab bar)
  const box = await p.locator('[data-chat-input]').first().boundingBox();
  check('the typing box sits at the bottom of the screen', box && box.y + box.height > 860 - 90 && box.y + box.height <= 860, box ? 'bottom at ' + Math.round(box.y + box.height) : 'no box');

  await p.locator('button[aria-label="Settings"]:visible').first().click();
  await p.waitForTimeout(300);
  check('Settings opens over the tutor, with the key field', (await visible(p, 'input[type="password"]')) || (await p.getByText(/API key/i).count()) > 0);
  await shot(p, 'a2-door-settings');
  errCheck('door + settings', errs);
  await ctx.close();
});

await block('B. Saved key: connected on open, used as saved', async () => {
  const { ctx, p, errs } = await open(DOOR, { uroStudyHub_progress: PROG, uroStudyHub_lmSettings: LM_CLAUDE });
  const c0 = (await chip(p)).trim();
  check('the chip is connected without a tap', /^Claude · claude-opus-5-5/.test(c0), c0);
  const r = await send(p, 'What is the Bosniak classification?');
  check('the question goes to Claude with the saved key', r.prov === 'claude' && r.key === 'sk-ant-door-test', r.prov + ' / ' + r.key);
  check('and to the saved model', r.model === 'claude-opus-5-5', r.model);
  await p.waitForFunction(() => [...document.querySelectorAll('[data-chat-msg]')].some((m) => /Stub lecture reply/.test(m.textContent)), null, { timeout: 8000 });
  check('the reply shows in the chat', true);
  const saved = await lmSaved(p);
  check('the key is still saved, untouched', saved.claudeKey === 'sk-ant-door-test' && saved.provider === 'claude');
  errCheck('send', errs);
  await ctx.close();
});

await block('C. Last used a local model, but a cloud key is saved', async () => {
  const { ctx, p, errs } = await open(DOOR, { uroStudyHub_progress: PROG, uroStudyHub_lmSettings: LM_LOCAL_PLUS_ROUTER });
  const c0 = (await chip(p)).trim();
  check('the door connects the provider that has a key (Router)', /^Router · deepseek-chat/.test(c0), c0);
  const r = await send(p, 'Quick one.');
  check('the request goes to OpenRouter with that key and model', r.prov === 'openrouter' && /sk-or-door-test/.test(r.key) && r.model === 'deepseek/deepseek-chat', r.prov + ' / ' + r.model);
  errCheck('router', errs);
  await ctx.close();
});

await block('D. No key yet: says so, and the chip leads to the fix', async () => {
  const { ctx, p, errs } = await open(DOOR, { uroStudyHub_progress: PROG });
  const c0 = (await chip(p)).trim();
  check('the chip says the AI is off', /AI off/.test(c0), c0);
  await p.locator('[data-aipick]:visible').first().click();
  await p.waitForTimeout(250);
  check('tapping it opens the AI panel', await visible(p, '[data-aipick-panel]'));
  errCheck('no key', errs);
  await ctx.close();
});

await block('E. Upload a file: parsed, lecture starts', async () => {
  const { ctx, p, errs } = await open(DOOR, { uroStudyHub_progress: PROG, uroStudyHub_lmSettings: LM_CLAUDE });
  check('the empty screen has the upload card', await visible(p, '[data-upload-card]'));
  const [chooser] = await Promise.all([
    p.waitForEvent('filechooser', { timeout: 8000 }),
    p.locator('[data-upload-card]:visible').first().click(),
  ]);
  check('tapping the card opens the file picker', !!chooser);
  await chooser.setFiles({ name: 'renal-colic_notes.md', mimeType: 'text/markdown', buffer: Buffer.from(DOC, 'utf8') });
  await p.waitForFunction(() => window.__aiReqs.length > 0, null, { timeout: 10000 });
  await p.waitForTimeout(500);
  const all = await reqs(p);
  const r = all[all.length - 1];
  // The opening message is sent after the upload's state has landed: the document, lecture mode and the
  // "Loaded" line are all in the FIRST request (it used to go out from a stale render, without the file).
  check('one request, not two', all.length === 1, all.length + ' requests');
  check('the first lecture request carries the text of the file', r.raw.indexOf('ZEBRAFISH-7731') >= 0, r.raw.length + ' chars sent');
  check('and is sent under the lecture prompt, not the Deep Dive one', r.raw.indexOf('one-on-one board prep session') >= 0 && r.raw.indexOf('MASTERY DRILL: a strict') < 0 && r.raw.indexOf('expert urology educator') < 0);
  check('it goes out with the saved key', r.key === 'sk-ant-door-test', r.key);
  const ui = await p.evaluate(() => ({
    loaded: [...document.querySelectorAll('[data-chat-sys]')].some((m) => /Loaded: renal colic notes/.test(m.textContent)),
    bar: !!document.querySelector('[data-lecture-bar]'),
    topic: (document.querySelector('[data-lecture-topic]') || {}).textContent || '',
    reply: [...document.querySelectorAll('[data-chat-msg]')].some((m) => /Stub lecture reply/.test(m.textContent)),
    app: document.documentElement.getAttribute('data-app'),
    navBtns: [...document.querySelectorAll('button[data-nav]')].filter((b) => b.getClientRects().length).length,
  }));
  check('the "Loaded" line stays in the chat', ui.loaded);
  check('the lecture bar shows the topic', ui.bar && /renal colic notes/i.test(ui.topic), ui.topic);
  check('the first phase reply arrives', ui.reply);
  check('still the tutor-only door afterwards', ui.app === 'tutor' && ui.navBtns === 0);
  await shot(p, 'e1-door-lecture');
  errCheck('upload', errs);
  await ctx.close();
});

await block('F. Wide window (a desktop pane)', async () => {
  const { ctx, p, errs } = await open(DOOR, { uroStudyHub_progress: PROG, uroStudyHub_lmSettings: LM_CLAUDE }, 'door', { width: 1280, height: 800 });
  const info = await p.evaluate(() => ({
    overflowX: document.documentElement.scrollWidth - window.innerWidth,
    overflowY: document.documentElement.scrollHeight - window.innerHeight,
    navBtns: [...document.querySelectorAll('button[data-nav]')].filter((b) => b.getClientRects().length).length,
  }));
  check('the page does not scroll sideways or down (one fixed column)', info.overflowX <= 0 && info.overflowY <= 0, info.overflowX + ' / ' + info.overflowY);
  check('no tab bar', info.navBtns === 0);
  await shot(p, 'f1-door-desktop');
  errCheck('desktop', errs);
  await ctx.close();
});

await block('G. tutor.html and the way back to the full app', async () => {
  const { ctx, p, errs } = await open(BASE + '/tutor.html', { uroStudyHub_progress: PROG, uroStudyHub_lmSettings: LM_CLAUDE });
  check('tutor.html lands on the door', /UroStudyHub\.min\.html\?app=tutor$/.test(p.url()), p.url());
  await p.locator('[data-tutor-full]:visible').first().click();
  await waitReady(p, 'hub');
  const info = await p.evaluate(() => ({ app: document.documentElement.getAttribute('data-app'), url: location.href, manifest: document.querySelector('link[rel="manifest"]').getAttribute('href') }));
  check('the home button opens the full app', !/app=tutor/.test(info.url) && info.app === null && info.manifest === 'manifest.json', info.url);
  errCheck('tutor.html', errs);
  await ctx.close();
});

await block('H. The full app is unchanged', async () => {
  const { ctx, p, errs } = await open(APP, { uroStudyHub_progress: PROG, uroStudyHub_lmSettings: LM_CLAUDE }, 'hub');
  const info = await p.evaluate(() => ({
    app: document.documentElement.getAttribute('data-app'),
    title: document.title,
    manifest: document.querySelector('link[rel="manifest"]').getAttribute('href'),
    h1: [...document.querySelectorAll('[data-ush-header] h1')].map((h) => h.textContent.trim()).join('|'),
    navBtns: [...document.querySelectorAll('button[data-nav]')].filter((b) => b.getClientRects().length).length,
    imp: [...document.querySelectorAll('button[aria-label="Import shared content"]')].length,
    full: [...document.querySelectorAll('[data-tutor-full]')].length,
  }));
  check('opens on the Hub with the tab bar', info.h1 === 'UroStudy Hub' && info.navBtns >= 4, info.h1 + ' / ' + info.navBtns);
  check('own title and manifest', /UroStudy Hub/.test(info.title) && info.manifest === 'manifest.json' && info.app === null, info.title);
  check('Import button there, no door button', info.imp === 1 && info.full === 0);
  await p.evaluate(() => { [...document.querySelectorAll('button[data-nav="chat"]')].find((x) => x.getClientRects().length).click(); });
  await p.waitForFunction(() => [...document.querySelectorAll('h1')].some((h) => /AI Tutor/.test(h.textContent)), null, { timeout: 5000 });
  const c0 = (await chip(p)).trim();
  check('its tutor still opens "AI off" until tapped (as before)', /AI off/.test(c0), c0);
  check('Back to Hub is there', (await p.locator('button[aria-label="Back to Hub"]').count()) === 1);

  // Topic start buttons (same kickoff path as the upload): the first request must use the new mode's prompt.
  await p.locator('[data-aipick]:visible').first().click();
  await p.waitForTimeout(200);
  await p.locator('[data-aipick-prov="claude"]:visible').first().click();
  await p.waitForTimeout(300);
  await p.locator('button[aria-label="Back to Hub"]').first().click();
  await p.waitForTimeout(300);
  // reach the tutor with a topic picked: the Hub's "Up Next" card
  await p.evaluate(() => {
    const cards = [...document.querySelectorAll('div')].filter((d) => d.getClientRects().length && getComputedStyle(d).cursor === 'pointer' && /Up Next/.test(d.textContent));
    if (cards.length) cards[cards.length - 1].click();
  });
  await p.waitForTimeout(400);
  const drill = p.getByRole('button', { name: /Mastery Drill/ });
  if (check('the Hub\'s Up Next card opens the tutor with its start buttons', (await drill.count()) > 0)) {
    const n0 = (await reqs(p)).length;
    await drill.first().click();
    await p.waitForFunction((n) => window.__aiReqs.length > n, n0, { timeout: 8000 });
    await p.waitForTimeout(300);
    const all = await reqs(p);
    const r = all[all.length - 1];
    check('Mastery Drill: its first request uses the mastery prompt', r.raw.indexOf('MASTERY DRILL: a strict') >= 0);
    const kept = await p.evaluate(() => [...document.querySelectorAll('[data-chat-sys]')].some((m) => /Starting mastery drill/.test(m.textContent)));
    check('and the "Starting mastery drill" line stays in the chat', kept);
  }
  errCheck('full app', errs);
  await ctx.close();
});

await browser.close();
console.log('\n' + nPass + ' passed, ' + nFail + ' failed');
process.exit(nFail ? 1 : 0);
