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
      high: 'bg-red-100 text-red-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-green-100 text-green-800'
    }
    return colors[priority]
  }

  const getStatusColor = (status: Patient['status']) => {
    const colors = {
      waiting: 'bg-blue-100 text-blue-800',
      'in-progress': 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-gray-100 text-gray-800'
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
    <div className="bg-white shadow rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">{title}</h3>
          <span className="text-sm text-gray-500">
            {patients.filter(p => p.status === 'waiting').length} waiting
          </span>
        </div>
      </div>
      <div className="divide-y divide-gray-200">
        {sortedPatients.map((patient) => (
          <div key={patient.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-gray-700">
                      {patient.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {patient.name}
                  </p>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-xs text-gray-500">
                      {patient.age} years • {patient.gender}
                    </span>
                    <span className="text-xs text-gray-500">
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
                <span className="text-xs text-gray-500">
                  {formatWaitTime(patient.waitTime)}
                </span>
              </div>
            </div>
            {patient.doctor && (
              <div className="mt-2 text-xs text-gray-500">
                Assigned to: Dr. {patient.doctor}
              </div>
            )}
          </div>
        ))}
      </div>
      {sortedPatients.length === 0 && (
        <div className="px-6 py-8 text-center">
          <p className="text-gray-500">No patients in queue</p>
        </div>
      )}
    </div>
  )
}
