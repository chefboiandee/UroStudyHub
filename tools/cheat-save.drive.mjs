// Headless-Chrome drive of the Rapid Review cheat-sheet auto-save (AI Tutor, structured lecture, phase 9):
// the cheat sheet files itself into Saved when it arrives, the tail of phase 8 does not, the manual 🔖 / 💾 saves still
// work next to it (and 🔖 on the auto-saved sheet doesn't file a copy), regenerating swaps the saved copy, a plain chat
// (not a lecture) saves nothing, it all survives a reload, and the Saved page's Cheat sheets filter / search / expand-all
// work (a sheet bookmarked by hand before auto-save existed is found there too). The OpenAI endpoint is stubbed in the
// page (no key, no network): replies come off a queue the script fills.
//
// Run:   node tools/cheat-save.drive.mjs
// Needs: a static server on the repo root (launch config "urostudyhub", or `python3 -m http.server 2043`)
//        and a built UroStudyHub.min.html (`python3 build.py`).
// Env:   URL=...      page to test (default http://localhost:2043/UroStudyHub.min.html)
//        CDN_DIR=...  a node_modules folder holding react@18.2.0, react-dom@18.2.0, @babel/standalone@7.23.9
//                     and katex@0.16.9 (for machines without internet; other external requests get a 404)
//        SHOTS=dir    save screenshots there (phone light, desktop)
//        CHROME=...   a Chrome/Chromium binary instead of Playwright's own
// Prints PASS/FAIL per check; exits 1 when any check fails.
//
// Hooks used: [data-chat-msg], [data-cheat-saved], [data-saved-filter=all|cheat|session|bookmark], [data-saved-item=cheat|bookmark],
// [data-saved-search], [data-saved-expand-all], [data-lecture-bar].
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

const PAGE_URL = process.env.URL || 'http://localhost:2043/UroStudyHub.min.html';
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

// ── Canned tutor replies ──
const SHEET_BODY = [
  '**Key facts**',
  '- Transition zone grows; PSA above 1.5 ng/mL and a gland over 30 mL predict progression.',
  '- Alpha-blockers: fast, no change in volume. 5-ARIs: halve the PSA and shrink the gland over about 6 months.',
  '**Numbers**',
  '- Qmax under 10 mL/s is obstructed; over 15 mL/s argues against obstruction.',
  '**Surgery**',
  '- TURP: TUR syndrome (hyponatremia from glycine). HoLEP: any size, lowest transfusion risk.',
].join('\n');
const R = {
  phase1: '🗺️ Phase 1, Big Picture. A 68-year-old man gets up four times a night to pee. By the end you will have a rapid review sheet for BPH. Ready for the framework? Type or tap NEXT, or ask me anything.',
  boards: '📋 BOARD-STYLE QUESTIONS\n\nQuestion 5. A 68-year-old man with a 90 g prostate and bothersome LUTS asks about options after failing an alpha-blocker. What is the best next step? A) Finasteride B) HoLEP C) Observation D) Tamsulosin again E) Cystoscopy only.\n\nCorrect: B. HoLEP removes any size gland with the lowest bleeding risk; finasteride is slow, tamsulosin was already tried.\n\nType or tap NEXT for the rapid review.',
  sheet1: '📄 RAPID REVIEW — BPH\n\n' + SHEET_BODY,
  sheet2: '📄 RAPID REVIEW — BPH (regenerated)\n\n' + SHEET_BODY + '\n- New line only the second version has.',
  sheet3: '## 📄 Phase 9: Rapid Review\n\n' + SHEET_BODY.replace('Transition zone', 'Stone formers: uric acid pH 5.5. Transition zone'),
  chatty: 'Sure, here is a rapid review of BPH you can skim.\n\n' + SHEET_BODY,
  plain: 'Right: the transition zone. That matters for management later.',
};
const OLD_SHEET = '📄 Rapid Review: Prostate cancer\n\n- Gleason 7 (3+4) is grade group 2.\n- PSA doubling time under 3 months is a poor sign.\n- Active surveillance: low-volume Gleason 6 (grade group 1), PSA density under 0.15.\n- Salvage radiation works best at PSA under 0.5.';

