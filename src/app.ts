/**
 * @fileoverview
 * Express application setup — responsible for initializing middleware,
 * security, routes, and global error handling.
 *
 * This file defines the core web server behavior but should not include
 * any business logic or database access.
 */

import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import compression from "compression";

import { env } from "./config/env";
import authRoutes from "./modules/auth";
import healthRoutes from "./modules/health";
import { errorHandler } from "./middleware/error";
import { attachRequestId, httpLogger } from "./lib/logger/requestLogger";

const app = express();

// -----------------------------------------------------------------------------
// 🔍 Request Tracing & Logging
// -----------------------------------------------------------------------------

// Assign a unique correlation ID to every incoming request
// and log all HTTP traffic (method, status, latency, etc.)
app.use(attachRequestId);
app.use(httpLogger);

// -----------------------------------------------------------------------------
// 🛡️ Security & Core Middleware
// -----------------------------------------------------------------------------

// Sets various HTTP headers to secure the app
app.use(helmet());

// Enable CORS for allowed origins
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));

// Parse incoming JSON payloads with a 1MB limit
app.use(express.json({ limit: "1mb" }));

// Parse cookies from request headers
app.use(cookieParser());

// Enable gzip compression for responses
app.use(compression());

// -----------------------------------------------------------------------------
// ⚙️ Rate Limiting
// -----------------------------------------------------------------------------

// Prevent brute-force login attempts by limiting auth route frequency
app.use("/auth", rateLimit({ windowMs: 60_000, max: 10 }));

// -----------------------------------------------------------------------------
// 🚏 API Routes
// -----------------------------------------------------------------------------

app.use("/auth", authRoutes);
app.use("/health", healthRoutes);

// -----------------------------------------------------------------------------
// ❌ Global Error Handler
// -----------------------------------------------------------------------------

// Centralized error response middleware (last in chain)
app.use(errorHandler);

export default app;
