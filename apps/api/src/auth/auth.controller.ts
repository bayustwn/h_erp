import {
  Body,
  Controller,
  Get,
  Inject,
  Post,
  Req,
  UseGuards,
  UsePipes,
} from '@nestjs/common'
import { ZodValidationPipe } from '../common/validation/zod-validation.pipe.js'
import { AuthService } from './auth.service.js'
import { AuthGuard, type AuthenticatedRequest } from './auth.guard.js'
import { CurrentUser } from './current-user.decorator.js'
import {
  loginSchema,
  refreshTokenSchema,
  type LoginInput,
  type RefreshTokenInput,
} from './auth.schemas.js'
import type { AuthRequestContext, AuthenticatedUser } from './auth.types.js'

type RequestWithMetadata = AuthenticatedRequest & {
  ip?: string
  headers: AuthenticatedRequest['headers'] & {
    'user-agent'?: string
  }
}

@Controller('auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  @Post('login')
  @UsePipes(new ZodValidationPipe(loginSchema))
  login(@Body() body: LoginInput, @Req() request: RequestWithMetadata) {
    return this.authService.login(body, this.toRequestContext(request))
  }

  @Post('refresh')
  @UsePipes(new ZodValidationPipe(refreshTokenSchema))
  refresh(@Body() body: RefreshTokenInput, @Req() request: RequestWithMetadata) {
    return this.authService.refresh(body.refreshToken, this.toRequestContext(request))
  }

  @Post('logout')
  @UsePipes(new ZodValidationPipe(refreshTokenSchema))
  logout(@Body() body: RefreshTokenInput) {
    return this.authService.logout(body.refreshToken)
  }

  @Post('logout-all')
  @UseGuards(AuthGuard)
  logoutAll(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.logoutAll(user.id)
  }

  @Get('me')
  @UseGuards(AuthGuard)
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getCurrentUser(user.id)
  }

  private toRequestContext(request: RequestWithMetadata): AuthRequestContext {
    return {
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    }
  }
}
