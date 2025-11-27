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

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.static("public")); // index.html + panisound.mp3 here

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const AUTH_DIR = "./baileys_auth"; // Render allows this folder

// Broadcast to all browser tabs
function broadcast(data) {
  wss.clients.forEach((client) => {
    if (client.readyState === 1) client.send(JSON.stringify(data));
  });
}

// Keep Render from sleeping
setInterval(() => {
  const url = `https://${process.env.RENDER_EXTERNAL_HOSTNAME || process.env.RENDER_SERVICE_NAME + ".onrender.com"}`;
  http.get(url, () => console.log("Ping → staying awake")).on("error", () => {});
}, 14 * 60 * 1000); // every 14 minutes

async function connectWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
    logger: pino({ level: "silent" }),
    browser: ["D5 Pani Bot", "Chrome", "110"],
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    const { connection, qr } = update;

    if (qr) {
      broadcast({ type: "qr", qr });
    }
    if (connection === "open") {
      console.log("WhatsApp Connected → D5 Bot LIVE");
      broadcast({ type: "status", message: "Connected – Monitoring D5 Valve" });
    }
    if (connection === "close") {
      const shouldReconnect = update.lastDisconnect?.error?.output?.statusCode !== 401;
      console.log(shouldReconnect ? "Reconnecting in 5s..." : "Logged out – delete baileys_auth folder");
      if (shouldReconnect) setTimeout(connectWhatsApp, 5000);
    }
  });

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const m = messages[0];
    if (!m.message || m.key.fromMe) return;

    // Support direct image or quoted image
    let imageMessage =
      m.message.imageMessage ||
      m.message.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage;

    if (!imageMessage) return;

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
}

connectWhatsApp().catch(console.error);

// Routes
app.get("/", (_, res) =>
  res.sendFile(path.join(__dirname, "public", "index.html"))
);

wss.on("connection", (ws) => {
  console.log("Browser dashboard connected");
  ws.send(JSON.stringify({ type: "status", message: "D5 Water Bot Dashboard Ready" }));
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Bot running → https://${process.env.RENDER_SERVICE_NAME}.onrender.com`);
  console.log("Put panisound.mp3 and index.html in /public folder");
});
