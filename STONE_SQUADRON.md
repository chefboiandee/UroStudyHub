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
  sheath. Case 3: renal pelvis + upper-, interpolar and lower-pole calyces.
  - **Every run is a fresh patient** (`genLayout`, per-case `gen`): 1–3 ureteral stones weighted
    toward the UVJ / iliac crossing / UPJ (Case 1), 1–3 above the sheath (Case 2), 1–4 across the
    pelvis and calyces with the lower pole most common (Case 3). Sizes fit the site; one patient
    has one stone disease (calcium oxalate mono/dihydrate, uric acid or cystine). Par scales with
    the stone burden (`parOf`). "Starter stones" keeps the old fixed set.
  - **Random list** once every stone case is done (`allDone`): NEXT PATIENT (end screen and
    brief) picks any case with fresh stones; boot does too. The picker stays for practice.
  - **Wildcard (`WILD_P` 12% of the random list): upper-tract tumor ablation** with a thulium
    laser. Low-grade papillary fronds on a stalk base in the ureter (`makeTumor`). BIOPSY (cold
    forceps through the working channel) before lasing; COAG (≤14 W) vaporizes and seals; CUT is
    faster but leaves bleeding stumps and burns the wall under the base. Fronds go at a stalk
    stump; then coagulate the base. Objectives swap in complete ablation, biopsy-first and IRP
    never over 30. Prep is a CT urogram with the tumor as a filling defect (`urogram` in
    `squadron-ct.js`). It joins the picker once you've met it.
- **Laser on the stone's surface** (`makeSurf` … `surfSync`): each stone is a radial heightfield
  on its mesh. The beam lands where the fiber's line meets the surface (`beamHit`, Möller–Trumbore
  against the mesh; a near miss chips the rim). Dusting carves a gaussian spot there.
  - `ero[]` records how deep the laser has dug at each point (fractures reset it). `surfEff`'s
    pit = how much deeper the spot is dug than the least-dug direction around it, so it catches
    a crater or a groove, never an evenly painted face.
  - A pit ablates poorly (and the floor recedes from the fiber). Keep lasing in a pit, or dig to
    the core, and stress builds; it gives as a piece breaking off (`surfWeakAt`): a crack through
    the middle, a slab beyond a groove, or an undercut edge chip. Pieces become fragments.
  - FRAG chunks come off the face you're hitting (`surfChunk`). Aiming uses the remaining
    material's centroid (`surfCenter`/`stoneCenter`), since chunks can leave it off-centre.
  - Measured with bots: painting (random strokes or raster) → 0 breaks; holding still → 2–6
    breaks and several times slower.
- **Retropulsion** (`RETRO_K`, `SETTLE_V`): per pulse ∝ type × (8 mm / size) × pulse push, and the
  stone settles back toward where it lodged between pulses. FRAG preset is 1.2 J × 12 Hz.
- **Shop & loadout** (`KIT`, brief): a department budget (starts $500; each finished case pays
  half its score plus a medal bonus) buys a FANS suction access sheath ($2,000) and a DISS suction
  ureteroscope ($3,500), toggled per run, renal cases only. Both lower IRP and clear dust; the
  sheath pulls in fragments < 3 mm drifting back along the scope, the scope aspirates < 2.5 mm at
  its tip (both count as specimens). Flow under 25% with suction collapses the pelvis.
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
10. ~~**A real stone surface under the laser.**~~ — done (see above). The stone's shape becomes the
    result of how you lased it.
    - Dusting done right (painting the edges/surface) dusts it away cleanly, with no chunks.
    - Lasing the middle digs a crater.
    - Poor technique carves out pieces that break off and have to be chased: trenching a groove
      through it, or undercutting an edge.
11. **Surprises and other case types.** Tumor ablation is in (the wildcard). Still to do: an
   unexpected urothelial tumor found during a stone case; a biopsy-only case; tumor in the renal
   pelvis/calyces.

12. **Shop, more kit.** Suction sheath + scope are in. Ideas: anti-retropulsion device, a thulium
    fiber laser for stones (dusts fine, less retropulsion), smaller fibers, a single-use scope.

## Constraints

- PUBLIC repo: fictional patients and generated images only — no real imaging or notes.
- It needs three.js from a CDN (jsdelivr), so it doesn't work offline or on the Boox.
- Timing-dependent behaviour (rails, approach) is checked in headless Chrome with `__sq.step`.
