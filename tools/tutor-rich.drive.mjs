// Headless-Chrome drive of the tutor's rich replies (renderRich in UroStudyHub.html): markdown tables,
// **bold** / *italic* / # headings, ```mermaid flowcharts drawn by the app, ```chart line and bar charts,
// a Mermaid pie (becomes a bar chart), an unsupported Mermaid type (shown as source), and a streamed
// reply whose flowchart shows a placeholder until its closing fence arrives. The OpenAI endpoint is
// stubbed in the page (no key, no network): each prompt word below picks a canned reply.
//
// Run:   node tools/tutor-rich.drive.mjs
// Needs: a static server on the repo root (launch config "urostudyhub", or `python3 -m http.server 2043`)
//        and a built UroStudyHub.min.html (`python3 build.py`).
// Env:   URL=...      page to test (default http://localhost:2043/UroStudyHub.min.html)
//        CDN_DIR=...  a node_modules folder holding react@18.2.0, react-dom@18.2.0, @babel/standalone@7.23.9
//                     and katex@0.16.9 (for machines without internet; other external requests get a 404)
//        SHOTS=dir    save screenshots there (phone light + dark, desktop)
//        CHROME=...   a Chrome/Chromium binary instead of Playwright's own
// Prints PASS/FAIL per check; exits 1 when any check fails.
//
// Hooks used: [data-chat-msg], [data-rich-table], [data-flowchart], [data-flow-node=shape],
// [data-flow-label], [data-chart=line|bar], [data-chart-tip], [data-rich-pending].
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

