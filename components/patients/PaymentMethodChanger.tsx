"use client"

import { useState } from "react"
import { Button } from "../ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { Badge } from "../ui/badge"
import { useToast } from "../ui/use-toast"
import { CreditCard, Smartphone, Building, Shield, DollarSign } from "lucide-react"

interface PaymentMethodChangerProps {
  currentMethod: 'CASH' | 'MPESA' | 'SHA' | 'PRIVATE'
  currentReference?: string
  onMethodChange: (method: 'CASH' | 'MPESA' | 'SHA' | 'PRIVATE', reference?: string) => void
  patientName?: string
  className?: string
}

const paymentMethods = [
  {
    value: 'CASH',
    label: 'Cash Payment',
    icon: DollarSign,
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    description: 'Direct cash payment'
  },
  {
    value: 'MPESA',
    label: 'M-Pesa',
    icon: Smartphone,
    color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    description: 'Mobile money payment'
  },
  {
    value: 'SHA',
    label: 'SHA',
    icon: Building,
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    description: 'Social Health Authority'
  },
  {
    value: 'PRIVATE',
    label: 'Private Insurance',
    icon: Shield,
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    description: 'Private insurance coverage'
  }
]

export default function PaymentMethodChanger({
  currentMethod,
  currentReference,
  onMethodChange,
  patientName,
  className = ""
}: PaymentMethodChangerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedMethod, setSelectedMethod] = useState<'CASH' | 'MPESA' | 'SHA' | 'PRIVATE'>(currentMethod)
  const [reference, setReference] = useState(currentReference || "")
  const { toast } = useToast()

  const currentMethodInfo = paymentMethods.find(m => m.value === currentMethod)

  const handleSave = () => {
    if (selectedMethod !== currentMethod || reference !== currentReference) {
      onMethodChange(selectedMethod, reference)
      toast({
        title: "Payment Method Updated",
        description: `Payment method changed to ${paymentMethods.find(m => m.value === selectedMethod)?.label}`,
        variant: "default",
      })
    }
    setIsOpen(false)
  }

  const handleCancel = () => {
    setSelectedMethod(currentMethod)
    setReference(currentReference || "")
    setIsOpen(false)
  }

  if (!isOpen) {
    return (
      <div className={`space-y-2 ${className}`}>
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm font-medium">Current Payment Method</Label>
            {patientName && (
              <p className="text-xs text-gray-500 dark:text-gray-400">for {patientName}</p>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsOpen(true)}
            className="text-blue-600 hover:text-blue-700 border-blue-300 hover:border-blue-400"
          >
            <CreditCard className="h-4 w-4 mr-2" />
            Change
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          {currentMethodInfo && (
            <>
              <currentMethodInfo.icon className="h-4 w-4" />
              <Badge className={currentMethodInfo.color}>
                {currentMethodInfo.label}
              </Badge>
              {currentReference && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Ref: {currentReference}
                </span>
              )}
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <Card className={`border-2 border-blue-200 dark:border-blue-700 ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Change Payment Method
        </CardTitle>
        <CardDescription>
          Select a new payment method for this patient
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="paymentMethod">Form of Payment *</Label>
          <Select
            value={selectedMethod}
            onValueChange={(value) => setSelectedMethod(value as any)}
          >
            <SelectTrigger className="border-2 border-blue-300 dark:border-blue-600 shadow-md h-12 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100">
              <SelectValue placeholder="Select form of payment" />
            </SelectTrigger>
            <SelectContent className="shadow-2xl z-50 max-h-60 bg-white dark:bg-slate-800 border-2 border-blue-200 dark:border-blue-700">
              {paymentMethods.map((method) => (
                <SelectItem 
                  key={method.value}
                  value={method.value} 
                  className="hover:bg-blue-100 dark:hover:bg-blue-900 font-medium py-3 text-gray-900 dark:text-slate-100 cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <method.icon className="h-4 w-4" />
                    {method.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {(selectedMethod === "SHA" || selectedMethod === "PRIVATE" || selectedMethod === "MPESA") && (
          <div className="space-y-2">
            <Label htmlFor="reference">
              {selectedMethod === "SHA" 
                ? "SHA Beneficiary ID" 
                : selectedMethod === "PRIVATE" 
                ? "Insurance Number" 
                : "M-Pesa Transaction ID"
              }
            </Label>
            <Input
              id="reference"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder={
                selectedMethod === "SHA" 
                  ? "Enter SHA Beneficiary ID" 
                  : selectedMethod === "PRIVATE" 
                  ? "Enter Insurance Number" 
                  : "Enter M-Pesa Transaction ID"
              }
              className="border-2 border-blue-300 dark:border-blue-600 shadow-md h-12 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
            />
          </div>
        )}

        <div className="flex justify-end space-x-2 pt-4">
          <Button
            variant="outline"
            onClick={handleCancel}
            className="border-gray-300 dark:border-gray-600"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Save Changes
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
