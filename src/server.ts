/**
 * @fileoverview
 * Application entry point — responsible for starting the Express server
 * and handling top-level process errors.
 *
 * This file should contain no business logic — only bootstrapping,
 * lifecycle hooks, and graceful shutdown handlers.
 */

import "module-alias/register"; // Enables TypeScript path aliases at runtime
import app from "./app";
import { env } from "./config/env";
import { logger } from "./lib/logger";

// -----------------------------------------------------------------------------
// 🚀 Start Server
// -----------------------------------------------------------------------------

app.listen(env.PORT, () => {
  logger.info(`🚀 Server running at http://localhost:${env.PORT}`);
});

// -----------------------------------------------------------------------------
// 🧩 Global Process Error Handlers
// -----------------------------------------------------------------------------

/**
 * Handle unhandled promise rejections.
 * These are often programming errors (e.g., missing await).
 * Logs them and exits process to avoid running in an unknown state.
 */
process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled Promise Rejection", { reason });
  process.exit(1);
});

/**
 * Handle uncaught exceptions (synchronous errors).
 * Always log and terminate to prevent inconsistent runtime behavior.
 */
process.on("uncaughtException", (err) => {
  logger.error("Uncaught Exception", { message: err.message, stack: err.stack });
  process.exit(1);
});

/**
 * Gracefully handle termination signals (e.g., Docker stop, Ctrl+C).
 * Allows async cleanup like closing DB connections before exit.
 */
process.on("SIGTERM", () => {
  logger.info("Received SIGTERM — shutting down gracefully...");
  process.exit(0);
});

process.on("SIGINT", () => {
  logger.info("Received SIGINT — terminating application...");
  process.exit(0);
});
