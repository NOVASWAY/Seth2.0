"use client"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Textarea } from "../ui/textarea"
import { Alert, AlertDescription } from "../ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs"
import { Loader2, Package, DollarSign, Truck, AlertTriangle } from "lucide-react"
import { useToast } from "../../hooks/use-toast"
import { useAuthStore } from "../../lib/auth"

const itemSchema = z.object({
  name: z.string().min(1, "Item name is required"),
  itemCode: z.string().min(1, "Item code/ID is required"),
  genericName: z.string().optional(),
  category: z.string().min(1, "Category is required"),
  unit: z.string().min(1, "Unit of measure is required"),
  quantityAvailable: z.number().min(0, "Quantity must be non-negative"),
  costPricePerUnit: z.number().min(0, "Cost price must be non-negative"),
  sellingPricePerUnit: z.number().min(0, "Selling price must be non-negative"),
  supplierDetails: z.string().min(1, "Supplier details are required"),
  expiryDate: z.string().min(1, "Expiry date is required"),
  batchNumber: z.string().optional(),
  reorderLevel: z.number().min(0, "Reorder level must be non-negative"),
  maxLevel: z.number().min(1, "Max level must be positive"),
})

type ItemFormData = z.infer<typeof itemSchema>

interface EnhancedAddItemDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function EnhancedAddItemDialog({ open, onOpenChange, onSuccess }: EnhancedAddItemDialogProps) {
  const { toast } = useToast()
  const { accessToken } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<ItemFormData>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      quantityAvailable: 0,
      costPricePerUnit: 0,
      sellingPricePerUnit: 0,
      reorderLevel: 10,
      maxLevel: 1000,
    },
  })

  const watchedValues = watch()
  const profitMargin = watchedValues.sellingPricePerUnit && watchedValues.costPricePerUnit 
    ? ((watchedValues.sellingPricePerUnit - watchedValues.costPricePerUnit) / watchedValues.costPricePerUnit * 100)
    : 0

  const onSubmit = async (data: ItemFormData) => {
    setIsLoading(true)
    setError("")

    try {
      const response = await fetch("/api/inventory/items", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          ...data,
          totalValue: data.quantityAvailable * data.costPricePerUnit
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to create item")
      }

      toast({
        title: "Success",
        description: "Inventory item created successfully",
      })

      reset()
      onOpenChange(false)
      onSuccess?.()
    } catch (err: any) {
      setError(err.message || "Failed to create item")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Add New Inventory Item
          </DialogTitle>
          <DialogDescription>
            Create a new item with complete pricing, supplier, and stock information
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="basic" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="pricing">Pricing</TabsTrigger>
            <TabsTrigger value="supplier">Supplier</TabsTrigger>
            <TabsTrigger value="stock">Stock Levels</TabsTrigger>
          </TabsList>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <TabsContent value="basic" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Item Name *</Label>
                  <Input 
                    id="name" 
                    {...register("name")} 
                    placeholder="e.g., Paracetamol Tablets 500mg" 
                    disabled={isLoading} 
                  />
                  {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="itemCode">Item Code/ID *</Label>
                  <Input 
                    id="itemCode" 
                    {...register("itemCode")} 
                    placeholder="e.g., MED001, PARA500" 
                    disabled={isLoading} 
                    className="font-mono" 
                  />
                  {errors.itemCode && <p className="text-sm text-destructive">{errors.itemCode.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Input 
                    id="category" 
                    {...register("category")} 
                    placeholder="e.g., Antibiotics, Analgesics" 
                    disabled={isLoading} 
                  />
                  {errors.category && <p className="text-sm text-destructive">{errors.category.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="unit">Unit of Measure *</Label>
                  <Input 
                    id="unit" 
                    {...register("unit")} 
                    placeholder="e.g., tablets, capsules, ml" 
                    disabled={isLoading} 
                  />
                  {errors.unit && <p className="text-sm text-destructive">{errors.unit.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quantityAvailable">Initial Quantity *</Label>
                  <Input
                    id="quantityAvailable"
                    type="number"
                    {...register("quantityAvailable", { valueAsNumber: true })}
                    placeholder="100"
                    disabled={isLoading}
                  />
                  {errors.quantityAvailable && <p className="text-sm text-destructive">{errors.quantityAvailable.message}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="genericName">Generic Name</Label>
                <Input
                  id="genericName"
                  {...register("genericName")}
                  placeholder="e.g., Acetaminophen"
                  disabled={isLoading}
                />
              </div>
            </TabsContent>

            <TabsContent value="pricing" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="costPricePerUnit">Cost Price per Unit (KSh) *</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      id="costPricePerUnit"
                      type="number"
                      step="0.01"
                      {...register("costPricePerUnit", { valueAsNumber: true })}
                      placeholder="50.00"
                      disabled={isLoading}
                      className="pl-10"
                    />
                  </div>
                  {errors.costPricePerUnit && <p className="text-sm text-destructive">{errors.costPricePerUnit.message}</p>}
                  <p className="text-xs text-slate-500">Purchase price from supplier</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sellingPricePerUnit">Selling Price per Unit (KSh) *</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      id="sellingPricePerUnit"
                      type="number"
                      step="0.01"
                      {...register("sellingPricePerUnit", { valueAsNumber: true })}
                      placeholder="75.00"
                      disabled={isLoading}
                      className="pl-10"
                    />
                  </div>
                  {errors.sellingPricePerUnit && <p className="text-sm text-destructive">{errors.sellingPricePerUnit.message}</p>}
                  <p className="text-xs text-slate-500">Clinic's set price for patients</p>
                </div>
              </div>

              {/* Pricing Summary */}
              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                <h4 className="font-medium mb-3">Pricing Summary</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-slate-600 dark:text-slate-400">Cost Price:</span>
                    <p className="font-bold text-red-600">KSh {watchedValues.costPricePerUnit?.toFixed(2) || '0.00'}</p>
                  </div>
                  <div>
                    <span className="text-slate-600 dark:text-slate-400">Selling Price:</span>
                    <p className="font-bold text-green-600">KSh {watchedValues.sellingPricePerUnit?.toFixed(2) || '0.00'}</p>
                  </div>
                  <div>
                    <span className="text-slate-600 dark:text-slate-400">Profit Margin:</span>
                    <p className="font-bold text-blue-600">{profitMargin.toFixed(1)}%</p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                  <div className="flex justify-between text-sm">
                    <span>Total Stock Value (Cost):</span>
                    <span className="font-bold">KSh {((watchedValues.quantityAvailable || 0) * (watchedValues.costPricePerUnit || 0)).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Total Stock Value (Selling):</span>
                    <span className="font-bold">KSh {((watchedValues.quantityAvailable || 0) * (watchedValues.sellingPricePerUnit || 0)).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="supplier" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="supplierDetails">Supplier Details *</Label>
                <Textarea 
                  id="supplierDetails" 
                  {...register("supplierDetails")} 
                  placeholder="Supplier Name: Pharma Ltd&#10;Contact: +254 700 000 000&#10;Email: orders@pharma.co.ke&#10;Address: Nairobi, Kenya" 
                  disabled={isLoading}
                  rows={4}
                />
                {errors.supplierDetails && <p className="text-sm text-destructive">{errors.supplierDetails.message}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="expiryDate">Expiry Date *</Label>
                  <Input
                    id="expiryDate"
                    type="date"
                    {...register("expiryDate")}
                    disabled={isLoading}
                  />
                  {errors.expiryDate && <p className="text-sm text-destructive">{errors.expiryDate.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="batchNumber">Batch Number</Label>
                  <Input 
                    id="batchNumber" 
                    {...register("batchNumber")} 
                    placeholder="e.g., BATCH2024001" 
                    disabled={isLoading} 
                    className="font-mono" 
                  />
                </div>
              </div>

              {/* Expiry Warning */}
              {watchedValues.expiryDate && new Date(watchedValues.expiryDate) < new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Warning:</strong> This item expires within 90 days. Consider checking with supplier for fresher stock.
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>

            <TabsContent value="stock" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="reorderLevel">Minimum Stock Level *</Label>
                  <Input
                    id="reorderLevel"
                    type="number"
                    {...register("reorderLevel", { valueAsNumber: true })}
                    placeholder="10"
                    disabled={isLoading}
                  />
                  {errors.reorderLevel && <p className="text-sm text-destructive">{errors.reorderLevel.message}</p>}
                  <p className="text-xs text-slate-500">Alert when stock reaches this level</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxLevel">Maximum Stock Level *</Label>
                  <Input
                    id="maxLevel"
                    type="number"
                    {...register("maxLevel", { valueAsNumber: true })}
                    placeholder="1000"
                    disabled={isLoading}
                  />
                  {errors.maxLevel && <p className="text-sm text-destructive">{errors.maxLevel.message}</p>}
                  <p className="text-xs text-slate-500">Maximum quantity to stock</p>
                </div>
              </div>

              {/* Stock Level Visualization */}
              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                <h4 className="font-medium mb-3">Stock Level Preview</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Current Stock:</span>
                    <span className="font-bold">{watchedValues.quantityAvailable || 0} {watchedValues.unit || 'units'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Reorder Level:</span>
                    <span className="font-bold text-orange-600">{watchedValues.reorderLevel || 0} {watchedValues.unit || 'units'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Maximum Level:</span>
                    <span className="font-bold text-green-600">{watchedValues.maxLevel || 0} {watchedValues.unit || 'units'}</span>
                  </div>
                  
                  {/* Stock Level Indicator */}
                  {watchedValues.quantityAvailable !== undefined && watchedValues.reorderLevel !== undefined && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs">Stock Status:</span>
                        <span className={`text-xs font-medium ${
                          watchedValues.quantityAvailable <= watchedValues.reorderLevel 
                            ? 'text-red-600' 
                            : watchedValues.quantityAvailable <= watchedValues.reorderLevel * 2
                            ? 'text-orange-600'
                            : 'text-green-600'
                        }`}>
                          {watchedValues.quantityAvailable <= watchedValues.reorderLevel 
                            ? 'Low Stock' 
                            : watchedValues.quantityAvailable <= watchedValues.reorderLevel * 2
                            ? 'Medium Stock'
                            : 'Good Stock'}
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            watchedValues.quantityAvailable <= watchedValues.reorderLevel 
                              ? 'bg-red-600' 
                              : watchedValues.quantityAvailable <= watchedValues.reorderLevel * 2
                              ? 'bg-orange-600'
                              : 'bg-green-600'
                          }`}
                          style={{ 
                            width: `${Math.min(100, (watchedValues.quantityAvailable / (watchedValues.maxLevel || 1)) * 100)}%` 
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Submit Buttons */}
            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="bg-gradient-to-r from-purple-600 to-orange-500 hover:from-purple-700 hover:to-orange-600"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Package className="h-4 w-4 mr-2" />
                    Add Item to Inventory
                  </>
                )}
              </Button>
            </div>
          </form>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
