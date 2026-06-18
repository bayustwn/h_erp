import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router'
import { AppLayout } from '@/components/layout/app-layout'

const DashboardPage = lazy(() => import('@/pages/dashboard').then((m) => ({ default: m.DashboardPage })))
const SalesPage = lazy(() => import('@/pages/placeholders').then((m) => ({ default: m.SalesPage })))
const PurchasingPage = lazy(() => import('@/pages/placeholders').then((m) => ({ default: m.PurchasingPage })))
const InventoryPage = lazy(() => import('@/pages/placeholders').then((m) => ({ default: m.InventoryPage })))
const AccountingPage = lazy(() => import('@/pages/placeholders').then((m) => ({ default: m.AccountingPage })))
const ReportsPage = lazy(() => import('@/pages/placeholders').then((m) => ({ default: m.ReportsPage })))
const MasterDataPage = lazy(() => import('@/pages/placeholders').then((m) => ({ default: m.MasterDataPage })))
const SettingsPage = lazy(() => import('@/pages/placeholders').then((m) => ({ default: m.SettingsPage })))

function NotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-primary-600">404</h1>
        <p className="mt-2 text-lg text-muted">Page not found</p>
      </div>
    </div>
  )
}

function Loading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
    </div>
  )
}

export default function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />

          <Route path="/sales/orders" element={<SalesPage />} />
          <Route path="/sales/delivery-orders" element={<SalesPage />} />
          <Route path="/sales/invoices" element={<SalesPage />} />
          <Route path="/sales/payments" element={<SalesPage />} />
          <Route path="/sales/returns" element={<SalesPage />} />

          <Route path="/purchasing/orders" element={<PurchasingPage />} />
          <Route path="/purchasing/goods-receipts" element={<PurchasingPage />} />
          <Route path="/purchasing/invoices" element={<PurchasingPage />} />
          <Route path="/purchasing/payments" element={<PurchasingPage />} />
          <Route path="/purchasing/returns" element={<PurchasingPage />} />
          <Route path="/purchasing/landed-costs" element={<PurchasingPage />} />

          <Route path="/inventory/stock-balance" element={<InventoryPage />} />
          <Route path="/inventory/stock-movement" element={<InventoryPage />} />
          <Route path="/inventory/stock-transfer" element={<InventoryPage />} />
          <Route path="/inventory/stock-adjustment" element={<InventoryPage />} />

          <Route path="/accounting/coa" element={<AccountingPage />} />
          <Route path="/accounting/journals" element={<AccountingPage />} />
          <Route path="/accounting/trial-balance" element={<AccountingPage />} />
          <Route path="/accounting/profit-loss" element={<AccountingPage />} />
          <Route path="/accounting/balance-sheet" element={<AccountingPage />} />
          <Route path="/accounting/aging" element={<AccountingPage />} />

          <Route path="/reports" element={<ReportsPage />} />

          <Route path="/master/customers" element={<MasterDataPage />} />
          <Route path="/master/suppliers" element={<MasterDataPage />} />
          <Route path="/master/products" element={<MasterDataPage />} />
          <Route path="/master/uom" element={<MasterDataPage />} />
          <Route path="/master/price-lists" element={<MasterDataPage />} />
          <Route path="/master/taxes" element={<MasterDataPage />} />
          <Route path="/master/product-mapping" element={<MasterDataPage />} />

          <Route path="/settings/company" element={<SettingsPage />} />
          <Route path="/settings/branches" element={<SettingsPage />} />
          <Route path="/settings/warehouses" element={<SettingsPage />} />
          <Route path="/settings/users" element={<SettingsPage />} />
          <Route path="/settings/roles" element={<SettingsPage />} />
          <Route path="/settings/doc-sequences" element={<SettingsPage />} />

          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