// ── Canned replies, picked by a word in the learner's message ──
const R = {};
R.table = [
  '## Two roads to penile SCC',
  '',
  'Penile cancer comes from **two separate pathways**, and the marker tells you which one you are on:',
  '',
  '| | **HPV-associated road** | **Inflammation road** |',
  '|---|---|---|',
  '| Driver | HPV 16/18 (occasionally 31/33) | Chronic irritation: smegma, phimosis, lichen sclerosus (BXO), chronic balanoposthitis, tobacco |',
  '| Molecular lesion | E6 → degrades p53; E7 → inactivates Rb | *TP53* point mutations, direct DNA damage |',
  '| Precursor | HPV-associated PeIN (basaloid, warty) | Differentiated PeIN |',
  '| Histology | Basaloid, warty, "usual" mixed | Keratinizing, well-differentiated |',
  '| Marker | **p16 overexpression** (surrogate) | p16 negative |',
  '',
  '* Neonatal circumcision protects against the inflammation road.',
  'And the ratio stays plain: \\( FENa = \\frac{U_{Na} \\times P_{Cr}}{P_{Na} \\times U_{Cr}} \\times 100 \\) with **bold** around it.',
].join('\n');
R.roads = [
  'Here are the two roads as a flowchart:',
  '',
  '```mermaid',
  'flowchart TD',
  '  A1([HPV 16/18 infection]) --> B1[E6 degrades p53<br>E7 inactivates Rb]',
  '  B1 --> C1[HPV-associated PeIN: basaloid / warty]',
  '  C1 --> D1[Basaloid or warty SCC]',
  '  D1 --> E1([p16 positive])',
  '  A2(["Chronic inflammation: phimosis, lichen sclerosus (BXO), smegma"]) --> B2[TP53 point mutations]',
  '  B2 --> C2[Differentiated PeIN]',
  '  C2 --> D2[Keratinizing, well-differentiated SCC]',
  '  D2 --> E2([p16 negative])',
  '```',
  '',
  'The p16 stain at the bottom is the board question.',
].join('\n');
R.algo = [
  '```mermaid',
  'flowchart TD',
  '  %% workup',
  '  A([Microhematuria: 3+ RBC/HPF]) --> B{AUA risk group?}',
  '  B -->|Low| C[Repeat UA within 6 mo]',
  '  B -->|Intermediate| D[Cystoscopy + renal US]',
  '  B -->|High| E["Cystoscopy + CT urogram (or MR urogram)"]',
  '  C -- still positive --> D',
  '  C -->|negative| Z([Release])',
  '  D & E --> F{Findings?}',
  '  F -->|None| Z',
  '  F -->|Lesion| G[Treat the cause]',
  '  G -.->|follow-up| B',
  '  classDef hot fill:#f96',
  '  style G stroke:#333',
  '```',
].join('\n');
R.gem = [
  'Sure! Here is the algorithm:',
  '```mermaid',
  'graph LR',
  '    A[Hematuria (gross)] --> B{Age > 35?};',
  '    B -- Yes --> C[CT Urogram & Cystoscopy];',
  '    B -- No --> D(Renal US) --> E[Cystoscopy];',
  '    subgraph Workup',
  '      C',
  '      D',
  '    end',
  '    style A fill:#f9f,stroke:#333',
  '    click A callback',
  '```',
].join('\n');
R.line = [
  'Shape is the whole point here:',
  '```chart',
  '{"type":"line","title":"Uroflow curves (schematic)","x":"Time (s)","y":"Flow (mL/s)","series":[{"name":"Normal","points":[[0,0],[3,18],[6,24],[10,15],[14,3],[16,0]]},{"name":"Obstructed","points":[[0,0],[4,6],[10,8],[20,7],[30,3],[34,0]]},{"name":"Stricture","points":[[0,0],[2,9],[30,10],[38,0]],},],"marks":[{"y":15,"label":"Qmax 15 mL/s"}]}',
  '```',
].join('\n');
R.kin = [
  '```chart',
  '{"type":"line","title":"PSA after prostatectomy (schematic)","x":"Months","y":"PSA (ng/mL)","series":[{"name":"After RP","points":[[0,0.05],[6,0.05],[12,0.05],[18,0.05],[24,0.06]]},{"name":"Recurrence","points":[[0,0.05],[6,0.1],[12,0.2],[18,0.4],[24,0.8]]}],"marks":[{"y":0.2,"label":"BCR 0.2"}]}',
  '```',
].join('\n');
R.bar = [
  '```chart',
  '// comment lines are dropped',
  '{"type":"bar","title":"Made-up numbers (test)","y":"Rate (%)","labels":["Stage one","Stage two","Stage three"],"series":[{"name":"Group A","values":[80,55,20]},{"name":"Group B","values":[70,40,-5]}]}',
  '```',
].join('\n');
R.pie = ['```mermaid', 'pie title Stone composition (test)', '  "Calcium oxalate" : 70', '  "Uric acid" : 10', '  "Struvite" : 10', '  "Cystine" : 2', '```'].join('\n');
R.seq = ['```mermaid', 'sequenceDiagram', '  A->>B: hello', '```', '', '```js', 'var x = 1;', '```'].join('\n');
R.stream = ['First the words.', '', '```mermaid', 'flowchart TD', '  A[Start here] --> B{Decide?}', '  B -->|Yes| C[Go]', '  B -->|No| D[Stop]', '```', '', 'Then more words.'].join('\n');
const HOLD_AT = R.stream.indexOf('```\n\nThen');  // the stream pauses just before the closing fence

function pageInit(arg) {
  try {
    if (!localStorage.getItem('__richSeeded')) {
      Object.keys(arg.seed).forEach(function (k) { localStorage.setItem(k, arg.seed[k]); });
      localStorage.setItem('__richSeeded', '1');
    }
  } catch (e) { /* ignore */ }
  window.__reqs = [];
  var release = null;
  window.__held = false;
  window.__release = function () { if (release) release(); };
  var realFetch = window.fetch.bind(window);
  window.fetch = function (u, o) {
    var url = typeof u === 'string' ? u : (u && u.url) || String(u);
    if (!/api\.openai\.com\/v1\/chat\/completions/.test(url)) return realFetch(u, o);
    var body = null;
    try { body = JSON.parse(o.body); } catch (e) { body = null; }
    window.__reqs.push(body);
    var last = body && body.messages ? body.messages[body.messages.length - 1].content : '';
    var key = Object.keys(arg.replies).filter(function (k) { return last.indexOf('[' + k + ']') !== -1; })[0] || 'table';
    var text = arg.replies[key];
    if (!body || !body.stream) {
      return Promise.resolve(new Response(JSON.stringify({ choices: [{ message: { content: text } }], usage: { prompt_tokens: 10, completion_tokens: 5 } }), { status: 200, headers: { 'content-type': 'application/json' } }));
    }
    var enc = new TextEncoder();
    function sse(piece) { return enc.encode('data: ' + JSON.stringify({ choices: [{ delta: { content: piece } }] }) + '\n\n'); }
    var hold = key === 'stream' ? arg.holdAt : -1;
    var stream = new ReadableStream({
      start: function (ctl) {
        var parts = [];
        for (var i = 0; i < text.length; i += 40) parts.push([i, text.slice(i, i + 40)]);
        var k = 0;
        function next() {
          if (k >= parts.length) { ctl.enqueue(enc.encode('data: [DONE]\n\n')); ctl.close(); return; }
          var pr = parts[k];
          if (hold >= 0 && pr[0] + pr[1].length > hold && !window.__held) {
            var cut = hold - pr[0];
            if (cut > 0) ctl.enqueue(sse(pr[1].slice(0, cut)));
            parts[k] = [hold, pr[1].slice(cut)];
            window.__held = true;
            release = function () { release = null; setTimeout(next, 10); };
            return;
          }
          ctl.enqueue(sse(pr[1]));
          k++;
          setTimeout(next, 15);
        }
        next();
      },
    });
    return Promise.resolve(new Response(stream, { status: 200, headers: { 'content-type': 'text/event-stream' } }));
  };
}

