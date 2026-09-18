/**
 * ============================================================================
 *  Bursa Malaysia financial statement parser
 * ============================================================================
 *
 *  Turns the text of a quarterly/annual report - whether it is a real markdown
 *  pipe table or the ragged text that falls out of a PDF extractor - into
 *  typed, unit-normalised line items.
 *
 *  Design notes
 *  ------------
 *  1. Reports are split into COLUMN BLOCKS. A block begins at every unit
 *     header row (`RM'000  RM'000  RM'000  RM'000`) because that row is the
 *     only reliable marker that a new column layout has started.
 *  2. Each block's columns are typed by scanning the surrounding header and
 *     footer text for scope markers (Group / Company / Bank) and period
 *     markers (Individual Quarter / Cumulative / As At).
 *  3. Note references (`A8`, `A31(b)`, `B12`) are glued to the numbers by PDF
 *     extraction - `...institutionsA85,061,011` is note A8 and value 5,061,011,
 *     not 85,061,011. These are stripped with digit-grouping validation before
 *     any number is read.
 *  4. Every value is normalised to MILLIONS of the report currency. Per-share
 *     amounts, ratios and percentages are never scaled.
 *
 *  Output is grouped by series - one series per (scope x period x vintage)
 *  combination, so Group and Company, and current-quarter and cumulative-YTD,
 *  are all returned separately.
 */

import {
  Category,
  DictionaryEntry,
  FINANCIAL_DICTIONARY,
  KEYWORD_INDEX,
  StatementKind,
  ValueKind,
} from "./dictionary";

/* ========================================================================== */
/*  Types                                                                      */
/* ========================================================================== */

export type Scope = "group" | "company";
export type PeriodKind = "quarter" | "ytd" | "balance";
export type Vintage = "current" | "prior";
export type Confidence = "high" | "medium" | "low";

export interface UnitInfo {
  /** Raw unit text as printed, e.g. "RM'000". */
  label: string;
  /** ISO currency code if one could be identified. */
  currency: string;
  /** Multiply a printed currency figure by this to get millions. */
  toMillions: number;
}

export interface ColumnSpec {
  index: number;
  scope: Scope;
  period: PeriodKind;
  vintage: Vintage;
  /** Human label for the column, e.g. "30 June 2026". */
  label: string;
  year: string | null;
  /** Statement the owning block belongs to. */
  statement: StatementKind;
}

export interface ExtractedValue {
  /** Normalised to millions (currency) or left as printed (ratio/per-share/%). */
  value: number;
  /** The digits exactly as they appeared in the source. */
  raw: string;
  /** The statement line label the value was taken from. */
  sourceLabel: string;
  /** Which dictionary keyword matched. */
  matchedKeyword: string;
  kind: ValueKind;
  confidence: Confidence;
  line: number;
  /** Index of the column block the value came from; lower means earlier. */
  block: number;
  /** True when the value was computed rather than read off the page. */
  derived?: boolean;
}

export interface Series {
  key: string;
  scope: Scope;
  period: PeriodKind;
  vintage: Vintage;
  label: string;
  year: string | null;
  fields: Record<string, ExtractedValue>;
}

export interface ConsistencyCheck {
  seriesKey: string;
  rule: string;
  expected: number;
  actual: number;
  /** Absolute difference as a share of the larger side. */
  drift: number;
  passed: boolean;
}

export interface ParseWarning {
  line: number;
  message: string;
  detail?: string;
}

export interface FinancialParseResult {
  currency: string;
  unit: UnitInfo;
  scaledTo: "millions";
  series: Series[];
  /** The series a consumer should use if it only wants one: Group, widest period, current. */
  primary: Series | null;
  /** Shaped for the app's `ParsedDocument.extractedData`. */
  extractedData: Record<Category, Record<string, { value: string | null; confidence: Confidence }>>;
  /** Everything the parser could not confidently place. */
  unmatched: { line: number; label: string; values: number[] }[];
  warnings: ParseWarning[];
  /** Accounting identities tested against the parsed figures. */
  checks: ConsistencyCheck[];
  stats: { blocks: number; rows: number; matched: number; noteRefsStripped: number };
}

export interface ParseOptions {
  /** Override unit detection, e.g. when the caller already knows it is RM'm. */
  unitOverride?: UnitInfo;
  /** Fill grossProfit / ebit / ebitda / freeCashFlow etc. when absent. Default true. */
  deriveMissing?: boolean;
  /** Keep line items the dictionary did not recognise. Default true. */
  collectUnmatched?: boolean;
  /**
   * Also read blocks whose statement could not be identified - typically the
   * explanatory notes and segment tables. These repeat labels such as
   * "Total assets" with segment-level figures, so they are skipped by default.
   */
  includeUnidentifiedBlocks?: boolean;
}

/* ========================================================================== */
/*  Text normalisation                                                         */
/* ========================================================================== */

const CURRENCY_PATTERNS: { re: RegExp; code: string }[] = [
  { re: /\bRM\b|\bMYR\b|ringgit/i, code: "MYR" },
  { re: /\bUSD\b|\bUS\$|\bU\.S\. dollar/i, code: "USD" },
  { re: /\bSGD\b|\bS\$/i, code: "SGD" },
  { re: /\bEUR\b|€/i, code: "EUR" },
  { re: /\bGBP\b|£/i, code: "GBP" },
];

/**
 * Collapses the many ways a PDF extractor mangles whitespace and punctuation
 * into a single predictable form.
 */
