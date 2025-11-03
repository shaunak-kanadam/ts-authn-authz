/**
 * @fileoverview
 * Winston-based centralized logger configuration.
 * Handles console output, daily file rotation, and structured logs.
 * 
 * Used throughout the app for consistent logging via `getLogger(moduleName)`.
 */

import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import path from "path";

// -----------------------------------------------------------------------------
// 📁 Log Directory
// -----------------------------------------------------------------------------

// All logs will be stored in the project root under /logs
const logDir = path.join(process.cwd(), "logs");

// -----------------------------------------------------------------------------
// 🧩 Log Format
// -----------------------------------------------------------------------------

// Custom log format: timestamp + level + message + optional metadata
const logFormat = winston.format.printf(({ level, message, timestamp, stack, ...meta }) => {
  const metaString = Object.keys(meta).length ? JSON.stringify(meta) : "";
  return `[${timestamp}] [${level.toUpperCase()}] ${message} ${stack || ""} ${metaString}`;
});

// -----------------------------------------------------------------------------
// 🚚 Log Transports
// -----------------------------------------------------------------------------

// Logs are written to console (for dev) and rotated daily to files (for prod)
const transports = [
  // Console logs (colorized, verbose in dev mode)
  new winston.transports.Console({
    level: process.env.NODE_ENV === "production" ? "info" : "debug",
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
  }),

  // General application logs (rotated daily, 14 days retention)
  new DailyRotateFile({
    dirname: logDir,
    filename: "app-%DATE%.log",
    datePattern: "YYYY-MM-DD",
    maxFiles: "14d",
    zippedArchive: true,
    level: "info",
  }),

  // Error-specific logs (rotated daily, 30 days retention)
  new DailyRotateFile({
    dirname: logDir,
    filename: "errors-%DATE%.log",
    datePattern: "YYYY-MM-DD",
    maxFiles: "30d",
    zippedArchive: true,
    level: "error",
  }),
];

// -----------------------------------------------------------------------------
// 🏗️ Logger Instance
// -----------------------------------------------------------------------------

// Main Winston logger used globally throughout the app
export const logger = winston.createLogger({
  level: "debug",
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.errors({ stack: true }),
    logFormat
  ),
  transports,
  exceptionHandlers: [
    new winston.transports.File({ filename: "logs/exceptions.log" }),
  ],
  rejectionHandlers: [
    new winston.transports.File({ filename: "logs/rejections.log" }),
  ],
});

// -----------------------------------------------------------------------------
// 🧱 Logger Factory
// -----------------------------------------------------------------------------

/**
 * Returns a child logger scoped to a specific module or service.
 * Automatically includes the `module` name in log metadata.
 *
 * @example
 * const log = getLogger("AuthService");
 * log.info("User login succeeded");
 */
export function getLogger(moduleName: string) {
  return logger.child({ module: moduleName });
}
