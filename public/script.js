/* i18n */
const i18n = {
  en: {
    doubleOn: "Double XP Active!",
    doubleOff: "Double XP Off",
    tap: "Tap",
    super: "Super Boost",
    switch: "Switch Team",
    extra: "Extra Tap",
    israel: "Israel",
    gaza: "Gaza",
    myPanel: "My Panel",
    starsExtra: "Stars | Extra Tap",
    playerLevel: "Player Level",
    invited: "Invited",
    tapsToday: "Taps Today",
    top20: "Top 20",
    battleMessages: "Battle Messages",
    partnerTitle: "Partner Program",
    copy: "Copy Link"
  },
  he: {
    doubleOn: "דאבל אקספי פעיל!",
    doubleOff: "דאבל אקספי כבוי",
    tap: "טאפ",
    super: "סופר בוסט",
    switch: "החלף קבוצה",
    extra: "Extra Tap",
    israel: "ישראל",
    gaza: "עזה",
    myPanel: "הלוח שלי",
    starsExtra: "כוכבים | Extra Tap",
    playerLevel: "רמת השחקן",
    invited: "מוזמנים",
    tapsToday: "טאפים היום",
    top20: "טופ 20",
    battleMessages: "הודעות קרב",
    partnerTitle: "תוכנית שותפים",
    copy: "העתק קישור"
  },
  ar: {
    doubleOn: "دابل إكس بي يعمل!",
    doubleOff: "دابل إكس بي متوقف",
    tap: "نقرة",
    super: "تعزيز سوبر",
    switch: "تبديل الفريق",
    extra: "Extra Tap",
    israel: "إسرائيل",
    gaza: "غزة",
    myPanel: "لوحتي",
    starsExtra: "النجوم | Extra Tap",
    playerLevel: "مستوى اللاعب",
    invited: "مدعوون",
    tapsToday: "نقرات اليوم",
    top20: "أفضل 20",
    battleMessages: "رسائل المعركة",
    partnerTitle: "برنامج الشركاء",
    copy: "نسخ الرابط"
  }
};

const state = {
  lang: "en",
  botUsername: "TeamBattle_vBot",
  selectedTeam: "israel", // default, can be toggled
  me: null,
  leaderboard: [],
  scores: { israel: 0, gaza: 0 },
  doubleXP: false
};

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

function t(key){ return i18n[state.lang][key] || key; }

function setLang(lang){
  state.lang = lang;
  // static texts
  $("#tap-btn").textContent = t("tap");
  $("#super-btn").textContent = t("super");
  $("#switch-btn").textContent = t("switch");
  $("#extra-btn").textContent = t("extra");
  $(".partner-title").textContent = t("partnerTitle");
  $("#copy-ref").textContent = t("copy");
  $("[data-i18n='israel']").textContent = t("israel");
  $("[data-i18n='gaza']").textContent = t("gaza");
  $("[data-i18n='myPanel']").textContent = t("myPanel");
  $("[data-i18n='starsExtra']").textContent = t("starsExtra");
  $("[data-i18n='playerLevel']").textContent = t("playerLevel");
  $("[data-i18n='invited']").textContent = t("invited");
  $("[data-i18n='tapsToday']").textContent = t("tapsToday");
  $("[data-i18n='top20']").textContent = t("top20");
  $("[data-i18n='battleMessages']").textContent = t("battleMessages");

  // double xp text
  const dx = $("#double-xp");
  dx.textContent = state.doubleXP ? t("doubleOn") : t("doubleOff");

  // RTL for Arabic / Hebrew
  document.body.dir = (lang === "he" || lang === "ar") ? "rtl" : "ltr";
}

function bindLanguageButtons(){
  $$(".lang-switch .chip").forEach(btn => {
    btn.addEventListener("click", () => {
      $$(".lang-switch .chip").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      setLang(btn.dataset.lang);
    });
  });
  // default active EN
  document.querySelector('.chip[data-lang="en"]').classList.add("active");
}

function initRefLink(){
  const tgui = window.Telegram?.WebApp?.initDataUnsafe;
  const uid = tgui?.user?.id || 0;
  const link = `https://t.me/${state.botUsername}/app?start_param=${uid}`;
  $("#ref-link").value = link;
  $("#copy-ref").onclick = async () => {
    try{
      await navigator.clipboard.writeText(link);
      toast("Copied");
    }catch(e){}
  };
}

