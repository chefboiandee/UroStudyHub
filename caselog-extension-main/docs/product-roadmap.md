# CaseLog — Product Roadmap & Design Doc

## Master To-Do List
*Updated as items are completed. This is the single source of truth for what's done and what's left.*

### CWS Submission (Blocking)
- [x] Manifest cleaned for CWS (removed http wildcard, updated description)
- [x] General surgery specialty added (full CPT data, mapper, blue→green theme, scalpel icon)
- [x] Privacy policy created (GitHub Gist: https://gist.github.com/chefboiandee/2c5f6da14764257b53df6defd70341af)
- [x] README added to repo
- [x] Urology theme changed to yellow, gen surg to green
- [ ] **Icon** — need a design you like, then export at 16/48/128. Three prompts in `~/.claude/plans/wise-painting-dijkstra.md` Step 4
- [ ] **Store description** — ready in plan file Step 2, just needs pasting into CWS console
- [ ] **Screenshots** — 2-3 at 1280x800 with fake data (Dr. Anderson, VA Hospital)
- [ ] **Zip and submit** — zip excluding .git, upload to CWS, set as Unlisted

### Pre-Launch (Do Before Sharing Widely)
- [ ] **Obfuscate sidepanel.js** — protect IP before wider distribution. Use `javascript-obfuscator` (needs Node.js) or Python alternative
- [ ] **PHI warning banner** — show "Do not include patient names, MRNs, or DOBs in your dictation" when a cloud provider is selected. Hide when using local model.
- [ ] **Demo video** — raw screen recording, no voiceover/music. Strong Reddit post title does the hook.

### Monetization (Not Blocking CWS, Build Later)
- [ ] Decide on final paywall strategy (see Monetization section below)
- [ ] Set up payment processing (Stripe, Gumroad, or CWS payments — TBD)
- [ ] Implement free tier case counter (`chrome.storage.sync`)
- [ ] Implement reverse trial flow (5 premium cases → downgrade to free)
- [ ] Build free tier light-mode UI
- [ ] Progressive speed throttle for free tier
- [ ] Upgrade prompt UI

### Batch Logging (Paid Feature, Build Later)
- [ ] Queue storage in `chrome.storage.local`
- [ ] Queue UI (case cards, add/edit/delete/reorder)
- [ ] Rapid-fire mode (auto-fill next case after user submits)
- [ ] Submit detection (MutationObserver on ACGME page)
- [ ] Progress UI and pause/resume
- [ ] Bulk dictation splitting via LLM (v2)
- [ ] **Supervised auto-submit** — auto-fill + auto-submit sequentially, but user watches and can intervene (see "Supervised Auto-Submit" section below)

### Paid Tier Features (Build Later)
- [ ] Voice dictation (mic button) — paid only, free is type/paste only
- [ ] Medical autocorrect dictionary — paid only, free gets raw text
- [ ] Custom vocab ("Add to dictionary" for attending names, hospital jargon)
- [ ] CSV export of case history
- [ ] Stats dashboard (cases by CPT, by attending, monthly trends)
- [ ] Attending/hospital presets (saved defaults)
- [ ] Model choice within providers
- [ ] Dark mode (paid) / light mode (free) split
- [ ] Specialty color themes (paid only)
- [ ] Accent color customization
- [ ] Sound effects on parse/log
- [ ] Streak counter / gamification

### Beta Validation & Evidence Building
- [ ] **Collect testimonials** — ask beta testers before/after: how far behind were they, how long to catch up. Quotes like "I was 3 months behind and caught up in an afternoon" are the marketing engine for program directors.
- [ ] **QI project on case logging compliance** — measure pre vs. post-tool compliance rates. Needs program coordinator or PD to pull aggregate ACGME submission data for baseline. Likely IRB-exempt (educational QI, not human subjects). Publishable as abstract/poster at ACGME Annual Educational Conference or specialty national meetings. The data makes the testimonials credible, the testimonials make the data feel human.
- [ ] **Generate synthetic stress-test cases** — full suite across all three specialties with expected CPT codes, dates, roles, and correct ACGME Area/Type for each. Run through before wider beta release.

### Future / Back-Burner
- [ ] More specialties: ENT, OBGYN, ortho, NSG, CT surgery, plastics
- [ ] Local model support — decide tier placement (free power-user vs paid privacy feature vs enterprise)
- [ ] **Remote dictation (Apple Watch / iPhone → extension)** — hallway-to-queue pipeline, see "Remote Dictation" section below. Potentially the highest-impact feature for adoption.
- [ ] Smart defaults / learning (remember attending/hospital patterns)
- [ ] Multi-device sync
- [ ] iPhone app / PWA (may be superseded by remote dictation approach)
- [ ] Landing page / website (see "Website" section below — not needed until post-Reddit traction or program-level sales)
- [ ] Program-level bulk pricing
- [ ] Server-side case count validation

---

## Batch Logging — Design

### Overview
Let users dictate/type all their cases in one session, review them as a queue, then auto-fill each one into ACGME sequentially. User still clicks submit on every case — the extension never submits on its own.

### Why
- Residents batch their logging — nobody logs after every single case
- Current flow: dictate one case → review → log → repeat. Tedious for 5-10 cases
- This turns a 20-minute chore into quick reviews + clicks

## Monetization

### Free Tier
- Single-case dictation and logging (one at a time)
- **Lifetime cap of 5 free cases** (not monthly — prevents indefinite free-riding)
- After 5: extension prompts upgrade, still shows the UI but disables the "Log" button
- Case count tracked in `chrome.storage.sync` (tied to Google account, survives reinstalls)

### Paid Tier ($4.99/mo or $39.99/yr)
- Unlimited single-case logging
- **Multi-case dictation** — queue up multiple cases in one session
- **Rapid-fire mode** — sequential auto-fill: after user submits case N, extension auto-fills case N+1 immediately

### Tracking Free Case Count
- Increment counter in `chrome.storage.sync` each time user successfully fills a case into ACGME (on "Log" button click)
- `sync` storage is tied to the user's Google account — persists across reinstalls and devices
- Not tamper-proof (devtools can edit it) but target audience is residents, not hackers
- Can add server-side validation later if abuse becomes a real problem

### What the Paywall Looks Like
- After case 5, the parsed case still shows (so they see the value) but the "Log" button is disabled
- Upgrade prompt: "You've used all 5 free cases. Upgrade to keep logging."
- Link to payment page (Stripe, Gumroad, or CWS payments — TBD)

## User Flow

### 1. Build the Queue (Paid)
Two input methods:
- **Multiple dictations**: User clicks record, dictates case 1, stops. Clicks record again, dictates case 2, etc. Each gets parsed and added to the queue
- **Bulk paste/dictate**: User dumps all cases at once ("First case was a cysto with Dr. Smith... next case was a TURBT with Dr. Jones..."). LLM splits them into individual cases

The queue shows as a numbered list of parsed case cards (same format as today's single case view).

### 2. Review
- User scrolls through the queue, edits any case inline (same editing UI as today)
- Can delete, reorder, or re-dictate individual cases
- Each card shows: procedure, CPT codes, attending, role, approach — all the parsed fields
- "Clear Queue" button to start over

### 3. Rapid-Fire Logging (Paid)
- User navigates to ACGME case log page
- Clicks "Log All Cases" button in the side panel
- Extension fills the first case into the ACGME form
- **User reviews and clicks submit themselves** — extension never auto-submits
- After user submits, extension detects the form reset/reload and auto-fills the next case
- Repeat until queue is empty

```
For each case in queue:
  1. sidepanel.js sends case data to content.js
  2. content.js fills the ACGME form fields
  3. User reviews the filled form
  4. User clicks submit on the ACGME page
  5. content.js detects form submission/page reload (MutationObserver or URL change)
  6. content.js signals back to sidepanel.js: "submitted"
  7. sidepanel.js marks case as logged, sends next case
  8. If form reloads to fresh form: auto-fill next case
  9. If page navigates away: content.js navigates back to new case form, then fills
```

### 4. Progress UI
- Progress bar in side panel: "Case 3 of 8 — waiting for you to submit..."
- Each queue card gets a status indicator: pending → filling → waiting for submit → logged
- "Pause" button to stop mid-queue
- Summary at end: "7/8 cases logged. 1 skipped — click to review"

### 5. Supervised Auto-Submit (v2 of Rapid-Fire)
Rapid-fire mode (above) still requires the user to click submit on each case. Supervised auto-submit removes that last click — the extension fills AND submits each case automatically, one after another, while the user watches.

**Why "supervised":** The tool can still make mistakes (wrong CPT, wrong attending, wrong date). Users shouldn't let it run unattended on 50 cases. The design assumes the user is watching the ACGME form as each case gets filled and submitted, and can intervene at any point.

**Best for:** End-of-day logging of 2-5 cases that the user has already reviewed in the queue. Not intended for bulk backlog catchup without supervision.

**Intervention mechanics:**
- **Pause button** (always visible in side panel during auto-submit): instantly stops the sequence after the current case finishes. No half-submitted cases.
- **Countdown before each submit**: after auto-filling a case, show a 3-5 second countdown ("Submitting in 4... 3... 2...") with a prominent **"Hold / Edit"** button. Clicking it pauses the sequence and leaves the filled form on screen for manual editing. User fixes whatever's wrong, submits manually, then resumes auto-submit for remaining cases.
- **Skip button**: skip the current case without submitting (mark it for manual review later). Auto-submit continues with the next case.
- **Keyboard shortcut**: spacebar or Escape to pause instantly without needing to find the button.

**Progress UI during auto-submit:**
- Side panel shows: "Auto-submitting case 3 of 5... ⏸ Pause"
- Each queue card updates in real-time: ✓ submitted / ⏳ filling / ⏸ paused / ⏭ skipped
- After completion: summary with any skipped cases highlighted for manual review

**Safety rails:**
- Maximum queue size for auto-submit (e.g., 10 cases). Larger queues require manual rapid-fire mode.
- If ACGME returns an error or unexpected page state, auto-pause and alert the user.
- Never auto-submit if the form validation fails (missing required fields).

## Technical Details

### Queue Storage
- Store queue in `chrome.storage.local` under a `caseQueue` key
- Array of parsed case objects (same shape as current single-case data)
- Persists across side panel close/reopen so users don't lose their queue

### Case Count Storage (Free Tier Tracking)
- `chrome.storage.sync` key: `casesLogged` (integer)
- Increment on each successful "Log" button click (not on dictation — only when they actually fill ACGME)
- Check count before allowing "Log" action; if >= 5 and not paid, show upgrade prompt
- Sync storage limit is 8KB per key, plenty for a counter

### Message Passing (sidepanel.js ↔ content.js)
Already have this channel working for single-case logging. Extend it:

```
New messages:
  sidepanel → content:  { action: "fillCase", caseData: {...}, caseIndex: 3 }
  content → sidepanel:  { action: "caseFilled", caseIndex: 3 }
  content → sidepanel:  { action: "userSubmitted", caseIndex: 3 }
```

### Detecting User Submit
After filling a case, content.js watches for the user's submit action:
- **Option A**: MutationObserver on the ACGME page for success toast/banner
- **Option B**: Listen for form submit event or page navigation
- **Option C**: Watch for the form resetting to blank (fresh case form)
- **Recommended**: Combination of A + C — detect success confirmation, then wait for fresh form before filling next case

### Splitting Bulk Dictation (v2)
If user dumps multiple cases in one dictation, add a step to the LLM prompt:
- "Split this transcript into individual cases, then parse each one"
- Return an array of case objects instead of a single one
- Already using JSON responses, so this is a prompt change, not an architecture change

## UI Changes

### Side Panel
- New "Queue" tab or section below the current case view (paid only)
- Queue counter badge on the tab: "Queue (5)"
- "Log All Cases" button (prominent, appears when queue has 2+ cases)
- Individual "Add to Queue" button on each parsed case (alternative to immediate "Log" button)
- Free tier: case counter shown in footer: "3 of 5 free cases used"

### Queue View (Paid)
- Vertical list of compact case cards
- Each card: case number, procedure summary, CPT code, status icon
- Swipe/click to expand full details
- Drag handle for reorder (nice-to-have, not v1)

### Upgrade Prompt
- Appears when free user hits case 5
- Shows parsed case (so they see value) but "Log" button replaced with "Upgrade to Log"
- Clean, non-annoying — one banner, not a popup

## Edge Cases
- **ACGME session timeout**: If logged out mid-queue, pause and alert user to re-login
- **Duplicate detection**: Warn if two cases in the queue look identical
- **Page navigation**: If user navigates away from ACGME during rapid-fire, pause queue
- **Extension update**: Queue persists in storage, survives extension reload
- **Free tier tampering**: If `casesLogged` is deleted from sync storage, it resets to 0. Acceptable risk for v1 — server-side validation is the real fix

## Maybe Ideas (Not Sold On These)

### Blurred/Redacted Cards After Free Tier
After 5 free cases, parsing still runs but the UI blurs the output — procedure names become "••••••••", CPT codes show as "•••••", etc. Real data stays in storage, instantly revealed on upgrade. CSS `filter: blur(4px)` + placeholder text swap. Psychologically strong (sunk cost, "your data is waiting") but **feels slimy**. Not sure this is the right vibe for a tool built by a resident for residents.

### Open Question: Is Auto-Fill Even the Right Paywall?
The honest problem: **parsing is the real value, not auto-fill.** A price-sensitive resident will just read the parsed CPT codes and type them into ACGME manually — the auto-fill only saves ~30 seconds per case. If the free tier includes unlimited parsing, most users will never need to pay.

Alternative paywall strategies worth considering:
- **Limit total parses, not just logs** — 5 lifetime parses, period. Honest and simple. The parsing IS the product, so this gates the actual value.
- **Specialty lock** — free gets one specialty, paid unlocks the rest. Natural fit if expanding to ENT, OBGYN, ortho, etc. More specialties = more value = obvious upgrade path.
- **Batch is the real gate** — unlimited single-case free forever, but queuing multiple cases in one session is paid. The batch workflow is a genuinely different tier of convenience. Strongest argument: free tier is generous (unlimited single-case), so nobody feels nickeled-and-dimed, but the power feature costs money.
- **Speed throttle** — free parses have an artificial 10-15s delay, paid is instant. Annoying enough to convert, not annoying enough to uninstall.
- **CSV export / stats dashboard** — parsing and logging stay free, but exporting case history to CSV or viewing detailed stats (cases by CPT, by attending, monthly trends) is paid. Low effort to build, high perceived value for residents tracking milestones or prepping for semiannual reviews.
- **Custom templates / attending presets** — free users type attending name and hospital every time. Paid users save presets ("Dr. Smith, VA Hospital, PGY-3, first assist") and select from a dropdown. Small time save per case but adds up over hundreds of cases.
- **Multi-device sync** — free tier is local-only. Paid syncs case history and settings across devices via `chrome.storage.sync` or a simple cloud store. Useful for residents who log from home laptop AND hospital workstation.
- **API key included** — free users bring their own Gemini/Claude/OpenAI key. Paid tier includes API access (you eat the cost, bake it into the subscription). Removes the biggest onboarding friction — residents don't want to figure out API keys. This could be the single strongest conversion lever.
- **Smart defaults / learning** — paid tier remembers your patterns. "You've logged 12 cases with Dr. Smith as attending at VA Hospital — auto-fill those fields?" Free tier starts from scratch every time.

### Leading Candidate: API Key as the Paywall
The strongest paywall idea might be the simplest: **paid users don't need an API key.**

How it works:
- **Free tier (5 lifetime parses)**: Uses YOUR Gemini API key behind the scenes. Zero setup, zero friction. User installs, dictates, sees the magic immediately.
- **After 5 free parses, two paths**:
  - **Pay ($4.99/mo or $39.99/yr)**: Keep using the built-in API key. No setup, it just works. Unlocks batch queue, rapid-fire, CSV export, etc.
  - **Bring Your Own Key (free forever)**: User gets their own Gemini/Claude/OpenAI key and enters it in settings. Unlimited single-case parses, no batch features.
- **Why this works**: The #1 adoption killer is asking a surgical resident to go get an API key before they can even try the tool. This removes that entirely. And the cost is negligible — Gemini free tier covers ~500 req/day, and even on paid API pricing a parse costs fractions of a cent.
- **Cost math**: 20 paid users x 5 cases/day x 1,500 tokens = 150K tokens/day. On Gemini free tier this costs $0. On paid API it's ~$0.03/day. You'd need thousands of users before API costs matter.

No final decision yet, but this is the front-runner. Need to think about what else to bundle into paid to make it feel worth $5/mo beyond just "no API key."

### Progressive Speed Throttle (Free Tier)
Don't hard-lock free users — slow them down progressively:
- Cases 1-5: full speed (the hook, on your API key)
- Cases 6-15: 5 second artificial delay
- Cases 16-30: 10 second delay
- Cases 30+: 15-20 second delay
Never breaks, never locks out. Just gets more annoying. Paired with BYOK requirement after case 5, the free experience is: set up your own key (annoying) AND wait 15 seconds (annoying). Paying $5/mo removes both instantly.

### Voice Dictation & Autocorrect Gating
The voice workflow IS the product — dictating a case in 15 seconds is the magic. Typing it out isn't much faster than just filling the ACGME form manually. This makes dictation a strong paywall lever.

- **Free**: Text input only (type or paste). No mic button. No medical autocorrect. Raw text → LLM. Users *can* use OS-level dictation (macOS/Windows built-in) and paste, but without autocorrect they'll get "sister oscopy" instead of "cystoscopy" and worse parsing results.
- **Paid**: Mic button enabled. Full medical autocorrect dictionary runs on dictation. Custom vocab — "Add to dictionary" button lets users save corrections for attending names, hospital abbreviations, program-specific jargon that speech-to-text mangles. Autocorrected text → LLM = significantly better parsing accuracy.

Why this works: the workaround (OS dictation + paste) exists but is noticeably worse. The autocorrect dictionary is the quality gap that justifies paying.

### Model Choice Gating
- **Free**: Provider selection available (Gemini/Claude/OpenAI with BYOK) but locked to default model per provider
- **Paid**: Unlock specific model selection within each provider (e.g., pick Gemini Pro vs Flash, Claude Sonnet vs Haiku, GPT-4o vs 4o-mini). Better models = better parsing for complex cases.

### Customization & Aesthetics (Paid)
Free tier gets a functional but bare-bones light-mode UI. Paid tier is the polished dark experience with extras.

**Free tier look:**
- **Light mode only** — white/gray background, no dark theme. Functional but not cool. The current dark UI is the premium experience.
- **Basic card styling** — flat, minimal case cards. No shadows, no glows, no accent gradients. Just data.
- **No specialty theming** — locked to a neutral gray accent. No yellow/green/red specialty colors.
- **Plain header** — just says "CaseLog", no specialty icon, no custom branding.

**Paid tier upgrades:**
- **Dark mode** — the current sleek dark UI with glows, gradients, smooth transitions. This is the "real" version.
- **Specialty color themes** — yellow (urology), green (gen surg), red (vascular), future specialty colors
- **Accent color customization** — pick your own accent color beyond specialty defaults. Custom hex picker or preset palette.
- **Polished cards** — shadows, glow effects, hover states, the whole premium feel
- **Compact vs expanded card view** — toggle between detailed case cards and a minimal/compact view
- **Custom specialty nickname** — rename the header (e.g., "UroLog" → "Andy's Case Logger")
- **Sound effects** — subtle audio feedback on successful parse or log (satisfying chime). Toggle on/off.
- **Streak counter / gamification** — "You've logged 47 cases this month!" with milestones and personal bests. Residents are competitive — this plays into that.

## Realistic Market Outlook

### Year 1 Projections (No Marketing Budget)
- **Total addressable market**: ~25,000-30,000 surgical residents in ACGME programs
- **Reachable via Reddit + word of mouth**: 200-500 installs off a good post
- **Retention (active after 30 days)**: 30-40% → 60-200 active users
- **Conversion at 5-10%**: 5-15 paying users
- **Revenue**: $400-$600/year. Beer money, not rent money.

### Where the Real Money Is
Individual resident subscriptions won't scale without marketing. The higher-leverage play:
- **Program-level adoption**: Pitch to program directors/coordinators. "Your residents will actually log cases on time." One program buying 30 seats at a group discount is worth more than 30 organic conversions. Program coordinators feel the pain of incomplete case logs — they're your real customer.
- **The product's real value beyond revenue**: A shipped Chrome extension used by surgical residents across multiple programs is a killer resume/fellowship talking point. That career ROI may exceed the subscription revenue.

### Evidence-Based Selling (QI Project)
The strongest pitch to program directors isn't features — it's data. Run a QI project:
- **Baseline**: Get aggregate case logging compliance rates from your program coordinator (% of cases logged within X days of procedure, % of residents up to date at semiannual review)
- **Intervention**: Roll out CaseLog to the program
- **Post-intervention**: Measure the same metrics
- **IRB**: Likely exempt — this is educational quality improvement, not human subjects research. Quick check with your institution to confirm.
- **Output**: Publishable abstract/poster for ACGME Annual Educational Conference, specialty national meetings (AUA, SVS, ACS, etc.), or GME education journals
- **Pitch deck**: "Compliance went from 60% to 95% in one program" is worth more than any feature list
- **Testimonials feed the data, data feeds the testimonials**: Collect before/after quotes from beta testers ("I was 3 months behind and caught up in an afternoon"). Pair qualitative stories with quantitative compliance numbers for a complete narrative.

### Website — Not Yet, But Eventually
**Current status: not needed.** The CWS listing is the landing page for now. A website with zero visitors is just a thing to maintain.

**When it becomes worth building:**
- **Program-level sales** — emailing program directors needs a professional one-pager with a demo video, QI data, and testimonials. A CWS link doesn't cut it for that audience.
- **After Reddit traction** — if a post takes off, you need somewhere to send people beyond the Chrome store. Landing page with "Built by a PGY-X, for PGY-everyone," 30-second demo, and install button.
- **SEO long game** — once people search for it by name or by problem ("faster ACGME case logging"), a site lets you own that traffic.

**What it should be when the time comes:**
- Simple GitHub Pages one-pager (free, 20 minutes to set up)
- Demo video (screen recording, not animated)
- Testimonial quotes from beta testers
- QI compliance data if available
- Install button → CWS listing
- No blog, no docs site, no complexity. One page.

**Priority stack (do these first):**
1. Get beta testers using it ← current phase
2. Collect feedback, fix bugs
3. Screen record demo video
4. Reddit post
5. *Then* build the site if there's demand

### Competition / Moat — Honest Assessment
**How hard to clone?** Not very. Someone with Claude/ChatGPT could get a basic working version in a weekend. The core is just: Chrome side panel → send text to LLM → get JSON → fill form fields.

**What's actually defensible:**
1. **First mover** — most people who think "I could build that" won't actually do it
2. **You're the user** — you know the workflow pain intimately. A non-surgeon building this will miss edge cases
3. **ACGME form integration** — reverse-engineering a specific third-party site's DOM (Select2 dropdowns, jQuery bridge, form field mapping) is grunt work most people won't bother with. And if ACGME changes their form, you'll know first because you use it
4. **Obfuscation** — raises the effort from "copy-paste source" to "decode it first." Filters out 95% of lazy cloners

**What's NOT defensible:**
- CPT mapping data — an AI can reproduce similar mappings with CPT references
- Autocorrect dictionary — someone could build their own by testing voice dictation for a few weeks
- The two-phase architecture — it's a good design, but not a secret

**Bottom line:** The moat is thin. Speed, domain expertise, and actually shipping are your advantages. Obfuscate the JS, but don't lose sleep over clones — compete on iteration speed and user trust instead.

### HIPAA / Data Privacy Note
ACGME case logs contain **no PHI**. The fields are: procedure type, CPT code, attending name, hospital, resident role, approach, laterality. No patient names, MRNs, DOBs, or diagnosis details. Sending case dictation to Gemini/Claude/OpenAI is not a HIPAA issue.

**However**: if a resident dictates something like "did a cysto on the 45-year-old male in room 3," the LLM sees that text. It's not linkable to a specific patient (and gets stripped to structured fields), but the *perception* matters — especially for program-level sales. A program director hearing "your residents' data goes to Google" will flinch even if it's technically compliant.

Local model support solves the perception problem completely. See "Local Models" section below.

### Local Models — Future Consideration (Not Decided Yet)
Code for local LLM support (LM Studio, Ollama) already exists in sidepanel.js — only the `http://*/* ` manifest permission was removed for CWS submission. It's a one-line add-back.

**Pros of local models:**
- Zero API cost (user's hardware, user's model)
- Complete data privacy — nothing leaves the machine
- No internet required (offline logging)
- Strong selling point for program-level adoption: "patient data never leaves the hospital network"

**Where it fits in the tier split — undecided:**
- **Option A: Free tier power-user feature** — the people who'll set up Ollama are the same people who'd get a Gemini API key. Tech-savvy, cost-conscious, won't pay. Letting them use local models keeps them on your extension instead of building their own. Costs you nothing.
- **Option B: Paid premium feature** — position "offline mode" and "complete privacy" as premium. HIPAA-conscious programs would pay specifically for this. "CaseLog Pro supports local AI — case data never leaves the hospital network" is a program-director-level selling point.
- **Option C: Separate "Enterprise/Program" tier** — local model support bundled with program-level features (bulk licensing, admin dashboard, compliance reporting). Higher price point, different customer (program coordinator, not individual resident).

**Personal preference (developer):** Would like to use local models exclusively to avoid sending any job-related data to big AI companies, even though ACGME data isn't technically PHI. Need to think more about how this aligns with the monetization strategy.

Parking this for now. Revisit after CWS launch and initial user feedback.

### Remote Dictation — Hallway to Queue Pipeline
**The pitch:** Dictate a 10-second voice memo walking out of the OR while the case is fresh. By the time you sit down at a computer, it's already parsed and sitting in your queue ready to review and log. Zero friction, zero forgetting.

**Why this matters:** The #1 reason residents fall behind on case logging isn't laziness — it's that the moment between "I should log that" and "I'm at a computer with ACGME open" is where cases get lost. Three weeks later you're reconstructing from OR schedules. Remote dictation closes that gap entirely.

**Implementation tiers (simplest first):**

**Tier 1: Apple Shortcuts workflow (no app development)**
- User dictates on Apple Watch or iPhone → Siri transcribes on-device
- Shortcuts automation saves the transcribed text to a known location (Google Doc, iCloud file, or webhook)
- Extension polls for new entries on side panel open and auto-parses them into the queue
- Pros: works today, no app to build, Apple's on-device transcription is decent for short medical dictation
- Cons: requires user to set up the Shortcut (onboarding friction), dependent on Siri transcription quality

**Tier 2: Shared cloud folder (slightly more polished)**
- User records voice memo on watch/phone (native Voice Memos app or any recorder)
- Audio file auto-syncs to iCloud Drive / Google Drive / Dropbox shared folder
- Extension detects new audio files, sends to Whisper API or similar for transcription, then parses
- Pros: audio quality preserved (not dependent on Siri), works with any recording app
- Cons: needs audio transcription step (API cost, though Whisper is cheap), slight delay

**Tier 3: Companion iOS app (most seamless, most work)**
- Lightweight app with one big record button and Apple Watch complication
- Records, transcribes on-device, pushes text to a cloud endpoint
- Extension picks up parsed cases from the endpoint
- Pros: fully branded experience, push notifications ("3 cases ready to log"), watch complication = one tap to dictate
- Cons: iOS development, App Store review, maintenance burden, way more work

**Tier 4: PWA with push (cross-platform)**
- Progressive web app that works on any phone/watch browser
- Service worker handles background sync to extension
- Pros: cross-platform (Android residents exist), no app store
- Cons: PWA audio recording support is spotty, no watch complication

**Recommended path:** Start with Tier 1 (Shortcuts) as a proof of concept for beta testers. If people actually use it and love it, build Tier 3. Skip Tier 2 — it's an awkward middle ground. Tier 4 only matters if Android demand materializes.

**Cloud sync architecture (applies to all tiers):**
- Need a lightweight intermediary — cases dictated on phone need to get to the Chrome extension somehow
- Options: Firebase Realtime DB (free tier is plenty), simple REST endpoint on Cloudflare Workers (free), or even just polling a Google Sheet
- Auth: tie to the same account used for the paid subscription
- Extension polls on side panel open, or uses a service worker to poll periodically in the background

**Monetization angle:** This is a premium-tier-only feature. It's the kind of workflow upgrade that justifies a subscription on its own — "log cases from your watch" is a one-sentence sell that every resident immediately understands.

## Action Items Reference
All to-dos are tracked in the Master To-Do List at the top of this document.
