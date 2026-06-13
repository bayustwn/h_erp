import { ResetPolicy } from '../generated/prisma/enums.js'
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
})

const documentTypeSchema = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .regex(/^[A-Z0-9_.-]+$/i)
  .transform((value) => value.toUpperCase())

const periodFormatSchema = z
  .string()
  .trim()
  .min(1)
  .max(50)
  .regex(/^[YMD/_.-]+$/i)
  .transform((value) => value.toUpperCase())

export const documentSequencesQuerySchema = paginatedQuerySchema.extend({
  branchId: uuidSchema.optional(),
  documentType: documentTypeSchema.optional(),
  isActive: z.coerce.boolean().optional(),
})

export const createDocumentSequenceSchema = z.object({
  branchId: uuidSchema.optional(),
  documentType: documentTypeSchema,
  prefix: z.string().trim().min(1).max(100),
  periodFormat: periodFormatSchema.default('YYYY/MM/'),
  nextNumber: z.coerce.number().int().min(1).max(2_147_483_647).default(1),
  padding: z.coerce.number().int().min(1).max(12).default(5),
  resetPolicy: z.enum(ResetPolicy).default(ResetPolicy.MONTHLY),
  isActive: z.boolean().default(true),
})

export const updateDocumentSequenceSchema = z
  .object({
    branchId: uuidSchema.optional().nullable(),
    prefix: z.string().trim().min(1).max(100).optional(),
    periodFormat: periodFormatSchema.optional(),
    nextNumber: z.coerce.number().int().min(1).max(2_147_483_647).optional(),
    padding: z.coerce.number().int().min(1).max(12).optional(),
    resetPolicy: z.enum(ResetPolicy).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  })

export const generateDocumentNumberSchema = z.object({
  branchId: uuidSchema.optional(),
  documentType: documentTypeSchema,
  documentDate: z.coerce.date().default(() => new Date()),
})

export type DocumentSequencesQuery = z.infer<typeof documentSequencesQuerySchema>
export type CreateDocumentSequenceInput = z.infer<typeof createDocumentSequenceSchema>
export type UpdateDocumentSequenceInput = z.infer<typeof updateDocumentSequenceSchema>
export type GenerateDocumentNumberInput = z.infer<typeof generateDocumentNumberSchema>
