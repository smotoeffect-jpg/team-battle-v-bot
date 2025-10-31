// TeamBattle Frontend – V2.0 (UMD/Babel, no imports, full UI)
// All features: i18n (he/en/ar), DoubleXP banner + toggle, team select, switch team,
// top-20 leader list (shows 5 in scroll window), referral in floated panel, clean neon UI.

const { useState, useEffect, useMemo } = React;

// ---- i18n ----
const i18n = {
  en:{
    xpOn:"Double XP Active!", xpOff:"Double XP Off",
    title:"Team Battle: Israel vs Gaza",
    changeLang:"Change Language", he:"Hebrew", en:"English", ar:"Arabic",
    chooseTeam:"Choose Your Team",
    israel:"Israel", gaza:"Gaza",
    tap:"+1 Tap", super:"Super Boost", switchTeam:"Switch Team",
    daily:"Daily taps", of:"of", used:"used today",
    referralTitle:"Referral Program",
    referralDesc:"Invite friends with your personal link. Friends' ⭐ donations add +10% to your team!",
    shareTG:"Share", copy:"Copy Link",
    topTitle:"Top Players",
    copied:"Copied!"
  },
  he:{
    xpOn:"דאבל אקספי פעיל!", xpOff:"דאבל אקספי כבוי",
    title:"קרב צוות: ישראל מול עזה",
    changeLang:"שנה שפה", he:"עברית", en:"English", ar:"العربية",
    chooseTeam:"בחר את הצוות שלך",
    israel:"ישראל", gaza:"עזה",
    tap:"+1 טאפ", super:"סופר בוסט", switchTeam:"החלף קבוצה",
    daily:"טאפים יומיים", of:"מתוך", used:"נוצלו היום",
    referralTitle:"תוכנית שותפים",
    referralDesc:"הזמן חברים עם הקישור האישי שלך. תרומות ⭐ שלהם מוסיפות +10% לקבוצה שלך!",
    shareTG:"שתף", copy:"העתק קישור",
    topTitle:"שחקנים מובילים",
    copied:"הועתק!"
  },
  ar:{
    xpOn:"دابل اكس‌بي يعمل!", xpOff:"دابل اكس‌بي متوقف",
    title:"معركة الفرق: إسرائيل ضد غزة",
    changeLang:"تغيير اللغة", he:"עברית", en:"English", ar:"العربية",
    chooseTeam:"اختر فريقك",
    israel:"إسرائيل", gaza:"غزة",
    tap:"نقرة +1", super:"تعزيز سوبر", switchTeam:"تبديل الفريق",
    daily:"نقرات يومية", of:"من", used:"اُستُخدمت اليوم",
    referralTitle:"برنامج الإحالة",
    referralDesc:"ادعُ الأصدقاء برابطك الشخصي. تبرعاتهم بالنجوم ⭐ تضيف +10% لفريقك!",
    shareTG:"شارك", copy:"نسخ الرابط",
    topTitle:"أفضل اللاعبين",
    copied:"تم النسخ!"
  }
};

function useTelegram(){
  const WebApp = typeof window !== "undefined" ? window.Telegram?.WebApp : undefined;
  useEffect(()=>{ if(WebApp){ WebApp.ready(); WebApp.expand(); }},[WebApp]);
  return WebApp;
}

