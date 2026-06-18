import { Module } from '@nestjs/common'
import { AuditModule } from '../audit/audit.module.js'
import { AuthModule } from '../auth/auth.module.js'
import { PrismaModule } from '../prisma/prisma.module.js'
import { PurchaseReturnsController } from './purchase-returns.controller.js'
import { PurchaseReturnsService } from './purchase-returns.service.js'

@Module({
  imports: [AuthModule, PrismaModule, AuditModule],
  controllers: [PurchaseReturnsController],
  providers: [PurchaseReturnsService],
})
export class PurchaseReturnsModule {}
