// ===== Auto-detect API base (Render / local / Telegram) =====
const API_BASE = window.API_BASE_FROM_SERVER || window.location.origin;
// === WAIT FOR TELEGRAM WEBAPP TO LOAD ===
console.log("⏳ Waiting for Telegram WebApp...");
function waitForWebApp(maxWait = 2000) {
  return new Promise(resolve => {
    let waited = 0;
    const iv = setInterval(() => {
      if (window.Telegram?.WebApp) {
        clearInterval(iv);
        console.log("🌐 WebApp Detected:", true);
        resolve(window.Telegram.WebApp);
      }
      waited += 100;
      if (waited >= maxWait) {
        clearInterval(iv);
        console.warn("⚠️ Telegram WebApp not detected after wait — using fallback.");
        resolve(null);
      }
    }, 100);
  });
}
document.addEventListener("DOMContentLoaded", async () => {
  const WebApp = await waitForWebApp();
  console.log("🔑 initData:", WebApp?.initData);


 // ===== FORCE SEND initData header if missing (Telegram Android/iOS fallback) =====
if (!WebApp?.initData && window.location.search.includes("tgWebAppData=")) {
  const params = new URLSearchParams(window.location.search);
  const data = params.get("tgWebAppData");
  if (data) {
    console.log("🧩 Injecting initData manually from URL (early)!");
    if (!window.Telegram) window.Telegram = {};
    if (!window.Telegram.WebApp) window.Telegram.WebApp = {};
    window.Telegram.WebApp.initData = decodeURIComponent(data);
  }
}
  if (window.Telegram?.WebApp?.initData) {
  WebApp.initData = window.Telegram.WebApp.initData;
}
  // ====== FORCE Telegram InitData Injection (for some Android/iOS/Desktop issues) ======
if (!window.Telegram?.WebApp?.initData && window.location.search.includes("tgWebAppData=")) {
  try {
    const params = new URLSearchParams(window.location.search);
    const data = params.get("tgWebAppData");
    if (data) {
      if (!window.Telegram) window.Telegram = {};
      if (!window.Telegram.WebApp) window.Telegram.WebApp = {};
      window.Telegram.WebApp.initData = decodeURIComponent(data);
      window.Telegram.WebApp.initDataUnsafe = JSON.parse(Object.fromEntries(new URLSearchParams(data)).user || "{}");
      console.log("🧩 Fixed Telegram initData from URL!");
    }
  } catch (e) {
    console.warn("InitData fix failed:", e);
  }
}
  // ====== Desktop & WebApp fallback ======
if (!window.Telegram?.WebApp?.initData && window.location.hash.includes("tgWebAppData=")) {
  try {
    const hash = window.location.hash.split("tgWebAppData=")[1];
    const data = decodeURIComponent(hash.split("&")[0]);
    if (data) {
      if (!window.Telegram) window.Telegram = {};
      if (!window.Telegram.WebApp) window.Telegram.WebApp = {};
      window.Telegram.WebApp.initData = data;
      window.Telegram.WebApp.initDataUnsafe = JSON.parse(Object.fromEntries(new URLSearchParams(data)).user || "{}");
      console.log("🧩 Fixed Telegram initData from hash fragment!");
    }
  } catch (e) {
    console.warn("InitData hash fix failed:", e);
  }
}
// ✅ אם הצלחנו לשחזר את initData - ודא שהאובייקט הראשי מעודכן
if (window.Telegram?.WebApp?.initData) {
  WebApp.initData = window.Telegram.WebApp.initData;
}

  // ===== Detect Telegram user or create fallback ID =====
  let telegramUserId = null;
    async function waitForTelegramUser() {
    for (let i = 0; i < 20; i++) { // ננסה עד 2 שניות
      if (WebApp?.initDataUnsafe?.user?.id) {
        return WebApp.initDataUnsafe.user.id;
      }
      await new Promise(r => setTimeout(r, 100));
    }
    return null;
  }

  telegramUserId = await waitForTelegramUser();

  if (!telegramUserId) {
    console.warn("⚠️ Telegram userId not found — using fallback guest ID");
    telegramUserId = localStorage.getItem("tb_fallback_id");
    if (!telegramUserId) {
      telegramUserId = "guest_" + Math.floor(Math.random() * 9999999);
      localStorage.setItem("tb_fallback_id", telegramUserId);
    }
  }

  console.log("✅ Active userId:", telegramUserId);

// ✅ חשוב: לחשוף את ה־userId ל־window + לשמור בלוקאל
window.telegramUserId = telegramUserId;
localStorage.setItem("telegram_userId", telegramUserId);

console.log("🔍 FULL initDataUnsafe dump:", WebApp?.initDataUnsafe);

// === INITIALIZE TELEGRAM WEBAPP ===
WebApp?.ready?.();

// === INITIALIZE TELEGRAM ANALYTICS ===
if (Telegram?.WebApp?.analytics?.init) {
  Telegram.WebApp.analytics.init({
    apiKey: "eyJhcHBfbmFtZSI6InRlYW1iYXR0bGUiLCJhcHBfdXJsIjoiaHR0cHM6Ly90Lm1lL1RlYW1CYXR0bGVfdkJvdCIsImFwcF9kb21haW4iOiJodHRwczovL3RlYW0tYmF0dGxlLXYtYm90Lm9ucmVuZGVyLmNvbS8ifQ==!20kwbjUvrZeEhWCXsAnFawdEev+nI2EkcQUH1IShjIA="
  });
}
  
// ====== Translations (Full Multilingual Map) ======
const i18n = {
  en: {
    // 🏁 General
    israel: "Israel",
    gaza: "Gaza",
    tap: "Tap (+1)",
    superBoost: "Super Boost (+25)",
    switchTeam: "Switch Team",
    extraTap: "Extra Tap",
    myBoard: "My Board",
    stars: "Stars / Extra Tap",
    playerLevel: "Player Level",
    referrals: "Invited Friends",
    tapsToday: "Taps today",
    top20: "Top 20",
    copied: "Copied!",
    err: "Something went wrong",
    partnerTitle: "Affiliate Program",
    copy: "Copy Link",
    chooseTeam: "Choose your team",
    battleShort: "$Battle",
    incomeShort: "Income",

    // ⚙️ Upgrades + Battery
    upgradesTitle: "Upgrades",
    batteryLevel: "Battery Level",
    batteryCap: "Capacity",
    batteryCost: "Cost",
    upgradeBattery: "Upgrade Battery",
    upgradeBatteryBtn: "Upgrade Battery",
    comingSoon: "⚙️ Upgrade your power, energy and rewards!",

    // 💎 VIP
    vipStatusLabel: "VIP Status",
    vipCost: "Cost",
    buyVip: "Buy VIP",
    vipActive: "Active",
    vipInactive: "Inactive",
    vipTimeLeft: "Time Left",

    // ❗ VIP info popup
    vipInfoText:
      "🔥 VIP Benefits:\n\n• +25% Tap Power\n• Passive income ×5\n• Battery ×3\n• 25% Battle discount\n• Duration: 7 days",

    // 🧭 Bottom Navigation
    navHome: "Home",
    navMyTeam: "My Team",
    navUpgrades: "Upgrades",
    navLeaderboard: "Leaderboard",
    navReferrals: "Referrals"
  },

  he: {
    // 🏁 כללי
    israel: "ישראל",
    gaza: "עזה",
    tap: "טאפ (+1)",
    superBoost: "סופר בוסט (+25)",
    switchTeam: "החלף קבוצה",
    extraTap: "Extra Tap",
    myBoard: "הלוח שלי",
    stars: "כוכבים / Extra Tap",
    playerLevel: "רמת שחקן",
    referrals: "מוזמנים",
    tapsToday: "טאפים היום",
    top20: "טופ 20",
    copied: "הועתק!",
    err: "אירעה שגיאה",
    partnerTitle: "תוכנית שותפים",
    copy: "העתק קישור",
    chooseTeam: "בחר את הקבוצה שלך",
    battleShort: "$Battle",
    incomeShort: "הכנסה",

    // ⚙️ שדרוגים + בטרייה
    upgradesTitle: "שדרוגים",
    batteryLevel: "רמת בטרייה",
    batteryCap: "קיבולת",
    batteryCost: "עלות",
    upgradeBattery: "שדרג בטרייה",
    upgradeBatteryBtn: "שדרוג בטרייה",
    comingSoon: "⚙️ שדרג את העוצמה, האנרגיה והפרסים שלך!",

    // 💎 VIP
    vipStatusLabel: "מצב VIP",
    vipCost: "עלות",
    buyVip: "קנה VIP",
    vipActive: "פעיל",
    vipInactive: "לא פעיל",
    vipTimeLeft: "זמן שנותר",

    // ❗ VIP info popup
    vipInfoText:
      "🔥 יתרונות VIP:\n\n• ‎+25% כוח לטאפ\n• הכנסה פסיבית ×5\n• בטרייה ×3\n• ‎25% הנחה בשדרוגים\n• תוקף: 7 ימים",

    // 🧭 סרגל תחתון
    navHome: "בית",
    navMyTeam: "הקבוצה שלי",
    navUpgrades: "שדרוגים",
    navLeaderboard: "לוח מובילים",
    navReferrals: "שותפים"
  },

  ar: {
    // 🏁 عام
    israel: "إسرائيل",
    gaza: "غزة",
    tap: "انقر (+1)",
    superBoost: "دفعة قوية (+25)",
    switchTeam: "بدّل الفريق",
    extraTap: "Extra Tap",
    myBoard: "لوحتي",
    stars: "نجوم / Extra Tap",
    playerLevel: "مستوى اللاعب",
    referrals: "الأصدقاء المدعوون",
    tapsToday: "نقرات اليوم",
    top20: "أفضل 20",
    copied: "تم النسخ!",
    err: "حدث خطأ ما",
    partnerTitle: "برنامج الإحالة",
    copy: "انسخ الرابط",
    chooseTeam: "اختر فريقك",
    battleShort: "$Battle",
    incomeShort: "الدخل",

    // ⚙️ الترقيات + البطارية
    upgradesTitle: "الترقيات",
    batteryLevel: "مستوى البطارية",
    batteryCap: "السعة",
    batteryCost: "التكلفة",
    upgradeBattery: "ترقية البطارية",
    upgradeBatteryBtn: "ترقية البطارية",
    comingSoon: "⚙️ قم بترقية قوتك وطاقتك ومكافآتك!",

    // 💎 VIP
    vipStatusLabel: "حالة VIP",
    vipCost: "التكلفة",
    buyVip: "شراء VIP",
    vipActive: "نشط",
    vipInactive: "غير نشط",
    vipTimeLeft: "الوقت المتبقي",

    // ❗ VIP info popup
    vipInfoText:
      "🔥 مزايا VIP:\n\n• ‎+25% قوة النقرة\n• دخل سلبي ×5\n• بطارية ×3\n• خصم 25%\n• مدة: 7 أيام",

    // 🧭 شريط التنقل السفلي
    navHome: "الرئيسية",
    navMyTeam: "فريقي",
    navUpgrades: "الترقيات",
    navLeaderboard: "المتصدرون",
    navReferrals: "الإحالات"
  }
};

function getLang() {
  return document.documentElement.getAttribute("data-lang") || "he";
}

function setLang(l) {
  document.documentElement.setAttribute("data-lang", l);
  localStorage.setItem("tb_lang", l);

  document.querySelectorAll("[data-i18n]").forEach(el => {
    const k = el.getAttribute("data-i18n");
    el.textContent = i18n[l]?.[k] || k;
  });
}

const langBtns = document.querySelectorAll(".lang-switch [data-lang]");
if (langBtns && langBtns.length) {
  langBtns.forEach(btn =>
    btn.addEventListener("click", () => setLang(btn.dataset.lang))
  );
}

(function () {
  const s = localStorage.getItem("tb_lang");
  if (s) {
    setLang(s);
  } else {
    const t = (navigator.language || "he").slice(0, 2);
    setLang(["he", "en", "ar"].includes(t) ? t : "he");
  }
})();
// שמירת הדגשה מהבחירה הקודמת
const savedTeam = localStorage.getItem("tb_team");
if (savedTeam) {
  const savedFlag = document.getElementById(`flag-${savedTeam}`);
  if (savedFlag) savedFlag.classList.add("flag-selected");
}

  // ===== API helpers =====
  if (window.Telegram?.WebApp?.initData) {
  WebApp.initData = window.Telegram.WebApp.initData;
}
  const headers = {}; 
  try { if(WebApp?.initData) headers['X-Init-Data'] = WebApp.initData; } catch(_){}
// ✅ תיקון: ודא שתמיד יש userId כלשהו בכותרת
if (telegramUserId) {
  headers['X-Telegram-UserId'] = telegramUserId;
}
  async function getJSON(u){ const r=await fetch(u,{headers}); if(!r.ok) throw new Error('HTTP '+r.status); return r.json(); }
  async function postJSON(u,b){ const r=await fetch(u,{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(b||{})}); if(!r.ok) throw new Error('HTTP '+r.status); return r.json(); }
  function setText(id,txt){ const el=document.getElementById(id); if(el) el.textContent=txt; }

  // ===== Game state =====
  let GAME={scores:{israel:0,gaza:0},me:{id:null,team:null,tapsToday:0,tapsLimit:300,level:1,referrals:0,stars:0,username:null},leaderboard:[]};

  function paintScores(){ setText('score-israel-value', GAME.scores?.israel??0); setText('score-gaza-value', GAME.scores?.gaza??0); }
  function paintMe() {
  // 🔢 פונקציית עזר לעיצוב מספרים עם K / M
  function formatNumber(value) {
    const num = Number(value ?? 0);
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(2) + "M";
    if (num >= 1_000) return (num / 1_000).toFixed(1) + "K";
    return num.toFixed(0);
  }

  // 💰 עיצוב יתרת Battle
  function formatBattle(value) {
    const num = Number(value ?? 0);
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(2) + "M";
    if (num >= 1_000) return (num / 1_000).toFixed(2) + "K";
    return num.toFixed(2);
  }

  // ⭐ XP
  setText('me-xp', formatNumber(GAME.me.xp ?? 0));

  // 🌟 Stars
  setText('me-stars', String(GAME.me.stars ?? '–'));

  // 🪙 $Battle
  setText('me-battle', formatBattle(GAME.me.battle));

  // 🎮 Level + Tap Power
  setText('me-level', String(GAME.me.level ?? '–'));
  setText('me-tap-power', String(GAME.me.level));

  // 👥 Referrals
  setText('me-referrals', String(GAME.me.referrals ?? '–'));

  // 👆 Taps
  setText('me-taps', `${GAME.me.tapsToday ?? 0}/${GAME.me.tapsLimit ?? 300}`);
}
  function paintTop20() {
  const ul = document.getElementById('top20-list');
  if (!ul) return;
  ul.innerHTML = '';

  // 💰 מיון לפי $Battle
  const sorted = (GAME.leaderboard || [])
    .filter(p => (p.points || 0) > 0)
    .sort((a, b) => (b.points || 0) - (a.points || 0))
    .slice(0, 20);

  sorted.forEach((p, idx) => {
    const li = document.createElement('li');
    li.className = 'player-item';
    if (idx < 5) li.classList.add('top5');

    const name = document.createElement('span');
    name.className = 'name';
    name.textContent = p.displayName || p.first_name || p.username || `Player #${idx + 1}`;

    const battle = document.createElement('span');
    battle.className = 'battle';
    battle.textContent = `${(p.points || 0).toFixed(2)} BATTLE`;

    li.appendChild(name);
    li.appendChild(battle);
    ul.appendChild(li);
  });
}
// ===== Affiliate / Referral Section (3 languages + unified link) =====
try {
  // מושך מידע על המשתמש כולל כמות המוזמנים
  const meResp = await getJSON(`/api/me?userId=${telegramUserId}`);
  const M = meResp?.me || meResp || {};
  const uid = M.id || M.userId || telegramUserId;
  const refCount = M.referrals ?? 0;

  // יוצר קישור שותפים רגיל
  const bot = "TeamBattle_vBot";
  const refLink = uid ? `https://t.me/${bot}?start=${uid}` : "";

  // תופס אלמנטים מה־HTML
  const inp = document.getElementById("refLink");
  const cpy = document.getElementById("copyRef");
  const shr = document.getElementById("shareRef");

  // מציג את הקישור
  if (inp) inp.value = refLink;

  // תרגום לפי השפה הנוכחית
  const lang = getLang();
  const shareText = {
    he: "💥 הצטרפו אליי ל־TeamBattle 🇮🇱⚔️🇵🇸!",
    en: "💥 Join me in TeamBattle 🇮🇱⚔️🇵🇸!",
    ar: "💥 انضم إليّ في TeamBattle 🇮🇱⚔️🇵🇸!"
  }[lang] || "Join me in TeamBattle!";

  // כפתור העתקה
  if (cpy) cpy.addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(refLink); } catch (_) {}
    const old = cpy.textContent;
    cpy.textContent = i18n[lang]?.copied || "Copied!";
    setTimeout(() => (cpy.textContent = old), 1100);
  });

  // כפתור שיתוף
  if (shr) shr.addEventListener("click", () => {
    const url = `https://t.me/share/url?url=${encodeURIComponent(refLink)}&text=${encodeURIComponent(shareText)}`;
    window.open(url, "_blank");
  });

  // עדכון המספר של המוזמנים בלוח האישי
  setText("me-referrals", refCount);

} catch (err) {
  console.error("Referral section error:", err);
}