const KNOWN_HARMLESS = [/exceeds the max of 500KB/i, /ERR_CONNECTION_REFUSED/, /localhost:1234/];
const PROG = JSON.stringify({ role: 'resident', lastLoginDate: new Date().toISOString().slice(0, 10) });
const LM = JSON.stringify({ ep: 'http://localhost:1234', provider: 'openai', model: 'gpt-4o', openaiKey: 'sk-test', openaiModel: 'gpt-4o' });

async function open(viewport, mode) {
  const mobile = viewport.width < 600;
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: SHOTS ? 2 : 1, isMobile: mobile, hasTouch: mobile });
  const seed = { uroStudyHub_progress: PROG, uroStudyHub_lmSettings: LM, uroStudyHub_mode: mode || 'light' };
  await ctx.addInitScript(pageInit, { seed, replies: R, holdAt: HOLD_AT });
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
  const ok = await p.evaluate(() => {
    const b = [...document.querySelectorAll('button[data-nav="chat"]')].find((x) => x.getClientRects().length);
    if (b) { b.click(); return true; } return false;
  });
  if (!ok) throw new Error('no Tutor tab');
  await p.waitForFunction(() => [...document.querySelectorAll('h1')].some((h) => /AI Tutor/.test(h.textContent)), null, { timeout: 5000 });
  await p.waitForTimeout(200);
  // The full app opens "AI off" and sends nothing until a model is connected: connect the saved OpenAI key
  await p.locator('[data-aipick]').click();
  await p.locator('[data-aipick-prov="openai"]').click();
  await p.locator('[data-aipick]').click();
  await p.waitForTimeout(150);
  return { ctx, p, errs };
}
const errCheck = (label, errs) => { check('no console errors · ' + label, errs.length === 0, errs.slice(0, 3).join(' | ')); errs.length = 0; };
const shot = async (p, name, sel) => {
  if (!SHOTS) return;
  if (sel) await p.locator(sel).last().screenshot({ path: join(SHOTS, name + '.png') });
  else await p.screenshot({ path: join(SHOTS, name + '.png') });
};
// Send a message; wait until the newest assistant bubble holds `sel` (or just appears).
async function ask(p, word, sel) {
  const n0 = await p.locator('[data-chat-msg]').count();
  const inp = p.locator('input[placeholder^="Ask about any urology topic"]').first();
  await inp.fill('Show me [' + word + ']');
  await inp.press('Enter');
  await p.waitForFunction((n) => document.querySelectorAll('[data-chat-msg]').length >= n + 2, n0, { timeout: 8000 });
  if (sel) await p.waitForFunction((s) => { const m = [...document.querySelectorAll('[data-chat-msg]')].pop(); return m && m.querySelector(s); }, sel, { timeout: 8000 });
  await p.waitForTimeout(300);
  return p.locator('[data-chat-msg]').last();
}
// Rectangles of the boxes / labels in the last flowchart, relative to its drawing.
async function flowGeom(p) {
  return p.evaluate(() => {
    const fc = [...document.querySelectorAll('[data-flowchart]')].pop();
    const r = (el) => { const b = el.getBoundingClientRect(); return { l: b.left, t: b.top, r: b.right, b: b.bottom, txt: el.textContent }; };
    const scroller = fc.children[fc.children.length - 3] && fc.querySelector('div[style*="overflow-x"]');
    return {
      nodes: [...fc.querySelectorAll('[data-flow-node]')].map((el) => Object.assign(r(el), { shape: el.getAttribute('data-flow-node') })),
      labels: [...fc.querySelectorAll('[data-flow-label]')].map(r),
      paths: fc.querySelectorAll('svg path').length,
      heads: fc.querySelectorAll('svg polygon').length,
      box: r(fc),
      scrollW: scroller ? scroller.scrollWidth : 0, clientW: scroller ? scroller.clientWidth : 0,
    };
  });
}
const overlap = (a, b, pad) => a.l < b.r - pad && b.l < a.r - pad && a.t < b.b - pad && b.t < a.b - pad;
function noOverlaps(list, pad) {
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) if (overlap(list[i], list[j], pad)) return list[i].txt + ' × ' + list[j].txt;
  return '';
}

