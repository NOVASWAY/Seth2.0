'use client'

import { useState, useRef } from 'react'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Alert, AlertDescription } from '../ui/alert'
import { Badge } from '../ui/badge'
import { Progress } from '../ui/progress'
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  XCircle, 
  Download,
  AlertTriangle,
  Users,
  Database
} from 'lucide-react'
import { useToast } from '../../hooks/use-toast'

interface ImportPreview {
  patients: Array<{
    op_number: string
    first_name: string
    last_name: string
    age?: number
    date_of_birth?: string
    area?: string
    phone_number?: string
    insurance_type: string
    isValid: boolean
    errors: string[]
  }>
  totalCount: number
  validCount: number
  invalidCount: number
}

interface PatientImportFormProps {
  onSuccess?: (results: any) => void
  onCancel?: () => void
}

export function PatientImportForm({ onSuccess, onCancel }: PatientImportFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null)
  const [error, setError] = useState('')
  const [importProgress, setImportProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.csv')) {
      setError('Please upload a CSV file')
      return
    }

    setIsLoading(true)
    setError('')
    setImportPreview(null)

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const csvText = event.target?.result as string
        const lines = csvText.split('\n').filter(line => line.trim())
        
        if (lines.length < 2) {
          setError('CSV file must contain at least a header row and one data row')
          setIsLoading(false)
          return
        }

        const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
        const requiredHeaders = ['op_number', 'first_name', 'last_name', 'insurance_type']
        
        const missingHeaders = requiredHeaders.filter(h => !headers.includes(h))
        if (missingHeaders.length > 0) {
          setError(`Missing required headers: ${missingHeaders.join(', ')}`)
          setIsLoading(false)
          return
        }

        const patients = []
        let validCount = 0
        let invalidCount = 0

        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim())
          const patient: any = {}
          const errors: string[] = []

          // Map CSV columns to patient data
          headers.forEach((header, index) => {
            const value = values[index] || ''
            switch (header) {
              case 'op_number':
                patient.op_number = value
                if (!value) errors.push('OP number is required')
                break
              case 'first_name':
                patient.first_name = value
                if (!value) errors.push('First name is required')
                break
              case 'last_name':
                patient.last_name = value
                if (!value) errors.push('Last name is required')
                break
              case 'age':
                patient.age = value ? parseInt(value) : undefined
                if (value && (isNaN(parseInt(value)) || parseInt(value) < 0 || parseInt(value) > 150)) {
                  errors.push('Age must be between 0 and 150')
                }
                break
              case 'date_of_birth':
                patient.date_of_birth = value
                if (value && isNaN(Date.parse(value))) {
                  errors.push('Invalid date of birth format')
                }
                break
              case 'area':
                patient.area = value
                break
              case 'phone_number':
                patient.phone_number = value
                break
              case 'insurance_type':
                patient.insurance_type = value.toUpperCase()
                if (!['SHA', 'PRIVATE', 'CASH'].includes(value.toUpperCase())) {
                  errors.push('Insurance type must be SHA, PRIVATE, or CASH')
                }
                break
            }
          })

          patient.isValid = errors.length === 0
          patient.errors = errors

          if (patient.isValid) {
            validCount++
          } else {
            invalidCount++
          }

          patients.push(patient)
        }

        setImportPreview({
          patients,
          totalCount: patients.length,
          validCount,
          invalidCount
        })

      } catch (err) {
        setError('Error parsing CSV file. Please check the format.')
      } finally {
        setIsLoading(false)
      }
    }

    reader.readAsText(file)
  }

  const handleImport = async () => {
    if (!importPreview) return

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
    setImportProgress(0)

    try {
      const accessToken = localStorage.getItem('accessToken')
      if (!accessToken) {
        throw new Error('Authentication required')
      }

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
          throw new Error('Authentication expired. Please log in again.')
        }
        throw new Error(`Import failed: ${response.status}`)
      }

      const result = await response.json()
      setImportProgress(100)

      toast({
        title: "Import Successful",
        description: `Successfully imported ${validPatients.length} patients.`,
        variant: "default",
      })

      onSuccess?.(result)
    } catch (err: any) {
      setError(err.message || 'Import failed')
      toast({
        title: "Import Failed",
        description: err.message || 'Failed to import patients',
        variant: "destructive",
      })
    } finally {
      setIsImporting(false)
    }
  }

  const downloadTemplate = () => {
    const csvContent = [
      'op_number,first_name,last_name,age,date_of_birth,area,phone_number,insurance_type',
      'OP2024001,John,Doe,30,1994-01-15,Nairobi,+254712345678,SHA',
      'OP2024002,Jane,Smith,25,1999-05-20,Mombasa,+254723456789,PRIVATE',
      'OP2024003,Bob,Johnson,45,1979-12-10,Kisumu,+254734567890,CASH'
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'patient_import_template.csv'
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Patient Data Import
        </CardTitle>
        <CardDescription>
          Import existing patient data from CSV files. This is for bulk importing patients
          from other systems or legacy databases, not for registering new patients.
        </CardDescription>
        
        {/* Import Type Indicator */}
        <div className="mt-4 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
            <span className="text-sm font-medium text-orange-700 dark:text-orange-300">
              Bulk Import Mode
            </span>
          </div>
          <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
            For registering individual new patients, use the New Patient Registration form.
          </p>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* File Upload Section */}
        {!importPreview && (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
              <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Upload Patient Data CSV</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Select a CSV file containing patient data to import
              </p>
              
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
              />
              
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                className="mr-4"
              >
                {isLoading ? 'Processing...' : 'Select CSV File'}
              </Button>
              
              <Button
                variant="outline"
                onClick={downloadTemplate}
              >
                <Download className="h-4 w-4 mr-2" />
                Download Template
              </Button>
            </div>

            {/* CSV Format Requirements */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <h4 className="font-medium mb-2">CSV Format Requirements:</h4>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li>• <strong>Required columns:</strong> op_number, first_name, last_name, insurance_type</li>
                <li>• <strong>Optional columns:</strong> age, date_of_birth, area, phone_number</li>
                <li>• <strong>Insurance types:</strong> SHA, PRIVATE, CASH</li>
                <li>• <strong>Date format:</strong> YYYY-MM-DD (e.g., 1994-01-15)</li>
                <li>• <strong>OP numbers:</strong> Must be unique across the system</li>
              </ul>
            </div>
          </div>
        )}

        {/* Import Preview */}
        {importPreview && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Import Preview</h3>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setImportPreview(null)
                    setError('')
                    if (fileInputRef.current) fileInputRef.current.value = ''
                  }}
                >
                  Upload Different File
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={isImporting || importPreview.validCount === 0}
                >
                  {isImporting ? 'Importing...' : `Import ${importPreview.validCount} Patients`}
                </Button>
              </div>
            </div>

            {/* Import Statistics */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  <span className="font-medium text-blue-900 dark:text-blue-100">Total</span>
                </div>
                <p className="text-2xl font-bold text-blue-600">{importPreview.totalCount}</p>
              </div>
              
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="font-medium text-green-900 dark:text-green-100">Valid</span>
                </div>
                <p className="text-2xl font-bold text-green-600">{importPreview.validCount}</p>
              </div>
              
              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-600" />
                  <span className="font-medium text-red-900 dark:text-red-100">Invalid</span>
                </div>
                <p className="text-2xl font-bold text-red-600">{importPreview.invalidCount}</p>
              </div>
            </div>

            {/* Import Progress */}
            {isImporting && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Importing patients...</span>
                  <span>{importProgress}%</span>
                </div>
                <Progress value={importProgress} className="w-full" />
              </div>
            )}

            {/* Patient List Preview */}
            <div className="border rounded-lg">
              <div className="p-4 border-b bg-gray-50 dark:bg-gray-800">
                <h4 className="font-medium">Patient Data Preview</h4>
              </div>
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                    <tr>
                      <th className="p-3 text-left">OP Number</th>
                      <th className="p-3 text-left">Name</th>
                      <th className="p-3 text-left">Age</th>
                      <th className="p-3 text-left">Insurance</th>
                      <th className="p-3 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importPreview.patients.slice(0, 20).map((patient, index) => (
                      <tr key={index} className="border-b">
                        <td className="p-3">{patient.op_number}</td>
                        <td className="p-3">{patient.first_name} {patient.last_name}</td>
                        <td className="p-3">{patient.age || 'N/A'}</td>
                        <td className="p-3">{patient.insurance_type}</td>
                        <td className="p-3">
                          <Badge variant={patient.isValid ? 'default' : 'destructive'}>
                            {patient.isValid ? 'Valid' : 'Invalid'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {importPreview.patients.length > 20 && (
                  <div className="p-3 text-center text-gray-500">
                    ... and {importPreview.patients.length - 20} more patients
                  </div>
                )}
              </div>
            </div>

            {/* Error Details */}
            {importPreview.invalidCount > 0 && (
              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
                <h4 className="font-medium text-red-900 dark:text-red-100 mb-2">
                  Patients with Errors ({importPreview.invalidCount})
                </h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {importPreview.patients
                    .filter(p => !p.isValid)
                    .slice(0, 10)
                    .map((patient, index) => (
                      <div key={index} className="text-sm">
                        <span className="font-medium">{patient.op_number}:</span>
                        <span className="text-red-600 dark:text-red-400 ml-2">
                          {patient.errors.join(', ')}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
