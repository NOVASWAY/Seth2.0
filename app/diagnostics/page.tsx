"use client"
import { useState, useEffect } from "react"
import { ProtectedRoute } from "../../components/auth/ProtectedRoute"
import { UserRole } from "../../types"
import { DiagnosticsForm } from "../../components/diagnostics/DiagnosticsForm"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Button } from "../../components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs"
import { Badge } from "../../components/ui/badge"
import { useToast } from "../../hooks/use-toast"
import { useAuthStore } from "../../lib/auth"
import { Search, Loader2, User, Phone, MapPin, Microscope, UserPlus, TestTube, Clock, Save, AlertTriangle } from "lucide-react"
import type { Patient } from "../../types"

export default function DiagnosticsPage() {
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [currentStep, setCurrentStep] = useState<"patient" | "diagnostics">("patient")
  const [consultationId, setConsultationId] = useState("demo-consultation-123")
  const [visitId, setVisitId] = useState("demo-visit-456")
  
  // Patient search state
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<Patient[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const { toast } = useToast()
  const { accessToken } = useAuthStore()

  // Patient search functionality
  const searchPatients = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    try {
      const response = await fetch(`/api/patients/search?q=${encodeURIComponent(query)}&limit=10`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (response.ok) {
        const result = await response.json()
        setSearchResults(result.data?.patients || [])
      }
    } catch (err) {
      console.error("Search failed:", err)
      toast({
        title: "Error",
        description: "Failed to search patients",
        variant: "destructive",
      })
    } finally {
      setIsSearching(false)
    }
  }

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery) {
        searchPatients(searchQuery)
      } else {
        setSearchResults([])
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchQuery])

  const handlePatientSelected = (patient: Patient) => {
    setSelectedPatient(patient)
    setCurrentStep("diagnostics")
    setSearchQuery("")
    setSearchResults([])
  }

  const handleDiagnosticsSuccess = (diagnostics: any) => {
    console.log("Diagnostics created:", diagnostics)
    // Here you could navigate to a results page or show a success message
  }

  const resetFlow = () => {
    setSelectedPatient(null)
    setCurrentStep("patient")
  }

  return (
    <ProtectedRoute requiredRoles={[UserRole.ADMIN, UserRole.CLINICAL_OFFICER, UserRole.LAB_TECHNICIAN]}>
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Diagnostics System</h1>
          <p className="text-muted-foreground">
            Create laboratory test requests with real-time test selection and auto-save protection
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4">
            <div className={`flex items-center space-x-2 ${currentStep === "patient" ? "text-primary" : "text-muted-foreground"}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${currentStep === "patient" ? "border-primary bg-primary text-white" : "border-muted-foreground"}`}>
                1
              </div>
              <span className="font-medium">Patient Selection</span>
            </div>
            <div className="w-16 h-0.5 bg-muted-foreground"></div>
            <div className={`flex items-center space-x-2 ${currentStep === "diagnostics" ? "text-primary" : "text-muted-foreground"}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${currentStep === "diagnostics" ? "border-primary bg-primary text-white" : "border-muted-foreground"}`}>
                2
              </div>
              <span className="font-medium">Lab Request</span>
            </div>
          </div>
        </div>

        {/* Feature Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <TestTube className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Real-time Test Selection</h3>
                  <p className="text-sm text-muted-foreground">Search and filter available laboratory tests</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <Save className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Auto-Save Protection</h3>
                  <p className="text-sm text-muted-foreground">Automatic draft saving every 30 seconds</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500/10 rounded-lg">
                  <Clock className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Urgency Management</h3>
                  <p className="text-sm text-muted-foreground">Set priority levels for test processing</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Patient Selection */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5" />
                  Patient Information
                </CardTitle>
                <CardDescription>
                  Select an existing patient or register a new one
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedPatient ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <h4 className="font-semibold text-green-800">Selected Patient</h4>
                      <p className="text-green-700">
                        {selectedPatient.firstName} {selectedPatient.lastName}
                      </p>
                      <p className="text-sm text-green-600">OP: {selectedPatient.opNumber}</p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={resetFlow}
                      className="w-full"
                    >
                      Change Patient
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="patientSearch">Search Patient</Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                          id="patientSearch"
                          placeholder="Search by name, OP number, or phone..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10 border-2 border-blue-300 dark:border-blue-600 shadow-md h-12"
                        />
                        {isSearching && (
                          <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
                        )}
                      </div>
                    </div>

                    {/* Search Results */}
                    {searchResults.length > 0 && (
                      <div className="border border-gray-200 dark:border-slate-700 rounded-lg max-h-60 overflow-y-auto">
                        {searchResults.map((patient) => (
                          <div
                            key={patient.id}
                            onClick={() => handlePatientSelected(patient)}
                            className="p-3 hover:bg-gray-50 dark:hover:bg-slate-800 cursor-pointer border-b border-gray-100 dark:border-slate-700 last:border-b-0"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-medium text-gray-900 dark:text-slate-100">
                                  {patient.first_name} {patient.last_name}
                                </h4>
                                <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-slate-400">
                                  <span className="flex items-center gap-1">
                                    <span className="font-mono">#{patient.op_number}</span>
                                  </span>
                                  {patient.phone_number && (
                                    <span className="flex items-center gap-1">
                                      <Phone className="h-3 w-3" />
                                      {patient.phone_number}
                                    </span>
                                  )}
                                  {patient.area && (
                                    <span className="flex items-center gap-1">
                                      <MapPin className="h-3 w-3" />
                                      {patient.area}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <Badge variant="outline">
                                {patient.insurance_type}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {searchQuery && searchResults.length === 0 && !isSearching && (
                      <div className="text-center py-4 text-gray-500 dark:text-slate-400">
                        No patients found matching "{searchQuery}"
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Diagnostics Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Microscope className="h-5 w-5" />
                  Laboratory Test Request
                </CardTitle>
                <CardDescription>
                  Create a comprehensive laboratory test request with clinical context
                </CardDescription>
              </CardHeader>
              <CardContent>
                {currentStep === "patient" ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <TestTube className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Please select a patient first to create a lab request</p>
                  </div>
                ) : (
                  <DiagnosticsForm
                    consultationId={consultationId}
                    visitId={visitId}
                    patientId={selectedPatient?.id}
                    onSuccess={handleDiagnosticsSuccess}
                    onCancel={resetFlow}
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* System Information */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>System Features</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-3">Test Management</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <TestTube className="h-4 w-4" />
                      Real-time test catalog with search and filtering
                    </li>
                    <li className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Turnaround time and pricing information
                    </li>
                    <li className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Urgency levels (Routine, Urgent, STAT)
                    </li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-3">Data Protection</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <Save className="h-4 w-4" />
                      Automatic draft saving every 30 seconds
                    </li>
                    <li className="flex items-center gap-2">
                      <UserPlus className="h-4 w-4" />
                      Enhanced patient search and registration
                    </li>
                    <li className="flex items-center gap-2">
                      <Microscope className="h-4 w-4" />
                      Comprehensive clinical notes and context
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  )
}
