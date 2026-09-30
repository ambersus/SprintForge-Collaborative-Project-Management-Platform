# SprintForge — Free-Tier Deployment Guide

> **Cost: ₹0 | No credit card required | No trial expiration**

This guide deploys SprintForge using **Vercel** (frontend), **Render** (backend), and **Neon** (database) — all permanently free tiers that do not require a credit card.

---

## Architecture

```
┌─────────────────┐      HTTPS      ┌──────────────────┐      TCP/SSL      ┌──────────────┐
│   Vercel (CDN)  │ ──────────────▶ │  Render (Python)  │ ──────────────▶  │  Neon (PgSQL) │
│   Next.js 14    │   API requests  │  Django + DRF     │   queries        │  Free 0.5 GB  │
│   Static + SSR  │                 │  Gunicorn + WN    │                  │  Auto-sleep   │
└─────────────────┘                 └──────────────────┘                  └──────────────┘
```

| Service | Free Tier Limits | Credit Card |
|---------|-----------------|:-----------:|
| **Vercel** Hobby | 100 GB bandwidth, unlimited static | ❌ No |
| **Render** Free | 750 hrs/mo, 512 MB RAM, sleeps after 15 min | ❌ No |
| **Neon** Free | 0.5 GB storage, 100 CU-hrs/mo, auto-sleep | ❌ No |

> **Note:** Render's free tier spins down after 15 minutes of inactivity. The first request after sleeping takes ~30-60 seconds. This is expected.

---

## Step 1 — Create Accounts

| # | Account | URL | Sign up with |
|---|---------|-----|-------------|
| 1 | **GitHub** | https://github.com | Email |
| 2 | **Neon** | https://neon.tech | GitHub OAuth |
| 3 | **Render** | https://render.com | GitHub OAuth |
| 4 | **Vercel** | https://vercel.com | GitHub OAuth |

All four are free and do not require payment information.

---

## Step 2 — Create Neon Database

1. Log into [console.neon.tech](https://console.neon.tech)
2. Click **"New Project"**
3. **Project name:** `sprintforge`
4. **Region:** Choose the one closest to you
5. Click **"Create Project"**
6. On the connection details page, copy the **connection string**:
   ```
   postgresql://neondb_owner:xxxx@ep-cool-name-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
7. **Save this string** — you'll need it in Step 4.

---

## Step 3 — Push Code to GitHub

If you haven't already:

```bash
cd sprintforge
git init
git add -A
git commit -m "Prepare for deployment"
git remote add origin https://github.com/YOUR_USERNAME/sprintforge.git
git branch -M main
git push -u origin main
```

---

## Step 4 — Deploy Backend on Render

1. Go to [dashboard.render.com](https://dashboard.render.com)
2. Click **"New +"** → **"Web Service"**
3. Select **"Build and deploy from a Git repository"** → Connect your GitHub
4. Select the `sprintforge` repository

### Configure the service:

| Setting | Value |
|---------|-------|
| **Name** | `sprintforge-api` |
| **Region** | Oregon (US West) or closest |
| **Root Directory** | `backend` |
| **Runtime** | Python 3 |
| **Build Command** | `./build.sh` |
| **Start Command** | `gunicorn config.wsgi:application --bind 0.0.0.0:$PORT` |
| **Instance Type** | **Free** |

### Environment Variables:

Click **"Add Environment Variable"** for each:

| Key | Value |
|-----|-------|
| `DJANGO_SECRET_KEY` | Generate one: `python -c "import secrets; print(secrets.token_urlsafe(50))"` |
| `DJANGO_DEBUG` | `false` |
| `DJANGO_ALLOWED_HOSTS` | `sprintforge-api.onrender.com` |
| `DATABASE_URL` | *(paste your Neon connection string from Step 2)* |
| `CORS_ALLOWED_ORIGINS` | `https://sprintforge.vercel.app` *(update after Vercel gives you the real URL)* |
| `CSRF_TRUSTED_ORIGINS` | `https://sprintforge.vercel.app` *(same as above)* |
| `CHANNEL_BACKEND` | `memory` |
| `PYTHON_VERSION` | `3.12.2` |

5. Click **"Create Web Service"**
6. Wait for the build to complete (first build takes ~5 minutes)
7. Your backend URL will be: `https://sprintforge-api.onrender.com`
8. Test it: visit `https://sprintforge-api.onrender.com/health/` — you should see `{"status": "ok"}`

---

## Step 5 — Deploy Frontend on Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click **"Import Git Repository"** → select your `sprintforge` repo
3. Configure:

| Setting | Value |
|---------|-------|
| **Framework Preset** | Next.js (auto-detected) |
| **Root Directory** | `frontend` |
| **Build Command** | `npm run build` |
| **Output Directory** | *(leave default)* |

4. Expand **"Environment Variables"** and add:

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_API_URL` | `https://sprintforge-api.onrender.com/api` |

5. Click **"Deploy"**
6. Wait for the build (~2 minutes)
7. Vercel will give you a URL like `https://sprintforge-xxxxx.vercel.app`

---

## Step 6 — Update CORS on Render

After Vercel gives you your actual domain:

1. Go to Render → your `sprintforge-api` service → **Environment**
2. Update these two variables with your real Vercel URL:
   - `CORS_ALLOWED_ORIGINS` → `https://sprintforge-xxxxx.vercel.app`
   - `CSRF_TRUSTED_ORIGINS` → `https://sprintforge-xxxxx.vercel.app`
3. Click **"Save Changes"** — Render will automatically redeploy

---

## Step 7 — Test the Deployment

1. **Open** your Vercel URL in a browser
2. **Register** a new account (the old SQLite data doesn't carry over)
3. **Log in** with your new account
4. **Create a project** → you should see the Kanban board
5. **Create tasks**, drag them between columns
6. **Test comments** and member features

### Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| "Loading..." for 30-60 seconds | Render free tier waking up | Normal — wait for it |
| API errors / CORS errors | Wrong CORS origin | Update `CORS_ALLOWED_ORIGINS` on Render |
| "Network error" | Backend sleeping | Refresh the page after 30 seconds |
| Login fails | Account doesn't exist | Register a new account (DB is fresh) |

---

## Maintenance

### Redeployment
- **Frontend:** Push to `main` on GitHub → Vercel auto-deploys
- **Backend:** Push to `main` on GitHub → Render auto-deploys

### Database
- Monitor usage at [console.neon.tech](https://console.neon.tech)
- Free tier: 0.5 GB storage, 100 compute-hours/month
- For a student project this is more than sufficient

### Keeping the Backend Awake
If you want to reduce cold starts, you can use a free cron service like [cron-job.org](https://cron-job.org) to ping `https://sprintforge-api.onrender.com/health/` every 14 minutes. This keeps Render from sleeping.

---

## Cost Summary

| Service | Monthly Cost | Credit Card |
|---------|:-----------:|:-----------:|
| Vercel Hobby | **₹0** | ❌ |
| Render Free | **₹0** | ❌ |
| Neon Free | **₹0** | ❌ |
| GitHub Free | **₹0** | ❌ |
| **Total** | **₹0** | **❌ None** |
