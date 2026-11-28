// Unit tests for the fixes from the 2026-11 outside review (pure code of UroStudyHub.html, run in Node):
// share codes found inside pasted text, lecture phase detection and the NEXT / SKIP command, Anki text-import fields,
// AnkiConnect answers, cleanMd's reference cutting and boilerplate lines, a cut-off JSON reply, per-plan topic keys and
// the local study day. Dependency-free:  node tools/review-fixes.test.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

process.env.TZ = "America/Chicago";  // the local-date checks below are written for US Central time
const HTML_PATH = fileURLToPath(new URL("../UroStudyHub.html", import.meta.url));
const src = fs.readFileSync(HTML_PATH, "utf8");

function grab(re, what) {
  const m = src.match(re);
  if (!m) { console.log("FAIL: can't find " + what + " in " + HTML_PATH); process.exit(1); }
  return m[1] !== undefined ? m[1] : m[0];
}
const block = grab(/^[ \t]*\/\/ REVIEW-HELPERS-BEGIN[^\n]*\n([\s\S]*?)^[ \t]*\/\/ REVIEW-HELPERS-END/m, "the REVIEW-HELPERS block");
const phases = grab(/^var LECTURE_PHASES = \[[\s\S]*?\n\];/m, "LECTURE_PHASES");
const flat = grab(/^function topicKeyOf[\s\S]*?\n  return flat;\n\}/m, "topicKeyOf / buildFlat");
const cut = grab(/^var AI_CUT_STOP = [^\n]*\n/m, "AI_CUT_STOP") + grab(/^function salvageJsonArray[\s\S]*?\n\}\n/m, "salvageJsonArray");
const days = grab(/^var ANKI_CFG = \{[\s\S]*?\n\};/m, "ANKI_CFG") + "\n" + grab(/^function ankiStudyDay[\s\S]*?\n\}\n/m, "ankiStudyDay")
  + grab(/^function ankiDayKey[^\n]*\n/m, "ankiDayKey") + grab(/^function studyToday[^\n]*\n/m, "studyToday") + grab(/^function localYmd[^\n]*\n/m, "localYmd")
  + grab(/^function iseYmd[^\n]*\n/m, "iseYmd");

const NAMES = ["findShareCode", "lecturePhaseOf", "isPhaseCommand", "ankiFieldHtml", "ankiConnectResult", "cleanMd", "topicKeyOf", "buildFlat",
  "AI_CUT_STOP", "salvageJsonArray", "studyToday", "localYmd", "LECTURE_PHASES"];
const H = new Function(phases + "\n" + block + "\n" + flat + "\n" + cut + "\n" + days + "\n;return {" + NAMES.map((n) => JSON.stringify(n) + ": typeof " + n + " === 'undefined' ? undefined : " + n).join(", ") + "};")();
for (const n of NAMES) { if (H[n] === undefined) { console.log("FAIL the page does not define " + n); process.exit(1); } }

let failed = 0, passed = 0;
function test(name, fn) {
  try { const note = fn(); passed++; console.log("PASS " + name + (note ? "  (" + note + ")" : "")); }
  catch (e) { failed++; console.log("FAIL " + name + "\n     " + String(e && e.message ? e.message : e).split("\n").join("\n     ")); }
}
const b64 = (o) => Buffer.from(JSON.stringify(o), "utf8").toString("base64");

// ---- share codes (B9)
test("share code: found after the share sheet's header and inside chat text", () => {
  const code = "URO:PACK:" + b64({ packs: [{ name: "Stones" }] });
  const shared = "📚 UroStudy — Card Packs\n\nPaste this code in UroStudy → Import:\n\n" + code;
  assert.deepEqual(H.findShareCode(shared), { type: "PACK", encoded: code.slice(9) });
  assert.equal(H.findShareCode("hey, here it is: " + code + " — sent from my phone").encoded, code.slice(9));
  assert.equal(H.findShareCode(code).type, "PACK");
  assert.equal(H.findShareCode("no code in here"), null);
  assert.equal(H.findShareCode(""), null);
  const back = JSON.parse(Buffer.from(H.findShareCode(shared).encoded, "base64").toString("utf8"));
  assert.equal(back.packs[0].name, "Stones");
});

