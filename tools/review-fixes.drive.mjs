// Headless-Chrome drive of the fixes from the 2026-11 outside review, on a 390 px phone (Playwright; APIs stubbed):
// the feature switches a trimmed tutor window holds off (and the same page with a host's text swaps applied), per-plan
// topic ticks, the local study day, Reorganize's "ahead / behind", cut-off replies, Anki export / AnkiConnect errors,
// share codes pasted with their header, the Pomodoro after the phone was locked, reminders after a reload, an unreadable
// or full save, and the UI quick wins (style preview, empty chat, no AI connected, Settings, Anki tabs, Import).
// Needs a static server on the repo root (launch config "urostudyhub", or `python3 -m http.server 2043`) and a built
// UroStudyHub.min.html (`python3 build.py`).
//
// Run:   node tools/review-fixes.drive.mjs
// Env:   URL=...      page to test (default http://localhost:2043/UroStudyHub.min.html)
//        SHOTS=...    folder for screenshots (default: a new temp dir; the path is printed at the end)
//        CHROME=...   a Chrome/Chromium binary to use instead of Playwright's own
//        ONLY=A       run only the blocks whose name starts with this
// Prints PASS/FAIL per check; exits 1 when any check fails.
import { createRequire } from 'node:module';
import { mkdtemp, mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const require = createRequire(import.meta.url);
let chromium;
for (const m of ['playwright', 'playwright-core', '@playwright/test']) {
  try { ({ chromium } = require(m)); if (chromium) break; } catch (e) { /* next */ }
}
if (!chromium) { try { ({ chromium } = await import('playwright')); } catch (e) { /* below */ } }
if (!chromium) { console.log('FAIL setup: Playwright not found (npm i -D playwright, or set NODE_PATH)'); process.exit(1); }

const PAGE_URL = process.env.URL || 'http://localhost:2043/UroStudyHub.min.html';
const SHOTS = process.env.SHOTS || (await mkdtemp(join(tmpdir(), 'review-fixes-')));
await mkdir(SHOTS, { recursive: true });
const PHONE = { width: 390, height: 844 };

let nPass = 0, nFail = 0;
function check(name, ok, detail) {
  if (ok) { nPass++; console.log('PASS ' + name + (detail ? '  (' + detail + ')' : '')); }
  else { nFail++; console.log('FAIL ' + name + (detail ? ' — ' + detail : '')); }
  return !!ok;
}
async function block(name, fn) {
  if (process.env.ONLY && !name.startsWith(process.env.ONLY)) return;
  console.log('\n— ' + name);
  try { await fn(); } catch (e) { check(name + ' (step threw)', false, String(e && e.message ? e.message : e).split('\n')[0]); }
}

// ---------- the page, seeded and stubbed ----------
// OpenAI chat (queued replies: { text, finish }), AnkiConnect (window.__anki answers by action), and a record of every
// AI request (window.__ai) and of any request to a local model (window.__local).
function pageInit(arg) {
  try {
    if (!sessionStorage.getItem('__seeded')) {
      localStorage.clear();
      Object.keys(arg.seed).forEach(function (k) { localStorage.setItem(k, arg.seed[k]); });
      sessionStorage.setItem('__seeded', '1');
    }
  } catch (e) { /* ignore */ }
  if (arg.quota) {
    // storage that holds at most arg.quota characters of progress (a phone's full storage)
    var realSet = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) {
      if (k === 'uroStudyHub_progress' && String(v).length > arg.quota) { var e = new Error('quota'); e.name = 'QuotaExceededError'; throw e; }
      return realSet.call(this, k, v);
    };
  }
  if (arg.notif) {
    // headless Chromium answers requestPermission "granted" but still reports permission "denied": a consistent stub
    var N = function () {}; N.permission = 'default';
    N.requestPermission = function () { N.permission = 'granted'; try { localStorage.setItem('__notif', 'granted'); } catch (e) { /* ignore */ } return Promise.resolve('granted'); };
    try { if (localStorage.getItem('__notif') === 'granted') N.permission = 'granted'; } catch (e) { /* ignore */ }
    window.Notification = N;
  }
  if (arg.chromeExt) window.chrome = { runtime: { sendMessage: function (id, msg, cb) { if (cb) setTimeout(function () { cb({ ok: true, cases: [] }); }, 0); } } };
  window.__ai = []; window.__local = []; window.__q = []; window.__anki = {};
  var realFetch = window.fetch.bind(window);
  window.fetch = function (u, o) {
    var url = typeof u === 'string' ? u : (u && u.url) || String(u);
    var body = null;
    try { body = JSON.parse(o && o.body); } catch (e) { body = null; }
    if (/localhost:1234/.test(url)) { window.__local.push(url); return Promise.reject(new TypeError('Failed to fetch')); }
    if (/localhost:8765/.test(url)) {
      var ans = window.__anki[body && body.action] || { result: null, error: 'unsupported action' };
      return Promise.resolve(new Response(JSON.stringify(ans), { status: 200, headers: { 'content-type': 'application/json' } }));
    }
    if (!/api\.openai\.com\/v1\/chat\/completions/.test(url)) return realFetch(u, o);
    window.__ai.push(body);
    var r = window.__q.length ? window.__q.shift() : { text: 'Noted.' };
    var text = r.text, finish = r.finish || 'stop';
    if (!body || !body.stream) {
      return Promise.resolve(new Response(JSON.stringify({ choices: [{ message: { content: text }, finish_reason: finish }], usage: { prompt_tokens: 10, completion_tokens: 5 } }), { status: 200, headers: { 'content-type': 'application/json' } }));
    }
    var enc = new TextEncoder();
    var stream = new ReadableStream({
      start: function (ctl) {
        ctl.enqueue(enc.encode('data: ' + JSON.stringify({ choices: [{ delta: { content: text } }] }) + '\n\n'));
        ctl.enqueue(enc.encode('data: ' + JSON.stringify({ choices: [{ delta: {}, finish_reason: finish }] }) + '\n\n'));
        ctl.enqueue(enc.encode('data: [DONE]\n\n'));
        ctl.close();
      },
    });
    return Promise.resolve(new Response(stream, { status: 200, headers: { 'content-type': 'text/event-stream' } }));
  };
}
const KNOWN_HARMLESS = [/exceeds the max of 500KB/i, /ERR_CONNECTION_REFUSED/, /localhost:1234/, /localhost:8765/, /Failed to fetch/];
const LM = JSON.stringify({ ep: 'http://localhost:1234', provider: 'openai', model: 'gpt-4o', openaiKey: 'sk-test', openaiModel: 'gpt-4o' });
const TODAY_UTC = new Date(Date.now() - 4 * 3600e3).toLocaleDateString('en-CA', { timeZone: 'America/Chicago' });  // the app's study day in the test time zone
// arcadeV: no one-time arcade refund on load (it would add coins); the login bonus is already claimed today
const prog = (extra) => JSON.stringify(Object.assign({ role: 'resident', lastLoginDate: TODAY_UTC, studyGroup: 'A', arcadeV: 2 }, extra || {}));
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});