export function normaliseText(raw: string): string {
  return (
    raw
      .replace(/\r\n?/g, "\n")
      // non-breaking / thin / zero-width spaces
      .replace(/[\u00a0\u2007\u202f\u2009\u200a\u200b\ufeff]/g, " ")
      // curly quotes -> straight, so RM’000 and RM'000 are the same token
      .replace(/[\u2018\u2019\u201b\u2032]/g, "'")
      .replace(/[\u201c\u201d\u2033]/g, '"')
      // en/em dash used as a nil marker
      .replace(/[\u2012\u2013\u2014\u2015]/g, "-")
      // minus sign
      .replace(/\u2212/g, "-")
      .replace(/[ \t]+/g, " ")
      .replace(/ *\n */g, "\n")
      .replace(/\n{3,}/g, "\n\n")
  );
}

/** Strips markdown table pipes and separator rows so tables parse like plain rows. */
function flattenMarkdownTables(text: string): string {
  return text
    .split("\n")
    .filter((line) => !/^\s*\|?[\s:\-|]{4,}\|?\s*$/.test(line) || !line.includes("-"))
    .map((line) => {
      if (!line.includes("|")) return line;
      const cells = line.split("|").map((c) => c.trim()).filter((c) => c !== "");
      // Pad cells apart so the tokeniser sees them as distinct columns.
      return cells.join("   ");
    })
    .join("\n");
}

/* ========================================================================== */
/*  Unit detection                                                             */
/* ========================================================================== */

const UNIT_ROW_RE = /(RM|MYR|USD|SGD|EUR|GBP|\$)\s*['"]?\s*(000|'000|m|mn|mil|million|b|bn|billion)?\b/gi;

