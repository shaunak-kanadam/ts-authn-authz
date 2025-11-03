import "dotenv/config";
import { z } from "zod";

/**
 * 🌍 Environment Schema
 * Defines and validates all required environment variables at startup.
 * 
 * This version is simplified for a Resend-only setup.
 * Prevents runtime errors by validating all config values.
 */
const envSchema = z.object({
  // ---------------------------------------------------------------------------
  // 🌐 Core Environment
  // ---------------------------------------------------------------------------
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

  PORT: z
    .string()
    .default("4000")
    .transform((val) => parseInt(val, 10)),

  APP_NAME: z.string().default("JMeter SaaS"), // ✅ Added for email branding
  APP_URL: z.string().url().default("http://localhost:4000"),
  CORS_ORIGIN: z.string().min(1, "CORS_ORIGIN is required"),

  // ---------------------------------------------------------------------------
  // 🗄️ Database & Cache
  // ---------------------------------------------------------------------------
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  REDIS_URL: z.string().optional(),

  // ---------------------------------------------------------------------------
  // 🔐 JWT Keys & Auth Config
  // ---------------------------------------------------------------------------
  JWT_PRIVATE_KEY_PEM: z.string().min(1, "JWT_PRIVATE_KEY_PEM is required"),
  JWT_PUBLIC_KEY_PEM: z.string().min(1, "JWT_PUBLIC_KEY_PEM is required"),

  ACCESS_TOKEN_TTL: z.string().default("15m"), // e.g. "15m"
  REFRESH_TOKEN_TTL_DAYS: z
    .string()
    .default("14")
    .transform((val) => parseInt(val, 10)), // e.g. 14 days

  // ---------------------------------------------------------------------------
  // 📧 Email (Resend)
  // ---------------------------------------------------------------------------
  EMAIL_PROVIDER: z.literal("resend").default("resend"), // Always Resend
  RESEND_API_KEY: z.string().min(1, "RESEND_API_KEY is required"),

  // ---------------------------------------------------------------------------
  // 🧠 Security Settings
  // ---------------------------------------------------------------------------
  RATE_LIMIT_MAX: z
    .string()
    .default("100")
    .transform((v) => parseInt(v, 10)), // per minute
  RATE_LIMIT_WINDOW_MS: z
    .string()
    .default("60000")
    .transform((v) => parseInt(v, 10)), // 1 minute default

  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

// ✅ Validate and parse env
const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment configuration:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
