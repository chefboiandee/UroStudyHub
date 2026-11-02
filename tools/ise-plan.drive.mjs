// Headless-Chrome drive of the In-Service Exam (ISE) Sprint plan in UroStudyHub (spec §G2).
// Uses Playwright. Needs a static server on the repo root (launch config "urostudyhub", or
// `python3 -m http.server 2043`) and a built UroStudyHub.min.html (`python3 build.py`).
//
// Run:   node tools/ise-plan.drive.mjs
// Env:   URL=...      page to test (default http://localhost:2043/UroStudyHub.min.html)
//        CDN_DIR=...  a node_modules folder holding react@18.2.0, react-dom@18.2.0, @babel/standalone@7.23.9
//                     and katex@0.16.9: cdnjs requests are served from it and other external requests get a 404
//                     (for machines without internet). Unset = requests go to the real CDN.
//        OUT=...      screenshot folder (default: a new temp dir)
//        CHROME=...   a Chrome/Chromium binary to use instead of Playwright's own (npx playwright install chromium)
// Prints PASS/FAIL per check; exits 1 when any check fails.
//
// Elements of the ISE view (and the Hub's 🎯 task, data-ise="hub-task") are selected only by their data-ise
// attributes. Other app chrome (bottom nav, tracker tabs, the other Hub tasks, share/import modals, the tutor
// chat input) has no such hooks, so it is found by its visible text or placeholder.
import { createRequire } from 'node:module';
import { mkdtemp, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { isDeepStrictEqual } from 'node:util';

const require = createRequire(import.meta.url);
let chromium;
for (const m of ['playwright', 'playwright-core', '@playwright/test']) {
  try { ({ chromium } = require(m)); if (chromium) break; } catch (e) { /* next */ }
}
if (!chromium) { try { ({ chromium } = await import('playwright')); } catch (e) { /* below */ } }
if (!chromium) { console.log('FAIL setup: Playwright not found (npm i -D playwright, or set NODE_PATH)'); process.exit(1); }

const PAGE_URL = process.env.URL || 'http://localhost:2043/UroStudyHub.min.html';
const CDN_DIR = process.env.CDN_DIR || '';
const OUT = process.env.OUT || (await mkdtemp(join(tmpdir(), 'ise-drive-')));
await mkdir(OUT, { recursive: true });

const CDN_MAP = [
  [/react\/18\.2\.0\/umd\/react\.production\.min\.js/, 'react/umd/react.production.min.js', 'application/javascript'],
  [/react-dom\/18\.2\.0\/umd\/react-dom\.production\.min\.js/, 'react-dom/umd/react-dom.production.min.js', 'application/javascript'],
  [/babel-standalone\/7\.23\.9\/babel\.min\.js/, '@babel/standalone/babel.min.js', 'application/javascript'],
  [/KaTeX\/0\.16\.9\/katex\.min\.js/, 'katex/dist/katex.min.js', 'application/javascript'],
  [/KaTeX\/0\.16\.9\/katex\.min\.css/, 'katex/dist/katex.min.css', 'text/css'],
];

// ---------- result bookkeeping ----------
let nPass = 0, nFail = 0;
const failures = [];
function check(name, ok, detail) {
  if (ok) { nPass++; console.log('PASS ' + name + (detail ? '  (' + detail + ')' : '')); }
  else { nFail++; failures.push(name + (detail ? ' — ' + detail : '')); console.log('FAIL ' + name + (detail ? ' — ' + detail : '')); }
  return !!ok;
}
// A block of steps: an exception fails the block (with its message) instead of aborting the run
async function block(name, fn) {
  try { await fn(); } catch (e) { check(name + ' (step threw)', false, String(e && e.message ? e.message : e).split('\n')[0]); }
}
const short = (v, n = 160) => { const s = typeof v === 'string' ? v : JSON.stringify(v); return s && s.length > n ? s.slice(0, n) + '…' : s; };

// ---------- ISE logic in Node (fixtures), taken from the served page so it matches what runs there ----------
let html = '';
try { html = await (await fetch(PAGE_URL)).text(); } catch (e) { console.log('FAIL setup: cannot load ' + PAGE_URL + ' (' + e.message + '). Start the server: python3 -m http.server 2043'); process.exit(1); }
const mLogic = html.match(/<script id="ise-logic">([\s\S]*?)<\/script>/);
if (!mLogic) { console.log('FAIL setup: no <script id="ise-logic"> in ' + PAGE_URL); process.exit(1); }
const L = new Function(mLogic[1] + '\n;return { iseSetup, iseNorm, iseStatus, iseReshuffle, iseWhatIfs, iseResolve, iseMissWindow, ISE_BLOCKS, ISE_LABEL };')();
// The day's question target as the scheduler resolves it (the oracle for the Today card's data-ise="target")
const qTarget = (ise, d, today) => { const r = L.iseResolve(ise, d, L.iseStatus(ise, today), today); return r ? r.q : null; };
const mAua = html.match(/^const AUA_PHASES = (\[[\s\S]*?\n\]);/m);
const AUA_PHASES = mAua ? new Function('return ' + mAua[1] + ';')() : null;
function auaKey(name) {
  if (!AUA_PHASES) return null;
  for (let pi = 0; pi < AUA_PHASES.length; pi++) {
    const ph = AUA_PHASES[pi];
    for (let si = 0; si < ph.sections.length; si++) {
      const ti = ph.sections[si].topics.indexOf(name);
      if (ti >= 0) return pi + '-' + si + '-' + ti;
    }
  }
  return null;
}
const CFG = (o) => Object.assign({ exam: '2026-11-21', minsWk: 120, minsWe: 180, off: [], skip: [], pace: 3, qbank: 'SASP', boost: {} }, o || {});

// ---------- browser plumbing ----------
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});

// Runs in the page before any app script: pin the clock, seed storage once per context, stub the clipboard
// and the local-model chat endpoint (requests are recorded on window.__lmReqs).
function pageInit(a) {
  var RD = Date;
  var OFF = new RD(a.now[0], a.now[1] - 1, a.now[2], a.now[3] || 9, a.now[4] || 0, 0).getTime() - RD.now();
  class PinnedDate extends RD {
    constructor(...x) { if (x.length) super(...x); else super(RD.now() + OFF); }
    static now() { return RD.now() + OFF; }
  }
  window.Date = PinnedDate;
  window.__shiftClock = function (ms) { OFF += ms; }; // lets a check move "now" (e.g. past midnight)
  try {
    if (!localStorage.getItem('__iseDriveSeeded')) {
      Object.keys(a.seed || {}).forEach(function (k) { localStorage.setItem(k, a.seed[k]); });
      localStorage.setItem('__iseDriveSeeded', '1');
    }
  } catch (e) { /* ignore */ }
  window.__clip = [];
  try {
    var clip = {
      writeText: function (t) { if (window.__clipFail) return Promise.reject(new Error('denied')); window.__clip.push(String(t)); return Promise.resolve(); },
      readText: function () { return Promise.resolve(window.__clip[window.__clip.length - 1] || ''); },
    };
    Object.defineProperty(navigator, 'clipboard', { configurable: true, get: function () { return clip; } });
  } catch (e) { /* ignore */ }
  window.__lmReqs = [];
  var realFetch = window.fetch.bind(window);
  window.fetch = function (u, o) {
    var url = typeof u === 'string' ? u : (u && u.url) || String(u);
    if (/\/v1\/chat\/completions/.test(url) && /localhost:1234/.test(url)) {
      var body = null;
      try { body = JSON.parse(o && o.body); } catch (e) { body = null; }
      window.__lmReqs.push({ url: url, body: body });
      return Promise.resolve(new Response(JSON.stringify({ choices: [{ message: { content: 'Stub reply from the ISE driver.' } }] }), { status: 200, headers: { 'content-type': 'application/json' } }));
    }
    return realFetch(u, o);
  };
}

