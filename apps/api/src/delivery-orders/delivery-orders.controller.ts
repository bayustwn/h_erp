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
  deliveryOrderQuerySchema, createDeliveryOrderSchema, updateDeliveryOrderSchema, updateDeliveryOrderStatusSchema,
  type CreateDeliveryOrderInput, type DeliveryOrderQuery, type UpdateDeliveryOrderInput, type UpdateDeliveryOrderStatusInput,
} from './delivery-orders.schemas.js'
import { DeliveryOrdersService } from './delivery-orders.service.js'

@Controller('delivery-orders')
@UseGuards(AuthGuard, TenantGuard, PermissionGuard)
@RequireTenant()
export class DeliveryOrdersController {
  constructor(
    @Inject(DeliveryOrdersService) private readonly service: DeliveryOrdersService,
  ) {}

  @Get()
  @RequirePermissions('sales.order.read')
  list(@Query(new ZodValidationPipe(deliveryOrderQuerySchema)) query: DeliveryOrderQuery, @CurrentTenant() tenant: TenantContext) {
    return this.service.list(query, tenant)
  }

  @Get(':id')
  @RequirePermissions('sales.order.read')
  getById(@Param('id', ParseUUIDPipe) id: string, @CurrentTenant() tenant: TenantContext) {
    return this.service.getById(id, tenant)
  }

  @Post()
  @RequirePermissions('sales.order.create')
  create(
    @Body(new ZodValidationPipe(createDeliveryOrderSchema)) body: CreateDeliveryOrderInput,
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.create(body, tenant, user.id)
  }

  @Patch(':id')
  @RequirePermissions('sales.order.update')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateDeliveryOrderSchema)) body: UpdateDeliveryOrderInput,
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.update(id, body, tenant, user.id)
  }

  @Patch(':id/status')
  @RequirePermissions('sales.order.cancel')
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateDeliveryOrderStatusSchema)) body: UpdateDeliveryOrderStatusInput,
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.updateStatus(id, body, tenant, user.id)
  }
}
