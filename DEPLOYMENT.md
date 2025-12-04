# 🚀 Deployment Guide - D5 Pani Bot

This guide will help you deploy the WhatsApp bot to Render with the authentication session included.

## 📋 Prerequisites

1. **GitHub Account** - Your code needs to be in a GitHub repository
2. **Render Account** - Sign up at [render.com](https://render.com) (free tier available)
3. **Google Gemini API Key** - Get it from [Google AI Studio](https://makersuite.google.com/app/apikey)

## 🔐 Important: Auth Session Deployment

The `baileys_auth` folder contains your WhatsApp authentication session. **This folder is included in git** (not in `.gitignore`), so it will be deployed with your code. This means:

✅ **You won't need to scan QR code again after deployment**  
✅ **Your bot will remain authenticated**  
⚠️ **Keep your repository private for security**

## 📦 Deployment Steps

### Step 1: Push Code to GitHub

```bash
# Initialize git if not already done
git init

# Add all files (including baileys_auth folder)
git add .

# Commit
git commit -m "Initial commit with auth session"

# Add your GitHub remote
git remote add origin https://github.com/yourusername/your-repo-name.git

# Push to GitHub
git branch -M main
git push -u origin main
```

### Step 2: Deploy on Render

1. **Go to Render Dashboard**
   - Visit [dashboard.render.com](https://dashboard.render.com)
   - Click "New +" → "Web Service"

2. **Connect GitHub Repository**
   - Select "Build and deploy from a Git repository"
   - Connect your GitHub account if not already connected
   - Select your repository

3. **Configure Service**
   - **Name**: `d5-pani-bot` (or your preferred name)
   - **Region**: Choose closest to you
   - **Branch**: `main`
   - **Root Directory**: Leave empty (or `AI-Powered-Water-Management-Bot-WhatsApp-Integration-Computer-Vision-Live-Dashboard` if in subfolder)
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free (or paid for better performance)

4. **Set Environment Variables**
   - Click "Advanced" → "Add Environment Variable"
   - Add:
     ```
     GEMINI_API_KEY = your_actual_gemini_api_key_here
     PORT = 10000
     NODE_ENV = production
     ```

5. **Deploy**
   - Click "Create Web Service"
   - Render will build and deploy your bot
   - Wait for deployment to complete (~2-5 minutes)

### Step 3: Verify Deployment

1. **Check Logs**
   - Go to "Logs" tab in Render dashboard
   - You should see: `✅ WhatsApp Connected → D5 Bot LIVE`
   - If you see QR code, visit your Render URL + `/qr` to scan

2. **Test the Bot**
   - Visit your Render URL (e.g., `https://d5-pani-bot.onrender.com`)
   - Check dashboard at: `https://your-app.onrender.com/`
   - Send an image from whitelisted number to test

## 🔄 Using render.yaml (Alternative Method)

If you have `render.yaml` in your repo, you can use it:

1. In Render dashboard, select "New +" → "Blueprint"
2. Connect your repository
3. Render will automatically detect `render.yaml` and configure the service

**Note**: You still need to set `GEMINI_API_KEY` environment variable manually in Render dashboard.

## 🌐 Render URL Format

After deployment, your bot will be available at:
- **Main URL**: `https://your-service-name.onrender.com`
- **Dashboard**: `https://your-service-name.onrender.com/`
- **QR Code**: `https://your-service-name.onrender.com/qr`
- **Status API**: `https://your-service-name.onrender.com/status`

## ⚙️ Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `GEMINI_API_KEY` | Google Gemini API key | ✅ Yes | - |
| `PORT` | Server port | ❌ No | 3000 (local), 10000 (Render) |
| `NODE_ENV` | Environment | ❌ No | production |
| `RENDER_EXTERNAL_HOSTNAME` | Auto-set by Render | ❌ No | - |
| `RENDER_SERVICE_NAME` | Auto-set by Render | ❌ No | - |

## 🔒 Security Notes

1. **Private Repository**: Keep your GitHub repo private since auth session is included
2. **Environment Variables**: Never commit `.env` file (already in `.gitignore`)
3. **API Keys**: Store sensitive keys in Render environment variables only
4. **Auth Folder**: The `baileys_auth` folder is included in git - this is intentional for deployment

## 📝 Updating Your Bot

### To update code:
```bash
git add .
git commit -m "Update bot code"
git push
```
Render will automatically redeploy.

### To update auth session (if needed):
```bash
# After re-authenticating locally, commit the updated auth folder
git add baileys_auth/
git commit -m "Update WhatsApp auth session"
git push
```

## 🐛 Troubleshooting

### Bot shows "Reconnecting in 5s..." loop
- Check if auth session is valid
- Check Render logs for errors
- May need to delete `baileys_auth` folder and re-authenticate

### QR Code not appearing
- Visit: `https://your-app.onrender.com/qr`
- Check Render logs for connection status

### Images not being processed
- Verify sender number is in whitelist (in `whatsapp-client.js`)
- Check Render logs for incoming messages
- Verify Gemini API key is correct

### Bot goes to sleep (Free tier)
- Free tier services sleep after 15 minutes of inactivity
- Bot has auto-wake ping, but may take 30 seconds to wake
- Consider upgrading to paid plan for 24/7 uptime

## 💰 Free Tier Limitations

- **Sleeps after 15 min inactivity** - Takes ~30s to wake
- **Limited resources** - May be slower
- **Auto-wake** - Bot pings itself to stay awake

## 🚀 Production Recommendations

For production use:
1. **Upgrade to paid plan** - No sleep, better performance
2. **Use custom domain** - More professional
3. **Set up monitoring** - Get alerts if bot goes down
4. **Backup auth session** - Download `baileys_auth` folder periodically

## 📞 Support

If you encounter issues:
1. Check Render logs first
2. Verify all environment variables are set
3. Ensure `baileys_auth` folder is in your repository
4. Check that your GitHub repo is properly connected

---

**Ready to deploy? Follow the steps above and your bot will be live in minutes! 🎉**

