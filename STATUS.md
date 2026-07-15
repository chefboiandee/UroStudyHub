# Status — UroStudyHub

**Updated:** 2026-07-14
**Tool:** Claude Code (Fable 5)

## Done this session — lecture persistence (Andrew: iPad PWA lost a 2/3-done uploaded lecture)

Root cause: the in-progress tutor session (messages, phase, **uploaded chapter text**)
lived only in React state; saving was manual, and even a manual save dropped the
chapter doc. iPadOS kills suspended PWAs → cold relaunch → session gone.

Shipped in `UroStudyHub.html` (+ rebuilt `.min.html` via `build.py`):
- **IndexedDB store** (`uroStudyHubDB`/kv, ~40-line inline helper) — localStorage is
  ~5MB and already holds the progress blob; chapter docs + session checkpoints go to IDB.
- **Continuous autosave**: debounced (700ms) checkpoint of the live tutor session
  (msgs, side chat, phase, topic, chapter text, skills ctx) + an immediate flush on
  `visibilitychange→hidden` (the moment before iOS may kill the PWA). An emptied
  session (Clear) deletes the checkpoint.
- **Resume banner on relaunch**: "📖 Unfinished lecture: X — Phase n/9 · N messages ·
  📄 chapter attached" with ▶ Resume (full restore incl. the chapter, so quizzing
  stays grounded) / 💾 Save (archive to the Saved library) / ✕ Discard.
- **Saved sessions now keep the chapter**: `saveLectureSession` stores the doc in IDB
  (`doc_<id>`, `hasDoc` flag); library Resume reloads it (legacy saves unaffected);
  delete cleans the doc. Rows show "📄 chapter attached".
- **`navigator.storage.persist()`** requested on boot (reduces eviction risk).
- **Quota fallback** on the progress write: if `setItem` throws, re-save with lecture
  transcripts slimmed so XP/streak/topics-done never silently stop persisting.
- Fixed a latent bug: `resumeSavedSession` called an undefined `toast()` →
  uncaught ReferenceError on every library resume; now uses `setSaveFeedback`.

## Verified (Preview browser on the BUILT min.html, :2036)
Upload (.txt via real file input) → IDB checkpoint carries topic/msgs/chapter →
cold reload → banner renders correct metadata → Resume restores everything
(📇 Anki Cards btn = upText proof) → manual 💾 Save writes `doc_<id>` + `hasDoc` →
library row shows chapter chip → library Resume restores doc + re-checkpoints →
Clear deletes checkpoint → delete removes doc from IDB. Zero console errors
(only the pre-existing Babel >500KB notes). Test residue wiped.

## Next steps
- Andrew: on the iPad, force-quit and relaunch the PWA once so the network-first
  service worker pulls the new build, then it's live.
- Carry-forward (2026-07-09): local backup branches `tutor-sidekick-backup` /
  `tutor-sidekick-premutback` — delete once happy; premium re-adds by cherry-picking
  `5c2e1a4`. Untracked residue: `STONE_SQUADRON.md`, `URO_FPS.md`, README.docx.

## Open questions
- None.
