import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module.js'
import { PrismaModule } from '../prisma/prisma.module.js'
import { CompaniesController } from './companies.controller.js'
import { CompaniesService } from './companies.service.js'

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [CompaniesController],
  providers: [CompaniesService],
})
export class CompaniesModule {}
