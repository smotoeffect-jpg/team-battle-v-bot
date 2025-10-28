// ================== server.js (Fixed & Safe Version) ==================
const express = require("express");
const axios = require("axios");
const path = require("path");
const fs = require("fs");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));

// ====== CONFIG ======
const BOT_TOKEN = "8366510657:AAEC5for6-8246aKdW6F5w3FPfJ5oWNLCfA";
const TG_API = `https://api.telegram.org/bot${BOT_TOKEN}`;
const WEBHOOK_DOMAIN = "https://team-battle-v-bot.onrender.com";
const MINI_APP_URL = "https://team-battle-v-bot.onrender.com/";
const WELCOME_IMAGE_URL = "https://files.oaiusercontent.com/file-F362F5C1-B1B9-4E69-B920-02FDECBDC094.jpeg";

const STAR_TO_POINTS = 2;
const SUPER_POINTS = 25;
const DAILY_TAPS = 300;
const AFFILIATE_BONUS = 0.1;

// ====== JSON Storage ======
const SCORES_FILE = path.join(__dirname, "scores.json");
const USERS_FILE = path.join(__dirname, "users.json");

function readJSON(file, fallback) {
  try {
    if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify(fallback, null, 2));
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}
function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

let scores = readJSON(SCORES_FILE, { israel: 0, gaza: 0 });
let users = readJSON(USERS_FILE, {});

const tgPost = (m, d) => axios.post(`${TG_API}/${m}`, d);

// ================== BASIC ROUTES ==================
app.get("/ping", (_, res) => res.json({ ok: true, msg: "Bot is online ✅" }));
app.get("/api/state", (_, res) => res.json({ ok: true, scores }));

// ================== TELEGRAM WEBHOOK ==================
app.post("/webhook", async (req, res) => {
  try {
    const update = req.body;
    console.log("📩 Incoming Update:", JSON.stringify(update, null, 2));

    // ✅ Handle pre-checkout query
    if (update.pre_checkout_query) {
      await tgPost("answerPreCheckoutQuery", {
        pre_checkout_query_id: update.pre_checkout_query.id,
        ok: true,
      });
    }

    // ✅ Handle successful payments
    if (update.message && update.message.successful_payment) {
      const sp = update.message.successful_payment;
      const userId = String(update.message.from.id);
      const stars = sp.total_amount || 0;

      const u = users[userId] || { team: "israel" };
      const team = u.team || "israel";
      const pts = stars * STAR_TO_POINTS;

      scores[team] = (scores[team] || 0) + pts;
      writeJSON(USERS_FILE, users);
      writeJSON(SCORES_FILE, scores);

      await tgPost("sendMessage", {
        chat_id: userId,
        text: `✅ תודה על תרומה של ${stars}⭐ (+${pts} נקודות לצוות ${team})`,
      });
    }

    // ✅ Handle /start
    if (update.message && update.message.text && update.message.text.startsWith("/start")) {
      const chatId = update.message.chat.id;
      await tgPost("sendPhoto", {
        chat_id: chatId,
        photo: WELCOME_IMAGE_URL,
        caption:
          "ברוך הבא ל־*TeamBattle – ישראל נגד עזה* 🇮🇱⚔️🇵🇸\nבחר שפה:",
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [
              { text: "🇮🇱 עברית", callback_data: "lang_he" },
              { text: "🇬🇧 English", callback_data: "lang_en" },
              { text: "🇵🇸 العربية", callback_data: "lang_ar" },
            ],
          ],
        },
      });
    }

    // ✅ Handle language selection
    if (update.callback_query) {
      const cq = update.callback_query;
      const chatId = cq.message.chat.id;
      const messageId = cq.message.message_id;
      const data = cq.data;

      const langs = {
        he: {
          caption: "🇮🇱 ברוך הבא! פתח את המשחק עכשיו 🚀",
          play: "🚀 פתח משחק",
        },
        en: {
          caption: "🇮🇱 Welcome! Open the game now 🚀",
          play: "🚀 Start Game",
        },
        ar: {
          caption: "🇵🇸 أهلاً بك! افتح اللعبة الآن 🚀",
          play: "🚀 ابدأ اللعبة",
        },
      };

      const langKey = data.replace("lang_", "");
      if (langs[langKey]) {
        const l = langs[langKey];
        await tgPost("editMessageMedia", {
          chat_id: chatId,
          message_id: messageId,
          media: {
            type: "photo",
            media: WELCOME_IMAGE_URL,
            caption: l.caption,
            parse_mode: "Markdown",
          },
          reply_markup: {
            inline_keyboard: [
              [{ text: l.play, web_app: { url: MINI_APP_URL } }],
              [{ text: "🌐 שנה שפה", callback_data: "change_lang" }],
            ],
          },
        });
      }
    }

    res.status(200).send("OK");
  } catch (err) {
    console.error("❌ Webhook error:", err.message);
    res.status(200).send("OK");
  }
});

// ================== WEBHOOK SETUP ==================
app.get("/setup-webhook", async (_, res) => {
  const url = `${WEBHOOK_DOMAIN}/webhook`;
  const r = await tgPost("setWebhook", {
    url,
    allowed_updates: ["message", "callback_query", "pre_checkout_query", "successful_payment"],
  });
  res.json(r.data);
});

app.use(express.static(path.join(__dirname, "public")));
app.get("*", (_, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

app.listen(process.env.PORT || 3000, () => console.log("✅ Server running on port 3000"));