// The text swaps a host (the tutor window of Andrew's harness app) applies to the built page; the flag swap also holds the
// three new switches off, as that host is meant to once this lands.
const HOST_SWAPS = [
  ['var ff = s.featureFlags || {};', 'var ff = Object.assign({}, s.featureFlags || {}, { games: false, shop: false, gamification: false, links: false, orSkills: false, subI: false, opLog: false });'],
  ['if (v.id === "links" && ff.links === false) return false;', 'if (v.id === "links" && ff.links === false) return false; if (v.id === "refs" || v.id === "student") return false;'],
  ['if (v.id === "games" && ff.games === false) return false;', 'if (v.id === "games" && ff.games === false) return false; if (v.id === "hub") return false;'],
  ['{page !== "hub" && !TUTOR_APP && <button aria-label="Back to Hub"', '{false && <button aria-label="Back to Hub"'],
  ['var [page, setPage] = useState(TUTOR_APP ? "chat" : "hub");', 'var [page, setPage] = useState("tracker");'],
  ['navigator.serviceWorker.register("sw.js")', 'new Promise(function () {})'],
];

async function open(o) {
  o = o || {};
  const ctx = await browser.newContext({ viewport: PHONE, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
    timezoneId: o.tz || 'America/Chicago', permissions: o.permissions || [], acceptDownloads: true });
  const seed = Object.assign({ uroStudyHub_progress: prog(o.prog), uroStudyHub_lmSettings: LM, uroStudyHub_mode: 'light' }, o.seed || {});
  if (o.rawProgress !== undefined) seed.uroStudyHub_progress = o.rawProgress;
  await ctx.addInitScript(pageInit, { seed, quota: o.quota || 0, chromeExt: !!o.chromeExt, notif: !!o.notif });
  const swaps = { n: 0, missing: [] };
  if (o.hostSwaps) {
    await ctx.route((u) => u.pathname.endsWith('/UroStudyHub.min.html'), async (route) => {
      const resp = await route.fetch();
      let html = await resp.text();
      for (const [a, b] of HOST_SWAPS) { if (html.includes(a)) { html = html.split(a).join(b); swaps.n++; } else swaps.missing.push(a); }
      await route.fulfill({ response: resp, body: html });
    });
  }
  const p = await ctx.newPage();
  if (o.clock) await p.clock.install({ time: o.clock });
  if (o.fixedTime) await p.clock.setFixedTime(o.fixedTime);
  const errs = [];
  p.on('pageerror', (e) => errs.push('pageerror ' + e.message));
  p.on('console', (m) => { if (m.type() !== 'error') return; const t = m.text(); if (!KNOWN_HARMLESS.some((re) => re.test(t))) errs.push(t.slice(0, 200)); });
  p.on('dialog', (d) => d.accept().catch(() => {}));
  await p.goto(PAGE_URL);
  await boot(p);
  return { ctx, p, errs, swaps };
}
async function boot(p) {
  await p.waitForFunction(() => { const r = document.getElementById('root'); return r && r.children.length > 0 && !!document.querySelector('[data-nav]'); }, null, { timeout: 90000 });
  await p.waitForTimeout(500);
}
async function reload(p) { await p.reload(); await boot(p); }
const getProg = async (p) => JSON.parse((await p.evaluate(() => localStorage.getItem('uroStudyHub_progress'))) || 'null');
const body = (p) => p.locator('body').innerText();
const has = async (p, sel) => (await p.locator(sel).count()) > 0;
const vis = async (p, sel) => { const l = p.locator(sel); return (await l.count()) > 0 && (await l.first().isVisible()); };
const shot = (p, name) => p.screenshot({ path: join(SHOTS, name + '.png') });
const errCheck = (label, errs) => { check('no console errors · ' + label, errs.length === 0, errs.slice(0, 3).join(' | ')); errs.length = 0; };
async function nav(p, id) { await p.locator('button[data-nav="' + id + '"]').first().click(); await p.waitForTimeout(300); }
async function studyTab(p, label) { await nav(p, 'tracker'); await p.locator('button', { hasText: new RegExp('^\\S+ ' + label + '$') }).first().click(); await p.waitForTimeout(300); }
async function connect(p) {
  await p.locator('[data-aipick]').click();
  await p.locator('[data-aipick-prov="openai"]').click();
  if (await vis(p, '[data-aipick-panel]')) await p.locator('[data-aipick]').click();
  await p.waitForTimeout(200);
}
const queue = (p, ...rs) => p.evaluate((x) => { window.__q.push(...x); }, rs);
const nAi = (p) => p.evaluate(() => window.__ai.length);
async function waitAi(p, n) { await p.waitForFunction((k) => window.__ai.length >= k, n, { timeout: 8000 }); await p.waitForTimeout(400); }
async function send(p, text) { await p.locator('input[data-chat-input]').fill(text); await p.locator('input[data-chat-input]').press('Enter'); }
// The first n AUA Core topic keys ("phase-section-topic"), from the served page's AUA_PHASES
let AUA_KEYS = [];
try {
  const html = await (await fetch(PAGE_URL)).text();
  const m = html.match(/^const AUA_PHASES = (\[[\s\S]*?\n\]);/m);
  new Function('return ' + m[1] + ';')().forEach((ph, pi) => ph.sections.forEach((sec, si) => sec.topics.forEach((t, ti) => AUA_KEYS.push(pi + '-' + si + '-' + ti))));
} catch (e) { console.log('FAIL setup: cannot read AUA_PHASES from ' + PAGE_URL + ' (' + e.message + ')'); process.exit(1); }
const doneTopics = (n, date) => { const o = {}; AUA_KEYS.slice(0, n).forEach((k) => { o[k] = date; }); return o; };

