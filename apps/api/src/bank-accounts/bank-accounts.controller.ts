import { Body, Controller, Get, Inject, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { ParseUUIDPipe } from '@nestjs/common'
import { PermissionGuard } from '../access-control/permission.guard.js'
import { RequirePermissions } from '../access-control/permissions.decorator.js'
import { CurrentTenant, RequireTenant } from '../access-control/tenant.decorator.js'
import { TenantGuard } from '../access-control/tenant.guard.js'
import type { TenantContext } from '../access-control/access-control.types.js'
import { AuthGuard } from '../auth/auth.guard.js'
import { ZodValidationPipe } from '../common/validation/zod-validation.pipe.js'
import { bankAccountsQuerySchema, createBankAccountSchema, updateBankAccountSchema, updateBankAccountStatusSchema, type BankAccountsQuery, type CreateBankAccountInput, type UpdateBankAccountInput, type UpdateBankAccountStatusInput } from './bank-accounts.schemas.js'
import { BankAccountsService } from './bank-accounts.service.js'

@Controller('bank-accounts')
@UseGuards(AuthGuard, TenantGuard, PermissionGuard)
@RequireTenant()
export class BankAccountsController {
  constructor(@Inject(BankAccountsService) private readonly service: BankAccountsService) {}

  @Get()
  @RequirePermissions('bank-account.read')
  list(@Query(new ZodValidationPipe(bankAccountsQuerySchema)) query: BankAccountsQuery, @CurrentTenant() tenant: TenantContext) { return this.service.list(query, tenant) }

  @Get(':id')
  @RequirePermissions('bank-account.read')
  getById(@Param('id', ParseUUIDPipe) id: string, @CurrentTenant() tenant: TenantContext) { return this.service.getById(id, tenant) }

  @Post()
  @RequirePermissions('bank-account.create')
  create(@Body(new ZodValidationPipe(createBankAccountSchema)) body: CreateBankAccountInput, @CurrentTenant() tenant: TenantContext) { return this.service.create(body, tenant) }

  @Patch(':id')
  @RequirePermissions('bank-account.update')
  update(@Param('id', ParseUUIDPipe) id: string, @Body(new ZodValidationPipe(updateBankAccountSchema)) body: UpdateBankAccountInput, @CurrentTenant() tenant: TenantContext) { return this.service.update(id, body, tenant) }

  @Patch(':id/status')
  @RequirePermissions('bank-account.delete')
  updateStatus(@Param('id', ParseUUIDPipe) id: string, @Body(new ZodValidationPipe(updateBankAccountStatusSchema)) body: UpdateBankAccountStatusInput, @CurrentTenant() tenant: TenantContext) { return this.service.updateStatus(id, body, tenant) }
}
