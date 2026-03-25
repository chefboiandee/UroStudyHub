# UroStudy Hub — Project Handoff & Roadmap

> **Potential Rename:** The app is currently named "UroStudy Hub" but is being architected for specialty-agnostic use. A rename is planned before any public release. Working candidates include StudyForge, StudyPulse, StudyDeck, and others. The internal localStorage keys (`uroStudyHub_*`) will need a data migration function when renamed. See IP section below for trademark considerations.

---

## Intellectual Property & Legal Notice

**Sole Creator & Inventor:** Andrew (last name withheld for privacy in this document)
**Date of First Creation:** March 2026
**Development Tool:** Built with assistance from Claude (Anthropic) as an AI coding assistant. All creative direction, feature design, UX decisions, and product vision are Andrew's original work.

### Original Innovations (for patent/trademark reference)

The following features and systems represent original creative and technical work by Andrew. Dates reflect when each was first implemented and functional:

1. **Structured 9-Phase AI Lecture System** (March 2026) — A method for AI-guided medical education that breaks any uploaded document into a fixed pedagogical sequence (Big Picture → Core Concepts → Pathophysiology → Diagnosis → Management → Surgical Techniques → Complications → Board Pearls → Rapid Review), with automatic phase detection from AI responses and user-controlled progression.

2. **AI-Organized Clinical Preference Cards with Incremental Updates** (March 2026) — A system where users input raw notes about attending surgeon preferences, and AI organizes them into structured reference cards. Subsequent notes are merged incrementally (only new notes sent to AI with strict preservation rules) to prevent format drift and information loss over repeated reorganizations.

3. **Gamified Medical Study Platform with Token Economy** (March 2026) — Integration of study tracking, AI tutoring, flashcard generation, and arcade-style medical mini-games (Stone Crusher, Clinic Rush, Drug Match, Buzzer Rounds) into a unified platform with XP, coins, tokens, ranks, streaks, and upgrades forming a self-reinforcing engagement loop.

4. **Upload-to-Curriculum AI Pipeline** (March 2026) — A system where users upload any syllabus, table of contents, or course outline, and AI parses it into a structured multi-phase study plan with topics, sections, and scheduling — making the platform content-agnostic.

5. **Adaptive Study Pacing Based on Time Commitment** (March 2026) — A scheduling system that dynamically adjusts weekly topic distribution based on user-configured study days per week and minutes per session, with automatic review/catch-up day insertion for lighter schedules and multi-topic stacking for intensive schedules.

6. **Cross-User Clinical Knowledge Sharing via Encoded Share Codes** (March 2026) — A system for encoding structured clinical data (preference cards, site guides, reference card packs) into portable share codes (`URO:TYPE:base64`) that can be transmitted via any text channel and imported with auto-detection and preview.

### Trademark Considerations

- **App Name:** Not yet finalized. Do NOT file trademark on "UroStudy Hub" if planning to rename. File on the final name.
- **Game Names:** "Stone Crusher," "Uro Clinic Rush," "Drug Match," "Buzzer Rounds" — consider trademark if games are marketed separately.
- **Feature Names:** "Pocket Guide," "Pimp Prep" — may be worth protecting if they become brand identifiers.
- **To preserve trademark rights:** Document first public use dates. Use ™ symbol on unregistered marks. File federal trademark registration (USPTO) when ready to commercialize. A trademark attorney can do a clearance search for ~$300-500.

### Patent Considerations

- **Provisional patent application** ($320 USPTO fee for micro-entity) establishes a priority date and gives 12 months to file a full utility patent. This is the recommended first step.
- **What's potentially patentable:** The 9-phase lecture system, the incremental AI card organization method, the upload-to-curriculum pipeline, and the adaptive pacing system are all novel technical methods that could qualify as software patents (especially method claims).
- **Prior art notes:** AI tutoring broadly exists (Khan Academy, Duolingo), but the specific 9-phase structured lecture system with phase detection, the incremental preference card updates, and the gamified medical study combination appear to be novel as of March 2026.
- **Document everything:** This CLAUDE.md file, git history, and development conversations serve as evidence of conception dates. Keep them.
- **A patent attorney consultation** (often free initial consult) can evaluate which innovations are worth filing on. Budget ~$8,000-15,000 for a full utility patent through prosecution.

