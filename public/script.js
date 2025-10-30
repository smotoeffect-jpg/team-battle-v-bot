
// === Inject anti-zoom & fast-tap behavior ===
(function setupTouchBehavior(){
  try {
    // Ensure viewport tag prevents zoom
    var vp = document.querySelector('meta[name="viewport"]');
    if (!vp) {
      vp = document.createElement('meta');
      vp.name = 'viewport';
      document.head.appendChild(vp);
    }
    vp.setAttribute('content','width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no');

    // CSS to improve tap behavior and disable double-tap zoom
    var css = document.createElement('style');
    css.id = 'tb-touch-style';
    css.textContent = `
      html, body { overscroll-behavior: contain; touch-action: manipulation; }
      #tb-xp-banner {
        position: fixed; top: 8px; left: 50%; transform: translateX(-50%);
        padding: 6px 12px; border-radius: 10px; font-weight: 700; 
        z-index: 9999; user-select: none; pointer-events: none; 
        backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
      }
      .neon {
        text-shadow: 0 0 4px rgba(255, 255, 255, 0.6), 0 0 10px rgba(255, 0, 200, 0.9), 0 0 16px rgba(255, 0, 200, 0.7);
        box-shadow: 0 0 10px rgba(255, 0, 200, 0.3), inset 0 0 10px rgba(255,255,255,0.1);
      }
      .pulse {
        animation: tbPulse 1.4s ease-in-out infinite;
      }
      @keyframes tbPulse {
        0% { filter: drop-shadow(0 0 0px rgba(255,0,200,0.0)); opacity: 0.95; }
        50% { filter: drop-shadow(0 0 12px rgba(255,0,200,0.55)); opacity: 1; }
        100% { filter: drop-shadow(0 0 0px rgba(255,0,200,0.0)); opacity: 0.95; }
      }
    `;
    document.head.appendChild(css);

    // Prevent pinch zoom and gesture zoom
    document.addEventListener('gesturestart', function(e){ e.preventDefault(); }, {passive:false});
    document.addEventListener('gesturechange', function(e){ e.preventDefault(); }, {passive:false});
    document.addEventListener('gestureend', function(e){ e.preventDefault(); }, {passive:false});

    // Prevent double-tap zoom on iOS
    var lastTouchEnd = 0;
    document.addEventListener('touchend', function(e){
      var now = Date.now();
      if (now - lastTouchEnd <= 300) {
        e.preventDefault();
      }
      lastTouchEnd = now;
    }, {passive:false});

    // Allow multi-touch taps without scrolling
    document.addEventListener('touchmove', function(e){
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    }, {passive:false});
  } catch(_){}
})();


// === Double XP banner ===
(function setupDoubleXpBanner(){
  try {
    var banner = document.getElementById('tb-xp-banner');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'tb-xp-banner';
      document.body.appendChild(banner);
    }
    function render(active){
      if (active) {
        banner.textContent = '🔥 XP מוכפל פעיל! ⚡';
        banner.className = 'neon pulse';
        banner.style.background = 'rgba(0,0,0,0.45)';
        banner.style.color = '#ffffff';
        banner.style.border = '1px solid rgba(255,0,200,0.6)';
      } else {
        banner.textContent = '⚡ XP רגיל';
        banner.className = '';
        banner.style.background = 'rgba(0,0,0,0.25)';
        banner.style.color = '#ddd';
        banner.style.border = '1px solid rgba(255,255,255,0.2)';
      }
    }
    async function refresh(){
      try{
        const r = await fetch((window.location.origin.replace(/\\/$/, '')) + '/api/state');
        const j = await r.json();
        render(!!j.doubleXpActive);
      }catch(_){}
    }
    refresh();
    setInterval(refresh, 30000);
  } catch(_){}
})();

// ===== Client config =====
const API_BASE = window.location.origin.replace(/\/$/, "");
const BOT_USERNAME = "TeamBattle_vBot";

