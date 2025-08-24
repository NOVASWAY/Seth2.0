"use client"

import { useState, useEffect, useCallback } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { Textarea } from "../ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { Alert, AlertDescription } from "../ui/alert"
import { Badge } from "../ui/badge"
import { Loader2, Search, UserPlus, Clock, CheckCircle, AlertTriangle, Calendar, Phone, MapPin } from "lucide-react"
import { useToast } from "../../hooks/use-toast"
import { useAuthStore } from "../../lib/auth"
import type { Patient } from "../../types"

const patientInputSchema = z.object({
  inputType: z.enum(["existing", "new"]),
  existingPatientId: z.string().optional(),
  // New patient fields
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  dateOfBirth: z.string().optional(),
  age: z.number().min(0).max(150).optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  phoneNumber: z.string().optional(),
  area: z.string().optional(),
  nextOfKin: z.string().optional(),
  nextOfKinPhone: z.string().optional(),
  insuranceType: z.enum(["SHA", "PRIVATE", "CASH"]),
  insuranceNumber: z.string().optional(),
  // Visit information
  chiefComplaint: z.string().optional(),
  triageCategory: z.enum(["EMERGENCY", "URGENT", "NORMAL"]),
})

type PatientInputData = z.infer<typeof patientInputSchema>

interface EnhancedPatientInputProps {
  onPatientSelected?: (patient: Patient) => void
  onNewPatientCreated?: (patient: Patient) => void
  onCancel?: () => void
  showVisitInfo?: boolean
}

interface SearchResult {
  patients: Patient[]
  total: number
}

