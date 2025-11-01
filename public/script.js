/* TeamBattle V2.5 — Functional upgrades only (design locked) */
(() => {
  'use strict';
  const tg = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;
  try { tg?.expand(); tg?.ready(); } catch(e){}

  const i18n={
    en:{doubleOn:"Double XP Active!",doubleOff:"Double XP Off",tap:"Tap",super:"Super Boost",switch:"Switch Team",extra:"Extra Tap",israel:"Israel",gaza:"Gaza",myPanel:"My Panel",starsExtra:"Stars | Extra Tap",playerLevel:"Player Level",invited:"Invited",tapsToday:"Taps Today",top20:"Top 20",battleMessages:"Battle Messages",partnerTitle:"Partner Program",copy:"Copy Link",copied:"Copied"},
    he:{doubleOn:"דאבל אקספי פעיל!",doubleOff:"דאבל אקספי כבוי",tap:"טאפ",super:"סופר בוסט",switch:"החלף קבוצה",extra:"Extra Tap",israel:"ישראל",gaza:"עזה",myPanel:"הלוח שלי",starsExtra:"כוכבים | Extra Tap",playerLevel:"רמת השחקן",invited:"מוזמנים",tapsToday:"טאפים היום",top20:"טופ 20",battleMessages:"הודעות קרב",partnerTitle:"תוכנית שותפים",copy:"העתק קישור",copied:"הועתק"},
    ar:{doubleOn:"دابل إكس بي يعمل!",doubleOff:"دابل إكس بي متوقف",tap:"نقرة",super:"تعزيز سوبر",switch:"تبديل الفريق",extra:"Extra Tap",israel:"إسرائيل",gaza:"غزة",myPanel:"لوحتي",starsExtra:"النجوم | Extra Tap",playerLevel:"مستوى اللاعب",invited:"مدعوون",tapsToday:"نقرات اليوم",top20:"أفضل 20",battleMessages:"رسائل المعركة",partnerTitle:"برنامج الشركاء",copy:"نسخ الرابط",copied:"نُسخ"}
  };

  const state={
    lang: localStorage.getItem('tb_lang') || 'he',
    selectedTeam:'israel',
    doubleXP:false,
    scores:{israel:0,gaza:0},
    me:null,
    leaderboard:[]
  };

  const $=s=>document.querySelector(s), $$=s=>document.querySelectorAll(s), t=k=>(i18n[state.lang]&&i18n[state.lang][k])||k;

  function setLang(lang){
    state.lang=lang; localStorage.setItem('tb_lang',lang);
    const set=(sel,key)=>{const el=document.querySelector(sel); if(el) el.textContent=t(key);};
    $("#tap-btn")&&($("#tap-btn").textContent=t("tap"));
    $("#super-btn")&&($("#super-btn").textContent=t("super"));
    $("#switch-btn")&&($("#switch-btn").textContent=t("switch"));
    $("#extra-btn")&&($("#extra-btn").textContent=t("extra"));
    set(".partner-title","partnerTitle"); $("#copy-ref")&&($("#copy-ref").textContent=t("copy"));
    set("[data-i18n='israel']","israel"); set("[data-i18n='gaza']","gaza");
    set("[data-i18n='myPanel']","myPanel"); set("[data-i18n='starsExtra']","starsExtra");
    set("[data-i18n='playerLevel']","playerLevel"); set("[data-i18n='invited']","invited");
    set("[data-i18n='tapsToday']","tapsToday"); set("[data-i18n='top20']","top20"); set("[data-i18n='battleMessages']","battleMessages");
    document.body.dir=(lang==="he"||lang==="ar")?"rtl":"ltr";
    const dx=$("#double-xp"); if(dx){ dx.textContent=state.doubleXP?t("doubleOn"):t("doubleOff"); }
  }
  function bindLanguageButtons(){
    const map=[["HE","he"],["EN","en"],["AR","ar"]];
    $$(".lang-switch .chip").forEach((btn,idx)=>{
      btn.dataset.lang = map[idx]?.[1] || "en";
      btn.addEventListener("click",()=>{
        $$(".lang-switch .chip").forEach(b=>b.classList.remove("active"));
        btn.classList.add("active"); setLang(btn.dataset.lang);
      });
    });
    (document.querySelector(`.chip[data-lang="${state.lang}"]`)||document.querySelector('.chip'))?.classList.add("active");
    setLang(state.lang);
  }

  // Utils
  function uid(){ return window.Telegram?.WebApp?.initDataUnsafe?.user?.id || 0; }
  async function fetchJSON(url,opts){ const r=await fetch(url,Object.assign({credentials:'include'},opts||{})); if(!r.ok) throw new Error(`HTTP ${r.status}`); return await r.json(); }
  function toast(msg){ const el=document.createElement("div"); el.textContent=msg; Object.assign(el.style,{position:"fixed",bottom:"12px",left:"50%",transform:"translateX(-50%)",background:"#1b233b",color:"#fff",padding:"8px 12px",borderRadius:"8px",boxShadow:"0 6px 24px rgba(0,0,0,.35)",zIndex:"9999"}); document.body.appendChild(el); setTimeout(()=>el.remove(),1200); }

  // Referral
  function initRefLink(){
    const id=uid();
    const link=id?`https://t.me/TeamBattle_vBot/app?start_param=${id}`:"";
    const input=$("#ref-link"); if(input) input.value=link;
    const btn=$("#copy-ref"); if(btn) btn.onclick=async()=>{ try{ await navigator.clipboard.writeText(link); toast(t("copied")); }catch(e){} };
  }

  // API sync
  async function fetchState(){ try{ const data=await fetchJSON("/api/state"); const s=data?.scores||data?.score; if(s){ state.scores=s; }
    state.doubleXP=!!(data?.doubleXP?.on||data?.doubleXP);
    $("#score-israel")&&($("#score-israel").textContent=state.scores.israel??0);
    $("#score-gaza")&&($("#score-gaza").textContent=state.scores.gaza??0);
    const dx=$("#double-xp"); if(dx){ dx.classList.toggle("on",state.doubleXP); dx.classList.toggle("off",!state.doubleXP); dx.textContent=state.doubleXP?t("doubleOn"):t("doubleOff"); }
  }catch(e){} }

  function levelLine(xp=0, level=1){
    const step=100, prev=(level-1)*step, next=level*step, curr=Math.max(0,Math.min(next-prev,xp-prev));
    return `Level ${level} (${curr}/${step} XP) 🎖️`;
  }

  async function fetchMe(){ try{ const id=uid(); const data=await fetchJSON(`/api/me?userId=${id}`); const me=data?.me||data||{}; state.me=me;
    $("#stars-extra")&&($("#stars-extra").textContent=me?.starsExtra??me?.stars??0);
    $("#player-level")&&($("#player-level").textContent=levelLine(me?.xp||0,me?.level||1));
    $("#invited-count")&&($("#invited-count").textContent=me?.invited??me?.referrals??0);
    const tapsToday=me?.tapsToday??0, maxTaps=me?.maxTaps??300;
    $("#taps-today")&&($("#taps-today").textContent=`${tapsToday}/${maxTaps}`);
  }catch(e){} }

  async function fetchLeaderboard(){ try{ const list=await fetchJSON("/api/leaderboard"); const items=Array.isArray(list)?list:(list?.rows||list?.top||[]);
    state.leaderboard=items.slice(0,20); const ol=$("#top-list"); if(ol){ ol.innerHTML=""; state.leaderboard.forEach((entry,i)=>{ const li=document.createElement("li");
      const name=entry?.displayName||entry?.name||entry?.username||`Player #${i+1}`; const pts=entry?.points??entry?.score??0; li.textContent=`${i+1}. ${name} — ${pts}`; ol.appendChild(li); }); }
  }catch(e){} }

  // Actions
  function feed(txt){ const box=$("#feed"); if(!box) return; const item=document.createElement("div"); item.className="item"; const now=new Date().toLocaleTimeString(); item.textContent=`[${now}] ${txt}`; box.appendChild(item); box.scrollTop=box.scrollHeight; }

  function bindActions(){
    $("#tap-btn")&&($("#tap-btn").onclick=async()=>{ try{ const id=uid(); const r=await fetch("/api/tap",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({userId:id})}); if(r.ok){ feed(`+1 ${state.selectedTeam}`); fetchMe(); fetchState(); } }catch(e){} });
    $("#super-btn")&&($("#super-btn").onclick=async()=>{ try{ const id=uid(); const r=await fetch("/api/super",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({userId:id})}); if(r.ok){ feed(`Super Boost +25`); fetchMe(); fetchState(); } }catch(e){} });
    $("#switch-btn")&&($("#switch-btn").onclick=()=>{ state.selectedTeam=(state.selectedTeam==="israel")?"gaza":"israel"; });
    $("#extra-btn")&&($("#extra-btn").onclick=async()=>{
      const id=uid(); const val=parseInt(($("#extra-amount")?.value||"10"),10); const stars=Math.max(1,Math.min(1000,isNaN(val)?10:val)); if($("#extra-amount")) $("#extra-amount").value=stars;
      try{ const body={userId:id,team:state.selectedTeam,stars}; const r=await fetch("/api/create-invoice",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)}); const data=await r.json();
        if(data?.ok&&data?.url){ (window.Telegram?.WebApp?.openInvoice)?Telegram.WebApp.openInvoice(data.url):(location.href=data.url); }
      }catch(e){} });
  }

  function init(){ tg?.ready?.(); tg?.expand?.(); bindLanguageButtons(); initRefLink(); bindActions();
    fetchState(); fetchMe(); fetchLeaderboard(); setInterval(fetchState,5000); setInterval(fetchMe,7000); setInterval(fetchLeaderboard,12000); }
  document.addEventListener("DOMContentLoaded",init);
})();