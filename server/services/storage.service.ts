import fs from "fs";
import path from "path";
import { XMLBuilder, XMLParser } from "fast-xml-parser";
import { IStorageService } from "../controllers/report.controller";

export class StorageService implements IStorageService {
  private dbRoot: string;
  private builder: XMLBuilder;
  private parser: XMLParser;

  constructor() {
    this.dbRoot = process.env.FINCORE_DB_PATH || "./fincore_db";
    
    this.builder = new XMLBuilder({ 
      format: true, 
      ignoreAttributes: false 
    });
    
    this.parser = new XMLParser({ 
      ignoreAttributes: false, 
      parseAttributeValue: true 
    });

    // Ensure database path exists
    if (!fs.existsSync(this.dbRoot)) {
      fs.mkdirSync(this.dbRoot, { recursive: true });
    }
  }

  /**
   * Marshals report snapshots into standardized corporate flat-file XML models
   */
  public async saveReport(report: any, year: string, sector: string): Promise<any> {
    const { companyName, financials, storedFileName, originalFileName, docType } = report;
    const pureMarkdown = report.markdown?.pureMarkdown || report.Markdown?.pureMarkdown || report.pureMarkdown || "";

    const reportData = {
      CompanyReport: {
        Metadata: {
          CompanyName: companyName,
          FinancialYear: year,
          Sector: sector,
          OriginalFileName: originalFileName,
          StoredFileName: storedFileName,
          Currency: "MYR '000",
          DocType: docType,
          ProcessedAt: new Date().toISOString(),
        },
        Financials: financials,
        Markdown: {
          pureMarkdown,
        },
      },
    };

    const sectorDir = path.join(this.dbRoot, String(year), sector);
    if (!fs.existsSync(sectorDir)) {
      fs.mkdirSync(sectorDir, { recursive: true });
    }

    const safeName = (companyName || "UNKNOWN_COMPANY").replace(/[^a-zA-Z0-9]/g, "_").slice(0, 60);
    const destinationPath = path.join(sectorDir, `${safeName}.xml`);

    if (storedFileName) {
      const existingXmlFiles = fs.readdirSync(sectorDir).filter((f) => f.endsWith(".xml"));
      for (const existingFile of existingXmlFiles) {
        const existingPath = path.join(sectorDir, existingFile);
        if (existingPath === destinationPath) continue;

        try {
          const existingContent = fs.readFileSync(existingPath, "utf-8");
          const existingReport = this.parser.parse(existingContent).CompanyReport;
          if (existingReport?.Metadata?.StoredFileName === storedFileName) {
            fs.unlinkSync(existingPath);
          }
        } catch (err) {
          console.error(`[WARN] Could not check existing report ${existingFile}:`, err);
        }
      }
    }

    fs.writeFileSync(destinationPath, this.builder.build(reportData));
    console.log(`[SAVED] Structured XML updated for entity: ${companyName} -> ${sector}/${year}`);

    return { companyName, fileName: `${safeName}.xml`, sector, year };
  }

  /**
   * Reconstructs an array of structured reports matching criteria
   */
  public getReportsByYearAndSector(year: string, sector: string): any[] {
    const sectorPath = path.join(this.dbRoot, year, sector);
    if (!fs.existsSync(sectorPath)) return [];

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
          if (report?.Metadata?.StoredFileName === storedFileName) {
            return report.Markdown?.pureMarkdown || "";
          }
        } catch (err) {
          console.error(`[WARN] Failed to read markdown from ${entryPath}:`, err);
        }
      }
    }

    return "";
  }
}