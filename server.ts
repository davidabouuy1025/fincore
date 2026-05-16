import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import multer from "multer";
// @ts-ignore
import pdfParse from "pdf-parse";
import { XMLBuilder, XMLParser } from "fast-xml-parser";
import dotenv from "dotenv";
import { createWorker } from "tesseract.js";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const DB_ROOT = process.env.FINCORE_DB_PATH || "./fincore_db";
const STORAGE_ROOT = path.join(DB_ROOT, "original_reports");

// Ensure directories exist
[DB_ROOT, STORAGE_ROOT].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, STORAGE_ROOT),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, "_")}`),
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

// ── Financial keyword dictionary ──────────────────────────────────────────────
const DICTIONARY: Record<string, string[]> = {
  revenue: [
    "Revenue",
    "Turnover",
    "Total Revenue",
    "Total Turnover",
    "Income from Operations",
    "Net Revenue",
    "Sales",
  ],
  netProfit: [
    "Profit After Tax",
    "Profit Attributable to Owners",
    "Net Income",
    "Net Profit",
    "Profit After Taxation",
    "PAT",
  ],
  costOfSales: [
    "Cost of Sales",
    "Cost of Revenue",
    "Direct Costs",
    "Cost of Goods Sold",
    "COGS",
  ],
  grossProfit: ["Gross Profit"],
  totalAssets: ["Total Assets"],
  totalLiabilities: ["Total Liabilities"],
  operatingCashFlow: [
    "Net Cash from Operating Activities",
    "Cash Generated from Operations",
    "Net Cash Generated from Operating",
    "Operating Activities",
  ],
};

// ── Value extractor: tries multiple patterns ──────────────────────────────────
function extractValue(text: string, keys: string[]): string | null {
  for (const key of keys) {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    // Pattern 1: key followed by optional spaces/tabs then a number (same line)
    const patterns = [
      new RegExp(`${escaped}[\\s\\t:]*([\\(]?[\\d,\\.]+[\\)]?)`, "i"),
      // Pattern 2: key then newline(s) then number
      new RegExp(`${escaped}[\\s\\S]{0,50}?([\\(]?[\\d,\\.]+[\\)]?)`, "i"),
    ];

    for (const regex of patterns) {
      const match = text.match(regex);
      if (match && match[1]) {
        let val = match[1].replace(/,/g, "");
        // Convert parenthesised negatives: (1234) → -1234
        if (val.startsWith("(") && val.endsWith(")")) {
          val = "-" + val.slice(1, -1);
        }
        const num = parseFloat(val);
        if (!isNaN(num) && num !== 0) return String(num);
      }
    }
  }
  return null;
}

// ── OCR via Tesseract ─────────────────────────────────────────────────────────
async function performOCR(filePath: string): Promise<string> {
  const worker = await createWorker("eng");
  try {
    const { data: { text } } = await worker.recognize(filePath);
    return text;
  } finally {
    await worker.terminate();
  }
}

// ── Detect company name from text ────────────────────────────────────────────
function detectCompanyName(text: string, fallback: string): string {
  // Try Berhad / Bhd first
  const berhadMatch = text.match(/([A-Z][A-Z\s&()'.,]{3,60}(?:BERHAD|BHD))/i);
  if (berhadMatch) return berhadMatch[1].trim().replace(/\s+/g, " ");

  // Try lines of all-caps at start
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  for (const line of lines.slice(0, 20)) {
    if (line.length > 5 && line.length < 80 && /^[A-Z][A-Z\s&.()',-]+$/.test(line)) {
      return line;
    }
  }
  return fallback.replace(/\.(pdf|png|jpg|jpeg)$/i, "").replace(/[-_]/g, " ").trim();
}

// ── Detect sector from text ───────────────────────────────────────────────────
function detectSector(text: string, defaultSector: string): string {
  const t = text.toLowerCase();
  if (/semiconductor|software|tech|it services|cloud|digital/.test(t)) return "TECHNOLOGY";
  if (/palm oil|plantation|estate|rubber/.test(t)) return "PLANTATION";
  if (/bank|insurance|finance|financial services|capital/.test(t)) return "FINANCIAL_SERVICES";
  if (/consumer|retail|beverage|food|household/.test(t)) return "CONSUMER_PRODUCTS";
  if (/manufacturing|industrial|machinery|equipment/.test(t)) return "INDUSTRIAL_PRODUCTS";
  if (/reit|property fund|real estate investment trust/.test(t)) return "REITS";
  if (/oil|gas|energy|petroleum|power/.test(t)) return "ENERGY";
  if (/hospital|pharma|healthcare|medical|clinic/.test(t)) return "HEALTHCARE";
  if (/construction|contractor|infrastructure|building/.test(t)) return "CONSTRUCTION";
  return defaultSector;
}

// ── Server boot ───────────────────────────────────────────────────────────────
async function startServer() {
  app.use(express.json());
  app.use("/reports", express.static(STORAGE_ROOT));

  // ── POST /api/analyze ──
  app.post("/api/analyze", upload.array("reports"), async (req: any, res) => {
    try {
      const { year = "2025", sector = "TECHNOLOGY" } = req.body;
      const files: Express.Multer.File[] = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        return res.status(400).json({ error: "No files provided" });
      }

      const results = [];

      for (const file of files) {
        let text = "";
        let docType = "DIGITAL_PDF";

        try {
          if (file.mimetype === "application/pdf") {
            const buffer = fs.readFileSync(file.path);
            const parsed = await pdfParse(buffer);
            text = parsed.text || "";

            if (text.trim().length < 200) {
              console.log(`[OCR] Scanned PDF detected: ${file.originalname}`);
              text = await performOCR(file.path);
              docType = "SCANNED_PDF";
            }
          } else if (file.mimetype.startsWith("image/")) {
            console.log(`[OCR] Image file: ${file.originalname}`);
            text = await performOCR(file.path);
            docType = "IMAGE";
          }
        } catch (parseErr) {
          console.error(`[WARN] Parse error for ${file.originalname}:`, parseErr);
          text = await performOCR(file.path);
          docType = "SCANNED_PDF";
        }

        const companyName = detectCompanyName(text, file.originalname);
        const detectedSector = detectSector(text, sector);

        const financials: Record<string, Record<string, string | null>> = {
          incomeStatement: {},
          balanceSheet: {},
          cashFlow: {},
        };

        for (const [id, keys] of Object.entries(DICTIONARY)) {
          const val = extractValue(text, keys);
          if (["revenue", "netProfit", "costOfSales", "grossProfit"].includes(id)) {
            financials.incomeStatement[id] = val;
          } else if (["totalAssets", "totalLiabilities"].includes(id)) {
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
              StoredFileName: file.filename,
              Currency: "MYR '000",
              DocType: docType,
              ProcessedAt: new Date().toISOString(),
            },
            Financials: financials,
          },
        };

        // Save XML
        const sectorDir = path.join(DB_ROOT, year, detectedSector);
        if (!fs.existsSync(sectorDir)) fs.mkdirSync(sectorDir, { recursive: true });

        const safeName = companyName.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 60);
        const fileName = `${safeName}.xml`;
        const builder = new XMLBuilder({ format: true, ignoreAttributes: false });
        fs.writeFileSync(path.join(sectorDir, fileName), builder.build(reportData));

        results.push({
          companyName,
          detectedSector,
          isConflict: detectedSector !== sector,
          fileName,
          docType,
          storedFileName: file.filename,
        });

        console.log(`[OK] Processed: ${companyName} (${docType}) → ${detectedSector}`);
      }

      res.json({ success: true, results });
    } catch (err: any) {
      console.error("[ERROR] Analysis failure:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // ── GET /api/reports/:year/:sector ──
  app.get("/api/reports/:year/:sector", (req, res) => {
    try {
      const { year, sector } = req.params;
      const sectorPath = path.join(DB_ROOT, year, sector);

      if (!fs.existsSync(sectorPath)) return res.json([]);

      const parser = new XMLParser({ ignoreAttributes: false, parseAttributeValue: true });
      const files = fs.readdirSync(sectorPath).filter((f) => f.endsWith(".xml"));

      const reports = files
        .map((file) => {
          try {
            const content = fs.readFileSync(path.join(sectorPath, file), "utf-8");
            return parser.parse(content).CompanyReport;
          } catch {
            return null;
          }
        })
        .filter(Boolean);

      res.json(reports);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── GET /api/archive ──
  app.get("/api/archive", (req, res) => {
    try {
      if (!fs.existsSync(DB_ROOT)) return res.json([]);

      const entries = fs.readdirSync(DB_ROOT, { withFileTypes: true });
      const years = entries.filter((e) => e.isDirectory() && /^\d{4}$/.test(e.name)).map((e) => e.name);

      const archive = years.map((year) => {
        const yearPath = path.join(DB_ROOT, year);
        const sectors = fs
          .readdirSync(yearPath, { withFileTypes: true })
          .filter((e) => e.isDirectory())
          .map((e) => e.name);
        return { year, sectors };
      });

      res.json(archive.sort((a, b) => Number(b.year) - Number(a.year)));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── POST /api/ai-insights ──
  app.post("/api/ai-insights", async (req, res) => {
    try {
      const { reports, sector, year } = req.body;
      const apiKey = process.env.ZHIPU_AI_API_KEY;

      if (!apiKey) {
        return res.status(500).json({ error: "ZHIPU_AI_API_KEY not configured in .env" });
      }

      const prompt = `You are a financial analyst specializing in Bursa Malaysia.

