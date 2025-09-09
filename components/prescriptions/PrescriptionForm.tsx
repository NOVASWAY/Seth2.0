"use client"

import { useState, useEffect, useCallback } from "react"
import { useForm, useFieldArray } from "react-hook-form"
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
import { Loader2, Plus, Trash2, Save, Clock, AlertTriangle, CheckCircle } from "lucide-react"
import { useToast } from "../../hooks/use-toast"
import { useAuthStore } from "../../lib/auth"
import { MedicationAutocomplete } from "../clinical/ClinicalAutocomplete"
import type { Patient, InventoryItem } from "../../types"

const prescriptionItemSchema = z.object({
  inventoryItemId: z.string().min(1, "Medicine is required"),
  itemName: z.string().min(1, "Medicine name is required"),
  dosage: z.string().min(1, "Dosage is required"),
  frequency: z.string().min(1, "Frequency is required"),
  duration: z.string().min(1, "Duration is required"),
  quantityPrescribed: z.number().min(1, "Quantity must be at least 1"),
  instructions: z.string().optional(),
})

const prescriptionSchema = z.object({
  consultationId: z.string().min(1, "Consultation is required"),
  visitId: z.string().min(1, "Visit is required"),
  patientId: z.string().min(1, "Patient is required"),
  items: z.array(prescriptionItemSchema).min(1, "At least one medicine is required"),
})

type PrescriptionFormData = z.infer<typeof prescriptionSchema>

interface PrescriptionFormProps {
  consultationId: string
  visitId: string
  patientId: string
  onSuccess?: (prescription: any) => void
  onCancel?: () => void
}

interface AvailableStockItem {
  id: string
  name: string
  genericName?: string
  category: string
  unit: string
  availableQuantity: number
  sellingPrice: number
  hasExpiringStock: boolean
}

