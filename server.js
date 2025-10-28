// ================== server.js (TeamBattle_Final) ==================
const express = require("express");
const axios = require("axios");
const path = require("path");
const fs = require("fs");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb", type: "*/*" }));
app.use(express.urlencoded({ extended: false }));

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

// ================== API ==================
app.get("/api/state", (_, res) => res.json({ ok: true, scores }));

app.post("/api/select-team", (req, res) => {
  const { userId, team } = req.body;
  if (!userId || !["israel", "gaza"].includes(team))
    return res.status(400).json({ ok: false });

  const u =
    users[userId] ||
    (users[userId] = {
      team: null, refBy: null, tapsDate: null, tapsToday: 0,
      superDate: null, superUsed: 0, starsDonated: 0, bonusStars: 0,
    });

  u.team = team;
  writeJSON(USERS_FILE, users);
  res.json({ ok: true });
});

app.post("/api/tap", (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ ok: false });
  const u =
    users[userId] ||
    (users[userId] = {
      team: null, refBy: null, tapsDate: null, tapsToday: 0,
      superDate: null, superUsed: 0, starsDonated: 0, bonusStars: 0,
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
  const u =
    users[userId] ||
    (users[userId] = {
      team: null, refBy: null, tapsDate: null, tapsToday: 0,
      superDate: null, superUsed: 0, starsDonated: 0, bonusStars: 0,
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
  scores[u.team] = (scores[u.team] || 0) + SUPER_POINTS;
  writeJSON(USERS_FILE, users);
  writeJSON(SCORES_FILE, scores);
  res.json({ ok: true, scores, superUsed: u.superUsed });
});

app.post("/api/create-invoice", async (req, res) => {
  try {
    const { userId, team, stars } = req.body;
    if (!userId || !team || !stars) return res.status(400).json({ ok: false });

    const payload = { t: "donation", userId, team, stars };
    const r = await tgPost("createInvoiceLink", {
      title: "TeamBattle Boost",
      description: `Donate ${stars}⭐ to ${team}`,
      payload: JSON.stringify(payload).slice(0, 128),
      currency: "XTR",
      prices: [{ label: "Stars", amount: Math.floor(stars) }],
    });
    res.json({ ok: true, url: r.data.result });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.use(express.static(path.join(__dirname, "public")));

// ================== WEBHOOK ==================
app.post("/webhook", async (req, res) => {
  try {
    const update = req.body;

    if (update.pre_checkout_query)
      await tgPost("answerPreCheckoutQuery", {
        pre_checkout_query_id: update.pre_checkout_query.id,
        ok: true,
      });

    if (update.message && update.message.successful_payment) {
      const sp = update.message.successful_payment;
      const userId = String(update.message.from.id);
      const stars = sp.total_amount;
      const payload = JSON.parse(sp.invoice_payload || "{}");

      const u =
        users[userId] ||
        (users[userId] = {
          team: null, refBy: null, tapsDate: null, tapsToday: 0,
          superDate: null, superUsed: 0, starsDonated: 0, bonusStars: 0,
        });
      const team = u.team || payload.team || "israel";
      const pts = stars * STAR_TO_POINTS;
      scores[team] = (scores[team] || 0) + pts;
      u.starsDonated += stars;

      if (u.refBy) {
        const invId = String(u.refBy);
        const inv =
          users[invId] ||
          (users[invId] = {
            team: null, refBy: null, tapsDate: null, tapsToday: 0,
            superDate: null, superUsed: 0, starsDonated: 0, bonusStars: 0,
          });
        const bonusStars = Math.floor(stars * AFFILIATE_BONUS);
        inv.bonusStars += bonusStars;
        const bonusPts = bonusStars * STAR_TO_POINTS;
        const teamRef = inv.team || team;
        scores[teamRef] = (scores[teamRef] || 0) + bonusPts;
      }

      writeJSON(USERS_FILE, users);
      writeJSON(SCORES_FILE, scores);
      await tgPost("sendMessage", {
        chat_id: userId,
        text: `✅ Thanks for donating ${stars}⭐ (+${pts} points to ${team})`,
      });
    }

    if (update.message && update.message.text) {
      const chatId = update.message.chat.id;
      const text = update.message.text.trim();
      const userId = String(update.message.from.id);
      if (text.startsWith("/start")) {
        await tgPost("sendPhoto", {
          chat_id: chatId,
          photo: WELCOME_IMAGE_URL,
          caption:
            "Welcome to *TeamBattle – Israel vs Gaza* 🇮🇱⚔️🇵🇸\n\nChoose your language:",
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [[
              { text: "🇬🇧 English", callback_data: "lang_en" },
              { text: "🇮🇱 עברית", callback_data: "lang_he" },
              { text: "🇵🇸 العربية", callback_data: "lang_ar" },
            ]],
          },
        });
      }
    }

    if (update.callback_query) {
      const cq = update.callback_query;
      const chatId = cq.message.chat.id;
      const messageId = cq.message.message_id;
      const data = cq.data;

      const LANGS = {
        he: {
          caption:
            "ברוך הבא ל־*TeamBattle – ישראל נגד עזה* 🇮🇱⚔️🇵🇸\n\nבחר צד, בצע טאפים, תרום כוכבים לנקודות אמיתיות וטפס בטבלה!\n💥 300 טאפים ביום\n⚡ סופר־בוסט פעם ביום (+25)\n⭐ כוכב = 2 נק'\n🤝 בונוס 10% מהמוזמנים שלך.",
          play: "🚀 פתח משחק (Mini App)",
          change: "🌐 שינוי שפה",
        },
        en: {
          caption:
            "Welcome to *TeamBattle – Israel vs Gaza* 🇮🇱⚔️🇵🇸\nPick a side, tap to boost, donate Stars, and climb the leaderboard!\n💥 300 taps/day\n⚡ Super Boost once/day (+25)\n⭐ 1 Star = 2 points\n🤝 10% from your referrals.",
          play: "🚀 Start Game (Mini App)",
          change: "🌐 Change language",
        },
        ar: {
          caption:
            "مرحبًا بك في *TeamBattle – إسرائيل ضد غزة* 🇮🇱⚔️🇵🇸\nاختر فريقك وانقر للتعزيز وتبرع بالنجوم لتتقدم!\n💥 ٣٠٠ نقرة/يوم\n⚡ تعزيز سوبر مرة/يوم (+25)\n⭐ النجمة = نقطتان\n🤝 ١٠٪ من إحالاتك.",
          play: "🚀 ابدأ اللعبة (Mini App)",
          change: "🌐 تغيير اللغة",
        },
      };

      if (LANGS[data.replace("lang_", "")]) {
        const chosen = LANGS[data.replace("lang_", "")];
        await tgPost("editMessageMedia", {
          chat_id: chatId,
          message_id: messageId,
          media: {
            type: "photo",
            media: WELCOME_IMAGE_URL,
            caption: chosen.caption,
            parse_mode: "Markdown",
          },
          reply_markup: {
            inline_keyboard: [
              [{ text: chosen.play, web_app: { url: MINI_APP_URL } }],
              [{ text: chosen.change, callback_data: "change_lang" }],
            ],
          },
        });
      }
    }

    res.send("OK");
  } catch (err) {
    console.error("Webhook error:", err.message);
    res.send("OK");
  }
});

// ====== SETUP ======
app.get("/setup-webhook", async (_, res) => {
  const url = `${WEBHOOK_DOMAIN}/webhook`;
  const r = await tgPost("setWebhook", {
    url,
    allowed_updates: ["message", "callback_query", "pre_checkout_query", "successful_payment"],
  });
  res.send(r.data);
});

app.get("*", (_, res) =>
  res.sendFile(path.join(__dirname, "public", "index.html"))
);

app.listen(process.env.PORT || 3000, () =>
  console.log("✅ Server running on port 3000")
);
