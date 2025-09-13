interface StatsCardProps {
  title: string
  value: string | number
  change?: string
  changeType?: 'increase' | 'decrease' | 'neutral'
  icon?: React.ReactNode
  color?: 'orange' | 'purple' | 'green' | 'red' | 'yellow' | 'blue' | 'heartbeat'
  description?: string
}

export default function StatsCard({ 
  title, 
  value, 
  change, 
  changeType = 'neutral', 
  icon, 
  color = 'orange',
  description
}: StatsCardProps) {
  const colorClasses = {
    orange: 'bg-gradient-to-br from-orange-500 to-orange-600',
    purple: 'bg-gradient-to-br from-purple-500 to-purple-600',
    green: 'bg-gradient-to-br from-green-500 to-green-600',
    red: 'bg-gradient-to-br from-red-500 to-red-600',
    yellow: 'bg-gradient-to-br from-yellow-500 to-yellow-600',
    blue: 'bg-gradient-to-br from-blue-500 to-blue-600',
    heartbeat: 'bg-gradient-to-br from-purple-600 via-pink-500 to-orange-500'
  }

  const changeColorClasses = {
    increase: 'text-green-600 dark:text-green-400',
    decrease: 'text-red-600 dark:text-red-400',
    neutral: 'text-slate-600 dark:text-slate-400'
  }

  const changeIcon = {
    increase: '↗',
    decrease: '↘',
    neutral: '→'
  }

  return (
    <div className="bg-white dark:bg-slate-800 overflow-hidden shadow-lg rounded-lg border border-purple-200/50 dark:border-purple-700/50 transition-all duration-300 hover:shadow-xl hover:scale-105 hover:border-purple-300 dark:hover:border-purple-600">
      <div className="p-5">
        <div className="flex items-center">
          {icon && (
            <div className={`flex-shrink-0 ${colorClasses[color]} rounded-lg p-3 shadow-lg`}>
              <div className="text-white text-xl">{icon}</div>
            </div>
          )}
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-slate-500 dark:text-slate-400 truncate">{title}</dt>
              <dd className="text-2xl font-bold text-slate-900 dark:text-slate-100">{value}</dd>
            </dl>
          </div>
        </div>
      </div>
      {change && (
        <div className="bg-gradient-to-r from-slate-50 to-purple-50/30 dark:from-slate-700 dark:to-purple-900/20 px-5 py-3 border-t border-purple-200/50 dark:border-purple-700/50">
          <div className="text-sm">
            <span className={`font-medium ${changeColorClasses[changeType]}`}>
              {changeIcon[changeType]} {change}
            </span>
            <span className="text-slate-500 dark:text-slate-400 ml-1">
              {description || 'from last month'}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
