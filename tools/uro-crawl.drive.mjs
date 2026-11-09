#!/usr/bin/env node
// Headless E2E for Uro Crawl (games/uro-crawl.html): boots the page, runs a room with mouse + keyboard, checks every
// weapon deals damage (primary and alt), the class-vs-family matrix, status interactions (bleed→cauterize, chill→frozen
// →shatter, biofilm strip, AML hemorrhage), the Right Tool bonus, the Staghorn's three phases, death and win screens,
// persistence, touch controls (floating stick + FIRE with a second finger, slot taps, pause button), the rotate
// overlay, the ?embed=1 postMessage contract, and autoplays several seeds through all nine rooms.
// Also the HIFU / Urethrotome / CO₂ / da Vinci console additions and the Condyloma Cluster, and (block J) the weapon
// upgrade paths: the MODS table, every mod's in-game effect for the five starting weapons, the aspects, Instrument Rep
// doors + screen + reroll, the shop sample, the HUD pips/detail card and the giveMod / ?mods= / ?aspects= hooks.
//
//   python3 -m http.server 2043          (repo root, in another terminal)
//   node tools/uro-crawl.drive.mjs
//
// Env:  URL=http://localhost:2043/games/uro-crawl.html (default)   CHROME=/path/to/chrome   OUT=<dir for screenshots>
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const require = createRequire(import.meta.url);
let chromium;
for (const m of ['playwright', 'playwright-core', '@playwright/test', '/opt/node-tools/node_modules/playwright']) {
  try { ({ chromium } = require(m)); if (chromium) break; } catch (e) { /* next */ }
}
if (!chromium) { console.log('FAIL setup: Playwright not found'); process.exit(1); }

const BASE = process.env.URL || 'http://localhost:2043/games/uro-crawl.html';
const OUT = process.env.OUT || join(tmpdir(), 'uro-crawl-shots'); mkdirSync(OUT, { recursive: true });
let nPass = 0, nFail = 0; const failures = [];
function check(name, ok, detail) {
  if (ok) { nPass++; console.log('PASS ' + name + (detail ? '  (' + detail + ')' : '')); }
  else { nFail++; failures.push(name + (detail ? ' — ' + detail : '')); console.log('FAIL ' + name + (detail ? ' — ' + detail : '')); }
  return !!ok;
}
async function block(name, fn) { try { await fn(); } catch (e) { check(name + ' (step threw)', false, String(e && e.message ? e.message : e).split('\n')[0]); } }
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
async function open(q, w = 1280, h = 720, touch = false) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: touch, deviceScaleFactor: 1 });
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await p.goto(BASE + q); await p.waitForFunction(() => !!window.UroCrawl);
  return { ctx, p, errs };
}
const errCheck = (label, errs) => check('no console errors · ' + label, errs.length === 0, errs.slice(0, 3).join(' | '));
const shot = (p, name) => p.screenshot({ path: join(OUT, name + '.png') });

// ───────── A. weapons, matrix, statuses ─────────
await block('A. weapons', async () => {
  const { p, errs } = await open('?seed=3&god=1&room=2');
  await p.evaluate(() => { UroCrawl.startRun(); UroCrawl.step(2); UroCrawl.state.enemies.forEach(e => { e.silent = true; e.hp = 0; }); UroCrawl.step(1); UroCrawl.state.waves.next = 99; UroCrawl.state.obstacles.length = 0; });
  const weapons = await p.evaluate(() => Object.keys(UroCrawl.tables.WEAPONS).filter(id => !UroCrawl.tables.WEAPONS[id].ultimate));
  check('22 slot weapons + the ultimate in the table', weapons.length >= 22, weapons.length + ' weapons');
  for (const wid of weapons) {
    const r = await p.evaluate((wid) => {
      const G = UroCrawl.state, P = UroCrawl.player();
      G.enemies.forEach(e => { e.silent = true; e.hp = 0; }); UroCrawl.step(1); G.bullets.length = 0; G.seeds.length = 0; G.turrets.length = 0;
      G.weapons.length = 0; G.wIndex = 0; UroCrawl.giveWeapon(wid); G.swapT = 0;
      P.x = 300; P.y = 270; const dist = wid === 'scalpel' ? 50 : wid === 'roller' || wid === 'button' || wid === 'trilogy' ? 60 : wid === 'loop' ? 80 : 150;
      const pin = function (e) { e.vx = e.vy = 0; e.x = P.x + dist; e.y = P.y; };
      const t1 = UroCrawl.spawn('com', P.x + dist, P.y, { instant: true }); t1.def = Object.assign({}, t1.def, { update: pin });
      const t2 = UroCrawl.spawn('com', P.x + dist + 40, P.y + 30, { instant: true }); t2.def = t1.def;
      const sum = o => Object.values(o).reduce((a, b) => a + b, 0), before = sum(G.stats.dmg);
      UroCrawl.input.mode = 'kb'; UroCrawl.input.mx = P.x + dist; UroCrawl.input.my = P.y; UroCrawl.input.mouseFire = true; UroCrawl.step(90);
      UroCrawl.input.mouseFire = false; UroCrawl.step(90);
      const prim = sum(G.stats.dmg) - before;
      if (wid === 'foley') { UroCrawl.input.mouseFire = true; UroCrawl.step(50); }
      UroCrawl.input.edges.alt = true; UroCrawl.input.mouseAlt = true; UroCrawl.step(1); UroCrawl.step(60); UroCrawl.input.mouseAlt = false; UroCrawl.input.mouseFire = false;
      UroCrawl.input.mouseFire = true; UroCrawl.step(60); UroCrawl.input.mouseFire = false; UroCrawl.step(60);
      return { prim: Math.round(prim), total: Math.round(sum(G.stats.dmg) - before) };
    }, wid);
    check('weapon deals damage · ' + wid, r.total > 0, 'primary ' + r.prim + ', with alt ' + r.total);
  }
  const m = await p.evaluate(() => {
    const G = UroCrawl.state; G.enemies.forEach(e => { e.silent = true; e.hp = 0; }); UroCrawl.step(1);
    const stone = UroCrawl.spawn('com', 600, 200, { instant: true }), bug = UroCrawl.spawn('pseudomonas', 600, 300, { instant: true }), tumor = UroCrawl.spawn('papillary', 600, 400, { instant: true });
    const d1 = UroCrawl.dealDamage(stone, 10, 'LITHO', {}), d2 = UroCrawl.dealDamage(stone, 10, 'ENERGY', {}), d3 = UroCrawl.dealDamage(tumor, 10, 'CUT', {}), d4 = UroCrawl.dealDamage(bug, 10, 'ENERGY', {});
    const subs = G.texts.map(t => t.sub || t.text);
    const cy = UroCrawl.spawn('cystine', 500, 200, { instant: true }); G.weapons.length = 0; UroCrawl.giveWeapon('scalpel'); UroCrawl.giveWeapon('holmium'); G.wIndex = 0; UroCrawl.selectWeapon(1); UroCrawl.step(20); const rt = UroCrawl.dealDamage(cy, 10, 'LITHO', {});
    const t = UroCrawl.spawn('papillary', 500, 300, { instant: true }); UroCrawl.dealDamage(t, 5, 'CUT', { status: { bleed: [3, 4] } }); const bleeding = !!t.st.bleed, hp0 = t.hp; UroCrawl.dealDamage(t, 1, 'ENERGY', { cauterize: true }); const cauterized = !t.st.bleed && t.hp < hp0 - 5;
    const s = UroCrawl.spawn('com', 500, 400, { instant: true }); for (let i = 0; i < 3; i++) UroCrawl.dealDamage(s, 1, 'ENERGY', { status: { chill: [3, 1] } }); const frozen = !!s.st.frozen; const dF = UroCrawl.dealDamage(s, 10, 'LITHO', {});
    const nb = UroCrawl.spawn('frag', 540, 400, { instant: true }); const nbHp = nb.hp; s.hp = 1; UroCrawl.dealDamage(s, 10, 'LITHO', {}); const shattered = nb.hp < nbHp || nb.dead;
    for (let i = 0; i < 12; i++) UroCrawl.dealDamage(bug, 1, 'FLUID', { strip: 0.09 }); const stripped = bug.shield <= 0;
    const P = UroCrawl.player(); const a = UroCrawl.spawn('aml', P.x + 40, P.y, { instant: true }); a.hp = 1; UroCrawl.dealDamage(a, 10, 'CUT', {}); const hemorrhage = G.texts.some(t => t.text === 'HEMORRHAGE!');
    return { d1, d2, d3, d4, subs, rt, bleeding, cauterized, frozen, dF, shattered, stripped, hemorrhage };
  });
  check('matrix LITHO×STONE 1.75 / ENERGY×STONE 0.4 / CUT×MALIGNANT 1.5', Math.abs(m.d1 - 17.5) < 0.01 && Math.abs(m.d2 - 4) < 0.01 && Math.abs(m.d3 - 15) < 0.01, [m.d1, m.d2, m.d3].join('/'));
  check('biofilm blocks 90%', m.d4 < 2, m.d4.toFixed(2));
  check('SUPER EFFECTIVE + RESISTED flair', m.subs.indexOf('SUPER EFFECTIVE') >= 0 && m.subs.indexOf('RESISTED') >= 0);
  check('Right Tool bonus after a swap (+25%)', Math.abs(m.rt - 10 * 1.75 * 1.25) < 0.01, String(m.rt));
  check('bleed → cauterize', m.bleeding && m.cauterized);
  check('chill ×3 → frozen, ×1.5 damage, shatter on death', m.frozen && Math.abs(m.dF - 26.25) < 0.01 && m.shattered);
  check('FLUID strips biofilm', m.stripped);
  check('AML hemorrhage on CUT kill', m.hemorrhage);
  await shot(p, 'a-weapons');
  errCheck('A', errs);
});

// ───────── B. the Staghorn ─────────
await block('B. boss', async () => {
  const { p, errs } = await open('?seed=5&god=1&boss=staghorn&weapons=holmium,irrigation,bovie');
  await p.evaluate(() => UroCrawl.startRun());
  let b = await p.evaluate(() => { UroCrawl.step(10); const B = UroCrawl.state.boss; return { arms: B.arms.length, inv: B.body.inv, intro: UroCrawl.state.introT }; });
  check('boss spawns armored with 4 arms and an intro card', b.arms === 4 && b.inv && b.intro > 1);
  await shot(p, 'b-boss-intro');
  b = await p.evaluate(() => { UroCrawl.step(200); const B = UroCrawl.state.boss; const d = UroCrawl.dealDamage(B.body, 100, 'LITHO', {}); B.arms[0].e.hp = 1; UroCrawl.dealDamage(B.arms[0].e, 50, 'LITHO', {}); B.arms[1].e.hp = 1; UroCrawl.dealDamage(B.arms[1].e, 50, 'LITHO', {}); UroCrawl.step(5); return { dealt: d, cracked: B.arms.filter(a => a.cracked).length, inv: B.body.inv }; });
  check('phase 1: body immune until 2 arms crack', b.dealt === 0 && b.cracked === 2 && !b.inv);
  b = await p.evaluate(() => { const B = UroCrawl.state.boss; B.body.hp = B.body.maxHp * 0.65; UroCrawl.step(5); return { phase: B.phase, shield: B.body.shield, microbes: UroCrawl.state.enemies.filter(e => e.family === 'MICROBE').length, slime: UroCrawl.state.hazards.filter(h => h.kind === 'slime').length }; });
  check('phase 2: biofilm shield + swarm + slime', b.phase === 2 && b.shield > 0.9 && b.microbes > 0 && b.slime >= 4, JSON.stringify(b));
  await p.evaluate(() => UroCrawl.step(300)); await shot(p, 'b-boss-p2');
  b = await p.evaluate(() => { const B = UroCrawl.state.boss; const dL = UroCrawl.dealDamage(B.body, 100, 'LITHO', {}); for (let i = 0; i < 30; i++) UroCrawl.dealDamage(B.body, 1, 'FLUID', { strip: 0.09 }); const stripped = B.body.shield <= 0; UroCrawl.state.enemies.forEach(e => { if (e.family === 'MICROBE') { e.silent = true; e.hp = 0; } }); UroCrawl.step(60); return { dL, stripped, after: B.body.shield }; });
  check('phase 2 forces a swap: LITHO blocked by the shield, FLUID strips it, no regen once the swarm is dead', b.dL < 20 && b.stripped && b.after <= 0.01, JSON.stringify(b));
  b = await p.evaluate(() => { const B = UroCrawl.state.boss; B.body.hp = B.body.maxHp * 0.32; UroCrawl.step(5); const d = UroCrawl.dealDamage(B.body, 10, 'FLUID', {}); UroCrawl.step(400); return { phase: B.phase, core: B.body.coreExposed, d, bullets: UroCrawl.state.bullets.length, arms: B.arms.filter(a => a.cracked).length }; });
  check('phase 3: core exposed ×1.5, shell gone, bullet patterns', b.phase === 3 && b.core && Math.abs(b.d - 9) < 0.01 && b.bullets > 10 && b.arms === 4, JSON.stringify(b));
  await shot(p, 'b-boss-p3');
  b = await p.evaluate(() => { const B = UroCrawl.state.boss; B.body.hp = 1; UroCrawl.dealDamage(B.body, 100, 'LITHO', {}); UroCrawl.step(10); const won = UroCrawl.state.won; UroCrawl.step(400); return { won, overlay: UroCrawl.state.overlay, title: document.getElementById('sumTitle').textContent }; });
  check('boss death → DISCHARGED! summary', b.won && b.overlay === 'summary' && b.title === 'DISCHARGED!');
  await shot(p, 'b-win');
  errCheck('B', errs);
});

