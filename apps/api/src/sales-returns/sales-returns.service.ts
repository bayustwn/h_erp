import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import { createPaginationMeta, getPaginationSkipTake } from '../common/pagination/pagination.js'
import type { Prisma } from '../generated/prisma/client.js'
import { AuditService } from '../audit/audit.service.js'
import { IntegrationService } from '../integration/integration.service.js'
import { PrismaService } from '../prisma/prisma.service.js'
import type { TenantContext } from '../access-control/access-control.types.js'
import type { CreateSalesReturnInput, SalesReturnQuery, UpdateSalesReturnStatusInput } from './sales-returns.schemas.js'

@Injectable()
export class SalesReturnsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly auditService: AuditService,
    @Inject(IntegrationService) private readonly integration: IntegrationService,
  ) {}

  async list(query: SalesReturnQuery, tenant: TenantContext) {
    const pagination = { page: query.page, pageSize: query.pageSize }
    const where: Prisma.SalesReturnWhereInput = {
      companyId: tenant.companyId,
      deletedAt: null,
      status: query.status,
      customerId: query.customerId,
      ...(query.search
        ? {
            OR: [
              { documentNumber: { contains: query.search, mode: 'insensitive' as const } },
              { customer: { name: { contains: query.search, mode: 'insensitive' as const } } },
            ],
          }
        : {}),
    }
    const [returns, total] = await Promise.all([
      this.prisma.salesReturn.findMany({
        where,
        ...getPaginationSkipTake(pagination),
        orderBy: [{ createdAt: 'desc' }],
        select: this.returnSelect(),
      }),
      this.prisma.salesReturn.count({ where }),
    ])
    return { items: returns, meta: createPaginationMeta(pagination, total) }
  }

  async getById(returnId: string, tenant: TenantContext) {
    const ret = await this.prisma.salesReturn.findFirst({
      where: { id: returnId, companyId: tenant.companyId, deletedAt: null },
      select: this.returnDetailSelect(),
    })
    if (!ret) throw new NotFoundException('Sales return not found')
    return ret
  }

  async create(input: CreateSalesReturnInput, tenant: TenantContext, actorUserId: string) {
    const docNumber = input.documentNumber || (await this.integration.generateDocNumber(tenant, 'SALES_RETURN', input.branchId)) || 'SR-TEMP'
    return this.prisma.$transaction(async (tx) => {
      const ret = await tx.salesReturn.create({
        data: {
          companyId: tenant.companyId,
          branchId: input.branchId,
          customerId: input.customerId,
          salesInvoiceId: input.salesInvoiceId,
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
      await this.auditService.recordCreate({ tenant, actorUserId, entityType: 'SalesReturn', entityId: ret.id, newValues: ret }, tx)
      return ret
    })
  }

  async updateStatus(returnId: string, input: UpdateSalesReturnStatusInput, tenant: TenantContext, actorUserId: string) {
    const current = await this.getById(returnId, tenant)
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.salesReturn.update({
        where: { id: returnId },
        data: {
          status: input.status,
          deletedAt: input.status === 'CANCELLED' ? new Date() : undefined,
        },
        select: this.returnDetailSelect(),
      })
      const auditInput = { tenant, actorUserId, entityType: 'SalesReturn', entityId: returnId, oldValues: current, newValues: updated }
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
              movementType: 'RETURN_IN',
              sourceType: 'SALES_DELIVERY',
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
    ret: Awaited<ReturnType<SalesReturnsService['getById']>>,
    tenant: TenantContext,
  ) {
    const arAccount = await this.integration.findArAccount(tx, tenant.companyId)
    if (!arAccount) return
    const lines: Array<{ accountId: string; debit: number; credit: number; description?: string }> = [
      { accountId: arAccount.id, debit: 0, credit: Number(ret.totalAmount), description: 'Sales return (credit note)' },
    ]
    for (const item of ret.items) {
      const revenueAccountId = await this.integration.findRevenueAccount(tx, tenant.companyId, item.itemId)
      if (revenueAccountId) {
        lines.push({ accountId: revenueAccountId, debit: Number(item.totalPrice), credit: 0, description: item.item?.name ?? '' })
      }
    }
    await this.integration.createJournalEntry(tx, {
      companyId: tenant.companyId,
      branchId: ret.branchId ?? undefined,
      documentNumber: `JE-${ret.documentNumber}`,
      entryDate: new Date(),
      description: `Sales return ${ret.documentNumber}`,
      referenceType: 'SALES_RETURN',
      referenceId: ret.id,
      lines,
    })
  }

  private returnSelect() {
    return {
      id: true,
      companyId: true,
      branchId: true,
      customerId: true,
      salesInvoiceId: true,
      warehouseId: true,
      documentNumber: true,
      returnDate: true,
      status: true,
      totalAmount: true,
      notes: true,
      createdAt: true,
      updatedAt: true,
      customer: { select: { id: true, code: true, name: true } },
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
