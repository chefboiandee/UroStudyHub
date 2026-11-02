// Unit tests for the In-Service Exam sprint planner (the ISE-LOGIC block of UroStudyHub.html).
// Dependency-free. Run in two time zones:
//   TZ=America/New_York node tools/ise-plan.test.mjs
//   TZ=UTC node tools/ise-plan.test.mjs
// ISE_SRC=/path/to/file.js picks another source that holds the block between the markers.
import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const HTML_PATH = fileURLToPath(new URL("../UroStudyHub.html", import.meta.url));
const SRC_PATH = process.env.ISE_SRC || HTML_PATH;
const srcText = fs.readFileSync(SRC_PATH, "utf8");
const mBlock = srcText.match(/^[ \t]*\/\/ ISE-LOGIC-BEGIN[^\n]*\n([\s\S]*?)^[ \t]*\/\/ ISE-LOGIC-END/m);
if (!mBlock) { console.log("FAIL: no ISE-LOGIC-BEGIN / ISE-LOGIC-END block in " + SRC_PATH); process.exit(1); }
const BLOCK = mBlock[1];

const NAMES = ["ISE_GROUPS", "ISE_GROUP_KEYS", "ISE_BLOCKS", "ISE_BY_ID", "ISE_LABEL", "ISE_KNOW", "ISE_CFG_DEFAULT", "ISE_KIND_LABEL",
  "iseTier", "iseYmd", "iseDate", "iseAdd", "iseDiff", "iseDefaultExam", "iseFmt", "iseValidYmd", "iseMins",
  "buildIsePlan", "iseDayPlan", "iseFloorSteps", "iseMet", "iseStatus", "iseResolve", "iseTodaySummary", "iseSetup",
  "iseReshuffle", "iseDiffPlans", "iseWhatIfs", "iseWeakGroups", "iseDefaultTicks", "iseApplyLog", "iseSetSkip",
  "iseParseMisses", "iseAddMisses", "iseDelMiss", "iseNorm", "iseMerge", "iseGroupStats", "iseProgress", "iseScore",
  "iseRecentMisses"];
const I = new Function(BLOCK + "\n;return {" + NAMES.map((n) => JSON.stringify(n) + ": typeof " + n + " === 'undefined' ? undefined : " + n).join(", ") + "};")();

// AUA topic names come from the real app file, whatever ISE_SRC says.
const html = fs.readFileSync(HTML_PATH, "utf8");
const mAua = html.match(/^const AUA_PHASES = (\[[\s\S]*?\n\]);/m);
const AUA_PHASES = mAua ? new Function("return " + mAua[1] + ";")() : null;

// ---- harness ----
let failed = 0, passed = 0;
function test(name, fn) {
  try {
    const note = fn();
    passed++;
    console.log("PASS " + name + (note ? "  (" + note + ")" : ""));
  } catch (e) {
    failed++;
    console.log("FAIL " + name + ": " + String(e && e.message ? e.message : e).split("\n").slice(0, 3).join(" | "));
  }
}
function freeze(o) {
  if (o && typeof o === "object" && !Object.isFrozen(o)) { Object.freeze(o); Object.keys(o).forEach((k) => freeze(o[k])); }
  return o;
}
const C = (o) => freeze(Object.assign({ exam: "2026-11-21", minsWk: 120, minsWe: 180, off: [], skip: [], pace: 3, qbank: "SASP", boost: {} }, o || {}));
const H0 = freeze({ done: {}, log: {}, pin: null });
const ent = (plan, d) => plan.find((e) => e.d === d);
const datesOf = (plan, k) => plan.filter((e) => e.k === k).map((e) => e.d);
const isWeekend = (d) => { const w = I.iseDate(d).getDay(); return w === 0 || w === 6; };
const totalQ = (plan, cfg) => plan.reduce((a, e) => a + (e.k === "rest" || e.k === "exam" ? 0 : I.iseDayPlan(e, I.iseMins(cfg, e.d), cfg.pace).q), 0);
const blank = () => freeze(I.iseNorm(null));
const setup = (cfg, today, pre) => freeze(I.iseSetup(blank(), cfg, pre || {}, today));
const withFields = (ise, f) => freeze(Object.assign({}, ise, f));
const placedOnce = (plan, cut) => {
  const seen = {};
  plan.forEach((e) => (e.it || []).forEach((x) => { seen[x.b] = (seen[x.b] || 0) + (x.part === 2 ? 0 : 1); }));
  (cut || []).forEach((id) => { seen[id] = (seen[id] || 0) + 1; });
  return seen;
};
const SLASH_STAR = "/" + "*", BACKTICK = String.fromCharCode(96), BOXBAR = "═";

console.log("ISE plan tests · src " + SRC_PATH.split("/").slice(-2).join("/") + " · TZ " + (process.env.TZ || Intl.DateTimeFormat().resolvedOptions().timeZone));

test("0 contract surface: every global and function exists", () => {
  const missing = NAMES.filter((n) => I[n] === undefined);
  assert.deepEqual(missing, []);
  assert.equal(I.ISE_KIND_LABEL.buffer, "Catch-up");
  assert.equal(I.ISE_KIND_LABEL.none, "");
});

