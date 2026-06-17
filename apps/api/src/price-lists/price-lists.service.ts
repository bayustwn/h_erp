import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import { createPaginationMeta, getPaginationSkipTake } from '../common/pagination/pagination.js'
import { PriceListType, RecordStatus } from '../generated/prisma/enums.js'
import { PrismaService } from '../prisma/prisma.service.js'
import type { TenantContext } from '../access-control/access-control.types.js'
import type { CreatePriceListInput, PriceListsQuery, UpdatePriceListInput, UpdatePriceListStatusInput } from './price-lists.schemas.js'

@Injectable()
export class PriceListsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  async list(query: PriceListsQuery, tenant: TenantContext) {
    const pagination = { page: query.page, pageSize: query.pageSize }
    const where = {
      companyId: tenant.companyId,
      deletedAt: null,
      status: query.status,
      type: query.type,
      ...(query.search
        ? {
            OR: [
              { code: { contains: query.search, mode: 'insensitive' as const } },
              { name: { contains: query.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    }
    const [priceLists, total] = await Promise.all([
      this.prisma.priceList.findMany({
        where,
        ...getPaginationSkipTake(pagination),
        orderBy: [{ code: 'asc' }],
        select: this.priceListSelect(),
      }),
      this.prisma.priceList.count({ where }),
    ])
    return { items: priceLists, meta: createPaginationMeta(pagination, total) }
  }

  async getById(priceListId: string, tenant: TenantContext) {
    const priceList = await this.prisma.priceList.findFirst({
      where: { id: priceListId, companyId: tenant.companyId, deletedAt: null },
      select: { ...this.priceListSelect(), items: { select: { id: true, itemId: true, unitId: true, unitPrice: true, minQuantity: true } } },
    })
    if (!priceList) throw new NotFoundException('Price list not found')
    return priceList
  }

  async create(input: CreatePriceListInput, tenant: TenantContext) {
    await this.assertCodeIsAvailable(input.code, tenant)
    if (input.isDefault) {
      await this.clearDefaultFlag(tenant, input.type)
    }
    return this.prisma.priceList.create({
      data: {
        companyId: tenant.companyId,
        code: input.code,
        name: input.name,
        description: input.description,
        type: input.type,
        isDefault: input.isDefault,
      },
      select: this.priceListSelect(),
    })
  }

  async update(priceListId: string, input: UpdatePriceListInput, tenant: TenantContext) {
    await this.getById(priceListId, tenant)
    if (input.isDefault) {
      const current = await this.prisma.priceList.findFirst({
        where: { id: priceListId, companyId: tenant.companyId },
        select: { type: true },
      })
      await this.clearDefaultFlag(tenant, current!.type)
    }
    return this.prisma.priceList.update({
      where: { id: priceListId },
      data: input,
      select: this.priceListSelect(),
    })
  }

  async updateStatus(priceListId: string, input: UpdatePriceListStatusInput, tenant: TenantContext) {
    await this.getById(priceListId, tenant)
    return this.prisma.priceList.update({
      where: { id: priceListId },
      data: {
        status: input.status,
        deletedAt: input.status === RecordStatus.ARCHIVED ? new Date() : null,
      },
      select: this.priceListSelect(),
    })
  }

  private async assertCodeIsAvailable(code: string, tenant: TenantContext) {
    const existing = await this.prisma.priceList.findFirst({
      where: { companyId: tenant.companyId, code, deletedAt: null },
      select: { id: true },
    })
    if (existing) throw new ConflictException('Price list code is already used')
  }

  private async clearDefaultFlag(tenant: TenantContext, type: string) {
    await this.prisma.priceList.updateMany({
      where: { companyId: tenant.companyId, type: { equals: type as PriceListType }, isDefault: true, deletedAt: null },
      data: { isDefault: false },
    })
  }

  private priceListSelect() {
    return {
      id: true,
      companyId: true,
      code: true,
      name: true,
      description: true,
      type: true,
      isDefault: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    }
  }
}
