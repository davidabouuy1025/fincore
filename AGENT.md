# AGENT.md — FinCore

Guidance for AI coding agents working in this repository.

## What this is

FinCore is a Bursa Malaysia financial-intelligence tool. Users upload annual
report PDFs/images, the app OCRs and extracts key financial metrics (via
regex heuristics and/or the Gemini API), stores them as flat-file XML "db"
records, and renders dashboards / cross-company comparisons / a proprietary
"FinCore™" scoring model.

Single Node process: `server.ts` runs Express, which either mounts Vite in
middleware mode (dev) or serves the built `dist/` SPA (prod). There is no
separate frontend dev server — `npm run dev` starts everything on
`http://localhost:5000` (the `3000` in README is stale).

## Stack

- Frontend: React 18 + TypeScript, Vite 8, Tailwind CSS 4, Recharts, Framer
  Motion (`motion` pkg), lucide-react icons, vite-plugin-pwa.
- Backend: Express 4 (TypeScript via `tsx` in dev, bundled with `esbuild` for
  prod), Multer for uploads, `pdf-parse` + `pdfjs-dist` + `tesseract.js` for
  OCR/text extraction, `fast-xml-parser` for the XML data store, `@google/genai`
  for Gemini-based extraction and insights.
- Persistence: **no database** — reports are stored as XML files under
  `fincore_db/` (path configurable via `FINCORE_DB_PATH`), organized by
  year/sector, with original uploaded PDFs kept in
  `fincore_db/original_reports/`.
- No test framework is configured (no Jest/Vitest, no `test` script).

## Commands

```bash
npm run dev       # tsx server.ts — dev server w/ Vite middleware, http://localhost:5000
npm run build     # vite build (client) + esbuild bundle of server.ts -> dist/server.cjs
npm run start     # node dist/server.cjs (prod, run after build)
npm run preview   # NODE_ENV=production tsx server.ts
```

There is no lint/typecheck npm script; run `npx tsc --noEmit` manually if needed.

## Directory map

```
server.ts                     Express entrypoint (dev/prod branching, static /reports serving)
server/
  routes/api.routes.ts        All routes + multer config + DI wiring (services instantiated here)
  controllers/                report.controller.ts (parse/save/reanalyze/ai), news.controller.ts
  services/                   ocr.service, extraction.service, ai.service (Gemini), storage.service (XML I/O)
  parser.ts                   PDF/OCR -> markdown text conversion
  utils.ts                    Shared string/number helpers
  logger.ts                   Minimal logger
  config/dictionary.ts        ACTIVE financial-term dictionary used by extraction/AI services
  dictionary.ts                DEAD — not imported anywhere, do not edit expecting effect (see Known Issues)
  news_service.ts             News aggregation/scraping logic

src/
  App.tsx                     Top-level view router/state (upload/dashboard/archive/news/fincore/info)
  fincore_engine.ts            Core scoring/ratio calculation engine (Core-8 metrics, sector-aware)
  constants.ts                 Sector lists, field definitions, dictionary-like constants
  types.ts                     Shared frontend types
  components/
    UploadView.tsx             ACTIVE upload flow (2.4k lines) — imported by App.tsx
    UploadView/                DEAD parallel refactor (index.tsx + MarkdownMode/SavedRecordsMode/
                                StepIndicator/types/utils) — not imported by anything (see Known Issues)
    DashboardView.tsx          Main data table / statement view (1.6k lines)
    FinCoreView.tsx             FinCore™ scoring/analysis view (1.2k lines)
    NewsView.tsx                News tab (~900 lines)
    PageSelectionModal.tsx, DocumentViewerOverlay.tsx, ArchiveView.tsx, InfoView.tsx, etc.

testing/                      Ad-hoc manual scripts (pdf-parse/tesseract/markitdown experiments), not a test suite
public/                       Static assets (favicon, pdf.js worker)
fincore_db/                   Runtime-generated XML data store (gitignored)
dev-dist/                     Runtime-generated PWA dev service worker output (vite-plugin-pwa devOptions,
                               regenerates on `npm run dev`) — safe to delete, should be gitignored
```

## Known issues / traps for agents

1. **Two `UploadView` implementations exist.** `src/components/UploadView.tsx`
   (flat, 2484 lines) is the one actually imported by
   [App.tsx](src/App.tsx:11) (`import("./components/UploadView")` resolves to
   the sibling file before the directory's `index.tsx`, per bundler
   resolution order). The `src/components/UploadView/` directory (index.tsx +
   MarkdownMode.tsx + SavedRecordsMode.tsx + StepIndicator.tsx + types.ts +
   utils.ts, ~2.6k lines total) is an abandoned parallel refactor that is
   never imported. Before editing upload-flow behavior, confirm you're in
   `UploadView.tsx`, not the directory. Either finish migrating to the split
   version and delete the flat file, or delete the dead directory — don't
   edit both.
2. **Two dictionary files exist.** `server/config/dictionary.ts` is the one
   actually imported by `extraction.service.ts` and `ai.service.ts`.
   `server/dictionary.ts` (root of `server/`) is unused dead code.
3. **`dev-dist/`** is a build artifact from `vite-plugin-pwa`'s
   `devOptions.enabled: true` ([vite.config.ts:12](vite.config.ts:12)). It is
   regenerated every `npm run dev` and is not currently in `.gitignore` —
   add it rather than committing its contents.
4. **No automated tests.** Treat any behavior change as unverified until
   manually exercised through the UI/dev server; there is no CI safety net.
5. **TypeScript strictness is nominal, not enforced in practice** — `strict:
   true` in tsconfig but 100+ `any`/`as any`/`@ts-ignore` usages across
   `src`/`server`. Don't assume type signatures are trustworthy without
   checking the implementation.
6. **File uploads accept any extension** (`server/routes/api.routes.ts` —
   multer has no `fileFilter`), and uploaded files are later served back
   statically from `/reports/*`. Be careful about assuming only
   PDF/image content ever lands in `fincore_db/original_reports/`.

## Conventions observed

- Views are lazy-loaded from `App.tsx` via `React.lazy`; keep new top-level
  views consistent with that pattern.
- Server controllers depend on services through constructor-injected
  interfaces (`IOcrService`, `IExtractionService`, etc. in
  `report.controller.ts`), but the DI container is just plain `new X()` calls
  in `api.routes.ts` — there's no framework, just manual wiring.
- Financial data flows: upload → OCR/parse (`server/parser.ts`) → regex
  extraction (`extraction.service.ts`) and/or Gemini extraction
  (`ai.service.ts`) → user review in UI → `saveReport` persists as XML via
  `storage.service.ts` → `fincore_engine.ts` computes ratios/scores
  client-side from the saved XML-derived JSON.
- Sector-specific logic (banks, REITs, telcos, healthcare) is threaded
  through `fincore_engine.ts` — check for sector guards before assuming a
  metric formula is universal.
