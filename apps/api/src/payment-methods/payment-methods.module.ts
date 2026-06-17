import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module.js'
import { PrismaModule } from '../prisma/prisma.module.js'
import { PaymentMethodsController } from './payment-methods.controller.js'
import { PaymentMethodsService } from './payment-methods.service.js'

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [PaymentMethodsController],
  providers: [PaymentMethodsService],
})
export class PaymentMethodsModule {}
