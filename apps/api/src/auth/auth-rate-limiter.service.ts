import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common'
import { ConfigService, ConfigType } from '@nestjs/config'
import { createHash } from 'node:crypto'
import { loadAppConfig } from '../config/env.config.js'
import { RedisService } from '../redis/redis.service.js'

@Injectable()
export class AuthRateLimiterService {
  private readonly appConfig: ConfigType<typeof loadAppConfig>

  constructor(
    @Inject(ConfigService) configService: ConfigService,
    @Inject(RedisService) private readonly redisService: RedisService,
  ) {
    this.appConfig = configService.getOrThrow<ConfigType<typeof loadAppConfig>>('app')
  }

  async checkLogin(email: string, ipAddress?: string) {
    await Promise.all([
      this.check(
        `auth:login:email:${this.hashKey(email)}`,
        this.appConfig.authLoginRateLimitMax,
      ),
      this.check(
        `auth:login:ip:${this.hashKey(ipAddress ?? 'unknown')}`,
        this.appConfig.authLoginRateLimitMax,
      ),
    ])
  }

  async checkRefresh(ipAddress?: string) {
    await this.check(
      `auth:refresh:ip:${this.hashKey(ipAddress ?? 'unknown')}`,
      this.appConfig.authRefreshRateLimitMax,
    )
  }

  private async check(key: string, maxAttempts: number) {
    const redis = this.redisService.connection
    const attempts = await redis.incr(key)

    if (attempts === 1) {
      await redis.expire(key, this.appConfig.authRateLimitWindowSeconds)
    }

    if (attempts > maxAttempts) {
      throw new HttpException(
        {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many authentication attempts',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      )
    }
  }

  private hashKey(value: string) {
    return createHash('sha256').update(value).digest('base64url')
  }
}
