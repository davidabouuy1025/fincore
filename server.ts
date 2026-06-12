import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import multer from "multer";
// @ts-ignore
import pdf from "pdf-parse";
const parsePdf = (pdf as any).default || pdf;
import { XMLBuilder, XMLParser } from "fast-xml-parser";
import dotenv from "dotenv";
import { FINANCIAL_DICTIONARY } from "./server/dictionary";
import { extractValue, performOCR, performPdfOCR, toPureMarkdown } from "./server/parser";
import { detectCompanyName, detectSector, toTitleCase } from "./server/utils";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 5000;
const DB_ROOT = process.env.FINCORE_DB_PATH || "./fincore_db";
const STORAGE_ROOT = path.join(DB_ROOT, "original_reports");

[DB_ROOT, STORAGE_ROOT].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, STORAGE_ROOT),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, "_")}`),
});
const upload = multer({ storage, limits: { fileSize: 100 * 1024 * 1024 } });
const uploadReports = upload.array("reports");

type FinancialCategory = "incomeStatement" | "balanceSheet" | "cashFlow" | "ratios" | "growth" | "advanced";

function createEmptyExtractedData() {
  return {
    incomeStatement: {},
    balanceSheet: {},
    cashFlow: {},
    ratios: {},
    growth: {},
    advanced: {},
  } as Record<FinancialCategory, Record<string, { value: string | null; confidence: "high" | "medium" | "low" }>>;
}

function extractFinancialsFromMarkdown(markdown: string) {
  const extractedData = createEmptyExtractedData();

  for (const [fieldId, config] of Object.entries(FINANCIAL_DICTIONARY)) {
    const result = extractValue(markdown, config.keywords);
    extractedData[config.category][fieldId] = {
      value: result.value,
      confidence: result.confidence,
    };
  }

  return extractedData;
}

function extractedDataToFinancials(
  extractedData: Record<string, Record<string, { value: string | null; confidence?: string }>>
) {
  const financials: Record<string, Record<string, string | null>> = {};
  for (const [category, fields] of Object.entries(extractedData)) {
    financials[category] = {};
    for (const [fieldId, field] of Object.entries(fields)) {
      financials[category][fieldId] = field.value;
    }
  }
  return financials;
}

async function extractMarkdownFromStoredFile(filePath: string, originalFileName: string, mimetype?: string) {
  let text = "";
  let docType = mimetype?.startsWith("image/") ? "IMAGE" : "DIGITAL_PDF";
  // console.log("Running extractMarkdownFromStoredFile()")

  if (mimetype === "application/pdf" || filePath.toLowerCase().endsWith(".pdf")) {
    const buffer = fs.readFileSync(filePath);
    const pdfData = await parsePdf(buffer);
    text = pdfData.text || "";

    if (text.trim().length < 200) {
      console.log(`[OCR] Scanned PDF: ${originalFileName}`);
      text = await performPdfOCR(filePath);
      docType = "SCANNED_PDF";
    }
  } else {
    console.log(`[OCR] Image: ${originalFileName}`);
    text = await performOCR(filePath);
    docType = "IMAGE";
  }

  return {
    text,
    docType,
    markdown: toPureMarkdown(text, originalFileName),
  };
}

function findSavedMarkdownByStoredFileName(storedFileName: string): string {
  if (!storedFileName || !fs.existsSync(DB_ROOT)) return "";

  const stack = [DB_ROOT];
  const parser = new XMLParser({ ignoreAttributes: false, parseTagValue: false });

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
        const report = parser.parse(content).CompanyReport;
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

function extractJsonObject(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1] || text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  return candidate.slice(start, end + 1);
}

function normalizeAiFinancials(parsed: any) {
  const source = parsed?.financials || parsed?.Financials || parsed;
  const financials = extractedDataToFinancials(extractFinancialsFromMarkdown(""));

  for (const category of Object.keys(financials)) {
    const categoryValues = source?.[category] || {};
    for (const fieldId of Object.keys(financials[category])) {
      const value = categoryValues[fieldId];
      financials[category][fieldId] = value === undefined || value === "" ? null : String(value);
    }
  }

  return financials;
}

async function extractFinancialsWithGemini(markdown: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not configured");
  }

  const fieldList = Object.entries(FINANCIAL_DICTIONARY)
    .map(([fieldId, config]) => `- ${config.category}.${fieldId}: ${config.keywords.join(", ")}`)
    .join("\n");

  const prompt = `You are extracting financial statement values from markdown.
