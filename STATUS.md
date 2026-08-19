# Status — UroStudyHub

**Updated:** 2026-08-19
**Tool:** Claude Code (Fable 5)

## 2026-08-19 — independence formalized + 🚨 stray SurgiLog snapshot untracked

- **`AGENTS.md` added** (`86bc5b8`): standalone-project ground rules — PUBLIC
  repo warning, the Boox/Chromium≤92 constraint, pdf.js pinned 2.16.105,
  never push. Any opencode/Claude session started in this folder now resolves
  these rules instead of the parent Nucleus tree's.
- **🚨 A stale 7/09 copy of the entire SurgiLog extension was TRACKED here —
  and therefore PUBLISHED on the public Pages repo since ~July 9** (13 files
  on origin/main; code only, no PHI or secrets). Untracked + gitignored in
  `9f16813`. **Not yet un-published:** the public remote shows it until the
  next push, and git history keeps it either way (full scrub = filter-repo +
  force push — Andrew's call). The stale dir is still on disk; delete with
  `rm -rf caselog-extension-main` when ready.
- Deliberately NOT committed (public repo — Andrew's call):
  `STONE_SQUADRON.md`, `URO_FPS.md`, `UroStudyHub_README.docx`. Also note
  `UroStudyHub_CLAUDE.md` (the IP/patent strategy doc) is tracked and public —
  worth deciding whether that should stay public.

## 2026-07-30 (upload retry fix 94763bf; prior: pdf.js pinned 2.16.105 legacy 24e5e59, light mode 8a77720) — dead uploader after failed upload + Clear (Andrew's report)

- **Symptom:** first upload failed → he clicked Clear → picking a file again
  did NOTHING until he switched to another app tab and came back.
- **Root cause:** a browser `<input type="file">` fires `change` only when its
  value CHANGES. None of the three ref-based file inputs ever reset `value`,
  so after any pick (failed or successful) re-picking the SAME file fired no
  event. The Clear buttons reset React state only — not the input element.
  Tab-switching "fixed" it because React unmounts/remounts the subtree → fresh
  empty input.
- **Fix (94763bf):** all three inputs — tutor chapter upload (`fileRef`), Anki
  batch (`ankiFileRef`), syllabus (`syllabusFileRef`) — now do
  `e.target.value = ""` at the top of onChange, right after grabbing the File
  (the File object stays valid after the reset). Covers every path: failed
  upload retry, Clear-then-reupload, and re-uploading the same chapter after a
  success. The two dynamically-created JSON-import inputs are immune (fresh
  element per click) — untouched.
- **Verified on :2037 (min build, real inputs via DataTransfer):** tutor —
  corrupt PDF → Clear → same-file retry fires the handler ("Loading PDF
  parser…" live) with value reset to "" after every pick; Anki — txt lands
  (MARKDOWN PREVIEW + content) → Clear → same-file retry re-populates; only
  the pre-existing Babel size notes in console. Pushed → Pages.
- **Andrew:** reload the site once (or let the PWA update) and retry the
  failed upload flow.

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
  polling; sample from inside one hot javascript_exec.
- Real storage key is `uroStudyHub_progress` (docs' uroStudyHub_v5 is stale).

## Known-separate (not broken, just noted)

- Study-Plan builder's syllabus upload still uses a naive regex PDF extractor
  (~line 7900), not `pdfExtractText` — shallow but working; its input DOES get
  the new value reset.
- Pomodoro chime is code-path verified only (headless) — audible check
  on-device.

## Next steps

- None blocking. If Andrew reports the Boox PDF upload failing again, get the
  exact error text — wording maps to cause (see 24e5e59 decision table in git
  history).
