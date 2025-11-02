/**
 * @fileoverview
 * HTTP request logging and correlation ID middleware.
 *
 * - Assigns a unique request ID (UUID) to each incoming request.
 * - Logs structured HTTP access data (method, status, latency, etc.).
 * - Integrates with Winston for unified application logging.
 */

import morgan from "morgan";
import { v4 as uuidv4 } from "uuid";
import type { Request, Response, NextFunction } from "express";
import { logger } from "./index";

// -----------------------------------------------------------------------------
// 🧩 Correlation ID Middleware
// -----------------------------------------------------------------------------

/**
 * Attaches a unique correlation ID to every request.
 * This ID propagates through logs to enable end-to-end tracing.
 */
export function attachRequestId(req: Request, res: Response, next: NextFunction) {
  req.id = uuidv4();
  res.setHeader("X-Request-Id", req.id);
  next();
}

// -----------------------------------------------------------------------------
// 🧾 HTTP Logging (Morgan + Winston Integration)
// -----------------------------------------------------------------------------

// Register a custom token so Morgan can include the request ID in logs
morgan.token("id", (req: any) => req.id);

/**
 * Morgan middleware configured for structured JSON logging.
 * Captures request metadata and passes it into the Winston logger.
 */
export const httpLogger = morgan(
  (tokens, req, res) =>
    JSON.stringify({
      time: tokens.date(req, res, "iso"),
      id: tokens.id(req, res),
      method: tokens.method(req, res),
      url: tokens.url(req, res),
      status: tokens.status(req, res),
      responseTime: `${tokens["response-time"](req, res)}ms`,
      userAgent: tokens["user-agent"](req, res),
    }),
  {
    stream: {
      write: (message) => {
        try {
          const data = JSON.parse(message);
          logger.info("HTTP", data);
        } catch (err) {
          logger.error("Failed to parse HTTP log message", { message });
        }
      },
    },
  }
);
