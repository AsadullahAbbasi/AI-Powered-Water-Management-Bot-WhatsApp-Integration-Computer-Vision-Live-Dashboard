# ✅ Deployment Checklist

Quick checklist to deploy your WhatsApp bot to Render with auth session.

## Pre-Deployment Checklist

- [ ] Bot is working locally (connected to WhatsApp)
- [ ] `baileys_auth` folder exists and has files (924 JSON files)
- [ ] `.env` file has your `GEMINI_API_KEY` (don't commit this file!)
- [ ] Code is tested and working

## Git Setup (First Time)

- [ ] Initialize git: `git init`
- [ ] Add all files: `git add .`
- [ ] Commit: `git commit -m "Initial commit with auth session"`
- [ ] Create GitHub repository (make it **PRIVATE** for security)
- [ ] Add remote: `git remote add origin YOUR_GITHUB_REPO_URL`
- [ ] Push: `git push -u origin main`

**Important**: Make sure `baileys_auth` folder is committed (it contains your WhatsApp session)

## Render Setup

- [ ] Sign up/login to [render.com](https://render.com)
- [ ] Click "New +" → "Web Service"
- [ ] Connect GitHub repository
- [ ] Configure service:
  - Name: `d5-pani-bot`
  - Environment: `Node`
  - Build Command: `npm install`
  - Start Command: `npm start`
  - Plan: Free (or Paid for 24/7 uptime)
- [ ] Add Environment Variables:
  - `GEMINI_API_KEY` = your key
  - `PORT` = `10000`
  - `NODE_ENV` = `production`
- [ ] Click "Create Web Service"

## Verify Deployment

- [ ] Wait for build to complete (~2-5 minutes)
- [ ] Check logs for: `✅ WhatsApp Connected → D5 Bot LIVE`
- [ ] Visit your Render URL (e.g., `https://d5-pani-bot.onrender.com`)
- [ ] Test dashboard at: `https://your-app.onrender.com/`
- [ ] Send test image from whitelisted number

## Troubleshooting

- [ ] If QR code needed: Visit `https://your-app.onrender.com/qr`
- [ ] If "Reconnecting" loop: Check auth session in logs
- [ ] If images not processing: Check whitelist numbers in code
- [ ] If bot sleeping: Free tier sleeps after 15 min - wait ~30s for wake

## Post-Deployment

- [ ] Save your Render URL
- [ ] Bookmark the dashboard
- [ ] Test sending images
- [ ] Monitor logs for first few hours

---

**🎉 Done! Your bot is now live on Render!**

