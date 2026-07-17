import React, { useState, useMemo } from "react";
import {
  TrendingUp,
  BarChart3,
  Calendar,
  Grid3X3,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Check,
  ChevronDown,
  Sparkles,
  Award,
  BookOpen,
  ArrowRight,
  Coins,
  Percent,
  Scale
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine
} from "recharts";
import { CompanyReport } from "../types";
import { safeNum } from "../constants";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

interface DashboardViewProps {
  key?: string;
  reports: CompanyReport[];
  sector: string;
  year: string;
  setView: (view: "upload" | "dashboard" | "archive" | "news" | "fincore" | "info") => void;
  setSelectedReport: (report: CompanyReport | null) => void;
  generateAIInsights?: () => void;
  isGeneratingAi?: boolean;
  aiInsight?: string | null;
  archive?: { year: string; sectors: string[] }[];
  loadReports?: (y: string, s: string, overrideView?: "upload" | "dashboard" | "archive" | "news" | "fincore" | "info") => Promise<void>;
}

// Helper to extract nested report values safely
function getReportVal(r: CompanyReport, cat: string, field: string): number {
  if (!r || !r.Financials) return 0;
  const category = r.Financials[cat as keyof typeof r.Financials];
  if (!category) return 0;
  return safeNum((category as any)[field]);
}

// Metric metadata dictionary for the trend metric selector
const METRIC_DICT: Record<string, { label: string; cat: string; field: string; unit: string }> = {
  revenue: { label: "Revenue", cat: "incomeStatement", field: "revenue", unit: "MYR '000" },
  grossProfit: { label: "Gross Profit", cat: "incomeStatement", field: "grossProfit", unit: "MYR '000" },
  ebit: { label: "Operating Income (EBIT)", cat: "incomeStatement", field: "ebit", unit: "MYR '000" },
  netProfit: { label: "Net Profit", cat: "incomeStatement", field: "netProfit", unit: "MYR '000" },
  totalAssets: { label: "Total Assets", cat: "balanceSheet", field: "totalAssets", unit: "MYR '000" },
  totalEquity: { label: "Total Equity", cat: "balanceSheet", field: "totalEquity", unit: "MYR '000" },
  cashAndEquivalents: { label: "Cash & Equivalents", cat: "balanceSheet", field: "cashAndEquivalents", unit: "MYR '000" },
  operatingCashFlow: { label: "Operating Cash Flow", cat: "cashFlow", field: "operatingCashFlow", unit: "MYR '000" },
  freeCashFlow: { label: "Free Cash Flow", cat: "cashFlow", field: "freeCashFlow", unit: "MYR '000" },
};

