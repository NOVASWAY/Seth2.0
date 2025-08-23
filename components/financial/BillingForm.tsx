"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Trash2, Calculator } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface BillingItem {
  id: string
  item_type: "consultation" | "medication" | "lab_test" | "procedure" | "other"
  description: string
  quantity: number
  unit_price: number
  total_price: number
}

interface BillingFormProps {
  opNumber?: string
  patientId?: string
  onInvoiceCreated?: (invoice: any) => void
}

export function BillingForm({ opNumber, patientId, onInvoiceCreated }: BillingFormProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<BillingItem[]>([
    {
      id: crypto.randomUUID(),
      item_type: "consultation",
      description: "",
      quantity: 1,
      unit_price: 0,
      total_price: 0,
    },
  ])
  const [buyerInfo, setBuyerInfo] = useState({
    buyer_name: "",
    buyer_phone: "",
  })
  const [discountAmount, setDiscountAmount] = useState(0)
  const [notes, setNotes] = useState("")

  const addItem = () => {
    setItems([
      ...items,
      {
        id: crypto.randomUUID(),
        item_type: "other",
        description: "",
        quantity: 1,
        unit_price: 0,
        total_price: 0,
      },
    ])
  }

  const removeItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id))
  }

  const updateItem = (id: string, field: keyof BillingItem, value: any) => {
    setItems(
      items.map((item) => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value }
          if (field === "quantity" || field === "unit_price") {
            updatedItem.total_price = updatedItem.quantity * updatedItem.unit_price
          }
          return updatedItem
        }
        return item
      }),
    )
  }

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + item.total_price, 0)
    const taxAmount = subtotal * 0.16 // 16% VAT
    const totalAmount = subtotal + taxAmount - discountAmount

    return { subtotal, taxAmount, totalAmount }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch("/api/financial/invoices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          op_number: opNumber,
          patient_id: patientId,
          buyer_name: buyerInfo.buyer_name,
          buyer_phone: buyerInfo.buyer_phone,
          items: items.map(({ id, ...item }) => item),
          discount_amount: discountAmount,
          notes,
        }),
      })

      if (response.ok) {
        const result = await response.json()
        toast({
          title: "Invoice Created",
          description: `Invoice ${result.data.invoice_number} created successfully`,
        })
        onInvoiceCreated?.(result.data)

        // Reset form
        setItems([
          {
            id: crypto.randomUUID(),
            item_type: "consultation",
            description: "",
            quantity: 1,
            unit_price: 0,
            total_price: 0,
          },
        ])
        setBuyerInfo({ buyer_name: "", buyer_phone: "" })
        setDiscountAmount(0)
        setNotes("")
      } else {
        throw new Error("Failed to create invoice")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create invoice",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const { subtotal, taxAmount, totalAmount } = calculateTotals()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Create Invoice
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Buyer Information */}
          {!opNumber && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="buyer_name">Buyer Name</Label>
                <Input
                  id="buyer_name"
                  value={buyerInfo.buyer_name}
                  onChange={(e) => setBuyerInfo({ ...buyerInfo, buyer_name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="buyer_phone">Phone Number</Label>
                <Input
                  id="buyer_phone"
                  value={buyerInfo.buyer_phone}
                  onChange={(e) => setBuyerInfo({ ...buyerInfo, buyer_phone: e.target.value })}
                  placeholder="+254..."
                />
              </div>
            </div>
          )}

          {/* Invoice Items */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">Invoice Items</Label>
              <Button type="button" onClick={addItem} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>

            {items.map((item, index) => (
              <Card key={item.id} className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
                  <div>
                    <Label>Type</Label>
                    <Select value={item.item_type} onValueChange={(value) => updateItem(item.id, "item_type", value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="consultation">Consultation</SelectItem>
                        <SelectItem value="medication">Medication</SelectItem>
                        <SelectItem value="lab_test">Lab Test</SelectItem>
                        <SelectItem value="procedure">Procedure</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="md:col-span-2">
                    <Label>Description</Label>
                    <Input
                      value={item.description}
                      onChange={(e) => updateItem(item.id, "description", e.target.value)}
                      placeholder="Item description"
                      required
                    />
                  </div>

                  <div>
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(item.id, "quantity", Number.parseInt(e.target.value) || 1)}
                    />
                  </div>

                  <div>
                    <Label>Unit Price (KES)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unit_price}
                      onChange={(e) => updateItem(item.id, "unit_price", Number.parseFloat(e.target.value) || 0)}
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <Label>Total</Label>
                      <div className="text-lg font-medium">KES {item.total_price.toFixed(2)}</div>
                    </div>
                    {items.length > 1 && (
                      <Button type="button" variant="outline" size="sm" onClick={() => removeItem(item.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Discount and Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="discount">Discount Amount (KES)</Label>
              <Input
                id="discount"
                type="number"
                min="0"
                step="0.01"
                value={discountAmount}
                onChange={(e) => setDiscountAmount(Number.parseFloat(e.target.value) || 0)}
              />
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes..."
                rows={3}
              />
            </div>
          </div>

          {/* Totals */}
          <Card className="bg-muted/50">
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>KES {subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>VAT (16%):</span>
                  <span>KES {taxAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Discount:</span>
                  <span>-KES {discountAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Total:</span>
                  <span>KES {totalAmount.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Creating Invoice..." : "Create Invoice"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
