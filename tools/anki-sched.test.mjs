// Unit tests for the in-app card reviewer (the ANKI-SCHED block of UroStudyHub.html): scheduler, queue, rewards.
// Dependency-free. Run in three time zones, the study-day rollover is the part that bites:
//   TZ=America/Chicago node tools/anki-sched.test.mjs
//   TZ=UTC node tools/anki-sched.test.mjs
//   TZ=Pacific/Auckland node tools/anki-sched.test.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const HTML_PATH = fileURLToPath(new URL("../UroStudyHub.html", import.meta.url));
const src = fs.readFileSync(HTML_PATH, "utf8");
const m = src.match(/^[ \t]*\/\/ ANKI-SCHED-BEGIN[^\n]*\n([\s\S]*?)^[ \t]*\/\/ ANKI-SCHED-END/m);
if (!m) { console.log("FAIL: no ANKI-SCHED-BEGIN / ANKI-SCHED-END block in " + HTML_PATH); process.exit(1); }
const NAMES = ["ANKI_CFG", "ANKI_REWARD", "ankiStudyDay", "ankiDayKey", "ankiClozeNums", "ankiUnits", "ankiClozeParts", "ankiGrade",
  "ankiFmt", "ankiPreview", "ankiTagOk", "ankiQueue", "ankiNext", "ankiStreakNext", "ankiCredit"];
const STREAK_MS = "var STREAK_MILESTONES = [{ days: 3, coins: 25, msg: '3' }, { days: 7, coins: 75, msg: '7' }];\n";
const A = new Function(STREAK_MS + m[1] + "\n;return {" + NAMES.map((n) => JSON.stringify(n) + ": typeof " + n + " === 'undefined' ? undefined : " + n).join(", ") + "};")();

let failed = 0, passed = 0;
function test(name, fn) {
  try { const note = fn(); passed++; console.log("PASS " + name + (note ? "  (" + note + ")" : "")); }
  catch (e) { failed++; console.log("FAIL " + name + "\n     " + String(e && e.message ? e.message : e).split("\n").join("\n     ")); }
}
for (const n of NAMES) { if (A[n] === undefined) { console.log("FAIL block does not define " + n); process.exit(1); } }

const MIN = 60000, DAY = 86400000;
// A local wall-clock time, so the tests mean the same thing in every time zone.
const at = (y, mo, d, h = 12, mi = 0) => new Date(y, mo - 1, d, h, mi).getTime();
const NOW = at(2026, 11, 11, 12, 0);
const day = (ts) => A.ankiStudyDay(ts);

// ---- study day ----
test("study day: 3:59am is still yesterday, 4:00am is today", () => {
  assert.equal(day(at(2026, 11, 11, 3, 59)), day(at(2026, 11, 10, 15)));
  assert.equal(day(at(2026, 11, 11, 4, 0)), day(at(2026, 11, 11, 23)));
  assert.equal(day(at(2026, 11, 11, 4, 0)) - day(at(2026, 11, 10, 4, 0)), 1);
});
test("study day: consecutive local days differ by exactly 1 across a DST change", () => {
  for (const [y, mo, d] of [[2026, 3, 7], [2026, 3, 8], [2026, 10, 31], [2026, 11, 1], [2026, 4, 4], [2026, 9, 26]]) {
    assert.equal(day(at(y, mo, d + 1, 12)) - day(at(y, mo, d, 12)), 1, y + "-" + mo + "-" + d);
  }
});
test("day key is the local calendar date after the 4am cutoff", () => {
  assert.equal(A.ankiDayKey(at(2026, 11, 11, 3, 0)), "2026-11-10");
  assert.equal(A.ankiDayKey(at(2026, 11, 11, 9, 0)), "2026-11-11");
  assert.equal(A.ankiDayKey(at(2026, 12, 31, 23, 59)), "2026-12-31");
});