const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});

await block('A. Phone, light: prompt, table, inline markdown', async () => {
  const { ctx, p, errs } = await open({ width: 412, height: 860 }, 'light');
  errCheck('boot', errs);
  const msg = await ask(p, 'table', '[data-rich-table]');
  const req = await p.evaluate(() => window.__reqs[window.__reqs.length - 1]);
  const sys = req && req.messages && req.messages[0] && req.messages[0].content || '';
  check('tutor prompt teaches the formats', /DIAGRAMS & TABLES/.test(sys) && /```mermaid\nflowchart TD/.test(sys) && /```chart/.test(sys));
  const t = await msg.evaluate((m) => {
    const tb = m.querySelector('[data-rich-table] table');
    return {
      th: tb.querySelectorAll('thead th').length, rows: tb.querySelectorAll('tbody tr').length,
      firstColBold: getComputedStyle(tb.querySelector('tbody td')).fontWeight,
      strongInTable: tb.querySelectorAll('strong').length, em: [...m.querySelectorAll('em')].map((e) => e.textContent),
      text: m.innerText, heading: [...m.querySelectorAll('div')].some((d) => d.textContent === 'Two roads to penile SCC' && +getComputedStyle(d).fontWeight >= 700),
      katex: m.querySelectorAll('.katex').length, bubbleW: m.getBoundingClientRect().width, tableW: tb.getBoundingClientRect().width,
      paneW: (function (el) { const cs = getComputedStyle(el); return el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight); })(m.parentElement),
    };
  });
  check('table: 3 header cells, 5 rows', t.th === 3 && t.rows === 5, t.th + ' / ' + t.rows);
  check('empty corner cell → first column bold', +t.firstColBold >= 700, t.firstColBold);
  check('**bold** inside cells', t.strongInTable >= 3, String(t.strongInTable));
  check('*TP53* in italics', t.em.indexOf('TP53') !== -1, t.em.join(','));
  check('no raw pipes or asterisks left', !/\|/.test(t.text) && !/\*/.test(t.text), t.text.match(/.{0,20}[|*].{0,20}/) ? t.text.match(/.{0,20}[|*].{0,20}/)[0] : '');
  check('"## heading" → bold line', t.heading);
  check('"* item" → bullet', /• Neonatal circumcision/.test(t.text));
  check('math still typeset next to bold', t.katex === 1, String(t.katex));
  check('table fits the bubble, and the bubble takes the full width', t.tableW <= t.bubbleW && t.bubbleW >= t.paneW - 40, Math.round(t.tableW) + ' ≤ ' + Math.round(t.bubbleW) + ' of ' + Math.round(t.paneW));
  await shot(p, 'phone-table', '[data-chat-msg]');
  errCheck('table', errs);

  // Two parallel roads
  await ask(p, 'roads', '[data-flowchart] [data-flow-node]');
  let g = await flowGeom(p);
  check('roads: 10 boxes, 8 arrows', g.nodes.length === 10 && g.paths === 8 && g.heads === 8, g.nodes.length + ' boxes, ' + g.paths + ' paths, ' + g.heads + ' heads');
  check('roads: no boxes overlap', !noOverlaps(g.nodes, 1), noOverlaps(g.nodes, 1));
  const byTxt = (s) => g.nodes.find((n) => n.txt.indexOf(s) !== -1);
  const a1 = byTxt('HPV 16/18'), e1 = byTxt('p16 positive'), a2 = byTxt('Chronic inflammation'), e2 = byTxt('p16 negative');
  check('roads: two columns side by side', a1 && a2 && e1 && e2 && a1.r <= a2.l && e1.r <= e2.l, a1 && a2 ? Math.round(a1.r) + ' ≤ ' + Math.round(a2.l) : 'missing');
  check('roads: each chain reads top → bottom', a1.b < byTxt('E6 degrades').t && byTxt('Differentiated PeIN').b < byTxt('Keratinizing').t);
  check('roads: <br> becomes a line break', /p53\s*E7/.test(byTxt('E6 degrades').txt) && byTxt('E6 degrades').b - byTxt('E6 degrades').t > 30);
  check('roads: fits a phone without sideways scroll', g.scrollW <= g.clientW + 1, g.scrollW + ' / ' + g.clientW);
  check('roads: quoted label with parentheses', !!byTxt('lichen sclerosus (BXO)'));
  check('roads: start/end shapes are pills', g.nodes.filter((n) => n.shape === 'pill').length === 4);
  await shot(p, 'phone-roads', '[data-chat-msg]');

  // Algorithm: decisions, edge labels, a merge, a long edge, a loop back, ignored style lines
  await ask(p, 'algo', '[data-flowchart] [data-flow-node]');
  g = await flowGeom(p);
  check('algo: 8 boxes (style / classDef / %% ignored)', g.nodes.length === 8, g.nodes.map((n) => n.txt).join(' | '));
  check('algo: two decisions drawn as decisions', g.nodes.filter((n) => n.shape === 'decision').length === 2);
  check('algo: 11 edges (D & E fan in), 11 arrowheads', g.paths === 11 && g.heads === 11, g.paths + ' / ' + g.heads);
  check('algo: 8 edge labels incl. "-- text -->"', g.labels.length === 8 && g.labels.some((l) => /still positive/.test(l.txt)), g.labels.map((l) => l.txt).join(','));
  check('algo: no boxes overlap', !noOverlaps(g.nodes, 1), noOverlaps(g.nodes, 1));
  const lab = g.labels.find((l) => g.nodes.some((n) => overlap(l, n, 2)));
  check('algo: no edge label sits on a box', !lab, lab ? lab.txt : '');
  check('algo: no two edge labels overlap', !noOverlaps(g.labels, 0), noOverlaps(g.labels, 0));
  const B = g.nodes.find((n) => /AUA risk/.test(n.txt)), Z = g.nodes.find((n) => /Release/.test(n.txt)), G = g.nodes.find((n) => /Treat the cause/.test(n.txt));
  check('algo: the loop-back target stays above, release at the bottom', B.b < G.t && Z.t > B.b, '');
  await shot(p, 'phone-algo', '[data-chat-msg]');

  // A Gemini-style block: graph LR, parentheses inside [ ], "-- text -->", semicolons, chained links, subgraph, style, click
  await ask(p, 'gem', '[data-flowchart] [data-flow-node]');
  const gg = await flowGeom(p);
  check('gemini-style: 5 boxes, 4 edges, 2 labels; drawn top-down anyway', gg.nodes.length === 5 && gg.paths === 4 && gg.labels.map((l) => l.txt).join() === 'Yes,No' && gg.nodes[0].b < gg.nodes[1].t, gg.nodes.map((n) => n.txt).join(' | ') + ' / ' + gg.paths);
  check('gemini-style: "(gross)" kept inside its box', gg.nodes.some((n) => n.txt === 'Hematuria (gross)'));
  await shot(p, 'phone-gem', '[data-chat-msg]');
  await p.evaluate(() => { const m = [...document.querySelectorAll('[data-chat-msg]')]; m[m.length - 3].querySelector('button[title="Bookmark this response"]').click(); });
  await p.waitForTimeout(150);

  // Bookmarked replies draw the same way in 📚 Saved
  await p.evaluate(() => { const tb = document.querySelector('[data-tools-btn]'); if (tb) tb.click(); });  // phones: Saved is in the Tools sheet
  await p.waitForTimeout(150);
  await p.evaluate(() => { [...document.querySelectorAll('button')].find((b) => /(^|\s)Saved( \(\d+\))?$/.test(b.textContent.trim()) && b.getClientRects().length).click(); });
  await p.waitForTimeout(300);
  await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => /Show more/.test(x.textContent)); if (b) b.click(); });
  await p.waitForFunction(() => document.querySelectorAll('[data-flowchart] [data-flow-node]').length === 8 && !document.querySelector('[data-chat-msg]'), null, { timeout: 5000 });
  const sg = await flowGeom(p);
  check('bookmark in 📚 Saved: the flowchart draws there too', sg.nodes.length === 8 && !noOverlaps(sg.nodes, 1), sg.nodes.length + ' boxes');
  await shot(p, 'phone-saved', '[data-flowchart]');
  await p.evaluate(() => { const tb = document.querySelector('[data-tools-btn]'); if (tb) tb.click(); });  // phones: Saved is in the Tools sheet
  await p.waitForTimeout(150);
  await p.evaluate(() => { [...document.querySelectorAll('button')].find((b) => /(^|\s)Saved( \(\d+\))?$/.test(b.textContent.trim()) && b.getClientRects().length).click(); });
  await p.waitForSelector('[data-chat-msg]', { timeout: 5000 });
  errCheck('flowcharts', errs);

  // Charts
  const lm = await ask(p, 'line', '[data-chart="line"] svg path');
  const c = await lm.evaluate((m) => {
    const ch = m.querySelector('[data-chart]');
    const paths = [...ch.querySelectorAll('svg path')].filter((x) => getComputedStyle(x).fill === 'none');
    return { lines: paths.length, dashes: paths.map((x) => getComputedStyle(x).strokeDasharray), legend: ch.querySelectorAll('div > span > svg').length,
      text: ch.innerText, svgText: [...ch.querySelectorAll('svg text')].map((x) => x.textContent) };
  });
  check('line chart: 3 series lines (trailing commas tolerated)', c.lines === 3, String(c.lines));
  check('line chart: each series has its own dash pattern', new Set(c.dashes).size === 3, c.dashes.join(' | '));
  check('line chart: legend for 3 series', c.legend === 3, String(c.legend));
  check('line chart: reference mark + axis titles', ['Qmax 15 mL/s', 'Flow (mL/s)', 'Time (s)'].every((s) => c.svgText.indexOf(s) !== -1), c.svgText.join(','));
  check('line chart: curves that all end at 0 → names in the legend only, not heaped at the end', ['Normal', 'Obstructed', 'Stricture'].every((s) => c.svgText.indexOf(s) === -1 && c.text.indexOf(s) !== -1));
  const over = lm.locator('[data-chart] svg rect').last();
  await over.scrollIntoViewIfNeeded();
  const rect = await over.boundingBox();
  await over.click({ position: { x: rect.width * 0.2, y: rect.height / 2 } });
  await p.waitForTimeout(150);
  const tip = await lm.locator('[data-chart-tip]').innerText().catch(() => '');
  check('tap on the plot → values at that time', /Normal/.test(tip) && /\d/.test(tip), tip.replace(/\n/g, ' '));
  await lm.locator('button', { hasText: 'data' }).click();
  check('"data" shows the numbers as a table', (await lm.locator('[data-chart] table tbody tr').count()) > 5);
  await shot(p, 'phone-line', '[data-chat-msg]');

  const km = await ask(p, 'kin', '[data-chart="line"] svg path');
  const kt = await km.evaluate((m) => [...m.querySelector('[data-chart]').querySelectorAll('svg text')].map((x) => x.textContent));
  check('line chart: ends apart → each line named at its end', ['After RP', 'Recurrence'].every((s) => kt.indexOf(s) !== -1), kt.join(','));
  await shot(p, 'phone-kin', '[data-chat-msg]');

  const bm = await ask(p, 'bar', '[data-chart="bar"] svg path');
  const b = await bm.evaluate((m) => { const ch = m.querySelector('[data-chart]'); return { bars: [...ch.querySelectorAll('svg g > path')].filter((x) => !/url/.test(getComputedStyle(x).fill)).length, text: [...ch.querySelectorAll('svg text')].map((x) => x.textContent).join(',') }; });
  check('bar chart: 6 bars (negative value included)', b.bars === 6, String(b.bars));
  check('bar chart: values on the caps, two-word labels wrap', /80/.test(b.text) && /-5/.test(b.text) && /Stage/.test(b.text), b.text);
  await shot(p, 'phone-bar', '[data-chat-msg]');

  const pm = await ask(p, 'pie', '[data-chart="bar"]');
  check('mermaid pie → bar chart', /Stone composition/.test(await pm.innerText()) && (await pm.locator('[data-chart="bar"] svg path').count()) >= 4);
  const sm = await ask(p, 'seq', 'pre');
  const st = await sm.innerText();
  check('other mermaid types → source with a note; code fences → code', /isn't drawn in the app/.test(st) && /sequenceDiagram/.test(st) && /var x = 1;/.test(st) && (await sm.locator('pre').count()) === 2);
  errCheck('charts', errs);
  await ctx.close();
});

