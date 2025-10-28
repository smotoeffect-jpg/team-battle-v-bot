/* public/app.jsx */
/* גלובלי מה-UMD: React, ReactDOM, Telegram */
const { useEffect, useState } = React;

const i18n = {
  he: {
    title: "TeamBattle - Israel Vs Gaza",
    chooseTeam: "בחר את הצוות שלך",
    israel: "ישראל",
    gaza: "עזה",
    tap: "טאפ להגברה (+1)",
    super: "סופר-בוסט (+25, פעם ביום)",
    donate: "תרום כוכבים",
    stars: "כוכבים",
    pointsNote: "⭐ 1 = 2 נקודות",
    daily: "טאפים היום",
    limit: "מקסימום ליום: 300",
    superLeft: "סופר-בוסט זמין: ",
    switch: "← החלף קבוצה",
    referral: "תכנית שותפים",
    copy: "העתק קישור",
    other: "ניקוד יריב",
  },
  en: {
    title: "TeamBattle - Israel Vs Gaza",
    chooseTeam: "Choose Your Team",
    israel: "Israel",
    gaza: "Gaza",
    tap: "Tap to Boost (+1)",
    super: "Super Boost (+25, once/day)",
    donate: "Donate Stars",
    stars: "Stars",
    pointsNote: "⭐ 1 = 2 points",
    daily: "Taps today",
    limit: "Daily max: 300",
    superLeft: "Super Boost available: ",
    switch: "← Switch Team",
    referral: "Affiliate Program",
    copy: "Copy Link",
    other: "Opponent score",
  },
  ar: {
    title: "TeamBattle - Israel Vs Gaza",
    chooseTeam: "اختر فريقك",
    israel: "إسرائيل",
    gaza: "غزة",
    tap: "انقر للتعزيز (+1)",
    super: "تعزيز سوبر (+25، مرة/يوم)",
    donate: "تبرع بالنجوم",
    stars: "نجوم",
    pointsNote: "⭐ 1 = نقطتان",
    daily: "نقرات اليوم",
    limit: "الحد اليومي: 300",
    superLeft: "تعزيز سوبر متاح: ",
    switch: "← تبديل الفريق",
    referral: "برنامج الشركاء",
    copy: "نسخ الرابط",
    other: "نتيجة الخصم",
  },
};

function App() {
  const tg = window.Telegram?.WebApp;
  const [lang, setLang] = useState("he");
  const t = (k) => i18n[lang][k] || k;

  const userId = String(tg?.initDataUnsafe?.user?.id || Math.floor(Math.random()*1e9));
  const botUsername = "TeamBattle_vBot";
  const [team, setTeam] = useState(null);
  const [scores, setScores] = useState({ israel: 0, gaza: 0 });
  const [tapsToday, setTapsToday] = useState(0);
  const [superUsed, setSuperUsed] = useState(0);
  const [stars, setStars] = useState(10); // ברירת מחדל לתשלום

  useEffect(() => {
    tg?.ready?.();
    tg?.expand?.();
    refreshState();
  }, []);

  const refreshState = async () => {
    const r = await fetch("/api/state");
    const data = await r.json();
    if (data.ok) setScores(data.scores);
  };

  const choose = async (side) => {
    setTeam(side);
    await fetch("/api/select-team", {
      method:"POST", headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ userId, team: side }),
    });
    // הדגשה לרקע (אסתטי)
    document.body.classList.remove("team-israel","team-gaza");
    document.body.classList.add(side === "israel" ? "team-israel" : "team-gaza");
  };

  const doTap = async () => {
    if (!team) return;
    const r = await fetch("/api/tap", {
      method:"POST", headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ userId }),
    });
    const data = await r.json();
    if (data.ok) {
      setScores(data.scores);
      setTapsToday(data.tapsToday);
    } else if (data.error === "limit") {
      tg?.showAlert?.(lang==="he" ? "הגעת למגבלת הטאפים להיום" : "Daily taps limit reached");
    }
  };

  const doSuper = async () => {
    if (!team) return;
    const r = await fetch("/api/super", {
      method:"POST", headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ userId }),
    });
    const data = await r.json();
    if (data.ok) {
      setScores(data.scores);
      setSuperUsed(data.superUsed);
    } else if (data.error === "limit") {
      tg?.showAlert?.(lang==="he" ? "כבר השתמשת בסופר-בוסט היום" : "Super Boost already used today");
    }
  };

  const donate = async () => {
    if (!team) return;
    try {
      const r = await fetch("/api/create-invoice", {
        method:"POST", headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ userId, team, stars: Math.max(1, Math.floor(stars)) }),
      });
      const data = await r.json();
      if (!data.ok || !data.url) throw new Error("invoice fail");
      const cb = (status) => {
        if (status === "paid") {
          refreshState(); // יתעדכן אחרי ה-webhook
          tg?.showPopup?.({ title:"Payment", message:"Thanks! Points added.", buttons:[{id:"ok",type:"ok",text:"OK"}] });
        }
      };
      if (tg?.openInvoice) tg.openInvoice(data.url, cb);
      else window.open(data.url, "_blank");
    } catch (e) {
      console.error(e);
      tg?.showAlert?.("Payment error");
    }
  };

  const referralLink = `https://t.me/${botUsername}?start=ref_${userId}`;
  const other = team === "israel" ? "gaza" : "israel";

  return (
    <div className="wrap">
      <h1 className="title">{t("title")}</h1>

      <div className="lang-row">
        <button onClick={()=>setLang("he")}>עברית</button>
        <button onClick={()=>setLang("en")}>English</button>
        <button onClick={()=>setLang("ar")}>العربية</button>
      </div>

      <div className="cards">
        <div className={`card ${team==="israel"?"selected":""}`} onClick={()=>choose("israel")}>
          <div className="card-name">{t("israel")}</div>
          <div className="card-score">{scores.israel}</div>
        </div>
        <div className={`card ${team==="gaza"?"selected":""}`} onClick={()=>choose("gaza")}>
          <div className="card-name">{t("gaza")}</div>
          <div className="card-score">{scores.gaza}</div>
        </div>
      </div>

      {team && (
        <div className="other-score">
          {t("other")}: {scores[other]}
        </div>
      )}

      <div className="status">
        {t("daily")}: {tapsToday} · {t("limit")} | {t("superLeft")}{superUsed? "0":"1"}
        <div className="hint">{t("pointsNote")}</div>
      </div>

      <button className="btn btn-blue" onClick={doTap} disabled={!team}>{t("tap")}</button>
      <button className="btn btn-pink" onClick={doSuper} disabled={!team || superUsed}>{t("super")}</button>

      <div className="donate-box">
        <label>{t("donate")} ({t("stars")}):</label>
        <input type="number" min="1" max="100000" value={stars}
          onChange={e=>setStars(Math.max(1, Math.min(100000, parseInt(e.target.value||"0",10))))}/>
        <button className="btn btn-gold" onClick={donate} disabled={!team}>{t("donate")}</button>
      </div>

      <div className="container">
        <h3>{t("referral")}</h3>
        <input readOnly value={referralLink} />
        <button className="btn" onClick={()=>navigator.clipboard.writeText(referralLink)}>{t("copy")}</button>
      </div>

      {team && <button className="btn btn-switch" onClick={()=>choose(other)}>{t("switch")}</button>}
      <div className="footer">© TeamBattle</div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