try {
  const lb = await getJSON(`${API_BASE}/api/leaderboard`);
  if (Array.isArray(lb)) GAME.leaderboard = lb.slice(0, 20);
  else if (Array.isArray(lb?.leaders)) GAME.leaderboard = lb.leaders.slice(0, 20);
  else if (Array.isArray(lb?.top)) GAME.leaderboard = lb.top.slice(0, 20);
  paintTop20();
} catch (err) {
  console.error("Leaderboard fetch error:", err);
}

// ===== Helper: Convert large numbers (K, M, B, T) =====
function formatNumber(num) {
  if (num >= 1_000_000_000_000) return (num / 1_000_000_000_000).toFixed(2) + "T";
  if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(2) + "B";
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(2) + "M";
  if (num >= 1_000) return (num / 1_000).toFixed(2) + "K";
  return num.toFixed(2);
}
  
// ========== VIP TIME LEFT DISPLAY ==========
function updateVipTimer(expiry) {
  const row = document.getElementById("vipTimeRow");
  const out = document.getElementById("vipTimeLeft");
  if (!row || !out) return;

  const now = Date.now();

  if (!expiry || expiry <= now) {
    row.style.display = "none";
    return;
  }

  row.style.display = "flex";

  const left = expiry - now;

  const days = Math.floor(left / (1000 * 60 * 60 * 24));
  const hours = Math.floor((left / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((left / (1000 * 60)) % 60);

  out.textContent = `${days}d ${hours}h ${minutes}m`;
}
  
// ===== Refresh Game Data (Real-time 0.5s) =====
async function refreshAll() {
  try {
    const userId =
      telegramUserId || localStorage.getItem("telegram_userId") || "guest";

    // --- מצב כללי ---
    const state = await getJSON(`${API_BASE}/api/state`);
    if (state?.scores) GAME.scores = state.scores;
    paintScores();

    // --- נתוני משתמש ---
    const meResp = await getJSON(`${API_BASE}/api/me?userId=${userId}`);
    const M = meResp?.me || meResp || {};
    if (!GAME.me) GAME.me = {};

    GAME.me.id = M.userId ?? M.id ?? telegramUserId;
    GAME.me.team = M.team ?? GAME.me.team ?? null;
    GAME.me.tapsToday = Math.max(
      GAME.me.tapsToday || 0,
      M.tapsToday ?? M.taps_today ?? M.taps ?? 0
    );
    GAME.me.level = Math.max(GAME.me.level || 1, M.level ?? 1);
    GAME.me.referrals = Math.max(
      GAME.me.referrals || 0,
      M.referrals ?? M.invited ?? 0
    );
    GAME.me.stars = Math.max(
      GAME.me.stars || 0,
      M.starsDonated ?? M.stars ?? M.balance ?? 0
    );
    GAME.me.battle = Math.max(
      GAME.me.battle || 0,
      M.battleBalance ?? 0
    );
    GAME.me.xp = Math.max(GAME.me.xp || 0, M.xp ?? 0);

    // ⭐⭐⭐⭐⭐ ADD — VIP TIMER UPDATE ⭐⭐⭐⭐⭐
    if (M.perkExpiry || M.vipExpiry) {
      updateVipTimer(M.perkExpiry || M.vipExpiry);
    }
    // ⭐⭐⭐⭐⭐ END ADD ⭐⭐⭐⭐⭐

    // --- נתוני שותפים ---
    let partner = {};
    try {
      const partnerResp = await getJSON(`${API_BASE}/api/partner/${userId}`);
      if (partnerResp?.ok || partnerResp?.earnedBattle) partner = partnerResp;
    } catch {
      console.warn("ℹ️ Partner API unavailable, fallback to empty data");
    }
    GAME.partner = partner || {};

    // --- נתוני הכנסה כוללת ---
    let totalBattle = 0;
    let incomePerSec = 0;

    try {
      const earnResp = await getJSON(`${API_BASE}/api/earnings/${userId}`);
      if (earnResp?.ok) {
        totalBattle = Number(earnResp.totalBattle || 0);
        const bd = earnResp.breakdown || {};
        const passiveEarnings = Number(bd.passiveEarnings || 0);
        incomePerSec = passiveEarnings > 0 ? passiveEarnings / 60 : 0;
      }
    } catch {
      const battleFromTaps = GAME.me.battle || 0;
      const battleFromRefs = GAME.partner.earnedBattle || 0;
      const xpBonus = (GAME.me.xp || 0) * 0.1;
      totalBattle = battleFromTaps + battleFromRefs + xpBonus;
      incomePerSec = GAME.partner.incomePerSec || 0;
    }

    // --- הצגת נתונים מעוצבים ---
    const battleEl = document.getElementById("battleShort");
    const incomeEl = document.getElementById("incomeShort");

    if (battleEl) battleEl.textContent = `${formatNumber(totalBattle)} $Battle`;
    if (incomeEl) incomeEl.textContent = `⚡ ${formatNumber(incomePerSec)}/sec`;

    paintMe();
  } catch (err) {
    console.error("⚠️ refreshAll error:", err);
  }
}

setInterval(refreshAll, 500);
refreshAll();

// ===== FIX: Force UI sync immediately after loading user data =====
async function syncUserUI() {
  try {
    const userId = telegramUserId;
    const res = await fetch(`${API_BASE}/api/me?userId=${userId}`);
    const data = await res.json();

    if (!data.ok) return;

    const u = data.me;

    // === Battery UI ===
    if (document.getElementById("batteryLevel"))
      document.getElementById("batteryLevel").textContent = u.batteryLevel;

    if (document.getElementById("batteryCap"))
      document.getElementById("batteryCap").textContent = u.batteryCap;

    if (document.getElementById("batteryCost"))
      document.getElementById("batteryCost").textContent = u.batteryNextCost || 100;

    // === VIP UI ===
    const now = Date.now();
    const isVip = u.perkExpiry && now < u.perkExpiry;

    const vipStatus = document.getElementById("vipStatus");
    if (vipStatus) {
      vipStatus.textContent = isVip ? i18n[getLang()].vipActive : i18n[getLang()].vipInactive;
      vipStatus.style.color = isVip ? "#00ff99" : "#ff4d4d";
    }

    // 🔒 Disable VIP button if VIP active
    const vipBtn = document.getElementById("btn-activate-vip");
    if (vipBtn) {
      if (isVip) {
        vipBtn.disabled = true;
        vipBtn.style.opacity = "0.5";
      } else {
        vipBtn.disabled = false;
        vipBtn.style.opacity = "1";
      }
    }

  } catch (err) {
    console.warn("syncUserUI failed:", err);
  }
}

// הרצה מיד אחרי שהמשחק נטען
setTimeout(syncUserUI, 300);

// ריענון UI קבוע
setInterval(syncUserUI, 1500);
  
  // ===== Status Bar =====
  const statusLine=document.getElementById('status-line');
  function flashStatus(m){ if(!statusLine) return; statusLine.textContent=m; statusLine.style.opacity='1'; setTimeout(()=>statusLine.style.opacity='0.7',1600); }

  // ===== Buttons =====
  // ⚡ פונקציה מאוחדת לעדכון XP והבזק מיידי
async function handleAction(type, xpGain) {
  try {
    await postJSON(`/api/${type}`, { userId: GAME.me.id });
    GAME.me.xp = (GAME.me.xp ?? 0) + xpGain;
    paintMe();
    flashXP();
    await refreshAll();
  } catch (_) {
    flashStatus(i18n[getLang()].err);
  }
}
  
// 🎯 Tap
const btnTap = document.getElementById('btn-tap');
if (btnTap) btnTap.addEventListener('click', () => handleAction('tap', 1));

// 💥 Super Boost
const btnSuper = document.getElementById('btn-super');
if (btnSuper) btnSuper.addEventListener('click', () => handleAction('super', 25));

  // ✨ אפקט ויזואלי קל לעדכון XP
function flashXP() {
  const xpEl = document.getElementById('me-xp');
  if (!xpEl) return;
  xpEl.style.transition = 'none';
  xpEl.style.transform = 'scale(1.25)';
  xpEl.style.color = '#ffd76b';
  setTimeout(() => {
    xpEl.style.transition = 'all 0.3s ease';
    xpEl.style.transform = 'scale(1)';
    xpEl.style.color = '';
  }, 80);
}
  // ===== Switch Team Button =====
const btnSwitch = document.getElementById('btn-switch');
if (btnSwitch) btnSwitch.addEventListener('click', async () => {
  console.log("🌀 [SWITCH] Button clicked! Current team:", GAME.me.team, "UserID:", GAME.me.id);
  try {
    const to = (GAME.me.team === 'israel') ? 'gaza' : 'israel';
    console.log("➡️ [SWITCH] Sending switch request to:", to);
    const res = await postJSON(`${API_BASE}/api/switch-team`, { userId: GAME.me.id, newTeam: to });
    console.log("✅ [SWITCH] Response from server:", res);
    await refreshAll();
  } catch (err) {
    console.error("❌ [SWITCH] Error:", err);
    flashStatus(i18n[getLang()].err);
  }
});  
  // ===== Extra Tap / Payment =====
const btnExtra = document.getElementById('btn-extra');
if (btnExtra) btnExtra.addEventListener('click', async () => {
  console.log("💰 [EXTRA] Button clicked!");
  const starsInput = document.getElementById('stars-input');
  const amount = Math.max(1, Math.min(1000, parseInt(starsInput?.value || '0')));
  console.log("💫 [EXTRA] Creating invoice for", amount, "stars. UserID:", GAME.me.id, "Team:", GAME.me.team);
  try {
    const r = await postJSON('/api/create-invoice', { userId: GAME.me.id, team: GAME.me.team, stars: amount });
    console.log("✅ [EXTRA] Server response:", r);
    if (r?.ok && r.url) {
      console.log("🧾 [EXTRA] Invoice URL:", r.url);
      if (WebApp?.openInvoice) {
        WebApp.openInvoice(r.url, () => {
          console.log("📲 [EXTRA] Invoice closed or paid.");
          refreshAll();
        });
      } else {
        window.location.href = r.url;
      }
    } else {
      console.warn("⚠️ [EXTRA] Invoice creation failed:", r);
    }
  } catch (err) {
    console.error("❌ [EXTRA] Error:", err);
    flashStatus(i18n[getLang()].err);
  }
});  // ← ← ← זה הסוגר האחרון של האירוע של כפתור Extra

// ===== Unified Invoice Handler (Extra Tap + VIP) =====
function openInvoice(invoiceLink) {
  try {
    if (window.Telegram?.WebApp?.openInvoice) {
      window.Telegram.WebApp.openInvoice(invoiceLink, (status) => {
        console.log("💸 Invoice Status:", status);

        if (status === "paid") {
          console.log("🎉 Payment completed!");
          refreshAll(); 
        }
      });
    } else {
      window.location.href = invoiceLink;
    }
  } catch (err) {
    console.error("openInvoice error:", err);
  }
}
  
// === TON Wallet Connect ===
console.log("💎 Initializing TON Connect...");
try {
  const TonConnectClass =
    window.TonConnectSDK?.TonConnect ||
    window.TonConnect ||
    window.TON_CONNECT?.TonConnect;

  if (!TonConnectClass) {
    console.error("❌ TON SDK not found in window!");
  } else {
    // ✅ טוענים את הארנק ידנית (גרסת SDK נכונה)
    const tonConnect = new TonConnectClass({
      manifestUrl: "https://team-battle-v-bot.onrender.com/tonconnect-manifest.json",
      walletsList: [
        {
          name: "Tonkeeper",
          appName: "tonkeeper",
          imageUrl: "https://tonkeeper.com/assets/tonconnect-icon.png",
          bridgeUrl: "https://bridge.tonapi.io/bridge",
          universalLink: "https://app.tonkeeper.com/ton-connect/v2"
        }
      ]
    });

    console.log("✅ TON Connect initialized successfully (manual wallet mode)");

    const connectBtn = document.getElementById("connect-ton");
    const addressDiv = document.getElementById("ton-address");

    // === פונקציה ראשית לחיבור ארנק ===
    async function connectTonWallet() {
      try {
        console.log("💎 Opening TON Connect Wallet (Universal mode only)...");

        // 🧩 אם יש injected wallet (כמו Tonkeeper Extension)
        const hasInjected = !!window.ton || !!window.tonkeeper;
        if (hasInjected) {
          console.log("💠 Injected wallet detected, connecting via extension...");
          const connectedWallet = await tonConnect.connect();
          if (connectedWallet?.account?.address) {
            const addr = connectedWallet.account.address;
            addressDiv.textContent = `Connected: ${addr.slice(0, 6)}...${addr.slice(-4)}`;
            connectBtn.style.display = "none";
            console.log("✅ Wallet connected via injected provider:", addr);
            return;
          }
        }

        // ✅ אחרת — פתיחת Tonkeeper עם redirect חזרה לאפליקציה
        const link = tonConnect.connect({
          universalLink: "https://app.tonkeeper.com/ton-connect/v2",
          bridgeUrl: "https://bridge.tonapi.io/bridge"
        });

        if (link && Telegram?.WebApp?.openLink) {
          console.log("📱 Opening Tonkeeper via Telegram WebApp:", link);
          Telegram.WebApp.openLink(link, { try_instant_view: false });
        } else {
          console.log("🌐 Opening Tonkeeper directly:", link);
          window.location.href = link;
        }

        // ⏳ נמתין עד שהחיבור יתעדכן אוטומטית
        let tries = 0;
        const checkInterval = setInterval(() => {
          const wallet = tonConnect.wallet;
          if (wallet?.account?.address) {
            clearInterval(checkInterval);
            const addr = wallet.account.address;
            addressDiv.textContent = `Connected: ${addr.slice(0, 6)}...${addr.slice(-4)}`;
            connectBtn.style.display = "none";
            console.log("✅ Wallet connected via polling:", addr);
          }
          if (tries++ > 60) clearInterval(checkInterval); // דקה מקסימום
        }, 1000);
      } catch (err) {
        console.error("❌ TON connect error:", err);
        flashStatus("TON Connect Error");
      }
    } // ← סוגר תקין של הפונקציה

    // === מאזין סטטוס לארנק ===
    tonConnect.onStatusChange((wallet) => {
      if (wallet?.account?.address) {
        const addr = wallet.account.address;
        addressDiv.textContent = `Connected: ${addr.slice(0, 6)}...${addr.slice(-4)}`;
        connectBtn.style.display = "none";
        console.log("✅ Wallet auto-connected:", addr);
      } else {
        connectBtn.style.display = "inline-block";
        addressDiv.textContent = "";
      }
    });

    // === מאזין לכפתור חיבור ===
    connectBtn.addEventListener("click", connectTonWallet);
  } // ← סוגר את ה־else של !TonConnectClass
} catch (err) {
  console.error("❌ TON Connect initialization failed:", err);
}
  
// 🔒 Disable hidden buttons (Super + Switch) + Team Selection
});

