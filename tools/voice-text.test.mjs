// Unit tests for the tutor's voice-mode text helpers (the VOICE-TEXT block of UroStudyHub.html):
// what gets said for a reply, how it's cut into utterances while it streams, spoken commands, voice ranking.
// Dependency-free:  node tools/voice-text.test.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const HTML_PATH = fileURLToPath(new URL("../UroStudyHub.html", import.meta.url));
const src = fs.readFileSync(HTML_PATH, "utf8");
const m = src.match(/^[ \t]*\/\/ VOICE-TEXT-BEGIN[^\n]*\n([\s\S]*?)^[ \t]*\/\/ VOICE-TEXT-END/m);
if (!m) { console.log("FAIL: no VOICE-TEXT-BEGIN / VOICE-TEXT-END block in " + HTML_PATH); process.exit(1); }
const NAMES = ["voiceSpeechText", "voiceChunks", "voiceEnds", "voiceSplitLong", "voiceCommand", "voiceRank", "voiceScore", "voiceTex"];
const V = new Function(m[1] + "\n;return {" + NAMES.map((n) => JSON.stringify(n) + ": typeof " + n + " === 'undefined' ? undefined : " + n).join(", ") + "};")();
for (const n of NAMES) { if (V[n] === undefined) { console.log("FAIL block does not define " + n); process.exit(1); } }

let failed = 0, passed = 0;
function test(name, fn) {
  try { const note = fn(); passed++; console.log("PASS " + name + (note ? "  (" + note + ")" : "")); }
  catch (e) { failed++; console.log("FAIL " + name + "\n     " + String(e && e.message ? e.message : e).split("\n").join("\n     ")); }
}
const say = (t) => V.voiceSpeechText(t);
const has = (s, sub) => assert.ok(s.includes(sub), JSON.stringify(s) + " should contain " + JSON.stringify(sub));
const lacks = (s, sub) => assert.ok(!s.includes(sub), JSON.stringify(s) + " should not contain " + JSON.stringify(sub));

// ---- what gets said ----
test("markdown goes: headers, bold, bullets, numbers, code, links, rules", () => {
  const s = say("## Big picture\n\n**BPH** is _common_.\n- First point here.\n* Second point.\n1. Numbered one.\n2) Numbered two.\n`code` and [a link](https://x.y/z).\n---\nEnd.");
  for (const bad of ["#", "**", "- First", "* Second", "1.", "2)", "`", "https", "---"]) lacks(s, bad);
  has(s, "Big picture"); has(s, "BPH is _common_."); has(s, "First point here."); has(s, "Numbered two."); has(s, "a link");
});
test("emoji and pictographs go, the words stay", () => {
  const s = say("🔬 Phase 3, Core Details.\n⚡ Quick one: ✅ right! 🎯 ❓ What next?");
  lacks(s, "🔬"); lacks(s, "⚡"); lacks(s, "✅"); lacks(s, "❓"); lacks(s, "🎯");
  has(s, "Phase 3, Core Details."); has(s, "Quick one: right!"); has(s, "What next?");
});
test("hook tags are not read; an unfinished one hides what follows", () => {
  const done = say("Let's lock that in.\n[[HOOK | Birt-Hogg-Dubé | fibrofolliculomas. HOCTs | hogs get bumps]]\nNext idea.");
  lacks(done, "HOOK"); lacks(done, "hogs"); has(done, "Let's lock that in."); has(done, "Next idea.");
  const partial = say("Lock it in. [[HOOK | BHD | fibro. more");
  assert.equal(partial.trim(), "Lock it in.");
});
test("everything from an ON SCREEN: line on stays on screen", () => {
  const s = say("Here are the big three. Say them back to me?\n\nON SCREEN:\n| Stage | Rule |\n| T1 | under 7 cm |");
  has(s, "Say them back to me?"); lacks(s, "ON SCREEN"); lacks(s, "Stage"); lacks(s, "7 cm");
  lacks(say("Text.\n**ON SCREEN:**\nHidden."), "Hidden");
  lacks(say("Text.\n📋 ON SCREEN:\nHidden."), "Hidden");
  has(say("We see it on screen in clinic."), "on screen in clinic");  // ordinary words are fine
});
test("mastery-map lines are not read, but warnings and checks are", () => {
  const s = say("🗺️ MAP — BPH\n✅ 1. Alpha receptors\n🔵 2. 5-ARIs\n⬜ 3. Surgery\n⚠️ 2a. Prostate zones\nRight, now 5-ARIs.\n⚠️ Classic trap: PSA halves on finasteride.\n❓ First-line for ____ is ____.");
  for (const bad of ["MAP", "Alpha receptors", "Surgery", "Prostate zones"]) lacks(s, bad);
  has(s, "Right, now 5-ARIs."); has(s, "Classic trap: PSA halves on finasteride."); has(s, "First-line for blank is blank.");
});
test("flowchart and chart blocks are drawn, not read; an unfinished one hides the rest", () => {
  const s = say("Here's the pathway.\n```mermaid\nflowchart TD\n  A[Hematuria] --> B{Risk?}\n```\nWhich risk group is he?\n```chart\n{\"type\":\"line\"}\n```\nDone.");
  lacks(s, "flowchart"); lacks(s, "-->"); lacks(s, "type"); lacks(s, "`");
  has(s, "Here's the pathway."); has(s, "Which risk group is he?"); has(s, "Done.");
  assert.equal(say("Look at this.\n```mermaid\nflowchart TD\n  A[Start").trim(), "Look at this.");
});
test("LaTeX becomes words; an unclosed formula hides the rest", () => {
  const s = say("Use \\( FENa = \\frac{U_{Na} \\times P_{Cr}}{P_{Na} \\times U_{Cr}} \\times 100 \\) here.");
  lacks(s, "\\"); lacks(s, "{"); has(s, "FENa equals"); has(s, "over"); has(s, "times 100");
  has(say("Area is \\( \\pi r^2 \\)."), "squared");
  assert.equal(say("Start. \\( FENa = \\frac{U").trim(), "Start.");
});
test("units, catheter sizes, ages and symbols are spelled out", () => {
  has(say("Tamsulosin 0.4 mg daily."), "0.4 milligrams");
  has(say("Give 1 g now."), "1 gram");
  has(say("PSA 4 ng/mL or more."), "4 nanograms per milliliter");
  has(say("Volume over 40 g, add a 5-ARI."), "40 grams");
  has(say("Place a 22 Fr three-way catheter."), "22 French");
  has(say("Place a 16F Foley."), "16F");  // a catheter, not a 16-year-old woman
  has(say("A 65M, PSA 8."), "65-year-old man,");
  has(say("Picture a 65M up four times a night."), "a 65-year-old man up");
  has(say("An 80M."), "An 80-year-old man");
  has(say("Use a 22F three-way."), "22F three-way");
  has(say("A 34F with flank pain."), "34-year-old woman with");
  has(say("A 72 yo man."), "72-year-old man");
  has(say("Wait 6-8 weeks."), "6 to 8 weeks");
  has(say("Stone ≥ 10 mm."), "at least 10 millimeters");
  has(say("PSA >10 needs a biopsy."), "greater than 10");
  has(say("Obstruction → hydronephrosis."), "Obstruction leads to hydronephrosis.");
  has(say("Gleason 3+4=7."), "3 plus 4 equals 7");
  has(say("A 2 × 3 cm mass."), "2 by 3 centimeters");
  has(say("Alpha blockers, e.g. tamsulosin, vs. 5-ARIs."), "for example, tamsulosin, versus 5-ARIs");
  has(say("E. coli is the usual bug."), "E. coli");
  has(say("Wait 2 hours and 10 minutes."), "2 hours and 10 minutes");  // full words untouched
});
test("tables read as a list of values", () => {
  const s = say("| Grade | Finding |\n|---|---|\n| 1 | Hematoma |");
  lacks(s, "|"); lacks(s, "---"); has(s, "Grade, Finding"); has(s, "1, Hematoma");
});

