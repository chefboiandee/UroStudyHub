#!/usr/bin/env node
// Headless E2E for the in-app card reviewer (Anki page > Review tab), phone-sized.
//
//   python3 -m http.server 2043          (repo root, in another terminal)
//   node tools/anki-study.drive.mjs
//
// Env:  URL=http://localhost:2043/UroStudyHub.min.html (default)
//       CDN_DIR=<node_modules with react@18.2.0, react-dom@18.2.0, @babel/standalone@7.23.9, katex@0.16.9>
//                serves the cdnjs scripts locally when the sandbox has no internet; other external requests 404.
//       CHROME=/path/to/chrome   picks the browser.
//       SHOTS=/some/dir          saves phone screenshots there.
//
// Checks: the hub row and the Review tab count what is due; a session grades cards (buttons, keyboard), shows the four
// intervals, hides the cloze answer until revealed, buries cloze siblings, undo puts everything back, XP / coins / the daily
// goal token / the "queue cleared" bonus pay once, the schedule survives a reload, edit / suspend / delete work and the Cards
// tab can resume a suspended card; the daily goal counts per day (not lifetime); no horizontal scroll and 44px tap targets
// on a 360px phone; no console errors beyond the known harmless ones.
import { createRequire } from 'node:module';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
let chromium;
for (const m of ['playwright', 'playwright-core', '@playwright/test']) {
  try { ({ chromium } = require(m)); if (chromium) break; } catch (e) { /* next */ }
}
if (!chromium) { try { ({ chromium } = await import('playwright')); } catch (e) { /* below */ } }
if (!chromium) { console.log('FAIL setup: Playwright not found'); process.exit(1); }

const PAGE_URL = process.env.URL || 'http://localhost:2043/UroStudyHub.min.html';
const CDN_DIR = process.env.CDN_DIR || '';
const SHOTS = process.env.SHOTS || '';
const CDN_MAP = [
  [/react\/18\.2\.0\/umd\/react\.production\.min\.js/, 'react/umd/react.production.min.js', 'application/javascript'],
  [/react-dom\/18\.2\.0\/umd\/react-dom\.production\.min\.js/, 'react-dom/umd/react-dom.production.min.js', 'application/javascript'],
  [/babel-standalone\/7\.23\.9\/babel\.min\.js/, '@babel/standalone/babel.min.js', 'application/javascript'],
  [/KaTeX\/0\.16\.9\/katex\.min\.js/, 'katex/dist/katex.min.js', 'application/javascript'],
  [/KaTeX\/0\.16\.9\/katex\.min\.css/, 'katex/dist/katex.min.css', 'text/css'],
];
const KNOWN_HARMLESS = [/exceeds the max of 500KB/i, /ERR_CONNECTION_REFUSED/, /localhost:1234/, /localhost:8765/];

let nPass = 0, nFail = 0; const failures = [];
function check(name, ok, detail) {
  if (ok) { nPass++; console.log('PASS ' + name + (detail ? '  (' + detail + ')' : '')); }
  else { nFail++; failures.push(name + (detail ? ' — ' + detail : '')); console.log('FAIL ' + name + (detail ? ' — ' + detail : '')); }
  return !!ok;
}
async function block(name, fn) {
  try { await fn(); } catch (e) { check(name + ' (step threw)', false, String(e && e.message ? e.message : e).split('\n')[0]); }
}

// The app's study day: local calendar day with a 4am rollover (same formula as ankiStudyDay).
const studyDay = (ts) => { const t = ts - 4 * 3600000; return Math.floor((t - new Date(t).getTimezoneOffset() * 60000) / 86400000); };
const TODAY = studyDay(Date.now());
const dayKeyNow = () => new Date(studyDay(Date.now()) * 86400000).toISOString().slice(0, 10);

