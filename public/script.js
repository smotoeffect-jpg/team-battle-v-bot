/* public/script.js — FIX-ONLY (לא נוגע בעיצוב), מפעיל כפתורים, תקין במובייל/טלגרם */

(() => {
  // ===== אנטי-זום/פינץ'/דאבל-טאפ בלי לפגוע בהקשות מהירות =====
  try {
    const st = document.createElement("style");
    st.textContent = `
      html,body{overscroll-behavior:none;touch-action:manipulation}
      *{-webkit-tap-highlight-color:transparent;-webkit-user-drag:none}
    `;
    document.head.appendChild(st);
  } catch {}

  let lastTouchEnd = 0;
  document.addEventListener("gesturestart", e => e.preventDefault(), {passive:false});
  document.addEventListener("dblclick", e => e.preventDefault(), {capture:true});
  document.addEventListener("touchend", e => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) e.preventDefault();
    lastTouchEnd = now;
  }, {passive:false});
  document.addEventListener("touchmove", e => {
    if (e.touches && e.touches.length > 1) e.preventDefault();
  }, {passive:false});

  // ===== Helpers =====
  const qs  = s => document.querySelector(s);
  const API_BASE = (window.location.origin || "").replace(/\/$/, "");
  const BOT_USERNAME = "TeamBattle_vBot";
  const log  = (...a)=>{ try{ console.log("[TB]",...a);}catch{} };
  const err  = (...a)=>{ try{ console.error("[TB]",...a);}catch{} };

  const els = {
    scoreIL: qs("#score-israel"),
    scoreGA: qs("#score-gaza"),
    rules:   qs("#rules"),
    chooser: qs("#team-chooser"),
    chooseIL:qs("#choose-israel"),
    chooseGA:qs("#choose-gaza"),
    tap:     qs("#tap-btn"),
    super:   qs("#super-btn"),
    switchTm:qs("#switch-team"),
    progress:qs("#progress-text"),
    starsIn: qs("#stars"),
    donate:  qs("#donate-btn"),
    meStars: qs("#me-stars"),
    meBonus: qs("#me-bonus"),
    meTaps:  qs("#me-taps"),
    leaders: qs("#leaderboard"),
    refIn:   qs("#ref-link"),
    copy:    qs("#copy-link"),
    share:   qs("#share-btn"),
    toast:   qs("#toast"),
    tIL:     qs("#team-israel"),
    tGA:     qs("#team-gaza"),
    leadersTitle: qs("#leaders-title"),
    myPanelTitle: qs("#my-panel-title"),
    affiliateTitle: qs(".affiliate-title"),
  };

  const toast = (msg) => {
    if (!els.toast) return;
    els.toast.textContent = msg;
    els.toast.style.display = "block";
    setTimeout(()=>{ els.toast.style.display = "none"; }, 1400);
  };

  // ===== I18N =====
  const I18N = {
    he: {
      israel:"🇮🇱 ישראל", gaza:"🇵🇸 עזה",
      tap:"TAP (+1)", super:"Super",
      rules:"⭐ 1 = 2 נק' • 💥 300 TAP/יום • ⚡ Super פעם ביום",
      chooseIL:"בחר צוות ישראל 🇮🇱", chooseGA:"בחר צוות עזה 🇵🇸",
      donate:"Extra TAP +2",
      progress:(x,m)=>`${x} / ${m} TAP היום`,
      you:"אתה", leaders:"שחקנים מובילים", myPanel:"הלוח שלי",
      partners:"תוכנית שותפים 🤝",
      copyLink:"העתק קישור", share:"שתף בטלגרם",
      mustChoose:"בחר תחילה קבוצה",
      switched:"הקבוצה הוחלפה ✅",
    },
    en: {
      israel:"🇮🇱 Israel", gaza:"🇵🇸 Gaza",
      tap:"TAP (+1)", super:"Super",
      rules:"⭐ 1 = 2 pts • 💥 300 TAP/day • ⚡ Super once/day",
      chooseIL:"Join Team Israel 🇮🇱", chooseGA:"Join Team Gaza 🇵🇸",
      donate:"Extra TAP +2",
      progress:(x,m)=>`${x} / ${m} TAP today`,
      you:"You", leaders:"Top Players", myPanel:"My Panel",
      partners:"Affiliate Program 🤝",
      copyLink:"Copy Link", share:"Share on Telegram",
      mustChoose:"Pick a team first",
      switched:"Team switched ✅",
    },
    ar: {
      israel:"🇮🇱 إسرائيل", gaza:"🇵🇸 غزة",
      tap:"TAP (+1)", super:"Super",
      rules:"⭐ 1 = نقطتان • 💥 ٣٠٠ TAP/يوم • ⚡ Super مرة/يوم",
      chooseIL:"انضم لفريق إسرائيل 🇮🇱", chooseGA:"انضم لفريق غزة 🇵🇸",
      donate:"Extra TAP +2",
      progress:(x,m)=>`${x} / ${m} TAP اليوم`,
      you:"أنت", leaders:"اللاعبون المتصدرون", myPanel:"لوحتي",
      partners:"برنامج الشركاء 🤝",
      copyLink:"نسخ الرابط", share:"شارك على تيليجرام",
      mustChoose:"اختر فريقًا أولًا",
      switched:"تم تغيير الفريق ✅",
    }
  };

  // ===== User / Lang =====
  let LANG = localStorage.getItem("tb_lang") || "he";
  let USER_ID = null;
  try {
    if (window.Telegram?.WebApp) {
      Telegram.WebApp.ready();
      const u = Telegram.WebApp.initDataUnsafe?.user;
      if (u?.id) USER_ID = String(u.id);
    }
  } catch {}
  if (!USER_ID) {
    USER_ID = localStorage.getItem("tb_user_id") || String(Math.floor(Math.random()*1e12));
    localStorage.setItem("tb_user_id", USER_ID);
  }

  let TEAM = null;
  let tapsToday = 0;
  let tapsLimit = 300;

  function i18nApply(){
    const t = I18N[LANG] || I18N.he;
    els.tIL && (els.tIL.textContent = t.israel);
    els.tGA && (els.tGA.textContent = t.gaza);
    els.rules && (els.rules.textContent = t.rules);
    els.chooseIL && (els.chooseIL.textContent = t.chooseIL);
    els.chooseGA && (els.chooseGA.textContent = t.chooseGA);
    els.tap && (els.tap.textContent = t.tap);
    els.super && (els.super.textContent = t.super);
    els.donate && (els.donate.textContent = t.donate);
    els.progress && (els.progress.textContent = t.progress(tapsToday, tapsLimit));
    els.leadersTitle && (els.leadersTitle.textContent = t.leaders);
    els.myPanelTitle && (els.myPanelTitle.textContent = t.myPanel);
    els.affiliateTitle && (els.affiliateTitle.textContent = t.partners);
  }

  function setButtonsEnabled(enabled){
    const list = [els.tap, els.super, els.switchTm, els.donate];
    list.forEach(b=>{
      if (!b) return;
      b.disabled = !enabled;
      b.style.opacity = enabled ? "1" : "0.6";
      b.style.pointerEvents = enabled ? "auto" : "none"; // <-- מבטל “צהוב לא לחיץ”
    });
    els.chooser && (els.chooser.style.display = enabled ? "none" : "flex");
  }

  // ===== API =====
  async function apiGet(p){
    try{
      const r = await fetch(`${API_BASE}${p}`, { credentials:"omit" });
      return await r.json();
    }catch(e){ err("GET", p, e); return {}; }
  }
  async function apiPost(p, body){
    try{
      const r = await fetch(`${API_BASE}${p}`, {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify(body || {})
      });
      return await r.json();
    }catch(e){ err("POST", p, e); return {}; }
  }

  // ===== Loaders =====
  async function fetchState(){
    const j = await apiGet("/api/state");
    if (j?.ok && j.scores){
      els.scoreIL && (els.scoreIL.textContent = j.scores.israel ?? 0);
      els.scoreGA && (els.scoreGA.textContent = j.scores.gaza ?? 0);
    }
  }
  async function fetchMe(){
    const j = await apiGet(`/api/me?userId=${encodeURIComponent(USER_ID)}`);
    if (!j?.ok || !j.me) return;
    const me = j.me;
    TEAM = me.team || TEAM;
    tapsToday = typeof me.tapsToday === "number" ? me.tapsToday : tapsToday;
    tapsLimit = typeof j.limit === "number" ? j.limit : tapsLimit;

    setButtonsEnabled(!!TEAM);

    if (els.meStars) {
      els.meStars.dataset.v = String(me.starsDonated ?? 0);
      els.meStars.textContent = `⭐ ${me.starsDonated ?? 0}`;
    }
    if (els.meBonus) {
      els.meBonus.dataset.v = String(me.bonusStars ?? 0);
      els.meBonus.textContent = `🎁 ${me.bonusStars ?? 0}⭐`;
    }
    if (els.meTaps) {
      const t = I18N[LANG] || I18N.he;
      els.meTaps.textContent = t.progress(tapsToday, tapsLimit);
    }
    const t = I18N[LANG] || I18N.he;
    els.progress && (els.progress.textContent = t.progress(tapsToday, tapsLimit));
  }
  async function fetchLeaders(){
    if (!els.leaders) return;
    const j = await apiGet("/api/leaderboard");
    if (!j?.ok || !Array.isArray(j.top)) return;
    const t = I18N[LANG] || I18N.he;
    els.leaders.innerHTML = "";
    j.top.slice(0,20).forEach((u,i)=>{
      const div = document.createElement("div");
      div.className = "leader-row";
      const name = u.displayName || u.username || (u.userId===USER_ID ? t.you : `Player ${String(u.userId||"").slice(-4)}`);
      const pts = u.points ?? ((u.starsDonated||0) + (u.bonusStars||0))*2;
      div.textContent = `${i+1}. ${name} — ${pts} pts`;
      els.leaders.appendChild(div);
    });
  }

  // ===== Actions =====
  async function selectTeam(team){
    const j = await apiPost("/api/select-team", { userId: USER_ID, team });
    if (j?.ok){
      TEAM = team;
      setButtonsEnabled(true);
      await Promise.all([fetchState(), fetchMe(), fetchLeaders()]);
      toast((I18N[LANG]||I18N.he).switched);
    }
  }
  async function handleTap(){
    if (!TEAM){ toast((I18N[LANG]||I18N.he).mustChoose); return; }
    const j = await apiPost("/api/tap", { userId: USER_ID });
    if (j?.ok) await Promise.all([fetchState(), fetchMe(), fetchLeaders()]);
  }
  async function handleSuper(){
    if (!TEAM){ toast((I18N[LANG]||I18N.he).mustChoose); return; }
    const j = await apiPost("/api/super", { userId: USER_ID });
    if (j?.ok) await Promise.all([fetchState(), fetchMe(), fetchLeaders()]);
  }

  // פתיחת חשבונית – WebApp + fallback
  async function openInvoice(url){
    try {
      if (window.Telegram?.WebApp?.openInvoice){
        await new Promise((resolve, reject)=>{
          Telegram.WebApp.openInvoice(url, (status)=>{
            if (status === "paid" || status === "pending") resolve();
            else reject(new Error(status || "failed"));
          });
        });
        return true;
      }
    } catch(e) { err("openInvoice", e); }
    try { window.open(url, "_blank","noopener,noreferrer"); } catch(e){ err("window.open", e); }
    return true;
  }

  async function handleDonate(){
    if (!TEAM){ toast((I18N[LANG]||I18N.he).mustChoose); return; }
    const stars = Math.max(1, parseInt(els.starsIn?.value || "1", 10));
    const j = await apiPost("/api/create-invoice", { userId: USER_ID, team: TEAM, stars });
    if (j?.ok && j.url){
      await openInvoice(j.url);
      // רענון קצר אחרי פתיחת החשבונית
      const started = Date.now();
      const poll = async () => {
        await Promise.all([fetchState(), fetchMe(), fetchLeaders()]);
        if (Date.now() - started < 20000) setTimeout(poll, 2500);
      };
      setTimeout(poll, 3000);
    }
  }

  // ===== Share / Clipboard =====
  function buildRefLink(uid = USER_ID){ return `https://t.me/${BOT_USERNAME}?start=ref_${uid}`; }
  function wireShare(){
    if (els.refIn) els.refIn.value = buildRefLink(USER_ID);
    els.copy?.addEventListener("click", async ()=>{
      try{ await navigator.clipboard.writeText(els.refIn.value); toast((I18N[LANG]||I18N.he).copyLink); }
      catch{ toast("Copy failed"); }
    });
    els.share?.addEventListener("click", ()=>{
      const link = buildRefLink(USER_ID);
      const url = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent("בואו לשחק איתי ב-TeamBattle!")}`;
      window.open(url, "_blank","noopener,noreferrer");
    });
  }

  // ===== Delegated clicks (לא נשבר אם ה־HTML זז) =====
  document.addEventListener("click", (ev)=>{
    const el = ev.target.closest("button, a, input[type=button]");
    if (!el) return;
    switch(el.id){
      case "choose-israel": ev.preventDefault(); selectTeam("israel"); break;
      case "choose-gaza":   ev.preventDefault(); selectTeam("gaza");   break;
      case "tap-btn":       ev.preventDefault(); handleTap();          break;
      case "super-btn":     ev.preventDefault(); handleSuper();        break;
      case "switch-team":
        ev.preventDefault();
        if (!TEAM){ toast((I18N[LANG]||I18N.he).mustChoose); break; }
        apiPost("/api/switch-team", { userId: USER_ID, newTeam: TEAM==="israel"?"gaza":"israel" })
          .then(async (j)=>{ if (j?.ok){ TEAM=j.team; setButtonsEnabled(true); toast((I18N[LANG]||I18N.he).switched); await Promise.all([fetchState(), fetchMe(), fetchLeaders()]); }});
        break;
      case "donate-btn":    ev.preventDefault(); handleDonate();       break;
      default: break;
    }
  }, {passive:false});

  // ===== Language buttons (עובד לפי data-lang) =====
  document.querySelectorAll("[data-lang]").forEach(b=>{
    b.addEventListener("click", ()=>{
      const lang = b.dataset.lang;
      if (!I18N[lang]) return;
      LANG = lang;
      localStorage.setItem("tb_lang", LANG);
      i18nApply();
      fetchLeaders();
      fetchMe();
    });
  });

  // ===== Init =====
  document.addEventListener("DOMContentLoaded", ()=>{
    i18nApply();               // טקסטים לפי שפה
    setButtonsEnabled(false);  // עד בחירת קבוצה
    wireShare();               // קישור שותפים
    fetchState(); fetchMe(); fetchLeaders();
    setInterval(fetchState, 10000);
    setInterval(fetchLeaders, 15000);
  });
})();
