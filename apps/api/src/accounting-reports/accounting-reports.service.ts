import { Inject, Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service.js'
import type { TenantContext } from '../access-control/access-control.types.js'

type ReportItem = { accountId: string; code: string; name: string; amount: number }

@Injectable()
export class AccountingReportsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  async trialBalance(tenant: TenantContext, asOf?: string) {
    const dateFilter = asOf ? { lte: new Date(asOf) } : undefined
    const accounts = await this.prisma.chartOfAccount.findMany({
      where: { companyId: tenant.companyId, deletedAt: null, status: 'ACTIVE' },
      select: {
        id: true,
        code: true,
        name: true,
        type: true,
      },
      orderBy: [{ code: 'asc' }],
    })
    const lines = await this.prisma.journalEntryLine.findMany({
      where: {
        journalEntry: {
          companyId: tenant.companyId,
          deletedAt: null,
          status: 'POSTED',
          ...(dateFilter ? { entryDate: dateFilter } : {}),
        },
      },
      select: { accountId: true, debit: true, credit: true },
    })
    const totals: Record<string, { debit: number; credit: number }> = {}
    for (const line of lines) {
      if (!totals[line.accountId]) totals[line.accountId] = { debit: 0, credit: 0 }
      totals[line.accountId].debit += Number(line.debit)
      totals[line.accountId].credit += Number(line.credit)
    }
    const items = accounts.map((a) => {
      const t = totals[a.id] ?? { debit: 0, credit: 0 }
      const balance = a.type === 'REVENUE' || a.type === 'EQUITY' || a.type === 'LIABILITY'
        ? t.credit - t.debit
        : t.debit - t.credit
      return {
        accountId: a.id,
        code: a.code,
        name: a.name,
        type: a.type,
        debit: t.debit,
        credit: t.credit,
        balance,
      }
    })
    const totalDebit = items.reduce((s, i) => s + i.debit, 0)
    const totalCredit = items.reduce((s, i) => s + i.credit, 0)
    return { items, totalDebit, totalCredit }
  }

  async profitLoss(tenant: TenantContext, startDate?: string, endDate?: string) {
    const dateFilter: { gte?: Date; lte?: Date } = {}
    if (startDate) dateFilter.gte = new Date(startDate)
    if (endDate) dateFilter.lte = new Date(endDate)

    const lines = await this.prisma.journalEntryLine.findMany({
      where: {
        journalEntry: {
          companyId: tenant.companyId,
          deletedAt: null,
          status: 'POSTED',
          ...(Object.keys(dateFilter).length ? { entryDate: dateFilter } : {}),
        },
        account: { type: { in: ['REVENUE', 'EXPENSE'] } },
      },
      select: {
        debit: true,
        credit: true,
        account: { select: { id: true, code: true, name: true, type: true } },
      },
    })
    const revenues: ReportItem[] = []
    const expenses: ReportItem[] = []
    for (const line of lines) {
      const item = {
        accountId: line.account.id,
        code: line.account.code,
        name: line.account.name,
        amount: Number(line.account.type === 'REVENUE' ? Number(line.credit) - Number(line.debit) : Number(line.debit) - Number(line.credit)),
      }
      if (line.account.type === 'REVENUE') {
        revenues.push(item)
      } else {
        expenses.push(item)
      }
    }
    const totalRevenue = revenues.reduce((s, r) => s + r.amount, 0)
    const totalExpense = expenses.reduce((s, e) => s + e.amount, 0)
    return {
      revenues: { items: revenues, total: totalRevenue },
      expenses: { items: expenses, total: totalExpense },
      netProfit: totalRevenue - totalExpense,
    }
  }

  async balanceSheet(tenant: TenantContext, asOf?: string) {
    const dateFilter = asOf ? { lte: new Date(asOf) } : undefined
    const accounts = await this.prisma.chartOfAccount.findMany({
      where: {
        companyId: tenant.companyId,
        deletedAt: null,
        status: 'ACTIVE',
        type: { in: ['ASSET', 'LIABILITY', 'EQUITY'] },
      },
      select: { id: true, code: true, name: true, type: true },
      orderBy: [{ code: 'asc' }],
    })
    const lines = await this.prisma.journalEntryLine.findMany({
      where: {
        journalEntry: {
          companyId: tenant.companyId,
          deletedAt: null,
          status: 'POSTED',
          ...(dateFilter ? { entryDate: dateFilter } : {}),
        },
      },
      select: { accountId: true, debit: true, credit: true },
    })
    const totals: Record<string, { debit: number; credit: number }> = {}
    for (const line of lines) {
      if (!totals[line.accountId]) totals[line.accountId] = { debit: 0, credit: 0 }
      totals[line.accountId].debit += Number(line.debit)
      totals[line.accountId].credit += Number(line.credit)
    }
    const assets: ReportItem[] = []
    const liabilities: ReportItem[] = []
    const equities: ReportItem[] = []
    for (const a of accounts) {
      const t = totals[a.id] ?? { debit: 0, credit: 0 }
      const amount = a.type === 'ASSET' ? t.debit - t.credit : t.credit - t.debit
      const item = { accountId: a.id, code: a.code, name: a.name, amount }
      if (a.type === 'ASSET') assets.push(item)
      else if (a.type === 'LIABILITY') liabilities.push(item)
      else equities.push(item)
    }
    const pl = await this.profitLoss(tenant)
    const netProfit = pl.netProfit
    if (netProfit !== 0) {
      equities.push({ accountId: '', code: '', name: 'Laba Tahun Berjalan', amount: netProfit })
    }
    const totalAssets = assets.reduce((s, a) => s + a.amount, 0)
    const totalLiabilities = liabilities.reduce((s, l) => s + l.amount, 0)
    const totalEquity = equities.reduce((s, e) => s + e.amount, 0)
    return {
      assets: { items: assets, total: totalAssets },
      liabilities: { items: liabilities, total: totalLiabilities },
      equities: { items: equities, total: totalEquity },
      totalLiabilitiesEquity: totalLiabilities + totalEquity,
    }
  }

  async arAging(tenant: TenantContext, asOf?: string) {
    const asOfDate = asOf ? new Date(asOf) : new Date()
    const invoices = await this.prisma.salesInvoice.findMany({
      where: {
        companyId: tenant.companyId,
        deletedAt: null,
        status: 'COMPLETED',
        dueDate: { not: null },
      },
      select: {
        id: true,
        documentNumber: true,
        invoiceDate: true,
        dueDate: true,
        grandTotal: true,
        customer: { select: { id: true, code: true, name: true } },
      },
      orderBy: [{ customer: { name: 'asc' } }, { dueDate: 'asc' }],
    })
    const payments = await this.prisma.customerPaymentAllocation.findMany({
      where: {
        customerPayment: {
          companyId: tenant.companyId,
          deletedAt: null,
          status: 'COMPLETED',
        },
      },
      select: { salesInvoiceId: true, amount: true },
    })
    const paidMap: Record<string, number> = {}
    for (const p of payments) {
      paidMap[p.salesInvoiceId] = (paidMap[p.salesInvoiceId] ?? 0) + Number(p.amount)
    }
    const items = invoices.map((inv) => {
      const paid = paidMap[inv.id] ?? 0
      const remaining = Number(inv.grandTotal) - paid
      const dueDate = new Date(inv.dueDate!)
      const diffDays = Math.floor((asOfDate.getTime() - dueDate.getTime()) / 86400000)
      const bucket = diffDays <= 0 ? 'current' : diffDays <= 30 ? '1-30' : diffDays <= 60 ? '31-60' : diffDays <= 90 ? '61-90' : '90+'
      return {
        invoiceId: inv.id,
        documentNumber: inv.documentNumber,
        customer: inv.customer,
        invoiceDate: inv.invoiceDate,
        dueDate: inv.dueDate,
        grandTotal: Number(inv.grandTotal),
        paid,
        remaining,
        daysOverdue: diffDays > 0 ? diffDays : 0,
        bucket,
      }
    })
    return items
  }

  async apAging(tenant: TenantContext, asOf?: string) {
    const asOfDate = asOf ? new Date(asOf) : new Date()
    const invoices = await this.prisma.purchaseInvoice.findMany({
      where: {
        companyId: tenant.companyId,
        deletedAt: null,
        status: 'COMPLETED',
        dueDate: { not: null },
      },
      select: {
        id: true,
        documentNumber: true,
        invoiceDate: true,
        dueDate: true,
        grandTotal: true,
        supplier: { select: { id: true, code: true, name: true } },
      },
      orderBy: [{ supplier: { name: 'asc' } }, { dueDate: 'asc' }],
    })
    const payments = await this.prisma.supplierPaymentAllocation.findMany({
      where: {
        supplierPayment: {
          companyId: tenant.companyId,
          deletedAt: null,
          status: 'COMPLETED',
        },
      },
      select: { purchaseInvoiceId: true, amount: true },
    })
    const paidMap: Record<string, number> = {}
    for (const p of payments) {
      paidMap[p.purchaseInvoiceId] = (paidMap[p.purchaseInvoiceId] ?? 0) + Number(p.amount)
    }
    const items = invoices.map((inv) => {
      const paid = paidMap[inv.id] ?? 0
      const remaining = Number(inv.grandTotal) - paid
      const dueDate = new Date(inv.dueDate!)
      const diffDays = Math.floor((asOfDate.getTime() - dueDate.getTime()) / 86400000)
      const bucket = diffDays <= 0 ? 'current' : diffDays <= 30 ? '1-30' : diffDays <= 60 ? '31-60' : diffDays <= 90 ? '61-90' : '90+'
      return {
        invoiceId: inv.id,
        documentNumber: inv.documentNumber,
        supplier: inv.supplier,
        invoiceDate: inv.invoiceDate,
        dueDate: inv.dueDate,
        grandTotal: Number(inv.grandTotal),
        paid,
        remaining,
        daysOverdue: diffDays > 0 ? diffDays : 0,
        bucket,
      }
    })
    return items
  }
}
