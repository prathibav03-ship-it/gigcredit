import { useState, useEffect, useCallback, useRef } from "react";

/* ═══════════════════════════════════════════════════════════════
   SCORING ENGINE — fully transparent, every number shown
═══════════════════════════════════════════════════════════════ */
const WEIGHTS = {
  income:      { w: 0.22, label: "Monthly Earnings",      icon: "💵", help: "How much you earn matters most" },
  stability:   { w: 0.20, label: "Income Consistency",    icon: "📅", help: "Same income every month = trustworthy" },
  savings:     { w: 0.18, label: "Savings Ability",       icon: "🪣", help: "Money left after expenses & EMIs" },
  emi:         { w: 0.18, label: "Debt Load",             icon: "⚖️",  help: "How much of income already goes to loans" },
  digital:     { w: 0.12, label: "Digital Money Trail",   icon: "📱", help: "UPI/GPay usage proves financial behaviour" },
  tenure:      { w: 0.10, label: "Platform Loyalty",      icon: "⏳", help: "Longer on platform = stable employment" },
};

function scoreCalc(d) {
  const inc  = +d.monthlyIncome  || 0;
  const exp  = +d.monthlyExpenses || 0;
  const emi  = +d.existingEMI    || 0;
  const vari = +d.variance       || 30;
  const dig  = +d.digital        || 0;
  const ten  = +d.tenure         || 0;
  const mon  = +d.months         || 3;
  if (!inc) return null;

  const disposable = inc - exp - emi;
  const emiRatio   = emi / (inc || 1);
  const savingsRat = disposable / (inc || 1);

  const s = {
    income:    Math.min(100, inc<=8000?20: inc<=12000?40: inc<=18000?60: inc<=28000?80: inc<=45000?92:100),
    stability: Math.max(0, Math.min(100, 100 - vari*1.8 + (mon>=6?10:0))),
    savings:   Math.max(0, Math.min(100, savingsRat<=0?0: savingsRat<.1?20: savingsRat<.2?45: savingsRat<.3?65: savingsRat<.4?82:100)),
    emi:       Math.max(0, Math.min(100, emiRatio>.65?0: emiRatio>.5?15: emiRatio>.4?35: emiRatio>.3?60: emiRatio>.2?80:100)),
    digital:   Math.min(100, dig>=80?100: dig>=40?78: dig>=20?55: dig>=8?35:15),
    tenure:    Math.min(100, ten>=36?100: ten>=24?85: ten>=12?65: ten>=6?45: ten>=3?28:10),
  };

  const total = Object.entries(s).reduce((sum,[k,v]) => sum + v * WEIGHTS[k].w, 0);

  const loanUnlocked =
    total < 35 ? 0 :
    total < 45 ? 25000 :
    total < 55 ? 50000 :
    total < 65 ? 100000 :
    total < 75 ? 200000 :
    total < 85 ? 350000 : 500000;

  const fraudFlags = [];
  if (exp > inc * 0.95) fraudFlags.push("Expenses nearly equal income — double-check figures");
  if (emi > inc * 0.75) fraudFlags.push("EMIs exceed 75% of income — unusually high");
  if (dig > 180 && inc < 6000) fraudFlags.push("Very high UPI activity but low income — check both");
  if (inc > 90000 && vari < 3) fraudFlags.push("Very high, perfectly stable gig income is unusual");

  return { total: Math.round(total), s, disposable, emiRatio, savingsRat, loanUnlocked, fraudFlags };
}

/* ═══════════════════════════════════════════════════════════════
   LOAN PRODUCTS
═══════════════════════════════════════════════════════════════ */
const LOANS = [
  {
    id: "mudra_shishu", name: "PM MUDRA – Shishu", org: "Govt. of India",
    icon: "🏛️", minScore: 30, minIncome: 5000, maxEMIRatio: 0.65,
    max: 50000, rate: "8–12%", months: "12–60", tag: "Zero Collateral",
    tagBg: "#064e3b", tagColor: "#34d399",
    why: "Made for micro-entrepreneurs. Gig income is explicitly accepted by law.",
    link: "https://www.mudra.org.in",
    docs: ["Aadhaar","Platform payout history (3 months)","Passport photo","Bank passbook"],
    tip: "Walk into your nearest SBI or Bank of Baroda branch. Ask for 'Shishu MUDRA'. They cannot refuse to give you the form.",
    applySteps: ["Visit SBI/Bank of Baroda branch","Ask for Shishu MUDRA loan form","Submit Aadhaar + 3 months platform screenshot","Get approved in 7–14 days"],
  },
  {
    id: "kreditbee", name: "KreditBee Flexi", org: "KreditBee",
    icon: "🐝", minScore: 45, minIncome: 10000, maxEMIRatio: 0.50,
    max: 200000, rate: "15–29%", months: "3–24", tag: "10-Min Approval",
    tagBg: "#451a03", tagColor: "#fb923c",
    why: "App-first lender. Accepts gig income screenshots. No physical visit.",
    link: "https://www.kreditbee.in",
    docs: ["Aadhaar","PAN","Bank statement (6 months)","Platform earnings screenshot"],
    tip: "Apply Sunday night — approvals are faster when human review queues are short.",
    applySteps: ["Download KreditBee app","Complete video KYC (3 min)","Upload payout screenshots","Money in account same day"],
  },
  {
    id: "moneytap", name: "MoneyTap Credit Line", org: "MoneyTap",
    icon: "💳", minScore: 55, minIncome: 15000, maxEMIRatio: 0.45,
    max: 500000, rate: "13–24%", months: "2–36", tag: "Pay Interest Only on Use",
    tagBg: "#3b0764", tagColor: "#c084fc",
    why: "Revolving credit — take ₹5,000 now, ₹10,000 later. Pay interest only on what you use.",
    link: "https://www.moneytap.com",
    docs: ["Aadhaar","PAN","3 months bank statement","Selfie"],
    tip: "Ideal if income fluctuates — borrow small amounts between good and bad months.",
    applySteps: ["Install MoneyTap app","Enter PAN for instant limit check","Complete Aadhaar e-KYC","Withdraw any amount up to limit"],
  },
  {
    id: "navi", name: "Navi Personal Loan", org: "Navi Finserv",
    icon: "🔷", minScore: 48, minIncome: 12000, maxEMIRatio: 0.50,
    max: 300000, rate: "18–36%", months: "6–84", tag: "No Paperwork",
    tagBg: "#0c4a6e", tagColor: "#38bdf8",
    why: "100% app-based. Selfie + Aadhaar only. No income proof document needed.",
    link: "https://www.navi.com",
    docs: ["Aadhaar (Digilocker linked)","PAN","Selfie","Bank account number"],
    tip: "Best for Ola/Uber drivers — your Navi app may already have pre-approved offers.",
    applySteps: ["Open Navi app → Loans","Check pre-approved offer (no credit hit)","Accept & complete video selfie","Disbursed in 4 hours"],
  },
  {
    id: "faircent", name: "Faircent P2P Loan", org: "Faircent (RBI Licensed)",
    icon: "🤝", minScore: 38, minIncome: 8000, maxEMIRatio: 0.55,
    max: 500000, rate: "12–28%", months: "6–36", tag: "Human Review",
    tagBg: "#831843", tagColor: "#f9a8d4",
    why: "Peer-to-peer lender. Human review means gig income is understood, not auto-rejected.",
    link: "https://www.faircent.com",
    docs: ["Aadhaar","PAN","Bank statement","Platform income proof"],
    tip: "Write a 2-line note with your application explaining you are a gig partner with consistent weekly payouts. Human reviewers respond to context.",
    applySteps: ["Register on Faircent.com","Upload documents + write income note","Wait for lender bids (24–48 hrs)","Accept best offer & receive funds"],
  },
];

