import { Module } from '@nestjs/common'
import { AuditModule } from '../audit/audit.module.js'
import { AuthModule } from '../auth/auth.module.js'
import { IntegrationModule } from '../integration/integration.module.js'
import { PrismaModule } from '../prisma/prisma.module.js'
import { SalesOrdersController } from './sales-orders.controller.js'
import { SalesOrdersService } from './sales-orders.service.js'

@Module({
  imports: [AuthModule, PrismaModule, AuditModule, IntegrationModule],
  controllers: [SalesOrdersController],
  providers: [SalesOrdersService],
})
export class SalesOrdersModule {}