// ═══ A. feature switches ═══
const OFF = { games: false, shop: false, gamification: false, links: false, orSkills: false, subI: false, opLog: false, prefCards: true };
await block('A1. Switches off: no ranks, coins, OR Skills, Sub-I or Op Log', async () => {
  const { ctx, p, errs } = await open({ prog: { role: 'student', featureFlags: OFF, coins: 0, xp: 900, streak: 6, lastDay: '2026-01-01',
    scheduleAnchorDate: '2026-01-05', ankiCards: [{ id: 1, type: 'basic', front: 'Front A', back: 'Back A', tags: [] }] } });
  const navIds = await p.evaluate(() => [...document.querySelectorAll('[data-nav]')].map((b) => b.getAttribute('data-nav')));
  check('bottom bar: no Games, Links or Sub-I (student role)', ['games', 'links', 'student'].every((x) => navIds.indexOf(x) < 0), navIds.join(','));
  await nav(p, 'tracker');
  const tabs = await p.evaluate(() => [...document.querySelectorAll('button')].map((b) => b.textContent.trim()).filter((t) => /^\S+ (Schedule|Plans|Core|Op Log|Stats)$/.test(t)));
  check('Study tabs: no Op Log', tabs.length >= 4 && !tabs.some((t) => /Op Log/.test(t)), tabs.join(' | '));
  await shot(p, 'a1-schedule-trimmed');
  // Reorganize: free, no coins, no streak price
  const reo = p.locator('button', { hasText: /^Reorganize$/ }).first();
  check('behind pace: the Reorganize banner shows', (await reo.count()) > 0);
  await reo.click();
  await p.waitForTimeout(300);
  const modal = await body(p);
  check('Reorganize: no coin cost or "Need N more coins"', !/coins/i.test(modal.split('Reorganize Schedule')[1] || modal), (modal.match(/[^\n]*coins[^\n]*/i) || [''])[0]);
  const go = p.locator('[data-reorg-go]');
  const coins0 = (await getProg(p)).coins;
  check('…and its button works with 0 coins', (await go.isEnabled()) && /Reorganize Schedule/.test(await go.innerText()));
  await shot(p, 'a1-reorganize-free');
  await go.click();
  await p.waitForTimeout(400);
  const pr = await getProg(p);
  check('…reorganized without touching coins (0) or the streak', coins0 === 0 && pr.coins === 0 && pr.streak === 6 && pr.lastReorgDate, JSON.stringify({ coins: coins0 + ' → ' + pr.coins, streak: pr.streak, reorg: pr.lastReorgDate }));
  // Plans: no Sub-I card
  await studyTab(p, 'Plans');
  check('Plans: no Sub-I plan card', !(await has(p, '[data-plan="subi"]')) && !/Sub-I Rotation Schedule/.test(await body(p)));
  // Stats: no rank grid; the heatmap has a legend and themed open squares
  await studyTab(p, 'Stats');
  check('Stats: no rank grid', !(await has(p, '[data-rank-grid]')) && !/Pre-Med/.test(await body(p)));
  check('Stats: heatmap legend', await vis(p, '[data-heat-legend]'));
  const cellBg = await p.locator('[data-heat-cell="open"]').first().evaluate((el) => getComputedStyle(el).backgroundColor);
  const pageBg = await p.evaluate(() => getComputedStyle(document.body).backgroundColor);
  check('Stats: open squares follow the light theme (not the dark #1f2937)', cellBg !== 'rgb(31, 41, 55)', cellBg + ' on ' + pageBg);
  await shot(p, 'a1-stats-light');
  // Tutor: no OR Skills, no cost pill while no AI is connected
  await nav(p, 'chat');
  check('Tutor: no OR Skills button or card', !(await has(p, '[data-orskills-btn]')) && !(await has(p, '[data-orskills-card]')));
  check('Tutor: no cost pill while no AI is connected', !(await has(p, '[data-cost]')));
  // Anki: a session summary without XP / coins
  await nav(p, 'anki');
  await p.getByRole('button', { name: /^▶ Review \d+ cards?$/ }).click();
  for (let i = 0; i < 6; i++) {
    const t = await body(p);
    if (/Queue cleared|Nice session|Nothing to review/.test(t) && !/Show answer/.test(t)) break;
    if (await p.getByRole('button', { name: /^Show answer$/ }).count()) { await p.getByRole('button', { name: /^Show answer$/ }).click(); await p.waitForTimeout(100); }
    await p.getByRole('button', { name: /^Easy/ }).click();
    await p.waitForTimeout(200);
  }
  const sum = await body(p);
  check('Anki: the session summary shows', /Queue cleared|Nice session/.test(sum));
  check('Anki: …with no "+N XP · +N coins" and no streak', !(await has(p, '[data-anki-reward]')) && !/\+\d+ XP|coins|day streak/.test(sum), (sum.match(/[^\n]*(XP|coins|streak)[^\n]*/) || [''])[0]);
  await shot(p, 'a1-anki-summary');
  errCheck('A1', errs);
  await ctx.close();
});

