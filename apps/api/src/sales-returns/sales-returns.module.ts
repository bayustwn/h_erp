import { Module } from '@nestjs/common'
import { AuditModule } from '../audit/audit.module.js'
import { AuthModule } from '../auth/auth.module.js'
import { PrismaModule } from '../prisma/prisma.module.js'
import { SalesReturnsController } from './sales-returns.controller.js'
import { SalesReturnsService } from './sales-returns.service.js'

@Module({
  imports: [AuthModule, PrismaModule, AuditModule],
  controllers: [SalesReturnsController],
  providers: [SalesReturnsService],
})
export class SalesReturnsModule {}
