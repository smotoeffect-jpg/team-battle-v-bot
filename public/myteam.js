// ===== TB_V19 — My Team Config (Data only, no UI yet) =====

// קטגוריות My Team – אייקון כללי + תווית ב־3 שפות
const MYTEAM_CATEGORIES = {
  weapons: {
    id: "weapons",
    icon: "assets/myteam/categories/weapons.png",
    labels: {
      en: "Weapons",
      he: "נשק",
      ar: "أسلحة"
    }
  },
  vehicles: {
    id: "vehicles",
    icon: "assets/myteam/categories/vehicles.png",
    labels: {
      en: "Vehicles",
      he: "רכבים",
      ar: "مركبات"
    }
  },
  soldiers: {
    id: "soldiers",
    icon: "assets/myteam/categories/soldiers.png",
    labels: {
      en: "Soldiers",
      he: "חיילים",
      ar: "جنود"
    }
  },
  tanks: {
    id: "tanks",
    icon: "assets/myteam/categories/tanks.png",
    labels: {
      en: "Tanks",
      he: "טנקים",
      ar: "دبابات"
    }
  },
  missiles: {
    id: "missiles",
    icon: "assets/myteam/categories/missiles.png",
    labels: {
      en: "Missiles & Artillery",
      he: "טילים וארטילריה",
      ar: "صواريخ ومدفعية"
    }
  },
  ships: {
    id: "ships",
    icon: "assets/myteam/categories/ships.png",
    labels: {
      en: "Ships",
      he: "ספינות",
      ar: "سفن"
    }
  },
  aircraft: {
    id: "aircraft",
    icon: "assets/myteam/categories/aircraft.png",
    labels: {
      en: "Aircraft",
      he: "מטוסים",
      ar: "طائرات"
    }
  },
  countries: {
    id: "countries",
    icon: "assets/myteam/categories/allies.png",
    labels: {
      en: "Allies",
      he: "בעלות ברית",
      ar: "حلفاء"
    }
  }
};

