// ✅ Global Telegram User ID
let telegramUserId = null;

// ===== Auto-detect API base (Render / local / Telegram) =====
const API_BASE = window.location.origin || "";

// === WAIT FOR TELEGRAM WEBAPP TO LOAD ===
console.log("⏳ Waiting for Telegram WebApp...");
function waitForWebApp(maxWait = 2500) {
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
        console.warn("⚠️ Telegram WebApp not detected — using fallback.");
        resolve(null);
      }
    }, 100);
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  const WebApp = await waitForWebApp();

  // ===== Try to extract Telegram user info =====
  try {
    const tUser = WebApp?.initDataUnsafe?.user;
    if (tUser?.id) {
      telegramUserId = String(tUser.id);
      console.log("✅ Telegram User ID:", telegramUserId);
    } else {
      console.warn("⚠️ Telegram user ID not found in initDataUnsafe");
    }
  } catch (err) {
    console.error("Telegram initData error:", err);
  }

  // ====== Fallback for Android/iOS/Desktop ======
  if (!telegramUserId && window.location.search.includes("tgWebAppData=")) {
    try {
      const params = new URLSearchParams(window.location.search);
      const data = params.get("tgWebAppData");
      if (data) {
        if (!window.Telegram) window.Telegram = {};
        if (!window.Telegram.WebApp) window.Telegram.WebApp = {};
        window.Telegram.WebApp.initData = decodeURIComponent(data);
        const parsed = Object.fromEntries(new URLSearchParams(data));
        if (parsed.user) {
          window.Telegram.WebApp.initDataUnsafe = { user: JSON.parse(parsed.user) };
          telegramUserId = String(window.Telegram.WebApp.initDataUnsafe.user?.id || "");
          console.log("✅ Recovered Telegram User ID from URL:", telegramUserId);
        }
      }
    } catch (e) {
      console.warn("InitData fix (URL) failed:", e);
    }
  }

  // ===== Hash fallback (desktop web) =====
  if (!telegramUserId && window.location.hash.includes("tgWebAppData=")) {
    try {
      const hash = window.location.hash.split("tgWebAppData=")[1];
      const data = decodeURIComponent(hash.split("&")[0]);
      const parsed = Object.fromEntries(new URLSearchParams(data));
      if (parsed.user) {
        window.Telegram.WebApp.initDataUnsafe = { user: JSON.parse(parsed.user) };
        telegramUserId = String(window.Telegram.WebApp.initDataUnsafe.user?.id || "");
        console.log("✅ Recovered Telegram User ID from hash:", telegramUserId);
      }
    } catch (e) {
      console.warn("InitData hash fix failed:", e);
    }
  }

  // ===== If still no ID, create fallback guest =====
  if (!telegramUserId) {
    console.warn("⚠️ Telegram userId not found — using fallback guest ID");
    telegramUserId = localStorage.getItem("tb_fallback_id");
    if (!telegramUserId) {
      telegramUserId = "guest_" + Math.floor(Math.random() * 9999999);
      localStorage.setItem("tb_fallback_id", telegramUserId);
    }
  }

  console.log("✅ Active userId:", telegramUserId);
  console.log("🔍 FULL initDataUnsafe dump:", WebApp?.initDataUnsafe);
});

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

    // 🧭 شريط التنقل السفلي
    navHome: "الرئيسية",
    navMyTeam: "فريقي",
    navUpgrades: "الترقيات",
    navLeaderboard: "المتصدرون",
    navReferrals: "الإحالات"
  }
};

  function getLang(){ return document.documentElement.getAttribute('data-lang') || 'he'; }
  function setLang(l) {

    document.documentElement.setAttribute('data-lang', l);
    localStorage.setItem('tb_lang', l);
    document.querySelectorAll('[data-i18n]').forEach(el=>{
      const k = el.getAttribute('data-i18n');
      el.textContent = i18n[l]?.[k] || k;
    });
  }

  const langBtns = document.querySelectorAll('.lang-switch [data-lang]');
  if (langBtns && langBtns.length) {
    langBtns.forEach(btn => btn.addEventListener('click',()=>setLang(btn.dataset.lang)));
  }

  (function(){
    const s=localStorage.getItem('tb_lang');
    if(s) setLang(s); else { const t=(navigator.language||'he').slice(0,2); setLang(['he','en','ar'].includes(t)?t:'he'); }
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
  const lb = await getJSON('/api/leaderboard');
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

// ===== Refresh Game Data (Real-time 0.5s) =====
async function refreshAll() {
  try {
    const userId = telegramUserId || localStorage.getItem("telegram_userId") || "guest";

    // --- מצב כללי ---
    const state = await getJSON("/api/state");
    if (state?.scores) GAME.scores = state.scores;
    paintScores();

    // --- נתוני משתמש ---
    const meResp = await getJSON(`/api/me?userId=${userId}`);
    const M = meResp?.me || meResp || {};
    if (!GAME.me) GAME.me = {};

    GAME.me.id = M.userId ?? M.id ?? telegramUserId;
    GAME.me.team = M.team ?? GAME.me.team ?? null;
    GAME.me.tapsToday = Math.max(GAME.me.tapsToday || 0, M.tapsToday ?? M.taps_today ?? M.taps ?? 0);
    GAME.me.level = Math.max(GAME.me.level || 1, M.level ?? 1);
    GAME.me.referrals = Math.max(GAME.me.referrals || 0, M.referrals ?? M.invited ?? 0);
    GAME.me.stars = Math.max(GAME.me.stars || 0, M.starsDonated ?? M.stars ?? M.balance ?? 0);
    GAME.me.battle = Math.max(GAME.me.battle || 0, M.battleBalance ?? 0);
    GAME.me.xp = Math.max(GAME.me.xp || 0, M.xp ?? 0);

    // --- נתוני שותפים ---
    let partner = {};
    try {
      const partnerResp = await getJSON(`/api/partner/${userId}`);
      if (partnerResp?.ok || partnerResp?.earnedBattle) partner = partnerResp;
    } catch {
      console.warn("ℹ️ Partner API unavailable, fallback to empty data");
    }
    GAME.partner = partner || {};

    // --- נתוני הכנסה כוללת ---
    let totalBattle = 0;
    let incomePerSec = 0;

    try {
      const earnResp = await getJSON(`/api/earnings/${userId}`);
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
    const res = await postJSON('/api/switch-team', { userId: GAME.me.id, newTeam: to });
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

// === TB_V15 — Bottom Navigation Logic (Clean & Fixed) ===
document.addEventListener("DOMContentLoaded", () => {
  const panels = {
    home: document.getElementById("homePanel"),
    myteam: document.getElementById("my-board"),
    upgrades: document.getElementById("upgradesPanel"),
    leaderboard: document.getElementById("top20"),
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
  }

  // מאזין לכל כפתור
  Object.entries(buttons).forEach(([key, btn]) => {
    if (!btn) return;
    btn.addEventListener("click", () => showPanel(key));
  });

  // ברירת מחדל – מציג רק את המסך הראשי
  showPanel("home");
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

// ===== TB_V17 — Buy VIP via Telegram Stars (Unified) =====
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

      // שליחת בקשה לשרת ליצירת חשבונית VIP
      const res = await fetch("/api/create-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          team,
          t: "vip",
          stars: 300, // ⭐️ מחיר VIP
        }),
      });

      const data = await res.json();
      if (data.ok && data.url) {
        if (window.Telegram?.WebApp?.openInvoice) {
          Telegram.WebApp.openInvoice(data.url, () => {
            vipMsg.textContent = "💫 Waiting for payment confirmation...";
            setTimeout(() => location.reload(), 3000);
          });
        } else {
          window.location.href = data.url;
        }
      } else {
        vipMsg.textContent = "⚠️ Failed to create VIP invoice.";
        vipMsg.style.color = "#ffcc00";
      }
    } catch (err) {
      console.error("VIP purchase error:", err);
      vipMsg.textContent = "⚠️ Connection error.";
      vipMsg.style.color = "#ffcc00";
    }
  });
});
