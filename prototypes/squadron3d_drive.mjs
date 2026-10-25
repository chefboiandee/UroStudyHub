// Headless-Chrome drive of the Stone Squadron 3D prototype: iPad viewport, real touch events, screenshots.
// PROTOTYPE harness. Needs the squadron3d-proto server on :2047. Run: node squadron3d_drive.mjs [touch|logic|all]  (screenshots → $OUT or a temp dir)
import { spawn } from 'node:child_process';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createServer } from 'node:net';

const OUT = process.env.OUT || (await mkdtemp(join(tmpdir(), 'sq3d-')));
const URL = process.env.SQ_URL || 'http://localhost:2047/squadron3d.html?touch&debug';
const phase = process.argv[2] || 'all';
const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const pause = ms => new Promise(r => setTimeout(r, ms));
async function freePort() { const s = createServer(); await new Promise(r => s.listen(0, '127.0.0.1', r)); const p = s.address().port; await new Promise(r => s.close(r)); return p; }
const debugPort = await freePort();
const temp = await mkdtemp(join(OUT, 'chrome-'));
const browser = spawn(chrome, ['--headless=new', '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--autoplay-policy=no-user-gesture-required',
  '--enable-unsafe-swiftshader', `--user-data-dir=${temp}`, `--remote-debugging-port=${debugPort}`, 'about:blank']);
