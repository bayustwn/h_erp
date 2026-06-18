import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import { createPaginationMeta, getPaginationSkipTake } from '../common/pagination/pagination.js'
import type { Prisma } from '../generated/prisma/client.js'
import { AuditService } from '../audit/audit.service.js'
import { IntegrationService } from '../integration/integration.service.js'
import { PrismaService } from '../prisma/prisma.service.js'
import type { TenantContext } from '../access-control/access-control.types.js'
import type { CreatePurchaseOrderInput, PurchaseOrderQuery, UpdatePurchaseOrderInput, UpdatePurchaseOrderStatusInput } from './purchase-orders.schemas.js'

@Injectable()
export class PurchaseOrdersService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly auditService: AuditService,
    @Inject(IntegrationService) private readonly integration: IntegrationService,
  ) {}

  async list(query: PurchaseOrderQuery, tenant: TenantContext) {
    const pagination = { page: query.page, pageSize: query.pageSize }
    const where: Prisma.PurchaseOrderWhereInput = {
      companyId: tenant.companyId,
      deletedAt: null,
      status: query.status,
      supplierId: query.supplierId,
      ...(query.startDate || query.endDate
        ? {
            orderDate: {
              ...(query.startDate ? { gte: new Date(query.startDate) } : {}),
              ...(query.endDate ? { lte: new Date(query.endDate) } : {}),
            },
          }
        : {}),
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
      this.prisma.purchaseOrder.findMany({
        where,
        ...getPaginationSkipTake(pagination),
        orderBy: [{ createdAt: 'desc' }],
        select: this.orderSelect(),
      }),
      this.prisma.purchaseOrder.count({ where }),
    ])
    return { items: orders, meta: createPaginationMeta(pagination, total) }
  }

  async getById(orderId: string, tenant: TenantContext) {
    const order = await this.prisma.purchaseOrder.findFirst({
      where: { id: orderId, companyId: tenant.companyId, deletedAt: null },
      select: this.orderDetailSelect(),
    })
    if (!order) throw new NotFoundException('Purchase order not found')
    return order
  }

  async create(input: CreatePurchaseOrderInput, tenant: TenantContext, actorUserId: string) {
    const docNumber = input.documentNumber || (await this.integration.generateDocNumber(tenant, 'PURCHASE_ORDER', input.branchId)) || 'PO-TEMP'
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.purchaseOrder.create({
        data: {
          companyId: tenant.companyId,
          branchId: input.branchId,
          supplierId: input.supplierId,
          documentNumber: docNumber,
          referenceNumber: input.referenceNumber,
          orderDate: input.orderDate ? new Date(input.orderDate) : new Date(),
          expectedDate: input.expectedDate ? new Date(input.expectedDate) : undefined,
          currency: input.currency,
          subtotal: input.subtotal,
          discountTotal: input.discountTotal,
          taxTotal: input.taxTotal,
          grandTotal: input.grandTotal,
          notes: input.notes,
          items: {
            create: input.items.map((item) => ({
              itemId: item.itemId,
              unitId: item.unitId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              discountPercent: item.discountPercent,
              discountAmount: item.discountAmount,
              taxId: item.taxId,
              taxRate: item.taxRate,
              taxAmount: item.taxAmount,
              totalPrice: item.totalPrice,
              notes: item.notes,
            })),
          },
        },
        select: this.orderDetailSelect(),
      })
      await this.auditService.recordCreate({ tenant, actorUserId, entityType: 'PurchaseOrder', entityId: order.id, newValues: order }, tx)
      return order
    })
  }

  async update(orderId: string, input: UpdatePurchaseOrderInput, tenant: TenantContext, actorUserId: string) {
    const current = await this.getById(orderId, tenant)
    return this.prisma.$transaction(async (tx) => {
      if (input.items) {
        await tx.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: orderId } })
      }
      const updated = await tx.purchaseOrder.update({
        where: { id: orderId },
        data: {
          supplierId: input.supplierId,
          branchId: input.branchId,
          referenceNumber: input.referenceNumber,
          orderDate: input.orderDate ? new Date(input.orderDate) : undefined,
          expectedDate: input.expectedDate ? new Date(input.expectedDate) : undefined,
          currency: input.currency,
          subtotal: input.subtotal,
          discountTotal: input.discountTotal,
          taxTotal: input.taxTotal,
          grandTotal: input.grandTotal,
          notes: input.notes,
          ...(input.items
            ? {
                items: {
                  create: input.items.map((item) => ({
                    itemId: item.itemId,
                    unitId: item.unitId,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    discountPercent: item.discountPercent,
                    discountAmount: item.discountAmount,
                    taxId: item.taxId,
                    taxRate: item.taxRate,
                    taxAmount: item.taxAmount,
                    totalPrice: item.totalPrice,
                    notes: item.notes,
                  })),
                },
              }
            : {}),
        },
        select: this.orderDetailSelect(),
      })
      await this.auditService.recordUpdate({ tenant, actorUserId, entityType: 'PurchaseOrder', entityId: orderId, oldValues: current, newValues: updated }, tx)
      return updated
    })
  }

  async updateStatus(orderId: string, input: UpdatePurchaseOrderStatusInput, tenant: TenantContext, actorUserId: string) {
    const current = await this.getById(orderId, tenant)
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.purchaseOrder.update({
        where: { id: orderId },
        data: {
          status: input.status,
          deletedAt: input.status === 'CANCELLED' ? new Date() : undefined,
        },
        select: this.orderDetailSelect(),
      })
      const auditInput = { tenant, actorUserId, entityType: 'PurchaseOrder', entityId: orderId, oldValues: current, newValues: updated }
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
      supplierId: true,
      documentNumber: true,
      referenceNumber: true,
      orderDate: true,
      expectedDate: true,
      status: true,
      currency: true,
      subtotal: true,
      discountTotal: true,
      taxTotal: true,
      grandTotal: true,
      notes: true,
      createdAt: true,
      updatedAt: true,
      supplier: { select: { id: true, code: true, name: true } },
    }
  }

  private orderDetailSelect() {
    return {
      ...this.orderSelect(),
      items: {
        select: {
          id: true,
          itemId: true,
          unitId: true,
          quantity: true,
          unitPrice: true,
          discountPercent: true,
          discountAmount: true,
          taxId: true,
          taxRate: true,
          taxAmount: true,
          totalPrice: true,
          notes: true,
          item: { select: { id: true, sku: true, name: true } },
          unit: { select: { id: true, code: true, name: true } },
          tax: { select: { id: true, code: true, name: true, rate: true } },
        },
      },
    }
  }
}