function unitScaleToMillions(suffix: string | undefined): number {
  const s = (suffix || "").toLowerCase().replace(/['"]/g, "");
  if (s === "000") return 1 / 1_000; // thousands -> millions
  if (s === "m" || s === "mn" || s === "mil" || s === "million") return 1;
  if (s === "b" || s === "bn" || s === "billion") return 1_000;
  return 1 / 1_000_000; // bare units -> millions
}

/**
 * A unit row is a line made up almost entirely of repeated currency-unit
 * tokens, e.g. `NoteRM'000RM'000RM'000RM'000`. Returns the column count.
 */
function unitRowColumnCount(line: string): number {
  const stripped = line.replace(/\bNote\b/gi, "").trim();
  if (!stripped) return 0;
  const matches = stripped.match(/(?:RM|MYR|USD|SGD|EUR|GBP|\$)\s*['"]?\s*(?:000|m\b|mil\b|million\b|bn?\b)?/gi);
  if (!matches) return 0;
  // The row must be mostly unit tokens, not prose that happens to mention RM.
  const consumed = matches.join("").replace(/\s/g, "").length;
  const total = stripped.replace(/\s/g, "").length;
  if (consumed / total < 0.6) return 0;
  return matches.length;
}

function detectUnit(text: string): UnitInfo {
  let currency = "MYR";
  for (const { re, code } of CURRENCY_PATTERNS) {
    if (re.test(text)) {
      currency = code;
      break;
    }
  }
  UNIT_ROW_RE.lastIndex = 0;
  const counts = new Map<string, number>();
  for (const line of text.split("\n")) {
    if (!unitRowColumnCount(line)) continue;
    const m = line.match(/(?:RM|MYR|USD|SGD|EUR|GBP|\$)\s*['"]?\s*(000|m|mn|mil|million|b|bn|billion)?/i);
    const key = (m?.[1] || "").toLowerCase();
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  let best = "";
  let bestN = -1;
  for (const [k, n] of counts) {
    if (n > bestN) {
      best = k;
      bestN = n;
    }
  }
  const label = `${currency === "MYR" ? "RM" : currency}${best === "000" ? "'000" : best ? `'${best}` : ""}`;
  return { label, currency, toMillions: unitScaleToMillions(best) };
}

/* ========================================================================== */
/*  Note-reference stripping                                                   */
/* ========================================================================== */

/** `1,234,567` / `1234567` / `12.5` - a well-formed number with valid grouping. */
function isWellFormedNumber(s: string): boolean {
  if (!s) return false;
  if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) return true; // grouped
  if (/^\d{1,3}(\.\d+)?$/.test(s)) return true; // small ungrouped
  if (/^\d+(\.\d+)?$/.test(s) && !/^0\d/.test(s)) return true; // ungrouped, no leading zero
  return false;
}

// The note letter must follow a lowercase letter, a bracket or whitespace.
// Allowing an uppercase lead turns "TOTAL ASSETS794,851,196" into note "S794",
// silently deleting the leading digit of the value.
const NOTE_REF_RE = /(^|[a-z)\s.,])([A-Z])(\d{1,3})((?:\([a-z0-9]+\))|[a-z])?(?=[\d(\-\s]|$)/g;

/**
 * Removes note references that PDF extraction fused onto the label/number
 * boundary. The number of digits belonging to the note is decided by checking
 * which split leaves a validly-grouped number behind, with a document-wide
 * vocabulary of observed note labels used to break ties.
 *
 * `institutionsA85,061,011` -> note `A8`, number `5,061,011`
 * `financingA13450,594,779` -> note `A13`, number `450,594,779`
 */
export function stripNoteRefs(line: string, vocabulary: Set<string>): { text: string; stripped: number } {
  let stripped = 0;
  const out = line.replace(NOTE_REF_RE, (match, lead: string, letter: string, digits: string, suffix: string = "", offset: number) => {
    const tail = line.slice(offset + match.length);
    const candidates: { note: string; rest: string; k: number }[] = [];
    for (let k = 1; k <= digits.length; k++) {
      const note = letter + digits.slice(0, k) + (k === digits.length ? suffix : "");
      const rest = digits.slice(k) + (k === digits.length ? "" : suffix) + tail;
      const firstToken = rest.match(/^[\d,]*\d/)?.[0] ?? "";
      if (k < digits.length && !isWellFormedNumber(firstToken)) continue;
      candidates.push({ note, rest, k });
    }
    // Only strip labels the document demonstrably uses as note references.
    // Without this guard any capital letter followed by digits looks like a note.
    // Longest known note label wins; when the reference carries a sub-letter
    // such as A20(a) the full digit run belongs to the note.
    const known = candidates
      .filter((c) => vocabulary.has(c.note))
      .sort((a, b) => (suffix ? (b.k === digits.length ? 1 : 0) - (a.k === digits.length ? 1 : 0) : 0) || b.k - a.k);
    if (known.length === 0) return match;
    const chosen = known[0];
    stripped += 1;
    return lead + digits.slice(chosen.k) + (chosen.k === digits.length ? "" : suffix);
  });
  return { text: out, stripped };
}

/** First pass: collect note labels that can only be read one way. */
export function buildNoteVocabulary(lines: string[]): Set<string> {
  const vocab = new Set<string>();
  for (const line of lines) {
    // Unambiguous forms: note token followed by whitespace or a bracket.
    for (const m of line.matchAll(/(?:^|[A-Za-z)\s])([A-Z]\d{1,3}(?:\([a-z0-9]+\))?)(?=\s|\(|$)/g)) {
      vocab.add(m[1]);
    }
    // Note section headings. Extractors frequently drop the space, so
    // "A8.Interest Income" and "A8. Interest income" must both register.
    for (const m of line.matchAll(/^\s*([A-Z]\d{1,3})\s*[.):]\s*[A-Za-z]/g)) {
      vocab.add(m[1]);
    }
    // Table-of-contents style listings: "A8 Interest income".
    for (const m of line.matchAll(/^\s*([A-Z]\d{1,3})\s+[A-Z][a-z]/g)) {
      vocab.add(m[1]);
    }
  }
  // Notes are sequential; close single-step gaps so A12 is accepted when A11
  // and A13 were both observed.
  const byLetter = new Map<string, number[]>();
  for (const v of vocab) {
    const m = v.match(/^([A-Z])(\d{1,3})$/);
    if (!m) continue;
    const arr = byLetter.get(m[1]) ?? [];
    arr.push(parseInt(m[2], 10));
    byLetter.set(m[1], arr);
  }
  for (const [letter, nums] of byLetter) {
    const lo = Math.min(...nums);
    const hi = Math.max(...nums);
    for (let i = lo; i <= hi; i++) vocab.add(letter + i);
  }
  return vocab;
}

/* ========================================================================== */
/*  Number tokenising                                                          */
/* ========================================================================== */

const NUMBER_TOKEN_RE =
  /\(\s*-?\s*\d{1,3}(?:,\d{3})*(?:\.\d+)?\s*\)|\(\s*-?\s*\d+(?:\.\d+)?\s*\)|-?\d{1,3}(?:,\d{3})+(?:\.\d+)?|-?\d+\.\d+|-?\d+|(?<![\w.])-(?![\w-])/g;

export interface NumberToken {
  raw: string;
  value: number;
  negative: boolean;
  nil: boolean;
  start: number;
  end: number;
}

export function tokeniseNumbers(text: string): NumberToken[] {
  const tokens: NumberToken[] = [];
  for (const m of text.matchAll(NUMBER_TOKEN_RE)) {
    const raw = m[0];
    const start = m.index ?? 0;
    if (raw.trim() === "-") {
      tokens.push({ raw, value: 0, negative: false, nil: true, start, end: start + raw.length });
      continue;
    }
    const bracketed = raw.trim().startsWith("(");
    const digits = raw.replace(/[(),\s]/g, "");
    const n = parseFloat(digits);
    if (!isFinite(n)) continue;
    const negative = bracketed || digits.startsWith("-");
    tokens.push({
      raw,
      value: negative ? -Math.abs(n) : n,
      negative,
      nil: false,
      start,
      end: start + raw.length,
    });
  }
  return tokens;
}

/* ========================================================================== */
/*  Label matching                                                             */
/* ========================================================================== */

/** Collapses a statement line label to a comparable form. */
export function normaliseLabel(label: string): string {
  return label
    .toLowerCase()
    .replace(/\(.*?\)/g, " ") // drop "(loss)", "(restated)", "(a)"
    .replace(/[^a-z0-9&'/,. -]/g, " ")
    .replace(/^[\s\-–—•*#.\d]+/, "") // leading bullets, numbering
    .replace(/[\s.:-]+$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

export interface LabelMatch {
  fieldId: string;
  entry: DictionaryEntry;
  keyword: string;
  confidence: Confidence;
  score: number;
}

/**
 * Scores a line label against the dictionary.
 *
 * Exact equality wins outright; otherwise the score rewards long keywords that
 * anchor at the start of the label and penalises keywords buried inside a much
 * longer label (which is usually a sub-line, not the total).
 */
export function matchLabel(rawLabel: string, statement: StatementKind): LabelMatch | null {
  const label = normaliseLabel(rawLabel);
  if (label.length < 2) return null;
  if (/^(note|notes|total|as at|for the)$/.test(label)) return null;

  let best: LabelMatch | null = null;

  for (const { fieldId, keyword, entry } of KEYWORD_INDEX) {
    if (entry.exclude?.some((ex) => label.includes(ex))) continue;

    // A field declared for a specific statement should not be harvested from a
    // different one, unless the entry is marked "any".
    const st = entry.statement ?? "any";
    if (st !== "any" && statement !== "any" && st !== statement) continue;

    let score: number;
    let confidence: Confidence;

    if (label === keyword) {
      score = 1000 + keyword.length;
      confidence = "high";
    } else if (label.startsWith(keyword)) {
      const overhang = label.length - keyword.length;
      score = 700 + keyword.length * 2 - overhang;
      confidence = overhang <= 6 ? "high" : "medium";
    } else if (label.endsWith(keyword)) {
      score = 500 + keyword.length * 2 - (label.length - keyword.length);
      confidence = "medium";
    } else if (label.includes(keyword)) {
      // Only trust an interior match for reasonably distinctive keywords.
      if (keyword.length < 8) continue;
      score = 300 + keyword.length - (label.length - keyword.length);
      confidence = "low";
    } else {
      continue;
    }

    score += entry.priority ?? 0;
    if (!best || score > best.score) best = { fieldId, entry, keyword, confidence, score };
  }

  if (best && best.score < 300) return null;
  return best;
}

/* ========================================================================== */
/*  Column typing                                                              */
/* ========================================================================== */

const MONTHS =
  "january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec";
const DATE_RE = new RegExp(`\\b(\\d{1,2})\\s+(${MONTHS})\\s*(\\d{4})?\\b`, "gi");
const YEAR_RE = /\b(19|20)\d{2}\b/g;

interface BlockContext {
  statement: StatementKind;
  /**
   * PDF extractors emit a page's running head AFTER its body, so the text
   * immediately before the next unit row is this block's own title. The text
   * above the unit row belongs to the PREVIOUS page and is only a fallback.
   */
  footer: string;
  header: string;
  /** Combined, for keyword scans that do not care about precedence. */
  text: string;
}

function resolveByPrecedence<T>(
  ctx: BlockContext,
  probe: (text: string) => T | null,
): T | null {
  return probe(ctx.footer) ?? probe(ctx.header) ?? null;
}

/**
 * Reads a statement title out of a chunk of context. Returns null rather than
 * "any" so the caller can fall through to a lower-precedence chunk.
 *
 * Order matters: "STATEMENTS OF CASH FLOWS" also contains the word statements,
 * so the most specific titles are tested first.
 */
function probeStatement(context: string): StatementKind | null {
  const t = context.toLowerCase();
  if (/statements? of cash flows?|cash flows? statements?/.test(t)) return "cashflow";
  if (/statements? of changes in equity/.test(t)) return "equity";
  if (/statements? of financial position|balance sheets?|statements? of assets and liabilities/.test(t)) return "balance";
  if (/income statements?|statements? of (comprehensive )?income|statements? of profit or loss|profit or loss statements?/.test(t)) {
    return "income";
  }
  return null;
}

/**
 * Scope markers. Bursa filings label the column pairs "The Group" / "The
 * Company" (or "Bank"). A block that names only one of them is entirely that
 * scope; a block naming both is split down the middle.
 */
function probeScope(context: string): { group: boolean; company: boolean } | null {
  let group = false;
  let company = false;

  for (const rawLine of context.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.length > 60) continue;

    // A column heading is the word on its own, optionally with the column dates
    // fused onto it by the extractor ("Group30 June30 June...").
    const stripped = line.replace(/\d{1,2}\s*(january|february|march|april|may|june|july|august|september|october|november|december)\s*\d{0,4}/gi, "")
      .replace(/\d/g, "")
      .replace(/[^a-z ]/gi, " ")
      .replace(/\bthe\b/gi, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();

    if (stripped === "group") group = true;
    else if (stripped === "company" || stripped === "bank") company = true;
    else if (stripped === "group company" || stripped === "group bank" || stripped === "groupbank" || stripped === "groupcompany") {
      group = true;
      company = true;
    }
  }

  if (!group && !company) return null;
  return { group, company };
}

function buildColumns(count: number, ctx: BlockContext, dateLabels: string[]): ColumnSpec[] {
  const t = ctx.text.toLowerCase();

  const hasQuarterMarker =
    /individual quarter|individual period|\b\d(?:nd|rd|st|th) quarter ended|second quarter ended|current quarter|three months ended|3 months ended/.test(t);
  const hasCumulativeMarker =
    /cumulative quarter|cumulative \d+ months|six months ended|nine months ended|twelve months ended|\d+ months ended|year to date|financial period ended|financial year ended/.test(t);

  const scopeMarkers = resolveByPrecedence(ctx, probeScope) ?? { group: true, company: false };
  const singleScope: Scope | null =
    scopeMarkers.group && !scopeMarkers.company ? "group" : scopeMarkers.company && !scopeMarkers.group ? "company" : null;

  const isBalance = ctx.statement === "balance";
  // A 4-column income statement is normally split by period; a 4-column balance
  // sheet is split by scope. Naming both scopes forces a scope split either way.
  const splitByScope =
    count >= 4 && singleScope === null && (isBalance || !(hasQuarterMarker && hasCumulativeMarker));

  const cols: ColumnSpec[] = [];
  const pairCount = Math.max(1, Math.round(count / 2));

  for (let i = 0; i < count; i++) {
    const pair = Math.floor(i / 2);
    const vintage: Vintage = i % 2 === 0 ? "current" : "prior";

    let scope: Scope = "group";
    let period: PeriodKind = isBalance ? "balance" : "ytd";

    if (count <= 2) {
      scope = singleScope ?? "group";
      period = isBalance ? "balance" : hasQuarterMarker && !hasCumulativeMarker ? "quarter" : "ytd";
    } else if (splitByScope) {
      scope = pair === 0 ? "group" : "company";
      period = isBalance ? "balance" : hasQuarterMarker && !hasCumulativeMarker ? "quarter" : "ytd";
    } else {
      // One scope, two periods: Bursa prints the individual quarter first, then
      // the cumulative year-to-date figures.
      scope = singleScope ?? "group";
      period = isBalance ? "balance" : pair === 0 ? "quarter" : "ytd";
      if (pairCount === 1) period = isBalance ? "balance" : hasQuarterMarker ? "quarter" : "ytd";
    }

    const label = dateLabels[i] ?? dateLabels[i % Math.max(1, dateLabels.length)] ?? "";
    const year = label.match(/(19|20)\d{2}/)?.[0] ?? null;

    cols.push({ index: i, scope, period, vintage, label, year, statement: ctx.statement });
  }
  return cols;
}

/** Pulls per-column date labels out of the header lines above a unit row. */
function extractDateLabels(headerLines: string[], count: number): string[] {
  // Case 1: a single line carrying all the dates, e.g.
  //   "30 June 2026  31 December 2025  30 June 2026  31 December 2025"
  for (const line of headerLines) {
    DATE_RE.lastIndex = 0;
    const dates = Array.from(line.matchAll(DATE_RE)).map((m) => m[0].trim());
    if (dates.length >= count && dates.every((d) => /\d{4}/.test(d))) return dates.slice(0, count);
  }
  // Case 2: day/month on one line, years on the next, e.g.
  //   "Group30 June30 June30 June30 June" / "2026202520262025"
  for (let i = 0; i < headerLines.length - 1; i++) {
    DATE_RE.lastIndex = 0;
    const days = Array.from(headerLines[i].matchAll(DATE_RE)).map((m) => m[0].trim());
    if (days.length < count) continue;
    const yearsRaw = headerLines[i + 1].replace(/\s/g, "");
    const years = yearsRaw.match(/(19|20)\d{2}/g) ?? [];
    // "2026202520262025" needs splitting into four-character chunks.
    const chunked = years.length >= count ? years : (yearsRaw.match(/.{4}/g) ?? []).filter((c) => /^(19|20)\d{2}$/.test(c));
    if (chunked.length >= count) {
      return days.slice(0, count).map((d, k) => `${d.replace(/\s*\d{4}$/, "")} ${chunked[k]}`.trim());
    }
    return days.slice(0, count);
  }
  // Case 3: bare years only.
  for (const line of headerLines) {
    YEAR_RE.lastIndex = 0;
    const years = line.match(YEAR_RE) ?? [];
    if (years.length >= count) return years.slice(0, count);
  }
  return [];
}

/* ========================================================================== */
/*  Row assembly                                                               */
/* ========================================================================== */

interface RawRow {
  label: string;
  values: NumberToken[];
  line: number;
}

/**
 * Walks the lines of a block and glues wrapped labels and wrapped number runs
 * back together. A row is complete once it holds `count` numbers.
 */
function assembleRows(lines: { text: string; no: number }[], count: number, vocab: Set<string>): { rows: RawRow[]; stripped: number } {
  const rows: RawRow[] = [];
  let labelBuffer: string[] = [];
  let pending: RawRow | null = null;
  let stripped = 0;

  // A colon-terminated label is a section heading ("Earnings per share:") and
  // an all-nil run carries no information. Neither is a data row.
  const isDataRow = (row: RawRow) =>
    row.values.length > 0 && !/:$/.test(row.label.trim()) && !row.values.every((t) => t.nil);

  const push = (row: RawRow) => {
    if (isDataRow(row)) rows.push(row);
  };

  const flushPending = () => {
    if (pending) push(pending);
    pending = null;
  };

  for (const { text, no } of lines) {
    if (!text.trim()) {
      flushPending();
      labelBuffer = [];
      continue;
    }

    const cleaned = stripNoteRefs(text, vocab);
    stripped += cleaned.stripped;
    const tokens = tokeniseNumbers(cleaned.text);

    if (tokens.length === 0) {
      // Pure text: either a continuation of a wrapped label or a new one.
      flushPending();
      labelBuffer.push(text.trim());
      if (labelBuffer.length > 4) labelBuffer.shift();
      continue;
    }

    // The data for a row is the LAST `count` numeric tokens on the line;
    // anything before the first of them is label text (including note refs the
    // stripper could not resolve).
    const dataTokens = tokens.length >= count ? tokens.slice(-count) : tokens;
    const labelPart = cleaned.text.slice(0, dataTokens[0].start);
    const inlineLabel = labelPart.replace(/\s+/g, " ").trim();

    if (dataTokens.length >= count) {
      flushPending();
      const label = inlineLabel || labelBuffer.join(" ");
      // A colon-terminated label is a section heading ("Earnings per share:"),
      // and an all-nil run carries no information. Neither is a data row.
      push({ label, values: dataTokens, line: no });
      labelBuffer = [];
      continue;
    }

    // Short run: either the start of a wrapped row or the tail of one.
    if (pending && pending.values.length + dataTokens.length <= count && !inlineLabel) {
      pending.values.push(...dataTokens);
      if (pending.values.length >= count) flushPending();
      continue;
    }

    flushPending();
    pending = {
      label: inlineLabel || labelBuffer.join(" "),
      values: [...dataTokens],
      line: no,
    };
    labelBuffer = [];
  }
  flushPending();
  return { rows, stripped };
}

/* ========================================================================== */
/*  Value normalisation                                                        */
/* ========================================================================== */

function applyKindAndSign(token: NumberToken, entry: DictionaryEntry, unit: UnitInfo): number {
  const kind: ValueKind = entry.kind ?? "currency";
  let v = token.nil ? 0 : token.value;

  if (kind === "currency") v *= unit.toMillions;
  if (kind === "count" && unit.toMillions === 1 / 1000) v *= 1000; // share counts printed in '000

  switch (entry.sign ?? "asPrinted") {
    case "positive":
      return Math.abs(v);
    case "negative":
      return -Math.abs(v);
    default:
      return v;
  }
}

/* ========================================================================== */
/*  Derivation                                                                 */
/* ========================================================================== */

const DERIVATIONS: {
  target: string;
  needs: string[];
  compute: (f: Record<string, number>) => number | null;
}[] = [
  { target: "grossProfit", needs: ["revenue", "costOfGoodsSold"], compute: (f) => f.revenue - f.costOfGoodsSold },
  {
    target: "operatingExpenses",
    needs: ["grossProfit", "operatingProfit"],
    compute: (f) => f.grossProfit - f.operatingProfit,
  },
  {
    target: "ebit",
    needs: ["profitBeforeTax", "financeCost"],
    compute: (f) => f.profitBeforeTax + f.financeCost,
  },
  { target: "ebitda", needs: ["ebit", "depreciation"], compute: (f) => f.ebit + f.depreciation + (f.amortization ?? 0) },
  {
    target: "netProfit",
    needs: ["profitBeforeTax", "taxExpense"],
    compute: (f) => f.profitBeforeTax - f.taxExpense,
  },
  {
    target: "effectiveTaxRate",
    needs: ["taxExpense", "profitBeforeTax"],
    compute: (f) => (f.profitBeforeTax > 0 ? f.taxExpense / f.profitBeforeTax : null),
  },
  {
    target: "freeCashFlow",
    needs: ["operatingCashFlow", "capitalExpenditure"],
    compute: (f) => f.operatingCashFlow - f.capitalExpenditure,
  },
  {
    target: "totalBorrowings",
    needs: ["shortTermDebt", "longTermDebt"],
    compute: (f) => f.shortTermDebt + f.longTermDebt + (f.bondsPayable ?? 0),
  },
  { target: "netDebt", needs: ["totalBorrowings", "cashAndEquivalents"], compute: (f) => f.totalBorrowings - f.cashAndEquivalents },
  {
    target: "totalLiabilities",
    needs: ["totalAssets", "totalEquity"],
    compute: (f) => f.totalAssets - f.totalEquity,
  },
  {
    target: "totalEquity",
    needs: ["totalAssets", "totalLiabilities"],
    compute: (f) => f.totalAssets - f.totalLiabilities,
  },
  { target: "workingCapital", needs: ["currentAssets", "currentLiabilities"], compute: (f) => f.currentAssets - f.currentLiabilities },
  { target: "grossMargin", needs: ["grossProfit", "revenue"], compute: (f) => (f.revenue > 0 ? (f.grossProfit / f.revenue) * 100 : null) },
  {
    target: "operatingMargin",
    needs: ["operatingProfit", "revenue"],
    compute: (f) => (f.revenue > 0 ? (f.operatingProfit / f.revenue) * 100 : null),
  },
  {
    target: "netProfitMargin",
    needs: ["netProfit", "revenue"],
    compute: (f) => (f.revenue > 0 ? (f.netProfit / f.revenue) * 100 : null),
  },
  { target: "currentRatio", needs: ["currentAssets", "currentLiabilities"], compute: (f) => (f.currentLiabilities > 0 ? f.currentAssets / f.currentLiabilities : null) },
  { target: "debtToEquity", needs: ["totalBorrowings", "totalEquity"], compute: (f) => (f.totalEquity > 0 ? f.totalBorrowings / f.totalEquity : null) },
  { target: "roe", needs: ["netProfit", "totalEquity"], compute: (f) => (f.totalEquity > 0 ? (f.netProfit / f.totalEquity) * 100 : null) },
  { target: "roa", needs: ["netProfit", "totalAssets"], compute: (f) => (f.totalAssets > 0 ? (f.netProfit / f.totalAssets) * 100 : null) },
  { target: "assetTurnover", needs: ["revenue", "totalAssets"], compute: (f) => (f.totalAssets > 0 ? f.revenue / f.totalAssets : null) },
];

/**
 * Fills fields that were not printed but follow arithmetically from ones that
 * were. Runs to a fixed point so second-order values (ebitda needs ebit, which
 * may itself be derived) resolve. Derived values are flagged and given a lower
 * confidence so the UI can distinguish them from reported figures.
 */
function deriveMissing(series: Series): void {
  for (let pass = 0; pass < 4; pass++) {
    let changed = false;
    const flat: Record<string, number> = {};
    for (const [k, v] of Object.entries(series.fields)) flat[k] = v.value;

    for (const rule of DERIVATIONS) {
      if (series.fields[rule.target]) continue;
      if (!rule.needs.every((n) => flat[n] !== undefined)) continue;
      let out: number | null;
      try {
        out = rule.compute(flat);
      } catch {
        continue;
      }
      if (out === null || !isFinite(out)) continue;
      series.fields[rule.target] = {
        value: out,
        raw: "",
        sourceLabel: `derived from ${rule.needs.join(" + ")}`,
        matchedKeyword: "",
        kind: FINANCIAL_DICTIONARY[rule.target]?.kind ?? "currency",
        confidence: "low",
        line: -1,
        block: Number.MAX_SAFE_INTEGER,
        derived: true,
      };
      changed = true;
    }
    if (!changed) break;
  }
}

/* ========================================================================== */
/*  Consistency checks                                                         */
/* ========================================================================== */

const IDENTITIES: { rule: string; left: string[]; right: string[] }[] = [
  { rule: "totalAssets = totalLiabilities + totalEquity", left: ["totalAssets"], right: ["totalLiabilities", "totalEquity"] },
  { rule: "totalAssets = currentAssets + nonCurrentAssets", left: ["totalAssets"], right: ["currentAssets", "nonCurrentAssets"] },
  {
    rule: "totalLiabilities = currentLiabilities + nonCurrentLiabilities",
    left: ["totalLiabilities"],
    right: ["currentLiabilities", "nonCurrentLiabilities"],
  },
  { rule: "revenue - costOfGoodsSold = grossProfit", left: ["revenue", "-costOfGoodsSold"], right: ["grossProfit"] },
  { rule: "profitBeforeTax - taxExpense = netProfit", left: ["profitBeforeTax", "-taxExpense"], right: ["netProfit"] },
];

/** Tolerance for rounding in published statements: 0.5% or RM0.05m, whichever is larger. */
const DRIFT_TOLERANCE = 0.005;
const ABSOLUTE_TOLERANCE = 0.05;

/**
 * Tests the parsed figures against accounting identities. A failing identity is
 * the clearest signal that a line was matched to the wrong label or that a
 * digit was lost, so these are surfaced rather than silently corrected.
 */
function runConsistencyChecks(series: Series[]): ConsistencyCheck[] {
  const checks: ConsistencyCheck[] = [];

  for (const s of series) {
    for (const identity of IDENTITIES) {
      const sum = (terms: string[]): number | null => {
        let total = 0;
        for (const term of terms) {
          const negate = term.startsWith("-");
          const id = negate ? term.slice(1) : term;
          const field = s.fields[id];
          // A derived value would make the identity true by construction.
          if (!field || field.derived) return null;
          total += negate ? -field.value : field.value;
        }
        return total;
      };

      const expected = sum(identity.left);
      const actual = sum(identity.right);
      if (expected === null || actual === null) continue;

      const scale = Math.max(Math.abs(expected), Math.abs(actual), 1);
      const drift = Math.abs(expected - actual) / scale;
      const passed = Math.abs(expected - actual) <= ABSOLUTE_TOLERANCE || drift <= DRIFT_TOLERANCE;
      checks.push({ seriesKey: s.key, rule: identity.rule, expected, actual, drift, passed });
    }
  }
  return checks;
}

/* ========================================================================== */
/*  Main entry point                                                           */
/* ========================================================================== */

const EMPTY_EXTRACTED = (): FinancialParseResult["extractedData"] => ({
  incomeStatement: {},
  balanceSheet: {},
  cashFlow: {},
  ratios: {},
  growth: {},
  marketData: {},
  advanced: {},
});

export function parseFinancialMarkdown(raw: string, options: ParseOptions = {}): FinancialParseResult {
  const { deriveMissing: doDerive = true, collectUnmatched = true, includeUnidentifiedBlocks = false } = options;

  const text = flattenMarkdownTables(normaliseText(raw));
  const lines = text.split("\n");
  const unit = options.unitOverride ?? detectUnit(text);
  const vocab = buildNoteVocabulary(lines);

  const warnings: ParseWarning[] = [];
  const unmatched: FinancialParseResult["unmatched"] = [];
  const seriesMap = new Map<string, Series>();

  // ── Split into column blocks at every unit header row ────────────────────
  const unitRowIdx: number[] = [];
  lines.forEach((l, i) => {
    if (unitRowColumnCount(l) >= 1) unitRowIdx.push(i);
  });

  if (unitRowIdx.length === 0) {
    warnings.push({ line: 0, message: "No currency-unit header row found; the document may not be a financial statement." });
    return {
      currency: unit.currency,
      unit,
      scaledTo: "millions",
      series: [],
      primary: null,
      extractedData: EMPTY_EXTRACTED(),
      unmatched,
      warnings,
      checks: [],
      stats: { blocks: 0, rows: 0, matched: 0, noteRefsStripped: 0 },
    };
  }

  let totalRows = 0;
  let totalMatched = 0;
  let totalStripped = 0;

  for (let b = 0; b < unitRowIdx.length; b++) {
    const unitLine = unitRowIdx[b];
    const count = Math.min(unitRowColumnCount(lines[unitLine]), 8);
    const bodyStart = unitLine + 1;
    const bodyEnd = b + 1 < unitRowIdx.length ? unitRowIdx[b + 1] : lines.length;
    if (bodyEnd - bodyStart < 2) continue;

    // Context: the header lines directly above, plus the tail of the previous
    // block (PDF extractors frequently dump the page title into the footer),
    // plus the first few lines of this block.
    const headerLines = lines.slice(Math.max(0, unitLine - 4), unitLine);
    // Own page furniture: the trailing lines of this block plus the few lines
    // directly under the unit row (some extractors put "Group" there).
    const footerText = [
      ...lines.slice(bodyStart, Math.min(bodyStart + 3, bodyEnd)),
      ...lines.slice(Math.max(bodyEnd - 18, bodyStart), bodyEnd),
    ].join("\n");
    // Previous page's furniture: only consulted when the footer says nothing.
    const headerText = lines.slice(Math.max(unitLine - 12, 0), unitLine).join("\n");

    const ctx: BlockContext = {
      statement: "any",
      footer: footerText,
      header: headerText,
      text: `${footerText}\n${headerText}`,
    };
    ctx.statement = resolveByPrecedence(ctx, probeStatement) ?? "any";
    const dateLabels = extractDateLabels(headerLines, count);
    const columns = buildColumns(count, ctx, dateLabels);

    if (ctx.statement === "any") {
      warnings.push({
        line: unitLine + 1,
        message: "Block skipped: could not identify which statement it belongs to (likely a note or segment table).",
        detail: headerLines.join(" | ").slice(0, 120),
      });
      if (!includeUnidentifiedBlocks) continue;
    }

    const body = lines.slice(bodyStart, bodyEnd).map((t, i) => ({ text: t, no: bodyStart + i + 1 }));
    const { rows, stripped } = assembleRows(body, count, vocab);
    totalStripped += stripped;
    totalRows += rows.length;

    for (const row of rows) {
      const match = matchLabel(row.label, ctx.statement);
      if (!match) {
        if (collectUnmatched && row.label.length > 2) {
          unmatched.push({ line: row.line, label: row.label.slice(0, 120), values: row.values.map((v) => v.value) });
        }
        continue;
      }
      totalMatched += 1;

      row.values.forEach((token, i) => {
        const col = columns[i];
        if (!col) return;
        const key = `${col.scope}|${col.period}|${col.vintage}`;
        let series = seriesMap.get(key);
        if (!series) {
          series = {
            key,
            scope: col.scope,
            period: col.period,
            vintage: col.vintage,
            label: col.label,
            year: col.year,
            fields: {},
          };
          seriesMap.set(key, series);
        }
        if (!series.label && col.label) series.label = col.label;
        if (!series.year && col.year) series.year = col.year;

        const value = applyKindAndSign(token, match.entry, unit);
        const existing = series.fields[match.fieldId];

        // Keep the higher-confidence reading; break ties on the first sighting,
        // which in a statement is the headline line rather than a sub-total.
        const rank: Record<Confidence, number> = { high: 3, medium: 2, low: 1 };
        // Block order outranks confidence. The primary statements are printed
        // before the notes, so a later block repeating a label ("Taxation" in a
        // segment note) must not displace the headline figure - even when its
        // label happens to be a cleaner match.
        const keepExisting =
          existing !== undefined &&
          (existing.block < b || (existing.block === b && rank[existing.confidence] >= rank[match.confidence]));

        if (keepExisting) {
          if (existing.value !== value && existing.block === b && existing.confidence === match.confidence) {
            warnings.push({
              line: row.line,
              message: `Conflicting values for "${match.fieldId}" in ${key}`,
              detail: `kept ${existing.value} from "${existing.sourceLabel}", ignored ${value} from "${row.label.slice(0, 60)}"`,
            });
          }
          return;
        }

        series.fields[match.fieldId] = {
          value,
          raw: token.raw.trim(),
          sourceLabel: row.label.slice(0, 120),
          matchedKeyword: match.keyword,
          kind: match.entry.kind ?? "currency",
          confidence: match.confidence,
          line: row.line,
          block: b,
        };
      });
    }
  }

  const series = Array.from(seriesMap.values());

  // Check before deriving: derivation would make several identities trivially
  // true and hide a genuine extraction error.
  const checks = runConsistencyChecks(series);
  for (const c of checks) {
    if (c.passed) continue;
    warnings.push({
      line: -1,
      message: `Consistency check failed in ${c.seriesKey}: ${c.rule}`,
      detail: `${c.expected.toFixed(3)} vs ${c.actual.toFixed(3)} (${(c.drift * 100).toFixed(2)}% drift)`,
    });
  }

  if (doDerive) series.forEach(deriveMissing);

  // ── Pick the series a single-value consumer should use ───────────────────
  const primary =
    series
      .filter((s) => s.vintage === "current" && s.scope === "group")
      .sort((a, b) => Object.keys(b.fields).length - Object.keys(a.fields).length)[0] ?? null;

  // The primary series only ever holds one statement's worth of data, so merge
  // every current-year Group series into the app-shaped payload.
  const extractedData = EMPTY_EXTRACTED();
  // Balance sheet first, then the cumulative period, then the single quarter.
  // Each statement therefore fills its own fields from its own block, and the
  // quarter only supplies what the year-to-date columns did not carry.
  const mergeRank: Record<PeriodKind, number> = { balance: 0, ytd: 1, quarter: 2 };
  const mergeOrder = series
    .filter((s) => s.vintage === "current" && s.scope === "group")
    .sort((a, b) => mergeRank[a.period] - mergeRank[b.period]);

  for (const s of mergeOrder) {
    for (const [fieldId, val] of Object.entries(s.fields)) {
      const cat = FINANCIAL_DICTIONARY[fieldId]?.category ?? "advanced";
      // First writer wins unless a later, more confident reading turns up.
      const prev = extractedData[cat][fieldId];
      const rank: Record<Confidence, number> = { high: 3, medium: 2, low: 1 };
      if (prev && rank[prev.confidence] >= rank[val.confidence]) continue;
      extractedData[cat][fieldId] = {
        value: formatForStorage(val),
        confidence: val.confidence,
      };
    }
  }

  return {
    currency: unit.currency,
    unit,
    scaledTo: "millions",
    series: series.sort((a, b) => a.key.localeCompare(b.key)),
    primary,
    extractedData,
    unmatched,
    warnings,
    checks,
    stats: { blocks: unitRowIdx.length, rows: totalRows, matched: totalMatched, noteRefsStripped: totalStripped },
  };
}

/** Values are stored as strings in the app's ParsedDocument shape. */
function formatForStorage(v: ExtractedValue): string {
  const abs = Math.abs(v.value);
  const digits = v.kind === "currency" ? (abs >= 100 ? 2 : 4) : 4;
  return String(parseFloat(v.value.toFixed(digits)));
}

/* ========================================================================== */
/*  Convenience helpers                                                        */
/* ========================================================================== */

/** Looks up one field across every parsed series. */
export function getFieldAcrossSeries(result: FinancialParseResult, fieldId: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const s of result.series) {
    const f = s.fields[fieldId];
    if (f) out[s.key] = f.value;
  }
  return out;
}

/** Year-on-year change for a field within a given scope and period. */
export function yoyChange(result: FinancialParseResult, fieldId: string, scope: Scope = "group", period: PeriodKind = "ytd"): number | null {
  const cur = result.series.find((s) => s.scope === scope && s.period === period && s.vintage === "current")?.fields[fieldId];
  const prior = result.series.find((s) => s.scope === scope && s.period === period && s.vintage === "prior")?.fields[fieldId];
  if (!cur || !prior || prior.value === 0) return null;
  return ((cur.value - prior.value) / Math.abs(prior.value)) * 100;
}
