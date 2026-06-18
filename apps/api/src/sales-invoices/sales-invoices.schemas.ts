import { DocumentStatus } from '../generated/prisma/enums.js'
import { z } from 'zod'

const optionalString = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().trim().optional(),
)

export const salesInvoiceQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  search: optionalString,
  status: z.enum(DocumentStatus).optional(),
  customerId: z.string().uuid().optional(),
  salesOrderId: z.string().uuid().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
})

export const invoiceItemSchema = z.object({
  itemId: z.string().uuid(),
  unitId: z.string().uuid(),
  quantity: z.coerce.number().min(0),
  unitPrice: z.coerce.number().min(0),
  discountAmount: z.coerce.number().min(0).optional(),
  taxId: z.string().uuid().optional(),
  taxRate: z.coerce.number().min(0).optional(),
  taxAmount: z.coerce.number().min(0).optional(),
  totalPrice: z.coerce.number().min(0),
  notes: optionalString,
})

export const createSalesInvoiceSchema = z.object({
  customerId: z.string().uuid(),
  salesOrderId: z.string().uuid().optional(),
  branchId: z.string().uuid().optional(),
  documentNumber: z.string().trim().min(1).max(50).optional(),
  invoiceDate: z.string().optional(),
  dueDate: z.string().optional(),
  currency: z.string().length(3).default('IDR'),
  subtotal: z.coerce.number().min(0),
  discountTotal: z.coerce.number().min(0).default(0),
  taxTotal: z.coerce.number().min(0).default(0),
  grandTotal: z.coerce.number().min(0),
  notes: optionalString,
  items: z.array(invoiceItemSchema).min(1),
})

export const updateSalesInvoiceSchema = z.object({
  branchId: z.string().uuid().optional(),
  invoiceDate: z.string().optional(),
  dueDate: z.string().optional(),
  currency: z.string().length(3).optional(),
  subtotal: z.coerce.number().min(0).optional(),
  discountTotal: z.coerce.number().min(0).optional(),
  taxTotal: z.coerce.number().min(0).optional(),
  grandTotal: z.coerce.number().min(0).optional(),
  notes: optionalString,
  items: z.array(invoiceItemSchema).min(1).optional(),
}).refine((value) => Object.keys(value).length > 0, { message: 'At least one field is required' })

export const updateSalesInvoiceStatusSchema = z.object({
  status: z.enum(DocumentStatus),
})

export type SalesInvoiceQuery = z.infer<typeof salesInvoiceQuerySchema>
export type CreateSalesInvoiceInput = z.infer<typeof createSalesInvoiceSchema>
export type UpdateSalesInvoiceInput = z.infer<typeof updateSalesInvoiceSchema>
export type UpdateSalesInvoiceStatusInput = z.infer<typeof updateSalesInvoiceStatusSchema>
