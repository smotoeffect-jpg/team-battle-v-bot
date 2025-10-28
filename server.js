// ================== TeamBattle Premium (Text Only, Multilingual, Stable) ==================
const express = require("express");
const axios = require("axios");
const path = require("path");
const fs = require("fs");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

// ====== CONFIG ======
const BOT_TOKEN = "8366510657:AAEC5for6-8246aKdW6F5w3FPfJ5oWNLCfA";
const TG_API = `https://api.telegram.org/bot${BOT_TOKEN}`;
const WEBHOOK_DOMAIN = "https://team-battle-v-bot.onrender.com";
const MINI_APP_URL = "https://team-battle-v-bot.onrender.com/";

const STAR_TO_POINTS = 2;
const SUPER_POINTS = 25;
const DAILY_TAPS = 300;
const AFFILIATE_BONUS = 0.1;

// ====== FILE STORAGE ======
const SCORES_FILE = path.join(__dirname, "scores.json");
const USERS_FILE = path.join(__dirname, "users.json");

function readJSON(file, fallback = {}) {
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
const todayStr = () => new Date().toISOString().slice(0, 10);

let scores = readJSON(SCORES_FILE, { israel: 0, gaza: 0 });
let users = readJSON(USERS_FILE, {});

const tgPost = async (m, d) => {
  try {
    return await axios.post(`${TG_API}/${m}`, d);
  } catch (err) {
    console.error("❌ Telegram API Error:", err.response?.data || err.message);
  }
};

// ================== LANG TEXTS ==================
const LANGS = {
  he: {
    welcome:
      "🇮🇱 *ברוך הבא ל־TeamBattle – ישראל נגד עזה!*\n\nבחר צד, בצע טאפים, תרום כוכבים והצע את הקבוצה שלך לניצחון!\n\n💥 300 טאפים ביום\n⚡ סופר־בוסט יומי (+25)\n⭐ כל כוכב = 2 נקודות\n🤝 10% מהמוזמנים שלך יוסיפו לך נקודות אוטומטית!",
    play: "🚀 פתח משחק",
    change: "🌐 שנה שפה",
    donate: "💫 תרום כוכבים",
    scoreTitle: "🏆 ניקוד נוכחי",
    israel: "🇮🇱 ישראל",
    gaza: "🇵🇸 עזה",
    thanks: (stars, pts, team) =>
      `✅ תודה על התרומה של ${stars}⭐!\nהוספת ${pts} נקודות לקבוצה: *${team}*!`,
  },
  en: {
    welcome:
      "🇮🇱 *Welcome to TeamBattle – Israel vs Gaza!*\n\nPick your team, tap to boost, donate stars, and lead your side to victory!\n\n💥 300 taps/day\n⚡ Super Boost once/day (+25)\n⭐ 1 Star = 2 points\n🤝 Earn 10% from your referrals automatically!",
    play: "🚀 Start Game",
    change: "🌐 Change Language",
    donate: "💫 Donate Stars",
    scoreTitle: "🏆 Current Score",
    israel: "🇮🇱 Israel",
    gaza: "🇵🇸 Gaza",
    thanks: (stars, pts, team) =>
      `✅ Thanks for donating ${stars}⭐!\nYou added ${pts} points to *${team}*!`,
  },
  ar: {
    welcome:
      "🇵🇸 *مرحبًا بك في TeamBattle – إسرائيل ضد غزة!*\n\nاختر فريقك، اضغط للتعزيز، تبرع بالنجوم، وقُد فريقك إلى النصر!\n\n💥 ٣٠٠ نقرة يوميًا\n⚡ تعزيز يومي (+25)\n⭐ النجمة = نقطتان\n🤝 اربح ١٠٪ من إحالاتك تلقائيًا!",
    play: "🚀 ابدأ اللعبة",
    change: "🌐 تغيير اللغة",
    donate: "💫 تبرع بالنجوم",
    scoreTitle: "🏆 النتيجة الحالية",
    israel: "🇮🇱 إسرائيل",
    gaza: "🇵🇸 غزة",
    thanks: (stars, pts, team) =>
      `✅ شكرًا لتبرعك بـ ${stars}⭐!\nلقد أضفت ${pts} نقطة إلى فريق *${team}*!`,
  },
};

// ================== API ==================
app.get("/api/state", (_, res) => res.json({ ok: true, scores }));

app.post("/api/tap", (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ ok: false });

  const u = (users[userId] ||= {
    team: null,
    tapsDate: null,
    tapsToday: 0,
    superDate: null,
    superUsed: 0,
    starsDonated: 0,
    bonusStars: 0,
  });
  if (!u.team) return res.status(400).json({ ok: false });

  const today = todayStr();
  if (u.tapsDate !== today) {
    u.tapsDate = today;
    u.tapsToday = 0;
  }
  if (u.tapsToday >= DAILY_TAPS)
    return res.json({ ok: false, error: "limit", limit: DAILY_TAPS });

  u.tapsToday++;
  scores[u.team] = (scores[u.team] || 0) + 1;
  writeJSON(USERS_FILE, users);
  writeJSON(SCORES_FILE, scores);
  res.json({ ok: true, scores, tapsToday: u.tapsToday, limit: DAILY_TAPS });
});

