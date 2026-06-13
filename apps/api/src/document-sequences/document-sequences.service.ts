import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common'
import type { TenantContext } from '../access-control/access-control.types.js'
import {
  createPaginationMeta,
  getPaginationSkipTake,
} from '../common/pagination/pagination.js'
import { Prisma } from '../generated/prisma/client.js'
import { RecordStatus, ResetPolicy } from '../generated/prisma/enums.js'
import { PrismaService } from '../prisma/prisma.service.js'
import type {
  CreateDocumentSequenceInput,
  DocumentSequencesQuery,
  GenerateDocumentNumberInput,
  UpdateDocumentSequenceInput,
} from './document-sequences.schemas.js'

type LockedDocumentSequence = {
  id: string
  prefix: string
  period_format: string
  last_period: string | null
  next_number: number
  padding: number
  reset_policy: ResetPolicy
}

@Injectable()
export class DocumentSequencesService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async list(query: DocumentSequencesQuery, tenant: TenantContext) {
    const pagination = { page: query.page, pageSize: query.pageSize }
    const where = {
      companyId: tenant.companyId,
      branchId: query.branchId,
      documentType: query.documentType,
      isActive: query.isActive,
      ...(query.search
        ? {
            OR: [
              { documentType: { contains: query.search, mode: 'insensitive' as const } },
              { prefix: { contains: query.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    }
    const [items, total] = await Promise.all([
      this.prisma.documentSequence.findMany({
        where,
        ...getPaginationSkipTake(pagination),
        orderBy: [{ documentType: 'asc' }, { branch: { code: 'asc' } }],
        select: this.sequenceSelect(),
      }),
      this.prisma.documentSequence.count({ where }),
    ])

    return { items, meta: createPaginationMeta(pagination, total) }
  }

  async getById(id: string, tenant: TenantContext) {
    const sequence = await this.prisma.documentSequence.findFirst({
      where: { id, companyId: tenant.companyId },
      select: this.sequenceSelect(),
    })
    if (!sequence) throw new NotFoundException('Document sequence not found')
    return sequence
  }

  async create(input: CreateDocumentSequenceInput, tenant: TenantContext) {
    await this.assertBranchBelongsToCompany(input.branchId, tenant)
    if (input.isActive) await this.assertNoActiveSequence(input, tenant)

    const sequence = await this.prisma.documentSequence.create({
      data: { ...input, companyId: tenant.companyId },
      select: { id: true },
    })
    return this.getById(sequence.id, tenant)
  }

  async update(id: string, input: UpdateDocumentSequenceInput, tenant: TenantContext) {
    const current = await this.getById(id, tenant)
    await this.assertBranchBelongsToCompany(input.branchId ?? undefined, tenant)

    const nextState = {
      documentType: current.documentType,
      branchId:
        input.branchId === undefined
          ? (current.branchId ?? undefined)
          : (input.branchId ?? undefined),
      periodFormat: input.periodFormat ?? current.periodFormat,
      isActive: input.isActive ?? current.isActive,
    }
    if (nextState.isActive) {
      await this.assertNoActiveSequence(nextState, tenant, id)
    }

    await this.prisma.documentSequence.update({
      where: { id },
      data: input,
    })
    return this.getById(id, tenant)
  }

  async generate(input: GenerateDocumentNumberInput, tenant: TenantContext) {
    await this.assertBranchBelongsToCompany(input.branchId, tenant)

    return this.prisma.$transaction(async (tx) => {
      const sequence = await this.findAndLockSequence(tx, input, tenant)
      if (!sequence) {
        throw new NotFoundException('Active document sequence not found')
      }

      const periodText = this.formatPeriod(sequence.period_format, input.documentDate)
      const periodKey = this.resolvePeriodKey(sequence.reset_policy, input.documentDate)
      const shouldReset =
        sequence.reset_policy !== ResetPolicy.NEVER &&
        sequence.last_period !== null &&
        sequence.last_period !== periodKey
      const currentNumber = shouldReset ? 1 : sequence.next_number
      const nextNumber = currentNumber + 1
      const documentNumber = `${sequence.prefix}${periodText}${String(
        currentNumber,
      ).padStart(sequence.padding, '0')}`

      const updated = await tx.documentSequence.update({
        where: { id: sequence.id },
        data: {
          nextNumber,
          lastPeriod: periodKey,
        },
        select: this.sequenceSelect(),
      })

      return {
        documentNumber,
        documentType: input.documentType,
        sequence: updated,
      }
    })
  }

  private async findAndLockSequence(
    client: Prisma.TransactionClient,
    input: GenerateDocumentNumberInput,
    tenant: TenantContext,
  ) {
    const rows = input.branchId
      ? await client.$queryRaw<LockedDocumentSequence[]>(Prisma.sql`
          SELECT
            "id",
            "prefix",
            "period_format",
            "last_period",
            "next_number",
            "padding",
            "reset_policy"
          FROM "document_sequences"
          WHERE "company_id" = ${tenant.companyId}::uuid
            AND "document_type" = ${input.documentType}
            AND "is_active" = true
            AND ("branch_id" = ${input.branchId}::uuid OR "branch_id" IS NULL)
          ORDER BY CASE WHEN "branch_id" = ${input.branchId}::uuid THEN 0 ELSE 1 END
          LIMIT 1
          FOR UPDATE
        `)
      : await client.$queryRaw<LockedDocumentSequence[]>(Prisma.sql`
          SELECT
            "id",
            "prefix",
            "period_format",
            "last_period",
            "next_number",
            "padding",
            "reset_policy"
          FROM "document_sequences"
          WHERE "company_id" = ${tenant.companyId}::uuid
            AND "document_type" = ${input.documentType}
            AND "is_active" = true
            AND "branch_id" IS NULL
          LIMIT 1
          FOR UPDATE
        `)

    return rows[0]
  }

  private async assertBranchBelongsToCompany(
    branchId: string | undefined,
    tenant: TenantContext,
  ) {
    if (!branchId) return
    const branch = await this.prisma.branch.findFirst({
      where: {
        id: branchId,
        companyId: tenant.companyId,
        status: RecordStatus.ACTIVE,
        deletedAt: null,
      },
      select: { id: true },
    })
    if (!branch) throw new UnprocessableEntityException('Branch is invalid')
  }

  private async assertNoActiveSequence(
    input: Pick<
      CreateDocumentSequenceInput,
      'branchId' | 'documentType' | 'periodFormat'
    > & { isActive?: boolean },
    tenant: TenantContext,
    currentId?: string,
  ) {
    const sequence = await this.prisma.documentSequence.findFirst({
      where: {
        companyId: tenant.companyId,
        branchId: input.branchId ?? null,
        documentType: input.documentType,
        periodFormat: input.periodFormat,
        isActive: true,
        id: currentId ? { not: currentId } : undefined,
      },
      select: { id: true },
    })
    if (sequence) {
      throw new ConflictException('Active document sequence already exists')
    }
  }

  private formatPeriod(format: string, date: Date) {
    const year = date.getUTCFullYear().toString()
    const month = String(date.getUTCMonth() + 1).padStart(2, '0')
    const day = String(date.getUTCDate()).padStart(2, '0')

    return format
      .replaceAll('YYYY', year)
      .replaceAll('YY', year.slice(-2))
      .replaceAll('MM', month)
      .replaceAll('DD', day)
  }

  private resolvePeriodKey(resetPolicy: ResetPolicy, date: Date) {
    const year = date.getUTCFullYear().toString()
    const month = String(date.getUTCMonth() + 1).padStart(2, '0')

    if (resetPolicy === ResetPolicy.YEARLY) return year
    if (resetPolicy === ResetPolicy.MONTHLY) return `${year}-${month}`
    return ResetPolicy.NEVER
  }

  private sequenceSelect() {
    return {
      id: true,
      companyId: true,
      branchId: true,
      documentType: true,
      prefix: true,
      periodFormat: true,
      lastPeriod: true,
      nextNumber: true,
      padding: true,
      resetPolicy: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      branch: { select: { id: true, code: true, name: true } },
    }
  }
}
