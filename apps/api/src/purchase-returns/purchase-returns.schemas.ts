import { DocumentStatus } from '../generated/prisma/enums.js'
import { z } from 'zod'

const optionalString = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().trim().optional(),
)

export const purchaseReturnQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  search: optionalString,
  status: z.enum(DocumentStatus).optional(),
  supplierId: z.string().uuid().optional(),
})

export const purchaseReturnItemSchema = z.object({
  itemId: z.string().uuid(),
  unitId: z.string().uuid(),
  quantity: z.coerce.number().min(0),
  unitPrice: z.coerce.number().min(0),
  totalPrice: z.coerce.number().min(0),
  notes: optionalString,
})

export const createPurchaseReturnSchema = z.object({
  supplierId: z.string().uuid(),
  purchaseInvoiceId: z.string().uuid().optional(),
  branchId: z.string().uuid().optional(),
  documentNumber: z.string().trim().min(1).max(50),
  returnDate: z.string().optional(),
  totalAmount: z.coerce.number().min(0),
  notes: optionalString,
  items: z.array(purchaseReturnItemSchema).min(1),
})

export const updatePurchaseReturnStatusSchema = z.object({
  status: z.enum(DocumentStatus),
})

export type PurchaseReturnQuery = z.infer<typeof purchaseReturnQuerySchema>
export type CreatePurchaseReturnInput = z.infer<typeof createPurchaseReturnSchema>
export type UpdatePurchaseReturnStatusInput = z.infer<typeof updatePurchaseReturnStatusSchema>
