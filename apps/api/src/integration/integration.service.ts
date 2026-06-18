import { BadRequestException, Inject, Injectable } from '@nestjs/common'
import type { Prisma } from '../generated/prisma/client.js'
import { PrismaService } from '../prisma/prisma.service.js'
import { DocumentSequencesService } from '../document-sequences/document-sequences.service.js'
import type { TenantContext } from '../access-control/access-control.types.js'

@Injectable()
export class IntegrationService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(DocumentSequencesService) private readonly docSeqService: DocumentSequencesService,
  ) {}

  async generateDocNumber(
    tenant: TenantContext,
    documentType: string,
    branchId?: string,
    documentDate?: Date,
  ): Promise<string | null> {
    try {
      const result = await this.docSeqService.generate(
        { documentType, branchId: branchId ?? '', documentDate: documentDate ?? new Date() },
        tenant,
      )
      return result.documentNumber
    } catch {
      return null
    }
  }

  async createStockMovement(
    tx: Prisma.TransactionClient,
    params: {
      companyId: string
      warehouseId: string
      itemId: string
      movementType: 'SALES_OUT' | 'PURCHASE_IN' | 'RETURN_IN' | 'RETURN_OUT'
      sourceType: 'SALES_DELIVERY' | 'PURCHASE_RECEIPT'
      sourceId: string
      quantity: number
      notes?: string
      actorUserId?: string
    },
  ) {
    const balance = await this.getStockBalance(tx, params.companyId, params.warehouseId, params.itemId)
    const balanceAfter = params.movementType === 'SALES_OUT' || params.movementType === 'RETURN_OUT'
      ? Number(balance) - params.quantity
      : Number(balance) + params.quantity
    return tx.stockMovement.create({
      data: {
        companyId: params.companyId,
        warehouseId: params.warehouseId,
        itemId: params.itemId,
        movementType: params.movementType,
        sourceType: params.sourceType,
        sourceId: params.sourceId,
        quantity: params.quantity,
        balanceAfter,
        notes: params.notes,
        createdById: params.actorUserId,
      },
    })
  }

  async createJournalEntry(
    tx: Prisma.TransactionClient,
    params: {
      companyId: string
      branchId?: string
      documentNumber: string
      entryDate: Date
      description: string
      referenceType: string
      referenceId: string
      lines: Array<{ accountId: string; debit: number; credit: number; description?: string }>
    },
  ) {
    const totalDebit = params.lines.reduce((s, l) => s + l.debit, 0)
    const totalCredit = params.lines.reduce((s, l) => s + l.credit, 0)
    if (Math.abs(totalDebit - totalCredit) > 0.001) {
      throw new BadRequestException('Journal entry must have equal debits and credits')
    }
    return tx.journalEntry.create({
      data: {
        companyId: params.companyId,
        branchId: params.branchId,
        documentNumber: params.documentNumber,
        entryDate: params.entryDate,
        status: 'POSTED',
        description: params.description,
        referenceType: params.referenceType,
        referenceId: params.referenceId,
        totalDebit,
        totalCredit,
        lines: {
          create: params.lines.map((l) => ({
            accountId: l.accountId,
            debit: l.debit,
            credit: l.credit,
            description: l.description,
          })),
        },
      },
    })
  }

  async findArAccount(tx: Prisma.TransactionClient, companyId: string) {
    return tx.chartOfAccount.findFirst({
      where: { companyId, type: 'ASSET', deletedAt: null, name: { contains: 'Piutang', mode: 'insensitive' as const } },
      orderBy: { code: 'asc' },
    })
  }

  async findApAccount(tx: Prisma.TransactionClient, companyId: string) {
    return tx.chartOfAccount.findFirst({
      where: { companyId, type: 'LIABILITY', deletedAt: null, name: { contains: 'Hutang', mode: 'insensitive' as const } },
      orderBy: { code: 'asc' },
    })
  }

  async findCashAccount(tx: Prisma.TransactionClient, companyId: string) {
    return tx.chartOfAccount.findFirst({
      where: { companyId, type: 'ASSET', deletedAt: null, name: { contains: 'Kas', mode: 'insensitive' as const } },
      orderBy: { code: 'asc' },
    })
  }

  async findRevenueAccount(tx: Prisma.TransactionClient, companyId: string, itemId: string) {
    const mapping = await tx.productAccountingMapping.findFirst({
      where: { companyId, itemId },
      select: { revenueAccountId: true },
    })
    if (mapping?.revenueAccountId) return mapping.revenueAccountId
    const defaultMapping = await tx.productAccountingMapping.findFirst({
      where: { companyId, itemCategoryId: null, itemId: null },
      select: { revenueAccountId: true },
    })
    return defaultMapping?.revenueAccountId ?? null
  }

  async findCogsAccount(tx: Prisma.TransactionClient, companyId: string, itemId: string) {
    const mapping = await tx.productAccountingMapping.findFirst({
      where: { companyId, itemId },
      select: { cogsAccountId: true },
    })
    if (mapping?.cogsAccountId) return mapping.cogsAccountId
    const defaultMapping = await tx.productAccountingMapping.findFirst({
      where: { companyId, itemCategoryId: null, itemId: null },
      select: { cogsAccountId: true },
    })
    return defaultMapping?.cogsAccountId ?? null
  }

  async findInventoryAccount(tx: Prisma.TransactionClient, companyId: string, itemId: string) {
    const mapping = await tx.productAccountingMapping.findFirst({
      where: { companyId, itemId },
      select: { inventoryAccountId: true },
    })
    if (mapping?.inventoryAccountId) return mapping.inventoryAccountId
    const defaultMapping = await tx.productAccountingMapping.findFirst({
      where: { companyId, itemCategoryId: null, itemId: null },
      select: { inventoryAccountId: true },
    })
    return defaultMapping?.inventoryAccountId ?? null
  }

  async findPurchaseAccount(tx: Prisma.TransactionClient, companyId: string, itemId: string) {
    const mapping = await tx.productAccountingMapping.findFirst({
      where: { companyId, itemId },
      select: { purchaseAccountId: true },
    })
    if (mapping?.purchaseAccountId) return mapping.purchaseAccountId
    const defaultMapping = await tx.productAccountingMapping.findFirst({
      where: { companyId, itemCategoryId: null, itemId: null },
      select: { purchaseAccountId: true },
    })
    return defaultMapping?.purchaseAccountId ?? null
  }

  private async getStockBalance(
    tx: Prisma.TransactionClient,
    companyId: string,
    warehouseId: string,
    itemId: string,
  ): Promise<number> {
    const balance = await tx.stockBalance.findFirst({
      where: { companyId, warehouseId, itemId },
      select: { quantity: true },
    })
    return balance ? Number(balance.quantity) : 0
  }
}
