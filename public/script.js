<script>
/* ======================= TeamBattle Mini App – Frontend (FULL) =======================
   - Fast sync (1s) + immediate refresh after actions
   - Referral (refLink/copyRef/shareRef) reliable init after user is ready
   - Top20 render
   - Keeps local UI from “rolling back” (max with server values)
   - Payments (Extra Tap) unchanged: openInvoice / URL fallback
   ================================================================================ */
document.addEventListener("DOMContentLoaded", async () => {

  /* --------------------------- Telegram WebApp bootstrap --------------------------- */
  function waitForWebApp(maxWait = 2000) {
    return new Promise(resolve => {
      let waited = 0;
      const iv = setInterval(() => {
        if (window.Telegram?.WebApp) {
          clearInterval(iv);
          resolve(window.Telegram.WebApp);
        }
        waited += 100;
        if (waited >= maxWait) {
          clearInterval(iv);
          resolve(null);
        }
      }, 100);
    });
  }

  const WebApp = await waitForWebApp();
  // תיקוני initData מה-URL אם צריך (אנדרואיד/דסקטופ)
  (function ensureInitData() {
    try {
      if (WebApp?.initData) return;
      const tryTake = (src) => {
        const val = src.get("tgWebAppData");
        if (val) {
          if (!window.Telegram) window.Telegram = {};
          if (!window.Telegram.WebApp) window.Telegram.WebApp = {};
          window.Telegram.WebApp.initData = decodeURIComponent(val);
        }
      };
      if (window.location.search.includes("tgWebAppData=")) {
        tryTake(new URLSearchParams(window.location.search));
      } else if (window.location.hash.includes("tgWebAppData=")) {
        const frag = window.location.hash.slice(1);
        tryTake(new URLSearchParams(frag));
      }
    } catch (_) {}
  })();

  // הפקה בטוחה של userId
  async function waitForTelegramUser(maxMs = 2000) {
    const start = Date.now();
    while (Date.now() - start < maxMs) {
      const uid = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
      if (uid) return String(uid);
      await new Promise(r => setTimeout(r, 100));
    }
    return null;
  }

  let telegramUserId = await waitForTelegramUser();
  if (!telegramUserId) {
    // fallback לגסט מקומי
    telegramUserId = localStorage.getItem("tb_fallback_id");
    if (!telegramUserId) {
      telegramUserId = "guest_" + Math.floor(Math.random() * 9_999_999);
      localStorage.setItem("tb_fallback_id", telegramUserId);
    }
  }

  /* --------------------------- i18n (ללא שינוי ויזואלי) --------------------------- */
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
  (function initLang(){
    const saved = localStorage.getItem('tb_lang');
    if (saved) setLang(saved);
    else {
      const t=(navigator.language||'he').slice(0,2);
      setLang(['he','en','ar'].includes(t)?t:'he');
    }
    const langBtns = document.querySelectorAll('.lang-switch [data-lang]');
    if (langBtns && langBtns.length) {
      langBtns.forEach(btn => btn.addEventListener('click',()=>setLang(btn.dataset.lang)));
    }
  })();

  /* ------------------------------ API helpers & headers ---------------------------- */
  const headers = {};
  try { if (window.Telegram?.WebApp?.initData) headers['X-Init-Data'] = window.Telegram.WebApp.initData; } catch(_){}
  if (telegramUserId) headers['X-Telegram-UserId'] = telegramUserId;

  async function getJSON(u){
    const r = await fetch(u,{headers});
    if(!r.ok) throw new Error('HTTP '+r.status);
    return r.json();
  }
  async function postJSON(u,b){
    const r = await fetch(u,{
      method:'POST',
      headers:{'Content-Type':'application/json', ...headers},
      body: JSON.stringify(b||{})
    });
    if(!r.ok) throw new Error('HTTP '+r.status);
    return r.json();
  }
  function setText(id,txt){ const el=document.getElementById(id); if(el) el.textContent=txt; }

  /* -------------------------------- Game state & paint ----------------------------- */
  const GAME = {
    scores: { israel: 0, gaza: 0 },
    me: { id: telegramUserId, team: null, tapsToday: 0, tapsLimit: 300, level: 1, referrals: 0, stars: 0, battle: 0, xp: 0, username: null },
    leaderboard: []
  };

  function formatK(num) {
    const n = Number(num||0);
    if (n >= 1_000_000) return (n/1_000_000).toFixed(2)+'M';
    if (n >= 1_000) return (n/1_000).toFixed(1)+'K';
    return n.toFixed(0);
  }
  function formatBattle(num) {
    const n = Number(num||0);
    if (n >= 1_000_000) return (n/1_000_000).toFixed(2)+'M';
    if (n >= 1_000) return (n/1_000).toFixed(2)+'K';
    return n.toFixed(2);
  }

  function paintScores(){
    setText('score-israel-value', GAME.scores?.israel??0);
    setText('score-gaza-value',   GAME.scores?.gaza??0);
  }
  function paintMe(){
    setText('me-xp',        formatK(GAME.me.xp ?? 0));
    setText('me-stars',     String(GAME.me.stars ?? '–'));
    setText('me-battle',    formatBattle(GAME.me.battle));
    setText('me-level',     String(GAME.me.level ?? '–'));
    setText('me-tap-power', String(GAME.me.level));
    setText('me-referrals', String(GAME.me.referrals ?? '–'));
    setText('me-taps',      `${GAME.me.tapsToday ?? 0}/${GAME.me.tapsLimit ?? 300}`);
  }
  function paintTop20(){
    const ul = document.getElementById('top20-list');
    if (!ul) return;
    ul.innerHTML = '';
    const sorted = (GAME.leaderboard||[])
      .filter(p => (p.points||0) > 0)
      .sort((a,b)=>(b.points||0) - (a.points||0))
      .slice(0,20);
    sorted.forEach((p, idx) => {
      const li = document.createElement('li');
      li.className = 'player-item';
      if (idx < 5) li.classList.add('top5');

      const name = document.createElement('span');
      name.className = 'name';
      name.textContent = p.displayName || p.first_name || p.username || `Player #${idx+1}`;

      const battle = document.createElement('span');
      battle.className = 'battle';
      battle.textContent = `${(p.points || 0).toFixed(2)} BATTLE`;

      li.appendChild(name);
      li.appendChild(battle);
      ul.appendChild(li);
    });
  }

  /* --------------------------------- Referral block -------------------------------- */
  let referralInitDone = false;
  function initReferralIfReady() {
    if (referralInitDone) return;
    const uid = GAME?.me?.id;
    if (!uid) return;

    referralInitDone = true;
    const bot = "TeamBattle_vBot";
    const refLink = `https://t.me/${bot}?start=${uid}`;

    const inp = document.getElementById("refLink");
    const cpy = document.getElementById("copyRef");
    const shr = document.getElementById("shareRef");

    if (inp)  inp.value = refLink;
    if (cpy)  cpy.onclick = async () => {
      try { await navigator.clipboard.writeText(refLink); } catch(_){}
      const l = getLang(); const old = cpy.textContent;
      cpy.textContent = i18n[l]?.copied || "Copied!";
      setTimeout(()=> (cpy.textContent = old), 1100);
    };
    if (shr)  shr.onclick = () => {
      const url = `https://t.me/share/url?url=${encodeURIComponent(refLink)}`;
      window.open(url, "_blank");
    };
  }

  /* ------------------------------------ Refresh ------------------------------------ */
  let isRefreshing = false;
  async function refreshAll(force = false){
    if (isRefreshing && !force) return;
    isRefreshing = true;
    try {
      // scores/state
      try {
        const state = await getJSON('/api/state');
        if (state?.scores) GAME.scores = state.scores;
        paintScores();
      } catch(_) {}

      // me
      try {
        const meResp = await getJSON('/api/me?userId=' + encodeURIComponent(telegramUserId));
        const M = meResp?.me || meResp || {};
        // base
        if (!GAME.me) GAME.me = {};
        GAME.me.id    = M.userId ?? M.id ?? telegramUserId;
        GAME.me.team  = M.team ?? GAME.me.team ?? null;

        // no rollback – always keep the max we know
        GAME.me.tapsToday  = Math.max(GAME.me.tapsToday || 0, M.tapsToday ?? M.taps_today ?? M.taps ?? 0);
        GAME.me.tapsLimit  = meResp?.limit ?? M.tapsLimit ?? M.taps_limit ?? GAME.me.tapsLimit ?? 300;
        GAME.me.level      = Math.max(GAME.me.level || 1, M.level ?? 1);
        GAME.me.referrals  = Math.max(GAME.me.referrals || 0, M.referrals ?? M.invited ?? 0);
        GAME.me.stars      = Math.max(GAME.me.stars || 0, M.starsDonated ?? M.stars ?? M.balance ?? 0);
        GAME.me.battle     = Math.max(GAME.me.battle || 0, M.battleBalance ?? 0);
        GAME.me.xp         = Math.max(GAME.me.xp || 0, M.xp ?? 0);
        GAME.me.username   = M.username ?? GAME.me.username ?? null;

        paintMe();
        initReferralIfReady();
      } catch(_) {}

      // leaderboard
      try {
        const lb = await getJSON('/api/leaderboard');
        if (Array.isArray(lb)) GAME.leaderboard = lb.slice(0, 20);
        else if (Array.isArray(lb?.leaders)) GAME.leaderboard = lb.leaders.slice(0, 20);
        else if (Array.isArray(lb?.top)) GAME.leaderboard = lb.top.slice(0, 20);
        paintTop20();
      } catch(_) {}

    } finally {
      isRefreshing = false;
    }
  }

  // קצב “חי” ומהיר
  setInterval(()=>refreshAll(false), 1000);
  refreshAll(true);

  /* --------------------------------- UI: Buttons ---------------------------------- */
  const statusLine=document.getElementById('status-line');
  function flashStatus(m){ if(!statusLine) return; statusLine.textContent=m; statusLine.style.opacity='1'; setTimeout(()=>statusLine.style.opacity='0.7',1600); }
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

  async function handleAction(type, xpGain = 0) {
    try {
      const res = await postJSON(`/api/${type}`, { userId: telegramUserId });
      // Pull fresh server state right away
      await refreshAll(true);

      // Optimistic bump (small, won’t hurt if server כבר העלה)
      if (type === 'tap')   { GAME.me.battle = (GAME.me.battle||0) + 0.01; GAME.me.xp = (GAME.me.xp||0) + xpGain; }
      if (type === 'super') { GAME.me.battle = (GAME.me.battle||0) + 0.25; GAME.me.xp = (GAME.me.xp||0) + xpGain; }
      paintMe(); paintScores(); flashXP();

      if (!res?.ok) flashStatus(i18n[getLang()]?.err || "Error");
    } catch (err) {
      console.error(`handleAction error for ${type}:`, err);
      flashStatus(i18n[getLang()]?.err || "Error");
    }
  }

  const btnTap = document.getElementById('btn-tap');
  if (btnTap) btnTap.addEventListener('click', () => handleAction('tap', 1));

  const btnSuper = document.getElementById('btn-super');
  if (btnSuper) btnSuper.addEventListener('click', () => handleAction('super', 25));

  // Switch Team
  const btnSwitch = document.getElementById('btn-switch');
  if (btnSwitch) btnSwitch.addEventListener('click', async () => {
    try {
      const to = (GAME.me.team === 'israel') ? 'gaza' : 'israel';
      await postJSON('/api/switch-team', { userId: GAME.me.id, newTeam: to });
      await refreshAll(true);
    } catch (err) {
      console.error("switch error:", err);
      flashStatus(i18n[getLang()]?.err || "Error");
    }
  });

  // Extra Tap (Payments) – unchanged logic: create invoice + openInvoice/fallback
  const btnExtra = document.getElementById('btn-extra');
  if (btnExtra) btnExtra.addEventListener('click', async () => {
    const starsInput = document.getElementById('stars-input');
    const amount = Math.max(1, Math.min(1000, parseInt(starsInput?.value || '0')));
    try {
      const r = await postJSON('/api/create-invoice', { userId: GAME.me.id, team: GAME.me.team, stars: amount });
      if (r?.ok && r.url) {
        if (WebApp?.openInvoice) {
          WebApp.openInvoice(r.url, () => refreshAll(true));
        } else {
          window.location.href = r.url;
        }
      } else {
        flashStatus(i18n[getLang()]?.err || "Error");
      }
    } catch (err) {
      console.error("extra error:", err);
      flashStatus(i18n[getLang()]?.err || "Error");
    }
  });

  /* -------------------------------- TON Connect (leave as-is) ---------------------- */
  try {
    const TonConnectClass =
      window.TonConnectSDK?.TonConnect ||
      window.TonConnect ||
      window.TON_CONNECT?.TonConnect;

    if (TonConnectClass) {
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
        ],
        storage: {
          getItem: (k) => localStorage.getItem(k),
          setItem: (k, v) => localStorage.setItem(k, v),
          removeItem: (k) => localStorage.removeItem(k)
        }
      });

      // restore
      tonConnect.restoreConnection && tonConnect.restoreConnection().catch(()=>{});
      const connectBtn = document.getElementById("connect-ton");
      const addressDiv = document.getElementById("ton-address");

      const restored = tonConnect.wallet;
      if (restored?.account?.address) {
        const addr = restored.account.address;
        if (addressDiv) addressDiv.textContent = `Connected: ${addr.slice(0, 6)}...${addr.slice(-4)}`;
        if (connectBtn) connectBtn.style.display = "none";
      }

      async function connectTonWallet() {
        try {
          const wallet = await tonConnect.connect();
          if (wallet?.account?.address) {
            const addr = wallet.account.address;
            if (addressDiv) addressDiv.textContent = `Connected: ${addr.slice(0, 6)}...${addr.slice(-4)}`;
            if (connectBtn) connectBtn.style.display = "none";
          }
        } catch (err) {
          console.error("TON connect error:", err);
          flashStatus("TON Connect Error");
        }
      }

      tonConnect.onStatusChange((wallet) => {
        if (wallet?.account?.address) {
          const addr = wallet.account.address;
          if (addressDiv) addressDiv.textContent = `Connected: ${addr.slice(0, 6)}...${addr.slice(-4)}`;
          if (connectBtn) connectBtn.style.display = "none";
        } else {
          if (connectBtn) connectBtn.style.display = "inline-block";
          if (addressDiv) addressDiv.textContent = "";
        }
      });

      if (connectBtn) connectBtn.addEventListener("click", connectTonWallet);
    }
  } catch (err) {
    console.error("TON init failed:", err);
  }

}); // DOMContentLoaded
</script>
