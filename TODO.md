# FinCore — Improvement, Upgrade & Implementation Roadmap

*Last updated: 2026-09-17*

---

## 🟠 PHASE 1: Core Engine & Data Improvements

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
PHASE 1 (Core Engine)   → Next 2–4 weeks
├── 1.2 Real-Time Share Price (fixes Investment Score)
├── 1.3 Dynamic WACC
└── 1.6 Combined company/year/period view

PHASE 2 (Features)      → 1–2 months
├── 2.1 Excel/PDF Export
├── 2.2 Audit Trail
├── 2.3 Currency Conversion
├── 2.4 Watchlist & Screener
└── 2.5 Peer Comparison Matrix
```