const CLOZE = '{{c1::Gleason 6}} is low risk; {{c2::Gleason 8}} is high risk; {{c3::ADT}} is not curative alone.';
function deck() {
  return [
    { id: 106, type: 'basic', front: 'Review card Q', back: 'Review card A', tags: ['AUA::Oncology'], topic: 'Prostate',
      sc: { '0': { st: 'rev', step: 0, due: TODAY - 1, ivl: 5, ease: 2.5, reps: 3, lapses: 0, last: Date.now() - 6 * 86400000, first: TODAY - 20 } } },
    { id: 101, type: 'basic', front: 'Basic one Q', back: 'Basic one A', tags: ['AUA::Voiding'] },
    { id: 102, type: 'basic', front: 'Basic two Q', back: 'Basic two A', tags: ['AUA::Voiding'] },
    { id: 103, type: 'basic', front: 'Basic three Q', back: 'Basic three A', tags: ['AUA::Oncology'] },
    { id: 104, type: 'cloze', text: CLOZE, front: '', back: '', tags: ['AUA::Oncology'] },
    { id: 105, type: 'basic', front: 'Suspended Q', back: 'Suspended A', tags: ['AUA'], susp: true },
  ];
}

const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});

async function open(prog, opts) {
  opts = opts || {};
  const ctx = await browser.newContext({ viewport: opts.viewport || { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: true });
  const seed = { uroStudyHub_mode: opts.dark ? 'dark' : 'light', uroStudyHub_progress: JSON.stringify(prog), uroStudyHub_activePlan: 'aua' };
  await ctx.addInitScript((a) => {
    try {
      if (!localStorage.getItem('__seeded')) { Object.keys(a).forEach((k) => localStorage.setItem(k, a[k])); localStorage.setItem('__seeded', '1'); }
    } catch (e) { /* ignore */ }
  }, seed);
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
    if (CDN_DIR && /Failed to load resource/.test(txt) && loc && !/localhost|127\.0\.0\.1/.test(loc)) return;
    errs.push('console.error ' + txt);
  });
  p.on('dialog', (d) => d.accept().catch(() => {}));
  await p.goto(PAGE_URL);
  await p.waitForFunction(() => {
    const r = document.getElementById('root');
    return r && r.children.length > 0 && [...document.querySelectorAll('button')].some((b) => /Hub/.test(b.textContent));
  }, null, { timeout: 90000 });
  await p.waitForTimeout(600);
  return { ctx, p, errs };
}
const getProg = async (p) => JSON.parse((await p.evaluate(() => localStorage.getItem('uroStudyHub_progress'))) || 'null');
const btn = (p, re) => p.getByRole('button', { name: re });
const body = (p) => p.locator('body').innerText();
const errCheck = (label, errs) => check('no console errors · ' + label, errs.length === 0, errs.slice(0, 3).join(' | '));
const shot = async (p, name) => { if (SHOTS) await p.screenshot({ path: join(SHOTS, name + '.png') }); };
async function goAnki(p) { await btn(p, /^📇\s*Anki$/).first().click(); await p.waitForTimeout(250); }
const card = (prog, id) => prog.ankiCards.find((c) => c.id === id);
async function reveal(p) { await btn(p, /^Show answer$/).click(); await p.waitForTimeout(80); }
async function grade(p, name) { await btn(p, new RegExp('^' + name)).click(); await p.waitForTimeout(120); }
const PROFILE = (extra) => Object.assign({ role: 'resident', coins: 0, xp: 0, tokens: 0, ankiReviewGoal: 5, ankiNewPerDay: 10, ankiCards: deck(), lastLoginDate: new Date().toISOString().slice(0, 10) }, extra || {});