// ==== I18N ====
const I18N = {
  he: {
    israel: "🇮🇱 ישראל",
    gaza: "🇵🇸 עזה",
    tap: "טאפ להגברה (+1)",
    super: "סופר-בוסט (+25)",
    rules: "⭐ 1 = 2 נקודות • 💥 מגבלה 300 טאפים ביום • ⚡ סופר-בוסט: +25 פעם ביום",
    chooseIL: "בחר צוות ישראל 🇮🇱",
    chooseGA: "בחר צוות עזה 🇵🇸",
    donate: "תרום כוכבים",
    progress: (x, m) => `${x} / ${m} טאפים היום`,
    toastCopy: "הקישור הועתק",
    mustChoose: "בחר תחילה קבוצה",
    confirmSwitch: "להחליף קבוצה? הפעולה תשפיע על הניקוד הבא שלך.",
    you: "אתה",
    myPanel: "הלוח שלי",
    myStars: (n) => `⭐ כוכבים שתרמתי: ${n}`,
    myBonus: (n) => `🎁 בונוס שותפים שקיבלתי: ${n}⭐`,
    myTaps: (x, m) => `👆 טאפים היום: ${x}/${m}`,
    share: "📤 שתף בטלגרם",
    leaders: "שחקנים מובילים",
    switched: "הקבוצה הוחלפה ✅",
    partners: "תוכנית שותפים 🤝",
    copyLink: "העתק קישור",
    levelLine: (lvl, xp, next) => `🎖️ רמה ${lvl} (${xp}/${next} XP)`,
    dailyBonusToast: "קיבלת בונוס יומי 🎁 +5 נק' קבוצה ו־+10 XP!",
  },
  en: {
    israel: "🇮🇱 Israel",
    gaza: "🇵🇸 Gaza",
    tap: "Tap (+1)",
    super: "Super Boost (+25)",
    rules: "⭐ 1 = 2 pts • 💥 300 taps/day • ⚡ Super Boost: +25 once/day",
    chooseIL: "Join Team Israel 🇮🇱",
    chooseGA: "Join Team Gaza 🇵🇸",
    donate: "Donate Stars",
    progress: (x, m) => `${x} / ${m} taps today`,
    toastCopy: "Link copied",
    mustChoose: "Pick a team first",
    confirmSwitch: "Switch team? This affects your next points.",
    you: "You",
    myPanel: "My Panel",
    myStars: (n) => `⭐ Stars I donated: ${n}`,
    myBonus: (n) => `🎁 Referral bonus I got: ${n}⭐`,
    myTaps: (x, m) => `👆 Taps today: ${x}/${m}`,
    share: "📤 Share on Telegram",
    leaders: "Top Players",
    switched: "Team switched ✅",
    partners: "Affiliate Program 🤝",
    copyLink: "Copy Link",
    levelLine: (lvl, xp, next) => `🎖️ Level ${lvl} (${xp}/${next} XP)`,
    dailyBonusToast: "Daily bonus 🎁 +5 team pts & +10 XP!",
  },
};

// ==== Shortcuts ====
const qs = (s) => document.querySelector(s);
const qsa = (s) => Array.from(document.querySelectorAll(s));

// ==== Elements ====
const elScoreIL = qs("#score-israel");
const elScoreGA = qs("#score-gaza");
const elTap = qs("#tap-btn");
const elSuper = qs("#super-btn");
const elRules = qs("#rules");
const elProg = qs("#progress-text");
const elDonate = qs("#donate-btn");
const elStars = qs("#stars");
const elChooseIL = qs("#choose-israel");
const elChooseGA = qs("#choose-gaza");
const elRefInput = qs("#ref-link");
const elCopy = qs("#copy-link");
const elShare = qs("#share-btn");
const elToast = qs("#toast");
const elSwitch = qs("#switch-team");
const elMeStars = qs("#me-stars");
const elMeBonus = qs("#me-bonus");
const elMeTaps = qs("#me-taps");
const elLeaders = qs("#leaderboard");
const elTeamChooser = qs("#team-chooser");

// תוספת חדשה – XP/Level
let elMeLevel = qs("#me-level");
if (!elMeLevel) {
  elMeLevel = document.createElement("p");
  elMeLevel.id = "me-level";
  const panel = qs("#my-panel") || document.body;
  panel.insertBefore(elMeLevel, elMeTaps || null);
}

let LANG = localStorage.getItem("tb_lang") || "he";
let USER_ID = null;
let TEAM = null;
let tapsToday = 0;
let tapsLimit = 300;
let lastXP = 0;
let lastLevel = 1;

// ==== Telegram init ====
try {
  if (window.Telegram && Telegram.WebApp) {
    Telegram.WebApp.ready();
    const unsafe = Telegram.WebApp.initDataUnsafe || {};
    USER_ID = unsafe.user?.id ? String(unsafe.user.id) : null;
  }
} catch (_) {}

