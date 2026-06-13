import 'reflect-metadata'
import { ConfigService, ConfigType } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module.js'
import { HttpExceptionFilter } from './common/http/http-exception.filter.js'
import { ApiResponseInterceptor } from './common/http/api-response.interceptor.js'
import { loadAppConfig } from './config/env.config.js'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  const configService = app.get(ConfigService)
  const appConfig = configService.getOrThrow<ConfigType<typeof loadAppConfig>>('app')

  app.setGlobalPrefix('api')
  app.useGlobalFilters(new HttpExceptionFilter())
  app.useGlobalInterceptors(new ApiResponseInterceptor())

  await app.listen(appConfig.port)
}

void bootstrap()
