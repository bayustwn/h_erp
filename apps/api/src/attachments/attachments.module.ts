import { Module } from '@nestjs/common'
import { AuditModule } from '../audit/audit.module.js'
import { AuthModule } from '../auth/auth.module.js'
import { PrismaModule } from '../prisma/prisma.module.js'
import { StorageModule } from '../storage/storage.module.js'
import { AttachmentsController } from './attachments.controller.js'
import { AttachmentsService } from './attachments.service.js'

@Module({
  imports: [AuthModule, PrismaModule, StorageModule, AuditModule],
  controllers: [AttachmentsController],
  providers: [AttachmentsService],
})
export class AttachmentsModule {}

