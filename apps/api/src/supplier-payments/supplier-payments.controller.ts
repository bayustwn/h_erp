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
  supplierPaymentQuerySchema, createSupplierPaymentSchema, updateSupplierPaymentStatusSchema,
  type CreateSupplierPaymentInput, type SupplierPaymentQuery, type UpdateSupplierPaymentStatusInput,
} from './supplier-payments.schemas.js'
import { SupplierPaymentsService } from './supplier-payments.service.js'

@Controller('supplier-payments')
@UseGuards(AuthGuard, TenantGuard, PermissionGuard)
@RequireTenant()
export class SupplierPaymentsController {
  constructor(
    @Inject(SupplierPaymentsService) private readonly service: SupplierPaymentsService,
  ) {}

  @Get()
  @RequirePermissions('finance.payment.read')
  list(@Query(new ZodValidationPipe(supplierPaymentQuerySchema)) query: SupplierPaymentQuery, @CurrentTenant() tenant: TenantContext) {
    return this.service.list(query, tenant)
  }

  @Get(':id')
  @RequirePermissions('finance.payment.read')
  getById(@Param('id', ParseUUIDPipe) id: string, @CurrentTenant() tenant: TenantContext) {
    return this.service.getById(id, tenant)
  }

  @Post()
  @RequirePermissions('finance.payment.create')
  create(
    @Body(new ZodValidationPipe(createSupplierPaymentSchema)) body: CreateSupplierPaymentInput,
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.create(body, tenant, user.id)
  }

  @Patch(':id/status')
  @RequirePermissions('finance.payment.cancel')
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateSupplierPaymentStatusSchema)) body: UpdateSupplierPaymentStatusInput,
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.updateStatus(id, body, tenant, user.id)
  }
}
