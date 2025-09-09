"use client"

import { useState, useEffect } from "react"
import { useAuthStore } from "../../lib/auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { Badge } from "../ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog"
import { ScrollArea } from "../ui/scroll-area"
import { Separator } from "../ui/separator"
import { 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Calendar,
  User,
  Activity,
  FileText,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  Info,
  XCircle
} from "lucide-react"
import { toast } from "../../hooks/use-toast"
import { format } from "date-fns"

interface AuditLog {
  id: string
  user_id: string
  username: string
  full_name: string
  action: string
  resource: string
  resource_id: string
  op_number: string
  details: any
  ip_address: string
  user_agent: string
  created_at: string
}

interface AuditLogFilters {
  userId: string
  action: string
  resource: string
  opNumber: string
  startDate: string
  endDate: string
}

interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export function AuditLogViewer() {
  const { accessToken } = useAuthStore()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  })
  const [filters, setFilters] = useState<AuditLogFilters>({
    userId: "",
    action: "",
    resource: "",
    opNumber: "",
    startDate: "",
    endDate: ""
  })
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)

  // Available filter options
  const actionOptions = [
    "CREATE", "READ", "UPDATE", "DELETE", "LOGIN", "LOGOUT", 
    "EXPORT", "IMPORT", "APPROVE", "REJECT", "ASSIGN", "UNASSIGN"
  ]
  
  const resourceOptions = [
    "PATIENT", "VISIT", "PRESCRIPTION", "LAB_TEST", "INVOICE", 
    "PAYMENT", "USER", "ROLE", "SETTINGS", "AUDIT_LOG"
  ]

  // Fetch audit logs
  const fetchAuditLogs = async (page = 1) => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== "")
        )
      })

      const response = await fetch(`http://localhost:5000/api/audit?${params}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        }
      })

      if (response.ok) {
        const result = await response.json()
        setLogs(result.data)
        setPagination(result.pagination)
      } else if (response.status === 401) {
        toast({
          title: "Authentication Error",
          description: "Your session has expired. Please log in again.",
          variant: "destructive"
        })
      } else {
        throw new Error("Failed to fetch audit logs")
      }
    } catch (error) {
      console.error("Error fetching audit logs:", error)
      toast({
        title: "Error",
        description: "Failed to fetch audit logs. Please try again.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  // Load logs on mount and when filters change
  useEffect(() => {
    if (accessToken) {
      fetchAuditLogs(1)
    }
  }, [accessToken, filters])

  // Handle filter changes
  const handleFilterChange = (key: keyof AuditLogFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      userId: "",
      action: "",
      resource: "",
      opNumber: "",
      startDate: "",
      endDate: ""
    })
  }

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    fetchAuditLogs(newPage)
  }

  // View log details
  const viewLogDetails = (log: AuditLog) => {
    setSelectedLog(log)
    setIsDetailDialogOpen(true)
  }

  // Get action badge variant
  const getActionBadgeVariant = (action: string) => {
    switch (action) {
      case "CREATE": return "default"
      case "UPDATE": return "secondary"
      case "DELETE": return "destructive"
      case "LOGIN": return "outline"
      case "LOGOUT": return "outline"
      case "APPROVE": return "default"
      case "REJECT": return "destructive"
      default: return "secondary"
    }
  }

  // Get action icon
  const getActionIcon = (action: string) => {
    switch (action) {
      case "CREATE": return <CheckCircle className="h-4 w-4" />
      case "UPDATE": return <Activity className="h-4 w-4" />
      case "DELETE": return <XCircle className="h-4 w-4" />
      case "LOGIN": return <User className="h-4 w-4" />
      case "LOGOUT": return <User className="h-4 w-4" />
      case "APPROVE": return <CheckCircle className="h-4 w-4" />
      case "REJECT": return <XCircle className="h-4 w-4" />
      default: return <Info className="h-4 w-4" />
    }
  }

  // Export logs (placeholder)
  const handleExport = () => {
    toast({
      title: "Export Feature",
      description: "Export functionality will be implemented soon.",
      variant: "default"
    })
  }

  if (!accessToken) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto p-6">
          <div className="text-center py-8">
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Authentication Required</h2>
            <p className="text-gray-600 dark:text-gray-300">Please log in to access audit logs.</p>
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
              <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
                <FileText className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Audit Log Viewer</h1>
                <p className="text-gray-600 dark:text-gray-300">Monitor system activities and user actions</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => fetchAuditLogs(pagination.page)}
                variant="outline"
                className="border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button
                onClick={handleExport}
                variant="outline"
                className="border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-300">
              Filter audit logs by various criteria
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* User ID */}
              <div className="space-y-2">
                <Label htmlFor="userId" className="text-gray-700 dark:text-gray-300">User ID</Label>
                <Input
                  id="userId"
                  placeholder="Enter user ID"
                  value={filters.userId}
                  onChange={(e) => handleFilterChange("userId", e.target.value)}
                  className="bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white"
                />
              </div>

              {/* Action */}
              <div className="space-y-2">
                <Label htmlFor="action" className="text-gray-700 dark:text-gray-300">Action</Label>
                <Select value={filters.action} onValueChange={(value) => handleFilterChange("action", value)}>
                  <SelectTrigger className="bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white">
                    <SelectValue placeholder="Select action" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600">
                    <SelectItem value="all" className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700">All Actions</SelectItem>
                    {actionOptions.map((action) => (
                      <SelectItem key={action} value={action} className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700">
                        {action}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Resource */}
              <div className="space-y-2">
                <Label htmlFor="resource" className="text-gray-700 dark:text-gray-300">Resource</Label>
                <Select value={filters.resource} onValueChange={(value) => handleFilterChange("resource", value)}>
                  <SelectTrigger className="bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white">
                    <SelectValue placeholder="Select resource" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600">
                    <SelectItem value="all" className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700">All Resources</SelectItem>
                    {resourceOptions.map((resource) => (
                      <SelectItem key={resource} value={resource} className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700">
                        {resource}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* OP Number */}
              <div className="space-y-2">
                <Label htmlFor="opNumber" className="text-gray-700 dark:text-gray-300">OP Number</Label>
                <Input
                  id="opNumber"
                  placeholder="Enter OP number"
                  value={filters.opNumber}
                  onChange={(e) => handleFilterChange("opNumber", e.target.value)}
                  className="bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white"
                />
              </div>

              {/* Start Date */}
              <div className="space-y-2">
                <Label htmlFor="startDate" className="text-gray-700 dark:text-gray-300">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => handleFilterChange("startDate", e.target.value)}
                  className="bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white"
                />
              </div>

              {/* End Date */}
              <div className="space-y-2">
                <Label htmlFor="endDate" className="text-gray-700 dark:text-gray-300">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => handleFilterChange("endDate", e.target.value)}
                  className="bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={clearFilters}
                variant="outline"
                className="border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300"
              >
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Audit Logs Table */}
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-white">Audit Logs</CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-300">
              Showing {logs.length} of {pagination.total} logs
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-gray-500" />
                <span className="ml-2 text-gray-500">Loading audit logs...</span>
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No audit logs found</h3>
                <p className="text-gray-500">Try adjusting your filters or check back later.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <ScrollArea className="h-[600px]">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-gray-200 dark:border-gray-700">
                        <TableHead className="text-gray-700 dark:text-gray-300">Timestamp</TableHead>
                        <TableHead className="text-gray-700 dark:text-gray-300">User</TableHead>
                        <TableHead className="text-gray-700 dark:text-gray-300">Action</TableHead>
                        <TableHead className="text-gray-700 dark:text-gray-300">Resource</TableHead>
                        <TableHead className="text-gray-700 dark:text-gray-300">OP Number</TableHead>
                        <TableHead className="text-gray-700 dark:text-gray-300">IP Address</TableHead>
                        <TableHead className="text-gray-700 dark:text-gray-300">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.map((log) => (
                        <TableRow key={log.id} className="border-gray-200 dark:border-gray-700">
                          <TableCell className="text-gray-900 dark:text-white">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-gray-500" />
                              {format(new Date(log.created_at), "MMM dd, yyyy HH:mm:ss")}
                            </div>
                          </TableCell>
                          <TableCell className="text-gray-900 dark:text-white">
                            <div>
                              <div className="font-medium">{log.full_name || log.username}</div>
                              <div className="text-sm text-gray-500">{log.username}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getActionBadgeVariant(log.action)} className="flex items-center gap-1 w-fit">
                              {getActionIcon(log.action)}
                              {log.action}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-gray-900 dark:text-white">{log.resource}</TableCell>
                          <TableCell className="text-gray-900 dark:text-white">{log.op_number || "-"}</TableCell>
                          <TableCell className="text-gray-900 dark:text-white">{log.ip_address}</TableCell>
                          <TableCell>
                            <Button
                              onClick={() => viewLogDetails(log)}
                              variant="outline"
                              size="sm"
                              className="border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300"
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>

                {/* Pagination */}
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-500">
                    Page {pagination.page} of {pagination.totalPages} ({pagination.total} total logs)
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={!pagination.hasPrev}
                      variant="outline"
                      size="sm"
                      className="border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300"
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <Button
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={!pagination.hasNext}
                      variant="outline"
                      size="sm"
                      className="border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300"
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Log Details Dialog */}
        <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
          <DialogContent className="max-w-4xl bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <DialogHeader>
              <DialogTitle className="text-gray-900 dark:text-white">Audit Log Details</DialogTitle>
              <DialogDescription className="text-gray-600 dark:text-gray-300">
                Detailed information about this audit log entry
              </DialogDescription>
            </DialogHeader>
            {selectedLog && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-700 dark:text-gray-300">Timestamp</Label>
                    <p className="text-gray-900 dark:text-white">{format(new Date(selectedLog.created_at), "PPP 'at' p")}</p>
                  </div>
                  <div>
                    <Label className="text-gray-700 dark:text-gray-300">User</Label>
                    <p className="text-gray-900 dark:text-white">{selectedLog.full_name || selectedLog.username}</p>
                  </div>
                  <div>
                    <Label className="text-gray-700 dark:text-gray-300">Action</Label>
                    <Badge variant={getActionBadgeVariant(selectedLog.action)} className="flex items-center gap-1 w-fit">
                      {getActionIcon(selectedLog.action)}
                      {selectedLog.action}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-gray-700 dark:text-gray-300">Resource</Label>
                    <p className="text-gray-900 dark:text-white">{selectedLog.resource}</p>
                  </div>
                  <div>
                    <Label className="text-gray-700 dark:text-gray-300">Resource ID</Label>
                    <p className="text-gray-900 dark:text-white">{selectedLog.resource_id}</p>
                  </div>
                  <div>
                    <Label className="text-gray-700 dark:text-gray-300">OP Number</Label>
                    <p className="text-gray-900 dark:text-white">{selectedLog.op_number || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-gray-700 dark:text-gray-300">IP Address</Label>
                    <p className="text-gray-900 dark:text-white">{selectedLog.ip_address}</p>
                  </div>
                  <div>
                    <Label className="text-gray-700 dark:text-gray-300">User Agent</Label>
                    <p className="text-gray-900 dark:text-white text-sm break-all">{selectedLog.user_agent}</p>
                  </div>
                </div>
                
                <Separator className="bg-gray-200 dark:bg-gray-700" />
                
                <div>
                  <Label className="text-gray-700 dark:text-gray-300">Details</Label>
                  <ScrollArea className="h-32 w-full border border-gray-200 dark:border-gray-600 rounded-md p-3 bg-gray-50 dark:bg-gray-700">
                    <pre className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">
                      {JSON.stringify(selectedLog.details, null, 2)}
                    </pre>
                  </ScrollArea>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
