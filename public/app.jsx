// TeamBattle V2.2 – React (UMD) + Babel
const {useEffect,useMemo,useRef,useState} = React;

const tDict = {
  en:{doubleXpOn:"Double XP Active!",doubleXpOff:"Double XP Off",title:"Team Battle: Israel vs Gaza",subtitle:"Global team arena. Tap to push your team forward.",yourName:"Your Name",chooseTeam:"Choose Your Team",israel:"Israel",gaza:"Gaza",tap:"+1 Tap",super:"+25 Super Boost",changeTeam:"Change Team",daily:"Daily taps",superUsed:"Super boosts used",topPlayers:"Top Players",partners:"Referral Program",partnersHint:"Invite friends using your personal link. When they donate Stars you get a 10% bonus to your team!",copy:"Copy Link",share:"Share on Telegram",extraTap:"Extra TAP +2",hebrew:"Hebrew",english:"English",arabic:"Arabic"},
  he:{doubleXpOn:"דאבל אקספי פעיל!",doubleXpOff:"דאבל אקספי כבוי",title:"Team Battle: Israel vs Gaza",subtitle:"ארנת הצוותים הגלובלית. טאפ כדי לקדם את הקבוצה שלך.",yourName:"השם שלך",chooseTeam:"בחר את הקבוצה שלך",israel:"ישראל",gaza:"עזה",tap:"טאפ +1",super:"סופר-בוסט +25",changeTeam:"החלף קבוצה",daily:"טאפים יומיים",superUsed:"בוסטי סופר היום",topPlayers:"שחקנים מובילים",partners:"תוכנית שותפים",partnersHint:"הזמן חברים בעזרת הקישור האישי שלך. כשתורמים כוכבים אתה מקבל 10% בונוס לקבוצה שלך!",copy:"העתק קישור",share:"שתף בטלגרם",extraTap:"Extra TAP +2",hebrew:"עברית",english:"English",arabic:"العربية"},
  ar:{doubleXpOn:"دابل اكس‌بي يعمل!",doubleXpOff:"دابل اكس‌بي متوقف",title:"Team Battle: Israel vs Gaza",subtitle:"ساحة الفرق العالمية. المس لدفع فريقك للأمام.",yourName:"اسمك",chooseTeam:"اختر فريقك",israel:"إسرائيل",gaza:"غزة",tap:"+1 نقرة",super:"+25 تعزيز سوبر",changeTeam:"تبديل الفريق",daily:"النقرات اليومية",superUsed:"تعزيزات السوبر اليوم",topPlayers:"أفضل اللاعبين",partners:"برنامج الشركاء",partnersHint:"ادعُ الأصدقاء باستخدام رابطك الشخصي. عند التبرع بالنجوم تحصل على مكافأة 10% لفريقك!",copy:"نسخ الرابط",share:"مشاركة على تيليجرام",extraTap:"Extra TAP +2",hebrew:"العبرية",english:"الإنجليزية",arabic:"العربية"}
};

function useTelegram(){
  const WebApp = typeof window!=="undefined" ? window.Telegram?.WebApp : undefined;
  useEffect(()=>{ if(WebApp){ WebApp.ready(); WebApp.expand(); } },[WebApp]);
  return WebApp;
}

