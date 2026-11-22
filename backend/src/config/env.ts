import { z } from "zod";
import 'dotenv/config';

const envSchema = z.object({
  // Supabase
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // Database
  DATABASE_URL: z.string().url().startsWith("postgresql://"),
  DIRECT_URL: z.string().url().startsWith("postgresql://"),

  // App
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(3000),
  API_PREFIX: z.string().default("/api/v1"),
  FRONTEND_URL: z.string().default("http://localhost:5500"),

  // Auth
  JWT_SECRET: z.string().min(32),

  // Optional
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().email().optional(),
  REDIS_URL: z.string().url().optional(),
  SENTRY_DSN: z.string().url().optional(),
});

export type Env = z.infer<typeof envSchema> & {
  FRONTEND_ORIGINS: string[];
};

let cachedEnv: Env | null = null;

export function getEnv(): Env {
  if (cachedEnv) return cachedEnv;

  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error("❌ Invalid environment variables:");
    console.error(result.error.flatten().fieldErrors);
    process.exit(1);
  }

  const baseEnv = result.data;
  
  // Parse comma-separated FRONTEND_URL into array
  const frontendOrigins = baseEnv.FRONTEND_URL
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  cachedEnv = {
    ...baseEnv,
    FRONTEND_ORIGINS: frontendOrigins,
  };
  return cachedEnv;
}

export const env = getEnv();