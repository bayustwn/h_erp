import { AccountType, RecordStatus } from '../generated/prisma/enums.js'
import { z } from 'zod'

const optionalString = z.preprocess((value) => (value === '' ? undefined : value), z.string().trim().optional())

export const chartOfAccountsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  search: optionalString,
  status: z.enum(RecordStatus).optional(),
  type: z.enum(AccountType).optional(),
  parentId: z.string().uuid().optional(),
})

export const createChartOfAccountSchema = z.object({
  code: z.string().trim().min(1).max(50).transform((v) => v.toUpperCase()),
  name: z.string().trim().min(1).max(255),
  description: optionalString,
  type: z.enum(AccountType).default('ASSET'),
  parentId: z.string().uuid().optional(),
  isDefault: z.boolean().default(false),
})

export const updateChartOfAccountSchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  description: optionalString,
  type: z.enum(AccountType).optional(),
  parentId: z.string().uuid().optional().nullable(),
  isDefault: z.boolean().optional(),
}).refine((v) => Object.keys(v).length > 0, { message: 'At least one field is required' })

export const updateChartOfAccountStatusSchema = z.object({ status: z.enum(RecordStatus) })

export type ChartOfAccountsQuery = z.infer<typeof chartOfAccountsQuerySchema>
export type CreateChartOfAccountInput = z.infer<typeof createChartOfAccountSchema>
export type UpdateChartOfAccountInput = z.infer<typeof updateChartOfAccountSchema>
export type UpdateChartOfAccountStatusInput = z.infer<typeof updateChartOfAccountStatusSchema>
