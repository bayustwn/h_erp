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
import { AuditService } from '../audit/audit.service.js'
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
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly auditService: AuditService,
  ) {}

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

  async create(input: CreateWarehouseInput, tenant: TenantContext, actorUserId: string) {
    await this.assertCodeIsAvailable(input.code, tenant)
    await this.assertBranchBelongsToCompany(input.branchId, tenant)

    return this.prisma.$transaction(async (tx) => {
      const warehouse = await tx.warehouse.create({
        data: {
          companyId: tenant.companyId,
          branchId: input.branchId,
          code: input.code,
          name: input.name,
          address: input.address,
        },
        select: this.warehouseSelect(),
      })
      await this.auditService.recordCreate(
        {
          tenant,
          actorUserId,
          entityType: 'Warehouse',
          entityId: warehouse.id,
          newValues: warehouse,
        },
        tx,
      )

      return warehouse
    })
  }

  async update(
    warehouseId: string,
    input: UpdateWarehouseInput,
    tenant: TenantContext,
    actorUserId: string,
  ) {
    const current = await this.getById(warehouseId, tenant)
    await this.assertBranchBelongsToCompany(input.branchId ?? undefined, tenant)

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.warehouse.update({
        where: {
          id: warehouseId,
        },
        data: input,
        select: this.warehouseSelect(),
      })
      await this.auditService.recordUpdate(
        {
          tenant,
          actorUserId,
          entityType: 'Warehouse',
          entityId: warehouseId,
          oldValues: current,
          newValues: updated,
        },
        tx,
      )

      return updated
    })
  }

  async updateStatus(
    warehouseId: string,
    input: UpdateWarehouseStatusInput,
    tenant: TenantContext,
    actorUserId: string,
  ) {
    const current = await this.getById(warehouseId, tenant)

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.warehouse.update({
        where: {
          id: warehouseId,
        },
        data: {
          status: input.status,
          deletedAt: input.status === RecordStatus.ARCHIVED ? new Date() : null,
        },
        select: this.warehouseSelect(),
      })
      const auditInput = {
        tenant,
        actorUserId,
        entityType: 'Warehouse',
        entityId: warehouseId,
        oldValues: current,
        newValues: updated,
      }
      if (input.status === RecordStatus.ARCHIVED) {
        await this.auditService.recordDelete(auditInput, tx)
      } else {
        await this.auditService.recordUpdate(auditInput, tx)
      }

      return updated
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
