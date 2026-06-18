import { Module } from '@nestjs/common'
import { AuditModule } from '../audit/audit.module.js'
import { AuthModule } from '../auth/auth.module.js'
import { IntegrationModule } from '../integration/integration.module.js'
import { PrismaModule } from '../prisma/prisma.module.js'
import { PurchaseInvoicesController } from './purchase-invoices.controller.js'
import { PurchaseInvoicesService } from './purchase-invoices.service.js'

@Module({
  imports: [AuthModule, PrismaModule, AuditModule, IntegrationModule],
  controllers: [PurchaseInvoicesController],
  providers: [PurchaseInvoicesService],
})
export class PurchaseInvoicesModule {}
