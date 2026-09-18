import { Category, FINANCIAL_DICTIONARY } from "./dictionary.js";

export { FINANCIAL_DICTIONARY };
export type { Category };

export const BURSA_SECTORS = [
  "TECHNOLOGY",
  "TELECOMMUNICATIONS",
  "PLANTATION",
  "FINANCIAL_SERVICES",
  "CONSUMER_PRODUCTS",
  "INDUSTRIAL_PRODUCTS",
  "REITS",
  "ENERGY",
  "HEALTHCARE",
  "CONSTRUCTION",
  "TRANSPORTATION_LOGISTICS",
  "UTILITIES",
  "PROPERTY",
  "MEDIA",
];

export const CATEGORY_LABELS: Record<Category, string> = {
  incomeStatement: "📊 Income Statement",
  balanceSheet: "🏦 Balance Sheet",
  cashFlow: "💵 Cash Flow",
  ratios: "📈 Ratios & Metrics",
  growth: "📉 Growth Metrics",
  marketData: "💰 Market Data",
  advanced: "🧠 Advanced Metrics",
};

export const FIELD_LABELS: Record<string, string> = {
  // Income statement
  revenue: "Revenue",
  otherOperatingIncome: "Other Operating Income",
  nonOperatingRevenue: "Non-Operating Revenue",
  costOfGoodsSold: "Cost of Goods Sold (COGS)",
  grossProfit: "Gross Profit",
  operatingExpenses: "Operating Expenses (OPEX)",
  sgaExpenses: "SG&A Expenses",
  staffCosts: "Staff Costs",
  researchDevelopment: "R&D Expenses",
  depreciation: "Depreciation",
  amortization: "Amortisation",
  ebit: "EBIT",
  ebitda: "EBITDA",
  operatingProfit: "Operating Profit",
  financeIncome: "Finance Income",
  financeCost: "Finance Cost",
  shareOfAssociates: "Share of Associates / JVs",
  impairmentLosses: "Impairment Losses",
  profitBeforeTax: "Profit Before Tax",
  taxExpense: "Tax Expense",
  effectiveTaxRate: "Effective Tax Rate",
  netProfit: "Net Profit / PAT",
  comprehensiveIncome: "Total Comprehensive Income",

  // Balance sheet
  totalAssets: "Total Assets",
  currentAssets: "Current Assets",
  nonCurrentAssets: "Non-Current Assets",
  cashAndEquivalents: "Cash & Equivalents",
  accountsReceivable: "Accounts Receivable",
  inventory: "Inventory",
  shortTermInvestments: "Short-Term Investments",
  ppe: "Property, Plant & Equipment",
  rightOfUseAssets: "Right-of-Use Assets",
  investmentProperties: "Investment Properties",
  biologicalAssets: "Biological Assets / Bearer Plants",
  intangibleAssets: "Intangible Assets",
  goodwill: "Goodwill",
  totalLiabilities: "Total Liabilities",
  currentLiabilities: "Current Liabilities",
  nonCurrentLiabilities: "Non-Current Liabilities",
  accountsPayable: "Accounts Payable",
  shortTermDebt: "Short-Term Debt",
  longTermDebt: "Long-Term Debt",
  totalBorrowings: "Total Borrowings",
  bondsPayable: "Bonds / Sukuk Payable",
  leaseLiabilities: "Lease Liabilities",
  totalEquity: "Total Equity",
  minorityInterest: "Non-Controlling Interests",
  commonStock: "Share Capital",
  preferredStock: "Preference Shares",
  paidInCapital: "Share Premium",
  retainedEarnings: "Retained Earnings",

  // Cash flow
  operatingCashFlow: "Operating Cash Flow",
  investingCashFlow: "Investing Cash Flow",
  financingCashFlow: "Financing Cash Flow",
  freeCashFlow: "Free Cash Flow",
  capitalExpenditure: "Capital Expenditure",
  dividendsPaid: "Dividends Paid",
  interestPaid: "Interest Paid",
  netChangeInCash: "Net Change in Cash",

  // Ratios
  roe: "Return on Equity (ROE)",
  roa: "Return on Assets (ROA)",
  roic: "Return on Invested Capital",
  grossMargin: "Gross Margin",
  operatingMargin: "Operating Margin",
  netProfitMargin: "Net Profit Margin",
  currentRatio: "Current Ratio",
  quickRatio: "Quick Ratio",
  cashRatio: "Cash Ratio",
  debtToEquity: "Debt to Equity",
  debtRatio: "Debt Ratio",
  interestCoverage: "Interest Coverage",
  assetTurnover: "Asset Turnover",
  inventoryTurnover: "Inventory Turnover",
  receivablesTurnover: "Receivables Turnover",
  payablesTurnover: "Payables Turnover",
  eps: "Earnings Per Share (EPS)",
  dilutedEps: "Diluted EPS",
  peRatio: "P/E Ratio",
  dividendYield: "Dividend Yield",
  dividendPerShare: "Dividend Per Share",
  dividendPayoutRatio: "Payout Ratio",
  retentionRatio: "Retention Ratio",
  totalDividendPaid: "Total Dividend Paid",
  netAssetsPerShare: "Net Assets Per Share",

  // Growth
  revenueGrowth: "Revenue Growth",
  netIncomeGrowth: "Net Income Growth",
  cagr: "CAGR",

  // Market data
  sharePrice: "Share Price",
  marketCapitalization: "Market Capitalisation",
  sharesOutstanding: "Shares Outstanding",
  weightedAverageSharesOutstanding: "Weighted Average Shares Outstanding",
  dilutedSharesOutstanding: "Diluted Shares Outstanding",

  // Advanced
  enterpriseValue: "Enterprise Value",
  evEbitda: "EV/EBITDA",
  fcfYield: "FCF Yield",
  eva: "Economic Value Added",
  workingCapital: "Working Capital",
  netWorkingCapital: "Net Working Capital",
  netDebt: "Net Debt",
};

