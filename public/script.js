(function(){
  const $ = (s,ctx=document)=>ctx.querySelector(s);
  const $$ = (s,ctx=document)=>Array.from(ctx.querySelectorAll(s));

  const I18N = {
    en:{gaza:"Gaza",israel:"Israel",superPerDay:"Super once/day",dailyTaps:"Daily taps 300",starsRule:"'2 = 1'",switchTeam:"Change Team",superBoost:"+25 Super Boost",tap:"Tap to Boost (+1)",dailyTapsShort:"Daily taps",superToday:"Super today",extraTap:"Extra TAP +2",refTitle:"Referral Program 🤝",refDesc:"Invite friends using your personal link. When they donate stars you get a 10% bonus to your team!",shareTelegram:"Share on Telegram",copyLink:"Copy Link",myBoard:"My Board"},
    he:{gaza:"עזה",israel:"ישראל",superPerDay:"סופר פעם/יום",dailyTaps:"יומי/טאפים 300",starsRule:"'כל 2 = 1'",switchTeam:"החלף קבוצה",superBoost:"סופר-בוסט",tap:"TAP (+1)",dailyTapsShort:"טאפים יומיים",superToday:"בוסטי סופר היום",extraTap:"Extra TAP +2",refTitle:"תוכנית שותפים 🤝",refDesc:"הזמן חברים בעזרת הקישור האישי שלך. כשאנשים תורמים ⭐ אתה מקבל בונוס של 10% נקודות לקבוצה שלך!",shareTelegram:"שתף בטלגרם",copyLink:"העתק קישור",myBoard:"הלוח שלי"},
    ar:{gaza:"غزة",israel:"إسرائيل",superPerDay:"سوبر مرة/اليوم",dailyTaps:"نقرات يومية 300",starsRule:"'2 = 1'",switchTeam:"بدّل الفريق",superBoost:"تعزيز سوبر +25",tap:"انقر للتعزيز (+1)",dailyTapsShort:"نقرات يومية",superToday:"سوبر اليوم",extraTap:"Extra TAP +2",refTitle:"برنامج الإحالة 🤝",refDesc:"ادعُ الأصدقاء برابطك الشخصي. عندما يتبرعون بالنجوم تحصل على 10٪ مكافأة لفريقك!",shareTelegram:"شارك على تيليجرام",copyLink:"نسخ الرابط",myBoard:"لوحتي"}
  };
  let lang = localStorage.getItem("tb_lang") || "he";
  const t = k => (I18N[lang] && I18N[lang][k]) || k;
  function applyI18N(){ $$("[data-i18n]").forEach(el=>{ el.textContent = t(el.getAttribute("data-i18n")); }); }
  $$(".chip").forEach(btn=>btn.addEventListener("click", ()=>{ lang = btn.dataset.lang; localStorage.setItem("tb_lang",lang); applyI18N(); }));
  applyI18N();

  const tg = window.Telegram?.WebApp;
  const user = tg?.initDataUnsafe?.user;
  const userId = user?.id || `guest_${Math.floor(Math.random()*1e9)}`;
  const botUsername = tg?.initDataUnsafe?.receiver?.username || "YourBot";
  const refLink = `https://t.me/${botUsername}/app?start_param=${userId}`;
  const refInput = $("#ref-input"); if (refInput) refInput.value = refLink;
  $("#copy-btn")?.addEventListener("click", async ()=>{ try{ await navigator.clipboard.writeText(refLink);}catch{} });
  $("#share-btn")?.addEventListener("click", ()=>{ if (tg?.shareUrl) tg.shareUrl(refLink); });

  let selected = null; let taps = 0; const tapsMax = 300; let superUsed = 0; const superMax = 1;
  let score = {israel:0,gaza:0};
  const elIsrael = $("#score-israel"), elGaza = $("#score-gaza"), elTapsUsed=$("#taps-used"), elTapsMax=$("#taps-max"), elSuperUsed=$("#super-used");
  elTapsMax.textContent = String(tapsMax);

  function todayKey(){ return new Date().toISOString().split("T")[0]; }
  function storageGet(k,cb){ const cs=tg?.CloudStorage; if(!cs) return cb(null,null); cs.getItem(k,(e,v)=>cb(e,v)); }
  function storageSet(k,v,cb){ const cs=tg?.CloudStorage; if(!cs) return cb&&cb(); cs.setItem(k,v,cb||(()=>{})); }
  const day = todayKey();
  storageGet(`taps_${userId}_${day}`,(e,v)=>{ if(v){ taps=parseInt(JSON.parse(v)); elTapsUsed.textContent=taps; }});
  storageGet(`super_${userId}_${day}`,(e,v)=>{ if(v){ superUsed=parseInt(JSON.parse(v)); elSuperUsed.textContent=superUsed; }});

  $("#btn-switch")?.addEventListener("click", ()=>{ selected = selected==="israel" ? "gaza":"israel"; });
  $("#btn-tap")?.addEventListener("click", ()=>{ if(!selected||taps>=tapsMax)return; score[selected]+=1; taps++; elTapsUsed.textContent=String(taps); updateScores(); storageSet(`taps_${userId}_${day}`, JSON.stringify(taps)); tg?.HapticFeedback?.impactOccurred("light"); });
  $("#btn-super")?.addEventListener("click", ()=>{ if(!selected||superUsed>=superMax)return; score[selected]+=25; superUsed++; elSuperUsed.textContent=String(superUsed); updateScores(); storageSet(`super_${userId}_${day}`, JSON.stringify(superUsed)); tg?.HapticFeedback?.notificationOccurred("success"); });
  $("#btn-extra")?.addEventListener("click", async ()=>{
    const stars = Math.max(1, Math.min(100000, parseInt($("#stars-input").value || "0")));
    try{
      const resp = await fetch("/api/create-invoice", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ title:"Extra TAP", description:"Donate Stars for team boost", amount:stars, payload: JSON.stringify({t:"donation", userId, stars}) }) });
      const data = await resp.json();
      if (data?.ok && data?.url){
        if (tg?.openInvoice) { tg.openInvoice(data.url, ()=>{}); } else { window.location.href = data.url; }
      }
    }catch(e){ console.log(e); }
  });

  function updateScores(){ elIsrael.textContent=String(score.israel); elGaza.textContent=String(score.gaza); }
  score.israel=2184; score.gaza=5; updateScores(); $("#stars-input").value=610;
})();