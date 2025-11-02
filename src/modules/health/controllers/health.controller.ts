import type { Request, Response } from "express";
import { prisma } from "../../../lib/prisma";

export async function healthController(req: Request, res: Response) {
  const start = performance.now();

  // Basic DB check
  let dbStatus = "ok";
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (e) {
    dbStatus = "error";
  }

  const latency = (performance.now() - start).toFixed(2);

  res.status(200).json({
    status: "ok",
    uptime: process.uptime(),
    latency: `${latency}ms`,
    db: dbStatus,
    timestamp: new Date().toISOString(),
  });
}
