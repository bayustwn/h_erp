import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import { createPaginationMeta, getPaginationSkipTake } from '../common/pagination/pagination.js'
import type { Prisma } from '../generated/prisma/client.js'
import { AuditService } from '../audit/audit.service.js'
import { IntegrationService } from '../integration/integration.service.js'
import { PrismaService } from '../prisma/prisma.service.js'
import type { TenantContext } from '../access-control/access-control.types.js'
import type { CreateSalesInvoiceInput, SalesInvoiceQuery, UpdateSalesInvoiceInput, UpdateSalesInvoiceStatusInput } from './sales-invoices.schemas.js'

@Injectable()
export class SalesInvoicesService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly auditService: AuditService,
    @Inject(IntegrationService) private readonly integration: IntegrationService,
  ) {}

  async list(query: SalesInvoiceQuery, tenant: TenantContext) {
    const pagination = { page: query.page, pageSize: query.pageSize }
    const where: Prisma.SalesInvoiceWhereInput = {
      companyId: tenant.companyId,
      deletedAt: null,
      status: query.status,
      customerId: query.customerId,
      salesOrderId: query.salesOrderId,
      ...(query.startDate || query.endDate
        ? {
            invoiceDate: {
              ...(query.startDate ? { gte: new Date(query.startDate) } : {}),
              ...(query.endDate ? { lte: new Date(query.endDate) } : {}),
            },
          }
        : {}),
      ...(query.search
        ? {
            OR: [
              { documentNumber: { contains: query.search, mode: 'insensitive' as const } },
              { customer: { name: { contains: query.search, mode: 'insensitive' as const } } },
            ],
          }
        : {}),
    }
    const [invoices, total] = await Promise.all([
      this.prisma.salesInvoice.findMany({
        where,
        ...getPaginationSkipTake(pagination),
        orderBy: [{ createdAt: 'desc' }],
        select: this.invoiceSelect(),
      }),
      this.prisma.salesInvoice.count({ where }),
    ])
    return { items: invoices, meta: createPaginationMeta(pagination, total) }
  }

  async getById(invoiceId: string, tenant: TenantContext) {
    const invoice = await this.prisma.salesInvoice.findFirst({
      where: { id: invoiceId, companyId: tenant.companyId, deletedAt: null },
      select: this.invoiceDetailSelect(),
    })
    if (!invoice) throw new NotFoundException('Sales invoice not found')
    return invoice
  }

  async create(input: CreateSalesInvoiceInput, tenant: TenantContext, actorUserId: string) {
    if (input.salesOrderId) {
      const so = await this.prisma.salesOrder.findUniqueOrThrow({
        where: { id: input.salesOrderId },
        select: {
          grandTotal: true,
          salesInvoices: { where: { deletedAt: null, status: { not: 'CANCELLED' } }, select: { grandTotal: true } },
        },
      })
      const invoicedSoFar = so.salesInvoices.reduce((s, i) => s + Number(i.grandTotal), 0)
      if (invoicedSoFar + Number(input.grandTotal) > Number(so.grandTotal)) {
        throw new BadRequestException(`Invoice total exceeds remaining SO balance. Remaining: ${Number(so.grandTotal) - invoicedSoFar}`)
      }
    }
    const docNumber = input.documentNumber || (await this.integration.generateDocNumber(tenant, 'SALES_INVOICE', input.branchId)) || 'SI-TEMP'
    return this.prisma.$transaction(async (tx) => {
      const invoice = await tx.salesInvoice.create({
        data: {
          companyId: tenant.companyId,
          branchId: input.branchId,
          customerId: input.customerId,
          salesOrderId: input.salesOrderId,
          documentNumber: docNumber,
          invoiceDate: input.invoiceDate ? new Date(input.invoiceDate) : new Date(),
          dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
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
              discountAmount: item.discountAmount,
              taxId: item.taxId,
              taxRate: item.taxRate,
              taxAmount: item.taxAmount,
              totalPrice: item.totalPrice,
              notes: item.notes,
            })),
          },
        },
        select: this.invoiceDetailSelect(),
      })
      await this.auditService.recordCreate({ tenant, actorUserId, entityType: 'SalesInvoice', entityId: invoice.id, newValues: invoice }, tx)
      return invoice
    })
  }

  async update(invoiceId: string, input: UpdateSalesInvoiceInput, tenant: TenantContext, actorUserId: string) {
    const current = await this.getById(invoiceId, tenant)
    return this.prisma.$transaction(async (tx) => {
      if (input.items) {
        await tx.salesInvoiceItem.deleteMany({ where: { invoiceId } })
      }
      const updated = await tx.salesInvoice.update({
        where: { id: invoiceId },
        data: {
          branchId: input.branchId,
          invoiceDate: input.invoiceDate ? new Date(input.invoiceDate) : undefined,
          dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
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
        select: this.invoiceDetailSelect(),
      })
      await this.auditService.recordUpdate({ tenant, actorUserId, entityType: 'SalesInvoice', entityId: invoiceId, oldValues: current, newValues: updated }, tx)
      return updated
    })
  }

  async updateStatus(invoiceId: string, input: UpdateSalesInvoiceStatusInput, tenant: TenantContext, actorUserId: string) {
    const current = await this.getById(invoiceId, tenant)
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.salesInvoice.update({
        where: { id: invoiceId },
        data: {
          status: input.status,
          deletedAt: input.status === 'CANCELLED' ? new Date() : undefined,
        },
        select: this.invoiceDetailSelect(),
      })
      const auditInput = { tenant, actorUserId, entityType: 'SalesInvoice', entityId: invoiceId, oldValues: current, newValues: updated }
      if (input.status === 'CANCELLED') {
        await this.auditService.recordDelete(auditInput, tx)
      } else {
        await this.auditService.recordUpdate(auditInput, tx)
      }
      if (input.status === 'COMPLETED') {
        await this.postSalesInvoiceJournal(tx, updated, tenant)
      }
      return updated
    })
  }

  private async postSalesInvoiceJournal(
    tx: Prisma.TransactionClient,
    invoice: Awaited<ReturnType<SalesInvoicesService['getById']>>,
    tenant: TenantContext,
  ) {
    const arAccount = await this.integration.findArAccount(tx, tenant.companyId)
    if (!arAccount) return
    const lines: Array<{ accountId: string; debit: number; credit: number; description?: string }> = []
    lines.push({ accountId: arAccount.id, debit: Number(invoice.grandTotal), credit: 0, description: 'Sales invoice' })
    for (const item of invoice.items) {
      const revenueAccountId = await this.integration.findRevenueAccount(tx, tenant.companyId, item.itemId)
      if (revenueAccountId) {
        lines.push({ accountId: revenueAccountId, debit: 0, credit: Number(item.totalPrice), description: item.item?.name ?? '' })
      }
    }
    if (Number(invoice.discountTotal) > 0) {
      const revenueAccountId = await this.integration.findRevenueAccount(tx, tenant.companyId, invoice.items[0]?.itemId ?? '')
      if (revenueAccountId) {
        lines.push({ accountId: revenueAccountId, debit: 0, credit: -Number(invoice.discountTotal) })
      }
    }
    if (Number(invoice.taxTotal) > 0) {
      const taxAccount = await this.integration.findArAccount(tx, tenant.companyId)
      if (taxAccount) {
        lines.push({ accountId: taxAccount.id, debit: 0, credit: Number(invoice.taxTotal), description: 'PPN Output' })
      }
    }
    await this.integration.createJournalEntry(tx, {
      companyId: tenant.companyId,
      branchId: invoice.branchId ?? undefined,
      documentNumber: `JE-${invoice.documentNumber}`,
      entryDate: new Date(),
      description: `Sales invoice ${invoice.documentNumber}`,
      referenceType: 'SALES_INVOICE',
      referenceId: invoice.id,
      lines,
    })
  }

  private invoiceSelect() {
    return {
      id: true,
      companyId: true,
      branchId: true,
      customerId: true,
      salesOrderId: true,
      documentNumber: true,
      invoiceDate: true,
      dueDate: true,
      status: true,
      currency: true,
      subtotal: true,
      discountTotal: true,
      taxTotal: true,
      grandTotal: true,
      notes: true,
      createdAt: true,
      updatedAt: true,
      customer: { select: { id: true, code: true, name: true } },
    }
  }

  private invoiceDetailSelect() {
    return {
      ...this.invoiceSelect(),
      items: {
        select: {
          id: true,
          itemId: true,
          unitId: true,
          quantity: true,
          unitPrice: true,
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
