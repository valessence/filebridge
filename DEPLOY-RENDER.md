# Deploy FileBridge on Render

## Ready-to-deploy repo (use this one)

**https://github.com/valessence/filebridge** (public)

All code and `render.yaml` are already on GitHub. You only need to connect Render once.

---

## Steps (2 minutes)

1. Go to [dashboard.render.com](https://dashboard.render.com)
2. Delete any old failed **filebridge** Blueprint or service (Settings → Delete)
3. Click **New +** → **Blueprint**
4. Connect GitHub account **valessence** (not Phatheryne)
5. Select repo: **valessence/filebridge**
6. Branch: **main**
7. Blueprint Path: `render.yaml` (default)
8. Click **Apply** / **Deploy Blueprint**
9. Wait 5–10 minutes

Your live URL: `https://filebridge.onrender.com` (or similar)

---

## Why the old setup failed

- Your code was on **Phatheryne/filebridge** (private, different GitHub account)
- Render was likely connected to a **different** GitHub account and could not sync

The new **valessence/filebridge** repo is public and matches the fixed `render.yaml`.

---

## Share with users

On the same Wi‑Fi, open your Render URL and use a shared room code.

Example invite link: `https://filebridge-xxxx.onrender.com?room=livingroom`
