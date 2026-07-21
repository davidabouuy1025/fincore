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
  setView: (view: "upload" | "dashboard" | "archive") => void;
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
        <div className="h-[60vh] flex flex-col items-center justify-center gap-6 text-slate-400 dark:text-hacker-text-submain">
          <FileSearch className="w-16 h-16 opacity-25" />
          <p className="text-xs tracking-[0.3em] font-bold uppercase opacity-60">No financial data loaded</p>
          <button
            onClick={() => setView("upload")}
            className="text-xs border border-slate-200 dark:border-hacker-border-green bg-white dark:bg-hacker-universal-bckgrd shadow-xs rounded-lg px-6 py-2.5 hover:border-hacker-green hover:text-hacker-green hover:shadow-sm font-bold transition-all cursor-pointer"
          >
            → Ingest Financial Documents
          </button>
        </div>
      ) : (
        <>
          {/* Header */}
          <header className="border-b border-slate-200 dark:border-hacker-border-green pb-8 flex items-end justify-between">
            <div>
              <p className="text-[10px] tracking-[0.2em] font-extrabold text-slate-400 dark:text-hacker-text-submain uppercase mb-2">{sector.replace(/_/g, " ")} // FY{year}</p>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-hacker-text-main">Financial Comparison Matrix</h1>
            </div>
            <div className="flex items-center gap-2">
              {reports.map((r, i) => (
                <div
                  key={i}
                  title={r.Metadata.CompanyName}
                  className="w-9 h-9 bg-teal-50 dark:bg-hacker-universal-bckgrd border border-teal-200 dark:border-hacker-border-green hover:border-hacker-green text-hacker-green flex items-center justify-center text-xs font-bold rounded-lg cursor-pointer hover:bg-hacker-green hover:text-white transition-all shadow-3xs"
                  onClick={() => setSelectedReport(r)}
                >
                  {r.Metadata.CompanyName.charAt(0)}
                </div>
              ))}
            </div>
          </header>

          {/* AI Insights */}
          <section className="bg-gradient-to-br from-emerald-50/70 to-teal-50/20 dark:from-hacker-text-accent/10 dark:to-transparent border border-emerald-100 dark:border-hacker-border-green p-8 rounded-2xl relative overflow-hidden shadow-xs">
            <div className="absolute -top-8 -right-8 opacity-[0.05] text-teal-800 dark:text-hacker-text-accent">
              <Sparkles className="w-64 h-64" />
            </div>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-emerald-600 dark:bg-hacker-text-accent animate-pulse" />
                <h2 className="text-[10px] tracking-widest font-extrabold text-teal-800 dark:text-hacker-text-accent uppercase">AI-Powered Qualitative Analyst</h2>
              </div>
              <button
                onClick={generateAIInsights}
                disabled={isGeneratingAi}
                className="bg-hacker-green text-white shadow-sm px-5 py-2 text-[11px] font-bold flex items-center gap-2 hover:bg-teal-800 dark:hover:opacity-90 rounded-lg transition-all disabled:opacity-45 tracking-wider cursor-pointer"
              >
                {isGeneratingAi ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                {aiInsight ? "REGENERATE ANALYSIS" : "INITIALIZE ANALYSIS"}
              </button>
            </div>
            {aiInsight ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border-l-3 border-emerald-500 dark:border-hacker-text-accent pl-5 text-[13px] leading-relaxed text-slate-700 dark:text-hacker-text-main whitespace-pre-wrap">
                <span className="text-emerald-700 dark:text-hacker-text-accent font-bold text-xs">[AI Insights] </span>
                {aiInsight}
              </motion.div>
            ) : (
              <p className="text-slate-400 dark:text-hacker-text-submain text-xs italic tracking-wide font-medium">
                {isGeneratingAi ? "Synthesizing deep qualitative insights matching bursa standards..." : "Awaiting initialization of financial report comparative model"}
              </p>
            )}
          </section>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {reports.map((r, i) => {
              const rev = safeNum(r.Financials.incomeStatement?.revenue);
              const net = safeNum(r.Financials.incomeStatement?.netProfit);
              const margin = rev > 0 ? ((net / rev) * 100).toFixed(1) : "—";
              return (
                <div key={i} className="bg-white dark:bg-hacker-card-bg border border-slate-200 dark:border-hacker-border rounded-xl p-5 hover:border-hacker-green/60 hover:shadow-xs dark:hover:bg-hacker-card-hover transition-colors cursor-pointer group" onClick={() => setSelectedReport(r)}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-hacker-universal-bckgrd border border-teal-100 dark:border-hacker-border-green flex items-center justify-center text-xs font-bold text-teal-850 dark:text-hacker-text-accent group-hover:bg-hacker-green group-hover:text-white group-hover:border-hacker-green transition-all shadow-3xs">
                      {r.Metadata.CompanyName.charAt(0)}
                    </div>
                    <Eye className="w-4 h-4 text-slate-400 dark:text-hacker-text-submain opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-xs font-bold text-slate-800 dark:text-hacker-text-main truncate mb-1">{r.Metadata.CompanyName}</p>
                  <p className="text-[10px] text-slate-400 dark:text-hacker-text-submain font-semibold mb-3">{r.Metadata.DocType?.replace("_", " ") || "DOCUMENT"}</p>
                  <div className="space-y-1 text-[10px]">
                    <div className="flex justify-between">
                      <span className="text-slate-400 dark:text-hacker-text-submain font-medium">Revenue</span>
                      <span className="font-bold text-slate-700 dark:text-hacker-text-main">{rev > 0 ? (rev / 1000).toFixed(0) + "M" : "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 dark:text-hacker-text-submain font-medium">Net Margin</span>
                      <span className={cn("font-bold", net < 0 ? "text-rose-600 dark:text-red-400" : "text-emerald-600 dark:text-hacker-text-accent")}>{margin}{margin !== "—" ? "%" : ""}</span>
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
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-hacker-border)" />
                  <XAxis dataKey="name" fontSize={9} tick={{ fill: "var(--color-hacker-text-submain)", fontWeight: 500 }} axisLine={false} tickLine={false} />
                  <YAxis fontSize={9} tick={{ fill: "var(--color-hacker-text-submain)", fontWeight: 500 }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}M` : v} />
                  <Tooltip contentStyle={{ background: "var(--color-hacker-card-bg)", border: "1px solid var(--color-hacker-border)", borderRadius: "8px", color: "var(--color-hacker-text-main)", fontSize: 11, boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.05)" }} />
                  <Legend wrapperStyle={{ fontSize: 10, color: "var(--color-hacker-text-submain)", paddingTop: 10 }} />
                  <Bar dataKey="Revenue" fill="#0f766e" radius={[3, 3, 0, 0]} maxBarSize={30} />
                  <Bar dataKey="Gross Profit" fill="#14b8a6" radius={[3, 3, 0, 0]} maxBarSize={30} />
                  <Bar dataKey="Net Profit" fill="var(--color-hacker-text-accent)" radius={[3, 3, 0, 0]} maxBarSize={30} />
                </BarChart>
              </ResponsiveContainer>
            </ChartBox>

            <ChartBox title="Balance Sheet Breakdown (MYR '000)">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={balanceData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-hacker-border)" />
                  <XAxis dataKey="name" fontSize={9} tick={{ fill: "var(--color-hacker-text-submain)", fontWeight: 500 }} axisLine={false} tickLine={false} />
                  <YAxis fontSize={9} tick={{ fill: "var(--color-hacker-text-submain)", fontWeight: 500 }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}M` : v} />
                  <Tooltip contentStyle={{ background: "var(--color-hacker-card-bg)", border: "1px solid var(--color-hacker-border)", borderRadius: "8px", color: "var(--color-hacker-text-main)", fontSize: 11, boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.05)" }} />
                  <Legend wrapperStyle={{ fontSize: 10, color: "var(--color-hacker-text-submain)", paddingTop: 10 }} />
                  <Bar dataKey="Assets" fill="#0f766e" radius={[3, 3, 0, 0]} maxBarSize={30} />
                  <Bar dataKey="Liabilities" fill="#f43f5e" radius={[3, 3, 0, 0]} maxBarSize={30} />
                </BarChart>
              </ResponsiveContainer>
            </ChartBox>
          </div>

          {/* Data Matrix Table */}
          <div className="overflow-x-auto border border-slate-200 dark:border-hacker-border rounded-xl bg-white dark:bg-hacker-card-bg shadow-xs">
            <table className="w-full text-left border-collapse" style={{ minWidth: Math.max(600, reports.length * 200) }}>
              <thead>
                <tr className="bg-slate-50 dark:bg-hacker-card-hover border-b border-slate-200 dark:border-hacker-border">
                  <th className="px-6 py-4 text-[10px] font-extrabold tracking-wider text-slate-500 dark:text-hacker-text-submain uppercase w-48 font-sans">Indicators</th>
                  {reports.map((r, i) => (
                    <th key={i} className="px-6 py-4 text-[10px] font-bold border-l border-slate-100 dark:border-hacker-border text-center text-slate-700 dark:text-hacker-text-main font-sans">
                      <div className="flex flex-col items-center gap-1.5">
                        <span className="truncate max-w-[160px] block font-bold text-slate-800 dark:text-hacker-text-main">{r.Metadata.CompanyName}</span>
                        <button
                          onClick={() => setSelectedReport(r)}
                          className="text-[9px] border border-slate-200 dark:border-hacker-border leading-tight rounded bg-white dark:bg-hacker-universal-bckgrd px-2 py-1 text-slate-600 dark:text-hacker-text-submain font-bold hover:bg-slate-50 dark:hover:bg-hacker-card-hover hover:border-slate-300 dark:hover:border-hacker-border-green transition-all cursor-pointer shadow-3xs"
                        >
                          View PDF Report
                        </button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-xs divide-y divide-slate-100 dark:divide-hacker-border text-slate-700 dark:text-hacker-text-main">
                <SectionRow label="INCOME STATEMENT" colSpan={reports.length + 1} />
                <DataRow label="Revenue (RM '000)" id="revenue" cat="incomeStatement" reports={reports} />
                <DataRow label="Operating Expenses (RM '000)" id="operatingExpenses" cat="incomeStatement" reports={reports} />
                <DataRow label="Operating Profit (RM '000)" id="operatingProfit" cat="incomeStatement" reports={reports} />
                <tr>
                  <td colSpan={reports.length + 1} className="py-2 bg-slate-50/30 dark:bg-hacker-card-hover/30">
                    <div className="h-[1px] bg-slate-100 dark:bg-hacker-border w-full"></div>
                  </td>
                </tr>

                <DataRow label="EBIT" id="ebit" cat="incomeStatement" reports={reports} tooltip="Earning Before Interest & Taxes"/>
                <DataRow label="EBITDA" id="ebitda" cat="incomeStatement" reports={reports} tooltip="Earning Before Interest, Taxes, Depreciation & Amortilization"/>
                <DataRow label="Gross Profit" id="grossProfit" cat="incomeStatement" reports={reports} tooltip="Revenue - Cost of Goods Sold (COGS)"/>
                <DataRow label="Tax Expense" id="taxExpense" cat="incomeStatement" reports={reports} />
                <DataRow label="Net Profit" id="netProfit" cat="incomeStatement" reports={reports} tooltip="EBIT - COGS"/>
                <tr>
                  <td colSpan={reports.length + 1} className="py-2 bg-slate-50/30 dark:bg-hacker-card-hover/30">
                    <div className="h-[1px] bg-slate-100 dark:bg-hacker-border w-full"></div>
                  </td>
                </tr>

                <SectionRow label="ASSETS" colSpan={reports.length + 1} />
                <DataRow label="Non-Current Assets" id="currentAssets" cat="balanceSheet" reports={reports} />
                <DataRow label="PPE" id="ppe" cat="balanceSheet" reports={reports} tooltip="Property, Plant, Equipment"/>
                <DataRow label="Intangible Assets" id="intangibleAssets" cat="balanceSheet" reports={reports} tooltip="Valued assets but not physical"/>
                <tr>
                  <td colSpan={reports.length + 1} className="py-2 bg-slate-50/30 dark:bg-hacker-card-hover/30">
                    <div className="h-[1px] bg-slate-100 dark:bg-hacker-border w-full"></div>
                  </td>
                </tr>
                <DataRow label="Current Assets" id="currentAssets" cat="balanceSheet" reports={reports} />
                <tr>
                  <td colSpan={reports.length + 1} className="py-2 bg-slate-50/30 dark:bg-hacker-card-hover/30">
                    <div className="h-[1px] bg-slate-100 dark:bg-hacker-border w-full"></div>
                  </td>
                </tr>
                <DataRow label="Total Assets" id="totalAssets" cat="balanceSheet" reports={reports} />

                <SectionRow label="LIABILITY" colSpan={reports.length + 1} />
                <DataRow label="Total Liabilities" id="totalLiabilities" cat="balanceSheet" reports={reports} />

                <DataRow label="Cash & Equivalents" id="cashAndEquivalents" cat="balanceSheet" reports={reports} />
                <DataRow label="Total Equity" id="totalEquity" cat="balanceSheet" reports={reports} />
                <tr>
                  <td colSpan={reports.length + 1} className="py-2 bg-slate-50/30 dark:bg-hacker-card-hover/30">
                    <div className="h-[1px] bg-slate-100 dark:bg-hacker-border w-full"></div>
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