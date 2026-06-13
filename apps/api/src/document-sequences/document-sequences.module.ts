import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module.js'
import { PrismaModule } from '../prisma/prisma.module.js'
import { DocumentSequencesController } from './document-sequences.controller.js'
import { DocumentSequencesService } from './document-sequences.service.js'

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [DocumentSequencesController],
  providers: [DocumentSequencesService],
  exports: [DocumentSequencesService],
})
export class DocumentSequencesModule {}