document.addEventListener("DOMContentLoaded", () => {
  // ===== Hide ghost buttons =====
  const btnSuper = document.getElementById("btn-super");
  const btnSwitch = document.getElementById("btn-switch");

  if (btnSuper) { btnSuper.style.display = "none"; btnSuper.disabled = true; }
  if (btnSwitch) { btnSwitch.style.display = "none"; btnSwitch.disabled = true; }

  // ===== Team Selection Buttons =====
  const flagIsrael = document.getElementById("flag-israel");
  const flagGaza = document.getElementById("flag-gaza");

  if (flagIsrael && flagGaza) {
    flagIsrael.addEventListener("click", () => selectTeam("israel"));
    flagGaza.addEventListener("click", () => selectTeam("gaza"));
  }

  // ===== Re-apply saved highlight =====
  const savedTeam = localStorage.getItem("tb_team");
  if (savedTeam) {
    const savedFlag = document.getElementById(`flag-${savedTeam}`);
    if (savedFlag) savedFlag.classList.add("flag-selected");
  }

  // ✅ בחירת קבוצה ושמירה בלוקאל + שרת
  async function selectTeam(team) {
    try {
      // 🧩 הפתרון הקריטי – מקבל userId אמיתי גם אם telegramUserId לא נטען עדיין
      let userId =
        window.telegramUserId ||
        Telegram?.WebApp?.initDataUnsafe?.user?.id ||
        localStorage.getItem("telegram_userId") ||
        "guest";

      // שומר לוקאלית שיהיה תמיד זמין
      localStorage.setItem("telegram_userId", userId);

      const res = await fetch(`/api/user/${userId}/team`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, team })
      });

      const data = await res.json();

      if (data.ok) {
        console.log(`✅ Team changed to ${data.team}`);
        localStorage.setItem("tb_team", team);
      } else {
        console.warn("⚠️ Server did not confirm, saving locally");
        localStorage.setItem("tb_team", team);
      }

      // מעדכן הדגשה ו־UI
      document.querySelectorAll("#flag-israel, #flag-gaza").forEach(el => {
        el.classList.remove("flag-selected");
      });
      const selectedFlag = document.getElementById(`flag-${team}`);
      if (selectedFlag) selectedFlag.classList.add("flag-selected");

      await refreshAll();
    } catch (err) {
      console.error("❌ Team select error:", err);
      localStorage.setItem("tb_team", team);
    }
  }
});

