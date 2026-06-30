export interface DictionaryItem {
  category: string;
  keywords: string[];
}

export const FINANCIAL_DICTIONARY: Record<string, DictionaryItem> = {
  // Income Statement
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

  // Balance Sheet
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

  // Cash Flow
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

  // Ratios & Metrics
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