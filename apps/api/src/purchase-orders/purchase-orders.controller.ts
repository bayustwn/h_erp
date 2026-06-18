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
  purchaseOrderQuerySchema, createPurchaseOrderSchema, updatePurchaseOrderSchema, updatePurchaseOrderStatusSchema,
  type CreatePurchaseOrderInput, type PurchaseOrderQuery, type UpdatePurchaseOrderInput, type UpdatePurchaseOrderStatusInput,
} from './purchase-orders.schemas.js'
import { PurchaseOrdersService } from './purchase-orders.service.js'

@ApiTags('Purchase Orders')
@Controller('purchase-orders')
@UseGuards(AuthGuard, TenantGuard, PermissionGuard)
@RequireTenant()
export class PurchaseOrdersController {
  constructor(
    @Inject(PurchaseOrdersService) private readonly purchaseOrdersService: PurchaseOrdersService,
  ) {}

  @Get()
  @RequirePermissions('purchase.order.read')
  list(@Query(new ZodValidationPipe(purchaseOrderQuerySchema)) query: PurchaseOrderQuery, @CurrentTenant() tenant: TenantContext) {
    return this.purchaseOrdersService.list(query, tenant)
  }

  @Get(':id')
  @RequirePermissions('purchase.order.read')
  getById(@Param('id', ParseUUIDPipe) id: string, @CurrentTenant() tenant: TenantContext) {
    return this.purchaseOrdersService.getById(id, tenant)
  }

  @Post()
  @RequirePermissions('purchase.order.create')
  create(
    @Body(new ZodValidationPipe(createPurchaseOrderSchema)) body: CreatePurchaseOrderInput,
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.purchaseOrdersService.create(body, tenant, user.id)
  }

  @Patch(':id')
  @RequirePermissions('purchase.order.update')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updatePurchaseOrderSchema)) body: UpdatePurchaseOrderInput,
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.purchaseOrdersService.update(id, body, tenant, user.id)
  }

  @Patch(':id/status')
  @RequirePermissions('purchase.order.cancel')
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updatePurchaseOrderStatusSchema)) body: UpdatePurchaseOrderStatusInput,
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.purchaseOrdersService.updateStatus(id, body, tenant, user.id)
  }
}
