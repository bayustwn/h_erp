import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { loadAppConfig } from './config/env.config.js'
import { HealthModule } from './health/health.module.js'
import { PrismaModule } from './prisma/prisma.module.js'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [loadAppConfig],
    }),
    PrismaModule,
    HealthModule,
  ],
})
export class AppModule {}
