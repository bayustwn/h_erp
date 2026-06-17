import { RecordStatus } from '../generated/prisma/enums.js'
import { z } from 'zod'

const optionalString = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().trim().optional(),
)

export const paymentTermsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  search: optionalString,
  status: z.enum(RecordStatus).optional(),
})

export const createPaymentTermSchema = z.object({
  code: z.string().trim().min(1).max(50).transform((value) => value.toUpperCase()),
  name: z.string().trim().min(1).max(255),
  description: optionalString,
  daysDue: z.coerce.number().int().min(0).default(0),
  isDefault: z.boolean().default(false),
})

export const updatePaymentTermSchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  description: optionalString,
  daysDue: z.coerce.number().int().min(0).optional(),
  isDefault: z.boolean().optional(),
}).refine((value) => Object.keys(value).length > 0, { message: 'At least one field is required' })

export const updatePaymentTermStatusSchema = z.object({
  status: z.enum(RecordStatus),
})

export type PaymentTermsQuery = z.infer<typeof paymentTermsQuerySchema>
export type CreatePaymentTermInput = z.infer<typeof createPaymentTermSchema>
export type UpdatePaymentTermInput = z.infer<typeof updatePaymentTermSchema>
export type UpdatePaymentTermStatusInput = z.infer<typeof updatePaymentTermStatusSchema>
