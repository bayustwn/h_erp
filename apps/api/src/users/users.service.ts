import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common'
import {
  createPaginationMeta,
  getPaginationSkipTake,
} from '../common/pagination/pagination.js'
import { PasswordService } from '../auth/password.service.js'
import { RecordStatus } from '../generated/prisma/enums.js'
import { PrismaService } from '../prisma/prisma.service.js'
import type { TenantContext } from '../access-control/access-control.types.js'
import type {
  CreateUserInput,
  UpdateUserBranchAccessInput,
  UpdateUserCompanyAccessInput,
  UpdateUserInput,
  UpdateUserRolesInput,
  UpdateUserStatusInput,
  UsersQuery,
} from './users.schemas.js'

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
  ) {}

  async list(query: UsersQuery, tenant: TenantContext) {
    const pagination = {
      page: query.page,
      pageSize: query.pageSize,
    }
    const where = {
      deletedAt: null,
      status: query.status,
      companyAccess: {
        some: {
          companyId: tenant.companyId,
        },
      },
      ...(query.search
        ? {
            OR: [
              { email: { contains: query.search, mode: 'insensitive' as const } },
              { fullName: { contains: query.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    }
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        ...getPaginationSkipTake(pagination),
        orderBy: [{ fullName: 'asc' }, { email: 'asc' }],
        select: this.userListSelect(tenant),
      }),
      this.prisma.user.count({ where }),
    ])

    return {
      items: users,
      meta: createPaginationMeta(pagination, total),
    }
  }

  async getById(userId: string, tenant: TenantContext) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        deletedAt: null,
        companyAccess: {
          some: {
            companyId: tenant.companyId,
          },
        },
      },
      select: this.userDetailSelect(tenant),
    })

    if (!user) {
      throw new NotFoundException('User not found')
    }

    return user
  }

  async create(input: CreateUserInput, tenant: TenantContext) {
    await this.assertEmailIsAvailable(input.email)
    await this.assertRolesCanBeAssigned(input.roleIds, tenant)
    await this.assertBranchesBelongToCompany(
      input.branchAccess.map((branch) => branch.branchId),
      tenant,
    )

    const user = await this.prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email: input.email,
          passwordHash: await this.passwordService.hash(input.password),
          fullName: input.fullName,
          phone: input.phone,
          companyAccess: {
            create: {
              companyId: tenant.companyId,
              accessScope: input.companyAccessScope,
            },
          },
          roles: {
            create: input.roleIds.map((roleId) => ({
              roleId,
              companyId: tenant.companyId,
            })),
          },
          branchAccess: {
            create: input.branchAccess.map((branch) => ({
              branchId: branch.branchId,
              accessScope: branch.accessScope,
            })),
          },
        },
        select: {
          id: true,
        },
      })

      return createdUser
    })

    return this.getById(user.id, tenant)
  }

  async update(userId: string, input: UpdateUserInput, tenant: TenantContext) {
    await this.assertUserBelongsToTenant(userId, tenant)

    await this.prisma.user.update({
      where: { id: userId },
      data: input,
    })

    return this.getById(userId, tenant)
  }

  async updateStatus(
    userId: string,
    input: UpdateUserStatusInput,
    tenant: TenantContext,
  ) {
    await this.assertUserBelongsToTenant(userId, tenant)

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        status: input.status,
        deletedAt: input.status === RecordStatus.ARCHIVED ? new Date() : null,
      },
    })

    return this.getById(userId, tenant)
  }

  async updateRoles(userId: string, input: UpdateUserRolesInput, tenant: TenantContext) {
    await this.assertUserBelongsToTenant(userId, tenant)
    await this.assertRolesCanBeAssigned(input.roleIds, tenant)

    await this.prisma.$transaction([
      this.prisma.userRole.deleteMany({
        where: {
          userId,
          companyId: tenant.companyId,
        },
      }),
      ...input.roleIds.map((roleId) =>
        this.prisma.userRole.create({
          data: {
            userId,
            roleId,
            companyId: tenant.companyId,
          },
        }),
      ),
    ])

    return this.getById(userId, tenant)
  }

  async updateCompanyAccess(
    userId: string,
    input: UpdateUserCompanyAccessInput,
    tenant: TenantContext,
  ) {
    await this.assertUserExists(userId)

    await this.prisma.userCompanyAccess.upsert({
      where: {
        userId_companyId: {
          userId,
          companyId: tenant.companyId,
        },
      },
      update: {
        accessScope: input.accessScope,
      },
      create: {
        userId,
        companyId: tenant.companyId,
        accessScope: input.accessScope,
      },
    })

    return this.getById(userId, tenant)
  }

  async updateBranchAccess(
    userId: string,
    input: UpdateUserBranchAccessInput,
    tenant: TenantContext,
  ) {
    await this.assertUserBelongsToTenant(userId, tenant)
    await this.assertBranchesBelongToCompany(
      input.branches.map((branch) => branch.branchId),
      tenant,
    )
    const companyBranchIds = await this.findCompanyBranchIds(tenant)

    await this.prisma.$transaction([
      this.prisma.userBranchAccess.deleteMany({
        where: {
          userId,
          branchId: {
            in: companyBranchIds,
          },
        },
      }),
      ...input.branches.map((branch) =>
        this.prisma.userBranchAccess.create({
          data: {
            userId,
            branchId: branch.branchId,
            accessScope: branch.accessScope,
          },
        }),
      ),
    ])

    return this.getById(userId, tenant)
  }

  private async assertEmailIsAvailable(email: string) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    })

    if (existingUser) {
      throw new ConflictException('Email is already used')
    }
  }

  private async assertUserExists(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    })

    if (!user) {
      throw new NotFoundException('User not found')
    }
  }

  private async assertUserBelongsToTenant(userId: string, tenant: TenantContext) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        deletedAt: null,
        companyAccess: {
          some: {
            companyId: tenant.companyId,
          },
        },
      },
      select: {
        id: true,
      },
    })

    if (!user) {
      throw new NotFoundException('User not found')
    }
  }

  private async assertRolesCanBeAssigned(roleIds: string[], tenant: TenantContext) {
    if (roleIds.length === 0) {
      return
    }

    const uniqueRoleIds = Array.from(new Set(roleIds))
    const roles = await this.prisma.role.findMany({
      where: {
        id: {
          in: uniqueRoleIds,
        },
        deletedAt: null,
        OR: [{ companyId: null }, { companyId: tenant.companyId }],
      },
      select: {
        id: true,
      },
    })

    if (roles.length !== uniqueRoleIds.length) {
      throw new UnprocessableEntityException('One or more roles cannot be assigned')
    }
  }

  private async assertBranchesBelongToCompany(
    branchIds: string[],
    tenant: TenantContext,
  ) {
    if (branchIds.length === 0) {
      return
    }

    const uniqueBranchIds = Array.from(new Set(branchIds))
    const branches = await this.prisma.branch.findMany({
      where: {
        id: {
          in: uniqueBranchIds,
        },
        companyId: tenant.companyId,
        status: RecordStatus.ACTIVE,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    })

    if (branches.length !== uniqueBranchIds.length) {
      throw new UnprocessableEntityException(
        'One or more branches do not belong to the active company',
      )
    }
  }

  private async findCompanyBranchIds(tenant: TenantContext) {
    const branches = await this.prisma.branch.findMany({
      where: {
        companyId: tenant.companyId,
      },
      select: {
        id: true,
      },
    })

    return branches.map((branch) => branch.id)
  }

  private userListSelect(tenant: TenantContext) {
    return {
      id: true,
      email: true,
      fullName: true,
      phone: true,
      status: true,
      lastLoginAt: true,
      createdAt: true,
      roles: {
        where: {
          companyId: tenant.companyId,
        },
        select: {
          role: {
            select: {
              id: true,
              code: true,
              name: true,
              isSystem: true,
            },
          },
        },
      },
      companyAccess: {
        where: {
          companyId: tenant.companyId,
        },
        select: {
          accessScope: true,
        },
      },
    }
  }

  private userDetailSelect(tenant: TenantContext) {
    return {
      ...this.userListSelect(tenant),
      updatedAt: true,
      branchAccess: {
        where: {
          branch: {
            companyId: tenant.companyId,
          },
        },
        select: {
          accessScope: true,
          branch: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
        },
      },
    }
  }
}
