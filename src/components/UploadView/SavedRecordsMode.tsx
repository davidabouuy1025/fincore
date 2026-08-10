import React from "react";
import { Database, Search, Loader2, AlertCircle, Edit2 } from "lucide-react";

interface SavedRecordsModeProps {
  savedSearchQuery: string;
  setSavedSearchQuery: (q: string) => void;
  isLoadingSaved: boolean;
  filteredSavedReports: any[];
  handleEditSavedReport: (rep: any) => void;
}

export function SavedRecordsMode({
  savedSearchQuery,
  setSavedSearchQuery,
  isLoadingSaved,
  filteredSavedReports,
  handleEditSavedReport,
}: SavedRecordsModeProps) {
  return (
    <div className="space-y-6">
      <div className="bg-slate-100 dark:bg-black border border-slate-200 dark:border-zinc-850 p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex-1">
          <h3 className="text-xs font-black uppercase text-slate-700 dark:text-teal-400 mb-1 tracking-wider flex items-center gap-1.5">
            <Database className="w-4 h-4 text-emerald-500" /> Database Explorer
          </h3>
          <p className="text-[10px] text-slate-400 font-medium">
            Search and directly modify saved corporate files without re-uploading
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative max-w-sm w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={savedSearchQuery}
            onChange={(e) => setSavedSearchQuery(e.target.value)}
            placeholder="Search by Company, Year, Sector..."
            className="w-full bg-white dark:bg-zinc-950 border border-slate-250 dark:border-zinc-850 pl-10 pr-4 py-2.5 rounded-xl text-xs focus:outline-none focus:border-emerald-500 transition-colors shadow-3xs"
          />
        </div>
      </div>

      {isLoadingSaved ? (
        <div className="py-24 text-center flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
          <span className="text-xs font-mono text-slate-400 uppercase tracking-widest">
            Loading Corporate Repository...
          </span>
        </div>
      ) : filteredSavedReports.length === 0 ? (
        <div className="py-24 text-center text-slate-400 dark:text-zinc-500 border border-dashed border-slate-200 dark:border-zinc-850 rounded-2xl bg-slate-50/50 dark:bg-black/10">
          <AlertCircle className="w-8 h-8 mx-auto mb-2.5 opacity-40 text-emerald-550" />
          <span className="text-xs font-mono uppercase tracking-widest font-black block">
            No Saved Records Found
          </span>
          <span className="text-[10px] mt-1 block">Try adjusting your query or ingest new reports</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSavedReports.map((rep, idx) => {
            const company = rep.companyName || rep.Metadata?.CompanyName;
            const year = rep.year || rep.Metadata?.FinancialYear;
            const sector = rep.sector || rep.Metadata?.Sector;
            const pages = rep.Metadata?.SelectedPages || "All";
            const fileName = rep.Metadata?.OriginalFileName || "Original_Brief.pdf";

            return (
              <div
                key={idx}
                className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-850 rounded-2xl p-5 shadow-3xs hover:border-emerald-500/40 transition-all group flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-850/50 text-slate-700 dark:text-zinc-200 font-black flex items-center justify-center rounded-xl text-base shadow-3xs">
                      {company?.charAt(0)}
                    </div>
                    <span className="text-[9px] bg-emerald-500/15 text-emerald-700 dark:text-teal-400 font-mono font-bold px-2.5 py-1 rounded-lg uppercase border border-emerald-500/10">
                      ● Saved
                    </span>
                  </div>

                  <div>
                    <h4 className="text-xs font-black uppercase text-slate-800 dark:text-white group-hover:text-emerald-500 transition-colors truncate">
                      {company}
                    </h4>
                    <div className="flex items-center gap-2 mt-1.5 text-[9px] font-black uppercase tracking-wider text-slate-400 dark:text-zinc-400">
                      <span className="text-slate-500 dark:text-zinc-300">
                        {year} {rep.period && rep.period.toLowerCase() !== "annual" ? rep.period.toUpperCase() : "Annual"}
                      </span>
                      <span>•</span>
                      <span className="truncate">{sector?.replace(/_/g, " ")}</span>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 dark:border-zinc-850/60 pt-3 space-y-2 font-mono text-[9px] text-slate-500 dark:text-zinc-400">
                    <div className="flex items-center justify-between">
                      <span>FILES ASSOCIATED:</span>
                      <span className="font-bold text-slate-700 dark:text-zinc-300 truncate max-w-[150px]">
                        {fileName}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>PAGES RANGE:</span>
                      <span className="font-bold text-slate-700 dark:text-zinc-300">
                        {pages}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleEditSavedReport(rep)}
                  className="w-full mt-5 bg-slate-50 hover:bg-emerald-500 hover:text-black dark:bg-zinc-900 border border-slate-200 dark:border-zinc-850 py-2.5 rounded-xl text-[10px] font-black tracking-wider uppercase cursor-pointer transition-all flex items-center justify-center gap-2"
                >
                  <Edit2 className="w-3.5 h-3.5" /> Revisit & Edit Record
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
