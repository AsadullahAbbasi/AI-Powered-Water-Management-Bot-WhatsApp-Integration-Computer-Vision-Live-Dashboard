// whatsapp-client.js → FULL FINAL WORKING VERSION (D5 + Gemini + Auto Play Sound)
import express from "express";
import http from "http";
import { WebSocketServer } from "ws";
import dotenv from "dotenv";
import qrcode from "qrcode-terminal";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

import makeWASocket, {
  useMultiFileAuthState,
  downloadMediaMessage,
} from "@whiskeysockets/baileys";
import { GoogleGenerativeAI } from "@google/generative-ai";
import playSound from "play-sound";
import pino from "pino";   // ← REQUIRED for Baileys v6+

dotenv.config();
const player = playSound({});  // Auto uses ffplay/mplayer/aplay

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.static("public"));  // Your index.html + panisound.mp3 goes here

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Gemini Setup
const genAI = new GoogleGenerativeAI(process.env.gemini_api_key);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

// Folders
const AUTH_DIR = path.join(__dirname, "baileys_auth");
const IMAGES_DIR = path.join(__dirname, "images");
const SOUND_FILE = path.join(__dirname, "public", "panisound.mp3");

if (!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR, { recursive: true });
if (!fs.existsSync(IMAGES_DIR)) fs.mkdirSync(IMAGES_DIR, { recursive: true });

// Whitelist (your numbers/groups)
const WHITELIST = new Set([
  
]);

// WebSocket Broadcast
function broadcast(data) {
  wss.clients.forEach(ws => ws.readyState === 1 && ws.send(JSON.stringify(data)));
}

// Play Alarm Sound
function playD5Alarm() {
  if (fs.existsSync(SOUND_FILE)) {
    player.play(SOUND_FILE, err => {
      if (err) console.log("Sound error:", err);
      else console.log("D5 DETECTED → PANI SOUND PLAYED!");
    });
  } else {
    console.log("panisound.mp3 not found in /public folder!");
  }
}

// Start Baileys Bot
async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    logger: pino({ level: "silent" }),  // ← Correct way in 2025
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    const { connection, qr } = update;

    if (qr) {
      console.log("\nSCAN THIS QR CODE:\n");
      qrcode.generate(qr, { small: true });
      broadcast({ type: "qr", message: "New QR – Scan to login!" });
    }

    if (connection === "open") {
      console.log("WhatsApp Connected – D5 Bot is ONLINE!");
      broadcast({ type: "info", message: "D5 Water Bot is ACTIVE!" });
    }

    if (connection === "close") {
      const reason = update.lastDisconnect?.error?.output?.statusCode;
      if (reason !== 401) {
        console.log("Reconnecting...");
        setTimeout(startBot, 5000);
      } else {
        console.log("Logged out. Delete baileys_auth folder and rescan QR.");
      }
    }
  });

  // Message Handler
  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const from = msg.key.remoteJid;

    // Detect image (direct or quoted)
    let imageMsg = msg.message.imageMessage;
    if (!imageMsg) {
      const quoted = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
      imageMsg = quoted?.imageMessage;
    }
    if (!imageMsg) return;

    broadcast({ type: "info", message: "New image received – analyzing..." });

    try {
      // Download image
      const buffer = await downloadMediaMessage(msg, "buffer", {}, {
        logger: pino({ level: "silent" }),
      });

      // Save to disk
      const filename = path.join(IMAGES_DIR, `${from.split("@")[0]}_${Date.now()}.jpg`);
      fs.writeFileSync(filename, buffer);
      console.log("Image saved →", filename);

      // Send to Gemini Vision
      const result = await model.generateContent([
        "This is a photo of a water valve blackboard. Is valve D5 currently open or showing water timing? Answer only with YES or NO first, then explain in one short sentence.",
        { inlineData: { mimeType: imageMsg.mimetype, data: buffer.toString("base64") } },
      ]);

      const text = result.response.text();
      const isD5 = text.toLowerCase().includes("yes") || 
                   (text.includes("d5") && !text.includes("closed") && !text.includes("off"));

      broadcast({ type: "analysis", text, isD5, from });

      if (isD5) {
        console.log("D5 WATER TIMING DETECTED!!!");
        broadcast({ type: "alert", message: "D5 WATER IS ON! PANI SOUND PLAYING..." });
        playD5Alarm();  // ← SOUND PLAYS HERE
      }

    } catch (err) {
      console.error("Error:", err.message);
      broadcast({ type: "error", message: err.message });
    }
  });
}

startBot().catch(console.error);

// Routes
app.get("/asad", (_, res) => res.send("asad"));

wss.on("connection", ws => {
  console.log("Frontend connected");
  ws.send(JSON.stringify({ type: "info", message: "D5 Water Bot Ready" }));
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Put your panisound.mp3 in the /public folder`);
});