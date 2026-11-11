// Unit tests for the Arcade play bookkeeping (the ARCADE-PLAY block of UroStudyHub.html): the per-game play counter,
// the daily first-play bonus and the weekly Case Minimums. Dependency-free. Run in three time zones:
//   TZ=America/New_York node tools/arcade-play.test.mjs
//   TZ=UTC node tools/arcade-play.test.mjs
//   TZ=Pacific/Auckland node tools/arcade-play.test.mjs
// ARCADE_SRC=/path/to/file.js picks another source that holds the block between the markers.
import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const SRC_PATH = process.env.ARCADE_SRC || fileURLToPath(new URL("../UroStudyHub.html", import.meta.url));
const srcText = fs.readFileSync(SRC_PATH, "utf8");
const mBlock = srcText.match(/^[ \t]*\/\/ ARCADE-PLAY-BEGIN[^\n]*\n([\s\S]*?)^[ \t]*\/\/ ARCADE-PLAY-END/m);
if (!mBlock) { console.log("FAIL: no ARCADE-PLAY-BEGIN / ARCADE-PLAY-END block in " + SRC_PATH); process.exit(1); }
const NAMES = ["ARCADE_GAMES", "ARCADE_GAME_IDS", "arcadeGame", "FIRST_PLAY_COINS", "FIRST_PLAY_XP", "MINIMUM_TIERS", "minimumReward",
  "arcadeDay", "arcadeWeek", "arcadeRotation", "arcadeFirstPlayOpen", "arcadeRecordOpen", "arcadeRecordPlay"];
const A = new Function(mBlock[1] + "\n;return {" + NAMES.map((n) => JSON.stringify(n) + ": typeof " + n + " === 'undefined' ? undefined : " + n).join(", ") + "};")();

let failed = 0, passed = 0;
function test(name, fn) {
  try { const note = fn(); passed++; console.log("PASS " + name + (note ? "  (" + note + ")" : "")); }
  catch (e) { failed++; console.log("FAIL " + name + "\n     " + String(e && e.message ? e.message : e).split("\n").join("\n     ")); }
}
const clone = (o) => JSON.parse(JSON.stringify(o));
const D1 = "2026-11-11", W1 = "2026-11-09"; // a Wednesday and the Monday that starts its week
const base = () => ({ coins: 100, xp: 50, tokens: 2, games: 0 });
// pay one round of `id` (10 coins, 5 xp) and return the whole result
const play = (st, id, day = D1, week = W1, coins = 10, xp = 5, ts = 1) => A.arcadeRecordPlay(st, id, coins, xp, day, week, ts);

test("nothing missing from the extracted block", () => {
  const missing = NAMES.filter((n) => A[n] === undefined);
  assert.deepEqual(missing, []);
});

test("game list: 8 unique ids, each with a name, icon and unlock cost", () => {
  assert.equal(A.ARCADE_GAMES.length, 8);
  assert.equal(new Set(A.ARCADE_GAME_IDS).size, 8);
  for (const g of A.ARCADE_GAMES) assert.ok(g.id && g.name && g.icon && typeof g.unlockCost === "number" && g.reqs, g.id);
  assert.deepEqual(A.ARCADE_GAME_IDS.slice().sort(), ["buzzer", "crawl", "drugmatch", "preop", "rush", "snap", "squadron", "staging"]);
  assert.equal(A.arcadeGame("crawl").name, "Path of Pathology");
  assert.equal(A.arcadeGame("nope"), null);
  assert.equal(A.arcadeGame("snap").unlockCost, 0, "Snap stays the free game");
});

test("tiers: ascending, positive, exactly one marked full, top tier fits inside the game list", () => {
  const t = A.MINIMUM_TIERS;
  for (let i = 1; i < t.length; i++) assert.ok(t[i].n > t[i - 1].n);
  assert.equal(t.filter((x) => x.full).length, 1);
  assert.ok(t[t.length - 1].full && t[t.length - 1].n <= A.ARCADE_GAMES.length);
  for (const x of t) assert.ok(x.tokens >= 0 && x.coins >= 0 && x.tokens + x.coins > 0);
});

