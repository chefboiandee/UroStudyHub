# UroStudyHub — Claude Code instructions

@AGENTS.md

This folder is its own project: open Claude Code sessions here. (Until 2026-10-25 it sat
inside another workspace; nothing here depends on that one any more.)

## Read on demand

| When you need… | Read |
|---|---|
| Roadmap, architecture, features, data model | `UroStudyHub_CLAUDE.md` (big — grep, then slice) |
| What the last session did, next steps | `STATUS.md` (newest entries at the top) |
| Stone Squadron (3D ureteroscopy game in `games/`): design notes, roadmap | `STONE_SQUADRON.md` |
| User-facing setup | `SETUP.md` |

## Layout

- `UroStudyHub.html` — the app (React + in-browser Babel, ~13k lines: grep → slice).
  `python3 build.py` → `UroStudyHub.min.html`, which Pages serves (`index.html` redirects to it).
- `games/` — arcade games that are their own page; the app hosts them in a frame
  (`games/preop-please.html`: postMessage `preop:claim` / `preop:exit`).
- `prototypes/` — prototypes + the Lab page (served on Pages for testers, noindex).
- `tools/` — headless-Chrome harnesses: `node tools/preop-please.drive.mjs`
  (needs the `urostudyhub` server), `node prototypes/squadron3d_drive.mjs all` (needs `squadron3d-proto`).

## Run and verify

- Dev servers in `.claude/launch.json`: `urostudyhub` = repo root on :2043
  (`/UroStudyHub.min.html`, `/games/…`), `squadron3d-proto` = `prototypes/` on :2047.
  From a terminal: `python3 -m http.server 2043`.
- After editing `UroStudyHub.html`: build, load the built page, check the console for
  `Uncaught SyntaxError`. Harmless known lines: Babel's "exceeds the max of 500KB" note, and a
  refused LM Studio request when no local model server is running.
- Timing-dependent behaviour (animation, audio, game clocks) is proven in headless Chrome with
  the harnesses: the desktop app's browser pane runs as a hidden tab (rAF ≈ 2 fps, CSS animations stall).

## Git

- PUBLIC repo: nothing personal or secret in any file or commit message.
- `git push` is pre-approved (Andrew, 2026-10-31; allow rule in `.claude/settings.json`): push the
  session's working branch when finished work is committed. Merging to `main` is what deploys to
  Pages — open the PR and merge only when Andrew asks. Side branches (`proto/*` and the like) stay local.
- End a non-trivial session with a `STATUS.md` entry at the top (Done / Next steps / Open questions).