// ---- cloze helpers ----
test("cloze numbers sort numerically (c10 after c2)", () => {
  assert.deepEqual(A.ankiClozeNums("{{c10::a}} {{c2::b}} {{c1::c}} {{c2::again}}"), [1, 2, 10]);
  assert.deepEqual(A.ankiClozeNums("no clozes"), []);
});
test("units: basic = one, cloze = one per number, cloze with no markers falls back to one", () => {
  assert.deepEqual(A.ankiUnits({ type: "basic" }), ["0"]);
  assert.deepEqual(A.ankiUnits({}), ["0"]);
  assert.deepEqual(A.ankiUnits({ type: "cloze", text: "{{c1::a}} and {{c3::b}}" }), ["1", "3"]);
  assert.deepEqual(A.ankiUnits({ type: "cloze", text: "plain" }), ["0"]);
});
test("cloze parts: hide / reveal / hint / other clozes plain / colon in answer", () => {
  const t = "Gleason {{c1::3+4=7}} is {{c2::lower::risk}} than {{c3::a:b}}.";
  const hid = A.ankiClozeParts(t, 2, false);
  assert.deepEqual(hid.map((p) => p.t + ":" + p.v), ["text:Gleason ", "text:3+4=7", "text: is ", "hide:[risk]", "text: than ", "text:a:b", "text:."]);
  const shown = A.ankiClozeParts(t, 2, true);
  assert.equal(shown[3].t, "ans"); assert.equal(shown[3].v, "lower");
  assert.equal(A.ankiClozeParts("{{c1::x}}", 1, false)[0].v, "[...]");
  assert.equal(A.ankiClozeParts("{{c1::a:b}} z", 1, true)[0].v, "a:b");
});

// ---- scheduler ----
test("new card: Again 1m, Hard ~6m, Good 10m, Easy 4d", () => {
  assert.deepEqual(A.ankiPreview(null, NOW), ["1m", "6m", "10m", "4d"]);
});
test("new card: Good, Good graduates to a 1 day review due tomorrow", () => {
  const a = A.ankiGrade(null, 3, NOW);
  assert.equal(a.st, "learn"); assert.equal(a.step, 1); assert.equal(a.due, NOW + 10 * MIN); assert.equal(a.first, day(NOW));
  const b = A.ankiGrade(a, 3, NOW + 10 * MIN);
  assert.equal(b.st, "rev"); assert.equal(b.ivl, 1); assert.equal(b.due, day(NOW) + 1); assert.equal(b.reps, 1);
});
test("new card: Easy graduates at once to 4 days", () => {
  const a = A.ankiGrade(null, 4, NOW);
  assert.equal(a.st, "rev"); assert.equal(a.ivl, 4); assert.equal(a.due, day(NOW) + 4);
});
test("learning: Again returns to step 0; Hard repeats the current step", () => {
  const a = A.ankiGrade(null, 3, NOW);          // step 1 (10m)
  const again = A.ankiGrade(a, 1, NOW + 5 * MIN);
  assert.equal(again.step, 0); assert.equal(again.due, NOW + 5 * MIN + MIN);
  const hard = A.ankiGrade(a, 2, NOW + 5 * MIN);
  assert.equal(hard.step, 1); assert.equal(hard.due, NOW + 5 * MIN + 10 * MIN);
});
const review = (ivl, ease, dueDay, last) => ({ st: "rev", step: 0, due: dueDay, ivl, ease, reps: 3, lapses: 0, last: last || NOW - DAY * ivl, first: day(NOW) - 30 });
test("review on time: Hard x1.2 (min +1), Good x ease, Easy x ease x1.3 and each is longer than the last", () => {
  const sc = review(10, 2.5, day(NOW));
  const [h, g, e] = [2, 3, 4].map((x) => A.ankiGrade(sc, x, NOW));
  assert.equal(h.ivl, 12); assert.equal(g.ivl, 25); assert.equal(e.ivl, 33);
  assert.ok(h.ivl < g.ivl && g.ivl < e.ivl);
  assert.equal(h.ease, 2.35); assert.equal(g.ease, 2.5); assert.equal(e.ease, 2.65);
  assert.equal(g.due, day(NOW) + 25); assert.equal(g.reps, 4);
});
test("review: tiny intervals still grow by at least a day per step", () => {
  const [h, g, e] = [2, 3, 4].map((x) => A.ankiGrade(review(1, 1.3, day(NOW)), x, NOW));
  assert.ok(h.ivl >= 2 && g.ivl > h.ivl && e.ivl > g.ivl, [h.ivl, g.ivl, e.ivl].join(","));
});
test("review overdue: lateness is partly credited to the next interval", () => {
  const onTime = A.ankiGrade(review(10, 2.5, day(NOW)), 3, NOW);
  const late = A.ankiGrade(review(10, 2.5, day(NOW) - 8), 3, NOW);
  assert.ok(late.ivl > onTime.ivl, late.ivl + " vs " + onTime.ivl);
});
test("review: Again is a lapse, ease -0.2 (floor 1.3), relearn 10m then back at 1 day", () => {
  const lap = A.ankiGrade(review(30, 2.5, day(NOW)), 1, NOW);
  assert.equal(lap.st, "relearn"); assert.equal(lap.lapses, 1); assert.equal(lap.ease, 2.3); assert.equal(lap.due, NOW + 10 * MIN); assert.equal(lap.ivl, 1);
  assert.equal(A.ankiGrade(review(30, 1.4, day(NOW)), 1, NOW).ease, 1.3);
  const back = A.ankiGrade(lap, 3, NOW + 10 * MIN);
  assert.equal(back.st, "rev"); assert.equal(back.ivl, 1); assert.equal(back.due, day(NOW) + 1);
});
test("review: ease never drops below 1.3 on repeated Hard", () => {
  let sc = review(5, 1.35, day(NOW));
  for (let i = 0; i < 5; i++) sc = A.ankiGrade(sc, 2, NOW);
  assert.equal(sc.ease, 1.3);
});
test("interval is capped at maxIvl", () => {
  const sc = A.ankiGrade(review(300, 3, day(NOW)), 4, NOW);
  assert.equal(sc.ivl, A.ANKI_CFG.maxIvl);
});
test("grading never mutates the card's old schedule", () => {
  const sc = review(10, 2.5, day(NOW)); const copy = JSON.stringify(sc);
  [1, 2, 3, 4].forEach((g) => A.ankiGrade(sc, g, NOW));
  assert.equal(JSON.stringify(sc), copy);
});
test("fmt: minutes, hours, days, months, years", () => {
  assert.equal(A.ankiFmt(20000), "<1m"); assert.equal(A.ankiFmt(30000), "1m"); assert.equal(A.ankiFmt(10 * MIN), "10m"); assert.equal(A.ankiFmt(120 * MIN), "2h");
  assert.equal(A.ankiFmt(DAY), "1d"); assert.equal(A.ankiFmt(25 * DAY), "25d"); assert.equal(A.ankiFmt(45 * DAY), "1.5mo");
  assert.equal(A.ankiFmt(400 * DAY), "1.1y");
});
test("preview of a review shows days, and a lapse shows minutes", () => {
  assert.deepEqual(A.ankiPreview(review(10, 2.5, day(NOW)), NOW), ["10m", "12d", "25d", "1.1mo"]);
});

