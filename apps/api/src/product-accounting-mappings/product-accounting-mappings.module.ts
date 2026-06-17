import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module.js'
import { PrismaModule } from '../prisma/prisma.module.js'
import { ProductAccountingMappingsController } from './product-accounting-mappings.controller.js'
import { ProductAccountingMappingsService } from './product-accounting-mappings.service.js'

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [ProductAccountingMappingsController],
  providers: [ProductAccountingMappingsService],
})
export class ProductAccountingMappingsModule {}
