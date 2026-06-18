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
  customersQuerySchema, createCustomerSchema, updateCustomerSchema, updateCustomerStatusSchema,
  type CreateCustomerInput, type CustomersQuery, type UpdateCustomerInput, type UpdateCustomerStatusInput,
} from './customers.schemas.js'
import { CustomersService } from './customers.service.js'

@ApiTags('Customers')
@Controller('customers')
@UseGuards(AuthGuard, TenantGuard, PermissionGuard)
@RequireTenant()
export class CustomersController {
  constructor(
    @Inject(CustomersService) private readonly customersService: CustomersService,
  ) {}

  @Get()
  @RequirePermissions('customer.read')
  list(@Query(new ZodValidationPipe(customersQuerySchema)) query: CustomersQuery, @CurrentTenant() tenant: TenantContext) {
    return this.customersService.list(query, tenant)
  }

  @Get(':id')
  @RequirePermissions('customer.read')
  getById(@Param('id', ParseUUIDPipe) id: string, @CurrentTenant() tenant: TenantContext) {
    return this.customersService.getById(id, tenant)
  }

  @Post()
  @RequirePermissions('customer.create')
  create(
    @Body(new ZodValidationPipe(createCustomerSchema)) body: CreateCustomerInput,
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.customersService.create(body, tenant, user.id)
  }

  @Patch(':id')
  @RequirePermissions('customer.update')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateCustomerSchema)) body: UpdateCustomerInput,
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.customersService.update(id, body, tenant, user.id)
  }

  @Patch(':id/status')
  @RequirePermissions('customer.delete')
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateCustomerStatusSchema)) body: UpdateCustomerStatusInput,
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.customersService.updateStatus(id, body, tenant, user.id)
  }
}
