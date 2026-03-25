# UroStudy Hub — Setup Guide

No programming experience needed. Just open the link below.

---

## Step 1: Open the App

Go to **https://chefboiandee.github.io/UroStudyHub/** in your browser. That's it — no downloads, no installation.

---

## Step 2: Use It on Your Phone (Best Experience)

The app is designed for phones:

1. Open **https://chefboiandee.github.io/UroStudyHub/** on your phone's browser
2. **Add to Home Screen** for the best experience:
   - **iPhone:** Tap the Share button (square with arrow) → "Add to Home Screen"
   - **Android:** Tap the three-dot menu → "Add to Home Screen"
3. Open it from your home screen — it runs like a native app

---

## Step 3: Set Up AI Features (Free)

The app uses AI to power the tutor, generate flashcards, and build study plans. You need a free API key from Google.

### Get a Gemini API Key (takes 2 minutes)

1. Go to **aistudio.google.com** in your browser
2. Sign in with your **Google account**
3. Click **"Get API Key"** in the left sidebar
4. Click **"Create API key"**
5. If it asks you to select a project, just pick any one (or click "Create project" — it's free)
6. You'll see a long key that starts with `AIza...` — **copy it**

### Connect It to the App

1. In UroStudy Hub, tap the **gear icon** (top-right corner)
2. Select the **Gemini** tab (blue icon)
3. Paste your API key in the key field
4. Leave the model as **Gemini 2.5 Flash** (recommended — fast and free)
5. Tap **"Connect to Gemini"**
6. You should see a green "Connected" status

### About the Free Tier

- **No credit card needed.** The free tier gives you 1,500 requests per day — way more than enough for studying
- If Google ever asks about billing, just stay on the free tier
- You will not be charged anything

---

## What AI Does in the App

- **AI Tutor** — upload a lecture PDF or notes → get a structured teaching session that walks you through the material like an attending would
- **Anki Cards** — auto-generates flashcards from anything you upload
- **Study Plans** — upload your syllabus → get a personalized day-by-day study schedule

---

## What to Test

When testing, focus on:
- **Games** — are they fun? Too easy/hard? Any bugs? Do the controls feel right on mobile?
- **Study flow** — does the daily workflow make sense? Is anything confusing?
- **AI Tutor** — upload a lecture and try the teaching mode. Does it teach well?
- **General feel** — anything annoying, slow, or broken?

Take notes as you go and share feedback with Andrew!

---

## Troubleshooting

**AI says "No API key configured"**
→ Go to Settings (gear icon) → make sure Gemini is selected and your key is pasted in → tap "Connect to Gemini"

**App won't load on GitHub Pages**
→ Try a hard refresh (Ctrl+Shift+R or Cmd+Shift+R). If still broken, try a different browser.

---

## Run Locally (Optional)

If you want to run the app offline or for development, you can serve it from your computer:

### Download

1. Go to **https://github.com/chefboiandee/UroStudyHub**
2. Click the green **Code** button → **Download ZIP**
3. Unzip the downloaded file

### Mac

1. Open **Terminal** (Cmd+Space → type "Terminal" → Enter)
2. Run:
   ```
   cd ~/Downloads/UroStudyHub-main && python3 -m http.server 2023
   ```
3. Open **http://localhost:2023/UroStudyHub.html**

### Windows

1. Open **Command Prompt** (Windows key → type "cmd" → Enter)
2. Run:
   ```
   cd %USERPROFILE%\Downloads\UroStudyHub-main && python3 -m http.server 2023
   ```
   If that doesn't work, try `python` instead of `python3`.
3. **Don't have Python?** Download it free from **python.org/downloads** — check "Add Python to PATH" during install.
4. Open **http://localhost:2023/UroStudyHub.html**

### Phone Access (Local Server)

1. Make sure phone and computer are on the same Wi-Fi
2. Find your computer's IP:
   - **Mac:** System Settings → Wi-Fi → click network → "IP Address"
   - **Windows:** Command Prompt → `ipconfig` → "IPv4 Address"
3. On your phone: `http://YOUR_IP:2023/UroStudyHub.html`

### Stopping the Server

Press `Ctrl+C` in Terminal / Command Prompt.
