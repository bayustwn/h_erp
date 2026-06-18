import {
  Body, Controller, Get, Inject, Param, Patch, Post, Query, UseGuards,
} from '@nestjs/common'
import { ParseUUIDPipe } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
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
  purchaseInvoiceQuerySchema, createPurchaseInvoiceSchema, updatePurchaseInvoiceSchema, updatePurchaseInvoiceStatusSchema,
  type CreatePurchaseInvoiceInput, type PurchaseInvoiceQuery, type UpdatePurchaseInvoiceInput, type UpdatePurchaseInvoiceStatusInput,
} from './purchase-invoices.schemas.js'
import { PurchaseInvoicesService } from './purchase-invoices.service.js'

@ApiTags('Purchase Invoices')
@Controller('purchase-invoices')
@UseGuards(AuthGuard, TenantGuard, PermissionGuard)
@RequireTenant()
export class PurchaseInvoicesController {
  constructor(
    @Inject(PurchaseInvoicesService) private readonly service: PurchaseInvoicesService,
  ) {}

  @Get()
  @RequirePermissions('finance.invoice.read')
  list(@Query(new ZodValidationPipe(purchaseInvoiceQuerySchema)) query: PurchaseInvoiceQuery, @CurrentTenant() tenant: TenantContext) {
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
    @Body(new ZodValidationPipe(createPurchaseInvoiceSchema)) body: CreatePurchaseInvoiceInput,
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.create(body, tenant, user.id)
  }

  @Patch(':id')
  @RequirePermissions('finance.invoice.update')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updatePurchaseInvoiceSchema)) body: UpdatePurchaseInvoiceInput,
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.update(id, body, tenant, user.id)
  }

  @Patch(':id/status')
  @RequirePermissions('finance.invoice.cancel')
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updatePurchaseInvoiceStatusSchema)) body: UpdatePurchaseInvoiceStatusInput,
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.updateStatus(id, body, tenant, user.id)
  }
}
