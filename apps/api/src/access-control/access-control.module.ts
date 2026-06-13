import { Global, Module } from '@nestjs/common'
import { PrismaModule } from '../prisma/prisma.module.js'
import { AccessControlService } from './access-control.service.js'
import { PermissionGuard } from './permission.guard.js'
import { TenantGuard } from './tenant.guard.js'

@Global()
@Module({
  imports: [PrismaModule],
  providers: [AccessControlService, PermissionGuard, TenantGuard],
  exports: [AccessControlService, PermissionGuard, TenantGuard],
})
export class AccessControlModule {}
