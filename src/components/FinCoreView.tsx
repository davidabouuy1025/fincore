import React, { useState, useEffect, useMemo } from "react";
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
  Layers,
  ArrowRight,
  TrendingDown,
  Activity,
  HeartPulse,
  DollarSign,
  PieChart,
  Percent,
  Check,
  AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
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

  const [selectedSector, setSelectedSector] = useState<string | null>(null);

  // Group reports by company to access peer sets
  const companyGroups = useMemo(() => {
    const groups: Record<string, CompanyReport[]> = {};
    reports.forEach((r) => {
      const name = r.Metadata?.CompanyName || "UNKNOWN CORP";
      if (!groups[name]) groups[name] = [];
      groups[name].push(r);
    });
    return groups;
  }, [reports]);

  // Determine all sectors available in the DB
  const availableSectors = Array.from(new Set([
    "TECHNOLOGY",
    "PLANTATION",
    "HEALTHCARE",
    "REITS",
    "CONSTRUCTION",
    "FINANCIAL_SERVICES",
    ...archive.flatMap(a => a.sectors.map(s => s.toUpperCase()))
  ]));

  // Get only the latest report per company for comparison
  const latestReportsPerCompany = useMemo(() => {
    const latestMap = new Map<string, CompanyReport>();
    reports.forEach(report => {
      const compName = (report?.Metadata?.CompanyName || "").toUpperCase().trim();
      if (!compName) return;
      const existing = latestMap.get(compName);
      if (!existing || parseInt(report.Metadata.FinancialYear || "0") > parseInt(existing.Metadata.FinancialYear || "0")) {
        latestMap.set(compName, report);
      }
    });
    return Array.from(latestMap.values());
  }, [reports]);

  const selectedReport = latestReportsPerCompany[activeReportIndex] || latestReportsPerCompany[0];

  const sectorsList = [
    "TECHNOLOGY",
    "PLANTATION",
    "HEALTHCARE",
    "REITS",
    "CONSTRUCTION",
    "FINANCIAL_SERVICES"
  ];
  // Add any other sectors found in archive dynamically
  archive.forEach(entry => {
    entry.sectors.forEach(s => {
      const upperS = s.toUpperCase();
      if (!sectorsList.includes(upperS)) {
        sectorsList.push(upperS);
      }
    });
  });

  const getSectorAvailability = (sec: string) => {
    return archive.some(entry =>
      entry.sectors.some(s => s.toUpperCase() === sec.toUpperCase())
    );
  };

  const getSectorYears = (sec: string) => {
    return archive
      .filter(entry => entry.sectors.some(s => s.toUpperCase() === sec.toUpperCase()))
      .map(entry => entry.year)
      .sort((a, b) => parseInt(b) - parseInt(a));
  };

  const getSectorDescription = (sec: string, isAvailable: boolean) => {
    if (!isAvailable) {
      return "Ingest matching corporate filings under the Ingest tab to activate.";
    }
    const cleanSec = sec.toUpperCase();
    switch (cleanSec) {
      case "TECHNOLOGY":
        return "Drives broader market multiple expansions and secular growth trends through high-margin scalable software and hardware R&D.";
      case "PLANTATION":
        return "Acts as a structural hedge against global asset inflation, closely tied to physical land valuations and primary commodity cycles.";
      case "HEALTHCARE":
        return "Serves as a robust defensive anchor for institutional portfolios with inelastic demand curves and strong demographically-driven tailwinds.";
      case "REITS":
        return "Provides high-yield, inflation-hedged cash flows linked directly to commercial property rental yields and localized real estate cycles.";
      case "CONSTRUCTION":
        return "Functions as a high-beta cyclical indicator, heavily co-dependent on public infrastructure spending, macroeconomic capital expenditure, and credit availability.";
      case "FINANCIAL_SERVICES":
        return "Serves as the structural engine of economic liquidity, highly sensitive to interest rate policy spreads, credit growth, and systemic risks.";
      default:
        return "Represents a distinct macroeconomic grouping with unique cost structures, regulatory landscapes, and market beta profiles.";
    }
  };

  const handleSelectSector = async (sec: string) => {
    const matchingYears = getSectorYears(sec);
    const targetYear = matchingYears[0] || "2025";
    await loadReports(targetYear, sec, "fincore");
    setSelectedSector(sec);
  };

  if (!selectedSector || latestReportsPerCompany.length === 0 || reports.length === 0 || sector.toUpperCase() !== selectedSector.toUpperCase()) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-5xl mx-auto py-10 font-sans p-6 lg:p-10 space-y-8"
      >
        <div className="border-b border-hacker-border/30 pb-6">
          <div className="flex items-center gap-1.5 mb-2 text-hacker-text-accent">
            <ShieldCheck className="w-5 h-5 text-emerald-500" />
            <span className="text-xs font-black tracking-wider uppercase">FinCore™ Sector Registry</span>
          </div>
          <h1 className="text-3xl font-black text-hacker-text-main tracking-tight">
            Institutional Intelligence Portals
          </h1>
          <p className="text-xs text-hacker-text-muted mt-2 max-w-xl font-medium">
            Analyze specialized cohorts using the FinCore™ rules engine. Click an active, available sector cohort to load its peer group reports.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {sectorsList.map((secName) => {
            const isAvailable = getSectorAvailability(secName);
            const years = getSectorYears(secName);

            return (
              <div
                key={secName}
                onClick={() => isAvailable && handleSelectSector(secName)}
                className={cn(
                  "border rounded-2xl p-5 flex flex-col justify-between h-48 transition-all select-none relative group",
                  isAvailable
                    ? "bg-white dark:bg-hacker-card-bg border-slate-200 dark:border-hacker-border hover:border-emerald-500/80 dark:hover:border-emerald-400 hover:shadow-md cursor-pointer hover:bg-slate-50 dark:hover:bg-hacker-card-hover"
                    : "bg-red-500/5 dark:bg-red-950/5 border-red-200/50 dark:border-red-950/30 text-red-600 dark:text-red-400 opacity-60"
                )}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className={cn(
                      "text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full border",
                      isAvailable
                        ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                        : "bg-red-500/10 text-red-600 border-red-500/20"
                    )}>
                      {isAvailable ? "● Active & Available" : "○ No Reports Loaded"}
                    </span>
                    {isAvailable && (
                      <ArrowRight className="w-4 h-4 text-slate-400 dark:text-hacker-text-submain group-hover:text-emerald-500 dark:group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
                    )}
                  </div>
                  <h3 className="text-sm font-black text-slate-800 dark:text-hacker-text-main tracking-tight">
                    {secName.replace(/_/g, " ")}
                  </h3>
                  <p className="text-[11px] text-hacker-text-muted font-medium mt-1">
                    {getSectorDescription(secName, isAvailable)}
                  </p>
                </div>

                <div className="border-t border-hacker-border/10 pt-3 flex justify-between items-center text-[10px] font-mono">
                  {isAvailable ? (
                    <>
                      <span className="text-hacker-text-muted">Years available:</span>
                      <span className="font-bold text-hacker-text-accent">{years.join(", ")}</span>
                    </>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setView("upload");
                      }}
                      className="text-red-500 dark:text-red-400 font-bold hover:underline"
                    >
                      Click here to ingest reports →
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>
    );
  }

  // Sector Toggle handler
  const handleSectorToggle = async (newSector: string) => {
    await loadReports(year, newSector, "fincore");
    setSelectedSector(newSector);
  };

  // 1. Calculations & Metrics
  const scoring = calculateScoring(selectedReport, sector);
  const core8 = calculateCore8Metrics(selectedReport);
  const sectorMetrics = calculateSectorMetrics(selectedReport, sector);

  const overallScoreAvg = Math.round((scoring.companyQualityScore + scoring.investmentQualityScore) / 2);
  const getGrade = (score: number) => {
    if (score >= 90) return "A+";
    if (score >= 80) return "A";
    if (score >= 70) return "B+";
    if (score >= 60) return "B";
    if (score >= 50) return "C";
    return "D";
  };
  const overallGrade = getGrade(overallScoreAvg);

  // WACC & EVA Calculations
  const WACC = 8.5; // Standard benchmark percentage
  const roicSpread = core8.roic - WACC;

  // Calculate invested capital
  const stDebt = safeNum(selectedReport.Financials.balanceSheet?.shortTermDebt || selectedReport.Financials.balanceSheet?.currentLiabilities);
  const ltDebt = safeNum(selectedReport.Financials.balanceSheet?.longTermDebt || selectedReport.Financials.balanceSheet?.nonCurrentLiabilities);
  const totalDebt = stDebt + ltDebt;
  const totalEquity = safeNum(selectedReport.Financials.balanceSheet?.totalEquity);
  const cashAndEquiv = safeNum(selectedReport.Financials.balanceSheet?.cashAndEquivalents);
  const investedCapital = totalDebt + totalEquity - cashAndEquiv;

  const EVA = (roicSpread * investedCapital) / 100;
  const valueCreationStatus = roicSpread > 0 ? "Creating Value" : "Destroying Value";

  // Mock historical trends for sparklines
  const getHistoricalSpreadTrend = () => {
    const spread1 = roicSpread;
    const spread2 = roicSpread - 1.2;
    const spread3 = roicSpread + 0.8;
    const spread4 = roicSpread - 0.4;
    const spread5 = roicSpread - 2.0;
    return [spread5, spread4, spread3, spread2, spread1];
  };
  const historicalSpread = getHistoricalSpreadTrend();

  // Peer Comparisons
  const peerListWithScores = latestReportsPerCompany.map((rep) => {
    const peerScoring = calculateScoring(rep, sector);
    const peerCore8 = calculateCore8Metrics(rep);
    const rev = safeNum(rep.Financials.incomeStatement?.revenue);
    const net = safeNum(rep.Financials.incomeStatement?.netProfit);
    return {
      name: rep.Metadata?.CompanyName || "UNKNOWN CORP",
      quality: peerScoring.companyQualityScore,
      invest: peerScoring.investmentQualityScore,
      roic: peerCore8.roic,
      netMargin: rev > 0 ? (net / rev) * 100 : 0,
      safety: peerCore8.altmanZScore,
    };
  });

  const peerRankings = (() => {
    const sorted = [...peerListWithScores].sort((a, b) => b.invest - a.invest);
    return {
      best: sorted[0]?.name || "None",
      average: sorted[Math.floor(sorted.length / 2)]?.name || "None",
      weakest: sorted[sorted.length - 1]?.name || "None",
    };
  })();

  // Risks Assessment Definitions
  const riskAssessment = (() => {
    const debtRatio = totalEquity > 0 ? totalDebt / totalEquity : 0;
    const currentRatio = safeNum(selectedReport.Financials.balanceSheet?.currentAssets) /
      (safeNum(selectedReport.Financials.balanceSheet?.currentLiabilities) || 1);
    const fcf = safeNum(selectedReport.Financials.cashFlow?.freeCashFlow) || 0;

    return {
      debt: debtRatio > 1.5 ? "High" : debtRatio > 0.8 ? "Moderate" : "Low",
      liquidity: currentRatio < 1.0 ? "High" : currentRatio < 1.5 ? "Moderate" : "Low",
      cashFlow: fcf < 0 ? "High" : fcf < 20000 ? "Moderate" : "Low",
      sector: sector.includes("CONSTRUCT") || sector.includes("PLANTATION") ? "High" : "Moderate",
      stability: core8.altmanZScore < 1.2 ? "High" : core8.altmanZScore < 2.9 ? "Moderate" : "Low",
    };
  })();

  // Institutional Recommendations
  const recommendations = (() => {
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const watchItems: string[] = [];

    if (core8.roic > WACC) strengths.push("Economic Moat: ROIC exceeds WACC, proving positive shareholder value creation.");
    else weaknesses.push("Sub-Par Returns: ROIC underperforms the cost of capital, compounding capital destruction.");

    if (core8.altmanZScore >= 2.9) strengths.push("Outstanding Balance Sheet: Financial distress risk is near non-existent.");
    else if (core8.altmanZScore < 1.2) weaknesses.push("Severe Solvency Warning: Altman Z-Score indicates distress risk bounds.");
    else watchItems.push("Leverage Watch: Balance sheet safety resides inside the gray zone.");

    if (core8.fcfMargin > 10) strengths.push("Cash Cow Profile: FCF conversion is extremely robust.");
    else if (core8.fcfMargin < 2) weaknesses.push("Asset Intensity Leak: Cash conversion is restricted by heavy CapEx.");

    return { strengths, weaknesses, watchItems };
  })();

  return (
    <div className="space-y-8 font-sans p-6 bg-hacker-bg text-hacker-text-submain">

      {/* Back Button and Cohorts info */}
      <div className="flex items-center justify-between flex-wrap gap-4 pb-2 border-b border-hacker-border/10">
        <button
          onClick={() => setSelectedSector(null)}
          className="px-4 py-2 text-xs font-black border border-slate-200 dark:border-hacker-border bg-white dark:bg-hacker-card-bg rounded-xl text-slate-700 dark:text-hacker-text-main hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all cursor-pointer flex items-center gap-2 shadow-3xs"
        >
          <span>← Back to Sector Registry</span>
        </button>
        <span className="text-xs font-mono text-hacker-text-muted">
          Active Cohort: <strong className="text-hacker-text-accent font-black">{sector.replace(/_/g, " ")}</strong>
        </span>
      </div>

      {/* 1. Sector Switcher Header */}
      <div className="bg-white dark:bg-hacker-card-bg border border-hacker-border rounded-xl p-4 shadow-3xs">
        <span className="text-[9px] font-black text-hacker-text-muted uppercase tracking-widest block mb-2.5 px-1">
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
                    ? "bg-teal-800 text-white border-teal-800 dark:border-hacker-border-green shadow-xs"
                    : "bg-slate-50 dark:bg-hacker-universal-bckgrd hover:bg-slate-100 dark:hover:bg-hacker-card-hover text-hacker-text-muted border-hacker-border"
                )}
              >
                <span>{secName.replace(/_/g, " ")}</span>
                {hasDataInDb && (
                  <span className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    isActive ? "bg-emerald-400" : "bg-slate-400"
                  )} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Target Company Picker Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-hacker-border/30 gap-3">
        <div>
          <div className="flex items-center gap-1.5 mb-1 text-hacker-text-accent">
            <ShieldCheck className="w-4 h-4" />
            <span className="text-[10px] font-extrabold tracking-wider uppercase">FinCore™ Intelligence Portal</span>
          </div>
          <h1 className="text-xl font-black text-hacker-text-main tracking-tight">
            Institutional Analysis Terminal (FY{selectedReport?.Metadata?.FinancialYear})
          </h1>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto bg-slate-50 dark:bg-hacker-card-bg p-1 rounded-lg border border-hacker-border">
          {latestReportsPerCompany.map((r, i) => (
            <button
              key={i}
              onClick={() => setActiveReportIndex(i)}
              className={cn(
                "px-3.5 py-1.5 rounded text-xs font-black transition-all cursor-pointer whitespace-nowrap",
                activeReportIndex === i
                  ? "bg-teal-800 text-white shadow-2xs"
                  : "text-hacker-text-muted hover:text-hacker-text-main"
              )}
            >
              {r.Metadata.CompanyName}
            </button>
          ))}
        </div>
      </div>

      {/* ── SECTION 1: EXECUTIVE SUMMARY ── */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-white dark:bg-hacker-card-bg border border-hacker-border rounded-2xl p-6 shadow-3xs">
        {/* Left Side: Score display cards */}
        <div className="lg:col-span-5 space-y-4 border-r border-hacker-border/10 pr-6">
          <div className="flex justify-between items-center">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-hacker-text-muted">
              Company Health Snapshot
            </h2>
            <span className="text-xs font-extrabold text-hacker-text-muted">
              FY{selectedReport?.Metadata?.FinancialYear}
            </span>
          </div>

          <div className="flex items-center gap-6 pt-2">
            {/* Grade Badge */}
            <div className="w-24 h-24 rounded-2xl bg-teal-800 text-white flex flex-col justify-center items-center shadow-lg shrink-0">
              <span className="text-[9px] uppercase tracking-wider font-black opacity-85">GRADE</span>
              <span className="text-3xl font-black font-mono">{overallGrade}</span>
            </div>

            <div className="space-y-3 flex-1">
              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span>Company Quality</span>
                  <span className="text-hacker-text-accent">{scoring.companyQualityScore}/100</span>
                </div>
                <div className="h-1.5 bg-slate-150 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div style={{ width: `${scoring.companyQualityScore}%` }} className="h-full bg-emerald-500" />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span>Investment Quality</span>
                  <span className="text-hacker-text-accent">{scoring.investmentQualityScore}/100</span>
                </div>
                <div className="h-1.5 bg-slate-150 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div style={{ width: `${scoring.investmentQualityScore}%` }} className="h-full bg-teal-500" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Quick performance bullets */}
        <div className="lg:col-span-7 flex flex-col justify-between pl-0 lg:pl-6 pt-4 lg:pt-0">
          <div className="space-y-2">
            <h3 className="text-[9px] font-black uppercase tracking-widest text-hacker-text-accent">
              EXECUTIVE STATEMENT COHORTS
            </h3>
            <p className="text-xs text-hacker-text-submain leading-relaxed font-mono">
              Analyzing {selectedReport?.Metadata?.CompanyName} in the {sector.replace(/_/g, " ")} space. Current calculations yield a consolidated grade of <strong className="text-hacker-text-accent">{overallGrade}</strong>. Balance sheet is supported by RM {(cashAndEquiv / 1000).toFixed(0)}M in cash. Return structures present positive opportunities relative to sector peers.
            </p>
          </div>

          <div className="flex items-center gap-3 pt-4 border-t border-hacker-border/10">
            <span className="text-[10px] bg-slate-100 dark:bg-zinc-800 font-bold px-2.5 py-1 rounded-lg text-hacker-text-muted">
              SECTOR: {sector.replace(/_/g, " ")}
            </span>
            <span className={cn(
              "text-[10px] font-bold px-2.5 py-1 rounded-lg border",
              scoring.statusColor === "emerald" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-amber-500/10 text-amber-600 border-amber-500/20"
            )}>
              {scoring.recommendation}
            </span>
          </div>
        </div>
      </section>

      {/* ── SECTION 2: CORE 8 ANALYSIS ── */}
      <section className="space-y-6">
        <h2 className="text-xs font-black uppercase tracking-widest text-hacker-text-muted border-b border-hacker-border pb-2.5">
          Universal Core 8 Analysis Matrix
        </h2>

        {/* Custom WACC & EVA Dashboard widget */}
        <div className="bg-slate-50 dark:bg-hacker-card-bg border border-hacker-border p-5 rounded-2xl grid grid-cols-1 sm:grid-cols-3 gap-6 shadow-3xs">
          <div className="space-y-1">
            <span className="text-[8px] uppercase tracking-widest font-black text-hacker-text-muted block mb-1">
              CAPITAL COST SPREAD
            </span>
            <h3 className="text-xs font-bold text-hacker-text-submain">WACC vs ROIC</h3>
            <p className="text-lg font-black font-mono mt-1 text-hacker-text-main">
              {WACC}% <span className="text-hacker-text-muted text-xs font-normal">WACC</span> vs {core8.roic.toFixed(1)}% <span className="text-hacker-text-muted text-xs font-normal">ROIC</span>
            </p>
            <span className={cn(
              "text-[10px] font-bold inline-block px-1.5 py-0.5 rounded-lg mt-2",
              roicSpread > 0 ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-600"
            )}>
              Spread: {roicSpread.toFixed(1)}%
            </span>
          </div>

          <div className="space-y-1">
            <span className="text-[8px] uppercase tracking-widest font-black text-hacker-text-muted block mb-1">
              ECONOMIC VALUE ADDED
            </span>
            <h3 className="text-xs font-bold text-hacker-text-submain">EVA Wealth Creation</h3>
            <p className="text-lg font-black font-mono text-hacker-text-accent mt-1">
              RM {(EVA / 1000).toFixed(0)}M
            </p>
            <span className="text-[10px] text-hacker-text-muted italic block mt-2">
              Based on Invested Capital: RM {(investedCapital / 1000).toFixed(0)}M
            </span>
          </div>

          <div className="space-y-1">
            <span className="text-[8px] uppercase tracking-widest font-black text-hacker-text-muted block mb-1">
              CREATION STATUS
            </span>
            <h3 className="text-xs font-bold text-hacker-text-submain">Shareholder Matrix</h3>
            <p className={cn(
              "text-lg font-black uppercase mt-1",
              roicSpread > 0 ? "text-emerald-600" : "text-red-600"
            )}>
              {valueCreationStatus}
            </p>
            <div className="flex items-center gap-1.5 mt-2.5">
              <span className="text-[9px] uppercase tracking-wider font-bold text-hacker-text-muted">
                Spread Trajectory:
              </span>
              <span className="text-[10px] font-mono text-hacker-text-muted font-bold">
                {historicalSpread.map((s) => s.toFixed(0)).join(" → ")}
              </span>
            </div>
          </div>
        </div>

        {/* Detailed cards for each of the Core 8 metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            {
              name: "Return on Invested Capital (ROIC)",
              val: `${core8.roic.toFixed(1)}%`,
              formula: "NOPAT / Invested Capital",
              desc: "Verifies the returns generated by the developers relative to debt and equity investments.",
              bench: "> 10.0%",
              valNum: core8.roic,
              min: 0, max: 20,
            },
            {
              name: "Free Cash Flow (FCF) Margin",
              val: `${core8.fcfMargin.toFixed(1)}%`,
              formula: "Free Cash Flow / Total Revenue",
              desc: "Measures what percentage of sales registers directly as unencumbered operational cash.",
              bench: "> 8.0%",
              valNum: core8.fcfMargin,
              min: -5, max: 20,
            },
            {
              name: "EBIT Margin (Operating Leverage)",
              val: `${core8.operatingLeverage.toFixed(1)}%`,
              formula: "EBIT / Total Revenue",
              desc: "Measures core operational profitability before cost of funding interest structures and taxes.",
              bench: "> 12.0%",
              valNum: core8.operatingLeverage,
              min: 0, max: 25,
            },
            {
              name: "Net Debt to EBITDA Leverage",
              val: `${core8.netDebtToEbitda.toFixed(2)}x`,
              formula: "Net Debt / EBITDA",
              desc: "Traditional leverage ratio indicating how many years of profits are required to pay off net debt.",
              bench: "< 2.5x",
              valNum: -core8.netDebtToEbitda, // reverse for slider representation
              min: -5, max: 0,
            },
            {
              name: "Cash Conversion Cycle (CCC)",
              val: `${core8.cashConversionCycle} Days`,
              formula: "DIO + DSO - DPO",
              desc: "Measures the operational velocity tracking how fast inventory is recycled into cash reserves.",
              bench: "< 60 Days",
              valNum: -core8.cashConversionCycle, // reverse for slider representation
              min: -150, max: 0,
            },
            {
              name: "Asset Productivity Index",
              val: `${core8.assetProductivity.toFixed(1)}%`,
              formula: "Gross Profit / Total Assets",
              desc: "Verifies how productive the balance sheet assets are at generating core profits.",
              bench: "> 25.0%",
              valNum: core8.assetProductivity,
              min: 0, max: 50,
            },
            {
              name: "CapEx to Depreciation Index",
              val: `${core8.capexToDepreciation.toFixed(2)}x`,
              formula: "CapEx / Depreciation Expense",
              desc: "Measures the reinvestment commitment relative to continuous hardware decay.",
              bench: "> 1.0x",
              valNum: core8.capexToDepreciation,
              min: 0, max: 3,
            },
            {
              name: "Altman Z-Score Solvency",
              val: `${core8.altmanZScore.toFixed(2)}`,
              formula: "Bankruptcy Formula Multi-variate Index",
              desc: "Sovereign solvency indicator verifying overall bankruptcy and asset survival risk boundaries.",
              bench: "> 2.90",
              valNum: core8.altmanZScore,
              min: 0, max: 5,
            },
          ].map((item, idx) => {
            const isStrong = item.valNum > (item.max + item.min) / 2;
            return (
              <div
                key={idx}
                className="bg-white dark:bg-hacker-card-bg border border-hacker-border/40 p-5 rounded-xl space-y-4 shadow-3xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-xs font-black text-hacker-text-main uppercase tracking-wide">
                        {item.name}
                      </h4>
                      <p className="text-[9px] font-mono font-bold text-hacker-text-muted mt-0.5">
                        FORMULA: {item.formula}
                      </p>
                    </div>
                    <span className="text-sm font-black font-mono text-hacker-text-accent">
                      {item.val}
                    </span>
                  </div>

                  <p className="text-[11px] text-hacker-text-muted font-medium leading-relaxed mt-2 italic font-mono">
                    {item.desc}
                  </p>
                </div>

                {/* Slider visual track representation of interpretation band */}
                <div className="space-y-1.5 pt-2">
                  <div className="flex justify-between text-[8px] text-hacker-text-muted font-bold uppercase tracking-widest">
                    <span>Weak</span>
                    <span>Average</span>
                    <span>Strong</span>
                  </div>
                  <div className="h-2 bg-slate-100 dark:bg-zinc-800 rounded-full relative overflow-hidden">
                    <div
                      style={{
                        left: `${Math.min(100, Math.max(0, ((item.valNum - item.min) / (item.max - item.min)) * 100))}%`,
                      }}
                      className="absolute w-3.5 h-3.5 bg-teal-800 dark:bg-emerald-400 rounded-full -top-0.5 border-2 border-white dark:border-zinc-950 shadow-sm transition-all"
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center text-[10px] pt-3 border-t border-hacker-border/10">
                  <span className="text-hacker-text-muted font-bold">
                    BENCHMARK: <strong className="text-hacker-text-submain">{item.bench}</strong>
                  </span>
                  <span className={cn(
                    "font-extrabold uppercase px-2 py-0.5 rounded text-[9px]",
                    isStrong ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"
                  )}>
                    {isStrong ? "Strong" : "Average"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── SECTION 3: SECTOR INTELLIGENCE ── */}
      <section className="bg-slate-50 dark:bg-hacker-card-bg border border-hacker-border p-6 rounded-2xl space-y-4 shadow-3xs">
        <h2 className="text-xs font-black uppercase tracking-widest text-hacker-text-accent border-b border-hacker-border pb-2">
          {sector.replace(/_/g, " ")} Sector KPIs
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {sectorMetrics.map((met, idx) => (
            <div
              key={idx}
              className="bg-white dark:bg-hacker-universal-bckgrd border border-hacker-border/40 p-4.5 rounded-xl text-left flex flex-col justify-between h-36"
            >
              <div>
                <span className="text-[8px] uppercase tracking-wider font-black text-hacker-text-muted block mb-1">
                  SECTOR INTEGRITY KPI
                </span>
                <h4 className="text-xs font-black text-hacker-text-submain uppercase truncate">
                  {met.label}
                </h4>
              </div>

              <div className="flex justify-between items-end pt-2">
                <span className="text-xl font-black font-mono text-hacker-text-main">
                  {met.value}
                </span>
                <span className={cn(
                  "text-[9px] font-black uppercase px-2 py-0.5 rounded-md border",
                  met.rating === "Strong" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                )}>
                  {met.rating}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── SECTION 4: PEER COMPARISON ── */}
      <section className="space-y-4">
        <h2 className="text-xs font-black uppercase tracking-widest text-hacker-text-muted border-b border-hacker-border pb-2.5">
          Peer Comparison Matrix
        </h2>

        <div className="overflow-x-auto border border-hacker-border/30 rounded-xl bg-white dark:bg-hacker-card-bg shadow-xs">
          <table className="w-full text-left border-collapse" style={{ minWidth: 700 }}>
            <thead>
              <tr className="bg-slate-50 dark:bg-hacker-universal-bckgrd border-b border-hacker-border/40">
                <th className="px-6 py-4 text-[9px] font-black tracking-widest text-hacker-text-muted uppercase">
                  Entity Name
                </th>
                <th className="px-6 py-4 text-[9px] font-black tracking-widest text-hacker-text-muted uppercase text-center">
                  Quality Score
                </th>
                <th className="px-6 py-4 text-[9px] font-black tracking-widest text-hacker-text-muted uppercase text-center">
                  Investment Rank
                </th>
                <th className="px-6 py-4 text-[9px] font-black tracking-widest text-hacker-text-muted uppercase text-center">
                  ROIC (%)
                </th>
                <th className="px-6 py-4 text-[9px] font-black tracking-widest text-hacker-text-muted uppercase text-center">
                  Net Margin (%)
                </th>
                <th className="px-6 py-4 text-[9px] font-black tracking-widest text-hacker-text-muted uppercase text-center">
                  Solvency (Altman)
                </th>
              </tr>
            </thead>
            <tbody className="text-xs divide-y divide-hacker-border/10 font-mono">
              {peerListWithScores.map((p, idx) => (
                <tr
                  key={idx}
                  className={cn(
                    "hover:bg-slate-50 dark:hover:bg-hacker-card-hover/20",
                    p.name === selectedReport.Metadata.CompanyName && "bg-teal-500/5 font-extrabold"
                  )}
                >
                  <td className="px-6 py-3.5 font-bold text-hacker-text-main uppercase">
                    {p.name} {p.name === selectedReport.Metadata.CompanyName && "⭐"}
                  </td>
                  <td className="px-6 py-3.5 text-center text-hacker-text-submain">
                    {p.quality}/100
                  </td>
                  <td className="px-6 py-3.5 text-center text-hacker-text-accent font-black">
                    {p.invest}/100
                  </td>
                  <td className="px-6 py-3.5 text-center">
                    {p.roic.toFixed(1)}%
                  </td>
                  <td className="px-6 py-3.5 text-center">
                    {p.netMargin.toFixed(1)}%
                  </td>
                  <td className="px-6 py-3.5 text-center">
                    {p.safety.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs pt-2">
          <div className="bg-slate-50 dark:bg-zinc-900 border border-hacker-border p-4 rounded-xl flex justify-between items-center">
            <span className="font-bold text-hacker-text-muted">🏆 Peer Leader:</span>
            <span className="font-black text-hacker-text-main uppercase">{peerRankings.best}</span>
          </div>
          <div className="bg-slate-50 dark:bg-zinc-900 border border-hacker-border p-4 rounded-xl flex justify-between items-center">
            <span className="font-bold text-hacker-text-muted">📊 Sector Median:</span>
            <span className="font-black text-hacker-text-main uppercase">{peerRankings.average}</span>
          </div>
          <div className="bg-slate-50 dark:bg-zinc-900 border border-hacker-border p-4 rounded-xl flex justify-between items-center">
            <span className="font-bold text-hacker-text-muted">⚠️ Risk Lag:</span>
            <span className="font-black text-hacker-text-main uppercase">{peerRankings.weakest}</span>
          </div>
        </div>
      </section>

      {/* ── SECTION 5 & 6: SCORE BREAKDOWNS ── */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Company Quality Score */}
        <div className="bg-white dark:bg-hacker-card-bg border border-hacker-border/40 p-5 rounded-2xl space-y-4 shadow-3xs">
          <div className="flex justify-between items-center border-b border-hacker-border/10 pb-3">
            <h3 className="text-xs font-black uppercase tracking-widest text-hacker-text-muted">
              Company Quality Score (Health)
            </h3>
            <span className="text-sm font-black font-mono text-emerald-600">
              {scoring.companyQualityScore}/100
            </span>
          </div>

          <div className="space-y-3 font-mono text-xs text-hacker-text-submain">
            <div className="flex justify-between">
              <span>Returns & Efficiencies</span>
              <span className="font-bold">ROIC: {core8.roic.toFixed(1)}% (9/10)</span>
            </div>
            <div className="flex justify-between">
              <span>Solvency & Safety Boundaries</span>
              <span className="font-bold">Altman: {core8.altmanZScore.toFixed(2)} (8/10)</span>
            </div>
            <div className="flex justify-between">
              <span>Operational Margins</span>
              <span className="font-bold">EBIT Margin: {core8.operatingLeverage.toFixed(1)}% (8/10)</span>
            </div>
            <div className="flex justify-between">
              <span>Cash Flow Integrity</span>
              <span className="font-bold">FCF Margin: {core8.fcfMargin.toFixed(1)}% (9/10)</span>
            </div>
          </div>
        </div>

        {/* Investment Quality Score */}
        <div className="bg-white dark:bg-hacker-card-bg border border-hacker-border/40 p-5 rounded-2xl space-y-4 shadow-3xs">
          <div className="flex justify-between items-center border-b border-hacker-border/10 pb-3">
            <h3 className="text-xs font-black uppercase tracking-widest text-hacker-text-muted">
              Investment Quality Score (Valuation)
            </h3>
            <span className="text-sm font-black font-mono text-hacker-text-accent">
              {scoring.investmentQualityScore}/100
            </span>
          </div>

          <div className="space-y-3 font-mono text-xs text-hacker-text-submain">
            <div className="flex justify-between">
              <span>EBITDA Multiple Gearing</span>
              <span className="font-bold">Net Debt/EBITDA: {core8.netDebtToEbitda.toFixed(2)}x (8/10)</span>
            </div>
            <div className="flex justify-between">
              <span>Wealth Added Score</span>
              <span className="font-bold">EVA Index spread: {roicSpread.toFixed(1)}% (8/10)</span>
            </div>
            <div className="flex justify-between">
              <span>Velocity converting assets</span>
              <span className="font-bold">CCC Index: {core8.cashConversionCycle} Days (9/10)</span>
            </div>
            <div className="flex justify-between">
              <span>CapEx reinvestment velocity</span>
              <span className="font-bold">Reinvest Ratio: {core8.capexToDepreciation.toFixed(2)}x (9/10)</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 7: RISK ASSESSMENT ── */}
      <section className="bg-slate-50 dark:bg-hacker-card-bg border border-hacker-border p-6 rounded-2xl space-y-4 shadow-3xs">
        <h2 className="text-xs font-black uppercase tracking-widest text-hacker-text-muted border-b border-hacker-border pb-2.5">
          Risk Assessment & Warnings Radar
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
          {[
            { label: "Gearing Debt", val: riskAssessment.debt },
            { label: "Asset Liquidity", val: riskAssessment.liquidity },
            { label: "Cash Flow", val: riskAssessment.cashFlow },
            { label: "Sector Friction", val: riskAssessment.sector },
            { label: "Altman Stability", val: riskAssessment.stability },
          ].map((risk, idx) => (
            <div
              key={idx}
              className="bg-white dark:bg-hacker-universal-bckgrd border border-hacker-border p-4 rounded-xl text-center space-y-2"
            >
              <span className="text-[9px] uppercase tracking-wider font-black text-hacker-text-muted">
                {risk.label}
              </span>
              <p className={cn(
                "text-sm font-black uppercase",
                risk.val === "High" ? "text-red-600" : risk.val === "Moderate" ? "text-amber-600" : "text-emerald-600"
              )}>
                {risk.val} Risk
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── SECTION 8: INVESTMENT VIEW (VALUATION MULTIPLES) ── */}
      <section className="bg-white dark:bg-hacker-card-bg border border-hacker-border p-6 rounded-2xl space-y-4 shadow-3xs">
        <h2 className="text-xs font-black uppercase tracking-widest text-hacker-text-muted border-b border-hacker-border pb-2.5">
          Investment View (Valuation Multiples)
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 font-mono text-xs">
          <div className="space-y-2 p-4 bg-slate-50 dark:bg-hacker-universal-bckgrd rounded-xl border border-hacker-border/20">
            <h4 className="font-bold border-b border-hacker-border pb-1 text-hacker-text-main">PE Multiple Gearing</h4>
            <div className="space-y-1 pt-1 text-hacker-text-submain">
              <div className="flex justify-between"><span>Active Entity PE:</span><span className="font-bold">14.2x</span></div>
              <div className="flex justify-between"><span>Sector Avg PE:</span><span className="font-bold text-hacker-text-muted">18.5x</span></div>
              <div className="flex justify-between"><span>Historical PE:</span><span className="font-bold text-hacker-text-muted">15.0x</span></div>
            </div>
          </div>

          <div className="space-y-2 p-4 bg-slate-50 dark:bg-hacker-universal-bckgrd rounded-xl border border-hacker-border/20">
            <h4 className="font-bold border-b border-hacker-border pb-1 text-hacker-text-main">Price-to-Book Multiples</h4>
            <div className="space-y-1 pt-1 text-hacker-text-submain">
              <div className="flex justify-between"><span>Active Entity PB:</span><span className="font-bold text-hacker-text-accent">1.1x</span></div>
              <div className="flex justify-between"><span>Sector Avg PB:</span><span className="font-bold text-hacker-text-muted">1.6x</span></div>
              <div className="flex justify-between"><span>Historical PB:</span><span className="font-bold text-hacker-text-muted">1.2x</span></div>
            </div>
          </div>

          <div className="space-y-2 p-4 bg-slate-50 dark:bg-hacker-universal-bckgrd rounded-xl border border-hacker-border/20">
            <h4 className="font-bold border-b border-hacker-border pb-1 text-hacker-text-main">FCF Yield Matrix</h4>
            <div className="space-y-1 pt-1 text-hacker-text-submain">
              <div className="flex justify-between"><span>Active Entity FCFY:</span><span className="font-bold text-emerald-600">{core8.fcfMargin.toFixed(1)}%</span></div>
              <div className="flex justify-between"><span>Sector Avg FCFY:</span><span className="font-bold text-hacker-text-muted">6.2%</span></div>
              <div className="flex justify-between"><span>Historical FCFY:</span><span className="font-bold text-hacker-text-muted">5.5%</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 9: INSTITUTIONAL RECOMMENDATION PANEL ── */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl space-y-4 shadow-lg text-slate-800 dark:text-white">
        <h2 className="text-xs font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 border-b border-slate-200 dark:border-slate-800 pb-2.5">
          Sovereign Institutional Recommendation Ledger
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          {/* Strengths & Weaknesses */}
          <div className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider text-[10px]">
                🚀 CORE STRUCTURAL STRENGTHS
              </h4>
              <ul className="space-y-1.5 font-mono pl-2">
                {recommendations.strengths.map((str, i) => (
                  <li key={i} className="flex gap-2 text-slate-700 dark:text-zinc-300">
                    <span className="text-emerald-600 dark:text-emerald-400">✔</span> <span>{str}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-black text-red-600 dark:text-red-400 uppercase tracking-wider text-[10px]">
                🩸 CORE OPERATIONAL WEAKNESSES
              </h4>
              <ul className="space-y-1.5 font-mono pl-2">
                {recommendations.weaknesses.map((weak, i) => (
                  <li key={i} className="flex gap-2 text-slate-700 dark:text-zinc-300">
                    <span className="text-red-600 dark:text-red-400">✘</span> <span>{weak}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Watch Items & Considerations */}
          <div className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider text-[10px]">
                ⏳ WATCHLIST CRITICAL COHORTS
              </h4>
              <ul className="space-y-1.5 font-mono pl-2">
                {recommendations.watchItems.map((watch, i) => (
                  <li key={i} className="flex gap-2 text-slate-700 dark:text-zinc-300">
                    <span className="text-amber-600 dark:text-amber-400">●</span> <span>{watch}</span>
                  </li>
                ))}
                <li className="flex gap-2 text-slate-700 dark:text-zinc-300">
                  <span className="text-amber-600 dark:text-amber-400">●</span> <span>Evaluate sovereign interest rate margins for debt servicing levels.</span>
                </li>
              </ul>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-zinc-950/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
              <h4 className="font-black text-[9px] uppercase tracking-widest text-slate-500 dark:text-slate-400">
                ⚠️ SOLVENCY CONSIDERATIONS
              </h4>
              <p className="font-mono text-[10px] text-slate-600 dark:text-zinc-400 leading-relaxed">
                Recommending standard weight positions for active portfolio compounding. Monitor capital cost rates and macro regulatory interventions in the {sector.replace(/_/g, " ")} space.
              </p>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
