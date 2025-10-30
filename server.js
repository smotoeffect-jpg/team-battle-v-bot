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
const BOT_TOKEN      = process.env.BOT_TOKEN      || "8366510657:AAEC5for6-8246aKdW6F5w3FPfJ5oWNLCfA";
const TG_API         = `https://api.telegram.org/bot${BOT_TOKEN}`;
const WEBHOOK_DOMAIN = process.env.WEBHOOK_DOMAIN || "https://team-battle-v-bot.onrender.com";
const MINI_APP_URL   = process.env.MINI_APP_URL   || "https://team-battle-v-bot.onrender.com/";
const DATA_DIR       = process.env.DATA_DIR       || "/data"; // Render Disk
const DOUBLE_XP_ACTIVE = process.env.DOUBLE_XP === '1'; // 1 => Double XP banner ON

// משחק
const STAR_TO_POINTS  = 2;
const SUPER_POINTS    = 25;
const DAILY_TAPS      = 300;
const AFFILIATE_BONUS = 0.10;

// XP/Levels
const DAILY_BONUS_INTERVAL_MS = 24*60*60*1000;
const DAILY_BONUS_POINTS = 5;
const DAILY_BONUS_XP     = 10;
const LEVEL_STEP         = 100;

// ====== Storage (/data) ======
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const SCORES_FILE = path.join(DATA_DIR, "scores.json");
const USERS_FILE  = path.join(DATA_DIR, "users.json");
const ADMINS_FILE = path.join(DATA_DIR, "admins.json");
const AMETA_FILE  = path.join(DATA_DIR, "admin_meta.json"); // per-admin prefs (lang, awaiting)
const TEXTS_FILE  = path.join(DATA_DIR, "texts.json");      // panel i18n texts
const STATE_FILE  = path.join(DATA_DIR, "state.json");      // runtime state (Double XP)

// ========= helpers: JSON IO =========
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
const nowTs    = () => Date.now();

// ========= load data =========
let scores = readJSON(SCORES_FILE, { israel: 0, gaza: 0 });
let users  = readJSON(USERS_FILE,  {});   // userId -> profile
let admins = readJSON(ADMINS_FILE, ["7366892099","6081158942","7586749848"]); // Admins (כולל סופר)
let adminMeta = readJSON(AMETA_FILE, {}); // { userId: { lang:"en"| "he", awaiting:null|"broadcast" } }
let STATE = readJSON(STATE_FILE, {
  doubleXP: {
    active: false,
    until: 0,                // timestamp ms
    lastStartDay: "",        // YYYY-MM-DD למניעת כפילות יומית
  },
  schedule: {
    hourUTC: 18,             // שעה יומית (UTC) להפעלה אוטומטית
    durationMin: 60
  }
});

// Super Admins: רק הם מנהלים מנהלים
const SUPER_ADMINS = new Set(["7366892099","6081158942","7586749848"]);

