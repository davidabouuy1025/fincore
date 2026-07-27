import fs from "fs";
import path from "path";
import { XMLBuilder, XMLParser } from "fast-xml-parser";
import { IStorageService } from "../controllers/report.controller";
import { toTitleCase } from "../utils";

export class StorageService implements IStorageService {
  private dbRoot: string;
  private storageRoot: string;
  private builder: XMLBuilder;
  private parser: XMLParser;

  constructor() {
    this.dbRoot = process.env.FINCORE_DB_PATH || "./fincore_db";
    this.storageRoot = path.join(this.dbRoot, "original_reports");
    
    this.builder = new XMLBuilder({ 
      format: true, 
      ignoreAttributes: false 
    });
    
    this.parser = new XMLParser({ 
      ignoreAttributes: false, 
      parseAttributeValue: true,
      parseTagValue: false,
    });

    // Ensure database path exists
    if (!fs.existsSync(this.dbRoot)) {
      fs.mkdirSync(this.dbRoot, { recursive: true });
    }
    if (!fs.existsSync(this.storageRoot)) {
      fs.mkdirSync(this.storageRoot, { recursive: true });
    }
  }

  /**
   * Marshals report snapshots into standardized corporate flat-file XML models
   */
  public async saveReport(report: any, defaultYear: string, defaultSector: string): Promise<any> {
    let { companyName, financials, storedFileName, originalFileName, docType, selectedPages, period, currency } = report;
    const reportYear = String(report.year || defaultYear).trim();
    const reportSector = String(report.sector || defaultSector).trim().toUpperCase().replace(/\s+/g, "_");
    const pureMarkdown = report.markdown?.pureMarkdown || report.Markdown?.pureMarkdown || report.pureMarkdown || "";
    companyName = toTitleCase(companyName || "Unknown Company");

    if (!companyName?.trim()) {
      throw new Error("Company name cannot be empty");
    }

    // Parse storedFileName and originalFileName into lists for multi-file support in XML tags
    let storedFilesArray: string[] = [];
    if (storedFileName) {
      if (Array.isArray(storedFileName)) {
        storedFilesArray = storedFileName;
      } else {
        storedFilesArray = String(storedFileName)
          .split(",")
          .map((f) => f.trim())
          .filter(Boolean);
      }
    }

    let originalFilesArray: string[] = [];
    if (originalFileName) {
      if (Array.isArray(originalFileName)) {
        originalFilesArray = originalFileName;
      } else {
        originalFilesArray = String(originalFileName)
          .split(",")
          .map((f) => f.trim())
          .filter(Boolean);
      }
    }

    // Rename the physical uploaded PDFs to COMPANY_YEAR.pdf, COMPANY_YEAR_2.pdf, etc.
    const cleanCompany = companyName.toUpperCase().replace(/[^A-Z0-9]/g, "_").replace(/_+/g, "_").replace(/(^_|_$)/g, "");
    const companyBase = cleanCompany || "COMPANY";
    let baseName = `${companyBase}_${reportYear}`;
    if (period && period.toLowerCase() !== "annual") {
      baseName = `${companyBase}_${reportYear}_${period.toUpperCase()}`;
    }

    const updatedStoredFiles: string[] = [];
    const updatedOriginalFiles: string[] = [];

    for (let i = 0; i < storedFilesArray.length; i++) {
      const oldFile = storedFilesArray[i];
      const origFile = originalFilesArray[i] || oldFile;
      const ext = path.extname(oldFile) || ".pdf";

      let targetName = "";
      if (i === 0) {
        targetName = `${baseName}${ext}`;
      } else {
        targetName = `${baseName}_${i + 1}${ext}`;
      }

      const oldPath = path.join(this.storageRoot, oldFile);
      const newPath = path.join(this.storageRoot, targetName);

      if (fs.existsSync(oldPath)) {
        if (oldPath !== newPath) {
          if (fs.existsSync(newPath)) {
            try { fs.unlinkSync(newPath); } catch {}
          }
          try {
            fs.renameSync(oldPath, newPath);
            console.log(`[RENAME] Renamed uploaded PDF ${oldFile} to ${targetName}`);
          } catch (renameErr) {
            console.error(`[WARN] Failed to rename uploaded PDF ${oldFile} to ${targetName}:`, renameErr);
          }
        }
      }

      updatedStoredFiles.push(targetName);
      updatedOriginalFiles.push(origFile);
    }

    storedFilesArray = updatedStoredFiles;
    originalFilesArray = updatedOriginalFiles;

    const reportData = {
      CompanyReport: {
        Metadata: {
          CompanyName: companyName,
          FinancialYear: reportYear,
          Period: period || "annual",
          Sector: reportSector,
          OriginalFileName: originalFilesArray.length > 0 ? (originalFilesArray.length === 1 ? originalFilesArray[0] : originalFilesArray) : originalFileName,
          StoredFileName: storedFilesArray.length > 0 ? (storedFilesArray.length === 1 ? storedFilesArray[0] : storedFilesArray) : storedFileName,
          Currency: (function(raw: any): string {
            if (!raw) return "MYR";
            const str = String(raw).trim().toUpperCase();
            if (str.includes("MYR") || str.includes("RM") || str.includes("RINGGIT")) return "MYR";
            if (str.includes("USD") || str.includes("DOLLAR") || str.includes("$")) return "USD";
            if (str.includes("CNY") || str.includes("RMB") || str.includes("YUAN")) return "CNY";
            if (str.includes("HKD")) return "HKD";
            if (str.includes("JPY") || str.includes("YEN") || str.includes("¥")) return "JPY";
            if (str.includes("EUR") || str.includes("EURO") || str.includes("€")) return "EUR";
            const clean = str.replace(/[^A-Z]/g, "").slice(0, 3);
            return clean || "MYR";
          })(currency),
          DocType: docType,
          ProcessedAt: new Date().toISOString(),
          SelectedPages: selectedPages || "",
        },
        Financials: financials,
        Markdown: {
          pureMarkdown,
        },
      },
    };

    const sectorDir = path.join(this.dbRoot, String(reportYear), reportSector);
    if (!fs.existsSync(sectorDir)) {
      fs.mkdirSync(sectorDir, { recursive: true });
    }

    let fileName = "";
    if (storedFilesArray.length > 0) {
      const firstFile = storedFilesArray[0];
      if (firstFile) {
        const fileBase = path.basename(firstFile, path.extname(firstFile));
        fileName = `${fileBase}.xml`;
      }
    }

    if (!fileName) {
      const safeName = companyName.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 60);
      fileName = `${safeName}.xml`;
    }

