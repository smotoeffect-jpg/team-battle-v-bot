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
const BOT_TOKEN       = process.env.BOT_TOKEN       || "8366510657:AAEC5for6-8246aKdW6F5w3FPfJ5oWNLCfA";
const TG_API          = `https://api.telegram.org/bot${BOT_TOKEN}`;
const WEBHOOK_DOMAIN  = process.env.WEBHOOK_DOMAIN  || "https://team-battle-v-bot.onrender.com";
const MINI_APP_URL    = process.env.MINI_APP_URL    || "https://team-battle-v-bot.onrender.com/";
const DATA_DIR        = process.env.DATA_DIR        || "/data";

const STAR_TO_POINTS   = 2;
const SUPER_POINTS     = 25;
const DAILY_TAPS       = 300;
const AFFILIATE_BONUS  = 0.10;

const DAILY_BONUS_INTERVAL_MS = 24 * 60 * 60 * 1000;
const DAILY_BONUS_POINTS = 5;
const DAILY_BONUS_XP     = 10;
const LEVEL_STEP         = 100;

// ====== JSON Storage ======
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const SCORES_FILE = path.join(DATA_DIR, "scores.json");
const USERS_FILE  = path.join(DATA_DIR, "users.json");
const ADMINS_FILE = path.join(DATA_DIR, "admins.json");

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
let users  = readJSON(USERS_FILE,  {});
let admins = readJSON(ADMINS_FILE, ["7366892099","6081158942","7586749848"]); // Super Admins

