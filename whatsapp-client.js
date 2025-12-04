// whatsapp-client.js → FINAL RENDER VERSION (No disk • Browser sound only • Always awake)

import express from "express";
import http from "http";
import { WebSocketServer } from "ws";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import makeWASocket, {
  useMultiFileAuthState,
  downloadMediaMessage,
} from "@whiskeysockets/baileys";
import { GoogleGenerativeAI } from "@google/generative-ai";
import pino from "pino";
import qrcode from "qrcode-terminal";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.static("public")); // index.html + panisound.mp3 here

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

const AUTH_DIR = "./baileys_auth"; // Render allows this folder

// Whitelist of allowed phone numbers - WhatsApp JID format
// Format: [country code][number]@s.whatsapp.net (remove +, spaces, dashes)
const WHITELIST = new Set([
  "923060031845@s.whatsapp.net",  // +92 306 0031845
  "923343834668@s.whatsapp.net",  // +92 334 3834668 (your number)
  "923402831455@s.whatsapp.net"   // +92 340 2831455
]);

// Helper function to extract phone number from JID (handles various formats)
function extractPhoneNumber(jid) {
  if (!jid) return null;
  
  // Handle @lid format - return null as we need remoteJidAlt for actual number
  if (jid.includes('@lid')) {
    return null;
  }
  
  // Extract number part (remove device ID if present)
  let number = jid.split('@')[0];
  if (number.includes(':')) {
    number = number.split(':')[0];
  }
  
  // Return in standard format: number@s.whatsapp.net
  if (jid.includes('@s.whatsapp.net')) {
    return `${number}@s.whatsapp.net`;
  }
  
  return null;
}

// Helper function to format phone number for display
function formatPhoneForDisplay(jid) {
  if (!jid) return 'Unknown';
  
  const number = jid.split('@')[0];
  if (number.length === 12 && number.startsWith('92')) {
    // Format: +92 XXX XXXXXXX
    return `+${number.substring(0, 2)} ${number.substring(2, 5)} ${number.substring(5)}`;
  }
  return number;
}

// Store current QR code and connection state
let currentQR = null;
let connectionStatus = "connecting";

// Broadcast to all browser tabs
function broadcast(data) {
  wss.clients.forEach((client) => {
    if (client.readyState === 1) client.send(JSON.stringify(data));
  });
}

// Keep Render from sleeping - ping every 10 minutes
function pingKeepAlive() {
  const hostname = process.env.RENDER_EXTERNAL_HOSTNAME || 
                   (process.env.RENDER_SERVICE_NAME ? `${process.env.RENDER_SERVICE_NAME}.onrender.com` : null);
  if (hostname) {
    const protocol = process.env.RENDER_EXTERNAL_HOSTNAME ? 'https' : 'http';
    const url = `${protocol}://${hostname}/status`;
    http.get(url, (res) => {
      console.log(`✅ Keep-alive ping → ${url} (Status: ${res.statusCode})`);
    }).on("error", (err) => {
      console.log(`⚠️  Keep-alive ping failed: ${err.message}`);
    });
  }
}

// Initial ping after 1 minute (allows time for deployment to complete)
setTimeout(() => {
  pingKeepAlive();
}, 60 * 1000);

// Ping every 10 minutes to keep Render alive (free tier sleeps after 15 min of inactivity)
setInterval(() => {
  pingKeepAlive();
}, 10 * 60 * 1000); // every 10 minutes (600,000 ms)

let isConnecting = false;
let connectionAttempts = 0;

