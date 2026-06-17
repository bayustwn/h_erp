import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module.js'
import { PrismaModule } from '../prisma/prisma.module.js'
import { BankAccountsController } from './bank-accounts.controller.js'
import { BankAccountsService } from './bank-accounts.service.js'

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [BankAccountsController],
  providers: [BankAccountsService],
})
export class BankAccountsModule {}
