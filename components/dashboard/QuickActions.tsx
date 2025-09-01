'use client'

import { useRouter } from 'next/navigation'

interface QuickAction {
  id: string
  title: string
  description: string
  icon: string
  href: string
  color: 'orange' | 'purple' | 'green' | 'red' | 'yellow'
  badge?: string
}

interface QuickActionsProps {
  actions: QuickAction[]
  title?: string
}

export default function QuickActions({ actions, title = "Quick Actions" }: QuickActionsProps) {
  const router = useRouter()

  const getColorClasses = (color: QuickAction['color']) => {
    const colors = {
      orange: 'bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/30 text-orange-700 dark:text-orange-300 hover:from-orange-100 hover:to-orange-200 dark:hover:from-orange-800/30 dark:hover:to-orange-700/40 border-orange-200 dark:border-orange-700',
      purple: 'bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/30 text-purple-700 dark:text-purple-300 hover:from-purple-100 hover:to-purple-200 dark:hover:from-purple-800/30 dark:hover:to-purple-700/40 border-purple-200 dark:border-purple-700',
      green: 'bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/30 text-green-700 dark:text-green-300 hover:from-green-100 hover:to-green-200 dark:hover:from-green-800/30 dark:hover:to-green-700/40 border-green-200 dark:border-green-700',
      red: 'bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/30 text-red-700 dark:text-red-300 hover:from-red-100 hover:to-red-200 dark:hover:from-red-800/30 dark:hover:to-red-700/40 border-red-200 dark:border-red-700',
      yellow: 'bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/30 text-yellow-700 dark:text-yellow-300 hover:from-yellow-100 hover:to-yellow-200 dark:hover:from-yellow-800/30 dark:hover:to-yellow-700/40 border-yellow-200 dark:border-yellow-700'
    }
    return colors[color]
  }

  const handleActionClick = (action: QuickAction) => {
    // Handle different action types
    switch (action.id) {
      case '1': // Register Patient
        router.push('/patients')
        break
      case '2': // Schedule Appointment
        router.push('/appointments')
        break
      case '3': // Process Payment
        router.push('/payments')
        break
      case '4': // View Reports
        router.push('/reports')
        break
      case '5': // Manage Staff
        router.push('/staff')
        break
      case '6': // Inventory Check
        router.push('/inventory')
        break
      default:
        router.push(action.href)
    }
  }

  return (
    <div className="bg-white dark:bg-slate-800 shadow-lg rounded-lg border border-slate-200 dark:border-slate-700 transition-colors duration-300">
      <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
        <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">{title}</h3>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {actions.map((action) => (
            <button
              key={action.id}
              onClick={() => handleActionClick(action)}
              className={`relative group p-4 rounded-lg border-2 transition-all duration-300 cursor-pointer transform hover:scale-105 hover:shadow-lg ${getColorClasses(action.color)}`}
            >
              <div className="flex items-center space-x-3">
                <div className="text-2xl">{action.icon}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{action.title}</p>
                  <p className="text-xs opacity-75 truncate">{action.description}</p>
                </div>
                {action.badge && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-white dark:bg-slate-800 bg-opacity-75 dark:bg-opacity-75">
                    {action.badge}
                  </span>
                )}
              </div>
              <div className="absolute inset-0 rounded-lg ring-2 ring-transparent group-hover:ring-current group-hover:ring-opacity-20 transition-all duration-300" />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
