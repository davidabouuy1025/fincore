export interface ExtractedValue {
  value: string | null;
  confidence: "high" | "medium" | "low";
  source: string;
}

export interface MetricExtractionResult {
  value: string | null;
  confidence: "high" | "medium" | "low";
}

export type CategoryData = Record<string, MetricExtractionResult>;

export interface ExtractedFinancialPayload {
  incomeStatement: CategoryData;
  balanceSheet: CategoryData;
  cashFlow: CategoryData;
  ratios: CategoryData;
  growth: CategoryData;
  advanced: CategoryData;
  [key: string]: CategoryData; // Fallback index signature for dynamic categories
}

export interface AnalysisOutput {
  suggestedCompanyName: string;
  suggestedSector: string;
  extractedData: ExtractedFinancialPayload;
}