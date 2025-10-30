// ================== server.js (TeamBattle – stable) ==================
const express = require("express");
const axios = require("axios");
const path = require("path");
const fs = require("fs");
const cors = require("cors");
const FormData = require("form-data"); // for sending CSV as document

const app = express();
app.use(cors());
app.use(express.json({ type: ["application/json", "text/json"], limit: "1mb" }));
app.use(express.urlencoded({ extended: false }));

// ====== CONFIG ======
// NOTE: Payments code is LOCKED to the stable createInvoiceLink flow. Do not change.
const BOT_TOKEN      = process.env.BOT_TOKEN      || "8366510657:AAEC5for6-8246aKdW6F5w3FPfJ5oWNLCfA";
const TG_API         = `https://api.telegram.org/bot${BOT_TOKEN}`;
const WEBHOOK_DOMAIN = process.env.WEBHOOK_DOMAIN || "https://team-battle-v-bot.onrender.com";
const MINI_APP_URL   = process.env.MINI_APP_URL   || "https://team-battle-v-bot.onrender.com/";
const DATA_DIR       = process.env.DATA_DIR       || "/data"; // Render persistent disk

// Game
const STAR_TO_POINTS  = 2;    // 1⭐ = 2 pts
const SUPER_POINTS    = 25;   // Super boost
const DAILY_TAPS      = 300;  // per-day tap limit
const AFFILIATE_BONUS = 0.10; // 10% stars to inviter

// XP / Levels
const DAILY_BONUS_INTERVAL_MS = 24*60*60*1000;
const DAILY_BONUS_POINTS = 5;
const DAILY_BONUS_XP     = 10;
const LEVEL_STEP         = 100;

// ====== Storage (/data) ======
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const SCORES_FILE = path.join(DATA_DIR, "scores.json");
const USERS_FILE  = path.join(DATA_DIR, "users.json");
const ADMINS_FILE = path.join(DATA_DIR, "admins.json");
const AMETA_FILE  = path.join(DATA_DIR, "admin_meta.json"); // { userId: { lang, awaiting } }
const TEXTS_FILE  = path.join(DATA_DIR, "texts.json");      // panel i18n (serializable ONLY)

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

let scores = readJSON(SCORES_FILE, { israel: 0, gaza: 0 });
let users  = readJSON(USERS_FILE,  {});   // userId -> profile
let admins = readJSON(ADMINS_FILE, ["7366892099","6081158942","7586749848"]);
let adminMeta = readJSON(AMETA_FILE, {}); // { uid: { lang: 'en'|'he', awaiting: null|'broadcast' } }

// Super Admins (fixed in code)
const SUPER_ADMINS = new Set(["7366892099","6081158942","7586749848"]);

// ====== Panel Texts (functions live in code; JSON stores only plain strings) ======
const PANEL_TEXTS_DEFAULT = {
  en: {
    panelTitle: "*🛠️ TeamBattle – Admin Panel*",
    menu_summary: "📊 Global summary",
    menu_users: "👥 Users",
    menu_bonuses: "🎁 Bonuses & resets",
    menu_broadcast: "📢 Broadcast message",
    menu_admins: "👑 Manage admins",
    menu_language: "🌐 Language / שפה",
    menu_export_csv: "📤 Export CSV",
    back: "⬅️ Back",
    unauthorized: "❌ You don’t have access to this panel.",
    users_header_counts: (active, inactive, total) => 
      `*👥 Users*\nActive: ${active}\nInactive: ${inactive}\nTotal: ${total}`,
    bonuses_title: "*🎁 Bonuses & resets*",
    reset_daily: "♻️ Reset daily limits (all)",
    reset_super: "♻️ Reset Super Boost (all)",
    bonus_israel: "➕ +25 to 🇮🇱",
    bonus_gaza: "➕ +25 to 🇵🇸",
    done: "✅ Done.",
    ask_broadcast: "📢 Send the message you want to broadcast.\n(Reply in this chat)",
    bc_started: "⏳ Broadcasting…",
    bc_done: (ok,fail)=>`✅ Sent: ${ok}  |  ❌ Failed: ${fail}`,
    admins_title: "*👑 Manage admins*",
    admins_help: "Use commands:\n/addadmin <userId>\n/rmadmin <userId>\n(Only Super Admins)",
    lang_set_en: "🌐 Language set to English.",
    lang_set_he: "🌐 השפה הוגדרה לעברית.",
    csv_file_name: () => `users_export_${Date.now()}.csv`,
  },
  he: {
    panelTitle: "*🛠️ פאנל ניהול – TeamBattle*",
    menu_summary: "📊 סיכום כללי",
    menu_users: "👥 משתמשים",
    menu_bonuses: "🎁 בונוסים ואיפוסים",
    menu_broadcast: "📢 שליחת הודעה",
    menu_admins: "👑 ניהול מנהלים",
    menu_language: "🌐 שפה / Language",
    menu_export_csv: "📤 ייצוא CSV",
    back: "⬅️ חזרה",
    unauthorized: "❌ אין לך גישה לפאנל הניהול.",
    users_header_counts: (active, inactive, total) => 
      `*👥 רשימת משתמשים*\nמשתמשים פעילים: ${active}\nמשתמשים לא פעילים: ${inactive}\nסה״כ רשומים: ${total}`,
    bonuses_title: "*🎁 בונוסים ואיפוסים*",
    reset_daily: "♻️ איפוס מגבלות יומיות (לכולם)",
    reset_super: "♻️ איפוס סופר-בוסט (לכולם)",
    bonus_israel: "➕ +25 ל🇮🇱",
    bonus_gaza: "➕ +25 ל🇵🇸",
    done: "✅ בוצע.",
    ask_broadcast: "📢 שלח את ההודעה שתרצה לשדר.\n(ענה בהודעה הזו)",
    bc_started: "⏳ משדר…",
    bc_done: (ok,fail)=>`✅ נשלחו: ${ok}  |  ❌ נכשלו: ${fail}`,
    admins_title: "*👑 ניהול מנהלים*",
    admins_help: "פקודות:\n/addadmin <userId>\n/rmadmin <userId>\n(סופר־אדמין בלבד)",
    lang_set_en: "🌐 Language set to English.",
    lang_set_he: "🌐 השפה הוגדרה לעברית.",
    csv_file_name: () => `ייצוא_משתמשים_${Date.now()}.csv`,
  }
};