// ===== TB_V18 — Panels Real-Time Sync (VIP status + time left) =====
async function syncPanels(panelKey) {
  try {
    const res = await fetch(`${API_BASE}/api/user/` + window.telegramUserId);
    const data = await res.json();
    if (!data.ok || !data.user) return;

    const u = data.user;

    // === עמוד שדרוגים (Upgrades) ===
    if (panelKey === "upgrades" || panelKey === "home") {

      // 🔋 בטרייה
      const lvlEl = document.getElementById("batteryLevel");
      const capEl = document.getElementById("batteryCap");
      const costEl = document.getElementById("batteryCost");

      if (lvlEl) lvlEl.textContent  = u.batteryLevel ?? 1;
      if (capEl) capEl.textContent  = u.batteryCap   ?? 300;
      if (costEl) costEl.textContent = u.batteryCost ?? 100;

      // 💎 VIP — סטטוס + זמן שנשאר
      const vipStatus = document.getElementById("vipStatus");
      const vipMsg    = document.getElementById("vipMsg");

      if (vipStatus) {
        const now = Date.now();

        // תומך גם במודל החדש וגם הקודם
        const vipObj  = u.upgrades?.vip || {};
        const expires = vipObj.expiresAt || u.perkExpiry || 0;
        const active =
          (vipObj.active && expires && now < expires) ||
          (u.vipActive   && expires && now < expires) ||
          (u.isVIP       && expires && now < expires);

        const lang = getLang();
        const dict = i18n[lang] || i18n.he;

        vipStatus.textContent = active ? dict.vipActive : dict.vipInactive;
        vipStatus.style.color = active ? "#00ff99" : "#ff4d4d";

        // זמן שנותר — רק כאשר VIP פעיל
        if (vipMsg && active && expires) {
          const diffMs       = expires - now;
          const totalMinutes = Math.max(0, Math.floor(diffMs / 60000));
          const days         = Math.floor(totalMinutes / (60 * 24));
          const hours        = Math.floor((totalMinutes % (60 * 24)) / 60);
          const minutes      = totalMinutes % 60;

          let text;
          if (days > 0) {
            if (lang === "he")      text = `✅ VIP פעיל – נשארו ${days} ימים ו-${hours} שעות`;
            else if (lang === "ar") text = `✅ VIP نشط – متبقٍ ${days} يوم و ${hours} ساعة`;
            else                    text = `✅ VIP active – ${days}d ${hours}h left`;
          } else if (hours > 0) {
            if (lang === "he")      text = `✅ VIP פעיל – נשארו ${hours} שעות ו-${minutes} דקות`;
            else if (lang === "ar") text = `✅ VIP نشط – متبقٍ ${hours} ساعة و ${minutes} دقيقة`;
            else                    text = `✅ VIP active – ${hours}h ${minutes}m left`;
          } else {
            if (lang === "he")      text = `✅ VIP פעיל – נשארו ${minutes} דקות`;
            else if (lang === "ar") text = `✅ VIP نشط – متبقٍ ${minutes} دقيقة`;
            else                    text = `✅ VIP active – ${minutes}m left`;
          }

          vipMsg.textContent = text;
          vipMsg.style.color = "#ffd76b";
        }
      }
    }

   // === עמוד "הקבוצה שלי" (My Board) ===
if (panelKey === "myteam") {
  const starsEl  = document.getElementById("me-stars");
  const battleEl = document.getElementById("me-battle");
  const xpEl     = document.getElementById("me-xp");
  const refsEl   = document.getElementById("me-referrals");

  if (starsEl)  starsEl.textContent  = u.stars ?? u.starsDonated ?? 0;
  if (battleEl) battleEl.textContent = u.battle ?? u.battleBalance ?? 0;
  if (xpEl)     xpEl.textContent     = u.xp ?? 0;
  if (refsEl)   refsEl.textContent   = u.referrals ?? 0;
}

} catch (err) {
  console.warn("⚠️ syncPanels failed:", err);
}
}

