import fs from "fs";
import path from "path";

const LOG_FILE = path.join(process.env.FINCORE_DB_PATH || "./fincore_db", "server.log");

// Ensure folder structure for logs is initialized
try {
  const dir = path.dirname(LOG_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
} catch {}

export const logger = {
  info(message: string, ...meta: any[]) {
    this.log("INFO", message, ...meta);
  },
  warn(message: string, ...meta: any[]) {
    this.log("WARN", message, ...meta);
  },
  error(message: string, ...meta: any[]) {
    this.log("ERROR", message, ...meta);
  },
  log(level: string, message: string, ...meta: any[]) {
    const timestamp = new Date().toISOString();
    const metaString = meta.length > 0 ? " | " + JSON.stringify(meta) : "";
    const logLine = `[${timestamp}] [${level}] ${message}${metaString}\n`;
    
    // Print to console
    if (level === "ERROR") {
      console.error(logLine.trim());
    } else if (level === "WARN") {
      console.warn(logLine.trim());
    } else {
      console.log(logLine.trim());
    }

    // Append to file
    try {
      fs.appendFileSync(LOG_FILE, logLine, "utf8");
    } catch (err) {
      console.error("Failed to write to server log file:", err);
    }
  }
};
