# FinCore — Improvement, Upgrade & Implementation Roadmap

*Last updated: 2026-07-28*

---

## 🔴 PHASE 0: Critical Bug Fixes (Do First — Breaks Correctness)

### 0.1 — Bank ROIC / "Creating vs Destroying Value" Fix
- **File:** `src/fincore_engine.ts` — `calculateCore8Metrics()`
- **Action:** When sector = `FINANCIAL_SERVICES`, use `ROE * (1 - effectiveTaxRate)` as ROIC proxy instead of NOPAT/IC formula. Compare against a bank-specific cost of equity (~10.5%) rather than WACC 8.5%.
- **Impact:** Fixes misclassification for PBB, CIMB, and any other bank. High-ROE banks will correctly show "Creating Value."

### 0.2 — Altman Z-Score Invalid for Banks/REITs Fix
- **File:** `src/fincore_engine.ts` — `calculateCore8Metrics()`
- **Action:** Add sector guard: if `FINANCIAL_SERVICES`, skip Altman Z-Score and substitute with `ROA Momentum` score (ROA / industry ROA benchmark). Add 15 neutral points to quality score. For HEALTHCARE, apply modified Altman Z' model (replaces Equity/Liabilities with Book Value of Equity/Total Liabilities).

### 0.3 — Manual XML Data Fixes (Do immediately)
- `PUBLIC_BANK_BERHAD_2025.xml` → change `<StoredFileName>` from `.md` to `.pdf`
- `CIMB_GROUP_HOLDINGS_BERHAD_2025.xml` → change `<Currency>MYR '000</Currency>` to `<Currency>MYR</Currency>` and add `<Period>annual</Period>`
- `SUNWAY_HEALTHCARE_HOLDINGS_BERHAD_2026.xml` → change `<Currency>MYR '000</Currency>` to `<Currency>MYR</Currency>`
- `PUBLIC_BANK_BERHAD_2025.xml` → add `<Period>annual</Period>`

### 0.4 — TELECOMMUNICATIONS Sector Support
- **File:** `src/constants.ts`, `src/fincore_engine.ts`
- **Action:** Add `"TELECOMMUNICATIONS"` to `BURSA_SECTORS`. Add a telco-specific `calculateSectorMetrics` block with: EBITDA Margin (%), CapEx Intensity (CapEx/Revenue %), Net Debt/EBITDA, Subscriber ARPU proxy.
- **Action:** Re-tag Maxis Berhad XMLs from `<Sector>TECHNOLOGY</Sector>` to `<Sector>TELECOMMUNICATIONS</Sector>`.

### 0.5 — Dividend Payout Ratio Warning Badge
- **File:** `src/components/DashboardView.tsx`
- **Action:** When rendering a financial ratio row for `dividendPayoutRatio`, if value > 1.5, render an amber `⚠️` warning badge with tooltip: "Payout ratio exceeds net profit — may include special dividends or capital returns from IPO proceeds."

### 0.6 — Dashboard Quarterly Empty-State Message
- **File:** `src/components/DashboardView.tsx`
- **Action:** When `selectedPeriod === "quarterly"` AND filtered records are empty, render an explicit empty-state card: "No quarterly reports found for this sector and year. Upload condensed interim filings (Q1–Q4) to enable this view."

---

## 🟠 PHASE 1: Core Engine & Data Improvements

### 1.1 — Integrated AI Extraction via Gemini/OpenAI API Key
*This is the most transformative improvement. Currently the user must manually copy a prompt, paste it into an external AI, copy the JSON, and paste it back.*

**Goal:** Add an "Auto-Extract with AI" button in the Upload View that sends the converted markdown to an LLM API and automatically parses the returned JSON — no copy-paste required.

**Implementation Plan:**
1. Add a `.env` variable: `VITE_GEMINI_API_KEY` (Gemini Flash recommended for low cost) or `VITE_OPENAI_API_KEY`.
2. Create `server/services/ai.service.ts`:
   - `POST /api/ai/extract` endpoint
   - Accepts: `{ markdown: string, metadata: { company, year, period, currency } }`
   - Calls Gemini `generateContent` with the prompt template
   - Returns parsed JSON or error
3. In `UploadView.tsx`, add **"Auto-Extract"** button next to "Copy Prompt":
   - On click: send markdown to `/api/ai/extract`
   - Show loading spinner with progress messages
   - Auto-populate the JSON paste area with returned result
   - Allow user to review/edit before ingesting
4. Add retry logic for malformed JSON (re-call with "fix this JSON" prompt).
5. Add token cost estimate display (optional) based on markdown character count.

**Effort:** 2–3 days | **Impact:** Eliminates the biggest UX friction in the ingest flow.

