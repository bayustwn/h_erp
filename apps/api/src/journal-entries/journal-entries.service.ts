import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import { createPaginationMeta, getPaginationSkipTake } from '../common/pagination/pagination.js'
import type { Prisma } from '../generated/prisma/client.js'
import { AuditService } from '../audit/audit.service.js'
import { PrismaService } from '../prisma/prisma.service.js'
import type { TenantContext } from '../access-control/access-control.types.js'
import type { CreateJournalEntryInput, JournalEntryQuery, UpdateJournalEntryStatusInput } from './journal-entries.schemas.js'

@Injectable()
export class JournalEntriesService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly auditService: AuditService,
  ) {}

  async list(query: JournalEntryQuery, tenant: TenantContext) {
    const pagination = { page: query.page, pageSize: query.pageSize }
    const where: Prisma.JournalEntryWhereInput = {
      companyId: tenant.companyId,
      deletedAt: null,
      status: query.status,
      ...(query.startDate || query.endDate
        ? {
            entryDate: {
              ...(query.startDate ? { gte: new Date(query.startDate) } : {}),
              ...(query.endDate ? { lte: new Date(query.endDate) } : {}),
            },
          }
        : {}),
      ...(query.search
        ? {
            OR: [
              { documentNumber: { contains: query.search, mode: 'insensitive' as const } },
              { description: { contains: query.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    }
    const [entries, total] = await Promise.all([
      this.prisma.journalEntry.findMany({
        where,
        ...getPaginationSkipTake(pagination),
        orderBy: [{ entryDate: 'desc' }, { createdAt: 'desc' }],
        select: this.entrySelect(),
      }),
      this.prisma.journalEntry.count({ where }),
    ])
    return { items: entries, meta: createPaginationMeta(pagination, total) }
  }

  async getById(entryId: string, tenant: TenantContext) {
    const entry = await this.prisma.journalEntry.findFirst({
      where: { id: entryId, companyId: tenant.companyId, deletedAt: null },
      select: this.entryDetailSelect(),
    })
    if (!entry) throw new NotFoundException('Journal entry not found')
    return entry
  }

  async create(input: CreateJournalEntryInput, tenant: TenantContext, actorUserId: string) {
    const totalDebit = input.lines.reduce((sum, l) => sum + l.debit, 0)
    const totalCredit = input.lines.reduce((sum, l) => sum + l.credit, 0)
    if (Math.abs(totalDebit - totalCredit) > 0.001) {
      throw new BadRequestException('Total debit must equal total credit')
    }
    return this.prisma.$transaction(async (tx) => {
      const entry = await tx.journalEntry.create({
        data: {
          companyId: tenant.companyId,
          branchId: input.branchId,
          documentNumber: input.documentNumber,
          entryDate: input.entryDate ? new Date(input.entryDate) : new Date(),
          description: input.description,
          referenceType: input.referenceType,
          referenceId: input.referenceId,
          totalDebit,
          totalCredit,
          lines: {
            create: input.lines.map((l) => ({
              accountId: l.accountId,
              debit: l.debit,
              credit: l.credit,
              description: l.description,
            })),
          },
        },
        select: this.entryDetailSelect(),
      })
      await this.auditService.recordCreate({ tenant, actorUserId, entityType: 'JournalEntry', entityId: entry.id, newValues: entry }, tx)
      return entry
    })
  }

  async updateStatus(entryId: string, input: UpdateJournalEntryStatusInput, tenant: TenantContext, actorUserId: string) {
    const current = await this.getById(entryId, tenant)
    if (current.status === 'POSTED' && input.status === 'CANCELLED') {
      throw new BadRequestException('Cannot cancel a posted entry. Create a reversing entry instead.')
    }
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.journalEntry.update({
        where: { id: entryId },
        data: {
          status: input.status,
          deletedAt: input.status === 'CANCELLED' ? new Date() : undefined,
        },
        select: this.entryDetailSelect(),
      })
      const auditInput = { tenant, actorUserId, entityType: 'JournalEntry', entityId: entryId, oldValues: current, newValues: updated }
      if (input.status === 'CANCELLED') {
        await this.auditService.recordDelete(auditInput, tx)
      } else {
        await this.auditService.recordUpdate(auditInput, tx)
      }
      return updated
    })
  }

  private entrySelect() {
    return {
      id: true,
      companyId: true,
      branchId: true,
      documentNumber: true,
      entryDate: true,
      status: true,
      description: true,
      totalDebit: true,
      totalCredit: true,
      referenceType: true,
      referenceId: true,
      createdAt: true,
      updatedAt: true,
    }
  }

  private entryDetailSelect() {
    return {
      ...this.entrySelect(),
      lines: {
        select: {
          id: true,
          accountId: true,
          debit: true,
          credit: true,
          description: true,
          account: { select: { id: true, code: true, name: true } },
        },
      },
    }
  }
}
