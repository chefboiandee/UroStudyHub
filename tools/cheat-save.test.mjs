// Unit tests for the Rapid Review cheat-sheet auto-save helpers (the CHEAT block of UroStudyHub.html):
// what counts as the phase-9 cheat sheet, how it is filed (no duplicates, regenerate), and what the Saved page lists.
// Dependency-free:  node tools/cheat-save.test.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const HTML_PATH = fileURLToPath(new URL("../UroStudyHub.html", import.meta.url));
const src = fs.readFileSync(HTML_PATH, "utf8");
const m = src.match(/^[ \t]*\/\/ CHEAT-BEGIN[^\n]*\n([\s\S]*?)^[ \t]*\/\/ CHEAT-END/m);
if (!m) { console.log("FAIL: no CHEAT-BEGIN / CHEAT-END block in " + HTML_PATH); process.exit(1); }
const NAMES = ["isRapidReview", "isCheatItem", "savedHas", "cheatAdd", "cheatDropAuto", "savedView", "savedCounts"];
const C = new Function(m[1] + "\n;return {" + NAMES.map((n) => JSON.stringify(n) + ": typeof " + n + " === 'undefined' ? undefined : " + n).join(", ") + "};")();
for (const n of NAMES) { if (C[n] === undefined) { console.log("FAIL block does not define " + n); process.exit(1); } }

let failed = 0, passed = 0;
function test(name, fn) {
  try { const note = fn(); passed++; console.log("PASS " + name + (note ? "  (" + note + ")" : "")); }
  catch (e) { failed++; console.log("FAIL " + name + "\n     " + String(e && e.message ? e.message : e).split("\n").join("\n     ")); }
}

const BODY = [
  "**Key facts**",
  "- Transition zone grows; PSA > 1.5 ng/mL and volume > 30 mL predict progression.",
  "- Alpha-blockers: fast, no change in volume. 5-ARIs: halve PSA, shrink gland over 6 months.",
  "**Surgery**",
  "- TURP: hyponatremia (TUR syndrome) from glycine; Qmax > 15 mL/s argues against obstruction.",
].join("\n");
const sheet = (head) => head + "\n\n" + BODY;

// ---- what counts as the cheat sheet ----
test("the lecture's phase-9 heading, in the usual spellings, is a cheat sheet", () => {
  for (const head of ["📄 RAPID REVIEW", "📄 Rapid Review — BPH", "## 📄 Rapid Review", "**📄 PHASE 9: RAPID REVIEW**", "Phase 9 📄 RAPID REVIEW",
    "📄 ONE-PAGE SUMMARY", "# One-Page Summary: BPH", "📄 Cheat Sheet", "Rapid-Review time", "> 📄 Phase 9"]) {
    assert.ok(C.isRapidReview(sheet(head)), JSON.stringify(head));
  }
});
test("a heading after a sentence or two still counts (the emoji marks it)", () => {
  assert.ok(C.isRapidReview(sheet("Nice work on the board questions.\n\n📄 RAPID REVIEW")));
  assert.ok(C.isRapidReview(sheet("Last stretch. 📄 Phase 9, Rapid Review.")));
  assert.ok(C.isRapidReview(sheet("Great.\n\nRapid review:")));
});
test("voice mode: spoken opener, then the sheet after ON SCREEN:", () => {
  const v = "📄 Phase 9, Rapid Review. Here's the one-pager: the big three are on screen, and say the first one back to me.\n\nON SCREEN:\n" + BODY;
  assert.ok(C.isRapidReview(v));
});
test("other phases are not: the tail of phase 8, board questions, an ordinary answer", () => {
  const board = "📋 BOARD-STYLE QUESTIONS\n\nQuestion 5. A 68-year-old man with LUTS and a 90 g prostate asks about options. " + BODY + "\n\nCorrect: B. Type or tap NEXT for the rapid review.";
  assert.ok(!C.isRapidReview(board), "phase 8 tail");
  assert.ok(!C.isRapidReview("🗺️ BIG PICTURE\n\n" + BODY + "\n\nBy the end you'll have a rapid review sheet."), "big picture");
  assert.ok(!C.isRapidReview("Right, the transition zone. " + BODY + "\n\nThat matters for management later."), "plain reply");
});
test("a short mention of the rapid review is not a sheet", () => {
  assert.ok(!C.isRapidReview("📄 Rapid Review next. Ready?"));
  assert.ok(!C.isRapidReview(""));
  assert.ok(!C.isRapidReview(undefined));
  assert.ok(!C.isRapidReview(null));
  assert.ok(!C.isRapidReview(42));
});
test("the heading has to be at the top, not buried deep in the text", () => {
  assert.ok(!C.isRapidReview("A".repeat(400) + "\n📄 RAPID REVIEW\n" + BODY));
});

