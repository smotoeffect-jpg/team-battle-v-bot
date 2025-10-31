// app.js – React (UMD) with JSX via Babel
const { useEffect, useState, useMemo } = React;

const I18N = {
  en:{doubleOn:"Double XP Active!",doubleOff:"Double XP Off",title:"Team Battle: Israel vs Gaza",subtitle:"Global team arena. Tap to push your team forward.",israel:"Israel",gaza:"Gaza",changeTeam:"Change Team",tap:"+1 Tap",super:"+25 Super Boost",daily:"Daily taps",superUsed:"Super boosts used today",partners:"Referral Program",partnersDesc:"Invite friends using your personal link. When they donate stars you get a 10% bonus to your team!",copy:"Copy Link",share:"Share on Telegram",board:"Top Players",extraTap:"Extra Tap",starRule:"⭐ 1 star = 2 points",english:"English",hebrew:"עברית",arabic:"العربية"},
  he:{doubleOn:"דאבל אקספי פעיל!",doubleOff:"דאבל אקספי כבוי",title:"קרב צוות: ישראל מול עזה",subtitle:"ארנת הצוותים הגלובלית. טאפ כדי לקדם את הקבוצה שלך.",israel:"ישראל",gaza:"עזה",changeTeam:"החלף קבוצה",tap:"טאפ +1",super:"סופר-בוסט +25",daily:"טאפים יומיים",superUsed:"בוסטי סופר היום",partners:"תוכנית שותפים",partnersDesc:"הזמן חברים בעזרת הקישור האישי שלך. כשאנשים תורמים כוכבים אתה מקבל בונוס 10% לקבוצה שלך!",copy:"העתק קישור",share:"שתף בטלגרם",board:"שחקנים מובילים",extraTap:"Extra Tap",starRule:"⭐ כל 1 כוכב = 2 נקודות",english:"English",hebrew:"עברית",arabic:"العربية"},
  ar:{doubleOn:"دابل اكس‌بي يعمل!",doubleOff:"دابل اكس‌بي متوقف",title:"معركة الفرق: إسرائيل ضد غزة",subtitle:"ساحة الفرق العالمية. انقر لدفع فريقك للأمام.",israel:"إسرائيل",gaza:"غزة",changeTeam:"غيّر الفريق",tap:"+1 نقرة",super:"+25 تعزيز سوبر",daily:"نقرات يومية",superUsed:"تعزيزات السوبر اليوم",partners:"برنامج الشركاء",partnersDesc:"ادعُ أصدقاءك بواسطة الرابط الشخصي. عند التبرع بالنجوم تحصل على 10% مكافأة لفريقك!",copy:"نسخ الرابط",share:"مشاركة على تيليجرام",board:"أفضل اللاعبين",extraTap:"Extra Tap",starRule:"⭐ كل 1 نجمة = 2 نقاط",english:"English",hebrew:"עברית",arabic:"العربية"},
};

function useTelegram(){
  const WebApp = typeof window!=="undefined"?window.Telegram?.WebApp:undefined;
  useEffect(()=>{ if(WebApp){ WebApp.ready(); WebApp.expand(); } },[WebApp]);
  return WebApp;
}

