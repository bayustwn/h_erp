import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { TokenService } from './token.service.js'
import type { AuthenticatedUser } from './auth.types.js'

export type AuthenticatedRequest = {
  headers: {
    authorization?: string
  }
  user?: AuthenticatedUser
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(@Inject(TokenService) private readonly tokenService: TokenService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
    const token = this.extractBearerToken(request.headers.authorization)
    const payload = await this.tokenService.verifyAccessToken(token)

    request.user = {
      id: payload.sub,
      email: payload.email,
      fullName: payload.fullName,
    }

    return true
  }

  private extractBearerToken(authorizationHeader?: string): string {
    if (!authorizationHeader) {
      throw new UnauthorizedException('Missing bearer token')
    }

    const [scheme, token] = authorizationHeader.split(' ')

    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('Invalid authorization header')
    }

    return token
  }
}