Analyze the following financial data for companies in the ${sector} sector for FY${year}.
Provide a concise, structured comparison covering:
1. Revenue & Profitability
2. Balance Sheet Strength (Assets vs Liabilities)
3. Cash Flow Health
4. Ranking: which company appears strongest overall and why.

Keep it under 300 words. Be direct and professional.

DATA:
${JSON.stringify(
  reports.map((r: any) => ({
    company: r.Metadata?.CompanyName,
    financials: r.Financials,
  })),
  null,
  2
)}`;

      const response = await fetch("https://open.bigmodel.cn/api/paas/v4/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "glm-4",
          messages: [{ role: "user", content: prompt }],
          stream: false,
          max_tokens: 600,
        }),
      });

      const data: any = await response.json();

      if (data.choices?.[0]?.message?.content) {
        res.json({ text: data.choices[0].message.content });
      } else {
        console.error("[ZAI] Unexpected response:", JSON.stringify(data));
        res.status(500).json({ error: data.error?.message || "Invalid response from ZAI" });
      }
    } catch (err: any) {
      console.error("[AI] Error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // ── Vite / Static ──
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const dist = path.join(process.cwd(), "dist");
    app.use(express.static(dist));
    app.get("*", (req, res) => res.sendFile(path.join(dist, "index.html")));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`\n✅ FINCORE running → http://localhost:${PORT}`);
    console.log(`   DB Root : ${path.resolve(DB_ROOT)}`);
    console.log(`   Reports : ${path.resolve(STORAGE_ROOT)}\n`);
  });
}

startServer().catch(console.error);
