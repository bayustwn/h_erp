import { execSync } from 'node:child_process'

const TEST_DB_URL = 'postgresql://erp:erp@127.0.0.1:15432/erp_test?schema=public'

export async function setup() {
  process.env.DATABASE_URL = TEST_DB_URL
  process.env.REDIS_URL = 'redis://localhost:6379'
  process.env.JWT_ACCESS_SECRET = 'test-secret-that-is-at-least-32-chars-long!!'
  process.env.R2_ACCOUNT_ID = 'test'
  process.env.R2_ACCESS_KEY_ID = 'test'
  process.env.R2_SECRET_ACCESS_KEY = 'test'

  execSync('npx prisma migrate reset --force', {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: TEST_DB_URL },
    stdio: 'pipe',
  })

  execSync('npx tsx prisma/seed.ts', {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: TEST_DB_URL },
    stdio: 'pipe',
  })
}

export async function teardown() {
  // Cleanup if needed
}