// ===== רשימת פריטים — ריאליסטי, שמות אמיתיים =====
const MYTEAM_ITEMS = [
  // ==== Weapons ====
  {
    id: "ak47",
    category: "weapons",
    icon: "assets/myteam/weapons/ak47.png",
    names: {
      en: "AK-47 Assault Rifle",
      he: "רובה סער AK-47",
      ar: "بندقية هجومية AK-47"
    },
    baseCost: 50,
    costMultiplier: 1.30,
    baseIncome: 0.10,
    incomeMultiplier: 1.12
  },
  {
    id: "m4a1",
    category: "weapons",
    icon: "assets/myteam/weapons/m4a1.png",
    names: {
      en: "M4A1 Carbine",
      he: "קרבין M4A1",
      ar: "كاربين M4A1"
    },
    baseCost: 80,
    costMultiplier: 1.32,
    baseIncome: 0.18,
    incomeMultiplier: 1.13
  },
  {
    id: "glock17",
    category: "weapons",
    icon: "assets/myteam/weapons/glock17.png",
    names: {
      en: "Glock 17 Pistol",
      he: "אקדח גלוק 17",
      ar: "مسدس غلوك 17"
    },
    baseCost: 30,
    costMultiplier: 1.28,
    baseIncome: 0.06,
    incomeMultiplier: 1.10
  },
  {
    id: "desert_eagle",
    category: "weapons",
    icon: "assets/myteam/weapons/desert_eagle.png",
    names: {
      en: "Desert Eagle",
      he: "דזרט איגל",
      ar: "ديزرت إيغل"
    },
    baseCost: 120,
    costMultiplier: 1.35,
    baseIncome: 0.30,
    incomeMultiplier: 1.15
  },
  {
    id: "uzi",
    category: "weapons",
    icon: "assets/myteam/weapons/uzi.png",
    names: {
      en: "UZI SMG",
      he: "תת-מקלע עוזי",
      ar: "رشاش عوزي"
    },
    baseCost: 70,
    costMultiplier: 1.31,
    baseIncome: 0.16,
    incomeMultiplier: 1.13
  },
  {
    id: "m249",
    category: "weapons",
    icon: "assets/myteam/weapons/m249.png",
    names: {
      en: "M249 SAW",
      he: "מקלען M249 SAW",
      ar: "رشاش M249 SAW"
    },
    baseCost: 150,
    costMultiplier: 1.36,
    baseIncome: 0.40,
    incomeMultiplier: 1.16
  },
  {
    id: "barrett_m82",
    category: "weapons",
    icon: "assets/myteam/weapons/barrett_m82.png",
    names: {
      en: "Barrett M82 Sniper",
      he: "צלף Barrett M82",
      ar: "قناصة باريت M82"
    },
    baseCost: 220,
    costMultiplier: 1.38,
    baseIncome: 0.70,
    incomeMultiplier: 1.18
  },
  {
    id: "rpg7",
    category: "weapons",
    icon: "assets/myteam/weapons/rpg7.png",
    names: {
      en: "RPG-7 Launcher",
      he: "מטול RPG-7",
      ar: "قاذف RPG-7"
    },
    baseCost: 260,
    costMultiplier: 1.40,
    baseIncome: 0.90,
    incomeMultiplier: 1.18
  },
  {
    id: "tavor_x95",
    category: "weapons",
    icon: "assets/myteam/weapons/tavor_x95.png",
    names: {
      en: "Tavor X95",
      he: "תבור X95",
      ar: "تافور X95"
    },
    baseCost: 130,
    costMultiplier: 1.33,
    baseIncome: 0.28,
    incomeMultiplier: 1.14
  },

  // ==== Soldiers ====
  {
    id: "infantry_basic",
    category: "soldiers",
    icon: "assets/myteam/soldiers/infantry_basic.png",
    names: {
      en: "Basic Infantry Squad",
      he: "כיתת חי\"ר בסיסית",
      ar: "فرقة مشاة أساسية"
    },
    baseCost: 40,
    costMultiplier: 1.28,
    baseIncome: 0.12,
    incomeMultiplier: 1.13
  },
  {
    id: "infantry_elite",
    category: "soldiers",
    icon: "assets/myteam/soldiers/infantry_elite.png",
    names: {
      en: "Elite Infantry",
      he: "חי\"ר מובחר",
      ar: "مشاة نخبة"
    },
    baseCost: 180,
    costMultiplier: 1.32,
    baseIncome: 0.60,
    incomeMultiplier: 1.15
  },
  {
    id: "commando_squad",
    category: "soldiers",
    icon: "assets/myteam/soldiers/commando_squad.png",
    names: {
      en: "Commando Squad",
      he: "כוח קומנדו",
      ar: "فريق كوماندوز"
    },
    baseCost: 520,
    costMultiplier: 1.35,
    baseIncome: 1.80,
    incomeMultiplier: 1.18
  },
  {
    id: "sniper_team",
    category: "soldiers",
    icon: "assets/myteam/soldiers/sniper_team.png",
    names: {
      en: "Sniper Team",
      he: "צוות צלפים",
      ar: "فريق قناصة"
    },
    baseCost: 260,
    costMultiplier: 1.33,
    baseIncome: 0.85,
    incomeMultiplier: 1.16
  },
  {
    id: "anti_tank_team",
    category: "soldiers",
    icon: "assets/myteam/soldiers/anti_tank_team.png",
    names: {
      en: "Anti-Tank Team",
      he: "צוות נ\"ט",
      ar: "فريق مضاد للدبابات"
    },
    baseCost: 420,
    costMultiplier: 1.36,
    baseIncome: 1.40,
    incomeMultiplier: 1.18
  },
  {
    id: "commander_team",
    category: "soldiers",
    icon: "assets/myteam/soldiers/commander_team.png",
    names: {
      en: "Command Team",
      he: "צוות פיקוד",
      ar: "طاقم قيادة"
    },
    baseCost: 900,
    costMultiplier: 1.38,
    baseIncome: 3.20,
    incomeMultiplier: 1.20
  },

  // ==== Vehicles ====
  {
    id: "armored_jeep",
    category: "vehicles",
    icon: "assets/myteam/vehicles/armored_jeep.png",
    names: {
      en: "Armored Jeep",
      he: "ג'יפ ממוגן",
      ar: "جيب مصفح"
    },
    baseCost: 200,
    costMultiplier: 1.32,
    baseIncome: 0.50,
    incomeMultiplier: 1.15
  },
  {
    id: "humvee",
    category: "vehicles",
    icon: "assets/myteam/vehicles/humvee.png",
    names: {
      en: "Humvee",
      he: "האמבי",
      ar: "همفي"
    },
    baseCost: 260,
    costMultiplier: 1.33,
    baseIncome: 0.70,
    incomeMultiplier: 1.16
  },
  {
    id: "namer_apc",
    category: "vehicles",
    icon: "assets/myteam/vehicles/namer_apc.png",
    names: {
      en: "Namer APC",
      he: "נגמ\"ש נמ"ר",
      ar: "ناقلة جنود نمر"
    },
    baseCost: 550,
    costMultiplier: 1.35,
    baseIncome: 1.40,
    incomeMultiplier: 1.17
  },
  {
    id: "mrap",
    category: "vehicles",
    icon: "assets/myteam/vehicles/mrap.png",
    names: {
      en: "MRAP Vehicle",
      he: "רכב MRAP",
      ar: "مركبة MRAP"
    },
    baseCost: 480,
    costMultiplier: 1.34,
    baseIncome: 1.20,
    incomeMultiplier: 1.17
  },
  {
    id: "supply_truck",
    category: "vehicles",
    icon: "assets/myteam/vehicles/supply_truck.png",
    names: {
      en: "Supply Truck",
      he: "משאית אספקה",
      ar: "شاحنة إمداد"
    },
    baseCost: 900,
    costMultiplier: 1.37,
    baseIncome: 2.50,
    incomeMultiplier: 1.18
  },
  {
    id: "armored_column",
    category: "vehicles",
    icon: "assets/myteam/vehicles/armored_column.png",
    names: {
      en: "Armored Column",
      he: "שיירת שריון",
      ar: "رتل مدرع"
    },
    baseCost: 1600,
    costMultiplier: 1.40,
    baseIncome: 4.00,
    incomeMultiplier: 1.20
  },

  // ==== Tanks ====
  {
    id: "merkava_mk2",
    category: "tanks",
    icon: "assets/myteam/tanks/merkava_mk2.png",
    names: {
      en: "Merkava Mk.2",
      he: "מרכבה סימן 2",
      ar: "ميركافا مارك 2"
    },
    baseCost: 600,
    costMultiplier: 1.35,
    baseIncome: 2.20,
    incomeMultiplier: 1.18
  },
  {
    id: "merkava_mk3",
    category: "tanks",
    icon: "assets/myteam/tanks/merkava_mk3.png",
    names: {
      en: "Merkava Mk.3",
      he: "מרכבה סימן 3",
      ar: "ميركافا مارك 3"
    },
    baseCost: 1200,
    costMultiplier: 1.38,
    baseIncome: 3.80,
    incomeMultiplier: 1.20
  },
  {
    id: "merkava_mk4",
    category: "tanks",
    icon: "assets/myteam/tanks/merkava_mk4.png",
    names: {
      en: "Merkava Mk.4",
      he: "מרכבה סימן 4",
      ar: "ميركافا مارك 4"
    },
    baseCost: 3200,
    costMultiplier: 1.42,
    baseIncome: 9.00,
    incomeMultiplier: 1.22
  },
  {
    id: "t72",
    category: "tanks",
    icon: "assets/myteam/tanks/t72.png",
    names: {
      en: "T-72 Main Battle Tank",
      he: "טנק T-72",
      ar: "دبابة T-72"
    },
    baseCost: 2100,
    costMultiplier: 1.40,
    baseIncome: 6.00,
    incomeMultiplier: 1.21
  },
  {
    id: "t90",
    category: "tanks",
    icon: "assets/myteam/tanks/t90.png",
    names: {
      en: "T-90 Main Battle Tank",
      he: "טנק T-90",
      ar: "دبابة T-90"
    },
    baseCost: 3800,
    costMultiplier: 1.44,
    baseIncome: 11.00,
    incomeMultiplier: 1.24
  },

  // ==== Missiles & Artillery ====
  {
    id: "mortar_120mm",
    category: "missiles",
    icon: "assets/myteam/missiles/mortar_120mm.png",
    names: {
      en: "120mm Mortar",
      he: "מרגמה 120 מ\"מ",
      ar: "هاون 120 ملم"
    },
    baseCost: 900,
    costMultiplier: 1.35,
    baseIncome: 3.00,
    incomeMultiplier: 1.18
  },
  {
    id: "howitzer_m109",
    category: "missiles",
    icon: "assets/myteam/missiles/howitzer_m109.png",
    names: {
      en: "M109 Howitzer",
      he: "תותח M109",
      ar: "مدفع هاوتزر M109"
    },
    baseCost: 1900,
    costMultiplier: 1.38,
    baseIncome: 6.50,
    incomeMultiplier: 1.21
  },
  {
    id: "grad_launcher",
    category: "missiles",
    icon: "assets/myteam/missiles/grad_launcher.png",
    names: {
      en: "BM-21 Grad Launcher",
      he: "משגר BM-21 גראד",
      ar: "قاذف BM-21 غراد"
    },
    baseCost: 2600,
    costMultiplier: 1.40,
    baseIncome: 9.00,
    incomeMultiplier: 1.22
  },
  {
    id: "iron_dome",
    category: "missiles",
    icon: "assets/myteam/missiles/iron_dome.png",
    names: {
      en: "Iron Dome Battery",
      he: "סוללת כיפת ברזל",
      ar: "منظومة القبة الحديدية"
    },
    baseCost: 4800,
    costMultiplier: 1.45,
    baseIncome: 15.00,
    incomeMultiplier: 1.25
  },
  {
    id: "anti_ship_missile",
    category: "missiles",
    icon: "assets/myteam/missiles/anti_ship_missile.png",
    names: {
      en: "Anti-Ship Missile",
      he: "טיל נגד ספינות",
      ar: "صاروخ مضاد للسفن"
    },
    baseCost: 5200,
    costMultiplier: 1.46,
    baseIncome: 17.00,
    incomeMultiplier: 1.25
  },

  // ==== Ships ====
  {
    id: "patrol_boat",
    category: "ships",
    icon: "assets/myteam/ships/patrol_boat.png",
    names: {
      en: "Patrol Boat",
      he: "ספינת סיור",
      ar: "زورق دورية"
    },
    baseCost: 1300,
    costMultiplier: 1.34,
    baseIncome: 4.00,
    incomeMultiplier: 1.18
  },
  {
    id: "saar_4",
    category: "ships",
    icon: "assets/myteam/ships/saar_4.png",
    names: {
      en: "Sa'ar 4 Corvette",
      he: "סער 4 קורבטה",
      ar: "ساعر 4 كورفيت"
    },
    baseCost: 3200,
    costMultiplier: 1.38,
    baseIncome: 9.00,
    incomeMultiplier: 1.22
  },
  {
    id: "saar_5",
    category: "ships",
    icon: "assets/myteam/ships/saar_5.png",
    names: {
      en: "Sa'ar 5 Corvette",
      he: "סער 5 קורבטה",
      ar: "ساعر 5 كورفيت"
    },
    baseCost: 5200,
    costMultiplier: 1.42,
    baseIncome: 14.00,
    incomeMultiplier: 1.24
  },
  {
    id: "destroyer",
    category: "ships",
    icon: "assets/myteam/ships/destroyer.png",
    names: {
      en: "Naval Destroyer",
      he: "משחתת ימית",
      ar: "مدمرة بحرية"
    },
    baseCost: 8200,
    costMultiplier: 1.46,
    baseIncome: 22.00,
    incomeMultiplier: 1.26
  },

  // ==== Aircraft ====
  {
    id: "heron_drone",
    category: "aircraft",
    icon: "assets/myteam/aircraft/heron_drone.png",
    names: {
      en: "Heron UAV",
      he: "כטב\"ם הרון",
      ar: "طائرة بدون طيار هيرون"
    },
    baseCost: 800,
    costMultiplier: 1.34,
    baseIncome: 2.80,
    incomeMultiplier: 1.18
  },
  {
    id: "reaper_drone",
    category: "aircraft",
    icon: "assets/myteam/aircraft/reaper_drone.png",
    names: {
      en: "MQ-9 Reaper",
      he: "כטב\"ם MQ-9 Reaper",
      ar: "الطائرة المسيرة ريبر MQ-9"
    },
    baseCost: 2600,
    costMultiplier: 1.38,
    baseIncome: 8.00,
    incomeMultiplier: 1.22
  },
  {
    id: "apache_ah64",
    category: "aircraft",
    icon: "assets/myteam/aircraft/apache_ah64.png",
    names: {
      en: "Apache AH-64",
      he: "מסוק אפאצ'י AH-64",
      ar: "مروحية أباتشي AH-64"
    },
    baseCost: 4200,
    costMultiplier: 1.42,
    baseIncome: 14.00,
    incomeMultiplier: 1.24
  },
  {
    id: "f16",
    category: "aircraft",
    icon: "assets/myteam/aircraft/f16.png",
    names: {
      en: "F-16 Fighter",
      he: "מטוס קרב F-16",
      ar: "مقاتلة F-16"
    },
    baseCost: 7800,
    costMultiplier: 1.45,
    baseIncome: 22.00,
    incomeMultiplier: 1.25
  },
  {
    id: "f35",
    category: "aircraft",
    icon: "assets/myteam/aircraft/f35.png",
    names: {
      en: "F-35 Lightning II",
      he: "מטוס F-35 לייטנינג II",
      ar: "مقاتلة F-35 لايتنينغ 2"
    },
    baseCost: 12000,
    costMultiplier: 1.50,
    baseIncome: 35.00,
    incomeMultiplier: 1.28
  },

  // ==== Allies / Countries ====
  {
    id: "usa_support",
    category: "countries",
    icon: "assets/myteam/countries/usa_support.png",
    names: {
      en: "USA Support",
      he: "תמיכת ארה\"ב",
      ar: "دعم الولايات المتحدة"
    },
    baseCost: 9500,
    costMultiplier: 1.45,
    baseIncome: 26.00,
    incomeMultiplier: 1.25
  },
  {
    id: "uk_support",
    category: "countries",
    icon: "assets/myteam/countries/uk_support.png",
    names: {
      en: "UK Support",
      he: "תמיכת בריטניה",
      ar: "دعم المملكة المتحدة"
    },
    baseCost: 7800,
    costMultiplier: 1.43,
    baseIncome: 21.00,
    incomeMultiplier: 1.24
  },
  {
    id: "eu_support",
    category: "countries",
    icon: "assets/myteam/countries/eu_support.png",
    names: {
      en: "EU Coalition",
      he: "קואליציית האיחוד האירופי",
      ar: "تحالف الاتحاد الأوروبي"
    },
    baseCost: 11000,
    costMultiplier: 1.48,
    baseIncome: 32.00,
    incomeMultiplier: 1.27
  },
  {
    id: "nato_support",
    category: "countries",
    icon: "assets/myteam/countries/nato_support.png",
    names: {
      en: "NATO Support",
      he: "תמיכת נאט\"ו",
      ar: "دعم حلف الناتو"
    },
    baseCost: 15000,
    costMultiplier: 1.52,
    baseIncome: 45.00,
    incomeMultiplier: 1.30
  },
  {
    id: "un_peacekeepers",
    category: "countries",
    icon: "assets/myteam/countries/un_peacekeepers.png",
    names: {
      en: "UN Peacekeepers",
      he: "כוחות שמירת שלום של האו\"ם",
      ar: "قوات حفظ السلام التابعة للأمم المتحدة"
    },
    baseCost: 6000,
    costMultiplier: 1.42,
    baseIncome: 15.00,
    incomeMultiplier: 1.24
  }
];

