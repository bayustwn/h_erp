import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import { createPaginationMeta, getPaginationSkipTake } from '../common/pagination/pagination.js'
import { RecordStatus } from '../generated/prisma/enums.js'
import { PrismaService } from '../prisma/prisma.service.js'
import type { TenantContext } from '../access-control/access-control.types.js'
import type { CreateTaxInput, TaxesQuery, UpdateTaxInput, UpdateTaxStatusInput } from './taxes.schemas.js'

@Injectable()
export class TaxesService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  async list(query: TaxesQuery, tenant: TenantContext) {
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
    const [taxes, total] = await Promise.all([
      this.prisma.tax.findMany({
        where,
        ...getPaginationSkipTake(pagination),
        orderBy: [{ code: 'asc' }],
        select: this.taxSelect(),
      }),
      this.prisma.tax.count({ where }),
    ])
    return { items: taxes, meta: createPaginationMeta(pagination, total) }
  }

  async getById(taxId: string, tenant: TenantContext) {
    const tax = await this.prisma.tax.findFirst({
      where: { id: taxId, companyId: tenant.companyId, deletedAt: null },
      select: this.taxSelect(),
    })
    if (!tax) throw new NotFoundException('Tax not found')
    return tax
  }

  async create(input: CreateTaxInput, tenant: TenantContext) {
    await this.assertCodeIsAvailable(input.code, tenant)
    if (input.isDefault) {
      await this.clearDefaultFlag(tenant)
    }
    return this.prisma.tax.create({
      data: {
        companyId: tenant.companyId,
        code: input.code,
        name: input.name,
        description: input.description,
        rate: input.rate,
        isDefault: input.isDefault,
      },
      select: this.taxSelect(),
    })
  }

  async update(taxId: string, input: UpdateTaxInput, tenant: TenantContext) {
    await this.getById(taxId, tenant)
    if (input.isDefault) {
      await this.clearDefaultFlag(tenant)
    }
    return this.prisma.tax.update({
      where: { id: taxId },
      data: input,
      select: this.taxSelect(),
    })
  }

  async updateStatus(taxId: string, input: UpdateTaxStatusInput, tenant: TenantContext) {
    await this.getById(taxId, tenant)
    return this.prisma.tax.update({
      where: { id: taxId },
      data: {
        status: input.status,
        deletedAt: input.status === RecordStatus.ARCHIVED ? new Date() : null,
      },
      select: this.taxSelect(),
    })
  }

  private async assertCodeIsAvailable(code: string, tenant: TenantContext) {
    const existing = await this.prisma.tax.findFirst({
      where: { companyId: tenant.companyId, code, deletedAt: null },
      select: { id: true },
    })
    if (existing) throw new ConflictException('Tax code is already used')
  }

  private async clearDefaultFlag(tenant: TenantContext) {
    await this.prisma.tax.updateMany({
      where: { companyId: tenant.companyId, isDefault: true, deletedAt: null },
      data: { isDefault: false },
    })
  }

  private taxSelect() {
    return {
      id: true,
      companyId: true,
      code: true,
      name: true,
      description: true,
      rate: true,
      isDefault: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    }
  }
}