// === TB_V15 — Bottom Navigation Logic (Clean & Fixed) ===
document.addEventListener("DOMContentLoaded", () => {
  const panels = {
    home: document.getElementById("homePanel"),
    myteam: document.getElementById("my-board"),
    upgrades: document.getElementById("upgradesPanel"),
    leaderboard: document.getElementById("leaderboard"),
    referrals: document.getElementById("partner")
  };

  const buttons = {
    home: document.getElementById("btn-home"),
    myteam: document.getElementById("btn-myteam"),
    upgrades: document.getElementById("btn-upgrades"),
    leaderboard: document.getElementById("btn-leaderboard"),
    referrals: document.getElementById("btn-referrals")
  };

  // מציג רק את הפאנל הנבחר
  function showPanel(panelKey) {
    Object.values(panels).forEach(p => {
      if (p) p.classList.add("hidden");
    });
    Object.values(buttons).forEach(b => b?.classList.remove("active"));

    if (panels[panelKey]) panels[panelKey].classList.remove("hidden");
    if (buttons[panelKey]) buttons[panelKey].classList.add("active");

    // 🪖 TB_V19 — MyTeam: טוען קטגוריות בעת פתיחת הפאנל
    if (panelKey === "myteam" || panelKey === "my-team") {
      loadMyTeamCategories();
    }
  }

  // מאזין לכל כפתור
  Object.entries(buttons).forEach(([key, btn]) => {
    if (!btn) return;
    btn.addEventListener("click", () => {
      showPanel(key);
      syncPanels(key); // 🔄 סנכרון בזמן מעבר בין פאנלים
    });
  });

  // ברירת מחדל – מציג רק את המסך הראשי ומרנדר נתונים חיים
  showPanel("home");
  syncPanels("home");
});