// === מיפוי מהיר לפי ID ===
const MYTEAM_ITEMS_BY_ID = MYTEAM_ITEMS.reduce((map, item) => {
  map[item.id] = item;
  return map;
}, {});

// === פורמולות מחיר / הכנסה ===
function myTeamCostAtLevel(itemId, level) {
  const item = MYTEAM_ITEMS_BY_ID[itemId];
  if (!item) return 0;
  const lvl = Math.max(1, level || 1);
  return Math.floor(
    item.baseCost * Math.pow(item.costMultiplier, lvl - 1)
  );
}

function myTeamIncomeAtLevel(itemId, level) {
  const item = MYTEAM_ITEMS_BY_ID[itemId];
  if (!item) return 0;
  const lvl = Math.max(1, level || 1);
  return Number(
    (item.baseIncome * Math.pow(item.incomeMultiplier, lvl - 1)).toFixed(3)
  );
}

// מחשב סה\"כ incomePerSec מהצבא לפי אובייקט myteam של המשתמש
// myteamShape = { [itemId]: { level: number } }
function myTeamTotalIncomePerSec(myteamShape) {
  if (!myteamShape) return 0;
  let total = 0;
  for (const [itemId, info] of Object.entries(myteamShape)) {
    const lvl = info?.level || 0;
    if (lvl <= 0) continue;
    total += myTeamIncomeAtLevel(itemId, lvl);
  }
  return Number(total.toFixed(3));
}

