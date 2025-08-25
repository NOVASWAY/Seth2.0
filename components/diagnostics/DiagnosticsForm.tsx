"use client"
import { useState, useEffect, useCallback } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Textarea } from "../ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { Badge } from "../ui/badge"
import { useToast } from "../../hooks/use-toast"
import { useAuthStore } from "../../lib/auth"
import { Loader2, Plus, Trash2, Search, Clock, AlertTriangle, Save } from "lucide-react"
import type { Patient, AvailableTest, DiagnosticsFormData } from "../../types"

// Validation schemas
const diagnosticsItemSchema = z.object({
  testId: z.string().min(1, "Test is required"),
  testName: z.string().min(1, "Test name is required"),
  testCode: z.string().min(1, "Test code is required"),
  specimenType: z.string().min(1, "Specimen type is required"),
  clinicalNotes: z.string().optional(),
})

const diagnosticsSchema = z.object({
  patientId: z.string().optional(),
  visitId: z.string().optional(),
  consultationId: z.string().optional(),
  clinicalNotes: z.string().optional(),
  urgency: z.enum(["ROUTINE", "URGENT", "STAT"]).optional(),
  items: z.array(diagnosticsItemSchema).min(1, "At least one test is required"),
})

interface DiagnosticsFormProps {
  consultationId?: string
  visitId?: string
  patientId?: string
  onSuccess?: (data: any) => void
  onCancel?: () => void
}

interface AvailableTestItem extends AvailableTest {
  category: string
  turnaroundTime: number
  price: number
}

