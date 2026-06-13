import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url:
      process.env.DATABASE_URL ??
      'postgresql://erp:erp@127.0.0.1:15432/erp?schema=public',
  },
  migrations: {
    path: 'prisma/migrations',
  },
})
