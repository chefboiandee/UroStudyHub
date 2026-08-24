# Status — UroStudyHub

**Updated:** 2026-08-24
**Tool:** Claude Code (Fable 5)

## 2026-08-24 — 🎯 Mastery Drill: third tutor mode (778434f)

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

## Next steps

- **`TRAIL_TICKET.md` authored earlier today (separate session) — awaiting an
  opencode run.** 🌌 Trail: constellation star-map of the learning path as a
  new tracker sub-tab. The executing session should read AGENTS.md then the
  ticket, work stage by stage, and overwrite this STATUS when done. Ticket
  file stays uncommitted. (Mastery Drill landed after the ticket was written —
  rebase mentally: both touch UroStudyHub.html but different surfaces.)
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
