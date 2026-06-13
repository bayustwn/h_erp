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
  CreateWarehouseInput,
  UpdateWarehouseInput,
  UpdateWarehouseStatusInput,
  WarehousesQuery,
} from './warehouses.schemas.js'

@Injectable()
export class WarehousesService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async list(query: WarehousesQuery, tenant: TenantContext) {
    const pagination = {
      page: query.page,
      pageSize: query.pageSize,
    }
    const where = {
      companyId: tenant.companyId,
      branchId: query.branchId,
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
    const [warehouses, total] = await Promise.all([
      this.prisma.warehouse.findMany({
        where,
        ...getPaginationSkipTake(pagination),
        orderBy: [{ code: 'asc' }, { name: 'asc' }],
        select: this.warehouseSelect(),
      }),
      this.prisma.warehouse.count({ where }),
    ])

    return {
      items: warehouses,
      meta: createPaginationMeta(pagination, total),
    }
  }

  async getById(warehouseId: string, tenant: TenantContext) {
    const warehouse = await this.prisma.warehouse.findFirst({
      where: {
        id: warehouseId,
        companyId: tenant.companyId,
        deletedAt: null,
      },
      select: this.warehouseSelect(),
    })

    if (!warehouse) {
      throw new NotFoundException('Warehouse not found')
    }

    return warehouse
  }

  async create(input: CreateWarehouseInput, tenant: TenantContext) {
    await this.assertCodeIsAvailable(input.code, tenant)
    await this.assertBranchBelongsToCompany(input.branchId, tenant)

    const warehouse = await this.prisma.warehouse.create({
      data: {
        companyId: tenant.companyId,
        branchId: input.branchId,
        code: input.code,
        name: input.name,
        address: input.address,
      },
      select: {
        id: true,
      },
    })

    return this.getById(warehouse.id, tenant)
  }

  async update(warehouseId: string, input: UpdateWarehouseInput, tenant: TenantContext) {
    await this.getById(warehouseId, tenant)
    await this.assertBranchBelongsToCompany(input.branchId ?? undefined, tenant)

    await this.prisma.warehouse.update({
      where: {
        id: warehouseId,
      },
      data: input,
    })

    return this.getById(warehouseId, tenant)
  }

  async updateStatus(
    warehouseId: string,
    input: UpdateWarehouseStatusInput,
    tenant: TenantContext,
  ) {
    await this.getById(warehouseId, tenant)

    return this.prisma.warehouse.update({
      where: {
        id: warehouseId,
      },
      data: {
        status: input.status,
        deletedAt: input.status === RecordStatus.ARCHIVED ? new Date() : null,
      },
      select: this.warehouseSelect(),
    })
  }

  private async assertCodeIsAvailable(code: string, tenant: TenantContext) {
    const warehouse = await this.prisma.warehouse.findFirst({
      where: {
        companyId: tenant.companyId,
        code,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    })

    if (warehouse) {
      throw new ConflictException('Warehouse code is already used')
    }
  }

  private async assertBranchBelongsToCompany(
    branchId: string | undefined,
    tenant: TenantContext,
  ) {
    if (!branchId) {
      return
    }

    const branch = await this.prisma.branch.findFirst({
      where: {
        id: branchId,
        companyId: tenant.companyId,
        status: RecordStatus.ACTIVE,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    })

    if (!branch) {
      throw new UnprocessableEntityException(
        'Branch does not belong to the active company',
      )
    }
  }

  private warehouseSelect() {
    return {
      id: true,
      companyId: true,
      branchId: true,
      code: true,
      name: true,
      address: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      branch: {
        select: {
          id: true,
          code: true,
          name: true,
        },
      },
    }
  }
}
