// ================== server.js ==================
const express = require("express");
const axios = require("axios");
const path = require("path");
const fs = require("fs");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false }));

// ====== CONFIG ======
const BOT_TOKEN = "8366510657:AAEC5for6-8246aKdW6F5w3FPfJ5oWNLCfA"; // שלך
const TG_API = `https://api.telegram.org/bot${BOT_TOKEN}`;
const WEBHOOK_DOMAIN = "https://team-battle-v-bot.onrender.com"; // דומיין Render
const MINI_APP_URL = "https://team-battle-v-bot.onrender.com/";  // עמוד המיני-אפ (index.html)
const WELCOME_IMAGE_URL = "https://files.oaiusercontent.com/file-F362F5C1-B1B9-4E69-B920-02FDECBDC094.jpeg";
// חוקי משחק:
const STAR_TO_POINTS = 2;     // 1⭐ = 2 נק'
const SUPER_POINTS = 25;      // סופר-בוסט
const DAILY_TAPS = 300;       // מגבלת טאפים ליום
const AFFILIATE_BONUS = 0.10; // 10% למזמין

// ====== Files (persist as JSON) ======
const SCORES_FILE = path.join(__dirname, "scores.json");
const USERS_FILE  = path.join(__dirname, "users.json");
function readJSON(file, fallback) {
  try {
    if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify(fallback, null, 2));
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch { return fallback; }
}
function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}
function todayStr() { return new Date().toISOString().slice(0,10); }

// ====== Init storage ======
let scores = readJSON(SCORES_FILE, { israel: 0, gaza: 0 });
let users  = readJSON(USERS_FILE,  {}); // userId: { team, refBy, tapsDate, tapsToday, superDate, superUsed, starsDonated, bonusStars }

// ====== Helpers ======
const tgPost = (method, data) => axios.post(`${TG_API}/${method}`, data);

// ================== API for Mini-App ==================

// מצב נוכחי (למיני-אפ)
app.get("/api/state", (req, res) => {
  res.json({ ok: true, scores });
});

// בחירת קבוצה (נשמרת למשתמש)
app.post("/api/select-team", (req, res) => {
  const { userId, team } = req.body;
  if (!userId || !["israel","gaza"].includes(team)) return res.status(400).json({ ok:false });
  if (!users[userId]) users[userId] = { team: null, refBy:null, tapsDate:null, tapsToday:0, superDate:null, superUsed:0, starsDonated:0, bonusStars:0 };
  users[userId].team = team;
  writeJSON(USERS_FILE, users);
  res.json({ ok: true });
});

// טאפ רגיל (+1) עם מגבלת 300 ליום (נשמר בשרת ומעלה ניקוד גלובלי)
app.post("/api/tap", (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ ok:false, error:"no userId" });
  const u = users[userId] || (users[userId] = { team:null, refBy:null, tapsDate:null, tapsToday:0, superDate:null, superUsed:0, starsDonated:0, bonusStars:0 });
  if (!u.team) return res.status(400).json({ ok:false, error:"no team" });

  const today = todayStr();
  if (u.tapsDate !== today) { u.tapsDate = today; u.tapsToday = 0; }
  if (u.tapsToday >= DAILY_TAPS) return res.json({ ok:false, error:"limit", limit: DAILY_TAPS });

  u.tapsToday += 1;
  scores[u.team] = (scores[u.team] || 0) + 1;
  writeJSON(USERS_FILE, users);
  writeJSON(SCORES_FILE, scores);
  res.json({ ok:true, scores, tapsToday: u.tapsToday, limit: DAILY_TAPS });
});

// סופר-בוסט (+25) פעם ביום
app.post("/api/super", (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ ok:false, error:"no userId" });
  const u = users[userId] || (users[userId] = { team:null, refBy:null, tapsDate:null, tapsToday:0, superDate:null, superUsed:0, starsDonated:0, bonusStars:0 });
  if (!u.team) return res.status(400).json({ ok:false, error:"no team" });

  const today = todayStr();
  if (u.superDate !== today) { u.superDate = today; u.superUsed = 0; }
  if (u.superUsed >= 1) return res.json({ ok:false, error:"limit", limit:1 });

  u.superUsed += 1;
  scores[u.team] = (scores[u.team] || 0) + SUPER_POINTS;
  writeJSON(USERS_FILE, users);
  writeJSON(SCORES_FILE, scores);
  res.json({ ok:true, scores, superUsed: u.superUsed, limit:1 });
});

