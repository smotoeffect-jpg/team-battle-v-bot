document.addEventListener("DOMContentLoaded", () => {
  const startBtn = document.getElementById("start-btn");
  const scoreDisplay = document.getElementById("score");
  let score = 0;

  startBtn.addEventListener("click", () => {
    score++;
    scoreDisplay.innerText = `ניקוד: ${score}`;
  });
});