### Copyright

- All source code is automatically copyrighted upon creation (no registration needed, but registration enables statutory damages).
- The AUA curriculum topic list in `AUA_PHASES` is factual/functional and likely not copyrightable by AUA, but the specific organization and phase groupings are Andrew's original arrangement.
- Reference card content (BPH meds, ADT, pregnancy, etc.) is general medical knowledge and not copyrightable.
- AI-generated content (organized preference cards, lecture responses) has uncertain copyright status under current law — the human-directed selection, arrangement, and editing of AI outputs likely qualifies for copyright protection.

### Development Hours

Track development hours for valuation purposes. Estimated as of March 22, 2026: ~40-60 hours of active development across multiple sessions. (Andrew should track going forward.)

---

## What This Is

UroStudy Hub is a single-file React web app (~10,700 lines) for medical board exam prep and clinical study tracking. It combines structured curriculum progress tracking, AI-powered tutoring, Anki flashcard generation, gamified mini-games, clinical quick-reference guides, attending preference cards, rotation site guides, and a sharing system — all in one `UroStudyHub.html` file with zero build step.

Currently urology-focused but architecturally designed for any medical specialty (or non-medical study). Users upload their own content; the platform provides the engine.

The user/creator is Andrew, a urology trainee.

## Architecture

**Frontend:** Single `UroStudyHub.html` file. React 18 + ReactDOM + Babel loaded from CDN. All state management via `useState`/`useEffect`/`useMemo`/`useRef`. No router — tab-based navigation via `page` state variable.

**AI Integration:** Multi-provider support for AI tutoring, Anki card generation, preference card organization, site guide organization, and study plan generation:
- **Claude API** — `claude-sonnet-4-20250514` via Anthropic REST with `anthropic-dangerous-direct-browser-access` header
- **Gemini API** — via Google's OpenAI-compatible endpoint
- **OpenAI API** — direct
- **OpenRouter** — access to hundreds of models with one key
- **LM Studio** — local model, OpenAI-compatible endpoint

Provider config stored in localStorage as `uroStudyHub_lmSettings`.

**Storage:** All data in a single localStorage blob under key `uroStudyHub_v5` (the `s` state object). Settings stored separately in `uroStudyHub_lmSettings`. Custom study plans in `uroStudyHub_customPlans`. Active plan ID in `uroStudyHub_activePlan`.

**Hosting:** Served from Andrew's Mac:
```bash
cd "/Users/andrew/Desktop/Claude's Stuff"
python3 -m http.server 2020
```
Access alongside NomNom. UroStudyHub.html is in the same directory.

## File Structure

```
UroStudyHub.html              — The entire app (single file, ~10,700 lines)
UroStudyHub_CLAUDE.md         — This file
aua-tracker/                  — Older React+Vite version (NOT the active version)
  src/App.jsx                 — 668-line component (subset of features)
  package.json, vite.config.js, etc.
aua-tracker-v5.jsx            — Standalone compact JSX (203 lines, early prototype)
AUA core curriculum/          — 168 EPUB/PDF files organized by specialty
```

**The canonical version is `UroStudyHub.html`.** The aua-tracker/ directory and other JSX files are earlier iterations — do not modify those.

## Navigation & Pages

Bottom tab bar with dynamic tabs (some toggleable):

