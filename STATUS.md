# Status — UroStudyHub

**Updated:** 2026-10-25
**Tool:** Claude Code (Opus 5.5)

## 2026-10-30 (late) — 🛩️ Stone Squadron: music, quieter laser, terminal-style briefing

**Done:**
- **Music:** an original generative lounge loop in the spirit of Balatro's mood (not its music).
  - 88 BPM, 8-bar jazzy progression (Am9 Dm9 G13 Cmaj9 Fmaj9 Bø7 E7b9 Am9).
  - Walking triangle bass, rolled e-piano chords + comps, a sparse square arpeggio through a
    dotted-eighth echo, offbeat shaker. One shared LFO gives everything a "tape wobble"
    (±11 cents).
  - Starts at MISSION PREP. Mute covers it; MUSIC On/Off in the brief + pause.
  - Level: averaged RMS ≈ 1/3 of the dusting buzz (measured headless).
- **Laser SFX −25%:** dusting buzz 0.22 → 0.165, hit crackle 0.18 → 0.135, frag pulse 0.55 → 0.41.
- **Briefing terminal:**
  - The chart notes are green phosphor with scanlines and a blinking block cursor.
  - Each note types out the first time it's opened (300 chars/s, faster than reading), with
    key-tick beeps and a "ba-deep" when done. A tap shows it all.
  - Seen notes show instantly for the rest of the run.

**Verified:** headless: music runs (RMS measured), mute silences it; crawl → tap-skip → instant
revisit; all 3 cases play through; no page errors.
**Not verified:** how any of it sounds (no speakers here).

## 2026-10-30 (late night) — 🛩️ Stone Squadron: fix ADVANCE sometimes doing nothing

Andrew: ADVANCE "straight up wouldn't let me advance at times".
**Causes (all fixed):**
1. After PULL BACK the rails ran a "creep back, hold while there's work ahead" mode, and ADVANCE
   was disabled in it. With a fragment ahead, you were stuck.
