import React, { useState, useEffect } from "react";
import { CompanyReport, Financials } from "../types";
import { 
  calculateCore8Metrics, 
  calculateSectorMetrics, 
  calculateScoring 
} from "../fincore_engine";
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
  ArrowRight
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

interface InteractiveGlitchCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
}

export function InteractiveGlitchCard({ children, className, onClick, style }: InteractiveGlitchCardProps) {
  const [coords, setCoords] = useState({ x: 0, y: 0, rx: 0, ry: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    
    const percentX = x / (rect.width / 2);
    const percentY = y / (rect.height / 2);
    
    const targetX = percentX * 10;
    const targetY = percentY * 10;
    
    const rotateX = -percentY * 8;
    const rotateY = percentX * 8;

    setCoords({ x: targetX, y: targetY, rx: rotateX, ry: rotateY });
  };

  const handleMouseLeave = () => {
    setCoords({ x: 0, y: 0, rx: 0, ry: 0 });
  };

  return (
    <div
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={cn(
        "glitch-hover-effect select-none",
        className
      )}
      style={{
        ...style,
        "--x": `${coords.x}px`,
        "--y": `${coords.y}px`,
        "--rx": `${coords.rx}deg`,
        "--ry": `${coords.ry}deg`,
      } as React.CSSProperties}
    >
      {children}
    </div>
  );
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

export function FinCoreView({ 
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

  if (reports.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="max-w-4xl mx-auto text-center py-20 font-sans p-8 lg:p-12"
      >
        <div className="w-16 h-16 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto mb-4">
          <ShieldCheck className="w-8 h-8 text-teal-800" />
        </div>
        <h2 className="text-base font-bold text-slate-800">No Corporate Dataset Loaded</h2>
        <p className="text-xs text-slate-400 mt-2 max-w-sm mx-auto leading-relaxed">
          Please upload corporate reports under the <strong className="text-teal-850">INGEST</strong> tab, select dynamic databases in the archives, or toggle sectors below to initialize the FinCore Brain.
        </p>

        {/* Instant Sector Select grid to fetch data */}
        <div className="mt-8 max-w-lg mx-auto">
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
      formula: "(Net Operating Profit After Tax / Invested Capital)",
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
      className="space-y-6 font-sans max-w-7xl mx-auto pb-12 p-8 lg:p-12"
    >
      {/* Dynamic Sector selection Toggle Row */}
      <div className="bg-white border border-sage-green-750/15 rounded-2xl p-4 shadow-3xs">
        <span className="text-[9px] font-black text-hunter-green-400 uppercase tracking-widest block mb-2.5 px-1">
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
                  "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer relative border",
                  isActive 
                    ? "bg-hunter-green text-white border-hunter-green-600 shadow-xs" 
                    : "bg-vanilla-cream-900 hover:bg-vanilla-cream-800 text-hunter-green-200 border-vanilla-cream-300"
                )}
              >
                <span>{secName.replace(/_/g, " ")}</span>
                {hasDataInDb && (
                  <span className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    isActive ? "bg-yellow-green-600" : "bg-sage-green-500"
                  )} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Standard Ledger Context */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-sage-green-200 gap-3">
        <div>
          <div className="flex items-center gap-1.5 mb-1 text-hunter-green">
            <ShieldCheck className="w-4 h-4 text-hunter-green" />
            <span className="text-[10px] font-extrabold tracking-wider uppercase">FinCore™ Hub</span>
          </div>
          <h1 className="text-lg font-black text-hunter-green-100 tracking-tight">
            Peer Quantitative Matrix (FY{year})
          </h1>
        </div>

        {/* Dynamic Target Picker */}
        <div className="flex items-center gap-1.5 overflow-x-auto bg-vanilla-cream-800 p-1 rounded-lg border border-vanilla-cream-700/60">
          {reports.map((r, i) => (
            <button
              key={i}
              onClick={() => setActiveReportIndex(i)}
              className={cn(
                "px-3.5 py-1.5 rounded text-xs font-black transition-all cursor-pointer whitespace-nowrap",
                activeReportIndex === i 
                  ? "bg-hunter-green text-white shadow-2xs" 
                  : "text-hunter-green-400 hover:text-hunter-green"
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
          <div className="bg-vanilla-cream-700/40 p-1.5 rounded-xl border border-sage-green-700/10 flex gap-2">
            <button
              onClick={() => handleTabToggle("core8")}
              className={cn(
                "flex-1 py-2 text-center text-xs font-extrabold transition-all rounded-lg cursor-pointer flex items-center justify-center gap-1.5",
                activeTab === "core8" 
                  ? "bg-white text-hunter-green border border-sage-green-700/20 shadow-xs" 
                  : "text-hunter-green-400 hover:text-hunter-green"
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
                  ? "bg-white text-hunter-green border border-sage-green-700/20 shadow-xs" 
                  : "text-hunter-green-400 hover:text-hunter-green"
              )}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{sector.replace(/_/g, " ")} Matrix KPIs</span>
            </button>
          </div>

          {/* DYNAMIC LIST */}
          <div className="bg-white border border-sage-green-700/15 rounded-2xl p-4.5 shadow-3xs space-y-3.5">
            <div className="flex justify-between items-center border-b border-vanilla-cream-800 pb-2.5">
              <h3 className="text-xs font-black text-hunter-green-100 uppercase tracking-widest flex items-center gap-1.5">
                {activeTab === "core8" ? (
                  <>
                    <Award className="w-4 h-4 text-hunter-green" />
                    <span>Sovereign Calculated Aspects (Core 8)</span>
                  </>
                ) : (
                  <>
                    <TrendingUp className="w-4 h-4 text-hunter-green" />
                    <span>Sector-Sovereign Performance Matrix</span>
                  </>
                )}
              </h3>
              <span className="text-[9px] text-sage-green-600 font-bold uppercase tracking-wider">
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
                    <InteractiveGlitchCard
                      key={m.id}
                      onClick={() => setActiveMetricId(m.id)}
                      className={cn(
                        "p-3 rounded-xl border text-left flex justify-between items-center cursor-pointer relative overflow-hidden transition-all duration-300",
                        isSelected 
                          ? "bg-hunter-green-900/35 border-hunter-green text-hunter-green-100 shadow-xs" 
                          : "bg-white border-sage-green-800/15 hover:border-sage-green/45 text-slate-800"
                      )}
                    >
                      <div className="max-w-[70%]">
                        <p className="text-[10px] font-extrabold uppercase tracking-wide text-hunter-green-100 truncate">
                          {m.label}
                        </p>
                        <span className="text-[8px] text-hunter-green-400 font-medium font-mono block truncate">{m.fullName}</span>
                      </div>

                      <div className="text-right flex items-center gap-1.5">
                        {hasZeroValues && (
                          <span className="text-[8px] bg-blushed-brick-900 text-blushed-brick font-extrabold px-1.5 py-0.5 rounded border border-blushed-brick-800/40 tracking-wider uppercase animate-pulse">
                            Needs values
                          </span>
                        )}
                        <span className={cn(
                          "text-xs font-black font-mono",
                          isSelected ? "text-hunter-green-100" : "text-slate-700"
                        )}>
                          {valueOfCompany}
                        </span>
                      </div>
                    </InteractiveGlitchCard>
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
                    <InteractiveGlitchCard
                      key={m.id}
                      onClick={() => setActiveMetricId(m.id)}
                      className={cn(
                        "p-3.5 rounded-xl border text-left flex justify-between items-center cursor-pointer w-full transition-all duration-300",
                        isSelected 
                          ? "bg-hunter-green-900/35 border-hunter-green text-hunter-green-100 shadow-xs" 
                          : "bg-white border-sage-green-800/15 hover:border-sage-green/45 text-slate-800"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          isSelected ? "bg-hunter-green" : "bg-sage-green-700/30"
                        )} />
                        <div>
                          <p className="text-[10px] font-extrabold uppercase tracking-wide text-hunter-green-100">
                            {m.fullName}
                          </p>
                          <span className="text-[8px] text-hunter-green-400 font-medium font-mono">{m.desc}</span>
                        </div>
                      </div>

                      <div className="text-right flex items-center gap-2">
                        {hasZeroValues && (
                          <span className="text-[8px] bg-blushed-brick-900 text-blushed-brick font-extrabold px-1.5 py-0.5 rounded border border-blushed-brick-800/40 tracking-wider uppercase">
                            Missing Value
                          </span>
                        )}
                        
                        {rating && (
                          <span className={cn(
                            "text-[8px] font-extrabold px-1.5 py-0.5 rounded border uppercase",
                            rating === "Strong" && "bg-sage-green-950/20 text-hunter-green border-sage-green-600/50",
                            rating === "Moderate" && "bg-vanilla-cream-500/20 text-vanilla-cream-200 border-vanilla-cream-300",
                            rating === "Weak" && "bg-blushed-brick-900 text-blushed-brick border-blushed-brick-800/40"
                          )}>
                            {rating}
                          </span>
                        )}

                        <span className={cn(
                          "text-xs font-black font-mono px-1.5",
                          isSelected ? "text-hunter-green-100" : "text-slate-700"
                        )}>
                          {valueOfCompany}
                        </span>
                      </div>
                    </InteractiveGlitchCard>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Sector Intelligence Box of the other companies */}
          <div className="bg-hunter-green-100 text-white rounded-2xl p-4.5 space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-hunter-green-300">
              <span className="text-[9px] font-black text-sage-green uppercase tracking-wider">
                {sector.replace(/_/g, " ")} Summary Scorecard (FY{year})
              </span>
              <span className="text-[8px] opacity-60 font-mono text-sage-green-900">Current Cohort</span>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="bg-white/5 border border-white/10 rounded-lg p-2.5">
                <span className="text-[8px] text-sage-green-700 font-extrabold uppercase block">Company rating</span>
                <span className="text-xs font-black mt-1 block text-vanilla-cream-500">{scoring.recommendation}</span>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-lg p-2.5">
                <span className="text-[8px] text-sage-green-700 font-extrabold uppercase block">Quality Score</span>
                <span className="text-xs font-black mt-1 block text-yellow-green-600">{scoring.companyQualityScore}/100</span>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-lg p-2.5">
                <span className="text-[8px] text-sage-green-700 font-extrabold uppercase block">Investment score</span>
                <span className="text-xs font-black mt-1 block text-sage-green">{scoring.investmentQualityScore}/100</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Aspect Explainer & Missing Fields entry form */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-vanilla-cream-900/60 border border-sage-green-700/25 rounded-2xl p-5 shadow-3xs space-y-4">
            
            {/* Aspect Heading */}
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-black text-hunter-green-100 bg-sage-green-900 border border-sage-green-700 rounded px-2 py-0.5 uppercase tracking-wide">
                  {currentMetricData.label} Perspective
                </span>
                <span className="text-[9px] font-bold text-hunter-green-400 lowercase font-mono">
                  {activeTab === "core8" ? "universal core 8" : "sector matrix metrics"}
                </span>
              </div>
              <h2 className="text-sm font-black text-hunter-green-100 mt-2">{currentMetricData.fullName}</h2>
              <p className="text-[10px] font-mono text-hunter-green-400 mt-0.5">Formula: {currentMetricData.formula}</p>
            </div>

            {/* Simplistic Definition */}
            <p className="text-xs text-hunter-green-200 leading-relaxed bg-white p-3 rounded-xl border border-sage-green-700/20">
              {currentMetricData.desc}
            </p>

            {/* HIGH VS LOW EXPLAINER - What the value tells the user */}
            <div className="bg-white p-4.5 rounded-xl border border-sage-green-700/25 space-y-3.5">
              <span className="text-[9px] font-extrabold tracking-wider uppercase text-hunter-green-400 block border-b border-sage-green-200 pb-1.5">
                Quantitative Significance Guide
              </span>
              
              <div className="space-y-3 text-xs text-slate-705">
                <div className="flex gap-2">
                  <div className="text-hunter-green font-extrabold shrink-0 px-2 py-0.5 bg-sage-green-900 rounded border border-sage-green-600/30 text-[9px] uppercase h-fit mt-0.5">
                    HIGH
                  </div>
                  <p className="leading-relaxed font-sans text-hunter-green-100">{currentMetricData.highTells}</p>
                </div>
                
                <div className="flex gap-2">
                  <div className="text-blushed-brick font-extrabold shrink-0 px-2 py-0.5 bg-blushed-brick-900 rounded border border-blushed-brick-800/40 text-[9px] uppercase h-fit mt-0.5">
                    LOW
                  </div>
                  <p className="leading-relaxed font-sans text-hunter-green-100">{currentMetricData.lowTells}</p>
                </div>
              </div>
            </div>

            {/* MISSING / ZERO VALUE PROMPTS */}
            <div className="border-t border-sage-green-700/20 pt-3">
              {missingFields.length > 0 ? (
                <div className="space-y-3 bg-blushed-brick-900/65 border border-blushed-brick-800/40 p-4 rounded-xl">
                  <div className="flex items-center gap-1.5 text-blushed-brick-105">
                    <AlertTriangle className="w-4 h-4 text-blushed-brick shrink-0" />
                    <span className="text-[10px] font-black uppercase tracking-wider">
                      Required Ledger Input Alert
                    </span>
                  </div>
                  
                  <p className="text-[11px] text-hunter-green-200 leading-relaxed">
                    Some corporate inputs required for this metric are missing or set to 0. Please input the correct values below, or trigger AI extraction to automatically crawl estimated data.
                  </p>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={triggerAiBatchExtraction}
                      disabled={isAiExtracting}
                      className="px-3 py-1.5 bg-hunter-green border border-hunter-green-600 text-white rounded-lg font-bold text-[10px] transition hover:bg-hunter-green-500 inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      {isAiExtracting ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>AI Crawling...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-yellow-green-600" />
                          <span>AI Auto-Extract</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-sage-green-900/40 border border-sage-green-800/30 p-3.5 rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-hunter-green shrink-0" />
                  <p className="text-[10px] font-extrabold text-hunter-green uppercase tracking-widest">
                    All Required Inputs Verified & Recalculated
                  </p>
                </div>
              )}

              {/* Standard Interactive form to update any/all required core bases */}
              <form onSubmit={handleValueUpdate} className="mt-4 space-y-3 bg-white border border-sage-green-700/25 p-4 rounded-xl">
                <span className="text-[9px] font-black text-hunter-green-400 uppercase tracking-widest block mb-2 px-1">
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
                        <label className="text-[10px] text-hunter-green-300 font-bold truncate max-w-[200px]" title={fMeta.label}>
                          {fMeta.label} {isMissing && <span className="text-blushed-brick font-extrabold">*</span>}
                        </label>
                        <input
                          type="text"
                          value={val || ""}
                          placeholder={isMissing ? "Enter Value" : String(originalValue)}
                          onChange={(e) => setEditingValues(prev => ({ ...prev, [fMeta.fieldId]: e.target.value }))}
                          className={cn(
                            "w-28 px-2 py-1 text-right text-xs font-mono font-bold rounded-md bg-vanilla-cream-900 border transition-all focus:bg-white focus:outline-hunter-green",
                            isMissing ? "border-blushed-brick-800 text-blushed-brick placeholder-blushed-brick-800/40 bg-blushed-brick-900/40" : "border-sage-green-750/15 text-hunter-green-100"
                          )}
                        />
                      </div>
                    );
                  })}
                </div>

                <div className="pt-2 border-t border-sage-green-200/20 flex items-center justify-between">
                  <button
                    type="submit"
                    disabled={saveStatus === "saving"}
                    className="px-3.5 py-1.5 bg-hunter-green hover:bg-hunter-green-400 text-white font-extrabold text-[10px] uppercase tracking-wide rounded-lg inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
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
                    <span className="text-[9px] text-sage-green font-black uppercase tracking-wider animate-pulse">
                      ✓ Recalculated
                    </span>
                  )}
                  {saveStatus === "error" && (
                    <span className="text-[9px] text-blushed-brick font-black uppercase tracking-wider">
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
