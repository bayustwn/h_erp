import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AccessControlModule } from './access-control/access-control.module.js'
import { AttachmentsModule } from './attachments/attachments.module.js'
import { AuditModule } from './audit/audit.module.js'
import { AuthModule } from './auth/auth.module.js'
import { BranchesModule } from './branches/branches.module.js'
import { BankAccountsModule } from './bank-accounts/bank-accounts.module.js'
import { ChartOfAccountsModule } from './chart-of-accounts/chart-of-accounts.module.js'
import { CustomersModule } from './customers/customers.module.js'
import { PaymentMethodsModule } from './payment-methods/payment-methods.module.js'
import { PaymentTermsModule } from './payment-terms/payment-terms.module.js'
import { ProductAccountingMappingsModule } from './product-accounting-mappings/product-accounting-mappings.module.js'
import { PriceListsModule } from './price-lists/price-lists.module.js'
import { SuppliersModule } from './suppliers/suppliers.module.js'
import { TaxesModule } from './taxes/taxes.module.js'
import { RequestLoggerMiddleware } from './common/http/request-logger.middleware.js'
import { CompaniesModule } from './companies/companies.module.js'
import { loadAppConfig } from './config/env.config.js'
import { DocumentSequencesModule } from './document-sequences/document-sequences.module.js'
import { ExcelModule } from './excel/excel.module.js'
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
    BankAccountsModule,
    ChartOfAccountsModule,
    CustomersModule,
    PaymentMethodsModule,
    PaymentTermsModule,
    PriceListsModule,
    ProductAccountingMappingsModule,
    SuppliersModule,
    TaxesModule,
    WarehousesModule,
    InventoryModule,
    DocumentSequencesModule,
    ExcelModule,
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
