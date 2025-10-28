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

let LANG = "he";
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

// fallback if not in Telegram
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
    elScoreIL.textContent = j.scores.israel ?? 0;
    elScoreGA.textContent = j.scores.gaza ?? 0;
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
    elTeamChooser.style.display = "none";
    elTap.disabled = elSuper.disabled = elDonate.disabled = false;
  }

  elMeStars.textContent = I18N[LANG].myStars(me.starsDonated ?? 0);
  elMeBonus.textContent = I18N[LANG].myBonus(me.bonusStars ?? 0);
  elMeTaps.textContent = I18N[LANG].myTaps(tapsToday, tapsLimit);
  elProg.textContent = I18N[LANG].progress(tapsToday, tapsLimit);
}

async function fetchLeaders() {
  const j = await apiGet("/api/leaderboard");
  if (!j?.ok || !Array.isArray(j.top)) return;
  const t = I18N[LANG];
  elLeaders.innerHTML = "";
  j.top.slice(0, 20).forEach((u, i) => {
    const li = document.createElement("div");
    li.className = "leader-row";
    const rank = i + 1;
    const name =
      u.displayName || u.username || (u.userId === USER_ID ? t.you : `Player ${u.userId?.slice(-4)}`);
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
    elTeamChooser.style.display = "none";
    elTap.disabled = elSuper.disabled = elDonate.disabled = false;
    elRefInput.value = buildRefLink(USER_ID);
    fetchState();
    fetchMe();
  }
}
elChooseIL.onclick = () => selectTeam("israel");
elChooseGA.onclick = () => selectTeam("gaza");

// ==== Tap ====
elTap.onclick = async () => {
  if (!TEAM) return toast(I18N[LANG].mustChoose);
  const j = await apiPost("/api/tap", { userId: USER_ID });
  if (j.ok) {
    fetchState();
    fetchMe();
    fetchLeaders();
  } else if (j.error === "limit") toast("הגעת למגבלת הטאפים היומית");
};

// ==== Super Boost ====
elSuper.onclick = async () => {
  if (!TEAM) return toast(I18N[LANG].mustChoose);
  const j = await apiPost("/api/super", { userId: USER_ID });
  if (j.ok) {
    fetchState();
    fetchMe();
    fetchLeaders();
  } else if (j.error === "limit") toast("השתמשת כבר בסופר-בוסט היום");
};

// ==== Donation ====
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

elDonate.onclick = async () => {
  if (!TEAM) return toast(I18N[LANG].mustChoose);
  const stars = Math.max(1, parseInt(elStars?.value || "1", 10));
  const j = await apiPost("/api/create-invoice", { userId: USER_ID, team: TEAM, stars });
  if (j?.ok && j.url) {
    try {
      await openInvoice(j.url);
      setTimeout(() => { fetchState(); fetchMe(); fetchLeaders(); }, 3000);
    } catch {
      toast("התשלום בוטל או נכשל");
    }
  } else toast("שגיאה ביצירת חשבונית");
};

// ==== Init ====
applyLangTexts();
fetchState();
fetchMe();
fetchLeaders();
setInterval(fetchState, 10000);
setInterval(fetchLeaders, 15000);