function loadMyTeamCategories(lang = "en") {
  const container = document.getElementById("myteam-categories");
  if (!container) return;

  container.innerHTML = "";

  Object.values(MYTEAM_CATEGORIES).forEach(cat => {
    const label = cat.labels?.[lang] || cat.labels.en;

    const el = document.createElement("div");
    el.className = "myteam-category";

    el.innerHTML = `
      <img src="${cat.icon}" class="myteam-category-icon" />
      <div class="myteam-category-label">${label}</div>
    `;

    el.addEventListener("click", () => {
      loadMyTeamItems(cat.id, lang);
    });

    container.appendChild(el);
  });
}

// ===== TB_V19 — MyTeam: טעינת פריטים לפי קטגוריה =====
function loadMyTeamItems(categoryId, lang = "en") {
  const container = document.getElementById("myteam-items");
  if (!container) return;

  container.innerHTML = "";

  const items = MYTEAM_ITEMS.filter(i => i.category === categoryId);

  items.forEach(item => {
    const name = item.names?.[lang] || item.names.en;

    const el = document.createElement("div");
    el.className = "myteam-item-card";

    const level = (window.user?.myteam?.[item.id]?.level) || 0;
    const cost = myTeamCostAtLevel(item.id, level + 1);
    const income = myTeamIncomeAtLevel(item.id, level + 1);

    el.innerHTML = `
      <img src="${item.icon}" class="myteam-item-icon" />
      <div class="myteam-item-info">
        <div class="myteam-item-name">${name}</div>
        <div class="myteam-item-level">${i18n[lang].level || "Level"}: ${level}</div>
        <div class="myteam-item-income">${i18n[lang].incomeShort}: +${income}/sec</div>
        <div class="myteam-item-cost">${i18n[lang].buy}: ${cost} $Battle</div>
      </div>
      <button class="myteam-buy-btn" data-id="${item.id}">
        ${i18n[lang].buy}
      </button>
    `;

    // 🛒 חיבור כפתור BUY לפעולה אמיתית
    const buyBtn = el.querySelector(".myteam-buy-btn");
    buyBtn.addEventListener("click", async () => {
      const ok = await buyMyTeamItem(item.id);
      if (ok) {
        // רענון רשימת הפריטים לאחר קנייה מוצלחת
        loadMyTeamItems(categoryId, lang);
      }
    });

    container.appendChild(el);
  });
}


// ===== TB_V19 — MyTeam: רכישת פריט =====
async function buyMyTeamItem(itemId) {
  try {
    const userId = window.user?.id;
    if (!userId) {
      console.warn("⚠️ no userId found in window.user");
      return false;
    }

    const res = await fetch(`/api/user/${userId}/myteam/buy`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId })
    });

    const data = await res.json();

    if (!data.ok) {
      console.warn("⚠️ buyMyTeamItem failed:", data.error);
      return false;
    }

    // מעדכן את המשתמש המקומי (כולל myteam + הכנסות)
    if (data.user) {
      window.user = data.user;
    }

    return true;
  } catch (err) {
    console.error("❌ buyMyTeamItem crashed:", err);
    return false;
  }
}


