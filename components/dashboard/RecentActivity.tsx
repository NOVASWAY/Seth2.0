interface ActivityItem {
  id: string
  type: 'patient' | 'appointment' | 'payment' | 'system' | 'user'
  message: string
  timestamp: string
  user?: string
  status?: 'success' | 'warning' | 'error' | 'info'
}

interface RecentActivityProps {
  activities: ActivityItem[]
  title?: string
  maxItems?: number
}

export default function RecentActivity({ 
  activities, 
  title = "Recent Activity", 
  maxItems = 5 
}: RecentActivityProps) {
  const getTypeIcon = (type: ActivityItem['type']) => {
    const icons = {
      patient: '👤',
      appointment: '📅',
      payment: '💰',
      system: '⚙️',
      user: '👨‍⚕️'
    }
    return icons[type] || '📋'
  }

  const getStatusColor = (status?: ActivityItem['status']) => {
    const colors = {
      success: 'text-green-600 dark:text-green-400',
      warning: 'text-yellow-600 dark:text-yellow-400',
      error: 'text-red-600 dark:text-red-400',
      info: 'text-blue-600 dark:text-blue-400'
    }
    return colors[status] || 'text-gray-600 dark:text-gray-400'
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours}h ago`
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="bg-white dark:bg-slate-800 shadow rounded-lg border border-slate-200 dark:border-slate-700">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700">
        <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100">{title}</h3>
      </div>
      <div className="divide-y divide-gray-200 dark:divide-slate-700">
        {activities.slice(0, maxItems).map((activity) => (
          <div key={activity.id} className="px-6 py-4">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 text-2xl">
                {getTypeIcon(activity.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${getStatusColor(activity.status)}`}>
                  {activity.message}
                </p>
                <div className="flex items-center space-x-2 mt-1">
                  {activity.user && (
                    <span className="text-xs text-gray-500 dark:text-slate-400">by {activity.user}</span>
                  )}
                  <span className="text-xs text-gray-400 dark:text-slate-500">
                    {formatTimestamp(activity.timestamp)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      {activities.length === 0 && (
        <div className="px-6 py-8 text-center">
          <p className="text-gray-500 dark:text-slate-400">No recent activity</p>
        </div>
      )}
    </div>
  )
}
