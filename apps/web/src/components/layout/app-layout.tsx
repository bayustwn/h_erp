import { memo } from 'react'
import { Outlet } from 'react-router'
import { Sidebar } from './sidebar'
import { Topbar } from './topbar'

export const AppLayout = memo(function AppLayout() {
  return (
    <div className="flex min-h-dvh bg-surface">
      <Sidebar />
      <div className="ml-64 flex flex-1 flex-col">
        <Topbar />
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
})