await block('B. Streaming: the flowchart waits for its closing fence', async () => {
  const { ctx, p, errs } = await open({ width: 412, height: 860 }, 'dark');
  const n0 = await p.locator('[data-chat-msg]').count();
  const inp = p.locator('input[placeholder^="Ask about any urology topic"]').first();
  await inp.fill('Show me [stream]');
  await inp.press('Enter');
  await p.waitForFunction(() => window.__held === true, null, { timeout: 8000 });
  await p.waitForTimeout(300);
  const mid = p.locator('[data-chat-msg]').last();
  check('mid-stream: placeholder, not half a chart', (await mid.locator('[data-rich-pending]').count()) === 1 && (await mid.locator('[data-flowchart]').count()) === 0);
  check('mid-stream: no raw mermaid source on screen', !/flowchart TD/.test(await mid.innerText()));
  await p.evaluate(() => window.__release());
  await p.waitForFunction(() => { const m = [...document.querySelectorAll('[data-chat-msg]')].pop(); return m && m.querySelector('[data-flow-node]') && /Then more words/.test(m.textContent); }, null, { timeout: 8000 });
  await p.waitForTimeout(300);
  const g = await flowGeom(p);
  check('after the fence: the flowchart draws', g.nodes.length === 4 && g.labels.length === 2, g.nodes.length + ' boxes');
  check('dark mode: boxes use the card colour', await p.locator('[data-flow-node="rect"]').first().evaluate((el) => getComputedStyle(el).backgroundColor !== 'rgb(255, 255, 255)'));
  check('messages: ' + n0 + ' → ' + (await p.locator('[data-chat-msg]').count()), true);
  await shot(p, 'phone-dark-stream', '[data-chat-msg]');
  const lm = await ask(p, 'line', '[data-chart="line"] svg path');
  await shot(p, 'phone-dark-line', '[data-chat-msg]');
  check('dark chart drawn', (await lm.locator('[data-chart] svg path').count()) >= 3);
  errCheck('stream', errs);
  await ctx.close();
});