await block('A2. Switches on (the default): ranks, OR Skills, Sub-I and Op Log are there', async () => {
  const { ctx, p, errs } = await open({ prog: { role: 'student' } });
  const navIds = await p.evaluate(() => [...document.querySelectorAll('[data-nav]')].map((b) => b.getAttribute('data-nav')));
  check('bottom bar: Sub-I tab for a student', navIds.indexOf('student') >= 0, navIds.join(','));
  await nav(p, 'tracker');
  check('Study tabs: Op Log', /🔗 Op Log/.test(await body(p)));
  await studyTab(p, 'Plans');
  check('Plans: the Sub-I plan card', await has(p, '[data-plan="subi"]'));
  await studyTab(p, 'Stats');
  check('Stats: the rank grid', await vis(p, '[data-rank-grid]'));
  await nav(p, 'chat');
  check('Tutor: OR Skills button and card', (await has(p, '[data-orskills-btn]')) && (await has(p, '[data-orskills-card]')));
  errCheck('A2', errs);
  await ctx.close();
});

await block('A3. The trimmed window (the host\'s text swaps on the built page)', async () => {
  const { ctx, p, errs, swaps } = await open({ hostSwaps: true, prog: { role: 'student', coins: 0, scheduleAnchorDate: '2026-01-05' } });
  check('every anchor the host swaps is in the built page', swaps.missing.length === 0 && swaps.n === HOST_SWAPS.length, swaps.missing.join(' | '));
  const navIds = await p.evaluate(() => [...document.querySelectorAll('[data-nav]')].map((b) => b.getAttribute('data-nav')));
  check('bottom bar: Study, Tutor, Anki only', navIds.join(',') === 'tracker,chat,anki', navIds.join(','));
  check('no XP / coin strip', !/\bXP\b|💰/.test(await body(p)));
  check('Study tabs: no Op Log', !/Op Log/.test(await body(p)));
  await p.locator('button', { hasText: /^Reorganize$/ }).first().click();
  await p.waitForTimeout(300);
  check('Reorganize: free', !/more coins|Cost:/.test(await body(p)) && (await p.locator('[data-reorg-go]').isEnabled()));
  await p.keyboard.press('Escape');
  await p.locator('button', { hasText: /^Cancel$/ }).first().click();
  await studyTab(p, 'Plans');
  check('Plans: no Sub-I plan', !(await has(p, '[data-plan="subi"]')));
  await studyTab(p, 'Stats');
  check('Stats: no rank grid', !(await has(p, '[data-rank-grid]')));
  await shot(p, 'a3-host-stats');
  await nav(p, 'chat');
  check('Tutor: no OR Skills', !(await has(p, '[data-orskills-btn]')) && !(await has(p, '[data-orskills-card]')));
  await p.locator('[data-hdr-import]').click().catch(() => {});
  await p.waitForTimeout(200);
  const imp = await has(p, '[data-import-copy]') ? await p.locator('[data-import-copy]').innerText() : '';
  check('Import (no Guide here): the copy offers only the In-Service backup', !imp || (/In-Service/.test(imp) && !/attending|site notes|card packs/i.test(imp)), imp.slice(0, 90));
  await shot(p, 'a3-host-tutor');
  errCheck('A3', errs);
  await ctx.close();
});

