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
// ====== Global Dev Mode Middleware ======
app.use((req, res, next) => {
  if (req.path.startsWith("/api/")) {
    if (settings.dev_mode && !admins.includes(String(req.body.userId || req.query.userId))) {
      return res.status(403).json({ ok: false, error: "🧩 Mini-App under maintenance" });
    }
  }
  next();
});
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

// === BATTLE (virtual token) rules ===
const BATTLE_RULES = {
  PER_TAP: 0.01,       // כל Tap מוסיף 0.01 $BATTLE
  PER_SUPER: 0.25,     // כל Super Boost מוסיף 0.25 $BATTLE
  DAILY_BONUS: 5       // בונוס כניסה יומית
};

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
const DXP_FILE    = path.join(DATA_DIR, "doublexp.json");   // double xp // === NEW SETTINGS FILE ===
const SETTINGS_FILE = path.join(DATA_DIR, "settings.json");

// === REFERRALS FILE ===
const REFERRALS_FILE = path.join(DATA_DIR, "referrals.json");
let referrals = readJSON(REFERRALS_FILE, {});
if (!fs.existsSync(REFERRALS_FILE)) writeJSON(REFERRALS_FILE, {});

// === SETTINGS LOADER ===
function readSettings() {
  if (!fs.existsSync(SETTINGS_FILE)) {
    fs.writeFileSync(
      SETTINGS_FILE,
      JSON.stringify({
        dev_mode: true,
        welcome_message: "ברוך הבא %firstname% ל-TeamBattle!",
        welcome_buttons: [
          [
            { text: "🚀 פתח משחק (Mini App)", web_app: { url: MINI_APP_URL } }
          ],
          [
            { text: "💸 תוכנית שותפים", callback_data: "referral" }
          ]
        ],
        broadcast_draft: { text: "", buttons: [] }
      }, null, 2)
    );
  }
  return JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf8"));
}

let settings = readSettings();
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
// ====== REFERRAL EARNING SYNC ======
function addReferralEarning(referrerId, invitedId) {
  if (!referrerId || !invitedId) return;

  // Update referral file
  if (!referrals[referrerId]) referrals[referrerId] = { invited: [], earnings: 0 };
  if (!referrals[referrerId].invited.includes(invitedId)) {
    referrals[referrerId].invited.push(invitedId);
    referrals[referrerId].earnings += 2; // +2 $Battle per referral
    writeJSON(REFERRALS_FILE, referrals);
  }

  // 🔄 Sync with user's $Battle balance in users.json
  if (users[referrerId]) {
    users[referrerId].battleBalance = (users[referrerId].battleBalance || 0) + 2;
    writeJSON(USERS_FILE, users);
  }
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
    title:      () => "<b>🛠️ TeamBattle – Admin Panel</b>",
    section:    (label) => `<b>${label}</b>`,
    menu_summary: "📊 Global summary",
    menu_users: "👥 Users list",
    menu_bonuses: "🎁 Bonuses & resets",
    menu_welcome: "💬 Welcome Message",
    menu_bc: "📢 Send Message",
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
    csv_header: "Name,Username,ID,Language,Country",
    menu_dev_mode: "🧩 Dev Mode",
    menu_referral_settings: "💸 Referral Settings",
    dev_mode_on: "🧩 Dev Mode: ON",
    dev_mode_off: "🧩 Dev Mode: OFF",
  },
  he: {
    title:      () => "<b>🛠️ פאנל ניהול – TeamBattle</b>",
    section:    (label) => `<b>${label}</b>`,
    menu_summary: "📊 סיכום כללי",
    menu_users: "👥 רשימת משתמשים",
    menu_bonuses: "🎁 בונוסים ואיפוסים",
    menu_welcome: "💬 הודעת פתיחה",
    menu_bc: "📢 שליחת הודעה",
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
    csv_header: "Name,Username,ID,Language,Country",
    menu_dev_mode: "🧩 מצב פיתוח",
    menu_referral_settings: "💸 הגדרות שותפים",
    dev_mode_on: "🧩 מצב פיתוח: פעיל",
    dev_mode_off: "🧩 מצב פיתוח: כבוי",
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
      referrals: 0,
      referrer: null,
      starsDonated: 0,
      bonusStars: 0,
      battleBalance: 0,     // 💰 נוסף — יתרת מטבע $BATTLE
      lastDailyAt: null,    // 🕒 נשתמש בעתיד לבונוס יומי
      username: null, first_name: "", last_name: "",
      xp: 0, level: 1, lastDailyBonus: null,
      history: [],
      active: true,
      preferredLang: "he",
      country: ""
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
  if (from.last_name !== undefined) u.last_name = from.last_name;
  const fn = u.first_name || "";
  const ln = u.last_name || "";
  u.displayName = (fn || ln) ? `${fn} ${ln}`.trim() : u.username || uid;
  u.active = true;

  // ✅ Referral link detection (fixed V2)
try {
  // נוודא ש־update קיים גם אם לא מוגדר בהקשר הנוכחי
  const upd = typeof update !== "undefined" ? update : {};

  // מזהה קישור הזמנה תקין (תומך גם בהודעות וגם ב־callback)
  const ref =
    upd.message?.text?.split("start=")[1] ||
    upd.callback_query?.data?.split("start=")[1] ||
    from?.start_param ||
    from?.referrer;

  if (ref && users[ref] && !u.referrer) {
    u.referrer = ref;

    // מוסיף לרשימת ההפניות של המשתמש המזמין
    if (!users[ref].referrals) users[ref].referrals = [];
    if (!users[ref].referrals.includes(uid)) {
      users[ref].referrals.push(uid);
      console.log(`👥 Referral registered: ${ref} invited ${uid}`);
      addReferralEarning(ref, uid);
    }
  }
} catch (err) {
  console.error("Referral tracking error:", err.message);
}

  writeJSON(USERS_FILE, users);
}

