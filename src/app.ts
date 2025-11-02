import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import compression from "compression";
import { env } from "./config/env";
import authRoutes from "./modules/auth";
import { errorHandler } from "./middleware/error";
import healthRoutes from "./modules/health";
import { attachRequestId, httpLogger } from "./lib/logger/requestLogger";


const app = express();

// 🧩 Request ID + HTTP access logs
app.use(attachRequestId);
app.use(httpLogger);

// Security middlewares
app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(compression());

// Rate limiting for login/register
app.use("/auth", rateLimit({ windowMs: 60_000, max: 10 }));

// Routes
app.use("/auth", authRoutes);
app.use("/health", healthRoutes);

// Error handler
app.use(errorHandler);

export default app;

