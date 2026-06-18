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
  purchaseReturnQuerySchema, createPurchaseReturnSchema, updatePurchaseReturnStatusSchema,
  type CreatePurchaseReturnInput, type PurchaseReturnQuery, type UpdatePurchaseReturnStatusInput,
} from './purchase-returns.schemas.js'
import { PurchaseReturnsService } from './purchase-returns.service.js'

@Controller('purchase-returns')
@UseGuards(AuthGuard, TenantGuard, PermissionGuard)
@RequireTenant()
export class PurchaseReturnsController {
  constructor(
    @Inject(PurchaseReturnsService) private readonly service: PurchaseReturnsService,
  ) {}

  @Get()
  @RequirePermissions('finance.invoice.read')
  list(@Query(new ZodValidationPipe(purchaseReturnQuerySchema)) query: PurchaseReturnQuery, @CurrentTenant() tenant: TenantContext) {
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
    @Body(new ZodValidationPipe(createPurchaseReturnSchema)) body: CreatePurchaseReturnInput,
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.create(body, tenant, user.id)
  }

  @Patch(':id/status')
  @RequirePermissions('finance.invoice.cancel')
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updatePurchaseReturnStatusSchema)) body: UpdatePurchaseReturnStatusInput,
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.updateStatus(id, body, tenant, user.id)
  }
}
