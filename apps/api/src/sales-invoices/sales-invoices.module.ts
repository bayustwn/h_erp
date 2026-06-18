import { Module } from '@nestjs/common'
import { AuditModule } from '../audit/audit.module.js'
import { AuthModule } from '../auth/auth.module.js'
import { PrismaModule } from '../prisma/prisma.module.js'
import { SalesInvoicesController } from './sales-invoices.controller.js'
import { SalesInvoicesService } from './sales-invoices.service.js'

@Module({
  imports: [AuthModule, PrismaModule, AuditModule],
  controllers: [SalesInvoicesController],
  providers: [SalesInvoicesService],
})
export class SalesInvoicesModule {}
