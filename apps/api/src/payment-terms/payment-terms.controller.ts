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
import { ZodValidationPipe } from '../common/validation/zod-validation.pipe.js'
import {
  createPaymentTermSchema, paymentTermsQuerySchema, updatePaymentTermSchema, updatePaymentTermStatusSchema,
  type CreatePaymentTermInput, type PaymentTermsQuery, type UpdatePaymentTermInput, type UpdatePaymentTermStatusInput,
} from './payment-terms.schemas.js'
import { PaymentTermsService } from './payment-terms.service.js'

@Controller('payment-terms')
@UseGuards(AuthGuard, TenantGuard, PermissionGuard)
@RequireTenant()
export class PaymentTermsController {
  constructor(
    @Inject(PaymentTermsService) private readonly paymentTermsService: PaymentTermsService,
  ) {}

  @Get()
  @RequirePermissions('payment-term.read')
  list(@Query(new ZodValidationPipe(paymentTermsQuerySchema)) query: PaymentTermsQuery, @CurrentTenant() tenant: TenantContext) {
    return this.paymentTermsService.list(query, tenant)
  }

  @Get(':id')
  @RequirePermissions('payment-term.read')
  getById(@Param('id', ParseUUIDPipe) id: string, @CurrentTenant() tenant: TenantContext) {
    return this.paymentTermsService.getById(id, tenant)
  }

  @Post()
  @RequirePermissions('payment-term.create')
  create(
    @Body(new ZodValidationPipe(createPaymentTermSchema)) body: CreatePaymentTermInput,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.paymentTermsService.create(body, tenant)
  }

  @Patch(':id')
  @RequirePermissions('payment-term.update')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updatePaymentTermSchema)) body: UpdatePaymentTermInput,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.paymentTermsService.update(id, body, tenant)
  }

  @Patch(':id/status')
  @RequirePermissions('payment-term.delete')
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updatePaymentTermStatusSchema)) body: UpdatePaymentTermStatusInput,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.paymentTermsService.updateStatus(id, body, tenant)
  }
}
