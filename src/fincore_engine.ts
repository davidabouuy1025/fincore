import { CompanyReport, Financials } from "./types";
import { safeNum } from "./constants";

export interface Core8Metrics {
  roic: number;
  fcfMargin: number;
  operatingLeverage: number;
  netDebtToEbitda: number;
  cashConversionCycle: number;
  assetProductivity: number;
  capexToDepreciation: number;
  altmanZScore: number;
}

export interface SectorMetric {
  id: string;
  label: string;
  value: string;
  rating: "Strong" | "Moderate" | "Weak";
}

export interface ScoringSummary {
  companyQualityScore: number;
  investmentQualityScore: number;
  recommendation: "Institutional Buy" | "Hold / Watchlist" | "Avoid / Overvalued";
  statusColor: string; // emerald, amber, rose
}

/**
 * Calculates the Core 8 Financial Metrics (Universal Layer) for a given report
 */
export function calculateCore8Metrics(report: CompanyReport): Core8Metrics {
  const inc = report.Financials.incomeStatement || {};
  const bal = report.Financials.balanceSheet || {};
  const cash = report.Financials.cashFlow || {};
  const rat = report.Financials.ratios || {};

  const revenue = safeNum(inc.revenue);
  const costOfGoodsSold = safeNum(inc.costOfGoodsSold);
  const opex = safeNum(inc.operatingExpenses);
  const gp = safeNum(inc.grossProfit) || (revenue - costOfGoodsSold);
  
  // 1. EBIT (Operating Income)
  const ebit = safeNum(inc.ebit || inc.operatingProfit || (revenue - costOfGoodsSold - opex));
  
  // 2. Effective Tax Rate
  const etr = safeNum(inc.effectiveTaxRate) || 
    (safeNum(inc.profitBeforeTax) > 0 ? safeNum(inc.taxExpense) / safeNum(inc.profitBeforeTax) : 0.24);

  // 3. NOPAT
  const nopat = ebit * (1 - Math.min(0.9, Math.max(0, etr)));

  // 4. Total Debt & Invested Capital
  const stDebt = safeNum(bal.shortTermDebt || bal.currentLiabilities);
  const ltDebt = safeNum(bal.longTermDebt || bal.nonCurrentLiabilities);
  const bonds = safeNum(bal.bondsPayable || 0);
  const totalDebt = stDebt + ltDebt + bonds;
  
  const cashAndEquiv = safeNum(bal.cashAndEquivalents);
  const totalEquity = safeNum(bal.totalEquity);
  
  const investedCapital = totalDebt + totalEquity - cashAndEquiv;
  const roic = investedCapital > 0 ? (nopat / investedCapital) * 100 : 0;

  // 5. Free Cash Flow (FCF) Margin
  const fcf = safeNum(cash.freeCashFlow) || (safeNum(cash.operatingCashFlow) - safeNum(cash.capitalExpenditure));
  const fcfMargin = revenue > 0 ? (fcf / revenue) * 100 : 0;

  // 6. Operating Leverage (proxy EBIT Margin)
  const operatingLeverage = revenue > 0 ? (ebit / revenue) * 100 : 0;

  // 7. Net Debt to EBITDA
  const netDebt = totalDebt - cashAndEquiv;
  const depreciation = safeNum(inc.depreciation || 0);
  const amortization = safeNum(inc.amortization || 0);
  const ebitda = safeNum(inc.ebitda) || (ebit + depreciation + amortization);
  const netDebtToEbitda = ebitda > 0 ? netDebt / ebitda : netDebt > 0 ? 5.0 : 0;

  // 8. Cash Conversion Cycle (CCC)
  // DSO = (AR / Revenue) * 365
  const ar = safeNum(bal.accountsReceivable);
  const dso = revenue > 0 ? (ar / revenue) * 365 : 0;
  
  // DIO = (Inventory / COGS) * 365
  const inventory = safeNum(bal.inventory);
  const cogs = costOfGoodsSold || (revenue * 0.6); // default 60% COGS if missing
  const dio = cogs > 0 ? (inventory / cogs) * 365 : 0;
  
  // DPO = (Payables / COGS) * 365
  const ap = safeNum(bal.accountsPayable);
  const dpo = cogs > 0 ? (ap / cogs) * 365 : 0;
  const cashConversionCycle = Math.round(dio + dso - dpo);

  // 9. Asset Productivity (GP / Total Assets)
  const totalAssets = safeNum(bal.totalAssets);
  const assetProductivity = totalAssets > 0 ? (gp / totalAssets) * 100 : 0;

  // 10. CapEx to Depreciation
  const capex = safeNum(cash.capitalExpenditure);
  const capexToDepreciation = depreciation > 0 ? capex / depreciation : capex > 0 ? 2.0 : 1.0;

  // 11. Altman Z-Score
  const curAssets = safeNum(bal.currentAssets);
  const curLiab = safeNum(bal.currentLiabilities) || (safeNum(bal.totalLiabilities) - ltDebt);
  const workingCapital = curAssets - curLiab;
  const retainedEarnings = safeNum(inc.retainedEarnings || (totalEquity * 0.4)); // default 40% of equity

  const x1 = totalAssets > 0 ? workingCapital / totalAssets : 0;
  const x2 = totalAssets > 0 ? retainedEarnings / totalAssets : 0;
  const x3 = totalAssets > 0 ? ebit / totalAssets : 0;
  const x4 = safeNum(bal.totalLiabilities) > 0 ? totalEquity / safeNum(bal.totalLiabilities) : 2.0;
  const x5 = totalAssets > 0 ? revenue / totalAssets : 0;

  const altmanZScore = 1.2 * x1 + 1.4 * x2 + 3.3 * x3 + 0.6 * x4 + 0.999 * x5;

  return {
    roic: isNaN(roic) ? 0 : roic,
    fcfMargin: isNaN(fcfMargin) ? 0 : fcfMargin,
    operatingLeverage: isNaN(operatingLeverage) ? 0 : operatingLeverage,
    netDebtToEbitda: isNaN(netDebtToEbitda) ? 0 : netDebtToEbitda,
    cashConversionCycle: isNaN(cashConversionCycle) ? 0 : cashConversionCycle,
    assetProductivity: isNaN(assetProductivity) ? 0 : assetProductivity,
    capexToDepreciation: isNaN(capexToDepreciation) ? 1.0 : capexToDepreciation,
    altmanZScore: isNaN(altmanZScore) ? 1.5 : altmanZScore,
  };
}

