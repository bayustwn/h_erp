import { Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService, ConfigType } from '@nestjs/config'
import { createHash, randomBytes } from 'node:crypto'
import { SignJWT, jwtVerify } from 'jose'
import { loadAppConfig } from '../config/env.config.js'
import type { AccessTokenPayload } from './auth.types.js'

@Injectable()
export class TokenService {
  private readonly appConfig: ConfigType<typeof loadAppConfig>
  private readonly accessSecret: Uint8Array

  constructor(configService: ConfigService) {
    this.appConfig = configService.getOrThrow<ConfigType<typeof loadAppConfig>>('app')
    this.accessSecret = new TextEncoder().encode(this.appConfig.jwtAccessSecret)
  }

  get accessTokenTtlSeconds() {
    return this.appConfig.accessTokenTtlSeconds
  }

  get refreshTokenTtlSeconds() {
    return this.appConfig.refreshTokenTtlSeconds
  }

  async signAccessToken(payload: AccessTokenPayload): Promise<string> {
    return new SignJWT({
      email: payload.email,
      fullName: payload.fullName,
    })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setSubject(payload.sub)
      .setIssuer(this.appConfig.jwtIssuer)
      .setIssuedAt()
      .setExpirationTime(`${this.appConfig.accessTokenTtlSeconds}s`)
      .sign(this.accessSecret)
  }

  async verifyAccessToken(token: string): Promise<AccessTokenPayload> {
    try {
      const result = await jwtVerify(token, this.accessSecret, {
        issuer: this.appConfig.jwtIssuer,
      })

      if (
        !result.payload.sub ||
        typeof result.payload.email !== 'string' ||
        typeof result.payload.fullName !== 'string'
      ) {
        throw new UnauthorizedException('Invalid access token')
      }

      return {
        sub: result.payload.sub,
        email: result.payload.email,
        fullName: result.payload.fullName,
      }
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error
      }

      throw new UnauthorizedException('Invalid access token')
    }
  }

  createRefreshToken(): string {
    return randomBytes(48).toString('base64url')
  }

  hashRefreshToken(refreshToken: string): string {
    return createHash('sha256').update(refreshToken).digest('base64url')
  }
}