// ───────── C. death, restart, persistence ─────────
await block('C. death + persistence', async () => {
  const { p, errs } = await open('?seed=9&room=3');
  await p.evaluate(() => UroCrawl.startRun());
  let b = await p.evaluate(() => { UroCrawl.step(60); UroCrawl.hurtPlayer(500, 'test', 0, true); UroCrawl.step(5); const over = UroCrawl.state.over; UroCrawl.step(200); return { over, overlay: UroCrawl.state.overlay, title: document.getElementById('sumTitle').textContent, best: !!UroCrawl.meta.best }; });
  check('death → CODE BLUE summary, best run saved', b.over && b.overlay === 'summary' && b.title === 'CODE BLUE' && b.best);
  await shot(p, 'c-death');
  await p.click('#btnAgain'); await p.waitForTimeout(100);
  b = await p.evaluate(() => ({ running: UroCrawl.state.running, overlay: UroCrawl.state.overlay }));
  check('Try Again restarts', b.running && b.overlay === null);
  await p.evaluate(() => { UroCrawl.openOverlay('settings'); document.getElementById('setMute').click(); document.getElementById('setShake').click(); });
  await p.reload(); await p.waitForFunction(() => !!window.UroCrawl);
  b = await p.evaluate(() => ({ mute: UroCrawl.meta.settings.mute, shake: UroCrawl.meta.settings.shake, bestiary: Object.keys(UroCrawl.meta.bestiary).length }));
  check('settings + bestiary persist across reload', b.mute === true && b.shake === false && b.bestiary > 0, JSON.stringify(b));
  errCheck('C', errs);
});

// ───────── D. touch (phone landscape) ─────────
await block('D. touch', async () => {
  const { p, errs } = await open('?seed=4', 900, 420, true);
  await p.tap('#btnPlay'); await p.waitForTimeout(100); await p.tap('#btnHelpOk').catch(() => {}); await p.waitForTimeout(100);
  let b = await p.evaluate(() => ({ running: UroCrawl.state.running, mode: UroCrawl.input.mode }));
  check('touch run starts in touch mode', b.running && b.mode === 'touch');
  const box = await p.evaluate(() => { const r = document.getElementById('game').getBoundingClientRect(); return { l: r.left, t: r.top, s: r.width / 960 }; });
  const px = (x, y) => [box.l + x * box.s, box.t + y * box.s];
  const cdp = await p.context().newCDPSession(p);
  const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(pt => ({ x: pt[0], y: pt[1], id: pt[2] || 1, radiusX: 6, radiusY: 6, force: 1 })) });
  const x0 = await p.evaluate(() => UroCrawl.player().x);
  let a = px(200, 350); await touch('touchStart', [[a[0], a[1], 1]]); await p.waitForTimeout(50);
  let a2 = px(260, 350); await touch('touchMove', [[a2[0], a2[1], 1]]); await p.waitForTimeout(400);
  b = await p.evaluate(() => ({ stick: !!UroCrawl.input.stick, x: UroCrawl.player().x }));
  check('floating stick moves the player', b.stick && b.x > x0 + 20, Math.round(x0) + ' → ' + Math.round(b.x));
  await p.evaluate(() => UroCrawl.step(150));
  const fire = px(960 - 84, 540 - 86);
  await touch('touchStart', [[a2[0], a2[1], 1], [fire[0], fire[1], 2]]); await p.waitForTimeout(900);
  b = await p.evaluate(() => ({ held: UroCrawl.input.buttons.fire !== undefined, aim: !!UroCrawl.state.aimTarget, dmg: Object.values(UroCrawl.state.stats.dmg).reduce((x, y) => x + y, 0) }));
  check('second finger holds FIRE with auto-aim while steering', b.held && b.aim && b.dmg > 0, 'dmg ' + Math.round(b.dmg));
  await shot(p, 'd-touch');
  await touch('touchEnd', []); await p.waitForTimeout(100);
  const slot = await p.evaluate(() => { const n = UroCrawl.state.weapons.length, w = 56, g = 8, tot = n * w + (n - 1) * g, x0 = 480 - tot / 2; return { x: x0 + (w + g) + w / 2, y: 540 - 66 + 28 }; });
  const sp = px(slot.x, slot.y); await touch('touchStart', [[sp[0], sp[1], 3]]); await p.waitForTimeout(30); await touch('touchEnd', []); await p.waitForTimeout(100);
  check('tapping a weapon slot selects it', (await p.evaluate(() => UroCrawl.state.wIndex)) === 1);
  const pb = px(960 - 30, 72); await touch('touchStart', [[pb[0], pb[1], 4]]); await p.waitForTimeout(30); await touch('touchEnd', []); await p.waitForTimeout(150);
  check('pause button pauses', (await p.evaluate(() => UroCrawl.state.overlay)) === 'pause');
  const { p: pr } = await open('?seed=4', 360, 640, true);
  check('portrait phone shows the rotate overlay', (await pr.evaluate(() => getComputedStyle(document.getElementById('ov-rotate')).display)) === 'flex');
  errCheck('D', errs);
});

// ───────── E. embed contract ─────────
await block('E. embed', async () => {
  const ctx = await browser.newContext({ viewport: { width: 1000, height: 600 } }); const pe = await ctx.newPage(); const errs = [];
  pe.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await pe.goto(BASE.replace(/uro-crawl\.html$/, '')); // same origin so the frame is scriptable
  await pe.setContent('<iframe id="f" src="' + BASE + '?embed=1&seed=2&god=1&room=8" style="width:960px;height:540px"></iframe><script>window.msgs=[];addEventListener("message",e=>msgs.push(e.data));</script>');
  await pe.waitForFunction(() => { try { return !!document.getElementById('f').contentWindow.UroCrawl; } catch (e) { return false; } });
  const fr = pe.frames()[1];
  check('embed: Exit button visible', await fr.evaluate(() => document.getElementById('btnExit').style.display !== 'none'));
  await fr.click('#btnPlay'); await pe.waitForTimeout(100); await fr.click('#btnHelpOk').catch(() => {});
  await fr.evaluate(() => { UroCrawl.step(10); UroCrawl.skipRoom(); UroCrawl.step(10); const P = UroCrawl.player(); const d = UroCrawl.state.doors[0]; P.x = d.x - 20; P.y = d.y + d.h / 2; UroCrawl.step(80); });
  check('rest room → boss door → room 9', await fr.evaluate(() => UroCrawl.state.roomIndex === 9 && UroCrawl.state.room.kind === 'boss'));
  await fr.evaluate(() => { UroCrawl.step(200); UroCrawl.skipRoom(); UroCrawl.step(400); }); await pe.waitForTimeout(200);
  let msgs = await pe.evaluate(() => window.msgs);
  check('embed: crawl:claim on first input', msgs.some(m => m.type === 'crawl:claim'));
  const res = msgs.find(m => m.type === 'crawl:result');
  check('embed: crawl:result at run end', !!res && res.won === true && res.rooms === 9 && typeof res.seconds === 'number', JSON.stringify(res));
  await fr.click('#btnSumTitle'); await fr.click('#btnExit'); await pe.waitForTimeout(100);
  msgs = await pe.evaluate(() => window.msgs);
  check('embed: crawl:exit from the Exit button', msgs.some(m => m.type === 'crawl:exit'));
  errCheck('E', errs);
});

// ───────── F. autoplay seeds through all nine rooms ─────────
await block('F. autoplay', async () => {
  for (const seed of [1, 42, 2024]) {
    const { p, errs } = await open('?seed=' + seed + '&god=1');
    const log = await p.evaluate(() => {
      const G = UroCrawl.state, out = { rooms: [], kinds: [], boons: 0, crates: 0, won: false };
      UroCrawl.startRun();
      const pickDoor = () => { const ds = G.doors.filter(d => d.open); if (!ds.length) return false; const d = ds[Math.floor(Math.random() * ds.length)], P = UroCrawl.player(); P.x = d.side === 'E' ? d.x - 20 : d.x + d.w / 2; P.y = d.side === 'E' ? d.y + d.h / 2 : (d.side === 'N' ? d.y + d.h + 20 : d.y - 20); return true; };
      for (let guard = 0; guard < 60 && !G.over; guard++) {
        UroCrawl.step(30); const plan = G.room; if (!plan) break;
        if (out.rooms.indexOf(plan.index) < 0) { out.rooms.push(plan.index); out.kinds.push(plan.kind); }
        UroCrawl.step(90); if (!G.cleared) { UroCrawl.skipRoom(); UroCrawl.step(5); }
        if (G.overlay === 'weapon') { const c = document.querySelector('#weapCards .card'); if (c) c.click(); else document.getElementById('btnWeapLeave').click(); }
        for (const r of G.rewards) { if (r.used) continue; const P = UroCrawl.player(); P.x = r.x + 80; P.y = r.y; UroCrawl.step(3); P.x = r.x; P.y = r.y; UroCrawl.step(3);
          if (G.overlay === 'boon') { out.boons++; const c = document.querySelector('#boonCards .card'); if (c) c.click(); else document.getElementById('btnBoonSkip').click(); }
          else if (G.overlay === 'mod') { out.reps = (out.reps || 0) + 1; const c = document.querySelector('#modCards .card'); if (c) c.click(); else document.getElementById('btnModSkip').click(); }
          else if (G.overlay === 'weapon') { out.crates++; const slot = document.querySelector('#slotPick .btn'), c = document.querySelector('#weapCards .card'); if (slot) slot.click(); else if (c) c.click(); if (G.overlay) document.getElementById('btnWeapLeave').click(); }
          else if (G.overlay === 'shop') { const b = document.querySelector('#shopItems .btn:not(:disabled)'); if (b) b.click(); document.getElementById('btnShopLeave').click(); } }
        if (G.overlay) UroCrawl.hideScreens();
        if (plan.kind === 'boss') { UroCrawl.step(200); UroCrawl.skipRoom(); UroCrawl.step(300); out.won = G.won; break; }
        if (!pickDoor()) { UroCrawl.step(60); if (!pickDoor()) break; } UroCrawl.step(60);
      }
      out.weapons = G.weapons.length; out.boonsHeld = G.boons.length; out.mods = G.weapons.reduce((n, w) => n + w.modIds.length + (w.capstone ? 1 : 0), 0); return out;
    });
    check('seed ' + seed + ' plays 9 rooms to the win screen', log.rooms.length === 9 && log.won, 'kinds ' + log.kinds.join(',') + ' · altars ' + log.boons + ' · crates ' + log.crates + ' · reps ' + (log.reps || 0) + ' · held ' + log.weapons + 'w/' + log.boonsHeld + 'b/' + log.mods + 'm');
    errCheck('F seed ' + seed, errs);
  }
});

