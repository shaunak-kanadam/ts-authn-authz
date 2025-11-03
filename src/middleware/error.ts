/**
 * @fileoverview
 * Centralized Express error-handling middleware.
 *
 * Captures all unhandled application errors, logs them via Winston,
 * and returns a consistent JSON response. Ensures that sensitive
 * internal details are hidden in production.
 */

import type { Request, Response, NextFunction } from "express";
import { logger } from "@/lib/logger";

// -----------------------------------------------------------------------------
// ❌ Global Error Handler
// -----------------------------------------------------------------------------

/**
 * Express global error-handling middleware.
 * Must be registered after all routes and other middleware.
 */
export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
  const requestId = (req as any).id;
  const statusCode = err.status || 500;

  // Log full error details for observability (not exposed to client)
  logger.error("Unhandled Application Error", {
    message: err.message,
    stack: err.stack,
    statusCode,
    method: req.method,
    url: req.originalUrl,
    requestId,
  });

  // Hide internal error details in production
  const isProd = process.env.NODE_ENV === "production";
  const responseMessage = isProd
    ? "Internal server error"
    : err.message || "Unknown error";

  res.status(statusCode).json({
    success: false,
    message: responseMessage,
    requestId,
  });
}
