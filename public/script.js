/* TeamBattle V2.6 — Client (functionality only; UI locked except referral placement) */
(() => {
  'use strict';
  const tg = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;
  try { tg?.expand(); tg?.ready(); } catch(e){}

  const i18n={en:{doubleOn:"Double XP Active!",doubleOff:"Double XP Off",tap:"Tap",super:"Super Boost",switch:"Switch Team",extra:"Extra Tap",israel:"Israel",gaza:"Gaza",myPanel:"My Panel",starsExtra:"Stars | Extra Tap",playerLevel:"Player Level",invited:"Invited",tapsToday:"Taps Today",top20:"Top 20",battleMessages:"Battle Messages",partnerTitle:"Partner Program",copy:"Copy Link",copied:"Copied"},he:{doubleOn:"דאבל אקספי פעיל!",doubleOff:"דאבל אקספי כבוי",tap:"טאפ",super:"סופר בוסט",switch:"החלף קבוצה",extra:"Extra Tap",israel:"ישראל",gaza:"עזה",myPanel:"הלוח שלי",starsExtra:"כוכבים | Extra Tap",playerLevel:"רמת השחקן",invited:"מוזמנים",tapsToday:"טאפים היום",top20:"טופ 20",battleMessages:"הודעות קרב",partnerTitle:"תוכנית שותפים",copy:"העתק קישור",copied:"הועתק"},ar:{doubleOn:"دابل إكس بي يعمل!",doubleOff:"دابل إكس بي متوقف",tap:"نقرة",super:"تعزيز سوبر",switch:"تبديل الفريق",extra:"Extra Tap",israel:"إسرائيل",gaza:"غزة",myPanel:"لوحتي",starsExtra:"النجوم | Extra Tap",playerLevel:"مستوى اللاعب",invited:"مدعوون",tapsToday:"نقرات اليوم",top20:"أفضل 20",battleMessages:"رسائل المعركة",partnerTitle:"برنامج الشركاء",copy:"نسخ الرابط",copied:"نُسخ"}};
  const state={lang:localStorage.getItem('tb_lang')||'en',selectedTeam:'israel',doubleXP:false,scores:{israel:0,gaza:0},me:null,leaderboard:[]};
  const $=s=>document.querySelector(s), $$=s=>document.querySelectorAll(s), t=k=>(i18n[state.lang]&&i18n[state.lang][k])||k;

  function setLang(lang){
    state.lang=lang; localStorage.setItem('tb_lang',lang);
    $("#tap-btn")&&($("#tap-btn").textContent=t("tap"));
    $("#super-btn")&&($("#super-btn").textContent=t("super"));
    $("#switch-btn")&&($("#switch-btn").textContent=t("switch"));
    $("#extra-btn")&&($("#extra-btn").textContent=t("extra"));
    $(".partner-title")&&($(".partner-title").textContent=t("partnerTitle"));
    $("#copy-ref")&&($("#copy-ref").textContent=t("copy"));
    const set=(sel,key)=>{const el=document.querySelector(sel); if(el) el.textContent=t(key);};
    set("[data-i18n='israel']","israel"); set("[data-i18n='gaza']","gaza");
    set("[data-i18n='myPanel']","myPanel"); set("[data-i18n='starsExtra']","starsExtra");
    set("[data-i18n='playerLevel']","playerLevel"); set("[data-i18n='invited']","invited");
    set("[data-i18n='tapsToday']","tapsToday"); set("[data-i18n='top20']","top20"); set("[data-i18n='battleMessages']","battleMessages");
    document.body.dir=(lang==="he"||lang==="ar")?"rtl":"ltr";
    const dx=$("#double-xp"); if(dx){ dx.textContent=state.doubleXP?t("doubleOn"):t("doubleOff"); }
  }
  function bindLanguageButtons(){
    $$(".lang-switch .chip").forEach(btn=>{
      btn.addEventListener("click",()=>{
        $$(".lang-switch .chip").forEach(b=>b.classList.remove("active"));
        btn.classList.add("active"); setLang(btn.dataset.lang);
      });
    });
    (document.querySelector(`.chip[data-lang="${state.lang}"]`)||document.querySelector('.chip[data-lang="en"]'))?.classList.add("active");
    setLang(state.lang);
  }
  function toast(msg){
    const el=document.createElement("div");
    el.textContent=msg; Object.assign(el.style,{position:"fixed",bottom:"12px",left:"50%",transform:"translateX(-50%)",background:"#1b233b",color:"#fff",padding:"8px 12px",borderRadius:"8px",boxShadow:"0 6px 24px rgba(0,0,0,.35)",zIndex:"9999"});
    document.body.appendChild(el); setTimeout(()=>el.remove(),1200);
  }
  function initRefLink(){
    const uid=window.Telegram?.WebApp?.initDataUnsafe?.user?.id||0;
    const link=`https://t.me/TeamBattle_vBot/app?start_param=${uid}`;
    const input=$("#ref-link"); if(input) input.value=link;
    const btn=$("#copy-ref"); if(btn) btn.onclick=async()=>{try{await navigator.clipboard.writeText(link);toast(t("copied"));}catch(e){}};
  }
  async function fetchJSON(url,opts){ const r=await fetch(url,Object.assign({credentials:'include'},opts||{})); if(!r.ok) throw new Error(`HTTP ${r.status}`); return await r.json(); }
  async function fetchState(){ try{ const data=await fetchJSON("/api/state"); state.scores=data?.score||state.scores; state.doubleXP=!!data?.doubleXP; $("#score-israel")&&($("#score-israel").textContent=state.scores.israel??0); $("#score-gaza")&&($("#score-gaza").textContent=state.scores.gaza??0); const dx=$("#double-xp"); if(dx){ dx.classList.toggle("on",state.doubleXP); dx.classList.toggle("off",!state.doubleXP); dx.textContent=state.doubleXP?t("doubleOn"):t("doubleOff"); } }catch(e){} }
  async function fetchMe(){ try{ const data=await fetchJSON("/api/me"); state.me=data||{}; $("#stars-extra")&&($("#stars-extra").textContent=data?.starsExtra??data?.stars??0); $("#player-level")&&($("#player-level").textContent=data?.level??1); $("#invited-count")&&($("#invited-count").textContent=data?.invited??data?.referrals??0); const tapsToday=data?.tapsToday??0, maxTaps=data?.maxTaps??300; $("#taps-today")&&($("#taps-today").textContent=`${tapsToday}/${maxTaps}`); }catch(e){} }
  async function fetchLeaderboard(){ try{ const list=await fetchJSON("/api/leaderboard"); const items=Array.isArray(list)?list:(list?.rows||list?.top||[]); state.leaderboard=items.slice(0,20); const ol=$("#top-list"); if(ol){ ol.innerHTML=""; state.leaderboard.forEach((entry,i)=>{ const li=document.createElement("li"); const name=entry?.name||entry?.username||`Player #${i+1}`; const pts=entry?.points??entry?.score??0; li.textContent=`${name} — ${pts}`; ol.appendChild(li); }); } }catch(e){} }
  function bindActions(){
    $("#tap-btn")&&($("#tap-btn").onclick=async()=>{ try{ const r=await fetch("/api/tap",{method:"POST"}); if(r.ok){ feed(`+1 ${state.selectedTeam}`); fetchMe(); fetchState(); } }catch(e){} });
    $("#super-btn")&&($("#super-btn").onclick=async()=>{ try{ const r=await fetch("/api/super",{method:"POST"}); if(r.ok){ feed(`Super Boost +25`); fetchMe(); fetchState(); } }catch(e){} });
    $("#switch-btn")&&($("#switch-btn").onclick=()=>{ state.selectedTeam=(state.selectedTeam==="israel")?"gaza":"israel"; toast(`Team: ${state.selectedTeam}`); });
    $("#extra-btn")&&($("#extra-btn").onclick=async()=>{
      const val=parseInt(($("#extra-amount")?.value||"10"),10); const amount=Math.max(1,Math.min(1000,isNaN(val)?10:val)); if($("#extra-amount")) $("#extra-amount").value=amount;
      try{ const r=await fetch("/api/create-invoice",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({title:"Extra Tap",description:"Donate Stars for team boost",amount,payload:`extra_${Date.now()}`})}); const data=await r.json(); if(data?.ok&&data?.url){ (window.Telegram?.WebApp?.openInvoice)?Telegram.WebApp.openInvoice(data.url):(location.href=data.url); }else{ toast("Payment error"); console.log("create-invoice:",data); } }catch(e){ toast("Payment error"); }
    });
  }
  function feed(txt){ const box=$("#feed"); if(!box) return; const item=document.createElement("div"); item.className="item"; const now=new Date().toLocaleTimeString(); item.textContent=`[${now}] ${txt}`; box.appendChild(item); box.scrollTop=box.scrollHeight; }
  function init(){ tg?.ready?.(); tg?.expand?.(); bindLanguageButtons(); initRefLink(); bindActions(); fetchState(); fetchMe(); fetchLeaderboard(); setInterval(fetchState,5000); setInterval(fetchMe,7000); setInterval(fetchLeaderboard,12000); }
  document.addEventListener("DOMContentLoaded",init);
})();