2. During cleanup, ADVANCE treated the fragment pushed against the tip as its stop: zero movement.
   Now the tip just pushes fragments along (up to 8 past the stone's old spot).
3. In the kidney, the "don't drive into the calyx wall" guard and the deflect-to-advance hold also
   blocked ADVANCE. Both now apply to the rails only; pushing into a wall still does the
   perforation damage.
4. At the closest allowed distance (1.05 off a live stone, any closer shoves it) nothing explained
   it; now the banner reads "AS CLOSE AS IT GETS — LASE FROM HERE".

**Verified:** headless: ADVANCE moves 3.4/s in each case above; all 3 cases play through.

## 2026-10-30 (night) — 🛩️ Stone Squadron: tuning after Andrew's first play (flow, dust, peristalsis, anesthesia clock)

**Done:**
- **Manual moves:** ADVANCE 2.2 → 3.4, PULL BACK 3 → 4.5. The rails approach is unchanged
  (Andrew likes where it slows).
- **Peristalsis:**
  - Amplitude 0.38 → 0.62: the lumen closes to ~40%, and ~0.4 at a narrowing.
  - Waves come every 3–6 s and also fire on shorter stretches (gap > 34, was 66), starting
    between you and the stone.
- **Dust:**
  - Generation 22 → 40/s while dusting; clearing 0.05 + 1.0×flow (was 0.12 + 1.1×flow).
  - Dusting at 35% flow now fogs you below the lock threshold; ~70% keeps you seeing.
- **Irrigation washes stones up:** above 45% flow a ureteral stone drifts up (small ones faster;
  ×0.35 with a sheath). The banner reads "FLOW IS WASHING THE STONE UP ↑" and the attending warns.
  It can migrate a stone past the UPJ.
- **Anesthesia clock ×15** (`OR_X`): the HUD shows "ANESTHESIA 47 min"; par in OR minutes
  (60 / 53 / 68 min); basket trips cost OR minutes. Anesthesia calls 30 min, nearing par, and
  15 min over par.
- Roadmap: narrow-ureter levels (sheath-calibre lumen), ADVANCE a bit closer, and a stone surface
  model with craters and chunks that break off.

**Verified:** headless: waves fire and squeeze; dust/visibility at 35% vs 70% flow; 90% flow moves
a stone ~1 unit/s; the OR clock maths; all 3 cases play through, no page errors.
**Next steps:** Andrew to retune by feel (wave strength, dust, flow push, OR_X).

## 2026-10-30 (evening) — 🛩️ Stone Squadron: debrief fix, ADVANCE button, perforation by pushing, Star Fox comms sound

Andrew (2026-10-30): "push it and merge so it's live — you can do that for the rest of our changes".
He's the only user and tests online, so in this session finished work is pushed, PR'd and merged to `main`.

**Done:**
- **Bug: the debrief/medals never showed in the app (Andrew saw it in admin mode, but it hit
  everyone).** The game sends `squadron:claim` as the debrief opens, and the app's `gameReward()`
  closed every game after paying. Now `gameReward(coins, xp, keepOpen)`; Stone Squadron passes
  `true`. `UroStudyHub.html` changed + `UroStudyHub.min.html` rebuilt. The Babel compile of both is clean.
- **Manual approach:**
  - The rails park `MANUAL_D` (3) short of the old working distance (0.6 for calyx stones, which
    narrow toward the mouth).
  - From there the scope moves only while you hold **▶ ADVANCE** (new button beside PULL BACK; key F).
    It closes in to just off the stone and never shoves it.
  - Fragments can still end up behind the scope.
  - Laser effectiveness falls off with distance (`reach()`: 100% up close → 30% at 5.5).
  - The readout says "far: hold ▶ ADVANCE". The attending explains it on the first stone.
- **Perforation by pushing:** holding ADVANCE with the tip jammed into the wall costs ~32
  integrity/s plus deep lesions, and the attending yells "Never push against resistance". About
  2½ s of it perforates and ends the case (the existing PERF abort).
- **Comms sound/feel:**
  - The window snaps open and shut like a CRT (squash to a bright line), with a scanlined,
    "tuning" portrait.
  - Radio chirp on open, snap on close.
  - Voices are now formant-filtered sawtooth syllables through a band-limited, soft-clipped radio
    chain with a hiss bed. Pitch per character: attending low, tech high, anesthesia mid.

**Verified:** headless:
- Park 5.24 from the stone, no idle drift, ADVANCE to 1.05, stone not pushed.
- Lasing up close works; pushing into the wall → perf.
- All 3 cases play through.
- Comms classes cycle open → shut → open; no page errors.

**Not verified:** how the voices actually sound (no audio here); feel on the iPad.
**Next steps:** Andrew to listen to the voices and tune pitch/speed; tune `MANUAL_D` and `reach()`.

## 2026-10-30 (later) — 🛩️ Stone Squadron: aim along the laser fiber, not the scope centre

Andrew: the fiber off to the side is what's realistic; the centre aiming made it look redundant.

**Done:**
- The fiber exits at 5 o'clock (`FIB_X/FIB_Y`, lateral 0.17 / −0.15).
- Lock-on, basketing, the auto-assist and wall burns all run along the fiber's line. The beam and
  green spot go straight down it, with no snapping toward the stone's centre.
- Scope view: the beam starts at the visible fiber tip.
- Teaching: the first-stone attending line, the start toast, the brief and the target readout
  say "green spot on the stone".
- Big stones still forgive a centred scope (offset 0.23 < radius ~0.9); small fragments
  (radius 0.26–0.5) need the spot.
- PR #2 (medals) merged. Pages deploys for PR #1 and #2 were stuck "queued" on GitHub's side
  at the time of writing.

**Verified:** headless: all cases still play through; the lock follows the fiber; screenshots in
the scope view and chase cam.
**Next steps:** fiber advance/retract + burn-back (roadmap #8).

## 2026-10-30 — 🛩️ Stone Squadron: medals in the debrief (+ PR #1 merged)

**Done:**
- PR #1 (approach, cases, mission prep, OR chatter) opened and merged to `main` on Andrew's
  request. The Pages deploy was still queued when this entry was written.
- **Medals:**
  - Six bonus objectives: stone-free, PULS 0, IRP never over 40, specimen sent, prep (every CT
    target + the right antibiotic), under par (`LV.par`: 4:00 / 3:30 / 4:30).
  - Finishing = bronze; stone-free + 3 = silver; stone-free + 5 = gold; all six = S rank.
    Aborted = no medal.
  - Debrief: the objectives tick in one by one with blips, then the medal stamps in. "NEW BEST"
    plus what the next medal needs.
  - The best medal per case is kept (localStorage `sq3d_medals`) and shown on the case picker.
  - Arcade reward bonus by medal (still capped by the app). Medal line in the run report.

**Verified:** headless: a sloppy run (no antibiotic, no targets, no specimen) → silver; a clean
run → S rank; picker shows ⭐; no page errors.
**Not verified:** on device. Par times come from a bot that lases perfectly (it finishes Case 1
in 2:00), so they probably need loosening or tightening from real play.
**Next steps:** push/merge when Andrew asks; tune par; roadmap #2 (music and sound).

## 2026-10-28 (late) — 🛩️ Stone Squadron: OR chatter (attending as Star Fox wingmate)

Andrew likes cartoonish attending comments like Star Fox wingmates, good for reminders, and likes
the game as a mental prep exercise for juniors.

**Done:**
- A comms box (bottom centre) with cartoon SVG portraits whose mouths flap, plus gibberish voice blips.
- The crew: Dr. Hawke (attending), Remy (scrub tech), Dr. Vance (anesthesia).
- About 30 lines:
  - The case opener and a reaction to the pre-op antibiotic and to any CT targets you missed.
  - A per-stone heads-up (hard stone → think frag; low HU → dust; calyx → deflect).
  - Pinch points, leaving the sheath, peristalsis.
  - IRP >34 and >40, tip heat, lost view, on the wall, lasing blind.
  - Frag pulses at the UPJ, a fragment behind the scope, a stuck basket, the first basket trip.
  - Stone cleared, zone clear, migration, moving on with residual, sepsis, low integrity, the clock.
- Cooldowns and once-per-run keys stop repeats; urgent lines jump the queue.
- The debrief opens with the attending's one-line verdict.
- Settings: OR CHATTER On/Off (brief + pause).

**Verified:** headless: a scripted Case 2 run with the wrong antibiotic produced a sensible line
sequence with no spam; screenshots of the box and the debrief quote; all cases still play through.
**Not verified:** on device; how the voice blips sound on the iPad. Not pushed.
**Next steps:** medals (roadmap #1); Andrew to vet the lines' tone and clinical content.

## 2026-10-28 (later) — 🛩️ Stone Squadron: mission prep (generated CT, chart, antibiotic order)

Andrew wants the game to teach case prep: CT images showing the targets, op notes and imaging
reads as the mission briefing, and a more game-like loop. His full roadmap is in `STONE_SQUADRON.md` (new).

**Done:**
- `games/squadron-ct.js` (new): a procedural non-contrast stone-protocol CT, 117 slices × 3 mm.
  - Anatomy: body wall, liver, spleen, bowel, kidneys (with hydro), psoas, spine, pelvis,
    bladder, vessels with aortic calcification, phleboliths, and a ureteral stent with coils.
  - Drawn in HU, then blurred and given noise and windowing, so the ROI reads plausible HU and
    stones fade at their top and bottom slices (partial volume).
  - Built from the run's actual stones.
- **Mission prep screen** between the brief and SCRUB IN:
  - Scroll the CT (drag, slider, ▲▼, wheel). Soft-tissue and bone windows. Tap anything for an
    ROI; tap a stone to confirm it as a target (+75). Tapping a phlebolith gives a teaching note.
  - Chart tabs: history, the CT read (generated; Case 1 quotes HU, Cases 2–3 make you measure),
    the prior note, and labs with the culture and sensitivities.
  - Pre-op antibiotic order: required before scrubbing in. Each case has its own right answer
    (Case 1 negative culture → cefazolin; Case 2 E. coli, ceftriaxone-sensitive only; Case 3
    Enterococcus → ampicillin). A wrong or missing choice makes sepsis risk build faster (×1.4–2.2)
    and can start it at 18.
  - The debrief has a PRE-OP card with the verdict and why, and the run report has a Prep line.
- The brief's NCCT table is gone; the read replaces it.
- `CLAUDE.md`'s map row for `STONE_SQUADRON.md` updated (it described a 2D game).

**Verified:** headless Chromium: all 3 cases play start to end, no page errors. A script finds
every stone on the CT and checks the phlebolith message, the antibiotic gate and its effect, the
debrief and the report. Screenshots at iPad and phone size; no sideways overflow.
**Not verified:** on device. A CT slice takes ~15–25 ms to render on desktop, so check that
scrolling is smooth on the iPad. Not pushed.
**Next steps:** play it; then medals for the debrief (roadmap #1). The clinical content of the
`PREP` text needs Andrew's review.
**Open questions:** is the CT realistic enough, or is it worth more anatomy work? Should
confirming targets also mark them in the 3D run?

## 2026-10-28 — 🛩️ Stone Squadron: slower stone approach + Cases 2 and 3 (sheath, kidney)

Andrew: the scope moves forward too fast as stones come into view, so it's easy for them to go by.
Also add later levels with a ureteral access sheath and/or work in the renal pelvis and calyces.

**Done (`games/stone-squadron.html` only; the Lab prototype in `prototypes/` is untouched):**
- **Approach:** over the last 26 units before a stone, the scope now slows from cruise (9) to a
  creep (2.6). Headless measurement: ~6 s from first sight to arrival (was ~2.9 s), and at most
  3 units/s over the last 10 (before, it held full cruise until the final brake). The "STONE ahead"
  readout now appears from that distance too.
- **Cases** (`LEVELS`) unlock in order: finishing a run unlocks the next (localStorage
  `sq3d_cases`; `?case=N` opens one directly). There's a picker on the brief and a "CASE n ▸"
  button on the end screen, and the run report names the case.
  - Case 1: the old run, unchanged apart from the approach.
  - Case 2, access sheath (tip at s 186): you ride through the sheath fast, with no wall injury and
    no pinch slowdown or peristalsis inside it. Basket trips go 2.2× faster in the sheath, outflow
    lowers IRP (×0.66), and small fragments that drift back into it wash out. The stones sit high
    (204 / 228 / 252). The sheath shows in 3D (with a marker band at the tip), on the fluoro and on
    the progress bar.
  - Case 3, renal pelvis & calyces (sheath tip at 236): one stone in the pelvis and one each in the
    upper- and lower-pole calyces (side pockets bulging off the pelvis). The rails take you to a
    calyx mouth, then only as far as you deflect toward its stone. They won't push you into a wall,
    so you steer back out to move on. Stones don't migrate here: fragments that wash 9+ units on
    count as residual "in another calyx". The pelvis has brighter light, the camera keeps the calyx
    stone in frame, and the fluoro spreads kidney positions out (upper pole up). The case ends once
    every calyx is clear.
- The track has one more control point past the old end (room for the kidney), and the far end is
  now a closed sac.

**Verified:** in headless Chromium (playwright, with three.js served locally because the CDN is
blocked in the sandbox). A scripted pilot plays all three cases from start to end with no page
errors. Screenshots cover the sheath, the calyx mouth and an upper-pole stone (chase and scope
view), and the case picker fits at 844×390.
**Not verified:** on an iPad or phone. Not pushed.
**Next steps:** play Cases 2–3 on the iPad. Is the 2.6 creep too slow? Are the calyces easy to
find? Is the lower pole hard enough? If testers should get this, port it to
`prototypes/squadron3d.html`.
**Open questions:** should Case 3 add an interpolar stone (the pocket is already modelled), or a
"relocate the stone to the upper pole" move for the lower pole?

## 2026-10-26 — 🛩️ Stone Squadron added to the Arcade

**Done:** `games/stone-squadron.html` = copy of `prototypes/squadron3d.html` + `?embed=1` mode
(no fullscreen request, "Back to Arcade" button on brief/end screens, one `squadron:claim`
{coins, xp} per run + `squadron:exit` by postMessage). App: Arcade tile (🛩️, 250 coins,
touch) + `StoneSquadron` frame host like Pre-Op, Please; app clamps rewards to 150 coins / 80 xp.
Rebuilt `UroStudyHub.min.html`. The tester prototype in `prototypes/` is untouched.
**Not verified:** sandbox blocks the CDN (three.js from jsdelivr), so only no-SyntaxError
and "no page errors" were checked; the game did not render here. Needs a real iPad run.
**Next steps:** push (Andrew), play from the Arcade on the iPad; tune coin/xp payout and
unlock cost; the copy in `games/` will drift from `prototypes/` (sync or retire the prototype).
**Open questions:** needs internet (three.js CDN) — vendor it for offline/Boox?

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
