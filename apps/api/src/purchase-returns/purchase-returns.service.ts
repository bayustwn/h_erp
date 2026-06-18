import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import { createPaginationMeta, getPaginationSkipTake } from '../common/pagination/pagination.js'
import type { Prisma } from '../generated/prisma/client.js'
import { AuditService } from '../audit/audit.service.js'
import { IntegrationService } from '../integration/integration.service.js'
import { PrismaService } from '../prisma/prisma.service.js'
import type { TenantContext } from '../access-control/access-control.types.js'
import type { CreatePurchaseReturnInput, PurchaseReturnQuery, UpdatePurchaseReturnStatusInput } from './purchase-returns.schemas.js'

@Injectable()
export class PurchaseReturnsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly auditService: AuditService,
    @Inject(IntegrationService) private readonly integration: IntegrationService,
  ) {}

  async list(query: PurchaseReturnQuery, tenant: TenantContext) {
    const pagination = { page: query.page, pageSize: query.pageSize }
    const where: Prisma.PurchaseReturnWhereInput = {
      companyId: tenant.companyId,
      deletedAt: null,
      status: query.status,
      supplierId: query.supplierId,
      ...(query.search
        ? {
            OR: [
              { documentNumber: { contains: query.search, mode: 'insensitive' as const } },
              { supplier: { name: { contains: query.search, mode: 'insensitive' as const } } },
            ],
          }
        : {}),
    }
    const [returns, total] = await Promise.all([
      this.prisma.purchaseReturn.findMany({
        where,
        ...getPaginationSkipTake(pagination),
        orderBy: [{ createdAt: 'desc' }],
        select: this.returnSelect(),
      }),
      this.prisma.purchaseReturn.count({ where }),
    ])
    return { items: returns, meta: createPaginationMeta(pagination, total) }
  }

  async getById(returnId: string, tenant: TenantContext) {
    const ret = await this.prisma.purchaseReturn.findFirst({
      where: { id: returnId, companyId: tenant.companyId, deletedAt: null },
      select: this.returnDetailSelect(),
    })
    if (!ret) throw new NotFoundException('Purchase return not found')
    return ret
  }

  async create(input: CreatePurchaseReturnInput, tenant: TenantContext, actorUserId: string) {
    const docNumber = input.documentNumber || (await this.integration.generateDocNumber(tenant, 'PURCHASE_RETURN', input.branchId)) || 'PR-TEMP'
    return this.prisma.$transaction(async (tx) => {
      const ret = await tx.purchaseReturn.create({
        data: {
          companyId: tenant.companyId,
          branchId: input.branchId,
          supplierId: input.supplierId,
          purchaseInvoiceId: input.purchaseInvoiceId,
          warehouseId: input.warehouseId,
          documentNumber: docNumber,
          returnDate: input.returnDate ? new Date(input.returnDate) : new Date(),
          totalAmount: input.totalAmount,
          notes: input.notes,
          items: {
            create: input.items.map((item) => ({
              itemId: item.itemId,
              unitId: item.unitId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice,
              notes: item.notes,
            })),
          },
        },
        select: this.returnDetailSelect(),
      })
      await this.auditService.recordCreate({ tenant, actorUserId, entityType: 'PurchaseReturn', entityId: ret.id, newValues: ret }, tx)
      return ret
    })
  }

  async updateStatus(returnId: string, input: UpdatePurchaseReturnStatusInput, tenant: TenantContext, actorUserId: string) {
    const current = await this.getById(returnId, tenant)
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.purchaseReturn.update({
        where: { id: returnId },
        data: {
          status: input.status,
          deletedAt: input.status === 'CANCELLED' ? new Date() : undefined,
        },
        select: this.returnDetailSelect(),
      })
      const auditInput = { tenant, actorUserId, entityType: 'PurchaseReturn', entityId: returnId, oldValues: current, newValues: updated }
      if (input.status === 'CANCELLED') {
        await this.auditService.recordDelete(auditInput, tx)
      } else {
        await this.auditService.recordUpdate(auditInput, tx)
      }
      if (input.status === 'COMPLETED') {
        if (updated.warehouseId && updated.items) {
          for (const item of updated.items) {
            await this.integration.createStockMovement(tx, {
              companyId: tenant.companyId,
              warehouseId: updated.warehouseId,
              itemId: item.itemId,
              movementType: 'RETURN_OUT',
              sourceType: 'PURCHASE_RECEIPT',
              sourceId: returnId,
              quantity: Number(item.quantity),
              actorUserId,
            })
          }
        }
        await this.postReturnJournal(tx, updated, tenant)
      }
      return updated
    })
  }

  private async postReturnJournal(
    tx: Prisma.TransactionClient,
    ret: Awaited<ReturnType<PurchaseReturnsService['getById']>>,
    tenant: TenantContext,
  ) {
    const apAccount = await this.integration.findApAccount(tx, tenant.companyId)
    if (!apAccount) return
    const lines: Array<{ accountId: string; debit: number; credit: number; description?: string }> = [
      { accountId: apAccount.id, debit: Number(ret.totalAmount), credit: 0, description: 'Purchase return (debit note)' },
    ]
    for (const item of ret.items) {
      const purchaseAccountId = await this.integration.findPurchaseAccount(tx, tenant.companyId, item.itemId)
      if (purchaseAccountId) {
        lines.push({ accountId: purchaseAccountId, debit: 0, credit: Number(item.totalPrice), description: item.item?.name ?? '' })
      }
    }
    await this.integration.createJournalEntry(tx, {
      companyId: tenant.companyId,
      branchId: ret.branchId ?? undefined,
      documentNumber: `JE-${ret.documentNumber}`,
      entryDate: new Date(),
      description: `Purchase return ${ret.documentNumber}`,
      referenceType: 'PURCHASE_RETURN',
      referenceId: ret.id,
      lines,
    })
  }

  private returnSelect() {
    return {
      id: true,
      companyId: true,
      branchId: true,
      supplierId: true,
      purchaseInvoiceId: true,
      warehouseId: true,
      documentNumber: true,
      returnDate: true,
      status: true,
      totalAmount: true,
      notes: true,
      createdAt: true,
      updatedAt: true,
      supplier: { select: { id: true, code: true, name: true } },
    }
  }

  private returnDetailSelect() {
    return {
      ...this.returnSelect(),
      items: {
        select: {
          id: true,
          itemId: true,
          unitId: true,
          quantity: true,
          unitPrice: true,
          totalPrice: true,
          notes: true,
          item: { select: { id: true, sku: true, name: true } },
          unit: { select: { id: true, code: true, name: true } },
        },
      },
    }
  }
}
