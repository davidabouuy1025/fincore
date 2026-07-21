import { Request, Response } from "express";

// Placeholder interfaces for injected services
export interface IOcrService {
  extractRawText(file: Express.Multer.File): Promise<{ text: string; docType: string }>;
}

export interface IExtractionService {
  processFinancials(text: string, originalName: string): {
    suggestedCompanyName: string;
    suggestedSector: string;
    extractedData: any;
  };
  extractedDataToFinancials(extractedData: any): Record<string, Record<string, string | null>>;
}

export interface IStorageService {
  saveReport(report: any, year: string, sector: string): Promise<any>;
  getReportsByYearAndSector(year: string, sector: string): any[];
  getArchiveSummary(): any[];
  findSavedMarkdownByStoredFileName(storedFileName: string): string;
}

export interface IAiService {
  generateInsights(reports: any[], sector: string, year: string): Promise<string>;
  extractFinancialsWithGemini(markdown: string): Promise<any>;
}

export class ReportController {
  constructor(
    private ocrService: IOcrService,
    private extractionService: IExtractionService,
    private storageService: IStorageService,
    private aiService: IAiService
  ) {}

  /**
   * POST /api/parse
   * Ingests files and attempts heuristic extraction
   */
  parseReports = async (req: Request, res: Response) => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ error: "No files provided" });
      }

      const parsed = [];

      for (const file of files) {
        // 1. Process files via OCR Layer
        const { text, docType } = await this.ocrService.extractRawText(file);

        // 2. Pass textual output to extraction analysis engine
        const analysis = this.extractionService.processFinancials(text, file.originalname);

        parsed.push({
          fileId: file.filename,
          originalFileName: file.originalname,
          storedFileName: file.filename,
          docType,
          markdown: {
            pureMarkdown: text,
          },
          ...analysis,
          rawTextLength: text.length,
        });
      }

      return res.json({ success: true, parsed });
    } catch (err: any) {
      console.error("[Controller Error] Ingestion breakdown:", err);
      return res.status(500).json({ error: err.message });
    }
  };

  /**
   * POST /api/save
   * Persists user-approved metrics into persistent storage XML structure
   */
  saveReports = async (req: Request, res: Response) => {
    try {
      const { reports, year, sector } = req.body;
      if (!reports || !Array.isArray(reports)) {
        return res.status(400).json({ error: "Invalid reports dataset" });
      }

      const saved = [];
      for (const report of reports) {
        const output = await this.storageService.saveReport(report, year, sector);
        saved.push(output);
      }

      return res.json({ success: true, saved });
    } catch (err: any) {
      console.error("[Controller Error] Data persistence exception:", err);
      return res.status(500).json({ error: err.message });
    }
  };

  /**
   * GET /api/reports/:year/:sector
   * Fetches lists of structured items from a specific domain
   */
  getReports = async (req: Request, res: Response) => {
    try {
      const { year, sector } = req.params;
      const reports = this.storageService.getReportsByYearAndSector(year, sector);
      return res.json(reports);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  };

  /**
   * GET /api/archive
   * Structural summary tree map retrieval
   */
  getArchive = async (req: Request, res: Response) => {
    try {
      const archive = this.storageService.getArchiveSummary();
      return res.json(archive);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  };

  /**
   * POST /api/ai-insights
   * Generates localized market analysis
   */
  getAiInsights = async (req: Request, res: Response) => {
    try {
      const { reports, sector, year } = req.body;
      const responseText = await this.aiService.generateInsights(reports, sector, year);
      return res.json({ text: responseText });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  };

  /**
   * POST /api/ai-reanalyze
   * Re-extracts financials from stored markdown using Gemini AI or fallback
   */
  reanalyze = async (req: Request, res: Response) => {
    try {
      const { storedFileName, markdown } = req.body;

      let sourceMarkdown = typeof markdown === "string" ? markdown : "";
      if (!sourceMarkdown.trim() && storedFileName) {
        sourceMarkdown = this.storageService.findSavedMarkdownByStoredFileName(storedFileName);
      }

      if (!sourceMarkdown.trim()) {
        return res.status(400).json({ error: "No markdown available for AI re-analysis" });
      }

      let extractedFinancials;
      try {
        extractedFinancials = await this.aiService.extractFinancialsWithGemini(sourceMarkdown);
      } catch (aiErr) {
        console.error("[WARN] Gemini re-analysis failed, using local markdown extraction:", aiErr);
        const extracted = this.extractionService.processFinancials(sourceMarkdown, storedFileName || "document.pdf");
        extractedFinancials = this.extractionService.extractedDataToFinancials(extracted.extractedData);
      }

      return res.json({ success: true, extractedFinancials });
    } catch (err: any) {
      console.error("[ERROR] AI re-analysis failure:", err);
      return res.status(500).json({ error: err.message });
    }
  };
}