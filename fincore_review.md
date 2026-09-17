# FinCore — Repository Review

*Reviewed: 2026-09-17*

## Summary

FinCore is a Bursa Malaysia annual-report ingestion and financial-scoring
tool. React 18 + Express single-process app (Vite middleware in dev, static
SPA in prod), no database (XML flat-files), OCR via `pdf-parse`/
`tesseract.js`, optional Gemini-powered extraction.

## Architecture

The layered server design (routes → controllers → interface-typed services)
is genuinely good instinct — `report.controller.ts` depends on
`IOcrService`/`IExtractionService`/`IStorageService`/`IAiService` interfaces,
which makes it testable in principle. The domain modeling in
`src/fincore_engine.ts` — sector-aware ROIC/Altman-Z substitutions for
banks/REITs/healthcare — shows real domain knowledge, not boilerplate CRUD.

## Code smells found

- ~~Two live implementations of the same component~~ **(fixed 2026-09-18)**:
  the stale flat `src/components/UploadView.tsx` (frozen since 2026-08-10,
  superseded the same day by a split refactor into
  `src/components/UploadView/`) was deleted. The split version — which
  contains the newer AI-extract wiring and reportingUnit UI that had been
  silently dead — is now what actually ships, confirmed via `vite build`.
- ~~Duplicate dictionary files~~ **(fixed 2026-09-18)**: the unused
  `server/dictionary.ts` (frozen since 2026-06-08, 318 lines) was deleted.
  `server/config/dictionary.ts` remains the active one.
- **God components**: `UploadView.tsx` 2484 lines, `DashboardView.tsx` 1625,
  `NewsView.tsx` 888, `FinCoreView.tsx` 1185, `PageSelectionModal.tsx` 694 —
  all doing far more than one component should; little decomposition, heavy
  local state.
- **Type safety is nominal only**: `strict: true` in tsconfig, but 105+
  occurrences of `any`/`as any`/`@ts-ignore` across the codebase, including
  on service interfaces (`processFinancials(...): { ... extractedData: any }`).
  Strict mode is fighting a losing battle against pervasive `any`.
- **Zero automated tests.** `testing/` is a folder of manual one-off scripts,
  not a suite — no Jest/Vitest, no CI. Every change (including the Phase 0–3
  TODO items marked done) is unverified beyond manual clicking.
- **Inconsistent error handling**: some catch blocks use the shared
  `logger`, others `console.error`/`console.warn` directly, in the same file
  even (`report.controller.ts`).
- **Comment style leans toward narrating the obvious**
  (`// Bind listener to start accepting operations`), which adds noise
  without adding information.

## Security concerns

- **File upload has no type/extension filter** (`server/routes/api.routes.ts`
  — multer only limits size), and uploaded files are later served back
  statically at `/reports/*`. Arbitrary file types can be uploaded and
  hosted.
- **Path-traversal risk** in the `/reports/:filename` fallback handler in
  `server.ts` — `filename` is joined into a filesystem path with only an
  `.md`→`.pdf` extension check, no traversal sanitization (`..` sequences
  aren't stripped; on Windows, backslash separators bypass Express's
  single-segment route-param slash restriction).
- **50MB JSON/urlencoded body limit** with no apparent rate limiting — an
  easy DoS vector on a single-process server with no queueing.
- API keys are correctly kept server-side (good) and `.env` is gitignored
  (good).

## Documentation

`README.md` is a nice, human-oriented quickstart but has drifted from
reality (says the dev server "opens at localhost:3000"; it's actually 5000).
`TODO.md` is unusually good — a genuine, dated, prioritized roadmap with
completion tracking, rare to see in a solo/small project.

## Rating: 58 / 100

The domain logic (`fincore_engine.ts`, sector-aware financial scoring) and
the service-interface architecture show above-average engineering thought
for a project this size. But it's dragged down hard by: a large volume of
genuinely dead code sitting unnoticed in the tree, zero test coverage on a
data-correctness-critical app (financial figures, arithmetic validation), an
unfiltered file-upload path serving files back publicly, and component files
large enough to be a real maintenance burden. This reads as a fast-moving
solo/small-team project that's accumulated technical debt faster than it's
been paid down — solid bones, needs a cleanup pass before it should be
considered production-grade.
