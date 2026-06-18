import { DocumentStatus } from '../generated/prisma/enums.js'
import { z } from 'zod'

const optionalString = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().trim().optional(),
)

export const salesOrderQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  search: optionalString,
  status: z.enum(DocumentStatus).optional(),
  customerId: z.string().uuid().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
})

export const salesOrderItemSchema = z.object({
  itemId: z.string().uuid(),
  unitId: z.string().uuid(),
  quantity: z.coerce.number().min(0),
  unitPrice: z.coerce.number().min(0),
  discountPercent: z.coerce.number().min(0).max(100).optional(),
  discountAmount: z.coerce.number().min(0).optional(),
  taxId: z.string().uuid().optional(),
  taxRate: z.coerce.number().min(0).optional(),
  taxAmount: z.coerce.number().min(0).optional(),
  totalPrice: z.coerce.number().min(0),
  notes: optionalString,
})

export const createSalesOrderSchema = z.object({
  customerId: z.string().uuid(),
  branchId: z.string().uuid().optional(),
  documentNumber: z.string().trim().min(1).max(50),
  referenceNumber: optionalString,
  orderDate: z.string().optional(),
  currency: z.string().length(3).default('IDR'),
  subtotal: z.coerce.number().min(0),
  discountTotal: z.coerce.number().min(0).default(0),
  taxTotal: z.coerce.number().min(0).default(0),
  grandTotal: z.coerce.number().min(0),
  notes: optionalString,
  items: z.array(salesOrderItemSchema).min(1),
})

export const updateSalesOrderSchema = z.object({
  customerId: z.string().uuid().optional(),
  branchId: z.string().uuid().optional(),
  referenceNumber: optionalString,
  orderDate: z.string().optional(),
  currency: z.string().length(3).optional(),
  subtotal: z.coerce.number().min(0).optional(),
  discountTotal: z.coerce.number().min(0).optional(),
  taxTotal: z.coerce.number().min(0).optional(),
  grandTotal: z.coerce.number().min(0).optional(),
  notes: optionalString,
  items: z.array(salesOrderItemSchema).min(1).optional(),
}).refine((value) => Object.keys(value).length > 0, { message: 'At least one field is required' })

export const updateSalesOrderStatusSchema = z.object({
  status: z.enum(DocumentStatus),
})

export type SalesOrderQuery = z.infer<typeof salesOrderQuerySchema>
export type CreateSalesOrderInput = z.infer<typeof createSalesOrderSchema>
export type UpdateSalesOrderInput = z.infer<typeof updateSalesOrderSchema>
export type UpdateSalesOrderStatusInput = z.infer<typeof updateSalesOrderStatusSchema>