// The serializable mirror for texts.json (no functions)
const PANEL_TEXTS_SERIALIZABLE = {
  en: {
    panelTitle: "🛠️ TeamBattle – Admin Panel",
    menu_summary: "📊 Global summary",
    menu_users: "👥 Users",
    menu_bonuses: "🎁 Bonuses & resets",
    menu_broadcast: "📢 Broadcast message",
    menu_admins: "👑 Manage admins",
    menu_language: "🌐 Language / שפה",
    menu_export_csv: "📤 Export CSV",
    back: "⬅️ Back",
    unauthorized: "❌ You don’t have access to this panel."
  },
  he: {
    panelTitle: "🛠️ פאנל ניהול – TeamBattle",
    menu_summary: "📊 סיכום כללי",
    menu_users: "👥 משתמשים",
    menu_bonuses: "🎁 בונוסים ואיפוסים",
    menu_broadcast: "📢 שליחת הודעה",
    menu_admins: "👑 ניהול מנהלים",
    menu_language: "🌐 שפה / Language",
    menu_export_csv: "📤 ייצוא CSV",
    back: "⬅️ חזרה",
    unauthorized: "❌ אין לך גישה לפאנל הניהול."
  }
};

// Auto-repair texts.json (delete & rebuild if broken/missing keys)
(function ensureTextsJsonHealthy() {
  let needRepair = false;
  try {
    const raw = fs.existsSync(TEXTS_FILE) ? fs.readFileSync(TEXTS_FILE, "utf8") : "";
    const j = raw ? JSON.parse(raw) : null;
    // minimal sanity
    if (!j || !j.en || !j.he || !j.en.menu_summary || !j.he.menu_summary) {
      needRepair = true;
    }
  } catch { needRepair = true; }
  if (needRepair) {
    try { fs.unlinkSync(TEXTS_FILE); } catch {}
    writeJSON(TEXTS_FILE, PANEL_TEXTS_SERIALIZABLE);
    console.log("texts.json was repaired to a safe default.");
  }
})();

// Use the in-code texts (with functions) at runtime:
const PANEL_TEXTS = PANEL_TEXTS_DEFAULT;

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
      lang: null,    // user's chosen language (en/he/ar) when they press language
      country: "",   // (optional, not collected yet)
      history: [],   // {ts,type,stars,points,team,from,xp}
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
function addXpAndMaybeLevelUp(u, addXp) {
  if (!addXp) return;
  u.xp += addXp;
  while (u.xp >= u.level * LEVEL_STEP) u.level++;
}
const tgPost = (m, d) =>
  axios.post(`${TG_API}/${m}`, d).catch(e => {
    if (d?.chat_id && e?.response?.status === 403) {
      const uid = String(d.chat_id);
      if (users[uid]) { users[uid].active = false; writeJSON(USERS_FILE, users); }
    }
    console.error("TG error:", e?.response?.data || e.message);
  });

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
  adminMeta[uid].awaiting = what; // 'broadcast' | null
  writeJSON(AMETA_FILE, adminMeta);
}

