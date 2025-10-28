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
  },
  ar: {
    israel: "🇮🇱 إسرائيل",
    gaza: "🇵🇸 غزة",
    tap: "نقرة تعزيز (+1)",
    super: "تعزيز سوبر (+25)",
    rules: "⭐ 1 = نقطتان • 💥 ٣٠٠ نقرة/يوم • ⚡ سوبر: +25 مرة/يوم",
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
    switched: "تم تغيير الفريق ✅",
  },
};

// ==== Shortcuts ====
const qs  = (s) => document.querySelector(s);
const qsa = (s) => Array.from(document.querySelectorAll(s));

// ==== Elements ====
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
const elLeaders   = qs("#leaderboard");
const elTeamChooser = qs("#team-chooser");

let LANG = localStorage.getItem("tb_lang") || "he";
let USER_ID = null;
let TEAM    = null;
let tapsToday = 0;
let tapsLimit = 300;

// ==== Telegram WebApp init ====
try {
  if (window.Telegram && Telegram.WebApp) {
    Telegram.WebApp.ready();
    const unsafe = Telegram.WebApp.initDataUnsafe || {};
    USER_ID = unsafe.user?.id ? String(unsafe.user.id) : null;
  }
} catch (_) {}

// fallback אם לא בטלגרם (או אם ה־WebView מוחק אחסון)
if (!USER_ID) {
  USER_ID = localStorage.getItem("tb_user_id");
  if (!USER_ID) {
    USER_ID = String(Math.floor(Math.random() * 1e12));
    localStorage.setItem("tb_user_id", USER_ID);
  }
}

// ==== Helpers ====
function buildRefLink(uid = USER_ID) {
  return `https://t.me/${BOT_USERNAME}?start=ref_${uid}`;
}
function toast(msg) {
  if (!elToast) { alert(msg); return; }
  elToast.textContent = msg;
  elToast.hidden = false;
  setTimeout(() => (elToast.hidden = true), 1600);
}

// ==== Language ====
function applyLangTexts() {
  const t = I18N[LANG];
  qs("#team-israel") && (qs("#team-israel").textContent = t.israel);
  qs("#team-gaza")   && (qs("#team-gaza").textContent   = t.gaza);
  elTap    && (elTap.textContent    = t.tap);
  elSuper  && (elSuper.textContent  = t.super);
  elRules  && (elRules.textContent  = t.rules);
  elChooseIL && (elChooseIL.textContent = t.chooseIL);
  elChooseGA && (elChooseGA.textContent = t.chooseGA);
  elDonate && (elDonate.textContent = t.donate);
  elProg   && (elProg.textContent   = t.progress(tapsToday, tapsLimit));
  elShare  && (elShare.textContent  = t.share);
  qs("#leaders-title")   && (qs("#leaders-title").textContent   = t.leaders);
  qs("#my-panel-title")  && (qs("#my-panel-title").textContent  = t.myPanel);
  // "הלוח שלי" / "My Panel"
  elMeStars && (elMeStars.textContent = t.myStars(Number(elMeStars.dataset.v || 0)));
  elMeBonus && (elMeBonus.textContent = t.myBonus(Number(elMeBonus.dataset.v || 0)));
  elMeTaps  && (elMeTaps.textContent  = t.myTaps(tapsToday, tapsLimit));
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

// ==== Fetch functions ====
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

  if (TEAM) {
    elTeamChooser && (elTeamChooser.style.display = "none");
    elTap    && (elTap.disabled    = false);
    elSuper  && (elSuper.disabled  = false);
    elDonate && (elDonate.disabled = false);
  }

  // שמירת ערכי מספר בדאטא־אטריביוטים כדי לעדכן טקסט בשינוי שפה
  if (elMeStars) elMeStars.dataset.v = String(me.starsDonated ?? 0);
  if (elMeBonus) elMeBonus.dataset.v = String(me.bonusStars ?? 0);

  elMeStars && (elMeStars.textContent = I18N[LANG].myStars(me.starsDonated ?? 0));
  elMeBonus && (elMeBonus.textContent = I18N[LANG].myBonus(me.bonusStars ?? 0));
  elMeTaps  && (elMeTaps.textContent  = I18N[LANG].myTaps(tapsToday, tapsLimit));
  elProg    && (elProg.textContent    = I18N[LANG].progress(tapsToday, tapsLimit));
}

async function fetchLeaders() {
  if (!elLeaders) return;
  const j = await apiGet("/api/leaderboard");
  if (!j?.ok || !Array.isArray(j.top)) return;
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

// ==== Team ====
async function selectTeam(team) {
  const j = await apiPost("/api/select-team", { userId: USER_ID, team });
  if (j.ok) {
    TEAM = team;
    elTeamChooser && (elTeamChooser.style.display = "none");
    elTap    && (elTap.disabled    = false);
    elSuper  && (elSuper.disabled  = false);
    elDonate && (elDonate.disabled = false);
    elRefInput && (elRefInput.value = buildRefLink(USER_ID));
    await Promise.all([fetchState(), fetchMe()]);
  }
}
elChooseIL && (elChooseIL.onclick = () => selectTeam("israel"));
elChooseGA && (elChooseGA.onclick = () => selectTeam("gaza"));

// ==== Switch team ====
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

// ==== Tap ====
elTap && (elTap.onclick = async () => {
  if (!TEAM) return toast(I18N[LANG].mustChoose);
  const j = await apiPost("/api/tap", { userId: USER_ID });
  if (j.ok) {
    await Promise.all([fetchState(), fetchMe(), fetchLeaders()]);
  } else if (j.error === "limit") {
    toast("הגעת למגבלת הטאפים היומית");
  }
});

// ==== Super Boost ====
elSuper && (elSuper.onclick = async () => {
  if (!TEAM) return toast(I18N[LANG].mustChoose);
  const j = await apiPost("/api/super", { userId: USER_ID });
  if (j.ok) {
    await Promise.all([fetchState(), fetchMe(), fetchLeaders()]);
  } else if (j.error === "limit") {
    toast("השתמשת כבר בסופר-בוסט היום");
  }
});

// ==== Donation (Stars) ====
// שומר בדיוק את ה-flow שעבד לך + Poll קצר אחרי כדי לרענן סטטוסים
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
  } catch (_) {}
  window.open(url, "_blank");
  return true;
}

elDonate && (elDonate.onclick = async () => {
  if (!TEAM) return toast(I18N[LANG].mustChoose);
  const stars = Math.max(1, parseInt(elStars?.value || "1", 10));
  const j = await apiPost("/api/create-invoice", { userId: USER_ID, team: TEAM, stars });
  if (j?.ok && j.url) {
    try {
      await openInvoice(j.url);
      // רענון אחרי מספר שניות + Poll קצר (עד 20 שניות)
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
if (elRefInput) elRefInput.value = buildRefLink(USER_ID);
elCopy && (elCopy.onclick = async () => {
  try { await navigator.clipboard.writeText(elRefInput.value); toast(I18N[LANG].toastCopy); }
  catch { toast("לא הצלחתי להעתיק"); }
});
elShare && (elShare.onclick = async () => {
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
