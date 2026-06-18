import 'reflect-metadata'
import { ConfigService, ConfigType } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import { AppModule } from './app.module.js'
import { HttpExceptionFilter } from './common/http/http-exception.filter.js'
import { ApiResponseInterceptor } from './common/http/api-response.interceptor.js'
import { loadAppConfig } from './config/env.config.js'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  const configService = app.get(ConfigService)
  const appConfig = configService.getOrThrow<ConfigType<typeof loadAppConfig>>('app')

  const swaggerConfig = new DocumentBuilder()
    .setTitle('ERP API')
    .setDescription('Enterprise Resource Planning API')
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'access-token')
    .build()
  const document = SwaggerModule.createDocument(app, swaggerConfig)
  SwaggerModule.setup('api/docs', app, document)

  app.setGlobalPrefix('api')
  app.useGlobalFilters(new HttpExceptionFilter())
  app.useGlobalInterceptors(new ApiResponseInterceptor())

  await app.listen(appConfig.port)
}

void bootstrap()
