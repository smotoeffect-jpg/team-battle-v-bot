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
    partners: "برنامج الشركاء 🤝",
    copyLink: "نسخ الرابط",
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

let LANG = localStorage.getItem("tb_lang") || "he";
let USER_ID = null;
let TEAM = null;
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
  if (!elToast) return alert(msg);
  elToast.textContent = msg;
  elToast.hidden = false;
  setTimeout(() => (elToast.hidden = true), 1600);
}

// ==== Language ====
function applyLangTexts() {
  const t = I18N[LANG];
  qs("#team-israel").textContent = t.israel;
  qs("#team-gaza").textContent = t.gaza;
  elTap.textContent = t.tap;
  elSuper.textContent = t.super;
  elRules.textContent = t.rules;
  elChooseIL.textContent = t.chooseIL;
  elChooseGA.textContent = t.chooseGA;
  elDonate.textContent = t.donate;
  elProg.textContent = t.progress(tapsToday, tapsLimit);
  qs("#leaders-title").textContent = t.leaders;
  qs("#my-panel-title").textContent = t.myPanel;
  qs(".affiliate-title").textContent = t.partners;
  elCopy.textContent = t.copyLink;
  elShare.textContent = t.share;
  elMeStars.textContent = t.myStars(elMeStars.dataset.v || 0);
  elMeBonus.textContent = t.myBonus(elMeBonus.dataset.v || 0);
  elMeTaps.textContent = t.myTaps(tapsToday, tapsLimit);
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

// ==== Donation fixed ====
function openInvoiceWithFallback(url) {
  try {
    if (window.Telegram?.WebApp?.openInvoice) {
      let fallbackTimeout = setTimeout(() => {
        Telegram.WebApp.openTelegramLink(url);
      }, 1500);
      Telegram.WebApp.openInvoice(url, (status) => {
        clearTimeout(fallbackTimeout);
        if (status === "paid" || status === "pending") {
          toast("✅ תודה על התרומה!");
          setTimeout(() => {
            fetchState();
            fetchMe();
            fetchLeaders();
          }, 3000);
        } else if (status === "cancelled") {
          toast("❌ התשלום בוטל");
        } else {
          window.open(url, "_blank");
        }
      });
    } else {
      window.open(url, "_blank");
    }
  } catch (e) {
    console.error("Invoice error:", e);
    window.open(url, "_blank");
  }
}

// ==== Donation button ====
elDonate.onclick = async () => {
  if (!TEAM) return toast(I18N[LANG].mustChoose);
  const stars = Math.max(1, parseInt(elStars?.value || "1", 10));
  const j = await apiPost("/api/create-invoice", { userId: USER_ID, team: TEAM, stars });
  if (j?.ok && j.url) openInvoiceWithFallback(j.url);
  else toast("שגיאה ביצירת חשבונית");
};

// ==== Init ====
applyLangTexts();
fetchState();
fetchMe();
fetchLeaders();
setInterval(fetchState, 10000);
setInterval(fetchLeaders, 15000);
