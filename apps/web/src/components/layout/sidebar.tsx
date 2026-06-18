import { memo, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Warehouse,
  Calculator,
  FileBarChart,
  Database,
  Settings,
  ChevronDown,
  ChevronRight,
  Receipt,
  Truck,
  FileText,
  CreditCard,
  Undo2,
  ClipboardList,
  ArrowUpDown,
  Layers,
  ScrollText,
  BarChart3,
  PieChart,
  Users,
  Building2,
  Store,
  Shield,
  Hash,
  Boxes,
  Percent,
  BookOpen,
  Coins,
  CalendarRange,
  Ruler,
} from 'lucide-react'

interface NavGroup {
  label: string
  icon: React.ElementType
  path?: string
  children?: { label: string; path: string }[]
}

const navGroups: NavGroup[] = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
  {
    label: 'Sales',
    icon: ShoppingCart,
    children: [
      { label: 'Sales Orders', path: '/sales/orders' },
      { label: 'Delivery Orders', path: '/sales/delivery-orders' },
      { label: 'Sales Invoices', path: '/sales/invoices' },
      { label: 'Customer Payments', path: '/sales/payments' },
      { label: 'Sales Returns', path: '/sales/returns' },
    ],
  },
  {
    label: 'Purchasing',
    icon: Package,
    children: [
      { label: 'Purchase Orders', path: '/purchasing/orders' },
      { label: 'Goods Receipts', path: '/purchasing/goods-receipts' },
      { label: 'Purchase Invoices', path: '/purchasing/invoices' },
      { label: 'Supplier Payments', path: '/purchasing/payments' },
      { label: 'Purchase Returns', path: '/purchasing/returns' },
      { label: 'Landed Costs', path: '/purchasing/landed-costs' },
    ],
  },
  {
    label: 'Inventory',
    icon: Warehouse,
    children: [
      { label: 'Stock Balance', path: '/inventory/stock-balance' },
      { label: 'Stock Movement', path: '/inventory/stock-movement' },
      { label: 'Stock Transfer', path: '/inventory/stock-transfer' },
      { label: 'Stock Adjustment', path: '/inventory/stock-adjustment' },
    ],
  },
  {
    label: 'Accounting',
    icon: Calculator,
    children: [
      { label: 'Chart of Accounts', path: '/accounting/coa' },
      { label: 'Journal Entries', path: '/accounting/journals' },
      { label: 'Trial Balance', path: '/accounting/trial-balance' },
      { label: 'Profit & Loss', path: '/accounting/profit-loss' },
      { label: 'Balance Sheet', path: '/accounting/balance-sheet' },
      { label: 'AR / AP Aging', path: '/accounting/aging' },
    ],
  },
  { label: 'Reports', icon: FileBarChart, path: '/reports' },
  {
    label: 'Master Data',
    icon: Database,
    children: [
      { label: 'Customers', path: '/master/customers' },
      { label: 'Suppliers', path: '/master/suppliers' },
      { label: 'Products', path: '/master/products' },
      { label: 'UOM', path: '/master/uom' },
      { label: 'Price Lists', path: '/master/price-lists' },
      { label: 'Taxes', path: '/master/taxes' },
      { label: 'Product Mapping', path: '/master/product-mapping' },
    ],
  },
  {
    label: 'Settings',
    icon: Settings,
    children: [
      { label: 'Company', path: '/settings/company' },
      { label: 'Branches', path: '/settings/branches' },
      { label: 'Warehouses', path: '/settings/warehouses' },
      { label: 'Users', path: '/settings/users' },
      { label: 'Roles & Permissions', path: '/settings/roles' },
      { label: 'Document Sequences', path: '/settings/doc-sequences' },
    ],
  },
]