// ---- queue ----
const card = (id, extra) => Object.assign({ id, type: "basic", front: "f" + id, back: "b" + id, tags: [] }, extra || {});
test("queue: new cards respect the daily limit, learning first, then reviews, then new", () => {
  const cards = [card(1), card(2), card(3), card(4), card(5)];
  cards[0].sc = { "0": review(5, 2.5, day(NOW) - 1) };             // due review
  cards[1].sc = { "0": Object.assign(A.ankiGrade(null, 3, NOW - 15 * MIN), {}) }; // learning, due now
  cards[2].sc = { "0": review(5, 2.5, day(NOW) + 3) };             // not due
  // the learning card was introduced today, so it uses one of the 2 new slots
  const q = A.ankiQueue(cards, NOW, { newPerDay: 2 });
  assert.equal(q.counts.learn, 1); assert.equal(q.counts.rev, 1); assert.equal(q.counts.fresh, 1);
  assert.equal(q.newAvail, 2); assert.equal(q.newLeft, 1); assert.equal(q.newToday, 1);
  assert.equal(A.ankiNext(q).id, 2);
  assert.equal(A.ankiNext(A.ankiQueue(cards.filter((c) => c.id !== 2), NOW, { newPerDay: 2 })).id, 1, "reviews before new");
});
test("queue: cards introduced today count against the new limit (even once graded)", () => {
  const c1 = card(1), c2 = card(2), c3 = card(3);
  c1.sc = { "0": A.ankiGrade(null, 4, NOW) };                      // introduced today, now a review for later
  const q = A.ankiQueue([c1, c2, c3], NOW, { newPerDay: 2 });
  assert.equal(q.newToday, 1); assert.equal(q.newLeft, 1); assert.equal(q.counts.fresh, 1);
  assert.equal(A.ankiQueue([c1, c2, c3], NOW, { newPerDay: 0 }).counts.fresh, 0);
});
test("queue: overdue reviews come most overdue first", () => {
  const cs = [card(1), card(2), card(3)];
  cs[0].sc = { "0": review(5, 2.5, day(NOW) - 1) }; cs[1].sc = { "0": review(5, 2.5, day(NOW) - 6) }; cs[2].sc = { "0": review(5, 2.5, day(NOW)) };
  assert.deepEqual(A.ankiQueue(cs, NOW).rev.map((e) => e.id), [2, 1, 3]);
});
test("queue: suspended cards and tag filters are skipped; tag prefix matches nested tags", () => {
  const cs = [card(1, { tags: ["AUA::Oncology::Prostate"] }), card(2, { tags: ["AUA::Voiding"] }), card(3, { tags: ["AUA::Oncology"], susp: true })];
  assert.equal(A.ankiQueue(cs, NOW, { newPerDay: 9 }).counts.fresh, 2);
  assert.equal(A.ankiQueue(cs, NOW, { newPerDay: 9, tag: "AUA::Oncology" }).counts.fresh, 1);
  assert.equal(A.ankiQueue(cs, NOW, { newPerDay: 9, tag: "AUA::Onc" }).counts.fresh, 0);
  assert.equal(A.ankiQueue(cs, NOW, { newPerDay: 9, tag: "AUA" }).counts.fresh, 2);
});
test("queue: a learning card due in 5 minutes shows via learn-ahead, one due in an hour does not", () => {
  const c1 = card(1), c2 = card(2);
  c1.sc = { "0": A.ankiGrade(null, 1, NOW) };                      // due NOW+1m
  c2.sc = { "0": Object.assign(A.ankiGrade(null, 1, NOW), { due: NOW + 60 * MIN }) };
  const q = A.ankiQueue([c1, c2], NOW, { newPerDay: 0 });
  assert.equal(q.learn.length, 0); assert.equal(q.ahead.length, 1); assert.equal(A.ankiNext(q).id, 1);
});
test("queue: cloze notes make one unit per number, and siblings are buried after one is graded today", () => {
  const c = card(1, { type: "cloze", text: "{{c1::a}} {{c2::b}} {{c3::c}}" });
  assert.equal(A.ankiQueue([c], NOW, { newPerDay: 9 }).counts.fresh, 3);
  c.sc = { "1": A.ankiGrade(null, 3, NOW) };                       // c1 learning now
  const q = A.ankiQueue([c], NOW + 11 * MIN, { newPerDay: 9 });
  assert.equal(q.counts.learn, 1);                                  // c1 itself comes back
  assert.equal(q.counts.fresh, 0, "c2 and c3 wait for tomorrow");
  const tomorrow = A.ankiQueue([c], at(2026, 11, 12, 12), { newPerDay: 9 });
  assert.equal(tomorrow.counts.fresh, 2);
});
test("queue: a review is due from its study day, not a rolling 24 hours", () => {
  const c = card(1);
  c.sc = { "0": A.ankiGrade(A.ankiGrade(null, 4, at(2026, 11, 11, 23, 30)), 3, at(2026, 11, 11, 23, 31)) }; // reviewed late at night
  assert.equal(A.ankiQueue([c], at(2026, 11, 12, 8, 0), { newPerDay: 0 }).counts.rev, 0, "interval 4d is not due yet");
  const d = card(2); d.sc = { "0": A.ankiGrade(null, 4, at(2026, 11, 11, 23, 30)) };   // Easy: 4 days
  assert.equal(A.ankiQueue([d], at(2026, 11, 15, 8, 0), { newPerDay: 0 }).counts.rev, 1, "due the morning of day 4");
  assert.equal(A.ankiQueue([d], at(2026, 11, 15, 3, 0), { newPerDay: 0 }).counts.rev, 0, "3am still belongs to the day before");
});

