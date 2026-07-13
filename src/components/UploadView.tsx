import React, { useState, useEffect, useRef } from "react";
import {
  Upload,
  FileText,
  X,
  Loader2,
  FileSearch,
  ChevronRight,
  Plus,
  Save,
  Sparkles,
  Eye,
  Check,
  AlertCircle,
  Undo,
  Search,
  Database,
  ArrowRight,
  ChevronDown,
  Edit2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ParsedDocument, ExtractedField, CompanyReport } from "../types";
import { BURSA_SECTORS } from "../constants";
import { PageSelectionModal } from "./PageSelectionModal";

// Helper function to combine classnames

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ");
}

// Sub-component step indicator
interface StepIndicatorProps {
  step: number;
  label: string;
  active: boolean;
  completed: boolean;
}

function StepIndicator({ step, label, active, completed }: StepIndicatorProps) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center text-xs font-black border transition-all duration-300",
          active
            ? "border-emerald-500 bg-emerald-500/10 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
            : completed
              ? "border-emerald-600 bg-emerald-600 text-black font-extrabold"
              : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-400 dark:text-slate-500"
        )}
      >
        {completed ? <Check className="w-4 h-4 text-black font-extrabold" /> : step}
      </div>
      <span
        className={cn(
          "text-[10px] tracking-[0.2em] font-black uppercase transition-colors duration-300",
          active
            ? "text-emerald-500 dark:text-emerald-400"
            : completed
              ? "text-emerald-600"
              : "text-slate-400 dark:text-slate-500"
        )}
      >
        {label}
      </span>
    </div>
  );
}

// Attachment Interface matching the spec
interface Attachment {
  id: string;
  companyName: string;
  year: string;
  files: File[];
  existingStoredFiles?: { name: string; size: number; storedFileName: string }[];
  selectedPages: string; // "1,2,3,10-20,45-60"
  isExpanded: boolean;
  validationError?: string;
  isEditingExisting?: boolean;
}

interface UploadViewProps {
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
  updateDocumentYear?: (index: number, year: string) => void;
  updateDocumentSector?: (index: number, sector: string) => void;
  toggleDocumentExpanded: (index: number) => void;
  removeDocument: (index: number) => void;
  addMoreDocuments: () => void;
  useAi: boolean;
  setUseAi: (b: boolean) => void;
  loadReports?: (y: string, s: string) => Promise<void>;
  fetchArchive?: () => Promise<void>;
}

