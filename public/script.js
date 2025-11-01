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
    en:{israel:"Israel",gaza:"Gaza",tap:"Tap (+1)",superBoost:"Super Boost (+25)",switchTeam:"Switch Team",extraTap:"Extra Tap",myBoard:"My Board",stars:"Stars / Extra Tap",playerLevel:"Player Level",referrals:"Invited Friends",tapsToday:"Taps today",top20:"Top 20",copied:"Copied!",err:"Something went wrong",partnerTitle:"Affiliate Program",copy:"Copy Link"},
    he:{israel:"ישראל",gaza:"עזה",tap:"טאפ (+1)",superBoost:"סופר בוסט (+25)",switchTeam:"החלף קבוצה",extraTap:"Extra Tap",myBoard:"הלוח שלי",stars:"כוכבים / Extra Tap",playerLevel:"רמת שחקן",referrals:"מוזמנים",tapsToday:"טאפים היום",top20:"טופ 20",copied:"הועתק!",err:"אירעה שגיאה",partnerTitle:"תוכנית שותפים",copy:"העתק קישור"},
    ar:{israel:"إسرائيل",gaza:"غزة",tap:"انقر (+1)",superBoost:"دفعة قوية (+25)",switchTeam:"بدّل الفريق",extraTap:"Extra Tap",myBoard:"لوحتي",stars:"نجوم / Extra Tap",playerLevel:"مستوى اللاعب",referrals:"الأصدقاء المدعوون",tapsToday:"نقرات اليوم",top20:"أفضل 20",copied:"تم النسخ!",err:"حدث خطأ ما",partnerTitle:"برنامج الإحالة",copy:"انسخ الرابط"}
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
  function paintMe(){
    setText('me-stars', String(GAME.me.stars ?? '–'));
    setText('me-level', String(GAME.me.level ?? '–'));
    setText('me-tap-power', String(GAME.me.level)); // Tap Power = Level
    setText('me-referrals', String(GAME.me.referrals ?? '–'));
    setText('me-taps', `${GAME.me.tapsToday ?? 0}/${GAME.me.tapsLimit ?? 300}`);
  }
  function paintTop20(){
    const ul=document.getElementById('top20-list'); if(!ul) return; ul.innerHTML='';
    (GAME.leaderboard||[]).forEach((p,idx)=>{
      const li=document.createElement('li');
      const name=document.createElement('span'); name.className='name';
      const pts=document.createElement('span'); pts.className='pts';
      name.textContent = p.username ? p.username : `Player #${idx+1}`;
      pts.textContent = (p.points ?? p.score ?? 0) + ' pts';
      li.appendChild(name); li.appendChild(pts); ul.appendChild(li);
    });
  }

  // ===== Refresh Game Data =====
  async function refreshAll(){
    try{
      const state=await getJSON('/api/state');
      if(state.scores) GAME.scores=state.scores;
      paintScores();
    }catch(_){}
    try{
      const meResp = await getJSON('/api/me?userId=' + telegramUserId);
const M = meResp?.me || meResp || {};
GAME.me = {
  id: M.userId ?? M.id ?? telegramUserId,
  team: M.team ?? null,
  tapsToday: M.tapsToday ?? M.taps_today ?? M.taps ?? 0,
  tapsLimit: meResp?.limit ?? M.tapsLimit ?? M.taps_limit ?? 300,
  level: M.level ?? 1,
  referrals: M.referrals ?? M.invited ?? 0,
  stars: M.starsDonated ?? M.stars ?? M.balance ?? 0,
  username: M.username ?? null
};
      paintMe();

      // ===== Affiliate / Referral Section =====
      try{
        const bot="TeamBattle_vBot"; 
        const uid = GAME.me.id;
        const refLink = uid ? `https://t.me/${bot}/app?start_param=${uid}` : "";
        const inp=document.getElementById("ref-link");
        const cpy=document.getElementById("copy-ref");
        const shr=document.getElementById("share-ref");
        if(inp) inp.value = refLink;
        if(cpy) cpy.addEventListener("click", async ()=>{
          try{ await navigator.clipboard.writeText(refLink); }catch(_){}
          const l=getLang(); const old=cpy.textContent; cpy.textContent=i18n[l]?.copied||"Copied!"; setTimeout(()=>cpy.textContent=old,1100);
        });
        if(shr) shr.addEventListener("click", ()=>{
          const url = `https://t.me/share/url?url=${encodeURIComponent(refLink)}`;
          window.open(url,"_blank");
        });
      }catch(_){}

    }catch(_){}
    try{
      const lb = await getJSON('/api/leaderboard');
if (Array.isArray(lb)) GAME.leaderboard = lb.slice(0, 20);
else if (Array.isArray(lb?.leaders)) GAME.leaderboard = lb.leaders.slice(0, 20);
else if (Array.isArray(lb?.top)) GAME.leaderboard = lb.top.slice(0, 20);
paintTop20();
    }catch(_){}
  }

  setInterval(refreshAll, 5000);
  refreshAll();

  // ===== Status Bar =====
  const statusLine=document.getElementById('status-line');
  function flashStatus(m){ if(!statusLine) return; statusLine.textContent=m; statusLine.style.opacity='1'; setTimeout(()=>statusLine.style.opacity='0.7',1600); }

  // ===== Buttons =====
  const btnTap=document.getElementById('btn-tap');
  if(btnTap) btnTap.addEventListener('click',async()=>{ 
    try{ await postJSON('/api/tap',{userId:GAME.me.id}); await refreshAll(); } 
    catch(_){ flashStatus(i18n[getLang()].err); } 
  });

  const btnSuper=document.getElementById('btn-super');
  if(btnSuper) btnSuper.addEventListener('click',async()=>{ 
    try{ await postJSON('/api/super',{userId:GAME.me.id}); await refreshAll(); } 
    catch(_){ flashStatus(i18n[getLang()].err); } 
  });

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

(async () => {
  try {
    // בדוק אם TonConnect קיים בשם אחר (window.TonConnectSDK)
    const TonSDK = window.TonConnect || window.TonConnectSDK?.TonConnect;

    if (!TonSDK) {
      console.error("❌ TON SDK not loaded correctly!");
      return;
    }

    const tonConnect = new TonSDK({
      manifestUrl: "https://team-battle-v-bot.onrender.com/tonconnect-manifest.json"
    });

    const connectBtn = document.getElementById("connect-ton");
    const addressDiv = document.getElementById("ton-address");

    async function connectTonWallet() {
      try {
        await tonConnect.connectWallet();
      } catch (err) {
        console.error("TON connect error:", err);
      }
    }

    tonConnect.onStatusChange(wallet => {
      if (wallet) {
        const addr = wallet.account.address;
        addressDiv.textContent = `Connected: ${addr.slice(0,6)}...${addr.slice(-4)}`;
        connectBtn.style.display = "none";
      } else {
        connectBtn.style.display = "inline-block";
        addressDiv.textContent = "";
      }
    });

    connectBtn.addEventListener("click", connectTonWallet);

    console.log("✅ TON Connect initialized successfully");
  } catch (err) {
    console.error("TON Connect initialization failed:", err);
  }
})();