// ---- utterances ----
test("sentence ends: punctuation + space or a line break, not E. coli, decimals or Dr.", () => {
  const t = "E. coli is gram negative. Dose 0.4 milligrams! Ask Dr. Smith? Yes.\nNext";
  const ends = V.voiceEnds(t, 0).map((i) => t.slice(0, i).trim());
  assert.deepEqual(ends.map((x) => x.split(" ").pop()), ["negative.", "milligrams!", "Smith?", "Yes.", "Yes."]);
  assert.equal(V.voiceEnds("E. coli grows.", 0).length, 0, "no end at 'E.' and none at the very end");
  assert.equal(V.voiceEnds("Dose 0.4 milligrams. Done", 0).length, 1);
  assert.equal(V.voiceEnds("Ask Dr. Smith. Ok", 0).length, 1);
  assert.equal(V.voiceEnds("He said \"stop.\" Then", 0).length, 1);
});
test("chunks: only whole sentences until the end, then the rest", () => {
  let r = V.voiceChunks("First sentence here. Second one is still go", 0, false);
  assert.deepEqual(r.chunks, ["First sentence here."]);
  r = V.voiceChunks("First sentence here. Second one is still go", r.next, false);
  assert.deepEqual(r.chunks, []);
  r = V.voiceChunks("First sentence here. Second one is still going", r.next, true);
  assert.deepEqual(r.chunks, ["Second one is still going"]);
});
test("chunks group short sentences within a paragraph, break at paragraphs, cap the length", () => {
  const r = V.voiceChunks("One. Two. Three.\n\nNew paragraph here.", 0, true);
  assert.deepEqual(r.chunks, ["One. Two. Three.", "New paragraph here."]);
  const long = "This is a long clause about the prostate and its zones, which matter for cancer, " +
    "and here is another clause about the transition zone where BPH lives, and then a third clause that goes on " +
    "about the peripheral zone where most cancers arise and why a DRE can feel them at all.";
  const r2 = V.voiceChunks(long, 0, true);
  assert.ok(r2.chunks.length >= 2, "split: " + JSON.stringify(r2.chunks));
  for (const c of r2.chunks) assert.ok(c.length <= 220, "chunk too long: " + c.length);
  assert.equal(r2.chunks.join(" ").replace(/\s+/g, " "), long);
});
test("streaming: feeding a reply token by token says exactly the whole reply once", () => {
  const reply = "## 🔬 Phase 3: Core Details\n\nPicture a **65M** with a PSA of 6. E. coli? No, that's the UTI story. " +
    "His prostate is 60 g, so add finasteride 5 mg daily, i.e. a 5-ARI.\n\n[[HOOK | BPH | alpha vs 5-ARI | fast valve, slow shrink]]\n" +
    "What does that do to his PSA?\n\nON SCREEN:\n✅ 1. Alpha blockers\n🔵 2. 5-ARIs";
  const finalText = say(reply);
  let from = 0, spoken = [], firstAt = -1;
  for (let i = 1; i <= reply.length; i++) {
    const r = V.voiceChunks(say(reply.slice(0, i)), from, false);
    if (r.chunks.length && firstAt < 0) firstAt = i;
    spoken.push(...r.chunks); from = r.next;
  }
  spoken.push(...V.voiceChunks(finalText, from, true).chunks);
  const want = V.voiceChunks(finalText, 0, true).chunks.join(" ").replace(/\s+/g, " ");
  assert.equal(spoken.join(" ").replace(/\s+/g, " "), want);
  for (const bad of ["**", "#", "HOOK", "ON SCREEN", "Alpha blockers", "🔬"]) lacks(spoken.join(" "), bad);
  has(spoken.join(" "), "65-year-old man");
  has(spoken.join(" "), "60 grams");
  assert.ok(firstAt > 0 && firstAt < reply.indexOf("E. coli"), "starts talking after the first line, at char " + firstAt);
  return spoken.length + " utterances";
});