await block('A4. SurgiLog: the "paste your Extension ID" warning only where Chrome extensions exist', async () => {
  for (const ext of [false, true]) {
    const { ctx, p, errs } = await open({ chromeExt: ext });
    await studyTab(p, 'Op Log');
    const shown = /SurgiLog not connected/.test(await body(p));
    check(ext ? 'desktop Chrome (chrome.runtime): warning shown' : 'no chrome.runtime (iPhone): no warning', ext ? shown : !shown);
    if (!ext) await shot(p, 'a4-oplog-phone');
    errCheck('A4 ' + ext, errs);
    await ctx.close();
  }
});

// ═══ B. bugs ═══
await block('B1. Each plan keeps its own ticks (old ticks stay with AUA Core)', async () => {
  const { ctx, p, errs } = await open({ prog: { done: doneTopics(12, '2026-03-02') }, seed: { uroStudyHub_activePlan: 'aua' } });
  const pct = async () => { await nav(p, 'hub'); return ((await body(p)).match(/(\d+)% complete/) || [])[1]; };
  const aua0 = await pct();
  check('AUA Core: the existing ticks count', +aua0 > 0, aua0 + '%');
  await studyTab(p, 'Plans');
  await p.locator('[data-plan="subi"]').click();
  await p.waitForTimeout(300);
  check('Sub-I plan: none of AUA\'s ticks', (await pct()) === '0', (await pct()) + '%');
  await studyTab(p, 'Schedule');
  await p.locator('button', { hasText: /^Done$/ }).first().click();
  await p.waitForTimeout(300);
  const keys = Object.keys((await getProg(p)).done);
  check('a Sub-I tick is saved under its own key', keys.some((k) => /^subi:\d+-\d+-\d+$/.test(k)) && keys.length === 13 && keys.filter((k) => /^\d/.test(k)).length === 12, keys.filter((k) => /subi/.test(k)).join(','));
  check('Sub-I counts only its own tick', +(await pct()) > 0);
  await studyTab(p, 'Plans');
  await p.locator('button, div', { hasText: /^🏥AUA Core Curriculum/ }).first().click().catch(async () => { await p.getByText('AUA Core Curriculum', { exact: true }).last().click(); });
  await p.waitForTimeout(300);
  check('back on AUA Core: its own count, unchanged', (await pct()) === aua0, aua0 + '% → ' + (await pct()) + '%');
  errCheck('B1', errs);
  await ctx.close();
});

await block('B2. "Today" is the local day (7:30 pm in Chicago is not tomorrow)', async () => {
  const evening = new Date('2026-11-28T01:30:00Z');  // Nov 27, 7:30 pm CST
  const { ctx, p, errs } = await open({ fixedTime: evening, prog: { lastLoginDate: '2026-11-27' } });
  await studyTab(p, 'Schedule');
  await p.locator('button', { hasText: /^Done$/ }).first().click();
  await p.waitForTimeout(300);
  const pr = await getProg(p);
  const dates = Object.values(pr.done);
  check('the tick is dated Nov 27 (UTC would say Nov 28)', dates.length === 1 && dates[0] === '2026-11-27', JSON.stringify(dates));
  check('the streak day is Nov 27 too', pr.lastDay === '2026-11-27', pr.lastDay);
  await studyTab(p, 'Op Log');
  const d = await p.locator('input[type="date"]').first().inputValue();
  check('a new Op Log case defaults to Nov 27', d === '2026-11-27', d);
  errCheck('B2', errs);
  await ctx.close();
});

await block('B3. Reorganize compares the topics done since, not lifetime', async () => {
  const t0 = new Date('2026-06-01T15:00:00Z');
  let o = await open({ fixedTime: t0, prog: { done: doneTopics(30, '2026-01-05'), scheduleAnchorDate: '2026-01-05', coins: 100, lastLoginDate: '2026-06-01' } });
  await studyTab(o.p, 'Schedule');
  await o.p.locator('button', { hasText: /^Reorganize$/ }).first().click();
  await o.p.locator('[data-reorg-go]').click();
  await o.p.waitForTimeout(300);
  const pr = await getProg(o.p);
  check('Reorganize saves the plan\'s tick count with the anchor', pr.scheduleAnchorDone === 30 && pr.scheduleAnchorPlan === 'aua' && pr.scheduleAnchorDate === '2026-06-01', JSON.stringify({ n: pr.scheduleAnchorDone, plan: pr.scheduleAnchorPlan, d: pr.scheduleAnchorDate }));
  const seedAfter = JSON.stringify(pr);
  await o.ctx.close();
  // three weeks later, nothing new done: behind (it used to read 30 done vs ~3 weeks expected, "ahead")
  o = await open({ fixedTime: new Date('2026-06-23T15:00:00Z'), rawProgress: seedAfter });
  await studyTab(o.p, 'Schedule');
  const t = await body(o.p);
  check('3 weeks on with nothing done: "behind pace", actual 0', /topics behind pace/.test(t) && /Actual: 0\b/.test(t), (t.match(/Expected:[^\n]*/) || ['no banner'])[0]);
  await shot(o.p, 'b3-behind-after-reorg');
  errCheck('B3', o.errs);
  await o.ctx.close();
});