await block('C. Desktop width: wide layout, still no overlaps', async () => {
  const { ctx, p, errs } = await open({ width: 1280, height: 900 }, 'light');
  await ask(p, 'algo', '[data-flowchart] [data-flow-node]');
  const g = await flowGeom(p);
  check('desktop algo: no boxes overlap', !noOverlaps(g.nodes, 1), noOverlaps(g.nodes, 1));
  check('desktop algo: no two edge labels overlap', !noOverlaps(g.labels, 0), noOverlaps(g.labels, 0));
  check('desktop algo: no sideways scroll', g.scrollW <= g.clientW + 1, g.scrollW + ' / ' + g.clientW);
  await shot(p, 'desktop-algo', '[data-chat-msg]');
  await ask(p, 'roads', '[data-flowchart] [data-flow-node]');
  await shot(p, 'desktop-roads', '[data-chat-msg]');
  // Resize to phone: the drawing re-lays itself out
  await p.setViewportSize({ width: 412, height: 860 });
  await p.waitForTimeout(500);
  const g2 = await flowGeom(p);
  check('resize to phone: re-laid out, no overlaps', g2.nodes.length === 10 && !noOverlaps(g2.nodes, 1) && g2.scrollW <= g2.clientW + 1, g2.scrollW + ' / ' + g2.clientW);
  errCheck('desktop', errs);
  await ctx.close();
});

await browser.close();
console.log('\n' + nPass + ' passed, ' + nFail + ' failed');
process.exit(nFail ? 1 : 0);
