const api = "/api";
const userId = Math.floor(Math.random() * 999999).toString();
let team = "israel";

async function tap() {
  const r = await fetch(`${api}/tap`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId }),
  });
  const d = await r.json();
  if (d.ok) updateScores(d.scores);
}

async function superBoost() {
  const r = await fetch(`${api}/super`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId }),
  });
  const d = await r.json();
  if (d.ok) updateScores(d.scores);
}

async function donateStars() {
  const stars = Number(document.getElementById("stars").value);
  const r = await fetch(`${api}/create-invoice`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, team, stars }),
  });
  const d = await r.json();
  if (d.ok) window.Telegram.WebApp.openInvoice(d.url);
}

function updateScores(s) {
  document.getElementById("teamA-score").textContent = s.israel;
  document.getElementById("teamB-score").textContent = s.gaza;
}

function copyRef() {
  const input = document.getElementById("refLink");
  input.select();
  document.execCommand("copy");
  alert("קישור הועתק");
}

async function refresh() {
  const r = await fetch(`${api}/state`);
  const d = await r.json();
  if (d.ok) updateScores(d.scores);
}
refresh();
setInterval(refresh, 4000);
