import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module.js'
import { PrismaModule } from '../prisma/prisma.module.js'
import { WarehousesController } from './warehouses.controller.js'
import { WarehousesService } from './warehouses.service.js'

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [WarehousesController],
  providers: [WarehousesService],
})
export class WarehousesModule {}
