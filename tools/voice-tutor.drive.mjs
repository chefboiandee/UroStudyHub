// Headless-Chrome drive of the AI Tutor's voice mode. The Web Speech API is stubbed in the page: speechSynthesis
// "plays" each utterance for a few ms per character and logs it (window.__said), SpeechRecognition is driven by
// the test (window.__hear / __interim / __noSpeech), and Claude's API streams canned replies (window.__replies)
// as Server-Sent Events, so the speaker is exercised mid-stream. No keys, no network.
//
// Run:   node tools/voice-tutor.drive.mjs
// Needs: a static server on the repo root (launch config "urostudyhub", or `python3 -m http.server 2043`)
//        and a built UroStudyHub.min.html (`python3 build.py`).
// Env:   URL=...      page to test (default http://localhost:2043/UroStudyHub.min.html)
//        CDN_DIR=...  a node_modules folder holding react@18.2.0, react-dom@18.2.0, @babel/standalone@7.23.9
//                     and katex@0.16.9 (for machines without internet; other external requests get a 404)
//        SHOTS=dir    save screenshots there
//        CHROME=...   a Chrome/Chromium binary instead of Playwright's own
// Prints PASS/FAIL per check; exits 1 when any check fails.
//
// Hooks used: [data-voice-toggle], [data-voice-bar] (data-voice-state), [data-voice-status], [data-voice-stop],
// [data-voice-hands] (settings panel), [data-voice-set], [data-voice-panel], [data-voice-pick], [data-voice-test],
// [data-voice-rate=r], [data-voice-beep], [data-voice-mic], [data-voice-say], [data-voice-starter=explain|quiz],
// [data-chat-input], [data-aipick], [data-aipick-prov=claude], [data-nav].
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

const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});