// ---- spoken commands ----
test("commands: repeat / stop / slower / faster anywhere", () => {
  for (const t of ["Repeat that.", "say that again", "Okay, could you say that again?", "What?", "come again"]) assert.deepEqual(V.voiceCommand(t, "other"), { local: "repeat" }, t);
  for (const t of ["Stop.", "pause", "hold on", "Wait."]) assert.deepEqual(V.voiceCommand(t, "lecture"), { local: "stop" }, t);
  assert.deepEqual(V.voiceCommand("slow down please", "other"), { local: "slower" });
  assert.deepEqual(V.voiceCommand("Speed up.", "mastery"), { local: "faster" });
});
test("commands: lecture next / skip / deeper map to the buttons' messages", () => {
  for (const t of ["Next.", "okay next", "Yeah, keep going.", "I'm ready", "move on"]) assert.equal(V.voiceCommand(t, "lecture").say, "NEXT", t);
  assert.match(V.voiceCommand("skip this", "lecture").say, /^SKIP this phase/);
  assert.match(V.voiceCommand("Go deeper.", "lecture").say, /^Go deeper into this section/);
  assert.equal(V.voiceCommand("next", "other").say, "next", "outside a lecture it's just words");
});
test("commands: mastery hint / skip / map", () => {
  assert.equal(V.voiceCommand("Can I get a hint?", "mastery").say, "HINT");
  assert.equal(V.voiceCommand("skip", "mastery").say, "SKIP");
  assert.equal(V.voiceCommand("show me the map", "mastery").say, "MAP");
});
test("answers pass through untouched", () => {
  const a = "Wait, why does finasteride halve the PSA?";
  assert.deepEqual(V.voiceCommand(a, "lecture"), { say: a });
  assert.deepEqual(V.voiceCommand("The alpha 1A receptor.", "mastery"), { say: "The alpha 1A receptor." });
  assert.deepEqual(V.voiceCommand("I think it's next to the bladder neck", "lecture"), { say: "I think it's next to the bladder neck" });
});

// ---- voices ----
test("voice ranking: natural / enhanced first, novelty last, non-English out", () => {
  const vs = [
    { name: "Zarvox", lang: "en-US", voiceURI: "z" },
    { name: "Microsoft David - English (United States)", lang: "en-US", voiceURI: "d", localService: true },
    { name: "Google US English", lang: "en-US", voiceURI: "g", localService: false },
    { name: "Microsoft Aria Online (Natural) - English (United States)", lang: "en-US", voiceURI: "a", localService: false },
    { name: "Google français", lang: "fr-FR", voiceURI: "f" },
    { name: "Samantha (Enhanced)", lang: "en_US", voiceURI: "s" },
  ];
  const r = V.voiceRank(vs, "en-US").map((v) => v.voiceURI);
  assert.equal(r[0], "a"); assert.equal(r[1], "s"); assert.equal(r[2], "g"); assert.equal(r[r.length - 1], "z");
  assert.ok(!r.includes("f"));
  assert.deepEqual(V.voiceRank([], "en-US"), []);
});

console.log("\n" + passed + " passed, " + failed + " failed");
process.exit(failed ? 1 : 0);