// ---- lecture phase detection (B5)
const P = (t, strict) => H.lecturePhaseOf(t, strict);
test("phase: real headings still move the bar", () => {
  const cases = [
    ["🗺️ Phase 1, Big Picture. Picture a man who cannot pee.", 0],
    ["## Phase 1: Big Picture\n\nStub lecture reply. Type NEXT to continue.", 0],
    ["🏗️ Phase 2, Conceptual Framework. Think of the prostate as a donut.", 1],
    ["## 🔬 Phase 3: Core Details\n\nAlright, picture a 65M.", 2],
    ["🔬 CORE DETAILS I\n\nEpidemiology first.", 2],
    ["⚡ CHECKPOINT — 5 quick ones", 3],
    ["**💊 Phase 5: Core Details II**\n\nTreatment algorithms.", 4],
    ["Good answers.\n\n🔥 PIMP ROUND\n\nWhat's the blood supply of the ureter?", 5],
    ["🧠 Memory Anchors\n\nThree facts to lock in.", 6],
    ["📋 BOARD-STYLE QUESTIONS\n\nQuestion 1 of 5", 7],
    ["📄 RAPID REVIEW — BPH\n\n- Transition zone", 8],
    ["## 📄 Phase 9: Rapid Review\n\n- facts", 8],
    ["**📄 PHASE 9: RAPID REVIEW**", 8],
    ["Phase 9 📄 RAPID REVIEW", 8],
    ["Last stretch. 📄 Phase 9, Rapid Review.", 8],
    ["Phase 4:\n\n1. Name the zone.", 3],
    ["CHECKPOINT\n1. Where does BPH arise?", 3],
  ];
  for (const [t, want] of cases) assert.equal(P(t), want, JSON.stringify(t));
  return cases.length + " headings";
});
test("phase: words in passing don't (treatment, management, mnemonic, multiple choice, phase 3 trial)", () => {
  const cases = [
    "Treatment depends on the stage. First-line management is active surveillance.",
    "The MANAGEMENT of a 4 mm stone is observation with MET.",
    "A classic mnemonic is the 4 Ts. Want to build your own?",
    "On the boards this shows up as a multiple choice question about the first-line drug.",
    "The phase 3 trial (PROSPER) showed a metastasis-free survival benefit.",
    "Phase 3 trials of enzalutamide changed practice.",
    "In the CheckMate phase 3 study, nivolumab plus ipilimumab won.",
    "That's a deep dive topic for later; first, the anatomy.",
  ];
  for (const t of cases) assert.equal(P(t), -1, JSON.stringify(t));
  return cases.length + " replies";
});
test("phase: strict (voice) mode ignores name-only lines", () => {
  assert.equal(P("Checkpoint time? Not yet. Where does BPH grow?", true), -1);
  assert.equal(P("CHECKPOINT\n1. Where does BPH arise?", true), -1);
  assert.equal(P("⚡ Phase 4, Checkpoint. First one: where does BPH arise?", true), 3);
});
test("phase command: NEXT / SKIP only as commands", () => {
  for (const t of ["NEXT", "next", "Next!", " next please", "next phase", "SKIP", "skip this phase", "SKIP this phase and move to the next one."]) assert.ok(H.isPhaseCommand(t), t);
  for (const t of ["Next, explain the blood supply", "Next time can we go slower?", "next steps in management?", "Skipping a dose of tamsulosin is fine?", "skip to the part about stents?", "Nextstellar"]) assert.ok(!H.isPhaseCommand(t), t);
});

// ---- Anki text import (B7) and AnkiConnect answers (B8)
test("anki field: newlines become <br>, & < > \" escaped, tabs can't split the field", () => {
  assert.equal(H.ankiFieldHtml("PSA < 4 & rising\nnext line\r\nthird"), "PSA &lt; 4 &amp; rising<br>next line<br>third");
  assert.equal(H.ankiFieldHtml('say "hi"\tthere'), "say &quot;hi&quot; there");
  assert.equal(H.ankiFieldHtml("{{c1::Gleason}} > 7"), "{{c1::Gleason}} &gt; 7");
  assert.equal(H.ankiFieldHtml(null), "");
});
test("AnkiConnect: old-style nulls are duplicates; errors are failures, not duplicates", () => {
  assert.deepEqual(H.ankiConnectResult({ result: [1, null, 3], error: null }, 3), { added: 2, dupes: 1, failed: 0, error: "" });
  assert.deepEqual(H.ankiConnectResult({ result: null, error: "['cannot create note because it is a duplicate', 'cannot create note because it is a duplicate']" }, 2),
    { added: 0, dupes: 2, failed: 0, error: "" });
  const r = H.ankiConnectResult({ result: null, error: "deck was not found: Uro::BPH" }, 4);
  assert.equal(r.added, 0); assert.equal(r.failed, 4); assert.match(r.error, /deck was not found/);
  const m = H.ankiConnectResult({ result: [11, null], error: "['cannot create note because it is a duplicate', 'model was not found: Basic']" }, 3);
  assert.equal(m.added, 1); assert.ok(m.error); assert.equal(m.failed, 1);
  assert.equal(H.ankiConnectResult({}, 2).failed, 2);
});

