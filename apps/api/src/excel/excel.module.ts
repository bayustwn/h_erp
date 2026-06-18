import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module.js'
import { PrismaModule } from '../prisma/prisma.module.js'
import { ExcelController } from './excel.controller.js'
import { ExcelService } from './excel.service.js'

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [ExcelController],
  providers: [ExcelService],
  exports: [ExcelService],
})
export class ExcelModule {}
