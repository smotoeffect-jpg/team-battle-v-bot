// ================== server.js ==================
// TeamBattle – consolidated server with inline Admin Panel, Double XP scheduler, CSV export,
// and stability guards. Works on Render/Replit. Payments flow is UNCHANGED.

const express = require("express");
const axios = require("axios");
const path = require("path");
const fs = require("fs");
const cors = require("cors");
const FormData = require("form-data");

const app = express();
app.use(cors());
app.use(express.json({ type: ["application/json", "text/json"], limit: "1mb" }));
app.use(express.urlencoded({ extended: false }));

// ====== CONFIG ======
const BOT_TOKEN      = process.env.BOT_TOKEN      || "REPLACE_ME_BOT_TOKEN";
const TG_API         = `https://api.telegram.org/bot${BOT_TOKEN}`;
const WEBHOOK_DOMAIN = process.env.WEBHOOK_DOMAIN || "https://team-battle-v-bot.onrender.com";
const MINI_APP_URL   = process.env.MINI_APP_URL   || "https://team-battle-v-bot.onrender.com/";
const DATA_DIR       = process.env.DATA_DIR       || "/data"; // Render Disk

// משחק
const STAR_TO_POINTS  = 2;
const SUPER_POINTS    = 25;
const DAILY_TAPS      = 300;
const AFFILIATE_BONUS = 0.10; // (שמורה לעתיד; אין חישוב אוטומטי כרגע)

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
const AMETA_FILE  = path.join(DATA_DIR, "admin_meta.json"); // per-admin prefs (e.g. lang, awaiting)
const TEXTS_FILE  = path.join(DATA_DIR, "texts.json");      // panel i18n texts
const DXP_FILE    = path.join(DATA_DIR, "doublexp.json");   // double xp state

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

let scores    = readJSON(SCORES_FILE, { israel: 0, gaza: 0 });
let users     = readJSON(USERS_FILE,  {});   // userId -> profile
let admins    = readJSON(ADMINS_FILE, ["7366892099","6081158942","7586749848"]);
let adminMeta = readJSON(AMETA_FILE, {}); // { userId: { lang:"en"|"he", awaiting:null|"broadcast" } }
let doubleXP  = readJSON(DXP_FILE,    { on:false, endTs:0, dailyHourUTC:18, dailyEnabled:true, durationMin:60 });

// Super Admins (קבועים בקוד; רק הם יכולים להוסיף/להסיר אדמינים)
const SUPER_ADMINS = new Set(["7366892099","6081158942","7586749848"]);