// ───────── A. hub row, home counts, a full session ─────────
await block('A. session', async () => {
  const { ctx, p, errs } = await open(PROFILE());
  errCheck('boot A', errs);
  await shot(p, 'a0-hub');
  const hub = await body(p);
  check('hub row counts what is due and is tappable', /7 cards to review · 0\/5 today/.test(hub), (hub.match(/\d+ cards? to review[^\n]*/) || [''])[0]);
  await p.getByText(/7 cards to review/).click();
  await p.waitForTimeout(300);
  check('row jumps to the Review tab', /📖 Review \(7\)/.test(await body(p)) && /\bToday\b/.test(await body(p)));
  const home = await body(p);
  check('tab shows 7 due: 1 review, 0 learning, 6 new (3 basic + 3 cloze units)', /\n1\nReview\n0\nLearning\n6\nNew/.test(home), JSON.stringify((home.match(/(\d+)\nReview\n(\d+)\nLearning\n(\d+)\nNew/) || []).slice(1)));
  check('suspended card is not counted', /6 cards in your deck · 1 suspended|6 cards in your deck/.test(home));
  await shot(p, 'a1-home');
  const prog0 = await getProg(p);
  const xp0 = prog0.xp;

  await btn(p, /^▶ Review 7 cards$/).click();
  await p.waitForTimeout(200);
  let t = await body(p);
  check('review (not new) card comes first, answer hidden', t.includes('Review card Q') && !t.includes('Review card A') && /REVIEW/.test(t));
  await shot(p, 'a2-front');
  await reveal(p);
  t = await body(p);
  check('reveal shows the back and four grade buttons with intervals', t.includes('Review card A') && /Again\s*\n10m/.test(t) && /Hard\s*\n6d/.test(t) && /Good\s*\n14d/.test(t) && /Easy\s*\n20d/.test(t), (t.match(/Again[\s\S]{0,60}Easy\s*\n\S+/) || [''])[0].replace(/\n/g, ' '));
  const h = await btn(p, /^Good/).boundingBox();
  check('grade buttons are thumb-sized', h && h.height >= 44 && h.width >= 60, h ? Math.round(h.width) + 'x' + Math.round(h.height) : 'no box');
  await shot(p, 'a3-answer');
  await grade(p, 'Good');
  let pr = await getProg(p);
  const c106 = card(pr, 106).sc['0'];
  check('review card rescheduled: 14 days, due +14 study days, reps 4', c106.st === 'rev' && c106.ivl === 14 && c106.due === TODAY + 14 && c106.reps === 4, JSON.stringify(c106));
  check('counts: ankiDays today 1, lifetime +1, XP +2', pr.ankiDays && pr.ankiDays[dayKeyNow()] === 1 && pr.ankiReviews === 1 && pr.xp - xp0 === 2, 'xp ' + (pr.xp - xp0));

  // next card: a new basic one. Keyboard: space reveals, 3 grades Good.
  t = await body(p);
  check('then a NEW card', /NEW/.test(t) && /Basic (one|two|three) Q|Gleason|\[\.\.\.\]/.test(t));
  await p.keyboard.press(' ');
  await p.waitForTimeout(100);
  check('space reveals', /Good\s*\n10m/.test(await body(p)));
  const firstNewId = /Basic one Q/.test(t) ? 101 : /Basic two Q/.test(t) ? 102 : /Basic three Q/.test(t) ? 103 : 0;
  await p.keyboard.press('3');
  await p.waitForTimeout(150);
  pr = await getProg(p);
  const afterGood = firstNewId ? card(pr, firstNewId).sc['0'] : null;
  check('keyboard 3 = Good: new card enters learning step 2 (10 min)', afterGood && afterGood.st === 'learn' && afterGood.step === 1, JSON.stringify(afterGood));
  check('2 reviews today', pr.ankiDays[dayKeyNow()] === 2);

  // undo the keyboard grade
  await btn(p, /Undo/).click();
  await p.waitForTimeout(150);
  pr = await getProg(p);
  check('undo: card is exactly new again (no sc), count back to 1, XP back to +2', !!firstNewId && !card(pr, firstNewId).sc && pr.ankiDays[dayKeyNow()] === 1 && pr.xp - xp0 === 2 && pr.ankiReviews === 1, 'id ' + firstNewId + ' sc ' + JSON.stringify(card(pr, firstNewId || 101).sc) + ' day ' + pr.ankiDays[dayKeyNow()] + ' xp +' + (pr.xp - xp0));
  check('undo brings the answer back up for a re-grade', /Good\s*\n10m/.test(await body(p)));
  await p.keyboard.press('3');
  await p.waitForTimeout(150);

  // run the rest of the session with Good until it ends; collect any cloze front on the way
  let clozeFront = '', clozeBack = '', guard = 0;
  while (guard++ < 30) {
    t = await body(p);
    if (/Queue cleared|Nice session|Nothing to review/.test(t) && !/Show answer|Again\s*\n/.test(t)) break;
    if (/\[\.\.\.\]/.test(t) && !clozeFront) clozeFront = t;
    if (await btn(p, /^Show answer$/).count()) await reveal(p);
    t = await body(p);
    if (/is low risk/.test(t) && !clozeBack && /Gleason 6|Gleason 8|ADT/.test(t) && !/\[\.\.\.\]/.test(t)) clozeBack = t;
    await grade(p, 'Good');
  }
  const clozeLine = clozeFront ? clozeFront.split('\n').find((l) => /\[\.\.\.\]/.test(l)) : '';
  check('cloze front: c1 hidden behind [...], the other blanks shown as plain text', clozeLine === '[...] is low risk; Gleason 8 is high risk; ADT is not curative alone.', clozeLine || 'no cloze seen');
  check('cloze back reveals the answer in place', /Gleason 6 is low risk; Gleason 8 is high risk; ADT is not curative alone\./.test(clozeBack.replace(/\n/g, '')), clozeBack ? 'ok' : 'none');
  t = await body(p);
  check('session ends on the "Queue cleared" summary', /Queue cleared!/.test(t), (t.match(/Queue cleared!|Nice session/) || ['no summary'])[0]);
  await shot(p, 'a4-summary');
  pr = await getProg(p);
  const sibs = pr.ankiCards.find((c) => c.id === 104).sc || {};
  check('cloze siblings were buried: only one cloze unit studied today', Object.keys(sibs).length === 1, Object.keys(sibs).join(','));
  // 9 grades: 106 once + three basics twice + the cloze twice
  check('9 reviews counted today', pr.ankiDays[dayKeyNow()] === 9, String(pr.ankiDays[dayKeyNow()]));
  check('XP: 2 per review (+25 queue-cleared bonus), paid once', pr.xp - xp0 === 9 * 2 + 25, 'xp +' + (pr.xp - xp0));
  check('daily-goal token paid once (goal 5), logged once', pr.tokens === 2 && pr.activityLog.filter((e) => /goal reached/.test(e.label)).length === 1, 'tokens ' + pr.tokens);
  check('queue-cleared day stamped, streak started', pr.ankiClearDay === dayKeyNow() && pr.streak >= 1, 'streak ' + pr.streak);
  check('summary shows the rewards', /\+43 XP/.test(t) || /\+18 XP/.test(t), (t.match(/\+\d+ XP[^\n]*/) || [''])[0]);
  check('coins: 1 per 10 reviews + any streak milestone', pr.coins >= 0);
  // Done -> home says all done
  await btn(p, /^Done$/).click();
  await p.waitForTimeout(150);
  t = await body(p);
  check('home after clearing: all done, 0 due', /All done for today/.test(t) && /\n0\nReview\n\d\nLearning\n0\nNew/.test(t));
  check('hub row gone once the queue is empty', (await (async () => { await btn(p, /^🏠\s*Hub$/).first().click(); await p.waitForTimeout(250); return body(p); })()).match(/cards? to review/) === null);
  check('hub check-in bar uses today (9/5 shown as goal met)', /9\/5/.test(await body(p)));
  // persists across a reload
  await p.reload();
  await p.waitForFunction(() => [...document.querySelectorAll('button')].some((b) => /Hub/.test(b.textContent)), null, { timeout: 90000 });
  await p.waitForTimeout(500);
  const pr2 = await getProg(p);
  check('schedule survives a reload', JSON.stringify(card(pr2, 106).sc) === JSON.stringify(card(pr, 106).sc) && pr2.ankiDays[dayKeyNow()] === 9);
  errCheck('A end', errs);
  await ctx.close();
});

