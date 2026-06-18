import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import { createPaginationMeta, getPaginationSkipTake } from '../common/pagination/pagination.js'
import type { Prisma } from '../generated/prisma/client.js'
import { AuditService } from '../audit/audit.service.js'
import { PrismaService } from '../prisma/prisma.service.js'
import type { TenantContext } from '../access-control/access-control.types.js'
import type { CreateDeliveryOrderInput, DeliveryOrderQuery, UpdateDeliveryOrderInput, UpdateDeliveryOrderStatusInput } from './delivery-orders.schemas.js'

@Injectable()
export class DeliveryOrdersService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly auditService: AuditService,
  ) {}

  async list(query: DeliveryOrderQuery, tenant: TenantContext) {
    const pagination = { page: query.page, pageSize: query.pageSize }
    const where: Prisma.DeliveryOrderWhereInput = {
      companyId: tenant.companyId,
      deletedAt: null,
      status: query.status,
      salesOrderId: query.salesOrderId,
      warehouseId: query.warehouseId,
      ...(query.search
        ? {
            OR: [
              { documentNumber: { contains: query.search, mode: 'insensitive' as const } },
              { customer: { name: { contains: query.search, mode: 'insensitive' as const } } },
            ],
          }
        : {}),
    }
    const [orders, total] = await Promise.all([
      this.prisma.deliveryOrder.findMany({
        where,
        ...getPaginationSkipTake(pagination),
        orderBy: [{ createdAt: 'desc' }],
        select: this.orderSelect(),
      }),
      this.prisma.deliveryOrder.count({ where }),
    ])
    return { items: orders, meta: createPaginationMeta(pagination, total) }
  }

  async getById(orderId: string, tenant: TenantContext) {
    const order = await this.prisma.deliveryOrder.findFirst({
      where: { id: orderId, companyId: tenant.companyId, deletedAt: null },
      select: this.orderDetailSelect(),
    })
    if (!order) throw new NotFoundException('Delivery order not found')
    return order
  }

  async create(input: CreateDeliveryOrderInput, tenant: TenantContext, actorUserId: string) {
    return this.prisma.$transaction(async (tx) => {
      const customerId = input.salesOrderId
        ? (await tx.salesOrder.findUniqueOrThrow({ where: { id: input.salesOrderId }, select: { customerId: true } })).customerId
        : (await tx.customer.findFirstOrThrow({ where: { companyId: tenant.companyId }, select: { id: true } })).id
      const order = await tx.deliveryOrder.create({
        data: {
          companyId: tenant.companyId,
          branchId: input.branchId,
          salesOrderId: input.salesOrderId,
          warehouseId: input.warehouseId,
          customerId,
          documentNumber: input.documentNumber,
          deliveryDate: input.deliveryDate ? new Date(input.deliveryDate) : new Date(),
          notes: input.notes,
          items: {
            create: input.items.map((item) => ({
              salesOrderItemId: item.salesOrderItemId,
              itemId: item.itemId,
              unitId: item.unitId,
              quantity: item.quantity,
              notes: item.notes,
            })),
          },
        },
        select: this.orderDetailSelect(),
      })
      await this.auditService.recordCreate({ tenant, actorUserId, entityType: 'DeliveryOrder', entityId: order.id, newValues: order }, tx)
      return order
    })
  }

  async update(orderId: string, input: UpdateDeliveryOrderInput, tenant: TenantContext, actorUserId: string) {
    const current = await this.getById(orderId, tenant)
    return this.prisma.$transaction(async (tx) => {
      if (input.items) {
        await tx.deliveryOrderItem.deleteMany({ where: { deliveryOrderId: orderId } })
      }
      const updated = await tx.deliveryOrder.update({
        where: { id: orderId },
        data: {
          warehouseId: input.warehouseId,
          branchId: input.branchId,
          notes: input.notes,
          ...(input.items
            ? {
                items: {
                  create: input.items.map((item) => ({
                    salesOrderItemId: item.salesOrderItemId,
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
      await this.auditService.recordUpdate({ tenant, actorUserId, entityType: 'DeliveryOrder', entityId: orderId, oldValues: current, newValues: updated }, tx)
      return updated
    })
  }

  async updateStatus(orderId: string, input: UpdateDeliveryOrderStatusInput, tenant: TenantContext, actorUserId: string) {
    const current = await this.getById(orderId, tenant)
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.deliveryOrder.update({
        where: { id: orderId },
        data: {
          status: input.status,
          deletedAt: input.status === 'CANCELLED' ? new Date() : undefined,
        },
        select: this.orderDetailSelect(),
      })
      const auditInput = { tenant, actorUserId, entityType: 'DeliveryOrder', entityId: orderId, oldValues: current, newValues: updated }
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
      salesOrderId: true,
      warehouseId: true,
      customerId: true,
      documentNumber: true,
      deliveryDate: true,
      status: true,
      notes: true,
      createdAt: true,
      updatedAt: true,
      customer: { select: { id: true, code: true, name: true } },
      warehouse: { select: { id: true, code: true, name: true } },
    }
  }

  private orderDetailSelect() {
    return {
      ...this.orderSelect(),
      items: {
        select: {
          id: true,
          salesOrderItemId: true,
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
