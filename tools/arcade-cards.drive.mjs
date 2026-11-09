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
  check('claim paid coins once', pr.coins === coinsBefore + +m[1] && pr.xp === +m[2], 'coins ' + coinsBefore + '→' + pr.coins + ' xp=' + pr.xp);
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
  await btn(p, /< Games/).click();
  await p.getByText('🎮 Arcade').waitFor();
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
  check('buzzer best persisted', pr.gameBest && typeof pr.gameBest.buzzer === 'number', JSON.stringify(pr.gameBest));
  await btn(p, /< Games/).click();
  await p.getByText('🎮 Arcade').waitFor();
  // neighbours still open
  await btn(p, /Drug Match/).first().click();
  check('Drug Match opens', await p.getByText('Start Sorting').count() === 1);
  await btn(p, /< Games/).click();
  await btn(p, /Staging Attack/).first().click();
  check('Staging Attack opens', await p.getByText('Start Round').count() === 1);
  errCheck('C end', errs);
  await ctx.close();
});

await browser.close();
console.log('\n' + nPass + ' passed, ' + nFail + ' failed');
if (failures.length) { console.log('Failures:'); failures.forEach((f) => console.log(' - ' + f)); process.exit(1); }
