import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import { createPaginationMeta, getPaginationSkipTake } from '../common/pagination/pagination.js'
import type { Prisma } from '../generated/prisma/client.js'
import { AuditService } from '../audit/audit.service.js'
import { PrismaService } from '../prisma/prisma.service.js'
import type { TenantContext } from '../access-control/access-control.types.js'
import type { CreateCustomerPaymentInput, CustomerPaymentQuery, UpdateCustomerPaymentStatusInput } from './customer-payments.schemas.js'

@Injectable()
export class CustomerPaymentsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly auditService: AuditService,
  ) {}

  async list(query: CustomerPaymentQuery, tenant: TenantContext) {
    const pagination = { page: query.page, pageSize: query.pageSize }
    const where: Prisma.CustomerPaymentWhereInput = {
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
    const [payments, total] = await Promise.all([
      this.prisma.customerPayment.findMany({
        where,
        ...getPaginationSkipTake(pagination),
        orderBy: [{ createdAt: 'desc' }],
        select: this.paymentSelect(),
      }),
      this.prisma.customerPayment.count({ where }),
    ])
    return { items: payments, meta: createPaginationMeta(pagination, total) }
  }

  async getById(paymentId: string, tenant: TenantContext) {
    const payment = await this.prisma.customerPayment.findFirst({
      where: { id: paymentId, companyId: tenant.companyId, deletedAt: null },
      select: this.paymentDetailSelect(),
    })
    if (!payment) throw new NotFoundException('Customer payment not found')
    return payment
  }

  async create(input: CreateCustomerPaymentInput, tenant: TenantContext, actorUserId: string) {
    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.customerPayment.create({
        data: {
          companyId: tenant.companyId,
          branchId: input.branchId,
          customerId: input.customerId,
          documentNumber: input.documentNumber,
          paymentDate: input.paymentDate ? new Date(input.paymentDate) : new Date(),
          paymentMethodId: input.paymentMethodId,
          bankAccountId: input.bankAccountId,
          amount: input.amount,
          referenceNumber: input.referenceNumber,
          notes: input.notes,
          allocations: {
            create: input.allocations.map((a) => ({
              salesInvoiceId: a.salesInvoiceId,
              amount: a.amount,
            })),
          },
        },
        select: this.paymentDetailSelect(),
      })
      await this.auditService.recordCreate({ tenant, actorUserId, entityType: 'CustomerPayment', entityId: payment.id, newValues: payment }, tx)
      return payment
    })
  }

  async updateStatus(paymentId: string, input: UpdateCustomerPaymentStatusInput, tenant: TenantContext, actorUserId: string) {
    const current = await this.getById(paymentId, tenant)
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.customerPayment.update({
        where: { id: paymentId },
        data: {
          status: input.status,
          deletedAt: input.status === 'CANCELLED' ? new Date() : undefined,
        },
        select: this.paymentDetailSelect(),
      })
      const auditInput = { tenant, actorUserId, entityType: 'CustomerPayment', entityId: paymentId, oldValues: current, newValues: updated }
      if (input.status === 'CANCELLED') {
        await this.auditService.recordDelete(auditInput, tx)
      } else {
        await this.auditService.recordUpdate(auditInput, tx)
      }
      return updated
    })
  }

  private paymentSelect() {
    return {
      id: true,
      companyId: true,
      branchId: true,
      customerId: true,
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
      customer: { select: { id: true, code: true, name: true } },
      paymentMethod: { select: { id: true, code: true, name: true } },
    }
  }

  private paymentDetailSelect() {
    return {
      ...this.paymentSelect(),
      allocations: {
        select: {
          id: true,
          salesInvoiceId: true,
          amount: true,
          salesInvoice: { select: { id: true, documentNumber: true } },
        },
      },
    }
  }
}