/* -------------------------------------------------------------------------- */
/*  Numeric helpers                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Parses a value out of a financial statement. Handles accounting negatives
 * "(1,234)", currency prefixes "RM1,234", percent suffixes and em-dash nils.
 */
export function safeNum(val: string | number | null | undefined): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === "number") return isFinite(val) ? val : 0;

  let s = String(val).trim();
  if (s === "" || s === "-" || s === "\u2014" || s.toUpperCase() === "N/A") return 0;

  let negative = false;
  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1);
  }

  s = s.replace(/[^0-9eE+\-.]/g, "");
  const n = parseFloat(s);
  if (isNaN(n) || !isFinite(n)) return 0;
  return negative ? -n : n;
}

export function isBlank(val: string | number | null | undefined): boolean {
  if (val === null || val === undefined) return true;
  const s = String(val).trim();
  return s === "" || s === "-" || s === "\u2014" || s.toUpperCase() === "N/A";
}

/**
 * Display formatter. Small magnitudes (ratios, EPS, margins) keep decimals;
 * large magnitudes (balances) round to whole units.
 */
export function formatNum(val: string | number | null | undefined): string {
  if (isBlank(val)) return "\u2014";
  const n = safeNum(val);
  const abs = Math.abs(n);
  const digits = abs === 0 ? 0 : abs < 10 ? 2 : abs < 1000 ? 1 : 0;
  return n.toLocaleString("en-MY", { maximumFractionDigits: digits });
}

/** Formats a parser output value, which is always in millions of the report currency. */
export function formatMillions(val: number | null | undefined, currency = "RM"): string {
  if (val === null || val === undefined || !isFinite(val)) return "\u2014";
  const abs = Math.abs(val);
  if (abs >= 1000) return `${currency} ${(val / 1000).toLocaleString("en-MY", { maximumFractionDigits: 2 })}b`;
  if (abs >= 1) return `${currency} ${val.toLocaleString("en-MY", { maximumFractionDigits: 1 })}m`;
  return `${currency} ${(val * 1000).toLocaleString("en-MY", { maximumFractionDigits: 0 })}k`;
}