import { JournalEntryStatus } from '../generated/prisma/enums.js'
import { z } from 'zod'

const optionalString = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().trim().optional(),
)

export const journalEntryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  search: optionalString,
  status: z.enum(JournalEntryStatus).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
})

export const journalEntryLineSchema = z.object({
  accountId: z.string().uuid(),
  debit: z.coerce.number().min(0).default(0),
  credit: z.coerce.number().min(0).default(0),
  description: optionalString,
})

export const createJournalEntrySchema = z.object({
  branchId: z.string().uuid().optional(),
  documentNumber: z.string().trim().min(1).max(50),
  entryDate: z.string().optional(),
  description: optionalString,
  referenceType: optionalString,
  referenceId: optionalString,
  lines: z.array(journalEntryLineSchema).min(2),
}).refine(
  (data) => {
    const totalDebit = data.lines.reduce((sum, l) => sum + l.debit, 0)
    const totalCredit = data.lines.reduce((sum, l) => sum + l.credit, 0)
    return Math.abs(totalDebit - totalCredit) < 0.001
  },
  { message: 'Total debit must equal total credit' },
).refine(
  (data) => data.lines.every((l) => (l.debit > 0) !== (l.credit > 0)),
  { message: 'Each line must have either debit or credit, not both' },
)

export const updateJournalEntryStatusSchema = z.object({
  status: z.enum(JournalEntryStatus),
})

export type JournalEntryQuery = z.infer<typeof journalEntryQuerySchema>
export type CreateJournalEntryInput = z.infer<typeof createJournalEntrySchema>
export type UpdateJournalEntryStatusInput = z.infer<typeof updateJournalEntryStatusSchema>
