import { NestFactory } from '@nestjs/core'
import type { INestApplication } from '@nestjs/common'
import { AppModule } from '../src/app.module.js'
import { HttpExceptionFilter } from '../src/common/http/http-exception.filter.js'
import { ApiResponseInterceptor } from '../src/common/http/api-response.interceptor.js'
import { PrismaService } from '../src/prisma/prisma.service.js'
import request from 'supertest'

let app: INestApplication | null = null
let token: string | null = null
let companyId: string | null = null

export async function getApp(): Promise<INestApplication> {
  if (app) return app
  app = await NestFactory.create(AppModule)
  app.setGlobalPrefix('api')
  app.useGlobalFilters(new HttpExceptionFilter())
  app.useGlobalInterceptors(new ApiResponseInterceptor())
  await app.init()
  return app
}

async function getCompanyId(): Promise<string> {
  if (companyId) return companyId
  const a = await getApp()
  const prisma = a.get(PrismaService)
  const c = await prisma.company.findFirstOrThrow({ where: { code: 'DEFAULT' } })
  companyId = c.id
  return companyId!
}

export async function getAuthToken(): Promise<string> {
  if (token) return token
  const a = await getApp()
  const res = await request(a.getHttpServer())
    .post('/api/auth/login')
    .send({ email: 'admin@erp.com', password: 'admin123' })
  token = res.body.data?.accessToken ?? null
  return token!
}

export async function api() {
  await getApp()
  const t = await getAuthToken()
  const cid = await getCompanyId()
  const headers = { Authorization: `Bearer ${t}`, 'X-Company-Id': cid }
  return {
    get: (url: string) =>
      request(app!.getHttpServer()).get(url).set(headers),
    post: (url: string, body?: unknown) =>
      request(app!.getHttpServer()).post(url).send(body).set(headers),
    patch: (url: string, body?: unknown) =>
      request(app!.getHttpServer()).patch(url).send(body).set(headers),
  }
}

export async function closeApp() {
  // no-op: vitest process exit handles cleanup
}
