/**
 * Example: wiring the parser into the existing ingest flow.
 *
 * Run with:  npx tsx example.usage.ts <path-to-report.txt>
 *
 * This file imports its two dependencies as plain siblings
 * (./markdownParser, ./constants) because all three files are delivered
 * flat in the same folder. If you move them into a src/ directory, update
 * these two import paths to match - that mismatch is the single most
 * common cause of "it doesn't work" with this parser.
 */
import fs from "node:fs";
import path from "node:path";
import { parseFinancialMarkdown, yoyChange } from "./markdownParser.js";
import { formatMillions, FIELD_LABELS } from "./constants.js";

function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("Usage: npx tsx example.usage.ts <path-to-report.txt>");
    process.exit(1);
  }
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${path.resolve(filePath)}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(filePath, "utf8");
  const result = parseFinancialMarkdown(raw);

  console.log("currency:", result.currency, "| printed unit:", result.unit.label, "| values scaled to:", result.scaledTo);

  if (result.warnings.some((w) => w.message.startsWith("No currency-unit header row"))) {
    console.error("\nNo statement tables were recognised in this file.");
    console.error("This usually means the file isn't a Bursa quarterly/annual report,");
    console.error("or its RM'000 / RM'm unit header didn't survive whatever produced this .txt.");
    process.exit(1);
  }

  console.log(`\nSeries found (${result.series.length}):`);
  for (const s of result.series) console.log(`  ${s.key.padEnd(26)} ${Object.keys(s.fields).length} fields`);

  if (result.series.length === 0) {
    console.error("\nNo series were extracted. See result.warnings for why each block was skipped.");
    console.error(JSON.stringify(result.warnings.slice(0, 5), null, 2));
    process.exit(1);
  }

  // Prefer the fullest current-period Group series, whatever it's called -
  // never assume a specific key like "group|ytd|current" exists, since a
  // company-only or single-period filing won't have one. On a tie, prefer
  // Group over Company and the income statement over the balance sheet.
  const periodWeight: Record<string, number> = { ytd: 2, quarter: 1, balance: 0 };
  const best =
    result.series
      .filter((s) => s.vintage === "current")
      .sort((a, b) => {
        const fieldDiff = Object.keys(b.fields).length - Object.keys(a.fields).length;
        if (fieldDiff !== 0) return fieldDiff;
        const scopeDiff = (a.scope === "group" ? 0 : 1) - (b.scope === "group" ? 0 : 1);
        if (scopeDiff !== 0) return scopeDiff;
        return periodWeight[b.period] - periodWeight[a.period];
      })[0] ?? result.series[0];

  console.log(`\nBiggest current-period series: ${best.key}`);
  for (const [id, v] of Object.entries(best.fields).slice(0, 12)) {
    console.log(`  ${(FIELD_LABELS[id] ?? id).padEnd(30)} ${formatMillions(v.value).padEnd(16)} ${v.confidence}${v.derived ? " (derived)" : ""}`);
  }

  console.log("\nYoY (group, YTD, if present):");
  for (const f of ["netProfit", "profitBeforeTax", "totalAssets"]) {
    const c = yoyChange(result, f, "group", "ytd");
    console.log(`  ${f.padEnd(20)} ${c === null ? "n/a" : c.toFixed(1) + "%"}`);
  }

  const failedChecks = result.checks.filter((c) => !c.passed);
  console.log(`\nConsistency checks: ${result.checks.length - failedChecks.length}/${result.checks.length} passed`);
  for (const c of failedChecks) console.log(`  FAIL ${c.seriesKey} ${c.rule}: ${c.expected} vs ${c.actual}`);

  console.log("\nFor ParsedDocument.extractedData.incomeStatement:");
  console.log(JSON.stringify(result.extractedData, null, 2));
}

main();