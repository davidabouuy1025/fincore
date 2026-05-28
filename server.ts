import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import multer from "multer";
import pdfParse from "pdf-parse";
import { XMLBuilder, XMLParser } from "fast-xml-parser";
import dotenv from "dotenv";
import { createWorker } from "tesseract.js";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const DB_ROOT = process.env.FINCORE_DB_PATH || "./fincore_db";
const STORAGE_ROOT = path.join(DB_ROOT, "original_reports");

[DB_ROOT, STORAGE_ROOT].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, STORAGE_ROOT),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, "_")}`),
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

// ══════════════════════════════════════════════════════════════════════════════
// COMPREHENSIVE FINANCIAL DICTIONARY
// ══════════════════════════════════════════════════════════════════════════════

const FINANCIAL_DICTIONARY: Record<string, { category: string; keywords: string[] }> = {
  // ----------------------
  // ── Income Statement ──
  // ----------------------
  revenue: {
    category: "incomeStatement",
    keywords: [
      "Revenue", "Net Revenue", "Gross Revenue", "Operating Revenue", "Total Revenue",
      "Turnover", "Total Turnover", "Sales", "Net Sales", "Income from Operations",
      "Total Income", "Operating Income"
    ],
  },
  nonOperatingRevenue: {
    category: "incomeStatement",
    keywords: ["Non-operating Revenue", "Other Income", "Non-Operating Income"],
  },
  costOfGoodsSold: {
    category: "incomeStatement",
    keywords: [
      "Cost of Goods Sold", "COGS", "Cost of Sales", "Cost of Revenue",
      "Direct Costs", "Cost of Products Sold"
    ],
  },
  grossProfit: {
    category: "incomeStatement",
    keywords: ["Gross Profit", "Gross Income", "Gross Margin Amount"],
  },
  operatingExpenses: {
    category: "incomeStatement",
    keywords: ["Operating Expenses", "OPEX", "Total Operating Expenses", "Operating Costs"],
  },
  sgaExpenses: {
    category: "incomeStatement",
    keywords: [
      "Selling General & Administrative", "SG&A", "Selling and Administrative",
      "Administrative Expenses", "Selling Expenses", "General & Administrative"
    ],
  },
  researchDevelopment: {
    category: "incomeStatement",
    keywords: ["Research & Development", "R&D", "Research and Development Expenses", "R&D Expenses"],
  },
  depreciation: {
    category: "incomeStatement",
    keywords: ["Depreciation", "Depreciation Expense", "Depreciation Charge"],
  },
  amortization: {
    category: "incomeStatement",
    keywords: ["Amortization", "Amortization Expense", "Amortisation"],
  },
  ebit: {
    category: "incomeStatement",
    keywords: ["EBIT", "Earnings Before Interest and Tax", "Operating Income Before Interest"],
  },
  ebitda: {
    category: "incomeStatement",
    keywords: ["EBITDA", "Earnings Before Interest Tax Depreciation Amortization"],
  },
  operatingProfit: {
    category: "incomeStatement",
    keywords: ["Operating Profit", "Profit from Operations", "Operating Income"],
  },
  profitBeforeTax: {
    category: "incomeStatement",
    keywords: ["Profit Before Tax", "PBT", "Income Before Tax", "Earnings Before Tax"],
  },
  taxExpense: {
    category: "incomeStatement",
    keywords: ["Tax Expense", "Income Tax Expense", "Taxation", "Tax Provision"],
  },
  effectiveTaxRate: {
    category: "incomeStatement",
    keywords: ["Effective Tax Rate", "Tax Rate"],
  },
  netProfit: {
    category: "incomeStatement",
    keywords: [
      "Net Profit", "Profit After Tax", "PAT", "Net Income", "Profit for the Year",
      "Profit Attributable to Owners", "Net Earnings", "Profit After Taxation", "Profit for the financial year"
    ],
  },
  retainedEarnings: {
    category: "incomeStatement",
    keywords: ["Retained Earnings", "Accumulated Profits", "Retained Profits"],
  },

  // -------------------
  // ── Balance Sheet ──
  // -------------------
  totalAssets: {
    category: "balanceSheet",
    keywords: ["Total Assets", "Assets Total"],
  },
  currentAssets: {
    category: "balanceSheet",
    keywords: ["Current Assets", "Total Current Assets"],
  },
  nonCurrentAssets: {
    category: "balanceSheet",
    keywords: ["Non-current Assets", "Non Current Assets", "Fixed Assets", "Long-term Assets", "Total non-current assets"],
  },
  cashAndEquivalents: {
    category: "balanceSheet",
    keywords: [
      "Cash and Cash Equivalents", "Cash & Cash Equivalents", "Cash",
      "Cash at Bank", "Cash and Bank Balances", "Net cash"
    ],
  },
  accountsReceivable: {
    category: "balanceSheet",
    keywords: [
      "Accounts Receivable", "Trade Receivables", "Receivables",
      "Trade and Other Receivables", "Debtors"
    ],
  },
  inventory: {
    category: "balanceSheet",
    keywords: ["Inventory", "Inventories", "Stock", "Stocks"],
  },
  shortTermInvestments: {
    category: "balanceSheet",
    keywords: ["Short-term Investments", "Short Term Investments", "Marketable Securities"],
  },
  ppe: {
    category: "balanceSheet",
    keywords: [
      "Property Plant Equipment", "Property, Plant and Equipment", "PPE",
      "Fixed Assets", "Property Plant & Equipment"
    ],
  },
  intangibleAssets: {
    category: "balanceSheet",
    keywords: ["Intangible Assets", "Intangibles"],
  },
  goodwill: {
    category: "balanceSheet",
    keywords: ["Goodwill"],
  },
  totalLiabilities: {
    category: "balanceSheet",
    keywords: ["Total Liabilities", "Liabilities Total"],
  },
  currentLiabilities: {
    category: "balanceSheet",
    keywords: ["Current Liabilities", "Total Current Liabilities"],
  },
  accountsPayable: {
    category: "balanceSheet",
    keywords: [
      "Accounts Payable", "Trade Payables", "Payables",
      "Trade and Other Payables", "Creditors"
    ],
  },
  shortTermDebt: {
    category: "balanceSheet",
    keywords: ["Short-term Debt", "Short Term Borrowings", "Current Borrowings"],
  },
  nonCurrentLiabilities: {
    category: "balanceSheet",
    keywords: ["Non-current Liabilities", "Non Current Liabilities", "Long-term Liabilities"],
  },
  longTermDebt: {
    category: "balanceSheet",
    keywords: ["Long-term Debt", "Long Term Borrowings", "Non-current Borrowings"],
  },
  bondsPayable: {
    category: "balanceSheet",
    keywords: ["Bonds Payable", "Bonds"],
  },
  totalEquity: {
    category: "balanceSheet",
    keywords: [
      "Total Equity", "Shareholders Equity", "Shareholder Equity",
      "Stockholders Equity", "Equity Total", "Total Shareholders' Equity"
    ],
  },
  commonStock: {
    category: "balanceSheet",
    keywords: ["Common Stock", "Share Capital", "Ordinary Shares", "Issued Capital"],
  },
  preferredStock: {
    category: "balanceSheet",
    keywords: ["Preferred Stock", "Preference Shares"],
  },
  paidInCapital: {
    category: "balanceSheet",
    keywords: ["Paid-in Capital", "Additional Paid-in Capital", "Share Premium"],
  },

  // ---------------
  // ── Cash Flow ──
  // ---------------
  operatingCashFlow: {
    category: "cashFlow",
    keywords: [
      "Operating Cash Flow", "OCF", "Cash from Operating Activities",
      "Net Cash from Operating", "Cash Generated from Operations",
      "Net Cash Generated from Operating Activities"
    ],
  },
  investingCashFlow: {
    category: "cashFlow",
    keywords: [
      "Investing Cash Flow", "ICF", "Cash from Investing Activities",
      "Net Cash from Investing", "Net Cash Used in Investing"
    ],
  },
  financingCashFlow: {
    category: "cashFlow",
    keywords: [
      "Financing Cash Flow", "Cash from Financing Activities",
      "Net Cash from Financing", "Net Cash Used in Financing"
    ],
  },
  freeCashFlow: {
    category: "cashFlow",
    keywords: ["Free Cash Flow", "FCF"],
  },
  capitalExpenditure: {
    category: "cashFlow",
    keywords: [
      "Capital Expenditure", "CapEx", "CAPEX", "Capital Expenditures",
      "Purchase of Property Plant Equipment", "Additions to PPE"
    ],
  },

  // ----------------------
  // ── Ratios & Metrics ──
  // ----------------------
  roe: {
    category: "ratios",
    keywords: ["Return on Equity", "ROE"],
  },
  roa: {
    category: "ratios",
    keywords: ["Return on Assets", "ROA"],
  },
  roic: {
    category: "ratios",
    keywords: ["Return on Invested Capital", "ROIC"],
  },
  grossMargin: {
    category: "ratios",
    keywords: ["Gross Margin", "Gross Profit Margin"],
  },
  operatingMargin: {
    category: "ratios",
    keywords: ["Operating Margin", "Operating Profit Margin"],
  },
  netProfitMargin: {
    category: "ratios",
    keywords: ["Net Profit Margin", "Net Margin", "Profit Margin"],
  },
  currentRatio: {
    category: "ratios",
    keywords: ["Current Ratio"],
  },
  quickRatio: {
    category: "ratios",
    keywords: ["Quick Ratio", "Acid Test Ratio"],
  },
  cashRatio: {
    category: "ratios",
    keywords: ["Cash Ratio"],
  },
  debtToEquity: {
    category: "ratios",
    keywords: ["Debt to Equity", "Debt to Equity Ratio", "D/E Ratio", "Gearing Ratio"],
  },
  debtRatio: {
    category: "ratios",
    keywords: ["Debt Ratio"],
  },
  interestCoverage: {
    category: "ratios",
    keywords: ["Interest Coverage Ratio", "Interest Coverage", "Times Interest Earned"],
  },
  assetTurnover: {
    category: "ratios",
    keywords: ["Asset Turnover", "Total Asset Turnover"],
  },
  inventoryTurnover: {
    category: "ratios",
    keywords: ["Inventory Turnover"],
  },
  receivablesTurnover: {
    category: "ratios",
    keywords: ["Receivables Turnover", "Accounts Receivable Turnover"],
  },
  payablesTurnover: {
    category: "ratios",
    keywords: ["Payables Turnover", "Accounts Payable Turnover"],
  },
  eps: {
    category: "ratios",
    keywords: ["Earnings Per Share", "EPS", "Basic EPS"],
  },
  dilutedEps: {
    category: "ratios",
    keywords: ["Diluted EPS", "Diluted Earnings Per Share"],
  },
  peRatio: {
    category: "ratios",
    keywords: ["Price to Earnings", "P/E Ratio", "PE Ratio"],
  },
  dividendYield: {
    category: "ratios",
    keywords: ["Dividend Yield"],
  },
  dividendPerShare: {
    category: "ratios",
    keywords: ["Dividend Per Share", "DPS"],
  },
  dividendPayoutRatio: {
    category: "ratios",
    keywords: ["Dividend Payout Ratio", "Payout Ratio"],
  },
  retentionRatio: {
    category: "ratios",
    keywords: ["Retention Ratio", "Plowback Ratio"],
  },
  revenueGrowth: {
    category: "growth",
    keywords: ["Revenue Growth", "Revenue Growth Rate", "Sales Growth"],
  },
  netIncomeGrowth: {
    category: "growth",
    keywords: ["Net Income Growth", "Profit Growth", "Earnings Growth"],
  },
  cagr: {
    category: "growth",
    keywords: ["CAGR", "Compound Annual Growth Rate"],
  },
  enterpriseValue: {
    category: "advanced",
    keywords: ["Enterprise Value", "EV"],
  },
  evEbitda: {
    category: "advanced",
    keywords: ["EV/EBITDA", "EV to EBITDA"],
  },
  fcfYield: {
    category: "advanced",
    keywords: ["Free Cash Flow Yield", "FCF Yield"],
  },
  eva: {
    category: "advanced",
    keywords: ["Economic Value Added", "EVA"],
  },
  workingCapital: {
    category: "advanced",
    keywords: ["Working Capital"],
  },
  netWorkingCapital: {
    category: "advanced",
    keywords: ["Net Working Capital", "NWC"],
  },
};

function getModel() {
  return process.env.ZHIPU_MODEL;
}

function getBaseUrl() {
  return (process.env.ZHIPU_BASE_URL || "").replace(/\/$/, '');
}

// ══════════════════════════════════════════════════════════════════════════════
// EXTRACTION STRATEGIES
// ══════════════════════════════════════════════════════════════════════════════

interface ExtractedValue {
  value: string | null;
  confidence: "high" | "medium" | "low";
  source: string;
}

// Clean and normalize text for better matching
function normalizeText(text: string): string {
  return text
    .replace(/[\r\n]+/g, "\n")
    .replace(/\t+/g, " ")
    .replace(/\s{2,}/g, " ")
    .replace(/['']/g, "'")
    .replace(/[""]/g, '"')
    .replace(/[']/g, "'");
}

// Parse number from string, handling various formats
function parseFinancialNumber(str: string): number | null {
  if (!str) return null;

  let cleaned = str.trim();

  // Check for parentheses (negative)
  const isNegative = cleaned.startsWith("(") && cleaned.endsWith(")");
  if (isNegative) {
    cleaned = cleaned.slice(1, -1);
  }

  // Check for trailing minus or CR (credit)
  if (cleaned.endsWith("-") || cleaned.toUpperCase().endsWith("CR")) {
    cleaned = cleaned.replace(/[-]$/, "").replace(/CR$/i, "").trim();
  }

  // Remove currency symbols and spaces
  cleaned = cleaned.replace(/[RM$€£¥,\s]/g, "");

  // Handle millions/thousands notation
  if (/[Mm]$/.test(cleaned)) {
    cleaned = cleaned.replace(/[Mm]$/, "");
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : (isNegative ? -num : num) * 1000;
  }
  if (/[Kk]$/.test(cleaned)) {
    cleaned = cleaned.replace(/[Kk]$/, "");
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : (isNegative ? -num : num);
  }

  const num = parseFloat(cleaned);
  if (isNaN(num)) return null;

  return isNegative ? -num : num;
}

// Strategy 1: Table-like extraction (columns)
function extractFromTableFormat(text: string, keywords: string[]): ExtractedValue | null {
  const lines = text.split("\n");

  for (const keyword of keywords) {
    const keywordLower = keyword.toLowerCase();
    const keywordPattern = new RegExp(
      keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s*"),
      "i"
    );

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineLower = line.toLowerCase();

      if (keywordPattern.test(line) || lineLower.includes(keywordLower)) {
        // Try to find numbers on the same line
        const numbers = line.match(/[\(\-]?[\d,]+\.?\d*[\)]?/g);
        if (numbers && numbers.length > 0) {
          // Take the first substantial number (not year, not small index)
          for (const numStr of numbers) {
            const num = parseFinancialNumber(numStr);
            if (num !== null && Math.abs(num) >= 1) {
              return {
                value: String(num),
                confidence: "high",
                source: `Line: "${line.trim().substring(0, 80)}..."`,
              };
            }
          }
        }

        // Check next few lines for numbers
        for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
          const nextLine = lines[j];
          const numbers = nextLine.match(/[\(\-]?[\d,]+\.?\d*[\)]?/g);
          if (numbers && numbers.length > 0) {
            for (const numStr of numbers) {
              const num = parseFinancialNumber(numStr);
              if (num !== null && Math.abs(num) >= 1) {
                return {
                  value: String(num),
                  confidence: "medium",
                  source: `Near: "${keyword}" → "${nextLine.trim().substring(0, 60)}..."`,
                };
              }
            }
          }
        }
      }
    }
  }

  return null;
}

// Strategy 2: Pattern-based extraction
function extractWithPatterns(text: string, keywords: string[]): ExtractedValue | null {
  for (const keyword of keywords) {
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const flexibleKeyword = escaped.replace(/\s+/g, "[\\s\\-_]*");

    const patterns = [
      // keyword: number or keyword number
      new RegExp(`${flexibleKeyword}[:\\s]*([\\(\\-]?[\\d,]+\\.?\\d*[\\)]?)`, "i"),
      // keyword followed by RM/$ then number
      new RegExp(`${flexibleKeyword}[:\\s]*(?:RM|\\$)?\\s*([\\(\\-]?[\\d,]+\\.?\\d*[\\)]?)`, "i"),
      // number before keyword (reversed)
      new RegExp(`([\\(\\-]?[\\d,]+\\.?\\d*[\\)]?)\\s*${flexibleKeyword}`, "i"),
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const num = parseFinancialNumber(match[1]);
        if (num !== null && Math.abs(num) >= 1) {
          return {
            value: String(num),
            confidence: "medium",
            source: `Pattern match for "${keyword}"`,
          };
        }
      }
    }
  }

  return null;
}

// Strategy 3: Fuzzy matching with Levenshtein distance
function levenshtein(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

function extractWithFuzzyMatch(text: string, keywords: string[]): ExtractedValue | null {
  const lines = text.split("\n");
  const threshold = 3; // Max edit distance

  for (const keyword of keywords) {
    const keywordLower = keyword.toLowerCase();

    for (const line of lines) {
      const words = line.split(/\s+/);

      // Check each segment of words
      for (let start = 0; start < words.length; start++) {
        for (let len = 1; len <= Math.min(5, words.length - start); len++) {
          const segment = words.slice(start, start + len).join(" ").toLowerCase();
          const distance = levenshtein(keywordLower, segment);

          if (distance <= threshold) {
            // Found fuzzy match, look for number
            const restOfLine = words.slice(start + len).join(" ");
            const numbers = restOfLine.match(/[\(\-]?[\d,]+\.?\d*[\)]?/g);

            if (numbers && numbers.length > 0) {
              for (const numStr of numbers) {
                const num = parseFinancialNumber(numStr);
                if (num !== null && Math.abs(num) >= 1) {
                  return {
                    value: String(num),
                    confidence: "low",
                    source: `Fuzzy match: "${segment}" ≈ "${keyword}"`,
                  };
                }
              }
            }
          }
        }
      }
    }
  }

  return null;
}

// Main extraction function combining all strategies
function extractValue(text: string, keywords: string[]): ExtractedValue {
  const normalized = normalizeText(text);

  // Try strategies in order of reliability
  let result = extractFromTableFormat(normalized, keywords);
  if (result?.value) return result;

  result = extractWithPatterns(normalized, keywords);
  if (result?.value) return result;

  result = extractWithFuzzyMatch(normalized, keywords);
  if (result?.value) return result;

  return { value: null, confidence: "low", source: "Not found" };
}

// ══════════════════════════════════════════════════════════════════════════════
// OCR & COMPANY DETECTION
// ══════════════════════════════════════════════════════════════════════════════

async function performOCR(filePath: string): Promise<string> {
  const worker = await createWorker("eng");
  try {
    const { data: { text } } = await worker.recognize(filePath);
    return text;
  } finally {
    await worker.terminate();
  }
}

function detectCompanyName(text: string, fallback: string): string {
  // Try patterns specific to Malaysian companies
  const patterns = [
    /([A-Z][A-Z\s&()'.,]{3,60}(?:BERHAD|BHD\.?))/i,
    /([A-Z][A-Z\s&()'.,]{3,60}(?:SDN\.?\s*BHD\.?))/i,
    /([A-Z][A-Z\s&()'.,]{3,60}(?:PLC|LTD|LIMITED|CORPORATION|CORP))/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1].trim().replace(/\s+/g, " ").toUpperCase();
    }
  }

  // Look for prominent all-caps text at start
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  for (const line of lines.slice(0, 25)) {
    if (line.length > 5 && line.length < 80 && /^[A-Z][A-Z\s&.()',-]+$/.test(line)) {
      return line;
    }
  }

  return fallback.replace(/\.(pdf|png|jpg|jpeg)$/i, "").replace(/[-_]/g, " ").trim();
}

function detectSector(text: string, defaultSector: string): string {
  const t = text.toLowerCase();
  const sectorKeywords: Record<string, string[]> = {
    TECHNOLOGY: ["semiconductor", "software", "tech", "it services", "cloud", "digital", "computer", "electronics"],
    PLANTATION: ["palm oil", "plantation", "estate", "rubber", "agriculture", "oleochemical"],
    FINANCIAL_SERVICES: ["bank", "insurance", "finance", "financial services", "capital", "securities", "investment bank"],
    CONSUMER_PRODUCTS: ["consumer", "retail", "beverage", "food", "household", "fmcg", "supermarket"],
    INDUSTRIAL_PRODUCTS: ["manufacturing", "industrial", "machinery", "equipment", "steel", "cement"],
    REITS: ["reit", "property fund", "real estate investment trust", "property trust"],
    ENERGY: ["oil", "gas", "energy", "petroleum", "power", "utility", "electricity"],
    HEALTHCARE: ["hospital", "pharma", "healthcare", "medical", "clinic", "pharmaceutical", "diagnostic"],
    CONSTRUCTION: ["construction", "contractor", "infrastructure", "building", "property development"],
  };

  for (const [sector, keywords] of Object.entries(sectorKeywords)) {
    for (const kw of keywords) {
      if (t.includes(kw)) return sector;
    }
  }

  return defaultSector;
}

// ══════════════════════════════════════════════════════════════════════════════
// API ENDPOINTS
// ══════════════════════════════════════════════════════════════════════════════

async function startServer() {
  app.use(express.json({ limit: "50mb" }));
  app.use("/reports", express.static(STORAGE_ROOT));

  // ── POST /api/parse - Parse files without saving ──
  app.post("/api/parse", upload.array("reports"), async (req: any, res) => {
    try {
      const files: Express.Multer.File[] = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        return res.status(400).json({ error: "No files provided" });
      }

      const parsed = [];

      for (const file of files) {
        let text = "";
        let docType = "DIGITAL_PDF";

        try {
          if (file.mimetype === "application/pdf") {
            const buffer = fs.readFileSync(file.path);
            const pdfData = await pdfParse(buffer);
            text = pdfData.text || "";

            if (text.trim().length < 200) {
              console.log(`[OCR] Scanned PDF: ${file.originalname}`);
              text = await performOCR(file.path);
              docType = "SCANNED_PDF";
            }
          } else if (file.mimetype.startsWith("image/")) {
            console.log(`[OCR] Image: ${file.originalname}`);
            text = await performOCR(file.path);
            docType = "IMAGE";
          }
        } catch (parseErr) {
          console.error(`[WARN] Parse error for ${file.originalname}:`, parseErr);
          try {
            text = await performOCR(file.path);
            docType = "SCANNED_PDF";
          } catch {
            text = "";
          }
        }

        const suggestedCompanyName = detectCompanyName(text, file.originalname);
        const suggestedSector = detectSector(text, "TECHNOLOGY");

        // Extract all financial data
        const extractedData: Record<string, Record<string, { value: string | null; confidence: string }>> = {
          incomeStatement: {},
          balanceSheet: {},
          cashFlow: {},
          ratios: {},
          growth: {},
          advanced: {},
        };

        for (const [fieldId, config] of Object.entries(FINANCIAL_DICTIONARY)) {
          const result = extractValue(text, config.keywords);
          if (!extractedData[config.category]) {
            extractedData[config.category] = {};
          }
          extractedData[config.category][fieldId] = {
            value: result.value,
            confidence: result.confidence,
          };
        }

        parsed.push({
          fileId: file.filename,
          originalFileName: file.originalname,
          storedFileName: file.filename,
          docType,
          suggestedCompanyName,
          suggestedSector,
          extractedData,
          rawTextLength: text.length,
        });

        console.log(`[PARSED] ${file.originalname} → ${suggestedCompanyName} (${docType})`);
      }

      res.json({ success: true, parsed });
    } catch (err: any) {
      console.error("[ERROR] Parse failure:", err);
      res.status(500).json({ error: err.message });
    }
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

        // Save XML
        const sectorDir = path.join(DB_ROOT, year, sector);
        if (!fs.existsSync(sectorDir)) fs.mkdirSync(sectorDir, { recursive: true });

        const safeName = companyName.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 60);
        const fileName = `${safeName}.xml`;
        const builder = new XMLBuilder({ format: true, ignoreAttributes: false });
        fs.writeFileSync(path.join(sectorDir, fileName), builder.build(reportData));

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
        return res.status(500).json({ error: "ZHIPU_AI_API_KEY not configured" });
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

      const response = await fetch(`${getBaseUrl()}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: getModel(),
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
