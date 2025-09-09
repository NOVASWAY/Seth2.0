"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { Badge } from "../ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog"
import { useToast } from "../../hooks/use-toast"
import { 
  Package, 
  Plus, 
  Calendar, 
  Send, 
  Printer,
  TrendingUp,
  CheckCircle,
  Clock,
  AlertCircle,
  Eye,
  MoreHorizontal,
  Trash2
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

interface SHABatch {
  id: string
  batch_number: string
  batch_date: string
  batch_type: "weekly" | "monthly" | "custom"
  total_claims: number
  total_amount: number
  status: "draft" | "submitted" | "processing" | "completed" | "failed"
  created_by_username: string
  actual_claims_count: number
  invoice_generated: boolean
  printed_invoices: boolean
  created_at: string
}

interface BatchFilters {
  status?: string
  batchType?: string
  startDate?: string
  endDate?: string
}

interface BatchStats {
  total_batches: number
  draft_batches: number
  submitted_batches: number
  completed_batches: number
  weekly_batches: number
  monthly_batches: number
  custom_batches: number
  total_claims_in_batches: number
  total_amount_in_batches: number
  batches_with_invoices: number
  batches_with_printed_invoices: number
}

export function SHABatchManager() {
  const { toast } = useToast()
  const [batches, setBatches] = useState<SHABatch[]>([])
  const [stats, setStats] = useState<BatchStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [filters, setFilters] = useState<BatchFilters>({})
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  })

  // Create batch form state
  const [createForm, setCreateForm] = useState({
    batchType: "weekly" as "weekly" | "monthly" | "custom",
    batchDate: new Date().toISOString().split('T')[0],
    claimIds: [] as string[]
  })

  // Load batches
  const loadBatches = useCallback(async (page = 1) => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
        ...filters
      })

      const response = await fetch(`/api/sha-batches?${params}`)
      const result = await response.json()

      if (result.success) {
        setBatches(result.data.batches)
        setPagination(result.data.pagination)
      } else {
        throw new Error(result.message || "Failed to load batches")
      }
    } catch (error) {
      console.error("Error loading batches:", error)
      toast({
        title: "Error",
        description: "Failed to load SHA batches",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }, [filters, pagination.limit, toast])

  // Load batch statistics
  const loadStats = useCallback(async () => {
    try {
      const response = await fetch("/api/sha-batches/stats/summary")
      const result = await response.json()

      if (result.success) {
        setStats(result.data)
      }
    } catch (error) {
      console.error("Error loading stats:", error)
    }
  }, [])

  // Load data on mount and filter changes
  useEffect(() => {
    loadBatches(pagination.page)
    loadStats()
  }, [loadBatches, loadStats, pagination.page])

  // Create new batch
  const createBatch = async () => {
    try {
      const response = await fetch("/api/sha-batches", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(createForm)
      })
      const result = await response.json()

      if (result.success) {
        toast({
          title: "Success",
          description: `Batch created with ${result.data.claimsCount} claims`
        })
        setShowCreateDialog(false)
        setCreateForm({
          batchType: "weekly",
          batchDate: new Date().toISOString().split('T')[0],
          claimIds: []
        })
        loadBatches()
        loadStats()
      } else {
        throw new Error(result.message)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create batch",
        variant: "destructive"
      })
    }
  }

  // Submit batch to SHA
  const submitBatch = async (batchId: string) => {
    try {
      const response = await fetch(`/api/sha-batches/${batchId}/submit`, {
        method: "PATCH"
      })
      const result = await response.json()

      if (result.success) {
        toast({
          title: "Success",
          description: "Batch submitted to SHA successfully"
        })
        loadBatches()
        loadStats()
      } else {
        throw new Error(result.message)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit batch to SHA",
        variant: "destructive"
      })
    }
  }

  // Mark batch invoices as printed
  const markBatchAsPrinted = async (batchId: string) => {
    try {
      const response = await fetch(`/api/sha-batches/${batchId}/mark-printed`, {
        method: "PATCH"
      })
      const result = await response.json()

      if (result.success) {
        toast({
          title: "Success",
          description: result.message
        })
        loadBatches()
        loadStats()
      } else {
        throw new Error(result.message)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to mark batch as printed",
        variant: "destructive"
      })
    }
  }

  // Delete batch
  const deleteBatch = async (batchId: string) => {
    if (!confirm("Are you sure you want to delete this batch? This action cannot be undone.")) {
      return
    }

    try {
      const response = await fetch(`/api/sha-batches/${batchId}`, {
        method: "DELETE"
      })
      const result = await response.json()

      if (result.success) {
        toast({
          title: "Success",
          description: "Batch deleted successfully"
        })
        loadBatches()
        loadStats()
      } else {
        throw new Error(result.message)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete batch",
        variant: "destructive"
      })
    }
  }

  // Apply filters
  const applyFilters = (newFilters: BatchFilters) => {
    setFilters(newFilters)
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  // Get status badge
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { color: "secondary", icon: Clock },
      submitted: { color: "default", icon: Send },
      processing: { color: "default", icon: TrendingUp },
      completed: { color: "default", icon: CheckCircle },
      failed: { color: "destructive", icon: AlertCircle }
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft
    const Icon = config.icon

    return (
      <Badge variant={config.color as any} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {status.toUpperCase()}
      </Badge>
    )
  }

  // Get batch type badge
  const getBatchTypeBadge = (type: string) => {
    const typeConfig = {
      weekly: { color: "default", text: "Weekly" },
      monthly: { color: "secondary", text: "Monthly" },
      custom: { color: "outline", text: "Custom" }
    }

    const config = typeConfig[type as keyof typeof typeConfig] || typeConfig.custom

    return (
      <Badge variant={config.color as any}>
        {config.text}
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

  return (
    <div className="space-y-6 bg-white dark:bg-gray-900 min-h-screen p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">SHA Batch Management</h1>
          <p className="text-gray-600 dark:text-gray-300">
            Create and manage SHA insurance claim batches
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-700 dark:hover:bg-blue-600 dark:text-white font-medium">
              <Plus className="h-4 w-4" />
              Create Batch
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600">
            <DialogHeader>
              <DialogTitle className="text-gray-900 dark:text-white">Create New SHA Batch</DialogTitle>
              <DialogDescription className="text-gray-600 dark:text-gray-300">
                Create a new batch of SHA claims for submission
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">Batch Type</Label>
                <Select
                  value={createForm.batchType}
                  onValueChange={(value) => setCreateForm(prev => ({ 
                    ...prev, 
                    batchType: value as "weekly" | "monthly" | "custom" 
                  }))}
                >
                  <SelectTrigger className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly Batch</SelectItem>
                    <SelectItem value="monthly">Monthly Batch</SelectItem>
                    <SelectItem value="custom">Custom Batch</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Batch Date</Label>
                <Input
                  type="date"
                  value={createForm.batchDate}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, batchDate: e.target.value }))}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowCreateDialog(false)}
                >
                  Cancel
                </Button>
                <Button onClick={createBatch}>
                  Create Batch
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Package className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Batches</p>
                  <p className="text-2xl font-bold">{stats.total_batches}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-8 w-8 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Completed</p>
                  <p className="text-2xl font-bold">{stats.completed_batches}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-8 w-8 text-orange-600" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Claims</p>
                  <p className="text-2xl font-bold">{stats.total_claims_in_batches || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Printer className="h-8 w-8 text-purple-600" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Printed Batches</p>
                  <p className="text-2xl font-bold">{stats.batches_with_printed_invoices}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">Status</Label>
              <Select
                value={filters.status || ""}
                onValueChange={(value) => applyFilters({ ...filters, status: value || undefined })}
              >
                <SelectTrigger className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Batch Type</Label>
              <Select
                value={filters.batchType || ""}
                onValueChange={(value) => applyFilters({ ...filters, batchType: value || undefined })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
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
          </div>
        </CardContent>
      </Card>

      {/* Batches Table */}
      <Card>
        <CardHeader>
          <CardTitle>SHA Batches</CardTitle>
          <CardDescription>
            Manage SHA insurance claim batches
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Batch #</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Claims</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Invoices</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Created By</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    Loading batches...
                  </TableCell>
                </TableRow>
              ) : batches.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    No batches found
                  </TableCell>
                </TableRow>
              ) : (
                batches.map((batch) => (
                  <TableRow key={batch.id}>
                    <TableCell className="font-medium">
                      {batch.batch_number}
                    </TableCell>
                    <TableCell>{getBatchTypeBadge(batch.batch_type)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span>{batch.actual_claims_count}</span>
                        {batch.actual_claims_count !== batch.total_claims && (
                          <span className="text-sm text-muted-foreground">
                            (expected: {batch.total_claims})
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{formatCurrency(batch.total_amount)}</TableCell>
                    <TableCell>{getStatusBadge(batch.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {batch.invoice_generated && (
                          <Badge variant="default" className="text-xs">
                            Generated
                          </Badge>
                        )}
                        {batch.printed_invoices && (
                          <Badge variant="secondary" className="text-xs">
                            Printed
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(batch.batch_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{batch.created_by_username}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem 
                            onClick={() => window.open(`/api/sha-batches/${batch.id}`, '_blank')}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {batch.status === "draft" && (
                            <>
                              <DropdownMenuItem onClick={() => submitBatch(batch.id)}>
                                <Send className="h-4 w-4 mr-2" />
                                Submit to SHA
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => deleteBatch(batch.id)}>
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Batch
                              </DropdownMenuItem>
                            </>
                          )}
                          {batch.invoice_generated && !batch.printed_invoices && (
                            <DropdownMenuItem onClick={() => markBatchAsPrinted(batch.id)}>
                              <Printer className="h-4 w-4 mr-2" />
                              Mark as Printed
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
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to{" "}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
                {pagination.total} batches
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
        </CardContent>
      </Card>
    </div>
  )
}