// ===== TB_V17 — Battery Upgrade Client Logic (Multilingual) =====
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("btn-upgrade-battery");
  const levelEl = document.getElementById("batteryLevel");
  const capEl = document.getElementById("batteryCap");
  const costEl = document.getElementById("batteryCost");
  const msgEl = document.getElementById("batteryMsg");

  if (!btn) return;

  // 🗣️ תרגומים להודעות
  const lang = localStorage.getItem("tb_lang") || "he";
  const MESSAGES = {
    he: {
      processing: "⏳ מעבד...",
      success: "✅ השדרוג בוצע בהצלחה!",
      max: "⚡ הגעת לרמה המקסימלית!",
      notEnough: "❌ אין מספיק $Battle!",
      fail: "⚠️ השדרוג נכשל.",
      connection: "⚠️ שגיאת חיבור."
    },
    en: {
      processing: "⏳ Processing...",
      success: "✅ Upgrade successful!",
      max: "⚡ MAX LEVEL reached!",
      notEnough: "❌ Not enough $Battle!",
      fail: "⚠️ Upgrade failed.",
      connection: "⚠️ Connection error."
    },
    ar: {
      processing: "⏳ جارٍ المعالجة...",
      success: "✅ تمت الترقية بنجاح!",
      max: "⚡ وصلت إلى الحد الأقصى!",
      notEnough: "❌ لا يوجد ما يكفي من $Battle!",
      fail: "⚠️ فشل الترقية.",
      connection: "⚠️ خطأ في الاتصال."
    }
  };

  const T = MESSAGES[lang] || MESSAGES["he"];

  // ⚡ אירוע לחיצה על כפתור השדרוג
  btn.addEventListener("click", async () => {
    msgEl.textContent = T.processing;
    msgEl.style.color = "#ccc";

    try {
      const res = await fetch(`${API_BASE}/api/upgrade/battery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: telegramUserId })
      });

      const data = await res.json();

      if (data.ok) {
        levelEl.textContent = data.newLevel;
        capEl.textContent = data.newCap;
        costEl.textContent = data.newCost;
        msgEl.textContent = T.success;
        msgEl.style.color = "#00ff99";
      } else if (data.error === "max_level") {
        msgEl.textContent = T.max;
        msgEl.style.color = "#ffcc00";
      } else if (data.error === "not_enough_battle") {
        msgEl.textContent = T.notEnough;
        msgEl.style.color = "#ff4d4d";
      } else {
        msgEl.textContent = T.fail;
        msgEl.style.color = "#ffcc00";
      }
    } catch (err) {
      console.error("Upgrade Battery error:", err);
      msgEl.textContent = T.connection;
      msgEl.style.color = "#ffcc00";
    }
  });
});

// ===== TB_V17 — Buy VIP via Telegram Stars (Final + Only Handler) =====
document.addEventListener("DOMContentLoaded", () => {
  const btnVip = document.getElementById("btn-activate-vip");
  const vipMsg = document.getElementById("vipMsg");

  if (!btnVip) return;

  btnVip.addEventListener("click", async () => {
    try {
      vipMsg.textContent = "⏳ Processing...";
      vipMsg.style.color = "#ccc";

      const userId = telegramUserId;
      const team = localStorage.getItem("tb_team") || "unknown";

      // ✅ מבקשים מהשרת ליצור חשבונית אמיתית לכוכבים
      const res = await fetch(`${API_BASE}/api/create-invoice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          team,
          stars: 300,  // ⭐ עלות VIP
          t: "vip"
        })
      });

      const data = await res.json();
      console.log("💎 [VIP] create-invoice response:", data);

      if (data.ok && (data.url || data.invoiceLink)) {
        const invoiceUrl = data.url || data.invoiceLink;
        console.log("🧾 Opening Telegram Stars invoice:", invoiceUrl);

        // 🔥 פתיחת חלון התשלום
        if (window.Telegram?.WebApp?.openInvoice) {
          Telegram.WebApp.openInvoice(invoiceUrl, () => {
            console.log("📲 VIP invoice closed or paid.");
            vipMsg.textContent = "💫 Waiting for payment confirmation...";
            setTimeout(() => location.reload(), 1500);
          });
        } else {
          window.location.href = invoiceUrl;
        }
      } else {
        vipMsg.textContent = "⚠️ Failed to create invoice.";
        vipMsg.style.color = "#ffcc00";
      }
    } catch (err) {
      console.error("VIP purchase error:", err);
      vipMsg.textContent = "⚠️ Connection error.";
      vipMsg.style.color = "#ffcc00";
    }
  });
});
// ===== VIP Info Popup =====
const btnVipInfo = document.getElementById("vip-info-btn");
if (btnVipInfo) {
  btnVipInfo.addEventListener("click", () => {
    const lang = getLang();
    const msg = i18n[lang]?.vipInfoText || i18n.he.vipInfoText;

    if (window.Telegram?.WebApp?.showAlert) {
      Telegram.WebApp.showAlert(msg);
    } else {
      alert(msg.replace(/\n/g, "\n"));
    }
  });
}

