// ================== server.js ==================
const express = require("express");
const axios = require("axios");
const path = require("path");
const fs = require("fs");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json({ type: ["application/json", "text/json"], limit: "1mb" }));
app.use(express.urlencoded({ extended: false }));

// ====== CONFIG ======
// אתה כבר הגדרת ENV ב-Render, לא נוגע בזה
const BOT_TOKEN       = process.env.BOT_TOKEN;
const TG_API          = `https://api.telegram.org/bot${BOT_TOKEN}`;
const WEBHOOK_DOMAIN  = process.env.WEBHOOK_DOMAIN;
const MINI_APP_URL    = process.env.MINI_APP_URL;
const DATA_DIR        = process.env.DATA_DIR || "/data"; // דיסק קבוע ב-Render

// משחק
const STAR_TO_POINTS   = 2;     // 1⭐ = 2 נק'
const SUPER_POINTS     = 25;    // סופר-בוסט
const DAILY_TAPS       = 300;   // מגבלת טאפים ליום
const AFFILIATE_BONUS  = 0.10;  // 10% כוכבים למזמין

// ====== JSON Storage to /data ======
if (!fs.existsSync(DATA_DIR)) {
  try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch {}
}
const SCORES_FILE = path.join(DATA_DIR, "scores.json");
const USERS_FILE  = path.join(DATA_DIR, "users.json");

function readJSON(file, fallback) {
  try {
    if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify(fallback, null, 2));
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}
function writeJSON(file, data) {
  try { fs.writeFileSync(file, JSON.stringify(data, null, 2)); }
  catch (e) { console.error("writeJSON error:", e.message); }
}
const todayStr = () => new Date().toISOString().slice(0,10);
const nowTs = () => Date.now();

let scores = readJSON(SCORES_FILE, { israel: 0, gaza: 0 });
let users  = readJSON(USERS_FILE,  {}); // userId -> profile

// ====== helpers ======
function ensureUser(userId) {
  if (!users[userId]) {
    users[userId] = {
      team: null,
      tapsDate: null,
      tapsToday: 0,
      superDate: null,
      superUsed: 0,
      refBy: null,
      starsDonated: 0,
      bonusStars: 0,
      username: null,
      first_name: null,
      last_name: null,
      displayName: null,
      history: [], // {ts,type,stars,points,team,from}
    };
  }
  return users[userId];
}

function updateUserProfileFromTG(from) {
  if (!from?.id) return;
  const uid = String(from.id);
  const u = ensureUser(uid);
  if (from.username) u.username = from.username;
  if (from.first_name !== undefined) u.first_name = from.first_name;
  if (from.last_name  !== undefined) u.last_name  = from.last_name;
  const fn = u.first_name || "";
  const ln = u.last_name || "";
  u.displayName = (fn || ln) ? `${fn} ${ln}`.trim() : (u.username ? `@${u.username}` : u.displayName);
  writeJSON(USERS_FILE, users);
}

const tgPost = (m, d) =>
  axios.post(`${TG_API}/${m}`, d).catch(e => {
    console.error("TG error:", e?.response?.data || e.message);
  });

// ================== API (Mini App) ==================
app.get("/api/state", (_, res) => res.json({ ok: true, scores }));

app.post("/api/select-team", (req, res) => {
  const { userId, team } = req.body || {};
  if (!userId || !["israel","gaza"].includes(team)) return res.status(400).json({ ok:false });
  const u = ensureUser(userId);
  u.team = team;
  writeJSON(USERS_FILE, users);
  res.json({ ok:true });
});

app.post("/api/switch-team", (req, res) => {
  const { userId, newTeam } = req.body || {};
  if (!userId || !["israel","gaza"].includes(newTeam)) return res.status(400).json({ ok:false });
  const u = ensureUser(userId);
  u.team = newTeam;
  writeJSON(USERS_FILE, users);
  res.json({ ok:true, team:newTeam });
});

