window.TB_MyTeam=(function(){
  const host = document.getElementById('myteam-section');
  if (!host) return;

  const el = { list: document.createElement('div') };
  host.appendChild(el.list);

  const CATALOG = [
    { key:'missiles', label:'Missiles', bonus:'+2/sec' },
    { key:'weapons',  label:'Weapons',  bonus:'+1/sec' },
    { key:'soldiers', label:'Soldiers', bonus:'+1/sec' },
    { key:'tanks',    label:'Tanks',    bonus:'+5/sec' },
    { key:'vehicles', label:'Vehicles', bonus:'+3/sec' },
    { key:'aircraft', label:'Aircraft', bonus:'+7/sec' },
    { key:'ships',    label:'Ships',    bonus:'+6/sec' },
    { key:'countries',label:'Countries',bonus:'+25/sec' }
  ];

  function buyBtn(itemKey, userId){
    const b = document.createElement('button'); b.className='btn'; b.textContent = I18N.t('buy');
    b.addEventListener('click', async ()=>{
      b.disabled = true;
      try{
        const r = await fetch(`/api/user/${userId}/myteam/buy`, {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ itemKey })});
        const j = await r.json();
        if (!r.ok) alert(j.error||'Failed');
        else window.dispatchEvent(new Event('tb:refresh'));
      } finally { b.disabled=false; }
    });
    return b;
  }

  function render(user, userId){
    el.list.innerHTML='';
    CATALOG.forEach(row=>{
      const right = buyBtn(row.key, userId);
      const level = (user.myTeam && user.myTeam[row.key] && user.myTeam[row.key].level) || 0;
      const left = document.createElement('div'); left.innerHTML = `<strong>${row.label}</strong> <span class="badge">Lv.${level}</span> <span class="badge">${row.bonus}</span>`;
      const wrap = document.createElement('div'); wrap.className='item';
      const rightWrap = document.createElement('div'); rightWrap.appendChild(right);
      wrap.appendChild(left); wrap.appendChild(rightWrap);
      el.list.appendChild(wrap);
    });
  }

  return {render};
})();