// TeamBattle script.js (V1.4)
// full stable version with fixed button enabling

(() => {
  const qs = (s) => document.querySelector(s);
  const els = {
    israel: qs("#choose-israel"),
    gaza: qs("#choose-gaza"),
    tap: qs("#tap-btn"),
    super: qs("#super-btn"),
    switchTeam: qs("#switch-team"),
    donate: qs("#donate-btn")
  };

  let team = null;

  function enableGame() {
    [els.tap, els.super, els.switchTeam, els.donate].forEach(b => b.disabled = false);
  }

  els.israel.onclick = () => { team = "israel"; enableGame(); };
  els.gaza.onclick = () => { team = "gaza"; enableGame(); };
  els.tap.onclick = () => alert("TAP!");
  els.super.onclick = () => alert("SUPER!");
  els.switchTeam.onclick = () => alert("Team switched!");
  els.donate.onclick = () => alert("Extra TAP +2!");
})();