// =========================
// VIP TIMER FUNCTION INSERT
// =========================
function updateVipTimer(expiryTs) {
  const vipMsg = document.getElementById("vipMsg");
  if (!vipMsg) return;

  function render() {
    const now = Date.now();
    const diff = expiryTs - now;

    if (diff <= 0) {
      vipMsg.textContent = "";
      return;
    }

    const totalMinutes = Math.floor(diff / 60000);
    const days = Math.floor(totalMinutes / (60 * 24));
    const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
    const minutes = totalMinutes % 60;

    const lang = getLang();

    let text;

    if (days > 0) {
      if (lang === "he") text = `⏳ VIP פעיל – נשארו ${days} ימים ו-${hours} שעות`;
      else if (lang === "ar") text = `⏳ VIP نشط – متبقٍ ${days} يوم و ${hours} ساعة`;
      else text = `⏳ VIP active – ${days}d ${hours}h left`;
    } else if (hours > 0) {
      if (lang === "he") text = `⏳ VIP פעיל – נשארו ${hours} שעות ו-${minutes} דקות`;
      else if (lang === "ar") text = `⏳ VIP نشط – متبقٍ ${hours} ساعة و ${minutes} دقيقة`;
      else text = `⏳ VIP active – ${hours}h ${minutes}m left`;
    } else {
      if (lang === "he") text = `⏳ VIP פעיל – נשארו ${minutes} דקות`;
      else if (lang === "ar") text = `⏳ VIP نشط – ${minutes} دقيقة متبقية`;
      else text = `⏳ VIP active – ${minutes}m left`;
    }

    vipMsg.textContent = text;
    vipMsg.style.color = "#ffd76b";
  }

  render();
  setInterval(render, 60 * 1000); // עדכון כל דקה
}

