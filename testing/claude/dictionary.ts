/**
 * Financial line-item dictionary.
 *
 * Every entry drives the markdown parser:
 *  - `keywords`  phrases that identify the line item in a statement
 *  - `exclude`   phrases that must NOT appear (stops "total current liabilities"
 *                from being matched as "liabilities")
 *  - `kind`      how the raw number should be treated (see ValueKind)
 *  - `sign`      how to normalise the printed sign
 *  - `priority`  tie-breaker when two fields match equally well (higher wins)
 *  - `statement` which statement the line is expected to appear in; used to
 *                suppress cross-statement false positives
 */

export type Category =
  | "incomeStatement"
  | "balanceSheet"
  | "cashFlow"
  | "ratios"
  | "growth"
  | "marketData"
  | "advanced";

export type StatementKind = "income" | "balance" | "cashflow" | "equity" | "any";

/**
 * currency   a money amount printed in the document's unit (RM'000, RM'm ...)
 *            and therefore subject to unit scaling
 * perShare   sen / RM per share - never unit-scaled
 * ratio      a multiple such as 1.8x - never unit-scaled
 * percent    a percentage - never unit-scaled
 * count      share counts - unit-scaled only when printed in '000
 */
export type ValueKind = "currency" | "perShare" | "ratio" | "percent" | "count";

/**
 * asPrinted  keep the sign exactly as extracted
 * positive   store the magnitude (expenses printed in brackets become positive,
 *            which is what every downstream margin formula assumes)
 * negative   store as a negative number
 */
export type SignRule = "asPrinted" | "positive" | "negative";

export interface DictionaryEntry {
  category: Category;
  keywords: string[];
  exclude?: string[];
  kind?: ValueKind;
  sign?: SignRule;
  priority?: number;
  statement?: StatementKind;
}