---

### 1.2 — Real-Time Share Price Integration (Bursa / Yahoo Finance)
**Goal:** Fetch live share price to compute P/E ratio, dividend yield, and market cap automatically.

**Options:**
- **Yahoo Finance (unofficial):** `https://query1.finance.yahoo.com/v8/finance/chart/{TICKER}.KL` — free, no auth needed.
- **Bursa Malaysia official API** — requires registration.
- **Alpha Vantage** — free tier 25 calls/day with API key.

Ling: We'll pick Yahoo Finance (unofficial). This is good enough for our purpose. We should also make it flexible enough, if we change API from yahoo finance to bursa malaysia API in the future, we can do it easily. It's    important to know that the Yahoo Finance API is unofficial, so it may not be stable and may change in the future.

**Implementation Plan:**
1. Add `stockTicker` field to the XML schema and ingest form (e.g., `MAXIS.KL`, `1295.KL`).
2. Create `server/services/market.service.ts`:
   - `GET /api/market/price/:ticker` → proxy request to Yahoo Finance API
   - Cache results for 15 minutes (simple in-memory TTL cache)
   - Returns: `{ price, change, changePct, currency, lastUpdated }`
3. In `FinCoreView.tsx`, show live price badge next to company selector.
4. Auto-compute `peRatio = sharePrice / eps`, `dividendYield = dividendPerShare / sharePrice`, `marketCap = price * sharesOutstanding` if not already stored.
5. Store fetched price as optional override in the calculation but NOT in the XML (prices change daily).

**Effort:** 3–4 days | **Impact:** Fixes the Investment Quality Score valuation component (currently 0 for all companies).

---

### 1.3 — Dynamic WACC & CAPM Model
**Goal:** Replace the static `WACC = 8.5%` with a sector/company-specific cost of capital.

**Implementation Plan:**
1. Add a settings panel (in Info or FinCore view) for WACC parameters:
   - Risk-free rate (linked to MGS 10-year yield — user input or API)
   - Market risk premium (default 5.5% for Malaysia)
   - Sector beta (pre-configured per sector: Banks=0.85, Telco=0.75, Tech=1.2, REIT=0.65)
   - Company-specific leverage adjustment (optional)
2. Compute: `Ke = Rf + Beta * ERP`, `WACC = Ke * (E/(D+E)) + Kd*(1-t) * (D/(D+E))`
3. For banks, use `Ke` directly (no debt in denominator — cost of equity model).
4. Display the WACC used in the FinCore™ ROIC Spread section.

**Effort:** 2 days | **Impact:** Makes the EVA and ROIC-WACC spread analysis institutional-grade.

---

### 1.4 — Arithmetic Validation on Ingest
**Goal:** Catch AI extraction errors before they corrupt the database.

**Implementation Plan:**
1. In `server/services/storage.service.ts`, before saving, validate:
   - `grossProfit ≈ revenue - COGS` (within 5% tolerance)
   - `netProfit ≈ profitBeforeTax - taxExpense` (within 5%)
   - `totalAssets ≈ totalLiabilities + totalEquity` (balance sheet identity, within 2%)
   - `ebitda ≥ ebit` (always true if D&A ≥ 0)
2. Return validation warnings (not blocking errors) with specific mismatches.
3. Show validation result in the UI before user confirms the ingest.

**Effort:** 1 day | **Impact:** Prevents silent data corruption from hallucinated AI values.

---

### 1.5 — Reporting Scale Auto-Detection (Thousands vs Millions)
**Goal:** Detect from the report header whether figures are in RM thousands or RM millions and store a `unit` field.

**Implementation Plan:**
1. Update the AI prompt template to include a `reportingUnit` field: `"reportingUnit": "thousands"` or `"millions"`.
2. In `fincore_engine.ts`, read `reportingUnit` from metadata and apply a scale factor when comparing cross-company ratios.
3. Display reporting unit badge in Revisit Saved Records card.

**Effort:** 1 day | **Impact:** Eliminates the 1000× scale error risk for cross-company comparison.

---

### 1.6 — View by company, year and period combined
**Goal:** We can view the company's details, including market cap (by that time report) and share price (by that time point) from Yahoo Finance and from database.

**Implementation Plan:**
1. We let user choose company, year and period are filters (Button beside search bar). Year and period are linked together. We need to use "period" to fetch the correct market cap (for that time point) and share price (for that time point) from Yahoo Finance. We also need to fetch the correct market cap from database based on the year and period.
2. Users can search for company by name or ticker symbol. (Filtering)
3. Show all the metrics from the xml file in the FinCoreView.

**Effort:** 2 days | **Impact:** No separate view by choosing only the Fiscal Year or only the Period to view the company data anymore.