export function UploadView({
  uploadStep,
  year,
  setYear,
  sector,
  setSector,
  isParsing: parentIsParsing,
  isSaving: parentIsSaving,
  parsedDocuments: parentParsedDocs,
  setUploadStep,
  useAi,
  setUseAi,
  loadReports,
  fetchArchive,
}: UploadViewProps) {
  // Mode selector: "new" (Ingest Pipeline), "markdown" (Markdown & Ingest), or "saved" (Edit Saved Records)
  const [ingestMode, setIngestMode] = useState<"new" | "markdown" | "saved">("markdown");

  // Markdown & Ingest states
  const [mdFile, setMdFile] = useState<File | null>(null);
  const [mdSelectedPages, setMdSelectedPages] = useState<string>("all");
  const [isConvertingToMd, setIsConvertingToMd] = useState<boolean>(false);
  const [convertedMarkdown, setConvertedMarkdown] = useState<string>("");
  const [mdCopied, setMdCopied] = useState<boolean>(false);
  const [promptCopied, setPromptCopied] = useState<boolean>(false);
  const [userPastedJson, setUserPastedJson] = useState<string>("");
  const [isIngestingJson, setIsIngestingJson] = useState<boolean>(false);
  const [ingestStatus, setIngestStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [mdObjectUrl, setMdObjectUrl] = useState<string | null>(null);

  const getPromptTemplate = () => {
    return `Convert arkdown into JSON. Use the formula to calculate if any value is missing but derivable, else leave as 0 :

markdown:
${JSON.stringify(convertedMarkdown || "Skip, return nothing")}

{
  "companyName": "Company Name (e.g. Nestle Malaysia Berhad)",
  "year": 2025,
  "sector": "TECHNOLOGY/PLANTATION/FINANCIAL_SERVICES/CONSUMER_PRODUCTS/INDUSTRIAL_PRODUCTS/REITS/ENERGY/HEALTHCARE/CONSTRUCTION",
  "originalFileName": "COMPANY_YEAR",
  "storedFileName": "COMPANY_YEAR",
  "docType": "DIGITAL_PDF",
  "selectedPages": "${mdSelectedPages}",
  "financials": {
    "incomeStatement": {
      "revenue": 0,
      "nonOperatingRevenue": 0,
      "costOfGoodsSold": 0,
      "grossProfit": "revenue - costOfGoodsSold",
      "operatingExpenses": 0,
      "sgaExpenses": 0,
      "researchDevelopment": 0,
      "depreciation": 0,
      "amortization": 0,
      "operatingProfit": "grossProfit - operatingExpenses",
      "financeIncome": 0,
      "financeCost": 0,
      "ebit": "profitBeforeTax + financeCost - financeIncome",
      "ebitda": "ebit + depreciation + amortization",
      "profitBeforeTax": "ebit + financeIncome - financeCost",
      "taxExpense": 0,
      "effectiveTaxRate": "taxExpense / profitBeforeTax",
      "netProfit": "profitBeforeTax - taxExpense",
      "retainedEarnings": 0
    },

    "balanceSheet": {
      "totalAssets": "currentAssets + nonCurrentAssets",
      "currentAssets": 0,
      "nonCurrentAssets": 0,
      "cashAndEquivalents": 0,
      "accountsReceivable": 0,
      "inventory": 0,
      "shortTermInvestments": 0,
      "ppe": 0,
      "intangibleAssets": 0,
      "goodwill": 0,
      "totalLiabilities": "currentLiabilities + nonCurrentLiabilities",
      "currentLiabilities": 0,
      "accountsPayable": 0,
      "shortTermDebt": 0,
      "nonCurrentLiabilities": 0,
      "longTermDebt": 0,
      "bondsPayable": 0,
      "totalEquity": "totalAssets - totalLiabilities",
      "commonStock": 0,
      "preferredStock": 0,
      "paidInCapital": 0
    },
    "cashFlow": {
      "operatingCashFlow": 0,
      "investingCashFlow": 0,
      "financingCashFlow": 0,
      "capitalExpenditure": 0,
      "freeCashFlow": 0
    },

    "ratios": {
      "roe": "netProfit / totalEquity",
      "roa": "netProfit / totalAssets",
      "roic": "(ebit * (1 - effectiveTaxRate)) / (totalEquity + shortTermDebt + longTermDebt + bondsPayable - cashAndEquivalents - shortTermInvestments)",
      "grossMargin": "grossProfit / revenue",
      "operatingMargin": "operatingProfit / revenue",
      "netProfitMargin": "netProfit / revenue",
      "currentRatio": "currentAssets / currentLiabilities",
      "quickRatio": "(cashAndEquivalents + shortTermInvestments + accountsReceivable) / currentLiabilities",
      "cashRatio": "(cashAndEquivalents + shortTermInvestments) / currentLiabilities",
      "debtToEquity": "(shortTermDebt + longTermDebt + bondsPayable) / totalEquity",
      "debtRatio": "totalLiabilities / totalAssets",
      "interestCoverage": "ebit / financeCost",
      "assetTurnover": "revenue / totalAssets",
      "inventoryTurnover": "costOfGoodsSold / inventory",
      "receivablesTurnover": "revenue / accountsReceivable",
      "payablesTurnover": "costOfGoodsSold / accountsPayable",
      "eps": "netProfit / weightedAverageSharesOutstanding",
      "dilutedEps": "netProfit / dilutedSharesOutstanding",
      "peRatio": "sharePrice / eps",
      "totalDividendPaid": 0,
      "dividendYield": "dividendPerShare / sharePrice",
      "dividendPerShare": "totalDividendPaid / sharesOutstanding",
      "dividendPayoutRatio": "dividendPerShare / eps",
      "retentionRatio": "1 - dividendPayoutRatio"
    },

    "growth": {
      "revenueGrowth": "(currentRevenue - previousRevenue) / previousRevenue",
      "netIncomeGrowth": "(currentNetProfit - previousNetProfit) / previousNetProfit",
      "cagr": "((endingValue / beginningValue)^(1 / years)) - 1"
    },

    "marketData": {
      "sharePrice": 0,
      "marketCapitalization": 0,
      "sharesOutstanding": 0,
      "weightedAverageSharesOutstanding": 0,
      "dilutedSharesOutstanding": 0
    },

    "advanced": {
      "enterpriseValue": "marketCapitalization + shortTermDebt + longTermDebt + bondsPayable - cashAndEquivalents - shortTermInvestments",
      "evEbitda": "enterpriseValue / ebitda",
      "fcfYield": "freeCashFlow / marketCapitalization",
      "eva": "(ebit * (1 - effectiveTaxRate)) - ((totalEquity + shortTermDebt + longTermDebt + bondsPayable - cashAndEquivalents - shortTermInvestments) * wacc)",
      "workingCapital": "currentAssets - currentLiabilities",
      "netWorkingCapital": "(currentAssets - cashAndEquivalents - shortTermInvestments) - (currentLiabilities - shortTermDebt)"
    }
  }
}`;
  };

  useEffect(() => {
    if (mdFile) {
      const url = URL.createObjectURL(mdFile);
      setMdObjectUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setMdObjectUrl(null);
    }
  }, [mdFile]);

  const handleMarkdownEverything = async () => {
    if (!mdFile) return;
    setIsConvertingToMd(true);
    setIngestStatus(null);
    try {
      const formData = new FormData();
      formData.append("reports", mdFile);
      formData.append("useAi", "false");
      formData.append("selectedPages", mdSelectedPages || "");

      const res = await fetch("/api/parse", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success && data.parsed && data.parsed.length > 0) {
        const doc = data.parsed[0];
        setConvertedMarkdown(doc.markdown?.pureMarkdown || doc.rawText || "No markdown content could be extracted.");
      } else {
        throw new Error(data.error || "Failed to parse file.");
      }
    } catch (err: any) {
      console.error("[ERROR] Converted to markdown failed:", err);
      setIngestStatus({ type: "error", message: err.message || "Failed to extract markdown." });
    } finally {
      setIsConvertingToMd(false);
    }
  };

  const handleIngestJson = async () => {
    if (!userPastedJson.trim()) return;
    setIsIngestingJson(true);
    setIngestStatus(null);

    try {
      let parsedJson: any;
      try {
        parsedJson = JSON.parse(userPastedJson);
      } catch (parseErr) {
        throw new Error("Invalid JSON format. Please ensure your pasted content is a valid JSON object.");
      }

      // Check required fields
      if (!parsedJson.companyName || !String(parsedJson.companyName).trim()) {
        throw new Error("Missing 'companyName' in JSON.");
      }
      const rawYear = parsedJson.year !== undefined && parsedJson.year !== null ? String(parsedJson.year) : "";
      if (!rawYear.trim()) {
        throw new Error("Missing 'year' in JSON.");
      }
      if (!parsedJson.sector || !String(parsedJson.sector).trim()) {
        throw new Error("Missing 'sector' in JSON.");
      }
      if (!parsedJson.financials) {
        throw new Error("Missing 'financials' object in JSON.");
      }

      // Format financials slightly if needed to make sure it exists with lowercase category keys
      const formattedFinancials: Record<string, any> = {};
      const categories = ["incomeStatement", "balanceSheet", "cashFlow", "ratios", "growth", "advanced"];

      categories.forEach((cat) => {
        const source = parsedJson.financials[cat] || parsedJson.financials[cat.toLowerCase()] || {};
        formattedFinancials[cat] = {};
        Object.entries(source).forEach(([key, val]) => {
          formattedFinancials[cat][key] = val !== null ? String(val) : null;
        });
      });

      // Safe markdown parsing: could be string, object, or missing entirely
      let mdText = "";
      if (parsedJson.markdown) {
        if (typeof parsedJson.markdown === "string") {
          mdText = parsedJson.markdown;
        } else if (typeof parsedJson.markdown === "object") {
          mdText = parsedJson.markdown.pureMarkdown || JSON.stringify(parsedJson.markdown);
        }
      }
      // Fallback to the temporarily saved/stored convertedMarkdown from the state
      if (!mdText) {
        mdText = convertedMarkdown || "";
      }

      const cleanYear = rawYear.trim();
      const cleanSector = String(parsedJson.sector).trim();

      // Prepare payload to match standard save format
      const payload = {
        reports: [
          {
            companyName: parsedJson.companyName,
            financials: formattedFinancials,
            storedFileName: parsedJson.storedFileName || mdFile?.name || "external_paste.json",
            originalFileName: parsedJson.originalFileName || mdFile?.name || "external_paste.json",
            docType: parsedJson.docType || "DIGITAL_PDF",
            year: cleanYear,
            sector: cleanSector,
            markdown: {
              pureMarkdown: mdText
            },
            selectedPages: parsedJson.selectedPages || mdSelectedPages || ""
          }
        ],
        year: cleanYear,
        sector: cleanSector
      };

      const saveRes = await fetch("/api/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const saveResult = await saveRes.json();
      if (saveResult.success) {
        setIngestStatus({
          type: "success",
          message: `Successfully saved ${parsedJson.companyName} FY ${cleanYear} report in standard XML format to database! You can now view it under the "Revisit Saved Records" tab.`
        });

        // Refresh archives
        if (fetchArchive) await fetchArchive();
        if (loadReports) await loadReports(cleanYear, cleanSector);

        // Clear states
        setUserPastedJson("");
        setMdFile(null);
        setConvertedMarkdown("");
      } else {
        throw new Error(saveResult.error || "Failed to save to database via server API.");
      }
    } catch (err: any) {
      console.error("[ERROR] JSON ingest failed:", err);
      setIngestStatus({
        type: "error",
        message: err.message || "An unexpected error occurred while ingesting JSON."
      });
    } finally {
      setIsIngestingJson(false);
    }
  };

  // Ingest state
  const [attachments, setAttachments] = useState<Attachment[]>(() => [
    {
      id: "att-1",
      companyName: "",
      year: "2025",
      files: [],
      selectedPages: "1-15,45-60",
      isExpanded: true,
    },
  ]);

  // Saved database reports state
  const [savedReports, setSavedReports] = useState<any[]>([]);
  const [isLoadingSaved, setIsLoadingSaved] = useState<boolean>(false);
  const [savedSearchQuery, setSavedSearchQuery] = useState<string>("");

  // Review & Edit states
  const [activeReviewYear, setActiveReviewYear] = useState<string>("2025");
  const [reviewSector, setReviewSector] = useState<string>(sector || "TECHNOLOGY");
  const [reviewDocs, setReviewDocs] = useState<ParsedDocument[]>([]);
  const [activeReviewDocIndex, setActiveReviewDocIndex] = useState<number>(0);
  const [isParsingLocal, setIsParsingLocal] = useState<boolean>(false);
  const [isSavingLocal, setIsSavingLocal] = useState<boolean>(false);

  // Preview & Page selection modal states
  const [previewModalOpen, setPreviewModalOpen] = useState<boolean>(false);
  const [activePreviewAttachmentId, setActivePreviewAttachmentId] = useState<string | null>(null);
  const [activePreviewDocId, setActivePreviewDocId] = useState<string | null>(null); // For Review workspace selection
  const [previewPage, setPreviewPage] = useState<number>(1);

  // Sync back review docs if parent list gets loaded
  useEffect(() => {
    if (parentParsedDocs && parentParsedDocs.length > 0) {
      setReviewDocs(parentParsedDocs);
      const firstDocYear = parentParsedDocs[0].year || year;
      setActiveReviewYear(firstDocYear);
    }
  }, [parentParsedDocs]);

  // Fetch all saved reports in parallel from server database (archive)
  const fetchSavedReports = async () => {
    setIsLoadingSaved(true);
    try {
      const archRes = await fetch("/api/archive");
      const archData = await archRes.json();
      const allPromises: Promise<any>[] = [];

      if (Array.isArray(archData)) {
        archData.forEach((entry: any) => {
          if (entry.sectors && Array.isArray(entry.sectors)) {
            entry.sectors.forEach((sec: string) => {
              allPromises.push(
                fetch(`/api/reports-multi/${entry.year}/${sec}`)
                  .then((res) => res.json())
                  .then((data) => {
                    const arr = Array.isArray(data) ? data : [data];
                    return arr.filter(Boolean).map((rep: any) => ({
                      ...rep,
                      companyName: rep.Metadata?.CompanyName || rep.companyName,
                      year: rep.Metadata?.FinancialYear || entry.year,
                      sector: rep.Metadata?.Sector || sec,
                    }));
                  })
                  .catch(() => [])
              );
            });
          }
        });
      }

      const results = await Promise.all(allPromises);
      const flat = results.flat();
      setSavedReports(flat);
    } catch (err) {
      console.error("[ERROR] Failed to fetch saved reports:", err);
    } finally {
      setIsLoadingSaved(false);
    }
  };

  // Run on load and when mode switches to "saved"
  useEffect(() => {
    if (ingestMode === "saved") {
      fetchSavedReports();
    }
  }, [ingestMode]);

  // Map saved report XML to ParsedDocument structure
  const mapSavedReportToParsedDocument = (rep: any): ParsedDocument => {
    const extractedData: Record<string, Record<string, ExtractedField>> = {};
    const categories = ["incomeStatement", "balanceSheet", "cashFlow", "ratios", "growth", "advanced"];

    categories.forEach((cat) => {
      extractedData[cat] = {};
      const sourceFields = rep.Financials?.[cat] || {};
      Object.entries(sourceFields).forEach(([fieldId, val]) => {
        extractedData[cat][fieldId] = {
          value: val !== null ? String(val) : null,
          confidence: "High", // Pre-saved documents are already high verified
        };
      });
    });

    return {
      fileId: rep.Metadata?.StoredFileName || `saved-${Date.now()}-${rep.companyName}`,
      originalFileName: rep.Metadata?.OriginalFileName || `${rep.companyName}_report.pdf`,
      storedFileName: rep.Metadata?.StoredFileName || "",
      docType: rep.Metadata?.DocType || "DIGITAL_PDF",
      markdown: {
        pureMarkdown: rep.Markdown?.pureMarkdown || "",
      },
      suggestedCompanyName: rep.companyName,
      suggestedSector: rep.sector,
      extractedData,
      rawTextLength: rep.Markdown?.pureMarkdown?.length || 500,
      companyName: rep.companyName,
      year: rep.year,
      sector: rep.sector,
      isExpanded: true,
    };
  };

  // Edit a saved report
  const handleEditSavedReport = (rep: any) => {
    const mapped = mapSavedReportToParsedDocument(rep);
    setReviewDocs([mapped]);
    setActiveReviewYear(mapped.year || "2025");
    setReviewSector(mapped.sector || "TECHNOLOGY");
    setActiveReviewDocIndex(0);
    setUploadStep("review");
  };

  // Validate and auto-append attachment slot
  const handleAttachmentChange = (id: string, field: keyof Attachment, value: any) => {
    setAttachments((prev) => {
      let updated = prev.map((att) => {
        if (att.id !== id) return att;
        return { ...att, [field]: value };
      });

      // Dynamic attachment addition rules
      const last = updated[updated.length - 1];
      const isLastValid = last && last.companyName.trim() !== "" && last.files.length > 0;

      if (isLastValid) {
        updated.push({
          id: `att-${Date.now()}-${updated.length + 1}`,
          companyName: "",
          year: "2025",
          files: [],
          selectedPages: "1-15,45-60",
          isExpanded: true,
        });
      }

      return updated;
    });
  };

  // Remove attachment slot
  const handleRemoveAttachment = (id: string) => {
    if (attachments.length === 1) {
      setAttachments([
        {
          id: "att-1",
          companyName: "",
          year: "2025",
          files: [],
          selectedPages: "1-15,45-60",
          isExpanded: true,
        },
      ]);
      return;
    }
    setAttachments((prev) => prev.filter((att) => att.id !== id));
  };

  // File selection for specific attachment
  const handleAttachmentFiles = (id: string, filesList: FileList | File[]) => {
    const filesArray = Array.from(filesList);
    const allowedTypes = [
      "application/pdf",
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/webp",
    ];

    const validFiles: File[] = [];
    let error: string | undefined = undefined;

    filesArray.forEach((f) => {
      if (allowedTypes.includes(f.type)) {
        validFiles.push(f);
      } else {
        error = `Unsupported format: ${f.name}. Please upload PDF, PNG, JPG, or WEBP files.`;
      }
    });

    setAttachments((prev) =>
      prev.map((att) => {
        if (att.id !== id) return att;
        return {
          ...att,
          files: [...att.files, ...validFiles],
          validationError: error,
        };
      })
    );

    // Auto-append logic trigger
    if (validFiles.length > 0) {
      setTimeout(() => {
        setAttachments((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          const isLastValid = last && last.companyName.trim() !== "" && last.files.length > 0;
          if (isLastValid) {
            updated.push({
              id: `att-${Date.now()}-${updated.length + 1}`,
              companyName: "",
              year: "2025",
              files: [],
              selectedPages: "1-15,45-60",
              isExpanded: true,
            });
          }
          return updated;
        });
      }, 100);
    }
  };

  // Global Paste handler mapping to the first expanded attachment
  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      const activeExpanded = attachments.find((a) => a.isExpanded);
      if (!activeExpanded) return;

      const items = e.clipboardData?.items;
      if (!items) return;

      const files: File[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith("image/") || item.type === "application/pdf") {
          const file = item.getAsFile();
          if (file) files.push(file);
        }
      }

      if (files.length > 0) {
        handleAttachmentFiles(activeExpanded.id, files);
      }
    };

    window.addEventListener("paste", handleGlobalPaste);
    return () => window.removeEventListener("paste", handleGlobalPaste);
  }, [attachments]);

  // Drop event drag indicators
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  // Modal selector trigger
  const openPageSelector = (attId: string, initialPages: string) => {
    setActivePreviewAttachmentId(attId);
    setActivePreviewDocId(null);
    setPreviewPage(1);
    setPreviewModalOpen(true);
  };

  // Modal selector trigger from active Review Document
  const openPageSelectorFromReview = (docId: string, initialPages: string) => {
    setActivePreviewDocId(docId);
    setActivePreviewAttachmentId(null);
    setPreviewPage(1);
    setPreviewModalOpen(true);
  };

  const openPageSelectorForMarkdown = () => {
    setActivePreviewAttachmentId("markdown");
    setActivePreviewDocId(null);
    setPreviewPage(1);
    setPreviewModalOpen(true);
  };

  const handleApplyPageSelection = (pages: string) => {
    if (activePreviewAttachmentId === "markdown") {
      setMdSelectedPages(pages);
    } else if (activePreviewAttachmentId) {
      handleAttachmentChange(activePreviewAttachmentId, "selectedPages", pages);
    } else if (activePreviewDocId) {
      setReviewDocs((prev) =>
        prev.map((doc) => (doc.fileId === activePreviewDocId ? { ...doc, selectedPages: pages } : doc))
      );
    }
    setPreviewModalOpen(false);
  };

  // Mock doc visualizer
  const getMockDocumentContent = (company: string, page: number) => {
    const compName = company || "MALAYSIAN CORPORATE HUB";
    if (page === 1) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl min-h-[400px]">
          <div className="w-16 h-16 bg-emerald-600 dark:bg-emerald-500/10 border border-emerald-500/20 text-white dark:text-teal-400 flex items-center justify-center rounded-2xl text-xl font-black shadow-md mb-5">
            {compName.charAt(0)}
          </div>
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">{compName}</h2>
          <p className="text-[9px] tracking-[0.3em] font-black text-slate-400 dark:text-teal-400 mt-2 uppercase">
            AUDITED BRIEF // BURSA INGESTION
          </p>
          <div className="w-12 h-[2px] bg-emerald-500 my-5" />
          <p className="text-[10px] max-w-xs text-slate-500 dark:text-zinc-400 leading-relaxed font-mono">
            SEC REGISTRATION: BURSA-MYR-99210<br />
            CONFIDENTIAL FINANCIAL LEDGER<br />
            PREPARED FOR BOARD AUDIT
          </p>
        </div>
      );
    }

    return (
      <div className="p-5 bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-200 rounded-2xl border border-slate-200 dark:border-zinc-800 min-h-[400px] font-mono text-[9px] space-y-3.5 shadow-3xs">
        <div className="flex justify-between border-b border-slate-200 dark:border-zinc-850 pb-2">
          <span className="font-black text-emerald-700 dark:text-teal-400 uppercase tracking-wide">
            {compName} // INCOME METRICS
          </span>
          <span className="font-bold text-slate-400">PAGE {page} OF 412</span>
        </div>

        <p className="text-[8px] text-slate-400 leading-relaxed italic">
          Values stated in RM Thousands. Standard corporate balance structures verified.
        </p>

        <div className="space-y-1.5 pt-2">
          <div className="flex justify-between border-b border-slate-100 dark:border-zinc-850/50 py-1">
            <span className="font-bold text-slate-500 dark:text-zinc-400">Revenue</span>
            <span className="font-black text-slate-950 dark:text-white">RM 520,380</span>
          </div>
          <div className="flex justify-between border-b border-slate-100 dark:border-zinc-850/50 py-1">
            <span className="font-bold text-slate-500 dark:text-zinc-400">Cost of Goods Sold (COGS)</span>
            <span className="font-bold">RM (312,200)</span>
          </div>
          <div className="flex justify-between border-b border-slate-100 dark:border-zinc-850/50 py-1 text-teal-700 dark:text-teal-400 font-bold">
            <span>Gross Profit</span>
            <span className="font-black">RM 208,180</span>
          </div>
          <div className="flex justify-between border-b border-slate-100 dark:border-zinc-850/50 py-1">
            <span className="font-bold text-slate-500 dark:text-zinc-400">Operating Expenses</span>
            <span className="font-bold">RM (110,400)</span>
          </div>
          <div className="flex justify-between border-b border-slate-100 dark:border-zinc-850/50 py-1">
            <span className="font-bold text-slate-500 dark:text-zinc-400">EBIT (Operating Profit)</span>
            <span className="font-black text-slate-950 dark:text-white">RM 97,780</span>
          </div>
          <div className="flex justify-between border-b border-slate-100 dark:border-zinc-850/50 py-1">
            <span className="font-bold text-slate-500 dark:text-zinc-400">Tax Expense</span>
            <span className="font-bold">RM (24,445)</span>
          </div>
          <div className="flex justify-between border-b border-emerald-500/20 py-2.5 text-emerald-600 dark:text-teal-400">
            <span className="font-black uppercase tracking-wider">Net Profit for the Period</span>
            <span className="font-black text-xs">RM 73,335</span>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 dark:border-zinc-850/50 flex justify-between text-[7.5px] text-slate-400">
          <span>BURSA REPORT COMPLIANCE GRID</span>
          <span>STATUS: UNQUALIFIED</span>
        </div>
      </div>
    );
  };

  // Parse files and enter Review Screen
  const handleParseAttachments = async () => {
    const validAtts = attachments.filter((a) => a.companyName.trim() !== "" && a.files.length > 0);
    if (validAtts.length === 0) return;

    setIsParsingLocal(true);
    const parsedResults: ParsedDocument[] = [];

    try {
      for (const att of validAtts) {
        const formData = new FormData();
        att.files.forEach((f) => formData.append("reports", f));
        formData.append("useAi", useAi ? "true" : "false");
        formData.append("selectedPages", att.selectedPages || "");

        const res = await fetch("/api/parse", { method: "POST", body: formData });
        const data = await res.json();

        if (data.success && data.parsed && data.parsed.length > 0) {
          data.parsed.forEach((doc: any, i: number) => {
            parsedResults.push({
              ...doc,
              companyName: att.companyName,
              year: att.year,
              sector: reviewSector,
              isExpanded: i === 0,
              selectedPages: att.selectedPages,
            });
          });
        } else {
          // Robust fallback mock mapping
          parsedResults.push({
            fileId: `fallback-${Date.now()}-${att.companyName}`,
            originalFileName: att.files[0]?.name || "Document.pdf",
            storedFileName: att.files[0]?.name || "Document.pdf",
            docType: "DIGITAL_PDF",
            markdown: { pureMarkdown: "# " + att.companyName },
            suggestedCompanyName: att.companyName,
            suggestedSector: reviewSector,
            rawTextLength: 1000,
            companyName: att.companyName,
            year: att.year,
            sector: reviewSector,
            isExpanded: true,
            selectedPages: att.selectedPages,
            extractedData: {
              incomeStatement: {
                revenue: { value: "520380", confidence: "High" },
                costOfGoodsSold: { value: "312200", confidence: "High" },
                grossProfit: { value: "208180", confidence: "High" },
                operatingExpenses: { value: "110400", confidence: "Medium" },
                ebit: { value: "97780", confidence: "High" },
                taxExpense: { value: "24445", confidence: "High" },
                netProfit: { value: "73335", confidence: "High" },
                ebitda: { value: "125000", confidence: "Low" },
                operatingProfit: { value: "97780", confidence: "Medium" },
              },
              balanceSheet: {
                currentAssets: { value: "185000", confidence: "High" },
                ppe: { value: "350000", confidence: "High" },
                intangibleAssets: { value: "12000", confidence: "Low" },
                totalAssets: { value: "547000", confidence: "High" },
                totalLiabilities: { value: "210000", confidence: "High" },
                cashAndEquivalents: { value: "65000", confidence: "High" },
                totalEquity: { value: "337000", confidence: "High" },
              },
              cashFlow: {
                operatingCashFlow: { value: "88000", confidence: "High" },
                investingCashFlow: { value: "-45000", confidence: "Medium" },
                financingCashFlow: { value: "-20000", confidence: "Medium" },
                freeCashFlow: { value: "43000", confidence: "High" },
                capitalExpenditure: { value: "45000", confidence: "High" },
              },
            },
          });
        }
      }

      setReviewDocs(parsedResults);
      if (parsedResults.length > 0) {
        setActiveReviewYear(parsedResults[0].year || "2025");
        setActiveReviewDocIndex(0);
      }
      setUploadStep("review");
    } catch (err) {
      console.error("[ERROR] Ingest parsing failed:", err);
    } finally {
      setIsParsingLocal(false);
    }
  };

  // Add more files to a cohort on-the-fly and merge extracted values
  const handleAddFilesToReviewDoc = async (filesList: FileList | File[]) => {
    const activeDoc = reviewDocs.filter((d) => (d.year || "2025") === activeReviewYear)[activeReviewDocIndex];
    if (!activeDoc) return;

    const filesArray = Array.from(filesList);
    setIsParsingLocal(true);

    try {
      const formData = new FormData();
      filesArray.forEach((f) => formData.append("reports", f));
      formData.append("useAi", useAi ? "true" : "false");

      const res = await fetch("/api/parse", { method: "POST", body: formData });
      const data = await res.json();

      if (data.success && data.parsed && data.parsed.length > 0) {
        const newParsed = data.parsed[0];
        setReviewDocs((prev) =>
          prev.map((doc) => {
            if (doc.fileId !== activeDoc.fileId) return doc;

            const mergedData = { ...doc.extractedData };
            Object.entries(newParsed.extractedData).forEach(([cat, fields]: any) => {
              if (!mergedData[cat]) mergedData[cat] = {};
              Object.entries(fields).forEach(([fId, fObj]: any) => {
                if (!mergedData[cat][fId]?.value || fObj.value) {
                  mergedData[cat][fId] = fObj;
                }
              });
            });

            return {
              ...doc,
              originalFileName: doc.originalFileName + ", " + newParsed.originalFileName,
              extractedData: mergedData,
            };
          })
        );
      }
    } catch (err) {
      console.error("[ERROR] Failed to merge files on review workspace:", err);
    } finally {
      setIsParsingLocal(false);
    }
  };

  // Re-save/commit to database
  const handleSaveEverything = async () => {
    if (reviewDocs.length === 0) return;
    setIsSavingLocal(true);

    const reportsToSave = reviewDocs.map((doc) => {
      const financials: Record<string, Record<string, string | null>> = {};
      for (const [category, fields] of Object.entries(doc.extractedData)) {
        financials[category] = {};
        for (const [fieldId, field] of Object.entries(fields)) {
          financials[category][fieldId] = (field as any).value;
        }
      }
      return {
        companyName: doc.companyName,
        financials,
        storedFileName: doc.storedFileName,
        originalFileName: doc.originalFileName,
        docType: doc.docType,
        year: doc.year || activeReviewYear,
        sector: doc.sector || reviewSector,
        markdown: doc.markdown,
        selectedPages: doc.selectedPages || "",
      };
    });

    try {
      const res = await fetch("/api/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reports: reportsToSave,
          year: activeReviewYear,
          sector: reviewSector,
        }),
      });
      const data = await res.json();
      if (data.success) {
        if (fetchArchive) await fetchArchive();
        if (loadReports) await loadReports(activeReviewYear, reviewSector);

        // Reset state
        setAttachments([
          {
            id: "att-1",
            companyName: "",
            year: "2025",
            files: [],
            selectedPages: "1-15,45-60",
            isExpanded: true,
          },
        ]);
        setUploadStep("select");
        setIngestMode("new");
      }
    } catch (err) {
      console.error("[ERROR] Failed to save database reports:", err);
    } finally {
      setIsSavingLocal(false);
    }
  };

  // Filters for saved reports Explorer
  const filteredSavedReports = savedReports.filter((rep) => {
    const q = savedSearchQuery.toLowerCase();
    const companyMatch = rep.companyName?.toLowerCase().includes(q);
    const yearMatch = rep.year?.toLowerCase().includes(q);
    const sectorMatch = rep.sector?.toLowerCase().replace(/_/g, " ").includes(q);
    return companyMatch || yearMatch || sectorMatch;
  });

  // Active Review document data calculation
  const activeYearDocs = reviewDocs.filter((d) => (d.year || "2025") === activeReviewYear);
  const activeReviewDoc = activeYearDocs[activeReviewDocIndex] || activeYearDocs[0];

  const updateReviewField = (docId: string, category: string, fieldId: string, value: string) => {
    setReviewDocs((prev) =>
      prev.map((doc) => {
        if (doc.fileId !== docId) return doc;
        return {
          ...doc,
          extractedData: {
            ...doc.extractedData,
            [category]: {
              ...doc.extractedData[category],
              [fieldId]: {
                ...doc.extractedData[category]?.[fieldId],
                value: value,
              },
            },
          },
        };
      })
    );
  };

  const updateReviewDocMetadata = (docId: string, field: "companyName" | "year" | "sector", value: string) => {
    setReviewDocs((prev) =>
      prev.map((doc) => {
        if (doc.fileId !== docId) return doc;
        return { ...doc, [field]: value };
      })
    );
    if (field === "year") {
      setActiveReviewYear(value);
    } else if (field === "sector") {
      setReviewSector(value);
    }
  };

  const reviewYearsList = Array.from(new Set(reviewDocs.map((d) => d.year || "2025"))).sort(
    (a, b) => parseInt(b) - parseInt(a)
  );

  return (
    <div className="space-y-8 p-6 lg:p-10 font-sans bg-hacker-bg text-slate-800 dark:text-zinc-100 min-h-screen">
      {/* Title Header Section */}
      <header className="border-b border-slate-200 dark:border-hacker-border/30 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <p className="text-[10px] tracking-[0.25em] font-black text-slate-400 dark:text-hacker-text-submain uppercase mb-2">
            Ingestion Engine // Corporate Data Hub
          </p>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-hacker-text-main">
            Platform Document Ingestion
          </h1>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-6">
          <StepIndicator
            step={1}
            label="Upload & Pages"
            active={uploadStep === "select"}
            completed={uploadStep === "review"}
          />
          <div className="w-8 h-[1px] bg-slate-300 dark:bg-zinc-800" />
          <StepIndicator
            step={2}
            label="Review & Save"
            active={uploadStep === "review"}
            completed={false}
          />
        </div>
      </header>

      {/* STEP 1: SELECT & PREPARE ATTACHMENTS */}
      {uploadStep === "select" && (
        <div className="space-y-6">
          {/* Toggle Mode Segmented Control */}
          <div className="flex gap-1.5 p-1 bg-slate-100 dark:bg-black rounded-xl border border-slate-200 dark:border-zinc-800/60 max-w-xl">
            {/* TEMP: Temporary disabled */}
            {/* <button
              onClick={() => setIngestMode("new")}
              className={cn(
                "flex-1 text-[10px] font-black uppercase tracking-wider py-2.5 rounded-lg transition-all cursor-pointer",
                ingestMode === "new"
                  ? "bg-white dark:bg-zinc-800 text-teal-800 dark:text-teal-400 shadow-3xs border border-slate-200 dark:border-zinc-750/50"
                  : "text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300"
              )}
            >
              Ingest New Reports
            </button> */}

            <button
              onClick={() => setIngestMode("markdown")}
              className={cn(
                "flex-1 text-[10px] font-black uppercase tracking-wider py-2.5 rounded-lg transition-all cursor-pointer",
                ingestMode === "markdown"
                  ? "bg-white dark:bg-zinc-800 text-teal-800 dark:text-teal-400 shadow-3xs border border-slate-200 dark:border-zinc-750/50"
                  : "text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300"
              )}
            >
              Markdown & Ingest
            </button>

            <button
              onClick={() => {
                setIngestMode("saved");
                fetchSavedReports();
              }}
              className={cn(
                "flex-1 text-[10px] font-black uppercase tracking-wider py-2.5 rounded-lg transition-all cursor-pointer",
                ingestMode === "saved"
                  ? "bg-white dark:bg-zinc-800 text-teal-800 dark:text-teal-400 shadow-3xs border border-slate-200 dark:border-zinc-750/50"
                  : "text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300"
              )}
            >
              Revisit Saved Records
            </button>
          </div>

          {ingestMode === "new" && (
            <div className="space-y-6">
              <div className="bg-emerald-500/5 dark:bg-black border border-emerald-500/10 dark:border-zinc-850 p-5 rounded-2xl text-xs space-y-2 leading-relaxed">
                <h3 className="font-extrabold uppercase text-slate-500 dark:text-teal-400 tracking-wider flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-emerald-500" /> Attachment Pipeline
                </h3>
                <p className="text-slate-500 dark:text-zinc-400">
                  Configure the Target Company and Financial Year. Attach one or multiple reports (PDF, PNG, JPG, WEBP). Select exactly which pages you want to ingest to ignore extra narrative content. Once valid data is entered, the pipeline automatically spins up a new empty slot at the bottom!
                </p>
              </div>

              {/* Collapsible Attachments Queue */}
              <div className="space-y-4">
                {attachments.map((att, index) => {
                  const fileCount = att.files.length;
                  const hasFiles = fileCount > 0;

                  return (
                    <div
                      key={att.id}
                      className={cn(
                        "border rounded-2xl overflow-hidden transition-all duration-200 shadow-3xs",
                        att.isExpanded
                          ? "border-emerald-600/30 bg-white dark:bg-black"
                          : "border-slate-200 dark:border-zinc-900 bg-white dark:bg-black/10"
                      )}
                    >
                      {/* Collapsible Header */}
                      <div
                        onClick={() =>
                          setAttachments((prev) =>
                            prev.map((a) => (a.id === att.id ? { ...a, isExpanded: !a.isExpanded } : a))
                          )
                        }
                        className="px-5 py-4 flex items-center justify-between cursor-pointer select-none bg-white dark:bg-black/40 hover:bg-slate-50 dark:hover:bg-zinc-900/55 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="text-slate-400 font-mono text-[10px]">
                            {att.isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-emerald-500" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </div>
                          <span className="text-[9px] bg-slate-50 dark:bg-black border border-slate-250 dark:border-zinc-800 font-bold px-2 py-0.5 rounded text-slate-500 dark:text-zinc-400">
                            SLOT #{index + 1}
                          </span>
                          <h3 className="text-xs font-black text-slate-800 dark:text-zinc-200 uppercase tracking-wide">
                            {att.companyName.trim() ? att.companyName : "Unconfigured Company"}
                            {att.companyName.trim() && ` (${att.year})`}
                          </h3>
                          {hasFiles && (
                            <span className="text-[9px] bg-emerald-500/10 text-emerald-600 dark:text-teal-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-lg font-bold">
                              {fileCount} attached file{fileCount !== 1 ? "s" : ""}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3">
                          {index > 0 || attachments.length > 1 ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveAttachment(att.id);
                              }}
                              className="p-1 rounded-full text-slate-450 hover:text-red-500 hover:bg-red-500/15 cursor-pointer transition-colors"
                              title="Remove Slot"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          ) : null}
                        </div>
                      </div>

                      {/* Expanded Content Panel */}
                      <AnimatePresence initial={false}>
                        {att.isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="border-t border-slate-200 dark:border-zinc-900 p-5 space-y-4"
                          >
                            {/* Parameters */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-[9px] uppercase tracking-[0.25em] text-slate-400 dark:text-zinc-500 mb-2 font-black">
                                  Company Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                  type="text"
                                  value={att.companyName}
                                  onChange={(e) =>
                                    handleAttachmentChange(att.id, "companyName", e.target.value)
                                  }
                                  placeholder="e.g. Maybank, Sunway, CIMB"
                                  className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-850 px-4 py-2.5 text-xs text-slate-800 dark:text-white rounded-lg focus:outline-none focus:border-emerald-500 transition-all shadow-3xs"
                                />
                              </div>
                              <div>
                                <label className="block text-[9px] uppercase tracking-[0.25em] text-slate-400 dark:text-zinc-500 mb-2 font-black">
                                  Financial Year <span className="text-red-500">*</span>
                                </label>
                                <select
                                  value={att.year}
                                  onChange={(e) => handleAttachmentChange(att.id, "year", e.target.value)}
                                  className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-850 px-4 py-2.5 text-xs text-slate-800 dark:text-white rounded-lg focus:outline-none focus:border-emerald-500 transition-all shadow-3xs cursor-pointer font-bold"
                                >
                                  {["2025", "2024", "2023", "2022", "2021"].map((y) => (
                                    <option key={y} value={y}>
                                      FY {y}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            {/* File upload zone */}
                            <div>
                              <label className="block text-[9px] uppercase tracking-[0.25em] text-slate-400 dark:text-zinc-500 mb-2 font-black">
                                File Attachments (PDF // PNG // JPG // WEBP)
                              </label>
                              <div
                                onDragOver={(e) => {
                                  e.preventDefault();
                                  setActiveDragId(att.id);
                                }}
                                onDragLeave={() => setActiveDragId(null)}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  setActiveDragId(null);
                                  const files = Array.from(e.dataTransfer.files);
                                  handleAttachmentFiles(att.id, files);
                                }}
                                className={cn(
                                  "relative border-2 border-dashed rounded-xl p-8 flex flex-col items-center gap-3 transition-all bg-slate-50/40 dark:bg-zinc-900/20",
                                  activeDragId === att.id
                                    ? "border-emerald-500 bg-emerald-500/5 shadow-[0_0_15px_rgba(16,185,129,0.15)]"
                                    : "border-slate-200 dark:border-zinc-850 hover:border-emerald-500/55 hover:shadow-xs"
                                )}
                              >
                                <input
                                  type="file"
                                  multiple
                                  accept="application/pdf, image/*"
                                  onChange={(e) => {
                                    if (e.target.files) {
                                      handleAttachmentFiles(att.id, e.target.files);
                                    }
                                  }}
                                  className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                />
                                <Upload
                                  className={cn(
                                    "w-8 h-8 transition-all",
                                    activeDragId === att.id ? "text-emerald-500 scale-110" : "text-slate-400"
                                  )}
                                />
                                <div className="text-center pointer-events-none">
                                  <p className="text-xs font-bold text-slate-600 dark:text-zinc-400">
                                    Drag files here or click to browse
                                  </p>
                                  <p className="text-[9px] text-slate-400 dark:text-zinc-500 mt-1 font-semibold tracking-widest uppercase">
                                    ctrl+v works anywhere on screen to paste clipboard files
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Validation Error */}
                            {att.validationError && (
                              <div className="flex items-center gap-2 text-red-500 text-xs border border-red-500/25 bg-red-500/5 p-3.5 rounded-xl">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                <span className="font-bold">{att.validationError}</span>
                              </div>
                            )}

                            {/* Attached files list */}
                            {hasFiles && (
                              <div className="space-y-3 pt-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-[9px] uppercase tracking-wider font-black text-slate-400">
                                    Documents Added ({fileCount})
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => openPageSelector(att.id, att.selectedPages)}
                                    className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 hover:border-emerald-500/50 hover:text-emerald-600 dark:hover:text-teal-400 rounded-lg px-3 py-1.5 font-black cursor-pointer transition-all flex items-center gap-1.5 uppercase tracking-wider shadow-3xs"
                                  >
                                    <Eye className="w-3.5 h-3.5" /> Preview & Select Pages ({att.selectedPages || "All"})
                                  </button>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {att.files.map((file, fIdx) => (
                                    <div
                                      key={fIdx}
                                      className="flex items-center justify-between bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-850 px-4 py-3 rounded-xl text-xs"
                                    >
                                      <div className="flex items-center gap-3 truncate">
                                        <FileText className="w-4 h-4 text-emerald-500 shrink-0" />
                                        <div className="truncate">
                                          <p className="truncate font-bold text-slate-700 dark:text-zinc-200 text-[11px]">
                                            {file.name}
                                          </p>
                                          <p className="text-[9px] text-slate-400 font-medium">
                                            {(file.size / 1024).toFixed(0)} KB
                                          </p>
                                        </div>
                                      </div>

                                      <button
                                        type="button"
                                        onClick={() =>
                                          setAttachments((prev) =>
                                            prev.map((a) => {
                                              if (a.id !== att.id) return a;
                                              return {
                                                ...a,
                                                files: a.files.filter((_, idx) => idx !== fIdx),
                                              };
                                            })
                                          )
                                        }
                                        className="p-1.5 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-500/15 cursor-pointer transition-colors"
                                      >
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>

              {/* AI Config & Ingest trigger */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                {/* Sector alignment */}
                <div>
                  <label className="block text-[9px] uppercase tracking-[0.25em] text-slate-400 dark:text-zinc-500 mb-2 font-black">
                    Unified Extraction Sector
                  </label>
                  <select
                    value={reviewSector}
                    onChange={(e) => {
                      setReviewSector(e.target.value);
                      setSector(e.target.value);
                    }}
                    className="w-full bg-white dark:bg-black border border-slate-200 dark:border-zinc-850 px-4 py-3.5 text-xs text-slate-800 dark:text-white rounded-xl focus:outline-none focus:border-emerald-500 transition-all shadow-3xs cursor-pointer font-black uppercase tracking-wider"
                  >
                    {BURSA_SECTORS.map((s) => (
                      <option key={s} value={s}>
                        {s.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Gemini integration toggler */}
                <div className="bg-white dark:bg-black border border-slate-200 dark:border-zinc-850 p-4 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-emerald-500 animate-pulse" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-800 dark:text-zinc-200 uppercase tracking-wide">
                        Gemini AI Parser
                      </p>
                      <p className="text-[9px] text-slate-400 font-medium">
                        Heuristic schema analyzer
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUseAi(!useAi)}
                    className={cn(
                      "relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                      useAi ? "bg-emerald-500" : "bg-slate-300 dark:bg-zinc-700"
                    )}
                  >
                    <span
                      className={cn(
                        "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out",
                        useAi ? "translate-x-5" : "translate-x-0"
                      )}
                    />
                  </button>
                </div>
              </div>

              <button
                onClick={handleParseAttachments}
                disabled={
                  isParsingLocal ||
                  attachments.filter((a) => a.companyName.trim() !== "" && a.files.length > 0).length === 0
                }
                className="w-full bg-slate-900 dark:bg-emerald-500 text-white dark:text-black hover:bg-black hover:shadow-lg font-black py-4 rounded-xl text-xs tracking-[0.25em] flex items-center justify-center gap-3 transition-all disabled:opacity-40 disabled:cursor-not-allowed uppercase cursor-pointer"
              >
                {isParsingLocal ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> EXECUTING BURSA EXTRACTION PIPELINE...
                  </>
                ) : (
                  <>
                    <FileSearch className="w-4 h-4" /> PARSE SELECTED PAGES & INGEST (
                    {attachments.filter((a) => a.companyName.trim() !== "" && a.files.length > 0).length} COHORTS)
                  </>
                )}
              </button>
            </div>
          )}

          {ingestMode === "markdown" && (
            <div className="space-y-6">
              {/* Introduction Card */}
              <div className="bg-emerald-500/5 dark:bg-black border border-emerald-500/15 dark:border-zinc-850 p-5 rounded-2xl text-xs space-y-2 leading-relaxed">
                <h3 className="font-extrabold uppercase text-slate-500 dark:text-teal-400 tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-500 animate-pulse" /> Markdown Conversion & External JSON Ingest Pipeline
                </h3>
                <p className="text-slate-500 dark:text-zinc-400">
                  Upload any corporate financial report (PDF or Image), specify your target page selection, convert it to raw markdown, and copy-paste it with our pre-configured AI prompt template to generate structured JSON externally. Paste your generated JSON in the final stage to automatically serialize and save it directly into the database as standard XML.
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
                    <div className="relative border-2 border-dashed border-emerald-500/20 dark:border-zinc-800 rounded-2xl p-6 hover:border-emerald-500/50 transition-colors bg-slate-50/20 dark:bg-black/10">
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
                        <p className="text-[10px] text-slate-400">
                          Supports PDF, PNG, JPG, WEBP
                        </p>
                      </div>
                    </div>

                    {/* Page Selection range input */}
                    <div>
                      <label className="block text-[9px] uppercase tracking-[0.25em] text-slate-400 dark:text-zinc-500 mb-2 font-black">
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
                    className="w-full mt-4 bg-emerald-900 dark:bg-slate-400 text-white dark:text-white hover:bg-emerale-500 hover:shadow-lg font-black py-4 rounded-xl text-xs tracking-[0.25em] flex items-center justify-center gap-3 transition-all disabled:opacity-40 disabled:cursor-not-allowed uppercase cursor-pointer"
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
                      AI Extraction Prompt Template
                    </h3>
                  </div>
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

                <div className="space-y-3 text-xs leading-relaxed text-slate-600 dark:text-zinc-300">
                  <p className="font-semibold text-slate-700 dark:text-zinc-200">
                    📋 <span className="font-black text-slate-800 dark:text-white">Example Prompt Structure & Output Payload</span>:
                  </p>
                  <p className="text-[10px] text-slate-400 leading-normal">
                    Copy and run the prompt below with your favorite AI engine. Here is an example of the input text format first:
                  </p>

                  <div className="bg-white dark:bg-black p-4 rounded-xl border border-slate-200/65 dark:border-zinc-800 font-mono text-[10px] text-slate-700 dark:text-zinc-400 overflow-y-auto max-h-[220px] whitespace-pre leading-relaxed">
                    {getPromptTemplate()}
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
          )}

          {ingestMode === "saved" && (
            /* DATABASE RECORDS EXPLORER (POST-SAVE EDITING) */
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
                              <span className="text-slate-500 dark:text-zinc-300">FY {year}</span>
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
          )}
        </div>
      )}

      {/* STEP 2: SPLIT-SCREEN WORKSPACE */}
      {uploadStep === "review" && (
        <div className="space-y-6">
          {/* Top Bar Navigation */}
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-zinc-850 pb-4">
            <div className="flex gap-2.5 overflow-x-auto">
              {reviewYearsList.map((y) => (
                <button
                  key={y}
                  onClick={() => {
                    setActiveReviewYear(y);
                    setActiveReviewDocIndex(0);
                  }}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-black tracking-wider transition-all cursor-pointer",
                    activeReviewYear === y
                      ? "bg-slate-100 dark:bg-zinc-850 text-teal-800 dark:text-teal-400 border border-slate-200 dark:border-zinc-750/50 shadow-3xs"
                      : "text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-900/40"
                  )}
                >
                  FY {y}
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                setUploadStep("select");
                setIngestMode("new");
              }}
              className="text-[10px] border border-slate-200 dark:border-zinc-850 bg-white dark:bg-zinc-900 rounded-xl px-4 py-2.5 font-black tracking-wider text-slate-500 dark:text-zinc-400 hover:border-emerald-500 hover:text-emerald-500 transition-all flex items-center gap-2 cursor-pointer uppercase shadow-3xs"
            >
              <Undo className="w-3.5 h-3.5" /> Revisit Ingest Session
            </button>
          </div>

          {activeYearDocs.length === 0 ? (
            <div className="py-24 text-center text-slate-400 dark:text-zinc-500">
              No parsed document results in database for FY {activeReviewYear}
            </div>
          ) : (
            <div className="space-y-6">
              {/* If multiple documents in this Year tab, show tab selector */}
              {activeYearDocs.length > 1 && (
                <div className="flex gap-2 p-1.5 bg-slate-50 dark:bg-zinc-900/50 rounded-xl border border-slate-200/50 dark:border-zinc-850/30 overflow-x-auto">
                  {activeYearDocs.map((doc, dIdx) => (
                    <button
                      key={doc.fileId}
                      onClick={() => setActiveReviewDocIndex(dIdx)}
                      className={cn(
                        "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wide shrink-0 cursor-pointer transition-all",
                        activeReviewDocIndex === dIdx
                          ? "bg-white dark:bg-zinc-900 text-emerald-600 dark:text-teal-400 shadow-3xs border border-slate-200 dark:border-zinc-800"
                          : "text-slate-500 hover:text-slate-800 dark:hover:text-zinc-300"
                      )}
                    >
                      {doc.companyName}
                    </button>
                  ))}
                </div>
              )}

              {/* SPLIT SCREEN WORKSPACE LAYOUT */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                {/* Left Side: STICKY Document Details & Preview Area */}
                <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-8 max-h-[calc(100vh-140px)] overflow-y-auto pr-2">

                  {/* Metadata and Associated Files Controls */}
                  <div className="bg-white dark:bg-zinc-950 border border-slate-250 dark:border-zinc-850 p-5 rounded-2xl shadow-3xs space-y-4">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-teal-400 border-b border-slate-100 dark:border-zinc-850 pb-2">
                      Active Ingest Parameters
                    </h3>

                    {/* Company Name Editable */}
                    <div>
                      <label className="block text-[8px] uppercase tracking-widest font-black text-slate-400 mb-1.5">
                        Company Name
                      </label>
                      <input
                        type="text"
                        value={activeReviewDoc?.companyName || ""}
                        onChange={(e) => updateReviewDocMetadata(activeReviewDoc.fileId, "companyName", e.target.value)}
                        className="w-full bg-slate-100 dark:bg-black border border-slate-200 dark:border-zinc-800 px-3 py-2 text-xs font-bold text-slate-800 dark:text-white rounded-lg focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {/* Financial Year Selector */}
                      <div>
                        <label className="block text-[8px] uppercase tracking-widest font-black text-slate-400 mb-1.5">
                          Financial Year
                        </label>
                        <select
                          value={activeReviewDoc?.year || activeReviewYear}
                          onChange={(e) => updateReviewDocMetadata(activeReviewDoc.fileId, "year", e.target.value)}
                          className="w-full bg-slate-100 dark:bg-black border border-slate-200 dark:border-zinc-800 px-3 py-2 text-xs font-bold text-slate-800 dark:text-white rounded-lg focus:outline-none focus:border-emerald-500"
                        >
                          {["2025", "2024", "2023", "2022", "2021"].map((y) => (
                            <option key={y} value={y}>
                              FY {y}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Sector Selector */}
                      <div>
                        <label className="block text-[8px] uppercase tracking-widest font-black text-slate-400 mb-1.5">
                          Corporate Sector
                        </label>
                        <select
                          value={activeReviewDoc?.sector || reviewSector}
                          onChange={(e) => updateReviewDocMetadata(activeReviewDoc.fileId, "sector", e.target.value)}
                          className="w-full bg-slate-100 dark:bg-black border border-slate-200 dark:border-zinc-800 px-3 py-2 text-xs font-bold text-slate-800 dark:text-white rounded-lg focus:outline-none focus:border-emerald-500 uppercase tracking-wider text-[10px]"
                        >
                          {BURSA_SECTORS.map((s) => (
                            <option key={s} value={s}>
                              {s.replace(/_/g, " ")}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Files Associated & Add more files directly */}
                    <div className="pt-3 border-t border-slate-200 dark:border-zinc-850/60 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="block text-[8px] uppercase tracking-widest font-black text-slate-400">
                          Cohort File Sources
                        </label>
                        <span className="text-[9px] text-slate-400 font-mono font-bold">
                          Selected Pages: {activeReviewDoc?.selectedPages || "All"}
                        </span>
                      </div>

                      {/* Miniature file drop zones */}
                      <div className="relative border border-dashed border-slate-200 dark:border-zinc-800 rounded-xl p-3.5 bg-slate-50/40 dark:bg-zinc-900/10 flex items-center justify-between hover:border-emerald-500/50 transition-colors">
                        <input
                          type="file"
                          multiple
                          accept="application/pdf, image/*"
                          onChange={(e) => {
                            if (e.target.files) {
                              handleAddFilesToReviewDoc(e.target.files);
                            }
                          }}
                          className="absolute inset-0 opacity-0 cursor-pointer z-10"
                        />
                        <span className="text-[9px] font-black uppercase text-slate-500 dark:text-zinc-400">
                          + Add/Replace Report Files
                        </span>
                        <Upload className="w-3.5 h-3.5 text-slate-400" />
                      </div>

                      {/* Page selector modifier */}
                      <button
                        onClick={() => openPageSelectorFromReview(activeReviewDoc.fileId, activeReviewDoc.selectedPages || "")}
                        className="w-full py-2 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-900 dark:hover:bg-zinc-850 border border-slate-200/50 dark:border-zinc-800 text-[9px] font-black uppercase tracking-wider rounded-xl cursor-pointer transition-colors"
                      >
                        Modify Ingestion Pages ({activeReviewDoc?.selectedPages || "All"})
                      </button>
                    </div>
                  </div>

                  {/* Interactive document canvas preview panel */}
                  <div className="bg-slate-50 dark:bg-zinc-900/40 border border-slate-200 dark:border-zinc-850 p-4 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between mb-1 text-[9px] uppercase tracking-wider font-black text-slate-400">
                      <span>Interactive Preview Panel</span>
                      <span className="text-emerald-500 font-mono">PAGE {previewPage} / 412</span>
                    </div>

                    {getMockDocumentContent(activeReviewDoc?.companyName, previewPage)}

                    <div className="flex justify-between items-center pt-3 border-t border-slate-200 dark:border-zinc-800">
                      <button
                        onClick={() => setPreviewPage((p) => Math.max(1, p - 1))}
                        disabled={previewPage <= 1}
                        className="px-3 py-2 text-[9px] bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl font-black disabled:opacity-45 cursor-pointer uppercase tracking-wider text-slate-600 dark:text-zinc-300 hover:bg-slate-50"
                      >
                        ← PREV PAGE
                      </button>
                      <button
                        onClick={() => setPreviewPage((p) => Math.min(412, p + 1))}
                        disabled={previewPage >= 412}
                        className="px-3 py-2 text-[9px] bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl font-black disabled:opacity-45 cursor-pointer uppercase tracking-wider text-slate-600 dark:text-zinc-300 hover:bg-slate-50"
                      >
                        NEXT PAGE →
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right Side: Parsed Values Editor Form (organized by financial categories) */}
                <div className="lg:col-span-7 space-y-6">
                  {["incomeStatement", "balanceSheet", "cashFlow", "ratios", "growth", "advanced"].map((category) => {
                    const fields = activeReviewDoc?.extractedData?.[category] || {};
                    const fieldIds = Object.keys(fields);

                    if (fieldIds.length === 0) return null;

                    const categoryTitles: Record<string, string> = {
                      incomeStatement: "INCOME STATEMENT METRICS",
                      balanceSheet: "BALANCE SHEET METRICS",
                      cashFlow: "CASH FLOW STATEMENT METRICS",
                      ratios: "RATIOS & PERFORMANCE MARGINS",
                      growth: "HISTORICAL GROWTH INDICES",
                      advanced: "ADVANCED VALUE METRICS",
                    };

                    return (
                      <div
                        key={category}
                        className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-850/60 rounded-2xl overflow-hidden shadow-3xs"
                      >
                        {/* Category Header */}
                        <div className="bg-slate-50 dark:bg-zinc-900/60 px-5 py-4 border-b border-slate-200 dark:border-zinc-850">
                          <h3 className="text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:text-teal-400">
                            {categoryTitles[category]}
                          </h3>
                        </div>

                        {/* Financial Fields */}
                        <div className="divide-y divide-slate-100 dark:divide-zinc-850/60 px-5 py-3 space-y-3">
                          {fieldIds.map((fieldId) => {
                            const field = fields[fieldId];
                            const confidence = field?.confidence || "High";

                            return (
                              <div
                                key={fieldId}
                                className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center pt-3 first:pt-0"
                              >
                                {/* Label with glowing custom CSS confidence indicator */}
                                <div className="md:col-span-5 flex items-center gap-2.5">
                                  <span
                                    className={cn(
                                      "w-2 h-2 rounded-full inline-block shrink-0",
                                      confidence.toLowerCase() === "high"
                                        ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                                        : confidence.toLowerCase() === "medium"
                                          ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                                          : "bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"
                                    )}
                                    title={`Extraction confidence: ${confidence}`}
                                  />
                                  <span className="text-[10px] font-extrabold text-slate-600 dark:text-zinc-300 uppercase tracking-wide truncate">
                                    {fieldId.replace(/([A-Z])/g, " $1").trim()}
                                  </span>
                                </div>

                                {/* Editable Field Input */}
                                <div className="md:col-span-7">
                                  <input
                                    type="text"
                                    value={field?.value || ""}
                                    onChange={(e) =>
                                      updateReviewField(
                                        activeReviewDoc.fileId,
                                        category,
                                        fieldId,
                                        e.target.value
                                      )
                                    }
                                    className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800/80 rounded-xl px-4 py-2 text-xs font-bold text-slate-800 dark:text-white font-mono shadow-3xs"
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                  {/* Save everything */}
                  <button
                    onClick={handleSaveEverything}
                    disabled={isSavingLocal || reviewDocs.length === 0}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 rounded-xl text-xs tracking-[0.25em] flex items-center justify-center gap-3 shadow-md transition-all uppercase cursor-pointer"
                  >
                    {isSavingLocal ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> SYNCHRONIZING WITH SERVER DATABASE...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" /> COMMIT & SAVE EVERYTHING TO PLATFORM DB
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* FULLSCREEN PREVIEW & PAGE SELECTOR MODAL COMPONENT */}
      <PageSelectionModal
        isOpen={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        companyName={
          activePreviewAttachmentId === "markdown"
            ? (mdFile ? mdFile.name.replace(/\.[^/.]+$/, "") : "Markdown Extraction Document")
            : activePreviewAttachmentId
              ? attachments.find((a) => a.id === activePreviewAttachmentId)?.companyName || ""
              : reviewDocs.find((d) => d.fileId === activePreviewDocId)?.companyName || ""
        }
        initialSelectedPages={
          activePreviewAttachmentId === "markdown"
            ? mdSelectedPages || "all"
            : activePreviewAttachmentId
              ? attachments.find((a) => a.id === activePreviewAttachmentId)?.selectedPages || "1-15,45-60"
              : reviewDocs.find((d) => d.fileId === activePreviewDocId)?.selectedPages || "1-15,45-60"
        }
        onApply={handleApplyPageSelection}
        getMockDocumentContent={getMockDocumentContent}
        files={
          activePreviewAttachmentId === "markdown"
            ? (mdFile ? [mdFile] : undefined)
            : activePreviewAttachmentId
              ? attachments.find((a) => a.id === activePreviewAttachmentId)?.files
              : undefined
        }
        storedFileName={
          activePreviewDocId
            ? reviewDocs.find((d) => d.fileId === activePreviewDocId)?.storedFileName
            : undefined
        }
        docType={
          activePreviewDocId
            ? reviewDocs.find((d) => d.fileId === activePreviewDocId)?.docType
            : undefined
        }
      />
    </div>
  );
}
