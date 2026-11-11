#!/usr/bin/env node
// Headless E2E for the Arcade card games (Snap Decision, Board Buzzer) and the 2026-11-09 arcade migration.
//
//   python3 -m http.server 2043          (repo root, in another terminal)
//   node tools/arcade-cards.drive.mjs
//
// Env:  URL=http://localhost:2043/UroStudyHub.min.html (default)
//       CDN_DIR=<node_modules with react@18.2.0, react-dom@18.2.0, @babel/standalone@7.23.9, katex@0.16.9>
//                serves the cdnjs scripts locally when the sandbox has no internet; other external requests 404.
//       CHROME=/path/to/chrome   picks the browser.
//
// Checks: migration refunds retired upgrades/unlocks and shows the one-time banner; Snap plays a pinned theme and a
// random theme end to end (buttons, keyboard, timeout), the debrief lists misses with the why, Claim pays once and
// the best score persists; Buzzer plays a round the same way; Drug Match and Staging Attack still open; no console
// errors beyond the known harmless ones.
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
const CDN_MAP = [
  [/react\/18\.2\.0\/umd\/react\.production\.min\.js/, 'react/umd/react.production.min.js', 'application/javascript'],
  [/react-dom\/18\.2\.0\/umd\/react-dom\.production\.min\.js/, 'react-dom/umd/react-dom.production.min.js', 'application/javascript'],
  [/babel-standalone\/7\.23\.9\/babel\.min\.js/, '@babel/standalone/babel.min.js', 'application/javascript'],
  [/KaTeX\/0\.16\.9\/katex\.min\.js/, 'katex/dist/katex.min.js', 'application/javascript'],
  [/KaTeX\/0\.16\.9\/katex\.min\.css/, 'katex/dist/katex.min.css', 'text/css'],
];
const KNOWN_HARMLESS = [/exceeds the max of 500KB/i, /ERR_CONNECTION_REFUSED/, /localhost:1234/];

let nPass = 0, nFail = 0; const failures = [];
function check(name, ok, detail) {
  if (ok) { nPass++; console.log('PASS ' + name + (detail ? '  (' + detail + ')' : '')); }
  else { nFail++; failures.push(name + (detail ? ' — ' + detail : '')); console.log('FAIL ' + name + (detail ? ' — ' + detail : '')); }
  return !!ok;
}
async function block(name, fn) {
  if (process.env.ONLY && !name.startsWith(process.env.ONLY)) return; // ONLY=E runs just the E blocks
  try { await fn(); } catch (e) { check(name + ' (step threw)', false, String(e && e.message ? e.message : e).split('\n')[0]); }
}

const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});

