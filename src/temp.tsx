import React, { useState, useEffect } from "react";
import { CompanyReport, Financials } from "./types";
import { 
  calculateCore8Metrics, 
  calculateSectorMetrics, 
  calculateScoring 
} from "./fincore_engine";
import { 
  ShieldCheck, 
  Award, 
  Zap, 
  TrendingUp, 
  Info, 
  Scale, 
  CheckCircle2, 
  AlertTriangle, 
  Briefcase, 
  Calendar, 
  FileText,
  Loader2,
  Sparkles,
  Upload,
  Layers,
  ArrowRight,
  Brain,
  Terminal,
  Sliders,
  Cpu
} from "lucide-react";
import { motion } from "motion/react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

function safeNum(val: any): number {
  if (val === undefined || val === null) return 0;
  if (typeof val === "number") return val;
  const cleaned = String(val).replace(/[^0-9.-]/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

interface FinCoreViewProps {
  key?: string;
  reports: CompanyReport[];
  sector: string;
  year: string;
  setView: (view: "upload" | "dashboard" | "archive" | "news" | "fincore") => void;
  setSelectedReport: (report: CompanyReport | null) => void;
  archive: { year: string; sectors: string[] }[];
  loadReports: (y: string, s: string, overrideView?: "upload" | "dashboard" | "archive" | "news" | "fincore") => Promise<void>;
}

interface BaseFieldMeta {
  fieldId: string;
  label: string;
  category: string;
}

interface CoreMetricDefinition {
  id: string;
  label: string;
  fullName: string;
  formula: string;
  desc: string;
  highTells: string;
  lowTells: string;
  baseFields: BaseFieldMeta[];
}

export function getSectorMeta(sec: string): CoreMetricDefinition[] {
  const normSec = (sec || "").toUpperCase();
  if (normSec.includes("TECH") || normSec.includes("SOFTWARE")) {
    return [
      {
        id: "rd_ratio",
        label: "R&D Ratio",
        fullName: "R&D-to-Revenue Ratio",
        formula: "Research & Development / Revenue",
        desc: "Measures the proportion of income reinvested directly into future product breakthroughs, code refactoring, or clinical development.",
        highTells: "Demonstrates high commitment to technical leadership, long-term product supremacy, and heavy competitive moat creation.",
        lowTells: "Suggests under-investment in future features, risk of product dilution, and vulnerability to fast-moving rivals.",
        baseFields: [
          { fieldId: "revenue", label: "Annual Revenue", category: "incomeStatement" },
          { fieldId: "researchDevelopment", label: "R&D Expense", category: "incomeStatement" }
        ]
      },
      {
        id: "rule_of_40",
        label: "Rule of 40",
        fullName: "SaaS Rule of 40 Score",
        formula: "Revenue Growth % + FCF Margin %",
        desc: "A baseline health indicator for technology firms: a high value proves that growth doesn't come via ruinous high burn.",
        highTells: "Elite SaaS compounding where lightning-fast organic growth operates with strong unit cash-flow profitability.",
        lowTells: "Unprofitable growth drag, heavy client-acquisition costs relative to retention, or structural decline in demand.",
        baseFields: [
          { fieldId: "revenue", label: "Annual Revenue", category: "incomeStatement" },
          { fieldId: "operatingCashFlow", label: "Operating Cash Flow", category: "cashFlow" },
          { fieldId: "capitalExpenditure", label: "Capital Expenditure (CapEx)", category: "cashFlow" }
        ]
      },
      {
        id: "gross_margin",
        label: "Gross Margin",
        fullName: "Gross Margin Integrity",
        formula: "Gross Profit / Revenue",
        desc: "An accurate structural check showing core product delivery costs before administrative and marketing adjustments.",
        highTells: "Incredible software pricing power, low cost of hosting/delivery relative to sales, and high operating leverage room.",
        lowTells: "Stressed commodity delivery costs, heavy physical professional services, or severe commoditization of key products.",
        baseFields: [
          { fieldId: "revenue", label: "Annual Revenue", category: "incomeStatement" },
          { fieldId: "costOfGoodsSold", label: "Cost of Goods Sold (COGS)", category: "incomeStatement" },
          { fieldId: "grossProfit", label: "Gross Profit (optional)", category: "incomeStatement" }
        ]
      }
    ];
  }

  if (normSec.includes("FINANCIAL") || normSec.includes("BANK")) {
    return [
      {
        id: "nim_proxy",
        label: "NIM Proxy",
        fullName: "Net Interest Margin (NIM) Proxy",
        formula: "Gross Profit / Revenue",
        desc: "Checks interest earning efficiency relative to total gross interest income generated of bank balance structures.",
        highTells: "Powerful deposit access at low interest rates combined with high lending yields and premium credit spread control.",
        lowTells: "Stressed deposit acquisition costs, heavy competition for depositors, or low net return yield metrics on bank books.",
        baseFields: [
          { fieldId: "revenue", label: "Gross Financial Revenue", category: "incomeStatement" },
          { fieldId: "grossProfit", label: "Net Interest Income (GP)", category: "incomeStatement" }
        ]
      },
      {
        id: "adequacy",
        label: "Capital Adequacy",
        fullName: "CET1 Capital Adequacy Proxy",
        formula: "Total Equity / Total Assets",
        desc: "Key regulatory safety index tracking loss-absorbing capital reserve ratios against active balance sheet assets.",
        highTells: "Highly conservative asset position, supreme safety cushion against bad debt events, and low margin risk.",
        lowTells: "Stretched gearing ratios, high vulnerability to banking distress, and potential regulatory restrictions.",
        baseFields: [
          { fieldId: "totalEquity", label: "Total Shareholders Equity", category: "balanceSheet" },
          { fieldId: "totalAssets", label: "Total Banking Assets", category: "balanceSheet" }
        ]
      },
      {
        id: "cost_income",
        label: "Cost-to-Income",
        fullName: "Cost-to-Income Efficiency",
        formula: "Operating Expenses / Revenue",
        desc: "Tracks the operational leakage showing how much revenue is absorbed by branches, physical staff, or standard administration.",
        highTells: "Bloated legacy offline branch overhead, inefficient cost structures, or weak digitized channel scaling.",
        lowTells: "Lean modern digitized organization, superb scale efficiencies, and highly productive operational margins.",
        baseFields: [
          { fieldId: "revenue", label: "Gross Revenue", category: "incomeStatement" },
          { fieldId: "operatingExpenses", label: "Operating Expenses", category: "incomeStatement" }
        ]
      }
    ];
  }

  if (normSec.includes("CONSTRUCT") || normSec.includes("INDUSTRIAL") || normSec.includes("INFRA")) {
    return [
      {
        id: "asset_turn",
        label: "Asset Turnover",
        fullName: "Asset Turnover Velocity",
        formula: "Revenue / Total Assets",
        desc: "Checks how many times the total underlying machinery, land, and project hardware are recycled into active cash revenues.",
        highTells: "Superb plant utilization rates, efficient inventory handling, and fast project generation speed.",
        lowTells: "Idle factories, stagnant order books, or overcapitalized hardware bases generating weak commercial outcomes.",
        baseFields: [
          { fieldId: "revenue", label: "Annual Revenue", category: "incomeStatement" },
          { fieldId: "totalAssets", label: "Total assets", category: "balanceSheet" }
        ]
      },
      {
        id: "debt_equity",
        label: "Solvency Gearing",
        fullName: "Leverage (Debt-to-Equity)",
        formula: "Total Debt / Total Equity",
        desc: "Classical insolvency defense ratio showing relative contributions of external lenders versus actual shareholders.",
        highTells: "Aggressive debt-fuelled expansion structures, high debt-servicing requirements, and solvency vulnerability.",
        lowTells: "Strong balance sheet independence, high reserve cushion to weather down-turned execution cycles safely.",
        baseFields: [
          { fieldId: "totalEquity", label: "Total Shareholders Equity", category: "balanceSheet" },
          { fieldId: "shortTermDebt", label: "Short-Term Debt", category: "balanceSheet" },
          { fieldId: "longTermDebt", label: "Long-Term Debt", category: "balanceSheet" }
        ]
      },
      {
        id: "working_cap_rev",
        label: "Working Cap Ratio",
        fullName: "Working Capital / Revenue",
        formula: "(Current Assets - Current Liabilities) / Revenue",
        desc: "Measures underlying liquidity runway required to bridge contract collection lags and raw material down payments.",
        highTells: "Substantial liquid capability to confidently fund concurrent projects without cash-flow bottleneck alerts.",
        lowTells: "High risk of sudden cash-flow failure if customer milestone collections are delayed by even 30 days.",
        baseFields: [
          { fieldId: "revenue", label: "Annual Revenue", category: "incomeStatement" },
          { fieldId: "currentAssets", label: "Current Assets", category: "balanceSheet" },
          { fieldId: "currentLiabilities", label: "Current Liabilities", category: "balanceSheet" }
        ]
      }
    ];
  }

  if (normSec.includes("REIT") || normSec.includes("PROPERTY")) {
    return [
      {
        id: "reit_leverage",
        label: "LTV Gearing",
        fullName: "Financial Gearing Ratio (LTV)",
        formula: "Total Debt / Total Assets",
        desc: "Calculates the loan-to-value ratio, a critical regulated performance restriction for property trusts and developers.",
        highTells: "Highly leveraged properties, sensitive to asset write-downs or sharp rate movements.",
        lowTells: "Extremely strong cash reserves, solid acquisition room to buy cheap properties without issuing dilutive paper.",
        baseFields: [
          { fieldId: "totalAssets", label: "Total Property Assets", category: "balanceSheet" },
          { fieldId: "shortTermDebt", label: "Short-Term Debt", category: "balanceSheet" },
          { fieldId: "longTermDebt", label: "Long-Term Debt", category: "balanceSheet" }
        ]
      },
      {
        id: "reit_yield",
        label: "Distribution Yield",
        fullName: "Realized Distribution Yield",
        formula: "Dividend Yield",
        desc: "Measures total continuous cash payout returned to trust unit holders from underlying master rent receipts.",
        highTells: "Strong consistent landlord collections, high occupancy rates, and stellar yield attraction for cash seekers.",
        lowTells: "Stressed vacancy, rent defaults, or major rental concession periods reducing distributable cash.",
        baseFields: [
          { fieldId: "dividendYield", label: "Dividend Yield / Distribution", category: "ratios" }
        ]
      },
      {
        id: "dscr_proxy",
        label: "Debt Coverage",
        fullName: "Debt Service Coverage Proxy",
        formula: "EBIT / Estimated Debt Service Interest",
        desc: "Verifies whether property rent operating profits easily cover standard recurring interest and debt payments.",
        highTells: "Massive buffer room to service bank interest, eliminating mortgage covenant breach concerns.",
        lowTells: "Highly vulnerable to rising rates; almost all rent streams consumed directly by bank payments.",
        baseFields: [
          { fieldId: "ebit", label: "EBIT (Operating Profit)", category: "incomeStatement" },
          { fieldId: "shortTermDebt", label: "Short-Term Debt (Proxy basis)", category: "balanceSheet" }
        ]
      }
    ];
  }

  // Fallback Plantation / General
  return [
    {
      id: "gp_margin",
      label: "Gross Margin",
      fullName: "Gross Profit Margin Integrity",
      formula: "Gross Profit / Revenue",
      desc: "Measures yield output before capital overhead, crucial for commodity harvesters.",
      highTells: "Excellent market pricing leverage, favorable raw material demand, or highly productive harvesting.",
      lowTells: "Severe fertilizer/raw material inflation, weather/pest output degradation, or stagnant crop pricing.",
      baseFields: [
        { fieldId: "revenue", label: "Annual Revenue", category: "incomeStatement" },
        { fieldId: "grossProfit", label: "Gross Profit", category: "incomeStatement" }
      ]
    },
    {
      id: "de_ratio",
      label: "Debt to Equity",
      fullName: "Debt-to-Equity Balance",
      formula: "Total Debt / Total Shareholder Equity",
      desc: "Tracks the balance sheet leverage ratio of owner capital contribution against creditor security structures.",
      highTells: "Heavy structural gearing, exposing operations to critical cash flow demands if commodity prices collapse.",
      lowTells: "Strong equity cushion, enabling uninterrupted dividend continuity and maximum reserve durability.",
      baseFields: [
        { fieldId: "totalEquity", label: "Total Shareholders Equity", category: "balanceSheet" },
        { fieldId: "shortTermDebt", label: "Short-Term Debt", category: "balanceSheet" },
        { fieldId: "longTermDebt", label: "Long-Term Debt", category: "balanceSheet" }
      ]
    },
    {
      id: "fcf_yield",
      label: "FCF Yield",
      fullName: "Free Cash Flow Yield on Equity",
      formula: "Free Cash Flow / Total Equity",
      desc: "Computes owner cash returns relative to current balance book values, verifying actual cash conversion metrics.",
      highTells: "Highly lucrative organic cash machine, spinning off liquid cash directly into developer dividends.",
      lowTells: "Extreme capital intensity where fields, crops, or factories require heavy constant maintenance capital.",
      baseFields: [
        { fieldId: "freeCashFlow", label: "Free Cash Flow (FCF)", category: "cashFlow" },
        { fieldId: "totalEquity", label: "Total Shareholders Equity", category: "balanceSheet" }
      ]
    }
  ];
}

export function TempView({ 
  reports, 
  sector, 
  year, 
  setView, 
  setSelectedReport, 
  archive, 
  loadReports 
}: FinCoreViewProps) {
  const [activeReportIndex, setActiveReportIndex] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<"core8" | "sector">("core8");
  const [activeMetricId, setActiveMetricId] = useState<string>("roic");
  const [isAiExtracting, setIsAiExtracting] = useState<boolean>(false);
  const [editingValues, setEditingValues] = useState<Record<string, string>>({});
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "success" | "error">("idle");

  // FinCore Introduction View Mode State
  const [showIntro, setShowIntro] = useState<boolean>(true);
  const [activeIntroTab, setActiveIntroTab] = useState<"core8" | "sector" | "ai">("core8");

  // Interactive Sim States
  // 1. Ratio Calibration slider simulators
  const [simRevenue, setSimRevenue] = useState<number>(320); // In Millions
  const [simEbit, setSimEbit] = useState<number>(55); // In Millions
  const [simFcf, setSimFcf] = useState<number>(42); // In Millions

  // 2. Sector selection previewer
  const [selectedSecPreview, setSelectedSecPreview] = useState<string>("TECHNOLOGY");

  // 3. AI document OCR parser console logs simulator
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [isSimulatingParser, setIsSimulatingParser] = useState<boolean>(false);
  const [parserProgress, setParserProgress] = useState<number>(0);

  const handleSimulateAiParser = () => {
    if (isSimulatingParser) return;
    setIsSimulatingParser(true);
    setParserProgress(0);
    setTerminalLogs([]);

    const logStatements = [
      "⚡ Initializing FinCore™ AI OCR Document Parser v3.4...",
      "🔍 Deep scanning financial statement PDF table layout coordinates...",
      "📂 Found 3 major pages: balanceSheet, incomeStatement, cashFlow",
      "🎯 Extracting high-confidence double-entry figures...",
      "🔑 Extracted KEY FIELD: 'Revenue' -> MYR 241.5M (99.4% confidence)",
      "🔑 Extracted KEY FIELD: 'EBIT / Operating' -> MYR 42.8M (98.0% confidence)",
      "🔑 Extracted KEY FIELD: 'Free Cash Flow' -> MYR 29.1M (97.1% confidence)",
      "📈 Cross-matching audit trail mathematical formulas...",
      "✅ All 12 required core ledger aspects verified & compiled in buffer!",
      "🎉 Simulation complete! Live peer matrix dataset synthesized and loaded."
    ];

    let step = 0;
    const logInterval = setInterval(() => {
      if (step < logStatements.length) {
        setTerminalLogs(prev => [...prev, logStatements[step]]);
        setParserProgress(Math.floor(((step + 1) / logStatements.length) * 100));
        step++;
      } else {
        clearInterval(logInterval);
        setIsSimulatingParser(false);
      }
    }, 400);
  };

  // Determine all sectors that have data in the database
  const availableSectors = Array.from(new Set([
    "TECHNOLOGY",
    "PLANTATION",
    "HEALTHCARE",
    "REITS",
    "CONSTRUCTION",
    "FINANCIAL_SERVICES",
    ...archive.flatMap(a => a.sectors.map(s => s.toUpperCase()))
  ]));

  const selectedReport = reports[activeReportIndex] || reports[0];

  // Initialize/Update editing values when report changes
  useEffect(() => {
    if (selectedReport) {
      setEditingValues({});
      setSaveStatus("idle");
    }
  }, [selectedReport]);

  // Sync active metric when sector/cohort changes
  useEffect(() => {
    if (activeTab === "sector") {
      const sectorList = getSectorMeta(sector);
      if (sectorList.length > 0 && !sectorList.some(m => m.id === activeMetricId)) {
        setActiveMetricId(sectorList[0].id);
      }
    }
  }, [sector, activeTab]);

  if (showIntro) {
    // Dynamic scoring value for Sandbox Slider Sim
    const simEbitMargin = simRevenue > 0 ? (simEbit / simRevenue) * 100 : 0;
    const simFcfMargin = simRevenue > 0 ? (simFcf / simRevenue) * 100 : 0;
    
    // Quality rating algorithm for simulator
    let simQualityScore = Math.floor(50 + (simEbitMargin * 1.5) + (simFcfMargin * 2.0));
    simQualityScore = Math.max(10, Math.min(100, simQualityScore));
    let simRatingLabel = "Stressed Capital ⚠️";
    let simRatingColor = "text-rose-600 bg-rose-50 border-rose-200";
    if (simQualityScore >= 40 && simQualityScore < 75) {
      simRatingLabel = "Healthy Growth 🟢";
      simRatingColor = "text-amber-600 bg-amber-50 border-amber-200";
    } else if (simQualityScore >= 75) {
      simRatingLabel = "Sovereign Tier! 👑";
      simRatingColor = "text-emerald-700 bg-emerald-50 border-emerald-250";
    }

    return (
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -15 }}
        className="max-w-6xl mx-auto space-y-10 pb-16 font-sans text-slate-800"
      >
        {/* Immersive Top Hero */}
        <div className="text-center relative py-8 space-y-4">
          <div className="absolute inset-0 flex justify-center items-center pointer-events-none opacity-[0.03]">
            <div className="w-[500px] h-[500px] border border-teal-800 animate-spin bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-teal-200 via-transparent to-transparent" style={{ animationDuration: "60s" }} />
          </div>

          {/* Big Majestic Animated FinCore Logo */}
          <div className="relative w-48 h-48 mx-auto flex items-center justify-center">
            {/* Spinning orbit outer circle */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 rounded-full border border-dashed border-teal-500/20"
            />
            {/* Spinning orbit inner circle */}
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
              className="absolute w-40 h-40 rounded-full border-2 border-dotted border-teal-550/15"
            />
            {/* Soft backdrop radial pulse */}
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute w-32 h-32 rounded-full bg-teal-50/50 border border-teal-200/40 flex items-center justify-center shadow-lg"
            />
            
            {/* Solid glowing center shield */}
            <motion.div
              whileHover={{ scale: 1.1, rotate: 5 }}
              animate={{ y: [0, -6, 0] }}
              transition={{ y: { duration: 5, repeat: Infinity, ease: "easeInOut" } }}
              className="relative z-10 w-20 h-20 rounded-2xl bg-teal-800 text-white flex flex-col items-center justify-center shadow-lg border border-teal-700 cursor-pointer"
            >
              <Brain className="w-10 h-10 text-teal-100 mb-0.5 animate-pulse" />
              <span className="text-[7px] font-black tracking-widest text-[#2185d0]">FINCORE</span>
            </motion.div>
          </div>

          <div className="space-y-2 max-w-2xl mx-auto">
            <span className="inline-flex items-center gap-1 bg-teal-100/60 text-teal-905 text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-widest border border-teal-200/50">
              <Sparkles className="w-3.5 h-3.5 text-teal-850 fill-teal-850" />
              Sovereign Quantitative Hub
            </span>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight sm:text-4xl">
              Meet <span className="bg-gradient-to-r from-teal-800 to-emerald-700 bg-clip-text text-transparent">FinCore™ Engine</span>
            </h1>
            <p className="text-xs text-slate-500 max-w-lg mx-auto leading-relaxed">
              Standard corporate spreadsheets fail by applying fragile generic multiples. FinCore processes institutional ledgers through deep aspect calibration and customized sector-sovereign models.
            </p>
          </div>
        </div>

        {/* Feature Bento Select Cards and Sandbox Side-by-Side */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* LEFT: 3 Feature clickables */}
          <div className="lg:col-span-5 flex flex-col justify-between gap-4">
            <div className="space-y-1 text-left">
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">
                Interactive Capability Tour
              </h2>
              <p className="text-[10px] text-slate-400">
                Click a core feature below to activate its live interactive sandbox.
              </p>
            </div>

            <div className="space-y-3 flex-1 flex flex-col h-full justify-center">
              {/* Feature 1 */}
              <button
                onClick={() => setActiveIntroTab("core8")}
                className={cn(
                  "p-4 rounded-2xl border text-left transition-all cursor-pointer flex gap-4 w-full h-full justify-start items-start",
                  activeIntroTab === "core8"
                    ? "bg-white border-teal-800 shadow-sm"
                    : "bg-white/40 border-slate-200 hover:bg-white/80"
                )}
              >
                <div className={cn(
                  "p-2 rounded-lg shrink-0",
                  activeIntroTab === "core8" ? "bg-teal-800 text-white" : "bg-slate-100 text-slate-500"
                )}>
                  <Layers className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wide">
                    1. Core 8 Ratio Calibration
                  </h3>
                  <p className="text-[11px] text-slate-500 leading-relaxed pr-2">
                    Universal index of capital return efficiency, unencumbered cash-cow margin (FCF), asset yield and Altman Z solvency safety.
                  </p>
                </div>
              </button>

              {/* Feature 2 */}
              <button
                onClick={() => setActiveIntroTab("sector")}
                className={cn(
                  "p-4 rounded-2xl border text-left transition-all cursor-pointer flex gap-4 w-full h-full justify-start items-start",
                  activeIntroTab === "sector"
                    ? "bg-white border-teal-800 shadow-sm"
                    : "bg-white/40 border-slate-200 hover:bg-white/80"
                )}
              >
                <div className={cn(
                  "p-2 rounded-lg shrink-0",
                  activeIntroTab === "sector" ? "bg-teal-800 text-white" : "bg-slate-100 text-slate-500"
                )}>
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wide">
                    2. Sector-Sovereign Matrices
                  </h3>
                  <p className="text-[11px] text-slate-500 leading-relaxed pr-2">
                    Custom-calibrated metrics targeting specific Malaysian market sectors (SaaS growth ratios, REIT asset LTV yields, Banking adequacy).
                  </p>
                </div>
              </button>

              {/* Feature 3 */}
              <button
                onClick={() => setActiveIntroTab("ai")}
                className={cn(
                  "p-4 rounded-2xl border text-left transition-all cursor-pointer flex gap-4 w-full h-full justify-start items-start",
                  activeIntroTab === "ai"
                    ? "bg-white border-teal-800 shadow-sm"
                    : "bg-white/40 border-slate-200 hover:bg-white/80"
                )}
              >
                <div className={cn(
                  "p-2 rounded-lg shrink-0",
                  activeIntroTab === "ai" ? "bg-teal-800 text-white" : "bg-slate-100 text-slate-500"
                )}>
                  <Cpu className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wide">
                    3. AI OCR Ledger Extractor
                  </h3>
                  <p className="text-[11px] text-slate-500 leading-relaxed pr-2">
                    Automated corporate filing PDF extraction, verifying dual ledger entries, crawling missing values and filling quality estimates dynamically.
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* RIGHT: Live Sandbox Block */}
          <div className="lg:col-span-7 bg-slate-900 text-white rounded-3xl p-6 shadow-xl border border-slate-800 flex flex-col justify-between min-h-[460px]">
            <div className="flex justify-between items-center pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-pulse" />
                <span className="text-[10px] font-black tracking-widest text-teal-400 uppercase font-mono">
                  Active Sandbox Simulation
                </span>
              </div>
              <span className="text-[8px] opacity-45 font-mono tracking-widest">SANDBOX V2.0</span>
            </div>

            {/* TAB CONTENT: CORE 8 SLIDER */}
            {activeIntroTab === "core8" && (
              <div className="space-y-6 my-auto pt-4">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-4">
                  <h4 className="text-xs font-extrabold uppercase text-teal-400 tracking-wide flex items-center gap-1.5 text-left">
                    <Sliders className="w-4 h-4 text-left" />
                    Interactive Ratio Sculptor (Core 8 Demo)
                  </h4>
                  <p className="text-[11px] text-slate-300 leading-relaxed text-left">
                    Slide operating values below to see how our Core 8 algorithms dynamically synthesize investment grades.
                  </p>

                  <div className="space-y-3 pt-2">
                    {/* Slider 1 */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                        <span>Revenue (Gross Sales)</span>
                        <span className="font-mono text-teal-400">MYR {simRevenue}M</span>
                      </div>
                      <input
                        type="range"
                        min="50"
                        max="500"
                        value={simRevenue}
                        onChange={(e) => setSimRevenue(Number(e.target.value))}
                        className="w-full accent-teal-500 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>

                    {/* Slider 2 */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                        <span>Operating Income (EBIT)</span>
                        <span className="font-mono text-teal-400">MYR {simEbit}M</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="120"
                        value={simEbit}
                        onChange={(e) => setSimEbit(Number(e.target.value))}
                        className="w-full accent-teal-500 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>

                    {/* Slider 3 */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                        <span>Free Cash Flow (FCF)</span>
                        <span className="font-mono text-teal-400">MYR {simFcf}M</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="120"
                        value={simFcf}
                        onChange={(e) => setSimFcf(Number(e.target.value))}
                        className="w-full accent-teal-505 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {/* Synthesis Output Block */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="bg-white/5 border border-white/5 rounded-xl p-3 text-center">
                    <span className="text-[8px] text-slate-400 uppercase font-black tracking-wide">Operating EBIT margin</span>
                    <span className="block text-sm font-black font-mono mt-1 text-teal-400">{simEbitMargin.toFixed(1)}%</span>
                  </div>
                  <div className="bg-white/5 border border-white/5 rounded-xl p-3 text-center">
                    <span className="text-[8px] text-slate-400 uppercase font-black tracking-wide">unencumbered cash Margin</span>
                    <span className="block text-sm font-black font-mono mt-1 text-teal-405">{simFcfMargin.toFixed(1)}%</span>
                  </div>
                  <div className="bg-white/5 border border-white/5 rounded-xl p-3 text-center col-span-2 sm:col-span-1 border-white/10">
                    <span className="text-[8px] text-slate-400 uppercase font-black tracking-wide">FinCore Score Grade</span>
                    <span className="block text-xs font-black mt-1 uppercase tracking-wider">{simQualityScore}/100</span>
                  </div>
                </div>

                <div className={cn("p-2.5 rounded-xl border text-center text-xs font-extrabold uppercase tracking-widest", simRatingColor)}>
                  {simRatingLabel}
                </div>
              </div>
            )}

            {/* TAB CONTENT: SECTOR KPI */}
            {activeIntroTab === "sector" && (
              <div className="space-y-5 my-auto pt-4">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4.5 space-y-3.5 text-left">
                  <h4 className="text-xs font-extrabold uppercase text-teal-405 tracking-wide">
                    Malaysia Sector Cohort Matrices
                  </h4>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Corporate models are loaded dynamically depending on industries. Standard models miss sector-unique strategic levers. Select a sector below to preview live custom index filters:
                  </p>

                  <div className="flex flex-wrap gap-1.5 pt-1.5">
                    {["TECHNOLOGY", "REITS", "FINANCIAL_SERVICES", "CONSTRUCTION", "PLANTATION"].map(secName => (
                      <button
                        key={secName}
                        onClick={() => setSelectedSecPreview(secName)}
                        className={cn(
                          "px-2.5 py-1.5 rounded-lg text-[9px] font-black transition-all cursor-pointer border uppercase tracking-wider",
                          selectedSecPreview === secName
                            ? "bg-teal-400 text-slate-950 border-teal-300 font-extrabold"
                            : "bg-white/5 text-slate-400 border-white/10 hover:bg-white/10"
                        )}
                      >
                        {secName.replace(/_/g, " ")}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sub-aspect list preview */}
                <div className="bg-black/25 rounded-2xl p-4.5 border border-white/5 space-y-3 text-left">
                  <span className="text-[9px] font-extrabold text-[#94a3b8] uppercase tracking-widest block border-b border-white/10 pb-1.5">
                    Calibrated Metrics loaded for {selectedSecPreview.replace(/_/g, " ")}
                  </span>

                  <div className="space-y-2.5 text-xs">
                    {getSectorMeta(selectedSecPreview).map((kpi, idx) => (
                      <div key={kpi.id} className="flex justify-between items-start gap-4">
                        <div className="max-w-[70%] text-left">
                          <span className="text-[10px] text-teal-400 font-extrabold uppercase block">{kpi.label}</span>
                          <span className="text-[10px] text-slate-450">{kpi.fullName}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[9px] font-mono text-slate-400 bg-white/5 px-2 py-0.5 rounded border border-white/10 inline-block">
                            {kpi.formula}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: AI PARSER */}
            {activeIntroTab === "ai" && (
              <div className="space-y-4 my-auto pt-4">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3 text-left">
                  <h4 className="text-xs font-extrabold uppercase text-teal-405 tracking-wide flex items-center gap-1.5">
                    <Terminal className="w-4 h-4" />
                    AI Vector Parsing Dry-Run
                  </h4>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Our AI backend scans Malaysian filing tables, extracts cash holdings & debts instantly, and outputs complete quantitative state matrices. Press simulated dry-run below:
                  </p>

                  <button
                    onClick={handleSimulateAiParser}
                    disabled={isSimulatingParser}
                    className="w-full py-2 bg-teal-400 hover:bg-teal-350 disabled:opacity-50 text-slate-950 font-black text-[10px] uppercase tracking-widest rounded-xl transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isSimulatingParser ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>OCR Parsing Scanner Active ({parserProgress}%)</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-slate-950 fill-white" />
                        <span>Run simulated ledger extraction</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Simulated Terminal Console */}
                <div className="bg-black border border-white/10 rounded-2xl p-4.5 font-mono text-[10px] text-[#4ade80] space-y-1.5 h-44 overflow-y-auto shadow-inner text-left">
                  {terminalLogs.length === 0 ? (
                    <div className="text-slate-500 italic h-full flex flex-col justify-center items-center text-center py-6">
                      <Terminal className="w-6 h-6 mb-1.5 opacity-40 text-slate-500" />
                      <span>Console idle. Click "Run simulated ledger extraction" above to initialize sandbox scanner.</span>
                    </div>
                  ) : (
                    <>
                      {terminalLogs.map((log, i) => (
                        <div key={i} className="leading-relaxed border-b border-emerald-950/10 pb-1 text-left">
                          {log}
                        </div>
                      ))}
                      {isSimulatingParser && (
                        <div className="animate-pulse inline-block w-20 h-3.5 bg-emerald-500/70 rounded mt-1" />
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Sandbox CTA Footer details */}
            <div className="pt-3 border-t border-white/10 mt-4 flex justify-between text-slate-500 text-[10px]">
              <span>Real-time calibration</span>
              <span>v2.0 (Stable release)</span>
            </div>
          </div>
        </div>

        {/* HIGH-IMPACT MAIN CTAs */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-lg text-left">
            <h3 className="text-sm font-bold text-slate-800">Ready to query genuine Malaysian financial datasets?</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              If reports are already ingested, launch the index matrix directly. You can also seed database cohorts below instantly.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 shrink-0 w-full md:w-auto">
            {reports.length > 0 ? (
              <button
                onClick={() => setShowIntro(false)}
                className="px-6 py-3 bg-teal-850 hover:bg-teal-900 text-white font-extrabold text-[#2dd4bf] text-xs uppercase tracking-widest rounded-xl transition shadow-md shadow-teal-950/15 cursor-pointer inline-flex items-center justify-center gap-2 animate-pulse"
              >
                <span>Launch quantitative matrix</span>
                <ArrowRight className="w-4 h-4 text-white" />
              </button>
            ) : (
              <button
                onClick={() => {
                  setView("upload");
                }}
                className="px-6 py-3 bg-teal-850 hover:bg-teal-900 text-white font-extrabold text-xs uppercase tracking-widest rounded-xl transition shadow-md shadow-teal-950/15 cursor-pointer inline-flex items-center justify-center gap-2"
              >
                <span>Ingest new report database</span>
                <Upload className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={() => {
                setShowIntro(false);
              }}
              className="px-5 py-3 border border-slate-200 text-slate-600 font-extrabold text-xs uppercase tracking-widest rounded-xl transition hover:bg-slate-50 cursor-pointer inline-flex items-center justify-center"
            >
              Skip to matrix
            </button>
          </div>
        </div>

        {/* Dynamic Sector Ingest Grid directly in introduction page! */}
        <div className="space-y-4">
          <div className="text-center">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
              Direct Cohort Launcher
            </span>
            <p className="text-[11px] text-slate-550 mt-1 max-w-md mx-auto">
              Select any of the stored financial sectors below to query and launch the peer analyzer dynamically!
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {availableSectors.map((secName) => {
              const hasData = archive.some(a => a.sectors.map(s => s.toUpperCase()).includes(secName.toUpperCase()));
              return (
                <button
                  key={secName}
                  onClick={async () => {
                    await loadReports(year, secName, "fincore");
                    setShowIntro(false); // seamless launch!
                  }}
                  className={cn(
                    "p-3 rounded-xl border text-xs font-black transition-all text-center flex flex-col justify-center items-center gap-1.5 cursor-pointer",
                    hasData
                      ? "bg-teal-50/50 border-teal-200 hover:bg-teal-50 text-teal-950 shadow-3xs"
                      : "bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100"
                  )}
                >
                  <span className="truncate max-w-full font-black text-[10px] tracking-wide">
                    {secName.replace(/_/g, " ")}
                  </span>
                  <span className="text-[8px] font-bold uppercase tracking-wider opacity-85">
                    {hasData ? "🟢 Stored Data" : "Empty"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </motion.div>
    );
  }

  if (reports.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="max-w-4xl mx-auto text-center py-20 font-sans"
      >
        <div className="w-16 h-16 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto mb-4">
          <ShieldCheck className="w-8 h-8 text-teal-800" />
        </div>
        <h2 className="text-base font-bold text-slate-800">No Corporate Dataset Loaded</h2>
        <p className="text-xs text-slate-400 mt-2 max-w-sm mx-auto leading-relaxed">
          Please upload corporate reports under the <strong className="text-teal-850">INGEST</strong> tab, select dynamic databases in the archives, or toggle sectors below to initialize the FinCore Brain.
        </p>

        {/* Back to Introduction button in empty-state */}
        <div className="mt-5 mb-8">
          <button
            onClick={() => setShowIntro(true)}
            className="px-5 py-2 hover:bg-slate-100 bg-slate-50 border border-slate-200 text-slate-650 font-extrabold text-[10px] uppercase tracking-widest rounded-xl transition inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Brain className="w-4 h-4 text-teal-805 animate-pulse" />
            <span>View FinCore Introduction</span>
          </button>
        </div>

        {/* Instant Sector Select grid to fetch data */}
        <div className="mt-8 max-w-lg mx-auto border-t border-slate-150 pt-6">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Load Existing DB Sectors Directly</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {availableSectors.map((secName) => {
              const hasData = archive.some(a => a.sectors.includes(secName));
              return (
                <button
                  key={secName}
                  onClick={() => loadReports(year, secName, "fincore")}
                  className={cn(
                    "p-2.5 rounded-lg border text-xs font-bold transition-all text-center flex flex-col justify-center items-center gap-1 cursor-pointer",
                    hasData 
                      ? "bg-teal-50/50 border-teal-200 hover:bg-teal-50 text-teal-900" 
                      : "bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100"
                  )}
                >
                  <span className="truncate max-w-full font-extrabold">{secName.replace(/_/g, " ")}</span>
                  <span className="text-[8px] font-medium opacity-80 uppercase tracking-wider">
                    {hasData ? "🟢 Stored Data" : "Empty"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </motion.div>
    );
  }

  const scoring = calculateScoring(selectedReport, sector);
  const core8 = calculateCore8Metrics(selectedReport);
  const sectorMetrics = calculateSectorMetrics(selectedReport, sector);

  // Core 8 Aspect Definitions with target fields & high vs low guidance
  const core8Meta: CoreMetricDefinition[] = [
    {
      id: "roic",
      label: "ROIC",
      fullName: "Return on Invested Capital",
      formula: "NOPAT / Invested Capital",
      desc: "Analyzes profit generation efficiency per dollar of debt and equity invested.",
      highTells: "Elite competitive moat, outstanding pricing power, and peer-to-peer operational leadership.",
      lowTells: "Stressed capital allocation, negative value compounding, or excessive non-producing asset bases.",
      baseFields: [
        { fieldId: "revenue", label: "Annual Revenue", category: "incomeStatement" },
        { fieldId: "ebit", label: "EBIT (Operating Income)", category: "incomeStatement" },
        { fieldId: "taxExpense", label: "Tax Expense", category: "incomeStatement" },
        { fieldId: "profitBeforeTax", label: "Profit Before Tax", category: "incomeStatement" },
        { fieldId: "shortTermDebt", label: "Short-Term Debt", category: "balanceSheet" },
        { fieldId: "longTermDebt", label: "Long-Term Debt", category: "balanceSheet" },
        { fieldId: "totalEquity", label: "Total Equity", category: "balanceSheet" },
        { fieldId: "cashAndEquivalents", label: "Cash & Cash Equivalents", category: "balanceSheet" }
      ]
    },
    {
      id: "fcfMargin",
      label: "FCF Margin",
      fullName: "Free Cash Flow Margin",
      formula: "Free Cash Flow / Total Revenue",
      desc: "Measures what percentage of gross sales registers directly as unencumbered cash.",
      highTells: "Elite cash-cow status with massive liquid room to fund dividends, buybacks, or debt paydown.",
      lowTells: "Extremely asset-intensive profiles with heavy physical CapEx needs that drain free cash reserves.",
      baseFields: [
        { fieldId: "revenue", label: "Annual Revenue", category: "incomeStatement" },
        { fieldId: "operatingCashFlow", label: "Operating Cash Flow", category: "cashFlow" },
        { fieldId: "capitalExpenditure", label: "Capital Expenditure (CapEx)", category: "cashFlow" },
        { fieldId: "freeCashFlow", label: "Free Cash Flow (FCF)", category: "cashFlow" }
      ]
    },
    {
      id: "operatingLeverage",
      label: "EBIT Margin",
      fullName: "Operating Leverage (EBIT Margin)",
      formula: "Operating Profit / Revenue",
      desc: "Represents profitability buffer remaining after physical cost of sales and operational expenses.",
      highTells: "Strong operational scaling curves where sales expansions trigger rapid profitability multiplier gains.",
      lowTells: "Bloated structural overhead and weak pricing power that makes earnings brittle during brief sales drops.",
      baseFields: [
        { fieldId: "revenue", label: "Annual Revenue", category: "incomeStatement" },
        { fieldId: "ebit", label: "EBIT (Operating Income)", category: "incomeStatement" }
      ]
    },
    {
      id: "netDebtToEbitda",
      label: "Debt Multiple",
      fullName: "Net Debt to EBITDA",
      formula: "(Total Debt - Cash Group) / EBITDA",
      desc: "Calculates total years of operational performance required to satisfy loaded financial liabilities.",
      highTells: "Heavy structural leverage overhang, rising interest burdens, and potential credit solvency caution.",
      lowTells: "Secure cash buffers, solid credit buffer reserves, and maximum space to safely take on projects.",
      baseFields: [
        { fieldId: "shortTermDebt", label: "Short-Term Debt", category: "balanceSheet" },
        { fieldId: "longTermDebt", label: "Long-Term Debt", category: "balanceSheet" },
        { fieldId: "cashAndEquivalents", label: "Cash & Cash Equivalents", category: "balanceSheet" },
        { fieldId: "ebit", label: "EBIT (Operating Profit)", category: "incomeStatement" },
        { fieldId: "depreciation", label: "Depreciation Amount", category: "incomeStatement" }
      ]
    },
    {
      id: "cashConversionCycle",
      label: "CCC Days",
      fullName: "Cash Conversion Cycle (CCC)",
      formula: "DIO + DSO - DPO",
      desc: "Estimates how many days cash remains locked inside core inventories before rolling back into cash.",
      highTells: "Bloated logistics structures, weak sales turns, and delayed customer collections locking up capital.",
      lowTells: "Fierce customer dominance, negative working capital requirements, and rapid inventory turnover.",
      baseFields: [
        { fieldId: "revenue", label: "Annual Revenue", category: "incomeStatement" },
        { fieldId: "costOfGoodsSold", label: "Cost of Goods Sold (COGS)", category: "incomeStatement" },
        { fieldId: "accountsReceivable", label: "Accounts Receivable", category: "balanceSheet" },
        { fieldId: "inventory", label: "Closing Inventories", category: "balanceSheet" },
        { fieldId: "accountsPayable", label: "Accounts Payable", category: "balanceSheet" }
      ]
    },
    {
      id: "assetProductivity",
      label: "Asset Yield",
      fullName: "Asset Productivity Ratio",
      formula: "Gross Profit / Total Balance Assets",
      desc: "Tests standard physical production capability showing return efficiency generated by total assets.",
      highTells: "Asset-light high capability execution generating stellar structural margins on dynamic base structures.",
      lowTells: "Asset-heavy physical overheads, idle manufacturing lines, or inefficient hardware deployments.",
      baseFields: [
        { fieldId: "revenue", label: "Annual Revenue", category: "incomeStatement" },
        { fieldId: "costOfGoodsSold", label: "Cost of Goods Sold (COGS)", category: "incomeStatement" },
        { fieldId: "grossProfit", label: "Gross Profit", category: "incomeStatement" },
        { fieldId: "totalAssets", label: "Total Assets", category: "balanceSheet" }
      ]
    },
    {
      id: "capexToDepreciation",
      label: "CapEx Ratio",
      fullName: "CapEx / Depreciation Multiple",
      formula: "Capital Expenditure / Annual Depreciation",
      desc: "Reveals whether physical assets are being consistently expanded or gradually run down.",
      highTells: "Vigorous project expansion plans and intense capital investments supporting future operations.",
      lowTells: "Under-investment risk where current CapEx is slower than standard physical asset degradation.",
      baseFields: [
        { fieldId: "capitalExpenditure", label: "Capital Expenditure (CapEx)", category: "cashFlow" },
        { fieldId: "depreciation", label: "Annual Depreciation", category: "incomeStatement" }
      ]
    },
    {
      id: "altmanZScore",
      label: "Altman Z",
      fullName: "Altman Z-Score Solvency",
      formula: "Weighted Multi-factor solvency model",
      desc: "A highly trusted stress index used to identify solvency buffers and risks of distress.",
      highTells: "Extremely strong cash reserves and working capital indicators placing the company in safe regions.",
      lowTells: "Stressed liquidity, falling retained earnings, and severe warning coordinates warranting attention.",
      baseFields: [
        { fieldId: "revenue", label: "Annual Revenue", category: "incomeStatement" },
        { fieldId: "ebit", label: "EBIT", category: "incomeStatement" },
        { fieldId: "totalAssets", label: "Total Assets", category: "balanceSheet" },
        { fieldId: "totalLiabilities", label: "Total Liabilities", category: "balanceSheet" },
        { fieldId: "currentAssets", label: "Current Assets", category: "balanceSheet" },
        { fieldId: "currentLiabilities", label: "Current Liabilities", category: "balanceSheet" },
        { fieldId: "totalEquity", label: "Total Equity", category: "balanceSheet" }
      ]
    }
  ];

  const sectorMeta = getSectorMeta(sector);

  // Combine both pools to resolve dynamic explainer targets smoothly
  const allAspects = [...core8Meta, ...sectorMeta];
  const currentMetricData = allAspects.find(m => m.id === activeMetricId) || core8Meta[0];

  // Retrieve value helper
  const getFieldValue = (fieldMeta: BaseFieldMeta): number => {
    const category = selectedReport.Financials[fieldMeta.category as keyof Financials];
    if (!category) return 0;
    return safeNum((category as any)[fieldMeta.fieldId]);
  };

  // Check if active metric has missing or 0 values
  const missingFields = currentMetricData.baseFields.filter(f => {
    return getFieldValue(f) === 0;
  });

  const getMetricDisplayValue = (metricId: string) => {
    switch (metricId) {
      case "roic": return `${core8.roic.toFixed(1)}%`;
      case "fcfMargin": return `${core8.fcfMargin.toFixed(1)}%`;
      case "operatingLeverage": return `${core8.operatingLeverage.toFixed(1)}%`;
      case "netDebtToEbitda": return `${core8.netDebtToEbitda.toFixed(2)}x`;
      case "cashConversionCycle": return `${core8.cashConversionCycle} Days`;
      case "assetProductivity": return `${core8.assetProductivity.toFixed(1)}%`;
      case "capexToDepreciation": return `${core8.capexToDepreciation.toFixed(2)}x`;
      case "altmanZScore": return `${core8.altmanZScore.toFixed(2)}`;
      default: {
        const matchedSec = sectorMetrics.find(sm => sm.id === metricId);
        return matchedSec ? matchedSec.value : "-";
      }
    }
  };

  // Sector Switching trigger
  const handleSectorToggle = async (newSector: string) => {
    await loadReports(year, newSector, "fincore");
  };

  const handleTabToggle = (tab: "core8" | "sector") => {
    setActiveTab(tab);
    if (tab === "core8") {
      setActiveMetricId("roic");
    } else {
      const list = getSectorMeta(sector);
      if (list.length > 0) {
        setActiveMetricId(list[0].id);
      }
    }
  };

  // Submit revised value to server and save
  const handleValueUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveStatus("saving");

    // Deep clone the report state
    const updatedReport = JSON.parse(JSON.stringify(selectedReport)) as CompanyReport;
    
    // Merge edited values
    currentMetricData.baseFields.forEach(f => {
      const inputVal = editingValues[f.fieldId];
      if (inputVal !== undefined && inputVal !== "") {
        if (!updatedReport.Financials[f.category as keyof Financials]) {
          updatedReport.Financials[f.category as keyof Financials] = {} as any;
        }
        (updatedReport.Financials[f.category as keyof Financials] as any)[f.fieldId] = inputVal;
      }
    });

    try {
      const response = await fetch("/api/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reports: [{
            companyName: updatedReport.Metadata.CompanyName,
            financials: updatedReport.Financials,
            storedFileName: updatedReport.Metadata.StoredFileName,
            originalFileName: updatedReport.Metadata.OriginalFileName,
            docType: updatedReport.Metadata.DocType,
          }],
          year: updatedReport.Metadata.FinancialYear,
          sector: updatedReport.Metadata.Sector,
        })
      });

      if (response.ok) {
        setSaveStatus("success");
        // Reload reports globally to notify App context and trigger recalculations
        await loadReports(updatedReport.Metadata.FinancialYear, updatedReport.Metadata.Sector, "fincore");
      } else {
        setSaveStatus("error");
      }
    } catch {
      setSaveStatus("error");
    }
  };

  // AI Automatic batch extractor simulator
  const triggerAiBatchExtraction = () => {
    setIsAiExtracting(true);
    setTimeout(async () => {
      const missingAutofills: Record<string, string> = {};
      currentMetricData.baseFields.forEach(f => {
        if (getFieldValue(f) === 0) {
          let simulatedVal = "15000";
          if (f.fieldId.toLowerCase().includes("revenue")) simulatedVal = "240000";
          else if (f.fieldId.toLowerCase().includes("ebit")) simulatedVal = "38000";
          else if (f.fieldId.toLowerCase().includes("tax")) simulatedVal = "9120";
          else if (f.fieldId.toLowerCase().includes("assets")) simulatedVal = "410000";
          else if (f.fieldId.toLowerCase().includes("equity")) simulatedVal = "280000";
          else if (f.fieldId.toLowerCase().includes("cash")) simulatedVal = "45000";
          else if (f.fieldId === "operatingCashFlow") simulatedVal = "35000";
          else if (f.fieldId === "capitalExpenditure") simulatedVal = "12000";
          else if (f.fieldId === "freeCashFlow") simulatedVal = "23000";
          else if (f.fieldId === "costOfGoodsSold") simulatedVal = "160000";
          
          missingAutofills[f.fieldId] = simulatedVal;
        }
      });

      setEditingValues(prev => ({ ...prev, ...missingAutofills }));
      setIsAiExtracting(false);
    }, 1200);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-6 font-sans max-w-7xl mx-auto pb-12"
    >
      {/* Dynamic Sector selection Toggle Row */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-3xs">
        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2.5 px-1">
          Sector Cohorts Registered in Database
        </span>
        <div className="flex flex-wrap gap-2">
          {availableSectors.map((secName) => {
            const isActive = sector.toUpperCase() === secName.toUpperCase();
            const hasDataInDb = archive.some(a => a.sectors.map(s => s.toUpperCase()).includes(secName.toUpperCase()));

            return (
              <button
                key={secName}
                onClick={() => handleSectorToggle(secName)}
                className={cn(
                  "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer relative",
                  isActive 
                    ? "bg-teal-800 text-white shadow-xs" 
                    : "bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200"
                )}
              >
                <span>{secName.replace(/_/g, " ")}</span>
                {hasDataInDb && (
                  <span className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    isActive ? "bg-emerald-400" : "bg-emerald-500"
                  )} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Standard Ledger Context */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-200 gap-3">
        <div>
          <div className="flex items-center gap-1.5 mb-1 text-teal-800">
            <ShieldCheck className="w-4 h-4 text-teal-800" />
            <span className="text-[10px] font-extrabold tracking-wider uppercase">FinCore™ Hub</span>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-lg font-black text-slate-800 tracking-tight">
              Peer Quantitative Matrix (FY{year})
            </h1>
            <button
              onClick={() => setShowIntro(true)}
              className="px-2.5 py-1 text-[9px] bg-teal-50 hover:bg-teal-100 border border-teal-200 hover:border-teal-300 text-teal-850 font-black uppercase tracking-widest rounded-lg transition shrink-0 inline-flex items-center gap-1 cursor-pointer"
            >
              <Brain className="w-3 h-3 text-teal-800" />
              <span>Features Intro</span>
            </button>
          </div>
        </div>

        {/* Dynamic Target Picker */}
        <div className="flex items-center gap-1.5 overflow-x-auto bg-slate-50 p-1 rounded-lg border border-slate-200">
          {reports.map((r, i) => (
            <button
              key={i}
              onClick={() => setActiveReportIndex(i)}
              className={cn(
                "px-3.5 py-1.5 rounded text-xs font-black transition-all cursor-pointer whitespace-nowrap",
                activeReportIndex === i 
                  ? "bg-white text-teal-900 border border-teal-800/15 shadow-2xs" 
                  : "text-slate-500 hover:text-slate-800"
              )}
            >
              {r.Metadata.CompanyName}
            </button>
          ))}
        </div>
      </div>

      {/* Main Core Toggle Layout & Dynamic interactive explainers side-by-side */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left Column: Toggled list of Metric Selectors (Core 8 vs Sector Matrix) */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* STYLISH TAB SEGMENTED CONTROL */}
          <div className="bg-slate-100 p-1.5 rounded-xl border border-slate-200 flex gap-2">
            <button
              onClick={() => handleTabToggle("core8")}
              className={cn(
                "flex-1 py-2 text-center text-xs font-extrabold transition-all rounded-lg cursor-pointer flex items-center justify-center gap-1.5",
                activeTab === "core8" 
                  ? "bg-white text-teal-900 shadow-sm border border-slate-200/50" 
                  : "text-slate-500 hover:text-slate-800"
              )}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Universal Core 8</span>
            </button>
            <button
              onClick={() => handleTabToggle("sector")}
              className={cn(
                "flex-1 py-2 text-center text-xs font-extrabold transition-all rounded-lg cursor-pointer flex items-center justify-center gap-1.5",
                activeTab === "sector" 
                  ? "bg-white text-teal-900 shadow-sm border border-slate-200/50" 
                  : "text-slate-500 hover:text-slate-800"
              )}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{sector.replace(/_/g, " ")} Matrix KPIs</span>
            </button>
          </div>

          {/* DYNAMIC LIST */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4.5 shadow-3xs space-y-3.5">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                {activeTab === "core8" ? (
                  <>
                    <Award className="w-4 h-4 text-teal-850" />
                    <span>Sovereign Calculated Aspects (Core 8)</span>
                  </>
                ) : (
                  <>
                    <TrendingUp className="w-4 h-4 text-teal-850" />
                    <span>Sector-Sovereign Performance Matrix</span>
                  </>
                )}
              </h3>
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                Click aspect to analyze
              </span>
            </div>

            {activeTab === "core8" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {core8Meta.map((m) => {
                  const isSelected = activeMetricId === m.id;
                  const valueOfCompany = getMetricDisplayValue(m.id);
                  const hasZeroValues = m.baseFields.some(f => getFieldValue(f) === 0);

                  return (
                    <button
                      key={m.id}
                      onClick={() => setActiveMetricId(m.id)}
                      className={cn(
                        "p-3 rounded-xl border text-left transition-all flex justify-between items-center cursor-pointer relative overflow-hidden",
                        isSelected 
                          ? "bg-teal-50 border-teal-800/60 shadow-3xs" 
                          : "bg-white border-slate-200 hover:bg-slate-50"
                      )}
                    >
                      <div className="max-w-[70%]">
                        <p className="text-[10px] font-extrabold uppercase tracking-wide text-slate-850 truncate">
                          {m.label}
                        </p>
                        <span className="text-[8px] text-slate-400 font-medium font-mono block truncate">{m.fullName}</span>
                      </div>

                      <div className="text-right flex items-center gap-1.5">
                        {hasZeroValues && (
                          <span className="text-[8px] bg-rose-50 text-rose-700 font-extrabold px-1.5 py-0.5 rounded border border-rose-200 tracking-wider uppercase animate-pulse">
                            Needs values
                          </span>
                        )}
                        <span className={cn(
                          "text-xs font-black font-mono",
                          isSelected ? "text-teal-900" : "text-slate-700"
                        )}>
                          {valueOfCompany}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-2.5">
                {sectorMeta.map((m) => {
                  const isSelected = activeMetricId === m.id;
                  const valueOfCompany = getMetricDisplayValue(m.id);
                  const hasZeroValues = m.baseFields.some(f => getFieldValue(f) === 0);
                  
                  // Get evaluation rating if available
                  const ratedMatch = sectorMetrics.find(sm => sm.id === m.id);
                  const rating = ratedMatch ? ratedMatch.rating : undefined;

                  return (
                    <button
                      key={m.id}
                      onClick={() => setActiveMetricId(m.id)}
                      className={cn(
                        "p-3.5 rounded-xl border text-left transition-all flex justify-between items-center cursor-pointer w-full",
                        isSelected 
                          ? "bg-teal-50 border-teal-800/60 shadow-3xs" 
                          : "bg-white border-slate-200 hover:bg-slate-50"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          isSelected ? "bg-teal-800" : "bg-slate-300"
                        )} />
                        <div>
                          <p className="text-[10px] font-extrabold uppercase tracking-wide text-slate-850">
                            {m.fullName}
                          </p>
                          <span className="text-[8px] text-slate-400 font-medium font-mono">{m.desc}</span>
                        </div>
                      </div>

                      <div className="text-right flex items-center gap-2">
                        {hasZeroValues && (
                          <span className="text-[8px] bg-rose-50 text-rose-700 font-extrabold px-1.5 py-0.5 rounded border border-rose-200 tracking-wider uppercase">
                            Missing Value
                          </span>
                        )}
                        
                        {rating && (
                          <span className={cn(
                            "text-[8px] font-extrabold px-1.5 py-0.5 rounded border uppercase",
                            rating === "Strong" && "bg-emerald-50 text-emerald-700 border-emerald-200",
                            rating === "Moderate" && "bg-amber-50 text-amber-700 border-amber-200",
                            rating === "Weak" && "bg-rose-50 text-rose-700 border-rose-200"
                          )}>
                            {rating}
                          </span>
                        )}

                        <span className={cn(
                          "text-xs font-black font-mono px-1.5",
                          isSelected ? "text-teal-900" : "text-slate-700"
                        )}>
                          {valueOfCompany}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Sector Intelligence Box of the other companies */}
          <div className="bg-slate-900 text-white rounded-2xl p-4.5 space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-white/10">
              <span className="text-[9px] font-black text-teal-400 uppercase tracking-wider">
                {sector.replace(/_/g, " ")} Summary Scorecard (FY{year})
              </span>
              <span className="text-[8px] opacity-60 font-mono">Current Cohort</span>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="bg-white/5 border border-white/10 rounded-lg p-2.5">
                <span className="text-[8px] text-slate-400 font-extrabold uppercase block">Company rating</span>
                <span className="text-xs font-black mt-1 block">{scoring.recommendation}</span>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-lg p-2.5">
                <span className="text-[8px] text-slate-400 font-extrabold uppercase block">Quality Score</span>
                <span className="text-xs font-black mt-1 block text-emerald-400">{scoring.companyQualityScore}/100</span>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-lg p-2.5">
                <span className="text-[8px] text-slate-400 font-extrabold uppercase block">Investment score</span>
                <span className="text-xs font-black mt-1 block text-teal-400">{scoring.investmentQualityScore}/100</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Aspect Explainer & Missing Fields entry form */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-3xs space-y-4">
            
            {/* Aspect Heading */}
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-black text-teal-800 bg-teal-50 border border-teal-100 rounded px-2 py-0.5 uppercase tracking-wide">
                  {currentMetricData.label} Perspective
                </span>
                <span className="text-[9px] font-bold text-slate-400 lowercase font-mono">
                  {activeTab === "core8" ? "universal core 8" : "sector matrix metrics"}
                </span>
              </div>
              <h2 className="text-sm font-black text-slate-800 mt-2">{currentMetricData.fullName}</h2>
              <p className="text-[10px] font-mono text-slate-400 mt-0.5">Formula: {currentMetricData.formula}</p>
            </div>

            {/* Simplistic Definition */}
            <p className="text-xs text-slate-600 leading-relaxed bg-white p-3 rounded-xl border border-slate-250/60">
              {currentMetricData.desc}
            </p>

            {/* HIGH VS LOW EXPLAINER - What the value tells the user */}
            <div className="bg-white p-4.5 rounded-xl border border-slate-200 space-y-3.5">
              <span className="text-[9px] font-extrabold tracking-wider uppercase text-slate-400 block border-b border-slate-100 pb-1.5">
                Quantitative Significance Guide
              </span>
              
              <div className="space-y-3 text-xs text-slate-700">
                <div className="flex gap-2">
                  <div className="text-emerald-700 font-extrabold shrink-0 px-2 py-0.5 bg-emerald-50 rounded border border-emerald-100/60 text-[9px] uppercase h-fit mt-0.5">
                    HIGH
                  </div>
                  <p className="leading-relaxed font-sans">{currentMetricData.highTells}</p>
                </div>
                
                <div className="flex gap-2">
                  <div className="text-rose-700 font-extrabold shrink-0 px-2 py-0.5 bg-rose-50 rounded border border-rose-100/60 text-[9px] uppercase h-fit mt-0.5">
                    LOW
                  </div>
                  <p className="leading-relaxed font-sans">{currentMetricData.lowTells}</p>
                </div>
              </div>
            </div>

            {/* MISSING / ZERO VALUE PROMPTS */}
            <div className="border-t border-slate-200 pt-3">
              {missingFields.length > 0 ? (
                <div className="space-y-3 bg-rose-50/70 border border-rose-200 p-4 rounded-xl">
                  <div className="flex items-center gap-1.5 text-rose-800">
                    <AlertTriangle className="w-4 h-4 text-rose-700 shrink-0" />
                    <span className="text-[10px] font-black uppercase tracking-wider">
                      Required Ledger Input Alert
                    </span>
                  </div>
                  
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Some corporate inputs required for this metric are missing or set to 0. Please input the correct values below, or trigger AI extraction to automatically crawl estimated data.
                  </p>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={triggerAiBatchExtraction}
                      disabled={isAiExtracting}
                      className="px-3 py-1.5 bg-slate-900 border border-slate-850 text-white rounded-lg font-bold text-[10px] transition hover:bg-slate-800 inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      {isAiExtracting ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>AI Crawling...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                          <span>AI Auto-Extract</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-emerald-50/50 border border-emerald-250 p-3.5 rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                  <p className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-widest">
                    All Required Inputs Verified & Recalculated
                  </p>
                </div>
              )}

              {/* Standard Interactive form to update any/all required core bases */}
              <form onSubmit={handleValueUpdate} className="mt-4 space-y-3 bg-white border border-slate-200 p-4 rounded-xl">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">
                  Ledger Inputs & Values (MYR '000)
                </span>

                <div className="space-y-2.5 max-h-[180px] overflow-y-auto pr-1">
                  {currentMetricData.baseFields.map((fMeta) => {
                    const originalValue = getFieldValue(fMeta);
                    const isMissing = originalValue === 0;
                    const val = editingValues[fMeta.fieldId] !== undefined 
                      ? editingValues[fMeta.fieldId] 
                      : (originalValue !== 0 ? String(originalValue) : "");

                    return (
                      <div key={fMeta.fieldId} className="flex items-center justify-between gap-2.5">
                        <label className="text-[10px] text-slate-500 font-bold truncate max-w-[200px]" title={fMeta.label}>
                          {fMeta.label} {isMissing && <span className="text-rose-500 font-extrabold">*</span>}
                        </label>
                        <input
                          type="text"
                          value={val || ""}
                          placeholder={isMissing ? "Enter Value" : String(originalValue)}
                          onChange={(e) => setEditingValues(prev => ({ ...prev, [fMeta.fieldId]: e.target.value }))}
                          className={cn(
                            "w-28 px-2 py-1 text-right text-xs font-mono font-bold rounded-md bg-slate-50 border transition-all focus:bg-white focus:outline-teal-800",
                            isMissing ? "border-rose-300 text-rose-800 placeholder-rose-300/60 bg-rose-50/30" : "border-slate-200 text-slate-800"
                          )}
                        />
                      </div>
                    );
                  })}
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <button
                    type="submit"
                    disabled={saveStatus === "saving"}
                    className="px-3.5 py-1.5 bg-teal-800 hover:bg-teal-900 text-white font-extrabold text-[10px] uppercase tracking-wide rounded-lg inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {saveStatus === "saving" ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Recalculating...</span>
                      </>
                    ) : (
                      <>
                        <span>Submit & Recalculate</span>
                        <ArrowRight className="w-3 h-3" />
                      </>
                    )}
                  </button>

                  {saveStatus === "success" && (
                    <span className="text-[9px] text-emerald-700 font-black uppercase tracking-wider animate-pulse">
                      ✓ Recalculated
                    </span>
                  )}
                  {saveStatus === "error" && (
                    <span className="text-[9px] text-rose-700 font-black uppercase tracking-wider">
                      ⚠️ Failed
                    </span>
                  )}
                </div>
              </form>
            </div>

          </div>
        </div>

      </div>

    </motion.div>
  );
}
