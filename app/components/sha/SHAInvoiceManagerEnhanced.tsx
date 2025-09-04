"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Badge } from "../ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "../ui/dialog"
import { Alert, AlertDescription } from "../ui/alert"
import { Progress } from "../ui/progress"
import { Textarea } from "../ui/textarea"
import { 
  FileText, 
  Download, 
  Upload, 
  Eye, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Send,
  Printer,
  Receipt,
  Calendar,
  User,
  Banknote,
  FileCheck,
  Search,
  Filter,
  RefreshCw,
  MoreVertical,
  FileDown,
  FileSpreadsheet,
  FileImage
} from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu"
import { DatePicker } from "../ui/date-picker"
import { Checkbox } from "../ui/checkbox"
import { useToast } from "../ui/use-toast"

interface SHAInvoice {
  id: string
  invoice_number: string
  claim_id: string
  patient_name: string
  op_number: string
  sha_beneficiary_id: string
  total_amount: number
  status: 'generated' | 'printed' | 'submitted' | 'paid'
  invoice_date: string
  generated_at: string
  submitted_at?: string
  sha_reference?: string
  compliance_status: 'pending' | 'verified' | 'approved' | 'rejected'
  documents_attached: number
  generated_by_name: string
}

interface DocumentAttachment {
  id: string
  document_type: string
  document_name: string
  file_size: number
  is_required: boolean
  compliance_verified: boolean
  uploaded_at: string
  uploaded_by_name: string
}

interface ExportOptions {
  type: 'PDF' | 'EXCEL' | 'CSV'
  scope: 'SINGLE_INVOICE' | 'BATCH' | 'DATE_RANGE' | 'CUSTOM_FILTER'
  reason: string
  filters?: any
}