| Tab | Page ID | Label | Description | Toggleable |
|-----|---------|-------|-------------|------------|
| 🏠 | `hub` | Hub | Dashboard — streak, XP, next topic, phase progress, pomodoro, daily check-in | No |
| 📚 | `tracker` | Study | Study Tracker with sub-tabs: Schedule, Plans, Core, Op Log, Stats | No |
| 🧠 | `chat` | Tutor | AI Tutor — freeform or structured 9-phase lecture mode | No |
| 📇 | `anki` | Anki | Anki card manager — AI generation, manual creation, export | Yes (`ankiEnabled`) |
| 🎮 | `games` | Games | Mini-game selector (opens overlay) | No |
| 📖 | `refs` | Guide | Pocket Guide — reference cards + attending prefs + site notes | No |
| 🎓 | `student` | Sub-I | Sub-Internship Toolkit (only when role=student) | Role-based |
| 🔗 | `links` | Links | Custom + built-in resource links | No |

### Study Tracker Sub-Tabs (`tView`)

| Sub-tab | ID | Description |
|---------|----|-------------|
| 📅 | `schedule` | Weekly reading plan with adaptive pacing, commitment editor |
| 🗂 | `plans` | Plan management — AUA Core, Sub-I, custom plans |
| 📚 | `curriculum` | Full topic tree — phases → sections → topics |
| 🔗 | `oplog` | Resident Op Log (SurgiLog integration, toggle-gated) |
| 📈 | `stats` | Statistics — activity heatmap, confidence heatmap, rank, export |

### Pocket Guide Sub-Tabs (`guideTab`)

| Sub-tab | ID | Description |
|---------|----|-------------|
| 📖 | `cards` | Reference card grid + card content |
| 👤 | `attendings` | Attending preference cards with AI organization |
| 🏥 | `sites` | Rotation site notes/guides with AI organization |

> **Note:** Attending Prefs and Site Notes were moved from the Study Tracker to the Pocket Guide tab (March 2026) to consolidate all reference material in one place.

## Study Plans & Adaptive Pacing

Three built-in plan types:

1. **AUA Core Curriculum** (`AUA_PHASES`) — 133 topics across 9 phases + 17 categories. Board exam prep.
2. **Sub-I Curriculum** (`SUBI_PHASES`) — 12-week rotation curriculum for urology sub-internship.
3. **Custom Plans** — User-uploaded syllabi parsed by AI into structured phases/topics.

Active plan selected via `activePlanId` state. The `PHASES`, `FLAT`, and `TOTAL` variables dynamically switch based on which plan is active.

### Study Commitment Settings

Users configure their study availability in the Schedule tab:
- **Days per week:** 2-7 (mapped to specific weekdays via `getStudyDays()`)
- **Minutes per session:** 15, 30, 45, 60, 90, or 120

These settings directly control weekly pacing:
```
topicsPerWeek = round(studyDays.length × (minsPerSession / 60))
```

| Days/wk | Min/session | Topics/wk | Behavior |
|---------|-------------|-----------|----------|
| 4 | 15 min | 1 | Very light — 3 review days per week |
| 4 | 30 min | 2 | Manageable for beginners |
| 4 | 60 min | 4 | Baseline — 1 topic per study day |
| 4 | 90 min | 6 | Some days get 2 topics |
| 6 | 120 min | 12 | Intensive — 2 topics every day |

The weekly schedule display adapts: fewer-topics-than-days shows "Review / catch-up" slots; more-topics-than-days stacks multiple topics per day.

## Core Features

### Curriculum Tracking
- Mark topics complete (checkbox) with date stamp
- Confidence rating per topic (1-5 circles)
- SRS (Spaced Repetition System) — tracks review intervals per topic using SM-2 inspired algorithm
- `SRS_INTERVALS = [1, 3, 7, 14, 30, 60, 120]` days
- Phase-by-phase progress bars
- Smart "next topic" suggestion

