import fs from "fs";
import parsePdf from "pdf-parse";
import { IOcrService } from "../controllers/report.controller";
import { performOCR, performPdfOCR } from "../parser";

function parsePagesRange(rangeStr: string): number[] {
  if (!rangeStr) return [];
  const clean = rangeStr.replace(/[()\[\]]/g, "").trim();
  if (clean.toLowerCase() === "all" || !clean) return [];

  const pages: number[] = [];
  const parts = clean.split(",");
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    if (trimmed.includes("-")) {
      const subparts = trimmed.split("-");
      const start = parseInt(subparts[0].trim(), 10);
      const end = parseInt(subparts[1]?.trim() || "", 10);
      if (!isNaN(start) && !isNaN(end)) {
        const minVal = Math.min(start, end);
        const maxVal = Math.max(start, end);
        for (let i = minVal; i <= maxVal; i++) {
          if (i > 0) pages.push(i);
        }
      }
    } else {
      const num = parseInt(trimmed, 10);
      if (!isNaN(num) && num > 0) {
        pages.push(num);
      }
    }
  }
  return Array.from(new Set(pages)).sort((a, b) => a - b);
}

export class OcrService implements IOcrService {
  /**
   * Evaluates a file's format and extracts clean textual strings natively or via OCR fallback
   */
  public async extractRawText(file: Express.Multer.File, selectedPages?: string): Promise<{ text: string; docType: string }> {
    let text = "";
    let docType = "DIGITAL_PDF";
    const allowedPages = selectedPages ? parsePagesRange(selectedPages) : [];

    try {
      if (file.mimetype === "application/pdf" || file.path.toLowerCase().endsWith(".pdf")) {
        const buffer = fs.readFileSync(file.path);
        
        let options: any = undefined;
        if (allowedPages.length > 0) {
          options = {
            pagerender: (pageData: any) => {
              const pageNum = pageData.pageIndex + 1;
              if (!allowedPages.includes(pageNum)) {
                return Promise.resolve("");
              }
              return pageData.getTextContent().then((textContent: any) => {
                let pageText = "";
                let lastY;
                for (const item of textContent.items) {
                  if (lastY === item.transform[5] || !lastY) {
                    pageText += item.str;
                  } else {
                    pageText += "\n" + item.str;
                  }
                  lastY = item.transform[5];
                }
                return pageText;
              });
            }
          };
        }

        const pdfData = await parsePdf(buffer, options);
        text = pdfData.text || "";

        // If it's an empty scanned document or image-heavy file, fallback to OCR
        if (text.trim().length < 200) {
          console.log(`[OCR] Scanned PDF detected, fallback triggered: ${file.originalname}`);
          try {
            text = await performPdfOCR(file.path, allowedPages);
          } catch {
            text = "";
          }
          docType = "SCANNED_PDF";
        }
      } else if (file.mimetype.startsWith("image/")) {
        console.log(`[OCR] Direct image processing triggered: ${file.originalname}`);
        try {
          text = await performOCR(file.path);
        } catch {
          text = "";
        }
        docType = "IMAGE";
      }
    } catch (parseErr) {
      console.warn(`[WARN] Native text parser failed for ${file.originalname}. Retrying with full image OCR...`);
      try {
        text = await performPdfOCR(file.path, allowedPages);
        docType = "SCANNED_PDF";
      } catch {
        text = "";
      }
    }

    return { text, docType };
  }
}