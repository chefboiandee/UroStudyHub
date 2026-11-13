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
| Uro Crawl (roguelike in `games/uro-crawl.html`): the step-by-step build plan ("read it and do the next step") | `UROCRAWL_ROADMAP.md` |
| User-facing setup | `SETUP.md` |

## Layout

- `UroStudyHub.html` — the app (React + in-browser Babel, ~13k lines: grep → slice).
  `python3 build.py` → `UroStudyHub.min.html`, which Pages serves (`index.html` redirects to it).
- `games/` — arcade games that are their own page; the app hosts them in a frame
  (`games/preop-please.html`: postMessage `preop:claim` / `preop:exit`; `games/uro-rush.html`: `rush:claim` / `rush:exit`;
  `games/uro-crawl.html`: `crawl:claim` / `crawl:result` / `crawl:exit` — the dungeon-crawler roguelike, shown to players as
  **Path of Pathology** (the file, storage key and hooks keep the working name Uro Crawl), pure canvas, no deps;
  five bosses, `?boss=staghorn|fournier|mibc|bph|reflux` (the Staghorn: a mobile head-on duel, numbers in `STAG`, script `stag*` in §14b; the Invader: round arena on the generic wall + perforation system, §14c / §14d;
  the Giant TURP: a flow-meter fight in three sections, `?section=1|2|3`, numbers in `BPH`, script `bph*` in §14f, on the generic landmark component and the sphincter curse of §14e, `UroCrawl.injureSphincter()`;
  Reflux, the kidney serpent: plug its wall ports with a carried bulking needle to strand it, numbers in `REFLUX`, script `reflux*` in §14h, hooks `UroCrawl.reflux.*`);
  the Peds Wing, §14g: `?dungeon=peds` (or the case board once the first four bosses are beaten), par-timer medals and a sticker book,
  six drills (`TRIALS`, `?trial=valve|tide|aim|catheter|popoff|torsion`, the Sim Lab replays them), movement tech in `META.tech` (`TECH`, `?tech=`),
  the pediatric scope in `PEDS`, hooks `UroCrawl.peds.*`; weapon mods + aspects + Instrument Rep doors: `MODS` / `ASPECTS` tables, `?mods=`,
  `?aspects=`, `UroCrawl.giveMod()`; patron altars `PATRONS`, the reps cast `REPS`, antibiotic stewardship §6c and the
  Antibiotic Dropper weapon; enemy type reads from the family rim colour + face language in §7, slams go through `groundSlam`;
  between runs the Call Room, a walkable hub, §17b: PLAY lands there, QUICK START skips it, `?hub=1`, `?cme=N`, saved in
  `META.hub`, tables `HUB_PERKS` / `HUB_PINS` / `HUB_DECOR` / `HUB_CUPS` / `HUB_CASES` / `HUB_CME` / `HUB_LINES`, hooks `UroCrawl.hub.*`;
  the look, §17c: "Who are you?" and the mirror (`META.hero`: build, skin, hair), the scrub cabinet's wardrobe (`META.wardrobe`,
  tables `WARDROBE` / `WARDROBE_SETS` / `WARDROBE_DEEDS`, cosmetic only), the rig is `drawSurgeon`, `?hero=` / `?wear=`, hooks `UroCrawl.wardrobe.*`).
- `prototypes/` — prototypes + the Lab page (served on Pages for testers, noindex).
- `tools/` — headless-Chrome harnesses: `node tools/preop-please.drive.mjs`, `node tools/uro-rush.drive.mjs`
  (need the `urostudyhub` server; `CHROME=/path` picks the browser for the Rush one), `node prototypes/squadron3d_drive.mjs all` (needs `squadron3d-proto`).
  In-Service sprint: `node tools/ise-plan.test.mjs` (pure Node, scheduler) and `node tools/ise-plan.drive.mjs`
  (headless E2E; set `CDN_DIR` to a node_modules with react/react-dom 18.2.0, @babel/standalone 7.23.9, katex 0.16.9 when offline).
  Arcade card games (Snap Decision, Board Buzzer, Staging Attack, the retired-games refund) and the play counter / daily first-play bonus /
  Case Minimums (block E; `ONLY=E` runs just that block): `node tools/arcade-cards.drive.mjs` (same `CDN_DIR` trick). The pure bookkeeping
  behind those: `TZ=America/New_York node tools/arcade-play.test.mjs` (also try `TZ=UTC` and `TZ=Pacific/Auckland`; no browser).
  Uro Crawl: `node tools/uro-crawl.drive.mjs` (needs the `urostudyhub` server; no CDN: the game has no dependencies).
  In-app Anki reviewer (Anki page > Review tab): `node tools/anki-sched.test.mjs` (pure Node; run it under `TZ=America/Chicago`, `UTC`
  and `Pacific/Auckland`, the 4am study-day rollover is the part that bites) and `node tools/anki-study.drive.mjs` (headless E2E on a
  phone viewport; needs the `urostudyhub` server; same `CDN_DIR` trick; `SHOTS=dir` saves screenshots).
  AI Tutor's AI panel (provider / model / reasoning effort; every provider's API is stubbed in the page and the request
  body checked): `node tools/ai-pick.drive.mjs` (needs the `urostudyhub` server; same `CDN_DIR` trick; `SHOTS=dir`).

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
  Pages. **Standing instruction (Andrew, 2026-11-02): he doesn't run a local copy and tests only on the
  live Pages site, so when a change is finished, built and pushed, open the PR and merge it to `main`
  yourself** (merge commit, as before) without waiting to be asked each time. Don't merge unfinished
  or broken work. Side branches (`proto/*` and the like) stay local and unmerged.
- End a non-trivial session with a `STATUS.md` entry at the top (Done / Next steps / Open questions).
