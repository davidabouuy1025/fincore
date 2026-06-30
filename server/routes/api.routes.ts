import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";

import { ReportController } from "../controllers/report.controller";
// Concrete Class Imports
import { OcrService } from "../services/ocr.service";
import { ExtractionService } from "../services/extraction.service";
import { StorageService } from "../services/storage.service";
import { AiService } from "../services/ai.service";

// --- Infrastructure Configuration ---
const DB_ROOT = process.env.FINCORE_DB_PATH || "./fincore_db";
const STORAGE_ROOT = path.join(DB_ROOT, "original_reports");

if (!fs.existsSync(STORAGE_ROOT)) {
  fs.mkdirSync(STORAGE_ROOT, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, STORAGE_ROOT),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, "_")}`),
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

// --- Container Instantiation Layer ---
const ocrService = new OcrService();
const extractionService = new ExtractionService();
const storageService = new StorageService();
const aiService = new AiService();

const reportController = new ReportController(
  ocrService,
  extractionService,
  storageService,
  aiService
);

const router = Router();

// --- Routing Manifest Map ---
router.post("/parse", upload.array("reports"), reportController.parseReports);
router.post("/save", reportController.saveReports);
router.get("/reports/:year/:sector", reportController.getReports);
router.get("/archive", reportController.getArchive);
router.post("/ai-insights", reportController.getAiInsights);

export { router as apiRouter };