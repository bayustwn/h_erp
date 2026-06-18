import { Body, Controller, Get, Inject, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { ParseUUIDPipe } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { PermissionGuard } from '../access-control/permission.guard.js'
import { RequirePermissions } from '../access-control/permissions.decorator.js'
import { CurrentTenant, RequireTenant } from '../access-control/tenant.decorator.js'
import { TenantGuard } from '../access-control/tenant.guard.js'
import type { TenantContext } from '../access-control/access-control.types.js'
import { AuthGuard } from '../auth/auth.guard.js'
import { ZodValidationPipe } from '../common/validation/zod-validation.pipe.js'
import { createPaymentMethodSchema, paymentMethodsQuerySchema, updatePaymentMethodSchema, updatePaymentMethodStatusSchema, type CreatePaymentMethodInput, type PaymentMethodsQuery, type UpdatePaymentMethodInput, type UpdatePaymentMethodStatusInput } from './payment-methods.schemas.js'
import { PaymentMethodsService } from './payment-methods.service.js'

@ApiTags('Payment Methods')
@Controller('payment-methods')
@UseGuards(AuthGuard, TenantGuard, PermissionGuard)
@RequireTenant()
export class PaymentMethodsController {
  constructor(@Inject(PaymentMethodsService) private readonly service: PaymentMethodsService) {}

  @Get()
  @RequirePermissions('payment-method.read')
  list(@Query(new ZodValidationPipe(paymentMethodsQuerySchema)) query: PaymentMethodsQuery, @CurrentTenant() tenant: TenantContext) { return this.service.list(query, tenant) }

  @Get(':id')
  @RequirePermissions('payment-method.read')
  getById(@Param('id', ParseUUIDPipe) id: string, @CurrentTenant() tenant: TenantContext) { return this.service.getById(id, tenant) }

  @Post()
  @RequirePermissions('payment-method.create')
  create(@Body(new ZodValidationPipe(createPaymentMethodSchema)) body: CreatePaymentMethodInput, @CurrentTenant() tenant: TenantContext) { return this.service.create(body, tenant) }

  @Patch(':id')
  @RequirePermissions('payment-method.update')
  update(@Param('id', ParseUUIDPipe) id: string, @Body(new ZodValidationPipe(updatePaymentMethodSchema)) body: UpdatePaymentMethodInput, @CurrentTenant() tenant: TenantContext) { return this.service.update(id, body, tenant) }

  @Patch(':id/status')
  @RequirePermissions('payment-method.delete')
  updateStatus(@Param('id', ParseUUIDPipe) id: string, @Body(new ZodValidationPipe(updatePaymentMethodStatusSchema)) body: UpdatePaymentMethodStatusInput, @CurrentTenant() tenant: TenantContext) { return this.service.updateStatus(id, body, tenant) }
}
