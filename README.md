# 🌊 Water Management Bot – WhatsApp D5 Valve Monitor

A real-time **AI-powered water valve monitoring system** that uses WhatsApp, computer vision, and WebSocket to detect D5 valve activation and trigger alerts.

---

## 🎯 Overview

This bot monitors water distribution by analyzing photos of valve blackboards sent via WhatsApp. When valve **D5** is detected as active, it:
- ✅ Triggers an instant alarm notification
- ✅ Plays a custom alert sound
- ✅ Logs analysis in a real-time web dashboard
- ✅ Sends reports via WebSocket to connected clients

**Perfect for:** Water management systems, irrigation networks, facility monitoring, IoT automation.

---

## 🚀 Key Features

| Feature | Description |
|---------|-------------|
| **WhatsApp Integration** | Receive images directly via WhatsApp (no API key required) |
| **AI Vision** | Google Gemini 2.5 Flash analyzes valve blackboard photos |
| **Real-time Alerts** | Instant D5 detection with sound notifications |
| **Live Dashboard** | Web UI shows analysis logs and D5 alerts in real-time |
| **Auto-reconnect** | Graceful session recovery on disconnect |
| **Multi-source** | Monitor from multiple WhatsApp groups/contacts |

---

## 📹 Demo Video

## 📹 Demo Video

