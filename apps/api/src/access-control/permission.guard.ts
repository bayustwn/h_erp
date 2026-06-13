import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { AccessControlService } from './access-control.service.js'
import { REQUIRED_PERMISSIONS_METADATA } from './permissions.decorator.js'
import type { RequestWithAccessContext } from './access-control.types.js'

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly accessControlService: AccessControlService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      REQUIRED_PERMISSIONS_METADATA,
      [context.getHandler(), context.getClass()],
    )

    if (!requiredPermissions?.length) {
      return true
    }

    const request = context.switchToHttp().getRequest<RequestWithAccessContext>()

    if (!request.user) {
      throw new UnauthorizedException('Authentication is required')
    }

    const hasPermissions = await this.accessControlService.hasPermissions(
      request.user.id,
      requiredPermissions,
      request.tenant,
    )

    if (!hasPermissions) {
      throw new ForbiddenException('Permission denied')
    }

    return true
  }
}
