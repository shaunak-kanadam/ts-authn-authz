import type { Request, Response } from "express";
import { prisma } from "@/lib/prisma";
import { getLogger } from "@/lib/logger";

const log = getLogger("HealthController");

export async function healthController(req: Request, res: Response) {
  const start = performance.now();
  let dbStatus = "ok";

  try {
    // Simple DB connectivity test
    await prisma.$queryRaw`SELECT 1`;
  } catch (e) {
    dbStatus = "error";
    log.error("❌ Database health check failed", {
      error: (e as Error).message,
      stack: (e as Error).stack,
      requestId: (req as any).id,
    });
  }

  const latency = (performance.now() - start).toFixed(2);
  const uptime = process.uptime();
  const timestamp = new Date().toISOString();

  // ✅ Structured info log for observability dashboards
  log.info("✅ Health check executed", {
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