// ---- cleanMd (B6)
test("cleanMd: a References section ends at the next heading of its level", () => {
  const md = ["# BPH", "", "Intro paragraph that is long enough to count as real content for the front-matter scan.", "",
    "## References", "1. Smith J. Some paper. J Urol 2020.", "### Journals", "2. Jones K. Another.",
    "## Medical Therapy", "Alpha-blockers first.", "## Disclosures", "None.", "# Next chapter", "Body."].join("\n");
  const out = H.cleanMd(md).text;
  assert.match(out, /## Medical Therapy\nAlpha-blockers first\./);
  assert.match(out, /# Next chapter\nBody\./);
  assert.doesNotMatch(out, /Smith J|Jones K|### Journals|None\./);
});
test("cleanMd: boilerplate lines need their date / identifier (Doing..., Received 6 units stay)", () => {
  const md = ["# Bleeding", "", "Doing a cystoscopy first is reasonable when the hematuria is painless and gross.",
    "Received 6 units of PRBCs before the angioembolization.", "Received: 3 March 2021", "Accepted 03/12/2020",
    "Published 2019.", "doi: 10.1016/j.juro.2020.01.001", "DOI 10.1097/JU.000", "PMID: 12345678",
    "Updated management favors embolization over open exploration in stable patients."].join("\n");
  const out = H.cleanMd(md).text;
  for (const keep of ["Doing a cystoscopy", "Received 6 units", "Updated management favors"]) assert.ok(out.indexOf(keep) >= 0, "kept: " + keep);
  for (const drop of ["3 March 2021", "03/12/2020", "Published 2019", "10.1016", "10.1097", "12345678"]) assert.ok(out.indexOf(drop) < 0, "dropped: " + drop);
});

// ---- cut-off replies (B4)
test("a reply stopped at the length limit counts as cut off; card JSON keeps its complete cards", () => {
  for (const s of ["length", "max_tokens", "MAX_TOKENS", "model_context_window_exceeded"]) assert.ok(H.AI_CUT_STOP.test(s), s);
  for (const s of ["stop", "end_turn", "", "tool_use", "refusal"]) assert.ok(!H.AI_CUT_STOP.test(s), JSON.stringify(s));
  assert.deepEqual(H.salvageJsonArray('[{"front":"a","back":"b"},{"front":"c","back":"d"},{"front":"e","ba'), [{ front: "a", back: "b" }, { front: "c", back: "d" }]);
  assert.deepEqual(H.salvageJsonArray('```json\n[{"type":"cloze","text":"{{c1::x}}"},'), [{ type: "cloze", text: "{{c1::x}}" }]);
  assert.equal(H.salvageJsonArray("not json at all"), null);
});

// ---- per-plan topic keys (B1)
test("topic keys: AUA Core keeps p-s-t (old ticks stay its own); Sub-I and custom plans get their own", () => {
  const ph = [{ name: "A", icon: "x", sections: [{ cat: "c", topics: ["t1", "t2"] }] }];
  assert.deepEqual(H.buildFlat(ph).map((f) => f.key), ["0-0-0", "0-0-1"]);
  assert.deepEqual(H.buildFlat(ph, "").map((f) => f.key), ["0-0-0", "0-0-1"]);
  assert.deepEqual(H.buildFlat(ph, "subi").map((f) => f.key), ["subi:0-0-0", "subi:0-0-1"]);
  assert.equal(H.buildFlat(ph, "custom_17").map((f) => f.key)[1], "custom_17:0-0-1");
  assert.equal(H.topicKeyOf("subi", 1, 2, 3), "subi:1-2-3");
});

// ---- local study day (B2)
test("study day: local, rolls over at 4am (US evening isn't tomorrow)", () => {
  const real = Date.now;
  try {
    Date.now = () => Date.parse("2026-11-28T01:30:00Z");  // 7:30 pm Nov 27 in Chicago (UTC is already Nov 28)
    assert.equal(H.studyToday(), "2026-11-27");
    Date.now = () => Date.parse("2026-11-28T09:30:00Z");  // 3:30 am Nov 28: still the Nov 27 study day
    assert.equal(H.studyToday(), "2026-11-27");
    Date.now = () => Date.parse("2026-11-28T10:30:00Z");  // 4:30 am Nov 28
    assert.equal(H.studyToday(), "2026-11-28");
  } finally { Date.now = real; }
  assert.equal(H.localYmd(new Date("2026-11-28T01:30:00Z")), "2026-11-27");  // a case at 7:30 pm is dated today
  assert.equal(H.localYmd(new Date("2026-11-28T09:30:00Z")), "2026-11-28");  // calendar date, no 4am rule
});

console.log("\n" + passed + " passed, " + failed + " failed (TZ=" + process.env.TZ + ")");
process.exit(failed ? 1 : 0);
