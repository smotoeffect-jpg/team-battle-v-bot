// app.jsx (TeamBattle V3.0) — React 18 UMD
const { useEffect, useMemo, useRef, useState } = React;

/* ===================== i18n ===================== */
const I18N = {
  en: {
    xpOn: "Double XP Active!",
    xpOff: "Double XP Off",
    title: "TeamBattle - Israel Vs Gaza",
    subtitle: "Global team arena. Tap to push your team forward.",
    israel: "Israel",
    gaza: "Gaza",
    daily: "Daily taps",
    superUsed: "Super boosts used today",
    plusOne: "+1 Tap",
    superBoost: "+25 Super Boost",
    changeTeam: "Change Team",
    starsInputPlaceholder: "50",
    extraTap: "Extra Tap",
    rule: "1 star = 2 points",
    referral: "Referral Program",
    referralDesc: "Invite friends using your personal link. When they donate stars you get a 10% bonus to your team!",
    copy: "Copy Link",
    share: "Share on Telegram",
    topPlayers: "Top Players",
    language: { he: "Hebrew", en: "English", ar: "Arabic" }
  },
  he: {
    xpOn: "דאבל אקספי פעיל!",
    xpOff: "דאבל אקספי כבוי",
    title: "TeamBattle - Israel Vs Gaza",
    subtitle: "ארנת הצוותים הגלובלית. טאפ כדי לקדם את הקבוצה שלך.",
    israel: "ישראל",
    gaza: "עזה",
    daily: "טאפים יומיים",
    superUsed: "בוסטי סופר היום",
    plusOne: "טאפ +1",
    superBoost: "סופר-בוסט +25",
    changeTeam: "החלף קבוצה",
    starsInputPlaceholder: "50",
    extraTap: "Extra Tap",
    rule: "⭐ 1 כוכב = 2 נקודות",
    referral: "תוכנית שותפים",
    referralDesc: "הזמן חברים בעזרת הקישור האישי שלך. כשאנשים תורמים כוכבים אתה מקבל בונוס 10% לקבוצה שלך!",
    copy: "העתק קישור",
    share: "שתף בטלגרם",
    topPlayers: "שחקנים מובילים",
    language: { he: "עברית", en: "English", ar: "العربية" }
  },
  ar: {
    xpOn: "دابل اكس‌بي يعمل!",
    xpOff: "دابل اكس‌بي متوقف",
    title: "TeamBattle - Israel Vs Gaza",
    subtitle: "ساحة الفرق العالمية. انقر لدفع فريقك إلى الأمام.",
    israel: "إسرائيل",
    gaza: "غزة",
    daily: "نقرات يومية",
    superUsed: "تعزيزات سوبر اليوم",
    plusOne: "+1 نقرة",
    superBoost: "تعزيز سوبر +25",
    changeTeam: "تغيير الفريق",
    starsInputPlaceholder: "50",
    extraTap: "Extra Tap",
    rule: "1 نجمة = 2 نقاط",
    referral: "برنامج الإحالة",
    referralDesc: "ادعُ الأصدقاء باستخدام رابطك الشخصي. عند تبرعهم بالنجوم تحصل على مكافأة 10٪ لفريقك!",
    copy: "نسخ الرابط",
    share: "شارك على تيليجرام",
    topPlayers: "أفضل اللاعبين",
    language: { he: "עברית", en: "English", ar: "العربية" }
  }
};

/* ===================== Helpers ===================== */
const tg = (typeof window !== "undefined" && window.Telegram) ? window.Telegram.WebApp : undefined;

function useTelegram() {
  useEffect(() => {
    if (!tg) return;
    tg.ready();
    tg.expand();
  }, []);
  return tg;
}

function apiBase() {
  // same-origin (Render), works for both dev and prod
  return "";
}

async function safeFetch(url, opts={}){
  try{
    const r = await fetch(url, opts);
    if(!r.ok) throw new Error(await r.text());
    return await r.json();
  }catch(e){
    console.warn("fetch fail", url, e.message);
    return null;
  }
}

