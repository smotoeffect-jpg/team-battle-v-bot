
/* ================== script.js (fixed) ================== */

// מניעת זום וגלילה לא רצויה במשחק הקליקר
document.addEventListener('gesturestart', e => e.preventDefault());
document.addEventListener('dblclick', e => e.preventDefault());
document.addEventListener('touchmove', e => e.scale !== 1 && e.preventDefault(), { passive: false });
document.body.style.touchAction = 'manipulation';

// === main logic ===
(async function(){
  const API_BASE = window.location.origin;
  const elIL = document.getElementById('choose-israel');
  const elGA = document.getElementById('choose-gaza');
  const elTap = document.getElementById('tap-btn');
  const elSuper = document.getElementById('super-btn');
  const elDonate = document.getElementById('donate-btn');
  const elBanner = document.getElementById('tb-xp-banner');

  let USER_ID = null;
  try { USER_ID = Telegram?.WebApp?.initDataUnsafe?.user?.id; } catch(_){}
  if (!USER_ID) {
    USER_ID = localStorage.getItem('tb_user_id') || String(Math.floor(Math.random()*1e12));
    localStorage.setItem('tb_user_id', USER_ID);
  }

  const post = (p,b)=>fetch(API_BASE+p,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)}).then(r=>r.json()).catch(()=>({}));
  const get  = (p)=>fetch(API_BASE+p).then(r=>r.json()).catch(()=>({}));

  function toast(msg){ console.log(msg); }

  async function selectTeam(team){
    const j = await post('/api/select-team',{userId:USER_ID,team});
    if(j.ok){ toast('Team selected: '+team); await fetchState(); }
  }

  async function tap(){
    const j = await post('/api/tap',{userId:USER_ID});
    if(!j.ok && j.error==='limit') toast('Daily limit reached');
  }

  async function superBoost(){
    const j = await post('/api/super',{userId:USER_ID});
    if(!j.ok && j.error==='limit') toast('Super boost used today');
  }

  async function donate(){
    const j = await post('/api/create-invoice',{userId:USER_ID,team:null,stars:1});
    if(j.ok && j.url){ window.Telegram?.WebApp?.openInvoice(j.url); }
  }

  async function fetchState(){
    const j = await get('/api/state');
    if(j.ok && j.doubleXP){
      renderDoubleXpBanner(j.doubleXP.on);
    }
  }

  window.renderDoubleXpBanner = function(active){
    if(!elBanner) return;
    if(active){
      elBanner.textContent = '🔥 XP מוכפל פעיל! ⚡';
      elBanner.className = 'neon pulse';
    } else {
      elBanner.textContent = '⚡ XP רגיל';
      elBanner.className = '';
    }
  };

  if(elIL) elIL.onclick = ()=>selectTeam('israel');
  if(elGA) elGA.onclick = ()=>selectTeam('gaza');
  if(elTap) elTap.onclick = tap;
  if(elSuper) elSuper.onclick = superBoost;
  if(elDonate) elDonate.onclick = donate;

  try { Telegram?.WebApp?.ready(); } catch(_){}
  fetchState();
})();
