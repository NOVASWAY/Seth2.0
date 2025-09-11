"use client"

import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "../../../../components/ui/button"
import { Input } from "../../../../components/ui/input"
import { Label } from "../../../../components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../../components/ui/select"
import { Textarea } from "../../../../components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../../components/ui/card"
import { Alert, AlertDescription } from "../../../../components/ui/alert"
import { Badge } from "../../../../components/ui/badge"
import { Loader2, Save, ArrowLeft, User, Phone, MapPin, Calendar, Shield, Users, AlertCircle } from "lucide-react"
import { useToast } from "../../../../components/ui/use-toast"
import { useAuthStore } from "../../../../lib/auth"
import { ProtectedRoute } from "../../../../components/auth/ProtectedRoute"
import { UserRole } from "../../../../types"
import Sidebar from "../../../../components/dashboard/Sidebar"
import Link from "next/link"

const patientEditSchema = z.object({
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
})

type PatientEditData = z.infer<typeof patientEditSchema>

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

interface SystemUser {
  id: string
  username: string
  first_name: string
  last_name: string
  role: string
  is_active: boolean
}

export default function PatientEditPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const { user, accessToken } = useAuthStore()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState("")
  const [patient, setPatient] = useState<Patient | null>(null)
  const [systemUsers, setSystemUsers] = useState<SystemUser[]>([])
  const [assignedUsers, setAssignedUsers] = useState<string[]>([])
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<PatientEditData>({
    resolver: zodResolver(patientEditSchema),
  })

  const insuranceType = watch("insuranceType")

  // Load patient data
  useEffect(() => {
    const loadPatient = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/patients/${params.id}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        })

        if (!response.ok) {
          throw new Error("Failed to load patient")
        }

        const result = await response.json()
        const patientData = result.data

        setPatient(patientData)
        
        // Populate form with existing data
        setValue("firstName", patientData.first_name)
        setValue("lastName", patientData.last_name)
        setValue("dateOfBirth", patientData.date_of_birth || "")
        setValue("age", patientData.age || 0)
        setValue("gender", patientData.gender || "MALE")
        setValue("phoneNumber", patientData.phone_number || "")
        setValue("area", patientData.area || "")
        setValue("nextOfKin", patientData.next_of_kin || "")
        setValue("nextOfKinPhone", patientData.next_of_kin_phone || "")
        setValue("insuranceType", patientData.insurance_type || "CASH")
        setValue("insuranceNumber", patientData.insurance_number || "")

      } catch (err: any) {
        setError(err.message || "Failed to load patient")
        toast({
          title: "Error",
          description: "Failed to load patient data",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    if (params.id && accessToken) {
      loadPatient()
    }
  }, [params.id, accessToken, setValue, toast])

  // Load system users for assignment
  useEffect(() => {
    const loadSystemUsers = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/users`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        })

        if (response.ok) {
          const result = await response.json()
          setSystemUsers(result.data || [])
        }
      } catch (err) {
        console.error("Failed to load system users:", err)
      }
    }

    if (accessToken) {
      loadSystemUsers()
    }
  }, [accessToken])

  // Load current assignments
  useEffect(() => {
    const loadAssignments = async () => {
      if (!patient?.id) return

      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/patient-assignments/patient/${patient.id}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        })

        if (response.ok) {
          const result = await response.json()
          const activeAssignments = result.data.filter((assignment: any) => 
            assignment.status === 'ACTIVE'
          )
          setAssignedUsers(activeAssignments.map((assignment: any) => assignment.assigned_to_user_id))
        }
      } catch (err) {
        console.error("Failed to load assignments:", err)
      }
    }

    if (patient?.id) {
      loadAssignments()
    }
  }, [patient?.id, accessToken])

  const onSubmit = async (data: PatientEditData) => {
    setIsSaving(true)
    setError("")

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/patients/${params.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
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

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to update patient")
      }

      const result = await response.json()
      setPatient(result.data)

      toast({
        title: "Success",
        description: "Patient updated successfully",
        variant: "default",
      })

      // Redirect to patients page
      router.push("/patients")

    } catch (err: any) {
      setError(err.message || "Failed to update patient")
      toast({
        title: "Error",
        description: err.message || "Failed to update patient",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleUserAssignment = async (userId: string, isAssigned: boolean) => {
    try {
      if (isAssigned) {
        // Create assignment
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/patient-assignments`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            patient_id: patient?.id,
            assigned_to_user_id: userId,
            assignment_type: "GENERAL",
            assignment_reason: "Patient management",
            priority: "NORMAL",
          }),
        })

        if (response.ok) {
          setAssignedUsers(prev => [...prev, userId])
          toast({
            title: "Success",
            description: "Patient assigned to user",
            variant: "default",
          })
        }
      } else {
        // Remove assignment (deactivate)
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/patient-assignments/patient/${patient?.id}/user/${userId}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        })

        if (response.ok) {
          setAssignedUsers(prev => prev.filter(id => id !== userId))
          toast({
            title: "Success",
            description: "Patient assignment removed",
            variant: "default",
          })
        }
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: "Failed to update assignment",
        variant: "destructive",
      })
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading patient data...</span>
        </div>
      </div>
    )
  }

  if (!patient) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-2">
            Patient Not Found
          </h2>
          <p className="text-gray-600 dark:text-slate-400 mb-4">
            The patient you're looking for doesn't exist or you don't have permission to view it.
          </p>
          <Link href="/patients">
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Patients
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <ProtectedRoute requiredRoles={[UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.CLINICAL_OFFICER]}>
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
                  <Link href="/patients" className="mr-4">
                    <Button variant="ghost" size="sm">
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back
                    </Button>
                  </Link>
                  <div>
                    <h1 className="text-xl font-semibold text-gray-900 dark:text-slate-100">
                      Edit Patient
                    </h1>
                    <p className="text-sm text-gray-600 dark:text-slate-400">
                      OP Number: {patient.op_number}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    <User className="h-3 w-3 mr-1" />
                    {patient.first_name} {patient.last_name}
                  </Badge>
                </div>
              </div>
            </div>
          </nav>

          {/* Main Content */}
          <div className="flex-1 p-6">
            <div className="max-w-4xl mx-auto space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Patient Information Form */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Patient Information
                  </CardTitle>
                  <CardDescription>
                    Update patient details and personal information
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    {/* Basic Information */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name *</Label>
                        <Input
                          id="firstName"
                          {...register("firstName")}
                          className="border-2 border-blue-300 dark:border-blue-600 shadow-md h-12"
                        />
                        {errors.firstName && (
                          <p className="text-sm text-red-600">{errors.firstName.message}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name *</Label>
                        <Input
                          id="lastName"
                          {...register("lastName")}
                          className="border-2 border-blue-300 dark:border-blue-600 shadow-md h-12"
                        />
                        {errors.lastName && (
                          <p className="text-sm text-red-600">{errors.lastName.message}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="dateOfBirth">Date of Birth</Label>
                        <Input
                          id="dateOfBirth"
                          type="date"
                          {...register("dateOfBirth")}
                          className="border-2 border-blue-300 dark:border-blue-600 shadow-md h-12"
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
                          className="border-2 border-blue-300 dark:border-blue-600 shadow-md h-12"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="gender">Gender *</Label>
                        <Select
                          value={watch("gender")}
                          onValueChange={(value) => setValue("gender", value as any)}
                        >
                          <SelectTrigger className="border-2 border-blue-300 dark:border-blue-600 shadow-md h-12">
                            <SelectValue placeholder="Select gender" />
                          </SelectTrigger>
                          <SelectContent className="shadow-xl z-50 max-h-60">
                            <SelectItem value="MALE" className="hover:bg-blue-100 font-medium py-3">
                              Male
                            </SelectItem>
                            <SelectItem value="FEMALE" className="hover:bg-blue-100 font-medium py-3">
                              Female
                            </SelectItem>
                            <SelectItem value="OTHER" className="hover:bg-blue-100 font-medium py-3">
                              Other
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="phoneNumber">Phone Number</Label>
                        <Input
                          id="phoneNumber"
                          {...register("phoneNumber")}
                          className="border-2 border-blue-300 dark:border-blue-600 shadow-md h-12"
                        />
                      </div>
                    </div>

                    {/* Contact Information */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        Contact Information
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="area">Area/Location</Label>
                          <Input
                            id="area"
                            {...register("area")}
                            className="border-2 border-blue-300 dark:border-blue-600 shadow-md h-12"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="nextOfKin">Next of Kin</Label>
                          <Input
                            id="nextOfKin"
                            {...register("nextOfKin")}
                            className="border-2 border-blue-300 dark:border-blue-600 shadow-md h-12"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="nextOfKinPhone">Next of Kin Phone</Label>
                          <Input
                            id="nextOfKinPhone"
                            {...register("nextOfKinPhone")}
                            className="border-2 border-blue-300 dark:border-blue-600 shadow-md h-12"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Insurance Information */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Insurance Information
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="insuranceType">Insurance Type *</Label>
                          <Select
                            value={watch("insuranceType")}
                            onValueChange={(value) => setValue("insuranceType", value as any)}
                          >
                            <SelectTrigger className="border-2 border-blue-300 dark:border-blue-600 shadow-md h-12">
                              <SelectValue placeholder="Select insurance type" />
                            </SelectTrigger>
                            <SelectContent className="shadow-xl z-50 max-h-60">
                              <SelectItem value="CASH" className="hover:bg-blue-100 font-medium py-3">
                                Cash Payment
                              </SelectItem>
                              <SelectItem value="SHA" className="hover:bg-blue-100 font-medium py-3">
                                SHA (Social Health Authority)
                              </SelectItem>
                              <SelectItem value="PRIVATE" className="hover:bg-blue-100 font-medium py-3">
                                Private Insurance
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {(insuranceType === "SHA" || insuranceType === "PRIVATE") && (
                          <div className="space-y-2">
                            <Label htmlFor="insuranceNumber">
                              {insuranceType === "SHA" ? "SHA Beneficiary ID" : "Insurance Number"}
                            </Label>
                            <Input
                              id="insuranceNumber"
                              {...register("insuranceNumber")}
                              className="border-2 border-blue-300 dark:border-blue-600 shadow-md h-12"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Form Actions */}
                    <div className="flex justify-end space-x-4 pt-6 border-t">
                      <Link href="/patients">
                        <Button type="button" variant="outline">
                          Cancel
                        </Button>
                      </Link>
                      <Button 
                        type="submit" 
                        disabled={isSaving || !isDirty}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {isSaving ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-2" />
                            Save Changes
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              {/* User Assignment */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    User Assignment
                  </CardTitle>
                  <CardDescription>
                    Assign this patient to system users for management and care
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {(systemUsers || []).map((systemUser) => (
                        <div
                          key={systemUser.id}
                          className={`p-4 border-2 rounded-lg transition-all ${
                            (assignedUsers || []).includes(systemUser.id)
                              ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                              : "border-gray-200 dark:border-slate-700"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium text-gray-900 dark:text-slate-100">
                                {systemUser.first_name} {systemUser.last_name}
                              </h4>
                              <p className="text-sm text-gray-600 dark:text-slate-400">
                                @{systemUser.username}
                              </p>
                              <Badge variant="outline" className="mt-1">
                                {systemUser.role}
                              </Badge>
                            </div>
                            <Button
                              size="sm"
                              variant={(assignedUsers || []).includes(systemUser.id) ? "destructive" : "default"}
                              onClick={() => handleUserAssignment(
                                systemUser.id, 
                                !(assignedUsers || []).includes(systemUser.id)
                              )}
                            >
                              {(assignedUsers || []).includes(systemUser.id) ? "Remove" : "Assign"}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {(assignedUsers || []).length > 0 && (
                      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                          <strong>Assigned to {(assignedUsers || []).length} user(s):</strong> This patient is currently assigned to system users for management and care coordination.
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
