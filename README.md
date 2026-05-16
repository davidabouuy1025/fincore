# FINCORE — Bursa Malaysia Financial Intelligence System

Upload annual reports (PDF or image), extract financials automatically, and visualize side-by-side comparisons.

## Features
- **Digital PDF** parsing via `pdf-parse`
- **Scanned PDF & Image OCR** via `tesseract.js`
- **Auto-extraction** of Revenue, Net Profit, COGS, Gross Profit, Total Assets, Liabilities, Operating Cash Flow
- **Sector auto-detection** from document text
- **Bar charts** comparing companies side-by-side
- **XML archive** — persisted storage, organized by year + sector
- **AI Insights** via Zhipu AI (GLM-4) — optional
- **Ctrl+V paste** support for screenshots

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env — add ZHIPU_AI_API_KEY if you want AI insights

# 3. Start dev server
npm run dev
# Opens at http://localhost:3000
```

## Usage

1. Go to **INGEST** tab → select year and sector
2. Drop PDFs or images (or paste screenshots with Ctrl+V)
3. Click **EXECUTE_ANALYSIS**
4. View results in **DATA_MATRIX** tab
5. Click company initials or "VIEW_SOURCE" to see the original document

## AI Insights (Optional)

Sign up at [open.bigmodel.cn](https://open.bigmodel.cn) for a free Zhipu AI API key, then add it to `.env`:

```
ZHIPU_AI_API_KEY=your_key_here
```

## Notes on OCR Accuracy

For best results with scanned PDFs/images:
- Use high-resolution scans (300 DPI+)
- Ensure text is not rotated or heavily distorted
- Tables are extracted using regex patterns — financial figures directly beside labels work best

## Production Build

```bash
npm run build
NODE_ENV=production npm run preview
```
