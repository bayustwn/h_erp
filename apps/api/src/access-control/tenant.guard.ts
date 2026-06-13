import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { z } from 'zod'
import { AccessControlService } from './access-control.service.js'
import { TENANT_REQUIREMENT_METADATA } from './tenant.decorator.js'
import type {
  RequestWithAccessContext,
  TenantRequirement,
} from './access-control.types.js'

const uuidSchema = z.uuid()

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(AccessControlService)
    private readonly accessControlService: AccessControlService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requirement = this.reflector.getAllAndOverride<TenantRequirement>(
      TENANT_REQUIREMENT_METADATA,
      [context.getHandler(), context.getClass()],
    )

    if (!requirement) {
      return true
    }

    const request = context.switchToHttp().getRequest<RequestWithAccessContext>()

    if (!request.user) {
      throw new UnauthorizedException('Authentication is required')
    }

    const companyId = this.parseHeaderUuid(
      request.headers['x-company-id'],
      'X-Company-Id',
    )
    const branchId = request.headers['x-branch-id']
      ? this.parseHeaderUuid(request.headers['x-branch-id'], 'X-Branch-Id')
      : undefined

    if (requirement.branch === 'required' && !branchId) {
      throw new BadRequestException('X-Branch-Id header is required')
    }

    request.tenant = {
      companyId,
      branchId,
    }

    await this.accessControlService.assertTenantAccess(request.user.id, request.tenant)

    return true
  }

  private parseHeaderUuid(value: string | undefined, headerName: string) {
    const result = uuidSchema.safeParse(value)

    if (!result.success) {
      throw new BadRequestException(`${headerName} header must be a valid UUID`)
    }

    return result.data
  }
}