function pageInit(arg) {
  try {
    if (!localStorage.getItem('__cheatSeeded')) {
      Object.keys(arg.seed).forEach(function (k) { localStorage.setItem(k, arg.seed[k]); });
      localStorage.setItem('__cheatSeeded', '1');
    }
  } catch (e) { /* ignore */ }
  window.__reqs = [];
  window.__q = [];
  var realFetch = window.fetch.bind(window);
  window.fetch = function (u, o) {
    var url = typeof u === 'string' ? u : (u && u.url) || String(u);
    if (!/api\.openai\.com\/v1\/chat\/completions/.test(url)) return realFetch(u, o);
    var body = null;
    try { body = JSON.parse(o.body); } catch (e) { body = null; }
    window.__reqs.push(body);
    var text = window.__q.length ? window.__q.shift() : 'Noted.';
    if (!body || !body.stream) {
      return Promise.resolve(new Response(JSON.stringify({ choices: [{ message: { content: text } }], usage: { prompt_tokens: 10, completion_tokens: 5 } }), { status: 200, headers: { 'content-type': 'application/json' } }));
    }
    var enc = new TextEncoder();
    function sse(piece) { return enc.encode('data: ' + JSON.stringify({ choices: [{ delta: { content: piece } }] }) + '\n\n'); }
    var stream = new ReadableStream({
      start: function (ctl) {
        var i = 0;
        (function next() {
          if (i >= text.length) { ctl.enqueue(enc.encode('data: [DONE]\n\n')); ctl.close(); return; }
          ctl.enqueue(sse(text.slice(i, i + 60)));
          i += 60;
          setTimeout(next, 5);
        })();
      },
    });
    return Promise.resolve(new Response(stream, { status: 200, headers: { 'content-type': 'text/event-stream' } }));
  };
}

const KNOWN_HARMLESS = [/exceeds the max of 500KB/i, /ERR_CONNECTION_REFUSED/, /localhost:1234/];
const PROG = JSON.stringify({ role: 'resident', lastLoginDate: new Date().toISOString().slice(0, 10) });
const LM = JSON.stringify({ ep: 'http://localhost:1234', provider: 'openai', model: 'gpt-4o', openaiKey: 'sk-test', openaiModel: 'gpt-4o' });
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});

async function toTutor(p) {
  await p.waitForFunction(() => {
    const r = document.getElementById('root');
    return r && r.children.length > 0 && [...document.querySelectorAll('button')].some((b) => /Hub/.test(b.textContent));
  }, null, { timeout: 90000 });
  await p.waitForTimeout(400);
  const ok = await p.evaluate(() => {
    const b = [...document.querySelectorAll('button[data-nav="chat"]')].find((x) => x.getClientRects().length);
    if (b) { b.click(); return true; } return false;
  });
  if (!ok) throw new Error('no Tutor tab');
  await p.waitForFunction(() => [...document.querySelectorAll('h1')].some((h) => /AI Tutor/.test(h.textContent)), null, { timeout: 5000 });
  await p.waitForTimeout(200);
  // The full app opens "AI off" and sends nothing until a model is connected: connect the saved OpenAI key
  await p.locator('[data-aipick]').click();
  await p.locator('[data-aipick-prov="openai"]').click();
  if (await p.locator('[data-aipick-panel]').count()) await p.locator('[data-aipick]').click();
  await p.waitForTimeout(150);
}
async function open(viewport, seedExtra) {
  const mobile = viewport.width < 600;
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: SHOTS ? 2 : 1, isMobile: mobile, hasTouch: mobile });
  const seed = Object.assign({ uroStudyHub_progress: PROG, uroStudyHub_lmSettings: LM, uroStudyHub_mode: 'light' }, seedExtra || {});
  await ctx.addInitScript(pageInit, { seed });
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
  await p.goto(PAGE_URL);
  await toTutor(p);
  return { ctx, p, errs };
}
const errCheck = (label, errs) => { check('no console errors · ' + label, errs.length === 0, errs.slice(0, 3).join(' | ')); errs.length = 0; };
const shot = async (p, name) => { if (SHOTS) await p.screenshot({ path: join(SHOTS, name + '.png') }); };

