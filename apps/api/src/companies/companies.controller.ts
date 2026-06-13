import { Body, Controller, Get, Inject, Patch, Query, UseGuards } from '@nestjs/common'
import { PermissionGuard } from '../access-control/permission.guard.js'
import { RequirePermissions } from '../access-control/permissions.decorator.js'
import { CurrentTenant, RequireTenant } from '../access-control/tenant.decorator.js'
import { TenantGuard } from '../access-control/tenant.guard.js'
import type { TenantContext } from '../access-control/access-control.types.js'
import { AuthGuard } from '../auth/auth.guard.js'
import type { AuthenticatedUser } from '../auth/auth.types.js'
import { CurrentUser } from '../auth/current-user.decorator.js'
import { ZodValidationPipe } from '../common/validation/zod-validation.pipe.js'
import {
  companiesQuerySchema,
  updateCompanySchema,
  type CompaniesQuery,
  type UpdateCompanyInput,
} from './companies.schemas.js'
import { CompaniesService } from './companies.service.js'

@Controller('companies')
export class CompaniesController {
  constructor(
    @Inject(CompaniesService) private readonly companiesService: CompaniesService,
  ) {}

  @Get()
  @UseGuards(AuthGuard, PermissionGuard)
  @RequirePermissions('company.read')
  list(@Query(new ZodValidationPipe(companiesQuerySchema)) query: CompaniesQuery) {
    return this.companiesService.list(query)
  }

  @Get('current')
  @UseGuards(AuthGuard, TenantGuard, PermissionGuard)
  @RequireTenant()
  @RequirePermissions('company.read')
  getCurrent(@CurrentTenant() tenant: TenantContext) {
    return this.companiesService.getCurrent(tenant)
  }

  @Patch('current')
  @UseGuards(AuthGuard, TenantGuard, PermissionGuard)
  @RequireTenant()
  @RequirePermissions('company.update')
  updateCurrent(
    @Body(new ZodValidationPipe(updateCompanySchema)) body: UpdateCompanyInput,
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.companiesService.updateCurrent(body, tenant, user.id)
  }
}
