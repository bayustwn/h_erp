import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { ConfigService, ConfigType } from '@nestjs/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { loadAppConfig } from '../config/env.config.js'
import { PrismaClient } from '../generated/prisma/client.js'

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(@Inject(ConfigService) configService: ConfigService) {
    const appConfig = configService.getOrThrow<ConfigType<typeof loadAppConfig>>('app')
    const adapter = new PrismaPg({ connectionString: appConfig.databaseUrl })

    super({ adapter })
  }

  async onModuleInit() {
    await this.$connect()
  }

  async onModuleDestroy() {
    await this.$disconnect()
  }
}