---

## 🟡 PHASE 2: Feature Expansion

### 2.1 — Multi-Format Export Engine (Excel & PDF)
- Export financial statements as `.xlsx` using `SheetJS` (`xlsx` npm package).
- Export FinCore™ scoring summary as a print-ready PDF using `@react-pdf/renderer`.
- Add export buttons in Dashboard (per-company statement export) and FinCore (scoring report export).

**Effort:** 4–5 days

---

### 2.2 — Human-in-the-Loop Audit Trail
- When a user edits a value in the Revisit Saved Records modal, save both the original AI value and the override value in the XML using `<value original="6812" override="6809005">6809005</value>` schema.
- Highlight manually-overridden cells in the Dashboard statements view with a subtle amber dot indicator.
- Add an "Audit History" panel in DocumentViewerOverlay.

**Effort:** 3–4 days

---

### 2.3 — Automated Currency Conversion
- Integrate `open-exchange-rates` or `exchangerate.host` (free tier) API.
- Allow user to select a display currency (MYR, USD, SGD) in Dashboard settings.
- Apply conversion to revenue/profit KPI cards for cross-border peer comparison.

**Effort:** 2 days

---

### 2.4 — Watchlist & Screener
- Add a persistent watchlist sidebar (stored in `localStorage`).
- Screener: filter all loaded companies by: sector, ROIC ≥ threshold, quality score ≥ threshold, period.
- Export screener results to CSV.

**Effort:** 3 days

---

### 2.5 — Peer Comparison Matrix (Multi-Company Side-by-Side)
- Allow user to select 2–4 companies and view side-by-side: revenue, margins, ROIC, debt ratios, scores.
- Visualise using a radar chart (Recharts `<RadarChart>`).

**Effort:** 2–3 days

---

## 🟢 PHASE 3: Performance & Architecture

### 3.1 — Code Splitting & Lazy Loading
- Implement `React.lazy()` + `Suspense` for heavy views: `UploadView`, `FinCoreView`, `NewsView`.
- This should reduce initial bundle from 1.47MB to <400KB.

### 3.2 — Delete `src/temp.tsx`
- Verify not imported. Delete.

### 3.3 — Server-Side Data Caching
- Cache parsed XML reports in memory (TTL 5 min) to avoid repeated file reads on every dashboard load.
- Add `ETag` headers to API responses for browser-level cache.

### 3.4 — Progressive Web App (PWA) Support
- Add `manifest.json` and a service worker via `vite-plugin-pwa`.
- Enable offline mode for browsing previously loaded reports.

---

## 💡 Feature Ideas (Backlog / Future Vision)

| Idea | Description | Effort |
|---|---|---|
| **Bursa Announcement Scraper** | Auto-fetch quarterly reports from Bursa.com.my by ticker code | High |
| **Earnings Calendar** | List upcoming report release dates for watched companies | Medium |
| **Management Quality Score** | NLP sentiment analysis on MD&A sections of annual reports | High |
| **Monte Carlo Valuation** | DCF with probability-weighted scenarios using FCF projections | High |
| **Multi-user / Cloud Mode** | Auth layer + cloud DB (Supabase/Firebase) to share reports | Very High |
| **Bursa API Integration** | Real-time prices directly from Bursa Malaysia feed | Medium |
| **ESG Score Module** | Map disclosures to a simple ESG rubric from annual report text | High |
| **Alert System** | Push/email alerts when a tracked company's score drops below threshold | Medium |

---

## Prioritised Implementation Order

```
PHASE 0 (Bugs)          → Do this week
├── 0.1 Bank ROIC Fix
├── 0.2 Altman Z Fix for Banks
├── 0.3 Manual XML Fixes
├── 0.4 TELECOMMUNICATIONS Sector
├── 0.5 Dividend Warning Badge
└── 0.6 Quarterly Empty State

PHASE 1 (Core Engine)   → Next 2–4 weeks
├── 1.1 AI Auto-Extract (highest UX impact)
├── 1.2 Real-Time Share Price (fixes Investment Score)
├── 1.3 Dynamic WACC
├── 1.4 Validation on Ingest
└── 1.5 Scale Auto-Detection

PHASE 2 (Features)      → 1–2 months
├── 2.1 Excel/PDF Export
├── 2.2 Audit Trail
├── 2.3 Currency Conversion
├── 2.4 Watchlist & Screener
└── 2.5 Peer Comparison Matrix

PHASE 3 (Architecture)  → Ongoing
├── 3.1 Code Splitting
├── 3.2 Delete temp.tsx
├── 3.3 Server Cache
└── 3.4 PWA Support
```

