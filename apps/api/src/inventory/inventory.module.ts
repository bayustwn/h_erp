import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module.js'
import { PrismaModule } from '../prisma/prisma.module.js'
import { InventoryController } from './inventory.controller.js'
import { InventoryService } from './inventory.service.js'

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [InventoryController],
  providers: [InventoryService],
})
export class InventoryModule {}
