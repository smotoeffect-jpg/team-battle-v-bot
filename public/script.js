const tg = window.Telegram.WebApp;
tg.expand();

const state = {
  userId: tg.initDataUnsafe?.user?.id,
  team: "israel",
  lang: "he",
  dailyLimit: 300,
  tapsToday: 0
};

const T = {
  he: {
    tap: "(1+) טאפ להגברה",
    sboost: "(25+) סופר-בוסט",
    donate: amt => `תרום כוכבים להגברה (${amt}⭐)`,
    joined: team => `System: joined Team ${team==='israel'?'Israel':'Gaza'}`
  },
  en: {
    tap: "Tap to boost (1+)",
    sboost: "Super-Boost (25+)",
    donate: amt => `Donate Stars (${amt}⭐)`,
    joined: team => `System: joined Team ${team==='israel'?'Israel':'Gaza'}`
  },
  ar: {
    tap: "اضغط للتعزيز (1+)",
    sboost: "سوبر بوست (25+)",
    donate: amt => `تبرع نجوم (${amt}⭐)`,
    joined: team => `System: joined Team ${team==='israel'?'Israel':'Gaza'}`
  }
};

const elScoreIL = document.getElementById("scoreIL");
const elScoreGA = document.getElementById("scoreGA");
const elTap = document.getElementById("btnTap");
const elBoost = document.getElementById("btnBoost");
const elStars = document.getElementById("btnStars");
const elStarsAmt = document.getElementById("starsAmount");
const elFeed = document.getElementById("feed");
const elTapInfo = document.getElementById("tapInfo");
const elLangBtn = document.getElementById("btnLang");
const elLangMenu = document.getElementById("langMenu");
const elLangLabel = document.getElementById("langLabel");

// init language on UI
function applyLang(){
  const L = T[state.lang];
  elTap.textContent = L.tap;
  elBoost.textContent = L.sboost;
  elStars.textContent = L.donate(Number(elStarsAmt.value||5));
  elLangLabel.textContent = state.lang==="he" ? "עברית" : state.lang==="en" ? "English" : "العربية";
}
applyLang();

elLangBtn.onclick = ()=> elLangMenu.classList.toggle("hidden");
elLangMenu.querySelectorAll("button").forEach(b=>{
  b.onclick = async ()=>{
    state.lang = b.dataset.lang;
    applyLang();
    elLangMenu.classList.add("hidden");
    // עדכן בשרת את השפה
    await fetch("/api/set-lang", { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ userId: state.userId, lang: state.lang })});
  };
});

elStarsAmt.addEventListener("input", ()=> applyLang());

// קובע צד כברירת מחדל לפי שפת מערכת (אפשר לשנות אם צריך)
state.team = "israel";

// הצטרפות
(async function join(){
  // ref מה-deeplink של ה-WebApp אם עבר דרך start? (לא חובה)
  const params = new URLSearchParams(window.location.search);
  const ref = params.get("ref") || null;

  await fetch("/api/join", {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({ userId: state.userId, team: state.team, ref })
  });
})();

// משיכת מצב
async function loadState(){
  const j = await fetch("/api/state").then(r=>r.json());
  elScoreIL.textContent = j.scores.israel || 0;
  elScoreGA.textContent = j.scores.gaza || 0;
  elFeed.innerHTML = j.feed.map(f=>`<div class="row">${new Date(f.at).toLocaleTimeString()} — ${f.text}</div>`).join("");
  state.dailyLimit = j.dailyLimit;
}
loadState();

elTap.onclick = async ()=>{
  const res = await fetch("/api/tap", {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({ userId: state.userId })
  }).then(r=>r.json());

  if (!res.ok && res.reason==="limit") {
    elTapInfo.textContent = `הגעת למכסה היומית (${res.dailyLimit}). נסה מחר.`;
    return;
  }

  elScoreIL.textContent = res.scores.israel;
  elScoreGA.textContent = res.scores.gaza;
  elTapInfo.textContent = `+1 הועלה!`;
};

elBoost.onclick = async ()=>{
  const res = await fetch("/api/super-boost", {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({ userId: state.userId })
  }).then(r=>r.json());

  if (!res.ok && res.reason==="cooldown") {
    elTapInfo.textContent = `סופר-בוסט זמין שוב ב-${new Date(res.nextAt).toLocaleTimeString()}`;
    return;
  }
  elScoreIL.textContent = res.scores.israel;
  elScoreGA.textContent = res.scores.gaza;
  elTapInfo.textContent = `⚡ +25 הוספו!`;
};

// כוכבים (Star Payments)
elStars.onclick = async ()=>{
  const stars = Number(elStarsAmt.value || 5);
  const j = await fetch("/api/create-invoice", {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({ userId: state.userId, stars })
  }).then(r=>r.json());

  if (j.ok && j.link) {
    // פותח את חלון התשלום הרשמי של טלגרם
    tg.openInvoice(j.link, (status)=>{
      console.log("invoice status:", status);
      if (status === "paid") loadState();
    });
  } else {
    tg.showAlert("שגיאה ביצירת בקשת תשלום");
  }
};
