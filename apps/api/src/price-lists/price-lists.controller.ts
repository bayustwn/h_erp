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
  createPriceListSchema, priceListsQuerySchema, updatePriceListSchema, updatePriceListStatusSchema,
  type CreatePriceListInput, type PriceListsQuery, type UpdatePriceListInput, type UpdatePriceListStatusInput,
} from './price-lists.schemas.js'
import { PriceListsService } from './price-lists.service.js'

@ApiTags('Price Lists')
@Controller('price-lists')
@UseGuards(AuthGuard, TenantGuard, PermissionGuard)
@RequireTenant()
export class PriceListsController {
  constructor(
    @Inject(PriceListsService) private readonly priceListsService: PriceListsService,
  ) {}

  @Get()
  @RequirePermissions('price-list.read')
  list(@Query(new ZodValidationPipe(priceListsQuerySchema)) query: PriceListsQuery, @CurrentTenant() tenant: TenantContext) {
    return this.priceListsService.list(query, tenant)
  }

  @Get(':id')
  @RequirePermissions('price-list.read')
  getById(@Param('id', ParseUUIDPipe) id: string, @CurrentTenant() tenant: TenantContext) {
    return this.priceListsService.getById(id, tenant)
  }

  @Post()
  @RequirePermissions('price-list.create')
  create(
    @Body(new ZodValidationPipe(createPriceListSchema)) body: CreatePriceListInput,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.priceListsService.create(body, tenant)
  }

  @Patch(':id')
  @RequirePermissions('price-list.update')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updatePriceListSchema)) body: UpdatePriceListInput,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.priceListsService.update(id, body, tenant)
  }

  @Patch(':id/status')
  @RequirePermissions('price-list.delete')
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updatePriceListStatusSchema)) body: UpdatePriceListStatusInput,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.priceListsService.updateStatus(id, body, tenant)
  }
}