export function DashboardView({
  reports,
  sector,
  year,
  setView,
  setSelectedReport,
  archive = [],
  loadReports,
}: DashboardViewProps) {
  // Current active sub-tab
  const [activeTab, setActiveTab] = useState<"overview" | "trend" | "statements" | "comparison">("overview");

  const [selectedCollection, setSelectedCollection] = useState<{ year: string; sector: string } | null>(null);

  const handleSelectCollection = async (y: string, s: string) => {
    if (loadReports) {
      await loadReports(y, s, "dashboard");
      setSelectedCollection({ year: y, sector: s });
    }
  };

  // 1. Group & Sort Reports
  const companyGroups = useMemo(() => {
    const groups: Record<string, CompanyReport[]> = {};
    reports.forEach((r) => {
      const name = r.Metadata?.CompanyName || "UNKNOWN CORP";
      if (!groups[name]) groups[name] = [];
      groups[name].push(r);
    });
    // Sort chronologically descending
    Object.keys(groups).forEach((name) => {
      groups[name].sort(
        (a, b) => parseInt(b.Metadata?.FinancialYear || "0") - parseInt(a.Metadata?.FinancialYear || "0")
      );
    });
    return groups;
  }, [reports]);

  const uniqueCompanies = useMemo(() => Object.keys(companyGroups), [companyGroups]);

  // Selected Active Company for exploration
  const [selectedCompany, setSelectedCompany] = useState<string>("");

  const activeCompany = useMemo(() => {
    if (selectedCompany && uniqueCompanies.includes(selectedCompany)) {
      return selectedCompany;
    }
    return uniqueCompanies[0] || "";
  }, [selectedCompany, uniqueCompanies]);

  // Sync active company if list changes
  React.useEffect(() => {
    if (uniqueCompanies.length > 0 && !uniqueCompanies.includes(selectedCompany)) {
      setSelectedCompany(uniqueCompanies[0]);
    }
  }, [uniqueCompanies, selectedCompany]);

  const activeCompanyHistory = useMemo(() => {
    return companyGroups[activeCompany] || [];
  }, [activeCompany, companyGroups]);

  // ── SUPPORT ALL TO 5 YEARS SYSTEM ──
  // If the user uploaded/has 5 or more years, we display the 5-year trajectory. Otherwise, we just display the years present.
  const fullCompanyHistory = useMemo(() => {
    const history = [...activeCompanyHistory];
    if (history.length === 0) return [];

    // Ensure we sort chronologically descending (e.g., 2025, 2024, 2023, ...)
    history.sort((a, b) => parseInt(b.Metadata?.FinancialYear || "0") - parseInt(a.Metadata?.FinancialYear || "0"));

    return history;
  }, [activeCompanyHistory]);

  const latestReport = fullCompanyHistory[0];

  // ── TREND TAB STATES (14 click boxes) ──
  const [activeTrendSelection, setActiveTrendSelection] = useState<string>("revenue");

  // ── STATEMENT TAB STATES ──
  const [statementDisplayMode, setStatementDisplayMode] = useState<"normal" | "heatmap">("normal");

  // ── COMPARISON TAB STATES ──
  const [compareMetric, setCompareMetric] = useState<string>("revenue");
  const [comparePeers, setComparePeers] = useState<string[]>(() => {
    return uniqueCompanies.slice(0, 3);
  });

  // Sync compare peers if companies list updates
  React.useEffect(() => {
    if (uniqueCompanies.length > 0) {
      setComparePeers((prev) => {
        const filtered = prev.filter((p) => uniqueCompanies.includes(p));
        return filtered.length > 0 ? filtered : uniqueCompanies.slice(0, 3);
      });
    }
  }, [uniqueCompanies]);

  // ── OVERVIEW CALCULATIONS ──
  const overviewStats = (() => {
    if (!latestReport) return null;
    const history = fullCompanyHistory;

    const getCAGR = (fieldId: string, category: string, yearsCount: number) => {
      if (history.length < yearsCount) return null;
      const newestVal = getReportVal(history[0], category, fieldId);
      const oldestVal = getReportVal(history[yearsCount - 1], category, fieldId);
      if (newestVal <= 0 || oldestVal <= 0) return null;
      return (Math.pow(newestVal / oldestVal, 1 / (yearsCount - 1)) - 1) * 100;
    };

    const getYoY = (fieldId: string, category: string) => {
      if (history.length < 2) return null;
      const cur = getReportVal(history[0], category, fieldId);
      const prev = getReportVal(history[1], category, fieldId);
      if (prev === 0) return null;
      return ((cur - prev) / Math.abs(prev)) * 100;
    };

    // Calculate ROE, ROA, Net Margin, Equity Ratio
    const calcRatios = (rep: CompanyReport) => {
      const net = getReportVal(rep, "incomeStatement", "netProfit");
      const rev = getReportVal(rep, "incomeStatement", "revenue");
      const assets = getReportVal(rep, "balanceSheet", "totalAssets");
      const equity = getReportVal(rep, "balanceSheet", "totalEquity");

      return {
        roe: equity > 0 ? (net / equity) * 100 : 0,
        roa: assets > 0 ? (net / assets) * 100 : 0,
        netMargin: rev > 0 ? (net / rev) * 100 : 0,
        equityRatio: assets > 0 ? (equity / assets) * 100 : 0,
      };
    };

    const curRatios = calcRatios(history[0]);
    const prevRatios = history[1] ? calcRatios(history[1]) : null;

    const getRatioYoY = (curVal: number, prevVal: number | null) => {
      if (prevVal === null || prevVal === 0) return null;
      return ((curVal - prevVal) / Math.abs(prevVal)) * 100;
    };

    return {
      revenue: {
        val: getReportVal(history[0], "incomeStatement", "revenue"),
        yoy: getYoY("revenue", "incomeStatement"),
        cagr3: getCAGR("revenue", "incomeStatement", 3),
        cagr5: getCAGR("revenue", "incomeStatement", 5),
      },
      grossProfit: {
        val: getReportVal(history[0], "incomeStatement", "grossProfit"),
        yoy: getYoY("grossProfit", "incomeStatement"),
        cagr3: getCAGR("grossProfit", "incomeStatement", 3),
        cagr5: getCAGR("grossProfit", "incomeStatement", 5),
      },
      netProfit: {
        val: getReportVal(history[0], "incomeStatement", "netProfit"),
        yoy: getYoY("netProfit", "incomeStatement"),
        cagr3: getCAGR("netProfit", "incomeStatement", 3),
        cagr5: getCAGR("netProfit", "incomeStatement", 5),
      },
      roe: {
        val: curRatios.roe,
        yoy: prevRatios ? getRatioYoY(curRatios.roe, prevRatios.roe) : null,
      },
      roa: {
        val: curRatios.roa,
        yoy: prevRatios ? getRatioYoY(curRatios.roa, prevRatios.roa) : null,
      },
      netMargin: {
        val: curRatios.netMargin,
        yoy: prevRatios ? getRatioYoY(curRatios.netMargin, prevRatios.netMargin) : null,
      },
      equityRatio: {
        val: curRatios.equityRatio,
        yoy: prevRatios ? getRatioYoY(curRatios.equityRatio, prevRatios.equityRatio) : null,
      },
      ocf: {
        val: getReportVal(history[0], "cashFlow", "operatingCashFlow"),
        yoy: getYoY("operatingCashFlow", "cashFlow"),
      },
      fcf: {
        val: getReportVal(history[0], "cashFlow", "freeCashFlow"),
        yoy: getYoY("freeCashFlow", "cashFlow"),
      },
      assets: {
        val: getReportVal(history[0], "balanceSheet", "totalAssets"),
        yoy: getYoY("totalAssets", "balanceSheet"),
      },
      equity: {
        val: getReportVal(history[0], "balanceSheet", "totalEquity"),
        yoy: getYoY("totalEquity", "balanceSheet"),
      },
      cash: {
        val: getReportVal(history[0], "balanceSheet", "cashAndEquivalents"),
        yoy: getYoY("cashAndEquivalents", "balanceSheet"),
      },
    };
  })();

  // ── TREND SUMMARY METADATA ──
  const trendSummary = (() => {
    if (fullCompanyHistory.length < 2) return null;
    const history = [...fullCompanyHistory].reverse(); // Oldest to newest for calculations

    const metricsToTest = [
      { id: "Revenue", cat: "incomeStatement", field: "revenue" },
      { id: "Gross Profit", cat: "incomeStatement", field: "grossProfit" },
      { id: "Operating Income", cat: "incomeStatement", field: "ebit" },
      { id: "Net Profit", cat: "incomeStatement", field: "netProfit" },
      { id: "Total Assets", cat: "balanceSheet", field: "totalAssets" },
    ];

    let highestGrowth = { name: "", rate: -Infinity };
    let largestDecline = { name: "", rate: Infinity };
    let mostConsistent = { name: "", variance: Infinity };

    metricsToTest.forEach((m) => {
      const vals = history.map((h) => getReportVal(h, m.cat, m.field));
      const validVals = vals.filter((v) => v !== 0);

      if (validVals.length >= 2) {
        const start = validVals[0];
        const end = validVals[validVals.length - 1];
        const growthRate = ((end - start) / Math.abs(start)) * 100;

        if (growthRate > highestGrowth.rate) {
          highestGrowth = { name: m.id, rate: growthRate };
        }
        if (growthRate < largestDecline.rate) {
          largestDecline = { name: m.id, rate: growthRate };
        }

        // Variance test for consistency
        let yoyRates: number[] = [];
        for (let i = 1; i < validVals.length; i++) {
          const prev = validVals[i - 1];
          yoyRates.push(((validVals[i] - prev) / Math.abs(prev)) * 100);
        }
        const mean = yoyRates.reduce((a, b) => a + b, 0) / yoyRates.length;
        const variance = yoyRates.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / yoyRates.length;

        if (variance < mostConsistent.variance) {
          mostConsistent = { name: m.id, variance };
        }
      }
    });

    // Margins Trajectory
    const margins = history
      .map((h) => {
        const rev = getReportVal(h, "incomeStatement", "revenue");
        const net = getReportVal(h, "incomeStatement", "netProfit");
        return {
          year: h.Metadata?.FinancialYear,
          val: rev > 0 ? (net / rev) * 100 : 0,
        };
      })
      .filter((m) => m.val !== 0);

    margins.sort((a, b) => b.val - a.val);

    return {
      highestGrowth,
      largestDecline,
      mostConsistent,
      bestMargin: margins[0] || null,
      worstMargin: margins[margins.length - 1] || null,
    };
  })();

  // ── TREND ANALYSIS TAB DATA & CLICK-BOX MATCHING ──
  const { primaryMetric, overlayMetric, currentTitle } = useMemo(() => {
    if (activeTrendSelection.startsWith("rel_")) {
      if (activeTrendSelection === "rel_rev_gp") {
        return { primaryMetric: "revenue", overlayMetric: "grossProfit", currentTitle: "Revenue vs Gross Profit" };
      }
      if (activeTrendSelection === "rel_gp_ebit") {
        return { primaryMetric: "grossProfit", overlayMetric: "ebit", currentTitle: "Gross Profit vs Operating Income (EBIT)" };
      }
      if (activeTrendSelection === "rel_ebit_np") {
        return { primaryMetric: "ebit", overlayMetric: "netProfit", currentTitle: "EBIT vs Net Profit" };
      }
      if (activeTrendSelection === "rel_np_ocf") {
        return { primaryMetric: "netProfit", overlayMetric: "operatingCashFlow", currentTitle: "Net Profit vs Operating Cash Flow" };
      }
      if (activeTrendSelection === "rel_ocf_fcf") {
        return { primaryMetric: "operatingCashFlow", overlayMetric: "freeCashFlow", currentTitle: "Operating Cash Flow vs Free Cash Flow" };
      }
    }
    return { primaryMetric: activeTrendSelection, overlayMetric: "", currentTitle: METRIC_DICT[activeTrendSelection]?.label || "" };
  }, [activeTrendSelection]);

  const trendChartData = useMemo(() => {
    return [...fullCompanyHistory].reverse().map((r) => {
      const m1 = METRIC_DICT[primaryMetric];
      const m2 = overlayMetric ? METRIC_DICT[overlayMetric] : null;
      return {
        year: `FY${r.Metadata?.FinancialYear}`,
        [m1.label]: getReportVal(r, m1.cat, m1.field),
        ...(m2 ? { [m2.label]: getReportVal(r, m2.cat, m2.field) } : {}),
      };
    });
  }, [fullCompanyHistory, primaryMetric, overlayMetric]);

  // Comprehensive rule-based dynamic commentary for all 14 selections
  const dynamicCommentary = useMemo(() => {
    if (fullCompanyHistory.length < 2) {
      return "Insufficient historical records to generate detailed analytical commentary.";
    }

    const getValByYearIndex = (metricKey: string, yearIdx: number) => {
      const m = METRIC_DICT[metricKey];
      if (!m) return 0;
      return getReportVal(fullCompanyHistory[yearIdx], m.cat, m.field);
    };

    const latestYearStr = fullCompanyHistory[0].Metadata?.FinancialYear || "2025";
    const prevYearStr = fullCompanyHistory[1].Metadata?.FinancialYear || "2024";

    if (activeTrendSelection.startsWith("rel_")) {
      if (activeTrendSelection === "rel_rev_gp") {
        const curRev = getValByYearIndex("revenue", 0);
        const prevRev = getValByYearIndex("revenue", 1);
        const curGP = getValByYearIndex("grossProfit", 0);
        const prevGP = getValByYearIndex("grossProfit", 1);

        const curGPM = curRev > 0 ? (curGP / curRev) * 100 : 0;
        const prevGPM = prevRev > 0 ? (prevGP / prevRev) * 100 : 0;
        const gpmDiff = curGPM - prevGPM;

        return `Relationship: Revenue → Gross Profit
Meaning: Production efficiency

• Current GP Margin (FY ${latestYearStr}): ${curGPM.toFixed(1)}%
• Previous GP Margin (FY ${prevYearStr}): ${prevGPM.toFixed(1)}%
• Margin Trend: ${gpmDiff >= 0 ? `Expanded by +${gpmDiff.toFixed(1)} pp` : `Compressed by ${gpmDiff.toFixed(1)} pp`}

Analysis:
${gpmDiff >= 0
            ? `Outstanding production efficiency. Direct production costs (COGS) are growing slower than topline revenue, suggesting enhanced economies of scale, superior supply contract optimization, or pricing power in the ${sector} market.`
            : `Direct margins are tightening. Direct production expenses are outpacing revenue growth, which points to rising raw materials/labour input costs, logistics friction, or pricing pressure which the company has not fully passed on to end customers.`
          }`;
      }

      if (activeTrendSelection === "rel_gp_ebit") {
        const curGP = getValByYearIndex("grossProfit", 0);
        const prevGP = getValByYearIndex("grossProfit", 1);
        const curEbit = getValByYearIndex("ebit", 0);
        const prevEbit = getValByYearIndex("ebit", 1);

        const curOpexRatio = curGP > 0 ? ((curGP - curEbit) / curGP) * 100 : 0;
        const prevOpexRatio = prevGP > 0 ? ((prevGP - prevEbit) / prevGP) * 100 : 0;
        const ratioDiff = curOpexRatio - prevOpexRatio;

        return `Relationship: Gross Profit → EBIT
Meaning: Operating efficiency

• Current OPEX/GP Ratio (FY ${latestYearStr}): ${curOpexRatio.toFixed(1)}%
• Previous OPEX/GP Ratio (FY ${prevYearStr}): ${prevOpexRatio.toFixed(1)}%
• Overhead Absorption: ${ratioDiff <= 0 ? `Improved by ${(Math.abs(ratioDiff)).toFixed(1)} pp` : `Worsened by +${ratioDiff.toFixed(1)} pp`}

Analysis:
${ratioDiff <= 0
            ? `Excellent operating leverage. Overhead costs are well-contained relative to gross income. The company is successfully scaling its sales without proportional increases in corporate overhead or administration expenses.`
            : `Rising administrative overhead is diluting gross margins. Selling, general, and administrative (SG&A) costs are taking up a larger share of gross profit, indicating a need for operational streamlining or cost-containment measures.`
          }`;
      }

      if (activeTrendSelection === "rel_ebit_np") {
        const curEbit = getValByYearIndex("ebit", 0);
        const prevEbit = getValByYearIndex("ebit", 1);
        const curNP = getValByYearIndex("netProfit", 0);
        const prevNP = getValByYearIndex("netProfit", 1);

        const curRetention = curEbit > 0 ? (curNP / curEbit) * 100 : 0;
        const prevRetention = prevEbit > 0 ? (prevNP / prevEbit) * 100 : 0;
        const retDiff = curRetention - prevRetention;

        return `Relationship: EBIT → Net Profit
Meaning: Debt/tax burden

• Current Net Income Retention (FY ${latestYearStr}): ${curRetention.toFixed(1)}%
• Previous Net Income Retention (FY ${prevYearStr}): ${prevRetention.toFixed(1)}%
• Retention Trend: ${retDiff >= 0 ? `Improved by +${retDiff.toFixed(1)} pp` : `Compressed by ${retDiff.toFixed(1)} pp`}

Analysis:
${retDiff >= 0
            ? `Outstanding financial structure management. Less earnings are being drained by interest rates, financing, or non-operating adjustments. This signals a robust, de-leveraged balance sheet with minimal debt-servicing friction.`
            : `Non-operating expenses are taking a larger toll on operating earnings. This indicates increased borrowing costs, higher effective tax rates, or non-operating losses. Reviewing the leverage structure is highly recommended.`
          }`;
      }

      if (activeTrendSelection === "rel_np_ocf") {
        const curNP = getValByYearIndex("netProfit", 0);
        const prevNP = getValByYearIndex("netProfit", 1);
        const curOCF = getValByYearIndex("operatingCashFlow", 0);
        const prevOCF = getValByYearIndex("operatingCashFlow", 1);

        const curRatio = curNP !== 0 ? (curOCF / Math.abs(curNP)) * 100 : 0;
        const prevRatio = prevNP !== 0 ? (prevOCF / Math.abs(prevNP)) * 100 : 0;

        return `Relationship: Net Profit → OCF
Meaning: Earnings quality

• Current OCF/Net Profit Ratio (FY ${latestYearStr}): ${curRatio.toFixed(1)}%
• Previous OCF/Net Profit Ratio (FY ${prevYearStr}): ${prevRatio.toFixed(1)}%

Analysis:
${curOCF > curNP
            ? `Extremely high-quality accounting earnings. Cash flow from operations exceeds accounting net profit, indicating strong cash collections, low receivable lockups, and healthy depreciation buffer. No warning flags of paper-profit inflation.`
            : `Operating cash flow lags accounting net profits. This could point to cash being locked up in rising trade receivables or unsold inventory blocks, signaling a temporary disconnect between accounting revenue and cash collection.`
          }`;
      }

      if (activeTrendSelection === "rel_ocf_fcf") {
        const curOCF = getValByYearIndex("operatingCashFlow", 0);
        const prevOCF = getValByYearIndex("operatingCashFlow", 1);
        const curFCF = getValByYearIndex("freeCashFlow", 0);
        const prevFCF = getValByYearIndex("freeCashFlow", 1);

        const curCapEx = curOCF - curFCF;
        const curReinvestRate = curOCF > 0 ? (curCapEx / curOCF) * 100 : 0;

        return `Relationship: OCF → FCF
Meaning: Reinvestment intensity

• Current CapEx Reinvestment Rate (FY ${latestYearStr}): ${curReinvestRate.toFixed(1)}% of OCF
• Current FCF (FY ${latestYearStr}): RM ${(curFCF / 1000).toFixed(1)}M

Analysis:
${curReinvestRate < 30
            ? `Highly capital-light operations. The company generates massive free cash flow while requiring very low capital reinvestment to sustain itself. Outstanding cash conversion, leaving surplus for dividends, acquisitions, or share buybacks.`
            : `Significant capital reinvestment cycle. A high percentage of operational cash flow is being capitalized into property, plant, equipment or software. This suggests aggressive expansionary maneuvers to seize ${sector} sector tailwinds.`
          }`;
      }
    }

    // Single Metric Commentaries
    const mInfo = METRIC_DICT[activeTrendSelection];
    const curVal = getValByYearIndex(activeTrendSelection, 0);
    const prevVal = getValByYearIndex(activeTrendSelection, 1);
    const growth = prevVal !== 0 ? ((curVal - prevVal) / Math.abs(prevVal)) * 100 : 0;

    return `Metric: ${mInfo.label} Analysis
Detailed vertical trend report tracking ${mInfo.label} across the historical ${fullCompanyHistory.length}-year timeline.

• Current (FY ${latestYearStr}): RM ${(curVal / 1000).toFixed(1)}M
• Previous (FY ${prevYearStr}): RM ${(prevVal / 1000).toFixed(1)}M
• YoY Growth: ${growth >= 0 ? `+${growth.toFixed(1)}% Growth` : `${growth.toFixed(1)}% Contraction`}

Trend Diagnosis:
${growth >= 0
        ? `The metric exhibits a strong upward expansion path. This signals healthy momentum and supports operational scaling. Continued performance of this trend will solidify financial cushion.`
        : `The metric is currently under contraction. This warns of macro headwinds or a temporary consolidation phase. Management should audit related cost buckets or market variables to prevent persistent downward drag.`
      }`;
  }, [fullCompanyHistory, activeTrendSelection, sector]);

  // ── COMPARISON WORKPLACE ──
  const comparisonChartData = useMemo(() => {
    const m = METRIC_DICT[compareMetric];
    return comparePeers.map((name) => {
      const list = companyGroups[name] || [];
      const latest = list[0];
      return {
        name: name.split(" ")[0],
        fullName: name,
        [m.label]: latest ? getReportVal(latest, m.cat, m.field) : 0,
      };
    });
  }, [comparePeers, compareMetric, companyGroups]);

  const bestPerformerIndex = useMemo(() => {
    const m = METRIC_DICT[compareMetric];
    let bestComp = "";
    let maxVal = -Infinity;

    comparePeers.forEach((name) => {
      const list = companyGroups[name] || [];
      const latest = list[0];
      if (latest) {
        const val = getReportVal(latest, m.cat, m.field);
        if (val > maxVal) {
          maxVal = val;
          bestComp = name;
        }
      }
    });

    return { company: bestComp, value: maxVal, metric: m.label };
  }, [comparePeers, compareMetric, companyGroups]);

  if (!selectedCollection || reports.length === 0 || year !== selectedCollection.year || sector.toUpperCase() !== selectedCollection.sector.toUpperCase()) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="font-sans p-6 lg:p-10 bg-hacker-bg space-y-8"
      >
        <header className="mb-10 border-b border-slate-200 dark:border-hacker-border/20 pb-8">
          <div className="flex items-center gap-1.5 mb-2 text-hacker-text-accent">
            <BarChart3 className="w-5 h-5 text-emerald-500" />
            <span className="text-xs font-black tracking-wider uppercase">Financial Comparison Matrix</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-hacker-text-main">Historical Filesystem Archive</h1>
          <p className="text-xs text-hacker-text-muted mt-2 max-w-xl font-medium">
            Please choose a historical cohort from the archive registry below to load it into the Corporate Matrix Workspace.
          </p>
        </header>

        {archive.length === 0 ? (
          <div className="h-[40vh] flex flex-col items-center justify-center text-slate-400 dark:text-hacker-text-submain gap-4">
            <BarChart3 className="w-12 h-12 opacity-25 text-hacker-border-green animate-pulse" />
            <p className="text-xs tracking-wider uppercase font-bold text-slate-400 dark:text-hacker-text-submain opacity-60">Archive Storage empty</p>
            <button
              onClick={() => setView("upload")}
              className="text-xs border border-slate-200 dark:border-hacker-border bg-white dark:bg-hacker-card-bg text-slate-800 dark:text-hacker-text-main shadow-xs rounded-lg px-6 py-2.5 hover:border-hacker-green hover:text-hacker-green hover:shadow-xs transition-all font-bold cursor-pointer"
            >
              → INGEST FIRST DOCUMENT
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {archive.map((yItem, i) => (
              <div key={i} className="space-y-4">
                <h2 className="text-xl font-extrabold text-slate-800 dark:text-hacker-text-main flex items-center gap-2">
                  <span className="text-slate-300 dark:text-hacker-text-submain font-mono text-base">📁</span>
                  FY {yItem.year}
                </h2>
                <div className="space-y-2">
                  {yItem.sectors.map((s: string, j: number) => (
                    <button
                      key={j}
                      onClick={() => handleSelectCollection(yItem.year, s)}
                      className="w-full bg-white dark:bg-hacker-card-bg border border-slate-200 dark:border-hacker-border/30 rounded-xl px-5 py-4 flex items-center justify-between hover:border-hacker-green dark:hover:border-hacker-text-accent hover:bg-slate-50 dark:hover:bg-hacker-card-hover transition-all group text-left cursor-pointer shadow-3xs"
                    >
                      <span className="text-xs font-bold tracking-wide text-slate-700 dark:text-hacker-text-main group-hover:text-hacker-green dark:group-hover:text-hacker-text-accent">{s.replace(/_/g, " ")}</span>
                      <ArrowRight className="w-4 h-4 text-slate-400 dark:text-hacker-text-submain group-hover:text-hacker-green dark:group-hover:text-hacker-text-accent group-hover:translate-x-1 transition-all" />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    );
  }

  return (
    <div className="space-y-8 font-sans p-6 lg:p-10 bg-hacker-bg text-hacker-text-submain">

      {/* Back Button & Cohorts info */}
      <div className="flex items-center justify-between flex-wrap gap-4 pb-2 border-b border-hacker-border/10">
        <button
          onClick={() => setSelectedCollection(null)}
          className="px-4 py-2 text-xs font-black border border-slate-200 dark:border-hacker-border bg-white dark:bg-hacker-card-bg rounded-xl text-slate-700 dark:text-hacker-text-main hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all cursor-pointer flex items-center gap-2 shadow-3xs"
        >
          <span>← Back to Collections</span>
        </button>
        <span className="text-xs font-mono text-hacker-text-muted">
          Cohort: <strong className="text-hacker-text-accent font-black">FY {year} - {sector.replace(/_/g, " ")}</strong>
        </span>
      </div>

      {/* Title Header Section */}
      <header className="border-b border-hacker-border/30 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-[10px] tracking-[0.25em] font-black text-hacker-text-muted uppercase mb-2">
            RAW FINANCE CORE // DATA PLATFORM
          </p>
          <h1 className="text-2xl font-black tracking-tight text-hacker-text-main">
            Corporate Matrix Workplace
          </h1>
        </div>

        {/* Global Company Selector in Header */}
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-[9px] font-black text-hacker-text-muted uppercase tracking-widest">Target Entity:</span>
          <select
            value={activeCompany}
            onChange={(e) => setSelectedCompany(e.target.value)}
            className="bg-white dark:bg-hacker-card-bg border border-hacker-border/40 rounded-xl px-4 py-2 text-xs font-black text-hacker-text-main focus:outline-none focus:border-hacker-green cursor-pointer shadow-3xs"
          >
            {uniqueCompanies.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      </header>

      {/* Primary Sub-Tabs Navigation */}
      <div className="flex border-b border-hacker-border/10 pb-1 overflow-x-auto gap-2">
        {[
          { id: "overview", label: "Overview Metrics", icon: <Layers className="w-4 h-4" /> },
          { id: "trend", label: "Trend Trajectory", icon: <TrendingUp className="w-4 h-4" /> },
          { id: "statements", label: "Financial Statements", icon: <Grid3X3 className="w-4 h-4" /> },
          { id: "comparison", label: "Peer Comparison", icon: <BarChart3 className="w-4 h-4" /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "px-5 py-3 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-2.5 transition-all cursor-pointer border border-transparent",
              activeTab === tab.id
                ? "bg-slate-200 dark:bg-hacker-card-bg text-hacker-text-accent border-hacker-border shadow-3xs"
                : "text-hacker-text-muted hover:text-hacker-text-main hover:bg-slate-100 dark:hover:bg-hacker-universal-bckgrd/40"
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── TAB 1: OVERVIEW METRICS ── */}
      {activeTab === "overview" && overviewStats && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Topline Growth Card */}
            <div className="bg-white dark:bg-hacker-card-bg border border-hacker-border/40 hover:border-hacker-border rounded-xl p-5 shadow-3xs">
              <span className="text-[8px] uppercase tracking-wider font-black text-hacker-text-muted block mb-2">
                TOPLINE PERFORMANCE
              </span>
              <div className="flex items-center gap-2 mb-1">
                <Coins className="w-4 h-4 text-emerald-500" />
                <h3 className="text-sm font-bold text-hacker-text-submain">Revenue</h3>
              </div>
              <p className="text-xl font-black font-mono text-hacker-text-main mt-1">
                RM {(overviewStats.revenue.val / 1000).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M
              </p>
              <div className="flex items-center gap-1.5 mt-3 text-xs">
                {overviewStats.revenue.yoy !== null && (
                  <span
                    className={cn(
                      "font-bold flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px]",
                      overviewStats.revenue.yoy >= 0
                        ? "bg-emerald-500/10 text-emerald-600"
                        : "bg-red-500/10 text-red-600"
                    )}
                  >
                    {overviewStats.revenue.yoy >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                    {overviewStats.revenue.yoy >= 0 ? "+" : ""}
                    {overviewStats.revenue.yoy.toFixed(1)}% YoY
                  </span>
                )}
                {overviewStats.revenue.cagr3 && (
                  <span className="text-[10px] text-hacker-text-muted font-bold">
                    3Y CAGR: {overviewStats.revenue.cagr3.toFixed(1)}%
                  </span>
                )}
              </div>
            </div>

            {/* Profitability Index Card */}
            <div className="bg-white dark:bg-hacker-card-bg border border-hacker-border/40 hover:border-hacker-border rounded-xl p-5 shadow-3xs">
              <span className="text-[8px] uppercase tracking-wider font-black text-hacker-text-muted block mb-2">
                MARGIN MATRIX
              </span>
              <div className="flex items-center gap-2 mb-1">
                <Percent className="w-4 h-4 text-teal-500" />
                <h3 className="text-sm font-bold text-hacker-text-submain">Net Margin</h3>
              </div>
              <p className="text-xl font-black font-mono text-hacker-text-accent mt-1">
                {overviewStats.netMargin.val.toFixed(1)}%
              </p>
              <div className="flex items-center gap-1.5 mt-3 text-xs">
                {overviewStats.netMargin.yoy !== null && (
                  <span
                    className={cn(
                      "font-bold flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px]",
                      overviewStats.netMargin.yoy >= 0
                        ? "bg-emerald-500/10 text-emerald-600"
                        : "bg-red-500/10 text-red-600"
                    )}
                  >
                    {overviewStats.netMargin.yoy >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                    {overviewStats.netMargin.yoy >= 0 ? "+" : ""}
                    {overviewStats.netMargin.yoy.toFixed(1)}% YoY
                  </span>
                )}
                <span className="text-[10px] text-hacker-text-muted font-bold">
                  ROE: {overviewStats.roe.val.toFixed(1)}%
                </span>
              </div>
            </div>

            {/* Cash Flow Health Card */}
            <div className="bg-white dark:bg-hacker-card-bg border border-hacker-border/40 hover:border-hacker-border rounded-xl p-5 shadow-3xs">
              <span className="text-[8px] uppercase tracking-wider font-black text-hacker-text-muted block mb-2">
                LIQUID MATRIX
              </span>
              <div className="flex items-center gap-2 mb-1">
                <Coins className="w-4 h-4 text-emerald-500 animate-pulse" />
                <h3 className="text-sm font-bold text-hacker-text-submain">Free Cash Flow</h3>
              </div>
              <p className="text-xl font-black font-mono text-hacker-text-main mt-1">
                RM {(overviewStats.fcf.val / 1000).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M
              </p>
              <div className="flex items-center gap-1.5 mt-3 text-xs">
                {overviewStats.fcf.yoy !== null && (
                  <span
                    className={cn(
                      "font-bold flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px]",
                      overviewStats.fcf.yoy >= 0
                        ? "bg-emerald-500/10 text-emerald-600"
                        : "bg-red-500/10 text-red-600"
                    )}
                  >
                    {overviewStats.fcf.yoy >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                    {overviewStats.fcf.yoy >= 0 ? "+" : ""}
                    {overviewStats.fcf.yoy.toFixed(1)}% YoY
                  </span>
                )}
                <span className="text-[10px] text-hacker-text-muted font-bold">
                  OCF: RM {(overviewStats.ocf.val / 1000).toFixed(0)}M
                </span>
              </div>
            </div>

            {/* Asset Productivity Card */}
            <div className="bg-white dark:bg-hacker-card-bg border border-hacker-border/40 hover:border-hacker-border rounded-xl p-5 shadow-3xs">
              <span className="text-[8px] uppercase tracking-wider font-black text-hacker-text-muted block mb-2">
                STRENGTH RATIOS
              </span>
              <div className="flex items-center gap-2 mb-1">
                <Scale className="w-4 h-4 text-teal-600" />
                <h3 className="text-sm font-bold text-hacker-text-submain">Equity Ratio</h3>
              </div>
              <p className="text-xl font-black font-mono text-hacker-text-main mt-1">
                {overviewStats.equityRatio.val.toFixed(1)}%
              </p>
              <div className="flex items-center gap-1.5 mt-3 text-xs">
                {overviewStats.equityRatio.yoy !== null && (
                  <span
                    className={cn(
                      "font-bold flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px]",
                      overviewStats.equityRatio.yoy >= 0
                        ? "bg-emerald-500/10 text-emerald-600"
                        : "bg-red-500/10 text-red-600"
                    )}
                  >
                    {overviewStats.equityRatio.yoy >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                    {overviewStats.equityRatio.yoy >= 0 ? "+" : ""}
                    {overviewStats.equityRatio.yoy.toFixed(1)}% YoY
                  </span>
                )}
                <span className="text-[10px] text-hacker-text-muted font-bold">
                  Assets: RM {(overviewStats.assets.val / 1000).toFixed(0)}M
                </span>
              </div>
            </div>
          </div>

          {/* Trend Summary Section */}
          {trendSummary && (
            <div className="bg-slate-50 dark:bg-hacker-card-bg border border-hacker-border rounded-xl p-6 space-y-4 shadow-3xs">
              <h3 className="text-xs font-black uppercase text-hacker-text-muted tracking-widest border-b border-hacker-border pb-2">
                {fullCompanyHistory.length}-Year Trajectory Summaries
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-2">
                <div className="space-y-1 text-left">
                  <p className="text-[9px] uppercase tracking-wider text-hacker-text-muted font-black">
                    🏆 HIGHEST TRAJECTORY GROWTH
                  </p>
                  <p className="text-sm font-black text-hacker-text-main">
                    {trendSummary.highestGrowth.name}
                  </p>
                  <p className="text-[11px] font-mono text-emerald-600 font-bold">
                    +{trendSummary.highestGrowth.rate.toFixed(1)}% total growth
                  </p>
                </div>

                <div className="space-y-1 text-left">
                  <p className="text-[9px] uppercase tracking-wider text-hacker-text-muted font-black">
                    📉 LARGEST DECLINING METRIC
                  </p>
                  <p className="text-sm font-black text-hacker-text-main">
                    {trendSummary.largestDecline.name}
                  </p>
                  <p className="text-[11px] font-mono text-red-600 font-bold">
                    {trendSummary.largestDecline.rate.toFixed(1)}% total contract
                  </p>
                </div>

                <div className="space-y-1 text-left">
                  <p className="text-[9px] uppercase tracking-wider text-hacker-text-muted font-black">
                    🛡️ MOST CONSISTENT ANCHOR
                  </p>
                  <p className="text-sm font-black text-hacker-text-main">
                    {trendSummary.mostConsistent.name}
                  </p>
                  <p className="text-[11px] text-hacker-text-muted italic">
                    Lowest Year-over-Year variance index
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-hacker-border/30">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-hacker-text-muted uppercase tracking-wider font-black">
                    ⭐ BEST HISTORICAL MARGIN
                  </span>
                  {trendSummary.bestMargin && (
                    <span className="font-mono text-xs font-black text-emerald-600">
                      {trendSummary.bestMargin.val.toFixed(1)}% (FY{trendSummary.bestMargin.year})
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-hacker-text-muted uppercase tracking-wider font-black">
                    ⚠️ WORST HISTORICAL MARGIN
                  </span>
                  {trendSummary.worstMargin && (
                    <span className="font-mono text-xs font-black text-red-600">
                      {trendSummary.worstMargin.val.toFixed(1)}% (FY{trendSummary.worstMargin.year})
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: TREND TRAJECTORY ANALYST ── */}
      {activeTab === "trend" && (
        <div className="space-y-6">
          <div className="bg-slate-50 dark:bg-hacker-card-bg border border-hacker-border p-5 rounded-xl space-y-5 shadow-3xs">
            {/* Core Metrics: 9 Boxes */}
            <div className="space-y-2.5">
              <span className="text-[10px] uppercase tracking-wider font-black text-hacker-text-muted block">
                Individual Financial Metrics (9)
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
                {Object.entries(METRIC_DICT).map(([id, item]) => {
                  const isSelected = activeTrendSelection === id;
                  return (
                    <button
                      key={id}
                      onClick={() => setActiveTrendSelection(id)}
                      className={cn(
                        "p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between h-14 select-none",
                        isSelected
                          ? "bg-emerald-500/10 border-emerald-500 shadow-md text-emerald-600 dark:text-emerald-400 font-bold"
                          : "border-slate-200 dark:border-hacker-border bg-white dark:bg-hacker-card-bg text-hacker-text-muted hover:border-slate-300 dark:hover:border-emerald-500/50 hover:text-hacker-text-main"
                      )}
                    >
                      <span className="text-[10px] font-bold line-clamp-1">{item.label}</span>
                      <span className="text-[8px] font-mono opacity-65 lowercase">{item.unit}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Operational Relationships: 5 Boxes */}
            <div className="space-y-2.5 pt-1.5 border-t border-hacker-border/30">
              <span className="text-[10px] uppercase tracking-wider font-black text-hacker-text-muted block">
                Operational Efficiency Flow Relationships (5)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5">
                {[
                  { id: "rel_rev_gp", title: "Revenue → Gross Profit", desc: "Production efficiency" },
                  { id: "rel_gp_ebit", title: "Gross Profit → EBIT", desc: "Operating efficiency" },
                  { id: "rel_ebit_np", title: "EBIT → Net Profit", desc: "Debt/tax burden" },
                  { id: "rel_np_ocf", title: "Net Profit → OCF", desc: "Earnings quality" },
                  { id: "rel_ocf_fcf", title: "OCF → FCF", desc: "Reinvestment intensity" },
                ].map((rel) => {
                  const isSelected = activeTrendSelection === rel.id;
                  return (
                    <button
                      key={rel.id}
                      onClick={() => setActiveTrendSelection(rel.id)}
                      className={cn(
                        "p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between h-14 select-none",
                        isSelected
                          ? "bg-emerald-500/10 border-emerald-500 shadow-md text-emerald-600 dark:text-emerald-400 font-bold"
                          : "border-slate-200 dark:border-hacker-border bg-white dark:bg-hacker-card-bg text-hacker-text-muted hover:border-slate-300 dark:hover:border-emerald-500/50 hover:text-hacker-text-main"
                      )}
                    >
                      <span className="text-[10px] font-black leading-tight">{rel.title}</span>
                      <span className="text-[8px] font-mono opacity-75 mt-1 leading-normal uppercase">{rel.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Side-by-Side View */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Chart Container (7 Columns) */}
            <div className="lg:col-span-7 bg-white dark:bg-hacker-card-bg border border-hacker-border/40 rounded-xl p-6 shadow-3xs">
              <h3 className="text-xs font-black uppercase text-hacker-text-muted tracking-widest mb-4">
                Trajectory Line Analytics // {currentTitle}
              </h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(16, 185, 129, 0.08)" />
                    <XAxis dataKey="year" fontSize={9} tick={{ fill: "var(--color-hacker-text-submain)", fontWeight: 500 }} axisLine={false} tickLine={false} />
                    <YAxis fontSize={9} tick={{ fill: "var(--color-hacker-text-submain)", fontWeight: 500 }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}M` : v} />
                    <Tooltip contentStyle={{ background: "var(--color-hacker-card-bg)", border: "1px solid var(--color-hacker-border)", borderRadius: "8px", color: "var(--color-hacker-text-main)", fontSize: 11 }} />
                    <Legend wrapperStyle={{ fontSize: 9, paddingTop: 10 }} />
                    <Line type="monotone" dataKey={METRIC_DICT[primaryMetric].label} stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    {overlayMetric ? (
                      <Line type="monotone" dataKey={METRIC_DICT[overlayMetric].label} stroke="#3b82f6" strokeWidth={2.5} strokeDasharray="4 4" dot={{ r: 4 }} />
                    ) : null}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Commentary Container (5 Columns) */}
            <div className="lg:col-span-5 bg-slate-50 dark:bg-hacker-card-bg border border-hacker-border p-6 rounded-xl flex flex-col justify-start h-[376px] overflow-y-auto">
              <h4 className="text-[10px] uppercase tracking-wider font-black text-hacker-text-accent flex items-center gap-1.5 border-b border-hacker-border/50 pb-2 mb-3">
                <Sparkles className="w-3.5 h-3.5 text-emerald-500 animate-pulse" /> Trajectory Trends Commentary
              </h4>
              <div className="text-xs text-hacker-text-submain space-y-3 leading-relaxed font-mono whitespace-pre-line">
                {dynamicCommentary}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: FINANCIAL STATEMENTS ── */}
      {activeTab === "statements" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-slate-50 dark:bg-hacker-card-bg border border-hacker-border p-4 rounded-xl shadow-3xs">
            <span className="text-xs font-black uppercase text-hacker-text-muted tracking-wider">
              Matrix Table Options
            </span>
            <div className="flex bg-slate-100 dark:bg-hacker-universal-bckgrd p-1 rounded-lg border border-hacker-border">
              <button
                onClick={() => setStatementDisplayMode("normal")}
                className={cn(
                  "px-3.5 py-1 rounded text-[10px] font-black uppercase tracking-wide cursor-pointer transition-all",
                  statementDisplayMode === "normal"
                    ? "bg-white dark:bg-hacker-card-bg text-hacker-text-accent shadow-3xs"
                    : "text-hacker-text-muted hover:text-hacker-text-main"
                )}
              >
                Normal View
              </button>
              <button
                onClick={() => setStatementDisplayMode("heatmap")}
                className={cn(
                  "px-3.5 py-1 rounded text-[10px] font-black uppercase tracking-wide cursor-pointer transition-all",
                  statementDisplayMode === "heatmap"
                    ? "bg-white dark:bg-hacker-card-bg text-hacker-text-accent shadow-3xs"
                    : "text-hacker-text-muted hover:text-hacker-text-main"
                )}
              >
                Heatmap View
              </button>
            </div>
          </div>

          <div className="overflow-x-auto border border-hacker-border/30 rounded-xl bg-white dark:bg-hacker-card-bg shadow-xs">
            <table className="w-full text-left border-collapse" style={{ minWidth: 800 }}>
              <thead>
                <tr className="bg-slate-50 dark:bg-hacker-universal-bckgrd border-b border-hacker-border/40">
                  <th className="px-6 py-4 text-[9px] font-black tracking-widest text-hacker-text-muted uppercase w-60">
                    Accounts Statement Items (RM Millions)
                  </th>
                  {fullCompanyHistory.map((rep, idx) => (
                    <th
                      key={idx}
                      className="px-6 py-4 text-[10px] font-bold border-l border-hacker-border/10 text-center text-hacker-text-main uppercase tracking-wider"
                    >
                      FY {rep.Metadata?.FinancialYear}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-xs divide-y divide-hacker-border/10 text-hacker-text-submain font-mono">
                {/* Custom statement renderer */}
                {[
                  {
                    section: "INCOME STATEMENT", items: [
                      { id: "revenue", label: "Revenue", cat: "incomeStatement" },
                      { id: "grossProfit", label: "Gross Profit", cat: "incomeStatement" },
                      { id: "ebit", label: "Operating Income (EBIT)", cat: "incomeStatement" },
                      { id: "ebitda", label: "EBITDA", cat: "incomeStatement" },
                      { id: "netProfit", label: "Net Financial Income", cat: "incomeStatement" },
                    ]
                  },
                  {
                    section: "BALANCE SHEET STATEMENT", items: [
                      { id: "cashAndEquivalents", label: "Cash Reserves", cat: "balanceSheet" },
                      { id: "totalAssets", label: "Total Asset Base", cat: "balanceSheet" },
                      { id: "totalLiabilities", label: "Total Liabilities Balance", cat: "balanceSheet" },
                      { id: "totalEquity", label: "Shareholder Reserves", cat: "balanceSheet" },
                    ]
                  },
                  {
                    section: "CASH FLOW STATEMENT", items: [
                      { id: "operatingCashFlow", label: "Operating Cash Flow", cat: "cashFlow" },
                      { id: "freeCashFlow", label: "Free Capital Cash Flow", cat: "cashFlow" },
                    ]
                  },
                  {
                    section: "RETURNS", items: [
                      { id: "roe", label: "ROE", cat: "ratios" },
                      { id: "roa", label: "ROA", cat: "ratios" },
                      { id: "roic", label: "ROIC", cat: "ratios" },
                    ]
                  },
                  {
                    section: "MARGINS", items: [
                      { id: "grossMargin", label: "Gross Margin", cat: "ratios" },
                      { id: "operatingMargin", label: "Operating Margin", cat: "ratios" },
                      { id: "netMargin", label: "Net Margin", cat: "ratios" },
                    ]
                  },
                  {
                    section: "RISK", items: [
                      { id: "currentRatio", label: "Current Ratio", cat: "ratios" },
                      { id: "debtToEquity", label: "debtToEquity", cat: "ratios" },
                      { id: "interestCoverage", label: "interestCoverage", cat: "ratios" },
                    ]
                  },
                ].map((sec, secIdx) => (
                  <React.Fragment key={secIdx}>
                    <tr className="bg-slate-100/40 dark:bg-hacker-universal-bckgrd/20">
                      <td colSpan={fullCompanyHistory.length + 1} className="px-6 py-3 font-bold uppercase tracking-wider text-[10px] text-hacker-text-accent">
                        {sec.section}
                      </td>
                    </tr>

                    {sec.items.map((item, itemIdx) => (
                      <tr key={itemIdx} className="hover:bg-slate-50 dark:hover:bg-hacker-card-hover/20">
                        <td className="px-6 py-3 font-bold text-hacker-text-submain">
                          {item.label}
                        </td>

                        {fullCompanyHistory.map((rep, idx) => {
                          const val = getReportVal(rep, item.cat, item.id);
                          const prevRep = fullCompanyHistory[idx + 1];
                          const prevVal = prevRep ? getReportVal(prevRep, item.cat, item.id) : null;

                          let diffIcon = null;
                          if (prevVal !== null) {
                            if (val > prevVal) diffIcon = <span className="text-emerald-500 font-bold ml-1.5">↑</span>;
                            else if (val < prevVal) diffIcon = <span className="text-red-500 font-bold ml-1.5">↓</span>;
                            else diffIcon = <span className="text-slate-400 font-bold ml-1.5 font-sans">→</span>;
                          }

                          // Heatmap color shading
                          let styleCell = {};
                          if (statementDisplayMode === "heatmap" && val > 0) {
                            const maxInRow = Math.max(...fullCompanyHistory.map((r) => getReportVal(r, item.cat, item.id)));
                            const ratio = maxInRow > 0 ? val / maxInRow : 0;
                            styleCell = {
                              backgroundColor: `rgba(16, 185, 129, ${0.05 + ratio * 0.2})`,
                            };
                          }

                          return (
                            <td
                              key={idx}
                              style={styleCell}
                              className="px-6 py-3 text-center border-l border-hacker-border/10 font-bold text-hacker-text-main"
                            >
                              <span>{(val / 1000).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
                              {diffIcon}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 4: PEER COMPARISON ── */}
      {activeTab === "comparison" && (
        <div className="space-y-6">
          <div className="bg-slate-50 dark:bg-hacker-card-bg border border-hacker-border p-4 rounded-xl space-y-4 shadow-3xs">
            <h3 className="text-xs font-black uppercase text-hacker-text-muted tracking-wider">
              Comparison Peer Filters
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Metric Select */}
              <div className="space-y-1">
                <label className="block text-[8px] uppercase tracking-widest font-black text-hacker-text-muted">
                  Target Comparing Metric
                </label>
                <select
                  value={compareMetric}
                  onChange={(e) => setCompareMetric(e.target.value)}
                  className="bg-white dark:bg-hacker-universal-bckgrd border border-hacker-border rounded px-3 py-2 text-xs font-bold w-full cursor-pointer text-hacker-text-main"
                >
                  {Object.entries(METRIC_DICT).map(([id, item]) => (
                    <option key={id} value={id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Multi Company Checklist */}
              <div className="space-y-1.5">
                <label className="block text-[8px] uppercase tracking-widest font-black text-hacker-text-muted">
                  Comparing Entities
                </label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {uniqueCompanies.map((name) => {
                    const isChecked = comparePeers.includes(name);
                    return (
                      <button
                        key={name}
                        onClick={() => {
                          setComparePeers((prev) => {
                            if (prev.includes(name)) {
                              return prev.filter((p) => p !== name);
                            } else {
                              return [...prev, name];
                            }
                          });
                        }}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wide transition-all border cursor-pointer",
                          isChecked
                            ? "bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-teal-400"
                            : "border-hacker-border bg-white dark:bg-hacker-card-bg text-hacker-text-muted"
                        )}
                      >
                        {name}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart */}
            <div className="bg-white dark:bg-hacker-card-bg border border-hacker-border/40 rounded-xl p-6 shadow-3xs">
              <h3 className="text-xs font-black uppercase text-hacker-text-muted tracking-widest mb-4">
                Peer Metrics Visualizer (MYR '000)
              </h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={comparisonChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(16, 185, 129, 0.08)" />
                    <XAxis dataKey="name" fontSize={9} tick={{ fill: "var(--color-hacker-text-submain)", fontWeight: 500 }} axisLine={false} tickLine={false} />
                    <YAxis fontSize={9} tick={{ fill: "var(--color-hacker-text-submain)", fontWeight: 500 }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}M` : v} />
                    <Tooltip contentStyle={{ background: "var(--color-hacker-card-bg)", border: "1px solid var(--color-hacker-border)", borderRadius: "8px", color: "var(--color-hacker-text-main)", fontSize: 11 }} />
                    <Legend wrapperStyle={{ fontSize: 9, paddingTop: 10 }} />
                    <Bar dataKey={METRIC_DICT[compareMetric].label} fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={30} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* highlights & Performance ranks */}
            <div className="bg-slate-50 dark:bg-hacker-card-bg border border-hacker-border p-6 rounded-xl space-y-4 shadow-3xs flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-black uppercase text-hacker-text-muted tracking-widest border-b border-hacker-border pb-2 mb-3">
                  Sector Benchmarks
                </h3>

                {bestPerformerIndex.company && (
                  <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl space-y-1">
                    <p className="text-[9px] uppercase tracking-widest text-emerald-600 font-black">
                      👑 PEER COHORT LEADER
                    </p>
                    <p className="text-sm font-black text-hacker-text-main uppercase">
                      {bestPerformerIndex.company}
                    </p>
                    <p className="text-xs text-hacker-text-submain font-bold">
                      Leading peer cohort for <strong className="text-emerald-600 font-mono">{bestPerformerIndex.metric}</strong> with a total balance of <strong className="text-emerald-600 font-mono">RM {(bestPerformerIndex.value / 1000).toFixed(0)}M</strong>.
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <h4 className="text-[9px] font-black uppercase text-hacker-text-muted tracking-widest">
                  Entity Rankings
                </h4>
                <div className="divide-y divide-hacker-border/10 text-xs">
                  {[...comparisonChartData]
                    .sort((a, b) => b[METRIC_DICT[compareMetric].label] - a[METRIC_DICT[compareMetric].label])
                    .map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center py-2.5">
                        <span className="font-bold text-hacker-text-submain">
                          #{idx + 1} {item.fullName}
                        </span>
                        <span className="font-mono font-black text-hacker-text-main">
                          RM {(item[METRIC_DICT[compareMetric].label] / 1000).toFixed(0)}M
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