// חשבונית ⭐ אמיתית (XTR) – פותח תשלום בתוך המיני-אפ
app.post("/api/create-invoice", async (req, res) => {
  try {
    const { userId, team, stars } = req.body;
    if (!userId || !team || !["israel","gaza"].includes(team) || !stars || stars < 1)
      return res.status(400).json({ ok:false, error:"bad params" });

    // נשמור מי המשתמש (אולי אין עדיין)
    if (!users[userId]) users[userId] = { team, refBy:null, tapsDate:null, tapsToday:0, superDate:null, superUsed:0, starsDonated:0, bonusStars:0 };
    if (!users[userId].team) users[userId].team = team;

    const payloadObj = { t:"donation", userId, team, stars }; // יגיע חזרה ב-successful_payment.invoice_payload
    const tgRes = await tgPost("createInvoiceLink", {
      title: "TeamBattle Boost",
      description: `Donate ${stars}⭐ to ${team}`,
      payload: JSON.stringify(payloadObj).slice(0, 128),
      currency: "XTR",
      prices: [{ label: "Stars", amount: Math.floor(stars) }],
    });
    if (!tgRes.data.ok) return res.status(500).json({ ok:false, error: tgRes.data });
    res.json({ ok:true, url: tgRes.data.result });
  } catch (e) {
    console.error("create-invoice", e?.response?.data || e.message);
    res.status(500).json({ ok:false, error: e.message });
  }
});

// סטטי למיני-אפ
app.use(express.static(path.join(__dirname, "public")));