const KNOWN_HARMLESS = [/exceeds the max of 500KB/i, /ERR_CONNECTION_REFUSED/, /localhost:1234/];
async function openScenario(label, { now, seed }) {
  const ctx = await browser.newContext({ viewport: { width: 632, height: 842 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await ctx.addInitScript(pageInit, { now, seed });
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
  p.on('console', (m) => {
    if (m.type() !== 'error') return;
    const loc = (m.location() && m.location().url) || '';
    const txt = m.text() + (loc ? ' @ ' + loc : '');
    if (KNOWN_HARMLESS.some((re) => re.test(txt))) return;
    if (CDN_DIR && /Failed to load resource/.test(txt) && loc && !/localhost|127\.0\.0\.1/.test(loc)) return; // blocked offline
    errs.push('console.error ' + txt);
  });
  const dialogs = [];
  p.__dialogAnswer = true;
  p.on('dialog', async (d) => { dialogs.push(d.message()); try { if (p.__dialogAnswer) await d.accept(); else await d.dismiss(); } catch (e) { /* closed */ } });
  p.__dialogs = dialogs;
  await p.goto(PAGE_URL);
  await waitBoot(p);
  console.log('\n— ' + label);
  return { ctx, p, errs };
}
async function waitBoot(p) {
  await p.waitForFunction(() => {
    const r = document.getElementById('root');
    return r && r.children.length > 0 && [...document.querySelectorAll('button')].some((b) => /Hub/.test(b.textContent));
  }, null, { timeout: 90000 });
  await p.waitForTimeout(700);
}
async function reload(p) { await p.reload(); await waitBoot(p); }

const getLS = (p, k) => p.evaluate((key) => localStorage.getItem(key), k);
const getIse = async (p) => JSON.parse((await getLS(p, 'uroStudyHub_ise')) || 'null');
const getProg = async (p) => JSON.parse((await getLS(p, 'uroStudyHub_progress')) || 'null');
async function waitFor(p, fn, arg, timeout = 5000) {
  try { await p.waitForFunction(fn, arg, { timeout }); return true; } catch (e) { return false; }
}
// Poll a Node-side predicate over page state
async function poll(fn, timeout = 4000) {
  const t0 = Date.now(); let v;
  while (Date.now() - t0 < timeout) { v = await fn(); if (v) return v; await new Promise((r) => setTimeout(r, 100)); }
  return v;
}

// App chrome by text (DOM click; these are not ISE elements)
async function clickText(p, re, sel = 'button') {
  const ok = await p.evaluate(([src, flags, s]) => {
    const rx = new RegExp(src, flags);
    const el = [...document.querySelectorAll(s)].find((x) => rx.test(x.textContent) && x.getClientRects().length);
    if (el) { el.click(); return true; }
    return false;
  }, [re.source, re.flags, sel]);
  if (!ok) throw new Error('no ' + sel + ' matching ' + re);
  await p.waitForTimeout(250);
}
const navTo = (p, which) => clickText(p, which === 'hub' ? /🏠\s*Hub/ : which === 'study' ? /📚\s*Study/ : /🧠\s*Tutor/);

// ISE elements: a real (pointer) click on the first visible [data-ise=name]
const ISE = (name, extra = '') => '[data-ise="' + name + '"]' + extra;
async function tap(p, name, extra = '') {
  const loc = p.locator(ISE(name, extra) + ':visible').first();
  await loc.scrollIntoViewIfNeeded({ timeout: 5000 });
  await loc.click({ timeout: 10000 });
  await p.waitForTimeout(200);
}
const has = (p, name, extra = '') => p.locator(ISE(name, extra) + ':visible').count().then((n) => n > 0);
const textOf = (p, name, extra = '') => p.locator(ISE(name, extra)).first().innerText({ timeout: 5000 });

async function openIse(p) {
  await navTo(p, 'study');
  if (!(await p.locator('[data-ise-view]').count())) {
    await clickText(p, /🗂\s*Plans/);
    await tap(p, 'card');
  }
  await p.waitForSelector('[data-ise-view]', { timeout: 10000 });
}

async function hubTasks(p) {
  await navTo(p, 'hub');
  await p.waitForTimeout(300);
  return p.evaluate(() => [...document.querySelectorAll('span')]
    .filter((s) => s.previousElementSibling && s.previousElementSibling.tagName === 'SPAN' && /^(🎯|📅|🔴|🟡|📇|📚|⚠️)$/.test(s.previousElementSibling.textContent.trim()) && s.children.length === 0)
    .map((s) => ({ icon: s.previousElementSibling.textContent.trim(), text: s.textContent, color: getComputedStyle(s).color })));
}
const isRed = (rgb) => { const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(rgb || ''); return !!m && +m[1] > 180 && +m[2] < 120 && +m[3] < 120; };

// E-ink audit inside [data-ise-view]: opens every <details>, then checks tap targets, fonts, motion, shadows
async function einkAudit(p) {
  return p.evaluate(() => {
    const root = document.querySelector('[data-ise-view]');
    if (!root) return { small: ['no [data-ise-view]'], font: [], motion: [], tiny: [], n: 0 };
    root.querySelectorAll('details').forEach((d) => { d.open = true; });
    const name = (el) => (el.getAttribute('data-ise') || el.tagName.toLowerCase()) + ' "' + (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 28) + '"';
    const small = [], font = [], motion = [], tiny = [];
    const targets = root.querySelectorAll('button, select, summary, [data-ise="dayrow"]');
    let n = 0;
    targets.forEach((el) => {
      if (!el.getClientRects().length) return;
      n++;
      const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
      if (r.height < 31.5) small.push(name(el) + ' h=' + r.height.toFixed(1));
      if (parseFloat(cs.fontSize) < 11) font.push(name(el) + ' ' + cs.fontSize);
    });
    root.querySelectorAll('*').forEach((el) => {
      const cs = getComputedStyle(el);
      if (cs.transitionDuration.split(',').some((x) => parseFloat(x) > 0)) motion.push(name(el) + ' transition ' + cs.transitionDuration);
      if (cs.animationName && cs.animationName !== 'none') motion.push(name(el) + ' animation ' + cs.animationName);
      if (cs.boxShadow && cs.boxShadow !== 'none') motion.push(name(el) + ' box-shadow');
      const own = [...el.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim());
      if (own && el.getClientRects().length && parseFloat(cs.fontSize) < 11) tiny.push(name(el) + ' ' + cs.fontSize);
    });
    return { small, font, motion, tiny, n };
  });
}
async function einkChecks(p, where) {
  const a = await einkAudit(p);
  check('e-ink [' + where + ']: ' + a.n + ' buttons/selects/summaries/day rows are >= 32px tall', a.small.length === 0, a.small.slice(0, 6).join('; '));
  check('e-ink [' + where + ']: their font size is >= 11px', a.font.length === 0, a.font.slice(0, 6).join('; '));
  check('e-ink [' + where + ']: no transition, animation or box-shadow inside the view', a.motion.length === 0, a.motion.slice(0, 6).join('; '));
  check('e-ink [' + where + ']: all text inside the view is >= 11px', a.tiny.length === 0, a.tiny.slice(0, 6).join('; '));
}
async function shot(p, name) { await p.screenshot({ path: join(OUT, name + '.png') }); }

function errCheck(label, errs) {
  check(label + ': no uncaught errors or unexpected console errors', errs.length === 0, errs.slice(0, 4).map((e) => short(e, 200)).join(' | '));
  errs.length = 0;
}

// =====================================================================================================
// Scenario A: fresh build on Mon 2026-11-02 (Core plan seeded far behind; one Core topic done)
// =====================================================================================================
const OAB = 'Overactive Bladder: Evaluation and Treatment';
const oabKey = auaKey(OAB);
const progA = { role: 'resident', scheduleAnchorDate: '2026-01-05', done: {}, srs: {}, conf: {} };
if (oabKey) { progA.done[oabKey] = '2026-10-01'; progA.srs[oabKey] = { last: '2026-10-01', interval: 3, ease: 2.5, reps: 1 }; progA.conf[oabKey] = 3; }
const LM = JSON.stringify({ ep: 'http://localhost:1234', model: 'stub-model', provider: 'lmstudio' });
try {
  const { ctx, p, errs } = await openScenario('A. fresh plan, today Mon 11/02', {
    now: [2026, 11, 2, 9, 0],
    seed: { uroStudyHub_mode: 'light', uroStudyHub_progress: JSON.stringify(progA), uroStudyHub_activePlan: 'aua', uroStudyHub_lmSettings: LM },
  });
  errCheck('boot', errs);
  const snap = async () => { const pr = await getProg(p); return { plan: await getLS(p, 'uroStudyHub_activePlan'), done: JSON.stringify(pr && pr.done), srs: JSON.stringify(pr && pr.srs), conf: JSON.stringify(pr && pr.conf) }; };
  const base = await snap();

  await block('hub before a plan', async () => {
    const t = await hubTasks(p);
    check('Hub without a sprint: no 🎯 task, and the Core "reorganize" task shows (seeded Core far behind)', !t.some((x) => x.icon === '🎯') && t.some((x) => /reorganize/.test(x.text)), short(t.map((x) => x.icon + ' ' + x.text).join(' | '), 240));
  });

  let built = null, tgtA = NaN;
  await block('fresh flow', async () => {
    await navTo(p, 'study');
    await clickText(p, /🗂\s*Plans/);
    const card = await textOf(p, 'card');
    check('Plans card shows the not-set-up subtitle', /Plan the weeks before the ISE/.test(card), short(card.replace(/\n/g, ' | ')));
    await tap(p, 'card');
    await p.waitForSelector(ISE('setup'), { timeout: 8000 });
    const tabs = await p.evaluate(() => [...document.querySelectorAll('button')].filter((b) => /🗂\s*Plans|📅\s*Schedule/.test(b.textContent) && b.getClientRects().length)
      .map((b) => ({ t: b.textContent.trim(), w: getComputedStyle(b).fontWeight, bb: getComputedStyle(b).borderBottomColor })));
    const plansTab = tabs.find((x) => /Plans/.test(x.t)), schedTab = tabs.find((x) => /Schedule/.test(x.t));
    check('Plans tab is highlighted while the ISE view is open', plansTab && schedTab && +plansTab.w >= 700 && +schedTab.w < 700 && plansTab.bb !== schedTab.bb, short(tabs));
    const exam = await p.locator(ISE('exam-date')).inputValue();
    check('Setup defaults the exam to the third Saturday of November (2026-11-21)', exam === '2026-11-21', exam);
    const pv = (await textOf(p, 'setup-preview')).replace(/\n/g, ' / ');
    check('Setup live preview: 18 study days, cut Penile/adrenal + Prostate 3, mocks 11/14-15', /18 study days/.test(pv) && /cut: Penile\/adrenal, Prostate 3/.test(pv) && /Sat 11\/14, Sun 11\/15/.test(pv), short(pv, 260));
    await shot(p, '01-setup');
    await einkChecks(p, 'setup');
    // Like a user: details closed, scroll just far enough to tap [Build plan] above the bottom tab bar
    const scroller = () => p.evaluate(() => {
      let sc = document.querySelector('[data-ise-view]');
      while (sc && sc !== document.body && !(sc.scrollHeight > sc.clientHeight + 4 && /auto|scroll/.test(getComputedStyle(sc).overflowY))) sc = sc.parentElement;
      const s = sc && sc !== document.body ? sc : document.scrollingElement;
      return { y: Math.round(s.scrollTop), who: s.tagName + (s.id ? '#' + s.id : '') };
    });
    await p.evaluate(() => { document.querySelectorAll('[data-ise-view] details').forEach((d) => { d.open = false; }); document.querySelector('[data-ise-view]').scrollIntoView(true); document.querySelector('[data-ise="build"]').scrollIntoView({ block: 'center' }); });
    const y0 = await scroller();
    await tap(p, 'build');
    await p.waitForSelector(ISE('today'), { timeout: 8000 });
    await p.waitForTimeout(300);
    const y1 = await scroller();
    const pos = await p.evaluate(() => {
      const r = document.querySelector('[data-ise="today"]').getBoundingClientRect();
      const vis = [...document.querySelectorAll('[data-ise]')].filter((e) => { const b = e.getBoundingClientRect(); return b.top >= 0 && b.top < innerHeight && b.height > 0; }).map((e) => e.getAttribute('data-ise'));
      return { top: Math.round(r.top), bottom: Math.round(r.bottom), vh: innerHeight, vis: [...new Set(vis)].slice(0, 6).join(',') };
    });
    check('After Build the Today card is on screen (no scrolling to find it)', pos.top < pos.vh && pos.bottom > 0,
      y1.who + ' scrollTop ' + y0.y + ' when Build was tapped → ' + y1.y + ' after; card top ' + pos.top + '..' + pos.bottom + ' in a ' + pos.vh + 'px viewport; on screen: ' + pos.vis);
    built = await getIse(p);
    check('Build stores uroStudyHub_ise with kind "uroISE", exam 11-21 and a plan', built && built.kind === 'uroISE' && built.cfg && built.cfg.exam === '2026-11-21' && built.plan.length > 0 && built.built === '2026-11-02', short(built && { kind: built.kind, built: built.built, n: built.plan.length }));
    const td = await p.locator(ISE('today')).first();
    const tdDate = await td.getAttribute('data-date'), tdKind = await td.getAttribute('data-kind');
    tgtA = parseInt(await textOf(p, 'target'), 10);
    const want = built ? qTarget(built, '2026-11-02', '2026-11-02') : null;
    check('Today card: Mon 11/02, Content (void1), target ' + want + ' Qs as the scheduler resolves it (25 at 120 min with no misses yet)', tdDate === '2026-11-02' && tdKind === 'block' && tgtA === want && want === 25, tdDate + ' ' + tdKind + ' target=' + tgtA + ' (Node: ' + want + ')');
    const tdTxt = (await td.innerText()).replace(/\n/g, ' | ');
    check('No misses logged yet: the miss-review step says "No misses yet: put these minutes into questions"', /No misses yet: put these minutes into questions/.test(tdTxt) && !/Re-read/.test(tdTxt), short(tdTxt, 260));
    const stt = await textOf(p, 'status');
    check('Status strip: "19 days to ISE"', /19 days to ISE/.test(stt), stt);
    const know = p.locator(ISE('know')).first();
    await know.locator('summary').click();
    const kn = await know.evaluate((d) => ({ open: d.open, sum: d.querySelector('summary').textContent, li: d.querySelectorAll('li').length }));
    check('Know-cold <details> opens on tap and lists the items', kn.open && kn.li >= 3 && /Know cold/.test(kn.sum), short(kn));
    await know.locator('summary').click();
    if (oabKey) {
      const row = await p.locator(ISE('start', '[data-topic="' + OAB + '"]')).first().locator('xpath=..').innerText();
      check('Topic done in Core shows "✓ in Core" on the Today card', /✓ in Core/.test(row), short(row.replace(/\n/g, ' | ')));
    }
    await shot(p, '02-today');
  });

  await block('persistence', async () => {
    await reload(p);
    const after = await getIse(p);
    check('Reload: stored plan is unchanged (iseNorm round-trips it)', isDeepStrictEqual(after, built), after && built ? 'plan ' + after.plan.length + ' vs ' + built.plan.length : 'missing');
    await openIse(p);
    const ok = await has(p, 'today');
    const tgt = ok ? parseInt(await textOf(p, 'target'), 10) : NaN;
    check('Reload: Plans card → Today card with the same target (' + tgtA + ') again', ok && tgt === tgtA, 'target=' + tgt);
    const sum = await hubTasks(p);
    const iseTask = sum.find((x) => x.icon === '🎯');
    check('Hub: 🎯 task names today\'s block and target, not red; Core reorganize task hidden', !!iseTask && /Voiding 1/.test(iseTask.text) && new RegExp('\\b' + tgtA + ' SASP Qs').test(iseTask.text) && !isRed(iseTask.color) && !sum.some((x) => /reorganize/.test(x.text)), short(sum.map((x) => x.icon + ' ' + x.text + ' ' + x.color).join(' | '), 240));
    const ht = await p.evaluate(() => { const e = document.querySelector('[data-ise="hub-task"]'); if (!e) return null; const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return { h: r.height, bw: parseFloat(cs.borderTopWidth), bs: cs.borderTopStyle, txt: e.textContent }; });
    check('Hub: the 🎯 task is a data-ise="hub-task" row, >= 36px tall with a border (an e-ink tap target)', !!ht && ht.h >= 35.5 && ht.bw >= 1 && ht.bs !== 'none' && /🎯/.test(ht.txt), short(ht));
    await openIse(p);
  });

  await block('log', async () => {
    const sasp0 = ((await getProg(p)).activityLog || []).filter((e) => e.type === 'sasp').length;
    for (let i = 0; i < 4; i++) await tap(p, 'log-plus');
    const q = await p.locator(ISE('log-q')).inputValue();
    await p.locator(ISE('log-pct')).fill('60');
    const covered = await p.locator('[data-ise^="covered-"]').evaluateAll((els) => els.map((e) => ({ id: e.getAttribute('data-ise').slice(8), on: e.checked })));
    check('Log form: +5 x4 → 20 Qs; the block is pre-ticked as covered (20 >= 0.6 x ' + tgtA + ')', q === '20' && 20 >= 0.6 * tgtA && covered.length === 1 && covered[0].id === 'void1' && covered[0].on, 'q=' + q + ' ' + short(covered));
    // 20 of the target (25) first: logged and covered, but not met, so no Done pill and no reward
    await tap(p, 'log-save');
    const ise0 = await poll(async () => { const v = await getIse(p); return v && v.log && v.log['2026-11-02'] ? v : null; });
    const lg0 = ise0 && ise0.log['2026-11-02'];
    check('Save below the target writes log[11-02] = {q 20, pct 60, t ' + tgtA + ', k block, rw 0}', lg0 && lg0.q === 20 && lg0.pct === 60 && lg0.t === tgtA && lg0.k === 'block' && lg0.rw === 0 && lg0.floor === false, short(lg0));
    check('Save sets done.void1 = "2026-11-02" (the covered tick, even below the target)', ise0 && ise0.done && ise0.done.void1 === '2026-11-02', short(ise0 && ise0.done));
    const pill0 = await textOf(p, 'dayrow', '[data-date="2026-11-02"]');
    check('Below the target: today\'s pill says "20/' + tgtA + '", not "Done"', !/\bDone\b/.test(pill0) && pill0.indexOf('20/' + tgtA) >= 0, short(pill0.replace(/\n/g, ' | ')));
    await p.waitForTimeout(800);
    const saspU = ((await getProg(p)).activityLog || []).filter((e) => e.type === 'sasp').length;
    check('Below the target: no reward ("sasp" activityLog entries unchanged)', saspU === sasp0, sasp0 + ' → ' + saspU);
    // Then the full target: met, so the first met Save earns the reward once
    for (let n = 20; n < tgtA; n += 5) await tap(p, 'log-plus');
    const qFull = await p.locator(ISE('log-q')).inputValue();
    await tap(p, 'log-save');
    const ise1 = await poll(async () => { const v = await getIse(p); return v && v.log && v.log['2026-11-02'] && v.log['2026-11-02'].q === tgtA ? v : null; });
    const lg = ise1 && ise1.log['2026-11-02'];
    check('Save at the full target writes log[11-02] = {q ' + tgtA + ', pct 60, t ' + tgtA + ', k block, rw 1}', qFull === String(tgtA) && lg && lg.q === tgtA && lg.pct === 60 && lg.t === tgtA && lg.k === 'block' && lg.rw === 1 && lg.floor === false, 'q field ' + qFull + ' ' + short(lg));
    const pill = await textOf(p, 'dayrow', '[data-date="2026-11-02"]');
    check('Next 6 days: today\'s status pill says "Done"', /\bDone\b/.test(pill), short(pill.replace(/\n/g, ' | ')));
    const sasp1 = await poll(async () => { const n = ((await getProg(p)).activityLog || []).filter((e) => e.type === 'sasp').length; return n > sasp0 ? n : 0; }, 3000);
    check('activityLog gains exactly one "sasp" entry on the first met Save', sasp1 === sasp0 + 1, sasp0 + ' → ' + sasp1);
    await tap(p, 'log-save');
    await p.waitForTimeout(1200);
    const sasp2 = ((await getProg(p)).activityLog || []).filter((e) => e.type === 'sasp').length;
    const ise2 = await getIse(p);
    check('A second Save adds no reward (rw kept) and keeps one log entry', sasp2 === sasp0 + 1 && Object.keys(ise2.log).length === 1 && ise2.log['2026-11-02'].rw === 1, 'sasp ' + sasp0 + ' → ' + sasp2 + ', log days ' + Object.keys(ise2.log).length);
  });

  await block("can't study", async () => {
    await tap(p, 'next');
    const d = await p.locator(ISE('today')).first().getAttribute('data-date');
    check('next ▶ moves the Today card to Tue 11/03', d === '2026-11-03', d);
    const before = await getIse(p);
    await tap(p, 'cant-study');
    const sheetOpen = await has(p, 'sheet');
    const sheetTxt = sheetOpen ? (await textOf(p, 'sheet')).replace(/\n/g, ' / ') : '';
    check("Can't study this day opens the reshuffle preview", sheetOpen && /Can't study Tue 11\/3/.test(sheetTxt), short(sheetTxt, 220));
    await shot(p, '03-sheet');
    await einkChecks(p, 'sheet');
    await tap(p, 'sheet-cancel');
    const after = await getIse(p);
    check("Cancel closes the sheet and leaves cfg.skip and the plan unchanged", !(await has(p, 'sheet')) && isDeepStrictEqual(after.cfg.skip, before.cfg.skip) && isDeepStrictEqual(after.plan, before.plan), 'skip ' + JSON.stringify(after.cfg.skip));
    await tap(p, 'cant-study');
    await tap(p, 'sheet-apply');
    const ap = await getIse(p);
    const kind = await p.locator(ISE('today')).first().getAttribute('data-kind');
    const undoTxt = (await has(p, 'cant-study')) ? await textOf(p, 'cant-study') : '';
    check("Apply adds 11-03 to cfg.skip, drops its plan entry, and the day shows Off + \"Undo can't study\"", ap.cfg.skip.indexOf('2026-11-03') >= 0 && !ap.plan.some((e) => e.d === '2026-11-03') && kind === 'off' && /Undo/.test(undoTxt), 'skip ' + JSON.stringify(ap.cfg.skip) + ' kind ' + kind + ' btn "' + undoTxt + '"');
    check('Past entries and today\'s logged entry survive the can\'t-study reshuffle', isDeepStrictEqual(ap.plan.find((e) => e.d === '2026-11-02'), before.plan.find((e) => e.d === '2026-11-02')) && isDeepStrictEqual(ap.log, before.log), short(ap.plan.find((e) => e.d === '2026-11-02')));
    await tap(p, 'cant-study');
    await tap(p, 'sheet-apply');
    const un = await getIse(p);
    check("Undo can't study removes 11-03 from cfg.skip and plans it again", un.cfg.skip.length === 0 && un.plan.some((e) => e.d === '2026-11-03'), 'skip ' + JSON.stringify(un.cfg.skip));
    await tap(p, 'prev');
    const d2 = await p.locator(ISE('today')).first().getAttribute('data-date');
    check('◀ prev returns to today', d2 === '2026-11-02', d2);
  });

  await block('e-ink today', async () => {
    await einkChecks(p, 'today + schedule + miss log + progress');
    await p.locator(ISE('progress')).scrollIntoViewIfNeeded();
    await shot(p, '04-progress');
  });

  await block('other tracker tabs', async () => {
    await clickText(p, /📅\s*Schedule/);
    const sch = await p.evaluate(() => !document.querySelector('[data-ise-view]') && document.body.innerText.length);
    await clickText(p, /📚\s*Core/);
    const core = await p.evaluate(() => !document.querySelector('[data-ise-view]') && document.body.innerText.length);
    check('Schedule and Core tabs still render', sch > 500 && core > 500, 'chars ' + sch + ' / ' + core);
    errCheck('tabs', errs);
  });

  await block('start', async () => {
    // A previous tutor session waiting to be resumed (the app's IndexedDB autosave)
    await p.evaluate(() => new Promise((res, rej) => {
      const rq = indexedDB.open('uroStudyHubDB', 1);
      rq.onupgradeneeded = () => { try { rq.result.createObjectStore('kv'); } catch (e) { /* exists */ } };
      rq.onerror = () => rej(rq.error);
      rq.onsuccess = () => {
        const db = rq.result, tx = db.transaction('kv', 'readwrite');
        // The learner's own turn after the opener (2 user messages + a reply): a chat worth keeping
        tx.objectStore('kv').put({ topic: 'Earlier session (driver)', messages: [{ role: 'system', content: 'Starting Deep Dive: Earlier' }, { role: 'user', content: 'Teach me renal physiology.' }, { role: 'assistant', content: 'Here is renal physiology.' }, { role: 'user', content: 'Why does the loop of Henle concentrate urine?' }, { role: 'assistant', content: 'Countercurrent multiplication.' }], sideMsgs: [], lectureMode: false, lecturePhase: 0, masteryMode: false, upText: '', skillsCtx: null, date: new Date().toISOString() }, 'activeSession');
        tx.oncomplete = () => { db.close(); res(true); };
        tx.onerror = () => rej(tx.error);
      };
    }));
    await reload(p);
    const banner = await waitFor(p, () => /Unfinished lecture/.test(document.body.innerText), null, 5000);
    check('Preseeded tutor session is offered for resume', banner);
    const saved0 = ((await getProg(p)).savedLectures || []).length;
    await openIse(p);
    await tap(p, 'mode-mastery');
    const topic = await p.locator(ISE('start')).first().getAttribute('data-topic');
    const label = await p.evaluate((t) => ISE_LABEL[t] || t, topic);
    await tap(p, 'start');
    const onChat = await waitFor(p, () => [...document.querySelectorAll('h1')].some((h) => /AI Tutor/.test(h.textContent)), null, 5000);
    check('▶ Start (Drill) switches to the tutor page', onChat);
    await waitFor(p, () => window.__lmReqs.length >= 1, null, 6000);
    await p.waitForTimeout(800);
    const reqs = await p.evaluate(() => window.__lmReqs);
    const m1 = (reqs[0] && reqs[0].body && reqs[0].body.messages) || [];
    const users1 = m1.filter((m) => m.role === 'user'), sys1 = m1.filter((m) => m.role === 'system');
    const opener1 = 'Mastery drill on: ' + label + '. Probe my edge of understanding first';
    check('Drill: exactly one request, carrying the Mastery system prompt', reqs.length === 1 && sys1.length === 1 && /MASTERY DRILL/.test(sys1[0].content), 'requests=' + reqs.length + ' sys=' + short(sys1[0] && sys1[0].content, 90));
    check('Drill: the request has exactly one user message, the opener, and no assistant turns', users1.length === 1 && users1[0].content.indexOf(opener1) === 0 && !m1.some((m) => m.role === 'assistant'), short(m1.map((m) => m.role + ':' + String(m.content).slice(0, 60))));
    const saved1 = await poll(async () => { const n = ((await getProg(p)).savedLectures || []).length; return n > saved0 ? n : 0; }, 3000);
    check('The interrupted session (2 learner turns + replies) is saved to savedLectures before the new one starts (+1)', saved1 === saved0 + 1, saved0 + ' → ' + saved1);
    await waitFor(p, () => /Stub reply from the ISE driver/.test(document.body.innerText), null, 5000);
    // The learner answers the drill once: opener + an own turn = a chat worth saving on the next Start
    const chatIn = p.locator('input[placeholder^="Answer the check"]:visible').first();
    await chatIn.fill('Beta-3 agonist; no antimuscarinic side effects.');
    await chatIn.press('Enter');
    await waitFor(p, () => window.__lmReqs.length >= 2, null, 6000);
    await waitFor(p, () => document.body.innerText.split('Stub reply from the ISE driver').length >= 3, null, 5000);
    await p.waitForTimeout(800);
    const reqsT = await p.evaluate(() => window.__lmReqs);
    const mT = (reqsT[1] && reqsT[1].body && reqsT[1].body.messages) || [];
    check('Drill: the learner\'s own answer goes out as the 2nd user message, after the opener and the reply', reqsT.length === 2 && mT.filter((m) => m.role === 'user').length === 2 && mT.some((m) => m.role === 'assistant'), short(mT.map((m) => m.role + ':' + String(m.content).slice(0, 40))));

    await navTo(p, 'study');
    await p.waitForSelector('[data-ise-view]', { timeout: 8000 });
    await tap(p, 'mode-deep');
    await tap(p, 'start');
    const onChat2 = await waitFor(p, () => [...document.querySelectorAll('h1')].some((h) => /AI Tutor/.test(h.textContent)), null, 5000);
    await waitFor(p, () => window.__lmReqs.length >= 3, null, 6000);
    await p.waitForTimeout(800);
    const reqs2 = await p.evaluate(() => window.__lmReqs);
    const m2 = (reqs2[2] && reqs2[2].body && reqs2[2].body.messages) || [];
    const users2 = m2.filter((m) => m.role === 'user'), sys2 = m2.filter((m) => m.role === 'system');
    check('Deep Dive: one more request with the Deep Dive system prompt', onChat2 && reqs2.length === 3 && sys2.length === 1 && /expert urology educator/.test(sys2[0].content) && !/MASTERY DRILL/.test(sys2[0].content), 'requests=' + reqs2.length + ' sys=' + short(sys2[0] && sys2[0].content, 90));
    check('Deep Dive: exactly one user message (the opener); the live drill is not carried over', users2.length === 1 && users2[0].content.indexOf("Let's deep dive on: " + label + '.') === 0 && !m2.some((m) => m.role === 'assistant'), short(m2.map((m) => m.role + ':' + String(m.content).slice(0, 60))));
    const saved2 = await poll(async () => { const n = ((await getProg(p)).savedLectures || []).length; return n > saved1 ? n : 0; }, 3000);
    check('The live drill (opener + the learner\'s own answer + replies) is saved before the Deep Dive starts (+1)', saved2 === saved1 + 1, saved1 + ' → ' + saved2);
    await waitFor(p, () => document.body.innerText.indexOf('Stub reply from the ISE driver') >= 0, null, 5000);

    // The Deep Dive got its reply but the learner never typed: an opener-only chat is not filed on the next Start
    await navTo(p, 'study');
    await p.waitForSelector('[data-ise-view]', { timeout: 8000 });
    await tap(p, 'mode-mastery');
    await tap(p, 'start');
    await waitFor(p, () => window.__lmReqs.length >= 4, null, 6000);
    await p.waitForTimeout(1500);
    const reqs3 = await p.evaluate(() => window.__lmReqs);
    const m3 = (reqs3[3] && reqs3[3].body && reqs3[3].body.messages) || [];
    const saved3 = ((await getProg(p)).savedLectures || []).length;
    check('An opener-only chat (Deep Dive opener + reply, no learner turn) is NOT saved when the next Start replaces it', reqs3.length === 4 && m3.filter((m) => m.role === 'user').length === 1 && saved3 === saved2, 'requests=' + reqs3.length + ', savedLectures ' + saved2 + ' → ' + saved3);
  });

  await block('regression', async () => {
    const end = await snap();
    check('uroStudyHub_activePlan and progress done/srs/conf are byte-identical after all ISE actions', isDeepStrictEqual(end, base), short({ before: base, after: end }, 300));
  });
  errCheck('scenario A', errs);
  await ctx.close();
} catch (e) { check('scenario aborted', false, String((e && e.message) || e).split('\n')[0]); }

// =====================================================================================================
// Scenario B: behind (§G1 case 10): built 11-05 at 120/180, nothing logged or done, today Mon 11-09
// =====================================================================================================
try {
  const fixture = L.iseSetup(L.iseNorm(null), CFG(), {}, '2026-11-05');
  const st0 = L.iseStatus(fixture, '2026-11-09');
  const { ctx, p, errs } = await openScenario('B. behind fixture, today Mon 11/09', {
    now: [2026, 11, 9, 9, 0],
    seed: { uroStudyHub_mode: 'light', uroStudyHub_progress: JSON.stringify({ role: 'resident', scheduleAnchorDate: '2026-01-05' }), uroStudyHub_activePlan: 'aua', uroStudyHub_ise: JSON.stringify(fixture) },
  });
  check('fixture sanity (Node): state behind with 6 blocks', st0.state === 'behind' && st0.behind.length === 6, st0.state + ' ' + st0.behind.join(','));

  await block('hub behind', async () => {
    const t = await hubTasks(p);
    const iseTask = t.find((x) => x.icon === '🎯');
    check('Hub: red 🎯 task "ISE plan: 6 blocks behind — tap to reshuffle"', !!iseTask && /6 blocks behind/.test(iseTask.text) && isRed(iseTask.color), short(iseTask));
    check('Hub: the Core "reorganize" task is hidden during the sprint (Core is far behind)', !t.some((x) => /reorganize/.test(x.text)), short(t.map((x) => x.icon + ' ' + x.text).join(' | '), 240));
    const stored0 = await getLS(p, 'uroStudyHub_ise');
    await tap(p, 'hub-task');
    const opened = await waitFor(p, () => !!document.querySelector('[data-ise-view]'), null, 5000);
    const autoSheet = await waitFor(p, () => !!document.querySelector('[data-ise="sheet"]'), null, 3000);
    const ast = autoSheet ? (await textOf(p, 'sheet')).replace(/\n/g, ' / ') : '';
    check('Tapping the behind Hub task opens the ISE view with the reshuffle sheet already open', opened && autoSheet && /^Reshuffle from today/.test(ast) && /Back in: Voiding 1 \(Mon 11\/9\)/.test(ast), short(ast, 200));
    await tap(p, 'sheet-cancel');
    const closed = await waitFor(p, () => !document.querySelector('[data-ise="sheet"]'), null, 3000);
    check('Cancel closes the auto-opened sheet and leaves the stored plan byte-identical', closed && (await getLS(p, 'uroStudyHub_ise')) === stored0);
    await tap(p, 'back');
    const card = await textOf(p, 'card');
    check('Plans card: "6 blocks behind: tap to reshuffle"', /6 blocks behind: tap to reshuffle/.test(card), short(card.replace(/\n/g, ' | ')));
    await tap(p, 'card');
    await p.waitForSelector('[data-ise-view]', { timeout: 8000 });
    await p.waitForTimeout(400);
    check('Opening the view from the Plans card does not auto-open the sheet (only the Hub task does)', !(await has(p, 'sheet')));
  });

  const base0 = L.iseReshuffle(fixture, '2026-11-09', {}, 0);
  const wiNode = (L.iseWhatIfs(fixture, '2026-11-09', 0) || []).map((w) => w.label);
  await block('banner', async () => {
    const b = p.locator(ISE('banner')).first();
    const state = await b.getAttribute('data-state'), txt = (await b.innerText()).replace(/\n/g, ' / ');
    check('Banner: data-state "behind" and "6 blocks behind"', state === 'behind' && /6 blocks behind/.test(txt), short(txt, 240));
    const rs = (await textOf(p, 'reshuffle')).trim();
    check('Banner button: "↻ Reshuffle from today → ' + base0.cut.length + ' cut, ' + base0.light.length + ' light" (the plain reshuffle, 10 cut now that both mocks stay)', rs === '↻ Reshuffle from today → ' + base0.cut.length + ' cut, ' + base0.light.length + ' light' && base0.cut.length === 10, rs);
    const wi = await p.locator(ISE('whatif')).allInnerTexts();
    check('What-ifs: absolute labels, first "+30 min on weekdays → N cut, M light" as iseWhatIfs gives them; no separate +60 weekdays', wi.length >= 1 && /^\+30 min on weekdays → \d+ cut, \d+ light( · keeps \d mocks?)?$/.test(wi[0].trim()) && isDeepStrictEqual(wi.map((x) => x.trim()), wiNode) && !wi.some((x) => /^\+60 min on weekdays/.test(x)), short(wi) + ' (Node: ' + short(wiNode) + ')');
    const card = p.locator(ISE('today')).first();
    check('Today card on 11-09 is a catch-up/content day', /block|catchup|buffer/.test(await card.getAttribute('data-kind')), await card.getAttribute('data-kind'));
  });

  await block('what-if cancel', async () => {
    const before = await getLS(p, 'uroStudyHub_ise');
    await tap(p, 'whatif');
    const txt = (await textOf(p, 'sheet')).replace(/\n/g, ' / ');
    check('What-if opens a preview sheet', /\+30 min on weekdays/.test(txt), short(txt, 200));
    const backIn = (/Back in: (.*?) \/ /.exec(txt) || [])[1] || '';
    const nextDays = (/Next days \/ (.*?) \/ Apply/i.exec(txt) || [])[1] || '';
    check('What-if (+30 min) brings the highest-yield behind block back first, like the plain reshuffle (Voiding 1 on Mon 11/9, before Voiding 2)', /^Voiding 1 \(Mon 11\/9\)/.test(backIn.trim()) && !/Mon 11\/9 · Content: Voiding 2/.test(nextDays), 'Back in: ' + short(backIn, 120) + ' | Next days: ' + short(nextDays, 140));
    await tap(p, 'sheet-cancel');
    check('What-if Cancel leaves the stored plan byte-identical', (await getLS(p, 'uroStudyHub_ise')) === before);
  });

  let applied = null;
  await block('reshuffle', async () => {
    await tap(p, 'reshuffle');
    const txt = (await textOf(p, 'sheet')).replace(/\n/g, ' / ');
    check('Reshuffle preview lists "Back in:" (Voiding 1 first) and "Cut"', /Back in: Voiding 1 \(Mon 11\/9\)/.test(txt) && /Cut \(Know-cold on the final day\):/.test(txt), short(txt, 300));
    await tap(p, 'sheet-apply');
    applied = await getIse(p);
    const past = (x) => x.plan.filter((e) => e.d < '2026-11-09');
    const it = (x, d) => { const e = x.plan.find((y) => y.d === d); return e && e.it ? e.it.map((y) => y.b + ':' + y.lvl).join('+') : e && e.k; };
    const mocks = applied.plan.filter((e) => e.k === 'mock').map((e) => e.d);
    check('Apply: built 11-09, shuffles [11-09], ' + base0.cut.length + ' cut (as the button said), both mocks kept, void1 full on 11-09', applied.built === '2026-11-09' && isDeepStrictEqual(applied.shuffles, ['2026-11-09']) && applied.cut.length === base0.cut.length && applied.light.length === base0.light.length && isDeepStrictEqual(mocks, ['2026-11-14', '2026-11-15']) && it(applied, '2026-11-09') === 'void1:full', [it(applied, '2026-11-09'), it(applied, '2026-11-10'), it(applied, '2026-11-11'), 'cut ' + applied.cut.length, 'mocks ' + mocks.join(',')].join(' '));
    check('Apply: the stored plan from 11-09 on is exactly iseReshuffle(fixture, 11-09) (Node)', isDeepStrictEqual(applied.plan.filter((e) => e.d >= '2026-11-09'), base0.plan.filter((e) => e.d >= '2026-11-09')) && isDeepStrictEqual(applied.cut, base0.cut) && isDeepStrictEqual(applied.light, base0.light), ['11-09', '11-10', '11-11'].map((d) => it(applied, '2026-' + d) + ' vs ' + it(base0, '2026-' + d)).join(' | '));
    check('Apply: entries before 11-09 are deep-equal to the fixture', isDeepStrictEqual(past(applied), past(fixture)), past(applied).length + ' past entries');
    const state = await p.locator(ISE('banner')).first().getAttribute('data-state');
    check('Banner leaves "behind" after Apply', state !== 'behind', state);
    await reload(p);
    const re = await getIse(p);
    check('Reload: the reshuffled plan persists (byte-identical) and the past is unchanged', isDeepStrictEqual(re, applied) && isDeepStrictEqual(past(re), past(fixture)));
    const t = await hubTasks(p);
    const iseTask = t.find((x) => x.icon === '🎯');
    check('Hub after the reshuffle: 🎯 task names today\'s block, not red; still no reorganize task', !!iseTask && !isRed(iseTask.color) && /Voiding 1/.test(iseTask.text) && !t.some((x) => /reorganize/.test(x.text)), short(iseTask));
    await tap(p, 'hub-task');
    const opened = await waitFor(p, () => !!document.querySelector('[data-ise-view]'), null, 5000);
    await p.waitForTimeout(400);
    const st = await p.locator(ISE('banner')).first().getAttribute('data-state');
    check('After reload the Hub task opens the ISE view on track, without a sheet', opened && st === 'on' && !(await has(p, 'sheet')), st);
  });
  errCheck('scenario B', errs);
  await ctx.close();
} catch (e) { check('scenario aborted', false, String((e && e.message) || e).split('\n')[0]); }

// =====================================================================================================
// Scenario C: miss log, share code and import (plan built 11-02, one old miss from 10-25)
// =====================================================================================================
try {
  const base = L.iseSetup(L.iseNorm(null), CFG(), {}, '2026-11-02');
  // Misses on three earlier dates: the "recent" window (iseMissWindow) is the last two miss dates before today
  // (Thu 10/29, Sat 10/31) plus today, so the Sun 10/25 stones miss is outside it
  base.misses = [
    { id: 'mold1', d: '2026-10-25', g: 'stones', t: 'Old stones rule: citrate for hypocitraturia' },
    { id: 'mold2', d: '2026-10-29', g: 'peds', t: 'Peds rule: UPJ obstruction pyeloplasty if split function < 40%' },
    { id: 'mold3', d: '2026-10-31', g: 'peds', t: 'Peds rule: posterior urethral valves need a VCUG' },
  ];
  const nOld = base.misses.length;
  const win0 = L.iseMissWindow(base.misses, '2026-11-02');
  const { ctx, p, errs } = await openScenario('C. miss log + share/import, today Mon 11/02', {
    now: [2026, 11, 2, 9, 0],
    seed: { uroStudyHub_mode: 'light', uroStudyHub_progress: JSON.stringify({ role: 'resident' }), uroStudyHub_activePlan: 'aua', uroStudyHub_ise: JSON.stringify(base), uroStudyHub_lmSettings: LM },
  });
  const items = () => p.locator(ISE('miss-item') + ':visible').count();
  const shownIds = () => p.locator(ISE('miss-item') + ':visible').evaluateAll((els) => els.map((e) => e.getAttribute('data-id')));
  const recentLbl = async () => (await textOf(p, 'miss-filter-recent')).replace(/^✓\s*/, '').trim();

  await block('miss log', async () => {
    await openIse(p);
    const g0 = await p.locator(ISE('miss-group')).inputValue();
    check('Miss log: group defaults to today\'s group (void)', g0 === 'void', g0);
    check('fixture sanity (Node): iseMissWindow on 11-02 starts Thu 10/29 and holds the 10-29 and 10-31 misses', win0.from === '2026-10-29' && isDeepStrictEqual(win0.list.map((m) => m.id), ['mold2', 'mold3']), short(win0));
    const lbl = await recentLbl(), ids0 = await shownIds();
    check('Recent filter (default) reads "Since Thu 10/29": the last two miss dates before today; the 10-25 miss is hidden', lbl === 'Since Thu 10/29' && (await textOf(p, 'miss-filter-recent')).indexOf('✓') === 0 && isDeepStrictEqual(ids0.slice().sort(), ['mold2', 'mold3']), '"' + lbl + '" shows ' + short(ids0));
    const td0 = (await textOf(p, 'today')).replace(/\n/g, ' | ');
    check('The day\'s miss-review step reads the same window: "Re-read misses since Thu 10/29 (2)"', /Re-read misses since Thu 10\/29 \(2\)/.test(td0), short(td0, 260));
    await tap(p, 'miss-filter-all');
    check('Filter "All" shows all ' + nOld + ', the 10-25 one too', (await items()) === nOld && (await shownIds()).indexOf('mold1') >= 0, String(await items()));
    await tap(p, 'miss-filter-recent');
    await p.locator(ISE('miss-text')).fill('Single rule: mirabegron is a beta-3 agonist');
    await tap(p, 'miss-add');
    let ise = await getIse(p);
    const single = ise.misses.find((m) => /^Single rule/.test(m.t));
    check('Add: one miss dated 11-02 in group void', ise.misses.length === nOld + 1 && single && single.d === '2026-11-02' && single.g === 'void' && (await p.locator(ISE('miss-text')).inputValue()) === '', short(single));
    await p.locator(ISE('miss-text')).fill('- Rule A: one\n- Rule B: two\n- Rule C: three');
    await tap(p, 'miss-add');
    ise = await getIse(p);
    const bulk = ise.misses.filter((m) => /^Rule [ABC]:/.test(m.t));
    const nAll = nOld + 4;
    check('Bulk paste of 3 "- " lines adds 3 misses without the "- " prefix', ise.misses.length === nAll && bulk.length === 3 && new Set(ise.misses.map((m) => m.id)).size === nAll, short(ise.misses.map((m) => m.t)));
    const ids1 = await shownIds();
    check('Recent shows today\'s 4 new ones plus 10-29 and 10-31 (still "Since Thu 10/29"); the 10-25 miss stays hidden', ids1.length === 6 && ids1.indexOf('mold1') < 0 && ids1.indexOf('mold2') >= 0 && ids1.indexOf('mold3') >= 0 && (await recentLbl()) === 'Since Thu 10/29', ids1.length + ' shown: ' + short(ids1));
    await tap(p, 'miss-filter-all');
    check('Filter "All" shows all ' + nAll, (await items()) === nAll, String(await items()));
    await p.locator(ISE('miss-filter-group')).selectOption('stones');
    await p.waitForTimeout(150);
    const nSt = await items(), drill = await has(p, 'miss-drill');
    check('Group filter "Stones" + All shows only the stones miss, and offers "Drill these ▶"', nSt === 1 && drill, nSt + ' item(s), drill=' + drill);
    await tap(p, 'miss-filter-recent');
    check('Group filter "Stones" + Recent shows none (the stones miss is from 10-25)', (await items()) === 0, String(await items()));
    await p.locator(ISE('miss-filter-group')).selectOption('');
    await tap(p, 'miss-filter-all');
    await tap(p, 'miss-copy');
    const clip = await poll(() => p.evaluate(() => window.__clip[window.__clip.length - 1] || ''), 2500);
    const lines = (clip || '').split('\n');
    check('Copy shown writes ' + nAll + ' "- rule" lines', lines.length === nAll && lines.every((x) => x.indexOf('- ') === 0), short(clip));
    await p.evaluate(() => { window.__clipFail = true; });
    await tap(p, 'miss-copy');
    const fb = await waitFor(p, (n) => [...document.querySelectorAll('[data-ise-view] textarea[readonly]')].some((t) => t.value.split('\n').length === n), nAll, 3000);
    check('Copy with the clipboard denied falls back to a selected read-only textarea', fb);
    await p.evaluate(() => { window.__clipFail = false; });
    const id = single.id;
    p.__dialogAnswer = false;
    await tap(p, 'miss-delete', '[data-id="' + id + '"]');
    check('Delete + dismissed confirm keeps the miss', (await getIse(p)).misses.some((m) => m.id === id));
    p.__dialogAnswer = true;
    await tap(p, 'miss-delete', '[data-id="' + id + '"]');
    const after = await getIse(p);
    check('Delete + confirm removes it from storage and the list', !after.misses.some((m) => m.id === id) && after.misses.length === nOld + 3 && (await p.locator(ISE('miss-item', '[data-id="' + id + '"]')).count()) === 0, after.misses.length + ' left');
    await p.locator(ISE('miss-text')).scrollIntoViewIfNeeded();
    await shot(p, '05-misslog');
    await einkChecks(p, 'miss log view');
  });

  await block('share + import', async () => {
    const cur = await getIse(p);
    await tap(p, 'backup');
    await clickText(p, /Copy Share Code/);
    const code = await poll(() => p.evaluate(() => window.__clip.filter((c) => c.indexOf('URO:') === 0).pop() || ''), 2500);
    let dec = null;
    try { dec = JSON.parse(Buffer.from(code.slice('URO:ISE:'.length), 'base64').toString('utf8')); } catch (e) { dec = null; }
    check('Back up → Copy Share Code gives a URO:ISE: code holding the whole plan', code.indexOf('URO:ISE:') === 0 && isDeepStrictEqual(dec, cur), short(code, 40));
    // The other device: same plan, a different miss plus a duplicate (same date + text, other id) of one of ours
    const other = JSON.parse(JSON.stringify(cur));
    const dupOf = cur.misses[0];
    other.misses = [{ id: 'mimp1', d: '2026-11-01', g: 'peds', t: 'Imported peds rule: VUR grade by VCUG' }, { id: 'mdup1', d: dupOf.d, g: dupOf.g, t: dupOf.t }];
    const code2 = 'URO:ISE:' + Buffer.from(JSON.stringify(other), 'utf8').toString('base64');
    await tap(p, 'import');
    const ta = p.locator('textarea[placeholder*="Paste share code"]');
    await ta.fill(code2);
    await p.waitForTimeout(250);
    const modal = await p.evaluate(() => { const t = document.querySelector('textarea[placeholder*="Paste share code"]'); let n = t; for (let i = 0; i < 3 && n; i++) n = n.parentElement; return n ? n.innerText : ''; });
    check('Import preview says "In-Service plan" with its summary', /In-Service plan/.test(modal) && /misses/.test(modal), short(modal.replace(/\n/g, ' / '), 240));
    const nd = p.__dialogs.length;
    await clickText(p, /✓ Import/);
    await p.waitForTimeout(400);
    const merged = await getIse(p);
    const ids = merged.misses.map((m) => m.id);
    check('Import asks to confirm the merge', p.__dialogs.length === nd + 1 && /In-Service plan/.test(p.__dialogs[nd] || ''), short(p.__dialogs[nd]));
    check('Merge keeps both sides\' misses and drops the date+text duplicate', merged.misses.length === cur.misses.length + 1 && ids.indexOf('mimp1') >= 0 && cur.misses.every((m) => ids.indexOf(m.id) >= 0) && ids.indexOf('mdup1') < 0, short(ids));
    check('Merge keeps the plan and the log', isDeepStrictEqual(merged.plan, cur.plan) && isDeepStrictEqual(merged.log, cur.log) && isDeepStrictEqual(merged.cfg, cur.cfg));
    // Load File with a bare JSON backup
    await tap(p, 'import');
    const [fc] = await Promise.all([p.waitForEvent('filechooser', { timeout: 5000 }), clickText(p, /📁 Load File/)]);
    await fc.setFiles({ name: 'in-service_plan.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(other, null, 2)) });
    const ok = await waitFor(p, () => { const t = document.querySelector('textarea[placeholder*="Paste share code"]'); let n = t; for (let i = 0; i < 3 && n; i++) n = n.parentElement; return !!n && /In-Service plan/.test(n.innerText); }, null, 4000);
    check('Load File with kind "uroISE" resolves to the In-Service plan preview (not SITE)', ok);
    await clickText(p, /^×$/);
  });

  await block('progress', async () => {
    await p.locator(ISE('progress')).evaluate((d) => { d.open = true; });
    const txt = (await textOf(p, 'progress')).replace(/\n/g, ' / ');
    check('Progress shows days left, by-group table and the weights footnote', /19 days left/.test(txt) && /By group/i.test(txt) && /Weights are estimates/.test(txt), short(txt, 200));
    await p.locator(ISE('progress')).scrollIntoViewIfNeeded();
    await shot(p, '06-progress-open');
  });

  await block('storage full', async () => {
    // Spec §B: when saving uroStudyHub_ise throws, the view shows "⚠ Not saved: storage full. Back up now."
    await p.evaluate(() => {
      const orig = Storage.prototype.setItem;
      window.__failIse = true;
      Storage.prototype.setItem = function (k, v) {
        if (k === 'uroStudyHub_ise' && window.__failIse) throw new DOMException('quota', 'QuotaExceededError');
        return orig.call(this, k, v);
      };
    });
    const stored = await getLS(p, 'uroStudyHub_ise');
    await p.locator(ISE('miss-text')).fill('Rule written while storage is full');
    await tap(p, 'miss-add');
    const t0 = Date.now();
    const soon = await waitFor(p, () => !!document.querySelector('[data-ise="save-error"]'), null, 1000);
    const late = soon || (await waitFor(p, () => !!document.querySelector('[data-ise="save-error"]'), null, 4000));
    check('Storage full: the save-error warning appears right after the failed save', soon && (await getLS(p, 'uroStudyHub_ise')) === stored,
      soon ? 'shown at once' : late ? 'shown only ' + (Date.now() - t0) + ' ms later (on an unrelated re-render)' : 'never shown within 5 s');
    await p.evaluate(() => { window.__failIse = false; });
    await p.locator(ISE('miss-text')).fill('Rule written after space was freed');
    await tap(p, 'miss-add');
    const gone = await waitFor(p, () => !document.querySelector('[data-ise="save-error"]'), null, 4000);
    const ok = /space was freed/.test((await getLS(p, 'uroStudyHub_ise')) || '');
    check('Storage freed: the next save succeeds and the warning goes away', ok && gone, 'saved=' + ok + ' warning gone=' + gone);
  });

  await block('drill these', async () => {
    await p.locator(ISE('miss-filter-group')).selectOption('stones');
    await tap(p, 'miss-filter-all');
    const want = await p.evaluate(() => { let b = null; ISE_BLOCKS.forEach((x) => { if (!b && x.g === 'stones') b = x; }); return ISE_LABEL[b.topics[0]] || b.topics[0]; });
    await tap(p, 'miss-drill');
    await waitFor(p, () => window.__lmReqs.length >= 1, null, 6000);
    const reqs = await p.evaluate(() => window.__lmReqs);
    const ms = (reqs[0] && reqs[0].body && reqs[0].body.messages) || [];
    const users = ms.filter((m) => m.role === 'user');
    check('Drill these ▶: one Mastery request whose single user message is the opener plus the stones misses', reqs.length === 1 && users.length === 1 && users[0].content.indexOf('Mastery drill on: ' + want) === 0 && /Rules I missed on practice questions/.test(users[0].content) && /- Old stones rule/.test(users[0].content) && /MASTERY DRILL/.test(ms[0].content), short(users[0] && users[0].content, 200));
  });
  errCheck('scenario C', errs);
  await ctx.close();
} catch (e) { check('scenario aborted', false, String((e && e.message) || e).split('\n')[0]); }

// =====================================================================================================
// Scenario D: Mondays off (today Mon 11-02 is an off day): Study anyway, wake past midnight, floor day,
// setup edit through the preview, delete plan
// =====================================================================================================
try {
  // D0: the plan is built on a day off (Mondays off, built Mon 11-02), so today sits before the first entry
  const offMon = L.iseSetup(L.iseNorm(null), CFG({ off: [1] }), {}, '2026-11-02');
  const { ctx, p, errs } = await openScenario('D0. plan built on a day off (Mondays off, today Mon 11/02)', {
    now: [2026, 11, 2, 9, 0],
    seed: { uroStudyHub_mode: 'light', uroStudyHub_progress: JSON.stringify({ role: 'resident' }), uroStudyHub_activePlan: 'aua', uroStudyHub_ise: JSON.stringify(offMon) },
  });
  await block('build-day off', async () => {
    await openIse(p);
    const card = p.locator(ISE('today')).first();
    const kind = await card.getAttribute('data-kind'), txt = (await card.innerText()).replace(/\n/g, ' | ');
    const row = (await textOf(p, 'dayrow', '[data-date="2026-11-02"]')).replace(/\n/g, ' | ');
    check('Build day that is a day off: Today card says Off and offers [Study anyway]', kind === 'off' && (await has(p, 'study-anyway')), 'kind ' + kind + ': ' + short(txt, 140) + ' — Next 6 days row: "' + row + '"');
  });
  await block('rollover with an unsaved log', async () => {
    // Study anyway, start a log and leave it unsaved; the device wakes at 04:01 the next day
    await tap(p, 'study-anyway');
    await tap(p, 'log-plus');
    const q0 = await p.locator(ISE('log-q')).inputValue();
    await p.evaluate(() => { window.__shiftClock((19 * 60 + 1) * 60 * 1000); document.dispatchEvent(new Event('visibilitychange')); });
    const moved = await waitFor(p, () => { const r = document.querySelector('[data-ise="dayrow"]'); return !!r && r.getAttribute('data-date') === '2026-11-03'; }, null, 3000);
    await p.waitForTimeout(300);
    const card = p.locator(ISE('today')).first();
    const d = await card.getAttribute('data-date'), txt = (await card.innerText()).replace(/\n/g, ' | ');
    const q1 = (await has(p, 'log-q')) ? await p.locator(ISE('log-q')).inputValue() : '';
    check('Rollover at 04:01 with an unsaved log: the view stays on Mon 11/2 with "Still on Mon 11/2 — your unsaved log is here" and the draft kept', moved && d === '2026-11-02' && /Still on Mon 11\/2 — your unsaved log is here/.test(txt) && q0 === '5' && q1 === '5', 'next6 rolled=' + moved + ', card ' + d + ', q ' + q0 + ' → ' + q1 + ': ' + short(txt, 160));
    await clickText(p, /^Back to today$/);
    const d2 = await p.locator(ISE('today')).first().getAttribute('data-date');
    check('…"Back to today" then shows Tue 11/3 and the notice is gone', d2 === '2026-11-03' && !/Still on/.test(await p.locator(ISE('today')).first().innerText()), d2);
  });
  errCheck('scenario D0', errs);
  await ctx.close();
} catch (e) { check('scenario aborted', false, String((e && e.message) || e).split('\n')[0]); }
try {
  // Built Sun 11-01 with Mondays off: today Mon 11-02 is an off day inside the plan, 11-01 (void1 + peds2 light) was missed
  const offMon = L.iseSetup(L.iseNorm(null), CFG({ off: [1] }), {}, '2026-11-01');
  const { ctx, p, errs } = await openScenario('D. off day, rollover, floor day, setup edit, delete', {
    now: [2026, 11, 2, 23, 50],
    seed: { uroStudyHub_mode: 'light', uroStudyHub_progress: JSON.stringify({ role: 'resident', scheduleAnchorDate: '2026-01-05' }), uroStudyHub_activePlan: 'aua', uroStudyHub_ise: JSON.stringify(offMon) },
  });

  let extraB = null;
  await block('study anyway', async () => {
    await openIse(p);
    const card = p.locator(ISE('today')).first();
    const b0 = await textOf(p, 'banner');
    check('Off day: Today card kind "off" with [Study anyway]; 2 blocks behind from Sunday', (await card.getAttribute('data-kind')) === 'off' && (await has(p, 'study-anyway')) && /2 blocks behind/.test(b0), (await card.getAttribute('data-kind')) + ' / ' + short(b0, 80));
    await tap(p, 'study-anyway');
    const kind = await card.getAttribute('data-kind');
    const tgt = parseInt(await textOf(p, 'target'), 10);
    const cov = await p.locator('[data-ise^="covered-"]').evaluateAll((els) => els.map((e) => ({ id: e.getAttribute('data-ise').slice(8), on: e.checked })));
    extraB = cov[0] && cov[0].id;
    check('Study anyway: a catch-up for the first behind block (void1), with a target and its covered tick', kind === 'extra' && tgt > 0 && cov.length === 1 && extraB === 'void1' && cov[0].on, kind + ' target ' + tgt + ' ' + short(cov));
    for (let q = 0; q < tgt; q += 5) await tap(p, 'log-plus');
    await tap(p, 'log-save');
    const ise = await poll(async () => { const v = await getIse(p); return v.log['2026-11-02'] ? v : null; });
    const lg = ise && ise.log['2026-11-02'];
    check('Study anyway Save: log k "extra" and the block counts as covered today', lg && lg.k === 'extra' && ise.done[extraB] === '2026-11-02', short(lg) + ' done=' + short(ise && ise.done));
    const bt = await textOf(p, 'banner');
    check('Banner drops to 1 block behind (Peds 2)', /^1 block behind/.test(bt) && /Peds 2/.test(bt), short(bt));
    await reload(p);
    await openIse(p);
    check('Reload: the extra day still shows its block', (await p.locator(ISE('today')).first().getAttribute('data-kind')) === 'extra');
  });

  await block('wake after midnight', async () => {
    // 23:50 → 00:01: the sprint day starts at 4 am, so late-night study still belongs to Mon 11/2
    await p.evaluate(() => { window.__shiftClock(11 * 60 * 1000); document.dispatchEvent(new Event('visibilitychange')); });
    await p.waitForTimeout(1200);
    const d0 = await p.locator(ISE('today')).first().getAttribute('data-date');
    const tt0 = (await textOf(p, 'today')).replace(/\n/g, ' | ');
    check('Waking at 00:01 keeps the Today card on Mon 11/02 (the sprint day starts at 4 am)', d0 === '2026-11-02' && /Mon 11\/2 · today/.test(tt0), d0 + ': ' + short(tt0, 80));
    // 00:01 → 04:01 (nothing unsaved on screen): the day rolls over
    await p.evaluate(() => { window.__shiftClock(4 * 3600 * 1000); document.dispatchEvent(new Event('visibilitychange')); });
    const rolled = await waitFor(p, () => { const t = document.querySelector('[data-ise="today"]'); return t && t.getAttribute('data-date') === '2026-11-03'; }, null, 3000);
    const d = await p.locator(ISE('today')).first().getAttribute('data-date');
    check('Waking at 04:01 rolls the Today card to Tue 11/03', rolled, d);
    const row = rolled ? await textOf(p, 'dayrow', '[data-date="2026-11-03"]') : '';
    const first = rolled ? await p.locator(ISE('dayrow')).first().getAttribute('data-date') : '';
    check('…and the Next 6 days list starts at the new today', first === '2026-11-03' && (/Today/.test(row) || /Tue 11\/3/.test(row)), first + ': ' + short(row.replace(/\n/g, ' | ')));
  });

  await block('floor day', async () => {
    const d = await p.locator(ISE('today')).first().getAttribute('data-date');
    const full = parseInt(await textOf(p, 'target'), 10);
    await tap(p, 'log-floor');
    const fl = parseInt(await textOf(p, 'target'), 10);
    check('Floor day toggle: target drops to min(15, target)', fl === Math.min(15, full), full + ' → ' + fl);
    await p.locator(ISE('log-q')).fill('15');
    await tap(p, 'log-save');
    const ise = await poll(async () => { const v = await getIse(p); return v.log[d] ? v : null; });
    const pill = await textOf(p, 'dayrow', '[data-date="' + d + '"]');
    check('Floor day Save: log.floor true, counts as met ("Floor met" pill)', ise && ise.log[d].floor === true && ise.log[d].q === 15 && /Floor met/.test(pill), short(ise && ise.log[d]) + ' pill: ' + short(pill.replace(/\n/g, ' | ')));
  });

  await block('setup edit', async () => {
    const before = await getIse(p);
    await tap(p, 'setup-open');
    const wk0 = (await textOf(p, 'mins-wk')).trim();
    await tap(p, 'mins-wk-plus');
    await tap(p, 'review');
    const sh = (await has(p, 'sheet')) ? (await textOf(p, 'sheet')).replace(/\n/g, ' / ') : '';
    check('Setup edit on an existing plan opens the preview sheet', /Review setup changes/.test(sh), short(sh, 200));
    await tap(p, 'sheet-apply');
    const after = await getIse(p);
    check('Apply: minsWk ' + wk0 + ' → +15, setup closes, past entries and logs kept', after.cfg.minsWk === +wk0 + 15 && !(await has(p, 'setup')) && isDeepStrictEqual(after.log, before.log) && isDeepStrictEqual(after.plan.filter((e) => e.d < '2026-11-03'), before.plan.filter((e) => e.d < '2026-11-03')), 'minsWk ' + after.cfg.minsWk);
  });

  await block('delete plan', async () => {
    const before = await getIse(p);
    await tap(p, 'setup-open');
    p.__dialogAnswer = false;
    await tap(p, 'delete-plan');
    check('Delete plan + dismissed confirm keeps the plan', !!(await getIse(p)).cfg);
    p.__dialogAnswer = true;
    await tap(p, 'delete-plan');
    const after = await getIse(p);
    check('Delete plan: cfg null and plan empty; logged days and misses kept', after.cfg === null && after.plan.length === 0 && isDeepStrictEqual(after.log, before.log) && isDeepStrictEqual(after.misses, before.misses), 'log days ' + Object.keys(after.log).length);
    check('After delete the view offers a new build', await has(p, 'build'));
    const t = await hubTasks(p);
    check('After delete: no 🎯 Hub task, and the Core reorganize task is back', !t.some((x) => x.icon === '🎯') && t.some((x) => /reorganize/.test(x.text)), short(t.map((x) => x.icon + ' ' + x.text).join(' | ')));
  });
  errCheck('scenario D', errs);
  await ctx.close();
} catch (e) { check('scenario aborted', false, String((e && e.message) || e).split('\n')[0]); }

// =====================================================================================================
// Scenario B2: behind fixture again; catch up by logging a missed day late and by "Mark covered"
// =====================================================================================================
try {
  const fixture = L.iseSetup(L.iseNorm(null), CFG(), {}, '2026-11-05');
  const { ctx, p, errs } = await openScenario('B2. behind: log a missed day late, Mark covered', {
    now: [2026, 11, 9, 9, 0],
    seed: { uroStudyHub_mode: 'light', uroStudyHub_progress: JSON.stringify({ role: 'resident' }), uroStudyHub_activePlan: 'aua', uroStudyHub_ise: JSON.stringify(fixture) },
  });
  await block('late log', async () => {
    await openIse(p);
    for (let i = 0; i < 4; i++) await tap(p, 'prev');
    const d = await p.locator(ISE('today')).first().getAttribute('data-date');
    check('◀ prev x4 reaches the missed Thu 11/05', d === '2026-11-05', d);
    const sasp0 = ((await getProg(p)).activityLog || []).filter((e) => e.type === 'sasp').length;
    for (let i = 0; i < 4; i++) await tap(p, 'log-plus');
    const on = await p.locator(ISE('covered-void1')).isChecked();
    await tap(p, 'log-save');
    const ise = await poll(async () => { const v = await getIse(p); return v.log['2026-11-05'] ? v : null; });
    const ban = await textOf(p, 'banner');
    check('Logging the missed day covers void1 and the banner drops to 5 behind', on && ise && ise.done.void1 === '2026-11-05' && /5 blocks behind/.test(ban), short(ban));
    await p.waitForTimeout(600);
    const sasp1 = ((await getProg(p)).activityLog || []).filter((e) => e.type === 'sasp').length;
    check('A late log of a past day earns no reward', sasp1 === sasp0, sasp0 + ' → ' + sasp1);
  });
  await block('mark covered', async () => {
    await p.locator(ISE('full-schedule')).evaluate((x) => { x.open = true; });
    const row = p.locator(ISE('full-schedule') + ' [data-date="2026-11-06"]');
    const rt = await row.innerText();
    check('Full schedule: the missed Fri 11/06 shows "Peds 1 → not placed yet" with Mark covered', /Peds 1 → not placed yet/.test(rt) && /Mark covered/.test(rt), short(rt.replace(/\n/g, ' | ')));
    await row.locator('button').first().click();
    await p.waitForTimeout(300);
    const ise = await getIse(p);
    const ban = await textOf(p, 'banner');
    check('Mark covered sets done.peds1 and the banner drops to 4 behind', ise.done.peds1 === '2026-11-09' && /4 blocks behind/.test(ban), short(ban));
    const rt2 = (await row.innerText()).replace(/\n/g, ' | ');
    const undo = await p.locator(ISE('uncover-peds1') + ':visible').count();
    check('The row now offers Undo (data-ise="uncover-peds1") instead of Mark covered', undo === 1 && !/Mark covered/.test(rt2), short(rt2));
    await tap(p, 'uncover-peds1');
    const un = await getIse(p);
    const ban2 = await textOf(p, 'banner');
    const rt3 = (await row.innerText()).replace(/\n/g, ' | ');
    check('Undo clears done.peds1, the banner goes back to 5 behind and the row offers Mark covered again', !un.done.peds1 && un.done.void1 === '2026-11-05' && /5 blocks behind/.test(ban2) && /Mark covered/.test(rt3), short(ban2) + ' / row: ' + short(rt3));
  });
  errCheck('scenario B2', errs);
  await ctx.close();
} catch (e) { check('scenario aborted', false, String((e && e.message) || e).split('\n')[0]); }

// =====================================================================================================
// Scenario E: the exam date has passed (today 11-23): plan for next year's ISE
// =====================================================================================================
try {
  // Non-default weekday minutes, one logged day and one miss, so "new sprint" has settings to carry and data to clear or keep
  const fixture = L.iseSetup(L.iseNorm(null), CFG({ minsWk: 150 }), {}, '2026-11-05');
  fixture.log['2026-11-05'] = { q: 30, pct: 70, floor: false, t: 30, k: 'block', b: ['void1'], g: 'void', gs: ['void'], ts: 1, rw: 1 };
  fixture.done.void1 = '2026-11-05';
  fixture.misses = [{ id: 'me1', d: '2026-11-05', g: 'void', t: 'Kept rule: mirabegron is a beta-3 agonist' }];
  const fixtureJson = JSON.stringify(L.iseNorm(fixture));
  const { ctx, p, errs } = await openScenario('E. exam passed, today Mon 11/23', {
    now: [2026, 11, 23, 9, 0],
    seed: { uroStudyHub_mode: 'light', uroStudyHub_progress: JSON.stringify({ role: 'resident', scheduleAnchorDate: '2026-01-05' }), uroStudyHub_activePlan: 'aua', uroStudyHub_ise: fixtureJson },
  });
  await block('exam passed', async () => {
    const t = await hubTasks(p);
    check('Hub after the exam: no 🎯 task; Core reorganize task is back', !t.some((x) => x.icon === '🎯') && t.some((x) => /reorganize/.test(x.text)), short(t.map((x) => x.icon + ' ' + x.text).join(' | ')));
    await openIse(p);
    const ban = p.locator(ISE('banner')).first();
    const st = await ban.getAttribute('data-state'), bt = (await ban.innerText()).replace(/\n/g, ' / ');
    check('Banner: state "exam", "This plan\'s exam date has passed. Start a new sprint…" with a [Start a new sprint] button and no reshuffle', st === 'exam' && /^This plan's exam date has passed\. Start a new sprint to plan for the next one\./.test(bt) && (await has(p, 'new-sprint')) && (await p.locator(ISE('banner') + ' ' + ISE('reshuffle')).count()) === 0, st + ': ' + short(bt));
    const before = await getLS(p, 'uroStudyHub_ise');
    p.__dialogAnswer = false;
    const nd = p.__dialogs.length;
    await tap(p, 'new-sprint');
    check('Start a new sprint asks to confirm; dismissing it changes nothing', p.__dialogs.length === nd + 1 && /Start a new sprint\?/.test(p.__dialogs[nd] || '') && (await getLS(p, 'uroStudyHub_ise')) === before && (await has(p, 'banner')), short(p.__dialogs[nd]));
    p.__dialogAnswer = true;
    await tap(p, 'setup-open');
    const ex = await p.locator(ISE('exam-date')).inputValue();
    check('Setup proposes next year\'s exam (2027-11-20)', ex === '2027-11-20', ex);
    const t0 = Date.now();
    await tap(p, 'review');
    await tap(p, 'sheet-apply');
    const ms = Date.now() - t0;
    const ise = await getIse(p);
    const st2 = await p.locator(ISE('banner')).first().getAttribute('data-state');
    check('Apply: exam 2027-11-20, a fresh plan from today, state no longer "exam"', ise.cfg.exam === '2027-11-20' && ise.plan.some((e) => e.d === '2026-11-23') && st2 !== 'exam', 'state ' + st2 + ', ' + ise.plan.length + ' entries, ' + ms + ' ms');
  });
  await block('new sprint', async () => {
    // Back to the exam-passed fixture, then confirm [Start a new sprint]
    await p.evaluate((v) => localStorage.setItem('uroStudyHub_ise', v), fixtureJson);
    await reload(p);
    await openIse(p);
    await tap(p, 'new-sprint');
    const shown = await waitFor(p, () => !!document.querySelector('[data-ise="setup"]') && !document.querySelector('[data-ise="banner"]'), null, 5000);
    const ns = await getIse(p);
    check('Confirmed new sprint: a fresh setup; stored cfg null, no plan, logs and covered blocks cleared, the miss log kept', shown && ns && ns.kind === 'uroISE' && ns.cfg === null && ns.plan.length === 0 && Object.keys(ns.log).length === 0 && Object.keys(ns.done).length === 0 && ns.misses.length === 1 && ns.misses[0].id === 'me1', short(ns && { cfg: ns.cfg, plan: ns.plan.length, log: Object.keys(ns.log).length, done: ns.done, misses: ns.misses.length, prefs: ns.prefs }, 240));
    const ex = await p.locator(ISE('exam-date')).inputValue();
    const wk = (await textOf(p, 'mins-wk')).trim();
    check('New-sprint setup defaults from the old settings (150 min on weekdays) with next year\'s exam (2027-11-20)', ex === '2027-11-20' && /^150\b/.test(wk) && ns.prefs && ns.prefs.minsWk === 150, 'exam ' + ex + ', weekdays "' + wk + '"');
    await tap(p, 'build');
    await p.waitForSelector(ISE('today'), { timeout: 8000 });
    const nb = await getIse(p);
    const st = await p.locator(ISE('banner')).first().getAttribute('data-state');
    check('Build after the new sprint: exam 2027-11-20, 150 min weekdays, plan from today, not "exam", misses still there', nb.cfg && nb.cfg.exam === '2027-11-20' && nb.cfg.minsWk === 150 && nb.built === '2026-11-23' && nb.plan.length > 0 && nb.plan[0].d >= '2026-11-23' && st !== 'exam' && nb.misses.length === 1, 'state ' + st + ', ' + nb.plan.length + ' entries, first ' + (nb.plan[0] && nb.plan[0].d));
  });
  errCheck('scenario E', errs);
  await ctx.close();
} catch (e) { check('scenario aborted', false, String((e && e.message) || e).split('\n')[0]); }

await browser.close();
console.log('\n' + nPass + ' passed, ' + nFail + ' failed. Screenshots: ' + OUT);
if (nFail) { console.log('Failures:\n- ' + failures.join('\n- ')); process.exit(1); }