const quickIcon = (path: string) => {
  const map: Record<string, React.ElementType> = {
    orders: Receipt,
    'delivery-orders': Truck,
    invoices: FileText,
    payments: CreditCard,
    returns: Undo2,
    'goods-receipts': ClipboardList,
    'landed-costs': Coins,
    'stock-balance': Boxes,
    'stock-movement': ArrowUpDown,
    'stock-transfer': Layers,
    'stock-adjustment': ScrollText,
    coa: BookOpen,
    journals: FileText,
    'trial-balance': BarChart3,
    'profit-loss': BarChart3,
    'balance-sheet': PieChart,
    aging: CalendarRange,
    customers: Users,
    suppliers: Building2,
    products: Package,
    uom: Ruler,
    'price-lists': Percent,
    taxes: Percent,
    'product-mapping': BookOpen,
    company: Building2,
    branches: Store,
    warehouses: Warehouse,
    users: Users,
    roles: Shield,
    'doc-sequences': Hash,
  }
  return map[path] || FileText
}

const isActive = (path: string, currentPath: string) => currentPath === path

export const Sidebar = memo(function Sidebar() {
  const location = useLocation()
  const currentPath = location.pathname
  const [expanded, setExpanded] = useState<string[]>(['Dashboard'])

  const toggleGroup = (label: string) => {
    setExpanded((prev) =>
      prev.includes(label) ? prev.filter((g) => g !== label) : [...prev, label],
    )
  }

  const isGroupActive = (group: NavGroup) =>
    group.children
      ? group.children.some((c) => isActive(c.path, currentPath))
      : isActive(group.path ?? '', currentPath)

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-gray-100 bg-sidebar">
      <div className="flex h-14 items-center gap-3 border-b border-gray-100 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary-400 to-primary-600 shadow-sm shadow-primary-500/10">
          <span className="text-xs font-bold text-white">E</span>
        </div>
        <span className="text-sm font-semibold tracking-tight text-gray-900">Nama Perusahaan</span>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-3">
        <nav aria-label="Main navigation" className="space-y-0.5">
          {navGroups.map((group) => {
            const Icon = group.icon
            const isExpanded = expanded.includes(group.label)
            const active = isGroupActive(group)
            const btnClass = cn(
              'flex w-full items-center gap-2.5 rounded-md px-3 py-2.5 text-sm font-semibold tracking-wide transition-all duration-150',
              active
                ? 'bg-primary-50 text-primary-700'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700',
            )

            if (group.children) {
              return (
                <div key={group.label}>
                  <button
                    onClick={() => toggleGroup(group.label)}
                    aria-expanded={isExpanded}
                    className={btnClass}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span className="flex-1 text-left">{group.label}</span>
                    {isExpanded ? <ChevronDown className="h-3 w-3 opacity-40" /> : <ChevronRight className="h-3 w-3 opacity-40" />}
                  </button>

                  <div className={`grid transition-all duration-200 ease-out ${isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'} overflow-hidden`}>
                    <div className="min-h-0 mt-0.5 pl-5 space-y-0.5 py-0.5">
                      {group.children.map((child) => {
                        const ChildIcon = quickIcon(child.path.split('/').pop() ?? '')
                        return (
                          <Link
                            key={child.path}
                            to={child.path}
                            aria-current={isActive(child.path, currentPath) ? 'page' : undefined}
                            className={cn(
                              'flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-all duration-150',
                              isActive(child.path, currentPath)
                                ? 'bg-primary-50 text-primary-700 font-medium'
                                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50',
                            )}
                          >
                            <ChildIcon className={cn(
                              'h-3 w-3 shrink-0',
                              isActive(child.path, currentPath) ? 'text-primary-500' : 'text-gray-400',
                            )} />
                            <span className="flex-1 text-left">{child.label}</span>
                            {isActive(child.path, currentPath) && (
                              <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary-500" />
                            )}
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )
            }

            return (
              <Link
                key={group.label}
                to={group.path ?? '/'}
                aria-current={active ? 'page' : undefined}
                className={btnClass}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span className="flex-1 text-left">{group.label}</span>
                <span className="block h-3 w-3" />
              </Link>
            )
          })}
        </nav>
      </div>
    </aside>
  )
})
