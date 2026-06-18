import { memo, useState, useEffect, useRef } from 'react'
import { Search, Bell, HelpCircle, ChevronDown, User, LogOut, Settings } from 'lucide-react'

export const Topbar = memo(function Topbar() {
  const [profileOpen, setProfileOpen] = useState(false)
  const [closing, setClosing] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const close = () => {
    setClosing(true)
    setTimeout(() => {
      setProfileOpen(false)
      setClosing(false)
    }, 100)
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        close()
      }
    }
    if (profileOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [profileOpen])

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center border-b border-gray-100 bg-white px-5">
      <form role="search" className="relative w-72">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="search"
          placeholder="Search..."
          aria-label="Search"
          className="h-9 w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 text-xs text-gray-900 placeholder:text-gray-400 transition-all duration-150 focus-visible:outline-none focus-visible:border-primary-400 focus-visible:ring-1 focus-visible:ring-primary-400/20 hover:border-gray-400"
        />
      </form>

      <div className="ml-auto flex items-center gap-1.5">
        <button aria-label="Help" className="flex h-10 w-10 items-center justify-center rounded-md text-gray-300 transition-all duration-150 hover:bg-gray-100 hover:text-gray-500">
          <HelpCircle className="h-5 w-5" />
        </button>
        <button aria-label="Notifications" className="relative flex h-10 w-10 items-center justify-center rounded-md text-gray-300 transition-all duration-150 hover:bg-gray-100 hover:text-gray-500">
          <Bell className="h-5 w-5" />
          <span aria-label="Unread notifications" className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-primary-500 ring-1 ring-white" />
        </button>

        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => profileOpen ? close() : setProfileOpen(true)}
            aria-expanded={profileOpen}
            aria-haspopup="true"
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-all duration-150"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-primary-400 to-primary-600 text-xs font-semibold text-white">
              A
            </div>
            <span className="hidden sm:block font-medium text-gray-900">Admin</span>
            <ChevronDown className="h-3.5 w-3.5 text-gray-400 transition-transform duration-150" style={{ transform: profileOpen && !closing ? 'rotate(180deg)' : 'rotate(0deg)' }} />
          </button>

          {profileOpen && (
            <div className={`absolute right-0 mt-1.5 w-52 glass-card rounded-xl shadow-xl py-1 ${closing ? 'animate-dropdown-out' : 'animate-dropdown-in'}`}>
              <div className="px-3 py-2 border-b border-gray-100">
                <p className="text-xs font-medium text-gray-900">Admin</p>
                <p className="text-[11px] text-gray-400 truncate">admin@erp.local</p>
              </div>
              <button className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-none first:rounded-t-xl">
                <User className="h-3.5 w-3.5" />
                Profil
              </button>
              <button className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">
                <Settings className="h-3.5 w-3.5" />
                Pengaturan
              </button>
              <hr className="my-1 border-gray-100" />
              <button className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-b-xl">
                <LogOut className="h-3.5 w-3.5" />
                Keluar
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
})
