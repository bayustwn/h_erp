import { RecordStatus } from '../generated/prisma/enums.js'
import { z } from 'zod'

const optionalString = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().trim().optional(),
)

export const branchesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  search: optionalString,
  status: z.enum(RecordStatus).optional(),
})

export const createBranchSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1)
    .max(50)
    .transform((value) => value.toUpperCase()),
  name: z.string().trim().min(1).max(255),
  email: z
    .email()
    .optional()
    .or(z.literal('').transform(() => undefined)),
  phone: optionalString,
  address: optionalString,
})

export const updateBranchSchema = z
  .object({
    name: z.string().trim().min(1).max(255).optional(),
    email: z
      .email()
      .optional()
      .or(z.literal('').transform(() => undefined)),
    phone: optionalString,
    address: optionalString,
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  })

export const updateBranchStatusSchema = z.object({
  status: z.enum(RecordStatus),
})

export type BranchesQuery = z.infer<typeof branchesQuerySchema>
export type CreateBranchInput = z.infer<typeof createBranchSchema>
export type UpdateBranchInput = z.infer<typeof updateBranchSchema>
export type UpdateBranchStatusInput = z.infer<typeof updateBranchStatusSchema>