// === REFERRAL EARNING HANDLER ===
function addReferralEarning(referrerId, invitedId) {
  if (!referrerId || !invitedId) return;

  // 🧾 לוג בזמן אמת - כדי לראות ברנדר מי הזמין את מי
  console.log(`👥 addReferralEarning: ${referrerId} invited ${invitedId}`);

  // 📂 Update referral file
  if (!referrals[referrerId]) referrals[referrerId] = { invited: [], earnings: 0 };
  if (!referrals[referrerId].invited.includes(invitedId)) {
    referrals[referrerId].invited.push(invitedId);
    referrals[referrerId].earnings += 2; // +2 $Battle per referral
    writeJSON(REFERRALS_FILE, referrals);
  }

  // 💰 Sync with user's $Battle balance in users.json
  if (users[referrerId]) {
    users[referrerId].battleBalance = (users[referrerId].battleBalance || 0) + 2;
    writeJSON(USERS_FILE, users);
  }
}
function addXpAndMaybeLevelUp(u, addXp) {
  if (!addXp) return;
  u.xp += addXp;
  while (u.xp >= u.level * LEVEL_STEP) u.level++;
}
// === Telegram POST helper (default: HTML) ===
const tgPost = async (method, data = {}) => {
  try {
    const payload = { ...data };

    // 🧩 אם לא צוין מצב עיבוד — נשתמש ב־HTML כברירת מחדל
    if (!payload.parse_mode) payload.parse_mode = "HTML";

    // ⚙️ אין צורך ב־escapeMarkdown יותר — HTML בטוח לשימוש רגיל
    // (השארנו מקום לפילטרים עתידיים אם תרצה להגן על תוכן)

    // ביצוע הבקשה ל-Telegram API
    return await axios.post(`${TG_API}/${method}`, payload);

  } catch (e) {
    // 🧱 טיפול במצב שבו המשתמש חסם את הבוט
    if (data?.chat_id && e?.response?.status === 403) {
      const uid = String(data.chat_id);
      if (users[uid]) {
        users[uid].active = false;
        writeJSON(USERS_FILE, users);
      }
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
// === PLACEHOLDERS & BUTTON PARSER ===
function renderPlaceholders(text, u, uid) {
  if (!text) return "";
  const fn = u.first_name || "";
  const ln = u.last_name || "";
  const un = u.username || "";
  const mention = `[${fn || un || uid}](tg://user?id=${uid})`;
  return text
    .replace(/%firstname%/g, fn)
    .replace(/%lastname%/g, ln)
    .replace(/%username%/g, un)
    .replace(/%mention%/g, mention);

}

// ✅ Parse admin-defined buttons (multi-line, && per row, popup/alert/share/ref/menu/http)
function parseButtonsFromAdminText(block) {
  const rows = [];
  if (!block) return rows;

  // מפרק לפי שורות, מדלג על ריקות
  const lines = block.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  for (const line of lines) {
    // מפרק כמה כפתורים באותה שורה (עם &&)
    const parts = line.split("&&").map(p => p.trim()).filter(Boolean);
    const row = [];

    for (let part of parts) {
      const [btnText, payloadRaw] = part.split(/\s*-\s*/);
      if (!btnText || !payloadRaw) continue;
      const payload = payloadRaw.trim();

      // === ניתוח סוג הכפתור ===
      if (/^https?:/i.test(payload) || /^t\.me\//i.test(payload)) {
        // קישור ישיר
        const url = payload.startsWith("http") ? payload : "https://" + payload;
        row.push({ text: btnText, url });
      } else if (/^popup:/i.test(payload)) {
        row.push({ text: btnText, callback_data: "popup:" + payload.replace(/^popup:/i, "").trim() });
      } else if (/^alert:/i.test(payload)) {
        row.push({ text: btnText, callback_data: "alert:" + payload.replace(/^alert:/i, "").trim() });
      } else if (/^share:/i.test(payload)) {
        row.push({ text: btnText, switch_inline_query: payload.replace(/^share:/i, "").trim() });
      } else if (/^menu:/i.test(payload)) {
        row.push({ text: btnText, callback_data: "menu:" + payload.replace(/^menu:/i, "").trim() });
      } else if (/^ref/i.test(payload)) {
        // גם ref וגם ref: ייתפסו
        row.push({ text: btnText, callback_data: "ref" });
      } else {
        // כל דבר אחר – callback רגיל
        row.push({ text: btnText, callback_data: payload });
      }
    }

    if (row.length) rows.push(row);
  }

  return rows;
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
app.get("/api/state", (_, res) =>
  res.json({ ok: true, scores, doubleXP: { on: isDoubleXPOn() } })
);

// 🚫 נתיב select-team הישן - כבוי (לא בשימוש)
// app.post("/api/select-team", (req, res) => {
//   const userId = getUserIdFromReq(req) || String(req.body?.userId || "");
//   const team = req.body?.team;
//   if (!userId || !["israel", "gaza"].includes(team))
//     return res.status(400).json({ ok: false });
//   const u = ensureUser(userId);
//   u.team = team;
//   writeJSON(USERS_FILE, users);
//   res.json({ ok: true });
// });

// 🚫 כבוי – כבר לא בשימוש
// app.post("/api/switch-team", (req, res) => {
//   return res.json({ ok: false, message: "Team switching disabled" });
// });

// ✅ הנתיב הרשמי לבחירת/החלפת קבוצה
app.post("/api/user/:id/team", (req, res) => {
  try {
    const userId = String(req.params.id || "").trim();
    const { team } = req.body || {};

    if (!userId) {
      return res.status(400).json({ ok: false, error: "Missing userId" });
    }

    if (!["israel", "gaza"].includes(team)) {
      return res.status(400).json({ ok: false, error: "Invalid team" });
    }

    const u = ensureUser(userId);
    u.team = team;
    writeJSON(USERS_FILE, users);

    console.log(`✅ User ${userId} switched team to ${team}`);
    return res.json({ ok: true, team });
  } catch (e) {
    console.error("❌ Team select error:", e);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

// ====== Tap endpoint – Tap strength equals player level ======
app.post("/api/tap", (req, res) => {
  const userId = getUserIdFromReq(req) || String(req.body?.userId || "");
  if (!userId) return res.status(400).json({ ok: false, error: "no userId" });

  // חייבים את המשתמש לפני כל שימוש ב-u
  const u = ensureUser(userId);

  // חייב קבוצה מוגדרת – אין ברירת מחדל לישראל
  if (!u.team) return res.status(400).json({ ok: false, error: "no team" });

  // ריסט יומי של מונה טאפים
  const today = todayStr();
  if (u.tapsDate !== today) {
    u.tapsDate = today;
    u.tapsToday = 0;
  }

  // מגבלת טאפים יומית
  if (u.tapsToday >= DAILY_TAPS) {
    return res.json({ ok: false, error: "limit", limit: DAILY_TAPS });
  }

  // עוצמת הטאפ = רמת השחקן (מינימום 1)
  const tapPoints = Math.max(1, u.level || 1);

  // הקבוצה שמקבלת את הניקוד = הקבוצה של המשתמש כרגע
  const team = u.team; // אין דיפולטים

  // עדכונים
  scores[team] = (scores[team] || 0) + tapPoints;       // ניקוד לקבוצה
  u.tapsToday += 1;                                     // מונה יומי
  u.xp = (u.xp || 0) + tapPoints;                       // XP לפי עוצמה
  u.battle = (u.battle || 0) + tapPoints;               // מונה פנימי (אם בשימוש)
  u.battleBalance = (u.battleBalance || 0) + (BATTLE_RULES?.PER_TAP || 0); // יתרת $BATTLE

  // שמירה לקבצים
  writeJSON(SCORES_FILE, scores);
  writeJSON(USERS_FILE, users);

  // תגובה לקליינט
  res.json({
    ok: true,
    team,
    tapPoints,
    tapsToday: u.tapsToday,
    battleBalance: u.battleBalance,
    xp: u.xp,
    scores
  });
});


app.post("/api/super", (req, res) => {
  return res.json({ ok: false, message: "Super Boost disabled" });
});

// ===== Team Selection =====
app.post("/api/user/:id/team", (req, res) => {
  const userId = req.params.id;
  const { team } = req.body;

  if (!["israel", "gaza"].includes(team)) {
    return res.status(400).json({ ok: false, error: "invalid team" });
  }

  const u = ensureUser(userId);
  u.team = team;
  writeJSON(USERS_FILE, users);

  console.log(`✅ User ${userId} joined team ${team}`);
  res.json({ ok: true, team });
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

// ====== Me (referrals + stats + daily bonus) ======
app.get("/api/me", (req, res) => {
  const { userId: hdrUser } = parseInitDataHeader(req);
  const userId = String(hdrUser || req.query.userId || req.query.user_id || "");
  if (!userId) return res.json({ ok: false });

  // ✅ ודא שמשתמש קיים בזיכרון
  const u = ensureUser(userId);

  // ✅ אפס טאפ יומי אם עבר יום
  const today = todayStr();
  if (u.tapsDate !== today) {
    u.tapsDate = today;
    u.tapsToday = 0;
  }

  // ✅ Referral tracking (real-time unified)
  const start = req.query.start || req.query.ref || null;
  if (start && String(start) !== userId && !u.referrer) {
    u.referrer = String(start);
    const inviter = ensureUser(String(start));
    inviter.referrals = (inviter.referrals || 0) + 1;
    inviter.referralsList = Array.isArray(inviter.referralsList)
      ? inviter.referralsList
      : [];
    if (!inviter.referralsList.includes(userId)) {
      inviter.referralsList.push(userId);
    }
  }

  // ✅ נרמול רשימת הזמנות
  u.referralsList = Array.isArray(u.referralsList) ? u.referralsList : [];
  u.referrals = u.referralsList.length;

  // ✅ בונוס יומי
  let justGotDailyBonus = false;
  const now = nowTs();
  if (
    u.team &&
    (!u.lastDailyBonus ||
      now - u.lastDailyBonus >= DAILY_BONUS_INTERVAL_MS)
  ) {
    scores[u.team] = (scores[u.team] || 0) + DAILY_BONUS_POINTS;

    // 💰 מוסיף בונוס יומי של מטבע $BATTLE
    u.battleBalance = (u.battleBalance || 0) + BATTLE_RULES.DAILY_BONUS;

    addXpAndMaybeLevelUp(u, DAILY_BONUS_XP);
    u.lastDailyBonus = now;
    u.history.push({
      ts: now,
      type: "daily_bonus",
      points: DAILY_BONUS_POINTS,
      team: u.team,
      xp: DAILY_BONUS_XP,
    });
    if (u.history.length > 200) u.history.shift();
    justGotDailyBonus = true;
    writeJSON(SCORES_FILE, scores);
  }

  // ✅ שמירה אחידה
  users[userId] = u;
  writeJSON(USERS_FILE, users);

  const refLink = `https://t.me/TeamBattle_vBot/app?start=${userId}`;
  // ✅ שליחה חזרה למיני-אפליקציה
  res.json({
    ok: true,
    me: {
      userId,
      team: u.team,
      tapsToday: u.tapsToday || 0,
      superUsed: u.superUsed || 0,
      starsDonated: u.starsDonated || 0,
      bonusStars: u.bonusStars || 0,
      battleBalance: u.battleBalance || 0, // 💰 יתרת $BATTLE
      displayName: u.displayName || null,
      username: u.username || null,
      xp: u.xp || 0,
      level: u.level || 1,
      lastDailyBonus: u.lastDailyBonus || 0,
      justGotDailyBonus,
      preferredLang: u.preferredLang || "he",
      history: (u.history || []).slice(-50),
      referrals: u.referrals || 0,
      referrer: u.referrer || null,
      referralsList: u.referralsList,
      refLink, // 👈 נשלח למיני-אפליקציה
    },
    limit: DAILY_TAPS,
    doubleXP: { on: isDoubleXPOn(), endsAt: doubleXP.endTs },
  });
});

// ====== Leaderboard ======
app.get("/api/leaderboard", (req, res) => {
  const arr = Object.entries(users).map(([id, u]) => ({
    userId: id,
    team: u.team || null,
    starsDonated: u.starsDonated || 0,
    bonusStars: u.bonusStars || 0,
    displayName: u.first_name || u.displayName || u.username || "Player",
    username: u.username || null,
    points: u.battleBalance || 0, // 💰 דירוג לפי $Battle
    xp: u.xp || 0,
    level: u.level || 1,
  }));
  arr.sort((a, b) => b.points - a.points);
  res.json({ ok: true, top: arr.slice(0, 20) });
});

// ====== Static Mini-App ======
app.use(express.static(path.join(__dirname, "public")));

// ====== Deep Debug: Telegram Init Data & Headers ======
app.use((req, res, next) => {
  const headers = Object.keys(req.headers)
    .filter(k => k.startsWith('x-') || k.startsWith('content'))
    .reduce((obj, k) => { obj[k] = req.headers[k]; return obj; }, {});

  console.log("🧩 Incoming request:", req.method, req.path);
  console.log("📨 Headers snapshot:", headers);

  if (req.headers["x-init-data"] || req.headers["x-telegram-init-data"]) {
    console.log("✅ Found init-data header!");
    const initData = req.headers["x-init-data"] || req.headers["x-telegram-init-data"];
    console.log("📦 Raw init-data (first 300 chars):", initData.slice(0,300));
  } else {
    console.warn("⚠️ No init-data header received for", req.path);
  }

  next();
});
function tFor(lang){ return PANEL_TEXTS[lang] || PANEL_TEXTS.en; }
function panelKeyboard(lang="en") {
  const t = tFor(lang);
  return {
    inline_keyboard: [
  [{ text: t.menu_summary, callback_data: "panel:summary" }],
  [{ text: t.menu_users, callback_data: "panel:users" }],
  [{ text: t.menu_bonuses, callback_data: "panel:bonuses" }],
  [{ text: t.menu_dxp, callback_data: "panel:dxp" }],
  [{ text: t.menu_welcome, callback_data: "panel:welcome" }],
  [{ text: t.menu_bc, callback_data: "panel:bc" }],
      // === Dev Mode + Referral Settings ===
[
  {
    text: settings.dev_mode
      ? (lang === "he" ? "🧩 מצב פיתוח: פעיל" : "🧩 Dev Mode: ON")
      : (lang === "he" ? "🧩 מצב פיתוח: כבוי" : "🧩 Dev Mode: OFF"),
    callback_data: "panel:toggle_dev"
  }
],
[
  {
    text: lang === "he" ? "💸 הגדרות שותפים" : "💸 Referral Settings",
    callback_data: "panel:referral_settings"
  }
],
  [{ text: t.menu_admins, callback_data: "panel:admins" }],
  [{ text: t.menu_language, callback_data: "panel:lang" }]
]
  };
}
async function sendPanel(chatId, lang="en") {
  const t = tFor(lang);
  await tgPost("sendMessage", {
    chat_id: chatId,
    text: t.title(),
    parse_mode: "HTML",
    reply_markup: panelKeyboard(lang)
  });
}
async function editToMainPanel(msg, lang="en") {
  const t = tFor(lang);
  await tgPost("editMessageText", {
    chat_id: msg.chat.id,
    message_id: msg.message_id,
    text: t.title(),
    parse_mode: "HTML",
    reply_markup: panelKeyboard(lang)
  });
}

// ====== Webhook ======
app.post("/webhook", async (req, res) => {
  try {
    const update = req.body;

    if (update.message?.from) updateUserProfileFromTG(update.message.from);
    if (update.callback_query?.from) updateUserProfileFromTG(update.callback_query.from);
// ✅ Handle successful payments (Extra Tap purchases)
if (update.message?.successful_payment) {
  try {
    const sp = update.message.successful_payment;
    const payload = JSON.parse(sp.invoice_payload || "{}");
    const { userId, team, stars } = payload;

    if (userId && team && stars && users[userId]) {
      const u = ensureUser(userId);
      u.starsDonated = (u.starsDonated || 0) + stars;
      scores[team] = (scores[team] || 0) + stars * STAR_TO_POINTS;
      addXpAndMaybeLevelUp(u, stars);

      // 💰 מוסיף למשתמש $BATTLE אחד על כל Star ששולם
      u.battleBalance = (u.battleBalance || 0) + stars;

      // שמירה
      writeJSON(USERS_FILE, users);
      writeJSON(SCORES_FILE, scores);

      console.log(`💎 successful_payment: ${userId} paid ${stars}⭐ → +${stars} Battle to ${team}`);
    } else {
      console.warn("⚠️ Missing fields in successful_payment:", payload);
    }
  } catch (err) {
    console.error("❌ Error handling successful_payment:", err);
  }
}
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

      // ===== ADMIN: HANDLE WELCOME TEXT EDIT =====
if (admins.includes(uid) && adminMeta[uid]?.awaiting === "welcome_text" && update.message?.text) {
  const rawText = update.message.text.trim();
  const s = settings;
  s.welcome_message = rawText;
  writeJSON(SETTINGS_FILE, s);
  setAdminAwait(uid, null);

  const u = ensureUser(uid);
  const preview = renderPlaceholders(rawText, u, uid);
  const lang = getAdminLang(uid);

  const success =
    lang === "he"
      ? `✅ הודעת הפתיחה נשמרה בהצלחה!\n\nתצוגה מקדימה:\n${preview}`
      : `✅ Welcome message saved successfully!\n\nPreview:\n${preview}`;

  await tgPost("sendMessage", {
    chat_id: uid,
    text: success,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: lang === "he" ? "⬅️ חזרה" : "⬅️ Back",
            callback_data: "panel:main"
          }
        ]
      ]
    }
  });

  return res.status(200).send("OK");
}
  // ====== HANDLE WELCOME BUTTONS INPUT (HE + EN) ======
if (admins.includes(uid) && adminMeta[uid]?.awaiting === "welcome_buttons" && update.message?.text) {
  const rawButtons = update.message.text.trim();
  const parsedButtons = parseButtonsFromAdminText(rawButtons);

  const s = settings;
  s.welcome_buttons = parsedButtons;
  writeJSON(SETTINGS_FILE, s);
  setAdminAwait(uid, null);

  const lang = getAdminLang(uid);
  const successMsg =
    lang === "he"
      ? `✅ כפתורי ההודעה נשמרו בהצלחה!\n\n${parsedButtons.length ? `נוצרו ${parsedButtons.length} שורות כפתורים.` : "לא נמצאו כפתורים."}`
      : `✅ Message buttons saved successfully!\n\n${parsedButtons.length ? `${parsedButtons.length} button rows created.` : "No buttons found."}`;

  await tgPost("sendMessage", {
    chat_id: uid,
    text: successMsg,
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: lang === "he" ? "👁️ תצוגה מקדימה" : "👁️ Preview",
            callback_data: "panel:welcome_preview"
          }
        ],
        [
          {
            text: lang === "he" ? "⬅️ חזרה" : "⬅️ Back",
            callback_data: "panel:welcome"
          }
        ]
      ]
    }
  });
}
  
// ====== HANDLE BROADCAST BUTTONS INPUT (HE + EN) ======
if (admins.includes(uid) && adminMeta[uid]?.awaiting === "broadcast_buttons" && update.message?.text) {
  const rawButtons = update.message.text.trim();
  const parsedButtons = parseButtonsFromAdminText(rawButtons);

  settings.broadcast_draft = settings.broadcast_draft || {};
  settings.broadcast_draft.buttons = parsedButtons;
  writeJSON(SETTINGS_FILE, settings);
  setAdminAwait(uid, null);

  const lang = getAdminLang(uid);
  const successMsg =
    lang === "he"
      ? `✅ כפתורי הודעת השידור נשמרו בהצלחה!\n\n${parsedButtons.length ? `נוצרו ${parsedButtons.length} שורות כפתורים.` : "לא נמצאו כפתורים."}`
      : `✅ Broadcast buttons saved successfully!\n\n${parsedButtons.length ? `${parsedButtons.length} button rows created.` : "No buttons found."}`;

  await tgPost("sendMessage", {
    chat_id: uid,
    text: successMsg,
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: lang === "he" ? "👁️ תצוגה מקדימה" : "👁️ Preview",
            callback_data: "panel:bc_send"
          }
        ],
        [
          {
            text: lang === "he" ? "⬅️ חזרה" : "⬅️ Back",
            callback_data: "panel:bc"
          }
        ]
      ]
    }
  });
}
      // ✅ Handle referral bonus edit
