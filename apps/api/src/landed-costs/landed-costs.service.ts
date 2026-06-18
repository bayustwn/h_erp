import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import { createPaginationMeta, getPaginationSkipTake } from '../common/pagination/pagination.js'
import type { Prisma } from '../generated/prisma/client.js'
import { AuditService } from '../audit/audit.service.js'
import { IntegrationService } from '../integration/integration.service.js'
import { PrismaService } from '../prisma/prisma.service.js'
import type { TenantContext } from '../access-control/access-control.types.js'
import type { CreateLandedCostInput, LandedCostQuery, UpdateLandedCostInput, UpdateLandedCostStatusInput } from './landed-costs.schemas.js'

@Injectable()
export class LandedCostsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly auditService: AuditService,
    @Inject(IntegrationService) private readonly integration: IntegrationService,
  ) {}

  async list(query: LandedCostQuery, tenant: TenantContext) {
    const pagination = { page: query.page, pageSize: query.pageSize }
    const where: Prisma.LandedCostWhereInput = {
      companyId: tenant.companyId,
      deletedAt: null,
      status: query.status,
      purchaseOrderId: query.purchaseOrderId,
      ...(query.search
        ? {
            OR: [
              { documentNumber: { contains: query.search, mode: 'insensitive' as const } },
              { purchaseOrder: { documentNumber: { contains: query.search, mode: 'insensitive' as const } } },
            ],
          }
        : {}),
    }
    const [items, total] = await Promise.all([
      this.prisma.landedCost.findMany({
        where,
        ...getPaginationSkipTake(pagination),
        orderBy: [{ createdAt: 'desc' }],
        select: this.landedCostSelect(),
      }),
      this.prisma.landedCost.count({ where }),
    ])
    return { items, meta: createPaginationMeta(pagination, total) }
  }

  async getById(id: string, tenant: TenantContext) {
    const item = await this.prisma.landedCost.findFirst({
      where: { id, companyId: tenant.companyId, deletedAt: null },
      select: this.landedCostDetailSelect(),
    })
    if (!item) throw new NotFoundException('Landed cost not found')
    return item
  }

  async create(input: CreateLandedCostInput, tenant: TenantContext, actorUserId: string) {
    const docNumber = input.documentNumber || (await this.integration.generateDocNumber(tenant, 'LANDED_COST', input.branchId, input.costDate ? new Date(input.costDate) : undefined)) || 'LC-TEMP'
    return this.prisma.$transaction(async (tx) => {
      const item = await tx.landedCost.create({
        data: {
          companyId: tenant.companyId,
          branchId: input.branchId,
          purchaseOrderId: input.purchaseOrderId,
          documentNumber: docNumber,
          costDate: input.costDate ? new Date(input.costDate) : new Date(),
          description: input.description,
          totalCost: input.totalCost,
          allocationMethod: input.allocationMethod,
          items: {
            create: input.items.map((i) => ({
              purchaseOrderItemId: i.purchaseOrderItemId,
              amount: i.amount,
              description: i.description,
            })),
          },
        },
        select: this.landedCostDetailSelect(),
      })
      await this.auditService.recordCreate({ tenant, actorUserId, entityType: 'LandedCost', entityId: item.id, newValues: item }, tx)
      return item
    })
  }

  async update(id: string, input: UpdateLandedCostInput, tenant: TenantContext, actorUserId: string) {
    const current = await this.getById(id, tenant)
    return this.prisma.$transaction(async (tx) => {
      if (input.items) {
        await tx.landedCostItem.deleteMany({ where: { landedCostId: id } })
      }
      const updated = await tx.landedCost.update({
        where: { id },
        data: {
          branchId: input.branchId,
          description: input.description,
          totalCost: input.totalCost,
          allocationMethod: input.allocationMethod,
          ...(input.items
            ? {
                items: {
                  create: input.items.map((i) => ({
                    purchaseOrderItemId: i.purchaseOrderItemId,
                    amount: i.amount,
                    description: i.description,
                  })),
                },
              }
            : {}),
        },
        select: this.landedCostDetailSelect(),
      })
      await this.auditService.recordUpdate({ tenant, actorUserId, entityType: 'LandedCost', entityId: id, oldValues: current, newValues: updated }, tx)
      return updated
    })
  }

  async updateStatus(id: string, input: UpdateLandedCostStatusInput, tenant: TenantContext, actorUserId: string) {
    const current = await this.getById(id, tenant)
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.landedCost.update({
        where: { id },
        data: {
          status: input.status,
          deletedAt: input.status === 'CANCELLED' ? new Date() : undefined,
        },
        select: this.landedCostDetailSelect(),
      })
      const auditInput = { tenant, actorUserId, entityType: 'LandedCost', entityId: id, oldValues: current, newValues: updated }
      if (input.status === 'CANCELLED') {
        await this.auditService.recordDelete(auditInput, tx)
      } else {
        await this.auditService.recordUpdate(auditInput, tx)
      }
      if (input.status === 'COMPLETED') {
        await this.applyLandedCost(tx, updated)
      }
      return updated
    })
  }

  private async applyLandedCost(
    tx: Prisma.TransactionClient,
    landedCost: Awaited<ReturnType<LandedCostsService['getById']>>,
  ) {
    if (!landedCost.items?.length) return
    const poItems = await tx.purchaseOrderItem.findMany({
      where: { id: { in: landedCost.items.map((i) => i.purchaseOrderItemId) } },
      select: { id: true, totalPrice: true },
    })
    const poTotal = poItems.reduce((s, i) => s + Number(i.totalPrice), 0)
    if (poTotal <= 0) return
    for (const li of landedCost.items) {
      const poItem = poItems.find((p) => p.id === li.purchaseOrderItemId)
      if (!poItem) continue
      const ratio = Number(poItem.totalPrice) / poTotal
      const costAllocated = Number(li.amount) * ratio
      await tx.purchaseOrderItem.update({
        where: { id: li.purchaseOrderItemId },
        data: { totalPrice: Number(poItem.totalPrice) + costAllocated },
      })
    }
  }

  private landedCostSelect() {
    return {
      id: true,
      companyId: true,
      branchId: true,
      purchaseOrderId: true,
      documentNumber: true,
      costDate: true,
      status: true,
      description: true,
      totalCost: true,
      allocationMethod: true,
      createdAt: true,
      updatedAt: true,
      purchaseOrder: { select: { id: true, documentNumber: true } },
    }
  }

  private landedCostDetailSelect() {
    return {
      ...this.landedCostSelect(),
      items: {
        select: {
          id: true,
          purchaseOrderItemId: true,
          amount: true,
          description: true,
          purchaseOrderItem: {
            select: { id: true, itemId: true, item: { select: { id: true, sku: true, name: true } } },
          },
        },
      },
    }
  }
}
