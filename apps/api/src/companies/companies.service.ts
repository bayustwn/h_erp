import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import {
  createPaginationMeta,
  getPaginationSkipTake,
} from '../common/pagination/pagination.js'
import { AuditService } from '../audit/audit.service.js'
import { RecordStatus } from '../generated/prisma/enums.js'
import { PrismaService } from '../prisma/prisma.service.js'
import type { TenantContext } from '../access-control/access-control.types.js'
import type { CompaniesQuery, UpdateCompanyInput } from './companies.schemas.js'

@Injectable()
export class CompaniesService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly auditService: AuditService,
  ) {}

  async list(query: CompaniesQuery) {
    const pagination = {
      page: query.page,
      pageSize: query.pageSize,
    }
    const where = {
      status: RecordStatus.ACTIVE,
      deletedAt: null,
      ...(query.search
        ? {
            OR: [
              { code: { contains: query.search, mode: 'insensitive' as const } },
              { name: { contains: query.search, mode: 'insensitive' as const } },
              { legalName: { contains: query.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    }
    const [companies, total] = await Promise.all([
      this.prisma.company.findMany({
        where,
        ...getPaginationSkipTake(pagination),
        orderBy: [{ name: 'asc' }, { code: 'asc' }],
        select: this.companySelect(),
      }),
      this.prisma.company.count({ where }),
    ])

    return {
      items: companies,
      meta: createPaginationMeta(pagination, total),
    }
  }

  async getCurrent(tenant: TenantContext) {
    const company = await this.prisma.company.findFirst({
      where: {
        id: tenant.companyId,
        deletedAt: null,
      },
      select: this.companySelect(),
    })

    if (!company) {
      throw new NotFoundException('Company not found')
    }

    return company
  }

  async updateCurrent(
    input: UpdateCompanyInput,
    tenant: TenantContext,
    actorUserId: string,
  ) {
    const current = await this.getCurrent(tenant)

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.company.update({
        where: {
          id: tenant.companyId,
        },
        data: input,
        select: this.companySelect(),
      })
      await this.auditService.recordUpdate(
        {
          tenant,
          actorUserId,
          entityType: 'Company',
          entityId: tenant.companyId,
          oldValues: current,
          newValues: updated,
        },
        tx,
      )

      return updated
    })
  }

  private companySelect() {
    return {
      id: true,
      code: true,
      name: true,
      legalName: true,
      taxNumber: true,
      baseCurrencyCode: true,
      email: true,
      phone: true,
      address: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    }
  }
}
