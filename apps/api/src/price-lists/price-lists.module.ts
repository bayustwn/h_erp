import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module.js'
import { PrismaModule } from '../prisma/prisma.module.js'
import { PriceListItemsController } from './price-list-items.controller.js'
import { PriceListItemsService } from './price-list-items.service.js'
import { PriceListsController } from './price-lists.controller.js'
import { PriceListsService } from './price-lists.service.js'

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [PriceListsController, PriceListItemsController],
  providers: [PriceListsService, PriceListItemsService],
})
export class PriceListsModule {}