// ───────── G. Abscess Sac weak point + new microbes ─────────
await block('G. abscess', async () => {
  const { p, errs } = await open('?seed=6&god=1&room=3');
  await p.evaluate(() => { UroCrawl.startRun(); UroCrawl.step(2); UroCrawl.state.enemies.forEach(e => { e.silent = true; e.hp = 0; }); UroCrawl.step(1); UroCrawl.state.waves.next = 99; });
  const defs = await p.evaluate(() => { const E = UroCrawl.tables.ENEMIES; return { abscess: E.abscess && E.abscess.minRoom === 3 && E.abscess.hp === 110 && E.abscess.family === 'MICROBE' && /incision and drainage/.test(E.abscess.fact), kleb: !!E.klebsiella, clos: !!E.clostridium, insulin: !!UroCrawl.tables.BOONS.insulin, fournier: !!E.fournier }; });
  check('Abscess Sac in the table (MICROBE, 110 HP, room 3+, I&D fact); Klebsiella, Clostridium, Insulin exist', defs.abscess && defs.kleb && defs.clos && defs.insulin && defs.fournier, JSON.stringify(defs));
  const r = await p.evaluate(() => {
    const G = UroCrawl.state, P = UroCrawl.player(); P.x = 300; P.y = 270;
    const a = UroCrawl.spawn('abscess', 500, 270, { instant: true }); const wp = a.wp; const o0 = { ox: wp.ox, oy: wp.oy };
    const far = { hx: a.x - wp.ox, hy: a.y - wp.oy }; // opposite side of the body from the bulb
    const body = UroCrawl.dealDamage(a, 10, 'ENERGY', far); // 10 × 1.25 × 0.25 = 3.125
    const bulbE = UroCrawl.dealDamage(a, 10, 'ENERGY', { hx: a.x + wp.ox, hy: a.y + wp.oy }); // normal ×1.25
    UroCrawl.step(200); const moved = (a.wp.ox !== o0.ox || a.wp.oy !== o0.oy);
    const hp0 = a.hp; const cut = UroCrawl.dealDamage(a, 5, 'CUT', { hx: a.x + a.wp.ox, hy: a.y + a.wp.oy }); UroCrawl.step(2);
    const drained = G.texts.some(t => t.sub === 'DRAINED!'), dead = a.dead, pus = G.hazards.some(h => h.kind === 'pus');
    return { body, bulbE, moved, cut, drained, dead, pus };
  });
  check('body hits do 25%, bulb hits full', Math.abs(r.body - 3.125) < 0.01 && Math.abs(r.bulbE - 12.5) < 0.01, r.body + ' / ' + r.bulbE);
  check('the bulb migrates (~3 s)', r.moved);
  check('CUT on the bulb: ×4 crit, DRAINED!, sac collapses, pus puddle', Math.abs(r.cut - 5 * 0.8 * 4) < 0.01 && r.drained && r.dead && r.pus, 'dmg ' + r.cut);
  const r2 = await p.evaluate(() => { const G = UroCrawl.state; let bursts = 0; for (let i = 0; i < 12; i++) { const a = UroCrawl.spawn('abscess', 500 + (i % 4) * 60, 150 + Math.floor(i / 4) * 80, { instant: true }); const n0 = G.bullets.length; UroCrawl.dealDamage(a, 1, 'LITHO', { hx: a.x + a.wp.ox, hy: a.y + a.wp.oy }); if (G.bullets.length > n0) bursts++; } return bursts; });
  check('non-CUT bulb hits sometimes burst pus at the player', r2 > 0 && r2 < 12, r2 + ' of 12 burst');
  await shot(p, 'g-abscess');
  errCheck('G', errs);
});

// ───────── H. Fournier's gangrene ─────────
await block('H. fournier', async () => {
  const sel = await (async () => { const out = {}; for (const q of ['?seed=1&boss=fournier', '?seed=1&boss=staghorn', '?seed=1&boss=1', '?seed=2&boss=1']) { const { p } = await open(q); out[q] = await p.evaluate(() => { UroCrawl.startRun(); return UroCrawl.state.boss && UroCrawl.state.boss.kind; }); await p.close(); } return out; })();
  check('?boss selects the boss (explicit names; ?boss=1 rolls one)', sel['?seed=1&boss=fournier'] === 'fournier' && sel['?seed=1&boss=staghorn'] === 'staghorn' && /staghorn|fournier/.test(sel['?seed=1&boss=1']), JSON.stringify(sel));
  const { p, errs } = await open('?seed=8&god=1&boss=fournier&weapons=scalpel,roller,irrigation');
  await p.evaluate(() => UroCrawl.startRun());
  let b = await p.evaluate(() => { UroCrawl.step(10); const B = UroCrawl.state.boss; return { kind: B.kind, lobes: B.lobes.length, inv: B.body.inv, necro: B.body.necro, intro: UroCrawl.state.introT, sugar: B.sugar.length, legs: B.legs.length }; });
  check('Fournier spawns: 5 lobes, armored body, necrotic armor, sugar crystals, legs', b.kind === 'fournier' && b.lobes === 5 && b.inv && b.necro === 1 && b.sugar === 6 && b.legs === 9, JSON.stringify(b));
  await shot(p, 'h-fournier-intro');
  await p.evaluate(() => UroCrawl.step(200));
  b = await p.evaluate(() => { const B = UroCrawl.state.boss; const L = B.lobes[0]; const dE = UroCrawl.dealDamage(L.e, 10, 'ENERGY', {}); const n1 = L.e.necro; for (let i = 0; i < 3; i++) UroCrawl.dealDamage(L.e, 1, 'CUT', {}); const n2 = L.e.necro; const dE2 = UroCrawl.dealDamage(L.e, 10, 'ENERGY', {}); return { dE, n1, n2, dE2 }; });
  check('necrotic armor: ENERGY ×0.15 until CUT debrides it, then full damage', b.dE < 2.5 && b.n1 === 1 && b.n2 === 0 && Math.abs(b.dE2 - 12.5) < 0.01, JSON.stringify(b));
  b = await p.evaluate(() => { const B = UroCrawl.state.boss; const L = B.lobes[0]; L.e.hp = 1; UroCrawl.dealDamage(L.e, 10, 'CUT', {}); UroCrawl.step(2); const stump = !!(L.state === 'stump' && L.stump && !L.stump.dead); UroCrawl.step(200); const regrew = L.state === 'regrown' && B.lobes.filter(x => x.state === 'alive' && !x.big).length === 2; return { stump, regrew, lobes: B.lobes.length }; });
  check('Hydra: a cut lobe leaves a stump; uncoagulated for 3 s it regrows as two small lobes', b.stump && b.regrew, JSON.stringify(b));
  b = await p.evaluate(() => { const B = UroCrawl.state.boss; let removed = 0; for (const L of B.lobes.slice()) { if (removed >= 3) break; if (L.state !== 'alive' || L.e.dead) continue; L.e.hp = 1; UroCrawl.dealDamage(L.e, 10, 'CUT', {}); UroCrawl.step(2); if (L.state === 'stump') { UroCrawl.dealDamage(L.stump, 1, 'ENERGY', { cauterize: true }); UroCrawl.step(1); if (L.state === 'gone') removed++; } } UroCrawl.step(5); return { removed: B.removed, inv: B.body.inv, text: UroCrawl.state.texts.some(t => /DEBRIDED — HEMOSTASIS/.test(t.text)) }; });
  check('coag within 3 s removes a lobe for good; 3 removals expose the body', b.removed === 3 && !b.inv, JSON.stringify(b));
  b = await p.evaluate(() => { const B = UroCrawl.state.boss; const d0 = UroCrawl.dealDamage(B.body, 10, 'ENERGY', {}); for (let i = 0; i < 3; i++) UroCrawl.dealDamage(B.body, 1, 'CUT', {}); const d1 = UroCrawl.dealDamage(B.body, 10, 'ENERGY', {}); return { d0, d1, necro: B.body.necro }; });
  check('body armor is CUT away, then ENERGY lands ×1.25', b.d0 < 2.5 && b.necro === 0 && Math.abs(b.d1 - 12.5) < 0.01, JSON.stringify(b));
  b = await p.evaluate(() => { const B = UroCrawl.state.boss; B.body.hp = B.body.maxHp * 0.65; UroCrawl.step(5); UroCrawl.step(240); const G = UroCrawl.state; return { phase: B.phase, lines: B.necrosis.length, len: Math.round(B.necrosis[0].len), bubbles: G.bullets.filter(x => x.kind === 'bubble').length + G.texts.length, adds: G.enemies.filter(e => e.family === 'MICROBE' && !e.boss && !e.def.isLobe && !e.def.isStump).length, sugar: B.sugar.length }; });
  check('phase 2: creeping necrosis grows, gas bubbles, polymicrobial adds', b.phase === 2 && b.lines === 3 && b.len > 60 && b.adds > 0, JSON.stringify(b));
  await shot(p, 'h-fournier-p2');
  b = await p.evaluate(() => { const B = UroCrawl.state.boss; const l0 = B.necrosis[0].len; UroCrawl.giveBoon('piptazo'); UroCrawl.step(120); const l1 = B.necrosis[0].len; const hp0 = B.body.hp; B.body.hp -= 100; const su = B.sugar[0]; if (su) { const N = B.necrosis[0]; N.len = Math.max(0, (Math.sqrt((su.x - N.x) * (su.x - N.x) + (su.y - N.y) * (su.y - N.y)))); su.x = N.x + Math.cos(N.a) * N.len; su.y = N.y + Math.sin(N.a) * N.len; } const hpA = B.body.hp; UroCrawl.step(2); const surged = B.body.hp > hpA; UroCrawl.giveBoon('insulin'); UroCrawl.step(2); return { slowed: l1 - l0 < 38 && l1 - l0 > 20, surged, sugarAfter: B.sugar.length }; });
  check('antibiotic boon shrinks necrosis; necrosis eating a sugar crystal heals the boss; Insulin clears the sugar', b.slowed && b.surged && b.sugarAfter === 0, JSON.stringify(b));
  b = await p.evaluate(() => { const B = UroCrawl.state.boss; B.body.hp = B.body.maxHp * 0.32; UroCrawl.step(5); const wp = B.body.wp; const off = UroCrawl.dealDamage(B.body, 10, 'ENERGY', { hx: B.body.x - wp.ox, hy: B.body.y - wp.oy }); const on = UroCrawl.dealDamage(B.body, 10, 'ENERGY', { hx: B.body.x + wp.ox, hy: B.body.y + wp.oy }); const t0 = B.sepsisT; UroCrawl.step(60); return { phase: B.phase, sepsis: B.sepsis, label: wp && wp.label, off, on, ticking: B.sepsisT < t0, lobesGone: B.lobes.every(L => L.state === 'gone' || L.state === 'regrown') }; });
  check('phase 3: sepsis clock, SOURCE weak point (off-source ×0.15), lobes collapse', b.phase === 3 && b.sepsis && b.label === 'SOURCE' && Math.abs(b.off - 10 * 1.25 * 0.15 * 1.25) < 0.01 && Math.abs(b.on - 10 * 1.25 * 1.25) < 0.01 && b.ticking && b.lobesGone, JSON.stringify(b));
  await shot(p, 'h-fournier-p3');
  b = await p.evaluate(() => { const B = UroCrawl.state.boss; B.sepsisT = 0.05; UroCrawl.step(10); const shock = UroCrawl.state.texts.some(t => t.text === 'SEPTIC SHOCK'), alive = !UroCrawl.state.over; B.body.hp = 1; UroCrawl.dealDamage(B.body, 100, 'ENERGY', { hx: B.body.x + B.body.wp.ox, hy: B.body.y + B.body.wp.oy }); UroCrawl.step(10); const won = UroCrawl.state.won; UroCrawl.step(400); return { shock, alive, won, title: document.getElementById('sumTitle').textContent }; });
  check('sepsis clock at zero → SEPTIC SHOCK (god mode survives); killing the source wins', b.shock && b.alive && b.won && b.title === 'DISCHARGED!', JSON.stringify(b));
  // a real death from the clock without god mode
  const { p: pd } = await open('?seed=8&boss=fournier');
  const dd = await pd.evaluate(() => { UroCrawl.startRun(); UroCrawl.step(200); const B = UroCrawl.state.boss; B.body.hp = B.body.maxHp * 0.3; UroCrawl.step(5); B.sepsisT = 0.05; UroCrawl.step(10); return UroCrawl.state.over && !UroCrawl.state.won; });
  check('without god mode the clock kills you', dd);
  errCheck('H', errs);
});

