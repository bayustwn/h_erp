import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { ParseUUIDPipe } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
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
  createDocumentSequenceSchema,
  documentSequencesQuerySchema,
  generateDocumentNumberSchema,
  updateDocumentSequenceSchema,
  type CreateDocumentSequenceInput,
  type DocumentSequencesQuery,
  type GenerateDocumentNumberInput,
  type UpdateDocumentSequenceInput,
} from './document-sequences.schemas.js'
import { DocumentSequencesService } from './document-sequences.service.js'

@ApiTags('Document Sequences')
@Controller('document-sequences')
@UseGuards(AuthGuard, TenantGuard, PermissionGuard)
@RequireTenant()
export class DocumentSequencesController {
  constructor(
    @Inject(DocumentSequencesService)
    private readonly documentSequencesService: DocumentSequencesService,
  ) {}

  @Get()
  @RequirePermissions('document-sequence.read')
  list(
    @Query(new ZodValidationPipe(documentSequencesQuerySchema))
    query: DocumentSequencesQuery,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.documentSequencesService.list(query, tenant)
  }

  @Get(':id')
  @RequirePermissions('document-sequence.read')
  getById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.documentSequencesService.getById(id, tenant)
  }

  @Post()
  @RequirePermissions('document-sequence.create')
  create(
    @Body(new ZodValidationPipe(createDocumentSequenceSchema))
    body: CreateDocumentSequenceInput,
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.documentSequencesService.create(body, tenant, user.id)
  }

  @Patch(':id')
  @RequirePermissions('document-sequence.update')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateDocumentSequenceSchema))
    body: UpdateDocumentSequenceInput,
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.documentSequencesService.update(id, body, tenant, user.id)
  }

  @Post('next')
  @RequirePermissions('document-sequence.generate')
  generate(
    @Body(new ZodValidationPipe(generateDocumentNumberSchema))
    body: GenerateDocumentNumberInput,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.documentSequencesService.generate(body, tenant)
  }
}
