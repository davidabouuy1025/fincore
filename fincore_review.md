# FinCore Quality Assurance & Feature Review Report

This report outlines the verification checks performed on the FinCore system, listing active features, status of testing, and identified problems/bugs with clear fix recommendations.

---

## Checked Features

| Feature / Module | Purpose | Status | Notes |
| :--- | :--- | :--- | :--- |
| **Ingest (UploadView)** | PDF/Image upload, page selection, digital/scanned PDF text extraction, OCR fallback, and structured rule-based parser. | **Pass** | Accurately parses digital text. Correctly falls back to local OCR (Tesseract / pdftoppm) for scanned documents. |
| **Matrix (DashboardView)** | Side-by-side corporate metrics comparison, financial category forms, and AI insights generation. | **Pass** | Renders dynamic comparative metrics from local XML models without issues. |
| **FinCore (FinCoreView)** | Proprietary financial health rating based on ROIC, FCF margin, Altman Z-Score, and Net Debt-to-EBITDA. | **Pass** | Mathematical scoring formulas calculate accurately. Handles null values gracefully. |
| **News (NewsView)** | Bursa keyword tracking, RSS crawling, Jaccard terms-overlap deduplication, and raw web article scraper. | **Pass** | *Note: Default clicks array fix applied to prevent rendering crashes.* |
| **Info (InfoView)** | Interactive system welcome overview and magnetic elements. | **Pass** | Renders without animations blocks or compilation issues. |

---

## Identified Issues & Technical Bugs

### 1. Missing `fcfYield` (Free Cash Flow Yield) in Edit Mode
* **Location:** [src/constants.ts:208](file:///e:/GitHub/Fincore/src/constants.ts#L208)
* **Severity:** Medium
* **Description:** 
  The frontend dictionary maps the `fcfYield` field to the category `"advanced text-right"` instead of `"advanced"`.
  When editing a document in `DocumentViewerOverlay.tsx`, the fields are dynamically filtered to check if their category strictly matches `"advanced"`. Because of this mismatch:
  ```typescript
  return dictEntry && (dictEntry[1] as any).category === category;
  ```
  `fcfYield` is excluded from the edit form and cannot be manually modified by users.
* **Backend Status:** The backend correctly uses `"advanced"` as the category inside [dictionary.ts](file:///e:/GitHub/Fincore/server/config/dictionary.ts#L339-L342), which creates a schema mismatch.
* **Fix Recommendation:**
  Change `fcfYield` category in `src/constants.ts` to `"advanced"`:
  ```typescript
  fcfYield: { category: "advanced" },
  ```

---

### 2. Typo in NewsView Background Variable
* **Location:** [src/components/NewsView.tsx:692](file:///e:/GitHub/Fincore/src/components/NewsView.tsx#L692)
* **Severity:** Low (Styling)
* **Description:** 
  The card component uses the CSS class `bg-[var(--color-hacker-univeresal-bckgrd)]`.
  However, in [index.css:49](file:///e:/GitHub/Fincore/src/index.css#L49), the actual semantic token is spelled `--color-hacker-universal-bckgrd`. The typo breaks the styling reference, resulting in transparent or default fallback backgrounds instead of the themed background.
* **Fix Recommendation:**
  Correct the spelling:
  ```diff
  - <div className="bg-[var(--color-hacker-univeresal-bckgrd)] ...">
  + <div className="bg-[var(--color-hacker-universal-bckgrd)] ...">
  ```

---

### 3. Missing Local Environment Config (`.env` File)
* **Location:** Root directory (only `.env.example` exists)
* **Severity:** Medium (Blocks AI functionality)
* **Description:** 
  The project does not contain a `.env` file. Attempting to click "AI Insights" or "AI Re-analyze" triggers a backend error:
  `GEMINI_API_KEY environment configuration missing.`
* **Fix Recommendation:**
  Ensure you copy `.env.example` to `.env` and configure your API keys:
  ```bash
  cp .env.example .env
  ```
  Then populate `GEMINI_API_KEY="YOUR_KEY"` inside the file.

---

### 4. HMR Connection Loop Warns in Middleware Dev Mode
* **Location:** Dev environment logs
* **Severity:** Low (Developer Experience)
* **Description:**
  When running the dev server (`tsx server.ts`), Vite is instantiated in `middlewareMode: true` but doesn't pass WebSocket/HMR upgrade requests. The browser console repeatedly logs:
  `[vite] server connection lost. Polling for restart...`
  This fills the browser console with warning noise, though it doesn't break the application functionality itself.
* **Fix Recommendation:**
  Set HMR port config explicitly in `vite.config.ts` or bind the dev server websocket server upgrades to the Express app.
