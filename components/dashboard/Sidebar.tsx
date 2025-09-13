'use client'
import { useRouter, usePathname } from 'next/navigation'
import { useTheme } from '../../lib/ThemeContext'
import { useAuthStore } from '../../lib/auth'
import { getMenuItemsForRole, getRoleDisplayName, type MenuItem } from '../../lib/roleBasedMenuConfig'
import { ChevronLeft, ChevronRight, User, LogOut } from 'lucide-react'
import Logo from '../ui/Logo'

interface SidebarProps {
  user?: any
  isCollapsed?: boolean
  onToggle?: () => void
  currentPath?: string
}

export default function Sidebar({ user, isCollapsed = false, onToggle }: SidebarProps = {}) {
  const router = useRouter()
  const pathname = usePathname()
  const { theme, colors } = useTheme()
  const { logout, user: authUser } = useAuthStore()
  
  // Use provided user or fall back to auth store user
  const currentUser = user || authUser

  // Get role-based menu items
  const menuItems = getMenuItemsForRole(currentUser?.role || '')

  const handleNavigation = (href: string) => {
    router.push(href)
  }

  const handleLogout = async () => {
    console.log('🔐 Sidebar: Logout called')
    await logout()
    router.push('/login')
  }

  const isActiveRoute = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard'
    }
    return pathname.startsWith(href)
  }

  return (
    <div className={`bg-gradient-to-b from-white to-purple-50/30 dark:from-slate-800 dark:to-purple-900/20 shadow-lg transition-all duration-300 border-r border-purple-200/50 dark:border-purple-700/50 ${
      isCollapsed ? 'w-16' : 'w-64'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-purple-200/50 dark:border-purple-700/50">
        {!isCollapsed ? (
          <Logo size="lg" variant="full" showText={true} />
        ) : (
          <Logo size="md" variant="icon" showText={false} />
        )}
        <button
          onClick={onToggle}
          className="p-1 rounded-md text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        >
          {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </div>

      {/* User Profile */}
      <div className="px-4 py-4 border-b border-purple-200/50 dark:border-purple-700/50">
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
                {getRoleDisplayName(user?.role || 'Staff')}
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
            className={`group flex items-center w-full px-2 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
              isActiveRoute(item.href)
                ? 'bg-gradient-to-r from-purple-100 to-orange-100 dark:from-purple-900/30 dark:to-orange-900/30 text-purple-700 dark:text-purple-300 border-r-2 border-purple-500 shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:text-purple-700 dark:hover:text-purple-300 hover:bg-gradient-to-r hover:from-purple-50 hover:to-orange-50 dark:hover:from-purple-900/20 dark:hover:to-orange-900/20'
            }`}
          >
            <span className="text-lg mr-3">{item.icon}</span>
            {!isCollapsed && (
              <>
                <span className="flex-1 text-left">{item.title}</span>
                {item.badge && (
                  <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-purple-100 to-orange-100 dark:from-purple-900/30 dark:to-orange-900/30 text-purple-800 dark:text-purple-200">
                    {item.badge}
                  </span>
                )}
              </>
            )}
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-purple-200/50 dark:border-purple-700/50">
        <button
          onClick={handleLogout}
          className="flex items-center space-x-3 w-full p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors group"
          data-testid="sidebar-logout-button"
        >
          <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center group-hover:from-red-600 group-hover:to-red-700 transition-all">
            <LogOut className="w-4 h-4 text-white" />
          </div>
          {!isCollapsed && (
            <span className="text-sm text-slate-600 dark:text-slate-400 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">Logout</span>
          )}
        </button>
      </div>
    </div>
  )
}