function toast(msg){
  const el = document.createElement("div");
  el.textContent = msg;
  el.style.position = "fixed";
  el.style.bottom = "12px";
  el.style.left = "50%";
  el.style.transform = "translateX(-50%)";
  el.style.background = "#1b233b";
  el.style.color = "#fff";
  el.style.padding = "8px 12px";
  el.style.borderRadius = "8px";
  el.style.boxShadow = "0 6px 24px rgba(0,0,0,.35)";
  document.body.appendChild(el);
  setTimeout(()=>el.remove(), 1200);
}

/* API polling */
async function fetchState(){
  try{
    const r = await fetch("/api/state");
    if(!r.ok) return;
    const data = await r.json();
    state.scores = data?.score || state.scores;
    state.doubleXP = !!data?.doubleXP;

    $("#score-israel").textContent = state.scores.israel ?? 0;
    $("#score-gaza").textContent  = state.scores.gaza ?? 0;

    const dx = $("#double-xp");
    dx.classList.toggle("on", state.doubleXP);
    dx.classList.toggle("off", !state.doubleXP);
    dx.textContent = state.doubleXP ? t("doubleOn") : t("doubleOff");
  }catch(e){ /* silent */ }
}

async function fetchMe(){
  try{
    const r = await fetch("/api/me");
    if(!r.ok) return;
    const data = await r.json();
    state.me = data;
    $("#stars-extra").textContent = data?.starsExtra ?? 0;
    $("#player-level").textContent = data?.level ?? 1;
    const invited = data?.invited ?? 0;
    $("#invited-count").textContent = invited;
    const tapsToday = data?.tapsToday ?? 0;
    const maxTaps = data?.maxTaps ?? 300;
    $("#taps-today").textContent = `${tapsToday}/${maxTaps}`;
  }catch(e){}
}

async function fetchLeaderboard(){
  try{
    const r = await fetch("/api/leaderboard");
    if(!r.ok) return;
    const list = await r.json();
    state.leaderboard = Array.isArray(list) ? list.slice(0,20) : [];
    const ol = $("#top-list");
    ol.innerHTML = "";
    state.leaderboard.forEach((entry, i) => {
      const li = document.createElement("li");
      const name = entry?.name || `Player #${i+1}`;
      const pts = entry?.points ?? entry?.score ?? 0;
      li.textContent = `${name} — ${pts}`;
      ol.appendChild(li);
    });
  }catch(e){}
}

/* Actions */
function bindActions(){
  $("#tap-btn").onclick = async () => {
    try{
      const r = await fetch("/api/tap", { method:"POST" });
      if(r.ok){ feed(`+1 ${state.selectedTeam}`); fetchMe(); fetchState(); }
    }catch(e){}
  };
  $("#super-btn").onclick = async () => {
    try{
      const r = await fetch("/api/super", { method:"POST" });
      if(r.ok){ feed(`Super Boost +25`); fetchMe(); fetchState(); }
    }catch(e){}
  };
  $("#switch-btn").onclick = () => {
    state.selectedTeam = (state.selectedTeam === "israel") ? "gaza" : "israel";
    toast(`Team: ${state.selectedTeam}`);
  };
  $("#extra-btn").onclick = async () => {
    const amount = Math.max(1, Math.min(1000, parseInt($("#extra-amount").value||"10")));
    $("#extra-amount").value = amount;
    try{
      const r = await fetch("/api/create-invoice", {
        method:"POST", headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({
          title: "Extra Tap",
          description: "Donate Stars for team boost",
          amount,
          payload: `extra_${Date.now()}`
        })
      });
      const data = await r.json();
      if(data?.ok && data?.url){
        // Open Telegram Stars payment inside the WebApp if possible
        Telegram.WebApp.openInvoice(data.url);
      }else{
        toast("Payment error");
        console.log("create-invoice:", data);
      }
    }catch(e){
      toast("Payment error");
    }
  };
}

function feed(txt){
  const box = $("#feed");
  const item = document.createElement("div");
  item.className = "item";
  const now = new Date().toLocaleTimeString();
  item.textContent = `[${now}] ${txt}`;
  box.appendChild(item);
  box.scrollTop = box.scrollHeight;
}

function init(){
  Telegram.WebApp.ready?.();
  Telegram.WebApp.expand?.();

  bindLanguageButtons();
  setLang("en");
  initRefLink();
  bindActions();

  // initial pulls
  fetchState(); fetchMe(); fetchLeaderboard();
  // polling
  setInterval(fetchState, 5000);
  setInterval(fetchMe, 7000);
  setInterval(fetchLeaderboard, 12000);
}

document.addEventListener("DOMContentLoaded", init);
