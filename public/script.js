// ===== Client config =====
const API_BASE = ""; // רץ על אותו דומיין (Render) => /api
const BOT_USERNAME = "TeamBattle_vBot"; // ← עדכן לשם המדויק של הבוט שלך

// ==== I18N ====
const I18N = {
  he: {
    israel: "🇮🇱 ישראל",
    gaza: "🇵🇸 עזה",
    tap: "טאפ להגברה (+1)",
    super: "סופר-בוסט (+25)",
    rules:
      "⭐ 1 = 2 נקודות • 💥 מגבלה 300 טאפים ביום • ⚡ סופר-בוסט: +25 פעם ביום",
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
  },
  en: {
    israel: "🇮🇱 Israel",
    gaza: "🇵🇸 Gaza",
    tap: "Tap (+1)",
    super: "Super Boost (+25)",
    rules:
      "⭐ 1 = 2 pts • 💥 300 taps/day • ⚡ Super Boost: +25 once/day",
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
  },
  ar: {
    israel: "🇮🇱 إسرائيل",
    gaza: "🇵🇸 غزة",
    tap: "نقرة تعزيز (+1)",
    super: "تعزيز سوبر (+25)",
    rules:
      "⭐ 1 = نقطتان • 💥 ٣٠٠ نقرة/يوم • ⚡ سوبر: +25 مرة/يوم",
    chooseIL: "انضم لفريق إسرائيل 🇮🇱",
    chooseGA: "انضم لفريق غزة 🇵🇸",
    donate: "تبرع بالنجوم",
    progress: (x, m) => `${x} / ${m} نقرات اليوم`,
    toastCopy: "تم نسخ الرابط",
    mustChoose: "اختر فريقًا أولًا",
    confirmSwitch: "هل تريد تغيير الفريق؟",
    you: "أنت",
    myPanel: "لوحتي",
    myStars: (n) => `⭐ النجوم التي تبرعت بها: ${n}`,
    myBonus: (n) => `🎁 مكافأة الإحالة: ${n}⭐`,
    myTaps: (x, m) => `👆 نقرات اليوم: ${x}/${m}`,
    share: "📤 شارك على تيليجرام",
    leaders: "اللاعبون المتصدرون",
  },
};

// ==== Shortcuts ====
const qs  = (s) => document.querySelector(s);
const qsa = (s) => Array.from(document.querySelectorAll(s));

// ==== Elements we use ====
const elScoreIL   = qs("#score-israel");
const elScoreGA   = qs("#score-gaza");
const elTap       = qs("#tap-btn");
const elSuper     = qs("#super-btn");
const elRules     = qs("#rules");
const elProg      = qs("#progress-text");
const elDonate    = qs("#donate-btn");
const elStars     = qs("#stars");
const elChooseIL  = qs("#choose-israel");
const elChooseGA  = qs("#choose-gaza");
const elRefInput  = qs("#ref-link");
const elCopy      = qs("#copy-link");
const elShare     = qs("#share-btn");
const elToast     = qs("#toast");
const elSwitch    = qs("#switch-team");
const elMeStars   = qs("#me-stars");
const elMeBonus   = qs("#me-bonus");
const elMeTaps    = qs("#me-taps");
const elLeaders   = qs("#leaderboard"); // קונטיינר לרשימת המובילים
const elTeamChooser = qs("#team-chooser");

let LANG = "he";
let USER_ID = null;
let TEAM    = null;
let tapsToday = 0;
let tapsLimit = 300;

// ==== Telegram WebApp init (if inside Telegram) ====
try {
  if (window.Telegram && Telegram.WebApp) {
    Telegram.WebApp.ready();
    const unsafe = Telegram.WebApp.initDataUnsafe || {};
    USER_ID = unsafe.user?.id ? String(unsafe.user.id) : null;
  }
} catch (_) {}

// Fallback user id (for web testing)
if (!USER_ID) {
  USER_ID = localStorage.getItem("tb_user_id");
  if (!USER_ID) {
    USER_ID = String(Math.floor(Math.random() * 1e12));
    localStorage.setItem("tb_user_id", USER_ID);
  }
}

// Build referral link
function buildRefLink(uid = USER_ID) {
  return `https://t.me/${BOT_USERNAME}?start=ref_${uid}`;
}

// Toast helper
function toast(msg) {
  if (!elToast) { alert(msg); return; }
  elToast.textContent = msg;
  elToast.hidden = false;
  setTimeout(() => (elToast.hidden = true), 1600);
}

