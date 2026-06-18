import {
  Body, Controller, Get, Inject, Param, Patch, Post, Query, UseGuards,
} from '@nestjs/common'
import { ParseUUIDPipe } from '@nestjs/common'
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
  salesInvoiceQuerySchema, createSalesInvoiceSchema, updateSalesInvoiceSchema, updateSalesInvoiceStatusSchema,
  type CreateSalesInvoiceInput, type SalesInvoiceQuery, type UpdateSalesInvoiceInput, type UpdateSalesInvoiceStatusInput,
} from './sales-invoices.schemas.js'
import { SalesInvoicesService } from './sales-invoices.service.js'

@Controller('sales-invoices')
@UseGuards(AuthGuard, TenantGuard, PermissionGuard)
@RequireTenant()
export class SalesInvoicesController {
  constructor(
    @Inject(SalesInvoicesService) private readonly service: SalesInvoicesService,
  ) {}

  @Get()
  @RequirePermissions('finance.invoice.read')
  list(@Query(new ZodValidationPipe(salesInvoiceQuerySchema)) query: SalesInvoiceQuery, @CurrentTenant() tenant: TenantContext) {
    return this.service.list(query, tenant)
  }

  @Get(':id')
  @RequirePermissions('finance.invoice.read')
  getById(@Param('id', ParseUUIDPipe) id: string, @CurrentTenant() tenant: TenantContext) {
    return this.service.getById(id, tenant)
  }

  @Post()
  @RequirePermissions('finance.invoice.create')
  create(
    @Body(new ZodValidationPipe(createSalesInvoiceSchema)) body: CreateSalesInvoiceInput,
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.create(body, tenant, user.id)
  }

  @Patch(':id')
  @RequirePermissions('finance.invoice.update')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateSalesInvoiceSchema)) body: UpdateSalesInvoiceInput,
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.update(id, body, tenant, user.id)
  }

  @Patch(':id/status')
  @RequirePermissions('finance.invoice.cancel')
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateSalesInvoiceStatusSchema)) body: UpdateSalesInvoiceStatusInput,
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.updateStatus(id, body, tenant, user.id)
  }
}
