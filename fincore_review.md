# FinCore Quality Assurance & Feature Review Report

*Last reviewed: 2026-07-23 — Data source: `fincore_db/` with 5 real XML reports across 3 companies (Public Bank Berhad Q1/Q2 2024, Public Bank Berhad 2025, CIMB Group Holdings 2025, Sunway Healthcare Holdings 2026).*

---

## Checked Features

| Feature / Module | Purpose | Status | Notes |
| :--- | :--- | :--- | :--- |
| **Ingest (UploadView)** | PDF upload, page selection, markdown conversion, AI prompt builder, JSON ingest. | **Pass** | Period/Currency/Year selectors appear and auto-populate from parse suggestion. |
| **Revisit Saved Records** | Browse, edit, and delete saved XML records. | **Pass** | Period and currency are now correctly shown in each saved record card. |
| **Dashboard (DashboardView)** | KPI cards, charts, company history, comparison tab. | **Partial** | Annual/Quarterly toggle works, but edge case: switching to Quarterly while no quarterly data is loaded in the current sector/year yields an empty view without an explicit empty-state message. |
| **FinCore (FinCoreView)** | Core 8 metrics, scoring, peer comparison, ROIC spread trajectory. | **Partial** | Company/version selectors work; dynamic ROIC spread trajectory now uses real data. Several calculation issues identified below. |
| **News (NewsView)** | Bursa keyword tracking, RSS crawl, deduplication. | **Pass** | Renders without crash. |
| **Info (InfoView)** | Landing page, What's New section. | **Pass** | Quarterly report analysis feature listed in What's New. |
| **Server Logger** | Structured log to `fincore_db/server.log`. | **Pass** | File is created and populated on API hits. |

---

## Identified Calculation Errors

### 1. CRITICAL: Cumulative Quarterly Revenue Inflated by Wrong Scale Factor

