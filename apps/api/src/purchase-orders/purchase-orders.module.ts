import { Module } from '@nestjs/common'
import { AuditModule } from '../audit/audit.module.js'
import { AuthModule } from '../auth/auth.module.js'
import { PrismaModule } from '../prisma/prisma.module.js'
import { PurchaseOrdersController } from './purchase-orders.controller.js'
import { PurchaseOrdersService } from './purchase-orders.service.js'

@Module({
  imports: [AuthModule, PrismaModule, AuditModule],
  controllers: [PurchaseOrdersController],
  providers: [PurchaseOrdersService],
})
export class PurchaseOrdersModule {}
