// app.jsx (TeamBattle V1.9, UMD/Babel style – no imports)
const { useEffect, useMemo, useRef, useState } = React;

const i18n = {
  en:{xpOn:"Double XP Active!",xpOff:"Double XP Off",title:"TeamBattle - Israel Vs Gaza",israel:"Israel",gaza:"Gaza",changeLang:"Change Language",he:"Hebrew",en:"English",ar:"Arabic",chooseTeam:"Choose Your Team",tap:"TAP (+1)",super:"Super Boost",switchTeam:"Switch Team",daily:"Daily taps",of:"of",used:"used today",referralTitle:"Referral Program",referralDesc:"Invite friends with your personal link. When friends donate ⭐ you get a 10% bonus to your team!",shareTG:"Share on Telegram",copy:"Copy Link",myBoard:"My Leaderboard",topTitle:"Top Players",vip:"VIP"},
  he:{xpOn:"דאבל אקספי פעיל!",xpOff:"דאבל אקספי כבוי",title:"TeamBattle - Israel Vs Gaza",israel:"ישראל",gaza:"עזה",changeLang:"שנה שפה",he:"עברית",en:"English",ar:"العربية",chooseTeam:"בחר קבוצה",tap:"טאפ (+1)",super:"סופר בוסט",switchTeam:"החלף קבוצה",daily:"טאפים יומיים",of:"מתוך",used:"נוצלו היום",referralTitle:"תוכנית שותפים",referralDesc:"הזמן חברים עם הקישור האישי שלך. כשחברים תורמים ⭐ אתה מקבל בונוס 10% לקבוצה שלך!",shareTG:"שתף בטלגרם",copy:"העתק קישור",myBoard:"הלוח שלי",topTitle:"שחקנים מובילים",vip:"VIP"},
  ar:{xpOn:"دابل اكس‌بي يعمل!",xpOff:"دابل اكس‌بي متوقف",title:"TeamBattle - Israel Vs Gaza",israel:"إسرائيل",gaza:"غزة",changeLang:"تغيير اللغة",he:"עברית",en:"English",ar:"العربية",chooseTeam:"اختر فريقك",tap:"نقرة (+1)",super:"تعزيز سوبر",switchTeam:"تبديل الفريق",daily:"نقرات يومية",of:"من",used:"اُستُخدمت اليوم",referralTitle:"برنامج الإحالة",referralDesc:"ادعُ أصدقاءك برابطك الشخصي. عند تبرّع الأصدقاء ⭐ تحصل على 10% نقاط إضافية لفريقك!",shareTG:"شارك على تيليجرام",copy:"نسخ الرابط",myBoard:"لوحتي",topTitle:"أفضل اللاعبين",vip:"VIP"}
};

function useTelegram(){
  const WebApp = typeof window!=="undefined" ? window.Telegram?.WebApp : undefined;
  useEffect(()=>{ if(WebApp){ WebApp.ready(); WebApp.expand(); }},[WebApp]);
  return WebApp;
}

