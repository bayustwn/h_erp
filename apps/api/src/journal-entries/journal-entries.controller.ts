import {
  Body, Controller, Get, Inject, Param, Patch, Post, Query, UseGuards,
} from '@nestjs/common'
import { ParseUUIDPipe } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { PermissionGuard } from '../access-control/permission.guard.js'
import { RequirePermissions } from '../access-control/permissions.decorator.js'
import { CurrentTenant, RequireTenant } from '../access-control/tenant.decorator.js'
import { TenantGuard } from '../access-control/tenant.guard.js'
import type { TenantContext } from '../access-control/access-control.types.js'
import { AuthGuard } from '../auth/auth.guard.js'
import type { AuthenticatedUser } from '../auth/auth.types.js'
import { CurrentUser } from '../auth/current-user.decorator.js'
import { ZodValidationPipe } from '../common/validation/zod-validation.pipe.js'
import {
  journalEntryQuerySchema, createJournalEntrySchema, updateJournalEntryStatusSchema,
  type CreateJournalEntryInput, type JournalEntryQuery, type UpdateJournalEntryStatusInput,
} from './journal-entries.schemas.js'
import { JournalEntriesService } from './journal-entries.service.js'

@ApiTags('Journal Entries')
@Controller('journal-entries')
@UseGuards(AuthGuard, TenantGuard, PermissionGuard)
@RequireTenant()
export class JournalEntriesController {
  constructor(
    @Inject(JournalEntriesService) private readonly service: JournalEntriesService,
  ) {}

  @Get()
  @RequirePermissions('accounting.journal.read')
  list(@Query(new ZodValidationPipe(journalEntryQuerySchema)) query: JournalEntryQuery, @CurrentTenant() tenant: TenantContext) {
    return this.service.list(query, tenant)
  }

  @Get(':id')
  @RequirePermissions('accounting.journal.read')
  getById(@Param('id', ParseUUIDPipe) id: string, @CurrentTenant() tenant: TenantContext) {
    return this.service.getById(id, tenant)
  }

  @Post()
  @RequirePermissions('accounting.journal.create')
  create(
    @Body(new ZodValidationPipe(createJournalEntrySchema)) body: CreateJournalEntryInput,
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.create(body, tenant, user.id)
  }

  @Patch(':id/status')
  @RequirePermissions('accounting.journal.cancel')
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateJournalEntryStatusSchema)) body: UpdateJournalEntryStatusInput,
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.updateStatus(id, body, tenant, user.id)
  }
}
