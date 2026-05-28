import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Upload,
  BarChart3,
  History,
  AlertTriangle,
  ChevronRight,
  Loader2,
  FileText,
  Plus,
  Sparkles,
  X,
  TrendingUp,
  Database,
  CheckCircle2,
  FileSearch,
  Eye,
  Edit3,
  Save,
  ChevronDown,
  ChevronUp,
  Trash2,
  RefreshCw,
  FileCheck,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
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
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

interface ExtractedField {
  value: string | null;
  confidence: string;
}

interface ParsedDocument {
  fileId: string;
  originalFileName: string;
  storedFileName: string;
  docType: string;
  suggestedCompanyName: string;
  suggestedSector: string;
  extractedData: Record<string, Record<string, ExtractedField>>;
  rawTextLength: number;
  // User-editable fields
  companyName: string;
  isExpanded: boolean;
}

interface Metadata {
  CompanyName: string;
  FinancialYear: string;
  Sector: string;
  Currency: string;
  OriginalFileName?: string;
  StoredFileName?: string;
  DocType?: string;
}

interface Financials {
  incomeStatement: Record<string, string | number | null>;
  balanceSheet: Record<string, string | number | null>;
  cashFlow: Record<string, string | number | null>;
  ratios?: Record<string, string | number | null>;
  growth?: Record<string, string | number | null>;
  advanced?: Record<string, string | number | null>;
}

interface CompanyReport {
  Metadata: Metadata;
  Financials: Financials;
}

// ══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════════════════════════════════════════

const BURSA_SECTORS = [
  "TECHNOLOGY",
  "PLANTATION",
  "FINANCIAL_SERVICES",
  "CONSUMER_PRODUCTS",
  "INDUSTRIAL_PRODUCTS",
  "REITS",
  "ENERGY",
  "HEALTHCARE",
  "CONSTRUCTION",
];

const FIELD_LABELS: Record<string, string> = {
  // Income Statement
  revenue: "Revenue",
  nonOperatingRevenue: "Non-Operating Revenue",
  costOfGoodsSold: "Cost of Goods Sold (COGS)",
  grossProfit: "Gross Profit",
  operatingExpenses: "Operating Expenses (OPEX)",
  sgaExpenses: "SG&A Expenses",
  researchDevelopment: "R&D Expenses",
  depreciation: "Depreciation",
  amortization: "Amortization",
  ebit: "EBIT",
  ebitda: "EBITDA",
  operatingProfit: "Operating Profit",
  profitBeforeTax: "Profit Before Tax",
  taxExpense: "Tax Expense",
  effectiveTaxRate: "Effective Tax Rate",
  netProfit: "Net Profit / PAT",
  retainedEarnings: "Retained Earnings",

  // Balance Sheet
  totalAssets: "Total Assets",
  currentAssets: "Current Assets",
  nonCurrentAssets: "Non-Current Assets",
  cashAndEquivalents: "Cash & Equivalents",
  accountsReceivable: "Accounts Receivable",
  inventory: "Inventory",
  shortTermInvestments: "Short-Term Investments",
  ppe: "Property, Plant & Equipment",
  intangibleAssets: "Intangible Assets",
  goodwill: "Goodwill",
  totalLiabilities: "Total Liabilities",
  currentLiabilities: "Current Liabilities",
  accountsPayable: "Accounts Payable",
  shortTermDebt: "Short-Term Debt",
  nonCurrentLiabilities: "Non-Current Liabilities",
  longTermDebt: "Long-Term Debt",
  bondsPayable: "Bonds Payable",
  totalEquity: "Total Equity",
  commonStock: "Common Stock",
  preferredStock: "Preferred Stock",
  paidInCapital: "Paid-in Capital",

  // Cash Flow
  operatingCashFlow: "Operating Cash Flow",
  investingCashFlow: "Investing Cash Flow",
  financingCashFlow: "Financing Cash Flow",
  freeCashFlow: "Free Cash Flow",
  capitalExpenditure: "Capital Expenditure",
  // Ratios
  roe: "Return on Equity (ROE)",
  roa: "Return on Assets (ROA)",
  roic: "Return on Invested Capital",
  grossMargin: "Gross Margin",
  operatingMargin: "Operating Margin",
  netProfitMargin: "Net Profit Margin",
  currentRatio: "Current Ratio",
  quickRatio: "Quick Ratio",
  cashRatio: "Cash Ratio",
  debtToEquity: "Debt to Equity",
  debtRatio: "Debt Ratio",
  interestCoverage: "Interest Coverage",
  assetTurnover: "Asset Turnover",
  inventoryTurnover: "Inventory Turnover",
  receivablesTurnover: "Receivables Turnover",
  payablesTurnover: "Payables Turnover",
  eps: "Earnings Per Share (EPS)",
  dilutedEps: "Diluted EPS",
  peRatio: "P/E Ratio",
  dividendYield: "Dividend Yield",
  dividendPerShare: "Dividend Per Share",
  dividendPayoutRatio: "Payout Ratio",
  retentionRatio: "Retention Ratio",
  // Growth
  revenueGrowth: "Revenue Growth",
  netIncomeGrowth: "Net Income Growth",
  cagr: "CAGR",
  // Advanced
  enterpriseValue: "Enterprise Value",
  evEbitda: "EV/EBITDA",
  fcfYield: "FCF Yield",
  eva: "Economic Value Added",
  workingCapital: "Working Capital",
  netWorkingCapital: "Net Working Capital",
};

const CATEGORY_LABELS: Record<string, string> = {
  incomeStatement: "📊 Income Statement",
  balanceSheet: "🏦 Balance Sheet",
  cashFlow: "💵 Cash Flow",
  ratios: "📈 Ratios & Metrics",
  growth: "📉 Growth Metrics",
  advanced: "🧠 Advanced Metrics",
};

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

function safeNum(val: string | number | null | undefined): number {
  if (val === null || val === undefined) return 0;
  const n = parseFloat(String(val).replace(/,/g, ""));
  return isNaN(n) ? 0 : n;
}

