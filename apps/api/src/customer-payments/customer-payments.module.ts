import { Module } from '@nestjs/common'
import { AuditModule } from '../audit/audit.module.js'
import { AuthModule } from '../auth/auth.module.js'
import { IntegrationModule } from '../integration/integration.module.js'
import { PrismaModule } from '../prisma/prisma.module.js'
import { CustomerPaymentsController } from './customer-payments.controller.js'
import { CustomerPaymentsService } from './customer-payments.service.js'

@Module({
  imports: [AuthModule, PrismaModule, AuditModule, IntegrationModule],
  controllers: [CustomerPaymentsController],
  providers: [CustomerPaymentsService],
})
export class CustomerPaymentsModule {}
