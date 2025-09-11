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
import { Plus, CreditCard, Smartphone, Banknote, User, Receipt, CheckCircle } from "lucide-react"
import { formatCurrencyDisplay } from "../../lib/currency"

interface Patient {
  id: string
  first_name: string
  last_name: string
  op_number: string
  phone_number?: string
}

interface QuickPaymentData {
  patient_id: string
  amount: number
  payment_method: "cash" | "mpesa" | "bank_transfer"
  description: string
  mpesa_receipt?: string
  phone_number?: string
  notes?: string
}

interface QuickPaymentRecordingProps {
  onPaymentRecorded?: () => void
}

export function QuickPaymentRecording({ onPaymentRecorded }: QuickPaymentRecordingProps) {
  const { toast } = useToast()
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(false)
  const [mpesaLoading, setMpesaLoading] = useState(false)
  const [showDialog, setShowDialog] = useState(false)
  const [paymentData, setPaymentData] = useState<QuickPaymentData>({
    patient_id: "",
    amount: 0,
    payment_method: "cash",
    description: "",
    mpesa_receipt: "",
    phone_number: "",
    notes: ""
  })

  useEffect(() => {
    fetchPatients()
  }, [])

  const fetchPatients = async () => {
    try {
      const response = await fetch("/api/patients", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })
      if (response.ok) {
        const data = await response.json()
        setPatients(data.data || [])
      }
    } catch (error) {
      console.error("Error fetching patients:", error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // First create a quick invoice
      const invoiceResponse = await fetch("/api/financial/invoices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          patient_id: paymentData.patient_id,
          items: [{
            service_type: "QUICK_PAYMENT",
            item_name: paymentData.description,
            quantity: 1,
            unit_price: paymentData.amount
          }],
          payment_terms: "immediate",
          notes: paymentData.notes
        }),
      })

      if (!invoiceResponse.ok) {
        throw new Error("Failed to create invoice")
      }

      const invoiceData = await invoiceResponse.json()
      const invoiceId = invoiceData.data.id

      // Then process the payment
      const paymentResponse = await fetch("/api/financial/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          invoice_id: invoiceId,
          amount: paymentData.amount,
          payment_method: paymentData.payment_method,
          mpesa_receipt: paymentData.mpesa_receipt,
          notes: paymentData.notes,
        }),
      })

      if (paymentResponse.ok) {
        toast({
          title: "Payment Recorded Successfully",
          description: `${formatCurrencyDisplay(paymentData.amount)} payment recorded for ${getPatientName(paymentData.patient_id)}`,
        })
        
        // Reset form
        setPaymentData({
          patient_id: "",
          amount: 0,
          payment_method: "cash",
          description: "",
          mpesa_receipt: "",
          phone_number: "",
          notes: ""
        })
        setShowDialog(false)
        onPaymentRecorded?.()
      } else {
        throw new Error("Failed to process payment")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to record payment. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleMpesaPayment = async () => {
    if (!paymentData.phone_number) {
      toast({
        title: "Phone Number Required",
        description: "Please enter the patient's phone number for M-Pesa payment",
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
          account_reference: `PAY-${Date.now()}`,
          transaction_desc: paymentData.description,
        }),
      })

      if (response.ok) {
        toast({
          title: "M-Pesa Payment Initiated",
          description: "Please check the patient's phone for M-Pesa prompt",
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

  const getPatientName = (patientId: string) => {
    const patient = patients.find(p => p.id === patientId)
    return patient ? `${patient.first_name} ${patient.last_name}` : "Unknown Patient"
  }

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case "cash":
        return <Banknote className="h-4 w-4" />
      case "mpesa":
        return <Smartphone className="h-4 w-4" />
      case "bank_transfer":
        return <CreditCard className="h-4 w-4" />
      default:
        return <Receipt className="h-4 w-4" />
    }
  }

  return (
    <Dialog open={showDialog} onOpenChange={setShowDialog}>
      <DialogTrigger asChild>
        <Button className="bg-green-600 hover:bg-green-700 text-white">
          <Plus className="h-4 w-4 mr-2" />
          Record Payment
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Record Quick Payment
          </DialogTitle>
          <DialogDescription>
            Record a payment for a patient (cash, M-Pesa, or bank transfer)
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="patient_id">Patient</Label>
              <Select 
                value={paymentData.patient_id} 
                onValueChange={(value) => setPaymentData({...paymentData, patient_id: value})}
              >
                <SelectTrigger className="bg-white dark:bg-gray-700 border-2 border-blue-300 dark:border-blue-600 text-gray-900 dark:text-white hover:border-blue-400 dark:hover:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 shadow-md h-12">
                  <SelectValue placeholder="Select patient" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-gray-800 border-2 border-blue-200 dark:border-blue-600 shadow-xl z-50 max-h-60">
                  {patients.map(patient => (
                    <SelectItem 
                      key={patient.id} 
                      value={patient.id}
                      className="text-gray-900 dark:text-white hover:bg-blue-100 dark:hover:bg-blue-700 focus:bg-blue-100 dark:focus:bg-blue-700 cursor-pointer font-medium py-3"
                    >
                      {patient.first_name} {patient.last_name} ({patient.op_number})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount (KES)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={paymentData.amount}
                onChange={(e) => setPaymentData({...paymentData, amount: parseFloat(e.target.value) || 0})}
                className="bg-white dark:bg-gray-700 border-2 border-blue-300 dark:border-blue-600 text-gray-900 dark:text-white hover:border-blue-400 dark:hover:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 shadow-md h-12"
                placeholder="0.00"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={paymentData.description}
              onChange={(e) => setPaymentData({...paymentData, description: e.target.value})}
              className="bg-white dark:bg-gray-700 border-2 border-blue-300 dark:border-blue-600 text-gray-900 dark:text-white hover:border-blue-400 dark:hover:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 shadow-md h-12"
              placeholder="e.g., Consultation fee, Lab test, Medicine"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="payment_method">Payment Method</Label>
              <Select 
                value={paymentData.payment_method} 
                onValueChange={(value: "cash" | "mpesa" | "bank_transfer") => setPaymentData({...paymentData, payment_method: value})}
              >
                <SelectTrigger className="bg-white dark:bg-gray-700 border-2 border-blue-300 dark:border-blue-600 text-gray-900 dark:text-white hover:border-blue-400 dark:hover:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 shadow-md h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-gray-800 border-2 border-blue-200 dark:border-blue-600 shadow-xl z-50">
                  <SelectItem value="cash" className="text-gray-900 dark:text-white hover:bg-blue-100 dark:hover:bg-blue-700 focus:bg-blue-100 dark:focus:bg-blue-700 cursor-pointer font-medium py-3">
                    <div className="flex items-center gap-2">
                      <Banknote className="h-4 w-4" />
                      Cash
                    </div>
                  </SelectItem>
                  <SelectItem value="mpesa" className="text-gray-900 dark:text-white hover:bg-blue-100 dark:hover:bg-blue-700 focus:bg-blue-100 dark:focus:bg-blue-700 cursor-pointer font-medium py-3">
                    <div className="flex items-center gap-2">
                      <Smartphone className="h-4 w-4" />
                      M-Pesa
                    </div>
                  </SelectItem>
                  <SelectItem value="bank_transfer" className="text-gray-900 dark:text-white hover:bg-blue-100 dark:hover:bg-blue-700 focus:bg-blue-100 dark:focus:bg-blue-700 cursor-pointer font-medium py-3">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      Bank Transfer
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {paymentData.payment_method === "mpesa" && (
              <div className="space-y-2">
                <Label htmlFor="phone_number">Phone Number</Label>
                <Input
                  id="phone_number"
                  type="tel"
                  value={paymentData.phone_number}
                  onChange={(e) => setPaymentData({...paymentData, phone_number: e.target.value})}
                  className="bg-white dark:bg-gray-700 border-2 border-blue-300 dark:border-blue-600 text-gray-900 dark:text-white hover:border-blue-400 dark:hover:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 shadow-md h-12"
                  placeholder="254XXXXXXXXX"
                />
              </div>
            )}
          </div>

          {paymentData.payment_method === "mpesa" && (
            <div className="space-y-2">
              <Label htmlFor="mpesa_receipt">M-Pesa Receipt Number (Optional)</Label>
              <Input
                id="mpesa_receipt"
                value={paymentData.mpesa_receipt}
                onChange={(e) => setPaymentData({...paymentData, mpesa_receipt: e.target.value})}
                className="bg-white dark:bg-gray-700 border-2 border-blue-300 dark:border-blue-600 text-gray-900 dark:text-white hover:border-blue-400 dark:hover:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 shadow-md h-12"
                placeholder="e.g., QDF123456789"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={paymentData.notes}
              onChange={(e) => setPaymentData({...paymentData, notes: e.target.value})}
              className="bg-white dark:bg-gray-700 border-2 border-blue-300 dark:border-blue-600 text-gray-900 dark:text-white hover:border-blue-400 dark:hover:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 shadow-md"
              placeholder="Additional notes about this payment"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowDialog(false)}
              disabled={loading || mpesaLoading}
            >
              Cancel
            </Button>
            
            {paymentData.payment_method === "mpesa" && (
              <Button
                type="button"
                onClick={handleMpesaPayment}
                disabled={loading || mpesaLoading || !paymentData.phone_number}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {mpesaLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Initiating...
                  </>
                ) : (
                  <>
                    <Smartphone className="h-4 w-4 mr-2" />
                    Initiate M-Pesa
                  </>
                )}
              </Button>
            )}
            
            <Button
              type="submit"
              disabled={loading || mpesaLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Recording...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Record Payment
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
