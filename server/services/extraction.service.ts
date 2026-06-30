import { FINANCIAL_DICTIONARY } from "../config/dictionary";
import { 
  ExtractedValue, 
  ExtractedFinancialPayload, 
  AnalysisOutput 
} from "../types/index";

export class ExtractionService {
  
  /**
   * Main entry point to process unstructured text into clean domain figures.
   * Matches the parser and utils logic imported and executed by server.ts.
   */
  public processFinancials(text: string, originalFileName: string): AnalysisOutput {
    const normalizedText = this.normalizeText(text);

    const suggestedCompanyName = this.detectCompanyName(normalizedText, originalFileName);
    const suggestedSector = this.detectSector(normalizedText, "TECHNOLOGY");
    const extractedData = this.extractAllMetrics(normalizedText);

    return {
      suggestedCompanyName,
      suggestedSector,
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
   * Evaluates corporate names using regional Malaysian structural naming markers.
   * Matches the exact RegEx patterns and filename-cleaning fallbacks in utils.ts.
   */
  private detectCompanyName(text: string, fileName: string): string {
    const patterns = [
      /([A-Z0-9\s,&.\-\(\)]+)\s+(SDN\s+BHD|BHD|BERHAD|Sdn\s+Bhd|Sdn\.\s+Bhd\.|Bhd\.)/i,
      /([A-Z0-9\s,&.\-\(\)]+)\s+(LIMITED|LTD|CORP|INC|HOLDINGS|GROUP)/i,
    ];

    for (const p of patterns) {
      const match = text.match(p);
      if (match && match[1]) {
        const name = match[1].trim().toUpperCase();
        const suffix = match[2].trim().toUpperCase();
        if (name.length > 2 && name.length < 100 && !["FOR", "THE", "ANNUAL REPORT", "OF"].includes(name)) {
          return `${name} ${suffix}`;
        }
      }
    }

    // Fallback to cleaning the filename
    let baseName = fileName.replace(/\.[^/.]+$/, ""); // strip extension
    baseName = baseName.replace(/^\d+-/, ""); // strip timestamp prefix e.g. 171822...-
    baseName = baseName.replace(/_/g, " ");
    baseName = baseName.replace(/pasted-\d+/i, "PASTED DOCUMENT");
    baseName = baseName.toUpperCase().trim();
    
    return baseName || "UNKNOWN COMPANY";
  }

  /**
   * Identifies the primary operational sector baseline via token score checks.
   * Matches the exact keyword score evaluation matrix defined in utils.ts.
   */
  private detectSector(text: string, defaultSector = "TECHNOLOGY"): string {
    const content = text.toLowerCase();

    const sectorKeywords: Record<string, string[]> = {
      TECHNOLOGY: ["software", "semiconductor", "technology", "hardware", "digital", "data center", "it solutions", "cybersecurity", "telecommunication"],
      PLANTATION: ["plantation", "palm oil", "oil palm", "agriculture", "rubber", "harvest", "crop"],
      FINANCIAL_SERVICES: ["banking", "finance", "financial", "insurance", "investment", "takaful", "credit", "asset management"],
      CONSUMER_PRODUCTS: ["beverage", "food", "retail", "consumer", "merchandise", "household", "fmcg", "supermarket"],
      INDUSTRIAL_PRODUCTS: ["manufacturing", "chemical", "industrial", "steel", "cement", "engineering", "metal", "plastic"],
      REITS: ["reit", "real estate investment trust", "trust", "rental income", "shopping mall"],
      ENERGY: ["petroleum", "oil and gas", "fuel", "energy", "solar", "coal", "power", "utility"],
      HEALTHCARE: ["hospital", "pharma", "medical", "glove", "clinic", "healthcare", "therapy", "pharmaceutical"],
      CONSTRUCTION: ["construction", "builder", "infrastructure", "contractor", "civil", "bridge", "machinery"],
    };

    const scores: Record<string, number> = {};
    for (const [sector, kwList] of Object.entries(sectorKeywords)) {
      scores[sector] = 0;
      for (const kw of kwList) {
        const regex = new RegExp("\\b" + kw + "\\b", "g");
        const count = (content.match(regex) || []).length;
        scores[sector] += count;
      }
    }

    let leadingSector = defaultSector;
    let maxScore = 0;

    for (const [sector, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        leadingSector = sector;
      }
    }

    return maxScore > 2 ? leadingSector : defaultSector;
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