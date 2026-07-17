import React, { useState, useEffect, useCallback } from "react";
import { TrendingUp, Plus, BarChart3, History, ShieldCheck, Newspaper } from "lucide-react";
import { AnimatePresence } from "motion/react";
import { ParsedDocument, CompanyReport, ArchiveEntry, Financials } from "./types";
import { NavBtn } from "./components/NavBtn";
import { UploadView } from "./components/UploadView";
import { DashboardView } from "./components/DashboardView";
import { DocumentViewerOverlay } from "./components/DocumentViewerOverlay";
import { NewsView } from "./components/NewsView";
import { FinCoreView } from "./components/FinCoreView";
import { InfoView } from "./components/InfoView";
import { ThemeToggle } from "./components/ThemeToggle";
import { TempView } from "./temp";
import SplashCursor from "./components/SplashCursor";
import InteractiveGrid from "./components/InteractiveGrid";
import { style } from "motion/react-client";
import favicon from "../public/favicon.png";

export default function App() {
  const [reports, setReports] = useState<CompanyReport[]>([]);
  const [year, setYear] = useState("2025");
  const [sector, setSector] = useState("TECHNOLOGY");
  const [view, setView] = useState<"upload" | "dashboard" | "archive" | "news" | "fincore" | "info">("info");
  const [archive, setArchive] = useState<ArchiveEntry[]>([]);
  const [selectedReport, setSelectedReport] = useState<CompanyReport | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // Upload workflow state
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [parsedDocuments, setParsedDocuments] = useState<ParsedDocument[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadStep, setUploadStep] = useState<"select" | "review">("select");
  const [useAi, setUseAi] = useState(true); // Choose whether to use AI on Ingest (Highly Recommended)
  const [isReanalyzing, setIsReanalyzing] = useState(false);

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

  const loadReports = async (y: string, s: string, overrideView?: "upload" | "dashboard" | "archive" | "news" | "fincore" | "info") => {
    try {
      setAiInsight(null);
      const res = await fetch(`/api/reports-multi/${y}/${s}`);
      const data = await res.json();
      const arr = Array.isArray(data) ? data : [data];
      setReports(arr.filter(Boolean));
      setYear(y);
      setSector(s);
      setView(overrideView || "dashboard");
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

    const formData = new FormData();
    pendingFiles.forEach((f) => formData.append("reports", f));
    formData.append("useAi", useAi ? "true" : "false");

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

  const handleAiReanalyze = async (storedFileName: string, docType: string) => {
    setIsReanalyzing(true);
    try {
      const res = await fetch("/api/ai-reanalyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storedFileName, docType }),
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
        year: doc.year || year,
        sector: doc.sector || sector,
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

  const updateDocumentYear = (docIndex: number, docYear: string) => {
    setParsedDocuments((prev) =>
      prev.map((doc, i) => (i === docIndex ? { ...doc, year: docYear } : doc))
    );
  };

  const updateDocumentSector = (docIndex: number, docSector: string) => {
    setParsedDocuments((prev) =>
      prev.map((doc, i) => (i === docIndex ? { ...doc, sector: docSector } : doc))
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

  // Add this hook inside your App component, after state declarations:
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({
        x: (e.clientX / window.innerWidth - 0.5) * 30,  // -15 to +15px shift
        y: (e.clientY / window.innerHeight - 0.5) * 30,
      });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div className="min-h-screen bg-hacker-bg text-slate-800 font-sans overflow-x-hidden">
      <div className="scanline" />

      {/* Splash Cursor effect */}
      <SplashCursor
        RAINBOW_MODE={false}
        COLOR="var(--color-splash-cursor)"
        DENSITY_DISSIPATION={4}
        VELOCITY_DISSIPATION={2.5}
        SPLAT_RADIUS={0.15}
        TRANSPARENT={true}
      />

      {/* Interactive Grid */}
      <InteractiveGrid />

      {/* Floating Theme Toggle */}
      <ThemeToggle />

      {/* Sidebar */}
      <nav className="fixed left-0 top-0 bottom-0 w-[75px] border-r border-hacker-border flex flex-col items-center py-8 gap-8 z-50 shadow-sm" style={{ backgroundColor: "var(--color-sidebar-bckgrd-color)" }}>
        <button
          onClick={() => setView("info")}
          className={`flex flex-col items-center mb-4 group cursor-pointer transition-all hover:scale-105 ${view === "info" ? "scale-105" : ""}`}
        >
          <div className={`w-10 h-10 border flex items-center justify-center rounded-lg transition-all ${view === "info" ? "border-emerald-600 bg-emerald-50 text-emerald-800" : "border-emerald-600 bg-emerald-50 text-emerald-800 group-hover:border-hacker-green group-hover:text-hacker-green"}`}>
            <img
              src={favicon}
              alt="Favicon"
              className="w-full h-full object-contain"
            />
          </div>
          <span
            className="text-[8px] text-hacker-text-main font-extrabold tracking-[0.3em] mt-2 transition-colors"
            style={{
              color:
                view === "news"
                  ? "var(color-sidebar-icon-active)"
                  : "var(color-sidebar-core-text)"
            }}
          >
            CORE
          </span>
        </button>

        <NavBtn
          icon={<Newspaper />}
          label="NEWS"
          active={view === "news"}
          onClick={() => {
            setView("news")
          }}
        />
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
          icon={<ShieldCheck />}
          label="FINCORE"
          active={view === "fincore"}
          onClick={() => setView("fincore")}
        />

        <div className="mt-auto flex flex-col items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-sidebar-icon-active animate-pulse" />
          <span className="text-[8px] text-hacker-text-main tracking-widest">LIVE</span>
        </div>
      </nav>

      <main className="ml-[72px] min-h-screen relative z-10">
        <AnimatePresence mode="wait">
          {view === "upload" && (
            <UploadView
              key="upload"
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
              updateDocumentYear={updateDocumentYear}
              updateDocumentSector={updateDocumentSector}
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
              archive={archive}
              loadReports={loadReports}
            />
          )}

          {view === "fincore" && (
            <FinCoreView
              key="fincore"
              reports={reports}
              sector={sector}
              year={year}
              setView={setView}
              setSelectedReport={setSelectedReport}
              archive={archive}
              loadReports={loadReports}
            />
          )}

          {view === "news" && (
            <NewsView key="news" />
          )}

          {view === "info" && (
            <InfoView key="info" />
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
            onStartEdit={() => setEditingReport({ ...selectedReport })}
            editingReport={editingReport}
            onEditChange={(financials) => {
              if (editingReport) {
                setEditingReport({ ...editingReport, Financials: financials });
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
                    }],
                    year: editingReport.Metadata.FinancialYear,
                    sector: editingReport.Metadata.Sector,
                  }),
                });
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
            onAiReanalyze={handleAiReanalyze}
            isReanalyzing={isReanalyzing}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