// ====== Mini-App API ======
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
  addXpAndMaybeLevelUp(u, 1);
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
  addXpAndMaybeLevelUp(u, SUPER_POINTS);
  u.history.push({ ts: nowTs(), type: "super", points: SUPER_POINTS, team: u.team, xp: SUPER_POINTS });
  if (u.history.length > 200) u.history.shift();
  writeJSON(USERS_FILE, users);
  writeJSON(SCORES_FILE, scores);
  res.json({ ok:true, scores, superUsed: u.superUsed, limit:1 });
});

// ====== Stars Payment – UNTOUCHED (stable) ======
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

  // Daily bonus (auto)
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
      history: (u.history || []).slice(-50),
      lang: u.lang || null,
      country: u.country || ""
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
      [{ text: t.menu_export_csv,callback_data: "panel:export_csv" }],
      [{ text: t.menu_language,  callback_data: "panel:lang" }]
    ]
  };
}
async function sendPanel(chatId, lang="en") {
  const t = PANEL_TEXTS[lang] || PANEL_TEXTS.en;
  await tgPost("sendMessage", {
    chat_id: chatId,
    text: t.panelTitle,
    parse_mode: "Markdown",
    reply_markup: panelKeyboard(lang)
  });
}
async function editToMainPanel(msg, lang="en") {
  const t = PANEL_TEXTS[lang] || PANEL_TEXTS.en;
  await tgPost("editMessageText", {
    chat_id: msg.chat.id,
    message_id: msg.message_id,
    text: t.panelTitle,
    parse_mode: "Markdown",
    reply_markup: panelKeyboard(lang)
  });
}