const queue = (p, ...keys) => p.evaluate((rs) => { window.__q.push(...rs); }, keys.map((k) => R[k]));
const nReqs = (p) => p.evaluate(() => window.__reqs.length);
// Wait for request n to be answered and the reply to be on screen with the lecture's "Next section" row (the turn is over).
async function settle(p, n) {
  await p.waitForFunction((k) => window.__reqs.length >= k, n, { timeout: 10000 });
  await p.waitForFunction(() => [...document.querySelectorAll('button')].some((b) => /Next section/.test(b.textContent) && b.getClientRects().length), null, { timeout: 10000 });
  await p.waitForTimeout(250);
}
async function saveLS(p) {
  return p.evaluate(() => { try { return (JSON.parse(localStorage.getItem('uroStudyHub_progress')).savedLectures) || []; } catch (e) { return null; } });
}
// A Tutor tool: in the toolbar on wide screens; on a phone (under 700px) behind the Tools button, in its sheet
async function tool(p, name) {
  const btn = p.locator('[data-tools-btn]');
  if ((await btn.count()) && !(await p.locator('[data-tools-sheet]').count())) { await btn.click(); await p.waitForTimeout(150); }
  return p.locator('[data-tool="' + name + '"]').first();
}
async function closeTools(p) { if (await p.locator('[data-tools-close]').count()) { await p.locator('[data-tools-close]').click(); await p.waitForTimeout(100); } }
async function savedBtnCount(p) {
  const t = await (await tool(p, 'saved')).innerText();
  await closeTools(p);
  const m = t.match(/\((\d+)\)/);
  return m ? +m[1] : 0;
}
async function sendNext(p) {
  const n = await nReqs(p);
  await p.locator('input[data-chat-input]').fill('NEXT');
  await p.locator('input[data-chat-input]').press('Enter');
  await settle(p, n + 1);
}
async function toast(p, re, ms) {
  try { await p.waitForFunction((src) => new RegExp(src).test(document.body.innerText), re.source, { timeout: ms || 2500 }); return true; } catch (e) { return false; }
}
const lastMsg = (p) => p.locator('[data-chat-msg]').last();
const bookmarkLast = async (p) => {
  const m = p.locator('[data-chat-msg]').filter({ has: p.locator('button[title="Bookmark this response"]') }).last();
  await m.locator('button[title="Bookmark this response"]').click();
};

