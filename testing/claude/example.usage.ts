/**
 * Example: wiring the parser into the existing ingest flow.
 */
import fs from "node:fs";
import { parseFinancialMarkdown, yoyChange } from "./markdownParser";
import { formatMillions, FIELD_LABELS } from "./constants";

const result = parseFinancialMarkdown(fs.readFileSync("../rhb.pdf", "utf8"));
console.log(result)
// console.log("currency:", result.currency, "| printed unit:", result.unit.label, "| values scaled to:", result.scaledTo);
// console.log("\nSeries found:");
// for (const s of result.series) console.log(`  ${s.key.padEnd(26)} ${Object.keys(s.fields).length} fields`);

// console.log("\nGroup, year-to-date, current period:");
// const ytd = result.series.find((s) => s.key === "group|ytd|current")!;
// console.log("Variable ytd: " + ytd)
// for (const [id, v] of Object.entries(ytd.fields).slice(0, 12)) {
//   console.log(`  ${(FIELD_LABELS[id] ?? id).padEnd(30)} ${formatMillions(v.value).padEnd(16)} ${v.confidence}${v.derived ? " (derived)" : ""}`);
// }

// console.log("\nYoY (group, YTD):");
// for (const f of ["netProfit", "profitBeforeTax", "totalAssets"]) {
//   const c = yoyChange(result, f);
//   console.log(`  ${f.padEnd(20)} ${c === null ? "n/a" : c.toFixed(1) + "%"}`);
// }

// console.log("\nFor ParsedDocument.extractedData:");
// console.log(JSON.stringify(result.extractedData.incomeStatement, null, 2).slice(0, 400));
