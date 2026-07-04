import React from "react";
import { Upload, FileText, X, Loader2, FileSearch, ChevronRight, Plus, Save, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ParsedDocument } from "../types";
import { BURSA_SECTORS } from "../constants";
import { StepIndicator } from "./StepIndicator";
import { DocumentCard } from "./DocumentCard";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

interface UploadViewProps {
  key?: string;
  uploadStep: "select" | "review";
  year: string;
  setYear: (y: string) => void;
  sector: string;
  setSector: (s: string) => void;
  dragOver: boolean;
  setDragOver: (b: boolean) => void;
  pendingFiles: File[];
  setPendingFiles: React.Dispatch<React.SetStateAction<File[]>>;
  isParsing: boolean;
  isSaving: boolean;
  parsedDocuments: ParsedDocument[];
  handleDrop: (e: React.DragEvent) => void;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleParse: () => void;
  handleSaveAll: () => void;
  setUploadStep: (step: "select" | "review") => void;
  updateDocumentName: (index: number, name: string) => void;
  updateDocumentField: (index: number, category: string, fieldId: string, value: string) => void;
  toggleDocumentExpanded: (index: number) => void;
  removeDocument: (index: number) => void;
  addMoreDocuments: () => void;
  useAi: boolean;
  setUseAi: (b: boolean) => void;
}