test("arcadeDay is local and zero padded", () => {
  assert.equal(A.arcadeDay(new Date(2026, 0, 5, 23, 59)), "2026-01-05");
  assert.equal(A.arcadeDay(new Date(2026, 11, 31, 0, 0)), "2026-12-31");
  assert.equal(A.arcadeDay(new Date(2026, 10, 11, 0, 1)), "2026-11-11");
});

test("arcadeWeek: Monday maps to itself, Sunday to the Monday before", () => {
  const wk = (y, m, d, h = 12) => A.arcadeWeek(new Date(y, m - 1, d, h));
  assert.equal(wk(2026, 11, 9), "2026-11-09");     // Monday
  assert.equal(wk(2026, 11, 9, 0), "2026-11-09");  // Monday, just after midnight
  assert.equal(wk(2026, 11, 11), "2026-11-09");    // Wednesday
  assert.equal(wk(2026, 11, 15, 23), "2026-11-09"); // Sunday night is still last week's
  assert.equal(wk(2026, 11, 16, 0), "2026-11-16"); // and the next minute is a new week
});

test("arcadeWeek across a year boundary and both DST changes", () => {
  const wk = (y, m, d, h = 12) => A.arcadeWeek(new Date(y, m - 1, d, h));
  assert.equal(wk(2027, 1, 1), "2026-12-28");      // Friday in the new year, Monday in the old
  assert.equal(wk(2026, 3, 8), "2026-03-02");      // US spring-forward Sunday
  assert.equal(wk(2026, 3, 9), "2026-03-09");
  assert.equal(wk(2026, 11, 1), "2026-10-26");     // US fall-back Sunday
  assert.equal(wk(2026, 10, 25, 1), "2026-10-19"); // EU fall-back Sunday, early hours
  assert.equal(wk(2026, 9, 27, 3), "2026-09-21");  // NZ spring-forward Sunday
});

test("arcadeWeek does not mutate its argument", () => {
  const d = new Date(2026, 10, 11, 18, 30); const t = d.getTime();
  A.arcadeWeek(d); A.arcadeDay(d);
  assert.equal(d.getTime(), t);
});

test("a round counts: play counter, coins stat, last day", () => {
  const r = play(base(), "snap");
  assert.deepEqual(r.state.gameStats.snap, { opens: 0, plays: 1, coins: 10, last: D1 });
  const r2 = play(r.state, "snap", D1, W1, 7, 3, 2);
  assert.deepEqual(r2.state.gameStats.snap, { opens: 0, plays: 2, coins: 17, last: D1 });
});

test("first round of a game today pays the bonus; the second does not", () => {
  const r = play(base(), "rush");
  assert.equal(r.firstPlay, true);
  assert.equal(r.state.coins, 100 + A.FIRST_PLAY_COINS);
  assert.equal(r.state.xp, 50 + A.FIRST_PLAY_XP);
  assert.match(r.text, /First Uro Rush today: \+25 💰 \+10 XP/);
  const r2 = play(r.state, "rush", D1, W1, 10, 5, 2);
  assert.equal(r2.firstPlay, false);
  assert.equal(r2.state.coins, r.state.coins); // the round's own coins are paid by gameReward, not here
  assert.equal(r2.text, "");
});

test("the bonus is per game: a different game the same day pays again", () => {
  const a = play(base(), "rush").state;
  const b = play(a, "preop", D1, W1, 10, 5, 2);
  assert.equal(b.firstPlay, true);
  assert.equal(b.state.coins, a.coins + A.FIRST_PLAY_COINS);
  assert.deepEqual(Object.keys(b.state.dailyFirst.games).sort(), ["preop", "rush"]);
});

test("the bonus comes back the next day", () => {
  const a = play(base(), "rush").state;
  assert.equal(A.arcadeFirstPlayOpen(a, "rush", D1), false);
  assert.equal(A.arcadeFirstPlayOpen(a, "rush", "2026-11-12"), true);
  assert.equal(A.arcadeFirstPlayOpen(a, "preop", D1), true);
  const b = play(a, "rush", "2026-11-12", W1, 10, 5, 2);
  assert.equal(b.firstPlay, true);
  assert.deepEqual(Object.keys(b.state.dailyFirst.games), ["rush"], "yesterday's paid games are dropped");
  assert.equal(b.state.dailyFirst.day, "2026-11-12");
});

