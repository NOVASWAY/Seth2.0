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

interface ApiPatient {
  id?: string
  patient_id?: string
  firstName?: string
  first_name?: string
  lastName?: string
  last_name?: string
  age?: number
  gender?: string
  priority?: string
  status?: string
  waitTime?: number
  wait_time?: number
  department?: string
  area?: string
  doctor?: string
  assigned_doctor?: string
  [key: string]: any
}

interface PatientQueueProps {
  patients: ApiPatient[] | Patient[]
  title?: string
  maxPatients?: number
}

export default function PatientQueue({ 
  patients, 
  title = "Patient Queue", 
  maxPatients = 10 
}: PatientQueueProps) {
  // Ensure patients is always an array and transform data to match expected format
  const safePatients: Patient[] = Array.isArray(patients) ? patients.map((patient: ApiPatient | Patient): Patient => {
    // Check if it's already in the correct format
    if ('name' in patient && typeof patient.name === 'string') {
      return patient as Patient
    }
    
    // Transform API data to expected format
    const apiPatient = patient as ApiPatient
    const firstName = apiPatient.firstName || apiPatient.first_name || ''
    const lastName = apiPatient.lastName || apiPatient.last_name || ''
    const fullName = `${firstName} ${lastName}`.trim() || 'Unknown Patient'
    
    return {
      id: apiPatient.id || apiPatient.patient_id || Math.random().toString(36).substr(2, 9),
      name: fullName,
      age: apiPatient.age || 0,
      gender: (apiPatient.gender?.toLowerCase() === 'male' || apiPatient.gender?.toLowerCase() === 'female') 
        ? apiPatient.gender.toLowerCase() as 'male' | 'female' 
        : 'other',
      priority: (apiPatient.priority?.toLowerCase() === 'high' || apiPatient.priority?.toLowerCase() === 'low') 
        ? apiPatient.priority.toLowerCase() as 'high' | 'low' 
        : 'medium',
      status: (apiPatient.status?.toLowerCase() === 'in-progress' || apiPatient.status?.toLowerCase() === 'completed' || apiPatient.status?.toLowerCase() === 'cancelled') 
        ? apiPatient.status.toLowerCase() as 'in-progress' | 'completed' | 'cancelled' 
        : 'waiting',
      waitTime: apiPatient.waitTime || apiPatient.wait_time || 0,
      department: apiPatient.department || apiPatient.area || 'General',
      doctor: apiPatient.doctor || apiPatient.assigned_doctor || undefined
    }
  }) : []
  const getPriorityColor = (priority: Patient['priority']) => {
    const colors = {
      high: 'bg-gradient-to-r from-red-100 to-pink-100 text-red-800 dark:from-red-900/30 dark:to-pink-900/30 dark:text-red-400',
      medium: 'bg-gradient-to-r from-orange-100 to-yellow-100 text-orange-800 dark:from-orange-900/30 dark:to-yellow-900/30 dark:text-orange-400',
      low: 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 dark:from-green-900/30 dark:to-emerald-900/30 dark:text-green-400'
    }
    return colors[priority]
  }

  const getStatusColor = (status: Patient['status']) => {
    const colors = {
      waiting: 'bg-gradient-to-r from-purple-100 to-blue-100 text-purple-800 dark:from-purple-900/30 dark:to-blue-900/30 dark:text-purple-400',
      'in-progress': 'bg-gradient-to-r from-orange-100 to-yellow-100 text-orange-800 dark:from-orange-900/30 dark:to-yellow-900/30 dark:text-orange-400',
      completed: 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 dark:from-green-900/30 dark:to-emerald-900/30 dark:text-green-400',
      cancelled: 'bg-gradient-to-r from-gray-100 to-slate-100 text-gray-800 dark:from-gray-800 dark:to-slate-800 dark:text-gray-400'
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

  const sortedPatients = [...safePatients]
    .filter(patient => patient && patient.id && patient.name) // Filter out invalid patients
    .sort((a, b) => {
      // Sort by priority first, then by wait time
      const priorityOrder = { high: 3, medium: 2, low: 1 }
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority]
      if (priorityDiff !== 0) return priorityDiff
      return (b.waitTime || 0) - (a.waitTime || 0)
    })
    .slice(0, maxPatients)

  return (
    <div className="bg-white dark:bg-slate-800 shadow rounded-lg border border-purple-200/50 dark:border-purple-700/50 hover:border-purple-300 dark:hover:border-purple-600 transition-all duration-300">
      <div className="px-6 py-4 border-b border-purple-200/50 dark:border-purple-700/50">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100">{title}</h3>
          <span className="text-sm text-gray-500 dark:text-slate-400">
            {safePatients.filter(p => p.status === 'waiting').length} waiting
          </span>
        </div>
      </div>
      <div className="divide-y divide-purple-200/30 dark:divide-purple-700/30">
        {sortedPatients.map((patient) => (
          <div key={patient.id} className="px-6 py-4 hover:bg-gradient-to-r hover:from-purple-50 hover:to-orange-50 dark:hover:from-purple-900/20 dark:hover:to-orange-900/20 transition-all duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-orange-400 dark:from-purple-600 dark:to-orange-600 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-white">
                      {patient.name.split(' ').map(n => n?.[0] || '').join('').toUpperCase() || '??'}
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
