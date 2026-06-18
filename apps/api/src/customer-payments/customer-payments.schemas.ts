import { DocumentStatus } from '../generated/prisma/enums.js'
import { z } from 'zod'

const optionalString = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().trim().optional(),
)

export const customerPaymentQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  search: optionalString,
  status: z.enum(DocumentStatus).optional(),
  customerId: z.string().uuid().optional(),
})

export const paymentAllocationSchema = z.object({
  salesInvoiceId: z.string().uuid(),
  amount: z.coerce.number().min(0),
})

export const createCustomerPaymentSchema = z.object({
  customerId: z.string().uuid(),
  branchId: z.string().uuid().optional(),
  documentNumber: z.string().trim().min(1).max(50).optional(),
  paymentDate: z.string().optional(),
  paymentMethodId: z.string().uuid(),
  bankAccountId: z.string().uuid().optional(),
  amount: z.coerce.number().min(0),
  referenceNumber: optionalString,
  notes: optionalString,
  allocations: z.array(paymentAllocationSchema).min(1),
})

export const updateCustomerPaymentStatusSchema = z.object({
  status: z.enum(DocumentStatus),
})

export type CustomerPaymentQuery = z.infer<typeof customerPaymentQuerySchema>
export type CreateCustomerPaymentInput = z.infer<typeof createCustomerPaymentSchema>
export type UpdateCustomerPaymentStatusInput = z.infer<typeof updateCustomerPaymentStatusSchema>