// ====== Panel texts DEFAULT (with functions) ======
const PANEL_TEXTS_DEFAULT = {
  en: {
    title:      () => "*🛠️ TeamBattle – Admin Panel*",
    section:    (label) => `*${label}*`,
    menu_summary: "📊 Global summary",
    menu_users: "👥 Users list",
    menu_bonuses: "🎁 Bonuses & resets",
    menu_broadcast: "📢 Broadcast message",
    menu_admins: "👑 Manage admins",
    menu_language: "🌐 Language / שפה",
    menu_dxp: "⚡ Double XP",
    back: "⬅️ Back",
    unauthorized: "❌ You don’t have access to this panel.",
    summary_line: (scores, usersCount) =>
      `🇮🇱 ${scores.israel||0}  |  🇵🇸 ${scores.gaza||0}\n👥 Users: ${usersCount}`,
    users_title: (active, inactive, total) =>
      `👥 Users list\nActive: ${active}\nInactive: ${inactive}\nTotal registered: ${total}`,
    users_export: "📤 Export CSV",
    users_export_sending: "⏳ Preparing CSV…",
    users_export_done: "✅ CSV sent.",
    bonuses_title: "🎁 Bonuses & resets",
    reset_daily: "♻️ Reset daily limits (all)",
    reset_super: "♻️ Reset super-boost (all)",
    bonus_israel: "➕ +25 to 🇮🇱",
    bonus_gaza: "➕ +25 to 🇵🇸",
    done: "✅ Done.",
    ask_broadcast: "📢 Send the message you want to broadcast.\n(Reply in this chat)",
    bc_started: "⏳ Broadcasting…",
    bc_done: (ok,fail)=>`✅ Sent: ${ok}  |  ❌ Failed: ${fail}`,
    admins_title: "👑 Manage admins",
    admins_list: (arr)=>`Current admins:\n${arr.map(a=>`• ${a}`).join("\n") || "(none)"}`,
    admins_help: "Commands:\n/addadmin <userId>\n/rmadmin <userId>\n(Only Super Admins)",
    lang_set_en: "🌐 Language set to English.",
    lang_set_he: "🌐 השפה הוגדרה לעברית.",
    dxp_title: (d)=>`⚡ Double XP\nStatus: ${d.on?"ON":"OFF"}\nDaily UTC hour: ${d.dailyHourUTC} | duration: ${d.durationMin}m`,
    dxp_start: "▶️ Start now",
    dxp_stop:  "⏹ Stop",
    dxp_toggle_daily: (on)=> on ? "🕒 Disable daily" : "🕒 Enable daily",
    dxp_hour_plus: "⏫ Hour +",
    dxp_hour_minus:"⏬ Hour −",
    dxp_duration_plus: "➕ Duration +15m",
    dxp_duration_minus:"➖ Duration −15m",
    dxp_started_all: "⚡ Double XP is live now! Earn 2× XP for the next hour!",
    dxp_ended_all: "🔕 Double XP has ended. See you next time!",
    csv_header: "Name,Username,ID,Language,Country"
  },
  he: {
    title:      () => "*🛠️ פאנל ניהול – TeamBattle*",
    section:    (label) => `*${label}*`,
    menu_summary: "📊 סיכום כללי",
    menu_users: "👥 רשימת משתמשים",
    menu_bonuses: "🎁 בונוסים ואיפוסים",
    menu_broadcast: "📢 שליחת הודעה",
    menu_admins: "👑 ניהול מנהלים",
    menu_language: "🌐 שפה / Language",
    menu_dxp: "⚡ ניהול Double XP",
    back: "⬅️ חזרה",
    unauthorized: "❌ אין לך גישה לפאנל הניהול.",
    summary_line: (scores, usersCount) =>
      `🇮🇱 ${scores.israel||0}  |  🇵🇸 ${scores.gaza||0}\n👥 משתמשים: ${usersCount}`,
    users_title: (active, inactive, total) =>
      `👥 רשימת משתמשים\nמחוברים: ${active}\nלא פעילים: ${inactive}\nרשומים: ${total}`,
    users_export: "📤 ייצוא CSV",
    users_export_sending: "⏳ מכין CSV…",
    users_export_done: "✅ נשלח.",
    bonuses_title: "🎁 בונוסים ואיפוסים",
    reset_daily: "♻️ איפוס מגבלות יומיות (לכולם)",
    reset_super: "♻️ איפוס סופר־בוסט (לכולם)",
    bonus_israel: "➕ +25 ל🇮🇱",
    bonus_gaza: "➕ +25 ל🇵🇸",
    done: "✅ בוצע.",
    ask_broadcast: "📢 שלח את ההודעה לשידור.\n(ענה בהודעה הזו)",
    bc_started: "⏳ משדר…",
    bc_done: (ok,fail)=>`✅ נשלחו: ${ok}  |  ❌ נכשלו: ${fail}`,
    admins_title: "👑 ניהול מנהלים",
    admins_list: (arr)=>`מנהלים:\n${arr.map(a=>`• ${a}`).join("\n") || "(אין)"}`,
    admins_help: "פקודות:\n/addadmin <userId>\n/rmadmin <userId>\n(סופר־אדמין בלבד)",
    lang_set_en: "🌐 Language set to English.",
    lang_set_he: "🌐 השפה הוגדרה לעברית.",
    dxp_title: (d)=>`⚡ ניהול Double XP\nמצב: ${d.on?"פעיל":"כבוי"}\nשעה יומית (UTC): ${d.dailyHourUTC} | משך: ${d.durationMin}דק`,
    dxp_start: "▶️ התחלה עכשיו",
    dxp_stop:  "⏹ עצירה",
    dxp_toggle_daily: (on)=> on ? "🕒 כבה תזמון יומי" : "🕒 הפעל תזמון יומי",
    dxp_hour_plus: "⏫ שעה +",
    dxp_hour_minus:"⏬ שעה −",
    dxp_duration_plus: "➕ משך +15דק",
    dxp_duration_minus:"➖ משך −15דק",
    dxp_started_all: "⚡ אקספי מוכפל יצא לדרך! קבלו 2× XP לשעה הקרובה!",
    dxp_ended_all: "🔕 האקספי המוכפל הסתיים. נתראה בפעם הבאה!",
    csv_header: "Name,Username,ID,Language,Country"
  }
};