### AI Tutor (`page === "chat"`)
- **Freeform mode:** Ask any question
- **Structured Lecture mode:** Upload a PDF/EPUB/text chapter → AI delivers a 9-phase lecture:
  1. Big Picture, 2. Core Concepts, 3. Pathophysiology, 4. Diagnosis, 5. Management,
  6. Surgical Techniques, 7. Complications, 8. Board Pearls, 9. Rapid Review
- Lecture phase detection from AI response content
- "NEXT" and "SKIP" commands to advance phases
- "DEEP" button for more detail on current section
- **Tutor Style/Persona picker** — 4 presets injected into system prompt:
  - 🔥 Engaging — dynamic, case-driven, energetic
  - 🩺 Clinical — structured, evidence-based, formal
  - 🤔 Socratic — question-first, guided discovery
  - 😎 Chill — relaxed, supportive, low-pressure
- **Custom learner note** — free-text field injected as "ADDITIONAL CONTEXT FROM THE LEARNER" in system prompt
- **Save & Resume sessions** — save full conversation + lecture phase to Saved Lectures; resume button restores all state
- Bookmark any AI response for later review
- **Regenerate response** button (🔄) on last assistant message
- Auto-generate Anki cards from lectures (configurable tags)
- Upload accepts: PDF, DOCX, TXT, MD, HTML, CSV, RTF

### Anki Cards (`page === "anki"`, toggleable)
- AI-generated cards from topics or lectures
- Manual card creation (basic + cloze types)
- Batch generation from uploaded content
- Tag system for organization
- Export to Anki-importable format (TSV with separate basic/cloze files)
- AnkiConnect integration (partially implemented)
- Select, bulk delete (with confirmation), edit cards
- **Anki toggle** — settings toggle hides all Anki UI (tab, hub tasks, lecture buttons) when disabled

### Attending Preference Cards (Guide → 👤 Attendings)
- Add attendings, jot quick notes during cases
- **AI organization** into structured preference cards with sections:
  - OR Preferences (General), Case-Specific, Post-Op Orders, Clinic, Floor/Rounding, Misc
- **Incremental updates** — new notes merged into existing card without rewriting (AI sees only existing card + new notes, with strict preservation rules)
- **Full rewrite** option with confirmation dialog
- **Preamble stripping** — AI response cleaned to start at first `## ` header
- **Card header** — attending name displayed large and centered, not a generic label
- New/old note split: new notes highlighted in yellow at top, old notes collapsed at bottom
- Amber "● new notes" badge on attending list when unincorporated notes exist
- Share individual or all attending cards

### Rotation Site Notes (Guide → 🏥 Sites)
- Add rotation sites, jot notes about anything (OR info, codes, parking, wifi, schedules)
- **AI organization** into site survival guides with sections:
  - Weekly Schedule & Attendings, PGY-Level Expectations, OR & Procedure Info, Door Codes & Access, Where Things Are, Floor/Rounding, Clinic, Call & Consults, Tips & Tricks, Misc
- Same incremental update + full rewrite + preamble stripping as attending cards
- **Site guide header** — site name displayed large and centered
- Share individual or all site guides

### Universal Share System
- **Share Modal** — bottom-sheet with 3 options:
  - Native Share (mobile via `navigator.share()`)
  - Copy Share Code (encoded as `URO:TYPE:base64`)
  - Export JSON File
- **Import Modal** — paste box with auto-detection of `URO:` prefix, live preview, file upload
- **Import button** (📥) in header, always accessible
- **Share types:** ATT (all attendings), ATT1 (single attending), SITE (all sites), SITE1 (single site), PACK (reference card packs)

### Custom Links (`page === "links"`)
- **My Links** — user-addable custom links with title, description, URL, and emoji picker (20 options)
- Edit, delete, reorder (↑/↓) personal links
- **Built-in Links** below — AUA SASP, Core Curriculum, Guidelines, Update Series, Open Anki (if enabled), LM Studio
- Links persist in state as `s.customLinks` array

