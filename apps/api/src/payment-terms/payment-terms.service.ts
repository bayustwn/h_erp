import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import { createPaginationMeta, getPaginationSkipTake } from '../common/pagination/pagination.js'
import { RecordStatus } from '../generated/prisma/enums.js'
import { PrismaService } from '../prisma/prisma.service.js'
import type { TenantContext } from '../access-control/access-control.types.js'
import type { CreatePaymentTermInput, PaymentTermsQuery, UpdatePaymentTermInput, UpdatePaymentTermStatusInput } from './payment-terms.schemas.js'

@Injectable()
export class PaymentTermsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  async list(query: PaymentTermsQuery, tenant: TenantContext) {
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
            ],
          }
        : {}),
    }
    const [items, total] = await Promise.all([
      this.prisma.paymentTerm.findMany({
        where,
        ...getPaginationSkipTake(pagination),
        orderBy: [{ code: 'asc' }],
        select: this.paymentTermSelect(),
      }),
      this.prisma.paymentTerm.count({ where }),
    ])
    return { items, meta: createPaginationMeta(pagination, total) }
  }

  async getById(id: string, tenant: TenantContext) {
    const item = await this.prisma.paymentTerm.findFirst({
      where: { id, companyId: tenant.companyId, deletedAt: null },
      select: this.paymentTermSelect(),
    })
    if (!item) throw new NotFoundException('Payment term not found')
    return item
  }

  async create(input: CreatePaymentTermInput, tenant: TenantContext) {
    await this.assertCodeIsAvailable(input.code, tenant)
    if (input.isDefault) await this.clearDefaultFlag(tenant)
    return this.prisma.paymentTerm.create({
      data: { companyId: tenant.companyId, ...input },
      select: this.paymentTermSelect(),
    })
  }

  async update(id: string, input: UpdatePaymentTermInput, tenant: TenantContext) {
    await this.getById(id, tenant)
    if (input.isDefault) await this.clearDefaultFlag(tenant)
    return this.prisma.paymentTerm.update({
      where: { id },
      data: input,
      select: this.paymentTermSelect(),
    })
  }

  async updateStatus(id: string, input: UpdatePaymentTermStatusInput, tenant: TenantContext) {
    await this.getById(id, tenant)
    return this.prisma.paymentTerm.update({
      where: { id },
      data: {
        status: input.status,
        deletedAt: input.status === RecordStatus.ARCHIVED ? new Date() : null,
      },
      select: this.paymentTermSelect(),
    })
  }

  private async assertCodeIsAvailable(code: string, tenant: TenantContext) {
    const existing = await this.prisma.paymentTerm.findFirst({
      where: { companyId: tenant.companyId, code, deletedAt: null },
      select: { id: true },
    })
    if (existing) throw new ConflictException('Payment term code is already used')
  }

  private async clearDefaultFlag(tenant: TenantContext) {
    await this.prisma.paymentTerm.updateMany({
      where: { companyId: tenant.companyId, isDefault: true, deletedAt: null },
      data: { isDefault: false },
    })
  }

  private paymentTermSelect() {
    return {
      id: true, companyId: true, code: true, name: true, description: true,
      daysDue: true, isDefault: true, status: true, createdAt: true, updatedAt: true,
    }
  }
}