// ───────── I. HIFU, Urethrotome, CO₂, da Vinci, Condyloma ─────────
await block('I. new weapons', async () => {
  const { p, errs } = await open('?seed=12&god=1&room=2&weapons=hifu,urethrotome,co2');
  let b = await p.evaluate(() => { UroCrawl.startRun(); UroCrawl.step(2); const G = UroCrawl.state; G.enemies.forEach(e => { e.silent = true; e.hp = 0; }); UroCrawl.step(1); G.waves.next = 99; G.obstacles.length = 0; return { weapons: G.weapons.map(w => w.id), ult: UroCrawl.tables.WEAPONS.davinci.ultimate === true }; });
  check('?weapons=hifu,urethrotome,co2 loads the three new slot weapons', b.weapons.join() === 'hifu,urethrotome,co2' && b.ult, JSON.stringify(b));
  b = await p.evaluate(() => { const G = UroCrawl.state, P = UroCrawl.player(); P.x = 300; P.y = 270;
    const bug = UroCrawl.spawn('pseudomonas', 500, 200, { instant: true }); const dShield = UroCrawl.dealDamage(bug, 10, 'ENERGY', { wid: 'hifu', pierceArmor: true }); const shieldLeft = bug.shield;
    const lobe = UroCrawl.spawn('fourlobe', 600, 200, { instant: true }); lobe.necro = 1; const dArmor = UroCrawl.dealDamage(lobe, 10, 'ENERGY', { wid: 'hifu', pierceArmor: true });
    const pr = UroCrawl.spawn('prostate', 500, 300, { instant: true }); const dPr = UroCrawl.dealDamage(pr, 10, 'ENERGY', { wid: 'hifu' }); const sem = UroCrawl.spawn('seminoma', 600, 300, { instant: true }); const dMal = UroCrawl.dealDamage(sem, 10, 'ENERGY', { wid: 'hifu' });
    G.enemies.forEach(e => { e.silent = true; e.hp = 0; }); UroCrawl.step(1);
    const t = UroCrawl.spawn('papillary', 450, 270, { instant: true }); t.def = Object.assign({}, t.def, { update: function (e) { e.vx = e.vy = 0; } });
    G.wIndex = 0; UroCrawl.input.mode = 'kb'; UroCrawl.input.mx = 450; UroCrawl.input.my = 270; UroCrawl.input.mouseFire = true; UroCrawl.step(70); const w = G.weapons[0]; const charged = w.charge, lens = !!(w.fx && w.fx.kind === 'lens'), slow = UroCrawl.tables.WEAPONS.hifu.slowWhile(w);
    const hp0 = t.hp; UroCrawl.input.mouseFire = false; UroCrawl.step(5); const burstDmg = hp0 - t.hp;
    return { dShield, shieldLeft, dArmor, dPr, dMal, charged, lens, slow, burstDmg }; });
  check('HIFU ignores biofilm and necrotic armor', Math.abs(b.dShield - 12.5) < 0.01 && b.shieldLeft > 0.9 && Math.abs(b.dArmor - 12.5) < 0.01, JSON.stringify({ dShield: b.dShield, dArmor: b.dArmor }));
  check('HIFU +25% vs MALIGNANT, prostate another +25%', Math.abs(b.dMal - 10 * 1.25 * 1.25) < 0.01 && Math.abs(b.dPr - 10 * 1.25 * 1.25 * 1.25) < 0.01, b.dMal + ' / ' + b.dPr);
  check('HIFU charges ~1 s with a lens, crawls at 50%, bursts on release', b.charged >= 1 && b.lens && b.slow === 0.5 && b.burstDmg > 40, JSON.stringify({ charged: b.charged, burst: Math.round(b.burstDmg) }));
  b = await p.evaluate(() => { const G = UroCrawl.state, P = UroCrawl.player(); G.enemies.forEach(e => { e.silent = true; e.hp = 0; }); UroCrawl.step(1); P.x = 300; P.y = 270;
    const a = UroCrawl.spawn('seminoma', 360, 270, { instant: true }), b2 = UroCrawl.spawn('seminoma', 410, 272, { instant: true }); [a, b2].forEach(e => { e.def = Object.assign({}, e.def, { update: function (x) { x.vx = x.vy = 0; } }); });
    G.obstacles.push({ type: 'circle', x: 400, y: 284, r: 9, stricture: true, regrowT: 0 }); G.obstacles.push({ type: 'circle', x: 700, y: 300, r: 9, stricture: true, regrowT: 0 });
    UroCrawl.selectWeapon(1); G.swapT = 0; UroCrawl.input.mx = 450; UroCrawl.input.my = 290; UroCrawl.input.mouseFire = true; UroCrawl.step(3); UroCrawl.input.mouseFire = false;
    const bothHit = a.hp < a.maxHp && b2.hp < b2.maxHp, bleed = !!(a.st.bleed && b2.st.bleed), cut = G.obstacles[0].dead === true, far = !G.obstacles[1].dead;
    UroCrawl.step(21 * 60); const regrew = G.obstacles[0].dead === false;
    const cl = UroCrawl.spawn('clot', 600, 400, { instant: true }); const dClot = UroCrawl.dealDamage(cl, 10, 'CUT', { wid: 'urethrotome' });
    return { bothHit, bleed, cut, far, regrew, dClot }; });
  check('Urethrotome pierces the line and applies bleed', b.bothHit && b.bleed);
  check('Urethrotome cuts a stricture bar in its line (not one out of reach); the bar regrows after ~20 s', b.cut && b.far && b.regrew, JSON.stringify(b));
  check('Urethrotome breaks clot walls (×2.5)', Math.abs(b.dClot - 25) < 0.01, String(b.dClot));
  b = await p.evaluate(() => { const G = UroCrawl.state, P = UroCrawl.player(); G.enemies.forEach(e => { e.silent = true; e.hp = 0; }); UroCrawl.step(1); P.x = 300; P.y = 270; G.hazards.length = 0;
    const ab = UroCrawl.spawn('abscess', 560, 270, { instant: true }); const onBulb = UroCrawl.dealDamage(ab, 10, 'ENERGY', { wid: 'co2', hx: ab.x + ab.wp.ox, hy: ab.y + ab.wp.oy }); const offBulb = UroCrawl.dealDamage(ab, 10, 'ENERGY', { wid: 'co2', hx: ab.x - ab.wp.ox, hy: ab.y - ab.wp.oy });
    ab.silent = true; ab.hp = 0; UroCrawl.step(1);
    const t = UroCrawl.spawn('papillary', 560, 270, { instant: true }); t.def = Object.assign({}, t.def, { update: function (e) { e.vx = e.vy = 0; } });
    UroCrawl.selectWeapon(2); G.swapT = 0; UroCrawl.input.mx = 560; UroCrawl.input.my = 270; UroCrawl.input.mouseFire = true; UroCrawl.step(30); const w = G.weapons[2]; const L = f => Math.round(Math.sqrt((f.x1 - f.x0) * (f.x1 - f.x0) + (f.y1 - f.y0) * (f.y1 - f.y0))); const dryLen = L(w.fx), dryHit = t.hp < t.maxHp;
    G.hazards.push({ kind: 'saline', x: P.x, y: P.y, r: 60, t: Infinity, max: Infinity, ph: 0 }); UroCrawl.step(10); const wetLen = L(w.fx); UroCrawl.input.mouseFire = false; G.hazards.length = 0;
    return { onBulb, offBulb, dryLen, dryHit, wetLen }; });
  check('CO₂ hits a weak point for +50% (25% body elsewhere on the sac)', Math.abs(b.onBulb - 10 * 1.25 * 1.5) < 0.01 && Math.abs(b.offBulb - 10 * 1.25 * 0.25) < 0.01, b.onBulb + ' / ' + b.offBulb);
  check('CO₂ reaches ~320 px dry and ~60 px in saline', b.dryLen > 230 && b.dryHit && b.wetLen <= 62, 'dry ' + b.dryLen + ' wet ' + b.wetLen);
  b = await p.evaluate(() => { const G = UroCrawl.state, P = UroCrawl.player(); G.enemies.forEach(e => { e.silent = true; e.hp = 0; }); UroCrawl.step(1); P.x = 480; P.y = 300;
    const before = G.ult.have; const got = UroCrawl.giveWeapon('davinci'); const have = G.ult.have, slots = G.weapons.length;
    ['com', 'ecoli', 'papillary', 'clot', 'pseudomonas'].forEach((id, i) => { const e = UroCrawl.spawn(id, 480 + Math.cos(i * 1.26) * 170, 300 + Math.sin(i * 1.26) * 150, { instant: true }); e.def = Object.assign({}, e.def, { update: function (x) { x.vx = x.vy = 0; } }); });
    G.ult.charge = G.ult.need; UroCrawl.input.edges.ult = true; UroCrawl.step(1); const active = G.ult.active, docked = P.docked, arms = G.ult.arms.length;
    const x0 = P.x; UroCrawl.input.keys.KeyD = true; UroCrawl.step(30); UroCrawl.input.keys.KeyD = false; const stayed = Math.abs(P.x - x0) < 1;
    const d0 = JSON.parse(JSON.stringify(G.stats.dmg)); UroCrawl.step(120); const d1 = G.stats.dmg; const classes = ['CUT', 'ENERGY', 'FLUID', 'LITHO'].filter(k => d1[k] > d0[k]);
    const targets = G.ult.arms.map(a => a.target && a.target.id);
    UroCrawl.input.edges.roll = true; UroCrawl.step(2); const ended = !G.ult.active && !P.docked, lock = G.ult.lockout;
    UroCrawl.input.edges.ult = true; UroCrawl.step(1); const blocked = !G.ult.active;
    return { before, got, have, slots, active, docked, arms, stayed, classes, targets, ended, lock, blocked }; });
  check("giveWeapon('davinci') grants the console without taking a slot", !b.before && b.got && b.have && b.slots === 3);
  check('ULT docks the surgeon with four arms; movement stops', b.active && b.docked && b.arms === 4 && b.stayed, JSON.stringify({ arms: b.arms, stayed: b.stayed }));
  check('all four arms deal damage in their own class to self-chosen targets', b.classes.length === 4, 'classes ' + b.classes.join(',') + ' targets ' + b.targets.join(','));
  check('rolling undocks early and starts the 40 s lockout', b.ended && b.lock > 39 && b.blocked, 'lockout ' + b.lock);
  b = await p.evaluate(() => { const G = UroCrawl.state; G.enemies.forEach(e => { e.silent = true; e.hp = 0; }); UroCrawl.step(1);
    const c = UroCrawl.spawn('condyloma', 600, 300, { instant: true }); const def = c.def; UroCrawl.dealDamage(c, 500, 'CUT', {}); const dormant = c.dormant && !c.dead && c.noClear, hpD = c.hp;
    UroCrawl.step(6 * 60 + 5); const regrew = c.hp > hpD;
    UroCrawl.step(13 * 60); const awake = !c.dormant && !c.noClear;
    UroCrawl.dealDamage(c, 500, 'ENERGY', {}); const dead = c.dead;
    return { fam: def.family, hp: def.hp, minRoom: def.minRoom, dormant, regrew, awake, dead, fact: /HPV/.test(def.fact) }; });
  check('Condyloma Cluster: BENIGN 60 HP from room 2, a non-ENERGY kill leaves a regrowing root, ENERGY burns it off', b.fam === 'BENIGN' && b.hp === 60 && b.minRoom === 2 && b.dormant && b.regrew && b.awake && b.dead && b.fact, JSON.stringify(b));
  await shot(p, 'i-new-weapons');
  errCheck('I', errs);
});

// ───────── J. weapon mods, aspects, Instrument Rep doors ─────────
// helpers injected into the page: clear the room, pin an enemy in place (optionally with a fake velocity), first-hit damage
const PREP = `
  window.__kill = function (e) { e.silent = true; e.inhaled = true; e.hp = 0; };   // inhaled: no stone splits littering the arena
  window.__prep = function () { const G = UroCrawl.state; G.enemies.forEach(__kill); UroCrawl.step(1); if (G.waves) G.waves.next = 99; G.obstacles.length = 0; G.bullets.length = 0; G.hazards.length = 0; G.fields.length = 0; G.texts.length = 0; G.pickups.length = 0; const P = UroCrawl.player(); P.x = 300; P.y = 270; UroCrawl.input.mode = 'kb'; UroCrawl.input.mouseFire = false; UroCrawl.input.mouseAlt = false; UroCrawl.input.keys = {}; };
  window.__pin = function (id, x, y, vx, vy, extra) { const e = UroCrawl.spawn(id, x, y, { instant: true }); e.def = Object.assign({}, e.def, { update: function (q) { q.vx = vx || 0; q.vy = vy || 0; q.x = x; q.y = y; } }, extra || {}); return e; };
  window.__firstHit = function (e, maxSteps) { const hp0 = e.hp; for (let i = 0; i < (maxSteps || 60); i++) { UroCrawl.step(1); if (e.hp !== hp0 || e.dead) return { dmg: hp0 - e.hp, steps: i + 1, dead: e.dead }; } return { dmg: 0, steps: maxSteps || 60 }; };
  window.__aim = function (x, y) { UroCrawl.input.mx = x; UroCrawl.input.my = y; };
`;
async function openJ(q) { const o = await open(q); await o.p.evaluate(PREP); return o; }

