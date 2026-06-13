import { SetMetadata, createParamDecorator, ExecutionContext } from '@nestjs/common'
import type {
  RequestWithAccessContext,
  TenantRequirement,
} from './access-control.types.js'

export const TENANT_REQUIREMENT_METADATA = 'tenant_requirement'

export const RequireTenant = (requirement: TenantRequirement = {}) =>
  SetMetadata(TENANT_REQUIREMENT_METADATA, {
    branch: requirement.branch ?? 'optional',
  } satisfies TenantRequirement)

export const CurrentTenant = createParamDecorator(
  (_data: unknown, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest<RequestWithAccessContext>()
    return request.tenant
  },
)
