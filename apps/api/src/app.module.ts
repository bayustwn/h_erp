import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AccessControlModule } from './access-control/access-control.module.js'
import { AttachmentsModule } from './attachments/attachments.module.js'
import { AuditModule } from './audit/audit.module.js'
import { AuthModule } from './auth/auth.module.js'
import { BranchesModule } from './branches/branches.module.js'
import { CustomersModule } from './customers/customers.module.js'
import { RequestLoggerMiddleware } from './common/http/request-logger.middleware.js'
import { CompaniesModule } from './companies/companies.module.js'
import { loadAppConfig } from './config/env.config.js'
import { DocumentSequencesModule } from './document-sequences/document-sequences.module.js'
import { HealthModule } from './health/health.module.js'
import { InventoryModule } from './inventory/inventory.module.js'
import { PrismaModule } from './prisma/prisma.module.js'
import { UsersModule } from './users/users.module.js'
import { WarehousesModule } from './warehouses/warehouses.module.js'

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: ['.env', '../../.env'],
      isGlobal: true,
      load: [loadAppConfig],
    }),
    PrismaModule,
    AuditModule,
    AuthModule,
    AccessControlModule,
    CompaniesModule,
    BranchesModule,
    CustomersModule,
    WarehousesModule,
    InventoryModule,
    DocumentSequencesModule,
    AttachmentsModule,
    UsersModule,
    HealthModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggerMiddleware).forRoutes({
      path: '*path',
      method: RequestMethod.ALL,
    })
  }
}