// Load texts, but if a file exists with strings instead of functions, reset.
let PANEL_TEXTS = readJSON(TEXTS_FILE, PANEL_TEXTS_DEFAULT);
function textsFileIsValid(obj) {
  try {
    return typeof obj.en?.summary_line === "function"
        && typeof obj.en?.users_title === "function"
        && typeof obj.en?.admins_list === "function"
        && typeof obj.he?.summary_line === "function";
  } catch { return false; }
}
if (!textsFileIsValid(PANEL_TEXTS)) {
  PANEL_TEXTS = PANEL_TEXTS_DEFAULT;
  writeJSON(TEXTS_FILE, PANEL_TEXTS_DEFAULT);
  console.log("texts.json invalid → replaced with defaults (with functions).");
}

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
      xp: 0, level: 1, lastDailyBonus: 0,
      history: [], // {ts,type,stars,points,team,from,xp}
      active: true,
      preferredLang: "he",
      country: "" // unknown by default
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
function addXpAndMaybeLevelUp(u, addXp) {
  if (!addXp) return;
  u.xp += addXp;
  while (u.xp >= u.level * LEVEL_STEP) u.level++;
}
const tgPost = async (m, d) => {
  try {
    return await axios.post(`${TG_API}/${m}`, d);
  } catch (e) {
    if (d?.chat_id && e?.response?.status === 403) {
      const uid = String(d.chat_id);
      if (users[uid]) { users[uid].active = false; writeJSON(USERS_FILE, users); }
    }
    console.error("TG error:", e?.response?.data || e.message);
    throw e;
  }
};

// ---- Parse Telegram init data from header (Mini App) ----
function parseInitDataHeader(req) {
  // Telegram Mini App passes a URL-encoded string in WebApp.initData.
  const raw = req.headers["x-init-data"] || req.headers["x-telegram-init-data"] || "";
  if (!raw || typeof raw !== "string") return {};
  try {
    const sp = new URLSearchParams(raw);
    // 'user' is JSON (quoted); 'start_param' is plain.
    let userId = null;
    if (sp.get("user")) {
      const userObj = JSON.parse(sp.get("user"));
      if (userObj?.id) userId = String(userObj.id);
    }
    const startParam = sp.get("start_param") || null;
    return { userId, startParam };
  } catch {
    return {};
  }
}
function getUserIdFromReq(req) {
  const q = String(req.query.userId || req.query.user_id || "");
  if (q) return q;
  const { userId } = parseInitDataHeader(req);
  return userId || "";
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
  adminMeta[uid].awaiting = what;
  writeJSON(AMETA_FILE, adminMeta);
}
// ====== Double XP helpers ======
function isDoubleXPOn() {
  return doubleXP.on && doubleXP.endTs > Date.now();
}
async function setDoubleXP(on, durationMin = doubleXP.durationMin) {
  if (on) {
    doubleXP.on = true;
    doubleXP.endTs = Date.now() + (durationMin*60*1000);
  } else {
    doubleXP.on = false;
    doubleXP.endTs = 0;
  }
  writeJSON(DXP_FILE, doubleXP);
}
async function broadcastToAllByLang(textsPerLang) {
  let ok=0, fail=0;
  for (const [id, u] of Object.entries(users)) {
    if (!u.active) continue;
    const lang = (u.preferredLang==="he"||u.preferredLang==="en")?u.preferredLang:"en";
    const msg = textsPerLang[lang] || textsPerLang["en"];
    try {
      await tgPost("sendMessage", { chat_id: id, text: msg });
      ok++;
    } catch { fail++; }
  }
  return { ok, fail };
}

// ====== Mini-App API ======
app.get("/api/state", (_, res) => res.json({ ok: true, scores, doubleXP: { on: isDoubleXPOn() } }));

app.post("/api/select-team", (req, res) => {
  const userId = getUserIdFromReq(req) || String(req.body?.userId || "");
  const team   = req.body?.team;
  if (!userId || !["israel","gaza"].includes(team)) return res.status(400).json({ ok:false });
  const u = ensureUser(userId);
  u.team = team;
  writeJSON(USERS_FILE, users);
  res.json({ ok:true });
});