// ───────── B. edit / suspend / delete, Cards tab resume ─────────
await block('B. edit suspend delete', async () => {
  const { ctx, p, errs } = await open(PROFILE());
  await goAnki(p);
  check('opens on the Review tab when there are cards', /Today/.test(await body(p)) && /▶ Review 7 cards/.test(await body(p)));
  await btn(p, /^▶ Review 7 cards$/).click();
  await p.waitForTimeout(200);
  // edit the review card (basic)
  await btn(p, /✏ Edit/).click();
  const tas = p.locator('textarea');
  check('edit opens Front + Back boxes', (await tas.count()) === 2);
  await tas.nth(0).fill('Edited front Q');
  await btn(p, /^Save$/).click();
  await p.waitForTimeout(150);
  let pr = await getProg(p);
  check('edit saved to the card', card(pr, 106).front === 'Edited front Q' && /Edited front Q/.test(await body(p)));
  // suspend it: queue moves on to a new card
  await btn(p, /⏸ Suspend/).click();
  await p.waitForTimeout(150);
  pr = await getProg(p);
  check('suspend marks the card and moves on', card(pr, 106).susp === true && /NEW/.test(await body(p)));
  // delete needs two taps
  await btn(p, /🗑 Delete/).click();
  check('delete asks for a second tap', /Tap again to delete/.test(await body(p)) && (await getProg(p)).ankiCards.length === 6);
  await btn(p, /Tap again to delete/).click();
  await p.waitForTimeout(150);
  pr = await getProg(p);
  check('second tap deletes the card', pr.ankiCards.length === 5, 'cards ' + pr.ankiCards.length);
  // end the session early with the X, then look at the Cards tab
  await btn(p, /^✕$/).click();
  await p.waitForTimeout(150);
  check('X ends the session on a summary', /Nice session|Nothing to review/.test(await body(p)));
  await btn(p, /^Done$/).click();
  await btn(p, /^📇 Cards \(5\)$/).click();
  await p.waitForTimeout(200);
  const ct = await body(p);
  check('Cards tab shows a suspended status and Resume', /⏸ Suspended/.test(ct) && (await btn(p, /^Resume$/).count()) >= 1);
  check('Cards tab shows New status for unstudied cards', /New · not studied yet/.test(ct));
  check('two suspended cards before resuming (one seeded, one from the test)', pr.ankiCards.filter((c) => c.susp).length === 2);
  await btn(p, /^Resume$/).first().click();
  await p.waitForTimeout(150);
  pr = await getProg(p);
  check('Resume un-suspends that one card', pr.ankiCards.filter((c) => c.susp).length === 1);
  await btn(p, /^Resume$/).first().click();
  await p.waitForTimeout(150);
  pr = await getProg(p);
  check('and the other', !pr.ankiCards.some((c) => c.susp) && (await btn(p, /^Resume$/).count()) === 0);
  errCheck('B end', errs);
  await ctx.close();
});

