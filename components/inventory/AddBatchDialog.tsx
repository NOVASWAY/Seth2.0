"use client"
import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { Alert, AlertDescription } from "../ui/alert"
import { Loader2 } from "lucide-react"
import type { InventoryItem } from "../../types"

const batchSchema = z.object({
  inventoryItemId: z.string().min(1, "Please select an item"),
  batchNumber: z.string().min(1, "Batch number is required"),
  quantity: z.number().min(1, "Quantity must be positive"),
  unitCost: z.number().min(0, "Unit cost must be non-negative"),
  sellingPrice: z.number().min(0, "Selling price must be non-negative"),
  expiryDate: z.string().min(1, "Expiry date is required"),
  supplierName: z.string().optional(),
})

type BatchFormData = z.infer<typeof batchSchema>

interface AddBatchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function AddBatchDialog({ open, onOpenChange, onSuccess }: AddBatchDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [items, setItems] = useState<InventoryItem[]>([])

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<BatchFormData>({
    resolver: zodResolver(batchSchema),
  })

  useEffect(() => {
    if (open) {
      fetchItems()
    }
  }, [open])

  const fetchItems = async () => {
    try {
      const response = await fetch("/api/inventory/items?limit=100", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
      })

      if (response.ok) {
        const result = await response.json()
        setItems(result.data.items)
      }
    } catch (error) {
      console.error("Failed to fetch items:", error)
    }
  }

  const onSubmit = async (data: BatchFormData) => {
    setIsLoading(true)
    setError("")

    try {
      const response = await fetch("/api/inventory/batches", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to create batch")
      }

      reset()
      onOpenChange(false)
      onSuccess?.()
    } catch (err: any) {
      setError(err.message || "Failed to create batch")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Batch</DialogTitle>
          <DialogDescription>Receive new stock and create a batch</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="inventoryItemId">Item *</Label>
            <Select onValueChange={(value) => setValue("inventoryItemId", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select an item" />
              </SelectTrigger>
              <SelectContent>
                {items.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name} ({item.category})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.inventoryItemId && <p className="text-sm text-destructive">{errors.inventoryItemId.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="batchNumber">Batch Number *</Label>
              <Input
                id="batchNumber"
                {...register("batchNumber")}
                placeholder="Enter batch number"
                disabled={isLoading}
              />
              {errors.batchNumber && <p className="text-sm text-destructive">{errors.batchNumber.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                {...register("quantity", { valueAsNumber: true })}
                placeholder="Enter quantity"
                disabled={isLoading}
              />
              {errors.quantity && <p className="text-sm text-destructive">{errors.quantity.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="unitCost">Unit Cost (KES) *</Label>
              <Input
                id="unitCost"
                type="number"
                step="0.01"
                {...register("unitCost", { valueAsNumber: true })}
                placeholder="0.00"
                disabled={isLoading}
              />
              {errors.unitCost && <p className="text-sm text-destructive">{errors.unitCost.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="sellingPrice">Selling Price (KES) *</Label>
              <Input
                id="sellingPrice"
                type="number"
                step="0.01"
                {...register("sellingPrice", { valueAsNumber: true })}
                placeholder="0.00"
                disabled={isLoading}
              />
              {errors.sellingPrice && <p className="text-sm text-destructive">{errors.sellingPrice.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="expiryDate">Expiry Date *</Label>
            <Input id="expiryDate" type="date" {...register("expiryDate")} disabled={isLoading} />
            {errors.expiryDate && <p className="text-sm text-destructive">{errors.expiryDate.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="supplierName">Supplier Name</Label>
            <Input
              id="supplierName"
              {...register("supplierName")}
              placeholder="Enter supplier name"
              disabled={isLoading}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Batch"
              )}
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
