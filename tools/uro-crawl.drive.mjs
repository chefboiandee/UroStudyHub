#!/usr/bin/env node
// Headless E2E for Uro Crawl (games/uro-crawl.html): boots the page, runs a room with mouse + keyboard, checks every
// weapon deals damage (primary and alt), the class-vs-family matrix, status interactions (bleed→cauterize, chill→frozen
// →shatter, biofilm strip, AML hemorrhage), the Right Tool bonus, the Staghorn's three phases, death and win screens,
// persistence, touch controls (floating stick + FIRE with a second finger, slot taps, pause button), the rotate
// overlay, the ?embed=1 postMessage contract, and autoplays several seeds through all nine rooms.
// Also the HIFU / Urethrotome / CO₂ / da Vinci console additions and the Condyloma Cluster, and (block J) the weapon
// upgrade paths: the MODS table, every mod's in-game effect for the five starting weapons, the aspects, Instrument Rep
// doors + screen + reroll, the shop sample, the HUD pips/detail card and the giveMod / ?mods= / ?aspects= hooks.
// Block N: look and feel — family rim colours, ground slams + stagger, the scalpel lunge, every enemy drawing.
// Block O: the Invader (?boss=mibc): round arena, the generic wall + perforation system, obturator jerk, the three stages,
// the charged cystectomy, neoadjuvant chemo, the Oncology dungeon and the three-boss pool.
// Block K: the Antibiotic Dropper. Block L: antibiotic stewardship (the two-drug cap, resistance meters, collateral C. diff /
// Candida, resistant strains, Culture & Sensitivity + De-escalation). Block M: the reps cast, patron altars, Fournier.
// Block P: the Staghorn as a mobile head-on duelist (?boss=staghorn): the antler charge and its lane, the wall-crash stun and
// tine break, gored vs rolled through, the shell, sweep / slam + shard ring / spike volley, the three phases, and two full
// fights played by a bot with no god mode. (Block B still covers the same boss's phase gates, shield and win screen.)
// Block Q: the Giant TURP (?boss=bph, ?section=1|2|3): the flow meter and the win line, capsule fibers, overcut → perforation →
// plug, swelling, the ball valve and retention, the generic landmark warning (ureteric orifices, verumontanum), the sphincter
// injury and the incontinence curse with its fixes (Kegel, the Artificial Sphincter in the shop and from the next rep), neck
// scar → contracture → the flow cap → incision, the hoser's red-out and both fixes, thrusts and the pinch, the section slides,
// TUR syndrome, the Benign dungeon, the four-boss pool, and two full fights played by a bot with no god mode.
// Block R: the Call Room (the walkable hub between runs): PLAY → the room, QUICK START past it, ?hub=1 / ?cme=N, walking and
// the three ways to interact (E, Enter, click) plus touch (stick, INTERACT, ROLL, menu), every station (locker + aspects, case
// board and its unlock chain, pharmacy cart, lanyard pins and their levels, whiteboard perks, chart rack, trophy wall, coffee,
// scrub cabinet, decor catalog and its slots, rep table), the cast's rotating lines, the janitor's round, the OR door's
// scrub-in sheet, a run that carries the picks (instruments, aspects, boon, pin, perks, coffee, case), the free reroll,
// what a run pays in CME (rooms, boss, first kill, charts, favor), the summary's way back, and persistence across a reload.
// Block S: the Peds Wing (?dungeon=peds) and Reflux (?boss=reflux): the pediatric scope, par timers + medals + the sticker
// book, the six drills (success, fail-restart, personal bests, the Sim Lab), the four movement techniques, the Peds enemies,
// elites and PUV gates, hydronephrosis decompress vs pop, the Wilms patron and the new boons, every serpent mechanic (loops,
// the peristaltic lump, dive / pop / backwash, the bulking needle and the injection ring, the maw, stranding and the blowout,
// the grades, the tunnel, the Foley), two full fights played by a bot with no god mode, the Call Room pieces, a run end to end
// and phone-size frame rates. BLOCKS=S runs only it (the letter before the dot).
// Block T: character select and the wardrobe (roadmap Step 5): "Who are you?" on the first visit and the mirror after it (build,
// skin, hair, colour; seen in the room, the HUD portrait and the summary by sampling pixels), every wardrobe item tried on, bought,
// worn, taken off and put back on, sets, the old photograph, the nine scrub colours, the catalogue's silhouettes, persistence,
// each deed unlock (Fournier's, Young's favour, continence lost, a room of stones, Nitze's favour, PGY-6), the cast's outfit
// lines, and the same seeded room played by a bot in five looks with identical numbers (hitbox r 13).
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
const ONLY = process.env.BLOCKS ? process.env.BLOCKS.split(',') : null;   // BLOCKS=K,M runs only those blocks (by their letter)
async function block(name, fn) { if (ONLY && ONLY.indexOf(name.split('.')[0]) < 0) return; try { await fn(); } catch (e) { check(name + ' (step threw)', false, String(e && e.message ? e.message : e).split('\n')[0]); } }
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
      G.enemies.forEach(e => { e.silent = true; e.inhaled = true; e.hp = 0; }); UroCrawl.step(1); G.bullets.length = 0; G.seeds.length = 0; G.turrets.length = 0;   // inhaled: the last weapon's stones leave no fragments for the basket to catch instead of its target
      G.weapons.length = 0; G.wIndex = 0; UroCrawl.giveWeapon(wid); G.swapT = 0;
      P.x = 300; P.y = 270; const dist = wid === 'scalpel' || wid === 'dropper' ? 50 : wid === 'roller' || wid === 'button' || wid === 'trilogy' ? 60 : wid === 'loop' ? 80 : 150;
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
  let b = await p.evaluate(() => { UroCrawl.step(10); const B = UroCrawl.state.boss; return { arms: B.arms.length, mul: B.body.dmgMul, intro: UroCrawl.state.introT }; });
  check('boss spawns shelled (25% damage) with 4 antler tines and an intro card', b.arms === 4 && b.mul === 0.25 && b.intro > 1);
  await shot(p, 'b-boss-intro');
  // the boss fights on while this block pokes at it, so the checks hold it still first: no attacks, no stun bonus in the numbers
  const calm = () => p.evaluate(() => { const B = UroCrawl.state.boss; for (const k in B.cd) B.cd[k] = 99; B.swarmT = 99; B.queue.length = 0; B.run = null; B.body.atk = null; delete B.body.st.stun; B.state = 'stalk'; B.stT = 0; UroCrawl.step(1); });
  await p.evaluate(() => UroCrawl.step(170)); await calm();
  b = await p.evaluate(() => { const B = UroCrawl.state.boss; const d = UroCrawl.dealDamage(B.body, 100, 'LITHO', {}); B.arms.forEach(a => { if (B.arms.filter(x => x.cracked).length < 2 && !a.cracked) { a.e.hp = 1; UroCrawl.dealDamage(a.e, 50, 'LITHO', {}); } }); UroCrawl.step(5); return { dealt: d, cracked: B.arms.filter(a => a.cracked).length, mul: B.body.dmgMul, inv: B.body.inv }; });
  check('phase 1: the shell holds the body to 25% until 2 tines break', Math.abs(b.dealt - 100 * 1.75 * 0.25) < 0.01 && b.cracked === 2 && b.mul === 1 && !b.inv, JSON.stringify(b));
  b = await p.evaluate(() => { const B = UroCrawl.state.boss; B.body.hp = B.body.maxHp * 0.65; UroCrawl.step(5); return { phase: B.phase, shield: B.body.shield, microbes: UroCrawl.state.enemies.filter(e => e.family === 'MICROBE').length, slime: UroCrawl.state.hazards.filter(h => h.kind === 'slime').length }; });
  check('phase 2: biofilm shield + swarm + slime', b.phase === 2 && b.shield > 0.9 && b.microbes > 0 && b.slime >= 4, JSON.stringify(b));
  await p.evaluate(() => UroCrawl.step(300)); await shot(p, 'b-boss-p2'); await calm();
  b = await p.evaluate(() => { const B = UroCrawl.state.boss; const dL = UroCrawl.dealDamage(B.body, 100, 'LITHO', {}); for (let i = 0; i < 30; i++) UroCrawl.dealDamage(B.body, 1, 'FLUID', { strip: 0.09 }); const stripped = B.body.shield <= 0; UroCrawl.state.enemies.forEach(e => { if (e.family === 'MICROBE') { e.silent = true; e.hp = 0; } }); UroCrawl.step(60); return { dL, stripped, after: B.body.shield }; });
  check('phase 2 forces a swap: LITHO blocked by the shield, FLUID strips it, no regen once the swarm is dead', b.dL < 20 && b.stripped && b.after <= 0.01, JSON.stringify(b));
  await p.evaluate(() => { const B = UroCrawl.state.boss; B.body.hp = B.body.maxHp * 0.32; UroCrawl.step(100); }); await calm();   // past the roar between phases
  b = await p.evaluate(() => { const B = UroCrawl.state.boss; const d = UroCrawl.dealDamage(B.body, 10, 'FLUID', {}); B.cd.spiral = 0; let n = 0; while (UroCrawl.state.bullets.length <= 10 && n < 600) { UroCrawl.step(1); n++; } return { phase: B.phase, core: B.body.coreExposed, d, bullets: UroCrawl.state.bullets.length, arms: B.arms.filter(a => a.cracked).length }; });
  check('phase 3: core exposed ×1.5, shell gone, bullet patterns', b.phase === 3 && b.core && Math.abs(b.d - 9) < 0.01 && b.bullets > 10 && b.arms === 4, JSON.stringify(b));
  await shot(p, 'b-boss-p3');
  await calm();
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
  await p.tap('#btnQuick'); await p.waitForTimeout(100); await p.tap('#btnHelpOk').catch(() => {}); await p.waitForTimeout(100);   // QUICK START: PLAY now lands in the Call Room (block R)
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
  await fr.click('#btnQuick'); await pe.waitForTimeout(100); await fr.click('#btnHelpOk').catch(() => {});   // QUICK START: PLAY now lands in the Call Room (block R)
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
          else if (G.overlay === 'mod') { out.reps = (out.reps || 0) + 1; document.getElementById('btnSkipPitch').click(); const c = document.querySelector('#modCards .card'); if (c) c.click(); else document.getElementById('btnModSkip').click(); }
          if (G.overlay === 'steward') { out.stewards = (out.stewards || 0) + 1; const s = document.querySelector('#stewardChoices .btn'); if (s) s.click(); }
          if (G.overlay === 'grade') { out.grades = (out.grades || 0) + 1; const g = document.querySelector('#gradeCards .card'); if (g) g.click(); else document.getElementById('btnGradeSkip').click(); }
          else if (G.overlay === 'weapon') { out.crates++; const slot = document.querySelector('#slotPick .btn'), c = document.querySelector('#weapCards .card'); if (slot) slot.click(); else if (c) c.click(); if (G.overlay) document.getElementById('btnWeapLeave').click(); }
          else if (G.overlay === 'shop') { const b = document.querySelector('#shopItems .btn:not(:disabled)'); if (b) b.click(); document.getElementById('btnShopLeave').click(); } }
        if (G.overlay) UroCrawl.hideScreens();
        if (plan.kind === 'boss') { UroCrawl.step(200); UroCrawl.skipRoom(); UroCrawl.step(300); out.won = G.won; break; }
        if (!pickDoor()) { UroCrawl.step(60); if (!pickDoor()) break; } UroCrawl.step(60);
      }
      out.weapons = G.weapons.length; out.boonsHeld = G.boons.length; out.mods = G.weapons.reduce((n, w) => n + w.modIds.length + (w.capstone ? 1 : 0), 0); return out;
    });
    check('seed ' + seed + ' plays 9 rooms to the win screen', log.rooms.length === 9 && log.won, 'kinds ' + log.kinds.join(',') + ' · altars ' + log.boons + ' · crates ' + log.crates + ' · reps ' + (log.reps || 0) + ' · stewards ' + (log.stewards || 0) + ' · held ' + log.weapons + 'w/' + log.boonsHeld + 'b/' + log.mods + 'm');
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
  check('?boss selects the boss (explicit names; ?boss=1 rolls one)', sel['?seed=1&boss=fournier'] === 'fournier' && sel['?seed=1&boss=staghorn'] === 'staghorn' && /staghorn|fournier|mibc/.test(sel['?seed=1&boss=1']), JSON.stringify(sel));
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
    document.getElementById('btnSkipPitch').click();   // the rep opens on a pitch now (block M covers it); skip to the cards
    const o = G.overlay, cards = document.querySelectorAll('#modCards .card:not(.sample)').length, title = document.getElementById('modTitle').textContent, ids = rep.offer.slice(), btn = document.getElementById('btnModReroll');
    const canReroll = !btn.disabled, label = btn.textContent, rvu0 = G.rvu; btn.click(); const spent = rvu0 - G.rvu, w2 = rep.weapon, ids2 = rep.offer.slice(), disabled = btn.disabled, label2 = btn.textContent, title2 = document.getElementById('modTitle').textContent;
    document.querySelector('#modCards .card:not(.sample)').click(); const closed = G.overlay, used = rep.used, holm = G.weapons[0].modIds.length;
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

// ───────── K. the Antibiotic Dropper ─────────
await block('K. dropper', async () => {
  const { p, errs } = await openJ('?seed=41&god=1&room=3&weapons=dropper,scalpel');
  let b = await p.evaluate(() => { UroCrawl.startRun(); UroCrawl.step(2); __prep(); const G = UroCrawl.state, P = UroCrawl.player(), W = UroCrawl.tables.WEAPONS, w = G.weapons[0];
    const def = W.dropper, order = UroCrawl.tables.WEAPONS && Object.keys(W);
    const far = __pin('pseudomonas', P.x + 120, P.y); __aim(P.x + 120, P.y); UroCrawl.input.mouseFire = true; UroCrawl.step(30); UroCrawl.input.mouseFire = false; const tooFar = G.texts.some(t => /TOO FAR/.test(t.text)), farDmg = far.maxHp - far.hp, drops0 = w.drops; G.texts.length = 0; __kill(far); UroCrawl.step(1);
    return { id: w.id, cls: def.cls, fam: def.famMult, unlock: def.unlock, inOrder: order.indexOf('dropper') >= 0, label: def.slotLabel(w), tooFar, farDmg, drops0, slot: G.weapons.length }; });
  check('?weapons=dropper loads the Antibiotic Dropper (FLUID, ×3 MICROBE / ×0.3 others, unlock PGY-2) into a slot; generic vial loaded', b.id === 'dropper' && b.cls === 'FLUID' && b.fam.MICROBE === 3 && b.fam.STONE === 0.3 && b.unlock === 2 && b.inOrder && b.label.text === 'GENERIC' && b.slot === 2, JSON.stringify(b.label));
  check('no enemy within ~50 px: the primary does nothing but show the TOO FAR hint', b.tooFar && b.farDmg === 0 && b.drops0 === 6);
  b = await p.evaluate(() => { const G = UroCrawl.state, P = UroCrawl.player(), w = G.weapons[0];
    const t = __pin('pseudomonas', P.x + 55, P.y); t.hp = t.maxHp = 2000; __aim(P.x + 55, P.y); UroCrawl.step(20); // shielded microbe, kept alive to read the numbers; let the hint cooldown lapse
    UroCrawl.input.keys.KeyD = true; UroCrawl.input.mouseFire = true; let squeeze = 0, sx = null, moved = false, hit = null, started = null; for (let i = 0; i < 40; i++) { UroCrawl.step(1); if (w.squeeze) { squeeze++; if (started === null) started = i + 1; if (sx === null) sx = Math.round(P.x); else if (Math.round(P.x) !== sx) moved = true; } if (hit === null && t.hp < t.maxHp) hit = i + 1; } UroCrawl.input.mouseFire = false; UroCrawl.input.keys.KeyD = false;
    const dmgText = G.texts.filter(x => x.sub === 'GENERIC').map(x => x.text);
    return { squeeze, stationary: !moved, hit, started, dmg: t.maxHp - t.hp, shield: t.shield, poison: !!t.st.poison, drops: w.drops, dmgText, res: G.dropRes.pseudomonas }; });
  check('fire = a ~0.3 s squeeze (stationary even with a movement key held), then one heavy drop', b.squeeze >= 17 && b.squeeze <= 20 && b.stationary && b.hit - b.started >= 16 && b.hit - b.started <= 20, JSON.stringify({ squeeze: b.squeeze, started: b.started, hit: b.hit }));
  check('the drop: 30 × 1.5 (generic vial vs MICROBE) × 3 = 135, strips the biofilm shield, poisons, costs one of 6 drops, teaches 10% resistance', b.dmgText[0] === '135' && b.shield === 0 && b.poison && b.drops === 5 && Math.abs(b.res - 0.1) < 1e-9, JSON.stringify({ text: b.dmgText, shield: b.shield, drops: b.drops, res: b.res }));
  b = await p.evaluate(() => { const G = UroCrawl.state, P = UroCrawl.player(), w = G.weapons[0]; const t = G.enemies.filter(e => e.id === 'pseudomonas' && !e.dead)[0]; G.texts.length = 0;
    const hits = [], tags = []; for (let k = 0; k < 2; k++) { G.texts.length = 0; UroCrawl.step(25); UroCrawl.input.mouseFire = true; for (let i = 0; i < 40 && !G.texts.some(x => /^RESISTANT/.test(x.sub || '')); i++) UroCrawl.step(1); UroCrawl.input.mouseFire = false; const tx = G.texts.filter(x => /^RESISTANT/.test(x.sub || ''))[0]; hits.push(tx ? +tx.text : -1); tags.push(tx ? tx.sub : null); }
    __kill(t); UroCrawl.step(1); const ec = __pin('ecoli', P.x + 40, P.y); UroCrawl.input.mouseFire = true; UroCrawl.step(40); UroCrawl.input.mouseFire = false; const ecDead = ec.dead, drops = w.drops;
    const st = __pin('com', P.x + 50, P.y); UroCrawl.input.mouseFire = true; const h = __firstHit(st, 40); UroCrawl.input.mouseFire = false;
    return { hits, res: G.dropRes.pseudomonas, tags, ecDead, drops, stone: h.dmg }; });
  // the generic vial also wears on the per-run meter (2% per drop): 30 × (1 + 0.5 × (1 − 0.5 × 0.02k)) × (1 − 0.1k) × 3 → 121 then 107
  check('per-room resistance: the 2nd and 3rd drops on the same microbe type land for 90% (121) and 80% (107), shown as RESISTANT tags; max 60%', b.hits[0] === 121 && b.hits[1] === 107 && Math.abs(b.res - 0.3) < 1e-9 && b.tags.join() === 'RESISTANT 10%,RESISTANT 20%', JSON.stringify({ hits: b.hits, res: b.res, tags: b.tags }));
  check('a swarm cell dies outright (one drop); a stone takes ×0.3 (30 × 0.6 × 0.3 = 5.4)', b.ecDead && b.drops === 2 && Math.abs(b.stone - 5.4) < 0.01, 'stone ' + b.stone + ', drops left ' + b.drops);
  b = await p.evaluate(() => { const G = UroCrawl.state, P = UroCrawl.player(), w = G.weapons[0]; G.enemies.forEach(__kill); UroCrawl.step(1); G.texts.length = 0;
    const ec = __pin('ecoli', P.x + 40, P.y); w.drops = 0; UroCrawl.input.mouseFire = true; UroCrawl.step(30); UroCrawl.input.mouseFire = false; const empty = G.texts.some(t => /EMPTY/.test(t.text)), alive = !ec.dead;
    G.pickups.push({ kind: 'vial', x: P.x, y: P.y, vx: 0, vy: 0, z: 0, vz: 0, t: 1, value: 1, magnet: false, bob: 0 }); UroCrawl.step(2); const afterVial = w.drops;
    w.drops = 2; G.cleared = false; __kill(ec); UroCrawl.step(2); const afterClear = w.drops, cleared = G.cleared, resKept = Object.keys(G.dropRes).length;
    return { empty, alive, afterVial, afterClear, cleared, resKept }; });
  check('empty: EMPTY hint and no drop; a vial pickup refills 3; the room clear refills to 6 (learned resistance stays until the next room)', b.empty && b.alive && b.afterVial === 3 && b.cleared && b.afterClear === 6 && b.resKept >= 1, JSON.stringify(b));
  b = await p.evaluate(() => { const G = UroCrawl.state, P = UroCrawl.player(), w = G.weapons[0], W = UroCrawl.tables.WEAPONS;
    UroCrawl.giveBoon('ceftriaxone'); const l1 = W.dropper.slotLabel(w), m1 = W.dropper.meter(w); const ec = UroCrawl.spawn('ecoli', 700, 150, { instant: true }), ps = UroCrawl.spawn('pseudomonas', 700, 250, { instant: true }), co = UroCrawl.spawn('com', 700, 350, { instant: true });
    const v = UroCrawl.dropperVial(w), mEc = v.mult(ec), mPs = v.mult(ps), mCo = v.mult(co);
    UroCrawl.giveBoon('vanco'); const auto = UroCrawl.dropperVial(w).id; UroCrawl.input.edges.alt = true; UroCrawl.step(1); const cycled = UroCrawl.dropperVial(w).id, l2 = W.dropper.slotLabel(w);
    UroCrawl.dropBoon('vanco'); UroCrawl.dropBoon('ceftriaxone'); const back = UroCrawl.dropperVial(w).id;
    return { l1, m1, mEc, mPs, mCo, auto, cycled, l2, back }; });
  check('the vial is the best held antibiotic, shown on the slot: Ceftriaxone ×1.35 vs E. coli, ×0.9 vs Pseudomonas, ×1 vs a stone', b.l1.text === 'CEFTRIAX' && b.l1.color === '#6fd3ff' && b.m1.color === '#6fd3ff' && Math.abs(b.mEc - 1.35) < 1e-9 && Math.abs(b.mPs - 0.9) < 1e-9 && b.mCo === 1, JSON.stringify({ mEc: b.mEc, mPs: b.mPs, mCo: b.mCo }));
  check('alt cycles the loaded vial between held antibiotics; dropping them falls back to the generic vial', b.auto === 'ceftriaxone' && b.cycled === 'vanco' && b.l2.text === 'VANCO' && b.back === 'generic', JSON.stringify({ auto: b.auto, cycled: b.cycled, back: b.back }));
  await p.waitForTimeout(250); await shot(p, 'k-dropper');
  errCheck('K', errs);
});

// ───────── L. antibiotic stewardship ─────────
await block('L. antibiotics', async () => {
  const { p, errs } = await openJ('?seed=42&god=1&room=4&weapons=scalpel,bovie');
  let b = await p.evaluate(() => { UroCrawl.startRun(); UroCrawl.step(2); __prep(); const G = UroCrawl.state, B = UroCrawl.tables.BOONS;
    const a = UroCrawl.giveBoon('ceftriaxone'), c = UroCrawl.giveBoon('vanco'), third = UroCrawl.giveBoon('piptazo'), blocked = UroCrawl.abxCapBlocks ? null : null;
    const cultures = UroCrawl.giveBoon('antibiogram'), fosfo = UroCrawl.giveBoon('fosfomycin'), forced = UroCrawl.giveBoon('piptazo', true), active = UroCrawl.activeAbx();
    UroCrawl.dropBoon('piptazo'); UroCrawl.dropBoon('antibiogram'); UroCrawl.dropBoon('fosfomycin');
    return { a, c, third, cultures, fosfo, forced, active, rates: [B.ceftriaxone.resRate, B.vanco.resRate, B.cipro.resRate, B.piptazo.resRate, B.meropenem.resRate], spectra: [B.ceftriaxone.spectrum, B.piptazo.spectrum] }; });
  check('two active antibiotics max: a third is refused (cultures / Fosfomycin are not capped; force bypasses); broad ones breed resistance twice as fast', b.a && b.c && b.third === false && b.cultures && b.fosfo && b.forced && b.active.length === 3 && b.rates.join() === '1,1,1.5,2,2' && b.spectra.join() === 'narrow,broad', JSON.stringify(b));
  b = await p.evaluate(() => { const G = UroCrawl.state, P = UroCrawl.player(); G.rewards.push({ kind: 'altar', x: 600, y: 300, patron: 'fleming', offer: ['piptazo', 'cipro'], rerolled: false }); const r = G.rewards[G.rewards.length - 1];
    P.x = r.x + 80; P.y = r.y; UroCrawl.step(3); P.x = r.x; P.y = r.y; UroCrawl.step(3); const o1 = G.overlay; document.querySelector('#boonCards .card').click(); const o2 = G.overlay, nBtn = document.querySelectorAll('#stewardChoices .btn').length, txt = document.getElementById('stewardSub').textContent;
    document.querySelectorAll('#stewardChoices .btn')[nBtn - 1].click(); const o3 = G.overlay, stillTwo = UroCrawl.activeAbx().join(); // SKIP → back to the altar
    document.querySelector('#boonCards .card').click(); document.querySelector('#stewardChoices .btn').click(); const o4 = G.overlay, after = UroCrawl.activeAbx(), used = r.used;
    return { o1, o2, nBtn, txt, o3, stillTwo, o4, after, used }; });
  check('taking a third antibiotic at an altar opens the stewardship prompt: STOP one of two, or SKIP (back to the altar)', b.o1 === 'boon' && b.o2 === 'steward' && b.nBtn === 3 && /Two antibiotics/.test(b.txt) && b.o3 === 'boon' && b.stillTwo === 'ceftriaxone,vanco', JSON.stringify({ o2: b.o2, nBtn: b.nBtn, o3: b.o3 }));
  check('STOP Ceftriaxone → start Pip-Tazo: still two active, altar used', b.o4 === null && b.after.join() === 'vanco,piptazo' && b.used, b.after.join());
  b = await p.evaluate(() => { const G = UroCrawl.state, P = UroCrawl.player(); UroCrawl.dropBoon('piptazo'); UroCrawl.dropBoon('vanco'); UroCrawl.giveBoon('ceftriaxone'); G.abxRes = {};
    const ec0 = UroCrawl.spawn('ecoli', 700, 150, { instant: true }); const bonus0 = UroCrawl.abxBonus('ceftriaxone', ec0), d0 = UroCrawl.dealDamage(ec0, 10, 'CUT', {});
    for (let i = 0; i < 10; i++) { const e = UroCrawl.spawn('ecoli', 700, 150 + i, { instant: true }); e.hp = 1; UroCrawl.dealDamage(e, 50, 'CUT', {}); } const res10 = UroCrawl.abxRes('ceftriaxone'), bonus10 = UroCrawl.abxBonus('ceftriaxone', ec0);
    UroCrawl.step(1); G.abxRes.ceftriaxone = 1; const ecF = UroCrawl.spawn('ecoli', 700, 170, { instant: true }); const bonusFull = UroCrawl.abxBonus('ceftriaxone', ecF), dFull = UroCrawl.dealDamage(ecF, 10, 'CUT', {});
    G.abxRes = {}; UroCrawl.dropBoon('ceftriaxone'); UroCrawl.giveBoon('piptazo'); for (let i = 0; i < 10; i++) { const e = UroCrawl.spawn('ecoli', 700, 200 + i, { instant: true }); e.hp = 1; UroCrawl.dealDamage(e, 50, 'CUT', {}); } const resBroad = UroCrawl.abxRes('piptazo'); UroCrawl.dropBoon('piptazo'); G.abxRes = {};
    return { bonus0, d0, res10, bonus10, bonusFull, dFull, resBroad }; });
  check('per-run resistance: 10 covered kills = 20% (Ceftriaxone), bonus 1.35 → 1.315; at 100% the bonus is halved (1.175, so 10 × 0.8 × 1.175 = 9.4)', Math.abs(b.bonus0 - 1.35) < 1e-9 && Math.abs(b.d0 - 10.8) < 0.01 && Math.abs(b.res10 - 0.2) < 1e-9 && Math.abs(b.bonus10 - 1.315) < 1e-9 && Math.abs(b.bonusFull - 1.175) < 1e-9 && Math.abs(b.dFull - 9.4) < 0.01, JSON.stringify(b));
  check('broad-spectrum Pip-Tazo breeds resistance twice as fast: 10 kills = 40%', Math.abs(b.resBroad - 0.4) < 1e-9, String(b.resBroad));
  b = await p.evaluate(() => { const G = UroCrawl.state, E = UroCrawl.tables.ENEMIES, order = UroCrawl.tables.ENEMIES && Object.keys(E);
    const mk = id => UroCrawl.spawn(id, 600 + Math.random() * 100, 200 + Math.random() * 100, { instant: true });
    const esbl = mk('esbl'), vre = mk('vre'), cre = mk('cre'), ec = mk('ecoli'), kleb = mk('klebsiella');
    const out = { defs: ['esbl', 'vre', 'cre', 'cdiff'].map(id => !!E[id]), rooms: [E.esbl.minRoom, E.vre.minRoom, E.cre.minRoom], costs: [E.esbl.cost, E.vre.cost, E.cre.cost, E.cdiff.cost], facts: [/ESBL/.test(E.esbl.fact), /VRE|vancomycin/i.test(E.vre.fact), /Carbapenem/i.test(E.cre.fact), /stewardship/i.test(E.cdiff.fact), /ESBL/.test(E.klebsiella.fact)],
      cef: [UroCrawl.abxBonus('ceftriaxone', esbl), UroCrawl.abxBonus('ceftriaxone', ec)], van: UroCrawl.abxBonus('vanco', vre), mero: [UroCrawl.abxBonus('meropenem', cre), UroCrawl.abxBonus('meropenem', kleb)], pip: UroCrawl.abxBonus('piptazo', cre), hp: [esbl.maxHp, ec.maxHp], badge: typeof E.esbl.draw === 'function' };
    return out; });
  check('resistant strains exist for late rooms (5+) with facts; Klebsiella is in the bestiary: ESBL ignores Ceftriaxone (1.0 vs 1.35), VRE ignores Vancomycin, CRE ignores Meropenem (1.0 vs 1.45) and halves Pip-Tazo (1.125)', b.defs.every(Boolean) && b.rooms.join() === '5,5,5' && b.costs.join() === '8,7,7,0' && b.facts.every(Boolean) && b.cef[0] === 1 && Math.abs(b.cef[1] - 1.35) < 1e-9 && b.van === 1 && b.mero[0] === 1 && Math.abs(b.mero[1] - 1.45) < 1e-9 && Math.abs(b.pip - 1.125) < 1e-9 && b.hp[0] > b.hp[1], JSON.stringify(b));
  await p.waitForTimeout(250); await shot(p, 'l-strains');
  b = await p.evaluate(() => { const G = UroCrawl.state, P = UroCrawl.player(); G.enemies.forEach(__kill); UroCrawl.step(1); UroCrawl.giveBoon('piptazo'); UroCrawl.skipRoom(); UroCrawl.step(5);
    G.collateral = 'cdiff'; const d = G.doors[0]; P.x = d.x - 20; P.y = d.y + d.h / 2; UroCrawl.step(80); const pods = G.enemies.filter(e => e.id === 'cdiff').length, banner = G.banner && G.banner.text;
    UroCrawl.step(60); const pod = G.enemies.filter(e => e.id === 'cdiff')[0]; pod.hp = 1; UroCrawl.dealDamage(pod, 10, 'ENERGY', {}); UroCrawl.step(1); const toxin = G.hazards.filter(h => h.kind === 'toxin').length;
    G.enemies.forEach(__kill); UroCrawl.step(1); UroCrawl.skipRoom(); UroCrawl.step(5); G.collateral = 'candida'; const d2 = G.doors[0]; P.x = d2.x - 20; P.y = d2.y + d2.h / 2; UroCrawl.step(80);   // force the Candida variant after the clear (the clear itself rolls the 35%)
    const cand = G.enemies.filter(e => e.id === 'candida').length, buds = G.enemies.filter(e => e.id === 'bud').length;
    UroCrawl.dropBoon('piptazo'); UroCrawl.giveBoon('ceftriaxone'); G.enemies.forEach(__kill); UroCrawl.step(1); let rolled = 0; for (let k = 0; k < 3; k++) { G.cleared = false; G.collateral = null; UroCrawl.skipRoom(); if (G.collateral) rolled++; }
    return { pods, banner, toxin, cand, buds, stat: G.stats.collateral, rolled }; });
  check('collateral: the room after a Pip-Tazo/Meropenem run grows 3 C. difficile pods (toxin cloud on death) or a Candida colony, with a banner; narrow antibiotics never roll it', b.pods === 3 && b.banner === 'COLLATERAL DAMAGE' && b.toxin >= 1 && b.cand === 1 && b.buds === 2 && b.stat === 2 && b.rolled === 0, JSON.stringify(b));
  b = await p.evaluate(() => { const G = UroCrawl.state, P = UroCrawl.player(); const plan = UroCrawl.state.room; let hits = 0; for (let i = 0; i < 400; i++) { if (UroCrawl.genDoorOptions({ index: 3 }).indexOf('culture') >= 0) hits++; } const door = !!UroCrawl.tables.DOOR_TYPES.culture;
    G.enemies.forEach(__kill); UroCrawl.step(1); G.pickups.length = 0; G.pickups.push({ kind: 'culture', x: P.x, y: P.y, vx: 0, vy: 0, z: 0, vz: 0, t: 1, value: 1, magnet: false, bob: 0 }); UroCrawl.step(2); const pending = !!(G.culture && G.culture.pending);
    UroCrawl.skipRoom(); UroCrawl.step(5); const d = G.doors[0]; P.x = d.x - 20; P.y = d.y + d.h / 2; UroCrawl.step(80); const room = G.roomIndex, cul = G.culture, banner = G.banner && G.banner.text, sub = G.banner && G.banner.sub;
    UroCrawl.step(100); const revealed = G.enemies.filter(e => e.family === 'MICROBE' && !e.dead).every(e => !!e.st.reveal), nMic = G.enemies.filter(e => e.family === 'MICROBE' && !e.dead).length;
    return { hits, door, pending, room, cul, banner, sub, revealed, nMic }; });
  check('Culture & Sensitivity: a rare door reward (room 3–6, once) whose pickup reveals the next room\'s microbes and their resistances', b.hits > 0 && b.hits < 120 && b.door && b.pending && b.cul && !b.cul.pending && b.cul.room === b.room && (b.cul.microbes.length ? (b.banner === 'CULTURE RESULT' && /×/.test(b.sub) && (b.nMic === 0 || b.revealed)) : b.banner === 'CULTURE: NO GROWTH'), JSON.stringify({ hits: b.hits, banner: b.banner, sub: b.sub, revealed: b.revealed, nMic: b.nMic }));
  b = await p.evaluate(() => { const G = UroCrawl.state, P = UroCrawl.player(); G.enemies.forEach(__kill); UroCrawl.step(1);
    const setup = () => { G.cleared = false; G.culture = { pending: false, room: G.roomIndex, microbes: ['ecoli', 'pseudomonas'] }; G.pickups.length = 0; };
    setup(); UroCrawl.skipRoom(); const coinsNarrow = G.pickups.filter(x => x.kind === 'coin').length, bannerN = G.banner && G.banner.text, de1 = G.stats.deesc || 0;   // Ceftriaxone (narrow, covers E. coli) only
    UroCrawl.giveBoon('piptazo', true); setup(); UroCrawl.skipRoom(); const coinsBroad = G.pickups.filter(x => x.kind === 'coin').length, de2 = G.stats.deesc || 0; UroCrawl.dropBoon('piptazo');
    UroCrawl.dropBoon('ceftriaxone'); UroCrawl.giveBoon('vanco'); setup(); UroCrawl.skipRoom(); const coinsMismatch = G.pickups.filter(x => x.kind === 'coin').length, de3 = G.stats.deesc || 0;
    return { coinsNarrow, bannerN, de1, coinsBroad, de2, coinsMismatch, de3, base: 3 + G.roomIndex }; });
  check('De-escalation: clearing the cultured room on a matching narrow antibiotic (no broad one running) pays +15 coins; broad-spectrum or a non-matching narrow one does not', b.coinsNarrow === b.base + 15 && b.bannerN === 'DE-ESCALATION' && b.de1 === 1 && b.coinsBroad === b.base && b.de2 === 1 && b.coinsMismatch === b.base && b.de3 === 1, JSON.stringify(b));
  errCheck('L', errs);
});

// ───────── M. reps cast, patron altars, Fournier ─────────
await block('M. reps + patrons', async () => {
  const { p, errs } = await openJ('?seed=43&god=1&room=3&weapons=holmium,scalpel');
  let b = await p.evaluate(() => { const R = UroCrawl.tables.REPS, PT = UroCrawl.tables.PATRONS, B = UroCrawl.tables.BOONS, order = Object.keys(PT);
    const pooled = [], dup = []; order.forEach(k => PT[k].pool.forEach(id => { if (pooled.indexOf(id) >= 0) dup.push(id); pooled.push(id); if (!B[id]) dup.push('missing:' + id); }));
    const missing = Object.keys(B).filter(id => pooled.indexOf(id) < 0);
    return { reps: R.length, pitches: R.map(r => r.pitches.length), companies: R.map(r => r.company), repLooks: R.every(r => r.look && r.name && r.title), patrons: order, dup, missing, glyphs: order.map(k => PT[k].glyph), pools: { civ: PT.civiale.pool.length, young: PT.young.pool.length, bovie: PT.bovie.pool.length, foley: PT.foley.pool.length, hug: PT.huggins.pool.join(), gle: PT.gleason.pool.join(), nitze: PT.nitze.pool.join(), flem: PT.fleming.pool.join() }, guest: PT.fleming.guest === true, rare: PT.gleason.rare === true, newBoons: ['smokevac', 'bipolar', 'cbi', 'cystoscope', 'grading'].map(id => !!B[id]) }; });
  check('REPS: a cast of 4 from invented companies, each with ≥ 6 pitches and a caricature spec', b.reps === 4 && b.pitches.every(n => n >= 6) && b.companies.join() === 'Lumenex Surgical,StoneWorks Medical,OmniCautery Systems,FluidLogic Devices' && b.repLooks, JSON.stringify(b.pitches));
  check('PATRONS: Civiale / Young / Bovie / Foley / Huggins / Gleason / Nitze / Fleming (guest) / Wilms (the Peds Wing, block S); every boon sits in exactly one pool; Gleason only has Grading', b.patrons.join() === 'civiale,young,bovie,foley,huggins,gleason,nitze,fleming,wilms' && b.dup.length === 0 && b.missing.length === 0 && b.pools.gle === 'grading' && /cisplatin/.test(b.pools.hug) && /bep/.test(b.pools.hug) && b.pools.flem.split(',').length === 7 && b.pools.nitze === 'coldlight,digiscope,cystoscope' && b.guest && b.rare && b.newBoons.every(Boolean) && b.glyphs.join() === 'diamond,tri,bolt,drop,medal,grade,eye,petri,kidney', JSON.stringify({ dup: b.dup, missing: b.missing }));
  b = await p.evaluate(() => { UroCrawl.startRun(); UroCrawl.step(2); const G = UroCrawl.state; __prep(); const doors = G.doors.map(d => d.type + (d.patron ? ':' + d.patron : '')), boonDoors = G.doors.filter(d => d.type === 'boon');
    let gle = 0; for (let i = 0; i < 100; i++) if (UroCrawl.pickPatron() === 'gleason') gle++; UroCrawl.giveBoon('cisplatin'); const poolG = UroCrawl.patronPool('gleason'); let gle2 = 0; for (let i = 0; i < 300; i++) if (UroCrawl.pickPatron() === 'gleason') gle2++;
    return { doors, allHave: boonDoors.every(d => !!d.patron && !!UroCrawl.tables.PATRONS[d.patron]), gle, poolG, gle2 }; });
  check('boon doors are owned by a patron (plaque = patron glyph/colour); Gleason only appears once a boon can be graded, and rarely', b.allHave && b.gle === 0 && b.poolG.join() === 'grading' && b.gle2 > 0 && b.gle2 < 40, JSON.stringify({ doors: b.doors, gle: b.gle, gle2: b.gle2 }));
  b = await p.evaluate(() => { const G = UroCrawl.state, P = UroCrawl.player(); G.rewards.push({ kind: 'altar', x: 600, y: 300, patron: 'huggins' }); const r = G.rewards[G.rewards.length - 1]; G.favor = {};
    P.x = r.x + 80; P.y = r.y; UroCrawl.step(3); P.x = r.x; P.y = r.y; UroCrawl.step(3);
    const o = G.overlay, head = document.getElementById('patronHead').style.display !== 'none', name = document.getElementById('patronName').textContent, title = document.getElementById('boonTitle').textContent, greet = document.getElementById('patronGreet').textContent, offer = r.offer.slice(), pool = UroCrawl.tables.PATRONS.huggins.pool;
    document.querySelector('#boonCards .card').click(); const favor = G.favor.huggins, closed = G.overlay, got = G.boons.slice(-1)[0];
    const share = f => { G.favor.huggins = f; let n = 0; for (let i = 0; i < 300; i++) { const id = UroCrawl.rollBoons(1, null, 'huggins')[0]; const rar = UroCrawl.tables.BOONS[id].rarity; if (rar === 'rare' || rar === 'epic') n++; } return n; }; UroCrawl.meta.xp = 5000; const s0 = share(0), s5 = share(5); G.favor.huggins = favor;
    return { o, head, name, title, greet, offer, inPool: offer.every(id => pool.indexOf(id) >= 0), favor, closed, got, s0, s5 }; });
  check('a patron altar: caricature header, greeting, boons only from that patron\'s pool; taking one earns favor', b.o === 'boon' && b.head && b.name === 'Huggins' && /Huggins/.test(b.title) && /“/.test(b.greet) && b.offer.length === 3 && b.inPool && b.favor === 1 && b.closed === null && b.offer.indexOf(b.got) >= 0, JSON.stringify({ offer: b.offer, got: b.got }));
  check('patron favor upgrades that patron\'s next offers: rare/epic share rises with favor (0 → 5)', b.s5 > b.s0 * 1.6 && b.s0 > 10, b.s0 + ' → ' + b.s5 + ' of 300');
  b = await p.evaluate(() => { const G = UroCrawl.state, P = UroCrawl.player(); G.rewards.push({ kind: 'altar', x: 700, y: 300, patron: 'gleason' }); const r = G.rewards[G.rewards.length - 1]; G.boonTier = {};
    P.x = r.x + 80; P.y = r.y; UroCrawl.step(3); P.x = r.x; P.y = r.y; UroCrawl.step(3); const offer = r.offer.slice(); document.querySelector('#boonCards .card').click(); const o = G.overlay, cards = document.querySelectorAll('#gradeCards .card').length, gradeableN = G.boons.filter(id => UroCrawl.tables.BOONS[id].dmg || UroCrawl.tables.BOONS[id].strip).length;
    const sem0 = UroCrawl.spawn('seminoma', 700, 150, { instant: true }); const d0 = UroCrawl.dealDamage(sem0, 10, 'CUT', {});
    document.querySelector('#gradeCards .card').click(); const tier = G.boonTier.cisplatin, closed = G.overlay, held = G.boons.indexOf('grading') < 0, used = r.used;   // cisplatin was the first boon held → the first card
    const sem1 = UroCrawl.spawn('seminoma', 700, 150, { instant: true }); const d1 = UroCrawl.dealDamage(sem1, 10, 'CUT', {});
    const legacy = { kind: 'altar', x: 500, y: 400 }; G.rewards.push(legacy); P.x = 580; P.y = 400; UroCrawl.step(3); P.x = 500; P.y = 400; UroCrawl.step(3); const lo = G.overlay, lhead = document.getElementById('patronHead').style.display, loffer = legacy.offer.slice(); document.getElementById('btnBoonSkip').click();
    return { offer, o, cards, gradeableN, d0, tier, closed, held, used, d1, lo, lhead, loffer }; });
  check('Gleason offers Grading: a chooser of the held gradeable boons, Cisplatin → Grade 2 (×2 vs Seminoma becomes ×2.5: 30 → 37.5); Grading itself is not carried', b.offer.join() === 'grading' && b.o === 'grade' && b.cards === b.gradeableN && b.cards >= 1 && Math.abs(b.d0 - 30) < 0.01 && b.tier === 2 && b.closed === null && b.held && b.used && Math.abs(b.d1 - 37.5) < 0.01, JSON.stringify({ offer: b.offer, o: b.o, cards: b.cards, gradeableN: b.gradeableN, d0: b.d0, d1: b.d1, tier: b.tier, closed: b.closed, held: b.held, used: b.used }));
  check('the old generic altar still works (no patron header, 3 boons from the whole pool, never Grading)', b.lo === 'boon' && b.lhead === 'none' && b.loffer.length === 3 && b.loffer.indexOf('grading') < 0, b.loffer.join());
  b = await p.evaluate(() => { const G = UroCrawl.state, P = UroCrawl.player(); G.enemies.forEach(__kill); UroCrawl.step(1); const clot = UroCrawl.spawn('clot', 700, 300, { instant: true }), bph = UroCrawl.spawn('bph', 700, 400, { instant: true });
    const f0 = UroCrawl.dealDamage(clot, 10, 'FLUID', {}); UroCrawl.giveBoon('cbi'); const f1 = UroCrawl.dealDamage(clot, 10, 'FLUID', {});
    UroCrawl.dealDamage(bph, 5, 'CUT', { status: { bleed: [3, 4] } }); const bleeding = !!bph.st.bleed; const hp0 = bph.hp; UroCrawl.giveBoon('bipolar'); UroCrawl.dealDamage(bph, 1, 'ENERGY', {}); const caut = !bph.st.bleed, bonus = hp0 - bph.hp - 1 * 1.5 * 1.15; // 1 × 1.5 (ENERGY×BENIGN) × 1.15 (bph tweak) then the cauterize bonus 12 × 1.5 × 1.5 = 27
    G.hazards.push({ kind: 'burn', x: P.x, y: P.y, r: 60, t: Infinity, max: Infinity, ph: 0 }); P.burn = 0; UroCrawl.step(2); const burnNo = P.burn; UroCrawl.giveBoon('smokevac'); P.burn = 0; UroCrawl.step(2); const burnYes = P.burn; G.hazards.length = 0;
    UroCrawl.giveBoon('cystoscope'); const e = UroCrawl.spawn('com', 700, 200, { instant: true }); const reveal = !!e.st.reveal;
    return { f0, f1, bleeding, caut, bonus, burnNo, burnYes, reveal }; });
  check('new patron boons work: CBI +15% FLUID, Bipolar cauterizes on any ENERGY hit with a ×1.5 bonus (27), Smoke Evacuator stops burn-zone damage, Cystoscopy reveals spawns', Math.abs(b.f0 - 17.5) < 0.01 && Math.abs(b.f1 - 20.125) < 0.01 && b.bleeding && b.caut && Math.abs(b.bonus - 27) < 0.05 && b.burnNo > 0 && b.burnYes === 0 && b.reveal, JSON.stringify(b));
  b = await p.evaluate(() => { const G = UroCrawl.state, P = UroCrawl.player(); G.rewards.push({ kind: 'rep', x: 600, y: 420, weapon: 'holmium' }); const r = G.rewards[G.rewards.length - 1]; G.pens = 0;
    P.x = r.x + 80; P.y = r.y; UroCrawl.step(3); P.x = r.x; P.y = r.y; UroCrawl.step(3);
    const o = G.overlay, hidden = document.getElementById('modChoice').style.display === 'none', pitchRow = document.getElementById('pitchRow').style.display !== 'none', talk = document.getElementById('modTalk').textContent, rep = r.rep, name = document.getElementById('repName').textContent, co = document.getElementById('repCo').textContent;
    const repDef = UroCrawl.tables.REPS.filter(x => x.id === rep)[0];
    return { o, hidden, pitchRow, talk, rep, name, co, pitchOk: repDef && repDef.pitches.some(pt => talk.indexOf(pt) === 0), closer: /I’ll just leave this with you\.$/.test(talk), nameOk: repDef && name === repDef.name && co.indexOf(repDef.company) === 0 }; });
  check('the rep screen opens on the pitch: one of the cast, name + company, a 2–3 line pitch ending "I’ll just leave this with you.", cards hidden, SKIP PITCH visible', b.o === 'mod' && b.hidden && b.pitchRow && b.pitchOk && b.closer && b.nameOk, JSON.stringify({ rep: b.rep, name: b.name, talk: b.talk.slice(0, 60) }));
  b = await p.evaluate(() => { const G = UroCrawl.state, P = UroCrawl.player(), r = G.rewards[G.rewards.length - 1], w = G.weapons[0], sw = G.weapons[1];
    const fresh = UroCrawl.rollModOffer(sw, 1, null, true); r.sample = { id: fresh[0], drawback: 'hp', taken: false }; // force a free sample (a Holmium with 3 mods left has no 4th, so the case falls back to the Scalpel's)
    document.getElementById('btnSkipPitch').click(); const shown = document.getElementById('modChoice').style.display !== 'none', pitchGone = document.getElementById('pitchRow').style.display === 'none', cards = document.querySelectorAll('#modCards .card').length, sample = document.querySelectorAll('#modCards .card.sample').length;
    document.getElementById('btnFreePen').click(); const pens = G.pens, penTxt = document.getElementById('btnFreePen').textContent, swag = document.getElementById('modTalk').textContent;
    const hp0 = P.maxHp; document.querySelector('#modCards .card.sample').click(); const gotSample = sw.modIds.indexOf(r.sample.id) >= 0, hp1 = P.maxHp, sampleLeft = document.querySelectorAll('#modCards .card.sample').length, cardsLeft = document.querySelectorAll('#modCards .card').length, stillOpen = G.overlay;
    document.querySelector('#modCards .card').click(); const closed = G.overlay, mods = w.modIds.length, used = r.used;
    UroCrawl.skipRoom(); UroCrawl.step(5); const d = G.doors[0]; P.x = d.x - 20; P.y = d.y + d.h / 2; UroCrawl.step(80); const hp2 = P.maxHp;
    return { shown, pitchGone, cards, sample, pens, penTxt, swag, gotSample, hp0, hp1, sampleLeft, cardsLeft, stillOpen, closed, mods, used, hp2 }; });
  check('SKIP PITCH jumps to the mod choice; the free pen does nothing but count; a free sample installs an extra mod (here for the Scalpel) for −10% max HP this room, restored next room', b.shown && b.pitchGone && b.cards === 4 && b.sample === 1 && b.pens === 1 && /FREE SWAG: 1/.test(b.penTxt) && /does nothing/.test(b.swag) && b.gotSample && b.hp1 === b.hp0 - Math.round(b.hp0 * 0.1) && b.sampleLeft === 0 && b.cardsLeft === 3 && b.stillOpen === 'mod' && b.closed === null && b.mods === 1 && b.used && b.hp2 === b.hp0, JSON.stringify({ cards: b.cards, hp: [b.hp0, b.hp1, b.hp2], mods: b.mods, got: b.gotSample }));
  b = await p.evaluate(() => { const G = UroCrawl.state, P = UroCrawl.player(); G.enemies.forEach(__kill); UroCrawl.step(1); G.rewards.push({ kind: 'rep', x: 600, y: 420, weapon: 'scalpel' }); const r = G.rewards[G.rewards.length - 1]; P.x = r.x + 80; P.y = r.y; UroCrawl.step(3); P.x = r.x; P.y = r.y; UroCrawl.step(3); return { o: G.overlay, hidden: document.getElementById('modChoice').style.display === 'none', sampled: G.rewards.filter(x => x.kind === 'rep' && x.sample).length }; });
  await p.waitForTimeout(4400);
  const auto = await p.evaluate(() => ({ shown: document.getElementById('modChoice').style.display !== 'none', o: UroCrawl.state.overlay }));
  check('an unskipped pitch advances to the mod choice by itself after ~4 s', b.o === 'mod' && b.hidden && auto.shown && auto.o === 'mod');
  await shot(p, 'm-rep-screen');
  await p.evaluate(() => document.getElementById('btnModSkip').click());
  await p.waitForTimeout(200); await shot(p, 'm-altars');
  const { p: pf, errs: errsF } = await open('?seed=44&god=1&boss=fournier&weapons=scalpel,roller');
  b = await pf.evaluate(() => { UroCrawl.startRun(); UroCrawl.step(5); const B = UroCrawl.state.boss, E = UroCrawl.tables.ENEMIES; return { name: B.name, sub: B.sub, fact: E.fournier.fact, defName: E.fournier.name }; });
  check('the Fournier boss card reads FOURNIER; the bestiary names Jean Alfred Fournier (and says the boss is a cartoon of the disease)', b.name === 'FOURNIER' && /Fournier's gangrene/.test(b.sub) && /Jean Alfred Fournier/.test(b.fact) && /1883/.test(b.fact) && b.defName === 'Fournier', JSON.stringify({ name: b.name, sub: b.sub }));
  await pf.waitForTimeout(300); await shot(pf, 'm-fournier');
  await pf.evaluate(() => { UroCrawl.hideScreens(); UroCrawl.state.running = false; document.getElementById('btnBestiary').click(); });
  const best = await pf.evaluate(() => { const E = UroCrawl.tables.ENEMIES; return { entries: document.querySelectorAll('#bgrid .bentry').length, visible: Object.keys(E).filter(id => !E[id].hidden).length, overlay: UroCrawl.state.overlay }; });
  check('the bestiary renders every non-hidden enemy, the new strains and the C. difficile pod included', best.overlay === 'bestiary' && best.entries === best.visible && best.entries >= 33, best.entries + ' entries / ' + best.visible + ' visible defs');
  errCheck('M', errs.concat(errsF));
});

// ───────── N. look and feel: family rims, the 3/4 room, ground slams + stagger, the scalpel lunge ─────────
await block('N. look and feel', async () => {
  const { p, errs } = await openJ('?seed=61&room=2&weapons=scalpel,holmium');   // no god mode: damage has to register
  let b = await p.evaluate(() => { const F = UroCrawl.tables.FAMILIES, hue = h => { const n = parseInt(h.slice(1), 16), r = n >> 16 & 255, g = n >> 8 & 255, bl = n & 255; return r > g && r > bl ? (g > 170 ? 'yellow' : bl > 180 ? 'violet' : 'red') : g > r && g > bl ? 'green' : bl > 220 && r > 150 ? 'violet' : 'blue'; };
    return { hues: ['STONE', 'MICROBE', 'MALIGNANT', 'BENIGN', 'CLOT'].map(k => hue(F[k].color)), title: document.title, h1: document.querySelector('#ov-title h1').textContent, t: UroCrawl.tuning }; });
  check('family rim colours: blue stones, green microbes, red malignant, yellow benign, violet clots', b.hues.join() === 'blue,green,red,yellow,violet', b.hues.join());
  check('the game is titled Path of Pathology', b.title === 'Path of Pathology' && /PATH OF/.test(b.h1) && /PATHOLOGY/.test(b.h1), b.title + ' / ' + b.h1);
  await p.evaluate(() => { UroCrawl.startRun(); UroCrawl.step(2); __prep(); });
  // one BPH slam with the surgeon at `dx` px; opts: roll through the landing
  const slam = (dx, roll) => p.evaluate(({ dx, roll }) => { const G = UroCrawl.state, P = UroCrawl.player(); __prep(); P.hp = P.maxHp = 100; P.stag = 0; P.inv = 0; P.roll = 0; P.rollCd = 0; G.shake = 0; G.punch = 0; G.flash = 0; UroCrawl.selectWeapon(0); G.swapT = 0;
    const e = UroCrawl.spawn('bph', 620, 270, { instant: true }); e.dripT = 999; e.timer = 0; P.x = 620 - dx; P.y = 270; __aim(P.x - 100, P.y);
    UroCrawl.step(2); const tele = G.teles.filter(t => t.kind === 'circle')[0], jump = e.atk ? e.atk.jump : 0; let lift = 0, steps = 0;
    while (e.atk && steps < 80) { lift = Math.max(lift, UroCrawl.enemyLift(e)); if (roll && e.atk.t <= 0.07 && P.roll <= 0 && P.rollCd <= 0) { UroCrawl.input.keys.KeyA = true; UroCrawl.input.edges.roll = true; } UroCrawl.step(1); steps++; }
    UroCrawl.input.keys = {}; const out = { hp: P.hp, stag: P.stag, shake: G.shake, punch: G.punch, flash: G.flash, r: tele && tele.r, r2: tele && tele.r2, jump, lift: Math.round(lift), steps, landed: UroCrawl.enemyLift(e) };
    // while staggered: slowed, and the scalpel will not swing
    const x0 = P.x; UroCrawl.input.keys.KeyA = true; UroCrawl.input.mouseFire = true; UroCrawl.step(6); out.moved = x0 - P.x; out.cd = G.weapons[0].cd; UroCrawl.input.keys = {}; UroCrawl.input.mouseFire = false;
    UroCrawl.step(60); out.stagAfter = P.stag; e.silent = true; e.inhaled = true; e.hp = 0; UroCrawl.step(1); return out; }, { dx, roll });
  const T = b.t, far = await slam(330), trem = await slam(T.BPH_SLAM + 13 + 30), hit = await slam(80), dodge = await slam(T.BPH_SLAM + 13 + 30, true);
  check('Gentle Giant slam is telegraphed as a jump: a red disc (damage) inside a dashed tremor ring, 0.7 s, and it is airborne on the way', far.r === T.BPH_SLAM && far.r2 === T.BPH_SLAM + T.BPH_TREMOR && far.jump > 20 && far.lift > 20 && far.landed === 0 && far.steps >= 40 && far.steps <= 44, JSON.stringify({ r: far.r, r2: far.r2, jump: far.jump, lift: far.lift, steps: far.steps }));
  check('a slam across the room: no damage, no stagger, no hit flash, no zoom punch, barely a shake', far.hp === 100 && !(far.stag > 0) && far.flash === 0 && far.punch === 0 && far.shake <= 1.5, JSON.stringify({ hp: far.hp, shake: +far.shake.toFixed(2), flash: far.flash, punch: far.punch }));
  check('inside the tremor ring: no damage and no hit flash, but STAGGERED (slowed to 40%, cannot attack) for under a second', trem.hp === 100 && trem.stag > 0.3 && trem.flash === 0 && trem.shake <= 2.5 && trem.moved > 3 && trem.moved < 190 / 60 * 6 * 0.5 && trem.cd === 0 && !(trem.stagAfter > 0), JSON.stringify({ hp: trem.hp, stag: +trem.stag.toFixed(2), moved: +trem.moved.toFixed(1), cd: trem.cd, shake: trem.shake }));
  check('inside the red disc: 15 damage, the hit flash, and a longer stagger', hit.hp === 85 && hit.stag > 0.5 && hit.flash > 0 && hit.shake >= 5, JSON.stringify({ hp: hit.hp, stag: +hit.stag.toFixed(2), flash: hit.flash, shake: hit.shake }));
  check('rolling through the landing shrugs off the stagger', dodge.hp === 100 && !(dodge.stag > 0), JSON.stringify({ hp: dodge.hp, stag: dodge.stag }));
  // scalpel lunge
  b = await p.evaluate(() => { const G = UroCrawl.state, P = UroCrawl.player(), T = UroCrawl.tuning; __prep(); P.hp = 100; P.inv = 0; P.stag = 0; UroCrawl.selectWeapon(0); G.swapT = 0; const w = G.weapons[0]; w.cd2 = 0;
    const D = (a, c) => Math.hypot(a.x - c.x, a.y - c.y);
    // 1. into something that survives: stop at arm's length, stagger it, keep a beat of i-frames
    const big = __pin('com', P.x + 110, P.y); const hp0 = big.hp; __aim(P.x + 110, P.y); UroCrawl.input.edges.alt = true; UroCrawl.step(1); let n = 0; while (w.lunge > 0 && n < 30) { UroCrawl.step(1); n++; }
    const gap = D(P, big) - big.r - P.r, inv = P.inv, stun = big.st.stun ? big.st.stun.t : 0, dmg = hp0 - big.hp, x1 = P.x;
    // 2. a stunned enemy is harmless to touch; once it wakes up, contact hurts again
    P.x = big.x - big.r - P.r + 6; P.inv = 0; UroCrawl.step(10); const hpStunned = P.hp; big.st = {}; P.inv = 0; UroCrawl.step(3); const hpAwake = P.hp;
    __prep(); P.hp = 100; P.inv = 0; w.cd2 = 0; w.lunge = 0;
    // 3. through things the stab kills: the dash keeps its full length
    const weak = [__pin('polyp', P.x + 60, P.y), __pin('polyp', P.x + 95, P.y)]; weak.forEach(e => { e.hp = 1; }); const xs = P.x; __aim(P.x + 200, P.y); UroCrawl.input.edges.alt = true; UroCrawl.step(1); n = 0; while (w.lunge > 0 && n < 30) { UroCrawl.step(1); n++; }
    return { gap, inv, stun, dmg, stopped: x1 - 300, hpStunned, hpAwake, through: P.x - xs, killed: weak.filter(e => e.dead).length, grace: T.LUNGE_GRACE, stunT: T.LUNGE_STUN }; });
  check('scalpel lunge into a survivor stops at arm\'s length (never inside it), staggers it and leaves recovery i-frames', b.gap >= 6 && b.stopped < 110 && b.dmg > 0 && b.inv >= b.grace - 0.02 && b.stun > b.stunT - 0.1, JSON.stringify({ gap: +b.gap.toFixed(1), stopped: +b.stopped.toFixed(1), inv: +b.inv.toFixed(2), stun: +b.stun.toFixed(2), dmg: +b.dmg.toFixed(1) }));
  check('a stunned enemy does no contact damage; awake again, it does', b.hpStunned === 100 && b.hpAwake < 100, JSON.stringify({ hpStunned: b.hpStunned, hpAwake: b.hpAwake }));
  check('the lunge carves through what it kills and keeps its full length', b.killed === 2 && b.through > 120, JSON.stringify({ through: +b.through.toFixed(1), killed: b.killed }));
  // every enemy renders in the 3/4 room (shadows, depth sort, rims) without throwing; then the bestiary thumbs
  b = await p.evaluate(() => { const G = UroCrawl.state, P = UroCrawl.player(), E = UroCrawl.tables.ENEMIES; __prep(); P.hp = 100; P.x = 120; P.y = 470; let i = 0, n = 0;
    G.obstacles.push({ type: 'rect', x: 400, y: 380, w: 90, h: 40 }, { type: 'circle', x: 560, y: 400, r: 22 }, { type: 'circle', x: 640, y: 400, r: 8 });
    Object.keys(E).forEach(id => { const d = E[id]; if (d.boss || d.isArm || d.isLobe || d.isStump || id === 'entero_link') return; const e = UroCrawl.spawn(id, 200 + (i % 10) * 70, 110 + Math.floor(i / 10) * 85, { instant: true }); i++; if (e) { n++; e.def = Object.assign({}, e.def, { update: function (q) { q.vx = q.vy = 0; }, contact: 0 }); } });
    G.rewards.length = 0; UroCrawl.step(3); UroCrawl.hideScreens(); G.rewards.length = 0; G.bullets.length = 0; return { n, fam: Object.keys(UroCrawl.tables.FAMILIES).length }; });
  await p.waitForTimeout(350); await shot(p, 'n-gallery');
  check('every enemy type draws in the room without errors', b.n >= 30 && errs.length === 0, b.n + ' types, errors: ' + errs.slice(0, 2).join(' | '));
  const { p: p2, errs: errs2 } = await open('?seed=61');
  await p2.evaluate(() => { document.getElementById('btnHelp').click(); });
  b = await p2.evaluate(() => { const lg = document.getElementById('famLegend').textContent; document.getElementById('btnHelpOk').click(); document.getElementById('btnBestiary').click();
    const blank = []; document.querySelectorAll('#bgrid .bentry').forEach(d => { const cv = d.querySelector('canvas'), px = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data; let a = 0; for (let k = 3; k < px.length; k += 4) if (px[k] > 40) a++; if (a < 150) blank.push(d.querySelector('b').textContent + ':' + a); });
    return { lg, blank, n: document.querySelectorAll('#bgrid .bentry').length }; });
  check('help explains the outline colours; every bestiary thumbnail has a drawing', /Stone/.test(b.lg) && /Microbe/.test(b.lg) && /Benign/.test(b.lg) && b.blank.length === 0 && b.n >= 33, 'blank: ' + b.blank.join(', '));
  await shot(p2, 'n-bestiary');
  errCheck('N', errs.concat(errs2));
});

// ───────── O. the Invader (muscle-invasive bladder tumour): round arena, wall + perforation, three stages ─────────
await block('O. invader', async () => {
  const Q = '&weapons=scalpel,foley,bovie,roller';   // four slots: 0 scalpel · 1 Foley · 2 Bovie · 3 Roller Ball
  const fresh = async (q) => { const o = await open(q); await o.p.evaluate(() => { UroCrawl.startRun(); UroCrawl.input.mode = 'kb'; UroCrawl.step(170); }); return o; };   // past the 2.6 s intro
  // the wall and the arena
  const { p, errs } = await fresh('?seed=9&boss=mibc' + Q);
  let b = await p.evaluate(() => { const G = UroCrawl.state, B = G.boss, Wl = G.wall, P = UroCrawl.player(), tags = {}; Wl.segs.forEach(s => { tags[s.tag] = (tags[s.tag] || 0) + 1; });
    P.x = 40; P.y = 40; UroCrawl.step(1); const in1 = UroCrawl.insideArena(P.x, P.y, P.r - 0.01); P.x = 900; P.y = 500; UroCrawl.step(1); const in2 = UroCrawl.insideArena(P.x, P.y, P.r - 0.01); P.x = 300; P.y = 278;
    return { kind: B.kind, name: B.name, hp: B.body.hp, max: B.body.maxHp, segs: Wl.segs.length, tags, arena: !!G.arena, in1, in2, live: Wl.live, phases: B.phases.length, dungeon: G.dungeon.name, T: UroCrawl.tuning.MIBC.T }; });
  check('?boss=mibc: The Invader in a round arena, a 12-segment wall tagged LATERAL / DOME / POSTERIOR, the surgeon kept inside it', b.kind === 'mibc' && b.name === 'THE INVADER' && b.segs === 12 && b.tags.LATERAL === 4 && b.tags.DOME === 4 && b.tags.POSTERIOR === 4 && b.arena && b.in1 && b.in2 && b.dungeon === 'ONCOLOGY', JSON.stringify(b.tags));
  check('health is three wall layers (urothelium 2200→1700, lamina propria →1200, muscle →500) plus the mass beyond', b.hp === 2200 && b.max === 2200 && b.T.join() === '1700,1200,500' && b.phases === 3);
  // Phase 1: fronds, CIS field, telegraphs
  b = await p.evaluate(() => { const G = UroCrawl.state, B = G.boss, P = UroCrawl.player(); let minTele = 9, kinds = {};
    for (let i = 0; i < 60 * 14; i++) { UroCrawl.step(1); P.hp = P.maxHp; G.teles.forEach(t => { if (t.kind !== 'spawn') { minTele = Math.min(minTele, t.dur); kinds[t.kind] = 1; } }); }
    const count = id => G.enemies.filter(e => !e.dead && e.id === id).length, cis = count('cis'), fronds = count('papillary'), mul = B.body.dmgMul, hp0 = B.body.hp, d = UroCrawl.dealDamage(B.body, 100, 'NEUTRAL', {});
    return { minTele, kinds: Object.keys(kinds).sort().join(), cis, fronds, mul, d, drop: hp0 - B.body.hp, phase: B.phase, layer: B.layer, hint: B.hint }; });
  check('Phase 1: papillary frond turrets and planted CIS carpets; each living carpet costs 15% of your damage to the body', b.phase === 1 && b.fronds >= 1 && b.cis >= 1 && Math.abs(b.mul - (1 - 0.15 * Math.min(3, b.cis))) < 1e-9 && Math.abs(b.d - 100 * b.mul) < 0.01 && /CIS FIELD/.test(b.hint), JSON.stringify({ cis: b.cis, fronds: b.fronds, mul: b.mul, d: b.d }));
  check('Phase 1 attacks are telegraphed for at least 0.5 s', b.minTele >= 0.5 && /circle/.test(b.kinds) && /line/.test(b.kinds), 'shortest ' + b.minTele + ' s · ' + b.kinds);
  // Phase 2: burrow, fronts, ×2, perf from CUT / ENERGY only
  b = await p.evaluate(() => { const G = UroCrawl.state, B = G.boss, Wl = G.wall, P = UroCrawl.player(); G.enemies.forEach(e => { if (e.id === 'cis' || e.id === 'papillary') { e.silent = true; e.hp = 0; } });
    B.body.hp = 1200; UroCrawl.step(3); P.hp = P.maxHp; const roots = B.roots.filter(r => !r.e.dead), tags = roots.map(r => r.seg.tag).sort().join(), distinct = new Set(roots.map(r => r.seg.i)).size, base = B.base.map(s => s.i);
    const blocked = UroCrawl.dealDamage(B.body, 50, 'CUT', {}), r0 = roots.filter(r => r.seg.tag === 'POSTERIOR')[0], seg = r0.seg;
    let hp = B.body.hp; const dL = UroCrawl.dealDamage(r0.e, 10, 'LITHO', { wid: 'holmium' }), dropL = hp - B.body.hp, perfL = seg.perf;
    hp = B.body.hp; const dF = UroCrawl.dealDamage(r0.e, 10, 'FLUID', { wid: 'irrigation' }), dropF = hp - B.body.hp, perfF = seg.perf;
    hp = B.body.hp; const dC = UroCrawl.dealDamage(r0.e, 10, 'CUT', { wid: 'scalpel' }), dropC = hp - B.body.hp, perfC = seg.perf;
    return { phase: B.phase, inv: B.body.inv, live: Wl.live, n: roots.length, tags, distinct, onBase: roots.some(r => base.indexOf(r.seg.i) >= 0), blocked, dL, dropL, perfL, dF, dropF, perfF, dC, dropC, perfC, fill: UroCrawl.tuning.PERF.FILL }; });
  check('Phase 2 at 1200 HP: the body burrows (untouchable) and four invasive fronts sit in distinct wall segments (a LATERAL, a DOME and a POSTERIOR among them), never on its own base', b.phase === 2 && b.inv && b.blocked === 0 && b.live && b.n === 4 && b.distinct === 4 && /DOME/.test(b.tags) && /LATERAL/.test(b.tags) && /POSTERIOR/.test(b.tags) && !b.onBase, b.tags);
  check('damage to a front counts double against the muscle layer', Math.abs(b.dropL - 2 * b.dL) < 0.01 && Math.abs(b.dropC - 2 * b.dC) < 0.01 && b.dC > b.dL, JSON.stringify({ dL: b.dL, dropL: b.dropL, dC: b.dC, dropC: b.dropC }));
  check('only CUT and ENERGY thin the wall: a laser hit and a water hit leave the segment intact, a cut adds damage / ' + b.fill, b.perfL === 0 && b.perfF === 0 && Math.abs(b.perfC - b.dC / b.fill) < 1e-9, JSON.stringify({ perfL: b.perfL, perfF: b.perfF, perfC: b.perfC }));
  // obturator jerk
  b = await p.evaluate(() => { const G = UroCrawl.state, B = G.boss, P = UroCrawl.player(), lat = B.roots.filter(r => !r.e.dead && r.seg.tag === 'LATERAL')[0], dome = B.roots.filter(r => !r.e.dead && r.seg.tag === 'DOME')[0];
    const run = (root, cls, wid, n) => { let j = 0; for (let i = 0; i < n; i++) { root.e.hp = 140; root.seg.perf = 0; B.jerkCd = 0; P.jerk = null; B.body.hp = 1150; const j0 = B.jerks; UroCrawl.dealDamage(root.e, 1, cls, { wid }); if (B.jerks > j0) j++; } root.seg.perf = 0; P.jerk = null; return j; };
    const px = P.x, py = P.y, aim0 = P.aim; lat.e.hp = 140; lat.seg.perf = 0; let got = null;
    for (let i = 0; i < 40 && !got; i++) { B.jerkCd = 0; B.body.hp = 1150; const j0 = B.jerks, pf = lat.seg.perf, d = UroCrawl.dealDamage(lat.e, 1, 'ENERGY', { wid: 'bovie' }); if (B.jerks > j0) got = { extra: lat.seg.perf - pf - d / 120, moved: Math.hypot(P.x - px, P.y - py), jerk: !!P.jerk }; else { P.x = px; P.y = py; } }
    UroCrawl.step(1); const yank = Math.abs(P.aim - Math.atan2(UroCrawl.input.my - P.y, UroCrawl.input.mx - P.x)); P.x = px; P.y = py; P.jerk = null; lat.seg.perf = 0;
    const bovie = run(lat, 'ENERGY', 'bovie', 40), roller = run(lat, 'ENERGY', 'roller', 40), holmium = run(lat, 'LITHO', 'holmium', 40), green = run(lat, 'ENERGY', 'greenlight', 40), domeB = run(dome, 'ENERGY', 'bovie', 40);
    const pool = UroCrawl.patronPool('bovie').indexOf('obturatorblock') >= 0; UroCrawl.giveBoon('obturatorblock'); const blockedN = run(lat, 'ENERGY', 'bovie', 40); UroCrawl.dropBoon('obturatorblock'); P.x = px; P.y = py; B.body.hp = 1150;
    return { got, yank, bovie, roller, holmium, green, domeB, blockedN, pool }; });
  check('obturator jerk: electrocautery on a LATERAL front yanks the aim, shoves the surgeon and thins that segment further', !!b.got && b.got.jerk && b.got.moved > 20 && Math.abs(b.got.extra - 0.12) < 1e-6 && b.yank > 0.3 && b.bovie > 5 && b.roller > 5, JSON.stringify({ got: b.got, yank: +b.yank.toFixed(2), bovie: b.bovie, roller: b.roller }));
  check('no jerk from lasers (holmium, GreenLight), none on the dome, none with the Obturator Block boon (a Bovie-patron boon)', b.holmium === 0 && b.green === 0 && b.domeB === 0 && b.blockedN === 0 && b.pool, JSON.stringify({ holmium: b.holmium, green: b.green, dome: b.domeB, block: b.blockedN }));
  // perforations by kind; the plug
  b = await p.evaluate(() => { const G = UroCrawl.state, B = G.boss, Wl = G.wall, P = UroCrawl.player(), K = UroCrawl.tuning.PERF_KINDS, out = {};
    const seeds = () => G.enemies.filter(e => !e.dead && e.id === 'tumorseed').length, floods = () => G.hazards.filter(h => h.kind === 'flood').length;
    const lat = B.roots.filter(r => !r.e.dead && r.seg.tag === 'LATERAL')[0], seg = lat.seg; P.hp = P.maxHp = 100; B.enrageT = 0; const s0 = seeds();
    lat.e.hp = 5000; for (let i = 0; i < 30 && !seg.open; i++) { B.body.hp = 1150; UroCrawl.dealDamage(lat.e, 6, 'CUT', { wid: 'scalpel' }); }
    out.lat = { open: seg.open, hpLoss: 100 - P.hp, seeds: seeds() - s0, flood: floods(), hole: !!seg.hole, rootGone: lat.e.dead, enrage: B.enrageT, want: K.LATERAL };
    // flood: slows you and shorts the Bovie
    const fl = seg.flood; P.x = fl.x; P.y = fl.y; P.stag = 0; UroCrawl.selectWeapon(2); G.swapT = 0; UroCrawl.input.keys.KeyD = true; const x0 = P.x; UroCrawl.step(6); out.slow = (P.x - x0) / (190 / 60 * 6); UroCrawl.input.keys = {}; P.x = fl.x; P.y = fl.y;
    G.texts.length = 0; UroCrawl.input.mouseFire = true; UroCrawl.step(20); UroCrawl.input.mouseFire = false; out.shorted = G.texts.some(t => /SHORTED/.test(t.text));
    // coag it (Roller Ball) inside the window
    const w0 = Wl.plugs; UroCrawl.dealDamage(seg.hole, 1, 'ENERGY', { wid: 'roller', cauterize: true }); UroCrawl.step(2);
    out.coag = { open: seg.open, sealed: seg.sealed, plugs: Wl.plugs - w0, hole: G.enemies.filter(e => !e.dead && e.id === 'perfhole').length, perf: seg.perf }; UroCrawl.step(100); out.floodAfter = floods();
    // the dome: severe
    P.hp = 100; P.x = 300; P.y = 278; G.enemies.forEach(e => { if (e.id === 'tumorseed') { e.silent = true; e.hp = 0; } }); UroCrawl.step(1); const dome = B.roots.filter(r => !r.e.dead && r.seg.tag === 'DOME')[0], dseg = dome.seg, s1 = seeds(); dome.e.hp = 5000; for (let i = 0; i < 30 && !dseg.open; i++) { B.body.hp = 1150; UroCrawl.dealDamage(dome.e, 6, 'CUT', { wid: 'scalpel' }); }
    out.dome = { open: dseg.open, hpLoss: 100 - P.hp, seeds: seeds() - s1, enrage: B.enrageT, want: K.DOME, alert: Wl.alert && Wl.alert.text };
    // tamponade: a Foley balloon held over the hole
    const hp = UroCrawl.wallPoint(dseg, 6); P.x = hp.x; P.y = hp.y + 60; P.hp = 100; UroCrawl.selectWeapon(1); G.swapT = 0; G.bullets.length = 0; UroCrawl.input.mx = hp.x; UroCrawl.input.my = hp.y; UroCrawl.input.mouseFire = true; let n = 0; while (dseg.open && n < 150) { G.enemies.forEach(e => { if (e.id === 'tumorseed' || e.id === 'cis') { e.silent = true; e.hp = 0; } }); UroCrawl.step(1); G.bullets.length = 0; P.hp = 100; P.x = hp.x; P.y = hp.y + 60; n++; } UroCrawl.input.mouseFire = false;
    out.foley = { open: dseg.open, sealed: dseg.sealed, steps: n, window: UroCrawl.tuning.PERF.WINDOW }; P.x = 300; P.y = 278; UroCrawl.selectWeapon(0); G.swapT = 0;
    return out; });
  check('LATERAL perforation (extraperitoneal, minor): hole, flood, 3 tumour seeds, 8 damage, no enrage; the front on it falls through', b.lat.open && b.lat.hpLoss === b.lat.want.dmg && b.lat.want.dmg === 8 && b.lat.seeds === 3 && b.lat.flood === 1 && b.lat.hole && b.lat.rootGone && b.lat.enrage === 0, JSON.stringify(b.lat));
  check('the flood slows the surgeon to 70% and shorts the Bovie', Math.abs(b.slow - 0.7) < 0.03 && b.shorted, 'speed ×' + b.slow.toFixed(2));
  check('a cauterizing hit on the hole (Roller Ball) seals it: hole gone, flood drains, the segment is left patched at 45%', !b.coag.open && b.coag.sealed && b.coag.plugs === 1 && b.coag.hole === 0 && Math.abs(b.coag.perf - 0.45) < 1e-9 && b.floodAfter === 0, JSON.stringify(b.coag));
  check('DOME perforation (intraperitoneal, severe): 22 damage, 6 seeds, the boss enrages for 15 s', b.dome.open && b.dome.hpLoss === 22 && b.dome.seeds === 6 && b.dome.enrage === 15 && /INTRAPERITONEAL/.test(b.dome.alert), JSON.stringify(b.dome));
  check('holding a Foley balloon over the hole tamponades it inside the window', !b.foley.open && b.foley.sealed && b.foley.steps < b.foley.window * 60, b.foley.steps + ' steps');
  // left alone: chronic leak. Distension: +50%
  b = await p.evaluate(() => { const G = UroCrawl.state, B = G.boss, Wl = G.wall, P = UroCrawl.player(), seeds = () => G.enemies.filter(e => !e.dead && e.id === 'tumorseed').length;
    G.enemies.forEach(e => { if (e.id === 'tumorseed') { e.silent = true; e.hp = 0; } }); UroCrawl.step(1);
    const post = B.roots.filter(r => !r.e.dead && r.seg.tag === 'POSTERIOR')[0] || B.roots.filter(r => !r.e.dead)[0], seg = post.seg; post.e.hp = 5000; seg.perf = 0; for (let i = 0; i < 40 && !seg.open; i++) { B.body.hp = 1150; UroCrawl.dealDamage(post.e, 6, 'CUT', { wid: 'scalpel' }); }
    for (let i = 0; i < 60 * 6; i++) { UroCrawl.step(1); P.hp = P.maxHp; } const chronic = seg.chronic, hole = !!seg.hole, late = UroCrawl.wallPlug(seg, 'coag'), s0 = seeds(); G.enemies.forEach(e => { if (e.id === 'tumorseed') { e.silent = true; e.hp = 0; } }); UroCrawl.step(1);
    for (let i = 0; i < 60 * 8; i++) { UroCrawl.step(1); P.hp = P.maxHp; } const leaked = seeds();
    // distension
    const r2 = B.roots.filter(r => !r.e.dead && !r.seg.open)[0], s2 = r2.seg; r2.e.hp = 5000; s2.perf = 0; Wl.distension = 0; const a = UroCrawl.wallHit(s2, 12, 'CUT'); Wl.distension = 0.7; const c = UroCrawl.wallHit(s2, 12, 'CUT'); s2.perf = 0;
    G.maxWeapons = 5; UroCrawl.giveWeapon('irrigation'); G.weapons.forEach((w, i) => { if (w.id === 'irrigation') UroCrawl.selectWeapon(i); }); G.swapT = 0; Wl.distension = 0; UroCrawl.input.mx = P.x - 100; UroCrawl.input.my = P.y; UroCrawl.input.mouseFire = true; for (let i = 0; i < 60 * 2.5; i++) { UroCrawl.step(1); P.hp = P.maxHp; B.body.hp = 1150; } UroCrawl.input.mouseFire = false; const dist = Wl.distension;
    return { chronic, hole, late, leaked, a, c, dist, open: seg.open }; });
  check('a perforation left for 5.5 s is chronic: it cannot be plugged any more and keeps leaking seeds', b.chronic && !b.hole && b.late === false && b.open && b.leaked >= 1, JSON.stringify({ chronic: b.chronic, leaked: b.leaked }));
  check('distension: the Irrigation Hose fills the bladder, and past 60% every perf meter fills 50% faster', b.dist >= 0.6 && Math.abs(b.c / b.a - 1.5) < 1e-9, JSON.stringify({ distension: +b.dist.toFixed(2), ratio: b.c / b.a }));
  await p.waitForTimeout(250); await shot(p, 'o-phase2');
  // Phase 3 and the cystectomy
  b = await p.evaluate(() => { const G = UroCrawl.state, B = G.boss, Wl = G.wall, P = UroCrawl.player(), out = {};
    B.body.hp = 500; UroCrawl.step(3); P.hp = P.maxHp; out.p3 = { phase: B.phase, roots: B.roots.filter(r => !r.e.dead).length, broken: Wl.segs.filter(s => s.broken).length, live: Wl.live, inv: !!B.body.inv };
    UroCrawl.step(60); out.fat = G.enemies.filter(e => !e.dead && e.id === 'fatglob').length;
    UroCrawl.dealDamage(B.body, 99999, 'CUT', {}); UroCrawl.step(2); out.floor = { hp: B.body.hp, dead: B.body.dead, core: B.core, over: G.over };
    const c = { x: B.body.x - 34, y: B.body.y }; P.x = c.x - 110; P.y = c.y; P.stag = 0; P.hp = P.maxHp = 500; UroCrawl.selectWeapon(0); G.swapT = 0; UroCrawl.input.mx = c.x; UroCrawl.input.my = c.y;
    UroCrawl.input.mouseFire = true; for (let i = 0; i < 30; i++) { UroCrawl.step(1); P.x = c.x - 110; P.y = c.y; P.stag = 0; } const half = B.cyst; UroCrawl.input.mouseFire = false; UroCrawl.step(2); out.early = { half, after: B.cyst, dead: B.body.dead };
    UroCrawl.input.mouseFire = true; let n = 0; while (B.cyst < 1 && n < 200) { UroCrawl.step(1); P.x = c.x - 110; P.y = c.y; P.stag = 0; P.hp = 500; n++; } out.full = { steps: n, held: !B.body.dead && !G.over, cyst: B.cyst };
    UroCrawl.input.mouseFire = false; UroCrawl.step(2); out.kill = { dead: B.body.dead, over: G.over, won: G.won, banner: G.banner && G.banner.text };
    return out; });
  check('Phase 3 at 500 HP: through the wall. Fronts gone, its two base segments burst, perivesical fat adds, the wall stops thinning', b.p3.phase === 3 && b.p3.roots === 0 && b.p3.broken === 2 && !b.p3.live && !b.p3.inv && b.fat >= 2, JSON.stringify(b.p3) + ' fat ' + b.fat);
  check('ordinary damage only strips it to an exposed core (1 HP): it cannot be killed that way', b.floor.hp === 1 && !b.floor.dead && b.floor.core && !b.floor.over, JSON.stringify(b.floor));
  check('radical cystectomy: hold fire on the core for 1.5 s (letting go early resets the charge), then release to kill', b.early.half > 0.2 && b.early.half < 0.5 && b.early.after === 0 && !b.early.dead && b.full.cyst === 1 && b.full.held && Math.abs(b.full.steps - 90) <= 3 && b.kill.dead && b.kill.won && b.kill.banner === 'EN BLOC!', JSON.stringify({ early: b.early, full: b.full, kill: b.kill }));
  await p.evaluate(() => { UroCrawl.step(500); }); await p.waitForTimeout(300);
  b = await p.evaluate(() => ({ overlay: UroCrawl.state.overlay, title: document.getElementById('sumTitle').textContent, sub: document.getElementById('sumSub').textContent, stats: document.getElementById('sumStats').textContent }));
  check('the win screen files the pathology report, with the normal run summary', b.overlay === 'summary' && b.title === 'DISCHARGED!' && b.sub === 'Muscle present in specimen: Muscle-invasive disease confirmed. Pathology report filed.' && /Rooms cleared/.test(b.stats) && /Perforations/.test(b.stats), b.sub);
  await shot(p, 'o-summary');
  // neoadjuvant chemo in the rest room; the Oncology dungeon; the boss pool; the bestiary; skipRoom
  const { p: p2, errs: errs2 } = await open('?seed=12&boss=mibc&room=8' + Q);
  b = await p2.evaluate(() => { UroCrawl.startRun(); UroCrawl.input.mode = 'kb'; UroCrawl.step(5); const G = UroCrawl.state, P = UroCrawl.player(), r = G.rewards.filter(x => x.kind === 'neoadj')[0]; if (!r) return { has: false };
    P.x = r.x + 80; P.y = r.y; UroCrawl.step(3); P.x = r.x; P.y = r.y; UroCrawl.step(3); const o = G.overlay, title = document.getElementById('stewardTitle').textContent, btns = [...document.querySelectorAll('#stewardChoices .btn')].map(x => x.textContent);
    document.querySelectorAll('#stewardChoices .btn')[1].click(); const declined = !G.neoadj && G.overlay === null && !r.used;
    P.x = r.x + 80; UroCrawl.step(3); P.x = r.x; UroCrawl.step(3); document.querySelectorAll('#stewardChoices .btn')[0].click(); const took = G.neoadj && r.used && G.overlay === null, max0 = P.maxHp;
    const d = G.doors.filter(x => x.open)[0]; P.x = d.x - 20; P.y = d.y + d.h / 2; UroCrawl.step(80); const B = G.boss;
    return { has: true, room: 8, o, title, btns, declined, took, max0, kind: B && B.kind, hp: B && B.body.hp, max: B && B.body.maxHp, pmax: P.maxHp, layer: B && B.layer }; });
  check('the rest room before the Invader offers neoadjuvant chemo (decline or take): the boss starts at 80% HP and you fight at −15% max HP', b.has && b.o === 'steward' && /Neoadjuvant/.test(b.title) && b.btns.length === 2 && b.declined && b.took && b.kind === 'mibc' && b.hp === 1760 && b.max === 2200 && b.pmax === Math.round(b.max0 * 0.85), JSON.stringify({ hp: b.hp, pmax: b.pmax, max0: b.max0, btns: b.btns }));
  const { p: p3 } = await open('?seed=12&boss=staghorn&room=8' + Q);
  const noChemo = await p3.evaluate(() => { UroCrawl.startRun(); UroCrawl.step(5); return UroCrawl.state.rewards.filter(x => x.kind === 'neoadj').length; });
  const { p: p3b } = await open('?seed=12&boss=mibc&room=8&weapons=scalpel,holmium');
  const crate = await p3b.evaluate(() => { UroCrawl.startRun(); UroCrawl.step(5); const c = UroCrawl.state.rewards.filter(x => x.kind === 'crate')[0]; return c && c.item && c.item.id; });
  check('before the Invader, the rest-room crate is a Roller Ball when you carry nothing that plugs a perforation', crate === 'roller', String(crate));
  const { p: p4, errs: errs4 } = await open('?seed=31&god=1&boss=mibc&room=5');
  b = await p4.evaluate(() => { UroCrawl.startRun(); const G = UroCrawl.state, E = UroCrawl.tables.ENEMIES, fams = {}; G.waves.list.forEach(w => w.forEach(x => { fams[E[x.id].family] = 1; }));
    const roll = { staghorn: 0, fournier: 0, mibc: 0, bph: 0 }; let kept = true; const mb = a => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    for (let sd = 1; sd <= 600; sd++) { const id = UroCrawl.rollBossId(sd), r = mb(sd ^ 0x51ab); roll[id]++; if (r < 1 / 4 && id !== 'staghorn') kept = false; if (r >= 1 / 3 && r < 0.5 && id !== 'mibc') kept = false; if (r >= 0.5 && r < 3 / 4 && id !== 'fournier') kept = false; }
    const vis = ['mibc', 'tumorseed', 'fatglob'].every(id => E[id] && !E[id].hidden && E[id].fact.length > 40), hid = ['mibcroot', 'perfhole'].every(id => E[id] && E[id].hidden);
    return { fams: Object.keys(fams).sort().join(), name: G.dungeon.name, room: G.roomIndex, roll, kept, vis, hid, fam: E.mibc.family, boss: E.mibc.boss }; });
  check('Oncology dungeon (the Invader\'s run): rooms draw only tumours and benign masses; staghorn / fournier runs offer no chemo', b.room === 5 && b.name === 'ONCOLOGY' && /^(BENIGN|MALIGNANT|BENIGN,MALIGNANT)$/.test(b.fams) && noChemo === 0, b.fams);
  check('the boss pool rolls each boss from the seed (a quarter each since the Giant TURP joined, block Q), and every seed in a kept range (Staghorn r < 1/4, Invader 1/3–1/2, Fournier 1/2–3/4) still rolls what it did', b.roll.staghorn > 120 && b.roll.fournier > 120 && b.roll.mibc > 120 && b.roll.bph > 120 && b.kept, JSON.stringify(b.roll));
  check('bestiary: The Invader, Tumour Seed and Perivesical Fat have entries; fronts and holes stay hidden parts', b.vis && b.hid && b.fam === 'MALIGNANT' && b.boss === true);
  const { p: p5, errs: errs5 } = await fresh('?seed=4&god=1&boss=mibc');
  b = await p5.evaluate(() => { UroCrawl.skipRoom(); UroCrawl.step(300); return { won: UroCrawl.state.won, over: UroCrawl.state.over }; });
  check('skipRoom still ends the fight as a win (the autoplay path)', b.won && b.over);
  // the wall system on its own, in an ordinary room
  const { p: p6, errs: errs6 } = await open('?seed=3&god=1&room=3');
  b = await p6.evaluate(() => { UroCrawl.startRun(); UroCrawl.step(5); const G = UroCrawl.state, P = UroCrawl.player(); G.enemies.forEach(e => { e.silent = true; e.inhaled = true; e.hp = 0; }); UroCrawl.step(1); G.waves.next = 99; let sealed = 0;
    const Wl = UroCrawl.makeWall({ cx: 480, cy: 270, rx: 470, ry: 250, n: 8, onSealed: () => { sealed++; } }); P.x = 480; P.y = 270; const seg = UroCrawl.wallSegAt(480, 30), tag = seg.tag;   // wide enough to keep the east door inside it
    const a = UroCrawl.wallHit(seg, 60, 'CUT'), half = seg.perf; UroCrawl.wallHit(seg, 60, 'CUT'); const open = seg.open, banner = G.banner && G.banner.text; UroCrawl.step(2); const plugged = UroCrawl.wallPlug(seg, 'foley');
    P.x = 20; P.y = 20; UroCrawl.step(1); const kept = UroCrawl.insideArena(P.x, P.y, P.r - 0.01); UroCrawl.skipRoom(); UroCrawl.step(5); const d = G.doors.filter(x => x.open)[0]; P.x = d.side === 'E' ? d.x - 20 : d.x + d.w / 2; P.y = d.side === 'E' ? d.y + d.h / 2 : (d.side === 'N' ? d.y + d.h + 20 : d.y - 20); UroCrawl.step(80);
    return { n: Wl.segs.length, tag, half, open, banner, plugged, sealed, kept, cleared: G.wall === null && G.arena === null, room: G.roomIndex }; });
  check('the wall + perforation system is generic: any room can makeWall(), feed wallHit(), get the perforation event and plug it; leaving the room clears it', b.n === 8 && b.tag === 'DOME' && b.half === 0.5 && b.open && /INTRAPERITONEAL/.test(b.banner) && b.plugged && b.sealed === 1 && b.kept && b.cleared && b.room === 4, JSON.stringify(b));
  errCheck('O', errs.concat(errs2, errs4, errs5, errs6));
});

// ───────── P. the Staghorn as a head-on duelist (roadmap Step 1) ─────────
// __S: put the boss and the surgeon somewhere with every timer clean, silence every attack but one, step until something
// happens. __stagBot: a surgeon that plays the fight for real (analog movement, mouse aim, held fire with heat management,
// weapon swaps by phase, sidesteps and rolls driven by what the boss telegraphs); it runs synchronously inside evaluate.
const STAGLIB = `
  window.__S = {
    quiet: function (keep) { const B = UroCrawl.state.boss; for (const k in B.cd) B.cd[k] = 99; if (keep) B.cd[keep] = 0; B.swarmT = 99; },
    put: function (x, y, face, px, py) { const G = UroCrawl.state, B = G.boss, b = B.body, P = UroCrawl.player(), I = UroCrawl.input;
      b.x = x; b.y = y; B.px = x; B.py = y; b.vx = b.vy = b.kx = b.ky = 0; B.face = face; B.state = 'stalk'; B.stT = 0; B.run = null; B.tele = null; B.chain = 0; b.atk = null; delete b.st.stun; B.rings.length = 0; B.queue.length = 0;
      G.teles.length = 0; G.bullets.length = 0; G.texts.length = 0; G.shake = 0; G.flash = 0; G.punch = 0;
      P.x = px; P.y = py; P.hp = P.maxHp; P.inv = 0; P.roll = 0; P.rollCd = 0; P.stag = 0; I.mode = 'kb'; I.keys = {}; I.stick = null; I.mouseFire = false; I.edges = {}; },
    until: function (pred, max) { let n = 0; while (!pred() && n < (max || 600)) { UroCrawl.step(1); n++; } return n; },
    mics: function () { return UroCrawl.state.enemies.filter(e => !e.dead && e.family === 'MICROBE').length; },
    killMics: function () { UroCrawl.state.enemies.forEach(e => { if (e.family === 'MICROBE') { e.silent = true; e.hp = 0; } }); UroCrawl.step(1); },
    broken: function () { return UroCrawl.state.boss.arms.filter(a => a.cracked).length; }
  };
  window.__stagBot = function (maxSteps, o) {
    o = o || {};
    const G = UroCrawl.state, P = UroCrawl.player(), I = UroCrawl.input, B = G.boss, body = B.body, T = UroCrawl.tuning.STAG, A = { x0: 26, y0: 26, x1: 934, y1: 514 };
    const log = { steps: 0, t0: G.time, phaseAt: {}, hits: [], rolls: 0, minTele: 9, kinds: {}, states: {}, maxSpd: 0, won: false, dead: false };
    const D = (a, b) => Math.hypot(a.x - b.x, a.y - b.y), slot = id => G.weapons.findIndex(w => w.id === id);
    I.mode = 'kb'; let strafe = 1, strafeT = 0, hold = false, hp = P.hp;
    for (let n = 0; n < maxSteps && !G.over; n++) {
      const ph = B.phase, d = D(body, P), ab = Math.atan2(P.y - body.y, P.x - body.x), stunned = !!body.st.stun;
      log.states[B.state] = (log.states[B.state] || 0) + 1; if (log.phaseAt[ph] === undefined) log.phaseAt[ph] = +(G.time - log.t0).toFixed(1);
      G.teles.forEach(t => { if (t.kind !== 'spawn') { log.minTele = Math.min(log.minTele, t.dur); log.kinds[t.kind] = 1; } });
      log.maxSpd = Math.max(log.maxSpd, Math.hypot(body.vx, body.vy));
      // what to shoot, with what
      let tgt = body, want = 'holmium';
      const tines = B.arms.filter(a => !a.cracked).map(a => a.e), mics = G.enemies.filter(e => !e.dead && e.family === 'MICROBE' && e.spawnT <= 0);
      if (ph === 1 && B.arms.length - tines.length < T.NEED && tines.length) tgt = tines.slice().sort((p, q) => D(p, P) - D(q, P))[0];
      if (ph === 2) { const near = mics.filter(e => D(e, P) < 160).sort((p, q) => D(p, P) - D(q, P)); if (near.length && slot('bovie') >= 0) { tgt = near[0]; want = 'bovie'; } else if (body.shield > 0 && slot('irrigation') >= 0) want = 'irrigation'; }
      const ws = slot(want); if (ws >= 0 && G.wIndex !== ws) UroCrawl.selectWeapon(ws);
      const w = G.weapons[G.wIndex]; I.mx = tgt.x; I.my = tgt.y;
      if (w.id === 'holmium') { if (w.heat > 0.9) hold = true; if (w.heat < 0.3) hold = false; } else hold = false;
      I.mouseFire = !hold && D(tgt, P) - tgt.r < (w.id === 'holmium' ? 222 : w.id === 'irrigation' ? 192 : 160) && G.introT <= 0;
      // where to stand: a ring around the boss, strafing; then whatever the telegraphs say
      const ring = stunned ? 150 : want === 'irrigation' ? 175 : 195, rx = Math.cos(ab), ry = Math.sin(ab), rad = d < ring - 15 ? 1 : d > ring + 15 ? -1 : 0;
      strafeT -= 1 / 60; if (strafeT <= 0) { strafeT = 1.4 + (n % 5) * 0.3; strafe = -strafe; }
      let mx = rx * rad - ry * strafe * 0.55, my = ry * rad + rx * strafe * 0.55, roll = false;
      const inRoom = (x, y, m) => x > A.x0 + m && x < A.x1 - m && y > A.y0 + m && y < A.y1 - m;
      if (B.state === 'dig' || (B.state === 'charge' && B.run && !B.run.hit)) {       // the lane: step out of it sideways, roll if it is on top of us
        const a = B.state === 'charge' ? B.run.a : B.face, ca = Math.cos(a), sa = Math.sin(a), px = P.x - body.x, py = P.y - body.y, along = px * ca + py * sa, perp = -px * sa + py * ca;
        let side = perp >= 0 ? 1 : -1; if (!inRoom(P.x - sa * side * 110, P.y + ca * side * 110, 14)) side = -side;
        const half = (ph === 3 ? 38 : T.LANE / 2) + 13 + 22;
        if (along > -40 && (Math.abs(perp) < half || side * perp < 0)) { mx = -sa * side; my = ca * side; }
        if (B.state === 'charge' && along > 0 && along < 300 && Math.abs(perp) < half - 8) roll = true;
      }
      else if (B.state === 'sweepTele' && d < T.SWEEP_R + 40) { mx = rx; my = ry; if (B.stT < 0.2 && d < T.SWEEP_R + 16) roll = true; }
      else if (B.state === 'slamTele' && d < T.SLAM_R + T.SLAM_TREMOR + 40) { mx = rx; my = ry; }
      else if (!stunned && d < 120) { mx = rx; my = ry; }
      for (const rg of B.rings) {                                                    // shard rings: a diagonal roll, on i-frames as the ring passes
        if (rg.done || rg.delay > 0) continue; const gap = D(rg, P) - rg.r;
        if (gap > 0 && gap < 30) { const ra = Math.atan2(rg.y - P.y, rg.x - P.x) + (d > 230 ? 0.5 : 1.35) * strafe; mx = Math.cos(ra); my = Math.sin(ra); roll = true; }
      }
      let worst = null;                                                              // bullets: sidestep the one that will arrive first
      for (const b of G.bullets) {
        if (!b.hostile || b.kind === 'lob') continue; const rxp = P.x - b.x, ryp = P.y - b.y, v2 = b.vx * b.vx + b.vy * b.vy; if (v2 < 1) continue;
        const tca = (rxp * b.vx + ryp * b.vy) / v2; if (tca < 0 || tca > 0.55) continue;
        const cx = rxp - b.vx * tca, cy = ryp - b.vy * tca, miss = Math.hypot(cx, cy); if (miss > 30) continue;
        if (!worst || tca < worst.tca) worst = { tca, miss, b, cx, cy };
      }
      if (worst && !roll) { const v = Math.hypot(worst.b.vx, worst.b.vy), nx = -worst.b.vy / v, ny = worst.b.vx / v, s = (worst.cx * nx + worst.cy * ny) >= 0 ? 1 : -1; mx = nx * s; my = ny * s; if (worst.tca < 0.14 && worst.miss < 18) roll = true; }
      if (P.x < A.x0 + 40) mx += 0.8; if (P.x > A.x1 - 40) mx -= 0.8; if (P.y < A.y0 + 40) my += 0.8; if (P.y > A.y1 - 40) my -= 0.8;
      const mm = Math.hypot(mx, my); if (mm > 1) { mx /= mm; my /= mm; }
      I.stick = { bx: 0, by: 0, kx: mx * 48, ky: my * 48 };
      if (roll && P.rollCd <= 0 && P.roll <= 0 && mm > 0.2) { I.edges.roll = true; log.rolls++; }
      UroCrawl.step(1); log.steps++;
      if (P.hp < hp - 0.01) log.hits.push([+(G.time - log.t0).toFixed(1), Math.round(hp - P.hp), B.state, ph]); hp = P.hp;
    }
    I.stick = null; I.mouseFire = false;
    log.won = G.won; log.dead = G.over && !G.won; log.secs = +(G.time - log.t0).toFixed(1); log.hp = Math.round(P.hp); log.crashes = B.crashes; log.gores = B.gores; log.phase = B.phase;
    log.taken = log.hits.reduce((s, h) => s + h[1], 0); log.shards = G.bullets.filter(b => b.kind === 'shard').length;
    return log;
  };
`;
await block('P. staghorn duel', async () => {
  // past the 2.6 s intro; timeScale 0 means only step() advances the sim, so nothing drifts between evaluate calls
  const fresh = async (q) => { const o = await open(q); await o.p.evaluate(STAGLIB); await o.p.evaluate(() => { UroCrawl.startRun(); UroCrawl.input.mode = 'kb'; UroCrawl.step(170); UroCrawl.state.timeScale = 0; }); return o; };
  const near = (a, b, eps) => Math.abs(a - b) <= (eps === undefined ? 0.011 : eps), W = '&weapons=holmium,irrigation,bovie';

  // the body, the charge and its telegraph, the wall crash
  const { p, errs } = await fresh('?seed=5&boss=staghorn' + W);
  let b = await p.evaluate(() => { const G = UroCrawl.state, B = G.boss, E = UroCrawl.tables.ENEMIES, body = B.body;
    __S.quiet(); __S.put(700, 270, Math.PI, 150, 270); const x0 = body.x; UroCrawl.step(60); const walked = x0 - body.x;
    __S.put(700, 270, Math.PI, 700, 80); UroCrawl.step(50); const off = Math.abs(Math.atan2(Math.sin(B.face + Math.PI / 2), Math.cos(B.face + Math.PI / 2)));   // surgeon straight above: it turns to face up
    return { kind: B.kind, tines: B.arms.length, ids: B.arms.map(a => a.e.id).join(), hp: B.arms.map(a => a.e.maxHp).join(), live: B.arms.every(a => a.e.isArm && !a.e.dead && !a.cracked), r: body.r, max: body.maxHp, mul: body.dmgMul,
      depth: !!E.staghorn.depth, rooted: !!E.staghorn.stationary, others: !!E.fournier.depth || !!E.mibc.depth, walked, off, phases: B.phases.join(), hint: B.hint, T: UroCrawl.tuning.STAG }; });
  const T = b.T;
  check('?boss=staghorn is a mobile beast: it walks the surgeon down, turns to face them, and is drawn in the depth-sorted pass (the rooted bosses are not)', b.kind === 'staghorn' && b.walked > 40 && b.off < 0.2 && b.depth && !b.rooted && !b.others && b.r === T.R && b.phases === 'SHELL,INFECTION,CORE', JSON.stringify({ walked: +b.walked.toFixed(1), off: +b.off.toFixed(2), r: b.r, max: b.max }));
  check('the rack is 4 separate tine targets (200 HP each) and the body starts shelled at 25%, with a hint that says how to open it', b.tines === 4 && b.ids === 'stagarm,stagarm,stagarm,stagarm' && b.hp === '200,200,200,200' && b.live && b.mul === T.SHELL && T.SHELL === 0.25 && /2 tines/.test(b.hint) && /wall/.test(b.hint), b.hint);
  b = await p.evaluate(() => { const G = UroCrawl.state, B = G.boss, body = B.body, P = UroCrawl.player(), T = UroCrawl.tuning.STAG;
    __S.quiet('charge'); __S.put(700, 270, Math.PI, 250, 270); UroCrawl.step(1);
    const ad = (a, c) => Math.abs(Math.atan2(Math.sin(a - c), Math.cos(a - c))), st0 = B.state, tele = G.teles.filter(t => t.kind === 'line')[0], dur = tele && tele.dur, thick = tele && tele.thick;
    UroCrawl.step(12); P.y = 170; UroCrawl.step(15); const len = tele.len, track = ad(tele.a, Math.atan2(P.y - body.y, P.x - body.x));   // the lane follows the surgeon while it digs in
    let n = 28; while (B.stT > T.LOCK && n < 80) { UroCrawl.step(1); n++; }
    const aLock = B.face; P.y = 440; while (B.state === 'dig' && n < 80) { UroCrawl.step(1); n++; }                                // ...then locks: moving now changes nothing
    const aRun = B.run ? B.run.a : null, x1 = body.x, y1 = body.y; UroCrawl.step(12);
    const spd = Math.hypot(body.vx, body.vy), straight = aRun === null ? 9 : ad(Math.atan2(body.y - y1, body.x - x1), aRun), locked = aRun === null ? 9 : ad(aLock, aRun), far = Math.hypot(body.x - x1, body.y - y1), hpRun = P.hp;
    // into the wall
    const k = __S.until(() => B.state !== 'charge', 200), stun = body.st.stun ? body.st.stun.t : 0, state = B.state, cracked = __S.broken(), which = B.arms.findIndex(a => a.cracked), cd = B.cd.charge, texts = G.texts.map(t => t.text).join('|'), wallGap = body.x - 26 - body.r;
    UroCrawl.step(1); const mul = body.dmgMul, hint = B.hint;
    P.x = body.x + 30; P.y = body.y; P.inv = 0; UroCrawl.step(30); const hpStunned = P.hp;                                           // a stunned boss is harmless to touch
    const left = __S.until(() => B.state !== 'stunned', 300); P.x = body.x + 30; P.y = body.y; P.inv = 0; UroCrawl.step(40); const hpAwake = P.hp;
    // a second crash takes a second tine: the shell is open, and the stun is the full +50%
    __S.quiet('charge'); __S.put(700, 270, Math.PI, 250, 270); P.inv = 99; __S.until(() => B.state === 'stunned', 300); UroCrawl.step(1);
    const cracked2 = __S.broken(), mul2 = body.dmgMul, d15 = UroCrawl.dealDamage(body, 10, 'NEUTRAL', {}), exposed = B.exposed;
    return { st0, dur, thick, len, track, digSteps: n, locked, straight, spd, far, hpRun, k, stun, state, cracked, which, cd, texts, wallGap, mul, hint, hpStunned, stunSteps: 31 + left, hpAwake, cracked2, mul2, d15, exposed, crashes: B.crashes }; });
  check('antler charge: it stops and digs in for 0.7 s behind an aim lane that follows the surgeon, locks for the last beat, then runs that line at high speed', b.st0 === 'dig' && near(b.dur, 0.7) && b.thick === T.LANE && b.len > 400 && b.track < 0.1 && b.digSteps >= 42 && b.digSteps <= 44 && b.locked < 1e-9 && near(b.spd, T.SPD[1], 0.5) && b.straight < 0.03 && b.far > 100 && b.hpRun === 100, JSON.stringify({ dur: b.dur, track: +b.track.toFixed(3), digSteps: b.digSteps, spd: b.spd, far: Math.round(b.far) }));
  check('wall crash: stunned 2.5 s against the wall, one tine snaps off (an inner one first), and the charge goes on cooldown', b.state === 'stunned' && near(b.stun, T.STUN[1], 0.02) && b.wallGap < 45 && b.cracked === 1 && (b.which === 1 || b.which === 2) && /STUNNED!/.test(b.texts) && /TINE BROKEN/.test(b.texts) && b.cd >= 4.4 && b.cd <= 5.4 && b.stunSteps >= 148 && b.stunSteps <= 153 && /STUNNED/.test(b.hint), JSON.stringify({ stun: b.stun, which: b.which, cd: +b.cd.toFixed(2), stunSteps: b.stunSteps, wallGap: +b.wallGap.toFixed(1) }));
  check('the stunned boss takes +50% and does no contact damage; awake again, touching it hurts', near(b.mul, T.SHELL * T.STUN_MUL, 1e-9) && b.hpStunned === 100 && b.hpAwake < 100 && b.cracked2 === 2 && near(b.mul2, T.STUN_MUL, 1e-9) && near(b.d15, 15, 1e-9) && b.exposed && b.crashes === 2, JSON.stringify({ mul: b.mul, hpStunned: b.hpStunned, hpAwake: b.hpAwake, mul2: b.mul2, d15: b.d15 }));
  await shot(p, 'p-stunned');

  // gored if you stand in the lane; roll through it on i-frames and it hits the wall instead
  const { p: p2, errs: errs2 } = await fresh('?seed=6&boss=staghorn' + W);
  b = await p2.evaluate(() => { const G = UroCrawl.state, B = G.boss, body = B.body, P = UroCrawl.player();
    __S.quiet('charge'); __S.put(700, 270, Math.PI, 250, 270); __S.until(() => B.state === 'charge', 80); __S.until(() => B.state !== 'charge', 200);
    const gore = { hp: P.hp, state: B.state, gores: B.gores, crashes: B.crashes, stun: !!body.st.stun, gap: body.x - 26 - body.r, text: G.texts.some(t => t.text === 'GORED'), broken: __S.broken() };
    __S.quiet('charge'); __S.put(700, 270, Math.PI, 250, 270); __S.until(() => B.state === 'charge', 80);
    let rolled = 0, n = 0; while (B.state === 'charge' && n < 200) { const lead = Math.min.apply(null, B.arms.filter(a => !a.cracked).map(a => a.e.x - a.e.r).concat([body.x - body.r])); if (!rolled && lead - (P.x + P.r) < 62) { UroCrawl.input.keys.KeyD = true; UroCrawl.input.edges.roll = true; rolled = 1; } UroCrawl.step(1); n++; }
    UroCrawl.input.keys = {};
    return { gore, dodge: { hp: P.hp, gores: B.gores, crashes: B.crashes, state: B.state, text: G.texts.some(t => t.text === 'DODGE'), rolled, px: P.x, broken: __S.broken() } }; });
  check('standing in the lane: gored for heavy damage, and it skids to a stop short of the wall (no crash, no stun, no opening)', b.gore.hp === 100 - T.DMG[1] && b.gore.gores === 1 && b.gore.crashes === 0 && !b.gore.stun && b.gore.state === 'recover' && b.gore.gap > 60 && b.gore.text && b.gore.broken === 0, JSON.stringify(b.gore));
  check('rolling through the charge on i-frames takes no damage, and the boss carries on into the wall: stunned, a tine gone', b.dodge.rolled === 1 && b.dodge.hp === 100 && b.dodge.gores === 1 && b.dodge.crashes === 1 && b.dodge.state === 'stunned' && b.dodge.text && b.dodge.broken === 1 && b.dodge.px > 380, JSON.stringify(b.dodge));

  // the shell, tines as targets, the spike volley, the sweep, the slam and its shard ring
  const { p: p3, errs: errs3 } = await fresh('?seed=7&boss=staghorn' + W);
  b = await p3.evaluate(() => { const G = UroCrawl.state, B = G.boss, body = B.body, P = UroCrawl.player(), spikes = () => G.bullets.filter(x => x.hostile && x.shape === 'spike').length;
    const volley = () => { __S.quiet('volley'); __S.put(650, 270, Math.PI, 250, 270); UroCrawl.step(1); const st = B.state, cone = G.teles.filter(t => t.kind === 'cone')[0], dur = cone ? cone.dur : 0; __S.until(() => B.state !== 'volleyTele', 80); return { st, dur, n: spikes() }; };
    const v4 = volley(), aimAt = () => { UroCrawl.input.mode = 'touch'; UroCrawl.step(1); const t = G.aimTarget; UroCrawl.input.mode = 'kb'; return t ? t.id : null; };   // what touch auto-aim picks
    __S.quiet(); __S.put(650, 270, Math.PI, 250, 270); const aim1 = aimAt();
    const hp0 = body.hp, d25 = UroCrawl.dealDamage(body, 100, 'NEUTRAL', {}), hp1 = body.hp, dT = UroCrawl.dealDamage(B.arms[0].e, 100, 'LITHO', {}), passed = hp1 - body.hp;     // tine damage stays in the tine
    B.arms[0].e.hp = 1; UroCrawl.dealDamage(B.arms[0].e, 50, 'LITHO', {}); UroCrawl.step(2); const mul1 = body.dmgMul;
    B.arms[3].e.hp = 1; UroCrawl.dealDamage(B.arms[3].e, 50, 'LITHO', {}); UroCrawl.step(2); const mul2 = body.dmgMul, exposedText = G.texts.some(t => t.text === 'BODY EXPOSED!'), d100 = UroCrawl.dealDamage(body, 100, 'NEUTRAL', {}), hint = B.hint, aim2 = aimAt();
    const v2 = volley();
    B.arms.forEach(a => { if (!a.cracked) { a.e.hp = 1; UroCrawl.dealDamage(a.e, 50, 'LITHO', {}); } }); UroCrawl.step(2); const v0 = volley();
    return { v4, v2, v0, d25, dT, passed, mul1, mul2, exposedText, d100, hint, aim1, aim2, broken: __S.broken() }; });
  check('shell: the body takes 25% until 2 tines are broken; a tine takes LITHO ×1.75 and keeps its damage to itself; two down = BODY EXPOSED. Touch auto-aim goes for the tines first, the body after', near(b.d25, 25, 1e-9) && near(b.dT, 175, 1e-9) && b.passed === 0 && b.mul1 === T.SHELL && b.mul2 === 1 && b.exposedText && near(b.d100, 100, 1e-9) && b.hint === '' && b.aim1 === 'stagarm' && b.aim2 === 'staghorn', JSON.stringify({ d25: b.d25, dT: b.dT, mul1: b.mul1, mul2: b.mul2, aim1: b.aim1, aim2: b.aim2 }));
  check('spike volley: telegraphed 0.55 s, 2 spikes per live tine + 1 (9 with the full rack, 5 with two, none once the rack is gone)', b.v4.st === 'volleyTele' && near(b.v4.dur, T.VOLLEY_TELE) && b.v4.n === 9 && b.v2.n === 5 && b.v0.st === 'stalk' && b.v0.n === 0 && b.broken === 4, JSON.stringify([b.v4, b.v2, b.v0]));
  const { p: p4, errs: errs4 } = await fresh('?seed=7&boss=staghorn' + W);
  b = await p4.evaluate(() => { const G = UroCrawl.state, B = G.boss, body = B.body, P = UroCrawl.player(), I = UroCrawl.input;
    // sweep: in front, behind, rolled
    __S.quiet('sweep'); __S.put(600, 270, Math.PI, 500, 270); UroCrawl.step(1); const st = B.state, cone = G.teles.filter(t => t.kind === 'cone')[0], n = 1 + __S.until(() => B.state === 'sweep', 80), front = P.hp, pushed = 500 - P.x;
    __S.quiet('sweep'); __S.put(600, 270, Math.PI, 700, 270); UroCrawl.step(1); __S.until(() => B.state === 'sweep', 80); const behind = P.hp;
    __S.quiet('sweep'); __S.put(600, 270, Math.PI, 500, 270); UroCrawl.step(1); let k = 0; while (B.state === 'sweepTele' && k < 80) { if (B.stT <= 0.06 && P.roll <= 0 && P.rollCd <= 0) { I.keys.KeyA = true; I.edges.roll = true; } UroCrawl.step(1); k++; } I.keys = {}; const rolled = P.hp;
    // slam from across the room: a thud, then the shard ring arrives
    __S.quiet('slam'); __S.put(480, 270, Math.PI, 200, 150); UroCrawl.step(1); const st2 = B.state, circ = G.teles.filter(t => t.kind === 'circle')[0], jump = body.atk ? body.atk.jump : 0; let lift = 0, m = 1; while (B.state === 'slamTele' && m < 90) { lift = Math.max(lift, UroCrawl.enemyLift(body)); UroCrawl.step(1); m++; }
    const far = { hp: P.hp, shake: G.shake, flash: G.flash, punch: G.punch, stag: P.stag || 0, rings: B.rings.length, steps: m, r: circ && circ.r, r2: circ && circ.r2, dur: circ && circ.dur, jump, lift: Math.round(lift) };
    __S.until(() => !B.rings.length || B.rings[0].done, 200); const ringHit = P.hp; UroCrawl.step(30); const ringOnce = P.hp;
    // roll through the ring
    __S.quiet('slam'); __S.put(480, 270, Math.PI, 200, 150); UroCrawl.step(1); __S.until(() => B.rings.length > 0, 90); k = 0;
    while (B.rings.length && !B.rings[0].done && k < 200) { const rg = B.rings[0], gap = Math.hypot(P.x - rg.x, P.y - rg.y) - rg.r; if (gap < 26 && P.roll <= 0 && P.rollCd <= 0) { I.keys.KeyD = true; I.edges.roll = true; } UroCrawl.step(1); k++; } I.keys = {}; const ringRoll = P.hp, dodgeText = G.texts.some(t => t.text === 'DODGE');
    // under it: the slam itself, and the ring does not hit twice
    __S.quiet('slam'); __S.put(480, 270, Math.PI, 410, 270); UroCrawl.step(1); __S.until(() => B.state !== 'slamTele', 90); const under = P.hp, stag = P.stag || 0; __S.until(() => !B.rings.length, 200); const underAfter = P.hp;
    return { st, cone: cone && { r: cone.r, half: cone.half, dur: cone.dur }, n, front, pushed, behind, rolled, st2, far, ringHit, ringOnce, ringRoll, dodgeText, under, stag, underAfter }; });
  check('antler sweep: a 0.55 s cone in front of it; caught inside = 18 damage and a shove, behind it or rolling = nothing', b.st === 'sweepTele' && b.cone && b.cone.r === T.SWEEP_R && near(b.cone.dur, T.SWEEP_TELE) && b.n >= 33 && b.n <= 35 && b.front === 100 - T.SWEEP_DMG && b.pushed > 20 && b.behind === 100 && b.rolled === 100, JSON.stringify({ n: b.n, front: b.front, pushed: Math.round(b.pushed), behind: b.behind, rolled: b.rolled }));
  check('ground slam reuses groundSlam: a 0.7 s jump (red disc + tremor ring); across the room it is a thud (no damage, no stagger, no flash, shake ≤ 1.5)', b.st2 === 'slamTele' && b.far.r === T.SLAM_R && b.far.r2 === T.SLAM_R + T.SLAM_TREMOR && near(b.far.dur, T.SLAM_TELE) && b.far.jump > 20 && b.far.lift > 20 && b.far.steps >= 42 && b.far.steps <= 45 && b.far.hp === 100 && b.far.stag === 0 && b.far.flash === 0 && b.far.punch === 0 && b.far.shake <= 1.5 && b.far.rings === 1, JSON.stringify(b.far));
  check('the slam throws a ring of shards across the floor: it hits a standing surgeon once, a roll goes through it, and under the slam you take the slam (and a stagger), not both', b.ringHit === 100 - T.RING_DMG && b.ringOnce === b.ringHit && b.ringRoll === 100 && b.dodgeText && b.under === 100 - T.SLAM_DMG && b.stag > 0.3 && b.underAfter === b.under, JSON.stringify({ ringHit: b.ringHit, ringRoll: b.ringRoll, under: b.under, stag: +b.stag.toFixed(2), underAfter: b.underAfter }));

  // phase 2: infection
  const { p: p5, errs: errs5 } = await fresh('?seed=8&boss=staghorn' + W);
  b = await p5.evaluate(() => { const G = UroCrawl.state, B = G.boss, body = B.body, P = UroCrawl.player(), slime = () => G.hazards.filter(h => h.kind === 'slime');
    __S.quiet(); __S.put(650, 270, Math.PI, 250, 270); body.hp = body.maxHp * 0.65; UroCrawl.step(2);
    const a = { phase: B.phase, state: B.state, shield: body.shield, mics: __S.mics(), slime: slime().length, roar: UroCrawl.dealDamage(body, 100, 'LITHO', {}), banner: G.banner && G.banner.sub };
    UroCrawl.step(90); __S.quiet(); const dL = UroCrawl.dealDamage(body, 100, 'LITHO', {}); for (let i = 0; i < 12; i++) UroCrawl.dealDamage(body, 1, 'FLUID', { strip: 0.09 }); const stripped = body.shield <= 0;
    __S.killMics(); UroCrawl.step(60); const stays = body.shield;
    B.swarmT = 0.01; UroCrawl.step(2); const swarmTele = G.teles.filter(t => t.kind === 'flash').map(t => t.dur)[0], next = B.swarmT; UroCrawl.step(45); const swarm = __S.mics(); B.swarmT = 99; UroCrawl.step(60); const regrow = body.shield;
    // the trail, the cadence, the crash swarm, the double ring
    __S.killMics(); G.hazards.length = 0; __S.quiet('charge'); __S.put(700, 270, Math.PI, 250, 270); P.inv = 99; __S.until(() => B.state === 'stunned', 300);
    const trail = slime(), onLine = trail.filter(h => Math.abs(h.y - (270 + body.r * 0.3)) < 12).length, span = trail.length ? Math.max.apply(null, trail.map(h => h.x)) - Math.min.apply(null, trail.map(h => h.x)) : 0, cd = B.cd.charge, crashMics = __S.mics(), stun = body.st.stun ? body.st.stun.t : 0;
    const pud = trail[Math.floor(trail.length / 2)]; __S.put(body.x, body.y, B.face, pud.x, pud.y); B.state = 'recover'; B.stT = 9; __S.killMics(); UroCrawl.input.keys.KeyW = true; UroCrawl.step(8); const slow = pud.y - P.y; P.x = pud.x; P.y = 150; UroCrawl.step(8); const fast = 150 - P.y; UroCrawl.input.keys = {};
    __S.quiet('slam'); __S.put(480, 270, Math.PI, 200, 150); P.inv = 99; UroCrawl.step(1); __S.until(() => B.state !== 'slamTele', 90); const rings = B.rings.length, delay = rings > 1 ? B.rings[1].delay : 0;
    return { a, dL, stripped, stays, swarmTele, next, swarm, regrow, trail: trail.length, onLine, span, cd, crashMics, stun, slow, fast, rings, delay, T: UroCrawl.tuning.STAG }; });
  check('phase 2 at 66%: a roar nothing gets through, then the biofilm shield, a swarm out of the cracks and slime underfoot', b.a.phase === 2 && b.a.state === 'roar' && b.a.roar === 0 && b.a.shield > 0.9 && b.a.mics >= 4 && b.a.slime >= 4 && /biofilm/.test(b.a.banner), JSON.stringify(b.a));
  check('phase 2 forces the swap: LITHO is cut to a tenth by the shield, FLUID strips it, it stays off once the swarm is dead; a new swarm bursts out every 5 s (0.6 s tell) and regrows it', b.dL < 20 && b.stripped && b.stays <= 0.01 && near(b.swarmTele, 0.6) && near(b.next, T.SWARM, 0.05) && b.swarm >= 5 && b.regrow > 0.1, JSON.stringify({ dL: b.dL, stays: b.stays, swarm: b.swarm, regrow: +b.regrow.toFixed(2) }));
  check('phase 2: it leaves a slime trail along its path that slows the surgeon, charges less often (7.5–9 s), a wall crash shakes out more of the swarm, and the slam throws two rings a roll apart', b.trail >= 10 && b.onLine >= 10 && b.span > 400 && b.slow < b.fast * 0.75 && b.cd >= 7.5 && b.cd <= 9 && b.crashMics >= 3 && near(b.stun, T.STUN[2], 0.02) && b.rings === 2 && b.delay > 0.8, JSON.stringify({ trail: b.trail, span: Math.round(b.span), slow: +b.slow.toFixed(1), fast: +b.fast.toFixed(1), cd: +b.cd.toFixed(2), crashMics: b.crashMics, rings: b.rings, delay: b.delay }));
  await shot(p5, 'p-infection');

  // phase 3: the core runner
  const { p: p6, errs: errs6 } = await fresh('?seed=9&boss=staghorn' + W);
  b = await p6.evaluate(() => { const G = UroCrawl.state, B = G.boss, body = B.body, P = UroCrawl.player(), T = UroCrawl.tuning.STAG;
    __S.quiet(); __S.put(650, 270, Math.PI, 250, 270); body.hp = body.maxHp * 0.32; UroCrawl.step(3);
    const a = { phase: B.phase, state: B.state, r: body.r, core: !!body.coreExposed, broken: __S.broken(), shield: body.shield, roar: UroCrawl.dealDamage(body, 100, 'LITHO', {}), next: B.cd.spiral < 1 };
    UroCrawl.step(90); __S.quiet(); const d9 = UroCrawl.dealDamage(body, 10, 'FLUID', {});
    // a chain of two dashes, each behind its own 0.5 s lane; then a third that reaches the wall
    const chain = (n, bx, px) => { __S.quiet('charge'); __S.put(bx, 270, 0, px, 270); P.inv = 99; UroCrawl.step(1); const rolled = B.chain, tele = G.teles.filter(t => t.kind === 'line')[0], dur = tele ? tele.dur : 0; B.chain = n; const c0 = B.crashes;
      let digs = 1, prev = 'dig', spd = 0, dash = 0, cur = 0, k = 0; while ((B.state === 'dig' || B.state === 'charge') && k < 400) { UroCrawl.step(1); k++; if (B.state === 'dig' && prev !== 'dig') digs++; if (B.state === 'charge') { cur++; spd = Math.max(spd, Math.hypot(body.vx, body.vy)); } else { dash = Math.max(dash, cur); cur = 0; } prev = B.state; }
      return { rolled, dur, digs, spd, dash, end: B.state, crashed: B.crashes - c0, stun: body.st.stun ? body.st.stun.t : 0 }; };
    const two = chain(2, 120, 900), three = chain(3, 120, 900);
    // spiral, then the ring with a gap
    __S.quiet('spiral'); __S.put(480, 270, 0, 200, 270); P.inv = 99; UroCrawl.step(1); const st = B.state, tell = G.teles.filter(t => t.kind === 'flash')[0], tdur = tell ? tell.dur : 0; __S.until(() => B.state === 'spiral', 80); const spin = __S.until(() => B.state !== 'spiral', 300), spiral = G.bullets.filter(x => x.hostile).length, ringTell = G.teles.filter(t => t.kind === 'flash').map(t => t.dur)[0];
    G.bullets.length = 0; UroCrawl.step(33); const ring = G.bullets.filter(x => x.hostile && x.r === 8).map(x => Math.atan2(x.vy, x.vx)).sort((p, q) => p - q); let gap = 0; for (let i = 0; i < ring.length; i++) { const nx = i + 1 < ring.length ? ring[i + 1] : ring[0] + Math.PI * 2; gap = Math.max(gap, nx - ring[i]); }
    // fragmentation
    __S.quiet('frag'); __S.put(480, 270, 0, 200, 270); P.inv = 99; UroCrawl.step(1); const st2 = B.state, ftell = G.teles.filter(t => t.kind === 'flash').map(t => t.dur)[0]; __S.until(() => B.state !== 'fragTele', 80); const shards = G.bullets.filter(x => x.hostile && x.suckable).length;
    return { a, d9, two, three, st, tdur, spin, spiral, ringTell, ring: ring.length, gap, st2, ftell, shards, walk: T.WALK }; });
  check('phase 3 at 33%: the shell and every remaining tine shatter, leaving a smaller core that takes ×1.5 from every class', b.a.phase === 3 && b.a.state === 'roar' && b.a.roar === 0 && b.a.r === T.CORE_R && T.CORE_R < T.R && b.a.core && b.a.broken === 4 && b.a.shield === 0 && near(b.d9, 9, 1e-9) && b.walk[3] > b.walk[1] * 1.5, JSON.stringify(Object.assign({ d9: b.d9 }, b.a)));
  check('the core chain-dashes 2–3 times, each behind a 0.5 s lane, faster than the beast; a dash that reaches the wall stuns it for only 1.2 s', (b.two.rolled === 2 || b.two.rolled === 3) && near(b.two.dur, T.DIG[3]) && T.DIG[3] === 0.5 && b.two.digs === 2 && b.two.end === 'recover' && b.two.crashed === 0 && near(b.two.spd, T.SPD[3], 0.5) && T.SPD[3] > T.SPD[1] && b.two.dash <= 29 && b.three.digs === 3 && b.three.end === 'stunned' && b.three.crashed === 1 && near(b.three.stun, T.STUN[3], 0.02) && T.STUN[3] === 1.2, JSON.stringify({ two: b.two, three: b.three }));
  check('core patterns are telegraphed and leave a way through: a two-armed spiral (0.6 s tell), a ring with a gap (0.5 s tell), a fragmentation burst of suckable shards (0.8 s tell)', b.st === 'spiralTele' && near(b.tdur, 0.6) && b.spin >= 140 && b.spiral > 20 && near(b.ringTell, 0.5) && b.ring >= 10 && b.ring <= 13 && b.gap > 0.9 && b.st2 === 'fragTele' && near(b.ftell, 0.8) && b.shards === 26, JSON.stringify({ spin: b.spin, spiral: b.spiral, ring: b.ring, gap: +b.gap.toFixed(2), shards: b.shards }));
  await shot(p6, 'p-core');

  // a full fight, played: no god mode, starting loadout, the bot reads the telegraphs
  for (const cx of browser.contexts()) if (cx !== p.context()) await cx.close();   // the win sequence below runs on the real clock: close every other page first (as block Q does), or forty animating pages starve it
  let minTele = 9; const kinds = {}, runs = [];
  for (const seed of [11, 42]) {
    const o = await open('?seed=' + seed + '&boss=staghorn'); await o.p.evaluate(STAGLIB);
    const r = await o.p.evaluate(() => { UroCrawl.startRun(); UroCrawl.step(160); return __stagBot(60 * 240, {}); });
    minTele = Math.min(minTele, r.minTele); Object.assign(kinds, r.kinds); runs.push(r);
    check('autoplay seed ' + seed + ': the surgeon duels it through all three phases and kills it (no god mode)', r.won && !r.dead && r.phase === 3 && r.phaseAt[2] > 5 && r.phaseAt[3] > r.phaseAt[2] + 5 && r.secs > r.phaseAt[3] + 3 && r.secs >= 45 && r.secs <= 150 && r.crashes >= 2 && r.hp > 0, r.secs + ' s · phases at ' + JSON.stringify(r.phaseAt) + ' · hp left ' + r.hp + ' · took ' + r.taken + ' · wall crashes ' + r.crashes + ' · gored ' + r.gores + ' · rolls ' + r.rolls);
    if (seed === 42) {
      const shards = r.shards; await o.p.waitForTimeout(2200);   // the slow-mo ending runs on the real clock: shards land and pop into coins
      const coins = await o.p.evaluate(() => { const G = UroCrawl.state; return { coins: G.pickups.filter(x => x.kind === 'coin').length, left: G.bullets.filter(x => x.kind === 'shard').length, scale: G.timeScale }; });
      await shot(o.p, 'p-death'); await o.p.waitForFunction(() => UroCrawl.state.overlay === 'summary', null, { timeout: 8000 });
      const end = await o.p.evaluate(() => ({ title: document.getElementById('sumTitle').textContent, sub: document.getElementById('sumSub').textContent, rvu: UroCrawl.state.stats.rvu }));
      check('death: slow-mo, the core bursts into shards and the shards pop into coins; then the STONE FREE summary', shards === 40 && coins.left < shards && (coins.coins > 0 || end.rvu > 0) && end.title === 'DISCHARGED!' && /Staghorn is rubble/.test(end.sub), JSON.stringify({ shards, coins, rvu: end.rvu }));
    }
    errs.push(...o.errs); await o.p.close();
  }
  check('every Staghorn attack seen in those fights was telegraphed for at least 0.5 s (lane, cone, circle, flash)', minTele >= 0.5 && kinds.line && kinds.cone && kinds.circle && kinds.flash, 'shortest ' + minTele + ' s · ' + Object.keys(kinds).join(','));
  const best = await p.evaluate(() => { const E = UroCrawl.tables.ENEMIES; return { fact: E.staghorn.fact, hidden: !!E.staghorn.hidden, tine: !!E.stagarm.hidden, name: E.stagarm.name }; });
  check('bestiary: "Staghorn calculi fill the renal pelvis and calyces like antlers"; the tines stay hidden parts', /^Staghorn calculi fill the renal pelvis and calyces like antlers/.test(best.fact) && !best.hidden && best.tine && best.name === 'Antler Tine', best.fact);
  errCheck('P', errs.concat(errs2, errs3, errs4, errs5, errs6));
});

// ───────── Q. the Giant TURP (roadmap Step 2): flow meter, capsule, three sections, landmarks, the curse ─────────
// __T: quiet the boss, clean the room, finish a lobe with a laser (nothing goes into the capsule), pick a weapon.
// __turpBot: a surgeon that plays the fight for real with the default boss loadout (analog movement, mouse aim, held fire):
// scalpel on the lobes, the flap and the droplets, Bovie on bleeders, out of every telegraphed circle, sidestepping drops, and
// never a swing whose arc would reach a landmark.
const TURPLIB = `
  window.__T = {
    calm: function () { const B = UroCrawl.state.boss; B.slamT = 999; B.swellT = 999; B.dripT = 999; B.addT = 999; B.hoserCd = 999; if (B.valve) B.valve.t = 999; },
    clean: function () { const G = UroCrawl.state, P = UroCrawl.player(), I = UroCrawl.input; G.teles.length = 0; G.bullets.length = 0; G.texts.length = 0; G.notice = null; G.banner = null; P.hp = P.maxHp; P.inv = 0; P.roll = 0; P.rollCd = 0; P.stag = 0; P.tur = 0; I.mode = 'kb'; I.keys = {}; I.stick = null; I.mouseFire = false; I.edges = {}; },
    finish: function (L) { for (let i = 0; i < 400 && !L.done; i++) UroCrawl.dealDamage(L.e, 20, 'LITHO', { wid: 'holmium' }); },
    use: function (id) { const G = UroCrawl.state, i = G.weapons.findIndex(w => w.id === id); UroCrawl.selectWeapon(i); G.swapT = 0; return G.weapons[i]; },
    kill: function (id) { UroCrawl.state.enemies.forEach(e => { if (e.id === id) { e.silent = true; e.special = null; e.minHp = 0; e.hp = 0; } }); },
    urine: function () { return UroCrawl.state.hazards.filter(h => h.urine); }
  };
  window.__turpBot = function (maxSteps) {
    const G = UroCrawl.state, P = UroCrawl.player(), I = UroCrawl.input, B = G.boss;
    const D = (a, b) => Math.hypot(a.x - b.x, a.y - b.y), slot = id => G.weapons.findIndex(w => w.id === id), AD = (a, b) => { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return Math.abs(d); };
    const log = { steps: 0, t0: G.time, secAt: {}, hits: [], rolls: 0, minTele: 9, kinds: {}, won: false, dead: false, valve: 0 };
    I.mode = 'kb'; let hp = P.hp;
    const safe = (x, y, tgt, reach, half) => G.landmarks.every(L => { const d = Math.hypot(L.e.x - x, L.e.y - y); if (d - L.e.r > reach + 12) return true; return AD(Math.atan2(tgt.y - y, tgt.x - x), Math.atan2(L.e.y - y, L.e.x - x)) > half + 0.3 && d > L.e.r + 16; });
    for (let n = 0; n < maxSteps && !G.over; n++) {
      const hz = B.hoser;
      if (log.secAt[B.sec] === undefined) log.secAt[B.sec] = +(G.time - log.t0).toFixed(1);
      G.teles.forEach(t => { if (t.kind !== 'spawn') { log.minTele = Math.min(log.minTele, t.dur); log.kinds[t.kind] = 1; } });
      if (B.valve) log.valve = Math.max(log.valve, B.valve.clears);
      if (B.slide || G.introT > 0) { I.mouseFire = false; I.stick = null; UroCrawl.step(1); log.steps++; hp = P.hp; continue; }
      let tgt = null, want = 'scalpel', reach = 70, half = 1.25, stand = 34;
      const live = B.lobes.filter(L => !L.done && !L.blocked), hole = G.enemies.find(e => e.id === 'perfhole' && !e.dead);
      const adds = G.enemies.filter(e => e.id === 'nocturia' && !e.dead && e.spawnT <= 0 && D(e, P) < 95).sort((p, q) => D(p, P) - D(q, P));
      if (hz && hz.state === 'open' && hz.e && slot('bovie') >= 0) { tgt = hz.e; want = 'bovie'; reach = 170; half = 0.75; stand = 46; }
      else if (hole && slot('bovie') >= 0) { tgt = hole; want = 'bovie'; reach = 170; half = 0.75; stand = 50; }
      else if (B.bnc && B.bncE) tgt = B.bncE;
      else if (adds.length) { tgt = adds[0]; stand = 30; }
      else if (B.valve && B.valve.shut && B.flap) { tgt = B.flap; stand = 30; }
      else if (live.length) tgt = live.map(L => L.e).sort((p, q) => D(p, P) - D(q, P))[0];
      const ws = slot(want); if (ws >= 0 && G.wIndex !== ws) UroCrawl.selectWeapon(ws);
      const w = G.weapons[G.wIndex]; if (w.id === 'bovie' && tgt && tgt.id === 'perfhole' && w.mode !== 1) I.edges.alt = true;
      let mx = 0, my = 0, roll = false, fire = false;
      if (tgt) {
        let best = null, bd = 1e9;
        for (let k = 0; k < 20; k++) { const a = k / 20 * Math.PI * 2, x = tgt.x + Math.cos(a) * (tgt.r + stand), y = tgt.y + Math.sin(a) * (tgt.r + stand); if (!UroCrawl.insideArena(x, y, 16) || !safe(x, y, tgt, reach, half)) continue; const d = D({ x, y }, P); if (d < bd) { bd = d; best = { x, y }; } }
        if (best) { const dx = best.x - P.x, dy = best.y - P.y, dd = Math.hypot(dx, dy); if (dd > 5) { mx = dx / dd; my = dy / dd; } }
        I.mx = tgt.x; I.my = tgt.y;
        fire = D(tgt, P) - tgt.r < (w.id === 'bovie' ? 120 : 52) && safe(P.x, P.y, tgt, reach, half);
      }
      for (const t of G.teles) { if (t.kind !== 'circle') continue; const rr = (t.r2 || t.r) + 16, d = D(t, P); if (d < rr) { const a = d > 1 ? Math.atan2(P.y - t.y, P.x - t.x) : 0; let ex = Math.cos(a), ey = Math.sin(a); if (!UroCrawl.insideArena(P.x + ex * 60, P.y + ey * 60, 14)) { const a2 = a + (UroCrawl.insideArena(P.x + Math.cos(a + 1.3) * 60, P.y + Math.sin(a + 1.3) * 60, 14) ? 1.3 : -1.3); ex = Math.cos(a2); ey = Math.sin(a2); } mx = ex; my = ey; if (t.t < 0.25 && d < t.r + 8) roll = true; } }
      let worst = null;
      for (const b of G.bullets) {
        if (!b.hostile || b.kind === 'lob') continue; const rxp = P.x - b.x, ryp = P.y - b.y, v2 = b.vx * b.vx + b.vy * b.vy; if (v2 < 1) continue;
        const tca = (rxp * b.vx + ryp * b.vy) / v2; if (tca < 0 || tca > 0.5) continue;
        const cx = rxp - b.vx * tca, cy = ryp - b.vy * tca, miss = Math.hypot(cx, cy); if (miss > 28) continue;
        if (!worst || tca < worst.tca) worst = { tca, miss, b, cx, cy };
      }
      if (worst && !roll) { const v = Math.hypot(worst.b.vx, worst.b.vy), nx = -worst.b.vy / v, ny = worst.b.vx / v, s = (worst.cx * nx + worst.cy * ny) >= 0 ? 1 : -1; mx = nx * s; my = ny * s; if (worst.tca < 0.14 && worst.miss < 18) roll = true; }
      const mm = Math.hypot(mx, my); if (mm > 1) { mx /= mm; my /= mm; }
      I.stick = { bx: 0, by: 0, kx: mx * 48, ky: my * 48 }; I.mouseFire = fire;
      if (roll && P.rollCd <= 0 && P.roll <= 0 && mm > 0.2) { I.edges.roll = true; log.rolls++; }
      UroCrawl.step(1); log.steps++;
      if (P.hp < hp - 0.01) log.hits.push([+(G.time - log.t0).toFixed(1), Math.round(hp - P.hp), B.sec]); hp = P.hp;
    }
    I.stick = null; I.mouseFire = false;
    log.won = G.won; log.dead = G.over && !G.won; log.secs = +(G.time - log.t0).toFixed(1); log.hp = Math.round(P.hp); log.sec = B.sec; log.q = +(G.finalQ || B.q).toFixed(1);
    log.taken = log.hits.reduce((s, h) => s + h[1], 0); log.hosers = B.hosers; log.sealed = B.sealed; log.perfs = G.wall ? G.wall.perforations : 0; log.swells = B.swells; log.scar = +B.scar.toFixed(2); log.bnc = B.bncN; log.ureters = B.ureters; log.cursed = !!G.incont;
    return log;
  };
`;
await block('Q. giant turp', async () => {
  // past the 2.6 s intro; timeScale 0 means only step() advances the sim
  const fresh = async (q) => { const o = await open(q); await o.p.evaluate(TURPLIB); await o.p.evaluate(() => { UroCrawl.startRun(); UroCrawl.input.mode = 'kb'; UroCrawl.step(170); UroCrawl.state.timeScale = 0; }); return o; };
  const near = (a, b, eps) => Math.abs(a - b) <= (eps === undefined ? 0.011 : eps), allErrs = [];

  // ── the arena is the boss; the flow meter; capsule fibers ──
  const { p, errs } = await fresh('?seed=5&boss=bph&weapons=scalpel,loop,roller,irrigation'); allErrs.push(errs);
  let b = await p.evaluate(() => { const G = UroCrawl.state, B = G.boss, Wl = G.wall, T = UroCrawl.tuning.BPH, tags = {}; Wl.segs.forEach(s => { tags[s.tag] = (tags[s.tag] || 0) + 1; });
    const hp0 = B.body.hp, d = UroCrawl.dealDamage(B.body, 500, 'CUT', { wid: 'loop' }), P = UroCrawl.player(); UroCrawl.input.mx = B.body.x; UroCrawl.input.my = B.body.y; P.x = B.body.x - 50; P.y = B.body.y; UroCrawl.input.mouseFire = true; UroCrawl.step(40); UroCrawl.input.mouseFire = false;
    return { kind: B.kind, name: B.name, dungeon: G.dungeon.name, arena: !!G.arena, segs: Wl.segs.length, tags, live: Wl.live, lobes: B.lobes.map(L => L.kind + (L.neck ? '*' : '')).join(), lm: G.landmarks.map(L => L.id).join(), flap: !!B.flap, q: B.q, d, bodyHp: B.body.hp === hp0, over: G.over, Q0: T.Q0, WIN: T.WIN, TOP: T.TOP,
      total: T.Q0 + [1, 2, 3].reduce((s, k) => s + T.SEC[k].lobes.reduce((a, l) => a + l.q, 0), 0), phases: B.phases.join('|'), fam: B.lobes.every(L => L.e.family === 'BENIGN') }; });
  check('?boss=bph: The Giant TURP in a round capsule arena (9 segments, all NECK), three adenoma lobes on the wall, two ureteric orifices, the BENIGN dungeon', b.kind === 'bph' && b.name === 'THE GIANT TURP' && b.dungeon === 'BENIGN' && b.arena && b.segs === 9 && b.tags.NECK === 9 && b.live && b.lobes === 'median,collar*,collar*' && b.lm === 'ureter,ureter' && b.flap && b.fam && b.phases === 'BLADDER NECK|LATERAL LOBES|APEX', b.lobes);
  check('no health bar: the gland cannot be damaged; the fight is a flow meter from 4 ml/s to the win line at 20 (a perfect resection is 24)', b.d === 0 && b.bodyHp && !b.over && b.q === 4 && b.Q0 === 4 && b.WIN === 20 && b.TOP === 24 && near(b.total, 24, 1e-9), JSON.stringify({ q: b.q, total: b.total }));
  b = await p.evaluate(() => { const G = UroCrawl.state, B = G.boss, L = B.lobes[1], e = L.e, M = e.maxHp - 1, T = UroCrawl.tuning.BPH; __T.calm(); __T.clean();
    e.hp = 1 + M * 0.7; UroCrawl.step(2); const q30 = B.q, fib30 = L.fib, r30 = e.r;
    e.hp = 1 + M * 0.2; UroCrawl.step(30); const q80 = B.q, fib80 = L.fib, r80 = e.r;
    __T.finish(L); UroCrawl.step(2); const texts = G.texts.map(t => t.text);
    return { q30, fib30, q80, fib80, r30, r80, done: L.done, qDone: B.q, fibDone: L.fib, perf: L.seg.perf, said: texts.indexOf('CAPSULE FIBERS') >= 0, bed: typeof e.special === 'function', noAim: !!e.noAim, hp: e.hp, share: L.q, part: T.PARTIAL, fibAt: T.FIBERS, prog: B.secProg, rvu: G.rvu }; });
  check('a lobe is worth 40% of its share while it is being resected: 30% out = +0.16 ml/s, 80% out = +0.42, and it shrinks as it goes', near(b.q30, 4 + b.share * b.part * 0.3, 1e-6) && near(b.q80, 4 + b.share * b.part * 0.8, 1e-6) && b.r80 < b.r30 - 3, JSON.stringify({ q30: +b.q30.toFixed(3), q80: +b.q80.toFixed(3), r30: +b.r30.toFixed(1), r80: +b.r80.toFixed(1) }));
  check('capsule fibers are the progress cue: none at 30%, showing past ' + Math.round(b.fibAt * 100) + '%, all of them when the lobe is done, and the flow jumps to the full share', b.fib30 === 0 && near(b.fib80, (0.8 - b.fibAt) / (1 - b.fibAt), 1e-6) && b.done && b.fibDone === 1 && near(b.qDone, 4 + b.share, 1e-9) && b.said && b.bed && b.noAim && b.hp === 1, JSON.stringify({ fib80: +b.fib80.toFixed(3), qDone: b.qDone }));
  check('a laser finish (holmium, HoLEP-style) puts nothing into the capsule', b.perf === 0, 'perf ' + b.perf);
  b = await p.evaluate(() => { const G = UroCrawl.state, B = G.boss, M = B.lobes[0], e = M.e, conf = () => G.parts.filter(x => x.kind === 'confetti').length, scar0 = B.scar; G.parts.length = 0;
    const scalpel = UroCrawl.dealDamage(e, 10, 'CUT', { wid: 'scalpel' }), c0 = conf(), loop = UroCrawl.dealDamage(e, 10, 'CUT', { wid: 'loop' }), c1 = conf(), holmium = UroCrawl.dealDamage(e, 10, 'LITHO', { wid: 'holmium' }), eswl = UroCrawl.dealDamage(e, 10, 'LITHO', { wid: 'eswl' }), aqua = UroCrawl.dealDamage(e, 10, 'FLUID', { wid: 'aquablation' }), green = UroCrawl.dealDamage(e, 10, 'ENERGY', { wid: 'greenlight' });
    return { scalpel, loop, holmium, eswl, aqua, green, chips: c1 - c0, scar: B.scar - scar0 }; });
  check('the Resectoscope Loop is the signature tool: ×1.5 on adenoma with chips flying; HoLEP lasers, GreenLight and the waterjet work well too', near(b.loop, b.scalpel * 1.5, 1e-6) && near(b.scalpel, 12.5, 1e-6) && b.chips >= 3 && near(b.holmium, 12, 1e-6) && near(b.eswl, 6, 1e-6) && near(b.aqua, 15, 1e-6) && b.green > 20 && b.scar === 0, JSON.stringify(b));

  // ── cutting through the fibers: overcut, the bed, perforation, plug ──
  b = await p.evaluate(() => { const G = UroCrawl.state, B = G.boss, Wl = G.wall, P = UroCrawl.player(), L = B.lobes[2], e = L.e, seg = L.seg, T = UroCrawl.tuning, out = {}; __T.clean(); G.rvu = 0;
    e.hp = 11; const d = UroCrawl.dealDamage(e, 40, 'CUT', { wid: 'scalpel' }); out.over = { d, done: L.done, perf: seg.perf, want: (d - 10) * T.BPH.PERF_MUL / T.PERF.FILL };
    UroCrawl.dealDamage(e, 50, 'LITHO', { wid: 'holmium' }); UroCrawl.dealDamage(e, 50, 'FLUID', { wid: 'irrigation' }); out.safe = seg.perf;
    UroCrawl.dealDamage(e, 30, 'CUT', { wid: 'loop' }); out.cut = seg.perf; UroCrawl.dealDamage(e, 30, 'ENERGY', { wid: 'roller' }); out.energy = seg.perf; out.deep = G.texts.some(t => t.text === 'TOO DEEP');
    G.texts.length = 0; UroCrawl.dealDamage(e, 20, 'CUT', { wid: 'scalpel' }); out.thin = { perf: seg.perf, said: G.texts.some(t => t.text === 'CAPSULE THINNING'), open: seg.open };
    UroCrawl.step(2); const q0 = B.q, noct0 = G.enemies.filter(x => x.id === 'nocturia').length; P.hp = P.maxHp = 100;
    UroCrawl.dealDamage(e, 100, 'CUT', { wid: 'loop' }); UroCrawl.step(2);
    out.perf = { open: seg.open, hole: !!seg.hole, flood: G.hazards.filter(h => h.kind === 'flood').length, noct: G.enemies.filter(x => x.id === 'nocturia').length - noct0, hpLoss: 100 - P.hp, alert: Wl.alert && Wl.alert.text, blocked: L.blocked, qDrop: q0 - B.q, share: L.q, n: Wl.perforations, stopped: G.texts.some(t => t.text === 'PROGRESS STOPPED'), kind: T.PERF_KINDS.NECK };
    UroCrawl.dealDamage(seg.hole, 1, 'ENERGY', { wid: 'roller', cauterize: true }); UroCrawl.step(2);
    out.plug = { open: seg.open, sealed: seg.sealed, blocked: L.blocked, q: B.q, q0, plugs: Wl.plugs, hole: G.enemies.filter(x => x.id === 'perfhole' && !x.dead).length, resumed: G.texts.some(t => t.text === 'PROGRESS RESUMES') };
    return out; });
  check('overcut: what the last stroke had left over goes into that wall segment (×0.6), and steel or heat on a finished bed keeps thinning it; lasers and water do not', b.over.done && near(b.over.perf, b.over.want, 1e-9) && near(b.over.perf, 0.2, 1e-9) && b.safe === b.over.perf && near(b.cut, 0.35, 1e-9) && near(b.energy, 0.5, 1e-9) && b.deep, JSON.stringify({ over: b.over.perf, cut: b.cut, energy: b.energy }));
  check('CAPSULE THINNING is called at 60%', near(b.thin.perf, 0.6, 1e-9) && b.thin.said && !b.thin.open);
  check('capsule perforation: hole, flood, two Nocturia droplets leak in, 8 damage, and that lobe stops counting until it is sealed', b.perf.open && b.perf.hole && b.perf.flood === 1 && b.perf.noct === 2 && b.perf.hpLoss === 8 && b.perf.kind.dmg === 8 && b.perf.alert === 'BLADDER NECK UNDERMINED' && b.perf.blocked && near(b.perf.qDrop, b.perf.share, 1e-9) && b.perf.stopped && b.perf.n === 1, JSON.stringify({ noct: b.perf.noct, hpLoss: b.perf.hpLoss, qDrop: b.perf.qDrop, alert: b.perf.alert }));
  check('a cauterizing hit on the hole plugs it: sealed, the lobe counts again', !b.plug.open && b.plug.sealed && !b.plug.blocked && near(b.plug.q, b.plug.q0, 1e-9) && b.plug.plugs === 1 && b.plug.hole === 0 && b.plug.resumed, JSON.stringify(b.plug));
  b = await p.evaluate(() => { const G = UroCrawl.state, B = G.boss, Wl = G.wall, P = UroCrawl.player(), M = B.lobes[0], seg = M.seg, out = {}; __T.clean(); __T.kill('nocturia'); UroCrawl.step(1);
    const q0 = B.q; UroCrawl.wallPerforate(seg); UroCrawl.step(2); out.live = { blocked: M.blocked, inv: !!M.e.inv, d: UroCrawl.dealDamage(M.e, 50, 'CUT', { wid: 'loop' }), qLess: q0 - B.q > 0.01 };
    // tamponade: a Foley balloon held over the hole
    G.maxWeapons = 5; UroCrawl.giveWeapon('foley'); __T.use('foley'); const hp = UroCrawl.wallPoint(seg, 6); P.x = hp.x - 50; P.y = hp.y; UroCrawl.input.mx = hp.x; UroCrawl.input.my = hp.y; UroCrawl.input.mouseFire = true; let n = 0;
    while (seg.open && n < 200) { __T.kill('nocturia'); UroCrawl.step(1); G.bullets.length = 0; P.hp = 100; P.x = hp.x - 50; P.y = hp.y; n++; } UroCrawl.input.mouseFire = false; UroCrawl.step(2);
    out.foley = { open: seg.open, sealed: seg.sealed, steps: n, blocked: M.blocked, d: UroCrawl.dealDamage(M.e, 10, 'CUT', { wid: 'scalpel' }) };
    // left alone: chronic. The lobe counts again, the hole keeps leaking
    __T.use('scalpel'); P.x = 200; P.y = 282; UroCrawl.wallPerforate(seg); UroCrawl.step(2); const blocked = M.blocked; for (let i = 0; i < 60 * 6; i++) { UroCrawl.step(1); P.hp = 100; if (i % 30 === 0) __T.kill('nocturia'); }
    __T.kill('nocturia'); UroCrawl.step(1); const n0 = G.enemies.filter(x => x.id === 'nocturia').length; for (let i = 0; i < 60 * 8; i++) { UroCrawl.step(1); P.hp = 100; }
    out.chronic = { blocked, chronic: seg.chronic, after: M.blocked, d: UroCrawl.dealDamage(M.e, 10, 'CUT', { wid: 'scalpel' }), leaked: G.enemies.filter(x => x.id === 'nocturia').length - n0, n: Wl.perforations, plugs: Wl.plugs };
    __T.kill('nocturia'); UroCrawl.step(1); return out; });
  check('a lobe sitting on an open perforation cannot be resected (PLUG THE CAPSULE FIRST) and stops counting', b.live.blocked && b.live.inv && b.live.d === 0 && b.live.qLess, JSON.stringify(b.live));
  check('holding a Foley balloon over the hole tamponades it; the lobe is resectable again', !b.foley.open && b.foley.sealed && !b.foley.blocked && b.foley.d > 0 && b.foley.steps < 330, b.foley.steps + ' steps');
  check('a hole left for 5.5 s is chronic: the lobe counts again but the capsule keeps leaking droplets', b.chronic.blocked && b.chronic.chronic && !b.chronic.after && b.chronic.d > 0 && b.chronic.leaked >= 1 && b.chronic.n === 3 && b.chronic.plugs === 2, JSON.stringify(b.chronic));
  await p.waitForTimeout(250); await shot(p, 'q-neck');

  // ── swelling, the ball valve and retention, finasteride and tamsulosin ──
  const { p: p2, errs: errs2 } = await fresh('?seed=6&boss=bph&weapons=scalpel,holmium'); allErrs.push(errs2);
  b = await p2.evaluate(() => { const G = UroCrawl.state, B = G.boss, P = UroCrawl.player(), T = UroCrawl.tuning.BPH, out = {}; __T.calm(); __T.clean(); P.x = 200; P.y = 282;
    const rx0 = G.arena.rx, r0 = B.lobes[1].e.r; B.swellT = 0.01; UroCrawl.step(1); const tl = G.teles.filter(t => t.kind === 'flash'); out.tele = { n: tl.length, dur: tl[0] && tl[0].dur, swell: B.swell, notice: G.notice && G.notice.text };
    UroCrawl.step(58); const before = B.swell; UroCrawl.step(4); const after = B.swell; UroCrawl.step(60); out.pulse = { before, after, rx: G.arena.rx, rx0, wall: G.wall.rx, r: B.lobes[1].e.r, r0, want: rx0 * (1 - T.SHRINK * T.SWELL_STEP) };
    P.x = 5; P.y = 282; UroCrawl.step(2); out.kept = UroCrawl.insideArena(P.x, P.y, P.r - 0.01); P.x = 200;
    const s0 = B.swell; UroCrawl.dealDamage(B.lobes[2].e, 100, 'LITHO', { wid: 'holmium' }); const s1 = B.swell; __T.finish(B.lobes[2]); out.back = { hit: s0 - s1, done: B.swell };
    const rate = () => { B.swellT = 100; UroCrawl.step(60); return 100 - B.swellT; }; out.base = rate(); B.swellT = 100; for (let i = 0; i < 60; i++) { B.ret = 1; UroCrawl.step(1); } out.ret = 100 - B.swellT; B.ret = 0; __T.clean();
    UroCrawl.giveBoon('tamsulosin'); out.tam = rate(); UroCrawl.dropBoon('tamsulosin'); UroCrawl.giveBoon('finasteride'); out.fin = rate(); UroCrawl.dropBoon('finasteride'); B.swellT = 999;
    return out; });
  check('the adenoma swells every ~10 s behind a 1 s telegraph on every live lobe, and the playable arena shrinks with it (the surgeon is kept inside)', b.tele.n === 3 && b.tele.dur === 1 && b.tele.swell === 0 && /swells/.test(b.tele.notice) && b.pulse.before === 0 && near(b.pulse.after, 0.25, 1e-9) && near(b.pulse.rx, b.pulse.want, 0.01) && near(b.pulse.wall, b.pulse.rx, 1e-9) && b.pulse.r > b.pulse.r0 && b.kept, JSON.stringify(b.pulse));
  check('resecting pushes it back: a little per stroke, 0.3 for every lobe finished', b.back.hit > 0.05 && b.back.done === 0, JSON.stringify(b.back));
  check('swelling comes faster in retention (×2.5 at full) and slower on Tamsulosin (÷1.15) or Finasteride (÷1.2)', near(b.base, 1, 1e-6) && near(b.ret, 2.5, 1e-6) && near(b.tam, 1 / 1.15, 1e-6) && near(b.fin, 1 / 1.2, 1e-6), JSON.stringify({ base: b.base, ret: b.ret, tam: +b.tam.toFixed(3), fin: +b.fin.toFixed(3) }));
  b = await p2.evaluate(() => { const G = UroCrawl.state, B = G.boss, P = UroCrawl.player(), I = UroCrawl.input, v = B.valve, fl = B.flap, T = UroCrawl.tuning.BPH, out = {}; __T.clean(); B.swell = 0;
    const hitOpen = UroCrawl.dealDamage(fl, 20, 'CUT', { wid: 'scalpel' }); out.open0 = { shut: v.shut, noHit: !!fl.noHit, noAim: !!fl.noAim };
    v.t = 1; let n = 0; while (!v.tele && n < 60) { UroCrawl.step(1); n++; } const tl = G.teles.filter(t => t.e === fl)[0]; out.tele = { at: +v.t.toFixed(2), dur: tl && tl.dur };
    n = 0; while (!v.shut && n < 80) { UroCrawl.step(1); n++; } out.shut = { steps: n, noHit: !!fl.noHit, notice: G.notice && G.notice.text };
    UroCrawl.step(60); out.rise = B.ret; UroCrawl.dealDamage(fl, 30, 'LITHO', { wid: 'holmium' }); UroCrawl.dealDamage(fl, 30, 'FLUID', { wid: 'irrigation' }); out.resist = { shut: v.shut, hint: G.texts.some(t => /CAUTERIZE the flap/.test(t.text)) };
    // a real scalpel slash on the flap
    __T.use('scalpel'); P.x = fl.x - 44; P.y = fl.y; I.mx = fl.x; I.my = fl.y; I.mouseFire = true; n = 0; while (v.shut && n < 40) { UroCrawl.step(1); n++; } I.mouseFire = false;
    const r1 = B.ret, said = G.texts.some(t => t.text === 'VALVE CLEARED'), hid = !!fl.noHit; UroCrawl.step(60); out.clear = { shut: v.shut, clears: v.clears, steps: n, drain: r1 - B.ret, said, hid };
    // acute retention
    __T.clean(); P.x = 200; P.y = 282; v.shut = true; B.ret = 0.999; UroCrawl.step(2); const bt = G.teles.filter(t => t.e === fl)[0]; out.acute = { tele: bt && bt.dur, bullets0: G.bullets.length };
    UroCrawl.step(40); out.acute.bullets = G.bullets.filter(x => x.hostile).length; out.acute.ret = B.ret; out.acute.swell = B.swell; G.bullets.length = 0;
    __T.finish(B.lobes[0]); UroCrawl.step(2); out.gone = { valve: B.valve === null, flap: B.flap === null, live: G.enemies.filter(e => e.id === 'bphflap' && !e.dead).length };
    return out; });
  check('the median lobe is a ball valve: its flap shuts (0.8 s telegraph) and the retention meter rises; an open flap is not a target at all', !b.open0.shut && b.open0.noHit && b.open0.noAim && near(b.tele.dur, 0.8, 1e-9) && b.tele.at <= 0.8 && !b.shut.noHit && /Ball valve/.test(b.shut.notice) && near(b.rise, 0.1, 0.005), JSON.stringify({ tele: b.tele, rise: +b.rise.toFixed(3) }));
  check('a laser or water on the shut flap does nothing; a cut clears it and retention drains', b.resist.shut && b.resist.hint && !b.clear.shut && b.clear.clears === 1 && b.clear.said && b.clear.hid && b.clear.drain > 0.09, JSON.stringify(b.clear));
  check('acute retention at 100%: a ring of drops behind a 0.6 s telegraph, the adenoma swells, the meter falls back', near(b.acute.tele, 0.6, 1e-9) && b.acute.bullets0 === 0 && b.acute.bullets >= 6 && near(b.acute.ret, 0.45, 0.07) && b.acute.swell >= 0.3, JSON.stringify(b.acute));
  check('finishing the median lobe removes the valve for good', b.gone.valve && b.gone.flap && b.gone.live === 0);
  const { p: p2b, errs: errs2b } = await fresh('?seed=6&boss=bph&weapons=scalpel,holmium&boons=finasteride'); allErrs.push(errs2b);
  b = await p2b.evaluate(() => { const G = UroCrawl.state, B = G.boss, T = UroCrawl.tuning.BPH.SEC[1].lobes, g = UroCrawl.spawn('bph', 300, 282, { instant: true }); return { hp: B.lobes.map(L => L.e.maxHp), want: T.map(l => Math.round(l.hp * 0.7)), r: B.lobes.map(L => L.r0), wr: T.map(l => l.r * 0.85), giant: g.maxHp, pools: [UroCrawl.patronPool('huggins').indexOf('finasteride') >= 0 || G.boons.indexOf('finasteride') >= 0, UroCrawl.tables.PATRONS.huggins.pool.indexOf('finasteride') >= 0, UroCrawl.tables.PATRONS.foley.pool.indexOf('kegel') >= 0, UroCrawl.patronPool('foley').indexOf('kegel') >= 0] }; });
  check('Finasteride (Huggins): lobes start 30% smaller, the Gentle Giant too. Kegel Training is in Foley\'s pool', b.hp.join() === b.want.join() && b.r.every((r, i) => near(r, b.wr[i], 1e-9)) && b.giant === 245 && b.pools.every(Boolean), JSON.stringify({ hp: b.hp, giant: b.giant }));

  // ── the ureteric orifices: the generic landmark warning, then the injury ──
  const { p: p3, errs: errs3 } = await fresh('?seed=7&boss=bph&weapons=scalpel,holmium,bovie,loop'); allErrs.push(errs3);
  b = await p3.evaluate(() => { const G = UroCrawl.state, B = G.boss, P = UroCrawl.player(), I = UroCrawl.input, T = UroCrawl.tuning, L = G.landmarks[1], e = L.e, out = {}; __T.calm(); __T.clean(); __T.use('scalpel');
    out.lm = { r: e.r, noAim: !!e.noAim, flat: !!e.def.flat, hidden: !!e.def.hidden, warn: T.LANDMARK.WARN };
    P.x = 190; P.y = 200; UroCrawl.step(2); out.far = L.warn;
    P.x = e.x; P.y = e.y - 95; I.mx = e.x - 300; I.my = P.y; UroCrawl.step(2); out.near = { warn: L.warn, hot: L.hot };
    // a scalpel swing whose arc ends 20 px short of it: hot, a notice, no injury
    P.x = e.x; P.y = e.y - 105; I.mx = e.x; I.my = e.y; G.notice = null; L.noteT = 0; I.mouseFire = true; UroCrawl.step(3); I.mouseFire = false; out.hot = { warn: L.warn, hot: L.hot, notice: G.notice && G.notice.text, hits: L.hits, hp: P.hp, dist: UroCrawl.hitAreaDist(G.weapons[G.wIndex], e.x, e.y) - e.r };
    UroCrawl.step(40);
    // touch auto-aim never picks it
    I.mode = 'touch'; P.x = e.x - 70; P.y = e.y - 30; UroCrawl.step(2); out.aim = G.aimTarget ? G.aimTarget.id : null; I.mode = 'kb';
    // a laser beam straight across it
    __T.use('holmium'); P.x = e.x - 80; P.y = e.y; I.mx = e.x; I.my = e.y; I.mouseFire = true; UroCrawl.step(30); I.mouseFire = false; out.laser = { hits: L.hits, hp: P.hp, ureters: B.ureters }; UroCrawl.step(30);
    // the cut
    __T.use('scalpel'); P.hp = P.maxHp = 100; P.x = e.x - 60; P.y = e.y; I.mx = e.x; I.my = e.y; I.mouseFire = true; let n = 0; while (L.hits === 0 && n < 40) { UroCrawl.step(1); n++; }
    out.cut = { hits: L.hits, hp: P.hp, banner: G.banner && G.banner.text, sub: G.banner && G.banner.sub, ureters: B.ureters, cursed: !!G.incont, over: G.over };
    UroCrawl.step(60); out.cd = { hits: L.hits, hp: P.hp }; UroCrawl.step(120); out.again = { hits: L.hits, hp: P.hp }; I.mouseFire = false;
    P.hp = 5; L.cd = 0; UroCrawl.dealDamage(e, 10, 'ENERGY', { wid: 'roller' }); out.low = { hp: P.hp, over: G.over };
    return out; });
  check('ureteric orifice: a landmark (a floor structure auto-aim never picks) that warns by distance: quiet far away, pulsing as the surgeon nears, hot when a blade\'s arc comes within 40 px', b.lm.noAim && b.lm.flat && b.lm.hidden && b.lm.warn === 40 && b.far === 0 && b.near.warn > 0.05 && !b.near.hot && b.hot.hot && b.hot.warn > b.near.warn && b.hot.dist > 0 && b.hot.dist <= 40 && b.hot.notice === 'Ureteric orifice: stay back' && b.hot.hits === 0 && b.hot.hp === 100 && b.aim !== 'landmark', JSON.stringify({ far: b.far, near: +b.near.warn.toFixed(2), hot: +b.hot.warn.toFixed(2), dist: +b.hot.dist.toFixed(1), aim: b.aim }));
  check('a stone laser passes over it; a blade on it is a ureteric injury: 15% of max HP, a banner, no curse, and not again for 2.5 s', b.laser.hits === 0 && b.laser.hp === 100 && b.cut.hits === 1 && b.cut.hp === 85 && b.cut.banner === 'URETERIC INJURY' && b.cut.ureters === 1 && !b.cut.cursed && !b.cut.over && b.cd.hits === 1 && b.cd.hp === 85 && b.again.hits === 2 && b.again.hp === 70, JSON.stringify({ cut: b.cut.hp, cd: b.cd.hp, again: b.again.hp }));
  check('a landmark penalty never takes the last point of health', b.low.hp === 1 && !b.low.over, 'hp ' + b.low.hp);

  // ── bladder neck: scar, the warnings, the contracture, the cap, the incision ──
  const { p: p4, errs: errs4 } = await fresh('?seed=8&boss=bph&weapons=scalpel,urethrotome,roller,holmium'); allErrs.push(errs4);
  b = await p4.evaluate(() => { const G = UroCrawl.state, B = G.boss, P = UroCrawl.player(), T = UroCrawl.tuning.BPH, C = B.lobes[1], M = B.lobes[0], out = {}; __T.calm(); __T.clean(); P.x = 200; P.y = 282;
    UroCrawl.dealDamage(C.e, 20, 'CUT', { wid: 'scalpel' }); UroCrawl.dealDamage(C.e, 20, 'CUT', { wid: 'loop' }); out.cold = B.scar;
    let s = B.scar, d = UroCrawl.dealDamage(C.e, 20, 'ENERGY', { wid: 'roller' }); out.cautery = (B.scar - s) / d; s = B.scar; d = UroCrawl.dealDamage(C.e, 20, 'ENERGY', { wid: 'bovie' }); out.bovie = (B.scar - s) / d;
    s = B.scar; d = UroCrawl.dealDamage(C.e, 20, 'LITHO', { wid: 'holmium' }); out.holmium = (B.scar - s) / d; s = B.scar; d = UroCrawl.dealDamage(C.e, 20, 'ENERGY', { wid: 'greenlight' }); out.green = (B.scar - s) / d;
    s = B.scar; UroCrawl.dealDamage(C.e, 20, 'FLUID', { wid: 'aquablation' }); out.water = B.scar - s; s = B.scar; UroCrawl.dealDamage(M.e, 50, 'ENERGY', { wid: 'roller' }); out.median = B.scar - s; out.rate = T.SCAR;
    // a bleeder on the collar: coagulating it for the full 1.5 s scars a little
    C.e.hp = C.e.maxHp; UroCrawl.bph.scar(0); const hz = UroCrawl.bph.hoser(1); UroCrawl.step(45); let n = 0; while (B.hoser && n < 200) { UroCrawl.dealDamage(hz.e, 3, 'ENERGY', { wid: 'roller', cauterize: true }); UroCrawl.step(1); P.hp = 100; n++; }
    out.coag = { steps: n, scar: B.scar, sealed: B.sealed, neck: true };
    // the two warnings
    G.notice = null; UroCrawl.bph.scar(0.49); const n0 = G.notice; UroCrawl.dealDamage(C.e, 10, 'ENERGY', { wid: 'roller' }); out.warn = { before: !!n0, scar: B.scar, text: G.notice && G.notice.text, color: G.notice && G.notice.color };
    UroCrawl.bph.scar(0.79); UroCrawl.dealDamage(C.e, 10, 'ENERGY', { wid: 'roller' }); const t0 = B.tickT; UroCrawl.step(5); out.red = { scar: B.scar, text: G.notice && G.notice.text, color: G.notice && G.notice.color, ticking: B.tickT !== t0, bnc: B.bnc };
    UroCrawl.bph.scar(0.995); C.e.hp = C.e.maxHp; UroCrawl.dealDamage(C.e, 10, 'ENERGY', { wid: 'roller' }); UroCrawl.step(2); const ring = G.enemies.filter(e => e.id === 'bncring' && !e.dead)[0];
    out.bnc = { bnc: B.bnc, n: B.bncN, ring: !!ring, x: ring && ring.x, banner: G.banner && G.banner.text, east: ring && ring.x > G.wall.cx, cap: T.CAP * T.WIN };
    return out; });
  check('neck scar: cautery on the collar lobes adds damage / 400, lasers ×0.3, cold steel and water none; the median lobe is not the neck', b.cold === 0 && near(b.cautery, b.rate, 1e-9) && near(b.bovie, b.rate, 1e-9) && near(b.holmium, b.rate * 0.3, 1e-9) && near(b.green, b.rate * 0.3, 1e-9) && b.water === 0 && b.median === 0, JSON.stringify({ cautery: b.cautery, holmium: b.holmium, green: b.green }));
  check('a bleeder at the neck forces cautery: a precise 1.5 s coagulation seals it for about 9% scar', b.coag.sealed === 1 && near(b.coag.steps, 90, 3) && near(b.coag.scar, 0.09, 0.012), JSON.stringify(b.coag));
  check('50%: the yellow "contracture risk" notice; 80%: the red warning and a tick', !b.warn.before && b.warn.scar >= 0.5 && /Heavy cautery at the bladder neck: contracture risk/.test(b.warn.text) && b.warn.color === '#ffd166' && b.red.scar >= 0.8 && /SCARRING/.test(b.red.text) && b.red.color === '#ff4d6d' && b.red.ticking && !b.red.bnc, JSON.stringify({ warn: b.warn.text, red: b.red.text }));
  check('100%: bladder neck contracture: a scar ring at the neck and a banner', b.bnc.bnc && b.bnc.n === 1 && b.bnc.ring && b.bnc.east && b.bnc.banner === 'BLADDER NECK CONTRACTURE' && b.bnc.cap === 12, JSON.stringify(b.bnc));
  b = await p4.evaluate(() => { const G = UroCrawl.state, B = G.boss, P = UroCrawl.player(), I = UroCrawl.input, T = UroCrawl.tuning.BPH, out = {}; __T.clean();
    B.lobes.forEach(L => __T.finish(L)); UroCrawl.step(3); out.s1 = { q: B.q, raw: B.qRaw, done: B.secDone };
    let n = 0; while (B.sec === 1 && n < 200) { UroCrawl.step(1); n++; } n = 0; while (B.slide && n < 200) { UroCrawl.step(1); n++; } __T.calm(); __T.clean();
    const ring = B.bncE; out.s2 = { sec: B.sec, bnc: B.bnc, ring: !!ring && !ring.dead, west: ring && ring.x < G.wall.cx - G.wall.rx + 80, same: G.enemies.filter(e => e.id === 'bncring' && !e.dead).length };
    B.lobes.slice(0, 3).forEach(L => __T.finish(L)); UroCrawl.step(3); out.cap = { q: B.q, raw: B.qRaw };
    for (let i = 0; i < 5; i++) UroCrawl.dealDamage(ring, 30, 'ENERGY', { wid: 'roller' }); out.cautery = { bnc: B.bnc, cut: ring.cut };
    // one real Urethrotome pass
    __T.use('urethrotome'); P.x = ring.x + 80; P.y = ring.y; I.mx = ring.x; I.my = ring.y; I.mouseFire = true; n = 0; while (B.bnc && n < 30) { UroCrawl.step(1); n++; } I.mouseFire = false; UroCrawl.step(2);
    out.cold = { bnc: B.bnc, steps: n, q: B.q, raw: B.qRaw, scar: B.scar, ring: G.enemies.filter(e => e.id === 'bncring' && !e.dead).length, said: G.texts.some(t => t.text === 'BLADDER NECK INCISED') };
    // again: three Scalpel cuts
    UroCrawl.bph.scar(1); UroCrawl.step(2); const r2 = B.bncE, a = B.bnc; UroCrawl.dealDamage(r2, 16, 'CUT', { wid: 'scalpel' }); UroCrawl.dealDamage(r2, 16, 'CUT', { wid: 'scalpel' }); const two = B.bnc; UroCrawl.dealDamage(r2, 16, 'CUT', { wid: 'scalpel' }); UroCrawl.step(2);
    out.scalpel = { again: a, n: B.bncN, two, three: B.bnc, q: B.q };
    return out; });
  check('the contracture follows the scope: in section 2 the ring waits behind you at the west end, and flow is capped at 60% (12 ml/s) however much you resect', b.s1.done && near(b.s1.q, 9.2, 1e-9) && b.s2.sec === 2 && b.s2.bnc && b.s2.ring && b.s2.west && b.s2.same === 1 && b.cap.q === 12 && near(b.cap.raw, 12.8, 1e-9), JSON.stringify({ q: b.cap.q, raw: b.cap.raw }));
  check('cautery barely scratches what cautery made; one Urethrotome pass incises it and the flow is uncapped', b.cautery.bnc && b.cautery.cut < 20 && !b.cold.bnc && b.cold.steps <= 6 && near(b.cold.q, 12.8, 1e-9) && b.cold.ring === 0 && b.cold.said && b.cold.scar === 0.5, JSON.stringify(b.cold));
  check('or three Scalpel cuts (bladder-neck incision)', b.scalpel.again && b.scalpel.n === 2 && b.scalpel.two && !b.scalpel.three && near(b.scalpel.q, 12.8, 1e-9));

  // ── the hoser ──
  const { p: p5, errs: errs5 } = await fresh('?seed=9&boss=bph&section=2&weapons=scalpel,roller,irrigation,bovie'); allErrs.push(errs5);
  b = await p5.evaluate(() => { const G = UroCrawl.state, B = G.boss, P = UroCrawl.player(), I = UroCrawl.input, T = UroCrawl.tuning.BPH, L = B.lobes[1], e = L.e, out = {}; __T.calm(); __T.clean(); P.x = 300; P.y = 278;
    // resecting opens one at random, likelier the deeper you are
    e.hp = e.maxHp; let early = 0; for (let i = 0; i < 400; i++) { e.hp = e.maxHp - 20; B.hoserCd = 0; UroCrawl.dealDamage(e, 5, 'LITHO', { wid: 'holmium' }); if (B.hoser) { early++; B.hoser = null; } }
    let n = 0; B.hoserCd = 0; while (!B.hoser && n < 4000) { e.hp = e.maxHp * 0.4; UroCrawl.dealDamage(e, 5, 'LITHO', { wid: 'holmium' }); n++; }
    const hz = B.hoser, tl = G.teles.filter(t => t.kind === 'flash')[0]; out.start = { early, hits: n, state: hz && hz.state, tele: tl && tl.dur, fog: B.fogA, bleeders: G.enemies.filter(x => x.id === 'bphbleeder').length };
    UroCrawl.step(40); out.wait = { state: hz.state, fog: B.fogA }; UroCrawl.step(4); out.open = { state: hz.state, e: !!hz.e, notice: G.notice && G.notice.text, second: UroCrawl.bph.hoser(3) };
    UroCrawl.step(40); out.fog = { a: B.fogA, r: UroCrawl.bph.fogR(), R: T.HOSE_R }; UroCrawl.giveBoon('coldlight'); out.fog.light = UroCrawl.bph.fogR(); UroCrawl.dropBoon('coldlight');
    // a dab of cautery is not enough
    __T.use('roller'); const bl = hz.e; P.x = bl.x; P.y = bl.y + 50; I.mx = bl.x; I.my = bl.y; I.mouseFire = true; UroCrawl.step(30); const dab = hz.coag; I.mouseFire = false; UroCrawl.step(120); out.dab = { dab, after: hz.coag, open: B.hoser === hz };
    // hold it
    I.mouseFire = true; n = 0; while (B.hoser && n < 200) { UroCrawl.step(1); P.x = bl.x; P.y = bl.y + 50; P.hp = 100; n++; } I.mouseFire = false; UroCrawl.step(30);
    out.seal = { steps: n, sealed: B.sealed, fog: B.fogA, bleeders: G.enemies.filter(x => x.id === 'bphbleeder' && !x.dead).length, cd: B.hoserCd > 10, said: G.texts.some(t => t.text === 'HEMOSTASIS') };
    return out; });
  check('the hoser: resecting opens an arterial bleeder at random (likelier nearer the capsule), behind a 0.7 s thump; one at a time', b.start.early === 0 && b.start.hits > 0 && b.start.hits < 4000 && b.start.state === 'tele' && near(b.start.tele, 0.7, 1e-9) && b.start.fog === 0 && b.start.bleeders === 0 && b.wait.state === 'tele' && b.wait.fog === 0 && b.open.state === 'open' && b.open.e && /ARTERIAL BLEEDER/.test(b.open.notice) && b.open.second === null, JSON.stringify(b.start));
  check('it sprays: the screen reddens and you see ' + b.fog.R + ' px (Nitze\'s Cold Light: 180)', b.fog.a > 0.99 && b.fog.r === 120 && b.fog.light === 180, JSON.stringify(b.fog));
  check('half a second of cautery does not hold; ENERGY held on it for 1.5 s coagulates it and the view clears', b.dab.dab > 0.3 && b.dab.dab < 1 && b.dab.after === 0 && b.dab.open && near(b.seal.steps, 90, 8) && b.seal.sealed === 1 && b.seal.fog === 0 && b.seal.bleeders === 0 && b.seal.cd && b.seal.said, JSON.stringify({ dab: b.dab, seal: b.seal }));
  b = await p5.evaluate(() => { const G = UroCrawl.state, B = G.boss, T = UroCrawl.tuning.BPH, L = B.lobes[0], M = L.e.maxHp - 1, out = {}; const at = pr => { L.e.hp = 1 + M * (1 - pr); return UroCrawl.bph.hoseChance(0, 10); };
    out.shallow = at(0.2); out.deep = at(0.8); UroCrawl.giveBoon('finasteride'); out.fin = at(0.8); UroCrawl.dropBoon('finasteride'); out.back = at(0.8); L.e.hp = L.e.maxHp; out.k = T.HOSE_FIN; out.desc = UroCrawl.tables.BOONS.finasteride.desc; return out; });
  check('Finasteride also makes it bleed less: the chance that a stroke opens a bleeder is 25% lower (and back to normal without it)', b.deep > b.shallow && b.k === 0.75 && near(b.fin / b.deep, 0.75, 1e-9) && b.back === b.deep && /25% fewer arterial bleeders/.test(b.desc), JSON.stringify({ deep: +b.deep.toFixed(4), fin: +b.fin.toFixed(4), ratio: b.fin / b.deep }));
  b = await p5.evaluate(() => { const G = UroCrawl.state, B = G.boss, P = UroCrawl.player(), I = UroCrawl.input, T = UroCrawl.tuning.BPH, out = {}; __T.clean();
    const hz = UroCrawl.bph.hoser(4); UroCrawl.step(90); const bl = hz.e; out.before = B.fogA;
    __T.use('irrigation'); P.x = bl.x; P.y = bl.y - 90; I.mx = bl.x; I.my = bl.y; I.mouseFire = true; UroCrawl.step(30); I.mouseFire = false; out.flush = { clearT: hz.clearT, open: B.hoser === hz && hz.state === 'open', said: G.texts.some(t => t.text === 'FLUSHED') };
    UroCrawl.step(60); out.clear = B.fogA; for (let i = 0; i < 60 * 6; i++) { UroCrawl.step(1); P.hp = 100; } out.back = { fog: B.fogA, open: B.hoser === hz, bleeders: G.enemies.filter(x => x.id === 'bphbleeder' && !x.dead).length };
    return out; });
  await p5.waitForTimeout(250); await shot(p5, 'q-hoser');
  check('the Irrigation Hose flushes it: the view clears for 6 s but it keeps bleeding, and the red comes back', b.before > 0.99 && near(b.flush.clearT, 6, 0.05) && b.flush.open && b.flush.said && b.clear < 0.2 && b.back.fog > 0.99 && b.back.open && b.back.bleeders === 1, JSON.stringify({ clear: +b.clear.toFixed(2), back: b.back }));

  // ── section 2: thrusts, the pinch, droplets from the ends ──
  b = await p5.evaluate(() => { const G = UroCrawl.state, B = G.boss, P = UroCrawl.player(), I = UroCrawl.input, T = UroCrawl.tuning.BPH, S = T.SEC[2], out = {}; __T.clean(); __T.calm(); B.hoser = null; B.fogA = 0; __T.kill('bphbleeder'); UroCrawl.step(1);
    const L = B.lobes[1]; P.x = L.e.x; P.y = L.e.y + 80; B.thrusts = 0; B.slamT = 0; UroCrawl.step(2); B.slamT = 999; const tl = G.teles.filter(t => t.kind === 'circle'), Lw = B.lobes.filter(l => l.wind > 0)[0]; out.tele = { n: tl.length, dur: tl[0] && tl[0].dur, r: tl[0] && tl[0].r, wind: !!Lw, d: tl[0] && Lw && Math.hypot(tl[0].x - Lw.e.x, tl[0].y - Lw.e.y) };
    P.x = tl[0].x; P.y = tl[0].y; UroCrawl.step(39); const hp0 = P.hp; UroCrawl.step(4); out.hit = { before: hp0, after: P.hp, stag: P.stag > 0, thrust: Lw.thrust > 0, dmg: S.thrustDmg };
    __T.clean(); P.x = L.e.x; P.y = L.e.y + 80; B.slamT = 0; UroCrawl.step(2); B.slamT = 999; const t2 = G.teles.filter(t => t.kind === 'circle')[0]; P.x = t2.x + (t2.x > 490 ? -220 : 220); P.y = 278; UroCrawl.step(46); out.miss = { hp: P.hp, stag: P.stag > 0 };
    // every third thrust is a pinch: the lobule across the tube follows 0.35 s later
    __T.clean(); P.x = L.e.x; P.y = 278; B.thrusts = 2; let pinch = false; for (let k = 0; k < 12 && !pinch; k++) { G.teles.length = 0; B.queue.length = 0; B.thrusts = 2; B.slamT = 0; UroCrawl.step(2); B.slamT = 999; const first = G.teles.filter(t => t.kind === 'circle').length; UroCrawl.step(24); const both = G.teles.filter(t => t.kind === 'circle'); if (first === 1 && both.length === 2 && Math.abs(both[0].x - both[1].x) < 12 && Math.abs(both[0].y - both[1].y) > 60) pinch = true; P.x = 100; P.y = 278; UroCrawl.step(60); P.hp = 100; P.x = L.e.x; P.y = 278; P.stag = 0; }
    out.pinch = pinch;
    // droplets
    __T.clean(); P.x = 490; P.y = 278; B.addT = 0; UroCrawl.step(2); B.addT = 999; const ad = G.enemies.filter(e => e.id === 'nocturia'); out.adds = { n: ad.length, ends: ad.every(e => Math.abs(e.x - G.wall.cx) > G.wall.rx - 70), cap: S.adds[2] };
    for (let k = 0; k < 6; k++) { B.addT = 0; UroCrawl.step(2); } B.addT = 999; out.adds.capped = G.enemies.filter(e => e.id === 'nocturia').length;
    return out; });
  check('lateral lobes thrust inward behind a 0.7 s circle: 13 damage and a stagger if you stand in it, nothing if you step out', b.tele.n === 1 && near(b.tele.dur, 0.7, 1e-9) && b.tele.r === 70 && b.tele.wind && b.hit.before === 100 && b.hit.after === 100 - b.hit.dmg && b.hit.stag && b.hit.thrust && b.miss.hp === 100 && !b.miss.stag, JSON.stringify({ tele: b.tele, hit: b.hit }));
  check('every third thrust is a pinch (the lobule straight across follows); Nocturia droplets rush in from the two ends, five at most', b.pinch && b.adds.n === 2 && b.adds.ends && b.adds.capped === b.adds.cap && b.adds.cap === 5, JSON.stringify(b.adds));

  // ── section transitions ──
  const { p: p6, errs: errs6 } = await fresh('?seed=10&boss=bph&weapons=scalpel,holmium'); allErrs.push(errs6);
  b = await p6.evaluate(() => { const G = UroCrawl.state, B = G.boss, P = UroCrawl.player(), I = UroCrawl.input, T = UroCrawl.tuning.BPH, out = {}; __T.calm(); __T.clean();
    B.lobes.forEach(L => __T.finish(L)); UroCrawl.step(2); out.done = { secDone: B.secDone, banner: G.banner && G.banner.text, sub: G.banner && G.banner.sub, sec: B.sec, slide: !!B.slide };
    let n = 0; while (!B.slide && n < 120) { UroCrawl.step(1); n++; } out.delay = n;
    const sl = B.slide; out.start = { sec: B.sec, snap: !!(sl && sl.snap), from: sl && sl.from, to: sl && sl.to, dur: sl && sl.dur, intro: G.introT > 0, lobes: B.lobes.length, rx: G.wall.rx, ry: G.wall.ry, lm: G.landmarks.length, old: G.enemies.filter(e => e.id === 'bphflap' || e.id === 'landmark').length };
    // no control and no harm during the slide
    I.keys.KeyD = true; I.mouseFire = true; const x0 = P.x, hp0 = P.hp; UroCrawl.step(30); UroCrawl.hurtPlayer(20, 'test', 0); out.locked = { moved: P.x - x0, hp: P.hp === hp0, hpL: B.lobes.every(L => L.e.hp === L.e.maxHp) }; I.mouseFire = false;
    n = 30; while (B.slide && n < 200) { UroCrawl.step(1); n++; } out.slide = n; const x1 = P.x; UroCrawl.step(30); I.keys = {}; out.after = { sec: B.sec, moved: P.x - x1, banner: G.banner && G.banner.text, q: B.q, base: B.qBase, intro: G.introT, tags: G.wall.segs.every(s => s.tag === 'CAPSULE'), n: G.wall.segs.length };
    return out; });
  check('finishing a section\'s lobes: "BLADDER NECK OPEN, the scope advances", then after 0.9 s a 1.2 s slide', b.done.secDone && b.done.banner === 'BLADDER NECK OPEN' && b.done.sub === 'the scope advances' && b.done.sec === 1 && !b.done.slide && near(b.delay, 54, 3) && b.start.snap && b.start.from === 1 && b.start.to === 2 && b.start.dur === 1.2 && near(b.slide, 72, 2), JSON.stringify({ delay: b.delay, slide: b.slide }));
  await p6.evaluate(() => { const B = UroCrawl.state.boss; __T.calm(); B.lobes.forEach(L => __T.finish(L)); UroCrawl.step(2); let n = 0; while (!UroCrawl.state.boss.slide && n < 120) { UroCrawl.step(1); n++; } UroCrawl.step(36); });
  await p6.waitForTimeout(300); await shot(p6, 'q-slide');
  check('the slide is discrete: the next room is already built (a long narrow tube, six lobules, CAPSULE segments), the finished room is a snapshot scrolling away, and nothing moves or hurts until it ends; then control returns', b.start.sec === 2 && b.start.intro && b.start.lobes === 6 && b.start.rx === 420 && b.start.ry === 132 && b.start.lm === 0 && b.start.old === 0 && b.locked.moved === 0 && b.locked.hp && b.locked.hpL && b.after.sec === 2 && b.after.moved > 50 && b.after.banner === 'SECTION 2 / 3' && near(b.after.q, 9.2, 1e-9) && b.after.intro === 0 && b.after.tags && b.after.n === 10, JSON.stringify({ start: b.start, locked: b.locked, moved: b.after.moved }));
  b = await p6.evaluate(() => { const G = UroCrawl.state, B = G.boss, out = {}; let n = 0; while (B.slide && n < 200) { UroCrawl.step(1); n++; } __T.calm();
    out.s3 = { sec: B.sec, rx: G.wall.rx, ry: G.wall.ry, lobes: B.lobes.length, lm: G.landmarks.map(L => L.id + ':' + L.e.r).join(), q: B.q, tags: G.wall.segs.every(s => s.tag === 'SINUS'), sinus: UroCrawl.tuning.PERF_KINDS.SINUS.severe, over: G.over }; return out; });
  check('section 3, the apex: a tight room, four apical lobes, the verumontanum, 16.4 ml/s behind you, a thin capsule (SINUS: severe)', b.s3.sec === 3 && b.s3.rx === 215 && b.s3.ry === 150 && b.s3.lobes === 4 && b.s3.lm === 'veru:20' && near(b.s3.q, 16.4, 1e-9) && b.s3.tags && b.s3.sinus && !b.s3.over, JSON.stringify(b.s3));
  const secs = [];
  for (const s of [1, 2, 3]) { const o = await fresh('?seed=5&boss=bph&section=' + s); allErrs.push(o.errs); secs.push(await o.p.evaluate(() => { const G = UroCrawl.state, B = G.boss; return { sec: B.sec, q: +B.q.toFixed(2), lobes: B.lobes.length, rx: G.wall.rx, w: G.weapons.map(w => w.id).join() }; })); if (s === 3) { await o.p.waitForTimeout(250); await shot(o.p, 'q-apex'); } await o.p.close(); }
  check('?boss=bph&section=1|2|3 start at that section with the earlier ones counted as done (4 / 9.2 / 16.4 ml/s)', secs.map(x => x.sec).join() === '1,2,3' && secs.map(x => x.q).join() === '4,9.2,16.4' && secs.map(x => x.lobes).join() === '3,6,4' && secs[0].w === 'holmium,scalpel,bovie,irrigation', JSON.stringify(secs));

  // ── the verumontanum, the sphincter and the curse ──
  const { p: p7, errs: errs7 } = await fresh('?seed=12&boss=bph&section=3&weapons=scalpel,bovie,holmium,loop'); allErrs.push(errs7);
  b = await p7.evaluate(() => { const G = UroCrawl.state, B = G.boss, P = UroCrawl.player(), I = UroCrawl.input, T = UroCrawl.tuning, L = G.landmarks[0], e = L.e, out = {}; __T.calm(); __T.clean();
    __T.use('scalpel'); P.x = 330; P.y = 278; UroCrawl.step(2); out.far = L.warn; P.x = e.x - 70; P.y = e.y; I.mx = 300; I.my = 278; UroCrawl.step(2); out.near = L.warn;
    // a stone laser across it: nothing
    __T.use('holmium'); P.x = e.x - 90; I.mx = e.x; I.my = e.y; I.mouseFire = true; UroCrawl.step(30); I.mouseFire = false; out.laser = { hits: L.hits, cursed: !!G.incont, hp: P.hp }; UroCrawl.step(30);
    // the loop: hot from the moment the swing winds up, then the sweep takes the sphincter
    __T.use('loop'); P.hp = P.maxHp = 100; P.x = e.x - 100; P.y = e.y; I.mx = e.x; I.my = e.y; G.notice = null; L.noteT = 0; I.mouseFire = true; UroCrawl.step(4); I.mouseFire = false; out.windup = { hot: L.hot, warn: L.warn, notice: G.notice && G.notice.text, hits: L.hits, swing: !!G.weapons[G.wIndex].swing };
    let n = 0; while (!G.incont && n < 40) { UroCrawl.step(1); n++; }
    out.injury = { steps: n, hp: P.hp, cursed: !!G.incont, banner: G.banner && G.banner.text, sub: G.banner && G.banner.sub, flash: G.flash, nooo: G.texts.some(t => t.text === 'NOOOO'), puddles: __T.urine().length, over: G.over, dmg: T.SPHINCTER.DMG };
    P.hp = 10; UroCrawl.step(180); UroCrawl.injureSphincter(); out.low = { hp: P.hp, over: G.over, times: G.incont.times, banner: G.banner && G.banner.sub };
    return out; });
  check('the verumontanum warns like any landmark, and a stone laser passes over it', b.far === 0 && b.near > 0.2 && b.laser.hits === 0 && !b.laser.cursed && b.laser.hp === 100, JSON.stringify({ near: +b.near.toFixed(2) }));
  check('it is hot the moment a loop swing winds up toward it ("Verumontanum: the limit. Stay proximal")', b.windup.swing && b.windup.hot && b.windup.hits === 0 && b.windup.notice === 'Verumontanum: the limit. Stay proximal', JSON.stringify(b.windup));
  check('SPHINCTER INJURY: the sweep overlaps it: a red flash, NOOOO, 35% of max HP, and the incontinence curse', b.injury.cursed && b.injury.hp === 65 && b.injury.dmg === 0.35 && b.injury.banner === 'SPHINCTER INJURY' && /rest of the run/.test(b.injury.sub) && b.injury.flash > 0.5 && b.injury.nooo && b.injury.puddles === 1 && !b.injury.over, JSON.stringify(b.injury));
  check('never lethal: at 10 HP it leaves 1', b.low.hp === 1 && !b.low.over && b.low.times === 2 && /already gone/.test(b.low.banner), JSON.stringify(b.low));
  b = await p7.evaluate(() => { const G = UroCrawl.state, B = G.boss, P = UroCrawl.player(), I = UroCrawl.input, T = UroCrawl.tuning.SPHINCTER, out = {}; __T.clean(); G.hazards.length = 0; P.x = 420; P.y = 278; UroCrawl.step(30);
    I.edges.roll = true; UroCrawl.step(1); const a = __T.urine(); out.roll = { n: a.length, kind: a[0] && a[0].kind, t: a[0] && a[0].t, r: a[0] && a[0].r, near: a[0] && Math.hypot(a[0].x - P.x, a[0].y - P.y) < 40 };
    UroCrawl.step(60); P.inv = 0; UroCrawl.hurtPlayer(5, 'test', 0); UroCrawl.step(1); out.hit = __T.urine().length; UroCrawl.hurtPlayer(5, 'test', 0, true); out.gap = __T.urine().length;
    for (let i = 0; i < 60 * 10 + 30; i++) { UroCrawl.step(1); P.hp = 100; } out.faded = __T.urine().length;
    // the Bovie in and through a puddle
    __T.clean(); G.hazards.length = 0; __T.use('bovie'); const Lb = B.lobes[0], fz = () => G.texts.filter(t => /FIZZLE/.test(t.text)).map(t => t.text)[0] || null;
    P.x = Lb.e.x + 30; P.y = Lb.e.y + 110; I.mx = Lb.e.x; I.my = Lb.e.y; const hp0 = Lb.e.hp; I.mouseFire = true; UroCrawl.step(40); I.mouseFire = false; out.dry = { fizz: fz(), dmg: hp0 - Lb.e.hp > 0 }; UroCrawl.step(200); G.weapons[G.wIndex].power = 1; G.weapons[G.wIndex].drained = false; G.texts.length = 0;
    UroCrawl.leakPuddle(true); const hp1 = Lb.e.hp; I.mouseFire = true; UroCrawl.step(40); I.mouseFire = false; out.inPuddle = { fizz: fz(), dealt: hp1 - Lb.e.hp }; UroCrawl.step(200); G.weapons[G.wIndex].power = 1; G.weapons[G.wIndex].drained = false; G.texts.length = 0; G.hazards.length = 0;
    const mid = { x: (P.x + Lb.e.x) / 2, y: (P.y + Lb.e.y) / 2 }, px = P.x, py = P.y; P.x = mid.x; P.y = mid.y - 8; UroCrawl.leakPuddle(true); P.x = px; P.y = py; const inIt = __T.urine().some(h => Math.hypot(h.x - P.x, h.y - P.y) <= h.r);
    I.mouseFire = true; UroCrawl.step(40); I.mouseFire = false; out.through = { fizz: fz(), standing: inIt }; G.hazards.length = 0; UroCrawl.step(30);
    // Kegel Training
    __T.clean(); UroCrawl.giveBoon('kegel'); G.incont.n = 0; G.incont.lastT = -9; let made = 0; for (let i = 0; i < 4; i++) { G.incont.lastT = -9; if (UroCrawl.leakPuddle()) made++; } out.kegel = { made, t: __T.urine()[0].t, base: T.PUDDLE_T };
    return out; });
  check('the curse: every roll and every hit leaves a urine puddle at your feet (a saline puddle, ~10 s), at most one per 0.35 s', b.roll.n === 1 && b.roll.kind === 'saline' && near(b.roll.t, 10, 0.05) && b.roll.near && b.hit === 2 && b.gap === 2 && b.faded === 0, JSON.stringify({ roll: b.roll, hit: b.hit, faded: b.faded }));
  check('the Bovie fizzles when you stand in a puddle or fire through one', b.dry.fizz === null && b.dry.dmg && b.inPuddle.fizz === 'FIZZLE (urine puddle)' && b.through.fizz === 'FIZZLE (urine puddle)' && !b.through.standing, JSON.stringify({ dry: b.dry, in: b.inPuddle, through: b.through }));
  check('Kegel Training halves it: every other leak, puddles that dry in 5 s', b.kegel.made === 2 && near(b.kegel.t, 5, 0.01), JSON.stringify(b.kegel));
  await p7.evaluate(() => { const P = UroCrawl.player(); P.x = 420; P.y = 300; UroCrawl.leakPuddle(true); UroCrawl.state.timeScale = 0; });
  await p7.waitForTimeout(250); await shot(p7, 'q-curse');
  const { p: p7b, errs: errs7b } = await fresh('?seed=12&boss=bph&section=3&weapons=scalpel&boons=kegel'); allErrs.push(errs7b);
  b = await p7b.evaluate(() => UroCrawl.state.landmarks[0].e.r);
  check('before any injury, Kegel Training shrinks the verumontanum\'s trigger radius by 20% (20 → 16)', b === 16, String(b));

  // ── the curse lasts the run; the Artificial Sphincter in the shop and from the next rep ──
  const { p: p8, errs: errs8 } = await open('?seed=3&god=1&room=3&weapons=scalpel,holmium,bovie'); allErrs.push(errs8);
  b = await p8.evaluate(() => { UroCrawl.startRun(); UroCrawl.input.mode = 'kb'; UroCrawl.step(5); const G = UroCrawl.state, P = UroCrawl.player(), I = UroCrawl.input, T = UroCrawl.tuning.SPHINCTER, out = {}; G.timeScale = 0;
    const shopHas = (n) => { let c = 0; for (let i = 0; i < n; i++) { const r = { kind: 'shop', x: 0, y: 0 }; UroCrawl.openShop(r); if (r.stock.some(s => s.kind === 'aus')) c++; UroCrawl.hideScreens(); } return c; };
    out.clean = shopHas(30);
    out.hook = UroCrawl.injureSphincter(); out.cursed = UroCrawl.sphincterCursed(); out.hp = P.hp;
    UroCrawl.skipRoom(); UroCrawl.step(5); if (G.overlay) UroCrawl.hideScreens(); const d = G.doors.filter(x => x.open)[0]; P.x = d.side === 'E' ? d.x - 20 : d.x + d.w / 2; P.y = d.side === 'E' ? d.y + d.h / 2 : (d.side === 'N' ? d.y + d.h + 20 : d.y - 20); UroCrawl.step(80);
    out.next = { room: G.roomIndex, cursed: UroCrawl.sphincterCursed() }; G.hazards = G.hazards.filter(h => !h.urine); I.edges.roll = true; UroCrawl.step(1); out.next.leak = G.hazards.filter(h => h.urine).length; UroCrawl.skipRoom(); UroCrawl.step(5); if (G.overlay) UroCrawl.hideScreens();
    // the first rep leads with it; a second rep does not
    G.rvu = 50; const r1 = { kind: 'rep', x: 0, y: 0, weapon: 'scalpel' }; UroCrawl.openRepScreen(r1); out.rep = { overlay: G.overlay, talk: document.getElementById('modTalk').textContent };
    document.getElementById('btnSkipPitch').click(); let card = document.getElementById('ausCard'); out.rep.card = !!card; out.rep.text = card && card.textContent; out.rep.mods = document.querySelectorAll('#modCards .card:not(#ausCard)').length;
    card.click(); out.rep.poor = { cursed: UroCrawl.sphincterCursed(), rvu: G.rvu };
    document.getElementById('btnModSkip').click(); const r2 = { kind: 'rep', x: 0, y: 0, weapon: 'scalpel' }; UroCrawl.openRepScreen(r2); document.getElementById('btnSkipPitch').click(); out.rep2 = { talk: /just the thing/.test(r2.pitch), card: !!document.getElementById('ausCard') }; document.getElementById('btnModSkip').click();
    G.rvu = 200; UroCrawl.openRepScreen(r1); card = document.getElementById('ausCard'); card.click(); out.buy = { cursed: UroCrawl.sphincterCursed(), fixed: G.incont.fixed, rvu: G.rvu, overlay: G.overlay, card: !!document.getElementById('ausCard'), mods: document.querySelectorAll('#modCards .card').length, used: !!r1.used, price: T.REP_PRICE };
    document.getElementById('btnModSkip').click(); G.hazards = G.hazards.filter(h => !h.urine); P.rollCd = 0; I.edges.roll = true; UroCrawl.step(1); out.dry = G.hazards.filter(h => h.urine).length; out.line = UroCrawl.winLine();
    // injured again: the shop stocks it, sometimes, at a price
    UroCrawl.step(60); UroCrawl.injureSphincter(); out.again = UroCrawl.sphincterCursed(); out.stocked = shopHas(40);
    G.rvu = 999; let r = null; for (let i = 0; i < 40 && !(r && r.stock.some(s => s.kind === 'aus')); i++) { UroCrawl.hideScreens(); r = { kind: 'shop', x: 0, y: 0 }; UroCrawl.openShop(r); }
    const it = r.stock.filter(s => s.kind === 'aus')[0], line = [...document.querySelectorAll('#shopItems .shopline')].filter(x => /Artificial Sphincter/.test(x.textContent))[0]; out.shop = { price: it.price, want: Math.round(T.PRICE * (1 + G.roomIndex * 0.08)), text: line.textContent };
    line.querySelector('button').click(); out.shop.cursed = UroCrawl.sphincterCursed(); out.shop.fixed = G.incont.fixed; out.shop.paid = 999 - G.rvu; out.shop.sold = it.sold; UroCrawl.hideScreens();
    // a new run starts clean
    G.running = false; UroCrawl.startRun(); out.fresh = G.incont === null;
    return out; });
  check('UroCrawl.injureSphincter() applies it anywhere; the curse lasts the rest of the run (the next room still leaks) and a new run starts dry', b.hook && b.cursed && b.next.room === 4 && b.next.cursed && b.next.leak === 1 && b.fresh, JSON.stringify(b.next));
  check('the next Instrument Rep opens with "I\'ve got just the thing for that" and offers the Artificial Sphincter at a discount; a later rep does not repeat it', b.rep.overlay === 'mod' && /^I’ve got just the thing for that/.test(b.rep.talk) && b.rep.card && /75 RVU/.test(b.rep.text) && /NOT ENOUGH/.test(b.rep.text) && b.rep.poor.cursed && b.rep.poor.rvu === 50 && !b.rep2.talk && !b.rep2.card, JSON.stringify({ talk: b.rep.talk.slice(0, 60), rep2: b.rep2 }));
  check('buying it from the rep removes the curse and does not use up the mod pick', !b.buy.cursed && b.buy.fixed === 'rep' && b.buy.rvu === 200 - b.buy.price && b.buy.price === 75 && b.buy.overlay === 'mod' && !b.buy.card && b.buy.mods >= 1 && b.buy.mods === b.rep.mods && !b.buy.used && b.dry === 0 && /Continence: restored \(artificial sphincter\)\.$/.test(b.line), JSON.stringify(b.buy) + ' dry ' + b.dry + ' · ' + b.line);
  check('the shop stocks an Artificial Sphincter only while the curse is active, and then only sometimes (rare) and at a price (150 RVU × the room\'s markup)', b.clean === 0 && b.again && b.stocked >= 8 && b.stocked <= 32 && b.shop.price === b.shop.want && b.shop.price >= 150 && !b.shop.cursed && b.shop.fixed === 'shop' && b.shop.paid === b.shop.price && b.shop.sold, JSON.stringify({ clean: b.clean, stocked: b.stocked + ' / 40', price: b.shop.price }));

  // ── TUR syndrome ──
  const { p: p9, errs: errs9 } = await fresh('?seed=13&boss=bph&section=2&weapons=irrigation,scalpel'); allErrs.push(errs9);
  b = await p9.evaluate(() => { const G = UroCrawl.state, B = G.boss, P = UroCrawl.player(), I = UroCrawl.input, T = UroCrawl.tuning.BPH, out = {}; __T.calm(); __T.clean(); __T.use('irrigation'); P.x = 300; P.y = 278; I.mx = 600; I.my = 278;
    I.mouseFire = true; let n = 0; while (!(P.tur > 0) && n < 500) { UroCrawl.step(1); P.hp = 100; P.x = 300; P.y = 278; n++; } I.mouseFire = false;
    out.tur = { steps: n, tur: P.tur, notice: G.notice && G.notice.text, turs: B.turs, warned: G.texts.some(t => /IRRIGANT ABSORBING/.test(t.text)) || true };
    I.keys.KeyD = true; const x0 = P.x; UroCrawl.step(30); out.rev = P.x - x0; for (let i = 0; i < 60 * 4; i++) UroCrawl.step(1); const x1 = P.x; UroCrawl.step(30); out.fwd = P.x - x1; I.keys = {};
    return out; });
  check('TUR syndrome: the Irrigation Hose held 6 s in a row reverses your controls for 4 s', near(b.tur.steps, 360, 4) && b.tur.tur > 3.9 && /TUR SYNDROME/.test(b.tur.notice) && b.tur.turs === 1 && b.rev < -50 && b.fwd > 50, JSON.stringify({ steps: b.tur.steps, rev: +b.rev.toFixed(0), fwd: +b.fwd.toFixed(0) }));

  // ── the win ──
  const { p: p10, errs: errs10 } = await fresh('?seed=14&boss=bph&section=3&weapons=scalpel,holmium'); allErrs.push(errs10);
  b = await p10.evaluate(() => { const G = UroCrawl.state, B = G.boss, out = {}; __T.calm(); __T.clean(); UroCrawl.injureSphincter(); UroCrawl.step(200);
    __T.finish(B.lobes[0]); __T.finish(B.lobes[1]); UroCrawl.step(3); out.two = { q: B.q, over: G.over };
    B.lobes[2].e.hp = 1 + (B.lobes[2].e.maxHp - 1) * 0.3; UroCrawl.step(2); out.part = { q: B.q, over: G.over };
    __T.finish(B.lobes[2]); UroCrawl.step(2); out.win = { over: G.over, won: G.won, banner: G.banner && G.banner.text, dead: B.body.dead, finalQ: G.finalQ, said: G.texts.some(t => /^Qmax \d+ ml\/s$/.test(t.text)) };
    return out; });
  check('you win on flow: both proximal apical lobes are 19.2 ml/s, most of a distal one is not enough, finishing it crosses 20: FLOW RESTORED!', near(b.two.q, 19.2, 1e-9) && !b.two.over && b.part.q < 20 && !b.part.over && b.win.over && b.win.won && b.win.banner === 'FLOW RESTORED!' && b.win.dead && near(b.win.finalQ, 21.6, 1e-9) && b.win.said, JSON.stringify({ two: b.two.q, part: +b.part.q.toFixed(2), final: b.win.finalQ }));
  await p10.evaluate(() => { UroCrawl.step(500); }); await p10.waitForTimeout(300);
  b = await p10.evaluate(() => ({ overlay: UroCrawl.state.overlay, title: document.getElementById('sumTitle').textContent, sub: document.getElementById('sumSub').textContent, stats: document.getElementById('sumStats').textContent }));
  check('win screen: "Qmax 22 ml/s: flow restored. Specimen sent to pathology." plus "Continence: lost."', b.overlay === 'summary' && b.title === 'DISCHARGED!' && b.sub === 'Qmax 22 ml/s: flow restored. Specimen sent to pathology. Continence: lost.' && /Qmax22 ml\/s/.test(b.stats) && /Continencelost/.test(b.stats) && /Perforations/.test(b.stats), b.sub);
  await shot(p10, 'q-summary');

  // ── the Benign dungeon, the rest-room crate, the boss pool, the bestiary, skipRoom ──
  const fams = []; let noct = 0;
  for (const seed of [31, 32, 33]) { const o = await open('?seed=' + seed + '&god=1&boss=bph&room=5'); allErrs.push(o.errs); const r = await o.p.evaluate(() => { UroCrawl.startRun(); const G = UroCrawl.state, E = UroCrawl.tables.ENEMIES, f = {}; let n = 0; G.waves.list.forEach(w => w.forEach(x => { f[E[x.id].family] = 1; if (x.id === 'nocturia') n++; })); return { fams: Object.keys(f).join(), name: G.dungeon.name, n }; }); fams.push(r.name + ':' + r.fams); noct += r.n; await o.p.close(); }
  const { p: p11, errs: errs11 } = await open('?seed=31&god=1&boss=mibc&room=5'); allErrs.push(errs11);
  const other = await p11.evaluate(() => { UroCrawl.startRun(); let n = 0; UroCrawl.state.waves.list.forEach(w => w.forEach(x => { if (x.id === 'nocturia') n++; })); return n; });
  check('the Benign dungeon (the Giant TURP\'s run): rooms draw only benign things, and Nocturia droplets live only there', fams.every(f => f === 'BENIGN:BENIGN') && noct >= 1 && other === 0, fams.join(' ') + ' · nocturia ' + noct + ' · in Oncology ' + other);
  const { p: p12 } = await open('?seed=12&boss=bph&room=8&weapons=scalpel,holmium');
  const crate = await p12.evaluate(() => { UroCrawl.startRun(); UroCrawl.step(5); const c = UroCrawl.state.rewards.filter(x => x.kind === 'crate')[0]; return c && c.item && c.item.id; });
  check('before the Giant TURP, the rest-room crate is a Resectoscope Loop when you do not carry one', crate === 'loop', String(crate));
  b = await p11.evaluate(() => { const E = UroCrawl.tables.ENEMIES, roll = { staghorn: 0, fournier: 0, mibc: 0, bph: 0 }; let kept = true;
    const mb = a => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    for (let sd = 1; sd <= 1200; sd++) { const id = UroCrawl.rollBossId(sd), r = mb(sd ^ 0x51ab), old = r < 1 / 3 ? 'staghorn' : r < 0.5 ? 'mibc' : r < 5 / 6 ? 'fournier' : 'mibc'; roll[id]++; if (id !== old && id !== 'bph') kept = false; }
    return { roll, kept, vis: ['bphboss', 'nocturia'].every(id => E[id] && !E[id].hidden && E[id].fact.length > 40), hid: ['bphlobe', 'bphflap', 'bphbleeder', 'bncring', 'landmark'].every(id => E[id] && E[id].hidden), fam: E.bphboss.family, boss: E.bphboss.boss, fact: E.bphboss.fact, name: E.bphboss.name, row: UroCrawl.tables.BOONS.kegel.name + '|' + UroCrawl.tables.BOONS.finasteride.name }; });
  check('the boss pool rolls all four from the seed (about a quarter each), and a seed either keeps the boss it used to roll or moves to the Giant TURP', b.roll.staghorn > 240 && b.roll.fournier > 240 && b.roll.mibc > 240 && b.roll.bph > 240 && b.kept, JSON.stringify(b.roll));
  check('bestiary: The Giant TURP (benign, boss) and Nocturia have entries; lobes, flap, bleeder, scar ring and landmarks stay hidden parts', b.vis && b.hid && b.fam === 'BENIGN' && b.boss === true && b.name === 'The Giant TURP' && /verumontanum/.test(b.fact) && /capsul/.test(b.fact) && b.row === 'Kegel Training|Finasteride', b.fact.slice(0, 70));
  const { p: p13, errs: errs13 } = await fresh('?seed=4&god=1&boss=bph'); allErrs.push(errs13);
  b = await p13.evaluate(() => { UroCrawl.state.timeScale = 1; UroCrawl.skipRoom(); UroCrawl.step(300); return { won: UroCrawl.state.won, over: UroCrawl.state.over, line: UroCrawl.winLine() }; });
  check('skipRoom still ends the fight as a win (the autoplay path)', b.won && b.over && b.line === 'Qmax 20 ml/s: flow restored. Specimen sent to pathology.', b.line);

  // ── a full fight, played: no god mode, the default boss loadout (holmium, scalpel, bovie, irrigation) ──
  for (const cx of browser.contexts()) await cx.close();   // every earlier page is still animating: close them, so what runs on the real clock below (the win sequence, the phone's frame rate) is this fight's own
  let minTele = 9; const kinds = {};
  for (const seed of [11, 42]) {
    const o = await open('?seed=' + seed + '&boss=bph'); await o.p.evaluate(TURPLIB);
    const r = await o.p.evaluate(() => { UroCrawl.startRun(); UroCrawl.step(160); return __turpBot(60 * 300); });
    minTele = Math.min(minTele, r.minTele); Object.assign(kinds, r.kinds);
    check('autoplay seed ' + seed + ': the surgeon resects all three sections and wins on flow (no god mode), never touching a landmark', r.won && !r.dead && r.sec === 3 && r.secAt[2] > 10 && r.secAt[3] > r.secAt[2] + 10 && r.secs > r.secAt[3] + 4 && r.secs >= 60 && r.secs <= 170 && r.q >= 20 && r.hp > 0 && r.ureters === 0 && !r.cursed, r.secs + ' s · sections at ' + JSON.stringify(r.secAt) + ' · Qmax ' + r.q + ' · hp left ' + r.hp + ' · took ' + r.taken + ' · bleeders ' + r.sealed + '/' + r.hosers + ' · valve cleared ' + r.valve + ' · swells ' + r.swells + ' · perforations ' + r.perfs + ' · scar ' + r.scar);
    if (seed === 42) { await o.p.waitForFunction(() => UroCrawl.state.overlay === 'summary', null, { timeout: 15000 }); const end = await o.p.evaluate(() => ({ title: document.getElementById('sumTitle').textContent, sub: document.getElementById('sumSub').textContent })); check('…and gets the flow summary on the real clock', end.title === 'DISCHARGED!' && /^Qmax 2\d ml\/s: flow restored\. Specimen sent to pathology\.$/.test(end.sub), end.sub); }
    allErrs.push(o.errs); await o.p.close();
  }
  check('every Giant TURP attack seen in those fights was telegraphed for at least 0.5 s (thrust circles, the drip lane, swell / valve / bleeder flashes)', minTele >= 0.5 && kinds.circle && kinds.line && kinds.flash, 'shortest ' + minTele + ' s · ' + Object.keys(kinds).join(','));

  // ── phone: touch viewport, the HUD fits, it runs ──
  const { p: p14, errs: errs14 } = await open('?seed=5&boss=bph&section=2', 844, 390, true); allErrs.push(errs14);
  await p14.evaluate(() => { UroCrawl.startRun(); UroCrawl.step(170); }); await p14.waitForTimeout(2200);
  b = await p14.evaluate(() => { const G = UroCrawl.state; return { fps: G.fps, mode: UroCrawl.input.mode, sec: G.boss && G.boss.sec, t: G.time, running: G.running }; });
  check('phone (844×390, touch): the fight runs on its own clock at a playable frame rate', b.mode === 'touch' && b.sec === 2 && b.running && b.fps >= 40 && b.t > 4.5, 'fps ' + b.fps);
  await shot(p14, 'q-phone');
  errCheck('Q', [].concat(...allErrs));
});

// ───────── R. the Call Room (roadmap Step 3) ─────────
await block('R. call room', async () => {
  const allErrs = [];
  const need = ['door', 'board', 'locker', 'cart', 'pins', 'perks', 'charts', 'trophy', 'coffee', 'scrubs', 'decor', 'reps'];
  const cast = ['attending', 'janitor', 'brax', 'kiki', 'rex', 'sunny'];
  const canvasBox = (pg) => pg.evaluate(() => { const r = document.getElementById('game').getBoundingClientRect(); return { l: r.left, t: r.top, s: r.width / 960 }; });

  // ── a fresh save: the title, PLAY → the hub ──
  const { p, errs } = await open('?seed=3&god=1'); allErrs.push(errs);
  let b = await p.evaluate(() => ({ play: !!document.getElementById('btnPlay'), quick: !!document.getElementById('btnQuick'), hub: JSON.parse(JSON.stringify(UroCrawl.meta.hub)), on: UroCrawl.hub.state.on,
    hooks: ['addCme', 'buy', 'enter', 'step', 'goto', 'use', 'place', 'talk', 'scrubIn'].every(k => typeof UroCrawl.hub[k] === 'function') && typeof UroCrawl.hub.state === 'object' }));
  check('title has PLAY and QUICK START; META.hub starts at its defaults (cme 0, decor / owned / perks / met / lines empty, no pin); the hub hooks exist', b.play && b.quick && b.hooks && !b.on && b.hub.cme === 0 && b.hub.pin === '' && ['decor', 'owned', 'perks', 'met', 'lines'].every(k => Object.keys(b.hub[k]).length === 0), JSON.stringify(b.hub).slice(0, 150));
  await p.click('#btnPlay'); await p.waitForTimeout(100);
  const helpFirst = await p.evaluate(() => UroCrawl.state.overlay);
  await p.click('#btnHelpOk'); await p.waitForTimeout(150);
  const who = await p.evaluate(() => UroCrawl.state.overlay + ':' + UroCrawl.hub.state.panel);   // the first time in, "Who are you?" (block T) comes first
  await p.click('#btnHeroOk'); await p.waitForTimeout(100);
  b = await p.evaluate(() => { const G = UroCrawl.state, s = UroCrawl.hub.state; return { screen: G.screen, overlay: G.overlay, running: G.running, on: s.on, ids: s.stations.map(x => x.id), npcs: s.npcs.map(x => x.id), music: UroCrawl.snd.music.mode, enemies: G.enemies.length, held: G.weapons.map(w => w.id).join() }; });
  check('PLAY (after the first-time How to play, and "Who are you?" from block T) lands in the Call Room: G.screen "hub", no run, no overlay, nothing to fight, the hub music mode', helpFirst === 'help' && who === 'hub:mirror' && b.screen === 'hub' && b.overlay === null && !b.running && b.on && b.enemies === 0 && b.music === 'hub', b.screen + ' · music ' + b.music);
  check('every station of the roadmap is in the room (OR door, case board, locker, cart, pins, whiteboard, chart rack, trophy wall, coffee, scrub cabinet, decor desk, rep table); the cast is the attending, the janitor and the four reps', need.every(id => b.ids.includes(id)) && cast.every(id => b.npcs.includes(id)), b.ids.join(','));
  const hints0 = await p.evaluate(() => UroCrawl.hub.state.hints.join());
  await p.waitForTimeout(300); await shot(p, 'r-hub-first');

  // ── walking, highlighting, the three ways to interact on a desktop ──
  const x0 = await p.evaluate(() => UroCrawl.player().x);
  await p.keyboard.down('KeyD'); await p.waitForTimeout(500); await p.keyboard.up('KeyD');
  b = await p.evaluate(() => ({ x: UroCrawl.player().x }));
  check('keyboard: D walks the surgeon across the room on the real clock', b.x > x0 + 40, Math.round(x0) + ' → ' + Math.round(b.x));
  b = await p.evaluate(() => { const H = UroCrawl.hub, P = UroCrawl.player(); P.x = 480; P.y = 300; H.step(2); const none = H.state.near; P.x = 20; P.y = 20; H.step(2); const walled = { x: P.x, y: P.y }; H.goto('locker'); H.step(2); return { none, walled, near: H.state.near, held: UroCrawl.state.weapons.map(w => w.id).join() }; });
  check('standing by a station highlights it, standing in the open highlights nothing; the far wall and the room edge are solid; the surgeon carries the first instrument of the loadout', b.none === null && b.near === 'locker' && b.walled.y > 126 && b.walled.x > 26 && b.held === 'holmium', JSON.stringify(b));
  await p.keyboard.press('KeyE'); await p.waitForTimeout(150);
  b = await p.evaluate(() => { const W = UroCrawl.tables.WEAPONS, es = [...document.querySelectorAll('#hubBody [data-w]')].map(e => ({ id: e.getAttribute('data-w'), sel: e.classList.contains('sel'), locked: e.classList.contains('locked'), txt: e.textContent }));
    return { overlay: UroCrawl.state.overlay, panel: UroCrawl.hub.state.panel, n: es.length, sel: es.filter(e => e.sel).map(e => e.id).join(), locked: es.filter(e => e.locked).length, wantLocked: Object.keys(W).filter(id => !W[id].ultimate && W[id].unlock > 1).length, does: es.find(e => e.id === 'bovie').txt, lockTxt: es.filter(e => e.locked).every(e => /\?\?\?/.test(e.txt) && /LOCKED · PGY-\d/.test(e.txt)), openTxt: es.filter(e => !e.locked).every(e => !/\?\?\?/.test(e.txt)) }; });
  check('E opens the instrument locker: 23 instruments, the two starting ones marked, everything above PGY-1 a silhouette with its requirement', b.overlay === 'hub' && b.panel === 'locker' && b.n === 23 && b.sel === 'holmium,scalpel' && b.locked === b.wantLocked && b.locked > 5 && b.lockTxt && b.openTxt && /Crackling arc that jumps to 3 nearby enemies and strips biofilm\./.test(b.does), b.n + ' entries · ' + b.locked + ' locked');
  await p.click('#hubBody [data-w="bovie"]'); await p.click('#hubBody [data-w="thulium"]'); await p.waitForTimeout(60);
  b = await p.evaluate(() => ({ load: UroCrawl.hub.loadout().join(), saved: UroCrawl.meta.hub.load.join(), held: UroCrawl.state.weapons.map(w => w.id).join(), sel: [...document.querySelectorAll('#hubBody [data-w].sel')].map(e => e.getAttribute('data-w')).join() }));
  check('tapping an unlocked instrument swaps it in for the older pick (two stay selected); a locked one does nothing', b.load === 'scalpel,bovie' && b.saved === 'scalpel,bovie' && b.sel === 'scalpel,bovie' && b.held === 'scalpel', b.load);
  await p.click('#hubExtra .btn'); await p.waitForTimeout(60);
  const aspO = await p.evaluate(() => UroCrawl.state.overlay);
  await p.click('#btnAspectsBack'); await p.waitForTimeout(60);
  b = await p.evaluate(() => ({ overlay: UroCrawl.state.overlay, panel: UroCrawl.hub.state.panel, screen: UroCrawl.state.screen }));
  check('the locker\'s ASPECTS button opens the aspects screen, and DONE comes back to the locker', aspO === 'aspects' && b.overlay === 'hub' && b.panel === 'locker' && b.screen === 'hub');
  await p.keyboard.press('Escape'); await p.waitForTimeout(100);
  check('Esc backs out of a station to the room', (await p.evaluate(() => UroCrawl.state.overlay)) === null);
  await p.evaluate(() => { UroCrawl.hub.goto('perks'); UroCrawl.hub.step(2); });
  let box = await canvasBox(p);
  await p.mouse.click(box.l + 480 * box.s, box.t + 320 * box.s); await p.waitForTimeout(150);
  b = await p.evaluate(() => ({ panel: UroCrawl.hub.state.panel, n: document.querySelectorAll('#hubBody [data-buy]').length, allOff: [...document.querySelectorAll('#hubBody [data-buy]')].every(x => x.disabled), buy: UroCrawl.hub.buy('hp'), cme: UroCrawl.meta.hub.cme }));
  check('a mouse click uses the station you stand by: the whiteboard lists four perks, and with 0 CME nothing can be bought', b.panel === 'perks' && b.n === 4 && b.allOff && b.buy === false && b.cme === 0);
  const hints1 = await p.evaluate(() => { UroCrawl.hub.addCme(500); const h = UroCrawl.hub.state.hints.join(); UroCrawl.hub.use('perks'); return h; });
  await p.click('#hubBody [data-buy="hp"]'); await p.waitForTimeout(60);
  b = await p.evaluate(() => { const H = UroCrawl.hub, m = UroCrawl.meta.hub, T = H.tables.PERKS, one = { hp: m.perks.hp, cme: m.cme, shown: document.getElementById('hubCme').textContent };
    const r = [H.buy('hp'), H.buy('hp'), H.buy('hp'), H.buy('rvu'), H.buy('reroll'), H.buy('swap'), H.buy('nonsense')];
    return { one, r, perks: JSON.parse(JSON.stringify(m.perks)), cme: m.cme, spent: T.hp.cost[0] + T.hp.cost[1] + T.hp.cost[2] + T.rvu.cost[0] + T.reroll.cost[0] + T.swap.cost[0] }; });
  check('CME is spent on perks, level by level: Power Nap to its cap of 3 (a 4th is refused), Moonlighting, Second Opinion, Instrument Count; an unknown id buys nothing', b.one.hp === 1 && b.one.cme === 470 && b.one.shown === '470 CME' && b.r.join() === 'true,true,false,true,true,true,false' && b.perks.hp === 3 && b.perks.rvu === 1 && b.perks.reroll === 1 && b.perks.swap === 1 && b.cme === 500 - b.spent, JSON.stringify(b.perks) + ' · ' + b.cme + ' CME left');
  await p.keyboard.press('Escape'); await p.waitForTimeout(80);
  await p.evaluate(() => { UroCrawl.hub.goto('board'); UroCrawl.hub.step(2); });
  await p.keyboard.press('Enter'); await p.waitForTimeout(150);
  b = await p.evaluate(() => { const H = UroCrawl.hub, bt = id => document.querySelector('#hubBody [data-case="' + id + '"]'); return { panel: H.state.panel, stag: bt('staghorn').disabled && /ON THE BOARD/.test(bt('staghorn').textContent), four: bt('fournier').disabled, bph: bt('bph').disabled, mibc: bt('mibc').disabled, peds: bt('peds').disabled, un: [0, 1, 2, 3, 4].map(i => H.caseUnlocked(i)).join(), dungeon: H.state.dungeon }; });
  check('Enter uses a station too: the case board starts with only STONES open; Infection, Benign, Oncology are locked behind the boss before them and the Peds Wing behind all four (block S)', b.panel === 'board' && b.stag && b.four && b.bph && b.mibc && b.peds && b.un === 'true,false,false,false,false' && b.dungeon === 'staghorn', b.un);
  const hints2 = await p.evaluate(() => { UroCrawl.meta.hub.bosses.staghorn = 1; const h = UroCrawl.hub.state.hints.join(); UroCrawl.hub.use('board'); return h; });
  await p.click('#hubBody [data-case="fournier"]'); await p.waitForTimeout(60);
  b = await p.evaluate(() => { const H = UroCrawl.hub; return { dungeon: H.state.dungeon, saved: UroCrawl.meta.hub.dungeon, bph: document.querySelector('#hubBody [data-case="bph"]').disabled, un: [0, 1, 2, 3, 4].map(i => H.caseUnlocked(i)).join() }; });
  check('beating the Staghorn opens the Infection case (and only that one); taking it puts it on the board', b.dungeon === 'fournier' && b.saved === 'fournier' && b.bph && b.un === 'true,true,false,false,false', b.un);
  const hints3 = await p.evaluate(() => UroCrawl.hub.state.hints.join());

  // ── pharmacy cart + lanyard pins: both fed by the patrons you have met ──
  b = await p.evaluate(() => { const H = UroCrawl.hub; H.use('cart'); const empty = { n: document.querySelectorAll('#hubBody [data-boon]').length, txt: document.getElementById('hubSub').textContent };
    H.use('pins'); const pins0 = [...document.querySelectorAll('#hubBody [data-pin]')].map(e => e.classList.contains('locked')); document.querySelector('#hubBody [data-pin="young"]').click(); const pinNo = UroCrawl.meta.hub.pin;
    const first = H.meet('civiale'), again = H.meet('civiale'), hintsMet = H.state.hints.join(); H.use('cart'); const B = UroCrawl.tables.BOONS, pool = UroCrawl.tables.PATRONS.civiale.pool, offer = [...document.querySelectorAll('#hubBody [data-boon]')].map(e => e.getAttribute('data-boon'));
    return { empty, pins0, pinNo, first, again, hintsMet, offer, ok: offer.every(id => B[id].rarity === 'common' && pool.includes(id) && !B[id].requires), uniq: new Set(offer).size }; });
  check('with no patron met the pharmacy cart is empty and every pin is locked (nine patrons\' pins and the child-life specialist\'s, block S)', b.empty.n === 0 && /empty/.test(b.empty.txt) && b.pins0.length === 10 && b.pins0.every(Boolean) && b.pinNo === '');
  check('meeting a patron (once) stocks the cart: three different common boons from that patron\'s pool', b.first === true && b.again === false && b.offer.length === 3 && b.uniq === 3 && b.ok, b.offer.join());
  const offer0 = b.offer, hintsMet = b.hintsMet;
  await p.click('#hubBody [data-boon="' + offer0[1] + '"]'); await p.waitForTimeout(60);
  b = await p.evaluate(() => { const H = UroCrawl.hub, pick = UroCrawl.meta.hub.rx.pick, picked = [...document.querySelectorAll('#hubBody .card.picked')].map(e => e.getAttribute('data-boon')).join(); H.close(); H.use('cart'); return { pick, picked, again: [...document.querySelectorAll('#hubBody [data-boon]')].map(e => e.getAttribute('data-boon')).join() }; });
  check('tapping a boon packs it for the next run; the offer does not change when you come back to the cart', b.pick === offer0[1] && b.picked === offer0[1] && b.again === offer0.join(), b.pick);
  await p.evaluate(() => UroCrawl.hub.use('pins'));
  await p.click('#hubBody [data-pin="civiale"]'); await p.waitForTimeout(60);
  b = await p.evaluate(() => { const H = UroCrawl.hub, m = UroCrawl.meta.hub, card = document.querySelector('#hubBody [data-pin="civiale"]'), locked = document.querySelectorAll('#hubBody [data-pin].locked').length; m.pinUse.civiale = 3; const l2 = H.pinLevel('civiale'); m.pinUse.civiale = 8; const l3 = H.pinLevel('civiale'); m.pinUse.civiale = 0;
    return { pin: m.pin, worn: card.classList.contains('sel'), txt: card.textContent, locked, hints: H.state.hints.join(), l1: H.pinLevel('civiale'), l2, l3, t: [1, 2, 3].map(l => H.pinText('civiale', l)).join(' / ') }; });
  check('a met patron\'s pin can be worn (one at a time); it shows its perk and level, and levels up with use: 3 runs worn → level 2, 8 → level 3', b.pin === 'civiale' && b.worn && /\+4% Litho damage/.test(b.txt) && /LEVEL 1/.test(b.txt) && b.locked === 9 && b.l1 === 1 && b.l2 === 2 && b.l3 === 3, b.t);

  check('a gold dot marks a station that has something for you: none on a fresh save; the whiteboard and the catalog once you can afford something; the case board when a new case opens (until you take it); the cart and the pins once a patron is met (until you pack a boon and wear a pin)', hints0 === '' && /perks/.test(hints1) && /decor/.test(hints1) && !/board/.test(hints1) && /board/.test(hints2) && !/board/.test(hints3) && /cart/.test(hintsMet) && /pins/.test(hintsMet) && !/cart/.test(b.hints) && !/pins/.test(b.hints), [hints0 || '—', hints1, hints2, hints3, hintsMet, b.hints].join(' | '));

  // ── chart rack, trophy wall, coffee, scrubs ──
  await p.evaluate(() => UroCrawl.hub.use('charts'));
  const bestO = await p.evaluate(() => UroCrawl.state.overlay);
  await p.click('#btnBestBack'); await p.waitForTimeout(60);
  b = await p.evaluate(() => { const H = UroCrawl.hub, G = UroCrawl.state, back = { overlay: G.overlay, screen: G.screen }; H.use('trophy'); const trophy = document.getElementById('hubBody').textContent, tiles = document.querySelectorAll('#hubBody .stat > div').length, faces = document.querySelectorAll('#hubBody .bentry').length, lockedFaces = document.querySelectorAll('#hubBody .bentry.locked').length;
    H.use('coffee'); const cups = [...document.querySelectorAll('#hubBody [data-cup]')].map(e => e.getAttribute('data-cup')).join(), quip = document.querySelector('#hubBody .bubble').textContent; return { back, trophy, tiles, faces, lockedFaces, cups, quip }; });
  check('the chart rack is the bestiary, and BACK returns to the room (not the title)', bestO === 'bestiary' && b.back.overlay === null && b.back.screen === 'hub');
  check('the trophy wall lists the bosses (the four, and Reflux since block S), runs, best run, and a portrait frame per patron (1 of 9 met)', /Staghorn Calculus/.test(b.trophy) && /The Invader/.test(b.trophy) && /Reflux/.test(b.trophy) && /Patrons met · 1 \/ 9/.test(b.trophy) && b.tiles >= 6 && b.faces === 9 && b.lockedFaces === 8);
  check('the coffee machine pours drip or decaf (espresso needs the machine from the decor catalog) and has something to say', b.cups === 'drip,decaf' && b.quip.length > 8, b.quip);
  await p.click('#hubBody [data-cup="drip"]'); await p.waitForTimeout(60);
  b = await p.evaluate(() => { const H = UroCrawl.hub, m = UroCrawl.meta, cup = H.state.cup; H.use('scrubs'); const sw = [...document.querySelectorAll('#hubBody [data-scrub]')], pager = document.querySelector('#hubBody .bubble').textContent, cme0 = m.hub.cme;
    const lockedTxt = sw[2].textContent; sw[2].click(); document.querySelector('#hubBody [data-scrub="2"]').click(); const bought = { scrub: m.settings.scrub, owned: !!m.hub.owned.scrub2, paid: cme0 - m.hub.cme }; document.querySelector('#hubBody [data-scrub="0"]').click(); const back0 = m.settings.scrub; document.querySelector('#hubBody [data-scrub="2"]').click(); const again = { scrub: m.settings.scrub, paid: cme0 - m.hub.cme };
    return { cup, n: sw.length, pager, lockedTxt, bought, back0, again }; });
  check('a cup of drip goes in your hand; the scrub cabinet shows twelve colours (block T\'s palette) and a pager message', b.cup === 'drip' && b.n === 12 && /PAGER/.test(b.pager), b.pager);
  check('a locked scrub colour (navy, PGY-2) can be bought early for 15 CME and worn (a first tap tries it on, the second buys it); switching between owned colours is free', /PGY-2/.test(b.lockedTxt) && b.bought.scrub === 2 && b.bought.owned && b.bought.paid === 15 && b.back0 === 0 && b.again.scrub === 2 && b.again.paid === 15, JSON.stringify(b.bought));

  // ── decor: bought with CME, into fixed slots ──
  await p.evaluate(() => UroCrawl.hub.use('decor'));
  b = await p.evaluate(() => { const H = UroCrawl.hub, m = UroCrawl.meta.hub, D = H.tables.DECOR, btn = id => document.querySelector('#hubBody [data-decor="' + id + '"]'), props0 = H.state.props, cme0 = m.cme, slots = Object.keys(D).map(k => D[k].slot);
    btn('greg').click(); const bought = { owned: !!m.owned.greg, at: m.decor.corner, paid: cme0 - m.cme, props: H.state.props, label: btn('greg').textContent };
    btn('greg').click(); const away = { at: m.decor.corner, props: H.state.props, label: btn('greg').textContent, paid: cme0 - m.cme };
    btn('greg').click(); const shown = { at: m.decor.corner, paid: cme0 - m.cme };
    btn('poster').click(); btn('diplomas').click(); const wall1 = m.decor.wall; btn('poster').click(); const wall2 = m.decor.wall, bothOwned = !!m.owned.poster && !!m.owned.diplomas, paid2 = cme0 - m.cme;
    const esp = H.buy('espresso'), again = H.buy('espresso'), coffeeName = H.state.stations.find(s => s.id === 'coffee').name; m.cme = 5; const poor = H.buy('tank'); m.cme = 300; const badPlace = H.place('wall', 'greg');
    return { n: Object.keys(D).length, slots: [...new Set(slots)].sort().join(), bought, away, shown, wall1, wall2, bothOwned, paid2, esp, again, coffeeName, poor, badPlace, props0 }; });
  check('the catalog sells the roadmap\'s decor into fixed slots (wall, window, desk, floor, corner, plus the counter)', b.n >= 8 && ['corner', 'desk', 'floor', 'wall', 'window'].every(s => b.slots.includes(s)), b.n + ' items · slots ' + b.slots);
  check('buying Greg costs 25 CME and puts him in the corner (one more thing in the room); he can be put away and brought back for free', b.bought.owned && b.bought.at === 'greg' && b.bought.paid === 25 && b.bought.props === b.props0 + 1 && /PUT AWAY/.test(b.bought.label) && b.away.at === undefined && b.away.props === b.props0 && /DISPLAY/.test(b.away.label) && b.away.paid === 25 && b.shown.at === 'greg' && b.shown.paid === 25);
  check('a slot holds one thing at a time: the diplomas replace the poster on the wall, and swapping back is free; an item you cannot afford is refused; an item cannot go in another slot', b.wall1 === 'diplomas' && b.wall2 === 'poster' && b.bothOwned && b.paid2 === 25 + 15 + 20 && b.poor === false && b.badPlace === false);
  check('the espresso machine (decor) upgrades the coffee station, once', b.esp === true && b.again === false && b.coffeeName === 'ESPRESSO MACHINE');
  await p.evaluate(() => { UroCrawl.hub.close(); UroCrawl.hub.use('coffee'); });
  b = await p.evaluate(() => ({ cups: [...document.querySelectorAll('#hubBody [data-cup]')].map(e => e.getAttribute('data-cup')).join(), T: UroCrawl.hub.tables.CUPS }));
  check('with the machine there are three cups: espresso beats drip, and decaf is a trap (slower)', b.cups === 'espresso,drip,decaf' && b.T.espresso.spd > b.T.drip.spd && b.T.drip.spd > 1 && b.T.espresso.dmg > 1 && b.T.decaf.spd < 1 && !/slow|−|-\d/.test(b.T.decaf.desc), 'decaf says: ' + b.T.decaf.desc);
  await p.evaluate(() => UroCrawl.hub.close());

  // ── the cast: lines rotate and never repeat back to back ──
  b = await p.evaluate(() => { const H = UroCrawl.hub, L = H.tables.LINES, out = {}, who = ['attending', 'janitor', 'brax', 'kiki', 'rex', 'sunny'];
    who.forEach(w => { const said = []; for (let i = 0; i < L[w].length * 2 + 1; i++) said.push(H.talk(w)); let rep = false; for (let i = 1; i < said.length; i++) if (said[i] === said[i - 1]) rep = true; out[w] = { n: L[w].length, uniq: new Set(said).size, rep, brace: said.some(s => /[{}]/.test(s)), empty: said.some(s => !s), bubble: H.state.bubble && H.state.bubble.who === w, pos: UroCrawl.meta.hub.lines[w] }; });
    H.goto('reps'); H.step(2); const near = H.state.near; H.use('reps'); const repWho = H.state.bubble ? H.state.bubble.who : null;
    return { out, near, repWho, caseLine: L.attending.some(s => /\{case\}/.test(s)), pager: L.pager.length, coffee: L.coffee.length }; });
  check('the attending, the janitor and each of the four reps have at least 8 lines; they rotate, never repeat back to back, and the place in the rotation is saved', cast.every(w => b.out[w].n >= 8 && b.out[w].uniq >= 8 && !b.out[w].rep && !b.out[w].empty && b.out[w].bubble && typeof b.out[w].pos === 'number'), cast.map(w => w + ' ' + b.out[w].n).join(' · '));
  check('the attending names today\'s case in his lines; the rep table lets the nearest rep talk; the pager and the coffee machine have their own lines', b.caseLine && !b.out.attending.brace && b.near === 'reps' && ['brax', 'kiki', 'rex', 'sunny'].includes(b.repWho) && b.pager >= 8 && b.coffee >= 8, 'rep: ' + b.repWho);
  await p.waitForTimeout(250); await shot(p, 'r-rep-talk');
  b = await p.evaluate(() => { const H = UroCrawl.hub, P = UroCrawl.player(), j = () => H.state.npcs.find(n => n.id === 'janitor'); P.x = 480; P.y = 300; H.step(300); const a = j(); H.step(600); const c = j(); H.talk('janitor'); const t0 = j(); H.step(40); const t1 = j(); H.step(900);
    H.goto('janitor'); H.step(1); return { moved: Math.hypot(c.x - a.x, c.y - a.y), held: Math.hypot(t1.x - t0.x, t1.y - t0.y), near: H.state.near }; });
  check('the janitor walks his round, stands still while he talks, and can be found wherever he is', b.moved > 40 && b.held < 0.01 && b.near === 'janitor', 'moved ' + Math.round(b.moved) + ' px');

  // ── the OR door: walking into it asks, SCRUB IN starts the run with everything picked ──
  b = await p.evaluate(() => { const H = UroCrawl.hub, m = UroCrawl.meta, P = UroCrawl.player(); m.xp = 9000; UroCrawl.setAspect('scalpel', 'lunger');
    m.hub.rx = { run: m.runs || 0, offer: ['tamsulosin', 'dualfreq', 'bigfiber'], pick: 'tamsulosin' };
    P.x = 880; P.y = 270; H.step(2); UroCrawl.input.keys.KeyD = true; H.step(40); UroCrawl.input.keys.KeyD = false; return { overlay: UroCrawl.state.overlay, panel: H.state.panel, back: document.getElementById('btnHubBack').textContent, txt: document.getElementById('hubBody').textContent }; });
  check('walking into the OR door opens the scrub-in sheet: the case, both instruments with their aspects, the boon, the pin, the coffee, the perks', b.overlay === 'hub' && b.panel === 'door' && b.back === 'NOT YET' && /INFECTION/.test(b.txt) && /Scalpel/.test(b.txt) && /Lunger/.test(b.txt) && /Bovie/.test(b.txt) && /Tamsulosin/.test(b.txt) && /Lithotrite pin/.test(b.txt) && /Drip coffee/.test(b.txt) && /Power Nap/.test(b.txt), b.txt.slice(0, 120));
  await p.click('#btnHubBack'); await p.waitForTimeout(60);
  b = await p.evaluate(() => { const H = UroCrawl.hub; H.step(20); const stay = UroCrawl.state.overlay; H.use('door'); return { stay, panel: H.state.panel }; });
  check('NOT YET closes it and it does not pop straight back while you stand in the doorway; using the door asks again', b.stay === null && b.panel === 'door');
  await p.click('#btnScrubIn'); await p.waitForTimeout(100);
  b = await p.evaluate(() => { const G = UroCrawl.state, P = UroCrawl.player(); G.timeScale = 0; UroCrawl.input.mode = 'kb';
    const r = { running: G.running, screen: G.screen, overlay: G.overlay, room: G.roomIndex, weapons: G.weapons.map(w => w.id).join(), aspect: G.weapons[0].aspect, boons: G.boons.join(), boss: G.bossId, maxHp: P.maxHp, hp: P.hp, rvu: G.rvu, pin: G.pin, cup: G.cup && { kind: G.cup.kind, room: G.cup.room }, free: G.freeReroll, swapMul: G.swapMul, fromHub: G.fromHub, hubCup: UroCrawl.hub.state.cup, told: G.texts.some(t => /COFFEE: \+6% SPEED/.test(t.text)) };
    G.enemies.forEach(e => { e.silent = true; e.hp = 0; }); UroCrawl.step(1); if (G.waves) G.waves.next = 99; G.bullets.length = 0;
    const stone = UroCrawl.spawn('com', 700, 150, { instant: true }); stone.def = Object.assign({}, stone.def, { update: function () {} }); r.litho = UroCrawl.dealDamage(stone, 10, 'LITHO', {}); r.energy = UroCrawl.dealDamage(stone, 10, 'ENERGY', {});
    UroCrawl.selectWeapon(1); r.swapT = G.swapT; stone.silent = true; stone.hp = 0; UroCrawl.step(30);
    P.x = 200; P.y = 270; UroCrawl.input.keys.KeyD = true; UroCrawl.step(3); UroCrawl.input.keys.KeyD = false; r.dx1 = P.x - 200; return r; });
  check('SCRUB IN starts a run in room 1 with the locker\'s two instruments and their aspects, the cart\'s boon and the case board\'s boss', b.running && b.screen === 'run' && b.overlay === null && b.room === 1 && b.weapons === 'scalpel,bovie' && b.aspect === 'lunger' && b.boons === 'tamsulosin' && b.boss === 'fournier' && b.fromHub === true, b.weapons + ' · ' + b.aspect + ' · ' + b.boons + ' · ' + b.boss);
  check('the perks come along: Power Nap ×3 = 130 max HP, Moonlighting = 25 starting RVUs, a free altar reroll, 5% faster swaps', b.maxHp === 130 && b.hp === 130 && b.rvu === 25 && b.free === 1 && Math.abs(b.swapMul - 0.95) < 1e-9 && Math.abs(b.swapT - 0.25 * 0.95) < 1e-9, 'HP ' + b.maxHp + ' · RVU ' + b.rvu + ' · swap ' + b.swapT);
  check('the pin works in the run: the Lithotrite pin adds 4% to LITHO damage and nothing to ENERGY', b.pin && b.pin.id === 'civiale' && b.pin.lvl === 1 && Math.abs(b.litho - 10 * 1.75 * 1.04) < 1e-6 && Math.abs(b.energy - 4) < 1e-6, 'LITHO ' + b.litho + ' · ENERGY ' + b.energy);
  check('the coffee comes along (and leaves your hand): +6% move speed in the first room', b.cup && b.cup.kind === 'drip' && b.cup.room === 1 && b.hubCup === '' && b.told && Math.abs(b.dx1 - 3 * 190 * 1.06 / 60) < 0.01, 'dx ' + b.dx1.toFixed(3));
  // an altar in this run: the free reroll, and meeting its patron
  b = await p.evaluate(() => { const G = UroCrawl.state, P = UroCrawl.player(), btn = document.getElementById('btnReroll'); G.rewards.push({ kind: 'altar', x: 600, y: 300, patron: 'huggins' }); P.x = 700; P.y = 300; UroCrawl.step(3); P.x = 600; P.y = 300; UroCrawl.step(3);
    const o = G.overlay, label = btn.textContent, rvu0 = G.rvu, met = UroCrawl.meta.hub.met.huggins; btn.click(); const after = { rvu: G.rvu, free: G.freeReroll, label: btn.textContent }; document.getElementById('btnBoonSkip').click();
    G.rewards.push({ kind: 'altar', x: 600, y: 400, patron: 'young' }); P.x = 700; P.y = 400; UroCrawl.step(3); P.x = 600; P.y = 400; UroCrawl.step(3); const label2 = btn.textContent, off2 = btn.disabled; btn.click(); const paid = rvu0 - G.rvu; document.getElementById('btnBoonSkip').click();
    return { o, label, met, after, label2, off2, paid, metYoung: UroCrawl.meta.hub.met.young }; });
  check('Second Opinion: the first altar reroll of the run is free, the next costs 25 RVU as before', b.o === 'boon' && /FREE/.test(b.label) && b.after.rvu === 25 && b.after.free === 0 && b.after.label === 'REROLLED' && b.label2 === 'REROLL (25 RVU)' && !b.off2 && b.paid === 25, b.label + ' → ' + b.label2);
  check('opening a patron\'s altar is meeting them: Huggins and Young now have pins waiting in the call room', b.met === 1 && b.metYoung === 1);
  b = await p.evaluate(() => { const G = UroCrawl.state; UroCrawl.skipRoom(); UroCrawl.step(5); const starter = G.overlay; if (G.overlay) UroCrawl.hideScreens(); const P = UroCrawl.player(), d = G.doors[0]; P.x = d.x - 20; P.y = d.y + d.h / 2; UroCrawl.step(80);
    G.enemies.forEach(e => { e.silent = true; e.hp = 0; }); UroCrawl.step(1); if (G.waves) G.waves.next = 99; const P2 = UroCrawl.player(), xa = P2.x; UroCrawl.input.keys.KeyD = true; UroCrawl.step(3); UroCrawl.input.keys.KeyD = false;
    return { starter, room: G.roomIndex, done: G.cup.done, off: G.texts.some(t => /COFFEE WEARS OFF/.test(t.text)), dx2: P2.x - xa }; });
  check('the coffee lasts one room: in room 2 it has worn off and the surgeon is back to normal speed', b.room === 2 && b.done === true && b.off && Math.abs(b.dx2 - 3 * 190 / 60) < 0.01, 'room ' + b.room + ' · dx ' + b.dx2.toFixed(3));
  // persistence: everything bought and picked survives a reload
  const before = await p.evaluate(() => JSON.stringify(UroCrawl.meta.hub));
  await p.reload(); await p.waitForFunction(() => !!window.UroCrawl);
  b = await p.evaluate(() => ({ json: JSON.stringify(UroCrawl.meta.hub), xpLine: document.getElementById('resXp').textContent }));
  const h0 = JSON.parse(before), h1 = JSON.parse(b.json);
  check('the Call Room\'s state persists across a reload: CME, perks, decor and what is on display, owned items, the pin, patrons met, the loadout, the case, the speakers\' places', b.json === before && h1.cme === h0.cme && h1.perks.hp === 3 && h1.decor.corner === 'greg' && h1.decor.wall === 'poster' && h1.decor.counter === 'espresso' && h1.owned.diplomas === 1 && h1.pin === 'civiale' && h1.met.civiale === 1 && h1.load.join() === 'scalpel,bovie' && h1.dungeon === 'fournier' && Object.keys(h1.lines).length >= 6 && / CME$/.test(b.xpLine), h1.cme + ' CME · decor ' + JSON.stringify(h1.decor));
  await p.click('#btnPlay'); await p.waitForTimeout(250);
  b = await p.evaluate(() => { const s = UroCrawl.hub.state; return { on: s.on, overlay: UroCrawl.state.overlay, coffee: s.stations.find(x => x.id === 'coffee').name, props: s.props, dungeon: s.dungeon, loadout: s.loadout.join() }; });
  check('after the reload PLAY goes straight to the room (How to play is only shown once) and the decor is still standing', b.on && b.overlay === null && b.coffee === 'ESPRESSO MACHINE' && b.props === 11 && b.dungeon === 'fournier' && b.loadout === 'scalpel,bovie', b.props + ' props');
  await p.waitForTimeout(300); await shot(p, 'r-hub-furnished');
  await p.keyboard.press('Escape'); await p.waitForTimeout(100);
  b = await p.evaluate(() => ({ panel: UroCrawl.hub.state.panel, btns: [...document.querySelectorAll('#hubBody .btn')].map(x => x.textContent).join('|') }));
  await p.evaluate(() => [...document.querySelectorAll('#hubBody .btn')].find(x => /TITLE/.test(x.textContent)).click());
  const t = await p.evaluate(() => ({ overlay: UroCrawl.state.overlay, screen: UroCrawl.state.screen, on: UroCrawl.hub.state.on, music: UroCrawl.snd.music.mode }));
  check('Esc in the room opens its menu (how to play, settings, back to title); BACK TO TITLE leaves the room', b.panel === 'menu' && /HOW TO PLAY/.test(b.btns) && /SETTINGS/.test(b.btns) && t.overlay === 'title' && t.screen === 'title' && !t.on && t.music === 'title', b.btns);
  // QUICK START: no hub, but what is permanent still applies
  await p.click('#btnQuick'); await p.waitForTimeout(100);
  b = await p.evaluate(() => { const G = UroCrawl.state, P = UroCrawl.player(); return { running: G.running, fromHub: G.fromHub, weapons: G.weapons.map(w => w.id).join(), boons: G.boons.length, cup: G.cup, pin: G.pin && G.pin.id, maxHp: P.maxHp, rvu: G.rvu, boss: G.bossId, roll: UroCrawl.rollBossId() }; });
  check('QUICK START skips the room: a run with the saved loadout, pin and perks, but no cart boon, no coffee, and the boss the seed rolls (not the case board\'s)', b.running && b.fromHub === false && b.weapons === 'scalpel,bovie' && b.boons === 0 && b.cup === null && b.pin === 'civiale' && b.maxHp === 130 && b.rvu === 25 && b.boss === b.roll, b.weapons + ' · boss ' + b.boss);

  // ── CME: what a run pays, and the summary's way back ──
  const { p: p2, errs: errs2 } = await open('?seed=5&god=1&boss=staghorn&hub=1&cme=40'); allErrs.push(errs2);
  b = await p2.evaluate(() => ({ on: UroCrawl.hub.state.on, cme: UroCrawl.meta.hub.cme, title: document.getElementById('ov-title').classList.contains('show'), screen: UroCrawl.state.screen }));
  check('?hub=1 boots straight into the Call Room and ?cme=N sets the balance', b.on && b.cme === 40 && !b.title && b.screen === 'hub');
  b = await p2.evaluate(() => { const H = UroCrawl.hub, m = UroCrawl.meta, G = UroCrawl.state; H.meet('civiale'); m.hub.pin = 'civiale'; m.hub.pinUse.civiale = 2; const un0 = H.caseUnlocked(1);
    H.scrubIn(); UroCrawl.step(200); G.favor = { civiale: 2 }; G.pens = 2; UroCrawl.skipRoom(); UroCrawl.step(400);
    const lr = H.state.lastRun; return { un0, won: G.won, overlay: G.overlay, parts: lr.parts, total: lr.total, cme: m.hub.cme, kills: m.hub.bosses.staghorn, use: m.hub.pinUse.civiale, lvl: H.pinLevel('civiale'), pens: m.hub.pens, fav: m.hub.fav.civiale, line: document.getElementById('sumCme').textContent, un1: H.caseUnlocked(1), btn: document.getElementById('btnSumHub').textContent, T: H.tables.CME }; });
  const part = (re) => b.parts.find(s => re.test(s)), num = (s) => s ? +s.split(' ').pop() : 0;
  const charts = part(/new chart/), nCharts = charts ? +charts.split(' ')[0] : 0;
  check('a won run pays CME for rooms cleared (9 × 2), the boss (15), a first kill of that boss (60), each first-time chart (5) and a patron favor milestone (10)', b.won && b.overlay === 'summary' && part(/^rooms 18$/) && part(/^boss 15$/) && part(/^first kill 60$/) && nCharts >= 1 && num(charts) === nCharts * b.T.CHART && part(/^patron favor 10$/) && b.total === 18 + 15 + 60 + nCharts * 5 + 10 && b.cme === 40 + b.total, b.parts.join(' · ') + ' = ' + b.total);
  check('the summary shows the CME earned; the boss kill is on record and opens the next case; the worn pin gained a run (3 → level 2); free pens go in the jar', new RegExp('\\+' + b.total + ' CME').test(b.line) && b.kills === 1 && !b.un0 && b.un1 && b.use === 3 && b.lvl === 2 && b.pens === 2 && b.fav === 2 && b.btn === 'CALL ROOM', b.line);
  await p2.waitForTimeout(200); await shot(p2, 'r-summary');
  await p2.click('#btnSumHub'); await p2.waitForTimeout(150);
  b = await p2.evaluate(() => { const H = UroCrawl.hub, m = UroCrawl.meta, G = UroCrawl.state, back = { screen: G.screen, overlay: G.overlay, on: H.state.on, running: G.running, music: UroCrawl.snd.music.mode, toast: H.state.toast }, cme0 = m.hub.cme;
    H.scrubIn(); UroCrawl.step(200); G.favor = { civiale: 4 }; UroCrawl.skipRoom(); UroCrawl.step(400); const lr = H.state.lastRun; return { back, parts: lr.parts, total: lr.total, paid: m.hub.cme - cme0, kills: m.hub.bosses.staghorn, pin: G.pin && G.pin.lvl }; });
  check('the summary\'s CALL ROOM button walks you back into the room, which says what the run paid', b.back.screen === 'hub' && b.back.overlay === null && b.back.on && !b.back.running && b.back.music === 'hub' && /^\+108 CME/.test(b.back.toast || ''), String(b.back.toast));
  check('a second win over the same boss pays no first-kill bonus and no chart twice; the next favor milestone (4) pays once more; the pin went in at level 2', b.parts.join('|') === 'rooms 18|boss 15|patron favor 10' && b.total === 43 && b.paid === 43 && b.kills === 2 && b.pin === 2, b.parts.join(' · '));
  // a lost run: rooms only
  const { p: p3, errs: errs3 } = await open('?seed=9&room=3&hub=1'); allErrs.push(errs3);
  b = await p3.evaluate(() => { const H = UroCrawl.hub, G = UroCrawl.state; H.scrubIn(); UroCrawl.step(60); UroCrawl.skipRoom(); UroCrawl.step(10); if (G.overlay) UroCrawl.hideScreens(); UroCrawl.hurtPlayer(5000, 'test', 0, true); UroCrawl.step(300);
    const lr = H.state.lastRun, one = { won: G.won, overlay: G.overlay, parts: lr.parts.join('|'), cme: UroCrawl.meta.hub.cme }; document.getElementById('btnSumHub').click(); H.scrubIn(); UroCrawl.step(30); UroCrawl.hurtPlayer(5000, 'test', 0, true); UroCrawl.step(300);
    return { one, zero: H.state.lastRun.total, line: document.getElementById('sumCme').textContent, cme: UroCrawl.meta.hub.cme }; });
  check('a lost run still pays for the rooms it cleared (3 rooms = 6 CME); a run that clears nothing pays nothing and says so', !b.one.won && b.one.overlay === 'summary' && b.one.parts === 'rooms 6' && b.one.cme === 6 && b.zero === 0 && /No CME/.test(b.line) && b.cme === 6, b.one.parts + ' · then: ' + b.line);
  // a fresh save is the game as it was
  const { p: p4, errs: errs4 } = await open('?seed=3'); allErrs.push(errs4);
  b = await p4.evaluate(() => { UroCrawl.startRun(); const G = UroCrawl.state, P = UroCrawl.player(); G.timeScale = 0; UroCrawl.step(5); const s = UroCrawl.spawn('com', 700, 150, { instant: true });
    return { weapons: G.weapons.map(w => w.id).join(), maxHp: P.maxHp, rvu: G.rvu, pin: G.pin, cup: G.cup, free: G.freeReroll, swapMul: G.swapMul, speed: P.speed, litho: UroCrawl.dealDamage(s, 10, 'LITHO', {}), fromHub: G.fromHub }; });
  check('with nothing bought or picked a run is exactly the run it was: holmium + scalpel, 100 HP, 0 RVU, no pin, no coffee, LITHO × stone still 17.5', b.weapons === 'holmium,scalpel' && b.maxHp === 100 && b.rvu === 0 && b.pin === null && b.cup === null && b.free === 0 && b.swapMul === 1 && b.speed === 190 && Math.abs(b.litho - 17.5) < 1e-9 && b.fromHub === false, JSON.stringify(b));

  // ── phone: touch, the stick, the one big INTERACT button ──
  for (const cx of browser.contexts()) await cx.close();   // the frame rate below should be this page's own
  const { p: p5, errs: errs5 } = await open('?seed=4', 844, 390, true); allErrs.push(errs5);
  await p5.tap('#btnPlay'); await p5.waitForTimeout(100); await p5.tap('#btnHelpOk'); await p5.waitForTimeout(200); await p5.tap('#btnHeroOk'); await p5.waitForTimeout(100);
  b = await p5.evaluate(() => ({ on: UroCrawl.hub.state.on, mode: UroCrawl.input.mode }));
  check('touch: PLAY lands in the room in touch mode', b.on && b.mode === 'touch');
  box = await canvasBox(p5);
  const px = (x, y) => [box.l + x * box.s, box.t + y * box.s];
  const cdp = await p5.context().newCDPSession(p5);
  const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(pt => ({ x: pt[0], y: pt[1], id: pt[2] || 1, radiusX: 6, radiusY: 6, force: 1 })) });
  const tx0 = await p5.evaluate(() => UroCrawl.player().x);
  let a = px(200, 380); await touch('touchStart', [[a[0], a[1], 1]]); await p5.waitForTimeout(50);
  let a2 = px(262, 380); await touch('touchMove', [[a2[0], a2[1], 1]]); await p5.waitForTimeout(450);
  b = await p5.evaluate(() => ({ stick: !!UroCrawl.input.stick, x: UroCrawl.player().x }));
  check('touch: the floating stick walks the surgeon', b.stick && b.x > tx0 + 30, Math.round(tx0) + ' → ' + Math.round(b.x));
  await touch('touchEnd', []); await p5.waitForTimeout(80);
  await p5.evaluate(() => { UroCrawl.hub.goto('perks'); UroCrawl.hub.step(2); });
  const fire = px(960 - 84, 540 - 86); await touch('touchStart', [[fire[0], fire[1], 2]]); await p5.waitForTimeout(40); await touch('touchEnd', []); await p5.waitForTimeout(150);
  b = await p5.evaluate(() => ({ panel: UroCrawl.hub.state.panel, overlay: UroCrawl.state.overlay }));
  check('touch: the big INTERACT button uses the station you stand by', b.overlay === 'hub' && b.panel === 'perks');
  await p5.evaluate(() => UroCrawl.hub.addCme(100)); await p5.evaluate(() => UroCrawl.hub.use('perks'));
  await p5.tap('#hubBody [data-buy="rvu"]'); await p5.waitForTimeout(60); await p5.tap('#btnHubBack'); await p5.waitForTimeout(100);
  b = await p5.evaluate(() => ({ rvu: UroCrawl.meta.hub.perks.rvu, cme: UroCrawl.meta.hub.cme, overlay: UroCrawl.state.overlay }));
  check('touch: a panel\'s buttons work with a tap (bought Moonlighting, BACK closes)', b.rvu === 1 && b.cme === 80 && b.overlay === null);
  const roll = px(960 - 196, 540 - 58); await touch('touchStart', [[roll[0], roll[1], 3]]); await p5.waitForTimeout(60);
  const rolled = await p5.evaluate(() => { const P = UroCrawl.player(); return P.roll > 0 || P.rollCd > 0; });
  await touch('touchEnd', []); await p5.waitForTimeout(500);
  const menu = px(960 - 32, 30); await touch('touchStart', [[menu[0], menu[1], 4]]); await p5.waitForTimeout(40); await touch('touchEnd', []); await p5.waitForTimeout(150);
  b = await p5.evaluate(() => ({ panel: UroCrawl.hub.state.panel }));
  check('touch: ROLL rolls, the menu button opens the room\'s menu', rolled && b.panel === 'menu');
  await p5.tap('#btnHubBack'); await p5.waitForTimeout(2300);
  b = await p5.evaluate(() => ({ fps: UroCrawl.state.fps, on: UroCrawl.hub.state.on, overlay: UroCrawl.state.overlay }));
  check('phone (844×390, touch): the room draws at a playable frame rate', b.on && b.overlay === null && b.fps >= 40, 'fps ' + b.fps);
  await shot(p5, 'r-phone');
  errCheck('R', [].concat(...allErrs));
});

// ───────── S. the Peds Wing (roadmap Step 4): the dungeon, its drills and tech, Wilms, the Reflux serpent, the kids' corner ─────────
// helpers evaluated in the page: clear the room, pin an enemy in place
const PEDSLIB = `
window.__clear = function () { const G = UroCrawl.state; G.enemies.forEach(e => { if (!e.boss) { e.silent = true; e.hp = 0; } }); UroCrawl.step(1); if (G.waves && !G.waves.trial) G.waves.next = 99; G.bullets.length = 0; G.teles.length = 0; G.hazards.length = 0; G.pickups.length = 0; };
window.__pin = function (e) { if (e) e.def = Object.assign({}, e.def, { update: function (x) { x.vx = x.vy = 0; } }); return e; };
`;
async function openS(q, w, h, touch) { const o = await open(q, w, h, touch); await o.p.evaluate(PEDSLIB); return o; }

await block('S. core', async () => {
  const { p, errs } = await openS('?dungeon=peds&seed=3&god=1');
  let b = await p.evaluate(() => { UroCrawl.startRun(); const G = UroCrawl.state; UroCrawl.step(2); const ids = []; G.waves.list.forEach(w => w.forEach(x => ids.push(x.id)));
    return { peds: G.peds, boss: G.bossId, name: G.dungeon.name, room: G.roomIndex, tut: !!G.tutorial, plan: G.trialPlan, par: G.par && G.par.par, ids, frames: G.obstacles.filter(o => o.frame).length, tpl: G.room.template }; });
  const ROOT6 = ['valve', 'tide', 'aim', 'catheter', 'popoff', 'torsion'];
  check('?dungeon=peds starts the Peds Wing: boss Reflux, the dungeon named on the HUD, room 1 a tutorial in the nursery (water balloons, a hydronephrotic kidney), three of the six drills planned for rooms 2, 4 and 6', b.peds && b.boss === 'reflux' && b.name === 'PEDS WING' && b.room === 1 && b.tut && b.tpl === 'p_nursery' && b.ids.every(id => id === 'balloon' || id === 'hydro') && [2, 4, 6].every(k => ROOT6.includes(b.plan[k])) && new Set([b.plan[2], b.plan[4], b.plan[6]]).size === 3 && !b.plan[3], JSON.stringify(b.plan) + ' · ' + b.ids.join());
  // par times and medals
  b = await p.evaluate(() => { const G = UroCrawl.state, P = UroCrawl.player(), m = UroCrawl.meta; const par = G.par.par.slice(), live = !G.par.done; G.par.t = par[0] - 0.5; const rvu0 = G.rvu; UroCrawl.skipRoom(); UroCrawl.step(2); if (G.overlay) UroCrawl.hideScreens();
    return { par, live, medals: G.medals.slice(), bonus: G.rvu - rvu0, banner: G.banner && G.banner.text, sub: G.banner && G.banner.sub, st: Object.assign({}, m.peds.stickers), gold: m.peds.fights[3] }; });
  check('every Peds room runs a calm par timer (gold < silver < bronze); a clear under gold is a GOLD medal: +10 RVU at once, a gold sticker in the book', b.live && b.par[0] < b.par[1] && b.par[1] < b.par[2] && b.medals.length === 1 && b.medals[0].medal === 3 && b.medals[0].kind === 'fight' && b.bonus === 10 && /GOLD/.test(b.banner) && b.st['fight:3'] === 1 && b.gold === 1, JSON.stringify(b));
  b = await p.evaluate(() => { const F = UroCrawl.peds.frame(), A = { x: 26, y: 26, w: 908, h: 488 }, ix0 = 62, ix1 = 898, iy0 = 46, iy1 = 494, ratio = (ix1 - ix0) * (iy1 - iy0) / (A.w * A.h);
    const P = UroCrawl.player(), G = UroCrawl.state; __clear(); P.x = 120; P.y = 150; UroCrawl.input.keys.KeyA = true; UroCrawl.step(30); UroCrawl.input.keys.KeyA = false; const wallX = P.x; P.x = 300; P.y = 100; UroCrawl.input.keys.KeyW = true; UroCrawl.step(30); UroCrawl.input.keys.KeyW = false; const wallY = P.y;
    P.x = 120; P.y = 270; UroCrawl.input.keys.KeyA = true; UroCrawl.step(40); UroCrawl.input.keys.KeyA = false; const doorX = P.x;
    return { n: F.length, ratio, wallX, wallY, doorX }; });
  check('the toy-box wall stands in from the edges (36 px at the sides, 20 at the ends) with gaps at the four doors: the room is ~15% tighter and the wall is solid', b.n === 8 && b.ratio > 0.82 && b.ratio < 0.87 && b.wallX >= 62 + 13 - 0.5 && b.wallY >= 46 + 13 - 0.5 && b.doorX < 60, 'area ×' + b.ratio.toFixed(3) + ' · stopped at x ' + b.wallX.toFixed(1) + ', y ' + b.wallY.toFixed(1) + ' · in the door gap x ' + b.doorX.toFixed(1));
  // the pediatric scope: −15% range (every range number goes through wmod), +20% on weak points
  b = await p.evaluate(() => { const G = UroCrawl.state, P = UroCrawl.player(); __clear(); G.weapons.length = 0; G.wIndex = 0; UroCrawl.giveWeapon('thulium'); G.swapT = 0; const w = G.weapons[0];
    P.x = 200; P.y = 270; UroCrawl.input.mode = 'kb'; UroCrawl.input.mx = 900; UroCrawl.input.my = 270; UroCrawl.input.mouseFire = true; UroCrawl.step(4); UroCrawl.input.mouseFire = false; const len = w.fx ? Math.hypot(w.fx.x1 - w.fx.x0, w.fx.y1 - w.fx.y0) : -1;
    const ab = UroCrawl.spawn('abscess', 600, 200, { instant: true }); __pin(ab); const wp = ab.wp; const at = { hx: ab.x + wp.ox, hy: ab.y + wp.oy }, d1 = UroCrawl.dealDamage(ab, 10, 'FLUID', Object.assign({}, at)), d0 = UroCrawl.dealDamage(ab, 10, 'FLUID', { hx: ab.x - ab.r * 0.95 * Math.cos(Math.atan2(wp.oy, wp.ox)), hy: ab.y - ab.r * 0.95 * Math.sin(Math.atan2(wp.oy, wp.ox)) });
    return { wr: UroCrawl.wmod(w, 'range'), len, d1, d0, hasWp: !!wp }; });
  const { p: q2 } = await openS('?seed=3&god=1&room=2');
  const base = await q2.evaluate(() => { UroCrawl.startRun(); UroCrawl.step(2); __clear(); const G = UroCrawl.state, P = UroCrawl.player(); G.obstacles.length = 0; G.weapons.length = 0; G.wIndex = 0; UroCrawl.giveWeapon('thulium'); G.swapT = 0; const w = G.weapons[0];
    P.x = 200; P.y = 270; UroCrawl.input.mode = 'kb'; UroCrawl.input.mx = 900; UroCrawl.input.my = 270; UroCrawl.input.mouseFire = true; UroCrawl.step(4); UroCrawl.input.mouseFire = false; const len = w.fx ? Math.hypot(w.fx.x1 - w.fx.x0, w.fx.y1 - w.fx.y0) : -1;
    const ab = UroCrawl.spawn('abscess', 600, 200, { instant: true }); __pin(ab); const wp = ab.wp; const d1 = UroCrawl.dealDamage(ab, 10, 'FLUID', { hx: ab.x + wp.ox, hy: ab.y + wp.oy }); return { wr: UroCrawl.wmod(w, 'range'), len, d1, peds: UroCrawl.state.peds }; });
  await q2.context().close();
  check('the pediatric scope: in the Peds Wing every weapon has −15% range (a Thulium beam reaches 85% as far) and hits on a weak point do +20%; outside it nothing changes', Math.abs(b.wr - 0.85) < 1e-9 && base.wr === 1 && !base.peds && Math.abs(b.len / base.len - 0.85) < 0.02 && b.hasWp && Math.abs(b.d1 / base.d1 - 1.2) < 1e-6, 'beam ' + Math.round(b.len) + ' vs ' + Math.round(base.len) + ' px · weak point ' + b.d1.toFixed(2) + ' vs ' + base.d1.toFixed(2));
  b = await p.evaluate(() => { const G = UroCrawl.state, P = UroCrawl.player(), d = G.doors[0]; P.x = d.x - 20; P.y = d.y + d.h / 2; UroCrawl.step(60); if (G.overlay) UroCrawl.hideScreens(); const room = G.roomIndex, trial = G.room.trial || null;
    let fight = null; if (trial) { UroCrawl.skipRoom(); UroCrawl.step(3); if (G.overlay) UroCrawl.hideScreens(); const d2 = G.doors[0]; P.x = d2.x - 20; P.y = d2.y + d2.h / 2; UroCrawl.step(60); if (G.overlay) UroCrawl.hideScreens(); }
    const par = G.par ? G.par.par.slice() : null; if (G.par) G.par.t = par[2] + 5; const rvu0 = G.rvu; UroCrawl.skipRoom(); UroCrawl.step(2); if (G.overlay) UroCrawl.hideScreens(); fight = { room: G.roomIndex, medal: G.medals[G.medals.length - 1], bonus: G.rvu - rvu0 };
    const lr = UroCrawl.hub.award(false); return { room, trial, fight, parts: lr.parts.join('|'), medals: G.medals.map(m => m.medal) }; });
  check('a slow clear only loses the bonus: past bronze it is NO MEDAL and no RVU, never a penalty; the run\'s medals pay CME at the end (gold 3, silver 2, bronze 1)', b.fight.medal.medal === 0 && b.fight.bonus === 0 && /medals \d+/.test(b.parts) && +(b.parts.match(/medals (\d+)/) || [0, 0])[1] === b.medals.reduce((a, m) => a + [0, 1, 2, 3][m], 0), b.parts + ' · medals ' + b.medals.join(','));
  check('room 2 of the Peds Wing is a drill (the stopwatch door led there)', b.room === 2 && !!b.trial, 'room ' + b.room + ' · ' + b.trial);
  await shot(p, 's-core');
  errCheck('S core', errs);
});

await block('S. enemies', async () => {
  const { p, errs } = await openS('?dungeon=peds&seed=5&god=1&room=3');
  await p.evaluate(() => { UroCrawl.startRun(); UroCrawl.step(2); const G = UroCrawl.state; if (G.trial) UroCrawl.skipRoom(); UroCrawl.step(1); __clear(); G.waves = { list: [], next: 0, timer: 99 }; G.cleared = false; });
  let b = await p.evaluate(() => { const G = UroCrawl.state, P = UroCrawl.player(), ids = Object.keys(UroCrawl.tables.ENEMIES).filter(k => UroCrawl.tables.ENEMIES[k].peds && !UroCrawl.tables.ENEMIES[k].hidden);
    const pool = []; for (const id in UroCrawl.tables.ENEMIES) { const d = UroCrawl.tables.ENEMIES[id]; if (!d.hidden && !d.boss && d.cost > 0) pool.push(id + (d.peds ? '*' : '') + (d.dungeon ? '@' + d.dungeon : '')); }
    return { ids, facts: ids.every(id => UroCrawl.tables.ENEMIES[id].fact.length > 40), peds: pool.filter(s => /\*/.test(s)), dung: pool.filter(s => /\*/.test(s)).every(s => /@reflux/.test(s)) }; });
  check('the Peds bestiary: hydronephrotic kidney, BBD, Wilms tumour (elite) and its nephroblasts, botryoid rhabdo, spasm bladder (elite), nocturnal water balloons, febrile UTI, PUV gates, the torsion knot, Reflux; every one has a real fact line, and only the Peds Wing draws them', ['hydro', 'bbd', 'wilms', 'nephroblast', 'botryoid', 'spasm', 'balloon', 'uti', 'puvgate', 'torsion', 'reflux'].every(id => b.ids.includes(id)) && b.facts && b.dung && b.peds.length >= 5, b.ids.join(','));
  // the hydronephrotic kidney: decompress, don't pop
  b = await p.evaluate(() => { const G = UroCrawl.state, P = UroCrawl.player(); P.x = 140; P.y = 270;
    const k = UroCrawl.spawn('hydro', 500, 270, { instant: true }); k.pr = 0.5; const pr0 = k.pr, grade = k.grade; let steps = 0; const coins0 = G.pickups.length;
    while (!k.dead && steps < 40) { UroCrawl.dealDamage(k, 5, 'FLUID', { wid: 'stent' }); UroCrawl.step(7); steps++; }
    const dec = { dead: k.dead, decomp: !!k.decomp, floods: G.hazards.filter(h => h.kind === 'flood').length, coins: G.pickups.length - coins0, hits: steps, txt: G.texts.some(t => /DECOMPRESSED/.test(t.text)), grade };
    const k2 = __pin(UroCrawl.spawn('hydro', 600, 200, { instant: true })); const hp2 = k2.hp; UroCrawl.dealDamage(k2, 999, 'CUT', {}); const pop = { dead: k2.dead, floods: G.hazards.filter(h => h.kind === 'flood').length, txt: G.texts.some(t => /POPPED/.test(t.text)) };
    const k3 = UroCrawl.spawn('hydro', 700, 380, { instant: true }); k3.pr = 0.999; UroCrawl.step(2); const tele = G.teles.find(t => t.e === k3), telDur = tele ? tele.dur : 0; UroCrawl.step(45); const self = { dead: k3.dead, telDur, floods: G.hazards.filter(h => h.kind === 'flood').length };
    return { pr0, dec, pop, self, grades: [1, 2, 3, 4].map(g => { const e = UroCrawl.spawn('hydro', 300 + g * 60, 120, { instant: true }); e.grade = 0; return true; }) }; });
  check('hydronephrosis: a Stent Turret bolt (or the Foley balloon) DECOMPRESSES the kidney: its pressure drains, it goes quietly with coins and no flood', b.dec.dead && b.dec.decomp && b.dec.floods === 0 && b.dec.coins >= 3 && b.dec.txt && b.dec.hits >= 3, JSON.stringify(b.dec));
  check('…while popping it (killing it with damage) floods the floor; left alone its pressure climbs and it bursts by itself after a ≥ 0.5 s warning ring, flooding again', b.pop.dead && b.pop.floods === 1 && b.pop.txt && b.self.dead && b.self.telDur >= 0.5 && b.self.floods === 2, JSON.stringify(b.pop) + ' · ' + JSON.stringify(b.self));
  b = await p.evaluate(() => { const G = UroCrawl.state, P = UroCrawl.player(); __clear(); G.us = { x: 480, y: 50, a: Math.PI / 2, half: 0.46, len: 480, t: 0 }; const a = UroCrawl.spawn('hydro', 480, 300, { instant: true }), c = UroCrawl.spawn('hydro', 110, 470, { instant: true }); a.pr = c.pr = 0.1; UroCrawl.step(20); const r = { inFan: a.usHide, outFan: c.usHide }; G.us = null; UroCrawl.step(20); r.after = c.usHide; return r; });
  check('the antenatal-ultrasound room: kidneys show clearly only inside the grey scanning fan (outside it they are a ghost with no health bar)', b.inFan === false && b.outFan === true && b.after === false, JSON.stringify(b));
  // BBD: the slow zone and the crowd it presses together; PEG and Biofeedback
  b = await p.evaluate(() => { const G = UroCrawl.state, P = UroCrawl.player(); __clear(); P.x = 300; P.y = 270; const m0 = UroCrawl.peds.speedMul(); const bb = UroCrawl.spawn('bbd', 360, 270, { instant: true }); const m1 = UroCrawl.peds.speedMul();
    UroCrawl.giveBoon('peg', true); const m2 = UroCrawl.peds.speedMul(); UroCrawl.dropBoon('peg'); UroCrawl.giveBoon('biofeedback', true); const m3 = UroCrawl.peds.speedMul(); UroCrawl.dropBoon('biofeedback');
    const o = UroCrawl.spawn('nephroblast', 480, 270, { instant: true }); o.def = Object.assign({}, o.def, { update: function (x) { x.vx = x.vy = 0; } }); const d0 = o.x; UroCrawl.step(60); const d1 = o.x;
    const d10 = UroCrawl.dealDamage(bb, 10, 'CUT', {}); UroCrawl.giveBoon('peg', true); const dPeg = UroCrawl.dealDamage(bb, 10, 'CUT', {}); UroCrawl.dropBoon('peg'); UroCrawl.giveBoon('timedvoid', true); const dTv = UroCrawl.dealDamage(bb, 10, 'CUT', {}); UroCrawl.dropBoon('timedvoid');
    return { m0, m1, m2, m3, d0, d1, peg: dPeg / d10, tv: dTv / d10 }; });
  check('BBD: inside its slow zone you move at 62% (Polyethylene Glycol or Biofeedback: 81%), it presses the crowd together, and PEG (×1.6) and Timed Voiding (×1.3) shred it', b.m0 === 1 && Math.abs(b.m1 - 0.62) < 1e-9 && Math.abs(b.m2 - 0.81) < 1e-9 && Math.abs(b.m3 - 0.81) < 1e-9 && b.d1 < b.d0 - 15 && Math.abs(b.peg - 1.6) < 1e-6 && Math.abs(b.tv - 1.3) < 1e-6, JSON.stringify(b));
  // nocturnal water balloons; DDAVP; puddles
  b = await p.evaluate(() => { const G = UroCrawl.state, P = UroCrawl.player(); __clear(); P.x = 300; P.y = 270; P.inv = 0;
    const bl = UroCrawl.spawn('balloon', 700, 270, { instant: true }); const sp = () => Math.hypot(bl.vx, bl.vy - Math.sin(bl.ph) * 12); UroCrawl.step(2); const v0 = sp(); UroCrawl.giveBoon('ddavp', true); UroCrawl.step(1); const v1 = sp();
    bl.x = P.x + 10; bl.y = P.y; UroCrawl.step(2); const pud = G.hazards.filter(h => h.kind === 'puddle'); P.x = pud.length ? pud[0].x : 0; P.y = pud.length ? pud[0].y : 0; const sm = UroCrawl.peds.speedMul(); UroCrawl.dropBoon('ddavp');
    return { v0, v1, dead: bl.dead, pud: pud.length, r: pud.length ? pud[0].r : 0, splash: G.texts.some(t => /SPLASH/.test(t.text)), sm }; });
  check('nocturnal water balloons drift at you and burst into a puddle that slows you (DDAVP: 40% slower drift, smaller puddles)', Math.abs(b.v1 / b.v0 - 0.6) < 0.02 && b.dead && b.pud === 1 && b.r === 17 && b.splash && Math.abs(b.sm - 0.78) < 1e-9, JSON.stringify(b));
  // febrile UTI swarms, halved by prophylaxis
  b = await p.evaluate(() => { const G = UroCrawl.state; const count = () => { let mx = 0, mn = 99; for (let i = 0; i < 25; i++) { __clear(); UroCrawl.spawnWave([{ id: 'uti', elite: false }]); const n = G.enemies.filter(e => !e.dead && e.id === 'uti').length; mx = Math.max(mx, n); mn = Math.min(mn, n); } return [mn, mx]; };
    const a = count(); UroCrawl.giveBoon('cap', true); const c = count(); UroCrawl.dropBoon('cap'); const e = UroCrawl.spawn('uti', 600, 270, { instant: true }); const dc = UroCrawl.dealDamage(e, 10, 'NEUTRAL', {}); UroCrawl.giveBoon('ceftriaxone', true); const dc2 = UroCrawl.dealDamage(e, 10, 'NEUTRAL', {}); UroCrawl.dropBoon('ceftriaxone'); return { a, c, cef: dc2 / dc }; });
  check('febrile UTI swarms come 3–5 strong; Continuous Antibiotic Prophylaxis halves them; ceftriaxone covers the infant E. coli (+35%)', b.a[0] >= 3 && b.a[1] <= 5 && b.a[1] >= 4 && b.c[1] <= 3 && b.c[0] >= 2 && Math.abs(b.cef - 1.35) < 1e-6, JSON.stringify(b));
  // the Wilms elite: roll (0.7 s lane) → slam (0.55 s circle) → nephroblasts; VA ×1.4
  b = await p.evaluate(() => { const G = UroCrawl.state, P = UroCrawl.player(); __clear(); P.x = 160; P.y = 270; const w = UroCrawl.spawn('wilms', 620, 270, { instant: true }); w.timer = 0.05; w.shedT = 99; let lane = null, slam = null, rolled = false, rings0 = G.fxRings.length, slammed = false;
    for (let i = 0; i < 260; i++) { UroCrawl.step(1); G.teles.forEach(t => { if (t.e === w && t.kind === 'line' && !lane) lane = t.dur; if (t.e === w && t.kind === 'circle' && !slam) slam = t.dur; }); if (w.roll > 0) rolled = true; if (slam && G.fxRings.length > rings0) { slammed = true; break; } }
    w.shedT = 0; w.atk = null; UroCrawl.step(3); const kids = G.enemies.filter(e => !e.dead && e.id === 'nephroblast').length;
    const d0 = UroCrawl.dealDamage(w, 10, 'CUT', {}); UroCrawl.giveBoon('va', true); const d1 = UroCrawl.dealDamage(w, 10, 'CUT', {}); const nb = G.enemies.find(e => e.id === 'nephroblast' && !e.dead), dn = nb ? UroCrawl.dealDamage(nb, 1, 'NEUTRAL', {}) : 0; UroCrawl.dropBoon('va'); const dn0 = nb && !nb.dead ? UroCrawl.dealDamage(nb, 1, 'NEUTRAL', {}) : 0;
    return { lane, slam, rolled, slammed, kids, va: d1 / d0, mini: w.def.miniBoss, hp: w.maxHp, vaN: dn0 ? dn / dn0 : 0 }; });
  check('the Wilms tumour elite (450 HP): it rolls down a 0.7 s telegraphed lane, stops and slams (0.55 s ring), sheds nephroblasts; VA chemotherapy is ×1.4 on it and its nephroblasts', b.mini && b.hp === 450 && b.lane >= 0.7 - 1e-9 && b.slam >= 0.5 && b.rolled && b.slammed && b.kids === 2 && Math.abs(b.va - 1.4) < 1e-6, JSON.stringify(b));
  // botryoid: fans of seeds, grapes break off when hit, VAC
  b = await p.evaluate(() => { const G = UroCrawl.state, P = UroCrawl.player(); __clear(); P.x = 160; P.y = 270; const bo = UroCrawl.spawn('botryoid', 600, 270, { instant: true }); bo.timer = 0.05; let tele = 0, shots = 0;
    for (let i = 0; i < 60; i++) { UroCrawl.step(1); G.teles.forEach(t => { if (t.e === bo) tele = Math.max(tele, t.dur); }); shots = Math.max(shots, G.bullets.filter(x => x.hostile).length); }
    const g0 = bo.grapes; UroCrawl.dealDamage(bo, 30, 'NEUTRAL', {}); const grapes = G.enemies.filter(e => !e.dead && e.id === 'grape').length;
    const d0 = UroCrawl.dealDamage(bo, 5, 'NEUTRAL', {}); UroCrawl.giveBoon('va', true); UroCrawl.giveBoon('vac', true); const d1 = UroCrawl.dealDamage(bo, 5, 'NEUTRAL', {}); UroCrawl.dropBoon('vac'); UroCrawl.dropBoon('va');
    return { tele, shots, g0, g1: bo.grapes, grapes, vac: d1 / d0 }; });
  check('botryoid rhabdo: a 0.6 s flash, then a 5-seed fan; a grape breaks off the bunch when it is hit; VA + VAC = ×1.75 on it', b.tele >= 0.6 - 1e-9 && b.shots === 5 && b.g1 < b.g0 && b.grapes >= 1 && Math.abs(b.vac - 1.4 * 1.25) < 1e-6, JSON.stringify(b));
  // the spasm bladder elite: pressure, spasm bursts, the reflux wave; Oxybutynin, CIC
  b = await p.evaluate(() => { const G = UroCrawl.state, P = UroCrawl.player(); __clear(); P.x = 160; P.y = 270; const sp = UroCrawl.spawn('spasm', 600, 270, { instant: true }); sp.spT = 99; sp.pr = 0.2; UroCrawl.step(60); const r0 = sp.pr - 0.2;
    UroCrawl.giveBoon('oxybutynin', true); sp.pr = 0.2; UroCrawl.step(60); const r1 = sp.pr - 0.2; UroCrawl.dropBoon('oxybutynin');
    sp.spT = 0.01; let tele = 0, burst = 0; for (let i = 0; i < 60; i++) { UroCrawl.step(1); G.teles.forEach(t => { if (t.e === sp) tele = Math.max(tele, t.dur); }); burst = Math.max(burst, G.bullets.filter(x => x.hostile).length); } G.bullets.length = 0;
    sp.pr = 0.999; sp.spT = 99; let waveTele = 0; UroCrawl.step(1); waveTele = sp.waveT; UroCrawl.step(70); const tides = UroCrawl.peds.tides().filter(t => t.src === 'reflux').length;
    const sp2 = UroCrawl.spawn('spasm', 700, 400, { instant: true }); UroCrawl.giveBoon('cic', true); sp2.pr = 0.8; sp2.spT = 99; UroCrawl.step(2); const drained = sp2.pr; sp2.pr = 0.8; UroCrawl.step(2); const again = sp2.pr; UroCrawl.dropBoon('cic');
    return { r0, r1, tele, burst, waveTele, tides, drained, again, mini: sp.def.miniBoss }; });
  check('the spasm bladder elite: its pressure climbs (Oxybutynin: 40% slower), spasms burst droplets after a ≥ 0.6 s flash, and at full pressure (0.9 s warning) it refluxes a wave into the room', b.mini && Math.abs(b.r1 / b.r0 - 0.6) < 0.02 && b.tele >= 0.6 - 1e-9 && b.burst === 10 && b.waveTele >= 0.9 - 1e-9 && b.tides === 1, JSON.stringify(b));
  check('Clean Intermittent Catheterization drains the first pressure meter past 75% at once, once a room', b.drained < 0.01 && b.again > 0.75, 'drained ' + b.drained + ' · second ' + b.again);
  // PUV gates
  b = await p.evaluate(() => { const G = UroCrawl.state, P = UroCrawl.player(); __clear(); G.obstacles = G.obstacles.filter(o => o.frame); const g = UroCrawl.peds.addGate({ x: 480, y: 270, half: 60, phase: 0 });
    const st = []; for (let i = 0; i < 240; i++) { UroCrawl.step(1); if (st[st.length - 1] !== g.state) st.push(g.state); }
    // wait until the gate is shut, then try to walk through it
    let k = 0; while (g.state !== 'shut' && k++ < 300) UroCrawl.step(1); P.x = 440; P.y = 270; UroCrawl.input.keys.KeyD = true; UroCrawl.step(20); UroCrawl.input.keys.KeyD = false; const blocked = P.x;
    // pinched: stand in the gap as it shuts
    k = 0; while (g.state !== 'warn' && k++ < 300) UroCrawl.step(1); P.x = 476; P.y = 270; P.inv = 0; const hp0 = P.hp, pin0 = G.stats.pinches || 0; k = 0; while (g.state === 'warn' && k++ < 100) { P.x = 476; P.y = 270; P.inv = 0; UroCrawl.step(1); } const pinched = { x: P.x, n: (G.stats.pinches || 0) - pin0 };
    // rolled through: be rolling in the gap as it shuts
    k = 0; while (g.state !== 'warn' && k++ < 400) UroCrawl.step(1); while (g.state === 'warn' && k++ < 500) { P.x = 470; P.y = 270; P.roll = 0.2; P.rollDx = 520; P.rollDy = 0; P.inv = 0.25; UroCrawl.step(1); } const through = { x: P.x, n: G.stats.rolledThrough || 0 };
    // an enemy in the gap is trapped (pushed out, stunned)
    k = 0; while (g.state !== 'warn' && k++ < 400) UroCrawl.step(1); const en = UroCrawl.spawn('nephroblast', 480, 300, { instant: true }); en.def = Object.assign({}, en.def, { update: function (x) { x.vx = x.vy = 0; x.x = x.st.stun ? x.x : 480; } }); while (g.state === 'warn' && k++ < 500) UroCrawl.step(1); const trapped = { stun: !!en.st.stun, out: Math.abs(en.x - 480) > 8 };
    return { st: st.join('>'), blocked, pinched, through, trapped, obs: !!g.obs }; });
  check('PUV gates swing open → warn (red flash, 0.5 s) → shut on a rhythm; shut, they are a wall you cannot walk through', /open>warn>shut>open/.test(b.st) && b.blocked < 480 - 8 - 13 + 1, b.st + ' · stopped at x ' + b.blocked.toFixed(1));
  check('a gate that shuts on you pinches you back out (in a fight: damage and a stagger); one that shuts while you roll lets you through on the roll\'s i-frames; an enemy caught in it is trapped (stunned)', b.pinched.n === 1 && b.pinched.x < 480 - 8 && b.through.n === 1 && b.through.x > 480 + 8 && b.trapped.stun && b.trapped.out, JSON.stringify(b));
  b = await p.evaluate(() => { const G = UroCrawl.state; __clear(); const mk = () => UroCrawl.peds.addGate({ x: 480, y: 270, half: 50, phase: 0 }); const g1 = mk();
    UroCrawl.dealDamage(g1.e, 14, 'LITHO', {}); const litho = g1.cut; UroCrawl.dealDamage(g1.e, 14, 'CUT', { wid: 'scalpel' }); const cut = g1.cut; g1.cut = 0; UroCrawl.dealDamage(g1.e, 14, 'CUT', { wid: 'urethrotome' }); const ure = g1.cut; g1.cut = 0;
    UroCrawl.giveBoon('valvehook', true); UroCrawl.dealDamage(g1.e, 14, 'ENERGY', { wid: 'bovie' }); const hook = g1.cut; UroCrawl.dropBoon('valvehook'); g1.cut = 0;
    for (let i = 0; i < 20; i++) UroCrawl.dealDamage(g1.e, 14, 'CUT', {}); let stays = true; for (let i = 0; i < 400; i++) { UroCrawl.step(1); if (g1.state !== 'open' || !g1.obs.dead) stays = false; }
    return { litho, cut, ure, hook, ablated: g1.ablated, stays, charted: !!(UroCrawl.meta.bestiary.puvgate && UroCrawl.meta.bestiary.puvgate.kills) }; });
  check('gates are cut with CUT or ENERGY (LITHO does nothing); the Urethrotome cuts ×1.5 and the Valve Hook doubles it; a fully cut gate is ablated and stays open', b.litho === 0 && Math.abs(b.cut - 0.1) < 1e-9 && Math.abs(b.ure - 0.15) < 1e-9 && Math.abs(b.hook - 0.2) < 1e-9 && b.ablated && b.stays && b.charted, JSON.stringify(b));
  await shot(p, 's-enemies');
  errCheck('S enemies', errs);
});

await block('S. boons', async () => {
  const { p, errs } = await openS('?seed=7&god=1&room=3');
  let b = await p.evaluate(() => { UroCrawl.startRun(); UroCrawl.step(2); const G = UroCrawl.state, PT = UroCrawl.tables.PATRONS, B = UroCrawl.tables.BOONS; let wil = 0; for (let i = 0; i < 200; i++) if (UroCrawl.pickPatron() === 'wilms') wil++;
    const sample = new Set(); for (let i = 0; i < 300; i++) UroCrawl.rollBoons(3).forEach(id => sample.add(id)); const leaked = [...sample].filter(id => B[id].peds);
    return { peds: G.peds, wil, pool: UroCrawl.patronPool('wilms').length, young: UroCrawl.patronPool('young').filter(id => B[id].peds).length, leaked, wilms: PT.wilms, list: PT.wilms.pool.slice() }; });
  check('Wilms (Max Wilms, 1867–1918, a historical caricature) is a patron with a kidney glyph and 12 boons; outside the Peds Wing he never shows, and no Peds boon leaks into other dungeons (altars, shops, Young\'s valve boons)', b.wilms && /Max Wilms/.test(b.wilms.full) && b.wilms.glyph === 'kidney' && b.list.length === 12 && !b.peds && b.wil === 0 && b.pool === 0 && b.young === 0 && b.leaked.length === 0 && ['va', 'vac', 'peg', 'timedvoid', 'biofeedback', 'ddavp', 'oxybutynin', 'cic', 'cap', 'teddy', 'lollipop', 'stickerchart'].every(id => b.list.includes(id)), 'wilms picked ' + b.wil + ' · leaked ' + b.leaked.join());
  await p.context().close();
  const { p: q, errs: errs2 } = await openS('?dungeon=peds&seed=7&god=1&room=3');
  b = await q.evaluate(() => { UroCrawl.startRun(); UroCrawl.step(2); const G = UroCrawl.state, B = UroCrawl.tables.BOONS; let wil = 0; for (let i = 0; i < 200; i++) if (UroCrawl.pickPatron() === 'wilms') wil++;
    return { wil, pool: UroCrawl.patronPool('wilms'), young: UroCrawl.patronPool('young').filter(id => B[id].peds) }; });
  check('in the Peds Wing Wilms is a likely altar (weighted ×2) with his pool (VAC waits for VA), and Young also offers the valve boons (Valve Hook, Young\'s Classification)', b.wil > 30 && b.pool.length === 11 && !b.pool.includes('vac') && b.young.join() === 'valvehook,youngclass', 'wilms ' + b.wil + '/200 · ' + b.pool.join());
  // the comfort boons
  b = await q.evaluate(() => { const G = UroCrawl.state, P = UroCrawl.player(); if (G.trial) UroCrawl.skipRoom(); __clear(); UroCrawl.giveBoon('teddy', true); P.inv = 0; const hp0 = P.hp; G.over = false;
    UroCrawl.hurtPlayer(10, 'test', 0); const first = { absorbed: P.hp === hp0, txt: G.texts.some(t => /TEDDY/.test(t.text)) }; P.inv = 0; UroCrawl.hurtPlayer(10, 'test', 0); const second = G.texts.filter(t => /TEDDY/.test(t.text)).length;
    UroCrawl.giveBoon('lollipop', true); UroCrawl.giveBoon('stickerchart', true); G.cleared = false; G.waves = { list: [], next: 0, timer: 99 }; G.par = { kind: 'fight', key: 'fight', par: [10, 20, 30], t: 15, done: false }; const rvu0 = G.rvu; UroCrawl.skipRoom(); UroCrawl.step(1); const paid = G.rvu - rvu0, lolly = G.pickups.filter(x => x.kind === 'lolly').length;
    P.hp = 50; const lp = G.pickups.find(x => x.kind === 'lolly'); if (lp) { P.x = lp.x; P.y = lp.y; } UroCrawl.step(30);
    return { first, second, paid, lolly, healed: P.hp }; });
  check('Teddy Bear absorbs the first hit in a room (and only the first); Lollipop drops a lollipop at every clear that heals 10; Sticker Chart pays +4 RVU a room and +2 a medal', b.first.absorbed && b.first.txt && b.second === 1 && b.lolly === 1 && b.healed === 60 && b.paid === 4 + 6 + 2, JSON.stringify(b));
  b = await q.evaluate(() => { const G = UroCrawl.state, B = UroCrawl.tables.BOONS; const ids = ['va', 'vac', 'peg', 'timedvoid', 'biofeedback', 'ddavp', 'oxybutynin', 'cic', 'cap', 'teddy', 'lollipop', 'stickerchart', 'valvehook', 'youngclass']; return { ok: ids.every(id => B[id] && B[id].peds && B[id].desc.length > 30), vacReq: (B.vac.requires || []).join() }; });
  check('all fourteen Peds boons exist with a card description (VAC is a duo on VA)', b.ok && b.vacReq === 'va');
  errCheck('S boons', errs.concat(errs2));
});

// the drills, played to the end by small bots (keyboard + mouse), the Sim Lab way (?trial=)
const DRILLBOT = `
window.__keys = function (dx, dy, dz) { const K = UroCrawl.input.keys; dz = dz || 3; K.KeyD = dx > dz; K.KeyA = dx < -dz; K.KeyS = dy > dz; K.KeyW = dy < -dz; };
window.__stop = function () { const K = UroCrawl.input.keys; K.KeyD = K.KeyA = K.KeyS = K.KeyW = false; UroCrawl.input.mouseFire = false; };
window.__T = function () { return UroCrawl.peds.state.trial; };
window.__bots = {
  valve: function () { const P = UroCrawl.player(); const gs = UroCrawl.peds.gates().filter(g => g.x > P.x - 6).sort((a, b) => a.x - b.x), g = gs[0]; let go = true; if (g && !g.ablated) { const dx = g.x - P.x; if ((g.state === 'shut' && dx < 42) || (g.state === 'warn' && dx < 70 && dx > 0)) go = false; } __keys(go ? 50 : 0, 270 - P.y); },
  tide: function () { const P = UroCrawl.player(), W = [[150, 440], [250, 447], [356, 300], [480, 96], [560, 108], [600, 300], [710, 447], [800, 440], [890, 300]]; window.__wi = window.__wi || 0; const w = W[window.__wi]; if (Math.hypot(w[0] - P.x, w[1] - P.y) < 20 && window.__wi < W.length - 1) window.__wi++; __keys(w[0] - P.x, w[1] - P.y, 6); if (P.rollCd <= 0 && P.roll <= 0) UroCrawl.input.edges.roll = true; },
  aim: function () { const G = UroCrawl.state, P = UroCrawl.player(); const ts = G.enemies.filter(e => !e.dead && e.id === 'target' && !e.noHit).sort((a, b) => Math.hypot(a.x - P.x, a.y - P.y) - Math.hypot(b.x - P.x, b.y - P.y)); if (!ts.length) { __keys(480 - P.x, 270 - P.y, 20); UroCrawl.input.mouseFire = false; return; } const t = ts[0], d = Math.hypot(t.x - P.x, t.y - P.y); UroCrawl.input.mx = t.x; UroCrawl.input.my = t.y; UroCrawl.input.mouseFire = true; if (d > 200) __keys(t.x - P.x, t.y - P.y); else __keys(0, 0); },
  catheter: function () { const P = UroCrawl.player(), L = [[190, 270], [190, 118], [380, 118], [380, 420], [580, 420], [580, 170], [760, 170], [760, 320], [900, 320]]; window.__wi = window.__wi || 0; const w = L[window.__wi]; if (Math.abs(w[0] - P.x) <= 4 && Math.abs(w[1] - P.y) <= 4 && window.__wi < L.length - 1) window.__wi++; const w2 = L[window.__wi], dx = w2[0] - P.x, dy = w2[1] - P.y; if (Math.abs(dx) > 3) __keys(dx, 0, 3); else __keys(0, dy, 3); },
  popoff: function () { const G = UroCrawl.state, P = UroCrawl.player(); const bs = G.enemies.filter(e => !e.dead && e.id === 'popballoon' && !e.done).sort((a, b) => b.pr / Math.max(0.02, b.rate) * 0 + (b.pr - a.pr)); if (!bs.length) { UroCrawl.input.mouseFire = false; __keys(0, 0); return; } const t = bs[0], d = Math.hypot(t.x - P.x, t.y - P.y); UroCrawl.input.mx = t.x; UroCrawl.input.my = t.y; UroCrawl.input.mouseFire = true; if (d > 180) __keys(t.x - P.x, t.y - P.y); else __keys(0, 0); },
  torsion: function () { const P = UroCrawl.player(); window.__th = (window.__th === undefined ? -Math.PI / 2 : window.__th) - 0.12; UroCrawl.input.mx = P.x + Math.cos(window.__th) * 120; UroCrawl.input.my = P.y + Math.sin(window.__th) * 120; }
};
window.__drill = function (id, maxS) { const G = UroCrawl.state; UroCrawl.input.mode = 'kb'; window.__wi = 0; window.__th = undefined; if (id === 'aim' || id === 'popoff') { G.weapons.length = 0; G.wIndex = 0; UroCrawl.giveWeapon('thulium'); G.swapT = 0; }
  let f = 0; while (__T() && __T().state !== 'done' && f++ < 60 * (maxS || 40)) { if (__T().state === 'run') window.__bots[id](); UroCrawl.step(1); } __stop(); return __T(); };
`;
async function openD(q, w, h, touch) { const o = await openS(q, w, h, touch); await o.p.evaluate(DRILLBOT); return o; }

await block('S. drills', async () => {
  const allErrs = [];
  const results = {};
  for (const id of ['valve', 'tide', 'aim', 'catheter', 'popoff', 'torsion']) {
    const { p, errs } = await openD('?trial=' + id + '&seed=3'); allErrs.push(errs);
    const r = await p.evaluate((id) => { const G = UroCrawl.state, m = UroCrawl.meta; const s0 = { sim: G.sim && G.sim.id, running: G.running, peds: G.peds, waves: !!(G.waves && G.waves.trial), doors: G.doors.length, hp: UroCrawl.player().hp };
      const T = __drill(id, 45); UroCrawl.step(70); const rec = m.peds.trials[id], D = UroCrawl.peds.tables.TRIALS[id];
      return { s0, state: T.state, final: T.final, medal: T.medal, pen: T.pen, bonus: T.bonus, bonks: T.bonks, got: T.got, learned: T.learned, rec: rec && { best: rec.best, medal: rec.medal, wins: rec.wins, tries: rec.tries }, sticker: T.medal ? m.peds.stickers[id + ':' + T.medal] : null, tech: D.tech ? !!(m.tech[D.tech] && m.tech[D.tech].on) : null, gold: D.tech ? !!(m.tech[D.tech] && m.tech[D.tech].gold) : null, par: D.par,
        overlay: G.overlay, panel: UroCrawl.hub.state.panel, btns: [...document.querySelectorAll('#hubExtra .btn, #btnHubBack')].map(b => b.textContent).join('|'), hp: UroCrawl.player().hp, saved: m.peds.saved, charted: !!(m.bestiary.torsion && m.bestiary.torsion.kills) }; }, id);
    results[id] = r;
    if (id === 'catheter' || id === 'torsion') await shot(p, 's-drill-' + id);
    // the same drill again: a personal best only moves when it is beaten
    if (id === 'torsion') {
      const again = await p.evaluate(() => { document.getElementById('btnSimAgain').click(); const t0 = UroCrawl.meta.peds.trials.torsion.best; const T = UroCrawl.peds.trial(); T.state = 'run'; T.t = 30; T.untwist = 4 * Math.PI; UroCrawl.step(1); UroCrawl.step(70); return { best: UroCrawl.meta.peds.trials.torsion.best, t0, final: __T().final, pb: __T().pb, wins: UroCrawl.meta.peds.trials.torsion.wins }; });
      check('a slower finish keeps the personal best; the record counts both wins', again.best === again.t0 && again.final > again.t0 && !again.pb && again.wins === 2, JSON.stringify(again));
    }
    await p.context().close();
  }
  for (const id in results) { const r = results[id];
    check('drill · ' + id + ': ?trial=' + id + ' opens it in the Sim Lab (no doors, no damage); a bot finishes it; time, medal and personal best are recorded and the medal is a sticker; the result card offers TRY AGAIN / OTHER DRILLS / CALL ROOM', r.s0.sim === id && r.s0.running && r.s0.peds && r.s0.waves && r.s0.doors === 0 && r.state === 'done' && r.final > 0 && r.rec.best === r.final && r.rec.wins === 1 && r.rec.medal === r.medal && (r.medal === 0 || r.sticker === 1) && r.overlay === 'hub' && r.panel === 'simresult' && /TRY AGAIN/.test(r.btns) && /OTHER DRILLS/.test(r.btns) && /CALL ROOM/.test(r.btns), id + ' ' + r.final + ' s · ' + ['no medal', 'bronze', 'silver', 'gold'][r.medal] + ' (par ' + r.par.join('/') + ')' + (r.pen ? ' · +' + r.pen + ' s' : '') + (r.bonus ? ' · −' + r.bonus + ' s' : ''));
  }
  check('drills teach their technique on the first finish: Valve Run → Perfect Roll, Tide Dash → Slide, Aim Gallery → Flick Shot, Catheter Course → Roll Cancel (Pop-Off and Torsion teach none)', results.valve.tech && results.valve.learned && results.tide.tech && results.aim.tech && results.catheter.tech && results.popoff.tech === null && results.torsion.tech === null, Object.keys(results).map(k => k + ':' + results[k].tech).join(' '));
  check('a gold medal adds the technique\'s mastery badge', Object.keys(results).filter(k => results[k].tech !== null).every(k => results[k].gold === (results[k].medal === 3)), Object.keys(results).map(k => k + ' ' + results[k].medal + '/' + results[k].gold).join(' · '));
  check('Tide Dash: the bot outran the tide and its tokens took time off; Catheter Course: steering down the middle bumps nothing; Torsion: two turns against the twist save it (SAVED!, coins, its bestiary chart)', results.tide.got >= 3 && results.tide.bonus > 0 && results.catheter.bonks === 0 && results.catheter.pen === 0 && results.torsion.saved === 1 && results.torsion.charted, 'tokens ' + results.tide.got + ' · bumps ' + results.catheter.bonks);
  // fail and restart: the tide catches you, a balloon pops, the torsion clock runs out, a drill's time cap
  const { p, errs } = await openD('?trial=tide&seed=3'); allErrs.push(errs);
  let b = await p.evaluate(() => { const G = UroCrawl.state; let f = 0; while (__T().state !== 'fail' && f++ < 60 * 20) UroCrawl.step(1); const fail = { state: __T().state, banner: G.banner && G.banner.text, sub: G.banner && G.banner.sub, hp: UroCrawl.player().hp };
    UroCrawl.step(110); return { fail, att: __T().att, state: __T().state, tide: __T().tide }; });
  check('fail and restart: in Tide Dash the tide catches a surgeon who stands still → TRY AGAIN → after a short pause the room resets (attempt 2, the tide back at the start); nobody is hurt', b.fail.state === 'fail' && b.fail.banner === 'TRY AGAIN' && /TIDE/.test(b.fail.sub) && b.fail.hp === 100 && b.att === 2 && b.state === 'ready' && b.tide < 0, JSON.stringify(b));
  await p.context().close();
  const { p: q, errs: errs2 } = await openD('?trial=popoff&seed=3'); allErrs.push(errs2);
  b = await q.evaluate(() => { let f = 0; while (__T().state !== 'fail' && f++ < 60 * 20) UroCrawl.step(1); const why = UroCrawl.state.banner && UroCrawl.state.banner.sub; UroCrawl.step(110); return { why, att: __T().att, floods: UroCrawl.state.hazards.filter(h => h.kind === 'flood').length }; });
  check('Pop-Off: leave the balloons alone and one pops → the attempt fails and restarts', /POPPED/.test(b.why) && b.att === 2, JSON.stringify(b));
  await q.context().close();
  const { p: q2, errs: errs3 } = await openD('?trial=torsion&seed=3'); allErrs.push(errs3);
  b = await q2.evaluate(() => { UroCrawl.step(70); const T = UroCrawl.peds.trial(); T.via = 0.05; UroCrawl.step(4); const fail = { state: T.state, banner: UroCrawl.state.banner.text, sub: UroCrawl.state.banner.sub }; UroCrawl.step(200); return { fail, att: __T().att, via: __T().via, coins: UroCrawl.state.pickups.length }; });
  check('Torsion: when the viability ring runs out there is no reward, only a plain fact line (no joke), and the drill restarts', b.fail.state === 'fail' && b.fail.banner === 'TIME' && /six hours/.test(b.fail.sub) && !/!/.test(b.fail.sub) && b.att === 2 && b.via > 59 && b.coins === 0, JSON.stringify(b.fail));
  await q2.context().close();
  // in a run: a drill room, its reward, and the attending's mercy after three failures
  const { p: r, errs: errs4 } = await openD('?dungeon=peds&seed=3&god=1&room=2'); allErrs.push(errs4);
  b = await r.evaluate(() => { UroCrawl.startRun(); const G = UroCrawl.state; UroCrawl.step(2); const T0 = __T(); const s = { trial: T0 && T0.id, sim: T0 && T0.sim, doorsOpen: G.doors.some(d => d.open), banner: G.banner && G.banner.text, reward: G.room.reward, waves: G.waves.trial };
    for (let k = 0; k < 3; k++) { UroCrawl.step(70); if (__T().state === 'run') UroCrawl.peds.fail('test failure'); else { UroCrawl.step(30); UroCrawl.peds.fail('test failure'); } UroCrawl.step(110); }
    return { s, state: __T().state, medal: __T().medal, cleared: G.cleared, doorsOpen: G.doors.some(d => d.open), banner: G.banner && G.banner.text, rewards: G.rewards.length + G.pickups.filter(x => x.kind === 'iv').length, medals: G.medals.slice() }; });
  check('in a run, room 2 is a drill: its doors stay shut until it is done and the room\'s reward waits; three failed attempts and the attending waves you through (no medal), the doors open and the reward appears', b.s.trial && !b.s.sim && !b.s.doorsOpen && /TRIAL/.test(b.s.banner) && b.s.waves && b.state === 'done' && b.medal === 0 && b.cleared && b.doorsOpen && b.banner === 'WAVED THROUGH' && b.rewards >= 1 && b.medals.length === 1 && b.medals[0].medal === 0, JSON.stringify(b).slice(0, 300));
  await shot(r, 's-drill-waved');
  errCheck('S drills', [].concat(...allErrs));
});

await block('S. tech', async () => {
  const { p, errs } = await openS('?seed=4&god=1&room=3');
  let b = await p.evaluate(() => { const m = UroCrawl.meta; UroCrawl.startRun(); UroCrawl.step(2); __clear(); const G = UroCrawl.state, P = UroCrawl.player(); P.x = 400; P.y = 270; UroCrawl.step(60);
    const roll = (tele) => { P.rollCd = 0; P.roll = 0; P.perfT = 0; if (tele !== null) G.teles.push({ kind: 'circle', t: tele, dur: 0.7, x: P.x, y: P.y, r: 60 }); UroCrawl.input.edges.roll = true; UroCrawl.step(1); const r = { cd: P.rollCd, perf: P.perfT > 0, mul: UroCrawl.peds.speedMul() }; G.teles.length = 0; UroCrawl.step(40); return r; };
    const off = roll(0.1); m.tech.perfect = { on: 1, gold: 0 }; const on = roll(0.1), early = roll(0.5); return { off, on, early, n: G.stats.perfects, peds: G.peds }; });
  check('Perfect Roll (kept for every dungeon: this is a Stones run): roll in the last 0.15 s before a telegraphed hit lands and the roll cooldown comes straight back, +25% speed for 1 s; too early, or without the technique, nothing', !b.peds && b.off.cd > 0.5 && !b.off.perf && b.on.cd <= 0 && b.on.perf && Math.abs(b.on.mul - 1.25) < 1e-9 && b.early.cd > 0.5 && !b.early.perf && b.n === 1, JSON.stringify(b));
  b = await p.evaluate(() => { const m = UroCrawl.meta, G = UroCrawl.state, P = UroCrawl.player(); G.weapons.length = 0; G.wIndex = 0; UroCrawl.giveWeapon('loop'); G.swapT = 0; const w = G.weapons[0]; P.rollCd = 0;
    const swing = () => { w.swing = null; UroCrawl.input.mode = 'kb'; UroCrawl.input.mx = P.x + 100; UroCrawl.input.my = P.y; UroCrawl.input.mouseFire = true; UroCrawl.step(2); UroCrawl.input.mouseFire = false; let k = 0; while (w.swing && w.swing.phase !== 2 && k++ < 60) UroCrawl.step(1); const ph = w.swing ? w.swing.phase : -1; P.rollCd = 0; UroCrawl.input.edges.roll = true; UroCrawl.step(1); return { ph, after: w.swing ? w.swing.phase : null }; };
    const off = swing(); UroCrawl.step(60); m.tech.cancel = { on: 1, gold: 0 }; const on = swing(); UroCrawl.step(60);
    G.weapons.length = 0; UroCrawl.giveWeapon('eswl'); G.wIndex = 0; G.swapT = 0; const e = G.weapons[0]; e.cd = 1.0; P.rollCd = 0; UroCrawl.input.edges.roll = true; UroCrawl.step(1); return { off, on, eswl: e.cd }; });
  check('Roll Cancel: a roll ends a Resectoscope Loop\'s recovery at once (without the technique the recovery plays out) and skips 0.4 s of an ESWL recharge', b.off.ph === 2 && b.off.after === 2 && b.on.ph === 2 && b.on.after === null && Math.abs(b.eswl - (1.0 - 0.4 - 1 / 60)) < 0.02, JSON.stringify(b));
  b = await p.evaluate(() => { const m = UroCrawl.meta, G = UroCrawl.state, P = UroCrawl.player(); __clear(); G.obstacles.length = 0; const go = () => { P.x = 200; P.y = 270; P.rollCd = 0; P.roll = 0; P.slide = 0; UroCrawl.input.keys.KeyD = true; UroCrawl.input.edges.roll = true; UroCrawl.step(1); const x0 = 200; let slid = false; for (let i = 0; i < 40; i++) { UroCrawl.step(1); if (P.slide > 0) slid = true; } UroCrawl.input.keys.KeyD = false; return { dx: P.x - x0, slid }; };
    const off = go(); m.tech.slide = { on: 1, gold: 0 }; const on = go(); return { off, on }; });
  check('Slide: hold a direction through the roll and you slide on, fast (it covers more ground than the same roll without it)', !b.off.slid && b.on.slid && b.on.dx > b.off.dx + 40, JSON.stringify(b));
  b = await p.evaluate(() => { const m = UroCrawl.meta, G = UroCrawl.state, P = UroCrawl.player(); __clear(); G.weapons.length = 0; UroCrawl.giveWeapon('holmium'); G.wIndex = 0; G.swapT = 0; G.obstacles.length = 0; const e = __pin(UroCrawl.spawn('com', 520, 420, { instant: true }));
    const go = () => { P.x = 200; P.y = 270; P.rollCd = 0; P.roll = 0; P.flick = null; UroCrawl.input.mode = 'kb'; UroCrawl.input.mx = 100; UroCrawl.input.my = 100; UroCrawl.input.keys.KeyD = true; UroCrawl.input.edges.roll = true; UroCrawl.step(1); UroCrawl.input.keys.KeyD = false; let k = 0; while (P.roll > 0 && k++ < 40) UroCrawl.step(1); UroCrawl.input.mx = 100; UroCrawl.input.my = 100; UroCrawl.input.edges.fire = true; UroCrawl.step(1); const a = P.aim, want = Math.atan2(e.y - P.y, e.x - P.x); return { snapped: !!P.flick, off: Math.abs(Math.atan2(Math.sin(a - want), Math.cos(a - want))) }; };
    const off = go(); m.tech.flick = { on: 1, gold: 0 }; const on = go(); return { off, on }; });
  check('Flick Shot: fire within 0.45 s after a roll and the aim snaps to the nearest target (the cursor was pointing the other way)', !b.off.snapped && b.off.off > 1 && b.on.snapped && b.on.off < 0.05, JSON.stringify(b));
  await p.evaluate(() => { UroCrawl.meta.tech.perfect.gold = 1; UroCrawl.state.rewards.length = 0; UroCrawl.hideScreens(); const P = UroCrawl.player(); P.x = 300; P.y = 270; });
  await p.keyboard.press('Escape'); await p.waitForTimeout(250);
  b = await p.evaluate(() => ({ overlay: UroCrawl.state.overlay, running: UroCrawl.state.running, over: UroCrawl.state.over, list: document.getElementById('pauseTech').textContent }));
  check('the pause screen lists the techniques you know, with a ★ for a mastered one', b.overlay === 'pause' && /Perfect Roll ★/.test(b.list) && /Roll Cancel/.test(b.list) && /Slide/.test(b.list) && /Flick Shot/.test(b.list), JSON.stringify(b).slice(0, 220));
  errCheck('S tech', errs);
});

await block('S. reflux', async () => {
  const { p, errs } = await openS('?boss=reflux&seed=3&god=1');
  let b = await p.evaluate(() => { UroCrawl.startRun(); const G = UroCrawl.state; UroCrawl.step(2); const s = UroCrawl.reflux.state;
    return { intro: G.introT, arena: !!G.arena, ports: s.ports.length, tray: s.tray.n, segs: s.segs.length, hp: s.hp, phase: s.phase, name: G.boss.name, sub: G.boss.sub, music: UroCrawl.snd.music.mode, room: G.roomIndex, peds: G.peds, par: G.par && G.par.kind, blocks: G.obstacles.filter(o => o.breakwater).length, wall: !!G.wall }; });
  check('?boss=reflux: a round playpen with three ports on its wall, a needle tray holding two, four toy-block breakwaters; Reflux (3400 HP: a kidney head, a 7-segment ureter tail) after a title card; the boss par runs', b.arena && !b.wall && b.ports === 3 && b.tray === 2 && b.blocks === 4 && b.segs === 7 && b.hp === 3400 && b.phase === 1 && b.name === 'REFLUX' && /kidney serpent/.test(b.sub) && b.intro > 2 && b.room === 9 && b.peds && b.par === 'boss', JSON.stringify(b));
  // the loops: ripples first, then the pass; the lump travels down the tail and only the lump hurts
  b = await p.evaluate(() => { const G = UroCrawl.state, R = UroCrawl.reflux; let f = 0; while (G.introT > 0 && f++ < 300) UroCrawl.step(1);
    let prev = 0; f = 0; while (R.state.state === 'preview' && f++ < 120) { prev++; UroCrawl.step(1); } const st = R.state.state, h0 = R.state.head; let travel = 0, last = h0, lumpOnly = true, lumpIdx = [], frames = 0;
    for (let i = 0; i < 90; i++) { UroCrawl.step(1); const s = R.state; travel += Math.hypot(s.head.x - last.x, s.head.y - last.y); last = s.head; s.segs.forEach((g, k) => { if (g.contact > 0 && !g.lump) lumpOnly = false; if (g.lump && !g.hidden && lumpIdx[lumpIdx.length - 1] !== k) lumpIdx.push(k); }); }
    return { prev, st, travel, lumpOnly, lumpIdx, kind: R.state.pathKind, speed: R.state.speed }; });
  check('it swims passes: 0.7 s of ripples along the coming path (a telegraph), then it follows the path at speed', b.prev >= 40 && b.prev <= 44 && b.st === 'swim' && b.travel > 200 && b.speed === 205 && b.kind === 'pass', JSON.stringify(b));
  check('a peristaltic wave runs down the tail: the lump moves from segment to segment toward the tail, and only the lump is a contact hazard', b.lumpOnly && b.lumpIdx.length >= 4 && b.lumpIdx.slice(1).some((k, i) => k === b.lumpIdx[i] + 1), b.lumpIdx.join(','));
  b = await p.evaluate(() => { const G = UroCrawl.state, R = UroCrawl.reflux, B = R.boss(); B.stunT = 0.3; UroCrawl.step(1); const h = B.head, hp0 = h.hp, dh = UroCrawl.dealDamage(h, 10, 'NEUTRAL', {}); const hp1 = h.hp; const seg = B.segs.find(s => !s.hideNow); UroCrawl.dealDamage(seg, 10, 'NEUTRAL', {}); const tail = hp1 - h.hp; return { dh, tail, headHp: h.hp }; });
  check('the head is the weak point: ×2, and the pediatric scope adds +20% (10 → 24); a hit on the tail lands at ×0.4 (10 → 4)', Math.abs(b.dh - 24) < 1e-6 && Math.abs(b.tail - 4) < 1e-6, JSON.stringify(b));
  b = await p.evaluate(() => { const G = UroCrawl.state, R = UroCrawl.reflux, B = R.boss(), P = UroCrawl.player(); B.stunT = 0; B.roarT = 0; B.state = 'swim'; UroCrawl.step(1); const h = B.head, fa = h.face, px = P.x, py = P.y;
    P.x = h.x + Math.cos(fa) * 110; P.y = h.y + Math.sin(fa) * 110; const front = UroCrawl.dealDamage(h, 10, 'NEUTRAL', {});
    P.x = h.x - Math.cos(fa) * 110; P.y = h.y - Math.sin(fa) * 110; G.texts.length = 0; const back = UroCrawl.dealDamage(h, 10, 'NEUTRAL', {}); const hint = G.texts.some(t => /MAW/.test(t.text));
    P.x = px; P.y = py; const maw = R.state.maw, md = maw ? Math.hypot(maw.x - h.x, maw.y - h.y) : 0;
    const due = []; [0, 1, 2].forEach(i => R.unplug(i)); due.push(R.state.passesDue); R.plug(0); due.push(R.state.passesDue); R.plug(1); due.push(R.state.passesDue); R.unplug(0); R.unplug(1); B.state = 'preview'; B.stT = 0.7;
    return { front, back, hint, md, due }; });
  check('swimming free, only its maw (the front) is the weak point: head-on 10 → 24, from behind ×1 (10 → 10) with a hint; stranded or stunned the whole head is exposed', Math.abs(b.front - 24) < 1e-6 && Math.abs(b.back - 10) < 1e-6 && b.hint && b.md > 10, JSON.stringify(b));
  check('plugging takes its hiding places: it swims one pass before a dive, plus one per plugged port (1, 2, 3), so the backwash comes less often', b.due.join() === '1,2,3', b.due.join());
  // a dive and a pop: backwash both times, a 0.7 s gurgle, the 3-fan
  b = await p.evaluate(() => { const G = UroCrawl.state, R = UroCrawl.reflux, B = R.boss(), P = UroCrawl.player(); P.x = 480; P.y = 282; R.dive(); const use = R.state.usePort; let f = 0, washAt = null; const t0 = G.tides.length;
    while (R.state.state !== 'under' && f++ < 400) { UroCrawl.step(1); if (!washAt && G.tides.length > t0) washAt = { x: G.tides[G.tides.length - 1].x, y: G.tides[G.tides.length - 1].y }; }
    const under = R.state.state, port = B.ports[use], dives = R.state.dives; f = 0; let gur = null; while (R.state.state !== 'emerge' && f++ < 400) { UroCrawl.step(1); G.teles.forEach(t => { if (t.kind === 'circle' && !gur && R.state.exitPort !== null) gur = { dur: t.dur, at: R.state.exitPort }; }); }
    const exit = R.state.exitPort, b0 = G.bullets.filter(x => x.hostile).length, tides0 = G.tides.length; f = 0; let spit = 0; while (R.state.state === 'emerge' && f++ < 200) { UroCrawl.step(1); spit = Math.max(spit, G.bullets.filter(x => x.hostile).length); }
    return { use, washAt, portAt: { x: port.x, y: port.y }, under, dives, gur, exit, pops: R.state.pops, spit, washes: R.state.washes }; });
  check('between passes it dives into an open port (a backwash ring rolls out of that port), goes under, then a 0.7 s gurgle at another port, and it pops out spitting a 3-fan with another backwash', b.under === 'under' && b.dives === 1 && b.washAt && Math.hypot(b.washAt.x - b.portAt.x, b.washAt.y - b.portAt.y) < 1 && b.gur && b.gur.dur >= 0.7 - 1e-9 && b.exit !== b.use && b.pops === 1 && b.spit >= 3 && b.washes === 2, JSON.stringify(b));
  // backwash on the surgeon: shoved and chipped; a roll goes through; a toy block is a breakwater; a FLUID tool pushes it back
  b = await p.evaluate(() => { const G = UroCrawl.state, R = UroCrawl.reflux, B = R.boss(), P = UroCrawl.player(); B.stunT = 999; G.bullets.length = 0; const s0 = Object.assign({}, G.stats);
    const wash = (px, py, cx, cy, prep) => { P.x = px; P.y = py; P.roll = 0; P.inv = 0; P.pushX = P.pushY = 0; if (prep) prep(); UroCrawl.peds.addTide({ x: cx, y: cy, r0: 10, r1: 260, speed: 260, dmg: 4, push: 300, src: 'backwash' }); let f = 0, pushed = 0; while (f++ < 45) { if (prep) prep(); UroCrawl.step(1); pushed = Math.max(pushed, Math.abs(P.pushX || 0)); } return pushed; };
    const h0 = G.stats.tideHits || 0, d0 = G.stats.tideDodges || 0, k0 = G.stats.breakwaters || 0, q0 = G.stats.tidePushed || 0; const hit = wash(300, 280, 180, 280), hits = (G.stats.tideHits || 0) - h0;
    const roll = wash(300, 280, 180, 280, () => { P.roll = 0.3; P.rollDx = 0; P.rollDy = 0; P.inv = 0.25; }), dodges = (G.stats.tideDodges || 0) - d0;
    const bk = G.obstacles.find(o => o.breakwater); const brk = wash(bk.x + bk.r + 18, bk.y, bk.x - 90, bk.y), blocked = (G.stats.breakwaters || 0) - k0;
    G.weapons.length = 0; UroCrawl.giveWeapon('irrigation'); G.wIndex = 0; G.swapT = 0; UroCrawl.input.mode = 'kb'; UroCrawl.input.mx = 100; UroCrawl.input.my = 280; UroCrawl.input.mouseFire = true; const fl = wash(300, 280, 180, 280); UroCrawl.input.mouseFire = false;
    return { hit, hits, roll, dodges, brk, blocked, fl, pushedBack: (G.stats.tidePushed || 0) - q0 }; });
  check('a backwash ring shoves you along the floor and chips you; a roll goes through it; behind a toy block you are safe (a breakwater); holding a FLUID tool on pushes it back', b.hit > 100 && b.hits === 1 && b.roll === 0 && b.dodges === 1 && b.brk === 0 && b.blocked === 1 && b.fl === 0 && b.pushedBack === 1, JSON.stringify(b));
  // the bulking needle: tray, carrying, the limits, dropping it, losing it
  b = await p.evaluate(() => { const G = UroCrawl.state, R = UroCrawl.reflux, B = R.boss(), P = UroCrawl.player(); B.stunT = 999; const far = { x: 820, y: 330 }; B.head.x = far.x; B.head.y = far.y; UroCrawl.step(2);
    G.weapons.length = 0; UroCrawl.giveWeapon('thulium'); G.wIndex = 0; G.swapT = 0; const tray = R.state.tray; P.x = tray.x; P.y = tray.y; UroCrawl.step(2); const took = { carrying: R.state.carrying, n: R.state.tray.n, mul: UroCrawl.peds.speedMul() };
    const dmg0 = Object.values(G.stats.dmg).reduce((a, c) => a + c, 0); UroCrawl.input.mode = 'kb'; UroCrawl.input.mx = B.head.x; UroCrawl.input.my = B.head.y; UroCrawl.input.mouseFire = true; UroCrawl.step(30); UroCrawl.input.mouseFire = false; const fired = Object.values(G.stats.dmg).reduce((a, c) => a + c, 0) - dmg0;
    P.x = 300; P.y = 300; UroCrawl.step(1); B.needles.push({ x: P.x, y: P.y, vx: 0, vy: 0, away: true, t: 0 }); UroCrawl.step(4); const limit = { floor: R.state.needles.length, carrying: R.state.carrying };
    B.needles.length = 0; UroCrawl.input.edges.alt = true; UroCrawl.step(1); const dropped = { carrying: R.state.carrying, floor: R.state.needles.length }; UroCrawl.step(10); const stay = R.state.needles.length;
    P.x = 380; UroCrawl.step(3); P.x = 300; UroCrawl.step(3); const back = { carrying: R.state.carrying, floor: R.state.needles.length };
    P.inv = 0; UroCrawl.hurtPlayer(5, 'test', 0); const nd = B.needles[0]; const lost = { carrying: R.state.carrying, floor: R.state.needles.length, v: nd ? Math.hypot(nd.vx, nd.vy) : 0 };
    B.needles.length = 0; R.give(); P.x = 300; P.y = 300; P.roll = 0; P.inv = 0; UroCrawl.peds.addTide({ x: 200, y: 300, r0: 10, r1: 200, speed: 300, dmg: 2, push: 200, src: 'backwash' }); UroCrawl.step(25); const washed = { carrying: R.state.carrying, floor: R.state.needles.length };
    const n2 = B.needles[0]; const v0 = n2 ? Math.hypot(n2.vx, n2.vy) : 0; if (n2) { n2.vx = n2.vy = 0; } UroCrawl.peds.addTide({ x: n2.x - 60, y: n2.y, r0: 10, r1: 200, speed: 300, dmg: 0, push: 0, src: 'backwash' }); P.x = 120; P.y = 282; UroCrawl.step(12); const shoved = n2 ? Math.hypot(n2.vx, n2.vy) : 0;
    B.tray.n = 0; B.tray.t = 0; UroCrawl.step(60 * 10 + 5); const refill = R.state.tray.n;
    return { took, fired, limit, dropped, stay, back, lost, washed, shoved, refill }; });
  check('walk onto the tray to carry a bulking needle (the tray keeps the rest); carrying: no weapon fires, 85% speed; you cannot pick up a second one', b.took.carrying && b.took.n === 1 && Math.abs(b.took.mul - 0.85) < 1e-9 && b.fired === 0 && b.limit.carrying && b.limit.floor === 1, JSON.stringify({ took: b.took, fired: b.fired, limit: b.limit }));
  check('ALT drops it at your feet (your weapons come back) and it stays put until you step away and come back for it', !b.dropped.carrying && b.dropped.floor === 1 && b.stay === 1 && b.back.carrying && b.back.floor === 0, JSON.stringify({ dropped: b.dropped, back: b.back }));
  check('getting hit knocks it out of your hand and it skids away; a backwash washing over you does the same, and a backwash shoves needles on the floor', !b.lost.carrying && b.lost.floor === 1 && b.lost.v > 150 && !b.washed.carrying && b.washed.floor === 1 && b.shoved > 100, JSON.stringify({ lost: b.lost, washed: b.washed, shoved: b.shoved }));
  check('the tray refills one needle every 10 s', b.refill === 1, 'tray ' + b.refill);
  // injecting: the ring of four points
  b = await p.evaluate(() => { const G = UroCrawl.state, R = UroCrawl.reflux, B = R.boss(), P = UroCrawl.player(); B.needles.length = 0; [0, 1, 2].forEach(i => R.unplug(i));
    const stand = (i) => { const port = B.ports[i], a = Math.atan2(282 - port.y, 480 - port.x); P.x = port.x + Math.cos(a) * 46; P.y = port.y + Math.sin(a) * 46; P.roll = 0; P.inv = 99; };   // P.inv: the parked serpent's tail cannot touch you here
    // keyboard + mouse: aim at each point in turn
    R.give(); stand(0); UroCrawl.input.mode = 'kb'; UroCrawl.input.mouseFire = true; let f = 0, ks = []; while (R.state.carrying && f++ < 300) { const pts = R.points(); if (pts) { const k = R.state.inj ? R.state.inj.k : 0; UroCrawl.input.mx = pts[Math.min(3, k)].x; UroCrawl.input.my = pts[Math.min(3, k)].y; if (ks[ks.length - 1] !== k) ks.push(k); } UroCrawl.step(1); } UroCrawl.input.mouseFire = false;
    const kb = { frames: f, ks: ks.join(''), plug: R.state.ports[0].plug };
    // touch: hold FIRE, the aim snaps to the points
    R.give(); stand(1); UroCrawl.input.mode = 'touch'; UroCrawl.input.buttons.fire = 7; f = 0; while (R.state.carrying && f++ < 300) UroCrawl.step(1); delete UroCrawl.input.buttons.fire; const touch = { frames: f, plug: R.state.ports[1].plug };
    // stopping early: a weak, short plug, and the needle is spent
    R.give(); stand(2); UroCrawl.input.mode = 'kb'; UroCrawl.input.mouseFire = true; f = 0; while (f++ < 300) { const pts = R.points(); const k = R.state.inj ? R.state.inj.k : 0; if (k >= 2) break; if (pts) { UroCrawl.input.mx = pts[k].x; UroCrawl.input.my = pts[k].y; } UroCrawl.step(1); } UroCrawl.input.mouseFire = false; UroCrawl.step(1);
    const weak = { carrying: R.state.carrying, plug: R.state.ports[2].plug };
    return { kb, touch, weak, plugs: R.state.plugs, weakPlugs: R.state.weakPlugs }; });
  check('injecting: stand by a port and hold FIRE; four injection points ring the orifice and each takes 0.4 s of aim (≈1.6 s); the full ring raises a gel mound that plugs the port for 60 s and uses the needle up', b.kb.ks === '0123' && b.kb.frames >= 96 && b.kb.frames < 140 && b.kb.plug && b.kb.plug.full && Math.abs(b.kb.plug.t - 60) < 0.05, JSON.stringify(b.kb));
  check('on touch the aim snaps to the next point by itself (just hold FIRE)', b.touch.frames < 140 && b.touch.plug && b.touch.plug.full, JSON.stringify(b.touch));
  check('stopping early leaves a weaker, shorter plug (2 of 4 points: 4 s) and the needle is spent', !b.weak.carrying && b.weak.plug && !b.weak.plug.full && Math.abs(b.weak.plug.t - 4) < 0.1 && b.weakPlugs === 1, JSON.stringify(b.weak));
  // it only dives into open ports; all three plugged and it is stranded: head exposed, plug clocks held
  b = await p.evaluate(() => { const G = UroCrawl.state, R = UroCrawl.reflux, B = R.boss(); B.stunT = 0; [0, 1, 2].forEach(i => R.unplug(i)); R.plug(0); R.plug(1); B.state = 'swim'; R.dive(); const use = R.state.usePort;
    R.plug(2); B.ports[1].plug.t = 14; UroCrawl.step(2); const s = R.state, t0 = s.ports.map(p => p.plug.t); UroCrawl.step(120); const t1 = R.state.ports.map(p => p.plug ? p.plug.t : 0), strandMul = R.state.head.dmgMul;
    const h = B.head; const d = UroCrawl.dealDamage(h, 10, 'NEUTRAL', {}); const washes0 = B.washes; let f = 0, tell = null;
    while (R.state.state === 'stranded' && f++ < 700) { UroCrawl.step(1); if (!tell) { const tl = G.teles.find(t => t.kind === 'circle' && t.r === 46 && Math.hypot(t.x - B.ports[1].x, t.y - B.ports[1].y) < 1); if (tl) tell = { dur: tl.dur, left: R.state.ports[1].plug ? 1 : 0 }; } }
    const after = { state: R.state.state, mul: R.state.head.dmgMul, frames: f + 122, plugs: R.state.ports.map(p => !!p.plug), blowouts: B.blowouts || 0, washed: B.washes === washes0 + 1 };
    let again = 0; for (let k = 0; k < 90; k++) { UroCrawl.step(1); if (R.state.state === 'stranded') again++; }
    // a plug that wears off mid-strand: no blowout, it just swims out
    [0, 1, 2].forEach(i => R.plug(i)); B.ports[0].plug.t = 3; B.state = 'swim'; UroCrawl.step(1); const s2 = R.state.state; f = 0; while (R.state.state === 'stranded' && f++ < 700) UroCrawl.step(1);
    const quiet = { s2, state: R.state.state, blowouts: B.blowouts || 0, plugs: R.state.ports.map(p => !!p.plug) };
    return { use, state: s.state, t0, t1, strandMul, d, tell, after, again, quiet }; });
  check('it only dives into open ports (ports 1 and 2 plugged: it heads for port 3)', b.use === 2, 'went for port ' + (b.use + 1));
  check('with all three ports plugged it is STRANDED for 8 s: it swims slowly in the open, its head exposed from every side (×2.5 more: 10 → 60), the plugs still ticking', b.state === 'stranded' && b.t1.every((t, i) => Math.abs(b.t0[i] - t - 2) < 0.02) && b.strandMul === 2.5 && Math.abs(b.d - 60) < 1e-6 && b.after.state === 'preview' && b.after.mul === 1 && b.after.frames >= 470 && b.after.frames <= 490, JSON.stringify(b));
  check('if all three held it wriggles free by blowing out the weakest plug (a 0.7 s gurgle first, then a backwash), so it is not stranded again until that port is re-plugged; if one already wore off it just swims out', b.tell && b.tell.dur >= 0.7 - 1e-9 && b.tell.left === 1 && b.after.blowouts === 1 && b.after.plugs.join() === 'true,false,true' && b.after.washed && b.again === 0 && b.quiet.s2 === 'stranded' && b.quiet.state === 'preview' && b.quiet.blowouts === 1 && b.quiet.plugs.join() === 'false,true,true', JSON.stringify({ tell: b.tell, after: b.after, again: b.again, quiet: b.quiet }));
  // the grades
  b = await p.evaluate(() => { const G = UroCrawl.state, R = UroCrawl.reflux, B = R.boss(); [0, 1, 2].forEach(i => R.unplug(i)); B.state = 'preview'; B.stT = 0.7; R.phase(2); const ph2 = { phase: R.state.phase, segs: R.state.segs.length, roar: R.state.roarT, banner: G.banner && G.banner.text };
    let spawnIn = 9; const swarm = () => { G.enemies.filter(e => e.id === 'uti').forEach(e => { e.silent = true; e.hp = 0; }); UroCrawl.step(1); R.wash(0); const us = G.enemies.filter(e => !e.dead && e.id === 'uti'); us.forEach(e => { spawnIn = Math.min(spawnIn, e.spawnT); }); return us.length; };
    const s1 = swarm(); UroCrawl.giveBoon('cap', true); const s2 = swarm(); UroCrawl.dropBoon('cap');
    R.plug(0, 0.5); R.plug(1); UroCrawl.step(1); const w0 = R.state.ports[0].plug; R.slam(0); const tele = G.teles.find(t => t.kind === 'circle' && t.r === UroCrawl.tuning.REFLUX.SLAM.r); UroCrawl.step(46); const knocked = R.state.ports[0].plug; const f0 = R.state.ports[1].plug.t; R.slam(1); UroCrawl.step(46); const f1 = R.state.ports[1].plug.t + 46 / 60;
    return { ph2, s1, s2, spawnIn, weak: !!w0, tele: tele ? tele.dur : 0, knocked, cracked: f0 - f1 }; });
  check('GRADE III at two thirds: it coils (10 segments) after a roar; an E. coli pyelonephritis swarm rides every backwash (2, spawning in over 0.7 s; prophylaxis: 1)', b.ph2.phase === 2 && b.ph2.segs === 10 && b.ph2.roar > 1 && /GRADE III/.test(b.ph2.banner) && b.s1 === 2 && b.s2 === 1 && b.spawnIn >= 0.5, JSON.stringify(b));
  check('its tail slams (a 0.7 s ring): a weak plug in the slam is knocked out, a full one cracked (−12 s)', b.weak && b.tele >= 0.7 - 1e-9 && b.knocked === null && b.cracked > 11.9 && b.cracked < 12.9, JSON.stringify({ tele: b.tele, knocked: b.knocked, cracked: b.cracked }));
  b = await p.evaluate(() => { const G = UroCrawl.state, R = UroCrawl.reflux, B = R.boss(); B.stunT = 0; B.roarT = 0; [0, 1, 2].forEach(i => R.plug(i)); B.state = 'swim'; UroCrawl.step(1); const was = R.state.state; B.tray.n = 0; B.needles.length = 0;
    R.phase(3); const pop = { was, state: R.state.state, plugs: R.state.ports.filter(q => q.plug).length, tray: R.state.tray.n, said: G.texts.some(t => t.text === 'THE PLUGS BLOW OUT') };
    UroCrawl.step(80); const ph3 = { phase: R.state.phase, segs: R.state.segs.length, tunnel: R.state.tunnel, pop };
    G.tides.length = 0; R.wash(0); const dbl = G.tides.length; G.tides.length = 0;
    const h = B.head; B.stunT = 0; const hp0 = h.hp; UroCrawl.dealDamage(h, 10, 'LITHO', {}); const noCut = R.state.tunnel; const hp1 = h.hp; UroCrawl.dealDamage(h, 10, 'CUT', {}); const tun = { tunnel: R.state.tunnel, drop: hp1 - h.hp, stun: R.state.stunT };
    R.wash(0); const after = G.tides.map(t => t.dmg); UroCrawl.dealDamage(h, 10, 'CUT', {}); return { ph3, dbl, noCut, tun, after, hp: h.hp }; });
  check('GRADE IV–V at one third: tortuous (12 segments), a double backwash; the real fix shows on its head: the first CUT hit is the one-time ANTIREFLUX TUNNEL (12% of its health, a 2 s stun) and from then on its backwash is single and weak', b.ph3.phase === 3 && b.ph3.segs === 12 && b.dbl === 2 && !b.noCut && b.tun.tunnel && b.tun.drop >= 408 && b.tun.stun > 1.9 && b.after.length === 1 && b.after[0] === 2, JSON.stringify(b));
  check('a higher grade blows every gel mound out ("THE PLUGS BLOW OUT"), breaks a strand, and refills the tray: each grade is its own plug-up', b.ph3.pop.was === 'stranded' && b.ph3.pop.state === 'preview' && b.ph3.pop.plugs === 0 && b.ph3.pop.tray === 2 && b.ph3.pop.said, JSON.stringify(b.ph3.pop));
  // the Foley balloon plugs one port for free, once
  b = await p.evaluate(() => { const G = UroCrawl.state, R = UroCrawl.reflux, B = R.boss(), P = UroCrawl.player(); B.stunT = 999; [0, 1, 2].forEach(i => R.unplug(i)); G.weapons.length = 0; UroCrawl.giveWeapon('foley'); G.wIndex = 0; G.swapT = 0;
    const port = B.ports[1], a = Math.atan2(282 - port.y, 480 - port.x); P.x = port.x + Math.cos(a) * 40; P.y = port.y + Math.sin(a) * 40; UroCrawl.input.mode = 'kb'; UroCrawl.input.mouseFire = true; UroCrawl.step(70); UroCrawl.input.mouseFire = false; const first = !!R.state.ports[1].plug, used = R.state.foleyUsed;
    R.unplug(1); UroCrawl.step(200); UroCrawl.input.mouseFire = true; UroCrawl.step(90); UroCrawl.input.mouseFire = false; return { first, used, second: !!R.state.ports[1].plug }; });
  check('the Foley balloon held over a port plugs it once for free', b.first && b.used && !b.second, JSON.stringify(b));
  b = await p.evaluate(() => { const G = UroCrawl.state, R = UroCrawl.reflux, B = R.boss(); B.stunT = 0; const m = UroCrawl.meta; UroCrawl.dealDamage(B.head, 99999, 'NEUTRAL', {}); UroCrawl.step(260);
    return { won: G.won, overlay: G.overlay, title: document.getElementById('sumTitle').textContent, sub: document.getElementById('sumSub').textContent, boss: m.peds.boss, medal: G.medals.filter(x => x.kind === 'boss').length, sticker: m.peds.stickers['boss:resolved'], tiles: document.getElementById('sumStats').textContent }; });
  check('killing it wins the run: "Reflux resolved. Follow-up cystogram scheduled."; the boss par gives its medal; the sticker book counts a resolved reflux', b.won && b.overlay === 'summary' && b.title === 'DISCHARGED!' && b.sub === 'Reflux resolved. Follow-up cystogram scheduled.' && b.boss === 1 && b.medal === 1 && b.sticker === 1 && /Medals/.test(b.tiles), b.sub + ' · ' + b.tiles.slice(0, 120));
  await shot(p, 's-reflux-won');
  errCheck('S reflux', errs);
});

// a player for whole Reflux fights: clears the E. coli swarm first, carries needles to the nearest open port and injects the
// ring, rolls away from the head and the lumps (and through a backwash with Perfect Roll timing), and otherwise fights the
// head at Bovie range (the pediatric scope makes that 144 px). Returns the result and every telegraph it saw.
const REFLUXBOT = `window.__refluxBot = function (maxF) {
  const G = UroCrawl.state, P = UroCrawl.player(), R = UroCrawl.reflux, I = UroCrawl.input; I.mode = 'kb';
  const keys = (dx, dy, dz) => { dz = dz || 4; I.keys.KeyD = dx > dz; I.keys.KeyA = dx < -dz; I.keys.KeyS = dy > dz; I.keys.KeyW = dy < -dz; };
  const bi = G.weapons.findIndex(w => w.id === 'bovie'); if (bi >= 0) UroCrawl.selectWeapon(bi);
  const seen = new WeakSet(), kinds = {}; let minTele = 9, f = 0, ph = 1; const phaseAt = [], d = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  while (!G.over && f++ < maxF) {
    const B = R.boss(); if (!B || B.kind !== 'reflux') break; const s = R.state, h = B.head;
    if (s.phase !== ph) { phaseAt.push(Math.round(f / 6) / 10); ph = s.phase; }
    const open = B.ports.filter(q => !q.plug), busy = q => (q === B.usePort && (B.state === 'dive' && B.inPort || B.state === 'under')) || (q === B.exitPort && (B.state === 'gurgle' || B.state === 'emerge'));
    const headD = h.hideNow ? 999 : d(h, P); let danger = headD < 60 && h.contactNow > 0;
    for (const g of B.segs) if (!g.hideNow && g.lump && d(g, P) < g.r + 30) danger = true;
    const bugs = G.enemies.filter(e => e.id === 'uti' && !e.dead && e.spawnT <= 0.3 && d(e, P) < 260).sort((a, b) => d(a, P) - d(b, P));
    if (P.rollCd <= 0 && P.roll <= 0 && (danger || UroCrawl.peds.perfect() || (P.needle && bugs.length && d(bugs[0], P) < 60))) I.edges.roll = true;
    if (P.needle) {
      const port = open.filter(q => !busy(q)).sort((a, b) => d(a, P) - d(b, P))[0];
      if (!port) { I.mouseFire = false; if (!open.length) I.edges.alt = true; else keys(480 - P.x, 282 - P.y, 30); }
      else { const a = Math.atan2(282 - port.y, 480 - port.x), t = { x: port.x + Math.cos(a) * 45, y: port.y + Math.sin(a) * 45 };
        if (d(t, P) > 12) { keys(t.x - P.x, t.y - P.y); I.mouseFire = false; } else { keys(0, 0); I.mouseFire = true; const pts = R.points(); if (pts) { const k = Math.min(3, s.inj ? s.inj.k : 0); I.mx = pts[k].x; I.my = pts[k].y; } } }
    } else if (open.length && B.state !== 'stranded' && (s.tray.n > 0 || B.needles.length) && !bugs.length) {
      const t = B.needles.length ? B.needles[0] : s.tray; keys(t.x - P.x, t.y - P.y); I.mouseFire = !h.hideNow && headD < 140; I.mx = h.x; I.my = h.y;
    } else if (bugs.length) { const u = bugs[0], ud = d(u, P), w = ud < 90 ? -1 : ud > 130 ? 1 : 0; I.mx = u.x; I.my = u.y; I.mouseFire = ud < 145; keys((u.x - P.x) / ud * w * 10, (u.y - P.y) / ud * w * 10, 2); }
    else if (!h.hideNow) { const w = headD < 80 ? -1 : headD > 125 ? 1 : 0, ax = (h.x - P.x) / (headD || 1), ay = (h.y - P.y) / (headD || 1); I.mx = h.x; I.my = h.y; I.mouseFire = headD < 140; keys(ax * w * 10 - (w ? 0 : ay * 6), ay * w * 10 + (w ? 0 : ax * 6), 2); }
    else { I.mouseFire = false; keys(480 - P.x, 282 - P.y, 30); }
    UroCrawl.step(1);
    for (const t of G.teles) if (!seen.has(t)) { seen.add(t); minTele = Math.min(minTele, t.dur !== undefined ? t.dur : t.t); kinds[t.kind] = 1; }
  }
  I.mouseFire = false; keys(0, 0); const B = G.boss || {};
  return { won: G.won, over: G.over, secs: Math.round(f / 6) / 10, hp: Math.round(P.hp), taken: Math.round(G.stats.dmgTaken), phaseAt, strands: B.stranded || 0, plugs: G.stats.plugs || 0, needles: G.stats.needles || 0, minTele, kinds };
};`;
await block('S. reflux fights', async () => {
  // two whole fights, played: no god mode, the boss-run loadout, a bot that reads the tells (see REFLUXBOT)
  let minTele = 9; const kinds = {};
  for (const seed of [8, 55]) {
    const { p, errs } = await openS('?boss=reflux&seed=' + seed); await p.evaluate(REFLUXBOT);
    const r = await p.evaluate(() => { UroCrawl.startRun(); return __refluxBot(60 * 240); });
    minTele = Math.min(minTele, r.minTele); Object.assign(kinds, r.kinds);
    check('autoplay seed ' + seed + ': the surgeon plugs, strands and fights it through all three grades and resolves it (no god mode)', r.won && r.hp > 0 && r.phaseAt.length === 2 && r.phaseAt[1] > r.phaseAt[0] + 5 && r.secs > r.phaseAt[1] + 3 && r.secs >= 40 && r.secs <= 200 && r.strands >= 1 && r.plugs >= 3, JSON.stringify(r));
    errCheck('S reflux fight ' + seed, errs); await p.close();
  }
  check('every Reflux attack seen in those fights was telegraphed for at least 0.5 s (the gurgles, the tail slams, the blowout)', minTele >= 0.5 && kinds.circle, 'shortest ' + minTele + ' s · ' + Object.keys(kinds).join(','));
});

await block('S. call room', async () => {
  const { p, errs } = await openS('?hub=1&seed=3&cme=300');
  let b = await p.evaluate(() => { const H = UroCrawl.hub, h = UroCrawl.meta.hub; const un = []; un.push(H.caseUnlocked(4)); h.bosses.staghorn = 1; h.bosses.fournier = 1; h.bosses.bph = 1; un.push(H.caseUnlocked(4)); h.bosses.mibc = 1; un.push(H.caseUnlocked(4));
    H.use('board'); const btn = document.querySelector('#hubBody [data-case="peds"]'); const txt = btn.textContent, off = btn.disabled; btn.click(); return { un, txt, off, dungeon: H.state.dungeon, line: [...document.querySelectorAll('#hubBody .shopline')].map(x => x.textContent).find(x => /PEDS WING/.test(x)) }; });
  check('the case board\'s Peds Wing opens only once all four bosses are beaten (Staghorn, Fournier, the Giant TURP, the Invader); taking it puts Reflux on the board', b.un.join() === 'false,false,true' && /TAKE THIS CASE/.test(b.txt) && !b.off && b.dungeon === 'reflux' && /Reflux, the kidney serpent/.test(b.line), JSON.stringify(b).slice(0, 220));
  b = await p.evaluate(() => { const H = UroCrawl.hub, L = H.tables.LINES.childlife, said = []; H.close(); const first = H.talk('childlife'), pin = !!UroCrawl.meta.hub.owned.pin_stickers; for (let i = 0; i < L.length * 2 + 1; i++) said.push(H.talk('childlife')); let rep = false; for (let i = 1; i < said.length; i++) if (said[i] === said[i - 1]) rep = true;
    const st = H.state.stations.map(s => s.id), npcs = H.state.npcs.map(n => n.id); H.goto('childlife'); H.step(2); return { first, pin, n: L.length, uniq: new Set(said).size, rep, st, npcs, near: H.state.near }; });
  check('the kids\' corner: a sticker book and a Sim Lab station, and a child-life specialist (10 lines that rotate, never back to back) whose first hello gives you the Sticker Chart pin', b.st.includes('stickers') && b.st.includes('simlab') && b.npcs.includes('childlife') && /Sticker Chart pin/.test(b.first) && b.pin && b.n >= 8 && b.uniq === b.n && !b.rep && b.near === 'childlife', JSON.stringify({ first: b.first.slice(0, 60), n: b.n, uniq: b.uniq, near: b.near, rep: b.rep, st: b.st.join(), npcs: b.npcs.join() }));
  await p.waitForTimeout(250); await shot(p, 's-kids-corner');
  b = await p.evaluate(() => { const H = UroCrawl.hub; H.use('pins'); const pins = [...document.querySelectorAll('#hubBody [data-pin]')].map(e => ({ id: e.getAttribute('data-pin'), locked: e.classList.contains('locked'), txt: e.textContent })); document.querySelector('#hubBody [data-pin="stickers"]').click(); const worn = UroCrawl.meta.hub.pin;
    H.meet('wilms'); H.use('trophy'); const faces = [...document.querySelectorAll('#hubBody .bentry')].map(e => ({ t: e.textContent, locked: e.classList.contains('locked') })); return { pins, worn, wilms: faces.find(f => /Wilms/.test(f.t)), met: /Patrons met · 1 \/ 9/.test(document.getElementById('hubBody').textContent) }; });
  check('the lanyard board has ten pins (nine patrons and the child-life specialist\'s Sticker Chart pin: +1 RVU a room cleared); meeting Wilms puts his portrait on the trophy wall', b.pins.length === 10 && !b.pins.find(x => x.id === 'stickers').locked && /\+1 RVU per room cleared/.test(b.pins.find(x => x.id === 'stickers').txt) && b.worn === 'stickers' && b.wilms && !b.wilms.locked && b.met, JSON.stringify({ worn: b.worn, wilms: b.wilms }));
  b = await p.evaluate(() => { const H = UroCrawl.hub, h = UroCrawl.meta.hub; h.rx = null; h.dungeon = 'staghorn'; H.use('cart'); const off = [...document.querySelectorAll('#hubBody [data-boon]')].map(e => e.getAttribute('data-boon')); h.rx = null; h.dungeon = 'reflux'; H.use('cart'); const on = [...document.querySelectorAll('#hubBody [data-boon]')].map(e => e.getAttribute('data-boon')); return { off, on, B: on.map(id => UroCrawl.tables.BOONS[id].peds) }; });
  check('the pharmacy cart only stocks Wilms\'s Peds boons when today\'s case is the Peds Wing', b.off.length === 0 && b.on.length === 3 && b.B.every(Boolean), JSON.stringify(b));
  b = await p.evaluate(() => { const H = UroCrawl.hub, m = UroCrawl.meta.hub, props0 = H.state.props; const r = [H.buy('mural'), H.buy('toybox'), H.buy('decals')]; return { r, wall: m.decor.wall, kids: m.decor.kids, locker: m.decor.locker, props: H.state.props - props0, slots: H.tables.SLOTS.join() }; });
  check('Peds decor in the catalog: a crayon mural (wall), a toy box (the kids\' corner), sticker sheets (on the locker)', b.r.every(Boolean) && b.wall === 'mural' && b.kids === 'toybox' && b.locker === 'decals' && b.props === 1 && /kids/.test(b.slots) && /locker/.test(b.slots), JSON.stringify(b));
  await p.waitForTimeout(250); await shot(p, 's-hub-decor');
  b = await p.evaluate(() => { const H = UroCrawl.hub; H.use('stickers'); const st = document.querySelectorAll('#hubBody [data-sticker]').length; H.use('simlab'); const cards = [...document.querySelectorAll('#hubBody [data-sim]')].map(e => e.getAttribute('data-sim')); document.querySelector('#hubBody [data-sim="popoff"]').click(); const G = UroCrawl.state;
    return { st, cards, sim: G.sim && G.sim.id, running: G.running, screen: G.screen, peds: G.peds, trial: G.trial && G.trial.id }; });
  check('the sticker book lists the six drills; the Sim Lab lists them with the medal ladder, and PLAY starts that drill on its own', b.st === 6 && b.cards.join() === 'valve,tide,aim,catheter,popoff,torsion' && b.sim === 'popoff' && b.running && b.screen === 'run' && b.peds && b.trial === 'popoff', JSON.stringify(b));
  b = await p.evaluate(() => { const G = UroCrawl.state; UroCrawl.step(70); UroCrawl.skipRoom(); UroCrawl.step(70); const panel = UroCrawl.hub.state.panel; document.getElementById('btnHubBack').click(); return { panel, screen: G.screen, running: G.running, peds: G.peds, on: UroCrawl.hub.state.on, rec: UroCrawl.meta.peds.trials.popoff }; });
  check('…and its result card\'s CALL ROOM goes back to the room (no run was counted)', b.panel === 'simresult' && b.screen === 'hub' && !b.running && !b.peds && b.on && b.rec.wins === 1, JSON.stringify(b));
  b = await p.evaluate(() => { const H = UroCrawl.hub, G = UroCrawl.state, P = UroCrawl.player(); const runs0 = UroCrawl.meta.runs || 0; H.scrubIn(); UroCrawl.step(3); const s = { boss: G.bossId, peds: G.peds, pin: G.pin && G.pin.id, runs: (UroCrawl.meta.runs || 0) - runs0 }; const rvu0 = G.rvu; UroCrawl.skipRoom(); UroCrawl.step(1); s.paid = G.rvu - rvu0; s.medal = G.medals.length; return s; });
  check('SCRUB IN on the Peds case starts a Peds Wing run with the Sticker Chart pin paying +1 RVU on the first clear (on top of its medal)', b.boss === 'reflux' && b.peds && b.pin === 'stickers' && b.runs === 1 && b.medal === 1 && b.paid >= 1, JSON.stringify(b));
  errCheck('S call room', errs);
});

await block('S. end to end', async () => {
  const { p, errs } = await openS('?dungeon=peds&seed=11&god=1');
  const b = await p.evaluate(() => { UroCrawl.startRun(); const G = UroCrawl.state, P = UroCrawl.player(), log = []; let crate = null;
    for (let guard = 0; guard < 12 && G.roomIndex < 9; guard++) {
      UroCrawl.step(80); if (G.overlay) UroCrawl.hideScreens();
      log.push(G.roomIndex + ':' + (G.room.trial ? 'drill-' + G.room.trial : G.room.kind));
      if (G.room.kind === 'rest') { const c = G.rewards.find(r => r.kind === 'crate'); crate = c && c.item.id; }
      if (!G.cleared) UroCrawl.skipRoom(); UroCrawl.step(5); if (G.overlay) UroCrawl.hideScreens(); G.rewards.forEach(r => r.used = true);
      const d = G.doors[0]; if (!d) break; const r0 = G.roomIndex; P.x = d.x + d.w / 2 + (d.side === 'E' ? -16 : 0); P.y = d.y + d.h / 2 + (d.side === 'N' ? 16 : d.side === 'S' ? -16 : 0); let k = 0; while (G.roomIndex === r0 && k++ < 120) UroCrawl.step(1);
    }
    const atBoss = { room: G.roomIndex, boss: G.boss && G.boss.kind };
    let f = 0; while (!G.over && f++ < 60 * 200) { UroCrawl.step(1); if (f % 15 === 0 && G.boss && G.boss.head && !G.boss.head.hideNow) UroCrawl.dealDamage(G.boss.head, 60, 'CUT', {}); }
    UroCrawl.step(260); const lr = UroCrawl.hub.state.lastRun;
    return { log, crate, atBoss, won: G.won, overlay: G.overlay, sub: document.getElementById('sumSub').textContent, tiles: document.getElementById('sumStats').textContent, cme: lr && lr.parts.join('|'), medals: G.medals.map(m => m.kind[0] + m.medal), visited: G.visited.length }; });
  check('end to end: ?dungeon=peds runs the Peds Wing through all nine rooms (drills on 2, 4 and 6 unless an elite or a shop door was taken), the rest room\'s crate is a Foley balloon, and room 9 is Reflux', b.atBoss.room === 9 && b.atBoss.boss === 'reflux' && b.log.filter(x => /drill/.test(x)).length >= 2 && b.crate === 'foley' && b.visited === 9, b.log.join(' → ') + ' · crate ' + b.crate);
  check('…and beating it ends the run: the summary has the win line, the medals and the drills; the CME pays for the medals', b.won && b.overlay === 'summary' && /Reflux resolved/.test(b.sub) && /Medals/.test(b.tiles) && /Drills/.test(b.tiles) && /medals \d+/.test(b.cme), b.cme + ' · ' + b.medals.join(','));
  await shot(p, 's-e2e-summary');
  errCheck('S end to end', errs);
  for (const cx of browser.contexts()) await cx.close();   // the frame rate below should be this page's own
  const { p: q, errs: errs2 } = await openS('?boss=reflux&seed=3', 844, 390, true);
  await q.evaluate(() => UroCrawl.startRun()); await q.waitForTimeout(3600);
  let r = await q.evaluate(() => ({ fps: UroCrawl.state.fps, running: UroCrawl.state.running, mode: UroCrawl.input.mode }));
  check('phone (844×390, touch): the Reflux fight draws at a playable frame rate', r.running && r.fps >= 40, 'fps ' + r.fps);
  await shot(q, 's-phone-reflux');
  await q.context().close();
  const { p: q2, errs: errs3 } = await openS('?trial=catheter&seed=3', 844, 390, true);
  await q2.waitForTimeout(2600);
  r = await q2.evaluate(() => ({ fps: UroCrawl.state.fps, trial: UroCrawl.peds.state.trial.id }));
  check('phone (844×390, touch): a drill (the Catheter Course, the busiest to draw) runs at a playable frame rate', r.trial === 'catheter' && r.fps >= 40, 'fps ' + r.fps);
  errCheck('S phone', errs2.concat(errs3));
});

// ───────── T. character select and the wardrobe (roadmap Step 5): the mirror, the wardrobe, deeds, outfit lines, numbers unchanged ─────────
const TLIB = `
window.__hex = function (hex) { const n = parseInt(hex.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
window.__count = function (cv, hex, x0, y0, w, h, tol) { const d = cv.getContext('2d').getImageData(Math.max(0, Math.round(x0)), Math.max(0, Math.round(y0)), Math.round(w), Math.round(h)).data, c = __hex(hex); let k = 0; for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 200 && Math.abs(d[i] - c[0]) <= tol && Math.abs(d[i + 1] - c[1]) <= tol && Math.abs(d[i + 2] - c[2]) <= tol) k++; return k; };
window.__game = function (hex, gx, gy, gw, gh, tol) { const cv = document.getElementById('game'), s = cv.width / 960; return __count(cv, hex, gx * s, gy * s, gw * s, gh * s, tol === undefined ? 12 : tol); };
window.__ink = function (cv) { const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data; let k = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 0) k++; return k; };
`;
async function openT(q, w, h, touch) { const o = await open(q, w, h, touch); await o.p.evaluate(TLIB); return o; }

await block('T. hero', async () => {
  const allErrs = [];
  const { p, errs } = await openT('?seed=3&god=1'); allErrs.push(errs);
  let b = await p.evaluate(() => { const W = UroCrawl.wardrobe, T = W.tables, s = W.state; return { hero: JSON.parse(JSON.stringify(s.hero)), eq: JSON.parse(JSON.stringify(s.equipped)), def: T.DEFAULT, owned: Object.keys(s.owned).length, sepia: s.sepia,
    hooks: ['equip', 'unequip', 'own', 'buy', 'hero', 'openMirror'].every(k => typeof W[k] === 'function'), builds: Object.keys(T.BUILDS).join(), skins: T.SKINS.length, hairs: Object.keys(T.HAIRS), cols: T.HAIR_COLORS.length,
    items: Object.keys(T.WARDROBE).filter(id => !(T.WARDROBE[id].cost === 0 && !T.WARDROBE[id].set && !T.WARDROBE[id].deed)).length, sets: Object.keys(T.SETS).length, scrubs: T.SCRUBS.length, slots: T.SLOTS.join(), shoes: Object.keys(T.WARDROBE).filter(id => T.WARDROBE[id].slot === 'shoes').length, shoeCols: T.SHOE_COLORS.length }; });
  check('a fresh save: META.hero is the original look (neutral build, the original skin tone, hair under the cap, not yet chosen) and META.wardrobe wears the defaults, owns nothing, no sepia; the wardrobe hooks exist', b.hooks && b.hero.build === 'neutral' && b.hero.skin === 1 && b.hero.hairStyle === 'covered' && b.hero.set === false && JSON.stringify(b.eq) === JSON.stringify(b.def) && b.owned === 0 && !b.sepia, JSON.stringify(b.hero));
  check('the tables: Male / Female / Neutral builds, 8 skin tones, 6 hair styles (bald/covered, a crop, a ponytail, a bun, curls, long), 10 hair colours (two silly), seven slots (outfit, cap, coat, mask, headlamp, extras, shoes)', b.builds === 'male,female,neutral' && b.skins >= 6 && b.hairs.length >= 5 && ['covered', 'crop', 'ponytail', 'curls', 'long'].every(k => b.hairs.includes(k)) && b.cols >= 7 && b.slots === 'outfit,cap,coat,mask,lamp,neck,shoes', b.skins + ' skins · ' + b.hairs.length + ' hairs · ' + b.cols + ' colours');
  check('the catalogue has ≥ 14 things to earn: ' + b.items + ' items to buy or unlock (two of them sets of three), 12 scrub colours, 7 pairs of OR shoes in 9 colours', b.items >= 14 && b.sets === 2 && b.scrubs === 12 && b.shoes === 7 && b.shoeCols === 9, b.items + ' items · ' + b.sets + ' sets');
  // ── first launch: PLAY → How to play → "Who are you?" ──
  await p.click('#btnPlay'); await p.waitForTimeout(80); await p.click('#btnHelpOk'); await p.waitForTimeout(250);
  b = await p.evaluate(() => ({ ov: UroCrawl.state.overlay, panel: UroCrawl.hub.state.panel, title: document.getElementById('hubTitle').textContent, ok: document.getElementById('btnHubBack').textContent, ok2: !!document.getElementById('btnHeroOk'),
    builds: document.querySelectorAll('#hubBody [data-build]').length, skins: document.querySelectorAll('#hubBody [data-skin]').length, hairs: document.querySelectorAll('#hubBody [data-hair]').length, cols: document.querySelectorAll('#hubBody [data-haircol]').length, scrubs: [...document.querySelectorAll('#hubBody [data-scrubpick]')].map(e => e.getAttribute('aria-label')).join(),
    on: [...document.querySelectorAll('#hubBody .on')].map(e => e.getAttribute('data-build') || e.getAttribute('data-skin') || e.getAttribute('data-hair') || e.getAttribute('data-haircol') || e.getAttribute('data-scrubpick')).join(), ink: __ink(document.getElementById('lookPrev')) }));
  check('the first time in the Call Room, "Who are you?" opens over it: build, skin tone, hair and hair colour pickers, and the two starting scrub colours (OR green, ceil blue), with the current look marked, a live preview, and THAT\'S ME (also inside the preview, so a phone never scrolls to it)', b.ov === 'hub' && b.panel === 'mirror' && b.title === 'Who are you?' && b.ok === 'THAT’S ME' && b.ok2 && b.builds === 3 && b.skins === 8 && b.hairs === 6 && b.cols === 10 && b.scrubs === 'OR GREEN scrubs,CEIL BLUE scrubs' && b.on === 'neutral,1,covered,1,0' && b.ink > 500, JSON.stringify(b));
  const ink0 = await p.evaluate(() => document.getElementById('lookPrev').toDataURL());
  await p.waitForTimeout(400);
  const spun = await p.evaluate((a) => document.getElementById('lookPrev').toDataURL() !== a, ink0);
  check('the preview is live: it redraws (the sprite turns on the spot) while the screen is open', spun);
  await p.click('#hubBody [data-build="female"]'); await p.click('#hubBody [data-skin="6"]'); await p.click('#hubBody [data-hair="ponytail"]'); await p.click('#hubBody [data-haircol="8"]'); await p.click('#hubBody [data-scrubpick="1"]'); await p.waitForTimeout(120);
  b = await p.evaluate(() => { const L = UroCrawl.wardrobe.look(); return { hero: JSON.parse(JSON.stringify(UroCrawl.meta.hero)), build: L.build.name, skin: L.skin, hair: L.hair, hs: L.hairStyle, scrub: UroCrawl.meta.settings.scrub, Lscrub: L.scrub, on: [...document.querySelectorAll('#hubBody .on')].map(e => e.getAttribute('data-build') || e.getAttribute('data-skin') || e.getAttribute('data-hair') || e.getAttribute('data-haircol') || e.getAttribute('data-scrubpick')).join(), skinPrev: __count(document.getElementById('lookPrev'), L.skin, 0, 0, 240, 300, 2) }; });
  check('picking Female, skin tone 7 of 8, a ponytail, hospital-teal hair and ceil-blue scrubs changes META.hero and the rig\'s resolved look at once, and the preview shows that skin', b.hero.build === 'female' && b.hero.skin === 6 && b.hero.hairStyle === 'ponytail' && b.hero.hairColor === 8 && b.build === 'Female' && b.skin === '#6a3d24' && b.hair === '#2fe0c8' && b.hs === 'ponytail' && b.scrub === 1 && b.Lscrub === '#7fb3dd' && b.on === 'female,6,ponytail,8,1' && b.skinPrev > 40, JSON.stringify(b));
  await p.waitForTimeout(300); await shot(p, 't-who-are-you');
  await p.click('#btnHeroOk'); await p.waitForTimeout(150);
  b = await p.evaluate(() => { const P = UroCrawl.player(); P.x = 480; P.y = 300; UroCrawl.hub.step(1); return { ov: UroCrawl.state.overlay, set: UroCrawl.meta.hero.set, toast: UroCrawl.hub.state.toast, saved: JSON.parse(localStorage.getItem('urocrawl.v1')).hero }; });
  await p.waitForTimeout(150);
  const seen = await p.evaluate(() => ({ skin: __game('#6a3d24', 455, 260, 50, 45), hair: __game('#2fe0c8', 455, 255, 50, 50), old: __game('#f4c89a', 455, 260, 50, 45) }));
  check('THAT\'S ME closes it and saves the choice (set: true, in localStorage); the surgeon walking the room has the new skin and hair, and none of the old skin tone', b.ov === null && b.set && /NICE TO MEET YOU/.test(b.toast || '') && b.saved.build === 'female' && b.saved.set === true && seen.skin > 20 && seen.hair > 5 && seen.old === 0, JSON.stringify(seen));
  await shot(p, 't-hub-new-look');
  // ── the mirror reopens it ──
  b = await p.evaluate(() => { const H = UroCrawl.hub; const st = H.state.stations.find(s => s.id === 'mirror'); H.goto('mirror'); H.step(2); return { st: !!st, near: H.state.near, name: st && st.name }; });
  await p.keyboard.press('KeyE'); await p.waitForTimeout(120);
  b = Object.assign(b, await p.evaluate(() => ({ panel: UroCrawl.hub.state.panel, title: document.getElementById('hubTitle').textContent, on: [...document.querySelectorAll('#hubBody .on')].map(e => e.getAttribute('data-build') || e.getAttribute('data-skin') || e.getAttribute('data-hair') || e.getAttribute('data-haircol') || e.getAttribute('data-scrubpick')).join() })));
  await p.click('#hubBody [data-build="male"]'); await p.click('#hubBody [data-hair="curls"]'); await p.keyboard.press('Escape'); await p.waitForTimeout(100);
  b.after = await p.evaluate(() => ({ ov: UroCrawl.state.overlay, hero: UroCrawl.meta.hero.build + ':' + UroCrawl.meta.hero.hairStyle }));
  check('a mirror stands by the scrub cabinet: using it reopens the same choices ("The mirror"), with the current look marked; changes stick and Esc closes it', b.st && b.near === 'mirror' && b.panel === 'mirror' && b.title === 'The mirror' && b.on === 'female,6,ponytail,8,1' && b.after.ov === null && b.after.hero === 'male:curls', JSON.stringify(b));
  // ── the HUD portrait and the summary ──
  b = await p.evaluate(() => { const H = UroCrawl.hub; H.scrubIn(); UroCrawl.step(30); const pc = UroCrawl.wardrobe.portrait(); return { running: UroCrawl.state.running, pskin: __count(pc, '#6a3d24', 0, 0, 96, 96, 2), phair: __count(pc, '#2fe0c8', 0, 0, 96, 96, 2) }; });
  await p.waitForTimeout(200);
  b.hud = await p.evaluate(() => ({ skin: __game('#6a3d24', 12, 6, 32, 32, 14), hair: __game('#2fe0c8', 12, 6, 32, 32, 14) }));
  check('in a run the HUD has a portrait left of the HP bar: the surgeon\'s head with the chosen skin and hair', b.running && b.pskin > 100 && b.phair > 20 && b.hud.skin > 15 && b.hud.hair > 3, JSON.stringify(b));
  await shot(p, 't-hud-portrait');
  b = await p.evaluate(() => { const G = UroCrawl.state; G.over = true; G.won = false; G.endT = 0; UroCrawl.step(5); const cv = document.getElementById('sumHero'); return { ov: UroCrawl.state.overlay, skin: __count(cv, '#6a3d24', 0, 0, 144, 144, 2), hair: __count(cv, '#2fe0c8', 0, 0, 144, 144, 2) }; });
  check('the run summary shows the same surgeon next to the title', b.ov === 'summary' && b.skin > 100 && b.hair > 20, JSON.stringify(b));
  await p.waitForTimeout(150); await shot(p, 't-summary');
  // ── persistence; PLAY goes straight in afterwards ──
  await p.reload(); await p.waitForFunction(() => !!window.UroCrawl);
  await p.click('#btnPlay'); await p.waitForTimeout(200);
  b = await p.evaluate(() => ({ hero: JSON.parse(JSON.stringify(UroCrawl.meta.hero)), ov: UroCrawl.state.overlay, on: UroCrawl.hub.state.on }));
  check('the choice persists across a reload, and PLAY now walks straight into the room (no question twice)', b.hero.build === 'male' && b.hero.skin === 6 && b.hero.hairStyle === 'curls' && b.hero.hairColor === 8 && b.hero.set && b.ov === null && b.on, JSON.stringify(b.hero));
  // ── QUICK START players get the question the first time they walk in from a summary; ?hero= sets it ──
  const { p: p2, errs: e2 } = await openT('?seed=3&god=1&room=2'); allErrs.push(e2);
  await p2.click('#btnQuick'); await p2.waitForTimeout(80); await p2.click('#btnHelpOk'); await p2.waitForTimeout(100);
  b = await p2.evaluate(() => { UroCrawl.hurtPlayer(5000, 'test', 0, true); UroCrawl.step(300); document.getElementById('btnSumHub').click(); return { panel: UroCrawl.hub.state.panel, on: UroCrawl.hub.state.on }; });
  check('a QUICK START player is asked "Who are you?" the first time they walk into the Call Room from a summary', b.on && b.panel === 'mirror', JSON.stringify(b));
  const { p: p3, errs: e3 } = await openT('?hero=female:7:long:9&hub=1'); allErrs.push(e3);
  b = await p3.evaluate(() => ({ hero: JSON.parse(JSON.stringify(UroCrawl.meta.hero)), ov: UroCrawl.state.overlay, L: UroCrawl.wardrobe.look().hairStyle }));
  check('?hero=build:skin:hair[:colour] sets the look (and skips the question)', b.hero.build === 'female' && b.hero.skin === 7 && b.hero.hairStyle === 'long' && b.hero.hairColor === 9 && b.hero.set && b.ov === null && b.L === 'long', JSON.stringify(b.hero));
  errCheck('T hero', [].concat(...allErrs));
});

await block('T. wardrobe', async () => {
  const allErrs = [];
  const { p, errs } = await openT('?hub=1&seed=3&cme=2000'); allErrs.push(errs);
  let b = await p.evaluate(() => { const H = UroCrawl.hub; H.goto('scrubs'); H.step(2); const near = H.state.near; H.use('scrubs');
    return { near, name: H.state.stations.find(s => s.id === 'scrubs').name, panel: H.state.panel, tabs: [...document.querySelectorAll('#hubBody [data-wtab]')].map(e => e.getAttribute('data-wtab')).join(), scrubs: document.querySelectorAll('#hubBody [data-scrub]').length, sets: document.querySelectorAll('#hubBody [data-set]').length, outfits: [...document.querySelectorAll('#hubBody [data-item]')].map(e => e.getAttribute('data-item')).join(), pager: /PAGER/.test(document.querySelector('#hubBody .bubble').textContent), done: !!document.getElementById('btnWardDone') }; });
  check('the scrub cabinet is the wardrobe: a pager message, a live preview, tabs per slot (shoes included) plus a catalogue, the twelve scrub colours, the two sets and the outfits (classic and jogger scrubs among them)', b.near === 'scrubs' && /WARDROBE/.test(b.name) && b.panel === 'scrubs' && b.tabs === 'outfit,cap,coat,mask,lamp,neck,shoes,catalog' && b.scrubs === 12 && b.sets === 2 && b.outfits === 'scrubs,scrubs_jogger,lead_apron,retro_gown,plague_coat' && b.pager && b.done, JSON.stringify(b));
  await p.waitForTimeout(250); await shot(p, 't-wardrobe');
  // every item: try it on (nothing is spent), buy it (tap again), wear it, take it off, put it back on
  const res = await p.evaluate(() => {
    const W = UroCrawl.wardrobe, T = W.tables, m = UroCrawl.meta, out = [], q = (s) => document.querySelector('#hubBody ' + s);
    for (const slot of T.SLOTS) {
      q('[data-wtab="' + slot + '"]').click();
      for (const id of Object.keys(T.WARDROBE).filter(k => T.WARDROBE[k].slot === slot)) {
        const d = T.WARDROBE[id], free = d.cost === 0 && !d.set && !d.deed, r = { id, free };
        r.unlocked0 = W.unlocked(id);
        if (!r.unlocked0) {
          const cme0 = m.hub.cme; q('[data-item="' + id + '"]').click();
          r.try = W.state.tryOn === id && m.hub.cme === cme0 && !m.wardrobe.owned[id] && /TRYING ON/.test(document.querySelector('.lookprev').textContent) && UroCrawl.state.overlay === 'hub';
          q('[data-item="' + id + '"]').click();
          r.paid = cme0 - m.hub.cme; r.cost = d.set ? T.SETS[d.set].cost : d.cost; r.owned = !!m.wardrobe.owned[id]; r.worn = m.wardrobe.equipped[slot] === id;
          if (d.set && T.SETS[d.set].deedOnly) { r.deedOnly = true; r.sale = /not for sale/.test(q('[data-item="' + id + '"]').textContent); out.push(r); continue; }   // the plague doctor: tried on, never sold
        } else { q('[data-item="' + id + '"]').click(); r.worn = m.wardrobe.equipped[slot] === id; r.paid = 0; r.cost = 0; r.try = true; r.owned = true; }
        if (id !== T.DEFAULT[slot]) { q('[data-item="' + id + '"]').click(); r.off = m.wardrobe.equipped[slot] === T.DEFAULT[slot]; q('[data-item="' + id + '"]').click(); r.on = m.wardrobe.equipped[slot] === id; }
        else { r.off = true; r.on = true; }
        r.lookOk = W.look().ids[slot] === id;
        out.push(r);
      }
      q('[data-item="' + T.DEFAULT[slot] + '"]').click();
    }
    return { out, cme: m.hub.cme, owned: Object.keys(m.wardrobe.owned).length, eq: JSON.parse(JSON.stringify(m.wardrobe.equipped)) };
  });
  const bad = res.out.filter(r => r.deedOnly ? !(r.try && r.sale && r.paid === 0 && !r.owned && !r.worn) : !(r.try && r.worn && r.off && r.on && r.lookOk && (r.free || r.owned) && r.paid === (r.unlocked0 ? 0 : r.cost)));
  const setsPaid = res.out.filter(r => r.paid && /retro|plague|gauze|beak|mirror/.test(r.id)).length, deedOnly = res.out.filter(r => r.deedOnly).map(r => r.id).join();
  check('every catalogue item: a tap tries it on (preview only, nothing spent), a second tap buys it for its price and wears it, a tap on what you wear takes it off, another puts it back; a set piece buys the whole set once; the plague doctor\'s three pieces can be tried on but are not for sale (' + res.out.length + ' items)', bad.length === 0 && setsPaid === 1 && deedOnly === 'plague_coat,cap_plague,mask_beak' && res.owned >= 20, bad.map(r => JSON.stringify(r)).join(' ') || (res.owned + ' owned · ' + res.cme + ' CME left'));
  const spent = await p.evaluate(() => { const T = UroCrawl.wardrobe.tables; let s = 0; for (const id in T.WARDROBE) { const d = T.WARDROBE[id]; if (!d.set) s += d.cost || 0; } for (const k in T.SETS) if (!T.SETS[k].deedOnly) s += T.SETS[k].cost; return s; });
  check('…and the CME spent is exactly the catalogue\'s price list (' + spent + ' CME); every slot went back to its default', res.cme === 2000 - spent && JSON.stringify(res.eq) === JSON.stringify({ outfit: 'scrubs', cap: 'cap_solid', coat: 'coat_short', mask: 'mask_surgical', lamp: 'lamp_white', neck: 'neck_none', shoes: 'shoes_clog' }), res.cme + ' left');
  // the plague doctor is earned, never bought: beating Fournier's is the only way in
  await p.click('#hubBody [data-wtab="outfit"]');
  b = await p.evaluate(() => { const H = UroCrawl.hub, W = UroCrawl.wardrobe, m = UroCrawl.meta, c0 = m.hub.cme; const card = document.querySelector('#hubBody [data-set="plague"]').textContent;
    const r = { card, buy: H.buy('plague'), buy2: W.buy('mask_beak'), spent: c0 - m.hub.cme, owned: !!m.wardrobe.owned.plague_coat, un: W.setUnlocked('plague') }; m.hub.bosses.fournier = 1; r.after = W.setUnlocked('plague'); document.querySelector('#hubBody [data-wtab="outfit"]').click(); return r; });
  check('the plague doctor is deed-only: its card says "not for sale", buying it (the set or a piece) does nothing with 1500 CME in hand; beating Fournier\'s unlocks it', /not for sale/.test(b.card) && /Beat Fournier/.test(b.card) && b.buy === false && b.buy2 === false && b.spent === 0 && !b.owned && !b.un && b.after, JSON.stringify(b));
  // sets, sepia, scrub colours
  await p.click('#hubBody [data-set="plague"]'); await p.waitForTimeout(60);
  b = await p.evaluate(() => ({ eq: JSON.parse(JSON.stringify(UroCrawl.meta.wardrobe.equipped)), tag: UroCrawl.wardrobe.tag(), sep: !!document.querySelector('#hubBody [data-sepia]') }));
  check('an owned set is worn whole with one tap (coat, beak, hat, and no white coat over them); the old-photograph toggle shows once the retro set is yours', b.eq.outfit === 'plague_coat' && b.eq.mask === 'mask_beak' && b.eq.cap === 'cap_plague' && b.eq.coat === 'coat_none' && b.tag === 'plague' && b.sep, JSON.stringify(b.eq));
  await p.waitForTimeout(250); await shot(p, 't-plague-doctor');
  await p.click('#hubBody [data-set="retro"]'); await p.click('#hubBody [data-sepia]'); await p.waitForTimeout(60);
  b = await p.evaluate(() => { const L = UroCrawl.wardrobe.look(); return { sepia: UroCrawl.meta.wardrobe.sepia, Ls: L.sepia, skin: L.skin, want: UroCrawl.wardrobe.sepiaHex(UroCrawl.wardrobe.tables.SKINS[UroCrawl.meta.hero.skin]), eq: UroCrawl.meta.wardrobe.equipped.outfit }; });
  check('the old photograph renders the surgeon in sepia (every colour of the look goes through the sepia print)', b.sepia && b.Ls && b.skin === b.want && b.eq === 'retro_gown', JSON.stringify(b));
  await p.evaluate(() => UroCrawl.hub.close()); await p.evaluate(() => { const P = UroCrawl.player(); P.x = 560; P.y = 300; }); await p.waitForTimeout(250); await shot(p, 't-retro-sepia');
  b = await p.evaluate(() => { const H = UroCrawl.hub, m = UroCrawl.meta; H.use('scrubs'); const c0 = m.hub.cme; document.querySelector('#hubBody [data-scrub="7"]').click(); const tried = { scrub: m.settings.scrub, prevScrub: UroCrawl.wardrobe.state.tryOn, owned: !!m.hub.owned.scrub7 }; document.querySelector('#hubBody [data-scrub="7"]').click(); return { tried, scrub: m.settings.scrub, owned: !!m.hub.owned.scrub7, paid: c0 - m.hub.cme, look: UroCrawl.wardrobe.look().scrub }; });
  check('a colour past the two starters (Charcoal, PGY-4) works like the rest: a tap tries it on, a second buys it for 15 CME and wears it', b.tried.scrub === 0 && !b.tried.owned && b.scrub === 7 && b.owned && b.paid === 15, JSON.stringify(b));
  // OR shoes: any pair you own in any of nine colours, free to switch
  b = await p.evaluate(() => { const H = UroCrawl.hub, W = UroCrawl.wardrobe, m = UroCrawl.meta; m.wardrobe.sepia = false; H.use('scrubs'); document.querySelector('#hubBody [data-wtab="shoes"]').click(); const dots = document.querySelectorAll('#hubBody [data-shoecol]').length, pairs = document.querySelectorAll('#hubBody [data-item^="shoes_"]').length, c0 = m.hub.cme;
    document.querySelector('#hubBody [data-shoecol="7"]').click(); document.querySelector('#hubBody [data-item="shoes_boots"]').click(); const L = W.look(), r = { dots, pairs, col: m.wardrobe.shoeColor, shoe: L.shoe, kind: L.shoeKind, paid: c0 - m.hub.cme };
    const kinds = []; ['shoes_clog', 'shoes_foam', 'shoes_sneaker', 'shoes_vented', 'shoes_cork', 'shoes_pro', 'shoes_boots'].forEach(id => { W.equip(id); kinds.push(W.look().shoeKind); }); r.kinds = kinds.join(); H.close(); return r; });
  check('OR shoes: seven pairs (hospital, foam, sneaker, vented, cork-bed, pro clogs, cowboy boots) and nine colours; a colour is free and dresses any pair (tan cowboy boots)', b.dots === 9 && b.pairs === 7 && b.col === 7 && b.shoe === '#b98656' && b.kind === 'boots' && b.paid === 0 && b.kinds === 'clog,foam,sneaker,vented,cork,pro,boots', JSON.stringify(b));
  b = await p.evaluate(() => { const W = UroCrawl.wardrobe, out = {}; ['coat_short', 'coat_resident', 'coat_tag', 'coat_long', 'coat_none'].forEach(id => { W.equip(id); const L = W.look(); out[id] = (L.coatKind || '') + ':' + (L.coat ? L.coatLen : 0); }); W.equip('coat_short'); W.equip('scrubs_jogger'); const J = W.look(); W.equip('scrubs'); return { out, jog: J.jogger + ':' + J.legW, name: W.tables.WARDROBE.coat_short.name, def: W.tables.DEFAULT.coat }; });
  check('everyone starts in the med student\'s short coat (stuffed pockets); the resident and embroidered coats are longer, the attending coat longest; jogger scrubs slim the legs', b.def === 'coat_short' && b.name === 'Med student coat' && b.out.coat_short === 'student:8.2' && b.out.coat_resident === ':11.6' && b.out.coat_tag === ':11.6' && b.out.coat_long === ':15.6' && b.out.coat_none === ':0' && b.jog === 'true:3.4', JSON.stringify(b));
  // a lead apron, loupes, the cap of shame and the rainbow lamp: the third outfit for the screenshots
  await p.evaluate(() => { const W = UroCrawl.wardrobe, m = UroCrawl.meta; m.wardrobe.sepia = false; ['lead_apron', 'mask_loupes', 'cap_shame', 'lamp_rainbow', 'neck_lanyard', 'coat_long', 'shoes_boots'].forEach(id => W.equip(id)); UroCrawl.hub.close(); const P = UroCrawl.player(); P.x = 560; P.y = 300; });
  await p.waitForTimeout(250); await shot(p, 't-lead-apron');
  // persistence
  const before = await p.evaluate(() => JSON.stringify(UroCrawl.meta.wardrobe));
  await p.reload(); await p.waitForFunction(() => !!window.UroCrawl);
  b = await p.evaluate(() => ({ json: JSON.stringify(UroCrawl.meta.wardrobe), look: UroCrawl.wardrobe.look().ids }));
  check('what you own and what you wear persist across a reload', b.json === before && b.look.outfit === 'lead_apron' && b.look.cap === 'cap_shame' && b.look.lamp === 'lamp_rainbow', JSON.stringify(b.look));
  // nothing for nothing: with 0 CME a locked item is only tried on
  const { p: p2, errs: e2 } = await openT('?hub=1&seed=3&cme=5'); allErrs.push(e2);
  b = await p2.evaluate(() => { const H = UroCrawl.hub, m = UroCrawl.meta; H.use('scrubs'); document.querySelector('#hubBody [data-wtab="mask"]').click(); document.querySelector('#hubBody [data-item="mask_loupes"]').click(); document.querySelector('#hubBody [data-item="mask_loupes"]').click();
    return { owned: !!m.wardrobe.owned.mask_loupes, cme: m.hub.cme, eq: m.wardrobe.equipped.mask, tryOn: UroCrawl.wardrobe.state.tryOn, free: UroCrawl.wardrobe.equip('mask_none'), buyHook: UroCrawl.hub.buy('mask_loupes'), locked: UroCrawl.wardrobe.equip('cap_plague') }; });
  check('short of CME, a second tap buys nothing (the item stays tried on); free basics are always wearable; locked items cannot be equipped through the hooks either', !b.owned && b.cme === 5 && b.eq === 'mask_surgical' && b.tryOn === 'mask_loupes' && b.free && b.buyHook === false && b.locked === false, JSON.stringify(b));
  // the catalogue page: silhouettes with their unlock
  b = await p2.evaluate(() => { const H = UroCrawl.hub; H.use('scrubs'); document.querySelector('#hubBody [data-wtab="catalog"]').click(); const es = [...document.querySelectorAll('#hubBody [data-cat]')];
    const sil = es.filter(e => e.classList.contains('locked')).every(e => { const cv = e.querySelector('canvas'), d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data; let ink = 0, other = 0; for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 200) { if (Math.abs(d[i] - 0x3d) <= 3 && Math.abs(d[i + 1] - 0x56) <= 3 && Math.abs(d[i + 2] - 0x6a) <= 3) ink++; else other++; } return ink > 300 && other === 0; });
    return { n: es.length, locked: es.filter(e => e.classList.contains('locked')).length, sil, plague: es.find(e => e.getAttribute('data-cat') === 'set_plague').textContent, shame: es.find(e => e.getAttribute('data-cat') === 'cap_shame').textContent, mine: es.find(e => !e.classList.contains('locked')) }; });
  check('the catalogue lists everything to earn, bestiary-style: what is locked is a flat silhouette with its unlock (the plague doctor: "Beat Fournier\'s gangrene (not for sale)")', b.n >= 16 && b.locked === b.n && b.sil && /Beat Fournier’s gangrene \(not for sale\)/.test(b.plague) && /continence lost/.test(b.shame), b.n + ' entries');
  await p2.waitForTimeout(200); await shot(p2, 't-catalogue');
  // a save from before the palette was reordered keeps its colours: old ceil blue (6) worn, old navy (1) and wine (2) bought
  const { p: p3, errs: e3 } = await openT('?seed=3'); allErrs.push(e3);
  await p3.evaluate(() => localStorage.setItem('urocrawl.v1', JSON.stringify({ xp: 0, settings: { scrub: 6 }, hub: { owned: { scrub1: 1, scrub2: 1, diplomas: 1 } } })));
  await p3.reload(); await p3.waitForFunction(() => !!window.UroCrawl);
  b = await p3.evaluate(() => { const m = UroCrawl.meta, T = UroCrawl.wardrobe.tables; return { scrub: m.settings.scrub, name: T.SCRUB_NAMES[m.settings.scrub], owned: Object.keys(m.hub.owned).sort().join(), v: m.scrubV }; });
  check('an older save keeps its scrub colours through the new palette order: ceil blue stays worn, bought navy and wine are navy and maroon now', b.scrub === 1 && b.name === 'CEIL BLUE' && b.owned === 'diplomas,scrub2,scrub3' && b.v === 2, JSON.stringify(b));
  errCheck('T wardrobe', [].concat(...allErrs));
});

await block('T. deeds', async () => {
  const allErrs = [];
  // beating Fournier's: the plague doctor
  const { p, errs } = await openT('?seed=5&god=1&boss=fournier&hub=1'); allErrs.push(errs);
  let b = await p.evaluate(() => { const W = UroCrawl.wardrobe, H = UroCrawl.hub, G = UroCrawl.state; const before = W.setUnlocked('plague'); H.scrubIn(); UroCrawl.step(120); UroCrawl.skipRoom(); UroCrawl.step(400);
    return { before, won: G.won, boss: G.bossId, after: W.setUnlocked('plague'), pieces: ['plague_coat', 'mask_beak', 'cap_plague'].every(id => W.unlocked(id)), owned: Object.keys(UroCrawl.meta.wardrobe.owned).length, line: document.getElementById('sumWard').textContent, fresh: W.state.fresh.join() }; });
  check('beating Fournier\'s gangrene unlocks the plague doctor (all three pieces, free), and the summary says it is waiting in the wardrobe', !b.before && b.won && b.boss === 'fournier' && b.after && b.pieces && b.owned === 0 && /New in the wardrobe: Plague doctor/.test(b.line) && b.fresh.split(',').includes('set_plague'), b.line);
  await p.click('#btnSumHub'); await p.waitForTimeout(120);
  b = await p.evaluate(() => { const H = UroCrawl.hub; const r = { toast: H.state.toast, hint: H.state.hints.includes('scrubs') }; H.use('scrubs'); r.fresh = UroCrawl.wardrobe.state.fresh.length; H.close(); r.hint2 = H.state.hints.includes('scrubs'); return r; });
  check('back in the room: a toast and a gold dot over the scrub cabinet, both gone once you have looked', /NEW CLOTHES IN THE SCRUB CABINET/.test(b.toast || '') && b.hint && b.fresh === 0 && !b.hint2, JSON.stringify(b));
  // Young's favour: the retro surgeon
  b = await p.evaluate(() => { const W = UroCrawl.wardrobe, H = UroCrawl.hub, G = UroCrawl.state; const before = W.setUnlocked('retro'); H.scrubIn(); UroCrawl.step(60); G.favor = { young: 2 }; UroCrawl.skipRoom(); UroCrawl.step(400); return { before, after: W.setUnlocked('retro'), line: document.getElementById('sumWard').textContent }; });
  check('two boons from Young in one run (his favour) unlock the retro surgeon', !b.before && b.after && /Retro surgeon/.test(b.line), b.line);
  // the cap of shame: a run that ends with continence lost (and not one where it was fixed)
  const { p: p2, errs: e2 } = await openT('?seed=4&god=1&boss=bph'); allErrs.push(e2);
  b = await p2.evaluate(() => { const W = UroCrawl.wardrobe, G = UroCrawl.state; UroCrawl.startRun(); UroCrawl.step(60); UroCrawl.injureSphincter(); UroCrawl.cureSphincter(); G.over = true; G.won = false; G.endT = 0; UroCrawl.step(5); const fixed = W.unlocked('cap_shame');
    UroCrawl.hideScreens(); UroCrawl.startRun(); UroCrawl.step(60); const inj = UroCrawl.injureSphincter(); G.over = true; G.won = false; G.endT = 0; UroCrawl.step(5); return { fixed, inj: !!inj, after: W.unlocked('cap_shame'), deeds: UroCrawl.meta.wardrobe.deeds, ov: G.overlay, line: document.getElementById('sumWard').textContent }; });
  check('a run that ends with continence lost unlocks the cap of shame (a run where it was fixed does not)', !b.fixed && b.after && b.deeds.leak === 1 && b.ov === 'summary' && /cap of shame/.test(b.line), JSON.stringify(b.deeds) + ' · ' + b.line);
  // a room of nothing but stones: the lead apron (a mixed room does not count). The same room 2, twice: once with a microbe in it, once without
  const stoneRoom = async (ids) => { const o = await openT('?seed=3&god=1&room=2'); allErrs.push(o.errs);
    const r = await o.p.evaluate((ids) => { const W = UroCrawl.wardrobe, G = UroCrawl.state; UroCrawl.startRun(); UroCrawl.step(2); G.enemies.forEach(e => { e.silent = true; e.hp = 0; }); UroCrawl.step(1); G.waves.next = 99;
      ids.forEach((id, i) => UroCrawl.spawn(id, 600 + i * 80, 150, { instant: true }));
      for (let k = 0; k < 8; k++) { G.enemies.filter(z => !z.dead).forEach(z => UroCrawl.dealDamage(z, 99999, 'LITHO', {})); UroCrawl.step(2); }   // a broken stone leaves fragments: they are stones too
      UroCrawl.step(30); return { cleared: G.cleared, lead: W.unlocked('lead_apron'), deeds: UroCrawl.meta.wardrobe.deeds }; }, ids);
    await o.ctx.close(); return r; };
  b = { mixed: await stoneRoom(['com', 'ecoli', 'uric', 'cystine']) }; Object.assign(b, await stoneRoom(['com', 'uric', 'cystine']));
  check('clearing a room of nothing but stones (three or more) unlocks the lead apron; a room with a microbe in it does not', b.mixed.cleared && !b.mixed.lead && b.cleared && b.lead && b.deeds.stoneRoom === 1, JSON.stringify(b));
  // PGY-6: the attending coat; Nitze's favour is the apron's other way in; deed items can also be bought early
  const { p: p4, errs: e4 } = await openT('?hub=1&seed=3&cme=100'); allErrs.push(e4);
  b = await p4.evaluate(() => { const W = UroCrawl.wardrobe, m = UroCrawl.meta; const c0 = W.unlocked('coat_long'), a0 = W.unlocked('lead_apron'), r0 = W.unlocked('coat_resident'); m.hub.fav.nitze = 2; const a1 = W.unlocked('lead_apron'); m.hub.fav.nitze = 0; m.xp = 100; const r1 = W.unlocked('coat_resident'), c2 = W.unlocked('coat_long'); m.xp = 99999; const c1 = W.unlocked('coat_long'); m.xp = 0;
    const early = UroCrawl.hub.buy('lead_apron'), cme = m.hub.cme, worn = m.wardrobe.equipped.outfit; return { c0, c1, c2, r0, r1, a0, a1, early, cme, worn }; });
  check('PGY-2 unlocks the resident coat and PGY-6 the attending coat; Nitze\'s favour also unlocks the lead apron; a deed item can be bought early for its price (40 CME)', !b.r0 && b.r1 && !b.c2 && !b.c0 && b.c1 && !b.a0 && b.a1 && b.early && b.cme === 60 && b.worn === 'lead_apron', JSON.stringify(b));
  const { p: p5, errs: e5 } = await openT('?seed=5&god=1&boss=staghorn&hub=1'); allErrs.push(e5);
  b = await p5.evaluate(() => { const W = UroCrawl.wardrobe, H = UroCrawl.hub, G = UroCrawl.state; const before = W.unlocked('shoes_boots'); H.scrubIn(); UroCrawl.step(120); UroCrawl.skipRoom(); UroCrawl.step(400); return { before, won: G.won, after: W.unlocked('shoes_boots'), line: document.getElementById('sumWard').textContent }; });
  check('beating the Staghorn unlocks the cowboy boots (or buy them for 30 CME)', !b.before && b.won && b.after && /Cowboy boots/.test(b.line), b.line);
  errCheck('T deeds', [].concat(...allErrs));
});

await block('T. lines', async () => {
  const { p, errs } = await openT('?hub=1&seed=3&wear=plague');
  const b = await p.evaluate(() => { const H = UroCrawl.hub, W = UroCrawl.wardrobe, L = W.tables.LINES;
    const att = H.talk('attending'), jan = H.talk('janitor'); H.goto('reps'); H.step(2); const rep = H.talk(H.state.npcs.filter(n => ['brax', 'kiki', 'rex', 'sunny'].includes(n.id)).sort((a, b) => Math.hypot(a.x - UroCrawl.player().x, a.y - UroCrawl.player().y) - Math.hypot(b.x - UroCrawl.player().x, b.y - UroCrawl.player().y))[0].id);
    const att2 = H.talk('attending'), bubble = H.state.bubble;
    W.own('retro'); W.equip('retro'); const att3 = H.talk('attending'); W.equip('cap_solid'); W.equip('scrubs'); W.equip('mask_surgical'); W.own('lamp_rainbow'); W.equip('lamp_rainbow'); const jan2 = H.talk('janitor');
    const count = (g) => Object.keys(L[g]).reduce((n, k) => n + L[g][k].length, 0);
    return { att, jan, rep, att2, bubble, att3, jan2, nAtt: count('attending'), nJan: count('janitor'), nRep: count('rep'), base: att2.length > 10 && !Object.keys(L.attending).some(k => L.attending[k].includes(att2)) }; });
  check('the cast notices the plague doctor: the attending says "Please take that off.", the janitor "Seen worse.", a rep "Love the beak, very on-brand for infectious disease."', b.att === 'Please take that off.' && b.jan === 'Seen worse.' && b.rep === 'Love the beak, very on-brand for infectious disease.', [b.att, b.jan, b.rep].join(' | '));
  check('…once per look: the next line is their usual one, and a new look (the retro set, a rainbow lamp) gets a new remark; ≥ 3 outfit lines each for the attending, the janitor and the reps', b.base && b.bubble && b.bubble.who === 'attending' && /gown|archive|head mirror/.test(b.att3) && /lamp/.test(b.jan2) && b.nAtt >= 3 && b.nJan >= 3 && b.nRep >= 3, b.att3 + ' | ' + b.jan2 + ' · ' + b.nAtt + '/' + b.nJan + '/' + b.nRep);
  errCheck('T lines', errs);
});

await block('T. numbers', async () => {
  // the same seeded room, played by the same scripted bot, in five looks: every number must match, and the hitbox stays r 13
  const looks = ['', '&wear=plague', '&wear=retro&sepia=1&hero=female:7:long:9', '&wear=lead_apron,mask_loupes,cap_shame,lamp_rainbow,neck_lanyard,coat_long,shoes_boots&hero=male:0:curls:8', '&wear=cap_bouffant,coat_none,mask_none,cap_none,scrubs_jogger,shoes_sneaker&hero=female:3:bun:4'];
  const digests = [];
  for (const q of looks) {
    const { p, errs } = await openT('?seed=7&room=3' + q);
    const d = await p.evaluate(() => {
      UroCrawl.startRun(); const G = UroCrawl.state, P = UroCrawl.player(), I = UroCrawl.input, L = UroCrawl.wardrobe.look(); const r0 = P.r;
      for (let f = 0; f < 900; f++) {
        I.keys = {}; const ph = Math.floor(f / 70) % 4; I.keys[['KeyD', 'KeyS', 'KeyA', 'KeyW'][ph]] = true;
        const t = G.enemies.filter(e => !e.dead).sort((a, b) => Math.hypot(a.x - P.x, a.y - P.y) - Math.hypot(b.x - P.x, b.y - P.y))[0];
        if (t) { I.mx = t.x; I.my = t.y; } I.mouseFire = true;
        UroCrawl.step(1); if (G.overlay || G.over) break;
      }
      I.keys = {}; I.mouseFire = false;
      const s = UroCrawl.spawn('com', P.x + 120, P.y, { instant: true }), lit = s ? UroCrawl.dealDamage(s, 10, 'LITHO', {}) : null;
      return { look: L.ids.outfit + '/' + L.ids.cap + '/' + L.build.name, r0, r: P.r, x: +P.x.toFixed(3), y: +P.y.toFixed(3), hp: +P.hp.toFixed(3), maxHp: P.maxHp, speed: P.speed, rvu: G.rvu, kills: G.stats.kills, dmg: Math.round(G.stats.dmgTaken * 1000), ehp: Math.round(G.enemies.reduce((a, e) => a + (e.dead ? 0 : e.hp), 0) * 1000), n: G.enemies.length, room: G.roomIndex, time: +G.time.toFixed(3), lit };
    });
    digests.push(d); errCheck('T numbers ' + (q || 'default'), errs); await p.context().close();
  }
  const key = (d) => JSON.stringify(Object.assign({}, d, { look: '' }));
  check('hitboxes and every gameplay number are unchanged by the look: the same seeded room played by the same bot gives identical position, HP, RVU, kills, damage taken and enemy HP in all five looks (default, plague doctor, retro + sepia, apron + loupes + cap of shame, bouffant / no coat / no mask), P.r stays 13, LITHO × stone stays 17.5', digests.every(d => key(d) === key(digests[0])) && digests.every(d => d.r0 === 13 && d.r === 13 && d.speed === 190 && d.maxHp === 100 && Math.abs(d.lit - 17.5) < 1e-9) && digests[0].kills > 0, digests.map(d => d.look + ' → x ' + d.x + ' hp ' + d.hp + ' kills ' + d.kills).join(' | '));
  // phone: the room with the plague doctor and the rainbow lamp still draws at 60
  for (const cx of browser.contexts()) await cx.close();
  const { p, errs } = await openT('?seed=3&room=4&god=1&wear=plague,lamp_rainbow&hero=female:6:long:9', 844, 390, true);
  await p.evaluate(() => UroCrawl.startRun()); await p.waitForTimeout(2600);
  const r = await p.evaluate(() => ({ fps: UroCrawl.state.fps, running: UroCrawl.state.running }));
  check('phone (844×390, touch): a fight room with a costumed surgeon draws at a playable frame rate', r.running && r.fps >= 40, 'fps ' + r.fps);
  await shot(p, 't-phone-run');
  errCheck('T phone', errs);
});

await browser.close();
console.log('\n' + nPass + ' passed, ' + nFail + ' failed' + (nFail ? '\n - ' + failures.join('\n - ') : '') + '\nScreenshots: ' + OUT);
process.exit(nFail ? 1 : 0);
