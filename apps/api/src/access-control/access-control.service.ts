import { ForbiddenException, Inject, Injectable } from '@nestjs/common'
import { AccessScope, RecordStatus } from '../generated/prisma/enums.js'
import { PrismaService } from '../prisma/prisma.service.js'
import type { TenantContext } from './access-control.types.js'

const SUPER_ADMIN_ROLE_CODE = 'SUPER_ADMIN'

@Injectable()
export class AccessControlService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async assertTenantAccess(userId: string, tenant: TenantContext) {
    if (await this.isSuperAdmin(userId)) {
      await this.assertTenantExists(tenant)
      return
    }

    const companyAccess = await this.prisma.userCompanyAccess.findUnique({
      where: {
        userId_companyId: {
          userId,
          companyId: tenant.companyId,
        },
      },
      include: {
        company: true,
      },
    })

    if (
      !companyAccess ||
      companyAccess.company.status !== RecordStatus.ACTIVE ||
      companyAccess.company.deletedAt
    ) {
      throw new ForbiddenException('Company access denied')
    }

    if (!tenant.branchId) {
      return
    }

    const branch = await this.prisma.branch.findFirst({
      where: {
        id: tenant.branchId,
        companyId: tenant.companyId,
        status: RecordStatus.ACTIVE,
        deletedAt: null,
      },
    })

    if (!branch) {
      throw new ForbiddenException('Branch access denied')
    }

    if (
      companyAccess.accessScope === AccessScope.ALL_COMPANIES ||
      companyAccess.accessScope === AccessScope.COMPANY
    ) {
      return
    }

    const branchAccess = await this.prisma.userBranchAccess.findUnique({
      where: {
        userId_branchId: {
          userId,
          branchId: tenant.branchId,
        },
      },
    })

    if (!branchAccess) {
      throw new ForbiddenException('Branch access denied')
    }
  }

  async hasPermissions(
    userId: string,
    permissions: string[],
    tenant?: TenantContext,
  ): Promise<boolean> {
    if (permissions.length === 0 || (await this.isSuperAdmin(userId))) {
      return true
    }

    const matchedPermissions = await this.prisma.permission.findMany({
      where: {
        code: {
          in: permissions,
        },
        roles: {
          some: {
            role: {
              deletedAt: null,
              OR: tenant?.companyId
                ? [{ companyId: null }, { companyId: tenant.companyId }]
                : [{ companyId: null }],
              users: {
                some: {
                  userId,
                  OR: tenant?.companyId
                    ? [{ companyId: null }, { companyId: tenant.companyId }]
                    : [{ companyId: null }],
                },
              },
            },
          },
        },
      },
      select: {
        code: true,
      },
    })
    const grantedPermissionCodes = new Set(
      matchedPermissions.map((permission) => permission.code),
    )

    return permissions.every((permission) => grantedPermissionCodes.has(permission))
  }

  private async isSuperAdmin(userId: string): Promise<boolean> {
    const role = await this.prisma.userRole.findFirst({
      where: {
        userId,
        role: {
          code: SUPER_ADMIN_ROLE_CODE,
          isSystem: true,
          deletedAt: null,
        },
      },
      select: {
        id: true,
      },
    })

    return Boolean(role)
  }

  private async assertTenantExists(tenant: TenantContext) {
    const company = await this.prisma.company.findFirst({
      where: {
        id: tenant.companyId,
        status: RecordStatus.ACTIVE,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    })

    if (!company) {
      throw new ForbiddenException('Company access denied')
    }

    if (!tenant.branchId) {
      return
    }

    const branch = await this.prisma.branch.findFirst({
      where: {
        id: tenant.branchId,
        companyId: tenant.companyId,
        status: RecordStatus.ACTIVE,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    })

    if (!branch) {
      throw new ForbiddenException('Branch access denied')
    }
  }
}