/**
 * Calculates sector-specific metrics for the Intelligence Layer
 */
export function calculateSectorMetrics(report: CompanyReport, sector: string): SectorMetric[] {
  const inc = report.Financials.incomeStatement || {};
  const bal = report.Financials.balanceSheet || {};
  const cash = report.Financials.cashFlow || {};
  const rat = report.Financials.ratios || {};

  const rev = safeNum(inc.revenue);
  const gp = safeNum(inc.grossProfit) || (rev - safeNum(inc.costOfGoodsSold));
  const opex = safeNum(inc.operatingExpenses);
  const net = safeNum(inc.netProfit);
  const assets = safeNum(bal.totalAssets);
  const equity = safeNum(bal.totalEquity);
  const debt = safeNum(bal.shortTermDebt) + safeNum(bal.longTermDebt);

  const sec = (sector || "").toUpperCase();

  if (sec.includes("TECH") || sec.includes("SOFTWARE")) {
    const rd = safeNum(inc.researchDevelopment);
    const rdToRev = rev > 0 ? (rd / rev) * 100 : 0;
    
    // Rule of 40: Growth proxy + FCF margin
    const fcf = safeNum(cash.freeCashFlow) || (safeNum(cash.operatingCashFlow) - safeNum(cash.capitalExpenditure));
    const fcfMargin = rev > 0 ? (fcf / rev) * 100 : 0;
    const growth = safeNum(report.Financials.growth?.revenueGrowth) || (net > 0 ? (net / rev) * 50 : 15); // estimation proxy
    const ruleOf40 = growth + fcfMargin;

    return [
      {
        id: "rd_ratio",
        label: "R&D-to-Revenue Ratio",
        value: `${rdToRev.toFixed(1)}%`,
        rating: rdToRev >= 12 ? "Strong" : rdToRev >= 5 ? "Moderate" : "Weak"
      },
      {
        id: "rule_of_40",
        label: "Rule of 40 Score",
        value: `${ruleOf40.toFixed(1)}%`,
        rating: ruleOf40 >= 40 ? "Strong" : ruleOf40 >= 20 ? "Moderate" : "Weak"
      },
      {
        id: "gross_margin",
        label: "Gross Margin Integrity",
        value: rev > 0 ? `${((gp / rev) * 100).toFixed(1)}%` : "—",
        rating: (gp / rev) >= 0.65 ? "Strong" : (gp / rev) >= 0.45 ? "Moderate" : "Weak"
      }
    ];
  }

  if (sec.includes("FINANCIAL") || sec.includes("BANK")) {
    const nimProxy = rev > 0 ? (gp / rev) * 100 : 0;
    const cet1Proxy = assets > 0 ? (equity / assets) * 100 : 0;
    const costIncome = rev > 0 ? (opex / rev) * 100 : 0;

    return [
      {
        id: "nim_proxy",
        label: "Net Interest Margin (NIM) Proxy",
        value: `${nimProxy.toFixed(1)}%`,
        rating: nimProxy >= 3.0 ? "Strong" : nimProxy >= 1.5 ? "Moderate" : "Weak"
      },
      {
        id: "adequacy",
        label: "CET1 Capital Adequacy Proxy",
        value: `${cet1Proxy.toFixed(1)}%`,
        rating: cet1Proxy >= 12 ? "Strong" : cet1Proxy >= 8 ? "Moderate" : "Weak"
      },
      {
        id: "cost_income",
        label: "Cost-to-Income Efficiency",
        value: `${costIncome.toFixed(1)}%`,
        rating: costIncome <= 45 ? "Strong" : costIncome <= 60 ? "Moderate" : "Weak"
      }
    ];
  }

  if (sec.includes("CONSTRUCT") || sec.includes("INDUSTRIAL") || sec.includes("INFRA")) {
    const assetTurn = assets > 0 ? rev / assets : 0;
    const debtEquity = equity > 0 ? debt / equity : 0;
    const wcRev = rev > 0 ? ((safeNum(bal.currentAssets) - safeNum(bal.currentLiabilities)) / rev) * 100 : 0;

    return [
      {
        id: "asset_turn",
        label: "Asset Turnover Velocity",
        value: `${assetTurn.toFixed(2)}x`,
        rating: assetTurn >= 1.0 ? "Strong" : assetTurn >= 0.5 ? "Moderate" : "Weak"
      },
      {
        id: "debt_equity",
        label: "Leverage (Debt-to-Equity)",
        value: `${debtEquity.toFixed(2)}x`,
        rating: debtEquity <= 0.5 ? "Strong" : debtEquity <= 1.5 ? "Moderate" : "Weak"
      },
      {
        id: "working_cap_rev",
        label: "Working Capital/Revenue Integrity",
        value: `${wcRev.toFixed(1)}%`,
        rating: wcRev >= 15 ? "Strong" : wcRev >= 5 ? "Moderate" : "Weak"
      }
    ];
  }

  if (sec.includes("REIT") || sec.includes("PROPERTY")) {
    const leverage = assets > 0 ? (debt / assets) * 100 : 0;
    const divYield = safeNum(rat.dividendYield) || 5.8;
    const stDebt = safeNum(bal.shortTermDebt || bal.currentLiabilities);
    const dscr = safeNum(inc.ebit || inc.operatingProfit) > 0 && safeNum(inc.depreciation) > 0 
      ? (safeNum(inc.ebit || inc.operatingProfit) / (stDebt * 0.08 + 1)) // Interest coverage proxy
      : 2.5;

    return [
      {
        id: "reit_leverage",
        label: "Financial Gearing Ratio",
        value: `${leverage.toFixed(1)}%`,
        rating: leverage <= 35 ? "Strong" : leverage <= 50 ? "Moderate" : "Weak"
      },
      {
        id: "reit_yield",
        label: "Distribution Yield",
        value: `${divYield.toFixed(1)}%`,
        rating: divYield >= 6.0 ? "Strong" : divYield >= 4.5 ? "Moderate" : "Weak"
      },
      {
        id: "dscr_proxy",
        label: "Debt Service Coverage Proxy",
        value: `${dscr.toFixed(2)}x`,
        rating: dscr >= 2.0 ? "Strong" : dscr >= 1.2 ? "Moderate" : "Weak"
      }
    ];
  }

  // Fallback Plantation / general:
  const gpMargin = rev > 0 ? (gp / rev) * 100 : 0;
  const de = equity > 0 ? debt / equity : 0;
  const fcf = safeNum(cash.freeCashFlow) || (safeNum(cash.operatingCashFlow) - safeNum(cash.capitalExpenditure));
  const fcfYield = equity > 0 ? (fcf / equity) * 100 : 0;

  return [
    {
      id: "gp_margin",
      label: "Gross Profit Margin Integrity",
      value: `${gpMargin.toFixed(1)}%`,
      rating: gpMargin >= 25 ? "Strong" : gpMargin >= 10 ? "Moderate" : "Weak"
    },
    {
      id: "de_ratio",
      label: "Debt-to-Equity Balance",
      value: `${de.toFixed(2)}x`,
      rating: de <= 0.6 ? "Strong" : de <= 1.5 ? "Moderate" : "Weak"
    },
    {
      id: "fcf_yield",
      label: "Free Cash Flow Yield on Equity",
      value: `${fcfYield.toFixed(1)}%`,
      rating: fcfYield >= 8 ? "Strong" : fcfYield >= 3 ? "Moderate" : "Weak"
    }
  ];
}

