document.addEventListener("DOMContentLoaded", () => {
  const chooseIL = document.getElementById("choose-israel");
  const chooseGA = document.getElementById("choose-gaza");
  const tapBtn = document.getElementById("tap-btn");
  const superBtn = document.getElementById("super-btn");
  const donateBtn = document.getElementById("donate-btn");

  let team = null;

  chooseIL.addEventListener("click", () => {
    team = "israel";
    alert("Team Israel Selected!");
  });

  chooseGA.addEventListener("click", () => {
    team = "gaza";
    alert("Team Gaza Selected!");
  });

  tapBtn.addEventListener("click", () => {
    if (!team) return alert("Please select a team first!");
    console.log("Tap sent!");
  });

  superBtn.addEventListener("click", () => {
    if (!team) return alert("Please select a team first!");
    console.log("Super activated!");
  });

  donateBtn.addEventListener("click", () => {
    if (!team) return alert("Please select a team first!");
    console.log("Extra Tap +2 triggered!");
  });
});