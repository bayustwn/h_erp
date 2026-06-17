import { RecordStatus } from '../generated/prisma/enums.js'
import { z } from 'zod'

const optionalString = z.preprocess((value) => (value === '' ? undefined : value), z.string().trim().optional())

export const bankAccountsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  search: optionalString,
  status: z.enum(RecordStatus).optional(),
})

export const createBankAccountSchema = z.object({
  code: z.string().trim().min(1).max(50).transform((v) => v.toUpperCase()),
  name: z.string().trim().min(1).max(255),
  bankName: z.string().trim().min(1).max(255),
  accountNumber: z.string().trim().min(1).max(100),
  accountName: z.string().trim().min(1).max(255),
  currency: z.string().length(3).default('IDR'),
  description: optionalString,
  isDefault: z.boolean().default(false),
})

export const updateBankAccountSchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  bankName: z.string().trim().min(1).max(255).optional(),
  accountNumber: z.string().trim().min(1).max(100).optional(),
  accountName: z.string().trim().min(1).max(255).optional(),
  currency: z.string().length(3).optional(),
  description: optionalString,
  isDefault: z.boolean().optional(),
}).refine((v) => Object.keys(v).length > 0, { message: 'At least one field is required' })

export const updateBankAccountStatusSchema = z.object({ status: z.enum(RecordStatus) })

export type BankAccountsQuery = z.infer<typeof bankAccountsQuerySchema>
export type CreateBankAccountInput = z.infer<typeof createBankAccountSchema>
export type UpdateBankAccountInput = z.infer<typeof updateBankAccountSchema>
export type UpdateBankAccountStatusInput = z.infer<typeof updateBankAccountStatusSchema>
