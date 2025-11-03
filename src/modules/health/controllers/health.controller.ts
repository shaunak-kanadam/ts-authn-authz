/**
 * @fileoverview
 * Health check controller — verifies application uptime, database connectivity,
 * and response latency. Used by load balancers and monitoring systems.
 */

import type { Request, Response } from "express";
import { prisma } from "@/lib/prisma";
import { getLogger } from "@/lib/logger";

const log = getLogger("HealthController");

/**
 * GET /health
 *
 * Lightweight endpoint that returns system health metrics.
 * Includes DB check, latency, uptime, and timestamp.
 */
export async function healthController(req: Request, res: Response) {
  const start = performance.now();
  let dbStatus = "ok";

  try {
    // Basic database connectivity check
    await prisma.$queryRaw`SELECT 1`;
  } catch (e) {
    dbStatus = "error";
    log.error("Database health check failed", {
      error: (e as Error).message,
      stack: (e as Error).stack,
      requestId: (req as any).id,
    });
  }

  const latency = (performance.now() - start).toFixed(2);
  const uptime = process.uptime();
  const timestamp = new Date().toISOString();

  // Log structured health metrics for observability dashboards
  log.info("Health check executed", {
    dbStatus,
    latency: `${latency}ms`,
    uptime,
    timestamp,
    requestId: (req as any).id,
  });

  res.status(200).json({
    status: "ok",
    uptime,
    latency: `${latency}ms`,
    db: dbStatus,
    timestamp,
  });
}
