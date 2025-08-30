interface QuickAction {
  id: string
  title: string
  description: string
  icon: string
  href: string
  color: 'blue' | 'green' | 'red' | 'yellow' | 'purple'
  badge?: string
}

interface QuickActionsProps {
  actions: QuickAction[]
  title?: string
}

export default function QuickActions({ actions, title = "Quick Actions" }: QuickActionsProps) {
  const getColorClasses = (color: QuickAction['color']) => {
    const colors = {
      blue: 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200',
      green: 'bg-green-50 text-green-700 hover:bg-green-100 border-green-200',
      red: 'bg-red-50 text-red-700 hover:bg-red-100 border-red-200',
      yellow: 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100 border-yellow-200',
      purple: 'bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200'
    }
    return colors[color]
  }

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">{title}</h3>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {actions.map((action) => (
            <a
              key={action.id}
              href={action.href}
              className={`relative group p-4 rounded-lg border-2 transition-all duration-200 ${getColorClasses(action.color)}`}
            >
              <div className="flex items-center space-x-3">
                <div className="text-2xl">{action.icon}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{action.title}</p>
                  <p className="text-xs opacity-75 truncate">{action.description}</p>
                </div>
                {action.badge && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-white bg-opacity-75">
                    {action.badge}
                  </span>
                )}
              </div>
              <div className="absolute inset-0 rounded-lg ring-2 ring-transparent group-hover:ring-current group-hover:ring-opacity-20 transition-all duration-200" />
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
