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
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
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
  public async extractFinancialsWithGemini(markdown: string): Promise<any> {
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
    const json = this.extractJsonObject(text);
    if (!json) throw new Error("Gemini returned no JSON");

    return this.normalizeAiFinancials(JSON.parse(json));
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
      const categoryValues = source?.[category] || {};
      for (const fieldId of Object.keys(financials[category])) {
        const value = categoryValues[fieldId];
        financials[category][fieldId] = value === undefined || value === "" ? null : String(value);
      }
    }

    return financials;
  }
}