// In the page, before any app script: seed storage once, stub Claude (streamed), speech and the wake lock.
function pageInit(cfg) {
  try {
    if (!localStorage.getItem('__voiceDriveSeeded')) {
      Object.keys(cfg.seed).forEach(function (k) { localStorage.setItem(k, cfg.seed[k]); });
      localStorage.setItem('__voiceDriveSeeded', '1');
    }
  } catch (e) { /* ignore */ }
  // ---- Claude, streamed ----
  window.__aiReqs = []; window.__replies = []; window.__streamEnds = []; window.__streamDelay = 15;
  var realFetch = window.fetch.bind(window);
  window.fetch = function (u, o) {
    var url = typeof u === 'string' ? u : (u && u.url) || String(u);
    if (!/api\.anthropic\.com\/v1\/messages/.test(url)) return realFetch(u, o);
    var body = null;
    try { body = JSON.parse(o.body); } catch (e) { /* ignore */ }
    window.__aiReqs.push({ url: url, body: body });
    var text = window.__replies.length ? window.__replies.shift() : 'Okay. That makes sense. What would you do next?';
    var enc = new TextEncoder(), pieces = [];
    for (var i = 0; i < text.length; i += 12) pieces.push(text.slice(i, i + 12));
    var stream = new ReadableStream({ start: function (ctrl) {
      var k = 0;
      function ev(obj) { ctrl.enqueue(enc.encode('event: e\ndata: ' + JSON.stringify(obj) + '\n\n')); }
      ev({ type: 'message_start', message: { usage: { input_tokens: 10, output_tokens: 1 } } });
      (function next() {
        if (k < pieces.length) { ev({ type: 'content_block_delta', delta: { type: 'text_delta', text: pieces[k++] } }); setTimeout(next, window.__streamDelay); return; }
        ev({ type: 'message_delta', delta: { stop_reason: 'end_turn' }, usage: { output_tokens: 40 } });
        ev({ type: 'message_stop' });
        window.__streamEnds.push(Date.now());
        ctrl.close();
      })();
    } });
    return Promise.resolve(new Response(stream, { status: 200, headers: { 'content-type': 'text/event-stream' } }));
  };
  // ---- speechSynthesis ----
  if (cfg.tts) {
    var said = window.__said = [], q = [], cur = null;
    window.__msPerChar = 2; window.__cancels = 0;
    var VOICES = [
      { name: 'Zarvox', lang: 'en-US', voiceURI: 'zarvox', localService: true },
      { name: 'Fred', lang: 'en-US', voiceURI: 'fred', localService: true },
      { name: 'Samantha', lang: 'en-US', voiceURI: 'samantha', localService: true, default: true },
      { name: 'Ava (Premium)', lang: 'en-US', voiceURI: 'ava-premium', localService: true },
      { name: 'Daniel', lang: 'en-GB', voiceURI: 'daniel', localService: true },
      { name: 'Thomas', lang: 'fr-FR', voiceURI: 'thomas', localService: true },
    ];
    var synth = {
      speaking: false, pending: false, paused: false,
      getVoices: function () { return VOICES; },
      speak: function (u) {
        said.push({ text: u.text, voice: u.voice ? u.voice.name : null, rate: u.rate, volume: u.volume, t: Date.now() });
        q.push(u); synth.pending = true; tick();
      },
      cancel: function () {
        window.__cancels++;
        var all = (cur ? [cur] : []).concat(q);
        q = []; cur = null; synth.speaking = false; synth.pending = false;
        all.forEach(function (u) { setTimeout(function () { if (u.onerror) u.onerror({ error: 'canceled' }); }, 0); });
      },
      pause: function () {}, resume: function () {},
      addEventListener: function () {}, removeEventListener: function () {},
    };
    function tick() {
      if (cur || !q.length) { synth.pending = q.length > 0; return; }
      var u = cur = q.shift();
      synth.pending = q.length > 0; synth.speaking = true;
      setTimeout(function () {
        if (cur !== u) return;
        cur = null; synth.speaking = false;
        if (u.onend) u.onend({});
        tick();
      }, Math.max(20, u.text.length * window.__msPerChar));
    }
    Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true });
    window.SpeechSynthesisUtterance = function (text) { this.text = text; this.volume = 1; this.rate = 1; this.pitch = 1; this.voice = null; this.lang = ''; };
  } else {
    Object.defineProperty(window, 'speechSynthesis', { value: undefined, configurable: true });
    window.SpeechSynthesisUtterance = undefined;
  }
  // ---- SpeechRecognition ----
  window.SpeechRecognition = undefined;
  if (cfg.stt) {
    window.__recs = [];
    var Rec = function () { this.lang = ''; this.continuous = false; this.interimResults = false; this.state = 'new'; window.__recs.push(this); };
    Rec.prototype.start = function () {
      var self = this;
      self.state = 'started'; window.__rec = self;
      if (window.__recDeny) setTimeout(function () { self.state = 'ended'; if (self.onerror) self.onerror({ error: 'not-allowed' }); if (self.onend) self.onend(); }, 10);
    };
    Rec.prototype.stop = function () {
      var self = this;
      if (self.state !== 'started') return;
      self.state = 'stopping';
      setTimeout(function () { self.state = 'ended'; if (self.onend) self.onend(); }, 20);
    };
    Rec.prototype.abort = function () {
      var self = this;
      if (self.state === 'ended' || self.state === 'aborted') return;
      self.state = 'aborted';
      setTimeout(function () { if (self.onerror) self.onerror({ error: 'aborted' }); if (self.onend) self.onend(); }, 5);
    };
    window.webkitSpeechRecognition = Rec;
    var result = function (text, fin) { return { results: [{ 0: { transcript: text }, isFinal: fin, length: 1 }], resultIndex: 0 }; };
    window.__listening = function () { return !!(window.__rec && window.__rec.state === 'started'); };
    window.__interim = function (text) { var r = window.__rec; if (!r || r.state !== 'started') return false; if (r.onresult) r.onresult(result(text, false)); return true; };
    window.__hear = function (text) { var r = window.__rec; if (!r || r.state !== 'started') return false; if (r.onresult) r.onresult(result(text, true)); r.stop(); return true; };
    window.__noSpeech = function () { var r = window.__rec; if (!r || r.state !== 'started') return false; r.state = 'ended'; if (r.onerror) r.onerror({ error: 'no-speech' }); if (r.onend) r.onend(); return true; };
  } else {
    window.webkitSpeechRecognition = undefined;
  }
  // ---- wake lock + chime counters ----
  window.__wake = 0; window.__wakeRel = 0; window.__osc = 0;
  try {
    Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: { request: function () {
      window.__wake++;
      return Promise.resolve({ release: function () { window.__wakeRel++; return Promise.resolve(); }, addEventListener: function () {} });
    } } });
  } catch (e) { /* ignore */ }
  try {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (AC) { var co = AC.prototype.createOscillator; AC.prototype.createOscillator = function () { window.__osc++; return co.apply(this, arguments); }; }
  } catch (e) { /* ignore */ }
}