Return only valid JSON in this exact shape:
{
  "financials": {
    "incomeStatement": {},
    "balanceSheet": {},
    "cashFlow": {},
    "ratios": {},
    "growth": {},
    "advanced": {}
  }
}

Use these field ids and categories. Put string numbers only, without currency symbols or commas. Use null when not found.
${fieldList}

MARKDOWN:
${markdown.slice(0, 120000)}`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0,
          responseMimeType: "application/json",
        },
      }),
    }
  );

  const data: any = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || "Gemini request failed");
  }

  const text = data.candidates?.[0]?.content?.parts?.map((part: any) => part.text || "").join("") || "";
  const json = extractJsonObject(text);
  if (!json) throw new Error("Gemini returned no JSON");

  return normalizeAiFinancials(JSON.parse(json));
}

// API ENDPOINTS

async function startServer() {
  app.use(express.json({ limit: "50mb" }));
  app.use("/reports", express.static(STORAGE_ROOT));

  // ── POST /api/parse - Parse files without saving ──
  app.post("/api/parse", (req: any, res, next) => {
    uploadReports(req, res, (err: any) => {
      if (err) {
        console.error("[ERROR] Upload failure:", err);
        return res.status(400).json({ error: err.message || "Upload failed" });
      }
      next();
    });
  }, async (req: any, res) => {
    try {
      const files: Express.Multer.File[] = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        return res.status(400).json({ error: "No files provided" });
      }

      const parsed = [];

      for (const file of files) {
        let text = "";
        let docType = "DIGITAL_PDF";
        let markdown = "";

        try {
          const converted = await extractMarkdownFromStoredFile(file.path, file.originalname, file.mimetype);
          text = converted.text;
          docType = converted.docType;
          markdown = converted.markdown;
        } catch (parseErr) {
          console.error(`[WARN] Parse error for ${file.originalname}:`, parseErr);
          try {
            text =
              file.mimetype === "application/pdf"
                ? await performPdfOCR(file.path)
                : await performOCR(file.path);
            docType = file.mimetype === "application/pdf" ? "SCANNED_PDF" : "IMAGE";
            markdown = toPureMarkdown(text, file.originalname);
          } catch {
            text = "";
            markdown = "";
          }
        }

        const suggestedCompanyName = detectCompanyName(markdown || text, file.originalname);
        const suggestedSector = detectSector(markdown || text, "TECHNOLOGY");

        // Extract all financial data
        const extractedData = extractFinancialsFromMarkdown(markdown || text);

        parsed.push({
          fileId: file.filename,
          originalFileName: file.originalname,
          storedFileName: file.filename,
          docType,
          markdown: {
            pureMarkdown: markdown,
          },
          suggestedCompanyName,
          suggestedSector,
          extractedData,
          rawTextLength: markdown.length,
        });

        console.log(`[PARSED] ${file.originalname} → ${suggestedCompanyName} (${docType})`);
      }

      res.json({ success: true, parsed });
    } catch (err: any) {
      console.error("[ERROR] Parse failure:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/test", (req, res) => {
    console.log("TEST ROUTE HIT");
    res.send("OK");
  });

  // ── POST /api/save - Save edited data ──
  app.post("/api/save", async (req, res) => {

    try {
      const { reports, year, sector } = req.body;

      if (!reports || !Array.isArray(reports)) {
        return res.status(400).json({ error: "Invalid reports data" });
      }

      const saved = [];

      for (const report of reports) {
        var { companyName, financials, storedFileName, originalFileName, docType } = report;
        const pureMarkdown = report.markdown?.pureMarkdown || report.Markdown?.pureMarkdown || report.pureMarkdown || "";
        companyName = toTitleCase(companyName);

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

        // Save XML
        const sectorDir = path.join(DB_ROOT, String(year), sector);
        if (!fs.existsSync(sectorDir)) fs.mkdirSync(sectorDir, { recursive: true });

        if (!companyName?.trim()) {
          return res.status(400).json({
            error: "Company name cannot be empty"
          });
        }

        const safeName = companyName.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 60);
        const fileName = `${safeName}.xml`;
        const targetPath = path.join(sectorDir, fileName);

        console.log({ companyName, storedFileName, originalFileName }, '\n');

        if (storedFileName) {
          const parser = new XMLParser({ ignoreAttributes: false, parseTagValue: false });
          const existingXmlFiles = fs.readdirSync(sectorDir).filter((f) => f.endsWith(".xml"));
          for (const existingFile of existingXmlFiles) {
            const existingPath = path.join(sectorDir, existingFile);
            if (existingPath === targetPath) continue;

            try {
              const existingContent = fs.readFileSync(existingPath, "utf-8");
              const existingReport = parser.parse(existingContent).CompanyReport;
              if (existingReport?.Metadata?.StoredFileName === storedFileName) {
                fs.unlinkSync(existingPath);
              }
            } catch (err) {
              console.error(`[WARN] Could not check existing report ${existingFile}:`, err);
            }
          }
        }

        const builder = new XMLBuilder({ format: true, ignoreAttributes: false });
        fs.writeFileSync(targetPath, builder.build(reportData));

        saved.push({
          companyName,
          fileName,
          sector,
          year,
        });

        console.log(`[SAVED] ${companyName} → ${sector}/${year}`);
      }

      res.json({ success: true, saved });
    } catch (err: any) {
      console.error("[ERROR] Save failure:", err);
      console.log(err.stack);
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
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return res.status(500).json({ error: "XXX_API_KEY not configured" });
      }

      const prompt = `You are a financial analyst specializing in Bursa Malaysia.
        Analyze the following financial data for companies in the ${sector} sector for FY${year}.
        Provide a concise, structured comparison covering:
        1. Revenue & Profitability
        2. Balance Sheet Strength
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

      const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gemini-2.5-flash",
          messages: [{ role: "user", content: prompt }],
          stream: false,
          max_tokens: 600,
        }),
      });

      const data: any = await response.json();

      if (data.choices?.[0]?.message?.content) {
        res.json({ text: data.choices[0].message.content });
      } else {
        res.status(500).json({ error: data.error?.message || "Invalid response from AI" });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Vite / Static ──
  // Re-extract financials from markdown, not from the original PDF/image.
  app.post("/api/ai-reanalyze", async (req, res) => {
    try {
      const { storedFileName, markdown } = req.body;

      let sourceMarkdown = typeof markdown === "string" ? markdown : "";
      if (!sourceMarkdown.trim() && storedFileName) {
        sourceMarkdown = findSavedMarkdownByStoredFileName(storedFileName);
      }

      if (!sourceMarkdown.trim() && storedFileName) {
        const storedPath = path.join(STORAGE_ROOT, storedFileName);
        if (fs.existsSync(storedPath)) {
          const converted = await extractMarkdownFromStoredFile(storedPath, storedFileName);
          sourceMarkdown = converted.markdown;
        }
      }

      if (!sourceMarkdown.trim()) {
        return res.status(400).json({ error: "No markdown available for AI re-analysis" });
      }

      let extractedFinancials;
      try {
        extractedFinancials = await extractFinancialsWithGemini(sourceMarkdown);
      } catch (aiErr) {
        console.error("[WARN] Gemini re-analysis failed, using local markdown extraction:", aiErr);
        extractedFinancials = extractedDataToFinancials(extractFinancialsFromMarkdown(sourceMarkdown));
      }

      res.json({ success: true, extractedFinancials });
    } catch (err: any) {
      console.error("[ERROR] AI re-analysis failure:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.use("/api", (req, res) => {
    res.status(404).json({ error: `API route not found: ${req.method} ${req.path}` });
  });

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