- **Location:** [`src/fincore_engine.ts` L60-L100](file:///e:/GitHub/Fincore/src/fincore_engine.ts#L60-L100)
- **Severity:** High — Produces incorrect ROIC, Asset Productivity, and EBITDA for Q2, Q3, Q4 reports
- **Root Cause:**
  The engine blindly applies `factor = 4` to all quarterly period tags (q1, q2, q3, q4).
  However, Q2 reports from Bursa Malaysia contain CUMULATIVE 6-month income statement figures (not a single-quarter slice). Multiplying by 4 to annualize a 6-month revenue would overstate annualized performance by 2x.

  Manual verification - Public Bank Berhad Q2 2024:
  - Revenue = 13,481,257 (cumulative H1, i.e., 6 months)
  - Applying factor 4: annualized revenue = 53,924,028
  - Actual 2025 full-year revenue = 29,509,548 -> 1.83x overstatement

  What Bursa quarterly filings actually contain:
  - q1 = 3-month figures -> correct factor: x4
  - q2 = 6-month cumulative figures -> correct factor: x2
  - q3 = 9-month cumulative figures -> correct factor: x(4/3)
  - q4 = 12-month cumulative figures -> correct factor: x1 (already full-year)

- **Fix Recommendation:**
  Change `factor` in `fincore_engine.ts` to use period-aware scaling:
  `	ypescript
  const periodFactors: Record<string, number> = { q1: 4, q2: 2, q3: 4/3, q4: 1, annual: 1 };
  const factor = periodFactors[period] ?? 1;
  `
  Also, the prompt template must clarify whether the AI should always report quarter-only figures or cumulative figures when ingesting Q2/Q3/Q4 reports.

---

### 2. HIGH: Cash Flow Missing in Quarterly Condensed Reports — FCF Margin = 0%

- **Location:** [`src/fincore_engine.ts` L70-L71](file:///e:/GitHub/Fincore/src/fincore_engine.ts#L70-L71)
- **Severity:** Medium — FCF Margin appears as 0.0% for quarterly reports, skewing quality score downward
- **Root Cause:**
  Malaysian quarterly reports (condensed interim financial statements) typically do NOT publish a full cash flow statement. PBB Q1 2024 and Q2 2024 both have operatingCashFlow=0 and freeCashFlow=0.
  The engine scores FCF Margin = 0 which contributes 0 pts to the quality score, artificially lowering it.

- **Fix Recommendation:**
  If period is quarterly AND freeCashFlow=0 AND operatingCashFlow=0, skip FCF Margin from quality scoring (use a neutral score) rather than penalizing. Also add a UI disclaimer in the FinCore card: "Cash flow data not available for quarterly condensed interim reports."

---

### 3. MEDIUM: ROIC Discrepancy Between Engine Calculation and Stored XML Ratios

- **Location:** [`src/fincore_engine.ts` L67](file:///e:/GitHub/Fincore/src/fincore_engine.ts#L67) vs. XML `<ratios><roic>`
- **Severity:** Medium — Produces incorrect value-creation/destruction judgement
- **Root Cause:**
  The engine uses `longTermDebt || nonCurrentLiabilities` as a fallback when computing invested capital. For banks, `nonCurrentLiabilities` includes customer deposits (hundreds of billions), massively inflating invested capital and deflating ROIC.

  CIMB 2025 example:
  - Engine computed ROIC ~6.81% (ltDebt=42.6B, bonds=30.3B) -> shows Destroying Value
  - XML stored `<roic>0.093155894</roic>` = 9.32% (AI used tighter IC definition) -> above WACC

- **Fix Recommendation:**
  The FinCore engine should prefer `ratios.roic` stored in XML (already AI-verified) over its own recalculation if available and non-zero:
  `	ypescript
  const storedROIC = safeNum(rat.roic) * 100;
  const roic = storedROIC !== 0 ? storedROIC * factor : (investedCapital > 0 ? (nopat / investedCapital) * 100 * factor : 0);
  `

---

### 4. MEDIUM: Dividend Payout Ratio > 3.0 for Sunway Healthcare — Suspicious Value

- **Location:** `fincore_db/2026/HEALTHCARE/SUNWAY_HEALTHCARE_HOLDINGS_BERHAD_2026.xml` L88
- **Severity:** Medium — Data quality / parsing concern
- **Root Cause:**
  XML stores `dividendPayoutRatio=3.157296292` and `retentionRatio=-2.157296292`.
  A payout ratio of 3.16 means dividends paid are 316% of net profit.
  Cross-check: totalDividendPaid=105,239 vs. netProfit=33,332 -> ratio=3.16.
  This is plausible for a newly listed company paying out a special dividend from reserves (IPO proceeds), but is anomalous and can confuse users.

- **Fix Recommendation:**
  Add a validation warning in the dashboard if `dividendPayoutRatio > 1.5`: flag with a tooltip note: "Payout ratio exceeds net profit — may include special dividends or capital returns from reserves."

---

### 5. LOW: Currency Field Stored as "MYR '000" Instead of Clean "MYR"

- **Location:** PBB 2025, CIMB 2025, Sunway 2026 XML files, `<Currency>` field
- **Severity:** Low — Display inconsistency
- **Root Cause:**
  The AI extracted the currency unit description from the report header ("RM '000") and saved it verbatim as `MYR '000`. Newer Q1/Q2 2024 records correctly store just `MYR`.
  The Currency dropdown UI only shows values like MYR, USD, CNY, etc., so the raw "MYR '000" value may display incorrectly in revisit cards.

- **Fix Recommendation:**
  In `storage.service.ts` save handler, normalize the currency field before writing:
  `	ypescript
  const normalizeCurrency = (raw: string) => raw.replace(/[^A-Z]/g, "").slice(0, 3);
  `
  Or add "MYR '000" normalization in `detectCurrency` in `server/utils.ts`.

---

### 6. LOW: StoredFileName for PBB 2025 Annual Points to .md Extension

- **Location:** `fincore_db/2025/FINANCIAL_SERVICES/PUBLIC_BANK_BERHAD_2025.xml` L7
- **Severity:** Low — PDF preview will fail for this record
- **Root Cause:**
  The StoredFileName is saved as `PUBLIC_BANK_BERHAD_2025.md` instead of `.pdf`. This was saved before the `mdUploadedStoredFileName` override fix was applied.
  When the user clicks Preview PDF on this record, the PDF viewer will request the `.md` file which is not a PDF and will fail silently.

- **Fix Recommendation:**
  Manually correct the XML `<StoredFileName>PUBLIC_BANK_BERHAD_2025.pdf</StoredFileName>`.
  Also apply a server-side normalization fallback in the PDF serving endpoint: if the requested file is not found, try replacing `.md` with `.pdf`.

---

## Parsing / Ingestion Observations

### 7. INFO: Q1 2024 PBB — Depreciation & Amortization Both Zero

- `depreciation=0` and `amortization=0` in Q1 report.
- Banking quarterly condensed statements typically omit D&A line items.
- Engine uses EBITDA = EBIT + 0 + 0, which is technically correct for this case.
- No fix needed. The EBITDA in XML is also set equal to EBIT (correct).

### 8. INFO: Q2 2024 PBB — Cash Flow Section All Zeros Except dividendsPaid

- `operatingCashFlow`, `investingCashFlow`, `freeCashFlow`, `capitalExpenditure` all = 0.
- Only `dividendsPaid = 1,941,069` is populated.
- This is expected for a condensed interim 6-month filing. No fix needed for data.
- The `dividendsPaid` field is stored under `cashFlow` but is NOT declared in `FIELD_LABELS` in `src/constants.ts` — it will not display with a label in the Dashboard statements view.

### 9. INFO: CIMB 2025 — shortTermInvestments = 230,158,000 (30% of Total Assets)

- For a bank, this likely represents securities held for trading / financial assets at fair value. The AI has categorized them as short-term investments, which is acceptable.
- However, this inflates the `investedCapital` deduction (cash + STI) and under-reports ROIC. Same root cause as Issue #3 above.

---

## Previously Identified Issues (Status Update)

| Issue | Prior Status | Current Status |
| :--- | :--- | :--- |
| Missing `fcfYield` category mismatch in `constants.ts` | Reported | **Still open** — verify it renders in edit modal |
| HMR polling warning in dev console | Reported | **Still present** — low priority |
| `.env` file missing for AI key | Reported | **User responsibility** — documented |
| NewsView `clicks` array crash | Fixed | Resolved |
| Favicon import crash | Fixed | Resolved |
| ROA/ROE showing 0.0 in columns | Fixed | Resolved |
| Period not shown in Revisit Saved Records cards | Fixed | Resolved |
| Period/Currency not restored when editing saved record | Fixed | Resolved |
| Annual/Quarterly toggle missing in Dashboard | Fixed | Resolved |
| FinCore missing company/version selectors | Fixed | Resolved |
| ROIC spread trajectory was mocked | Fixed | Real data now used |