export function SHAInvoiceManagerEnhanced() {
  const [activeTab, setActiveTab] = useState("ready-for-review")
  const [invoices, setInvoices] = useState<SHAInvoice[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<SHAInvoice | null>(null)
  const [documents, setDocuments] = useState<DocumentAttachment[]>([])
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    type: 'PDF',
    scope: 'SINGLE_INVOICE',
    reason: ''
  })
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    status: '',
    patientName: '',
    opNumber: ''
  })
  
  const { toast } = useToast()

  useEffect(() => {
    loadInvoices()
  }, [activeTab, filters])

  const loadInvoices = async () => {
    setLoading(true)
    try {
      let endpoint = '/api/sha-invoices/'
      if (activeTab === 'ready-for-review') {
        endpoint += 'ready-for-review'
      } else if (activeTab === 'submitted-archive') {
        endpoint += 'submitted-archive'
      }

      // Add filters to query
      const queryParams = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value)
      })

      if (queryParams.toString()) {
        endpoint += `?${queryParams.toString()}`
      }

      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setInvoices(data.data)
      } else {
        throw new Error('Failed to load invoices')
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load invoices",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const generateInvoice = async (claimId: string) => {
    try {
      const response = await fetch(`/api/sha-invoices/generate/${claimId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Invoice generated successfully"
        })
        loadInvoices()
      } else {
        throw new Error('Failed to generate invoice')
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate invoice",
        variant: "destructive"
      })
    }
  }

  const submitClaim = async (claimId: string) => {
    try {
      const response = await fetch(`/api/sha-invoices/submit/${claimId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Claim submitted to SHA successfully"
        })
        loadInvoices()
      } else {
        throw new Error('Failed to submit claim')
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit claim to SHA",
        variant: "destructive"
      })
    }
  }

  const exportInvoice = async () => {
    if (!exportOptions.reason.trim()) {
      toast({
        title: "Error",
        description: "Export reason is required",
        variant: "destructive"
      })
      return
    }

    try {
      let endpoint = '/api/sha-exports/'
      let payload: any = {
        reason: exportOptions.reason,
        complianceApproved: true
      }

      if (exportOptions.scope === 'SINGLE_INVOICE' && selectedInvoice) {
        endpoint += `invoice/${selectedInvoice.id}/pdf`
      } else if (exportOptions.type === 'EXCEL') {
        endpoint += 'invoices/excel'
        payload.filters = filters
      } else if (exportOptions.type === 'CSV') {
        endpoint += 'claims/csv'
        payload.filters = filters
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        const data = await response.json()
        // Trigger download
        window.open(data.data.downloadUrl, '_blank')
        
        toast({
          title: "Success",
          description: "Export generated successfully"
        })
        setShowExportDialog(false)
      } else {
        throw new Error('Failed to export')
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export",
        variant: "destructive"
      })
    }
  }

  const loadDocuments = async (claimId: string) => {
    try {
      const response = await fetch(`/api/sha-documents/claim/${claimId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setDocuments(data.data)
      }
    } catch (error) {
      console.error('Failed to load documents:', error)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      generated: { color: "secondary", icon: FileText, label: "Ready for Review" },
      printed: { color: "default", icon: Printer, label: "Printed" },
      submitted: { color: "default", icon: Send, label: "Submitted" },
      paid: { color: "default", icon: CheckCircle, label: "Paid" }
    }

    const config = statusConfig[status as keyof typeof statusConfig]
    if (!config) return <Badge variant="secondary">{status}</Badge>

    const Icon = config.icon
    return (
      <Badge variant={config.color as any} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  const getComplianceBadge = (status: string) => {
    const statusConfig = {
      pending: { color: "secondary", icon: Clock, label: "Pending Review" },
      verified: { color: "default", icon: FileCheck, label: "Verified" },
      approved: { color: "default", icon: CheckCircle, label: "Approved" },
      rejected: { color: "destructive", icon: AlertCircle, label: "Rejected" }
    }

    const config = statusConfig[status as keyof typeof statusConfig]
    if (!config) return <Badge variant="secondary">{status}</Badge>

    const Icon = config.icon
    return (
      <Badge variant={config.color as any} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  const FilterSection = () => (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Filters & Search
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <Label htmlFor="patientName">Patient Name</Label>
            <Input
              id="patientName"
              placeholder="Search by name..."
              value={filters.patientName}
              onChange={(e) => setFilters(prev => ({ ...prev, patientName: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="opNumber">OP Number</Label>
            <Input
              id="opNumber"
              placeholder="OP Number..."
              value={filters.opNumber}
              onChange={(e) => setFilters(prev => ({ ...prev, opNumber: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="status">Status</Label>
            <Select
              value={filters.status}
              onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All statuses</SelectItem>
                <SelectItem value="generated">Ready for Review</SelectItem>
                <SelectItem value="printed">Printed</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="dateFrom">Date From</Label>
            <Input
              id="dateFrom"
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="dateTo">Date To</Label>
            <Input
              id="dateTo"
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
            />
          </div>
        </div>
        <div className="flex items-center gap-2 mt-4">
          <Button onClick={loadInvoices} variant="outline" size="sm">
            <Search className="h-4 w-4 mr-2" />
            Apply Filters
          </Button>
          <Button
            onClick={() => setFilters({ dateFrom: '', dateTo: '', status: '', patientName: '', opNumber: '' })}
            variant="ghost"
            size="sm"
          >
            Clear
          </Button>
          <Button onClick={loadInvoices} variant="ghost" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardContent>
    </Card>
  )

  const InvoiceDetailsDialog = () => (
    <Dialog open={!!selectedInvoice} onOpenChange={() => setSelectedInvoice(null)}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Invoice Details: {selectedInvoice?.invoice_number}</DialogTitle>
          <DialogDescription>
            Comprehensive invoice information and compliance status
          </DialogDescription>
        </DialogHeader>
        
        {selectedInvoice && (
          <div className="space-y-6">
            {/* Invoice Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Invoice Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Invoice Number:</span>
                    <span className="font-medium">{selectedInvoice.invoice_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Total Amount:</span>
                    <span className="font-medium">KES {selectedInvoice.total_amount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Status:</span>
                    {getStatusBadge(selectedInvoice.status)}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Compliance:</span>
                    {getComplianceBadge(selectedInvoice.compliance_status)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Patient Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Patient Name:</span>
                    <span className="font-medium">{selectedInvoice.patient_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">OP Number:</span>
                    <span className="font-medium">{selectedInvoice.op_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">SHA Beneficiary ID:</span>
                    <span className="font-medium">{selectedInvoice.sha_beneficiary_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Generated By:</span>
                    <span className="font-medium">{selectedInvoice.generated_by_name}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Documents Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Attached Documents ({documents.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {documents.length > 0 ? (
                  <div className="space-y-2">
                    {documents.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <FileImage className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">{doc.document_name}</div>
                            <div className="text-sm text-muted-foreground">
                              {doc.document_type} • {(doc.file_size / 1024).toFixed(1)} KB
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {doc.is_required && (
                            <Badge variant="outline" className="text-xs">Required</Badge>
                          )}
                          {doc.compliance_verified && (
                            <Badge variant="default" className="text-xs">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Verified
                            </Badge>
                          )}
                          <Button size="sm" variant="outline">
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No documents attached yet
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-4 border-t">
              {selectedInvoice.status === 'generated' && (
                <>
                  <Button onClick={() => {/* Handle print */}} variant="outline">
                    <Printer className="h-4 w-4 mr-2" />
                    Print Invoice
                  </Button>
                  <Button onClick={() => submitClaim(selectedInvoice.claim_id)}>
                    <Send className="h-4 w-4 mr-2" />
                    Submit to SHA
                  </Button>
                </>
              )}
              <Button 
                onClick={() => {
                  setExportOptions(prev => ({ ...prev, scope: 'SINGLE_INVOICE' }))
                  setShowExportDialog(true)
                }}
                variant="outline"
              >
                <FileDown className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )

  const ExportDialog = () => (
    <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export SHA Data</DialogTitle>
          <DialogDescription>
            Generate reports and exports for SHA compliance
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="exportType">Export Type</Label>
            <Select
              value={exportOptions.type}
              onValueChange={(value: 'PDF' | 'EXCEL' | 'CSV') => 
                setExportOptions(prev => ({ ...prev, type: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PDF">PDF Report</SelectItem>
                <SelectItem value="EXCEL">Excel Spreadsheet</SelectItem>
                <SelectItem value="CSV">CSV for SHA Portal</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="exportScope">Export Scope</Label>
            <Select
              value={exportOptions.scope}
              onValueChange={(value: any) => 
                setExportOptions(prev => ({ ...prev, scope: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SINGLE_INVOICE">Single Invoice</SelectItem>
                <SelectItem value="DATE_RANGE">Date Range</SelectItem>
                <SelectItem value="CUSTOM_FILTER">Current Filters</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="exportReason">Export Reason (Required)</Label>
            <Textarea
              id="exportReason"
              placeholder="Specify the reason for this export (required for compliance)"
              value={exportOptions.reason}
              onChange={(e) => setExportOptions(prev => ({ ...prev, reason: e.target.value }))}
            />
          </div>

          <div className="flex items-center gap-2 pt-4">
            <Button onClick={exportInvoice} disabled={!exportOptions.reason.trim()}>
              <FileDown className="h-4 w-4 mr-2" />
              Generate Export
            </Button>
            <Button variant="outline" onClick={() => setShowExportDialog(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">SHA Invoice Management</h2>
          <p className="text-muted-foreground">
            Comprehensive invoice management with full SHA compliance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={() => {
              setExportOptions(prev => ({ ...prev, scope: 'CUSTOM_FILTER' }))
              setShowExportDialog(true)
            }}
            variant="outline"
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Export Data
          </Button>
          <Button onClick={loadInvoices}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <FilterSection />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="ready-for-review" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Ready for Review ({invoices.filter(i => ['generated', 'printed'].includes(i.status)).length})
          </TabsTrigger>
          <TabsTrigger value="submitted-archive" className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Submitted Archive ({invoices.filter(i => ['submitted', 'paid'].includes(i.status)).length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ready-for-review">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Invoices Ready for Review & Submission
              </CardTitle>
              <CardDescription>
                Generated invoices that can be reviewed, printed, and submitted to SHA
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin" />
                </div>
              ) : invoices.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead>OP #</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Compliance</TableHead>
                      <TableHead>Documents</TableHead>
                      <TableHead>Generated</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                        <TableCell>{invoice.patient_name}</TableCell>
                        <TableCell>{invoice.op_number}</TableCell>
                        <TableCell>KES {invoice.total_amount.toLocaleString()}</TableCell>
                        <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                        <TableCell>{getComplianceBadge(invoice.compliance_status)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {invoice.documents_attached} docs
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {new Date(invoice.generated_at).toLocaleDateString()}
                            <div className="text-xs text-muted-foreground">
                              by {invoice.generated_by_name}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedInvoice(invoice)
                                loadDocuments(invoice.claim_id)
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {invoice.status === 'generated' && (
                              <Button
                                size="sm"
                                onClick={() => submitClaim(invoice.claim_id)}
                              >
                                <Send className="h-4 w-4" />
                              </Button>
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button size="sm" variant="ghost">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                <DropdownMenuItem onClick={() => {/* Handle print */}}>
                                  <Printer className="h-4 w-4 mr-2" />
                                  Print Invoice
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                                  setSelectedInvoice(invoice)
                                  setExportOptions(prev => ({ ...prev, scope: 'SINGLE_INVOICE' }))
                                  setShowExportDialog(true)
                                }}>
                                  <FileDown className="h-4 w-4 mr-2" />
                                  Export PDF
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No invoices ready for review found
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="submitted-archive">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Submitted Invoice Archive
              </CardTitle>
              <CardDescription>
                Read-only archive of invoices submitted to SHA
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin" />
                </div>
              ) : invoices.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>SHA Reference</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                        <TableCell>{invoice.patient_name}</TableCell>
                        <TableCell>KES {invoice.total_amount.toLocaleString()}</TableCell>
                        <TableCell>
                          {invoice.sha_reference ? (
                            <Badge variant="default">{invoice.sha_reference}</Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {invoice.submitted_at ? (
                            <div className="text-sm">
                              {new Date(invoice.submitted_at).toLocaleDateString()}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedInvoice(invoice)
                                loadDocuments(invoice.claim_id)
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedInvoice(invoice)
                                setExportOptions(prev => ({ ...prev, scope: 'SINGLE_INVOICE' }))
                                setShowExportDialog(true)
                              }}
                            >
                              <FileDown className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No submitted invoices found
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <InvoiceDetailsDialog />
      <ExportDialog />
    </div>
  )
}
