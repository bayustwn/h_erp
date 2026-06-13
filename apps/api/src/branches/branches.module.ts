import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module.js'
import { PrismaModule } from '../prisma/prisma.module.js'
import { BranchesController } from './branches.controller.js'
import { BranchesService } from './branches.service.js'

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [BranchesController],
  providers: [BranchesService],
})
export class BranchesModule {}