// ===== TB_V19 — Step 3.2: MyTeam Buy Function =====
async function buyMyTeamItem(itemId) {
  try {
    const res = await fetch(`/api/user/${telegramUserId}/myteam/buy`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ itemId })
    });

    const data = await res.json();
    return data;

  } catch (err) {
    console.error("❌ MyTeam Buy Error:", err);
    return { ok: false, error: "NETWORK_ERROR" };
  }
}

// ===== TB_V19 — Step 3.3.2: Load MyTeam Categories Grid =====
function loadMyTeamCategories() {
  try {
    const container = document.getElementById("myteam-categories");
    if (!container) return;

    container.innerHTML = ""; // ניקוי

    const lang = currentLanguage || "en";

    Object.values(MYTEAM_CATEGORIES).forEach(cat => {
      const div = document.createElement("div");
      div.className = "btn btn-secondary"; // שימוש בעיצוב קיים בלבד

      div.style.display = "flex";
      div.style.flexDirection = "column";
      div.style.alignItems = "center";
      div.style.justifyContent = "center";
      div.style.padding = "10px";
      div.style.margin = "5px";

      // אייקון
      const img = document.createElement("img");
      img.src = cat.icon;
      img.alt = cat.labels[lang];
      img.style.width = "40px";
      img.style.height = "40px";
      img.style.objectFit = "contain";
      img.style.marginBottom = "6px";

      // טקסט
      const span = document.createElement("span");
      span.textContent = cat.labels[lang];

      div.appendChild(img);
      div.appendChild(span);

      div.onclick = () => {
        loadMyTeamItems(cat.id); // בשלב הבא (3.3.3)
      };

      container.appendChild(div);
    });
  } catch (err) {
    console.error("❌ loadMyTeamCategories error:", err);
  }
}


// ===== TB_V19 — Step 3.3.3: Load Items for Selected Category =====
async function loadMyTeamItems(categoryId) {
  try {
    const container = document.getElementById("myteam-items");
    if (!container) return;

    container.innerHTML = ""; // ניקוי

    // שפה
    const lang = currentLanguage || "en";

    // טעינת נתוני משתמש מהשרת
    const userRes = await fetch(`/api/user/${telegramUserId}`);
    const userData = await userRes.json();
    const myteam = userData.myteam || {};

    // שליפת כל הפריטים של אותה קטגוריה
    const items = MYTEAM_ITEMS.filter(i => i.category === categoryId);

    items.forEach(item => {
      const level = myteam[item.id]?.level || 0;

      // חישוב מחיר לרמה הבאה
      const nextCost = Math.floor(
        item.baseCost * Math.pow(item.costMultiplier, level)
      );

      // חישוב הכנסה ברמה הנוכחית
      const income = (
        item.baseIncome * Math.pow(item.incomeMultiplier, Math.max(0, level - 1))
      ).toFixed(3);

      // === יצירת כרטיס קומפקטי ===
      const card = document.createElement("div");
      card.className = "upgrade-card"; // שימוש בעיצוב קיים

      // אייקון
      const img = document.createElement("img");
      img.src = item.icon;
      img.alt = item.names[lang];
      img.style.width = "50px";
      img.style.height = "50px";
      img.style.objectFit = "contain";
      img.style.marginBottom = "6px";

      // שם + רמה
      const title = document.createElement("div");
      title.className = "upgrade-row";
      title.textContent = `${item.names[lang]} (Lvl ${level})`;

      // הכנסה
      const incRow = document.createElement("div");
      incRow.className = "upgrade-row";
      incRow.textContent = `+${income}/sec`;

      // מחיר
      const costRow = document.createElement("div");
      costRow.className = "upgrade-row";
      costRow.textContent = `Cost: ${nextCost} $Battle`;

      // כפתור BUY
      const btn = document.createElement("button");
      btn.className = "btn btn-gold";
      btn.textContent = "BUY";

      btn.onclick = async () => {
        const result = await buyMyTeamItem(item.id);
        if (result.ok) {
          loadMyTeamItems(categoryId); // רענון
        } else {
          console.warn("Buy failed:", result.error);
        }
      };

      // הוספה לכרטיס
      card.appendChild(img);
      card.appendChild(title);
      card.appendChild(incRow);
      card.appendChild(costRow);
      card.appendChild(btn);

      // הוספה לרשימה
      container.appendChild(card);
    });

  } catch (err) {
    console.error("❌ loadMyTeamItems error:", err);
  }
}


