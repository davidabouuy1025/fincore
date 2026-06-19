import React from "react";
import { FileSearch, Sparkles, Loader2, Eye } from "lucide-react";
import { motion } from "motion/react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { CompanyReport } from "../types";
import { safeNum } from "../constants";
import { ChartBox } from "./ChartBox";
import {
  calculateCore8Metrics,
  calculateSectorMetrics,
  calculateScoring
} from "../fincore_engine";
import { Gauge, ShieldCheck, Award, Zap, AlertTriangle, CheckCircle, TrendingUp, DollarSign } from "lucide-react";
import { SectionRow } from "./SectionRow";
import { DataRow } from "./DataRow";
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
  setView: (view: "upload" | "dashboard" | "archive" | "news" | "fincore") => void;
  setSelectedReport: (report: CompanyReport | null) => void;
  generateAIInsights: () => void;
  isGeneratingAi: boolean;
  aiInsight: string | null;
}

export function DashboardView({
  reports,
  sector,
  year,
  setView,
  setSelectedReport,
  generateAIInsights,
  isGeneratingAi,
  aiInsight,
}: DashboardViewProps) {
  // Chart data
  const revenueData = reports.map((r) => ({
    name: r.Metadata.CompanyName.split(" ")[0].slice(0, 12),
    Revenue: safeNum(r.Financials.incomeStatement?.revenue),
    "Net Profit": safeNum(r.Financials.incomeStatement?.netProfit),
    "Gross Profit": safeNum(r.Financials.incomeStatement?.grossProfit),
  }));

  const balanceData = reports.map((r) => ({
    name: r.Metadata.CompanyName.split(" ")[0].slice(0, 12),
    Assets: safeNum(r.Financials.balanceSheet?.totalAssets),
    Liabilities: safeNum(r.Financials.balanceSheet?.totalLiabilities),
  }));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-10 font-sans"
    >
      {reports.length === 0 ? (
        <div className="h-[60vh] flex flex-col items-center justify-center gap-6 text-slate-400">
          <FileSearch className="w-16 h-16 opacity-25" />
          <p className="text-xs tracking-[0.3em] font-bold uppercase opacity-60">No financial data loaded</p>
          <button
            onClick={() => setView("upload")}
            className="text-xs border border-slate-200 bg-white shadow-xs rounded-lg px-6 py-2.5 hover:border-hacker-green hover:text-hacker-green hover:shadow-sm font-bold transition-all cursor-pointer"
          >
            → Ingest Financial Documents
          </button>
        </div>
      ) : (
        <>
          {/* Header */}
          <header className="border-b border-slate-200 pb-8 flex items-end justify-between">
            <div>
              <p className="text-[10px] tracking-[0.2em] font-extrabold text-slate-400 uppercase mb-2">{sector.replace(/_/g, " ")} // FY{year}</p>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Financial Comparison Matrix</h1>
            </div>
            <div className="flex items-center gap-2">
              {reports.map((r, i) => (
                <div
                  key={i}
                  title={r.Metadata.CompanyName}
                  className="w-9 h-9 bg-teal-50 border border-teal-200 hover:border-hacker-green text-hacker-green flex items-center justify-center text-xs font-bold rounded-lg cursor-pointer hover:bg-hacker-green hover:text-white transition-all shadow-3xs"
                  onClick={() => setSelectedReport(r)}
                >
                  {r.Metadata.CompanyName.charAt(0)}
                </div>
              ))}
            </div>
          </header>

          {/* AI Insights */}
          <section className="bg-gradient-to-br from-emerald-50/70 to-teal-50/20 border border-emerald-100 p-8 rounded-2xl relative overflow-hidden shadow-xs">
            <div className="absolute -top-8 -right-8 opacity-[0.05] text-teal-800">
              <Sparkles className="w-64 h-64" />
            </div>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                <h2 className="text-[10px] tracking-widest font-extrabold text-teal-800 uppercase">AI-Powered Qualitative Analyst</h2>
              </div>
              <button
                onClick={generateAIInsights}
                disabled={isGeneratingAi}
                className="bg-hacker-green text-white shadow-sm px-5 py-2 text-[11px] font-bold flex items-center gap-2 hover:bg-teal-800 rounded-lg transition-all disabled:opacity-45 tracking-wider cursor-pointer"
              >
                {isGeneratingAi ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                {aiInsight ? "REGENERATE ANALYSIS" : "INITIALIZE ANALYSIS"}
              </button>
            </div>
            {aiInsight ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border-l-3 border-emerald-500 pl-5 text-[13px] leading-relaxed text-slate-700 whitespace-pre-wrap">
                <span className="text-emerald-700 font-bold text-xs">[AI Insights] </span>
                {aiInsight}
              </motion.div>
            ) : (
              <p className="text-slate-400 text-xs italic tracking-wide font-medium">
                {isGeneratingAi ? "Synthesizing deep qualitative insights matching bursa standards..." : "Awaiting initialization of financial report comparative model"}
              </p>
            )}
          </section>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {reports.map((r, i) => {
              const rev = safeNum(r.Financials.incomeStatement?.revenue);
              const net = safeNum(r.Financials.incomeStatement?.netProfit);
              const margin = rev > 0 ? ((net / rev) * 100).toFixed(1) : "—";
              
              const scoring = calculateScoring(r, sector);
              const c8 = calculateCore8Metrics(r);

              return (
                <div key={i} className="bg-white border border-slate-200 rounded-xl p-5 hover:border-hacker-green/60 hover:shadow-xs transition-colors cursor-pointer group flex flex-col justify-between" onClick={() => setSelectedReport(r)}>
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center text-xs font-bold text-teal-850 group-hover:bg-hacker-green group-hover:text-white group-hover:border-hacker-green transition-all shadow-3xs">
                        {r.Metadata.CompanyName.charAt(0)}
                      </div>
                      
                      <span className={cn(
                        "text-[9px] font-extrabold px-2 py-0.5 rounded border uppercase tracking-wider",
                        scoring.statusColor === "emerald" && "bg-emerald-50 text-emerald-700 border-emerald-200",
                        scoring.statusColor === "amber" && "bg-amber-50 text-amber-700 border-amber-200",
                        scoring.statusColor === "rose" && "bg-rose-50 text-rose-700 border-rose-200"
                      )}>
                        {scoring.recommendation}
                      </span>
                    </div>

                    <p className="text-xs font-bold text-slate-800 truncate mb-1">{r.Metadata.CompanyName}</p>
                    <p className="text-[10px] text-slate-400 font-semibold mb-3">{r.Metadata.DocType?.replace("_", " ")}</p>
                    
                    <div className="grid grid-cols-2 gap-2 bg-slate-50/50 p-2 rounded-lg border border-slate-100 mb-3 text-center">
                      <div>
                        <p className="text-[8px] text-slate-400 font-extrabold uppercase tracking-wider">Quality Score</p>
                        <p className="text-xs font-black text-slate-800">{scoring.companyQualityScore}<span className="text-[9px] text-slate-400 font-normal">/100</span></p>
                      </div>
                      <div className="border-l border-slate-200">
                        <p className="text-[8px] text-slate-400 font-extrabold uppercase tracking-wider">Invest Rank</p>
                        <p className="text-xs font-black text-teal-700">{scoring.investmentQualityScore}<span className="text-[9px] text-slate-400 font-normal">/100</span></p>
                      </div>
                    </div>

                    <div className="space-y-1 text-[10px] border-t border-slate-100 pt-2">
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-medium">Revenue</span>
                        <span className="font-bold text-slate-700">{rev > 0 ? (rev / 1000).toFixed(0) + "M" : "—"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-medium">Net Margin</span>
                        <span className={cn("font-bold", net < 0 ? "text-rose-600" : "text-emerald-600")}>{margin}{margin !== "—" ? "%" : ""}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-medium">ROIC</span>
                        <span className="font-bold text-slate-700">{c8.roic.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-medium">Altman Z-Score</span>
                        <span className={cn(
                          "font-bold",
                          c8.altmanZScore >= 2.9 ? "text-emerald-600" : c8.altmanZScore >= 1.2 ? "text-amber-600" : "text-rose-600"
                        )}>
                          {c8.altmanZScore.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartBox title="Income Statement Overview (MYR '000)">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={revenueData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" fontSize={9} tick={{ fill: "#64748b", fontWeight: 500 }} axisLine={false} tickLine={false} />
                  <YAxis fontSize={9} tick={{ fill: "#64748b", fontWeight: 500 }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}M` : v} />
                  <Tooltip contentStyle={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "8px", color: "#1e293b", fontSize: 11, boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.05)" }} />
                  <Legend wrapperStyle={{ fontSize: 10, color: "#475569", paddingTop: 10 }} />
                  <Bar dataKey="Revenue" fill="#0f766e" radius={[3, 3, 0, 0]} maxBarSize={30} />
                  <Bar dataKey="Gross Profit" fill="#14b8a6" radius={[3, 3, 0, 0]} maxBarSize={30} />
                  <Bar dataKey="Net Profit" fill="#0f172a" radius={[3, 3, 0, 0]} maxBarSize={30} />
                </BarChart>
              </ResponsiveContainer>
            </ChartBox>

            <ChartBox title="Balance Sheet Breakdown (MYR '000)">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={balanceData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" fontSize={9} tick={{ fill: "#64748b", fontWeight: 500 }} axisLine={false} tickLine={false} />
                  <YAxis fontSize={9} tick={{ fill: "#64748b", fontWeight: 500 }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}M` : v} />
                  <Tooltip contentStyle={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "8px", color: "#1e293b", fontSize: 11, boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.05)" }} />
                  <Legend wrapperStyle={{ fontSize: 10, color: "#475569", paddingTop: 10 }} />
                  <Bar dataKey="Assets" fill="#0f766e" radius={[3, 3, 0, 0]} maxBarSize={30} />
                  <Bar dataKey="Liabilities" fill="#f43f5e" radius={[3, 3, 0, 0]} maxBarSize={30} />
                </BarChart>
              </ResponsiveContainer>
            </ChartBox>
          </div>
          {/* Transition banner to dedicated FinCore Engine */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-left">
              <div className="flex items-center gap-1.5 text-teal-800">
                <ShieldCheck className="w-4 h-4 text-teal-800" />
                <span className="text-[10px] font-extrabold uppercase tracking-wide">FinCore™ Engine Portal</span>
              </div>
              <h3 className="text-xs font-black text-slate-800 font-sans">The Core 8 & Sector Intelligence system has been upgraded to a dedicated page view!</h3>
              <p className="text-[11px] text-slate-500 max-w-xl leading-relaxed">
                Unlock full-fidelity multi-peer comparisons, interactive scoring dials, detail metric explainer deepdives, and specific industrial benchmarks by selecting the dedicated <strong className="text-teal-850">FINCORE</strong> terminal in your sidebar.
              </p>
            </div>
            <button 
              onClick={() => setView("fincore")}
              className="bg-teal-800 hover:bg-teal-900 border border-teal-850 px-4 py-2 text-white font-bold text-[10px] uppercase tracking-wide rounded-lg cursor-pointer shrink-0 shadow-3xs transition-all"
            >
              Launch Dedicated Terminal →
            </button>
          </div>

          {/* Data Matrix Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-xs">
            <table className="w-full text-left border-collapse" style={{ minWidth: Math.max(600, reports.length * 200) }}>
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-[10px] font-extrabold tracking-wider text-slate-500 uppercase w-48 font-sans">Indicators</th>
                  {reports.map((r, i) => (
                    <th key={i} className="px-6 py-4 text-[10px] font-bold border-l border-slate-100 text-center text-slate-700 font-sans">
                      <div className="flex flex-col items-center gap-1.5">
                        <span className="truncate max-w-[160px] block font-bold text-slate-800">{r.Metadata.CompanyName}</span>
                        <button
                          onClick={() => setSelectedReport(r)}
                          className="text-[9px] border border-slate-200 leading-tight rounded bg-white px-2 py-1 text-slate-600 font-bold hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer shadow-3xs"
                        >
                          View PDF Report
                        </button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-xs divide-y divide-slate-100 text-slate-700">
                <SectionRow label="INCOME STATEMENT" colSpan={reports.length + 1} />
                <DataRow label="Revenue (RM '000)" id="revenue" cat="incomeStatement" reports={reports} />
                <DataRow label="Operating Expenses (RM '000)" id="operatingExpenses" cat="incomeStatement" reports={reports} />
                <DataRow label="Operating Profit (RM '000)" id="operatingProfit" cat="incomeStatement" reports={reports} />
                <tr>
                  <td colSpan={reports.length + 1} className="py-2 bg-slate-50/30">
                    <div className="h-[1px] bg-slate-100 w-full"></div>
                  </td>
                </tr>

                <DataRow label="EBIT" id="ebit" cat="incomeStatement" reports={reports} tooltip="Earning Before Interest & Taxes"/>
                <DataRow label="EBITDA" id="ebitda" cat="incomeStatement" reports={reports} tooltip="Earning Before Interest, Taxes, Depreciation & Amortilization"/>
                <DataRow label="Gross Profit" id="grossProfit" cat="incomeStatement" reports={reports} tooltip="Revenue - Cost of Goods Sold (COGS)"/>
                <DataRow label="Tax Expense" id="taxExpense" cat="incomeStatement" reports={reports} />
                <DataRow label="Net Profit" id="netProfit" cat="incomeStatement" reports={reports} tooltip="EBIT - COGS"/>
                <tr>
                  <td colSpan={reports.length + 1} className="py-2 bg-slate-50/30">
                    <div className="h-[1px] bg-slate-100 w-full"></div>
                  </td>
                </tr>

                <SectionRow label="ASSETS" colSpan={reports.length + 1} />
                <DataRow label="Non-Current Assets" id="currentAssets" cat="balanceSheet" reports={reports} />
                <DataRow label="PPE" id="ppe" cat="balanceSheet" reports={reports} tooltip="Property, Plant, Equipment"/>
                <DataRow label="Intangible Assets" id="intangibleAssets" cat="balanceSheet" reports={reports} tooltip="Valued assets but not physical"/>
                <tr>
                  <td colSpan={reports.length + 1} className="py-2 bg-slate-50/30">
                    <div className="h-[1px] bg-slate-100 w-full"></div>
                  </td>
                </tr>
                <DataRow label="Current Assets" id="currentAssets" cat="balanceSheet" reports={reports} />
                <tr>
                  <td colSpan={reports.length + 1} className="py-2 bg-slate-50/30">
                    <div className="h-[1px] bg-slate-100 w-full"></div>
                  </td>
                </tr>
                <DataRow label="Total Assets" id="totalAssets" cat="balanceSheet" reports={reports} />

                <SectionRow label="LIABILITY" colSpan={reports.length + 1} />
                <DataRow label="Total Liabilities" id="totalLiabilities" cat="balanceSheet" reports={reports} />
                
                <DataRow label="Cash & Equivalents" id="cashAndEquivalents" cat="balanceSheet" reports={reports} />
                <DataRow label="Total Equity" id="totalEquity" cat="balanceSheet" reports={reports} />
                <tr>
                  <td colSpan={reports.length + 1} className="py-2 bg-slate-50/30">
                    <div className="h-[1px] bg-slate-100 w-full"></div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}
    </motion.div>
  );
}
