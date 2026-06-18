import { Module } from '@nestjs/common'
import { AuditModule } from '../audit/audit.module.js'
import { AuthModule } from '../auth/auth.module.js'
import { PrismaModule } from '../prisma/prisma.module.js'
import { SupplierPaymentsController } from './supplier-payments.controller.js'
import { SupplierPaymentsService } from './supplier-payments.service.js'

@Module({
  imports: [AuthModule, PrismaModule, AuditModule],
  controllers: [SupplierPaymentsController],
  providers: [SupplierPaymentsService],
})
export class SupplierPaymentsModule {}
