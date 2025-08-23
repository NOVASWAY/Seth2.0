"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { Badge } from "../ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { useToast } from "../../hooks/use-toast"
import { 
  FileText, 
  Printer, 
  Send, 
  Calendar, 
  Search, 
  Filter,
  Download,
  CheckCircle,
  AlertCircle,
  Clock,
  DollarSign,
  Eye,
  MoreHorizontal
} from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu"

interface SHAInvoice {
  id: string
  invoice_number: string
  claim_number: string
  op_number: string
  first_name: string
  last_name: string
  insurance_number: string
  invoice_date: string
  due_date: string
  total_amount: number
  status: "draft" | "generated" | "printed" | "submitted" | "paid"
  compliance_status: "pending" | "verified" | "approved" | "rejected"
  generated_at?: string
  printed_at?: string
  submitted_at?: string
  generated_by_username: string
}

interface InvoiceFilters {
  status?: string
  startDate?: string
  endDate?: string
  search?: string
}

export function SHAInvoiceManager() {
  const { toast } = useToast()
  const [invoices, setInvoices] = useState<SHAInvoice[]>([])
  const [loading, setLoading] = useState(false)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  })
  const [filters, setFilters] = useState<InvoiceFilters>({})
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState("all")

  // Load invoices
  const loadInvoices = useCallback(async (page = 1) => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
        ...filters
      })

      const response = await fetch(`/api/sha-invoices?${params}`)
      const result = await response.json()

      if (result.success) {
        setInvoices(result.data.invoices)
        setPagination(result.data.pagination)
      } else {
        throw new Error(result.message || "Failed to load invoices")
      }
    } catch (error) {
      console.error("Error loading invoices:", error)
      toast({
        title: "Error",
        description: "Failed to load SHA invoices",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }, [filters, pagination.limit, toast])

  // Apply filters
  const applyFilters = (newFilters: InvoiceFilters) => {
    setFilters(newFilters)
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  // Clear filters
  const clearFilters = () => {
    setFilters({})
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  // Load invoices when filters change
  useEffect(() => {
    loadInvoices(pagination.page)
  }, [loadInvoices, pagination.page])

  // Mark invoice as printed
  const markAsPrinted = async (invoiceId: string) => {
    try {
      const response = await fetch(`/api/sha-invoices/${invoiceId}/print`, {
        method: "PATCH"
      })
      const result = await response.json()

      if (result.success) {
        toast({
          title: "Success",
          description: "Invoice marked as printed"
        })
        loadInvoices(pagination.page)
      } else {
        throw new Error(result.message)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to mark invoice as printed",
        variant: "destructive"
      })
    }
  }

  // Submit invoice to SHA
  const submitToSHA = async (invoiceId: string) => {
    try {
      const response = await fetch(`/api/sha-invoices/${invoiceId}/submit`, {
        method: "PATCH"
      })
      const result = await response.json()

      if (result.success) {
        toast({
          title: "Success", 
          description: "Invoice submitted to SHA successfully"
        })
        loadInvoices(pagination.page)
      } else {
        throw new Error(result.message)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit invoice to SHA",
        variant: "destructive"
      })
    }
  }

  // Bulk print invoices
  const bulkPrint = async () => {
    if (selectedInvoices.length === 0) {
      toast({
        title: "Warning",
        description: "Please select invoices to print",
        variant: "destructive"
      })
      return
    }

    try {
      const response = await fetch("/api/sha-invoices/bulk/print", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          invoiceIds: selectedInvoices
        })
      })
      const result = await response.json()

      if (result.success) {
        toast({
          title: "Success",
          description: `Marked ${result.data.successful} invoices as printed`
        })
        setSelectedInvoices([])
        loadInvoices(pagination.page)
      } else {
        throw new Error(result.message)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to bulk print invoices",
        variant: "destructive"
      })
    }
  }

  // Get status badge
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { color: "secondary", icon: Clock },
      generated: { color: "default", icon: FileText },
      printed: { color: "secondary", icon: Printer },
      submitted: { color: "default", icon: Send },
      paid: { color: "default", icon: CheckCircle }
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft
    const Icon = config.icon

    return (
      <Badge variant={config.color as any} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {status.replace("_", " ").toUpperCase()}
      </Badge>
    )
  }

  // Get compliance badge
  const getComplianceBadge = (status: string) => {
    const complianceConfig = {
      pending: { color: "secondary", icon: Clock },
      verified: { color: "default", icon: CheckCircle },
      approved: { color: "default", icon: CheckCircle },
      rejected: { color: "destructive", icon: AlertCircle }
    }

    const config = complianceConfig[status as keyof typeof complianceConfig] || complianceConfig.pending
    const Icon = config.icon

    return (
      <Badge variant={config.color as any} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {status.toUpperCase()}
      </Badge>
    )
  }

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES'
    }).format(amount)
  }

  // Get invoices ready for printing
  const getInvoicesReadyForPrinting = async (batchType: "weekly" | "monthly") => {
    try {
      const response = await fetch(`/api/sha-invoices/ready-for-printing/${batchType}`)
      const result = await response.json()

      if (result.success) {
        toast({
          title: "Info",
          description: `Found ${result.data.length} invoices ready for ${batchType} printing`
        })
        
        // Update filters to show these invoices
        applyFilters({ status: "generated" })
      } else {
        throw new Error(result.message)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to get ${batchType} invoices`,
        variant: "destructive"
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">SHA Invoice Management</h1>
          <p className="text-muted-foreground">
            Manage SHA insurance invoices, printing, and submission
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => getInvoicesReadyForPrinting("weekly")}
            className="flex items-center gap-2"
          >
            <Calendar className="h-4 w-4" />
            Weekly Batch
          </Button>
          <Button
            variant="outline"
            onClick={() => getInvoicesReadyForPrinting("monthly")}
            className="flex items-center gap-2"
          >
            <Calendar className="h-4 w-4" />
            Monthly Batch
          </Button>
          {selectedInvoices.length > 0 && (
            <Button
              onClick={bulkPrint}
              className="flex items-center gap-2"
            >
              <Printer className="h-4 w-4" />
              Print Selected ({selectedInvoices.length})
            </Button>
          )}
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Invoices</p>
                <p className="text-2xl font-bold">{pagination.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Printer className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Ready to Print</p>
                <p className="text-2xl font-bold">
                  {invoices.filter(inv => inv.status === "generated").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Send className="h-8 w-8 text-orange-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Submitted</p>
                <p className="text-2xl font-bold">
                  {invoices.filter(inv => inv.status === "submitted").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Value</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(invoices.reduce((sum, inv) => sum + inv.total_amount, 0))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={filters.status || ""}
                onValueChange={(value) => applyFilters({ ...filters, status: value || undefined })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All statuses</SelectItem>
                  <SelectItem value="generated">Generated</SelectItem>
                  <SelectItem value="printed">Printed</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={filters.startDate || ""}
                onChange={(e) => applyFilters({ ...filters, startDate: e.target.value || undefined })}
              />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input
                type="date"
                value={filters.endDate || ""}
                onChange={(e) => applyFilters({ ...filters, endDate: e.target.value || undefined })}
              />
            </div>
            <div className="space-y-2">
              <Label>Search</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Invoice #, Patient name, OP #"
                    className="pl-10"
                    value={filters.search || ""}
                    onChange={(e) => applyFilters({ ...filters, search: e.target.value || undefined })}
                  />
                </div>
                <Button variant="outline" onClick={clearFilters}>
                  Clear
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invoices Table */}
      <Card>
        <CardHeader>
          <CardTitle>SHA Invoices</CardTitle>
          <CardDescription>
            Manage and track SHA insurance invoices
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <input
                      type="checkbox"
                      checked={selectedInvoices.length === invoices.length && invoices.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedInvoices(invoices.map(inv => inv.id))
                        } else {
                          setSelectedInvoices([])
                        }
                      }}
                    />
                  </TableHead>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>OP #</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Compliance</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      Loading invoices...
                    </TableCell>
                  </TableRow>
                ) : invoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      No invoices found
                    </TableCell>
                  </TableRow>
                ) : (
                  invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedInvoices.includes(invoice.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedInvoices([...selectedInvoices, invoice.id])
                            } else {
                              setSelectedInvoices(selectedInvoices.filter(id => id !== invoice.id))
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {invoice.invoice_number}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{invoice.first_name} {invoice.last_name}</p>
                          <p className="text-sm text-muted-foreground">{invoice.insurance_number}</p>
                        </div>
                      </TableCell>
                      <TableCell>{invoice.op_number}</TableCell>
                      <TableCell>{formatCurrency(invoice.total_amount)}</TableCell>
                      <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                      <TableCell>{getComplianceBadge(invoice.compliance_status)}</TableCell>
                      <TableCell>
                        {new Date(invoice.invoice_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem 
                              onClick={() => window.open(`/api/sha-invoices/${invoice.id}`, '_blank')}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => window.print()}
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Download PDF
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {invoice.status === "generated" && (
                              <DropdownMenuItem onClick={() => markAsPrinted(invoice.id)}>
                                <Printer className="h-4 w-4 mr-2" />
                                Mark as Printed
                              </DropdownMenuItem>
                            )}
                            {invoice.status === "printed" && (
                              <DropdownMenuItem onClick={() => submitToSHA(invoice.id)}>
                                <Send className="h-4 w-4 mr-2" />
                                Submit to SHA
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to{" "}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
                  {pagination.total} invoices
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                    disabled={pagination.page === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                    disabled={pagination.page === pagination.totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