[![Watch the Demo](https://img.youtube.com/vi/4f9rYxkLanI/maxresdefault.jpg)](https://www.youtube.com/watch?v=4f9rYxkLanI)

## 🛠️ Tech Stack

- **Backend:** Node.js + Express
- **WhatsApp Client:** Baileys (WhatsApp Web automation)
- **AI/ML:** Google Generative AI (Gemini 2.5 Flash)
- **Real-time:** WebSocket (ws library)
- **Audio:** play-sound
- **Frontend:** Vanilla JS + HTML/CSS

---

## 📋 Installation

### Prerequisites
- Node.js 18+
- npm or yarn
- WhatsApp account (personal number)
- Google Gemini API key ([get one free](https://makersuite.google.com/app/apikey))

### Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/water-management-bot.git
   cd water-management-bot
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create `.env` file:**
   ```env
   gemini_api_key=your_google_gemini_api_key_here
   PORT=8080
   ```

4. **Add alert sound:**
   - Place `panisound.mp3` in the `public/` folder

5. **Start the bot:**
   ```bash
   node water-managment-bot/whatsapp-client.js
   ```

6. **Scan QR code:**
   - A QR code will appear in terminal
   - Scan with your WhatsApp phone camera
   - **Keep WhatsApp active on your phone**

7. **Open dashboard:**
   - Navigate to `http://localhost:8080`
   - Enable sound notifications (browser permission required)

---

## 📸 Usage

### Send a Valve Photo via WhatsApp

1. Take a photo of your water valve blackboard
2. Send it via WhatsApp to the bot's number (scan QR to authorize)
3. Bot analyzes the image in real-time
4. **If D5 is detected:**
   - 🔔 Alert sound plays
   - 📊 Dashboard updates with analysis
   - 📝 Timestamp and details logged

### Example Workflow

```
You (WhatsApp)      Bot Backend         Dashboard
   │                    │                    │
   ├─── Photo ────────→  │                    │
   │                     ├─ Download media    │
   │                     ├─ Send to Gemini    │
   │                     ├─ Analyze D5        │
   │                     ├─ Play alarm ◄──────┤
   │                     ├─ Broadcast WS  ───→│
   │                     │                    ├─ Log entry
   │                     │                    ├─ Show alert
   │◄──── Acknowledged   │                    │
```

---

## 📁 Project Structure

```
water-managment-bot/
├── whatsapp-client.js          # Main bot logic
├── public/
│   ├── index.html              # Live dashboard
│   └── panisound.mp3           # Alert sound
├── baileys_auth_info.json      # WhatsApp session (auto-generated)
├── images/                     # Saved valve photos
├── .env                        # API keys
├── package.json
└── README.md
```

---

## ⚙️ Configuration

### Whitelist Allowed Contacts/Groups

Edit `whatsapp-client.js`:

```javascript
const WHITELIST = new Set([
  "923213850347-1568737744@g.us",    // Group ID
  "923058428351-1622827800@g.us",    // Group ID
  "923343834668@s.whatsapp.net",     // Individual contact
]);
```

### Customize Gemini Prompt

```javascript
const result = await model.generateContent([
  "Your custom analysis prompt here...",
  { inlineData: { mimeType: mime, data: b64 } },
]);
```

---

## 🔍 How It Works

```
WhatsApp Image
    ↓
Baileys Client (WhatsApp Web automation)
    ↓
Download Media Buffer
    ↓
Convert to Base64
    ↓
Google Gemini Vision API
    ↓
Analyze: "Is D5 valve active?"
    ↓
D5 Detected? ─→ YES → Play Alarm Sound
    │                   ↓
    │            WebSocket Broadcast
    │                   ↓
    └─→ NO → Log Analysis
                   ↓
            Live Dashboard Update
```

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| **Messages not logging** | Ensure WhatsApp is active on phone; check whitelist JIDs with `console.log(from)` |
| **Session keeps logging out** | Exclude `baileys_auth_info.json` from OneDrive/cloud sync |
| **No sound alert** | Verify `panisound.mp3` exists in `/public`; enable browser audio permissions |
| **QR code not appearing** | Check terminal output; ensure printer not disabled; restart bot |
| **Gemini API errors** | Verify API key in `.env`; check quota at [Google Cloud Console](https://console.cloud.google.com) |

---

## 🚦 API Endpoints

| Endpoint | Method | Response |
|----------|--------|----------|
| `GET /asad` | GET | `"asad"` (health check) |
| `WS ws://localhost:8080` | WebSocket | Real-time event stream |

### WebSocket Message Types

```javascript
// Info message
{ type: "info", message: "D5 Water Bot is ACTIVE!" }

// Analysis complete
{ type: "analysis", text: "...", isD5: true, timestamp: "..." }

// Alert triggered
{ type: "alert", message: "D5 WATER IS ON! PANI SOUND PLAYING..." }

// Error occurred
{ type: "error", message: "Error details..." }

// QR code ready
{ type: "qr", message: "New QR – Scan to login!" }
```

---

## 📊 Dashboard Features

- **Live Log Panel:** Real-time event stream with color-coded entries
- **Status Indicator:** Connection status (green = connected, red = offline)
- **Sound Control:** One-click audio enablement for browser notifications
- **Auto-scroll:** Newest events appear at bottom
- **Color Coding:**
  - 🔵 Info (blue)
  - 🔴 Alerts (red)
  - 🟠 Errors (red)

---

## 🔐 Security Notes

- **Session File:** Keep `baileys_auth_info.json` private (not in version control)
- **API Key:** Never commit `.env` to GitHub; use environment variables in production
- **Whitelist:** Restrict bot to trusted contacts to prevent abuse
- **OneDrive/Cloud:** Exclude auth folder from sync to prevent corruption

---

## 🚀 Deployment

### Docker

```dockerfile
FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 8080
CMD ["node", "water-managment-bot/whatsapp-client.js"]
```

```bash
docker build -t water-bot .
docker run -e gemini_api_key=YOUR_KEY -p 8080:8080 water-bot
```

### Cloud Platforms

- **Heroku:** `Procfile` → `web: node water-managment-bot/whatsapp-client.js`
- **Railway:** Push to GitHub → auto-deploy
- **DigitalOcean:** SSH deploy + PM2 for process management

---

## 📈 Performance Metrics

- **Image Analysis:** ~2-3 seconds (Gemini API)
- **Memory:** ~150MB at runtime
- **CPU:** Minimal (idle when waiting for messages)
- **Concurrent WebSocket Connections:** 100+ simultaneous users

---

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

MIT License – See LICENSE file for details

---

## 👨‍💻 Author

**Asadullah**  
📧 asadullahabbasi.com  
🔗 [GitHub](https://github.com/AsadullahAbbasi) | [LinkedIn](https://www.linkedin.com/in/asadullahabbasidev/)

---

## 🙏 Acknowledgments

- [Baileys](https://github.com/WhiskeySockets/Baileys) – WhatsApp Web automation
- [Google Generative AI](https://ai.google.dev) – Vision API
- [ws](https://github.com/websockets/ws) – WebSocket library


---

**⭐ If this project helped you, please star it!**