app.post("/api/super", (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ ok: false });

  const u = (users[userId] ||= {
    team: null,
    tapsDate: null,
    tapsToday: 0,
    superDate: null,
    superUsed: 0,
    starsDonated: 0,
    bonusStars: 0,
  });
  if (!u.team) return res.status(400).json({ ok: false });

  const today = todayStr();
  if (u.superDate !== today) {
    u.superDate = today;
    u.superUsed = 0;
  }
  if (u.superUsed >= 1)
    return res.json({ ok: false, error: "limit", limit: 1 });

  u.superUsed++;
  scores[u.team] += SUPER_POINTS;
  writeJSON(USERS_FILE, users);
  writeJSON(SCORES_FILE, scores);
  res.json({ ok: true, scores, superUsed: u.superUsed });
});

app.post("/api/create-invoice", async (req, res) => {
  try {
    const { userId, team, stars } = req.body;
    if (!userId || !team || !stars) return res.status(400).json({ ok: false });

    const payload = { userId, team, stars, type: "donation" };
    const invoice = await tgPost("createInvoiceLink", {
      title: "TeamBattle Stars Donation",
      description: `Donate ${stars}⭐ to ${team}`,
      payload: JSON.stringify(payload).slice(0, 128),
      currency: "XTR",
      prices: [{ label: "Stars", amount: Math.floor(stars) }],
    });

    res.json({ ok: true, url: invoice?.data?.result });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ================== TELEGRAM WEBHOOK ==================
app.post("/webhook", async (req, res) => {
  try {
    const update = req.body;

    // ===== /start =====
    if (update.message?.text?.startsWith("/start")) {
      const chatId = update.message.chat.id;
      const lang = update.message.from.language_code || "en";
      const L = LANGS[lang] || LANGS.en;

      await tgPost("sendMessage", {
        chat_id: chatId,
        text: L.welcome,
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [
              { text: L.play, web_app: { url: MINI_APP_URL } },
              { text: L.donate, callback_data: "donate" },
            ],
            [{ text: L.change, callback_data: "change_lang" }],
          ],
        },
      });
    }

    // ===== CALLBACK =====
    if (update.callback_query) {
      const cq = update.callback_query;
      const chatId = cq.message.chat.id;
      const data = cq.data;

      if (data === "donate") {
        await tgPost("sendMessage", {
          chat_id: chatId,
          text: "💫 Enter the number of stars you want to donate in the mini app.",
        });
      }

      if (data === "change_lang") {
        await tgPost("editMessageText", {
          chat_id: chatId,
          message_id: cq.message.message_id,
          text: "🌍 Choose your language:",
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

      if (data.startsWith("lang_")) {
        const chosen = data.replace("lang_", "");
        const L = LANGS[chosen];
        await tgPost("editMessageText", {
          chat_id: chatId,
          message_id: cq.message.message_id,
          text: L.welcome,
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [
                { text: L.play, web_app: { url: MINI_APP_URL } },
                { text: L.donate, callback_data: "donate" },
              ],
              [{ text: L.change, callback_data: "change_lang" }],
            ],
          },
        });
      }
    }

    res.send("OK");
  } catch (err) {
    console.error("❌ Webhook handler error:", err.message);
    res.send("OK");
  }
});

// ================== SETUP WEBHOOK ==================
app.get("/setup-webhook", async (_, res) => {
  const url = `${WEBHOOK_DOMAIN}/webhook`;
  const r = await tgPost("setWebhook", { url });
  res.json(r?.data || { ok: false });
});

// ================== FRONTEND ==================
app.use(express.static(path.join(__dirname, "public")));
app.get("*", (_, res) =>
  res.sendFile(path.join(__dirname, "public", "index.html"))
);

// ================== RUN ==================
app.listen(process.env.PORT || 3000, () =>
  console.log("✅ TeamBattle Premium running on port 3000")
);
