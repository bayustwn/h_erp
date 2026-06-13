import { Inject, Injectable, UnauthorizedException } from '@nestjs/common'
import { AuditAction, RecordStatus } from '../generated/prisma/enums.js'
import { PrismaService } from '../prisma/prisma.service.js'
import { AuthRateLimiterService } from './auth-rate-limiter.service.js'
import { PasswordService } from './password.service.js'
import { TokenService } from './token.service.js'
import type { AuthRequestContext, AuthenticatedUser, TokenPair } from './auth.types.js'
import type { LoginInput } from './auth.schemas.js'

@Injectable()
export class AuthService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuthRateLimiterService)
    private readonly rateLimiter: AuthRateLimiterService,
    @Inject(PasswordService) private readonly passwordService: PasswordService,
    @Inject(TokenService) private readonly tokenService: TokenService,
  ) {}

  async login(input: LoginInput, context: AuthRequestContext) {
    await this.rateLimiter.checkLogin(input.email, context.ipAddress)

    const user = await this.prisma.user.findUnique({
      where: { email: input.email },
    })

    if (!user || user.status !== RecordStatus.ACTIVE || user.deletedAt) {
      await this.auditAuthFailure(AuditAction.LOGIN_FAILED, context, {
        email: input.email,
        reason: 'user_not_found_or_inactive',
      })

      throw new UnauthorizedException('Invalid email or password')
    }

    const isValidPassword = await this.passwordService.verify(
      input.password,
      user.passwordHash,
    )

    if (!isValidPassword) {
      await this.auditAuthFailure(
        AuditAction.LOGIN_FAILED,
        context,
        {
          email: input.email,
          reason: 'invalid_password',
        },
        user.id,
      )

      throw new UnauthorizedException('Invalid email or password')
    }

    const tokens = await this.createSessionTokens(
      {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
      },
      context,
    )

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      }),
      this.prisma.auditLog.create({
        data: {
          actorUserId: user.id,
          action: AuditAction.LOGIN,
          entityType: 'User',
          entityId: user.id,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
        },
      }),
    ])

    return {
      ...tokens,
      user: this.toAuthenticatedUser(user),
    }
  }

  async refresh(refreshToken: string, context: AuthRequestContext): Promise<TokenPair> {
    await this.rateLimiter.checkRefresh(context.ipAddress)

    const refreshTokenHash = this.tokenService.hashRefreshToken(refreshToken)
    const tokenRecord = await this.prisma.authRefreshToken.findUnique({
      where: { tokenHash: refreshTokenHash },
      include: {
        session: {
          include: {
            user: true,
          },
        },
      },
    })
    const session = tokenRecord?.session

    if (
      !tokenRecord ||
      !session ||
      session.revokedAt ||
      session.compromisedAt ||
      session.expiresAt.getTime() <= Date.now() ||
      tokenRecord.expiresAt.getTime() <= Date.now() ||
      session.user.status !== RecordStatus.ACTIVE ||
      session.user.deletedAt
    ) {
      await this.auditAuthFailure(AuditAction.TOKEN_REFRESH, context, {
        reason: 'invalid_refresh_token',
      })

      throw new UnauthorizedException('Invalid refresh token')
    }

    if (tokenRecord.usedAt || tokenRecord.revokedAt) {
      await this.prisma.$transaction([
        this.prisma.authSession.update({
          where: { id: session.id },
          data: {
            revokedAt: new Date(),
            compromisedAt: new Date(),
          },
        }),
        this.prisma.authRefreshToken.updateMany({
          where: {
            sessionId: session.id,
            revokedAt: null,
          },
          data: {
            revokedAt: new Date(),
          },
        }),
        this.prisma.auditLog.create({
          data: {
            actorUserId: session.userId,
            action: AuditAction.TOKEN_REUSE,
            entityType: 'AuthSession',
            entityId: session.id,
            ipAddress: context.ipAddress,
            userAgent: context.userAgent,
            newValues: {
              tokenId: tokenRecord.id,
              reason: 'refresh_token_reuse',
            },
          },
        }),
      ])

      throw new UnauthorizedException('Invalid refresh token')
    }

    const nextRefreshToken = this.tokenService.createRefreshToken()
    const nextRefreshTokenHash = this.tokenService.hashRefreshToken(nextRefreshToken)
    const expiresAt = this.createRefreshExpiry()

    await this.prisma.$transaction([
      this.prisma.authRefreshToken.update({
        where: { id: tokenRecord.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.authSession.update({
        where: { id: session.id },
        data: {
          refreshTokenHash: nextRefreshTokenHash,
          expiresAt,
          lastUsedAt: new Date(),
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
        },
      }),
      this.prisma.authRefreshToken.create({
        data: {
          sessionId: session.id,
          tokenHash: nextRefreshTokenHash,
          expiresAt,
        },
      }),
      this.prisma.auditLog.create({
        data: {
          actorUserId: session.userId,
          action: AuditAction.TOKEN_REFRESH,
          entityType: 'AuthSession',
          entityId: session.id,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
        },
      }),
    ])

    return {
      accessToken: await this.tokenService.signAccessToken({
        sub: session.user.id,
        email: session.user.email,
        fullName: session.user.fullName,
      }),
      refreshToken: nextRefreshToken,
      tokenType: 'Bearer',
      expiresIn: this.tokenService.accessTokenTtlSeconds,
      refreshExpiresIn: this.tokenService.refreshTokenTtlSeconds,
    }
  }

  async logout(refreshToken: string): Promise<{ revoked: true }> {
    const refreshTokenHash = this.tokenService.hashRefreshToken(refreshToken)
    const tokenRecord = await this.prisma.authRefreshToken.findUnique({
      where: { tokenHash: refreshTokenHash },
      include: { session: true },
    })

    if (tokenRecord) {
      await this.prisma.$transaction([
        this.prisma.authSession.updateMany({
          where: {
            id: tokenRecord.sessionId,
            revokedAt: null,
          },
          data: {
            revokedAt: new Date(),
          },
        }),
        this.prisma.authRefreshToken.updateMany({
          where: {
            sessionId: tokenRecord.sessionId,
            revokedAt: null,
          },
          data: {
            revokedAt: new Date(),
          },
        }),
        this.prisma.auditLog.create({
          data: {
            actorUserId: tokenRecord.session.userId,
            action: AuditAction.LOGOUT,
            entityType: 'AuthSession',
            entityId: tokenRecord.sessionId,
          },
        }),
      ])
    }

    return { revoked: true }
  }

  async logoutAll(userId: string): Promise<{ revoked: true }> {
    await this.prisma.$transaction([
      this.prisma.authSession.updateMany({
        where: {
          userId,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      }),
      this.prisma.authRefreshToken.updateMany({
        where: {
          session: {
            userId,
          },
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      }),
      this.prisma.auditLog.create({
        data: {
          actorUserId: userId,
          action: AuditAction.LOGOUT,
          entityType: 'User',
          entityId: userId,
          newValues: {
            scope: 'all_sessions',
          },
        },
      }),
    ])

    return { revoked: true }
  }

  async getCurrentUser(userId: string): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        status: RecordStatus.ACTIVE,
        deletedAt: null,
      },
    })

    if (!user) {
      throw new UnauthorizedException('User is no longer active')
    }

    return this.toAuthenticatedUser(user)
  }

  private async createSessionTokens(
    user: AuthenticatedUser,
    context: AuthRequestContext,
  ): Promise<TokenPair> {
    const refreshToken = this.tokenService.createRefreshToken()
    const refreshTokenHash = this.tokenService.hashRefreshToken(refreshToken)
    const expiresAt = this.createRefreshExpiry()

    await this.prisma.authSession.create({
      data: {
        userId: user.id,
        refreshTokenHash,
        expiresAt,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        refreshTokens: {
          create: {
            tokenHash: refreshTokenHash,
            expiresAt,
          },
        },
      },
    })

    return {
      accessToken: await this.tokenService.signAccessToken({
        sub: user.id,
        email: user.email,
        fullName: user.fullName,
      }),
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: this.tokenService.accessTokenTtlSeconds,
      refreshExpiresIn: this.tokenService.refreshTokenTtlSeconds,
    }
  }

  private createRefreshExpiry() {
    return new Date(Date.now() + this.tokenService.refreshTokenTtlSeconds * 1000)
  }

  private async auditAuthFailure(
    action: typeof AuditAction.LOGIN_FAILED | typeof AuditAction.TOKEN_REFRESH,
    context: AuthRequestContext,
    details: Record<string, string>,
    actorUserId?: string,
  ) {
    await this.prisma.auditLog.create({
      data: {
        actorUserId,
        action,
        entityType: 'Auth',
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        newValues: details,
      },
    })
  }

  private toAuthenticatedUser(user: {
    id: string
    email: string
    fullName: string
  }): AuthenticatedUser {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
    }
  }
}
