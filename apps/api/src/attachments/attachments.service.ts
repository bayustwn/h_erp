import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common'
import { createHash, randomUUID } from 'node:crypto'
import type { TenantContext } from '../access-control/access-control.types.js'
import { AuditService } from '../audit/audit.service.js'
import {
  createPaginationMeta,
  getPaginationSkipTake,
} from '../common/pagination/pagination.js'
import { PrismaService } from '../prisma/prisma.service.js'
import { StorageService } from '../storage/storage.service.js'
import type {
  AttachmentDownloadQuery,
  AttachmentsQuery,
  UploadAttachmentInput,
} from './attachments.schemas.js'

const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024

export type MulterUploadedFile = {
  originalname: string
  mimetype: string
  size: number
  buffer: Buffer
}

@Injectable()
export class AttachmentsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(StorageService) private readonly storage: StorageService,
    @Inject(AuditService) private readonly auditService: AuditService,
  ) {}

  async list(query: AttachmentsQuery, tenant: TenantContext) {
    this.assertBranchScope(query.branchId, tenant)

    const pagination = { page: query.page, pageSize: query.pageSize }
    const where = {
      companyId: tenant.companyId,
      branchId: query.branchId ?? tenant.branchId,
      entityType: query.entityType,
      entityId: query.entityId,
      deletedAt: null,
    }
    const [items, total] = await Promise.all([
      this.prisma.attachment.findMany({
        where,
        ...getPaginationSkipTake(pagination),
        orderBy: { createdAt: 'desc' },
        select: this.attachmentSelect(),
      }),
      this.prisma.attachment.count({ where }),
    ])

    return {
      items: items.map((item) => this.toResponse(item)),
      meta: createPaginationMeta(pagination, total),
    }
  }

  async upload(
    input: UploadAttachmentInput,
    file: MulterUploadedFile | undefined,
    tenant: TenantContext,
    actorUserId: string,
  ) {
    this.assertFile(file)
    this.assertBranchScope(input.branchId, tenant)
    await this.assertBranchBelongsToCompany(input.branchId, tenant)

    const checksum = this.createChecksum(file.buffer)
    const objectPath = this.createObjectPath({
      companyId: tenant.companyId,
      entityType: input.entityType,
      entityId: input.entityId,
      originalName: file.originalname,
    })

    const stored = await this.storage.putObject({
      objectPath,
      contentType: file.mimetype,
      body: file.buffer,
      checksum,
    })

    const attachment = await this.prisma.$transaction(async (tx) => {
      const created = await tx.attachment.create({
        data: {
          companyId: tenant.companyId,
          branchId: input.branchId ?? tenant.branchId,
          entityType: input.entityType,
          entityId: input.entityId,
          bucket: stored.bucket,
          objectPath: stored.objectPath,
          originalName: file.originalname,
          mimeType: file.mimetype,
          sizeBytes: BigInt(file.size),
          checksum,
          uploadedById: actorUserId,
        },
        select: this.attachmentSelect(),
      })

      await this.auditService.recordCreate(
        {
          tenant: { companyId: tenant.companyId, branchId: input.branchId },
          actorUserId,
          entityType: 'attachment',
          entityId: created.id,
          newValues: this.toResponse(created),
        },
        tx,
      )

      return created
    })

    return this.toResponse(attachment)
  }

  async createDownloadUrl(
    id: string,
    query: AttachmentDownloadQuery,
    tenant: TenantContext,
  ) {
    const attachment = await this.getAttachmentRecord(id, tenant)
    const url = await this.storage.createSignedGetUrl({
      objectPath: attachment.objectPath,
      expiresInSeconds: query.expiresInSeconds,
    })

    return {
      id: attachment.id,
      url,
      expiresInSeconds: query.expiresInSeconds,
    }
  }

  async delete(id: string, tenant: TenantContext, actorUserId: string) {
    const attachment = await this.getAttachmentRecord(id, tenant)
    const deleted = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.attachment.update({
        where: { id },
        data: { deletedAt: new Date() },
        select: this.attachmentSelect(),
      })

      await this.auditService.recordDelete(
        {
          tenant: {
            companyId: tenant.companyId,
            branchId: attachment.branchId ?? undefined,
          },
          actorUserId,
          entityType: 'attachment',
          entityId: attachment.id,
          oldValues: this.toResponse(attachment),
          newValues: this.toResponse(updated),
        },
        tx,
      )

      return updated
    })

    return this.toResponse(deleted)
  }

  private async getAttachmentRecord(id: string, tenant: TenantContext) {
    const attachment = await this.prisma.attachment.findFirst({
      where: {
        id,
        companyId: tenant.companyId,
        branchId: tenant.branchId,
        deletedAt: null,
      },
      select: this.attachmentSelect(),
    })

    if (!attachment) throw new NotFoundException('Attachment not found')
    return attachment
  }

  private assertFile(
    file: MulterUploadedFile | undefined,
  ): asserts file is MulterUploadedFile {
    if (!file) throw new BadRequestException('File is required')
    if (!file.buffer?.length) throw new BadRequestException('File is empty')
    if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
      throw new BadRequestException('File size exceeds 10MB limit')
    }
  }

  private assertBranchScope(branchId: string | undefined, tenant: TenantContext) {
    if (tenant.branchId && branchId && branchId !== tenant.branchId) {
      throw new ForbiddenException('Branch is outside current tenant scope')
    }
  }

  private async assertBranchBelongsToCompany(
    branchId: string | undefined,
    tenant: TenantContext,
  ) {
    if (!branchId) return
    const branch = await this.prisma.branch.findFirst({
      where: {
        id: branchId,
        companyId: tenant.companyId,
        deletedAt: null,
      },
      select: { id: true },
    })

    if (!branch) throw new UnprocessableEntityException('Branch is invalid')
  }

  private createChecksum(buffer: Buffer) {
    return createHash('sha256').update(buffer).digest('base64')
  }

  private createObjectPath(input: {
    companyId: string
    entityType: string
    entityId: string
    originalName: string
  }) {
    const extension = this.getSafeExtension(input.originalName)
    const fileName = `${randomUUID()}${extension}`
    return [
      'companies',
      input.companyId,
      input.entityType,
      input.entityId,
      fileName,
    ].join('/')
  }

  private getSafeExtension(originalName: string) {
    const match = originalName.toLowerCase().match(/\.[a-z0-9]{1,12}$/)
    return match?.[0] ?? ''
  }

  private toResponse<T extends { sizeBytes: bigint }>(attachment: T) {
    return {
      ...attachment,
      sizeBytes: attachment.sizeBytes.toString(),
      publicUrl: this.storage.createPublicUrl(
        (attachment as T & { objectPath: string }).objectPath,
      ),
    }
  }

  private attachmentSelect() {
    return {
      id: true,
      companyId: true,
      branchId: true,
      entityType: true,
      entityId: true,
      bucket: true,
      objectPath: true,
      originalName: true,
      mimeType: true,
      sizeBytes: true,
      checksum: true,
      uploadedById: true,
      createdAt: true,
      deletedAt: true,
      branch: { select: { id: true, code: true, name: true } },
      uploadedBy: { select: { id: true, email: true, fullName: true } },
    }
  }
}
