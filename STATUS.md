# Status — UroStudyHub

**Updated:** 2026-07-14 (late evening — shipped)
**Tool:** Claude Code (Fable 5)

## Done this session — lecture persistence (SHIPPED: commit `ca6960e` on origin/main, live on Pages)

Andrew's report: iPad PWA lost a 2/3-done uploaded lecture. Root cause: the
in-progress tutor session (messages, phase, **uploaded chapter text**) lived only
in React state; saving was manual, and even a manual save dropped the chapter doc.
iPadOS kills suspended PWAs → cold relaunch → session gone.

Shipped in `UroStudyHub.html` (+ rebuilt `.min.html` via `build.py`):
- **IndexedDB store** (`uroStudyHubDB`/kv inline helper) — chapter docs + session
  checkpoints go to IDB (localStorage is ~5MB and already holds the progress blob).
- **Continuous autosave**: debounced (700ms) checkpoint of the live tutor session
  (msgs, side chat, phase, topic, chapter text, skills ctx) + immediate flush on
  `visibilitychange→hidden`. An emptied session (Clear) deletes the checkpoint.
- **Resume banner on relaunch**: "📖 Unfinished lecture: X — Phase n/9 · N messages ·
  📄 chapter attached" → ▶ Resume (full restore incl. chapter, quizzing stays
  grounded) / 💾 Save (archive to Saved library) / ✕ Discard.
- **Saved sessions keep the chapter**: doc stored in IDB (`doc_<id>`, `hasDoc`);
  library Resume reloads it; delete cleans it; rows show "📄 chapter attached".
- **`navigator.storage.persist()`** on boot; **quota fallback** on the progress
  write (transcripts slim before XP/streak/credit ever stops persisting).
- Fixed latent bug: `resumeSavedSession` called undefined `toast()` (ReferenceError
  on every library resume) → `setSaveFeedback`.

## Verified
Full loop on the BUILT min.html in the preview browser (:2036): upload → IDB
checkpoint → cold reload → banner → Resume restores everything (Anki-Cards btn =
upText proof) → manual Save writes `doc_<id>` → library resume/delete round-trips →
Clear deletes checkpoint. Zero console errors (only pre-existing Babel notes).
**Deployed:** merged to main, pushed (`ca6960e`), live build on
chefboiandee.github.io/UroStudyHub re-fetched and confirmed carrying the new code.

## Next steps
- Andrew: force-quit + relaunch the iPad PWA once so the network-first service
  worker pulls the new build; then interrupted lectures survive and offer Resume.
- Carry-forward (2026-07-09): local backup branches `tutor-sidekick-backup` /
  `tutor-sidekick-premutback` — delete once happy; premium re-adds by cherry-picking
  `5c2e1a4`. Untracked residue: `STONE_SQUADRON.md`, `URO_FPS.md`, README.docx
  (Andrew to decide if they belong in the repo).

## Open questions
- None.
