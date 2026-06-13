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
  constructor(
    @Inject(WarehousesService) private readonly warehousesService: WarehousesService,
  ) {}

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
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.warehousesService.create(body, tenant, user.id)
  }

  @Patch(':id')
  @RequirePermissions('warehouse.update')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateWarehouseSchema)) body: UpdateWarehouseInput,
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.warehousesService.update(id, body, tenant, user.id)
  }

  @Patch(':id/status')
  @RequirePermissions('warehouse.delete')
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateWarehouseStatusSchema))
    body: UpdateWarehouseStatusInput,
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.warehousesService.updateStatus(id, body, tenant, user.id)
  }
}
