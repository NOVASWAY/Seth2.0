'use client'

import { useAuthStore } from '../../lib/auth'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Sidebar from '../../components/dashboard/Sidebar'
import { useToast } from '../../components/ui/use-toast'
import { Button } from '../../components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { Upload, FileText, CheckCircle, AlertCircle, X, Eye, Download } from 'lucide-react'

interface Patient {
  id: string
  op_number: string
  first_name: string
  last_name: string
  date_of_birth?: string
  age?: number
  gender?: 'MALE' | 'FEMALE' | 'OTHER'
  phone_number?: string
  area?: string
  next_of_kin?: string
  next_of_kin_phone?: string
  insurance_type: 'SHA' | 'PRIVATE' | 'CASH'
  insurance_number?: string
  created_at: string
  updated_at: string
}

interface ImportedPatient {
  op_number: string
  first_name: string
  last_name: string
  age?: number
  date_of_birth?: string
  area?: string
  phone_number?: string
  insurance_type: 'SHA' | 'PRIVATE' | 'CASH'
  gender?: 'MALE' | 'FEMALE' | 'OTHER'
  errors?: string[]
  isValid: boolean
}

interface ImportPreview {
  patients: ImportedPatient[]
  totalCount: number
  validCount: number
  errorCount: number
  duplicateOpNumbers: string[]
}

const mockPatients: Patient[] = [
  {
    id: "1",
    op_number: "001/25",
    first_name: "Sarah",
    last_name: "Johnson",
    age: 28,
    gender: "FEMALE",
    phone_number: "+254-700-123-456",
    area: "Nairobi",
    insurance_type: "CASH",
    created_at: "2024-01-15T10:00:00Z",
    updated_at: "2024-01-15T10:00:00Z"
  },
  {
    id: "2",
    op_number: "002/25",
    first_name: "Michael",
    last_name: "Chen",
    age: 45,
    gender: "MALE",
    phone_number: "+254-700-234-567",
    area: "Mombasa",
    insurance_type: "PRIVATE",
    created_at: "2024-01-20T10:00:00Z",
    updated_at: "2024-01-20T10:00:00Z"
  },
  {
    id: "3",
    op_number: "003/25",
    first_name: "Emily",
    last_name: "Davis",
    age: 32,
    gender: "FEMALE",
    phone_number: "+254-700-345-678",
    area: "Kisumu",
    insurance_type: "SHA",
    created_at: "2024-01-18T10:00:00Z",
    updated_at: "2024-01-18T10:00:00Z"
  }
]

