import { DocumentStatus } from '../generated/prisma/enums.js'
import { z } from 'zod'

const optionalString = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().trim().optional(),
)

export const landedCostQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  search: optionalString,
  status: z.enum(DocumentStatus).optional(),
  purchaseOrderId: z.string().uuid().optional(),
})

export const landedCostItemSchema = z.object({
  purchaseOrderItemId: z.string().uuid(),
  amount: z.coerce.number().min(0),
  description: optionalString,
})

export const createLandedCostSchema = z.object({
  purchaseOrderId: z.string().uuid(),
  branchId: z.string().uuid().optional(),
  documentNumber: z.string().trim().min(1).max(50).optional(),
  costDate: z.string().optional(),
  description: optionalString,
  totalCost: z.coerce.number().min(0),
  allocationMethod: z.enum(['BY_VALUE', 'BY_WEIGHT', 'BY_QTY']).default('BY_VALUE'),
  items: z.array(landedCostItemSchema).min(1),
})

export const updateLandedCostSchema = z.object({
  branchId: z.string().uuid().optional(),
  description: optionalString,
  totalCost: z.coerce.number().min(0).optional(),
  allocationMethod: z.enum(['BY_VALUE', 'BY_WEIGHT', 'BY_QTY']).optional(),
  items: z.array(landedCostItemSchema).min(1).optional(),
}).refine((value) => Object.keys(value).length > 0, { message: 'At least one field is required' })

export const updateLandedCostStatusSchema = z.object({
  status: z.enum(DocumentStatus),
})

export type LandedCostQuery = z.infer<typeof landedCostQuerySchema>
export type CreateLandedCostInput = z.infer<typeof createLandedCostSchema>
export type UpdateLandedCostInput = z.infer<typeof updateLandedCostSchema>
export type UpdateLandedCostStatusInput = z.infer<typeof updateLandedCostStatusSchema>