### Gamification & Token Economy
- **XP & Coins** — earned from completing topics, lectures, readings, Anki reviews, pomodoros, SASP
- **11-rank progression** — Pre-Med → ... → Department Chair
- **Daily streak** with streak shield upgrade
- **Tokens** — currency for playing games. Earned via study activities.
- **Activity Log** — tracks all study actions with timestamps

### Mini-Games (overlay via `showGame` state)

| Game | ID | Description | Multi-Specialty Potential |
|------|----|-------------|--------------------------|
| 🪨 Stone Crusher | `blaster` | Click falling kidney stones before they hit bottom | Urology-specific — would need specialty variants (e.g. catch arrhythmias for cardiology, identify lesions for derm) |
| 🏥 Uro Clinic Rush | `clinic` | Top-down doctor sim — WASD movement, diagnose patients | **Highly adaptable** — swap patient scenarios for any specialty (EM triage, ortho clinic, peds, etc.) |
| 🚨 Inpatient Consults | `consults` | Inpatient variant of Clinic Rush | **Highly adaptable** — same engine, just swap consult scenarios per specialty |
| 💊 Drug Match | `drugmatch` | Conveyor belt — catch pills in correct drug class bucket | **Universal** — works for any specialty by swapping drug categories (abx classes, psych meds, chemo regimens, etc.) |
| 🔔 Buzzer Rounds | `buzzer` | Rapid-fire Q&A with timer | **Universal** — content-agnostic, just swap question banks |

> **Games & Target Audience:** The mini-games are a core differentiator but are inherently medical education tools. The broader app could theoretically serve non-medical studiers (law, engineering, etc.) via the curriculum tracking, AI tutor, and flashcard systems — but the games, clinical preference cards, site notes, and Sub-I toolkit are deeply medical. **The realistic target market is medical trainees across specialties** (including nursing students for NCLEX prep, PA students, etc.) — not general-purpose students. A multi-specialty expansion would need: (1) specialty-specific game content packs, (2) a game content authoring system or AI-generated scenarios, and (3) at minimum a dozen specialty variants to have broad appeal. The game engine architecture (Clinic Rush, Drug Match, Buzzer) is reusable — the content is what needs per-specialty work. **Key architectural goal:** Make the game engines **data-driven** — load game content from a JSON config per specialty instead of hardcoding. Then adding a new specialty is just a content pack, not new code.

#### Specialty Game Adaptation Plan

**Universally adaptable (swap content, same engine):**

| Engine | Specialty | Variant Name | Content |
|--------|-----------|-------------|---------|
| Drug Match (conveyor) | Nursing | Med Pass | Sort meds by schedule (PRN/scheduled/STAT) or route (PO/IV/IM/SubQ) |
| Drug Match | Psychiatry | Psych Med Sort | SSRIs, SNRIs, atypicals, mood stabilizers, benzos → class buckets |
| Drug Match | Anesthesia | Agent Sort | Induction agents vs paralytics vs reversal agents vs vasopressors |
| Drug Match | Peds | Dosing Check | Catch correctly weight-based-dosed meds, dodge wrong ones |
| Drug Match | Cardiology | Vaughan-Williams | Antiarrhythmics by class |
| Buzzer Rounds | *All* | *Same* | 100% content-agnostic — swap question banks per specialty |
| Clinic Rush (top-down) | Nursing | Floor Nurse Rush | Call lights, prioritize by acuity, delegate to CNAs |
| Clinic Rush | EM | Triage Rush | Assign ESI levels 1-5, route to trauma bay/fast track/waiting |
| Clinic Rush | Anesthesia | OR Manager | Bounce between ORs, hemodynamic changes, emergence |
| Clinic Rush | OB/GYN | L&D Rush | Multiple laboring patients, read strips, call for C-section |
| Clinic Rush | Surgery | Post-Op Floor | Catch complications (dehiscence, PE, ileus) before escalation |