function App(){
  const tg = useTelegram();
  const [lang,setLang]=useState("he");
  const t=(k)=> (I18N[lang]&&I18N[lang][k])||k;
  const dir = (lang==="he"||lang==="ar")?"rtl":"ltr";

  const userId = tg?.initDataUnsafe?.user?.id?.toString() || `guest_${Math.floor(Math.random()*1e9)}`;
  const botUser = tg?.initDataUnsafe?.receiver?.username || "TeamBattle_vBot";

  const [team,setTeam]=useState("israel");
  const [score,setScore]=useState({israel:2500,gaza:1200});
  const [taps,setTaps]=useState(0);
  const [superUsed,setSuperUsed]=useState(0);
  const [doubleXP,setDoubleXP]=useState(false);

  // load Double XP status from backend (optional)
  useEffect(()=>{
    fetch("/api/status/double-xp").then(async r=>{
      if(!r.ok) return;
      const j=await r.json().catch(()=>null);
      if(j&&typeof j.active==="boolean") setDoubleXP(j.active);
    }).catch(()=>{});
  },[]);

  // Top 20
  const [top,setTop]=useState([]);
  useEffect(()=>{
    fetch("/api/top20").then(async r=> r.ok? r.json():[]).then(arr=>{
      if(!Array.isArray(arr) || !arr.length) throw 0;
      setTop(arr.slice(0,20));
    }).catch(()=>{
      const demo=Array.from({length:20}).map((_,i)=>({name:`Player #${i+1}`,score:1000-i*17}));
      setTop(demo);
    })
  },[]);

  const doTap=()=>{ setScore(s=>({...s,[team]:s[team]+1})); setTaps(n=>n+1); tg?.HapticFeedback?.impactOccurred("light"); };
  const doSuper=()=>{ if(superUsed>=1) return; setScore(s=>({...s,[team]:s[team]+25})); setSuperUsed(n=>n+1); tg?.HapticFeedback?.notificationOccurred("success"); };
  const changeTeam=()=> setTeam(p=> p==="israel"?"gaza":"israel");

  // Extra Tap donation (real Stars): amount from input, integer only
  const [donation,setDonation]=useState("");
  const onDonationChange=(e)=>{
    const v=e.target.value.replace(/[^0-9]/g,"");
    setDonation(v);
  };
  const buyExtraTap=async()=>{
    const amount = parseInt(donation||"0",10);
    if(!amount || amount<1){
      alert(lang==="he"?"נא להזין כמות כוכבים":lang==="ar"?"يرجى إدخال عدد النجوم":"Please enter stars amount");
      return;
    }
    try{
      const r=await fetch("/api/create-invoice",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({title:"Extra Tap",description:`Extra Tap – ${amount} stars`,amount:amount,payload:`extra_tap_${userId}_${Date.now()}`})
      });
      const j=await r.json();
      if(j?.ok && j.url){
        if(tg?.openInvoice) tg.openInvoice(j.url);
        else window.location.href=j.url;
      }else{
        console.error("invoice error", j);
        alert("Payment error");
      }
    }catch(e){ console.error(e); alert("Network error"); }
  };

  const referralLink=`https://t.me/${botUser}/app?start_param=${userId}`;

  const LangPill=({code,label})=>(
    <button className={"pill"+(lang===code?" active":"")} onClick={()=>setLang(code)}>{label}</button>
  );

  return (
    <div style={{width:"100%"}} dir={dir}>
      {/* Double XP banner */}
      <div className={"doublexp "+(doubleXP?"active":"off")}>{doubleXP?t("doubleOn"):t("doubleOff")}</div>

      {/* Language */}
      <div className="lang-row">
        <LangPill code="he" label={I18N.he.hebrew} />
        <LangPill code="en" label={I18N.en.english} />
        <LangPill code="ar" label={I18N.ar.arabic} />
      </div>

      {/* Title + subtitle */}
      <h1 className="title"><span className="brand">TeamBattle</span> – {t("title")}</h1>
      <div className="subtitle">{t("subtitle")}</div>

      {/* Main section */}
      <div className="section">
        {/* score cards */}
        <div className="grid">
          <div className="card">
            <div className="label">{t("israel")}</div>
            <div className="score">{score.israel}</div>
          </div>
          <div className="card">
            <div className="label">{t("gaza")}</div>
            <div className="score">{score.gaza}</div>
          </div>
        </div>

        {/* meta */}
        <div className="meta"><span>{t("daily")}: {taps}</span><span className="dot">•</span><span>{t("superUsed")}: {superUsed}/1</span></div>

        {/* actions */}
        <div className="row">
          <button className="btn btn-blue" onClick={doTap}>{t("tap")}</button>
          <button className="btn btn-pink" onClick={doSuper}>{t("super")}</button>
          <button className="btn btn-ghost" onClick={changeTeam}>{t("changeTeam")}</button>
        </div>

        {/* Extra Tap with input */}
        <div className="extra-row">
          <input className="input" type="number" inputMode="numeric" pattern="[0-9]*" placeholder="⭐" value={donation} onChange={onDonationChange} />
          <button className="btn btn-gold" onClick={buyExtraTap}>{t("extraTap")}</button>
        </div>
        <div className="helper">{t("starRule")}</div>
      </div>

      {/* Partners */}
      <div className="section partners">
        <div className="head">{t("partners")}</div>
        <div className="sub">{t("partnersDesc")}</div>
        <div className="share-row">
          <input className="link" readOnly value={referralLink} />
          <button className="btn btn-blue" onClick={()=>navigator.clipboard.writeText(referralLink)}>{t("copy")}</button>
          <button className="btn btn-ghost" onClick={()=>{ if(tg?.shareURL) tg.shareURL(referralLink); else if(navigator.share) navigator.share({title:"TeamBattle", url:referralLink}); }}>{t("share")}</button>
        </div>
      </div>

      {/* Top 20 */}
      <div className="section top">
        <div className="head">{t("board")}</div>
        <div className="list">
          {top.map((p,i)=>(
            <div key={i} className="row">
              <div className="name">{i+1}. {p.name}</div>
              <div className="val">{p.score}</div>
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
