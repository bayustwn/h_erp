import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
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
  createWarehouseSchema,
  updateWarehouseSchema,
  updateWarehouseStatusSchema,
  warehousesQuerySchema,
  type CreateWarehouseInput,
  type UpdateWarehouseInput,
  type UpdateWarehouseStatusInput,
  type WarehousesQuery,
} from './warehouses.schemas.js'
import { WarehousesService } from './warehouses.service.js'

@Controller('warehouses')
@UseGuards(AuthGuard, TenantGuard, PermissionGuard)
@RequireTenant()
export class WarehousesController {
  constructor(private readonly warehousesService: WarehousesService) {}

  @Get()
  @RequirePermissions('warehouse.read')
  list(
    @Query(new ZodValidationPipe(warehousesQuerySchema)) query: WarehousesQuery,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.warehousesService.list(query, tenant)
  }

  @Get(':id')
  @RequirePermissions('warehouse.read')
  getById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.warehousesService.getById(id, tenant)
  }

  @Post()
  @RequirePermissions('warehouse.create')
  create(
    @Body(new ZodValidationPipe(createWarehouseSchema)) body: CreateWarehouseInput,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.warehousesService.create(body, tenant)
  }

  @Patch(':id')
  @RequirePermissions('warehouse.update')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateWarehouseSchema)) body: UpdateWarehouseInput,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.warehousesService.update(id, body, tenant)
  }

  @Patch(':id/status')
  @RequirePermissions('warehouse.delete')
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateWarehouseStatusSchema))
    body: UpdateWarehouseStatusInput,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.warehousesService.updateStatus(id, body, tenant)
  }
}