**Stone Crusher engine (click falling objects) — identification/prioritization variants:**

| Specialty | Variant | Mechanic |
|-----------|---------|----------|
| EM | Trauma ABCDE | Click interventions in correct order (airway→breathing→circulation) |
| Cardiology | Rhythm Zapper | Click dangerous arrhythmias (V-tach, V-fib), let benign pass (NSR) |
| Dermatology | Lesion Spotter | Click malignant lesions (melanoma, BCC, SCC), let benign pass |
| Radiology | Finding Finder | Click imaging slices with pathology (pneumothorax, fracture, mass) |
| Nursing | Vital Sign Alert | Click critical vitals (MAP<65, O2<88%, HR>150) before patient codes |
| Peds | Milestone Match | Click age-appropriate milestones for displayed age |
| Surgery | Instrument Pass | Surgeon calls instrument, click correct one from falling tools |

**Potential new game engines (future):**
- **Match/Memory** — flip cards to match drug↔mechanism, pathology↔treatment
- **Triage Tetris** — patients stack up, slot them into correct bed/unit before overflow
- **Code Blue Sequence** — Simon Says with ACLS/BLS steps in correct order

**Unique per-specialty games** (1-2 per specialty that are specific enough to warrant a custom game, built on existing engines):

### Pocket Guide Reference Cards (`page === "refs"`)

| Card ID | Title |
|---------|-------|
| `foley` | Foley Sizing & Color Guide |
| `hematuria` | Hematuria Workup (AUA/SUFU 2025) |
| `renal` | Renal Colic |
| `uti` | UTI Treatment |
| `stone` | Stone Composition Guide |
| `psa` | PSA & Prostate Cancer Screening |
| `bph` | BPH Medications (comprehensive) |
| `bladder` | Bladder Cancer Staging |
| `trials` | Landmark Urology Trials |
| `pregnancy` | Urology in Pregnancy |
| `adt` | ADT & Hormonal Therapy |

### Sub-I Toolkit (`page === "student"`, role=student only)

| Sub-tab | Description |
|---------|-------------|
| Quick Cards | Clinical reference cards |
| Case Log | Log surgical cases |
| Pimp Prep | AI-generated pimp questions |
| Curriculum | Sub-I specific tracking |

### Other Features
- **Pomodoro Timer** — Hub page (full card) + Tutor page (compact strip). Configurable: 15/25/45 min.
- **SurgiLog Integration** — toggle via `ENABLE_SURGILOG` constant
- **Dark mode** — always on with 5 color themes: Night Shift, Surgical Green, Renal Sunset, Cryoablation, Board Certified Gold
- **Export** — CSV export of study data
- **Gate Questions** — knowledge-check popups as engagement mechanism
- **PWA-ready** — inline manifest + service worker pattern available

## Data Model

### Main State Object (`s`, stored as `uroStudyHub_v5`)

```javascript
{
  // Study progress
  done: { "0-0-0": "2026-03-22", ... },
  medDone: { ... },
  conf: { "0-0-0": 3, ... },
  studyDaysPerWeek: 4,          // 2-7
  studyMinsPerDay: 60,          // 15, 30, 45, 60, 90, 120

  // SRS
  srs: { "0-0-0": { last, interval, ease, reps } },

  // Gamification
  xp: 1250, coins: 340, tokens: 5,
  streak: 12, lastDay: "2026-03-22",

  // Anki
  ankiCards: [{ id, front, back, tags, topic, type }],
  ankiEnabled: true,            // toggle to hide all Anki UI

  // Attending preferences
  attendingPrefs: {
    "Dr. Smith": {
      notes: [{ text: "...", ts: 1234567890 }],
      organized: "## OR Preferences\n- ...",
      organizedNoteCount: 5     // tracks which notes are incorporated
    }
  },

  // Rotation sites
  rotationSites: {
    "VA Main": {
      notes: [{ text: "...", ts: 1234567890 }],
      organized: "## Weekly Schedule\n- ...",
      organizedNoteCount: 3
    }
  },

  // Saved lectures
  savedLectures: [{
    id, type: "session", topic, messages: [],
    lecturePhase: 3, lectureMode: true, date: "ISO"
  }],

  // Tutor settings
  tutorStyle: "engaging",       // engaging, clinical, socratic, chill
  tutorCustomNote: "",          // free-text injected into system prompt

  // Custom links
  customLinks: [{ title, sub, url, emoji }],

  // Guide tab state
  guideTab: "cards",            // cards, attendings, sites

  // ... (gamification, activity, games, notes, etc.)
}
```