test("1 catalogue: 23 ids, topics in AUA_PHASES, know keys, reads, weights, source hygiene", () => {
  const ids = I.ISE_BLOCKS.map((b) => b.id);
  assert.equal(ids.length, 23);
  assert.equal(new Set(ids).size, 23);
  assert.ok(AUA_PHASES, "AUA_PHASES not found in UroStudyHub.html");
  const aua = new Set();
  AUA_PHASES.forEach((p) => p.sections.forEach((s) => s.topics.forEach((t) => aua.add(t))));
  const topics = [];
  I.ISE_BLOCKS.forEach((b) => b.topics.forEach((t) => topics.push(t)));
  const missingT = topics.filter((t) => !aua.has(t));
  assert.deepEqual(missingT, [], "topics not in AUA_PHASES");
  I.ISE_BLOCKS.forEach((b, i) => {
    assert.equal(b.i, i);
    assert.ok(I.ISE_GROUPS[b.g], "group " + b.g);
    assert.ok(b.know.length > 0 && b.know.every((k) => I.ISE_KNOW[k]), "know " + b.id);
    assert.ok(I.ISE_BY_ID[b.id] === b);
  });
  Object.keys(I.ISE_LABEL).forEach((t) => assert.ok(topics.indexOf(t) >= 0, "ISE_LABEL key " + t));
  assert.deepEqual(I.ISE_GROUP_KEYS, Object.keys(I.ISE_GROUPS));
  assert.equal(I.ISE_GROUP_KEYS.length, 14);
  let w = 0;
  I.ISE_GROUP_KEYS.forEach((g) => {
    const G = I.ISE_GROUPS[g];
    w += G.w;
    assert.ok(typeof G.read === "string" && G.read.length > 10, "read " + g);
    assert.ok(G.label, "label " + g);
    const ks = I.ISE_BLOCKS.filter((b) => b.g === g).map((b) => b.k);
    assert.deepEqual(ks, ks.map((_, j) => j), "k order " + g);
  });
  assert.equal(w, 100);
  const kk = Object.keys(I.ISE_KNOW);
  assert.equal(kk.join(" "), "prostate bladder kidney testis penile adrenal neuro voiding peds1 peds2 stones infection andro trauma anat physio imaging pharm");
  const nItems = kk.reduce((a, k) => a + I.ISE_KNOW[k].items.length, 0);
  assert.equal(nItems, 108);
  kk.forEach((k) => { assert.ok(I.ISE_KNOW[k].t); I.ISE_KNOW[k].items.forEach((s) => assert.ok(typeof s === "string" && s.length > 5)); });
  assert.equal(I.iseTier("void"), "HIGH"); assert.equal(I.iseTier("pros"), "HIGH");
  assert.equal(I.iseTier("andro"), "MED"); assert.equal(I.iseTier("kid"), "MED"); assert.equal(I.iseTier("testis"), "LOW");
  const bad = [SLASH_STAR, BACKTICK, BOXBAR, ".at(", "hasOwn", "structuredClone", "findLast", "toSorted", "Date.now", "Math.random", "toISOString", "new Date()", "localStorage", "AUA_"]
    .filter((s) => BLOCK.indexOf(s) >= 0);
  assert.deepEqual(bad, [], "forbidden text in the block");
  const lines = BLOCK.split("\n").filter((l) => /^\s*\/\//.test(l) && /["']\s*[,+\]]/.test(l));
  assert.deepEqual(lines, [], "a // line that looks like string content");
  return topics.length + " topic refs (" + new Set(topics).size + " unique), all in AUA_PHASES; KNOW 18 keys / " + nItems + " items";
});

test("2 board replica 135/240 from 10-20: shape, no cut/light, 25 / 50+lecture / 75", () => {
  const cfg = C({ minsWk: 135, minsWe: 240 });
  const r = I.buildIsePlan(cfg, H0, "2026-10-20");
  assert.equal(r.plan.length, 33);
  assert.deepEqual(datesOf(r.plan, "buffer"), ["2026-10-27", "2026-11-04", "2026-11-13"]);
  assert.deepEqual(datesOf(r.plan, "mock"), ["2026-11-14", "2026-11-15"]);
  assert.deepEqual(datesOf(r.plan, "weak"), ["2026-11-16", "2026-11-17"]);
  assert.deepEqual(datesOf(r.plan, "allknow"), ["2026-11-18"]);
  assert.deepEqual(datesOf(r.plan, "misslog"), ["2026-11-19"]);
  assert.deepEqual(datesOf(r.plan, "rest"), ["2026-11-20"]);
  assert.deepEqual(datesOf(r.plan, "exam"), ["2026-11-21"]);
  assert.deepEqual(r.cut, []); assert.deepEqual(r.light, []);
  let doubles = 0;
  r.plan.forEach((e) => {
    const dp = I.iseDayPlan(e, I.iseMins(cfg, e.d), 3);
    if (e.k === "block" && !isWeekend(e.d)) assert.equal(dp.q, 25, e.d);
    if (e.k === "block" && isWeekend(e.d) && e.it.length === 1) { assert.equal(dp.q, 50, e.d); assert.equal(dp.mode, "lecture", e.d); }
    if (e.k === "block" && isWeekend(e.d) && e.it.length === 2) { doubles++; assert.equal(dp.q, 45, e.d); }
    if (e.k === "mock") { assert.equal(dp.q, 75); assert.equal(dp.qKind, "timed"); }
  });
  assert.equal(ent(r.plan, "2026-10-24").it.length, 2, "double block on Sat 10-24");
  return "1 double day, total " + totalQ(r.plan, cfg) + " Qs";
});

test("3 today 11-02 at 120/180: cut pen1+pros3, 12 light, mocks on the weekend, taper", () => {
  const cfg = C();
  const r = I.buildIsePlan(cfg, H0, "2026-11-02");
  assert.deepEqual(r.cut, ["pen1", "pros3"]);
  assert.equal(r.light.length, 12);
  assert.deepEqual(datesOf(r.plan, "mock"), ["2026-11-14", "2026-11-15"]);
  assert.deepEqual(datesOf(r.plan, "weak"), ["2026-11-18"]);
  assert.deepEqual(datesOf(r.plan, "final"), ["2026-11-19"]);
  assert.deepEqual(datesOf(r.plan, "rest"), ["2026-11-20"]);
  assert.equal(totalQ(r.plan, cfg), 530);
  return "530 Qs";
});

test("4 mid-sprint with 12 pre-covered blocks at 135/240: no cut, no light, starts ston1", () => {
  const done = {};
  ["pros1", "pros2", "pros3", "blad1", "blad2", "kid1", "tes1", "pen1", "neur1", "neur2", "void1", "peds1"].forEach((k) => { done[k] = "pre"; });
  const r = I.buildIsePlan(C({ minsWk: 135, minsWe: 240 }), freeze({ done, log: {}, pin: null }), "2026-11-02");
  assert.deepEqual(r.cut, []); assert.deepEqual(r.light, []);
  assert.equal(r.plan[0].k, "block"); assert.equal(r.plan[0].it[0].b, "ston1");
  const seen = placedOnce(r.plan, r.cut);
  I.ISE_BLOCKS.forEach((b) => assert.equal(seen[b.id] || 0, done[b.id] ? 0 : 1, b.id));
});

test("5 one day left (from 11-20): [rest, exam], every block cut", () => {
  const r = I.buildIsePlan(C(), H0, "2026-11-20");
  assert.deepEqual(r.plan, [{ d: "2026-11-20", k: "rest" }, { d: "2026-11-21", k: "exam" }]);
  assert.equal(r.cut.length, 23); assert.deepEqual(r.light, []);
});

test("6 exam today / passed: empty plan, no throw, status exam", () => {
  assert.deepEqual(I.buildIsePlan(C(), H0, "2026-11-21"), { plan: [], cut: [], light: [] });
  assert.deepEqual(I.buildIsePlan(C(), H0, "2026-11-22"), { plan: [], cut: [], light: [] });
  const ise = setup(C(), "2026-11-02");
  assert.equal(I.iseStatus(ise, "2026-11-21").state, "exam");
  assert.equal(I.iseStatus(ise, "2026-11-23").state, "exam");
  assert.equal(I.iseResolve(ise, "2026-11-21", null, "2026-11-21").k, "exam");
  assert.equal(I.iseTodaySummary(ise, "2026-11-21").state, "exam");
  assert.equal(I.iseTodaySummary(ise, "2026-11-22"), null, "no Hub task once the exam has passed");
  const late = setup(C(), "2026-11-22");
  assert.deepEqual(late.plan, []);
  assert.deepEqual(I.iseWhatIfs(ise, "2026-11-21"), []);
});

test("7 zero study days (every weekday off): [rest, exam], everything cut", () => {
  const r = I.buildIsePlan(C({ off: [0, 1, 2, 3, 4, 5, 6] }), H0, "2026-11-02");
  assert.deepEqual(r.plan.map((e) => e.k), ["rest", "exam"]);
  assert.equal(r.cut.length, 23);
});

test("8 two study days (from 11-18): no tail, 2 content days of top blocks light, rest, exam", () => {
  const r = I.buildIsePlan(C(), H0, "2026-11-18");
  assert.deepEqual(r.plan.map((e) => e.k), ["block", "block", "rest", "exam"]);
  const items = r.plan.slice(0, 2).flatMap((e) => e.it);
  assert.ok(items.every((x) => x.lvl === "light"), "all light");
  assert.deepEqual(items.map((x) => x.b), ["void1", "peds1", "ston1", "pros1"]);
  assert.equal(r.cut.length, 19);
  return "light " + items.map((x) => x.b).join(",");
});

test("9 behind by 1 day: absorb, ston1 -> 10-27 and pros1 -> 11-04", () => {
  const cfg = C({ minsWk: 135, minsWe: 240 });
  const base = setup(cfg, "2026-10-20");
  const ise = withFields(base, {
    done: { void1: "2026-10-20", peds1: "2026-10-21" },
    log: { "2026-10-20": { q: 25, pct: 60, floor: false, t: 25, k: "block", b: ["void1"], g: "void", ts: 1, rw: 1 },
      "2026-10-21": { q: 25, pct: 70, floor: false, t: 25, k: "block", b: ["peds1"], g: "peds", ts: 2, rw: 1 } }
  });
  const st = I.iseStatus(ise, "2026-10-24");
  assert.equal(st.state, "absorb");
  assert.deepEqual(st.behind, ["ston1", "pros1"]);
  assert.deepEqual(st.assign, { "2026-10-27": "ston1", "2026-11-04": "pros1" });
  assert.equal(st.unabsorbed, 0);
  const res = I.iseResolve(ise, "2026-10-27", st, "2026-10-24");
  assert.equal(res.k, "catchup"); assert.equal(res.catchupFor, "ston1");
  assert.deepEqual(res.items, [{ b: "ston1", lvl: "full", part: 0 }]);
  assert.equal(res.q, 25); assert.equal(res.steps[0].t, "Catch-up: " + I.ISE_BY_ID.ston1.label);
  assert.deepEqual(I.iseDefaultTicks(res, null), { ston1: true });
  assert.equal(I.iseResolve(ise, "2026-11-13", st, "2026-10-24").k, "buffer");
});

test("10 behind by 4 days: 6 behind, reshuffle restores order, cuts 9, what-ifs", () => {
  const cfg = C();
  const ise = setup(cfg, "2026-11-05");
  assert.deepEqual(ise.plan, I.buildIsePlan(cfg, H0, "2026-11-05").plan);
  const st = I.iseStatus(ise, "2026-11-09");
  assert.equal(st.state, "behind");
  assert.equal(st.behind.length, 6); assert.equal(st.unabsorbed, 6);
  assert.deepEqual(st.behind, ["void1", "peds1", "ston1", "pros1", "tes1", "peds2"]);
  const next = freeze(I.iseReshuffle(ise, "2026-11-09"));
  assert.deepEqual(next.plan.filter((e) => e.d < "2026-11-09"), ise.plan.filter((e) => e.d < "2026-11-09"));
  [["2026-11-09", "void1"], ["2026-11-10", "peds1"], ["2026-11-11", "ston1"]].forEach(([d, b]) => {
    assert.deepEqual(ent(next.plan, d).it, [{ b, lvl: "full", part: 0 }], d);
  });
  assert.equal(next.cut.length, 9);
  assert.deepEqual(next.shuffles, ["2026-11-09"]);
  assert.equal(next.built, "2026-11-09");
  const seen = placedOnce(next.plan.filter((e) => e.d >= "2026-11-09"), next.cut);
  I.ISE_BLOCKS.forEach((b) => assert.equal(seen[b.id], 1, b.id));
  const st2 = I.iseStatus(next, "2026-11-09");
  assert.equal(st2.behind.length, 0); assert.equal(st2.state, "on");
  const diff = I.iseDiffPlans(ise, next, "2026-11-09");
  assert.deepEqual(diff.back.map((x) => x.b).sort(), st.behind.slice().sort());
  assert.deepEqual(diff.back[0], { b: "void1", d: "2026-11-09" });
  assert.deepEqual(diff.cut, ["bs2", "andr2", "inf1"]);
  assert.deepEqual(diff.uncut, []);
  assert.deepEqual(diff.preview.map((e) => e.d), ["2026-11-09", "2026-11-10", "2026-11-11"]);
  const w = I.iseWhatIfs(ise, "2026-11-09");
  assert.ok(w.length >= 1);
  assert.deepEqual(w[0].over, { minsWk: 150 }); assert.equal(w[0].cutN, 6);
  assert.ok(/^\+30 min on weekdays → cuts 6 instead of 9/.test(w[0].label), w[0].label);
  assert.ok(!w.some((x) => x.over.minsWk === 180), "+60 weekdays should merge into +30");
  w.forEach((x) => assert.ok(x.cutN + 0.5 * x.lightN < next.cut.length + 0.5 * next.light.length));
  const sum = I.iseTodaySummary(ise, "2026-11-09");
  assert.equal(sum.hub, "ISE plan: 6 blocks behind — tap to reshuffle");
  assert.equal(sum.line, "6 blocks behind: tap to reshuffle");
  return w.map((x) => x.label).join(" | ");
});

test("11 today already logged: reshuffle starts tomorrow, today's entry untouched", () => {
  const cfg = C();
  const base = setup(cfg, "2026-11-02");
  const ise = withFields(base, { done: { void1: "2026-11-02" },
    log: { "2026-11-02": { q: 20, pct: 70, floor: false, t: 20, k: "block", b: ["void1"], g: "void", ts: 5, rw: 1 } } });
  const next = I.iseReshuffle(ise, "2026-11-02");
  assert.ok(ent(next.plan, "2026-11-02") === ent(ise.plan, "2026-11-02"));
  const fresh = I.buildIsePlan(cfg, { done: ise.done, log: ise.log, pin: "peds1" }, "2026-11-03");
  assert.deepEqual(next.plan.filter((e) => e.d >= "2026-11-03"), fresh.plan);
  assert.equal(I.iseDiffPlans(ise, next, "2026-11-02").preview[0].d, "2026-11-03");
});

test("12 pin: today's planned block stays on today after a reshuffle", () => {
  const cfg = C();
  const base = setup(cfg, "2026-11-02");
  assert.equal(ent(base.plan, "2026-11-04").it[0].b, "ston1");
  const log = { "2026-11-02": { q: 20, pct: 80, t: 20, k: "block", b: ["void1"], g: "void", ts: 1 },
    "2026-11-03": { q: 20, pct: 80, t: 20, k: "block", b: ["peds1"], g: "peds", ts: 2 } };
  const ise = withFields(base, { done: { void1: "2026-11-02", peds1: "2026-11-03" }, log });
  assert.equal(ent(I.iseReshuffle(ise, "2026-11-04").plan, "2026-11-04").it[0].b, "ston1");
  // stronger: weak prostate scores would put pros1 first without the pin
  const log2 = Object.assign({}, log, { "2026-10-30": { q: 20, pct: 30, g: "pros", ts: 3 }, "2026-10-31": { q: 20, pct: 30, g: "pros", ts: 4 } });
  const ise2 = withFields(ise, { log: log2 });
  const noPin = I.buildIsePlan(cfg, { done: ise2.done, log: log2, pin: null }, "2026-11-04");
  assert.equal(noPin.plan[0].it[0].b, "pros1");
  const pinned = I.iseReshuffle(ise2, "2026-11-04");
  assert.equal(ent(pinned.plan, "2026-11-04").it[0].b, "ston1");
  assert.equal(ent(pinned.plan, "2026-11-05").it[0].b, "pros1");
});

test("13 weakness: stones 40% and voiding 85% reorder the plan", () => {
  const log = freeze({ "2026-10-30": { q: 20, pct: 40, g: "stones" }, "2026-10-31": { q: 20, pct: 85, g: "void" } });
  const r = I.buildIsePlan(C(), { done: {}, log, pin: null }, "2026-11-02");
  const first = {};
  r.plan.forEach((e) => (e.it || []).forEach((x) => { if (!first[x.b]) first[x.b] = e.d; }));
  assert.equal(r.plan[0].it[0].b, "ston1");
  assert.ok(first.ston2 < first.void1, "ston2 " + first.ston2 + " before void1 " + first.void1);
  assert.equal(first.ston2, "2026-11-04");
  assert.ok(r.light.indexOf("void2") >= 0);
  const wg = I.iseWeakGroups(log, [], "2026-11-02");
  assert.deepEqual(wg.slice(0, 3), ["stones", "void", "peds"]);
});

test("14 floor day: met, streak continues, pace uses t", () => {
  assert.equal(I.iseMet({ q: 15, t: 25, floor: true }), true);
  assert.equal(I.iseMet({ q: 15, t: 25, floor: false }), false);
  assert.equal(I.iseMet({ q: 0, t: 0 }), true);
  assert.equal(I.iseMet(null), false);
  const base = setup(C(), "2026-11-02");
  const mk = (floor) => withFields(base, { log: {
    "2026-11-02": { q: 20, pct: 70, floor: false, t: 20, k: "block", b: [], g: "void", ts: 1 },
    "2026-11-03": { q: 15, pct: 60, floor, t: 25, k: "block", b: [], g: "peds", ts: 2 } } });
  const st = I.iseStatus(mk(true), "2026-11-04");
  assert.equal(st.streak, 2);
  assert.ok(Math.abs(st.pace - 35 / 45) < 1e-9, "pace " + st.pace);
  assert.equal(st.qDone, 35); assert.equal(st.qPlanned, 45);
  assert.equal(I.iseStatus(mk(false), "2026-11-04").streak, 0);
  const fs1 = I.iseFloorSteps(25, 10, "SASP");
  assert.ok(fs1.some((s) => s.t.indexOf("15 SASP questions") === 0));
  assert.ok(fs1[0].t.indexOf("Re-read misses") === 0 && fs1[0].m === 10);
  assert.ok(I.iseFloorSteps(10, 5, "SASP").some((s) => s.t.indexOf("10 SASP questions") === 0));
});

test("15 DST: consecutive dates across 11-01, date helpers", () => {
  const r = I.buildIsePlan(C(), H0, "2026-10-25");
  for (let i = 1; i < r.plan.length; i++) assert.equal(I.iseAdd(r.plan[i - 1].d, 1), r.plan[i].d, "gap at " + r.plan[i].d);
  assert.equal(r.plan[0].d, "2026-10-25"); assert.equal(r.plan[r.plan.length - 1].d, "2026-11-21");
  assert.equal(I.iseAdd("2026-10-31", 1), "2026-11-01"); assert.equal(I.iseAdd("2026-11-01", 1), "2026-11-02");
  assert.equal(I.iseDiff("2026-10-31", "2026-11-02"), 2); assert.equal(I.iseDiff("2027-03-13", "2027-03-15"), 2);
  assert.equal(I.iseAdd("2027-03-14", 1), "2027-03-15"); assert.equal(I.iseAdd("2026-12-31", 1), "2027-01-01");
  assert.equal(I.iseAdd("2026-03-01", -1), "2026-02-28");
  assert.equal(I.iseFmt("2026-11-12"), "Thu 11/12"); assert.equal(I.iseFmt("2026-11-02"), "Mon 11/2");
  assert.equal(I.iseDefaultExam("2026-11-02"), "2026-11-21"); assert.equal(I.iseDefaultExam("2026-11-21"), "2026-11-21");
  assert.equal(I.iseDefaultExam("2026-11-22"), "2027-11-20"); assert.equal(I.iseDefaultExam("2027-01-05"), "2027-11-20");
  assert.equal(I.iseValidYmd("2026-11-02"), true); assert.equal(I.iseValidYmd("2026-02-30"), false);
  assert.equal(I.iseValidYmd("2026-1-2"), false); assert.equal(I.iseValidYmd(null), false);
  assert.equal(I.iseYmd(new Date(2026, 10, 1, 23, 30)), "2026-11-01");
  return r.plan.length + " consecutive dates";
});

test("16 determinism: identical JSON across builds, reshuffles, what-ifs", () => {
  [["2026-10-20", C({ minsWk: 135, minsWe: 240 })], ["2026-11-02", C()], ["2026-10-01", C({ minsWk: 60, minsWe: 90, off: [3] })]].forEach(([from, cfg]) => {
    assert.equal(JSON.stringify(I.buildIsePlan(cfg, H0, from)), JSON.stringify(I.buildIsePlan(cfg, H0, from)));
  });
  const ise = setup(C(), "2026-11-05");
  assert.equal(JSON.stringify(I.iseReshuffle(ise, "2026-11-09")), JSON.stringify(I.iseReshuffle(ise, "2026-11-09")));
  assert.equal(JSON.stringify(I.iseWhatIfs(ise, "2026-11-09")), JSON.stringify(I.iseWhatIfs(ise, "2026-11-09")));
});

test("17 iseDayPlan table + step texts", () => {
  const blk = (it) => ({ k: "block", it });
  const F = (b) => ({ b, lvl: "full", part: 0 }), Lt = (b) => ({ b, lvl: "light", part: 0 });
  let p = I.iseDayPlan(blk([F("ston1")]), 135, 3);
  assert.equal(p.q, 25); assert.equal(p.mode, "deep"); assert.equal(p.qKind, "new");
  p = I.iseDayPlan(blk([F("ston1")]), 240, 3); assert.equal(p.q, 50); assert.equal(p.mode, "lecture");
  p = I.iseDayPlan(blk([F("ston1"), F("pros1")]), 240, 3); assert.equal(p.q, 45); assert.equal(p.mode, "deep");
  p = I.iseDayPlan(blk([Lt("kid1")]), 60, 3); assert.equal(p.q, 10); assert.equal(p.mode, "mastery");
  p = I.iseDayPlan({ k: "mock", n: 1 }, 240, 3); assert.equal(p.q, 75); assert.equal(p.qKind, "timed");
  p = I.iseDayPlan({ k: "mock", n: 2 }, 120, 3); assert.equal(p.q, 50);
  assert.ok(p.steps.some((s) => s.t.indexOf("Mock 2: 50 of 75 timed SASP questions") === 0));
  p = I.iseDayPlan({ k: "buffer" }, 135, 3); assert.equal(p.q, 30); assert.equal(p.qKind, "mixed"); assert.equal(p.mode, null);
  p = I.iseDayPlan(blk([F("ston1")]), 120, 3); assert.equal(p.q, 20);
  const fl = I.iseFloorSteps(25, 10, "SASP");
  assert.ok(fl.some((s) => s.t.indexOf("15 SASP") === 0));
  // the miss-review step comes on every study day, with the 2-day count
  const ctx = { qbank: "UWorld", recentMisses: 4 };
  const kinds = [blk([F("ston1")]), blk([Lt("kid1"), Lt("img1")]), blk([{ b: "void1", lvl: "full", part: 1 }]), blk([{ b: "void1", lvl: "full", part: 2 }]),
    { k: "catchup", it: [F("pros1")] }, { k: "buffer" }, { k: "second", g: ["void", "peds"] }, { k: "weak", n: 1, g: ["stones"] },
    { k: "mock", n: 1 }, { k: "allknow" }, { k: "misslog" }, { k: "final" }];
  [60, 90, 120, 135, 180, 240, 300].forEach((M) => [2, 3, 4].forEach((pace) => kinds.forEach((e) => {
    const d = I.iseDayPlan(e, M, pace, ctx);
    const r = d.steps.filter((s) => s.t === "Re-read misses from the last 2 days (4)");
    assert.equal(r.length, 1, e.k + " " + M + " R step");
    assert.equal(r[0].m, d.R);
    assert.ok(d.steps.every((s) => typeof s.t === "string" && s.t.length > 0 && (s.m === null || (typeof s.m === "number" && s.m >= 0))));
    const sum = d.steps.reduce((a, s) => a + (s.m || 0), 0);
    if (M >= 120) assert.ok(sum <= M + 15, e.k + " " + M + "/" + pace + " steps sum " + sum);
  })));
  const b1 = I.iseDayPlan(blk([F("ston1")]), 135, 3, ctx);
  assert.ok(b1.steps.some((s) => s.t === "25 UWorld questions, tutor mode, read every critique" && s.m === 75));
  assert.ok(b1.steps.some((s) => s.t === "Deep Dive: Medical Management of Urolithiasis"));
  const v2 = I.iseDayPlan(blk([F("void2")]), 240, 3);
  assert.ok(v2.steps.some((s) => s.t === "Lecture: BPH: Medical Treatment" && s.m === 45));
  assert.ok(I.iseDayPlan(blk([F("ston1")]), 135, 3, { recentMisses: 16 }).steps.some((s) => s.t.indexOf("Anki") >= 0));
  assert.ok(I.iseDayPlan(blk([F("ston1")]), 135, 3).steps[0].t.indexOf("Re-read") === 0);
  assert.deepEqual(I.iseDayPlan({ k: "rest" }, 120, 3).q, 0);
  assert.deepEqual(I.iseDayPlan({ k: "exam" }, 120, 3).steps, [{ t: "ISE today. Good luck.", m: null }]);
  assert.deepEqual(I.iseDayPlan(null, 0, 3).steps, []);
});

test("18 iseNorm: null, {}, junk all give the full defaults; idempotent", () => {
  const D = { kind: "uroISE", v: 1, cfg: null, built: null, plan: [], cut: [], light: [], done: {}, log: {}, misses: [], shuffles: [] };
  assert.deepEqual(I.iseNorm(null), D);
  assert.deepEqual(I.iseNorm({}), D);
  assert.deepEqual(I.iseNorm(freeze({ kind: "uroISE", log: null, misses: "x", cfg: { off: "x" } })), D);
  assert.deepEqual(I.iseNorm("x"), D); assert.deepEqual(I.iseNorm([1]), D);
  assert.deepEqual(I.iseNorm({ kind: "other", log: { "2026-11-02": { q: 5 } } }), D);
  const ise = setup(C({ off: [3], skip: ["2026-11-10"], boost: { stones: 1 } }), "2026-11-02", { pros1: true });
  const withLog = freeze(I.iseApplyLog(ise, "2026-11-02", { q: 20, pct: 70, floor: false, t: 20, k: "block", b: ["void1"], g: "void", ts: 9, rw: 1 }, { void1: true }));
  const n1 = I.iseNorm(withLog);
  assert.deepEqual(n1, withLog);
  assert.deepEqual(I.iseNorm(JSON.parse(JSON.stringify(n1))), n1);
  const c = I.iseNorm({ kind: "uroISE", cfg: { exam: "2026-11-21", minsWk: 999, off: [1, 9, "x", 1], skip: ["bad", "2026-11-03"], pace: 7, qbank: "", boost: { nope: 1, kid: 1 } } }).cfg;
  assert.deepEqual(c, { exam: "2026-11-21", minsWk: 360, minsWe: 180, off: [1], skip: ["2026-11-03"], pace: 3, qbank: "SASP", boost: { kid: 1 } });
});

test("19 iseMerge: newer built wins plan, log by ts, done union, misses dedup", () => {
  const a = freeze(Object.assign({}, setup(C({ minsWk: 90 }), "2026-11-03"), {
    log: { "2026-11-03": { q: 10, pct: 50, floor: false, t: 20, k: "block", b: [], g: "void", ts: 10, rw: 0 } },
    done: { void1: "2026-11-03" },
    misses: [{ id: "m1", d: "2026-11-03", g: "void", t: "rule A" }], shuffles: ["2026-11-03"] }));
  const b = freeze(Object.assign({}, setup(C({ minsWk: 150 }), "2026-11-05"), {
    log: { "2026-11-03": { q: 20, pct: 60, floor: false, t: 20, k: "block", b: [], g: "void", ts: 5, rw: 0 },
      "2026-11-05": { q: 30, pct: 80, floor: false, t: 30, k: "block", b: [], g: "peds", ts: 20, rw: 1 } },
    done: { void1: "pre", peds1: "2026-11-05" },
    misses: [{ id: "m1", d: "2026-11-03", g: "void", t: "rule A" }, { id: "m2", d: "2026-11-03", g: "void", t: "rule A" },
      { id: "m3", d: "2026-11-01", g: "peds", t: "rule B" }], shuffles: ["2026-11-05"] }));
  const m = I.iseMerge(a, b);
  assert.equal(m.cfg.minsWk, 150); assert.equal(m.built, "2026-11-05");
  assert.deepEqual(m.plan, b.plan);
  assert.equal(m.log["2026-11-03"].q, 10); assert.equal(m.log["2026-11-05"].q, 30);
  assert.deepEqual(m.done, { void1: "pre", peds1: "2026-11-05" });
  assert.deepEqual(m.misses.map((x) => x.id), ["m3", "m1"]);
  assert.deepEqual(m.shuffles, ["2026-11-03", "2026-11-05"]);
  assert.equal(I.iseMerge(b, a).cfg.minsWk, 150, "order-independent winner");
  const noCfg = freeze(Object.assign({}, blank(), { built: "2026-11-09", log: {} }));
  assert.equal(I.iseMerge(a, noCfg).cfg.minsWk, 90, "side without cfg loses even if newer");
  assert.equal(m.kind, "uroISE");
});

test("20 property sweep: -2..60 days x 11 x 11 minutes", () => {
  const mins = [0, 30, 45, 60, 90, 120, 135, 150, 180, 240, 300];
  let n = 0, fails = 0, maxMs = 0, nonMono = 0, monoN = 0, first = "";
  const t0 = Date.now();
  for (let dl = -2; dl <= 60; dl++) for (let a = 0; a < mins.length; a++) for (let b = 0; b < mins.length; b++) {
    const from = I.iseAdd("2026-11-21", -dl), cfg = C({ minsWk: mins[a], minsWe: mins[b] });
    const t = Date.now(); const r = I.buildIsePlan(cfg, H0, from); maxMs = Math.max(maxMs, Date.now() - t); n++;
    const bad = [];
    r.plan.forEach((e, i) => { if (i && e.d <= r.plan[i - 1].d) bad.push("order"); if (e.d > cfg.exam) bad.push("after exam"); });
    if (dl >= 1) {
      const seen = placedOnce(r.plan, r.cut);
      I.ISE_BLOCKS.forEach((bk) => { if (seen[bk.id] !== 1) bad.push("block " + bk.id + " x" + seen[bk.id]); });
      const L = r.plan[r.plan.length - 1];
      if (L.k !== "exam" || L.d !== cfg.exam) bad.push("no exam");
      if (dl >= 2 && r.plan[r.plan.length - 2].k !== "rest") bad.push("no rest");
    } else if (r.plan.length) bad.push("plan for passed exam");
    const ks = r.plan.map((e) => e.k);
    const lastMock = ks.lastIndexOf("mock"), firstWeak = ks.indexOf("weak");
    if (firstWeak >= 0 && lastMock > firstWeak) bad.push("mock after weak");
    const fin = Math.max(ks.indexOf("final"), ks.indexOf("allknow"));
    if (fin >= 0 && ks.slice(fin + 1).some((k) => ["misslog", "rest", "exam"].indexOf(k) < 0)) bad.push("content after final");
    r.plan.forEach((e, i) => (e.it || []).forEach((x) => {
      if (x.part !== 1) return;
      const later = r.plan.slice(i + 1).filter((m) => m.k === "block")[0];
      if (!later || !later.it.some((y) => y.b === x.b && y.part === 2)) bad.push("orphan part " + x.b + " " + e.d);
    }));
    if (maxMs >= 20) bad.push("slow " + maxMs + "ms");
    if (bad.length) { fails++; if (!first) first = from + " " + mins[a] + "/" + mins[b] + ": " + bad.slice(0, 3).join("; "); }
    if (a < mins.length - 1 && dl >= 1) {
      const r2 = I.buildIsePlan(C({ minsWk: mins[a + 1], minsWe: mins[b] }), H0, from);
      monoN++;
      if (r2.cut.length + 0.5 * r2.light.length > r.cut.length + 0.5 * r.light.length + 1e-9) nonMono++;
    }
    // every 9th config: the full app flow must not throw and every study day keeps its miss-review step
    if (n % 9 === 0 && dl >= 1) {
      const ise = freeze(I.iseSetup(blank(), cfg, {}, from));
      const st = I.iseStatus(ise, from);
      r.plan.forEach((e) => {
        const res = I.iseResolve(ise, e.d, st, from);
        if (res.k !== e.k && !(e.k === "buffer" && res.k === "catchup")) bad.push("resolve kind " + e.d);
        if (["rest", "exam"].indexOf(res.k) < 0 && !res.steps.some((s) => s.t.indexOf("Re-read") === 0 && s.m === res.R)) bad.push("no R step " + e.d);
      });
      I.iseTodaySummary(ise, from); I.iseProgress(ise, from);
      if (bad.length && !first) { fails++; first = from + " " + mins[a] + "/" + mins[b] + ": " + bad[0]; }
    }
  }
  assert.equal(n, 7623);
  assert.equal(fails, 0, first);
  return n + " configs, 0 failures, max " + maxMs + " ms/build, total " + (Date.now() - t0) + " ms; non-monotone (reported only) " + nonMono + "/" + monoN;
});

// ---- extra coverage for the rest of the contract ----
test("21 iseParseMisses / iseAddMisses / iseDelMiss / iseRecentMisses", () => {
  const three = "Misses from today:\n- Cystine: hexagonal\n  - Uric acid: alkalinize\n- Struvite: urease splitters\n";
  const ms = I.iseParseMisses(three, "stones", "2026-11-03", "m1");
  assert.deepEqual(ms.map((m) => m.id), ["m1_0", "m1_1", "m1_2"]);
  assert.deepEqual(ms.map((m) => m.t), ["Cystine: hexagonal", "Uric acid: alkalinize", "Struvite: urease splitters"]);
  assert.ok(ms.every((m) => m.g === "stones" && m.d === "2026-11-03"));
  assert.deepEqual(I.iseParseMisses("  - one bullet only  ", null, "2026-11-03", "x"), [{ id: "x_0", d: "2026-11-03", g: "mixed", t: "- one bullet only" }]);
  assert.deepEqual(I.iseParseMisses("   \n ", "void", "2026-11-03", "x"), []);
  let ise = setup(C(), "2026-11-02");
  ise = freeze(I.iseAddMisses(ise, ms));
  ise = freeze(I.iseAddMisses(ise, [{ id: "z", d: "2026-11-01", g: "void", t: "older" }, ms[0]]));
  assert.deepEqual(ise.misses.map((m) => m.id), ["z", "m1_0", "m1_1", "m1_2"]);
  assert.equal(I.iseRecentMisses(ise.misses, "2026-11-04").length, 3);
  assert.equal(I.iseRecentMisses(ise.misses, "2026-11-06").length, 0);
  ise = freeze(I.iseDelMiss(ise, "m1_1"));
  assert.deepEqual(ise.misses.map((m) => m.id), ["z", "m1_0", "m1_2"]);
  assert.equal(I.iseResolve(ise, "2026-11-04", null, "2026-11-04").steps[0].t, "Re-read misses from the last 2 days (2)");
});

test("22 iseDefaultTicks / iseApplyLog: defaults, part-2 only, untick deletes", () => {
  const cfg = C({ minsWk: 60, minsWe: 90 });
  const ise = setup(cfg, "2026-10-01");
  const p1 = ise.plan.find((e) => e.k === "block" && e.it[0].part === 1), p2 = ise.plan.find((e) => e.k === "block" && e.it[0].part === 2);
  const r1 = I.iseResolve(ise, p1.d, null, p1.d), r2 = I.iseResolve(ise, p2.d, null, p2.d);
  assert.deepEqual(I.iseDefaultTicks(r1, null), {}, "part 1 offers no tick");
  const b = p2.it[0].b;
  assert.equal(I.iseDefaultTicks(r2, null)[b], true);
  assert.equal(I.iseDefaultTicks(r2, { q: 5, t: 10, floor: false })[b], false, "q < 0.6t");
  assert.equal(I.iseDefaultTicks(r2, { q: 10, t: 10, floor: true })[b], false, "floor starts unticked");
  const entry = { q: 10, pct: 70, floor: false, t: 10, k: "block", b: [b], g: I.ISE_BY_ID[b].g, ts: 7, rw: 0 };
  const after = freeze(I.iseApplyLog(ise, p2.d, entry, { [b]: true }));
  assert.equal(after.done[b], p2.d); assert.equal(after.log[p2.d], entry);
  assert.equal(ise.done[b], undefined, "input not mutated");
  const r2b = I.iseResolve(after, p2.d, null, p2.d);
  assert.equal(I.iseDefaultTicks(r2b, after.log[p2.d])[b], true, "existing tick stays on");
  const unt = I.iseApplyLog(after, p2.d, entry, { [b]: false });
  assert.equal(unt.done[b], undefined);
  const pre = freeze(Object.assign({}, after, { done: { [b]: "pre" } }));
  assert.equal(I.iseApplyLog(pre, p2.d, entry, { [b]: false }).done[b], "pre", "untick only removes this date's tick");
  assert.deepEqual(I.iseDefaultTicks(I.iseResolve(ise, "2026-11-14", null, "2026-10-01"), null), {}, "no ticks on a non-block day");
});

test("23 iseSetSkip: can't-study day reshuffles from today and is reversible", () => {
  const ise = setup(C(), "2026-11-02");
  const { next, diff } = I.iseSetSkip(ise, "2026-11-04", true, "2026-11-02");
  assert.deepEqual(next.cfg.skip, ["2026-11-04"]);
  assert.equal(ent(next.plan, "2026-11-04"), undefined);
  assert.equal(I.iseResolve(next, "2026-11-04", null, "2026-11-02").k, "off");
  assert.ok(diff.moved > 0 && diff.preview.length === 3);
  assert.deepEqual(ise.cfg.skip, [], "input untouched");
  const back = I.iseSetSkip(freeze(next), "2026-11-04", false, "2026-11-02").next;
  assert.deepEqual(back.cfg.skip, []);
  assert.deepEqual(back.plan, ise.plan);
  const w = I.iseWhatIfs(freeze(next), "2026-11-02");
  assert.ok(w.every((x) => typeof x.label === "string" && x.next && typeof x.cutN === "number"));
});

test("24 iseResolve / iseTodaySummary / iseStatus fields on a normal plan", () => {
  const ise = setup(C(), "2026-11-02");
  const st = I.iseStatus(ise, "2026-11-04");
  assert.equal(st.state, "behind", "nothing logged 11-02/03");
  const on = withFields(ise, { done: { void1: "2026-11-02", peds1: "2026-11-03" } });
  const st2 = I.iseStatus(on, "2026-11-04");
  assert.equal(st2.state, "on"); assert.equal(st2.daysLeft, 17);
  assert.equal(st2.studyLeft, 16, "11-04..11-19, today unlogged counts");
  const r = I.iseResolve(on, "2026-11-04", st2, "2026-11-04");
  assert.equal(r.k, "block"); assert.equal(r.kindLabel, "Content"); assert.deepEqual(r.groups, ["stones"]);
  assert.deepEqual(r.know, ["stones"]); assert.equal(r.read[0], I.ISE_GROUPS.stones.read);
  assert.deepEqual(r.topics, I.ISE_BY_ID.ston1.topics); assert.equal(r.q, 20); assert.equal(r.M, 120);
  const s = I.iseTodaySummary(on, "2026-11-04");
  assert.equal(s.line, "17 days · today: Stones 1 · 20 SASP Qs");
  assert.equal(s.hub, "ISE: Stones 1 · 20 SASP Qs today");
  assert.equal(s.q, 20);
  const fin = I.iseResolve(on, "2026-11-19", st2, "2026-11-04");
  assert.equal(fin.k, "final");
  assert.deepEqual(fin.know.slice(0, 2), ["penile", "adrenal"], "cut groups' Know-cold first");
  assert.equal(fin.know.length, 18);
  const wk = I.iseResolve(on, "2026-11-18", st2, "2026-11-04");
  assert.equal(wk.k, "weak"); assert.equal(wk.groups.length, 1); assert.equal(wk.mode, "mastery");
  assert.equal(I.iseResolve(on, "2026-10-01", st2, "2026-11-04").k, "none");
  assert.equal(I.iseResolve(blank(), "2026-11-04", null, "2026-11-04").k, "none");
  assert.equal(I.iseTodaySummary(blank(), "2026-11-04"), null);
  const offIse = setup(C({ off: [3] }), "2026-11-02");
  const offR = I.iseResolve(offIse, "2026-11-04", null, "2026-11-04");
  assert.equal(offR.k, "off"); assert.equal(offR.kindLabel, "Off"); assert.equal(offR.q, 0);
  // ahead: tomorrow's block already covered
  const ahead = withFields(on, { done: { void1: "2026-11-02", peds1: "2026-11-03", pros1: "2026-11-04" } });
  const sa = I.iseStatus(ahead, "2026-11-04");
  assert.equal(sa.state, "ahead"); assert.deepEqual(sa.aheadDays, ["2026-11-05"]);
  assert.equal(I.iseResolve(ahead, "2026-11-05", sa, "2026-11-04").k, "buffer");
  const logged = withFields(on, { log: { "2026-11-04": { q: 20, pct: 75, floor: false, t: 20, k: "block", b: ["ston1"], g: "stones", ts: 3, rw: 1 } } });
  assert.equal(I.iseTodaySummary(logged, "2026-11-04").hub, "ISE: Stones 1 · done today ✓");
});

test("25 iseProgress and iseWeakGroups", () => {
  const ise = withFields(setup(C(), "2026-11-02"), {
    done: { void1: "2026-11-02" },
    log: { "2026-11-02": { q: 20, pct: 90, floor: false, t: 20, k: "block", b: ["void1"], g: "void", ts: 1, rw: 1 },
      "2026-11-03": { q: 20, pct: 40, floor: false, t: 20, k: "block", b: [], g: "peds", ts: 2, rw: 1 },
      "2026-11-04": { q: 8, pct: 10, floor: false, t: 20, k: "block", b: [], g: "stones", ts: 3, rw: 0 } },
    misses: [{ id: "a", d: "2026-11-03", g: "kid", t: "x" }, { id: "b", d: "2026-11-03", g: "kid", t: "y" }, { id: "c", d: "2026-10-01", g: "pen", t: "old" }] });
  const p = I.iseProgress(ise, "2026-11-05");
  assert.deepEqual(p.groups.slice(0, 2).map((g) => [g.g, g.pct]), [["peds", 40], ["void", 90]]);
  assert.equal(p.groups.find((g) => g.g === "stones").pct, null, "under 10 Qs");
  assert.deepEqual(p.groups.find((g) => g.g === "void"), { g: "void", label: "Voiding", tier: "HIGH", q: 20, pct: 90, done: 1, total: 2 });
  assert.equal(p.groups.length, 14);
  assert.deepEqual(p.last14.map((x) => [x.d, x.q, x.t, x.met]), [["2026-11-02", 20, 20, true], ["2026-11-03", 20, 20, true], ["2026-11-04", 8, 20, false]]);
  assert.deepEqual(p.mocks, []);
  const wg = I.iseWeakGroups(ise.log, ise.misses, "2026-11-05");
  assert.deepEqual(wg.slice(0, 3), ["peds", "void", "kid"]);
});

console.log((failed ? "FAILED " : "OK ") + passed + " passed, " + failed + " failed");
process.exit(failed ? 1 : 0);
