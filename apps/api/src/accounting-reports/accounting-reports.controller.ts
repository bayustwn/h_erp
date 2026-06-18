import { Controller, Get, Inject, Query, UseGuards } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { PermissionGuard } from '../access-control/permission.guard.js'
import { RequirePermissions } from '../access-control/permissions.decorator.js'
import { CurrentTenant, RequireTenant } from '../access-control/tenant.decorator.js'
import { TenantGuard } from '../access-control/tenant.guard.js'
import type { TenantContext } from '../access-control/access-control.types.js'
import { AuthGuard } from '../auth/auth.guard.js'
import { AccountingReportsService } from './accounting-reports.service.js'

@ApiTags('Accounting Reports')
@Controller('accounting-reports')
@UseGuards(AuthGuard, TenantGuard, PermissionGuard)
@RequireTenant()
export class AccountingReportsController {
  constructor(
    @Inject(AccountingReportsService) private readonly service: AccountingReportsService,
  ) {}

  @Get('trial-balance')
  @RequirePermissions('accounting.journal.read')
  trialBalance(@CurrentTenant() tenant: TenantContext, @Query('asOf') asOf?: string) {
    return this.service.trialBalance(tenant, asOf)
  }

  @Get('profit-loss')
  @RequirePermissions('accounting.journal.read')
  profitLoss(
    @CurrentTenant() tenant: TenantContext,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.service.profitLoss(tenant, startDate, endDate)
  }

  @Get('balance-sheet')
  @RequirePermissions('accounting.journal.read')
  balanceSheet(@CurrentTenant() tenant: TenantContext, @Query('asOf') asOf?: string) {
    return this.service.balanceSheet(tenant, asOf)
  }

  @Get('ar-aging')
  @RequirePermissions('finance.invoice.read')
  arAging(@CurrentTenant() tenant: TenantContext, @Query('asOf') asOf?: string) {
    return this.service.arAging(tenant, asOf)
  }

  @Get('ap-aging')
  @RequirePermissions('finance.invoice.read')
  apAging(@CurrentTenant() tenant: TenantContext, @Query('asOf') asOf?: string) {
    return this.service.apAging(tenant, asOf)
  }
}
