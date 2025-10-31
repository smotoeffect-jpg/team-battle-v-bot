
/* ===================================================
   TeamBattle V2.1 – FULL APP (no truncation)
   Features:
   - Three languages (EN/HE/AR)
   - Double XP status from /api/state (poll each 30s)
   - Top 20 list (Top 5 visible, scroll for rest)
   - Change Team button
   - Referral panel (copy link)
   - Neon/glow design
   =================================================== */
const {useEffect, useMemo, useRef, useState} = React;

const LOCALE = {
  en: {
    double_on: "Double XP Active!",
    double_off:"Double XP Off",
    title:"Team Battle: Israel vs Gaza",
    sub:"Global team arena. Tap to push your team forward.",
    change_lang:"Change Language",
    he:"Hebrew", ar:"Arabic", en:"English",
    partner:"Referral Program",
    partner_desc:"Share your link and earn +10 taps per friend who joins!",
    copy:"Copy Link",
    copied:"Copied!",
    your_name:"Your Name",
    choose_team:"Choose Your Team",
    israel:"Israel",
    gaza:"Gaza",
    tap:"+1 Tap",
    super:"+25 Super Boost",
    change_team:"Change Team",
    daily:"Daily taps",
    super_used:"Super boosts used",
    top_title:"Top Players",
    msgs:"Battle Messages",
  },
  he: {
    double_on:"דאבל אקספי פעיל!",
    double_off:"דאבל אקספי כבוי",
    title:"קרב צוות: ישראל מול עזה",
    sub:"ארנה גלובלית. טאפ כדי לקדם את הצוות שלך.",
    change_lang:"שנה שפה",
    he:"עברית", ar:"ערבית", en:"אנגלית",
    partner:"תוכנית שותפים",
    partner_desc:"שתף את הקישור שלך והרוויח +10 טאפים לכל חבר שמצטרף!",
    copy:"העתק קישור",
    copied:"הועתק!",
    your_name:"השם שלך",
    choose_team:"בחר את הצוות שלך",
    israel:"ישראל",
    gaza:"עזה",
    tap:"+1 טאפ",
    super:"+25 סופר בוסט",
    change_team:"החלף קבוצה",
    daily:"טאפים יומיים",
    super_used:"הגברות סופר",
    top_title:"שחקנים מובילים",
    msgs:"הודעות קרב",
  },
  ar: {
    double_on:"دابل اكس‌بي يعمل!",
    double_off:"دابل اكس‌بي متوقف",
    title:"معركة الفرق: إسرائيل ضد غزة",
    sub:"ساحة عالمية. انقر لتعزيز فريقك.",
    change_lang:"تغيير اللغة",
    he:"العبرية", ar:"العربية", en:"الإنجليزية",
    partner:"برنامج الإحالة",
    partner_desc:"شارك رابطك واكسب +10 نقرات لكل صديق ينضم!",
    copy:"نسخ الرابط",
    copied:"تم النسخ!",
    your_name:"اسمك",
    choose_team:"اختر فريقك",
    israel:"إسرائيل",
    gaza:"غزة",
    tap:"+1 نقرة",
    super:"+25 تعزيز سوبر",
    change_team:"تغيير الفريق",
    daily:"النقرات اليومية",
    super_used:"تعزيزات سوبر المستخدمة",
    top_title:"أفضل اللاعبين",
    msgs:"رسائل المعركة",
  }
};

function useTelegram(){
  const WebApp = typeof window!=="undefined" ? window.Telegram?.WebApp : undefined;
  useEffect(()=>{
    if(WebApp){ WebApp.ready(); WebApp.expand(); }
  },[WebApp]);
  return WebApp;
}

