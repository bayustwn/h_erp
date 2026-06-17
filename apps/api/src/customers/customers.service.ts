import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import { createPaginationMeta, getPaginationSkipTake } from '../common/pagination/pagination.js'
import { AuditService } from '../audit/audit.service.js'
import { RecordStatus } from '../generated/prisma/enums.js'
import { PrismaService } from '../prisma/prisma.service.js'
import type { TenantContext } from '../access-control/access-control.types.js'
import type { CreateCustomerInput, CustomersQuery, UpdateCustomerInput, UpdateCustomerStatusInput } from './customers.schemas.js'

@Injectable()
export class CustomersService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly auditService: AuditService,
  ) {}

  async list(query: CustomersQuery, tenant: TenantContext) {
    const pagination = { page: query.page, pageSize: query.pageSize }
    const where = {
      companyId: tenant.companyId,
      deletedAt: null,
      status: query.status,
      ...(query.search
        ? {
            OR: [
              { code: { contains: query.search, mode: 'insensitive' as const } },
              { name: { contains: query.search, mode: 'insensitive' as const } },
              { phone: { contains: query.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    }
    const [customers, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        ...getPaginationSkipTake(pagination),
        orderBy: [{ code: 'asc' }, { name: 'asc' }],
        select: this.customerSelect(),
      }),
      this.prisma.customer.count({ where }),
    ])
    return { items: customers, meta: createPaginationMeta(pagination, total) }
  }

  async getById(customerId: string, tenant: TenantContext) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, companyId: tenant.companyId, deletedAt: null },
      select: this.customerSelect(),
    })
    if (!customer) throw new NotFoundException('Customer not found')
    return customer
  }

  async create(input: CreateCustomerInput, tenant: TenantContext, actorUserId: string) {
    await this.assertCodeIsAvailable(input.code, tenant)
    return this.prisma.$transaction(async (tx) => {
      const customer = await tx.customer.create({
        data: {
          companyId: tenant.companyId,
          code: input.code,
          name: input.name,
          phone: input.phone,
          email: input.email,
          address: input.address,
          taxNumber: input.taxNumber,
          creditLimit: input.creditLimit,
          paymentTerm: input.paymentTerm,
        },
        select: this.customerSelect(),
      })
      await this.auditService.recordCreate({ tenant, actorUserId, entityType: 'Customer', entityId: customer.id, newValues: customer }, tx)
      return customer
    })
  }

  async update(customerId: string, input: UpdateCustomerInput, tenant: TenantContext, actorUserId: string) {
    const current = await this.getById(customerId, tenant)
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.customer.update({
        where: { id: customerId },
        data: input,
        select: this.customerSelect(),
      })
      await this.auditService.recordUpdate({ tenant, actorUserId, entityType: 'Customer', entityId: customerId, oldValues: current, newValues: updated }, tx)
      return updated
    })
  }

  async updateStatus(customerId: string, input: UpdateCustomerStatusInput, tenant: TenantContext, actorUserId: string) {
    const current = await this.getById(customerId, tenant)
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.customer.update({
        where: { id: customerId },
        data: {
          status: input.status,
          deletedAt: input.status === RecordStatus.ARCHIVED ? new Date() : null,
        },
        select: this.customerSelect(),
      })
      const auditInput = { tenant, actorUserId, entityType: 'Customer', entityId: customerId, oldValues: current, newValues: updated }
      if (input.status === RecordStatus.ARCHIVED) {
        await this.auditService.recordDelete(auditInput, tx)
      } else {
        await this.auditService.recordUpdate(auditInput, tx)
      }
      return updated
    })
  }

  private async assertCodeIsAvailable(code: string, tenant: TenantContext) {
    const customer = await this.prisma.customer.findFirst({
      where: { companyId: tenant.companyId, code, deletedAt: null },
      select: { id: true },
    })
    if (customer) throw new ConflictException('Customer code is already used')
  }

  private customerSelect() {
    return {
      id: true,
      companyId: true,
      code: true,
      name: true,
      phone: true,
      email: true,
      address: true,
      taxNumber: true,
      creditLimit: true,
      paymentTerm: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    }
  }
}