if (!USER_ID) {
  USER_ID = localStorage.getItem("tb_user_id") || String(Math.floor(Math.random() * 1e12));
  localStorage.setItem("tb_user_id", USER_ID);
}

// ==== Helpers ====
function buildRefLink(uid = USER_ID) {
  return `https://t.me/${BOT_USERNAME}?start=ref_${uid}`;
}
function toast(msg) {
  if (!elToast) return alert(msg);
  elToast.textContent = msg;
  elToast.hidden = false;
  setTimeout(() => (elToast.hidden = true), 1800);
}
const nextLevelAt = (level) => level * 100;

// ==== Language ====
function applyLangTexts() {
  const t = I18N[LANG];
  qs("#team-israel") && (qs("#team-israel").textContent = t.israel);
  qs("#team-gaza") && (qs("#team-gaza").textContent = t.gaza);
  elTap && (elTap.textContent = t.tap);
  elSuper && (elSuper.textContent = t.super);
  elRules && (elRules.textContent = t.rules);
  elChooseIL && (elChooseIL.textContent = t.chooseIL);
  elChooseGA && (elChooseGA.textContent = t.chooseGA);
  elDonate && (elDonate.textContent = t.donate);
  qs(".affiliate-title") && (qs(".affiliate-title").textContent = t.partners);
  elCopy && (elCopy.textContent = t.copyLink);
  elShare && (elShare.textContent = t.share);
  qs("#leaders-title") && (qs("#leaders-title").textContent = t.leaders);
  qs("#my-panel-title") && (qs("#my-panel-title").textContent = t.myPanel);
  elProg && (elProg.textContent = t.progress(tapsToday, tapsLimit));
  elMeStars && (elMeStars.textContent = t.myStars(elMeStars.dataset.v || 0));
  elMeBonus && (elMeBonus.textContent = t.myBonus(elMeBonus.dataset.v || 0));
  if (elMeLevel) elMeLevel.textContent = t.levelLine(lastLevel, lastXP, nextLevelAt(lastLevel));
}

qsa(".lang-buttons button").forEach((b) =>
  b.addEventListener("click", () => {
    const lang = b.dataset.lang;
    if (I18N[lang]) {
      LANG = lang;
      localStorage.setItem("tb_lang", LANG);
      applyLangTexts();
      fetchLeaders();
      fetchMe();
    }
  })
);

