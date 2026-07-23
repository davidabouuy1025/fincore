export interface ExtractedField {
  value: string | null;
  confidence: string;
}

export interface ParsedDocument {
  fileId: string;
  originalFileName: string;
  storedFileName: string;
  docType: string;
  markdown: Markdown;
  suggestedCompanyName: string;
  suggestedSector: string;
  extractedData: Record<string, Record<string, ExtractedField>>;
  rawTextLength: number;
  // User-editable fields
  companyName: string;
  isExpanded: boolean;
  year?: string;
  period?: string;
  currency?: string;
  sector?: string;
  selectedPages?: string;
  suggestedPeriod?: string;
  suggestedCurrency?: string;
}

export interface Metadata {
  CompanyName: string;
  FinancialYear: string;
  Period?: string;
  Sector: string;
  Currency: string;
  OriginalFileName?: string;
  StoredFileName?: string;
  DocType?: string;
  SelectedPages?: string;
}

export interface Financials {
  incomeStatement: Record<string, string | number | null>;
  balanceSheet: Record<string, string | number | null>;
  cashFlow: Record<string, string | number | null>;
  ratios?: Record<string, string | number | null>;
  growth?: Record<string, string | number | null>;
  advanced?: Record<string, string | number | null>;
}

export interface Markdown{
  pureMarkdown: string;
}

export interface CompanyReport {
  Metadata: Metadata;
  Financials: Financials;
  Markdown: Markdown;
}

export interface ArchiveEntry {
  year: string;
  sectors: string[];
}
