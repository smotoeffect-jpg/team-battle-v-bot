// ===== Client config =====
const API_BASE = ""; // באותו דומיין (Render) /api
const BOT_USERNAME = "@TeamBattle_vBot"; // <-- לעדכן לשם המדויק של הבוט שלך

// שפות
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
  },
  en: {
    israel: "🇮🇱 Israel",
    gaza: "🇵🇸 Gaza",
    tap: "Tap (+1)",
    super: "Super Boost (+25)",
    rules: "⭐ 1 = 2 pts • 💥 limit 300 taps/day • ⚡ Super Boost: +25 once/day",
    chooseIL: "Join Team Israel 🇮🇱",
    chooseGA: "Join Team Gaza 🇵🇸",
    donate: "Donate Stars",
    progress: (x, m) => `${x} / ${m} taps today`,
    toastCopy: "Link copied",
    mustChoose: "Pick a team first",
  },
  ar: {
    israel: "🇮🇱 إسرائيل",
    gaza: "🇵🇸 غزة",
    tap: "نقرة تعزيز (+1)",
    super: "تعزيز سوبر (+25)",
    rules: "⭐ 1 = نقطتان • 💥 حد 300 نقرة/يوم • ⚡ سوبر: +25 مرة/يوم",
    chooseIL: "انضم لفريق إسرائيل 🇮🇱",
    chooseGA: "انضم لفريق غزة 🇵🇸",
    donate: "تبرع بالنجوم",
    progress: (x, m) => `${x} / ${m} نقرات اليوم`,
    toastCopy: "تم نسخ الرابط",
    mustChoose: "اختر فريقًا أولًا",
  },
};

let LANG = "he";
const qs = (s) => document.querySelector(s);
const qsa = (s) => Array.from(document.querySelectorAll(s));

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
const elToast = qs("#toast");

let USER_ID = null;
let TEAM = null;
let tapsToday = 0;
let tapsLimit = 300;

// Telegram WebApp init (אם רץ בתוך טלגרם)
try {
  if (window.Telegram && Telegram.WebApp) {
    Telegram.WebApp.ready();
    const unsafe = Telegram.WebApp.initDataUnsafe || {};
    USER_ID = unsafe.user?.id ? String(unsafe.user.id) : null;

    // קבלת רפרל מתוך start_param (אם נכנסו מהמיני-אפ ישירות זה לא תמיד קיים, אבל שרתי הבוט מטפלים ב-/start)
    const ref = unsafe.start_param || null;
    if (ref && ref.startsWith("ref_")) {
      // נשמר בצד לשרת, הטמעה בצד השרת דרך /start כבר נעשית
      // (בקליינט לא צריך לעשות דבר מיוחד פה)
    }
  }
} catch (_) {}

// Fallback: אם לא בתוך טלגרם – נשתמש ב-localStorage לזיהוי
if (!USER_ID) {
  USER_ID = localStorage.getItem("tb_user_id");
  if (!USER_ID) {
    USER_ID = String(Math.floor(Math.random() * 1e12));
    localStorage.setItem("tb_user_id", USER_ID);
  }
}

// קישור רפרל
function buildRefLink(uid = USER_ID) {
  return `https://t.me/${BOT_USERNAME}?start=ref_${uid}`;
}

// טוסט קצר
function toast(msg) {
  elToast.textContent = msg;
  elToast.hidden = false;
  setTimeout(() => (elToast.hidden = true), 1600);
}

// שינוי שפה
function setLang(l) {
  LANG = l;
  qs("#team-israel").textContent = I18N[LANG].israel;
  qs("#team-gaza").textContent = I18N[LANG].gaza;
  elTap.textContent = I18N[LANG].tap;
  elSuper.textContent = I18N[LANG].super;
  elRules.textContent = I18N[LANG].rules;
  elChooseIL.textContent = I18N[LANG].chooseIL;
  elChooseGA.textContent = I18N[LANG].chooseGA;
  elDonate.textContent = I18N[LANG].donate;
  elProg.textContent = I18N[LANG].progress(tapsToday, tapsLimit);
}
qsa(".lang-buttons button").forEach((b) =>
  b.addEventListener("click", () => setLang(b.dataset.lang))
);

// סטייט התחלתי
async function fetchState() {
  const r = await fetch("/api/state");
  const j = await r.json();
  if (j.ok) {
    elScoreIL.textContent = j.scores.israel ?? 0;
    elScoreGA.textContent = j.scores.gaza ?? 0;
  }
}
fetchState();

// בחירת קבוצה
async function selectTeam(team) {
  const r = await fetch("/api/select-team", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: USER_ID, team }),
  });
  const j = await r.json();
  if (j.ok) {
    TEAM = team;
    elTap.disabled = false;
    elSuper.disabled = false;
    elDonate.disabled = false;
    qs("#team-chooser").style.display = "none";
    elRefInput.value = buildRefLink(USER_ID);
  }
}
elChooseIL.onclick = () => selectTeam("israel");
elChooseGA.onclick = () => selectTeam("gaza");

// טאפ רגיל
elTap.onclick = async () => {
  if (!TEAM) return toast(I18N[LANG].mustChoose);
  const r = await fetch("/api/tap", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: USER_ID }),
  });
  const j = await r.json();
  if (!j.ok && j.error === "limit") {
    tapsToday = j.limit;
    elProg.textContent = I18N[LANG].progress(tapsToday, j.limit);
    elTap.disabled = true;
    return;
  }
  if (j.ok) {
    tapsToday = j.tapsToday;
    tapsLimit = j.limit;
    elProg.textContent = I18N[LANG].progress(tapsToday, tapsLimit);
    elScoreIL.textContent = j.scores.israel ?? 0;
    elScoreGA.textContent = j.scores.gaza ?? 0;
  }
};

// סופר-בוסט
elSuper.onclick = async () => {
  if (!TEAM) return toast(I18N[LANG].mustChoose);
  const r = await fetch("/api/super", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: USER_ID }),
  });
  const j = await r.json();
  if (!j.ok && j.error === "limit") {
    toast("השתמשת בסופר-בוסט להיום");
    elSuper.disabled = true;
    return;
  }
  if (j.ok) {
    elScoreIL.textContent = j.scores.israel ?? 0;
    elScoreGA.textContent = j.scores.gaza ?? 0;
  }
};

// תרומת כוכבים אמיתית (XTR)
elDonate.onclick = async () => {
  if (!TEAM) return toast(I18N[LANG].mustChoose);
  const stars = Math.max(1, parseInt(elStars.value || "1", 10));
  const r = await fetch("/api/create-invoice", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: USER_ID, team: TEAM, stars }),
  });
  const j = await r.json();
  if (j.ok && j.url) {
    // בטלגרם יש openInvoice; מחוץ לטלגרם נפתח לשונית
    if (window.Telegram?.WebApp?.openInvoice) {
      Telegram.WebApp.openInvoice(j.url);
    } else {
      window.open(j.url, "_blank");
    }
  } else {
    toast("שגיאה ביצירת חשבונית");
  }
};

// העתקת לינק רפרל
elRefInput.value = buildRefLink(USER_ID);
elCopy.onclick = async () => {
  await navigator.clipboard.writeText(elRefInput.value);
  toast(I18N[LANG].toastCopy);
};

// ברירת מחדל שפה
setLang("he");