export function PrescriptionForm({ consultationId, visitId, patientId, onSuccess, onCancel }: PrescriptionFormProps) {
  const { toast } = useToast()
  const { user } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [availableStock, setAvailableStock] = useState<AvailableStockItem[]>([])
  const [stockLoading, setStockLoading] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [autoSaveStatus, setAutoSaveStatus] = useState<"saved" | "saving" | "error">("saved")

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<PrescriptionFormData>({
    resolver: zodResolver(prescriptionSchema),
    defaultValues: {
      consultationId,
      visitId,
      patientId,
      items: [
        {
          inventoryItemId: "",
          itemName: "",
          dosage: "",
          frequency: "",
          duration: "",
          quantityPrescribed: 1,
          instructions: "",
        },
      ],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  })

  const watchedItems = watch("items")

  // Auto-save functionality
  const autoSave = useCallback(async (data: PrescriptionFormData) => {
    if (!isDirty) return

    try {
      setAutoSaveStatus("saving")
      
      // Save to localStorage as backup
      localStorage.setItem(`prescription-draft-${consultationId}`, JSON.stringify({
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
  }, [isDirty, consultationId, user?.id])

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

  // Load available stock
  const loadAvailableStock = useCallback(async (search?: string) => {
    setStockLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.append("search", search)
      
      const response = await fetch(`/api/inventory/available-stock?${params}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch available stock")
      }

      const result = await response.json()
      setAvailableStock(result.data)
    } catch (error: any) {
      console.error("Failed to load stock:", error)
      toast({
        title: "Error",
        description: "Failed to load available medicines",
        variant: "destructive",
      })
    } finally {
      setStockLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadAvailableStock()
  }, [loadAvailableStock])

  // Load draft from localStorage on mount
  useEffect(() => {
    const draft = localStorage.getItem(`prescription-draft-${consultationId}`)
    if (draft) {
      try {
        const parsed = JSON.parse(draft)
        // Only load if draft is from same user and less than 24 hours old
        const draftAge = Date.now() - new Date(parsed.timestamp).getTime()
        if (parsed.userId === user?.id && draftAge < 24 * 60 * 60 * 1000) {
          Object.keys(parsed.data).forEach((key) => {
            setValue(key as keyof PrescriptionFormData, parsed.data[key])
          })
          toast({
            title: "Draft Restored",
            description: "Your previous prescription draft has been restored",
          })
        }
      } catch (error) {
        console.error("Failed to restore draft:", error)
      }
    }
  }, [consultationId, user?.id, setValue, toast])

  const addMedicine = () => {
    append({
      inventoryItemId: "",
      itemName: "",
      dosage: "",
      frequency: "",
      duration: "",
      quantityPrescribed: 1,
      instructions: "",
    })
  }

  const removeMedicine = (index: number) => {
    if (fields.length > 1) {
      remove(index)
    }
  }

  const handleMedicineSelect = (index: number, itemId: string) => {
    const selectedItem = availableStock.find(item => item.id === itemId)
    if (selectedItem) {
      setValue(`items.${index}.inventoryItemId`, itemId)
      setValue(`items.${index}.itemName`, selectedItem.name)
    }
  }

  const onSubmit = async (data: PrescriptionFormData) => {
    setIsLoading(true)
    setError("")

    try {
      const response = await fetch("/api/prescriptions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to create prescription")
      }

      const result = await response.json()
      
      // Clear draft from localStorage
      localStorage.removeItem(`prescription-draft-${consultationId}`)
      
      toast({
        title: "Success",
        description: "Prescription created successfully",
      })

      if (onSuccess) {
        onSuccess(result.data)
      }
    } catch (err: any) {
      setError(err.message || "Failed to create prescription")
      toast({
        title: "Error",
        description: err.message || "Failed to create prescription",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleStockSearch = (search: string) => {
    loadAvailableStock(search)
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Create Prescription</CardTitle>
            <CardDescription>
              Prescribe medicines for the patient with real-time stock availability
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

          {/* Hidden fields */}
          <input type="hidden" {...register("consultationId")} />
          <input type="hidden" {...register("visitId")} />
          <input type="hidden" {...register("patientId")} />

          {/* Prescription Items */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">Prescribed Medicines</Label>
              <Button type="button" onClick={addMedicine} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Medicine
              </Button>
            </div>

            {fields.map((field, index) => (
              <Card key={field.id} className="p-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Medicine {index + 1}</h4>
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        onClick={() => removeMedicine(index)}
                        variant="outline"
                        size="sm"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Medicine Selection */}
                    <div className="space-y-2">
                      <Label>Medicine *</Label>
                      <Select
                        value={watchedItems[index]?.inventoryItemId || ""}
                        onValueChange={(value) => handleMedicineSelect(index, value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select medicine from stock" />
                        </SelectTrigger>
                        <SelectContent>
                          <div className="p-2">
                            <Input
                              placeholder="Search medicines..."
                              onChange={(e) => handleStockSearch(e.target.value)}
                              className="mb-2"
                            />
                          </div>
                          {stockLoading ? (
                            <div className="p-4 text-center">
                              <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                              <p className="text-sm text-muted-foreground mt-2">Loading...</p>
                            </div>
                          ) : (
                            availableStock.map((item) => (
                              <SelectItem key={item.id} value={item.id}>
                                <div className="flex flex-col">
                                  <span className="font-medium">{item.name}</span>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span>{item.category}</span>
                                    <span>•</span>
                                    <span>{item.availableQuantity} {item.unit} available</span>
                                    {item.hasExpiringStock && (
                                      <>
                                        <span>•</span>
                                        <Badge variant="destructive" className="text-xs">Expiring Soon</Badge>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      {errors.items?.[index]?.inventoryItemId && (
                        <p className="text-sm text-destructive">
                          {errors.items[index]?.inventoryItemId?.message}
                        </p>
                      )}
                    </div>

                    {/* Manual Medicine Name Input */}
                    <div className="space-y-2">
                      <Label>Medicine Name (Manual Override)</Label>
                      <Input
                        {...register(`items.${index}.itemName`)}
                        placeholder="Enter medicine name manually"
                        disabled={!!watchedItems[index]?.inventoryItemId}
                      />
                      {errors.items?.[index]?.itemName && (
                        <p className="text-sm text-destructive">
                          {errors.items[index]?.itemName?.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Dosage */}
                    <div className="space-y-2">
                      <Label>Dosage *</Label>
                      <Input
                        {...register(`items.${index}.dosage`)}
                        placeholder="e.g., 500mg, 1 tablet"
                      />
                      {errors.items?.[index]?.dosage && (
                        <p className="text-sm text-destructive">
                          {errors.items[index]?.dosage?.message}
                        </p>
                      )}
                    </div>

                    {/* Frequency */}
                    <div className="space-y-2">
                      <Label>Frequency *</Label>
                      <Input
                        {...register(`items.${index}.frequency`)}
                        placeholder="e.g., Twice daily, Every 8 hours"
                      />
                      {errors.items?.[index]?.frequency && (
                        <p className="text-sm text-destructive">
                          {errors.items[index]?.frequency?.message}
                        </p>
                      )}
                    </div>

                    {/* Duration */}
                    <div className="space-y-2">
                      <Label>Duration *</Label>
                      <Input
                        {...register(`items.${index}.duration`)}
                        placeholder="e.g., 7 days, 2 weeks"
                      />
                      {errors.items?.[index]?.duration && (
                        <p className="text-sm text-destructive">
                          {errors.items[index]?.duration?.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Quantity */}
                    <div className="space-y-2">
                      <Label>Quantity Prescribed *</Label>
                      <Input
                        type="number"
                        min="1"
                        {...register(`items.${index}.quantityPrescribed`, { valueAsNumber: true })}
                        placeholder="Enter quantity"
                      />
                      {errors.items?.[index]?.quantityPrescribed && (
                        <p className="text-sm text-destructive">
                          {errors.items[index]?.quantityPrescribed?.message}
                        </p>
                      )}
                    </div>

                    {/* Instructions */}
                    <div className="space-y-2">
                      <Label>Special Instructions</Label>
                      <Textarea
                        {...register(`items.${index}.instructions`)}
                        placeholder="e.g., Take with food, Avoid alcohol"
                        rows={2}
                      />
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

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
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Create Prescription
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
