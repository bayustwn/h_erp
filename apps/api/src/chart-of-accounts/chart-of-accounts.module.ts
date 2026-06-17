import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module.js'
import { PrismaModule } from '../prisma/prisma.module.js'
import { ChartOfAccountsController } from './chart-of-accounts.controller.js'
import { ChartOfAccountsService } from './chart-of-accounts.service.js'

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [ChartOfAccountsController],
  providers: [ChartOfAccountsService],
})
export class ChartOfAccountsModule {}
