import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import { createPaginationMeta, getPaginationSkipTake } from '../common/pagination/pagination.js'
import { PrismaService } from '../prisma/prisma.service.js'
import type { TenantContext } from '../access-control/access-control.types.js'
import type { CreatePriceListItemInput, PriceListItemsQuery, UpdatePriceListItemInput } from './price-lists.schemas.js'

@Injectable()
export class PriceListItemsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  async list(priceListId: string, query: PriceListItemsQuery, tenant: TenantContext) {
    await this.assertPriceListBelongsToCompany(priceListId, tenant)
    const pagination = { page: query.page, pageSize: query.pageSize }
    const where = {
      priceListId,
      ...(query.search
        ? {
            item: {
              OR: [
                { sku: { contains: query.search, mode: 'insensitive' as const } },
                { name: { contains: query.search, mode: 'insensitive' as const } },
              ],
            },
          }
        : {}),
    }
    const [items, total] = await Promise.all([
      this.prisma.priceListItem.findMany({
        where,
        ...getPaginationSkipTake(pagination),
        orderBy: { createdAt: 'asc' },
        select: this.itemSelect(),
      }),
      this.prisma.priceListItem.count({ where }),
    ])
    return { items, meta: createPaginationMeta(pagination, total) }
  }

  async getById(priceListId: string, itemId: string, tenant: TenantContext) {
    await this.assertPriceListBelongsToCompany(priceListId, tenant)
    const item = await this.prisma.priceListItem.findFirst({
      where: { id: itemId, priceListId },
      select: this.itemSelect(),
    })
    if (!item) throw new NotFoundException('Price list item not found')
    return item
  }

  async create(priceListId: string, input: CreatePriceListItemInput, tenant: TenantContext) {
    await this.assertPriceListBelongsToCompany(priceListId, tenant)
    await this.assertItemBelongsToCompany(input.itemId, tenant)
    await this.assertUnitBelongsToCompany(input.unitId, tenant)
    await this.assertUniqueItem(priceListId, input.itemId, input.unitId)
    return this.prisma.priceListItem.create({
      data: {
        priceListId,
        itemId: input.itemId,
        unitId: input.unitId,
        unitPrice: input.unitPrice,
        minQuantity: input.minQuantity,
      },
      select: this.itemSelect(),
    })
  }

  async update(priceListId: string, itemId: string, input: UpdatePriceListItemInput, tenant: TenantContext) {
    await this.getById(priceListId, itemId, tenant)
    return this.prisma.priceListItem.update({
      where: { id: itemId },
      data: input,
      select: this.itemSelect(),
    })
  }

  async delete(priceListId: string, itemId: string, tenant: TenantContext) {
    await this.getById(priceListId, itemId, tenant)
    await this.prisma.priceListItem.delete({ where: { id: itemId } })
    return { deleted: true }
  }

  private async assertPriceListBelongsToCompany(priceListId: string, tenant: TenantContext) {
    const priceList = await this.prisma.priceList.findFirst({
      where: { id: priceListId, companyId: tenant.companyId, deletedAt: null },
      select: { id: true },
    })
    if (!priceList) throw new NotFoundException('Price list not found')
  }

  private async assertItemBelongsToCompany(itemId: string, tenant: TenantContext) {
    const item = await this.prisma.inventoryItem.findFirst({
      where: { id: itemId, companyId: tenant.companyId },
      select: { id: true },
    })
    if (!item) throw new NotFoundException('Item not found')
  }

  private async assertUnitBelongsToCompany(unitId: string, tenant: TenantContext) {
    const unit = await this.prisma.unitOfMeasure.findFirst({
      where: { id: unitId, companyId: tenant.companyId },
      select: { id: true },
    })
    if (!unit) throw new NotFoundException('Unit of measure not found')
  }

  private async assertUniqueItem(priceListId: string, itemId: string, unitId: string) {
    const existing = await this.prisma.priceListItem.findFirst({
      where: { priceListId, itemId, unitId },
      select: { id: true },
    })
    if (existing) throw new ConflictException('Item already exists in this price list with the same unit')
  }

  private itemSelect() {
    return {
      id: true,
      priceListId: true,
      itemId: true,
      unitId: true,
      unitPrice: true,
      minQuantity: true,
      createdAt: true,
      updatedAt: true,
      item: { select: { sku: true, name: true } },
      unit: { select: { code: true, name: true } },
    }
  }
}
