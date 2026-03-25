# UroStudy Hub — Setup Guide

No programming experience needed. Follow the steps for your computer (Mac or Windows).

---

## Step 1: Download the App

1. Go to **https://github.com/chefboiandee/UroStudyHub**
2. Click the green **Code** button
3. Click **Download ZIP**
4. Find the downloaded file (usually in your Downloads folder) and **double-click to unzip** it
5. You should now have a folder called `UroStudyHub-main`

---

## Step 2: Start the App

### Mac

1. Open **Terminal**
   - Press `Cmd + Space` to open Spotlight
   - Type **Terminal** and press Enter
2. Copy and paste this entire command, then press Enter:
   ```
   cd ~/Downloads/UroStudyHub-main && python3 -m http.server 2023
   ```
3. You should see: `Serving HTTP on :: port 2023 ...`
4. Open **Safari** or **Chrome** and go to: **http://localhost:2023/UroStudyHub.html**

### Windows

1. Open **Command Prompt**
   - Press the Windows key
   - Type **cmd** and press Enter
2. Copy and paste this entire command, then press Enter:
   ```
   cd %USERPROFILE%\Downloads\UroStudyHub-main && python3 -m http.server 2023
   ```
   - If that doesn't work, try replacing `python3` with `python`:
   ```
   cd %USERPROFILE%\Downloads\UroStudyHub-main && python -m http.server 2023
   ```
3. **Don't have Python?** Download it free from **python.org/downloads** — click the big yellow "Download" button, run the installer, and **check the box that says "Add Python to PATH"** during install. Then restart Command Prompt and try again.
4. You should see: `Serving HTTP on :: port 2023 ...`
5. Open **Chrome** or **Edge** and go to: **http://localhost:2023/UroStudyHub.html**

---

## Step 3: Use It on Your Phone (Best Experience)

The app is designed for phones. To use it on your phone while the server runs on your computer:

1. Make sure your **phone and computer are on the same Wi-Fi network**
2. Find your computer's IP address:
   - **Mac:** System Settings → Wi-Fi → click your network name → look for "IP Address" (looks like `192.168.x.x`)
   - **Windows:** Open Command Prompt → type `ipconfig` → look for "IPv4 Address" under your Wi-Fi adapter (looks like `192.168.x.x`)
3. On your phone's browser, go to: `http://YOUR_IP:2023/UroStudyHub.html`
   - Example: `http://192.168.1.42:2023/UroStudyHub.html`
4. **Add to Home Screen** for the best experience:
   - **iPhone:** Tap the Share button (square with arrow) → "Add to Home Screen"
   - **Android:** Tap the three-dot menu → "Add to Home Screen"

---

## Step 4: Set Up AI Features (Free)

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

**"python3 is not recognized" (Windows)**
→ Install Python from python.org/downloads. Make sure to check "Add Python to PATH" during install. Restart Command Prompt after installing.

**Page won't load / "connection refused"**
→ Make sure Terminal/Command Prompt is still running with the server. Don't close that window while using the app.

**Phone can't connect**
→ Make sure phone and computer are on the same Wi-Fi. Some public/campus networks block this — try a personal hotspot instead.

**AI says "No API key configured"**
→ Go to Settings (gear icon) → make sure Gemini is selected and your key is pasted in → tap "Connect to Gemini"

## Stopping the Server

Go back to Terminal / Command Prompt and press `Ctrl+C` to stop the server when you're done.