await block('J1. tables', async () => {
  const { p, errs } = await openJ('?seed=20');
  const t = await p.evaluate(() => {
    const M = UroCrawl.tables.MODS, A = UroCrawl.tables.ASPECTS, W = UroCrawl.tables.WEAPONS, ids = Object.keys(M), bad = [], per = {};
    ids.forEach(id => { const m = M[id]; per[m.weapon] = per[m.weapon] || { mods: 0, caps: 0 }; if (m.capstone) per[m.weapon].caps++; else per[m.weapon].mods++;
      if (m.id !== id) bad.push(id + ': id'); if (!W[m.weapon]) bad.push(id + ': weapon ' + m.weapon);
      const req = !m.requires ? [] : typeof m.requires === 'string' ? [m.requires] : m.requires;
      req.forEach(r => { if (!M[r]) bad.push(id + ' requires missing ' + r); else if (M[r].weapon !== m.weapon) bad.push(id + ' cross-weapon prerequisite'); else if (!m.capstone && M[r].branch !== m.branch) bad.push(id + ' cross-branch prerequisite'); });
      if (['POWER', 'CONTROL', 'SPECIAL'].indexOf(m.branch) < 0) bad.push(id + ': branch'); if (!(m.tier >= 1 && m.tier <= 3)) bad.push(id + ': tier'); if (!m.stats && !m.flag) bad.push(id + ': no stats or flag'); if (!m.rarity || !m.desc || !m.name) bad.push(id + ': missing text'); if (m.capstone && !req.length) bad.push(id + ': capstone without prerequisites'); });
    return { n: ids.length, per, bad, aspects: Object.keys(A).map(k => k + ':' + A[k].length), door: !!UroCrawl.tables.DOOR_TYPES.rep };
  });
  check('MODS: 30 rows = 5 weapons × (5 mods + 1 capstone); every prerequisite resolves inside its weapon and branch', t.n === 30 && t.bad.length === 0 && ['holmium', 'scalpel', 'loop', 'bovie', 'trilogy'].every(w => t.per[w] && t.per[w].mods === 5 && t.per[w].caps === 1), (t.bad.join('; ') || 'ok') + ' ' + JSON.stringify(t.per));
  check('ASPECTS: 3 variants each for Holmium, Scalpel, Loop, Trilogy; rep door type exists', t.aspects.join() === 'holmium:3,scalpel:3,loop:3,trilogy:3' && t.door, t.aspects.join());
  errCheck('J1', errs);
});

await block('J2. holmium mods', async () => {
  const { p, errs } = await openJ('?seed=21&god=1&room=2&weapons=holmium&mods=holmium_joules,holmium_narrow');
  let b = await p.evaluate(() => { UroCrawl.startRun(); UroCrawl.step(2); __prep(); const G = UroCrawl.state, P = UroCrawl.player(), w = G.weapons[0];
    const ref = __pin('com', 700, 150); const unit = UroCrawl.dealDamage(ref, 3.4, 'LITHO', { wid: 'holmium' });
    const t = __pin('com', P.x + 150, P.y); __aim(P.x + 150, P.y); UroCrawl.input.mouseFire = true; const h = __firstHit(t, 20); const len = Math.round(w.fx.x1 - w.fx.x0); UroCrawl.input.mouseFire = false; UroCrawl.step(30);
    return { mods: w.modIds.slice(), ms: w.ms, unit, hit: h.dmg, len }; });
  check('?mods= installs Higher Joules + Narrow Fiber at run start; stats fold into w.ms', b.mods.join() === 'holmium_joules,holmium_narrow' && Math.abs(b.ms.dmg - 1.25) < 1e-9 && Math.abs(b.ms.range - 1.3) < 1e-9 && Math.abs(b.ms.hw - 0.7) < 1e-9, JSON.stringify(b.ms));
  check('Higher Joules: a DUST tick lands for ×1.25 of the unmodded tick (3.4 × 1.75 × 1.25 = 7.4375)', Math.abs(b.hit - 7.4375) < 0.01 && Math.abs(b.unit - 5.95) < 0.01, b.hit + ' vs ' + b.unit);
  check('Narrow Fiber: the beam reaches ~299 px (230 × 1.3)', b.len >= 295 && b.len <= 302, b.len + ' px');
  b = await p.evaluate(() => { __prep(); const G = UroCrawl.state, P = UroCrawl.player(), w = G.weapons[0];
    const okMoses = UroCrawl.giveMod('holmium_moses'); UroCrawl.input.edges.alt = true; UroCrawl.step(1); const mode = w.mode;
    const t = __pin('com', P.x + 150, P.y); __aim(P.x + 150, P.y); UroCrawl.input.mouseFire = true; const h = __firstHit(t, 40); const pellets = G.bullets.filter(x => x.kind === 'pellet').length; UroCrawl.input.mouseFire = false; UroCrawl.step(40);
    const okPop = UroCrawl.giveMod('holmium_popcorn'); G.bullets.length = 0; UroCrawl.input.mouseFire = true; const h2 = __firstHit(t, 40); const orbits = G.bullets.filter(x => x.kind === 'orbit'); const o0 = orbits.map(x => [x.x, x.y]); UroCrawl.step(10); const moved = orbits.length ? Math.hypot(orbits[0].x - o0[0][0], orbits[0].y - o0[0][1]) : 0; UroCrawl.input.mouseFire = false; UroCrawl.step(60);
    return { okMoses, mode, pulse: h.dmg, pellets, okPop, orbits: orbits.length, moved, gone: G.bullets.filter(x => x.kind === 'orbit').length }; });
  check('Moses Effect mod: a FRAGMENT pulse (24 × 1.25 × 1.75 = 52.5) splits two pellets off the impact', b.okMoses && b.mode === 1 && Math.abs(b.pulse - 52.5) < 0.01 && b.pellets === 2, 'pulse ' + b.pulse + ', pellets ' + b.pellets);
  check('Popcorn: a landed pulse throws three orbiting fragments that move and expire after ~0.9 s', b.okPop && b.orbits === 3 && b.moved > 5 && b.gone === 0, JSON.stringify({ orbits: b.orbits, moved: Math.round(b.moved), left: b.gone }));
  b = await p.evaluate(() => { __prep(); const G = UroCrawl.state, P = UroCrawl.player(), w = G.weapons[0];
    const availBefore = UroCrawl.availableMods(w).map(m => m.id); const offer = UroCrawl.rollModOffer(w, 3); const okCap = UroCrawl.giveMod('holmium_whirlpool');
    const hw = 5 * 0.7, t = __pin('com', P.x + 150, P.y), side = __pin('com', P.x + 150, P.y + hw + 26 + 14); // outside the beam (hw + r), inside the whirlpool corridor (hw + 30 + r)
    __aim(P.x + 150, P.y); UroCrawl.input.mouseFire = true; UroCrawl.step(30); const whirl = !!(w.fx && w.fx.whirl); UroCrawl.input.mouseFire = false; UroCrawl.step(10);
    const again = UroCrawl.giveMod('holmium_whirlpool'), availAfter = UroCrawl.availableMods(w).length;
    return { availBefore, offer, okCap, cap: w.capstone, sideHit: side.hp < side.maxHp, mainHit: t.hp < t.maxHp, whirl, again, availAfter, n: w.modIds.length }; });
  check('capstone gating: Whirlpool is offered (first) only once Moses + Popcorn are held; installs into the capstone slot', b.availBefore.indexOf('holmium_whirlpool') >= 0 && b.offer[0] === 'holmium_whirlpool' && b.okCap && b.cap === 'holmium_whirlpool' && !b.again, JSON.stringify({ avail: b.availBefore, offer: b.offer }));
  check('Whirlpool: an enemy beside the beam (outside its width) is hit by the shard vortex', b.sideHit && b.mainHit && b.whirl);
  b = await p.evaluate(() => { __prep(); const G = UroCrawl.state, P = UroCrawl.player(), w = G.weapons[0]; UroCrawl.input.edges.alt = true; UroCrawl.step(1); // back to DUST
    const ok = UroCrawl.giveMod('holmium_pulse'); w.heat = 0; UroCrawl.step(20); __aim(P.x + 150, P.y); UroCrawl.input.mouseFire = true; UroCrawl.step(204); const heat = w.heat, locked = w.locked; UroCrawl.input.mouseFire = false; UroCrawl.step(5);
    return { ok, heat, locked, mode: w.mode, n: w.modIds.length, avail: UroCrawl.availableMods(w).length }; });
  check('Longer Pulse: 3.4 s of continuous DUST beam no longer overheats (heat ≈ 0.67)', b.ok && b.mode === 0 && b.locked === 0 && b.heat > 0.6 && b.heat < 0.75, 'heat ' + b.heat.toFixed(2));
  check('a fully built Holmium (5 mods + capstone) has nothing left to offer', b.n === 5 && b.avail === 0);
  await shot(p, 'j-holmium');
  errCheck('J2', errs);
});

await block('J3. scalpel mods', async () => {
  const { p, errs } = await openJ('?seed=22&god=1&room=2&weapons=scalpel&mods=scalpel_sharp,scalpel_quick');
  let b = await p.evaluate(() => { UroCrawl.startRun(); UroCrawl.step(2); __prep(); const G = UroCrawl.state, P = UroCrawl.player(), w = G.weapons[0];
    const t = __pin('papillary', P.x + 50, P.y, 0, 0, { bleedMul: 0 }); __aim(P.x + 50, P.y); UroCrawl.input.mouseFire = true; const h = __firstHit(t, 10); const cd = w.cd; UroCrawl.input.mouseFire = false; UroCrawl.step(30);
    const okB = UroCrawl.giveMod('scalpel_backstab'); const t2 = __pin('papillary', P.x + 50, P.y, 120, 0, { bleedMul: 0 }); __kill(t); UroCrawl.step(1); UroCrawl.input.mouseFire = true; const h2 = __firstHit(t2, 10); UroCrawl.input.mouseFire = false; const tag = G.texts.some(x => x.sub === 'BACKSTAB!'); UroCrawl.step(30);
    const t3 = __pin('papillary', P.x + 50, P.y, -120, 0, { bleedMul: 0 }); __kill(t2); UroCrawl.step(1); UroCrawl.input.mouseFire = true; const h3 = __firstHit(t3, 10); UroCrawl.input.mouseFire = false; UroCrawl.step(30);
    return { hit: h.dmg, cd, okB, behind: h2.dmg, tag, front: h3.dmg }; });
  check('Sharpened + Quick Hands: slash lands 16 × 1.25 × 1.5 = 30 and the attack time is 0.225 s', Math.abs(b.hit - 30) < 0.01 && Math.abs(b.cd - 0.225) < 0.002, b.hit + ' / cd ' + b.cd);
  check('Backstab: ×2 (60) on an enemy moving away, normal (30) when it faces you', b.okB && Math.abs(b.behind - 60) < 0.01 && b.tag && Math.abs(b.front - 30) < 0.01, b.behind + ' / ' + b.front);
  b = await p.evaluate(() => { __prep(); const G = UroCrawl.state, P = UroCrawl.player(), w = G.weapons[0];
    const okL = UroCrawl.giveMod('scalpel_lungereset'); const t = __pin('papillary', P.x + 50, P.y, 0, 0, { bleedMul: 0 }); t.hp = 1; w.cd2 = 1.0; __aim(P.x + 50, P.y); UroCrawl.input.mouseFire = true; UroCrawl.step(2); UroCrawl.input.mouseFire = false; const reset = w.cd2 === 0 && t.dead, txt = G.texts.some(x => x.text === 'LUNGE RESET'); UroCrawl.step(20);
    const okS = UroCrawl.giveMod('scalpel_bleed'); const t2 = __pin('papillary', P.x + 50, P.y); UroCrawl.input.mouseFire = true; UroCrawl.step(1); const s1 = t2.st.bleed && t2.st.bleed.stacks, d1 = t2.st.bleed && t2.st.bleed.dps; UroCrawl.step(16); const s2 = t2.st.bleed && t2.st.bleed.stacks, d2 = t2.st.bleed && t2.st.bleed.dps, base = t2.st.bleed && t2.st.bleed.base; UroCrawl.input.mouseFire = false; UroCrawl.step(10);
    return { okL, reset, txt, okS, s1, d1, s2, d2, base }; });
  check('Lunge Reset: a scalpel kill zeroes the lunge cooldown', b.okL && b.reset && b.txt);
  check('Bleed Stacking: the second slash adds a stack and the bleed grows to ×1.5 of its base', b.okS && b.s1 === 1 && b.s2 === 2 && Math.abs(b.d2 - b.base * 1.5) < 0.01 && b.d2 > b.d1, JSON.stringify({ s1: b.s1, s2: b.s2, d1: b.d1, d2: b.d2 }));
  b = await p.evaluate(() => { __prep(); const G = UroCrawl.state, P = UroCrawl.player(), w = G.weapons[0];
    const okC = UroCrawl.giveMod('scalpel_id'); UroCrawl.step(20);
    const a = __pin('abscess', P.x + 60, P.y, 0, 0, { bleedMul: 0 }); a.wp.ox = -a.r * 0.55; a.wp.oy = 0; a.wp.t = 99; a.wp.next = null; // bulb facing the surgeon
    __aim(P.x + 60, P.y); UroCrawl.input.mouseFire = true; const h = __firstHit(a, 10); UroCrawl.input.mouseFire = false; UroCrawl.step(2);
    const crit = G.texts.filter(x => x.sub === 'DRAINED!').map(x => x.text), pus = G.hazards.filter(x => x.kind === 'pus').length; G.hazards.length = 0; UroCrawl.step(20);
    const t = __pin('papillary', P.x + 50, P.y); UroCrawl.input.mouseFire = true; UroCrawl.step(1); UroCrawl.input.mouseFire = false; UroCrawl.step(10); const bleeding = !!t.st.bleed; t.hp = 1; UroCrawl.input.mouseFire = true; UroCrawl.step(16); UroCrawl.input.mouseFire = false; const pus2 = G.hazards.filter(x => x.kind === 'pus').length;
    return { okC, cap: w.capstone, collapsed: h.dead, crit, pus, bleeding, dead: t.dead, pus2 }; });
  check('Incision and Drainage: a weak-point slash crits ×6 (16 × 1.25 × 0.8 × 6 = 96 shown as DRAINED!), the sac collapses, pus puddle', b.okC && b.cap === 'scalpel_id' && b.crit.length === 1 && b.crit[0] === '96' && b.collapsed && b.pus >= 1, 'crit ' + b.crit.join('/') + ', pus ' + b.pus);
  check('Incision and Drainage: a scalpel kill on a bleeding enemy drains a pus puddle', b.bleeding && b.dead && b.pus2 >= 1, 'pus ' + b.pus2);
  await shot(p, 'j-scalpel');
  errCheck('J3', errs);
});