app.post("/api/switch-team", (req, res) => {
  const userId = getUserIdFromReq(req) || String(req.body?.userId || "");
  const newTeam = req.body?.newTeam;
  if (!userId || !["israel","gaza"].includes(newTeam)) return res.status(400).json({ ok:false });
  const u = ensureUser(userId);
  u.team = newTeam;
  writeJSON(USERS_FILE, users);
  res.json({ ok:true, team:newTeam });
});

app.post("/api/tap", (req, res) => {
  const userId = getUserIdFromReq(req) || String(req.body?.userId || "");
  if (!userId) return res.status(400).json({ ok:false, error:"no userId" });
  const u = ensureUser(userId);
  if (!u.team) return res.status(400).json({ ok:false, error:"no team" });
  const today = todayStr();
  if (u.tapsDate !== today) { u.tapsDate = today; u.tapsToday = 0; }
  if (u.tapsToday >= DAILY_TAPS) return res.json({ ok:false, error:"limit", limit: DAILY_TAPS });
  u.tapsToday += 1;
  scores[u.team] = (scores[u.team] || 0) + 1;
  addXpAndMaybeLevelUp(u, isDoubleXPOn() ? 2 : 1);
  writeJSON(USERS_FILE, users);
  writeJSON(SCORES_FILE, scores);
  res.json({ ok:true, scores, tapsToday: u.tapsToday, limit: DAILY_TAPS, doubleXP: isDoubleXPOn() });
});

app.post("/api/super", (req, res) => {
  const userId = getUserIdFromReq(req) || String(req.body?.userId || "");
  if (!userId) return res.status(400).json({ ok:false, error:"no userId" });
  const u = ensureUser(userId);
  if (!u.team) return res.status(400).json({ ok:false, error:"no team" });
  const today = todayStr();
  if (u.superDate !== today) { u.superDate = today; u.superUsed = 0; }
  if (u.superUsed >= 1) return res.json({ ok:false, error:"limit", limit:1 });
  u.superUsed += 1;
  scores[u.team] = (scores[u.team] || 0) + SUPER_POINTS;
  addXpAndMaybeLevelUp(u, SUPER_POINTS * (isDoubleXPOn()?2:1));
  u.history.push({ ts: nowTs(), type: "super", points: SUPER_POINTS, team: u.team, xp: SUPER_POINTS });
  if (u.history.length > 200) u.history.shift();
  writeJSON(USERS_FILE, users);
  writeJSON(SCORES_FILE, scores);
  res.json({ ok:true, scores, superUsed: u.superUsed, limit:1 });
});

