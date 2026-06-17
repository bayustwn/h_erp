import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import { createPaginationMeta, getPaginationSkipTake } from '../common/pagination/pagination.js'
import { RecordStatus } from '../generated/prisma/enums.js'
import { PrismaService } from '../prisma/prisma.service.js'
import type { TenantContext } from '../access-control/access-control.types.js'
import type { ChartOfAccountsQuery, CreateChartOfAccountInput, UpdateChartOfAccountInput, UpdateChartOfAccountStatusInput } from './chart-of-accounts.schemas.js'

@Injectable()
export class ChartOfAccountsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async list(query: ChartOfAccountsQuery, tenant: TenantContext) {
    const pagination = { page: query.page, pageSize: query.pageSize }
    const where = { companyId: tenant.companyId, deletedAt: null, status: query.status, type: query.type, parentId: query.parentId, ...(query.search ? { OR: [{ code: { contains: query.search, mode: 'insensitive' as const } }, { name: { contains: query.search, mode: 'insensitive' as const } }] } : {}) }
    const [items, total] = await Promise.all([
      this.prisma.chartOfAccount.findMany({ where, ...getPaginationSkipTake(pagination), orderBy: [{ code: 'asc' }], select: { id: true, companyId: true, parentId: true, code: true, name: true, description: true, type: true, isDefault: true, status: true, createdAt: true, updatedAt: true } }),
      this.prisma.chartOfAccount.count({ where }),
    ])
    return { items, meta: createPaginationMeta(pagination, total) }
  }

  async getById(id: string, tenant: TenantContext) {
    const item = await this.prisma.chartOfAccount.findFirst({ where: { id, companyId: tenant.companyId, deletedAt: null }, select: { id: true, companyId: true, parentId: true, code: true, name: true, description: true, type: true, isDefault: true, status: true, createdAt: true, updatedAt: true, parent: { select: { id: true, code: true, name: true } }, children: { select: { id: true, code: true, name: true, type: true } } } })
    if (!item) throw new NotFoundException('Chart of account not found')
    return item
  }

  async create(input: CreateChartOfAccountInput, tenant: TenantContext) {
    if (await this.prisma.chartOfAccount.findFirst({ where: { companyId: tenant.companyId, code: input.code, deletedAt: null }, select: { id: true } })) throw new ConflictException('Account code is already used')
    if (input.parentId) {
      const parent = await this.prisma.chartOfAccount.findFirst({ where: { id: input.parentId, companyId: tenant.companyId }, select: { id: true } })
      if (!parent) throw new NotFoundException('Parent account not found')
    }
    return this.prisma.chartOfAccount.create({ data: { companyId: tenant.companyId, ...input }, select: { id: true, companyId: true, parentId: true, code: true, name: true, description: true, type: true, isDefault: true, status: true, createdAt: true, updatedAt: true } })
  }

  async update(id: string, input: UpdateChartOfAccountInput, tenant: TenantContext) {
    await this.getById(id, tenant)
    if (input.parentId) {
      if (input.parentId === id) throw new ConflictException('Account cannot be its own parent')
      const parent = await this.prisma.chartOfAccount.findFirst({ where: { id: input.parentId, companyId: tenant.companyId }, select: { id: true } })
      if (!parent) throw new NotFoundException('Parent account not found')
    }
    return this.prisma.chartOfAccount.update({ where: { id }, data: input, select: { id: true, companyId: true, parentId: true, code: true, name: true, description: true, type: true, isDefault: true, status: true, createdAt: true, updatedAt: true } })
  }

  async updateStatus(id: string, input: UpdateChartOfAccountStatusInput, tenant: TenantContext) {
    await this.getById(id, tenant)
    return this.prisma.chartOfAccount.update({ where: { id }, data: { status: input.status, deletedAt: input.status === RecordStatus.ARCHIVED ? new Date() : null }, select: { id: true, companyId: true, parentId: true, code: true, name: true, description: true, type: true, isDefault: true, status: true, createdAt: true, updatedAt: true } })
  }
}