// ========= Panel texts (with functions!) =========
const PANEL_TEXTS_DEFAULT = {
  en: {
    panelTitle: "🛠️ TeamBattle – Admin Panel",
    menu_summary: "📊 Global summary",
    menu_users: "👥 Users list",
    menu_bonuses: "🎁 Bonuses & resets",
    menu_broadcast: "📢 Broadcast message",
    menu_admins: "👑 Manage admins",
    menu_language: "🌐 Language / שפה",
    back: "⬅️ Back",
    unauthorized: "❌ You don’t have access to this panel.",

    summary_line: (scores, usersCount) =>
      `🇮🇱 ${scores.israel||0}  |  🇵🇸 ${scores.gaza||0}\n👥 Users: ${usersCount}`,

    users_title: (n) => `👥 Users (${n}) – last 20 IDs`,

    bonuses_title: "🎁 Bonuses & resets",
    reset_daily: "♻️ Reset daily limits (all)",
    reset_super: "♻️ Reset Super-Boost (all)",
    bonus_israel: "➕ +25 to 🇮🇱",
    bonus_gaza: "➕ +25 to 🇵🇸",

    doublexp_title: "⚡ Double XP controls",
    doublexp_status_on: (minLeft)=>`⏱️ Double XP: Active (${minLeft}m left)`,
    doublexp_status_off: (hourUTC,dur)=>`⚡ Double XP is OFF\n🕓 Daily at ${hourUTC}:00 UTC for ${dur}m`,
    doublexp_toggle_on_now: "▶️ Start Double XP (60m)",
    doublexp_toggle_off_now:"⏹ Stop Double XP",
    doublexp_hour_minus: "– hour",
    doublexp_hour_plus:  "+ hour",
    doublexp_show_hour:  (h)=>`Daily hour (UTC): ${h}`,
    done: "✅ Done.",

    ask_broadcast: "📢 Send the message you want to broadcast.\n(Reply in this chat)",
    bc_started: "⏳ Broadcasting…",
    bc_done: (ok,fail)=>`✅ Sent: ${ok}  |  ❌ Failed: ${fail}`,

    admins_title: "👑 Manage admins",
    admins_list: (arr)=>`Current admins:\n${arr.map(a=>`• ${a}`).join("\n") || "(none)"}`,
    admins_help: "Use commands:\n/addadmin <userId>\n/rmadmin <userId>\n(Only Super Admins)",

    lang_set_en: "🌐 Language set to English.",
    lang_set_he: "🌐 השפה הוגדרה לעברית.",

    // broadcasts per user language
    bc_doublexp_start: "⚡ Double XP is live now! Earn 2× XP for the next hour!",
    bc_doublexp_end:   "⏹ Double XP has ended. See you next time!",
  },
  he: {
    panelTitle: "🛠️ פאנל ניהול – TeamBattle",
    menu_summary: "📊 סיכום כללי",
    menu_users: "👥 רשימת משתמשים",
    menu_bonuses: "🎁 בונוסים ואיפוסים",
    menu_broadcast: "📢 שליחת הודעה",
    menu_admins: "👑 ניהול מנהלים",
    menu_language: "🌐 שפה / Language",
    back: "⬅️ חזרה",
    unauthorized: "❌ אין לך גישה לפאנל הניהול.",

    summary_line: (scores, usersCount) =>
      `🇮🇱 ${scores.israel||0}  |  🇵🇸 ${scores.gaza||0}\n👥 משתמשים: ${usersCount}`,

    users_title: (n) => `👥 משתמשים (${n}) – 20 אחרונים`,

    bonuses_title: "🎁 בונוסים ואיפוסים",
    reset_daily: "♻️ איפוס מגבלות יומיות (לכולם)",
    reset_super: "♻️ איפוס סופר־בוסט (לכולם)",
    bonus_israel: "➕ +25 ל🇮🇱",
    bonus_gaza: "➕ +25 ל🇵🇸",

    doublexp_title: "⚡ ניהול Double XP",
    doublexp_status_on: (minLeft)=>`⏱️ Double XP פעיל! (${minLeft} דקות נותרו)`,
    doublexp_status_off: (hourUTC,dur)=>`⚡ Double XP כבוי\n🕓 יומי ב־${hourUTC}:00 (UTC) למשך ${dur} דק׳`,
    doublexp_toggle_on_now: "▶️ התחלת Double XP (60ד׳)",
    doublexp_toggle_off_now:"⏹ עצירת Double XP",
    doublexp_hour_minus: "– שעה",
    doublexp_hour_plus:  "+ שעה",
    doublexp_show_hour:  (h)=>`שעה יומית (UTC): ${h}`,
    done: "✅ בוצע.",

    ask_broadcast: "📢 שלח את ההודעה לשידור.\n(ענה בהודעה הזו)",
    bc_started: "⏳ משדר…",
    bc_done: (ok,fail)=>`✅ נשלחו: ${ok}  |  ❌ נכשלו: ${fail}`,

    admins_title: "👑 ניהול מנהלים",
    admins_list: (arr)=>`מנהלים נוכחיים:\n${arr.map(a=>`• ${a}`).join("\n") || "(אין)"}`,
    admins_help: "פקודות:\n/addadmin <userId>\n/rmadmin <userId>\n(סופר־אדמין בלבד)",

    lang_set_en: "🌐 Language set to English.",
    lang_set_he: "🌐 השפה הוגדרה לעברית.",

    bc_doublexp_start: "⚡ אקספי מוכפל יצא לדרך! קבלו 2× XP לשעה הקרובה!",
    bc_doublexp_end:   "⏹ האקספי המוכפל הסתיים. נתראה בפעם הבאה!",
  },
  ar: {
    // משתמשים בלבד (להודעות שידור), לא לפאנל
    bc_doublexp_start: "⚡ بدأ مضاعفة الخبرة الآن! احصل على 2× XP لمدة ساعة!",
    bc_doublexp_end:   "⏹ انتهى مضاعفة الخبرة. نراكم في المرة القادمة!",
  }
};

