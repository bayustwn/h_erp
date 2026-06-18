import { DocumentStatus } from '../generated/prisma/enums.js'
import { z } from 'zod'

const optionalString = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().trim().optional(),
)

export const salesReturnQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  search: optionalString,
  status: z.enum(DocumentStatus).optional(),
  customerId: z.string().uuid().optional(),
})

export const salesReturnItemSchema = z.object({
  itemId: z.string().uuid(),
  unitId: z.string().uuid(),
  quantity: z.coerce.number().min(0),
  unitPrice: z.coerce.number().min(0),
  totalPrice: z.coerce.number().min(0),
  notes: optionalString,
})

export const createSalesReturnSchema = z.object({
  customerId: z.string().uuid(),
  salesInvoiceId: z.string().uuid().optional(),
  branchId: z.string().uuid().optional(),
  documentNumber: z.string().trim().min(1).max(50),
  returnDate: z.string().optional(),
  totalAmount: z.coerce.number().min(0),
  notes: optionalString,
  items: z.array(salesReturnItemSchema).min(1),
})

export const updateSalesReturnStatusSchema = z.object({
  status: z.enum(DocumentStatus),
})

export type SalesReturnQuery = z.infer<typeof salesReturnQuerySchema>
export type CreateSalesReturnInput = z.infer<typeof createSalesReturnSchema>
export type UpdateSalesReturnStatusInput = z.infer<typeof updateSalesReturnStatusSchema>
