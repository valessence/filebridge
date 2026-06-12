# Deploy FileBridge on Render (Free — No Oracle Needed)

**Cost:** $0/month on the free plan  
**Trade-off:** The site may take ~30 seconds to wake up if nobody has used it for a while. Upgrade to Render Starter ($7/mo) to keep it always awake.

You need:
- A free [GitHub](https://github.com) account
- A free [Render](https://render.com) account
- About 30 minutes

No server setup, no SSH, no DuckDNS required — Render gives you `https://filebridge-xxxx.onrender.com` automatically.

---

## Part 1 — Put your code on GitHub

### Easy way: GitHub Desktop (recommended if you're not a developer)

1. Download [GitHub Desktop](https://desktop.github.com/) and install it
2. Sign in with your GitHub account (create one at github.com if needed)
3. In GitHub Desktop: **File → Add local repository**
4. Choose this folder: the `app` folder that contains `package.json`
5. Click **Publish repository**
   - Name it `filebridge` (or anything)
   - Uncheck "Keep this code private" if you want free Render deploys without limits — or keep private, both work
6. Click **Publish repository**

### Alternative: GitHub website upload

1. Go to github.com → **New repository** → name it `filebridge` → **Create**
2. Click **uploading an existing file**
3. Drag all files from your `app` folder into the browser
4. Click **Commit changes**

---

## Part 2 — Deploy on Render

1. Go to [render.com](https://render.com) and sign up (GitHub login is easiest)
2. Click **New +** → **Blueprint**
3. Connect your GitHub account if asked
4. Select your `filebridge` repository
5. Render detects `render.yaml` automatically — click **Apply**
6. Wait 5–10 minutes for the first build

When it's done, you'll see a URL like:

```
https://filebridge-xxxx.onrender.com
```

Open it — that's your live app.

---

## Part 3 — Share with users

Send people your Render URL. On the **same Wi‑Fi**:

1. Open the link in a browser (no install)
2. Enter the same room code
3. Select the other device → send files

Room invite link example:

```
https://filebridge-xxxx.onrender.com?room=livingroom
```

---

## Upgrading to always-on ($7/month)

If the 30-second wake-up delay bothers you:

1. Render dashboard → your **filebridge** service
2. **Settings** → **Instance type** → **Starter** ($7/mo)
3. Save

---

## Updating the app later

1. Change files on your PC
2. In GitHub Desktop: write a summary → **Commit** → **Push**
3. Render rebuilds automatically in a few minutes

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Build failed | Render dashboard → **Logs** tab — copy the error and check Node version |
| "Signaling unavailable" | Service may still be starting — wait 2 min and refresh |
| Slow first load | Free plan sleeps when idle — normal; upgrade to Starter to fix |
| 404 on refresh | Should not happen — if it does, check Render logs |

---

## Other cheap options (if Render doesn't work)

| Service | Cost | Difficulty |
|---------|------|------------|
| **Render Starter** | $7/mo | Easiest, always on |
| **Hetzner VPS** | ~$4/mo | Harder (SSH, like Oracle) — use `DEPLOY-ORACLE.md` steps on a Hetzner server |
| **Railway** | ~$5/mo | Similar to Render |