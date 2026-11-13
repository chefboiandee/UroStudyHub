// Headless-Chrome drive of the AI Tutor's AI panel (provider / model / reasoning effort) and of the
// reasoning-effort field each provider's request carries. Every AI endpoint is stubbed in the page
// (no keys, no network): requests are recorded on window.__aiReqs and answered with a canned reply.
//
// Run:   node tools/ai-pick.drive.mjs
// Needs: a static server on the repo root (launch config "urostudyhub", or `python3 -m http.server 2043`)
//        and a built UroStudyHub.min.html (`python3 build.py`).
// Env:   URL=...      page to test (default http://localhost:2043/UroStudyHub.min.html)
//        CDN_DIR=...  a node_modules folder holding react@18.2.0, react-dom@18.2.0, @babel/standalone@7.23.9
//                     and katex@0.16.9 (for machines without internet; other external requests get a 404)
//        SHOTS=dir    save screenshots there
//        CHROME=...   a Chrome/Chromium binary instead of Playwright's own
// Prints PASS/FAIL per check; exits 1 when any check fails.
//
// Hooks used: [data-aipick] (the chip), [data-aipick-panel], [data-aipick-prov=id], [data-aipick-model],
// [data-aipick-refresh], [data-aipick-search], [data-aipick-or=id], [data-aipick-settings],
// [data-effort-opt=level|default], [data-effort-none], [data-effort-clamp], [data-set-effort] (Settings).
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

