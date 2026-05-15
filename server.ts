import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import multer from "multer";
// @ts-ignore
import pdf from "pdf-parse/lib/pdf-parse.js";
import { XMLBuilder, XMLParser } from "fast-xml-parser";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;
const DB_ROOT = process.env.FINCORE_DB_PATH || "./fincore_db";

// Ensure DB root exists
if (!fs.existsSync(DB_ROOT)) {
  fs.mkdirSync(DB_ROOT, { recursive: true });
}

const storage = multer.memoryStorage();
const upload = multer({ storage });

// Financial Dictionary for normalization
const DICTIONARY: Record<string, string[]> = {
  revenue: ["Revenue", "Turnover", "Total Revenue", "Income from operations"],
  netProfit: ["Profit After Tax", "Profit Attributable to Owners", "Net Income", "Net Profit"],
  costOfSales: ["Cost of Sales", "Cost of Revenue", "Direct Costs"],
  grossProfit: ["Gross Profit"],
  totalAssets: ["Total Assets"],
  totalLiabilities: ["Total Liabilities"],
  operatingCashFlow: ["Net Cash from Operating Activities", "Cash Generated from Operations"],
};

// Simple table row extractor using regex
function extractNumericValue(text: string, keys: string[]): string | null {
  for (const key of keys) {
    // Look for lines that start with the key (case insensitive) followed by numbers
    // This is a simplified logic for extraction
    const regex = new RegExp(`${key}\\s+([\\(]?[\\d,.]+[\\)]?)`, "i");
    const match = text.match(regex);
    if (match) {
      let val = match[1].replace(/[\(\),]/g, (m) => (m === "(" || m === ")" ? "-" : ""));
      return val.trim();
    }
  }
  return null;
}

async function startServer() {
  // API routes
  app.use(express.json());

  // Analyze PDFs
  app.post("/api/analyze", upload.array("reports"), async (req: any, res) => {
    try {
      const { year, sector } = req.body;
      const files = req.files as any[];

      if (!files || files.length === 0) {
        return res.status(400).json({ error: "No files uploaded" });
      }

      const results = [];

      for (const file of files) {
        const data = await pdf(file.buffer);
        const text = data.text;

        // Metadata extraction (simplified)
        const companyNameMatch = text.match(/([A-Z\s]{4,}(?:BERHAD|BHD))/i);
        const companyName = companyNameMatch ? companyNameMatch[1].trim() : file.originalname.replace(".pdf", "");
        
        // Conflict detection: look for sector keywords
        let detectedSector = sector;
        const lowText = text.toLowerCase();
        if (lowText.includes("semiconductor") || lowText.includes("software")) detectedSector = "TECHNOLOGY";
        else if (lowText.includes("palm oil") || lowText.includes("estate")) detectedSector = "PLANTATION";
        else if (lowText.includes("bank") || lowText.includes("insurance")) detectedSector = "FINANCIAL_SERVICES";

        const financials: any = {
          incomeStatement: {},
          balanceSheet: {},
          cashFlow: {},
        };

        // Extract values
        for (const [id, keys] of Object.entries(DICTIONARY)) {
          const val = extractNumericValue(text, keys);
          if (id === "revenue" || id === "netProfit" || id === "costOfSales" || id === "grossProfit") {
            financials.incomeStatement[id] = val;
          } else if (id === "totalAssets" || id === "totalLiabilities") {
            financials.balanceSheet[id] = val;
          } else if (id === "operatingCashFlow") {
            financials.cashFlow[id] = val;
          }
        }

        const reportData = {
          CompanyReport: {
            Metadata: {
              CompanyName: companyName,
              FinancialYear: year,
              Sector: detectedSector,
              OriginalFileName: file.originalname,
              Currency: "MYR '000",
            },
            Financials: financials,
          },
        };

        // Save to XML
        const sectorDir = path.join(DB_ROOT, year, detectedSector);
        if (!fs.existsSync(sectorDir)) fs.mkdirSync(sectorDir, { recursive: true });

        const fileName = `${companyName.replace(/[^a-zA-Z0-9]/g, "_")}.xml`;
        const builder = new XMLBuilder({ format: true });
        const xmlContent = builder.build(reportData);
        fs.writeFileSync(path.join(sectorDir, fileName), xmlContent);

        results.push({
          companyName,
          detectedSector,
          isConflict: detectedSector !== sector,
          fileName,
        });
      }

      res.json({ success: true, results });
    } catch (error: any) {
      console.error("Analysis error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get reports for a year/sector
  app.get("/api/reports/:year/:sector", async (req, res) => {
    try {
      const { year, sector } = req.params;
      const sectorPath = path.join(DB_ROOT, year, sector);

      if (!fs.existsSync(sectorPath)) {
        return res.json([]);
      }

      const files = fs.readdirSync(sectorPath);
      const parser = new XMLParser();
      const reports = files.map((file) => {
        const content = fs.readFileSync(path.join(sectorPath, file), "utf-8");
        return parser.parse(content).CompanyReport;
      });

      res.json(reports);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get archive list
  app.get("/api/archive", async (req, res) => {
    try {
      if (!fs.existsSync(DB_ROOT)) return res.json([]);
      
      const years = fs.readdirSync(DB_ROOT);
      const archive = years.map(year => {
        const yearPath = path.join(DB_ROOT, year);
        const sectors = fs.readdirSync(yearPath);
        return { year, sectors };
      });
      
      res.json(archive);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
