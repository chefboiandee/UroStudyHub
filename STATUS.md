# Status — UroStudyHub

**Updated:** 2026-07-16 (light mode + tutor pomodoro upgrade shipped — commits 8a77720, b076a3b)
**Tool:** Claude Code (Fable 5)

## Also this session — TUTOR POMODORO (Andrew: tiny on iPad; wanted a session counter + coins)

- Tutor-tab timer: 10px chip → 40px-tall pill (big monospace time, 15/25/45m
  chips, ▶ Start / ⏸ / ▶ resume / ✕, amber ×N session-completions badge).
- Full work phase now pays COINS (duration-scaled 15m→9 / 25m→15 / 45m→27,
  streak multiplier) on top of the existing +2 🪙 tokens; toast announces both;
  `pomodorosToday`/`lastPomDate` now really tracked (hub card shows "N done
  today" from the store).
- New `pomoPaused` state — pause is resumable from tutor pill AND hub card
  (was a one-way door on both surfaces).
- FIXED en route: resume-path completion left the break frozen (no interval),
  which also blocked the "done" transition that logs totalStudyMins —
  countdown factored into shared `startBreakInterval()`.
- Dev hook: load with `?pomodev=4` to shorten work+break to 4s for testing the
  complete→reward cycle. Verified live both paths (straight run + pause/resume
  mid-work): rewards exactly once per run, break ticks to done, ×N increments.
  NOTE the real storage key is `uroStudyHub_progress` — the docs' uroStudyHub_v5
  is stale.

## Done this session — LIGHT MODE (Andrew: unreadable on his Boox Go 7 e-ink reader — dark-only)

- **Theme tokens:** every hardcoded palette hex (~1,865 occurrences, 68 tokens)
  swept to CSS variables (`--c-*` structural / `--a-*` accents) defined in the
  `<style>` block. Dark values = the exact original hexes, so dark mode renders
  byte-identical (verified via computed styles). `[data-theme="light"]` swaps
  the whole palette: white cards on #f3f5f8, near-black text, and accents
  shifted to darker Tailwind shades so colored text passes contrast on white
  (the e-ink requirement).
- **Sweep exclusions (IMPORTANT for future edits):** THEMES, TCOLOR, game data
  `col:`/`color:` fields, feedback `.push({...color})`, and `(x || "#hex") + "aa"`
  sites stay RAW HEX — those values get alpha suffixes string-concatenated
  (`c.a + "33"`); a `var()` there breaks the CSS. Never sweep those. The two
  Snap-Decision swipe-zone gradients stay hex for the same reason.
- **THEMES:** each shop theme gained an `lc` (light counterpart — same accent
  identity, light surfaces); resolution is `var c = (lightMode && th.lc) ? th.lc : th.c`.
- **Toggle:** ☀️/🌙 button in the header next to ⚙. Persists in localStorage
  `uroStudyHub_mode` (own key, not the s-blob); a `<head>` pre-paint script
  applies it before first render (no flash) and swaps the theme-color meta.
  Default stays dark — no behavior change for existing devices until toggled.
- **Bug fixed en route:** the gradient wordmark used the `background` shorthand;
  React re-render reset `-webkit-background-clip: text` → solid purple block on
  theme change. Now `backgroundImage` (longhand doesn't reset clip).

## Verified
Served on :2037 (launch.json gained `urostudyhub-2037`; :2036 was held by
another session). Source + rebuilt min.html: dark default unchanged (computed
styles = original hexes), toggle → light across Hub / Study Tracker / Tutor /
Pocket Guide (BPH Meds card: dense clinical text + red warnings readable) /
Arcade modal, reload persists light, toggle back restores dark + meta. Only
pre-existing Babel size notes in console. Pushed to origin/main — GitHub Pages
redeploys on push.

## Next steps
- **Andrew:** on the Boox, load the site fresh (the SW is network-first — one
  reload picks up the new build) and tap **☀️** in the header. It sticks
  per-device. iPad PWA: force-quit + relaunch once if it looks stale.
- Carry-forward (2026-07-09): local backup branches `tutor-sidekick-backup` /
  `tutor-sidekick-premutback` — delete once happy. Untracked residue:
  `STONE_SQUADRON.md`, `URO_FPS.md`, README.docx (Andrew to decide).

## Open questions
- None. (If any game screen shows a washed-out tint in light mode, it's one of
  the deliberately-unswept concat sites — cosmetic, fix per-site.)