export function EnhancedPatientInput({ 
  onPatientSelected, 
  onNewPatientCreated, 
  onCancel,
  showVisitInfo = true 
}: EnhancedPatientInputProps) {
  const { toast } = useToast()
  const { user } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<SearchResult>({ patients: [], total: 0 })
  const [isSearching, setIsSearching] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [autoSaveStatus, setAutoSaveStatus] = useState<"saved" | "saving" | "error">("saved")

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<PatientInputData>({
    resolver: zodResolver(patientInputSchema),
    defaultValues: {
      inputType: "existing",
      gender: "MALE",
      insuranceType: "CASH",
      triageCategory: "NORMAL",
    },
  })

  const inputType = watch("inputType")
  const existingPatientId = watch("existingPatientId")

  // Auto-save functionality
  const autoSave = useCallback(async (data: PatientInputData) => {
    if (!isDirty) return

    try {
      setAutoSaveStatus("saving")
      
      // Save to localStorage as backup
      localStorage.setItem(`patient-input-draft-${Date.now()}`, JSON.stringify({
        data,
        timestamp: new Date().toISOString(),
        userId: user?.id,
      }))

      setLastSaved(new Date())
      setAutoSaveStatus("saved")
    } catch (error) {
      console.error("Auto-save failed:", error)
      setAutoSaveStatus("error")
    }
  }, [isDirty, user?.id])

  // Auto-save every 30 seconds when form is dirty
  useEffect(() => {
    const interval = setInterval(() => {
      const formData = watch()
      if (isDirty) {
        autoSave(formData)
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [autoSave, watch, isDirty])

  // Search patients
  const searchPatients = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults({ patients: [], total: 0 })
      return
    }

    setIsSearching(true)
    try {
      const response = await fetch(`/api/patients/search?q=${encodeURIComponent(query)}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to search patients")
      }

      const result = await response.json()
      setSearchResults(result.data)
    } catch (error: any) {
      console.error("Search failed:", error)
      toast({
        title: "Error",
        description: "Failed to search patients",
        variant: "destructive",
      })
    } finally {
      setIsSearching(false)
    }
  }, [toast])

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery) {
        searchPatients(searchQuery)
      } else {
        setSearchResults({ patients: [], total: 0 })
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchQuery, searchPatients])

  // Handle existing patient selection
  const handleExistingPatientSelect = (patientId: string) => {
    const patient = searchResults.patients.find(p => p.id === patientId)
    if (patient) {
      setValue("existingPatientId", patientId)
      if (onPatientSelected) {
        onPatientSelected(patient)
      }
    }
  }

  // Handle new patient creation
  const handleNewPatientSubmit = async (data: PatientInputData) => {
    setIsLoading(true)
    setError("")

    try {
      // Create patient first
      const patientResponse = await fetch("/api/patients", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
        body: JSON.stringify({
          firstName: data.firstName,
          lastName: data.lastName,
          dateOfBirth: data.dateOfBirth,
          age: data.age,
          gender: data.gender,
          phoneNumber: data.phoneNumber,
          area: data.area,
          nextOfKin: data.nextOfKin,
          nextOfKinPhone: data.nextOfKinPhone,
          insuranceType: data.insuranceType,
          insuranceNumber: data.insuranceNumber,
        }),
      })

      if (!patientResponse.ok) {
        const errorData = await patientResponse.json()
        throw new Error(errorData.message || "Failed to create patient")
      }

      const patientResult = await patientResponse.json()
      const patient = patientResult.data

      // Register visit for today if visit info is provided
      if (showVisitInfo && data.chiefComplaint) {
        const visitResponse = await fetch("/api/visits", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
          body: JSON.stringify({
            patientId: patient.id,
            opNumber: patient.opNumber,
            chiefComplaint: data.chiefComplaint,
            triageCategory: data.triageCategory,
          }),
        })

        if (!visitResponse.ok) {
          console.warn("Failed to create visit, but patient was created")
        }
      }

      // Clear draft from localStorage
      localStorage.removeItem(`patient-input-draft-${Date.now()}`)
      
      toast({
        title: "Success",
        description: "Patient created successfully",
      })

      if (onNewPatientCreated) {
        onNewPatientCreated(patient)
      }
    } catch (err: any) {
      setError(err.message || "Failed to create patient")
      toast({
        title: "Error",
        description: err.message || "Failed to create patient",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const onSubmit = (data: PatientInputData) => {
    if (data.inputType === "existing") {
      if (data.existingPatientId) {
        const patient = searchResults.patients.find(p => p.id === data.existingPatientId)
        if (patient && onPatientSelected) {
          onPatientSelected(patient)
        }
      }
    } else {
      handleNewPatientSubmit(data)
    }
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Patient Selection & Registration</CardTitle>
            <CardDescription>
              Search existing patients or register a new one with timestamping and auto-save
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {autoSaveStatus === "saving" && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </div>
            )}
            {autoSaveStatus === "saved" && lastSaved && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Saved {lastSaved.toLocaleTimeString()}
              </div>
            )}
            {autoSaveStatus === "error" && (
              <div className="flex items-center gap-2 text-sm text-red-500">
                <AlertTriangle className="h-4 w-4" />
                Save failed
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Input Type Selection */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Select Input Method</Label>
            <div className="flex gap-4">
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="existing"
                  value="existing"
                  {...register("inputType")}
                  className="w-4 h-4"
                />
                <Label htmlFor="existing">Search Existing Patient</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="new"
                  value="new"
                  {...register("inputType")}
                  className="w-4 h-4"
                />
                <Label htmlFor="new">Register New Patient</Label>
              </div>
            </div>
          </div>

          {inputType === "existing" ? (
            /* Existing Patient Search */
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Search Patients</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, OP number, or phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Search by patient name, OP number, or phone number
                </p>
              </div>

              {/* Search Results */}
              {searchQuery && (
                <div className="space-y-2">
                  <Label>Search Results</Label>
                  {isSearching ? (
                    <div className="p-4 text-center">
                      <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                      <p className="text-sm text-muted-foreground mt-2">Searching...</p>
                    </div>
                  ) : searchResults.patients.length > 0 ? (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {searchResults.patients.map((patient) => (
                        <div
                          key={patient.id}
                          className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                            existingPatientId === patient.id
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/50"
                          }`}
                          onClick={() => handleExistingPatientSelect(patient.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">
                                  {patient.firstName} {patient.lastName}
                                </span>
                                <Badge variant="outline">{patient.opNumber}</Badge>
                                <Badge variant="secondary">{patient.insuranceType}</Badge>
                              </div>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                                {patient.phoneNumber && (
                                  <span className="flex items-center gap-1">
                                    <Phone className="h-3 w-3" />
                                    {patient.phoneNumber}
                                  </span>
                                )}
                                {patient.area && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {patient.area}
                                  </span>
                                )}
                                {patient.dateOfBirth && (
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {new Date(patient.dateOfBirth).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            </div>
                            {existingPatientId === patient.id && (
                              <CheckCircle className="h-5 w-5 text-primary" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-muted-foreground">
                      <p>No patients found matching "{searchQuery}"</p>
                      <p className="text-sm mt-1">Try a different search term or register a new patient</p>
                    </div>
                  )}
                </div>
              )}

              {existingPatientId && (
                <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                  <div className="flex items-center gap-2 text-primary">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-medium">Patient Selected</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Click "Continue" to proceed with the selected patient
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* New Patient Registration */
            <div className="space-y-6">
              {/* Personal Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Personal Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      {...register("firstName")}
                      placeholder="Enter first name"
                      disabled={isLoading}
                    />
                    {errors.firstName && (
                      <p className="text-sm text-destructive">{errors.firstName.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      {...register("lastName")}
                      placeholder="Enter last name"
                      disabled={isLoading}
                    />
                    {errors.lastName && (
                      <p className="text-sm text-destructive">{errors.lastName.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dateOfBirth">Date of Birth</Label>
                    <Input
                      id="dateOfBirth"
                      type="date"
                      {...register("dateOfBirth")}
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="age">Age</Label>
                    <Input
                      id="age"
                      type="number"
                      min="0"
                      max="150"
                      {...register("age", { valueAsNumber: true })}
                      placeholder="Enter age"
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="gender">Gender *</Label>
                    <Select onValueChange={(value) => setValue("gender", value as any)} defaultValue="MALE">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MALE">Male</SelectItem>
                        <SelectItem value="FEMALE">Female</SelectItem>
                        <SelectItem value="OTHER">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phoneNumber">Phone Number</Label>
                    <Input
                      id="phoneNumber"
                      {...register("phoneNumber")}
                      placeholder="Enter phone number"
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="area">Area/Location</Label>
                    <Input
                      id="area"
                      {...register("area")}
                      placeholder="Enter area or location"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nextOfKin">Next of Kin</Label>
                    <Input
                      id="nextOfKin"
                      {...register("nextOfKin")}
                      placeholder="Enter next of kin name"
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="nextOfKinPhone">Next of Kin Phone</Label>
                    <Input
                      id="nextOfKinPhone"
                      {...register("nextOfKinPhone")}
                      placeholder="Enter next of kin phone"
                      disabled={isLoading}
                    />
                  </div>
                </div>
              </div>

              {/* Insurance Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Insurance Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="insuranceType">Insurance Type *</Label>
                    <Select onValueChange={(value) => setValue("insuranceType", value as any)} defaultValue="CASH">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SHA">SHA</SelectItem>
                        <SelectItem value="PRIVATE">Private Insurance</SelectItem>
                        <SelectItem value="CASH">Cash Payment</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="insuranceNumber">Insurance Number</Label>
                    <Input
                      id="insuranceNumber"
                      {...register("insuranceNumber")}
                      placeholder="Enter insurance number"
                      disabled={isLoading}
                    />
                  </div>
                </div>
              </div>

              {/* Visit Information (if enabled) */}
              {showVisitInfo && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Visit Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="chiefComplaint">Chief Complaint</Label>
                      <Textarea
                        id="chiefComplaint"
                        {...register("chiefComplaint")}
                        placeholder="Enter patient's main complaint"
                        rows={3}
                        disabled={isLoading}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="triageCategory">Triage Category</Label>
                      <Select onValueChange={(value) => setValue("triageCategory", value as any)} defaultValue="NORMAL">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NORMAL">Normal</SelectItem>
                          <SelectItem value="URGENT">Urgent</SelectItem>
                          <SelectItem value="EMERGENCY">Emergency</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Form Actions */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Form auto-saves every 30 seconds</span>
            </div>
            
            <div className="flex items-center gap-2">
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
              )}
              <Button 
                type="submit" 
                disabled={isLoading || (inputType === "existing" && !existingPatientId)}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {inputType === "existing" ? "Processing..." : "Creating..."}
                  </>
                ) : (
                  <>
                    {inputType === "existing" ? (
                      <>
                        <Search className="h-4 w-4 mr-2" />
                        Continue with Selected Patient
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Create Patient
                      </>
                    )}
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
