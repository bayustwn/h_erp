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
  customerPaymentQuerySchema, createCustomerPaymentSchema, updateCustomerPaymentStatusSchema,
  type CreateCustomerPaymentInput, type CustomerPaymentQuery, type UpdateCustomerPaymentStatusInput,
} from './customer-payments.schemas.js'
import { CustomerPaymentsService } from './customer-payments.service.js'

@ApiTags('Customer Payments')
@Controller('customer-payments')
@UseGuards(AuthGuard, TenantGuard, PermissionGuard)
@RequireTenant()
export class CustomerPaymentsController {
  constructor(
    @Inject(CustomerPaymentsService) private readonly service: CustomerPaymentsService,
  ) {}

  @Get()
  @RequirePermissions('finance.payment.read')
  list(@Query(new ZodValidationPipe(customerPaymentQuerySchema)) query: CustomerPaymentQuery, @CurrentTenant() tenant: TenantContext) {
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
    @Body(new ZodValidationPipe(createCustomerPaymentSchema)) body: CreateCustomerPaymentInput,
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.create(body, tenant, user.id)
  }

  @Patch(':id/status')
  @RequirePermissions('finance.payment.cancel')
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateCustomerPaymentStatusSchema)) body: UpdateCustomerPaymentStatusInput,
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.updateStatus(id, body, tenant, user.id)
  }
}
