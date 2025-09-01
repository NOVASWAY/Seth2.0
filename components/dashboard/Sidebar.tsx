'use client'
import { useRouter, usePathname } from 'next/navigation'
import { useTheme } from '../../lib/ThemeContext'
import { ChevronLeft, ChevronRight, User, LogOut } from 'lucide-react'

interface MenuItem {
  id: string
  title: string
  href: string
  icon: string
  badge?: string
}

interface SidebarProps {
  menuItems: MenuItem[]
  user: any
  isCollapsed?: boolean
  onToggle: () => void
}

export default function Sidebar({ menuItems, user, isCollapsed = false, onToggle }: SidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { theme, colors } = useTheme()

  const handleNavigation = (href: string) => {
    router.push(href)
  }

  const isActiveRoute = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard'
    }
    return pathname.startsWith(href)
  }

  return (
    <div className={`bg-white dark:bg-slate-800 shadow-lg transition-all duration-300 border-r border-slate-200 dark:border-slate-700 ${
      isCollapsed ? 'w-16' : 'w-64'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-slate-200 dark:border-slate-700">
        {!isCollapsed && (
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-lg font-bold">S</span>
            </div>
            <span className="text-lg font-semibold text-slate-900 dark:text-slate-100">Seth Clinic</span>
          </div>
        )}
        <button
          onClick={onToggle}
          className="p-1 rounded-md text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        >
          {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </div>

      {/* User Profile */}
      <div className="px-4 py-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-purple-600 rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-white" />
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                {user?.username || 'User'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {user?.role || 'Staff'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleNavigation(item.href)}
            className={`group flex items-center w-full px-2 py-2 text-sm font-medium rounded-md transition-colors ${
              isActiveRoute(item.href)
                ? 'bg-gradient-to-r from-orange-50 to-purple-50 dark:from-orange-900/20 dark:to-purple-900/20 text-orange-700 dark:text-orange-300 border-r-2 border-orange-500'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            <span className="text-lg mr-3">{item.icon}</span>
            {!isCollapsed && (
              <>
                <span className="flex-1 text-left">{item.title}</span>
                {item.badge && (
                  <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200">
                    {item.badge}
                  </span>
                )}
              </>
            )}
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-slate-200 dark:border-slate-700">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-purple-600 rounded-lg flex items-center justify-center">
            <LogOut className="w-4 h-4 text-white" />
          </div>
          {!isCollapsed && (
            <span className="text-sm text-slate-600 dark:text-slate-400">Logout</span>
          )}
        </div>
      </div>
    </div>
  )
}
