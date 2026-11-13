# Status — UroStudyHub

**Updated:** 2026-11-13
**Tool:** Claude Code

## 2026-11-13 (later 2) — 🪞 Path of Pathology: character select and the wardrobe (roadmap Step 5)

Andrew: "Read UROCRAWL_ROADMAP.md and do Step 5". All in `games/uro-crawl.html`: the rig is `drawSurgeon` (§15), the rest is
the new §17c; the roadmap's Step 5 note lists every place the build reads the spec its own way. Cosmetic only.

**Done:**
- **"Who are you?"** opens the first time you walk into the Call Room: Male / Female / Neutral (one rig, a different
  silhouette: shoulders, waist, hair volume, lashes, brows), 8 skin tones, 6 hair styles, 10 hair colours (two silly), with a
  live turning preview and THAT'S ME inside it (so a phone never scrolls to it). A cheval mirror by the scrub cabinet reopens
  it and shows your reflection when you stand close. Saved in `META.hero`; an untouched save looks exactly as before.
- **The wardrobe** (the scrub cabinet, `META.wardrobe`): six slots (cap, outfit, coat, mask, headlamp, extras), 31 items and
  9 scrub colours (3 new). Tap to try on, tap again to buy with CME (10-25 small, 40-80 themed), tap what you wear to take it
  off. Printed skull caps (ducks, flames, little kidneys, stones, stripes), a bouffant, no cap, the embroidered and the long
  attending coat, loupes, warm / teal / rainbow headlamps, a lanyard with your PGY and a stethoscope; two sets: the **retro
  surgeon** (gown, gauze mask, cloth cap with a head mirror, rubber gloves, and an old-photograph sepia toggle) and the
  **plague doctor** (dark coat, beaked mask that points where you face, wide hat whose brim holds the headlamp as a lantern).
  A catalogue tab lists everything as silhouettes with the unlock.
