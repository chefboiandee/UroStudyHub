# Status — UroStudyHub

**Updated:** 2026-10-25
**Tool:** Claude Code (Opus 5.5)

## 2026-10-25 (cloud) — Games remember progress

**Done:** Pre-Op, Please saves the furthest day (`localStorage` `pp_day`) and Day 1's bulletin
offers "Continue — Day N". Clinic Rush + Inpatient Consults save the furthest wave in app state
(`s.gameProg.clinic` / `.consults`, via `noteProg()` next to `gameReward`); the ready screen
offers "Continue — Wave N" (starts with that wave's patients/actions; Again/Open = Wave 1).
Rebuilt `UroStudyHub.min.html`; built page loads clean, Pre-Op continue verified headless.
**Not done:** Stone Squadron — the 3D prototype (`prototypes/squadron3d.html`) has no waves/levels
yet, and the 2D bullet-hell isn't in this checkout. Reuse `noteProg(id, level)` when it lands.
**Open:** Clinic/Consults Continue button reads app state captured at mount, so a wave reached
this session shows on the next open. Not pushed.

## 2026-10-25 (late 2) — ⚙️ Fix: AI Provider modal snapped back to Gemini

**Done:** `SettingsModal` is an inner component rendered as `<SettingsModal />`, so any
parent re-render (lecture/tutor updates) remounted it and reset `prov` (and typed keys).
Now rendered via a memoized `settingsOverlay` (`[showSet, lm]`). Rebuilt min.html.
**Next steps:** confirm on device in a lecture's tutor menu. Not pushed; app couldn't fully
render in the sandbox (CDN blocked), only a no-SyntaxError check ran.
**Open questions:** other inner-component modals likely have the same remount issue.

## 2026-10-25 (late) — 🛒 Fix: Arcade Play/Shop tabs didn't switch (iPhone)

**Done:** `gameOverlay` useMemo was keyed on `[showGame]` only, so the Arcade select
screen rendered stale state — tab taps set `gameTab` but nothing re-rendered until
reopen. Deps now also include `gameTab` and `s` while the select screen is open
(other games still don't remount on parent updates). Rebuilt `UroStudyHub.min.html`.
**Same bug class fixed:** the "All games / fit" toggle and coin/token counts in that screen.
**Next steps:** confirm on the iPhone after Andrew pushes. Not pushed, not browser-tested here.
**Open questions:** none.

## 2026-10-25 (night) — 📦 This repo moved to `~/Desktop/UroStudyHub` + its own Claude setup

Andrew: "can we have a whole repo just for urostudyhub instead of working on it
only inside of the nucleus stuff?" → "Yes — move UroStudyHub to
~/Desktop/UroStudyHub … and give it its own Claude setup."

- It was already its own git repo; it lived inside the Nucleus folder, so
  every session loaded Nucleus's CLAUDE.md, hooks and memory. Moved with `mv`
  (git history, all branches incl. local `proto/preop-please`, the remote and
  Pages untouched; uncommitted edits carried over).
- **New here:** `CLAUDE.md` (imports `AGENTS.md`; read-on-demand map, layout,
  run/verify, git rules) · `.claude/launch.json` (gitignored): `urostudyhub`
  = repo root on :2043, `squadron3d-proto` = `prototypes/` on :2047 ·
  `tools/preop-please.drive.mjs` now defaults to :2043 · own memory dir
  (Andrew's working style, the Boox constraint, game-design prefs).
- Nucleus side: its maps, project table, launch configs and the opencode rules
  file point here now; its `.gitignore` keeps `urostudyhub/` as a guard.
- The old :2047 server (pointed at the old path) was stopped. Restart from a
  session opened HERE: launch config `squadron3d-proto`, or
  `python3 -m http.server 2047 --directory prototypes`.
- **Uncommitted:** `CLAUDE.md` (new), the consent fix in
  `games/preop-please.html` (165/165), the harness port, and this STATUS.md.

## 2026-10-25 (night) — 🛂 Pre-Op, Please: SHIPPED to the arcade (`12215f0`, pushed, live on Pages)

Began as a throwaway prototype (Clinic Rush as a Papers, Please desk). Andrew's
verdict after playing: it does NOT replace Clinic Rush, but it's "a really
good way to teach juniors to review for cases the next day" → keep it as its
own game. Then: "add preop please to the main github page, make day 2 …
notice how long meds have been held, then on day 3 … order abx" → done.

- **Where:** `games/preop-please.html` (standalone page, vanilla JS, no deps
  but Google Fonts) — the arcade tile 🛂 `preop` (200 💰 unlock, touch) opens
  it full-screen in a frame (`PreOpPlease()` in `UroStudyHub.html`, right
  above Clinic Rush). Same-origin postMessage: `{type:"preop:claim",coins,xp}`
  → `gameReward` (capped 150 💰 / 80 XP); `{type:"preop:exit"}` → close. In the
  frame the game shows ✕ and "Claim" buttons (end-of-day + final).
- **Days now:**
  - D1 — ID band, booking, labs, **consent** (moved up so D1 isn't thin):
    R1 identity · R2 labs ≤30 d · R3 urine culture before URS/PCNL/TURBT ·
    R4 consent signed + procedure/side match.
  - D2 — the **blood-thinner day** (+ med list, brand names, more patients on
    thinners, TURBT/PCNL/biopsy-heavy): R5 full days held per drug —
    warfarin ≥5 + INR ≤1.5 · Plavix ≥5 · Brilinta ≥5 · **Effient ≥7** ·
    Eliquis/Xarelto/edoxaban ≥2 · **Pradaxa ≥2, ≥4 if eGFR 30–49** (labs show
    Cr · eGFR, CKD-EPI 2021); aspirin 81 continues; office cysto no hold.
    R6 β-hCG (moved here from D3).
  - D3 — CT + booth triage monitor + ESCALATE: R7 fever + hydro → decompress.
    **R8 antibiotic order:** CLEARED swaps the papers for an order sheet (last 3
    urine cultures as an S/R grid over CFZ AMP GEN CRO CIP FEP TZP ETP🔒 MEM🔒;
    tick columns, SEND). Office cysto: none · TP biopsy: none or cefazolin ·
    no positive culture: cefazolin; **Downtown** campus: cefazolin + gentamicin
    for URS/TURBT · positive culture(s): cover every organism → no ID-approval
    carbapenem unless nothing else covers → fewest drugs → narrowest. Wrong
    order = R8 citation saying what it missed and the best order.
  - New cast: Frank (Effient held 5 days "like the Plavix"), Walter (Downtown
    URS, E. faecalis + ESBL E. coli history → ampicillin + gentamicin).
  - **Consents spell the procedure out** (Andrew, while playing: "the consent
    shouldn't have abbreviations on it because that isnt allowed in real
    life"): consent = "Transurethral resection of bladder tumor" etc.; the
    booking slip keeps scheduling shorthand (TURBT, PCNL, URS) and R4 matches
    the PROCEDURE, not the text (inspecting the pair says "same procedure").
    New D1 catch `consentAbbrev`: a consent written "TURBT" / "L URS/LL" →
    DEFER, redo it. (Uncommitted on top of `12215f0` until Andrew OKs a push.)
- **Music:** original procedural oom-pah march (his pick over a "kitchen"
  loop), 🎵 on/off, ≈10–13 dB under the SFX.
- **Verified:** `node tools/preop-please.drive.mjs` (headless Chrome, iPad
  1180×820, real touch; needs a server on the repo root — launch config
  `urostudyhub-root` :2048) → **164/164**: selfTest 1,500 packets 0 problems
  (incl. every Day-3 plan covers its bugs, canonical order passes, a wrong one
  fails, scripted Walter = amp+gen), full 3-day touch run incl. orders, a
  deliberate Ancef-vs-ESBL+Enterococcus order → R8 citation, music, portrait +
  phone layouts. In the built app (Browser pane, :2048): tile in the Arcade,
  game opens in embed mode, Claim paid +10 💰 / +7 XP and closed it, ✕ closed
  with no pay; console only the known Babel-size note + stale LM Studio call.
  Live check after push: Pages serves the game (200) and the tile.
- **Order spectrum** (narrow → broad, my call — vet it): CFZ, AMP · GEN, CRO ·
  CIP · FEP, TZP · 🔒 ETP, MEM. Per his wording "fewest drugs" outranks
  "narrowest", so E. faecalis + E. coli → pip-tazo alone beats amp + cefazolin.
  "Downtown cefazolin + gentamicin" applies to URS and TURBT only (not office
  cysto) and only when there's no positive culture — the history wins.
- **NOT verified:** a real iPad or the Boox (the arcade change is one tile + a
  frame; the game itself targets the iPad); balance at 240 s/day.
- **Moved:** the prototype files left `prototypes/` (the :2047 URL is gone);
  the original prototype is kept on LOCAL branch `proto/preop-please`
  (`1a7fa8c`, never pushed). `STATUS.md` was NOT in the commit (it also holds
  the Squadron session's in-progress notes).

### Next steps (Pre-Op, Please)

- Andrew: play it from the Arcade on the iPad (GitHub Pages). Vet the order
  spectrum + the Downtown interpretation above.
- Still open from his round-2 list: history that makes a case high-risk →
  flag for cardiac clearance (recent stent/MI, decompensated HF, severe AS,
  poor functional capacity); bridging; penicillin/cephalosporin allergy on
  the order sheet.

## 2026-10-25 (late) — 🛩️ Stone Squadron 3D prototype, rounds 2–6 — tester link LIVE

**Tester link (pushed `d5061be`, prototypes/ only):** lab page
`https://chefboiandee.github.io/UroStudyHub/prototypes/` → PLAY. Unlisted
(noindex, not linked from the app). Andrew's junior tests from here and sends
the end-screen **Share/Copy run report** (build, device, settings, result, notes).
**On every change:** bump `BUILD` in squadron3d.html AND the build line in
prototypes/index.html, run the harness, commit `prototypes/` only, push.
**File:** `prototypes/squadron3d.html` — prototype, NOT in `UroStudyHub.html`. Served by root launch config `squadron3d-proto` (:2047, all
interfaces) → iPad `http://<Mac's Tailscale name>:2047/squadron3d.html`.
Harness: `node prototypes/squadron3d_drive.mjs all` (needs the server) —
**42 checks green** (real GPU, iPad 1180×820 + portrait 820×1180, real touch).

Andrew's verdicts so far: steering OK; scope view = realism, chase = game
feel; dust vs frag is a real decision; run length good; IRP gauge very
readable; inverted deflection is hard to switch to "just like in real life".

### Done this session — round 6 (tester release)
- Round-4 marks-lens fixes: burns land where the beam meets the wall (inside
  the scope circle) and blanching shows down the lumen; decals tilt with the
  wall at pinch points / the pelvis flare and ride the breathing +
  peristalsis each frame; repeat hits deepen one lesion site instead of
  stacking (counts = distinct sites); **PULS by worst lesion depth** (frag
  burn / ≥1 s contact / stuck basket = 2) and heat-only death is its own
  "thermal injury" ending, not a perforation.
- Build stamp on the brief; end-screen notes + Share report (iOS share
  sheet) / Copy report (clipboard → execCommand → select-box fallback);
  typing notes no longer fires C/P hotkeys; `noindex` on both pages;
  `prototypes/index.html` lab page. Harness **58/58**.

### Done this session — round 5 (phone) + round-4 review fixes
- **Phones:** plays in **landscape** (compact layout under the max-height
  560px rule: small pedals/buttons, scaled cards, a 99 px fluoro, PULL BACK in
  the corner clear of the joystick, smaller toasts, laser panel fully on
  screen). Held **upright** → "turn your phone sideways" screen; the run
  pauses and resumes by itself when turned back. Phones render at 1.25× and
  the brief suggests Add to Home Screen (Safari can't fullscreen a page).
- Round-4 review (4 lenses done, marks lens still running when written):
  fixed — only deliberately slipped fragments can get behind the tip (the
  new bump rule had let ~45% through); pull-back return parks at the gate
  and never races past; slip toast only once a piece is really behind;
  pedal tapping can't beat the pulse rate; the laser panel keeps a staged
  program per pedal (• marks unapplied) and APPLY applies all; MOVE ON no
  longer under the joystick zone (HUD z-index above touch; screens above
  both); shorter status pill (portrait iPad).
- Harness: **55/55** (iPad landscape + portrait, logic, phone landscape +
  rotate) — `node prototypes/squadron3d_drive.mjs all`.

### Done this session — round 4 (his asks: two pedals, APPLY, pull back, burn marks)
- **Two pedals** like the OR footswitch: left = DUST 0.4×80, right = FRAG
  1.5×8. Hold either; switching between them (even mid-lasing, last pressed
  wins) is free. **Only changing a laser setting costs time** (2.5 s standby
  when reprogramming a pedal at the stone, Advanced). Panel has a LEFT/RIGHT
  pedal picker and says **APPLY**. Keys: J/K pedals, Space fires the selected.
- **PULL BACK** (hold ◀ / B): ~7% of split-off fragments slip distally past
  the scope and lodge; the zone stays open with a "fragment behind the scope"
  banner + fluoro; pull back, the rails hold while you clear it, then glide
  back up. Basket trips return to just below a slipped fragment.
- **Injury marks on the wall:** laser burn (char + blanched halo + hyperaemic
  rim) when the fiber fires on mucosa, thermal blanching >43 °C, abrasion
  streaks from scraping / a stuck basket — persistent decals (stretched along
  the axis so they read on edge-on walls). End screen: **PULS** grade (draft
  mapping: 0 none · 1 superficial · 2 submucosal · ≥3 perforation).
- Harness: 49 checks (all but one green before the last harness fix; the fail
  was the harness, not the game). A 4-lens adversarial review of this round
  (`wf_e5b744d0-d70`) was still running when this was written.

### Done this session
- Round 2 (his asks): brief **run settings** (deflection Standard/Inverted,
  default camera, laser Presets/Advanced; localStorage `sq3d_settings`);
  **pinch points** UVJ/iliac/UPJ (speed cap, guide ring, +100 clean pass);
  **OR TIME**; **basket trips** out to the bladder and back (~17 s from the
  mid stone); **2.5 s laser STANDBY** when changing settings at the stone +
  live ablation-rate readout; **Advanced J × Hz** on one `laserNums()` model
  (presets proven identical to round 1); **fake fluoro run map** (C-arm AP,
  stones by radiopacity, migrated stones shown in the kidney).
- Round 3 (his ask): the Advanced panel is compact, docked above LASER, and
  gets out of the way — **LOCK IN** applies + slides it off; a tap anywhere
  else or 6 s idle closes it ("settings not changed" toast if unapplied).
  Deflection + camera are also toggleable from the **pause menu** mid-run.
- 5-lens adversarial review workflow (53 agents, 2 skeptics per finding):
  18 upheld + 4 split, all fixed — false "consider FRAG" hint on soft stones
  (now from the model's true rate), MOVE ON double-counting a basketed
  fragment, 120 W power cap + per-pulse retropulsion, dust only when on stone,
  mixed-setting finish classified by mechanism, fragment launch = round 1,
  symmetric trip braking at pinches, ring fade (no pop), portrait toasts,
  fluoro anatomy (course over the TP tips, medial at the SI joint; stone 2
  relabelled proximal ureter), stones drawn over the scope on fluoro, a run
  ending mid-trip keeps its trip + specimen.
- Also fixed: my own stray-beam regression (three.js renders `visible =
  undefined` — always coerce), trip camera lag, re-aim after a fragment
  vanishes, SCRUB IN sticky footer.

### Next steps
- Andrew: replay on iPad + phone — pedals, pull back, burn marks, PULS
  wording, phone landscape feel.
- Tester feedback arrives as pasted run reports — read the Notes line +
  the stats before tuning. URO_FPS.md / STONE_SQUADRON.md stay local
  (untracked) unless Andrew says otherwise.
- Balance pass once he has played (high-power fragmenting is still efficient;
  heat is the only limiter besides the 120 W cap). Pearls still draft.
- Then capture: local `proto/squadron3d` branch (never pushed — PUBLIC repo),
  fold the verdict into STONE_SQUADRON.md / the Session C roadmap.

### Open questions / future (Andrew's ideas, not built)
- Cannulate the UVJ; start with a **semi-rigid** sometimes vs **flexible +
  access sheath**; late levels = semi-rigid clears the ureter → place sheath →
  flexible into the pelvis. A sheath also answers the basket-trip cost
  (quick pass-through, lower IRP) at an injury risk on placement.

## 2026-10-25 — ◎ OpenRouter: real key + live model picker

The Router tab offered 5 hardcoded `:free` ids that no longer exist, so a key
could only reach dead models. Now (`UroStudyHub.html`, Settings → Router):

- **Check Key & Load Models** — fetches the public catalog
  (`openrouter.ai/api/v1/models`) and, with a key, `GET /api/v1/key` in
  parallel. Key line: "✓ Key works · $X used" (+ "$Y left on this key" when the
  key has a cap); 401/403 → "Key rejected"; `is_free_tier` → orange warning
  that paid models need credits.
- **Picker** — searchable list (name + id), newest first, price as $/1M
  in / out, green **FREE** pill on $0 models, "Free only" toggle; 200-row cap
  for the Boox. Filtered out: `:batch` ids (OpenRouter Batch API, answers
  within 24h — useless for chat), audio output, image generators (OpenRouter's
  own routers kept). Today: 379 models, 18 free.
- Catalog cached in `uroStudyHub_orModels` — SettingsModal is defined inside
  the App and remounts on every `setLm`, so un-cached state vanished on
  Connect. The type-any-id box stays as a fallback; Connect needs key + model.
- A 402 on Connect appends "add credits … or pick a FREE model".
- Default model is now `openrouter/auto` (`OR_DEFAULT_MODEL`) everywhere the
  dead `google/gemini-2.5-flash:free` was.
- Verified on :2043 (min build, Browser pane): real catalog load + count,
  Free-only, search, row pick, a fake key against the real `/key` endpoint
  (401 → "Key rejected", so CORS with Authorization works), then stubbed
  `/key` (free-tier warning) + chat (402 message → success → "Connected —
  anthropic/claude-sonnet-5.5", settings saved, list survived the remount).
  Console: only the known Babel size note + pre-existing connection-refused.
  ES5-style code, no new deps.
- NOT verified: a real chat with Andrew's own key; the Boox render.
- Committed `0397c9b` and pushed to GitHub at Andrew's ask (2026-10-25) — live on Pages.

## Next steps

- Andrew: paste the key in Settings → Router → Check Key & Load Models →
  pick → Connect, then one tutor turn. If the key line shows the "No credits
  bought yet" warning, paid models will 402 until credits are added.
- Watch: reasoning models on OpenRouter spend part of `max_tokens` (4096 in
  `callAI`) thinking — if a tutor reply ever comes back blank, that's the
  first suspect.

## Earlier — 2026-08-24 — 🎯 Mastery Drill: third tutor mode (778434f)

Adapted from a Gemini-authored "Adaptive Micro-Step Tutor" skill Andrew brought
in (provenance shaky — Gemini reconstructed a YouTube video it couldn't
transcribe — but the pattern is sound mastery learning). Deliberate deltas from
the skill: **no Mermaid** (Boox can't run v10+, ~1MB dep, and models emit a
plain glyph map more reliably) and **SKIP is a sanctioned out** (marks the node
⚠️ weak → revisit list) so a misjudged answer can't deadlock the session.

- `SYSTEM_PROMPT_MASTERY` (after DEEPDIVE): probe edge (2-3 Qs, no teaching) →
  🗺️ MAP of 4-8 atomic nodes (⬜ pending · 🔵 active · ✅ mastered · ⚠️ weak,
  plain text — renders in the existing pre-wrap bubbles, zero client code) →
  one node per message ≤200 words, mechanism-first → exactly one ❓ check
  (cloze/short answer), hard-gated → fail = prerequisite node inserted as "2a"
  → finish = mental models + ⚠️ revisit list. Commands: SKIP / HINT
  (3-strikes) / MAP. Grounds in `upText` like the other modes.
- **Wiring:** `masteryMode` state threaded through autosave snapshot + deps,
  `resumeInterrupted`, `saveLectureSession`/`resumeSavedSession` (legacy saves
  unaffected: `!!item.masteryMode`), pendingResume banner + its Save,
  saved-list label ("🎯 Mastery" instead of bogus "Phase 1/9"), bookmark phase
  label, `goStudyTopic`/skills-launch/Clear/upload all reset it. Prompt select
  in `_sendFromMsgs`: mastery → lecture → deepdive.
- **UI:** 4th topic-card button (amber gradient) + updated card copy; compact
  mastery header (🎯 topic · "pass the check to advance" · 🗺️ Map · 💾 Save,
  same earnTokens as lecture); 💡 Hint / 🗺️ Map / ⏭️ Skip quick row after
  assistant replies; placeholder "Answer the check — or HINT / SKIP / MAP...".
- **Verified live on :2036 (min build, real LM Studio qwen3.8-27b):** build
  clean (only the known Babel size note), probe correctly refused to teach,
  answer → per-probe honest grading → map in exact glyph format with the
  flagged weakness as 🔵 and proven ground as ✅, single ❓ check, quick row
  renders. Local turns run 1-5 min (qwen ~2k reasoning tok) — **usable but
  slow; this mode is best on a cloud provider from Settings.** ES5-style
  code only (var/function), no new deps — Boox-safe by construction.
- Not exercised live (prompt-side, low risk): SKIP→⚠️, 2a insertion, finish
  summary.

### Next steps carried from 2026-08-24

- **🌌 Trail is PARKED (Andrew's call, 2026-08-24):** `TRAIL_TICKET.md`
  deleted; the design + the engine-review findings (update:slow is Chrome
  113+ → persist the 🐢 toggle; single-Babel-block syntax risk; monochrome
  flattening) are preserved under "Parked: 🌌 Trail" in
  `UroStudyHub_CLAUDE.md`'s Roadmap. Rebuild the ticket from there when
  revived — re-verify all code anchors first.
- Andrew: try a real drill on a shaky topic (cloud provider recommended); the
  natural feed-in is Deep Dive's "areas of uncertainty" summary → drill those.
- If Andrew reports the Boox PDF upload failing again, get the exact error
  text — wording maps to cause (see 24e5e59 decision table in git history).

## Standing constraints (do not regress)

- **pdf.js is PINNED to 2.16.105 legacy, vendored in `pdfjs/`** — the Boox Go 7
  (NeoBrowser ≈ Chromium ≤92) can't execute newer workers. Do NOT bump without
  re-testing upload on the Boox. Engine + worker must share a version; CDN
  fallback is jsdelivr 2.16.105 legacy; plan B = main-thread worker.
- **Light-mode sweep exclusions:** THEMES, TCOLOR, game data `col:`/`color:`,
  and any `c.a + "33"` alpha-concat site stay RAW HEX — `var()` there breaks
  the CSS. Never sweep those.
- **Preview verify lesson:** the preview pane throttles page timers between
  tool calls — transient UI (7s toasts, banners) will be missed by cross-call
  polling; sample from inside one hot javascript_exec. (Also: synthetic Enter
  doesn't fire the React onKeyDown send — click the → button when driving.)
- Real storage key is `uroStudyHub_progress` (docs' uroStudyHub_v5 is stale).

## Known-separate (not broken, just noted)

- Study-Plan builder's syllabus upload still uses a naive regex PDF extractor
  (~line 7900), not `pdfExtractText` — shallow but working; its input DOES get
  the new value reset.
- Pomodoro chime is code-path verified only (headless) — audible check
  on-device.