browser.stderr.resume(); browser.stdout.resume();
const log = (...a) => console.log(...a);
let socket, seq = 0; const calls = new Map(), errors = [], consoleMsgs = [];
function send(method, params = {}) { const id = ++seq; return new Promise((res, rej) => { calls.set(id, { res, rej }); socket.send(JSON.stringify({ id, method, params })); }); }
async function evaluate(expr) { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true, userGesture: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; }
async function until(expr, timeout = 15000, label = expr) { const t0 = Date.now(); while (Date.now() - t0 < timeout) { if (await evaluate(expr)) return true; await pause(100); } throw new Error('timeout: ' + label); }
async function shot(name) { const r = await send('Page.captureScreenshot', { format: 'png' }); await writeFile(join(OUT, name + '.png'), Buffer.from(r.data, 'base64')); log('  📸', name); }
async function center(id) { return evaluate(`(()=>{const r=document.getElementById('${id}').getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2,r.top,r.height]})()`); }
async function centerSel(sel) { return evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2]})()`); }
const touch = (type, pts) => send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y, id]) => ({ x, y, id, radiusX: 8, radiusY: 8, force: 1 })) });
async function tap(x, y) { await touch('touchStart', [[x, y, 9]]); await pause(60); await touch('touchEnd', []); }
const S = expr => evaluate(`(()=>{const G=__sq.G;return ${expr}})()`);
let pass = 0, fail = 0;
function check(ok, msg) { if (ok) { pass++; log('  ✅', msg); } else { fail++; log('  ❌', msg); } }

// in-page helpers for the fast-forwarded logic checks (installed after each navigation)
const HELPERS = `(()=>{
  const rOf = o => o.d * 0.13;
  // fly (fast-forward) until parked at stone i, or until the run ends
  __sq.flyTo = i => { const G = __sq.G; let n = 0; while (__sq.state === 'play' && n++ < 3000) { const st = G.stones[i]; const ds = (st.phase === 'alive' ? st.s - rOf(st) : st.lastS) - G.p.s; if (ds < 2.6 && G.p.v < 0.3) break; __sq.step(0.05); } return G.p.s; };
  // clear stone i with the current settings, then resolve its zone (move on if fragments remain)
  __sq.clearStone = (i, maxT = 90) => { const G = __sq.G, st = G.stones[i]; __sq.keys.Space = true; let t = 0; while (st.phase === 'alive' && t < maxT && __sq.state === 'play') { __sq.step(0.05); t += 0.05; } __sq.keys.Space = false; __sq.step(1); if (st.phase === 'cleanup') __sq.moveOn(); __sq.step(0.7); return t; };
  return true;
})()`;

try {
  for (let i = 0; i < 100; i++) { try { const r = await fetch(`http://127.0.0.1:${debugPort}/json`); if (r.ok) { const t = await r.json(); const pg = t.find(x => x.type === 'page'); if (pg) { socket = new WebSocket(pg.webSocketDebuggerUrl); break; } } } catch {} await pause(100); }
  await new Promise((res, rej) => { socket.onopen = res; socket.onerror = rej; });
  socket.onmessage = ev => {
    const m = JSON.parse(ev.data);
    if (m.id) { const c = calls.get(m.id); calls.delete(m.id); m.error ? c.rej(new Error(m.error.message)) : c.res(m.result); }
    else if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
    else if (m.method === 'Runtime.consoleAPICalled') consoleMsgs.push(m.params.type + ': ' + m.params.args.map(a => a.value ?? a.description).join(' '));
  };
  await send('Runtime.enable'); await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1180, height: 820, deviceScaleFactor: 2, mobile: true });
  await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await send('Page.navigate', { url: URL });
  await until('window.__sqBooted === true', 20000, 'module boot');
  await evaluate(`localStorage.removeItem('sq3d_settings')`);
  await send('Page.reload'); await until('window.__sqBooted === true', 20000, 'module boot');
  const gl = await evaluate(`(()=>{const c=document.getElementById('c');const g=c.getContext('webgl2');return g?g.getParameter(g.VERSION)+' | '+(g.getExtension('WEBGL_debug_renderer_info')?g.getParameter(g.getExtension('WEBGL_debug_renderer_info').UNMASKED_RENDERER_WEBGL):'?'):'no webgl2'})()`);
  log('WebGL:', gl);
  await pause(1200);
  await shot('01-brief');

  if (phase === 'touch' || phase === 'all') {
    log('\n— touch run (real time, iPad viewport)');
    // settings: tap Inverted → persisted + hint; tap Standard back
    let [sx, sy] = await centerSel('.seg[data-k="invert"] button[data-v="true"]'); await tap(sx, sy); await pause(150);
    const saved = await evaluate(`JSON.parse(localStorage.getItem('sq3d_settings')||'{}').invert`);
    check(saved === true && (await evaluate(`document.getElementById('defHint').textContent`)).includes('down'), 'Deflection → Inverted is saved and the hint flips');
    [sx, sy] = await centerSel('.seg[data-k="invert"] button[data-v="false"]'); await tap(sx, sy); await pause(150);
    check((await evaluate(`__sq.SETTINGS.invert`)) === false, 'Deflection back to Standard');
    const gb = await center('goBtn');
    check(gb[1] > 0 && gb[1] < 820, `SCRUB IN visible without scrolling (sticky footer, y=${Math.round(gb[1])})`);
    check(await evaluate(`document.getElementById('screen').textContent.includes('build ' + __sq.BUILD)`), 'the brief shows the build stamp');
    await tap(gb[0], gb[1]);
    await until(`__sq.state === 'play'`, 5000);
    check(await evaluate(`!document.getElementById('touch').classList.contains('hidden')`), 'touch controls visible');
    await pause(1200); await shot('02-flight-uvj');
    // pinch slowdown at the UVJ (real time)
    await until(`__sq.G.p.s > 8`, 8000, 'reach the UVJ');
    const vUvj = await S('G.p.v');
    check(vUvj < 4.5, `scope slows through the UVJ pinch (v=${vUvj.toFixed(1)} u/s vs cruise 9)`);
    await until(`__sq.G.p.s > 16`, 8000, 'clear the UVJ');
    check((await S('G.cleanPasses')) === 1, `clean pass through the UVJ scores the bonus (bonus ${await S('G.bonus')})`);
    // joystick: drag right on the left half
    await touch('touchStart', [[220, 600, 1]]); await pause(50);
    for (let k = 1; k <= 6; k++) { await touch('touchMove', [[220 + k * 12, 600, 1]]); await pause(30); }
    await pause(250);
    const vx = await S('G.p.vx'); check(vx > 1, `joystick steers right (vx=${vx.toFixed(2)})`);
    await touch('touchEnd', []); await pause(400);
    // flow slider: drag up
    const [fx, , ftop, fh] = await center('flowTrack');
    await touch('touchStart', [[fx, ftop + fh * 0.6, 2]]); await pause(40); await touch('touchMove', [[fx, ftop + fh * 0.45, 2]]); await pause(40); await touch('touchEnd', []);
    const flow = await S('G.flow'); check(Math.abs(flow - 0.55) < 0.04, `flow slider sets flow (${flow.toFixed(2)})`);
    // fluoro: the scope tip is drawn dark at its mapped position
    const dark = await evaluate(`(()=>{const G=__sq.G,q=__sq.flPoint(G.p.s),c=document.getElementById('flc'),d=c.getContext('2d').getImageData(Math.round(q.x*c.width),Math.round(q.y*c.height),1,1).data;return d[0]})()`);
    check(dark < 70, `fluoro map draws the scope tip (pixel ${dark} at the tip)`);
    await until(`__sq.G.p.v < 0.3 && __sq.G.p.s > 40`, 30000, 'arrive at stone 1');
    log('  at stone 1, s =', (await S('G.p.s')).toFixed(1), 'type', await S('G.stones[0].type'), 'lock', await S('G.lock'));
    await pause(1500);
    await shot('03-at-stone1');
    const [bx, by] = await center('bPedA');
    await touch('touchStart', [[bx, by, 3]]);
    await pause(1200);
    const rateTxt = await evaluate(`document.getElementById('target').textContent`);
    check(/mm\/s/.test(rateTxt), `target readout shows a live ablation rate ("${rateTxt}")`);
    await shot('04-dusting');
    const t0 = Date.now();
    while (Date.now() - t0 < 20000 && (await S(`G.stones[0].phase`)) === 'alive') await pause(200);
    await touch('touchEnd', []);
    check((await S('G.stones[0].phase')) !== 'alive', `stone 1 cleared by holding the DUST pedal (${await S('G.stones[0].how')}, ${(await S('G.stones[0].dustT')).toFixed(1)} s dusting)`);
    await until(`__sq.G.stones[0].phase === 'done' || !document.getElementById('moveOn').classList.contains('hidden')`, 8000, 'stone 1 zone resolves');
    if (await evaluate(`!document.getElementById('moveOn').classList.contains('hidden')`)) { const [ox, oy] = await center('moveOn'); await tap(ox, oy); }
    await until(`__sq.G.p.v < 0.3 && __sq.G.p.s > 130`, 45000, 'arrive at stone 2');
    await pause(1500);
    log('  at stone 2:', await S('G.stones[1].type'), (await S('G.stones[1].d')).toFixed(1), 'mm · OR time', await evaluate(`document.getElementById('orT').textContent`));
    // multi-touch: joystick held + DUST pedal, then the FRAG pedal goes down too → instant switch, no standby
    const [fx2, fy2] = await center('bPedB');
    await touch('touchStart', [[220, 600, 4]]); await pause(40);
    await touch('touchStart', [[220, 600, 4], [bx, by, 5]]); await pause(600);
    const selA = await S('G.act');
    await touch('touchStart', [[220, 600, 4], [bx, by, 5], [fx2, fy2, 6]]); await pause(150);
    const sw = await S('[G.act, !!G.pend]');
    check(selA === 'a' && sw[0] === 'b' && !sw[1], `pressing the FRAG pedal mid-lasing switches instantly, no standby (${selA} → ${sw[0]}, standby ${sw[1]})`);
    await touch('touchMove', [[220, 600, 4], [fx2, fy2, 6]]); // lift DUST only (CDP: touchEnd releases every finger; a move without it lifts just that one)
    await pause(700); await shot('06-frag-pulses');
    const t1 = Date.now();
    while (Date.now() - t1 < 15000 && (await S(`G.stones[1].phase`)) === 'alive') await pause(150);
    await touch('touchEnd', []);
    const p2 = await S('G.stones[1].pulses'), nf = await S('G.frags.length');
    check(p2 > 3, `the FRAG pedal fires frag pulses (${p2} pulses, stone ${await S('G.stones[1].how')}, ${nf} fragments)`);
    await pause(600); await shot('07-fragments');
    // basket one fragment → the trip out to the bladder and back
    const [kx, ky] = await center('bBasket');
    // line up on a basketable piece and tap BASKET (retry: fragments drift between the line-up and the tap)
    let started = false; const tBefore = await S('G.t');
    for (let tries = 0; tries < 4 && !started; tries++) {
      const lined = await evaluate(`(()=>{const G=__sq.G; for (const f of G.frags.filter(f=>!f.left&&f.d<4).sort((a,b)=>a.s-b.s)) { G.p.x=f.x; G.p.y=f.y; const t=__sq.findTarget(0.9,6); if (t && t.o.isFrag && t.o.d<4) return true; } return false; })()`);
      if (!lined) break;
      await tap(kx, ky); await pause(350);
      if (tries === 0) await shot('08-basket');
      try { await until(`!!__sq.G.trip`, 2500, 'trip starts'); started = true; } catch { await until(`__sq.G.bk.state === 'idle'`, 4000, 'basket idle'); }
    }
    check(started, 'lined up on a basketable (<4 mm) fragment and BASKET started a trip');
    let minS = 999; const t2 = Date.now();
    while (Date.now() - t2 < 40000) { const st = await S('[G.p.s, !!G.trip]'); minS = Math.min(minS, st[0]); if (minS < 60 && minS > 20) await shot('09-trip-out'), minS = Math.min(minS, 19.9); if (!st[1]) break; await pause(150); }
    check(minS < 2 && (await S('G.trips')) === 1 && (await S('G.stones[1].specimens')) === 1,
      `basket trip rides out to the bladder (min s ${minS.toFixed(1)}) and back — ${(await S('G.tripTime')).toFixed(0)} s on the clock, specimen ✓`);
    log('  OR time now', await evaluate(`document.getElementById('orT').textContent`), `(+${((await S('G.t')) - tBefore).toFixed(0)} s)`);
    // camera swap
    const [cx, cy] = await center('bCam'); await tap(cx, cy); await pause(700);
    check(await evaluate(`!document.getElementById('scopeMask').classList.contains('hidden')`), 'camera button → scope view');
    await shot('10-scope-view');
    await tap(cx, cy); await pause(300);
    // advanced level: LASER button pops the panel; steppers + LOCK IN apply it and the panel slides away
    const panelOpen = () => evaluate(`!document.getElementById('laserPanel').classList.contains('away')`);
    await evaluate(`__sq.SETTINGS.level='advanced'; document.getElementById('bLaser').classList.remove('hidden')`);
    const [lx, ly] = await center('bLaser'); await tap(lx, ly); await pause(250);
    check(await panelOpen(), 'Advanced: ⚙ LASER pops up the pedal programming panel');
    const wb = await centerSel('#laserPanel [data-w="b"]'); await tap(wb[0], wb[1]);
    const jp = await centerSel('#laserPanel [data-d="J-"]'); await tap(jp[0], jp[1]); await tap(jp[0], jp[1]);
    const hp = await centerSel('#laserPanel [data-d="H+"]'); await tap(hp[0], hp[1]);
    await shot('11-laser-panel');
    const ap = await centerSel('#lpApply'); await tap(ap[0], ap[1]); await pause(300);
    const pend = await S('G.pend ? [G.pend.which, G.pend.J, G.pend.Hz] : ["b", G.ped.b.J, G.ped.b.Hz]');
    check(pend[0] === 'b' && Math.abs(pend[1] - 1.3) < 1e-6 && pend[2] === 10 && !(await panelOpen()), `APPLY reprograms the right pedal to 1.3 J × 10 Hz and the panel gets out of the way (got ${pend.join(' ')})`);
    await shot('12-after-apply');
    await tap(lx, ly); await pause(250); await tap(560, 420); await pause(300);
    check(!(await panelOpen()), 'a tap anywhere else closes the panel');
    await tap(lx, ly); await pause(250);
    await until(`document.getElementById('laserPanel').classList.contains('away')`, 8000, 'panel auto-closes after 6 s idle');
    check(true, 'the panel auto-closes after 6 s without touches');
    await evaluate(`__sq.SETTINGS.level='presets'`);
    // pause menu: flip deflection mid-run
    const [px, py] = await center('bPause'); await tap(px, py); await pause(300);
    const [ix2, iy2] = await centerSel('#screen .seg[data-k="invert"] button[data-v="true"]'); await tap(ix2, iy2); await pause(150);
    await shot('13-pause-settings');
    check((await evaluate(`__sq.SETTINGS.invert`)) === true, 'pause menu flips deflection to Inverted mid-run');
    const [ix3, iy3] = await centerSel('#screen .seg[data-k="invert"] button[data-v="false"]'); await tap(ix3, iy3);
    const [rx, ry] = await centerSel('#resBtn'); await tap(rx, ry); await pause(200);
    check((await evaluate(`__sq.state`)) === 'play', 'resume from pause');
    log('  hp', (await S('G.hp')).toFixed(0), 'sepsis', (await S('G.sepsis')).toFixed(0), 'residual', await S('G.residual'), 'score', await evaluate('document.getElementById("scoreV").textContent'));
  }

  if (phase === 'logic' || phase === 'all') {
    log('\n— logic checks (fast-forwarded with __sq.step)');
    const fresh = async (seed = 1, set = {}) => {
      await send('Page.navigate', { url: URL + (seed === 1 ? '' : '&seed=' + seed) }); await until('window.__sqBooted === true', 20000);
      await evaluate(`Object.assign(__sq.SETTINGS, {invert:false, cam:'chase', level:'presets'}, ${JSON.stringify(set)})`);
      await evaluate('__sq.start()'); await until(`__sq.state === 'play'`, 3000); await evaluate(HELPERS);
    };
    // presets reproduce the old model
    await fresh();
    const ln = await evaluate(`[__sq.laserNums(0.4,80), __sq.laserNums(1.5,8), __sq.laserNums(0.9,20), __sq.laserNums(2,10), __sq.laserNums(0.2,5)]`);
    check(Math.abs(ln[0].dustRate - 130) < 1e-6 && ln[0].fragRate === 0 && ln[0].W === 32 && ln[0].kickHz === 0, 'dust preset = old dust (130 mm³/s, 32 W, no pulses)');
    check(Math.abs(ln[1].fragRate - 184) < 1e-6 && ln[1].dustRate === 0 && ln[1].kickHz === 4 && Math.abs(ln[1].kickPush - 1) < 1e-9 && ln[1].W === 12, 'frag preset = old frag (184 mm³/s, 4 pulses/s, push ×1, 12 W)');
    log('  mixed 0.9×20:', JSON.stringify(ln[2], (k, v) => typeof v === 'number' ? +v.toFixed(2) : v), '· 2.0×10 push', ln[3].kickPush.toFixed(2), '· 0.2×5', ln[4].dustRate.toFixed(1));
    check(ln.every(o => Object.values(o).every(Number.isFinite)), 'laser model finite across the range');
    // inverted deflection
    await evaluate(`__sq.SETTINGS.invert = true; __sq.keys.KeyW = true; __sq.step(0.4); __sq.keys.KeyW = false`);
    check((await S('G.p.vy')) < -1, `Inverted: push up → tip goes down (vy=${(await S('G.p.vy')).toFixed(2)})`);
    // settings change in flight is instant, at the stone it's a standby
    await fresh();
    await evaluate(`__sq.step(3); __sq.setMode('frag')`);
    check((await S('G.pend')) === null && (await S('G.las.J')) === 1.5, 'switching pedals in flight is instant');
    await evaluate(`__sq.setMode('dust'); __sq.flyTo(0)`);
    const sb = await evaluate(`(()=>{const G=__sq.G, st=G.stones[0]; __sq.setMode('frag'); const instant = G.pend===null && G.act==='b';
      __sq.SETTINGS.level='advanced'; __sq.requestSettings(1.0, 15, 'b'); const p0=!!G.pend, V0=st.V; __sq.keys.Space=true; __sq.step(1.5); const V1=st.V; __sq.step(1.2); __sq.keys.Space=false;
      return [instant, p0, V0===V1, G.pend===null, G.ped.b.J, G.reprograms];})()`);
    check(sb[0], 'at the stone: switching pedals is instant (only a setting change costs time)');
    check(sb[1] && sb[2] && sb[3] && sb[4] === 1.0 && sb[5] === 1, `reprogramming a pedal at the stone: 2.5 s standby with no ablation, then the new program is live (${sb.join(', ')})`);
    // pinch: hug the wall through the UVJ → scrape, no bonus
    await fresh();
    await evaluate(`__sq.keys.KeyD = true; __sq.step(4); __sq.keys.KeyD = false; __sq.step(2)`);
    check((await S('G.pinch[0].scraped')) && (await S('G.cleanPasses')) === 0 && (await S('G.hp')) < 100, `off-centre through the UVJ scrapes (hp ${(await S('G.hp')).toFixed(0)}, no bonus)`);
    // slow-dust hint on the COM stone + dust vs frag timing
    await fresh();
    await evaluate(`__sq.flyTo(0); __sq.clearStone(0); __sq.flyTo(1)`);
    const dustT = await evaluate(`(()=>{__sq.G.flow=0.5; return __sq.clearStone(1);})()`);
    const hint = await evaluate(`(window.__toasts || []).some(t => t.includes('Barely touching'))`);
    log(`  COM 9 mm by DUST: ${dustT.toFixed(1)} s · temp ${(await S('G.temp')).toFixed(1)}`);
    check(hint, 'Presets: dusting the hard stone shows the "barely touching it — consider FRAG" hint');
    await fresh();
    await evaluate(`__sq.setMode('frag'); __sq.flyTo(0); __sq.setMode('dust'); __sq.step(2.6); __sq.clearStone(0); __sq.setMode('frag'); __sq.flyTo(1); __sq.step(2.6)`);
    const fragT = await evaluate(`__sq.clearStone(1)`);
    log(`  COM 9 mm by FRAG: ${fragT.toFixed(1)} s · ${await S('G.stones[1].pulses')} pulses · ${await S('G.frags.length')} fragments left at move-on`);
    check(fragT < dustT, 'FRAG beats DUST on COM');
    // basket trip (logic): basket a small fragment at stone 2, time the round trip
    await fresh();
    const trip = await evaluate(`(()=>{const G=__sq.G; __sq.flyTo(0); __sq.clearStone(0); __sq.setMode('frag'); __sq.flyTo(1); __sq.step(2.6);
      __sq.keys.Space=true; let n=0; while(G.stones[1].phase==='alive'&&n++<600) __sq.step(0.05); __sq.keys.Space=false;
      if(!(()=>{const G=__sq.G; for (const f of G.frags.filter(f=>!f.left&&f.d<4).sort((a,b)=>a.s-b.s)) { G.p.x=f.x; G.p.y=f.y; const t=__sq.findTarget(0.9,6); if (t && t.o.isFrag && t.o.d<4) return true; } return false; })()) return null; const back=G.p.s, t0=G.t;
      __sq.basketPress(); let minS=999; n=0; while((G.bk.state!=='idle'||G.trip)&&n++<2000){ __sq.step(0.05); minS=Math.min(minS,G.p.s);}
      return {back, minS, dt:G.t-t0, trips:G.trips, spec:G.stones[1].specimens, endS:G.p.s, behind: G.frags.some(f=>!f.left&&f.owner===1&&f.s<back-0.3)};})()`);
    check(trip && trip.minS < 2 && trip.trips === 1 && trip.spec === 1 && trip.endS <= trip.back + 0.05 && (trip.back - trip.endS < 3 || trip.behind), // back where it left, or just below a fragment that slipped behind
      `basket trip: out to s=${trip?.minS.toFixed(1)}, back to ${trip?.endS.toFixed(1)} (left ${trip?.back.toFixed(1)}) — ${trip?.dt.toFixed(1)} s`);
    // advanced mixed setting on COM
    await fresh(1, { level: 'advanced' });
    const adv = await evaluate(`(()=>{const G=__sq.G; __sq.flyTo(0); __sq.clearStone(0); __sq.requestSettings(1.0, 15); const inst = G.pend===null; __sq.flyTo(1); const t=__sq.clearStone(1); return [inst, t, G.stones[1].how, G.stones[1].pulses, G.stones[1].dustT, G.stones[1].s - G.stones[1].s0];})()`);
    log(`  Advanced 1.0 J × 15 Hz on COM: ${adv[1].toFixed(1)} s → ${adv[2]}, ${adv[3]} pulses, retropulsed ${adv[5].toFixed(1)}`);
    check(adv[0] && adv[2] === 'fragmented' && adv[3] > 0 && adv[1] < dustT, 'Advanced mixed 1.0 J × 15 Hz fragments COM, slower push than the preset');
    // review regressions
    await fresh(7); // seed 7 → stone 2 is a COD; make stone 1 a 10 mm uric acid for the burst test
    const burst = await evaluate(`(()=>{const G=__sq.G, st=G.stones[0]; st.type='UA'; st.d=st.d0=10; st.V=st.V0=1000; window.__toasts=[]; __sq.flyTo(0);
      let n=0; while(st.phase==='alive' && n++<40){ __sq.keys.Space=true; __sq.step(1.2); __sq.keys.Space=false; __sq.step(0.4); } return [st.how, (window.__toasts||[]).some(t=>t.includes('Barely touching'))];})()`);
    check(burst[0] === 'dusted' && !burst[1], `burst-dusting a 10 mm uric acid stone gives no "consider FRAG" hint (${burst[0]}, hint ${burst[1]})`);
    await fresh();
    const cap = await evaluate(`(()=>{ __sq.SETTINGS.level='advanced'; __sq.requestSettings(2.0, 100); const G=__sq.G; return [G.las.J, G.las.Hz, G.las.J*G.las.Hz]; })()`);
    check(cap[2] <= 120 + 1e-9, `Advanced power is capped at 120 W (2.0 J → ${cap[1]} Hz = ${cap[2]} W)`);
    const mixed = await evaluate(`(()=>{const G=__sq.G; __sq.SETTINGS.level='advanced'; __sq.flyTo(0); __sq.requestSettings(0.8, 40); __sq.step(2.6); const st=G.stones[0]; st.type='COM'; __sq.clearStone(0); return [st.how, st.crackV > 0];})()`);
    check(mixed[0] === 'fragmented', `0.8 J × 40 Hz that breaks a COM through the crack bank is reported "${mixed[0]}"`);
    await fresh();
    const mo = await evaluate(`(()=>{const G=__sq.G; __sq.flyTo(0); __sq.clearStone(0); __sq.setMode('frag'); __sq.flyTo(1); __sq.step(2.6);
      __sq.keys.Space=true; let n=0; while(G.stones[1].phase==='alive'&&n++<600) __sq.step(0.05); __sq.keys.Space=false;
      for (const f of G.frags.filter(f=>!f.left&&f.d<4).sort((a,b)=>a.s-b.s)) { G.p.x=f.x; G.p.y=f.y; const t=__sq.findTarget(0.9,6); if (t && t.o.isFrag && t.o.d<4) break; }
      const r0 = G.residual; __sq.basketPress(); __sq.step(0.2); __sq.moveOn(); const blocked = G.stones[1].phase === 'cleanup' && G.residual === r0;
      G.flow = 1; let m=0; while(__sq.state==='play' && m++<2000) __sq.step(0.05);
      return [blocked, G.end, G.trips, G.stones[1].specimens];})()`);
    check(mo[0], 'MOVE ON is ignored while the basket is out (no double count)');
    check(mo[1] === 'sepsis' && mo[2] === 1 && mo[3] === 1, `a run that ends mid-trip still counts the trip and the specimen in the basket (end ${mo[1]}, trips ${mo[2]}, specimens ${mo[3]})`);
    // pull back for a fragment lodged behind the scope
    await fresh();
    const pbk = await evaluate(`(()=>{const G=__sq.G; __sq.flyTo(0); const st=G.stones[0];
      __sq.keys.Space=true; let n=0; while(st.phase==='alive'&&n++<900) __sq.step(0.05); __sq.keys.Space=false;
      const f = __sq.spawnFrag(st, 30, G.p.s - 3, 1.5, 0, 0, 0, 0); f.slip = true;
      __sq.step(2); const held = st.phase === 'cleanup' && G.p.v < 0.1, banner = document.getElementById('banner').textContent;
      __sq.keys.KeyB = true; n=0; while (G.p.s > f.s - 2.5 && n++ < 400) __sq.step(0.05); __sq.keys.KeyB = false;
      const sBack = G.p.s; __sq.step(1); const hold = Math.abs(G.p.s - sBack) < 0.3;
      G.p.x = f.x; G.p.y = f.y; __sq.keys.Space = true; n=0; while(!f.gone && n++<400) __sq.step(0.05); __sq.keys.Space = false;
      n=0; while (st.phase !== 'done' && n++ < 400) __sq.step(0.05); __sq.step(1);
      return { held, banner, hold, gone: f.gone, phase: st.phase, moving: G.p.v > 1, residual: G.residual };})()`);
    check(pbk.held && /BEHIND/.test(pbk.banner), `a fragment behind the scope holds the zone open + banner ("${pbk.banner}")`);
    check(pbk.hold && pbk.gone && pbk.phase === 'done' && pbk.moving && pbk.residual === 0, `PULL BACK reaches it, rails hold while you clear it, then the run moves on (hold ${pbk.hold}, cleared ${pbk.gone}, moving ${pbk.moving})`);
    // injuries leave marks on the wall
    await fresh();
    const inj = await evaluate(`(()=>{const G=__sq.G; __sq.step(3);
      __sq.keys.KeyD = true; __sq.step(0.8); __sq.keys.KeyD = false;
      G.p.x = 2.0; G.p.y = 0; __sq.keys.Space = true; __sq.step(1); __sq.keys.Space = false;
      G.temp = 46; __sq.step(1.5);
      return [G.injury.burn, G.injury.thermal, G.injury.scrape, __sq.marks];})()`);
    check(inj[0] > 0 && inj[1] > 0 && inj[2] > 0 && inj[3] === inj[0] + inj[1] + inj[2], `injury marks land on the wall (laser burns ${inj[0]}, thermal ${inj[1]}, abrasions ${inj[2]} → ${inj[3]} marks)`);
    await pause(300); await shot('13b-injury-marks');
    // slips happen in normal fragmenting (statistical — logged, not asserted)
    let slips = 0;
    for (const sd of [11, 12, 13]) { await fresh(sd); slips += await evaluate(`(()=>{const G=__sq.G; __sq.setMode('frag'); for (let i = 0; i < 3; i++) { __sq.flyTo(i); __sq.clearStone(i, 60); } return G.slips;})()`); }
    log(`  fragments that slipped behind the scope over 3 fragmenting runs: ${slips}`);
    // sepsis + perforation still end the run
    await fresh(); await evaluate('__sq.G.flow = 1'); await evaluate('__sq.step(30)');
    check((await evaluate('__sq.state')) === 'end' && (await S('G.end')) === 'sepsis', `IRP pinned high → sepsis abort (${(await S('G.t')).toFixed(1)} s)`);
    await fresh(); await evaluate(`__sq.keys.KeyD = true; __sq.step(60)`);
    check((await S('G.end')) === 'perf', `hugging the wall → perforation abort (${(await S('G.t')).toFixed(1)} s)`);
    await evaluate(`__sq.keys.KeyD = false`);
    // nonstop frag on a big proximal cystine → migration
    await fresh();
    const mig = await evaluate(`(()=>{const G=__sq.G; const st=G.stones[2]; st.d=st.d0=10; st.V=st.V0=1000;
      __sq.flyTo(0); __sq.clearStone(0); __sq.flyTo(1); __sq.clearStone(1, 120); __sq.setMode('frag'); __sq.flyTo(2); __sq.step(2.6);
      __sq.keys.Space=true; let t=0; while(st.phase==='alive'&&t<40){ __sq.step(0.05); t+=0.05; } __sq.keys.Space=false; return [st.how, st.s - st.s0, st.pulses];})()`);
    log(`  10 mm cystine near UPJ, nonstop FRAG → ${mig[0]}, pushed ${mig[1].toFixed(1)}, ${mig[2]} pulses`);
    check(mig[0] === 'migrated', 'nonstop FRAG on a big proximal stone retropulses it into the kidney');
    // full run to the end screen
    await fresh(7);
    const end = await evaluate(`(()=>{const G=__sq.G; G.flow=0.5; let n=0; while(__sq.state==='play'&&n++<8000){ const st=G.stones.find(s=>s.phase!=='done'); __sq.keys.Space = !!(st && st.phase==='alive'); if (st && st.phase==='cleanup') __sq.moveOn(); __sq.step(0.05);} __sq.keys.Space=false; return [__sq.state, G.end, G.t, G.residual, G.cleanPasses, G.stones.map(s=>s.type+':'+s.how).join(' ')];})()`);
    log('  full run (seed 7):', end.join(' | '));
    check(end[0] === 'end' && end[1] === 'done', 'run reaches the renal pelvis → end screen');
    check(await evaluate(`['BASKET TRIPS','CLEAN PINCH PASSES','PEDAL SWITCHES','PULS'].every(t => document.getElementById('screen').textContent.includes(t))`), 'end screen reports trips, pinch passes, pedal switches and the PULS grade');
    // tester feedback: notes + copy report
    const rep = await evaluate(`(async()=>{ document.getElementById('fbNotes').value = 'harness note: pedals fine'; document.getElementById('copyBtn').click(); await new Promise(r => setTimeout(r, 400));
      const msg = document.getElementById('fbMsg').textContent, shown = !document.getElementById('fbOut').classList.contains('hidden'), txt = __sq.report();
      return { msg, shown, ok: txt.includes('run report') && txt.includes('build ' + __sq.BUILD) && txt.includes('harness note') && txt.includes('PULS') && txt.split('\\n').length >= 8, txt }; })()`);
    check(rep.ok && (/Copied/.test(rep.msg) || rep.shown), `end screen: notes + Copy report produce a full run report (${rep.msg || 'shown in box'})`);
    log('  ' + rep.txt.split('\n').slice(0, 4).join(' | '));
    const meta = await evaluate(`(async()=>{ const lab = await (await fetch('index.html', {cache:'no-store'})).text(); return [document.querySelector('meta[name=robots]')?.content, /noindex/.test(lab), /href="squadron3d.html"/.test(lab), lab.includes(__sq.BUILD)]; })()`);
    check(meta[0] === 'noindex, nofollow' && meta[1] && meta[2] && meta[3], `noindex on both pages; the lab page links the game and shows the same build (${meta.join(', ')})`);
    await pause(400); await shot('14-end-done');
    // iPad portrait: every laser-panel button is the thing under the finger (not the joystick zone); toasts clear the side cards
    await send('Emulation.setDeviceMetricsOverride', { width: 820, height: 1180, deviceScaleFactor: 2, mobile: true });
    await fresh(1, { level: 'advanced' }); await evaluate(`__sq.step(1); __sq.openLaserPanel()`); await pause(300);
    const hits = await evaluate(`[...document.querySelectorAll('#laserPanel button')].map(b => { const r = b.getBoundingClientRect(); return document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) === b; })`);
    check(hits.length === 10 && hits.every(Boolean), `portrait: all ${hits.length} laser-panel buttons take the tap (${hits.filter(Boolean).length} ok)`);
    const tw = await evaluate(`(()=>{ const t = document.getElementById('toasts').getBoundingClientRect(), l = document.getElementById('lcol').getBoundingClientRect(), r = document.getElementById('tr').getBoundingClientRect(); return [Math.round(t.left), Math.round(t.right), Math.round(l.right), Math.round(r.left)]; })()`);
    check(tw[0] >= tw[2] && tw[1] <= tw[3], `portrait: toast column ${tw[0]}–${tw[1]} sits between the side cards (${tw[2]} | ${tw[3]})`);
    await shot('15-portrait-panel');
  }
  if (phase === 'phone' || phase === 'all') {
    log('\n— phone (iPhone 852×393 landscape, 393×852 portrait)');
    await send('Emulation.setDeviceMetricsOverride', { width: 852, height: 393, deviceScaleFactor: 3, mobile: true });
    await send('Page.navigate', { url: URL }); await until('window.__sqBooted === true', 20000);
    await evaluate(`Object.assign(__sq.SETTINGS, {invert:false, cam:'chase', level:'presets'}); __sq.start()`); await until(`__sq.state === 'play'`, 3000);
    await evaluate(HELPERS); await evaluate(`__sq.flyTo(0)`); await pause(500);
    const L = await evaluate(`(()=>{ const ids=['tl','fluoro','tr','tc','mode','bPedA','bPedB','bBasket','bBack','flowTrack','joyBase']; const R={};
      for (const id of ids){ const r=document.getElementById(id).getBoundingClientRect(); R[id]=[r.left,r.top,r.right,r.bottom]; }
      const hit = ['bPedA','bPedB','bBasket','bBack'].map(id => { const r=document.getElementById(id).getBoundingClientRect(); return document.elementFromPoint((r.left+r.right)/2,(r.top+r.bottom)/2)?.closest('button')?.id === id; });
      const fl = document.getElementById('fluoro').getBoundingClientRect(); return { R, hit, fl: [fl.width, getComputedStyle(document.getElementById('fluoro')).display] }; })()`);
    const ov = []; const ids = Object.keys(L.R);
    for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) { const a = L.R[ids[i]], b = L.R[ids[j]]; if (a[0] < b[2] - 1 && b[0] < a[2] - 1 && a[1] < b[3] - 1 && b[1] < a[3] - 1) ov.push(ids[i] + '×' + ids[j]); }
    check(ov.length === 0, `phone landscape: no control or HUD card overlaps another${ov.length ? ' (' + ov.join(', ') + ')' : ''}`);
    check(L.hit.every(Boolean), 'phone landscape: pedals, BASKET and PULL BACK each take their own tap');
    check(L.fl[1] !== 'none' && L.fl[0] > 60, `phone landscape: compact fluoro shown (${Math.round(L.fl[0])} px)`);
    await shot('16-phone-landscape');
    await evaluate(`__sq.SETTINGS.level='advanced'; document.getElementById('bLaser').classList.remove('hidden'); __sq.openLaserPanel()`); await pause(300);
    const ph = await evaluate(`[...document.querySelectorAll('#laserPanel button')].map(b => { const r = b.getBoundingClientRect(); const inView = r.top >= 0 && r.bottom <= innerHeight; return inView && document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) === b; })`);
    check(ph.length === 10 && ph.every(Boolean), `phone landscape: the whole laser panel is on screen and every button takes its tap (${ph.filter(Boolean).length}/${ph.length})`);
    await shot('16b-phone-panel');
    await evaluate(`__sq.SETTINGS.level='presets'`);
    await send('Emulation.setDeviceMetricsOverride', { width: 393, height: 852, deviceScaleFactor: 3, mobile: true }); await pause(400);
    const pr = await evaluate(`[__sq.state, __sq.rotPaused, getComputedStyle(document.getElementById('rotate')).display]`);
    check(pr[0] === 'paused' && pr[1] && pr[2] === 'flex', `phone turned upright mid-run: rotate screen + paused (${pr.join(', ')})`);
    await shot('17-phone-portrait');
    await send('Emulation.setDeviceMetricsOverride', { width: 852, height: 393, deviceScaleFactor: 3, mobile: true }); await pause(400);
    const back = await evaluate(`[__sq.state, getComputedStyle(document.getElementById('rotate')).display]`);
    check(back[0] === 'play' && back[1] === 'none', `turned back to landscape: resumes by itself (${back.join(', ')})`);
  }
  log('\nconsole:', consoleMsgs.filter(m => !m.startsWith('log:')).slice(0, 12));
  log('page errors:', errors.length ? errors : 'none');
  if (errors.length) fail++;
  log(`\n${pass} passed, ${fail} failed · screenshots in ${OUT}`);
} catch (e) { console.error('FATAL', e); fail++; log('page errors:', errors); }
finally { try { socket?.close(); } catch {} browser.kill(); process.exit(fail ? 1 : 0); }
