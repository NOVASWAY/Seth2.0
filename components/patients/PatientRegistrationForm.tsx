"use client"
import { useState } from "react"
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
import { Loader2, UserPlus } from "lucide-react"

const patientSchema = z.object({
  opNumber: z.string().optional(), // Auto-generated if not provided
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
  shaNumber: z.string().optional(), // SHA-specific number
  chiefComplaint: z.string().optional(),
  triageCategory: z.enum(["EMERGENCY", "URGENT", "NORMAL"]),
})

type PatientFormData = z.infer<typeof patientSchema>

interface PatientRegistrationFormProps {
  onSuccess?: (patient: any) => void
  onCancel?: () => void
}

export function PatientRegistrationForm({ onSuccess, onCancel }: PatientRegistrationFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [registrationType, setRegistrationType] = useState<'NEW_PATIENT' | 'IMPORT_PATIENT'>('NEW_PATIENT')

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PatientFormData>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      gender: "MALE",
      insuranceType: "CASH",
      triageCategory: "NORMAL",
    },
  })

  const insuranceType = watch("insuranceType")

  const onSubmit = async (data: PatientFormData) => {
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

      // Register visit for today
      const visitResponse = await fetch("/api/visits", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
        body: JSON.stringify({
          patientId: patient.id,
          chiefComplaint: data.chiefComplaint,
          triageCategory: data.triageCategory,
        }),
      })

      if (!visitResponse.ok) {
        const errorData = await visitResponse.json()
        throw new Error(errorData.message || "Failed to register visit")
      }

      onSuccess?.(patient)
    } catch (err: any) {
      setError(err.message || "Registration failed")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          New Patient Registration
        </CardTitle>
        <CardDescription>
          Register a completely new patient who has never been in the system before.
          This will generate a new OP number and create their first visit record.
        </CardDescription>
        
        {/* Registration Type Indicator */}
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
              New Patient Registration Mode
            </span>
          </div>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
            For bulk importing existing patients, use the Import Patients feature in the main patients page.
          </p>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Personal Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Personal Information</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="opNumber">OP Number</Label>
                <Input 
                  id="opNumber" 
                  {...register("opNumber")} 
                  placeholder="Auto-generated if empty" 
                  disabled={isLoading}
                  className="font-mono"
                />
                <p className="text-xs text-slate-500">Leave empty to auto-generate</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input id="firstName" {...register("firstName")} placeholder="Enter first name" disabled={isLoading} />
                {errors.firstName && <p className="text-sm text-destructive">{errors.firstName.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input id="lastName" {...register("lastName")} placeholder="Enter last name" disabled={isLoading} />
                {errors.lastName && <p className="text-sm text-destructive">{errors.lastName.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dateOfBirth">Date of Birth</Label>
                <Input id="dateOfBirth" type="date" {...register("dateOfBirth")} disabled={isLoading} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="age">Age</Label>
                <Input
                  id="age"
                  type="number"
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
                <Input id="phoneNumber" {...register("phoneNumber")} placeholder="+254712345678" disabled={isLoading} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="area">Area/Location</Label>
                <Input id="area" {...register("area")} placeholder="Enter area or location" disabled={isLoading} />
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
                  placeholder="+254712345678"
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

              {insuranceType !== "CASH" && (
                <div className="space-y-2">
                  <Label htmlFor="insuranceNumber">
                    {insuranceType === "SHA" ? "SHA Number" : "Insurance Number"}
                  </Label>
                  <Input
                    id="insuranceNumber"
                    {...register("insuranceNumber")}
                    placeholder={insuranceType === "SHA" ? "Enter SHA number" : "Enter insurance number"}
                    disabled={isLoading}
                    className="font-mono"
                  />
                </div>
              )}
              
              {insuranceType === "SHA" && (
                <div className="space-y-2">
                  <Label htmlFor="shaNumber">SHA Specific Number</Label>
                  <Input
                    id="shaNumber"
                    {...register("shaNumber")}
                    placeholder="Additional SHA identifier"
                    disabled={isLoading}
                    className="font-mono"
                  />
                  <p className="text-xs text-slate-500">For SHA invoice generation</p>
                </div>
              )}
            </div>
          </div>

          {/* Visit Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Today's Visit</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="chiefComplaint">Chief Complaint</Label>
                <Textarea
                  id="chiefComplaint"
                  {...register("chiefComplaint")}
                  placeholder="Describe the main reason for today's visit"
                  disabled={isLoading}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="triageCategory">Triage Category</Label>
                <Select onValueChange={(value) => setValue("triageCategory", value as any)} defaultValue="NORMAL">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EMERGENCY">Emergency</SelectItem>
                    <SelectItem value="URGENT">Urgent</SelectItem>
                    <SelectItem value="NORMAL">Normal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4">
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Registering...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Register Patient
                </>
              )}
            </Button>

            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