// ---- rewards ----
test("credit: counts per study day, XP 2 each, a coin every 10, capped at 100 reviews a day", () => {
  let p = { xp: 0, coins: 0, ankiReviewGoal: 1000, lastDay: null, streak: 0 };
  let xp = 0, coins = 0;
  for (let i = 0; i < 130; i++) { const r = A.ankiCredit(p, 1, NOW, "2026-11-11", { rewards: true }); p = Object.assign({}, p, r.patch); xp += r.xp; coins += r.coins; }
  assert.equal(p.ankiDays[A.ankiDayKey(NOW)], 130); assert.equal(p.ankiReviews, 130);
  assert.equal(xp, 200); assert.equal(p.xp, 200); assert.equal(coins, 10); assert.equal(p.coins, 10);
});
test("credit: the daily goal pays its token once per day, and again the next day", () => {
  let p = { ankiReviewGoal: 5, tokens: 0, tokensEarned: 0, activityLog: [] };
  let hits = 0;
  for (let i = 0; i < 9; i++) { const r = A.ankiCredit(p, 1, NOW, "2026-11-11", { token: 2 }); p = Object.assign({}, p, r.patch); if (r.goalHit) hits++; }
  assert.equal(hits, 1); assert.equal(p.tokens, 2);
  for (let i = 0; i < 5; i++) { const r = A.ankiCredit(p, 1, NOW + DAY, "2026-11-12", { token: 2 }); p = Object.assign({}, p, r.patch); if (r.goalHit) hits++; }
  assert.equal(hits, 2); assert.equal(p.tokens, 4);
  assert.equal(p.activityLog.filter((e) => e.label.indexOf("goal reached") >= 0).length, 2);
});
test("credit: crossing the goal with one big manual log (+50) pays once, and manual logging pays no XP", () => {
  const r = A.ankiCredit({ ankiReviewGoal: 50, xp: 7, coins: 3 }, 60, NOW, "2026-11-11", { token: 2 });
  assert.equal(r.goalHit, true); assert.equal(r.xp, 0); assert.equal(r.patch.xp, undefined); assert.equal(r.patch.tokens, 2);
});
test("credit: first review of the day logs one activity entry, later ones do not", () => {
  let p = { ankiReviewGoal: 999, activityLog: [] };
  for (let i = 0; i < 4; i++) { p = Object.assign({}, p, A.ankiCredit(p, 1, NOW, "2026-11-11", { rewards: true }).patch); }
  assert.equal(p.activityLog.length, 1); assert.equal(p.activityLog[0].type, "anki");
});
test("streak: starts, continues, resets, and the shield bridges a gap (same rules as marking a topic done)", () => {
  assert.equal(A.ankiStreakNext({}, "2026-11-11").streak, 1);
  assert.equal(A.ankiStreakNext({ streak: 4, lastDay: "2026-11-11" }, "2026-11-11").streak, 4);
  assert.equal(A.ankiStreakNext({ streak: 4, lastDay: "2026-11-10" }, "2026-11-11").streak, 5);
  assert.equal(A.ankiStreakNext({ streak: 4, lastDay: "2026-11-08" }, "2026-11-11").streak, 1);
  assert.equal(A.ankiStreakNext({ streak: 4, lastDay: "2026-11-08", ups: { streak_shield: 2 } }, "2026-11-11").streak, 5);
  assert.equal(A.ankiStreakNext({ streak: 4, lastDay: "2026-11-08", ups: { streak_shield: 1 } }, "2026-11-11").streak, 1);
});
test("streak: a milestone day pays its coins through credit", () => {
  const r = A.ankiCredit({ streak: 2, lastDay: "2026-11-10", coins: 0, xp: 0, ankiReviewGoal: 999 }, 1, NOW, "2026-11-11", { rewards: true });
  assert.equal(r.patch.streak, 3); assert.equal(r.milestone.coins, 25); assert.equal(r.coins, 25); assert.equal(r.patch.coins, 25);
});

console.log("\n" + passed + " passed, " + failed + " failed (TZ=" + (process.env.TZ || "system") + ")");
process.exit(failed ? 1 : 0);
