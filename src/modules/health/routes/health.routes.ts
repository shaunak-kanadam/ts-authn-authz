/**
 * @fileoverview
 * Defines the `/health` route for application uptime and service checks.
 * Used by monitoring systems (e.g., load balancers, uptime bots).
 */

import { Router } from "express";
import { healthController } from "../controllers/health.controller";

const router = Router();

/**
 * GET /health
 * Returns current uptime, DB connectivity status, and response latency.
 */
router.get("/", healthController);

export default router;