/**
 * Calculates the final Company Quality Score and Investment Quality Score (0-100)
 */
export function calculateScoring(report: CompanyReport, sector: string): ScoringSummary {
  const c8 = calculateCore8Metrics(report);
  const secMetrics = calculateSectorMetrics(report, sector);

  // 1. Company Quality Score calculations
  let qualityScore = 0;

  // ROIC (max 30 pts)
  if (c8.roic >= 15) qualityScore += 30;
  else if (c8.roic >= 8) qualityScore += 20;
  else if (c8.roic >= 3) qualityScore += 10;

  // FCF Margin (max 25 pts)
  if (c8.fcfMargin >= 12) qualityScore += 25;
  else if (c8.fcfMargin >= 6) qualityScore += 15;
  else if (c8.fcfMargin >= 0) qualityScore += 5;

  // Altman Z-Score (max 25 pts)
  if (c8.altmanZScore >= 2.9) qualityScore += 25;
  else if (c8.altmanZScore >= 1.2) qualityScore += 15;
  else if (c8.altmanZScore >= 0.5) qualityScore += 5;

  // Net Debt to EBITDA (max 20 pts)
  if (c8.netDebtToEbitda <= 1.5) qualityScore += 20;
  else if (c8.netDebtToEbitda <= 3.5) qualityScore += 10;
  else if (c8.netDebtToEbitda <= 5.0) qualityScore += 5;

  // 2. Investment Quality Score calculation
  // Quality Score counts 60%. Valuation metrics count 40%.
  let valuationScore = 0;
  
  // Try to parse or use PE, Dividend Yield, and FCF Yield
  const pe = safeNum(report.Financials.ratios?.peRatio);
  const fcfY = c8.fcfMargin * 0.8; // conservative proxy based on cash flow margin
  
  if (pe > 0 && pe <= 15) valuationScore += 20;
  else if (pe > 15 && pe <= 28) valuationScore += 12;
  else if (pe > 28) valuationScore += 4;
  else {
    // Fallback if details not ready
    valuationScore += fcfY >= 8 ? 20 : fcfY >= 3 ? 12 : 5;
  }

  // Dividend yield / yield score (max 20)
  const divY = safeNum(report.Financials.ratios?.dividendYield || report.Financials.advanced?.fcfYield);
  if (divY >= 5.5) valuationScore += 20;
  else if (divY >= 2.5) valuationScore += 12;
  else if (divY >= 0.5) valuationScore += 6;
  else {
    valuationScore += c8.roic >= 12 ? 15 : 6;
  }

  const companyQualityScore = Math.round(Math.min(100, Math.max(0, qualityScore)));
  const investmentQualityScore = Math.round(Math.min(100, Math.max(0, (companyQualityScore * 0.6) + (valuationScore * 0.4))));

  let recommendation: "Institutional Buy" | "Hold / Watchlist" | "Avoid / Overvalued" = "Hold / Watchlist";
  let statusColor = "amber";

  if (investmentQualityScore >= 75) {
    recommendation = "Institutional Buy";
    statusColor = "emerald";
  } else if (investmentQualityScore < 50) {
    recommendation = "Avoid / Overvalued";
    statusColor = "rose";
  }

  return {
    companyQualityScore,
    investmentQualityScore,
    recommendation,
    statusColor,
  };
}