### AI Settings (`uroStudyHub_lmSettings`)
```javascript
{
  ep: "http://localhost:1234",
  model: "",
  on: false,                    // always resets to false on load
  provider: "gemini",
  claudeKey: "", claudeModel: "claude-sonnet-4-20250514",
  geminiKey: "", geminiModel: "gemini-2.5-flash",
  openaiKey: "", openaiModel: "gpt-4o",
  openrouterKey: "", openrouterModel: "google/gemini-2.5-flash:free",
}
```

## Known Issues & Limitations

### Current
- Games designed for keyboard (WASD) — need touch controls for mobile
- AnkiConnect integration partially built — connection exists but full sync flow incomplete
- Prestige system has state variables but no UI
- SASP mode has state but limited UI
- `on: false` reset on every page load means AI never auto-enables (intentional safety)
- Progress photos in localStorage will hit size limits — needs IndexedDB migration

### Recently Fixed (March 2026)
- ✅ Study pacing now responds to session length (was ignoring `studyMinsPerDay`)
- ✅ Saved lecture sessions can be resumed (was view-only)
- ✅ AI preference card preamble stripped ("Here is the organized card for..." removed)
- ✅ Card headers show attending/site name large and centered
- ✅ Attending prefs & site notes moved to Pocket Guide tab
- ✅ Incremental AI organization prevents format drift on repeated updates
- ✅ New/old notes split with visual differentiation
- ✅ Anki toggle hides all Anki UI when disabled
- ✅ Custom links replace hardcoded links page
- ✅ Tutor style picker (4 presets + custom note)
- ✅ Universal share system (share codes, native share, JSON export/import)
- ✅ Claude model ID corrected, API key validation, AI response validation
- ✅ Various game fixes (scaling, interaction distance, tutorial length)

---

## Roadmap

### Phase 1: Mobile Experience (High Priority)
- [ ] Touch controls for games (virtual joystick / tap-to-move)
- [ ] Responsive layout audit at 375px and 390px
- [ ] PWA support (inline service worker + manifest)
- [ ] Touch-friendly Anki review (swipe gestures)
- [ ] 44px minimum tap targets

### Phase 2: Cross-Device Sync (Medium Priority)
**Recommended: Supabase (free tier)** — 500MB database, 50K monthly API requests, built-in auth, real-time subscriptions.

Sync: `done`, `conf`, `srs`, `xp`, `streak`, `ankiCards`, `attendingPrefs`, `rotationSites`, `savedLectures`, `customLinks`, `activityLog`.
Keep local: game state mid-session, UI state, pomodoro timer.

### Phase 3: AI-Generated Reference Cards (Core Product Differentiator)
- [ ] "Generate Card" button in Pocket Guide
- [ ] Card template system — existing cards as few-shot examples
- [ ] Inline card editor (WYSIWYG)
- [ ] "Regenerate section" and "Enhance with upload" buttons
- [ ] Card sharing/export as images or JSON
- [ ] Starter card packs per specialty

