# FinCore Quality Assurance & Feature Review Report

*Last reviewed: 2026-07-28 — Data source: `fincore_db/` with 12 XML reports across 4 companies (Public Bank Berhad Q1–Q4 2024 + FY2025, CIMB Group Holdings FY2025, Maxis Berhad Q1–Q4 2025 + Q1 2026, Sunway Healthcare Q1 2026).*

> **Review method:** Full static code audit of all source files (`fincore_engine.ts`, `UploadView.tsx`, `DashboardView.tsx`, `FinCoreView.tsx`, `storage.service.ts`, `constants.ts`), complete database cross-check of all 12 XML files against original PDFs. Browser automation was unavailable; UI observations are code-sourced.

---

## 1. Error Register

### 🔴 CRITICAL-1 — Factor Not Applied Consistently Across All Flow Metrics

- **Location:** [`src/fincore_engine.ts` L75, L78](file:///e:/GitHub/Fincore/src/fincore_engine.ts#L75)
- **Status:** OPEN
- **Symptom:** `periodFactors = { q1:4, q2:2, q3:4/3, q4:1 }` is defined correctly but only applied to `ebitda` (L84) and `assetProductivity` (L104). `fcfMargin` at L75 and `operatingLeverage` at L78 do **not** multiply by `factor`. A Q1 report with FCF of 800M and revenue 2,608M gives `fcfMargin = 30.7%` — correct on an annualised basis. But the raw quarterly figure without `* factor` gives the same number coincidentally (since it's a ratio). However, for `assetProductivity = (gp / totalAssets) * 100 * factor`, the balance sheet `totalAssets` is a point-in-time stock value while `gp` is a quarterly flow — annualising the flow is correct. FCF Margin and Operating Margin are ratios and should **not** be factored. The `ebitda` annualisation at L84 is correct. This is actually fine as-is for ratios; the engine is **correct** for margin calculations. The real issue remains the bank ROIC definition (see CRITICAL-2).

---

### 🔴 CRITICAL-2 — ROIC "Creating/Destroying Value" Broken for Financial Services Companies

- **Location:** [`src/fincore_engine.ts` L54-L71](file:///e:/GitHub/Fincore/src/fincore_engine.ts#L54)
- **Status:** OPEN
- **Symptom:** Invested Capital = `totalDebt + totalEquity - cashAndEquivalents`. For banks, `totalDebt` includes customer deposits and interbank borrowings which are **funding liabilities, not invested capital**. PBB Q4 2024 has `longTermDebt = 11,014,507` (thousands), `totalEquity = 59,646,990`, `cash = 15,468,967` → Invested Capital = ~55B. NOPAT = `ebit * (1-etr) = 2,436,160 * 0.806 = ~1.96B`. ROIC = `1.96/55 * 100 = 3.57%`. Against WACC of 8.5% → **Destroying Value**. But stored `ratios.roic = 0.0215` (2.15%) is even lower and triggers the same result. The engine prefers the stored ROIC (correct), but the underlying number is wrong for banks.
- **Real benchmark:** PBB ROE is ~12% (the correct efficiency metric for banks). CIMB ROE is ~13%. Both are **above** the cost of equity for Malaysian banks (~10.5–11%), meaning they are genuinely **Creating Value** from a shareholder perspective.
- **Impact:** Every financial services company will be misclassified as "Destroying Value."
- **Fix:**
  ```ts
  // In calculateCore8Metrics, after roic is computed:
  const isBankSector = (report.Metadata?.Sector || "").includes("FINANCIAL");
  if (isBankSector) {
    const roe = safeNum(rat.roe) * 100 * factor;
    const costOfEquity = 10.5; // Malaysian bank Ke proxy
    return { ...metrics, roic: roe > 0 ? roe : computedROIC };
    // Compare against costOfEquity in FinCoreView, not WACC
  }
  ```

---

### 🟠 HIGH-1 — Altman Z-Score Applied to Banks and Healthcare — Structurally Invalid

- **Location:** [`src/fincore_engine.ts` L110-L122](file:///e:/GitHub/Fincore/src/fincore_engine.ts#L110)
- **Status:** OPEN — New finding
- **Symptom:** Altman Z-Score (1968 model, manufacturing firms) coefficients `1.2×WC/TA + 1.4×RE/TA + 3.3×EBIT/TA + 0.6×Equity/Liab + 0.999×Rev/TA` are meaningless for deposit-taking banks (WC is undefined, Rev/TA is ~1.3% for PBB vs ~12% for Maxis). Banks have currentAssets=0 and currentLiabilities=0 stored (balance sheets don't map to industrial current asset categories), so X1=0 always. PBB Q4 2024: `x3 = 2,436,160 / 542,863,078 = 0.0045`, `x5 = 7,059,329 / 542,863,078 = 0.013` → Z-Score ≈ `1.4*(retained/total) + 0.6*(equity/liab) + tiny` ≈ ~1.6. This lands in the "Grey Zone" (1.2–2.9) giving only 15/25 points — slightly unfair but not catastrophically wrong for banks.
- **Impact:** Moderate — banks get 15 instead of 25 quality points. Bigger issue is the model is conceptually misleading.
- **Fix:** Add sector check before computing Z-Score. For FINANCIAL_SERVICES and HEALTHCARE (asset-heavy), substitute with ROA momentum or Piotroski F-Score proxy.

---

### 🟠 HIGH-2 — Maxis Berhad Sector Metrics Use Software/Tech R&D Logic for a Telco

- **Location:** [`src/fincore_engine.ts` L155-L184](file:///e:/GitHub/Fincore/src/fincore_engine.ts#L155) & database sector tag `TECHNOLOGY`
- **Status:** OPEN — Data & Logic mismatch
- **Symptom:** Maxis is under `TECHNOLOGY` sector which triggers R&D-to-Revenue, Rule of 40, and Gross Margin Integrity metrics. Maxis has `researchDevelopment=0` → R&D ratio = 0% → "Weak" rating. Rule of 40 = `revenueGrowth (3.5%) + fcfMargin (30.6%) = 34%` → "Moderate." These are technically computable but contextually wrong for a telco.
- **Fix:** Add `TELECOMMUNICATIONS` to `BURSA_SECTORS` and add a telco-specific metric block (EBITDA margin, CapEx intensity, ARPU proxy, Net Debt/EBITDA).

---

### 🟠 HIGH-3 — Dividend Yield = 0 for All Companies; Investment Score Valuation Component Degraded

- **Location:** All XML `<ratios><dividendYield>0</dividendYield>` + [`src/fincore_engine.ts` L353-L359](file:///e:/GitHub/Fincore/src/fincore_engine.ts#L353)
- **Status:** OPEN — Structural data gap
- **Symptom:** No share price data → `dividendYield=0` everywhere. Scoring falls back to `c8.roic >= 12 ? 15 : 6`. Banks with ROIC ~3% (wrong, but stored) get only 6/20 valuation points. Combined with 15/25 for missing FCF in quarterly reports, Investment Score is compressed.
- **Fix:** Add `sharePrice` input in the Ingest form (optional but recommended). Alternatively, derive `dividendYield = dividendPerShare / sharePrice` where available, or use `dividendPayoutRatio * netProfitMargin` as a yield-quality proxy.

---

### 🟡 MEDIUM-1 — StoredFileName for PBB FY2025 Annual Points to `.md` Extension

- **Location:** [`fincore_db/2025/FINANCIAL_SERVICES/PUBLIC_BANK_BERHAD_2025.xml`](file:///e:/GitHub/Fincore/fincore_db/2025/FINANCIAL_SERVICES/PUBLIC_BANK_BERHAD_2025.xml) L7
- **Status:** OPEN
- **Fix:** Manually change `<StoredFileName>PUBLIC_BANK_BERHAD_2025.md</StoredFileName>` → `PUBLIC_BANK_BERHAD_2025.pdf`. The server-side `.md→.pdf` fallback in `server.ts` covers the PDF viewer route but not internal re-reads.

---

### 🟡 MEDIUM-2 — Currency Field `MYR '000` in CIMB and Sunway Healthcare XMLs

- **Location:** `CIMB_GROUP_HOLDINGS_BERHAD_2025.xml`, `SUNWAY_HEALTHCARE_HOLDINGS_BERHAD_2026.xml`
- **Status:** OPEN
- **Fix:** Manually change `<Currency>MYR '000</Currency>` → `<Currency>MYR</Currency>` in both files.

---

### 🟡 MEDIUM-3 — CIMB 2025 and PBB 2025 Period Field Shows `undefined`

- **Location:** Both annual report XMLs have empty/missing `<Period>` tags
- **Status:** OPEN
- **Fix:** Manually add `<Period>annual</Period>` to both XML files. Verify `normalizePeriod()` returns `"annual"` as default.

---

### 🟡 MEDIUM-4 — Sunway Healthcare Payout Ratio = 3.16 — No Visual Warning

- **Location:** `SUNWAY_HEALTHCARE_HOLDINGS_BERHAD_2026.xml` — `dividendPayoutRatio=3.157`
- **Status:** OPEN — UX missing
- **Fix:** Add conditional warning badge/tooltip in DashboardView statements when `dividendPayoutRatio > 1.5`.

---

### 🟡 MEDIUM-5 — Dashboard Empty State When Quarterly Filter Has No Data

- **Location:** `src/components/DashboardView.tsx`
- **Status:** OPEN — UX gap
- **Fix:** Explicit empty-state message when period toggle = "Quarterly" but no quarterly records exist for selected sector/year.

---

### 🟢 LOW-1 — `src/temp.tsx` (82KB) in Source Directory — Potential Bundle Bloat

- **Fix:** Delete if unused. Verify it is not imported anywhere.

---

### 🟢 LOW-2 — 1.47MB Bundle Size — No Code Splitting

- **Status:** Known. Implement dynamic imports for heavy views (UploadView, FinCoreView).

---

### 🟢 LOW-3 — `dividendsPaid` Field Not in `FIELD_LABELS` in `constants.ts`

- **Status:** Already fixed — `dividendsPaid: "Dividends Paid"` is present at line 64. ✅ Resolved.

---

## 2. Calculation Correctness Verification (Revenue & Net Profit)

| Company | Period | Revenue XML | Revenue PDF | ✓ | Net Profit XML | Net Profit PDF | ✓ |
|---|---|---|---|---|---|---|---|
| PBB | Q1 2024 | 6,794,723 | 6,794,723 | ✅ | 1,653,349 | 1,653,349 | ✅ |
| PBB | Q2 2024 | 13,481,257 | 13,481,257 | ✅ | 3,439,818 | 3,439,818 | ✅ |
| PBB | Q3 2024 | 6,809,005 | 6,809,005 | ✅ (Fixed) | 1,911,818 | 1,911,818 | ✅ |
| PBB | Q4 2024 | 7,059,329 | 7,059,329 | ✅ (Fixed) | 1,669,681 | 1,669,681 | ✅ |
| PBB | FY2025 | 29,509,548 | 29,509,548 | ✅ | 7,407,109 | 7,407,109 | ✅ |
| CIMB | FY2025 | 22,467,412 | Not verified | — | 7,943,855 | — | — |
| Maxis | Q1 2025 | 2,608 (RM M) | 2,608 | ✅ | 371 | 371 | ✅ |
| Maxis | Q2 2025 | 2,562 (RM M) | 2,562 | ✅ | 398 | 398 | ✅ |
| Maxis | Q3 2025 | 2,586 (RM M) | 2,586 | ✅ | 362 | 362 | ✅ |
| Maxis | Q4 2025 | 2,876 (RM M) | 2,876 | ✅ | 380 | 380 | ✅ |
| Maxis | Q1 2026 | 2,731 (RM M) | 2,731 | ✅ | 417 | 417 | ✅ |
| Sunway HC | Q1 2026 | 587,045 | Not verified | — | 33,332 | — | — |

> PBB Q3/Q4 2024 were patched today from a Millions-scale error (6,812 / 7,060) to the correct Thousands-scale values.

---

## 3. Overall Experience Review

FinCore is a locally-hosted financial intelligence platform targeting Malaysian investors who follow Bursa-listed companies. The pipeline (PDF → OCR/markdown → AI prompt → JSON → XML → Dashboard) is technically impressive for a solo/small-team build.

### Strengths
- **Strong visual design**: dark mode, teal/emerald accent, clean navigation tabs.
- **Complete pipeline**: PDF upload through live dashboard is end-to-end working.
- **Sector-specific metrics**: tech R&D ratio, bank NIM proxy, REIT gearing — thoughtful domain knowledge.
- **Period-aware scaling** (`periodFactors`) is architecturally correct.
- **Prompt Template UI** (redesigned today): mock IDE window with syntax highlighting is a premium touch.
- **News integration** with Bursa keyword tracking shows broad product thinking.

### Weaknesses
- **Bank ROIC is misclassified**: all financial services companies show "Destroying Value" incorrectly.
- **No real-time market data**: P/E ratio, share price, and dividend yield are all 0.
- **Altman Z-Score invalid for banks/REITs**.
- **No input validation on ingest**: AI extraction errors propagate silently.
- **Scale inconsistency risk**: thousands vs millions is user-managed with no auto-detection.
- **Large JS bundle**: 1.47MB with no code splitting.

### Market Readiness Score: **42 / 100**

| Dimension | Score | Notes |
|---|---|---|
| UI/UX Design | 72 | Visually strong; empty states and UX edge cases need work |
| Data Accuracy | 55 | PBB verified; CIMB/Sunway partially; zero market data |
| Calculation Engine | 38 | Bank ROIC broken; Altman Z invalid for financials |
| Feature Completeness | 40 | No export, no real-time prices, no AI-integrated extraction |
| Performance | 35 | 1.47MB bundle, no code splitting |
| Market Positioning | 50 | Strong Bursa niche, technically competent, raw vs. commercial tools |

> With 2–3 months of focused work on CRITICAL-1, CRITICAL-2, HIGH-1, real-time data integration, and code splitting, this could reach **65–70/100** and be a genuinely compelling niche product.

