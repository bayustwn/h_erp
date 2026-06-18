import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AccountingReportsModule } from './accounting-reports/accounting-reports.module.js'
import { AccessControlModule } from './access-control/access-control.module.js'
import { AttachmentsModule } from './attachments/attachments.module.js'
import { AuditModule } from './audit/audit.module.js'
import { AuthModule } from './auth/auth.module.js'
import { BranchesModule } from './branches/branches.module.js'
import { BankAccountsModule } from './bank-accounts/bank-accounts.module.js'
import { ChartOfAccountsModule } from './chart-of-accounts/chart-of-accounts.module.js'
import { CustomerPaymentsModule } from './customer-payments/customer-payments.module.js'
import { CustomersModule } from './customers/customers.module.js'
import { DeliveryOrdersModule } from './delivery-orders/delivery-orders.module.js'
import { GoodsReceiptsModule } from './goods-receipts/goods-receipts.module.js'
import { PurchaseInvoicesModule } from './purchase-invoices/purchase-invoices.module.js'
import { PurchaseReturnsModule } from './purchase-returns/purchase-returns.module.js'
import { SalesInvoicesModule } from './sales-invoices/sales-invoices.module.js'
import { SalesReturnsModule } from './sales-returns/sales-returns.module.js'
import { PurchaseOrdersModule } from './purchase-orders/purchase-orders.module.js'
import { SalesOrdersModule } from './sales-orders/sales-orders.module.js'
import { PaymentMethodsModule } from './payment-methods/payment-methods.module.js'
import { PaymentTermsModule } from './payment-terms/payment-terms.module.js'
import { ProductAccountingMappingsModule } from './product-accounting-mappings/product-accounting-mappings.module.js'
import { PriceListsModule } from './price-lists/price-lists.module.js'
import { SupplierPaymentsModule } from './supplier-payments/supplier-payments.module.js'
import { SuppliersModule } from './suppliers/suppliers.module.js'
import { TaxesModule } from './taxes/taxes.module.js'
import { RequestLoggerMiddleware } from './common/http/request-logger.middleware.js'
import { CompaniesModule } from './companies/companies.module.js'
import { loadAppConfig } from './config/env.config.js'
import { DocumentSequencesModule } from './document-sequences/document-sequences.module.js'
import { ExcelModule } from './excel/excel.module.js'
import { HealthModule } from './health/health.module.js'
import { JournalEntriesModule } from './journal-entries/journal-entries.module.js'
import { LandedCostsModule } from './landed-costs/landed-costs.module.js'
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
    AccountingReportsModule,
    CompaniesModule,
    BranchesModule,
    BankAccountsModule,
    ChartOfAccountsModule,
    CustomerPaymentsModule,
    CustomersModule,
    PaymentMethodsModule,
    PaymentTermsModule,
    PriceListsModule,
    ProductAccountingMappingsModule,
    DeliveryOrdersModule,
    GoodsReceiptsModule,
    PurchaseInvoicesModule,
    PurchaseOrdersModule,
    PurchaseReturnsModule,
    SalesInvoicesModule,
    SalesOrdersModule,
    SalesReturnsModule,
    SuppliersModule,
    SupplierPaymentsModule,
    TaxesModule,
    WarehousesModule,
    InventoryModule,
    JournalEntriesModule,
    LandedCostsModule,
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
