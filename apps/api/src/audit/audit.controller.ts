import { Controller, Get, Inject, Query, UseGuards } from '@nestjs/common'
import type { TenantContext } from '../access-control/access-control.types.js'
import { PermissionGuard } from '../access-control/permission.guard.js'
import { RequirePermissions } from '../access-control/permissions.decorator.js'
import { CurrentTenant, RequireTenant } from '../access-control/tenant.decorator.js'
import { TenantGuard } from '../access-control/tenant.guard.js'
import { AuthGuard } from '../auth/auth.guard.js'
import { ZodValidationPipe } from '../common/validation/zod-validation.pipe.js'
import { auditLogsQuerySchema, type AuditLogsQuery } from './audit.schemas.js'
import { AuditService } from './audit.service.js'

@Controller('audit-logs')
@UseGuards(AuthGuard, TenantGuard, PermissionGuard)
@RequireTenant()
export class AuditController {
  constructor(@Inject(AuditService) private readonly auditService: AuditService) {}

  @Get()
  @RequirePermissions('audit.read')
  list(
    @Query(new ZodValidationPipe(auditLogsQuerySchema)) query: AuditLogsQuery,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.auditService.list(query, tenant)
  }
}
