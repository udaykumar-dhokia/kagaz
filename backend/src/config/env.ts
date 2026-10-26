import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  DATABASE_URL: z.string().default("postgres://postgres:postgres@localhost:5432/kagaz"),
  JWT_SECRET: z.string().default("kagaz-super-secret-jwt-key-2026-change-in-prod"),
  APP_BASE_URL: z.string().default("http://localhost:3000"),
});

export const env = envSchema.parse(process.env);