async function connectWhatsApp() {
  if (isConnecting) {
    return; // Prevent multiple simultaneous connection attempts
  }
  
  isConnecting = true;
  connectionAttempts++;
  
  try {
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    connectionStatus = "connecting";

    const sock = makeWASocket({
      auth: state,
      logger: pino({ level: "silent" }),
      browser: ["D5 Pani Bot", "Chrome", "110"],
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", (update) => {
      const { connection, qr, lastDisconnect } = update;

      if (qr) {
        isConnecting = false;
        currentQR = qr;
        connectionStatus = "qr_ready";
        connectionAttempts = 0; // Reset on successful QR generation
        const PORT = process.env.PORT || 3000;
        const hostname = process.env.RENDER_EXTERNAL_HOSTNAME || 
                         (process.env.RENDER_SERVICE_NAME ? `${process.env.RENDER_SERVICE_NAME}.onrender.com` : `localhost:${PORT}`);
        console.log("\n🔷 QR CODE GENERATED - SCAN WITH WHATSAPP:\n");
        try {
          qrcode.generate(qr, { small: true });
        } catch (err) {
          console.log("QR Code (first 50 chars):", qr.substring(0, 50) + "...");
          console.log("Visit http://" + hostname + "/qr to see QR code in browser");
        }
        console.log("\n📱 Open WhatsApp → Linked Devices → Link a Device");
        const protocol = process.env.RENDER_EXTERNAL_HOSTNAME ? 'https' : 'http';
        console.log(`🌐 Or visit: ${protocol}://${hostname}/qr`);
        console.log(`   ⚠️  Make sure to use HTTP (not HTTPS) for localhost!\n`);
        broadcast({ type: "qr", qr });
      }
      
      if (connection === "open") {
        isConnecting = false;
        currentQR = null;
        connectionStatus = "connected";
        connectionAttempts = 0;
        console.log("\n✅ WhatsApp Connected → D5 Bot LIVE\n");
        broadcast({ type: "status", message: "Connected – Monitoring D5 Valve" });
      }
      
      if (connection === "close") {
        isConnecting = false;
        const error = lastDisconnect?.error;
        const statusCode = error?.output?.statusCode;
        const shouldReconnect = statusCode !== 401;
        
        connectionStatus = "disconnected";
        currentQR = null;
        
        if (statusCode === 401) {
          console.log("\n❌ Logged out (401) – delete baileys_auth folder and restart\n");
        } else {
          console.log(`\n⚠️ Connection closed (${statusCode || 'unknown'})`);
          if (error?.message) {
            console.log(`Error: ${error.message}`);
          }
          if (connectionAttempts < 10) {
            console.log(`Reconnecting in 5s... (attempt ${connectionAttempts + 1})\n`);
            if (shouldReconnect) setTimeout(connectWhatsApp, 5000);
          } else {
            console.log("\n❌ Too many reconnection attempts. Please check your connection and restart the bot.\n");
            console.log("💡 Try: Delete baileys_auth folder and restart to generate a new QR code\n");
          }
        }
      }
    });
    
    sock.ev.on("error", (error) => {
      console.error("Socket error:", error);
    });
    
    sock.ev.on("messages.upsert", async ({ messages }) => {
      const m = messages[0];
      if (!m.message) return;

      // Get sender's phone number/JID - handle new LID format
      // remoteJidAlt contains the actual phone number when remoteJid uses @lid format
      const remoteJid = m.key.remoteJid;
      const remoteJidAlt = m.key.remoteJidAlt;
      const fromMe = m.key.fromMe;
      
      // Extract phone number - prioritize remoteJidAlt (contains actual number in LID format)
      let phoneJID = null;
      
      // First, try remoteJidAlt (this is the actual phone number when using LID format)
      if (remoteJidAlt && remoteJidAlt.includes('@s.whatsapp.net')) {
        phoneJID = extractPhoneNumber(remoteJidAlt);
      }
      
      // Fall back to remoteJid if remoteJidAlt not available or invalid
      if (!phoneJID && remoteJid) {
        phoneJID = extractPhoneNumber(remoteJid);
      }
      
      // Debug logging for LID format
      if (remoteJid?.includes('@lid')) {
        console.log(`🔍 LID format detected:`);
        console.log(`   remoteJid: ${remoteJid}`);
        console.log(`   remoteJidAlt: ${remoteJidAlt}`);
        console.log(`   fromMe: ${fromMe}`);
        console.log(`   Extracted JID: ${phoneJID}`);
      }
      
      // Check if we have a valid phone number
      if (!phoneJID) {
        console.log(`⚠️  Could not extract phone number from JID`);
        console.log(`   remoteJid: ${remoteJid}`);
        console.log(`   remoteJidAlt: ${remoteJidAlt}`);
        console.log(`   fromMe: ${fromMe}`);
        return;
      }
      
      // Check if sender is in whitelist
      if (!WHITELIST.has(phoneJID)) {
        const displayPhone = formatPhoneForDisplay(phoneJID);
        const selfMsg = fromMe ? " (self-message)" : "";
        console.log(`⏭️  Message ignored from: ${displayPhone}${selfMsg} (not in whitelist)`);
        console.log(`   JID: ${phoneJID}`);
        return;
      }

      // Support direct image or quoted image
      let imageMessage =
        m.message.imageMessage ||
        m.message.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage;

      if (!imageMessage) {
        // Log non-image messages only if from whitelisted number
        if (fromMe) {
          console.log(`💬 Text message from self (not an image)`);
        }
        return;
      }

      // Log which number sent the image
      const displayPhone = formatPhoneForDisplay(phoneJID);
      const selfMsg = fromMe ? " (self-message to yourself)" : "";
      console.log(`\n📸 Image received from: ${displayPhone}${selfMsg}`);
      console.log(`   JID: ${phoneJID}`);

    broadcast({ type: "info", message: "New photo received – asking Gemini..." });

    try {
      const buffer = await downloadMediaMessage(
        m,
        "buffer",
        {},
        { logger: pino({ level: "silent" }) }
      );

      // NO fs.writeFileSync ANYWHERE → memory only

      const result = await model.generateContent([
        "Look at this water valve board photo. Is valve D5 currently OPEN or showing water timing? Answer strictly: YES or NO first, then one short sentence.",
        {
          inlineData: {
            mimeType: imageMessage.mimetype,
            data: buffer.toString("base64"),
          },
        },
      ]);

      const text = result.response.text().trim();
      const isD5Open = text.toUpperCase().startsWith("YES") ||
                       text.toLowerCase().includes("d5") && 
                       !text.toLowerCase().includes("closed") &&
                       !text.toLowerCase().includes("off");

      broadcast({ type: "ai", text, isD5Open });

      if (isD5Open) {
        console.log("D5 WATER DETECTED → BROWSER ALARM!");
        broadcast({ type: "alert", message: "PANI AAYA! D5 IS OPEN!" });
      }

    } catch (error) {
      console.error(error);
      broadcast({ type: "error", message: error.message });
    }
    });
    
  } catch (error) {
    isConnecting = false;
    console.error("\n❌ Failed to initialize WhatsApp connection:", error.message);
    if (connectionAttempts < 5) {
      console.log(`Retrying in 5s... (attempt ${connectionAttempts})\n`);
      setTimeout(connectWhatsApp, 5000);
    } else {
      console.log("\n❌ Too many initialization failures. Please check your setup.\n");
    }
  }
}