export default function PatientsPage() {
  const { user, isAuthenticated, isLoading, accessToken } = useAuthStore()
  const router = useRouter()
  const { toast } = useToast()
  const [patients, setPatients] = useState<Patient[]>(mockPatients)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [showAddPatient, setShowAddPatient] = useState(false)
  
  // Import states
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [defaultInsuranceType, setDefaultInsuranceType] = useState<'SHA' | 'PRIVATE' | 'CASH'>('CASH')

  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      router.push('/login')
    }
  }, [isAuthenticated, isLoading, router])

  // Process age string to calculate date of birth
  const processAge = (ageString: string): { age: number; dateOfBirth: string } => {
    if (ageString.includes('yrs')) {
      const years = parseInt(ageString.replace('yrs', '').trim())
      const currentYear = new Date().getFullYear()
      const birthYear = currentYear - years
      return {
        age: years,
        dateOfBirth: `${birthYear}-01-01`
      }
    } else if (ageString.includes('mhts')) {
      const months = parseInt(ageString.replace('mhts', '').trim())
      const currentDate = new Date()
      const birthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - months, 1)
      return {
        age: 0,
        dateOfBirth: birthDate.toISOString().split('T')[0]
      }
    }
    return { age: 0, dateOfBirth: new Date().toISOString().split('T')[0] }
  }

  // Parse CSV data
  const parseCSVData = (csvContent: string): ImportedPatient[] => {
    const lines = csvContent.split('\n').filter(line => line.trim())
    if (lines.length < 2) {
      throw new Error('CSV file must have at least a header row and one data row')
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
    const data = lines.slice(1)

    // Validate required headers
    const requiredHeaders = ['name', 'age', 'residence', 'number', 'phone number']
    const missingHeaders = requiredHeaders.filter(header => 
      !headers.some(h => h.includes(header.replace(' ', '')))
    )
    
    if (missingHeaders.length > 0) {
      throw new Error(`Missing required columns: ${missingHeaders.join(', ')}`)
    }

    const patients: ImportedPatient[] = []
    const existingOpNumbers = patients.map(p => p.op_number)

    data.forEach((line, index) => {
      const values = line.split(',').map(v => v.trim())
      const row: any = {}
      headers.forEach((header, headerIndex) => {
        row[header] = values[headerIndex] || ''
      })

      const errors: string[] = []
      let isValid = true

      // Extract and validate data
      const fullName = row.name || ''
      const nameParts = fullName.split(' ').filter((part: string) => part.trim())
      const firstName = nameParts[0] || ''
      const lastName = nameParts.slice(1).join(' ') || ''

      const opNumber = row.number || ''
      const ageString = row.age || ''
      const residence = row.residence || ''
      const phoneNumber = row['phone number'] || ''

      // Validate required fields
      if (!firstName) {
        errors.push('First name is required')
        isValid = false
      }
      if (!lastName) {
        errors.push('Last name is required')
        isValid = false
      }
      if (!opNumber) {
        errors.push('OP number is required')
        isValid = false
      }

      // Check for duplicate OP numbers
      if (opNumber && existingOpNumbers.includes(opNumber)) {
        errors.push('Duplicate OP number')
        isValid = false
      }

      // Process age
      let age = 0
      let dateOfBirth = ''
      if (ageString) {
        try {
          const ageData = processAge(ageString)
          age = ageData.age
          dateOfBirth = ageData.dateOfBirth
        } catch (error) {
          errors.push('Invalid age format')
          isValid = false
        }
      }

      // Validate phone number format (optional)
      if (phoneNumber && !/^[0-9+\-\s()]+$/.test(phoneNumber)) {
        errors.push('Invalid phone number format')
        isValid = false
      }

      const patient: ImportedPatient = {
        op_number: opNumber,
        first_name: firstName,
        last_name: lastName,
        age: age || undefined,
        date_of_birth: dateOfBirth || undefined,
        area: residence || undefined,
        phone_number: phoneNumber || undefined,
        insurance_type: defaultInsuranceType,
        errors: errors.length > 0 ? errors : undefined,
        isValid
      }

      patients.push(patient)
      if (opNumber) {
        existingOpNumbers.push(opNumber)
      }
    })

    return patients
  }

  // Handle CSV file upload
  const handleCSVUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      toast({
        title: "Invalid File Type",
        description: "Please select a CSV file.",
        variant: "destructive",
      })
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const csvContent = e.target?.result as string
        const importedPatients = parseCSVData(csvContent)
        
        const validPatients = importedPatients.filter(p => p.isValid)
        const errorPatients = importedPatients.filter(p => !p.isValid)
        const duplicateOpNumbers = importedPatients
          .filter(p => p.errors?.includes('Duplicate OP number'))
          .map(p => p.op_number)

        setImportPreview({
          patients: importedPatients,
          totalCount: importedPatients.length,
          validCount: validPatients.length,
          errorCount: errorPatients.length,
          duplicateOpNumbers
        })

        toast({
          title: "Patient Data Parsed Successfully",
          description: `Found ${importedPatients.length} patients ready for registration. ${validPatients.length} valid, ${errorPatients.length} with errors.`,
        })
      } catch (error) {
        toast({
          title: "Import Error",
          description: error instanceof Error ? error.message : "Failed to parse CSV file.",
          variant: "destructive",
        })
      }
    }
    reader.readAsText(file)
  }

  // Import patients to database
  const handleImportPatients = async () => {
    if (!importPreview || !accessToken) return

    const validPatients = importPreview.patients.filter(p => p.isValid)
    if (validPatients.length === 0) {
      toast({
        title: "No Valid Patients",
        description: "Please fix the errors before importing.",
        variant: "destructive",
      })
      return
    }

    setIsImporting(true)
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/patients/import`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          patients: validPatients.map(p => ({
            op_number: p.op_number,
            first_name: p.first_name,
            last_name: p.last_name,
            age: p.age,
            date_of_birth: p.date_of_birth,
            area: p.area,
            phone_number: p.phone_number,
            insurance_type: p.insurance_type
          }))
        })
      })

      if (!response.ok) {
        if (response.status === 401) {
          toast({
            title: "Authentication Error",
            description: "Your session has expired. Please log in again.",
            variant: "destructive",
          })
          return
        }
        throw new Error(`Failed to import patients: ${response.status}`)
      }

      const result = await response.json()
      
      toast({
        title: "Registration Successful",
        description: `Successfully registered ${validPatients.length} patients.`,
      })

      // Refresh patient list
      // fetchPatients() // TODO: Implement this when backend is ready
      
      setShowImportDialog(false)
      setImportPreview(null)
    } catch (error) {
      toast({
        title: "Registration Failed",
        description: error instanceof Error ? error.message : "Failed to register patients.",
        variant: "destructive",
      })
    } finally {
      setIsImporting(false)
    }
  }

  const filteredPatients = patients.filter(patient => {
    const fullName = `${patient.first_name} ${patient.last_name}`.toLowerCase()
    const matchesSearch = fullName.includes(searchTerm.toLowerCase()) ||
                         patient.op_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (patient.phone_number && patient.phone_number.includes(searchTerm)) ||
                         (patient.area && patient.area.toLowerCase().includes(searchTerm.toLowerCase()))
    return matchesSearch
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
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex">
      <Sidebar
        user={user}
        isCollapsed={isSidebarCollapsed}
        onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      <div className="flex-1 flex flex-col">
        {/* Header */}
        <nav className="bg-white dark:bg-slate-800 shadow-sm border-b border-gray-200 dark:border-slate-700">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <h1 className="text-xl font-semibold text-gray-900 dark:text-slate-100">Patient Registration & Management</h1>
              </div>
              <div className="flex items-center space-x-4">
                <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
                  <DialogTrigger asChild>
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2">
                      <Upload className="h-4 w-4" />
                      Register Patients
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Register Patients from CSV</DialogTitle>
                      <DialogDescription>
                        Upload a CSV file with patient data to register multiple patients at once. Required columns: NAME, AGE, RESIDENCE, NUMBER, PHONE NUMBER
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-6">
                      {/* Registration Info */}
                      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0">
                            <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                              Patient Registration via CSV
                            </h4>
                            <p className="text-sm text-blue-700 dark:text-blue-300">
                              This is the primary method for registering patients in the system. Prepare your patient data in CSV format and upload it here. 
                              The system will validate the data and register all valid patients automatically.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* File Upload */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="csv-file">Select Patient Registration CSV File</Label>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const link = document.createElement('a')
                              link.href = '/patient-registration-template.csv'
                              link.download = 'patient-registration-template.csv'
                              link.click()
                            }}
                            className="flex items-center gap-1"
                          >
                            <Download className="h-3 w-3" />
                            Download Registration Template
                          </Button>
                        </div>
                        <Input
                          id="csv-file"
                          type="file"
                          accept=".csv"
                          onChange={handleCSVUpload}
                          className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                        />
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Required columns: NAME, AGE, RESIDENCE, NUMBER, PHONE NUMBER. This is the primary method for patient registration.
                        </p>
                      </div>

                      {/* Default Insurance Type */}
                      <div className="space-y-2">
                        <Label htmlFor="insurance-type">Default Insurance Type for Registration</Label>
                        <Select value={defaultInsuranceType} onValueChange={(value: 'SHA' | 'PRIVATE' | 'CASH') => setDefaultInsuranceType(value)}>
                          <SelectTrigger className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                            <SelectItem value="CASH" className="text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700">
                              Cash Payment
                            </SelectItem>
                            <SelectItem value="SHA" className="text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700">
                              SHA Insurance
                            </SelectItem>
                            <SelectItem value="PRIVATE" className="text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700">
                              Private Insurance
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Import Preview */}
                      {importPreview && (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">Registration Preview</h3>
                            <div className="flex gap-2">
                              <Badge variant="outline" className="text-slate-700 dark:text-slate-300">
                                Total: {importPreview.totalCount}
                              </Badge>
                              <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                Valid: {importPreview.validCount}
                              </Badge>
                              {importPreview.errorCount > 0 && (
                                <Badge variant="destructive">
                                  Errors: {importPreview.errorCount}
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* Patient List Preview */}
                          <div className="max-h-60 overflow-y-auto border rounded-lg">
                            <table className="w-full text-sm">
                              <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0">
                                <tr>
                                  <th className="px-3 py-2 text-left text-slate-700 dark:text-slate-300">OP Number</th>
                                  <th className="px-3 py-2 text-left text-slate-700 dark:text-slate-300">Name</th>
                                  <th className="px-3 py-2 text-left text-slate-700 dark:text-slate-300">Age</th>
                                  <th className="px-3 py-2 text-left text-slate-700 dark:text-slate-300">Area</th>
                                  <th className="px-3 py-2 text-left text-slate-700 dark:text-slate-300">Phone</th>
                                  <th className="px-3 py-2 text-left text-slate-700 dark:text-slate-300">Status</th>
                                </tr>
                              </thead>
                              <tbody className="bg-white dark:bg-slate-900">
                                {importPreview.patients.slice(0, 10).map((patient, index) => (
                                  <tr key={index} className="border-t border-slate-200 dark:border-slate-700">
                                    <td className="px-3 py-2 text-slate-900 dark:text-slate-100">{patient.op_number}</td>
                                    <td className="px-3 py-2 text-slate-900 dark:text-slate-100">
                                      {patient.first_name} {patient.last_name}
                                    </td>
                                    <td className="px-3 py-2 text-slate-900 dark:text-slate-100">{patient.age || 'N/A'}</td>
                                    <td className="px-3 py-2 text-slate-900 dark:text-slate-100">{patient.area || 'N/A'}</td>
                                    <td className="px-3 py-2 text-slate-900 dark:text-slate-100">{patient.phone_number || 'N/A'}</td>
                                    <td className="px-3 py-2">
                                      {patient.isValid ? (
                                        <CheckCircle className="h-4 w-4 text-green-600" />
                                      ) : (
                                        <AlertCircle className="h-4 w-4 text-red-600" />
                                      )}
                                    </td>
                                  </tr>
                                ))}
                                {importPreview.patients.length > 10 && (
                                  <tr>
                                    <td colSpan={6} className="px-3 py-2 text-center text-slate-500 dark:text-slate-400">
                                      ... and {importPreview.patients.length - 10} more patients
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>

                          {/* Error Details */}
                          {importPreview.errorCount > 0 && (
                            <div className="space-y-2">
                              <h4 className="font-medium text-red-600 dark:text-red-400">Errors Found:</h4>
                              <div className="max-h-32 overflow-y-auto text-sm">
                                {importPreview.patients
                                  .filter(p => !p.isValid)
                                  .slice(0, 5)
                                  .map((patient, index) => (
                                    <div key={index} className="text-red-600 dark:text-red-400">
                                      <strong>{patient.op_number}:</strong> {patient.errors?.join(', ')}
                                    </div>
                                  ))}
                                {importPreview.patients.filter(p => !p.isValid).length > 5 && (
                                  <div className="text-slate-500 dark:text-slate-400">
                                    ... and {importPreview.patients.filter(p => !p.isValid).length - 5} more errors
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Import Actions */}
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              onClick={() => {
                                setShowImportDialog(false)
                                setImportPreview(null)
                              }}
                            >
                              Cancel
                            </Button>
                            <Button
                              onClick={handleImportPatients}
                              disabled={isImporting || importPreview.validCount === 0}
                              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              {isImporting ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                  Registering...
                                </>
                              ) : (
                                <>
                                  <Upload className="h-4 w-4" />
                                  Register {importPreview.validCount} Patients
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {/* Filters and Search */}
          <div className="mb-6 bg-white dark:bg-slate-800 shadow rounded-lg p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search patients by name, OP number, phone, or area..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                >
                  <option value="all">All Insurance Types</option>
                  <option value="CASH">Cash</option>
                  <option value="SHA">SHA</option>
                  <option value="PRIVATE">Private</option>
                </select>
              </div>
            </div>
          </div>

          {/* Patient List */}
          <div className="bg-white dark:bg-slate-800 shadow rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100">
                Patients ({filteredPatients.length})
              </h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                <thead className="bg-gray-50 dark:bg-slate-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-300 uppercase tracking-wider">
                      Patient
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-300 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-300 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-300 uppercase tracking-wider">
                      Insurance
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                  {filteredPatients.map((patient) => (
                    <tr key={patient.id} className="hover:bg-gray-50 dark:hover:bg-slate-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-gray-300 dark:bg-slate-600 flex items-center justify-center">
                              <span className="text-sm font-medium text-gray-700 dark:text-slate-300">
                                {patient.first_name[0]}{patient.last_name[0]}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900 dark:text-slate-100">
                              {patient.first_name} {patient.last_name}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-slate-400">
                              OP: {patient.op_number} • {patient.age ? `${patient.age} years` : 'Age N/A'} • {patient.gender || 'Gender N/A'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-slate-100">
                          {patient.phone_number || 'No phone'}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-slate-400">
                          {patient.date_of_birth ? `DOB: ${new Date(patient.date_of_birth).toLocaleDateString()}` : 'DOB: N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-slate-100">
                          {patient.area || 'No area specified'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          patient.insurance_type === 'CASH' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                          patient.insurance_type === 'SHA' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                          'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                        }`}>
                          {patient.insurance_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEditPatient(patient.id)}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeletePatient(patient.id)}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
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
