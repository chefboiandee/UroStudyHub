#!/usr/bin/env node
// Headless E2E for Uro Crawl (games/uro-crawl.html): boots the page, runs a room with mouse + keyboard, checks every
// weapon deals damage (primary and alt), the class-vs-family matrix, status interactions (bleed→cauterize, chill→frozen
// →shatter, biofilm strip, AML hemorrhage), the Right Tool bonus, the Staghorn's three phases, death and win screens,
// persistence, touch controls (floating stick + FIRE with a second finger, slot taps, pause button), the rotate
// overlay, the ?embed=1 postMessage contract, and autoplays several seeds through all nine rooms.
// Also the HIFU / Urethrotome / CO₂ / da Vinci console additions and the Condyloma Cluster.
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
          else if (G.overlay === 'weapon') { out.crates++; const slot = document.querySelector('#slotPick .btn'), c = document.querySelector('#weapCards .card'); if (slot) slot.click(); else if (c) c.click(); if (G.overlay) document.getElementById('btnWeapLeave').click(); }
          else if (G.overlay === 'shop') { const b = document.querySelector('#shopItems .btn:not(:disabled)'); if (b) b.click(); document.getElementById('btnShopLeave').click(); } }
        if (G.overlay) UroCrawl.hideScreens();
        if (plan.kind === 'boss') { UroCrawl.step(200); UroCrawl.skipRoom(); UroCrawl.step(300); out.won = G.won; break; }
        if (!pickDoor()) { UroCrawl.step(60); if (!pickDoor()) break; } UroCrawl.step(60);
      }
      out.weapons = G.weapons.length; out.boonsHeld = G.boons.length; return out;
    });
    check('seed ' + seed + ' plays 9 rooms to the win screen', log.rooms.length === 9 && log.won, 'kinds ' + log.kinds.join(',') + ' · altars ' + log.boons + ' · crates ' + log.crates + ' · held ' + log.weapons + 'w/' + log.boonsHeld + 'b');
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

await browser.close();
console.log('\n' + nPass + ' passed, ' + nFail + ' failed' + (nFail ? '\n - ' + failures.join('\n - ') : '') + '\nScreenshots: ' + OUT);
process.exit(nFail ? 1 : 0);