// טוענים/מתקנים texts.json — אם התקלקל (למשל הפונקציות הפכו לטקסטים), נשחזר לברירת מחדל עם פונקציות
function ensurePanelTextsFunctions() {
  let raw;
  try { raw = fs.readFileSync(TEXTS_FILE, "utf8"); } catch { raw = null; }
  let ok = false;
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      // אם הגיע קובץ בלי פונקציות (serialized), נשחזר
      if (
        typeof parsed?.en?.summary_line === "string" ||
        typeof parsed?.he?.summary_line === "string" ||
        typeof parsed?.en?.users_title === "string" ||
        typeof parsed?.he?.users_title === "string"
      ) {
        ok = false;
      } else {
        ok = true; // נראה תקין
      }
    } catch {
      ok = false;
    }
  }
  if (!raw || !ok) {
    // כתיבה מחדש של ברירת המחדל (אובייקט – יישמר ללא פונקציות, לכן גם בזיכרון נשתמש במקור)
    writeJSON(TEXTS_FILE, {
      en: { ...PANEL_TEXTS_DEFAULT.en, summary_line: undefined, users_title: undefined, admins_list: undefined },
      he: { ...PANEL_TEXTS_DEFAULT.he, summary_line: undefined, users_title: undefined, admins_list: undefined },
      ar: { ...PANEL_TEXTS_DEFAULT.ar }
    });
  }
}
ensurePanelTextsFunctions();

// בזיכרון נשתמש תמיד ב־PANEL_TEXTS_DEFAULT (מכיל פונקציות)
let PANEL_TEXTS = PANEL_TEXTS_DEFAULT;