connectWhatsApp().catch(console.error);

// Routes
app.get("/", (_, res) =>
  res.sendFile(path.join(__dirname, "public", "index.html"))
);

// QR Code endpoint
app.get("/qr", (req, res) => {
  if (currentQR) {
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>WhatsApp QR Code</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            background: #f0f0f0;
          }
          .container {
            text-align: center;
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          h1 { color: #25D366; }
          .qr { 
            font-family: monospace;
            white-space: pre;
            background: #000;
            color: #0f0;
            padding: 20px;
            border-radius: 5px;
            margin: 20px 0;
            display: inline-block;
          }
          .instructions {
            margin-top: 20px;
            color: #666;
            line-height: 1.6;
          }
        </style>
        <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"></script>
      </head>
      <body>
        <div class="container">
          <h1>📱 WhatsApp QR Code</h1>
          <div id="qrcode"></div>
          <div class="instructions">
            <p><strong>Steps to connect:</strong></p>
            <ol style="text-align: left; display: inline-block;">
              <li>Open WhatsApp on your phone</li>
              <li>Go to Settings → Linked Devices</li>
              <li>Tap "Link a Device"</li>
              <li>Scan this QR code</li>
            </ol>
            <p style="margin-top: 20px;">
              <a href="/">← Back to Dashboard</a>
            </p>
          </div>
        </div>
        <script>
          QRCode.toCanvas(document.getElementById('qrcode'), '${currentQR}', {
            width: 300,
            margin: 2
          }, function (error) {
            if (error) {
              document.getElementById('qrcode').innerHTML = '<p>Error generating QR code. Check terminal for QR.</p>';
            }
          });
        </script>
      </body>
      </html>
    `);
  } else {
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>No QR Code</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            background: #f0f0f0;
          }
          .container {
            text-align: center;
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>No QR Code Available</h1>
          <p>Status: ${connectionStatus}</p>
          <p>QR code will appear here when ready. Check terminal output.</p>
          <p><a href="/">← Back to Dashboard</a></p>
        </div>
      </body>
      </html>
    `);
  }
});

// Status endpoint
app.get("/status", (req, res) => {
  res.json({
    status: connectionStatus,
    hasQR: currentQR !== null,
    qrUrl: currentQR ? "/qr" : null
  });
});

wss.on("connection", (ws) => {
  console.log("Browser dashboard connected");
  ws.send(JSON.stringify({ type: "status", message: "D5 Water Bot Dashboard Ready" }));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, "0.0.0.0", () => {
  const hostname = process.env.RENDER_EXTERNAL_HOSTNAME || 
                   (process.env.RENDER_SERVICE_NAME ? `${process.env.RENDER_SERVICE_NAME}.onrender.com` : `localhost:${PORT}`);
  const protocol = process.env.RENDER_EXTERNAL_HOSTNAME ? 'https' : 'http';
  console.log(`\n🚀 Bot running → ${protocol}://${hostname}`);
  console.log(`📱 QR Code will be available at → ${protocol}://${hostname}/qr`);
  console.log(`📊 Dashboard → ${protocol}://${hostname}/`);
  console.log(`ℹ️  Status API → ${protocol}://${hostname}/status`);
  console.log(`\n⚠️  IMPORTANT: Use HTTP (not HTTPS) for localhost!`);
  console.log(`   Copy this URL: http://localhost:${PORT}\n`);
  console.log("📋 Whitelisted Numbers (images from these will be scanned):");
  WHITELIST.forEach(jid => {
    const number = jid.split('@')[0];
    console.log(`   ✅ +${number.substring(0, 2)} ${number.substring(2, 5)} ${number.substring(5)}`);
  });
  console.log("\nPut panisound.mp3 and index.html in /public folder\n");
  
  // Log keep-alive status for Render
  if (process.env.RENDER_EXTERNAL_HOSTNAME || process.env.RENDER_SERVICE_NAME) {
    console.log("⏰ Keep-alive active: Will ping every 10 minutes to prevent Render from sleeping\n");
  }
  
  console.log("🔄 Connecting to WhatsApp...\n");
});
