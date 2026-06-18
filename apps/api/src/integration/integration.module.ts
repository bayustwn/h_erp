import { Module } from '@nestjs/common'
import { DocumentSequencesModule } from '../document-sequences/document-sequences.module.js'
import { PrismaModule } from '../prisma/prisma.module.js'
import { IntegrationService } from './integration.service.js'

@Module({
  imports: [PrismaModule, DocumentSequencesModule],
  providers: [IntegrationService],
  exports: [IntegrationService],
})
export class IntegrationModule {}
