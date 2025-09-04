interface Patient {
  id: string
  name: string
  age: number
  gender: 'male' | 'female' | 'other'
  priority: 'high' | 'medium' | 'low'
  status: 'waiting' | 'in-progress' | 'completed' | 'cancelled'
  waitTime: number // in minutes
  department: string
  doctor?: string
}

interface PatientQueueProps {
  patients: Patient[]
  title?: string
  maxPatients?: number
}

export default function PatientQueue({ 
  patients, 
  title = "Patient Queue", 
  maxPatients = 10 
}: PatientQueueProps) {
  const getPriorityColor = (priority: Patient['priority']) => {
    const colors = {
      high: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
      medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
      low: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
    }
    return colors[priority]
  }

  const getStatusColor = (status: Patient['status']) => {
    const colors = {
      waiting: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
      'in-progress': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
      completed: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
    }
    return colors[status]
  }

  const getStatusIcon = (status: Patient['status']) => {
    const icons = {
      waiting: '⏳',
      'in-progress': '🔄',
      completed: '✅',
      cancelled: '❌'
    }
    return icons[status]
  }

  const formatWaitTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
  }

  const sortedPatients = [...patients]
    .sort((a, b) => {
      // Sort by priority first, then by wait time
      const priorityOrder = { high: 3, medium: 2, low: 1 }
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority]
      if (priorityDiff !== 0) return priorityDiff
      return b.waitTime - a.waitTime
    })
    .slice(0, maxPatients)

  return (
    <div className="bg-white dark:bg-slate-800 shadow rounded-lg border border-slate-200 dark:border-slate-700">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100">{title}</h3>
          <span className="text-sm text-gray-500 dark:text-slate-400">
            {patients.filter(p => p.status === 'waiting').length} waiting
          </span>
        </div>
      </div>
      <div className="divide-y divide-gray-200 dark:divide-slate-700">
        {sortedPatients.map((patient) => (
          <div key={patient.id} className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-gray-300 dark:bg-slate-600 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-gray-700 dark:text-slate-300">
                      {patient.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-slate-100 truncate">
                    {patient.name}
                  </p>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-xs text-gray-500 dark:text-slate-400">
                      {patient.age} years • {patient.gender}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-slate-400">
                      {patient.department}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(patient.priority)}`}>
                  {patient.priority}
                </span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(patient.status)}`}>
                  {getStatusIcon(patient.status)} {patient.status}
                </span>
                <span className="text-xs text-gray-500 dark:text-slate-400">
                  {formatWaitTime(patient.waitTime)}
                </span>
              </div>
            </div>
            {patient.doctor && (
              <div className="mt-2 text-xs text-gray-500 dark:text-slate-400">
                Assigned to: Dr. {patient.doctor}
              </div>
            )}
          </div>
        ))}
      </div>
      {sortedPatients.length === 0 && (
        <div className="px-6 py-8 text-center">
          <p className="text-gray-500 dark:text-slate-400">No patients in queue</p>
        </div>
      )}
    </div>
  )
}
