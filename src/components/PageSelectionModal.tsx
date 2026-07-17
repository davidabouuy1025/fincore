import React, { useState, useEffect, useRef } from "react";
import {
  X,
  ZoomIn,
  ZoomOut,
  AlertCircle,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { Document, Page, pdfjs } from "react-pdf";

// Configure worker using CDN unpkg for maximum compatibility
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version || "4.4.168"}/build/pdf.worker.min.mjs`;

interface PageSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyName: string;
  initialSelectedPages: string;
  onApply: (selectedPages: string) => void;
  getMockDocumentContent?: (company: string, page: number) => React.ReactNode;
  files?: File[];
  storedFileName?: string;
  docType?: string;
}

export function PageSelectionModal({
  isOpen,
  onClose,
  companyName,
  initialSelectedPages,
  onApply,
  getMockDocumentContent,
  files,
  storedFileName,
  docType,
}: PageSelectionModalProps) {
  const [previewPage, setPreviewPage] = useState<number>(1);
  const [previewZoom, setPreviewZoom] = useState<number>(100);
  const [previewFit, setPreviewFit] = useState<"width" | "page">("width");
  const [modalSelectedPages, setModalSelectedPages] = useState<string>(initialSelectedPages);
  const [rangeFrom, setRangeFrom] = useState<string>("10");
  const [rangeTo, setRangeTo] = useState<string>("20");
  const [jumpPageInput, setJumpPageInput] = useState<string>("1");
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [visibleRatios, setVisibleRatios] = useState<Record<number, number>>({});

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setModalSelectedPages(initialSelectedPages);
  }, [initialSelectedPages]);

  useEffect(() => {
    if (files && files.length > 0) {
      const file = files[0];
      const url = URL.createObjectURL(file);
      setObjectUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setObjectUrl(null);
    }
  }, [files]);

  // Helper to parse page range
  const parsePagesRange = (rangeStr: string, totalPages?: number): number[] => {
    if (!rangeStr) return [];
    const clean = rangeStr.replace(/[()\[\]]/g, "").trim();
    if (clean.toLowerCase() === "all" || !clean) return [];

    const pages: number[] = [];
    const parts = clean.split(",");
    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      if (trimmed.includes("-")) {
        const subparts = trimmed.split("-");
        const start = parseInt(subparts[0].trim(), 10);
        const end = parseInt(subparts[1]?.trim() || "", 10);
        if (!isNaN(start) && !isNaN(end)) {
          const minVal = Math.min(start, end);
          const maxVal = Math.max(start, end);
          for (let i = minVal; i <= maxVal; i++) {
            if (i > 0 && (!totalPages || i <= totalPages)) {
              pages.push(i);
            }
          }
        }
      } else {
        const num = parseInt(trimmed, 10);
        if (!isNaN(num) && num > 0 && (!totalPages || num <= totalPages)) {
          pages.push(num);
        }
      }
    }
    return Array.from(new Set(pages)).sort((a, b) => a - b);
  };

  const isImage = docType === "IMAGE" || (files && files.length > 0 && files[0].type.startsWith("image/"));
  const isPdf = !isImage && (storedFileName || (files && files.length > 0 && files[0].type === "application/pdf"));

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setRangeFrom("1");
    setRangeTo(String(Math.min(10, numPages)));
  };

  const resolvedPages = isPdf
    ? (modalSelectedPages.trim() && modalSelectedPages.trim().toLowerCase() !== "all"
        ? parsePagesRange(modalSelectedPages, numPages || undefined)
        : Array.from({ length: numPages || 0 }, (_, i) => i + 1))
    : (modalSelectedPages.trim() && modalSelectedPages.trim().toLowerCase() !== "all"
        ? parsePagesRange(modalSelectedPages, 412)
        : Array.from({ length: 412 }, (_, i) => i + 1));

  // Scroll a specific page into view
  const scrollToPage = (pageNum: number) => {
    if (!containerRef.current) return;
    const element = containerRef.current.querySelector(`[data-page-number="${pageNum}"]`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // IntersectionObserver to monitor which page is most visible in viewport
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !isOpen) return;

    const observer = new IntersectionObserver(
      (entries) => {
        setVisibleRatios((prev) => {
          const next = { ...prev };
          entries.forEach((entry) => {
            const pageNumAttr = entry.target.getAttribute("data-page-number");
            if (pageNumAttr) {
              const pageNum = parseInt(pageNumAttr, 10);
              next[pageNum] = entry.intersectionRatio;
            }
          });
          return next;
        });
      },
      {
        root: container,
        threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0],
      }
    );

    // Give a small delay to let react-pdf render and mount the page containers
    const timer = setTimeout(() => {
      const pageElements = container.querySelectorAll("[data-page-number]");
      pageElements.forEach((el) => observer.observe(el));
    }, 500);

    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [resolvedPages, isOpen]);

  // Track the page with highest visible ratio
  useEffect(() => {
    let highestPage = previewPage;
    let maxRatio = -0.01;
    Object.entries(visibleRatios).forEach(([pageStr, ratio]) => {
      const pageNum = parseInt(pageStr, 10);
      if (resolvedPages.includes(pageNum) && ratio > maxRatio) {
        maxRatio = ratio;
        highestPage = pageNum;
      }
    });

    if (maxRatio >= 0 && highestPage !== previewPage) {
      setPreviewPage(highestPage);
      setJumpPageInput(String(highestPage));
    }
  }, [visibleRatios, resolvedPages]);

  // Dynamically update the batch range select inputs (rangeFrom, rangeTo) based on the user's scroll / current previewPage
  useEffect(() => {
    if (!isOpen) return;
    const current = previewPage;
    const fromVal = parseInt(rangeFrom, 10);

    if (isNaN(fromVal)) {
      setRangeFrom(String(current));
      return;
    }

    if (current >= fromVal) {
      setRangeTo(String(current));
    } else {
      setRangeFrom(String(current));
      setRangeTo(String(fromVal));
    }
  }, [previewPage, isOpen]);

  // Reset preview page indicator and scroll to top whenever the page filter/selection changes
  useEffect(() => {
    if (!isOpen) return;

    const isAll = !modalSelectedPages.trim() || modalSelectedPages.trim().toLowerCase() === "all";

    const currentResolved = isPdf
      ? (!isAll
          ? parsePagesRange(modalSelectedPages, numPages || undefined)
          : Array.from({ length: numPages || 0 }, (_, i) => i + 1))
      : (!isAll
          ? parsePagesRange(modalSelectedPages, 412)
          : Array.from({ length: 412 }, (_, i) => i + 1));

    const firstPage = currentResolved[0] || 1;

    setPreviewPage(firstPage);
    setJumpPageInput(String(firstPage));

    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [modalSelectedPages, isOpen, isPdf, numPages]);

  if (!isOpen) return null;

  const renderPreviewContent = () => {
    if (objectUrl && isImage) {
      return (
        <div className="w-full flex items-center justify-center p-4 bg-slate-50 dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800">
          <img
            src={objectUrl}
            alt="Uploaded Preview"
            referrerPolicy="no-referrer"
            className="max-w-full max-h-[50vh] object-contain rounded-lg shadow-md"
          />
        </div>
      );
    }

    if (storedFileName && isImage) {
      return (
        <div className="w-full flex items-center justify-center p-4 bg-slate-50 dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800">
          <img
            src={`/reports/${storedFileName}`}
            alt="Stored Preview"
            referrerPolicy="no-referrer"
            className="max-w-full max-h-[50vh] object-contain rounded-lg shadow-md"
          />
        </div>
      );
    }

    if (isPdf) {
      const pdfFile = files && files.length > 0 ? files[0] : `/reports/${storedFileName}`;
      if (!pdfFile) {
        return (
          <div className="flex flex-col items-center justify-center p-12 text-slate-500 font-mono text-[11px] uppercase tracking-widest gap-2">
            <span>No PDF source found</span>
          </div>
        );
      }

      return (
        <Document
          file={pdfFile}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={
            <div className="flex flex-col items-center justify-center p-12 text-slate-500 font-mono text-[11px] uppercase tracking-widest gap-2">
              <span className="animate-pulse">Loading PDF Document...</span>
            </div>
          }
          error={
            <div className="flex flex-col items-center justify-center p-12 text-red-500 font-mono text-[11px] uppercase tracking-widest gap-2">
              <span>Failed to load PDF</span>
            </div>
          }
        >
          {resolvedPages.map((pageNum) => (
            <div
              key={pageNum}
              data-page-number={pageNum}
              className="pdf-page-wrapper mb-6 bg-white dark:bg-zinc-900 p-2 shadow-md rounded-lg border border-slate-200/60 dark:border-zinc-800/50"
              style={{
                transform: `scale(${previewZoom / 100})`,
                transformOrigin: "top center",
                transition: "transform 0.15s ease",
                display: "inline-block",
                maxWidth: "100%",
              }}
            >
              <Page
                pageNumber={pageNum}
                renderTextLayer={false}
                renderAnnotationLayer={false}
                width={previewFit === "width" ? 550 : undefined}
                height={previewFit === "page" ? 450 : undefined}
                loading={
                  <div className="h-48 flex items-center justify-center text-[10px] font-mono text-slate-400">
                    Rendering page {pageNum}...
                  </div>
                }
              />
              <div className="text-center mt-2 text-[9px] font-mono font-bold text-slate-400 border-t border-slate-100 dark:border-zinc-800 pt-1">
                PAGE {pageNum} OF {numPages || "?"}
              </div>
            </div>
          ))}
        </Document>
      );
    }

    if (getMockDocumentContent) {
      return getMockDocumentContent(companyName, previewPage);
    }
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-500 font-mono text-[11px] uppercase tracking-widest gap-2">
        <span>No PDF source found</span>
      </div>
    );
  };

  // Add specific page to selection
  const addPageToModalSelection = (pageNum: number) => {
    const current = modalSelectedPages.trim();
    if (!current) {
      setModalSelectedPages(String(pageNum));
      return;
    }
    const parts = current.split(",").map((p) => p.trim());
    if (!parts.includes(String(pageNum))) {
      setModalSelectedPages([...parts, String(pageNum)].join(","));
    }
  };

  // Remove specific page from selection
  const removePageFromModalSelection = (pageNum: number) => {
    const current = modalSelectedPages.trim();
    if (!current) return;
    const parts = current.split(",").map((p) => p.trim());
    const filtered = parts.filter((p) => p !== String(pageNum));
    setModalSelectedPages(filtered.join(","));
  };

  // Add range of pages (e.g. 45-60)
  const addRangeToModalSelection = () => {
    const from = parseInt(rangeFrom, 10);
    const to = parseInt(rangeTo, 10);
    const maxVal = isPdf ? (numPages || 412) : 412;
    if (isNaN(from) || isNaN(to) || from > to || from < 1 || from > maxVal || to > maxVal) return;
    const rangeStr = `${from}-${to}`;
    const current = modalSelectedPages.trim();
    if (!current) {
      setModalSelectedPages(rangeStr);
    } else {
      const parts = current.split(",").map((p) => p.trim());
      if (!parts.includes(rangeStr)) {
        setModalSelectedPages([...parts, rangeStr].join(","));
      }
    }
  };

  // Check if page is currently in selection
  const isPageSelectedInModal = (pageNum: number) => {
    const parts = modalSelectedPages.split(",").map((p) => p.trim()).filter(Boolean);
    for (const part of parts) {
      if (part === String(pageNum)) return true;
      if (part.includes("-")) {
        const [start, end] = part.split("-").map(Number);
        if (pageNum >= start && pageNum <= end) return true;
      }
    }
    return false;
  };

  const handleJumpToPage = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseInt(jumpPageInput, 10);
    const maxVal = isPdf ? (numPages || 412) : 412;
    if (!isNaN(p) && p >= 1 && p <= maxVal) {
      setPreviewPage(p);
      scrollToPage(p);
    }
  };

  const handlePrevPage = () => {
    const currentIndex = resolvedPages.indexOf(previewPage);
    if (currentIndex > 0) {
      const prevPage = resolvedPages[currentIndex - 1];
      setPreviewPage(prevPage);
      setJumpPageInput(String(prevPage));
      scrollToPage(prevPage);
    } else if (previewPage > 1) {
      const prevPage = previewPage - 1;
      setPreviewPage(prevPage);
      setJumpPageInput(String(prevPage));
      scrollToPage(prevPage);
    }
  };

  const handleNextPage = () => {
    const currentIndex = resolvedPages.indexOf(previewPage);
    const maxVal = isPdf ? (numPages || 412) : 412;
    if (currentIndex !== -1 && currentIndex < resolvedPages.length - 1) {
      const nextPage = resolvedPages[currentIndex + 1];
      setPreviewPage(nextPage);
      setJumpPageInput(String(nextPage));
      scrollToPage(nextPage);
    } else if (previewPage < maxVal) {
      const nextPage = previewPage + 1;
      setPreviewPage(nextPage);
      setJumpPageInput(String(nextPage));
      scrollToPage(nextPage);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-850 w-full max-w-6xl h-[90vh] rounded-2xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="border-b border-slate-200 dark:border-zinc-850 px-6 py-4 flex items-center justify-between bg-slate-50 dark:bg-zinc-900/60">
          <div className="flex items-center gap-2">
            <span className="text-[10px] bg-teal-800 dark:bg-teal-700 text-white font-bold px-2.5 py-1 rounded tracking-wider uppercase">
              Page Selector
            </span>
            <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
              {companyName || "Corporate Ledger"} Ingest Range
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Split Panel body */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12">
          {/* Left Side: Document Preview Canvas */}
          <div className="md:col-span-8 p-6 overflow-y-auto bg-slate-50 dark:bg-black/30 flex flex-col justify-between h-full">
            {/* Toolbar */}
            <div className="flex flex-wrap gap-4 justify-between items-center mb-4 bg-white dark:bg-zinc-900/60 p-3 rounded-xl border border-slate-200 dark:border-zinc-850">
              <div className="flex items-center gap-3 text-xs">
                <span className="text-slate-400 font-extrabold uppercase text-[9px]">ZOOM:</span>
                <button
                  onClick={() => setPreviewZoom((z) => Math.max(50, z - 25))}
                  className="p-1.5 rounded-lg bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 text-slate-600 dark:text-zinc-300 cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="font-mono text-[11px] font-bold text-slate-700 dark:text-zinc-300 w-12 text-center">
                  {previewZoom}%
                </span>
                <button
                  onClick={() => setPreviewZoom((z) => Math.min(200, z + 25))}
                  className="p-1.5 rounded-lg bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 text-slate-600 dark:text-zinc-300 cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
              </div>

              {/* Jump to Page Control */}
              <form onSubmit={handleJumpToPage} className="flex items-center gap-2">
                <span className="text-slate-400 font-extrabold uppercase text-[9px]">JUMP:</span>
                <input
                  type="number"
                  min={1}
                  max={isPdf ? (numPages || 412) : 412}
                  value={jumpPageInput}
                  onChange={(e) => setJumpPageInput(e.target.value)}
                  className="w-16 bg-slate-100 dark:bg-zinc-850 border border-slate-200 dark:border-zinc-750 px-2 py-1 rounded text-center text-xs font-mono font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 dark:text-white"
                />
                <button
                  type="submit"
                  className="text-[9px] bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 font-black px-2.5 py-1.5 rounded-lg uppercase tracking-wider hover:bg-slate-300 cursor-pointer"
                >
                  GO
                </button>
              </form>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setPreviewFit("width");
                    setPreviewZoom(100);
                  }}
                  className={`text-[9px] font-black px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    previewFit === "width"
                      ? "bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-700 dark:text-teal-400 border border-emerald-500/25"
                      : "text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800"
                  }`}
                >
                  FIT WIDTH
                </button>
                <button
                  onClick={() => {
                    setPreviewFit("page");
                    setPreviewZoom(80);
                  }}
                  className={`text-[9px] font-black px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    previewFit === "page"
                      ? "bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-700 dark:text-teal-400 border border-emerald-500/25"
                      : "text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800"
                  }`}
                >
                  FIT PAGE
                </button>
              </div>
            </div>

            {/* Canvas viewport container */}
            <div
              ref={containerRef}
              className="flex-1 overflow-auto max-h-[50vh] md:max-h-[55vh] border border-slate-200/50 dark:border-zinc-800/40 rounded-xl bg-slate-100/50 dark:bg-black/10 p-4"
            >
              {isPdf ? (
                <div className="w-full flex flex-col items-center gap-6">
                  {renderPreviewContent()}
                </div>
              ) : (
                <div
                  style={{
                    transform: `scale(${previewZoom / 100})`,
                    transformOrigin: "center center",
                    transition: "transform 0.15s ease",
                    width: previewFit === "width" ? "100%" : "auto",
                  }}
                  className="max-w-xl mx-auto px-4"
                >
                  {renderPreviewContent()}
                </div>
              )}
            </div>

            {/* Pagination footer */}
            <div className="flex justify-between items-center mt-4">
              <button
                onClick={handlePrevPage}
                disabled={resolvedPages.indexOf(previewPage) <= 0 && previewPage <= 1}
                className="px-4 py-2 bg-white dark:bg-zinc-900 hover:bg-slate-50 border border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-zinc-200 rounded-xl font-black text-[10px] disabled:opacity-40 cursor-pointer flex items-center gap-1.5 uppercase tracking-wider"
              >
                <ChevronLeft className="w-4 h-4" /> PREV PAGE
              </button>
              <span className="text-xs font-black text-slate-500 font-mono tracking-wider">
                PAGE {previewPage} / {isPdf ? (numPages || "?") : 412}
              </span>
              <button
                onClick={handleNextPage}
                disabled={resolvedPages.indexOf(previewPage) >= resolvedPages.length - 1 && previewPage >= (isPdf ? (numPages || 412) : 412)}
                className="px-4 py-2 bg-white dark:bg-zinc-900 hover:bg-slate-50 border border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-zinc-200 rounded-xl font-black text-[10px] disabled:opacity-40 cursor-pointer flex items-center gap-1.5 uppercase tracking-wider"
              >
                NEXT PAGE <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Right Side: Sticky Panel Selected Pages Manager */}
          <div className="md:col-span-4 p-6 border-l border-slate-200 dark:border-zinc-850 flex flex-col justify-between bg-slate-50/50 dark:bg-zinc-950/20">
            <div className="space-y-6 overflow-y-auto max-h-[60vh] md:max-h-[65vh] pr-1">
              <div>
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-teal-400 mb-2">
                  Select Current Page
                </h3>
                <div className="flex items-center justify-between p-4 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-850 rounded-xl shadow-3xs">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                      Page {previewPage}
                    </span>
                    <span className="text-[9px] text-slate-400 font-mono">
                      {isPageSelectedInModal(previewPage) ? "Currently selected for parse" : "Not selected"}
                    </span>
                  </div>
                  {isPageSelectedInModal(previewPage) ? (
                    <button
                      onClick={() => removePageFromModalSelection(previewPage)}
                      className="bg-red-500 hover:bg-red-600 text-white text-[9px] font-black px-3.5 py-2 rounded-lg cursor-pointer transition-colors uppercase tracking-wider"
                    >
                      REMOVE PAGE
                    </button>
                  ) : (
                    <button
                      onClick={() => addPageToModalSelection(previewPage)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-black px-3.5 py-2 rounded-lg cursor-pointer transition-colors uppercase tracking-wider"
                    >
                      ADD PAGE
                    </button>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-teal-400 mb-2">
                  Batch Range Select
                </h3>
                <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-850 p-4 rounded-xl shadow-3xs space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-[8px] uppercase tracking-widest font-black text-slate-400 mb-1">
                        FROM PAGE
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={isPdf ? (numPages || 412) : 412}
                        value={rangeFrom}
                        onChange={(e) => setRangeFrom(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-750 px-2.5 py-1.5 rounded-lg font-mono text-center font-bold focus:outline-none focus:border-emerald-500 text-slate-800 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[8px] uppercase tracking-widest font-black text-slate-400 mb-1">
                        TO PAGE
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={isPdf ? (numPages || 412) : 412}
                        value={rangeTo}
                        onChange={(e) => setRangeTo(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-750 px-2.5 py-1.5 rounded-lg font-mono text-center font-bold focus:outline-none focus:border-emerald-500 text-slate-800 dark:text-white"
                      />
                    </div>
                  </div>
                  <button
                    onClick={addRangeToModalSelection}
                    className="w-full bg-slate-800 hover:bg-slate-900 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white text-[9px] font-black py-2.5 rounded-lg cursor-pointer transition-all uppercase tracking-wider"
                  >
                    ADD RANGE TO COHORT
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-teal-400 mb-2.5">
                  Active Page Cohorts
                </h3>
                <div className="bg-white dark:bg-zinc-900/40 border border-slate-200 dark:border-zinc-850 p-4 rounded-xl min-h-[120px] max-h-[180px] overflow-y-auto flex flex-wrap gap-2 items-start content-start">
                  {modalSelectedPages.trim() ? (
                    modalSelectedPages.split(",").map((p, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/25 text-emerald-700 dark:text-teal-400 font-mono text-[9px] font-black px-2.5 py-1.5 rounded-lg"
                      >
                        <span>{p}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const parts = modalSelectedPages.split(",");
                            const filtered = parts.filter((_, idx) => idx !== i);
                            setModalSelectedPages(filtered.join(","));
                          }}
                          className="hover:text-red-500 cursor-pointer transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center w-full h-full py-6 text-center text-slate-400 dark:text-zinc-500">
                      <AlertCircle className="w-5 h-5 mb-1.5 opacity-55" />
                      <span className="text-[9px] italic font-semibold">
                        No active filter (all pages will be parsed)
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-zinc-850 flex gap-3 mt-4">
              <button
                onClick={() => setModalSelectedPages("")}
                className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 font-black text-[10px] py-3.5 rounded-xl uppercase tracking-widest cursor-pointer transition-colors"
              >
                RESET
              </button>
              <button
                onClick={() => onApply(modalSelectedPages)}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] py-3.5 rounded-xl uppercase tracking-widest cursor-pointer transition-colors shadow-xs"
              >
                APPLY FILTER
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
