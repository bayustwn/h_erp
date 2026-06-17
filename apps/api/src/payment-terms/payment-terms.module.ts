import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module.js'
import { PrismaModule } from '../prisma/prisma.module.js'
import { PaymentTermsController } from './payment-terms.controller.js'
import { PaymentTermsService } from './payment-terms.service.js'

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [PaymentTermsController],
  providers: [PaymentTermsService],
})
export class PaymentTermsModule {}