// ====== Helpers ======
function ensureUser(userId) {
  if (!users[userId]) {
    users[userId] = {
      team: null,
      tapsDate: null, tapsToday: 0,
      superDate: null, superUsed: 0,
      refBy: null,
      starsDonated: 0,
      bonusStars: 0,
      username: null, first_name: null, last_name: null, displayName: null,
      lang: "en", // שפת המשתמש (לשידורים)
      xp: 0, level: 1, lastDailyBonus: 0,
      history: [], // {ts,type,stars,points,team,from,xp}
      active: true,
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
  u.active = true;
  writeJSON(USERS_FILE, users);
}
function getAdminLang(uid) {
  const meta = adminMeta[uid] || {};
  return meta.lang === "he" ? "he" : "en";
}
function setAdminLang(uid, lang) {
  if (!adminMeta[uid]) adminMeta[uid] = {};
  adminMeta[uid].lang = lang;
  writeJSON(AMETA_FILE, adminMeta);
}
function setAdminAwait(uid, what) {
  if (!adminMeta[uid]) adminMeta[uid] = {};
  adminMeta[uid].awaiting = what; // e.g. 'broadcast' | null
  writeJSON(AMETA_FILE, adminMeta);
}
const tgPost = (m, d) =>
  axios.post(`${TG_API}/${m}`, d).catch(e => {
    // 403 = המשתמש חסם את הבוט
    if (d?.chat_id && e?.response?.status === 403) {
      const uid = String(d.chat_id);
      if (users[uid]) { users[uid].active = false; writeJSON(USERS_FILE, users); }
    }
    console.error("TG error:", e?.response?.data || e.message);
  });

// ====== Double XP helpers ======
function isDoubleXPActive() {
  return STATE.doubleXP.active && nowTs() < STATE.doubleXP.until;
}
function minLeftDoubleXP() {
  if (!isDoubleXPActive()) return 0;
  return Math.max(0, Math.ceil((STATE.doubleXP.until - nowTs()) / 60000));
}
function activateDoubleXP(minutes = STATE.schedule.durationMin || 60, broadcast = true) {
  STATE.doubleXP.active = true;
  STATE.doubleXP.until  = nowTs() + minutes * 60000;
  STATE.doubleXP.lastStartDay = todayStr();
  writeJSON(STATE_FILE, STATE);
  if (broadcast) broadcastDoubleXP("start").catch(()=>{});
}
function stopDoubleXP(broadcast = true) {
  STATE.doubleXP.active = false;
  STATE.doubleXP.until  = 0;
  writeJSON(STATE_FILE, STATE);
  if (broadcast) broadcastDoubleXP("end").catch(()=>{});
}
function xpGain(base) {
  return isDoubleXPActive() ? base * 2 : base;
}

// ====== Broadcast Double XP (multi-lang) ======
async function broadcastDoubleXP(phase /* "start" | "end" */) {
  let ok=0, fail=0;
  for (const [id, u] of Object.entries(users)) {
    if (!u.active) continue;
    const lang = u.lang === "he" ? "he" : (u.lang === "ar" ? "ar" : "en");
    const t = PANEL_TEXTS[lang] || PANEL_TEXTS.en;
    const text = phase === "start" ? t.bc_doublexp_start : t.bc_doublexp_end;
    try {
      await tgPost("sendMessage", { chat_id: id, text });
      ok++;
    } catch { fail++; }
  }
  console.log(`DoubleXP ${phase} broadcast -> ok=${ok}, fail=${fail}`);
}

// ====== Mini-App API ======
app.get("/api/state", (_, res) => res.json({ ok: true, scores, doubleXP: { active:isDoubleXPActive(), minLeft: minLeftDoubleXP() } }));

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
  // XP על טאפ
  const add = xpGain(1);
  u.xp += add;
  while (u.xp >= u.level * LEVEL_STEP) u.level++;

  writeJSON(USERS_FILE, users);
  writeJSON(SCORES_FILE, scores);
  res.json({ ok:true, scores, tapsToday: u.tapsToday, limit: DAILY_TAPS, doubleXP: isDoubleXPActive() });
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

  const add = xpGain(SUPER_POINTS);
  u.xp += add;
  while (u.xp >= u.level * LEVEL_STEP) u.level++;

  u.history.push({ ts: nowTs(), type: "super", points: SUPER_POINTS, team: u.team, xp: add });
  if (u.history.length > 200) u.history.shift();

  writeJSON(USERS_FILE, users);
  writeJSON(SCORES_FILE, scores);
  res.json({ ok:true, scores, superUsed: u.superUsed, limit:1, doubleXP: isDoubleXPActive() });
});

