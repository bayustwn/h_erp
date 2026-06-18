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
  salesOrderQuerySchema, createSalesOrderSchema, updateSalesOrderSchema, updateSalesOrderStatusSchema,
  type CreateSalesOrderInput, type SalesOrderQuery, type UpdateSalesOrderInput, type UpdateSalesOrderStatusInput,
} from './sales-orders.schemas.js'
import { SalesOrdersService } from './sales-orders.service.js'

@ApiTags('Sales Orders')
@Controller('sales-orders')
@UseGuards(AuthGuard, TenantGuard, PermissionGuard)
@RequireTenant()
export class SalesOrdersController {
  constructor(
    @Inject(SalesOrdersService) private readonly salesOrdersService: SalesOrdersService,
  ) {}

  @Get()
  @RequirePermissions('sales.order.read')
  list(@Query(new ZodValidationPipe(salesOrderQuerySchema)) query: SalesOrderQuery, @CurrentTenant() tenant: TenantContext) {
    return this.salesOrdersService.list(query, tenant)
  }

  @Get(':id')
  @RequirePermissions('sales.order.read')
  getById(@Param('id', ParseUUIDPipe) id: string, @CurrentTenant() tenant: TenantContext) {
    return this.salesOrdersService.getById(id, tenant)
  }

  @Post()
  @RequirePermissions('sales.order.create')
  create(
    @Body(new ZodValidationPipe(createSalesOrderSchema)) body: CreateSalesOrderInput,
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.salesOrdersService.create(body, tenant, user.id)
  }

  @Patch(':id')
  @RequirePermissions('sales.order.update')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateSalesOrderSchema)) body: UpdateSalesOrderInput,
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.salesOrdersService.update(id, body, tenant, user.id)
  }

  @Patch(':id/status')
  @RequirePermissions('sales.order.cancel')
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateSalesOrderStatusSchema)) body: UpdateSalesOrderStatusInput,
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.salesOrdersService.updateStatus(id, body, tenant, user.id)
  }
}