function App(){
  const tg = useTelegram();
  const [lang,setLang] = useState(localStorage.getItem("tb_lang") || "he");
  useEffect(()=> localStorage.setItem("tb_lang",lang), [lang]);
  const t=(k)=> tDict[lang][k]||k;

  const [doubleXP,setDoubleXP] = useState(false);
  useEffect(()=>{
    let dead=false;
    async function fetchStatus(){
      try{
        const doFetch=async(u)=>{const r=await fetch(u,{cache:"no-store"}); if(!r.ok) throw 0; return await r.json();};
        let data;
        try{ data = await doFetch("/double-xp-status"); }
        catch(e){ data = await doFetch("/api/double-xp-status"); }
        if(!dead && typeof data?.isDoubleXP==="boolean") setDoubleXP(data.isDoubleXP);
      }catch(_){ if(!dead) setDoubleXP(false); }
    }
    fetchStatus();
    const id=setInterval(fetchStatus,30000);
    return ()=>{dead=true; clearInterval(id)};
  },[]);

  const [name,setName] = useState(tg?.initDataUnsafe?.user?.username || "");
  const [team,setTeam] = useState("israel");
  const [score,setScore] = useState({israel:2213,gaza:48});
  const [taps,setTaps] = useState(0);
  const [superUsed,setSuperUsed] = useState(0);
  const maxTaps=300, maxSuper=1;

  const [leaders] = useState(()=> Array.from({length:20},(_,i)=>({rank:i+1,name:`Player${i+1}`,points:1000-i*23})) );

  const userId = tg?.initDataUnsafe?.user?.id || Math.floor(Math.random()*1e9);
  const referral = `?start=ref_${userId}`;

  function changeTeam(){ setTeam(p=>p==="israel"?"gaza":"israel"); }
  function tapOnce(){ if(!team || taps>=maxTaps) return; setScore(s=>({...s,[team]:s[team]+1})); setTaps(n=>n+1); tg?.HapticFeedback?.impactOccurred("light"); }
  function superBoost(){ if(!team || superUsed>=maxSuper) return; setScore(s=>({...s,[team]:s[team]+25})); setSuperUsed(n=>n+1); tg?.HapticFeedback?.notificationOccurred("success"); }

  return (
    <div className="container">
      <div className="small-note">
        <div className={"badge "+(doubleXP?"gold":"dim")}>{doubleXP?("🟢 "+t("doubleXpOn")):("⚪ "+t("doubleXpOff"))}</div>
        <div className="lang-row">
          <button className={"lang-btn "+(lang==="he"?"active":"")} onClick={()=>setLang("he")}>{t("hebrew")}</button>
          <button className={"lang-btn "+(lang==="en"?"active":"")} onClick={()=>setLang("en")}>{t("english")}</button>
          <button className={"lang-btn "+(lang==="ar"?"active":"")} onClick={()=>setLang("ar")}>{t("arabic")}</button>
        </div>
      </div>

      <div className="glow-title">{t("title")}</div>
      <div className="kv" style={{justifyContent:"center"}}><span>{t("subtitle")}</span></div>

      <div className="card" style={{marginTop:12}}>
        <div style={{fontWeight:700, marginBottom:8}}>{t("yourName")}</div>
        <input className="input" value={name} onChange={e=>setName(e.target.value)} placeholder="@username" />
      </div>

      <div className="card" style={{marginTop:12}}>
        <div style={{fontWeight:800, marginBottom:10}}>{t("chooseTeam")}</div>
        <div className="grid">
          <div className="team-card">
            <div className="team-name">🇮🇱 {t("israel")}</div>
            <div className="team-score">{score.israel}</div>
          </div>
          <div className="team-card">
            <div className="team-name">🇵🇸 {t("gaza")}</div>
            <div className="team-score">{score.gaza}</div>
          </div>
        </div>
        <div className="row" style={{marginTop:12}}>
          <button className="btn" onClick={tapOnce}>{t("tap")}</button>
          <button className="btn btn-pink" onClick={superBoost}>{t("super")}</button>
          <button className="btn btn-gold" onClick={changeTeam}>{t("changeTeam")}</button>
        </div>
        <div className="kv">
          <span>{t("daily")}: {taps}/{maxTaps}</span>
          <span>{t("superUsed")}: {superUsed}/{maxSuper}</span>
        </div>
      </div>

      <div className="card partners">
        <h3 style={{margin:0,fontWeight:800}}>{t("partners")}</h3>
        <div className="hint" style={{margin:"6px 0 10px"}}>{t("partnersHint")}</div>
        <div className="row">
          <button className="btn" onClick={()=>navigator.clipboard.writeText(referral)}>{t("copy")}</button>
          <button className="btn" onClick={()=>tg?.openTelegramLink && tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(referral)}`)}>{t("share")}</button>
          <input className="input" readOnly value={referral} />
        </div>
      </div>

      <div className="card top-card">
        <div style={{fontWeight:800, marginBottom:10}}>{t("topPlayers")}</div>
        <div className="top-list">
          {leaders.map(p=>(
            <div key={p.rank} className="top-item">
              <div>#{p.rank} {p.name}</div>
              <div>{p.points}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="footer">© TeamBattle</div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