await block('B4. A reply cut off at the length limit says so, with Continue / Regenerate', async () => {
  const { ctx, p, errs } = await open();
  await nav(p, 'chat');
  await connect(p);
  await queue(p, { text: 'The transition zone grows and the', finish: 'length' }, { text: 'urethra narrows. Done.' });
  await send(p, 'Explain BPH');
  await waitAi(p, 1);
  check('cut-off reply: marked as cut off', await vis(p, '[data-cutoff]'));
  check('…with Continue and Regenerate', (await vis(p, '[data-cutoff-continue]')) && (await vis(p, '[data-cutoff-regen]')));
  await shot(p, 'b4-cutoff');
  await p.locator('[data-cutoff-continue]').click();
  await waitAi(p, 2);
  const last = await p.evaluate(() => { const m = window.__ai[1].messages; return m[m.length - 1]; });
  check('Continue asks for the rest', last.role === 'user' && /Continue exactly where/.test(last.content), last.content);
  check('only role + content go to the API (no app marks)', await p.evaluate(() => window.__ai[1].messages.every((m) => Object.keys(m).sort().join() === 'content,role')));
  check('the finished reply has no cut-off mark', (await p.locator('[data-cutoff]').count()) === 1 && !(await vis(p, '[data-cutoff-continue]')));
  // Anki cards from a cut-off reply: the complete ones are kept, and it says why
  await nav(p, 'anki');
  await p.locator('button', { hasText: /📄 Generate/ }).first().click();
  await p.waitForTimeout(200);
  await p.locator('input[type=file]').last().setInputFiles({ name: 'BPH.md', mimeType: 'text/markdown', buffer: Buffer.from('# BPH\n\nThe transition zone grows. Alpha-blockers relax smooth muscle; 5-ARIs shrink the gland over 6 months.') });
  await p.getByRole('button', { name: /Generate Cards from Document/ }).waitFor({ timeout: 5000 });
  await queue(p, { text: '[{"type":"basic","front":"Zone of BPH?","back":"Transition zone"},{"type":"basic","front":"5-ARI effect?","back":"Shrinks the gland"},{"type":"basic","front":"Alpha', finish: 'length' });
  await p.getByRole('button', { name: /Generate Cards from Document/ }).click();
  await p.waitForFunction(() => /Done! \d+ cards from/.test(document.body.innerText), null, { timeout: 8000 });
  const t = await body(p);
  check('Anki from a document: a cut-off section keeps its complete cards and says it was cut off', /Done! 2 cards from 1 sections/.test(t) && /cut off at the length limit/.test(t), (t.match(/Done![^\n]*/) || [''])[0]);
  errCheck('B4', errs);
  await ctx.close();
});

await block('B7/B8. Anki: the text export is HTML-safe; AnkiConnect errors are reported', async () => {
  const card = { id: 7, type: 'basic', front: 'PSA < 4 & rising?\nSecond line', back: 'Use "PSA density"', tags: ['bph'] };
  const cl = { id: 8, type: 'cloze', text: '{{c1::Gleason}} > 7\nmeans high grade', tags: [] };
  const { ctx, p, errs } = await open({ prog: { ankiCards: [card, cl] } });
  await nav(p, 'anki');
  const subBar = await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => /📖 Review/.test(x.textContent)); return b ? b.parentElement.innerText : ''; });
  check('the Anki sub-tab bar no longer holds "Open Anki"', subBar && !/Open Anki/.test(subBar), subBar.replace(/\n/g, ' | '));
  await p.locator('button', { hasText: /📇 Cards/ }).click();
  await p.waitForTimeout(250);
  check('…it is in Cards, full width', await vis(p, '[data-open-anki]'));
  await shot(p, 'b7-anki-cards');
  const files = [];
  p.on('download', (d) => files.push(d));
  await p.getByRole('button', { name: /Download for Anki Import/ }).click();
  await p.waitForTimeout(1200);
  const texts = await Promise.all(files.map(async (d) => readFile(await d.path(), 'utf8')));
  const basic = texts.find((t) => /#notetype:Basic/.test(t)) || '', cloze = texts.find((t) => /#notetype:Cloze/.test(t)) || '';
  check('basic export: one line per note, <br> for line breaks, & < " escaped', /\nPSA &lt; 4 &amp; rising\?<br>Second line\tUse &quot;PSA density&quot;\tbph$/.test(basic.trimEnd()), JSON.stringify(basic.split('\n').pop()));
  check('cloze export: braces kept, > escaped, <br>', /\{\{c1::Gleason\}\} &gt; 7<br>means high grade\t/.test(cloze), JSON.stringify(cloze.split('\n').pop()));
  // AnkiConnect: a missing note type is a failure, not "0 added"
  await p.evaluate(() => { window.__anki = { version: { result: 6, error: null }, createDeck: { result: 1, error: null }, addNotes: { result: null, error: 'model was not found: Basic' } }; });
  await p.getByText('Advanced: Direct Push via AnkiConnect').click();
  await p.getByRole('button', { name: /Check Connection/ }).click();
  await p.getByRole('button', { name: /Push to Anki/ }).click();
  await p.waitForTimeout(500);
  const t = await body(p);
  check('push: Anki\'s error is shown (not "Done! 0 added")', /not added\. Anki said: model was not found/.test(t) && !/Done! 0 added/.test(t), (t.match(/[^\n]*(Anki said|added)[^\n]*/) || [''])[0]);
  await p.evaluate(() => { window.__anki.addNotes = { result: null, error: "['cannot create note because it is a duplicate', 'cannot create note because it is a duplicate']" }; });
  await p.getByRole('button', { name: /Push to Anki/ }).click();
  await p.waitForTimeout(500);
  check('push: duplicates-only errors read as duplicates', /2 duplicates skipped/.test(await body(p)));
  errCheck('B7/B8', errs);
  await ctx.close();
});