function matchLoans(result, d) {
  if (!result) return [];
  const inc = +d.monthlyIncome || 0;
  const er  = (+d.existingEMI || 0) / (inc || 1);
  return LOANS.filter(l => result.total >= l.minScore && inc >= l.minIncome && er <= l.maxEMIRatio);
}

/* ═══════════════════════════════════════════════════════════════
   ACTION PLANNER
═══════════════════════════════════════════════════════════════ */
function buildActionPlan(result, d) {
  if (!result) return [];
  const { s, emiRatio, disposable } = result;
  const inc = +d.monthlyIncome || 0;
  const plans = [];

  if (s.digital < 50) plans.push({
    week: "Week 1–2", points: "+8 pts", title: "Switch to UPI for everything",
    steps: [
      "Pay every auto/rickshaw fare via PhonePe — even ₹20 trips count",
      "Recharge mobile & DTH only through GPay — never cash",
      "Buy groceries via Jio Mart or Zepto (UPI checkout) at least twice",
      "Set reminder: 30 UPI transactions target this month",
    ],
    why: "Lenders can't see cash transactions. Every UPI payment is documented proof of financial activity.",
    emoji: "📱",
  });

  if (s.savings < 40 && disposable < inc * 0.15) plans.push({
    week: "Week 2–3", points: "+10 pts", title: "Raise your savings ratio above 20%",
    steps: [
      `You need ₹${Math.round(inc * 0.2 - Math.max(0,disposable))} more monthly savings`,
      "Park bike on Tuesday — one rest day cuts fuel by ₹600–800/month",
      "Switch cooking gas from cylinder to Piped (if available) — saves ₹300/month",
      "Open a separate savings account and auto-transfer ₹500 every payout day",
    ],
    why: "Banks check your savings rate. Showing 20%+ disposable income dramatically improves approval odds.",
    emoji: "🪣",
  });

  if (s.emi < 50 && emiRatio > 0.35) plans.push({
    week: "Week 3–4", points: "+12 pts", title: "Reduce EMI burden",
    steps: [
      `Your EMIs eat ${(emiRatio*100).toFixed(0)}% of income — target below 30%`,
      "Call your lender and ask for 'EMI restructuring' — many waive 1 month for good payees",
      "Pay off smallest loan first (snowball method) — even one closed loan shows progress",
      "Avoid any new EMI purchases for 90 days — no new phone on installment",
    ],
    why: `Your current EMI ratio of ${(emiRatio*100).toFixed(0)}% is the single biggest drag. Reducing it below 30% can add 12+ points.`,
    emoji: "⚖️",
  });

  if (s.stability < 55) plans.push({
    week: "Week 4–6", points: "+9 pts", title: "Stabilise monthly income",
    steps: [
      "Enable auto-accept during peak hours (6–9pm weekdays) — fewer idle days",
      "Log your earnings weekly in a notebook — lenders may ask to see this",
      "Do at least 20 orders/rides per week consistently for 8 weeks",
      "Screenshot your weekly payout summary every Monday — build an income portfolio",
    ],
    why: "A 15% swing in income is fine. Above 40% variance, lenders assume you're unreliable.",
    emoji: "📅",
  });

  if (s.tenure < 50 && +d.tenure < 12) plans.push({
    week: "Ongoing", points: "+7 pts", title: "Stay on platform — tenure is free credit history",
    steps: [
      "Every month you stay active adds to your tenure score automatically",
      "Multi-platform? Register on ONE primary platform and stick for 12 months",
      "Request a 'Partner Tenure Certificate' from your platform support",
      "Join platform loyalty programs (Swiggy Star, Ola Club) — shows commitment",
    ],
    why: "12 months = 65 points. 24 months = 85 points. Simply staying earns you credit.",
    emoji: "⏳",
  });

  if (plans.length === 0) plans.push({
    week: "You're in good shape!", points: "Maintain", title: "Keep doing what you're doing",
    steps: [
      "Maintain EMI ratio below 30%",
      "Keep 40+ UPI transactions per month",
      "Screenshot your earnings every month — build a 12-month portfolio",
      "Apply for MUDRA Shishu now to start a formal credit history",
    ],
    why: "Starting a small loan and repaying it fully is the fastest way to build CIBIL score.",
    emoji: "🌟",
  });

  return plans;
}

/* ═══════════════════════════════════════════════════════════════
   REJECTION DECODER
═══════════════════════════════════════════════════════════════ */
const REJECTION_REASONS = [
  {
    trigger: (r) => r.s.income < 35,
    title: "Income too low for standard loans",
    honest: "Banks have a ₹15,000/month minimum. Below that, most auto-reject.",
    solution: "Apply for MUDRA Shishu (₹50,000 limit, ₹5,000 income minimum). It's a government right — they cannot reject without cause.",
  },
  {
    trigger: (r) => r.emiRatio > 0.5,
    title: "Debt-to-income ratio too high",
    honest: "Banks see you already owe too much vs what you earn. Adding a new loan looks risky.",
    solution: "Close your smallest existing loan first. Even one closed EMI can unlock eligibility.",
  },
  {
    trigger: (r) => r.s.digital < 30,
    title: "No digital financial footprint",
    honest: "Cash-only means you're invisible. Banks can't verify your spending habits.",
    solution: "30 UPI transactions in the next month = visible financial identity. Start with petrol, groceries, auto fares.",
  },
  {
    trigger: (r) => r.s.tenure < 30,
    title: "Too new to the platform",
    honest: "Less than 6 months means no income history. Banks treat this like a new job.",
    solution: "Wait 3 more months. Or apply to Faircent — they use human review, not just algorithms.",
  },
  {
    trigger: (r) => r.s.stability < 30,
    title: "Income is too unpredictable",
    honest: "A 50%+ swing month-to-month makes banks nervous about repayment.",
    solution: "Work consistent hours for 8 weeks. Then apply — your last 3 months' consistency is what lenders actually check.",
  },
];

/* ═══════════════════════════════════════════════════════════════
   AI EXPLANATION FETCHER
═══════════════════════════════════════════════════════════════ */
async function getAIExplanation(result, d, lang) {
  const langMap = { en: "English", hi: "Hindi (Devanagari script only)", ta: "Tamil (Tamil script only)" };
  const inc = +d.monthlyIncome || 0;
  const prompt = `You are a friendly financial coach speaking to an Indian gig worker who delivers food or drives.
Respond in ${langMap[lang]}. Use VERY simple words — like talking to a Class 7 student. Use Indian rupee examples.
Avoid jargon like "FOIR", "credit utilisation", "LTV". Use plain analogies instead.

Worker: ${d.platform} partner, ₹${inc}/month income, ₹${d.monthlyExpenses} expenses, ₹${d.existingEMI} EMI, ${d.digital} UPI transactions/month, ${d.tenure} months on platform.
Score: ${result.total}/100. This unlocks loans up to: ₹${result.loanUnlocked.toLocaleString("en-IN")}.

Scores: Income ${Math.round(result.s.income)}/100, Consistency ${Math.round(result.s.stability)}/100, Savings ${Math.round(result.s.savings)}/100, Debt ${Math.round(result.s.emi)}/100, Digital ${Math.round(result.s.digital)}/100, Tenure ${Math.round(result.s.tenure)}/100.

Write exactly 3 sections with these headers:
**SCORE_STORY**
2 sentences. Tell them what this score means for their life right now — which loans are open, which are closed. Use rupee amounts.

**THREE_WINS**
3 bullet points. Start each with "✅". What they are doing RIGHT. Be specific with numbers from their data.

**THREE_FIXES**
3 bullet points. Start each with "🔧". The 3 easiest things to change. Each fix must say: WHAT to do + HOW (specific action) + WHY it helps in one simple sentence.`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await res.json();
  const text = data.content?.[0]?.text || "";
  const get = (h) => {
    const m = text.match(new RegExp(`\\*\\*${h}\\*\\*([\\s\\S]*?)(?=\\*\\*[A-Z_]+\\*\\*|$)`));
    return m ? m[1].trim() : "";
  };
  return { story: get("SCORE_STORY"), wins: get("THREE_WINS"), fixes: get("THREE_FIXES") };
}

