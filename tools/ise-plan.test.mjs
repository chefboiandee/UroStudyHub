// Unit tests for the In-Service Exam sprint planner (the ISE-LOGIC block of UroStudyHub.html).
// Dependency-free. Run in three time zones:
//   TZ=America/New_York node tools/ise-plan.test.mjs
//   TZ=UTC node tools/ise-plan.test.mjs
//   TZ=Pacific/Auckland node tools/ise-plan.test.mjs
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
  "iseRecentMisses", "iseNowYmd", "iseHas", "iseCap", "iseMissWindow", "iseAnyMisses", "iseDayCtx", "iseUncover", "iseNewSprint",
  "iseStart", "iseLoopTopic", "iseTailOf", "iseResumeIds"];
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
const TAILK = ["mock", "weak", "allknow", "misslog", "final"];
const tailOf = (plan, from) => plan.filter((e) => e.d >= from && TAILK.indexOf(e.k) >= 0).map((e) => e.d + ":" + e.k);
const stepSum = (d) => d.steps.reduce((a, s) => a + (s.m || 0), 0);
// logs day d the way IseLogForm does (target t = the day's q, default ticks); q defaults to the target
function logDay(ise, d, today, q, opts) {
  opts = opts || {};
  const st = I.iseStatus(ise, today), res = I.iseResolve(ise, d, st, today), t = res.q || 0, qq = q == null ? t : q;
  const defs = I.iseDefaultTicks(res, { q: qq, t, floor: !!opts.floor, k: res.k });
  const tk = {}; (res.items || []).filter((x) => x.part !== 1).forEach((x) => { tk[x.b] = defs[x.b] === true; });
  const entry = { q: qq, pct: opts.pct == null ? 70 : opts.pct, floor: !!opts.floor, t, k: res.k, b: (res.items || []).map((x) => x.b),
    g: res.groups[0] || null, gs: res.groups.slice(), ts: opts.ts || 1, rw: 0 };
  return freeze(I.iseApplyLog(ise, d, entry, tk));
}
// a part 1 on one block day immediately followed (next block day) by a mock before its part 2
const straddles = (plan) => {
  let n = 0;
  plan.forEach((e, i) => (e.it || []).forEach((x) => {
    if (x.part !== 1) return;
    for (let j = i + 1; j < plan.length; j++) { if (plan[j].k === "mock") { n++; break; } if (plan[j].k === "block") break; }
  }));
  return n;
};

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
  // the clock is read in exactly one place: iseNowYmd (4 am day start)
  const clockLines = BLOCK.split("\n").filter((l) => /Date\.now|new Date\(\)/.test(l));
  assert.deepEqual(clockLines.map((l) => l.trim()), ["function iseNowYmd() { return iseYmd(new Date(Date.now() - 4 * 3600e3)); }"], "clock read outside iseNowYmd");
  const rest = BLOCK.split("\n").filter((l) => clockLines.indexOf(l) < 0).join("\n");
  const bad = [SLASH_STAR, BACKTICK, BOXBAR, ".at(", "hasOwn", "structuredClone", "findLast", "toSorted", "Date.now", "Math.random", "toISOString", "new Date()", "localStorage", "AUA_"]
    .filter((s) => rest.indexOf(s) >= 0);
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

test("8 two study days (from 11-18): 1 content day of top blocks light, then the final review, rest, exam", () => {
  // CHANGED deliberately (c-6): a final day exists whenever S >= 1, so the cut blocks' Know-cold lists really land on a day.
  // Before: [block, block, rest, exam] with 4 lights and 19 cut and no final day at all.
  const r = I.buildIsePlan(C(), H0, "2026-11-18");
  assert.deepEqual(r.plan.map((e) => e.k), ["block", "final", "rest", "exam"]);
  assert.equal(ent(r.plan, "2026-11-19").k, "final");
  const items = r.plan[0].it;
  assert.ok(items.every((x) => x.lvl === "light"), "all light");
  assert.deepEqual(items.map((x) => x.b), ["void1", "peds1"]);
  assert.equal(r.cut.length, 21);
  return "CHANGED (c-6): final day on 11-19 instead of a second content day; light " + items.map((x) => x.b).join(",") + ", 21 cut";
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
  // CHANGED deliberately (c-23): with no misses logged yet the miss-review minutes go to questions (R = 0): 30, not 25
  assert.equal(res.R, 0); assert.equal(res.q, 30); assert.equal(res.steps[0].t, "Catch-up: " + I.ISE_BY_ID.ston1.label);
  const withMiss = withFields(ise, { misses: [{ id: "m", d: "2026-10-22", g: "void", t: "a rule" }] });
  const resM = I.iseResolve(withMiss, "2026-10-27", st, "2026-10-24");
  assert.equal(resM.R, 15); assert.equal(resM.q, 25, "the old 25 when there is a miss log to re-read");
  assert.deepEqual(I.iseDefaultTicks(res, null), { ston1: true });
  assert.equal(I.iseResolve(ise, "2026-11-13", st, "2026-10-24").k, "buffer");
  return "CHANGED (c-23): q 30 with no misses yet (R 0), 25 once a miss exists";
});

