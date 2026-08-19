# AGENTS.md — UroStudyHub (urology boards-prep app)

**Standalone repo — treat this directory as the project root; ignore any
parent directories.** Deploys to GitHub Pages
(chefboiandee.github.io/UroStudyHub). **This repo is PUBLIC: nothing
personal, clinical, or secret goes in any file or commit message.**
`UroStudyHub_CLAUDE.md` is the project handoff/roadmap doc — read it before
feature work.

## The load-bearing constraint: the Boox
The primary reading device is a Boox Go 7 e-reader whose NeoBrowser is
roughly **Chromium ≤92**. Everything must run on that engine:
- Keep shipped JS old-engine-safe (no syntax newer than ~ES2020 in what the
  build emits; when in doubt, test the built file, not your assumptions).
- **pdf.js is PINNED to 2.16.105 legacy in `pdfjs/` — never bump it** without
  a real on-device Boox retest.
- "Works in desktop Chrome" is not done. If it breaks on the Boox, it's broken.

## Layout + workflow
- `UroStudyHub.html` is the single-file app source and it is huge — **grep
  first, then read a slice; never whole-read it.** `build.py` / `build.sh`
  produce `UroStudyHub.min.html` for Pages.
- Verify by building and loading the page (check the browser console for
  `Uncaught SyntaxError`), not by a syntax pass alone.
- Deploying = pushing this repo to GitHub. **Never push — Andrew pushes
  deliberately.** Never add remotes.
- End any non-trivial session with a `STATUS.md` breadcrumb
  (Done / Next steps / Open questions).
