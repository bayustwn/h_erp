import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import { createPaginationMeta, getPaginationSkipTake } from '../common/pagination/pagination.js'
import { AuditService } from '../audit/audit.service.js'
import { RecordStatus } from '../generated/prisma/enums.js'
import { PrismaService } from '../prisma/prisma.service.js'
import type { TenantContext } from '../access-control/access-control.types.js'
import type { CreateSupplierInput, SuppliersQuery, UpdateSupplierInput, UpdateSupplierStatusInput } from './suppliers.schemas.js'

@Injectable()
export class SuppliersService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly auditService: AuditService,
  ) {}

  async list(query: SuppliersQuery, tenant: TenantContext) {
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
              { phone: { contains: query.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    }
    const [suppliers, total] = await Promise.all([
      this.prisma.supplier.findMany({
        where,
        ...getPaginationSkipTake(pagination),
        orderBy: [{ code: 'asc' }, { name: 'asc' }],
        select: this.supplierSelect(),
      }),
      this.prisma.supplier.count({ where }),
    ])
    return { items: suppliers, meta: createPaginationMeta(pagination, total) }
  }

  async getById(supplierId: string, tenant: TenantContext) {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id: supplierId, companyId: tenant.companyId, deletedAt: null },
      select: this.supplierSelect(),
    })
    if (!supplier) throw new NotFoundException('Supplier not found')
    return supplier
  }

  async create(input: CreateSupplierInput, tenant: TenantContext, actorUserId: string) {
    await this.assertCodeIsAvailable(input.code, tenant)
    return this.prisma.$transaction(async (tx) => {
      const supplier = await tx.supplier.create({
        data: {
          companyId: tenant.companyId,
          code: input.code,
          name: input.name,
          phone: input.phone,
          email: input.email,
          address: input.address,
          taxNumber: input.taxNumber,
          creditLimit: input.creditLimit,
          paymentTerm: input.paymentTerm,
        },
        select: this.supplierSelect(),
      })
      await this.auditService.recordCreate({ tenant, actorUserId, entityType: 'Supplier', entityId: supplier.id, newValues: supplier }, tx)
      return supplier
    })
  }

  async update(supplierId: string, input: UpdateSupplierInput, tenant: TenantContext, actorUserId: string) {
    const current = await this.getById(supplierId, tenant)
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.supplier.update({
        where: { id: supplierId },
        data: input,
        select: this.supplierSelect(),
      })
      await this.auditService.recordUpdate({ tenant, actorUserId, entityType: 'Supplier', entityId: supplierId, oldValues: current, newValues: updated }, tx)
      return updated
    })
  }

  async updateStatus(supplierId: string, input: UpdateSupplierStatusInput, tenant: TenantContext, actorUserId: string) {
    const current = await this.getById(supplierId, tenant)
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.supplier.update({
        where: { id: supplierId },
        data: {
          status: input.status,
          deletedAt: input.status === RecordStatus.ARCHIVED ? new Date() : null,
        },
        select: this.supplierSelect(),
      })
      const auditInput = { tenant, actorUserId, entityType: 'Supplier', entityId: supplierId, oldValues: current, newValues: updated }
      if (input.status === RecordStatus.ARCHIVED) {
        await this.auditService.recordDelete(auditInput, tx)
      } else {
        await this.auditService.recordUpdate(auditInput, tx)
      }
      return updated
    })
  }

  private async assertCodeIsAvailable(code: string, tenant: TenantContext) {
    const supplier = await this.prisma.supplier.findFirst({
      where: { companyId: tenant.companyId, code, deletedAt: null },
      select: { id: true },
    })
    if (supplier) throw new ConflictException('Supplier code is already used')
  }

  private supplierSelect() {
    return {
      id: true,
      companyId: true,
      code: true,
      name: true,
      phone: true,
      email: true,
      address: true,
      taxNumber: true,
      creditLimit: true,
      paymentTerm: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    }
  }
}
