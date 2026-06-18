import { Module } from '@nestjs/common'
import { AuditModule } from '../audit/audit.module.js'
import { AuthModule } from '../auth/auth.module.js'
import { IntegrationModule } from '../integration/integration.module.js'
import { PrismaModule } from '../prisma/prisma.module.js'
import { LandedCostsController } from './landed-costs.controller.js'
import { LandedCostsService } from './landed-costs.service.js'

@Module({
  imports: [AuthModule, PrismaModule, AuditModule, IntegrationModule],
  controllers: [LandedCostsController],
  providers: [LandedCostsService],
})
export class LandedCostsModule {}