const KNOWN_HARMLESS = [/exceeds the max of 500KB/i, /ERR_CONNECTION_REFUSED/, /localhost:1234/];
const PROG = JSON.stringify({ role: 'resident', lastLoginDate: new Date().toISOString().slice(0, 10) });
const LM = JSON.stringify({ ep: 'http://localhost:1234', model: 'claude-haiku-5-5', provider: 'claude', claudeKey: 'sk-ant-test', claudeModel: 'claude-haiku-5-5' });
async function open(opts) {
  const o = Object.assign({ tts: true, stt: true, seed: {} }, opts || {});
  o.seed = Object.assign({ uroStudyHub_progress: PROG, uroStudyHub_lmSettings: LM }, o.seed);
  const ctx = await browser.newContext({ viewport: { width: 412, height: 860 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  await ctx.addInitScript(pageInit, o);
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
  await p.waitForFunction(() => {
    const r = document.getElementById('root');
    return r && r.children.length > 0 && [...document.querySelectorAll('button')].some((b) => /Hub/.test(b.textContent));
  }, null, { timeout: 90000 });
  await p.waitForTimeout(400);
  return { ctx, p, errs };
}
const errCheck = (label, errs) => { check('no console errors · ' + label, errs.length === 0, errs.slice(0, 3).join(' | ')); errs.length = 0; };
const shot = async (p, name) => { if (SHOTS) await p.screenshot({ path: join(SHOTS, name + '.png') }); };
const sel = (k, v) => '[data-' + k + (v != null ? '="' + v + '"' : '') + ']';
async function tap(p, s) { await p.locator(s + ':visible').first().click({ timeout: 8000 }); await p.waitForTimeout(120); }
const visible = (p, s) => p.locator(s + ':visible').count().then((n) => n > 0);
const ev = (p, fn, arg) => p.evaluate(fn, arg);
const reqs = (p) => ev(p, () => window.__aiReqs.map((r) => ({ system: r.body.system, messages: r.body.messages, stream: r.body.stream })));
const said = (p) => ev(p, () => window.__said.slice());
const vstate = (p) => ev(p, () => { const b = document.querySelector('[data-voice-bar]'); return b ? b.getAttribute('data-voice-state') : null; });
const status = (p) => p.locator(sel('voice-status')).first().innerText().catch(() => '');
const lastUser = (r) => { const m = r.messages.filter((x) => x.role === 'user'); const c = m[m.length - 1].content; return typeof c === 'string' ? c : JSON.stringify(c); };
async function waitFor(p, fn, arg, ms) { await p.waitForFunction(fn, arg, { timeout: ms || 6000 }); }
const waitState = (p, st, ms) => waitFor(p, (s) => { const b = document.querySelector('[data-voice-bar]'); return b && b.getAttribute('data-voice-state') === s; }, st, ms);
const waitListening = (p, ms) => waitFor(p, () => window.__listening && window.__listening(), null, ms);
const waitReqs = (p, n, ms) => waitFor(p, (k) => window.__aiReqs.length >= k, n, ms);

async function goTutor(p) {
  await p.evaluate(() => { const b = [...document.querySelectorAll('button[data-nav="chat"]')].find((x) => x.getClientRects().length); if (b) b.click(); });
  await p.waitForFunction(() => [...document.querySelectorAll('h1')].some((h) => /AI Tutor/.test(h.textContent)), null, { timeout: 5000 });
  await p.waitForTimeout(150);
}
async function connectClaude(p) {
  await tap(p, sel('aipick'));
  await tap(p, sel('aipick-prov', 'claude'));
  await tap(p, sel('aipick'));
}
async function type(p, text) {
  const inp = p.locator(sel('chat-input')).first();
  await inp.fill(text);
  await inp.press('Enter');
}

const R1 = '## 🔬 Phase 3: Core Details\n\nAlright, picture a **65M** up four times a night. His prostate is 60 g. ' +
  'Start tamsulosin 0.4 mg, and he feels better in a week. E. coli has nothing to do with it.\n\n' +
  'The math: \\( FENa = \\frac{U_{Na}}{P_{Na}} \\) is not the point here. ' +
  '[[HOOK | BPH meds | alpha fast, 5-ARI slow | fast valve, slow shrink]]\nSo why does he feel better so fast?\n\n' +
  'ON SCREEN:\n| Drug | Onset |\n| Tamsulosin | days |\n| Finasteride | months |';
const R2 = 'Exactly right. Smooth muscle tone relaxes within days. The 5-ARI shrinks the gland over months. Which one halves the PSA?';
const LONG = Array.from({ length: 12 }, (_, i) => 'This is sentence number ' + (i + 1) + ' of a long explanation about the prostate.').join(' ') + ' Ready?';

await block('A. No speech in the browser (the Boox case): nothing voice shows, the tutor still works', async () => {
  const { ctx, p, errs } = await open({ tts: false, stt: false });
  errCheck('boot', errs);
  await goTutor(p);
  check('no Voice button', !(await visible(p, sel('voice-toggle'))));
  check('no mic and no voice bar', !(await visible(p, sel('voice-mic'))) && !(await visible(p, sel('voice-bar'))));
  await connectClaude(p);
  await type(p, 'What is BPH?');
  await waitReqs(p, 1);
  const r = (await reqs(p))[0];
  check('request has no voice rule', !/VOICE MODE/.test(r.system));
  await waitFor(p, () => window.__streamEnds.length >= 1);
  await p.waitForTimeout(250);
  check('the reply shows', /What would you do next/.test(await p.locator('[data-chat-msg]').last().innerText()));
  errCheck('A', errs);
  await ctx.close();
});

await block('B. Speech but no listening: replies read aloud, answers typed', async () => {
  const { ctx, p, errs } = await open({ tts: true, stt: false });
  await goTutor(p);
  await connectClaude(p);
  check('Voice button shows (off)', /Voice off/.test(await p.locator(sel('voice-toggle')).innerText()));
  await tap(p, sel('voice-toggle'));
  check('bar says it reads aloud and to type', /can't listen, so type/.test(await status(p)), await status(p));
  check('no mic button', !(await visible(p, sel('voice-mic'))));
  await tap(p, sel('voice-set'));
  check('no hands-free or chime switch in its settings', (await visible(p, sel('voice-panel'))) && !(await visible(p, sel('voice-hands'))) && !(await visible(p, sel('voice-beep'))));
  await tap(p, sel('voice-set'));
  await type(p, 'BPH please');
  await waitFor(p, () => window.__streamEnds.length >= 1);
  await waitState(p, 'idle');
  const s = (await said(p)).filter((x) => x.volume !== 0);
  check('the reply was read aloud', s.length >= 2 && /What would you do next/.test(s[s.length - 1].text), s.map((x) => x.text).join(' | '));
  check('the best voice was used (Ava Premium)', s.every((x) => x.voice === 'Ava (Premium)'), s[0] && s[0].voice);
  errCheck('B', errs);
  await ctx.close();
});

await block('C. Full voice: talk, listen, commands, cut in, settings', async () => {
  const { ctx, p, errs } = await open();
  await goTutor(p);
  await connectClaude(p);
  check('no mic before voice is on', !(await visible(p, sel('voice-mic'))));
  await tap(p, sel('voice-toggle'));
  check('Voice on', /Voice on/.test(await p.locator(sel('voice-toggle')).innerText()));
  check('saved per device', (await ev(p, () => JSON.parse(localStorage.getItem('uroStudyHub_voice')))).on === true);
  check('the tap unlocked speech with a silent utterance', (await said(p)).some((x) => x.volume === 0));
  check('mic and voice bar show', (await visible(p, sel('voice-mic'))) && (await visible(p, sel('voice-bar'))));
  await p.waitForTimeout(100);
  check('screen kept awake', (await ev(p, () => window.__wake)) >= 1);
  check('voice starters on the empty chat', (await visible(p, sel('voice-starter', 'explain'))) && (await visible(p, sel('voice-starter', 'quiz'))));
  await shot(p, 'c0-voice-on');

  // 1. a typed question: voice rule in the request, speaking starts mid-stream, clean text
  await ev(p, (t) => { window.__replies.push(t); window.__streamDelay = 25; }, R1);
  await type(p, 'Teach me BPH meds');
  await waitReqs(p, 1);
  let r = (await reqs(p))[0];
  check('request carries the voice rule, last', /VOICE MODE/.test(r.system) && r.system.lastIndexOf('VOICE MODE') > r.system.lastIndexOf('MATH & SYMBOLS') && r.system.lastIndexOf('VOICE MODE') > r.system.lastIndexOf('MNEMONICS'));
  check('…with the Engaging way of explaining and short turns', /over coffee/.test(r.system) && /40 to 120 words/.test(r.system) && /STYLE: Be energetic/.test(r.system));
  check('streamed', r.stream === true);
  check('bar: Thinking…', /Thinking/.test(await status(p)) || (await vstate(p)) === 'speaking', await status(p));
  await waitFor(p, () => window.__said.some((x) => x.volume !== 0));
  const firstAt = await ev(p, () => window.__said.filter((x) => x.volume !== 0)[0].t);
  await waitFor(p, () => window.__streamEnds.length >= 1);
  const endAt = await ev(p, () => window.__streamEnds[0]);
  check('starts talking before the reply has finished arriving', firstAt < endAt, (endAt - firstAt) + ' ms early');
  await shot(p, 'c1-speaking');
  await waitListening(p, 8000);
  let spoken = (await said(p)).filter((x) => x.volume !== 0).map((x) => x.text);
  const all = spoken.join(' ');
  check('spoken text is clean (no markdown, emoji, hook, LaTeX, ON SCREEN part)', !/[#*|\\{}]|HOOK|ON SCREEN|Tamsulosin \||🔬|fast valve/.test(all), all);
  check('…and spelled out (65-year-old man, 60 grams, 0.4 milligrams, E. coli whole)', /65-year-old man/.test(all) && /60 grams/.test(all) && /0\.4 milligrams/.test(all) && spoken.some((x) => /E\. coli has nothing/.test(x)), spoken.join(' | '));
  check('…in short utterances', spoken.length >= 4 && spoken.every((x) => x.length <= 220), spoken.length + ' utterances');
  check('the table still shows on screen', /Finasteride/.test(await p.locator('[data-chat-msg]').last().innerText()));
  // 2. hands-free: listens on its own after the reply, with the chime
  check('then listens by itself (hands-free)', await ev(p, () => window.__listening()));
  check('bar: Listening', (await vstate(p)) === 'listening' && /Listening/.test(await status(p)), await status(p));
  check('chime played', (await ev(p, () => window.__osc)) >= 2);
  const rec = await ev(p, () => ({ lang: window.__rec.lang, interim: window.__rec.interimResults }));
  check('recognition: English, live results', /^en/.test(rec.lang) && rec.interim === true, JSON.stringify(rec));
  await ev(p, () => window.__interim('smooth muscle'));
  await p.waitForTimeout(80);
  check('what it hears shows in the box as you talk', (await p.locator(sel('chat-input')).inputValue()) === 'smooth muscle');
  await shot(p, 'c2-listening');
  await ev(p, (t) => window.__replies.push(t), R2);
  await ev(p, () => window.__hear('smooth muscle relaxes right away'));
  await waitReqs(p, 2);
  r = (await reqs(p))[1];
  check('the spoken answer is sent', lastUser(r) === 'smooth muscle relaxes right away', lastUser(r));
  check('the box is cleared', (await p.locator(sel('chat-input')).inputValue()) === '');
  await waitListening(p, 8000);

  // 3. "repeat that" → the last reply again, no new request
  let n0 = (await said(p)).length;
  await ev(p, () => window.__hear('Can you say that again?'));
  await waitListening(p, 8000);
  let again = (await said(p)).slice(n0).map((x) => x.text).join(' ');
  check('"say that again" repeats the last reply', /Exactly right/.test(again) && /halves the PSA/.test(again), again);
  check('…without asking the AI', (await reqs(p)).length === 2);

  // 4. "slower" → rate down, acknowledged, saved
  n0 = (await said(p)).length;
  await ev(p, () => window.__hear('slow down'));
  await waitListening(p, 8000);
  const ack = (await said(p)).slice(n0);
  check('"slow down" → "Okay, slowing down." at 0.9×', ack.length && /slowing down/.test(ack[0].text) && ack[0].rate === 0.9, JSON.stringify(ack[0]));
  check('…saved', (await ev(p, () => JSON.parse(localStorage.getItem('uroStudyHub_voice')).rate)) === 0.9);

  // 5. "stop" → stops listening, nothing sent
  await ev(p, () => window.__hear('stop'));
  await waitState(p, 'idle');
  await p.waitForTimeout(300);
  check('"stop" pauses: not listening, nothing sent', !(await ev(p, () => window.__listening())) && (await reqs(p)).length === 2);
  check('bar says paused', /Paused/.test(await status(p)), await status(p));

  // 6. mic tap, nothing said → a hint, no loop
  await tap(p, sel('voice-mic'));
  check('mic tap listens (no chime inside a tap)', await ev(p, () => window.__listening()));
  await ev(p, () => window.__noSpeech());
  await waitState(p, 'idle');
  await p.waitForTimeout(300);
  check('silence → "Didn\'t catch that", not listening again', /Didn't catch/.test(await status(p)) && !(await ev(p, () => window.__listening())), await status(p));

  // 7. cut in: tap the mic mid-reply
  await ev(p, (t) => { window.__replies.push(t); window.__msPerChar = 25; }, LONG);
  await type(p, 'Explain prostate zones');
  await waitState(p, 'speaking');
  await waitFor(p, () => window.__streamEnds.length >= 3);
  const c0 = await ev(p, () => window.__cancels);
  await tap(p, sel('voice-mic'));
  n0 = (await said(p)).length;
  check('cutting in stops the speech and listens', (await ev(p, () => window.__cancels)) > c0 && (await ev(p, () => window.__listening())));
  await p.waitForTimeout(500);
  check('nothing more of that reply is spoken', (await said(p)).length === n0);
  await ev(p, () => window.__hear('wait, which zone gets cancer?'));
  await waitReqs(p, 4);
  check('the cut-in question is sent', lastUser((await reqs(p))[3]) === 'wait, which zone gets cancer?');
  await waitFor(p, () => window.__streamEnds.length >= 4);

  // 8. Stop button mid-reply: quiet, and no auto-listen
  await ev(p, (t) => { window.__replies.push(t); window.__msPerChar = 25; }, LONG);
  await type(p, 'Again please');
  await waitState(p, 'speaking');
  await tap(p, sel('voice-stop'));
  await p.waitForTimeout(600);
  check('Stop: quiet and not listening', (await vstate(p)) === 'idle' && !(await ev(p, () => window.__listening())));
  await waitFor(p, () => window.__streamEnds.length >= 5);
  await ev(p, () => { window.__msPerChar = 2; });

  // 9. read-aloud button on an earlier message: speaks it, no auto-listen after
  n0 = (await said(p)).length;
  await p.locator(sel('voice-say')).first().click();
  await waitFor(p, (k) => window.__said.length > k, n0);
  await waitState(p, 'idle', 8000);
  await p.waitForTimeout(400);
  const replay = (await said(p)).slice(n0).map((x) => x.text).join(' ');
  check('🔊 reads that message', /Alright, picture a 65-year-old man/.test(replay), replay.slice(0, 80));
  check('…and doesn\'t start listening', !(await ev(p, () => window.__listening())));

  // 10. hands-free off (settings panel): after a reply, it waits for the mic
  await tap(p, sel('voice-set'));
  await tap(p, sel('voice-hands'));
  await tap(p, sel('voice-set'));
  check('hands-free off is saved', (await ev(p, () => JSON.parse(localStorage.getItem('uroStudyHub_voice')).hands)) === false);
  await type(p, 'One more');
  await waitFor(p, () => window.__streamEnds.length >= 6);
  await waitState(p, 'idle', 8000);
  await p.waitForTimeout(400);
  check('hands-free off: not listening after the reply', !(await ev(p, () => window.__listening())));
  check('bar: your turn', /Your turn: tap the mic or type\.$/.test(await status(p)), await status(p));
  await tap(p, sel('voice-set'));
  await tap(p, sel('voice-hands'));
  await tap(p, sel('voice-set'));

  // 11. settings: voices ranked, pick one, speed, test
  await tap(p, sel('voice-set'));
  check('settings panel opens', await visible(p, sel('voice-panel')));
  const opts = await p.locator(sel('voice-pick') + ' option').evaluateAll((els) => els.map((e) => e.textContent));
  check('English voices only, best first, novelty last', /Best available \(Ava \(Premium\)\)/.test(opts[0]) && /^Ava/.test(opts[1]) && /^Zarvox|^Fred/.test(opts[opts.length - 1]) && !opts.some((o) => /Thomas/.test(o)), JSON.stringify(opts));
  await p.locator(sel('voice-pick')).selectOption('samantha');
  await tap(p, sel('voice-rate', '1.2'));
  check('voice + speed saved', await ev(p, () => { const v = JSON.parse(localStorage.getItem('uroStudyHub_voice')); return v.uri === 'samantha' && v.rate === 1.2; }));
  n0 = (await said(p)).length;
  await tap(p, sel('voice-test'));
  await waitFor(p, (k) => window.__said.length > k, n0);
  await waitState(p, 'idle', 8000);
  await p.waitForTimeout(400);
  const test = (await said(p)).slice(n0);
  check('Test speaks the sample in Samantha at 1.2×', test.length && test.every((x) => x.voice === 'Samantha' && x.rate === 1.2) && /picture a 65-year-old man/.test(test.map((x) => x.text).join(' ')), JSON.stringify(test[0]));
  check('…and doesn\'t start listening', !(await ev(p, () => window.__listening())));
  await shot(p, 'c11-settings');
  await tap(p, sel('voice-beep'));
  check('chime off is saved', (await ev(p, () => JSON.parse(localStorage.getItem('uroStudyHub_voice')).beep)) === false);
  await tap(p, sel('voice-set'));

  // 12. leaving the Tutor mid-speech stops it
  await ev(p, (t) => { window.__replies.push(t); window.__msPerChar = 25; }, LONG);
  await type(p, 'Long one');
  await waitState(p, 'speaking');
  const cc = await ev(p, () => window.__cancels);
  await p.evaluate(() => { const b = [...document.querySelectorAll('button[data-nav="hub"]')].find((x) => x.getClientRects().length); if (b) b.click(); });
  await p.waitForTimeout(400);
  check('leaving the Tutor stops the voice', (await ev(p, () => window.__cancels)) > cc);
  check('…and lets the screen sleep again', (await ev(p, () => window.__wakeRel)) >= 1);
  await ev(p, () => { window.__msPerChar = 2; });
  await waitFor(p, () => window.__streamEnds.length >= 7);
  await goTutor(p);

  // 13. voice off: plain tutor again
  await tap(p, sel('voice-toggle'));
  const nr = (await reqs(p)).length;
  n0 = (await said(p)).length;
  await type(p, 'Text only now');
  await waitReqs(p, nr + 1);
  await waitFor(p, (k) => window.__streamEnds.length >= k, nr + 1);
  await p.waitForTimeout(500);
  check('voice off: no voice rule, nothing spoken, no mic', !/VOICE MODE/.test((await reqs(p))[nr].system) && (await said(p)).length === n0 && !(await visible(p, sel('voice-mic'))));
  errCheck('C', errs);
  await ctx.close();
});

await block('D. A structured lecture by voice: "next", "go deeper", phases kept steady', async () => {
  const { ctx, p, errs } = await open({ seed: { uroStudyHub_voice: JSON.stringify({ on: true, hands: true, beep: true, uri: '', rate: 1 }) } });
  await goTutor(p);
  await connectClaude(p);
  check('voice stays on after a reload', /Voice on/.test(await p.locator(sel('voice-toggle')).innerText()));
  await ev(p, () => window.__replies.push('🗺️ Phase 1, Big Picture. Picture a man who cannot pee. Ready for the framework? Say next when you are ready.'));
  await p.locator('input[type=file]').first().setInputFiles({ name: 'BPH.txt', mimeType: 'text/plain', buffer: Buffer.from('# BPH\n\nBenign prostatic hyperplasia. The transition zone grows. Alpha blockers and 5-ARIs.\n'.repeat(5)) });
  await waitReqs(p, 1, 8000);
  let r = (await reqs(p))[0];
  check('lecture prompt + voice rule', /SESSION STRUCTURE/.test(r.system) && /VOICE MODE/.test(r.system) && /say next when you're ready/.test(r.system));
  await waitListening(p, 8000);
  // Phase 2 opens, then a mid-phase turn mentions management: the phase must not jump to 5
  await ev(p, () => window.__replies.push('🏗️ Phase 2, Conceptual Framework. Think of the prostate as a donut around the urethra. Where does BPH grow?'));
  await ev(p, () => window.__hear('Okay, next.'));
  await waitReqs(p, 2);
  check('"Okay, next." → NEXT', lastUser((await reqs(p))[1]) === 'NEXT');
  await waitListening(p, 8000);
  await ev(p, () => window.__replies.push('Right, the transition zone. That matters for management later, and for treatment choices. Why does a big middle lobe matter?'));
  await ev(p, () => window.__hear('the transition zone'));
  await waitReqs(p, 3);
  await waitListening(p, 8000);
  check('a mid-phase "management" doesn\'t jump the phase bar', /Phase 2\/9/.test(await p.locator('body').innerText()));
  await ev(p, () => window.__hear('go deeper'));
  await waitReqs(p, 4);
  check('"go deeper" → the DEEP button\'s message', /^Go deeper into this section/.test(lastUser((await reqs(p))[3])));
  await waitFor(p, () => window.__streamEnds.length >= 4);
  errCheck('D', errs);
  await ctx.close();
});

await block('E. Voice starters, a blocked mic', async () => {
  const { ctx, p, errs } = await open({ seed: { uroStudyHub_voice: JSON.stringify({ on: true, hands: true, beep: true, uri: '', rate: 1 }) } });
  await goTutor(p);
  await connectClaude(p);
  await tap(p, sel('voice-starter', 'explain'));
  check('"Explain a topic" listens for the topic', (await ev(p, () => window.__listening())) && /say a topic/.test(await status(p)), await status(p));
  await ev(p, () => window.__hear("Fournier's gangrene"));
  await waitReqs(p, 1);
  check('…and opens a spoken explanation of it', /^Talk me through Fournier's gangrene\. Explain it the way you'd teach it out loud/.test(lastUser((await reqs(p))[0])), lastUser((await reqs(p))[0]));
  await waitListening(p, 8000);
  await ev(p, () => window.__hear('hint'));
  await waitReqs(p, 2);
  check('outside a drill, "hint" is just words', lastUser((await reqs(p))[1]) === 'hint');
  await waitFor(p, () => window.__streamEnds.length >= 2);
  // Clear, then a quiz starter with the mic blocked
  await p.locator('button:has-text("Clear")').first().click();
  await p.waitForTimeout(200);
  await ev(p, () => { window.__recDeny = true; });
  await tap(p, sel('voice-starter', 'quiz'));
  await p.waitForTimeout(300);
  check('blocked mic → says how to allow it', /microphone is blocked/.test(await status(p)), await status(p));
  check('nothing sent', (await reqs(p)).length === 2);
  errCheck('E', errs);
  await ctx.close();
});

await browser.close();
console.log('\n' + nPass + ' passed, ' + nFail + ' failed');
process.exit(nFail ? 1 : 0);