test("arcadeFirstPlayOpen is true for a fresh or missing record", () => {
  assert.equal(A.arcadeFirstPlayOpen({}, "snap", D1), true);
  assert.equal(A.arcadeFirstPlayOpen({ dailyFirst: { day: "", games: {} } }, "snap", D1), true);
  assert.equal(A.arcadeFirstPlayOpen(null, "snap", D1), true);
});

test("a round that paid nothing, or an unknown game, changes nothing", () => {
  const st = base();
  for (const r of [play(st, "snap", D1, W1, 0, 0), play(st, "snap", D1, W1, 0, 0.4), play(st, "ghost"), play(st, "")]) {
    assert.equal(r.state, st); assert.equal(r.text, ""); assert.equal(r.firstPlay, false);
  }
  assert.equal(play(st, "snap", D1, W1, 0, 5).firstPlay, true, "xp alone is a paid round");
});

test("a zero-payout round does not burn the day's bonus", () => {
  const a = play(base(), "snap", D1, W1, 0, 0).state;
  const b = play(a, "snap", D1, W1, 10, 5, 2);
  assert.equal(b.firstPlay, true);
});

test("opens are counted separately from plays", () => {
  let st = A.arcadeRecordOpen(base(), "crawl", D1);
  st = A.arcadeRecordOpen(st, "crawl", D1);
  assert.deepEqual(st.gameStats.crawl, { opens: 2, plays: 0, coins: 0, last: D1 });
  st = play(st, "crawl").state;
  assert.deepEqual(st.gameStats.crawl, { opens: 2, plays: 1, coins: 10, last: D1 });
  const same = base();
  assert.equal(A.arcadeRecordOpen(same, "select", D1), same);
  assert.equal(A.arcadeRecordOpen(same, "", D1), same);
});

test("tiers: 3 distinct games pay 1 token, once; replaying a game does not advance them", () => {
  let st = base();
  st = play(st, "snap").state; st = play(st, "snap").state; st = play(st, "snap").state;
  assert.equal(Object.keys(st.rotation.games).length, 1);
  assert.equal(st.rotation.games.snap, 3);
  assert.equal(st.tokens, 2);
  st = play(st, "rush").state;
  assert.equal(st.tokens, 2);
  const r = play(st, "preop");
  assert.equal(r.state.tokens, 3);
  assert.deepEqual(r.tiers.map((t) => t.n), [3]);
  assert.match(r.text, /📋 3 games this week: \+1 🪙/);
  assert.deepEqual(r.state.rotation.claimed, { 3: true });
  const again = play(r.state, "preop");
  assert.equal(again.state.tokens, 3);
  assert.deepEqual(again.tiers, []);
});

test("tiers: 5 pays a token and coins, 7 is the full rotation", () => {
  const ids = ["snap", "rush", "preop", "squadron", "drugmatch", "buzzer", "staging", "crawl"];
  let st = base(); const log = [];
  ids.forEach((id, i) => {
    const r = play(st, id, D1, W1, 10, 5, i + 1);
    log.push({ id, tokens: r.state.tokens - st.tokens, tiers: r.tiers.map((t) => t.n) });
    st = r.state;
  });
  assert.deepEqual(log.map((l) => l.tiers), [[], [], [3], [], [5], [], [7], []]);
  assert.deepEqual(log.map((l) => l.tokens), [0, 0, 1, 0, 1, 0, 2, 0]);
  assert.equal(st.tokens, 2 + 1 + 1 + 2);
  assert.equal(st.rotationFull, 1);
  // coins: 8 first-play bonuses + the 30 and 100 from tiers 5 and 7
  assert.equal(st.coins, 100 + 8 * A.FIRST_PLAY_COINS + 30 + 100);
  assert.equal(st.xp, 50 + 8 * A.FIRST_PLAY_XP);
  assert.match(log.length && play(clone(st), "snap", "2026-11-12", W1).text, /First Snap Decision today/);
  assert.equal(play(st, "snap", D1, W1).state.rotationFull, 1, "a full week pays only once");
});

