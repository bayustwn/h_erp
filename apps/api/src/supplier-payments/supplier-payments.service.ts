import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import { createPaginationMeta, getPaginationSkipTake } from '../common/pagination/pagination.js'
import type { Prisma } from '../generated/prisma/client.js'
import { AuditService } from '../audit/audit.service.js'
import { IntegrationService } from '../integration/integration.service.js'
import { PrismaService } from '../prisma/prisma.service.js'
import type { TenantContext } from '../access-control/access-control.types.js'
import type { CreateSupplierPaymentInput, SupplierPaymentQuery, UpdateSupplierPaymentStatusInput } from './supplier-payments.schemas.js'

@Injectable()
export class SupplierPaymentsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly auditService: AuditService,
    @Inject(IntegrationService) private readonly integration: IntegrationService,
  ) {}

  async list(query: SupplierPaymentQuery, tenant: TenantContext) {
    const pagination = { page: query.page, pageSize: query.pageSize }
    const where: Prisma.SupplierPaymentWhereInput = {
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
    const [payments, total] = await Promise.all([
      this.prisma.supplierPayment.findMany({
        where,
        ...getPaginationSkipTake(pagination),
        orderBy: [{ createdAt: 'desc' }],
        select: this.paymentSelect(),
      }),
      this.prisma.supplierPayment.count({ where }),
    ])
    return { items: payments, meta: createPaginationMeta(pagination, total) }
  }

  async getById(paymentId: string, tenant: TenantContext) {
    const payment = await this.prisma.supplierPayment.findFirst({
      where: { id: paymentId, companyId: tenant.companyId, deletedAt: null },
      select: this.paymentDetailSelect(),
    })
    if (!payment) throw new NotFoundException('Supplier payment not found')
    return payment
  }

  async create(input: CreateSupplierPaymentInput, tenant: TenantContext, actorUserId: string) {
    const docNumber = input.documentNumber || (await this.integration.generateDocNumber(tenant, 'SUPPLIER_PAYMENT', input.branchId)) || 'SP-TEMP'
    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.supplierPayment.create({
        data: {
          companyId: tenant.companyId,
          branchId: input.branchId,
          supplierId: input.supplierId,
          documentNumber: docNumber,
          paymentDate: input.paymentDate ? new Date(input.paymentDate) : new Date(),
          paymentMethodId: input.paymentMethodId,
          bankAccountId: input.bankAccountId,
          amount: input.amount,
          referenceNumber: input.referenceNumber,
          notes: input.notes,
          allocations: {
            create: input.allocations.map((a) => ({
              purchaseInvoiceId: a.purchaseInvoiceId,
              amount: a.amount,
            })),
          },
        },
        select: this.paymentDetailSelect(),
      })
      await this.auditService.recordCreate({ tenant, actorUserId, entityType: 'SupplierPayment', entityId: payment.id, newValues: payment }, tx)
      return payment
    })
  }

  async updateStatus(paymentId: string, input: UpdateSupplierPaymentStatusInput, tenant: TenantContext, actorUserId: string) {
    const current = await this.getById(paymentId, tenant)
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.supplierPayment.update({
        where: { id: paymentId },
        data: {
          status: input.status,
          deletedAt: input.status === 'CANCELLED' ? new Date() : undefined,
        },
        select: this.paymentDetailSelect(),
      })
      const auditInput = { tenant, actorUserId, entityType: 'SupplierPayment', entityId: paymentId, oldValues: current, newValues: updated }
      if (input.status === 'CANCELLED') {
        await this.auditService.recordDelete(auditInput, tx)
      } else {
        await this.auditService.recordUpdate(auditInput, tx)
      }
      if (input.status === 'COMPLETED') {
        await this.postPaymentJournal(tx, updated, tenant)
      }
      return updated
    })
  }

  private async postPaymentJournal(
    tx: Prisma.TransactionClient,
    payment: Awaited<ReturnType<SupplierPaymentsService['getById']>>,
    tenant: TenantContext,
  ) {
    const cashAccount = await this.integration.findCashAccount(tx, tenant.companyId)
    const apAccount = await this.integration.findApAccount(tx, tenant.companyId)
    if (!cashAccount || !apAccount) return
    const lines: Array<{ accountId: string; debit: number; credit: number; description?: string }> = [
      { accountId: apAccount.id, debit: Number(payment.amount), credit: 0, description: 'Supplier payment' },
      { accountId: cashAccount.id, debit: 0, credit: Number(payment.amount), description: 'Payment disbursed' },
    ]
    await this.integration.createJournalEntry(tx, {
      companyId: tenant.companyId,
      branchId: payment.branchId ?? undefined,
      documentNumber: `JE-${payment.documentNumber}`,
      entryDate: new Date(),
      description: `Supplier payment ${payment.documentNumber}`,
      referenceType: 'SUPPLIER_PAYMENT',
      referenceId: payment.id,
      lines,
    })
  }

  private paymentSelect() {
    return {
      id: true,
      companyId: true,
      branchId: true,
      supplierId: true,
      documentNumber: true,
      paymentDate: true,
      paymentMethodId: true,
      bankAccountId: true,
      amount: true,
      referenceNumber: true,
      notes: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      supplier: { select: { id: true, code: true, name: true } },
      paymentMethod: { select: { id: true, code: true, name: true } },
    }
  }

  private paymentDetailSelect() {
    return {
      ...this.paymentSelect(),
      allocations: {
        select: {
          id: true,
          purchaseInvoiceId: true,
          amount: true,
          purchaseInvoice: { select: { id: true, documentNumber: true } },
        },
      },
    }
  }
}
