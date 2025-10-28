// i18n
const L = {
  he: {
    title: "TeamBattle - Israel Vs Gaza",
    il: "ישראל", ga: "עזה",
    boost: "(1+) טאפ להגברה",
    super: "(25+) סופר-בוסט",
    donateBtn: (n)=>`תרום כוכבים להגברה (${n} ⭐)`,
    willGive: "זה ייתן לצוות שלך 10 נקודות",
    news: "הודעות קרב:",
    lang: "עברית"
  },
  en: {
    title: "TeamBattle - Israel Vs Gaza",
    il: "Israel", ga: "Gaza",
    boost: "Tap to boost (+1)",
    super: "Super Boost (+25)",
    donateBtn: (n)=>`Donate Stars (${n} ⭐)`,
    willGive: "This will give your team 10 points",
    news: "Battle Feed:",
    lang: "English"
  },
  ar: {
    title: "TeamBattle - Israel Vs غزة",
    il: "إسرائيل", ga: "غزة",
    boost: "تعزيز بلمسة (+1)",
    super: "تعزيز فائق (+25)",
    donateBtn: (n)=>`تبرع بالنجوم (${n} ⭐)`,
    willGive: "سيمنح فريقك 10 نقاط",
    news: "أخبار المعركة:",
    lang: "العربية"
  }
};

const qs = (s)=>document.querySelector(s);
const scoreIL = qs("#scoreIL");
const scoreGA = qs("#scoreGA");
const btnBoost = qs("#btnBoost");
const btnSuper = qs("#btnSuper");
const btnDonate = qs("#btnDonate");
const donStars = qs("#donStars");
const title = qs("#title");
const nameIL = qs("#nameIL");
const nameGA = qs("#nameGA");
const dailyNote = qs("#dailyNote");
const newsTitle = qs("#newsTitle");
const newsList = qs("#news");
const langBtn = qs("#btnLang");
const langMenu = qs("#langMenu");
const langLabel = qs("#langLabel");

let lang = localStorage.getItem("tb_lang") || "he";
let team = localStorage.getItem("tb_team") || "israel"; // ברירת מחדל

function setLang(l) {
  lang = l; localStorage.setItem("tb_lang", l);
  const t = L[l];
  title.textContent = t.title;
  nameIL.textContent = t.il;
  nameGA.textContent = t.ga;
  btnBoost.textContent = t.boost;
  btnSuper.textContent = t.super;
  btnDonate.textContent = t.donateBtn(donStars.value);
  dailyNote.textContent = t.willGive;
  newsTitle.textContent = t.news;
  langLabel.textContent = t.lang;
}

donStars.addEventListener("input", ()=> {
  const n = Math.max(1, parseInt(donStars.value || "1", 10));
  donStars.value = n;
  btnDonate.textContent = L[lang].donateBtn(n);
});

langBtn.addEventListener("click", ()=> langMenu.classList.toggle("hidden"));
langMenu.querySelectorAll("div").forEach(el=>{
  el.addEventListener("click", ()=>{
    setLang(el.dataset.lang);
    langMenu.classList.add("hidden");
  });
});

async function loadState() {
  const r = await fetch("/api/state");
  const j = await r.json();
  if (j.ok) {
    scoreIL.textContent = j.teams.israel;
    scoreGA.textContent = j.teams.gaza;
    newsList.innerHTML = "";
    (j.announcements || []).forEach(a=>{
      const li = document.createElement("li");
      li.textContent = (lang==="he"?a.text_he:lang==="en"?a.text_en:a.text_ar) || "";
      newsList.appendChild(li);
    });
  }
}

function getUserId() {
  // אם זה בתוך טלגרם, נשתמש ב-initDataUnsafe; אחרת אנונימי
  try {
    const tg = window.Telegram?.WebApp;
    const id = tg?.initDataUnsafe?.user?.id;
    return id || "anon";
  } catch { return "anon"; }
}

async function tap(type) {
  const userId = getUserId();
  const r = await fetch("/api/tap", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ team, type, userId })
  });
  const j = await r.json();
  if (j.ok) {
    scoreIL.textContent = j.teams.israel;
    scoreGA.textContent = j.teams.gaza;
  }
}

// UI actions
btnBoost.addEventListener("click", ()=> tap("free"));
btnSuper.addEventListener("click", ()=> tap("super"));
btnDonate.addEventListener("click", ()=> tap("super")); // דמו: כוכבים = סופר־בוסט

// choose side (פשוט: לפי שפה כברירת מחדל — אפשר להרחיב ללחצני בחירה)
team = (lang==="ar") ? "gaza" : "israel";
localStorage.setItem("tb_team", team);

setLang(lang);
loadState();

// התאמה ל־Telegram WebApp
try { Telegram.WebApp.ready(); Telegram.WebApp.expand(); } catch {}