await block('J4. loop mods', async () => {
  const { p, errs } = await openJ('?seed=23&god=1&room=2&weapons=loop&mods=loop_big,loop_heavy');
  let b = await p.evaluate(() => { UroCrawl.startRun(); UroCrawl.step(2); __prep(); const G = UroCrawl.state, P = UroCrawl.player(), w = G.weapons[0];
    const t = __pin('papillary', P.x + 100, P.y, 0, 0, { bleedMul: 0 }); __aim(P.x + 100, P.y); UroCrawl.input.mouseFire = true; const h = __firstHit(t, 30); const rad = w.fx && w.fx.rad, kx = t.kx; UroCrawl.input.mouseFire = false; UroCrawl.step(60);
    const okF = UroCrawl.giveMod('loop_fast'); const t2 = __pin('papillary', P.x + 100, P.y, 0, 0, { bleedMul: 0 }); __kill(t); UroCrawl.step(1); UroCrawl.input.mouseFire = true; const h2 = __firstHit(t2, 30); UroCrawl.input.mouseFire = false; UroCrawl.step(18); const still = !!w.swing; UroCrawl.step(30); const done = !w.swing;
    return { hit: h.dmg, steps: h.steps, rad, kx, okF, steps2: h2.steps, still, done, slow: UroCrawl.tables.WEAPONS.loop.slowWhile(Object.assign({}, w, { swing: {} })) }; });
  check('Bigger Loop + Heavy Sweep: radius 137.5, the cut lands 45 × 1.3 × 1.5 = 87.75 with ×1.5 knockback', Math.abs(b.rad - 137.5) < 0.01 && Math.abs(b.hit - 87.75) < 0.01 && b.kx > 190, 'rad ' + b.rad + ' dmg ' + b.hit + ' kx ' + Math.round(b.kx));
  check('Fast Return: the cut lands at ~0.18 s instead of 0.25 and the whole swing is over by 0.65 s', b.okF && b.steps >= 15 && b.steps2 <= 12 && b.still && b.done && b.slow === 0.75, 'steps ' + b.steps + ' → ' + b.steps2);
  b = await p.evaluate(() => { __prep(); const G = UroCrawl.state, P = UroCrawl.player(), w = G.weapons[0];
    const okB = UroCrawl.giveMod('loop_blend'); const t = __pin('papillary', P.x + 100, P.y); __aim(P.x + 100, P.y); UroCrawl.input.mouseFire = true; const h = __firstHit(t, 30); UroCrawl.input.mouseFire = false; const noBleed = !t.st.bleed, caut = G.texts.some(x => /^CAUTERIZED \+/.test(x.text)); UroCrawl.step(45);
    const okW = UroCrawl.giveMod('loop_whip'); __kill(t); UroCrawl.step(1); UroCrawl.input.mouseFire = true; UroCrawl.step(13); UroCrawl.input.mouseFire = false; const field = G.fields.length === 1 && G.fields[0].kind === 'wire', rad = G.fields.length ? G.fields[0].rad : 0;
    const t2 = __pin('papillary', P.x + rad, P.y); UroCrawl.step(25); const onWire = t2.hp < t2.maxHp, bled = !!t2.st.bleed; UroCrawl.step(80); const gone = G.fields.length === 0;
    return { okB, noBleed, caut, okW, field, onWire, bled, gone }; });
  check('Blend Current: the cut cauterizes on the spot — nothing left bleeding, CAUTERIZED bonus shown', b.okB && b.noBleed && b.caut);
  check('Wire Whip: the sweep leaves a wire arc that cuts an enemy standing on it (bleed) and fades after 1.5 s', b.okW && b.field && b.onWire && b.bled && b.gone, JSON.stringify(b));
  b = await p.evaluate(() => { __prep(); const G = UroCrawl.state, P = UroCrawl.player(), w = G.weapons[0];
    const offer = UroCrawl.rollModOffer(w, 3); const okT = UroCrawl.giveMod('loop_turp');
    const t = __pin('bph', P.x + 110, P.y); __aim(P.x + 110, P.y); const e0 = G.stats.dmg.ENERGY; UroCrawl.input.mouseFire = true; UroCrawl.step(32); UroCrawl.input.mouseFire = false; const energy = G.stats.dmg.ENERGY - e0, turp = G.texts.some(x => x.sub === 'TURP'), gold = !!(w.fx && w.fx.gold); UroCrawl.step(30);
    P.hp = 50; t.hp = 1; UroCrawl.input.mouseFire = true; UroCrawl.step(20); UroCrawl.input.mouseFire = false;
    return { offer, okT, cap: w.capstone, energy, turp, gold, hp: P.hp, dead: t.dead }; });
  check('TURP Special: offered once Blend + Heavy are held; the return sweep deals ENERGY and shows TURP', b.offer[0] === 'loop_turp' && b.okT && b.cap === 'loop_turp' && b.energy > 0 && b.turp, 'energy ' + Math.round(b.energy));
  check('TURP Special: a BENIGN kill with the loop heals 4 HP', b.dead && b.hp === 54, 'hp ' + b.hp);
  await shot(p, 'j-loop');
  errCheck('J4', errs);
});

await block('J5. bovie mods', async () => {
  const { p, errs } = await openJ('?seed=24&god=1&room=2&weapons=bovie&mods=bovie_watt');
  let b = await p.evaluate(() => { UroCrawl.startRun(); UroCrawl.step(2); __prep(); const G = UroCrawl.state, P = UroCrawl.player(), w = G.weapons[0];
    const line = []; for (let i = 0; i < 6; i++) line.push(__pin('cod', P.x + 100 + i * 60, P.y)); __aim(P.x + 100, P.y);
    UroCrawl.input.mouseFire = true; UroCrawl.step(1); UroCrawl.input.mouseFire = false; const hit3 = line.filter(e => e.hp < e.maxHp).length;
    const okC = UroCrawl.giveMod('bovie_chain'); line.forEach(e => { e.hp = e.maxHp; }); w.tick = 0; UroCrawl.step(12); UroCrawl.input.mouseFire = true; UroCrawl.step(1); UroCrawl.input.mouseFire = false; const hit4 = line.filter(e => e.hp < e.maxHp).length;
    return { ms: w.ms, hit3, okC, hit4 }; });
  check('High Wattage + Chain +1: ×1.25 damage, the arc jumps 3 → 4 targets', Math.abs(b.ms.dmg - 1.25) < 1e-9 && b.hit3 === 3 && b.okC && b.ms.chain === 1 && b.hit4 === 4, b.hit3 + ' → ' + b.hit4);
  b = await p.evaluate(() => { __prep(); const G = UroCrawl.state, P = UroCrawl.player(), w = G.weapons[0];
    const t = __pin('cod', P.x + 100, P.y); __aim(P.x + 100, P.y); G.hazards.push({ kind: 'saline', x: P.x, y: P.y, r: 60, t: Infinity, max: Infinity, ph: 0 });
    const fizzles = function (steps) { let n = 0; UroCrawl.input.mouseFire = true; for (let i = 0; i < steps; i++) { UroCrawl.step(1); if (w.fx && w.fx.fizzle && w.fx.t > 0.07) n++; } UroCrawl.input.mouseFire = false; return n; }; // count fizzle flashes on the tick they happen
    const fizzBefore = fizzles(120); UroCrawl.step(60);
    const okG = UroCrawl.giveMod('bovie_ground'); w.power = 1; const fizzAfter = fizzles(120); G.hazards.length = 0; UroCrawl.step(60);
    __kill(t); UroCrawl.step(1); const side = __pin('cod', P.x + 20 + Math.cos(1.0) * 80, P.y + Math.sin(1.0) * 80); __aim(P.x + 200, P.y); w.power = 1; UroCrawl.input.mouseFire = true; UroCrawl.step(1); UroCrawl.input.mouseFire = false; const sideBefore = side.hp < side.maxHp;   // 57° off the muzzle's aim line
    const okS = UroCrawl.giveMod('bovie_spray'); w.tick = 0; UroCrawl.step(12); UroCrawl.input.mouseFire = true; UroCrawl.step(1); UroCrawl.input.mouseFire = false; const sideAfter = side.hp < side.maxHp;
    return { fizzBefore, okG, fizzAfter, sideBefore, okS, sideAfter }; });
  check('Ground Pad: the Bovie fizzled in saline before the mod and never after it', b.fizzBefore > 0 && b.okG && b.fizzAfter === 0, b.fizzBefore + ' → ' + b.fizzAfter);
  check('Spray Mode: an enemy 57° off the aim line is out of the normal cone but inside the 140° spray', !b.sideBefore && b.okS && b.sideAfter);
  b = await p.evaluate(() => { __prep(); const G = UroCrawl.state, P = UroCrawl.player(), w = G.weapons[0];
    const okF = UroCrawl.giveMod('bovie_fulg'); const t = __pin('cod', P.x + 100, P.y); __aim(P.x + 100, P.y); w.power = 1; w.mode = 0; UroCrawl.input.mouseFire = true; UroCrawl.step(1); UroCrawl.input.mouseFire = false; const stunned = !!t.st.stun, stunT = t.st.stun && t.st.stun.t; UroCrawl.step(60);
    const offer = UroCrawl.rollModOffer(w, 3), okR = UroCrawl.giveMod('bovie_reaction'); __kill(t); UroCrawl.step(1);
    const cl = []; for (let i = 0; i < 6; i++) cl.push(__pin('cod', P.x + 110 + (i % 3) * 50, P.y - 50 + Math.floor(i / 3) * 55)); w.power = 1; w.tick = 0; UroCrawl.step(12); UroCrawl.input.mouseFire = true; UroCrawl.step(1); UroCrawl.input.mouseFire = false;
    const fx = w.fx, ends = fx && fx.branches ? fx.branches.map(s => Math.round(s[1].x) + ',' + Math.round(s[1].y)) : [], dup = ends.length !== new Set(ends).size, hit = cl.filter(e => e.hp < e.maxHp).length;
    return { okF, stunned, stunT, offer, okR, cap: w.capstone, tree: !!(fx && fx.tree), branches: ends.length, dup, hit }; });
  check('Fulguration: every arc hit stuns (0.35 s in CUT mode)', b.okF && b.stunned && Math.abs(b.stunT - 0.35) < 0.02, 'stun ' + b.stunT);
  check('Chain Reaction: offered once Chain +1 + Fulguration are held; the arc becomes a forking tree that reaches all six and then re-hits', b.offer[0] === 'bovie_reaction' && b.okR && b.cap === 'bovie_reaction' && b.tree && b.branches >= 8 && b.dup && b.hit === 6, JSON.stringify({ branches: b.branches, dup: b.dup, hit: b.hit }));
  await shot(p, 'j-bovie');
  errCheck('J5', errs);
});

