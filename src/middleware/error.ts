import { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger";

export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
  logger.error("Unhandled Error", {
    message: err.message,
    stack: err.stack,
    requestId: (req as any).id,
    url: req.originalUrl,
    method: req.method,
  });

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error",
    requestId: (req as any).id,
  });
}
