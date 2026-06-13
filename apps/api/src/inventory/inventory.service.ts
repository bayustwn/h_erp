import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common'
import {
  createPaginationMeta,
  getPaginationSkipTake,
} from '../common/pagination/pagination.js'
import { RecordStatus } from '../generated/prisma/enums.js'
import { PrismaService } from '../prisma/prisma.service.js'
import type { TenantContext } from '../access-control/access-control.types.js'
import type {
  CategoriesQuery,
  CreateCategoryInput,
  CreateItemInput,
  CreateUnitInput,
  ItemsQuery,
  UnitsQuery,
  UpdateCategoryInput,
  UpdateItemInput,
  UpdateStatusInput,
  UpdateUnitInput,
} from './inventory.schemas.js'

@Injectable()
export class InventoryService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async listUnits(query: UnitsQuery, tenant: TenantContext) {
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
      this.prisma.unitOfMeasure.findMany({
        where,
        ...getPaginationSkipTake(pagination),
        orderBy: [{ code: 'asc' }, { name: 'asc' }],
        select: this.unitSelect(),
      }),
      this.prisma.unitOfMeasure.count({ where }),
    ])

    return { items, meta: createPaginationMeta(pagination, total) }
  }

  async createUnit(input: CreateUnitInput, tenant: TenantContext) {
    await this.assertUniqueUnitCode(input.code, tenant)
    const unit = await this.prisma.unitOfMeasure.create({
      data: { ...input, companyId: tenant.companyId },
      select: { id: true },
    })
    return this.getUnit(unit.id, tenant)
  }

  async getUnit(id: string, tenant: TenantContext) {
    const unit = await this.prisma.unitOfMeasure.findFirst({
      where: { id, companyId: tenant.companyId, deletedAt: null },
      select: this.unitSelect(),
    })
    if (!unit) throw new NotFoundException('Unit not found')
    return unit
  }

  async updateUnit(id: string, input: UpdateUnitInput, tenant: TenantContext) {
    await this.getUnit(id, tenant)
    await this.prisma.unitOfMeasure.update({ where: { id }, data: input })
    return this.getUnit(id, tenant)
  }

  async updateUnitStatus(id: string, input: UpdateStatusInput, tenant: TenantContext) {
    await this.getUnit(id, tenant)
    return this.prisma.unitOfMeasure.update({
      where: { id },
      data: {
        status: input.status,
        deletedAt: input.status === RecordStatus.ARCHIVED ? new Date() : null,
      },
      select: this.unitSelect(),
    })
  }

  async listCategories(query: CategoriesQuery, tenant: TenantContext) {
    const pagination = { page: query.page, pageSize: query.pageSize }
    const where = {
      companyId: tenant.companyId,
      parentId: query.parentId,
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
      this.prisma.itemCategory.findMany({
        where,
        ...getPaginationSkipTake(pagination),
        orderBy: [{ code: 'asc' }, { name: 'asc' }],
        select: this.categorySelect(),
      }),
      this.prisma.itemCategory.count({ where }),
    ])

    return { items, meta: createPaginationMeta(pagination, total) }
  }

  async createCategory(input: CreateCategoryInput, tenant: TenantContext) {
    await this.assertUniqueCategoryCode(input.code, tenant)
    await this.assertCategoryBelongsToCompany(input.parentId, tenant)
    const category = await this.prisma.itemCategory.create({
      data: { ...input, companyId: tenant.companyId },
      select: { id: true },
    })
    return this.getCategory(category.id, tenant)
  }

  async getCategory(id: string, tenant: TenantContext) {
    const category = await this.prisma.itemCategory.findFirst({
      where: { id, companyId: tenant.companyId, deletedAt: null },
      select: this.categorySelect(),
    })
    if (!category) throw new NotFoundException('Category not found')
    return category
  }

  async updateCategory(id: string, input: UpdateCategoryInput, tenant: TenantContext) {
    await this.getCategory(id, tenant)
    await this.assertCategoryBelongsToCompany(input.parentId ?? undefined, tenant, id)
    await this.prisma.itemCategory.update({ where: { id }, data: input })
    return this.getCategory(id, tenant)
  }

  async updateCategoryStatus(
    id: string,
    input: UpdateStatusInput,
    tenant: TenantContext,
  ) {
    await this.getCategory(id, tenant)
    return this.prisma.itemCategory.update({
      where: { id },
      data: {
        status: input.status,
        deletedAt: input.status === RecordStatus.ARCHIVED ? new Date() : null,
      },
      select: this.categorySelect(),
    })
  }

  async listItems(query: ItemsQuery, tenant: TenantContext) {
    const pagination = { page: query.page, pageSize: query.pageSize }
    const where = {
      companyId: tenant.companyId,
      categoryId: query.categoryId,
      itemType: query.itemType,
      deletedAt: null,
      status: query.status,
      ...(query.search
        ? {
            OR: [
              { sku: { contains: query.search, mode: 'insensitive' as const } },
              { name: { contains: query.search, mode: 'insensitive' as const } },
              { barcode: { contains: query.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    }
    const [items, total] = await Promise.all([
      this.prisma.inventoryItem.findMany({
        where,
        ...getPaginationSkipTake(pagination),
        orderBy: [{ sku: 'asc' }, { name: 'asc' }],
        select: this.itemSelect(),
      }),
      this.prisma.inventoryItem.count({ where }),
    ])

    return { items, meta: createPaginationMeta(pagination, total) }
  }

  async createItem(input: CreateItemInput, tenant: TenantContext) {
    await this.assertUniqueItemSku(input.sku, tenant)
    await this.assertUniqueItemBarcode(input.barcode, tenant)
    await this.assertCategoryBelongsToCompany(input.categoryId, tenant)
    await this.assertUnitBelongsToCompany(input.baseUnitId, tenant)

    const item = await this.prisma.inventoryItem.create({
      data: { ...input, companyId: tenant.companyId },
      select: { id: true },
    })
    return this.getItem(item.id, tenant)
  }

  async getItem(id: string, tenant: TenantContext) {
    const item = await this.prisma.inventoryItem.findFirst({
      where: { id, companyId: tenant.companyId, deletedAt: null },
      select: this.itemSelect(),
    })
    if (!item) throw new NotFoundException('Item not found')
    return item
  }

  async updateItem(id: string, input: UpdateItemInput, tenant: TenantContext) {
    await this.getItem(id, tenant)
    await this.assertUniqueItemBarcode(input.barcode, tenant, id)
    await this.assertCategoryBelongsToCompany(input.categoryId ?? undefined, tenant)
    if (input.baseUnitId) await this.assertUnitBelongsToCompany(input.baseUnitId, tenant)

    await this.prisma.inventoryItem.update({ where: { id }, data: input })
    return this.getItem(id, tenant)
  }

  async updateItemStatus(id: string, input: UpdateStatusInput, tenant: TenantContext) {
    await this.getItem(id, tenant)
    return this.prisma.inventoryItem.update({
      where: { id },
      data: {
        status: input.status,
        deletedAt: input.status === RecordStatus.ARCHIVED ? new Date() : null,
      },
      select: this.itemSelect(),
    })
  }

  private async assertUniqueUnitCode(code: string, tenant: TenantContext) {
    const unit = await this.prisma.unitOfMeasure.findFirst({
      where: { code, companyId: tenant.companyId, deletedAt: null },
      select: { id: true },
    })
    if (unit) throw new ConflictException('Unit code is already used')
  }

  private async assertUniqueCategoryCode(code: string, tenant: TenantContext) {
    const category = await this.prisma.itemCategory.findFirst({
      where: { code, companyId: tenant.companyId, deletedAt: null },
      select: { id: true },
    })
    if (category) throw new ConflictException('Category code is already used')
  }

  private async assertUniqueItemSku(sku: string, tenant: TenantContext) {
    const item = await this.prisma.inventoryItem.findFirst({
      where: { sku, companyId: tenant.companyId, deletedAt: null },
      select: { id: true },
    })
    if (item) throw new ConflictException('SKU is already used')
  }

  private async assertUniqueItemBarcode(
    barcode: string | undefined | null,
    tenant: TenantContext,
    currentItemId?: string,
  ) {
    if (!barcode) return
    const item = await this.prisma.inventoryItem.findFirst({
      where: {
        barcode,
        companyId: tenant.companyId,
        deletedAt: null,
        id: currentItemId ? { not: currentItemId } : undefined,
      },
      select: { id: true },
    })
    if (item) throw new ConflictException('Barcode is already used')
  }

  private async assertCategoryBelongsToCompany(
    categoryId: string | undefined,
    tenant: TenantContext,
    currentCategoryId?: string,
  ) {
    if (!categoryId) return
    if (categoryId === currentCategoryId) {
      throw new UnprocessableEntityException('Category cannot be its own parent')
    }
    const category = await this.prisma.itemCategory.findFirst({
      where: {
        id: categoryId,
        companyId: tenant.companyId,
        status: RecordStatus.ACTIVE,
        deletedAt: null,
      },
      select: { id: true },
    })
    if (!category) throw new UnprocessableEntityException('Category is invalid')
  }

  private async assertUnitBelongsToCompany(unitId: string, tenant: TenantContext) {
    const unit = await this.prisma.unitOfMeasure.findFirst({
      where: {
        id: unitId,
        companyId: tenant.companyId,
        status: RecordStatus.ACTIVE,
        deletedAt: null,
      },
      select: { id: true },
    })
    if (!unit) throw new UnprocessableEntityException('Base unit is invalid')
  }

  private unitSelect() {
    return {
      id: true,
      companyId: true,
      code: true,
      name: true,
      symbol: true,
      decimalPlaces: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    }
  }

  private categorySelect() {
    return {
      id: true,
      companyId: true,
      parentId: true,
      code: true,
      name: true,
      description: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      parent: { select: { id: true, code: true, name: true } },
    }
  }

  private itemSelect() {
    return {
      id: true,
      companyId: true,
      categoryId: true,
      baseUnitId: true,
      sku: true,
      name: true,
      description: true,
      barcode: true,
      itemType: true,
      trackInventory: true,
      isSellable: true,
      isPurchasable: true,
      minStock: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      category: { select: { id: true, code: true, name: true } },
      baseUnit: { select: { id: true, code: true, name: true, symbol: true } },
    }
  }
}
