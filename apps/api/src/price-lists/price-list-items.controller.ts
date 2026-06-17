import {
  Body, Controller, Delete, Get, Inject, Param, Patch, Post, Query, UseGuards,
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
  createPriceListItemSchema, priceListItemsQuerySchema, updatePriceListItemSchema,
  type CreatePriceListItemInput, type PriceListItemsQuery, type UpdatePriceListItemInput,
} from './price-lists.schemas.js'
import { PriceListItemsService } from './price-list-items.service.js'

@Controller('price-lists/:priceListId/items')
@UseGuards(AuthGuard, TenantGuard, PermissionGuard)
@RequireTenant()
export class PriceListItemsController {
  constructor(
    @Inject(PriceListItemsService) private readonly priceListItemsService: PriceListItemsService,
  ) {}

  @Get()
  @RequirePermissions('price-list.read')
  list(
    @Param('priceListId', ParseUUIDPipe) priceListId: string,
    @Query(new ZodValidationPipe(priceListItemsQuerySchema)) query: PriceListItemsQuery,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.priceListItemsService.list(priceListId, query, tenant)
  }

  @Get(':id')
  @RequirePermissions('price-list.read')
  getById(
    @Param('priceListId', ParseUUIDPipe) priceListId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.priceListItemsService.getById(priceListId, id, tenant)
  }

  @Post()
  @RequirePermissions('price-list.create')
  create(
    @Param('priceListId', ParseUUIDPipe) priceListId: string,
    @Body(new ZodValidationPipe(createPriceListItemSchema)) body: CreatePriceListItemInput,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.priceListItemsService.create(priceListId, body, tenant)
  }

  @Patch(':id')
  @RequirePermissions('price-list.update')
  update(
    @Param('priceListId', ParseUUIDPipe) priceListId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updatePriceListItemSchema)) body: UpdatePriceListItemInput,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.priceListItemsService.update(priceListId, id, body, tenant)
  }

  @Delete(':id')
  @RequirePermissions('price-list.delete')
  delete(
    @Param('priceListId', ParseUUIDPipe) priceListId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.priceListItemsService.delete(priceListId, id, tenant)
  }
}
