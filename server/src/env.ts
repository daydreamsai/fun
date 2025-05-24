import dotenv from "dotenv";
import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  STRIPE_SECRET_KEY: z.string(),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string(),
  OPENROUTER_PROVISIONING_API_KEY: z.string(),
  CLIENT_URL: z.string().url(),
  STRIPE_WEBHOOK_SECRET: z.string(),
  JWT_SECRET: z.string().default("your-secret-key"),
});

// Validate environment variables
export const env = envSchema.parse(Bun.env);
