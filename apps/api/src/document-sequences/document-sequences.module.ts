import { Module } from '@nestjs/common'
import { AuditModule } from '../audit/audit.module.js'
import { AuthModule } from '../auth/auth.module.js'
import { PrismaModule } from '../prisma/prisma.module.js'
import { DocumentSequencesController } from './document-sequences.controller.js'
import { DocumentSequencesService } from './document-sequences.service.js'

@Module({
  imports: [AuthModule, PrismaModule, AuditModule],
  controllers: [DocumentSequencesController],
  providers: [DocumentSequencesService],
  exports: [DocumentSequencesService],
})
export class DocumentSequencesModule {}
