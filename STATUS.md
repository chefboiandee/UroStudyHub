# Status — UroStudyHub

**Updated:** 2026-06-30
**Tool:** Cowork (Claude)
**Branch:** `or-skills` (feature branch off local `main` — NOT the held `stone-squadron` game branch)

## Done this session — "OR Skills" surgical-fundamentals course (in the AI Tutor)

Added a **Surgical Skills course** that lives inside the **AI Tutor** tab (decided with Andrew:
hybrid built-in-modules + AI tutor; delivered as a course inside the Tutor so it reaches
everyone — sub-Is, interns, AND residents — with no new bottom tab, no role gate).

**What it is (all in `UroStudyHub.html`, rebuilt into `UroStudyHub.min.html`):**
- New **`🔪 OR Skills`** toggle in the Tutor header (next to Saved) + a discovery card in the
  empty-chat welcome. Opens a landing view (`chatView === "skills"`).
- **11 expandable modules** (`SURGICAL_SKILLS`), general-surgery-first with urology applied:
  1 Sterile Technique/OR etiquette · 2 Scalpel & Incisions · 3 Tissue Handling/Instruments/
  Electrosurgery · 4 Suture Selection · 5 Needle Selection · 6 Knot Tying · 7 Closure ·
  8 Hemostasis & Local Anesthesia · 9 Wound Healing & Classification · 10 Drains ·
  11 Urology-Specific Applications. Each: Big idea (mental model), teaching blocks,
  Rules of thumb (decision trees), Common mistakes+fixes, In-urology notes, cheat lines.
- **Offline-readable** (the modules render without any AI) PLUS per module **🎓 Teach me /
  🎯 Quiz me** buttons that launch the tutor using a dedicated **`SYSTEM_PROMPT_SURGICAL`**
  (the essence of Andrew's original tutor prompt — conversational, mental-models, scenario
  quizzes), grounded in that module's own reference text (`skillsModuleReference`) so the AI
  can't drift from the vetted content. In-chat banner shows the active module + Exit course.
- **Course cheat sheet** button aggregates every module's key frameworks.

**QI research hooks (Andrew's insight: med students on surgery = the widest QI pool):**
- Per-module **confidence 1–5** + **Mark reviewed** stored in `s.skillsProgress`
  (`{moduleId:{conf,done,ts}}`). This is the backbone for pre/post confidence measurement —
  the metric the roadmap already names for QI. Not yet a dashboard/export (see Next steps).

**Wiring:** new state `skillsCtx`/`expandedSkill`; `_sendFromMsgs` branches to the surgical
system prompt when a module session is active; `startSkillsModule`/`exitSkills`; composer
gated off the skills landing; Clear resets the session. No premium gate (games-only). No new
top-level tab. No other spokes touched.

## Verification done (sandbox — no LM Studio / device)
- Babel transform of full source **and** minified build → no syntax errors.
- Data integrity: 11 modules well-formed, unique ids, AI reference serializes (~3.3KB/module).
- Real **jsdom render** (vendored React): app boots → Tutor → OR Skills shows all 11 modules →
  expand shows Big idea/Rules/Mistakes → cheat sheet toggles → **Teach me launches into chat
  with the module banner, no new errors**. (One `.style`-null console error is PRE-EXISTING —
  fires identically on the shipped "Saved" view; jsdom has no layout engine. Not a regression.)
- Confirmed **zero held Stone Squadron game code** in both built files.

## IMPORTANT — git provenance (read before shipping)
- Work is committed on **`or-skills`**, branched from local **`main`** (NOT `stone-squadron`).
  It contains clean `main` + this feature only — the held M11 game work is NOT included.
- During the build, the file-tools cache and a bash `git checkout` diverged, so the edits were
  reconciled by replaying only the surgical diff onto clean `main` (verified: no game code).
- Local **`main` is 2 commits ahead of `origin/main`** (`5c2e1a4` premium plumbing,
  `4abca47` repo-scope). `origin/main` is a clean ancestor of `main`. So merging `or-skills`
  → `main` → pushing `origin/main` will also publish those 2 pending commits. Confirm you
  want them live, and confirm the **Pages publish branch** (Settings → Pages) before pushing.

## To ship (Andrew)
```
cd "/Users/andrew/Desktop/Claude's Stuff/urostudyhub"
git checkout main && git merge --ff-only or-skills   # fast-forward main to include the feature
python3 build.py                                      # regenerate UroStudyHub.min.html (already built, but safe)
git add UroStudyHub.min.html && git commit -m "rebuild" --no-verify  # only if build.py changed anything
git push origin main                                  # publishes to chefboiandee.github.io/UroStudyHub
```
`index.html` redirects to `UroStudyHub.min.html`, so the live entry point is the minified file.

## Next steps / carry-forward
- **On-device**: open the built `UroStudyHub.min.html` on Mac/phone and eyeball the OR Skills
  landing (render/CSS) + run one live **Teach me** / **Quiz me** with an AI provider configured
  (sandbox has no LM Studio/key, so live tutor quality is unverified — the launch path itself is).
- **QI build-out** (future): a small progress/confidence export (CSV) + optional pre/post prompt,
  to turn `s.skillsProgress` into study data.
- Untracked residue in the tree (`STONE_SQUADRON.md`, `URO_FPS.md`, `UroStudyHub_README.docx`,
  a `.gitignore` `.claude/` line) is from the `stone-squadron` context — left untouched, not staged.
