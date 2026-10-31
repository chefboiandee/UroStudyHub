// Headless-Chrome drive of Uro Rush (games/uro-rush.html): iPad + iPhone viewports, real touch events
// (the floating joystick, a second finger tapping an order while the first steers), full shifts, the embed contract.
// Needs a static server on the repo root (launch config "urostudyhub", or python3 -m http.server 2043).
// Run: node tools/uro-rush.drive.mjs   (screenshots → $OUT or a temp dir; CHROME=/path/to/chrome overrides the browser)
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createServer } from 'node:net';

const OUT = process.env.OUT || (await mkdtemp(join(tmpdir(), 'rush-')));
await mkdir(OUT, { recursive: true });
const ROOT = process.env.RUSH_ROOT || 'http://localhost:2043';
const BASE = ROOT + '/games/uro-rush.html';
const chrome = process.env.CHROME || ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/opt/pw-browsers/chromium', '/usr/bin/chromium', '/usr/bin/google-chrome'].find(p => existsSync(p));
const pause = ms => new Promise(r => setTimeout(r, ms));
async function freePort() { const s = createServer(); await new Promise(r => s.listen(0, '127.0.0.1', r)); const p = s.address().port; await new Promise(r => s.close(r)); return p; }
const debugPort = await freePort();
const temp = await mkdtemp(join(OUT, 'chrome-'));
const browser = spawn(chrome, ['--headless=new', '--no-sandbox', '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--autoplay-policy=no-user-gesture-required', `--user-data-dir=${temp}`, `--remote-debugging-port=${debugPort}`, 'about:blank']);
browser.stderr.resume(); browser.stdout.resume();
const log = (...a) => console.log(...a);
let socket, seq = 0; const calls = new Map(), errors = [];
function send(method, params = {}) { const id = ++seq; return new Promise((res, rej) => { calls.set(id, { res, rej }); socket.send(JSON.stringify({ id, method, params })); }); }
async function evaluate(expr) { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; }
async function until(expr, timeout = 10000, label = expr) { const t0 = Date.now(); while (Date.now() - t0 < timeout) { if (await evaluate(expr)) return true; await pause(60); } throw new Error('timeout: ' + label); }
async function shot(name) { const r = await send('Page.captureScreenshot', { format: 'png' }); await writeFile(join(OUT, name + '.png'), Buffer.from(r.data, 'base64')); log('  📸', name); }
const tp = (x, y, id = 1) => ({ x, y, id, radiusX: 6, radiusY: 6, force: 1 });
const touch = (type, pts) => send('Input.dispatchTouchEvent', { type, touchPoints: pts });
async function center(sel) { const c = await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});if(!e)return null;const r=e.getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2]})()`); if (!c) throw new Error('no element ' + sel); return c; }
async function tap(sel) { const [x, y] = await center(sel); await touch('touchStart', [tp(x, y)]); await pause(40); await touch('touchEnd', []); await pause(80); }
async function viewport(width, height) { await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 2, mobile: true }); }
async function load(q = '') { await send('Page.navigate', { url: BASE + '?seed=11' + q }); await until(`!!window.__rush && !!document.getElementById('goBtn')`, 15000, 'boot'); await pause(150); }
const S = expr => evaluate(`(()=>{const R=__rush,G=R.G;return ${expr}})()`);
let pass = 0, fail = 0;
function check(ok, msg) { if (ok) { pass++; log('  ✅', msg); } else { fail++; log('  ❌', msg); } }
// a world point → page px (map is drawn at VIEW.s, offset VIEW.ox/oy inside #stage)
async function pagePt(wx, wy) { return evaluate(`(()=>{const r=document.getElementById('stage').getBoundingClientRect(),V=${'__rush'}._view();return [r.left+V.ox+${wx}*V.s, r.top+V.oy+${wy}*V.s]})()`); }

try {
  for (let i = 0; i < 100; i++) { try { const r = await fetch(`http://127.0.0.1:${debugPort}/json`); if (r.ok) { const t = await r.json(); const pg = t.find(x => x.type === 'page'); if (pg) { socket = new WebSocket(pg.webSocketDebuggerUrl); break; } } } catch {} await pause(100); }
  await new Promise((res, rej) => { socket.onopen = res; socket.onerror = rej; });
  socket.onmessage = ev => {
    const m = JSON.parse(ev.data);
    if (m.id) { const c = calls.get(m.id); calls.delete(m.id); m.error ? c.rej(new Error(m.error.message)) : c.res(m.result); }
    else if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
  };
  await send('Runtime.enable'); await send('Page.enable');
  await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });

  log('\n— content');
  await viewport(1180, 820); await load();
  const st = await evaluate('__rush.selfTest()');
  check(st.length === 0, `selfTest: ${st.length} problems ${st.slice(0, 3).join(' | ')}`);
  check(await S(`R.TOUCH`), 'touch UI detected');
  await shot('01-title-ipad');

  log('\n— iPad landscape: real taps + the joystick');
  await tap('#goBtn');
  check(await S(`G.state==='card'`), 'Start shift → setting card');
  await shot('02-card');
  await tap('#goBtn');
  check(await S(`G.state==='play'`), 'card → play');
  check(await S(`document.getElementById('joyBase').classList.contains('idle')`), 'idle joystick shown in the thumb zone');
  // walk right with a thumb drag on the map
  await S(`(R.teleport(0), G.doc.x=400, G.doc.y=300, 0)`);
  const [sx, sy] = await pagePt(300, 520);
  const x0 = await S(`G.doc.x`);
  await touch('touchStart', [tp(sx, sy)]); await pause(30);
  for (let k = 1; k <= 6; k++) { await touch('touchMove', [tp(sx + k * 12, sy)]); await pause(16); }
  await pause(600);
  const moved = await S(`({x:G.doc.x, y:G.doc.y, on: document.getElementById('joyBase').classList.contains('idle')===false})`);
  check(moved.x > x0 + 60 && Math.abs(moved.y - 300) < 12 && moved.on, `drag right walks right (Δx ${Math.round(moved.x - x0)}, y ${Math.round(moved.y)}) and the stick sits under the thumb`);
  await shot('03-joystick');
  await touch('touchEnd', []); await pause(250);
  check(await S(`Math.hypot(G.doc.vx,G.doc.vy) < 20`), 'release stops the doctor');
  // up through a doorway, starting a little off the door's centre line (door assist)
  const door0 = await S(`G.L.rooms[0].door`);
  await S(`(G.doc.x=${door0.cx + door0.w / 2 - 6}, G.doc.y=310, G.doc.vx=G.doc.vy=0, 0)`);
  await touch('touchStart', [tp(sx, sy)]); await pause(30);
  for (let k = 1; k <= 6; k++) { await touch('touchMove', [tp(sx, sy - k * 12)]); await pause(16); }
  await pause(900);
  check(await S(`R.activeRoom()===0 && G.doc.y < G.L.rooms[0].door.y`), `drag up from the door's edge lands inside ${await S(`G.L.rooms[0].label`)}`);
  // second finger taps the right order while the first keeps steering
  await S(`(R.put(0, G.mode==='clinic' ? '22F' : '75M'), 0)`);
  await pause(80);
  const ans = await S(`R.answer(0)`);
  const [bx, by] = await center(`.ord[data-act="${ans}"]`);
  const sc0 = await S(`G.score`);
  await touch('touchStart', [tp(sx, sy - 72), tp(bx, by, 2)]); await pause(50);   // second finger down on the button…
  await touch('touchEnd', [tp(bx, by, 2)]); await pause(100);                      // …and up (CDP's touchEnd lists the lifted fingers)
  check(await S(`G.score > ${sc0} && G.log.length && G.log[G.log.length-1].kind==='ok'`), `second finger ordered ${ans} while the first held the stick`);
  check(await S(`document.getElementById('joyBase').classList.contains('idle')===false`), 'the stick is still held after the tap');
  await touch('touchEnd', []); await pause(100);
  await shot('04-after-order');

  log('\n— rules');
  await S(`(R.freeze(), 0)`);
  let lives = await S(`G.lives`);
  await S(`(R.put(1, G.mode==='clinic' ? '22F' : '75M'), R.teleport(1), R.order(R.wrongFor(1)), 0)`);
  check(await S(`G.lives===${lives - 1} && G.log[G.log.length-1].kind==='wrong' && G.streak===0`), 'wrong order costs a heart and the streak');
  lives = await S(`G.lives`);
  await S(`(G.rooms.forEach(r=>{r.pat=null}), R.put(2, G.mode==='clinic' ? '25M' : '35M, L flank'), G.doc.x=400, G.doc.y=300, 0)`);
  await S(`R.step(G.rooms[2].pat.max + .2)`);
  check(await S(`G.log.some(l=>l.kind==='timeout') && G.lives <= ${lives - 1}`), 'a patient who runs out of patience costs a heart');
  // alt answers + Send to ED (clinic only)
  await S(`(R.forceBlock('clinic', 2), R.contCard(), G.rooms.forEach(r=>{r.pat=null}), 0)`);
  check(await S(`R.visActs().some(a=>a.id==='ed') && !R.visActs().some(a=>a.id==='cbi')`), 'clinic tier 2 offers 🚑 Send to ED, not CBI');
  await S(`(R.put(0, 'clot retention'), R.teleport(0), R.order('ed'), 0)`);
  check(await S(`G.log[G.log.length-1].kind==='ok'`), 'gross hematuria + clot retention in clinic → Send to ED is right');
  await S(`(R.put(1, "AUR, can't void"), R.teleport(1), R.order('ed'), 0)`);
  check(await S(`G.log[G.log.length-1].kind==='wrong' && G.log[G.log.length-1].ans==='foley'`), 'AUR in clinic → Send to ED is wrong (Foley)');
  await S(`(R.put(3, 'painless gross hematuria'), R.teleport(3), R.order('ct'), 0)`);
  check(await S(`G.log[G.log.length-1].kind==='ok'`), 'an also-right answer (CT for gross hematuria) gets full credit');
  await S(`(R.forceBlock('consult', 3), R.contCard(), G.rooms.forEach(r=>{r.pat=null}), 0)`);
  check(await S(`R.visActs().length===12 && R.visActs().some(a=>a.id==='cbi') && !R.visActs().some(a=>a.id==='ed')`), 'consults tier 3: all 12 orders, CBI is there, no Send to ED');

  log('\n— full shifts (API play): both settings, random switching, debrief');
  const plans = new Set(); let bothEvery = true, switchesOk = true;
  for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
    await send('Page.navigate', { url: BASE + '?seed=' + seed }); await until(`!!window.__rush`, 15000, 'boot');
    const r = await evaluate(`(()=>{const R=__rush,G=R.G;R.freeze();R.startShift();const seen=[];let guard=0;
      while(G.state!=='over' && guard++<4000){ if(G.state==='card'){R.contCard();} if(seen[seen.length-1]!==G.mode) seen.push(G.mode);
        const o=R.occupied(); if(o.length){R.teleport(o[0]); R.order(R.answer(o[0]));} R.step(.25); }
      return {plan:G.blocks.map(b=>b.mode==='clinic'?'C':'K').join(''), seen, state:G.state, done:G.done, n:G.log.length, total:G.total, ok:G.log.filter(l=>l.kind==='ok').length, score:G.score, rw:R.rewards()};})()`);
    plans.add(r.plan);
    const sw = r.plan.split('').filter((c, i, a) => i && c !== a[i - 1]).length;
    if (!(r.plan.includes('C') && r.plan.includes('K'))) bothEvery = false;
    if (sw < 2) switchesOk = false;
    log(`   seed ${seed}: ${r.plan}  ${r.ok}/${r.n} of ${r.total}  score ${r.score}  → ${r.rw.coins}💰 ${r.rw.xp}XP  ${r.state}${r.done ? ' (complete)' : ''}`);
    if (seed === 1) { check(r.state === 'over' && r.done && r.ok === r.total, 'a perfect shift plays to the end'); check(r.rw.coins <= 150 && r.rw.xp <= 80, 'rewards stay under the arcade caps'); }
  }
  check(bothEvery, 'every shift has clinic AND consult blocks');
  check(switchesOk, 'every shift switches setting at least twice');
  check(plans.size >= 4, `the order is random (${plans.size} different plans over 8 seeds)`);
  await pause(300); await shot('05-debrief');

  log('\n— embed contract (same-origin frame)');
  await send('Page.navigate', { url: ROOT + '/games/' }); await pause(400);
  const msgs = await evaluate(`new Promise(res=>{const got=[];addEventListener('message',e=>got.push(e.data));const f=document.createElement('iframe');f.src='uro-rush.html?embed=1&seed=4';f.style.cssText='width:1000px;height:700px';document.body.appendChild(f);
    f.onload=()=>{const R=f.contentWindow.__rush;R.freeze();R.startShift();R.G.score=420;R.claim();R.claim();setTimeout(()=>{R.contCard();R.togglePause();f.contentWindow.document.getElementById('exitBtn').click();setTimeout(()=>res(got),200);},100);};})`);
  check(msgs.length === 2 && msgs[0].type === 'rush:claim' && msgs[0].coins === 55 && msgs[0].xp === 28, `claim posts once: ${JSON.stringify(msgs[0])}`);
  check(msgs[1] && msgs[1].type === 'rush:exit', 'Back to arcade posts rush:exit');

  log('\n— phones');
  for (const [w, h, name] of [[390, 664, 'iphone-portrait-safari'], [390, 844, 'iphone-portrait-tall'], [844, 390, 'iphone-landscape']]) {
    await viewport(w, h); await load();
    await evaluate(`(()=>{const R=__rush;R.freeze();R.startShift();R.contCard();R.forceBlock('consult',3);R.contCard();R.step(9);R.teleport(R.occupied()[0]);R.step(.1);})()`);
    const lay = await evaluate(`(()=>{const o=[...document.querySelectorAll('.ord')].map(b=>b.getBoundingClientRect());const V=__rush._view();
      return {n:o.length, inView:o.every(r=>r.bottom<=innerHeight+.5&&r.right<=innerWidth+.5&&r.top>=0), minH:Math.min(...o.map(r=>r.height)), minW:Math.min(...o.map(r=>r.width)), mapW:Math.round(800*V.s), mapH:Math.round(600*V.s),
        clipped:[...document.querySelectorAll('.ord')].filter(b=>{const t=[...b.querySelectorAll('.nm,.sn')].find(e=>getComputedStyle(e).display!=='none');return t&&t.scrollHeight>t.clientHeight+1;}).length}})()`);
    check(lay.n === 12 && lay.inView && lay.minH >= 34 && lay.clipped === 0, `${name}: 12 orders on screen, ≥${Math.round(lay.minH)}px tall, ${Math.round(lay.minW)}px wide, no clipped labels; map ${lay.mapW}×${lay.mapH}`);
    await pause(150); await shot('06-' + name);
  }
  check(errors.length === 0, `no page errors ${errors.slice(0, 3).join(' | ')}`);
} catch (e) {
  fail++; log('  ❌ crashed:', e.message);
} finally {
  log(`\n${pass} passed, ${fail} failed · screenshots in ${OUT}`);
  browser.kill();
  process.exit(fail ? 1 : 0);
}
