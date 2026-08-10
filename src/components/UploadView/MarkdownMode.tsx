import React from "react";
import {
  Upload,
  FileText,
  X,
  Loader2,
  FileSearch,
  Save,
  Sparkles,
  Eye,
  Check,
  AlertCircle,
  Database,
} from "lucide-react";
import { motion } from "motion/react";
import { cn } from "./utils";

interface MarkdownModeProps {
  mdFile: File | null;
  setMdFile: (file: File | null) => void;
  mdSelectedPages: string;
  setMdSelectedPages: (pages: string) => void;
  isConvertingToMd: boolean;
  convertedMarkdown: string;
  setConvertedMarkdown: (md: string) => void;
  mdCopied: boolean;
  setMdCopied: (b: boolean) => void;
  promptCopied: boolean;
  setPromptCopied: (b: boolean) => void;
  userPastedJson: string;
  setUserPastedJson: (json: string) => void;
  isIngestingJson: boolean;
  ingestStatus: { type: "success" | "error"; message: string } | null;
  setIngestStatus: (status: { type: "success" | "error"; message: string } | null) => void;
  mdObjectUrl: string | null;
  selectedMdYear: string;
  setSelectedMdYear: (year: string) => void;
  selectedMdPeriod: string;
  setSelectedMdPeriod: (period: string) => void;
  selectedMdCurrency: string;
  setSelectedMdCurrency: (currency: string) => void;
  hasApiKey: boolean;
  isExtractingAi: boolean;
  aiModel: string;
  setAiModel: (model: string) => void;
  handleMarkdownEverything: () => void;
  handleExtractAll: () => void;
  handleIngestJson: () => void;
  openPageSelectorForMarkdown: () => void;
  getJSONSchemaOnly: () => string;
  getPromptTemplate: () => string;
  renderHighlightedJson: (jsonString: string) => React.ReactNode;
}

