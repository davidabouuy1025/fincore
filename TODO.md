**TODO**

***PROBLEM***
1. It will automatically shows duplicated quarter report, but reporting period is annual. Review again "Ingest tab\Revisit saved records", and fix the issue.
  - It should show reporting period: quarterly, if the uploaded pdf is quarterly report.
  - It should show reporting period: annual, if the uploaded pdf is annual report.
2. Add this feature to the main page: what's new. Telling this new feature.
3. The shareholder matrix in last tab fincore, should be reviewed again, as we've added quarter report. 

---

### Suggestions for Improvement:

1. **Automated Currency Conversion Integration**:
   - Currently, reports are displayed in their native reported currencies (MYR, USD, CNY, JPY, EUR). Implementing an exchange rate converter API (e.g., using open-exchange-rates or currencyapi) would enable users to convert and compare financials of peer companies reporting in different currencies under a single standardized denomination.

2. **Dynamic WACC & Cost of Capital CAPM Model**:
   - The FinCore™ engine currently uses a static 8.5% benchmark cost of capital to calculate the Economic Value Added (EVA). Creating a dynamic CAPM (Capital Asset Pricing Model) calculator using sector-specific betas, risk-free interest rates, and equity risk premiums would make the EVA output institutional-grade.

3. **Human In-The-Loop Audit Trails**:
   - Keep track of the original AI/OCR parsed values alongside the user's manual review overrides in the XML structure. Highlight user-edited cells inside the matrix dashboard and tables to build an audit history of data edits.

4. **Multi-Format Export Engine**:
   - Add export buttons to download statements (Overview, Matrix, Comparison) and the FinCore™ executive scoring report as standard Excel spreadsheets (`.xlsx`) or professional print-ready PDFs. 

---

## Improve

> Items discovered during live review session (2026-07-23) — these are actionable improvements to make the system more accurate or user-friendly.

1. **Fix Cumulative Quarterly Scaling Factor** *(Critical — Calculation Error)*:
   - In `src/fincore_engine.ts`, the `factor = 4` is applied for all `q1/q2/q3/q4` periods. This is wrong for Q2 (6-month cumulative), Q3 (9-month cumulative), and Q4 (12-month cumulative) reports from Bursa Malaysia.
   - Fix: use period-aware factors `{ q1: 4, q2: 2, q3: 4/3, q4: 1 }` and document clearly in the AI ingest prompt whether figures should be single-quarter or cumulative.

2. **Prefer Stored ``ratios.roic`` Over Engine Recalculation** *(Medium — CIMB/Bank ROIC Discrepancy)*:
   - The engine's invested capital formula uses `nonCurrentLiabilities` as a fallback for banks, which inflates it with customer deposits. The AI-calculated ROIC in the XML is more accurate.
   - Fix: in `fincore_engine.ts`, use `safeNum(rat.roic) * 100` if non-zero, and only fall back to NOPAT/IC engine calculation when the stored ratio is missing.

3. **Normalize Currency Field on Save** *(Low — "MYR '000" vs "MYR")*:
   - Some XML records store `Currency = "MYR '000"` due to verbatim AI extraction. Normalize to clean 3-letter ISO codes (MYR, USD, CNY) in `storage.service.ts` or `server/utils.ts::detectCurrency`.

4. **Add `dividendsPaid` to `FIELD_LABELS` in `constants.ts`** *(Low — Missing Label)*:
   - The field `dividendsPaid` is saved under `cashFlow` in some quarterly XML files (PBB Q2 2024) but is not declared in `FIELD_LABELS`, causing it to display without a human-readable label in the statements view.

5. **Handle Missing Cash Flow Gracefully in FCF Scoring** *(Medium — Quarterly Reports)*:
   - Quarterly condensed interim reports often don't include a cash flow statement. The engine currently scores FCF Margin = 0% which penalizes the quality score unfairly.
   - Fix: if `period` is quarterly AND both `freeCashFlow` and `operatingCashFlow` are 0, skip the FCF score component and show a UI disclaimer in FinCore.

6. **Server-Side PDF Filename Fallback** *(Low — .md Extension Bug)*:
   - The PBB 2025 annual record has `StoredFileName = PUBLIC_BANK_BERHAD_2025.md` due to a pre-fix ingest. The PDF endpoint should try replacing `.md` with `.pdf` as a fallback if the primary file is not found.

7. **Dividend Payout Ratio Anomaly Warning** *(Low — Data Quality)*:
   - Add a warning tooltip or flag in the dashboard/statements view when `dividendPayoutRatio > 1.5`, noting that this may represent a special dividend from reserves rather than sustainable earnings distribution.

8. **Dashboard Empty State When Period Filter Has No Data** *(Low — UX)*:
   - When switching to "Quarterly" on the Dashboard toggle but there are no quarterly reports loaded for the current sector/year, the view is blank with no message. Add an explicit empty state: "No quarterly reports available for this sector. Upload quarterly condensed interim filings to enable this view."