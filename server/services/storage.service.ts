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
      },
    };

    const sectorDir = path.join(this.dbRoot, year, sector);
    if (!fs.existsSync(sectorDir)) {
      fs.mkdirSync(sectorDir, { recursive: true });
    }

    const safeName = companyName.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 60);
    const destinationPath = path.join(sectorDir, `${safeName}.xml`);

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
}