// ====== helpers ======
function ensureUser(userId) {
  if (!users[userId]) {
    users[userId] = {
      team: null, tapsDate: null, tapsToday: 0,
      superDate: null, superUsed: 0,
      refBy: null, starsDonated: 0, bonusStars: 0,
      username: null, first_name: null, last_name: null, displayName: null,
      xp: 0, level: 1, lastDailyBonus: 0,
      history: [],
    };
  } else {
    const u = users[userId];
    if (typeof u.xp !== "number") u.xp = 0;
    if (typeof u.level !== "number") u.level = 1;
    if (typeof u.lastDailyBonus !== "number") u.lastDailyBonus = 0;
  }
  return users[userId];
}
function addXpAndMaybeLevelUp(u, addXp) {
  if (!addXp) return;
  u.xp += addXp;
  while (u.xp >= u.level * LEVEL_STEP) u.level++;
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
const tgPost = (m, d) => axios.post(`${TG_API}/${m}`, d).catch(e => console.error("TG error:", e?.response?.data || e.message));

// ================== API (Mini App) ==================
app.get("/api/state", (_, res) => res.json({ ok: true, scores }));

// (קוד המשחק נשאר זהה לחלוטין)
app.post("/api/select-team", (req, res) => {
  const { userId, team } = req.body || {};
  if (!userId || !["israel","gaza"].includes(team)) return res.status(400).json({ ok:false });
  const u = ensureUser(userId);
  u.team = team;
  writeJSON(USERS_FILE, users);
  res.json({ ok:true });
});

app.post("/api/tap", (req, res) => {
  const { userId } = req.body || {};
  const u = ensureUser(userId);
  if (!u.team) return res.status(400).json({ ok:false, error:"no team" });
  const today = todayStr();
  if (u.tapsDate !== today) { u.tapsDate = today; u.tapsToday = 0; }
  if (u.tapsToday >= DAILY_TAPS) return res.json({ ok:false, error:"limit" });
  u.tapsToday++;
  scores[u.team] += 1;
  addXpAndMaybeLevelUp(u, 1);
  writeJSON(USERS_FILE, users);
  writeJSON(SCORES_FILE, scores);
  res.json({ ok:true, scores });
});

// תרומה (Stars) – לא נוגעים לעולם
app.post("/api/create-invoice", async (req, res) => {
  try {
    const { userId, team, stars } = req.body;
    if (!userId || !team || !stars || stars < 1) return res.status(400).json({ ok:false });
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
    res.status(500).json({ ok:false, error:e.message });
  }
});

// ====== Me + Leaderboard ======
app.get("/api/me", (req, res) => {
  const userId = String(req.query.userId || "");
  const u = ensureUser(userId);
  const now = nowTs();
  const today = todayStr();
  if (u.tapsDate !== today) { u.tapsDate = today; u.tapsToday = 0; }

  // Bonus יומי
  let justGotDailyBonus = false;
  if (u.team && (!u.lastDailyBonus || now - u.lastDailyBonus >= DAILY_BONUS_INTERVAL_MS)) {
    scores[u.team] += DAILY_BONUS_POINTS;
    addXpAndMaybeLevelUp(u, DAILY_BONUS_XP);
    u.lastDailyBonus = now;
    u.history.push({ ts: now, type:"daily_bonus", points: DAILY_BONUS_POINTS, team: u.team, xp: DAILY_BONUS_XP });
    if (u.history.length > 200) u.history.shift();
    justGotDailyBonus = true;
    writeJSON(SCORES_FILE, scores);
  }
  writeJSON(USERS_FILE, users);
  res.json({
    ok:true,
    me:{
      userId, team:u.team, tapsToday:u.tapsToday, starsDonated:u.starsDonated, bonusStars:u.bonusStars,
      xp:u.xp, level:u.level, justGotDailyBonus
    }
  });
});

app.get("/api/leaderboard", (req, res) => {
  const arr = Object.entries(users).map(([id, u]) => ({
    userId:id, team:u.team, points:(u.starsDonated+u.bonusStars)*STAR_TO_POINTS, xp:u.xp, level:u.level
  }));
  arr.sort((a,b)=>b.points-a.points);
  res.json({ ok:true, top:arr.slice(0,20) });
});

// ================== ADMIN PANEL ==================
app.get("/api/panel/auth", (req, res) => {
  const uid = String(req.query.userId || "");
  if (admins.includes(uid)) return res.json({ ok:true, admin:true });
  return res.json({ ok:false, error:"unauthorized" });
});

app.post("/api/panel/add-admin", (req,res)=>{
  const { requesterId, newAdminId } = req.body;
  if (!admins.includes(requesterId)) return res.json({ ok:false, error:"unauthorized" });
  if (!newAdminId) return res.json({ ok:false, error:"missing id" });
  if (!admins.includes(newAdminId)) admins.push(newAdminId);
  writeJSON(ADMINS_FILE, admins);
  res.json({ ok:true, admins });
});
app.post("/api/panel/remove-admin", (req,res)=>{
  const { requesterId, targetId } = req.body;
  if (!admins.includes(requesterId)) return res.json({ ok:false, error:"unauthorized" });
  admins = admins.filter(a=>a!==targetId);
  writeJSON(ADMINS_FILE, admins);
  res.json({ ok:true, admins });
});

// ================== WEBHOOK ==================
app.post("/webhook", async (req, res) => {
  const update = req.body;
  if (update.message?.from) updateUserProfileFromTG(update.message.from);

  // פקודת /panel בבוט
  if (update.message?.text === "/panel") {
    const userId = String(update.message.from.id);
    if (admins.includes(userId)) {
      await tgPost("sendMessage", {
        chat_id: userId,
        text: `🛠️ פאנל ניהול זמין כאן:\n${WEBHOOK_DOMAIN}/panel?userId=${userId}`,
      });
    } else {
      await tgPost("sendMessage", { chat_id: userId, text: "❌ אין לך הרשאה לגשת לפאנל הניהול." });
    }
  }

  res.status(200).send("OK");
});

// ================== STATIC ==================
app.use(express.static(path.join(__dirname, "public")));
app.get("*", (_, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on :${PORT} | DATA_DIR=${DATA_DIR}`));
