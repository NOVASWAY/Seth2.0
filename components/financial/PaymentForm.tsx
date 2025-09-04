"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { CreditCard, Smartphone, Banknote } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { formatCurrencyDisplay, getCurrencySymbol } from "@/lib/currency"

interface PaymentFormProps {
  invoice: {
    id: string
    invoice_number: string
    total_amount: number
    amount_paid: number
    balance: number
  }
  onPaymentProcessed?: () => void
}

export function PaymentForm({ invoice, onPaymentProcessed }: PaymentFormProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [mpesaLoading, setMpesaLoading] = useState(false)
  const [paymentData, setPaymentData] = useState({
    amount: invoice.balance,
    payment_method: "cash" as "cash" | "mpesa" | "bank_transfer" | "insurance" | "other",
    mpesa_receipt: "",
    phone_number: "",
    notes: "",
  })

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch("/api/financial/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          invoice_id: invoice.id,
          amount: paymentData.amount,
          payment_method: paymentData.payment_method,
          mpesa_receipt: paymentData.mpesa_receipt,
          notes: paymentData.notes,
        }),
      })

      if (response.ok) {
        const result = await response.json()
        toast({
          title: "Payment Processed",
          description: `Payment of ${formatCurrencyDisplay(paymentData.amount)} recorded successfully`,
        })
        onPaymentProcessed?.()
      } else {
        throw new Error("Failed to process payment")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process payment",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleMpesaPayment = async () => {
    if (!paymentData.phone_number) {
      toast({
        title: "Error",
        description: "Phone number is required for M-Pesa payment",
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
          phone_number: paymentData.phone_number,
          amount: paymentData.amount,
          invoice_id: invoice.id,
        }),
      })

      if (response.ok) {
        toast({
          title: "M-Pesa Payment Initiated",
          description: "Please check your phone for the M-Pesa prompt",
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Process Payment - {invoice.invoice_number}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 mb-6">
          <div className="flex justify-between">
            <span>Total Amount:</span>
            <span className="font-medium">{formatCurrencyDisplay(invoice.total_amount)}</span>
          </div>
          <div className="flex justify-between">
            <span>Amount Paid:</span>
            <span className="font-medium">{formatCurrencyDisplay(invoice.amount_paid)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold border-t pt-2">
            <span>Balance Due:</span>
            <span>{formatCurrencyDisplay(invoice.balance)}</span>
          </div>
        </div>

        <form onSubmit={handlePayment} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="amount">Payment Amount ({getCurrencySymbol()})</Label>
              <Input
                id="amount"
                type="number"
                min="0"
                max={invoice.balance}
                step="0.01"
                value={paymentData.amount}
                onChange={(e) => setPaymentData({ ...paymentData, amount: Number.parseFloat(e.target.value) || 0 })}
                required
              />
            </div>

            <div>
              <Label htmlFor="payment_method">Payment Method</Label>
              <Select
                value={paymentData.payment_method}
                onValueChange={(value) => setPaymentData({ ...paymentData, payment_method: value as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">
                    <div className="flex items-center gap-2">
                      <Banknote className="h-4 w-4" />
                      Cash
                    </div>
                  </SelectItem>
                  <SelectItem value="mpesa">
                    <div className="flex items-center gap-2">
                      <Smartphone className="h-4 w-4" />
                      M-Pesa
                    </div>
                  </SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="insurance">Insurance</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {paymentData.payment_method === "mpesa" && (
            <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
              <div>
                <Label htmlFor="phone_number">Phone Number</Label>
                <Input
                  id="phone_number"
                  value={paymentData.phone_number}
                  onChange={(e) => setPaymentData({ ...paymentData, phone_number: e.target.value })}
                  placeholder="+254712345678"
                  required
                />
              </div>

              <Button
                type="button"
                onClick={handleMpesaPayment}
                disabled={mpesaLoading}
                className="w-full bg-transparent"
                variant="outline"
              >
                <Smartphone className="h-4 w-4 mr-2" />
                {mpesaLoading ? "Initiating M-Pesa..." : "Send M-Pesa Prompt"}
              </Button>

              <div>
                <Label htmlFor="mpesa_receipt">M-Pesa Receipt (Optional)</Label>
                <Input
                  id="mpesa_receipt"
                  value={paymentData.mpesa_receipt}
                  onChange={(e) => setPaymentData({ ...paymentData, mpesa_receipt: e.target.value })}
                  placeholder="Enter M-Pesa receipt number"
                />
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={paymentData.notes}
              onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
              placeholder="Payment notes..."
              rows={3}
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Processing Payment..." : `Record Payment - ${formatCurrencyDisplay(paymentData.amount)}`}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
