import "dotenv/config";
import { z } from "zod";

// 🧱 Define a schema for your environment variables
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

  PORT: z
    .string()
    .default("4000")
    .transform((val) => parseInt(val, 10)),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  CORS_ORIGIN: z.string().min(1, "CORS_ORIGIN is required"),

  JWT_PRIVATE_KEY_PEM: z.string().min(1, "JWT_PRIVATE_KEY_PEM is required"),
  JWT_PUBLIC_KEY_PEM: z.string().min(1, "JWT_PUBLIC_KEY_PEM is required"),

  ACCESS_TOKEN_TTL: z.string().default("15m"),
  REFRESH_TOKEN_TTL_DAYS: z
    .string()
    .default("14")
    .transform((val) => parseInt(val, 10)),

  REDIS_URL: z.string().optional(),
});

// ✅ Parse and validate environment variables
const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment configuration:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
