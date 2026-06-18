import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import { createPaginationMeta, getPaginationSkipTake } from '../common/pagination/pagination.js'
import type { Prisma } from '../generated/prisma/client.js'
import { AuditService } from '../audit/audit.service.js'
import { PrismaService } from '../prisma/prisma.service.js'
import type { TenantContext } from '../access-control/access-control.types.js'
import type { CreateGoodsReceiptInput, GoodsReceiptQuery, UpdateGoodsReceiptInput, UpdateGoodsReceiptStatusInput } from './goods-receipts.schemas.js'

@Injectable()
export class GoodsReceiptsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly auditService: AuditService,
  ) {}

  async list(query: GoodsReceiptQuery, tenant: TenantContext) {
    const pagination = { page: query.page, pageSize: query.pageSize }
    const where: Prisma.GoodsReceiptWhereInput = {
      companyId: tenant.companyId,
      deletedAt: null,
      status: query.status,
      purchaseOrderId: query.purchaseOrderId,
      warehouseId: query.warehouseId,
      ...(query.search
        ? {
            OR: [
              { documentNumber: { contains: query.search, mode: 'insensitive' as const } },
              { supplier: { name: { contains: query.search, mode: 'insensitive' as const } } },
            ],
          }
        : {}),
    }
    const [orders, total] = await Promise.all([
      this.prisma.goodsReceipt.findMany({
        where,
        ...getPaginationSkipTake(pagination),
        orderBy: [{ createdAt: 'desc' }],
        select: this.orderSelect(),
      }),
      this.prisma.goodsReceipt.count({ where }),
    ])
    return { items: orders, meta: createPaginationMeta(pagination, total) }
  }

  async getById(orderId: string, tenant: TenantContext) {
    const order = await this.prisma.goodsReceipt.findFirst({
      where: { id: orderId, companyId: tenant.companyId, deletedAt: null },
      select: this.orderDetailSelect(),
    })
    if (!order) throw new NotFoundException('Goods receipt not found')
    return order
  }

  async create(input: CreateGoodsReceiptInput, tenant: TenantContext, actorUserId: string) {
    return this.prisma.$transaction(async (tx) => {
      const supplierId = input.purchaseOrderId
        ? (await tx.purchaseOrder.findUniqueOrThrow({ where: { id: input.purchaseOrderId }, select: { supplierId: true } })).supplierId
        : (await tx.supplier.findFirstOrThrow({ where: { companyId: tenant.companyId }, select: { id: true } })).id
      const order = await tx.goodsReceipt.create({
        data: {
          companyId: tenant.companyId,
          branchId: input.branchId,
          purchaseOrderId: input.purchaseOrderId,
          warehouseId: input.warehouseId,
          supplierId,
          documentNumber: input.documentNumber,
          receiptDate: input.receiptDate ? new Date(input.receiptDate) : new Date(),
          notes: input.notes,
          items: {
            create: input.items.map((item) => ({
              purchaseOrderItemId: item.purchaseOrderItemId,
              itemId: item.itemId,
              unitId: item.unitId,
              quantity: item.quantity,
              notes: item.notes,
            })),
          },
        },
        select: this.orderDetailSelect(),
      })
      await this.auditService.recordCreate({ tenant, actorUserId, entityType: 'GoodsReceipt', entityId: order.id, newValues: order }, tx)
      return order
    })
  }

  async update(orderId: string, input: UpdateGoodsReceiptInput, tenant: TenantContext, actorUserId: string) {
    const current = await this.getById(orderId, tenant)
    return this.prisma.$transaction(async (tx) => {
      if (input.items) {
        await tx.goodsReceiptItem.deleteMany({ where: { goodsReceiptId: orderId } })
      }
      const updated = await tx.goodsReceipt.update({
        where: { id: orderId },
        data: {
          warehouseId: input.warehouseId,
          branchId: input.branchId,
          notes: input.notes,
          ...(input.items
            ? {
                items: {
                  create: input.items.map((item) => ({
                    purchaseOrderItemId: item.purchaseOrderItemId,
                    itemId: item.itemId,
                    unitId: item.unitId,
                    quantity: item.quantity,
                    notes: item.notes,
                  })),
                },
              }
            : {}),
        },
        select: this.orderDetailSelect(),
      })
      await this.auditService.recordUpdate({ tenant, actorUserId, entityType: 'GoodsReceipt', entityId: orderId, oldValues: current, newValues: updated }, tx)
      return updated
    })
  }

  async updateStatus(orderId: string, input: UpdateGoodsReceiptStatusInput, tenant: TenantContext, actorUserId: string) {
    const current = await this.getById(orderId, tenant)
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.goodsReceipt.update({
        where: { id: orderId },
        data: {
          status: input.status,
          deletedAt: input.status === 'CANCELLED' ? new Date() : undefined,
        },
        select: this.orderDetailSelect(),
      })
      const auditInput = { tenant, actorUserId, entityType: 'GoodsReceipt', entityId: orderId, oldValues: current, newValues: updated }
      if (input.status === 'CANCELLED') {
        await this.auditService.recordDelete(auditInput, tx)
      } else {
        await this.auditService.recordUpdate(auditInput, tx)
      }
      return updated
    })
  }

  private orderSelect() {
    return {
      id: true,
      companyId: true,
      branchId: true,
      purchaseOrderId: true,
      warehouseId: true,
      supplierId: true,
      documentNumber: true,
      receiptDate: true,
      status: true,
      notes: true,
      createdAt: true,
      updatedAt: true,
      supplier: { select: { id: true, code: true, name: true } },
      warehouse: { select: { id: true, code: true, name: true } },
    }
  }

  private orderDetailSelect() {
    return {
      ...this.orderSelect(),
      items: {
        select: {
          id: true,
          purchaseOrderItemId: true,
          itemId: true,
          unitId: true,
          quantity: true,
          notes: true,
          item: { select: { id: true, sku: true, name: true } },
          unit: { select: { id: true, code: true, name: true } },
        },
      },
    }
  }
}
