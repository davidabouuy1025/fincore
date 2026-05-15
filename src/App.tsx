import React, { useState, useEffect } from "react";
import { 
  Upload, 
  BarChart3, 
  Table as TableIcon, 
  Search, 
  History, 
  AlertTriangle, 
  ChevronRight,
  Loader2,
  FileText,
  Plus
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Cell
} from "recharts";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// --- Utilities ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---
interface Metadata {
  CompanyName: string;
  FinancialYear: string;
  Sector: string;
  Currency: string;
}

interface Financials {
  incomeStatement: Record<string, string | number | null>;
  balanceSheet: Record<string, string | number | null>;
  cashFlow: Record<string, string | number | null>;
}

interface CompanyReport {
  Metadata: Metadata;
  Financials: Financials;
}

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

export default function App() {
  const [reports, setReports] = useState<CompanyReport[]>([]);
  const [year, setYear] = useState("2025");
  const [sector, setSector] = useState("TECHNOLOGY");
  const [isUploading, setIsUploading] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<any[]>([]);
  const [view, setView] = useState<"dashboard" | "archive" | "upload">("upload");
  const [archive, setArchive] = useState<any[]>([]);

  useEffect(() => {
    fetchArchive();
  }, []);

  const fetchArchive = async () => {
    try {
      const res = await fetch("/api/archive");
      const data = await res.json();
      setArchive(data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadReports = async (y: string, s: string) => {
    try {
      const res = await fetch(`/api/reports/${y}/${s}`);
      const data = await res.json();
      setReports(data);
      setView("dashboard");
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsUploading(true);
    const formData = new FormData(e.currentTarget);
    formData.append("year", year);
    formData.append("sector", sector);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setAnalysisResults(data.results);
      loadReports(year, sector);
      fetchArchive();
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-900 font-sans selection:bg-neutral-900 selection:text-white">
      {/* Sidebar Navigation */}
      <nav className="fixed left-0 top-0 bottom-0 w-16 bg-white border-r border-neutral-200 flex flex-col items-center py-8 gap-8 z-50">
        <div className="w-10 h-10 bg-neutral-900 rounded-lg flex items-center justify-center text-white mb-4">
          <span className="font-bold text-xl">F</span>
        </div>
        <NavItem 
          icon={<Plus className="w-5 h-5" />} 
          active={view === "upload"} 
          onClick={() => setView("upload")} 
          label="Analyze"
        />
        <NavItem 
          icon={<BarChart3 className="w-5 h-5" />} 
          active={view === "dashboard"} 
          onClick={() => setView("dashboard")} 
          label="Dashboard"
        />
        <NavItem 
          icon={<History className="w-5 h-5" />} 
          active={view === "archive"} 
          onClick={() => setView("archive")} 
          label="Archive"
        />
      </nav>

      <main className="ml-16 p-8 max-w-7xl mx-auto">
        <AnimatePresence mode="wait">
          {view === "upload" && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-2xl mx-auto"
            >
              <header className="mb-12">
                <h1 className="text-4xl font-serif italic mb-2 tracking-tight">System Ingestion</h1>
                <p className="text-neutral-500 uppercase text-xs tracking-widest font-mono">Bursa Malaysia Analytics Engine</p>
              </header>

              <div className="bg-white rounded-2xl border border-neutral-200 p-8 shadow-sm">
                <form onSubmit={handleUpload} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-wider font-mono text-neutral-400">Financial Year</label>
                      <select 
                        value={year}
                        onChange={(e) => setYear(e.target.value)}
                        className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-1 focus:ring-neutral-900"
                      >
                        {["2025", "2024", "2023", "2022"].map(y => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-wider font-mono text-neutral-400">Market Sector</label>
                      <select 
                        value={sector}
                        onChange={(e) => setSector(e.target.value)}
                        className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-1 focus:ring-neutral-900"
                      >
                        {BURSA_SECTORS.map(s => (
                          <option key={s} value={s}>{s.replace("_", " ")}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-wider font-mono text-neutral-400">Upload PDF Reports</label>
                    <div className="relative group">
                      <input 
                        type="file" 
                        name="reports" 
                        multiple 
                        accept=".pdf"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />
                      <div className="border-2 border-dashed border-neutral-200 rounded-xl p-12 flex flex-col items-center justify-center gap-4 group-hover:border-neutral-900 transition-colors bg-neutral-50/50">
                        <Upload className="w-8 h-8 text-neutral-400 group-hover:text-neutral-900 transition-colors" />
                        <span className="text-sm text-neutral-500">Drag & drop or <span className="text-neutral-900 font-medium">browse</span></span>
                        <p className="text-[10px] text-neutral-400">Support multiple PDF files (Max 50MB each)</p>
                      </div>
                    </div>
                  </div>

                  <button 
                    type="submit"
                    disabled={isUploading}
                    className="w-full bg-neutral-900 text-white rounded-lg py-4 font-medium flex items-center justify-center gap-2 hover:bg-neutral-800 transition-colors disabled:opacity-50"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Processing Document Coordinate Matrix...</span>
                      </>
                    ) : (
                      <>
                        <Loader2 className="w-5 h-5" />
                        <span>Compile & Analyze Reports</span>
                      </>
                    )}
                  </button>
                </form>
              </div>

              {analysisResults.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-8 space-y-4"
                >
                  <h3 className="text-[10px] uppercase tracking-wider font-mono text-neutral-400">Status Logs</h3>
                  {analysisResults.map((res, i) => (
                    <div key={i} className="bg-white border border-neutral-200 p-4 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-neutral-400" />
                        <div>
                          <p className="text-sm font-medium">{res.companyName}</p>
                          <p className="text-[10px] text-neutral-500 uppercase">{res.detectedSector}</p>
                        </div>
                      </div>
                      {res.isConflict ? (
                        <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-1 rounded-full text-[10px] font-bold">
                          <AlertTriangle className="w-3 h-3" />
                          <span>CONFLICT DETECTED</span>
                        </div>
                      ) : (
                        <div className="text-green-600 bg-green-50 px-3 py-1 rounded-full text-[10px] font-bold">
                          SUCCESS
                        </div>
                      )}
                    </div>
                  ))}
                  <button 
                    onClick={() => setView("dashboard")}
                    className="w-full flex items-center justify-center gap-2 text-sm font-medium text-neutral-600 hover:text-neutral-900 py-2"
                  >
                    Go to Dashboard <ChevronRight className="w-4 h-4" />
                  </button>
                </motion.div>
              )}
            </motion.div>
          )}

          {view === "dashboard" && reports.length > 0 && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-12"
            >
              <header className="flex items-end justify-between border-b border-neutral-200 pb-8">
                <div>
                  <h1 className="text-4xl font-serif italic mb-2 tracking-tight">Analysis Matrix</h1>
                  <p className="text-neutral-500 uppercase text-xs tracking-widest font-mono">
                    {sector.replace("_", " ")} — FY{year}
                  </p>
                </div>
                <div className="flex gap-4">
                  <div className="text-right">
                    <p className="text-[10px] text-neutral-400 uppercase tracking-widest mb-1">Uploaded Peers</p>
                    <div className="flex gap-2">
                      {reports.map((r, i) => (
                        <div key={i} title={r.Metadata.CompanyName} className="w-8 h-8 rounded-full border border-neutral-300 flex items-center justify-center text-[10px] font-bold bg-white">
                          {r.Metadata.CompanyName.charAt(0)}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </header>

              {/* Charts Section */}
              <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <ChartContainer title="Revenue Comparison (MYR '000)">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={reports.map(r => ({ name: r.Metadata.CompanyName.split(" ")[0], value: parseFloat(String(r.Financials.incomeStatement.revenue || 0)) }))}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E5E5" />
                      <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
                      <YAxis fontSize={10} axisLine={false} tickLine={false} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#141414" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>

                <ChartContainer title="Net Profit Comparison (MYR '000)">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={reports.map(r => ({ name: r.Metadata.CompanyName.split(" ")[0], value: parseFloat(String(r.Financials.incomeStatement.netProfit || 0)) }))}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E5E5" />
                      <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
                      <YAxis fontSize={10} axisLine={false} tickLine={false} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#F27D26" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </section>

              {/* Matrix Table */}
              <section className="overflow-x-auto bg-white border border-neutral-200 rounded-2xl shadow-sm">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="bg-neutral-50/50 border-b border-neutral-200">
                      <th className="p-6 text-[11px] font-serif italic opacity-50 uppercase tracking-widest w-1/4">Financial Indicator</th>
                      {reports.map((r, i) => (
                        <th key={i} className="p-6 text-sm font-semibold border-l border-neutral-200 uppercase tracking-tight">
                          {r.Metadata.CompanyName}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <MatrixRow label="Revenue" id="revenue" category="incomeStatement" reports={reports} />
                    <MatrixRow label="Cost of Sales" id="costOfSales" category="incomeStatement" reports={reports} />
                    <MatrixRow label="Gross Profit" id="grossProfit" category="incomeStatement" reports={reports} />
                    <MatrixRow label="Net Profit" id="netProfit" category="incomeStatement" reports={reports} />
                    <tr className="bg-neutral-50 border-y border-neutral-200">
                      <td colSpan={reports.length + 1} className="px-6 py-2 text-[9px] uppercase tracking-widest font-mono text-neutral-400">Balance Sheet</td>
                    </tr>
                    <MatrixRow label="Total Assets" id="totalAssets" category="balanceSheet" reports={reports} />
                    <MatrixRow label="Total Liabilities" id="totalLiabilities" category="balanceSheet" reports={reports} />
                    <tr className="bg-neutral-50 border-y border-neutral-200">
                      <td colSpan={reports.length + 1} className="px-6 py-2 text-[9px] uppercase tracking-widest font-mono text-neutral-400">Cash Flow</td>
                    </tr>
                    <MatrixRow label="Operating Cash Flow" id="operatingCashFlow" category="cashFlow" reports={reports} />
                  </tbody>
                </table>
              </section>
            </motion.div>
          )}

          {view === "dashboard" && reports.length === 0 && (
            <div className="h-96 flex flex-col items-center justify-center text-neutral-400 gap-4">
              <TableIcon className="w-12 h-12 opacity-20" />
              <p className="text-sm font-mono uppercase tracking-widest">No data available for this selection</p>
              <button 
                onClick={() => setView("upload")}
                className="text-xs text-neutral-900 underline underline-offset-4"
              >
                Upload reports now
              </button>
            </div>
          )}

          {view === "archive" && (
            <motion.div
              key="archive"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <header className="mb-12">
                <h1 className="text-4xl font-serif italic mb-2 tracking-tight">Archive Repository</h1>
                <p className="text-neutral-500 uppercase text-xs tracking-widest font-mono">Historical Parsed Data Records</p>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {archive.length > 0 ? archive.map((yItem, i) => (
                  <div key={i} className="space-y-4">
                    <h2 className="text-2xl font-serif border-b border-neutral-200 pb-2">{yItem.year}</h2>
                    <div className="space-y-2">
                      {yItem.sectors.map((s: string, j: number) => (
                        <button
                          key={j}
                          onClick={() => {
                            setYear(yItem.year);
                            setSector(s);
                            loadReports(yItem.year, s);
                          }}
                          className="w-full bg-white p-4 rounded-xl border border-neutral-200 flex items-center justify-between group hover:border-neutral-900 transition-all shadow-sm"
                        >
                          <span className="text-sm font-medium uppercase tracking-tight">{s.replace("_", " ")}</span>
                          <ChevronRight className="w-4 h-4 text-neutral-300 group-hover:text-neutral-900" />
                        </button>
                      ))}
                    </div>
                  </div>
                )) : (
                  <div className="col-span-full h-64 flex flex-col items-center justify-center text-neutral-400 gap-4">
                    <History className="w-12 h-12 opacity-20" />
                    <p className="text-sm font-mono uppercase tracking-widest">Archive is empty</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function NavItem({ icon, active, onClick, label }: any) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "relative w-12 h-12 flex items-center justify-center rounded-xl transition-all group",
        active ? "bg-neutral-900 text-white" : "text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900"
      )}
    >
      {icon}
      <span className="absolute left-full ml-4 px-2 py-1 bg-neutral-900 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
        {label}
      </span>
    </button>
  );
}

function ChartContainer({ title, children }: any) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm space-y-4">
      <h3 className="text-[10px] uppercase tracking-widest font-mono text-neutral-400">{title}</h3>
      {children}
    </div>
  );
}

function MatrixRow({ label, id, category, reports }: any) {
  return (
    <tr className="border-b border-neutral-100 hover:bg-neutral-50/80 transition-colors">
      <td className="p-6 text-sm font-medium text-neutral-600">{label}</td>
      {reports.map((r: CompanyReport, i: number) => {
        const val = r.Financials[category as keyof Financials][id];
        return (
          <td key={i} className="p-6 text-sm font-mono font-medium border-l border-neutral-100">
            {val ? Number(val).toLocaleString() : <span className="text-neutral-300">null</span>}
          </td>
        )
      })}
    </tr>
  );
}
