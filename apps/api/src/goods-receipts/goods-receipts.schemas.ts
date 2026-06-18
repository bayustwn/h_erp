import { DocumentStatus } from '../generated/prisma/enums.js'
import { z } from 'zod'

const optionalString = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().trim().optional(),
)

export const goodsReceiptQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  search: optionalString,
  status: z.enum(DocumentStatus).optional(),
  purchaseOrderId: z.string().uuid().optional(),
  warehouseId: z.string().uuid().optional(),
})

export const goodsReceiptItemSchema = z.object({
  purchaseOrderItemId: z.string().uuid().optional(),
  itemId: z.string().uuid(),
  unitId: z.string().uuid(),
  quantity: z.coerce.number().min(0),
  notes: optionalString,
})

export const createGoodsReceiptSchema = z.object({
  purchaseOrderId: z.string().uuid().optional(),
  warehouseId: z.string().uuid(),
  branchId: z.string().uuid().optional(),
  documentNumber: z.string().trim().min(1).max(50),
  receiptDate: z.string().optional(),
  notes: optionalString,
  items: z.array(goodsReceiptItemSchema).min(1),
})

export const updateGoodsReceiptSchema = z.object({
  warehouseId: z.string().uuid().optional(),
  branchId: z.string().uuid().optional(),
  notes: optionalString,
  items: z.array(goodsReceiptItemSchema).min(1).optional(),
}).refine((value) => Object.keys(value).length > 0, { message: 'At least one field is required' })

export const updateGoodsReceiptStatusSchema = z.object({
  status: z.enum(DocumentStatus),
})

export type GoodsReceiptQuery = z.infer<typeof goodsReceiptQuerySchema>
export type CreateGoodsReceiptInput = z.infer<typeof createGoodsReceiptSchema>
export type UpdateGoodsReceiptInput = z.infer<typeof updateGoodsReceiptSchema>
export type UpdateGoodsReceiptStatusInput = z.infer<typeof updateGoodsReceiptStatusSchema>
