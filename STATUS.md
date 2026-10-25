# Status — UroStudyHub

**Updated:** 2026-10-25
**Tool:** Claude Code (Opus 5.5)

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
