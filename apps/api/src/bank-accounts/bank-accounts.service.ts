import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import { createPaginationMeta, getPaginationSkipTake } from '../common/pagination/pagination.js'
import { RecordStatus } from '../generated/prisma/enums.js'
import { PrismaService } from '../prisma/prisma.service.js'
import type { TenantContext } from '../access-control/access-control.types.js'
import type { BankAccountsQuery, CreateBankAccountInput, UpdateBankAccountInput, UpdateBankAccountStatusInput } from './bank-accounts.schemas.js'

@Injectable()
export class BankAccountsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async list(query: BankAccountsQuery, tenant: TenantContext) {
    const pagination = { page: query.page, pageSize: query.pageSize }
    const where = { companyId: tenant.companyId, deletedAt: null, status: query.status, ...(query.search ? { OR: [{ code: { contains: query.search, mode: 'insensitive' as const } }, { name: { contains: query.search, mode: 'insensitive' as const } }, { bankName: { contains: query.search, mode: 'insensitive' as const } }] } : {}) }
    const [items, total] = await Promise.all([
      this.prisma.bankAccount.findMany({ where, ...getPaginationSkipTake(pagination), orderBy: [{ code: 'asc' }], select: { id: true, companyId: true, code: true, name: true, bankName: true, accountNumber: true, accountName: true, currency: true, description: true, isDefault: true, status: true, createdAt: true, updatedAt: true } }),
      this.prisma.bankAccount.count({ where }),
    ])
    return { items, meta: createPaginationMeta(pagination, total) }
  }

  async getById(id: string, tenant: TenantContext) {
    const item = await this.prisma.bankAccount.findFirst({ where: { id, companyId: tenant.companyId, deletedAt: null }, select: { id: true, companyId: true, code: true, name: true, bankName: true, accountNumber: true, accountName: true, currency: true, description: true, isDefault: true, status: true, createdAt: true, updatedAt: true } })
    if (!item) throw new NotFoundException('Bank account not found')
    return item
  }

  async create(input: CreateBankAccountInput, tenant: TenantContext) {
    if (await this.prisma.bankAccount.findFirst({ where: { companyId: tenant.companyId, code: input.code, deletedAt: null }, select: { id: true } })) throw new ConflictException('Bank account code is already used')
    if (input.isDefault) await this.prisma.bankAccount.updateMany({ where: { companyId: tenant.companyId, isDefault: true, deletedAt: null }, data: { isDefault: false } })
    return this.prisma.bankAccount.create({ data: { companyId: tenant.companyId, ...input }, select: { id: true, companyId: true, code: true, name: true, bankName: true, accountNumber: true, accountName: true, currency: true, description: true, isDefault: true, status: true, createdAt: true, updatedAt: true } })
  }

  async update(id: string, input: UpdateBankAccountInput, tenant: TenantContext) {
    await this.getById(id, tenant)
    if (input.isDefault) await this.prisma.bankAccount.updateMany({ where: { companyId: tenant.companyId, isDefault: true, deletedAt: null }, data: { isDefault: false } })
    return this.prisma.bankAccount.update({ where: { id }, data: input, select: { id: true, companyId: true, code: true, name: true, bankName: true, accountNumber: true, accountName: true, currency: true, description: true, isDefault: true, status: true, createdAt: true, updatedAt: true } })
  }

  async updateStatus(id: string, input: UpdateBankAccountStatusInput, tenant: TenantContext) {
    await this.getById(id, tenant)
    return this.prisma.bankAccount.update({ where: { id }, data: { status: input.status, deletedAt: input.status === RecordStatus.ARCHIVED ? new Date() : null }, select: { id: true, companyId: true, code: true, name: true, bankName: true, accountNumber: true, accountName: true, currency: true, description: true, isDefault: true, status: true, createdAt: true, updatedAt: true } })
  }
}