- **Deeds:** plague doctor for beating Fournier's, retro surgeon for Young's favour, lead apron for a room of nothing but
  stones (or Nitze's favour), attending coat at PGY-6, the cap of shame for a run that ends with continence lost. Each can
  also be bought early. New unlocks are named on the summary, toasted in the room and dotted on the cabinet.
- **The cast notices:** one remark per speaker per new look ("Please take that off." / "Seen worse." / "Love the beak, very
  on-brand for infectious disease." and more for the retro set, the cap of shame, the apron, sepia, the rainbow lamp, loupes,
  the attending coat), then their usual lines.
- **Portraits:** a round bust left of the HP bar in a run (worried below 25% HP) and next to the summary's title.

**Verified:** headless Chromium, `node tools/uro-crawl.drive.mjs`: every block passes, 522 checks (480 before, plus T). New block T is 42 checks: the first-time
screen and its pickers, the look seen in the room, the HUD and the summary by sampling pixels for the chosen skin and hair
colours, the mirror, persistence, QUICK START players asked on their first walk-in, `?hero=`; every wardrobe item tried on,
bought for exactly its price, worn, taken off and put back on; sets, sepia, the new scrub colours, the CME floor, the
catalogue's silhouettes; each deed (with a mixed room that must not count); the cast's lines; and one seeded room played by
the same bot in five looks with identical numbers (P.r 13 throughout); a costumed fight at 60 fps on a phone viewport.
Block R was adapted where the first-time screen, the mirror prop and the nine colours changed its flow and counts. Script
parses as ES2019. `UroStudyHub.html` is unchanged (no rebuild).
**Roadmap:** Step 5 is ticked: all five numbered steps are done; only the parked items remain.
**Next steps:** look at the outfits on the phone; the art is drawn at 1.2× in a 960×540 room, so the small details (the coat
embroidery, the stethoscope, the lanyard digit) only really read in the previews.
**Open questions:**
- Neutral kept as a third build (the open question from the Step 5 planning entry): drop it, or keep?
- The lanyard got its own "extras" slot (with the stethoscope) instead of the outfit slot, so it can be worn over scrubs. OK?
- Deed items can also be bought early (like the scrub colours). Should the plague doctor stay deed-only instead?

## 2026-11-13 (later) — 🧠 AI Tutor: reasoning effort, and switching provider / model without leaving the tab

Andrew: can people set the model's reasoning effort through the API, ideally from the AI Tutor tab, and switch models or
providers there too, without leaving the tab?
**Done:**
- **Reasoning effort**, one saved setting (`lm.effort`, "" = the model's default) sent the way each API takes it:
  Claude `output_config.effort` (low → max; Opus 5.5 / Haiku 5.5 default to medium, the others high), OpenAI and Gemini
  (OpenAI-compatible endpoint) and local servers `reasoning_effort`, OpenRouter `reasoning.effort`. `effortLevels()`
  says which levels a model takes (none for GPT-4o / 4.1, Gemini 2.0, or an OpenRouter model listed without
  `reasoning`); a level a model doesn't offer is sent as its nearest one, and the picker says so. Higher levels get more
  output room (16k, 32k for X-High / Max when streamed, and for Gemini High), since thinking shares the answer's budget.
  Applies to every AI feature that goes through `callAI`, like the model choice does.
- **The tutor's AI chip** (top left of the tutor toolbar) is now a button: `Claude · claude-opus-5-5 · High`. It opens
  an in-tab panel (`AiQuickPanel`): provider buttons (one with no saved key opens Settings on that tab, over the tutor),
  the model (Claude / OpenAI lists; Gemini and Local with a ↻ List button; OpenRouter a searchable catalog), the effort
  buttons, and "⚙ All AI settings". Changes apply from the next message; the chat stays.
- **Settings** has the same effort control (🧠 Reasoning effort). Changing it there doesn't remount the modal, so it
  doesn't jump back to the top (the memo ignores `effort`; other AI-settings changes still remount it, as before).
- **Fixes on the way:** OpenAI's reasoning models (o3-mini / o4-mini, now also GPT-5 / GPT-5 Mini in the list) refuse
  `max_tokens` and a non-default temperature, so connecting to or chatting with them failed; they now get
  `max_completion_tokens` and no temperature. LM Studio's model is kept in its own field (`localModel`) so switching to
  Claude and back doesn't lose it. The OpenRouter catalog is parsed once per stored copy (the chip reads it each second).
**Verified:** new `node tools/ai-pick.drive.mjs` (headless, every AI endpoint stubbed, request bodies checked): 57 checks,
all pass, including that the Settings scroll check fails when the remount fix is removed. `ise-plan.drive` 150,
`arcade-cards.drive` 119, `anki-study.drive` 63: all pass. Added code uses no syntax newer than what the app already uses.
**Not verified:** no real API calls (no keys here, and the providers' docs weren't reachable from this session); the
OpenAI / Gemini / OpenRouter level lists follow their docs as found by web search. If a provider rejects a level, the
tutor shows its error message.
**Next steps:** try High / Max on a real Claude key and Low on Gemini from the live site.
**Open questions:** should effort apply only to the tutor (and Quick Ask) instead of every AI feature?

## 2026-11-13 (roadmap) — 🧑‍⚕️ Uro Crawl roadmap: Step 5, character select and the wardrobe

Andrew: pick a male or female main character for inclusivity, and later spend CME on outfits (scrub caps and colours, white
coat, a retro surgeon from old black-and-white photos, a comedic plague doctor). Docs only; no game code changed.
**Done:** `UROCRAWL_ROADMAP.md` Step 5: character select (Male / Female / an optional Neutral on the same rig, 6+ skin tones,
hair styles and colours, a hub mirror), a wardrobe with slots and ≥ 14 cosmetic items (some bought with CME, some unlocked by
deeds: plague doctor by beating Fournier's, retro surgeon by Young's favour, lead apron), NPC outfit jokes, and harness block T.
Cosmetic only; hitboxes and gameplay numbers unchanged.
**Next steps:** Step 5 (it can run any time). **Open questions:** keep Neutral as a third build or only Male/Female?

## 2026-11-13 — 🧸 Path of Pathology: the Peds Wing and Reflux, the kidney serpent (roadmap Step 4)

Andrew: "read urocrawl.md and do step 4" (`UROCRAWL_ROADMAP.md`, Step 4). The fifth dungeon and its boss, all in
`games/uro-crawl.html` (§14g the dungeon, §14h the boss, §17b the Call Room parts); the roadmap's Step 4 note lists every
place the build reads the spec its own way.

**Done:**
- **The Peds Wing** (`?dungeon=peds`, or the case board's Peds row once the first four bosses are beaten): a bright toy-box
  dungeon of eight rooms with its own enemies. No children are drawn and nothing anatomical: toys, abstract organs, and
  torsion only as an abstract knot in a timed room. The pediatric scope (−15% range, +20% weak-point damage, rooms framed
  tighter by toy blocks) shows on the HUD. Every room has a calm par timer instead of the clock; bronze / silver / gold pay
  RVU and CME and become stickers in a sticker book.
- **Six drills** (Valve Run, Tide Dash, Aim Gallery, Catheter Course, Pop-Off, Torsion ER) in rooms 2, 4 and 6 of a run:
  no damage, a par, a personal best, fail-and-restart (three fails wave you through). Four of them teach a movement technique
  kept in `META.tech` and listed on the pause screen: Perfect Roll, Slide, Flick Shot, Roll Cancel; gold is the mastery badge.
- **Enemies:** the Hydronephrotic Kidney (SFU 1-4: decompress it with a stent or Foley for coins, or it bursts and floods),
  BBD blob, Wilms tumour (elite: a telegraphed roll then a slam, sheds nephroblasts), Botryoid rhabdomyosarcoma (sheds grapes),
  Spasm Bladder (elite: a pressure meter that throws a tide), nocturnal water balloons, febrile-UTI E. coli, PUV leaflet gates
  in the corridors (time them, roll through, or ablate them), and antenatal-ultrasound rooms where kidneys show in the fan.
- **Wilms**, a Peds-only patron, with twelve boons (VA, VAC, PEG, Timed Voiding, Biofeedback, DDAVP, Oxybutynin, CIC, CAP,
  Teddy Bear, Lollipop, Sticker Chart); Young adds two valve boons.
- **Reflux** (`?boss=reflux`): a kidney head on a ureter tail with a peristaltic lump (only the lump hurts), rippled sine /
  figure-eight / loop passes, three wall ports it dives into and pops out of with a backwash, toy-block breakwaters, and the
  verb: carry a bulking needle from the tray (no weapons, 85% speed, a hit or a backwash knocks it loose), stand by a port
  and aim at four injection points to raise a gel mound. All three plugged: it is stranded with its head exposed. Grades
  I-II / III (swarm on every backwash, tail slams that crack plugs) / IV-V (double backwash, the one-time Antireflux Tunnel
  capstone for a CUT hit). The Foley balloon plugs a port once for free.
- **Call Room:** the Peds case row, a sticker-book station, a Sim Lab station that replays every drill with its medal ladder,
  a child-life specialist (10 lines; the first talk gives the Sticker Chart pin), Wilms's Kidney pin and portrait, the
  kids' corner with a toy box, a mural and locker decals in the decor catalog.
- **Tuning the serpent took most of the session.** Bots playing whole fights in headless Chrome showed: at the spec's ~15 s
  plugs nobody strands it (0 strands in 6 fights at 18 s, most of them lost to the E. coli swarm; 0-2 a fight at 24 s, in
  fights of 120-220 s); a strand that
  never ended (the plug clocks froze while stranded, so it re-stranded forever: fixed); a strand that ran on across a grade
  skipped that grade in 5 s; and chasing the head with the Bovie beat plugging outright. As shipped: plugs last 60 s; only
  the maw (a lime weak-point orb at the front) takes the head's ×2 while it swims, and a strand exposes the whole head at
  ×2.5 more for 8 s; plugged ports keep it out longer; a strand that ends with all plugs held blows out the weakest (0.7 s
  tell), and a new grade blows out all of them and refills the tray. A bot that plugs now wins 8 of 8 (99-166 s, mean
  ≈ 125 s, ≈ 50 damage, about one strand a grade); a bot that only chases the head wins half its fights.
- Also fixed on the way: a comment in `startRun` had swallowed `G.neoadj = false; G.neoadjLoss = 0; G.arena = null;
  G.wall = null;`, so those never reset between runs.

**Verified:** headless Chromium, `node tools/uro-crawl.drive.mjs`: every block passes, 480 checks (A-R adapted where the
new patron, pins, props and case row changed their counts). New block S is 93 checks: the scope modifier, par medals and
the sticker book, each drill's success / fail-restart / best time, the four techniques, the elites, gates, decompress vs
pop, every serpent mechanic (loops, the lump, dive / pop / backwash / breakwaters, the needle's pick-up, carry, drop and
loss, the injection ring, weak plugs, the maw, stranding and the blowout, the grades, the tunnel, the Foley, the win), two
full bot fights with no god mode (every tell seen ≥ 0.7 s), the Call Room pieces (SCRUB IN on the Peds case starts a Peds
run), a `?dungeon=peds` run through all nine rooms to the win and its summary, and phone-size touch at 60 fps (the fight and
the busiest drill). Script parses as ES2019. `UroStudyHub.html` is
unchanged (no rebuild).
**Roadmap:** Step 4 is ticked: all four numbered steps are done; only the parked items remain.
**Next steps:** play the Peds Wing on the phone and tune: `REFLUX` (`PLUG_T` 60, `STRAND_MUL` 2.5, `BODY_MUL` 0.5 for the
maw rule, `HP` 3400, `REFILL` 10), the drill pars in `TRIALS` (they come from a bot that plays perfectly: it took gold in
all six), and the room pars in `PEDS.FIGHT`.
**Open questions:**
- Plugs last 60 s instead of the spec's ~15 s, and the maw-only weak point is my addition (the spec says the head is ×2).
  Both came from the bot fights; worth a feel check by hand.
- Three drills in a nine-room run: too many? (`pedsTrialPlan`; one or two is a one-line change.)
- The Peds floor is quite saturated next to the other dungeons; tone it down?

## 2026-11-12 (later 4) — ⏭️ Uro Rush: Continue from the furthest block

Andrew, answering the open question below: "yes add that option". Uro Rush has no waves: a shift is 4 blocks that switch
between clinic and consults, with new orders at blocks 2 and 3. So the block is what it remembers.

**Done (`games/uro-rush.html`):**
- The furthest block reached is saved (`localStorage` `uroRush_block`, 1–4), on reaching it, win or lose. It never goes down.
- From block 2 on, the title and the debrief offer **Continue — Block N of 4** next to Start shift / Play again.
  `startShift(from)` plans the usual 4 blocks and starts at block N: that block's pace (tier), its opening card listing
  every order unlocked by then, the patient count covering only the blocks played, skipped blocks shown as "–" in the
  HUD strip. Score, best score and arcade rewards work as before, so a shorter shift pays less.
- Start shift, Play again and Enter still play the whole shift. Restart (pause menu) restarts from the block the shift
  started at.
- The title's and the debrief's buttons are pinned to the bottom of the card (`.foot`). On a 390×664 phone the second
  button would otherwise sit below the screen edge; the instructions or the missed-cases list now scroll behind them.
  Nothing moves on screens where everything fits.

**Verified:** `tools/uro-rush.drive.mjs` 50 / 50 in headless Chrome (38 before, +12): no Continue on a first visit;
block 2 saved in a lost shift and offered on the debrief; a new visit offers block 3; Continue starts at block 3 / tier 3
with all 12 orders on the card and only blocks 3–4 counted; a continued shift plays to the end and saves block 4; Play
again and Restart behave as above; on three phone sizes both title buttons are on screen without scrolling.
No rebuild: the change is in the game's own page.
**Next steps:** none.
**Open questions:** none new.

## 2026-11-12 (later 3) — 🗞️ Pre-Op, Please: Continue from the furthest day (the unmerged Oct 25 branch)

Andrew: "merge everything that's not live on the app". Two branches had work that was not on `main`. The Call Room
(PR #48) is merged. The other was `claude/funny-archimedes-o1vv7g` (Oct 25, never a PR): "games remember furthest
wave/day" for Pre-Op, Clinic Rush and Consults.

**Done:** carried over only its Pre-Op part (`games/preop-please.html`, 6 lines). The furthest day reached is saved
(`localStorage` `pp_day`), and a fresh visit's Day 1 bulletin offers **Continue — Day N** next to Start shift; it jumps to
that day's bulletin. Its Clinic Rush and Consults part was left out on purpose: on Oct 31 those two React games were
replaced by Uro Rush (`games/uro-rush.html`), so the code it edits no longer exists. The old branch is still on GitHub,
untouched. No rebuild: the change is in the game's own page, not in `UroStudyHub.html`.
**Verified:** `tools/preop-please.drive.mjs` has 4 new checks (no Continue on a first visit; day 3 saved after a full run;
a new visit shows "Continue — Day 3"; it lands on the Day 3 bulletin). A full run passed 170 / 170 in headless Chrome.
Some runs, on unchanged `main` too, stop at "timeout: patient present": the harness taps NEXT as the 75 s shift closes
(its crash shot reads 17:00 DESK CLOSED). That flake predates this change.
**Next steps:** none needed. If wanted, the harness wait can treat a closing desk as the end of the day instead of a failure.
**Open questions:** should Uro Rush also remember its furthest wave and offer a Continue? It has none today.

## 2026-11-12 (later 2) — 🛋️ Path of Pathology: the Call Room, a walkable hub between runs (roadmap Step 3)

Andrew: "read urocrawl roadmap and do step 3". PLAY no longer starts a run: it puts the surgeon in a call room you walk
around, with a station for everything a run starts with and things to buy with a new between-runs currency. The OR door
starts the run. QUICK START on the title skips the room. A save with nothing bought or picked plays exactly as before.

**Done (`games/uro-crawl.html`, one file / ES2019 / no deps, now ~7.6k lines; `tools/uro-crawl.drive.mjs` 387 checks):**
- **§17b The Call Room** (`G.screen === 'hub'`, `?hub=1`): one room in the game's own look and 3/4 depth order, the run's
  movement, roll and touch stick, no combat. The station you stand by gets a ring and a marker; **E, Enter or a click**
  uses it, on touch **one big INTERACT button** (plus ROLL and a menu button). Its own music mode (slow, swung, a walking
  bass). The far wall is taller than a dungeon room's so things can hang on it, under a HUD strip (PGY, loadout, CME, menu).
- **CME credits**: paid at the end of every run and listed on the summary (2 per room cleared, 15 for the boss, 60 more
  for a first kill of that boss, 5 per first-time bestiary chart, 10 per patron-favor milestone). Spent only in the room.
  RVUs stay run-only.
- **Stations** (each opens the same panel):
  - **OR door**: a scrub-in sheet of what comes with you, then SCRUB IN. Walking into the door asks the same question.
  - **Case board**: Stones → Infection → Benign → Oncology, each locked until the boss above it is beaten; Peds Wing is a
    locked row for Step 4. The pick sets the run's boss and dungeon.
  - **Instrument locker**: the two starting instruments from everything your PGY has unlocked (locked ones are silhouettes
    with their level), and a button to the aspects screen. The shelves in the room light up as tools unlock.
  - **Pharmacy cart**: one free starter boon out of three commons, drawn from patrons you have met; restocks every run.
  - **Lanyard pins**: a pin per patron met, one worn per run, a small perk that levels up at 3 and 8 runs worn.
  - **Whiteboard**: four permanent perks bought in small steps (max HP, starting RVUs, a free altar reroll, swap speed).
  - **Chart rack** (the bestiary), **trophy wall** (boss kills, best run, patron portraits that fill in as you meet them).
  - **Coffee machine**: a cup for the first room (drip; espresso once you buy the machine; decaf is a trap).
  - **Pager + scrub cabinet**: scrub colours (by PGY as before, or early for 15 CME) and a pager with opinions.
  - **Decor catalog**: nine items into six slots: Greg the ficus, the fish tank with fish in scrubs, fake diplomas, the
    "Hang in there" poster, framed patron portraits, the Wet Floor sign, a plush kidney, a paperweight collection that
    grows with the stone types you have beaten, the espresso machine.
  - **Rep table**: the four reps and a pen jar that fills with the free pens you took on runs.
  - A small gold dot floats over any station that has something for you right now: a perk or decor item you can afford,
    a boon on the cart nobody packed, a pin nobody wears, a newly opened case.
- **The cast**: the four reps (their existing caricatures, 8 new lines each), a weary attending (10 lines, two of them
  name today's case) and a janitor who walks a round with his mop and gives real gameplay hints (12). Lines go round in
  order, so nobody repeats back to back, and each speaker's place is saved.
- **Title and summary**: PLAY → the room; QUICK START → a run. The summary's main button (and Enter) is CALL ROOM;
  TRY AGAIN and TITLE are still there. The embed contract (`crawl:claim` / `crawl:result` / `crawl:exit`) is unchanged.
- **Hooks and params**: `?hub=1`, `?cme=N`; `UroCrawl.hub.state / enter() / addCme(n) / buy(id)` as asked, plus `step`,
  `goto`, `use`, `place`, `talk`, `scrubIn`, `meet`, `tables` and a few more (listed in the file header).

**Where the build reads the spec one way:** listed at the end of Step 3 in the roadmap. The main ones: permanent things
(loadout, aspects, pin, perks) apply to QUICK START and TRY AGAIN too, per-visit things (case, cart boon, coffee) only
through the door; the door asks before it starts; a sixth decor slot (the counter) holds the espresso machine; the cart is
empty until you have met a patron at an altar.

**Verified:** headless Chrome, every block passes (387). Blocks D and E now start their runs with QUICK START (PLAY goes
to the room). New block R is 58 checks: the title, PLAY → room, `?hub=1` / `?cme=N`, walking and walls, E / Enter / click,
every station's panel and its rules, the unlock chain on the case board, CME spending and refusals, decor slots and swaps,
line rotation for all six speakers, the janitor's round, the scrub-in sheet, a run that carries the instruments, aspect,
boon, pin (+4% exactly), perks, coffee (+6% speed in room 1, gone in room 2) and case, the free reroll, what a won, a
re-won and a lost run pay, the summary's way back, persistence across a reload, a fresh save unchanged (LITHO × stone
still 17.5), and a phone-size touch viewport (stick, INTERACT, ROLL, menu) at 60 fps. Script parses as ES2019.
`UroStudyHub.html` is unchanged (no rebuild).
**One harness fix outside block R:** block P's ending ("shards pop into coins", then the summary) runs on the real clock
and is the check the entry below calls load-sensitive. It timed out in every full run here, before any change of mine.
Block P now closes the other pages before that ending, the way block Q already does, and it passes in a full run.
**Roadmap:** Step 3 is ticked; Step 4 takes harness block S and has a note on where its hub tie-ins plug in.
**Next steps:** walk the room on the phone and tune the tables: `HUB_CME` (how fast things unlock: about 840 CME buys
everything), perk and decor prices, pin values. The roadmap's module split comes next, as its own task, before Step 4.
**Open questions:**
- Should QUICK START and TRY AGAIN carry the permanent picks (as built), or be the bare run?
- Should the OR door start the run the moment you walk into it, or keep the scrub-in sheet?
- Stones and Infection are cases on the board now, but their runs still draw mixed rooms. Give them themed room pools
  like Benign and Oncology have?
- Coffee is free every run. Should a cup cost something, or is the first-room buff small enough to stay free?
- Still open from Step 2: the incontinence curse's fixes cannot be reached in a normal run.

## 2026-11-12 (later) — 💊 Path of Pathology: Finasteride also reduces bleeders in the Giant TURP

Andrew: Finasteride should also cut the bleeders during the fight by a mild percentage.

**Done (`games/uro-crawl.html`; `tools/uro-crawl.drive.mjs` 329 checks):** with the Finasteride boon the chance that a
stroke opens an arterial bleeder is 25% lower (`BPH.HOSE_FIN` 0.75, in the new `bphHoseChance`; hook
`UroCrawl.bph.hoseChance(lobe, dmg)`). The boon card says so. Its other effects are unchanged (lobes and the Gentle Giant
30% smaller, swelling 20% slower).
**Verified:** headless Chromium, every block passes (329); one new check in block Q (the ratio is exactly 0.75 and goes
back without the boon). Of two full runs, the first failed one older check in block P (the Staghorn's "shards pop into
coins", which waits 2.2 s of wall time with some forty pages still open); the rerun passed. It is load-sensitive, not
related to this change.
**Next steps:** tune `HOSE_FIN` after playing if 25% is not the right size. Then Step 3 (the Call Room).
**Open questions:** none new (the ones in the entry below still stand).

## 2026-11-12 — 🚿 Path of Pathology: the Giant TURP (fourth boss), landmarks, the sphincter curse, the Benign dungeon (roadmap Step 2)

Andrew: "read `UROCRAWL_ROADMAP.md` and do Step 2". A fourth boss that is not a duel: the arena is the boss, there is no
health bar, and you win on a flow meter by resecting three sections of prostate down to the capsule without cutting
through it. The other three bosses are untouched (all their checks pass).

**Done (`games/uro-crawl.html`, one file / ES2019 / no deps; `tools/uro-crawl.drive.mjs` 328 checks):**
- **§14f The Giant TURP** (`?boss=bph`, `?section=1|2|3`; every number in `BPH` = `UroCrawl.tuning.BPH`). Qmax starts at
  4 ml/s; each adenoma lobe on the wall is worth a share (40% while you resect it, the rest when its **capsule fibers**
  show as tree rings and the bed gets a tick). 20 ml/s wins; a perfect resection is 24. A corner panel shows the gauge with
  its 20 line and a little stream that thickens; every lobe wears a progress ring (gold once the fibers start to show);
  a strip on the right shows the three sections, a scope marker and a ring per section.
  - **1 Bladder neck:** the median lobe is a ball valve: its flap shuts (0.8 s tell), a retention meter rises and the
    adenoma swells faster until you hit the flap with a cut or cautery; 100% is an acute-retention ring of drops. Two collar
    lobes sit on the bladder-neck ring. Two ureteric orifices at the bottom.
  - **2 Lateral lobes:** a long narrow tube, six lobules that thrust inward (0.7 s circle; every third is a pinch from both
    sides), Nocturia droplets from the two ends.
  - **3 Apex:** a tight room, bleeders ×1.8, and the verumontanum in front of the sphincter.
  - Finishing a section slides the scope on (1.2 s: the finished room scrolls away as a darkening snapshot, the next comes
    in, nothing acts and nothing hurts until it ends).
- **Risk, which is the fight:** steel or heat on a finished bed, or the overkill of the last stroke, goes into that segment
  of the capsule (the §14c wall, reused as is: new kinds NECK / CAPSULE / SINUS, Nocturia leaks in, plug with Foley or coag).
  A lobe on an open hole stops counting until it is sealed. Lasers and water never thin the capsule, so a laser is the safe
  finisher. **The hoser:** resecting can open an arterial bleeder (0.7 s thump): red fog, you see 120 px (Cold Light: 180);
  hold ENERGY on it 1.5 s, or flush with the Irrigation Hose for 6 s of view. **Neck scar:** cautery on the collar lobes
  scars (lasers ×0.3, cold steel none): notice at 50%, red warning and tick at 80%, at 100% a contracture ring caps flow at
  12 ml/s until it is incised (Urethrotome ×1, Scalpel ×3); the ring follows the scope. **Swelling** every ~10 s shrinks
  the room up to 18%; resecting pushes it back. **TUR syndrome:** the hose held 6 s reverses your controls for 4 s.
- **§14e Landmarks (generic, for Step 4 too):** `addLandmark({...})`: a floor structure auto-aim never picks, that warns
  first (ring pulse, rising tone, a one-line notice) as you or a CUT / ENERGY hit area comes within 40 px, and calls
  `onInjury` when steel or heat touches it. Ureteric orifice: −15% max HP. **Verumontanum: SPHINCTER INJURY**: red flash,
  "NOOOO", −35% max HP (never the last point), and the **incontinence curse** for the rest of the run: every roll and
  every hit leaves a urine puddle that counts as saline (the Bovie fizzles in it or firing through it), the surgeon drips,
  the win screen says "Continence: lost." Fixes: Kegel Training (half the leaks, half the puddle life, and a 20% smaller
  trigger before any injury), the Artificial Sphincter (in ~half of shops while cursed, 150 RVU × markup; the next rep
  opens with "I've got just the thing for that" and sells it for 75). Hook: `UroCrawl.injureSphincter()`.
- **Benign dungeon:** the boss roll is now quarters (a seed keeps its boss or moves to this one). Benign runs draw only
  BENIGN rooms, plus **Nocturia** (a sleepwalking droplet in a nightcap) which lives only there. The rest-room crate before
  this boss is a Resectoscope Loop if you carry none (×1.5 on adenoma, chips fly).
- **Boons:** Kegel Training (Foley), Finasteride (Huggins: lobes and the Gentle Giant start 30% smaller, swelling 20%
  slower); Tamsulosin also slows the swelling. Bestiary: The Giant TURP, Nocturia.
- Small generic hooks: `e.special`, `e.noAim`, `def.noBar`, `drawWorld(c)`, `setNotice()`, wall wording options.

**Where the build reads the spec one way:** listed at the end of Step 2 in the roadmap. The main ones: the win screen
shows the real Qmax (20-22, not a fixed 24); the neck ring is the two collar lobes; the contracture ring follows you so it
can always be cut; lobes are not solid and do not hurt to touch.

**Verified:** headless Chromium, every block passes (328). Block O's boss-pool check was adapted to four bosses. New block
Q is 67 checks: flow and fibers, loop ×1.5, overcut → thinning → perforation → coag plug / Foley / chronic, swelling and
the boon rates, the valve and retention, the landmark warning levels and both injuries, scar rates → warnings →
contracture → cap → Urethrotome / Scalpel incision, the hoser (random start, fog radius, dab vs hold, hose flush), thrust
and pinch, both slides and `?section=`, the curse (puddles, Bovie in and through, Kegel, next room, new run), the shop and
rep fixes, TUR, the win and its summary, the dungeon, the pool, the bestiary, skipRoom, **two full fights played by a bot
with no god mode and the default boss loadout (about 90 s each, 13-21 damage taken)**, every tell ≥ 0.5 s, and a phone-size
touch viewport at 60 fps. Script parses as ES2019. `UroStudyHub.html` is unchanged (no rebuild).
**Roadmap:** Step 2 is ticked; Steps 3-4 take harness blocks R, S.
**Next steps:** play it on the phone and tune `BPH`: tissue (`SEC[n].lobes[].hp`), `PERF_MUL` (0.6: how fast an overcut
perforates), `HOSE_P` (bleeder rate), `SCAR` (1/400), thrust tempo (`SEC[n].slam`). Then Step 3 (the Call Room).
**Open questions:**
- **The curse's fixes cannot be reached in a normal run yet.** The verumontanum is in the last section of the last room, so
  nothing comes after an injury: no shop, no rep. Everything is built and tested through the hook. Options: put a
  verumontanum in an ordinary Benign-dungeon room (the curse would then matter for several rooms), or leave it for when
  runs continue past a boss. Not done on my own: it would put a 35% HP trap in ordinary rooms.
- Is the bot's 90 s the right length for a human (target 120-150 s)? Is the loop too risky to finish with (one sweep can
  leave 20% on the capsule)?
- Should the Giant TURP's lobes block movement (a real channel to carve) instead of only shrinking the room?

## 2026-11-11 (later still) — 🦌 Path of Pathology: the Staghorn is a mobile head-on duelist (roadmap Step 1)

Andrew: "read `UROCRAWL_ROADMAP.md` and do Step 1". The Staghorn was a big body rooted on the right wall with four fixed
arms; it is now the Minotaur fight: a stone stag that walks you down, charges, and stuns itself on the wall when you dodge.
Same three phases, same forced weapon swap. Fournier and the Invader are untouched.

**Done (`games/uro-crawl.html`, one file / ES2019 / no deps; `tools/uro-crawl.drive.mjs` 261 checks):**
- **The duel** (§14b, `stag*` functions, every number in the `STAG` table = `UroCrawl.tuning.STAG`): it stalks toward the
  surgeon with a facing and a gait. **Antler charge**: stops, digs in for 0.7 s behind a red lane that follows you and
  locks for the last 0.15 s, then runs that line at 640 px/s. Stand in it: gored for 26, and it skids to a stop (no
  opening). Roll through it or step out: it hits the wall, is **stunned 2.5 s, takes +50%, and one tine snaps off**
  (a stunned enemy does no contact damage: the existing global rule). **Antler sweep**: a 0.55 s cone up close, 18 damage
  and a shove. **Ground slam**: `groundSlam` / `staggerPlayer` with the Gentle Giant's quiet camera, then a ring of shards
  rolls out across the floor to roll through (12, hits once). **Spike volley**: a fan from the rack, 2 spikes per live
  tine + 1 (9 / 7 / 5 / 3, none without a rack).
- **Phases**: 1 SHELL: the body takes 25% until 2 of the 4 tines are gone; a tine is its own target (200 HP, LITHO
  x1.75) and also breaks on a wall crash. 2 INFECTION (66%): biofilm shield (strip with water / Bovie / antibiotics),
  swarms out of the cracks every 5 s, a slime trail along its path, charges less often (7.5-9 s), a wall crash shakes out
  3 more bugs, the slam throws two rings a roll apart. 3 CORE (33%): the shell and remaining tines shatter into a smaller,
  faster core (x1.5 from every class) that opens with a two-armed spiral and a gapped ring, chain-dashes 2-3 times behind
  0.5 s lanes (a dash that reaches the wall is a 1.2 s stun) and throws fragmentation bursts of suckable shards.
  Death: slow-mo, the core bursts into 40 shards and each pops into a coin where it lands. Every tell is 0.5 s or longer.
- **Art**: `drawStag` / `drawStagCore`: a faceted hunched boulder on four stone hooves, a skull with a heavy brow and
  the stone family's glowing eye crack, a rack that forks into four pointed tines ending exactly on the tine hitboxes,
  glowing cracks (cyan shell, green infection, orange when it digs in), stars when stunned, blue stone rim throughout.
  It is the first boss drawn in the back-to-front pass with a ground shadow (`def.depth`); rooted bosses stay underneath.
- Small generic hooks: `cone` telegraph kind, `e.aimBias` (touch auto-aim goes for tines while the shell holds, the body
  after), `shard` bullets, nothing shoves a boss in the separation pass.

**Where the build reads the spec one way** (also noted at the end of Step 1 in the roadmap): the shell opens when 2 tines
are *broken*; tine damage stays in the tine and brushing a tine does not hurt; a gore ends the charge with no crash; HP
2800 (was 1500) for the 90-120 s target; each phase change is a ~1.3 s roar that nothing gets through; the core's dashes
are a fixed 0.46 s so they can chain; the old phase-1 stone adds are gone.

**Verified:** headless Chromium, every block passes (261). Block B (phase gates, shield, win screen) was adapted to the
new shell rule; new block P is 24 checks: mobility and depth pass, the charge lane (tracks, locks, 640 px/s, straight),
wall crash (2.5 s stun, tine break, cooldown), +50% and harmless while stunned, gored vs rolled through, the shell and
auto-aim, volley counts, sweep (front / behind / rolled), slam (thud across the room, ring hits once, roll through, no
double hit), phase 2 (roar, shield swap, swarm timer, slime trail and slow, cadence, crash swarm, double ring), phase 3
(core, chain of 2 and of 3 with the wall stun, spiral / gap ring / fragmentation tells), two full fights played by a bot
with no god mode and the starting loadout (about 70 s each, 27 and 54 damage taken), the shards-to-coins death, and that
every tell seen was 0.5 s or more. Script parses as ES2019; 60 fps on a phone-sized touch viewport in headless.
**Roadmap:** Step 1 is ticked; Steps 2-4 take harness blocks Q, R, S.
**Next steps:** play it on the phone and tune `STAG`: `LOCK` (0.15 s: how late the lane stops following), `SPD`, `STUN`,
the body HP (2800) and tine HP (200). Then Step 2 (the Giant TURP boss).
**Open questions:** Is a guaranteed stun on every dodged charge too generous (a human will be gored more than the bot)?
Should a broken tine also chip the body? Should the Staghorn's run get a STONE dungeon theme like Oncology has?

## 2026-11-11 — 📖 Review tab: reviewing Anki cards inside the app (phone-first)

Andrew's question: could reviewing live in UroStudyHub so it is a one-stop shop, with real credit for doing it? The app already
made cards (AI, manual, hooks, ISE misses) but could not review them, and the hub's "Anki reviews" were `+10` self-report
buttons. Decision after discussing devices (phone first, then iPad, then Boox): build the in-app reviewer now, **table the
link to real Anki** (AnkiConnect is desktop-only, so it does not help phone/iPad/Boox).

**Done (`UroStudyHub.html`, built to `UroStudyHub.min.html`):**
- **📖 Review tab** on the Anki page (default once you have cards; the old "Review" tab is now **📇 Cards**, the card browser).
  Home: today's count vs the goal, Review / Learning / New tiles, **Quick 10** (or 25 / All), tag filter, ⚙ limits (new/day, daily
  goal). Card: tap to reveal, Again / Hard / Good / Easy with the next interval on each (62px buttons), undo, edit / suspend /
  delete, keyboard (space, 1–4, Z). Summary: accuracy, XP, coins, goal and queue-cleared messages. No animation (e-ink safe),
  column capped at 640px on iPad.
- **Scheduler** (`ANKI-SCHED-BEGIN/END`, pure ES5): Anki-classic. New: steps 1m/10m, Good-Good graduates to 1d, Easy 4d.
  Review: Hard ×1.2, Good ×ease, Easy ×ease×1.3 with credit for lateness; ease 2.5 (min 1.3); Again = lapse → 10m relearn → 1d.
  Cloze notes = one unit per cloze number (Anki sub-cards), siblings buried till tomorrow. Study day rolls over at **4am local**.
  Schedule is stored on the card (`card.sc[unitKey]`, absent = new; `card.susp`), so existing cards need no migration.
- **Rewards:** 2 XP per graded review (+1 coin per 10, both capped at 100 reviews/day), reviews keep the streak (same rules and
  milestone coins as marking a topic done), the daily goal pays one token, clearing the queue pays +25 XP +5 coins once a day.
- **Bug fixed:** `ankiReviews` was a lifetime counter compared against a *daily* goal with no reset, so after ~50 total taps the hub
  task vanished and the token never paid again. The goal now counts `ankiDays[studyDay]`; `ankiReviews` stays as the lifetime total
  for analytics. The hub row now reads "N cards to review · x/goal today" and jumps to the Review tab; the manual `+10/+25/+50`
  buttons still work (count toward the goal, no XP) for reviews done in real Anki.
- **Tests:** `node tools/anki-sched.test.mjs` (32, run under 3+ time zones) and `node tools/anki-study.drive.mjs` (63: phone
  viewport E2E incl. 360px layout, iPad, dark mode). Existing `arcade-cards` (74), `ise-plan` unit (45) and drive (150) still pass.

**Next steps:**
- **Cross-device sync** is the real gap: phone, iPad and Boox each keep their own deck state in localStorage, so a card reviewed on
  one is still due on another. Options: a "back up / move my deck" code (cheap, like the `URO:ISE:` backup) or the Supabase Phase 2
  item. Cards already have stable ids and per-unit `last` timestamps, so "newest review wins per card" is a straightforward merge;
  `ankiDays` would need to be per-device and summed.
- Parked by choice: link to real Anki (AnkiConnect: read reviewed-today/due counts and credit them, desktop only; verify action
  names against the current docs first, they moved to sourcehut), import from an Anki plain-text export, FSRS, swipe gestures,
  on-card images. Cards pushed to Anki are not marked "in Anki", so pushing and reviewing in-app would double-review.
- Playtest on the live phone: is Quick 10 / 10 new per day the right default, and is 2 XP per review the right size next to 50 XP for a topic?

**Open questions:** the app's other counters (pomodoros, heatmap, streak) use the UTC date while Anki days use local time with a 4am
rollover, so on a US evening the streak day and the Anki day can differ by one; fine for now, worth unifying if it ever shows.

## 2026-11-11 — 🎮 Arcade variety: play counter, daily first-play bonus, weekly Case Minimums

Andrew's worry: some games are more polished and more fun than others, so players will grind Path of Pathology or Stone Squadron and
skip the rest. Pricing the fun games up only shrinks play (the coin unlock is paid once; the token cost is flat), so this session adds
carrots instead. Steps 1 and 2 of a six-idea plan (the rest are under Next steps); no game is locked or taxed.

**Done (`UroStudyHub.html`, Boox-safe: plain `var` / `function`, nothing newer than ES5 in the new code):**
- **Play counter** `s.gameStats[id] = { opens, plays, coins, last }`. A *play* is a round that finished and paid; launches are counted
  separately (an effect on `showGame`, so token / trial / admin / gate-question launches are all covered). Before this only the total
  `s.games` existed, so the mix could not be seen. Each Arcade card now reads "N× played".
- **Daily first-play bonus**: the first paid round of each game each local day also pays +25 💰 +10 XP, once per game per day.
  Cards say "+25 💰 first play today" / "✓ today's bonus taken". Needs coins or XP > 0, so launch-and-quit can't farm it.
- **📋 Case Minimums** (weekly, Mon–Sun, local time): paid rounds in 3 / 5 / 7 different games pay +1 🪙 / +1 🪙 +30 💰 / +2 🪙 +100 💰,
  once per tier per week; the 7-game tier also counts a lifetime "full rotation" (★ N full). A progress panel sits at the top of the
  Play tab and each card shows "📋 logged this week". The bonus tokens go to `s.tokens` only (not the activity log / `tokensEarned`),
  so they don't show up in the study heatmap or analytics. Named "Case Minimums" because "Case Log" is the real surgical-case feature.
- One toast line per claim ("🎯 First … today: +25 💰 +10 XP · 📋 3 games this week: +1 🪙"). **Fixed along the way:** the top toast
  had five independent timeouts, so an older toast cleared a newer one early (the daily-login toast was cutting the bonus line short);
  all five now go through `flashToast` with a single timer. The toast pill also no longer wraps at half the screen width.
- `GAMES` moved out of `GameSelectScreen` to module-scope `ARCADE_GAMES`, so the bookkeeping knows every id (add a game there once).
- The bookkeeping is a pure `ARCADE-PLAY-BEGIN/END` block, like the ISE logic, so it is unit-tested without a browser.

**Verified:** `tools/arcade-play.test.mjs` (new, 24 tests; run under `TZ=America/New_York`, `UTC`, `Pacific/Auckland`: week boundaries,
DST days, year change, per-day / per-week resets, tier payouts, no mutation of the input state, pre-feature profiles).
`tools/arcade-cards.drive.mjs` 119 checks pass (74 old + new block E and extra Snap checks: bonus once per day, counters, tiers 3 / 5 /
full from a seeded week, stale day and week reset, an old save with none of the new keys). Frame games are paid through the real
postMessage claim from inside their frame. Stone Squadron's claim is not driven (its page needs three.js from a CDN) but it uses the
same `squadron:claim` → `gameReward` path. Looked at the Arcade at phone width, dark and light.

**Next steps:**
1. **Idea 3: daily "On Call" rotation**: 2–3 games boosted by date (e.g. 2× coins or the token back on a good run), badge on the card.
2. **Idea 4: shared meta currency**: CME credits earned in *every* game, spent in Path of Pathology's Call Room (fold into
   `UROCRAWL_ROADMAP.md` step 3), so Crawl grinders have a reason to visit the others.
3. **Idea 5: cross-game hooks**: a Buzzer / Snap streak gives a starting boon in Crawl; a Squadron clear unlocks a bestiary entry.
4. **Idea 6: pick by time / "Pick for me"**: add a `mins` class (quick / medium / deep) to `ARCADE_GAMES`, an "I have 5 / 15 / 30 min"
   filter, and a "Pick for me" button weighted to games with the oldest `gameStats[id].last`.
5. **Shop perks (Andrew's note: the shop will be bought out quickly).** Everything in the shop is ≈ 5,100 💰 in total (unlocks 1,750,
   upgrades 2,880, themes 500) and the daily bonus adds up to 200 💰 a day on top of round payouts. Candidates, cheapest first:
   more themes and profile titles / frames (rank flair, "Full rotation" badge); a repeatable coin sink such as a capped weekly
   token pack or a gate-question skip; a levelled "Residency Stipend" that raises the first-play bonus; "Pager Priority" (2 free trials
   a day per game); Crawl-side cosmetics bought with CME credits (ties to idea 4); a late-game "Fellowship" prestige reset for a
   permanent badge. Pick a few with Andrew before building.
6. Send `gameStats` / `rotationFull` to the analytics sync (`urostudyhub-analytics-script.js`) so the mix is visible in the sheet.

**Open questions:** is 25 💰 the right bonus size given the shop will drain faster (lower it, or pay part as XP)? Are 3 / 5 / 7 the right
tiers (a new player only has Snap free, so week one tops out at what they can afford to unlock; that also nudges buying unlocks)?
A bigger one-time "first ever play of this game" bonus? Should the daily bonus favour the teaching games over the pure-fun ones?

## 2026-11-11 (later) — 🦀 Path of Pathology: the Invader (third boss), the wall + perforation system, the Oncology dungeon

Andrew (via the brief): a third boss, the muscle-invasive bladder tumour, in a round bladder arena whose wall can
perforate, with the perforation system built generically. Staghorn and Fournier are untouched (all their checks pass).
(The other brief that arrived with it, reps / patrons / the Fournier title card, was already in the game since 11-09; its
harness block M still passes, nothing was redone.)

**Done (`games/uro-crawl.html`, one file / ES2019 / no deps; `tools/uro-crawl.drive.mjs` 237 checks):**
- **§14c wall + perforation (generic)**: `makeWall({cx, cy, rx, ry, n, tagOf, onPerforate, onSealed})` builds `G.wall` and
  `G.arena` (an ellipse every entity, bullet and beam collides with; `enterRoom` clears both). `wallHit(seg, dmg)` fills a
  segment's meter (`PERF.FILL` 120 damage); full = `wallPerforate`: a hole, a flood (70% speed, shorts the Bovie), a wave of
  Tumour Seeds and damage by the segment's tag (`PERF_KINDS`: LATERAL / POSTERIOR minor 8-10 dmg + 3 seeds; DOME severe 22
  dmg + 6 seeds + whatever `onPerforate` does). Plug within 5.5 s: hold a Foley balloon over the hole, or one cauterizing
  hit (Roller Ball, Bovie COAG, loop coag) → `wallPlug`; left alone it is chronic and leaks a seed every 5-7 s. Distension:
  the Irrigation Hose fills a meter; past 60% every perf meter fills 50% faster. Drawn as a fleshy ring (thinner at the
  dome) with an integrity gauge on each segment's inner lip.
- **§14d The Invader** (`?boss=mibc`, 2200 HP = urothelium 500 / lamina propria 500 / muscle 700 / perivesical 500):
  Phase 1 (Ta/T1) frond fans, lobbed seeds that plant CIS carpets (each living one = −15% damage to the body, max 3),
  papillary turrets (mitomycin slows them). Phase 2 (T2): it burrows (untouchable) and pushes four invasive fronts into
  wall segments; damage to a front counts ×2 against the muscle layer, but every CUT or ENERGY hit thins that segment
  (lasers and water do not), and electrocautery (Bovie, Roller Ball, Button, loop) on a LATERAL front can set off the
  obturator jerk: aim yanked, surgeon shoved, +12% on that meter. New boon Obturator Block (Bovie's pool) removes the jerk
  and halves staggers. A dome perforation enrages the boss for 15 s. Phase 3 (T3/T4): through the wall, fat adds, faster
  attacks; ordinary damage only strips it to an exposed core, and the kill is a charged radical cystectomy: hold fire in
  range for 1.5 s, then release. Every attack telegraphed ≥ 0.5 s. Its HUD is a panel in the top-left corner (a round room
  leaves it empty): name, stage, the three layers as stacked bars, a two-line hint, distension.
- **Dungeon**: the final boss is rolled in thirds from the seed (seeds that rolled the Staghorn with r < 1/3 or Fournier
  with 1/2 ≤ r < 5/6 keep theirs). The Invader's run is the ONCOLOGY dungeon: rooms draw only MALIGNANT + BENIGN (label in
  the room strip). Its rest room adds a chemo pole (neoadjuvant cisplatin: boss −20% HP, you −15% max HP for the fight,
  declinable) and makes the crate a Roller Ball if you carry nothing that plugs a hole. Cisplatin +55% and pembrolizumab
  +35% vs the Invader. `?boss=…&room=K` now picks the run's boss without jumping to room 9.
- **Bestiary**: The Invader, Tumour Seed, Perivesical Fat. Win text per boss; the Invader's reads "Muscle present in
  specimen: Muscle-invasive disease confirmed. Pathology report filed." Summary adds perforations / plugged.
- Small generic hooks added for it: `e.dmgMul`, `e.minHp`, `def.onDeath`, `def.solid`, `def.coagHint`, `opts.free` on
  `spawnEnemy`, `clampArena`, hazard kind `flood`, `P.jerk`.

**Verified:** headless Chromium, every block passes (237), new block O (28 checks: arena, layers, each phase, ×2, which
classes thin the wall, the jerk and what does not cause it, both perforation kinds, coag plug, Foley tamponade, chronic
leak, distension, cystectomy charge / early release / kill, win screen, neoadjuvant, crate, dungeon families, boss pool,
bestiary, the wall system standing alone in an ordinary room). Script parses as ES2019.
**Roadmap:** `UROCRAWL_ROADMAP.md` had this boss parked behind Step 2 (which was going to build the perforation system).
It is ticked there now, Step 2e says to reuse §14c, and the harness letters for Steps 1-3 moved to P, Q, R.
**Next steps:** play it on the phone and tune: `MIBC.T` (length), `PERF.FILL` (how forgiving the wall is), `JERK_CHANCE`,
`CYST_TIME` / `CYST_RANGE`, CIS cap (`maxR` 60). Is a chronic hole too punishing with no way to fix it late?
**Open questions:** Stone / Infection themes for the other two dungeons (only Oncology has one). Should direct weapon
contact with the wall (stray beams, bullets) also thin it? Right now only hits on the fronts do.

## 2026-11-11 — 🗺️ Uro Crawl: roadmap doc for the next three sessions

Andrew's follow-up ideas, written down as one-session steps so a fresh session can be told "read `UROCRAWL_ROADMAP.md`
and do the next step". Docs only; no game code changed.

**Done:** `UROCRAWL_ROADMAP.md` (ground rules + a checklist + three full step specs + a parked list), a row in
`CLAUDE.md`'s read-on-demand table.
- **Step 1** Staghorn becomes a mobile Minotaur-style duelist (charge, wall-crash stun, tines break).
- **Step 2** Giant TURP boss: three sections as the scope advances, capsule-fiber progress cue, flow-rate win meter,
  the hoser bleeder (red-out), verumontanum sphincter injury with an incontinence curse, ureteric-orifice and
  bladder-neck-contracture warnings, Kegel / Finasteride boons, a generic perforation system.
- **Step 3** The Call Room hub: walkable pre-run room with starter boon, pins, perks, decor, CME credits and jokes.
- Parked: Muscle-Invasive Bladder Tumor boss (reuses Step 2's perforation system), rename, later ideas.

- **Boox rule relaxed for games** (Andrew: the Boox is for AI tutoring only, not games): `AGENTS.md` and the roadmap now say
  `games/` pages may use modern JS, modules, libraries and WebGL; `UroStudyHub.html` (incl. the arcade tile/frame host) stays Boox-safe.
  A module split of the game is a separate task after Step 3.

- **Reflux plugging reworked** (Andrew): you carry a bulking needle (not a weapon; cannot hurt the serpent; dropped on hit or
  by backwash) and inject around each port in a ring of four points, like Deflux; the Bulking Gel weapon is gone.
- **Step 4 reshaped** (Andrew: more action/time-trial, and a Metroid-style serpent): about half the Peds rooms are timed skill
  trials (Valve Run, Tide Dash, Aim Gallery, Catheter Course, Pop-Off, Torsion ER) with par medals, stickers and movement tech
  you keep (Perfect Roll, Roll Cancel, Slide, Flick Shot); the Reflux boss is a kidney head with a ureter tail that swims
  loops and dives into wall ports; a Sim Lab hub station replays trials.
- **Step 4 added** (Andrew: a Peds dungeon): the toy-box Peds Wing with the Wilms elite, hydronephrotic kidneys (SFU grades),
  BBD blob, botryoid rhabdomyosarcoma, PUV gates, a torsion emergency room (abstract knot), and the Reflux megaureter-serpent
  boss (tide waves + plugging ports with a bulking-gel weapon). Content rule: no children and no paediatric genital or pelvic
  anatomy drawn, so hypospadias / exstrophy / cloaca / prolapse / torsed testis / VACTRL / myelomeningocele are not creatures.

**Next steps:** Step 1 (the Invader took block O; Steps 1-4 take P, Q, R, S: the Path of Pathology look pass took N).
**Open questions:** is the 35 % sphincter hit the right size; should CME also unlock weapons directly, or only decor and perks?

## 2026-11-11 — 🎨 Path of Pathology (was Uro Crawl): enemy look, family outlines, new surgeon, slam + lunge feel, 3/4 room

Andrew's playtest notes: enemies look too alike (wants a subtle outline colour per type), the small round ones especially;
the slamming enemy's screen shake feels like being hit; the scalpel lunge leaves you inside the enemy when the i-frames end;
the main character needs work; asked about an isometric view; likes the name "Path of Pathology". Hitboxes, HP, speeds and
every existing weapon / boon / mod number are unchanged except where listed.

**Done (`games/uro-crawl.html`, still one file / ES2019 / no deps; `tools/uro-crawl.drive.mjs` 209 checks):**
- **Family rim** (`FAMILIES[..].color`, `rim()` / `body()` / `tube()` in §7): a thin band of the family colour outside the
  dark outline of every enemy: blue stones, green microbes, red malignant, yellow benign, violet clots. Same colours on the
  bestiary labels and the help grid, plus a one-line legend in How to Play. Width knob: `RIM_W`.
- **Family face + silhouette language**: stones are rigid and faceted and glare out of a crack (`stoneFace`); microbes are
  soft with bead eyes and flagella (`beadEyes`, `flagella`); tumours keep the bloodshot googly eyes and teeth; benign things
  doze (`shutEyes`). Redrawn: COM (mulberry boulder, tusks), COD (caltrop around the "envelope" crystal), uric (see-through
  rhomboid), cystine (stacked hex plates), struvite (coffin-lid crystal), brushite, fragment (shard), dust, E. coli (rod with
  flagella), Proteus (long swarmer worm), Pseudomonas (rod with one whip and a spout), Enterococcus (bead chain), Candida
  (yeast with pseudohyphae) + bud, Klebsiella (rod in a jelly capsule), Clostridium (three drumsticks), C. difficile (crossed
  rods with spores), satellite, prostate nodule, seminoma (fried-egg cell: one big nucleus-eye), AML (fat globules),
  oncocytoma, clot. The rest got the rim only.
- **Ground slams** (`groundSlam`, `staggerPlayer`, §8): Gentle Giant (BPH) now visibly jumps for its 0.7 s telegraph and
  lands. Red disc (100 px) = 15 damage + 0.7 s stagger; dashed ring out to 165 px = 0.45 s stagger, no damage. Staggered =
  40% speed and no attacking (stars over the head); rolling through the landing avoids it. A slam that misses is a thud and
  a ring: shake ≤ 1.5 across the room, 2.5 in the tremor ring, no zoom punch and no red flash unless you were hit. Brushite
  Brick uses the same helper (smaller); the RCC charge and the COM wall bonk only got the quieter camera.
- **Scalpel lunge**: carves through whatever the stab kills and stops at arm's length from the first thing that survives it
  (never inside it), which is knocked back along the dash and staggered 0.6 s; 0.35 s of recovery i-frames after the dash
  (`LUNGE_GRACE`, `LUNGE_STUN`). Global rule change: a stunned or frozen enemy does no contact damage.
- **Surgeon** (`drawPlayer`): a chibi resident with scrub cap (your scrub colour), headlamp that follows the aim, mask, big
  eyes, white coat with tails that trail when moving, legs with a walk cycle, a sleeve reaching to the tool; somersault on
  roll, stars when staggered, worried brows + sweat at low HP. Hitbox unchanged (r 13 at the chest).
- **3/4 room**: ground shadows, back-to-front draw order (enemies, blocks and the surgeon sorted by their feet), blocks and
  pillars with a lit top and a front face (`drawObstacle`, `BLOCK_H`), a far-wall face, foreshortened floor tiles, wall
  shadows, hops with lift (`e.lift`, `enemyLift`). Paint only: collision and coordinates are untouched.
- **Name**: title screen, page title and the app's arcade card read **Path of Pathology**. File name, storage key
  (`urocrawl.v1`, so saves carry over), postMessage types and `window.UroCrawl` keep the working name.
- Harness: new block N (rim colours, slam telegraph / far / tremor / hit / dodge, lunge stop + grace + stun, lunge through
  kills, stunned-contact rule, every enemy drawing, help legend, bestiary thumbnails). Block A no longer depends on stone
  fragments wandering into range (the basket and dropper checks were passing by luck).

**Verified:** headless Chromium, all blocks pass (209); the script parses as ES2019; the built app loads and the arcade-cards
harness passes (74) with the renamed card.
**Next steps:** feel it on the phone: is the rim subtle enough (`RIM_W` 4.4 → 3.4 for thinner), is 165 px of tremor too much
room control for a stationary enemy (`BPH_TREMOR`), is 0.35 s of lunge recovery enough?
**Open questions:** true isometric (45° diamond, Diablo-style) was NOT done: it wastes the corners of a landscape phone
screen, shrinks everything about 15%, turns every round telegraph into an ellipse and fights a thumbstick; the 3/4 depth pass
is the Hades half of that idea. If Andrew still wants the diamond, prototype it in `prototypes/` first. Name alternatives
floated: Diabladder, Styx & Stones.

## 2026-11-09 (later 9) — 💉 Uro Crawl: Antibiotic Dropper, antibiotic stewardship, the reps cast, patron altars

Andrew (via the brief), three systems on top of the mods/aspects/rep update: a new FLUID weapon, a rebalance of the
antibiotic boons around stewardship, and flavour + structure for the rep NPC and the boon altars. Everything older still
passes the harness; the five earlier weapons and all existing boons behave as before unless a new boon is held.

**Done (`games/uro-crawl.html`, ~4.8k lines, one file / ES2019 / no deps; `tools/uro-crawl.drive.mjs` 196 checks):**
- **Antibiotic Dropper** (`WEAPONS.dropper`, FLUID, unlock PGY-2, in the drop pools and `?weapons=`): must be within ~50 px
  or the primary just shows TOO FAR; a 0.3 s squeeze (you stand still, dashed ring over the target, the bulb squeezes over
  your head), then one heavy drop on the nearest enemy: 30 base, ×3 vs MICROBE (small bugs die outright), ×0.3 vs every
  other family, poisons, strips biofilm. 6 drops a room, refilled on clear; vial pickups (12% off microbe kills) refill 3.
  The vial is your best held antibiotic boon and fires with its spectrum (alt cycles vials; none held → a generic vial,
  ×1.5 vs MICROBE); the HUD slot shows the vial's name and colour. Per-room resistance: each drop teaches that microbe type
  10% (max 60%), shown as a purple R pip on those enemies; resets each room.
- **Antibiotic stewardship** (`§6c`): active antibiotics (Ceftriaxone, Pip-Tazo, Cipro, Vanco, Meropenem) are capped at 2 —
  a third opens the stewardship prompt (STOP one → start it, or SKIP) at altars and in the shop. Per-run resistance meter per
  antibiotic (`G.abxRes`): every covered microbe kill (and every Dropper drop) adds 2% × rate (broad-spectrum Pip-Tazo and
  Meropenem ×2, Cipro ×1.5), lowering the boon's bonus by up to 50%; a bar under the boon's HUD icon. Collateral: while
  running Pip-Tazo or Meropenem, 35% after each combat room that the next room grows 3 C. difficile pods (toxin clouds, burst
  on death) or a Candida colony. Resistant strains in rooms 5+: ESBL E. coli (ignores Ceftriaxone), VRE (ignores Vanco), CRE
  Klebsiella (ignores Meropenem, halves Pip-Tazo), red R badge, bestiary facts. Culture & Sensitivity: a rare door reward
  (rooms 3–6, once) whose pickup reports the next room's microbes and their resistances and reveals them; clearing that room
  on a matching narrow antibiotic with no broad one running pays a De-escalation bonus (+15 coins).
- **Reps** (`REPS`): four invented salespeople from invented companies (Lumenex Surgical, StoneWorks Medical, OmniCautery
  Systems, FluidLogic Devices) as procedural caricatures, each with 7 pitches (pushy / over-friendly / "off-label" / "new and
  improved"), always ending "I'll just leave this with you." A big SKIP PITCH button (auto-advance after 4 s), a free pen /
  swag button that does nothing but count, and a 25% free sample: an extra mod for a one-room drawback (−10% max HP or +10%
  heat), declinable.
- **Patrons** (`PATRONS`): boon altars belong to Civiale (LITHO), Young (CUT), Bovie (ENERGY), Foley (FLUID), Huggins
  (oncology + insulin), Gleason (the Grading boon: grade one held boon up a tier, bonuses +50%/grade, very rare, only when
  something is gradeable), Nitze (vision) and Fleming (antibiotics, honorary guest). Every existing boon sits in exactly one
  pool; four small new boons fill thin pools (Smoke Evacuator, Bipolar Forceps, Continuous Bladder Irrigation, Cystoscopy).
  The boon door plaque shows the patron's glyph and colour; the altar screen shows the caricature, a greeting and favor;
  each boon taken earns favor that raises that patron's rare/epic odds. Generic (patron-less) altars still work.
- **Fournier**: the boss card reads FOURNIER; the bestiary notes the disease is named after Jean Alfred Fournier (1883) and
  that the boss is a cartoon of the disease. All human figures are stylized caricatures.

**Verified:** headless Chromium, all earlier blocks (A–J) still pass; new blocks K (dropper numbers, range, squeeze,
resistance, vials), L (cap + prompt flow, resistance meters, strains' bonuses, collateral spawns, culture + de-escalation)
and M (cast, pools, favor odds, Grading, generic altar, new boons, pitch flow, free sample, Fournier, bestiary).
**Next steps:** feel it on the phone: is 50 px too tight for the Dropper, is the 4 s pitch too long, does the 2-drug cap
bite too early? Knobs: `DROPPER_MAX/RANGE/WIND`, `ABX_CAP`, `ABX_RES_STEP`, the 35% collateral roll, `+0.6 × favor`.
**Open questions:** should the Dropper's generic vial also appear as a "saline" patron boon? Should De-escalation also
require the culture to have shown a resistant strain? Fleming's pool is the only place antibiotics appear now (by design).

## 2026-11-09 (later 8) — 🔧 Uro Crawl: weapon upgrade paths (mods + capstones), aspects, Instrument Rep doors

Andrew (via the brief): a Hades-style per-weapon upgrade system — Daedalus-hammer mods with branches and capstones, pre-run
weapon aspects gated by residency level, and a new "Instrument Rep" door that sells mods for a weapon you carry. Existing
systems untouched: unmodded weapons behave exactly as before (asserted in the harness).

**Done (`games/uro-crawl.html`, ~4.4k lines, still one file / ES2019 / no deps; `tools/uro-crawl.drive.mjs` 161 checks):**
- **MODS table** (`§6b`): 30 rows = 5 weapons × (5 mods + 1 capstone). A row has id, name, weapon, branch (POWER / CONTROL /
  SPECIAL), tier 1–3, `requires` (a same-branch mod id or null; capstones list a prerequisite pair), rarity, desc, and either
  `stats` (multipliers on dmg / rate / range / hw, additive `pierce` / `chain`) or a `flag` the weapon code reads via
  `wflag(w, flag)`. `wmod()` now = rarity × mod stats; `wadd()` for additive keys. ≤ 6 mods + 1 capstone per weapon per run;
  a capstone is offered only once the pair is held (or 3 mods of its branch). Add mods to any weapon by adding rows.
- **Content**: Holmium (Higher Joules, Longer Pulse, Narrow Fiber, Moses Effect, Popcorn → **Whirlpool**: shards circle the
  beam and hit everything within ~35 px of it), Scalpel (Sharpened, Backstab +100% on enemies moving away / lunge hits, Quick
  Hands, Lunge Reset, Bleed Stacking → **Incision and Drainage**: weak-point ×6, pus puddles), Loop (Bigger Loop, Heavy Sweep,
  Fast Return, Blend Current = cut + auto-coag, Wire Whip arc → **TURP Special**: golden coag return sweep, +4 HP per BENIGN
  kill), Bovie (High Wattage, Chain +1, Ground Pad, Spray Mode, Fulguration → **Chain Reaction**: a forking lightning tree,
  fresh targets first then re-hits, 10 hits/pulse), Trilogy (Bigger Probe, Dual-Frequency, Hands-Free Suction, Probe Reach,
  Vortex Pull → **Maelstrom**: a vortex 120 px ahead drags enemies into its eye and grinds stones ×1.5).
- **Aspects** (`ASPECTS`): 3 per starting instrument, picked on the title screen (ASPECTS button → `ov-aspects`; persisted in
  `META.aspects`; II unlocks at PGY-2, III at PGY-4). Each changes behaviour, not numbers: Holmium Dusting / Fragmenting
  (pulse-only, SUPERPULSE alt) / Popcorning (stand still → the tip boils); Scalpel Backstab / Bleeder (thrown blade) / Lunger
  (0.5 s lunge); Loop Loop / Button attachment (cone primary, sweep on alt) / Roller Ball attachment (coag primary, heals);
  Trilogy Ultrasonic / Pneumatic (piston strikes) / Combined (piston every 5th tick, 240 px suction).
- **Instrument Rep doors** (`DOOR_TYPES.rep`, room 3+): each door is for ONE carried weapon — the plaque shows that weapon's
  silhouette + class glyph in its class colour, so you steer the build. Weighted toward weapons already upgraded (+0.4 per
  mod), never exclusive, never the only door. The room's reward is a rep (suit, lanyard grin, sample case) who offers 3 mods;
  one 20-RVU reroll per rep (fresh samples, or another instrument's case when the weapon has nothing new). Also: a rep in the
  call room, and the shop sells a "Rep sample".
- **UI**: branch-progress pip row under every HUD slot (dots per branch, a star for the capstone); a weapon-detail card
  (aspect, mods taken, branch progress bars, capstone preview + prerequisites) on mouse hover or for 3 s after a slot tap;
  the summary lists mods; replacing a modded weapon warns how many mods it loses.
- **Debug**: `UroCrawl.giveMod(id)`, `UroCrawl.setAspect(weapon, aspect)`, `?mods=id1,id2` (grants the weapon if needed),
  `?aspects=holmium:fragmenting,…` (unlocked for the session); `UroCrawl.tables.MODS / ASPECTS`.

**Verified:** headless Chromium, all earlier blocks still pass; block J asserts each mod's observable effect (exact damage
numbers, ranges, timings, stun/bleed/field/puddle side effects), the capstone gating and offer order, every aspect's
behaviour, META persistence + level locks, rep-door rolls (never the only door), momentum weighting, the plaque colour (pixel
read), the full door → rep → reroll → install flow, the shop sample, `giveMod` refusals, the HUD detail card, and that an
unmodded Holmium still ticks for exactly 5.95.
**Next steps:** Andrew to feel the numbers on the phone (reroll price 20 RVU? capstone pairs too hard to assemble in 7 rooms?
rep door weight 2.4 vs combat 3?). Knobs: `MOD_CAP`, `MOD_REROLL_COST`, `MOD_RARITY_W`, the `+0.4` momentum weight in
`pickRepWeapon`, aspect unlock levels in `ASPECTS`.
**Open questions:** should other weapons get rows now (the framework is table-only)? Should the rep also appear in the
mystery-door pool? Backstab currently keys off the enemy's own velocity (fleeing shooters, knocked targets don't count).

## 2026-11-09 (later 7) — 🗡️ Uro Crawl: HIFU, Urethrotome, CO₂ laser, da Vinci ultimate, Condyloma Cluster

Andrew (via the brief): four more instruments on the existing weapon framework plus one benign enemy. Nothing else changed.

**Done (`games/uro-crawl.html`, ~3.8k lines; `tools/uro-crawl.drive.mjs` 92 checks):**
- **HIFU** (ENERGY, charge): hold ~1 s while a lens marks the focal zone (mouse distance, or alt cycles NEAR/MID/FAR
  on touch); release = thermal burst (r 46) that ignores biofilm, necrotic and elite armor (`o.pierceArmor`); +25% vs
  MALIGNANT, prostate another +25% (new per-weapon `dmgMult(e)` hook); 50% move speed while focusing.
- **Urethrotome** (CUT, thrust): fast 140 px piercing stab + bleed; the only thing that cuts **stricture bars** (the
  stricture-hall posts are now `stricture: true` obstacles that regrow 20 s after a cut, drawn open with a timer ring);
  ×2.5 vs clot walls. Alt: cold-knife sweep.
- **CO₂ laser** (ENERGY, beam): thin 320 px beam, no pierce/bleed, +50% on any weak point (`wpBonus`), strips shields
  fast; water absorbs it — standing in saline/water, a puddle within 60 px, or a FLUID bolt/goo crossing the line cuts
  the range to 60 px (`beamInWater`). Red HeNe aiming dot at the end of the guide line. Alt: superpulsed.
- **da Vinci Console** (ultimate, `WEAPONS.davinci.ultimate`, not a slot): meter beside the weapon bar fills from
  kills (25); R / ULT button (touch button appears once owned; gamepad Y) docks the surgeon for 12 s while four
  2-link IK arms (scissors CUT, bipolar ENERGY — can coag stumps —, suction FLUID, fiber LITHO) each pick the enemy
  they hurt most within 280 px at ×0.7 damage. Rolling undocks early. 40 s lockout. Drops once per run; shop too;
  `giveWeapon('davinci')` grants it (and tops the meter up if already held).
- **Condyloma Cluster** (BENIGN, 60 HP, room 2+): cluster of wart-blobs with eyes; dies only to ENERGY — any other kill
  leaves a dormant root (doesn't block the room) that regrows a wart every 6 s and wakes up. Bestiary entry with the
  HPV 6/11 fact. All four weapons in `WEAPON_ORDER`, drop pools, cards and unlock levels (hifu 2, co2 2, davinci 3).

**Verified:** headless Chromium, zero console errors; every earlier weapon still passes its damage check; new checks for
each mechanic above. `?weapons=hifu,urethrotome,co2` and `giveWeapon('davinci')` exercised.
**Next steps:** Andrew to feel the console on the phone (is the ULT button reachable above ALT?) and whether 25 kills
is too slow a charge in early rooms. Knobs: `ULT_DUR 12`, `ULT_LOCK 40`, `need: 25`, arm damage ×0.7, HIFU burst 55.
**Open questions:** should the da Vinci arms respect the Right Tool bonus? Should strictures regrow while you stand in
the gap (currently they push you out)?

## 2026-11-09 (later 6) — 🗡️ Uro Crawl: Isaac art direction, Abscess Sac weak point, Fournier's gangrene boss

Andrew (via the brief): shift the look to Binding of Isaac, add a weak-point enemy, add a second "Hydra" boss. Payout
stays per room at run end whether you win or die (the app already pays rooms×8 + kills/4, +50 on a win).

**Done (`games/uro-crawl.html`, ~3.6k lines, still one file / ES2019 / no deps; `tools/uro-crawl.drive.mjs` 77/77):**
- Art: new primitives (`eyes` with asymmetry/bags/veins/drips, `cyclops`, `drool`, `pustules`, `veins`, `stitches`,
  jagged/stitched mouths, crooked teeth); every enemy redrawn grotesque-cute with the same silhouettes; breathing
  squash + velocity stretch on all movers; darker stained, cracked floor with a fleshy wall trim; Isaac-style player
  (big head, wet eyes that cry at low HP); elites get a dark dashed aura; the Staghorn grew eyes in its cracks.
- Weak-point system (`setWeakPoint` / `updateWeakPoint` / `drawWeakPoint`): a per-enemy movable hit zone with its own
  multipliers, crit class, migration timer + shimmer and hooks; beams, bullets and the probe now pass the hit point.
  Also generic necrotic armor (`e.necro`: ×0.15 until CUT debrides it), `e.invText`, `e.onCauterized`.
- Abscess Sac (MICROBE, 110 HP, room 3+): lurches, lobs pus globs; the glowing bulb migrates every 3 s; body hits ×0.25,
  CUT on the bulb = ×4 "DRAINED!" and the sac collapses into a pus puddle; other classes on the bulb may burst pus at
  you. Bestiary fact: "Abscesses are treated with incision and drainage." Also new Klebsiella (capsule shield, hops)
  and Clostridium (spore pod that spews gas bubbles), room 4+/5+.
- Fournier's gangrene (`?boss=fournier`; `BOSSES`, `spawnFournier`/`updateFournier`): five necrotic lobes; a CUT lobe
  leaves a stump that regrows as two unless coagulated within 3 s (reuses bleed + cauterize); three permanent
  debridements expose the body, whose necrotic armor must be cut away. Phase 2: creeping necrosis along three
  fascial-plane bands (FLUID jets / coag cones push it back, any antibiotic boon shrinks it), gas bubbles that swell
  then burst into fans, polymicrobial adds, sugar crystals that heal it when its necrosis or slams reach them (new
  Insulin boon clears them; walking over one gives 1 RVU). Phase 3: sepsis, red pulse, 45 s clock, migrating SOURCE
  weak point (×0.15 elsewhere); clock out = septic shock (`?god=1` survives). Final room rolls Staghorn or Fournier
  from the seed; `?boss=staghorn|fournier` forces one. Many eyes, legs, a maw; abstract, never anatomical.

**Verified:** headless Chromium, zero console errors; Staghorn fight and all earlier checks still pass. Not on a device.
**Next steps:** Andrew to play Fournier on the live site — is 90–120 s right, is the stump 3 s window fair on touch?
Knobs: `fourlobe.hp 90`, body `hp 1800`, `removed < 3`, stump window `stumpT = 3`, necrosis `22 px/s`, `sepsisMax 45`.
**Open questions:** should the Abscess bulb crit also count toward the Right Tool bonus? Should Fournier's adds pause
during the sepsis clock to keep phase 3 readable on a phone?

## 2026-11-09 (later 5) — 🗡️ Uro Crawl: a dungeon-crawler roguelike (new arcade game, own page)

Brief: a Hades / Gungeon-style top-down roguelike set inside a diseased urinary tract. Not a quiz: the learning is
osmosis (lasers break stones, loops cut tumours, heat burns bugs and lobes, water flushes clots and strips biofilm)
plus one-line bestiary facts.

**Done (`games/uro-crawl.html`, ~3.3k lines, one file, no deps, old-engine safe — no `?.`/`??`/`.at`/`#private`):**
- Core: 960×540 canvas letterboxed, fixed 1/60 step with accumulator, hit-stop, slow-mo, auto-pause when hidden,
  object pools with swap-removal, particle quality setting. Keyboard+mouse, multi-touch (floating left stick, FIRE
  with auto-aim that prefers the enemy your weapon is best against, SWAP/ALT/ROLL, tappable slots), gamepad.
- Rock–paper–scissors: 4 classes (LITHO ◆ cyan, CUT ▲ red, ENERGY ⚡ amber, FLUID 💧 green) × 5 families via `MATRIX`;
  weakness/resistance pips over every health bar, class-coloured numbers, SUPER EFFECTIVE / RESISTED flair, 0.25 s
  swap delay and the +25% Right Tool bonus. Statuses: bleed→cauterize, burn, chill→frozen→shatter, stun, poison,
  biofilm shield (90% block until stripped), immune mark, reveal.
- 19 weapons (`WEAPONS` table, each primary + alt): Holmium (dust/fragment, heat), Scalpel (lunge), Loop (with Button
  and Roller attachments), Bovie (cut/coag, chain, fizzles in saline), Trilogy (suction alt), ESWL (charged ring),
  Roller Ball, Irrigation (overpressure), Basket (grab + hurl), Thulium, Button, Greenlight, Aquablation, Rezum, Cryo,
  Biopsy gun, Brachy seeds, Foley balloon, Stent turret. Rarities upgrade duplicates.
- 26 enemies (`ENEMIES`): 8 stones, 5 microbes, 6 malignant (RCC mini-boss), 5 benign, clot walls, boss parts; each
  with a telegraphed attack, cartoon art, a real fact. 36 boons (`BOONS`: chemo/antibiotic/medical/gear, two duo
  boons). 10 room templates, Hades-style door icons (combat/boon/heal/shop/elite/mystery/rest/boss), 9-room run with
  guaranteed ≥2 altars and ≥2 crates by room 6, pre-boss call room, shop with doctor-bro patter.
- Boss: the Staghorn (Shell → Infection → Core), forces a swap in phase 2 (biofilm + swarm), fragmentation bursts you
  can suck up with the Trilogy. Death/win summaries, Residency XP + unlocks + scrub colours, bestiary, settings.
- Hooks for tests: `?seed ?god ?room ?boss ?weapons ?boons ?embed ?debug`, `window.UroCrawl.{state,spawn,giveWeapon,
  giveBoon,skipRoom,step}`.
- App: `UroCrawl` frame component + arcade tile (`id: "crawl"`, 250 coins, fits every device); payout on
  `crawl:result` (rooms×8 + kills/4 + 50 for a win, capped 150 coins / 80 XP), stays open for the game's own summary.
- Harness `tools/uro-crawl.drive.mjs`: 59/59 (every weapon, matrix, statuses, boss phases, death, persistence, touch,
  rotate overlay, embed contract, 3 seeds autoplayed through all 9 rooms).

**Verified:** headless Chromium (desktop + 900×420 / 800×360 touch viewports, portrait 360×640), zero console errors.
The built app itself could not be booted in this sandbox (cdnjs blocked), so the tile/frame JSX is verified by build
+ inspection only; it mirrors the Stone Squadron frame line for line.
**Next steps:** Andrew to play on the live site (phone landscape first). Balance knobs are at the top of each table:
`MATRIX`, per-weapon `dmg/interval/range`, enemy `hp/speed/cost/minRoom`, `buildWaves` budget (10 + 5·room),
boss `hp 1500` / phase thresholds 0.66 / 0.33, `PARTICLE_CAP`.
**Open questions:** should Uro Crawl pay coins per room as you go (so a death still pays) or only at run end as now?
Is the tutorial room's 4-step prompt enough, or should room 1 force the swap before the doors open?

## 2026-11-09 (later 4) — 🎯 Staging Attack: survival shooter (bubbles, waves, overwhelm)

Andrew: tap-to-stage alone is "just another multiple-choice quiz". He wants the typing-blaster feel back — short case
bubbles moving toward you, tap the right stage to pop them — with several on the field at once, escalating until it
overwhelms you.

**Done (`UroStudyHub.html`, built, 74/74 in `tools/arcade-cards.drive.mjs`):**
- `StagingAttack` is now a canvas field (392×300, rAF loop on ref state; React only draws the HUD, the chip row and
  overlays). Case bubbles spawn at the top, each asking for one component (T, N, M or stage), and drift down. The
  lowest bubble is the target (glow + ▼); tap another bubble to switch. Pop it with the right chip from the row under
  the field, or type the value and press Enter (desktop). A wrong call resets the streak and the bubble lunges 26 px
  closer. A bubble that reaches the red line costs a life (3) and prints the answer; its rule line goes to the debrief.
- **Waves of 10**: speed 14 px/s + 5 per wave, spawn gap 4.6 s shrinking to 1.4 s, 3 → 4 → 5 bubbles allowed on the
  field. Random mode starts on one cancer and mixes all five from wave 3 (the chip row changes under you); a pinned
  cancer stays pure but still ramps. No fixed end: it runs until lives hit 0. Points = (20 + 5 per streak step) ×
  (1 + 0.1 per wave). Wave banner + fanfare; ⏸ button, Enter/Space/P to resume, auto-pause when the tab hides.
- Debrief: "💔 Overwhelmed on wave N", popped / resolved, best streak, every miss with the rule, best score persisted.
  Keeps the AJCC 8 data + `rules` from (later 3). Tile copy updated.
- Harness scenario D: reads the case data from the served page, plays 26 bubbles (typed answer, deliberate wrong chip,
  pause/resume), checks wave 3 + mixed cancers, then stops answering and asserts the overwhelm: 3 misses, 26/29, rule
  lines, claim, best.

**Verified:** headless Chrome + phone-viewport screenshots. Not on a real device. Pace is a first guess: wave 1 takes
~21 s per bubble to cross, wave 5 ~9 s with five on screen.
**Next steps:** Andrew to play on the live site and say whether wave 1 is too slow / wave 4+ too fast. Then Drug Match
→ tap-sort on its own canvas page.
**Open questions:** should a wrong chip cost a life at higher waves? Mixed cancers from wave 3 even when pinned?

## 2026-11-09 (later 3) — 🎯 Staging Attack rebuilt as tap-to-stage on the card-game shell

Andrew: do Staging Attack as tap-to-stage next.

**Done (`UroStudyHub.html`, built, 91/91 in `tools/arcade-cards.drive.mjs`):**
- The falling-card typing game (`StagingSorter`, keyboard-only, vignettes clipped to two lines) is gone. `StagingAttack`
  shows one case at a time with four chip rows (T, N, M, stage group) built from each cancer's option lists; tap one
  per row, **Stage it ▸** (or Enter). 8 cases a round from one cancer (random, never the same twice in a row, or
  pinned with a chip), 45 s each. 5 points per component, +10 for the full house, speed and full-house-streak
  bonuses. Reveal marks the right chips green and the wrong picks red and prints the AJCC 8 rule line for every
  component that was wrong; the debrief lists each missed case with your line → the right line and those rules.
  Best score in `s.gameBest.staging`; tile is now `reqs: { touch: true }` so it shows on phone and iPad.
- **Data fixed against AJCC 8th edition** (76 cases, 5 cancers, each with a `rules` cheat sheet):
  bladder T4b N0 M0 is IVA (was IIIB), bladder N is by node count not size, UTUC any N+ is IV (two cases said III),
  "through the kidney into perinephric fat" is UTUC T4 (was lumped with T3). Prostate cases now carry PSA + grade
  group and use the real groups (I, IIA–C, IIIA–C, IVA–B) incl. the GG5-is-IIIC and PSA ≥20-is-IIIA pearls; testis
  cases carry post-orchiectomy markers (S) so IS / IIIB / IIIC are reachable. Added M1c to prostate.
- No AI deck for this game on purpose: staging content has to be exact.
- Harness scenario D reads `STAGING_CANCERS` from the served page, checks every case is answerable from its chip
  rows, plays a pinned Prostate round with 7 full houses and one deliberate stage-group miss (rule shown on reveal and
  in the debrief), claims, checks the best, then starts a random round.

**Verified:** headless Chrome, phone viewport screenshots of picking and reveal. Not on a real device yet.
**Next steps:** Andrew to play a round per cancer on the live site; tell me if any case or rule line reads wrong.
Then Drug Match → pure tap-sort (own canvas page?), and the ISE tie-in for AI decks.
**Open questions:** should the stage-group rules for prostate/testis be visible *before* answering (a tap-to-peek
"rules" link) rather than only on a miss? Round length 8 vs 10?

## 2026-11-09 (later 2) — 🎮 Arcade: card-game shell, Snap Decision themes, Board Buzzer with the why; Blaster + Visual Dx retired

Andrew's call on the audit below: toss Stone Blaster and Visual Dx, give the Shop back to generic upgrades (themes, XP
and coin boosts; game-specific upgrades can return with a roguelike later), and build the shared shell, with Snap
Decision dealing a different theme every round.

**Done (`UroStudyHub.html`, built, 58/58 in `tools/arcade-cards.drive.mjs`):**
- **Retired** `StoneCrusherGame` and `VisualDxGame`, their tiles, the `STONES` table and the five Blaster-only Shop
  upgrades (Extra Lives, Laser Power, Time Extend, Critical Hit, Coin Magnet). `migrateArcade` (runs once per saved
  profile via `arcadeV`) refunds every coin spent on those upgrades and on the Visual Dx / Snap unlocks, drops the
  dead keys, and the Arcade shows a dismissible banner with the amount. Snap Decision is now the ★ free game (touch
  first, works everywhere incl. the Boox); Buzzer stays at 300 💰.
- **Card-game shell** (`// ═══ CARD GAME SHELL`): `GameFrame` (header with 🔊 toggle, `< Games`, ✕), `ReadyCard`
  (how-to bullets, best score), `RunHud` (score / progress / streak / lives / countdown bar), `OverCard` (score, New
  best!, accuracy, best streak, `+N 💰 · +M XP` preview, **REVIEW · N MISSED** list with your call → right call and the
  why, Claim ▸ / Play again), `useRoundTimer`, `useGameBest` (persisted in `s.gameBest`), `cardRewards` (capped
  150 💰 / 80 XP like the framed games; paid through `gameReward(…, keepOpen)`), `fetchAiDeck` (strict-JSON helper).
  Synthesized sound + haptics live outside the component (`GAME_AUDIO`, `gameSfx`, `uroStudyHub_gameSound`) because the
  game overlay is memoized.
- **Snap Decision**: 7 themes in `SNAP_MODES`, 123 built-in cards with a why each — Bench or OR?, Surveillance or
  Intervention?, Stent or No Stent?, Admit or Discharge?, Biopsy or Hold?, Antibiotics or Not?, Cut or Drug?. Random
  theme per round (never the same twice in a row) or pin one with a chip. 20 s a card, speed + streak scoring, swipe /
  buttons / ← → keys, timeout counts as a miss. "✨ Fresh AI deck" generates 10 cards for the dealt theme and caches
  them (`uroStudyHub_snapAi`, 40 per theme) so built-in rounds draw on them later; failure falls back to the deck.
- **Board Buzzer**: 50-question bank (was 24, no explanations; two outdated items fixed), every answer shows the why,
  1–4 / A–D keys, 12 s, 3 lives, "✨ Fresh AI questions" with the same fallback. Same debrief.
- Docs: `UroStudyHub_CLAUDE.md` game table + shooter notes, `CLAUDE.md` harness list.

**Verified:** headless Chrome (phone viewport too): migration refund maths and banner, Shop contents, full Snap rounds
(pinned + random, keyboard, timeout, claim pays once, best persists), Buzzer round with lives, Drug Match and Staging
Attack still open, no console errors. Not verified on a real iPad or the Boox; the AI-deck path is exercised only by
its fallback (no model in the sandbox).

**Next steps:** Andrew to play a few rounds on the live site (and once on the Boox). Then, from the audit: Staging
Attack → tap-to-stage on the shell; Drug Match → pure tap-sort (own canvas page?). Tie "Fresh AI deck" to the ISE
sprint's weak groups / miss log.
**Open questions:** should Buzzer be free too (it is the most Boox-friendly game)? Reward tuning: a perfect Snap round
pays ~25 💰 vs up to 150 from the framed games.

## 2026-11-09 — 🎮 Audit of the six in-app arcade games (no code changes)

Andrew asked which arcade games have gone stale and how to bring them up to the polish of Uro Rush /
Pre-Op, Please / Stone Squadron (Oct–Nov), tossing any that aren't worth saving.

**Found:** every line of the six React games inside `UroStudyHub.html` (Stone Blaster, Drug Match, Board
Buzzer, Staging Attack, Visual Dx, Snap Decision) dates from July; only the arcade shell got an October
pass (device fit). Against the newer games they lack: a how-to title card, pause / auto-pause, persisted
best score, synthesized sound + haptics, an end-of-run **miss review** with the right answer and a why,
capped and consistent rewards (the in-app games each use their own uncapped `score × 0.12–0.15` formula;
the framed games are capped at 150 💰 / 80 XP), and any harness. The action games drive React re-renders
from a 33 ms `setInterval`, which is heavy on phones and hopeless on the Boox.

**Verdicts proposed (Andrew to confirm):**
- **Snap Decision — keep, extend.** Closest to the bar already. Add the extra modes the `SNAP_MODES` array
  was built for (stent or not, admit or discharge, biopsy or surveil…), a 20+ card seed per mode, miss
  review, best score, cached AI decks, and a tie-in to the ISE sprint's weak groups / miss log.
- **Staging Attack — rebuild as tap-to-stage.** The TNM case data (5 cancers) is the best content of the
  six; the falling-card typing mechanic hides it (cards clip the vignette at 2 lines, keyboard-only so it
  never shows on phone/iPad). Show one case, tap T / N / M / Stage from the existing option lists, add a
  why-line per case. Prostate and testis groupings need GG/PSA and S-marker modifiers to be stage-able.
- **Drug Match — rebuild as a pure tap-sort.** Drop the run-under-the-chute step (on touch there is no
  bucket control, only the A/D pad), keep the belt, tap one of four big bucket buttons, add a why-line on
  misses, more sets (andrology, ADT classes, testis chemo, peds), mixed and side-effect modes. Candidate
  for its own canvas page like Uro Rush.
- **Board Buzzer — fold into one quick-fire card game with Snap.** 24 hardcoded questions, no
  explanations, a few outdated (OAB first-line). Share one shell (title, timer, streak, best, miss review,
  rewards) and re-source questions (bigger seed with a why, AI deck keyed to the ISE block of the day).
- **Visual Dx — toss the drawings.** 16 hand-drawn SVGs; the caption gives the answer away, so it is
  reading, not visual dx, and it cannot scale. Salvage the 16 vignettes as "read the report → dx + next
  step" cards in the card game.
- **Stone Blaster — toss.** Keyboard + mouse only (hidden on phone/iPad although it is the ★ free game),
  no teaching content, and Stone Squadron covers stones far better. Retire the five Blaster-only Shop
  upgrades with it (game_life, laser_power, time_ext, crit, magnet) and refund spent coins from `s.ups`.

**Next steps:** Andrew picks the tosses; then build the shared card-game shell first, port Snap → Buzzer →
Staging → report cards into it, and do Drug Match as its own page. Make the free default game a touch
game that works on every device.
**Open questions:** keep Blaster's upgrades as Stone Squadron perks instead of retiring them? Is a
"read the report" mode worth keeping at all, or just drop Visual Dx?
## 2026-11-09 (later) — 🛩️ Stone Squadron: more realistic dusting (plume, near-contact, popcorning, bubbles) + mission music

Andrew: likes the dusting, make it even more realistic (picked all four: dust plume, near-contact dusting, popcorn technique,
vapour bubbles + sparkle). Then: the lounge music is the pre-flight music; the missions need action music, something like
Star Fox or the FF7 battle theme.
**Done** (`games/stone-squadron.html`, BUILD 2026-11-09 12:00):
- **Dust plume** (`PLUME`, `addDust`/`dustSrc`, `plumeTick`, `plumeDraw`):
  - Dusting puts puffs of stone dust into the water at the contact point, tinted toward the stone's colour.
  - They billow back off the stone, spread, sink to the dependent side and slowly settle out on the wall. The outflow carries
    them back past the scope: slowly in a bare ureter, faster up a sheath, fastest on suction.
  - `G.dust` is now how much of the plume hangs in front of the lens, so it blinds you locally. The global fog is lighter.
  - Frag pulses kick up bursts; tumour lasing makes vapour/char.
- **Near-contact dusting** (`reachDust`/`reachFrag`, `ADV_STOP` 1.05 → 0.85):
  - Full effect only with the fiber nearly on the stone; it falls to ~6% from the rails' parking distance (was 35%).
  - Frag pulses reach a bit further. The HUD says "fiber off the stone / too far to dust: hold ▶ ADVANCE".
  - A stone washed up by high flow now has to be followed in.
- **Popcorning** (`stirFrags`): in the kidney, fiber held still, ≥15 Hz. Fragments within ~2 units of the tip get churned
  round it and slowly ablated without aiming (a calyx ~3× better than the open pelvis). Moving the fiber or low-frequency
  FRAG doesn't popcorn. Firing near the wall still burns. Attending line; count in the run report.
- **Cavitation**: fragments near where the beam lands jitter.
- **Vapour bubbles and sparkle**: ring-shaped bubbles fizz off the fiber tip at the pulse rate (`bubPS`, carried off and
  rising), a bigger Moses bubble each frag pulse, and sparks strobe on the stone where the pulses land. The beam visuals now
  follow what the sim actually fired (no beam with the fiber out for a wire).
- **Mission music** (`missionTick`, `musicTrack`): an original 150 BPM D-minor loop, battle-theme energy without quoting
  any tune. Galloping octave bass, syncopated brass stabs, a pad, a 16-bar lead (A: the call, B: it climbs, with an
  arpeggio), and drums with a tom fill every 8 bars. It crossfades in at scrub-in; the lounge loop plays for the brief, prep and debrief.
  The MUSIC toggle and mute cover both.

**Verified (headless Chromium, local three.js; numbers vs the previous build):**
- Up close, a 9 mm COM stone dusts in 32.4 s (was 32.7). At 35% flow it still fogs out: dust 100, visibility 0.30, lock lost.
- At 70% flow dust holds at ~35 (was 53). The view stays clearer, but the flow pushes the pressure over 40.
- From the rails' parking spot, dust barely forms and the stone isn't dusted in 40 s (it used to be).
- A bot that follows the stone in finishes whole cases in about the same time as before (66/65, 93/83, 51/49 s).
- Popcorning, 6 uric acid fragments: calyx 4 s, open pelvis ~10 s. Nothing while moving, or on the 12 Hz FRAG pedal.
- Music: both loops schedule and crossfade (lounge silent during the mission and the reverse). Mission RMS ≈ 1.25× lounge,
  drum peaks ~0.2.
- All cases, wire wrinkles and the tumour case play through; no page errors. Screenshots of the plume at 35% / 70% flow in
  both camera views.

**Not verified:** how the music sounds (no speakers here); plume fill-rate on the iPad (≤200 soft sprites); feel of the
steeper reach with a thumb.
**Next steps:** Andrew plays: is the plume too white near the light? Is near-contact too strict (`reachDust` 0.9 → 3.0)?
Mission music: tempo/volume (`MUSM_VOL`, `S16`), more variations (an intro sting, a calmer cleanup section, a victory
fanfare at stone-free).
**Open questions:** settled dust being stirred back up by the scope; dust colour per stone (tinted now: maybe stronger).

## 2026-11-09 — 🛩️ Stone Squadron: wire work as a random wrinkle, experience counter, safety-wire order (built 2026-10-31, merged today)

Andrew: advanced levels with a wire to get past tight or redundant areas — the scope stops like at a stone, you advance or
withdraw, "deploy" the wire like the basket aiming for the centre of the lumen so you don't raise a flap, then ride the wire
past. Not on a case type's first run; it should show up randomly on existing cases as you get more experienced (a counter of
how many times you've done each case, "like a junior building their skills/confidence"), and difficulty rises with skill.
Not every advanced run should have it. Maybe choose a safety wire at the start (a prep decision juniors should think about).
**Done** (`games/stone-squadron.html`; BUILD 2026-10-31 18:00):
- **Experience per case type** (`XP`, localStorage `sq3d_xp`): finished runs, a skill number (+0.5 bronze, +1 silver,
  +1.5 gold/S; −1 after a perforation or a false passage), wrinkles wired. Shown on the brief ("You've finished 3 of these").
- **Wrinkles, rolled per patient** (`rollWrinkles`): never on a type's first run; then 20% after one finished run, +6% per
  run, capped at 50%. Severity follows skill; rarely two in one case. The first one on a case is always in the chart (CT read
  in Case 1, the retrograde in the op note in Cases 2–3); later ones can be a surprise. "Same stones" keeps the same ureter.
- **Kink** (redundant ureter: the lumen jogs sideways, a fold across your path) and **tight segment** (a short narrowing to
  a pinhole, a little off-centre). Ureter only, above the sheath tip, clear of stones and pinch rings. The tube mesh is
  built per patient when there's a wrinkle and reshaped as it straightens.
- **Wire**: the rails stop before it; ADVANCE stops at its mouth (holding it there = pushing against resistance, damage +
  attending). The basket button becomes WIRE (E/G). It runs up the fiber's channel, so you aim with the green spot; a ring
  marks the open line (green/amber/red on the easier ones). Centred → through, coils in the kidney on fluoro → the scope
  rides it past (the kink straightens). A bit off → buckles, retry. Into the wall → a **flap** (−100, PULS 2, bleeding,
  that side narrows); the third is a false passage and ends the case. Distance matters: from far the wire wanders. No laser
  while the wire is in the channel. Clean first pass +150.
- **Safety wire**: a second pre-op order next to the antibiotic (scrub-in needs both). Costs 3 OR min, shows along the
  wall and on fluoro (the fluoro used to always draw one). Graded against the chart: wrinkle in the chart + no safety wire
  = wrong (fails the prep objective, attending quote); otherwise defensible either way, with a teaching note. It changes how
  a perforation or false passage ends (stent over the safety wire vs nephrostomy).
- Attending coaches less once you've finished 3 of a type; terse at wrinkles after you've wired 2.
- Debrief: WIRE WORK card, safety-wire card, run report line. `STONE_SQUADRON.md` updated.

**Verified (headless Chromium, local three.js):**
- Roll odds over 300–500 seeds per setting: 0% before a type's first finish, 20% after one, ~30% after three, ~50% from six.
  Never on starter stones or the tumor case. No stone ever inside a wrinkle or the 14 units before it. A seed's stones are
  unchanged when it has no wrinkle (the roll uses its own random stream).
- Counter: a finish adds a run and skill, a perforation takes skill down a step, quitting changes nothing. "Same stones"
  replays the same ureter.
- Bot play-throughs, scope centred on the ring:
  - Kink and tight segment wire through first time and ride past, including two wrinkles at full severity in Case 1 and a
    kink just below the UPJ in Case 3.
  - Aimed into the fold: three flaps end the run as a false passage. The debrief reads differently with and without a
    safety wire, and the prep objective fails without one.
- Plain Cases 1–3 and the tumor case behave as on the previous build. Prep orders gate scrub-in; no sideways overflow at
  844×390.
- Screenshots in chase cam and scope view: approach, wire out, through, ride, past, flap, tight segment. No page errors.
**Not verified:** on the iPad (thumb aiming at the opening; is the ring too generous or too tight?), and how it feels.
**Next steps:** Andrew plays a few runs of a case to see wrinkles appear (or force one: `?case=1&seed=5&wire=kink&sev=0.5`,
`wire=tight|both`, `sev` 0–1). Tune `wireChance`, `sevOf`, the −0.06/unit distance penalty and the buckle/flap thresholds.
**Open questions:** should the ring's colour hint go away sooner? Wire choice (hydrophilic vs stiff) as a loadout item next?

## 2026-11-09 — 🏥 Uro Rush: more time in the room

Andrew after playing the computer mechanic: patients run out a bit fast in the bay (try +20%);
signing speed is good; seen patients should stay frozen.
**Done:** `PATIENCE` 22 / 18.7 / 17 s → **26.4 / 22.4 / 20.4 s** (+20% every tier). Pended (seen)
patients stay frozen, `SIGN_TIME` stays 0.5 s, the hall clock stays at 60%.
**Verified:** `tools/uro-rush.drive.mjs` 38/38.

## 2026-11-02 (later 10) — 🎯 In-Service Exam Sprint plan (Plans tab)

Andrew asked for an in-service study plan in the Plans section, modelled on his "ISE Sprint Board" artifact:
time per day, days to the exam, high-yield first, daily question and miss-review recommendations, and a
catch-up / reshuffle when behind so the highest-yield material still lands before the exam.

**Done:**
- **Plans card** "🎯 In-Service Exam Sprint" opens its own view (`tView "ise"`); it never changes the active plan
  or Core progress (`s.done/srs/conf/streak` untouched).
- **Setup:** exam date (defaults to the third Saturday of November), weekday and weekend minutes, days off, minutes
  per question, question-bank name, already-covered blocks (two-way), "weak in" chips, and a live preview
  (study days, Qs per day, full/light/cut blocks, mock and review dates).
- **Scheduler** (pure ES5, `// ISE-LOGIC-BEGIN…END` in its own `<script id="ise-logic">` so the Boox doesn't
  Babel-compile it): 23 topic blocks in 14 groups, weighted by yield. Weights come from the ABU Qualifying Exam
  outline because the AUA publishes no ISE blueprint; only Peds, Stones, Andrology, Neurogenic and Trauma are
  published figures, the rest are estimates (footnoted in the view). Minutes become block capacity; when time is
  short, low-yield blocks go light (Know-cold + Qs) or are cut (Know-cold on the final day) first. Taper: mocks,
  weak-spot days, Know-cold / miss-log / final review, rest day, exam.
- **Every day** has a daily loop sized to the day's minutes: miss review first, Core skim, a tutor step, N
  questions at your pace, log. Today card has one-tap ▶ Start into the tutor (Deep Dive / Lecture / Drill;
  `startPlanTopic` saves a live conversation first), READ lines, Know-cold lists (ported from the artifact).
- **Log:** questions, % correct, floor day, covered ticks; first met target earns the usual SASP tokens.
- **Catch-up:** catch-up days absorb small slips; when behind, a banner and a red Hub task offer "Reshuffle from
  today" with a preview sheet (back in / light / cut / moved / taper changes) and up to 3 "add time" what-ifs.
  "Can't study this day" re-plans around a date. Reshuffles keep logged history and the built taper, resume a
  half-done split block at part 2, and never pin a block ahead of behind ones.
- **Miss log:** rules with the why, Sprint Board bullet paste, recent / all / group filters, copy, "Drill these".
- **Progress:** pace, Qs done vs due, streak, % by group (lowest first), mocks, last 14 days.
- **Backup:** `URO:ISE:` share code / Load File (`kind: "uroISE"`), merging logs and misses; "Start a new sprint"
  after the exam keeps misses and settings, and old backups can't bring last year's coverage back.
- Sprint day starts at 4 am; Hub and Plans card roll over on wake. Share-code copy has an execCommand fallback.
- **Tests:** `tools/ise-plan.test.mjs` (45 Node cases incl. a 7.6k-config property sweep; run in several TZs),
  `tools/ise-plan.drive.mjs` (headless E2E; `CDN_DIR=<node_modules>` serves React/Babel/KaTeX locally).
- Built with a design → implement → 5-lens review (2 skeptics per finding) → fix loop; 34 confirmed findings fixed.

**Next steps:** Andrew to try it on the live site (and the Boox): build a plan, log a day, reshuffle, ▶ Start.
**Open questions:** are the yield weights right for the ISE (Voiding 12, Peds 10, Stones 10, Prostate 9, …)?
Should the existing tutor Ready-panel buttons move onto `startPlanTopic` (they send their opener via a 300 ms
timeout)? Real cross-device sync is not built (share code only).

## 2026-11-02 (later 9) — 💲 Gemini 3.8 Flash price

Andrew uses Gemini 3.8 Flash (`gemini-3.8-flash`), which had no built-in price.

**Done:** added it at $0.75/$3.75 per million tokens, the introductory rate through 2026-12-31; `builtinPrice` switches to $1.50/$7.50 from 2027-01-01 (UTC).
The figures come from several third-party pricing sites that agree (OpenRouter lists the intro rate too), not from Google's page. Verify at ai.google.dev/pricing.

**Verified:** Node check of `builtinPrice` for the plain, `models/`-prefixed and `-preview` ids, and with the clock set to 2027-01-01. No browser run (sandbox blocks the CDN).

**Next steps:** Andrew to confirm a 3.8 Flash tutoring session shows a cost. If Google changes the date or the post-intro price, update the two numbers in `builtinPrice`.

## 2026-11-02 (later 8) — 💲 Gemini 3 prices in the cost meter

Andrew: Gemini pricing wasn't showing in tutoring sessions.
**Cause:** `MODEL_PRICES` only knew Gemini 2.0/2.5, so any Gemini 3 model had no price and the meter showed "unknown".
Gemini's models endpoint carries no pricing, and `ai.google.dev` is blocked in the cloud sandbox, so prices couldn't be read from Google directly.

**Done:**
- Added `gemini-3-flash` ($0.50/$3), `gemini-3.1-flash-lite` ($0.25/$1.50), `gemini-3-pro` and `gemini-3.1-pro` ($2/$12).
- Added Gemini Pro long-prompt tiers (>200k tokens) in `builtinPrice`.
- Prices come from third-party roundups that agree with each other, not from Google. Verify at ai.google.dev/pricing.

**Verified:** `builtinPrice` returns the right rate for preview ids and for ids with a `models/` prefix (Node). The built page could not render in the sandbox (cdnjs blocked), so there was no browser run.

**Also (same day, after merge request):** Gemini models with no built-in price now borrow OpenRouter's price for the same `google/…` model (`orGooglePrice`, `ensureOrCatalog`).
- The public list is fetched once and cached for a day, only when a Gemini model has no built-in entry.
- Ids match exactly, else ignoring `-preview` / `-exp` / date suffixes; `:free` and `:thinking` variants are skipped.
- The 💲 panel labels it "OpenRouter's price for this Google model (rough estimate)".
- Tested in Node against a hand-made catalog only: openrouter.ai is blocked in the cloud sandbox, so the live fetch is untested.

**Next steps:** Andrew to confirm a Gemini 3 tutoring session now shows a cost. Gemini 3.5/3.6 Flash and `*-latest` aliases are still unpriced (sources conflicted); set a price in the 💲 panel or tell me the exact model id and the price from Google's page.
**Open questions:** does Gemini's OpenAI-compatible endpoint accept `stream_options.include_usage`? It isn't sent for Gemini, so streamed replies use the ~4 chars/token estimate.

## 2026-11-02 (later 7) — 🤖 Claude model list: current models, safe with thinking + refusals

Andrew: fix the Claude model list.
**Was:**
- `claude-sonnet-4-20250514` was labelled "Sonnet 4.6 (latest)", but it's Sonnet 4.
- `claude-sonnet-4-5-20250514` isn't a real id.
- Opus 4.6 and Haiku 4.5 were the other choices.

**Done:**
- Settings picker = `CLAUDE_MODELS`, each with its price:
  - Opus 5.5 (default, $4/$20)
  - Sonnet 5.5 ($2/$10)
  - Haiku 5.5 ($0.10/$0.50)
  - Fable 5.1 ($10/$50)

  Ids come from the claude-api skill's model table. A saved id not in the list still shows as an
  option.
- Saved settings migrate (`CLAUDE_LEGACY`), each to the same tier:
  - Sonnet 4 and the bogus Sonnet "4.5" id → Sonnet 5.5
  - Opus 4.6 → Opus 5.5
  - Haiku 4.5 → Haiku 5.5
- The new models think first, so the code changed to match:
  - `claudeText()` joins the text blocks. Reading `content[0].text` would have hit the thinking
    block: "Empty response" in non-streamed calls, and blank output in the two "organize with
    AI" helpers.
  - `claudeMaxTokens()` raises the output limit to 16k on 4.x+ models, since thinking counts
    against it.
  - The Settings connection test gets a 256-token limit.
  - No `temperature` is sent to Claude, which these models reject.
- Safety-filter declines:
  - `fallbacks: "default"` + `anthropic-beta: server-side-fallback-2026-07-01` on Opus 5.x,
    Sonnet 5.5 and Fable 5.x (`claudeFallbackOk`), so Anthropic retries a declined request on
    another model. Not on Haiku 5.5, which has no fallback.
  - `stop_reason: "refusal"` (streamed or not) shows "⚠ Claude's safety filter declined this one…",
    drops the partial text, and still counts its cost.

**Verified:** new suite 13/13 in headless Chrome, with stubbed Anthropic responses:
- default Opus 5.5 with fallbacks + beta header, 16k limit, no temperature;
- a thinking block ignored when streamed and when not;
- a mid-stream decline;
- Opus 5.5 pricing on the meter;
- the legacy id migrating to Sonnet 5.5, and the picker showing the 4 models;
- Haiku 5.5 sent without fallbacks.

Streaming 27/27 at both sizes, cost 18/18 (its saved Sonnet 4 now prices as Sonnet 5.5), hooks
13/13, mnemonic rule, Quick Ask keyboard: all pass.

**Next steps:** Andrew to confirm a real Claude key works with the new models from the browser
(including the beta header over CORS).
**Open questions:** effort is left at each model's default (medium on Opus 5.5 / Haiku 5.5, high
on Sonnet 5.5). Lower it for chattier, cheaper replies?

## 2026-11-02 (later 6) — 💲 Live AI cost meter in the tutor

Andrew: show what a session costs on paid models, running and updated as it goes.
**Done:**
- A **cost** chip in the tutor toolbar shows this session (tutor + Quick Ask).
  - It climbs while a reply is written: the input estimate plus the text so far at ~4
    characters per token, marked ≈.
  - It snaps to the real number when the reply lands.
  - New session (Clear, a new topic, a skills module) → $0. Resumed and saved sessions keep their
    meter.
- Tap the chip for:
  - the session total, replies and tokens;
  - **today** and **all time**: every AI call through `callAI`, Anki included, stored on this
    device in `uroStudyHub_aiSpend`;
  - the model and the price used, with its source;
  - a "your price, $ per million" override per model (`uroStudyHub_prices`).
- `callAI` reads each provider's usage:
  - Anthropic: `message_start` + `message_delta`, or `usage` when not streaming.
  - OpenAI: `stream_options.include_usage`.
  - OpenRouter: `usage.include` gives the **exact $ cost**.
  - Gemini / LM Studio: whatever usage they send, else an estimate.
  - A reply cut off or aborted mid-stream still counts.
- Prices, as `MODEL_PRICES`, longest prefix wins:
  - Claude: list prices from the API skill (Oct 2026); legacy Opus 4/4.1 and Sonnet 4 from
    memory; Haiku 5.5 has its >100K-prompt tier.
  - OpenAI and Gemini: last known list prices, marked as such; override in the panel.
  - OpenRouter: its live model list; LM Studio: free unless you set a price.
- `sessEpoch`: a reply that lands after Clear counts toward today / all time but not toward the new
  session.

**Verified:** cost suite 18/18 in headless Chrome:
- live climb with the fake streaming server and a custom price;
- the session resets on Clear while today keeps the cut-off reply;
- exact costs: OpenAI stream usage $0.0075, Claude message_start/delta $0.012, Quick Ask adds to
  the session ($0.024), OpenRouter `usage.cost` $0.0042;
- custom price and back to default.

All earlier suites still pass (streaming 27/27 at iPad and phone sizes, hooks 13/13, mnemonic
rule, Quick Ask keyboard).

**Not counted:** the Pocket Guide / Links "organize with AI" buttons, which call `fetch` directly.
**Next steps:** compare against the real provider dashboards after a session.
**Open questions:** the Settings Claude picker labels `claude-sonnet-4-20250514` "Sonnet 4.6
(latest)" (it's Sonnet 4), and `claude-sonnet-4-5-20250514` isn't a real model id. Refresh that
list?

## 2026-11-02 (later 5) — 🧠 My hooks: your own mnemonics, saved and on Anki cards

Andrew liked the idea of saving the hooks he builds with the tutor, for later sessions and Anki.
**Done:**
- When a hook is settled (built together, or his own), the tutor ends its reply with
  `[[HOOK | topic | facts | hook]]`; the rule for this is in `MNEMONIC_RULE`.
- The app (`parseHooks` / `saveHooks`):
  - saves it to `s.myHooks`, deduped on topic + wording;
  - adds a hook → facts Anki card tagged `My_Hook`;
  - shows a hook card under the reply: ✓ Saved + Anki card (✕ removes both) / 💾 Save.
- `renderMathText` hides the tag everywhere, including a half-written one mid-stream.
- Saved hooks (newest 40) go back into later prompts:
  - tutor and Quick Ask: reuse them in his words;
  - the Anki generators: add "🧠 Your hook: …" to cards that test those facts.
- List under 🧠 My hooks in the tutor's ✏️ panel, with ✕ to remove.
- Bug fix: Anki "Generate Cards from Document" had `onClick={genAnkiBatch}`, which passed the
  click event in as the document text. It threw "docText.trim is not a function" and was broken
  on the live site.

**Verified:** 13/13 in headless Chrome, with stubbed replies carrying a tag:
- tag hidden, card shown, hook saved, Anki card made;
- tagging the same hook again doesn't duplicate it;
- the next tutor and Quick Ask requests carry the hook;
- remove / re-save; the ✏️ list;
- the document generator works again and carries the hooks.

Unit checks of `parseHooks` / `stripHooks` (partial tags, pipes, quotes).

**Next steps:** see whether the real models tag hooks reliably. If not, add a manual "save as hook"
action.
**Open questions:** `genAnki()` (topic → cards) has no button anywhere. Dead code, or a lost
feature?

## 2026-11-02 (later 4) — 🧠 Tutor mnemonics: established ones, or built with you

Andrew: AI-made mnemonics are often lame. For Birt-Hogg-Dubé it gave "B – Bullae, H – Hair
follicle tumors, D – Distal nephron tumors" and "a 17-year-old with a pneumothorax at a
skin-care clinic". He wants:
- established mnemonics only;
- or one built together, since his own ("hogs get bumps; HOCTs sound like hogs") sticks better
  for him;
- or skip it.

**Done:**
- New `MNEMONIC_RULE`, next to `MATH_FORMAT_RULE`, added to every tutor system prompt (deep dive,
  lecture, mastery, OR skills) and to Quick Ask's. It says:
  - offer only established mnemonics, and say they're standard; if unsure, treat it as not
    established;
  - never invent acronyms, puns or staged scenes (the BHD output is quoted as the anti-example);
  - otherwise build one WITH the learner: name the facts, offer at most one seed, ask, wait, then
    tighten *their* version;
  - when the learner offers their own hook, use it in their words from then on, recaps and cheat
    sheets included;
  - skipping is fine; teach the mechanism or a look-alike comparison instead.
- Lecture Phase 7 "Memory Anchors": was "build 3-5 mnemonics… funny, crude, rhyming". Now:
  established ones where they exist, co-build one hook at a time (2-3 rounds max), or teach by
  understanding. The phase description shown in the app matches.
- "Engaging" style: dropped "crude mnemonics". Deep Dive's memorization line now points at the
  rule.

**Verified:** in the built page, the rule is in the request for both the tutor and Quick Ask (stubbed
replies), and none of the old wording is left. Prompt-only change; no page errors. How the real
models follow it can't be tested here.

**Next steps:** Andrew to see how the next Memory Anchors phase or "give me a mnemonic" goes.
**Open questions:** should the hooks Andrew builds be saved per topic and fed back into later
sessions (and Anki cards)? Not built yet.

## 2026-11-02 (later 3) — 📐 Tutor: the tab bar can't cover the typing box

Andrew (iPad): scrolled to the bottom, the bottom tab bar seems to grow and covers more of the
tutor's typing box.
**Cause:**
- The tutor was `calc(100vh - 60px)` tall under an ~80 px header, with the tab bar
  `position: fixed` over it. The typing box was kept clear only by a hard-coded 68 px bottom pad.
- So the page (`#root`, the app's scroller) was taller than the window, and the box and the bar
  were positioned independently.
- Even in desktop Chrome the box sat 9 px under the bar (20 px on a phone). On iPad, iOS changes
  the visible height as you scroll, so the overlap shifted, worst at the bottom.

**Done:**
- On the tutor tab the app is one column that exactly fills the window: header, tutor
  (`flex: 1`), then the tab bar **in the column** (`position: relative`), not floating.
  - The typing box always sits directly above the bar.
  - The tutor page has nothing to scroll at page level.
  - The bar keeps its full width.
  - Other tabs are unchanged (floating bar, `minHeight: 100vh`, 820 px column).
- Dropped the 68 px pad.
- Chat boxes get `overscroll-behavior: contain`, so scrolling past the end stays in the chat.
- Quick Ask:
  - The pill and the panel sit at `bottom: 72` (was 132).
  - Big mode: `calc(100% - 176px)`.
  - Default height `min(56%, 460px)`, which keeps about its old size in the now correctly sized
    tutor area.
- Reply pin offset 8 → 6 px, so the edge of your question no longer peeks above the answer.

**Verified:** headless Chrome at 820×1080, 1180×740, 1024×1290 and 390×760:
- Tutor: `#root` has 0 px to scroll, and the typing box is 10 px above the tab bar (was 9–20 px
  under it).
- The bar is full width; the Hub still has the floating bar.
- Streaming suite 27/27 at iPad and phone sizes.
- Quick Ask keyboard checks pass (the emulation now holds the column's height).

**Next steps:** Andrew to check on the iPad, at the bottom of a long chat, with and without the
keyboard.
**Open questions:** whether the iPad runs the app from the home screen or in Safari — worth knowing
if anything iOS-specific is left.

## 2026-11-02 (later 2) — 💬 Quick Ask streams too

Andrew: make Quick Ask stream like the tutor.
**Done:**
- Quick Ask replies now appear as they're written, with the same rules as the main tutor:
  - ▍ cursor; "Thinking..." until the first words arrive.
  - The reply's first line is followed up to the top of the box, then stays there; scrolling up
    stops the follow.
  - A dropped stream keeps the partial text + "⚠ Reply cut off".
  - Reopening the panel lands on the start of the last reply.
- 🗑, a new session, or loading a session drops and aborts the side reply in flight.
- The ✏️ panel's "⚡ Show replies as they're written" switch covers both chats.
- The tutor and Quick Ask now share the same code, defined next to `scrollPaneTo()`:
  - `pinReplyTop()`: the scroll rule
  - `streamBatcher()`: 120 ms repaint throttle
  - `nextReply()` / `dropReply()`: request id + `AbortController`

**Verified:** the streaming suite, now **27/27** at iPad and phone sizes, against the built page
and a fake streaming server.
- New Quick Ask checks, run on 2 questions in a row:
  - text arrives in steps with the cursor
  - the first line is pinned once the box is past following
  - it finishes with the first line at the top
- 🗑 mid-reply; reopening lands on the start of the last reply.
- The tutor checks from the last entry still pass, and so does the iPad-keyboard Quick Ask check
  (a provider that ignores streaming).

**Next steps:** Andrew to try both chats on the iPad with a real provider.
**Open questions:** none.

## 2026-11-02 (later) — 🧠 Tutor: live replies that stay at the top; Quick Ask ✕ you can hit

Andrew:
- Long tutor replies left him at the bottom, so he scrolled back up every time (all devices).
- Wants the text to show as it's written.
- The Quick Ask window sometimes couldn't be closed and covered the tutor.

**Done:**
- **Scrolling:** after you send, the chat shows your message + "Thinking...". When the reply
  comes, its **first line goes to the top** and stays there. Nothing scrolls you to the bottom
  of a long block any more.
  - While it streams, the chat follows the text only until the reply's top reaches the top.
  - If you scroll up mid-reply, it stops following. Reading ahead is never undone.
  - Loading a saved or resumed session lands on the start of the last reply.
- **Live replies:** `callAI(..., { onDelta, signal })` streams over SSE for all five providers.
  - `readSSE()` reads the stream.
  - Anthropic: `content_block_delta` events.
  - OpenAI / OpenRouter / Gemini / LM Studio: `choices[0].delta.content`.
  - A server that answers with plain JSON instead still works.
  - Screen updates at most every 120 ms, with a ▍ cursor while writing.
  - If the stream drops, the partial text stays with "⚠ Reply cut off — tap 🔄".
  - Only the main tutor streams; Quick Ask answers are short, so they still arrive in one piece.
- **Switch:** "⚡ Show replies as they're written" in the tutor's ✏️ panel, default on, saved as
  `s.tutorStream`. Turn it off if live text flickers on the Boox.
- **One reply at a time:** a newer send, Clear, or loading a session drops and aborts the reply in
  flight (`chatReq` id + `AbortController`), so a stale reply can't refill a cleared chat.
- **Quick Ask:** the ✕ / ⤢ / 🗑 header buttons are now 34 px tap targets (✕ boxed), and Esc closes
  the panel.
  - Why it wouldn't close before: the old scroll bug (fixed this morning) pushed the panel header
    off-screen, so ✕ wasn't reachable.

**Verified:** 19/19 in headless Chrome at iPad (1180×760) and phone (390×760) sizes, against the
built page and a fake streaming LM Studio on :1234. Checked:
- text arrives in steps
- cursor shown, "Thinking..." hidden while streaming
- reply top pinned at 8 px while text grows, and on finish, for 2 replies
- page never scrolls
- scrolling up mid-reply isn't undone
- Clear mid-reply stays empty
- a cut-off stream keeps the partial text
- the JSON fallback
- streaming off (and it's remembered)
- a stubbed Claude SSE stream
- Quick Ask ✕ size, ✕ and Esc closing it

The earlier Quick Ask iPad-keyboard check still passes. No console errors beyond the known Babel note.

**Next steps:** Andrew to test on the iPad with a real provider. Check on the Boox whether live text
flickers; if it does, the ⚡ switch turns it off.
**Open questions:** should Quick Ask stream too? Its answers are short, so it's left as is for now.

## 2026-11-02 — 💬 Tutor Quick Ask: readable on iPad

Andrew: on iPad, from the 2nd Quick Ask question on, the side chat showed about one line of the
answer and the typing row took up the rest; lots of scrolling.
**Cause:** after every message, the side chat (and the main chat) scrolled with `scrollIntoView`
on a marker at the end of the chat. That also scrolls every scrollable ancestor. With the iPad
keyboard up the page can pan, so the page moved too: the panel's top and the start of the answer
went off-screen, and the box sat at the *end* of the answer.
**Done:**
- `scrollPaneTo()` moves only the chat box itself, never the page. Both chats use it.
- Quick Ask: when a reply lands, or the panel opens, the reply's **first line** goes to the top of
  the box. While waiting, the box shows your question + "Thinking...".
- Panel is a bit bigger: 400 px wide (was 340), `min(50%, 440px)` tall (was `min(46%, 380px)`).
  Text is 11.5 px (was 11).
- Its height is capped to the visible area (`visualViewport`) minus 24 px, so with the keyboard
  up the whole panel fits above it.
- New ⤢ / ⤡ button in the panel header: big mode, up to 720 px wide, from below the Style row
  down to the tutor input, 12.5 px text. Remembered per device (`uroStudyHub_sideBig`).

**Verified:** headless Chrome (Playwright), built page, fake AI replies. The iPad keyboard is
emulated: the layout keeps its full height, but the window is cut to what's left above the
keyboard. Cases: iPad landscape (keyboard / no keyboard / big mode), iPad portrait + keyboard,
phone with and without keyboard.
- **Before:** panel top 54 px off-screen; the start of answer 2 133 px above the top of the box.
- **After:** the page doesn't move between Enter and the reply; the panel stays fully on screen;
  answer 2 starts 8 px from the top of the box.
- No console errors beyond the known Babel 500 KB note.

**Next steps:** Andrew to retry on the iPad: 2nd and 3rd questions with the keyboard up, then
the ⤢ big mode.
**Open questions:** none.

## 2026-10-31 (later 2) — 🏥 Uro Rush: orders go in at the computer

Andrew: a central computer you sit at to put orders in before people leave rooms. You can batch
some, but if every room is full you have to sign before new patients get a room.
**Done:**
- In the room you only **pend** the order (📝, changeable by walking back in). A pended
  patient's clock stops.
- Stand at the 🖥 spot in front of the nurses' station (clinic) / workstation (hospital).
  - Pended orders sign oldest first, `SIGN_TIME` 0.5 s each; walking away pauses.
  - Results come back as each one signs: ✓/✗, hearts, streak, score. Then the patient leaves.
  - The chart panel there lists what's signing and the last 4 results.
- Rooms stay full until signed. Arrivals with no free room wait in the hall:
  - clinic: the two benches
  - hospital: gurney, wheelchair, then standing
  - Their clock runs at 60% (`QUEUE_RATE`); if it runs out they leave: −1 ♥, logged as
    "left without being seen".
  - A consult in the hall takes its own kind of room first.
- So the hall can actually back up, blocks now have **more patients than rooms**:
  - 4 blocks of 6–7 (`BLOCK_N`), was 5 of 4–5.
  - Tiers `[1, 2, 3, 3]`.
  - 2+2 or 3+1 settings, still ≥2 random switches.
  - ~26 patients a shift.
- On screen:
  - Blue rings + 📝 on room badges.
  - A "📝 n to sign" bubble + pulsing ring at the computer.
  - HUD shows 📝 n / 🪑 n (🛏️ n in the hospital).
  - The hall census lists who's waiting, with timers.
  - Title text explains the computer.
- Coin rate .13 → .105 (XP .065 → .053) so a clean, longer shift still pays ≈ 120 💰 / 60 XP.

**Verified:** `tools/uro-rush.drive.mjs` **38/38**, with 10 new checks:
- the clock stops when pended
- nothing scores until signed
- changing a pended order
- walking away pauses signing
- signing resolves a patient
- a full house sends the next arrival to the hall
- the hall clock runs at 60%
- signing seats the waiting patient
- a wrong order costs a heart once signed
- someone leaving the hall costs a heart

Also: 8 seeded full shifts (bot batches 3 per trip), phones, embed. Parses as ES2020.

**Next steps:** play-test the batching tension: `SIGN_TIME`, `QUEUE_RATE`, `BLOCK_N`.
**Open questions:** should a pended patient's clock keep running slowly (more pressure to sign) or
stay frozen as now?

## 2026-10-31 (later) — 🏥 Uro Rush: patients wait longer

Andrew after playing: joystick feels good; patients need ~10% longer, especially early on.
**Done:** `PATIENCE` 19 / 17 / 15.5 s → **22 / 18.7 / 17 s** (tier 1 +15%, tiers 2–3 +10%).
**Verified:** `tools/uro-rush.drive.mjs` 28/28.

## 2026-10-31 — 🛩️ Stone Squadron: two bug fixes, laser-on-stone, random patients, tumor wildcard, suction shop

Andrew (Case 2): a peristaltic wave showed a gap in the sheath with ureter behind it; the last stone
(cystine) could barely be fragmented without pushing it into the kidney. Plus: preset FRAG a bit
stronger, the planned laser-on-stone mechanics, random cases/stones, a rare thulium tumor-ablation
case, and suction sheath / scope in a shop for renal cases.
**Done** (`games/stone-squadron.html`, `games/squadron-ct.js`; BUILD 2026-10-31 16:00):
- **Sheath gap fixed:** the wave squeezed the ureter mesh through the sheath bore (the shader didn't
  know about the sheath). Waves now fade out over the 4 units above the sheath tip (shader,
  `squeeze()`, injury marks), end once they reach the sheath, and don't slow the rails or warn there.
- **Retropulsion:** per-pulse push ∝ 8 mm / size (was (8/size)^1.5) at 40% of the old scale, and the
  ureter settles a stone back between pulses (`RETRO_K`, `SETTLE_V`). FRAG preset 1.5 J × 8 Hz →
  1.2 J × 12 Hz (+21% break-up, ~¾ the retropulsion). Measured, Case 2 starter stones: cystine
  8 mm at s252 moves ~1 unit (migrated every time before); 2.0 J or 75% flow without a sheath
  still push stones 10–20 units.
- **Laser on the stone's surface** (roadmap #10): radial heightfield per stone; the beam erodes
  where the fiber's line meets the surface. Paint = clean; holding one spot digs a crater (ablates
  at down to 30%), and keeping at it breaks a piece off (crack / slab / undercut chip) that you
  then chase. HUD "CRATERING: move the spot", attending lines, debrief + report count breaks.
  Bots: painting 0 breaks; holding still 2–6 breaks and several times slower. FRAG chunks come off
  the face you hit.
- **Fresh patient every run:** count, place, size and composition randomized per case type
  (realistic sites, one stone disease per patient); par scales with burden. Once all three cases
  are done, NEXT PATIENT (end screen + brief + boot) picks a random case.
- **Wildcard: upper-tract tumor ablation** (12% of the random list; in the picker once seen).
  Thulium COAG 10 W / CUT 25 W, biopsy forceps first, fronds then base, IRP ≤ 30. CT urogram
  prep with a filling defect; chart, read, debrief card and pearls (low-risk UTUC criteria,
  second look 6–8 weeks).
- **Shop & loadout** on the brief: department budget (start $500; a run pays half its score +
  medal bonus). FANS suction sheath $2,000, DISS suction scope $3,500; renal cases only. Lower IRP
  (60% flow: 30 → 17 mmHg with both), faster dust clearing, fragment aspiration into the trap
  (counts as specimens), and the pelvis collapses if flow drops under 25%.

**Verified (headless Chromium, three.js served locally):** screenshots of the sheath before/after,
a crater, the tumor (chase + scope), the urogram CT, the shop (iPad and 844×390, no sideways
overflow); bot playthroughs of Cases 1–3 (starter + random seeds) and the tumor case (clean → gold,
sloppy CUT/high flow → sepsis); unlock → NEXT PATIENT flow; no page errors.
**Not verified:** on the iPad; feel of painting with a thumb stick (tune `PIT_OK`, `STRESS_K`,
`SPOT_W` if breaks come too easily or too rarely); shop prices vs. real earning pace.
**Next steps:** Andrew plays: is retropulsion now too tame? Is the tumor case too long/short (par
60 s + 7 s/frond)? Device names are generic (FANS/DISS) on purpose; brand names could go in the
descriptions if wanted.
**Open questions:** the 12% wildcard rate; whether kit should cost per case (single-use devices)
instead of a one-time unlock.

## 2026-10-31 — 🏥 Uro Rush: Clinic Rush + Inpatient Consults merged into one game, with a joystick

Andrew: joystick on iPad/iPhone instead of just WASD, a graphical upgrade, bring Clinic Rush back,
and make it one game that alternates clinic/consults randomly; then "send to ED" in clinic for what
an office can't manage (GH needing CBI, stones needing a stent ASAP).
**Done:**
- New page `games/uro-rush.html` (canvas, vanilla JS, no deps), framed by the arcade like Pre-Op
  (`UroRush()` in `UroStudyHub.html`; postMessage `rush:claim` capped 150 💰 / 80 XP, `rush:exit`).
  The old `UroClinicRush` + `InpatientConsults` React games are deleted (−960 lines). Their 2 tiles
  are now one 🏥 **Uro Rush** tile (150 💰). Anyone who unlocked either old game has it unlocked.
- **Shift:** 5 blocks of 4–5 patients. It's 3 of one setting + 2 of the other, shuffled until it
  switches at least twice. A pager card ("📟 Paged!") or clinic sign ("🏥 Back to clinic") announces
  each switch. New orders unlock at blocks 2 and 4 (tier 1→3). 4 ♥. Wrong order or timeout = −1 ♥.
  HUD shows done blocks + "?" for the rest.
- **Clinic:** 🚑 **Send to ED** replaces "CBI / irrigate". Keyed ED cases: GH + clot retention,
  febrile obstructing stone, sudden scrotal pain + high-riding testis, post-TURP bleed with clots,
  solitary kidney + obstructing stone with rising Cr. AUR is still a Foley in clinic (ED = wrong).
- **Consults:** ED cases go to an ED bay, ICU to the ICU, floor to 4N/6S.
- **Touch:** floating joystick: drag anywhere on the map, the stick appears under the thumb and
  follows past its rim. Door assist slides you into doorways. Orders fire on release, so a second
  finger can order while the first steers. On touch the map pins to the top and the strip under it
  is a thumb zone. Phones get a 4-column order grid with short labels. Desktop: WASD/arrows +
  1–9 0 - =.
- **Graphics:** top-down diorama.
  - Clinic: wood corridor + rug, exam tables with paper, counters/sinks, nurses' station.
  - Hospital: curtained ED bays, glass ICU, beds, live ECG monitors, elevator, wayfinding stripes.
  - Lit rooms; empty ones go dark.
  - Patients with moods and age/sex looks, who walk out happy/angry. The doctor in a white coat
    walks with arm/foot swing.
  - Patience rings on room badges; red pulse when urgent. Sparks/puffs, floating points, shake on
    a miss.
  - A clipboard chart shows the complaint, or the waiting list when you're in the hall.
- **End of shift:** score, best, Clinic x/y · Consults x/y, best streak, and a review list of every
  miss (what you ordered → the right one).
- **Answer-key changes, please check** (the merged game shows full order sets more often):
  - New `alt` = also right, full credit:
    - LUTS (PSA ↔ UA)
    - smoker GH (cysto ↔ CT)
    - PSA 4.2→8.1 (biopsy ↔ repeat PSA)
    - Cr 4.2 flank pain (CT ↔ US)
    - febrile pyelo (labs ↔ CT)
    - 14M scrotal pain (US ↔ OR)
    - torsion (OR ↔ manual detorsion)
    - septic/obstructed stone and post-URS edema (stent ↔ nephrostomy)
  - Rewritten:
    - "OAB, failed behavioral → UDS" is now SCI neurogenic bladder → UDS.
    - "SUI index pt → UDS" is now recurrent SUI after a sling → UDS.
    - "80M retention, Cr rising" is now Foley, was CT.
    - "8M high-riding testis → US" is now a hydrocele → US; torsion is now Send to ED.
    - "3 cm renal mass → biopsy" is now PI-RADS 5 → biopsy.
    - "Grade IV varicocele → SA" is now 1 yr infertility → SA.
    - "58F T 103 obstructing stone → abx" is now pyelo, no hydro → abx (obstruction = decompress).
    - "12M no flow" is keyed OR, with detorsion also right.
- Harness `tools/uro-rush.drive.mjs` (raw CDP like Pre-Op's; `CHROME=` env, finds Linux Chromium too):
  **28/28** pass:
  - content self-test
  - real-touch joystick walk and doorway entry
  - second-finger order while steering
  - hearts / timeout / alt / Send to ED rules
  - 8 seeded full shifts (both settings, ≥2 switches, 6 different plans)
  - embed claim/exit
  - every order on screen at iPhone 390×664, 390×844 and 844×390
  - no page errors

  The game script parses as ES2020 (acorn).
- Built app checked headless (React/Babel served from npm copies; cdnjs is blocked in the cloud
  sandbox):
  - Only the known Babel 500KB note + the refused LM Studio request in the console.
  - A Clinic-Rush-only player sees one unlocked Uro Rush tile.
  - Claim paid +39 💰 / +20 XP for 300 pts and closed the frame.

**Next steps:** play it on the iPad + iPhone (joystick feel, speed `SPEED`/`ACCEL`, timer lengths
`PATIENCE`); tune `LIVES`/block sizes if a shift feels long.
**Open questions:** keep the name "Uro Rush"? Teaching lines ("why") on the review list? A Boox pass
isn't needed for an action game, but the page should at least load there (not tested on device).

## 2026-10-30 (late 5) — 🛩️ Stone Squadron: peristalsis you actually ride through

Andrew: by the time the peristalsis hits, the scope is basically past it.
**Done:**
- Waves start up to 85 ahead (was 62) and roll down at 8/s (was 13).
- The rails ease toward pinch speed as a wave closes in (like a pinch point).
- Measured headless: a wave is within 30 units for ~2.5–3 s (was ~1.4) and the scope crosses the
  squeeze at ~3.3/s (was ~9).

## 2026-10-30 (late 4) — 🛩️ Stone Squadron: first-person view no longer shows two "lasers"

Andrew: in first person the "steering pointer thing" also looked like the laser fiber.
**Cause:** the first-person fiber was a long white rod reaching from the corner to the middle, and
the green aiming line continued from its tip: two stacked line-things, one reading as a pointer.
**Done:** first person now shows only a short fiber stub on its own line near 5 o'clock (glowing
tip) and the green spot where it lands. No aiming line: in saline you only see the spot. The
treatment flash while firing stays; the chase cam is unchanged.
**Verified:** headless screenshots (cruising + at a stone); all 3 cases play through.

## 2026-10-30 (late 3) — 🛩️ Stone Squadron: make the fiber + green spot obviously "the gun"

Andrew: the aiming fiber should be more obvious, and the thing in the middle shouldn't look like
what you fire with.
**Done:**
- The fiber sticks 0.6 out past the scope tip (bright glass, glowing tip; the beam starts there).
- The aiming beam is ~2× thicker and much brighter, with a soft glow sheath (thin in scope view).
- The green spot sits ON the stone's surface where the fiber's line meets it (it was buried
  inside the stone) and is always drawn on top. It's dim in the air; big, bright and pulsing
  when locked.
- The scope body fades to 32% whenever you're working at a stone (was: only when locked).
  Its two front lights are dimmed so they don't read as a muzzle.

**Verified:** headless screenshots in the chase cam and scope view; all 3 cases play through.

## 2026-10-30 (late 2) — 🛩️ Stone Squadron: penalty for not reading the whole chart

Andrew: penalize and have the attending chastise if not all notes are opened; NO reminder at
scrub-in ("people need to learn from losing points").
**Done:**
- Each unopened chart note (history, CT read, prior note, labs) costs −100 (`NOTE_PEN`) at scrub-in.
- The medal "prep" objective now needs the whole chart + every target + the right antibiotic.
- ~2.5 s into the case the attending (urgent) names what was skipped ("You didn't read the
  operative note and labs…"; harsher if 3+ were skipped).
- Debrief pre-op card: "Chart read 2/4 — skipped: … (−200)". Run report has a chart line.
- No warning beforehand (the button and brief stay silent, as Andrew asked).

**Verified:** headless: skipped 2 → −200, attending line, card + objective; read all → no penalty;
all cases play through.

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
