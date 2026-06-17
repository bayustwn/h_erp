import { Module } from '@nestjs/common'
import { AuditModule } from '../audit/audit.module.js'
import { AuthModule } from '../auth/auth.module.js'
import { PrismaModule } from '../prisma/prisma.module.js'
import { SuppliersController } from './suppliers.controller.js'
import { SuppliersService } from './suppliers.service.js'

@Module({
  imports: [AuthModule, PrismaModule, AuditModule],
  controllers: [SuppliersController],
  providers: [SuppliersService],
})
export class SuppliersModule {}