// ==== Language handling ====
function applyLangTexts() {
  const t = I18N[LANG];
  qs("#team-israel") && (qs("#team-israel").textContent = t.israel);
  qs("#team-gaza")   && (qs("#team-gaza").textContent   = t.gaza);
  elTap     && (elTap.textContent   = t.tap);
  elSuper   && (elSuper.textContent = t.super);
  elRules   && (elRules.textContent = t.rules);
  elChooseIL&& (elChooseIL.textContent = t.chooseIL);
  elChooseGA&& (elChooseGA.textContent = t.chooseGA);
  elDonate  && (elDonate.textContent   = t.donate);
  elProg    && (elProg.textContent     = t.progress(tapsToday, tapsLimit));
  elShare   && (elShare.textContent    = t.share);
  qs("#leaders-title") && (qs("#leaders-title").textContent = t.leaders);
  qs("#my-panel-title") && (qs("#my-panel-title").textContent = t.myPanel);
}
qsa(".lang-buttons button").forEach((b) =>
  b.addEventListener("click", () => {
    LANG = b.dataset.lang;
    applyLangTexts();
  })
);

// ==== API helpers ====
async function apiGet(path) {
  const r = await fetch(`${API_BASE}${path}`);
  return r.json().catch(() => ({}));
}
async function apiPost(path, body) {
  const r = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body || {}),
  });
  return r.json().catch(() => ({}));
}

// ==== State ====
async function fetchState() {
  const j = await apiGet("/api/state");
  if (j?.ok && j.scores) {
    if (elScoreIL) elScoreIL.textContent = j.scores.israel ?? 0;
    if (elScoreGA) elScoreGA.textContent = j.scores.gaza ?? 0;
  }
}
fetchState();
setInterval(fetchState, 10000); // רענון כל 10 שניות

// ==== My panel ====
async function fetchMe() {
  const j = await apiGet(`/api/me?userId=${encodeURIComponent(USER_ID)}`);
  if (!j?.ok || !j.me) {
    // אם ה־API לא קיים עדיין – רק מסתירים את הבלוק (לא שובר כלום)
    if (elMeStars) elMeStars.parentElement.style.display = "none";
    if (elMeBonus) elMeBonus.parentElement.style.display = "none";
    if (elMeTaps)  elMeTaps.parentElement.style.display  = "none";
    return;
  }
  const me = j.me;
  TEAM = me.team || TEAM;
  tapsToday = me.tapsToday ?? tapsToday;
  tapsLimit = j.limit ?? tapsLimit;

  // הפעלת כפתורים אם נבחרה קבוצה
  if (TEAM) {
    elTeamChooser && (elTeamChooser.style.display = "none");
    elTap   && (elTap.disabled = false);
    elSuper && (elSuper.disabled = false);
    elDonate&& (elDonate.disabled = false);
  }

  // עדכון תצוגת “הלוח שלי”
  if (elMeStars) elMeStars.textContent = I18N[LANG].myStars(me.starsDonated ?? 0);
  if (elMeBonus) elMeBonus.textContent = I18N[LANG].myBonus(me.bonusStars ?? 0);
  if (elMeTaps)  elMeTaps.textContent  = I18N[LANG].myTaps(tapsToday, tapsLimit);
  if (elProg)    elProg.textContent    = I18N[LANG].progress(tapsToday, tapsLimit);
}
fetchMe();

// ==== Leaderboard ====
async function fetchLeaders() {
  if (!elLeaders) return;
  const j = await apiGet("/api/leaderboard");
  if (!j?.ok || !Array.isArray(j.top)) {
    // אם אין API – מסתירים
    elLeaders.parentElement && (elLeaders.parentElement.style.display = "none");
    return;
  }
  const t = I18N[LANG];
  elLeaders.innerHTML = "";
  j.top.slice(0, 20).forEach((u, i) => {
    const li = document.createElement("div");
    li.className = "leader-row";
    const rank = i + 1;
    const name =
      u.displayName ||
      u.username ||
      (u.userId === USER_ID ? t.you : `Player ${u.userId?.slice(-4) || ""}`);
    const points = u.points ?? (u.starsDonated ? u.starsDonated * 2 : 0);
    li.textContent = `${rank}. ${name} — ${points} pts`;
    elLeaders.appendChild(li);
  });
}
fetchLeaders();
setInterval(fetchLeaders, 15000);

