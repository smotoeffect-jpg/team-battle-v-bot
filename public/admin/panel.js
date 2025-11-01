(async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const userId = urlParams.get("userId");
  const elWelcome = document.getElementById("welcome");

  if (!userId) {
    elWelcome.textContent = "❌ מזהה משתמש חסר.";
    return;
  }

  try {
    const r = await fetch(`/api/panel/auth?userId=${encodeURIComponent(userId)}`);
    const j = await r.json();

    if (j.ok) {
      elWelcome.textContent = `שלום, מנהל ${j.name} 👋`;
    } else {
      elWelcome.textContent = "❌ אין לך הרשאה לגשת לפאנל הניהול.";
    }
  } catch (e) {
    elWelcome.textContent = "⚠️ שגיאת חיבור לשרת.";
  }
})();