await block('A. Lecture to phase 9: the sheet files itself, the phase-8 tail does not', async () => {
  const { ctx, p, errs } = await open({ width: 412, height: 860 });
  errCheck('boot', errs);
  await queue(p, 'phase1');
  await p.locator('input[type=file]').first().setInputFiles({ name: 'BPH.txt', mimeType: 'text/plain', buffer: Buffer.from('# BPH\n\nBenign prostatic hyperplasia. The transition zone grows. Alpha blockers and 5-ARIs.\n'.repeat(5)) });
  await settle(p, 1);
  check('lecture started: phase bar shown', /Phase 1\/9/.test(await p.locator('[data-lecture-bar]').innerText()));
  check('nothing saved at phase 1 (even though it says "rapid review sheet")', (await saveLS(p)).length === 0 && !(await p.locator('[data-cheat-saved]').count()));

  await queue(p, 'boards');
  await sendNext(p);
  check('phase 8 ends "NEXT for the rapid review": not saved', (await saveLS(p)).length === 0);

  await queue(p, 'sheet1');
  await sendNext(p);
  check('phase 9 cheat sheet arrives → "Cheat sheet saved" toast', await toast(p, /Cheat sheet saved/, 1500));
  const ls = await saveLS(p);
  check('exactly one thing saved', ls.length === 1, JSON.stringify(ls.map((l) => l.type + ':' + l.topic)));
  const it = ls[0] || {};
  check('…a bookmark for the lecture topic, marked auto + cheat, labelled One-Page Summary', it.type === 'bookmark' && it.topic === 'BPH' && it.auto === true && it.cheat === true && it.phase === 'One-Page Summary', JSON.stringify({ t: it.type, topic: it.topic, auto: it.auto, cheat: it.cheat, ph: it.phase }));
  check('…holding the whole sheet', it.content === R.sheet1);
  check('Saved button now counts it', (await savedBtnCount(p)) === 1);
  check('the reply shows a "saved" line you can tap', (await lastMsg(p).locator('[data-cheat-saved]').count()) === 1);
  check('phase bar reads phase 9', /Phase 9\/9/.test(await p.locator('[data-lecture-bar]').innerText()));
  await shot(p, 'phone-sheet-saved');
  errCheck('lecture', errs);

  // The "saved" line opens the cheat-sheet list
  await lastMsg(p).locator('[data-cheat-saved]').click();
  await p.waitForSelector('[data-saved-filter]', { timeout: 3000 });
  check('tapping it opens Saved on the Cheat sheets filter', (await p.locator('[data-saved-filter="cheat"]').evaluate((b) => /Cheat sheets \(1\)/.test(b.textContent))) && (await p.locator('[data-saved-item]').count()) === 1);
  check('the card says cheat sheet + auto-saved', await p.locator('[data-saved-item="cheat"]').evaluate((el) => /📄/.test(el.textContent) && /auto-saved/.test(el.textContent) && /RAPID REVIEW/.test(el.textContent)));
  await shot(p, 'phone-saved-cheat');
  await (await tool(p, 'saved')).click();   // back to the chat
  await p.waitForSelector('[data-chat-msg]', { timeout: 3000 });

  // Manual saves still work, next to it
  await bookmarkLast(p);
  check('🔖 on the auto-saved sheet: "already saved", no second copy', (await toast(p, /Already saved/)) && (await saveLS(p)).length === 1);
  const boardsIdx = await p.evaluate(() => [...document.querySelectorAll('[data-chat-msg]')].findIndex((m) => /BOARD-STYLE/.test(m.textContent)));
  await p.locator('[data-chat-msg]').nth(boardsIdx).locator('button[title="Bookmark this response"]').click();
  check('🔖 on another reply still bookmarks it', (await toast(p, /Bookmarked!/)) && (await saveLS(p)).length === 2);
  await p.locator('[data-lecture-bar] button[title^="Save this session"]').click();
  check('💾 Save session still saves the session mid-lecture', (await toast(p, /Session saved/)) && (await saveLS(p)).length === 3 && (await saveLS(p))[2].type === 'session');
  check('…and the auto-saved sheet is still just one', (await saveLS(p)).filter((l) => l.cheat).length === 1);

  // Regenerate the sheet: the old auto-saved copy goes, the new one comes
  await queue(p, 'sheet2');
  const n = await nReqs(p);
  await p.locator('button[title="Regenerate response"]').click();
  await settle(p, n + 1);
  await p.waitForTimeout(300);
  const ls2 = await saveLS(p);
  const cheats = ls2.filter((l) => l.cheat);
  check('regenerate: still one auto-saved sheet, now the new version', cheats.length === 1 && cheats[0].content === R.sheet2, cheats.map((c) => c.content.slice(0, 40)).join(' | '));
  check('regenerate: the bookmark and the session are untouched', ls2.length === 3 && ls2.filter((l) => l.type === 'session').length === 1 && ls2.filter((l) => l.type === 'bookmark' && !l.cheat).length === 1);
  errCheck('manual saves + regenerate', errs);
  await ctx.close();
});

