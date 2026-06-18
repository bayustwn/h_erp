import { Module } from '@nestjs/common'
import { AuditModule } from '../audit/audit.module.js'
import { AuthModule } from '../auth/auth.module.js'
import { IntegrationModule } from '../integration/integration.module.js'
import { PrismaModule } from '../prisma/prisma.module.js'
import { DeliveryOrdersController } from './delivery-orders.controller.js'
import { DeliveryOrdersService } from './delivery-orders.service.js'

@Module({
  imports: [AuthModule, PrismaModule, AuditModule, IntegrationModule],
  controllers: [DeliveryOrdersController],
  providers: [DeliveryOrdersService],
})
export class DeliveryOrdersModule {}
