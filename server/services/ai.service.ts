import { IAiService } from "../controllers/report.controller";
import { FINANCIAL_DICTIONARY } from "../config/dictionary";
import { ExtractionService } from "./extraction.service";
import path from "path";
import fs from "fs";
import { performOCR, performPdfOCR, toPureMarkdown } from "../parser";

export class AiService implements IAiService {
  private extractionService: ExtractionService;
  private storageRoot: string;

  constructor(extractionService?: ExtractionService) {
    this.extractionService = extractionService || new ExtractionService();
    const dbRoot = process.env.FINCORE_DB_PATH || "./fincore_db";
    this.storageRoot = path.join(dbRoot, "original_reports");
  }

  /**
   * Packages database properties into contextually bounded market insight overviews.
   * Matches the exact gateway proxy signature defined in server.ts /api/ai-insights.
   */
  public async generateInsights(reports: any[], sector: string, year: string): Promise<string> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment configuration missing.");
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

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
          },
        }),
      }
    );

    const data: any = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.map((part: any) => part.text || "").join("") || "";

    if (text) {
      return text;
    } else {
      throw new Error(data.error?.message || "Invalid response from AI");
    }
  }

  /**
   * Re-analyzes standard financial structures from raw Markdown using Google's Gemini Model.
   * Matches the native Gemini payload format used in server.ts.
   */
  public async extractFinancialsWithGemini(markdown: string, model: string = "gemini-3.6-flash"): Promise<any> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY not configured");
    }

    const fieldList = Object.entries(FINANCIAL_DICTIONARY)
      .map(([fieldId, config]) => `- ${config.category}.${fieldId}: ${config.keywords.join(", ")}`)
      .join("\n");

    const prompt = `You are a professional financial analyst extracting financial statement values from markdown text.
First, detect the reporting Currency and Unit of the tables (e.g., USD, MYR, EUR, CNY, and whether it is in thousands '000, millions 'M' or single units).
Normalize the extracted values to their absolute amounts. If the document reports in thousands ('000) or millions ('M'), you MUST multiply the values accordingly (e.g. 12,575,978 in thousands becomes 12575978000).
If this is a quarterly interim financial report (Q1, Q2, Q3, Q4), extract the cumulative Year-To-Date (YTD / 6 months / 9 months) figures rather than individual 3-month single-quarter numbers whenever both are present.
Return only valid JSON in this exact shape, populating the categories with the extracted values for each field. Use the formula to calculate if any value is missing but derivable, else leave as 0. STRICTLY double check all the values ensuring that all the values are correct. Do not return empty objects:
{
  "companyName": "extracted company name",
  "year": "extracted year",
  "period": "extracted period",
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
    "advanced": {
      "enterpriseValue": "marketCapitalization + shortTermDebt + longTermDebt + bondsPayable - cashAndEquivalents - shortTermInvestments",
      "evEbitda": "enterpriseValue / ebitda",
      "fcfYield": "freeCashFlow / marketCapitalization",
      "eva": "(ebit * (1 - effectiveTaxRate)) - ((totalEquity + shortTermDebt + longTermDebt + bondsPayable - cashAndEquivalents - shortTermInvestments) * wacc)",
      "workingCapital": "currentAssets - currentLiabilities",
      "netWorkingCapital": "(currentAssets - cashAndEquivalents - shortTermInvestments) - (currentLiabilities - shortTermDebt)"
    }
  }
}

Use these field ids and categories. Put numbers only, without currency symbols or commas. Use 0 when not found.
${fieldList}

MARKDOWN:
${markdown.slice(0, 120000)}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
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
    console.log("[DEBUG] Gemini Raw Response:", text);
    const json = this.extractJsonObject(text);
    if (!json) {
      console.log("[DEBUG] Failed to extract JSON from Gemini text");
      throw new Error("Gemini returned no JSON");
    }
    
    const parsed = JSON.parse(json);
    console.log("[DEBUG] Gemini Parsed JSON:", parsed);
    return this.normalizeAiFinancials(parsed);
  }

  /**
   * Safe extraction helper constructed with string-concatenation to avoid raw backtick parser issues.
   */
  private extractJsonObject(text: string): string | null {
    const backticks = "`" + "`" + "`";
    const regexPattern = backticks + "(?:json)?\\s*([\\s\\S]*?)" + backticks;
    const fenced = text.match(new RegExp(regexPattern, "i"));
    
    const candidate = fenced?.[1] || text;
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) return null;
    return candidate.slice(start, end + 1);
  }

  /**
   * Normalizes values parsed from the AI into a standard schema.
   */
  private normalizeAiFinancials(parsed: any) {
    const source = parsed?.financials || parsed?.Financials || parsed;
    const emptyData = this.extractionService.createEmptyExtractedData();
    const financials = this.extractionService.extractedDataToFinancials(emptyData);

    for (const category of Object.keys(financials)) {
      const categoryValues = source?.[category] || source?.[category.toLowerCase()] || {};
      for (const fieldId of Object.keys(financials[category])) {
        const value = categoryValues[fieldId];
        financials[category][fieldId] = value === undefined || value === "" ? null : String(value);
      }

      for (const [key, val] of Object.entries(categoryValues)) {
        if (financials[category][key] === undefined && val !== undefined && val !== "" && val !== null) {
          financials[category][key] = String(val);
        }
      }
    }

    return {
      metadata: {
        companyName: parsed?.companyName,
        year: parsed?.year,
        period: parsed?.period
      },
      financials
    };
  }
}