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
  suppliersQuerySchema, createSupplierSchema, updateSupplierSchema, updateSupplierStatusSchema,
  type CreateSupplierInput, type SuppliersQuery, type UpdateSupplierInput, type UpdateSupplierStatusInput,
} from './suppliers.schemas.js'
import { SuppliersService } from './suppliers.service.js'

@Controller('suppliers')
@UseGuards(AuthGuard, TenantGuard, PermissionGuard)
@RequireTenant()
export class SuppliersController {
  constructor(
    @Inject(SuppliersService) private readonly suppliersService: SuppliersService,
  ) {}

  @Get()
  @RequirePermissions('supplier.read')
  list(@Query(new ZodValidationPipe(suppliersQuerySchema)) query: SuppliersQuery, @CurrentTenant() tenant: TenantContext) {
    return this.suppliersService.list(query, tenant)
  }

  @Get(':id')
  @RequirePermissions('supplier.read')
  getById(@Param('id', ParseUUIDPipe) id: string, @CurrentTenant() tenant: TenantContext) {
    return this.suppliersService.getById(id, tenant)
  }

  @Post()
  @RequirePermissions('supplier.create')
  create(
    @Body(new ZodValidationPipe(createSupplierSchema)) body: CreateSupplierInput,
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.suppliersService.create(body, tenant, user.id)
  }

  @Patch(':id')
  @RequirePermissions('supplier.update')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateSupplierSchema)) body: UpdateSupplierInput,
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.suppliersService.update(id, body, tenant, user.id)
  }

  @Patch(':id/status')
  @RequirePermissions('supplier.delete')
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateSupplierStatusSchema)) body: UpdateSupplierStatusInput,
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.suppliersService.updateStatus(id, body, tenant, user.id)
  }
}
