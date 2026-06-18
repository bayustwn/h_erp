import { DocumentStatus } from '../generated/prisma/enums.js'
import { z } from 'zod'

const optionalString = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().trim().optional(),
)

export const deliveryOrderQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  search: optionalString,
  status: z.enum(DocumentStatus).optional(),
  salesOrderId: z.string().uuid().optional(),
  warehouseId: z.string().uuid().optional(),
})

export const deliveryOrderItemSchema = z.object({
  salesOrderItemId: z.string().uuid().optional(),
  itemId: z.string().uuid(),
  unitId: z.string().uuid(),
  quantity: z.coerce.number().min(0),
  notes: optionalString,
})

export const createDeliveryOrderSchema = z.object({
  salesOrderId: z.string().uuid().optional(),
  warehouseId: z.string().uuid(),
  branchId: z.string().uuid().optional(),
  documentNumber: z.string().trim().min(1).max(50),
  deliveryDate: z.string().optional(),
  notes: optionalString,
  items: z.array(deliveryOrderItemSchema).min(1),
})

export const updateDeliveryOrderSchema = z.object({
  warehouseId: z.string().uuid().optional(),
  branchId: z.string().uuid().optional(),
  notes: optionalString,
  items: z.array(deliveryOrderItemSchema).min(1).optional(),
}).refine((value) => Object.keys(value).length > 0, { message: 'At least one field is required' })

export const updateDeliveryOrderStatusSchema = z.object({
  status: z.enum(DocumentStatus),
})

export type DeliveryOrderQuery = z.infer<typeof deliveryOrderQuerySchema>
export type CreateDeliveryOrderInput = z.infer<typeof createDeliveryOrderSchema>
export type UpdateDeliveryOrderInput = z.infer<typeof updateDeliveryOrderSchema>
export type UpdateDeliveryOrderStatusInput = z.infer<typeof updateDeliveryOrderStatusSchema>
