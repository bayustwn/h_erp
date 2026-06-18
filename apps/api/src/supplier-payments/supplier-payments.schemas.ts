import { DocumentStatus } from '../generated/prisma/enums.js'
import { z } from 'zod'

const optionalString = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().trim().optional(),
)

export const supplierPaymentQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  search: optionalString,
  status: z.enum(DocumentStatus).optional(),
  supplierId: z.string().uuid().optional(),
})

export const paymentAllocationSchema = z.object({
  purchaseInvoiceId: z.string().uuid(),
  amount: z.coerce.number().min(0),
})

export const createSupplierPaymentSchema = z.object({
  supplierId: z.string().uuid(),
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

export const updateSupplierPaymentStatusSchema = z.object({
  status: z.enum(DocumentStatus),
})

export type SupplierPaymentQuery = z.infer<typeof supplierPaymentQuerySchema>
export type CreateSupplierPaymentInput = z.infer<typeof createSupplierPaymentSchema>
export type UpdateSupplierPaymentStatusInput = z.infer<typeof updateSupplierPaymentStatusSchema>
