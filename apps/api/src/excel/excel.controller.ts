import { Body, Controller, Get, Inject, Param, Post, Res, UseGuards } from '@nestjs/common'
import type { Response } from 'express'
import { ApiTags } from '@nestjs/swagger'
import { PermissionGuard } from '../access-control/permission.guard.js'
import { RequirePermissions } from '../access-control/permissions.decorator.js'
import { CurrentTenant, RequireTenant } from '../access-control/tenant.decorator.js'
import { TenantGuard } from '../access-control/tenant.guard.js'
import type { TenantContext } from '../access-control/access-control.types.js'
import { AuthGuard } from '../auth/auth.guard.js'
import { ExcelService } from './excel.service.js'

const IMPORT_HANDLERS: Record<string, (rows: Record<string, unknown>[], tenant: TenantContext) => Promise<{ created: number; errors: { row: number; message: string }[] }>> = {}

@ApiTags('Excel Import/Export')
@Controller('excel')
@UseGuards(AuthGuard, TenantGuard, PermissionGuard)
@RequireTenant()
export class ExcelController {
  constructor(
    @Inject(ExcelService) private readonly excelService: ExcelService,
  ) {
    IMPORT_HANDLERS.customers = (rows, tenant) => this.excelService.importCustomers(rows, tenant)
    IMPORT_HANDLERS.suppliers = (rows, tenant) => this.excelService.importSuppliers(rows, tenant)
    IMPORT_HANDLERS.items = (rows, tenant) => this.excelService.importItems(rows, tenant)
  }

  @Get('templates/:entityType')
  @RequirePermissions('report.export')
  async downloadTemplate(@Param('entityType') entityType: string, @Res() res: Response) {
    const workbook = await this.excelService.generateTemplate(entityType)
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename="${entityType}-template.xlsx"`)
    await workbook.xlsx.write(res)
    res.end()
  }

  @Post('import/:entityType')
  @RequirePermissions('report.export')
  async import(
    @Param('entityType') entityType: string,
    @Body() body: { file: string },
    @CurrentTenant() tenant: TenantContext,
  ) {
    const handler = IMPORT_HANDLERS[entityType]
    if (!handler) throw new Error(`Import for "${entityType}" is not supported`)

    const buffer = Buffer.from(body.file, 'base64')
    const { rows, errors: parseErrors } = await this.excelService.parseImport(entityType, buffer)
    if (parseErrors.length > 0) return { parsed: rows.length, imported: 0, errors: parseErrors }

    const result = await handler(rows, tenant)
    return { parsed: rows.length, imported: result.created, errors: result.errors }
  }
}