async function open(seed) {
  const ctx = await browser.newContext({ viewport: { width: 640, height: 900 }, deviceScaleFactor: 1 });
  await ctx.addInitScript((a) => {
    try {
      if (!localStorage.getItem('__arcadeSeeded')) {
        Object.keys(a).forEach((k) => localStorage.setItem(k, a[k]));
        localStorage.setItem('__arcadeSeeded', '1');
      }
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
async function openArcade(p) {
  await btn(p, /^🎮\s*Games$/).first().click();
  await p.getByText('🎮 Arcade').waitFor({ timeout: 5000 });
}
const errCheck = (label, errs) => check('no console errors · ' + label, errs.length === 0, errs.slice(0, 3).join(' | '));

// ───────── A. migration + banner ─────────
await block('A. migration', async () => {
  const prog = { role: 'resident', coins: 100, ups: { game_life: 2, laser_power: 1, xp_boost: 1 }, unlockedGames: { blaster: true, imgrec: true, snap: true, buzzer: true } };
  const { ctx, p, errs } = await open({ uroStudyHub_mode: 'light', uroStudyHub_progress: JSON.stringify(prog), uroStudyHub_activePlan: 'aua' });
  errCheck('boot A', errs);
  const pr = await getProg(p);
  // game_life lv2 = 60 + 120, laser_power lv1 = 80, imgrec 200, snap 150 → 610
  // (the daily login bonus may add a few coins on top of the seeded 100)
  check('coins refunded', pr.coins - 610 >= 100 && pr.coins - 610 <= 130, 'coins=' + pr.coins);
  check('retired upgrades gone, generic kept', JSON.stringify(pr.ups) === JSON.stringify({ xp_boost: 1 }), JSON.stringify(pr.ups));
  check('retired unlocks gone, snap free', pr.unlockedGames && !pr.unlockedGames.blaster && !pr.unlockedGames.imgrec && pr.unlockedGames.snap === true && pr.unlockedGames.buzzer === true, JSON.stringify(pr.unlockedGames));
  check('arcadeV stamped', pr.arcadeV === 2 && pr.arcadeRefund === 610, 'v=' + pr.arcadeV + ' refund=' + pr.arcadeRefund);
  await openArcade(p);
  const banner = p.getByText(/Stone Blaster and Visual Dx have retired/);
  check('refund banner shown', await banner.count() === 1);
  check('banner names the amount', (await banner.innerText()).includes('610 💰'));
  const tiles = await p.locator('button').evaluateAll((els) => els.map((e) => e.textContent).filter((t) => /Snap Decision|Board Buzzer|Stone Blaster|Visual Dx|Drug Match|Staging Attack|Uro Rush|Pre-Op|Stone Squadron/.test(t)));
  check('retired tiles gone', !tiles.some((t) => /Stone Blaster|Visual Dx/.test(t)), tiles.length + ' tiles');
  check('Snap is the starred free game', tiles.some((t) => /Snap Decision ★/.test(t)));
  // dismiss
  await banner.locator('xpath=..').locator('button').click();
  await p.waitForTimeout(200);
  check('banner dismissed and cleared', await p.getByText(/have retired/).count() === 0 && (await getProg(p)).arcadeRefund === 0);
  // shop: no Blaster upgrades
  await btn(p, /Shop/).click();
  const shopTxt = await p.locator('body').innerText();
  check('shop has no Blaster upgrades', !/Laser Power|Coin Magnet|Critical Hit|Time Extend|Extra Lives/.test(shopTxt) && /Research Grant/.test(shopTxt));
  check('shop no longer sells Snap (free) or Visual Dx', !/Visual Dx/.test(shopTxt) && !/Snap Decision/.test(shopTxt));
  errCheck('A end', errs);
  await ctx.close();
});

// ───────── B. Snap Decision ─────────
await block('B. snap', async () => {
  const { ctx, p, errs } = await open({ uroStudyHub_mode: 'light', uroStudyHub_admin: 'true', uroStudyHub_progress: JSON.stringify({ role: 'resident', coins: 0, xp: 0 }), uroStudyHub_activePlan: 'aua' });
  await openArcade(p);
  await btn(p, /Snap Decision/).first().click();
  await p.getByText('Swipe clinical calls').first().waitFor();
  check('ready card has the how-to', await p.getByText(/A different theme each round/).count() === 1);
  const chips = await p.locator('button').evaluateAll((els) => els.map((e) => e.textContent).filter((t) => /Random theme|Bench or OR|Surveillance or Intervention|Stent or No Stent|Admit or Discharge|Biopsy or Hold|Antibiotics or Not|Cut or Drug/.test(t)));
  check('8 theme chips', chips.length === 8, chips.join(' / '));

  // pinned theme, play with buttons; alternate left/right so there are misses to review
  await btn(p, /Stent or No Stent/).click();
  await btn(p, /^Start round/).click();
  await p.getByText(/🪢 Stent or No Stent\?/).first().waitFor();
  const pill = await p.getByText(/🪢 Stent or No Stent\?/).first().innerText();
  check('theme pill on the card', /Stent or No Stent/.test(pill), pill);
  check('left/right calls printed on the card', await p.getByText('← No stent').count() >= 1 && await p.getByText('Stent →').count() >= 1);
  let reveals = 0, corrects = 0;
  for (let i = 0; i < 10; i++) {
    const hud = await p.locator('text=/^\\d+\\/10$/').first().innerText();
    check('hud progress ' + (i + 1), hud === (i + 1) + '/10', hud);
    if (i === 0) {
      // keyboard commit on the first card
      await p.keyboard.press('ArrowRight');
    } else if (i === 1) {
      // let the clock run out: 20 s + a little
      await p.waitForTimeout(21500);
      check('timeout reveal', await p.getByText(/Time's up/).count() === 1);
    } else {
      await (i % 2 ? btn(p, /No stent/).first() : btn(p, /Stent\s*→/).first()).click();
    }
    const box = p.getByText(/✓ Correct|was the call/).first();
    await box.waitFor({ timeout: 3000 });
    reveals++;
    if (/✓ Correct/.test(await box.innerText())) corrects++;
    check('why shown on reveal ' + (i + 1), (await p.locator('text=/was the call|✓ Correct/').locator('xpath=..').innerText()).length > 40);
    if (i < 9) { await btn(p, /Next case/).click(); } else { await btn(p, /See results/).click(); }
  }
  check('10 reveals', reveals === 10);
  await p.getByText(/Round complete|Perfect round/).waitFor();
  const over = await p.locator('body').innerText();
  check('debrief sub names the theme', /Stent or No Stent\?/.test(over));
  check('debrief shows accuracy', new RegExp('✓ ' + corrects + '/10').test(over), 'corrects=' + corrects);
  check('debrief has reward preview', /\+\d+ 💰 · \+\d+ XP/.test(over));
  const misses = 10 - corrects;
  if (misses > 0) check('miss review listed', new RegExp('REVIEW · ' + misses + ' MISSED').test(over) && /Ran out of time/.test(over), 'misses=' + misses);
  else check('clean round text', /No misses/.test(over));
  const coinsBefore = (await getProg(p)).coins;
  await btn(p, /^Claim/).click();
  await p.waitForTimeout(300);
  const pr = await getProg(p);
  const m = over.match(/\+(\d+) 💰 · \+(\d+) XP/);
  // the first finished Snap round of the day also pays the first-play bonus (+25 💰 +10 XP), once
  check('claim paid coins once, plus the first-play bonus', pr.coins === coinsBefore + +m[1] + 25 && pr.xp === +m[2] + 10, 'coins ' + coinsBefore + '→' + pr.coins + ' xp=' + pr.xp);
  check('first-play toast shown', await p.getByText(/First Snap Decision today: \+25 💰 \+10 XP/).count() === 1);
  check('play counter: 1 play, 1 launch', pr.gameStats && pr.gameStats.snap && pr.gameStats.snap.plays === 1 && pr.gameStats.snap.opens === 1, JSON.stringify(pr.gameStats));
  check('claim button disabled', await btn(p, /Claimed ✓/).isDisabled());
  check('best score persisted', pr.gameBest && pr.gameBest.snap > 0 && /New best!/.test(over), 'best=' + JSON.stringify(pr.gameBest));

  // random theme round: pill is one of the themes, all buttons left
  await btn(p, /New round/).click();
  await btn(p, /Random theme/).click();
  await btn(p, /^Start round/).click();
  await p.waitForTimeout(400);
  const pill2 = await p.locator('text=/(Bench or OR|Surveillance or Intervention|Stent or No Stent|Admit or Discharge|Biopsy or Hold|Antibiotics or Not|Cut or Drug)\\?/').first().innerText();
  check('random round dealt a theme', pill2.length > 0, pill2);
  for (let i = 0; i < 10; i++) {
    const left = p.locator('button').filter({ hasText: /^←|←/ }).first();
    await left.click();
    await p.getByText(/✓ Correct|was the call/).first().waitFor({ timeout: 3000 });
    await (i < 9 ? btn(p, /Next case/) : btn(p, /See results/)).click();
  }
  await p.getByText(/Round complete|Perfect round/).waitFor();
  check('second round reached the debrief', true);
  await p.waitForTimeout(300);
  const pr2 = await getProg(p);
  check('best unchanged or higher after round 2', pr2.gameBest.snap >= pr.gameBest.snap);
  // a second claim the same day pays only the round: the bonus is once per game per day
  const over2 = await p.locator('body').innerText();
  const m2 = over2.match(/\+(\d+) 💰 · \+(\d+) XP/);
  const before2 = await getProg(p);
  await btn(p, /^Claim/).click();
  await p.waitForTimeout(300);
  const after2 = await getProg(p);
  check('second claim of the day pays no bonus', after2.coins === before2.coins + +m2[1] && after2.xp === before2.xp + +m2[2], 'coins ' + before2.coins + '→' + after2.coins);
  check('play counter: 2 plays, still 1 launch', after2.gameStats.snap.plays === 2 && after2.gameStats.snap.opens === 1, JSON.stringify(after2.gameStats.snap));
  await btn(p, /< Games/).click();
  await p.getByText('🎮 Arcade').waitFor();
  const snapMeta = await p.locator('[data-game-meta="snap"]').innerText();
  check('Snap card shows 2× played and the bonus taken', /2× played/.test(snapMeta) && /today's bonus taken/.test(snapMeta) && /logged this week/.test(snapMeta), snapMeta.replace(/\s+/g, ' '));
  errCheck('B end', errs);
  await ctx.close();
});

// ───────── C. Board Buzzer + neighbours ─────────
await block('C. buzzer', async () => {
  const { ctx, p, errs } = await open({ uroStudyHub_mode: 'light', uroStudyHub_admin: 'true', uroStudyHub_progress: JSON.stringify({ role: 'resident', coins: 0, xp: 0 }), uroStudyHub_activePlan: 'aua' });
  await openArcade(p);
  await btn(p, /Board Buzzer/).first().click();
  await p.getByText(/Built-in bank: \d+ questions/).waitFor();
  const bank = +((await p.getByText(/Built-in bank: \d+ questions/).innerText()).match(/\d+/)[0]);
  check('bank has 50 questions', bank === 50, String(bank));
  await btn(p, /Buzz in/).click();
  let answered = 0, whyShown = 0;
  for (let i = 0; i < 10; i++) {
    const opt = p.locator('button').filter({ hasText: /^A\. / }).first();
    try { await opt.waitFor({ timeout: 4000 }); } catch (e) { break; } // out of lives
    if (i === 0) await p.keyboard.press('1'); else await opt.click();
    answered++;
    const fb = p.getByText(/✓ Correct|✗ |Time's up/).first();
    await fb.waitFor({ timeout: 3000 });
    if ((await fb.locator('xpath=..').innerText()).length > 30) whyShown++;
    await p.waitForTimeout(2600);
    if (await p.getByText(/Round complete|Perfect round|Out of lives/).count()) break;
  }
  await p.getByText(/Round complete|Perfect round|Out of lives/).waitFor({ timeout: 5000 });
  check('buzzer round finished', answered >= 3, 'answered=' + answered);
  check('why shown after every answer', whyShown === answered, whyShown + '/' + answered);
  const over = await p.locator('body').innerText();
  check('buzzer debrief has reward + accuracy', /\+\d+ 💰 · \+\d+ XP/.test(over) && /✓ \d+\/\d+/.test(over));
  await btn(p, /^Claim/).click();
  await p.waitForTimeout(300);
  const pr = await getProg(p);
  const bScore = +((over.match(/\n(\d+)\n/) || [0, 0])[1]); // a 0-point round (all wrong) is correctly not a best
  check('buzzer best persisted', bScore === 0 ? !(pr.gameBest && pr.gameBest.buzzer) : (pr.gameBest && pr.gameBest.buzzer === bScore), 'score=' + bScore + ' best=' + JSON.stringify(pr.gameBest));
  await btn(p, /< Games/).click();
  await p.getByText('🎮 Arcade').waitFor();
  // neighbours still open
  await btn(p, /Drug Match/).first().click();
  check('Drug Match opens', await p.getByText('Start Sorting').count() === 1);
  await btn(p, /< Games/).click();
  await btn(p, /Staging Attack/).first().click();
  check('Staging Attack opens', await p.getByText(/Survive the waves/).count() === 1);
  errCheck('C end', errs);
  await ctx.close();
});

// ───────── D. Staging Attack (survival shooter) ─────────
await block('D. staging', async () => {
  // the case data, read from the served page so the oracle matches what runs there
  const html = await (await fetch(PAGE_URL)).text();
  const m = html.match(/var STAGING_CANCERS = (\[[\s\S]*?\n\s*\]);\s*var STAGING_ROWS/);
  check('staging data found in page', !!m);
  const DATA = new Function('return ' + m[1] + ';')();
  const ROWOPTS = { t: 'tOpts', n: 'nOpts', m: 'mOpts', stg: 'stageOpts' };
  const byDesc = {}; DATA.forEach((c) => c.cases.forEach((k) => { byDesc[k.desc] = k; }));
  let bad = [];
  DATA.forEach((c) => c.cases.forEach((k) => { if (c.tOpts.indexOf(k.t) < 0 || c.nOpts.indexOf(k.n) < 0 || c.mOpts.indexOf(k.m) < 0 || c.stageOpts.indexOf(k.stg) < 0) bad.push(c.short + ': ' + k.desc); }));
  check('every case answerable from the chip rows', bad.length === 0, bad.join('; '));
  check('five cancers, 70+ cases', DATA.length === 5 && Object.keys(byDesc).length >= 70, Object.keys(byDesc).length + ' cases');

  const { ctx, p, errs } = await open({ uroStudyHub_mode: 'light', uroStudyHub_admin: 'true', uroStudyHub_progress: JSON.stringify({ role: 'resident', coins: 0, xp: 0 }), uroStudyHub_activePlan: 'aua' });
  await openArcade(p);
  await btn(p, /Staging Attack/).first().click();
  await btn(p, /Random, mixed from wave 3/).click();
  await btn(p, /^Start ▸/).click();
  const tgtEl = p.locator('[data-stg-target-q]');
  async function waitTarget() {
    await p.waitForFunction(() => { const el = document.querySelector('[data-stg-target-q]'); return !!(el && el.getAttribute('data-stg-target-q')); }, null, { timeout: 10000 });
    return { q: await tgtEl.getAttribute('data-stg-target-q'), desc: await tgtEl.getAttribute('data-stg-target-case'), ca: await tgtEl.getAttribute('data-stg-target-cancer') };
  }
  const seen = new Set(); let unknown = 0, popped = 0;
  for (let i = 0; i < 26; i++) {
    const t = await waitTarget(); const k = byDesc[t.desc];
    if (!k) { unknown++; break; }
    seen.add(t.ca);
    const ans = k[t.q];
    if (i === 0) { await p.keyboard.type(ans.toLowerCase()); await p.keyboard.press('Enter'); }
    else if (i === 1) {
      const wrong = DATA.find((c) => c.short === t.ca)[ROWOPTS[t.q]].find((o) => o !== ans);
      await p.locator('[data-stg-chip="' + t.q + ':' + wrong + '"]').click();
      await p.waitForTimeout(150);
      check('wrong chip keeps the case on the field', (await tgtEl.getAttribute('data-stg-target-case')) === t.desc);
      await p.locator('[data-stg-chip="' + t.q + ':' + ans + '"]').click();
    } else if (i === 5) {
      await btn(p, /^⏸$/).click();
      check('pause overlay', (await p.getByText(/⏸ Paused/).count()) === 1);
      await p.waitForTimeout(800);
      await btn(p, /Resume/).click();
      check('resumed', (await p.getByText(/⏸ Paused/).count()) === 0);
      await p.locator('[data-stg-chip="' + t.q + ':' + ans + '"]').click();
    } else {
      await p.locator('[data-stg-chip="' + t.q + ':' + ans + '"]').click();
    }
    popped++;
    await p.waitForFunction((d) => { const el = document.querySelector('[data-stg-target-q]'); return !el || el.getAttribute('data-stg-target-case') !== d; }, t.desc, { timeout: 3000 }).catch(() => {});
  }
  check('all 26 targets were known cases', unknown === 0 && popped === 26, popped + ' popped');
  const hud = await p.locator('body').innerText();
  check('wave 3 reached', /Wave 3/.test(hud));
  check('mixed cancers from wave 3', seen.size >= 2, [...seen].join(','));
  check('all lives still there', (await p.locator('[data-stg-lives]').getAttribute('data-stg-lives')) === '3');
  // now stop answering and let it overwhelm us
  await p.getByText(/Overwhelmed on wave/).waitFor({ timeout: 90000 });
  const over = await p.locator('body').innerText();
  check('debrief: 3 misses, 26 popped', /✓ 26\/29/.test(over) && /REVIEW · 3 MISSED/.test(over) && /Ran out of time/.test(over), (over.match(/✓ \d+\/\d+/) || [''])[0]);
  check('debrief: rule lines on the misses', (over.match(/T1 ≤7 cm|Ta papillary|cT1 = not palpable|pT1 confined|Regional = true pelvis|N1 = |N1 nodes|M1 = |M1a |Needs PSA|Needs S|0a Ta|I = T1 N0/g) || []).length >= 3);
  const score = +((over.match(/\n(\d+)\n/) || [0, 0])[1]);
  check('score counted', score > 400, 'score=' + score);
  await btn(p, /^Claim/).click();
  await p.waitForTimeout(300);
  const pr = await getProg(p);
  check('staging best persisted', pr.gameBest && pr.gameBest.staging === score, JSON.stringify(pr.gameBest));
  await btn(p, /Play again/).click();
  check('back to the ready card', (await p.getByText(/Survive the waves/).count()) === 1);
  errCheck('D end', errs);
  await ctx.close();
});

// ───────── E. play counter, daily first-play bonus, weekly Case Minimums ─────────
// The frame games (Uro Rush, Pre-Op, Path of Pathology) are paid through the same postMessage claim the real pages send,
// posted from inside their own frame so the app's origin + source check passes. Stone Squadron is left out (it needs three.js
// from a CDN); the deeper tiers are reached from a seeded week instead of by playing seven games.
const dayKey = (d = new Date()) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const weekKey = (d = new Date()) => { const x = new Date(d.getTime()); x.setHours(12, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return dayKey(x); };
const ALL_UNLOCKED = { snap: true, rush: true, preop: true, squadron: true, drugmatch: true, buzzer: true, staging: true, crawl: true };
// lastLoginDate = today (UTC, as the app keys it): otherwise the "Daily login bonus" toast fires 1 s after load and overwrites a
// game's bonus toast, which a person would not hit but a harness claiming within a second of loading does.
const utcToday = () => new Date().toISOString().split('T')[0];
async function eOpen(extra, admin = true) {
  const seed = { uroStudyHub_mode: 'light', uroStudyHub_progress: JSON.stringify(Object.assign({ role: 'resident', coins: 0, xp: 0, tokens: 5, unlockedGames: ALL_UNLOCKED, lastLoginDate: utcToday() }, extra)), uroStudyHub_activePlan: 'aua' };
  if (admin) seed.uroStudyHub_admin = 'true';
  return open(seed);
}
async function gameFrame(p, re) {
  for (let i = 0; i < 60; i++) { const f = p.frames().find((x) => re.test(x.url())); if (f) { await f.waitForLoadState('domcontentloaded'); return f; } await p.waitForTimeout(100); }
  throw new Error('game frame not found: ' + re);
}
async function post(p, re, msg) { const fr = await gameFrame(p, re); await fr.evaluate((m) => parent.postMessage(m, location.origin), msg); await p.waitForTimeout(350); }
const RUSH = /uro-rush\.html/, PREOP = /preop-please\.html/, CRAWL = /uro-crawl\.html/;
const toastText = (p) => p.evaluate(() => [...document.querySelectorAll('div')].filter((d) => d.style && d.style.zIndex === '300').map((e) => e.innerText).join(' | '));
const caseCount = async (p) => (await p.locator('[data-case-count]').innerText()).replace(/\s+/g, ' ');

await block('E1. counters, daily bonus, tier 3', async () => {
  const { ctx, p, errs } = await eOpen({});
  await openArcade(p);
  check('panel starts at 0 of 7', /^0 \/ 7 games this week/.test(await caseCount(p)), await caseCount(p));
  check('3 tier chips, none paid', await p.locator('[data-tier]').count() === 3 && await p.locator('[data-tier]').filter({ hasText: '✓' }).count() === 0);
  check('all 8 unlocked games offer the first-play bonus', await p.locator('[data-game-meta]').filter({ hasText: '+25 💰 first play today' }).count() === 8);
  check('every card starts at 0× played', await p.locator('[data-game-meta]').filter({ hasText: '0× played' }).count() === 8);

  await btn(p, /Uro Rush/).first().click();
  await p.waitForTimeout(300);
  const c0 = await getProg(p);
  check('launch counted before any claim', c0.gameStats && c0.gameStats.rush && c0.gameStats.rush.opens === 1 && c0.gameStats.rush.plays === 0, JSON.stringify(c0.gameStats));
  await post(p, RUSH, { type: 'rush:claim', coins: 40, xp: 10 });
  const c1 = await getProg(p);
  check('rush: round + first-play bonus', c1.coins === c0.coins + 40 + 25 && c1.xp === c0.xp + 10 + 10, 'coins ' + c0.coins + '→' + c1.coins);
  check('rush: counters + daily record + week record', c1.gameStats.rush.plays === 1 && c1.gameStats.rush.coins === 40 && c1.dailyFirst.day === dayKey() && c1.dailyFirst.games.rush === true && c1.rotation.week === weekKey() && c1.rotation.games.rush === 1, JSON.stringify([c1.gameStats.rush, c1.dailyFirst, c1.rotation]));
  check('rush: toast names the bonus', await p.getByText(/First Uro Rush today: \+25 💰 \+10 XP/).count() === 1);

  await openArcade(p);
  check('panel shows 1 of 7', /^1 \/ 7 games/.test(await caseCount(p)), await caseCount(p));
  const rm = (await p.locator('[data-game-meta="rush"]').innerText()).replace(/\s+/g, ' ');
  check('rush card: 1× played, logged, bonus taken', /1× played/.test(rm) && /logged this week/.test(rm) && /today's bonus taken/.test(rm), rm);
  check('other cards still offer the bonus', await p.locator('[data-game-meta]').filter({ hasText: '+25 💰 first play today' }).count() === 7);

  // same game again: the round pays, the bonus does not, and it is not a second game for the week
  await btn(p, /Uro Rush/).first().click();
  await p.waitForTimeout(200);
  const c2 = await getProg(p);
  await post(p, RUSH, { type: 'rush:claim', coins: 40, xp: 10 });
  const c3 = await getProg(p);
  check('rush again: no bonus', c3.coins === c2.coins + 40 && c3.xp === c2.xp + 10, 'coins ' + c2.coins + '→' + c3.coins);
  check('rush again: 2 plays, 2 launches, still 1 game this week', c3.gameStats.rush.plays === 2 && c3.gameStats.rush.opens === 2 && Object.keys(c3.rotation.games).length === 1 && c3.rotation.games.rush === 2, JSON.stringify(c3.rotation));

  await openArcade(p);
  await btn(p, /Pre-Op, Please/).first().click();
  await p.waitForTimeout(200);
  await post(p, PREOP, { type: 'preop:claim', coins: 30, xp: 8 });
  const c4 = await getProg(p);
  check('preop: second game, bonus paid, no tier yet', c4.coins === c3.coins + 30 + 25 && c4.tokens === c3.tokens && Object.keys(c4.rotation.games).length === 2, 'tokens ' + c4.tokens);

  await openArcade(p);
  await btn(p, /Path of Pathology/).first().click();
  await p.waitForTimeout(200);
  await post(p, CRAWL, { type: 'crawl:result', won: false, rooms: 3, kills: 10 }); // 3×8 + 2 = 26 coins, 15 XP
  const c5 = await getProg(p);
  check('crawl: third game pays the round, the bonus and a token', c5.coins === c4.coins + 26 + 25 && c5.xp === c4.xp + 15 + 10 && c5.tokens === c4.tokens + 1, 'coins ' + c4.coins + '→' + c5.coins + ' tokens ' + c4.tokens + '→' + c5.tokens);
  check('crawl: 3-game tier recorded', c5.rotation.claimed['3'] === true && Object.keys(c5.rotation.games).length === 3, JSON.stringify(c5.rotation));
  check('crawl: toast shows bonus and tier on one line', await p.getByText(/First Path of Pathology today: \+25 💰 \+10 XP · 📋 3 games this week: \+1 🪙/).count() === 1);
  const tokenRows = (pr) => (pr.activityLog || []).filter((e) => e.tokens > 0).length; // opening the arcade logs a zero-token "feature" row; that is fine
  check('token bonus stays out of the study stats', c5.tokensEarned === c4.tokensEarned && tokenRows(c5) === tokenRows(c4), 'earned ' + c5.tokensEarned);
  await post(p, CRAWL, { type: 'crawl:exit' });
  await openArcade(p);
  check('panel shows 3 of 7 with tier 3 paid', /^3 \/ 7 games/.test(await caseCount(p)) && /✓/.test(await p.locator('[data-tier="3"]').innerText()) && !/✓/.test(await p.locator('[data-tier="5"]').innerText()));
  errCheck('E1 end', errs);
  await ctx.close();
});

await block('E2. tier 5 and the full rotation from a seeded week', async () => {
  const wk = weekKey();
  // four games logged and the 3-game tier already paid; Path of Pathology is the fifth
  let { ctx, p, errs } = await eOpen({ rotation: { week: wk, games: { snap: 1, buzzer: 1, staging: 2, drugmatch: 1 }, claimed: { 3: true } }, dailyFirst: { day: dayKey(), games: { snap: true } } });
  await openArcade(p);
  check('seeded week reads 4 of 7', /^4 \/ 7 games/.test(await caseCount(p)), await caseCount(p));
  await btn(p, /Path of Pathology/).first().click();
  await p.waitForTimeout(200);
  const a0 = await getProg(p);
  await post(p, CRAWL, { type: 'crawl:result', won: true, rooms: 9, kills: 40 }); // 72 + 10 + 50 = 132 coins, 45 + 35 = 80 → 80 XP
  const a1 = await getProg(p);
  check('tier 5 pays 1 token and 30 coins on top of round + first-play bonus', a1.tokens === a0.tokens + 1 && a1.coins === a0.coins + 132 + 25 + 30, 'coins ' + a0.coins + '→' + a1.coins + ' tokens ' + a0.tokens + '→' + a1.tokens);
  check('tier 5 recorded, tier 7 not', a1.rotation.claimed['5'] === true && !a1.rotation.claimed['7'] && a1.rotationFull === 0);
  await p.waitForTimeout(2500); // still showing 3 s after the claim: the daily-login toast's timer (boot + 3.5 s) must not cut it short
  check('toast names tier 5', await p.getByText(/📋 5 games this week: \+1 🪙 \+30 💰/).count() === 1, 'toast=' + JSON.stringify(await toastText(p)));
  errCheck('E2a end', errs);
  await ctx.close();

  // six games logged, tiers 3 + 5 paid; Uro Rush is the seventh
  ({ ctx, p, errs } = await eOpen({ rotation: { week: wk, games: { snap: 1, buzzer: 1, staging: 1, drugmatch: 1, preop: 1, crawl: 1 }, claimed: { 3: true, 5: true } }, rotationFull: 2 }));
  await openArcade(p);
  await btn(p, /Uro Rush/).first().click();
  await p.waitForTimeout(200);
  const b0 = await getProg(p);
  await post(p, RUSH, { type: 'rush:claim', coins: 20, xp: 5 });
  const b1 = await getProg(p);
  check('full rotation pays 2 tokens and 100 coins', b1.tokens === b0.tokens + 2 && b1.coins === b0.coins + 20 + 25 + 100 && b1.rotationFull === 3, 'coins ' + b0.coins + '→' + b1.coins + ' tokens ' + b0.tokens + '→' + b1.tokens + ' full=' + b1.rotationFull);
  check('toast says full rotation', await p.getByText(/📋 Full rotation! \+2 🪙 \+100 💰/).count() === 1, 'toast=' + JSON.stringify(await toastText(p)));
  await openArcade(p);
  check('panel shows 7 of 7, all tiers paid, full-rotation count', /^7 \/ 7 games/.test(await caseCount(p)) && await p.locator('[data-tier]').filter({ hasText: '✓' }).count() === 3 && /★ 3 full/.test(await p.locator('[data-full-rotations]').innerText()));
  errCheck('E2b end', errs);
  await ctx.close();
});

await block('E3. a new day and a new week reset the bonuses; tokens and launches', async () => {
  const lastWeek = weekKey(new Date(Date.now() - 7 * 86400000)), yesterday = dayKey(new Date(Date.now() - 86400000));
  // not admin: opening a game spends a token. Last week's record and yesterday's bonus are stale.
  const { ctx, p, errs } = await eOpen({ tokens: 3, rotation: { week: lastWeek, games: { snap: 3, rush: 2, preop: 1, buzzer: 1, crawl: 1, staging: 1 }, claimed: { 3: true, 5: true } }, dailyFirst: { day: yesterday, games: { rush: true, snap: true } }, rotationFull: 1 }, false);
  await openArcade(p);
  check('last week reads as 0 of 7 with no tiers paid', /^0 \/ 7 games/.test(await caseCount(p)) && await p.locator('[data-tier]').filter({ hasText: '✓' }).count() === 0, await caseCount(p));
  check("yesterday's bonus is open again on every card", await p.locator('[data-game-meta]').filter({ hasText: '+25 💰 first play today' }).count() === 8);
  const t0 = await getProg(p);
  await btn(p, /Uro Rush/).first().click();
  await p.waitForTimeout(300);
  const t1 = await getProg(p);
  check('a launch spends one token and counts once', t1.tokens === t0.tokens - 1 && t1.gameStats.rush.opens === 1, 'tokens ' + t0.tokens + '→' + t1.tokens);
  await post(p, RUSH, { type: 'rush:claim', coins: 12, xp: 4 });
  const t2 = await getProg(p);
  check("today's first rush round pays the bonus again", t2.coins === t1.coins + 12 + 25 && t2.dailyFirst.day === dayKey() && Object.keys(t2.dailyFirst.games).join() === 'rush', 'coins ' + t1.coins + '→' + t2.coins);
  check("this week's record replaces last week's; lifetime full-rotation count kept", t2.rotation.week === weekKey() && JSON.stringify(t2.rotation.games) === '{"rush":1}' && Object.keys(t2.rotation.claimed).length === 0 && t2.rotationFull === 1, JSON.stringify(t2.rotation));
  check('old stats kept (older plays are not lost)', t2.gameStats.rush.plays === 1 && t2.tokens === t1.tokens);
  errCheck('E3 end', errs);
  await ctx.close();
});

await block('E4. a profile saved before this feature loads and plays', async () => {
  const { ctx, p, errs } = await open({ uroStudyHub_mode: 'light', uroStudyHub_admin: 'true', uroStudyHub_progress: JSON.stringify({ role: 'resident', coins: 10, xp: 0, games: 7, unlockedGames: { snap: true, rush: true }, lastLoginDate: utcToday() }), uroStudyHub_activePlan: 'aua' });
  errCheck('boot E4', errs);
  await openArcade(p);
  check('panel renders from nothing', /^0 \/ 7 games/.test(await caseCount(p)), await caseCount(p));
  await btn(p, /Uro Rush/).first().click();
  await p.waitForTimeout(200);
  const o0 = await getProg(p);
  await post(p, RUSH, { type: 'rush:claim', coins: 9, xp: 3 });
  const o1 = await getProg(p);
  check('first claim on an old profile works', o1.coins === o0.coins + 9 + 25 && o1.games === o0.games + 1 && o1.gameStats.rush.plays === 1, 'coins ' + o0.coins + '→' + o1.coins + ' games ' + o0.games + '→' + o1.games);
  errCheck('E4 end', errs);
  await ctx.close();
});

await browser.close();
console.log('\n' + nPass + ' passed, ' + nFail + ' failed');
if (failures.length) { console.log('Failures:'); failures.forEach((f) => console.log(' - ' + f)); process.exit(1); }