// ====== CSV Export helper ======
function csvEscape(s) {
  if (s == null) return "";
  s = String(s);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function generateUsersCSV() {
  const header = ["Name","Username","ID","Language","Country"];
  const rows = [header.join(",")];
  for (const [id, u] of Object.entries(users)) {
    const name = u.displayName || "";
    const uname = u.username ? `@${u.username}` : "";
    const lang = u.lang || "";
    const country = u.country || "";
    rows.push([name, uname, id, lang, country].map(csvEscape).join(","));
  }
  return rows.join("\n");
}
async function sendCSVToAdmin(chat_id, fileName) {
  const csvData = generateUsersCSV();
  const tmpPath = path.join(DATA_DIR, fileName);
  fs.writeFileSync(tmpPath, csvData, "utf8");

  const form = new FormData();
  form.append("chat_id", chat_id);
  form.append("document", fs.createReadStream(tmpPath), { filename: fileName, contentType: "text/csv" });
  await axios.post(`${TG_API}/sendDocument`, form, { headers: form.getHeaders() }).catch(e=>{
    console.error("sendDocument error:", e?.response?.data || e.message);
  });

  // cleanup is optional (Render persistent). Keep it for reuse.
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
      addXpAndMaybeLevelUp(u, pts);
      u.history.push({ ts: nowTs(), type:"donation", stars, points: pts, team, xp: pts });
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

      await tgPost("sendMessage", { chat_id: userId, text: `✅ תודה! נתרמו ${stars}⭐ → +${pts} נק' ל${team}.` });
    }

    // ----- Messages -----
    if (update.message?.text) {
      const msg   = update.message;
      const chatId= msg.chat.id;
      const text  = (msg.text || "").trim();
      const uid   = String(msg.from.id);

      // broadcast flow
      if (admins.includes(uid) && adminMeta[uid]?.awaiting === "broadcast") {
        const lang = getAdminLang(uid);
        const tt = PANEL_TEXTS[lang] || PANEL_TEXTS.en;
        setAdminAwait(uid, null);
        await tgPost("sendMessage", { chat_id: uid, text: tt.bc_started });
        let ok=0, fail=0;
        for (const [id, u] of Object.entries(users)) {
          if (!u.active) continue;
          try { await tgPost("sendMessage", { chat_id: id, text }); ok++; }
          catch { fail++; }
        }
        await tgPost("sendMessage", { chat_id: uid, text: tt.bc_done(ok,fail) });
      }

      // /start
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

      // /panel
      if (text === "/panel") {
        if (!admins.includes(uid)) {
          const t = PANEL_TEXTS[getAdminLang(uid)] || PANEL_TEXTS.en;
          await tgPost("sendMessage", { chat_id: chatId, text: t.unauthorized });
        } else {
          await sendPanel(chatId, getAdminLang(uid));
        }
      }

      // Super Admin only
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

    // ----- Callbacks (Panel & language) -----
    if (update.callback_query) {
      const cq   = update.callback_query;
      const uid  = String(cq.from.id);
      const data = cq.data || "";
      const lang = getAdminLang(uid);
      const t    = PANEL_TEXTS[lang] || PANEL_TEXTS.en;
      const msg  = cq.message;

      // /start language selection also sets user's lang
      if (data === "lang_en" || data === "lang_he" || data === "lang_ar") {
        const u = ensureUser(uid);
        u.lang = data.replace("lang_",""); // en / he / ar
        writeJSON(USERS_FILE, users);
        await tgPost("answerCallbackQuery", { callback_query_id: cq.id });
      }

      if (data.startsWith("panel:")) {
        if (!admins.includes(uid)) {
          await tgPost("answerCallbackQuery", { callback_query_id: cq.id, text: t.unauthorized, show_alert: true });
        } else {
          const [, action] = data.split(":");

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
              text: `${t.panelTitle}\n\n*🇮🇱 ${scores.israel||0}  |  🇵🇸 ${scores.gaza||0}*\n*👥 Users:* ${usersCount}`,
              parse_mode: "Markdown",
              reply_markup: {
                inline_keyboard: [[{ text: t.back, callback_data: "panel:main" }]]
              }
            });
          }

          else if (action === "users") {
            // Show only counters + Export CSV button
            const ids = Object.keys(users);
            let active = 0, inactive = 0;
            ids.forEach(id => users[id].active ? active++ : inactive++);
            const total = ids.length;
            await tgPost("editMessageText", {
              chat_id: msg.chat.id,
              message_id: msg.message_id,
              text: `${t.panelTitle}\n\n${t.users_header_counts(active, inactive, total)}`,
              parse_mode: "Markdown",
              reply_markup: {
                inline_keyboard: [
                  [{ text: t.menu_export_csv, callback_data: "panel:export_csv" }],
                  [{ text: t.back, callback_data: "panel:main" }]
                ]
              }
            });
          }

          else if (action === "export_csv") {
            const fileName = (t.csv_file_name ? t.csv_file_name() : `users_export_${Date.now()}.csv`);
            await sendCSVToAdmin(uid, fileName);
            await tgPost("answerCallbackQuery", { callback_query_id: cq.id, text: "📤 CSV generated." });
          }

          else if (action === "bonuses") {
            await tgPost("editMessageText", {
              chat_id: msg.chat.id,
              message_id: msg.message_id,
              text: `${t.panelTitle}\n\n${t.bonuses_title}`,
              parse_mode: "Markdown",
              reply_markup: {
                inline_keyboard: [
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
            const today = todayStr();
            for (const uid2 of Object.keys(users)) {
              const u = users[uid2];
              u.tapsDate = today; u.tapsToday = 0;
              u.superDate = today; u.superUsed = 0;
            }
            writeJSON(USERS_FILE, users);
            await tgPost("answerCallbackQuery", { callback_query_id: cq.id, text: t.done });
          }

          else if (action === "reset_super") {
            const today = todayStr();
            for (const uid2 of Object.keys(users)) {
              const u = users[uid2];
              u.superDate = today; u.superUsed = 0;
            }
            writeJSON(USERS_FILE, users);
            await tgPost("answerCallbackQuery", { callback_query_id: cq.id, text: t.done });
          }

          else if (action.startsWith("bonus:")) {
            const team = action.split(":")[1];
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
              parse_mode: "Markdown",
              reply_markup: {
                inline_keyboard: [[{ text: t.back, callback_data: "panel:main" }]]
              }
            });
          }

          else if (action === "admins") {
            // Show current admins (plain list)
            const list = admins.map(a => `• ${a}`).join("\n") || "(none)";
            await tgPost("editMessageText", {
              chat_id: msg.chat.id,
              message_id: msg.message_id,
              text: `${t.admins_title}\n\n${list}\n\n${t.admins_help}`,
              parse_mode: "Markdown",
              reply_markup: {
                inline_keyboard: [[{ text: t.back, callback_data: "panel:main" }]]
              }
            });
          }

          else if (action === "main") {
            await editToMainPanel(msg, lang);
          }
        }
      }

      if (data === "panel:main") {
        await editToMainPanel(cq.message, getAdminLang(uid));
      }

      await tgPost("answerCallbackQuery", { callback_query_id: cq.id });
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
