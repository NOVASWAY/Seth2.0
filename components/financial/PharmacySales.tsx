"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { Textarea } from "../ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog"
import { useToast } from "../../hooks/use-toast"
import { Plus, ShoppingCart, Package, User, Receipt, CheckCircle, Trash2, Minus } from "lucide-react"
import { formatCurrencyDisplay } from "../../lib/currency"

interface InventoryItem {
  id: string
  name: string
  generic_name?: string
  category: string
  unit: string
  selling_price: number
  available_quantity: number
}

interface SaleItem {
  inventory_item_id: string
  item_name: string
  quantity: number
  unit_price: number
  total_price: number
}

interface PharmacySaleData {
  buyer_name: string
  buyer_phone: string
  items: SaleItem[]
  payment_method: "cash" | "mpesa" | "bank_transfer"
  mpesa_receipt?: string
  notes?: string
}

interface PharmacySalesProps {
  onSaleRecorded?: () => void
}

export function PharmacySales({ onSaleRecorded }: PharmacySalesProps) {
  const { toast } = useToast()
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [mpesaLoading, setMpesaLoading] = useState(false)
  const [showDialog, setShowDialog] = useState(false)
  const [saleData, setSaleData] = useState<PharmacySaleData>({
    buyer_name: "",
    buyer_phone: "",
    items: [],
    payment_method: "cash",
    mpesa_receipt: "",
    notes: ""
  })

  useEffect(() => {
    fetchInventoryItems()
  }, [])

  const fetchInventoryItems = async () => {
    try {
      const response = await fetch("/api/inventory/items", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })
      if (response.ok) {
        const data = await response.json()
        setInventoryItems(data.data || [])
      }
    } catch (error) {
      console.error("Error fetching inventory items:", error)
    }
  }

  const addItem = () => {
    setSaleData({
      ...saleData,
      items: [...saleData.items, {
        inventory_item_id: "",
        item_name: "",
        quantity: 1,
        unit_price: 0,
        total_price: 0
      }]
    })
  }

  const removeItem = (index: number) => {
    const newItems = saleData.items.filter((_, i) => i !== index)
    setSaleData({ ...saleData, items: newItems })
  }

  const updateItem = (index: number, field: keyof SaleItem, value: any) => {
    const newItems = [...saleData.items]
    newItems[index] = { ...newItems[index], [field]: value }
    
    // If updating inventory_item_id, also update item_name and unit_price
    if (field === "inventory_item_id") {
      const selectedItem = inventoryItems.find(item => item.id === value)
      if (selectedItem) {
        newItems[index].item_name = selectedItem.name
        newItems[index].unit_price = selectedItem.selling_price
        newItems[index].total_price = newItems[index].quantity * selectedItem.selling_price
      }
    }
    
    // If updating quantity or unit_price, recalculate total_price
    if (field === "quantity" || field === "unit_price") {
      newItems[index].total_price = newItems[index].quantity * newItems[index].unit_price
    }
    
    setSaleData({ ...saleData, items: newItems })
  }

  const getTotalAmount = () => {
    return saleData.items.reduce((sum, item) => sum + item.total_price, 0)
  }

  const getTaxAmount = () => {
    return getTotalAmount() * 0.16 // 16% VAT
  }

  const getGrandTotal = () => {
    return getTotalAmount() + getTaxAmount()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (saleData.items.length === 0) {
      toast({
        title: "No Items",
        description: "Please add at least one item to the sale",
        variant: "destructive",
      })
      return
    }

    if (!saleData.buyer_name.trim()) {
      toast({
        title: "Buyer Name Required",
        description: "Please enter the buyer's name",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      // Create invoice for walk-in sale
      const invoiceResponse = await fetch("/api/financial/invoices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          buyer_name: saleData.buyer_name,
          buyer_phone: saleData.buyer_phone,
          items: saleData.items.map(item => ({
            inventory_item_id: item.inventory_item_id,
            item_name: item.item_name,
            quantity: item.quantity,
            unit_price: item.unit_price
          })),
          payment_terms: "immediate",
          notes: saleData.notes
        }),
      })

      if (!invoiceResponse.ok) {
        throw new Error("Failed to create invoice")
      }

      const invoiceData = await invoiceResponse.json()
      const invoiceId = invoiceData.data.id

      // Process payment
      const paymentResponse = await fetch("/api/financial/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          invoice_id: invoiceId,
          amount: getGrandTotal(),
          payment_method: saleData.payment_method,
          mpesa_receipt: saleData.mpesa_receipt,
          notes: saleData.notes,
        }),
      })

      if (paymentResponse.ok) {
        toast({
          title: "Sale Recorded Successfully",
          description: `Sale of ${formatCurrencyDisplay(getGrandTotal())} recorded for ${saleData.buyer_name}`,
        })
        
        // Reset form
        setSaleData({
          buyer_name: "",
          buyer_phone: "",
          items: [],
          payment_method: "cash",
          mpesa_receipt: "",
          notes: ""
        })
        setShowDialog(false)
        onSaleRecorded?.()
      } else {
        throw new Error("Failed to process payment")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to record sale. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleMpesaPayment = async () => {
    if (!saleData.buyer_phone) {
      toast({
        title: "Phone Number Required",
        description: "Please enter the buyer's phone number for M-Pesa payment",
        variant: "destructive",
      })
      return
    }

    setMpesaLoading(true)
    try {
      const response = await fetch("/api/financial/mpesa/stk-push", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          phone_number: saleData.buyer_phone,
          amount: getGrandTotal(),
          account_reference: `SALE-${Date.now()}`,
          transaction_desc: `Pharmacy sale for ${saleData.buyer_name}`,
        }),
      })

      if (response.ok) {
        toast({
          title: "M-Pesa Payment Initiated",
          description: "Please check the buyer's phone for M-Pesa prompt",
        })
      } else {
        throw new Error("Failed to initiate M-Pesa payment")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to initiate M-Pesa payment",
        variant: "destructive",
      })
    } finally {
      setMpesaLoading(false)
    }
  }

  return (
    <Dialog open={showDialog} onOpenChange={setShowDialog}>
      <DialogTrigger asChild>
        <Button className="bg-purple-600 hover:bg-purple-700 text-white">
          <Plus className="h-4 w-4 mr-2" />
          Pharmacy Sale
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Pharmacy Sale - Non-Patient
          </DialogTitle>
          <DialogDescription>
            Record a medicine sale to a walk-in customer (non-patient)
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Buyer Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="buyer_name">Buyer Name *</Label>
              <Input
                id="buyer_name"
                value={saleData.buyer_name}
                onChange={(e) => setSaleData({...saleData, buyer_name: e.target.value})}
                className="bg-white dark:bg-gray-700 border-2 border-blue-300 dark:border-blue-600 text-gray-900 dark:text-white hover:border-blue-400 dark:hover:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 shadow-md h-12"
                placeholder="Enter buyer's full name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="buyer_phone">Phone Number</Label>
              <Input
                id="buyer_phone"
                type="tel"
                value={saleData.buyer_phone}
                onChange={(e) => setSaleData({...saleData, buyer_phone: e.target.value})}
                className="bg-white dark:bg-gray-700 border-2 border-blue-300 dark:border-blue-600 text-gray-900 dark:text-white hover:border-blue-400 dark:hover:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 shadow-md h-12"
                placeholder="254XXXXXXXXX"
              />
            </div>
          </div>

          {/* Items Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-lg font-semibold">Items</Label>
              <Button
                type="button"
                onClick={addItem}
                variant="outline"
                size="sm"
                className="border-blue-300 text-blue-600 hover:bg-blue-50"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>

            {saleData.items.map((item, index) => (
              <Card key={index} className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
                  <div className="md:col-span-2 space-y-2">
                    <Label>Medicine</Label>
                    <Select 
                      value={item.inventory_item_id} 
                      onValueChange={(value) => updateItem(index, "inventory_item_id", value)}
                    >
                      <SelectTrigger className="bg-white dark:bg-gray-700 border-2 border-blue-300 dark:border-blue-600 text-gray-900 dark:text-white hover:border-blue-400 dark:hover:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 shadow-md h-12">
                        <SelectValue placeholder="Select medicine" />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-gray-800 border-2 border-blue-200 dark:border-blue-600 shadow-xl z-50 max-h-60">
                        {inventoryItems.map(medicine => (
                          <SelectItem 
                            key={medicine.id} 
                            value={medicine.id}
                            className="text-gray-900 dark:text-white hover:bg-blue-100 dark:hover:bg-blue-700 focus:bg-blue-100 dark:focus:bg-blue-700 cursor-pointer font-medium py-3"
                          >
                            {medicine.name} - {formatCurrencyDisplay(medicine.selling_price)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Quantity</Label>
                    <div className="flex items-center space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => updateItem(index, "quantity", Math.max(1, item.quantity - 1))}
                        disabled={item.quantity <= 1}
                        className="h-12 w-12 p-0"
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, "quantity", parseInt(e.target.value) || 1)}
                        className="bg-white dark:bg-gray-700 border-2 border-blue-300 dark:border-blue-600 text-gray-900 dark:text-white hover:border-blue-400 dark:hover:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 shadow-md h-12 text-center"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => updateItem(index, "quantity", item.quantity + 1)}
                        className="h-12 w-12 p-0"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Unit Price</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.unit_price}
                      onChange={(e) => updateItem(index, "unit_price", parseFloat(e.target.value) || 0)}
                      className="bg-white dark:bg-gray-700 border-2 border-blue-300 dark:border-blue-600 text-gray-900 dark:text-white hover:border-blue-400 dark:hover:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 shadow-md h-12"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Total</Label>
                    <div className="h-12 flex items-center px-3 bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 rounded-md font-semibold">
                      {formatCurrencyDisplay(item.total_price)}
                    </div>
                  </div>

                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeItem(index)}
                      className="h-12 w-12 p-0 text-red-600 border-red-300 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Payment Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="payment_method">Payment Method</Label>
              <Select 
                value={saleData.payment_method} 
                onValueChange={(value: "cash" | "mpesa" | "bank_transfer") => setSaleData({...saleData, payment_method: value})}
              >
                <SelectTrigger className="bg-white dark:bg-gray-700 border-2 border-blue-300 dark:border-blue-600 text-gray-900 dark:text-white hover:border-blue-400 dark:hover:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 shadow-md h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-gray-800 border-2 border-blue-200 dark:border-blue-600 shadow-xl z-50">
                  <SelectItem value="cash" className="text-gray-900 dark:text-white hover:bg-blue-100 dark:hover:bg-blue-700 focus:bg-blue-100 dark:focus:bg-blue-700 cursor-pointer font-medium py-3">
                    Cash
                  </SelectItem>
                  <SelectItem value="mpesa" className="text-gray-900 dark:text-white hover:bg-blue-100 dark:hover:bg-blue-700 focus:bg-blue-100 dark:focus:bg-blue-700 cursor-pointer font-medium py-3">
                    M-Pesa
                  </SelectItem>
                  <SelectItem value="bank_transfer" className="text-gray-900 dark:text-white hover:bg-blue-100 dark:hover:bg-blue-700 focus:bg-blue-100 dark:focus:bg-blue-700 cursor-pointer font-medium py-3">
                    Bank Transfer
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {saleData.payment_method === "mpesa" && (
              <div className="space-y-2">
                <Label htmlFor="mpesa_receipt">M-Pesa Receipt Number (Optional)</Label>
                <Input
                  id="mpesa_receipt"
                  value={saleData.mpesa_receipt}
                  onChange={(e) => setSaleData({...saleData, mpesa_receipt: e.target.value})}
                  className="bg-white dark:bg-gray-700 border-2 border-blue-300 dark:border-blue-600 text-gray-900 dark:text-white hover:border-blue-400 dark:hover:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 shadow-md h-12"
                  placeholder="e.g., QDF123456789"
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={saleData.notes}
              onChange={(e) => setSaleData({...saleData, notes: e.target.value})}
              className="bg-white dark:bg-gray-700 border-2 border-blue-300 dark:border-blue-600 text-gray-900 dark:text-white hover:border-blue-400 dark:hover:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 shadow-md"
              placeholder="Additional notes about this sale"
              rows={3}
            />
          </div>

          {/* Total Summary */}
          <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-semibold">{formatCurrencyDisplay(getTotalAmount())}</span>
                </div>
                <div className="flex justify-between">
                  <span>VAT (16%):</span>
                  <span className="font-semibold">{formatCurrencyDisplay(getTaxAmount())}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Total:</span>
                  <span>{formatCurrencyDisplay(getGrandTotal())}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowDialog(false)}
              disabled={loading || mpesaLoading}
            >
              Cancel
            </Button>
            
            {saleData.payment_method === "mpesa" && (
              <Button
                type="button"
                onClick={handleMpesaPayment}
                disabled={loading || mpesaLoading || !saleData.buyer_phone}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {mpesaLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Initiating...
                  </>
                ) : (
                  <>
                    <Package className="h-4 w-4 mr-2" />
                    Initiate M-Pesa
                  </>
                )}
              </Button>
            )}
            
            <Button
              type="submit"
              disabled={loading || mpesaLoading || saleData.items.length === 0}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Recording...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Record Sale
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