// ====== Stars Payment – UNTOUCHED & STABLE ======
app.post("/api/create-invoice", async (req, res) => {
  try {
    const { userId, team, stars } = req.body || {};
    if (!userId || !team || !["israel","gaza"].includes(team) || !stars || stars < 1)
      return res.status(400).json({ ok:false, error:"bad params" });

    const u = ensureUser(userId);
    if (!u.team) u.team = team;

    const payload = { t:"donation", userId, team, stars };
    const r = await axios.post(`${TG_API}/createInvoiceLink`, {
      title: "TeamBattle Boost",
      description: `Donate ${stars}⭐ to ${team}`,
      payload: JSON.stringify(payload).slice(0,128),
      currency: "XTR",
      prices: [{ label: "Stars", amount: Math.floor(stars) }],
    });
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

  // Daily bonus
  let justGotDailyBonus = false;
  const now = nowTs();
  if (u.team && (!u.lastDailyBonus || (now - u.lastDailyBonus) >= DAILY_BONUS_INTERVAL_MS)) {
    scores[u.team] = (scores[u.team] || 0) + DAILY_BONUS_POINTS;
    const add = xpGain(DAILY_BONUS_XP);
    u.xp += add;
    while (u.xp >= u.level * LEVEL_STEP) u.level++;
    u.lastDailyBonus = now;
    u.history.push({ ts: now, type:"daily_bonus", points: DAILY_BONUS_POINTS, team: u.team, xp: add });
    if (u.history.length > 200) u.history.shift();
    justGotDailyBonus = true;
    writeJSON(SCORES_FILE, scores);
  }
  writeJSON(USERS_FILE, users);

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
      xp: u.xp || 0,
      level: u.level || 1,
      lastDailyBonus: u.lastDailyBonus || 0,
      justGotDailyBonus,
      history: (u.history || []).slice(-50),
      lang: u.lang || "en",
    },
    limit: DAILY_TAPS,
    doubleXP: { active: isDoubleXPActive(), minLeft: minLeftDoubleXP() },
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
    xp: u.xp || 0,
    level: u.level || 1,
  }));
  arr.sort((a, b) => b.points - a.points);
  res.json({ ok:true, top: arr.slice(0, 20) });
});

// ====== Static Mini-App ======
app.use(express.static(path.join(__dirname, "public")));

// ====== Panel (INLINE via bot) ======
function panelKeyboard(lang="en") {
  const t = PANEL_TEXTS[lang] || PANEL_TEXTS.en;
  return {
    inline_keyboard: [
      [{ text: t.menu_summary,   callback_data: "panel:summary" }],
      [{ text: t.menu_users,     callback_data: "panel:users" }],
      [{ text: t.menu_bonuses,   callback_data: "panel:bonuses" }],
      [{ text: t.menu_broadcast, callback_data: "panel:broadcast" }],
      [{ text: t.menu_admins,    callback_data: "panel:admins" }],
      [{ text: t.menu_language,  callback_data: "panel:lang" }]
    ]
  };
}
async function sendPanel(chatId, lang="en") {
  const t = PANEL_TEXTS[lang] || PANEL_TEXTS.en;
  await tgPost("sendMessage", {
    chat_id: chatId,
    text: t.panelTitle,
    reply_markup: panelKeyboard(lang)
  });
}
async function editToMainPanel(msg, lang="en") {
  const t = PANEL_TEXTS[lang] || PANEL_TEXTS.en;
  await tgPost("editMessageText", {
    chat_id: msg.chat.id,
    message_id: msg.message_id,
    text: t.panelTitle,
    reply_markup: panelKeyboard(lang)
  });
}

