# SurgiLog

Dictate surgical cases, auto-parse CPT codes, and fill ACGME case logs in seconds.

*Built by a PGY-X, for PGY-everyone.*

## What It Does

SurgiLog is a Chrome extension that turns voice dictations (or pasted text) into structured ACGME case log entries. It parses procedure names, CPT codes, attending, hospital, role, approach, and laterality — then one-clicks it into the ACGME form.

No more typing at midnight after a 14-hour shift.

## Specialties

- **Urology** — 200+ CPT codes
- **General Surgery** — 250+ CPT codes (gallbladder, appendix, hernia, colon, breast, thyroid, pancreas, trauma, and more)
- **Vascular Surgery** — 70+ CPT codes

## How It Works

1. **Dictate or paste** a case description into the side panel
2. SurgiLog sends it to an AI provider (Gemini, Claude, or OpenAI) which classifies the procedure category and modifiers
3. A deterministic mapper converts that classification into the correct CPT code(s) — no hallucinated codes
4. **Review** the parsed case, edit if needed
5. **One click** fills the ACGME case log form on apps.acgme.org

The two-phase approach (AI classification + deterministic CPT mapping) ensures accurate codes every time.

## Features

- Voice dictation with medical autocorrect
- Two-phase CPT mapping (AI classifies, JS maps deterministically)
- One-click ACGME form auto-fill
- Multi-case batch processing
- Inline case editing
- CSV export for case tracking
- Weekly/monthly case count dashboard
- Offline transcript queueing
- Works with Gemini (free), Claude, or OpenAI

## Installation

### From Chrome Web Store (Unlisted)
Contact the developer for the install link.

### From Source
1. Clone this repo
2. Open `chrome://extensions/` and enable Developer Mode
3. Click "Load unpacked" and select the extension folder
4. Click the SurgiLog icon to open the side panel
5. Go to Settings, pick your specialty, and enter an API key (Gemini is free)

## Files

| File | Purpose |
|------|---------|
| `sidepanel.js` | All main logic — UI, LLM calls, CPT mapping, case management |
| `sidepanel.html` | Side panel layout and CSS |
| `content.js` | ACGME page auto-filler (injects into apps.acgme.org) |
| `page-bridge.js` | jQuery/Select2 bridge for ACGME dropdown fields |
| `background.js` | Service worker — opens side panel on icon click |
| `manifest.json` | Extension manifest (Manifest V3) |

## Privacy

SurgiLog collects no user data. Everything stays in your browser. Case text is only sent to the AI provider you choose. No analytics, no tracking, no telemetry.

Full privacy policy: [PRIVACY_POLICY.md](https://gist.github.com/chefboiandee/2c5f6da14764257b53df6defd70341af)

## License

All rights reserved.
