// ============================= /public/script.js =============================
// TeamBattle Mini-App client (FULL FILE, no truncation).
// Focus of this version (V1.5):
//  - Rebuild yellow "Extra TAP +2" button so it's always clickable and opens invoice correctly
//  - Keep previous UX layout expectations: working choose team, TAP, SUPER, language switching
//  - Prevent pinch/double-tap zoom while allowing ultra-fast taps (multi-touch friendly)
//  - Robust Telegram.openInvoice() with fallbacks for iOS/Android/Desktop
//  - No style or layout changes beyond what's required for the yellow button to work
//
// Notes:
//  - This file is self-contained and does not rely on external script fragments.
//  - It preserves element IDs: #choose-israel, #choose-gaza, #tap-btn, #super-btn, #donate-btn, etc.
//
// ============================================================================

(() => {
  // ---------- Safety CSS (runtime-injected) ----------
  try {
    const st = document.createElement("style");
    st.id = "tb-safety-css";
    st.textContent = `
      html, body { overscroll-behavior: none; touch-action: manipulation; }
      * { -webkit-tap-highlight-color: transparent; -webkit-user-drag: none; }
      /* Ensure yellow donate button is always interactable */
      #donate-btn { pointer-events: auto !important; opacity: 1 !important; }
      /* Kill accidental selection while spamming taps */
      body, button, input { user-select: none; -webkit-user-select: none; }
    `;
    document.head.appendChild(st);
  } catch {}

  // ---------- Utils ----------
  const qs  = (s,root=document) => root.querySelector(s);
  const qsa = (s,root=document) => [...root.querySelectorAll(s)];
  const log = (...a) => { try { console.log("[TB]", ...a); } catch {} };
  const err = (...a) => { try { console.error("[TB]", ...a); } catch {} };

  // Prevent zoom gestures but keep fast taps responsive
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

  // ---------- Config ----------
  const API_BASE = (window.location.origin || "").replace(/\/$/, "");
  const BOT_USERNAME = "TeamBattle_vBot"; // for ref-link share
  const TAP_LIMIT_FALLBACK = 300;

  // ---------- i18n ----------
  const I18N = {
    he: {
      israel: "🇮🇱 ישראל", gaza: "🇵🇸 עזה",
      tap: "TAP (+1)", super: "סופר-בוסט",
      rules: "⭐ 1 = 2 נק' • 💥 300 TAP/יום • ⚡ סופר פעם ביום",
      chooseIL: "בחר צוות ישראל 🇮🇱", chooseGA: "בחר צוות עזה 🇵🇸",
      donate: "Extra TAP +2",
      progress: (x,m)=>`${x} / ${m} TAP היום`,
      toastCopy: "הקישור הועתק",
      mustChoose: "בחר תחילה קבוצה",
      confirmSwitch: "להחליף קבוצה? זה ישפיע על הניקוד הבא שלך.",
      you: "אתה", myPanel: "הלוח שלי",
      myStars: (n)=>`⭐ כוכבים שתרמתי: ${n}`,
      myBonus: (n)=>`🎁 בונוס שותפים: ${n}⭐`,
      myTaps:  (x,m)=>`👆 TAP היום: ${x}/${m}`,
      share: "📤 שתף בטלגרם", leaders: "שחקנים מובילים",
      switched: "הקבוצה הוחלפה ✅", partners: "תוכנית שותפים 🤝",
      copyLink:"העתק קישור",
      paidCancelled:"התשלום בוטל/נכשל",
      invErr:"שגיאה ביצירת חשבונית",
      hitLimit:"הגעת למגבלת ה-TAP היומית",
      usedSuper:"השתמשת כבר בסופר-בוסט היום"
    },
    en: {
      israel:"🇮🇱 Israel", gaza:"🇵🇸 Gaza",
      tap:"TAP (+1)", super:"Super Boost",
      rules:"⭐ 1 = 2 pts • 💥 300 TAP/day • ⚡ Super once/day",
      chooseIL:"Join Team Israel 🇮🇱", chooseGA:"Join Team Gaza 🇵🇸",
      donate:"Extra TAP +2",
      progress:(x,m)=>`${x} / ${m} TAP today`,
      toastCopy:"Link copied",
      mustChoose:"Pick a team first",
      confirmSwitch:"Switch team? This affects your next points.",
      you:"You", myPanel:"My Panel",
      myStars:(n)=>`⭐ Stars I donated: ${n}`,
      myBonus:(n)=>`🎁 Referral bonus: ${n}⭐`,
      myTaps:(x,m)=>`👆 TAP today: ${x}/${m}`,
      share:"📤 Share on Telegram", leaders:"Top Players",
      switched:"Team switched ✅", partners:"Affiliate Program 🤝",
      copyLink:"Copy Link",
      paidCancelled:"Payment cancelled/failed",
      invErr:"Invoice creation error",
      hitLimit:"Daily TAP limit reached",
      usedSuper:"Super already used today"
    },
    ar: {
      israel:"🇮🇱 إسرائيل", gaza:"🇵🇸 غزة",
      tap:"TAP (+1)", super:"سوبر بوست",
      rules:"⭐ 1 = نقطتان • 💥 300 TAP/يوم • ⚡ سوبر مرة/يوم",
      chooseIL:"انضم لفريق إسرائيل 🇮🇱", chooseGA:"انضم لفريق غزة 🇵🇸",
      donate:"Extra TAP +2",
      progress:(x,m)=>`${x} / ${m} TAP اليوم`,
      toastCopy:"تم نسخ الرابط",
      mustChoose:"اختر فريقًا أولًا",
      confirmSwitch:"تغيير الفريق؟ سيؤثر على نقاطك القادمة.",
      you:"أنت", myPanel:"لوحتي",
      myStars:(n)=>`⭐ النجوم التي تبرعت بها: ${n}`,
      myBonus:(n)=>`🎁 مكافأة الإحالة: ${n}⭐`,
      myTaps:(x,m)=>`👆 TAP اليوم: ${x}/${m}`,
      share:"📤 شارك على تيليجرام", leaders:"اللاعبون المتصدرون",
      switched:"تم تغيير الفريق ✅", partners:"برنامج الشركاء 🤝",
      copyLink:"نسخ الرابط",
      paidCancelled:"تم إلغاء الدفع أو فشل",
      invErr:"خطأ إنشاء الفاتورة",
      hitLimit:"بلغت حد TAP اليومي",
      usedSuper:"تم استخدام السوبر اليوم"
    }
  };

  // ---------- State ----------
  let LANG = localStorage.getItem("tb_lang") || "he";
  let USER_ID = null;
  let TEAM = null;
  let tapsToday = 0;
  let tapsLimit = TAP_LIMIT_FALLBACK;

  // ---------- Telegram init ----------
  try {
    if (window.Telegram && Telegram.WebApp) {
      Telegram.WebApp.ready();
      const unsafe = Telegram.WebApp.initDataUnsafe || {};
      USER_ID = unsafe.user?.id ? String(unsafe.user.id) : null;
    }
  } catch(e){ err("TG init fail", e); }

  if (!USER_ID) {
    USER_ID = localStorage.getItem("tb_user_id") || String(Math.floor(Math.random()*1e12));
    localStorage.setItem("tb_user_id", USER_ID);
  }

  // ---------- Elements ----------
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
  };

  // ---------- UI helpers ----------
  function buildRefLink(uid = USER_ID) {
    return `https://t.me/${BOT_USERNAME}?start=ref_${uid}`;
  }
  function toast(msg) {
    if (!els.toast) { alert(msg); return; }
    els.toast.textContent = msg;
    els.toast.style.display = "block";
    setTimeout(()=>{ els.toast.style.display = "none"; }, 1500);
  }

  function applyLangTexts() {
    const t = I18N[LANG] || I18N.he;
    const R = (id, v) => { if (id) id.textContent = v; };

    R(els.titleIL,  t.israel);
    R(els.titleGA,  t.gaza);
    R(els.tap,      t.tap);
    R(els.super,    t.super);
    const rulesEl = qs(".rule") || els.rules;
    if (rulesEl) rulesEl.textContent = t.rules;

    R(els.chooseIL, t.chooseIL);
    R(els.chooseGA, t.chooseGA);
    R(els.donate,   t.donate);

    const aff = qs(".affiliate-title");
    if (aff) aff.textContent = t.partners;
    R(els.copy, t.copyLink);
    R(els.share, t.share);
    const lt = qs("#leaders-title"); if (lt) lt.textContent = t.leaders;
    const mp = qs("#my-panel-title"); if (mp) mp.textContent = t.myPanel;

    if (els.prog) els.prog.textContent = t.progress(tapsToday, tapsLimit);
    if (els.meStars)  els.meStars.textContent = t.myStars( Number(els.meStars?.dataset?.v || 0) );
    if (els.meBonus)  els.meBonus.textContent = t.myBonus( Number(els.meBonus?.dataset?.v || 0) );
    if (els.meTaps)   els.meTaps.textContent  = t.myTaps(tapsToday, tapsLimit);
  }

  // ---------- Networking ----------
  async function apiGet(p) {
    try {
      const r = await fetch(`${API_BASE}${p}`, { credentials:"omit" });
      return await r.json();
    } catch(e){ err("GET fail", p, e); return {}; }
  }
  async function apiPost(p, b) {
    try {
      const r = await fetch(`${API_BASE}${p}`, {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify(b || {})
      });
      return await r.json();
    } catch(e){ err("POST fail", p, e); return {}; }
  }

  // ---------- Data pulls ----------
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
    const me = j.me || {};
    TEAM = me.team || TEAM;
    tapsToday = typeof me.tapsToday === "number" ? me.tapsToday : tapsToday;
    tapsLimit = typeof j.limit === "number" ? j.limit : tapsLimit;

    // enable UI when team is selected
    const ready = !!TEAM;
    const setEnabled = (el, on=true) => { if (el) { el.disabled = !on; el.style.opacity = on ? "1" : "0.6"; } };
    setEnabled(els.tap, ready);
    setEnabled(els.super, ready);
    setEnabled(els.donate, ready); // Yellow button enabled only after team chosen (server requires team)

    if (els.teamChooser) els.teamChooser.style.display = ready ? "none" : "";
    if (els.meStars) { els.meStars.dataset.v = String(me.starsDonated ?? 0); }
    if (els.meBonus) { els.meBonus.dataset.v = String(me.bonusStars ?? 0); }
    applyLangTexts();
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
      const name = u.displayName || u.username || (u.userId === USER_ID ? t.you : `Player ${u.userId?.slice(-4)||""}`);
      const points = u.points ?? (u.starsDonated ? u.starsDonated * 2 : 0);
      li.textContent = `${rank}. ${name} — ${points} pts`;
      els.leaders.appendChild(li);
    });
  }

  // ---------- Actions ----------
  async function selectTeam(team) {
    const j = await apiPost("/api/select-team", { userId: USER_ID, team });
    if (j?.ok) {
      TEAM = team;
      if (els.teamChooser) els.teamChooser.style.display = "none";
      [els.tap, els.super, els.donate].forEach(el => { if (el) { el.disabled = false; el.style.opacity = "1"; }});
      const ref = buildRefLink(USER_ID);
      if (els.refInput) els.refInput.value = ref;
      await Promise.all([fetchState(), fetchMe(), fetchLeaders()]);
    }
  }

  async function handleTap() {
    if (!TEAM) return toast((I18N[LANG]||I18N.he).mustChoose);
    const j = await apiPost("/api/tap", { userId: USER_ID });
    if (j?.ok) await Promise.all([fetchState(), fetchMe(), fetchLeaders()]);
    else if (j?.error === "limit") toast((I18N[LANG]||I18N.he).hitLimit);
  }

  async function handleSuper() {
    if (!TEAM) return toast((I18N[LANG]||I18N.he).mustChoose);
    const j = await apiPost("/api/super", { userId: USER_ID });
    if (j?.ok) await Promise.all([fetchState(), fetchMe(), fetchLeaders()]);
    else if (j?.error === "limit") toast((I18N[LANG]||I18N.he).usedSuper);
  }

  // --- Open invoice with robust fallbacks ---
  async function openInvoice(url) {
    // Telegram WebApp preferred
    try {
      if (window.Telegram?.WebApp?.openInvoice) {
        return await new Promise((resolve, reject) => {
          Telegram.WebApp.openInvoice(url, (status) => {
            if (status === "paid" || status === "pending") resolve(true);
            else if (status === "cancelled" || status === "failed") reject(new Error(status));
            else resolve(true); // unknown → assume opened
          });
        });
      }
    } catch(e) {
      err("openInvoice callback error", e);
    }

    // In-app browser fallback (iOS/Android)
    try {
      window.location.href = url;
      return true;
    } catch {}

    // Desktop fallback
    try {
      window.open(url, "_blank", "noopener,noreferrer");
      return true;
    } catch(e) {
      err("window.open failed", e);
      return false;
    }
  }

  async function handleDonate() {
    if (!TEAM) return toast((I18N[LANG]||I18N.he).mustChoose);

    // ensure button is clickable visually
    if (els.donate) {
      els.donate.style.pointerEvents = "auto";
      els.donate.disabled = false;
      els.donate.style.opacity = "1";
    }

    const starsVal = els.stars?.value ?? "1";
    let stars = parseInt(starsVal, 10);
    if (!Number.isFinite(stars) || stars < 1) stars = 1;

    // Create invoice
    const j = await apiPost("/api/create-invoice", { userId: USER_ID, team: TEAM, stars });
    if (j?.ok && j.url) {
      const t0 = Date.now();
      try {
        await openInvoice(j.url);
      } catch {
        toast((I18N[LANG]||I18N.he).paidCancelled);
      }

      // Poll for up to ~25s to reflect payment
      const poll = async () => {
        await Promise.all([fetchState(), fetchMe(), fetchLeaders()]);
        if (Date.now() - t0 < 25000) setTimeout(poll, 2500);
      };
      setTimeout(poll, 3000);
    } else {
      toast((I18N[LANG]||I18N.he).invErr);
      err("create-invoice failed:", j);
    }
  }

  function wireClipboardAndShare() {
    if (els.refInput) els.refInput.value = buildRefLink(USER_ID);
    if (els.copy) els.copy.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(els.refInput.value);
        toast((I18N[LANG]||I18N.he).toastCopy);
      } catch { toast("לא הצלחתי להעתיק"); }
    });
    if (els.share) els.share.addEventListener("click", () => {
      const link = buildRefLink(USER_ID);
      const url = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent("בואו לשחק איתי ב‑TeamBattle!")}`;
      window.open(url, "_blank");
    });
  }

  // ---------- Event wiring (delegation) ----------
  document.addEventListener("click", (ev) => {
    const el = ev.target.closest("button, a, input[type=button]");
    if (!el) return;

    switch (el.id) {
      case "choose-israel": ev.preventDefault(); selectTeam("israel"); break;
      case "choose-gaza":   ev.preventDefault(); selectTeam("gaza");   break;
      case "tap-btn":       ev.preventDefault(); handleTap();          break;
      case "super-btn":     ev.preventDefault(); handleSuper();        break;
      case "donate-btn":
        ev.preventDefault();
        // Explicitly ensure it's enabled (in case external CSS disabled it)
        el.disabled = false; el.style.opacity = "1"; el.style.pointerEvents = "auto";
        handleDonate();
        break;
      case "switch-team":
        ev.preventDefault();
        if (!TEAM) { toast((I18N[LANG]||I18N.he).mustChoose); break; }
        if (!confirm((I18N[LANG]||I18N.he).confirmSwitch)) break;
        apiPost("/api/switch-team", { userId: USER_ID, newTeam: TEAM === "israel" ? "gaza" : "israel" })
          .then(async (j)=>{
            if (j?.ok) { TEAM = j.team; toast((I18N[LANG]||I18N.he).switched); await Promise.all([fetchState(), fetchMe(), fetchLeaders()]); }
          });
        break;
      default: break;
    }
  }, {passive:false});

  // Language toggle buttons (if exist)
  qsa(".lang-buttons button").forEach((b) => {
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

  // ---------- Init ----------
  document.addEventListener("DOMContentLoaded", () => {
    try { wireClipboardAndShare(); } catch(e){ err(e); }
    try { applyLangTexts(); } catch(e){ err(e); }
    // Ensure donate button is interactable from the start (visual state)
    if (els.donate) { els.donate.style.pointerEvents = "auto"; }

    fetchState();
    fetchMe();
    fetchLeaders();

    // Periodic refresh
    setInterval(fetchState, 10000);
    setInterval(fetchLeaders, 15000);
  });

})(); 
// =========================== END OF FULL FILE ===========================