/* ===================== Main App ===================== */
function TeamBattleApp(){
  const TWA = useTelegram();
  const [lang, setLang] = useState("he"); // default Hebrew per request
  const t = (k)=> (I18N[lang] && I18N[lang][k]) || k;

  // player identity
  const userId = useMemo(()=> (
    TWA?.initDataUnsafe?.user?.id?.toString() ||
    `guest_${Math.floor(Math.random()*1e9)}`
  ), [TWA]);
  const username = useMemo(()=> (
    TWA?.initDataUnsafe?.user?.username ||
    TWA?.initDataUnsafe?.user?.first_name ||
    `Player${Math.floor(Math.random()*1000)}`
  ), [TWA]);

  // state
  const [isDoubleXP, setIsDoubleXP] = useState(false);
  const [scores, setScores] = useState({israel: 0, gaza: 0});
  const [daily, setDaily] = useState(0);
  const [superUsed, setSuperUsed] = useState(0);
  const [top, setTop] = useState([]);
  const [stars, setStars] = useState(50);
  const [selected, setSelected] = useState("israel");

  /* ----- bootstrap from API ----- */
  useEffect(()=>{
    (async()=>{
      const status = await safeFetch(`${apiBase()}/api/status`);
      if(status){
        setScores({israel: status.israel ?? status.scores?.israel ?? 0,
                   gaza: status.gaza ?? status.scores?.gaza ?? 0});
        setDaily(status.daily ?? status.dailyTaps ?? 0);
        setSuperUsed(status.superUsed ?? 0);
        setIsDoubleXP(!!(status.isDoubleXP ?? status.doubleXP));
        if(status.team) setSelected(status.team);
      }
      const topRes = await safeFetch(`${apiBase()}/api/top`);
      if(topRes && Array.isArray(topRes)){
        setTop(topRes);
      }else if(topRes?.top){
        setTop(topRes.top);
      }else{
        // demo fallback
        setTop(Array.from({length:20}, (_,i)=>({name:`Player #${i+1}`, score: 1000 - i*22})));
      }
    })();
  },[]);

  /* ----- Actions ----- */
  const doTap = async () => {
    const r = await safeFetch(`${apiBase()}/api/tap`, {
      method:"POST", headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ team: selected })
    });
    // optimistic update
    setScores((s)=>({...s,[selected]: (s[selected]||0)+1}));
    setDaily((d)=>d+1);
    TWA?.HapticFeedback?.impactOccurred("light");
  };

  const doSuper = async () => {
    const r = await safeFetch(`${apiBase()}/api/super`, {
      method:"POST", headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ team: selected })
    });
    setScores((s)=>({...s,[selected]: (s[selected]||0)+25}));
    setSuperUsed((n)=>n+1);
    TWA?.HapticFeedback?.notificationOccurred("success");
  };

  const changeTeam = async () => {
    const next = selected === "israel" ? "gaza" : "israel";
    await safeFetch(`${apiBase()}/api/change-team`, {
      method:"POST", headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ team: next })
    });
    setSelected(next);
  };

  const doExtraTap = async () => {
    const amount = Math.max(1, parseInt(stars||0));
    // ask backend for invoice link (Stars/XTR)
    const r = await safeFetch(`${apiBase()}/api/create-invoice`, {
      method:"POST",
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        title: "Extra Tap",
        description: "Donate stars for team bonus",
        amount,
        payload: JSON.stringify({t: "extra_tap", userId, team: selected, stars: amount})
      })
    });
    if(r?.ok && r.url){
      // open inside the mini-app
      if(TWA?.openInvoice){
        TWA.openInvoice(r.url);
      }else{
        window.location.href = r.url;
      }
    }
  };

  /* ----- Referral link ----- */
  const botUsername = TWA?.initDataUnsafe?.receiver?.username || TWA?.initDataUnsafe?.user?.username || "YourBot";
  const refLink = `https://t.me/${botUsername}/app?start_param=${userId}`;

  const isRTL = lang === "he" || lang === "ar";
  const dir = isRTL ? "rtl" : "ltr";

  return (
    <div>
      {/* Header row with XP + languages */}
      <div className="header">
        <div className="badge-row">
          <div className={`badge ${isDoubleXP ? 'xp-on' : 'xp-off'}`}>
            {isDoubleXP ? t("xpOn") : t("xpOff")}
          </div>
          <div className={`badge lang ${lang==='he'?'active':''}`} onClick={()=>setLang('he')}>{I18N[lang].language.he}</div>
          <div className={`badge lang ${lang==='en'?'active':''}`} onClick={()=>setLang('en')}>{I18N[lang].language.en}</div>
          <div className={`badge lang ${lang==='ar'?'active':''}`} onClick={()=>setLang('ar')}>{I18N[lang].language.ar}</div>
        </div>
      </div>

      {/* Title */}
      <div className="container" dir={dir}>
        <div className="title">{t("title")}</div>
        <div className="subtitle">{t("subtitle")}</div>

        {/* Score cards */}
        <div className="two-cards">
          <div className="score-card">
            <h4>{t("israel")}</h4>
            <div className="score">{scores.israel}</div>
          </div>
          <div className="score-card">
            <h4>{t("gaza")}</h4>
            <div className="score">{scores.gaza}</div>
          </div>
        </div>

        {/* Stats */}
        <div className="stat-row">
          <span>{t("daily")}:</span>&nbsp;<strong>{daily}</strong>
          <span className="dot"></span>
          <span>{t("superUsed")}:</span>&nbsp;<strong>{superUsed}/1</strong>
        </div>

        {/* action buttons */}
        <div className="btn-row">
          <button className="btn btn-blue" onClick={doTap}>{t("plusOne")}</button>
          <button className="btn btn-pink" onClick={doSuper}>{t("superBoost")}</button>
          <button className="btn btn-dark" onClick={changeTeam}>{t("changeTeam")}</button>
        </div>

        {/* Extra Tap area */}
        <div className="inline">
          <input
            dir="ltr"
            value={stars}
            onChange={(e)=>setStars(e.target.value)}
            placeholder={t("starsInputPlaceholder")}
          />
          <button className="btn btn-gold" onClick={doExtraTap}>{t("extraTap")}</button>
        </div>
        <div className="hint">{t("rule")}</div>
      </div>

      {/* Referral */}
      <div className="container" dir={dir}>
        <div className="section-title">{t("referral")}</div>
        <div className="small" style={{marginBottom:10, textAlign:'center'}}>{t("referralDesc")}</div>
        <div className="ref">
          <input className="link input" readOnly value={refLink} />
          <button className="btn btn-dark" onClick={()=>navigator.clipboard.writeText(refLink)}>{t("copy")}</button>
          <button className="btn btn-blue" onClick={()=>{
            const url = `https://t.me/share/url?url=${encodeURIComponent(refLink)}&text=${encodeURIComponent('Join my team!')}`;
            if(TWA?.openTelegramLink){ TWA.openTelegramLink(url); } else { window.open(url, '_blank'); }
          }}>{t("share")}</button>
        </div>
      </div>

      {/* Top players */}
      <div className="container" dir={dir}>
        <div className="section-title">{t("topPlayers")}</div>
        <div className="top">
          {(top||[]).slice(0,20).map((p,idx)=>(
            <div key={idx} className="top-item">
              <span>#{idx+1} {p.name || p.username || `Player ${idx+1}`}</span>
              <span>{p.score ?? p.points ?? 0}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="footer">© TeamBattle</div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<TeamBattleApp />);
