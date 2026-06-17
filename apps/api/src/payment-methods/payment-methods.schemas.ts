import { RecordStatus } from '../generated/prisma/enums.js'
import { z } from 'zod'

const optionalString = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().trim().optional(),
)

export const paymentMethodsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  search: optionalString,
  status: z.enum(RecordStatus).optional(),
})

export const createPaymentMethodSchema = z.object({
  code: z.string().trim().min(1).max(50).transform((value) => value.toUpperCase()),
  name: z.string().trim().min(1).max(255),
  description: optionalString,
  isDefault: z.boolean().default(false),
})

export const updatePaymentMethodSchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  description: optionalString,
  isDefault: z.boolean().optional(),
}).refine((value) => Object.keys(value).length > 0, { message: 'At least one field is required' })

export const updatePaymentMethodStatusSchema = z.object({
  status: z.enum(RecordStatus),
})

export type PaymentMethodsQuery = z.infer<typeof paymentMethodsQuerySchema>
export type CreatePaymentMethodInput = z.infer<typeof createPaymentMethodSchema>
export type UpdatePaymentMethodInput = z.infer<typeof updatePaymentMethodSchema>
export type UpdatePaymentMethodStatusInput = z.infer<typeof updatePaymentMethodStatusSchema>
