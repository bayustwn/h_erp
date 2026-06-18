import { Module } from '@nestjs/common'
import { AuditModule } from '../audit/audit.module.js'
import { AuthModule } from '../auth/auth.module.js'
import { PrismaModule } from '../prisma/prisma.module.js'
import { JournalEntriesController } from './journal-entries.controller.js'
import { JournalEntriesService } from './journal-entries.service.js'

@Module({
  imports: [AuthModule, PrismaModule, AuditModule],
  controllers: [JournalEntriesController],
  providers: [JournalEntriesService],
})
export class JournalEntriesModule {}