test("10 behind by 4 days: 6 behind, reshuffle restores order, keeps both mocks, cuts 10, what-ifs", () => {
  // CHANGED deliberately (c-0/c-21): the taper is fixed once built, so this reshuffle keeps BOTH mocks (11-14, 11-15).
  // Before: one mock (spec example 3) and 9 cut with void1/peds1/ston1 full on 11-09..11-11. Now the second mock
  // costs content: 10 cut, and peds1 + ston1 come back light together on 11-10. Hub wording: "tap to catch up".
  const cfg = C();
  const ise = setup(cfg, "2026-11-05");
  assert.deepEqual(ise.plan, I.buildIsePlan(cfg, H0, "2026-11-05").plan);
  const st = I.iseStatus(ise, "2026-11-09");
  assert.equal(st.state, "behind");
  assert.equal(st.behind.length, 6); assert.equal(st.unabsorbed, 6);
  assert.deepEqual(st.behind, ["void1", "peds1", "ston1", "pros1", "tes1", "peds2"]);
  const next = freeze(I.iseReshuffle(ise, "2026-11-09"));
  assert.deepEqual(next.plan.filter((e) => e.d < "2026-11-09"), ise.plan.filter((e) => e.d < "2026-11-09"));
  assert.deepEqual(ent(next.plan, "2026-11-09").it, [{ b: "void1", lvl: "full", part: 0 }]);
  assert.deepEqual(ent(next.plan, "2026-11-10").it.map((x) => x.b), ["peds1", "ston1"]);
  assert.deepEqual(tailOf(next.plan, "2026-11-09"), tailOf(ise.plan, "2026-11-09"), "tail untouched");
  assert.deepEqual(datesOf(next.plan, "mock"), ["2026-11-14", "2026-11-15"]);
  assert.equal(next.cut.length, 10);
  assert.deepEqual(next.shuffles, ["2026-11-09"]);
  assert.equal(next.built, "2026-11-09");
  const seen = placedOnce(next.plan.filter((e) => e.d >= "2026-11-09"), next.cut);
  I.ISE_BLOCKS.forEach((b) => assert.equal(seen[b.id], 1, b.id));
  const st2 = I.iseStatus(next, "2026-11-09");
  assert.equal(st2.behind.length, 0); assert.equal(st2.state, "on");
  const diff = I.iseDiffPlans(ise, next, "2026-11-09");
  assert.deepEqual(diff.back.map((x) => x.b).sort(), st.behind.slice().sort());
  assert.deepEqual(diff.back[0], { b: "void1", d: "2026-11-09" });
  assert.deepEqual(diff.cut, ["bs2", "andr2", "inf1", "pros2"]);
  assert.deepEqual(diff.uncut, []);
  assert.deepEqual(diff.tail, [], "no tail change to report");
  assert.deepEqual(diff.preview.map((e) => e.d), ["2026-11-09", "2026-11-10", "2026-11-11"]);
  const w = I.iseWhatIfs(ise, "2026-11-09");
  assert.ok(w.length >= 1);
  assert.deepEqual(w[0].over, { minsWk: 150 }); assert.equal(w[0].cutN, 7);
  assert.equal(w[0].label, "+30 min on weekdays → 7 cut, 11 light");
  assert.ok(!w.some((x) => x.over.minsWk === 180), "+60 weekdays should merge into +30");
  w.forEach((x) => assert.ok(x.cutN + 0.5 * x.lightN < next.cut.length + 0.5 * next.light.length));
  const sum = I.iseTodaySummary(ise, "2026-11-09");
  assert.equal(sum.hub, "ISE plan: 6 blocks behind — tap to catch up");
  assert.equal(sum.line, "6 blocks behind: tap to reshuffle");
  return "CHANGED (c-0, c-24, hub): 2 mocks kept, 10 cut; " + w.map((x) => x.label).join(" | ");
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
  // CHANGED deliberately (c-4, c-10): two new fields, prefs (settings kept for the next sprint) and builtTs (merge recency)
  const D = { kind: "uroISE", v: 1, cfg: null, prefs: null, built: null, builtTs: 0, since: null, plan: [], cut: [], light: [], done: {}, log: {}, misses: [], shuffles: [] };
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
  // CHANGED deliberately (c-4): the logged 11-03 keeps a's entry (a's log won that date) and a's 11-04 entry stays,
  // because b's plan only starts on 11-05; b (more recent) gives everything from 11-05 on. Before: m.plan === b.plan.
  assert.deepEqual(m.plan, a.plan.filter((e) => e.d < "2026-11-05").concat(b.plan));
  assert.equal(I.iseResolve(m, "2026-11-03", null, "2026-11-05").k, "block", "history still resolves");
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
    let t = Date.now(); const r = I.buildIsePlan(cfg, H0, from); let ms = Date.now() - t; n++;
    if (ms >= 20) { t = Date.now(); I.buildIsePlan(cfg, H0, from); ms = Math.min(ms, Date.now() - t); } // a GC pause is not a slow build
    maxMs = Math.max(maxMs, ms);
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
        // CHANGED deliberately (c-23): with no misses yet the step says so and R is 0 (its minutes go to questions)
        if (["rest", "exam"].indexOf(res.k) < 0 && !res.steps.some((s) => (s.t.indexOf("Re-read") === 0 && s.m === res.R) ||
          (res.R === 0 && s.t === "No misses yet: put these minutes into questions"))) bad.push("no R step " + e.d);
        if (stepSum(res) > res.M + 5 && ["rest", "exam", "off"].indexOf(res.k) < 0) bad.push("loop over M+5 " + e.d);
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
  // CHANGED deliberately (c-27): a paste with a non-bullet line is now ONE miss (nothing dropped); a single "- x" loses its dash.
  const mixedPaste = "Misses from today:\n- Cystine: hexagonal\n  - Uric acid: alkalinize\n- Struvite: urease splitters\n";
  assert.deepEqual(I.iseParseMisses(mixedPaste, "stones", "2026-11-03", "h").map((m) => m.t), [mixedPaste.trim()]);
  const three = "- Cystine: hexagonal\n  - Uric acid: alkalinize\n\n- Struvite: urease splitters\n";
  const ms = I.iseParseMisses(three, "stones", "2026-11-03", "m1");
  assert.deepEqual(ms.map((m) => m.id), ["m1_0", "m1_1", "m1_2"]);
  assert.deepEqual(ms.map((m) => m.t), ["Cystine: hexagonal", "Uric acid: alkalinize", "Struvite: urease splitters"]);
  assert.ok(ms.every((m) => m.g === "stones" && m.d === "2026-11-03"));
  assert.deepEqual(I.iseParseMisses("  - one bullet only  ", null, "2026-11-03", "x"), [{ id: "x_0", d: "2026-11-03", g: "mixed", t: "one bullet only" }]);
  assert.deepEqual(I.iseParseMisses("   \n ", "void", "2026-11-03", "x"), []);
  let ise = setup(C(), "2026-11-02");
  ise = freeze(I.iseAddMisses(ise, ms));
  ise = freeze(I.iseAddMisses(ise, [{ id: "z", d: "2026-11-01", g: "void", t: "older" }, ms[0]]));
  assert.deepEqual(ise.misses.map((m) => m.id), ["z", "m1_0", "m1_1", "m1_2"]);
  // CHANGED deliberately (c-23): the window is the last two miss dates before d (+ d), so a gap no longer hides them
  assert.equal(I.iseRecentMisses(ise.misses, "2026-11-04").length, 4);
  assert.equal(I.iseRecentMisses(ise.misses, "2026-11-06").length, 4, "two days later the 11-01 and 11-03 misses still count");
  ise = freeze(I.iseDelMiss(ise, "m1_1"));
  assert.deepEqual(ise.misses.map((m) => m.id), ["z", "m1_0", "m1_2"]);
  assert.equal(I.iseResolve(ise, "2026-11-04", null, "2026-11-04").steps[0].t, "Re-read misses since Sun 11/1 (3)");
  return "CHANGED (c-27, c-23): mixed paste = 1 miss; window counts 4 on 11-04 and 11-06";
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
  // CHANGED deliberately (c-23): no misses yet, so R = 0 and the 10 minutes go to questions: 25, not 20
  assert.deepEqual(r.topics, I.ISE_BY_ID.ston1.topics); assert.equal(r.q, 25); assert.equal(r.R, 0); assert.equal(r.M, 120);
  assert.deepEqual(r.loopTopics, ["Medical Management of Urolithiasis"]);
  assert.deepEqual(r.readG, [{ g: "stones", label: "Stones", read: I.ISE_GROUPS.stones.read }]);
  const s = I.iseTodaySummary(on, "2026-11-04");
  assert.equal(s.line, "17 days · today: Stones 1 · 25 SASP Qs");
  assert.equal(s.hub, "ISE: Stones 1 · 25 SASP Qs today");
  assert.equal(s.q, 25);
  const onM = withFields(on, { misses: [{ id: "m", d: "2026-11-03", g: "peds", t: "a rule" }] });
  assert.equal(I.iseTodaySummary(onM, "2026-11-04").q, 20, "the old 20 once there is a miss to re-read");
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
  return "CHANGED (c-23): 25 Qs with no misses yet (20 with one)";
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

// ---- review fixes (ids refer to the review findings: c-n confirmed, s-n split) ----
test("26 c-0/c-21 the taper is fixed once built: a diligent user can reshuffle any day and keep every tail day", () => {
  let ise = setup(C(), "2026-11-02"), chained = ise;
  const built = tailOf(ise.plan, "2026-11-02");
  assert.deepEqual(built, ["2026-11-14:mock", "2026-11-15:mock", "2026-11-18:weak", "2026-11-19:final"]);
  for (let d = "2026-11-02"; d <= "2026-11-19"; d = I.iseAdd(d, 1)) {
    const r = I.iseReshuffle(ise, d), rc = freeze(I.iseReshuffle(chained, d));
    assert.deepEqual(tailOf(r.plan, d), tailOf(ise.plan, d), "plain reshuffle on " + d);
    assert.deepEqual(tailOf(rc.plan, d), built.filter((x) => x >= d), "chained reshuffles on " + d);
    assert.deepEqual(I.iseDiffPlans(ise, r, d).tail, [], "no tail line on " + d);
    ise = logDay(ise, d, d); chained = logDay(rc, d, d);
  }
  // s7 replica: everything covered through 11-17, reshuffle on the weak day keeps weak + final, pen1/pros3 stay cut
  let s7 = setup(C(), "2026-11-02");
  for (let d = "2026-11-02"; d <= "2026-11-17"; d = I.iseAdd(d, 1)) s7 = logDay(s7, d, d, 40);
  const r18 = I.iseReshuffle(s7, "2026-11-18");
  assert.deepEqual(tailOf(r18.plan, "2026-11-18"), ["2026-11-18:weak", "2026-11-19:final"]);
  assert.deepEqual(r18.cut.slice().sort(), ["pen1", "pros3"]);
  // s6 replica: covered through 11-13; on the mock day 11-14, Can't study Mon 11-16 keeps both mocks (content pays)
  let s6 = setup(C(), "2026-11-02");
  for (let d = "2026-11-02"; d <= "2026-11-13"; d = I.iseAdd(d, 1)) s6 = logDay(s6, d, d, 40);
  const sk = I.iseSetSkip(s6, "2026-11-16", true, "2026-11-14");
  assert.deepEqual(tailOf(sk.next.plan, "2026-11-14"), ["2026-11-14:mock", "2026-11-15:mock", "2026-11-18:weak", "2026-11-19:final"]);
  assert.deepEqual(sk.diff.tail, []);
  // iseSetSkip on a content day keeps both mocks; on a mock day the mock moves to the nearest earlier free study day
  const base = setup(C(), "2026-11-02");
  assert.deepEqual(datesOf(I.iseSetSkip(base, "2026-11-04", true, "2026-11-02").next.plan, "mock"), ["2026-11-14", "2026-11-15"]);
  const mv = I.iseSetSkip(base, "2026-11-15", true, "2026-11-10");
  assert.deepEqual(datesOf(mv.next.plan, "mock"), ["2026-11-13", "2026-11-14"]);
  assert.deepEqual(mv.diff.tail, ["Mocks: Sun 11/15 → Fri 11/13"]);
  return "tail identical on every reshuffle 11-02..11-19; a skipped mock day moves (diff: " + mv.diff.tail[0] + ")";
});

test("27 c-0/c-21 the kept tail shrinks only when blocks are behind and < 2 content days remain; diff.tail lines", () => {
  const ise = setup(C(), "2026-11-02");                  // nothing logged: everything is behind later on
  const r17 = I.iseReshuffle(ise, "2026-11-17");          // study 17, 18, 19 with weak + final kept = 1 content day
  assert.deepEqual(tailOf(r17.plan, "2026-11-17"), ["2026-11-19:final"]);
  assert.deepEqual(I.iseDiffPlans(ise, r17, "2026-11-17").tail, ["Weak-spots days: 1 → 0 (Wed 11/18 becomes a content day)"]);
  const r14 = I.iseReshuffle(ise, "2026-11-14", { skip: ["2026-11-16", "2026-11-17"] });
  assert.deepEqual(tailOf(r14.plan, "2026-11-14"), ["2026-11-15:mock", "2026-11-19:final"]);
  assert.deepEqual(I.iseDiffPlans(ise, r14, "2026-11-14").tail,
    ["Mocks: 2 → 1 (Sat 11/14 becomes a content day)", "Weak-spots days: 1 → 0 (Wed 11/18 becomes a content day)"]);
  assert.equal(ent(r14.plan, "2026-11-15").n, 1, "the remaining mock is renumbered");
  // a changed exam date is a new taper (S-table): mocks move next to the new exam
  const moved = I.iseReshuffle(ise, "2026-11-10", { exam: "2026-12-05" });
  assert.deepEqual(datesOf(moved.plan, "mock"), ["2026-11-28", "2026-11-29"]);
  assert.equal(ent(moved.plan, "2026-12-04").k, "rest");
  // a what-if that gives back study days can keep a tail day the plain reshuffle loses
  const wed = setup(C({ off: [3] }), "2026-11-02");
  const base = I.iseReshuffle(wed, "2026-11-14");
  assert.deepEqual(I.iseDiffPlans(wed, base, "2026-11-14").tail, ["Mocks: 2 → 1 (Sat 11/14 becomes a content day)"]);
  const w = I.iseWhatIfs(wed, "2026-11-14").find((x) => x.over.off);
  assert.ok(w && w.label === "Study on Wednesdays too → 19 cut, 4 light · keeps 2 mocks", w && w.label);
  return r14.plan.filter((e) => e.d >= "2026-11-14").map((e) => e.d.slice(5) + ":" + e.k).join(" ");
});

test("28 c-1 a split block resumes at part 2 after its part 1 was logged", () => {
  const cfg = C({ minsWk: 60, minsWe: 240 });
  const built = setup(cfg, "2026-11-02");
  assert.deepEqual(ent(built.plan, "2026-11-02").it, [{ b: "void1", lvl: "full", part: 1 }]);
  const lg = logDay(built, "2026-11-02", "2026-11-02", 10);
  assert.equal(lg.done.void1, undefined, "part 1 never ticks the block");
  assert.deepEqual(I.iseResumeIds(lg, "2026-11-03"), ["void1"]);
  const p2 = (x, d) => assert.deepEqual(ent(x.plan, d).it[0], { b: "void1", lvl: "full", part: 2 }, d);
  const sameDay = I.iseSetSkip(lg, "2026-11-12", true, "2026-11-02").next;       // Can't study, same evening
  p2(sameDay, "2026-11-03");
  const tue = I.iseReshuffle(lg, "2026-11-03");                                 // part-2 day, before logging
  p2(tue, "2026-11-03");
  assert.ok(!tue.plan.some((e) => e.d >= "2026-11-03" && (e.it || []).some((x) => x.b === "void1" && x.part !== 2)), "never part 1 again");
  assert.ok(tue.cut.length + 0.5 * tue.light.length <= built.cut.length + 0.5 * built.light.length, "no worse than the build");
  const wed = I.iseReshuffle(lg, "2026-11-04");                                 // part 2 missed on 11-03: still part 2 first
  p2(wed, "2026-11-04");
  assert.ok(I.iseStatus(wed, "2026-11-04").behind.indexOf("void1") < 0);
  let daily = lg;                                                               // repeated evening reshuffles
  for (let d = "2026-11-02"; d <= "2026-11-05"; d = I.iseAdd(d, 1)) { if (d > "2026-11-02") daily = logDay(daily, d, d); daily = freeze(I.iseReshuffle(daily, d)); }
  assert.equal(daily.done.void1, "2026-11-03");
  const floorP1 = withFields(built, { log: { "2026-11-02": { q: 10, pct: 50, floor: true, t: 10, k: "block", b: ["void1"], g: "void", ts: 1, rw: 0 } } });
  assert.deepEqual(I.iseResumeIds(floorP1, "2026-11-03"), [], "a floor day did not study part 1");
  assert.deepEqual(ent(I.iseReshuffle(floorP1, "2026-11-03").plan, "2026-11-03").it[0].part, 1);
});

test("29 c-2 a failed fill retries with every long day at full cap before cutting or dropping catch-up days", () => {
  const r = I.buildIsePlan(C({ minsWk: 60, minsWe: 240 }), H0, "2026-10-12");
  assert.deepEqual(r.cut, []); assert.deepEqual(r.light, []);
  assert.equal(datesOf(r.plan, "buffer").length, 4, "all 4 catch-up days kept");
  const seen = placedOnce(r.plan, r.cut);
  I.ISE_BLOCKS.forEach((b) => assert.equal(seen[b.id], 1, b.id));
  const r2 = I.buildIsePlan(C({ minsWk: 30, minsWe: 180 }), H0, "2026-10-12");
  assert.equal(r2.cut.length, 0); assert.ok(r2.light.length <= 1);
  return "60/240 from 10-12: 0 cut, 0 light, 4 catch-up days (was 1 cut, 4 light, 0 catch-up)";
});

test("30 c-3/c-22 every loop fits in M + 5 min (M 30..360 x pace 2..4 x every kind); 5-question floor, 0 when it cannot fit", () => {
  const F = (b) => ({ b, lvl: "full", part: 0 }), Lt = (b) => ({ b, lvl: "light", part: 0 }), P = (b, n) => ({ b, lvl: "full", part: n });
  const unit = (x) => (x.lvl === "light" || x.part ? 0.5 : 1);
  const shapes = [[F("ston1")], [F("ston1"), F("pros1")], [F("andr1"), Lt("ston2")], [Lt("kid1")], [Lt("kid1"), Lt("img1")],
    [Lt("kid1"), Lt("img1"), Lt("pen1"), Lt("tes1")], [P("void1", 1)], [P("void1", 2)], [P("void1", 2), Lt("kid1")], [P("void1", 2), F("pros1")],
    [F("ston1"), Lt("kid1"), Lt("img1")]];
  const other = [{ k: "catchup", catchup: "pros1" }, { k: "buffer", catchup: "pros1" }, { k: "buffer" }, { k: "second", g: ["void", "peds"] },
    { k: "weak", n: 1, g: ["stones"] }, { k: "weak", n: 2, g: ["void", "peds"] }, { k: "mock", n: 1 }, { k: "allknow" }, { k: "misslog" },
    { k: "final" }, { k: "rest" }, { k: "off" }, { k: "exam" }];
  let n = 0, worst = -999;
  [30, 45, 60, 75, 90, 120, 135, 180, 240, 360].forEach((M) => [2, 3, 4].forEach((pace) => [{ recentMisses: 4 }, { anyMisses: false }, {}].forEach((ctx) => {
    const cap = I.iseCap(M);
    shapes.filter((s) => s.length === 1 || s.reduce((a, x) => a + unit(x), 0) <= cap + 1e-9).map((it) => ({ k: "block", it })).concat(other).forEach((e) => {
      const d = I.iseDayPlan(e, M, pace, ctx), sum = stepSum(d), tag = e.k + JSON.stringify(e.it || "") + " M" + M + " p" + pace + " " + JSON.stringify(ctx);
      n++; worst = Math.max(worst, sum - M);
      assert.ok(sum <= M + 5, tag + ": steps " + sum);
      assert.ok(d.q === 0 || (d.q >= 5 && d.q <= 75 && d.q % 5 === 0), tag + ": q " + d.q);
      if (d.q === 0 && ["block", "catchup", "buffer", "second", "weak", "allknow", "misslog", "final"].indexOf(e.k) >= 0) {
        const per = ["second", "weak", "allknow", "misslog", "final"].indexOf(e.k) >= 0 ? Math.max(2, pace - 1) : pace;
        assert.ok(sum + 5 * per > M + 5, tag + ": 0 questions although 5 fit");
      }
    });
  })));
  // a catch-up on a day under 90 min is light (Know-cold + Qs), never a whole block
  const ise = setup(C({ minsWk: 60, minsWe: 240 }), "2026-10-12");
  const st = I.iseStatus(ise, "2026-10-18"), res = I.iseResolve(ise, "2026-10-19", st, "2026-10-18");
  assert.equal(res.k, "catchup"); assert.equal(res.M, 60);
  assert.deepEqual(res.items, [{ b: "void1", lvl: "light", part: 0 }]);
  assert.deepEqual(res.loopTopics, []);
  assert.ok(stepSum(res) <= 65, "catch-up loop " + stepSum(res));
  // the pinned spec values still hold (r5 may run up to 5 over)
  assert.equal(I.iseDayPlan({ k: "block", it: [F("ston1")] }, 240, 3).q, 50);
  assert.equal(stepSum(I.iseDayPlan({ k: "block", it: [F("ston1")] }, 240, 3)), 245);
  const short = I.iseDayPlan({ k: "block", it: [P("void1", 1)] }, 30, 3);
  assert.equal(short.q, 0); assert.equal(stepSum(short), 32);
  return n + " day plans, worst " + (worst >= 0 ? "+" : "") + worst + " min vs M";
});

test("31 c-4 iseMerge: past entries follow the winning log, recency = max(builtTs, latest log ts), unticks survive, pure", () => {
  const day = (d) => I.iseDate(d).getTime() + 12 * 3600e3;
  let A = freeze(I.iseSetup(blank(), C(), {}, "2026-11-02", null, day("2026-11-02")));
  assert.equal(A.builtTs, day("2026-11-02"));
  for (let d = "2026-11-02"; d <= "2026-11-04"; d = I.iseAdd(d, 1)) A = logDay(A, d, d, 40, { ts: day(d) });
  let B = I.iseMerge(blank(), JSON.parse(JSON.stringify(A)));
  B = freeze(I.iseReshuffle(B, "2026-11-05", { minsWk: 150 }, day("2026-11-05") - 6 * 3600e3));
  assert.equal(B.builtTs, day("2026-11-05") - 6 * 3600e3);
  for (let d = "2026-11-05"; d <= "2026-11-10"; d = I.iseAdd(d, 1)) A = logDay(A, d, d, 40, { ts: day(d) });
  const aJson = JSON.stringify(A), bJson = JSON.stringify(B);
  const M = I.iseMerge(A, JSON.parse(bJson));
  assert.equal(JSON.stringify(A), aJson, "input untouched");
  assert.equal(M.cfg.minsWk, 120, "the Boox logged after the phone's rebuild, so it is the newer side");
  assert.equal(M.builtTs, A.builtTs);
  const st = I.iseStatus(M, "2026-11-11");
  assert.equal(st.state, "on"); assert.deepEqual(st.behind, []);
  ["2026-11-06", "2026-11-08"].forEach((d) => {
    assert.deepEqual(I.iseResolve(M, d, st, "2026-11-11").items.map((x) => x.b), M.log[d].b, d + " shows what was studied");
  });
  assert.deepEqual(I.iseMerge(JSON.parse(bJson), A).plan, M.plan, "order-independent");
  // a plan freshly built elsewhere keeps this copy's history
  const fresh = freeze(I.iseSetup(blank(), C(), {}, "2026-11-11", null, day("2026-11-11")));
  const M2 = I.iseMerge(A, fresh);
  assert.equal(M2.built, "2026-11-11");
  assert.equal(M2.plan[0].d, "2026-11-02");
  assert.equal(I.iseResolve(M2, "2026-11-03", null, "2026-11-11").k, "block");
  assert.ok(I.iseStatus(M2, "2026-11-11").qPlanned > 0);
  // an untick saved later on one side is not brought back by the other side's older tick
  const tickedDay = Object.keys(A.done).find((b) => A.done[b] === "2026-11-04");
  const A2 = freeze(I.iseApplyLog(A, "2026-11-04", Object.assign({}, A.log["2026-11-04"], { ts: day("2026-11-12") }), { [tickedDay]: false }));
  assert.equal(A2.done[tickedDay], undefined);
  assert.equal(I.iseMerge(A2, A).done[tickedDay], undefined);
  assert.equal(I.iseMerge(A, A2).done[tickedDay], undefined);
  // builtTs beats an older log; carried through iseNorm
  assert.equal(I.iseNorm(JSON.parse(JSON.stringify(B))).builtTs, B.builtTs);
  return "merged state on, " + Object.keys(M.log).length + " logged days kept with their own plan entries";
});

test("32 c-5 own-key checks: prototype keys never pass iseNorm and nothing throws", () => {
  assert.equal(Object.getPrototypeOf(I.ISE_BY_ID), null);
  assert.equal(I.ISE_BY_ID.constructor, undefined);
  assert.equal(I.iseHas(I.ISE_GROUPS, "toString"), false); assert.equal(I.iseHas(I.ISE_GROUPS, "void"), true);
  assert.equal(I.iseTier("constructor"), "LOW");
  const raw = JSON.parse('{"kind":"uroISE","cfg":{"exam":"2026-11-21","boost":{"__proto__":1,"constructor":1,"kid":1}},"built":"2026-11-02",' +
    '"plan":[{"d":"2026-11-03","k":"block","it":[{"b":"constructor"},{"b":"__proto__"},{"b":"toString"},{"b":"ston1"}]},' +
    '{"d":"2026-11-04","k":"block","it":[{"b":"valueOf"}]},{"d":"2026-11-05","k":"second","g":["toString","void"]}],' +
    '"cut":["valueOf","pen1"],"done":{"constructor":"pre","__proto__":"pre","pros1":"pre"},' +
    '"log":{"2026-11-01":{"q":20,"pct":50,"g":"toString","b":["toString","void1"],"gs":["constructor","peds"],"t":20}},' +
    '"misses":[{"id":"m","d":"2026-11-01","g":"constructor","t":"x"}]}');
  const v = I.iseNorm(raw);
  assert.deepEqual(v.plan, [{ d: "2026-11-03", k: "block", it: [{ b: "ston1", lvl: "full", part: 0 }] }, { d: "2026-11-05", k: "second", g: ["void"] }]);
  assert.deepEqual(v.cfg.boost, { kid: 1 });
  assert.deepEqual(v.cut, ["pen1"]);
  assert.deepEqual(Object.keys(v.done), ["pros1"]);
  assert.deepEqual(v.log["2026-11-01"].b, ["void1"]); assert.equal(v.log["2026-11-01"].g, null); assert.deepEqual(v.log["2026-11-01"].gs, ["peds"]);
  assert.equal(v.misses[0].g, "mixed");
  ["2026-11-01", "2026-11-03", "2026-11-05"].forEach((d) => { I.iseTodaySummary(v, d); I.iseStatus(v, d); I.iseResolve(v, d, null, d); I.iseProgress(v, d); });
  const merged = I.iseMerge(blank(), raw);
  assert.ok(merged.plan.every((e) => (e.it || []).every((x) => I.iseHas(I.ISE_BY_ID, x.b))));
  I.iseTodaySummary(merged, "2026-11-03");
  assert.deepEqual(I.iseGroupStats({ "2026-11-01": { q: 20, pct: 50, g: "constructor", t: 20 } }), {});
});

test("33 c-6 a final day whenever S >= 1, and it carries every cut block's Know-cold list", () => {
  assert.deepEqual(I.buildIsePlan(C(), H0, "2026-11-19").plan.map((e) => e.k), ["final", "rest", "exam"]);
  ["2026-11-17", "2026-11-18", "2026-11-19"].forEach((from) => {
    const ise = setup(C(), from), fin = ise.plan.find((e) => e.k === "final");
    assert.ok(fin, "final from " + from);
    const know = I.iseResolve(ise, fin.d, null, from).know;
    ise.cut.forEach((id) => I.ISE_BY_ID[id].know.forEach((k) => assert.ok(know.indexOf(k) >= 0, from + " " + id + " " + k)));
  });
  const fri = I.buildIsePlan(C({ off: [0, 1, 2, 3, 4, 6] }), H0, "2026-11-12");
  assert.deepEqual(fri.plan.map((e) => e.k), ["final", "rest", "exam"], "one study day (Fri 11-13) is the final review");
});

test("34 c-7 an open day drops blocks already covered; nothing left -> catch-up / buffer", () => {
  const base = setup(C(), "2026-11-02");
  const plan = base.plan.map((e) => (e.d === "2026-11-07" ? { d: e.d, k: "block", it: [{ b: "ston1", lvl: "full", part: 0 }, { b: "tes1", lvl: "light", part: 0 }] } : e));
  const ise = withFields(base, { plan, done: { ston1: "2026-11-04" } });
  const r = I.iseResolve(ise, "2026-11-07", null, "2026-11-05");
  assert.deepEqual(r.items, [{ b: "tes1", lvl: "light", part: 0 }]);
  assert.ok(!r.steps.some((s) => s.t.indexOf("Stones 1") >= 0), "no Stones 1 step");
  assert.equal(r.q, I.iseDayPlan({ k: "block", it: [{ b: "tes1", lvl: "light", part: 0 }] }, 180, 3, I.iseDayCtx(ise, "2026-11-07")).q);
  assert.equal(r.q, 55, "180 min with one light item and no misses yet");
  const both = withFields(ise, { done: { ston1: "2026-11-04", tes1: "2026-11-05" } });
  const rb = I.iseResolve(both, "2026-11-07", null, "2026-11-05");
  assert.equal(rb.k, "catchup", "all covered: the day becomes a catch-up for a behind block");
  assert.deepEqual(rb.items.map((x) => x.b), [I.iseStatus(both, "2026-11-05").assign["2026-11-07"]]);
  const allDone = withFields(both, { done: { void1: "pre", peds1: "pre", ston1: "2026-11-04", tes1: "2026-11-05" } });
  assert.equal(I.iseResolve(allDone, "2026-11-07", null, "2026-11-05").k, "buffer", "nothing behind: a plain catch-up day");
  const logged = withFields(ise, { log: { "2026-11-07": { q: 35, pct: 70, floor: false, t: 35, k: "block", b: ["ston1", "tes1"], g: "stones", ts: 1, rw: 0 } } });
  assert.deepEqual(I.iseResolve(logged, "2026-11-07", null, "2026-11-08").items.map((x) => x.b), ["ston1", "tes1"], "history unchanged");
});

test("35 c-8 group stats split a day over its groups (full 1, light/part 0.5; gs evenly); gs survives iseNorm", () => {
  const plan = [{ d: "2026-11-07", k: "block", it: [{ b: "andr1", lvl: "full", part: 0 }, { b: "ston2", lvl: "light", part: 0 }] }];
  const log = { "2026-11-07": { q: 30, pct: 40, k: "block", b: ["andr1", "ston2"], g: "andro", t: 30 } };
  const w = I.iseGroupStats(log, plan);
  assert.ok(Math.abs(w.andro.q - 20) < 1e-9 && Math.abs(w.stones.q - 10) < 1e-9, JSON.stringify(w));
  assert.ok(Math.abs(w.andro.r - 8) < 1e-9 && Math.abs(w.stones.r - 4) < 1e-9);
  const even = I.iseGroupStats(log);
  assert.ok(Math.abs(even.andro.q - 15) < 1e-9 && Math.abs(even.stones.q - 15) < 1e-9, "no plan: even split");
  const sp = I.iseGroupStats({ "2026-11-09": { q: 40, pct: 50, k: "second", b: [], g: "void", gs: ["void", "peds"], t: 40 } });
  assert.deepEqual(sp, { void: { q: 20, r: 10 }, peds: { q: 20, r: 10 } });
  assert.deepEqual(I.iseGroupStats({ "2026-11-09": { q: 40, pct: 50, b: [], g: "void", t: 40 } }), { void: { q: 40, r: 20 } }, "falls back to g");
  const ise = withFields(setup(C(), "2026-11-02"), { log: { "2026-11-09": { q: 40, pct: 50, floor: false, t: 40, k: "second", b: [], g: "void", gs: ["void", "peds"], ts: 1, rw: 0 } } });
  assert.deepEqual(I.iseNorm(ise).log["2026-11-09"].gs, ["void", "peds"]);
  const p = I.iseProgress(ise, "2026-11-10");
  assert.equal(p.groups.find((g) => g.g === "peds").q, 20);
});

test("36 c-9 a block is not started right before a mock when a whole item fits", () => {
  const cfg = C({ minsWk: 30, minsWe: 90, off: [1, 3] });
  const r = I.buildIsePlan(cfg, H0, "2026-10-03");
  assert.equal(straddles(r.plan), 0, "no split pair around the mocks");
  const seen = placedOnce(r.plan, r.cut);
  I.ISE_BLOCKS.forEach((b) => assert.equal(seen[b.id], 1, b.id));
  return "30/90, Mon+Wed off, from 10-03: split pairs across a mock = 0 (was 1)";
});

test("37 c-10 coverage can be undone; a new sprint starts clean and keeps settings and misses", () => {
  const ise = setup(C(), "2026-11-02", { void1: true, peds1: true });
  assert.deepEqual(ise.done, { void1: "pre", peds1: "pre" });
  const re = freeze(I.iseSetup(ise, C(), {}, "2026-11-02", { void1: true }));
  assert.deepEqual(re.done, { peds1: "pre" });
  assert.ok(re.plan.some((e) => (e.it || []).some((x) => x.b === "void1")), "void1 planned again");
  const un = I.iseUncover(withFields(ise, { done: { void1: "pre", ston1: "2026-11-04" } }), "ston1");
  assert.deepEqual(un.done, { void1: "pre" });
  const old = withFields(ise, { cfg: C({ minsWk: 90, off: [3], skip: ["2026-11-10"], boost: { kid: 1 } }), misses: [{ id: "m", d: "2026-11-03", g: "void", t: "keep me" }],
    log: { "2026-11-03": { q: 20, pct: 60, floor: false, t: 20, k: "block", b: [], g: "void", ts: 1, rw: 0 } }, shuffles: ["2026-11-05"] });
  const ns = I.iseNewSprint(old, "2026-12-01");
  assert.deepEqual(ns, { kind: "uroISE", v: 1, cfg: null, prefs: { minsWk: 90, minsWe: 180, off: [3], pace: 3, qbank: "SASP", boost: { kid: 1 } },
    built: null, builtTs: 0, since: "2026-12-01", plan: [], cut: [], light: [], done: {}, log: {}, misses: old.misses, shuffles: [] });
  assert.deepEqual(I.iseNorm(JSON.parse(JSON.stringify(ns))), ns, "prefs survive iseNorm");
  assert.deepEqual(I.iseNewSprint(ns, "2026-12-02").prefs, ns.prefs, "a second new sprint keeps prefs");
  assert.deepEqual(I.iseMerge(ns, blank()).prefs, ns.prefs);
  const next = I.iseSetup(ns, Object.assign({}, ns.prefs, { exam: "2027-11-20" }), {}, "2026-12-01");
  assert.equal(I.iseStatus(next, "2026-12-01").state, "on");
  assert.deepEqual(next.cut, []);
  assert.ok(next.plan.filter((e) => e.k === "block").length >= 20, "next year's plan has content again");
});

test("38 c-17 iseNowYmd is a local date with a 4 am day start", () => {
  const a = I.iseYmd(new Date(Date.now() - 4 * 3600e3)), v = I.iseNowYmd(), b = I.iseYmd(new Date(Date.now() - 4 * 3600e3));
  assert.ok(I.iseValidYmd(v)); assert.ok(v === a || v === b);
  const late = new Date(2026, 10, 3, 0, 30), early = new Date(late.getTime() - 4 * 3600e3);
  assert.equal(I.iseYmd(early), "2026-11-02", "00:30 on 11-03 still counts as 11-02");
});

test("39 c-23 miss window bridges gaps; no misses yet -> R 0 and the minutes go to questions", () => {
  const ms = [];
  for (let i = 0; i < 8; i++) ms.push({ id: "a_" + i, d: "2026-11-02", g: "void", t: "rule " + i });
  const w5 = I.iseMissWindow(ms, "2026-11-05");                 // Tue skipped, Wed off, Thu opens the app
  assert.equal(w5.from, "2026-11-02"); assert.equal(w5.list.length, 8);
  assert.equal(I.iseMissWindow(ms, "2026-11-02").from, null, "misses added today: no earlier date");
  assert.equal(I.iseMissWindow(ms, "2026-11-02").list.length, 8, "d itself is in the list");
  const more = ms.concat([{ id: "b", d: "2026-11-06", g: "void", t: "x" }, { id: "c", d: "2026-11-09", g: "void", t: "y" }]);
  assert.equal(I.iseMissWindow(more, "2026-11-10").from, "2026-11-06");
  assert.equal(I.iseMissWindow(more, "2026-11-10").list.length, 2);
  const ise = withFields(setup(C({ off: [3] }), "2026-11-02"), { misses: ms });
  const r = I.iseResolve(ise, "2026-11-05", null, "2026-11-05");
  assert.equal(r.steps[0].t, "Re-read misses since Mon 11/2 (8)"); assert.equal(r.steps[0].m, r.R); assert.ok(r.R > 0);
  assert.deepEqual(I.iseDayCtx(ise, "2026-11-05"), { qbank: "SASP", recentMisses: 8, missFrom: "2026-11-02", anyMisses: true });
  const day1 = I.iseResolve(withFields(ise, { misses: [] }), "2026-11-02", null, "2026-11-02");
  assert.equal(day1.R, 0);
  assert.deepEqual(day1.steps[0], { t: "No misses yet: put these minutes into questions", m: null });
  assert.equal(I.iseAnyMisses(ms, "2026-11-02"), false); assert.equal(I.iseAnyMisses(ms, "2026-11-03"), true);
  const fl = I.iseFloorSteps(20, 0, "SASP", 3, 0, { anyMisses: false });
  assert.ok(!fl.some((s) => s.t.indexOf("misses") >= 0 && s.t.indexOf("Log") < 0), "floor day has no miss step without misses");
  assert.equal(I.iseFloorSteps(20, 10, "SASP", 3, 8, { anyMisses: true, missFrom: "2026-11-02" })[0].t, "Re-read misses since Mon 11/2 (8)");
});

test("40 c-24 what-if labels give absolute numbers", () => {
  const ise = setup(C(), "2026-11-05");
  const w = I.iseWhatIfs(ise, "2026-11-09");
  w.forEach((x) => assert.ok(/^.+ → \d+ cut, \d+ light( · .+)?$/.test(x.label) && x.label.indexOf("instead of") < 0, x.label));
  w.forEach((x) => assert.ok(x.label.indexOf(x.cutN + " cut, " + x.lightN + " light") > 0));
  return w.map((x) => x.label).join(" | ");
});

test("41 c-26/c-27/c-29/c-30/c-33 labels, paste, loop topics, status fields, build on a day off", () => {
  assert.equal(I.ISE_LABEL["Kidney, Adrenal, Ureter"], "Kidney, Adrenal, Ureter: Anatomy and Embryology");
  assert.equal(I.ISE_LABEL["Prostate and Seminal Vesicle"], "Prostate and Seminal Vesicle: Anatomy and Embryology");
  assert.equal(I.ISE_LABEL["Testis, Epididymis, Vas Deferens"], "Testis, Epididymis, Vas Deferens: Anatomy and Embryology");
  assert.equal(I.ISE_LABEL["Genital System and Urethra"], "Genital System and Urethra: Anatomy and Embryology");
  // c-27
  assert.deepEqual(I.iseParseMisses("From today:\n- Pentosan: maculopathy\n- IC/BPS: no long-term antibiotics", "void", "2026-11-03", "p").map((m) => m.t),
    ["From today:\n- Pentosan: maculopathy\n- IC/BPS: no long-term antibiotics"]);
  assert.deepEqual(I.iseParseMisses("- SNM needs a test phase first", "void", "2026-11-03", "p").map((m) => m.t), ["SNM needs a test phase first"]);
  assert.deepEqual(I.iseParseMisses("- a\n- b\n- c\n- d", "void", "2026-11-03", "p").map((m) => m.id + "=" + m.t), ["p_0=a", "p_1=b", "p_2=c", "p_3=d"]);
  // c-29: loop topics (part 2 uses the second half), READ by group
  const sp = setup(C({ minsWk: 60, minsWe: 60 }), "2026-11-02");
  const v1 = I.ISE_BY_ID.void1.topics;
  assert.deepEqual(I.iseResolve(sp, "2026-11-02", null, "2026-11-02").loopTopics, [v1[0]]);
  assert.deepEqual(I.iseResolve(sp, "2026-11-03", null, "2026-11-02").loopTopics, [v1[Math.ceil(v1.length / 2)]]);
  const dflt = setup(C(), "2026-11-02");
  const sat = I.iseResolve(dflt, "2026-11-07", null, "2026-11-02");
  assert.deepEqual(sat.loopTopics, ["Priapism"]);
  assert.deepEqual(sat.readG.map((x) => x.g + ":" + x.label), ["andro:Andrology", "stones:Stones"]);
  assert.deepEqual(I.iseResolve(dflt, "2026-11-13", null, "2026-11-02").loopTopics, [], "an all-light day has no tutor step");
  // c-30
  const lg = withFields(setup(C({ minsWk: 30, minsWe: 30 }), "2026-11-02"), {
    log: { "2026-11-02": { q: 25, pct: 70, floor: false, t: 10, k: "block", b: [], g: "void", ts: 1, rw: 0 } } });
  const st = I.iseStatus(lg, "2026-11-04");
  assert.equal(st.qDone, 25); assert.equal(st.qDoneCapped, 10);
  assert.equal(st.hasBuffers, lg.plan.some((e) => e.k === "buffer"));
  assert.equal(I.iseStatus(setup(C(), "2026-11-02"), "2026-11-04").hasBuffers, false, "the default 19-day plan has no catch-up days");
  assert.equal(I.iseStatus(setup(C({ minsWk: 135, minsWe: 240 }), "2026-10-20"), "2026-10-21").hasBuffers, true);
  // c-33: built on a day off -> today is Off (Study anyway works), not none
  const offMon = setup(C({ off: [1] }), "2026-11-02");
  assert.equal(offMon.plan[0].d, "2026-11-03"); assert.equal(I.iseStart(offMon), "2026-11-02");
  assert.equal(I.iseResolve(offMon, "2026-11-02", null, "2026-11-02").k, "off");
  assert.equal(I.iseTodaySummary(offMon, "2026-11-02").hub, "ISE: off day");
  const satWe0 = setup(C({ minsWe: 0 }), "2026-11-07");
  assert.equal(I.iseResolve(satWe0, "2026-11-07", null, "2026-11-07").k, "off");
  assert.equal(I.iseResolve(satWe0, "2026-11-06", null, "2026-11-07").k, "none", "before the build day stays none");
  const extra = withFields(offMon, { log: { "2026-11-02": { q: 20, pct: 70, floor: false, t: 20, k: "extra", b: ["void1"], g: "void", ts: 1, rw: 0 } } });
  assert.equal(I.iseTodaySummary(extra, "2026-11-02").hub, "ISE: extra Voiding 1 · done today ✓");
});

test("42 c-32 no pin while anything is behind: every what-if puts the same block on today", () => {
  const fx = setup(C(), "2026-11-05");
  const plus30 = I.iseReshuffle(fx, "2026-11-09", { minsWk: 150 });
  assert.equal(ent(plus30.plan, "2026-11-09").it[0].b, "void1");
  const firstToday = (x) => ent(x.plan, "2026-11-09").it[0].b;
  assert.equal(firstToday(I.iseReshuffle(fx, "2026-11-09")), "void1");
  I.iseWhatIfs(fx, "2026-11-09").forEach((w) => assert.equal(firstToday(w.next), "void1", w.label));
});

test("43 reshuffle on or after the exam keeps the plan (and the exam entry); a later exam date re-plans", () => {
  const fx = setup(C(), "2026-11-02");
  assert.equal(I.iseReshuffle(fx, "2026-11-21"), fx, "exam day: unchanged");
  assert.equal(I.iseReshuffle(fx, "2026-11-25"), fx, "after the exam: unchanged");
  assert.equal(I.iseSetSkip(fx, "2026-11-22", true, "2026-11-21").next.plan.slice(-1)[0].k, "exam");
  const later = I.iseReshuffle(fx, "2026-11-25", { exam: "2027-11-20" });
  assert.notEqual(later, fx); assert.equal(later.plan.slice(-1)[0].d, "2027-11-20");
});

test("44 new sprint: merging a backup from before it keeps only the old misses", () => {
  const old = withFields(setup(C(), "2026-11-02"), {
    done: { void1: "2026-11-02", pros1: "pre" },
    log: { "2026-11-02": { q: 25, pct: 70, floor: false, t: 25, k: "block", b: ["void1"], g: "void", ts: 5e12, rw: 1 } },
    misses: [{ id: "m1", d: "2026-11-02", g: "void", t: "old rule" }] });
  const fresh = I.iseNewSprint(old, "2026-11-25");
  assert.equal(fresh.since, "2026-11-25"); assert.equal(I.iseNorm(fresh).since, "2026-11-25");
  const fresh2 = I.iseSetup(fresh, Object.assign({}, C(), { exam: "2027-11-20" }), {}, "2026-11-26", null, 1);
  [I.iseMerge(fresh2, old), I.iseMerge(old, fresh2), I.iseMerge(fresh, old)].forEach((m, i) => {
    assert.deepEqual(Object.keys(m.done), [], "case " + i + ": no old covered blocks");
    assert.deepEqual(Object.keys(m.log), [], "case " + i + ": no old logs");
    assert.ok(m.plan.every((e) => e.d >= "2026-11-25"), "case " + i + ": no old plan entries");
    assert.equal(m.since, "2026-11-25");
    assert.deepEqual(m.misses.map((x) => x.t), ["old rule"], "case " + i + ": misses kept");
  });
  assert.equal(I.iseMerge(fresh2, old).cfg.exam, "2027-11-20");
  assert.equal(I.iseMerge(old, fresh2).cfg.exam, "2027-11-20");
});

console.log((failed ? "FAILED " : "OK ") + passed + " passed, " + failed + " failed");
process.exit(failed ? 1 : 0);