function App(){
  const tg = useTelegram();
  const [lang,setLang]=useState("he");
  const t = (k)=> (i18n[lang] && i18n[lang][k]) || k;
  const [doubleXP,setDoubleXP]=useState(false);
  const [team,setTeam]=useState(null); // 'israel' | 'gaza'
  const [score,setScore]=useState({israel:0,gaza:0});
  const [taps,setTaps]=useState(0);
  const [maxTaps]=useState(300);
  const [superUsed,setSuperUsed]=useState(0);
  const [maxSuper]=useState(1);

  // Leaderboard demo
  const [leaders,setLeaders]=useState(()=> Array.from({length:20}).map((_,i)=>({
    id:i+1,name:`Player ${i+1}`,points:6000 - i*217
  })));

  // Restore from CloudStorage
  useEffect(()=>{
    const s = tg?.CloudStorage; if(!s) return;
    s.getItem("tb_lang",(_,v)=> v && setLang(JSON.parse(v)));
    s.getItem("tb_team",(_,v)=> v && setTeam(JSON.parse(v)));
    s.getItem("tb_taps",(_,v)=> v && setTaps(parseInt(JSON.parse(v))));
    s.getItem("tb_doublexp",(_,v)=> v && setDoubleXP(!!JSON.parse(v)));
    // Initial score (demo)
    setScore({
      israel: 2000 + Math.floor(Math.random()*1200),
      gaza: 1800 + Math.floor(Math.random()*1200)
    });
  },[tg]);

  const save = (k,v)=> tg?.CloudStorage?.setItem(k,JSON.stringify(v),()=>{});

  // Interactions
  const onTap=()=>{
    if(!team) return;
    if(taps>=maxTaps) return;
    const add = doubleXP ? 2 : 1;
    setScore(s=>({...s,[team]:s[team]+add}));
    setTaps(x=>{const n=x+1; save("tb_taps",n); return n;});
    tg?.HapticFeedback?.impactOccurred("light");
  };
  const switchTeam=()=>{
    if(!team) return;
    const next = team==="israel"?"gaza":"israel";
    setTeam(next); save("tb_team",next);
    tg?.HapticFeedback?.selectionChanged?.();
  };

  const copyReferral=()=>{
    const link=`https://t.me/${tg?.initDataUnsafe?.receiver?.username || "TeamBattle_vBot"}/app?start_param=ref_${Date.now()}`;
    navigator.clipboard.writeText(link);
    if(tg?.showPopup){ tg.showPopup({title:t("copy"),message:t("copied"),buttons:[{id:"ok",type:"ok"}]}); }
  };
  const shareReferral=()=>{
    const link=`https://t.me/${tg?.initDataUnsafe?.receiver?.username || "TeamBattle_vBot"}/app?start_param=ref_${Date.now()}`;
    if(tg?.shareUrl){ tg.shareUrl(link); } else { navigator.clipboard.writeText(link); }
  };

  const LangBtn = ({code,label}) => (
    <button className={`btn btn-blue ${lang===code?"active":""}`}
      onClick={()=>{ setLang(code); save("tb_lang",code); tg?.HapticFeedback?.selectionChanged?.(); }}>
      {label}
    </button>
  );

  return (
    <div className="wrap">
      {/* Double XP indicator + toggle */}
      <div className={`xp-indicator ${doubleXP?"on":"off"}`}>
        {doubleXP ? t("xpOn") : t("xpOff")}
        <label className="xp-toggle">
          <input type="checkbox" checked={doubleXP} onChange={e=>{ setDoubleXP(e.target.checked); save("tb_doublexp",e.target.checked); }}/>
          <span className="switch"></span>
        </label>
      </div>

      <h1 className="title glow">{t("title")}</h1>

      {/* Languages */}
      <div className="lang-row">
        <LangBtn code="he" label={i18n[lang].he}/>
        <LangBtn code="en" label={i18n[lang].en}/>
        <LangBtn code="ar" label={i18n[lang].ar}/>
        <button className="btn" onClick={()=>{
          const order=["he","en","ar"]; const idx=order.indexOf(lang); const nx=order[(idx+1)%order.length];
          setLang(nx); save("tb_lang",nx);
        }}>{t("changeLang")}</button>
      </div>

      {/* Teams */}
      <div className="cards">
        <div className={`card ${team==="gaza"?"selected":""}`} onClick={()=>{ setTeam("gaza"); save("tb_team","gaza"); }}>
          <div className="card-title">{t("gaza")}</div>
          <div className="card-score">{score.gaza}</div>
        </div>
        <div className={`card ${team==="israel"?"selected":""}`} onClick={()=>{ setTeam("israel"); save("tb_team","israel"); }}>
          <div className="card-title">{t("israel")}</div>
          <div className="card-score">{score.israel}</div>
        </div>
      </div>

      {/* Actions */}
      <div className="actions">
        <button className="btn btn-blue btn-big" onClick={onTap} disabled={!team || taps>=maxTaps}>{t("tap")}</button>
        <button className="btn btn-pink" onClick={switchTeam} disabled={!team}>{t("switchTeam")}</button>
      </div>

      {/* Status */}
      <div className="status">
        {t("daily")}: {taps} {t("of")} {maxTaps} &nbsp;•&nbsp; {t("super")} {t("used")}: {superUsed}/{maxSuper}
      </div>

      {/* Referral – floating panel */}
      <div className="ref-floating">
        <div>
          <div className="pill-title">{t("referralTitle")}</div>
          <div className="pill-desc">{t("referralDesc")}</div>
        </div>
        <div className="pill-actions">
          <button className="btn btn-blue" onClick={shareReferral}>{t("shareTG")}</button>
          <button className="btn" onClick={copyReferral}>{t("copy")}</button>
        </div>
      </div>

      {/* Leaderboard */}
      <section className="panel">
        <div className="panel-header"><h3 className="sub">{t("topTitle")}</h3></div>
        <div className="leader-window">
          {leaders.map((p,idx)=>(
            <div key={p.id} className="leader-row">
              <div className="rank">{idx+1}</div>
              <div className="lname">{p.name}</div>
              <div className="pts">{p.points.toLocaleString()}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App/>);
