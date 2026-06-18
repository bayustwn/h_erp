import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { ParseUUIDPipe } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { PermissionGuard } from '../access-control/permission.guard.js'
import { RequirePermissions } from '../access-control/permissions.decorator.js'
import { CurrentTenant, RequireTenant } from '../access-control/tenant.decorator.js'
import { TenantGuard } from '../access-control/tenant.guard.js'
import type { TenantContext } from '../access-control/access-control.types.js'
import { AuthGuard } from '../auth/auth.guard.js'
import { ZodValidationPipe } from '../common/validation/zod-validation.pipe.js'
import { createProductAccountingMappingSchema, productAccountingMappingsQuerySchema, updateProductAccountingMappingSchema, type CreateProductAccountingMappingInput, type ProductAccountingMappingsQuery, type UpdateProductAccountingMappingInput } from './product-accounting-mappings.schemas.js'
import { ProductAccountingMappingsService } from './product-accounting-mappings.service.js'

@ApiTags('Product Accounting Mappings')
@Controller('product-accounting-mappings')
@UseGuards(AuthGuard, TenantGuard, PermissionGuard)
@RequireTenant()
export class ProductAccountingMappingsController {
  constructor(@Inject(ProductAccountingMappingsService) private readonly service: ProductAccountingMappingsService) {}

  @Get()
  @RequirePermissions('product-accounting-mapping.read')
  list(@Query(new ZodValidationPipe(productAccountingMappingsQuerySchema)) query: ProductAccountingMappingsQuery, @CurrentTenant() tenant: TenantContext) { return this.service.list(query, tenant) }

  @Get(':id')
  @RequirePermissions('product-accounting-mapping.read')
  getById(@Param('id', ParseUUIDPipe) id: string, @CurrentTenant() tenant: TenantContext) { return this.service.getById(id, tenant) }

  @Post()
  @RequirePermissions('product-accounting-mapping.create')
  create(@Body(new ZodValidationPipe(createProductAccountingMappingSchema)) body: CreateProductAccountingMappingInput, @CurrentTenant() tenant: TenantContext) { return this.service.create(body, tenant) }

  @Patch(':id')
  @RequirePermissions('product-accounting-mapping.update')
  update(@Param('id', ParseUUIDPipe) id: string, @Body(new ZodValidationPipe(updateProductAccountingMappingSchema)) body: UpdateProductAccountingMappingInput, @CurrentTenant() tenant: TenantContext) { return this.service.update(id, body, tenant) }

  @Delete(':id')
  @RequirePermissions('product-accounting-mapping.delete')
  delete(@Param('id', ParseUUIDPipe) id: string, @CurrentTenant() tenant: TenantContext) { return this.service.delete(id, tenant) }
}