await block('B. Not a lecture: nothing auto-saves; a sheet bookmarked by hand earlier is found; filters, search, expand all', async () => {
  const seedList = [
    { id: 11, type: 'bookmark', topic: 'Prostate cancer', phase: 'One-Page Summary', content: OLD_SHEET, role: 'assistant', date: '2026-10-01T10:00:00.000Z' },
    { id: 12, type: 'bookmark', topic: 'Stones', phase: 'Core Details I', content: 'Struvite stones need urease-splitting bacteria; treat with PCNL.', role: 'assistant', date: '2026-10-02T10:00:00.000Z' },
    { id: 13, type: 'session', topic: 'Kidney anatomy', messages: [{ role: 'user', content: 'hello' }, { role: 'assistant', content: 'hi' }], sideMsgs: [], lecturePhase: 3, lectureMode: true, masteryMode: false, hasDoc: false, date: '2026-10-03T10:00:00.000Z' },
  ];
  const { ctx, p, errs } = await open({ width: 1100, height: 800 }, { uroStudyHub_progress: JSON.stringify({ role: 'resident', lastLoginDate: new Date().toISOString().slice(0, 10), savedLectures: seedList }) });
  errCheck('boot', errs);
  // Plain chat (no lecture): the model answers with a rapid review. It is not a lecture sheet, so nothing is filed.
  await queue(p, 'chatty');
  const inp = p.locator('input[data-chat-input]');
  await inp.fill('give me a rapid review of BPH');
  await inp.press('Enter');
  await p.waitForFunction(() => window.__reqs.length >= 1 && document.querySelectorAll('[data-chat-msg]').length >= 2 && /Sure, here is a rapid review/.test(document.body.innerText), null, { timeout: 10000 });
  await p.waitForTimeout(500);
  check('outside a lecture a "rapid review" reply is not auto-saved', (await saveLS(p)).length === 3 && (await p.locator('[data-cheat-saved]').count()) === 0);

  await (await tool(p, 'saved')).click();
  await p.waitForSelector('[data-saved-filter]', { timeout: 3000 });
  const chip = (k) => p.locator('[data-saved-filter="' + k + '"]').innerText();
  check('filter counts: all 3, cheat 1, sessions 1, bookmarks 1', /\(3\)/.test(await chip('all')) && /\(1\)/.test(await chip('cheat')) && /\(1\)/.test(await chip('session')) && /\(1\)/.test(await chip('bookmark')), [await chip('all'), await chip('cheat'), await chip('session'), await chip('bookmark')].join(' | '));
  const cards = () => p.locator('[data-saved-tools] ~ div');
  const order = await cards().evaluateAll((els) => els.map((e) => e.textContent.replace(/\s+/g, ' ').slice(0, 30)));
  check('All lists three items, newest first (session, stone bookmark, sheet)', order.length === 3 && /Kidney anatomy/.test(order[0]) && /Stones/.test(order[1]) && /Prostate cancer/.test(order[2]), order.join(' | '));
  await p.locator('[data-saved-filter="cheat"]').click();
  check('Cheat sheets: the hand-saved prostate sheet is found (and only it)', (await cards().count()) === 1 && /Prostate cancer/.test(await p.locator('[data-saved-item="cheat"]').innerText()));
  check('hand-saved sheet has no "auto-saved" badge', !/auto-saved/.test(await p.locator('[data-saved-item="cheat"]').innerText()));
  await p.locator('[data-saved-filter="session"]').click();
  check('Sessions: just the session', (await cards().count()) === 1 && /Kidney anatomy/.test(await cards().first().innerText()));
  await p.locator('[data-saved-filter="bookmark"]').click();
  check('Bookmarks: the non-sheet bookmark only', (await cards().count()) === 1 && /Stones/.test(await cards().first().innerText()));
  await p.locator('[data-saved-filter="all"]').click();
  await p.locator('[data-saved-search]').fill('urease');
  check('search finds a bookmark by its text', (await cards().count()) === 1 && /Stones/.test(await cards().first().innerText()));
  await p.locator('[data-saved-search]').fill('zzzz');
  check('a search with no match says so', (await cards().count()) === 0 && /Nothing matches/.test(await p.locator('[data-saved-tools]').innerText()));
  await p.locator('[data-saved-search]').fill('');
  await p.locator('[data-saved-filter="cheat"]').click();
  const maxH = () => p.locator('[data-saved-item="cheat"] div[style*="max-height"]').first().evaluate((el) => getComputedStyle(el).maxHeight);
  check('a long sheet starts collapsed', (await maxH()) === '120px', await maxH());
  await p.locator('[data-saved-expand-all]').click();
  check('Expand all opens it', (await maxH()) === 'none' && /Collapse all/.test(await p.locator('[data-saved-expand-all]').innerText()));
  await p.locator('[data-saved-expand-all]').click();
  check('…and Collapse all closes it', (await maxH()) === '120px');
  await shot(p, 'desktop-saved-cheat');
  // delete the only sheet while others remain: the Cheat sheets filter explains itself
  await p.locator('[data-saved-item="cheat"] button', { hasText: '🗑' }).click();
  await p.waitForTimeout(200);
  check('deleting the last sheet leaves the others, and the empty Cheat sheets filter explains itself', (await saveLS(p)).length === 2 && /No cheat sheets yet/.test(await p.locator('[data-saved-tools]').innerText()) && /\(0\)/.test(await p.locator('[data-saved-filter="cheat"]').innerText()));
  errCheck('saved page', errs);
  await ctx.close();
});

