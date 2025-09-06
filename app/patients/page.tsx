'use client'

import { useAuthStore } from '../../lib/auth'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Sidebar from '../../components/dashboard/Sidebar'

interface Patient {
  id: string
  name: string
  age: number
  gender: 'male' | 'female' | 'other'
  phone: string
  email: string
  address: string
  emergencyContact: string
  bloodType: string
  allergies: string[]
  medicalHistory: string[]
  lastVisit: string
  nextAppointment?: string
  status: 'active' | 'inactive' | 'archived'
}

const mockPatients: Patient[] = [
  {
    id: "1",
    name: "Sarah Johnson",
    age: 28,
    gender: "female",
    phone: "+254-700-123-456",
    email: "sarah.johnson@email.com",
    address: "123 Main St, Nairobi",
    emergencyContact: "John Johnson (+254-700-123-457)",
    bloodType: "O+",
    allergies: ["Penicillin", "Peanuts"],
    medicalHistory: ["Appendectomy (2020)", "Broken arm (2019)"],
    lastVisit: "2024-01-15",
    nextAppointment: "2024-02-01",
    status: "active"
  },
  {
    id: "2",
    name: "Michael Chen",
    age: 45,
    gender: "male",
    phone: "+254-700-234-567",
    email: "michael.chen@email.com",
    address: "456 Oak Ave, Mombasa",
    emergencyContact: "Lisa Chen (+254-700-234-568)",
    bloodType: "A-",
    allergies: ["Sulfa drugs"],
    medicalHistory: ["Diabetes Type 2", "Hypertension"],
    lastVisit: "2024-01-20",
    status: "active"
  },
  {
    id: "3",
    name: "Emily Davis",
    age: 32,
    gender: "female",
    phone: "+254-700-345-678",
    email: "emily.davis@email.com",
    address: "789 Pine Rd, Kisumu",
    emergencyContact: "Robert Davis (+254-700-345-679)",
    bloodType: "B+",
    allergies: [],
    medicalHistory: ["Pregnancy (2023)"],
    lastVisit: "2024-01-18",
    nextAppointment: "2024-01-25",
    status: "active"
  }
]

export default function PatientsPage() {
  const { user, isAuthenticated, isLoading } = useAuthStore()
  const router = useRouter()
  const [patients, setPatients] = useState<Patient[]>(mockPatients)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [showAddPatient, setShowAddPatient] = useState(false)

  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      router.push('/login')
    }
  }, [isAuthenticated, isLoading, router])

  const filteredPatients = patients.filter(patient => {
    const matchesSearch = patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         patient.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         patient.phone.includes(searchTerm)
    const matchesStatus = statusFilter === 'all' || patient.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const handleAddPatient = () => {
    setShowAddPatient(true)
  }

  const handleEditPatient = (patientId: string) => {
    // TODO: Implement edit functionality
    console.log('Edit patient:', patientId)
  }

  const handleDeletePatient = (patientId: string) => {
    if (confirm('Are you sure you want to delete this patient?')) {
      setPatients(patients.filter(p => p.id !== patientId))
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading patients...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar
        user={user}
        isCollapsed={isSidebarCollapsed}
        onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      <div className="flex-1 flex flex-col">
        {/* Header */}
        <nav className="bg-white shadow-sm border-b border-gray-200">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <h1 className="text-xl font-semibold text-gray-900">Patient Management</h1>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={handleAddPatient}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  + Add Patient
                </button>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {/* Filters and Search */}
          <div className="mb-6 bg-white shadow rounded-lg p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search patients by name, email, or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>
          </div>

          {/* Patient List */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                Patients ({filteredPatients.length})
              </h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Patient
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Medical Info
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredPatients.map((patient) => (
                    <tr key={patient.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                              <span className="text-sm font-medium text-gray-700">
                                {patient.name.split(' ').map(n => n[0]).join('')}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{patient.name}</div>
                            <div className="text-sm text-gray-500">{patient.age} years • {patient.gender}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{patient.phone}</div>
                        <div className="text-sm text-gray-500">{patient.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">Blood: {patient.bloodType}</div>
                        <div className="text-sm text-gray-500">
                          Allergies: {patient.allergies.length > 0 ? patient.allergies.join(', ') : 'None'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          patient.status === 'active' ? 'bg-green-100 text-green-800' :
                          patient.status === 'inactive' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {patient.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEditPatient(patient.id)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeletePatient(patient.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
