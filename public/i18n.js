// ====== Translations (Full Multilingual Map) ======
const i18n = {
  en: {
    // 🏁 General
    israel: "Israel",
    gaza: "Gaza",
    tap: "Tap (+1)",
    superBoost: "Super Boost (+25)",
    switchTeam: "Switch Team",
    extraTap: "Extra Tap",
    myBoard: "My Board",
    stars: "Stars / Extra Tap",
    playerLevel: "Player Level",
    referrals: "Invited Friends",
    tapsToday: "Taps today",
    top20: "Top 20",
    copied: "Copied!",
    err: "Something went wrong",
    partnerTitle: "Affiliate Program",
    copy: "Copy Link",
    chooseTeam: "Choose your team",
    battleShort: "$Battle",
    incomeShort: "Income",
    buy: "BUY", // 🆕 Added

    // ⚙️ Upgrades + Battery
    upgradesTitle: "Upgrades",
    batteryLevel: "Battery Level",
    batteryCap: "Capacity",
    batteryCost: "Cost",
    upgradeBattery: "Upgrade Battery",
    upgradeBatteryBtn: "Upgrade Battery",
    comingSoon: "⚙️ Upgrade your power, energy and rewards!",

    // 💎 VIP
    vipStatusLabel: "VIP Status",
    vipCost: "Cost",
    buyVip: "Buy VIP",
    vipActive: "Active",
    vipInactive: "Inactive",
    vipTimeLeft: "Time Left",

    // ❗ VIP info popup
    vipInfoText:
      "🔥 VIP Benefits:\n\n• +25% Tap Power\n• Passive income ×5\n• Battery ×3\n• 25% Battle discount\n• Duration: 7 days",

    // 🧭 Bottom Navigation
    navHome: "Home",
    navMyTeam: "My Team",
    navUpgrades: "Upgrades",
    navLeaderboard: "Leaderboard",
    navReferrals: "Referrals"
  },

  he: {
    // 🏁 כללי
    israel: "ישראל",
    gaza: "עזה",
    tap: "טאפ (+1)",
    superBoost: "סופר בוסט (+25)",
    switchTeam: "החלף קבוצה",
    extraTap: "Extra Tap",
    myBoard: "הלוח שלי",
    stars: "כוכבים / Extra Tap",
    playerLevel: "רמת שחקן",
    referrals: "מוזמנים",
    tapsToday: "טאפים היום",
    top20: "טופ 20",
    copied: "הועתק!",
    err: "אירעה שגיאה",
    partnerTitle: "תוכנית שותפים",
    copy: "העתק קישור",
    chooseTeam: "בחר את הקבוצה שלך",
    battleShort: "$Battle",
    incomeShort: "הכנסה",
    buy: "קנה", // 🆕 Added

    // ⚙️ שדרוגים + בטרייה
    upgradesTitle: "שדרוגים",
    batteryLevel: "רמת בטרייה",
    batteryCap: "קיבולת",
    batteryCost: "עלות",
    upgradeBattery: "שדרג בטרייה",
    upgradeBatteryBtn: "שדרוג בטרייה",
    comingSoon: "⚙️ שדרג את העוצמה, האנרגיה והפרסים שלך!",

    // 💎 VIP
    vipStatusLabel: "מצב VIP",
    vipCost: "עלות",
    buyVip: "קנה VIP",
    vipActive: "פעיל",
    vipInactive: "לא פעיל",
    vipTimeLeft: "זמן שנותר",

    // ❗ VIP info popup
    vipInfoText:
      "🔥 יתרונות VIP:\n\n• ‎+25% כוח לטאפ\n• הכנסה פסיבית ×5\n• בטרייה ×3\n• ‎25% הנחה בשדרוגים\n• תוקף: 7 ימים",

    // 🧭 סרגל תחתון
    navHome: "בית",
    navMyTeam: "הקבוצה שלי",
    navUpgrades: "שדרוגים",
    navLeaderboard: "לוח מובילים",
    navReferrals: "שותפים"
  },

  ar: {
    // 🏁 عام
    israel: "إسرائيل",
    gaza: "غزة",
    tap: "انقر (+1)",
    superBoost: "دفعة قوية (+25)",
    switchTeam: "بدّل الفريق",
    extraTap: "Extra Tap",
    myBoard: "لوحتي",
    stars: "نجوم / Extra Tap",
    playerLevel: "مستوى اللاعب",
    referrals: "الأصدقاء المدعوون",
    tapsToday: "نقرات اليوم",
    top20: "أفضل 20",
    copied: "تم النسخ!",
    err: "حدث خطأ ما",
    partnerTitle: "برنامج الإحالة",
    copy: "انسخ الرابط",
    chooseTeam: "اختر فريقك",
    battleShort: "$Battle",
    incomeShort: "الدخل",
    buy: "شراء", // 🆕 Added

    // ⚙️ الترقيات + البطارية
    upgradesTitle: "الترقيات",
    batteryLevel: "مستوى البطارية",
    batteryCap: "السعة",
    batteryCost: "التكلفة",
    upgradeBattery: "ترقية البطارية",
    upgradeBatteryBtn: "ترقية البطارية",
    comingSoon: "⚙️ قم بترقية قوتك وطاقتك ومكافآتك!",

    // 💎 VIP
    vipStatusLabel: "حالة VIP",
    vipCost: "التكلفة",
    buyVip: "شراء VIP",
    vipActive: "نشط",
    vipInactive: "غير نشط",
    vipTimeLeft: "الوقت المتبقي",

    // ❗ VIP info popup
    vipInfoText:
      "🔥 مزايا VIP:\n\n• ‎+25% قوة النقرة\n• دخل سلبي ×5\n• بطارية ×3\n• خصم 25%\n• مدة: 7 أيام",

    // 🧭 شريط التنقل السفلي
    navHome: "الرئيسية",
    navMyTeam: "فريقي",
    navUpgrades: "الترقيات",
    navLeaderboard: "المتصدرون",
    navReferrals: "الإحالات"
  }
};

function getLang() {
  return document.documentElement.getAttribute("data-lang") || "he";
}

// ⬅️ שורה חדשה – מחבר את הפונקציה ל-window
window.getLang = getLang;

function setLang(l) {
  document.documentElement.setAttribute("data-lang", l);
  localStorage.setItem("tb_lang", l);

  document.querySelectorAll("[data-i18n]").forEach(el => {
    const k = el.getAttribute("data-i18n");
    el.textContent = i18n[l]?.[k] || k;
  });

  // 🪖 TB_V19 — רענון MyTeam בעת שינוי שפה
  const active = document.querySelector(".bottom-nav .active")?.dataset?.panel;
  if (active === "myteam") {
    loadMyTeamCategories(l);
    loadMyTeamItems(null, l);
  }
}


const langBtns = document.querySelectorAll(".lang-switch [data-lang]");
if (langBtns && langBtns.length) {
  langBtns.forEach(btn =>
    btn.addEventListener("click", () => setLang(btn.dataset.lang))
  );
}


(function () {
  const s = localStorage.getItem("tb_lang");
  if (s) {
    setLang(s);
  } else {
    const t = (navigator.language || "he").slice(0, 2);
    setLang(["he", "en", "ar"].includes(t) ? t : "he");
  }
})();
