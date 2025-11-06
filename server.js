/**
 * TeamBattle - V1.5-Clean
 * Clean, consolidated server (no duplicates). Payment creation flow is UNCHANGED.
 * Stars perks are granted via a safe helper after successful_payment.
 *
 * Env:
 *  BOT_TOKEN, WEBHOOK_DOMAIN, MINI_APP_URL, DATA_DIR
 * Files (persist):
 *  DATA_DIR/users.json, DATA_DIR/scores.json
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());

// ---------- Storage ----------
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const USERS_PATH = path.join(DATA_DIR, 'users.json');
const SCORES_PATH = path.join(DATA_DIR, 'scores.json');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(USERS_PATH)) fs.writeFileSync(USERS_PATH, JSON.stringify({}, null, 2));
if (!fs.existsSync(SCORES_PATH)) fs.writeFileSync(SCORES_PATH, JSON.stringify({ israel: 0, gaza: 0 }, null, 2));
function readJson(p){ try { return JSON.parse(fs.readFileSync(p,'utf8')||'{}'); } catch(e){ return {}; } }
function writeJson(p,obj){ fs.writeFileSync(p, JSON.stringify(obj, null, 2)); }

// ---------- User Model ----------
function getUser(userId){
  const users = readJson(USERS_PATH);
  if (!users[userId]){
    users[userId] = {
      userId,
      team: null,           // 'israel' | 'gaza'
      battle: 0,            // $Battle balance
      incomePerSec: 0,      // passive income per sec
      lastTick: Date.now(),
      upgrades: { battery: 0 },
      myTeam: {},           // items with { level }
      perks: { vip:false, autoclicker:false, offline:false },
      perkExpiry: { vip:0, autoclicker:0, offline:0 } // ms timestamps
    };
    writeJson(USERS_PATH, users);
  }
  return users[userId];
}
function saveUser(u){
  const users = readJson(USERS_PATH);
  users[u.userId] = u;
  writeJson(USERS_PATH, users);
}
function applyTick(u){
  const now = Date.now();
  const dt = Math.max(0, Math.floor((now - (u.lastTick||now))/1000));
  if (dt>0){
    u.battle += (u.incomePerSec||0)*dt;
    u.lastTick = now;
  }
  // Expiries
  ['vip','autoclicker','offline'].forEach(k=>{
    if (u.perkExpiry && u.perkExpiry[k] && now > u.perkExpiry[k]){
      u.perks[k] = false;
    }
  });
}

// ---------- API: Scoreboard ----------
app.get('/api/score', (req,res)=>{
  res.json(readJson(SCORES_PATH));
});

// ---------- API: User Snapshot ----------
app.get('/api/user/:userId', (req,res)=>{
  const u = getUser(req.params.userId);
  applyTick(u); saveUser(u);
  res.json({ user: u, scores: readJson(SCORES_PATH) });
});

// ---------- API: Choose / change team ----------
app.post('/api/user/:userId/team', (req,res)=>{
  const u = getUser(req.params.userId);
  const team = String((req.body&&req.body.team)||'').toLowerCase();
  if (!['israel','gaza'].includes(team)) return res.status(400).json({ error:'bad_team' });
  const prev = u.team; u.team = team; saveUser(u);
  res.json({ ok:true, prev, team });
});

// ---------- API: Tap ----------
app.post('/api/user/:userId/tap', (req,res)=>{
  const u = getUser(req.params.userId);
  applyTick(u);
  const mult = (u.perks && u.perks.vip) ? 1.25 : 1.0;
  const add = Math.max(1, Math.floor(((req.body&&req.body.amount)||1) * mult));
  u.battle += add;

  const scores = readJson(SCORES_PATH);
  if (u.team){ scores[u.team] = (scores[u.team]||0) + add; writeJson(SCORES_PATH, scores); }

  saveUser(u);
  res.json({ ok:true, add, battle:u.battle, scores });
});

// ---------- API: Upgrades (Battery via $Battle) ----------
app.post('/api/user/:userId/upgrade', (req,res)=>{
  const u = getUser(req.params.userId);
  const key = (req.body&&req.body.key)||'';
  if (key !== 'battery') return res.status(400).json({ error:'not_buyable_with_battle' });
  applyTick(u);
  const lvl = u.upgrades.battery||0;
  const cost = Math.floor(100 * Math.pow(1.8, lvl));
  if (u.battle < cost) return res.status(400).json({ error:'insufficient_battle', need: cost });
  u.battle -= cost;
  u.upgrades.battery = lvl + 1;
  u.dailyTapCap = (u.dailyTapCap||500) + 250;
  saveUser(u);
  res.json({ ok:true, user:u });
});

// ---------- API: My Team purchases (all in $Battle) ----------
app.post('/api/user/:userId/myteam/buy', (req,res)=>{
  const u = getUser(req.params.userId);
  applyTick(u);
  const itemKey = (req.body&&req.body.itemKey)||'';
  const CAT = {
    missiles:{ base:1200, inc:1.35, bonus:2 },
    weapons:{ base:800, inc:1.33, bonus:1 },
    soldiers:{ base:600, inc:1.32, bonus:1 },
    tanks:{ base:2000, inc:1.4, bonus:5 },
    vehicles:{ base:1500, inc:1.38, bonus:3 },
    aircraft:{ base:2500, inc:1.45, bonus:7 },
    ships:{ base:2200, inc:1.42, bonus:6 },
    countries:{ base:10000, inc:1.5, bonus:25 }
  };
  if (!CAT[itemKey]) return res.status(400).json({ error:'bad_item' });
  const entry = u.myTeam[itemKey] || { level: 0 };
  const cost = Math.floor(CAT[itemKey].base * Math.pow(CAT[itemKey].inc, entry.level));
  if (u.battle < cost) return res.status(400).json({ error:'insufficient_battle', need: cost });
  u.battle -= cost;
  entry.level += 1;
  u.myTeam[itemKey] = entry;
  u.incomePerSec = (u.incomePerSec||0) + CAT[itemKey].bonus;
  saveUser(u);
  res.json({ ok:true, user:u, cost });
});

// ---------- Stars products (prices + durations) ----------
app.get('/api/stars/products', (req,res)=>{
  res.json({
    vip:        { priceStars: 300, durationHours: 24*7 },
    autoclicker:{ priceStars: 50,  durationHours: 24 },
    offline:    { priceStars: 75,  durationHours: 72 }
  });
});

// ---------- Webhook post-processing helper ----------
function TB_grantStarsPerkByPayload(payload){
  try{
    if (!payload || typeof payload!=='string') return;
    if (!payload.startsWith('stars:')) return;
    const parts = payload.split(':');
    const key = parts[1];
    const userId = parts[2];
    if (!['vip','autoclicker','offline'].includes(key) || !userId) return;
    const u = getUser(userId);
    const now = Date.now();
    const DUR = { vip: 24*7, autoclicker: 24, offline: 72 };
    u.perks[key] = true;
    u.perkExpiry[key] = now + DUR[key]*3600*1000;
    saveUser(u);
  }catch(e){}
}

// Optional endpoint if you prefer to call from your existing webhook:
app.post('/api/stars/grant', (req,res)=>{
  TB_grantStarsPerkByPayload((req.body&&req.body.payload)||'');
  res.json({ ok:true });
});

// ---------- Health ----------
app.get('/healthz', (req,res)=> res.send('ok'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=> console.log('TeamBattle V1.5-Clean server on', PORT));