function formatNum(val: string | number | null | undefined): string {
  const n = safeNum(val);
  if (n === 0) return "—";
  return n.toLocaleString("en-MY", { maximumFractionDigits: 0 });
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN APP
// ══════════════════════════════════════════════════════════════════════════════

export default function App() {
  const [reports, setReports] = useState<CompanyReport[]>([]);
  const [year, setYear] = useState("2025");
  const [sector, setSector] = useState("TECHNOLOGY");
  const [view, setView] = useState<"upload" | "dashboard" | "archive">("upload");
  const [archive, setArchive] = useState<{ year: string; sectors: string[] }[]>([]);
  const [selectedReport, setSelectedReport] = useState<CompanyReport | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // Upload workflow state
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [parsedDocuments, setParsedDocuments] = useState<ParsedDocument[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadStep, setUploadStep] = useState<"select" | "review">("select");

  // AI insights
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  // Edit mode for dashboard
  const [editingReport, setEditingReport] = useState<CompanyReport | null>(null);

  const fetchArchive = useCallback(async () => {
    try {
      const res = await fetch("/api/archive");
      const data = await res.json();
      setArchive(data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchArchive();
  }, [fetchArchive]);

  // Paste handler
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (view !== "upload" || uploadStep !== "select") return;
      const items = e.clipboardData?.items;
      if (!items) return;
      const files: File[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith("image/") || item.type === "application/pdf") {
          const blob = item.getAsFile();
          if (blob) {
            const ext = item.type.split("/")[1] || "png";
            files.push(new File([blob], `pasted-${Date.now()}.${ext}`, { type: item.type }));
          }
        }
      }
      if (files.length > 0) setPendingFiles((prev) => [...prev, ...files]);
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [view, uploadStep]);

  const loadReports = async (y: string, s: string) => {
    try {
      setAiInsight(null);
      const res = await fetch(`/api/reports/${y}/${s}`);
      const data = await res.json();
      const arr = Array.isArray(data) ? data : [data];
      setReports(arr.filter(Boolean));
      setYear(y);
      setSector(s);
      setView("dashboard");
    } catch (err) {
      console.error(err);
    }
  };

  const generateAIInsights = async () => {
    if (reports.length === 0) return;
    setIsGeneratingAi(true);
    try {
      const res = await fetch("/api/ai-insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reports, sector, year }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setAiInsight(data.text);
    } catch (err: any) {
      setAiInsight(`[ERROR]: ${err.message}`);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setPendingFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
      e.target.value = "";
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files).filter(
      (f) => f.type === "application/pdf" || f.type.startsWith("image/")
    );
    if (files.length > 0) setPendingFiles((prev) => [...prev, ...files]);
  };

  const handleParse = async () => {
    if (pendingFiles.length === 0) return;
    setIsParsing(true);

    const formData = new FormData();
    pendingFiles.forEach((f) => formData.append("reports", f));

    try {
      const res = await fetch("/api/parse", { method: "POST", body: formData });
      const data = await res.json();
      if (data.success) {
        const docs: ParsedDocument[] = data.parsed.map((p: any) => ({
          ...p,
          companyName: p.suggestedCompanyName,
          isExpanded: true,
        }));
        setParsedDocuments(docs);
        setPendingFiles([]);
        setUploadStep("review");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsParsing(false);
    }
  };

  const handleSaveAll = async () => {
    if (parsedDocuments.length === 0) return;
    setIsSaving(true);

    const reportsToSave = parsedDocuments.map((doc) => {
      const financials: Record<string, Record<string, string | null>> = {};
      for (const [category, fields] of Object.entries(doc.extractedData)) {
        financials[category] = {};
        for (const [fieldId, field] of Object.entries(fields)) {
          financials[category][fieldId] = field.value;
        }
      }
      return {
        companyName: doc.companyName,
        financials,
        storedFileName: doc.storedFileName,
        originalFileName: doc.originalFileName,
        docType: doc.docType,
      };
    });

    try {
      const res = await fetch("/api/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reports: reportsToSave, year, sector }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchArchive();
        setParsedDocuments([]);
        setUploadStep("select");
        await loadReports(year, sector);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const updateDocumentField = (docIndex: number, category: string, fieldId: string, value: string) => {
    setParsedDocuments((prev) =>
      prev.map((doc, i) => {
        if (i !== docIndex) return doc;
        return {
          ...doc,
          extractedData: {
            ...doc.extractedData,
            [category]: {
              ...doc.extractedData[category],
              [fieldId]: {
                ...doc.extractedData[category][fieldId],
                value: value || null,
              },
            },
          },
        };
      })
    );
  };

  const updateDocumentName = (docIndex: number, name: string) => {
    setParsedDocuments((prev) =>
      prev.map((doc, i) => (i === docIndex ? { ...doc, companyName: name } : doc))
    );
  };

  const toggleDocumentExpanded = (docIndex: number) => {
    setParsedDocuments((prev) =>
      prev.map((doc, i) => (i === docIndex ? { ...doc, isExpanded: !doc.isExpanded } : doc))
    );
  };

  const removeDocument = (docIndex: number) => {
    setParsedDocuments((prev) => prev.filter((_, i) => i !== docIndex));
  };

  const addMoreDocuments = () => {
    setUploadStep("select");
  };

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
    <div className="min-h-screen bg-hacker-bg text-hacker-green font-mono crt-flicker overflow-x-hidden">
      <div className="scanline" />

      {/* Grid background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 opacity-[0.07] bg-[linear-gradient(to_right,#00ff41_1px,transparent_1px),linear-gradient(to_bottom,#00ff41_1px,transparent_1px)] bg-[size:48px_48px]" />
      </div>

      {/* Sidebar */}
      <nav className="fixed left-0 top-0 bottom-0 w-[72px] bg-black/90 border-r border-hacker-border flex flex-col items-center py-8 gap-8 z-50">
        <div className="flex flex-col items-center mb-4">
          <div className="w-10 h-10 border border-hacker-green flex items-center justify-center shadow-[0_0_20px_rgba(0,255,65,0.3)] bg-black">
            <TrendingUp className="w-5 h-5 text-hacker-green" />
          </div>
          <span className="text-[8px] font-bold tracking-[0.3em] mt-2 text-hacker-green-dim">FIN</span>
        </div>
        <NavBtn icon={<Plus />} label="INGEST" active={view === "upload"} onClick={() => { setView("upload"); setUploadStep("select"); setParsedDocuments([]); }} />
        <NavBtn icon={<BarChart3 />} label="MATRIX" active={view === "dashboard"} onClick={() => setView("dashboard")} />
        <NavBtn icon={<History />} label="ARCHIVE" active={view === "archive"} onClick={() => setView("archive")} />

        <div className="mt-auto flex flex-col items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-hacker-green animate-pulse" />
          <span className="text-[8px] text-hacker-green-dim tracking-widest">LIVE</span>
        </div>
      </nav>

      <main className="ml-[72px] min-h-screen p-8 lg:p-12 relative z-10">
        <AnimatePresence mode="wait">

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* UPLOAD VIEW */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {view === "upload" && (
            <motion.div key="upload" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="max-w-5xl">
              <header className="mb-10">
                <p className="text-[10px] tracking-[0.5em] text-hacker-green-dim mb-3">BURSA MALAYSIA // FINANCIAL INTELLIGENCE SYSTEM</p>
                <h1 className="text-4xl font-serif tracking-tight text-hacker-green glow-text">
                  INGESTION_PROTOCOL
                </h1>
                <p className="text-xs text-hacker-green-dim mt-2 opacity-70">
                  Upload annual reports → Review & edit extracted data → Save to database
                </p>
              </header>

              {/* Step indicator */}
              <div className="flex items-center gap-4 mb-8">
                <StepIndicator step={1} label="UPLOAD" active={uploadStep === "select"} completed={uploadStep === "review"} />
                <div className="flex-1 h-px bg-hacker-border" />
                <StepIndicator step={2} label="REVIEW & EDIT" active={uploadStep === "review"} completed={false} />
              </div>

              {uploadStep === "select" && (
                <div className="space-y-6">
                  {/* Parameters */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] uppercase tracking-[0.4em] text-hacker-green-dim mb-2 font-bold">FY_YEAR</label>
                      <select
                        value={year}
                        onChange={(e) => setYear(e.target.value)}
                        className="w-full bg-black border border-hacker-border px-4 py-3 text-sm text-white focus:outline-none focus:border-hacker-green transition-colors"
                      >
                        {["2025", "2024", "2023", "2022", "2021"].map((y) => (
                          <option key={y} value={y} className="bg-black">{y}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase tracking-[0.4em] text-hacker-green-dim mb-2 font-bold">SECTOR</label>
                      <select
                        value={sector}
                        onChange={(e) => setSector(e.target.value)}
                        className="w-full bg-black border border-hacker-border px-4 py-3 text-sm text-white focus:outline-none focus:border-hacker-green transition-colors"
                      >
                        {BURSA_SECTORS.map((s) => (
                          <option key={s} value={s} className="bg-black">{s.replace(/_/g, " ")}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Drop zone */}
                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.4em] text-hacker-green-dim mb-2 font-bold">
                      DOCUMENTS <span className="opacity-50 normal-case tracking-normal">(ctrl+v to paste)</span>
                    </label>
                    <div
                      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={handleDrop}
                      className={cn(
                        "relative border-2 border-dashed p-12 flex flex-col items-center gap-4 transition-all",
                        dragOver ? "border-hacker-green bg-hacker-green/10" : "border-hacker-border hover:border-hacker-green/50 hover:bg-white/[0.01]"
                      )}
                    >
                      <input
                        type="file"
                        multiple
                        accept=".pdf,image/*"
                        onChange={handleFileChange}
                        className="absolute inset-0 opacity-0 cursor-pointer z-10"
                      />
                      <Upload className={cn("w-8 h-8 transition-all", dragOver ? "text-hacker-green scale-110" : "text-hacker-green-dim")} />
                      <div className="text-center pointer-events-none">
                        <p className="text-sm font-bold text-white">DRAG & DROP or CLICK</p>
                        <p className="text-[10px] text-hacker-green-dim mt-1 tracking-widest">PDF // PNG // JPG // JPEG // SCREENSHOT</p>
                      </div>
                    </div>
                  </div>

                  {/* Pending files */}
                  <AnimatePresence>
                    {pendingFiles.length > 0 && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0 }} className="space-y-2">
                        <p className="text-[10px] tracking-widest text-hacker-green-dim">QUEUE ({pendingFiles.length})</p>
                        {pendingFiles.map((f, i) => (
                          <div key={i} className="flex items-center justify-between bg-black border border-hacker-border px-4 py-2 text-xs">
                            <div className="flex items-center gap-3">
                              <FileText className="w-3 h-3 text-hacker-green-dim" />
                              <span className="truncate max-w-[320px]">{f.name}</span>
                              <span className="text-hacker-green-dim opacity-50 text-[10px]">{(f.size / 1024).toFixed(0)}KB</span>
                            </div>
                            <button type="button" onClick={() => setPendingFiles((p) => p.filter((_, j) => j !== i))}>
                              <X className="w-3 h-3 text-hacker-green-dim hover:text-red-400 transition-colors" />
                            </button>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <button
                    onClick={handleParse}
                    disabled={isParsing || pendingFiles.length === 0}
                    className="w-full bg-hacker-green text-black font-bold py-4 text-sm tracking-[0.3em] flex items-center justify-center gap-3 hover:bg-hacker-green-bright transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-[0_0_30px_rgba(0,255,65,0.2)]"
                  >
                    {isParsing ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> PARSING_DOCUMENTS...</>
                    ) : (
                      <><FileSearch className="w-4 h-4" /> PARSE & EXTRACT ({pendingFiles.length} FILE{pendingFiles.length !== 1 ? "S" : ""})</>
                    )}
                  </button>

                  {/* Show existing parsed documents if any */}
                  {parsedDocuments.length > 0 && (
                    <button
                      onClick={() => setUploadStep("review")}
                      className="w-full border border-hacker-green text-hacker-green py-3 text-xs tracking-widest flex items-center justify-center gap-2 hover:bg-hacker-green/10 transition-all"
                    >
                      <ChevronRight className="w-3 h-3" />
                      CONTINUE_TO_REVIEW ({parsedDocuments.length} DOCUMENTS)
                    </button>
                  )}
                </div>
              )}

              {uploadStep === "review" && (
                <div className="space-y-6">
                  {/* Add more button */}
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] tracking-[0.5em] text-hacker-green-dim">
                      {parsedDocuments.length} DOCUMENT{parsedDocuments.length !== 1 ? "S" : ""} READY FOR REVIEW
                    </p>
                    <button
                      onClick={addMoreDocuments}
                      className="text-xs border border-hacker-border px-4 py-2 flex items-center gap-2 hover:border-hacker-green hover:text-hacker-green transition-all"
                    >
                      <Plus className="w-3 h-3" /> ADD_MORE
                    </button>
                  </div>

                  {/* Document cards */}
                  {parsedDocuments.map((doc, docIndex) => (
                    <DocumentCard
                      key={doc.fileId}
                      doc={doc}
                      docIndex={docIndex}
                      onUpdateName={updateDocumentName}
                      onUpdateField={updateDocumentField}
                      onToggleExpanded={toggleDocumentExpanded}
                      onRemove={removeDocument}
                    />
                  ))}

                  {/* Save button */}
                  <div className="flex gap-4">
                    <button
                      onClick={addMoreDocuments}
                      className="flex-1 border border-hacker-border text-hacker-green-dim py-4 text-sm tracking-widest flex items-center justify-center gap-3 hover:border-hacker-green hover:text-hacker-green transition-all"
                    >
                      <Plus className="w-4 h-4" /> ADD_MORE_DOCUMENTS
                    </button>
                    <button
                      onClick={handleSaveAll}
                      disabled={isSaving || parsedDocuments.length === 0}
                      className="flex-1 bg-hacker-green text-black font-bold py-4 text-sm tracking-[0.3em] flex items-center justify-center gap-3 hover:bg-hacker-green-bright transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-[0_0_30px_rgba(0,255,65,0.2)]"
                    >
                      {isSaving ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> SAVING...</>
                      ) : (
                        <><Save className="w-4 h-4" /> SAVE_ALL_TO_DATABASE</>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* DASHBOARD VIEW */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {view === "dashboard" && (
            <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-10">
              {reports.length === 0 ? (
                <div className="h-[60vh] flex flex-col items-center justify-center gap-6 text-hacker-green-dim">
                  <FileSearch className="w-16 h-16 opacity-20" />
                  <p className="text-xs tracking-[0.5em] opacity-50">NO_DATA_LOADED</p>
                  <button onClick={() => setView("upload")} className="text-xs border border-hacker-border px-6 py-2 hover:border-hacker-green hover:text-hacker-green transition-all">
                    → INGEST_DOCUMENTS
                  </button>
                </div>
              ) : (
                <>
                  {/* Header */}
                  <header className="border-b border-hacker-border pb-8 flex items-end justify-between">
                    <div>
                      <p className="text-[10px] tracking-[0.5em] text-hacker-green-dim mb-2">{sector.replace(/_/g, " ")} // FY{year}</p>
                      <h1 className="text-4xl font-serif tracking-tight glow-text">DATA_MATRIX</h1>
                    </div>
                    <div className="flex items-center gap-2">
                      {reports.map((r, i) => (
                        <div
                          key={i}
                          title={r.Metadata.CompanyName}
                          className="w-9 h-9 border border-hacker-green bg-hacker-green/10 flex items-center justify-center text-xs font-bold text-hacker-green cursor-pointer hover:bg-hacker-green hover:text-black transition-all"
                          onClick={() => setSelectedReport(r)}
                        >
                          {r.Metadata.CompanyName.charAt(0)}
                        </div>
                      ))}
                    </div>
                  </header>

                  {/* AI Insights */}
                  <section className="bg-black border border-hacker-border p-8 relative overflow-hidden">
                    <div className="absolute -top-8 -right-8 opacity-[0.03]">
                      <Sparkles className="w-64 h-64" />
                    </div>
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-hacker-green animate-pulse" />
                        <h2 className="text-[10px] tracking-[0.5em] font-bold">ZAI_CORE_ANALYTICS</h2>
                      </div>
                      <button
                        onClick={generateAIInsights}
                        disabled={isGeneratingAi}
                        className="border border-hacker-green px-5 py-2 text-[11px] font-bold flex items-center gap-2 hover:bg-hacker-green hover:text-black transition-all disabled:opacity-40 tracking-widest"
                      >
                        {isGeneratingAi ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                        {aiInsight ? "REGENERATE" : "INITIALIZE"}
                      </button>
                    </div>
                    {aiInsight ? (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border-l-2 border-hacker-green pl-6 text-sm leading-relaxed whitespace-pre-wrap opacity-90">
                        <span className="text-hacker-green-dim text-xs">[ZAI://ANALYSIS] </span>
                        {aiInsight}
                      </motion.div>
                    ) : (
                      <p className="text-hacker-green-dim text-xs italic opacity-40 tracking-widest">
                        {isGeneratingAi ? "SYNTHESIZING_QUALITATIVE_INSIGHT..." : "STANDBY // AWAITING_INITIALIZATION"}
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
                        <div key={i} className="bg-black border border-hacker-border p-5 hover:border-hacker-green transition-colors cursor-pointer group" onClick={() => setSelectedReport(r)}>
                          <div className="flex items-center justify-between mb-3">
                            <div className="w-7 h-7 border border-hacker-green bg-hacker-green/10 flex items-center justify-center text-xs font-bold group-hover:bg-hacker-green group-hover:text-black transition-all">
                              {r.Metadata.CompanyName.charAt(0)}
                            </div>
                            <Eye className="w-3 h-3 text-hacker-green-dim opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                          <p className="text-xs font-bold truncate mb-1">{r.Metadata.CompanyName}</p>
                          <p className="text-[10px] text-hacker-green-dim mb-3">{r.Metadata.DocType}</p>
                          <div className="space-y-1 text-[10px]">
                            <div className="flex justify-between">
                              <span className="text-hacker-green-dim">Revenue</span>
                              <span className="font-bold">{rev > 0 ? (rev / 1000).toFixed(0) + "M" : "—"}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-hacker-green-dim">Net Margin</span>
                              <span className={cn("font-bold", net < 0 ? "text-red-400" : "text-hacker-green")}>{margin}{margin !== "—" ? "%" : ""}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Charts */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <ChartBox title="INCOME_STATEMENT_OVERLAY (MYR '000)">
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={revenueData} barGap={4}>
                          <CartesianGrid strokeDasharray="2 4" vertical={false} stroke="#003b00" />
                          <XAxis dataKey="name" fontSize={9} tick={{ fill: "#008f11" }} axisLine={false} tickLine={false} />
                          <YAxis fontSize={9} tick={{ fill: "#008f11" }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}M` : v} />
                          <Tooltip contentStyle={{ background: "#0d0208", border: "1px solid #003b00", color: "#00ff41", fontSize: 11 }} />
                          <Legend wrapperStyle={{ fontSize: 10, color: "#008f11" }} />
                          <Bar dataKey="Revenue" fill="#00ff41" radius={[2, 2, 0, 0]} maxBarSize={40} />
                          <Bar dataKey="Gross Profit" fill="#008f11" radius={[2, 2, 0, 0]} maxBarSize={40} />
                          <Bar dataKey="Net Profit" fill="#003b00" radius={[2, 2, 0, 0]} maxBarSize={40} />
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartBox>

                    <ChartBox title="BALANCE_SHEET_SIGNAL (MYR '000)">
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={balanceData} barGap={4}>
                          <CartesianGrid strokeDasharray="2 4" vertical={false} stroke="#003b00" />
                          <XAxis dataKey="name" fontSize={9} tick={{ fill: "#008f11" }} axisLine={false} tickLine={false} />
                          <YAxis fontSize={9} tick={{ fill: "#008f11" }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}M` : v} />
                          <Tooltip contentStyle={{ background: "#0d0208", border: "1px solid #003b00", color: "#00ff41", fontSize: 11 }} />
                          <Legend wrapperStyle={{ fontSize: 10, color: "#008f11" }} />
                          <Bar dataKey="Assets" fill="#00ff41" radius={[2, 2, 0, 0]} maxBarSize={40} />
                          <Bar dataKey="Liabilities" fill="#39ff14" radius={[2, 2, 0, 0]} maxBarSize={40} />
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartBox>
                  </div>

                  {/* Data Matrix Table */}
                  <div className="overflow-x-auto border border-hacker-border bg-black">
                    <table className="w-full text-left border-collapse" style={{ minWidth: Math.max(600, reports.length * 200) }}>
                      <thead>
                        <tr className="bg-hacker-green text-black">
                          <th className="px-6 py-4 text-[10px] font-bold tracking-[0.3em] uppercase w-48">INDICATOR</th>
                          {reports.map((r, i) => (
                            <th key={i} className="px-6 py-4 text-[10px] font-bold border-l border-black/20 text-center">
                              <div className="flex flex-col items-center gap-1.5">
                                <span className="truncate max-w-[160px] block">{r.Metadata.CompanyName}</span>
                                <button
                                  onClick={() => setSelectedReport(r)}
                                  className="text-[9px] border border-black/40 px-2 py-0.5 hover:bg-black hover:text-hacker-green transition-all rounded-none"
                                >
                                  VIEW_SOURCE
                                </button>
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="text-xs divide-y divide-hacker-border/20">
                        <SectionRow label="INCOME_STATEMENT" colSpan={reports.length + 1} />
                        <DataRow label="Revenue (RM '000)" id="revenue" cat="incomeStatement" reports={reports} />
                        <DataRow label="Operating Expenses (RM '000)" id="operatingExpenses" cat="incomeStatement" reports={reports} />
                        <DataRow label="Operating Profit (RM '000)" id="operatingProfit" cat="incomeStatement" reports={reports} />
                        <tr>
                          <td colSpan={reports.length + 1} className="py-2">
                            <div className="h-[1px] bg-hacker-border/20 w-full"></div>
                          </td>
                        </tr>

                        <DataRow label="EBIT" id="ebit" cat="incomeStatement" reports={reports} tooltip="Earning Before Interest & Taxes"/>
                        <DataRow label="EBITDA" id="ebitda" cat="incomeStatement" reports={reports} tooltip="Earning Before Interest, Taxes, Depreciation & Amortilization"/>
                        <DataRow label="Gross Profit" id="grossProfit" cat="incomeStatement" reports={reports} tooltip="Revenue - Cost of Goods Sold (COGS)"/>
                        <DataRow label="Tax Expense" id="taxExpense" cat="incomeStatement" reports={reports} />
                        <DataRow label="Net Profit" id="netProfit" cat="incomeStatement" reports={reports} tooltip="EBIT - COGS"/>
                        <tr>
                          <td colSpan={reports.length + 1} className="py-2">
                            <div className="h-[1px] bg-hacker-border/20 w-full"></div>
                          </td>
                        </tr>

                        <SectionRow label="ASSETS" colSpan={reports.length + 1} />
                        <DataRow label="Non-Current Assets" id="currentAssets" cat="balanceSheet" reports={reports} />
                        <DataRow label="PPE" id="ppe" cat="balanceSheet" reports={reports} tooltip="Property, Plant, Equiptment"/>
                        <DataRow label="Intangible Assets" id="intangibleAssets" cat="balanceSheet" reports={reports} tooltip="Valued assets but not physical"/>
                        <tr>
                          <td colSpan={reports.length + 1} className="py-2">
                            <div className="h-[1px] bg-hacker-border/20 w-full"></div>
                          </td>
                        </tr>
                        <DataRow label="Current Assets" id="currentAssets" cat="balanceSheet" reports={reports} />
                        <tr>
                          <td colSpan={reports.length + 1} className="py-2">
                            <div className="h-[1px] bg-hacker-border/20 w-full"></div>
                          </td>
                        </tr>
                        <DataRow label="Total Assets" id="totalAssets" cat="balanceSheet" reports={reports} />

                        <SectionRow label="LIABILITIY" colSpan={reports.length + 1} />
                        <DataRow label="Total Liabilities" id="totalLiabilities" cat="balanceSheet" reports={reports} />
                        
                        <DataRow label="Cash & Equivalents" id="cashAndEquivalents" cat="balanceSheet" reports={reports} />
                        <DataRow label="Total Equity" id="totalEquity" cat="balanceSheet" reports={reports} />
                        <tr>
                          <td colSpan={reports.length + 1} className="py-2">
                            <div className="h-[1px] bg-hacker-border/20 w-full"></div>
                          </td>
                        </tr>
{/* 
                        <SectionRow label="CASH_FLOW" colSpan={reports.length + 1} />
                        <DataRow label="Operating Cash Flow" id="operatingCashFlow" cat="cashFlow" reports={reports} />
                        <DataRow label="Investing Cash Flow" id="investingCashFlow" cat="cashFlow" reports={reports} />
                        <DataRow label="Financing Cash Flow" id="financingCashFlow" cat="cashFlow" reports={reports} />
                        <DataRow label="Free Cash Flow" id="freeCashFlow" cat="cashFlow" reports={reports} /> */}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </motion.div>
          )}

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* ARCHIVE VIEW */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {view === "archive" && (
            <motion.div key="archive" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <header className="mb-10 border-b border-hacker-border pb-8">
                <p className="text-[10px] tracking-[0.5em] text-hacker-green-dim mb-2">PERSISTENT_XML_STORE</p>
                <h1 className="text-4xl font-serif tracking-tight glow-text">FILESYSTEM_ARCHIVE</h1>
              </header>

              {archive.length === 0 ? (
                <div className="h-[50vh] flex flex-col items-center justify-center text-hacker-green-dim gap-4">
                  <Database className="w-12 h-12 opacity-10" />
                  <p className="text-xs tracking-[0.5em] opacity-40">FS_EMPTY // NO_RECORDS</p>
                  <button onClick={() => setView("upload")} className="text-xs border border-hacker-border px-6 py-2 hover:border-hacker-green transition-all">
                    → INGEST_FIRST_DOCUMENT
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                  {archive.map((yItem, i) => (
                    <div key={i} className="space-y-3">
                      <h2 className="text-2xl font-serif text-white flex items-center gap-3">
                        <span className="text-hacker-green-dim text-sm font-mono">/</span>
                        {yItem.year}
                      </h2>
                      {yItem.sectors.map((s: string, j: number) => (
                        <button
                          key={j}
                          onClick={() => loadReports(yItem.year, s)}
                          className="w-full bg-black border border-hacker-border px-5 py-4 flex items-center justify-between hover:border-hacker-green hover:bg-hacker-green/5 transition-all group text-left"
                        >
                          <span className="text-xs font-bold tracking-widest">{s.replace(/_/g, " ")}</span>
                          <ChevronRight className="w-4 h-4 text-hacker-green-dim group-hover:text-hacker-green group-hover:translate-x-1 transition-all" />
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* DOCUMENT VIEWER OVERLAY WITH EDIT */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {selectedReport && (
          <DocumentViewerOverlay
            report={selectedReport}
            onClose={() => {
              setSelectedReport(null);
              setEditingReport(null);
            }}
            isEditing={editingReport !== null}
            onStartEdit={() => setEditingReport({ ...selectedReport })}
            editingReport={editingReport}
            onEditChange={(financials) => {
              if (editingReport) {
                setEditingReport({ ...editingReport, Financials: financials });
              }
            }}
            onSaveEdit={async () => {
              if (!editingReport) return;
              // Save the edited report
              try {
                const res = await fetch("/api/save", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    reports: [{
                      companyName: editingReport.Metadata.CompanyName,
                      financials: editingReport.Financials,
                      storedFileName: editingReport.Metadata.StoredFileName,
                      originalFileName: editingReport.Metadata.OriginalFileName,
                      docType: editingReport.Metadata.DocType,
                    }],
                    year: editingReport.Metadata.FinancialYear,
                    sector: editingReport.Metadata.Sector,
                  }),
                });
                if (res.ok) {
                  // Reload reports
                  await loadReports(editingReport.Metadata.FinancialYear, editingReport.Metadata.Sector);
                  setSelectedReport(null);
                  setEditingReport(null);
                }
              } catch (err) {
                console.error(err);
              }
            }}
            onCancelEdit={() => setEditingReport(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ══════════════════════════════════════════════════════════════════════════════

function StepIndicator({ step, label, active, completed }: { step: number; label: string; active: boolean; completed: boolean }) {
  return (
    <div className={cn("flex items-center gap-3", active ? "text-hacker-green" : completed ? "text-hacker-green-dim" : "text-hacker-green-dim/50")}>
      <div className={cn(
        "w-8 h-8 flex items-center justify-center text-xs font-bold border transition-all",
        active ? "border-hacker-green bg-hacker-green text-black" : completed ? "border-hacker-green bg-transparent" : "border-hacker-border"
      )}>
        {completed ? <CheckCircle2 className="w-4 h-4" /> : step}
      </div>
      <span className="text-[10px] tracking-[0.3em] font-bold">{label}</span>
    </div>
  );
}

function NavBtn({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative w-12 h-12 flex items-center justify-center transition-all group",
        active ? "bg-hacker-green text-black" : "text-hacker-green-dim hover:text-hacker-green"
      )}
    >
      {React.cloneElement(icon as React.ReactElement, { className: "w-5 h-5" })}
      <span className="absolute left-full ml-4 bg-hacker-green text-black text-[9px] font-bold px-3 py-1.5 tracking-[0.2em] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
        {label}
      </span>
    </button>
  );
}

function ChartBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-black border border-hacker-border p-6 hover:border-hacker-green/50 transition-colors">
      <p className="text-[9px] tracking-[0.5em] text-hacker-green-dim mb-5 font-bold">{title}</p>
      {children}
    </div>
  );
}

function SectionRow({ label, colSpan }: { label: string; colSpan: number }) {
  return (
    <tr className="bg-hacker-bg">
      <td colSpan={colSpan} className="px-6 py-2 text-[13px] tracking-[0.5em] text-hacker-green/100 font-bold uppercase italic">
        {label}
      </td>
    </tr>
  );
}

function DataRow({
  label,
  id,
  cat,
  reports,
  highlight,
  tooltip
}: {
  label: string;
  id: string;
  cat: string;
  reports: CompanyReport[];
  highlight?: boolean;
  tooltip?: string;
}) {
  return (
    <tr className={cn("hover:bg-hacker-green/5 transition-colors", highlight && "bg-hacker-green/[0.02]")}>
      <td className={cn("px-6 py-4 text-xs font-bold tracking-tight relative group", highlight ? "text-hacker-green glow-text" : "text-hacker-green-dim")}>

        <span className={cn(tooltip && "cursor-help border-b border-dotted border-hacker-green/40")}>
          {label}
        </span>

        {tooltip && (
          <div className="absolute left-6 bottom-full mb-1 hidden group-hover:block z-30 max-w-xs bg-black border border-hacker-border text-hacker-green-bright text-[10px] p-2 rounded shadow-lg pointer-events-none font-mono">
            {tooltip}
          </div>
        )}
      </td>

      {reports.map((r: CompanyReport, i: number) => {
        const val = (r.Financials as any)[cat]?.[id];
        const n = safeNum(val);
        return (
          <td key={i} className="px-6 py-4 text-sm border-l border-hacker-border/20 text-center font-mono">
            {n !== 0 ? (
              <span className={cn("font-bold", n < 0 ? "text-red-400" : highlight ? "text-hacker-green-bright glow-text" : "text-hacker-green")}>
                {formatNum(val)}
              </span>
            ) : (
              <span className="text-hacker-green-dim/20 text-xs">—</span>
            )}
          </td>
        );
      })}
    </tr>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// DOCUMENT CARD (for review/edit step)
// ══════════════════════════════════════════════════════════════════════════════

function DocumentCard({
  doc,
  docIndex,
  onUpdateName,
  onUpdateField,
  onToggleExpanded,
  onRemove,
}: {
  doc: ParsedDocument;
  docIndex: number;
  onUpdateName: (index: number, name: string) => void;
  onUpdateField: (index: number, category: string, fieldId: string, value: string) => void;
  onToggleExpanded: (index: number) => void;
  onRemove: (index: number) => void;
}) {
  const [previewVisible, setPreviewVisible] = useState(false);

  return (
    <div className="bg-black border border-hacker-border">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-hacker-border/50">
        <div className="flex items-center gap-4 flex-1">
          <div className="w-10 h-10 border border-hacker-green bg-hacker-green/10 flex items-center justify-center text-sm font-bold text-hacker-green">
            {docIndex + 1}
          </div>
          <div className="flex-1">
            <input
              type="text"
              value={doc.companyName}
              onChange={(e) => onUpdateName(docIndex, e.target.value)}
              className="w-full bg-transparent border-b border-hacker-border px-0 py-1 text-sm font-bold text-white focus:outline-none focus:border-hacker-green transition-colors"
              placeholder="Company Name"
            />
            <div className="flex items-center gap-3 mt-1">
              <span className="text-[10px] text-hacker-green-dim">{doc.originalFileName}</span>
              <span className="text-[10px] px-2 py-0.5 bg-hacker-green/10 text-hacker-green">{doc.docType}</span>
              <span className="text-[10px] text-hacker-green-dim opacity-50">{doc.rawTextLength} chars extracted</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPreviewVisible(!previewVisible)}
            className="text-[10px] border border-hacker-border px-3 py-1.5 flex items-center gap-1.5 hover:border-hacker-green hover:text-hacker-green transition-all"
          >
            <Eye className="w-3 h-3" /> {previewVisible ? "HIDE" : "VIEW"}_SOURCE
          </button>
          <button
            onClick={() => onToggleExpanded(docIndex)}
            className="w-8 h-8 flex items-center justify-center border border-hacker-border hover:border-hacker-green hover:text-hacker-green transition-all"
          >
            {doc.isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button
            onClick={() => onRemove(docIndex)}
            className="w-8 h-8 flex items-center justify-center border border-hacker-border hover:border-red-500 hover:text-red-400 transition-all"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Preview Panel */}
      <AnimatePresence>
        {previewVisible && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 400, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-hacker-border/50"
          >
            {doc.docType === "IMAGE" ? (
              <div className="w-full h-full overflow-auto flex items-start justify-center p-4 bg-neutral-950">
                <img
                  src={`/reports/${doc.storedFileName}`}
                  alt={doc.companyName}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            ) : (
              <iframe
                src={`/reports/${doc.storedFileName}#toolbar=0&navpanes=0`}
                className="w-full h-full"
                title="Source Document"
                style={{ filter: "invert(1) hue-rotate(180deg) brightness(0.9)" }}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expandable Fields */}
      <AnimatePresence>
        {doc.isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-6 space-y-6">
              {Object.entries(doc.extractedData).map(([category, fields]) => {
                const hasValues = Object.values(fields).some((f) => f.value !== null);
                if (!hasValues && category !== "incomeStatement" && category !== "balanceSheet") return null;

                return (
                  <div key={category}>
                    <p className="text-[10px] tracking-[0.4em] text-hacker-green-dim font-bold mb-3 border-b border-hacker-border/30 pb-2">
                      {CATEGORY_LABELS[category] || category.toUpperCase()}
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {Object.entries(fields).map(([fieldId, field]) => (
                        <FieldInput
                          key={fieldId}
                          label={FIELD_LABELS[fieldId] || fieldId}
                          value={field.value || ""}
                          confidence={field.confidence}
                          onChange={(val) => onUpdateField(docIndex, category, fieldId, val)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FieldInput({
  label,
  value,
  confidence,
  onChange,
}: {
  label: string;
  value: string;
  confidence: string;
  onChange: (val: string) => void;
}) {
  const confidenceColor = confidence === "high" ? "text-hacker-green" : confidence === "medium" ? "text-yellow-500" : "text-hacker-green-dim";

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-[9px] text-hacker-green-dim truncate">{label}</label>
        {value && (
          <span className={cn("text-[8px]", confidenceColor)}>
            {confidence === "high" ? "●" : confidence === "medium" ? "◐" : "○"}
          </span>
        )}
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "w-full bg-black border px-3 py-2 text-xs font-mono focus:outline-none transition-colors",
          value ? "border-hacker-border text-white" : "border-hacker-border/30 text-hacker-green-dim",
          "focus:border-hacker-green"
        )}
        placeholder="—"
      />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// DOCUMENT VIEWER OVERLAY (with edit mode)
// ══════════════════════════════════════════════════════════════════════════════

function DocumentViewerOverlay({
  report,
  onClose,
  isEditing,
  onStartEdit,
  editingReport,
  onEditChange,
  onSaveEdit,
  onCancelEdit,
}: {
  report: CompanyReport;
  onClose: () => void;
  isEditing: boolean;
  onStartEdit: () => void;
  editingReport: CompanyReport | null;
  onEditChange: (financials: Financials) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
}) {
  const displayReport = editingReport || report;

  const updateField = (category: keyof Financials, fieldId: string, value: string) => {
    if (!editingReport) return;
    const newFinancials = { ...editingReport.Financials };
    if (!newFinancials[category]) {
      (newFinancials as any)[category] = {};
    }
    (newFinancials[category] as any)[fieldId] = value || null;
    onEditChange(newFinancials);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/95 z-[200] flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-5 border-b border-hacker-border bg-black flex-shrink-0">
        <div>
          <h2 className="text-sm font-bold tracking-widest glow-text">{displayReport.Metadata.CompanyName}</h2>
          <p className="text-[10px] text-hacker-green-dim mt-1">
            {displayReport.Metadata.OriginalFileName} // {displayReport.Metadata.DocType} // FY{displayReport.Metadata.FinancialYear}
          </p>
        </div>
        <div className="flex items-center gap-4">
          {!isEditing ? (
            <button
              onClick={onStartEdit}
              className="text-[10px] font-bold border border-hacker-green px-4 py-2 flex items-center gap-2 hover:bg-hacker-green hover:text-black transition-all tracking-widest"
            >
              <Edit3 className="w-3 h-3" /> EDIT_VALUES
            </button>
          ) : (
            <>
              <button
                onClick={onCancelEdit}
                className="text-[10px] font-bold border border-hacker-border px-4 py-2 hover:border-red-500 hover:text-red-400 transition-all tracking-widest"
              >
                CANCEL
              </button>
              <button
                onClick={onSaveEdit}
                className="text-[10px] font-bold bg-hacker-green text-black px-4 py-2 flex items-center gap-2 hover:bg-hacker-green-bright transition-all tracking-widest"
              >
                <Save className="w-3 h-3" /> SAVE_CHANGES
              </button>
            </>
          )}
          {displayReport.Metadata.StoredFileName && (
            <a
              href={`/reports/${displayReport.Metadata.StoredFileName}`}
              target="_blank"
              rel="noreferrer"
              className="text-[10px] font-bold border border-hacker-border px-4 py-2 hover:border-hacker-green hover:text-hacker-green transition-all tracking-widest"
            >
              OPEN_IN_TAB
            </a>
          )}
          <button
            onClick={onClose}
            className="w-10 h-10 border border-hacker-border flex items-center justify-center hover:border-hacker-green hover:text-hacker-green transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar with editable financials */}
        <div className="w-80 flex-shrink-0 border-r border-hacker-border bg-black overflow-y-auto p-6 space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-[10px] tracking-[0.4em] text-hacker-green-dim">
              {isEditing ? "EDITING_DATA" : "EXTRACTED_DATA"}
            </p>
            {isEditing && (
              <span className="text-[9px] px-2 py-0.5 bg-yellow-500/20 text-yellow-500">EDIT_MODE</span>
            )}
          </div>

          {["incomeStatement", "balanceSheet", "cashFlow", "ratios", "growth", "advanced"].map((category) => {
            const data = (displayReport.Financials as any)[category];
            if (!data) return null;
            const entries = Object.entries(data).filter(([, v]) => v !== null && v !== undefined);
            if (entries.length === 0 && !isEditing) return null;

            return (
              <div key={category} className="space-y-2">
                <p className="text-[9px] tracking-[0.4em] text-hacker-green-dim font-bold border-b border-hacker-border pb-1">
                  {CATEGORY_LABELS[category] || category.toUpperCase()}
                </p>
                {isEditing ? (
                  <div className="space-y-2">
                    {Object.keys(FIELD_LABELS)
                      .filter((fieldId) => {
                        const dictEntry = Object.entries(FINANCIAL_DICTIONARY).find(([id]) => id === fieldId);
                        return dictEntry && (dictEntry[1] as any).category === category;
                      })
                      .slice(0, 10) // Show top 10 fields per category in edit mode
                      .map((fieldId) => (
                        <div key={fieldId} className="flex justify-between items-center gap-2">
                          <span className="text-[10px] text-hacker-green-dim truncate flex-1">
                            {FIELD_LABELS[fieldId]}
                          </span>
                          <input
                            type="text"
                            value={data[fieldId] || ""}
                            onChange={(e) => updateField(category as keyof Financials, fieldId, e.target.value)}
                            className="w-24 bg-black border border-hacker-border px-2 py-1 text-[10px] font-mono text-right focus:outline-none focus:border-hacker-green"
                            placeholder="—"
                          />
                        </div>
                      ))}
                  </div>
                ) : (
                  entries.map(([k, v]) => (
                    <div key={k} className="flex justify-between text-[10px]">
                      <span className="text-hacker-green-dim">{FIELD_LABELS[k] || k}</span>
                      <span className="font-bold text-hacker-green">{formatNum(v as any)}</span>
                    </div>
                  ))
                )}
              </div>
            );
          })}
        </div>

        {/* Document preview */}
        <div className="flex-1 overflow-hidden bg-neutral-950">
          {displayReport.Metadata.StoredFileName ? (
            displayReport.Metadata.DocType === "IMAGE" ? (
              <div className="w-full h-full overflow-auto flex items-start justify-center p-8 bg-[repeating-linear-gradient(45deg,#111,#111_10px,#0d0d0d_10px,#0d0d0d_20px)]">
                <img
                  src={`/reports/${displayReport.Metadata.StoredFileName}`}
                  alt={displayReport.Metadata.CompanyName}
                  className="max-w-full shadow-2xl border border-hacker-border"
                />
              </div>
            ) : (
              <iframe
                src={`/reports/${displayReport.Metadata.StoredFileName}#toolbar=0&navpanes=0`}
                className="w-full h-full"
                title="Source Document"
                style={{ filter: "invert(1) hue-rotate(180deg) brightness(0.9)" }}
              />
            )
          ) : (
            <div className="flex items-center justify-center h-full text-hacker-green-dim">
              <p className="text-xs opacity-40">NO_SOURCE_FILE_LINKED</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Type augmentation for the dictionary
const FINANCIAL_DICTIONARY: Record<string, { category: string }> = {
  revenue: { category: "incomeStatement" },
  nonOperatingRevenue: { category: "incomeStatement" },
  costOfGoodsSold: { category: "incomeStatement" },
  grossProfit: { category: "incomeStatement" },
  operatingExpenses: { category: "incomeStatement" },
  sgaExpenses: { category: "incomeStatement" },
  researchDevelopment: { category: "incomeStatement" },
  depreciation: { category: "incomeStatement" },
  amortization: { category: "incomeStatement" },
  ebit: { category: "incomeStatement" },
  ebitda: { category: "incomeStatement" },
  operatingProfit: { category: "incomeStatement" },
  profitBeforeTax: { category: "incomeStatement" },
  taxExpense: { category: "incomeStatement" },
  effectiveTaxRate: { category: "incomeStatement" },
  netProfit: { category: "incomeStatement" },
  retainedEarnings: { category: "incomeStatement" },
  totalAssets: { category: "balanceSheet" },
  currentAssets: { category: "balanceSheet" },
  nonCurrentAssets: { category: "balanceSheet" },
  cashAndEquivalents: { category: "balanceSheet" },
  accountsReceivable: { category: "balanceSheet" },
  inventory: { category: "balanceSheet" },
  shortTermInvestments: { category: "balanceSheet" },
  ppe: { category: "balanceSheet" },
  intangibleAssets: { category: "balanceSheet" },
  goodwill: { category: "balanceSheet" },
  totalLiabilities: { category: "balanceSheet" },
  currentLiabilities: { category: "balanceSheet" },
  accountsPayable: { category: "balanceSheet" },
  shortTermDebt: { category: "balanceSheet" },
  nonCurrentLiabilities: { category: "balanceSheet" },
  longTermDebt: { category: "balanceSheet" },
  bondsPayable: { category: "balanceSheet" },
  totalEquity: { category: "balanceSheet" },
  commonStock: { category: "balanceSheet" },
  preferredStock: { category: "balanceSheet" },
  paidInCapital: { category: "balanceSheet" },
  operatingCashFlow: { category: "cashFlow" },
  investingCashFlow: { category: "cashFlow" },
  financingCashFlow: { category: "cashFlow" },
  freeCashFlow: { category: "cashFlow" },
  capitalExpenditure: { category: "cashFlow" },
  roe: { category: "ratios" },
  roa: { category: "ratios" },
  roic: { category: "ratios" },
  grossMargin: { category: "ratios" },
  operatingMargin: { category: "ratios" },
  netProfitMargin: { category: "ratios" },
  currentRatio: { category: "ratios" },
  quickRatio: { category: "ratios" },
  cashRatio: { category: "ratios" },
  debtToEquity: { category: "ratios" },
  debtRatio: { category: "ratios" },
  interestCoverage: { category: "ratios" },
  assetTurnover: { category: "ratios" },
  inventoryTurnover: { category: "ratios" },
  receivablesTurnover: { category: "ratios" },
  payablesTurnover: { category: "ratios" },
  eps: { category: "ratios" },
  dilutedEps: { category: "ratios" },
  peRatio: { category: "ratios" },
  dividendYield: { category: "ratios" },
  dividendPerShare: { category: "ratios" },
  dividendPayoutRatio: { category: "ratios" },
  retentionRatio: { category: "ratios" },
  revenueGrowth: { category: "growth" },
  netIncomeGrowth: { category: "growth" },
  cagr: { category: "growth" },
  enterpriseValue: { category: "advanced" },
  evEbitda: { category: "advanced" },
  fcfYield: { category: "advanced" },
  eva: { category: "advanced" },
  workingCapital: { category: "advanced" },
  netWorkingCapital: { category: "advanced" },
};
