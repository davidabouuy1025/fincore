import { FINANCIAL_DICTIONARY } from "../config/dictionary";
import { 
  ExtractedValue, 
  ExtractedFinancialPayload, 
  AnalysisOutput 
} from "../types/index";
import { detectCompanyName, detectSector, detectYear } from "../utils";

export class ExtractionService {
  
  /**
   * Main entry point to process unstructured text into clean domain figures.
   * Matches the parser and utils logic imported and executed by server.ts.
   */
  public processFinancials(text: string, originalFileName: string): AnalysisOutput & { suggestedYear: string; companyName: string; year: string; sector: string } {
    const normalizedText = this.normalizeText(text);

    const suggestedCompanyName = detectCompanyName(normalizedText, originalFileName);
    const suggestedSector = detectSector(normalizedText, "TECHNOLOGY");
    const suggestedYear = detectYear(normalizedText, "2025");
    const extractedData = this.extractAllMetrics(normalizedText);

    return {
      suggestedCompanyName,
      suggestedSector,
      suggestedYear,
      companyName: suggestedCompanyName,
      sector: suggestedSector,
      year: suggestedYear,
      extractedData,
    };
  }

  /**
   * Generates an empty structure matching financial categories.
   * Leveraged by AiService for data normalization setups.
   */
  public createEmptyExtractedData(): Record<string, Record<string, ExtractedValue>> {
    return {
      incomeStatement: {},
      balanceSheet: {},
      cashFlow: {},
      ratios: {},
      growth: {},
      advanced: {},
    } as Record<string, Record<string, ExtractedValue>>;
  }

  /**
   * Flattens the structured extracted data to just string values or null.
   * Leveraged by AiService to normalize payload models.
   */
  public extractedDataToFinancials(
    extractedData: Record<string, Record<string, ExtractedValue>>
  ): Record<string, Record<string, string | null>> {
    const financials: Record<string, Record<string, string | null>> = {};
    for (const [category, fields] of Object.entries(extractedData)) {
      financials[category] = {};
      for (const [fieldId, field] of Object.entries(fields)) {
        financials[category][fieldId] = field.value;
      }
    }
    return financials;
  }

  /**
   * Clean and normalize text for uniform strategy execution.
   * Replicates the formatting/normalization pattern found in your parser helpers.
   */
  private normalizeText(text: string): string {
    return text
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .split("\n")
      .map((line) => line.replace(/\s+/g, " ").trim())
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  /**
   * Extracts a financial value from numerical strings.
   * Matches the simple regex heuristic defined in parser.ts, ensuring the 
   * output satisfies the complete { value, confidence, source } ExtractedValue interface.
   */
  private extractValue(text: string, keywords: string[]): ExtractedValue {
    const lines = text.split("\n");
    
    for (const keyword of keywords) {
      const kwRegex = new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (kwRegex.test(line)) {
          // Look for numbers on the same line
          const sameLineNum = this.extractNumberFromLine(line, keyword);
          if (sameLineNum) {
            return { 
              value: sameLineNum, 
              confidence: "high",
              source: `Line ${i + 1}: ${line.trim().substring(0, 60)}` 
            };
          }
          
          // If not found, check next line
          if (i + 1 < lines.length) {
            const nextLineNum = this.extractNumberFromLine(lines[i + 1], "");
            if (nextLineNum && lines[i + 1].trim().length < 40) {
              return { 
                value: nextLineNum, 
                confidence: "medium",
                source: `Near: "${keyword}" → Line ${i + 2}: ${lines[i + 1].trim().substring(0, 60)}` 
              };
            }
          }
        }
      }
    }
    
    return { 
      value: null, 
      confidence: "low",
      source: "Not found" 
    };
  }

  /**
   * Extracts numbers from lines, accounting for minus symbols and brackets.
   * Replicates parser.ts logic.
   */
  private extractNumberFromLine(line: string, keyword: string): string | null {
    let normalizedLine = line;
    if (keyword) {
      normalizedLine = line.replace(new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), "");
    }
    
    const numRegex = /(?:(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?|\b\d+\b)/;
    
    // Handle negativity indicators (parentheses or minus sign standard accounting notations)
    const negMatches = [
      /\(([\d,]+\.?\d*)\)/, // Parentheses like (12,345)
      /-\s*([\d,]+\.?\d*)/,  // Minus sign like -12,345
    ];

    for (const regex of negMatches) {
      const match = normalizedLine.match(regex);
      if (match && match[1]) {
        const parsedNum = this.cleanAndNormalizeNum(match[1]);
        if (parsedNum) {
          return `-${parsedNum}`;
        }
      }
    }

    const standardMatch = normalizedLine.match(numRegex);
    if (standardMatch && standardMatch[0]) {
      return this.cleanAndNormalizeNum(standardMatch[0]);
    }

    return null;
  }

  /**
   * Normalizes values parsed into numerical values.
   * Replicates parser.ts logic.
   */
  private cleanAndNormalizeNum(val: string): string | null {
    const cleaned = val.replace(/[^0-9.]/g, "");
    const num = parseFloat(cleaned);
    if (isNaN(num)) return null;
    return Math.round(num).toString();
  }

  /**
   * Runs the parsed rules matrix across all properties in the financial dictionary model
   */
  private extractAllMetrics(text: string): ExtractedFinancialPayload {
    const payload: ExtractedFinancialPayload = {
      incomeStatement: {},
      balanceSheet: {},
      cashFlow: {},
      ratios: {},
      growth: {},
      advanced: {},
    };

    for (const [fieldId, config] of Object.entries(FINANCIAL_DICTIONARY)) {
      const result = this.extractValue(text, config.keywords);
      
      if (!payload[config.category]) {
        payload[config.category] = {};
      }

      payload[config.category][fieldId] = result;
    }

    return payload;
  }
}