/* ═══════════════════════════════════════════════════════════════
   HISTORY
═══════════════════════════════════════════════════════════════ */
function useHistory() {
  const [history, setHistory] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem("gc2_hist") || "[]"); } catch { return []; }
  });
  const push = useCallback((s, d) => setHistory(prev => {
    const next = [...prev.slice(-9), { s, date: new Date().toLocaleDateString("en-IN",{day:"2-digit",month:"short"}), ts: Date.now(), inc: d.monthlyIncome, emi: d.existingEMI }];
    try { sessionStorage.setItem("gc2_hist", JSON.stringify(next)); } catch {}
    return next;
  }), []);
  return [history, push];
}

const PLATFORMS = [
  { name: "Swiggy", icon: "🛵", color: "#f97316" },
  { name: "Zomato", icon: "🍕", color: "#ef4444" },
  { name: "Ola", icon: "🚗", color: "#16a34a" },
  { name: "Uber", icon: "🚕", color: "#1d4ed8" },
  { name: "Urban Company", icon: "🔧", color: "#7c3aed" },
  { name: "Blinkit", icon: "⚡", color: "#ca8a04" },
  { name: "Dunzo", icon: "📦", color: "#0891b2" },
  { name: "Rapido", icon: "🏍️", color: "#dc2626" },
  { name: "Zepto", icon: "🛒", color: "#6d28d9" },
];

const BLANK = { platform:"Swiggy", monthlyIncome:"", monthlyExpenses:"", existingEMI:"0", variance:"20", digital:"", tenure:"", months:"6" };

