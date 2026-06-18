import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import { createPaginationMeta, getPaginationSkipTake } from '../common/pagination/pagination.js'
import type { Prisma } from '../generated/prisma/client.js'
import { AuditService } from '../audit/audit.service.js'
import { PrismaService } from '../prisma/prisma.service.js'
import type { TenantContext } from '../access-control/access-control.types.js'
import type { CreateSalesReturnInput, SalesReturnQuery, UpdateSalesReturnStatusInput } from './sales-returns.schemas.js'

@Injectable()
export class SalesReturnsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly auditService: AuditService,
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
    return this.prisma.$transaction(async (tx) => {
      const ret = await tx.salesReturn.create({
        data: {
          companyId: tenant.companyId,
          branchId: input.branchId,
          customerId: input.customerId,
          salesInvoiceId: input.salesInvoiceId,
          documentNumber: input.documentNumber,
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
      return updated
    })
  }

  private returnSelect() {
    return {
      id: true,
      companyId: true,
      branchId: true,
      customerId: true,
      salesInvoiceId: true,
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
