import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import { createPaginationMeta, getPaginationSkipTake } from '../common/pagination/pagination.js'
import { RecordStatus } from '../generated/prisma/enums.js'
import { PrismaService } from '../prisma/prisma.service.js'
import type { TenantContext } from '../access-control/access-control.types.js'
import type { CreatePaymentMethodInput, PaymentMethodsQuery, UpdatePaymentMethodInput, UpdatePaymentMethodStatusInput } from './payment-methods.schemas.js'

@Injectable()
export class PaymentMethodsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async list(query: PaymentMethodsQuery, tenant: TenantContext) {
    const pagination = { page: query.page, pageSize: query.pageSize }
    const where = { companyId: tenant.companyId, deletedAt: null, status: query.status, ...(query.search ? { OR: [{ code: { contains: query.search, mode: 'insensitive' as const } }, { name: { contains: query.search, mode: 'insensitive' as const } }] } : {}) }
    const [items, total] = await Promise.all([
      this.prisma.paymentMethod.findMany({ where, ...getPaginationSkipTake(pagination), orderBy: [{ code: 'asc' }], select: { id: true, companyId: true, code: true, name: true, description: true, isDefault: true, status: true, createdAt: true, updatedAt: true } }),
      this.prisma.paymentMethod.count({ where }),
    ])
    return { items, meta: createPaginationMeta(pagination, total) }
  }

  async getById(id: string, tenant: TenantContext) {
    const item = await this.prisma.paymentMethod.findFirst({ where: { id, companyId: tenant.companyId, deletedAt: null }, select: { id: true, companyId: true, code: true, name: true, description: true, isDefault: true, status: true, createdAt: true, updatedAt: true } })
    if (!item) throw new NotFoundException('Payment method not found')
    return item
  }

  async create(input: CreatePaymentMethodInput, tenant: TenantContext) {
    await this.assertCodeIsAvailable(input.code, tenant)
    if (input.isDefault) await this.prisma.paymentMethod.updateMany({ where: { companyId: tenant.companyId, isDefault: true, deletedAt: null }, data: { isDefault: false } })
    return this.prisma.paymentMethod.create({ data: { companyId: tenant.companyId, ...input }, select: { id: true, companyId: true, code: true, name: true, description: true, isDefault: true, status: true, createdAt: true, updatedAt: true } })
  }

  async update(id: string, input: UpdatePaymentMethodInput, tenant: TenantContext) {
    await this.getById(id, tenant)
    if (input.isDefault) await this.prisma.paymentMethod.updateMany({ where: { companyId: tenant.companyId, isDefault: true, deletedAt: null }, data: { isDefault: false } })
    return this.prisma.paymentMethod.update({ where: { id }, data: input, select: { id: true, companyId: true, code: true, name: true, description: true, isDefault: true, status: true, createdAt: true, updatedAt: true } })
  }

  async updateStatus(id: string, input: UpdatePaymentMethodStatusInput, tenant: TenantContext) {
    await this.getById(id, tenant)
    return this.prisma.paymentMethod.update({ where: { id }, data: { status: input.status, deletedAt: input.status === RecordStatus.ARCHIVED ? new Date() : null }, select: { id: true, companyId: true, code: true, name: true, description: true, isDefault: true, status: true, createdAt: true, updatedAt: true } })
  }

  private async assertCodeIsAvailable(code: string, tenant: TenantContext) {
    if (await this.prisma.paymentMethod.findFirst({ where: { companyId: tenant.companyId, code, deletedAt: null }, select: { id: true } })) throw new ConflictException('Payment method code is already used')
  }
}
