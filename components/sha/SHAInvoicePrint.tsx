"use client"

import { useState, useEffect } from "react"
import { Button } from "../ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { Badge } from "../ui/badge"
import { useToast } from "../../hooks/use-toast"
import { Printer, Download, FileText, Calendar, User } from "lucide-react"

interface SHAInvoiceData {
  // Invoice details
  invoice_number: string
  invoice_date: string
  due_date: string
  total_amount: number
  status: string
  compliance_status: string
  generated_at: string
  generated_by_user: string
  sha_reference?: string
  
  // Claim details
  claim_number: string
  diagnosis_code: string
  diagnosis_description: string
  visit_date: string
  
  // Patient details
  op_number: string
  first_name: string
  last_name: string
  date_of_birth?: string
  gender: string
  phone_number?: string
  insurance_type: string
  insurance_number?: string
  
  // Items
  items: Array<{
    service_code: string
    service_description: string
    quantity: number
    unit_price: number
    total_price: number
    item_type: string
  }>
}

interface SHAInvoicePrintProps {
  invoiceId: string
  onPrintComplete?: () => void
}

export function SHAInvoicePrint({ invoiceId, onPrintComplete }: SHAInvoicePrintProps) {
  const { toast } = useToast()
  const [invoiceData, setInvoiceData] = useState<SHAInvoiceData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadInvoiceData = async () => {
      try {
        const response = await fetch(`/api/sha-invoices/${invoiceId}`)
        const result = await response.json()

        if (result.success) {
          setInvoiceData(result.data)
        } else {
          throw new Error(result.message)
        }
      } catch (error) {
        console.error("Error loading invoice data:", error)
        toast({
          title: "Error",
          description: "Failed to load invoice data",
          variant: "destructive"
        })
      } finally {
        setLoading(false)
      }
    }

    loadInvoiceData()
  }, [invoiceId, toast])

  const handlePrint = () => {
    window.print()
    onPrintComplete?.()
  }

  const handleDownloadPDF = () => {
    // This would typically integrate with a PDF generation service
    toast({
      title: "Info",
      description: "PDF download functionality will be implemented",
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-KE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading invoice...</p>
        </div>
      </div>
    )
  }

  if (!invoiceData) {
    return (
      <div className="text-center p-8">
        <p className="text-muted-foreground">Invoice not found</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Print Controls - Hidden during printing */}
      <div className="no-print mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">SHA Invoice Preview</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleDownloadPDF}>
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
          <Button onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print Invoice
          </Button>
        </div>
      </div>

      {/* Printable Invoice */}
      <div className="bg-white border rounded-lg shadow-sm print:shadow-none print:border-none">
        {/* Header */}
        <div className="border-b p-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">SETH MEDICAL CLINIC</h1>
              <p className="text-gray-600 mt-2">
                123 Main Street<br />
                Nairobi, Kenya<br />
                Phone: +254 700 000 000<br />
                Email: info@sethclinic.com
              </p>
            </div>
            <div className="text-right">
              <h2 className="text-2xl font-bold text-blue-600">SHA INVOICE</h2>
              <div className="mt-4 space-y-1">
                <p><span className="font-medium">Invoice #:</span> {invoiceData.invoice_number}</p>
                <p><span className="font-medium">Date:</span> {formatDate(invoiceData.invoice_date)}</p>
                <p><span className="font-medium">Due Date:</span> {formatDate(invoiceData.due_date)}</p>
                {invoiceData.sha_reference && (
                  <p><span className="font-medium">SHA Ref:</span> {invoiceData.sha_reference}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Patient Information */}
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold mb-4 text-gray-900">Patient Information</h3>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="space-y-2">
                <p><span className="font-medium">Name:</span> {invoiceData.first_name} {invoiceData.last_name}</p>
                <p><span className="font-medium">OP Number:</span> {invoiceData.op_number}</p>
                <p><span className="font-medium">Insurance Type:</span> {invoiceData.insurance_type}</p>
                {invoiceData.insurance_number && (
                  <p><span className="font-medium">Insurance Number:</span> {invoiceData.insurance_number}</p>
                )}
              </div>
            </div>
            <div>
              <div className="space-y-2">
                <p><span className="font-medium">Gender:</span> {invoiceData.gender}</p>
                {invoiceData.date_of_birth && (
                  <p><span className="font-medium">Date of Birth:</span> {formatDate(invoiceData.date_of_birth)}</p>
                )}
                {invoiceData.phone_number && (
                  <p><span className="font-medium">Phone:</span> {invoiceData.phone_number}</p>
                )}
                <p><span className="font-medium">Visit Date:</span> {formatDate(invoiceData.visit_date)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Claim Information */}
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold mb-4 text-gray-900">Claim Information</h3>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p><span className="font-medium">Claim Number:</span> {invoiceData.claim_number}</p>
              <p><span className="font-medium">Diagnosis Code:</span> {invoiceData.diagnosis_code}</p>
            </div>
            <div>
              <p><span className="font-medium">Diagnosis:</span> {invoiceData.diagnosis_description}</p>
            </div>
          </div>
        </div>

        {/* Services/Items */}
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900">Services Rendered</h3>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-2 px-3 font-semibold">Service Code</th>
                  <th className="text-left py-2 px-3 font-semibold">Description</th>
                  <th className="text-left py-2 px-3 font-semibold">Type</th>
                  <th className="text-right py-2 px-3 font-semibold">Qty</th>
                  <th className="text-right py-2 px-3 font-semibold">Unit Price</th>
                  <th className="text-right py-2 px-3 font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {invoiceData.items.map((item, index) => (
                  <tr key={index} className="border-b border-gray-100">
                    <td className="py-3 px-3">{item.service_code}</td>
                    <td className="py-3 px-3">{item.service_description}</td>
                    <td className="py-3 px-3 capitalize">{item.item_type.replace('_', ' ')}</td>
                    <td className="py-3 px-3 text-right">{item.quantity}</td>
                    <td className="py-3 px-3 text-right">{formatCurrency(item.unit_price)}</td>
                    <td className="py-3 px-3 text-right font-medium">{formatCurrency(item.total_price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals */}
        <div className="border-t p-6">
          <div className="flex justify-end">
            <div className="w-80">
              <div className="space-y-2">
                <div className="flex justify-between py-2 border-b">
                  <span className="font-medium">Subtotal:</span>
                  <span>{formatCurrency(invoiceData.items.reduce((sum, item) => sum + item.total_price, 0))}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="font-medium">Tax (0%):</span>
                  <span>{formatCurrency(0)}</span>
                </div>
                <div className="flex justify-between py-3 text-lg font-bold border-t-2 border-gray-200">
                  <span>TOTAL AMOUNT:</span>
                  <span className="text-blue-600">{formatCurrency(invoiceData.total_amount)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t p-6 bg-gray-50">
          <div className="grid grid-cols-2 gap-6 text-sm">
            <div>
              <h4 className="font-semibold mb-2">Payment Terms</h4>
              <p className="text-gray-600">
                Payment is due within 30 days of invoice date.
                This invoice will be submitted to SHA for direct payment.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Invoice Details</h4>
              <div className="space-y-1 text-gray-600">
                <p>Generated: {formatDate(invoiceData.generated_at)}</p>
                <p>Generated by: {invoiceData.generated_by_user}</p>
                <p>Status: 
                  <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                    {invoiceData.status.toUpperCase()}
                  </span>
                </p>
              </div>
            </div>
          </div>
          
          <div className="mt-6 pt-4 border-t border-gray-200 text-center text-sm text-gray-500">
            <p>This is an official SHA insurance invoice generated by Seth Medical Clinic.</p>
            <p>For inquiries, please contact our billing department at billing@sethclinic.com</p>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx>{`
        @media print {
          .no-print {
            display: none !important;
          }
          
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          
          .print\\:border-none {
            border: none !important;
          }
          
          @page {
            size: A4;
            margin: 0.5in;
          }
          
          table {
            page-break-inside: avoid;
          }
          
          tr {
            page-break-inside: avoid;
          }
          
          .page-break {
            page-break-before: always;
          }
        }
      `}</style>
    </div>
  )
}

// Simplified version for quick preview in lists
export function SHAInvoicePreview({ invoiceId }: { invoiceId: string }) {
  const [invoiceData, setInvoiceData] = useState<SHAInvoiceData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadInvoiceData = async () => {
      try {
        const response = await fetch(`/api/sha-invoices/${invoiceId}`)
        const result = await response.json()

        if (result.success) {
          setInvoiceData(result.data)
        }
      } catch (error) {
        console.error("Error loading invoice preview:", error)
      } finally {
        setLoading(false)
      }
    }

    loadInvoiceData()
  }, [invoiceId])

  if (loading || !invoiceData) {
    return <div className="animate-pulse h-20 bg-gray-200 rounded"></div>
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES'
    }).format(amount)
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{invoiceData.invoice_number}</CardTitle>
          <Badge variant={invoiceData.status === 'paid' ? 'default' : 'secondary'}>
            {invoiceData.status.toUpperCase()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-medium">{invoiceData.first_name} {invoiceData.last_name}</p>
            <p className="text-muted-foreground">OP: {invoiceData.op_number}</p>
            <p className="text-muted-foreground">{invoiceData.insurance_type}</p>
          </div>
          <div className="text-right">
            <p className="font-bold text-lg">{formatCurrency(invoiceData.total_amount)}</p>
            <p className="text-muted-foreground">
              {new Date(invoiceData.invoice_date).toLocaleDateString()}
            </p>
            <p className="text-xs text-muted-foreground">
              {invoiceData.items.length} items
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
