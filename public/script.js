/* TeamBattle V2.5 — Full script.js
   - Design locked (no CSS/HTML changes assumed)
   - Realtime sync from server API
   - Actions: tap / super / switch / Extra Tap (Stars)
   - My Panel + Top20 live updates
   - 3 languages (HE/EN/AR) for all visible labels
   - Referral program: personal link + copy button
*/

(function(){
  "use strict";

  // ===== Telegram WebApp bootstrap =====
  const WebApp = window.Telegram?.WebApp;
  try { WebApp?.ready(); WebApp?.expand(); } catch(_) {}

  // ===== I18N =====
  const i18n = {
    en:{
      israel:"Israel", gaza:"Gaza",
      tap:"Tap (+1)", superBoost:"Super Boost (+25)", switchTeam:"Switch Team", extraTap:"Extra Tap",
      myBoard:"My Panel", stars:"Stars / Extra Tap", playerLevel:"Player Level", referrals:"Invited Friends", tapsToday:"Taps today",
      top20:"Top 20", battle:"Battle Messages",
      doubleOn:"🟢 Double XP Active!", doubleOff:"⚪ Double XP Off",
      copied:"Copied!", err:"Something went wrong", amount:"Amount"
    },
    he:{
      israel:"ישראל", gaza:"עזה",
      tap:"טאפ (+1)", superBoost:"סופר בוסט (+25)", switchTeam:"החלף קבוצה", extraTap:"Extra Tap",
      myBoard:"הלוח שלי", stars:"כוכבים / Extra Tap", playerLevel:"רמת שחקן", referrals:"מוזמנים", tapsToday:"טאפים היום",
      top20:"טופ 20", battle:"הודעות קרב",
      doubleOn:"🟢 דאבל אקספי פעיל!", doubleOff:"⚪ דאבל אקספי כבוי",
      copied:"הועתק!", err:"אירעה שגיאה", amount:"כמות"
    },
    ar:{
      israel:"إسرائيل", gaza:"غزة",
      tap:"انقر (+1)", superBoost:"تعزيز سوبر (+25)", switchTeam:"بدّل الفريق", extraTap:"Extra Tap",
      myBoard:"لوحتي", stars:"نجوم / Extra Tap", playerLevel:"مستوى اللاعب", referrals:"الأصدقاء المدعوون", tapsToday:"نقرات اليوم",
      top20:"أفضل 20", battle:"رسائل المعركة",
      doubleOn:"🟢 دابل إكس‌بي يعمل!", doubleOff:"⚪ دابل إکس‌بي متوقف",
      copied:"نُسخ!", err:"حدث خطأ ما", amount:"الكمية"
    }
  };

  // language persistence
  function getLang() {
    let l = localStorage.getItem("tb_lang");
    if (!l) {
      const guess = (WebApp?.initDataUnsafe?.user?.language_code || "he").slice(0,2);
      l = ["he","en","ar"].includes(guess) ? guess : "he";
      localStorage.setItem("tb_lang", l);
    }
    return l;
  }
  function setLang(l) {
    localStorage.setItem("tb_lang", l);
    document.body.dir = (l==="he"||l==="ar") ? "rtl" : "ltr";
    // paint any static labels that use data-i18n
    document.querySelectorAll("[data-i18n]").forEach(el=>{
      const k = el.getAttribute("data-i18n");
      const txt = i18n[l]?.[k];
      if (txt) el.textContent = txt;
    });
    // update dynamic lines
    paintDoubleXp();
  }
  const LANG = { current: getLang() };
  setLang(LANG.current);

  // bind language chips if exist in DOM
  document.querySelectorAll(".lang-switch .chip").forEach(chip=>{
    const map = { "HE":"he", "EN":"en", "AR":"ar" };
    const label = chip.textContent.trim().toUpperCase();
    const code = map[label] || "en";
    chip.dataset.lang = code;
    if (code === LANG.current) chip.classList.add("active");
    chip.addEventListener("click", ()=>{
      document.querySelectorAll(".lang-switch .chip").forEach(c=>c.classList.remove("active"));
      chip.classList.add("active");
      LANG.current = code;
      setLang(code);
    });
  });

  // ===== Helpers =====
  const headers = {};
  try { if (WebApp?.initData) headers["X-Init-Data"] = WebApp.initData; } catch(_){}
  const $  = (s)=>document.querySelector(s);
  const $$ = (s)=>document.querySelectorAll(s);

  async function getJSON(url){
    const r = await fetch(url, { headers });
    if (!r.ok) throw new Error("HTTP "+r.status);
    return r.json();
  }
  async function postJSON(url, body){
    const r = await fetch(url, { method:"POST", headers:Object.assign({"Content-Type":"application/json"}, headers), body: JSON.stringify(body||{}) });
    if (!r.ok) throw new Error("HTTP "+r.status);
    return r.json();
  }
  function setText(id, txt) { const el = document.getElementById(id); if (el) el.textContent = String(txt); }
  function toast(msg){
    const el = document.createElement("div");
    el.textContent = msg;
    Object.assign(el.style, {
      position:"fixed", bottom:"14px", left:"50%", transform:"translateX(-50%)",
      background:"#151a2b", color:"#fff", padding:"8px 12px", borderRadius:"10px",
      boxShadow:"0 10px 24px rgba(0,0,0,.35)", zIndex:99999, fontSize:"14px"
    });
    document.body.appendChild(el);
    setTimeout(()=>el.remove(), 1200);
  }

  // ===== Game State (client cache) =====
  const GAME = {
    doubleXP:false,
    scores:{ israel:0, gaza:0 },
    me:{ id:null, team:null, tapsToday:0, tapsLimit:300, level:1, xp:0, referrals:0, stars:0, username:null },
    leaderboard:[]
  };

  // ===== Painters =====
  function paintDoubleXp(){
    const el = $("#double-xp");
    if (!el) return;
    if (GAME.doubleXP) {
      el.textContent = i18n[LANG.current].doubleOn;
      el.classList.add("on"); el.classList.remove("off");
    } else {
      el.textContent = i18n[LANG.current].doubleOff;
      el.classList.add("off"); el.classList.remove("on");
    }
  }
  function paintScores(){
    setText("score-israel", GAME.scores.israel ?? 0);
    setText("score-gaza",   GAME.scores.gaza   ?? 0);
  }
  function levelLine(xp=0, level=1){
    const step = 100;
    const prev = (level-1)*step;
    const curr = Math.max(0, Math.min(step, xp - prev));
    return `Level ${level} (${curr}/${step} XP) 🎖️`;
  }
  function paintMe(){
    setText("stars-extra", GAME.me.stars ?? 0);
    setText("player-level", levelLine(GAME.me.xp || 0, GAME.me.level || 1));
    setText("invited-count", GAME.me.referrals ?? 0);
    setText("taps-today", `${GAME.me.tapsToday ?? 0}/${GAME.me.tapsLimit ?? 300}`);
  }
  function paintTop20(){
    const ol = $("#top-list");
    if (!ol) return;
    ol.innerHTML = "";
    (GAME.leaderboard||[]).forEach((row, idx)=>{
      const li = document.createElement("li");
      const name = row.displayName || row.name || row.username || `Player #${idx+1}`;
      const pts  = row.points ?? row.score ?? 0;
      li.textContent = `${idx+1}. ${name} — ${pts}`;
      ol.appendChild(li);
    });
  }

  // ===== Feed (optional) =====
  function feed(txt){
    const box = $("#feed");
    if (!box) return;
    const item = document.createElement("div");
    item.className = "item";
    const now = new Date().toLocaleTimeString();
    item.textContent = `[${now}] ${txt}`;
    box.appendChild(item);
    box.scrollTop = box.scrollHeight;
  }

  // ===== Sync (API) =====
  async function syncState(){
    try{
      const data = await getJSON("/api/state");
      if (data?.scores) GAME.scores = data.scores;
      GAME.doubleXP = !!(data?.doubleXP?.on || data?.doubleXP);
      paintDoubleXp(); paintScores();
    }catch(_){}
  }
  async function syncMe(){
    try{
      // Prefer server that reads user from X-Init-Data; if not, append ?userId
      const fallbackId = WebApp?.initDataUnsafe?.user?.id || "";
      const data = await getJSON(`/api/me${fallbackId ? ("?userId="+fallbackId) : ""}`);
      const me = data?.me || data || {};
      GAME.me.id        = me.userId || me.id || GAME.me.id;
      GAME.me.team      = me.team || GAME.me.team;
      GAME.me.tapsToday = me.tapsToday ?? me.taps_today ?? me.taps ?? 0;
      GAME.me.tapsLimit = data?.limit || me.tapsLimit || 300;
      GAME.me.level     = me.level ?? 1;
      GAME.me.xp        = me.xp ?? 0;
      GAME.me.referrals = me.referrals ?? me.invited ?? 0;
      GAME.me.stars     = me.stars ?? me.starsDonated ?? 0;
      paintMe();
    }catch(_){}
  }
  async function syncLeaderboard(){
    try{
      const list = await getJSON("/api/leaderboard");
      const items = Array.isArray(list) ? list : (list?.rows || list?.top || []);
      GAME.leaderboard = items.slice(0,20);
      paintTop20();
    }catch(_){}
  }
  async function syncAll(){
    await Promise.all([syncState(), syncMe(), syncLeaderboard()]);
  }

  // initial + intervals
  syncAll();
  setInterval(syncState,      5000);
  setInterval(syncMe,         7000);
  setInterval(syncLeaderboard,12000);

  // ===== Actions =====
  $("#tap-btn")?.addEventListener("click", async ()=>{
    try{
      await postJSON("/api/tap", { userId: WebApp?.initDataUnsafe?.user?.id || undefined });
      feed("+1 tap"); syncMe(); syncState();
    }catch(e){ toast(i18n[LANG.current].err); }
  });

  $("#super-btn")?.addEventListener("click", async ()=>{
    try{
      await postJSON("/api/super", { userId: WebApp?.initDataUnsafe?.user?.id || undefined });
      feed("Super Boost +25"); syncMe(); syncState();
    }catch(e){ toast(i18n[LANG.current].err); }
  });

  // keep selected team only for Extra Tap payment payload
  const SELECT = { team: "israel" };
  $("#switch-btn")?.addEventListener("click", ()=>{
    SELECT.team = (SELECT.team === "israel") ? "gaza" : "israel";
    feed("Switch team → "+SELECT.team);
  });

  $("#extra-btn")?.addEventListener("click", async ()=>{
    const input = $("#extra-amount") || $("#stars-input");
    const raw = (input?.value || "10").trim();
    const num = Math.max(1, Math.min(1000, parseInt(raw,10) || 10));
    if (input) input.value = String(num);
    try{
      const userId = WebApp?.initDataUnsafe?.user?.id;
      const body = { userId, team: SELECT.team, stars: num };
      const r = await postJSON("/api/create-invoice", body);
      if (r?.ok && r.url) {
        if (WebApp?.openInvoice) WebApp.openInvoice(r.url, ()=>syncAll());
        else window.location.href = r.url;
      }
    }catch(e){ toast(i18n[LANG.current].err); }
  });

  // ===== Referral Program (3 languages + copy) =====
  (function initReferral(){
    const userId = WebApp?.initDataUnsafe?.user?.id || 0;
    const link = userId ? `https://t.me/TeamBattle_vBot/app?start_param=${userId}` : "";
    const input = $("#ref-link");
    const btn   = $("#copy-ref");
    const title = $(".partner-title");

    const refText = {
      he:{ title:"תוכנית שותפים", copy:"העתק קישור", copied:"הועתק!" },
      en:{ title:"Partner Program", copy:"Copy Link",  copied:"Copied!" },
      ar:{ title:"برنامج الشركاء", copy:"نسخ الرابط",   copied:"نُسخ!" }
    };
    if (title) title.textContent = refText[LANG.current]?.title || refText.en.title;
    if (btn)   btn.textContent   = refText[LANG.current]?.copy  || refText.en.copy;
    if (input) input.value       = link;

    btn?.addEventListener("click", async ()=>{
      try {
        await navigator.clipboard.writeText(link);
        const old = btn.textContent;
        btn.textContent = refText[LANG.current]?.copied || refText.en.copied;
        setTimeout(()=>btn.textContent = old, 1200);
        toast(refText[LANG.current]?.copied || refText.en.copied);
      } catch (e) {
        toast(i18n[LANG.current].err);
      }
    });

    // Re-translate on language change (if your chips exist)
    $$(".lang-switch .chip").forEach(chip=>{
      chip.addEventListener("click", ()=>{
        if (title) title.textContent = refText[LANG.current]?.title || refText.en.title;
        if (btn)   btn.textContent   = refText[LANG.current]?.copy  || refText.en.copy;
      });
    });
  })();

})();
