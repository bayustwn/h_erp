import { RecordStatus } from '../generated/prisma/enums.js'
import { z } from 'zod'

const uuidSchema = z.uuid()
const optionalString = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().trim().optional(),
)

export const warehousesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  search: optionalString,
  branchId: uuidSchema.optional(),
  status: z.enum(RecordStatus).optional(),
})

export const createWarehouseSchema = z.object({
  branchId: uuidSchema.optional(),
  code: z
    .string()
    .trim()
    .min(1)
    .max(50)
    .transform((value) => value.toUpperCase()),
  name: z.string().trim().min(1).max(255),
  address: optionalString,
})

export const updateWarehouseSchema = z
  .object({
    branchId: uuidSchema.optional().nullable(),
    name: z.string().trim().min(1).max(255).optional(),
    address: optionalString,
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  })

export const updateWarehouseStatusSchema = z.object({
  status: z.enum(RecordStatus),
})

export type WarehousesQuery = z.infer<typeof warehousesQuerySchema>
export type CreateWarehouseInput = z.infer<typeof createWarehouseSchema>
export type UpdateWarehouseInput = z.infer<typeof updateWarehouseSchema>
export type UpdateWarehouseStatusInput = z.infer<typeof updateWarehouseStatusSchema>