// ====== Stars Payment – DO NOT TOUCH (logic unchanged) ======
app.post("/api/create-invoice", async (req, res) => {
  try {
    // Only *fallback* to header if body missing userId (doesn't change flow)
    const userId = String(req.body?.userId || getUserIdFromReq(req) || "");
    const team   = req.body?.team;
    const stars  = Number(req.body?.stars || 0);
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

// ====== Me & Leaderboard ======
app.get("/api/me", (req, res) => {
  // Prefer header (Mini App), fallback to query
  const { userId: hdrUser, startParam } = parseInitDataHeader(req);
  const userId = String(hdrUser || req.query.userId || req.query.user_id || "");
  if (!userId) return res.json({ ok:false });

  const u = ensureUser(userId);

  // First-touch referral: if came with start_param and not self
  if (startParam && !u.refBy && String(startParam) !== userId) {
    u.refBy = String(startParam);
  }

  const today = todayStr();
  if (u.tapsDate !== today) { u.tapsDate = today; u.tapsToday = 0; }

  // Daily bonus
  let justGotDailyBonus = false;
  const now = nowTs();
  if (u.team && (!u.lastDailyBonus || (now - u.lastDailyBonus) >= DAILY_BONUS_INTERVAL_MS)) {
    scores[u.team] = (scores[u.team] || 0) + DAILY_BONUS_POINTS;
    addXpAndMaybeLevelUp(u, DAILY_BONUS_XP);
    u.lastDailyBonus = now;
    u.history.push({ ts: now, type:"daily_bonus", points: DAILY_BONUS_POINTS, team: u.team, xp: DAILY_BONUS_XP });
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
      preferredLang: u.preferredLang || "he",
      history: (u.history || []).slice(-50),
      refBy: u.refBy || null
    },
    limit: DAILY_TAPS,
    doubleXP: { on: isDoubleXPOn(), endsAt: doubleXP.endTs }
  });
});
// ====== Debug: check Telegram init headers ======
app.use((req, res, next) => {
  if (req.headers["x-init-data"] || req.headers["x-telegram-init-data"]) {
    console.log("📦 Telegram init headers received:", (req.headers["x-init-data"] || req.headers["x-telegram-init-data"]).slice(0,200));
  }
  next();
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
function tFor(lang){ return PANEL_TEXTS[lang] || PANEL_TEXTS.en; }
function panelKeyboard(lang="en") {
  const t = tFor(lang);
  return {
    inline_keyboard: [
      [{ text: t.menu_summary,   callback_data: "panel:summary" }],
      [{ text: t.menu_users,     callback_data: "panel:users" }],
      [{ text: t.menu_bonuses,   callback_data: "panel:bonuses" }],
      [{ text: t.menu_dxp,       callback_data: "panel:dxp" }],
      [{ text: t.menu_broadcast, callback_data: "panel:broadcast" }],
      [{ text: t.menu_admins,    callback_data: "panel:admins" }],
      [{ text: t.menu_language,  callback_data: "panel:lang" }]
    ]
  };
}
async function sendPanel(chatId, lang="en") {
  const t = tFor(lang);
  await tgPost("sendMessage", {
    chat_id: chatId,
    text: t.title(),
    parse_mode: "Markdown",
    reply_markup: panelKeyboard(lang)
  });
}
async function editToMainPanel(msg, lang="en") {
  const t = tFor(lang);
  await tgPost("editMessageText", {
    chat_id: msg.chat.id,
    message_id: msg.message_id,
    text: t.title(),
    parse_mode: "Markdown",
    reply_markup: panelKeyboard(lang)
  });
}

// ====== Webhook ======
app.post("/webhook", async (req, res) => {
  try {
    const update = req.body;

    if (update.message?.from) updateUserProfileFromTG(update.message.from);
    if (update.callback_query?.from) updateUserProfileFromTG(update.callback_query.from);

    // ----- Payments confirmations (NO extra thank-you message here) -----
    if (update.pre_checkout_query) {
      await tgPost("answerPreCheckoutQuery", {
        pre_checkout_query_id: update.pre_checkout_query.id,
        ok: true,
      });
    }

    // ----- Messages -----
    if (update.message?.text) {
      const msg   = update.message;
      const chatId= msg.chat.id;
      const text  = (msg.text || "").trim();
      const uid   = String(msg.from.id);

      // Awaiting broadcast text?
      if (admins.includes(uid) && adminMeta[uid]?.awaiting === "broadcast") {
        const lang = getAdminLang(uid);
        const tt = tFor(lang);
        setAdminAwait(uid, null);
        await tgPost("sendMessage", { chat_id: uid, text: tt.bc_started });

        let ok=0, fail=0;
        for (const [id, u] of Object.entries(users)) {
          if (!u.active) continue;
          try { await tgPost("sendMessage", { chat_id: id, text }); ok++; } catch { fail++; }
        }
        await tgPost("sendMessage", { chat_id: uid, text: tt.bc_done(ok,fail) });
      }

      // /start
      if (text.startsWith("/start")) {
        await tgPost("sendMessage", {
          chat_id: chatId,
          text: "Welcome to *TeamBattle – Israel vs Gaza* 🇮🇱⚔️🇵🇸\n\n*Choose your language:*",
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

      // /panel
      if (text === "/panel") {
        if (!admins.includes(uid)) {
          const tt = tFor(getAdminLang(uid));
          await tgPost("sendMessage", { chat_id: chatId, text: tt.unauthorized });
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

    // ----- Callbacks -----
    if (update.callback_query) {
      const cq   = update.callback_query;
      const uid  = String(cq.from.id);
      const data = cq.data || "";
      const lang = getAdminLang(uid);
      const tt   = tFor(lang);
      const msg  = cq.message;

      // Language selection during /start → store preferredLang
      if (data === "lang_en" || data === "lang_he" || data === "lang_ar") {
        const u = ensureUser(uid);
        u.preferredLang = data === "lang_he" ? "he" : "en";
        writeJSON(USERS_FILE, users);
        await tgPost("answerCallbackQuery", { callback_query_id: cq.id, text: "✅ Language saved" });
      }

      if (data.startsWith("panel:")) {
        if (!admins.includes(uid)) {
          await tgPost("answerCallbackQuery", { callback_query_id: cq.id, text: tt.unauthorized, show_alert: true });
        } else {
          const [, action, extra] = data.split(":");

          if (action === "lang") {
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
              text: `${tt.title()}\n\n${tt.section("Summary")}\n${tt.summary_line(scores, usersCount)}`,
              parse_mode: "Markdown",
              reply_markup: { inline_keyboard: [[{ text: tt.back, callback_data: "panel:main" }]] }
            });
          }

          else if (action === "users") {
            const ids = Object.keys(users);
            const active = ids.filter(id=>users[id].active).length;
            const inactive = ids.length - active;
            const total = ids.length;
            await tgPost("editMessageText", {
              chat_id: msg.chat.id,
              message_id: msg.message_id,
              text: `${tt.title()}\n\n${tt.users_title(active,inactive,total)}`,
              parse_mode: "Markdown",
              reply_markup: { inline_keyboard: [
                [{ text: tt.users_export, callback_data: "panel:users_export" }],
                [{ text: tt.back, callback_data: "panel:main" }]
              ] }
            });
          }

          else if (action === "users_export") {
            await tgPost("answerCallbackQuery", { callback_query_id: cq.id, text: tt.users_export_sending });
            // Build CSV in-memory
            const header = tt.csv_header;
            const rows = [header];
            for (const [id,u] of Object.entries(users)) {
              const name = (u.displayName||"").replace(/,/g," ");
              const un = (u.username?("@"+u.username):"").replace(/,/g," ");
              const langUser = u.preferredLang || "";
              const country = u.country || "";
              rows.push(`${name},${un},${id},${langUser},${country}`);
            }
            const csv = rows.join("\n");
            const buf = Buffer.from(csv, "utf8");

            // sendDocument multipart
            const form = new FormData();
            form.append("chat_id", uid);
            form.append("document", buf, { filename: "users_export.csv", contentType: "text/csv" });

            try {
              await axios.post(`${TG_API}/sendDocument`, form, { headers: form.getHeaders() });
              await tgPost("sendMessage", { chat_id: uid, text: tt.users_export_done });
            } catch (e) {
              console.error("CSV send error:", e?.response?.data || e.message);
            }
          }

          else if (action === "bonuses") {
            await tgPost("editMessageText", {
              chat_id: msg.chat.id,
              message_id: msg.message_id,
              text: `${tt.title()}\n\n${tt.section(tt.bonuses_title)}`,
              parse_mode: "Markdown",
              reply_markup: {
                inline_keyboard: [
                  [{ text: tt.reset_daily, callback_data: "panel:reset_daily" }],
                  [{ text: tt.reset_super, callback_data: "panel:reset_super" }],
                  [
                    { text: tt.bonus_israel, callback_data: "panel:bonus:israel" },
                    { text: tt.bonus_gaza,   callback_data: "panel:bonus:gaza" }
                  ],
                  [{ text: tt.back, callback_data: "panel:main" }]
                ]
              }
            });
          }

          else if (action === "reset_daily") {
            const today = todayStr();
            for (const k of Object.keys(users)) {
              const u = users[k];
              u.tapsDate = today;
              u.tapsToday = 0;
            }
            writeJSON(USERS_FILE, users);
            await tgPost("answerCallbackQuery", { callback_query_id: cq.id, text: tt.done });
          }

          else if (action === "reset_super") {
            const today = todayStr();
            for (const k of Object.keys(users)) {
              const u = users[k];
              u.superDate = today;
              u.superUsed = 0;
            }
            writeJSON(USERS_FILE, users);
            await tgPost("answerCallbackQuery", { callback_query_id: cq.id, text: tt.done });
          }

          else if (action === "bonus") {
            const team = extra;
            if (team === "israel" || team === "gaza") {
              scores[team] = (scores[team] || 0) + SUPER_POINTS;
              writeJSON(SCORES_FILE, scores);
              await tgPost("answerCallbackQuery", { callback_query_id: cq.id, text: tt.done });
            }
          }

          else if (action === "dxp") {
            await tgPost("editMessageText", {
              chat_id: msg.chat.id,
              message_id: msg.message_id,
              text: `${tt.title()}\n\n${tt.dxp_title(doubleXP)}`,
              parse_mode: "Markdown",
              reply_markup: {
                inline_keyboard: [
                  [
                    { text: tt.dxp_start, callback_data: "panel:dxp_start" },
                    { text: tt.dxp_stop,  callback_data: "panel:dxp_stop" }
                  ],
                  [
                    { text: tt.dxp_hour_minus, callback_data: "panel:dxp_hour:-1" },
                    { text: tt.dxp_hour_plus,  callback_data: "panel:dxp_hour:+1" }
                  ],
                  [
                    { text: tt.dxp_duration_minus, callback_data: "panel:dxp_dur:-15" },
                    { text: tt.dxp_duration_plus,  callback_data: "panel:dxp_dur:+15" }
                  ],
                  [{ text: tt.dxp_toggle_daily(doubleXP.dailyEnabled), callback_data: "panel:dxp_toggle_daily" }],
                  [{ text: tt.back, callback_data: "panel:main" }]
                ]
              }
            });
          }

          else if (action === "dxp_start") {
            await setDoubleXP(true);
            // broadcast
            await broadcastToAllByLang({ he: PANEL_TEXTS.he.dxp_started_all, en: PANEL_TEXTS.en.dxp_started_all });
            await tgPost("answerCallbackQuery", { callback_query_id: cq.id, text: "⚡ ON" });
            await editToMainPanel(msg, lang);
          }

          else if (action === "dxp_stop") {
            await setDoubleXP(false);
            await broadcastToAllByLang({ he: PANEL_TEXTS.he.dxp_ended_all, en: PANEL_TEXTS.en.dxp_ended_all });
            await tgPost("answerCallbackQuery", { callback_query_id: cq.id, text: "⏹ OFF" });
            await editToMainPanel(msg, lang);
          }

          else if (action === "dxp_hour") {
            const delta = Number(extra);
            let h = (Number(doubleXP.dailyHourUTC) + delta) % 24;
            if (h < 0) h += 24;
            doubleXP.dailyHourUTC = h;
            writeJSON(DXP_FILE, doubleXP);
            await tgPost("answerCallbackQuery", { callback_query_id: cq.id, text: `UTC ${h}:00` });
            await editToMainPanel(msg, lang);
          }

          else if (action === "dxp_dur") {
            const delta = Number(extra);
            let m = Math.max(15, (Number(doubleXP.durationMin) + delta));
            doubleXP.durationMin = m;
            writeJSON(DXP_FILE, doubleXP);
            await tgPost("answerCallbackQuery", { callback_query_id: cq.id, text: `${m}m` });
            await editToMainPanel(msg, lang);
          }

          else if (action === "dxp_toggle_daily") {
            doubleXP.dailyEnabled = !doubleXP.dailyEnabled;
            writeJSON(DXP_FILE, doubleXP);
            await tgPost("answerCallbackQuery", { callback_query_id: cq.id, text: doubleXP.dailyEnabled?"🕒 on":"🕒 off" });
            await editToMainPanel(msg, lang);
          }

          else if (action === "broadcast") {
            setAdminAwait(uid, "broadcast");
            await tgPost("editMessageText", {
              chat_id: msg.chat.id,
              message_id: msg.message_id,
              text: `${tt.title()}\n\n${tt.ask_broadcast}`,
              parse_mode: "Markdown",
              reply_markup: { inline_keyboard: [[{ text: tt.back, callback_data: "panel:main" }]] }
            });
          }

          else if (action === "admins") {
            const list = tt.admins_list(admins);
            await tgPost("editMessageText", {
              chat_id: msg.chat.id,
              message_id: msg.message_id,
              text: `${tt.title()}\n\n${tt.section(tt.admins_title)}\n\n${list}\n\n${tt.admins_help}`,
              parse_mode: "Markdown",
              reply_markup: { inline_keyboard: [[{ text: tt.back, callback_data: "panel:main" }]] }
            });
          }

          else if (action === "main") {
            await editToMainPanel(msg, lang);
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
