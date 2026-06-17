import { z } from 'zod'

export const productAccountingMappingsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  itemCategoryId: z.string().uuid().optional(),
  itemId: z.string().uuid().optional(),
})

export const createProductAccountingMappingSchema = z.object({
  itemCategoryId: z.string().uuid().optional(),
  itemId: z.string().uuid().optional(),
  revenueAccountId: z.string().uuid().optional(),
  cogsAccountId: z.string().uuid().optional(),
  inventoryAccountId: z.string().uuid().optional(),
  purchaseAccountId: z.string().uuid().optional(),
}).refine((v) => v.itemCategoryId || v.itemId, { message: 'Either itemCategoryId or itemId is required' })

export const updateProductAccountingMappingSchema = z.object({
  revenueAccountId: z.string().uuid().optional().nullable(),
  cogsAccountId: z.string().uuid().optional().nullable(),
  inventoryAccountId: z.string().uuid().optional().nullable(),
  purchaseAccountId: z.string().uuid().optional().nullable(),
}).refine((v) => Object.keys(v).length > 0, { message: 'At least one field is required' })

export type ProductAccountingMappingsQuery = z.infer<typeof productAccountingMappingsQuerySchema>
export type CreateProductAccountingMappingInput = z.infer<typeof createProductAccountingMappingSchema>
export type UpdateProductAccountingMappingInput = z.infer<typeof updateProductAccountingMappingSchema>
