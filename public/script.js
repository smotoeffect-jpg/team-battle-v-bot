(() => {
  // ===== Hardening: למנוע זום/פינץ'/דאבל-טאפ, אבל לא לחסום הקשות מהירות =====
  try {
    const st = document.createElement("style");
    st.textContent = `
      html, body { overscroll-behavior: contain; touch-action: manipulation; }
      * { -webkit-user-drag: none; -webkit-tap-highlight-color: transparent; }
    `;
    document.head.appendChild(st);
  } catch {}

  let lastTouchEnd = 0;
  document.addEventListener("gesturestart", (e)=>{ e.preventDefault(); }, {passive:false});
  document.addEventListener("dblclick", (e)=>{ e.preventDefault(); }, {capture:true});
  document.addEventListener("touchend", (e)=>{
    const now = Date.now();
    if (now - lastTouchEnd <= 300) e.preventDefault();
    lastTouchEnd = now;
  }, {passive:false});
  document.addEventListener("touchmove", (e)=>{
    if (e.touches && e.touches.length > 1) e.preventDefault();
  }, {passive:false});

  // ===== Helpers =====
  const qs  = (s) => document.querySelector(s);
  const log = (...a) => { try { console.log("[TB]", ...a); } catch {} };

  // ===== Config =====
  const API_BASE = (window.location.origin || "").replace(/\/$/, "");
  const BOT_USERNAME = "TeamBattle_vBot";

  // ===== I18N =====
  const I18N = {
    he: {
      israel:"ישראל", gaza:"עזה",
      rules:"⭐ 1 = 2 נקודות • 💥 מגבלה 300 טאפים ביום • ⚡ סופר-בוסט: +25 פעם ביום",
      chooseIL:"בחר צוות ישראל 🇮🇱", chooseGA:"בחר צוות עזה 🇵🇸",
      tapBtn:"TAP (+1)", superBtn:"סופר-בוסט",
      donateBtn:"Extra TAP +2",
      progress:(x,m)=>`${x} / ${m} טאפים היום`,
      partners:"תוכנית שותפים 🤝",
      affiliateDesc:"הזמן חברים בעזרת הקישור האישי שלך. כאשר הם תורמים ⭐ — אתה מקבל 10% בונוס נקודות לקבוצה שלך!",
      copyLink:"העתק קישור", share:"שתף בטלגרם", myPanel:"הלוח שלי", leaders:"שחקנים מובילים",
      toastCopied:"הקישור הועתק",
      needTeam:"בחר תחילה קבוצה",
      switched:"הקבוצה הוחלפה ✅",
      myStars:(n)=>`⭐ כוכבים שתרמתי: ${n}`,
      myBonus:(n)=>`🎁 בונוס שותפים שקיבלתי: ${n}⭐`,
      myTaps:(x,m)=>`👆 טאפים היום: ${x}/${m}`,
      hitLimit:"הגעת למגבלת הטאפים היומית",
      usedSuper:"השתמשת כבר בסופר-בוסט היום",
      invErr:"שגיאה ביצירת חשבונית",
      paidCancelled:"התשלום בוטל או נכשל",
    },
    en: {
      israel:"Israel", gaza:"Gaza",
      rules:"⭐ 1 = 2 pts • 💥 300 taps/day • ⚡ Super Boost: +25 once/day",
      chooseIL:"Join Team Israel 🇮🇱", chooseGA:"Join Team Gaza 🇵🇸",
      tapBtn:"TAP (+1)", superBtn:"Super Boost",
      donateBtn:"Extra TAP +2",
      progress:(x,m)=>`${x} / ${m} taps today`,
      partners:"Affiliate Program 🤝",
      affiliateDesc:"Invite friends with your personal link. When they donate ⭐ — you get a 10% bonus to your team!",
      copyLink:"Copy Link", share:"Share on Telegram", myPanel:"My Panel", leaders:"Top Players",
      toastCopied:"Link copied",
      needTeam:"Pick a team first",
      switched:"Team switched ✅",
      myStars:(n)=>`⭐ Stars I donated: ${n}`,
      myBonus:(n)=>`🎁 Referral bonus I got: ${n}⭐`,
      myTaps:(x,m)=>`👆 Taps today: ${x}/${m}`,
      hitLimit:"Daily taps limit reached",
      usedSuper:"Super already used today",
      invErr:"Invoice creation error",
      paidCancelled:"Payment cancelled or failed",
    },
    ar: {
      israel:"إسرائيل", gaza:"غزة",
      rules:"⭐ 1 = نقطتان • 💥 ٣٠٠ نقرة/يوم • ⚡ سوبر: +25 مرة/يوم",
      chooseIL:"انضم لإسرائيل 🇮🇱", chooseGA:"انضم لغزة 🇵🇸",
      tapBtn:"TAP (+1)", superBtn:"سوبر",
      donateBtn:"Extra TAP +2",
      progress:(x,m)=>`${x} / ${m} نقرات اليوم`,
      partners:"برنامج الشركاء 🤝",
      affiliateDesc:"ادعُ أصدقاءك برابطك الخاص. عند تبرعهم ⭐ — تحصل على 10% مكافأة لفريقك!",
      copyLink:"نسخ الرابط", share:"شارك على تيليجرام", myPanel:"لوحتي", leaders:"اللاعبون المتصدرون",
      toastCopied:"تم نسخ الرابط",
      needTeam:"اختر فريقًا أولًا",
      switched:"تم تغيير الفريق ✅",
      myStars:(n)=>`⭐ النجوم التي تبرعت بها: ${n}`,
      myBonus:(n)=>`🎁 مكافأة الإحالة: ${n}⭐`,
      myTaps:(x,m)=>`👆 نقرات اليوم: ${x}/${m}`,
      hitLimit:"بلغت حد النقرات اليومي",
      usedSuper:"تم استخدام السوبر اليوم",
      invErr:"خطأ في إنشاء الفاتورة",
      paidCancelled:"تم إلغاء الدفع أو فشل",
    }
  };

  // ===== State =====
  let LANG = localStorage.getItem("tb_lang") || "he";
  let USER_ID = null;
  let TEAM = null;
  let tapsToday = 0;
  let tapsLimit = 300;

  // ===== Telegram init =====
  try {
    if (window.Telegram && Telegram.WebApp) {
      Telegram.WebApp.ready();
      const unsafe = Telegram.WebApp.initDataUnsafe || {};
      USER_ID = unsafe.user?.id ? String(unsafe.user.id) : null;
    }
  } catch(e){}

  if (!USER_ID) {
    USER_ID = localStorage.getItem("tb_user_id") || String(Math.floor(Math.random()*1e12));
    localStorage.setItem("tb_user_id", USER_ID);
  }

  // ===== Elements =====
  const els = {
    scoreIL:   qs("#score-israel"),
    scoreGA:   qs("#score-gaza"),
    tap:       qs("#tap-btn"),
    super:     qs("#super-btn"),
    rules:     qs("#rules"),
    prog:      qs("#progress-text"),
    donate:    qs("#donate-btn"),
    stars:     qs("#stars"),
    chooseIL:  qs("#choose-israel"),
    chooseGA:  qs("#choose-gaza"),
    refInput:  qs("#ref-link"),
    copy:      qs("#copy-link"),
    share:     qs("#share-btn"),
    toast:     qs("#toast"),
    switchTm:  qs("#switch-team"),
    meStars:   qs("#me-stars"),
    meBonus:   qs("#me-bonus"),
    meTaps:    qs("#me-taps"),
    leaders:   qs("#leaderboard"),
    teamChooser: qs("#team-chooser"),
    titleIL:   qs("#team-israel"),
    titleGA:   qs("#team-gaza"),
    affTitle:  qs(".affiliate-title"),
    affDesc:   qs("#affiliate-desc"),
    myPanelT:  qs("#my-panel-title"),
    leadersT:  qs("#leaders-title"),
  };

  function toast(msg) {
    if (!els.toast) { alert(msg); return; }
    els.toast.textContent = msg;
    els.toast.style.display = "block";
    setTimeout(()=>{ els.toast.style.display = "none"; }, 1500);
  }

  function buildRefLink(uid = USER_ID) {
    return `https://t.me/${BOT_USERNAME}?start=ref_${uid}`;
  }

  // ===== Language apply =====
  function applyLangTexts() {
    const t = I18N[LANG] || I18N.he;
    if (els.titleIL)  els.titleIL.textContent  = t.israel;
    if (els.titleGA)  els.titleGA.textContent  = t.gaza;
    if (els.rules)    els.rules.textContent    = t.rules;
    if (els.chooseIL) els.chooseIL.textContent = t.chooseIL;
    if (els.chooseGA) els.chooseGA.textContent = t.chooseGA;
    if (els.tap)      els.tap.textContent      = t.tapBtn;
    if (els.super)    els.super.textContent    = t.superBtn;
    if (els.donate)   els.donate.textContent   = t.donateBtn;
    if (els.prog)     els.prog.textContent     = t.progress(tapsToday, tapsLimit);
    if (els.meStars)  els.meStars.textContent  = t.myStars(Number(els.meStars.dataset.v||0));
    if (els.meBonus)  els.meBonus.textContent  = t.myBonus(Number(els.meBonus.dataset.v||0));
    if (els.meTaps)   els.meTaps.textContent   = t.myTaps(tapsToday, tapsLimit);
    if (els.affTitle) els.affTitle.textContent = t.partners;
    if (els.affDesc)  els.affDesc.textContent  = t.affiliateDesc;
    if (els.copy)     els.copy.textContent     = t.copyLink;
    if (els.share)    els.share.textContent    = t.share;
    if (els.myPanelT) els.myPanelT.textContent = t.myPanel;
    if (els.leadersT) els.leadersT.textContent = t.leaders;
  }

  // ===== API =====
  async function apiGet(p) {
    try {
      const r = await fetch(`${API_BASE}${p}`, { credentials:"omit" });
      return await r.json();
    } catch { return {}; }
  }
  async function apiPost(p, b) {
    try {
      const r = await fetch(`${API_BASE}${p}`, {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify(b || {})
      });
      return await r.json();
    } catch { return {}; }
  }

  // ===== Fetchers =====
  async function fetchState() {
    const j = await apiGet("/api/state");
    if (j?.ok && j.scores) {
      if (els.scoreIL) els.scoreIL.textContent = j.scores.israel ?? 0;
      if (els.scoreGA) els.scoreGA.textContent = j.scores.gaza ?? 0;
    }
  }

  async function fetchMe() {
    const j = await apiGet(`/api/me?userId=${encodeURIComponent(USER_ID)}`);
    if (!j?.ok || !j.me) return;
    const me = j.me;

    TEAM = me.team || TEAM;
    tapsToday = Number.isFinite(me.tapsToday) ? me.tapsToday : tapsToday;
    tapsLimit = Number.isFinite(j.limit) ? j.limit : tapsLimit;

    // Enable buttons only if team chosen
    const enable = !!TEAM;
    [els.tap, els.super, els.donate, els.switchTm].forEach(b => { if (b) b.disabled = !enable; });
    if (els.teamChooser) els.teamChooser.style.display = enable ? "none" : "flex";

    if (els.meStars) {
      els.meStars.dataset.v = String(me.starsDonated ?? 0);
      els.meStars.textContent = (I18N[LANG]||I18N.he).myStars(me.starsDonated ?? 0);
    }
    if (els.meBonus) {
      els.meBonus.dataset.v = String(me.bonusStars ?? 0);
      els.meBonus.textContent = (I18N[LANG]||I18N.he).myBonus(me.bonusStars ?? 0);
    }
    if (els.meTaps) els.meTaps.textContent = (I18N[LANG]||I18N.he).myTaps(tapsToday, tapsLimit);
    if (els.prog)   els.prog.textContent   = (I18N[LANG]||I18N.he).progress(tapsToday, tapsLimit);

    // partner link
    if (els.refInput) els.refInput.value = buildRefLink(USER_ID);
  }

  async function fetchLeaders() {
    const j = await apiGet("/api/leaderboard");
    if (!j?.ok || !Array.isArray(j.top) || !els.leaders) return;
    const t = I18N[LANG] || I18N.he;
    els.leaders.innerHTML = "";
    j.top.slice(0, 20).forEach((u, i) => {
      const li = document.createElement("div");
      li.className = "leader-row";
      const rank = i + 1;
      const name =
        u.displayName || u.username ||
        (u.userId === USER_ID ? (LANG === "he" ? "אתה" : (LANG==="ar"?"أنت":"You")) :
          `Player ${u.userId?.slice(-4)||""}`);
      const points = u.points ?? (u.starsDonated ? u.starsDonated * 2 : 0);
      li.textContent = `${rank}. ${name} — ${points} pts`;
      els.leaders.appendChild(li);
    });
  }

  // ===== Actions =====
  async function selectTeam(team) {
    const j = await apiPost("/api/select-team", { userId: USER_ID, team });
    if (j?.ok) {
      TEAM = team;
      [els.tap, els.super, els.donate, els.switchTm].forEach(b => { if (b) b.disabled = false; });
      if (els.teamChooser) els.teamChooser.style.display = "none";
      await Promise.all([fetchState(), fetchMe(), fetchLeaders()]);
    }
  }

  async function handleTap() {
    if (!TEAM) return toast((I18N[LANG]||I18N.he).needTeam);
    const j = await apiPost("/api/tap", { userId: USER_ID });
    if (j?.ok) {
      await Promise.all([fetchState(), fetchMe(), fetchLeaders()]);
    } else if (j?.error === "limit") {
      toast((I18N[LANG]||I18N.he).hitLimit);
    }
  }

  async function handleSuper() {
    if (!TEAM) return toast((I18N[LANG]||I18N.he).needTeam);
    const j = await apiPost("/api/super", { userId: USER_ID });
    if (j?.ok) {
      await Promise.all([fetchState(), fetchMe(), fetchLeaders()]);
    } else if (j?.error === "limit") {
      toast((I18N[LANG]||I18N.he).usedSuper);
    }
  }

  async function openInvoice(url) {
    try {
      if (window.Telegram?.WebApp?.openInvoice) {
        await new Promise((resolve, reject) => {
          Telegram.WebApp.openInvoice(url, (status) => {
            if (status === "paid" || status === "pending") resolve();
            else reject(new Error(status || "failed"));
          });
        });
        return true;
      }
    } catch(_) {}
    try { window.open(url, "_blank"); } catch {}
    return true;
  }

  async function handleDonate() {
    if (!TEAM) return toast((I18N[LANG]||I18N.he).needTeam);
    const stars = Math.max(1, parseInt(els.stars?.value || "1", 10));
    const j = await apiPost("/api/create-invoice", { userId: USER_ID, team: TEAM, stars });
    if (j?.ok && j.url) {
      try {
        await openInvoice(j.url);
        const started = Date.now();
        const poll = async () => {
          await Promise.all([fetchState(), fetchMe(), fetchLeaders()]);
          if (Date.now() - started < 20000) setTimeout(poll, 2500);
        };
        setTimeout(poll, 3000);
      } catch {
        toast((I18N[LANG]||I18N.he).paidCancelled);
      }
    } else {
      toast((I18N[LANG]||I18N.he).invErr);
    }
  }

  function wireClipboardAndShare() {
    if (els.refInput) els.refInput.value = buildRefLink(USER_ID);
    if (els.copy) els.copy.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(els.refInput.value);
        toast((I18N[LANG]||I18N.he).toastCopied);
      } catch { /* ignore */ }
    });
    if (els.share) els.share.addEventListener("click", () => {
      const link = buildRefLink(USER_ID);
      const url = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent("Join TeamBattle!")}`;
      window.open(url, "_blank");
    });
  }

  // ===== Events (ללא פופ-אפ אישור) =====
  document.addEventListener("click", (ev) => {
    const el = ev.target.closest("button, a, input[type=button]");
    if (!el) return;

    switch (el.id) {
      case "choose-israel": ev.preventDefault(); selectTeam("israel"); break;
      case "choose-gaza":   ev.preventDefault(); selectTeam("gaza");   break;
      case "tap-btn":       ev.preventDefault(); handleTap();          break;
      case "super-btn":     ev.preventDefault(); handleSuper();        break;
      case "donate-btn":    ev.preventDefault(); handleDonate();       break;
      case "switch-team":
        ev.preventDefault();
        if (!TEAM) { toast((I18N[LANG]||I18N.he).needTeam); break; }
        apiPost("/api/switch-team", { userId: USER_ID, newTeam: TEAM === "israel" ? "gaza" : "israel" })
          .then(async (j)=>{
            if (j?.ok) { TEAM = j.team; toast((I18N[LANG]||I18N.he).switched); await Promise.all([fetchState(), fetchMe(), fetchLeaders()]); }
          });
        break;
      default: break;
    }
  }, {passive:false});

  // שינוי שפה
  document.querySelectorAll(".lang-buttons button").forEach((b) => {
    b.addEventListener("click", () => {
      const lang = b.dataset.lang;
      if (I18N[lang]) {
        LANG = lang;
        localStorage.setItem("tb_lang", LANG);
        applyLangTexts();
        fetchLeaders();
        fetchMe();
      }
    });
  });

  // ===== Init =====
  document.addEventListener("DOMContentLoaded", () => {
    wireClipboardAndShare();
    applyLangTexts();
    // בהתחלה — לחצנים נעולים עד שיש קבוצה
    [els.tap, els.super, els.donate, els.switchTm].forEach(b => { if (b) b.disabled = true; });
    fetchState();
    fetchMe();
    fetchLeaders();
    setInterval(fetchState, 10000);
    setInterval(fetchLeaders, 15000);
  });
})();
