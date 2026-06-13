import { Body, Controller, Get, Inject, Post, Query, UseGuards } from '@nestjs/common'
import { PermissionGuard } from '../access-control/permission.guard.js'
import { RequirePermissions } from '../access-control/permissions.decorator.js'
import { CurrentTenant, RequireTenant } from '../access-control/tenant.decorator.js'
import { TenantGuard } from '../access-control/tenant.guard.js'
import type { TenantContext } from '../access-control/access-control.types.js'
import { AuthGuard } from '../auth/auth.guard.js'
import { CurrentUser } from '../auth/current-user.decorator.js'
import type { AuthenticatedUser } from '../auth/auth.types.js'
import { ZodValidationPipe } from '../common/validation/zod-validation.pipe.js'
import {
  createStockAdjustmentSchema,
  createStockTransferSchema,
  stockBalancesQuerySchema,
  stockMovementsQuerySchema,
  type CreateStockAdjustmentInput,
  type CreateStockTransferInput,
  type StockBalancesQuery,
  type StockMovementsQuery,
} from './inventory-stock.schemas.js'
import { InventoryStockService } from './inventory-stock.service.js'

@Controller('inventory')
@UseGuards(AuthGuard, TenantGuard, PermissionGuard)
@RequireTenant()
export class InventoryStockController {
  constructor(
    @Inject(InventoryStockService)
    private readonly inventoryStockService: InventoryStockService,
  ) {}

  @Get('stock-balances')
  @RequirePermissions('inventory.stock.read')
  listBalances(
    @Query(new ZodValidationPipe(stockBalancesQuerySchema)) query: StockBalancesQuery,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.inventoryStockService.listBalances(query, tenant)
  }

  @Get('stock-movements')
  @RequirePermissions('inventory.stock.read')
  listMovements(
    @Query(new ZodValidationPipe(stockMovementsQuerySchema)) query: StockMovementsQuery,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.inventoryStockService.listMovements(query, tenant)
  }

  @Post('stock-adjustments')
  @RequirePermissions('inventory.stock.adjust')
  createAdjustment(
    @Body(new ZodValidationPipe(createStockAdjustmentSchema))
    body: CreateStockAdjustmentInput,
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.inventoryStockService.createAdjustment(body, tenant, user.id)
  }

  @Post('stock-transfers')
  @RequirePermissions('inventory.stock.transfer')
  createTransfer(
    @Body(new ZodValidationPipe(createStockTransferSchema))
    body: CreateStockTransferInput,
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.inventoryStockService.createTransfer(body, tenant, user.id)
  }
}
