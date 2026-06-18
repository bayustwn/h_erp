import { Card, CardContent } from '@/components/ui/card'
import { ShoppingCart, Package, Warehouse, Calculator, FileBarChart, Database, Settings } from 'lucide-react'

interface PlaceholderPageProps {
  title: string
  module: string
  Icon: React.ElementType
}

function PlaceholderPage({ title, module, Icon }: PlaceholderPageProps) {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted">{module}</p>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-primary-400 to-primary-600 shadow-xl shadow-primary-500/20">
            <Icon className="h-10 w-10 text-white" />
          </div>
          <h2 className="mt-6 text-xl font-semibold text-foreground">{title}</h2>
          <p className="mt-2 max-w-md text-sm text-muted">
            This module is under development. You'll be able to manage {module.toLowerCase()} here once it's ready.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export function SalesPage() {
  return <PlaceholderPage title="Sales" module="Sales" Icon={ShoppingCart} />
}

export function PurchasingPage() {
  return <PlaceholderPage title="Purchasing" module="Purchasing" Icon={Package} />
}

export function InventoryPage() {
  return <PlaceholderPage title="Inventory" module="Inventory" Icon={Warehouse} />
}

export function AccountingPage() {
  return <PlaceholderPage title="Accounting" module="Accounting" Icon={Calculator} />
}

export function ReportsPage() {
  return <PlaceholderPage title="Reports" module="Reports" Icon={FileBarChart} />
}

export function MasterDataPage() {
  return <PlaceholderPage title="Master Data" module="Master Data" Icon={Database} />
}

export function SettingsPage() {
  return <PlaceholderPage title="Settings" module="Settings" Icon={Settings} />
}
