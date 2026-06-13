import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import {
  createPaginationMeta,
  getPaginationSkipTake,
} from '../common/pagination/pagination.js'
import { RecordStatus } from '../generated/prisma/enums.js'
import { PrismaService } from '../prisma/prisma.service.js'
import type { TenantContext } from '../access-control/access-control.types.js'
import type {
  BranchesQuery,
  CreateBranchInput,
  UpdateBranchInput,
  UpdateBranchStatusInput,
} from './branches.schemas.js'

@Injectable()
export class BranchesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: BranchesQuery, tenant: TenantContext) {
    const pagination = {
      page: query.page,
      pageSize: query.pageSize,
    }
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
    const [branches, total] = await Promise.all([
      this.prisma.branch.findMany({
        where,
        ...getPaginationSkipTake(pagination),
        orderBy: [{ code: 'asc' }, { name: 'asc' }],
        select: this.branchSelect(),
      }),
      this.prisma.branch.count({ where }),
    ])

    return {
      items: branches,
      meta: createPaginationMeta(pagination, total),
    }
  }

  async getById(branchId: string, tenant: TenantContext) {
    const branch = await this.prisma.branch.findFirst({
      where: {
        id: branchId,
        companyId: tenant.companyId,
        deletedAt: null,
      },
      select: this.branchSelect(),
    })

    if (!branch) {
      throw new NotFoundException('Branch not found')
    }

    return branch
  }

  async create(input: CreateBranchInput, tenant: TenantContext) {
    await this.assertCodeIsAvailable(input.code, tenant)

    const branch = await this.prisma.branch.create({
      data: {
        companyId: tenant.companyId,
        code: input.code,
        name: input.name,
        email: input.email,
        phone: input.phone,
        address: input.address,
      },
      select: {
        id: true,
      },
    })

    return this.getById(branch.id, tenant)
  }

  async update(branchId: string, input: UpdateBranchInput, tenant: TenantContext) {
    await this.getById(branchId, tenant)

    await this.prisma.branch.update({
      where: {
        id: branchId,
      },
      data: input,
    })

    return this.getById(branchId, tenant)
  }

  async updateStatus(
    branchId: string,
    input: UpdateBranchStatusInput,
    tenant: TenantContext,
  ) {
    await this.getById(branchId, tenant)

    return this.prisma.branch.update({
      where: {
        id: branchId,
      },
      data: {
        status: input.status,
        deletedAt: input.status === RecordStatus.ARCHIVED ? new Date() : null,
      },
      select: this.branchSelect(),
    })
  }

  private async assertCodeIsAvailable(code: string, tenant: TenantContext) {
    const branch = await this.prisma.branch.findFirst({
      where: {
        companyId: tenant.companyId,
        code,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    })

    if (branch) {
      throw new ConflictException('Branch code is already used')
    }
  }

  private branchSelect() {
    return {
      id: true,
      companyId: true,
      code: true,
      name: true,
      email: true,
      phone: true,
      address: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    }
  }
}