function App(){
  const tg = useTelegram();
  const [lang, setLang] = useState(localStorage.getItem("tb_lang") || "en");
  const t = (k)=> LOCALE[lang][k] || k;

  const userId = tg?.initDataUnsafe?.user?.id?.toString() || `guest_${Math.floor(Math.random()*1e9)}`;
  const [username, setUsername] = useState(
    tg?.initDataUnsafe?.user?.username ||
    tg?.initDataUnsafe?.user?.first_name ||
    `Player${Math.floor(Math.random()*1000)}`
  );

  // Teams & score
  const [team, setTeam] = useState(null); // 'israel' | 'gaza'
  const [score, setScore] = useState({israel:0, gaza:0});

  // Double XP status
  const [doubleXP, setDoubleXP] = useState(false);

  // Limits (demo values; real limits can be synced from server)
  const [taps, setTaps] = useState(0);
  const [superUsed, setSuperUsed] = useState(0);
  const maxTaps = 300;
  const maxSuper = 1;

  // Messages log
  const [messages, setMessages] = useState([]);

  // Top players (demo structure – replace with server data if available)
  const [leaders, setLeaders] = useState([]);

  // Referral link
  const botUsername = tg?.initDataUnsafe?.receiver?.username || "TeamBattle_vBot";
  const referralLink = `https://t.me/${botUsername}/app?start_param=${userId}`;

  // Load persisted language
  useEffect(()=>{ localStorage.setItem("tb_lang", lang); }, [lang]);

  // Initial fetch: state & leaders
  async function fetchState(){
    try{
      const r = await fetch("/api/state", {cache:"no-store"});
      const j = await r.json();
      if(j && j.ok){
        if(j.scores) setScore(j.scores);
        if(j.doubleXP && typeof j.doubleXP.on==="boolean") setDoubleXP(j.doubleXP.on);
        if(Array.isArray(j.top) && j.top.length){
          // expect array of {name, points}
          setLeaders(j.top.slice(0,20));
        }else{
          // fallback: generate demo leaders if not supplied by server
          const demo = Array.from({length:20}).map((_,i)=>({name:`Player${i+1}`, points: 1000 - i*23 }));
          setLeaders(demo);
        }
      } else {
        // fallback demo
        const demo = Array.from({length:20}).map((_,i)=>({name:`Player${i+1}`, points: 1000 - i*23 }));
        setLeaders(demo);
      }
    }catch(e){
      // offline/demo
      const demo = Array.from({length:20}).map((_,i)=>({name:`Player${i+1}`, points: 1000 - i*23 }));
      setLeaders(demo);
    }
  }
  useEffect(()=>{
    fetchState();
    const id = setInterval(fetchState, 30000); // refresh every 30s
    return ()=> clearInterval(id);
  },[]);

  // Start param referral bonus (client display only; server should grant the real bonus)
  useEffect(()=>{
    const ref = tg?.initDataUnsafe?.start_param;
    if(ref && ref!==userId.toString()){
      pushMsg(`Referral joined: ${ref}`);
    }
  },[tg]);

  function pushMsg(txt){
    setMessages(m=>[...m.slice(-40), {id:Date.now()+Math.random(), text:txt}]);
  }

  function onSelectTeam(which){
    setTeam(which);
    pushMsg(`${username} ${t("choose_team")} → ${which}`);
  }

  function onChangeTeam(){
    setTeam(prev => prev==="israel" ? "gaza" : "israel");
    pushMsg(`${username} ${t("change_team")}`);
  }

  function doTap(){
    if(!team) return;
    if(taps>=maxTaps) return;
    const delta = doubleXP ? 2 : 1;
    const ns = {...score};
    ns[team]+=delta;
    setScore(ns);
    setTaps(n=>n+1);
    pushMsg(`${username} ${t("tap")} ${team} (+${delta})`);
    tg?.HapticFeedback?.impactOccurred("light");
  }

  function doSuper(){
    if(!team) return;
    if(superUsed>=maxSuper) return;
    const delta = doubleXP ? 50 : 25;
    const ns = {...score};
    ns[team]+=delta;
    setScore(ns);
    setSuperUsed(n=>n+1);
    pushMsg(`${username} ${t("super")} ${team} (+${delta})`);
    tg?.HapticFeedback?.notificationOccurred("success");
  }

  const visible5 = leaders.slice(0,5);
  const rest = leaders.slice(5,20);

  return (
    <div>
      {/* Top bar: DoubleXP & Language */}
      <div className="topbar card">
        <div className={`badge ${doubleXP?"on":"off"}`}>
          <span className="dot"></span>
          <span className={doubleXP?"gold":"dim"}>
            {doubleXP ? t("double_on") : t("double_off")}
          </span>
        </div>

        <div className="langs">
          <button className="btn btn-blue" onClick={()=>setLang("he")}>{LOCALE[lang].he}</button>
          <button className="btn btn-blue" onClick={()=>setLang("en")}>{LOCALE[lang].en}</button>
          <button className="btn btn-blue" onClick={()=>setLang("ar")}>{LOCALE[lang].ar}</button>
        </div>
      </div>

      {/* Title */}
      <h1 className="title glow">{t("title")}</h1>
      <div className="subtitle">{t("sub")}</div>

      {/* Layout: main + partner panel */}
      <div className="row">
        <div className="col">
          <div className="card">
            {/* Name */}
            <div style={{marginBottom:10}}>
              <div style={{fontWeight:800, marginBottom:6}}>{t("your_name")}</div>
              <input
                value={username}
                onChange={e=>setUsername(e.target.value)}
                style={{
                  width:"100%", padding:"10px 12px", borderRadius:10,
                  border:"1px solid rgba(255,255,255,.12)", background:"#0c1220", color:"var(--text)"
                }}
              />
            </div>

            {/* Choose Team */}
            <div style={{fontWeight:800, marginBottom:6}}>{t("choose_team")}</div>
            <div className="teams">
              <div className={`team ${team==="israel"?"selected":""}`} onClick={()=>onSelectTeam("israel")}>
                <div className="name">🇮🇱 {t("israel")}</div>
                <div className="score">{score.israel}</div>
              </div>
              <div className={`team ${team==="gaza"?"selected":""}`} onClick={()=>onSelectTeam("gaza")}>
                <div className="name">🇵🇸 {t("gaza")}</div>
                <div className="score">{score.gaza}</div>
              </div>
            </div>

            {/* Controls */}
            <div className="controls">
              <button className="btn btn-blue" onClick={doTap} disabled={!team || taps>=maxTaps}>{t("tap")}</button>
              <button className="btn btn-pink" onClick={doSuper} disabled={!team || superUsed>=maxSuper}>{t("super")}</button>
              <div className="spacer"></div>
              <button className="btn btn-gold" onClick={onChangeTeam} disabled={!team}>{t("change_team")}</button>
            </div>

            <div className="info">
              {t("daily")}: {taps}/{maxTaps} • {t("super_used")}: {superUsed}/{maxSuper}
            </div>
          </div>

          {/* Top Players */}
          <div className="card" style={{marginTop:12}}>
            <div style={{fontWeight:900, marginBottom:8}} className="glow">{t("top_title")}</div>
            <div className="topwrap">
              <div className="top5">
                {visible5.map((p,i)=>(
                  <div className="player" key={i}>
                    <div style={{fontWeight:800}}>#{i+1} {p.name}</div>
                    <div style={{fontWeight:900}}>{p.points}</div>
                  </div>
                ))}
              </div>
              <div className="topscroll">
                {rest.map((p,i)=>(
                  <div className="player" key={i+5}>
                    <div style={{fontWeight:700}}>#{i+6} {p.name}</div>
                    <div style={{fontWeight:800}}>{p.points}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="card messages" style={{marginTop:12}}>
            <div className="msgbox">
              <div style={{fontWeight:900, marginBottom:6}} className="glow">{t("msgs")}</div>
              {messages.slice(-20).map(m=>(
                <div className="item" key={m.id}>{m.text}</div>
              ))}
            </div>
          </div>

          <div className="footer">© TeamBattle</div>
        </div>

        {/* Partner / Referral panel (sticky on desktop) */}
        <div className="col">
          <div className="card partner">
            <div style={{display:"flex", alignItems:"center", justifyContent:"space-between"}}>
              <div style={{fontWeight:900}} className="glow">{t("partner")}</div>
            </div>
            <div className="desc">{t("partner_desc")}</div>
            <div className="actions">
              <input id="refInput" readOnly value={referralLink} />
              <button
                className="btn btn-gold"
                onClick={()=>{
                  navigator.clipboard.writeText(referralLink);
                  const el = document.getElementById("refInput");
                  el?.classList.add("glow");
                  setTimeout(()=>el?.classList.remove("glow"), 500);
                }}
              >
                {t("copy")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App/>);
