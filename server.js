const express = require("express");
const axios = require("axios");
const path = require("path");
const cors = require("cors");
const fs = require("fs-extra");

// ====== CONFIG ======
const BOT_TOKEN = "8366510657:AAEC5for6-8246aKdW6F5w3FPfJ5oWNLCfA"; // שלך
const DOMAIN = "https://team-battle-v-bot.onrender.com";           // דומיין Render שלך
const TG_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

const WELCOME_IMAGE_URL = `${DOMAIN}/05ce994d-56d2-4800-b0e3-7883cc04ffaf.jpeg`;
const MINI_APP_URL = `${DOMAIN}/`; // נטען את public/index.html

// שמירה מקומית (JSON)
const DB_DIR = path.join(__dirname, "db");
const TEAMS_FILE = path.join(DB_DIR, "teams.json");
const USERS_FILE = path.join(DB_DIR, "users.json");
const ANN_FILE = path.join(DB_DIR, "announcements.json");

// הגדרות המשחק
const FREE_TAP_VALUE = 1;
const SUPER_TAP_VALUE = 25;
const DAILY_FREE_TAPS_LIMIT = 300; // מקס' טאפים חינמיים ביום למשתמש

// ====== HELPERS ======
const tgPost = (method, data) => axios.post(`${TG_API}/${method}`, data);

async function ensureDb() {
  await fs.ensureDir(DB_DIR);
  if (!(await fs.pathExists(TEAMS_FILE))) {
    await fs.writeJson(TEAMS_FILE, { israel: 0, gaza: 0, lastReset: 0 }, { spaces: 2 });
  }
  if (!(await fs.pathExists(USERS_FILE))) {
    await fs.writeJson(USERS_FILE, {}, { spaces: 2 });
  }
  if (!(await fs.pathExists(ANN_FILE))) {
    await fs.writeJson(ANN_FILE, { items: [] }, { spaces: 2 });
  }
}

async function readJson(p) { return fs.readJson(p); }
async function writeJson(p, v) { return fs.writeJson(p, v, { spaces: 2 }); }

function todayKey() {
  const d = new Date();
  return `${d.getUTCFullYear()}-${d.getUTCMonth()+1}-${d.getUTCDate()}`;
}

// ====== APP ======
const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "public"))); // מגיש את המיני־אפליקציה

