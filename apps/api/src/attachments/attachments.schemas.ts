import { z } from 'zod'
import { paginationQuerySchema } from '../common/pagination/pagination.js'

export const attachmentEntityTypeSchema = z
  .string()
  .trim()
  .min(2)
  .max(100)
  .regex(/^[a-z][a-z0-9_.-]*$/)

export const attachmentsQuerySchema = paginationQuerySchema.extend({
  branchId: z.uuid().optional(),
  entityType: attachmentEntityTypeSchema.optional(),
  entityId: z.uuid().optional(),
})

export const uploadAttachmentSchema = z.object({
  branchId: z.uuid().optional(),
  entityType: attachmentEntityTypeSchema,
  entityId: z.uuid(),
})

export const attachmentDownloadQuerySchema = z.object({
  expiresInSeconds: z.coerce.number().int().min(60).max(3600).default(300),
})

export type AttachmentsQuery = z.infer<typeof attachmentsQuerySchema>
export type UploadAttachmentInput = z.infer<typeof uploadAttachmentSchema>
export type AttachmentDownloadQuery = z.infer<typeof attachmentDownloadQuerySchema>