// ==== Team selection ====
async function selectTeam(team) {
  const j = await apiPost("/api/select-team", {
    userId: USER_ID,
    team,
  });
  if (j.ok) {
    TEAM = team;
    if (elTeamChooser) elTeamChooser.style.display = "none";
    elTap   && (elTap.disabled = false);
    elSuper && (elSuper.disabled = false);
    elDonate&& (elDonate.disabled = false);
    elRefInput && (elRefInput.value = buildRefLink(USER_ID));
    fetchState();
    fetchMe();
  }
}
elChooseIL && (elChooseIL.onclick = () => selectTeam("israel"));
elChooseGA && (elChooseGA.onclick = () => selectTeam("gaza"));

// ==== Switch team ====
elSwitch && (elSwitch.onclick = async () => {
  if (!TEAM) return toast(I18N[LANG].mustChoose);
  if (!confirm(I18N[LANG].confirmSwitch)) return;
  const newTeam = TEAM === "israel" ? "gaza" : "israel";
  await selectTeam(newTeam);
});

// ==== Tap ====
elTap && (elTap.onclick = async () => {
  if (!TEAM) return toast(I18N[LANG].mustChoose);
  const j = await apiPost("/api/tap", { userId: USER_ID });
  if (!j.ok && j.error === "limit") {
    tapsToday = j.limit;
    tapsLimit = j.limit;
    elProg && (elProg.textContent = I18N[LANG].progress(tapsToday, tapsLimit));
    elTap.disabled = true;
    return;
  }
  if (j.ok) {
    tapsToday = j.tapsToday ?? tapsToday + 1;
    tapsLimit = j.limit ?? tapsLimit;
    elProg && (elProg.textContent = I18N[LANG].progress(tapsToday, tapsLimit));
    elScoreIL && (elScoreIL.textContent = j.scores.israel ?? 0);
    elScoreGA && (elScoreGA.textContent = j.scores.gaza ?? 0);
    fetchLeaders();
    fetchMe();
  }
});

// ==== Super boost ====
elSuper && (elSuper.onclick = async () => {
  if (!TEAM) return toast(I18N[LANG].mustChoose);
  const j = await apiPost("/api/super", { userId: USER_ID });
  if (!j.ok && j.error === "limit") {
    toast("כבר השתמשת בסופר-בוסט להיום");
    elSuper.disabled = true;
    return;
  }
  if (j.ok) {
    elScoreIL && (elScoreIL.textContent = j.scores.israel ?? 0);
    elScoreGA && (elScoreGA.textContent = j.scores.gaza ?? 0);
    fetchLeaders();
    fetchMe();
  }
});

// ==== True Stars (XTR) donation ====
async function openInvoice(url) {
  // ניסיון לפתוח דרך WebApp (מובטח לפתוח פופאפ בתמיכה מלאה)
  try {
    if (window.Telegram?.WebApp?.openInvoice) {
      // callback-style של טלגרם
      await new Promise((resolve, reject) => {
        try {
          Telegram.WebApp.openInvoice(url, (status) => {
            // status: "paid" | "cancelled" | "failed" | "pending"
            if (status === "paid" || status === "pending") resolve();
            else reject(new Error(status || "failed"));
          });
        } catch (err) { reject(err); }
      });
      return true;
    }
  } catch (_) {}
  // fallback לדפדפן רגיל
  window.open(url, "_blank");
  return true;
}

elDonate && (elDonate.onclick = async () => {
  if (!TEAM) return toast(I18N[LANG].mustChoose);
  const stars = Math.max(1, parseInt(elStars?.value || "1", 10));
  const j = await apiPost("/api/create-invoice", {
    userId: USER_ID,
    team: TEAM,
    stars,
  });
  if (j?.ok && j.url) {
    try {
      await openInvoice(j.url);
      // לאחר תשלום, השרת יעדכן דרך webhook. נרענן אחרי כמה שניות:
      setTimeout(() => {
        fetchState();
        fetchMe();
        fetchLeaders();
      }, 3000);
    } catch {
      toast("התשלום בוטל/נכשל");
    }
  } else {
    toast("שגיאה ביצירת חשבונית");
  }
});

// ==== Referral link (copy + share) ====
if (elRefInput) elRefInput.value = buildRefLink(USER_ID);

elCopy && (elCopy.onclick = async () => {
  try {
    await navigator.clipboard.writeText(elRefInput.value);
    toast(I18N[LANG].toastCopy);
  } catch {
    toast("לא הצלחתי להעתיק, נסה ידנית");
  }
});

elShare && (elShare.onclick = async () => {
  const link = buildRefLink(USER_ID);
  // אם בתוך טלגרם – נפתח intent לשיתוף
  const url = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent("בואו לשחק איתי ב-TeamBattle!")}`;
  window.open(url, "_blank");
});

// ==== Default language on load ====
applyLangTexts();
