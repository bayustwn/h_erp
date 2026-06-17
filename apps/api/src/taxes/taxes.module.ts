import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module.js'
import { PrismaModule } from '../prisma/prisma.module.js'
import { TaxesController } from './taxes.controller.js'
import { TaxesService } from './taxes.service.js'

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [TaxesController],
  providers: [TaxesService],
})
export class TaxesModule {}
