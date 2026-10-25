// Headless-Chrome drive of Pre-Op, Please (games/preop-please.html): iPad viewport, real touch events, screenshots.
// Needs a static server on the repo root (e.g. python3 -m http.server 2048). Run: node tools/preop-please.drive.mjs  (screenshots → $OUT or a temp dir)
import { spawn } from 'node:child_process';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createServer } from 'node:net';

const OUT = process.env.OUT || (await mkdtemp(join(tmpdir(), 'preop-')));
const BASE = process.env.PP_URL || 'http://localhost:2048/games/preop-please.html';
const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const pause = ms => new Promise(r => setTimeout(r, ms));
async function freePort() { const s = createServer(); await new Promise(r => s.listen(0, '127.0.0.1', r)); const p = s.address().port; await new Promise(r => s.close(r)); return p; }
const debugPort = await freePort();
const temp = await mkdtemp(join(OUT, 'chrome-'));
const browser = spawn(chrome, ['--headless=new', '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--autoplay-policy=no-user-gesture-required', `--user-data-dir=${temp}`, `--remote-debugging-port=${debugPort}`, 'about:blank']);
browser.stderr.resume(); browser.stdout.resume();
const log = (...a) => console.log(...a);
let socket, seq = 0; const calls = new Map(), errors = [];
function send(method, params = {}) { const id = ++seq; return new Promise((res, rej) => { calls.set(id, { res, rej }); socket.send(JSON.stringify({ id, method, params })); }); }
async function evaluate(expr) { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; }
async function until(expr, timeout = 15000, label = expr) { const t0 = Date.now(); while (Date.now() - t0 < timeout) { if (await evaluate(expr)) return true; await pause(80); } throw new Error('timeout: ' + label); }
async function shot(name) { const r = await send('Page.captureScreenshot', { format: 'png' }); await writeFile(join(OUT, name + '.png'), Buffer.from(r.data, 'base64')); log('  📸', name); }
const touch = (type, pts) => send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y]) => ({ x, y, id: 1, radiusX: 6, radiusY: 6, force: 1 })) });
async function tapSel(sel) {
  const c = await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});if(!e)return null;e.scrollIntoView({block:'center',inline:'center'});const r=e.getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2]})()`);
  if (!c) throw new Error('no element ' + sel);
  await pause(60); await touch('touchStart', [c]); await pause(50); await touch('touchEnd', []); await pause(120);
}
const tapField = f => tapSel(`[data-f="${f}"]`);
const S = expr => evaluate(`(()=>{const G=__pp.G;return ${expr}})()`);
let pass = 0, fail = 0;
function check(ok, msg) { if (ok) { pass++; log('  ✅', msg); } else { fail++; log('  ❌', msg); } }

async function serve() {   // call NEXT, wait for the packet, return its truth
  await until(`__pp.G.booth==='empty' || __pp.G.state!=='shift'`, 8000, 'booth empty');
  if (await S(`G.state!=='shift' || G.closing`)) return null;
  await tapSel('#nextBtn');
  await until(`__pp.G.booth==='present'`, 5000, 'patient present');
  await pause(500);   // let the papers land
  return S(`({name:G.cur.name, pk:G.cur.pk, tags:G.cur.tags, verdict:G.cur.truth.verdict, plan:__pp.abxPlan(G.cur), vio:G.cur.truth.vio.map(v=>({rule:v.rule,kind:v.kind,pair:v.pairs[0]||null,culprit:v.culprits[0]})), her:G.cur.truth.her.map(h=>({rule:h.rule,field:h.fields[0]}))})`);
}
async function cite(v) {   // inspect, tap a real discrepancy pair
  await tapSel('#inspectBtn');
  const [a, b] = v.pair || ['rule.' + v.rule, v.culprit];
  await tapField(a); await tapField(b);
}
async function stampIt(v, order) {   // order: antibiotic keys for a Day-3 CLEARED ([] = No antibiotic)
  await tapSel(`.stamp.${v}`);
  if (order) {
    await until(`!!document.getElementById('sendOrder')`, 3000, 'order sheet');
    for (const k of (order.length ? order : ['none'])) await tapSel(`[data-abx="${k}"]`);
    await tapSel('#sendOrder');
  }
  await until(`__pp.G.booth!=='present'`, 3000, 'stamped');
}
let wrongAbxDone = false;

try {
  for (let i = 0; i < 100; i++) { try { const r = await fetch(`http://127.0.0.1:${debugPort}/json`); if (r.ok) { const t = await r.json(); const pg = t.find(x => x.type === 'page'); if (pg) { socket = new WebSocket(pg.webSocketDebuggerUrl); break; } } } catch {} await pause(100); }
  await new Promise((res, rej) => { socket.onopen = res; socket.onerror = rej; });
  socket.onmessage = ev => {
    const m = JSON.parse(ev.data);
    if (m.id) { const c = calls.get(m.id); calls.delete(m.id); m.error ? c.rej(new Error(m.error.message)) : c.res(m.result); }
    else if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
  };
  await send('Runtime.enable'); await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1180, height: 820, deviceScaleFactor: 2, mobile: true });
  await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await send('Page.navigate', { url: BASE + '?seed=7&daylen=75&debug' });
  await until(`!!window.__pp`, 15000, 'boot');

  log('\n— content self-test');
  const st = await evaluate('__pp.selfTest(500)');
  check(st.nProblems === 0, `selfTest 1,500 random + scripted packets: ${st.nProblems} problems ${st.problems.slice(0, 3).join(' | ')}`);
  log('   verdict mix', JSON.stringify({ d1: [st.out.day1.approve, st.out.day1.deny], d2: [st.out.day2.approve, st.out.day2.deny], d3: [st.out.day3.approve, st.out.day3.deny, st.out.day3.escalate] }));
  await send('Page.navigate', { url: BASE + '?seed=7&daylen=75&debug' });
  await until(`!!window.__pp && !!document.getElementById('startBtn')`, 15000, 'reboot');
  await pause(600); await shot('01-bulletin-day1');

  log('\n— music');
  const lv = await evaluate('__pp.musicLevels(24)');
  log('   levels', JSON.stringify(lv));
  for (const m of ['booth']) check(lv[m].peak < .5 && lv[m].peak < lv.stampSfx.peak && lv[m].rmsDb > -42 && lv[m].rmsDb < -20, `${m} loop: peak ${lv[m].peak} (stamp ${lv.stampSfx.peak}), ${lv[m].rmsDb} dBFS RMS, ${lv[m].loopSecs}s loop — audible, under the SFX, no clipping`);

  for (let day = 1; day <= 3; day++) {
    log(`\n— day ${day}`);
    await tapSel('#startBtn');
    await until(`__pp.G.state==='shift'`, 3000, 'shift');
    check(await evaluate(`document.querySelector('.stamp.escalate').hidden === ${day < 3}`), `ESCALATE stamp ${day < 3 ? 'hidden' : 'shown'} on day ${day}`);
    if (day === 1) {
      await pause(1200);
      check(await S(`!!G && __pp.MUS.timer != null && __pp.MUS.ctx.state === 'running' && __pp.MUS.step > 0 && __pp.MUS.mood === 'booth'`), 'music: Booth loop starts on the first tap and is stepping');
      await tapSel('#musicBtn'); await pause(500);
      check(await S(`__pp.MUS.mood === 'off' && __pp.MUS.timer == null && __pp.MUS.bus.gain.value < .05 && localStorage.getItem('pp_music') === 'off' && document.getElementById('musicBtn').textContent.includes('🔇')`), 'music: 🎵 → off, silent, remembered');
      await tapSel('#musicBtn'); await pause(1800);
      check(await S(`__pp.MUS.mood === 'booth' && __pp.MUS.timer != null && __pp.MUS.bus.gain.value > .3`), 'music: 🎵 → on again, faded back in');
      await tapSel('#pauseBtn'); await pause(700);
      check(await S(`G.paused && __pp.MUS.bus.gain.value < .05`), 'music: pause fades it out');
      await tapSel('#resumeBtn'); await pause(1200);
      check(await S(`!G.paused && __pp.MUS.bus.gain.value > .3`), 'music: resume fades it back');
    }
    let k = 0;
    for (;;) {
      const t = await serve(); if (!t) break;
      const label = `#${k} ${t.name} (${t.pk}${t.tags.length ? ' ' + t.tags.join(',') : ''}) → ${t.verdict}`;
      if (day === 1 && k === 0) { await shot('02-first-patient'); }
      if (day === 3 && k === 0) {   // the fever and every paper must be on screen without scrolling (iPad landscape)
        check(await evaluate(`(()=>{const t=document.querySelector('[data-f="vitals.temp"]').getBoundingClientRect();const docs=[...document.querySelectorAll('.doc')].map(e=>e.getBoundingClientRect().bottom);return t.bottom<=innerHeight && t.top>=0 && Math.max(...docs)<=innerHeight})()`), 'day 3: booth monitor temp + all six papers visible without scrolling');
      }
      if (day === 1 && k === 1) {   // deliberate false alarm: two unrelated fields
        const c0 = await S('G.clock'); await tapSel('#inspectBtn'); await tapField('id.sex'); await tapField('labs.date');
        check(await S(`document.getElementById('fb').className==='none' && G.clock>=${c0}+5`), 'false-alarm pair → "No discrepancy" and the clock jumps 5 min');
        await tapSel('#inspectBtn');
      }
      if (t.her.length && !t.vio.length && k < 6) {   // tap a herring against its rule → consistent note, no time cost
        await tapSel('#inspectBtn'); await tapField('rule.' + t.her[0].rule); await tapField(t.her[0].field);
        check(await S(`document.getElementById('fb').className==='ok'`), `${label}: herring ${t.her[0].rule} reads "consistent"`);
        await tapSel('#inspectBtn');
      }
      if (day === 1 && k === 3 && t.verdict === 'deny') {   // deliberate wrong call → citation slip
        await stampIt('approve');
        check(await S(`G.stats.cites===1 && document.getElementById('slip').className==='bad'`), `${label}: cleared a failing packet → citation warning 1`);
        await shot('03-citation'); k++; continue;
      }
      if (t.verdict !== 'approve') {
        await cite(t.vio[0]);
        const found = await S('G.found.length');
        check(found > 0, `${label}: cited ${t.vio[0].rule} ${t.vio[0].kind} by touch`);
        if (day === 2 && k === 1) await shot('04-discrepancy-day2');
        if (day === 3 && t.verdict === 'escalate' && k === 0) await shot('05-septic-day3');
      } else if (day === 3 && k === 2) await shot('06-gerald-day3');
      const needOrder = day === 3 && t.verdict === 'approve';
      if (needOrder && !wrongAbxDone && t.plan.bugs.length && !t.plan.sets.some(x => x.join() === 'cfz')) {   // deliberate wrong order: reflex Ancef against a culture history
        wrongAbxDone = true; const c0 = await S('G.stats.cites');
        await tapSel('.stamp.approve'); await until(`!!document.getElementById('sendOrder')`, 3000, 'order sheet');
        await pause(300); await shot('11-order-sheet');
        check(await evaluate(`(()=>{const r=document.getElementById('sendOrder').getBoundingClientRect();return r.bottom<=innerHeight&&r.top>=0})()`), `${label}: order sheet + SEND on screen without scrolling`);
        await tapSel('[data-abx="cfz"]'); await tapSel('#sendOrder'); await until(`__pp.G.booth!=='present'`, 3000, 'stamped');
        check(await S(`G.stats.cites===${c0}+1 && G.stats.log[G.stats.log.length-1].abx===true && document.getElementById('slip').textContent.includes('R8')`), `${label}: Ancef against ${t.plan.bugs.join('+')} → R8 citation (best: ${t.plan.sets[0].join('+')})`);
        await shot('12-abx-citation'); k++; continue;
      }
      await stampIt(t.verdict, needOrder ? t.plan.sets[0] : null);
      if (needOrder) check(await S(`G.stats.log[G.stats.log.length-1].ok`), `${label}: ordered ${t.plan.sets[0].join('+') || 'none'} (${t.plan.bugs.length ? 'cultures: ' + t.plan.bugs.join('+') : 'no positive culture'})`);
      const okNow = await S(`G.stats.log[G.stats.log.length-1].ok && !G.stats.log[G.stats.log.length-1].half`);
      check(okNow, `${label}: stamped ${t.verdict}, full pay`);
      if (t.name === 'Gerald Plunkett' && day === 3) check(await evaluate(`document.getElementById('speech').textContent.includes('GLORY TO UROLOGY')`), 'Gerald day 3 cleared → "GLORY TO UROLOGY!"');
      k++;
    }
    await until(`__pp.G.state==='ledger'`, 90000, 'day end');
    const rows = await S('G.hist[G.hist.length-1].stats.log.length');
    check(rows === k && rows >= 6, `day ${day} closed at 17:00 with ${rows} patients in the recap`);
    await pause(300); await shot(`07-ledger-day${day}`);
    await tapSel('#homeBtn');
    if (day < 3) { await until(`__pp.G.state==='bulletin'`, 3000, 'bulletin'); await pause(300); await shot(`08-bulletin-day${day + 1}`); }
  }
  await until(`__pp.G.state==='final'`, 3000, 'final');
  await shot('09-final');
  const savings = await S('G.savings');
  check(typeof savings === 'number', `final screen reached, savings $${savings}`);

  log('\n— other viewports');
  for (const [w, h, name] of [[820, 1180, 'ipad-portrait'], [390, 844, 'phone']]) {
    await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 2, mobile: true });
    await send('Page.navigate', { url: BASE + '?seed=11&day=3&daylen=600' });
    await until(`!!window.__pp && !!document.getElementById('startBtn')`, 15000, 'boot ' + name);
    await tapSel('#startBtn'); await serve();
    const over = await evaluate('document.documentElement.scrollWidth > innerWidth + 1');
    check(!over, `${name}: no horizontal scroll`);
    const stampsVisible = await evaluate(`(()=>{const r=document.querySelector('.stamp.deny').getBoundingClientRect();return r.bottom<=innerHeight && r.top>=0})()`);
    check(stampsVisible, `${name}: stamps on screen without scrolling`);
    await shot(`10-${name}`);
  }
  check(errors.length === 0, `no page errors ${errors.slice(0, 3).join(' | ')}`);
} catch (e) { fail++; log('  💥', e.message); await shot('zz-crash').catch(() => {}); }
finally {
  log(`\n${pass} passed, ${fail} failed — screenshots in ${OUT}`);
  browser.kill(); process.exit(fail ? 1 : 0);
}
