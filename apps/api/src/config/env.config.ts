import { registerAs } from '@nestjs/config'
import { z } from 'zod'

export type AppConfig = {
  port: number
  databaseUrl: string
  redisUrl: string
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
    supabaseUrl: env.SUPABASE_URL,
    supabaseServiceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
    supabaseStorageBucket: env.SUPABASE_STORAGE_BUCKET,
  }
})