app.post("/api/tap", (req, res) => {
  const { userId } = req.body || {};
  if (!userId) return res.status(400).json({ ok:false, error:"no userId" });
  const u = ensureUser(userId);
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

app.post("/api/super", (req, res) => {
  const { userId } = req.body || {};
  if (!userId) return res.status(400).json({ ok:false, error:"no userId" });
  const u = ensureUser(userId);
  if (!u.team) return res.status(400).json({ ok:false, error:"no team" });
  const today = todayStr();
  if (u.superDate !== today) { u.superDate = today; u.superUsed = 0; }
  if (u.superUsed >= 1) return res.json({ ok:false, error:"limit", limit:1 });
  u.superUsed += 1;
  scores[u.team] = (scores[u.team] || 0) + SUPER_POINTS;
  u.history.push({ ts: nowTs(), type: "super", points: SUPER_POINTS, team: u.team });
  if (u.history.length > 200) u.history.shift();
  writeJSON(USERS_FILE, users);
  writeJSON(SCORES_FILE, scores);
  res.json({ ok:true, scores, superUsed: u.superUsed, limit:1 });
});

// תרומה (Stars) – createInvoiceLink כפי שעבד לך
app.post("/api/create-invoice", async (req, res) => {
  try {
    const { userId, team, stars } = req.body || {};
    if (!userId || !team || !["israel","gaza"].includes(team) || !stars || stars < 1)
      return res.status(400).json({ ok:false, error:"bad params" });

    const u = ensureUser(userId);
    if (!u.team) u.team = team;

    const payload = { t:"donation", userId, team, stars };
    console.log("🧾 Creating Stars invoice:", payload);

    const r = await axios.post(`${TG_API}/createInvoiceLink`, {
      title: "TeamBattle Boost",
      description: `Donate ${stars}⭐ to ${team}`,
      payload: JSON.stringify(payload).slice(0,128),
      currency: "XTR", // Stars
      prices: [{ label: "Stars", amount: Math.floor(stars) }], // 1 = ⭐
    });

    console.log("🔗 createInvoiceLink resp:", r.data);
    if (!r.data?.ok) return res.status(500).json({ ok:false, error:r.data });
    res.json({ ok:true, url:r.data.result });
  } catch (e) {
    console.error("create-invoice", e?.response?.data || e.message);
    res.status(500).json({ ok:false, error:e.message });
  }
});

app.get("/api/me", (req, res) => {
  const userId = String(req.query.userId || "");
  if (!userId) return res.json({ ok:false });
  const u = ensureUser(userId);
  const today = todayStr();
  if (u.tapsDate !== today) { u.tapsDate = today; u.tapsToday = 0; }
  res.json({
    ok: true,
    me: {
      userId,
      team: u.team,
      tapsToday: u.tapsToday || 0,
      superUsed: u.superUsed || 0,
      starsDonated: u.starsDonated || 0,
      bonusStars: u.bonusStars || 0,
      displayName: u.displayName || null,
      username: u.username || null,
      history: (u.history || []).slice(-50),
    },
    limit: DAILY_TAPS,
  });
});

app.get("/api/leaderboard", (req, res) => {
  const arr = Object.entries(users).map(([id, u]) => ({
    userId: id,
    team: u.team || null,
    starsDonated: u.starsDonated || 0,
    bonusStars: u.bonusStars || 0,
    displayName: u.displayName || null,
    username: u.username || null,
    points: ((u.starsDonated || 0) + (u.bonusStars || 0)) * STAR_TO_POINTS,
  }));
  arr.sort((a, b) => b.points - a.points);
  res.json({ ok:true, top: arr.slice(0, 20) });
});

// סטטי של המיני־אפ
app.use(express.static(path.join(__dirname, "public")));

// ================== Telegram Webhook ==================
app.post("/webhook", async (req, res) => {
  try {
    const update = req.body;

    if (update.message?.from) updateUserProfileFromTG(update.message.from);
    if (update.callback_query?.from) updateUserProfileFromTG(update.callback_query.from);

    if (update.pre_checkout_query) {
      await tgPost("answerPreCheckoutQuery", {
        pre_checkout_query_id: update.pre_checkout_query.id,
        ok: true,
      });
    }

    if (update.message?.successful_payment) {
      const sp = update.message.successful_payment;
      const userId = String(update.message.from.id);
      const stars = sp.total_amount; // XTR: 1 = ⭐
      let payload = {};
      try { payload = JSON.parse(sp.invoice_payload || "{}"); } catch {}

      const u = ensureUser(userId);
      const team = u.team || payload.team || "israel";
      const pts  = stars * STAR_TO_POINTS;

      scores[team] = (scores[team] || 0) + pts;
      u.starsDonated += stars;
      u.history.push({ ts: nowTs(), type:"donation", stars, points: pts, team });
      if (u.history.length > 200) u.history.shift();

      if (u.refBy) {
        const inviterId  = String(u.refBy);
        const inv = ensureUser(inviterId);
        const bonusStars = Math.floor(stars * AFFILIATE_BONUS);
        if (bonusStars > 0) {
          inv.bonusStars += bonusStars;
          const bonusPts = bonusStars * STAR_TO_POINTS;
          const inviterTeam = inv.team || team;
          scores[inviterTeam] = (scores[inviterTeam] || 0) + bonusPts;
          inv.history.push({ ts: nowTs(), type:"affiliate_bonus", stars: bonusStars, points: bonusPts, from: userId, team: inviterTeam });
          if (inv.history.length > 200) inv.history.shift();
        }
      }

      writeJSON(USERS_FILE, users);
      writeJSON(SCORES_FILE, scores);

      await tgPost("sendMessage", {
        chat_id: userId,
        text: `✅ תודה! נתרמו ${stars}⭐ → +${pts} נק' ל${team}.`,
      });
    }

    if (update.message?.text) {
      const chatId = update.message.chat.id;
      const text   = (update.message.text || "").trim();
      const userId = String(update.message.from.id);

      const parts = text.split(" ");
      if (parts[1] && parts[1].startsWith("ref_")) {
        const refBy = parts[1].slice(4);
        const u = ensureUser(userId);
        if (!u.refBy && refBy !== userId) {
          u.refBy = refBy;
          writeJSON(USERS_FILE, users);
        }
      }

      if (text.startsWith("/start")) {
        await tgPost("sendMessage", {
          chat_id: chatId,
          text: "Welcome to *TeamBattle – Israel vs Gaza* 🇮🇱⚔️🇵🇸\n\nChoose your language:",
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [[
              { text: "🇬🇧 EN", callback_data: "lang_en" },
              { text: "🇮🇱 HE", callback_data: "lang_he" },
              { text: "🇵🇸 AR", callback_data: "lang_ar" },
            ]],
          },
        });
      }
    }

    if (update.callback_query) {
      const cq = update.callback_query;
      const chatId = cq.message.chat.id;
      const data = cq.data;

      if (data === "back_lang") {
        await tgPost("sendMessage", {
          chat_id: chatId,
          text: "Choose your language:",
          reply_markup: {
            inline_keyboard: [[
              { text: "🇬🇧 EN", callback_data: "lang_en" },
              { text: "🇮🇱 HE", callback_data: "lang_he" },
              { text: "🇵🇸 AR", callback_data: "lang_ar" },
            ]],
          },
        });
        await tgPost("answerCallbackQuery", { callback_query_id: cq.id });
      } else if (data === "lang_en" || data === "lang_he" || data === "lang_ar") {
        const LANGS = {
          en: {
            msg:
              "Welcome to *TeamBattle – Israel vs Gaza* 🇮🇱⚔️🇵🇸\n" +
              "Pick a side, tap to boost, donate Stars for real points, and climb the board!\n\n" +
              "💥 300 taps/day • ⚡ Super Boost (+25) once/day • ⭐ 1 Star = 2 pts • 🤝 10% affiliate bonus.",
            play: "🚀 Open Game (Mini App)",
            change: "🌐 Change language",
          },
          he: {
            msg:
              "ברוך הבא ל־*TeamBattle – ישראל נגד עזה* 🇮🇱⚔️🇵🇸\n" +
              "בחר צד, בצע טאפים, תרום כוכבים לנקודות אמיתיות וטפס בטבלה!\n\n" +
              "💥 300 טאפים ביום • ⚡ סופר־בוסט (+25) פעם ביום • ⭐ כוכב = 2 נק' • 🤝 בונוס שותפים 10%.",
            play: "🚀 פתח משחק (מיני-אפ)",
            change: "🌐 שינוי שפה",
          },
          ar: {
            msg:
              "مرحبًا بك في *TeamBattle – إسرائيل ضد غزة* 🇮🇱⚔️🇵🇸\n" +
              "اختر فريقك، انقر للتعزيز، تبرّع بالنجوم لنقاط حقيقية وتصدّر الترتيب!\n\n" +
              "💥 ٣٠٠ نقرة/يوم • ⚡ سوبر (+25) مرة/يوم • ⭐ النجمة = نقطتان • 🤝 مكافأة إحالة ١٠٪.",
            play: "🚀 افتح اللعبة (ميني آب)",
            change: "🌐 تغيير اللغة",
          },
        };
        const key = data.replace("lang_", "");
        const chosen = LANGS[key] || LANGS.en;

        await tgPost("sendMessage", {
          chat_id: chatId,
          text: chosen.msg,
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [{ text: chosen.play, web_app: { url: MINI_APP_URL } }],
              [{ text: chosen.change, callback_data: "back_lang" }],
            ],
          },
        });
        await tgPost("answerCallbackQuery", { callback_query_id: cq.id });
      }
    }

    res.status(200).send("OK");
  } catch (err) {
    console.error("Webhook error:", err?.response?.data || err.message);
    res.status(200).send("OK");
  }
});

// בריאות + webhook helper
app.get("/webhook", (_, res) => res.status(405).json({ ok:true }));
app.get("/healthz", (_, res) => res.json({ ok:true }));

app.get("/setup-webhook", async (_, res) => {
  try {
    const url = `${WEBHOOK_DOMAIN}/webhook`;
    const r = await axios.post(`${TG_API}/setWebhook`, {
      url,
      allowed_updates: ["message","callback_query","pre_checkout_query","successful_payment"],
    });
    res.send(r.data);
  } catch (e) {
    res.status(500).send(e?.response?.data || e.message);
  }
});

// סטטי + fallback
app.get("*", (_, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`✅ Server running on :${PORT} | DATA_DIR=${DATA_DIR}`)
);
