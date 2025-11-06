(function(){
  const qs = (s)=>document.querySelector(s);
  const scoreIL = qs('#score-israel'), scoreGA = qs('#score-gaza');
  const teamIL = qs('#team-israel'), teamGA = qs('#team-gaza');
  const balanceEl = qs('#battle-balance'), incomeEl = qs('#battle-income');
  const tapBtn = qs('#tap-btn');
  const upgradesToggle = qs('#upgrades-toggle'), upgradesSection = qs('#upgrades-section');
  const myTeamToggle = qs('#myteam-toggle'), myTeamSection = qs('#myteam-section');

  const urlParams = new URLSearchParams(location.search);
  const userId = urlParams.get('uid') || localStorage.getItem('tb_userId') || String(Math.floor(Math.random()*1e9));
  localStorage.setItem('tb_userId', userId);
  window.TB_USER_ID = userId;

  tapBtn.textContent = I18N.t('tap');
  upgradesToggle.textContent = I18N.t('upgrades');
  myTeamToggle.textContent = I18N.t('myTeam');

  upgradesToggle.addEventListener('click', ()=> upgradesSection.toggleAttribute('hidden'));
  myTeamToggle.addEventListener('click', ()=> myTeamSection.toggleAttribute('hidden'));

  let state = { scores:{israel:0,gaza:0}, user:null };

  async function fetchSnapshot(){
    const r = await fetch(`/api/user/${userId}`);
    state = await r.json();
    render();
  }
  function render(){
    if (!state || !state.user) return;
    scoreIL.textContent = state.scores.israel||0;
    scoreGA.textContent = state.scores.gaza||0;
    balanceEl.textContent = `$Battle: ${Math.floor(state.user.battle)}`;
    incomeEl.textContent = `| Income: ${state.user.incomePerSec}/sec`;
    [teamIL,teamGA].forEach(b=>b.classList.remove('active'));
    if (state.user.team==='israel') teamIL.classList.add('active');
    if (state.user.team==='gaza') teamGA.classList.add('active');
    window.TB_Upgrades && window.TB_Upgrades.render(state.user, userId);
    window.TB_MyTeam && window.TB_MyTeam.render(state.user, userId);
  }

  teamIL.addEventListener('click', ()=> chooseTeam('israel'));
  teamGA.addEventListener('click', ()=> chooseTeam('gaza'));
  async function chooseTeam(team){
    await fetch(`/api/user/${userId}/team`, {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ team })});
    await fetchSnapshot();
  }

  tapBtn.addEventListener('click', async ()=>{
    tapBtn.disabled = true;
    try{
      await fetch(`/api/user/${userId}/tap`, {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ amount: 1 })});
      await fetchSnapshot();
    } finally {
      tapBtn.disabled = false;
    }
  });

  setInterval(fetchSnapshot, 1000);
  fetchSnapshot();
})();