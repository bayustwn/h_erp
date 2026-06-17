import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import { createPaginationMeta, getPaginationSkipTake } from '../common/pagination/pagination.js'
import { PrismaService } from '../prisma/prisma.service.js'
import type { TenantContext } from '../access-control/access-control.types.js'
import type { CreateProductAccountingMappingInput, ProductAccountingMappingsQuery, UpdateProductAccountingMappingInput } from './product-accounting-mappings.schemas.js'

@Injectable()
export class ProductAccountingMappingsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async list(query: ProductAccountingMappingsQuery, tenant: TenantContext) {
    const pagination = { page: query.page, pageSize: query.pageSize }
    const where = { companyId: tenant.companyId, itemCategoryId: query.itemCategoryId, itemId: query.itemId }
    const [items, total] = await Promise.all([
      this.prisma.productAccountingMapping.findMany({
        where, ...getPaginationSkipTake(pagination), orderBy: { createdAt: 'desc' },
        select: { id: true, companyId: true, itemCategoryId: true, itemId: true, revenueAccountId: true, cogsAccountId: true, inventoryAccountId: true, purchaseAccountId: true, createdAt: true, updatedAt: true,
          itemCategory: { select: { id: true, code: true, name: true } },
          item: { select: { id: true, sku: true, name: true } },
          revenueAccount: { select: { id: true, code: true, name: true } },
          cogsAccount: { select: { id: true, code: true, name: true } },
          inventoryAccount: { select: { id: true, code: true, name: true } },
          purchaseAccount: { select: { id: true, code: true, name: true } },
        },
      }),
      this.prisma.productAccountingMapping.count({ where }),
    ])
    return { items, meta: createPaginationMeta(pagination, total) }
  }

  async getById(id: string, tenant: TenantContext) {
    const item = await this.prisma.productAccountingMapping.findFirst({
      where: { id, companyId: tenant.companyId },
      select: { id: true, companyId: true, itemCategoryId: true, itemId: true, revenueAccountId: true, cogsAccountId: true, inventoryAccountId: true, purchaseAccountId: true, createdAt: true, updatedAt: true,
        itemCategory: { select: { id: true, code: true, name: true } },
        item: { select: { id: true, sku: true, name: true } },
        revenueAccount: { select: { id: true, code: true, name: true } },
        cogsAccount: { select: { id: true, code: true, name: true } },
        inventoryAccount: { select: { id: true, code: true, name: true } },
        purchaseAccount: { select: { id: true, code: true, name: true } },
      },
    })
    if (!item) throw new NotFoundException('Product accounting mapping not found')
    return item
  }

  async create(input: CreateProductAccountingMappingInput, tenant: TenantContext) {
    const where = { companyId: tenant.companyId, ...(input.itemCategoryId ? { itemCategoryId: input.itemCategoryId } : {}), ...(input.itemId ? { itemId: input.itemId } : {}) }
    if (await this.prisma.productAccountingMapping.findFirst({ where, select: { id: true } })) throw new ConflictException('Mapping already exists for this item/category')
    return this.prisma.productAccountingMapping.create({
      data: { companyId: tenant.companyId, ...input },
      select: { id: true, companyId: true, itemCategoryId: true, itemId: true, revenueAccountId: true, cogsAccountId: true, inventoryAccountId: true, purchaseAccountId: true, createdAt: true, updatedAt: true },
    })
  }

  async update(id: string, input: UpdateProductAccountingMappingInput, tenant: TenantContext) {
    await this.getById(id, tenant)
    return this.prisma.productAccountingMapping.update({
      where: { id }, data: input,
      select: { id: true, companyId: true, itemCategoryId: true, itemId: true, revenueAccountId: true, cogsAccountId: true, inventoryAccountId: true, purchaseAccountId: true, createdAt: true, updatedAt: true },
    })
  }

  async delete(id: string, tenant: TenantContext) {
    await this.getById(id, tenant)
    await this.prisma.productAccountingMapping.delete({ where: { id } })
    return { deleted: true }
  }
}