await block('J6. trilogy mods', async () => {
  const { p, errs } = await openJ('?seed=25&god=1&room=2&weapons=trilogy&mods=trilogy_probe,trilogy_dual');
  let b = await p.evaluate(() => { UroCrawl.startRun(); UroCrawl.step(2); __prep(); const G = UroCrawl.state, P = UroCrawl.player(), w = G.weapons[0];
    const t = __pin('com', P.x + 60, P.y); __aim(P.x + 60, P.y); UroCrawl.input.mouseFire = true; const h = __firstHit(t, 10); const hp1 = t.hp; UroCrawl.step(60); const ticks = (hp1 - t.hp) / h.dmg; UroCrawl.input.mouseFire = false; UroCrawl.step(5);
    const okR = UroCrawl.giveMod('trilogy_reach'); __kill(t); UroCrawl.step(1); UroCrawl.input.mouseFire = true; UroCrawl.step(3); const len = Math.hypot(w.fx.x1 - w.fx.x0, w.fx.y1 - w.fx.y0); UroCrawl.input.mouseFire = false; UroCrawl.step(5);
    return { ms: w.ms, hit: h.dmg, ticks, okR, len }; });
  check('Bigger Probe + Dual-Frequency: a tick lands 4.2 × 1.25 × 1.75 = 9.1875 and ~17 ticks land per second (0.056 s)', Math.abs(b.hit - 9.1875) < 0.01 && Math.abs(b.ms.hw - 1.35) < 1e-9 && b.ticks >= 16 && b.ticks <= 19, 'hit ' + b.hit + ', ticks/s ' + b.ticks.toFixed(1));
  check('Probe Reach: the probe reaches 135 px', b.okR && Math.abs(b.len - 135) < 1, b.len.toFixed(1));
  b = await p.evaluate(() => { __prep(); const G = UroCrawl.state, P = UroCrawl.player(), w = G.weapons[0];
    const okH = UroCrawl.giveMod('trilogy_handsfree'); G.pickups.push({ kind: 'coin', x: P.x + 120, y: P.y, vx: 0, vy: 0, z: 0, vz: 0, t: 1, value: 1, magnet: false, bob: 0 }); __aim(P.x + 120, P.y);
    UroCrawl.input.mouseFire = true; UroCrawl.step(2); const suck = w.suck, fx2 = w.fx2 && w.fx2.kind, magnet = G.pickups[0] && G.pickups[0].magnet; UroCrawl.input.mouseFire = false; UroCrawl.step(2); const off = !w.suck; G.pickups.length = 0;
    const okV = UroCrawl.giveMod('trilogy_vortex'); const far = __pin('cod', P.x + 150, P.y); far.def = Object.assign({}, far.def, { update: function (q) { q.vx = q.vy = 0; } }); const near = __pin('cod', P.x + 50, P.y); near.def = far.def;
    const d0 = far.x - P.x; UroCrawl.input.mouseAlt = true; UroCrawl.step(30); UroCrawl.input.mouseAlt = false; const d1 = far.x - P.x, nearHit = near.hp < near.maxHp, vfx = !!(w.fx2 && w.fx2.vortex);
    return { okH, suck, fx2, magnet, off, okV, d0, d1, nearHit, vfx }; });
  check('Hands-Free Suction: suction runs while firing (loot magnetised) and stops with the trigger', b.okH && b.suck && b.fx2 === 'suction' && b.magnet && b.off);
  check('Vortex Pull: the suction drags a far enemy toward you and grinds the near one', b.okV && b.d1 < b.d0 - 30 && b.nearHit && b.vfx, Math.round(b.d0) + ' → ' + Math.round(b.d1));
  b = await p.evaluate(() => { __prep(); const G = UroCrawl.state, P = UroCrawl.player(), w = G.weapons[0];
    const offer = UroCrawl.rollModOffer(w, 3), okM = UroCrawl.giveMod('trilogy_maelstrom');
    const cx = P.x + 120, cy = P.y, still = function (q) { q.vx = q.vy = 0; }; const eye = __pin('com', cx, cy); eye.def = Object.assign({}, eye.def, { update: still }); const rim = __pin('cod', cx + 80, cy); rim.def = Object.assign({}, rim.def, { update: still });
    const r0 = Math.hypot(rim.x - cx, rim.y - cy); __aim(cx, cy); UroCrawl.input.mouseAlt = true; UroCrawl.step(30); const kind = w.fx2 && w.fx2.kind; UroCrawl.input.mouseAlt = false; const r1 = Math.hypot(rim.x - cx, rim.y - cy);
    return { offer, okM, cap: w.capstone, kind, eyeHit: eye.hp < eye.maxHp, r0, r1 }; });
  check('Maelstrom: offered once Vortex + Hands-Free are held; a vortex ahead of the probe grinds the eye and drags the rim in', b.offer[0] === 'trilogy_maelstrom' && b.okM && b.cap === 'trilogy_maelstrom' && b.kind === 'maelstrom' && b.eyeHit && b.r1 < b.r0 - 30, Math.round(b.r0) + ' → ' + Math.round(b.r1));
  await shot(p, 'j-trilogy');
  errCheck('J6', errs);
});

await block('J7. aspects', async () => {
  const { p, errs } = await openJ('?seed=26&god=1&room=2&weapons=holmium,scalpel,loop,trilogy&aspects=holmium:fragmenting,scalpel:bleeder,loop:buttonatt,trilogy:pneumatic');
  let b = await p.evaluate(() => { UroCrawl.startRun(); UroCrawl.step(2); __prep(); const G = UroCrawl.state, P = UroCrawl.player(), W = UroCrawl.tables.WEAPONS;
    const asp = G.weapons.map(w => w.aspect), h = G.weapons[0];
    const t = __pin('com', P.x + 150, P.y); __aim(P.x + 150, P.y); UroCrawl.input.edges.alt = true; UroCrawl.step(1); const mode = h.mode, cd2 = h.cd2, sup = G.texts.some(x => x.sub === 'SUPERPULSE'), supDmg = t.maxHp - t.hp;
    h.heat = 0; UroCrawl.input.mouseFire = true; UroCrawl.step(60); UroCrawl.input.mouseFire = false; const heat = h.heat; UroCrawl.step(30);
    UroCrawl.selectWeapon(1); G.swapT = 0; G.swapBonusT = 0; const s = G.weapons[1]; UroCrawl.input.edges.alt = true; UroCrawl.step(1); const blade = G.bullets.some(x => x.kind === 'blade'); UroCrawl.step(40);
    const t2 = __pin('papillary', P.x + 50, P.y, 0, 0, { bleedMul: 0 }); __aim(P.x + 50, P.y); UroCrawl.input.mouseFire = true; const sh = __firstHit(t2, 10); UroCrawl.input.mouseFire = false; UroCrawl.step(30);
    UroCrawl.selectWeapon(2); G.swapT = 0; G.swapBonusT = 0; const l = G.weapons[2]; const e0 = G.stats.dmg.ENERGY; __kill(t2); UroCrawl.step(1); const t3 = __pin('papillary', P.x + 60, P.y); UroCrawl.input.mouseFire = true; UroCrawl.step(20); UroCrawl.input.mouseFire = false; const cone = G.stats.dmg.ENERGY - e0, noSwing = !l.swing; UroCrawl.input.edges.alt = true; UroCrawl.step(1); const swing = !!l.swing, lcd = l.cd2; UroCrawl.step(60);
    UroCrawl.selectWeapon(3); G.swapT = 0; G.swapBonusT = 0; const tr = G.weapons[3]; __kill(t3); UroCrawl.step(1); const t4 = __pin('com', P.x + 60, P.y); __aim(P.x + 60, P.y); UroCrawl.input.mouseFire = true; const th = __firstHit(t4, 20); const slow = W.trilogy.slowWhile(tr); UroCrawl.input.mouseFire = false;
    return { asp, mode, cd2, sup, supDmg, heat, blade, slash: sh.dmg, cone, noSwing, swing, lcd, lmode: l.mode, piston: th.dmg, slow }; });
  check('?aspects= pins Fragmenting / Bleeder / Button / Pneumatic on the four instruments', b.asp.join() === 'fragmenting,bleeder,buttonatt,pneumatic', b.asp.join());
  check('Fragmenting: FRAGMENT only, alt is a SUPERPULSE (65 × 1.75 = 113.75, 1.8 s cooldown), heat builds per pulse (~0.4 after 1 s)', b.mode === 1 && Math.abs(b.cd2 - 1.8) < 0.02 && b.sup && Math.abs(b.supDmg - 113.75) < 0.01 && b.heat > 0.25 && b.heat < 0.5, JSON.stringify({ mode: b.mode, cd2: b.cd2, sup: b.supDmg, heat: b.heat }));
  check('Bleeder: alt throws a spinning blade; slashes hit for 12.8 × 1.5 = 19.2', b.blade && Math.abs(b.slash - 19.2) < 0.01, 'slash ' + b.slash);
  check('Button attachment: the cone is the primary (ENERGY, no swing) and alt swings the loop on a 1.2 s cooldown', b.lmode === 1 && b.cone > 0 && b.noSwing && b.swing && Math.abs(b.lcd - 1.2) < 0.02, JSON.stringify({ cone: Math.round(b.cone), lcd: b.lcd }));
  check('Pneumatic: a piston strike lands 14.7 × 1.75 = 25.725 and you keep 85% speed', Math.abs(b.piston - 25.725) < 0.01 && b.slow === 0.85, 'piston ' + b.piston + ' slow ' + b.slow);
  await shot(p, 'j-aspects-2');
  const { p: p3, errs: errs3 } = await openJ('?seed=27&god=1&room=2&weapons=holmium,scalpel,loop,trilogy&aspects=holmium:popcorning,scalpel:lunger,loop:rolleratt,trilogy:combined');
  b = await p3.evaluate(() => { UroCrawl.startRun(); UroCrawl.step(2); __prep(); const G = UroCrawl.state, P = UroCrawl.player();
    const asp = G.weapons.map(w => w.aspect), h = G.weapons[0];
    const t = __pin('com', P.x + 150, P.y), side = __pin('com', P.x + 250, P.y + 36); __aim(P.x + 150, P.y); let boil = false; UroCrawl.input.mouseFire = true; for (let i = 0; i < 30; i++) { UroCrawl.step(1); if (h.fx && h.fx.boil) boil = true; } UroCrawl.input.mouseFire = false; const sideHit = side.hp < side.maxHp;   // 36 px off the beam line: outside hw + r (31), inside the 38 px boil
    UroCrawl.input.keys.KeyA = true; UroCrawl.step(2); let movingBoil = false; UroCrawl.input.mouseFire = true; for (let i = 0; i < 30; i++) { UroCrawl.step(1); if (h.fx && h.fx.boil) movingBoil = true; } UroCrawl.input.mouseFire = false; UroCrawl.input.keys.KeyA = false; P.x = 300; P.y = 270; UroCrawl.step(30);   // walking (away from the target) switches the boil off
    UroCrawl.selectWeapon(1); G.swapT = 0; const s = G.weapons[1]; UroCrawl.input.edges.alt = true; UroCrawl.step(1); const lcd = s.cd2, lunge = s.lunge; UroCrawl.step(60); P.x = 300; P.y = 270; __aim(P.x + 50, P.y); UroCrawl.input.mouseFire = true; UroCrawl.step(1); UroCrawl.input.mouseFire = false; const scd = s.cd; UroCrawl.step(40);
    UroCrawl.selectWeapon(2); G.swapT = 0; const l = G.weapons[2]; G.enemies.forEach(__kill); UroCrawl.step(1); const pol = __pin('polyp', P.x + 50, P.y); pol.hp = 1; P.hp = 50; __aim(P.x + 50, P.y); UroCrawl.input.mouseFire = true; UroCrawl.step(10); UroCrawl.input.mouseFire = false; const healed = P.hp, polDead = pol.dead; UroCrawl.step(20);
    UroCrawl.selectWeapon(3); G.swapT = 0; const tr = G.weapons[3]; UroCrawl.input.mouseAlt = true; UroCrawl.step(2); const rad = tr.fx2 && tr.fx2.rad; UroCrawl.input.mouseAlt = false; const t5 = __pin('com', P.x + 60, P.y); __aim(P.x + 60, P.y); let maxDelta = 0, hp = t5.hp; UroCrawl.input.mouseFire = true; for (let i = 0; i < 60; i++) { UroCrawl.step(1); maxDelta = Math.max(maxDelta, hp - t5.hp); hp = t5.hp; } UroCrawl.input.mouseFire = false;
    return { asp, boil, sideHit, movingBoil, lcd, lunge, scd, lmode: l.mode, healed, polDead, rad, maxDelta, ticks: tr.ticks }; });
  check('?aspects= pins Popcorning / Lunger / Roller Ball / Combined', b.asp.join() === 'popcorning,lunger,rolleratt,combined', b.asp.join());
  check('Popcorning: standing still, the beam tip boils and hits an enemy beside the tip; moving, it does not', b.boil && b.sideHit && !b.movingBoil);
  check('Lunger: lunge cooldown 0.5 s and a 0.22 s dash; slashes take 0.4 s', Math.abs(b.lcd - 0.5) < 0.02 && Math.abs(b.lunge - 0.22) < 0.02 && Math.abs(b.scd - 0.4) < 0.002, JSON.stringify({ lcd: b.lcd, lunge: b.lunge, scd: b.scd }));
  check('Roller Ball attachment: coag cone primary (mode pinned to ROLLER) heals 2 HP per BENIGN kill', b.lmode === 2 && b.polDead && b.healed === 52, 'hp ' + b.healed);
  check('Combined: 240 px suction cone and a piston strike (12 × 1.75 = 21) every fifth tick', b.rad === 240 && Math.abs(b.maxDelta - 21) < 0.01 && b.ticks >= 5, 'rad ' + b.rad + ' max tick ' + b.maxDelta);
  await shot(p3, 'j-aspects-3');
  // persistence + level gating + the title-screen picker
  const { p: p4, errs: errs4 } = await open('?seed=28');
  b = await p4.evaluate(() => { const a0 = UroCrawl.chosenAspect('scalpel'); UroCrawl.setAspect('scalpel', 'lunger'); const locked = UroCrawl.chosenAspect('scalpel'); UroCrawl.meta.xp = 5000; const unlocked = UroCrawl.chosenAspect('scalpel'); UroCrawl.setAspect('scalpel', 'lunger'); return { a0, locked, unlocked }; });
  check('aspect picks persist in META and stay locked below the level (Lunger needs PGY-4)', b.a0 === 'backstab' && b.locked === 'backstab' && b.unlocked === 'lunger');
  await p4.reload(); await p4.waitForFunction(() => !!window.UroCrawl);
  b = await p4.evaluate(() => ({ chosen: UroCrawl.chosenAspect('scalpel'), line: document.getElementById('aspectLine').textContent }));
  check('the title screen shows the chosen aspects after a reload', b.chosen === 'lunger' && /Scalpel · Lunger/.test(b.line) && /Holmium · Dusting/.test(b.line), b.line);
  await p4.click('#btnAspects'); await p4.waitForTimeout(100);
  b = await p4.evaluate(() => { const o = UroCrawl.state.overlay, cards = document.querySelectorAll('#aspectList .card.asp').length, sel = document.querySelectorAll('#aspectList .card.asp.sel').length, locked = document.querySelectorAll('#aspectList .card.asp.locked').length; UroCrawl.meta.xp = 0; document.getElementById('btnAspects').click(); const locked0 = document.querySelectorAll('#aspectList .card.asp.locked').length; return { o, cards, sel, locked, locked0 }; });
  check('ASPECTS screen: 12 cards, one equipped per instrument; 8 locked at PGY-1, none at PGY-12', b.o === 'aspects' && b.cards === 12 && b.sel === 4 && b.locked === 0 && b.locked0 === 8, JSON.stringify(b));
  await shot(p4, 'j-aspects-screen');
  errCheck('J7', errs.concat(errs3, errs4));
});

