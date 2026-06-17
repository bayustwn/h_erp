import { RecordStatus } from '../generated/prisma/enums.js'
import { z } from 'zod'

const optionalString = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().trim().optional(),
)

export const suppliersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  search: optionalString,
  status: z.enum(RecordStatus).optional(),
})

export const createSupplierSchema = z.object({
  code: z.string().trim().min(1).max(50).transform((value) => value.toUpperCase()),
  name: z.string().trim().min(1).max(255),
  phone: optionalString,
  email: z.string().email().optional().or(z.literal('').transform(() => undefined)),
  address: optionalString,
  taxNumber: optionalString,
  creditLimit: z.coerce.number().min(0).optional(),
  paymentTerm: optionalString,
})

export const updateSupplierSchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  phone: optionalString,
  email: z.string().email().optional().or(z.literal('').transform(() => undefined)),
  address: optionalString,
  taxNumber: optionalString,
  creditLimit: z.coerce.number().min(0).optional(),
  paymentTerm: optionalString,
}).refine((value) => Object.keys(value).length > 0, { message: 'At least one field is required' })

export const updateSupplierStatusSchema = z.object({
  status: z.enum(RecordStatus),
})

export type SuppliersQuery = z.infer<typeof suppliersQuerySchema>
export type CreateSupplierInput = z.infer<typeof createSupplierSchema>
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>
export type UpdateSupplierStatusInput = z.infer<typeof updateSupplierStatusSchema>