### Phase 4: Multi-Specialty Expansion
- [ ] **Rename app** (see note at top)
- [ ] Make all curriculum structures 100% user-defined/importable
- [ ] Strip AUA-specific naming from UI
- [ ] Specialty-agnostic reference card templates
- [ ] Community card pack sharing
- [ ] **Data-driven game engines** — game content loaded from JSON config per specialty (not hardcoded). Adding a specialty = adding a content pack, not new code.
- [ ] **Game content packs per specialty** — Clinic Rush scenarios, Drug Match drug sets, Buzzer question banks for EM, gen surg, IM, ortho, OB/GYN, peds, nursing/NCLEX, anesthesia, psychiatry, cardiology, derm, radiology, etc.
- [ ] **Game content authoring** — either manual specialty-specific content or AI-generated game scenarios from uploaded curriculum material
- [ ] **Specialty picker on onboarding** — sets default game content, reference card suggestions, and rank titles
- [ ] **Nursing edition** — NCLEX-focused variant with nursing-specific games (Med Pass, Floor Nurse Rush, Vital Sign Alert), nursing drug categories, and nursing-appropriate reference cards. Same engine, different content packs.
- [ ] **Per-specialty unique games** — 1-2 games per specialty that are specific enough to justify custom content (e.g., Rhythm Zapper for cardiology, Lesion Spotter for derm, Instrument Pass for surgery)

### Phase 5: Social & Accountability
- [ ] Study groups (opt-in progress visibility)
- [ ] Shared Anki decks
- [ ] Daily challenge
- [ ] Leaderboard

### Phase 6: Advanced Features
- [ ] AI-generated practice exams with score tracking
- [ ] Spaced repetition visualization / workload forecasting
- [ ] Complete AnkiConnect integration
- [ ] Prestige system UI
- [ ] Export to PDF
- [ ] Dark/light mode toggle

### Business / Pitch Strategy

**Near-term: QI Project**
- Frame as: "Gamified digital study tool to improve board prep engagement among residents"
- Measure: study hours, self-reported confidence, in-training exam score changes
- Publishable as QI research

**Medium-term: Multi-Specialty Medical Study Platform**
- Expand beyond urology to other medical/surgical specialties
- Core engine is reusable (gamification, SRS, AI tutor, reference cards, preference cards, site notes)
- Games need per-specialty content packs — Drug Match and Buzzer are easiest to adapt (swap content), Clinic Rush/Consults need specialty-specific scenarios, Stone Crusher engine reusable for identification/prioritization variants per specialty
- Realistic target: **medical trainees** (residents, fellows, med students on rotations) AND **nursing students** (NCLEX prep) — NOT general-purpose students. The clinical features (attending prefs, site notes, Sub-I toolkit, medical games) are too domain-specific for non-medical use, even though the study tracking core could work for anyone
- Nursing is a particularly strong adjacent market — large user base, high-stakes exam prep (NCLEX), and many game concepts translate directly (Med Pass, Vital Sign Alert, Floor Nurse Rush)

**Long-term: Acquisition target**
- Pitch after QI data proves engagement/outcomes
- What they'd buy: the design system and UX/engagement design
- Track development hours for valuation
- AI-provider-agnostic architecture is a selling point

### Technical Debt
- [ ] Split into modules (~10,700 lines in one file)
- [ ] Pre-compile JSX (replace Babel CDN)
- [ ] IndexedDB for large data (Anki cards, photos, activity logs)
- [ ] React error boundary
- [ ] Accessibility (ARIA labels, keyboard nav)
- [ ] Testing (SRS intervals, XP math, state persistence)

## Andrew's Setup Notes

- UroStudyHub.html lives at `/Users/andrew/Desktop/Claude's Stuff/UroStudyHub.html`
- AUA curriculum PDFs/EPUBs at `/Users/andrew/Desktop/Claude's Stuff/AUA core curriculum/`
- The aua-tracker/ React project and standalone JSX files are NOT the active version
- AI provider: likely Gemini (free tier) or Claude
- Currently single-user, localhost only
- No build step — just serve the HTML file
