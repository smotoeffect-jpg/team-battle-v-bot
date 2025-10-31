
// app.jsx  — TeamBattle Mini‑App (V2.3)
const {useEffect, useMemo, useRef, useState} = React;

// --- Config (client-side) ---
const EXTRA_TAP_PRICE = 5; // Stars cost for Extra TAP +2
const BOT_USERNAME = "TeamBattle_vBot"; // used to build referral link fallback

// --- i18n ---
const tMap = {
  en: {
    doubleXpOn: "Double XP Active!",
    doubleXpOff: "Double XP Off",
    hebrew: "Hebrew",
    english: "English",
    arabic: "Arabic",
    title: "Team Battle: Israel vs Gaza",
    subtitle: "Global team arena. Tap to push your team forward.",
    yourName: "Your Name",
    chooseTeam: "Choose Your Team",
    israel: "Israel",
    gaza: "Gaza",
    tap: "+1 Tap",
    super: "+25 Super Boost",
    changeTeam: "Change Team",
    daily: "Daily taps",
    superToday: "Super boosts used",
    of: "of",
    topPlayers: "Top Players",
    partners: "Referral Program",
    invite: "Invite friends with your personal link. You earn 10% bonus to your team from their donations!",
    copyLink: "Copy Link",
    share: "Share on Telegram",
    extraTap: "Extra TAP +2",
  },
  he: {
    doubleXpOn: "דאבל אקספי פעיל!",
    doubleXpOff: "דאבל אקספי כבוי",
    hebrew: "עברית",
    english: "English",
    arabic: "العربية",
    title: "Team Battle: Israel vs Gaza",
    subtitle: "ארנת הצוותים הגלובלית. טאפ כדי לקדם את הקבוצה שלך.",
    yourName: "השם שלך",
    chooseTeam: "בחר את הקבוצה שלך",
    israel: "ישראל",
    gaza: "עזה",
    tap: "1+ טאפ",
    super: "25+ סופר-בוסט",
    changeTeam: "החלף קבוצה",
    daily: "טאפים יומיים",
    superToday: "בוסטים סופר היום",
    of: "מתוך",
    topPlayers: "שחקנים מובילים",
    partners: "תכנית שותפים",
    invite: "הזמן חברים בעזרת הקישור האישי שלך. כשיתורמים — אתה מקבל בונוס 10% לקבוצתך!",
    copyLink: "העתק קישור",
    share: "שתף בטלגרם",
    extraTap: "Extra TAP +2",
  },
  ar: {
    doubleXpOn: "دابل اكس‌بي يعمل!",
    doubleXpOff: "دابل اكس‌بي متوقف",
    hebrew: "עברית",
    english: "English",
    arabic: "العربية",
    title: "Team Battle: Israel vs Gaza",
    subtitle: "ساحة الفرق العالمية. انقر لدفع فريقك للأمام.",
    yourName: "اسمك",
    chooseTeam: "اختر فريقك",
    israel: "إسرائيل",
    gaza: "غزة",
    tap: "+1 نقرة",
    super: "+25 تعزيز سوبر",
    changeTeam: "غيّر الفريق",
    daily: "النقرات اليومية",
    superToday: "تعزيزات سوبر لهذا اليوم",
    of: "من",
    topPlayers: "أفضل اللاعبين",
    partners: "برنامج الشركاء",
    invite: "ادعُ الأصدقاء برابطك الشخصي. عند تبرعهم تحصل على 10٪ مكافأة لفريقك!",
    copyLink: "نسخ الرابط",
    share: "شارك على تيليجرام",
    extraTap: "Extra TAP +2",
  }
};

function useTelegram(){
  const WebApp = typeof window!=="undefined" ? window.Telegram?.WebApp : undefined;
  useEffect(()=>{ if(WebApp){ WebApp.ready(); WebApp.expand?.(); }},[WebApp]);
  return WebApp;
}
function useT(lang){ return (k)=> (tMap[lang] && tMap[lang][k]) || k; }

// attempt to fetch double xp state from server
async function getDoubleXP() {
  try {
    const r = await fetch("/api/status/double-xp", {cache:"no-store"});
    if(!r.ok) throw 0;
    const j = await r.json();
    return !!j.active;
  } catch(e){
    return false;
  }
}
// attempt to fetch top20
async function getTop20() {
  try {
    const r = await fetch("/api/top20", {cache:"no-store"});
    if(!r.ok) throw 0;
    const j = await r.json();
    if(Array.isArray(j)) return j;
  } catch(e){}
  // fallback demo
  return Array.from({length:20}).map((_,i)=>({name:`Player${i+1}`, score: 1000 - i*21}));
}

function Section({children, className=""}){
  return <div className={`card ${className}`}>{children}</div>;
}

