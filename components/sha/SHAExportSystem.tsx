"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuthStore } from "../../lib/auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { Textarea } from "../ui/textarea"
import { Badge } from "../ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog"
import { ScrollArea } from "../ui/scroll-area"
import { Separator } from "../ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs"
import { Progress } from "../ui/progress"
import { 
  Download, 
  FileText, 
  FileSpreadsheet, 
  File,
  Calendar,
  User,
  CheckCircle,
  Clock,
  AlertTriangle,
  Search,
  Filter,
  RefreshCw,
  Eye,
  Trash2,
  BarChart3,
  TrendingUp
} from "lucide-react"
import { toast } from "../../hooks/use-toast"
import { format } from "date-fns"

interface ExportHistory {
  id: string
  exportType: string
  scope: string
  filename: string
  fileSize: number
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED"
  reason: string
  requestedBy: string
  requestedAt: string
  completedAt?: string
  downloadUrl?: string
  errorMessage?: string
}

interface ExportStatistics {
  totalExports: number
  exportsThisMonth: number
  exportsThisWeek: number
  totalFileSize: number
  averageFileSize: number
  mostRequestedType: string
  successRate: number
}

interface ExportFormData {
  exportType: "PDF" | "EXCEL" | "CSV"
  scope: "SINGLE_INVOICE" | "BATCH_INVOICES" | "CLAIMS" | "BATCH_REPORT"
  reason: string
  complianceApproved: boolean
  approvedBy?: string
  filters?: {
    startDate?: string
    endDate?: string
    status?: string
    batchId?: string
    invoiceId?: string
  }
}