export function MarkdownMode(props: MarkdownModeProps) {
  const {
    mdFile, setMdFile, mdSelectedPages, setMdSelectedPages,
    isConvertingToMd, convertedMarkdown, setConvertedMarkdown,
    mdCopied, setMdCopied, promptCopied, setPromptCopied,
    userPastedJson, setUserPastedJson, isIngestingJson,
    ingestStatus, setIngestStatus, mdObjectUrl,
    selectedMdYear, setSelectedMdYear,
    selectedMdPeriod, setSelectedMdPeriod,
    selectedMdCurrency, setSelectedMdCurrency,
    hasApiKey, isExtractingAi, aiModel, setAiModel,
    handleMarkdownEverything, handleExtractAll, handleIngestJson,
    openPageSelectorForMarkdown, getJSONSchemaOnly, getPromptTemplate,
    renderHighlightedJson
  } = props;

  return (
    <div className="space-y-6">
      {/* Introduction Card */}
      <div className="bg-white dark:bg-hacker-card-bg border border-black dark:border-zinc-850 p-5 rounded-2xl text-xs space-y-2 leading-relaxed">
        <h3 className="font-extrabold uppercase text-black dark:text-teal-400 tracking-wider flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-emerald-800 animate-pulse" /> Markdown Conversion & Gemini 3.6 Flash Ingest Pipeline
        </h3>
        <p className="text-black dark:text-zinc-400">
          Upload any corporate financial report (PDF or Image), specify your page selection, convert it into markdown, and leverage <strong className="text-emerald-600 dark:text-teal-400">Gemini 3.6 Flash</strong> to automatically extract structured financial JSON data directly into Fincore or preview with custom prompts.
        </p>
      </div>

      {/* Two-Column Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* COLUMN 1: Uploader, Page Selection & PDF Viewer */}
        <div className="space-y-5 bg-white dark:bg-black/40 border border-slate-200 dark:border-zinc-850 p-5 rounded-2xl flex flex-col justify-between">
          <div className="space-y-5">
            <h4 className="text-xs font-black uppercase text-slate-700 dark:text-zinc-300 tracking-wider flex items-center gap-2">
              <Upload className="w-4 h-4 text-emerald-500" /> 1. Upload & View Document
            </h4>

            {/* Drag and Drop Zone or Standard File Input */}
            <div className="relative border-2 border-dashed border-emerald-500/20 dark:border-zinc-800 rounded-2xl p-6 hover:border-emerald-500/50 transition-colors bg-white dark:bg-black/10">
              <input
                type="file"
                accept="application/pdf, image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setMdFile(file);
                    setConvertedMarkdown("");
                  }
                }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="text-center space-y-2">
                <Upload className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  {mdFile ? mdFile.name : "Click or drag financial report file here"}
                </p>
                <p className="text-[10px] text-black font-medium">
                  Supports PDF, PNG, JPG, WEBP
                </p>
              </div>
            </div>

            {/* Metadata Parameters row */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[8px] uppercase tracking-widest font-black text-black mb-1.5">
                  Financial Year
                </label>
                <select
                  value={selectedMdYear}
                  onChange={(e) => setSelectedMdYear(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-black border border-slate-200 dark:border-zinc-800 px-3 py-2 text-xs font-bold text-slate-800 dark:text-white rounded-lg focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  {["2026", "2025", "2024", "2023", "2022", "2021"].map((y) => (
                    <option key={y} value={y}>
                      FY {y}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[8px] uppercase tracking-widest font-black text-black mb-1.5">
                  Reporting Period
                </label>
                <select
                  value={selectedMdPeriod}
                  onChange={(e) => setSelectedMdPeriod(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-black border border-slate-200 dark:border-zinc-800 px-3 py-2 text-xs font-bold text-slate-800 dark:text-white rounded-lg focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="annual">Annual</option>
                  <option value="q1">Q1</option>
                  <option value="q2">Q2</option>
                  <option value="q3">Q3</option>
                  <option value="q4">Q4</option>
                </select>
              </div>

              <div>
                <label className="block text-[8px] uppercase tracking-widest font-black text-black mb-1.5">
                  Currency
                </label>
                <select
                  value={selectedMdCurrency}
                  onChange={(e) => setSelectedMdCurrency(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-black border border-slate-200 dark:border-zinc-800 px-3 py-2 text-xs font-bold text-slate-800 dark:text-white rounded-lg focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  {["MYR", "USD", "CNY", "HKD", "JPY", "EUR"].map((cur) => (
                    <option key={cur} value={cur}>
                      {cur}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Page Selection range input */}
            <div>
              <label className="block text-[9px] uppercase tracking-[0.25em] text-black mb-2 font-black">
                Select Page Range for Extraction
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={mdSelectedPages}
                  onChange={(e) => setMdSelectedPages(e.target.value)}
                  placeholder="e.g. 1-10, 45-50 or 'all'"
                  className="flex-1 bg-slate-50 dark:bg-black border border-slate-200 dark:border-zinc-800 px-4 py-3 text-xs font-bold text-slate-800 dark:text-white rounded-xl focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={openPageSelectorForMarkdown}
                  disabled={!mdFile}
                  className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 hover:border-emerald-500/50 hover:text-emerald-600 dark:hover:text-teal-400 rounded-xl px-4 py-3 font-black cursor-pointer transition-all flex items-center justify-center gap-1.5 uppercase tracking-wider shadow-3xs disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                >
                  <Eye className="w-3.5 h-3.5" /> Preview & Select Pages ({mdSelectedPages || "All"})
                </button>
              </div>
            </div>

            {/* PDF or Image Viewer */}
            {mdFile && mdObjectUrl && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    Document Preview Window
                  </span>
                  <button
                    onClick={() => {
                      setMdFile(null);
                      setConvertedMarkdown("");
                    }}
                    className="text-[10px] font-bold text-red-500 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" /> Remove file
                  </button>
                </div>

                {/* Page Selection Indicator for PDF Viewer */}
                <div className="flex items-center justify-between text-[10px] bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 font-bold px-3 py-2.5 rounded-xl border border-emerald-550/10">
                  <span className="uppercase tracking-wider">📄 Selected extraction page(s): {mdSelectedPages || "all"}</span>
                  {(() => {
                    const match = mdSelectedPages.match(/\d+/);
                    const firstPageNum = match ? parseInt(match[0], 10) : null;
                    return firstPageNum ? (
                      <span>(Displaying starting page: {firstPageNum})</span>
                    ) : (
                      <span>(Displaying all pages)</span>
                    );
                  })()}
                </div>

                {mdFile.type === "application/pdf" ? (
                  <iframe
                    src={(() => {
                      const match = mdSelectedPages.match(/\d+/);
                      const firstPageNum = match ? parseInt(match[0], 10) : null;
                      return firstPageNum
                        ? `${mdObjectUrl}#page=${firstPageNum}&toolbar=0&navpanes=0`
                        : `${mdObjectUrl}#toolbar=0&navpanes=0`;
                    })()}
                    className="w-full h-[350px] bg-white rounded-xl border border-slate-250 shadow-xs"
                    title="PDF Preview"
                  />
                ) : (
                  <div className="w-full h-[350px] flex items-center justify-center p-4 bg-white dark:bg-zinc-950 rounded-xl border border-slate-200 dark:border-zinc-800 overflow-hidden">
                    <img
                      src={mdObjectUrl}
                      alt="Uploaded preview"
                      referrerPolicy="no-referrer"
                      className="max-w-full max-h-full object-contain rounded-lg shadow-md"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            onClick={handleMarkdownEverything}
            disabled={!mdFile || isConvertingToMd}
            className="w-full mt-4 bg-teal-900 dark:bg-emerald-500 text-white dark:text-black hover:bg-emerald-800 dark:hover:bg-emerald-400 hover:shadow-lg font-black py-4 rounded-xl text-xs tracking-[0.25em] flex items-center justify-center gap-3 transition-all disabled:opacity-40 disabled:cursor-not-allowed uppercase cursor-pointer"
          >
            {isConvertingToMd ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> CONVERTING TO MARKDOWN...
              </>
            ) : (
              <>
                <FileSearch className="w-4 h-4" /> MARKDOWN EVERYTHING
              </>
            )}
          </button>
        </div>

        {/* COLUMN 2: Converted Markdown Display */}
        <div className="space-y-6 bg-white dark:bg-black/40 border border-slate-200 dark:border-zinc-850 p-5 rounded-2xl flex flex-col justify-between">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase text-slate-700 dark:text-zinc-300 tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-500" /> 2. Extracted Markdown Preview
              </h4>
              {convertedMarkdown && (
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(convertedMarkdown);
                    setMdCopied(true);
                    setTimeout(() => setMdCopied(false), 2000);
                  }}
                  className="text-[10px] font-black uppercase tracking-wider bg-white dark:bg-zinc-800 hover:bg-emerald-500/10 hover:text-emerald-500 border border-slate-200 dark:border-zinc-700 px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  {mdCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" /> Copied!
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" /> Copy Full Markdown
                    </>
                  )}
                </button>
              )}
            </div>

            {convertedMarkdown ? (
              <div className="space-y-3">
                <div className={cn(
                  "relative bg-white dark:bg-zinc-950 rounded-2xl p-4 border border-slate-200 dark:border-zinc-900 overflow-hidden flex flex-col transition-all duration-300",
                  mdFile ? "h-[580px]" : "h-[450px]"
                )}>
                  <div className="flex-1 overflow-y-auto text-xs font-mono text-slate-600 dark:text-zinc-400 whitespace-pre-wrap leading-relaxed pr-2">
                    {convertedMarkdown}
                  </div>
                </div>
              </div>
            ) : (
              <div className={cn(
                "border border-dashed border-slate-200 dark:border-zinc-800 rounded-2xl text-center flex flex-col items-center justify-center gap-2 bg-white dark:bg-black/5 transition-all duration-300",
                mdFile ? "py-[210px]" : "py-24"
              )}>
                <FileText className="w-8 h-8 text-slate-300" />
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  No Markdown Extracted Yet
                </p>
                <p className="text-[9px] text-slate-400 max-w-xs leading-relaxed">
                  Attach a report file on the left and click "Markdown Everything" to parse.
                </p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* AI PROMPT & GUIDANCE CONTAINER */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800/80 p-5 rounded-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-500 animate-pulse" />
            <h3 className="text-xs font-black uppercase text-slate-700 dark:text-teal-400 tracking-wider">
              Gemini 3.6 Flash Extraction Prompt & Ingest
            </h3>
            <select
              value={aiModel}
              onChange={(e) => setAiModel(e.target.value)}
              className="text-[9px] bg-emerald-500/10 text-emerald-600 dark:text-teal-400 border border-emerald-500/25 px-2 py-0.5 rounded-full font-bold outline-none cursor-pointer hover:bg-emerald-500/20 transition-colors"
            >
              <option value="gemini-3.6-flash">Model: Gemini 3.6 Flash</option>
              <option value="gemini-1.5-pro">Model: Gemini 1.5 Pro</option>
              <option value="gemini-1.5-flash">Model: Gemini 1.5 Flash</option>
            </select>
          </div>
          {hasApiKey ? (
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  const finalPrompt = getPromptTemplate();
                  navigator.clipboard.writeText(finalPrompt);
                  setPromptCopied(true);
                  setTimeout(() => setPromptCopied(false), 2000);
                }}
                className="text-[10px] font-black uppercase tracking-wider bg-white dark:bg-zinc-800 hover:bg-emerald-500/10 hover:text-emerald-500 border border-slate-200 dark:border-zinc-700 px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer transition-all"
              >
                {promptCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" /> Prompt Copied!
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" /> Copy Custom Ingest Prompt
                  </>
                )}
              </button>
              <button
                onClick={handleExtractAll}
                disabled={isExtractingAi || !convertedMarkdown}
                className="text-[10px] font-black uppercase tracking-wider bg-emerald-500 text-white hover:bg-emerald-600 border border-emerald-600 px-4 py-2 rounded-lg flex items-center gap-2 cursor-pointer transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isExtractingAi ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Extracting with {aiModel}...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" /> Extract All with {aiModel}
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-red-500 dark:text-red-400 bg-red-500/10 px-2.5 py-1.5 rounded-lg font-bold border border-red-500/20">
                No API Key
              </span>
              <button
                onClick={() => {
                  const finalPrompt = getPromptTemplate();
                  navigator.clipboard.writeText(finalPrompt);
                  setPromptCopied(true);
                  setTimeout(() => setPromptCopied(false), 2000);
                }}
                className="text-[10px] font-black uppercase tracking-wider bg-white dark:bg-zinc-800 hover:bg-emerald-500/10 hover:text-emerald-500 border border-slate-200 dark:border-zinc-700 px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer transition-all"
              >
                {promptCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" /> Prompt Copied!
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" /> Copy Custom Ingest Prompt
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        <div className="space-y-4 text-xs leading-relaxed text-slate-600 dark:text-zinc-300">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
            <p className="text-[10px] text-slate-400 dark:text-zinc-400 leading-normal">
              Click <strong>"Extract All with {aiModel}"</strong> to run automated AI extraction directly into Fincore JSON schema format, or copy the custom prompt template below for manual processing.
            </p>
          </div>

          <div className="flex flex-col rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-black overflow-hidden font-mono text-[11px] transition-all">
            {/* Window Title Bar */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-100 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 select-none">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-400 dark:bg-red-500/30 border border-red-500/10"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 dark:bg-amber-500/30 border border-amber-500/10"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 dark:bg-emerald-500/30 border border-emerald-500/10"></span>
                </div>
                <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-bold ml-2">prompt_template.json</span>
              </div>
              <div className="flex items-center gap-2">
                {convertedMarkdown ? (
                  <span className="text-[9px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 px-2 py-0.5 rounded-full font-bold">
                    Markdown Loaded ({(convertedMarkdown.length / 1024).toFixed(1)} KB)
                  </span>
                ) : (
                  <span className="text-[9px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25 px-2 py-0.5 rounded-full font-bold">
                    No Markdown Yet
                  </span>
                )}
              </div>
            </div>

            {/* Editor Content Area */}
            <div className="p-4 overflow-y-auto max-h-[280px] leading-relaxed text-slate-700 dark:text-zinc-300">
              {/* System Prompt Instructions */}
              <div className="mb-4 pb-4 border-b border-slate-200 dark:border-zinc-800/60">
                <span className="text-pink-500 dark:text-pink-400 font-bold">// System Instructions</span>
                <p className="mt-1 text-slate-500 dark:text-zinc-450 whitespace-pre-wrap italic">
                  As professional auditor, convert markdown into JSON. Use the formula to calculate if any value is missing but derivable, else leave as 0. STRICTLY double check all the values ensuring that all the values are correct for the financial year.
                </p>
              </div>

              {/* Markdown Source Section */}
              <div className="mb-4 pb-4 border-b border-slate-200 dark:border-zinc-800/60">
                <span className="text-sky-500 dark:text-sky-450 font-bold">// Injected Markdown Data</span>
                <div className="mt-1.5 p-2.5 bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-850 rounded-lg text-slate-500 dark:text-zinc-400">
                  {convertedMarkdown ? (
                    <div className="flex items-center justify-between">
                      <span className="text-amber-600 dark:text-amber-400/90 italic">"[Extracted markdown data of {mdFile?.name || "report"} will be injected here]"</span>
                      <span className="text-[9px] text-zinc-500 font-normal">{(convertedMarkdown.length).toLocaleString()} chars</span>
                    </div>
                  ) : (
                    <span className="text-amber-500/80 italic">"[No markdown extracted yet. Parse a report on the left first]"</span>
                  )}
                </div>
              </div>

              {/* Target JSON Payload Structure */}
              <div>
                <span className="text-emerald-500 dark:text-emerald-400 font-bold">// Output JSON Schema & Formulas</span>
                <div className="mt-2 pl-2 border-l-2 border-slate-200 dark:border-zinc-800 font-mono text-[10.5px]">
                  {renderHighlightedJson(getJSONSchemaOnly())}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* JSON PASTE & SAVE TO DB CONTAINER */}
      <div className="bg-white dark:bg-black/40 border border-slate-200 dark:border-zinc-850 p-5 rounded-2xl space-y-4">
        <h4 className="text-xs font-black uppercase text-slate-700 dark:text-zinc-300 tracking-wider flex items-center gap-2">
          <Database className="w-4 h-4 text-emerald-500" /> 3. Paste Generated JSON & Save to Platform DB
        </h4>
        <p className="text-[10px] text-slate-400">
          Paste the completed JSON object below. The system will convert this payload into the platform's standard XML format and save it securely inside the server storage system.
        </p>

        <textarea
          value={userPastedJson}
          onChange={(e) => {
            setUserPastedJson(e.target.value);
            setIngestStatus(null);
          }}
          placeholder='Paste valid structured JSON here (e.g. { "companyName": "...", "year": "2024", ... })'
          className="w-full h-[240px] bg-white dark:bg-zinc-950 border border-slate-250 dark:border-zinc-800 p-4 rounded-xl font-mono text-[11px] text-slate-800 dark:text-zinc-300 focus:outline-none focus:border-emerald-500"
        />

        {ingestStatus && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "p-4 rounded-xl text-xs font-bold leading-relaxed flex items-start gap-3",
              ingestStatus.type === "success"
                ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                : "bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400"
            )}
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{ingestStatus.message}</span>
          </motion.div>
        )}

        <button
          onClick={handleIngestJson}
          disabled={!userPastedJson.trim() || isIngestingJson}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 rounded-xl text-xs tracking-[0.25em] flex items-center justify-center gap-3 shadow-md transition-all uppercase cursor-pointer"
        >
          {isIngestingJson ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> WRITING XML RECORDS TO SERVER...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" /> COMMIT & SAVE EXTERNALLY GENERATED JSON (AS XML)
            </>
          )}
        </button>
      </div>
    </div>
  );
}
