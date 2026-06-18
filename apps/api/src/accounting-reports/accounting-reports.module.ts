import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module.js'
import { PrismaModule } from '../prisma/prisma.module.js'
import { AccountingReportsController } from './accounting-reports.controller.js'
import { AccountingReportsService } from './accounting-reports.service.js'

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [AccountingReportsController],
  providers: [AccountingReportsService],
})
export class AccountingReportsModule {}
