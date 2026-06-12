import React, { useState, useEffect, useCallback } from "react";
import { TrendingUp, Plus, BarChart3, History } from "lucide-react";
import { AnimatePresence } from "motion/react";
import { ParsedDocument, CompanyReport, ArchiveEntry, Financials } from "./types";
import { NavBtn } from "./components/NavBtn";
import { UploadView } from "./components/UploadView";
import { DashboardView } from "./components/MatrixView";
import { ArchiveView } from "./components/ArchiveView";
import { DocumentViewerOverlay } from "./components/DocumentViewerOverlay";

export default function App() {
  const [reports, setReports] = useState<CompanyReport[]>([]);
  const [year, setYear] = useState("2025");
  const [sector, setSector] = useState("TECHNOLOGY");
  const [view, setView] = useState<"upload" | "dashboard" | "archive">("upload");
  const [archive, setArchive] = useState<ArchiveEntry[]>([]);
  const [selectedReport, setSelectedReport] = useState<CompanyReport | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // Upload workflow state
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [parsedDocuments, setParsedDocuments] = useState<ParsedDocument[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadStep, setUploadStep] = useState<"select" | "review">("select");
  const [useAi, setUseAi] = useState(false); // Choose whether to use AI on Ingest (Highly Recommended)
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  const [isAppendingDocuments, setIsAppendingDocuments] = useState(false);

  // AI insights
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  // Edit mode for dashboard
  const [editingReport, setEditingReport] = useState<CompanyReport | null>(null);

  const parseFiles = async (files: File[]): Promise<ParsedDocument[]> => {
    const formData = new FormData();
    files.forEach((f) => formData.append("reports", f));
    formData.append("useAi", useAi ? "true" : "false");

    const res = await fetch("/api/parse", { method: "POST", body: formData });
    const responseText = await res.text();
    let data: any = {};
    try {
      data = responseText ? JSON.parse(responseText) : {};
    } catch {
      throw new Error(responseText.slice(0, 300) || "Server returned a non-JSON response");
    }
    if (!res.ok) {
      throw new Error(data.error || "Failed to parse uploaded documents");
    }

    return (data.parsed || []).map((p: any) => ({
      ...p,
      companyName: p.suggestedCompanyName,
      isExpanded: true,
    }));
  };

  const mergeFinancialsWithParsedDocuments = (current: Financials, docs: ParsedDocument[]): Financials => {
    const merged: Financials = {
      incomeStatement: { ...current.incomeStatement },
      balanceSheet: { ...current.balanceSheet },
      cashFlow: { ...current.cashFlow },
      ratios: { ...(current.ratios || {}) },
      growth: { ...(current.growth || {}) },
      advanced: { ...(current.advanced || {}) },
    };

    for (const doc of docs) {
      for (const [category, fields] of Object.entries(doc.extractedData)) {
        const targetCategory = category as keyof Financials;
        if (!merged[targetCategory]) {
          (merged as any)[targetCategory] = {};
        }

        for (const [fieldId, field] of Object.entries(fields)) {
          const existingValue = (merged[targetCategory] as any)[fieldId];
          if ((existingValue === null || existingValue === undefined || existingValue === "") && field.value) {
            (merged[targetCategory] as any)[fieldId] = field.value;
          }
        }
      }
    }

    return merged;
  };

  const appendReportSources = (report: CompanyReport, docs: ParsedDocument[]): CompanyReport => {
    const existingMarkdown = report.Markdown?.pureMarkdown || "";
    const newMarkdown = docs.map((doc) => doc.markdown?.pureMarkdown).filter(Boolean).join("\n\n");
    const originalNames = [
      report.Metadata.OriginalFileName,
      ...docs.map((doc) => doc.originalFileName),
    ].filter(Boolean);

    return {
      ...report,
      Metadata: {
        ...report.Metadata,
        OriginalFileName: Array.from(new Set(originalNames)).join("; "),
      },
      Markdown: {
        pureMarkdown: [existingMarkdown, newMarkdown].filter(Boolean).join("\n\n"),
      },
    };
  };

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
    console.log("App mounted");
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
    console.log("files object:", e.target.files);
    console.log("files length:", e.target.files?.length);

    if (e.target.files) {
      const files = Array.from(e.target.files);

      setPendingFiles((prev) => {
        const next = [...prev, ...files];
        // console.log("NEXT =", next.length);
        return next;
      });
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files).filter(
      (f: File) => f.type === "application/pdf" || f.type.startsWith("image/")
    );
    if (files.length > 0) setPendingFiles((prev) => [...prev, ...files]);
  };

  const handleParse = async () => {
    if (pendingFiles.length === 0) return;
    setIsParsing(true);

    try {
      const docs = await parseFiles(pendingFiles);
      setParsedDocuments(docs);
      setPendingFiles([]);
      setUploadStep("review");
    } catch (err) {
      console.error(err);
    } finally {
      setIsParsing(false);
    }
  };

  const handleAiReanalyze = async (storedFileName: string, docType: string, markdown?: string) => {
    setIsReanalyzing(true);
    try {
      const res = await fetch("/api/ai-reanalyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storedFileName, docType, markdown }),
      });
      const data = await res.json();
      if (data.success) {
        if (editingReport) {
          setEditingReport({
            ...editingReport,
            Financials: data.extractedFinancials,
          });
        } else if (selectedReport) {
          setEditingReport({
            ...selectedReport,
            Financials: data.extractedFinancials,
          });
        }
      } else {
        throw new Error(data.error || "Failed to re-analyze with AI");
      }
    } catch (err: any) {
      console.error("[GEMINI AI Error]:", err);
    } finally {
      setIsReanalyzing(false);
    }
  };

  const handleAppendDocumentsToReport = async (files: File[]) => {
    const baseReport = editingReport || selectedReport;
    if (!baseReport || files.length === 0) return;

    setIsAppendingDocuments(true);
    try {
      const docs = await parseFiles(files);
      const reportWithSources = appendReportSources(baseReport, docs);
      const mergedFinancials = mergeFinancialsWithParsedDocuments(reportWithSources.Financials, docs);
      setEditingReport({
        ...reportWithSources,
        Financials: mergedFinancials,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsAppendingDocuments(false);
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
        markdown: doc.markdown,
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


  return (
    <div className="min-h-screen bg-hacker-bg text-slate-800 font-sans overflow-x-hidden">
      <div className="scanline" />

      {/* Grid background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 opacity-[0.4] bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:48px_48px]" />
      </div>

      {/* Sidebar */}
      <nav className="fixed left-0 top-0 bottom-0 w-[72px] bg-white border-r border-hacker-border flex flex-col items-center py-8 gap-8 z-50 shadow-sm">
        <div className="flex flex-col items-center mb-4">
          <div className="w-10 h-10 border border-hacker-green flex items-center justify-center bg-teal-50/50 rounded-lg">
            <TrendingUp className="w-5 h-5 text-hacker-green" />
          </div>
          <span className="text-[8px] font-bold tracking-[0.3em] mt-2 text-hacker-green-dim">FINCORE</span>
        </div>
        <NavBtn
          icon={<Plus />}
          label="INGEST"
          active={view === "upload"}
          onClick={() => {
            setView("upload");
            setUploadStep("select");
            setParsedDocuments([]);
          }}
        />
        <NavBtn
          icon={<BarChart3 />}
          label="MATRIX"
          active={view === "dashboard"}
          onClick={() => setView("dashboard")}
        />
        <NavBtn
          icon={<History />}
          label="ARCHIVE"
          active={view === "archive"}
          onClick={() => setView("archive")}
        />

        <div className="mt-auto flex flex-col items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-hacker-green animate-pulse" />
          <span className="text-[8px] text-hacker-green-dim tracking-widest">LIVE</span>
        </div>
      </nav>

      <main className="ml-[72px] min-h-screen p-8 lg:p-12 relative z-10">
        <AnimatePresence mode="wait">
          {view === "upload" && (
            <UploadView
              key={"upload"}
              uploadStep={uploadStep}
              year={year}
              setYear={setYear}
              sector={sector}
              setSector={setSector}
              dragOver={dragOver}
              setDragOver={setDragOver}
              pendingFiles={pendingFiles}
              setPendingFiles={setPendingFiles}
              isParsing={isParsing}
              isSaving={isSaving}
              parsedDocuments={parsedDocuments}
              handleDrop={handleDrop}
              handleFileChange={handleFileChange}
              handleParse={handleParse}
              handleSaveAll={handleSaveAll}
              setUploadStep={setUploadStep}
              updateDocumentName={updateDocumentName}
              updateDocumentField={updateDocumentField}
              toggleDocumentExpanded={toggleDocumentExpanded}
              removeDocument={removeDocument}
              addMoreDocuments={addMoreDocuments}
              useAi={useAi}
              setUseAi={setUseAi}
            />
          )}

          {view === "dashboard" && (
            <DashboardView
              key="dashboard"
              reports={reports}
              sector={sector}
              year={year}
              setView={setView}
              setSelectedReport={setSelectedReport}
              generateAIInsights={generateAIInsights}
              isGeneratingAi={isGeneratingAi}
              aiInsight={aiInsight}
            />
          )}

          {view === "archive" && (
            <ArchiveView
              key="archive"
              archive={archive}
              setView={setView}
              loadReports={loadReports}
            />
          )}
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {selectedReport && (
          <DocumentViewerOverlay
            report={selectedReport}
            onClose={() => {
              setSelectedReport(null);
              setEditingReport(null);
            }}
            isEditing={editingReport !== null}
            onStartEdit={() => setEditingReport(JSON.parse(JSON.stringify(selectedReport)))}
            editingReport={editingReport}
            onEditChange={(financials) => {
              if (editingReport) {
                setEditingReport({ ...editingReport, Financials: financials });
              }
            }}
            onCompanyNameChange={(companyName) => {
              if (editingReport) {
                setEditingReport({
                  ...editingReport,
                  Metadata: {
                    ...editingReport.Metadata,
                    CompanyName: companyName,
                  },
                });
              }
            }}
            onSaveEdit={async () => {
              if (!editingReport) return;
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
                      markdown: editingReport.Markdown,
                    }],
                    year: editingReport.Metadata.FinancialYear,
                    sector: editingReport.Metadata.Sector,
                  }),
                });
                console.log(res);
                if (res.ok) {
                  await loadReports(editingReport.Metadata.FinancialYear, editingReport.Metadata.Sector);
                  setSelectedReport(null);
                  setEditingReport(null);
                }
              } catch (err) {
                console.error(err);
              }
            }}
            onCancelEdit={() => setEditingReport(null)}
            onAppendDocuments={handleAppendDocumentsToReport}
            isAppendingDocuments={isAppendingDocuments}
            onAiReanalyze={handleAiReanalyze}
            isReanalyzing={isReanalyzing}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