await block('C. Survives a reload; deleting an auto-saved sheet sticks; a "## Phase 9" heading counts', async () => {
  const { ctx, p, errs } = await open({ width: 412, height: 860 });
  await queue(p, 'phase1');
  await p.locator('input[type=file]').first().setInputFiles({ name: 'Stones.txt', mimeType: 'text/plain', buffer: Buffer.from('# Stones\n\nCalcium oxalate stones. Struvite needs urease-splitting bacteria.\n'.repeat(5)) });
  await settle(p, 1);
  await queue(p, 'sheet3');
  await sendNext(p);
  let ls = await saveLS(p);
  check('"## 📄 Phase 9: Rapid Review" is filed under the topic', ls.length === 1 && ls[0].topic === 'Stones' && ls[0].auto === true, JSON.stringify(ls.map((l) => l.topic)));
  await p.waitForTimeout(900);   // the progress blob is written on the next render
  await p.reload();
  await toTutor(p);
  await (await tool(p, 'saved')).click();
  await p.waitForSelector('[data-saved-filter]', { timeout: 3000 });
  await p.locator('[data-saved-filter="cheat"]').click();
  check('after a reload the sheet is still there', (await p.locator('[data-saved-item="cheat"]').count()) === 1 && /Stones/.test(await p.locator('[data-saved-item="cheat"]').innerText()));
  await p.locator('[data-saved-item="cheat"] button', { hasText: '🗑' }).click();
  await p.waitForTimeout(300);
  check('🗑 deletes it; with nothing saved the page says how things get saved', (await saveLS(p)).length === 0 && /Nothing saved yet/.test(await p.locator('body').innerText()) && /Rapid Review cheat sheet/.test(await p.locator('body').innerText()));
  errCheck('reload', errs);
  await ctx.close();
});

await browser.close();
console.log('\n' + nPass + ' passed, ' + nFail + ' failed');
process.exit(nFail ? 1 : 0);