export default function App(){
  const tg = useTelegram();
  const [lang,setLang] = useState("he");
  const t = useT(lang);

  const user = tg?.initDataUnsafe?.user;
  const userId = user?.id?.toString() || `guest_${Math.floor(Math.random()*1e8)}`;
  const [username, setUsername] = useState(user?.username || user?.first_name || "");
  const [selected, setSelected] = useState(null); // "israel" | "gaza"

  const [doubleXP,setDoubleXP] = useState(false);
  const [isLoadingXP,setIsLoadingXP] = useState(true);

  const [score,setScore] = useState({israel:2213, gaza:48});
  const [taps,setTaps] = useState(0);
  const [superUsed,setSuperUsed] = useState(0);
  const maxTaps = 300;
  const maxSuper = 1;

  const [top,setTop] = useState([]);

  // init
  useEffect(()=>{
    (async ()=>{
      setIsLoadingXP(true);
      setDoubleXP(await getDoubleXP());
      setIsLoadingXP(false);
      setTop(await getTop20());
    })();
  },[]);

  // helpers
  const refLink = useMemo(()=>{
    const bot = tg?.initDataUnsafe?.receiver?.username || BOT_USERNAME;
    return `https://t.me/${bot}/app?start_param=${userId}`;
  },[tg,userId]);

  const handleTap = ()=>{
    if(!selected) return;
    if(taps>=maxTaps) return;
    const s = {...score};
    s[selected]+=1;
    setScore(s);
    setTaps(taps+1);
    tg?.HapticFeedback?.impactOccurred("light");
  };
  const handleSuper = ()=>{
    if(!selected) return;
    if(superUsed>=maxSuper) return;
    const s = {...score};
    s[selected]+=25;
    setScore(s);
    setSuperUsed(superUsed+1);
    tg?.HapticFeedback?.notificationOccurred("success");
  };
  const toggleTeam = ()=>{
    setSelected(prev => prev==="israel" ? "gaza" : "israel");
  };

  // Real Stars purchase for Extra TAP +2
  async function buyExtraTap(){
    try{
      const payload = {t:"extra_tap", userId, team:selected || ""};
      const r = await fetch("/api/create-invoice", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          title: "Extra TAP +2",
          description: "Gives +2 points to your team",
          amount: EXTRA_TAP_PRICE,
          payload
        })
      });
      const j = await r.json();
      if(!j.ok || !j.url) throw new Error("Invoice failed");
      tg?.openInvoice?.(j.url, (status)=>{
        // optional callback
        // status: "paid" | "cancelled" | "failed" (depends on client)
      });
    }catch(e){
      alert("Payment error. Try again.");
    }
  }

  // UI pieces
  const LangButtons = ()=>(
    <div className="chips">
      <div className={`chip ${doubleXP ? "on" : "off"}`}>
        {doubleXP ? "🟢 " + t("doubleXpOn") : "⚪ " + t("doubleXpOff")}
      </div>
      <button className="chip lang" onClick={()=>setLang("he")}>{t("hebrew")}</button>
      <button className="chip lang" onClick={()=>setLang("en")}>{t("english")}</button>
      <button className="chip lang" onClick={()=>setLang("ar")}>{t("arabic")}</button>
    </div>
  );

  return (
    <div className="container">
      <div className="header-row">
        <LangButtons/>
      </div>

      <div className="title-wrap">
        <div className="title">{t("title")}</div>
        <div className="subtitle">{t("subtitle")}</div>
      </div>

      {/* Name */}
      <Section>
        <div style={{fontWeight:800, marginBottom:8}}>{t("yourName")}</div>
        <input
          placeholder="@username"
          value={username}
          onChange={(e)=>setUsername(e.target.value)}
          className="ref-card input"
          style={{width:"100%"}}
        />
      </Section>

      {/* Teams */}
      <Section>
        <div style={{fontWeight:800, marginBottom:12}}>{t("chooseTeam")}</div>
        <div className="teams">
          <div className="team" onClick={()=>setSelected("israel")}>
            <div className="name">{t("israel")}</div>
            <div className="score">{score.israel}</div>
          </div>
          <div className="team" onClick={()=>setSelected("gaza")}>
            <div className="name">{t("gaza")}</div>
            <div className="score">{score.gaza}</div>
          </div>
        </div>

        <div className="btn-row" style={{marginTop:14}}>
          <button className="btn btn-blue" onClick={handleTap} disabled={!selected || taps>=maxTaps}>{t("tap")}</button>
          <button className="btn btn-pink" onClick={handleSuper} disabled={!selected || superUsed>=maxSuper}>{t("super")}</button>
          <button className="btn btn-gold" onClick={toggleTeam}>{t("changeTeam")}</button>
        </div>

        <div className="stats" style={{marginTop:10}}>
          {t("daily")}: {taps}/{maxTaps} • {t("superToday")}: {superUsed}/{maxSuper}
        </div>
      </Section>

      {/* Extra Tap purchase row + progress */}
      <Section className="kv">
        <button className="btn btn-gold" onClick={buyExtraTap}>{t("extraTap")}</button>
        <div className="ref-card" style={{flex:1, textAlign:"center"}}>
          <div style={{fontWeight:800, color:"#e1e6ff"}}>{taps}/{maxTaps}</div>
        </div>
      </Section>

      {/* Referral */}
      <Section className="ref-card">
        <div style={{fontWeight:800, marginBottom:10}}>🤝 {t("partners")}</div>
        <div style={{color:"var(--muted)", marginBottom:12}}>{t("invite")}</div>
        <div className="btn-row" style={{marginBottom:12}}>
          <button className="btn btn-ghost" onClick={()=>navigator.clipboard.writeText(refLink)}>{t("copyLink")}</button>
          <button className="btn btn-blue" onClick={()=> tg?.openTelegramLink?.(`https://t.me/share/url?url=${encodeURIComponent(refLink)}`)}>{t("share")}</button>
        </div>
        <input readOnly value={refLink} />
      </Section>

      {/* Top players */}
      <Section className="top-card">
        <div style={{fontWeight:800, marginBottom:8}}>{t("topPlayers")}</div>
        <div className="top-wrap">
          {top.slice(0,20).map((p,idx)=>(
            <div className="row" key={idx}>
              <div>#{idx+1} {p.name}</div>
              <div style={{opacity:.9, fontWeight:800}}>{p.score}</div>
            </div>
          ))}
        </div>
      </Section>

      <div className="footer">© TeamBattle</div>
    </div>
  );
}
