import { AccessScope, RecordStatus } from '../generated/prisma/enums.js'
import { z } from 'zod'

const uuidSchema = z.uuid()
const optionalString = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().trim().optional(),
)

export const usersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  search: optionalString,
  status: z.enum(RecordStatus).optional(),
})

export const createUserSchema = z.object({
  email: z.email().transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(128),
  fullName: z.string().trim().min(1).max(255),
  phone: optionalString,
  roleIds: z.array(uuidSchema).default([]),
  companyAccessScope: z.enum(AccessScope).default(AccessScope.COMPANY),
  branchAccess: z
    .array(
      z.object({
        branchId: uuidSchema,
        accessScope: z.enum(AccessScope).default(AccessScope.BRANCH),
      }),
    )
    .default([]),
})

export const updateUserSchema = z
  .object({
    fullName: z.string().trim().min(1).max(255).optional(),
    phone: optionalString,
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  })

export const updateUserStatusSchema = z.object({
  status: z.enum(RecordStatus),
})

export const updateUserRolesSchema = z.object({
  roleIds: z.array(uuidSchema),
})

export const updateUserCompanyAccessSchema = z.object({
  accessScope: z.enum(AccessScope),
})

export const updateUserBranchAccessSchema = z.object({
  branches: z.array(
    z.object({
      branchId: uuidSchema,
      accessScope: z.enum(AccessScope).default(AccessScope.BRANCH),
    }),
  ),
})

export type UsersQuery = z.infer<typeof usersQuerySchema>
export type CreateUserInput = z.infer<typeof createUserSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>
export type UpdateUserStatusInput = z.infer<typeof updateUserStatusSchema>
export type UpdateUserRolesInput = z.infer<typeof updateUserRolesSchema>
export type UpdateUserCompanyAccessInput = z.infer<typeof updateUserCompanyAccessSchema>
export type UpdateUserBranchAccessInput = z.infer<typeof updateUserBranchAccessSchema>
