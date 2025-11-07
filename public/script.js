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
console.log("🔍 FULL initDataUnsafe dump:", WebApp?.initDataUnsafe);

 // ====== Translations ======
const i18n = {
  en: {
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
    chooseTeam: "Choose your team"
  },
  he: {
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
    chooseTeam: "בחר את הקבוצה שלך"
  },
  ar: {
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
    chooseTeam: "اختر فريقك"
  }
};


  function getLang(){ return document.documentElement.getAttribute('data-lang') || 'he'; }
  function setLang(l){
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

// ===== Refresh Game Data =====
async function refreshAll() {
  try {
    const state = await getJSON('/api/state');
    if (state.scores) GAME.scores = state.scores;
    paintScores();
  } catch (_) {}

  try {
    const meResp = await getJSON('/api/me?userId=' + telegramUserId);
    const M = meResp?.me || meResp || {};
    if (!GAME.me) GAME.me = {};

    GAME.me.id = M.userId ?? M.id ?? telegramUserId;
    GAME.me.team = M.team ?? GAME.me.team ?? null;
    GAME.me.tapsToday = Math.max(GAME.me.tapsToday || 0, M.tapsToday ?? M.taps_today ?? M.taps ?? 0);
    GAME.me.tapsLimit = meResp?.limit ?? M.tapsLimit ?? M.taps_limit ?? GAME.me.tapsLimit ?? 300;
    GAME.me.level = Math.max(GAME.me.level || 1, M.level ?? 1);
    GAME.me.referrals = Math.max(GAME.me.referrals || 0, M.referrals ?? M.invited ?? 0);
    GAME.me.stars = Math.max(GAME.me.stars || 0, M.starsDonated ?? M.stars ?? M.balance ?? 0);
    GAME.me.battle = Math.max(GAME.me.battle || 0, M.battleBalance ?? 0);
    GAME.me.xp = Math.max(GAME.me.xp || 0, M.xp ?? 0); // ✅ שומר XP בין רענונים
    GAME.me.username = M.username ?? GAME.me.username ?? null;

    paintMe();
  } catch (err) {
    console.error("refreshAll error:", err);
  }
}

setInterval(refreshAll, 5000);
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
    }

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

    connectBtn.addEventListener("click", connectTonWallet);
  }
} catch (err) {
  console.error("❌ TON Connect initialization failed:", err);
}
  
  // 🔒 Disable hidden buttons (Super + Switch)
document.addEventListener("DOMContentLoaded", () => {
  const btnSuper = document.getElementById("btn-super");
  const btnSwitch = document.getElementById("btn-switch");

  if (btnSuper) {
    btnSuper.style.display = "none";
    btnSuper.disabled = true;
  }

  if (btnSwitch) {
    btnSwitch.style.display = "none";
    btnSwitch.disabled = true;
  }
  // ===== Team Selection =====
  const flagIsrael = document.getElementById("flag-israel");
  const flagGaza = document.getElementById("flag-gaza");

  if (flagIsrael && flagGaza) {
    flagIsrael.addEventListener("click", () => selectTeam("israel"));
    flagGaza.addEventListener("click", () => selectTeam("gaza"));
  }

 async function selectTeam(team) {
  try {
    const res = await fetch(`/api/user/${telegramUserId}/team`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ team })
    });
    const data = await res.json();
    if (data.ok) {
      console.log(`✅ Team selected: ${data.team}`);
      localStorage.setItem("tb_team", team);

      // הסרת הדגשה קיימת מהדגלים
      document.querySelectorAll("#flag-israel, #flag-gaza").forEach(el => {
        el.classList.remove("flag-selected");
      });

      // הוספת הדגשה לדגל שנבחר
      const selectedFlag = document.getElementById(`flag-${team}`);
      if (selectedFlag) selectedFlag.classList.add("flag-selected");

      await refreshAll();
    } else {
      console.warn("❌ Team select failed:", data.error);
    }
  } catch (err) {
    console.error("⚠️ Team select error:", err);
  }
}


}); // ✅ ←←← סוגר את כל ה־DOMContentLoaded
