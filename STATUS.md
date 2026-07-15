# Status — UroStudyHub

**Updated:** 2026-07-14 (late night — shipped)
**Tool:** Claude Code (Fable 5)

## Done this session — math typesets in the tutor (SHIPPED: commit `92c739f` on origin/main)

Andrew: math symbols/special characters don't format right in model answers.
UroStudyHub got the real renderer (Nucleus surfaces got a plain-Unicode prompt
rule instead — see `nucleus/STATUS.md`).

Shipped in `UroStudyHub.html` (+ rebuilt `.min.html` via `build.py`):
- **KaTeX 0.16.9** (cdnjs, same CDN as React) — CSS + JS in the head.
- **`renderMathText()`** (top-level helper): splits a message into text/math
  segments — `\( \)` inline, `\[ \]` + `$$ $$` display, single-`$` only when
  the span contains a LaTeX-ish char (`\ ^ _ {`) so "$50 vs $100" stays money —
  and typesets via `katex.renderToString` (throwOnError:false; falls back to
  raw text offline / on parse failure). Wired into ALL four model-output
  surfaces: main tutor chat, Quick-Ask sidekick, saved-session viewer,
  bookmarks.
- **`MATH_FORMAT_RULE`** appended to the tutor sysContent (lecture / deep dive /
  surgical) + a sidekick RULES line: write formulas as delimited LaTeX.
  Deliberately NOT added globally in `callAI` — JSON-output generator calls
  (anki cards etc.) must not be coaxed into emitting `\(` inside JSON strings.

## Verified
Built min.html on :2036 preview — app boots (only the pre-existing Babel size
notes), `window.katex` 0.16.9 present. Deterministic render test: seeded a
session + bookmark with LaTeX into `uroStudyHub_progress.savedLectures`,
reloaded → inline FENa fraction, centered display CrCl fraction, `$E=mc^2$`
typeset, "$50 vs $100" stays plain. Seed cleaned. Pushed `92c739f`; GitHub
Pages redeploys on push.

## Next steps
- Andrew: force-quit + relaunch the iPad PWA once so the network-first SW pulls
  the new build (same drill as the persistence update).
- Carry-forward (2026-07-09): local backup branches `tutor-sidekick-backup` /
  `tutor-sidekick-premutback` — delete once happy. Untracked residue:
  `STONE_SQUADRON.md`, `URO_FPS.md`, README.docx (Andrew to decide).

## Open questions
- None.
