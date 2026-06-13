import { randomUUID } from 'node:crypto'
import {
  Injectable,
  Inject,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common'
import type { TenantContext } from '../access-control/access-control.types.js'
import {
  createPaginationMeta,
  getPaginationSkipTake,
} from '../common/pagination/pagination.js'
import { InventoryItemType, RecordStatus } from '../generated/prisma/enums.js'
import { Prisma } from '../generated/prisma/client.js'
import { StockMovementSourceType, StockMovementType } from '../generated/prisma/enums.js'
import { PrismaService } from '../prisma/prisma.service.js'
import type {
  CreateStockAdjustmentInput,
  CreateStockTransferInput,
  StockBalancesQuery,
  StockMovementsQuery,
} from './inventory-stock.schemas.js'

type DbClient = PrismaService | Prisma.TransactionClient

@Injectable()
export class InventoryStockService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async listBalances(query: StockBalancesQuery, tenant: TenantContext) {
    const pagination = { page: query.page, pageSize: query.pageSize }
    const where = {
      companyId: tenant.companyId,
      warehouseId: query.warehouseId,
      itemId: query.itemId,
    }
    const [items, total] = await Promise.all([
      this.prisma.stockBalance.findMany({
        where,
        ...getPaginationSkipTake(pagination),
        orderBy: [{ warehouse: { code: 'asc' } }, { item: { sku: 'asc' } }],
        select: this.balanceSelect(),
      }),
      this.prisma.stockBalance.count({ where }),
    ])

    return { items, meta: createPaginationMeta(pagination, total) }
  }

  async listMovements(query: StockMovementsQuery, tenant: TenantContext) {
    const pagination = { page: query.page, pageSize: query.pageSize }
    const where = {
      companyId: tenant.companyId,
      warehouseId: query.warehouseId,
      itemId: query.itemId,
      movementType: query.movementType,
      sourceType: query.sourceType,
      sourceId: query.sourceId,
    }
    const [items, total] = await Promise.all([
      this.prisma.stockMovement.findMany({
        where,
        ...getPaginationSkipTake(pagination),
        orderBy: [{ occurredAt: 'desc' }, { createdAt: 'desc' }],
        select: this.movementSelect(),
      }),
      this.prisma.stockMovement.count({ where }),
    ])

    return { items, meta: createPaginationMeta(pagination, total) }
  }

  async createAdjustment(
    input: CreateStockAdjustmentInput,
    tenant: TenantContext,
    actorUserId: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await this.assertActiveWarehouse(input.warehouseId, tenant.companyId, tx)
      await this.assertStockItem(input.itemId, tenant.companyId, tx)

      const quantity = this.toDecimal(input.quantity)
      const movementType =
        input.direction === 'IN'
          ? StockMovementType.ADJUSTMENT_IN
          : StockMovementType.ADJUSTMENT_OUT
      const balance =
        input.direction === 'IN'
          ? await this.incrementBalance(
              tx,
              tenant.companyId,
              input.warehouseId,
              input.itemId,
              quantity,
            )
          : await this.decrementBalance(
              tx,
              tenant.companyId,
              input.warehouseId,
              input.itemId,
              quantity,
            )

      const movement = await tx.stockMovement.create({
        data: {
          companyId: tenant.companyId,
          warehouseId: input.warehouseId,
          itemId: input.itemId,
          movementType,
          sourceType: StockMovementSourceType.ADJUSTMENT,
          quantity,
          balanceAfter: balance.quantity,
          notes: input.notes,
          createdById: actorUserId,
        },
        select: this.movementSelect(),
      })

      return { balance, movement }
    })
  }

  async createTransfer(
    input: CreateStockTransferInput,
    tenant: TenantContext,
    actorUserId: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await Promise.all([
        this.assertActiveWarehouse(input.fromWarehouseId, tenant.companyId, tx),
        this.assertActiveWarehouse(input.toWarehouseId, tenant.companyId, tx),
        this.assertStockItem(input.itemId, tenant.companyId, tx),
      ])

      const sourceId = randomUUID()
      const quantity = this.toDecimal(input.quantity)
      const fromBalance = await this.decrementBalance(
        tx,
        tenant.companyId,
        input.fromWarehouseId,
        input.itemId,
        quantity,
      )
      const toBalance = await this.incrementBalance(
        tx,
        tenant.companyId,
        input.toWarehouseId,
        input.itemId,
        quantity,
      )

      const [outMovement, inMovement] = await Promise.all([
        tx.stockMovement.create({
          data: {
            companyId: tenant.companyId,
            warehouseId: input.fromWarehouseId,
            itemId: input.itemId,
            movementType: StockMovementType.TRANSFER_OUT,
            sourceType: StockMovementSourceType.TRANSFER,
            sourceId,
            quantity,
            balanceAfter: fromBalance.quantity,
            notes: input.notes,
            createdById: actorUserId,
          },
          select: this.movementSelect(),
        }),
        tx.stockMovement.create({
          data: {
            companyId: tenant.companyId,
            warehouseId: input.toWarehouseId,
            itemId: input.itemId,
            movementType: StockMovementType.TRANSFER_IN,
            sourceType: StockMovementSourceType.TRANSFER,
            sourceId,
            quantity,
            balanceAfter: toBalance.quantity,
            notes: input.notes,
            createdById: actorUserId,
          },
          select: this.movementSelect(),
        }),
      ])

      return {
        sourceId,
        fromBalance,
        toBalance,
        movements: [outMovement, inMovement],
      }
    })
  }

  private async assertActiveWarehouse(
    warehouseId: string,
    companyId: string,
    client: DbClient,
  ) {
    const warehouse = await client.warehouse.findFirst({
      where: {
        id: warehouseId,
        companyId,
        status: RecordStatus.ACTIVE,
        deletedAt: null,
      },
      select: { id: true },
    })
    if (!warehouse) throw new UnprocessableEntityException('Warehouse is invalid')
  }

  private async assertStockItem(itemId: string, companyId: string, client: DbClient) {
    const item = await client.inventoryItem.findFirst({
      where: {
        id: itemId,
        companyId,
        status: RecordStatus.ACTIVE,
        deletedAt: null,
      },
      select: { id: true, itemType: true, trackInventory: true },
    })
    if (!item) throw new UnprocessableEntityException('Item is invalid')
    if (item.itemType !== InventoryItemType.STOCK || !item.trackInventory) {
      throw new UnprocessableEntityException('Item is not stock-tracked')
    }
  }

  private async incrementBalance(
    client: DbClient,
    companyId: string,
    warehouseId: string,
    itemId: string,
    quantity: Prisma.Decimal,
  ) {
    return client.stockBalance.upsert({
      where: {
        companyId_warehouseId_itemId: { companyId, warehouseId, itemId },
      },
      create: { companyId, warehouseId, itemId, quantity },
      update: { quantity: { increment: quantity } },
      select: this.balanceSelect(),
    })
  }

  private async decrementBalance(
    client: DbClient,
    companyId: string,
    warehouseId: string,
    itemId: string,
    quantity: Prisma.Decimal,
  ) {
    await client.stockBalance.upsert({
      where: {
        companyId_warehouseId_itemId: { companyId, warehouseId, itemId },
      },
      create: { companyId, warehouseId, itemId, quantity: 0 },
      update: {},
    })

    const updated = await client.stockBalance.updateMany({
      where: {
        companyId,
        warehouseId,
        itemId,
        quantity: { gte: quantity },
      },
      data: { quantity: { decrement: quantity } },
    })
    if (updated.count !== 1) {
      throw new UnprocessableEntityException('Insufficient stock balance')
    }

    const balance = await client.stockBalance.findUnique({
      where: {
        companyId_warehouseId_itemId: { companyId, warehouseId, itemId },
      },
      select: this.balanceSelect(),
    })
    if (!balance) throw new NotFoundException('Stock balance not found')
    return balance
  }

  private toDecimal(quantity: number) {
    return new Prisma.Decimal(quantity.toString())
  }

  private balanceSelect() {
    return {
      id: true,
      companyId: true,
      warehouseId: true,
      itemId: true,
      quantity: true,
      createdAt: true,
      updatedAt: true,
      warehouse: { select: { id: true, code: true, name: true } },
      item: {
        select: {
          id: true,
          sku: true,
          name: true,
          baseUnit: { select: { id: true, code: true, symbol: true } },
        },
      },
    }
  }

  private movementSelect() {
    return {
      id: true,
      companyId: true,
      warehouseId: true,
      itemId: true,
      movementType: true,
      sourceType: true,
      sourceId: true,
      quantity: true,
      balanceAfter: true,
      notes: true,
      createdById: true,
      occurredAt: true,
      createdAt: true,
      warehouse: { select: { id: true, code: true, name: true } },
      item: {
        select: {
          id: true,
          sku: true,
          name: true,
          baseUnit: { select: { id: true, code: true, symbol: true } },
        },
      },
      createdBy: { select: { id: true, email: true, fullName: true } },
    }
  }
}