await block('J8. instrument rep', async () => {
  const { p, errs } = await openJ('?seed=29&god=1&room=3&weapons=holmium,scalpel');
  let b = await p.evaluate(() => { UroCrawl.startRun(); UroCrawl.step(2); __prep(); const G = UroCrawl.state, P = UroCrawl.player();
    let reps = 0, only = 0, sizes = []; for (let i = 0; i < 60; i++) { const o = UroCrawl.genDoorOptions({ index: 3 }); sizes.push(o.length); if (o.indexOf('rep') >= 0) reps++; if (o.length === 1 && o[0] === 'rep') only++; }
    UroCrawl.giveMod('holmium_joules'); UroCrawl.giveMod('holmium_narrow'); let h = 0; for (let i = 0; i < 300; i++) if (UroCrawl.pickRepWeapon().id === 'holmium') h++;
    return { reps, only, h }; });
  check('rep doors appear in the door roll (room 3+), never as the only door', b.reps > 0 && b.only === 0, b.reps + ' of 60 rolls');
  check('build momentum: a weapon with 2 mods is picked ~64% of the time, the fresh one still ~36%', b.h > 150 && b.h < 240, b.h + ' / 300 picked Holmium');
  await p.evaluate(() => { const G = UroCrawl.state; UroCrawl.skipRoom(); UroCrawl.step(5); const d = G.doors[0]; d.type = 'rep'; d.weapon = 'scalpel'; d.open = true; d.anim = 1; UroCrawl.step(40); });
  await p.waitForTimeout(250); // let a frame render the repainted plaque
  b = await p.evaluate(() => { const G = UroCrawl.state, P = UroCrawl.player(), d = G.doors[0];
    const box = document.getElementById('game').getBoundingClientRect(), s = box.width / 960, ctx = document.getElementById('game').getContext('2d');
    const ix = d.x - 34, iy = d.y + d.h / 2, px = [[ix - 24, iy], [ix, iy - 24], [ix, iy + 24]].map(q => Array.from(ctx.getImageData(Math.round(q[0] * s), Math.round(q[1] * s), 1, 1).data).slice(0, 3)); // three points on the ring
    const best = px.reduce((a, c) => (c[0] > a[0] ? c : a), [0, 0, 0]);
    P.x = d.x - 20; P.y = d.y + d.h / 2; UroCrawl.step(80); const plan = G.room;
    UroCrawl.skipRoom(); UroCrawl.step(5); const rep = G.rewards.filter(r => r.kind === 'rep')[0];
    return { px: best, reward: plan.reward, repWeapon: plan.repWeapon, kind: plan.kind, rep: !!rep, repFor: rep && rep.weapon }; });
  check('the rep door plaque is painted in the weapon\'s class colour (Scalpel = CUT red, under the vignette)', b.px[0] > 110 && b.px[0] > b.px[1] * 2.2 && b.px[2] < b.px[0] * 0.6, 'rgb ' + b.px.join(','));
  check('through a rep door: a combat room whose reward is the Instrument Rep for that weapon', b.kind === 'combat' && b.reward === 'rep' && b.repWeapon === 'scalpel' && b.rep && b.repFor === 'scalpel');
  b = await p.evaluate(() => { const G = UroCrawl.state, P = UroCrawl.player(), rep = G.rewards.filter(r => r.kind === 'rep')[0]; G.rvu = 100; P.x = rep.x + 80; P.y = rep.y; UroCrawl.step(3); P.x = rep.x; P.y = rep.y; UroCrawl.step(3);
    const o = G.overlay, cards = document.querySelectorAll('#modCards .card').length, title = document.getElementById('modTitle').textContent, ids = rep.offer.slice(), btn = document.getElementById('btnModReroll');
    const canReroll = !btn.disabled, label = btn.textContent, rvu0 = G.rvu; btn.click(); const spent = rvu0 - G.rvu, w2 = rep.weapon, ids2 = rep.offer.slice(), disabled = btn.disabled, label2 = btn.textContent, title2 = document.getElementById('modTitle').textContent;
    document.querySelector('#modCards .card').click(); const closed = G.overlay, used = rep.used, holm = G.weapons[0].modIds.length;
    return { o, cards, title, ids, canReroll, label, spent, w2, ids2, disabled, label2, title2, closed, used, holm }; });
  check('the rep offers 3 of this weapon\'s available mods (a fresh Scalpel: its three tier-I mods)', b.o === 'mod' && b.cards === 3 && /Scalpel/.test(b.title) && b.ids.length === 3 && b.ids.every(id => /^scalpel_/.test(id)), b.ids.join());
  check('one reroll per rep costs 20 RVU; with no new Scalpel samples it opens another instrument\'s case (Holmium: its 2 remaining mods)', b.canReroll && /ANOTHER INSTRUMENT/.test(b.label) && b.spent === 20 && b.w2 === 'holmium' && /Holmium/.test(b.title2) && b.ids2.length === 2 && b.ids2.every(id => /^holmium_/.test(id)) && b.disabled && b.label2 === 'REROLLED', JSON.stringify({ w2: b.w2, ids2: b.ids2, label: b.label }));
  check('picking a card installs the mod and closes the screen', b.closed === null && b.used && b.holm === 3);
  await shot(p, 'j-rep');
  // shop sample + rest-room rep + debug hook refusal
  const { p: p2, errs: errs2 } = await openJ('?seed=30&god=1&room=8&weapons=holmium,scalpel');
  b = await p2.evaluate(() => { UroCrawl.startRun(); UroCrawl.step(5); const G = UroCrawl.state, P = UroCrawl.player(); const rep = G.rewards.filter(r => r.kind === 'rep').length, shop = G.rewards.filter(r => r.kind === 'shop')[0];
    P.x = shop.x + 80; P.y = shop.y; UroCrawl.step(3); P.x = shop.x; P.y = shop.y; UroCrawl.step(3); const item = shop.stock.filter(it => it.kind === 'mod')[0]; G.rvu = 500; document.getElementById('btnShopLeave').click(); P.x = shop.x + 80; UroCrawl.step(3); P.x = shop.x; UroCrawl.step(3);
    const btns = Array.from(document.querySelectorAll('#shopItems .shopline')); const line = btns.filter(l => /Rep sample/.test(l.textContent))[0]; if (line) line.querySelector('button').click();
    const mods = G.weapons.reduce((n, w) => n + w.modIds.length, 0), before = UroCrawl.giveMod('bovie_watt'); UroCrawl.giveWeapon('bovie'); const after = UroCrawl.giveMod('bovie_watt'), bad = UroCrawl.giveMod('nope');
    return { rep, item: item && item.name, mods, before, after, bad }; });
  check('the call room hosts a rep, and the shop sells a rep sample that installs on purchase', b.rep === 1 && /^Rep sample: /.test(b.item || '') && b.mods === 1, JSON.stringify({ rep: b.rep, item: b.item, mods: b.mods }));
  check('giveMod refuses a mod for a weapon you do not carry (and unknown ids); works once the weapon is held', b.before === false && b.after === true && b.bad === false);
  errCheck('J8', errs.concat(errs2));
});

await block('J9. HUD detail + unmodded baseline', async () => {
  const { p, errs } = await openJ('?seed=31&god=1&room=2&weapons=holmium,scalpel');
  let b = await p.evaluate(() => { UroCrawl.startRun(); UroCrawl.step(2); __prep(); const G = UroCrawl.state, P = UroCrawl.player(), w = G.weapons[0];
    const t = __pin('com', P.x + 150, P.y); __aim(P.x + 150, P.y); UroCrawl.input.mouseFire = true; const h = __firstHit(t, 20); UroCrawl.input.mouseFire = false;
    const n = G.weapons.length, tot = n * 56 + (n - 1) * 8, x0 = 480 - tot / 2; __aim(x0 + 28, 540 - 66 + 28); const hover0 = UroCrawl.detailSlot(); __aim(x0 + 56 + 8 + 28, 540 - 66 + 28); const hover1 = UroCrawl.detailSlot(); __aim(480, 200); const none = UroCrawl.detailSlot();
    UroCrawl.input.mode = 'touch'; G.detailSlot = 1; G.detailT = 3; const tap = UroCrawl.detailSlot(); UroCrawl.step(200); const expired = UroCrawl.detailSlot(); UroCrawl.input.mode = 'kb'; __aim(x0 + 28, 540 - 66 + 28);
    return { ms: Object.keys(w.ms).length, flags: Object.keys(w.flags).length, aspect: w.aspect, hit: h.dmg, hover0, hover1, none, tap, expired }; });
  check('an unmodded Holmium is unchanged: no stats, no flags, classic aspect, a DUST tick still lands 3.4 × 1.75 = 5.95', b.ms === 0 && b.flags === 0 && b.aspect === 'dusting' && Math.abs(b.hit - 5.95) < 0.01, 'hit ' + b.hit);
  check('weapon-detail card: hovering a slot picks it (mouse), a slot tap shows it for 3 s (touch)', b.hover0 === 0 && b.hover1 === 1 && b.none === -1 && b.tap === 1 && b.expired === -1, JSON.stringify(b));
  await p.waitForTimeout(300); await shot(p, 'j-hud-detail');
  errCheck('J9 (detail card rendered over live frames)', errs);
});

await browser.close();
console.log('\n' + nPass + ' passed, ' + nFail + ' failed' + (nFail ? '\n - ' + failures.join('\n - ') : '') + '\nScreenshots: ' + OUT);
process.exit(nFail ? 1 : 0);
