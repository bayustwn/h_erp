import { ConfigService } from '@nestjs/config'
import { describe, expect, it } from 'vitest'
import { TokenService } from './token.service.js'

describe('TokenService', () => {
  it('signs and verifies access tokens', async () => {
    const service = new TokenService(
      new ConfigService({
        app: {
          jwtAccessSecret: 'test-secret-with-at-least-32-characters',
          jwtIssuer: 'h-erp-api-test',
          accessTokenTtlSeconds: 900,
          refreshTokenTtlSeconds: 2_592_000,
        },
      }),
    )

    const token = await service.signAccessToken({
      sub: 'user-id',
      email: 'user@example.test',
      fullName: 'Test User',
    })
    const payload = await service.verifyAccessToken(token)

    expect(payload).toEqual({
      sub: 'user-id',
      email: 'user@example.test',
      fullName: 'Test User',
    })
  })

  it('creates stable hashes for refresh tokens', () => {
    const service = new TokenService(
      new ConfigService({
        app: {
          jwtAccessSecret: 'test-secret-with-at-least-32-characters',
          jwtIssuer: 'h-erp-api-test',
          accessTokenTtlSeconds: 900,
          refreshTokenTtlSeconds: 2_592_000,
        },
      }),
    )
    const refreshToken = service.createRefreshToken()

    expect(refreshToken).toHaveLength(64)
    expect(service.hashRefreshToken(refreshToken)).toBe(
      service.hashRefreshToken(refreshToken),
    )
  })
})
