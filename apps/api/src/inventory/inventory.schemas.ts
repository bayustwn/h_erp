import { InventoryItemType, RecordStatus } from '../generated/prisma/enums.js'
import { z } from 'zod'

const uuidSchema = z.uuid()
const optionalString = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().trim().optional(),
)

const paginatedQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  search: optionalString,
  status: z.enum(RecordStatus).optional(),
})

export const unitsQuerySchema = paginatedQuerySchema

export const createUnitSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1)
    .max(50)
    .transform((value) => value.toUpperCase()),
  name: z.string().trim().min(1).max(255),
  symbol: z.string().trim().min(1).max(50),
  decimalPlaces: z.coerce.number().int().min(0).max(6).default(0),
})

export const updateUnitSchema = z
  .object({
    name: z.string().trim().min(1).max(255).optional(),
    symbol: z.string().trim().min(1).max(50).optional(),
    decimalPlaces: z.coerce.number().int().min(0).max(6).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  })

export const categoriesQuerySchema = paginatedQuerySchema.extend({
  parentId: uuidSchema.optional(),
})

export const createCategorySchema = z.object({
  parentId: uuidSchema.optional(),
  code: z
    .string()
    .trim()
    .min(1)
    .max(50)
    .transform((value) => value.toUpperCase()),
  name: z.string().trim().min(1).max(255),
  description: optionalString,
})

export const updateCategorySchema = z
  .object({
    parentId: uuidSchema.optional().nullable(),
    name: z.string().trim().min(1).max(255).optional(),
    description: optionalString,
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  })

export const itemsQuerySchema = paginatedQuerySchema.extend({
  categoryId: uuidSchema.optional(),
  itemType: z.enum(InventoryItemType).optional(),
})

export const createItemSchema = z.object({
  categoryId: uuidSchema.optional(),
  baseUnitId: uuidSchema,
  sku: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .transform((value) => value.toUpperCase()),
  name: z.string().trim().min(1).max(255),
  description: optionalString,
  barcode: optionalString,
  itemType: z.enum(InventoryItemType).default(InventoryItemType.STOCK),
  trackInventory: z.boolean().default(true),
  isSellable: z.boolean().default(true),
  isPurchasable: z.boolean().default(true),
  minStock: z.coerce.number().min(0).optional(),
})

export const updateItemSchema = z
  .object({
    categoryId: uuidSchema.optional().nullable(),
    baseUnitId: uuidSchema.optional(),
    name: z.string().trim().min(1).max(255).optional(),
    description: optionalString,
    barcode: optionalString,
    itemType: z.enum(InventoryItemType).optional(),
    trackInventory: z.boolean().optional(),
    isSellable: z.boolean().optional(),
    isPurchasable: z.boolean().optional(),
    minStock: z.coerce.number().min(0).optional().nullable(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  })

export const updateStatusSchema = z.object({
  status: z.enum(RecordStatus),
})

export type UnitsQuery = z.infer<typeof unitsQuerySchema>
export type CreateUnitInput = z.infer<typeof createUnitSchema>
export type UpdateUnitInput = z.infer<typeof updateUnitSchema>
export type CategoriesQuery = z.infer<typeof categoriesQuerySchema>
export type CreateCategoryInput = z.infer<typeof createCategorySchema>
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>
export type ItemsQuery = z.infer<typeof itemsQuerySchema>
export type CreateItemInput = z.infer<typeof createItemSchema>
export type UpdateItemInput = z.infer<typeof updateItemSchema>
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>
