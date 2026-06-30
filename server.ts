import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import * as apiRoutesModule from "./server/routes/api.routes";

// Load configuration keys from the environment file
dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 5000;
const DB_ROOT = process.env.FINCORE_DB_PATH || "./fincore_db";
const STORAGE_ROOT = path.join(DB_ROOT, "original_reports");

// Dynamically resolve default or named exports to prevent module instantiation errors
const apiRouter = 
  (apiRoutesModule as any).default || 
  (apiRoutesModule as any).router || 
  (apiRoutesModule as any).apiRouter || 
  apiRoutesModule;

/**
 * Ensures the physical flat-file directory nodes exist on startup.
 */
function initializeDatabaseDirectories() {
  [DB_ROOT, STORAGE_ROOT].forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

async function startServer() {
  // Initialize file-system repositories
  initializeDatabaseDirectories();

  // Apply essential global parsing middlewares
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  // Expose the raw uploaded financial files statically
  app.use("/reports", express.static(STORAGE_ROOT));

  // Mount the decoupled routing layer
  app.use("/api", apiRouter);

  // Global fallback endpoint handler
  app.use("/api/*", (req, res) => {
    res.status(404).json({ error: `API route not found: ${req.method} ${req.path}` });
  });

  // Attach the Vite pipeline or statically serve pre-built SPA dist folders
  if (process.env.NODE_ENV !== "production") {
    console.log("🚀 [FINCORE] Launching system in DEVELOPMENT mode with Vite Middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("📦 [FINCORE] Launching system in PRODUCTION mode...");
    const distPath = path.join(process.cwd(), "dist");
    
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    } else {
      console.warn("⚠️ [WARN] Production asset 'dist' folder not detected. Running without SPA static server.");
    }
  }

  // Bind listener to start accepting operations
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`\n✅ FINCORE Server running → http://localhost:${PORT}`);
    console.log(`   Database Root Path: ${path.resolve(DB_ROOT)}`);
    console.log(`   Storage Workspace : ${path.resolve(STORAGE_ROOT)}\n`);
  });
}

startServer().catch((error) => {
  console.error("❌ [FATAL ERROR] Failed to start Fincore application server:", error);
  process.exit(1);
});