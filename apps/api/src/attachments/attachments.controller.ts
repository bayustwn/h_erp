import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import type { TenantContext } from '../access-control/access-control.types.js'
import { PermissionGuard } from '../access-control/permission.guard.js'
import { RequirePermissions } from '../access-control/permissions.decorator.js'
import { CurrentTenant, RequireTenant } from '../access-control/tenant.decorator.js'
import { TenantGuard } from '../access-control/tenant.guard.js'
import { AuthGuard } from '../auth/auth.guard.js'
import type { AuthenticatedUser } from '../auth/auth.types.js'
import { CurrentUser } from '../auth/current-user.decorator.js'
import { ZodValidationPipe } from '../common/validation/zod-validation.pipe.js'
import {
  attachmentDownloadQuerySchema,
  attachmentsQuerySchema,
  uploadAttachmentSchema,
  type AttachmentDownloadQuery,
  type AttachmentsQuery,
  type UploadAttachmentInput,
} from './attachments.schemas.js'
import {
  AttachmentsService,
  type MulterUploadedFile,
} from './attachments.service.js'

@Controller('attachments')
@UseGuards(AuthGuard, TenantGuard, PermissionGuard)
@RequireTenant()
export class AttachmentsController {
  constructor(
    @Inject(AttachmentsService)
    private readonly attachmentsService: AttachmentsService,
  ) {}

  @Get()
  @RequirePermissions('attachment.read')
  list(
    @Query(new ZodValidationPipe(attachmentsQuerySchema)) query: AttachmentsQuery,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.attachmentsService.list(query, tenant)
  }

  @Post()
  @RequirePermissions('attachment.create')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  upload(
    @Body(new ZodValidationPipe(uploadAttachmentSchema)) body: UploadAttachmentInput,
    @UploadedFile() file: MulterUploadedFile | undefined,
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.attachmentsService.upload(body, file, tenant, user.id)
  }

  @Get(':id/download-url')
  @RequirePermissions('attachment.read')
  createDownloadUrl(
    @Param('id', ParseUUIDPipe) id: string,
    @Query(new ZodValidationPipe(attachmentDownloadQuerySchema))
    query: AttachmentDownloadQuery,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.attachmentsService.createDownloadUrl(id, query, tenant)
  }

  @Delete(':id')
  @RequirePermissions('attachment.delete')
  delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.attachmentsService.delete(id, tenant, user.id)
  }
}