// ====== API (למיני־אפליקציה) ======
app.get("/api/state", async (req, res) => {
  try {
    await ensureDb();
    const teams = await readJson(TEAMS_FILE);
    const anns = await readJson(ANN_FILE);
    res.json({
      ok: true,
      teams,
      announcements: anns.items.slice(-20) // אחרונות
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// שליחת טאפ +1 או +25
app.post("/api/tap", async (req, res) => {
  try {
    await ensureDb();
    const { team, type, userId } = req.body; // team: 'israel' | 'gaza'; type: 'free' | 'super'
    if (!["israel", "gaza"].includes(team)) return res.status(400).json({ ok: false, error: "bad team" });

    const teams = await readJson(TEAMS_FILE);
    const users = await readJson(USERS_FILE);

    const uKey = String(userId || "anonymous");
    const day = todayKey();
    users[uKey] = users[uKey] || { daily: {}, total: 0 };
    users[uKey].daily[day] = users[uKey].daily[day] || { freeUsed: 0, superUsed: 0 };

    let inc = 0;
    if (type === "free") {
      if (users[uKey].daily[day].freeUsed >= DAILY_FREE_TAPS_LIMIT)
        return res.json({ ok: false, error: "limit_reached" });
      users[uKey].daily[day].freeUsed += 1;
      inc = FREE_TAP_VALUE;
    } else if (type === "super") {
      users[uKey].daily[day].superUsed += 1;
      inc = SUPER_TAP_VALUE;
    } else {
      return res.status(400).json({ ok: false, error: "bad type" });
    }

    teams[team] += inc;
    users[uKey].total += inc;

    await writeJson(TEAMS_FILE, teams);
    await writeJson(USERS_FILE, users);

    res.json({
      ok: true,
      inc,
      teams,
      user: users[uKey],
      limits: { dailyFreeLimit: DAILY_FREE_TAPS_LIMIT }
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ====== TELEGRAM WEBHOOK ======
// חשוב: טלגרם שולחת JSON ב-POST. GET יחזיר 405 כדי לא להפיל "wrong type".
app.get("/webhook", (req, res) => res.status(405).json({ ok: true }));
app.post("/webhook", async (req, res) => {
  try {
    if (!req.is("application/json")) return res.status(200).json({ ok: true });
    const update = req.body;
    console.log("📩 Incoming update:", update);

    // תשלום (אופציונלי)
    if (update.pre_checkout_query) {
      await tgPost("answerPreCheckoutQuery", {
        pre_checkout_query_id: update.pre_checkout_query.id,
        ok: true
      });
    }

    // הודעת /start
    if (update.message && update.message.text && update.message.text.startsWith("/start")) {
      const chatId = update.message.chat.id;

      const caption = "ברוך הבא ל־*TeamBattle – ישראל נגד עזה* 🇮🇱⚔️🇵🇸\n\nבחר את השפה שלך:";
      await tgPost("sendPhoto", {
        chat_id: chatId,
        photo: WELCOME_IMAGE_URL,
        caption,
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [[
            { text: "🇮🇱 עברית", callback_data: "lang_he" },
            { text: "🇬🇧 English", callback_data: "lang_en" },
            { text: "🇵🇸 العربية", callback_data: "lang_ar" }
          ]]
        }
      });
    }

    // Callback לשינוי שפה + פתיחת משחק
    if (update.callback_query) {
      const cq = update.callback_query;
      const chatId = cq.message.chat.id;
      const messageId = cq.message.message_id;
      const data = cq.data;

      const LANGS = {
        he: {
          caption: "🇮🇱 *צוות ישראל!* 💪\n\nטאפ להעלאה, תרום כוכבים ותהיה חלק מהניצחון!",
          button: "🚀 פתח את המשחק",
          change: "🌐 שינוי שפה"
        },
        en: {
          caption: "🇮🇱 *Team Israel!* 💪\n\nTap to boost your score and lead the battle!",
          button: "🚀 Open Game",
          change: "🌐 Change language"
        },
        ar: {
          caption: "🇵🇸 *فريق غزة!* 💪\n\nاضغط للتعزيز وانضم إلى المعركة!",
          button: "🚀 ابدأ اللعبة",
          change: "🌐 تغيير اللغة"
        }
      };

      let chosen = LANGS.he;
      if (data === "lang_en") chosen = LANGS.en;
      else if (data === "lang_ar") chosen = LANGS.ar;

      await tgPost("editMessageMedia", {
        chat_id: chatId,
        message_id: messageId,
        media: {
          type: "photo",
          media: WELCOME_IMAGE_URL,
          caption: chosen.caption,
          parse_mode: "Markdown"
        },
        reply_markup: {
          inline_keyboard: [
            [{ text: chosen.button, web_app: { url: MINI_APP_URL } }],
            [{ text: chosen.change, callback_data: "lang_he" },
             { text: "EN", callback_data: "lang_en" },
             { text: "AR", callback_data: "lang_ar" }]
          ]
        }
      });

      await tgPost("answerCallbackQuery", { callback_query_id: cq.id });
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("❌ Webhook error:", err?.response?.data || err.message);
    res.status(200).json({ ok: true });
  }
});

// סט־אפ webhook בלחיצה
app.get("/setup-webhook", async (_req, res) => {
  try {
    const r = await tgPost("setWebhook", {
      url: `${DOMAIN}/webhook`,
      allowed_updates: ["message", "callback_query", "pre_checkout_query", "successful_payment"]
    });
    res.send(r.data);
  } catch (e) {
    res.status(500).send(e?.response?.data || e.message);
  }
});

// קובץ ברירת מחדל
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// RUN
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  await ensureDb();
  console.log(`✅ Server running on port ${PORT}`);
});
