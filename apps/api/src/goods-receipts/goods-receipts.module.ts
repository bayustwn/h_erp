import { Module } from '@nestjs/common'
import { AuditModule } from '../audit/audit.module.js'
import { AuthModule } from '../auth/auth.module.js'
import { PrismaModule } from '../prisma/prisma.module.js'
import { GoodsReceiptsController } from './goods-receipts.controller.js'
import { GoodsReceiptsService } from './goods-receipts.service.js'

@Module({
  imports: [AuthModule, PrismaModule, AuditModule],
  controllers: [GoodsReceiptsController],
  providers: [GoodsReceiptsService],
})
export class GoodsReceiptsModule {}
