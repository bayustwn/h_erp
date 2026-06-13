import { Module } from '@nestjs/common'
import { PrismaModule } from '../prisma/prisma.module.js'
import { RedisModule } from '../redis/redis.module.js'
import { AuthRateLimiterService } from './auth-rate-limiter.service.js'
import { AuthController } from './auth.controller.js'
import { AuthGuard } from './auth.guard.js'
import { AuthService } from './auth.service.js'
import { PasswordService } from './password.service.js'
import { TokenService } from './token.service.js'

@Module({
  imports: [PrismaModule, RedisModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthGuard,
    AuthRateLimiterService,
    PasswordService,
    TokenService,
  ],
  exports: [AuthGuard, PasswordService, TokenService],
})
export class AuthModule {}
