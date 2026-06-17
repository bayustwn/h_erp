import { Body, Controller, Get, Inject, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { ParseUUIDPipe } from '@nestjs/common'
import { PermissionGuard } from '../access-control/permission.guard.js'
import { RequirePermissions } from '../access-control/permissions.decorator.js'
import { CurrentTenant, RequireTenant } from '../access-control/tenant.decorator.js'
import { TenantGuard } from '../access-control/tenant.guard.js'
import type { TenantContext } from '../access-control/access-control.types.js'
import { AuthGuard } from '../auth/auth.guard.js'
import { ZodValidationPipe } from '../common/validation/zod-validation.pipe.js'
import { chartOfAccountsQuerySchema, createChartOfAccountSchema, updateChartOfAccountSchema, updateChartOfAccountStatusSchema, type ChartOfAccountsQuery, type CreateChartOfAccountInput, type UpdateChartOfAccountInput, type UpdateChartOfAccountStatusInput } from './chart-of-accounts.schemas.js'
import { ChartOfAccountsService } from './chart-of-accounts.service.js'

@Controller('chart-of-accounts')
@UseGuards(AuthGuard, TenantGuard, PermissionGuard)
@RequireTenant()
export class ChartOfAccountsController {
  constructor(@Inject(ChartOfAccountsService) private readonly service: ChartOfAccountsService) {}

  @Get()
  @RequirePermissions('chart-of-account.read')
  list(@Query(new ZodValidationPipe(chartOfAccountsQuerySchema)) query: ChartOfAccountsQuery, @CurrentTenant() tenant: TenantContext) { return this.service.list(query, tenant) }

  @Get(':id')
  @RequirePermissions('chart-of-account.read')
  getById(@Param('id', ParseUUIDPipe) id: string, @CurrentTenant() tenant: TenantContext) { return this.service.getById(id, tenant) }

  @Post()
  @RequirePermissions('chart-of-account.create')
  create(@Body(new ZodValidationPipe(createChartOfAccountSchema)) body: CreateChartOfAccountInput, @CurrentTenant() tenant: TenantContext) { return this.service.create(body, tenant) }

  @Patch(':id')
  @RequirePermissions('chart-of-account.update')
  update(@Param('id', ParseUUIDPipe) id: string, @Body(new ZodValidationPipe(updateChartOfAccountSchema)) body: UpdateChartOfAccountInput, @CurrentTenant() tenant: TenantContext) { return this.service.update(id, body, tenant) }

  @Patch(':id/status')
  @RequirePermissions('chart-of-account.delete')
  updateStatus(@Param('id', ParseUUIDPipe) id: string, @Body(new ZodValidationPipe(updateChartOfAccountStatusSchema)) body: UpdateChartOfAccountStatusInput, @CurrentTenant() tenant: TenantContext) { return this.service.updateStatus(id, body, tenant) }
}
