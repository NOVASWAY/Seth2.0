'use client'

import { useAuthStore } from '../../lib/auth'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Sidebar from '../../components/dashboard/Sidebar'
import { useToast } from '../../components/ui/use-toast'
import { Button } from '../../components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { Upload, FileText, CheckCircle, AlertCircle, X, Eye, Download, UserPlus, Database } from 'lucide-react'
import PatientAssignmentButton from '../../components/patients/PatientAssignmentButton'
import PatientAssignmentStatus from '../../components/patients/PatientAssignmentStatus'

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
  payment_method: 'CASH' | 'MPESA' | 'SHA' | 'PRIVATE'
  payment_reference?: string
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
  payment_method: 'CASH' | 'MPESA' | 'SHA' | 'PRIVATE'
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
    payment_method: "CASH",
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
    payment_method: "PRIVATE",
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
    payment_method: "SHA",
    created_at: "2024-01-18T10:00:00Z",
    updated_at: "2024-01-18T10:00:00Z"
  }
]

export default function PatientsPage() {
  const { user, isAuthenticated, isLoading, accessToken } = useAuthStore()
  const router = useRouter()
  const { toast } = useToast()
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [showAddPatient, setShowAddPatient] = useState(false)
  
  // Import states
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [defaultPaymentMethod, setDefaultPaymentMethod] = useState<'CASH' | 'MPESA' | 'SHA' | 'PRIVATE'>('CASH')

  // Fetch patients from backend
  const fetchPatients = async () => {
    if (!accessToken) return

    try {
      setLoading(true)
      
      const response = await fetch('http://localhost:5000/api/patients', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          // Backend returns { data: { patients: [...], pagination: {...} } }
          const patientsData = result.data?.patients || result.data || []
          setPatients(Array.isArray(patientsData) ? patientsData : [])
        } else {
          throw new Error(result.message || 'Failed to fetch patients')
        }
      } else if (response.status === 401) {
        toast({
          title: "Authentication Error",
          description: "Your session has expired. Please log in again.",
          variant: "destructive"
        })
        router.push('/login')
      } else if (response.status === 429) {
        toast({
          title: "Rate Limit Exceeded",
          description: "Too many requests. Please wait a moment and try again.",
          variant: "destructive"
        })
        // Wait 5 seconds before retrying
        setTimeout(() => {
          fetchPatients()
        }, 5000)
        return
      } else {
        // Get more specific error information
        let errorMessage = 'Failed to fetch patients'
        try {
          const errorData = await response.json()
          errorMessage = errorData.message || errorMessage
        } catch (parseError) {
          // If we can't parse the error response, use the status text
          errorMessage = `HTTP ${response.status}: ${response.statusText}`
        }
        throw new Error(errorMessage)
      }
    } catch (error) {
      console.error('Error fetching patients:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch patients'
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      router.push('/login')
    } else if (isAuthenticated && accessToken) {
      fetchPatients()
    }
  }, [isAuthenticated, isLoading, accessToken, router])

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
        payment_method: defaultPaymentMethod,
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
            payment_method: p.payment_method
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

  const filteredPatients = (patients || []).filter(patient => {
    const firstName = patient.first_name || ""
    const lastName = patient.last_name || ""
    const opNumber = patient.op_number || ""
    const area = patient.area || ""
    
    const fullName = `${firstName} ${lastName}`.toLowerCase()
    const matchesSearch = fullName.includes(searchTerm.toLowerCase()) ||
                         opNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (patient.phone_number && patient.phone_number.includes(searchTerm)) ||
                         area.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesPaymentMethod = statusFilter === 'all' || patient.payment_method === statusFilter
    
    return matchesSearch && matchesPaymentMethod
  })

  const handleAddPatient = () => {
    setShowAddPatient(true)
  }

  const handleEditPatient = async (patientId: string) => {
    // Navigate to the dedicated edit page
    router.push(`/patients/edit/${patientId}`)
  }

  const handleDeletePatient = async (patientId: string) => {
    try {
      const patient = (patients || []).find(p => p.id === patientId)
      if (!patient) {
        toast({
          title: "Error",
          description: "Patient not found",
          variant: "destructive",
        })
        return
      }

      const confirmed = confirm(`Are you sure you want to delete ${patient.first_name} ${patient.last_name}? This action cannot be undone.`)
      
      if (confirmed) {
        // In a real implementation, this would make an API call to delete the patient
        setPatients((patients || []).filter(p => p.id !== patientId))
        
        toast({
          title: "Success",
          description: "Patient deleted successfully",
          variant: "default",
        })
      }
    } catch (error) {
      console.error('Error deleting patient:', error)
      toast({
        title: "Error",
        description: "Failed to delete patient",
        variant: "destructive",
      })
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
                {/* New Patient Registration Button */}
                <Link href="/patients/register">
                  <Button className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2">
                    <UserPlus className="h-4 w-4" />
                    Register New Patient
                  </Button>
                </Link>
                
                {/* Import Patients Button */}
                <Link href="/patients/import">
                  <Button 
                    variant="outline"
                    className="border-blue-600 text-blue-600 hover:bg-blue-50 flex items-center gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    Import Patients
                  </Button>
                </Link>
                
                {/* Legacy Import Dialog (keeping for backward compatibility) */}
                <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="flex items-center gap-2">
                      <Database className="h-4 w-4" />
                      Legacy Import
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Legacy Patient Import (Deprecated)</DialogTitle>
                      <DialogDescription>
                        This is the legacy import method. For new imports, please use the dedicated Import Patients page.
                        Required columns: NAME, AGE, RESIDENCE, NUMBER, PHONE NUMBER
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

                      {/* Default Form of Payment */}
                      <div className="space-y-2">
                        <Label htmlFor="payment-method">Default Form of Payment for Registration</Label>
                        <Select value={defaultPaymentMethod} onValueChange={(value: 'CASH' | 'MPESA' | 'SHA' | 'PRIVATE') => setDefaultPaymentMethod(value)}>
                          <SelectTrigger className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-2xl z-50">
                            <SelectItem value="CASH" className="text-slate-900 dark:text-slate-100 hover:bg-blue-100 dark:hover:bg-blue-900 font-medium py-3 cursor-pointer">
                              💵 Cash Payment
                            </SelectItem>
                            <SelectItem value="MPESA" className="text-slate-900 dark:text-slate-100 hover:bg-green-100 dark:hover:bg-green-900 font-medium py-3 cursor-pointer">
                              📱 M-Pesa
                            </SelectItem>
                            <SelectItem value="SHA" className="text-slate-900 dark:text-slate-100 hover:bg-purple-100 dark:hover:bg-purple-900 font-medium py-3 cursor-pointer">
                              🏥 SHA (Social Health Authority)
                            </SelectItem>
                            <SelectItem value="PRIVATE" className="text-slate-900 dark:text-slate-100 hover:bg-orange-100 dark:hover:bg-orange-900 font-medium py-3 cursor-pointer">
                              🛡️ Private Insurance
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
                  <option value="all">All Payment Methods</option>
                  <option value="CASH">💵 Cash</option>
                  <option value="MPESA">📱 M-Pesa</option>
                  <option value="SHA">🏥 SHA</option>
                  <option value="PRIVATE">🛡️ Private</option>
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
                      OP Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-300 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-300 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-300 uppercase tracking-wider">
                      Payment Method
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-300 uppercase tracking-wider">
                      Assignments
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center">
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                          <span className="ml-2 text-gray-600 dark:text-gray-400">Loading patients...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredPatients.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center">
                        <div className="text-gray-500 dark:text-gray-400">
                          <div className="text-4xl mb-4">👥</div>
                          <p className="text-lg font-medium">No patients found</p>
                          <p className="text-sm">Start by adding your first patient</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredPatients.map((patient) => (
                    <tr key={patient.id} className="hover:bg-gray-50 dark:hover:bg-slate-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-gray-300 dark:bg-slate-600 flex items-center justify-center">
                              <span className="text-sm font-medium text-gray-700 dark:text-slate-300">
                                {(patient.first_name || 'F')[0]}{(patient.last_name || 'L')[0]}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900 dark:text-slate-100">
                              {patient.first_name || 'Unknown'} {patient.last_name || 'Patient'}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-slate-400">
                              OP: {patient.op_number} • {patient.age ? `${patient.age} years` : 'Age N/A'} • {patient.gender || 'Gender N/A'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-mono font-medium text-blue-600 dark:text-blue-400">
                          {patient.op_number}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-slate-400">
                          Patient ID
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
                          patient.payment_method === 'CASH' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                          patient.payment_method === 'MPESA' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200' :
                          patient.payment_method === 'SHA' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                          'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
                        }`}>
                          {patient.payment_method === 'CASH' ? '💵 Cash' :
                           patient.payment_method === 'MPESA' ? '📱 M-Pesa' :
                           patient.payment_method === 'SHA' ? '🏥 SHA' :
                           '🛡️ Private'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <PatientAssignmentStatus 
                          patientId={patient.id} 
                          compact={true}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex flex-col space-y-2">
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
                          <div className="flex items-center space-x-2">
                            <PatientAssignmentButton 
                              patient={patient} 
                              onAssignmentCreated={() => {
                                // Refresh assignments if needed
                              }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
