import { memo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Package,
  Users,
  Plus,
  Download,
  MoreHorizontal,

} from 'lucide-react'

const stats = [
  {
    label: 'Revenue (MTD)',
    value: 285_000_000,
    change: '+12.5%',
    trend: 'up',
    icon: DollarSign,
    color: 'from-emerald-400 to-emerald-600',
    bg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
  },
  {
    label: 'Pending Orders',
    value: 24,
    change: '+3.2%',
    trend: 'up',
    icon: ShoppingCart,
    color: 'from-primary-400 to-primary-600',
    bg: 'bg-primary-50',
    iconColor: 'text-primary-600',
  },
  {
    label: 'Low Stock Items',
    value: 8,
    change: '-2.1%',
    trend: 'down',
    icon: Package,
    color: 'from-amber-400 to-amber-600',
    bg: 'bg-amber-50',
    iconColor: 'text-amber-600',
  },
  {
    label: 'Active Customers',
    value: 156,
    change: '+8.7%',
    trend: 'up',
    icon: Users,
    color: 'from-sky-400 to-sky-600',
    bg: 'bg-sky-50',
    iconColor: 'text-sky-600',
  },
]

const recentTransactions = [
  { id: 'SO-2024-001', customer: 'PT Maju Jaya', type: 'Sales Order', amount: 12_500_000, status: 'completed', date: '2024-01-15' },
  { id: 'PO-2024-001', supplier: 'CV Sumber Makmur', type: 'Purchase Order', amount: 8_200_000, status: 'pending', date: '2024-01-14' },
  { id: 'INV-2024-001', customer: 'Toko Sukses', type: 'Invoice', amount: 5_600_000, status: 'overdue', date: '2024-01-10' },
  { id: 'PMT-2024-001', supplier: 'PT Bahan Bangunan', type: 'Payment', amount: 4_300_000, status: 'completed', date: '2024-01-12' },
]

const pendingApprovals = [
  { id: 'PO-2024-002', title: 'Purchase Order #PO-2024-002', supplier: 'CV Sumber Makmur', amount: 15_000_000, priority: 'high' },
  { id: 'ADJ-2024-001', title: 'Stock Adjustment #ADJ-2024-001', reason: 'Inventory discrepancy', amount: 0, priority: 'medium' },
  { id: 'SO-2024-002', title: 'Sales Order #SO-2024-002', customer: 'PT Maju Jaya', amount: 22_500_000, priority: 'high' },
  { id: 'INV-2024-002', title: 'Invoice #INV-2024-002', customer: 'Toko Sukses', amount: 8_900_000, priority: 'medium' },
]

const StatCard = memo(function StatCard({ stat }: { stat: typeof stats[number] }) {
  const Icon = stat.icon
  const TrendIcon = stat.trend === 'up' ? TrendingUp : TrendingDown

  return (
    <Card className="group relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-primary-500/5">
      <div className={`absolute right-0 top-0 h-24 w-24 -translate-y-6 translate-x-6 rounded-full ${stat.bg} opacity-50 blur-2xl transition-all duration-500 group-hover:opacity-80`} />
      <CardContent className="relative">
        <div className="flex items-start justify-between">
          <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${stat.bg}`}>
            <Icon className={`h-[22px] w-[22px] ${stat.iconColor}`} />
          </div>
          <span className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-medium ${stat.trend === 'up' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
            <TrendIcon className="h-3 w-3" />
            {stat.change}
          </span>
        </div>
        <div className="mt-4">
          <p className="text-sm text-muted">{stat.label}</p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-foreground">
            {stat.value > 1000
              ? formatCurrency(stat.value)
              : stat.value.toLocaleString('id-ID')}
          </p>
        </div>
      </CardContent>
    </Card>
  )
})

const statusBadge = (status: string) => {
  const map: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' | 'info' }> = {
    completed: { label: 'Completed', variant: 'success' },
    pending: { label: 'Pending', variant: 'warning' },
    overdue: { label: 'Overdue', variant: 'danger' },
    processing: { label: 'Processing', variant: 'info' },
  }
  return map[status] || { label: status, variant: 'neutral' as const }
}

const priorityBadge = (priority: string) => {
  const map: Record<string, { label: string; variant: 'danger' | 'warning' | 'info' }> = {
    high: { label: 'High', variant: 'danger' },
    medium: { label: 'Medium', variant: 'warning' },
    low: { label: 'Low', variant: 'info' },
  }
  return map[priority] || { label: priority, variant: 'neutral' as const }
}

export function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="mt-1 text-sm text-muted">Overview of your business operations</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm">
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4" />
            New Transaction
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat, i) => (
          <StatCard key={i} stat={stat} />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
            <Button variant="ghost" size="icon-sm" aria-label="More">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </CardHeader>
            <CardContent className="p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-medium text-muted">
                  <th className="py-3 pl-4 pr-2">Customer / Supplier</th>
                  <th className="py-3 px-2">Type</th>
                  <th className="py-3 px-2">Amount</th>
                  <th className="py-3 pr-4 pl-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentTransactions.map((tx) => {
                  const badge = statusBadge(tx.status)
                  return (
                    <tr key={tx.id} className="border-b border-gray-50 text-sm transition-colors hover:bg-primary-50/30">
                      <td className="py-3.5 pl-4 pr-2">
                        <p className="font-medium text-foreground">{tx.customer || tx.supplier}</p>
                        <p className="text-xs text-muted">{tx.id}</p>
                      </td>
                      <td className="py-3.5 px-2 text-muted">{tx.type}</td>
                      <td className="py-3.5 px-2 font-semibold text-foreground">{formatCurrency(tx.amount)}</td>
                      <td className="py-3.5 pr-4 pl-2"><Badge variant={badge.variant} size="sm">{badge.label}</Badge></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pending Approvals</CardTitle>
            <Button variant="ghost" size="icon-sm" aria-label="More">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-medium text-muted">
                  <th className="py-3 pl-4 pr-2">Item</th>
                  <th className="py-3 px-2">Amount</th>
                  <th className="py-3 pr-4 pl-2">Priority</th>
                </tr>
              </thead>
              <tbody>
                {pendingApprovals.map((item) => {
                  const prio = priorityBadge(item.priority)
                  return (
                    <tr key={item.id} className="border-b border-gray-50 text-sm transition-colors hover:bg-primary-50/30">
                      <td className="py-3.5 pl-4 pr-2">
                        <p className="font-medium text-foreground">{item.title}</p>
                        <p className="text-xs text-muted">{item.customer || item.supplier || item.reason}</p>
                      </td>
                      <td className="py-3.5 px-2 font-semibold text-foreground">{item.amount > 0 ? formatCurrency(item.amount) : '-'}</td>
                      <td className="py-3.5 pr-4 pl-2"><Badge variant={prio.variant} size="sm">{prio.label}</Badge></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

          </CardContent>
        </Card>
      </div>


    </div>
  )
}
