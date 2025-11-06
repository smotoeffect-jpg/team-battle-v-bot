window.I18N=(function(){
const map={
  en:{tap:"TAP",upgrades:"Upgrades",myTeam:"My Team",battery:"Battery",vip:"VIP",autoclicker:"Auto Clicker",offline:"Offline Mining",buy:"Buy",owned:"Owned",price:"Price",income:"Income"},
  he:{tap:"טאפ",upgrades:"שדרוגים",myTeam:"הקבוצה שלי",battery:"בטרייה",vip:"VIP",autoclicker:"אוטו-קליקר",offline:"מצב אוף-ליין",buy:"קנה",owned:"בבעלות",price:"מחיר",income:"הכנסה"},
  ar:{tap:"نقرة",upgrades:"ترقيات",myTeam:"فريقي",battery:"بطارية",vip:"VIP",autoclicker:"نقر تلقائي",offline:"وضع غير متصل",buy:"شراء",owned:"مملوك",price:"السعر",income:"الدخل"}
};
let lang=(localStorage.getItem('tb_lang')||'he'); if(!map[lang]) lang='en';
function t(k){ return (map[lang]&&map[lang][k])||map['en'][k]||k; }
return {t,lang,setLang:(l)=>{if(map[l]){localStorage.setItem('tb_lang',l);location.reload();}}};
})();