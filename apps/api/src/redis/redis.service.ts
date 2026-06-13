import { Injectable, OnModuleDestroy } from '@nestjs/common'
import { ConfigService, ConfigType } from '@nestjs/config'
import { Redis } from 'ioredis'
import { loadAppConfig } from '../config/env.config.js'

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: Redis

  constructor(configService: ConfigService) {
    const appConfig = configService.getOrThrow<ConfigType<typeof loadAppConfig>>('app')

    this.client = new Redis(appConfig.redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 2,
    })
  }

  get connection() {
    return this.client
  }

  onModuleDestroy() {
    this.client.disconnect()
  }
}