// ==== API ====
async function apiGet(p) {
  const r = await fetch(`${API_BASE}${p}`);
  return r.json().catch(() => ({}));
}
async function apiPost(p, b) {
  const r = await fetch(`${API_BASE}${p}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(b || {}),
  });
  return r.json().catch(() => ({}));
}

// ==== State & Me ====
async function fetchState() {
  const j = await apiGet("/api/state");
  if (j?.ok && j.scores) {
    elScoreIL && (elScoreIL.textContent = j.scores.israel ?? 0);
    elScoreGA && (elScoreGA.textContent = j.scores.gaza ?? 0);
  }
}

async function fetchMe() {
  const j = await apiGet(`/api/me?userId=${encodeURIComponent(USER_ID)}`);
  if (!j?.ok || !j.me) return;
  const me = j.me;

  TEAM = me.team || TEAM;
  tapsToday = me.tapsToday ?? tapsToday;
  tapsLimit = j.limit ?? tapsLimit;
  lastXP = Number(me.xp || 0);
  lastLevel = Number(me.level || 1);

  if (TEAM) {
    elTeamChooser && (elTeamChooser.style.display = "none");
    elTap && (elTap.disabled = false);
    elSuper && (elSuper.disabled = false);
    elDonate && (elDonate.disabled = false);
  }

  elMeStars && (elMeStars.dataset.v = String(me.starsDonated ?? 0));
  elMeBonus && (elMeBonus.dataset.v = String(me.bonusStars ?? 0));

  elMeStars && (elMeStars.textContent = I18N[LANG].myStars(me.starsDonated ?? 0));
  elMeBonus && (elMeBonus.textContent = I18N[LANG].myBonus(me.bonusStars ?? 0));
  elMeTaps && (elMeTaps.textContent = I18N[LANG].myTaps(tapsToday, tapsLimit));
  elProg && (elProg.textContent = I18N[LANG].progress(tapsToday, tapsLimit));
  elMeLevel && (elMeLevel.textContent = I18N[LANG].levelLine(lastLevel, lastXP, nextLevelAt(lastLevel)));

  if (me.justGotDailyBonus) {
    toast(I18N[LANG].dailyBonusToast);
    setTimeout(fetchState, 1500);
  }
}

// ==== Leaders ====
async function fetchLeaders() {
  const j = await apiGet("/api/leaderboard");
  if (!j?.ok || !Array.isArray(j.top)) return;
  const t = I18N[LANG];
  elLeaders && (elLeaders.innerHTML = "");
  j.top.slice(0, 20).forEach((u, i) => {
    const li = document.createElement("div");
    li.className = "leader-row";
    const rank = i + 1;
    const name =
      u.displayName || u.username || (u.userId === USER_ID ? t.you : `Player ${u.userId?.slice(-4) || ""}`);
    const points = u.points ?? (u.starsDonated ? u.starsDonated * 2 : 0);
    li.textContent = `${rank}. ${name} — ${points} pts`;
    elLeaders && elLeaders.appendChild(li);
  });
}

// ==== Teams ====
async function selectTeam(team) {
  const j = await apiPost("/api/select-team", { userId: USER_ID, team });
  if (j.ok) {
    TEAM = team;
    elTeamChooser && (elTeamChooser.style.display = "none");
    elTap && (elTap.disabled = false);
    elSuper && (elSuper.disabled = false);
    elDonate && (elDonate.disabled = false);
    elRefInput && (elRefInput.value = buildRefLink(USER_ID));
    await Promise.all([fetchState(), fetchMe()]);
  }
}
elChooseIL && (elChooseIL.onclick = () => selectTeam("israel"));
elChooseGA && (elChooseGA.onclick = () => selectTeam("gaza"));

elSwitch && (elSwitch.onclick = async () => {
  if (!TEAM) return toast(I18N[LANG].mustChoose);
  if (!confirm(I18N[LANG].confirmSwitch)) return;
  const newTeam = TEAM === "israel" ? "gaza" : "israel";
  const j = await apiPost("/api/switch-team", { userId: USER_ID, newTeam });
  if (j.ok) {
    TEAM = newTeam;
    toast(I18N[LANG].switched);
    await Promise.all([fetchState(), fetchMe(), fetchLeaders()]);
  }
});

// ==== Tap & Super ====
elTap && (elTap.onclick = async () => {
  if (!TEAM) return toast(I18N[LANG].mustChoose);
  const j = await apiPost("/api/tap", { userId: USER_ID });
  if (j.ok) {
    await Promise.all([fetchState(), fetchMe(), fetchLeaders()]);
  } else if (j.error === "limit") {
    toast("הגעת למגבלת הטאפים היומית");
  }
});

elSuper && (elSuper.onclick = async () => {
  if (!TEAM) return toast(I18N[LANG].mustChoose);
  const j = await apiPost("/api/super", { userId: USER_ID });
  if (j.ok) {
    await Promise.all([fetchState(), fetchMe(), fetchLeaders()]);
  } else if (j.error === "limit") {
    toast("השתמשת כבר בסופר-בוסט היום");
  }
});

// ==== Donate (Stars) ====
// ✅ גרסה מתוקנת עובדת גם באייפון
async function openInvoice(url) {
  try {
    if (window.Telegram?.WebApp?.openInvoice) {
      const status = await Telegram.WebApp.openInvoice(url);
      if (status === "paid" || status === "pending") return true;
      throw new Error(status || "failed");
    }
  } catch (e) {
    console.warn("openInvoice error:", e.message);
  }
  window.location.href = url; // fallback חובה באייפון
  return true;
}

elDonate && (elDonate.onclick = async () => {
  if (!TEAM) return toast(I18N[LANG].mustChoose);
  const stars = Math.max(1, parseInt(elStars?.value || "1", 10));
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
      toast("התשלום בוטל או נכשל");
    }
  } else toast("שגיאה ביצירת חשבונית");
});

// ==== Copy & Share ====
elRefInput && (elRefInput.value = buildRefLink(USER_ID));
elCopy && (elCopy.onclick = async () => {
  try { await navigator.clipboard.writeText(elRefInput.value); toast(I18N[LANG].toastCopy); }
  catch { toast("לא הצלחתי להעתיק"); }
});
elShare && (elShare.onclick = () => {
  const link = buildRefLink(USER_ID);
  const url = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent("בואו לשחק איתי ב-TeamBattle!")}`;
  window.open(url, "_blank");
});

// ==== Init ====
applyLangTexts();
fetchState();
fetchMe();
fetchLeaders();
setInterval(fetchState, 10000);
setInterval(fetchLeaders, 15000);