export const FINANCIAL_DICTIONARY: Record<string, DictionaryEntry> = {
  /* ───────────────────────── Income statement ───────────────────────── */
  revenue: {
    category: "incomeStatement",
    statement: "income",
    priority: 90,
    keywords: [
      "revenue from contracts with customers",
      "total revenue",
      "revenue",
      "turnover",
      "total turnover",
      "net sales",
      "total sales",
      "operating revenue",
      "total operating income",
      "total income",
      "gross revenue",
    ],
    exclude: [
      "other revenue",
      "non-operating revenue",
      "deferred revenue",
      "revenue growth",
      "cost of revenue",
      "unbilled revenue",
      "contract revenue asset",
      "revenue reserve",
      "sales and redemptions",
      "sales of",
      "proceeds from",
      "cost of",
    ],
  },
  otherOperatingIncome: {
    category: "incomeStatement",
    statement: "income",
    keywords: ["other operating income", "other income", "sundry income", "miscellaneous income"],
  },
  nonOperatingRevenue: {
    category: "incomeStatement",
    statement: "income",
    keywords: ["non-operating revenue", "non operating income", "other gains"],
  },
  costOfGoodsSold: {
    category: "incomeStatement",
    statement: "income",
    sign: "positive",
    priority: 90,
    keywords: [
      "cost of goods sold",
      "cost of sales",
      "cost of revenue",
      "cost of services",
      "cogs",
      "direct costs",
    ],
  },
  grossProfit: {
    category: "incomeStatement",
    statement: "income",
    priority: 85,
    keywords: ["gross profit", "gross profit/(loss)", "gross (loss)/profit", "gp"],
    exclude: ["gross profit margin", "gross margin %"],
  },
  operatingExpenses: {
    category: "incomeStatement",
    statement: "income",
    sign: "positive",
    priority: 80,
    keywords: [
      "total operating expenses",
      "operating expenses",
      "total overheads",
      "overheads",
      "overhead expenses",
      "other operating expenses",
      "opex",
    ],
    exclude: ["operating expenses ratio"],
  },
  sgaExpenses: {
    category: "incomeStatement",
    statement: "income",
    sign: "positive",
    keywords: [
      "selling, general and administrative",
      "selling general and administrative",
      "administrative expenses",
      "administration expenses",
      "selling and distribution expenses",
      "selling and marketing expenses",
      "distribution costs",
      "sg&a",
    ],
  },
  staffCosts: {
    category: "incomeStatement",
    statement: "income",
    sign: "positive",
    keywords: ["personnel expenses", "personnel costs", "staff costs", "employee benefits expense"],
  },
  researchDevelopment: {
    category: "incomeStatement",
    statement: "income",
    sign: "positive",
    keywords: ["research and development", "research & development", "r&d expenses", "r&d"],
  },
  depreciation: {
    category: "incomeStatement",
    statement: "any",
    sign: "positive",
    keywords: [
      "depreciation of property, plant and equipment",
      "depreciation and amortisation",
      "depreciation and amortization",
      "depreciation of right-of-use assets",
      "depreciation expense",
      "depreciation",
    ],
    exclude: ["accumulated depreciation"],
  },
  amortization: {
    category: "incomeStatement",
    statement: "any",
    sign: "positive",
    keywords: ["amortisation of intangible assets", "amortisation expense", "amortisation", "amortization"],
    exclude: ["accumulated amortisation", "depreciation and amortisation"],
  },
  ebit: {
    category: "incomeStatement",
    statement: "income",
    keywords: ["earnings before interest and tax", "ebit"],
    exclude: ["ebitda", "earnings before interest, tax, depreciation"],
  },
  ebitda: {
    category: "incomeStatement",
    statement: "income",
    keywords: [
      "earnings before interest, tax, depreciation and amortisation",
      "earnings before interest, taxation, depreciation",
      "operating profit before depreciation",
      "ebitda",
    ],
  },
  operatingProfit: {
    category: "incomeStatement",
    statement: "income",
    priority: 80,
    keywords: [
      "operating profit before impairment losses",
      "operating profit before allowances",
      "operating profit/(loss)",
      "profit from operations",
      "results from operating activities",
      "operating profit",
      "operating income",
      "operating (loss)/profit",
    ],
    exclude: ["operating profit margin", "net operating income"],
  },
  financeIncome: {
    category: "incomeStatement",
    statement: "income",
    keywords: ["finance income", "interest income", "investment income"],
    exclude: ["net interest income"],
  },
  financeCost: {
    category: "incomeStatement",
    statement: "income",
    sign: "positive",
    keywords: ["finance costs", "finance cost", "interest expense", "borrowing costs", "interest on borrowings"],
  },
  shareOfAssociates: {
    category: "incomeStatement",
    statement: "income",
    keywords: [
      "share of results of associates",
      "share of profit of associates",
      "share of results of joint ventures",
      "share of profits of associates and joint ventures",
    ],
  },
  impairmentLosses: {
    category: "incomeStatement",
    statement: "income",
    sign: "positive",
    keywords: ["impairment losses", "allowance for credit losses", "allowances for impairment losses", "impairment loss on"],
  },
  profitBeforeTax: {
    category: "incomeStatement",
    statement: "income",
    priority: 90,
    keywords: [
      "profit before taxation and zakat",
      "profit before taxation",
      "profit/(loss) before tax",
      "(loss)/profit before tax",
      "profit before tax",
      "income before tax",
      "pbt",
    ],
    exclude: ["profit before tax margin"],
  },
  taxExpense: {
    category: "incomeStatement",
    statement: "income",
    sign: "positive",
    priority: 80,
    keywords: ["taxation and zakat", "income tax expense", "tax expense", "taxation", "income tax"],
    exclude: [
      "deferred tax",
      "tax recoverable",
      "tax payable",
      "effective tax rate",
      "tax rate",
      "taxation paid",
      "tax paid",
      "tax refund",
      "net of tax",
      "tax effect",
    ],
  },
  effectiveTaxRate: {
    category: "incomeStatement",
    statement: "income",
    kind: "percent",
    keywords: ["effective tax rate"],
  },
  netProfit: {
    category: "incomeStatement",
    statement: "income",
    priority: 95,
    keywords: [
      "profit attributable to owners of the parent",
      "profit attributable to equity holders",
      "net profit for the financial period",
      "net profit for the year",
      "profit for the financial period",
      "profit for the financial year",
      "profit for the year",
      "profit after taxation",
      "profit after tax",
      "net profit",
      "pat",
    ],
    exclude: ["net profit margin", "non-controlling", "net income growth"],
  },
  comprehensiveIncome: {
    category: "incomeStatement",
    statement: "income",
    keywords: ["total comprehensive income for the", "total comprehensive income"],
  },

  /* ───────────────────────── Balance sheet ───────────────────────── */
  totalAssets: {
    category: "balanceSheet",
    statement: "balance",
    priority: 95,
    keywords: ["total assets", "assets total"],
    exclude: ["total current assets", "total non-current assets", "return on assets", "net assets"],
  },
  currentAssets: {
    category: "balanceSheet",
    statement: "balance",
    priority: 90,
    keywords: ["total current assets", "current assets"],
    exclude: ["non-current assets", "other current assets"],
  },
  nonCurrentAssets: {
    category: "balanceSheet",
    statement: "balance",
    priority: 90,
    keywords: ["total non-current assets", "non-current assets", "non current assets"],
  },
  cashAndEquivalents: {
    category: "balanceSheet",
    statement: "balance",
    priority: 90,
    keywords: [
      "cash and cash equivalents",
      "cash and short-term funds",
      "cash and bank balances",
      "bank balances and cash",
      "cash and balances with banks",
      "deposits, cash and bank balances",
    ],
    exclude: ["restricted cash", "net increase", "net decrease", "at the end of", "at the beginning of"],
  },
  accountsReceivable: {
    category: "balanceSheet",
    statement: "balance",
    keywords: ["trade and other receivables", "trade receivables", "accounts receivable", "receivables"],
    exclude: ["receivables turnover"],
  },
  inventory: {
    category: "balanceSheet",
    statement: "balance",
    keywords: ["inventories", "inventory", "stocks and work-in-progress"],
    exclude: ["inventory turnover", "changes in inventories"],
  },
  shortTermInvestments: {
    category: "balanceSheet",
    statement: "balance",
    keywords: ["short-term investments", "other investments", "financial assets at fair value through profit or loss"],
  },
  ppe: {
    category: "balanceSheet",
    statement: "balance",
    keywords: ["property, plant and equipment", "property plant and equipment", "fixed assets", "ppe"],
    exclude: ["depreciation", "purchase of", "additions to", "disposal of"],
  },
  rightOfUseAssets: {
    category: "balanceSheet",
    statement: "balance",
    keywords: ["right-of-use assets", "right of use assets"],
    exclude: ["depreciation"],
  },
  investmentProperties: {
    category: "balanceSheet",
    statement: "balance",
    keywords: ["investment properties", "investment property"],
  },
  biologicalAssets: {
    category: "balanceSheet",
    statement: "balance",
    keywords: ["biological assets", "bearer plants", "plantation development expenditure"],
  },
  intangibleAssets: {
    category: "balanceSheet",
    statement: "balance",
    keywords: ["intangible assets", "other intangible assets"],
    exclude: ["amortisation"],
  },
  goodwill: {
    category: "balanceSheet",
    statement: "balance",
    keywords: ["goodwill on consolidation", "goodwill on acquisition", "goodwill"],
  },
  totalLiabilities: {
    category: "balanceSheet",
    statement: "balance",
    priority: 95,
    keywords: ["total liabilities", "liabilities total"],
    exclude: [
      "total current liabilities",
      "total non-current liabilities",
      "total equity and liabilities",
      "total liabilities and equity",
      "total liabilities and islamic",
      "total liabilities and shareholders",
    ],
  },
  currentLiabilities: {
    category: "balanceSheet",
    statement: "balance",
    priority: 90,
    keywords: ["total current liabilities", "current liabilities"],
    exclude: ["non-current liabilities", "other current liabilities"],
  },
  nonCurrentLiabilities: {
    category: "balanceSheet",
    statement: "balance",
    priority: 90,
    keywords: ["total non-current liabilities", "non-current liabilities", "non current liabilities"],
  },
  accountsPayable: {
    category: "balanceSheet",
    statement: "balance",
    keywords: ["trade and other payables", "trade payables", "accounts payable", "payables"],
    exclude: ["payables turnover"],
  },
  shortTermDebt: {
    category: "balanceSheet",
    statement: "balance",
    keywords: [
      "short term borrowings",
      "short-term borrowings",
      "current portion of borrowings",
      "borrowings - current",
      "bank overdrafts",
      "short-term debt",
      "revolving credit",
    ],
  },
  longTermDebt: {
    category: "balanceSheet",
    statement: "balance",
    keywords: [
      "long term borrowings",
      "long-term borrowings",
      "borrowings - non-current",
      "term loans",
      "long-term debt",
      "hire purchase payables",
    ],
  },
  totalBorrowings: {
    category: "balanceSheet",
    statement: "balance",
    keywords: ["total borrowings", "total debt", "borrowings"],
    exclude: ["short", "long", "current", "cost of borrowings", "borrowing costs"],
  },
  bondsPayable: {
    category: "balanceSheet",
    statement: "balance",
    keywords: ["bonds payable", "unsecured bonds", "medium term notes", "sukuk", "debt securities issued"],
  },
  leaseLiabilities: {
    category: "balanceSheet",
    statement: "balance",
    keywords: ["lease liabilities", "lease liability"],
  },
  totalEquity: {
    category: "balanceSheet",
    statement: "balance",
    priority: 95,
    keywords: [
      "total equity",
      "total shareholders' equity",
      "shareholders' funds",
      "shareholders' equity",
      "equity attributable to owners of the parent",
      "equity total",
      "net assets",
    ],
    exclude: [
      "total equity and liabilities",
      "total liabilities and equity",
      "return on equity",
      "debt to equity",
      "non-controlling",
      "statements of changes in equity",
    ],
  },
  minorityInterest: {
    category: "balanceSheet",
    statement: "balance",
    keywords: ["non-controlling interests", "minority interests"],
  },
  commonStock: {
    category: "balanceSheet",
    statement: "balance",
    keywords: ["share capital", "ordinary share capital", "ordinary shares", "common stock"],
    exclude: ["share capital reduction"],
  },
  preferredStock: {
    category: "balanceSheet",
    statement: "balance",
    keywords: ["preference shares", "perpetual preference shares", "preferred stock"],
  },
  paidInCapital: {
    category: "balanceSheet",
    statement: "balance",
    keywords: ["share premium", "additional paid-in capital", "paid-in capital"],
  },
  retainedEarnings: {
    category: "balanceSheet",
    statement: "balance",
    priority: 85,
    keywords: ["retained earnings", "retained profits", "accumulated profits", "accumulated losses", "revenue reserves"],
  },

  /* ───────────────────────── Cash flow ───────────────────────── */
  operatingCashFlow: {
    category: "cashFlow",
    statement: "cashflow",
    priority: 90,
    keywords: [
      "net cash generated from operating activities",
      "net cash from operating activities",
      "net cash used in operating activities",
      "net cash flows from operating activities",
      "cash generated from operations",
    ],
    exclude: ["change in", "changes in", "adjustment"],
  },
  investingCashFlow: {
    category: "cashFlow",
    statement: "cashflow",
    priority: 90,
    keywords: [
      "net cash used in investing activities",
      "net cash from investing activities",
      "net cash generated from investing activities",
      "net cash flows from investing activities",
    ],
    exclude: ["change in", "changes in"],
  },
  financingCashFlow: {
    category: "cashFlow",
    statement: "cashflow",
    priority: 90,
    keywords: [
      "net cash used in financing activities",
      "net cash from financing activities",
      "net cash generated from financing activities",
      "net cash flows from financing activities",
    ],
    exclude: ["change in", "changes in"],
  },
  capitalExpenditure: {
    category: "cashFlow",
    statement: "cashflow",
    sign: "positive",
    keywords: [
      "purchase of property, plant and equipment",
      "purchase of property, plant",
      "acquisition of property, plant and equipment",
      "additions to property, plant and equipment",
      "capital expenditure",
      "capex",
    ],
  },
  freeCashFlow: {
    category: "cashFlow",
    statement: "cashflow",
    keywords: ["free cash flow", "fcf"],
  },
  dividendsPaid: {
    category: "cashFlow",
    statement: "cashflow",
    sign: "positive",
    keywords: ["dividends paid", "dividend paid to shareholders", "dividends paid to owners"],
    exclude: ["dividends received"],
  },
  interestPaid: {
    category: "cashFlow",
    statement: "cashflow",
    sign: "positive",
    keywords: ["interest paid"],
  },
  netChangeInCash: {
    category: "cashFlow",
    statement: "cashflow",
    keywords: [
      "net increase/(decrease) in cash and cash equivalents",
      "net (decrease)/increase in cash",
      "net increase in cash and cash equivalents",
      "net decrease in cash and cash equivalents",
    ],
  },

  /* ───────────────────────── Ratios & per-share ───────────────────────── */
  roe: { category: "ratios", kind: "percent", keywords: ["return on equity", "roe"] },
  roa: { category: "ratios", kind: "percent", keywords: ["return on assets", "roa"] },
  roic: { category: "ratios", kind: "percent", keywords: ["return on invested capital", "roic"] },
  grossMargin: { category: "ratios", kind: "percent", keywords: ["gross profit margin", "gross margin"] },
  operatingMargin: { category: "ratios", kind: "percent", keywords: ["operating profit margin", "operating margin"] },
  netProfitMargin: { category: "ratios", kind: "percent", keywords: ["net profit margin", "net margin", "profit margin"] },
  currentRatio: { category: "ratios", kind: "ratio", keywords: ["current ratio"] },
  quickRatio: { category: "ratios", kind: "ratio", keywords: ["quick ratio", "acid-test ratio"] },
  cashRatio: { category: "ratios", kind: "ratio", keywords: ["cash ratio"] },
  debtToEquity: { category: "ratios", kind: "ratio", keywords: ["debt to equity ratio", "debt-to-equity", "gearing ratio", "gearing"] },
  debtRatio: { category: "ratios", kind: "ratio", keywords: ["debt ratio"] },
  interestCoverage: { category: "ratios", kind: "ratio", keywords: ["interest coverage", "times interest earned"] },
  assetTurnover: { category: "ratios", kind: "ratio", keywords: ["asset turnover"] },
  inventoryTurnover: { category: "ratios", kind: "ratio", keywords: ["inventory turnover"] },
  receivablesTurnover: { category: "ratios", kind: "ratio", keywords: ["receivables turnover", "debtor turnover"] },
  payablesTurnover: { category: "ratios", kind: "ratio", keywords: ["payables turnover", "creditor turnover"] },
  eps: {
    category: "ratios",
    kind: "perShare",
    priority: 85,
    keywords: ["basic earnings per share", "earnings per share", "basic eps", "basic/diluted", "eps"],
    exclude: ["diluted earnings per share", "weighted average", "number of"],
  },
  dilutedEps: { category: "ratios", kind: "perShare", keywords: ["diluted earnings per share", "diluted eps"] },
  peRatio: { category: "ratios", kind: "ratio", keywords: ["p/e ratio", "price earnings ratio", "pe ratio"] },
  dividendYield: { category: "ratios", kind: "percent", keywords: ["dividend yield"] },
  dividendPerShare: { category: "ratios", kind: "perShare", keywords: ["dividend per share", "interim dividend per share", "dps"] },
  dividendPayoutRatio: { category: "ratios", kind: "percent", keywords: ["dividend payout ratio", "payout ratio"] },
  retentionRatio: { category: "ratios", kind: "percent", keywords: ["retention ratio"] },
  totalDividendPaid: { category: "ratios", keywords: ["total dividend paid", "total dividends"] },
  netAssetsPerShare: {
    category: "ratios",
    kind: "perShare",
    keywords: ["net assets per share", "net tangible assets per share", "nta per share"],
  },

  /* ───────────────────────── Growth ───────────────────────── */
  revenueGrowth: { category: "growth", kind: "percent", keywords: ["revenue growth", "sales growth"] },
  netIncomeGrowth: { category: "growth", kind: "percent", keywords: ["net income growth", "profit growth"] },
  cagr: { category: "growth", kind: "percent", keywords: ["cagr", "compound annual growth rate"] },

  /* ───────────────────────── Market data ───────────────────────── */
  sharePrice: { category: "marketData", kind: "perShare", keywords: ["share price", "closing share price", "market price per share"] },
  marketCapitalization: { category: "marketData", keywords: ["market capitalisation", "market capitalization", "market cap"] },
  sharesOutstanding: {
    category: "marketData",
    kind: "count",
    keywords: ["number of ordinary shares in issue", "shares in issue", "shares outstanding", "issued share capital"],
  },
  weightedAverageSharesOutstanding: {
    category: "marketData",
    kind: "count",
    keywords: ["weighted average number of ordinary shares", "weighted average shares"],
  },
  dilutedSharesOutstanding: {
    category: "marketData",
    kind: "count",
    keywords: ["diluted weighted average number of ordinary shares", "diluted shares outstanding"],
  },

  /* ───────────────────────── Advanced ───────────────────────── */
  enterpriseValue: { category: "advanced", keywords: ["enterprise value"] },
  evEbitda: { category: "advanced", kind: "ratio", keywords: ["ev/ebitda", "ev to ebitda"] },
  fcfYield: { category: "advanced", kind: "percent", keywords: ["fcf yield", "free cash flow yield"] },
  eva: { category: "advanced", keywords: ["economic value added", "eva"] },
  workingCapital: { category: "advanced", keywords: ["working capital"] },
  netWorkingCapital: { category: "advanced", keywords: ["net working capital"] },
  netDebt: { category: "advanced", keywords: ["net debt"] },
};

/** Pre-flattened, longest-keyword-first match table. Built once at module load. */
export interface KeywordIndexEntry {
  fieldId: string;
  keyword: string;
  entry: DictionaryEntry;
}

export const KEYWORD_INDEX: KeywordIndexEntry[] = Object.entries(FINANCIAL_DICTIONARY)
  .flatMap(([fieldId, entry]) => entry.keywords.map((keyword) => ({ fieldId, keyword, entry })))
  .sort((a, b) => b.keyword.length - a.keyword.length);