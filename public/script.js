document.addEventListener("DOMContentLoaded", () => {
  const WebApp = window.Telegram?.WebApp;
  if (WebApp) { try { WebApp.ready(); WebApp.expand(); } catch(_){} }

  // ===== Detect Telegram user or create fallback ID =====
  let telegramUserId = null;
  try {
    console.log("initDataUnsafe =", WebApp?.initDataUnsafe);
    telegramUserId = WebApp?.initDataUnsafe?.user?.id || null;
  } catch (e) {
    console.error("Cannot read Telegram user info:", e);
  }

  if (!telegramUserId) {
    // fallback temporary id for non-Telegram usage
    telegramUserId = localStorage.getItem("tb_fallback_id");
    if (!telegramUserId) {
      telegramUserId = "guest_" + Math.floor(Math.random() * 9999999);
      localStorage.setItem("tb_fallback_id", telegramUserId);
    }
  }
  console.log("Active userId:", telegramUserId);

  // ====== Translations ======
  const i18n = {
    en:{israel:"Israel",gaza:"Gaza",tap:"Tap (+1)",superBoost:"Super Boost (+25)",switchTeam:"Switch Team",extraTap:"Extra Tap",myBoard:"My Board",stars:"Stars / Extra Tap",playerLevel:"Player Level",referrals:"Invited Friends",tapsToday:"Taps today",top20:"Top 20",copied:"Copied!",err:"Something went wrong",partnerTitle:"Affiliate Program",copy:"Copy Link"},
    he:{israel:"ישראל",gaza:"עזה",tap:"טאפ (+1)",superBoost:"סופר בוסט (+25)",switchTeam:"החלף קבוצה",extraTap:"Extra Tap",myBoard:"הלוח שלי",stars:"כוכבים / Extra Tap",playerLevel:"רמת שחקן",referrals:"מוזמנים",tapsToday:"טאפים היום",top20:"טופ 20",copied:"הועתק!",err:"אירעה שגיאה",partnerTitle:"תוכנית שותפים",copy:"העתק קישור"},
    ar:{israel:"إسرائيل",gaza:"غزة",tap:"انقر (+1)",superBoost:"دفعة قوية (+25)",switchTeam:"بدّل الفريق",extraTap:"Extra Tap",myBoard:"لوحتي",stars:"نجوم / Extra Tap",playerLevel:"مستوى اللاعب",referrals:"الأصدقاء المدعوون",tapsToday:"نقرات اليوم",top20:"أفضل 20",copied:"تم النسخ!",err:"حدث خطأ ما",partnerTitle:"برنامج الإحالة",copy:"انسخ الرابط"}
  };

  function getLang(){ return document.documentElement.getAttribute('data-lang') || 'he'; }
  function setLang(l){
    document.documentElement.setAttribute('data-lang', l);
    localStorage.setItem('tb_lang', l);
    document.querySelectorAll('[data-i18n]').forEach(el=>{
      const k = el.getAttribute('data-i18n');
      el.textContent = i18n[l]?.[k] || k;
    });
  }

  const langBtns = document.querySelectorAll('.lang-switch [data-lang]');
  if (langBtns && langBtns.length) {
    langBtns.forEach(btn => btn.addEventListener('click',()=>setLang(btn.dataset.lang)));
  }

  (function(){
    const s=localStorage.getItem('tb_lang');
    if(s) setLang(s); else { const t=(navigator.language||'he').slice(0,2); setLang(['he','en','ar'].includes(t)?t:'he'); }
  })();

  // ===== API helpers =====
  const headers = {}; 
  try { if(WebApp?.initData) headers['X-Init-Data'] = WebApp.initData; } catch(_){}
// ✅ תיקון: ודא שתמיד יש userId כלשהו בכותרת
if (telegramUserId) {
  headers['X-Telegram-UserId'] = telegramUserId;
}
  async function getJSON(u){ const r=await fetch(u,{headers}); if(!r.ok) throw new Error('HTTP '+r.status); return r.json(); }
  async function postJSON(u,b){ const r=await fetch(u,{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(b||{})}); if(!r.ok) throw new Error('HTTP '+r.status); return r.json(); }
  function setText(id,txt){ const el=document.getElementById(id); if(el) el.textContent=txt; }

  // ===== Game state =====
  let GAME={scores:{israel:0,gaza:0},me:{id:null,team:null,tapsToday:0,tapsLimit:300,level:1,referrals:0,stars:0,username:null},leaderboard:[]};

  function paintScores(){ setText('score-israel-value', GAME.scores?.israel??0); setText('score-gaza-value', GAME.scores?.gaza??0); }
  function paintMe(){
    setText('me-stars', String(GAME.me.stars ?? '–'));
    setText('me-level', String(GAME.me.level ?? '–'));
    setText('me-referrals', String(GAME.me.referrals ?? '–'));
    setText('me-taps', `${GAME.me.tapsToday ?? 0}/${GAME.me.tapsLimit ?? 300}`);
  }
  function paintTop20(){
    const ul=document.getElementById('top20-list'); if(!ul) return; ul.innerHTML='';
    (GAME.leaderboard||[]).forEach((p,idx)=>{
      const li=document.createElement('li');
      const name=document.createElement('span'); name.className='name';
      const pts=document.createElement('span'); pts.className='pts';
      name.textContent = p.username ? p.username : `Player #${idx+1}`;
      pts.textContent = (p.points ?? p.score ?? 0) + ' pts';
      li.appendChild(name); li.appendChild(pts); ul.appendChild(li);
    });
  }

  // ===== Refresh Game Data =====
  async function refreshAll(){
    try{
      const state=await getJSON('/api/state');
      if(state.scores) GAME.scores=state.scores;
      paintScores();
    }catch(_){}
    try{
      const me=await getJSON('/api/me?userId='+telegramUserId);
      GAME.me={
        id:me.id??me.userId??me.user_id??telegramUserId,
        team:me.team??null,
        tapsToday:me.tapsToday??me.taps_today??me.taps??0,
        tapsLimit:me.tapsLimit??me.taps_limit??300,
        level:me.level??1,
        referrals:me.referrals??me.invited??0,
        stars:me.stars??me.balance??0,
        username:me.username??null
      };
      paintMe();

      // ===== Affiliate / Referral Section =====
      try{
        const bot="TeamBattle_vBot"; 
        const uid = GAME.me.id;
        const refLink = uid ? `https://t.me/${bot}/app?start_param=${uid}` : "";
        const inp=document.getElementById("ref-link");
        const cpy=document.getElementById("copy-ref");
        const shr=document.getElementById("share-ref");
        if(inp) inp.value = refLink;
        if(cpy) cpy.addEventListener("click", async ()=>{
          try{ await navigator.clipboard.writeText(refLink); }catch(_){}
          const l=getLang(); const old=cpy.textContent; cpy.textContent=i18n[l]?.copied||"Copied!"; setTimeout(()=>cpy.textContent=old,1100);
        });
        if(shr) shr.addEventListener("click", ()=>{
          const url = `https://t.me/share/url?url=${encodeURIComponent(refLink)}`;
          window.open(url,"_blank");
        });
      }catch(_){}

    }catch(_){}
    try{
      const lb=await getJSON('/api/leaderboard');
      if(Array.isArray(lb)) GAME.leaderboard=lb.slice(0,20);
      else if(Array.isArray(lb?.leaders)) GAME.leaderboard=lb.leaders.slice(0,20);
      paintTop20();
    }catch(_){}
  }

  setInterval(refreshAll, 5000);
  refreshAll();

  // ===== Status Bar =====
  const statusLine=document.getElementById('status-line');
  function flashStatus(m){ if(!statusLine) return; statusLine.textContent=m; statusLine.style.opacity='1'; setTimeout(()=>statusLine.style.opacity='0.7',1600); }

  // ===== Buttons =====
  const btnTap=document.getElementById('btn-tap');
  if(btnTap) btnTap.addEventListener('click',async()=>{ 
    try{ await postJSON('/api/tap',{userId:GAME.me.id}); await refreshAll(); } 
    catch(_){ flashStatus(i18n[getLang()].err); } 
  });

  const btnSuper=document.getElementById('btn-super');
  if(btnSuper) btnSuper.addEventListener('click',async()=>{ 
    try{ await postJSON('/api/super',{userId:GAME.me.id}); await refreshAll(); } 
    catch(_){ flashStatus(i18n[getLang()].err); } 
  });

  const btnSwitch=document.getElementById('btn-switch');
  if(btnSwitch) btnSwitch.addEventListener('click',async()=>{ 
    try{
      const to = (GAME.me.team==='israel')?'gaza':'israel';
      await postJSON('/api/switch-team',{userId:GAME.me.id,newTeam:to}); 
      await refreshAll();
    }catch(_){ flashStatus(i18n[getLang()].err); } 
  });

  const btnExtra=document.getElementById('btn-extra');
  if(btnExtra) btnExtra.addEventListener('click', async ()=>{
    const starsInput=document.getElementById('stars-input');
    const amount = Math.max(1, Math.min(1000, parseInt(starsInput?.value || '0')));
    try{
      const r=await postJSON('/api/create-invoice',{ userId:GAME.me.id, team:GAME.me.team, stars:amount });
      if(r?.ok && r.url){
        if(WebApp?.openInvoice){ WebApp.openInvoice(r.url, ()=>refreshAll()); }
        else{ window.location.href=r.url; }
      }
    }catch(_){ flashStatus(i18n[getLang()].err); }
  });
});