// ---- filing it ----
const NOW = "2026-11-16T12:00:00.000Z";
test("cheatAdd files it as a marked bookmark, leaving the list alone otherwise", () => {
  const list = [{ id: 1, type: "session", topic: "BPH", messages: [] }];
  const out = C.cheatAdd(list, "BPH", sheet("📄 RAPID REVIEW"), 7, NOW);
  assert.equal(out.length, 2);
  assert.notEqual(out, list); assert.equal(list.length, 1);   // a new array, the old one untouched
  const it = out[1];
  assert.deepEqual([it.id, it.type, it.topic, it.phase, it.role, it.date, it.auto, it.cheat], [7, "bookmark", "BPH", "One-Page Summary", "assistant", NOW, true, true]);
  assert.equal(it.content, sheet("📄 RAPID REVIEW"));
});
test("no topic → a generic one; works on a missing list", () => {
  assert.equal(C.cheatAdd(undefined, "", sheet("📄 RAPID REVIEW"), 1, NOW)[0].topic, "Lecture");
});
test("the same sheet isn't filed twice, whether auto-saved or bookmarked by hand", () => {
  const text = sheet("📄 RAPID REVIEW");
  const once = C.cheatAdd([], "BPH", text, 1, NOW);
  assert.equal(C.cheatAdd(once, "BPH", text, 2, NOW), once, "auto then auto");
  const byHand = [{ id: 3, type: "bookmark", topic: "BPH", phase: "One-Page Summary", content: text + "\n", role: "assistant" }];
  assert.equal(C.cheatAdd(byHand, "BPH", text, 4, NOW), byHand, "by hand first (trailing whitespace ignored)");
  assert.ok(C.savedHas(once, text) && C.savedHas(byHand, text) && !C.savedHas(once, text + " more"));
});
test("a different sheet for the same topic is kept next to the first", () => {
  const a = C.cheatAdd([], "BPH", sheet("📄 RAPID REVIEW"), 1, NOW);
  const b = C.cheatAdd(a, "BPH", sheet("📄 RAPID REVIEW") + "\n- one more fact", 2, NOW);
  assert.equal(b.length, 2);
});
test("a saved session with the same text is not a bookmark of it", () => {
  const text = sheet("📄 RAPID REVIEW");
  const list = [{ id: 1, type: "session", topic: "BPH", content: text }];
  assert.ok(!C.savedHas(list, text));
  assert.equal(C.cheatAdd(list, "BPH", text, 2, NOW).length, 2);
});
test("regenerating drops the auto-saved copy only, never a hand-saved one", () => {
  const text = sheet("📄 RAPID REVIEW");
  const list = [
    { id: 1, type: "bookmark", topic: "BPH", content: text, auto: true, cheat: true },
    { id: 2, type: "bookmark", topic: "BPH", content: text, phase: "One-Page Summary" },
    { id: 3, type: "bookmark", topic: "BPH", content: "something else", auto: true, cheat: true },
  ];
  const out = C.cheatDropAuto(list, text);
  assert.deepEqual(out.map((l) => l.id), [2, 3]);
  assert.deepEqual(C.cheatDropAuto([], text), []);
  assert.deepEqual(C.cheatDropAuto(undefined, text), []);
});

