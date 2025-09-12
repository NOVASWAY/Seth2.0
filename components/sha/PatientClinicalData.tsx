'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Label } from '../ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { useToast } from '../../hooks/use-toast'
import { 
  User, 
  Stethoscope, 
  Pill, 
  TestTube, 
  FileText, 
  Calendar,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react'
import { format } from 'date-fns'

interface PatientClinicalDataProps {
  patientId: string
  visitId?: string
  accessToken: string
  onDataLoaded?: (data: any) => void
}

interface ClinicalData {
  patient: {
    id: string
    op_number: string
    name: string
    first_name: string
    last_name: string
    date_of_birth: string
    age: number
    gender: string
    phone_number: string
    area: string
    insurance_type: string
    insurance_number: string
    sha_beneficiary_id: string
    next_of_kin: string
    next_of_kin_phone: string
  }
  visits: Array<{
    id: string
    visit_date: string
    visit_type: string
    status: string
    notes: string
    provider_name: string
  }>
  encounters: Array<{
    id: string
    encounter_type: string
    encounter_date: string
    chief_complaint: string
    department: string
    location: string
    sha_eligible: boolean
    diagnoses: Array<{
      id: string
      code: string
      description: string
      type: string
    }>
    treatments: Array<{
      id: string
      name: string
      description: string
      cost: number
    }>
  }>
  prescriptions: Array<{
    id: string
    status: string
    created_at: string
    items: Array<{
      id: string
      item_name: string
      dosage: string
      frequency: string
      duration: string
      quantity_prescribed: number
      instructions: string
    }>
  }>
  lab_requests: Array<{
    id: string
    request_date: string
    status: string
    urgency: string
    test_items: Array<{
      id: string
      test_name: string
      test_code: string
      cost: number
      result: string
      normal_range: string
      unit: string
    }>
  }>
  existing_claims: Array<{
    id: string
    claim_number: string
    status: string
    claim_amount: number
    created_at: string
  }>
  summary: {
    total_encounters: number
    total_prescriptions: number
    total_lab_requests: number
    total_cost: number
    sha_eligible: boolean
    has_existing_claims: boolean
  }
}

export function PatientClinicalData({ 
  patientId, 
  visitId, 
  accessToken, 
  onDataLoaded 
}: PatientClinicalDataProps) {
  const [clinicalData, setClinicalData] = useState<ClinicalData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (patientId && accessToken) {
      fetchClinicalData()
    }
  }, [patientId, visitId, accessToken])

  const fetchClinicalData = async () => {
    try {
      setLoading(true)
      setError(null)

      const url = visitId 
        ? `/api/sha-patient-data/patient/${patientId}/clinical-data?visitId=${visitId}`
        : `/api/sha-patient-data/patient/${patientId}/clinical-data`

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch clinical data: ${response.status}`)
      }

      const result = await response.json()
      if (result.success) {
        setClinicalData(result.data)
        onDataLoaded?.(result.data)
      } else {
        throw new Error(result.message || 'Failed to fetch clinical data')
      }
    } catch (err) {
      console.error('Error fetching clinical data:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch clinical data')
      toast({
        title: "Error",
        description: "Failed to fetch patient clinical data",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'approved':
      case 'paid':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
      case 'pending':
      case 'draft':
      case 'submitted':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
      case 'rejected':
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
    }
  }

  const getUrgencyColor = (urgency: string) => {
    switch (urgency.toLowerCase()) {
      case 'urgent':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
      case 'high':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400'
      case 'normal':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
      case 'low':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
            <span className="ml-2">Loading patient clinical data...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center text-red-600">
            <AlertCircle className="h-5 w-5 mr-2" />
            <span>Error: {error}</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!clinicalData) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            No clinical data available
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Patient Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Patient Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Label className="text-sm font-medium text-gray-500">Name</Label>
              <p className="text-lg font-semibold">{clinicalData.patient.name}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-500">OP Number</Label>
              <p className="text-lg font-semibold">{clinicalData.patient.op_number}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-500">SHA Number</Label>
              <p className="text-lg font-semibold">{clinicalData.patient.sha_beneficiary_id || 'N/A'}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-500">Age</Label>
              <p className="text-lg">{clinicalData.patient.age} years</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-500">Gender</Label>
              <p className="text-lg">{clinicalData.patient.gender}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-500">Phone</Label>
              <p className="text-lg">{clinicalData.patient.phone_number}</p>
            </div>
          </div>
          
          <div className="mt-4 flex items-center gap-4">
            <Badge className={clinicalData.summary.sha_eligible ? 
              'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' : 
              'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
            }>
              {clinicalData.summary.sha_eligible ? 'SHA Eligible' : 'Not SHA Eligible'}
            </Badge>
            <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
              Total Cost: KES {clinicalData.summary.total_cost.toLocaleString()}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Clinical Data Tabs */}
      <Tabs defaultValue="encounters" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="encounters">Encounters</TabsTrigger>
          <TabsTrigger value="prescriptions">Prescriptions</TabsTrigger>
          <TabsTrigger value="lab-tests">Lab Tests</TabsTrigger>
          <TabsTrigger value="claims">Claims</TabsTrigger>
        </TabsList>

        {/* Encounters Tab */}
        <TabsContent value="encounters" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Stethoscope className="h-5 w-5" />
                Patient Encounters ({clinicalData.encounters.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {clinicalData.encounters.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No encounters found</p>
              ) : (
                <div className="space-y-4">
                  {clinicalData.encounters.map((encounter) => (
                    <div key={encounter.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold">{encounter.encounter_type}</h4>
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(encounter.sha_eligible ? 'approved' : 'pending')}>
                            {encounter.sha_eligible ? 'SHA Eligible' : 'Not SHA Eligible'}
                          </Badge>
                          <span className="text-sm text-gray-500">
                            {format(new Date(encounter.encounter_date), 'MMM dd, yyyy')}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        <strong>Chief Complaint:</strong> {encounter.chief_complaint || 'N/A'}
                      </p>
                      <p className="text-sm text-gray-600">
                        <strong>Department:</strong> {encounter.department || 'N/A'} | 
                        <strong> Location:</strong> {encounter.location || 'N/A'}
                      </p>
                      
                      {/* Diagnoses */}
                      {encounter.diagnoses && encounter.diagnoses.length > 0 && (
                        <div className="mt-3">
                          <h5 className="font-medium text-sm mb-2">Diagnoses:</h5>
                          <div className="flex flex-wrap gap-2">
                            {encounter.diagnoses.map((diagnosis) => (
                              <Badge key={diagnosis.id} variant="outline">
                                {diagnosis.code}: {diagnosis.description}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Treatments */}
                      {encounter.treatments && encounter.treatments.length > 0 && (
                        <div className="mt-3">
                          <h5 className="font-medium text-sm mb-2">Treatments:</h5>
                          <div className="space-y-1">
                            {encounter.treatments.map((treatment) => (
                              <div key={treatment.id} className="flex justify-between text-sm">
                                <span>{treatment.name}</span>
                                <span className="font-medium">KES {treatment.cost.toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Prescriptions Tab */}
        <TabsContent value="prescriptions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Pill className="h-5 w-5" />
                Prescriptions ({clinicalData.prescriptions.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {clinicalData.prescriptions.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No prescriptions found</p>
              ) : (
                <div className="space-y-4">
                  {clinicalData.prescriptions.map((prescription) => (
                    <div key={prescription.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold">Prescription #{prescription.id.slice(-8)}</h4>
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(prescription.status)}>
                            {prescription.status}
                          </Badge>
                          <span className="text-sm text-gray-500">
                            {format(new Date(prescription.created_at), 'MMM dd, yyyy')}
                          </span>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        {prescription.items.map((item) => (
                          <div key={item.id} className="bg-gray-50 dark:bg-gray-800 rounded p-3">
                            <div className="flex justify-between items-start">
                              <div>
                                <h5 className="font-medium">{item.item_name}</h5>
                                <p className="text-sm text-gray-600">
                                  {item.dosage} - {item.frequency} - {item.duration}
                                </p>
                                <p className="text-sm text-gray-600">
                                  Quantity: {item.quantity_prescribed}
                                </p>
                                {item.instructions && (
                                  <p className="text-sm text-gray-600 mt-1">
                                    <strong>Instructions:</strong> {item.instructions}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Lab Tests Tab */}
        <TabsContent value="lab-tests" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTube className="h-5 w-5" />
                Lab Tests ({clinicalData.lab_requests.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {clinicalData.lab_requests.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No lab tests found</p>
              ) : (
                <div className="space-y-4">
                  {clinicalData.lab_requests.map((labRequest) => (
                    <div key={labRequest.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold">Lab Request #{labRequest.id.slice(-8)}</h4>
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(labRequest.status)}>
                            {labRequest.status}
                          </Badge>
                          <Badge className={getUrgencyColor(labRequest.urgency)}>
                            {labRequest.urgency}
                          </Badge>
                          <span className="text-sm text-gray-500">
                            {format(new Date(labRequest.request_date), 'MMM dd, yyyy')}
                          </span>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        {labRequest.test_items.map((test) => (
                          <div key={test.id} className="bg-gray-50 dark:bg-gray-800 rounded p-3">
                            <div className="flex justify-between items-start">
                              <div>
                                <h5 className="font-medium">{test.test_name}</h5>
                                <p className="text-sm text-gray-600">Code: {test.test_code}</p>
                                {test.result && (
                                  <p className="text-sm text-gray-600">
                                    <strong>Result:</strong> {test.result} {test.unit}
                                  </p>
                                )}
                                {test.normal_range && (
                                  <p className="text-sm text-gray-600">
                                    <strong>Normal Range:</strong> {test.normal_range}
                                  </p>
                                )}
                              </div>
                              <div className="text-right">
                                <p className="font-medium">KES {test.cost.toLocaleString()}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Claims Tab */}
        <TabsContent value="claims" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Existing SHA Claims ({clinicalData.existing_claims.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {clinicalData.existing_claims.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No existing claims found</p>
              ) : (
                <div className="space-y-4">
                  {clinicalData.existing_claims.map((claim) => (
                    <div key={claim.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold">{claim.claim_number}</h4>
                          <p className="text-sm text-gray-600">
                            Created: {format(new Date(claim.created_at), 'MMM dd, yyyy')}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(claim.status)}>
                            {claim.status}
                          </Badge>
                          <span className="font-medium">
                            KES {claim.claim_amount.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