// ====== Webhook ======
app.post("/webhook", async (req, res) => {
  try {
    const update = req.body;

    if (update.message?.from) updateUserProfileFromTG(update.message.from);
    if (update.callback_query?.from) updateUserProfileFromTG(update.callback_query.from);

    // ----- Payments confirmations -----
    if (update.pre_checkout_query) {
      await tgPost("answerPreCheckoutQuery", {
        pre_checkout_query_id: update.pre_checkout_query.id,
        ok: true,
      });
    }
    if (update.message?.successful_payment) {
      const sp = update.message.successful_payment;
      const userId = String(update.message.from.id);
      const stars = sp.total_amount; // 1 = ⭐
      let payload = {};
      try { payload = JSON.parse(sp.invoice_payload || "{}"); } catch {}
      const u = ensureUser(userId);
      const team = u.team || payload.team || "israel";
      const pts  = stars * STAR_TO_POINTS;

      scores[team] = (scores[team] || 0) + pts;
      u.starsDonated += stars;

      const add = xpGain(pts); // XP לפי נקודות, עם Double XP
      u.xp += add;
      while (u.xp >= u.level * LEVEL_STEP) u.level++;

      u.history.push({ ts: nowTs(), type:"donation", stars, points: pts, team, xp: add });
      if (u.history.length > 200) u.history.shift();

      // affiliate bonus
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
    // (Notice disabled) No post-payment thank-you message.
}

    // ----- Messages -----
    if (update.message?.text) {
      const msg   = update.message;
      const chatId= msg.chat.id;
      const text  = (msg.text || "").trim();
      const uid   = String(msg.from.id);

      // אם אדמין במצב "ממתין לשידור"
      if (admins.includes(uid) && adminMeta[uid]?.awaiting === "broadcast") {
        const lang = getAdminLang(uid);
        const tt = PANEL_TEXTS[lang] || PANEL_TEXTS.en;
        setAdminAwait(uid, null);
        await tgPost("sendMessage", { chat_id: uid, text: tt.bc_started });

        let ok=0, fail=0;
        for (const [id, u] of Object.entries(users)) {
          if (!u.active) continue;
          try {
            await tgPost("sendMessage", { chat_id: id, text });
            ok++;
          } catch { fail++; }
        }
        await tgPost("sendMessage", { chat_id: uid, text: tt.bc_done(ok,fail) });
      }

      // /start — בחירת שפה + כפתור לפתיחת המיני־אפ
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
            ],[
              { text: "🚀 Open Game (Mini App)", web_app: { url: MINI_APP_URL } }
            ]],
          },
        });
      }

      // /panel — פאנל INLINE בבוט
      if (text === "/panel") {
        if (!admins.includes(uid)) {
          const t = PANEL_TEXTS[getAdminLang(uid)] || PANEL_TEXTS.en;
          await tgPost("sendMessage", { chat_id: chatId, text: t.unauthorized });
        } else {
          await sendPanel(chatId, getAdminLang(uid));
        }
      }

      // Admin management commands (Super Admin only)
      if (text.startsWith("/addadmin")) {
        if (SUPER_ADMINS.has(uid)) {
          const parts = text.split(" ").filter(Boolean);
          const target = parts[1] ? String(parts[1]) : null;
          if (target && !admins.includes(target)) {
            admins.push(target); writeJSON(ADMINS_FILE, admins);
            await tgPost("sendMessage", { chat_id: chatId, text: `✅ Added admin ${target}` });
          } else {
            await tgPost("sendMessage", { chat_id: chatId, text: `⚠️ Missing or already admin.` });
          }
        } else {
          await tgPost("sendMessage", { chat_id: chatId, text: `❌ Super Admins only.` });
        }
      }
      if (text.startsWith("/rmadmin")) {
        if (SUPER_ADMINS.has(uid)) {
          const parts = text.split(" ").filter(Boolean);
          const target = parts[1] ? String(parts[1]) : null;
          if (target && admins.includes(target)) {
            admins = admins.filter(a=>a!==target); writeJSON(ADMINS_FILE, admins);
            await tgPost("sendMessage", { chat_id: chatId, text: `✅ Removed admin ${target}` });
          } else {
            await tgPost("sendMessage", { chat_id: chatId, text: `⚠️ Missing or not an admin.` });
          }
        } else {
          await tgPost("sendMessage", { chat_id: chatId, text: `❌ Super Admins only.` });
        }
      }
    }

    // ----- Callbacks (Panel + Language) -----
    if (update.callback_query) {
      const cq   = update.callback_query;
      const uid  = String(cq.from.id);
      const data = cq.data || "";
      const msg  = cq.message;

      // שינוי שפת המשתמש במסך /start
      if (data === "lang_en" || data === "lang_he" || data === "lang_ar") {
        const u = ensureUser(uid);
        u.lang = data === "lang_he" ? "he" : (data === "lang_ar" ? "ar" : "en");
        writeJSON(USERS_FILE, users);
        await tgPost("answerCallbackQuery", { callback_query_id: cq.id, text: `Language set: ${u.lang}` });
      }

      // פאנל
      if (data.startsWith("panel:")) {
        const lang = getAdminLang(uid);
        const t    = PANEL_TEXTS[lang] || PANEL_TEXTS.en;

        if (!admins.includes(uid)) {
          await tgPost("answerCallbackQuery", { callback_query_id: cq.id, text: t.unauthorized, show_alert: true });
        } else {
          const parts = data.split(":"); // e.g. panel:bonuses or panel:dxp:on
          const action = parts[1];

          if (action === "lang") {
            // toggle admin panel language
            const newLang = lang === "he" ? "en" : "he";
            setAdminLang(uid, newLang);
            const tx = newLang === "he" ? PANEL_TEXTS.he.lang_set_he : PANEL_TEXTS.en.lang_set_en;
            await tgPost("answerCallbackQuery", { callback_query_id: cq.id, text: tx });
            await editToMainPanel(msg, newLang);
          }

          else if (action === "summary") {
            const usersCount = Object.keys(users).length;
            await tgPost("editMessageText", {
              chat_id: msg.chat.id,
              message_id: msg.message_id,
              text: `${t.panelTitle}\n\n${t.summary_line(scores, usersCount)}`,
              reply_markup: { inline_keyboard: [[{ text: t.back, callback_data: "panel:main" }]] }
            });
          }

          else if (action === "users") {
            const ids = Object.keys(users);
            const last20 = ids.slice(-20);
            const list = last20.map(id=>{
              const u = users[id];
              const flag = u.team === "israel" ? "🇮🇱" : (u.team === "gaza" ? "🇵🇸" : "❔");
              return `${flag} ${id}`;
            }).join("\n");
            await tgPost("editMessageText", {
              chat_id: msg.chat.id,
              message_id: msg.message_id,
              text: `${t.panelTitle}\n\n${t.users_title(ids.length)}\n\n${list || "(empty)"}`,
              reply_markup: { inline_keyboard: [[{ text: t.back, callback_data: "panel:main" }]] }
            });
          }

          else if (action === "bonuses") {
            // מסך בונוסים מורחב כולל Double XP
            const status = isDoubleXPActive()
              ? t.doublexp_status_on(minLeftDoubleXP())
              : t.doublexp_status_off(STATE.schedule.hourUTC, STATE.schedule.durationMin);
            await tgPost("editMessageText", {
              chat_id: msg.chat.id,
              message_id: msg.message_id,
              text: `${t.panelTitle}\n\n${t.bonuses_title}\n\n${t.doublexp_title}\n${status}\n${t.doublexp_show_hour(STATE.schedule.hourUTC)}`,
              reply_markup: {
                inline_keyboard: [
                  // שורת Double XP מיידי
                  [
                    { text: t.doublexp_toggle_on_now,  callback_data: "panel:dxp:on" },
                    { text: t.doublexp_toggle_off_now, callback_data: "panel:dxp:off" }
                  ],
                  // שינוי שעה יומית
                  [
                    { text: t.doublexp_hour_minus, callback_data: "panel:dxp:hour:-" },
                    { text: t.doublexp_hour_plus,  callback_data: "panel:dxp:hour:+" }
                  ],
                  // כללי
                  [{ text: t.reset_daily, callback_data: "panel:reset_daily" }],
                  [{ text: t.reset_super, callback_data: "panel:reset_super" }],
                  [
                    { text: t.bonus_israel, callback_data: "panel:bonus:israel" },
                    { text: t.bonus_gaza,   callback_data: "panel:bonus:gaza" }
                  ],
                  [{ text: t.back, callback_data: "panel:main" }]
                ]
              }
            });
          }

          else if (action === "reset_daily") {
            // איפוס מגבלות יומיות לכולם
            const today = todayStr();
            for (const _uid of Object.keys(users)) {
              const u = users[_uid];
              u.tapsDate = today;
              u.tapsToday = 0;
              u.superDate = today;
              // לא מאפס סופר כאן — יש כפתור ייעודי
            }
            writeJSON(USERS_FILE, users);
            await tgPost("answerCallbackQuery", { callback_query_id: cq.id, text: t.done });
          }

          else if (action === "reset_super") {
            // איפוס סופר־בוסט לכולם
            const today = todayStr();
            for (const _uid of Object.keys(users)) {
              const u = users[_uid];
              u.superDate = today;
              u.superUsed = 0;
            }
            writeJSON(USERS_FILE, users);
            await tgPost("answerCallbackQuery", { callback_query_id: cq.id, text: t.done });
          }

          else if (action.startsWith("bonus:")) {
            const team = parts[2];
            if (team === "israel" || team === "gaza") {
              scores[team] = (scores[team] || 0) + SUPER_POINTS;
              writeJSON(SCORES_FILE, scores);
              await tgPost("answerCallbackQuery", { callback_query_id: cq.id, text: t.done });
            }
          }

          else if (action === "broadcast") {
            setAdminAwait(uid, "broadcast");
            await tgPost("editMessageText", {
              chat_id: msg.chat.id,
              message_id: msg.message_id,
              text: `${t.panelTitle}\n\n${t.ask_broadcast}`,
              reply_markup: { inline_keyboard: [[{ text: t.back, callback_data: "panel:main" }]] }
            });
          }

          else if (action === "admins") {
            const list = t.admins_list(admins);
            await tgPost("editMessageText", {
              chat_id: msg.chat.id,
              message_id: msg.message_id,
              text: `${t.panelTitle}\n\n${t.admins_title}\n\n${list}\n\n${t.admins_help}`,
              reply_markup: { inline_keyboard: [[{ text: t.back, callback_data: "panel:main" }]] }
            });
          }

          else if (action === "main") {
            await editToMainPanel(msg, lang);
          }

          // ----- Double XP inline controls -----
          else if (action === "dxp") {
            const sub = parts[2]; // on / off / hour
            if (sub === "on") {
              activateDoubleXP(60, true); // שעה
              await tgPost("answerCallbackQuery", { callback_query_id: cq.id, text: t.done });
            } else if (sub === "off") {
              stopDoubleXP(true);
              await tgPost("answerCallbackQuery", { callback_query_id: cq.id, text: t.done });
            } else if (sub === "hour") {
              const dir = parts[3]; // + | -
              if (dir === "+") {
                STATE.schedule.hourUTC = (STATE.schedule.hourUTC + 1) % 24;
              } else if (dir === "-") {
                STATE.schedule.hourUTC = (STATE.schedule.hourUTC + 23) % 24;
              }
              writeJSON(STATE_FILE, STATE);
              await tgPost("answerCallbackQuery", { callback_query_id: cq.id, text: t.done });
            }
          }
        }
      }

      await tgPost("answerCallbackQuery", { callback_query_id: cq.id }).catch(()=>{});
    }

    res.status(200).send("OK");
  } catch (err) {
    console.error("Webhook error:", err?.response?.data || err.message);
    res.status(200).send("OK");
  }
});

// ====== Daily Double XP scheduler (UTC hour) ======
setInterval(() => {
  try {
    const now = new Date();
    const day = now.toISOString().slice(0,10);
    const hourUTC = now.getUTCHours();
    const minute = now.getUTCMinutes();

    // התחלה אוטומטית בתחילת השעה הייעודית, פעם ביום
    if (day !== STATE.doubleXP.lastStartDay && hourUTC === (STATE.schedule.hourUTC|0) && minute === 0) {
      activateDoubleXP(STATE.schedule.durationMin || 60, true);
    }

    // סיום אוטומטי אם הגיע הזמן
    if (STATE.doubleXP.active && nowTs() >= STATE.doubleXP.until) {
      stopDoubleXP(true);
    }
  } catch (e) {
    console.error("doubleXP scheduler error:", e.message);
  }
}, 30 * 1000); // בדיקה כל 30 שניות

// ====== Health & Webhook setup ======
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

// ====== Static fallback ======
app.get("*", (_, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on :${PORT} | DATA_DIR=${DATA_DIR}`));