// In the page, before any app script: seed storage once, stub every AI endpoint.
function pageInit(seed) {
  try {
    if (!localStorage.getItem('__aiDriveSeeded')) {
      Object.keys(seed).forEach(function (k) { localStorage.setItem(k, seed[k]); });
      localStorage.setItem('__aiDriveSeeded', '1');
    }
  } catch (e) { /* ignore */ }
  window.__aiReqs = [];
  var realFetch = window.fetch.bind(window);
  function json(o) { return Promise.resolve(new Response(JSON.stringify(o), { status: 200, headers: { 'content-type': 'application/json' } })); }
  window.fetch = function (u, o) {
    var url = typeof u === 'string' ? u : (u && u.url) || String(u);
    var body = null;
    try { body = o && o.body ? JSON.parse(o.body) : null; } catch (e) { body = null; }
    if (/api\.anthropic\.com\/v1\/messages/.test(url)) {
      window.__aiReqs.push({ prov: 'claude', url: url, body: body });
      return json({ content: [{ type: 'thinking', thinking: '' }, { type: 'text', text: 'Stub reply from Claude.' }], stop_reason: 'end_turn', usage: { input_tokens: 10, output_tokens: 5 } });
    }
    if (/generativelanguage\.googleapis\.com\/v1beta\/models\?key=/.test(url)) {
      return json({ models: [
        { name: 'models/gemini-2.5-pro', displayName: 'Gemini 2.5 Pro', supportedGenerationMethods: ['generateContent'] },
        { name: 'models/gemini-2.0-flash', displayName: 'Gemini 2.0 Flash', supportedGenerationMethods: ['generateContent'] },
        { name: 'models/gemini-3-flash-preview', displayName: 'Gemini 3 Flash', supportedGenerationMethods: ['generateContent'] },
        { name: 'models/text-embedding-004', displayName: 'Embedding', supportedGenerationMethods: ['embedContent'] },
      ] });
    }
    if (/openrouter\.ai\/api\/v1\/models/.test(url)) {
      return json({ data: [
        { id: 'anthropic/claude-sonnet-5.5', name: 'Anthropic: Claude Sonnet 5.5', pricing: { prompt: '0.000002', completion: '0.00001' }, supported_parameters: ['reasoning', 'max_tokens'], created: 3 },
        { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Meta: Llama 3.3 70B', pricing: { prompt: '0', completion: '0' }, supported_parameters: ['max_tokens', 'temperature'], created: 2 },
      ] });
    }
    if (/localhost:1234\/v1\/models/.test(url)) return json({ data: [{ id: 'gpt-oss-20b' }, { id: 'qwen3-8b' }] });
    var m = /(api\.openai\.com|generativelanguage\.googleapis\.com|openrouter\.ai|localhost:1234).*\/chat\/completions/.exec(url);
    if (m) {
      var prov = { 'api.openai.com': 'openai', 'generativelanguage.googleapis.com': 'gemini', 'openrouter.ai': 'openrouter', 'localhost:1234': 'lmstudio' }[m[1]];
      window.__aiReqs.push({ prov: prov, url: url, body: body });
      return json({ choices: [{ message: { content: 'Stub reply from ' + prov + '.' } }], usage: { prompt_tokens: 10, completion_tokens: 5 } });
    }
    return realFetch(u, o);
  };
}

const KNOWN_HARMLESS = [/exceeds the max of 500KB/i, /ERR_CONNECTION_REFUSED/, /localhost:1234/];
async function open(seed) {
  const ctx = await browser.newContext({ viewport: { width: 412, height: 860 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  await ctx.addInitScript(pageInit, seed);
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
  await p.waitForTimeout(500);
  return { ctx, p, errs };
}
const errCheck = (label, errs) => { check('no console errors · ' + label, errs.length === 0, errs.slice(0, 3).join(' | ')); errs.length = 0; };
const shot = async (p, name) => { if (SHOTS) await p.screenshot({ path: join(SHOTS, name + '.png') }); };
const lmSaved = async (p) => JSON.parse((await p.evaluate(() => localStorage.getItem('uroStudyHub_lmSettings'))) || 'null');
const reqs = (p) => p.evaluate(() => window.__aiReqs.slice());
const sel = (k, v) => '[data-' + k + (v != null ? '="' + v + '"' : '') + ']';
async function tap(p, s) { await p.locator(s + ':visible').first().click({ timeout: 8000 }); await p.waitForTimeout(150); }
const visible = (p, s) => p.locator(s + ':visible').count().then((n) => n > 0);
const chip = (p) => p.locator(sel('aipick')).first().innerText();
const effortOpts = (p) => p.locator(sel('aipick-panel') + ' ' + sel('effort-opt')).evaluateAll((els) => els.map((e) => e.getAttribute('data-effort-opt')));

async function goTutor(p) {
  const ok = await p.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((x) => /🧠\s*Tutor/.test(x.textContent) && x.getClientRects().length);
    if (b) { b.click(); return true; } return false;
  });
  if (!ok) throw new Error('no Tutor tab');
  await p.waitForFunction(() => [...document.querySelectorAll('h1')].some((h) => /AI Tutor/.test(h.textContent)), null, { timeout: 5000 });
  await p.waitForTimeout(200);
}
// Send a tutor message and return the request it made
async function send(p, text) {
  const n0 = (await reqs(p)).length;
  const inp = p.locator('input[placeholder^="Ask about any urology topic"]').first();
  await inp.fill(text);
  await inp.press('Enter');
  await p.waitForFunction((n) => window.__aiReqs.length > n, n0, { timeout: 5000 });
  await p.waitForTimeout(250);
  const all = await reqs(p);
  return all[all.length - 1];
}
const onTutor = (p) => p.evaluate(() => [...document.querySelectorAll('h1')].some((h) => /AI Tutor/.test(h.textContent)));

const PROG = JSON.stringify({ role: 'resident', lastLoginDate: new Date().toISOString().slice(0, 10) });
const LM_ALL = JSON.stringify({
  ep: 'http://localhost:1234', model: 'claude-opus-5-5', provider: 'claude',
  claudeKey: 'sk-ant-test', claudeModel: 'claude-opus-5-5',
  geminiKey: 'AIza-test', geminiModel: 'gemini-2.5-flash',
  openaiKey: 'sk-test', openaiModel: 'gpt-4o',
});

await block('A. Claude: chip, panel, effort in the request', async () => {
  const { ctx, p, errs } = await open({ uroStudyHub_progress: PROG, uroStudyHub_lmSettings: LM_ALL });
  errCheck('boot', errs);
  await goTutor(p);
  check('chip says the AI is off after a reload (as before)', /AI off/.test(await chip(p)), await chip(p));
  await tap(p, sel('aipick'));
  check('chip opens the AI panel inside the tutor', (await visible(p, sel('aipick-panel'))) && (await onTutor(p)));
  check('providers with no key say so', /add key/.test(await p.locator(sel('aipick-prov', 'openrouter')).innerText()) && !/add key/.test(await p.locator(sel('aipick-prov', 'claude')).innerText()));
  await tap(p, sel('aipick-prov', 'claude'));
  check('tapping Claude connects it', /^Claude · claude-opus-5-5/.test((await chip(p)).trim()), await chip(p));
  check('Opus 5.5 offers Default + five levels', JSON.stringify(await effortOpts(p)) === JSON.stringify(['default', 'low', 'medium', 'high', 'xhigh', 'max']), JSON.stringify(await effortOpts(p)));
  check('Default hint names the model default (Medium on Opus 5.5)', /Medium for this one/.test(await p.locator(sel('aipick-panel') + ' ' + sel('effort')).innerText()));
  await shot(p, 'a1-panel-claude');

  let r = await send(p, 'What is the Bosniak classification?');
  check('Default sends no effort', r.prov === 'claude' && !r.body.output_config, JSON.stringify(r.body.output_config));
  check('no temperature to Claude, room for thinking', r.body.temperature === undefined && r.body.max_tokens >= 16000, 'max_tokens ' + r.body.max_tokens);

  await tap(p, sel('aipick-panel') + ' ' + sel('effort-opt', 'high'));
  check('High is saved', (await lmSaved(p)).effort === 'high');
  check('chip shows High', / · High/.test(await chip(p)), await chip(p));
  r = await send(p, 'And Bosniak IIF?');
  check('High → output_config.effort "high"', r.body.output_config && r.body.output_config.effort === 'high', JSON.stringify(r.body.output_config));

  await p.locator(sel('aipick-model')).selectOption('claude-haiku-5-5');
  await p.waitForTimeout(150);
  const s1 = await lmSaved(p);
  check('model switch from the panel is saved', s1.claudeModel === 'claude-haiku-5-5' && s1.model === 'claude-haiku-5-5', s1.claudeModel);
  r = await send(p, 'Quick one.');
  check('the next message goes to Haiku 5.5 with High', r.body.model === 'claude-haiku-5-5' && r.body.output_config.effort === 'high', r.body.model);

  await tap(p, sel('aipick-panel') + ' ' + sel('effort-opt', 'max'));
  r = await send(p, 'Hard one.');
  check('Max → effort "max" and 32k room (streamed)', r.body.output_config.effort === 'max' && r.body.max_tokens >= 32000 && r.body.stream === true, 'max_tokens ' + r.body.max_tokens);
  await tap(p, sel('aipick-panel') + ' ' + sel('effort-opt', 'default'));
  r = await send(p, 'Back to default.');
  check('back to Default sends no effort', !r.body.output_config);
  check('the panel stays open through it all', await visible(p, sel('aipick-panel')));
  errCheck('A', errs);
  await ctx.close();
});

await block('B. OpenAI: no setting on GPT-4o, reasoning models get reasoning_effort', async () => {
  const lm = JSON.parse(LM_ALL); lm.effort = 'max';
  const { ctx, p, errs } = await open({ uroStudyHub_progress: PROG, uroStudyHub_lmSettings: JSON.stringify(lm) });
  await goTutor(p);
  await tap(p, sel('aipick'));
  await tap(p, sel('aipick-prov', 'openai'));
  check('switched to OpenAI · gpt-4o', /^OpenAI · gpt-4o/.test((await chip(p)).trim()), await chip(p));
  check('GPT-4o: "nothing to set" note, no buttons', (await visible(p, sel('effort-none'))) && (await effortOpts(p)).length === 0);
  let r = await send(p, 'Hi');
  check('GPT-4o request: temperature + max_tokens, no reasoning_effort', r.prov === 'openai' && r.body.reasoning_effort === undefined && typeof r.body.temperature === 'number' && r.body.max_tokens > 0, JSON.stringify({ t: r.body.temperature, m: r.body.max_tokens }));
  await p.locator(sel('aipick-model')).selectOption('o4-mini');
  await p.waitForTimeout(150);
  check('o4-mini offers Low / Medium / High', JSON.stringify(await effortOpts(p)) === JSON.stringify(['default', 'low', 'medium', 'high']), JSON.stringify(await effortOpts(p)));
  check('a saved Max says it is sent as High here', /Max.*High is sent/.test(await p.locator(sel('effort-clamp')).innerText()));
  r = await send(p, 'Hi again');
  check('o4-mini: reasoning_effort "high", max_completion_tokens, no max_tokens / temperature',
    r.body.reasoning_effort === 'high' && r.body.max_completion_tokens >= 16000 && r.body.max_tokens === undefined && r.body.temperature === undefined, JSON.stringify(r.body).slice(0, 200));
  await p.locator(sel('aipick-model')).selectOption('gpt-5-mini');
  await p.waitForTimeout(150);
  check('GPT-5 Mini also offers Minimal', (await effortOpts(p)).indexOf('minimal') >= 0);
  errCheck('B', errs);
  await ctx.close();
});

await block('C. Gemini: Off / levels, list refresh, models without thinking', async () => {
  const { ctx, p, errs } = await open({ uroStudyHub_progress: PROG, uroStudyHub_lmSettings: LM_ALL });
  await goTutor(p);
  await tap(p, sel('aipick'));
  await tap(p, sel('aipick-prov', 'gemini'));
  check('Gemini 2.5 Flash offers Off + three levels', JSON.stringify(await effortOpts(p)) === JSON.stringify(['default', 'none', 'low', 'medium', 'high']), JSON.stringify(await effortOpts(p)));
  await tap(p, sel('aipick-panel') + ' ' + sel('effort-opt', 'none'));
  let r = await send(p, 'Hi');
  check('Off → reasoning_effort "none", caller\'s max_tokens', r.prov === 'gemini' && r.body.reasoning_effort === 'none' && r.body.max_tokens === 4096, JSON.stringify({ e: r.body.reasoning_effort, m: r.body.max_tokens }));
  await tap(p, sel('aipick-panel') + ' ' + sel('effort-opt', 'high'));
  r = await send(p, 'Hi');
  check('High → reasoning_effort "high" with 32k room', r.body.reasoning_effort === 'high' && r.body.max_tokens === 32000, String(r.body.max_tokens));
  await tap(p, sel('aipick-refresh'));
  await p.waitForTimeout(300);
  const opts = await p.locator(sel('aipick-model') + ' option').evaluateAll((els) => els.map((e) => e.value));
  check('↻ List loads the key\'s chat models (embeddings left out) and keeps the current one', opts.indexOf('gemini-2.5-pro') >= 0 && opts.indexOf('text-embedding-004') < 0 && opts.indexOf('gemini-2.5-flash') >= 0, JSON.stringify(opts));
  check('the list is kept for next time', !!(await p.evaluate(() => localStorage.getItem('uroStudyHub_gModels'))));
  await p.locator(sel('aipick-model')).selectOption('gemini-2.5-pro');
  await p.waitForTimeout(150);
  check('2.5 Pro has no Off (it always thinks)', (await effortOpts(p)).indexOf('none') < 0);
  await p.locator(sel('aipick-model')).selectOption('gemini-2.0-flash');
  await p.waitForTimeout(150);
  check('2.0 Flash: nothing to set', await visible(p, sel('effort-none')));
  r = await send(p, 'Hi');
  check('2.0 Flash request carries no reasoning_effort', r.body.model === 'gemini-2.0-flash' && r.body.reasoning_effort === undefined);
  errCheck('C', errs);
  await ctx.close();
});

await block('D. OpenRouter: search, per-model reasoning support, reasoning.effort', async () => {
  const lm = JSON.parse(LM_ALL); lm.openrouterKey = 'sk-or-test'; lm.openrouterModel = 'anthropic/claude-sonnet-5.5'; lm.effort = 'medium';
  const { ctx, p, errs } = await open({ uroStudyHub_progress: PROG, uroStudyHub_lmSettings: JSON.stringify(lm) });
  await goTutor(p);
  await tap(p, sel('aipick'));
  await tap(p, sel('aipick-prov', 'openrouter'));
  check('no catalog yet: a load button', await visible(p, sel('aipick-refresh')));
  await tap(p, sel('aipick-refresh'));
  await p.waitForTimeout(300);
  check('catalog loads into a searchable list', (await p.locator(sel('aipick-or')).count()) === 2);
  await p.locator(sel('aipick-search')).fill('llama');
  await p.waitForTimeout(100);
  check('search narrows it', (await p.locator(sel('aipick-or')).count()) === 1);
  let r = await send(p, 'Hi');
  check('Sonnet via OpenRouter: reasoning.effort "medium", 16k room', r.prov === 'openrouter' && r.body.reasoning && r.body.reasoning.effort === 'medium' && r.body.max_tokens === 16000, JSON.stringify(r.body.reasoning));
  await tap(p, sel('aipick-or', 'meta-llama/llama-3.3-70b-instruct'));
  check('picked model is saved', (await lmSaved(p)).openrouterModel === 'meta-llama/llama-3.3-70b-instruct');
  check('a model OpenRouter lists without reasoning: nothing to set', await visible(p, sel('effort-none')));
  r = await send(p, 'Hi');
  check('…and its request has no reasoning field', r.body.model === 'meta-llama/llama-3.3-70b-instruct' && r.body.reasoning === undefined);
  errCheck('D', errs);
  await ctx.close();
});

await block('E. Local: first switch lists the server\'s models and picks one', async () => {
  const lm = JSON.parse(LM_ALL); lm.effort = 'low';
  const { ctx, p, errs } = await open({ uroStudyHub_progress: PROG, uroStudyHub_lmSettings: JSON.stringify(lm) });
  await goTutor(p);
  await tap(p, sel('aipick'));
  await tap(p, sel('aipick-prov', 'lmstudio'));
  await p.waitForTimeout(300);
  const s = await lmSaved(p);
  check('no saved local model → fetched list, first one picked', s.provider === 'lmstudio' && s.localModel === 'gpt-oss-20b' && s.claudeModel === 'claude-opus-5-5', JSON.stringify({ local: s.localModel, claude: s.claudeModel }));
  check('local note shown', /Only some local models/.test(await p.locator(sel('aipick-panel')).innerText()));
  const r = await send(p, 'Hi');
  check('local request: reasoning_effort "low", max_tokens left alone', r.prov === 'lmstudio' && r.body.model === 'gpt-oss-20b' && r.body.reasoning_effort === 'low' && r.body.max_tokens === 4096, JSON.stringify({ m: r.body.model, e: r.body.reasoning_effort, t: r.body.max_tokens }));
  await tap(p, sel('aipick-prov', 'claude'));
  await tap(p, sel('aipick-prov', 'lmstudio'));
  check('switching back to Local keeps its model', (await lmSaved(p)).localModel === 'gpt-oss-20b' && /^Local · gpt-oss-20b/.test((await chip(p)).trim()), await chip(p));
  errCheck('E', errs);
  await ctx.close();
});

await block('F. Settings from the tutor, and the effort control in Settings', async () => {
  const { ctx, p, errs } = await open({ uroStudyHub_progress: PROG, uroStudyHub_lmSettings: LM_ALL });
  await goTutor(p);
  await tap(p, sel('aipick'));
  await tap(p, sel('aipick-prov', 'openrouter'));
  check('a provider with no key opens Settings on its tab, over the tutor', (await p.getByText('OpenRouter API Key').count()) > 0 && (await onTutor(p)));
  check('…without switching provider', (await lmSaved(p)).provider === 'claude');
  await p.locator('h2:has-text("AI Provider") + button').click();
  await p.waitForTimeout(200);
  check('closing Settings: still on the tutor with the panel open', (await onTutor(p)) && (await visible(p, sel('aipick-panel'))));
  await tap(p, sel('aipick-settings'));
  check('"All AI settings" opens on the connected provider', (await p.getByText('Anthropic API Key').count()) > 0);
  const box = p.locator(sel('set-effort'));
  check('Settings has the effort control', (await box.locator(sel('effort-opt')).count()) === 6);
  const scroller = 'h2:has-text("AI Provider") >> xpath=../..';
  // scroll the modal so the control sits mid-screen (a remount would put it back at the top)
  const top0 = await p.locator(scroller).evaluate((el, h) => { el.scrollTop = 0; const b = document.querySelector(h); el.scrollTop = b.getBoundingClientRect().top - el.getBoundingClientRect().top - 120; return el.scrollTop; }, sel('set-effort'));
  await box.locator(sel('effort-opt', 'low')).click();
  await p.waitForTimeout(250);
  const top1 = await p.locator(scroller).evaluate((el) => el.scrollTop);
  check('Low from Settings is saved', (await lmSaved(p)).effort === 'low');
  check('Settings didn\'t remount or jump to the top', top0 > 0 && Math.abs(top1 - top0) < 2 && (await box.locator(sel('effort-opt', 'low')).getAttribute('style')).indexOf('font-weight: 800') >= 0, top0 + ' → ' + top1);
  await shot(p, 'f1-settings-effort');
  await p.locator('h2:has-text("AI Provider") + button').click();
  await p.waitForTimeout(150);
  await tap(p, sel('aipick-prov', 'claude'));
  check('the tutor chip and panel show it', / · Low/.test(await chip(p)) && (await p.locator(sel('aipick-panel') + ' ' + sel('effort-opt', 'low')).getAttribute('style')).indexOf('font-weight: 800') >= 0);
  errCheck('F', errs);
  await ctx.close();
});

await browser.close();
console.log('\n' + nPass + ' passed, ' + nFail + ' failed');
process.exit(nFail ? 1 : 0);
