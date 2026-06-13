import { registerAs } from '@nestjs/config'
import { z } from 'zod'

export type AppConfig = {
  port: number
  databaseUrl: string
  redisUrl: string
  jwtAccessSecret: string
  jwtIssuer: string
  accessTokenTtlSeconds: number
  refreshTokenTtlSeconds: number
  authRateLimitWindowSeconds: number
  authLoginRateLimitMax: number
  authRefreshRateLimitMax: number
  supabaseUrl?: string
  supabaseServiceRoleKey?: string
  supabaseStorageBucket?: string
}

const optionalString = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().optional(),
)

const envSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_ISSUER: z.string().min(1).default('h-erp-api'),
  ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().min(60).default(900),
  REFRESH_TOKEN_TTL_SECONDS: z.coerce.number().int().min(3600).default(2_592_000),
  AUTH_RATE_LIMIT_WINDOW_SECONDS: z.coerce.number().int().min(10).default(60),
  AUTH_LOGIN_RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(5),
  AUTH_REFRESH_RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(20),
  SUPABASE_URL: optionalString,
  SUPABASE_SERVICE_ROLE_KEY: optionalString,
  SUPABASE_STORAGE_BUCKET: optionalString,
})

export const loadAppConfig = registerAs('app', (): AppConfig => {
  const env = envSchema.parse(process.env)

  return {
    port: env.PORT,
    databaseUrl: env.DATABASE_URL,
    redisUrl: env.REDIS_URL,
    jwtAccessSecret: env.JWT_ACCESS_SECRET,
    jwtIssuer: env.JWT_ISSUER,
    accessTokenTtlSeconds: env.ACCESS_TOKEN_TTL_SECONDS,
    refreshTokenTtlSeconds: env.REFRESH_TOKEN_TTL_SECONDS,
    authRateLimitWindowSeconds: env.AUTH_RATE_LIMIT_WINDOW_SECONDS,
    authLoginRateLimitMax: env.AUTH_LOGIN_RATE_LIMIT_MAX,
    authRefreshRateLimitMax: env.AUTH_REFRESH_RATE_LIMIT_MAX,
    supabaseUrl: env.SUPABASE_URL,
    supabaseServiceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
    supabaseStorageBucket: env.SUPABASE_STORAGE_BUCKET,
  }
})