await block('B9. A share code imports with the share sheet\'s header around it', async () => {
  const { ctx, p, errs } = await open();
  const code = 'URO:PACK:' + Buffer.from(JSON.stringify({ packs: [{ name: 'Stones pack', hidden: {} }], currentHidden: {} }), 'utf8').toString('base64');
  await p.locator('[data-hdr-import]').click();
  await p.waitForTimeout(200);
  const copy = await p.locator('[data-import-copy]').innerText();
  check('Import copy (Guide on): offers attending prefs, site notes and card packs', /attending prefs, site notes, or card packs/.test(copy));
  await p.locator('textarea').first().fill('📚 UroStudy — Card Packs\n\nPaste this code in UroStudy → Import:\n\n' + code + '\n\nSent from my iPhone');
  await p.waitForTimeout(300);
  check('the pasted text is recognized as a Card Packs code', /Stones pack/.test(await body(p)), (await body(p)).match(/Card Packs[^\n]*/) ? 'preview shown' : 'no preview');
  await shot(p, 'b9-import');
  errCheck('B9', errs);
  await ctx.close();
});

await block('B10. Pomodoro: a phase that ended while the phone was locked is over when you come back', async () => {
  const t0 = new Date('2026-11-27T15:00:00Z');
  const { ctx, p, errs } = await open({ clock: t0 });
  await nav(p, 'chat');
  await p.locator('span', { hasText: /^▶ Start$/ }).first().click();
  await p.clock.runFor(2000);
  const shown = async () => p.evaluate(() => (document.body.innerText.match(/\b(\d\d):(\d\d)\b/) || [''])[0]);
  check('running: 25:00 counting down', /^24:5\d$/.test(await shown()), await shown());
  // locked for 26 minutes: the clock moves on, timers don't fire
  await p.clock.setSystemTime(new Date(t0.getTime() + 26 * 60000 + 2000));
  await p.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await p.clock.runFor(600);
  const t = await body(p);
  check('back after 26 min: the work phase is done and the break is ~4 min in', /Break!/.test(t) && /^0[34]:\d\d$/.test(await shown()), await shown());
  check('…and the Pomodoro counted', ((await getProg(p)).pomodorosToday || 0) === 1);
  await p.clock.setSystemTime(new Date(t0.getTime() + 40 * 60000));
  await p.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await p.clock.runFor(600);
  check('back after the break too: done', /Break's over|↻ Reset/.test(await body(p)));
  errCheck('B10', errs);
  await ctx.close();
});

await block('B11. Study reminders stay on after a reload', async () => {
  const { ctx, p, errs } = await open({ notif: true });
  await studyTab(p, 'Plans');
  let btn = p.locator('text=🔔 Study Reminders').locator('xpath=..').locator('button');
  if (!(await btn.count())) { await studyTab(p, 'Schedule'); btn = p.locator('text=🔔 Study Reminders').locator('xpath=..').locator('button'); }
  const before = await btn.innerText();
  await btn.click();
  await p.waitForTimeout(400);
  const on = await btn.innerText();
  await reload(p);
  await studyTab(p, 'Plans');
  let btn2 = p.locator('text=🔔 Study Reminders').locator('xpath=..').locator('button');
  if (!(await btn2.count())) { await studyTab(p, 'Schedule'); btn2 = p.locator('text=🔔 Study Reminders').locator('xpath=..').locator('button'); }
  const after = await btn2.innerText();
  check('turned on, then still on after a reload', before !== on && after === on, before + ' → ' + on + ' → reload → ' + after);
  errCheck('B11', errs);
  await ctx.close();
});

await block('B12. An unreadable or full save is kept and the learner is told', async () => {
  const bad = '{"done": {"0-0-0": "2026-01-05"}, "xp": 12';
  let o = await open({ rawProgress: bad });
  check('unreadable save: the warning bar says so', /couldn't be read/.test(await body(o.p)) && (await vis(o.p, '[data-store-warn]')));
  check('…and the raw text is kept as uroStudyHub_progress_bad', (await o.p.evaluate(() => localStorage.getItem('uroStudyHub_progress_bad'))) === bad);
  await shot(o.p, 'b12-unreadable');
  await o.p.locator('[data-store-warn] button').click();
  check('…dismissible', !(await has(o.p, '[data-store-warn]')));
  await o.ctx.close();
  const long = (n) => Array.from({ length: n }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: 'x'.repeat(1500) }));
  const lectures = [{ id: 1, type: 'session', topic: 'BPH', messages: long(12), date: '2026-11-01' }];
  o = await open({ prog: { savedLectures: lectures }, quota: 12000 });
  await o.p.waitForTimeout(300);
  check('storage full: says sessions were trimmed to keep progress saving', /Storage is full/.test(await body(o.p)));
  check('…and the progress was saved (trimmed)', ((await getProg(o.p)).savedLectures[0].messages || []).length === 4);
  await o.ctx.close();
  o = await open({ prog: { savedLectures: lectures }, quota: 50 });
  await o.p.waitForTimeout(300);
  check('storage full even trimmed: says progress is NOT being saved', /NOT being saved/.test(await body(o.p)));
  await shot(o.p, 'b12-not-saving');
  await o.ctx.close();
});

