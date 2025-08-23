"use client"

import { useState } from "react"
import { ProtectedRoute } from "../../components/auth/ProtectedRoute"
import { UserRole } from "../../types"
import { PrescriptionForm } from "../../components/prescriptions/PrescriptionForm"
import { EnhancedPatientInput } from "../../components/patients/EnhancedPatientInput"
import { Button } from "../../components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs"
import { Badge } from "../../components/ui/badge"
import { FileText, UserPlus, Pill, Clock, Save } from "lucide-react"
import type { Patient } from "../../types"

export default function PrescriptionsPage() {
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [currentStep, setCurrentStep] = useState<"patient" | "prescription">("patient")
  const [consultationId, setConsultationId] = useState("demo-consultation-123")
  const [visitId, setVisitId] = useState("demo-visit-456")

  const handlePatientSelected = (patient: Patient) => {
    setSelectedPatient(patient)
    setCurrentStep("prescription")
  }

  const handleNewPatientCreated = (patient: Patient) => {
    setSelectedPatient(patient)
    setCurrentStep("prescription")
  }

  const handlePrescriptionSuccess = (prescription: any) => {
    console.log("Prescription created:", prescription)
    // Reset to start new prescription
    setSelectedPatient(null)
    setCurrentStep("patient")
  }

  const resetFlow = () => {
    setSelectedPatient(null)
    setCurrentStep("patient")
  }

  return (
    <ProtectedRoute requiredRoles={[UserRole.ADMIN, UserRole.CLINICAL_OFFICER]}>
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Prescription Management</h1>
          <p className="text-muted-foreground">
            Create prescriptions with real-time stock availability and enhanced patient management
          </p>
        </div>

        {/* Feature Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Pill className="h-5 w-5 text-primary" />
                <span className="font-medium">Stock Integration</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Real-time medicine availability from inventory
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-primary" />
                <span className="font-medium">Patient Management</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Search existing or register new patients
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                <span className="font-medium">Auto-Save</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Automatic saving every 30 seconds
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Save className="h-5 w-5 text-primary" />
                <span className="font-medium">Draft Recovery</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Restore drafts after power outages
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Progress Indicator */}
        <div className="mb-6">
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 ${currentStep === "patient" ? "text-primary" : "text-muted-foreground"}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                currentStep === "patient" ? "border-primary bg-primary text-white" : "border-muted-foreground"
              }`}>
                1
              </div>
              <span className="font-medium">Patient Selection</span>
            </div>
            
            <div className="w-8 h-1 bg-muted-foreground/20 rounded"></div>
            
            <div className={`flex items-center gap-2 ${currentStep === "prescription" ? "text-primary" : "text-muted-foreground"}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                currentStep === "prescription" ? "border-primary bg-primary text-white" : "border-muted-foreground"
              }`}>
                2
              </div>
              <span className="font-medium">Create Prescription</span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <Tabs value={currentStep} className="w-full">
          <TabsContent value="patient" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5" />
                  Step 1: Patient Selection & Registration
                </CardTitle>
                <CardDescription>
                  Search for existing patients or register a new one. All data is automatically saved.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <EnhancedPatientInput
                  onPatientSelected={handlePatientSelected}
                  onNewPatientCreated={handleNewPatientCreated}
                  onCancel={resetFlow}
                  showVisitInfo={true}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="prescription" className="mt-0">
            {selectedPatient && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Step 2: Create Prescription
                  </CardTitle>
                  <CardDescription>
                    Prescribe medicines for {selectedPatient.firstName} {selectedPatient.lastName} with real-time stock availability.
                  </CardDescription>
                  
                  {/* Patient Info */}
                  <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div>
                          <span className="font-medium">Patient:</span> {selectedPatient.firstName} {selectedPatient.lastName}
                        </div>
                        <Badge variant="outline">{selectedPatient.opNumber}</Badge>
                        <Badge variant="secondary">{selectedPatient.insuranceType}</Badge>
                      </div>
                      <Button variant="outline" size="sm" onClick={resetFlow}>
                        Change Patient
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <PrescriptionForm
                    consultationId={consultationId}
                    visitId={visitId}
                    patientId={selectedPatient.id}
                    onSuccess={handlePrescriptionSuccess}
                    onCancel={resetFlow}
                  />
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Demo Information */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Demo Information</CardTitle>
            <CardDescription>
              This is a demonstration of the enhanced prescription system. In a real environment:
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li>• <strong>Consultation ID:</strong> Would come from an actual consultation record</li>
              <li>• <strong>Visit ID:</strong> Would be generated when the patient is registered for today's visit</li>
              <li>• <strong>Stock Availability:</strong> Shows real-time data from your inventory system</li>
              <li>• <strong>Auto-save:</strong> Protects against data loss during power outages or server downtime</li>
              <li>• <strong>Patient Search:</strong> Searches through your actual patient database</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  )
}
