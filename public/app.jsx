// app.jsx
const { useEffect, useState } = React;

function useTelegram() {
  const WebApp = typeof window !== "undefined" ? window.Telegram?.WebApp : undefined;
  useEffect(() => {
    if (WebApp) {
      WebApp.ready();
      WebApp.expand();
    }
  }, [WebApp]);
  return WebApp;
}

function App() {
  const tg = useTelegram();
  const [lang, setLang] = useState("en");
  const [dir, setDir] = useState("ltr");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [taps, setTaps] = useState(0);
  const [superUsed, setSuperUsed] = useState(0);
  const [donation, setDonation] = useState(5);

  const translations = {
    en: {
      title: "Global Team Battle Arena",
      changeLang: "Change Language",
      buyVip: "Buy VIP (100 Stars/week)",
      buySuper: "Super Boost (+25)",
      donate: "Donate Stars for Boost",
      fighting: "Fighting in Global Battle",
      dailyTaps: "Daily taps",
      superBoostsUsed: "Super boosts used today",
      points: "points",
      system: "System",
      loading: "Processing Payment..."
    },
    he: {
      title: "זירת הקרב הגלובלית",
      changeLang: "שנה שפה",
      buyVip: "קנה VIP (100 כוכבים/שבוע)",
      buySuper: "בוסט סופר (+25)",
      donate: "תרום כוכבים לבוסט",
      fighting: "נלחמים בקרב העולמי",
      dailyTaps: "טאפים יומיים",
      superBoostsUsed: "בוסטים סופר היום",
      points: "נקודות",
      system: "מערכת",
      loading: "מעבד תשלום..."
    },
    ar: {
      title: "ساحة المعركة العالمية",
      changeLang: "تغيير اللغة",
      buyVip: "شراء VIP (100 نجوم/أسبوع)",
      buySuper: "تعزيز فائق (+25)",
      donate: "تبرع بالنجوم",
      fighting: "يقاتل في المعركة العالمية",
      dailyTaps: "النقرات اليومية",
      superBoostsUsed: "التعزيزات المستخدمة اليوم",
      points: "نقاط",
      system: "النظام",
      loading: "جارٍ معالجة الدفع..."
    }
  };

  const t = (k) => translations[lang][k] || k;

  const cycleLang = () => {
    const order = ["en", "he", "ar"];
    const next = order[(order.indexOf(lang) + 1) % order.length];
    setLang(next);
    setDir(next === "he" || next === "ar" ? "rtl" : "ltr");
    document.documentElement.dir = next === "he" || next === "ar" ? "rtl" : "ltr";
  };

  const pushMsg = (txt) => setMessages((m) => [...m.slice(-10), txt]);

  const startPayment = async (title, description, amount) => {
    try {
      setIsLoading(true);
      document.body.style.filter = "blur(1px) brightness(1.1)";

      const res = await fetch("/api/create-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, amount })
      });

      const data = await res.json();
      if (!data.ok) throw new Error("Payment link error");

      setTimeout(() => {
        tg?.openInvoice(data.url, (status) => {
          setIsLoading(false);
          document.body.style.filter = "none";

          if (status === "paid") {
            pushMsg(`✅ ${t("system")}: Payment successful!`);
            tg?.HapticFeedback?.notificationOccurred("success");
          } else if (status === "cancelled") {
            pushMsg(`❌ ${t("system")}: Payment cancelled`);
            tg?.HapticFeedback?.notificationOccurred("error");
          }
        });
      }, 1000);
    } catch (err) {
      console.error(err);
      alert("Payment failed");
      setIsLoading(false);
      document.body.style.filter = "none";
    }
  };

  return (
    <div className="app" dir={dir}>
      {isLoading && (
        <div className="overlay">
          <div className="loader"></div>
          <p>{t("loading")}</p>
        </div>
      )}

      <h1 className="section-title">{t("title")}</h1>

      <button className="btn-blue" onClick={cycleLang}>
        🌐 {t("changeLang")}
      </button>

      <div className="container">
        <button
          className="btn-vip"
          onClick={() => startPayment("Buy VIP", "Activate VIP for 7 days", 100)}
        >
          {t("buyVip")}
        </button>

        <button
          className="btn-gold"
          onClick={() => startPayment("Super Boost", "1 Super Boost (+25 Power)", 50)}
        >
          {t("buySuper")}
        </button>
      </div>

      <p className="hint">
        {t("fighting")}<br />
        {t("dailyTaps")}: {taps}/300 | {t("superBoostsUsed")}: {superUsed}/1
      </p>

      <div className="container">
        <input
          type="number"
          min="1"
          max="1000"
          value={donation}
          onChange={(e) => setDonation(Math.max(1, parseInt(e.target.value) || 1))}
        />
        <button
          className="btn-gold"
          onClick={() =>
            startPayment("Donate Stars", `Donate ${donation} Stars for your team`, donation)
          }
        >
          {t("donate")}
        </button>
      </div>

      <div className="messages">
        <h3>{t("system")}:</h3>
        {messages.map((m, i) => (
          <div key={i}>{m}</div>
        ))}
      </div>

      <div className="footer">© TeamBattle</div>
    </div>
  );
}

// Mount app
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