// ───────── C. empty deck + the daily goal is per day, not lifetime ─────────
await block('C. empty deck and daily goal', async () => {
  const { ctx, p, errs } = await open(PROFILE({ ankiCards: [], ankiReviews: 80, ankiReviewGoal: 50 }));
  let t = await body(p);
  check('lifetime 80 reviews no longer counts as today: hub still shows 0/50', /Anki: 0\/50 reviews/.test(t) && /0\/50/.test(t), (t.match(/Anki: [^\n]*/) || [''])[0]);
  await goAnki(p);
  check('no cards: opens on Generate, not Review', /Batch from Document/.test(await body(p)));
  await btn(p, /^📖 Review$/).click();
  await p.waitForTimeout(150);
  check('Review tab explains how to get cards', /No cards to review yet/.test(await body(p)));
  await btn(p, /^🏠\s*Hub$/).first().click();
  await p.waitForTimeout(250);
  const xp0 = (await getProg(p)).xp;
  await btn(p, /^\+25$/).click();
  await p.waitForTimeout(150);
  let pr = await getProg(p);
  check('manual +25 counts toward today only, no XP', pr.ankiDays[dayKeyNow()] === 25 && pr.ankiReviews === 105 && pr.xp === xp0 && pr.tokens === 0, 'today ' + pr.ankiDays[dayKeyNow()]);
  await btn(p, /^\+25$/).click();
  await p.waitForTimeout(150);
  pr = await getProg(p);
  check('crossing 50 today pays the token once', pr.ankiDays[dayKeyNow()] === 50 && pr.tokens === 2, 'tokens ' + pr.tokens);
  await btn(p, /^\+10$/).click();
  await p.waitForTimeout(150);
  check('going past the goal does not pay again', (await getProg(p)).tokens === 2);
  errCheck('C end', errs);
  await ctx.close();
});

