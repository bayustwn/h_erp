import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import { createPaginationMeta, getPaginationSkipTake } from '../common/pagination/pagination.js'
import type { Prisma } from '../generated/prisma/client.js'
import { AuditService } from '../audit/audit.service.js'
import { IntegrationService } from '../integration/integration.service.js'
import { PrismaService } from '../prisma/prisma.service.js'
import type { TenantContext } from '../access-control/access-control.types.js'
import type { CreatePurchaseInvoiceInput, PurchaseInvoiceQuery, UpdatePurchaseInvoiceInput, UpdatePurchaseInvoiceStatusInput } from './purchase-invoices.schemas.js'

@Injectable()
export class PurchaseInvoicesService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly auditService: AuditService,
    @Inject(IntegrationService) private readonly integration: IntegrationService,
  ) {}

  async list(query: PurchaseInvoiceQuery, tenant: TenantContext) {
    const pagination = { page: query.page, pageSize: query.pageSize }
    const where: Prisma.PurchaseInvoiceWhereInput = {
      companyId: tenant.companyId,
      deletedAt: null,
      status: query.status,
      supplierId: query.supplierId,
      purchaseOrderId: query.purchaseOrderId,
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
              { supplier: { name: { contains: query.search, mode: 'insensitive' as const } } },
            ],
          }
        : {}),
    }
    const [invoices, total] = await Promise.all([
      this.prisma.purchaseInvoice.findMany({
        where,
        ...getPaginationSkipTake(pagination),
        orderBy: [{ createdAt: 'desc' }],
        select: this.invoiceSelect(),
      }),
      this.prisma.purchaseInvoice.count({ where }),
    ])
    return { items: invoices, meta: createPaginationMeta(pagination, total) }
  }

  async getById(invoiceId: string, tenant: TenantContext) {
    const invoice = await this.prisma.purchaseInvoice.findFirst({
      where: { id: invoiceId, companyId: tenant.companyId, deletedAt: null },
      select: this.invoiceDetailSelect(),
    })
    if (!invoice) throw new NotFoundException('Purchase invoice not found')
    return invoice
  }

  async create(input: CreatePurchaseInvoiceInput, tenant: TenantContext, actorUserId: string) {
    if (input.purchaseOrderId) {
      const po = await this.prisma.purchaseOrder.findUniqueOrThrow({
        where: { id: input.purchaseOrderId },
        select: {
          grandTotal: true,
          purchaseInvoices: { where: { deletedAt: null, status: { not: 'CANCELLED' } }, select: { grandTotal: true } },
        },
      })
      const invoicedSoFar = po.purchaseInvoices.reduce((s, i) => s + Number(i.grandTotal), 0)
      if (invoicedSoFar + Number(input.grandTotal) > Number(po.grandTotal)) {
        throw new BadRequestException(`Invoice total exceeds remaining PO balance. Remaining: ${Number(po.grandTotal) - invoicedSoFar}`)
      }
    }
    const docNumber = input.documentNumber || (await this.integration.generateDocNumber(tenant, 'PURCHASE_INVOICE', input.branchId)) || 'PI-TEMP'
    return this.prisma.$transaction(async (tx) => {
      const invoice = await tx.purchaseInvoice.create({
        data: {
          companyId: tenant.companyId,
          branchId: input.branchId,
          supplierId: input.supplierId,
          purchaseOrderId: input.purchaseOrderId,
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
      await this.auditService.recordCreate({ tenant, actorUserId, entityType: 'PurchaseInvoice', entityId: invoice.id, newValues: invoice }, tx)
      return invoice
    })
  }

  async update(invoiceId: string, input: UpdatePurchaseInvoiceInput, tenant: TenantContext, actorUserId: string) {
    const current = await this.getById(invoiceId, tenant)
    return this.prisma.$transaction(async (tx) => {
      if (input.items) {
        await tx.purchaseInvoiceItem.deleteMany({ where: { invoiceId } })
      }
      const updated = await tx.purchaseInvoice.update({
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
      await this.auditService.recordUpdate({ tenant, actorUserId, entityType: 'PurchaseInvoice', entityId: invoiceId, oldValues: current, newValues: updated }, tx)
      return updated
    })
  }

  async updateStatus(invoiceId: string, input: UpdatePurchaseInvoiceStatusInput, tenant: TenantContext, actorUserId: string) {
    const current = await this.getById(invoiceId, tenant)
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.purchaseInvoice.update({
        where: { id: invoiceId },
        data: {
          status: input.status,
          deletedAt: input.status === 'CANCELLED' ? new Date() : undefined,
        },
        select: this.invoiceDetailSelect(),
      })
      const auditInput = { tenant, actorUserId, entityType: 'PurchaseInvoice', entityId: invoiceId, oldValues: current, newValues: updated }
      if (input.status === 'CANCELLED') {
        await this.auditService.recordDelete(auditInput, tx)
      } else {
        await this.auditService.recordUpdate(auditInput, tx)
      }
      if (input.status === 'COMPLETED') {
        await this.postPurchaseInvoiceJournal(tx, updated, tenant)
      }
      return updated
    })
  }

  private async postPurchaseInvoiceJournal(
    tx: Prisma.TransactionClient,
    invoice: Awaited<ReturnType<PurchaseInvoicesService['getById']>>,
    tenant: TenantContext,
  ) {
    const apAccount = await this.integration.findApAccount(tx, tenant.companyId)
    if (!apAccount) return
    const lines: Array<{ accountId: string; debit: number; credit: number; description?: string }> = []
    lines.push({ accountId: apAccount.id, debit: 0, credit: Number(invoice.grandTotal), description: 'Purchase invoice' })
    for (const item of invoice.items) {
      const purchaseAccountId = await this.integration.findPurchaseAccount(tx, tenant.companyId, item.itemId)
      if (purchaseAccountId) {
        lines.push({ accountId: purchaseAccountId, debit: Number(item.totalPrice), credit: 0, description: item.item?.name ?? '' })
      }
    }
    if (Number(invoice.discountTotal) > 0) {
      const purchaseAccountId = await this.integration.findPurchaseAccount(tx, tenant.companyId, invoice.items[0]?.itemId ?? '')
      if (purchaseAccountId) {
        lines.push({ accountId: purchaseAccountId, debit: -Number(invoice.discountTotal), credit: 0 })
      }
    }
    if (Number(invoice.taxTotal) > 0) {
      const taxAccount = await this.integration.findApAccount(tx, tenant.companyId)
      if (taxAccount) {
        lines.push({ accountId: taxAccount.id, debit: 0, credit: -Number(invoice.taxTotal), description: 'PPN Input' })
      }
    }
    await this.integration.createJournalEntry(tx, {
      companyId: tenant.companyId,
      branchId: invoice.branchId ?? undefined,
      documentNumber: `JE-${invoice.documentNumber}`,
      entryDate: new Date(),
      description: `Purchase invoice ${invoice.documentNumber}`,
      referenceType: 'PURCHASE_INVOICE',
      referenceId: invoice.id,
      lines,
    })
  }

  private invoiceSelect() {
    return {
      id: true,
      companyId: true,
      branchId: true,
      supplierId: true,
      purchaseOrderId: true,
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
      supplier: { select: { id: true, code: true, name: true } },
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