export function DiagnosticsForm({ consultationId, visitId, patientId, onSuccess, onCancel }: DiagnosticsFormProps) {
  const { toast } = useToast()
  const { user } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [availableTests, setAvailableTests] = useState<AvailableTestItem[]>([])
  const [testsLoading, setTestsLoading] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [autoSaveStatus, setAutoSaveStatus] = useState<"saved" | "saving" | "error">("saved")

  const { register, handleSubmit, control, watch, setValue, formState: { errors, isDirty } } = useForm<DiagnosticsFormData>({
    resolver: zodResolver(diagnosticsSchema),
    defaultValues: {
      patientId,
      visitId,
      consultationId,
      clinicalNotes: "",
      urgency: "ROUTINE",
      items: [],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  })

  // Auto-save functionality
  const autoSave = useCallback(async (data: DiagnosticsFormData) => {
    if (!isDirty || !data.items.length) return

    try {
      setAutoSaveStatus("saving")
      const draftKey = `diagnostics-draft-${consultationId || user?.id}-${Date.now()}`
      const draftData = {
        ...data,
        lastSaved: new Date().toISOString(),
        userId: user?.id,
      }
      
      localStorage.setItem(draftKey, JSON.stringify(draftData))
      setLastSaved(new Date())
      setAutoSaveStatus("saved")
    } catch (error) {
      console.error("Auto-save failed:", error)
      setAutoSaveStatus("error")
    }
  }, [isDirty, consultationId, user?.id])

  // Auto-save every 30 seconds when form is dirty
  useEffect(() => {
    const interval = setInterval(() => {
      const formData = watch()
      autoSave(formData)
    }, 30000)

    return () => clearInterval(interval)
  }, [autoSave, watch, isDirty])

  // Load draft on mount
  useEffect(() => {
    try {
      const draftKeys = Object.keys(localStorage).filter(key => 
        key.startsWith(`diagnostics-draft-${consultationId || user?.id}`)
      )
      
      if (draftKeys.length > 0) {
        const latestDraft = draftKeys.sort().pop()!
        const draftData = JSON.parse(localStorage.getItem(latestDraft)!)
        
        if (draftData && draftData.items?.length > 0) {
          setValue("clinicalNotes", draftData.clinicalNotes || "")
          setValue("urgency", draftData.urgency || "ROUTINE")
          setValue("items", draftData.items || [])
          
          toast({
            title: "Draft Restored",
            description: "Your previous work has been restored from auto-save.",
            duration: 5000,
          })
        }
      }
    } catch (error) {
      console.error("Failed to load draft:", error)
    }
  }, [consultationId, user?.id, setValue, toast])

  // Load available tests
  const loadAvailableTests = useCallback(async (search?: string, category?: string) => {
    try {
      setTestsLoading(true)
      const params = new URLSearchParams()
      if (search) params.append("search", search)
      if (category) params.append("category", category)

      const response = await fetch(`/api/lab-tests/available?${params}`)
      if (!response.ok) throw new Error("Failed to fetch tests")

      const result = await response.json()
      if (result.success) {
        setAvailableTests(result.data)
      } else {
        throw new Error(result.message || "Failed to fetch tests")
      }
    } catch (error) {
      console.error("Error loading tests:", error)
      toast({
        title: "Error",
        description: "Failed to load available tests. Please try again.",
        variant: "destructive",
      })
    } finally {
      setTestsLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadAvailableTests()
  }, [loadAvailableTests])

  // Handle test selection
  const handleTestSelect = (index: number, testId: string) => {
    const selectedTest = availableTests.find(test => test.id === testId)
    if (selectedTest) {
      setValue(`items.${index}.testId`, selectedTest.id)
      setValue(`items.${index}.testName`, selectedTest.testName)
      setValue(`items.${index}.testCode`, selectedTest.testCode)
      setValue(`items.${index}.specimenType`, selectedTest.specimenType)
    }
  }

  // Handle test search
  const handleTestSearch = (search: string) => {
    loadAvailableTests(search)
  }

  // Handle category filter
  const handleCategoryFilter = (category: string) => {
    loadAvailableTests(undefined, category === "all" ? undefined : category)
  }

  // Submit form
  const onSubmit = async (data: DiagnosticsFormData) => {
    try {
      setIsLoading(true)
      setError("")

      const response = await fetch("/api/lab-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          visitId: data.visitId || visitId,
          patientId: data.patientId || patientId,
          clinicalNotes: data.clinicalNotes,
          urgency: data.urgency,
          items: data.items,
        }),
      })

      const result = await response.json()

      if (result.success) {
        // Clear draft
        const draftKeys = Object.keys(localStorage).filter(key => 
          key.startsWith(`diagnostics-draft-${consultationId || user?.id}`)
        )
        draftKeys.forEach(key => localStorage.removeItem(key))

        toast({
          title: "Success",
          description: "Lab request created successfully",
        })

        onSuccess?.(result.data)
      } else {
        throw new Error(result.message || "Failed to create lab request")
      }
    } catch (error) {
      console.error("Error creating lab request:", error)
      setError(error instanceof Error ? error.message : "Failed to create lab request")
      toast({
        title: "Error",
        description: "Failed to create lab request. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Add test item
  const addTestItem = () => {
    append({
      testId: "",
      testName: "",
      testCode: "",
      specimenType: "",
      clinicalNotes: "",
    })
  }

  // Remove test item
  const removeTestItem = (index: number) => {
    remove(index)
  }

  // Get unique categories
  const categories = Array.from(new Set(availableTests.map(test => test.testCategory)))

  return (
    <div className="space-y-6">
      {/* Auto-save status */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Save className="h-4 w-4" />
        <span>
          {autoSaveStatus === "saving" && "Saving..."}
          {autoSaveStatus === "saved" && lastSaved && `Last saved: ${lastSaved.toLocaleTimeString()}`}
          {autoSaveStatus === "error" && "Save failed"}
        </span>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Clinical Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Clinical Information</CardTitle>
            <CardDescription>
              Provide clinical context for the laboratory tests
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="clinicalNotes">Clinical Notes</Label>
              <Textarea
                id="clinicalNotes"
                placeholder="Enter clinical notes, differential diagnosis, or specific instructions..."
                {...register("clinicalNotes")}
                className="mt-1"
              />
              {errors.clinicalNotes && (
                <p className="text-sm text-red-500 mt-1">{errors.clinicalNotes.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="urgency">Urgency Level</Label>
              <Select
                value={watch("urgency")}
                onValueChange={(value) => setValue("urgency", value as any)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select urgency level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ROUTINE">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Routine (24-48 hours)
                    </div>
                  </SelectItem>
                  <SelectItem value="URGENT">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-orange-500" />
                      Urgent (4-6 hours)
                    </div>
                  </SelectItem>
                  <SelectItem value="STAT">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                      STAT (1-2 hours)
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              {errors.urgency && (
                <p className="text-sm text-red-500 mt-1">{errors.urgency.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Test Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Laboratory Tests</CardTitle>
            <CardDescription>
              Select the tests to be performed
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Test Search and Filter */}
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  placeholder="Search tests..."
                  onChange={(e) => handleTestSearch(e.target.value)}
                  className="w-full"
                />
              </div>
              <Select onValueChange={handleCategoryFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Test Items */}
            <div className="space-y-4">
              {fields.map((field, index) => (
                <Card key={field.id} className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Test</Label>
                      <Select
                        value={watch(`items.${index}.testId`)}
                        onValueChange={(value) => handleTestSelect(index, value)}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select a test" />
                        </SelectTrigger>
                        <SelectContent>
                          {testsLoading ? (
                            <SelectItem value="" disabled>
                              <div className="flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Loading tests...
                              </div>
                            </SelectItem>
                          ) : (
                            availableTests.map((test) => (
                              <SelectItem key={test.id} value={test.id}>
                                <div className="flex flex-col">
                                  <span className="font-medium">{test.testName}</span>
                                  <span className="text-sm text-muted-foreground">
                                    {test.testCode} • {test.specimenType} • {test.turnaroundTime}h
                                  </span>
                                </div>
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      {errors.items?.[index]?.testId && (
                        <p className="text-sm text-red-500 mt-1">
                          {errors.items[index]?.testId?.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label>Clinical Notes (Optional)</Label>
                      <Input
                        placeholder="Test-specific notes..."
                        {...register(`items.${index}.clinicalNotes`)}
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div className="flex justify-between items-center mt-4">
                    <div className="flex gap-2">
                      {watch(`items.${index}.testId`) && (
                        <>
                          <Badge variant="outline">
                            {availableTests.find(t => t.id === watch(`items.${index}.testId`))?.specimenType}
                          </Badge>
                          <Badge variant="outline">
                            {availableTests.find(t => t.id === watch(`items.${index}.testId`))?.turnaroundTime}h
                          </Badge>
                          <Badge variant="outline">
                            KES {availableTests.find(t => t.id === watch(`items.${index}.testId`))?.price}
                          </Badge>
                        </>
                      )}
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeTestItem(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              ))}

              <Button
                type="button"
                variant="outline"
                onClick={addTestItem}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Test
              </Button>
            </div>

            {errors.items && (
              <p className="text-sm text-red-500">{errors.items.message}</p>
            )}
          </CardContent>
        </Card>

        {/* Error Display */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <p className="text-red-600">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Form Actions */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isLoading || !fields.length}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating Request...
              </>
            ) : (
              "Create Lab Request"
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
