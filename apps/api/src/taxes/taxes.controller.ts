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
import { ZodValidationPipe } from '../common/validation/zod-validation.pipe.js'
import {
  createTaxSchema, taxesQuerySchema, updateTaxSchema, updateTaxStatusSchema,
  type CreateTaxInput, type TaxesQuery, type UpdateTaxInput, type UpdateTaxStatusInput,
} from './taxes.schemas.js'
import { TaxesService } from './taxes.service.js'

@ApiTags('Taxes')
@Controller('taxes')
@UseGuards(AuthGuard, TenantGuard, PermissionGuard)
@RequireTenant()
export class TaxesController {
  constructor(
    @Inject(TaxesService) private readonly taxesService: TaxesService,
  ) {}

  @Get()
  @RequirePermissions('tax.read')
  list(@Query(new ZodValidationPipe(taxesQuerySchema)) query: TaxesQuery, @CurrentTenant() tenant: TenantContext) {
    return this.taxesService.list(query, tenant)
  }

  @Get(':id')
  @RequirePermissions('tax.read')
  getById(@Param('id', ParseUUIDPipe) id: string, @CurrentTenant() tenant: TenantContext) {
    return this.taxesService.getById(id, tenant)
  }

  @Post()
  @RequirePermissions('tax.create')
  create(
    @Body(new ZodValidationPipe(createTaxSchema)) body: CreateTaxInput,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.taxesService.create(body, tenant)
  }

  @Patch(':id')
  @RequirePermissions('tax.update')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateTaxSchema)) body: UpdateTaxInput,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.taxesService.update(id, body, tenant)
  }

  @Patch(':id/status')
  @RequirePermissions('tax.delete')
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateTaxStatusSchema)) body: UpdateTaxStatusInput,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.taxesService.updateStatus(id, body, tenant)
  }
}
