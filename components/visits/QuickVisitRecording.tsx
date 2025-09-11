"use client"

import { useState, useEffect } from "react"
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
import { Loader2, Search, UserPlus, Clock, CheckCircle, AlertTriangle, Calendar, Phone, MapPin, Stethoscope } from "lucide-react"
import { useToast } from "../../hooks/use-toast"
import { useAuthStore } from "../../lib/auth"
import type { Patient } from "../../types"

const visitSchema = z.object({
  patientId: z.string().min(1, "Patient is required"),
  chiefComplaint: z.string().min(1, "Chief complaint is required"),
  triageCategory: z.enum(["EMERGENCY", "URGENT", "NORMAL"]),
  visitType: z.enum(["CONSULTATION", "FOLLOW_UP", "EMERGENCY", "ROUTINE"]),
  department: z.string().optional(),
  notes: z.string().optional(),
})

type VisitData = z.infer<typeof visitSchema>

interface SearchResult {
  patients: Patient[]
  total: number
}

interface QuickVisitRecordingProps {
  onVisitCreated?: (visit: any) => void
  onCancel?: () => void
  showPatientSearch?: boolean
  preSelectedPatient?: Patient | null
}

export function QuickVisitRecording({ 
  onVisitCreated, 
  onCancel,
  showPatientSearch = true,
  preSelectedPatient = null
}: QuickVisitRecordingProps) {
  const { toast } = useToast()
  const { user, accessToken } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<SearchResult>({ patients: [], total: 0 })
  const [isSearching, setIsSearching] = useState(false)
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(preSelectedPatient)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<VisitData>({
    resolver: zodResolver(visitSchema),
    defaultValues: {
      triageCategory: "NORMAL",
      visitType: "CONSULTATION",
    },
  })

  const patientId = watch("patientId")

  // Set pre-selected patient
  useEffect(() => {
    if (preSelectedPatient) {
      setSelectedPatient(preSelectedPatient)
      setValue("patientId", preSelectedPatient.id)
    }
  }, [preSelectedPatient, setValue])

  // Search patients
  const searchPatients = async (query: string) => {
    if (!query.trim()) {
      setSearchResults({ patients: [], total: 0 })
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
        setSearchResults(result.data || { patients: [], total: 0 })
      }
    } catch (err) {
      console.error("Search failed:", err)
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
        setSearchResults({ patients: [], total: 0 })
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchQuery])

  const handlePatientSelect = (patient: Patient) => {
    setSelectedPatient(patient)
    setValue("patientId", patient.id)
    setSearchQuery("")
    setSearchResults({ patients: [], total: 0 })
  }

  const onSubmit = async (data: VisitData) => {
    setIsLoading(true)
    setError("")

    try {
      const response = await fetch("/api/visits", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          patientId: data.patientId,
          chiefComplaint: data.chiefComplaint,
          triageCategory: data.triageCategory,
          visitType: data.visitType,
          department: data.department,
          notes: data.notes,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to create visit")
      }

      const result = await response.json()
      
      toast({
        title: "Success",
        description: "Visit recorded successfully",
        variant: "default",
      })

      onVisitCreated?.(result.data)
    } catch (err: any) {
      setError(err.message || "Failed to record visit")
      toast({
        title: "Error",
        description: err.message || "Failed to record visit",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Stethoscope className="h-5 w-5" />
          Quick Visit Recording
        </CardTitle>
        <CardDescription>
          Record a new visit for an existing patient. This creates a visit record that can be used for clinical documentation and billing.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Patient Selection */}
          {showPatientSearch && (
            <div className="space-y-4">
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

              {/* Search Results */}
              {searchResults.patients.length > 0 && (
                <div className="border border-gray-200 dark:border-slate-700 rounded-lg max-h-60 overflow-y-auto">
                  {searchResults.patients.map((patient) => (
                    <div
                      key={patient.id}
                      onClick={() => handlePatientSelect(patient)}
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

              {/* Selected Patient */}
              {selectedPatient && (
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="font-medium text-green-800 dark:text-green-200">
                      Selected Patient
                    </span>
                  </div>
                  <div className="text-sm text-green-700 dark:text-green-300">
                    <p><strong>{selectedPatient.first_name} {selectedPatient.last_name}</strong></p>
                    <p>OP Number: {selectedPatient.op_number}</p>
                    {selectedPatient.phone_number && <p>Phone: {selectedPatient.phone_number}</p>}
                    <p>Insurance: {selectedPatient.insurance_type}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Visit Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Visit Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="visitType">Visit Type *</Label>
                <Select
                  value={watch("visitType")}
                  onValueChange={(value) => setValue("visitType", value as any)}
                >
                  <SelectTrigger className="border-2 border-blue-300 dark:border-blue-600 shadow-md h-12">
                    <SelectValue placeholder="Select visit type" />
                  </SelectTrigger>
                  <SelectContent className="shadow-xl z-50 max-h-60">
                    <SelectItem value="CONSULTATION" className="hover:bg-blue-100 font-medium py-3">
                      Consultation
                    </SelectItem>
                    <SelectItem value="FOLLOW_UP" className="hover:bg-blue-100 font-medium py-3">
                      Follow-up
                    </SelectItem>
                    <SelectItem value="EMERGENCY" className="hover:bg-blue-100 font-medium py-3">
                      Emergency
                    </SelectItem>
                    <SelectItem value="ROUTINE" className="hover:bg-blue-100 font-medium py-3">
                      Routine Check-up
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="triageCategory">Triage Category *</Label>
                <Select
                  value={watch("triageCategory")}
                  onValueChange={(value) => setValue("triageCategory", value as any)}
                >
                  <SelectTrigger className="border-2 border-blue-300 dark:border-blue-600 shadow-md h-12">
                    <SelectValue placeholder="Select triage category" />
                  </SelectTrigger>
                  <SelectContent className="shadow-xl z-50 max-h-60">
                    <SelectItem value="NORMAL" className="hover:bg-blue-100 font-medium py-3">
                      Normal
                    </SelectItem>
                    <SelectItem value="URGENT" className="hover:bg-blue-100 font-medium py-3">
                      Urgent
                    </SelectItem>
                    <SelectItem value="EMERGENCY" className="hover:bg-blue-100 font-medium py-3">
                      Emergency
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="chiefComplaint">Chief Complaint *</Label>
              <Textarea
                id="chiefComplaint"
                placeholder="Describe the patient's main complaint or reason for visit..."
                {...register("chiefComplaint")}
                className="border-2 border-blue-300 dark:border-blue-600 shadow-md min-h-[100px]"
              />
              {errors.chiefComplaint && (
                <p className="text-sm text-red-600">{errors.chiefComplaint.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                placeholder="e.g., General Medicine, Pediatrics, etc."
                {...register("department")}
                className="border-2 border-blue-300 dark:border-blue-600 shadow-md h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                id="notes"
                placeholder="Any additional notes or observations..."
                {...register("notes")}
                className="border-2 border-blue-300 dark:border-blue-600 shadow-md min-h-[80px]"
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-4 pt-6 border-t">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button 
              type="submit" 
              disabled={isLoading || !patientId}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Recording Visit...
                </>
              ) : (
                <>
                  <Stethoscope className="h-4 w-4 mr-2" />
                  Record Visit
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
