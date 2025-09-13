'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Badge } from '../ui/badge'
import { useToast } from '../../hooks/use-toast'
import { useAuthStore } from '../../lib/auth'
import { FileText, Plus, Save, Search, User, DollarSign, Stethoscope } from 'lucide-react'

interface SHAInvoiceData {
  patientName: string
  shaNumber: string
  invoiceNumber: string
  opNumber: string
  serviceGiven: string
  amountCharged: number
  diagnosis: string
  serviceDate: string
  patientId?: string
}

interface Patient {
  id: string
  op_number: string
  first_name: string
  last_name: string
  sha_number?: string
  insurance_number?: string
}

export function SHAInvoiceRecording() {
  const { toast } = useToast()
  const { user, accessToken } = useAuthStore()
  const [invoiceData, setInvoiceData] = useState<SHAInvoiceData>({
    patientName: '',
    shaNumber: '',
    invoiceNumber: '',
    opNumber: '',
    serviceGiven: '',
    amountCharged: 0,
    diagnosis: '',
    serviceDate: new Date().toISOString().split('T')[0]
  })
  const [patients, setPatients] = useState<Patient[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSearching, setIsSearching] = useState(false)

  // Generate invoice number
  const generateInvoiceNumber = () => {
    const date = new Date()
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const timestamp = Date.now().toString().slice(-6)
    
    return `SHA-${year}${month}${day}-${timestamp}`
  }

  // Search patients
  const searchPatients = async (term: string) => {
    if (!term || term.length < 2) {
      setPatients([])
      return
    }

    try {
      setIsSearching(true)
      const response = await fetch(`http://localhost:5000/api/patients?search=${encodeURIComponent(term)}&limit=10`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setPatients(result.data || [])
        }
      }
    } catch (error) {
      console.error('Error searching patients:', error)
    } finally {
      setIsSearching(false)
    }
  }

  // Handle patient selection
  const selectPatient = (patient: Patient) => {
    setSelectedPatient(patient)
    setInvoiceData(prev => ({
      ...prev,
      patientName: `${patient.first_name} ${patient.last_name}`,
      opNumber: patient.op_number,
      shaNumber: patient.sha_number || patient.insurance_number || '',
      patientId: patient.id,
      invoiceNumber: generateInvoiceNumber()
    }))
    setSearchTerm(`${patient.first_name} ${patient.last_name}`)
    setPatients([])
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!invoiceData.patientName || !invoiceData.shaNumber || !invoiceData.serviceGiven || !invoiceData.amountCharged) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      })
      return
    }

    try {
      setIsSubmitting(true)

      // Create SHA invoice record
      const response = await fetch('http://localhost:5000/api/payments/sha/invoice', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          patientId: invoiceData.patientId,
          services: [{
            serviceCode: 'GENERAL',
            serviceName: invoiceData.serviceGiven,
            quantity: 1,
            unitPrice: invoiceData.amountCharged,
            totalPrice: invoiceData.amountCharged,
            diagnosisCode: invoiceData.diagnosis
          }]
        })
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          toast({
            title: "Success",
            description: "SHA invoice recorded successfully",
          })
          
          // Reset form
          setInvoiceData({
            patientName: '',
            shaNumber: '',
            invoiceNumber: '',
            opNumber: '',
            serviceGiven: '',
            amountCharged: 0,
            diagnosis: '',
            serviceDate: new Date().toISOString().split('T')[0]
          })
          setSelectedPatient(null)
          setSearchTerm('')
        } else {
          throw new Error(result.message || 'Failed to record SHA invoice')
        }
      } else {
        throw new Error('Failed to record SHA invoice')
      }
    } catch (error: any) {
      console.error('Error recording SHA invoice:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to record SHA invoice",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle search input change
  const handleSearchChange = (value: string) => {
    setSearchTerm(value)
    searchPatients(value)
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <FileText className="h-6 w-6 text-purple-600" />
          <span>SHA Invoice Recording</span>
        </CardTitle>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Record SHA insurance invoices with all required details for compliance
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Patient Search and Selection */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">Patient Information</h3>
            
            <div className="relative">
              <Label htmlFor="patientSearch">Search Patient</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  id="patientSearch"
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Search by name, OP number, or SHA number..."
                  className="pl-10"
                />
                {isSearching && (
                  <div className="absolute right-3 top-3">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-500"></div>
                  </div>
                )}
              </div>
              
              {/* Patient Search Results */}
              {patients.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {patients.map((patient) => (
                    <button
                      key={patient.id}
                      type="button"
                      onClick={() => selectPatient(patient)}
                      className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 border-b border-slate-100 dark:border-slate-600 last:border-b-0"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-slate-900 dark:text-slate-100">
                            {patient.first_name} {patient.last_name}
                          </p>
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            OP: {patient.op_number} | SHA: {patient.sha_number || patient.insurance_number || 'N/A'}
                          </p>
                        </div>
                        <User className="h-4 w-4 text-slate-400" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Patient Display */}
            {selectedPatient && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <User className="h-5 w-5 text-green-600" />
                  <span className="font-medium text-green-800 dark:text-green-200">Selected Patient</span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-600 dark:text-slate-400">Name:</span>
                    <span className="ml-2 font-medium">{selectedPatient.first_name} {selectedPatient.last_name}</span>
                  </div>
                  <div>
                    <span className="text-slate-600 dark:text-slate-400">OP Number:</span>
                    <span className="ml-2 font-mono">{selectedPatient.op_number}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SHA Invoice Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">Invoice Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="patientName">Patient's Full Name *</Label>
                <Input
                  id="patientName"
                  value={invoiceData.patientName}
                  onChange={(e) => setInvoiceData(prev => ({ ...prev, patientName: e.target.value }))}
                  placeholder="Enter patient's full name"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="shaNumber">SHA Number *</Label>
                <Input
                  id="shaNumber"
                  value={invoiceData.shaNumber}
                  onChange={(e) => setInvoiceData(prev => ({ ...prev, shaNumber: e.target.value }))}
                  placeholder="Enter SHA/NHIF number"
                  className="font-mono"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="opNumber">OP Number *</Label>
                <Input
                  id="opNumber"
                  value={invoiceData.opNumber}
                  onChange={(e) => setInvoiceData(prev => ({ ...prev, opNumber: e.target.value }))}
                  placeholder="Enter OP number"
                  className="font-mono"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="invoiceNumber">Invoice Number</Label>
                <Input
                  id="invoiceNumber"
                  value={invoiceData.invoiceNumber}
                  onChange={(e) => setInvoiceData(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                  placeholder="Auto-generated"
                  className="font-mono"
                  readOnly
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setInvoiceData(prev => ({ ...prev, invoiceNumber: generateInvoiceNumber() }))}
                  className="mt-2"
                >
                  Generate New
                </Button>
              </div>
              
              <div>
                <Label htmlFor="serviceDate">Service Date *</Label>
                <Input
                  id="serviceDate"
                  type="date"
                  value={invoiceData.serviceDate}
                  onChange={(e) => setInvoiceData(prev => ({ ...prev, serviceDate: e.target.value }))}
                  required
                />
              </div>
            </div>
          </div>

          {/* Service Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">Service Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="serviceGiven">Service Given *</Label>
                <Select
                  value={invoiceData.serviceGiven}
                  onValueChange={(value) => setInvoiceData(prev => ({ ...prev, serviceGiven: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select service type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CONSULTATION">Medical Consultation</SelectItem>
                    <SelectItem value="FOLLOW_UP">Follow-up Visit</SelectItem>
                    <SelectItem value="EMERGENCY">Emergency Treatment</SelectItem>
                    <SelectItem value="LAB_TEST">Laboratory Test</SelectItem>
                    <SelectItem value="PROCEDURE">Medical Procedure</SelectItem>
                    <SelectItem value="VACCINATION">Vaccination</SelectItem>
                    <SelectItem value="PHARMACY">Medication Dispensing</SelectItem>
                    <SelectItem value="OTHER">Other Service</SelectItem>
                  </SelectContent>
                </Select>
                {invoiceData.serviceGiven === 'OTHER' && (
                  <Input
                    placeholder="Specify other service"
                    className="mt-2"
                    onChange={(e) => setInvoiceData(prev => ({ ...prev, serviceGiven: e.target.value }))}
                  />
                )}
              </div>
              
              <div>
                <Label htmlFor="amountCharged">Amount Charged (KSh) *</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="amountCharged"
                    type="number"
                    min="0"
                    step="0.01"
                    value={invoiceData.amountCharged}
                    onChange={(e) => setInvoiceData(prev => ({ ...prev, amountCharged: parseFloat(e.target.value) || 0 }))}
                    placeholder="Enter amount"
                    className="pl-10"
                    required
                  />
                </div>
              </div>
            </div>
            
            <div>
              <Label htmlFor="diagnosis">Diagnosis (ICD-10 or Descriptive) *</Label>
              <div className="relative">
                <Stethoscope className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Textarea
                  id="diagnosis"
                  value={invoiceData.diagnosis}
                  onChange={(e) => setInvoiceData(prev => ({ ...prev, diagnosis: e.target.value }))}
                  placeholder="Enter diagnosis (e.g., J06.9 - Acute upper respiratory infection, unspecified)"
                  className="pl-10 min-h-[80px]"
                  required
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Use ICD-10 codes when possible (e.g., J06.9, K59.0, M25.5)
              </p>
            </div>
          </div>

          {/* Invoice Summary */}
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-4">Invoice Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Patient Name:</span>
                  <span className="font-medium">{invoiceData.patientName || 'Not selected'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">SHA Number:</span>
                  <span className="font-mono">{invoiceData.shaNumber || 'Not entered'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">OP Number:</span>
                  <span className="font-mono">{invoiceData.opNumber || 'Not entered'}</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Invoice Number:</span>
                  <span className="font-mono">{invoiceData.invoiceNumber || 'Not generated'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Service:</span>
                  <span className="font-medium">{invoiceData.serviceGiven || 'Not selected'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Amount:</span>
                  <span className="font-bold text-green-600">
                    KSh {invoiceData.amountCharged.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setInvoiceData({
                  patientName: '',
                  shaNumber: '',
                  invoiceNumber: '',
                  opNumber: '',
                  serviceGiven: '',
                  amountCharged: 0,
                  diagnosis: '',
                  serviceDate: new Date().toISOString().split('T')[0]
                })
                setSelectedPatient(null)
                setSearchTerm('')
              }}
            >
              Clear Form
            </Button>
            
            <Button
              type="submit"
              disabled={isSubmitting || !invoiceData.patientName || !invoiceData.shaNumber || !invoiceData.serviceGiven || !invoiceData.amountCharged}
              className="bg-gradient-to-r from-purple-600 to-orange-500 hover:from-purple-700 hover:to-orange-600"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Recording...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Record SHA Invoice
                </>
              )}
            </Button>
          </div>
        </form>

        {/* Instructions */}
        <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
          <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">SHA Invoice Recording Instructions</h4>
          <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
            <li>• <strong>Patient Name:</strong> Enter the patient's full name as it appears on their ID</li>
            <li>• <strong>SHA Number:</strong> The unique insurance/NHIF/SHA number from patient's card</li>
            <li>• <strong>Invoice Number:</strong> Unique invoice reference (auto-generated)</li>
            <li>• <strong>OP Number:</strong> The outpatient number your clinic assigns to each patient</li>
            <li>• <strong>Service Given:</strong> The treatment/procedure/consultation/lab test performed</li>
            <li>• <strong>Amount Charged:</strong> The cost of the service in Kenyan Shillings</li>
            <li>• <strong>Diagnosis:</strong> The medical condition (use ICD-10 codes when possible)</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}