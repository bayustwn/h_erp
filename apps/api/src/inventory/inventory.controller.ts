import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
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
  categoriesQuerySchema,
  createCategorySchema,
  createItemSchema,
  createUnitSchema,
  itemsQuerySchema,
  unitsQuerySchema,
  updateCategorySchema,
  updateItemSchema,
  updateStatusSchema,
  updateUnitSchema,
  type CategoriesQuery,
  type CreateCategoryInput,
  type CreateItemInput,
  type CreateUnitInput,
  type ItemsQuery,
  type UnitsQuery,
  type UpdateCategoryInput,
  type UpdateItemInput,
  type UpdateStatusInput,
  type UpdateUnitInput,
} from './inventory.schemas.js'
import { InventoryService } from './inventory.service.js'

@ApiTags('Inventory')
@Controller('inventory')
@UseGuards(AuthGuard, TenantGuard, PermissionGuard)
@RequireTenant()
export class InventoryController {
  constructor(
    @Inject(InventoryService) private readonly inventoryService: InventoryService,
  ) {}

  @Get('units')
  @RequirePermissions('inventory.item.read')
  listUnits(
    @Query(new ZodValidationPipe(unitsQuerySchema)) query: UnitsQuery,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.inventoryService.listUnits(query, tenant)
  }

  @Get('units/:id')
  @RequirePermissions('inventory.item.read')
  getUnit(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.inventoryService.getUnit(id, tenant)
  }

  @Post('units')
  @RequirePermissions('inventory.item.create')
  createUnit(
    @Body(new ZodValidationPipe(createUnitSchema)) body: CreateUnitInput,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.inventoryService.createUnit(body, tenant)
  }

  @Patch('units/:id')
  @RequirePermissions('inventory.item.update')
  updateUnit(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateUnitSchema)) body: UpdateUnitInput,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.inventoryService.updateUnit(id, body, tenant)
  }

  @Patch('units/:id/status')
  @RequirePermissions('inventory.item.delete')
  updateUnitStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateStatusSchema)) body: UpdateStatusInput,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.inventoryService.updateUnitStatus(id, body, tenant)
  }

  @Get('categories')
  @RequirePermissions('inventory.item.read')
  listCategories(
    @Query(new ZodValidationPipe(categoriesQuerySchema)) query: CategoriesQuery,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.inventoryService.listCategories(query, tenant)
  }

  @Get('categories/:id')
  @RequirePermissions('inventory.item.read')
  getCategory(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.inventoryService.getCategory(id, tenant)
  }

  @Post('categories')
  @RequirePermissions('inventory.item.create')
  createCategory(
    @Body(new ZodValidationPipe(createCategorySchema)) body: CreateCategoryInput,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.inventoryService.createCategory(body, tenant)
  }

  @Patch('categories/:id')
  @RequirePermissions('inventory.item.update')
  updateCategory(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateCategorySchema)) body: UpdateCategoryInput,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.inventoryService.updateCategory(id, body, tenant)
  }

  @Patch('categories/:id/status')
  @RequirePermissions('inventory.item.delete')
  updateCategoryStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateStatusSchema)) body: UpdateStatusInput,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.inventoryService.updateCategoryStatus(id, body, tenant)
  }

  @Get('items')
  @RequirePermissions('inventory.item.read')
  listItems(
    @Query(new ZodValidationPipe(itemsQuerySchema)) query: ItemsQuery,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.inventoryService.listItems(query, tenant)
  }

  @Get('items/:id')
  @RequirePermissions('inventory.item.read')
  getItem(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.inventoryService.getItem(id, tenant)
  }

  @Post('items')
  @RequirePermissions('inventory.item.create')
  createItem(
    @Body(new ZodValidationPipe(createItemSchema)) body: CreateItemInput,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.inventoryService.createItem(body, tenant)
  }

  @Patch('items/:id')
  @RequirePermissions('inventory.item.update')
  updateItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateItemSchema)) body: UpdateItemInput,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.inventoryService.updateItem(id, body, tenant)
  }

  @Patch('items/:id/status')
  @RequirePermissions('inventory.item.delete')
  updateItemStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateStatusSchema)) body: UpdateStatusInput,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.inventoryService.updateItemStatus(id, body, tenant)
  }
}
