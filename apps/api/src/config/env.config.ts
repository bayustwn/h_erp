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
  storageDriver: 'r2'
  storageBucket: string
  r2AccountId: string
  r2AccessKeyId: string
  r2SecretAccessKey: string
  r2PublicBaseUrl?: string
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
  STORAGE_DRIVER: z.literal('r2').default('r2'),
  STORAGE_BUCKET: z.string().min(1).default('erp-attachments'),
  R2_ACCOUNT_ID: z.string().min(1),
  R2_ACCESS_KEY_ID: z.string().min(1),
  R2_SECRET_ACCESS_KEY: z.string().min(1),
  R2_PUBLIC_BASE_URL: optionalString,
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
    storageDriver: env.STORAGE_DRIVER,
    storageBucket: env.STORAGE_BUCKET,
    r2AccountId: env.R2_ACCOUNT_ID,
    r2AccessKeyId: env.R2_ACCESS_KEY_ID,
    r2SecretAccessKey: env.R2_SECRET_ACCESS_KEY,
    r2PublicBaseUrl: env.R2_PUBLIC_BASE_URL,
  }
})
