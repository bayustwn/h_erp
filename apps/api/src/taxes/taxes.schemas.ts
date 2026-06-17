import { RecordStatus } from '../generated/prisma/enums.js'
import { z } from 'zod'

const optionalString = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().trim().optional(),
)

export const taxesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  search: optionalString,
  status: z.enum(RecordStatus).optional(),
})

export const createTaxSchema = z.object({
  code: z.string().trim().min(1).max(50).transform((value) => value.toUpperCase()),
  name: z.string().trim().min(1).max(255),
  description: optionalString,
  rate: z.coerce.number().min(0).max(100),
  isDefault: z.boolean().default(false),
})

export const updateTaxSchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  description: optionalString,
  rate: z.coerce.number().min(0).max(100).optional(),
  isDefault: z.boolean().optional(),
}).refine((value) => Object.keys(value).length > 0, { message: 'At least one field is required' })

export const updateTaxStatusSchema = z.object({
  status: z.enum(RecordStatus),
})

export type TaxesQuery = z.infer<typeof taxesQuerySchema>
export type CreateTaxInput = z.infer<typeof createTaxSchema>
export type UpdateTaxInput = z.infer<typeof updateTaxSchema>
export type UpdateTaxStatusInput = z.infer<typeof updateTaxStatusSchema>