export function UploadView({
  uploadStep,
  year,
  setYear,
  sector,
  setSector,
  dragOver,
  setDragOver,
  pendingFiles,
  setPendingFiles,
  isParsing,
  isSaving,
  parsedDocuments,
  handleDrop,
  handleFileChange,
  handleParse,
  handleSaveAll,
  setUploadStep,
  updateDocumentName,
  updateDocumentField,
  toggleDocumentExpanded,
  removeDocument,
  addMoreDocuments,
  useAi,
  setUseAi,
}: UploadViewProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="max-w-5xl font-sans p-8 lg:p-12"
    >
      <header className="mb-10">
        <span className="p-1 px-2.5 bg-emerald-100 text-emerald-800 text-[10px] uppercase tracking-wider font-extrabold rounded-md">
          Financial Intelligent
        </span>

        <h1 className="text-3xl font-extrabold tracking-tight text-[var(--color-hacker-text-main)] mt-1.5">
          Upload Financial Reports
        </h1>

        <p className="text-sm text-[var(--color-hacker-text-submain)] mt-2">
          Upload corporate annual reports, then review or edit extracted data before saving.
        </p>
      </header>

      {/* Step indicator */}
      <div className="flex items-center gap-4 mb-8 ">
        <StepIndicator step={1} label="UPLOAD FILES" active={uploadStep === "select"} completed={uploadStep === "review"} />

        <div className="flex-1 h-1 bg-[var(--color-hacker-text-main)]" />

        <StepIndicator step={2} label="REVIEW & EDIT" active={uploadStep === "review"} completed={false} />
      </div>

      {uploadStep === "select" && (
        <div className="space-y-6">
          {/* Parameters */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] uppercase tracking-[0.3em] text-[var(--color-hacker-text-main)] mb-2 font-bold">FY Year</label>
              <select
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-full bg-hacker-universal-bckgrd border border-hacker-border-green px-4 py-3 text-sm text-hacker-text-submain rounded-lg focus:outline-none focus:border-hacker-green focus:ring-1 focus:ring-hacker-green/20 transition-all cursor-pointer shadow-xs"
              >
                {["2025", "2024", "2023", "2022", "2021"].map((y) => (
                  <option key={y} value={y} className="bg-hacker-universal-bckgrd text-hacker-text-submain">{y}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-[0.3em] text-[var(--color-hacker-text-main)] mb-2 font-bold">Sector Category</label>
              <select
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                className="w-full bg-hacker-universal-bckgrd border border-hacker-border-green px-4 py-3 text-sm text-hacker-text-submain rounded-lg focus:outline-none focus:border-hacker-green focus:ring-1 focus:ring-hacker-green/20 transition-all cursor-pointer shadow-xs"
              >
                {BURSA_SECTORS.map((s) => (
                  <option key={s} value={s} className="bg-hacker-universal-bckgrd text-hacker-text-submain">{s.replace(/_/g, " ")}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Drop zone */}
          <div>
            <label className="block text-[10px] uppercase tracking-[0.3em] text-hacker-text-main mb-2 font-bold">
              Annual Report Documents <span className="opacity-75 normal-case tracking-normal text-hacker-text-submain font-medium">(ctrl+v to paste screenshot or PDF)</span>
            </label>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={cn(
                "relative border-2 border-dashed rounded-xl p-12 flex flex-col items-center gap-4 transition-all bg-hacker-universal-bckgrd",
                dragOver ? "border-hacker-border-green bg-teal-50/30" : "border-hacker-border-green hover:border-hacker-green/50 hover:shadow-xs"
              )}
            >
              <input
                type="file"
                key={pendingFiles.length}
                multiple
                accept="application/pdf, image/*"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer z-10 bg-white"
              />
              <Upload className={cn("w-10 h-10 transition-all", dragOver ? "text-hacker-green scale-110" : "text-hacker-text-submain")} />
              <div className="text-center pointer-events-none">
                <p className="text-sm font-bold text-hacker-text-submain">Drag & drop files here, or click to upload</p>
                <p className="text-[10px] text-hacker-text-submain mt-1.5 tracking-widest font-semibold">PDF // PNG // JPG // JPEG // SCREENSHOT</p>
              </div>
            </div>
          </div>

          {/* Pending files */}
          <>
            {pendingFiles.length > 0 && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0 }} className="space-y-2">
                <p className="text-[10px] tracking-widest text-hacker-text-main font-bold uppercase">Files Queue ({pendingFiles.length})</p>
                {pendingFiles.map((f, i) => (
                  <div key={i} className="flex items-center justify-between bg-hacker-universal-bckgrd border border-hacker-border-green px-4 py-3 rounded-lg text-xs shadow-xs text-hacker-text-submain">
                    <div className="flex items-center gap-3">
                      <FileText className="w-4 h-4 text-hacker-text-submain" />
                      <span className="truncate max-w-[320px] font-medium">{f.name}</span>
                      <span className="text-hacker-text-submain text-[10px]">{(f.size / 1024).toFixed(0)} KB</span>
                    </div>
                    <button type="button" onClick={() => setPendingFiles((p) => p.filter((_, j) => j !== i))} className="cursor-pointer p-1 rounded-full hover:bg-slate-100 transition-colors">
                      <X className="w-3.5 h-3.5 text-slate-400 hover:text-red-600" />
                    </button>
                  </div>
                ))}
              </motion.div>
            )}
          </>

          {/* Gemini AI extraction configuration */}
          <div
            className="relative overflow-hidden border p-4 rounded-xl flex items-center justify-between shadow-3xs transition-all duration-300"
            style={{
              background: useAi
                ? `
        linear-gradient(
          90deg,
          rgba(0,255,0,0.03) 0%,
          rgba(0,255,0,0.12) 25%,
          rgba(0,255,0,0.03) 50%,
          rgba(0,255,0,0.12) 75%,
          rgba(0,255,0,0.03) 100%
        )
      `
                : `
        linear-gradient(
          90deg,
          rgba(56,102,65,0.02) 0%,
          rgba(56,102,65,0.05) 25%,
          rgba(56,102,65,0.02) 50%,
          rgba(56,102,65,0.05) 75%,
          rgba(56,102,65,0.02) 100%
        )
      `,
              backgroundSize: "200% 100%",
              animation: `ai-flow ${useAi ? "1.5s" : "5s"} linear infinite`,
              borderColor: useAi
                ? "var(--color-hacker-text-accent)"
                : "var(--color-hacker-border)",
              boxShadow: useAi
                ? "0 0 20px rgba(0,255,0,0.15)"
                : "0 0 8px rgba(56,102,65,0.05)",
            }}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-100/50 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="font-sans">
                <p className="text-xs font-bold text-[var(--color-hacker-text-main)]">Use Gemini AI Extraction</p>
                <p className="text-[10px] text-slate-400 font-medium">Auto-converts document format to Markdown before extraction</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setUseAi(!useAi)}
              className={cn(
                "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border border-transparent overflow-hidden transition-all duration-300",
                useAi
                  ? "shadow-[0_0_12px_rgba(0,255,0,0.5)]"
                  : "shadow-[0_0_6px_rgba(0,255,0,0.15)]"
              )}
            >
              {/* Animated flowing background */}
              <div
                className="absolute inset-0"
                style={{
                  background: useAi
                    ? "linear-gradient(90deg, transparent 0%, rgba(0,255,0,.5) 30%, rgba(0,255,0,.9) 50%, rgba(0,255,0,.5) 70%, transparent 100%)"
                    : "linear-gradient(90deg, transparent 0%, rgba(0,255,0,.08) 30%, rgba(0,255,0,.18) 50%, rgba(0,255,0,.08) 70%, transparent 100%)",
                  backgroundSize: "200% 100%",
                  animation: `flow-glow ${useAi ? "1.2s" : "4s"} linear infinite`,
                }}
              />

              {/* Track color */}
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  backgroundColor: useAi
                    ? "var(--color-hacker-text-accent)"
                    : "var(--color-hacker-border)",
                  opacity: useAi ? 0.25 : 0.12,
                }}
              />

              {/* Thumb */}
              <span
                className={cn(
                  "relative z-10 pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-all duration-300",
                  useAi ? "translate-x-5" : "translate-x-0"
                )}
              />
            </button>
          </div>

          <button
            onClick={handleParse}
            disabled={isParsing || pendingFiles.length === 0}
            className="w-full bg-hacker-text-submain border border-hacker-border-green text-black font-bold py-3.5 rounded-lg text-sm tracking-[0.2em] flex items-center justify-center gap-3 animate-pulse disable:border-hacker-border-green transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-xs cursor-pointer"
          >
            {isParsing ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> RUNNING INTELLECTUAL PARSING ENGINE...</>
            ) : (
              <><FileSearch className="w-4 h-4" /> PARSE & EXTRACT ({pendingFiles.length} FILE{pendingFiles.length !== 1 ? "S" : ""})</>
            )}
          </button>

          {/* Show existing parsed documents if any */}
          {parsedDocuments.length > 0 && (
            <button
              onClick={() => setUploadStep("review")}
              className="w-full border border-slate-200 text-hacker-green py-3 rounded-lg text-xs tracking-widest flex items-center justify-center gap-2 hover:bg-slate-50 transition-all font-bold cursor-pointer shadow-xs"
            >
              <ChevronRight className="w-3.5 h-3.5" />
              PROCEED TO REVIEW ({parsedDocuments.length} EXTRACTED REPORTS)
            </button>
          )}
        </div>
      )}

      {uploadStep === "review" && (
        <div className="space-y-6">
          {/* Add more button */}
          <div className="flex items-center justify-between">
            <p className="text-[10px] tracking-[0.2em] text-slate-500 font-bold uppercase">
              {parsedDocuments.length} Document{parsedDocuments.length !== 1 ? "s" : ""} Prepared For Validation
            </p>
            <button
              onClick={addMoreDocuments}
              className="text-xs border border-slate-200 bg-white rounded-lg px-4 py-2 flex items-center gap-2 hover:border-hacker-green hover:text-hacker-green transition-all shadow-xs font-bold cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> ADD_MORE
            </button>
          </div>

          {/* Document cards */}
          <div className="space-y-6">
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
          </div>

          {/* Save button */}
          <div className="flex gap-4">
            <button
              onClick={addMoreDocuments}
              className="flex-1 border border-slate-200 bg-white rounded-lg text-slate-600 py-3.5 text-sm tracking-widest flex items-center justify-center gap-3 hover:border-slate-300 hover:bg-slate-50 transition-all font-bold cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" /> ADD MORE DOCUMENTS
            </button>
            <button
              onClick={handleSaveAll}
              disabled={isSaving || parsedDocuments.length === 0}
              className="flex-1 bg-teal-600 text-white font-bold py-3.5 rounded-lg text-sm tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-teal-800 disabled:text-slate-400 transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-xs cursor-pointer"
            >
              {isSaving ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> SAVING DATA TO DATABASE...</>
              ) : (
                <><Save className="w-4 h-4" /> COMMIT & SAVE ALL TO XML DB</>
              )}
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
