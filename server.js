const express = require("express");
const axios = require("axios");
const bodyParser = require("body-parser");
const path = require("path");
const fs = require("fs");
const cors = require("cors");

const app = express();
app.use(bodyParser.json());
app.use(cors());
app.use(express.static(path.join(__dirname, "public")));

const BOT_TOKEN = "8366510657:AAEC5for6-8246aKdW6F5w3FPfJ5oWNLCfA";
const TG_API = `https://api.telegram.org/bot${BOT_TOKEN}`;
const WEBHOOK_DOMAIN = "https://team-battle-v-bot.onrender.com";
const MINI_APP_URL = `${WEBHOOK_DOMAIN}/`; // קישור למיני אפליקציה

// מיקום קובץ משתמשים
const USERS_DB = path.join(__dirname, "db", "users.json");

// טוען את רשימת המשתמשים
function loadUsers() {
  try {
    return JSON.parse(fs.readFileSync(USERS_DB, "utf8"));
  } catch {
    return {};
  }
}

// שומר את רשימת המשתמשים
function saveUsers(users) {
  fs.writeFileSync(USERS_DB, JSON.stringify(users, null, 2));
}

// --- Webhook ---
app.post("/webhook", async (req, res) => {
  const update = req.body;
  console.log("📩 Update:", update);

  try {
    if (update.message && update.message.text === "/start") {
      const chatId = update.message.chat.id;
      const name = update.message.chat.first_name || "שחקן";

      // שמירה ל-DB
      const users = loadUsers();
      if (!users[chatId]) {
        users[chatId] = { name, points: 0, team: null };
        saveUsers(users);
      }

      // הודעת ברוך הבא
      await axios.post(`${TG_API}/sendMessage`, {
        chat_id: chatId,
        text: `ברוך הבא ל־*Team Battle: Israel 🇮🇱 Vs Gaza 🇵🇸*\n\nבחר צד כדי להתחיל את הקרב!`,
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [
              { text: "🇮🇱 קבוצה ישראל", callback_data: "team_israel" },
              { text: "🇵🇸 קבוצה עזה", callback_data: "team_gaza" }
            ],
            [
              { text: "🎮 כנס למיני-אפליקציה", web_app: { url: MINI_APP_URL } }
            ]
          ]
        }
      });
    }

    // לחיצה על כפתור
    if (update.callback_query) {
      const chatId = update.callback_query.message.chat.id;
      const data = update.callback_query.data;
      const users = loadUsers();

      if (data === "team_israel" || data === "team_gaza") {
        const team = data === "team_israel" ? "ישראל 🇮🇱" : "עזה 🇵🇸";
        users[chatId].team = team;
        saveUsers(users);

        await axios.post(`${TG_API}/sendMessage`, {
          chat_id: chatId,
          text: `✅ נרשמת בהצלחה לקבוצה: *${team}*!\nצבור נקודות, תעלה שלבים ותרוויח כוכבים ⭐`,
          parse_mode: "Markdown"
        });
      }
    }

  } catch (err) {
    console.error("❌ Webhook error:", err?.response?.data || err.message);
  }

  res.send("OK");
});

// --- שרת ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
