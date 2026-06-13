import { StockMovementSourceType, StockMovementType } from '../generated/prisma/enums.js'
import { z } from 'zod'

const uuidSchema = z.uuid()
const optionalString = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().trim().optional(),
)

const paginatedQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
})

const quantitySchema = z.coerce.number().positive().max(999_999_999_999)

export const stockBalancesQuerySchema = paginatedQuerySchema.extend({
  warehouseId: uuidSchema.optional(),
  itemId: uuidSchema.optional(),
})

export const stockMovementsQuerySchema = paginatedQuerySchema.extend({
  warehouseId: uuidSchema.optional(),
  itemId: uuidSchema.optional(),
  movementType: z.enum(StockMovementType).optional(),
  sourceType: z.enum(StockMovementSourceType).optional(),
  sourceId: uuidSchema.optional(),
})

export const createStockAdjustmentSchema = z.object({
  warehouseId: uuidSchema,
  itemId: uuidSchema,
  direction: z.enum(['IN', 'OUT']),
  quantity: quantitySchema,
  notes: optionalString,
})

export const createStockTransferSchema = z
  .object({
    fromWarehouseId: uuidSchema,
    toWarehouseId: uuidSchema,
    itemId: uuidSchema,
    quantity: quantitySchema,
    notes: optionalString,
  })
  .refine((value) => value.fromWarehouseId !== value.toWarehouseId, {
    message: 'Source and destination warehouses must be different',
    path: ['toWarehouseId'],
  })

export type StockBalancesQuery = z.infer<typeof stockBalancesQuerySchema>
export type StockMovementsQuery = z.infer<typeof stockMovementsQuerySchema>
export type CreateStockAdjustmentInput = z.infer<typeof createStockAdjustmentSchema>
export type CreateStockTransferInput = z.infer<typeof createStockTransferSchema>