if (admins.includes(uid) && adminMeta[uid]?.awaiting === "referral_bonus") {
  const lang = getAdminLang(uid);
  const newBonus = parseFloat(text);
  setAdminAwait(uid, null);

  if (!isNaN(newBonus) && newBonus >= 0) {
    if (!settings.referral_settings) settings.referral_settings = { enabled: true, bonus_per_invite: 2, currency: "$Battle" };
    settings.referral_settings.bonus_per_invite = newBonus;
    writeJSON(SETTINGS_FILE, settings);
    await tgPost("sendMessage", {
      chat_id: uid,
      text: lang === "he"
        ? `✅ תגמול להזמנה עודכן ל־${newBonus} ${settings.referral_settings.currency}`
        : `✅ Bonus per invite updated to ${newBonus} ${settings.referral_settings.currency}`
    });
  } else {
    await tgPost("sendMessage", {
      chat_id: uid,
      text: lang === "he"
        ? "⚠️ ערך שגוי. נא להזין מספר בלבד (לדוגמה: 2)"
        : "⚠️ Invalid value. Please send a number only (e.g. 2)"
    });
  }
}
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
  setAdminAwait(uid, null);

// ✅ Detect referral from /start message (even without init-data)
try {
  const parts = text.split(" ");
  if (parts.length > 1) {
    const ref = parts[1].trim();
    if (ref && users[ref] && !users[uid]?.referrer) {
      const u = ensureUser(uid);
      u.referrer = ref;

      // 💸 Add referral bonus to referrer dynamically
      if (!referrals[ref]) referrals[ref] = { invited: [], earnings: 0 };
      if (!referrals[ref].invited.includes(uid)) {
        referrals[ref].invited.push(uid);

        const bonus = settings.referral_settings?.bonus_per_invite || 2;
        referrals[ref].earnings += bonus;

        writeJSON(DATA_DIR + "/referrals.json", referrals);

        // 📨 Notify referrer about the bonus
        try {
          const refLang = getAdminLang ? getAdminLang(ref) : "en";
          const message =
            refLang === "he"
              ? `🎉 קיבלת ${bonus} ${settings.referral_settings?.currency || "$Battle"} על הזמנה חדשה!`
              : `🎉 You earned ${bonus} ${settings.referral_settings?.currency || "$Battle"} for a new invite!`;

          await tgPost("sendMessage", {
            chat_id: ref,
            text: message
          });
        } catch (err) {
          console.error("Failed to send referral bonus message:", err.message);
        }

        // מוסיף את המוזמן לרשימת ההזמנות של המזמין
        if (!users[ref].referrals) users[ref].referrals = [];
        if (!users[ref].referrals.includes(uid)) {
          users[ref].referrals.push(uid);
          console.log(`👥 Referral registered via /start: ${ref} invited ${uid}`);
          addReferralEarning(ref, uid);
        }

        writeJSON(USERS_FILE, users);
      }
    }
  }
} catch (err) {
  console.error("Referral tracking (via /start) error:", err.message);
}

  // ✅ continue with welcome message
  const s = settings;
  const u = ensureUser(uid);
  const msg = renderPlaceholders(s.welcome_message || "ברוך הבא!", u, uid);
  const kb = Array.isArray(s.welcome_buttons) ? s.welcome_buttons : [];
  await tgPost("sendMessage", {
    chat_id: chatId,
    text: msg,
    parse_mode: "HTML",
    reply_markup: { inline_keyboard: kb }
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
      let data = cq.data || "";
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
     // ===== REFERRAL PANEL (User-side menu, synced + share text) =====
else if (data === "menu:referral") {
  const u = ensureUser(uid);
  const refData = referrals[uid] || { invited: [], earnings: 0 };
  const inviteCount = refData.invited.length;
  const earnings = refData.earnings.toFixed(2);
  const botUsername = process.env.BOT_USERNAME || "TeamBattle_vBot";

  const inviteLink = `https://t.me/${botUsername}?start=${uid}`;
  const shareText = "🔥 Join me on TeamBattle - 🇮🇱Israel Vs Gaza🇵🇸 and earn $Battle!";
  const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent(shareText)}`;

  const text =
    lang === "he"
      ? `💸 <b>תוכנית שותפים – $Battle</b>\n\nהזמן חברים וקבל $Battle על כל שחקן שמצטרף!\n\n👥 <b>שחקנים שהוזמנו:</b> ${inviteCount}\n💰 <b>סך הרווחים שלך:</b> ${earnings} $Battle\n\n🔗 <b>הקישור האישי שלך:</b>\n${inviteLink}\n\n📤 שתף את הקישור שלך:`
      : `💸 <b>Referral Program – $Battle</b>\n\nEarn $Battle for every player you invite!\n\n👥 <b>Players Invited:</b> ${inviteCount}\n💰 <b>Your Earnings:</b> ${earnings} $Battle\n\n🔗 <b>Your Personal Invite Link:</b>\n${inviteLink}\n\n📤 Share your link below:`;

  await tgPost("editMessageText", {
    chat_id: msg.chat.id,
    message_id: msg.message_id,
    text,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [
        [
          { text: lang === "he" ? "📨 שתף קישור" : "📨 Share Link", url: shareUrl }
        ],
        [
          { text: lang === "he" ? "⬅️ חזרה" : "⬅️ Back", callback_data: "menu:start" }
        ]
      ]
    }
  });
}

// ====== BACK TO START MENU ======
if (data === "menu:start") {
  const s = settings;
  const u = ensureUser(uid);
  const msg = renderPlaceholders(s.welcome_message || "Welcome!", u, uid);
  const kb = Array.isArray(s.welcome_buttons) ? s.welcome_buttons : [];

  if (msg?.chat?.id && msg?.message_id) {
    await tgPost("editMessageText", {
      chat_id: msg.chat.id,
      message_id: msg.message_id,
      text: msg,
      parse_mode: "HTML",
      reply_markup: { inline_keyboard: kb }
    });
  } else {
    await tgPost("sendMessage", {
      chat_id: uid,
      text: msg,
      parse_mode: "HTML",
      reply_markup: { inline_keyboard: kb }
    });
  }
}
  // ===== Handle "menu:" shortcuts (e.g. menu:referral_settings) =====
else if (data.startsWith("menu:")) {
  const menuTarget = data.replace("menu:", "");
  await tgPost("answerCallbackQuery", { callback_query_id: cq.id }).catch(()=>{});

  // הפניה ישירה לתפריטים לפי שם
  if (menuTarget === "referral_settings") {
    data = "panel:referral_settings";
  } else {
    data = "panel:" + menuTarget;
  }
}
     if (data.startsWith("panel:")) {
  if (!admins.includes(uid)) {
    await tgPost("answerCallbackQuery", {
      callback_query_id: cq.id,
      text: tt.unauthorized,
      show_alert: true
    });
  } else {
    const [, action, extra] = data.split(":");

    // ====== TOGGLE DEV MODE ======
    if (action === "toggle_dev") {
      settings.dev_mode = !settings.dev_mode;
      writeJSON(SETTINGS_FILE, settings);

      await tgPost("answerCallbackQuery", {
        callback_query_id: cq.id,
        text: settings.dev_mode
          ? (lang === "he" ? "🧩 מצב פיתוח הופעל" : "🧩 Dev Mode Enabled")
          : (lang === "he" ? "🌍 מצב פיתוח כובה" : "🌍 Dev Mode Disabled")
      });

      await editToMainPanel(msg, lang);
    }

    // ====== Welcome & Broadcast Manager (HE + EN) ======
    else if (action === "welcome") {
      await tgPost("editMessageText", {
        chat_id: msg.chat.id,
        message_id: msg.message_id,
        text:
          lang === "he"
            ? "💬 עריכת הודעת פתיחה\nבחר מה ברצונך לערוך:"
            : "💬 Edit Welcome Message\nChoose what to edit:",
        reply_markup: {
          inline_keyboard: [
            [{ text: lang === "he" ? "✏️ טקסט" : "✏️ Text", callback_data: "panel:welcome_text" }],
            [{ text: lang === "he" ? "🎛️ כפתורים" : "🎛️ Buttons", callback_data: "panel:welcome_buttons" }],
            [{ text: lang === "he" ? "⬅️ חזרה" : "⬅️ Back", callback_data: "panel:main" }]
          ]
        }
      });
    }

    else if (action === "welcome_text") {
      setAdminAwait(uid, "welcome_text");
      await tgPost("editMessageText", {
        chat_id: msg.chat.id,
        message_id: msg.message_id,
        text:
          lang === "he"
            ? "שלח את הודעת הפוסט.\n\nניתן להשתמש במילות מפתח שיוחלפו בנתוני המשתמש:\n• %firstname% • %lastname% • %username% • %mention%"
            : "Send the post text.\n\nYou can use these placeholders:\n• %firstname% • %lastname% • %username% • %mention%",
        reply_markup: {
          inline_keyboard: [
            [{ text: lang === "he" ? "⬅️ חזרה" : "⬅️ Back", callback_data: "panel:welcome" }]
          ]
        }
      });
    }

    else if (action === "welcome_buttons") {
      setAdminAwait(uid, "welcome_buttons");
      await tgPost("editMessageText", {
        chat_id: msg.chat.id,
        message_id: msg.message_id,
        text:
          lang === "he"
            ? "הגדר את הכפתורים להוספה במקלדת מתחת לפוסט.\n\n• שורות מרובות:\nButton text - t.me/LinkExample\nButton text - t.me/LinkExample\n\n• מספר לחצנים בשורה אחת:\nButton text - t.me/LinkExample && Button text - t.me/LinkExample\n\n• חלון קופץ:\nButton text - popup: Text\nButton text - alert: Text\n\n• לחצן שיתוף:\nButton text - share: Text\n\n• תפריט / שותפים:\nButton text - menu: שם תפריט\nButton text - ref: מוסיף לחצן תוכנית שותפים\n\nלהחזרת המשתמש לתפריט ההתחלה: menu:start"
            : "Define buttons to add below the post.\n\n• Multiple rows:\nButton text - t.me/LinkExample\nButton text - t.me/LinkExample\n\n• Multiple buttons in one row:\nButton text - t.me/LinkExample && Button text - t.me/LinkExample\n\n• Popup or Alert:\nButton text - popup: Text\nButton text - alert: Text\n\n• Share button:\nButton text - share: Text\n\n• Menu / Referral:\nButton text - menu: menuName\nButton text - ref: adds referral button\n\nTo return user to start: menu:start",
        reply_markup: {
          inline_keyboard: [
            [{ text: lang === "he" ? "⬅️ חזרה" : "⬅️ Back", callback_data: "panel:welcome" }]
          ]
        }
      });
    }

    // ====== Broadcast ======
    else if (action === "bc") {
      await tgPost("editMessageText", {
        chat_id: msg.chat.id,
        message_id: msg.message_id,
        text:
          lang === "he"
            ? "📢 ניהול הודעת שידור\nבחר מה ברצונך לערוך:"
            : "📢 Broadcast Message\nChoose what to edit:",
        reply_markup: {
          inline_keyboard: [
            [{ text: lang === "he" ? "✏️ טקסט" : "✏️ Text", callback_data: "panel:bc_text" }],
            [{ text: lang === "he" ? "🎛️ כפתורים" : "🎛️ Buttons", callback_data: "panel:bc_buttons" }],
            [{ text: lang === "he" ? "✅ אשר ושלח" : "✅ Confirm & Send", callback_data: "panel:bc_send" }],
            [{ text: lang === "he" ? "⬅️ חזרה" : "⬅️ Back", callback_data: "panel:main" }]
          ]
        }
      });
    }

    else if (action === "bc_text") {
      setAdminAwait(uid, "broadcast_text");
      await tgPost("editMessageText", {
        chat_id: msg.chat.id,
        message_id: msg.message_id,
        text:
          lang === "he"
            ? "שלח את הודעת השידור.\n\nניתן להשתמש במילות מפתח שיוחלפו בנתוני המשתמש:\n• %firstname% • %lastname% • %username% • %mention%"
            : "Send the broadcast message.\n\nYou can use these placeholders:\n• %firstname% • %lastname% • %username% • %mention%",
        reply_markup: {
          inline_keyboard: [
            [{ text: lang === "he" ? "⬅️ חזרה" : "⬅️ Back", callback_data: "panel:bc" }]
          ]
        }
      });
    }

    else if (action === "bc_buttons") {
      setAdminAwait(uid, "broadcast_buttons");
      await tgPost("editMessageText", {
        chat_id: msg.chat.id,
        message_id: msg.message_id,
        text:
          lang === "he"
            ? "הגדר את הכפתורים להוספה במקלדת מתחת לפוסט.\n\n• שורות מרובות:\nButton text - t.me/LinkExample\nButton text - t.me/LinkExample\n\n• מספר לחצנים בשורה אחת:\nButton text - t.me/LinkExample && Button text - t.me/LinkExample\n\n• חלון קופץ:\nButton text - popup: Text\nButton text - alert: Text\n\n• לחצן שיתוף:\nButton text - share: Text\n\n• תפריט / שותפים:\nButton text - menu: menuName\nButton text - ref: adds referral button\n\nלהחזרת המשתמש לתפריט ההתחלה: menu:start"
            : "Define buttons below the message.\n\n• Multiple rows:\nButton text - t.me/LinkExample\nButton text - t.me/LinkExample\n\n• Multiple buttons in one row:\nButton text - t.me/LinkExample && Button text - t.me/LinkExample\n\n• Popup / Alert:\nButton text - popup: Text\nButton text - alert: Text\n\n• Share button:\nButton text - share: Text\n\n• Menu / Referral:\nButton text - menu: menuName\nButton text - ref: adds referral button\n\nTo return user to start: menu:start",
        reply_markup: {
          inline_keyboard: [
            [{ text: lang === "he" ? "⬅️ חזרה" : "⬅️ Back", callback_data: "panel:bc" }]
          ]
        }
      });
    }

    else if (action === "bc_send") {
      const draft = settings.broadcast_draft || { text: "", buttons: [] };
      const uSelf = ensureUser(uid);
      const preview = renderPlaceholders(draft.text || "", uSelf, uid);

      await tgPost("editMessageText", {
        chat_id: msg.chat.id,
        message_id: msg.message_id,
        text:
          (lang === "he"
            ? "📝 תצוגה מקדימה של ההודעה שתישלח:\n\n"
            : "📝 Preview of the message to be sent:\n\n") + preview,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: (draft.buttons || []).concat([
            [{ text: lang === "he" ? "✅ אשר ושלח" : "✅ Confirm & Send", callback_data: "panel:bc_send_confirm" }],
            [{ text: lang === "he" ? "⬅️ חזרה" : "⬅️ Back", callback_data: "panel:bc" }]
          ])
        }
      });
    }

    else if (action === "bc_send_confirm") {
      const draft = settings.broadcast_draft || { text: "", buttons: [] };
      let ok = 0, fail = 0;
      for (const [id, uuser] of Object.entries(users)) {
        if (!uuser.active) continue;
        const textToSend = renderPlaceholders(draft.text || "", uuser, id);
        try {
          await tgPost("sendMessage", {
            chat_id: id,
            text: textToSend,
            parse_mode: "HTML",
            reply_markup: { inline_keyboard: draft.buttons || [] }
          });
          ok++;
        } catch { fail++; }
      }
      await tgPost("editMessageText", {
        chat_id: msg.chat.id,
        message_id: msg.message_id,
        text:
          lang === "he"
            ? `📢 שידור הושלם!\n✅ נשלחו: ${ok}\n❌ נכשלו: ${fail}`
            : `📢 Broadcast completed!\n✅ Sent: ${ok}\n❌ Failed: ${fail}`,
        reply_markup: {
          inline_keyboard: [
            [{ text: lang === "he" ? "⬅️ חזרה" : "⬅️ Back", callback_data: "panel:main" }]
          ]
        }
      });
    }

    else if (action === "lang") {
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
        parse_mode: "HTML",
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
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: tt.users_export, callback_data: "panel:users_export" }],
            [{ text: tt.back, callback_data: "panel:main" }]
          ]
        }
      });
    }

    else if (action === "users_export") {
      await tgPost("answerCallbackQuery", { callback_query_id: cq.id, text: tt.users_export_sending });
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
        parse_mode: "HTML",
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
        parse_mode: "HTML",
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
      await tgPost("answerCallbackQuery", { callback_query_id: cq.id, text: doubleXP.dailyEnabled ? "🕒 on" : "🕒 off" });
      await editToMainPanel(msg, lang);
    }
// ====== REFERRAL SETTINGS PANEL (Stylish Version) ======
else if (action === "referral_settings") {
  const ref = settings.referral_settings || { enabled: true, bonus_per_invite: 2, currency: "$Battle" };

  const text =
    lang === "he"
      ? `💸 <b>הגדרות שותפים</b>\n\nמצב נוכחי: ${ref.enabled ? "✅ פעיל" : "⛔ כבוי"}\nתגמול להזמנה: ${ref.bonus_per_invite} ${ref.currency}\n\nבחר פעולה:`
      : `💸 <b>Referral Settings</b>\n\nCurrent status: ${ref.enabled ? "✅ Enabled" : "⛔ Disabled"}\nBonus per invite: ${ref.bonus_per_invite} ${ref.currency}\n\nChoose an action:`;

  await tgPost("editMessageText", {
    chat_id: msg.chat.id,
    message_id: msg.message_id,
    text,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: ref.enabled
              ? (lang === "he" ? "⛔ כבה תוכנית שותפים" : "⛔ Disable Referrals")
              : (lang === "he" ? "✅ הפעל תוכנית שותפים" : "✅ Enable Referrals"),
            callback_data: "panel:referral_toggle"
          }
        ],
        [
          {
            text: lang === "he" ? "✏️ שנה תגמול להזמנה" : "✏️ Change Bonus per Invite",
            callback_data: "panel:referral_edit_bonus"
          }
        ],
        [
          { text: lang === "he" ? "⬅️ חזרה" : "⬅️ Back", callback_data: "panel:main" }
        ]
      ]
    }
  });
}

// ====== REFERRAL SETTINGS: TOGGLE ENABLED ======
else if (action === "referral_toggle") {
  settings.referral_settings.enabled = !settings.referral_settings.enabled;
  writeJSON(SETTINGS_FILE, settings);

  await tgPost("answerCallbackQuery", {
    callback_query_id: cq.id,
    text: settings.referral_settings.enabled
      ? (lang === "he" ? "✅ תוכנית שותפים הופעלה" : "✅ Referral Program Enabled")
      : (lang === "he" ? "⛔ תוכנית שותפים כובתה" : "⛔ Referral Program Disabled")
  });

  await editToMainPanel(msg, lang);
}

// ====== REFERRAL SETTINGS: EDIT BONUS ======
else if (action === "referral_edit_bonus") {
  setAdminAwait(uid, "referral_bonus");
  await tgPost("editMessageText", {
    chat_id: msg.chat.id,
    message_id: msg.message_id,
    text:
      lang === "he"
        ? "💰 שלח את גובה התגמול להזמנה החדשה (מספר בלבד, לדוגמה: 5)"
        : "💰 Send the new bonus amount per invite (number only, e.g. 5)",
    reply_markup: {
      inline_keyboard: [
        [{ text: lang === "he" ? "⬅️ חזרה" : "⬅️ Back", callback_data: "panel:referral_settings" }]
      ]
    }
  });
}

// ====== HANDLE BONUS INPUT ======
if (admins.includes(uid) && adminMeta[uid]?.awaiting === "referral_bonus" && update.message?.text) {
  const newBonus = parseFloat(update.message.text.trim());
  if (!isNaN(newBonus) && newBonus >= 0) {
    settings.referral_settings.bonus_per_invite = newBonus;
    writeJSON(SETTINGS_FILE, settings);
    setAdminAwait(uid, null);
    await tgPost("sendMessage", {
      chat_id: uid,
      text:
        lang === "he"
          ? `✅ תגמול להזמנה עודכן ל־${newBonus} ${settings.referral_settings.currency}`
          : `✅ Bonus per invite updated to ${newBonus} ${settings.referral_settings.currency}`
    });
  } else {
    await tgPost("sendMessage", {
      chat_id: uid,
      text:
        lang === "he"
          ? "⚠️ ערך שגוי. נא להזין מספר בלבד (לדוגמה: 2)"
          : "⚠️ Invalid value. Please send a number only (e.g. 2)"
    });
  }
}


    else if (action === "broadcast") {
      setAdminAwait(uid, "broadcast");
      await tgPost("editMessageText", {
        chat_id: msg.chat.id,
        message_id: msg.message_id,
        text: `${tt.title()}\n\n${tt.ask_broadcast}`,
        parse_mode: "HTML",
        reply_markup: { inline_keyboard: [[{ text: tt.back, callback_data: "panel:main" }]] }
      });
    }

    else if (action === "admins") {
      const list = tt.admins_list(admins);
      await tgPost("editMessageText", {
        chat_id: msg.chat.id,
        message_id: msg.message_id,
        text: `${tt.title()}\n\n${tt.section(tt.admins_title)}\n\n${list}\n\n${tt.admins_help}`,
        parse_mode: "HTML",
        reply_markup: { inline_keyboard: [[{ text: tt.back, callback_data: "panel:main" }]] }
      });
    }

    else if (action === "main") {
      await editToMainPanel(msg, lang);
    }

  } // <== סוף else (admins.includes)
  await tgPost("answerCallbackQuery", { callback_query_id: cq.id }).catch(()=>{});
} // <== סוף if (data.startsWith("panel:"))

        } // <== סוף ה־if הראשי
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