    const destinationPath = path.join(sectorDir, fileName);

    if (storedFilesArray.length > 0) {
      const existingXmlFiles = fs.readdirSync(sectorDir).filter((f) => f.endsWith(".xml"));
      for (const existingFile of existingXmlFiles) {
        const existingPath = path.join(sectorDir, existingFile);
        if (existingPath === destinationPath) continue;

        try {
          const existingContent = fs.readFileSync(existingPath, "utf-8");
          const existingReport = this.parser.parse(existingContent).CompanyReport;
          const existingStored = existingReport?.Metadata?.StoredFileName;
          const existingArr = Array.isArray(existingStored)
            ? existingStored
            : String(existingStored || "").split(",").map(f => f.trim()).filter(Boolean);

          const hasOverlap = existingArr.some(f => storedFilesArray.includes(f));
          if (hasOverlap) {
            fs.unlinkSync(existingPath);
          }
        } catch (err) {
          console.error(`[WARN] Could not check existing report ${existingFile}:`, err);
        }
      }
    }

    fs.writeFileSync(destinationPath, this.builder.build(reportData));
    console.log(`[SAVED] Structured XML updated for entity: ${companyName} -> ${reportSector}/${reportYear} as ${fileName}`);

    return { companyName, fileName, sector: reportSector, year: reportYear };
  }

  /**
   * Helper to locate sector directory flexibly (handles spaces vs underscores, casing)
   */
  private findSectorDir(year: string, sector: string): string | null {
    const yearDir = path.join(this.dbRoot, year);
    if (!fs.existsSync(yearDir)) return null;

    const cleanTarget = String(sector || "").trim().toUpperCase().replace(/\s+/g, "_");
    
    // Check exact match first
    const exact = path.join(yearDir, cleanTarget);
    if (fs.existsSync(exact)) return exact;

    // Search directory entries
    const entries = fs.readdirSync(yearDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const normEntry = entry.name.toUpperCase().replace(/\s+/g, "_");
        if (normEntry === cleanTarget) {
          return path.join(yearDir, entry.name);
        }
      }
    }
    return null;
  }

  /**
   * Reconstructs an array of structured reports matching criteria
   */
  public getReportsByYearAndSector(year: string, sector: string): any[] {
    const sectorPath = this.findSectorDir(year, sector);
    if (!sectorPath) return [];

    const files = fs.readdirSync(sectorPath).filter((f) => f.endsWith(".xml"));

    return files
      .map((file) => {
        try {
          const content = fs.readFileSync(path.join(sectorPath, file), "utf-8");
          return this.parser.parse(content).CompanyReport;
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  }

  /**
   * Retrieves reports for up to 5 consecutive years starting from year
   */
  public getMultiYearReports(year: string, sector: string): any[] {
    const startYear = parseInt(year, 10);
    if (isNaN(startYear)) return [];

    const reports: any[] = [];

    for (let i = 0; i < 5; i++) {
      const targetY = String(startYear - i);
      const sectorPath = this.findSectorDir(targetY, sector);

      if (sectorPath && fs.existsSync(sectorPath)) {
        const files = fs.readdirSync(sectorPath).filter((f) => f.endsWith(".xml"));
        for (const file of files) {
          try {
            const content = fs.readFileSync(path.join(sectorPath, file), "utf-8");
            const parsedReport = this.parser.parse(content).CompanyReport;
            if (parsedReport) {
              if (!parsedReport.Metadata?.FinancialYear) {
                if (parsedReport.Metadata) {
                  parsedReport.Metadata.FinancialYear = targetY;
                }
              }
              reports.push(parsedReport);
            }
          } catch (err) {
            console.error(`[WARN] Error parsing multi-year report ${file} for year ${targetY}:`, err);
          }
        }
      }
    }

    return reports;
  }

  /**
   * Scans root storage to present an active navigation summary mapping matrix
   */
  public getArchiveSummary(): any[] {
    if (!fs.existsSync(this.dbRoot)) return [];

    const entries = fs.readdirSync(this.dbRoot, { withFileTypes: true });
    const years = entries
      .filter((e) => e.isDirectory() && /^\d{4}$/.test(e.name))
      .map((e) => e.name);

    const archive = years.map((year) => {
      const yearPath = path.join(this.dbRoot, year);
      const sectors = fs
        .readdirSync(yearPath, { withFileTypes: true })
        .filter((e) => e.isDirectory())
        .map((e) => e.name);
        
      return { year, sectors };
    });

    return archive.sort((a, b) => Number(b.year) - Number(a.year));
  }

  /**
   * Searches the db for a report with a matching storedFileName to retrieve pureMarkdown.
   */
  public findSavedMarkdownByStoredFileName(storedFileName: string): string {
    if (!storedFileName || !fs.existsSync(this.dbRoot)) return "";

    const filesToSearch = String(storedFileName).split(",").map(f => f.trim()).filter(Boolean);
    let combinedMarkdown = "";

    for (const targetFile of filesToSearch) {
      const stack = [this.dbRoot];
      while (stack.length > 0) {
        const current = stack.pop()!;
        for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
          const entryPath = path.join(current, entry.name);
          if (entry.isDirectory()) {
            if (entry.name !== "original_reports") stack.push(entryPath);
            continue;
          }

          if (!entry.name.endsWith(".xml")) continue;

          try {
            const content = fs.readFileSync(entryPath, "utf-8");
            const report = this.parser.parse(content).CompanyReport;
            const fileVal = report?.Metadata?.StoredFileName;
            const isMatch = Array.isArray(fileVal)
              ? fileVal.includes(targetFile)
              : fileVal === targetFile;
            if (isMatch && report.Markdown?.pureMarkdown) {
              combinedMarkdown += (combinedMarkdown ? "\n\n" : "") + report.Markdown.pureMarkdown;
            }
          } catch (err) {
            console.error(`[WARN] Failed to read markdown from ${entryPath}:`, err);
          }
        }
      }
    }

    return combinedMarkdown;
  }
}