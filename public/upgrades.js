window.TB_Upgrades=(function(){
  const host = document.getElementById('upgrades-section');
  if (!host) return;

  const el = { list: document.createElement('div') };
  host.appendChild(el.list);

  const STARS = {}; // prices/durations
  async function loadStars(){
    try{ const r = await fetch('/api/stars/products'); Object.assign(STARS, await r.json()); }catch(e){}
  }

  function row(label, desc, right){
    const wrap = document.createElement('div'); wrap.className='item';
    const left = document.createElement('div'); left.innerHTML = `<strong>${label}</strong><div class="badge">${desc||''}</div>`;
    const r = document.createElement('div'); r.appendChild(right);
    wrap.appendChild(left); wrap.appendChild(r);
    return wrap;
  }

  async function buyBattery(userId){
    const btn = document.querySelector('button[data-upg="battery"]');
    btn.disabled = true;
    try{
      const r = await fetch(`/api/user/${userId}/upgrade`, {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ key:'battery' })});
      const j = await r.json();
      if (!r.ok) alert(j.error||'Failed');
    } finally { btn.disabled=false; }
  }

  function starsBtn(key, label, userId){
    const product = STARS[key]||{};
    const b = document.createElement('button'); b.className='btn';
    const priceTxt = product.priceStars ? `⭐${product.priceStars}` : `⭐`;
    const durTxt = product.durationHours ? ` • ${Math.round(product.durationHours/24)}d` : '';
    b.textContent = `${label} • ${priceTxt}${durTxt}`;
    b.addEventListener('click', ()=>{
      if (typeof window.openInvoice === 'function'){
        window.openInvoice({
          title: `${label}`,
          payload: `stars:${key}:${window.TB_USER_ID}`,
          amountStars: product.priceStars||0
        });
      } else {
        alert('Payment unavailable.');
      }
    });
    return b;
  }

  function render(user, userId){
    window.TB_USER_ID = userId;
    el.list.innerHTML='';
    const batteryBtn = document.createElement('button'); batteryBtn.className='btn'; batteryBtn.dataset.upg='battery';
    batteryBtn.textContent = I18N.t('buy');
    batteryBtn.addEventListener('click', ()=> buyBattery(userId));
    el.list.appendChild(row(I18N.t('battery'), `${I18N.t('price')}: dynamic`, batteryBtn));

    el.list.appendChild(row(I18N.t('vip'), `⭐`, starsBtn('vip','VIP', userId)));
    el.list.appendChild(row(I18N.t('autoclicker'), `⭐`, starsBtn('autoclicker','Auto Clicker', userId)));
    el.list.appendChild(row(I18N.t('offline'), `⭐`, starsBtn('offline','Offline', userId)));
  }

  loadStars();
  return {render};
})();