// ---- the Saved page ----
const text = (t) => sheet("📄 RAPID REVIEW — " + t);
const LIST = [
  { id: 1, type: "session", topic: "Stones", messages: [{ role: "user", content: "hi" }] },
  { id: 2, type: "bookmark", topic: "Zeta lecture", phase: "One-Page Summary", content: text("Zeta"), auto: true, cheat: true },   // auto
  { id: 3, type: "bookmark", topic: "Stones", phase: "Core Details I", content: "Struvite needs urease-splitting bacteria." },   // plain bookmark
  { id: 4, type: "bookmark", topic: "Alpha lecture", phase: "One-Page Summary", content: "short note a user saved from phase 9" },   // by hand, labelled
  { id: 5, type: "bookmark", topic: "Mid", phase: "", content: text("Mid") },   // by hand, no label, reads like a sheet
  { id: 6, type: "bookmark", topic: "Alpha lecture", phase: "One-Page Summary", content: text("Alpha 2"), auto: true, cheat: true },
];
test("isCheatItem: marked, labelled or sheet-like bookmarks; never sessions or plain bookmarks", () => {
  assert.deepEqual(LIST.map((l) => C.isCheatItem(l)), [false, true, false, true, true, true]);
  assert.ok(!C.isCheatItem(null) && !C.isCheatItem({}));
});
test("counts add up: cheat + sessions + other bookmarks = all", () => {
  assert.deepEqual(C.savedCounts(LIST), { all: 6, cheat: 4, session: 1, bookmark: 1 });
  assert.deepEqual(C.savedCounts(undefined), { all: 0, cheat: 0, session: 0, bookmark: 0 });
});
test("all: everything, newest (last added) first", () => {
  assert.deepEqual(C.savedView(LIST, "all", "").map((l) => l.id), [6, 5, 4, 3, 2, 1]);
});
test("cheat: only the sheets, A to Z by topic, newest first within a topic", () => {
  assert.deepEqual(C.savedView(LIST, "cheat", "").map((l) => l.id), [6, 4, 5, 2]);
});
test("sessions / bookmarks filters are the other two slices", () => {
  assert.deepEqual(C.savedView(LIST, "session", "").map((l) => l.id), [1]);
  assert.deepEqual(C.savedView(LIST, "bookmark", "").map((l) => l.id), [3]);
});
test("search: by topic or bookmark text, any case; a session is found by topic only", () => {
  assert.deepEqual(C.savedView(LIST, "all", "ZETA").map((l) => l.id), [2]);
  assert.deepEqual(C.savedView(LIST, "all", "urease").map((l) => l.id), [3]);
  assert.deepEqual(C.savedView(LIST, "cheat", " alpha lecture ").map((l) => l.id), [6, 4]);
  assert.deepEqual(C.savedView(LIST, "cheat", "alpha-blockers").map((l) => l.id), [6, 5, 2], "the sheet text is searched too");
  assert.deepEqual(C.savedView(LIST, "all", "stones").map((l) => l.id), [3, 1]);
  assert.deepEqual(C.savedView(LIST, "all", "hi"), C.savedView(LIST, "all", "hi"));
  assert.deepEqual(C.savedView(LIST, "session", "hi").map((l) => l.id), [], "a session's messages aren't searched");
  assert.deepEqual(C.savedView(LIST, "all", "nomatchxyz"), []);
});
test("the list passed in is never mutated", () => {
  const copy = JSON.stringify(LIST);
  C.savedView(LIST, "cheat", "a"); C.savedView(LIST, "all", ""); C.savedCounts(LIST);
  assert.equal(JSON.stringify(LIST), copy);
});

console.log("\n" + passed + " passed, " + failed + " failed");
process.exit(failed ? 1 : 0);
