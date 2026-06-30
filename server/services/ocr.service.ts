import fs from "fs";
import pdfParse from "pdf-parse";
import { createWorker } from "tesseract.js";
import { IOcrService } from "../controllers/report.controller";

export class OcrService implements IOcrService {
  /**
   * Evaluates a file's format and extracts clean textual strings natively or via OCR fallback
   */
  public async extractRawText(file: Express.Multer.File): Promise<{ text: string; docType: string }> {
    let text = "";
    let docType = "DIGITAL_PDF";

    try {
      if (file.mimetype === "application/pdf") {
        const buffer = fs.readFileSync(file.path);
        const pdfData = await pdfParse(buffer);
        text = pdfData.text || "";

        // If it's an empty scanned document or image-heavy file, fallback to OCR
        if (text.trim().length < 200) {
          console.log(`[OCR] Scanned PDF detected, fallback triggered: ${file.originalname}`);
          text = await this.performOCR(file.path);
          docType = "SCANNED_PDF";
        }
      } else if (file.mimetype.startsWith("image/")) {
        console.log(`[OCR] Direct image processing triggered: ${file.originalname}`);
        text = await this.performOCR(file.path);
        docType = "IMAGE";
      }
    } catch (parseErr) {
      console.warn(`[WARN] Native text parser failed for ${file.originalname}. Retrying with full image OCR...`);
      try {
        text = await this.performOCR(file.path);
        docType = "SCANNED_PDF";
      } catch {
        text = "";
      }
    }

    return { text, docType };
  }

  /**
   * Standardized OCR task loop
   */
  private async performOCR(filePath: string): Promise<string> {
    const worker = await createWorker("eng");
    try {
      const { data: { text } } = await worker.recognize(filePath);
      return text;
    } finally {
      await worker.terminate();
    }
  }
}