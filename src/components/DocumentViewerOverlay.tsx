import React from "react";
import { Edit3, Save, X, Sparkles, Loader2, Award, Zap, ShieldCheck } from "lucide-react";
import { motion } from "motion/react";
import { CompanyReport, Financials } from "../types";
import { FIELD_LABELS, CATEGORY_LABELS, formatNum, FINANCIAL_DICTIONARY } from "../constants";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  calculateCore8Metrics,
  calculateSectorMetrics,
  calculateScoring
} from "../fincore_engine";

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

interface DocumentViewerOverlayProps {
  report: CompanyReport;
  onClose: () => void;
  isEditing: boolean;
  onStartEdit: () => void;
  editingReport: CompanyReport | null;
  onEditChange: (financials: Financials) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onAiReanalyze?: (storedFileName: string, docType: string) => Promise<void>;
  isReanalyzing?: boolean;
}

export function DocumentViewerOverlay({
  report,
  onClose,
  isEditing,
  onStartEdit,
  editingReport,
  onEditChange,
  onSaveEdit,
  onCancelEdit,
  onAiReanalyze,
  isReanalyzing,
}: DocumentViewerOverlayProps) {
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
      className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-[200] flex flex-col font-sans"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-4 border-b border-slate-200 bg-white flex-shrink-0 shadow-xs">
        <div>
          <h2 className="text-lg font-extrabold text-slate-800">{displayReport.Metadata.CompanyName}</h2>
          <p className="text-[10px] text-slate-400 mt-1 font-semibold tracking-wide">
            {displayReport.Metadata.OriginalFileName} // {displayReport.Metadata.DocType} // FY{displayReport.Metadata.FinancialYear}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!isEditing ? (
            <>
              {displayReport.Metadata.StoredFileName && onAiReanalyze && (
                <button
                  type="button"
                  disabled={isReanalyzing}
                  onClick={() => onAiReanalyze(displayReport.Metadata.StoredFileName!, displayReport.Metadata.DocType || "DIGITAL_PDF")}
                  className="text-[11px] font-bold border border-emerald-200 bg-emerald-50/50 rounded-lg px-4 py-2 flex items-center gap-2 hover:bg-hacker-green hover:text-white hover:border-hacker-green transition-all tracking-wide cursor-pointer disabled:opacity-50 shadow-3xs"
                >
                  {isReanalyzing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      Gemini AI Re-extract
                    </>
                  )}
                </button>
              )}
              <button
                onClick={onStartEdit}
                className="text-[11px] font-bold border border-slate-200 rounded-lg px-4 py-2 flex items-center gap-2 hover:bg-slate-50 text-slate-700 transition-all tracking-wide cursor-pointer shadow-3xs"
              >
                <Edit3 className="w-3.5 h-3.5 text-slate-500" /> Edit Data Values
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onCancelEdit}
                className="text-[11px] font-bold border border-slate-200 bg-white rounded-lg px-4 py-2 hover:bg-slate-50 hover:border-red-200 text-slate-600 hover:text-red-600 transition-all cursor-pointer shadow-3xs"
              >
                Cancel
              </button>
              <button
                onClick={onSaveEdit}
                className="text-[11px] font-bold bg-hacker-green text-white rounded-lg px-4 py-2 flex items-center gap-2 hover:bg-teal-800 transition-all cursor-pointer shadow-xs"
              >
                <Save className="w-3.5 h-3.5" /> Save Changes
              </button>
            </>
          )}
          {displayReport.Metadata.StoredFileName && (
            <a
              href={`/reports/${displayReport.Metadata.StoredFileName}`}
              target="_blank"
              rel="noreferrer"
              className="text-[11px] font-bold border border-slate-200 bg-white rounded-lg px-4 py-2 hover:bg-slate-50 hover:border-slate-300 text-slate-600 transition-all tracking-wide cursor-pointer shadow-3xs"
            >
              Open in Tab
            </a>
          )}
          <button
            onClick={onClose}
            className="w-9 h-9 border border-slate-200 bg-white rounded-lg flex items-center justify-center hover:bg-slate-50 hover:border-slate-300 transition-all text-slate-500 cursor-pointer shadow-3xs"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar with editable financials */}
        <div className="w-80 flex-shrink-0 border-r border-slate-200 bg-slate-50/70 overflow-y-auto p-6 space-y-6">
          {isReanalyzing && (
            <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-lg text-[10px] leading-relaxed text-emerald-800 flex items-center gap-2 font-medium">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600 flex-shrink-0" />
              <span>Analyzing document with Gemini AI... This can take 5-10 seconds.</span>
            </div>
          )}
          {isEditing && !isReanalyzing && displayReport && (
            <div className="bg-emerald-50/80 border border-emerald-100 p-3 rounded-lg text-[10px] leading-relaxed text-emerald-800 flex items-start gap-2 font-medium">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>You are viewing newly extracted or edited values. Review and click "Save Changes" to commit.</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <p className="text-[10px] tracking-wider text-slate-500 font-extrabold uppercase">
              {isEditing ? "Editing Report Fields" : "Extracted Values"}
            </p>
            {isEditing && (
              <span className="text-[9px] font-extrabold px-2 py-0.5 bg-amber-100 border border-amber-200/50 text-amber-800 rounded">EDITING</span>
            )}
          </div>

          {!isEditing && (
            <div className="space-y-4 border-b border-slate-200 pb-5">
              {(() => {
                const sectorName = displayReport.Metadata.Sector || "TECHNOLOGY";
                const scoring = calculateScoring(displayReport, sectorName);
                const c8 = calculateCore8Metrics(displayReport);

                return (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-extrabold text-slate-450 tracking-wider">Metrics Rating</span>
                      <span className={cn(
                        "text-[9px] font-extrabold px-2 py-0.5 rounded border uppercase tracking-wider",
                        scoring.statusColor === "emerald" && "bg-emerald-50 text-emerald-700 border-emerald-200",
                        scoring.statusColor === "amber" && "bg-amber-50 text-amber-700 border-amber-200",
                        scoring.statusColor === "rose" && "bg-rose-50 text-rose-700 border-rose-200"
                      )}>
                        {scoring.recommendation}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 bg-white p-2.5 rounded-lg border border-slate-200 text-center shadow-3xs">
                      <div>
                        <p className="text-[8px] text-slate-400 font-extrabold uppercase tracking-wider mb-0.5">Quality Score</p>
                        <p className="text-sm font-black text-slate-800">{scoring.companyQualityScore}<span className="text-[10px] text-slate-400 font-normal">/100</span></p>
                      </div>
                      <div className="border-l border-slate-200">
                        <p className="text-[8px] text-slate-400 font-extrabold uppercase tracking-wider mb-0.5">Invest Rank</p>
                        <p className="text-sm font-black text-teal-700">{scoring.investmentQualityScore}<span className="text-[10px] text-slate-400 font-normal">/100</span></p>
                      </div>
                    </div>

                    {/* Quick Core Metrics list */}
                    <div className="bg-white/50 border border-slate-250/50 rounded-lg p-2.5 text-[10px] space-y-1.5 font-sans">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 font-medium">ROIC (%)</span>
                        <span className="font-bold text-teal-800 font-mono">{c8.roic.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 font-medium">FCF Margin (%)</span>
                        <span className={cn("font-bold font-mono", c8.fcfMargin < 0 ? "text-rose-600" : "text-emerald-700")}>{c8.fcfMargin.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 font-medium">Altman Z-Score</span>
                        <span className={cn(
                          "font-bold font-mono px-1 rounded",
                          c8.altmanZScore >= 2.9 ? "text-emerald-700 bg-emerald-50" : c8.altmanZScore >= 1.2 ? "text-amber-700 bg-amber-50" : "text-rose-700 bg-rose-50"
                        )}>
                          {c8.altmanZScore.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {(["incomeStatement", "balanceSheet", "cashFlow", "ratios", "growth", "advanced"] as const).map((category) => {
            const data = (displayReport.Financials as any)[category];
            if (!data) return null;
            const entries = Object.entries(data).filter(([, v]) => v !== null && v !== undefined);
            if (entries.length === 0 && !isEditing) return null;

            return (
              <div key={category} className="space-y-2">
                <p className="text-[9px] tracking-wider text-slate-400 font-extrabold border-b border-slate-200 pb-1 uppercase">
                  {CATEGORY_LABELS[category] || category.toUpperCase()}
                </p>
                {isEditing ? (
                  <div className="space-y-2 font-sans">
                    {Object.keys(FIELD_LABELS)
                      .filter((fieldId) => {
                        const dictEntry = Object.entries(FINANCIAL_DICTIONARY).find(([id]) => id === fieldId);
                        return dictEntry && (dictEntry[1] as any).category === category;
                      })
                      .slice(0, 10) // Show top 10 fields per category in edit mode
                      .map((fieldId) => (
                        <div key={fieldId} className="flex justify-between items-center gap-2">
                          <span className="text-[10px] text-slate-500 font-medium truncate flex-1">
                            {FIELD_LABELS[fieldId]}
                          </span>
                          <input
                            type="text"
                            value={data[fieldId] || ""}
                            onChange={(e) => updateField(category, fieldId, e.target.value)}
                            className="w-24 bg-white border border-slate-200 rounded px-2.5 py-1 text-[10px] font-mono text-right focus:outline-none focus:border-hacker-green focus:ring-1 focus:ring-hacker-green/25 text-slate-800 font-semibold"
                            placeholder="—"
                          />
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {entries.map(([k, v]) => (
                      <div key={k} className="flex justify-between text-[10px] font-sans">
                        <span className="text-slate-500 font-medium">{FIELD_LABELS[k] || k}</span>
                        <span className="font-bold text-slate-800 font-mono">{formatNum(v as any)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Document preview */}
        <div className="flex-1 overflow-hidden bg-slate-100">
          {displayReport.Metadata.StoredFileName ? (
            displayReport.Metadata.DocType === "IMAGE" ? (
              <div className="w-full h-full overflow-auto flex items-start justify-center p-8 bg-slate-50/50">
                <img
                  src={`/reports/${displayReport.Metadata.StoredFileName}`}
                  alt={displayReport.Metadata.CompanyName}
                  referrerPolicy="no-referrer"
                  className="max-w-full shadow-lg border border-slate-200 rounded-lg"
                />
              </div>
            ) : (
              <iframe
                src={`/reports/${displayReport.Metadata.StoredFileName}#toolbar=0&navpanes=0`}
                className="w-full h-full bg-white animate-none"
                title="Source Document"
              />
            )
          ) : (
            <div className="flex items-center justify-center h-full text-slate-400">
              <p className="text-xs font-semibold opacity-60">Source file not linked</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