// ================== Telegram Webhook ==================
app.post("/webhook", async (req, res) => {
  try {
    const update = req.body;

    // אישור תשלום
    if (update.pre_checkout_query) {
      await tgPost("answerPreCheckoutQuery", { pre_checkout_query_id: update.pre_checkout_query.id, ok: true });
    }

    // תשלום הצליח
    if (update.message && update.message.successful_payment) {
      const sp = update.message.successful_payment;
      const userId = String(update.message.from.id);
      const stars = sp.total_amount; // ב־XTR כל 1 = כוכב
      const payloadRaw = sp.invoice_payload || "{}";
      let payload = {};
      try { payload = JSON.parse(payloadRaw); } catch {}

      // נוודא שהמשתמש רשום
      const u = users[userId] || (users[userId] = { team:null, refBy:null, tapsDate:null, tapsToday:0, superDate:null, superUsed:0, starsDonated:0, bonusStars:0 });
      const team = u.team || payload.team || "israel";

      // 1) נקודות לקבוצת התורם
      const pts = stars * STAR_TO_POINTS;
      scores[team] = (scores[team] || 0) + pts;

      // 2) עידכון סטטיסטיקות
      u.starsDonated += stars;

      // 3) בונוס שותפים 10% (למזמין) → נקודות לקבוצה של המזמין (או לקבוצת התורם אם לא ידועה)
      if (u.refBy) {
        const inviterId = String(u.refBy);
        const inv = users[inviterId] || (users[inviterId] = { team:null, refBy:null, tapsDate:null, tapsToday:0, superDate:null, superUsed:0, starsDonated:0, bonusStars:0 });
        const bonusStars = Math.floor(stars * AFFILIATE_BONUS);
        const bonusPts = bonusStars * STAR_TO_POINTS;
        inv.bonusStars += bonusStars;
        const inviterTeam = inv.team || team;
        scores[inviterTeam] = (scores[inviterTeam] || 0) + bonusPts;
      }

      writeJSON(USERS_FILE, users);
      writeJSON(SCORES_FILE, scores);

      // פידבק למשתמש
      await tgPost("sendMessage", {
        chat_id: userId,
        text: `✅ Thanks for your donation of ${stars}⭐ → +${pts} points to ${team}!`,
      });
    }

    // פקודת /start + Referral
    if (update.message && update.message.text) {
      const chatId = update.message.chat.id;
      const userId = String(update.message.from.id);
      const text = update.message.text.trim();

      // מזהה רפרל: /start ref_12345
      const parts = text.split(" ");
      if (parts[1] && parts[1].startsWith("ref_")) {
        const refBy = parts[1].slice(4);
        if (!users[userId]) users[userId] = { team:null, refBy:null, tapsDate:null, tapsToday:0, superDate:null, superUsed:0, starsDonated:0, bonusStars:0 };
        if (!users[userId].refBy && refBy !== userId) {
          users[userId].refBy = refBy;
          writeJSON(USERS_FILE, users);
        }
      }

      if (text.startsWith("/start")) {
        // מסך בחירת שפה עם תמונה וכפתורי שינוי
        await tgPost("sendPhoto", {
          chat_id: chatId,
          photo: WELCOME_IMAGE_URL,
          caption:
            "Welcome to *TeamBattle – Israel vs Gaza* 🇮🇱⚔️🇵🇸\n\nChoose your language:",
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [[
              { text: "🇬🇧 English", callback_data: "lang_en" },
              { text: "🇮🇱 עברית",  callback_data: "lang_he" },
              { text: "🇵🇸 العربية", callback_data: "lang_ar" },
            ]],
          },
        });
      }
    }

    // Callback queries: שינוי שפה → הודעת Welcome בשפה + כפתור פתיחת המיני-אפ
    if (update.callback_query) {
      const cq = update.callback_query;
      const chatId = cq.message.chat.id;
      const messageId = cq.message.message_id;
      const data = cq.data;

      const LANGS = {
        en: {
          caption:
            "Welcome to *TeamBattle – Israel vs Gaza* 🇮🇱⚔️🇵🇸\n\n" +
            "Pick a side, tap to boost, donate Stars for real points, and climb the global board!\n\n" +
            "💥 300 taps/day\n⚡ 1 Super Boost/day (+25)\n⭐ 1 Star = 2 points\n🤝 10% affiliate bonus from your invited friends’ donations.",
          play: "🚀 Start Game (Mini App)",
          change: "🌐 Change language",
        },
        he: {
          caption:
            "ברוך הבא ל־*TeamBattle – ישראל נגד עזה* 🇮🇱⚔️🇵🇸\n\n" +
            "בחר צד, בצע טאפים, תרום כוכבים לנקודות אמיתיות, וטפס בטבלה הגלובלית!\n\n" +
            "💥 300 טאפים ביום\n⚡ סופר־בוסט פעם ביום (+25)\n⭐ כוכב = 2 נק'\n🤝 בונוס 10% מהמוזמנים שלך.",
          play: "🚀 פתח משחק (Mini App)",
          change: "🌐 שינוי שפה",
        },
        ar: {
          caption:
            "مرحبًا بك في *TeamBattle – إسرائيل ضد غزة* 🇮🇱⚔️🇵🇸\n\n" +
            "اختر فريقك، انقر للتعزيز، تبرّع بالنجوم لنقاط حقيقية، وتصدّر الترتيب العالمي!\n\n" +
            "💥 ٣٠٠ نقرة/يوم\n⚡ تعزيز سوبر مرة/يوم (+25)\n⭐ النجمة = نقطتان\n🤝 ١٠٪ مكافأة إحالة من تبرعات المدعوين.",
          play: "🚀 ابدأ اللعب (Mini App)",
          change: "🌐 تغيير اللغة",
        },
      };

      if (data === "lang_en" || data === "lang_he" || data === "lang_ar") {
        const chosen = data === "lang_en" ? LANGS.en : data === "lang_he" ? LANGS.he : LANGS.ar;
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
        await tgPost("answerCallbackQuery", { callback_query_id: cq.id });
      } else if (data === "change_lang") {
        await tgPost("editMessageMedia", {
          chat_id: chatId,
          message_id: messageId,
          media: {
            type: "photo",
            media: WELCOME_IMAGE_URL,
            caption:
              "Welcome to *TeamBattle – Israel vs Gaza* 🇮🇱⚔️🇵🇸\n\nChoose your language:",
            parse_mode: "Markdown",
          },
          reply_markup: {
            inline_keyboard: [[
              { text: "🇬🇧 English", callback_data: "lang_en" },
              { text: "🇮🇱 עברית",  callback_data: "lang_he" },
              { text: "🇵🇸 العربية", callback_data: "lang_ar" },
            ]],
          },
        });
        await tgPost("answerCallbackQuery", { callback_query_id: cq.id });
      }
    }

    res.send("OK");
  } catch (err) {
    console.error("Webhook error:", err?.response?.data || err.message);
    res.send("OK");
  }
});

// Webhook setup (GET)
app.get("/setup-webhook", async (req, res) => {
  try {
    const url = `${WEBHOOK_DOMAIN}/webhook`;
    const r = await tgPost("setWebhook", {
      url,
      allowed_updates: ["message","callback_query","pre_checkout_query","successful_payment"],
    });
    res.send(r.data);
  } catch (err) {
    res.status(500).send(err?.response?.data || err.message);
  }
});

// fallback: mini-app
app.get("*", (_, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// run
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server on :${PORT}`));
