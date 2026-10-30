# Stone Squadron — design notes and roadmap

A 3D ureteroscopy game (three.js) in `games/stone-squadron.html`. The app's Arcade hosts it in a
frame (`?embed=1`, postMessage `squadron:claim` / `squadron:exit`). The tester build in
`prototypes/squadron3d.html` is an older copy and doesn't have cases or mission prep.

## Direction (Andrew, 2026-10-28)

The simulation is the product. Keep it realistic: no stones shooting back, no boss fights. It
needs a game loop around it, the way Star Fox and Rogue Squadron wrap their flying:
**briefing → loadout → mission → graded debrief → unlocks**. The teaching lives in the prep: the
intel you read should change what the right play is.

## Built so far

- **Cases** (`LEVELS`), unlocked in order. Case 1: ureter, no sheath. Case 2: ureteral access
  sheath. Case 3: renal pelvis + upper- and lower-pole calyces.
- **Slower approach** to each stone (`APPROACH_D`, `APPROACH_V`).
- **Mission prep** (`showPrep`):
  - A scrollable, procedurally generated non-contrast CT (`games/squadron-ct.js`) built from the
    run's actual stones, with soft-tissue and bone windows and an ROI tool that reads HU.
  - You tap each stone to confirm it as a target (+75 each). Pelvic phleboliths are decoys, with
    a teaching note when tapped.
  - The case chart (`PREP`): history, a CT read generated from the stones (Case 1 quotes HU;
    later cases make you measure), a prior ED or operative note, and labs with a urine culture
    and sensitivities.
  - Pre-op antibiotic order. The verdict (`ABX_FX`) scales sepsis build-up and its starting
    value, and the debrief explains the call.

- **OR chatter** (`CREW`, `say`, `chatter`): Star Fox-style comms box with cartoon portraits
  and gibberish voice blips. The crew is Dr. Hawke (attending: coaching, reminders), Remy (scrub
  tech: what the room sees) and Dr. Vance (anesthesia: pressure and the patient). Lines react to
  the prep (antibiotic verdict, targets missed), each stone's HU or calyx, pinch points,
  pressure, heat, visibility, the wall, retropulsion at the UPJ and fragments behind the scope.
  The debrief opens with the attending's verdict. Can be turned off in settings (OR CHATTER).
  Andrew likes it as a mental prep exercise for juniors.

## Roadmap (Andrew's list, roughly in order)

1. ~~Debrief with medals~~ — done: six objectives (stone-free, PULS 0, IRP never >40, specimen,
   prep = all CT targets + right antibiotic, under par). Finish = bronze; stone-free + 3 = silver;
   stone-free + 5 = gold; all 6 = S rank. Best medal per case is shown on the case picker. Par
   times (`LV.par`) need tuning from real play.
2. **Music and sound design.** First pass done: an original mellow lounge loop (`MUS`, Balatro-ish mood:
   jazzy chords, walking bass, echoing arpeggio, tape wobble) from mission prep onward, MUSIC On/Off;
   laser SFX −25%; terminal-style typing beeps on the briefing. Still to do: more tracks/variation, mixing.
3. ~~Radio chatter~~ — done (first pass). More lines per case type as cases are added.
4. **Harder CT reading.** More stones across the stack, decoys (phleboliths, vascular
   calcification), and decisions such as whether to also treat kidney stones in a ureteral case.
5. **Semirigid cases.** A semirigid scope in the distal ureter: different handling, no deflection.
6. **Wires.** Pass a guidewire (and safety wire) through tight segments, impacted stones and a
   narrow UVJ before the scope can follow.
7. **Retrograde pyelogram mid-case.** Inject contrast on fluoro and identify filling defects.
8. **Fiber handling.** (Aiming already runs along the fiber at 5 o'clock — `FIB_X/FIB_Y`.)
   - Advance and retract the fiber. Firing with the tip still inside the channel damages the
     scope (a scope-repair cost on the debrief); too far out, and the fiber is floppy and harder to aim.
   - Fiber burn-back in later missions: the tip chips down with lasing (faster on hard stones and
     at high energy). Re-strip/cleave it or swap fibers, or lose power and aim.
9. **Narrow-ureter levels.** Later cases where the ureter itself is about sheath-calibre
   (`SHEATH_R` 1.3 vs 2.6 now): every pinch, wave and fragment gets tighter. Also: let ADVANCE get
   a little closer to the stone.
10. **A real stone surface under the laser.** The stone's shape becomes the result of how you lased
    it (it's currently a shrinking volume).
    - Dusting done right (painting the edges/surface) dusts it away cleanly, with no chunks.
    - Lasing the middle digs a crater.
    - Poor technique carves out pieces that break off and have to be chased: trenching a groove
      through it, or undercutting an edge.
11. **Surprises and other case types.** An unexpected urothelial tumor found during a stone case.
   Planned cases: ureteroscopic biopsy, tumor ablation.

## Constraints

- PUBLIC repo: fictional patients and generated images only — no real imaging or notes.
- It needs three.js from a CDN (jsdelivr), so it doesn't work offline or on the Boox.
- Timing-dependent behaviour (rails, approach) is checked in headless Chrome with `__sq.step`.