// ═══ C. UI quick wins ═══
await block('C1. Tutor on a phone: empty chat, style preview, note box, Settings', async () => {
  const { ctx, p, errs } = await open();
  await nav(p, 'chat');
  const top = await p.evaluate(() => { const pane = [...document.querySelectorAll('div')].find((d) => d.scrollHeight > d.clientHeight && getComputedStyle(d).overflowY === 'auto' && d.querySelector('[data-upload-card]')); return pane ? pane.scrollTop : -1; });
  check('empty chat stays scrolled to the top', top === 0, 'scrollTop ' + top);
  await shot(p, 'c1-tutor-empty');
  await p.locator('button', { hasText: /ℹ Preview/ }).click();
  await p.waitForTimeout(250);
  const box = await p.locator('[data-style-preview]').boundingBox();
  const inp = await p.locator('input[data-chat-input]').boundingBox();
  check('style preview: capped (≤ 42% of the screen) and scrolls', box && box.height <= PHONE.height * 0.42 + 1 && (await p.locator('[data-style-preview]').evaluate((el) => el.scrollHeight > el.clientHeight)), box && Math.round(box.height) + 'px');
  check('…the message box stays on screen', inp && inp.y + inp.height <= PHONE.height, inp && Math.round(inp.y + inp.height) + 'px');
  await shot(p, 'c1-style-preview');
  await p.locator('[data-style-pick="clinical"]').click();
  await p.waitForTimeout(200);
  check('picking a style closes the preview', !(await has(p, '[data-style-preview]')) && (await getProg(p)).tutorStyle === 'clinical');
  await p.locator('button[title^="Tutor settings"]').click();
  await p.waitForTimeout(200);
  const ta = await p.locator('[data-tutor-custom] textarea').first().evaluate((el) => ({ h: el.clientHeight, ph: el.placeholder.length }));
  check('personal note: tall enough for its placeholder', ta.h >= 88, ta.h + 'px');
  await shot(p, 'c1-note');
  await p.locator('button[aria-label="Settings"]').click();
  await p.waitForTimeout(250);
  check('the sheet is titled Settings', (await p.locator('h2', { hasText: /^Settings$/ }).count()) > 0 && !(await p.locator('h2', { hasText: /^AI Provider$/ }).count()));
  const x = await p.locator('[data-set-close]').boundingBox();
  check('…its × is a 36 px target', x && x.width >= 36 && x.height >= 36, x && Math.round(x.width) + 'x' + Math.round(x.height));
  await shot(p, 'c1-settings');
  await p.locator('[data-set-close]').click();
  check('header Import: labelled for what it does', (await p.locator('[data-hdr-import]').getAttribute('aria-label')) === 'Import a share code');
  errCheck('C1', errs);
  await ctx.close();
});

await block('C2. No AI connected: no cost pill; sending opens the model picker, and the message goes once connected', async () => {
  const { ctx, p, errs } = await open();
  await nav(p, 'chat');
  check('no cost pill', !(await has(p, '[data-cost]')));
  await p.locator('button', { hasText: /^BPH Review$/ }).click();
  await p.waitForTimeout(300);
  check('a topic chip opens the model picker', await vis(p, '[data-aipick-panel]'));
  check('…and sends nothing (no request to localhost:1234)', (await p.evaluate(() => window.__local.length + window.__ai.length)) === 0);
  check('…the question waits in the box', /high-yield review of BPH Review/.test(await p.locator('input[data-chat-input]').inputValue()));
  await shot(p, 'c2-picker');
  await p.locator('[data-aipick-prov="openai"]').click();
  await waitAi(p, 1);
  const m = await p.evaluate(() => { const ms = window.__ai[0].messages; return ms[ms.length - 1].content; });
  check('once a model is picked, the waiting question is sent', /high-yield review of BPH Review/.test(m), m);
  check('the cost pill is back once connected', await has(p, '[data-cost]'));
  // closing the picker without connecting drops the waiting question
  errCheck('C2', errs);
  await ctx.close();
});

await browser.close();
console.log('\n' + nPass + ' passed, ' + nFail + ' failed. Screenshots: ' + SHOTS);
process.exit(nFail ? 1 : 0);
