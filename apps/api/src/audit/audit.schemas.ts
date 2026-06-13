import { AuditAction } from '../generated/prisma/enums.js'
import { z } from 'zod'

const uuidSchema = z.uuid()
const optionalString = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().trim().optional(),
)

export const auditLogsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  branchId: uuidSchema.optional(),
  actorUserId: uuidSchema.optional(),
  action: z.enum(AuditAction).optional(),
  entityType: optionalString,
  entityId: uuidSchema.optional(),
})

export type AuditLogsQuery = z.infer<typeof auditLogsQuerySchema>
