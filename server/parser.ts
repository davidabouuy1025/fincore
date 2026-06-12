import Tesseract from "tesseract.js";
import fs from "fs";
import os from "os";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

/**
 * Perform optical character recognition on an image file
 */
export async function performOCR(filePath: string): Promise<string> {
  try {
    const result = await Tesseract.recognize(filePath, "eng");
    return result.data.text || "";
  } catch (err) {
    console.error("[OCR ERROR] Failed to recognize image:", err);
    return "";
  }
}

export async function performPdfOCR(filePath: string): Promise<string> {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "fincore-pdf-ocr-"));
  const outputPrefix = path.join(tempDir, "page");

  try {
    try {
      await execFileAsync("pdftoppm", ["-png", "-r", "200", filePath, outputPrefix], { timeout: 120000 });
    } catch {
      await execFileAsync("magick", ["-density", "200", filePath, path.join(tempDir, "page-%d.png")], { timeout: 120000 });
    }

    const pageImages = fs
      .readdirSync(tempDir)
      .filter((file) => file.toLowerCase().endsWith(".png"))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
      .map((file) => path.join(tempDir, file));

    if (pageImages.length === 0) {
      return performOCR(filePath);
    }

    const pages: string[] = [];
    for (let i = 0; i < pageImages.length; i++) {
      const pageText = await performOCR(pageImages[i]);
      pages.push(`## Page ${i + 1}\n\n${pageText}`);
    }

    return pages.join("\n\n").trim();
  } catch (err) {
    console.error("[OCR ERROR] Failed to render scanned PDF pages:", err);
    return performOCR(filePath);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

/**
 * Convert extracted document text into plain markdown for storage and AI analysis.
 */
export function toPureMarkdown(text: string, sourceName?: string): string {
  const normalized = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (!normalized) return "";

  const title = sourceName ? `# ${sourceName.replace(/\.[^.]+$/, "")}` : "# Extracted Document";
  return `${title}\n\n${normalized}`;
}

/**
 * Extracts a financial value from numerical strings, handling negative structures like (1,234)
 */
export function extractValue(text: string, keywords: string[]): { value: string | null; confidence: "high" | "medium" | "low" } {
  const lines = text.split("\n");
  
  for (const keyword of keywords) {
    const kwRegex = new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (kwRegex.test(line)) {
        // Look for numbers on the same line
        const sameLineNum = extractNumberFromLine(line, keyword);
        if (sameLineNum) {
          return { value: sameLineNum, confidence: "high" };
        }
        
        // If not found, check next line
        if (i + 1 < lines.length) {
          const nextLineNum = extractNumberFromLine(lines[i + 1], "");
          if (nextLineNum && lines[i + 1].trim().length < 40) {
            return { value: nextLineNum, confidence: "medium" };
          }
        }
      }
    }
  }
  
  return { value: null, confidence: "low" };
}

function extractNumberFromLine(line: string, keyword: string): string | null {
  // Remove keyword from the line to avoid matching numbers in headers/dates if any
  let normalizedLine = line;
  if (keyword) {
    normalizedLine = line.replace(new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), "");
  }
  
  // Regex to look for numbers, accounting for decimals, commas, parentheses (negative), and minus signs
  // Matches: 12,345, 12345, (1,234.56), -123.45
  const numRegex = /(?:(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?|\b\d+\b)/;
  
  // Handle negativity indicators
  const negMatches = [
    /\(([\d,]+\.?\d*)\)/, // Parentheses like (12,345.50)
    /-\s*([\d,]+\.?\d*)/,  // Minus sign like -12,345
  ];

  for (const regex of negMatches) {
    const match = normalizedLine.match(regex);
    if (match && match[1]) {
      const parsedNum = cleanAndNormalizeNum(match[1]);
      if (parsedNum) {
        return `-${parsedNum}`;
      }
    }
  }

  const standardMatch = normalizedLine.match(numRegex);
  if (standardMatch && standardMatch[0]) {
    return cleanAndNormalizeNum(standardMatch[0]);
  }

  return null;
}

function cleanAndNormalizeNum(val: string): string | null {
  const cleaned = val.replace(/[^0-9.]/g, "");
  const num = parseFloat(cleaned);
  if (isNaN(num)) return null;
  // Return the rounded integer or clean number format string
  return Math.round(num).toString();
}