export function SHAExportSystem() {
  const { accessToken, user } = useAuthStore()
  const [exportHistory, setExportHistory] = useState<ExportHistory[]>([])
  const [statistics, setStatistics] = useState<ExportStatistics | null>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false)
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false)
  const [isStatsDialogOpen, setIsStatsDialogOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")

  // Export form state
  const [exportForm, setExportForm] = useState<ExportFormData>({
    exportType: "PDF",
    scope: "SINGLE_INVOICE",
    reason: "",
    complianceApproved: false,
    filters: {}
  })

  // Fetch export history
  const fetchExportHistory = useCallback(async () => {
    if (!accessToken) return

    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (statusFilter !== "all") params.append("status", statusFilter)
      if (typeFilter !== "all") params.append("type", typeFilter)

      const response = await fetch(`http://localhost:5000/api/sha-exports/history?${params}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        }
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setExportHistory(result.data || [])
        } else {
          throw new Error(result.message || "Failed to fetch export history")
        }
      } else if (response.status === 401) {
        toast({
          title: "Authentication Error",
          description: "Your session has expired. Please log in again.",
          variant: "destructive"
        })
      } else {
        throw new Error("Failed to fetch export history")
      }
    } catch (error) {
      console.error("Error fetching export history:", error)
      toast({
        title: "Error",
        description: "Failed to fetch export history. Please try again.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }, [accessToken, statusFilter, typeFilter])

  // Fetch export statistics
  const fetchStatistics = useCallback(async () => {
    if (!accessToken) return

    try {
      const response = await fetch("http://localhost:5000/api/sha-exports/statistics", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        }
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setStatistics(result.data)
        }
      }
    } catch (error) {
      console.error("Error fetching statistics:", error)
    }
  }, [accessToken])

  // Handle export
  const handleExport = async () => {
    if (!accessToken || !exportForm.reason) {
      toast({
        title: "Error",
        description: "Please provide a reason for the export",
        variant: "destructive"
      })
      return
    }

    try {
      setExporting(true)
      setExportProgress(0)

      // Simulate progress
      const progressInterval = setInterval(() => {
        setExportProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return prev
          }
          return prev + 10
        })
      }, 200)

      let endpoint = ""
      let body: any = {
        reason: exportForm.reason,
        complianceApproved: exportForm.complianceApproved,
        ...exportForm.filters
      }

      switch (exportForm.scope) {
        case "SINGLE_INVOICE":
          endpoint = `/invoice/${exportForm.filters?.invoiceId}/pdf`
          break
        case "BATCH_INVOICES":
          endpoint = "/invoices/excel"
          break
        case "CLAIMS":
          endpoint = "/claims/csv"
          break
        case "BATCH_REPORT":
          endpoint = `/batch/${exportForm.filters?.batchId}/report`
          break
      }

      const response = await fetch(`http://localhost:5000/api/sha-exports${endpoint}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      })

      clearInterval(progressInterval)
      setExportProgress(100)

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          toast({
            title: "Success",
            description: "Export completed successfully",
            variant: "default"
          })
          
          // Reset form
          setExportForm({
            exportType: "PDF",
            scope: "SINGLE_INVOICE",
            reason: "",
            complianceApproved: false,
            filters: {}
          })
          setIsExportDialogOpen(false)
          
          // Refresh history
          fetchExportHistory()
        } else {
          throw new Error(result.message || "Failed to create export")
        }
      } else if (response.status === 401) {
        toast({
          title: "Authentication Error",
          description: "Your session has expired. Please log in again.",
          variant: "destructive"
        })
      } else {
        throw new Error("Failed to create export")
      }
    } catch (error) {
      console.error("Error creating export:", error)
      toast({
        title: "Error",
        description: "Failed to create export. Please try again.",
        variant: "destructive"
      })
    } finally {
      setExporting(false)
      setExportProgress(0)
    }
  }

  // Download export
  const handleDownload = async (exportId: string) => {
    if (!accessToken) return

    try {
      const response = await fetch(`http://localhost:5000/api/sha-exports/download/${exportId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `export-${exportId}.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        throw new Error("Failed to download export")
      }
    } catch (error) {
      console.error("Error downloading export:", error)
      toast({
        title: "Error",
        description: "Failed to download export. Please try again.",
        variant: "destructive"
      })
    }
  }

  // Delete export
  const handleDelete = async (exportId: string) => {
    if (!accessToken) return

    try {
      const response = await fetch(`http://localhost:5000/api/sha-exports/${exportId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        }
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          toast({
            title: "Success",
            description: "Export deleted successfully",
            variant: "default"
          })
          
          // Refresh history
          fetchExportHistory()
        } else {
          throw new Error(result.message || "Failed to delete export")
        }
      } else {
        throw new Error("Failed to delete export")
      }
    } catch (error) {
      console.error("Error deleting export:", error)
      toast({
        title: "Error",
        description: "Failed to delete export. Please try again.",
        variant: "destructive"
      })
    }
  }

  // Get status badge variant
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "COMPLETED": return "default"
      case "PROCESSING": return "secondary"
      case "PENDING": return "outline"
      case "FAILED": return "destructive"
      default: return "secondary"
    }
  }

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "COMPLETED": return <CheckCircle className="h-4 w-4" />
      case "PROCESSING": return <RefreshCw className="h-4 w-4 animate-spin" />
      case "PENDING": return <Clock className="h-4 w-4" />
      case "FAILED": return <AlertTriangle className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  // Get export type icon
  const getExportTypeIcon = (type: string) => {
    switch (type) {
      case "PDF": return <FileText className="h-4 w-4" />
      case "EXCEL": return <FileSpreadsheet className="h-4 w-4" />
      case "CSV": return <File className="h-4 w-4" />
      default: return <File className="h-4 w-4" />
    }
  }

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  // Filter exports
  const filteredExports = exportHistory.filter(exp => {
    const matchesSearch = exp.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         exp.exportType.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         exp.reason.toLowerCase().includes(searchQuery.toLowerCase())
    
    return matchesSearch
  })

  // Load data on mount
  useEffect(() => {
    fetchExportHistory()
    fetchStatistics()
  }, [fetchExportHistory, fetchStatistics])

  if (!accessToken) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto p-6">
          <div className="text-center py-8">
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Authentication Required</h2>
            <p className="text-gray-600 dark:text-gray-300">Please log in to access export system.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl">
                <Download className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">SHA Export System</h1>
                <p className="text-gray-600 dark:text-gray-300">Export SHA data in various formats</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={fetchExportHistory}
                variant="outline"
                className="border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button
                onClick={() => setIsStatsDialogOpen(true)}
                variant="outline"
                className="border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Statistics
              </Button>
              <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white">
                    <Download className="h-4 w-4 mr-2" />
                    New Export
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                  <DialogHeader>
                    <DialogTitle className="text-gray-900 dark:text-white">Create Export</DialogTitle>
                    <DialogDescription className="text-gray-600 dark:text-gray-300">
                      Export SHA data in your preferred format
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    {/* Export Type */}
                    <div className="space-y-2">
                      <Label htmlFor="exportType" className="text-gray-700 dark:text-gray-300">Export Type</Label>
                      <Select value={exportForm.exportType} onValueChange={(value: any) => setExportForm(prev => ({ ...prev, exportType: value }))}>
                        <SelectTrigger className="bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white">
                          <SelectValue placeholder="Select export type" />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600">
                          <SelectItem value="PDF" className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700">PDF</SelectItem>
                          <SelectItem value="EXCEL" className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700">Excel</SelectItem>
                          <SelectItem value="CSV" className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700">CSV</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Scope */}
                    <div className="space-y-2">
                      <Label htmlFor="scope" className="text-gray-700 dark:text-gray-300">Scope</Label>
                      <Select value={exportForm.scope} onValueChange={(value: any) => setExportForm(prev => ({ ...prev, scope: value }))}>
                        <SelectTrigger className="bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white">
                          <SelectValue placeholder="Select scope" />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600">
                          <SelectItem value="SINGLE_INVOICE" className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700">Single Invoice</SelectItem>
                          <SelectItem value="BATCH_INVOICES" className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700">Batch Invoices</SelectItem>
                          <SelectItem value="CLAIMS" className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700">Claims</SelectItem>
                          <SelectItem value="BATCH_REPORT" className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700">Batch Report</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Filters based on scope */}
                    {exportForm.scope === "SINGLE_INVOICE" && (
                      <div className="space-y-2">
                        <Label htmlFor="invoiceId" className="text-gray-700 dark:text-gray-300">Invoice ID</Label>
                        <Input
                          id="invoiceId"
                          value={exportForm.filters?.invoiceId || ""}
                          onChange={(e) => setExportForm(prev => ({ 
                            ...prev, 
                            filters: { ...prev.filters, invoiceId: e.target.value }
                          }))}
                          placeholder="Enter invoice ID"
                          className="bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white"
                        />
                      </div>
                    )}

                    {exportForm.scope === "BATCH_REPORT" && (
                      <div className="space-y-2">
                        <Label htmlFor="batchId" className="text-gray-700 dark:text-gray-300">Batch ID</Label>
                        <Input
                          id="batchId"
                          value={exportForm.filters?.batchId || ""}
                          onChange={(e) => setExportForm(prev => ({ 
                            ...prev, 
                            filters: { ...prev.filters, batchId: e.target.value }
                          }))}
                          placeholder="Enter batch ID"
                          className="bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white"
                        />
                      </div>
                    )}

                    {/* Date Range */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="startDate" className="text-gray-700 dark:text-gray-300">Start Date</Label>
                        <Input
                          id="startDate"
                          type="date"
                          value={exportForm.filters?.startDate || ""}
                          onChange={(e) => setExportForm(prev => ({ 
                            ...prev, 
                            filters: { ...prev.filters, startDate: e.target.value }
                          }))}
                          className="bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="endDate" className="text-gray-700 dark:text-gray-300">End Date</Label>
                        <Input
                          id="endDate"
                          type="date"
                          value={exportForm.filters?.endDate || ""}
                          onChange={(e) => setExportForm(prev => ({ 
                            ...prev, 
                            filters: { ...prev.filters, endDate: e.target.value }
                          }))}
                          className="bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white"
                        />
                      </div>
                    </div>

                    {/* Reason */}
                    <div className="space-y-2">
                      <Label htmlFor="reason" className="text-gray-700 dark:text-gray-300">Reason for Export</Label>
                      <Textarea
                        id="reason"
                        value={exportForm.reason}
                        onChange={(e) => setExportForm(prev => ({ ...prev, reason: e.target.value }))}
                        placeholder="Enter reason for export..."
                        className="bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white"
                        rows={3}
                        required
                      />
                    </div>

                    {/* Compliance Approval */}
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="complianceApproved"
                        checked={exportForm.complianceApproved}
                        onChange={(e) => setExportForm(prev => ({ ...prev, complianceApproved: e.target.checked }))}
                        className="rounded border-gray-300 dark:border-gray-600"
                      />
                      <Label htmlFor="complianceApproved" className="text-gray-700 dark:text-gray-300">Compliance Approved</Label>
                    </div>

                    {/* Export Progress */}
                    {exporting && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-300">Exporting...</span>
                          <span className="text-gray-600 dark:text-gray-300">{exportProgress}%</span>
                        </div>
                        <Progress value={exportProgress} className="w-full" />
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex justify-end gap-2">
                      <Button
                        onClick={() => setIsExportDialogOpen(false)}
                        variant="outline"
                        className="border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleExport}
                        disabled={!exportForm.reason || exporting}
                        className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white"
                      >
                        {exporting ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Exporting...
                          </>
                        ) : (
                          <>
                            <Download className="h-4 w-4 mr-2" />
                            Export
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        {statistics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="text-sm text-gray-500">Total Exports</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{statistics.totalExports}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-sm text-gray-500">This Month</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{statistics.exportsThisMonth}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-purple-500" />
                  <div>
                    <p className="text-sm text-gray-500">Success Rate</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{statistics.successRate}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Download className="h-5 w-5 text-orange-500" />
                  <div>
                    <p className="text-sm text-gray-500">Total Size</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatFileSize(statistics.totalFileSize)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Export History */}
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-gray-900 dark:text-white">Export History</CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-300">
                  View and manage your export history
                </CardDescription>
              </div>
              <Button
                onClick={() => setIsHistoryDialogOpen(true)}
                variant="outline"
                className="border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300"
              >
                <Eye className="h-4 w-4 mr-2" />
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex gap-4 mb-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search exports..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48 bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600">
                  <SelectItem value="all" className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700">All Statuses</SelectItem>
                  <SelectItem value="COMPLETED" className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700">Completed</SelectItem>
                  <SelectItem value="PROCESSING" className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700">Processing</SelectItem>
                  <SelectItem value="PENDING" className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700">Pending</SelectItem>
                  <SelectItem value="FAILED" className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Recent Exports Table */}
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-gray-500" />
                <span className="ml-2 text-gray-500">Loading exports...</span>
              </div>
            ) : filteredExports.length === 0 ? (
              <div className="text-center py-8">
                <Download className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No exports found</h3>
                <p className="text-gray-500">Create your first export to get started.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-gray-200 dark:border-gray-700">
                        <TableHead className="text-gray-700 dark:text-gray-300">File</TableHead>
                        <TableHead className="text-gray-700 dark:text-gray-300">Type</TableHead>
                        <TableHead className="text-gray-700 dark:text-gray-300">Status</TableHead>
                        <TableHead className="text-gray-700 dark:text-gray-300">Size</TableHead>
                        <TableHead className="text-gray-700 dark:text-gray-300">Requested</TableHead>
                        <TableHead className="text-gray-700 dark:text-gray-300">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredExports.slice(0, 10).map((exp) => (
                        <TableRow key={exp.id} className="border-gray-200 dark:border-gray-700">
                          <TableCell className="text-gray-900 dark:text-white">
                            <div className="flex items-center gap-2">
                              {getExportTypeIcon(exp.exportType)}
                              <div>
                                <div className="font-medium">{exp.filename}</div>
                                <div className="text-sm text-gray-500">{exp.reason}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-gray-900 dark:text-white">{exp.exportType}</TableCell>
                          <TableCell>
                            <Badge variant={getStatusBadgeVariant(exp.status)} className="flex items-center gap-1 w-fit">
                              {getStatusIcon(exp.status)}
                              {exp.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-gray-900 dark:text-white">{formatFileSize(exp.fileSize)}</TableCell>
                          <TableCell className="text-gray-900 dark:text-white">
                            {format(new Date(exp.requestedAt), "MMM dd, yyyy HH:mm")}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              {exp.status === "COMPLETED" && exp.downloadUrl && (
                                <Button
                                  onClick={() => handleDownload(exp.id)}
                                  variant="outline"
                                  size="sm"
                                  className="border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300"
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                              )}
                              {user?.role === "ADMIN" && (
                                <Button
                                  onClick={() => handleDelete(exp.id)}
                                  variant="outline"
                                  size="sm"
                                  className="border-red-200 dark:border-red-600 text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Statistics Dialog */}
        <Dialog open={isStatsDialogOpen} onOpenChange={setIsStatsDialogOpen}>
          <DialogContent className="max-w-4xl bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <DialogHeader>
              <DialogTitle className="text-gray-900 dark:text-white">Export Statistics</DialogTitle>
              <DialogDescription className="text-gray-600 dark:text-gray-300">
                Detailed statistics about export usage
              </DialogDescription>
            </DialogHeader>
            {statistics && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-700 dark:text-gray-300">Total Exports</Label>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{statistics.totalExports}</p>
                  </div>
                  <div>
                    <Label className="text-gray-700 dark:text-gray-300">Exports This Month</Label>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{statistics.exportsThisMonth}</p>
                  </div>
                  <div>
                    <Label className="text-gray-700 dark:text-gray-300">Exports This Week</Label>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{statistics.exportsThisWeek}</p>
                  </div>
                  <div>
                    <Label className="text-gray-700 dark:text-gray-300">Success Rate</Label>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{statistics.successRate}%</p>
                  </div>
                  <div>
                    <Label className="text-gray-700 dark:text-gray-300">Total File Size</Label>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatFileSize(statistics.totalFileSize)}</p>
                  </div>
                  <div>
                    <Label className="text-gray-700 dark:text-gray-300">Average File Size</Label>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatFileSize(statistics.averageFileSize)}</p>
                  </div>
                </div>
                
                <Separator className="bg-gray-200 dark:bg-gray-700" />
                
                <div>
                  <Label className="text-gray-700 dark:text-gray-300">Most Requested Type</Label>
                  <p className="text-lg font-medium text-gray-900 dark:text-white">{statistics.mostRequestedType}</p>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
