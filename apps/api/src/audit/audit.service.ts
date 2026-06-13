import { Inject, Injectable } from '@nestjs/common'
import type { TenantContext } from '../access-control/access-control.types.js'
import {
  createPaginationMeta,
  getPaginationSkipTake,
} from '../common/pagination/pagination.js'
import { AuditAction } from '../generated/prisma/enums.js'
import { Prisma } from '../generated/prisma/client.js'
import { PrismaService } from '../prisma/prisma.service.js'
import type { AuditLogsQuery } from './audit.schemas.js'

type AuditClient = PrismaService | Prisma.TransactionClient
type JsonRecord = Record<string, unknown>

export type AuditRecordInput = {
  tenant?: TenantContext
  actorUserId?: string
  action: AuditAction
  entityType: string
  entityId?: string
  oldValues?: unknown
  newValues?: unknown
  ipAddress?: string
  userAgent?: string
}

@Injectable()
export class AuditService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async list(query: AuditLogsQuery, tenant: TenantContext) {
    const pagination = { page: query.page, pageSize: query.pageSize }
    const where = {
      companyId: tenant.companyId,
      branchId: query.branchId,
      actorUserId: query.actorUserId,
      action: query.action,
      entityType: query.entityType,
      entityId: query.entityId,
    }
    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        ...getPaginationSkipTake(pagination),
        orderBy: { createdAt: 'desc' },
        select: this.auditLogSelect(),
      }),
      this.prisma.auditLog.count({ where }),
    ])

    return { items, meta: createPaginationMeta(pagination, total) }
  }

  async record(input: AuditRecordInput, client: AuditClient = this.prisma) {
    return client.auditLog.create({
      data: {
        companyId: input.tenant?.companyId,
        branchId: input.tenant?.branchId,
        actorUserId: input.actorUserId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        oldValues:
          input.oldValues === undefined ? undefined : this.toJsonValue(input.oldValues),
        newValues:
          input.newValues === undefined ? undefined : this.toJsonValue(input.newValues),
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      },
      select: { id: true },
    })
  }

  recordCreate(
    input: Omit<AuditRecordInput, 'action' | 'oldValues'>,
    client?: AuditClient,
  ) {
    return this.record({ ...input, action: AuditAction.CREATE }, client)
  }

  recordUpdate(input: Omit<AuditRecordInput, 'action'>, client?: AuditClient) {
    return this.record({ ...input, action: AuditAction.UPDATE }, client)
  }

  recordDelete(input: Omit<AuditRecordInput, 'action'>, client?: AuditClient) {
    return this.record({ ...input, action: AuditAction.DELETE }, client)
  }

  private toJsonValue(value: unknown): Prisma.InputJsonValue {
    return this.toPlainJson(value) as Prisma.InputJsonValue
  }

  private toPlainJson(value: unknown): unknown {
    if (value === null || value === undefined) return null
    if (value instanceof Date) return value.toISOString()
    if (Array.isArray(value)) return value.map((item) => this.toPlainJson(item))
    if (typeof value === 'object') {
      if ('toJSON' in value && typeof value.toJSON === 'function') {
        return this.toPlainJson(value.toJSON())
      }

      return Object.fromEntries(
        Object.entries(value as JsonRecord).map(([key, item]) => [
          key,
          this.toPlainJson(item),
        ]),
      )
    }

    return value
  }

  private auditLogSelect() {
    return {
      id: true,
      companyId: true,
      branchId: true,
      actorUserId: true,
      action: true,
      entityType: true,
      entityId: true,
      oldValues: true,
      newValues: true,
      ipAddress: true,
      userAgent: true,
      createdAt: true,
      branch: { select: { id: true, code: true, name: true } },
      actor: { select: { id: true, email: true, fullName: true } },
    }
  }
}