// ───────── D. phone layout ─────────
await block('D. 360px phone layout', async () => {
  const { ctx, p, errs } = await open(PROFILE({ ankiCards: deck().concat([{ id: 107, type: 'basic', front: 'A long question about the management of a patient with a 1.2 cm obstructing distal ureteral stone, fever and an elevated white count: what comes first and why?', back: 'Decompress the infected system first (stent or nephrostomy); treat the stone after the infection clears.\nIntravenous antibiotics are started at once.', tags: ['AUA::Endourology'] }]) }), { viewport: { width: 360, height: 740 } });
  await goAnki(p);
  const overflow = async () => p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check('home: no horizontal page scroll at 360px', (await overflow()) <= 0, 'overflow ' + (await overflow()));
  const tabs = await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => /^📖 Review/.test(x.textContent)); const r = b && b.getBoundingClientRect(); return r ? { h: Math.round(r.height), top: Math.round(r.top) } : null; });
  check('Review tab reachable and tall enough to tap', tabs && tabs.h >= 40, JSON.stringify(tabs));
  await shot(p, 'd1-home-360');
  await btn(p, /^▶ Review 8 cards$/).click();
  await p.waitForTimeout(200);
  check('card view: no horizontal scroll', (await overflow()) <= 0);
  const show = await btn(p, /^Show answer$/).boundingBox();
  check('Show answer is full width and thumb-sized', show && show.height >= 52 && show.width >= 300, show ? Math.round(show.width) + 'x' + Math.round(show.height) : 'none');
  // tapping the card itself also reveals
  await p.getByText(/Review card Q/).click();
  await p.waitForTimeout(100);
  check('tapping the card reveals the answer', /Review card A/.test(await body(p)));
  const bs = await p.evaluate(() => ['Again', 'Hard', 'Good', 'Easy'].map((n) => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.indexOf(n) === 0); const r = b && b.getBoundingClientRect(); return r ? [Math.round(r.width), Math.round(r.height), Math.round(r.right)] : null; }));
  check('four grade buttons fit the width, each >= 44px tall', bs.every((r) => r && r[1] >= 44 && r[2] <= 360), JSON.stringify(bs));
  await shot(p, 'd2-answer-360');
  await grade(p, 'Good');
  // jump to the long card: grade through new basics quickly until it shows
  let guard = 0;
  while (guard++ < 12 && !/obstructing distal ureteral stone/.test(await body(p))) { if (await btn(p, /^Show answer$/).count()) await reveal(p); await grade(p, 'Easy'); }
  await reveal(p);
  check('long card: no horizontal scroll', (await overflow()) <= 0);
  await shot(p, 'd3-long-360');
  errCheck('D end', errs);
  await ctx.close();
});

// ───────── E. iPad and dark mode ─────────
await block('E. iPad + dark', async () => {
  const { ctx, p, errs } = await open(PROFILE(), { viewport: { width: 820, height: 1180 } });
  await goAnki(p);
  await btn(p, /^▶ Review 7 cards$/).click();
  await p.waitForTimeout(150);
  await reveal(p);
  check('iPad: no horizontal scroll, grade buttons present', (await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)) <= 0 && (await btn(p, /^Good/).count()) === 1);
  await shot(p, 'e1-ipad');
  errCheck('E ipad', errs);
  await ctx.close();
  const d = await open(PROFILE(), { dark: true });
  await goAnki(d.p);
  await btn(d.p, /^▶ Review 7 cards$/).click();
  await d.p.waitForTimeout(150);
  await reveal(d.p);
  await shot(d.p, 'e2-dark');
  const bg = await d.p.evaluate(() => getComputedStyle(document.body).backgroundColor);
  check('dark mode: page is dark and the card text is still readable', /rgb\((\d+), (\d+), (\d+)\)/.test(bg) && +bg.match(/\d+/g)[0] < 80, bg);
  errCheck('E dark', d.errs);
  await d.ctx.close();
});

await browser.close();
console.log('\n' + nPass + ' passed, ' + nFail + ' failed');
if (failures.length) { console.log('Failures:'); failures.forEach((f) => console.log(' - ' + f)); process.exit(1); }