test("first-play and a tier arrive in one toast line", () => {
  let st = base();
  st = play(st, "snap").state; st = play(st, "rush", D1, W1, 10, 5, 2).state;
  const r = play(st, "preop", D1, W1, 10, 5, 3);
  assert.match(r.text, /^🎯 First Pre-Op, Please today: \+25 💰 \+10 XP · 📋 3 games this week: \+1 🪙$/);
  assert.deepEqual(r.state.arcadeLast, { ts: 3, text: r.text });
  assert.equal(r.state.coins, 100 + 3 * A.FIRST_PLAY_COINS, "three first plays, and the 3-game tier pays a token, not coins");
  assert.equal(r.state.tokens, 3);
});

test("no bonus, no new toast: arcadeLast keeps the previous line", () => {
  const a = play(base(), "snap", D1, W1, 10, 5, 7).state;
  const b = play(a, "snap", D1, W1, 10, 5, 8).state;
  assert.deepEqual(b.arcadeLast, a.arcadeLast);
});

test("a new week resets the minimums but keeps the lifetime full-rotation count", () => {
  let st = base(); const ids = A.ARCADE_GAME_IDS;
  ids.slice(0, 7).forEach((id, i) => { st = play(st, id, D1, W1, 10, 5, i + 1).state; });
  assert.equal(st.rotationFull, 1);
  assert.deepEqual(A.arcadeRotation(st, "2026-11-16"), { week: "2026-11-16", games: {}, claimed: {} }, "a stale record reads as empty");
  assert.equal(Object.keys(A.arcadeRotation(st, W1).games).length, 7);
  const r = play(st, "snap", "2026-11-16", "2026-11-16", 10, 5, 99);
  assert.deepEqual(r.state.rotation, { week: "2026-11-16", games: { snap: 1 }, claimed: {} });
  assert.equal(r.state.rotationFull, 1);
  assert.equal(r.state.tokens, st.tokens, "no tier on the first game of the week");
  let st2 = r.state;
  ["rush", "preop"].forEach((id, i) => { st2 = play(st2, id, "2026-11-16", "2026-11-16", 10, 5, 100 + i).state; });
  assert.equal(st2.tokens, st.tokens + 1, "the 3-game tier pays again next week");
});

test("a profile saved before this feature (no fields at all) plays fine", () => {
  const old = { coins: 5, xp: 1, tokens: 0, games: 3 };
  const r = play(old, "snap");
  assert.equal(r.state.coins, 5 + 25);
  assert.equal(r.state.gameStats.snap.plays, 1);
  assert.equal(A.arcadeRecordOpen(old, "snap", D1).gameStats.snap.opens, 1);
});

test("the input state is never mutated, and the result survives a JSON round trip", () => {
  let st = base();
  A.ARCADE_GAME_IDS.forEach((id, i) => {
    const before = JSON.stringify(st);
    st = A.arcadeRecordOpen(st, id, D1);
    const mid = JSON.stringify(st);
    const r = play(st, id, D1, W1, 10, 5, i + 1);
    assert.equal(JSON.stringify(st), mid, "play mutated its input for " + id);
    assert.notEqual(r.state, st);
    st = JSON.parse(JSON.stringify(r.state));
    assert.notEqual(before, JSON.stringify(st));
  });
  assert.equal(st.gameStats.crawl.opens, 1);
  assert.equal(st.rotationFull, 1);
});

test("two rounds queued before a re-render both land (updaters chain on fresh state)", () => {
  // gameReward hands arcadeRecordPlay to setS's updater, so the second call sees the first's result
  const a = play(base(), "snap", D1, W1, 10, 5, 1).state;
  const b = play(a, "snap", D1, W1, 10, 5, 2).state;
  assert.equal(b.gameStats.snap.plays, 2);
  assert.equal(b.coins - 100, A.FIRST_PLAY_COINS, "the bonus was paid once across the pair");
});

test("minimumReward text", () => {
  assert.equal(A.minimumReward({ tokens: 1, coins: 0 }), "+1 🪙");
  assert.equal(A.minimumReward({ tokens: 1, coins: 30 }), "+1 🪙 +30 💰");
  assert.equal(A.minimumReward({ tokens: 0, coins: 50 }), "+50 💰");
});

console.log("\n" + passed + " passed, " + failed + " failed (TZ=" + (process.env.TZ || "system") + ")");
process.exit(failed ? 1 : 0);