/* ═══════════════════════════════════════════════════════════════
   RING COMPONENT
═══════════════════════════════════════════════════════════════ */
function Ring({ score, size = 160 }) {
  const r = size * 0.38, C = 2 * Math.PI * r;
  const fill = C - (score / 100) * C;
  const col = score >= 70 ? "#10b981" : score >= 50 ? "#f59e0b" : "#f43f5e";
  const grade = score >= 70 ? "STRONG" : score >= 50 ? "FAIR" : "BUILDING";
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1e293b" strokeWidth={size*0.09}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={col} strokeWidth={size*0.09}
        strokeDasharray={C} strokeDashoffset={fill} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{transition:"stroke-dashoffset 1.2s cubic-bezier(.4,0,.2,1),stroke .4s"}}/>
      <text x={size/2} y={size/2-8} textAnchor="middle" fill={col} fontSize={size*0.22} fontWeight="900" fontFamily="'Courier New',monospace">{score}</text>
      <text x={size/2} y={size/2+12} textAnchor="middle" fill="#94a3b8" fontSize={size*0.075} fontFamily="sans-serif">/100</text>
      <text x={size/2} y={size/2+26} textAnchor="middle" fill={col} fontSize={size*0.08} fontWeight="800" fontFamily="sans-serif">{grade}</text>
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN APP
═══════════════════════════════════════════════════════════════ */
export default function App() {
  const [form, setForm] = useState(BLANK);
  const [page, setPage] = useState("home");
  const [tab, setTab]   = useState("score");
  const [lang, setLang] = useState("en");
  const [result, setResult] = useState(null);
  const [loans, setLoans]   = useState([]);
  const [plan, setPlan]     = useState([]);
  const [rejection, setRejection] = useState([]);
  const [ai, setAi]         = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiLang, setAiLang] = useState("en");
  const [simForm, setSimForm] = useState(null);
  const [simResult, setSimResult] = useState(null);
  const [history, pushHistory] = useHistory();
  const [expandedLoan, setExpandedLoan] = useState(null);
  const simTimer = useRef();

  useEffect(() => {
    if (!simForm) return;
    clearTimeout(simTimer.current);
    simTimer.current = setTimeout(() => setSimResult(scoreCalc(simForm)), 250);
    return () => clearTimeout(simTimer.current);
  }, [simForm]);

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const previewScore = form.monthlyIncome ? scoreCalc(form) : null;

  const handleSubmit = async () => {
    const r = scoreCalc(form);
    if (!r) return;
    setResult(r);
    setSimForm({ ...form });
    setSimResult(r);
    setLoans(matchLoans(r, form));
    setPlan(buildActionPlan(r, form));
    setRejection(REJECTION_REASONS.filter(x => x.trigger(r)).slice(0, 3));
    pushHistory(r.total, form);
    setPage("result");
    setTab("score");
    setAi(null);
    setAiLoading(true);
    try {
      const exp = await getAIExplanation(r, form, lang);
      setAi(exp);
    } catch { setAi({ story: "Explanation unavailable.", wins: "", fixes: "" }); }
    setAiLoading(false);
  };

  const fetchAiLang = async (l) => {
    if (!result) return;
    setAiLang(l);
    setAiLoading(true);
    try { const exp = await getAIExplanation(result, form, l); setAi(exp); } catch {}
    setAiLoading(false);
  };

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800;900&family=JetBrains+Mono:wght@400;700&display=swap');
    *{box-sizing:border-box;margin:0;padding:0;}
    body{background:#040d1a;color:#e8f0fe;font-family:'Sora',sans-serif;}
    input[type=range]{width:100%;accent-color:#3b82f6;height:5px;cursor:pointer;}
    input[type=checkbox]{accent-color:#3b82f6;width:15px;height:15px;cursor:pointer;}
    @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
    .fade-up{animation:fadeUp .45s ease forwards;}
    .pulse{animation:pulse 1.4s ease infinite;}
    ::placeholder{color:#2a4060;}
    input,select{outline:none;}
    a{color:inherit;text-decoration:none;}
    ::-webkit-scrollbar{width:4px;}
    ::-webkit-scrollbar-track{background:#0d1829;}
    ::-webkit-scrollbar-thumb{background:#1a2840;border-radius:4px;}
  `;

  const W = { maxWidth: 680, margin: "0 auto", padding: "0 16px" };
  const inp = { width:"100%", background:"#080f1e", border:"1px solid #1a2840", borderRadius:10, padding:"12px 14px", color:"#e8f0fe", fontSize:15, fontFamily:"'Sora',sans-serif", transition:"border-color .2s" };
  const lbl = { fontSize:12, color:"#4a6080", fontWeight:700, letterSpacing:".05em", marginBottom:6, display:"block", textTransform:"uppercase" };
  const card = { background:"#0d1829", border:"1px solid #1a2840", borderRadius:16, padding:20 };

  const Header = () => (
    <div style={{ background:"rgba(4,13,26,.9)", backdropFilter:"blur(16px)", borderBottom:"1px solid #0d1829", padding:"14px 20px", display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:200 }}>
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        <div style={{ width:32, height:32, borderRadius:8, background:"linear-gradient(135deg,#3b82f6,#7c3aed)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>⚡</div>
        <div>
          <div style={{ fontFamily:"'JetBrains Mono',monospace", fontWeight:700, fontSize:16, color:"#e8f0fe", letterSpacing:"-.03em" }}>GigCredit</div>
          <div style={{ fontSize:10, color:"#4a6080", letterSpacing:".1em" }}>FOR GIG WORKERS</div>
        </div>
      </div>
      <div style={{ display:"flex", gap:6, alignItems:"center" }}>
        {page==="result" && <button onClick={() => setPage("home")} style={{ fontSize:12, color:"#4a6080", background:"none", border:"1px solid #1a2840", borderRadius:8, padding:"5px 12px", cursor:"pointer", fontFamily:"'Sora',sans-serif" }}>← Edit</button>}
        {["en","hi","ta"].map(l => (
          <button key={l} onClick={() => setLang(l)} style={{ fontSize:11, fontWeight:700, padding:"4px 10px", borderRadius:6, border:`1px solid ${lang===l?"#3b82f6":"#1a2840"}`, background:lang===l?"rgba(59,130,246,.15)":"none", color:lang===l?"#3b82f6":"#4a6080", cursor:"pointer", fontFamily:"'Sora',sans-serif" }}>
            {l==="en"?"EN":l==="hi"?"हि":"த"}
          </button>
        ))}
      </div>
    </div>
  );

  /* ── HOME PAGE ── */
  if (page === "home") return (
    <div style={{ minHeight:"100vh", background:"#040d1a" }}>
      <style>{css}</style>
      <Header />
      <div style={{ ...W, paddingTop:40, paddingBottom:8, textAlign:"center" }}>
        <div style={{ display:"inline-flex", alignItems:"center", gap:8, background:"rgba(59,130,246,.1)", border:"1px solid rgba(59,130,246,.2)", borderRadius:20, padding:"6px 14px", marginBottom:20 }}>
          <span style={{ fontSize:12 }}>🇮🇳</span>
          <span style={{ fontSize:12, color:"#60a5fa", fontWeight:700 }}>Built for India's 15 Million Gig Workers</span>
        </div>
        <h1 style={{ fontSize:28, fontWeight:900, lineHeight:1.15, marginBottom:12, color:"#e8f0fe" }}>
          Banks reject you because they<br />
          <span style={{ background:"linear-gradient(90deg,#3b82f6,#a78bfa)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
            can't read your data.
          </span>
        </h1>
        <p style={{ color:"#4a6080", fontSize:15, lineHeight:1.6, maxWidth:480, margin:"0 auto 24px" }}>
          We translate your platform payouts, UPI history, and tenure into a credit score — and tell you exactly what to fix.
        </p>
        <div style={{ display:"flex", gap:8, justifyContent:"center", flexWrap:"wrap", marginBottom:32 }}>
          {["No CIBIL needed","Your data stays private","Takes 3 minutes","Free forever"].map(t => (
            <div key={t} style={{ fontSize:12, color:"#10b981", background:"rgba(16,185,129,.08)", border:"1px solid rgba(16,185,129,.2)", borderRadius:20, padding:"4px 12px" }}>✓ {t}</div>
          ))}
        </div>
        {previewScore && (
          <div style={{ background:"rgba(59,130,246,.08)", border:"1px solid rgba(59,130,246,.2)", borderRadius:12, padding:"12px 20px", marginBottom:20, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <span style={{ fontSize:13, color:"#60a5fa" }}>Live preview</span>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <span style={{ fontFamily:"'JetBrains Mono',monospace", fontWeight:900, fontSize:22, color: previewScore.total>=55?"#10b981":"#f59e0b" }}>{previewScore.total}<span style={{ fontSize:13, color:"#4a6080" }}>/100</span></span>
              <span style={{ fontSize:13, color:"#4a6080" }}>Unlocks up to <strong style={{ color:"#e8f0fe" }}>₹{(previewScore.loanUnlocked/1000).toFixed(0)}K</strong></span>
            </div>
          </div>
        )}
      </div>

      <div style={{ ...W, paddingBottom:60 }}>
        {/* Platform */}
        <div style={{ ...card, marginBottom:12 }}>
          <div style={{ fontSize:14, fontWeight:800, marginBottom:12 }}>Which platform do you work on?</div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
            {PLATFORMS.map(p => (
              <button key={p.name} onClick={() => f("platform", p.name)} style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 13px", borderRadius:8, border:`1px solid ${form.platform===p.name?p.color+"66":"#1a2840"}`, background:form.platform===p.name?p.color+"18":"transparent", color:form.platform===p.name?p.color:"#4a6080", cursor:"pointer", fontSize:13, fontWeight:form.platform===p.name?700:500, transition:"all .15s", fontFamily:"'Sora',sans-serif" }}>
                <span>{p.icon}</span> {p.name}
              </button>
            ))}
          </div>
        </div>

        {/* Income */}
        <div style={{ ...card, marginBottom:12 }}>
          <div style={{ fontSize:11, color:"#3b82f6", fontWeight:800, letterSpacing:".1em", marginBottom:14, textTransform:"uppercase" }}>💵 Income</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
            <div>
              <label style={lbl}>Monthly Take-Home (₹) *</label>
              <input style={inp} type="number" placeholder="e.g. 18000" value={form.monthlyIncome} onChange={e => f("monthlyIncome", e.target.value)} />
              <div style={{ fontSize:11, color:"#4a6080", marginTop:4 }}>Average after fuel/expenses</div>
            </div>
            <div>
              <label style={lbl}>Income Varies By (%)</label>
              <input style={inp} type="number" placeholder="e.g. 20" value={form.variance} onChange={e => f("variance", e.target.value)} />
              <div style={{ fontSize:11, color:"#4a6080", marginTop:4 }}>Jan ₹18K, Feb ₹14K → 22%</div>
            </div>
            <div>
              <label style={lbl}>Months Earning on Platform</label>
              <input style={inp} type="number" placeholder="e.g. 8" value={form.months} onChange={e => f("months", e.target.value)} />
            </div>
            <div>
              <label style={lbl}>Total Months on Platform</label>
              <input style={inp} type="number" placeholder="e.g. 14" value={form.tenure} onChange={e => f("tenure", e.target.value)} />
            </div>
          </div>
        </div>

        {/* Expenses */}
        <div style={{ ...card, marginBottom:12 }}>
          <div style={{ fontSize:11, color:"#f59e0b", fontWeight:800, letterSpacing:".1em", marginBottom:14, textTransform:"uppercase" }}>💸 Expenses</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
            <div>
              <label style={lbl}>Monthly Expenses (₹) *</label>
              <input style={inp} type="number" placeholder="e.g. 9000" value={form.monthlyExpenses} onChange={e => f("monthlyExpenses", e.target.value)} />
              <div style={{ fontSize:11, color:"#4a6080", marginTop:4 }}>Rent + food + fuel + everything</div>
            </div>
            <div>
              <label style={lbl}>Existing EMI per Month (₹)</label>
              <input style={inp} type="number" placeholder="e.g. 2000" value={form.existingEMI} onChange={e => f("existingEMI", e.target.value)} />
              <div style={{ fontSize:11, color:"#4a6080", marginTop:4 }}>Phone, bike, any loan EMIs</div>
            </div>
          </div>
          {form.monthlyIncome && form.monthlyExpenses && (
            <div style={{ marginTop:14, background:"#080f1e", borderRadius:10, padding:"10px 14px" }}>
              <div style={{ fontSize:12, color:"#4a6080", marginBottom:4 }}>Monthly leftover after all deductions</div>
              <div style={{ fontSize:18, fontWeight:900, fontFamily:"'JetBrains Mono',monospace", color:(() => { const d=(+form.monthlyIncome)-(+form.monthlyExpenses||0)-(+form.existingEMI||0); return d>0?"#10b981":"#f43f5e"; })() }}>
                ₹{Math.max(0,(+form.monthlyIncome)-(+form.monthlyExpenses||0)-(+form.existingEMI||0)).toLocaleString("en-IN")}
              </div>
            </div>
          )}
        </div>

        {/* Digital */}
        <div style={{ ...card, marginBottom:16 }}>
          <div style={{ fontSize:11, color:"#a78bfa", fontWeight:800, letterSpacing:".1em", marginBottom:14, textTransform:"uppercase" }}>📱 Digital Behaviour</div>
          <label style={lbl}>UPI / GPay / PhonePe Transactions Per Month</label>
          <input style={inp} type="number" placeholder="e.g. 35" value={form.digital} onChange={e => f("digital", e.target.value)} />
          <div style={{ fontSize:11, color:"#4a6080", marginTop:4 }}>Count auto fares, grocery, petrol, mobile recharge — every tap counts</div>
        </div>

        {previewScore?.fraudFlags?.length > 0 && (
          <div style={{ background:"rgba(244,63,94,.06)", border:"1px solid rgba(244,63,94,.2)", borderRadius:12, padding:"12px 16px", marginBottom:16 }}>
            <div style={{ fontSize:13, fontWeight:700, color:"#f43f5e", marginBottom:6 }}>⚠️ Data check</div>
            {previewScore.fraudFlags.map((flag, i) => <div key={i} style={{ fontSize:12, color:"#fda4af", marginBottom:2 }}>• {flag}</div>)}
          </div>
        )}

        <button onClick={handleSubmit} disabled={!form.monthlyIncome || !form.monthlyExpenses} style={{ width:"100%", padding:"15px", background:form.monthlyIncome&&form.monthlyExpenses?"linear-gradient(135deg,#3b82f6,#7c3aed)":"#1a2840", color:form.monthlyIncome&&form.monthlyExpenses?"#fff":"#4a6080", border:"none", borderRadius:12, fontSize:16, fontWeight:800, fontFamily:"'Sora',sans-serif", cursor:form.monthlyIncome&&form.monthlyExpenses?"pointer":"not-allowed", transition:"all .2s" }}>
          {!form.monthlyIncome ? "Enter your income to start →" : "Check My Eligibility →"}
        </button>
        <div style={{ textAlign:"center", fontSize:11, color:"#2a4060", marginTop:10 }}>Scores are indicative. Final loan approval depends on lender criteria.</div>
      </div>
    </div>
  );

  /* ── RESULT PAGE ── */
  const displayR = simResult || result;
  const matchedLoans = matchLoans(displayR, simForm || form);
  const scoreColor = displayR.total >= 70 ? "#10b981" : displayR.total >= 50 ? "#f59e0b" : "#f43f5e";

  const TabBtn = ({ id, icon, label }) => (
    <button onClick={() => setTab(id)} style={{ flex:1, padding:"8px 4px", background:tab===id?"rgba(59,130,246,.15)":"none", border:`1px solid ${tab===id?"rgba(59,130,246,.3)":"transparent"}`, borderRadius:8, color:tab===id?"#60a5fa":"#4a6080", fontSize:10, fontWeight:700, cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:3, transition:"all .2s", fontFamily:"'Sora',sans-serif", letterSpacing:".03em" }}>
      <span style={{ fontSize:15 }}>{icon}</span>
      <span>{label}</span>
    </button>
  );

  return (
    <div style={{ minHeight:"100vh", background:"#040d1a" }}>
      <style>{css}</style>
      <Header />
      <div style={{ ...W, paddingTop:20, paddingBottom:60 }}>

        {/* Score hero card */}
        <div style={{ ...card, marginBottom:16, textAlign:"center", position:"relative", overflow:"hidden" }}>
          <div style={{ position:"absolute", top:-40, right:-40, width:160, height:160, borderRadius:"50%", background:`radial-gradient(circle,${scoreColor}18,transparent 70%)`, pointerEvents:"none" }} />
          <div style={{ fontSize:13, color:"#4a6080", marginBottom:12, fontWeight:700 }}>
            {PLATFORMS.find(p=>p.name===form.platform)?.icon} {form.platform} Partner
          </div>
          <Ring score={displayR.total} size={160} />
          <div style={{ marginTop:12, display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
            {[
              ["Disposable",`₹${Math.max(0,displayR.disposable).toLocaleString("en-IN")}`,displayR.disposable>0?"#10b981":"#f43f5e"],
              ["EMI Load",`${(displayR.emiRatio*100).toFixed(0)}%`,displayR.emiRatio>0.4?"#f43f5e":"#10b981"],
              ["Loan Unlock",`₹${(displayR.loanUnlocked/1000).toFixed(0)}K`,"#60a5fa"],
            ].map(([label,val,col]) => (
              <div key={label} style={{ background:"#080f1e", borderRadius:10, padding:"8px 4px" }}>
                <div style={{ fontSize:10, color:"#4a6080", marginBottom:3 }}>{label}</div>
                <div style={{ fontSize:14, fontWeight:800, color:col, fontFamily:"'JetBrains Mono',monospace" }}>{val}</div>
              </div>
            ))}
          </div>
          {/* Loan ladder */}
          <div style={{ marginTop:14, background:"#080f1e", borderRadius:10, padding:"10px 14px" }}>
            <div style={{ fontSize:10, color:"#4a6080", marginBottom:8, fontWeight:700 }}>SCORE → LOAN AMOUNT UNLOCKED</div>
            <div style={{ display:"flex", gap:0 }}>
              {[[35,"₹25K"],[45,"₹50K"],[55,"₹1L"],[65,"₹2L"],[75,"₹3.5L"],[85,"₹5L"]].map(([threshold,label]) => {
                const unlocked = displayR.total >= threshold;
                return (
                  <div key={threshold} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
                    <div style={{ width:"100%", height:6, background:unlocked?"#3b82f6":"#1a2840", borderRadius:"2px", transition:"background .5s" }} />
                    <div style={{ fontSize:9, color:unlocked?"#60a5fa":"#2a4060", fontWeight:unlocked?700:400, textAlign:"center" }}>{label}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display:"flex", gap:4, marginBottom:16, background:"#080f1e", borderRadius:12, padding:4, border:"1px solid #1a2840" }}>
          <TabBtn id="score"   icon="📊" label="SCORE" />
          <TabBtn id="why"     icon="🏦" label="WHY" />
          <TabBtn id="plan"    icon="🗓️"  label="90-DAY" />
          <TabBtn id="loans"   icon="💰" label="LOANS" />
          <TabBtn id="whatif"  icon="🔮" label="SIM" />
          <TabBtn id="history" icon="📈" label="TRACK" />
          <TabBtn id="docs"    icon="📄" label="DOCS" />
        </div>

        {/* ── SCORE TAB ── */}
        {tab === "score" && (
          <div className="fade-up">
            <div style={{ ...card, marginBottom:12 }}>
              <div style={{ fontSize:13, fontWeight:800, marginBottom:14 }}>🔍 How Your Score Is Built — Every Number Explained</div>
              {Object.entries(WEIGHTS).map(([key, meta]) => {
                const val = Math.round(displayR.s[key]);
                const col = val>=70?"#10b981":val>=45?"#f59e0b":"#f43f5e";
                const contribution = Math.round(val * meta.w);
                return (
                  <div key={key} style={{ marginBottom:14 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:5 }}>
                      <div>
                        <span style={{ fontSize:13, fontWeight:700 }}>{meta.icon} {meta.label}</span>
                        <div style={{ fontSize:11, color:"#4a6080" }}>{meta.help}</div>
                      </div>
                      <div style={{ textAlign:"right", flexShrink:0, marginLeft:8 }}>
                        <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:13, fontWeight:700, color:col }}>{val}</span>
                        <span style={{ fontSize:11, color:"#4a6080" }}>/100 · +{contribution}pts</span>
                      </div>
                    </div>
                    <div style={{ height:7, background:"#080f1e", borderRadius:4, overflow:"hidden" }}>
                      <div style={{ height:"100%", width:`${val}%`, background:`linear-gradient(90deg,${col}88,${col})`, borderRadius:4, transition:"width 1s cubic-bezier(.4,0,.2,1)" }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* AI Explanation */}
            <div style={{ ...card, marginBottom:12 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
                <div style={{ fontSize:13, fontWeight:800 }}>🤖 Plain Language Explanation</div>
                <div style={{ display:"flex", gap:5 }}>
                  {[["en","EN"],["hi","हिं"],["ta","தமி"]].map(([l,label]) => (
                    <button key={l} onClick={() => fetchAiLang(l)} disabled={aiLoading} style={{ fontSize:11, fontWeight:700, padding:"3px 8px", borderRadius:6, border:`1px solid ${aiLang===l?"#3b82f6":"#1a2840"}`, background:aiLang===l?"rgba(59,130,246,.15)":"none", color:aiLang===l?"#60a5fa":"#4a6080", cursor:"pointer", fontFamily:"'Sora',sans-serif" }}>{label}</button>
                  ))}
                </div>
              </div>
              {aiLoading ? (
                <div style={{ textAlign:"center", padding:28, color:"#4a6080" }}>
                  <div className="pulse" style={{ fontSize:28, marginBottom:8 }}>✨</div>
                  <div style={{ fontSize:13 }}>Writing your personalised explanation…</div>
                </div>
              ) : ai ? (
                <>
                  <div style={{ background:"#080f1e", borderRadius:10, padding:"12px 14px", marginBottom:12, borderLeft:"3px solid #3b82f6" }}>
                    <div style={{ fontSize:14, color:"#e8f0fe", lineHeight:1.7 }}>{ai.story}</div>
                  </div>
                  {ai.wins && <div style={{ marginBottom:12 }}>
                    <div style={{ fontSize:12, fontWeight:800, color:"#10b981", marginBottom:8, letterSpacing:".05em" }}>WHAT'S WORKING FOR YOU</div>
                    <div style={{ fontSize:13, color:"#cbd5e1", lineHeight:1.8, whiteSpace:"pre-line" }}>{ai.wins}</div>
                  </div>}
                  {ai.fixes && <div>
                    <div style={{ fontSize:12, fontWeight:800, color:"#f59e0b", marginBottom:8, letterSpacing:".05em" }}>WHAT TO FIX</div>
                    <div style={{ fontSize:13, color:"#cbd5e1", lineHeight:1.8, whiteSpace:"pre-line" }}>{ai.fixes}</div>
                  </div>}
                </>
              ) : null}
            </div>

            {/* Rejection decoder */}
            {rejection.length > 0 && (
              <div style={{ ...card, background:"rgba(244,63,94,.04)", border:"1px solid rgba(244,63,94,.15)" }}>
                <div style={{ fontSize:13, fontWeight:800, marginBottom:12, color:"#fda4af" }}>⚠️ Why Banks Currently Reject You — Decoded</div>
                {rejection.map((r, i) => (
                  <div key={i} style={{ marginBottom:i<rejection.length-1?16:0, paddingBottom:i<rejection.length-1?16:0, borderBottom:i<rejection.length-1?"1px solid rgba(244,63,94,.1)":"none" }}>
                    <div style={{ fontSize:13, fontWeight:700, color:"#fda4af", marginBottom:4 }}>🚫 {r.title}</div>
                    <div style={{ fontSize:12, color:"#94a3b8", marginBottom:6, lineHeight:1.5 }}><strong>What banks say internally:</strong> {r.honest}</div>
                    <div style={{ fontSize:12, color:"#86efac", lineHeight:1.5 }}><strong>Your move:</strong> {r.solution}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── WHY TAB ── */}
        {tab === "why" && (
          <div className="fade-up">
            <div style={{ ...card, marginBottom:12 }}>
              <div style={{ fontSize:13, fontWeight:800, marginBottom:4 }}>🏦 Inside a Bank's Decision in 5 Steps</div>
              <div style={{ fontSize:12, color:"#4a6080", marginBottom:16 }}>This is what happens behind closed doors when you apply.</div>
              {[
                { step:"1", title:"They check if you have a CIBIL score", detail:"No score = immediate auto-reject at 70% of banks. Our model helps you build a case even without CIBIL.", icon:"🔎", color:"#f43f5e" },
                { step:"2", title:"They calculate your FOIR (Fixed Obligation to Income Ratio)", detail:`That's just: EMI ÷ Income. Yours is ${(displayR.emiRatio*100).toFixed(0)}%. Banks want below 40%.`, icon:"➗", color:"#f59e0b" },
                { step:"3", title:"They verify income stability", detail:"They want the same amount, every month. Gig income varying 40%+ is treated as unstable.", icon:"📈", color:"#a78bfa" },
                { step:"4", title:"They check for digital financial behaviour", detail:"UPI transactions prove you manage money regularly. Zero UPI = zero proof.", icon:"📱", color:"#3b82f6" },
                { step:"5", title:"The algorithm decides in 3 seconds", detail:"It can't read platform screenshots. That's exactly why gig workers are rejected — the data exists, the system just can't parse it.", icon:"⚡", color:"#10b981" },
              ].map(item => (
                <div key={item.step} style={{ display:"flex", gap:12, marginBottom:14, paddingBottom:14, borderBottom:"1px solid #1a2840" }}>
                  <div style={{ width:32, height:32, borderRadius:8, background:item.color+"18", border:`1px solid ${item.color}44`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, flexShrink:0 }}>{item.icon}</div>
                  <div>
                    <div style={{ fontSize:13, fontWeight:700, color:"#e8f0fe", marginBottom:3 }}>Step {item.step}: {item.title}</div>
                    <div style={{ fontSize:12, color:"#4a6080", lineHeight:1.5 }}>{item.detail}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ ...card, background:"rgba(59,130,246,.05)", border:"1px solid rgba(59,130,246,.2)" }}>
              <div style={{ fontSize:13, fontWeight:800, marginBottom:8, color:"#60a5fa" }}>💡 How to Frame Your Income to Lenders</div>
              <div style={{ fontSize:13, color:"#94a3b8", lineHeight:1.7 }}>
                Don't say "I'm a {form.platform} delivery partner." Say:<br/><br/>
                <span style={{ fontStyle:"italic", color:"#e8f0fe", background:"#080f1e", padding:"10px 14px", borderRadius:8, display:"block", borderLeft:"3px solid #3b82f6", lineHeight:1.6 }}>
                  "I am a self-employed micro-entrepreneur in the logistics sector with {form.tenure || "X"}+ months of documented weekly income via digital platform payouts, averaging ₹{(+form.monthlyIncome||0).toLocaleString("en-IN")} per month."
                </span><br/>
                This works because it avoids the "gig worker" label that triggers auto-rejection, positions you as a business owner (better credit profile), and matches MUDRA's stated target demographic exactly.
              </div>
            </div>
          </div>
        )}

        {/* ── 90-DAY PLAN TAB ── */}
        {tab === "plan" && (
          <div className="fade-up">
            <div style={{ ...card, marginBottom:12 }}>
              <div style={{ fontSize:13, fontWeight:800, marginBottom:4 }}>🗓️ Your Personal 90-Day Credit Building Plan</div>
              <div style={{ fontSize:12, color:"#4a6080", marginBottom:16 }}>Concrete weekly steps — not vague advice.</div>
              {plan.map((item, i) => (
                <div key={i} style={{ marginBottom:14, background:"#080f1e", borderRadius:12, overflow:"hidden" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 14px", borderBottom:"1px solid #1a2840" }}>
                    <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                      <span style={{ fontSize:20 }}>{item.emoji}</span>
                      <div>
                        <div style={{ fontSize:13, fontWeight:800 }}>{item.title}</div>
                        <div style={{ fontSize:11, color:"#4a6080" }}>{item.week}</div>
                      </div>
                    </div>
                    <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:13, fontWeight:900, color:"#10b981" }}>{item.points}</div>
                  </div>
                  <div style={{ padding:"12px 14px" }}>
                    <div style={{ fontSize:12, color:"#4a6080", marginBottom:10, lineHeight:1.5 }}>
                      <strong style={{ color:"#a78bfa" }}>Why this matters:</strong> {item.why}
                    </div>
                    {item.steps.map((step, j) => (
                      <div key={j} style={{ display:"flex", gap:8, marginBottom:7, alignItems:"flex-start" }}>
                        <div style={{ width:20, height:20, borderRadius:5, background:"rgba(59,130,246,.15)", border:"1px solid rgba(59,130,246,.2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, color:"#60a5fa", fontWeight:800, flexShrink:0, marginTop:1 }}>{j+1}</div>
                        <div style={{ fontSize:13, color:"#cbd5e1", lineHeight:1.5 }}>{step}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ ...card, background:"rgba(167,139,250,.05)", border:"1px solid rgba(167,139,250,.2)" }}>
              <div style={{ fontSize:13, fontWeight:800, marginBottom:8, color:"#a78bfa" }}>
                {PLATFORMS.find(p=>p.name===form.platform)?.icon} {form.platform}-Specific Credit Tip
              </div>
              <div style={{ fontSize:13, color:"#94a3b8", lineHeight:1.7 }}>
                {form.platform==="Swiggy"||form.platform==="Zomato" ? <>Go to <strong style={{color:"#e8f0fe"}}>Earnings → Payment History → Export</strong> in the partner app. This generates a PDF payout statement. <strong style={{color:"#e8f0fe"}}>This single document can replace a salary slip</strong> with lenders like Faircent and KreditBee. Save 6 months of these.</>
                :form.platform==="Ola"||form.platform==="Uber" ? <>In the driver app, request a <strong style={{color:"#e8f0fe"}}>"Partner Earnings Certificate"</strong> from Support. Ola issues this free of charge. It lists monthly earnings and serves as income proof. Also export weekly trip summaries as PDFs.</>
                :form.platform==="Urban Company" ? <>Urban Company professionals can request an <strong style={{color:"#e8f0fe"}}>"SP Income Summary"</strong> from the partner portal. This works with MUDRA Shishu applications.</>
                : <>Screenshot your weekly payout summary every Monday for 3 months. Compile into a single PDF using CamScanner (free). This becomes your income portfolio.</>}
              </div>
            </div>
          </div>
        )}

        {/* ── LOANS TAB ── */}
        {tab === "loans" && (
          <div className="fade-up">
            {matchedLoans.length===0 ? (
              <div style={{ ...card, textAlign:"center", padding:40 }}>
                <div style={{ fontSize:40, marginBottom:12 }}>📊</div>
                <div style={{ fontSize:15, fontWeight:700, marginBottom:8 }}>No standard loans match yet</div>
                <div style={{ fontSize:13, color:"#4a6080", lineHeight:1.6 }}>Score of {displayR.total} is below most lenders' minimums.<br/>Follow the 90-day plan — you could unlock ₹25K–₹50K in 60 days.</div>
              </div>
            ) : matchedLoans.map(loan => (
              <div key={loan.id} style={{ ...card, marginBottom:12, cursor:"pointer" }} onClick={() => setExpandedLoan(expandedLoan===loan.id?null:loan.id)}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                    <span style={{ fontSize:26 }}>{loan.icon}</span>
                    <div>
                      <div style={{ fontSize:14, fontWeight:800 }}>{loan.name}</div>
                      <div style={{ fontSize:11, color:"#4a6080" }}>{loan.org}</div>
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                    <span style={{ fontSize:10, fontWeight:700, padding:"3px 9px", borderRadius:10, background:loan.tagBg, color:loan.tagColor, border:`1px solid ${loan.tagColor}44` }}>{loan.tag}</span>
                    <span style={{ color:"#4a6080" }}>{expandedLoan===loan.id?"▲":"▼"}</span>
                  </div>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginTop:12 }}>
                  {[["Up to",`₹${(loan.max/1000).toFixed(0)}K`],["Rate",loan.rate],["Tenure",loan.months+" mo"]].map(([label,val]) => (
                    <div key={label} style={{ background:"#080f1e", borderRadius:8, padding:"7px 10px", textAlign:"center" }}>
                      <div style={{ fontSize:10, color:"#4a6080" }}>{label}</div>
                      <div style={{ fontSize:13, fontWeight:700, fontFamily:"'JetBrains Mono',monospace" }}>{val}</div>
                    </div>
                  ))}
                </div>
                {expandedLoan===loan.id && (
                  <div style={{ marginTop:14 }}>
                    <div style={{ fontSize:12, color:"#94a3b8", marginBottom:12, lineHeight:1.6 }}>{loan.why}</div>
                    <div style={{ marginBottom:12 }}>
                      <div style={{ fontSize:11, fontWeight:700, color:"#4a6080", marginBottom:6, textTransform:"uppercase", letterSpacing:".05em" }}>How to apply:</div>
                      {loan.applySteps.map((s, i) => (
                        <div key={i} style={{ display:"flex", gap:8, marginBottom:5 }}>
                          <div style={{ width:18, height:18, borderRadius:4, background:"rgba(59,130,246,.15)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, color:"#60a5fa", fontWeight:800, flexShrink:0, marginTop:2 }}>{i+1}</div>
                          <div style={{ fontSize:12, color:"#cbd5e1", lineHeight:1.5 }}>{s}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginBottom:12 }}>
                      <div style={{ fontSize:12, color:"#fbbf24", background:"rgba(245,158,11,.08)", borderRadius:8, padding:"8px 12px", lineHeight:1.5 }}>💡 Insider tip: {loan.tip}</div>
                    </div>
                    <div style={{ marginBottom:14 }}>
                      <div style={{ fontSize:11, fontWeight:700, color:"#4a6080", marginBottom:6, textTransform:"uppercase", letterSpacing:".05em" }}>Documents needed:</div>
                      <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                        {loan.docs.map(d => <span key={d} style={{ fontSize:11, background:"#1a2840", borderRadius:6, padding:"3px 9px", color:"#94a3b8" }}>📎 {d}</span>)}
                      </div>
                    </div>
                    <a href={loan.link} target="_blank" rel="noreferrer" style={{ display:"block", textAlign:"center", background:"linear-gradient(135deg,#3b82f6,#7c3aed)", color:"#fff", padding:"11px", borderRadius:10, fontWeight:800, fontSize:14 }}>
                      Apply for {loan.name} →
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── WHAT-IF TAB ── */}
        {tab === "whatif" && simForm && (
          <div className="fade-up">
            <div style={{ ...card, marginBottom:12, textAlign:"center" }}>
              <div style={{ fontSize:13, fontWeight:800, marginBottom:4 }}>🔮 What-If Simulator</div>
              <div style={{ fontSize:12, color:"#4a6080", marginBottom:14 }}>Drag sliders to see your score change in real-time</div>
              <Ring score={simResult?.total??0} size={130} />
              {simResult && result && simResult.total !== result.total && (
                <div style={{ marginTop:8, fontSize:15, fontWeight:900, fontFamily:"'JetBrains Mono',monospace", color:simResult.total>result.total?"#10b981":"#f43f5e" }}>
                  {simResult.total>result.total?"▲":"▼"} {Math.abs(simResult.total-result.total)} pts · Unlocks ₹{(simResult.loanUnlocked/1000).toFixed(0)}K
                </div>
              )}
            </div>
            <div style={card}>
              {[
                ["monthlyIncome","Monthly Income (₹)",0,80000,500,"₹"],
                ["monthlyExpenses","Monthly Expenses (₹)",0,60000,500,"₹"],
                ["existingEMI","Existing EMI (₹)",0,30000,500,"₹"],
                ["digital","UPI Transactions/Month",0,150,1,""],
                ["tenure","Platform Tenure (months)",0,60,1,""],
                ["variance","Income Variance (%)",0,80,1,""],
              ].map(([field,label,min,max,step,prefix]) => (
                <div key={field} style={{ marginBottom:18 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                    <label style={{ fontSize:12, color:"#4a6080", fontWeight:700 }}>{label}</label>
                    <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:13, fontWeight:700, color:"#60a5fa" }}>{prefix}{(+simForm[field]||0).toLocaleString("en-IN")}</span>
                  </div>
                  <input type="range" min={min} max={max} step={step} value={simForm[field]||0} onChange={e => setSimForm(p => ({ ...p, [field]:e.target.value }))} />
                </div>
              ))}
              {simResult && (
                <div style={{ borderTop:"1px solid #1a2840", paddingTop:14 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:"#4a6080", marginBottom:10 }}>Updated factor scores:</div>
                  {Object.entries(simResult.s).map(([key,val]) => {
                    const col = val>=70?"#10b981":val>=45?"#f59e0b":"#f43f5e";
                    return (
                      <div key={key} style={{ marginBottom:8 }}>
                        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                          <span style={{ fontSize:11, color:"#94a3b8" }}>{WEIGHTS[key].icon} {WEIGHTS[key].label}</span>
                          <span style={{ fontSize:11, fontFamily:"'JetBrains Mono',monospace", color:col }}>{Math.round(val)}/100</span>
                        </div>
                        <div style={{ height:4, background:"#0d1829", borderRadius:2, overflow:"hidden" }}>
                          <div style={{ height:"100%", width:`${val}%`, background:col, borderRadius:2, transition:"width .3s" }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── HISTORY TAB ── */}
        {tab === "history" && (
          <div className="fade-up">
            {history.length < 2 ? (
              <div style={{ ...card, textAlign:"center", padding:40, color:"#4a6080" }}>
                <div style={{ fontSize:36, marginBottom:12 }}>📈</div>
                <div>Score yourself again after following the action plan to track your improvement here.</div>
              </div>
            ) : (
              <div style={card}>
                <div style={{ fontSize:13, fontWeight:800, marginBottom:16 }}>📈 Your Score Journey</div>
                <div style={{ display:"flex", alignItems:"flex-end", gap:6, height:120, marginBottom:16 }}>
                  {history.map((entry, i) => {
                    const h = Math.max(12, (entry.s/100)*110);
                    const col = entry.s>=70?"#10b981":entry.s>=50?"#f59e0b":"#f43f5e";
                    return (
                      <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                        <div style={{ fontSize:10, color:col, fontWeight:700 }}>{entry.s}</div>
                        <div style={{ width:"80%", height:h, background:`linear-gradient(180deg,${col},${col}44)`, borderRadius:"3px 3px 0 0", transition:"height .5s" }} />
                        <div style={{ fontSize:9, color:"#4a6080", textAlign:"center" }}>{entry.date}</div>
                      </div>
                    );
                  })}
                </div>
                <div style={{ background:"#080f1e", borderRadius:10, padding:"10px 14px" }}>
                  <div style={{ fontSize:12, color:"#4a6080" }}>Change since first check:&nbsp;
                    <strong style={{ color:history[history.length-1].s>=history[0].s?"#10b981":"#f43f5e", fontFamily:"'JetBrains Mono',monospace" }}>
                      {history[history.length-1].s>=history[0].s?"+":""}{history[history.length-1].s-history[0].s} points
                    </strong>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── DOCS TAB ── */}
        {tab === "docs" && (
          <div className="fade-up">
            <div style={{ ...card, marginBottom:12 }}>
              <div style={{ fontSize:13, fontWeight:800, marginBottom:4 }}>📄 Document Readiness Checklist</div>
              <div style={{ fontSize:12, color:"#4a6080", marginBottom:16 }}>Gather these before you walk into a bank or open a loan app.</div>
              {[
                { name:"Aadhaar Card", status:"essential", tip:"Must be linked to your mobile number. Check at myaadhaar.uidai.gov.in", where:"UIDAI website or nearest e-Aadhaar kiosk" },
                { name:"PAN Card", status:"essential", tip:"Apply free at incometax.gov.in if you don't have one. Takes 10 minutes online.", where:"NSDL portal → Apply Online" },
                { name:`${form.platform} Payout History (3–6 months)`, status:"essential", tip:`In ${form.platform} partner app → Earnings → Payment History → Export or screenshot each month`, where:`${form.platform} partner app` },
                { name:"Bank Account Statement (6 months)", status:"essential", tip:"Download as PDF from net banking. If no net banking, get it stamped at your branch for free.", where:"Net banking → Statements → Download PDF" },
                { name:"UPI Transaction History", status:"helpful", tip:"In PhonePe/GPay: go to History → filter by date → screenshot or export. Shows financial behaviour.", where:"PhonePe app → History → Export" },
                { name:"Selfie (clear, good lighting)", status:"essential", tip:"For video KYC on loan apps. Take in daylight near a window. White or plain background preferred.", where:"Take now and save to gallery" },
                { name:"GSTIN / Udyam Certificate", status:"optional", tip:"Register as micro-entrepreneur free at udyamregistration.gov.in — improves MUDRA eligibility significantly.", where:"udyamregistration.gov.in (free, 5 minutes)" },
                { name:"Income Certificate", status:"optional", tip:"Ask your local ward office or municipality for a self-declaration income certificate. Free.", where:"Local ward office / Gram Panchayat" },
              ].map((doc, i) => {
                const col = doc.status==="essential"?"#f43f5e":doc.status==="helpful"?"#f59e0b":"#4a6080";
                return (
                  <div key={i} style={{ display:"flex", gap:12, padding:"12px 0", borderBottom:i<7?"1px solid #1a2840":"none" }}>
                    <input type="checkbox" style={{ marginTop:3, flexShrink:0 }} />
                    <div style={{ flex:1 }}>
                      <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:4, flexWrap:"wrap" }}>
                        <span style={{ fontSize:13, fontWeight:700 }}>{doc.name}</span>
                        <span style={{ fontSize:9, fontWeight:800, padding:"2px 8px", borderRadius:8, background:col+"18", color:col, border:`1px solid ${col}33`, letterSpacing:".05em" }}>{doc.status.toUpperCase()}</span>
                      </div>
                      <div style={{ fontSize:12, color:"#4a6080", marginBottom:3, lineHeight:1.5 }}>💡 {doc.tip}</div>
                      <div style={{ fontSize:11, color:"#3b82f6" }}>📍 {doc.where}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ ...card, background:"rgba(16,185,129,.04)", border:"1px solid rgba(16,185,129,.2)" }}>
              <div style={{ fontSize:13, fontWeight:800, color:"#34d399", marginBottom:8 }}>🎯 Fastest Path to Your First Loan</div>
              <div style={{ fontSize:13, color:"#94a3b8", lineHeight:1.8 }}>
                <strong style={{ color:"#e8f0fe" }}>Today:</strong> Screenshot 3 months of {form.platform} payouts + download bank statement PDF.<br/>
                <strong style={{ color:"#e8f0fe" }}>This week:</strong> Apply via Navi or KreditBee app (no branch visit needed).<br/>
                <strong style={{ color:"#e8f0fe" }}>This month:</strong> If rejected, visit SBI branch and ask specifically for PM MUDRA Shishu.<br/>
                <span style={{ color:"#fbbf24" }}>⚖️ By law, banks must provide you a MUDRA application form. They cannot refuse.</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
