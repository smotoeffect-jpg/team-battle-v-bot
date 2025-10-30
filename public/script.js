<script>
(() => {
  // ---------- Hardening: למנוע זום/פינצ'ים/דאבל-טאפ, אך לא לחסום ספאם טאפים ----------
  try {
    const st=document.createElement("style");
    st.textContent=`html,body{overscroll-behavior:none;touch-action:manipulation}*{-webkit-tap-highlight-color:transparent}`;
    document.head.appendChild(st);
  } catch{}

  let lastTouchEnd=0;
  document.addEventListener("gesturestart",(e)=>e.preventDefault(),{passive:false});
  document.addEventListener("dblclick",(e)=>e.preventDefault(),{capture:true});
  document.addEventListener("touchend",(e)=>{const n=Date.now();if(n-lastTouchEnd<=300)e.preventDefault();lastTouchEnd=n;},{passive:false});
  document.addEventListener("touchmove",(e)=>{ if(e.touches&&e.touches.length>1) e.preventDefault(); },{passive:false});

  // ---------- Helpers ----------
  const qs=(s)=>document.querySelector(s);
  const qsa=(s)=>Array.from(document.querySelectorAll(s));
  const API_BASE=(location.origin||"").replace(/\/$/,"");
  const BOT_USERNAME="TeamBattle_vBot";
  const log=(...a)=>{ try{console.log("[TB]",...a)}catch{} };
  const tErr=(...a)=>{ try{console.error("[TB]",...a)}catch{} };

  // ---------- I18N ----------
  const I18N={
    he:{israel:"🇮🇱 ישראל",gaza:"🇵🇸 עזה",tap:"טאפ (+1)",super:"סופר-בוסט (+25)",rules:"⭐ 1 = 2 נק' • 💥 300 טאפים/יום • ⚡ סופר פעם ביום",
        chooseIL:"בחר צוות ישראל 🇮🇱",chooseGA:"בחר צוות עזה 🇵🇸",donate:"תרום כוכבים",
        progress:(x,m)=>`${x} / ${m} טאפים היום`,toastCopy:"הקישור הועתק",mustChoose:"בחר תחילה קבוצה",
        confirmSwitch:"להחליף קבוצה? זה ישפיע על הניקוד הבא שלך.",you:"אתה",myPanel:"הלוח שלי",
        myStars:(n)=>`⭐ כוכבים שתרמתי: ${n}`,myBonus:(n)=>`🎁 בונוס שותפים שקיבלתי: ${n}⭐`,
        myTaps:(x,m)=>`👆 טאפים היום: ${x}/${m}`,share:"📤 שתף בטלגרם",leaders:"שחקנים מובילים",
        switched:"הקבוצה הוחלפה ✅",partners:"תוכנית שותפים 🤝",copyLink:"העתק קישור",
        paidCancelled:"התשלום בוטל או נכשל",invErr:"שגיאה ביצירת חשבונית",
        hitLimit:"הגעת למגבלת הטאפים היומית",usedSuper:"השתמשת כבר בסופר-בוסט היום"},
    en:{israel:"🇮🇱 Israel",gaza:"🇵🇸 Gaza",tap:"Tap (+1)",super:"Super (+25)",rules:"⭐ 1 = 2 pts • 💥 300 taps/day • ⚡ Super once/day",
        chooseIL:"Join Team Israel 🇮🇱",chooseGA:"Join Team Gaza 🇵🇸",donate:"Donate Stars",
        progress:(x,m)=>`${x} / ${m} taps today`,toastCopy:"Link copied",mustChoose:"Pick a team first",
        confirmSwitch:"Switch team? This affects your next points.",you:"You",myPanel:"My Panel",
        myStars:(n)=>`⭐ Stars I donated: ${n}`,myBonus:(n)=>`🎁 Referral bonus I got: ${n}⭐`,
        myTaps:(x,m)=>`👆 Taps today: ${x}/${m}`,share:"📤 Share on Telegram",leaders:"Top Players",
        switched:"Team switched ✅",partners:"Affiliate Program 🤝",copyLink:"Copy Link",
        paidCancelled:"Payment cancelled or failed",invErr:"Invoice creation error",
        hitLimit:"Daily taps limit reached",usedSuper:"Super already used today"},
    ar:{israel:"🇮🇱 إسرائيل",gaza:"🇵🇸 غزة",tap:"نقرة (+1)",super:"سوبر (+25)",rules:"⭐ 1 = نقطتان • 💥 ٣٠٠ نقرة/يوم • ⚡ سوبر مرة/يوم",
        chooseIL:"انضم لفريق إسرائيل 🇮🇱",chooseGA:"انضم لفريق غزة 🇵🇸",donate:"تبرع بالنجوم",
        progress:(x,m)=>`${x} / ${m} نقرات اليوم`,toastCopy:"تم نسخ الرابط",mustChoose:"اختر فريقًا أولًا",
        confirmSwitch:"تغيير الفريق؟ سيؤثر على نقاطك القادمة.",you:"أنت",myPanel:"لوحتي",
        myStars:(n)=>`⭐ النجوم التي تبرعت بها: ${n}`,myBonus:(n)=>`🎁 مكافأة الإحالة: ${n}⭐`,
        myTaps:(x,m)=>`👆 نقرات اليوم: ${x}/${m}`,share:"📤 شارك على تيليجرام",leaders:"اللاعبون المتصدرون",
        switched:"تم تغيير الفريق ✅",partners:"برنامج الشركاء 🤝",copyLink:"نسخ الرابط",
        paidCancelled:"تم إلغاء الدفع أو فشل",invErr:"خطأ في إنشاء الفاتورة",
        hitLimit:"بلغت حد النقرات اليومي",usedSuper:"تم استخدام السوبر اليوم"}
  };
  let LANG=localStorage.getItem("tb_lang")||"he";

  // ---------- User init ----------
  let USER_ID=null, TEAM=null, tapsToday=0, tapsLimit=300;
  try{
    if(window.Telegram?.WebApp){
      Telegram.WebApp.ready();
      const unsafe=Telegram.WebApp.initDataUnsafe||{};
      USER_ID = unsafe.user?.id ? String(unsafe.user.id) : null;
    }
  }catch(e){ tErr("TG init",e) }
  if(!USER_ID){ USER_ID=localStorage.getItem("tb_user_id")||String(Math.floor(Math.random()*1e12)); localStorage.setItem("tb_user_id",USER_ID); }

  // ---------- Elements (רק מה שבטוח קיים) ----------
  const els={
    scoreIL:qs("#score-israel"), scoreGA:qs("#score-gaza"),
    prog:qs("#progress-text"), leaders:qs("#leaderboard"),
    meStars:qs("#me-stars"), meBonus:qs("#me-bonus"), meTaps:qs("#me-taps"),
    refInput:qs("#ref-link"), copy:qs("#copy-link"), share:qs("#share-btn"),
    stars:qs("#stars")
  };

  function t(){ return I18N[LANG]||I18N.he; }
  function toast(msg){ try{const x=qs("#toast"); if(x){x.textContent=msg;x.hidden=false; setTimeout(()=>x.hidden=true,1500);} else alert(msg);}catch{} }
  function buildRefLink(uid=USER_ID){ return `https://t.me/${BOT_USERNAME}?start=ref_${uid}`; }

  // ---------- API ----------
  const apiGet = async (p)=>{ try{ const r=await fetch(API_BASE+p); return await r.json(); } catch(e){ tErr("GET",p,e); return {} } };
  const apiPost= async (p,b)=>{ try{ const r=await fetch(API_BASE+p,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(b||{})}); return await r.json(); } catch(e){ tErr("POST",p,e); return {} } };

  // ---------- Render helpers ----------
  function applyLangTexts(){
    // לא נוגעים בלייבלים שלא קיימים – רק מה שמצאנו
    const lt=qs("#leaders-title"); if(lt) lt.textContent=t().leaders;
    const mp=qs("#my-panel-title"); if(mp) mp.textContent=t().myPanel;
    if(els.prog) els.prog.textContent=t().progress(tapsToday,tapsLimit);
    if(els.meStars){ const v=Number(els.meStars.dataset.v||0); els.meStars.textContent=t().myStars(v); }
    if(els.meBonus){ const v=Number(els.meBonus.dataset.v||0); els.meBonus.textContent=t().myBonus(v); }
    if(els.meTaps) els.meTaps.textContent=t().myTaps(tapsToday,tapsLimit);
    const aff=qs(".affiliate-title"); if(aff) aff.textContent=t().partners;
    const copy=qs("#copy-link"); if(copy) copy.textContent=t().copyLink;
    const share=qs("#share-btn"); if(share) share.textContent=t().share;
  }

  function enableGameButtons(enabled=true){
    // מפעיל כל כפתור TAP/SUPER/DONATE בלי תלות ב־IDs
    const candidates = qsa("button, a, input[type=button]").filter(el=>{
      const tx=(el.textContent||"").trim();
      return /טאפ|Tap|نقرة/.test(tx) || /סופר|Super|سوبر/.test(tx) || /כוכבים|Donate Stars|تبرع/.test(tx);
    });
    candidates.forEach(el=>{ try{ el.disabled=!enabled; }catch{} });
  }

  // ---------- State ----------
  async function fetchState(){
    const j=await apiGet("/api/state");
    if(j?.ok&&j.scores){
      if(els.scoreIL) els.scoreIL.textContent=j.scores.israel ?? 0;
      if(els.scoreGA) els.scoreGA.textContent=j.scores.gaza   ?? 0;
    }
  }

  async function fetchMe(){
    const j=await apiGet(`/api/me?userId=${encodeURIComponent(USER_ID)}`);
    if(!j?.ok||!j.me) return;
    const me=j.me;
    TEAM = me.team || TEAM;
    tapsToday = Number.isFinite(me.tapsToday)?me.tapsToday:tapsToday;
    tapsLimit = Number.isFinite(j.limit)?j.limit:tapsLimit;

    if(TEAM){ enableGameButtons(true); } // לא תלוי ב־#team-chooser

    if(els.meStars){ els.meStars.dataset.v=String(me.starsDonated||0); els.meStars.textContent=t().myStars(me.starsDonated||0); }
    if(els.meBonus){ els.meBonus.dataset.v=String(me.bonusStars||0);  els.meBonus.textContent=t().myBonus(me.bonusStars||0); }
    if(els.meTaps) els.meTaps.textContent=t().myTaps(tapsToday,tapsLimit);
    if(els.prog)   els.prog.textContent=t().progress(tapsToday,tapsLimit);
  }

  async function fetchLeaders(){
    const j=await apiGet("/api/leaderboard");
    if(!j?.ok||!Array.isArray(j.top)||!qs("#leaderboard")) return;
    const box=qs("#leaderboard"); box.innerHTML="";
    j.top.slice(0,20).forEach((u,i)=>{
      const row=document.createElement("div");
      const name=u.displayName||u.username||(u.userId===USER_ID?t().you:`Player ${u.userId?.slice(-4)||""}`);
      const pts = u.points ?? ((u.starsDonated||0)*2);
      row.className="leader-row";
      row.textContent=`${i+1}. ${name} — ${pts} pts`;
      box.appendChild(row);
    });
  }

  // ---------- Actions ----------
  async function selectTeam(team){
    const j=await apiPost("/api/select-team",{userId:USER_ID,team});
    if(j?.ok){
      TEAM=team;
      enableGameButtons(true);
      const ref=buildRefLink(USER_ID);
      if(els.refInput) els.refInput.value=ref;
      await Promise.all([fetchState(),fetchMe(),fetchLeaders()]);
    }
  }
  async function switchTeam(){
    if(!TEAM){ toast(t().mustChoose); return; }
    if(!confirm(t().confirmSwitch)) return;
    const j=await apiPost("/api/switch-team",{userId:USER_ID,newTeam:TEAM==="israel"?"gaza":"israel"});
    if(j?.ok){ TEAM=j.team; toast(t().switched); await Promise.all([fetchState(),fetchMe(),fetchLeaders()]); }
  }
  async function tap(){
    if(!TEAM){ toast(t().mustChoose); return; }
    const j=await apiPost("/api/tap",{userId:USER_ID});
    if(j?.ok){ await Promise.all([fetchState(),fetchMe(),fetchLeaders()]); }
    else if(j?.error==="limit"){ toast(t().hitLimit); }
  }
  async function superBoost(){
    if(!TEAM){ toast(t().mustChoose); return; }
    const j=await apiPost("/api/super",{userId:USER_ID});
    if(j?.ok){ await Promise.all([fetchState(),fetchMe(),fetchLeaders()]); }
    else if(j?.error==="limit"){ toast(t().usedSuper); }
  }
  async function donate(){
    if(!TEAM){ toast(t().mustChoose); return; }
    const stars=Math.max(1,parseInt(els.stars?.value||"1",10));
    const j=await apiPost("/api/create-invoice",{userId:USER_ID,team:TEAM,stars});
    if(j?.ok&&j.url){
      try{
        if(window.Telegram?.WebApp?.openInvoice){
          await new Promise((res,rej)=>Telegram.WebApp.openInvoice(j.url,(s)=> (s==="paid"||s==="pending")?res():rej(s||"failed")));
        } else { window.open(j.url,"_blank"); }
        const started=Date.now();
        const poll=async()=>{ await Promise.all([fetchState(),fetchMe(),fetchLeaders()]); if(Date.now()-started<20000) setTimeout(poll,2500); };
        setTimeout(poll,3000);
      }catch{ toast(t().paidCancelled); }
    } else { toast(t().invErr); }
  }

  function wireClipboardShare(){
    if(els.refInput) els.refInput.value=buildRefLink(USER_ID);
    if(els.copy) els.copy.addEventListener("click",async()=>{
      try{ await navigator.clipboard.writeText(els.refInput.value); toast(t().toastCopy); }catch{ toast("לא הצלחתי להעתיק"); }
    });
    if(els.share) els.share.addEventListener("click",()=>{
      const link=buildRefLink(USER_ID);
      const url=`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent("בואו לשחק איתי ב-TeamBattle!")}`;
      window.open(url,"_blank");
    });
  }

  // ---------- Binding ללא תלות ב־IDs ----------
  const txtMap={
    chooseIL:[/בחר צוות ישראל/i,/join team israel/i,/انضم.*إسرائيل/i],
    chooseGA:[/בחר צוות עזה/i,/join team gaza/i,/انضم.*غزة/i],
    tap:[/טאפ/i,/tap/i,/نقرة/i],
    super:[/סופר-?בוסט/i,/super/i,/سوبر/i],
    donate:[/תרום.*כוכבים/i,/donate.*stars/i,/تبرع.*النجوم/i],
    switchTeam:[/החלף.*קבוצ/i,/switch.*team/i,/تغيير.*الفريق/i]
  };

  function actionFromElement(el){
    const da=el.getAttribute("data-action");
    if(da) return da;
    const tx=(el.textContent||"").trim();
    for(const [k,arr] of Object.entries(txtMap)){
      if(arr.some(rx=>rx.test(tx))) return k;
    }
    return null;
  }

  document.addEventListener("click",(ev)=>{
    const el=ev.target.closest("button, a, input[type=button]");
    if(!el) return;
    const act=actionFromElement(el);
    if(!act) return;

    ev.preventDefault();
    switch(act){
      case "chooseIL": selectTeam("israel"); break;
      case "chooseGA": selectTeam("gaza"); break;
      case "tap": tap(); break;
      case "super": superBoost(); break;
      case "donate": donate(); break;
      case "switchTeam": switchTeam(); break;
      default: break;
    }
  },{passive:false});

  // ---------- Language buttons (he/en/ar) ----------
  qsa("button,[role=button]").forEach(b=>{
    const lang=b.dataset?.lang || (b.textContent||"").trim().toLowerCase();
    if(["he","english","en","العربية","ar","עברית"].includes(lang)){
      b.addEventListener("click",()=>{
        const map={ "עברית":"he","he":"he","english":"en","en":"en","العربية":"ar","ar":"ar" };
        const next=map[lang]||"he";
        LANG=next; localStorage.setItem("tb_lang",LANG);
        applyLangTexts(); fetchLeaders(); fetchMe();
      });
    }
  });

  // ---------- Init ----------
  document.addEventListener("DOMContentLoaded",()=>{
    try{ wireClipboardShare(); }catch(e){ tErr(e) }
    applyLangTexts();
    fetchState(); fetchMe(); fetchLeaders();
    setInterval(fetchState,10000);
    setInterval(fetchLeaders,15000);
  });
})();
</script>
