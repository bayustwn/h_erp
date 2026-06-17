import { PriceListType, RecordStatus } from '../generated/prisma/enums.js'
import { z } from 'zod'

const optionalString = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().trim().optional(),
)

export const priceListsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  search: optionalString,
  status: z.enum(RecordStatus).optional(),
  type: z.enum(PriceListType).optional(),
})

export const createPriceListSchema = z.object({
  code: z.string().trim().min(1).max(50).transform((value) => value.toUpperCase()),
  name: z.string().trim().min(1).max(255),
  description: optionalString,
  type: z.enum(PriceListType).default('SALES'),
  isDefault: z.boolean().default(false),
})

export const updatePriceListSchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  description: optionalString,
  type: z.enum(PriceListType).optional(),
  isDefault: z.boolean().optional(),
}).refine((value) => Object.keys(value).length > 0, { message: 'At least one field is required' })

export const updatePriceListStatusSchema = z.object({
  status: z.enum(RecordStatus),
})

export const priceListItemsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  search: optionalString,
})

export const createPriceListItemSchema = z.object({
  itemId: z.string().uuid(),
  unitId: z.string().uuid(),
  unitPrice: z.coerce.number().min(0),
  minQuantity: z.coerce.number().min(0).optional(),
})

export const updatePriceListItemSchema = z.object({
  unitPrice: z.coerce.number().min(0).optional(),
  minQuantity: z.coerce.number().min(0).optional(),
}).refine((value) => Object.keys(value).length > 0, { message: 'At least one field is required' })

export type PriceListsQuery = z.infer<typeof priceListsQuerySchema>
export type CreatePriceListInput = z.infer<typeof createPriceListSchema>
export type UpdatePriceListInput = z.infer<typeof updatePriceListSchema>
export type UpdatePriceListStatusInput = z.infer<typeof updatePriceListStatusSchema>
export type PriceListItemsQuery = z.infer<typeof priceListItemsQuerySchema>
export type CreatePriceListItemInput = z.infer<typeof createPriceListItemSchema>
export type UpdatePriceListItemInput = z.infer<typeof updatePriceListItemSchema>
