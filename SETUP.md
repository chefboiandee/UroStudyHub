# UroStudy Hub — Quick Start Guide

## Option 1: Just Run It (Easiest)

1. **Download the app file:**
   - Go to https://github.com/chefboiandee/UroStudyHub
   - Click the green **Code** button → **Download ZIP**
   - Unzip the folder

2. **Open Terminal** (search "Terminal" in Spotlight)

3. **Start the server** — paste this command:
   ```
   cd ~/Downloads/UroStudyHub-main && python3 -m http.server 2023
   ```

4. **Open in your browser:**
   - Go to http://localhost:2023/UroStudyHub.html
   - Works best on your phone's browser too — just use your computer's local IP instead of "localhost" (find it in System Settings → Wi-Fi → your network → IP address)

5. **That's it.** The app runs entirely in your browser. All your data saves locally.

## Option 2: Clone with Git (If You Have Git)

```bash
git clone git@github.com:chefboiandee/UroStudyHub.git
cd UroStudyHub
python3 -m http.server 2023
```
Then open http://localhost:2023/UroStudyHub.html

## Testing on Your Phone

1. Make sure your phone and computer are on the same Wi-Fi network
2. Find your computer's IP address:
   - Mac: System Settings → Wi-Fi → click your network → IP Address (looks like 192.168.x.x)
3. On your phone's browser, go to: `http://YOUR_IP:2023/UroStudyHub.html`
4. Tip: Add to Home Screen for the full app experience (it's a PWA)

## What to Test

When testing, focus on:
- **Games** — are they fun? Too easy/hard? Any bugs? Do the controls feel right on mobile?
- **Study flow** — does the daily workflow make sense? Is anything confusing?
- **General feel** — anything annoying, slow, or broken?

Take notes as you go and share feedback!

## Stopping the Server

Press `Ctrl+C` in Terminal to stop the server when you're done.