function TeamBattleApp(){
  const tg = useTelegram();
  const [lang,setLang]=useState("he");
  const t=(k)=> (i18n[lang]&&i18n[lang][k])||k;
  const [isDoubleXP,setIsDoubleXP]=useState(false);
  const [team,setTeam]=useState(null);
  const [score,setScore]=useState({israel:0,gaza:0});
  const [taps,setTaps]=useState(0);
  const [maxTaps]=useState(300);
  const [superUsed,setSuperUsed]=useState(0);
  const [maxSuper]=useState(1);
  const [leaders,setLeaders]=useState(Array.from({length:20}).map((_,i)=>({id:i+1,name:`Player ${i+1}`,points:Math.floor(5000-i*173)})));

  useEffect(()=>{
    const s=tg?.CloudStorage; if(!s) return;
    s.getItem("tb_lang",(_,v)=>v&&setLang(JSON.parse(v)));
    s.getItem("tb_team",(_,v)=>v&&setTeam(JSON.parse(v)));
    s.getItem("tb_taps",(_,v)=>v&&setTaps(parseInt(JSON.parse(v))));
    s.getItem("tb_doublexp",(_,v)=>v&&setIsDoubleXP(!!JSON.parse(v)));
  },[tg]);
  const save=(k,v)=>tg?.CloudStorage?.setItem(k,JSON.stringify(v),()=>{});

  useEffect(()=>{
    setScore({israel:1500+Math.floor(Math.random()*1200),gaza:800+Math.floor(Math.random()*900)});
  },[]);

  const doTap=()=>{
    if(!team) return; if(taps>=maxTaps) return;
    const add=isDoubleXP?2:1;
    setScore(s=>({...s,[team]:s[team]+add}));
    setTaps(x=>{const n=x+1; save("tb_taps",n); return n;});
    tg?.HapticFeedback?.impactOccurred("light");
  };
  const switchTeam=()=>{
    if(!team) return;
    const next=team==="israel"?"gaza":"israel";
    setTeam(next); save("tb_team",next); tg?.HapticFeedback?.selectionChanged?.();
  };

  const LangButton=({code,label})=>(
    <button className={`btn btn-blue ${lang===code?"active":""}`}
      onClick={()=>{setLang(code); save("tb_lang",code); tg?.HapticFeedback?.selectionChanged?.();}}>{label}</button>
  );

  return (
    <div className="wrap">
      <div className={`xp-indicator ${isDoubleXP?"on":"off"}`}>
        {isDoubleXP?t("xpOn"):t("xpOff")}
        <label className="xp-toggle">
          <input type="checkbox" checked={isDoubleXP} onChange={e=>{setIsDoubleXP(e.target.checked); save("tb_doublexp",e.target.checked);}}/>
          <span></span>
        </label>
      </div>

      <h1 className="title glow">{t("title")}</h1>

      <div className="lang-row">
        <LangButton code="ar" label={i18n[lang].ar}/>
        <LangButton code="en" label={i18n[lang].en}/>
        <LangButton code="he" label={i18n[lang].he}/>
      </div>

      <div className="cards">
        <div className={`card ${team==="gaza"?"selected":""}`} onClick={()=>{setTeam("gaza"); save("tb_team","gaza");}}>
          <div className="card-title">{t("gaza")}</div>
          <div className="card-score">{score.gaza}</div>
        </div>
        <div className={`card ${team==="israel"?"selected":""}`} onClick={()=>{setTeam("israel"); save("tb_team","israel");}}>
          <div className="card-title">{t("israel")}</div>
          <div className="card-score">{score.israel}</div>
        </div>
      </div>

      <div className="actions">
        <button className="btn btn-blue big" onClick={doTap} disabled={!team||taps>=maxTaps}>{t("tap")}</button>
        <button className="btn btn-pink" onClick={switchTeam} disabled={!team} title={t("switchTeam")}>{t("switchTeam")}</button>
      </div>

      <div className="status">
        {t("daily")}: {taps} {t("of")} {maxTaps} &nbsp;•&nbsp; {t("super")} {t("used")}: {superUsed}/{maxSuper}
      </div>

      <section className="ref-block panel">
        <h3 className="sub">{t("referralTitle")}</h3>
        <p className="hint">{t("referralDesc")}</p>
        <div className="ref-row">
          <button className="btn btn-blue" onClick={()=>{
            const link=`https://t.me/${window.Telegram?.WebApp?.initDataUnsafe?.receiver?.username||"TeamBattle_vBot"}/app?start_param=ref_${Date.now()}`;
            if(window.Telegram?.WebApp?.shareUrl){ window.Telegram.WebApp.shareUrl(link);} else { navigator.clipboard.writeText(link); }
          }}>{t("shareTG")}</button>
          <button className="btn" onClick={()=>{
            const link=`https://t.me/${window.Telegram?.WebApp?.initDataUnsafe?.receiver?.username||"TeamBattle_vBot"}/app?start_param=ref_${Date.now()}`;
            navigator.clipboard.writeText(link);
          }}>{t("copy")}</button>
        </div>
      </section>

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
root.render(<TeamBattleApp/>);
